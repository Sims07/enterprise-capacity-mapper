/**
 * Computes display-only sub-rows for N0 that share a business layer.
 * No artificial layers or coordinates are persisted in the catalog.
 *
 * Every occupied horizontal interval receives the first free tier; cards
 * with disjoint spans can share a tier, while intersecting spans are stacked.
 * Spans across several business layers retain their original grid geometry.
 */
import type { DomainPlacement, LayoutAxis } from './mapLayout.ts';

export type MosaicStackLayout = {
  rowCounts: number[];
  tiers: Record<string, number>;
};

export const computeMosaicStackLayout = (
  domains: DomainPlacement[],
  columns: LayoutAxis[],
  layers: LayoutAxis[],
): MosaicStackLayout => {
  const occupiedTiers: Array<Array<Array<{ start: number; end: number }>>> = layers.map(() => []);
  const tiers: Record<string, number> = {};

  for (const domain of domains) {
    const columnIndex = columns.findIndex(item => item.id === (domain.layout?.columnId || columns[0]?.id));
    const layerIndex = layers.findIndex(item => item.id === (domain.layout?.layerId || layers[0]?.id));
    if (columnIndex < 0 || layerIndex < 0) continue;
    const columnSpan = Number(domain.layout?.columnSpan ?? 1);
    const rowSpan = Number(domain.layout?.rowSpan ?? 1);
    if (!Number.isInteger(columnSpan) || columnSpan < 1 || columnIndex + columnSpan > columns.length) continue;
    // The stacking rule applies only to single-layer N0. Existing multi-layer
    // spans remain anchored to the original business grid without reflow.
    if (rowSpan !== 1) {
      tiers[domain.id] = 0;
      continue;
    }

    const intervals = occupiedTiers[layerIndex];
    const start = columnIndex;
    const end = columnIndex + columnSpan;
    let tier = intervals.findIndex(occupied => occupied.every(item => end <= item.start || start >= item.end));
    if (tier < 0) {
      tier = intervals.length;
      intervals.push([]);
    }
    intervals[tier].push({ start, end });
    tiers[domain.id] = tier;
  }

  return {
    rowCounts: occupiedTiers.map(tiersForLayer => Math.max(1, tiersForLayer.length)),
    tiers,
  };
};
