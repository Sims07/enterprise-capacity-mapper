import type { CatalogModel } from '../domain/catalogModel.ts';
import { analyzeCapabilityGaps, findMissingReferenceCapabilities, type GapSignalKind } from '../domain/capabilityGaps.ts';

export type DecisionReviewItem = {
  capabilityId: string | null;
  title: string; priority: string; evidence: string; question: string;
};
export type CapabilityDecisionReview = {
  mapName: string; items: DecisionReviewItem[];
  unqualifiedCoverage: number; missingFromReference: number;
};
export const DECISION_REVIEW_DISPLAY_LIMIT = 10;

const QUESTION_BY_SIGNAL: Record<GapSignalKind, string> = {
  'missing-current': 'Quelle couverture actuelle faut-il confirmer ou mettre en place ?',
  'functional-none': 'Le besoin métier est-il hors périmètre ou nécessite-t-il une évolution ?',
  'functional-partial': 'Quelles fonctions manquent et qui peut valider le besoin ?',
  'maturity': 'Quelle trajectoire et quels jalons permettraient de réduire cet écart ?',
  'obsolete': 'Un remplacement ou un plan de maîtrise des risques est-il nécessaire ?',
};

const PRIORITY_ORDER: Record<string, number> = { P1: 0, P2: 1, P3: 2, unqualified: 3 };

/** Read-only review: questions are based on evidence, never interpreted as approved decisions. */
export function createDecisionReview(model: CatalogModel, reference?: CatalogModel | null): CapabilityDecisionReview {
  const findings = analyzeCapabilityGaps(model);
  const items: DecisionReviewItem[] = findings.flatMap(finding => finding.signals.map(signal => ({
    capabilityId: finding.id,
    title: finding.name,
    priority: finding.priority,
    evidence: signal.description,
    question: QUESTION_BY_SIGNAL[signal.kind],
  })));
  const missing = reference ? findMissingReferenceCapabilities(model, reference) : [];
  for (const capability of missing) {
    items.push({
      capabilityId: null, title: capability.name, priority: 'unqualified',
      evidence: 'Absente de la cartographie actuelle selon la référence « ' + capability.domainName + ' »',
      question: 'Cette capacité est-elle attendue dans le périmètre de la cartographie ?',
    });
  }
  items.sort((first, second) => (PRIORITY_ORDER[first.priority] ?? PRIORITY_ORDER.unqualified) - (PRIORITY_ORDER[second.priority] ?? PRIORITY_ORDER.unqualified)
    || first.title.localeCompare(second.title, 'fr'));
  const metadata = model.metadata as { name?: string } | undefined;
  return {
    mapName: metadata?.name || 'Cartographie sans nom',
    items,
    unqualifiedCoverage: findings.filter(finding => finding.needsQualification).length,
    missingFromReference: missing.length,
  };
}

export function formatDecisionReviewMarkdown(review: CapabilityDecisionReview): string {
  const lines = [
    '# Revue d’architecture — ' + review.mapName,
    '',
    '## Synthèse',
    '- ' + review.items.length + ' points à examiner (une même capacité peut générer plusieurs points).',
    '- ' + review.unqualifiedCoverage + ' capacités N1 dont la couverture fonctionnelle est non qualifiée.',
    '- ' + review.missingFromReference + ' capacités absentes selon la référence chargée.',
    '',
    '## Questions pour la revue',
  ];
  if (!review.items.length) lines.push('Aucun signal déterministe identifié ; une validation métier reste nécessaire.');
  review.items.forEach((item, index) => {
    lines.push((index + 1) + '. **' + item.title + '** — ' + item.evidence
      + ' (priorité déclarée : ' + (item.priority === 'unqualified' ? 'non qualifiée' : item.priority) + ')');
    lines.push('   - Question : ' + item.question);
  });
  lines.push('', '## Limites', '- Les faits non renseignés sont inconnus, pas présumés conformes.');
  lines.push('- Les liens applicatifs ne démontrent pas à eux seuls la couverture fonctionnelle.');
  lines.push('- Les propositions ne sont ni des décisions approuvées ni des engagements de planning.', '');
  return lines.join('\n');
}

export type RetirementScenario = {
  applicationName: string;
  touchedCapabilityIds: string[];
  lostLastCurrentSupport: Array<{ id: string; name: string }>;
  reducedCurrentSupport: Array<{ id: string; name: string }>;
  lostTargetSupport: Array<{ id: string; name: string }>;
};

/** Simulate withdrawing an application; the input model stays immutable. */
export function simulateApplicationRetirement(model: CatalogModel, applicationId: string): RetirementScenario | null {
  const application = model.applications.find(item => item.id === applicationId);
  if (!application) return null;
  const before = analyzeCapabilityGaps(model);
  const after = analyzeCapabilityGaps({ ...model, applications: model.applications.filter(item => item.id !== applicationId) });
  const byId = new Map(after.map(finding => [finding.id, finding]));
  const touched = before.filter(finding => [...finding.currentApplications, ...finding.targetApplications].includes(applicationId));
  return {
    applicationName: application.name,
    touchedCapabilityIds: touched.map(finding => finding.id),
    lostLastCurrentSupport: touched.filter(finding => finding.currentApplications.length > 0 && byId.get(finding.id)?.currentApplications.length === 0)
      .map(finding => ({ id: finding.id, name: finding.name })),
    reducedCurrentSupport: touched.filter(finding => finding.currentApplications.length > (byId.get(finding.id)?.currentApplications.length ?? 0)
      && (byId.get(finding.id)?.currentApplications.length ?? 0) > 0).map(finding => ({ id: finding.id, name: finding.name })),
    lostTargetSupport: touched.filter(finding => finding.targetApplications.length > (byId.get(finding.id)?.targetApplications.length ?? 0))
      .map(finding => ({ id: finding.id, name: finding.name })),
  };
}
