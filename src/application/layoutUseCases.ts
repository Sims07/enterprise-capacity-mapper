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
 * Plans the first unoccupied N0 cell without modifying the active map.
 * When the current grid is full, a new row is staged and must be committed
 * together with the domain. Cancelling the dialog leaves the map unchanged.
 */
export const prepareNewDomainSlot = ({
  layout, domains, newLayerId,
}: {
  layout: Layout;
  domains: Domain[];
  newLayerId: string;
}): { layout: Layout; placement: { columnId: string; layerId: string }; expanded: boolean } | null => {
  const columns = layout.columns || [];
  const layers = layout.layers || [];
  if (!columns.length || !layers.length) return null;

  const placement = columns.flatMap(column => layers.map(layer => ({
    columnId: column.id,
    layerId: layer.id,
  }))).find(candidate => isDomainPlacementAvailable({
    domains, columns, layers, ...candidate,
    columnSpan: 1, rowSpan: 1, allowExactOverlap: false,
  }));
  if (placement) return { layout, placement, expanded: false };

  const draft = MapLayout.fromDraft({ columns, layers, zones: layout.zones || [] })
    .addItem('layers', newLayerId)
    .renameItem('layers', newLayerId, `Ligne ${layers.length + 1}`)
    .toDraft();
  return {
    layout: { ...layout, columns: draft.columns, layers: draft.layers, zones: draft.zones },
    placement: { columnId: columns[0].id, layerId: newLayerId },
    expanded: true,
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
