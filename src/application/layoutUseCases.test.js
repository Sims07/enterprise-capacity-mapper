import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addLayoutDraftItem,
  completeLayoutZones,
  isDomainPlacementAvailable,
  prepareLayoutForSave,
  prepareDomainPlacement,
  removeLayoutDraftItem,
  renameLayoutDraftItem,
  renameLayoutZone,
} from './layoutUseCases.ts';

const draft = () => ({
  columns: [{ id: 'c1', name: 'Business', order: 0 }, { id: 'c2', name: 'Support', order: 1 }],
  layers: [{ id: 'l1', name: 'Core', order: 0 }, { id: 'l2', name: 'Support', order: 1 }],
  zones: [
    { id: 'c1:l1', columnId: 'c1', layerId: 'l1', name: 'Business' },
    { id: 'c1:l2', columnId: 'c1', layerId: 'l2', name: 'Business support' },
    { id: 'c2:l1', columnId: 'c2', layerId: 'l1', name: 'Support core' },
    { id: 'c2:l2', columnId: 'c2', layerId: 'l2', name: 'Support' },
  ],
});

test('completes missing zones for every column/layer pair', () => {
  assert.equal(completeLayoutZones(draft().columns, draft().layers, []).length, 4);
  assert.deepEqual(
    completeLayoutZones([draft().columns[0]], [draft().layers[0]], []),
    [{ id: 'c1:l1', columnId: 'c1', layerId: 'l1', name: 'Business' }],
  );
});

test('renaming a column synchronizes zones that inherited its previous name', () => {
  const renamed = renameLayoutDraftItem(draft(), 'columns', 'c1', 'Value');
  assert.equal(renamed.columns[0].name, 'Value');
  assert.equal(renamed.zones.find(zone => zone.id === 'c1:l1').name, 'Value');
  assert.equal(renamed.zones.find(zone => zone.id === 'c1:l2').name, 'Business support');
  assert.equal(renamed.zones.find(zone => zone.id === 'c2:l1').name, 'Support core');
});

test('renames an individual zone and adds/removes layout items consistently', () => {
  const renamed = renameLayoutZone(draft(), 'c2', 'l1', 'Operations');
  assert.equal(renamed.zones.find(zone => zone.id === 'c2:l1').name, 'Operations');

  const added = addLayoutDraftItem(draft(), 'columns', 'c3');
  assert.equal(added.columns.length, 3);
  assert.equal(added.zones.length, 6);
  assert.ok(added.zones.some(zone => zone.columnId === 'c3' && zone.layerId === 'l2'));

  const removed = removeLayoutDraftItem(added, 'columns', 'c1');
  assert.deepEqual(removed.columns.map(column => column.id), ['c2', 'c3']);
  assert.equal(removed.zones.length, 4);
  assert.deepEqual(removed.columns.map(column => column.order), [0, 1]);
  assert.equal(removeLayoutDraftItem({ ...draft(), columns: [draft().columns[0]] }, 'columns', 'c1').columns.length, 1);
});

test('prepares a valid layout, normalizes labels, completes zones and repairs invalid domain placements', () => {
  const source = draft();
  source.columns[0].name = ' Business ';
  source.layers[0].name = ' Core ';
  source.zones = source.zones.filter(zone => zone.id !== 'c2:l2');
  const domains = [
    { id: 'd1', layout: { columnId: 'unknown', layerId: 'l2' } },
    { id: 'd2', layout: { columnId: 'c2', layerId: 'unknown' } },
  ];
  const result = prepareLayoutForSave(source, { mode: 'matrix' }, domains);

  assert.equal(result.layout.columns[0].name, 'Business');
  assert.equal(result.layout.layers[0].name, 'Core');
  assert.equal(result.layout.zones.length, 4);
  assert.equal(result.domains[0].layout.columnId, 'c1');
  assert.equal(result.domains[0].layout.layerId, 'l2');
  assert.equal(result.domains[1].layout.columnId, 'c2');
  assert.equal(result.domains[1].layout.layerId, 'l1');
  assert.equal(prepareLayoutForSave({ ...source, zones: [{ ...source.zones[0], name: '  ' }] }, {}, []), null);
  assert.equal(prepareLayoutForSave({ ...source, columns: [] }, {}, []), null);
});

test('checks column bounds and detects overlapping domains only in the same layer', () => {
  const columns = draft().columns;
  const layers = draft().layers;
  const domains = [
    { id: 'existing', layout: { columnId: 'c1', layerId: 'l1', columnSpan: 2 } },
    { id: 'other-layer', layout: { columnId: 'c2', layerId: 'l2', columnSpan: 1 } },
  ];
  const available = args => isDomainPlacementAvailable({ domains, columns, layers, ...args });

  assert.equal(available({ domainId: 'new', columnId: 'c1', layerId: 'l1', columnSpan: 1 }), false);
  assert.equal(available({ domainId: 'new', columnId: 'c1', layerId: 'l2', columnSpan: 1 }), true);
  assert.equal(available({ domainId: 'existing', columnId: 'c1', layerId: 'l1', columnSpan: 1 }), true);
  assert.equal(available({ domainId: 'new', columnId: 'c2', layerId: 'l1', columnSpan: 2 }), false);
  assert.equal(available({ domainId: 'new', columnId: 'missing', layerId: 'l1', columnSpan: 1 }), false);
});

test('prepares domain placement patches and rejects overlapping moves', () => {
  const columns = [...draft().columns, { id: 'c3', name: 'Operations', order: 2 }];
  const layers = draft().layers;
  const layout = { mode: 'matrix', columns, layers, zones: completeLayoutZones(columns, layers, draft().zones) };
  const domains = [
    { id: 'd1', name: 'Domain 1', layout: { columnId: 'c1', layerId: 'l1', columnSpan: 1, custom: true } },
    { id: 'd2', name: 'Domain 2', layout: { columnId: 'c2', layerId: 'l1', columnSpan: 2 } },
    { id: 'd3', name: 'Domain 3', layout: { columnId: 'c1', layerId: 'l2', columnSpan: 1 } },
  ];
  const prepare = (domainId, columnId, layerId) => prepareDomainPlacement({
    domains, layout, layoutMode: 'matrix', columns, layers, domainId, columnId, layerId,
  });

  const moved = prepare('d1', 'c2', 'l2');
  assert.deepEqual(moved.layout, { ...layout, mode: 'matrix', columns, layers });
  assert.deepEqual(moved.domains[0].layout, {
    columnId: 'c2', layerId: 'l2', columnSpan: 1, custom: true,
  });
  assert.deepEqual(moved.domains.slice(1), domains.slice(1));
  assert.equal(prepare('d1', 'c2', 'l1'), null);
  assert.equal(prepare('missing-domain', 'c1', 'l1').domains.length, domains.length);
  assert.equal(prepare('', 'c1', 'l1'), null);
});

