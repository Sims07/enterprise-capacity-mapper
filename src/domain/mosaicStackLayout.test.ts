import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMosaicStackLayout } from './mosaicStackLayout.ts';

const columns = [
  { id: 'c1', name: 'Usager' },
  { id: 'c2', name: 'Métier' },
  { id: 'c3', name: 'SI' },
];
const layers = [
  { id: 'core', name: 'Cœur métier' },
  { id: 'support', name: 'Support' },
];

test('stacks full and partial column overlaps in one existing business layer', () => {
  const domains = [
    { id: 'existing', layout: { columnId: 'c1', layerId: 'core', columnSpan: 2 } },
    { id: 'disjoint', layout: { columnId: 'c3', layerId: 'core' } },
    { id: 'moved', layout: { columnId: 'c1', layerId: 'core', columnSpan: 3 } },
    { id: 'third', layout: { columnId: 'c2', layerId: 'core' } },
  ];
  const original = JSON.stringify(domains);
  const result = computeMosaicStackLayout(domains, columns, layers);
  assert.deepEqual(result.rowCounts, [3, 1]);
  assert.deepEqual(result.tiers, { existing: 0, disjoint: 0, moved: 1, third: 2 });
  assert.equal(JSON.stringify(domains), original);
});

test('keeps an independent stack for each layer and never creates data layers', () => {
  const domains = [
    { id: 'support', layout: { columnId: 'c1', layerId: 'support' } },
    { id: 'core', layout: { columnId: 'c1', layerId: 'core' } },
    { id: 'core-second', layout: { columnId: 'c1', layerId: 'core' } },
    { id: 'support-second', layout: { columnId: 'c1', layerId: 'support' } },
  ];
  assert.deepEqual(computeMosaicStackLayout(domains, columns, layers), {
    rowCounts: [2, 2],
    tiers: { support: 0, core: 0, 'core-second': 1, 'support-second': 1 },
  });
});
