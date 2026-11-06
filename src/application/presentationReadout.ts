import { MATURITY_LEVELS } from '../domain/capabilityAssessment.ts';
import type { Capability } from '../domain/catalogModel.ts';
import type { CapabilityGapFinding } from '../domain/capabilityGaps.ts';

export type PresentationReadingMode = 'identity' | 'coverage' | 'maturity' | 'gaps';
export type PresentationTone = 'covered' | 'gap' | 'high' | 'critical' | 'neutral';

export const PRESENTATION_READING_OPTIONS: ReadonlyArray<{ id: PresentationReadingMode; label: string }> = [
  { id: 'identity', label: 'Carte' },
  { id: 'coverage', label: 'Couverture' },
  { id: 'maturity', label: 'Maturité' },
  { id: 'gaps', label: 'Écarts' },
];

const MATURITY_STRONG_MIN = 4;
const MATURITY_INTERMEDIATE_MIN = 3;
const MATURITY_EMERGING_MIN = 2;

/** Contrat sémantique des couleurs affichées en comité, sans score ni preuve inventés. */
export const PRESENTATION_READING_LEGENDS: Record<PresentationReadingMode, ReadonlyArray<{ tone: PresentationTone; label: string }>> = {
  identity: [],
  coverage: [
    { tone: 'covered', label: 'Suffisante' },
    { tone: 'high', label: 'Partielle' },
    { tone: 'critical', label: 'Non couverte' },
    { tone: 'neutral', label: 'À évaluer' },
  ],
  maturity: [
    { tone: 'covered', label: `${MATURITY_STRONG_MIN}–${MATURITY_LEVELS.length}/${MATURITY_LEVELS.length}` },
    { tone: 'gap', label: `${MATURITY_INTERMEDIATE_MIN}/${MATURITY_LEVELS.length}` },
    { tone: 'high', label: `${MATURITY_EMERGING_MIN}/${MATURITY_LEVELS.length}` },
    { tone: 'critical', label: `${MATURITY_LEVELS[0]}/${MATURITY_LEVELS.length}` },
    { tone: 'neutral', label: 'Non évaluée' },
  ],
  gaps: [
    { tone: 'covered', label: 'Aucun signal détecté' },
    { tone: 'gap', label: 'Écart de maturité' },
    { tone: 'high', label: 'Partielle / obsolète' },
    { tone: 'critical', label: 'Sans support / non couverte' },
    { tone: 'neutral', label: 'Non évalué / à qualifier' },
  ],
};

/** Visual classification of known facts, never a computed business health score. */
export function presentationCapabilitySignal(
  capability: Capability,
  finding: CapabilityGapFinding | undefined,
  mode: PresentationReadingMode,
): { tone: PresentationTone; label: string } {
  if (mode === 'coverage') {
    switch (capability.assessment?.functionalCoverage ?? 'unknown') {
      case 'sufficient': return { tone: 'covered', label: 'Suffisante' };
      case 'partial': return { tone: 'high', label: 'Partielle' };
      case 'none': return { tone: 'critical', label: 'Non couverte' };
      default: return { tone: 'neutral', label: 'À évaluer' };
    }
  }
  if (mode === 'maturity') {
    const current = capability.assessment?.currentMaturity;
    if (current === undefined) return { tone: 'neutral', label: 'Non évaluée' };
    const tone: PresentationTone = current >= MATURITY_STRONG_MIN ? 'covered'
      : current >= MATURITY_INTERMEDIATE_MIN ? 'gap'
        : current >= MATURITY_EMERGING_MIN ? 'high' : 'critical';
    const target = capability.assessment?.targetMaturity;
    return { tone, label: target === undefined
      ? `${current}/${MATURITY_LEVELS.length}`
      : `${current}/${MATURITY_LEVELS.length} · cible ${target}` };
  }
  if (mode === 'gaps') {
    if (!finding) return { tone: 'neutral', label: 'Non évalué' };
    const signals = finding.signals;
    const count = signals.length;
    if (count === 0 && finding.needsQualification) return { tone: 'neutral', label: 'À qualifier' };
    if (count === 0) return { tone: 'covered', label: 'Aucun signal' };
    const kinds = new Set(signals.map(signal => signal.kind));
    const tone: PresentationTone = kinds.has('missing-current') || kinds.has('functional-none')
      ? 'critical' : kinds.has('obsolete') || kinds.has('functional-partial')
        ? 'high' : 'gap';
    return { tone, label: `${count} signal${count > 1 ? 's' : ''}` };
  }
  return { tone: 'neutral', label: '' };
}
