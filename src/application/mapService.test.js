import test from 'node:test';
import assert from 'node:assert/strict';
import { createMapService } from './mapService.js';

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
