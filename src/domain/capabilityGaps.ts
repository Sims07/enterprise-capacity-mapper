import type { Application, Capability, CatalogModel, FunctionalCoverage } from './catalogModel.ts';

export type GapSignalKind = 'missing-current' | 'functional-none' | 'functional-partial' | 'maturity' | 'obsolete';
export type GapSignal = { kind: GapSignalKind; description: string };
export type CapabilityGapFinding = {
  id: string; name: string; domainId: string; priority: string;
  currentApplications: string[]; targetApplications: string[];
  functionalCoverage: FunctionalCoverage; maturityDelta: number | null;
  needsQualification: boolean; signals: GapSignal[];
};

const normalizedStatus = (app: Application): string =>
  String(app.status ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('fr');

const relatedApplications = (capability: Capability, applications: Application[]): Application[] =>
  applications.filter(app => (app.capabilityIds ?? []).includes(capability.id));

/** Diagnose explicit facts. Applications marked "Cible" do not prove coverage today. */
export function analyzeCapabilityGaps(model: CatalogModel): CapabilityGapFinding[] {
  return model.capabilities.map(capability => {
    const applications = relatedApplications(capability, model.applications);
    const current = applications.filter(app => normalizedStatus(app) !== 'cible');
    const target = applications.filter(app => normalizedStatus(app) === 'cible');
    const functionalCoverage = capability.assessment?.functionalCoverage ?? 'unknown';
    const maturity = capability.assessment;
    const maturityDelta = maturity?.currentMaturity !== undefined && maturity?.targetMaturity !== undefined
      ? Math.max(0, maturity.targetMaturity - maturity.currentMaturity)
      : null;
    const signals: GapSignal[] = [];
    if (current.length === 0) signals.push({ kind: 'missing-current', description: 'Aucune application actuelle reliée' });
    if (functionalCoverage === 'none') signals.push({ kind: 'functional-none', description: 'Couverture fonctionnelle déclarée absente' });
    if (functionalCoverage === 'partial') signals.push({ kind: 'functional-partial', description: 'Couverture fonctionnelle déclarée partielle' });
    if (maturityDelta !== null && maturityDelta > 0) signals.push({ kind: 'maturity', description: 'Écart de maturité de ' + maturityDelta + (maturityDelta === 1 ? ' niveau' : ' niveaux') });
    if (current.some(app => normalizedStatus(app) === 'obsolete')) signals.push({ kind: 'obsolete', description: 'Une application actuelle est déclarée obsolète' });
    return {
      id: capability.id, name: capability.name, domainId: capability.domainId,
      priority: capability.priority ?? 'unqualified',
      currentApplications: current.map(app => app.id),
      targetApplications: target.map(app => app.id),
      functionalCoverage, maturityDelta,
      needsQualification: functionalCoverage === 'unknown',
      signals,
    };
  });
}

export type MissingReferenceCapability = { id: string; name: string; code?: string; domainName: string };
const normalized = (value: unknown): string => String(value ?? '').normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').replace(/[^a-z0-9]+/g, ' ').trim();

const referenceKey = (capability: Capability, model: CatalogModel): string => {
  const domain = model.domains.find(item => item.id === capability.domainId);
  const domainKey = normalized(domain?.code || domain?.name);
  const capabilityKey = normalized(capability.code) || normalized(capability.name);
  return domainKey + ':' + capabilityKey;
};

/** Compares explicit codes (or exact normalized names within a domain); no fuzzy matching. */
export function findMissingReferenceCapabilities(active: CatalogModel, reference: CatalogModel): MissingReferenceCapability[] {
  const existing = new Set(active.capabilities.map(capability => referenceKey(capability, active)));
  return reference.capabilities
    .filter(capability => !existing.has(referenceKey(capability, reference)))
    .map(capability => ({
      id: capability.id, name: capability.name, code: capability.code,
      domainName: reference.domains.find(domain => domain.id === capability.domainId)?.name ?? 'Domaine inconnu',
    }));
}
