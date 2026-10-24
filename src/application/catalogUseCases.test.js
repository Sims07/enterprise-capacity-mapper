import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createApplication,
  createCapability,
  createDomain,
  removeDomainAndDependents,
  updateCapability,
  updateDomain,
} from './catalogUseCases.js';

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
  const created = createCapability({ capabilities: [], form, id: 'cap-2' });
  assert.deepEqual(created[0], {
    id: 'cap-2',
    domainId: 'domain-1',
    code: ' CAP-1 ',
    name: 'Prospection',
    description: 'Description',
    priority: 'unqualified',
  });

  const updated = updateCapability({
    capabilities: [{ id: 'cap-2', name: 'Old', extra: true, priority: 'P2' }, { id: 'other' }],
    capabilityId: 'cap-2',
    form: { ...form, priority: '' },
  });
  assert.deepEqual(updated[0], {
    id: 'cap-2',
    name: 'Prospection',
    extra: true,
    priority: 'unqualified',
    description: 'Description',
  });
  assert.deepEqual(updated[1], { id: 'other' });
});

test('creates applications with their selected relations', () => {
  assert.deepEqual(createApplication({
    applications: [{ id: 'existing' }],
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
      { id: 'app-1', capabilityIds: ['cap-2', 'domain-1', 'external'] },
      { id: 'app-2', capabilityIds: [] },
    ],
  });
  assert.deepEqual(removeDomainAndDependents({ model, domainId: 'domain-1', depth: 1 }).applications[0].capabilityIds, ['cap-2', 'external']);
});
