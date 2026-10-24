import type { Domain, Layout } from './catalogUseCases';

type LayoutItem = { id: string; name: string; order?: number };
type LayoutZone = { id: string; columnId: string; layerId: string; name: string };
export type LayoutDraft = { columns: LayoutItem[]; layers: LayoutItem[]; zones: LayoutZone[] };
export type LayoutModel = { mode?: string; columns: LayoutItem[]; layers: LayoutItem[]; zones?: LayoutZone[] };

export const completeLayoutZones = (columns: LayoutItem[], layers: LayoutItem[], currentZones: LayoutZone[]): LayoutZone[] =>
  columns.flatMap(column => layers.map(layer => currentZones.find(zone => zone.columnId === column.id && zone.layerId === layer.id) || { id: `${column.id}:${layer.id}`, columnId: column.id, layerId: layer.id, name: column.name }));

export const renameLayoutDraftItem = (draft: LayoutDraft, kind: 'columns' | 'layers', id: string, name: string): LayoutDraft => {
  const previous = draft[kind].find(item => item.id === id);
  const items = draft[kind].map(item => item.id === id ? { ...item, name } : item);
  const columns = kind === 'columns' ? items : draft.columns;
  const layers = kind === 'layers' ? items : draft.layers;
  const zones = kind === 'columns' && previous ? draft.zones.map(zone => zone.columnId === id && zone.name === previous.name ? { ...zone, name } : zone) : draft.zones;
  return { ...draft, [kind]: items, zones: completeLayoutZones(columns, layers, zones) };
};

export const renameLayoutZone = (draft: LayoutDraft, columnId: string, layerId: string, name: string): LayoutDraft => ({ ...draft, zones: draft.zones.map(zone => zone.columnId === columnId && zone.layerId === layerId ? { ...zone, name } : zone) });

export const addLayoutDraftItem = (draft: LayoutDraft, kind: 'columns' | 'layers', id: string): LayoutDraft => {
  const item = { id, name: kind === 'columns' ? 'Nouvelle colonne' : 'Nouveau layer', order: draft[kind].length };
  const items = [...draft[kind], item];
  const columns = kind === 'columns' ? items : draft.columns;
  const layers = kind === 'layers' ? items : draft.layers;
  return { ...draft, [kind]: items, zones: completeLayoutZones(columns, layers, draft.zones) };
};

export const removeLayoutDraftItem = (draft: LayoutDraft, kind: 'columns' | 'layers', id: string): LayoutDraft => {
  if (draft[kind].length <= 1) return draft;
  const items = draft[kind].filter(item => item.id !== id).map((item, index) => ({ ...item, order: index }));
  const columns = kind === 'columns' ? items : draft.columns;
  const layers = kind === 'layers' ? items : draft.layers;
  return { ...draft, [kind]: items, zones: completeLayoutZones(columns, layers, draft.zones) };
};

export const prepareLayoutForSave = (layoutDraft: LayoutDraft, layout: LayoutModel, domains: Domain[]) => {
  if (!layoutDraft.columns.length || !layoutDraft.layers.length || [...layoutDraft.columns, ...layoutDraft.layers, ...layoutDraft.zones].some(item => !item.name.trim())) return null;
  const columnIds = new Set(layoutDraft.columns.map(item => item.id));
  const layerIds = new Set(layoutDraft.layers.map(item => item.id));
  const columns = layoutDraft.columns.map((item, index) => ({ ...item, name: item.name.trim(), order: index }));
  const layers = layoutDraft.layers.map((item, index) => ({ ...item, name: item.name.trim(), order: index }));
  const zones = layoutDraft.zones.filter(zone => columnIds.has(zone.columnId) && layerIds.has(zone.layerId)).map(zone => ({ ...zone, name: zone.name.trim() }));
  const zoneKeys = new Set(zones.map(zone => `${zone.columnId}:${zone.layerId}`));
  columns.forEach(column => layers.forEach(layer => { if (!zoneKeys.has(`${column.id}:${layer.id}`)) zones.push({ id: `${column.id}:${layer.id}`, columnId: column.id, layerId: layer.id, name: column.name }); }));
  return { layout: { ...layout, columns, layers, zones }, domains: domains.map((domain, index) => ({ ...domain, layout: { ...(domain.layout || {}), columnId: columnIds.has(domain.layout?.columnId || '') ? domain.layout?.columnId : columns[index % columns.length].id, layerId: layerIds.has(domain.layout?.layerId || '') ? domain.layout?.layerId : layers[0].id } })) };
};

export const isDomainPlacementAvailable = ({ domains, columns, layers, domainId, columnId, layerId, columnSpan }: { domains: Domain[]; columns: LayoutItem[]; layers: LayoutItem[]; domainId: string; columnId: string; layerId: string; columnSpan: number | string }) => {
  const start = columns.findIndex(column => column.id === columnId);
  const span = Number(columnSpan) || 1;
  if (start < 0 || span < 1 || start + span > columns.length) return false;
  return !domains.some(domain => {
    if (domain.id === domainId || (domain.layout?.layerId || layers[0].id) !== layerId) return false;
    const otherStart = columns.findIndex(column => column.id === (domain.layout?.columnId || columns[0].id));
    const otherSpan = Math.max(1, Number(domain.layout?.columnSpan) || 1);
    if (otherStart < 0 || (otherStart === start && otherSpan === span)) return false;
    return start < otherStart + otherSpan && otherStart < start + span;
  });
};

export const prepareDomainPlacement = ({ domains, layout, layoutMode, columns, layers, domainId, columnId, layerId }: { domains: Domain[]; layout: LayoutModel; layoutMode?: string; columns: LayoutItem[]; layers: LayoutItem[]; domainId: string; columnId?: string; layerId?: string }) => {
  if (!domainId) return null;
  const moving = domains.find(domain => domain.id === domainId);
  const targetColumn = columnId || moving?.layout?.columnId || columns[0].id;
  const targetLayer = layerId || moving?.layout?.layerId || layers[0].id;
  if (moving && !isDomainPlacementAvailable({ domains, columns, layers, domainId, columnId: targetColumn, layerId: targetLayer, columnSpan: moving.layout?.columnSpan || 1 })) return null;
  return { layout: { ...layout, mode: layoutMode, columns, layers }, domains: domains.map(domain => domain.id === domainId ? { ...domain, layout: { ...(domain.layout || {}), columnId: targetColumn, layerId: targetLayer } } : domain) };
};
