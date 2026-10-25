import test from 'node:test';
import assert from 'node:assert/strict';
import { importModel, normalizeJsonUrl, validateModel } from './storage.ts';
import type { CatalogModel } from '../domain/catalogModel.ts';

const validModel = (): CatalogModel & { schemaVersion: number } => ({
  schemaVersion: 3,
  domains: [{ id: 'domain-1', code: 'D1', name: 'Domain' }],
  capabilities: [{ id: 'cap-1', domainId: 'domain-1', code: 'C1', name: 'Capability' }],
  applications: [{ id: 'app-1', name: 'Application', capabilityIds: ['cap-1'] }],
});

test('validates a supported model and normalizes missing layout defaults', () => {
  const model = validModel();
  const validated = validateModel(model);

  assert.equal(validated.schemaVersion, 3);
  assert.equal(validated.domains[0].layout.columnId, 'customer');
  assert.equal(validated.domains[0].layout.layerId, 'strategic');
  assert.equal(validated.layout.mode, 'matrix');
});

test('rejects unsupported schemas and broken capability references', () => {
  assert.throws(() => validateModel({ ...validModel(), schemaVersion: 1 }), /Format de cartographie invalide/);

  const invalidCapability = validModel();
  invalidCapability.capabilities[0].domainId = 'missing-domain';
  assert.throws(() => validateModel(invalidCapability), /capacité référence un domaine inexistant/i);
});

test('rejects broken application relations in capability-based maps', () => {
  const model = validModel();
  model.applications[0].capabilityIds = ['missing-capability'];
  assert.throws(() => validateModel(model), /application référence une capacité inexistante/i);
});

test('validates direct domain relations for one-level maps', () => {
  const model = validModel();
  model.layout = { depth: 1 };
  model.applications[0].capabilityIds = ['domain-1'];

  assert.doesNotThrow(() => validateModel(model));
  model.applications[0].capabilityIds = ['cap-1'];
  assert.throws(() => validateModel(model), /application référence une capacité inexistante/i);
});

test('imports JSON through the same validator and rejects malformed JSON', async () => {
  const model = validModel();
  assert.deepEqual(await importModel({ text: async () => JSON.stringify(model) }), validateModel(model));
  await assert.rejects(importModel({ text: async () => '{not-json' }), SyntaxError);
});

test('normalizes GitHub blob links to raw content URLs', () => {
  assert.equal(
    normalizeJsonUrl(' https://github.com/Sims07/enterprise-capacity-mapper/blob/main/data/model.json '),
    'https://raw.githubusercontent.com/Sims07/enterprise-capacity-mapper/main/data/model.json',
  );
  assert.equal(normalizeJsonUrl(''), '');
  assert.equal(normalizeJsonUrl('https://example.com/model.json'), 'https://example.com/model.json');
});
