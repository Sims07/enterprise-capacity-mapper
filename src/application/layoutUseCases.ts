/**
 * Application-facing functions for editing the layout.
 * Domain invariants and immutable transitions live in src/domain/mapLayout.ts.
 */
import { MapLayout } from '../domain/mapLayout.ts';
import type {
  DomainPlacement,
  LayoutAxis,
  LayoutDraft,
  LayoutZone,
  MapLayoutData,
} from '../domain/mapLayout.ts';

export type { LayoutAxis, LayoutDraft, LayoutZone } from '../domain/mapLayout.ts';
export type Layout = MapLayoutData;
export type Domain = DomainPlacement;

export const completeLayoutZones = (
  columns: LayoutAxis[],
  layers: LayoutAxis[],
  currentZones: LayoutZone[],
): LayoutZone[] => MapLayout.completeZones(columns, layers, currentZones);

/** Collapse only empty automatically-created grid lines, preserving business axes. */
export const collapseLayoutAfterDomainRemoval = (layout: Layout, domains: Domain[]): Layout =>
  MapLayout.collapseUnusedGeneratedLayers(layout, domains);

export const renameLayoutDraftItem = (
  draft: LayoutDraft,
  kind: 'columns' | 'layers',
  id: string,
  name: string,
): LayoutDraft => MapLayout.fromDraft(draft).renameItem(kind, id, name).toDraft();

export const renameLayoutZone = (
  draft: LayoutDraft,
  columnId: string,
  layerId: string,
  name: string,
): LayoutDraft => MapLayout.fromDraft(draft).renameZone(columnId, layerId, name).toDraft();

export const addLayoutDraftItem = (draft: LayoutDraft, kind: 'columns' | 'layers', id: string): LayoutDraft =>
  MapLayout.fromDraft(draft).addItem(kind, id).toDraft();

export const removeLayoutDraftItem = (draft: LayoutDraft, kind: 'columns' | 'layers', id: string): LayoutDraft =>
  MapLayout.fromDraft(draft).removeItem(kind, id).toDraft();

export const prepareLayoutForSave = (
  layoutDraft: LayoutDraft,
  layout: Layout,
  domains: Domain[],
): { layout: Layout; domains: Domain[] } | null =>
  MapLayout.fromDraft(layoutDraft).prepareForSave(layout, domains);

export const isDomainPlacementAvailable = ({
  domains, columns, layers, domainId, columnId, layerId, columnSpan, rowSpan, allowExactOverlap,
}: {
  domains: Domain[];
  columns: LayoutAxis[];
  layers: LayoutAxis[];
  domainId?: string;
  columnId: string;
  layerId: string;
  columnSpan: string | number;
  rowSpan?: string | number;
  allowExactOverlap?: boolean;
}): boolean => MapLayout.fromDraft({ columns, layers, zones: [] }).isPlacementAvailable({
  domains, columns, layers, domainId, columnId, layerId, columnSpan, rowSpan, allowExactOverlap,
});

/**
 * Prepares adding a N0 without editing the existing cartography until Save.
 *
 * With beforeDomainId, this is an insertion in visual reading order, not a
 * legacy matrix placement: existing N0 after the insertion move to the next
 * available cells, preserving their spans and all other domain properties.
 * Earlier N0 stay in place. Extra rows are created only when required.
 */
export const prepareNewDomainSlot = <T extends Domain>({
  layout, domains, newLayerId, beforeDomainId,
}: {
  layout: Layout;
  domains: T[];
  newLayerId: string;
  beforeDomainId?: string;
}): {
  layout: Layout;
  domains: T[];
  placement: { columnId: string; layerId: string };
  expanded: boolean;
  shiftedCount: number;
} | null => {
  const columns = layout.columns || [];
  const layers = layout.layers || [];
  if (!columns.length || !layers.length) return null;

  const available = (currentDomains: Domain[], columnId: string, layerId: string, candidateColumns = columns, candidateLayers = layers, columnSpan = 1, rowSpan = 1) =>
    isDomainPlacementAvailable({
      domains: currentDomains, columns: candidateColumns, layers: candidateLayers,
      columnId, layerId, columnSpan, rowSpan, allowExactOverlap: false,
    });

  const firstFree = columns.flatMap(column => layers.map(layer => ({
    columnId: column.id,
    layerId: layer.id,
  }))).find(candidate => available(domains, candidate.columnId, candidate.layerId));

  if (!beforeDomainId) {
    if (firstFree) return { layout, domains, placement: firstFree, expanded: false, shiftedCount: 0 };
    const draft = MapLayout.fromDraft({ columns, layers, zones: layout.zones || [] })
      .addItem('layers', newLayerId)
      .renameItem('layers', newLayerId, `Ligne ${layers.length + 1}`)
      .toDraft();
    return {
      layout: { ...layout, columns: draft.columns, layers: draft.layers, zones: draft.zones },
      domains,
      placement: { columnId: columns[0].id, layerId: newLayerId },
      expanded: true,
      shiftedCount: 0,
    };
  }

  const coordinate = (domain: Domain) => {
    const column = columns.findIndex(item => item.id === (domain.layout?.columnId || columns[0].id));
    const layer = layers.findIndex(item => item.id === (domain.layout?.layerId || layers[0].id));
    return { column, layer, offset: layer * columns.length + column };
  };
  const ordered = domains.map((domain, index) => ({ domain, index, ...coordinate(domain) }))
    .sort((a, b) => a.offset - b.offset || a.index - b.index);
  const insertionIndex = ordered.findIndex(item => item.domain.id === beforeDomainId);
  if (insertionIndex < 0) return null;
  if (ordered.some(item => item.column < 0 || item.layer < 0)) return null;

  const original = ordered[insertionIndex];
  const placed: Domain[] = ordered.slice(0, insertionIndex).map(item => item.domain);
  const repositioned = new Map<string, T>();
  let workingLayout = layout;
  let workingLayers = layers;
  let nextOffset = original.offset;
  const pendingId = `${newLayerId}:pending-n0`;
  let placement: { columnId: string; layerId: string } | null = null;
  let shiftedCount = 0;

  const toInsert = [
    { domain: { id: pendingId, layout: { columnSpan: 1, rowSpan: 1 } }, offset: original.offset, pending: true },
    ...ordered.slice(insertionIndex).map(item => ({ domain: item.domain, offset: item.offset, pending: false })),
  ];
  for (const item of toInsert) {
    const width = Number(item.domain.layout?.columnSpan ?? 1);
    const height = Number(item.domain.layout?.rowSpan ?? 1);
    if (!Number.isInteger(width) || width < 1 || width > columns.length || !Number.isInteger(height) || height < 1) return null;

    let candidateOffset = Math.max(nextOffset, item.offset);
    // Each candidate moves forward through the visual grid. An extra row is
    // appended when the next placement would exceed the existing layout.
    while (true) {
      const columnIndex = candidateOffset % columns.length;
      const layerIndex = Math.floor(candidateOffset / columns.length);
      while (workingLayers.length < layerIndex + height) {
        const layerId = `${newLayerId}-${workingLayers.length - layers.length}`;
        const draft = MapLayout.fromDraft({
          columns, layers: workingLayers, zones: workingLayout.zones || [],
        }).addItem('layers', layerId)
          .renameItem('layers', layerId, `Ligne ${workingLayers.length + 1}`)
          .toDraft();
        workingLayers = draft.layers;
        workingLayout = { ...workingLayout, columns: draft.columns, layers: draft.layers, zones: draft.zones };
      }
      const candidateColumnId = columns[columnIndex].id;
      const candidateLayerId = workingLayers[layerIndex].id;
      if (available(placed, candidateColumnId, candidateLayerId, columns, workingLayers, width, height)) {
        const newDomain = {
          ...item.domain,
          layout: { ...(item.domain.layout || {}), columnId: candidateColumnId, layerId: candidateLayerId },
        };
        placed.push(newDomain);
        if (item.pending) placement = { columnId: candidateColumnId, layerId: candidateLayerId };
        else {
          repositioned.set(item.domain.id, newDomain as T);
          if (coordinate(item.domain).offset !== candidateOffset) shiftedCount += 1;
        }
        nextOffset = candidateOffset + 1;
        break;
      }
      candidateOffset += 1;
    }
  }

  if (!placement) return null;
  return {
    layout: workingLayout,
    domains: domains.map(domain => repositioned.get(domain.id) || domain),
    placement,
    expanded: workingLayers.length > layers.length,
    shiftedCount,
  };
};

/** Returns null when a move violates layout invariants or targets an unknown domain. */
export const prepareDomainPlacement = ({
  domains, layout, columns, layers, domainId, columnId, layerId, columnSpan, rowSpan, allowExactOverlap,
}: {
  domains: Domain[];
  layout: Layout;
  columns: LayoutAxis[];
  layers: LayoutAxis[];
  domainId?: string;
  columnId?: string;
  layerId?: string;
  columnSpan?: string | number;
  rowSpan?: string | number;
  allowExactOverlap?: boolean;
}): { layout: Layout; domains: Domain[] } | null =>
  MapLayout.fromDraft({ columns, layers, zones: layout.zones || [] }).prepareDomainPlacement({
    domains, layout, columns, layers, domainId, columnId, layerId, columnSpan, rowSpan, allowExactOverlap,
  });
