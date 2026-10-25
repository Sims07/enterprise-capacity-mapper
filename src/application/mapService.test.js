import test from 'node:test';
import assert from 'node:assert/strict';
import { createMapService } from './mapService.ts';

const initial = {
  metadata: { name: 'Carte' },
  layout: { depth: 2 },
  domains: [],
  capabilities: [{ id: 'cap-1', name: 'Prospection', priority: 'unqualified' }],
  applications: [],
};

test('map application service owns model history and persistence through its port', () => {
  const saved = [];
  const repository = {
    load: fallback => fallback,
    save: model => { saved.push(model); return model; },
  };
  const map = createMapService({ repository, initialModel: initial });

  map.updateCapabilityPriority('cap-1', 'qualified');
  assert.equal(map.snapshot().current.capabilities[0].priority, 'qualified');
  assert.equal(map.snapshot().canUndo, true);

  map.undo();
  assert.equal(map.snapshot().current.capabilities[0].priority, 'unqualified');
  assert.equal(map.snapshot().canRedo, true);

  map.redo();
  map.persist();
  assert.equal(saved[0].capabilities[0].priority, 'qualified');
});

test('createEmptyMap preserves model metadata while replacing map contents', () => {
  const repository = { load: fallback => fallback, save: model => model };
  const map = createMapService({ repository, initialModel: initial });
  const snapshot = map.createEmptyMap({
    name: 'Nouvelle carte',
    description: 'Périmètre cible',
    layout: { depth: 1, mode: 'matrix' },
  });

  assert.equal(snapshot.current.metadata.name, 'Nouvelle carte');
  assert.equal(snapshot.current.metadata.description, 'Périmètre cible');
  assert.deepEqual(snapshot.current.layout, { depth: 1, mode: 'matrix' });
  assert.deepEqual(snapshot.current.domains, []);
  assert.deepEqual(snapshot.current.capabilities, []);
  assert.deepEqual(snapshot.current.applications, []);
  assert.equal(snapshot.canUndo, true);
});
