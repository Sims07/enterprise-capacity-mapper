import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createApplication,
  createCapability,
  createDomain,
  removeCapabilityAndDependents,
  removeDomainAndDependents,
  updateApplication,
  updateCapability,
  updateDomain,
} from './catalogUseCases.ts';

const resolveColor = color => color.toUpperCase();
const form = {
  name: '  Prospection  ',
  code: ' CAP-1 ',
  description: 'Description',
  color: '#aabbcc',
  columnId: '',
  layerId: '',
  columnSpan: '2',
  domainId: 'domain-1',
  priority: '',
  type: 'SaaS',
  status: 'Actif',
  vendor: 'Vendor',
  capabilityIds: ['cap-1'],
};

test('creates and updates domains while preserving layout fields and applying defaults', () => {
  const created = createDomain({
    domains: [{ id: 'existing' }],
    form,
    id: 'domain-2',
    defaultColumnId: 'column-1',
    defaultLayerId: 'layer-1',
    resolveColor,
  });
  assert.deepEqual(created[1], {
    id: 'domain-2',
    code: ' CAP-1 ',
    name: 'Prospection',
    description: 'Description',
    color: '#AABBCC',
    layout: { columnId: 'column-1', layerId: 'layer-1', columnSpan: 2 },
  });

  const updated = updateDomain({
    domains: [{ id: 'domain-2', code: 'OLD', layout: { extra: true, columnId: 'old-column' } }],
    domainId: 'domain-2',
    form: { ...form, code: '   ', columnId: '', layerId: '', columnSpan: 'bad' },
    defaultColumnId: 'column-1',
    defaultLayerId: 'layer-1',
    resolveColor,
  });
  assert.deepEqual(updated[0], {
    id: 'domain-2',
    code: 'OLD',
    name: 'Prospection',
    description: 'Description',
    color: '#AABBCC',
    layout: { extra: true, columnId: 'old-column', layerId: 'layer-1', columnSpan: 1 },
  });
});

test('creates capabilities and updates existing capability details', () => {
  const created = createCapability({ domains: [{ id: 'domain-1', name: 'Domain', code: 'D1' }], capabilities: [], form, id: 'cap-2' });
  assert.deepEqual(created[0], {
    id: 'cap-2',
    domainId: 'domain-1',
    code: ' CAP-1 ',
    name: 'Prospection',
    description: 'Description',
    priority: 'unqualified',
  });

  const updated = updateCapability({
    domains: [{ id: 'domain-1', name: 'Domain', code: 'D1' }],
    capabilities: [{ id: 'cap-2', domainId: 'domain-1', name: 'Old', extra: true, priority: 'P2' }, { id: 'other' }],
    capabilityId: 'cap-2',
    form: { ...form, priority: '' },
  });
  assert.deepEqual(updated[0], {
    id: 'cap-2',
    name: 'Prospection',
    domainId: 'domain-1',
    extra: true,
    priority: 'unqualified',
    description: 'Description',
  });
  assert.deepEqual(updated[1], { id: 'other' });
});

test('creates applications with their selected relations', () => {
  assert.deepEqual(createApplication({
    applications: [{ id: 'existing' }],
    capabilities: [{ id: 'cap-1', domainId: 'domain-1', name: 'Capability' }],
    form,
    id: 'app-1',
  })[1], {
    id: 'app-1',
    name: 'Prospection',
    code: ' CAP-1 ',
    type: 'SaaS',
    status: 'Actif',
    vendor: 'Vendor',
    capabilityIds: ['cap-1'],
    description: 'Description',
  });
});

test('removes a domain, its capabilities and the correct dependent application links', () => {
  const model = {
    domains: [{ id: 'domain-1' }, { id: 'domain-2' }],
    capabilities: [{ id: 'cap-1', domainId: 'domain-1' }, { id: 'cap-2', domainId: 'domain-2' }],
    applications: [
      { id: 'app-1', capabilityIds: ['cap-1', 'cap-2', 'domain-1', 'external'] },
      { id: 'app-2' },
    ],
  };
  assert.deepEqual(removeDomainAndDependents({ model, domainId: 'domain-1', depth: 2 }), {
    domains: [{ id: 'domain-2' }],
    capabilities: [{ id: 'cap-2', domainId: 'domain-2' }],
    applications: [
      { id: 'app-1', capabilityIds: ['cap-2', 'external'] },
      { id: 'app-2', capabilityIds: [] },
    ],
  });
  assert.deepEqual(removeDomainAndDependents({ model, domainId: 'domain-1', depth: 1 }).applications[0].capabilityIds, ['cap-2', 'external']);
});

test('updates applications through the domain and validates relations for depth one maps', () => {
  const domains = [{ id: 'domain-1', code: 'D1', name: 'Domain' }];
  const capabilities = [{ id: 'cap-1', domainId: 'domain-1', name: 'Capability' }];
  const updated = updateApplication({
    applications: [{ id: 'app-1', name: 'Old', capabilityIds: ['cap-1'], extra: { keep: true } }],
    applicationId: 'app-1',
    form: { ...form, name: '  Updated  ', capabilityIds: ['cap-1'] },
    domains,
    capabilities,
  });
  assert.equal(updated[0].name, 'Updated');
  assert.deepEqual(updated[0].extra, { keep: true });
  assert.deepEqual(updated[0].capabilityIds, ['cap-1']);

  const depthOne = createApplication({
    applications: [],
    form: { ...form, capabilityIds: ['domain-1'] },
    id: 'app-depth-one',
    domains,
    capabilities,
    layout: { depth: 1 },
  });
  assert.deepEqual(depthOne[0].capabilityIds, ['domain-1']);
});

test('removing a capability through the use case cleans application references', () => {
  const model = {
    domains: [{ id: 'domain-1', name: 'Domain', code: 'D1' }],
    capabilities: [{ id: 'cap-1', domainId: 'domain-1', name: 'Capability' }],
    applications: [{ id: 'app-1', name: 'Application', capabilityIds: ['cap-1', 'legacy'] }],
  };
  assert.deepEqual(removeCapabilityAndDependents({ model, capabilityId: 'cap-1' }).applications[0].capabilityIds, ['legacy']);
});

test('catalog use cases delegate matrix placement invariants to the domain', () => {
  const mapLayout = {
    mode: 'matrix',
    columns: [{ id: 'c1', name: 'Business' }, { id: 'c2', name: 'Support' }],
    layers: [{ id: 'l1', name: 'Core' }],
    zones: [],
  };
  const domains = [
    { id: 'domain-1', code: 'D1', name: 'Existing', layout: { columnId: 'c1', layerId: 'l1', columnSpan: 1 } },
    { id: 'domain-2', code: 'D2', name: 'Occupied', layout: { columnId: 'c2', layerId: 'l1', columnSpan: 1 } },
  ];
  assert.throws(() => createDomain({
    domains, form: { ...form, columnId: 'c1', layerId: 'l1' }, id: 'domain-3',
    defaultColumnId: 'c1', defaultLayerId: 'l1', resolveColor, mapLayout,
  }), /chevauche/);
  assert.throws(() => updateDomain({
    domains, domainId: 'domain-1', form: { ...form, columnId: 'c2', layerId: 'l1' },
    defaultColumnId: 'c1', defaultLayerId: 'l1', resolveColor, mapLayout,
  }), /chevauche/);
});
