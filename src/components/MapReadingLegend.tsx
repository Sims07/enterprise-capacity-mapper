import React from 'react';
import type { MapReadingMode } from '../application/capabilityMapReadout.ts';

type LegendTone = 'domain' | 'neutral' | 'none' | 'partial' | 'sufficient';
type LegendItem = { label: string; tone: LegendTone };

/** Repères de lecture ; aucune qualité métier inférée d'un nombre d'applications. */
export const MAP_READING_LEGENDS: Record<MapReadingMode, readonly LegendItem[]> = {
  applications: [
    { label: 'Bandeau N0 : identité du domaine', tone: 'domain' },
    { label: 'Nombre de supports applicatifs actuels', tone: 'neutral' },
    { label: 'Supports cibles distingués des actuels', tone: 'neutral' },
  ],
  coverage: [
    { label: 'Suffisante', tone: 'sufficient' },
    { label: 'Partielle', tone: 'partial' },
    { label: 'Non couverte', tone: 'none' },
    { label: 'À évaluer', tone: 'neutral' },
  ],
  maturity: [
    { label: 'Maturité actuelle /5 déclarée', tone: 'neutral' },
    { label: 'Cible /5 déclarée', tone: 'neutral' },
    { label: 'Non évaluée si absente', tone: 'neutral' },
  ],
  gaps: [
    { label: 'Signal à examiner', tone: 'partial' },
    { label: 'Couverture à qualifier', tone: 'neutral' },
    { label: 'Aucun signal détecté ≠ absence de risque', tone: 'sufficient' },
  ],
};

export default function MapReadingLegend({ mode }: { mode: MapReadingMode }) {
  return <div className="map-reading-legend" data-testid="map-reading-legend" data-reading={mode}
    role="note" aria-label={'Légende de lecture : ' + mode}>
    <strong className="map-reading-legend-heading">Repères de lecture</strong>
    {MAP_READING_LEGENDS[mode].map(item => (
      <span className="map-reading-legend-item" key={item.label}>
        <i className={'map-reading-legend-key is-' + item.tone} aria-hidden="true" />{item.label}
      </span>
    ))}
  </div>;
}
