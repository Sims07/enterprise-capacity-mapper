import test from 'node:test';
import assert from 'node:assert/strict';
import { importModel, loadLocalMaps, loadModel, loadRecentMaps, normalizeJsonUrl, recordRecentMap, saveLocalMap, validateModel } from './storage.ts';
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
  assert.equal((validated.layout as { mode: string }).mode, 'matrix');
});

test('rejects unsupported schemas before normalizing and does not mutate the invalid model', () => {
  const unsupported = { ...validModel(), schemaVersion: 1 };
  assert.throws(() => validateModel(unsupported), /Format de cartographie invalide/);
  assert.equal(unsupported.schemaVersion, 1);
});

test('rejects broken capability references', () => {
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


const withLocalStorage = async (run: (storage: { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void; clear(): void }) => void | Promise<void>) => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, String(value)); },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => values.clear(),
  };
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  try {
    await run(storage);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete (globalThis as typeof globalThis & { localStorage?: unknown }).localStorage;
  }
};

test('falls back safely when stored model JSON is corrupt', async () => {
  await withLocalStorage(storage => {
    storage.setItem('enterprise-capacity-mapper:model:v3', '{invalid');
    const fallback = validModel();
    assert.equal(loadModel(fallback), fallback);
  });
});

test('migrates legacy level data to schema v3 and persists the migrated model', async () => {
  await withLocalStorage(storage => {
    storage.setItem('ea_canvas_l0', JSON.stringify([{ id: 'domain-1', code: 'D1', name: 'Domain' }]));
    storage.setItem('ea_canvas_l1', JSON.stringify([{ id: 'cap-1', l0Id: 'domain-1', code: 'C1', name: 'Capability' }]));
    storage.setItem('ea_canvas_apps', JSON.stringify([{ id: 'app-1', name: 'Application', l1Id: 'cap-1' }]));

    const migrated = loadModel(validModel()) as CatalogModel & { schemaVersion: number };
    assert.equal(migrated.schemaVersion, 3);
    assert.equal(migrated.capabilities[0].domainId, 'domain-1');
    assert.deepEqual(migrated.applications[0].capabilityIds, ['cap-1']);
    assert.equal(JSON.parse(storage.getItem('enterprise-capacity-mapper:model:v3') || '{}').schemaVersion, 3);
  });
});

test('recovers from syntactically corrupted or structurally invalid local map collections', async () => {
  await withLocalStorage(storage => {
    storage.setItem('enterprise-capacity-mapper:local-maps:v1', '{invalid json');
    assert.deepEqual(loadLocalMaps(), []);
    assert.equal(storage.getItem('enterprise-capacity-mapper:local-maps:v1'), null);

    storage.setItem('enterprise-capacity-mapper:recent-maps:v1', JSON.stringify({ not: 'an array' }));
    assert.deepEqual(loadRecentMaps(), []);
    assert.equal(storage.getItem('enterprise-capacity-mapper:recent-maps:v1'), null);
  });
});

test('saving local maps trims names, updates by id and rejects empty names', async () => {
  await withLocalStorage(() => {
    const first = saveLocalMap({ id: 'map-1', name: '  First map  ', model: validModel() });
    assert.equal(first.name, 'First map');
    const updated = saveLocalMap({ id: 'map-1', name: '  Renamed  ', model: validModel() });
    assert.equal(updated.name, 'Renamed');
    assert.equal(loadLocalMaps().length, 1);
    assert.throws(() => saveLocalMap({ id: 'map-2', name: '   ', model: validModel() }), /nom de la cartographie est obligatoire/i);
  });
});

test('recent maps are de-duplicated and capped at ten entries', async () => {
  await withLocalStorage(() => {
    for (let index = 0; index < 11; index += 1) {
      recordRecentMap({ id: `map-${index}`, name: `Map ${index}`, model: validModel() });
    }
    recordRecentMap({ id: 'map-5', name: 'Updated map 5', model: validModel() });
    const recent = loadRecentMaps();
    assert.equal(recent.length, 10);
    assert.equal(recent[0].id, 'map-5');
    assert.equal(recent.filter(entry => entry.id === 'map-5').length, 1);
  });
});
