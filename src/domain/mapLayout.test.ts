import test from 'node:test';
import assert from 'node:assert/strict';
import { MapLayout } from './mapLayout.ts';

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

test('MapLayout applies immutable transitions and keeps inherited zone names synchronized', () => {
  const original = MapLayout.fromDraft(draft());
  const renamed = original.renameItem('columns', 'c1', 'Value');
  assert.equal(renamed.toDraft().columns[0].name, 'Value');
  assert.equal(renamed.toDraft().zones.find(zone => zone.id === 'c1:l1')?.name, 'Value');
  assert.equal(renamed.toDraft().zones.find(zone => zone.id === 'c1:l2')?.name, 'Business support');
  assert.equal(original.toDraft().columns[0].name, 'Business');

  const added = renamed.addItem('columns', 'c3');
  assert.equal(added.toDraft().zones.length, 6);
  assert.throws(() => added.addItem('columns', 'c3'), /unique/);
  const removed = added.removeItem('columns', 'c1');
  assert.deepEqual(removed.toDraft().columns.map(column => column.order), [0, 1]);
  assert.equal(removed.toDraft().zones.length, 4);
});

test('MapLayout prepares only complete named layouts and repairs invalid placements', () => {
  const source = draft();
  source.columns[0].name = ' Business ';
  source.layers[0].name = ' Core ';
  source.zones = source.zones.filter(zone => zone.id !== 'c2:l2');
  const domains = [
    { id: 'd1', layout: { columnId: 'unknown', layerId: 'l2' } },
    { id: 'd2', layout: { columnId: 'c2', layerId: 'unknown' } },
  ];
  const result = MapLayout.fromDraft(source).prepareForSave({ mode: 'matrix' }, domains);
  assert.equal(result?.layout.columns?.[0].name, 'Business');
  assert.equal(result?.layout.layers?.[0].name, 'Core');
  assert.equal(result?.layout.zones?.length, 4);
  assert.equal(result?.domains[0].layout?.columnId, 'c1');
  assert.equal(result?.domains[0].layout?.layerId, 'l2');
  assert.equal(result?.domains[1].layout?.columnId, 'c2');
  assert.equal(result?.domains[1].layout?.layerId, 'l1');
  assert.equal(MapLayout.fromDraft({ ...source, zones: [{ ...source.zones[0], name: '  ' }] }).prepareForSave({}, []), null);
  assert.equal(MapLayout.fromDraft({ ...source, columns: [] }).prepareForSave({}, []), null);
  assert.equal(MapLayout.fromDraft({ ...source, columns: [source.columns[0], { ...source.columns[0] }] }).prepareForSave({}, []), null);
  assert.equal(MapLayout.fromDraft({ ...source, zones: [source.zones[0], { ...source.zones[0], name: 'Duplicate zone' }] }).prepareForSave({}, []), null);
  assert.equal(MapLayout.fromDraft({ ...source, zones: [source.zones[0], { ...source.zones[1], id: source.zones[0].id }] }).prepareForSave({}, []), null);
});

test('MapLayout rejects overlaps, invalid spans and moves of unknown domains', () => {
  const columns = draft().columns;
  const layers = draft().layers;
  const layout = { mode: 'matrix', columns, layers, zones: draft().zones };
  const domains = [
    { id: 'd1', name: 'Domain 1', layout: { columnId: 'c1', layerId: 'l1', columnSpan: 1 } },
    { id: 'd2', name: 'Domain 2', layout: { columnId: 'c2', layerId: 'l1', columnSpan: 1 } },
  ];
  const mapLayout = MapLayout.fromDraft(draft());
  const available = (columnId, layerId, columnSpan, domainId = 'new') => mapLayout.isPlacementAvailable({
    domains, columns, layers, domainId, columnId, layerId, columnSpan,
  });
  assert.equal(available('c1', 'l1', 1), true);
  assert.equal(available('c1', 'l2', 1), true);
  assert.equal(available('c2', 'l1', 1), true);
  assert.equal(available('c1', 'l1', 1.5), false);
  assert.equal(available('c1', 'l1', 0), false);
  assert.equal(available('missing', 'l1', 1), false);
  assert.equal(mapLayout.isPlacementAvailable({
    domains: [{ id: 'span', layout: { columnId: 'c1', layerId: 'l1', columnSpan: 2 } }],
    columns, layers, domainId: 'new', columnId: 'c2', layerId: 'l1', columnSpan: 1,
  }), false);

  assert.equal(mapLayout.prepareDomainPlacement({
    domains, layout, layoutMode: 'matrix', columns, layers, domainId: 'missing', columnId: 'c1', layerId: 'l2',
  }), null);
  assert.notEqual(mapLayout.prepareDomainPlacement({
    domains, layout, layoutMode: 'matrix', columns, layers, domainId: 'd1', columnId: 'c2', layerId: 'l1',
  }), null);
  assert.equal(mapLayout.prepareDomainPlacement({
    domains: [
      { id: 'd1', name: 'Domain 1', layout: { columnId: 'c1', layerId: 'l1', columnSpan: 1 } },
      { id: 'd2', name: 'Domain 2', layout: { columnId: 'c1', layerId: 'l1', columnSpan: 2 } },
    ], layout, layoutMode: 'matrix', columns, layers, domainId: 'd1', columnId: 'c2', layerId: 'l1',
  }), null);
});

test('MapLayout deeply isolates nested DTO values from its input and snapshots', () => {
  const source = draft() as any;
  source.columns[0].metadata = { owner: { team: 'Architecture' } };
  const layout = MapLayout.fromDraft(source);
  (source.columns[0].metadata as any).owner.team = 'changed input';
  assert.equal((layout.toDraft().columns[0].metadata as any).owner.team, 'Architecture');
  const snapshot = layout.toDraft();
  (snapshot.columns[0].metadata as any).owner.team = 'changed snapshot';
  assert.equal((layout.toDraft().columns[0] as any).metadata.owner.team, 'Architecture');
});


test('MapLayout validates two-dimensional spans and detects rectangle intersections', () => {
  const columns = [...draft().columns, { id: 'c3', name: 'Operations', order: 2 }];
  const layers = [...draft().layers, { id: 'l3', name: 'Strategic', order: 2 }];
  const mapLayout = MapLayout.fromDraft(draft());
  const domains = [
    { id: 'existing', layout: { columnId: 'c1', layerId: 'l1', columnSpan: 2, rowSpan: 2 } },
  ];
  const available = (columnId: string, layerId: string, columnSpan = 1, rowSpan = 1, allowExactOverlap = true) =>
    mapLayout.isPlacementAvailable({ domains, columns, layers, columnId, layerId, columnSpan, rowSpan, allowExactOverlap });

  assert.equal(available('c2', 'l2'), false, 'a rectangle intersection on both axes is rejected');
  assert.equal(available('c2', 'l1'), false, 'horizontal intersection is rejected');
  assert.equal(available('c1', 'l2'), false, 'vertical intersection is rejected');
  assert.equal(available('c3', 'l3'), true, 'a disjoint rectangle remains available');
  assert.equal(available('c1', 'l1', 2, 2), true, 'legacy exact placements remain compatible by default');
  assert.equal(available('c1', 'l1', 2, 2, false), false, 'strict mosaic placement rejects identical rectangles');
  assert.equal(available('c2', 'l2', 2, 1), false, 'a span extending beyond the grid is rejected');
  assert.equal(available('c3', 'l3', 1, 0), false, 'zero row spans are rejected');
});

test('MapLayout validates axis proportions and domain spans before saving', () => {
  const source = draft() as ReturnType<typeof draft> & { columns: Array<{ id: string; name: string; order: number; size?: number }> };
  source.columns[0].size = 1.5;
  const domains = [{ id: 'd1', layout: { columnId: 'c1', layerId: 'l1', columnSpan: 2, rowSpan: 2 } }];
  const saved = MapLayout.fromDraft(source).prepareForSave({ mode: 'mosaic' }, domains);
  assert.equal(saved?.layout.columns?.[0].size, 1.5);
  assert.equal(saved?.domains[0].layout?.rowSpan, 2);
  assert.equal(MapLayout.fromDraft({ ...source, columns: [{ ...source.columns[0], size: 0 }, source.columns[1]] }).prepareForSave({}, domains), null);
  assert.equal(MapLayout.fromDraft(source).prepareForSave({}, [{ id: 'd1', layout: { columnId: 'c2', layerId: 'l1', columnSpan: 2 } }]), null);
  assert.equal(MapLayout.fromDraft(source).prepareForSave({}, [{ id: 'd1', layout: { columnId: 'c1', layerId: 'l2', rowSpan: 2 } }]), null);
  assert.equal(MapLayout.fromDraft(source).prepareForSave({}, [{ id: 'd1', layout: { columnId: 'c1', layerId: 'l1', rowSpan: 1.5 } }]), null);
});

test('MapLayout can resize a domain while preserving its other layout metadata', () => {
  const columns = [...draft().columns, { id: 'c3', name: 'Operations', order: 2 }];
  const layers = [...draft().layers, { id: 'l3', name: 'Strategic', order: 2 }];
  const domains = [
    { id: 'd1', layout: { columnId: 'c1', layerId: 'l1', custom: 'preserved' } },
    { id: 'd2', layout: { columnId: 'c3', layerId: 'l3' } },
  ];
  const resized = MapLayout.fromDraft(draft()).prepareDomainPlacement({
    domains, layout: {}, layoutMode: 'mosaic', columns, layers, domainId: 'd1',
    columnSpan: 2, rowSpan: 2, allowExactOverlap: false,
  });
  assert.deepEqual(resized?.domains[0].layout, {
    columnId: 'c1', layerId: 'l1', custom: 'preserved', columnSpan: 2, rowSpan: 2,
  });
  assert.equal(MapLayout.fromDraft(draft()).prepareDomainPlacement({
    domains, layout: {}, layoutMode: 'mosaic', columns, layers, domainId: 'd1',
    columnSpan: 3, rowSpan: 2, allowExactOverlap: false,
  }), null);
});
