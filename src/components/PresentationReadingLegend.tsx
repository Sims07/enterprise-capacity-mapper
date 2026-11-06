import React from 'react';
import {
  PRESENTATION_READING_LEGENDS,
  PRESENTATION_READING_OPTIONS,
  type PresentationReadingMode,
} from '../application/presentationReadout.ts';

/** Vraie légende du projecteur, partagée avec Storybook et liée aux signaux métier. */
export default function PresentationReadingLegend({ mode }: { mode: PresentationReadingMode }) {
  if (mode === 'identity') return null;
  const label = PRESENTATION_READING_OPTIONS.find(option => option.id === mode)?.label ?? '';
  return <div className="presentation-reading-legend" data-testid="presentation-legend" role="note"
    data-reading={mode} aria-label={'Légende de présentation : ' + label}>
    <strong className="presentation-reading-legend-title">{label}</strong>
    {PRESENTATION_READING_LEGENDS[mode].map(item => (
      <span key={item.tone}><i data-tone={item.tone} aria-hidden="true" />{item.label}</span>
    ))}
  </div>;
}
