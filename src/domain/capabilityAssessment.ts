import type { CapabilityAssessment, FunctionalCoverage } from './catalogModel.ts';

/** Shared scale used by input controls, validation and future gap analysis. */
export const MATURITY_LEVELS = [1, 2, 3, 4, 5] as const;
export const FUNCTIONAL_COVERAGE_STATES = ['unknown', 'none', 'partial', 'sufficient'] as const;

/** Validate declared assessments at domain/persistence boundaries. */
export function validateCapabilityAssessment(value: unknown): CapabilityAssessment {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Évaluation de capacité invalide.');
  }
  const assessment = value as Record<string, unknown>;
  if (assessment.functionalCoverage !== undefined
    && !FUNCTIONAL_COVERAGE_STATES.includes(assessment.functionalCoverage as FunctionalCoverage)) {
    throw new Error('État de couverture fonctionnelle non reconnu.');
  }
  for (const field of ['currentMaturity', 'targetMaturity'] as const) {
    if (assessment[field] !== undefined && !MATURITY_LEVELS.some(level => level === assessment[field])) {
      throw new Error('Niveau de maturité invalide (échelle de 1 à 5).');
    }
  }
  if (assessment.rationale !== undefined && typeof assessment.rationale !== 'string') {
    throw new Error('La justification de l’évaluation doit être un texte.');
  }
  return value as CapabilityAssessment;
}
