import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyMap, updateCapabilityPriority, updateModel } from './modelUseCases.ts';

const model = () => ({
  metadata: { name: 'Original map', owner: 'Architecture' },
  layout: { depth: 2, mode: 'matrix' },
  domains: [{ id: 'd1', code: 'D1', name: 'Finance' }],
  capabilities: [{ id: 'c1', domainId: 'd1', name: 'Billing', priority: 'unqualified' }],
  applications: [{ id: 'a1', name: 'ERP', capabilityIds: ['c1'] }],
});

test('updateModel applies a shallow patch without mutating the current snapshot', () => {
  const current = model();
  const updated = updateModel(current, { metadata: { name: 'Updated map' } });
  assert.notEqual(updated, current);
  assert.deepEqual(updated.metadata, { name: 'Updated map' });
  assert.deepEqual(current.metadata, { name: 'Original map', owner: 'Architecture' });
  assert.equal(updated.capabilities, current.capabilities);
});

test('updateCapabilityPriority updates only the selected capability immutably', () => {
  const current = model();
  const updated = updateCapabilityPriority(current, 'c1', 'qualified');
  assert.equal(updated.capabilities[0].priority, 'qualified');
  assert.equal(current.capabilities[0].priority, 'unqualified');
  assert.equal(updated.domains, current.domains);
});

test('updateCapabilityPriority normalizes an absent priority and rejects unknown ids', () => {
  assert.equal(updateCapabilityPriority(model(), 'c1').capabilities[0].priority, 'unqualified');
  assert.throws(() => updateCapabilityPriority(model(), 'missing', 'qualified'), /Capacité introuvable/);
});

test('createEmptyMap resets catalog contents and preserves unrelated metadata', () => {
  const current = model();
  const updated = createEmptyMap(current, {
    name: '  Target state  ',
    description: 'Future scope',
    layout: { depth: 1, mode: 'matrix' },
  });
  assert.deepEqual(updated.metadata, {
    name: 'Target state', description: 'Future scope', owner: 'Architecture',
  });
  assert.deepEqual(updated.layout, { depth: 1, mode: 'matrix' });
  assert.deepEqual(updated.domains, []);
  assert.deepEqual(updated.capabilities, []);
  assert.deepEqual(updated.applications, []);
  assert.equal(current.domains.length, 1);
});

test('createEmptyMap rejects a blank map name', () => {
  assert.throws(() => createEmptyMap(model(), {
    name: '   ', description: undefined, layout: { mode: 'matrix' },
  }), /nom de la cartographie est obligatoire/);
});
