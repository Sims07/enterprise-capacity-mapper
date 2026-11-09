import type { Application, CatalogModel } from './catalogModel.ts';
import { isCurrentApplication } from './coverage.ts';

export const RISK_SCALE = [1, 2, 3, 4, 5] as const;
export const RISK_CATEGORIES = { obsolescence: 'Obsolescence', security: 'Sécurité', continuity: 'Continuité', compliance: 'Conformité', dependency: 'Dépendance fournisseur' } as const;
export const RISK_STATUSES = { open: 'À traiter', mitigating: 'En traitement', accepted: 'Accepté', resolved: 'Résolu' } as const;
export const RISK_LEVELS = { unknown: 'À qualifier', low: 'Faible', moderate: 'Modéré', high: 'Élevé', critical: 'Critique' } as const;
export type RiskLevel = keyof typeof RISK_LEVELS;
export type ApplicationRisk = {
  likelihood?: number;
  impact?: number;
  category?: keyof typeof RISK_CATEGORIES;
  status?: keyof typeof RISK_STATUSES;
  owner?: string;
  dueDate?: string;
  supportEndDate?: string;
  mitigation?: string;
  rationale?: string;
};
export const RISK_THRESHOLDS = { moderate: 5, high: 10, critical: 17 } as const;
export const SUPPORT_WARNING_DAYS = 180;
const DAY_MS = 86_400_000;
const RISK_RANK: Record<RiskLevel, number> = { unknown: 0, low: 1, moderate: 2, high: 3, critical: 4 };
const validDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

export function validateApplicationRisk(value: unknown): ApplicationRisk {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Évaluation du risque invalide.');
  const risk = value as Record<string, unknown>;
  for (const field of ['likelihood', 'impact'] as const) {
    if (risk[field] !== undefined && !RISK_SCALE.some(level => level === risk[field])) throw new Error('Probabilité et impact doivent être compris entre 1 et 5.');
  }
  if ((risk.likelihood === undefined) !== (risk.impact === undefined)) throw new Error('Renseignez ensemble la probabilité et l’impact, ou laissez les deux à qualifier.');
  if (risk.category !== undefined && (typeof risk.category !== 'string' || !Object.hasOwn(RISK_CATEGORIES, risk.category))) throw new Error('Catégorie de risque inconnue.');
  if (risk.status !== undefined && (typeof risk.status !== 'string' || !Object.hasOwn(RISK_STATUSES, risk.status))) throw new Error('Statut du risque inconnu.');
  for (const field of ['owner', 'mitigation', 'rationale'] as const) {
    if (risk[field] !== undefined && typeof risk[field] !== 'string') throw new Error('Les informations de traitement doivent être du texte.');
  }
  for (const field of ['dueDate', 'supportEndDate'] as const) {
    if (risk[field] !== undefined && !validDate(risk[field])) throw new Error('Date de risque invalide (AAAA-MM-JJ).');
  }
  if (risk.status === 'accepted' && (!String(risk.owner ?? '').trim() || !String(risk.rationale ?? '').trim() || !risk.dueDate)) {
    throw new Error('Un risque accepté nécessite un responsable, une justification et une date de réexamen.');
  }
  if (risk.status === 'resolved' && !String(risk.mitigation ?? '').trim()) throw new Error('Décrivez l’action réalisée avant de résoudre le risque.');
  return value as ApplicationRisk;
}

export function scoreRisk(score: number): RiskLevel {
  return score >= RISK_THRESHOLDS.critical ? 'critical' : score >= RISK_THRESHOLDS.high ? 'high' : score >= RISK_THRESHOLDS.moderate ? 'moderate' : 'low';
}

export function assessApplicationRisk(application: Application, asOf: string) {
  const risk = application.risk ?? {};
  const score = risk.likelihood && risk.impact ? risk.likelihood * risk.impact : null;
  const daysToSupportEnd = risk.supportEndDate ? Math.ceil((Date.parse(risk.supportEndDate) - Date.parse(asOf)) / DAY_MS) : null;
  const support = daysToSupportEnd === null ? 'unknown' : daysToSupportEnd <= 0 ? 'expired' : daysToSupportEnd <= SUPPORT_WARNING_DAYS ? 'upcoming' : 'supported';
  const declared = score === null ? 'unknown' : scoreRisk(score);
  const lifecycle: RiskLevel = support === 'expired' ? 'high' : support === 'upcoming' ? 'moderate' : 'unknown';
  const inherentLevel = RISK_RANK[declared] >= RISK_RANK[lifecycle] ? declared : lifecycle;
  const status = risk.status ?? 'open';
  const overdue = !!risk.dueDate && risk.dueDate < asOf && status !== 'resolved';
  // An expired acceptance returns to the queue; acceptance does not erase exposure.
  const actionable = status !== 'resolved' && (status !== 'accepted' || overdue);
  const level: RiskLevel = status === 'resolved' ? 'low' : inherentLevel;
  return { application, risk, score, support, daysToSupportEnd, inherentLevel, level, status, overdue, actionable,
    needsQualification: score === null, supportUnknown: support === 'unknown' };
}

export function analyzeApplicationRisks(model: CatalogModel, asOf: string) {
  const applications = model.applications.filter(isCurrentApplication).map(app => assessApplicationRisk(app, asOf))
    .sort((a, b) => Number(b.actionable) - Number(a.actionable) || RISK_RANK[b.level] - RISK_RANK[a.level]
      || Number(b.overdue) - Number(a.overdue) || a.application.name.localeCompare(b.application.name, 'fr'));
  const depth = (model.layout as { depth?: number } | undefined)?.depth === 1 ? 1 : 2;
  const targets = depth === 1 ? model.domains : model.capabilities;
  const aggregate = (ids: string[]) => {
    const linked = applications.filter(item => item.application.capabilityIds?.some(id => ids.includes(id)));
    const exposed = linked.filter(item => item.status !== 'resolved');
    const level = exposed.reduce<RiskLevel>((current, item) => RISK_RANK[item.level] > RISK_RANK[current] ? item.level : current, 'unknown');
    return { level, applications: linked, unknownCount: linked.filter(item => item.needsQualification).length };
  };
  return { applications, targets: targets.map(target => ({ ...target, ...aggregate([target.id]) })),
    domains: model.domains.map(domain => ({ ...domain, ...aggregate(depth === 1 ? [domain.id] : model.capabilities.filter(cap => cap.domainId === domain.id).map(cap => cap.id)) })),
    plannedCount: model.applications.length - applications.length };
}
