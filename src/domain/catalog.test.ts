import test from 'node:test';
import assert from 'node:assert/strict';
import { Catalog } from './catalog.ts';

const model = {
  domains: [{ id: 'd1', code: 'D1', name: 'Domain' }],
  capabilities: [{ id: 'c1', domainId: 'd1', code: 'C1', name: 'Capability' }],
  applications: [{ id: 'a1', name: 'Application', capabilityIds: [] as string[] }],
};

test('Catalog normalizes domain names, rejects blanks and duplicate IDs, and returns isolated snapshots', () => {
  const catalog = Catalog.fromModel(model);
  const updated = catalog.renameDomain('d1', '  Customer  ');

  assert.equal(updated.toModel().domains[0].name, 'Customer');
  assert.equal(catalog.toModel().domains[0].name, 'Domain');
  assert.throws(() => catalog.renameDomain('missing', 'Name'), /Domaine introuvable/);
  assert.throws(() => catalog.renameDomain('d1', '   '), /obligatoire/);
  assert.throws(() => catalog.createDomain({ id: 'd1', code: 'D1', name: 'Duplicate' }), /existe déjà/);
  assert.throws(() => catalog.createDomain({ id: 'd2', code: 'D2', name: '  ' }), /obligatoire/);

  const snapshot = catalog.toModel();
  snapshot.domains[0].name = 'mutated outside';
  assert.equal(catalog.toModel().domains[0].name, 'Domain');
});

test('Catalog enforces capability identity, names and valid domain references', () => {
  const catalog = Catalog.fromModel(model);
  assert.throws(() => catalog.createCapability({ id: 'c2', domainId: 'missing', name: 'Capability 2' }), /Domaine introuvable/);
  assert.throws(() => catalog.createCapability({ id: 'c1', domainId: 'd1', name: 'Duplicate' }), /existe déjà/);
  assert.throws(() => catalog.createCapability({ id: 'c2', domainId: 'd1', name: '  ' }), /obligatoire/);
  assert.throws(() => catalog.updateCapability('missing', { name: 'Renamed' }), /Capacité introuvable/);
  assert.throws(() => catalog.updateCapability('c1', { domainId: 'missing' }), /Domaine introuvable/);

  const updated = catalog.updateCapability('c1', { name: '  New capability  ', priority: 'P1' }).toModel();
  assert.equal(updated.capabilities[0].name, 'New capability');
  assert.equal(updated.capabilities[0].priority, 'P1');
  assert.equal(updated.capabilities[0].domainId, 'd1');
});

test('Catalog enforces application identity and validates all capability references', () => {
  const catalog = Catalog.fromModel(model);
  assert.throws(() => catalog.createApplication({ id: 'a2', name: 'Bad app', capabilityIds: ['missing'] }), /Capacité introuvable/);
  assert.throws(() => catalog.createApplication({ id: 'a1', name: 'Duplicate app' }), /existe déjà/);
  assert.throws(() => catalog.createApplication({ id: 'a2', name: '  ' }), /obligatoire/);
  assert.throws(() => catalog.updateApplication('missing', { name: 'Renamed' }), /Application introuvable/);

  const created = catalog.createApplication({ id: 'a2', name: '  CRM  ', capabilityIds: ['c1', 'c1'] });
  assert.deepEqual(created.toModel().applications[1], { id: 'a2', name: 'CRM', capabilityIds: ['c1'] });
  assert.throws(() => created.updateApplication('a2', { capabilityIds: ['unknown'] }), /Capacité introuvable/);
});

test('Catalog makes application-capability links idempotent and validates both ends', () => {
  const catalog = Catalog.fromModel(model);
  const linked = catalog.linkApplicationToCapability('a1', 'c1').linkApplicationToCapability('a1', 'c1');
  assert.deepEqual(linked.toModel().applications[0].capabilityIds, ['c1']);
  assert.equal(linked.unlinkApplicationFromCapability('a1', 'missing').toModel().applications[0].capabilityIds?.[0], 'c1');
  assert.throws(() => catalog.linkApplicationToCapability('missing', 'c1'), /Application introuvable/);
  assert.throws(() => catalog.linkApplicationToCapability('a1', 'missing'), /Capacité introuvable/);
  assert.throws(() => catalog.unlinkApplicationFromCapability('missing', 'c1'), /Application introuvable/);
  const unlinked = linked.unlinkApplicationFromCapability('a1', 'c1');
  assert.deepEqual(unlinked.toModel().applications[0].capabilityIds, []);
});

test('removing a capability removes its application relations without touching unrelated links', () => {
  const catalog = Catalog.fromModel({
    ...model,
    capabilities: [...model.capabilities, { id: 'c2', domainId: 'd1', name: 'Other capability' }],
    applications: [{ id: 'a1', name: 'Application', capabilityIds: ['c1', 'c2', 'legacy'] }],
  });
  assert.deepEqual(catalog.removeCapability('c1').toModel().applications[0].capabilityIds, ['c2', 'legacy']);
  assert.deepEqual(catalog.removeCapability('c1').toModel().capabilities.map(capability => capability.id), ['c2']);
});

test('Catalog removes a domain and its dependent capability links', () => {
  const catalog = Catalog.fromModel({
    ...model,
    applications: [{ id: 'a1', name: 'Application', capabilityIds: ['c1', 'external'] }],
  });
  assert.deepEqual(catalog.removeDomain('d1').toModel(), {
    domains: [],
    capabilities: [],
    applications: [{ id: 'a1', name: 'Application', capabilityIds: ['external'] }],
  });
});
