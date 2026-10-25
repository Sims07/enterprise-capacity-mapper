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
  domains, columns, layers, domainId, columnId, layerId, columnSpan,
}: {
  domains: Domain[];
  columns: LayoutAxis[];
  layers: LayoutAxis[];
  domainId?: string;
  columnId: string;
  layerId: string;
  columnSpan: string | number;
}): boolean => MapLayout.fromDraft({ columns, layers, zones: [] }).isPlacementAvailable({
  domains, columns, layers, domainId, columnId, layerId, columnSpan,
});

/** Returns null when a move violates layout invariants or targets an unknown domain. */
export const prepareDomainPlacement = ({
  domains, layout, layoutMode, columns, layers, domainId, columnId, layerId,
}: {
  domains: Domain[];
  layout: Layout;
  layoutMode: string;
  columns: LayoutAxis[];
  layers: LayoutAxis[];
  domainId?: string;
  columnId?: string;
  layerId?: string;
}): { layout: Layout; domains: Domain[] } | null =>
  MapLayout.fromDraft({ columns, layers, zones: layout.zones || [] }).prepareDomainPlacement({
    domains, layout, layoutMode, columns, layers, domainId, columnId, layerId,
  });
