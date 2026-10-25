import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignApplicationToCapability,
  linkPickedApplications,
  prepareLinkedApplications,
  unassignApplicationFromCapability,
} from './relationshipUseCases.ts';

const domains = [{ id: 'domain1', name: 'Domain', code: 'D1' }];
const capabilities = [
  { id: 'cap1', domainId: 'domain1', name: 'Capability 1' },
  { id: 'cap2', domainId: 'domain1', name: 'Capability 2' },
];
const applications = () => [
  { id: 'app1', name: 'Application 1', capabilityIds: ['cap1'] },
  { id: 'app2', name: 'Application 2', capabilityIds: [] },
  { id: 'app3', name: 'Application 3' },
];
const mappedItems = capabilities;

test('assigns idempotently and removes only the requested capability relation', () => {
  const assigned = assignApplicationToCapability(applications(), 'app1', 'cap1', domains, capabilities);
  assert.deepEqual(assigned[0].capabilityIds, ['cap1']);
  assert.deepEqual(assignApplicationToCapability(assigned, 'app1', 'cap2', domains, capabilities)[0].capabilityIds, ['cap1', 'cap2']);
  assert.deepEqual(unassignApplicationFromCapability(assigned, 'app1', 'cap1', domains, capabilities)[0].capabilityIds, []);
  assert.deepEqual(unassignApplicationFromCapability(assigned, 'missing', 'cap1', domains, capabilities), assigned);
  assert.throws(() => assignApplicationToCapability(applications(), 'app1', 'missing', domains, capabilities), /Capacité introuvable/);
});

test('links selected applications without duplicate relations and leaves others untouched', () => {
  const source = applications();
  const result = linkPickedApplications(source, ['app1', 'app2'], 'cap2', domains, capabilities);
  assert.deepEqual(result[0].capabilityIds, ['cap1', 'cap2']);
  assert.deepEqual(result[1].capabilityIds, ['cap2']);
  assert.deepEqual(result[2], source[2]);
  assert.equal(linkPickedApplications(source, [], 'cap2', domains, capabilities), source);
});

test('editing a target relation adds and removes it from checked applications only', () => {
  const source = applications();
  const result = prepareLinkedApplications({
    applications: source, mappedItems, link: { kind: 'target', id: 'cap2' },
    checkedIds: ['app1', 'app3'],
    domains,
    capabilities,
  });
  assert.deepEqual(result[0].capabilityIds, ['cap1', 'cap2']);
  assert.deepEqual(result[1].capabilityIds, []);
  assert.deepEqual(result[2].capabilityIds, ['cap2']);
});

test('editing an application replaces only mapped relations and preserves unrelated ids', () => {
  const source = [
    { id: 'app1', name: 'Application 1', capabilityIds: ['cap1', 'legacy', 'cap2'] },
    { id: 'app2', name: 'Application 2', capabilityIds: ['cap1'] },
  ];
  const result = prepareLinkedApplications({
    applications: source, mappedItems, link: { kind: 'application', id: 'app1' },
    checkedIds: ['cap2'],
    domains,
    capabilities,
  });
  assert.deepEqual(result[0].capabilityIds, ['legacy', 'cap2']);
  assert.deepEqual(result[1].capabilityIds, ['cap1']);
});

test('returns original application list when no relationship changes are needed', () => {
  const source = [{ id: 'app1', name: 'Application 1', capabilityIds: ['cap1'] }];
  const result = prepareLinkedApplications({
    applications: source, mappedItems: [{ id: 'cap1' }], link: { kind: 'target', id: 'cap1' },
    checkedIds: ['app1'],
    domains,
    capabilities, domains, capabilities,
  });
  assert.deepEqual(result[0].capabilityIds, ['cap1']);
});
