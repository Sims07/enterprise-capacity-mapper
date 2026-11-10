import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeCapabilityGaps, findMissingReferenceCapabilities } from './capabilityGaps.ts';
import type { CatalogModel } from './catalogModel.ts';

const model = (): CatalogModel => ({
  schemaVersion: 3,
  domains: [{ id: 'd', code: 'CRM', name: 'Relation client' }],
  capabilities: [
    { id: 'c1', domainId: 'd', code: 'C-01', name: 'Contrats', priority: 'P1',
      assessment: { functionalCoverage: 'partial', currentMaturity: 2, targetMaturity: 4 } },
    { id: 'c2', domainId: 'd', code: 'C-02', name: 'Facturation',
      assessment: { functionalCoverage: 'sufficient', currentMaturity: 4, targetMaturity: 4 } },
    { id: 'c3', domainId: 'd', code: 'C-03', name: 'Prévision' },
  ],
  applications: [
    { id: 'app1', name: 'Legacy', status: 'Obsolète', capabilityIds: ['c1'] },
    { id: 'app2', name: 'Cible', status: 'Cible', capabilityIds: ['c1', 'c3'] },
    { id: 'app3', name: 'Actif', status: 'Actif', capabilityIds: ['c2'] },
  ],
});

test('diagnoses current, future, functional and maturity gaps without assigning a score', () => {
  const findings = analyzeCapabilityGaps(model());
  assert.deepEqual(findings[0].currentApplications, ['app1']);
  assert.deepEqual(findings[0].targetApplications, ['app2']);
  assert.equal(findings[0].maturityDelta, 2);
  assert.equal(findings[0].signals.find(signal => signal.kind === 'maturity')?.description, 'Écart de maturité de 2 niveaux');
  assert.deepEqual(findings[0].signals.map(signal => signal.kind), ['functional-partial', 'maturity', 'obsolete']);
  assert.equal(findings[1].maturityDelta, 0);
  assert.equal(findings[1].signals.length, 0);
  assert.equal(findings[1].needsQualification, false);
  assert.equal(findings[2].needsQualification, true);
  assert.deepEqual(findings[2].currentApplications, []);
  assert.deepEqual(findings[2].signals.map(signal => signal.kind), ['missing-current']);
  assert.equal(findings[0].priority, 'P1');
});

test('reports explicit absence and supports absent maturity without guessing', () => {
  const input = model();
  input.capabilities[0].assessment = { functionalCoverage: 'none', targetMaturity: 5 };
  input.applications[0].status = 'Actif';
  const findings = analyzeCapabilityGaps(input);
  assert.equal(findings[0].maturityDelta, null);
  assert.deepEqual(findings[0].signals.map(signal => signal.kind), ['functional-none']);
  input.capabilities[0].assessment = { functionalCoverage: 'unknown', currentMaturity: 4, targetMaturity: 3 };
  assert.equal(analyzeCapabilityGaps(input)[0].maturityDelta, 0);
  assert.equal(analyzeCapabilityGaps(input)[0].needsQualification, true);
  input.capabilities[0].assessment = { functionalCoverage: 'sufficient', currentMaturity: 4, targetMaturity: 5 };
  assert.equal(analyzeCapabilityGaps(input)[0].signals.find(signal => signal.kind === 'maturity')?.description,
    'Écart de maturité de 1 niveau');
});

test('treats an unknown application status as a declared current relation and supports empty catalogs', () => {
  const input = model();
  input.applications = [{ id: 'app', name: 'No status', capabilityIds: ['c2'] }];
  assert.deepEqual(analyzeCapabilityGaps(input)[1].currentApplications, ['app']);
  assert.equal(analyzeCapabilityGaps({ ...input, capabilities: [] }).length, 0);
});

test('compares capabilities to a validated reference by code or scoped normalized name', () => {
  const active = model();
  const reference = model();
  reference.capabilities.push({ id: 'new', domainId: 'd', code: 'C-04', name: 'Gestion des archives' });
  assert.deepEqual(findMissingReferenceCapabilities(active, reference), [
    { id: 'new', name: 'Gestion des archives', code: 'C-04', domainName: 'Relation client' },
  ]);
  const withoutCodes = model();
  withoutCodes.capabilities = [{ id: 'c4', domainId: 'd', name: 'Réclamations' }];
  const sameName = { ...withoutCodes, domains: [{ id: 'other', name: 'Relation client', code: 'CRM' }], capabilities: [{ id: 'otherc', domainId: 'other', name: 'Reclamations' }] };
  assert.deepEqual(findMissingReferenceCapabilities(withoutCodes, sameName), []);
  assert.deepEqual(findMissingReferenceCapabilities(active, { domains: [], capabilities: [{ id: 'orphan', domainId: 'missing', name: 'Foo' }], applications: [] }), [
    { id: 'orphan', name: 'Foo', code: undefined, domainName: 'Domaine inconnu' },
  ]);
});
