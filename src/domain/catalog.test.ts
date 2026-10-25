import test from 'node:test';
import assert from 'node:assert/strict';
import { Catalog } from './catalog.ts';

const model = {
  domains: [{ id: 'd1', code: 'D1', name: 'Domain' }],
  capabilities: [{ id: 'c1', domainId: 'd1', code: 'C1', name: 'Capability' }],
  applications: [{ id: 'a1', name: 'Application', capabilityIds: [] as string[] }],
};

test('Catalog enforces domain invariants and returns isolated snapshots', () => {
  const catalog = Catalog.fromModel(model);
  const updated = catalog.renameDomain('d1', '  Customer  ');

  assert.equal(updated.toModel().domains[0].name, 'Customer');
  assert.equal(catalog.toModel().domains[0].name, 'Domain');
  const snapshot = catalog.toModel();
  snapshot.domains[0].name = 'mutated outside';
  assert.equal(catalog.toModel().domains[0].name, 'Domain');
  assert.throws(() => catalog.renameDomain('missing', 'Name'), /Domaine introuvable/);
  assert.throws(() => catalog.renameDomain('d1', '   '), /obligatoire/);
  assert.throws(() => catalog.createDomain({ id: 'd1', code: 'D1', name: 'Duplicate' }), /existe déjà/);
  assert.throws(() => catalog.createDomain({ id: '', code: 'D2', name: 'Invalid id' }), /identifiant.*obligatoire/);
});

test('Catalog validates capability names, references and unique identifiers', () => {
  const catalog = Catalog.fromModel(model);
  assert.throws(() => catalog.createCapability({ id: 'c2', domainId: 'missing', name: 'Capability 2' }), /Domaine introuvable/);
  assert.throws(() => catalog.createCapability({ id: 'c1', domainId: 'd1', name: 'Duplicate' }), /existe déjà/);
  assert.throws(() => catalog.createCapability({ id: 'c2', domainId: 'd1', name: '  ' }), /obligatoire/);
  assert.throws(() => catalog.updateCapability('c1', { domainId: 'missing' }), /Domaine introuvable/);
  assert.equal(catalog.updateCapabilityPriority('c1', 'qualified').toModel().capabilities[0].priority, 'qualified');
});

test('Catalog makes application-capability links idempotent and validates both ends', () => {
  const catalog = Catalog.fromModel(model);
  const linked = catalog.linkApplicationToCapability('a1', 'c1').linkApplicationToCapability('a1', 'c1');
  assert.deepEqual(linked.toModel().applications[0].capabilityIds, ['c1']);
  const unlinked = linked.unlinkApplicationFromCapability('a1', 'c1');
  assert.deepEqual(unlinked.toModel().applications[0].capabilityIds, []);
  assert.throws(() => catalog.linkApplicationToCapability('missing', 'c1'), /Application introuvable/);
  assert.throws(() => catalog.linkApplicationToCapability('a1', 'missing'), /Capacité introuvable/);
});

test('Catalog validates application names, IDs and linked capabilities', () => {
  const catalog = Catalog.fromModel(model);
  assert.throws(() => catalog.createApplication({ id: 'a2', name: 'New', capabilityIds: ['missing'] }), /Capacité introuvable/);
  assert.throws(() => catalog.createApplication({ id: 'a1', name: 'Duplicate' }), /existe déjà/);
  assert.throws(() => catalog.createApplication({ id: 'a2', name: '  ' }), /obligatoire/);
  const created = catalog.createApplication({ id: 'a2', name: '  New app ', capabilityIds: ['c1', 'c1'] });
  assert.deepEqual(created.toModel().applications[1].capabilityIds, ['c1']);
  assert.equal(created.toModel().applications[1].name, 'New app');
  assert.throws(() => created.updateApplication('a2', { capabilityIds: ['unknown'] }), /Capacité introuvable/);
});

test('Catalog removes a capability and cleans up dependent application links', () => {
  const catalog = Catalog.fromModel({
    ...model,
    applications: [{ id: 'a1', name: 'Application', capabilityIds: ['c1', 'd1', 'external'] }],
  });
  assert.deepEqual(catalog.removeCapability('c1').toModel().applications[0].capabilityIds, ['external']);
  assert.deepEqual(catalog.removeCapability('missing').toModel(), catalog.toModel());
});

test('depth-1 catalogs link applications to domains and clean every deleted reference', () => {
  const catalog = Catalog.fromModel({ ...model, layout: { depth: 1 }, applications: [{ id: 'a1', name: 'Application', capabilityIds: ['d1', 'c1', 'legacy'] }] });
  const linked = catalog.linkApplicationToMappedItem('a1', 'd1');
  assert.deepEqual(linked.toModel().applications[0].capabilityIds, ['d1', 'c1', 'legacy']);
  assert.throws(() => catalog.linkApplicationToMappedItem('a1', 'c1'), /Domaine introuvable/);
  assert.deepEqual(linked.removeDomain('d1', 1).toModel().applications[0].capabilityIds, ['legacy']);
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

test('Catalog creates an empty map while preserving unrelated metadata', () => {
  const catalog = Catalog.fromModel({ ...model, metadata: { owner: 'team', settings: { locale: 'fr' } } });
  const created = catalog.createEmptyMap('New map', 'Description', { mode: 'matrix' });
  assert.deepEqual(created.toModel(), {
    domains: [], capabilities: [], applications: [],
    metadata: { owner: 'team', settings: { locale: 'fr' }, name: 'New map', description: 'Description' },
    layout: { mode: 'matrix' },
  });
  const snapshot = catalog.toModel();
  (snapshot.metadata as { settings: { locale: string } }).settings.locale = 'mutated';
  assert.equal((catalog.toModel().metadata as { settings: { locale: string } }).settings.locale, 'fr');
});

test('Catalog protects matrix placements on domain creation and update', () => {
  const matrix = {
    ...model,
    layout: {
      mode: 'matrix',
      columns: [{ id: 'c1', name: 'Business' }, { id: 'c2', name: 'Support' }],
      layers: [{ id: 'l1', name: 'Core' }, { id: 'l2', name: 'Support' }],
      zones: [],
    },
    domains: [{ id: 'd1', code: 'D1', name: 'Domain', layout: { columnId: 'c1', layerId: 'l1', columnSpan: 1 } }],
  };
  const catalog = Catalog.fromModel(matrix);
  assert.throws(() => catalog.createDomain({
    id: 'd2', code: 'D2', name: 'Overlapping', layout: { columnId: 'c1', layerId: 'l1', columnSpan: 1 },
  }), /chevauche/);
  assert.throws(() => catalog.updateDomain('d1', { layout: { columnId: 'missing', layerId: 'l1', columnSpan: 1 } }), /hors matrice/);
  assert.equal(catalog.updateDomain('d1', { layout: { columnId: 'c2', layerId: 'l1', columnSpan: 1 } }).toModel().domains[0].layout?.columnId, 'c2');
});
