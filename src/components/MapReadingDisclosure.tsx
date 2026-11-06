import React from 'react';
import type { MapDensity } from '../adapters/browser/appPreferences.ts';
import type { MapReadingMode } from '../application/capabilityMapReadout.ts';
import MapReadingLegend from './MapReadingLegend.tsx';

type MapReadingDisclosureProps = {
  mode: MapReadingMode;
  density: MapDensity;
  onDensityChange: (density: MapDensity) => void;
};

/**
 * Le contrôle d'affichage n'occupe qu'une place dans la barre principale.
 * Le panneau natif <details> reste utilisable au clavier, au toucher et hors ligne.
 */
export default function MapReadingDisclosure({ mode, density, onDensityChange }: MapReadingDisclosureProps) {
  return <details className="map-reading-disclosure" data-testid="map-reading-disclosure"
    onKeyDown={event => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.open = false;
      event.currentTarget.querySelector('summary')?.focus();
    }}>
    <summary aria-label="Afficher les options d’affichage et la légende">Affichage <span aria-hidden="true">⌄</span></summary>
    <div className="map-reading-disclosure-panel" role="group" aria-label="Options d’affichage de la cartographie">
      <label className="map-density-control">Densité
        <select data-testid="map-density" value={density} onChange={event => {
          onDensityChange(event.target.value === 'compact' ? 'compact' : 'comfortable');
        }}>
          <option value="comfortable">Confortable</option>
          <option value="compact">Compacte</option>
        </select>
      </label>
      <MapReadingLegend mode={mode} />
    </div>
  </details>;
}
