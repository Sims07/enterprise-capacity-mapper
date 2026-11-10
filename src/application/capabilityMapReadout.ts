import type { Capability, CapabilityAssessment } from '../domain/catalogModel.ts';
import type { CoverageState } from '../domain/coverage.ts';
import type { CapabilityGapFinding } from '../domain/capabilityGaps.ts';
import { MATURITY_LEVELS } from '../domain/capabilityAssessment.ts';

export type MapReadingMode = 'applications' | 'coverage' | 'maturity' | 'gaps';
export const MAP_READING_MODES: ReadonlyArray<{ id: MapReadingMode; label: string; help: string }> = [
  { id: 'applications', label: 'Applications', help: 'Voir les applications rattachées aux capacités' },
  { id: 'coverage', label: 'Couverture', help: 'Distinguer les liens SI et la couverture métier évaluée' },
  { id: 'maturity', label: 'Maturité', help: 'Comparer la maturité actuelle et la cible renseignées' },
  { id: 'gaps', label: 'Écarts', help: 'Identifier les éléments qui nécessitent une revue' },
];

const COVERAGE_LABELS = {
  unknown: 'À évaluer',
  none: 'Non couverte',
  partial: 'Partielle',
  sufficient: 'Suffisante',
} as const;

/** Read-only presentation of explicit facts; no maturity or functional coverage is inferred. */
export function capabilityMapReadout(
  capability: Capability,
  coverage: CoverageState,
  finding: CapabilityGapFinding | undefined,
) {
  const assessment: CapabilityAssessment = capability.assessment ?? {};
  const functionalCoverage = assessment.functionalCoverage ?? 'unknown';
  const currentMaturity = assessment.currentMaturity;
  const targetMaturity = assessment.targetMaturity;
  return {
    functionalCoverage,
    functionalLabel: COVERAGE_LABELS[functionalCoverage],
    applicationLabel: coverage.currentCount === 0
      ? 'Aucune application actuelle'
      : `${coverage.currentCount} application(s) actuelle(s)`,
    targetApplicationLabel: coverage.targetCount
      ? `${coverage.targetCount} application(s) cible(s)`
      : 'Aucune application cible',
    currentMaturityLabel: currentMaturity === undefined ? 'Non évaluée' : `${currentMaturity}/${MATURITY_LEVELS.length}`,
    targetMaturityLabel: targetMaturity === undefined ? 'Non définie' : `${targetMaturity}/${MATURITY_LEVELS.length}`,
    maturityGapLabel: currentMaturity === undefined || targetMaturity === undefined
      ? 'Écart non calculable'
      : targetMaturity > currentMaturity
        ? `+${targetMaturity - currentMaturity} ${(targetMaturity - currentMaturity) === 1 ? 'niveau' : 'niveaux'} à atteindre`
        : 'Cible atteinte ou dépassée',
    signals: finding?.signals ?? [],
    needsQualification: functionalCoverage === 'unknown',
  };
}
