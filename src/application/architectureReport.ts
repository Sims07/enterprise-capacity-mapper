import type { CatalogModel, Domain, Capability, Application } from '../domain/catalogModel.ts';
import { getCapabilityCoverageState } from '../domain/coverage.ts';
import { analyzeCapabilityGaps } from '../domain/capabilityGaps.ts';
import { analyzeApplicationRisks, type RiskLevel } from '../domain/applicationRisk.ts';
import { analyzeBusinessProcesses, processCapabilityTargets } from '../domain/businessProcesses.ts';
import { supportsCurrent, supportsTarget } from '../domain/applicationRelations.ts';
import { computeMosaicStackLayout } from '../domain/mosaicStackLayout.ts';

export const REPORT_READING_MODES = ['identity', 'coverage', 'maturity', 'gaps'] as const;
export type ReportReadingMode = typeof REPORT_READING_MODES[number];
export const REPORT_MAP_ROWS_PER_PAGE = 3;
export const REPORT_TABLE_ROWS_PER_PAGE = 6;
export const REPORT_DOMAIN_DETAILS_PER_PAGE = 2;

export type ReportAxis = { id: string; name: string; size?: number };
export type ReportMapPlacement = {
  domain: Domain;
  column: number;
  columnSpan: number;
  row: number;
  rowSpan: number;
  continued: boolean;
};
export type ReportMapPage = {
  label: string;
  columns: ReportAxis[];
  rowCount: number;
  placements: ReportMapPlacement[];
};
export type ReportTarget = {
  id: string; name: string; code: string; domain: string; description: string;
  currentApplications: Application[]; targetApplications: Application[];
  functionalCoverage: string; currentMaturity: number | null; targetMaturity: number | null;
  rationale: string; signals: string[]; priority: string;
};
export type ReportData = ReturnType<typeof buildArchitectureReport>;

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
const currentDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10);

/** Pure snapshot: reporting never changes persisted assessments or links. */
export function buildArchitectureReport(model: CatalogModel, asOf: string) {
  const date = currentDate(asOf);
  const depth = (model.layout as { depth?: number } | undefined)?.depth === 1 ? 1 : 2;
  const targets = processCapabilityTargets(model);
  const findings = new Map(analyzeCapabilityGaps(model).map(finding => [finding.id, finding]));
  const coverageLabels = { sufficient: 'Suffisante', partial: 'Partielle', none: 'Non couverte', unknown: 'À évaluer' } as const;
  const reportTargets: ReportTarget[] = targets.map(item => {
    const capability = item as Capability;
    const linked = model.applications.filter(app => app.capabilityIds?.includes(item.id)).sort(byName);
    const currentApplications = linked.filter(app => supportsCurrent(app, item.id));
    const targetApplications = linked.filter(app => supportsTarget(app, item.id));
    const finding = depth === 2 ? findings.get(item.id) : undefined;
    const signals = finding?.signals.map(signal => signal.description)
      ?? (currentApplications.length ? [] : ['Aucune application actuelle reliée']);
    const coverage = depth === 2 ? capability.assessment?.functionalCoverage ?? 'unknown' : 'unknown';
    return {
      id: item.id, name: item.name, code: item.code ?? '', description: item.description ?? '',
      domain: depth === 1 ? item.name : model.domains.find(domain => domain.id === capability.domainId)?.name ?? 'Domaine inconnu',
      currentApplications, targetApplications,
      functionalCoverage: coverageLabels[coverage],
      currentMaturity: depth === 2 ? capability.assessment?.currentMaturity ?? null : null,
      targetMaturity: depth === 2 ? capability.assessment?.targetMaturity ?? null : null,
      rationale: depth === 2 ? capability.assessment?.rationale ?? '' : '',
      signals, priority: depth === 2 ? capability.priority ?? 'unqualified' : 'unqualified',
    };
  }).sort((a, b) => a.domain.localeCompare(b.domain, 'fr') || a.name.localeCompare(b.name, 'fr'));

  const risks = analyzeApplicationRisks(model, date);
  const processes = analyzeBusinessProcesses(model, date);
  const withoutCurrent = reportTargets.filter(target => target.currentApplications.length === 0);
  const withRedundancy = reportTargets.filter(target => getCapabilityCoverageState(target.id, model.applications).state === 'redundant');
  const unqualified = reportTargets.filter(target => target.functionalCoverage === 'À évaluer');
  const missingMaturity = reportTargets.filter(target => target.currentMaturity === null);
  const withSignals = reportTargets.filter(target => target.signals.length > 0);
  const urgentRisks = risks.applications.filter(item => item.actionable && ['high', 'critical'].includes(item.level));
  const modelName = (model.metadata as { name?: string } | undefined)?.name || 'Cartographie sans nom';
  const modelDescription = (model.metadata as { description?: string } | undefined)?.description || '';
  const actionItems = [
    ...reportTargets.filter(target => target.signals.length || target.functionalCoverage === 'À évaluer').map(target => ({
      id: 'capability-' + target.id, subject: target.name, category: 'Capacité',
      observation: target.signals.join(' ; ') || 'Couverture fonctionnelle non évaluée',
      action: 'À définir avec le métier', owner: 'À désigner',
    })),
    ...risks.applications.filter(item => item.actionable && (['high', 'critical'].includes(item.level) || item.risk.mitigation)).map(item => ({
      id: 'risk-' + item.application.id, subject: item.application.name, category: 'Risque applicatif',
      observation: reportRiskLabel(item.level) + ' · ' + (item.risk.rationale || 'Justification à compléter'),
      action: item.risk.mitigation || 'À définir', owner: item.risk.owner || 'À désigner',
    })),
  ];

  return {
    modelName, modelDescription, date, depth,
    domainCount: model.domains.length, targetCount: targets.length, applicationCount: model.applications.length,
    processesCount: processes.length,
    targets: reportTargets, withoutCurrent, withRedundancy, unqualified, missingMaturity, withSignals,
    risks, urgentRisks, processes, actionItems,
    coverage: {
      sufficient: reportTargets.filter(item => item.functionalCoverage === 'Suffisante').length,
      partial: reportTargets.filter(item => item.functionalCoverage === 'Partielle').length,
      none: reportTargets.filter(item => item.functionalCoverage === 'Non couverte').length,
      unknown: unqualified.length,
    },
    domains: [...model.domains].sort(byName),
    applications: [...model.applications].sort(byName),
    linkedApplications: model.applications.filter(app => (app.capabilityIds ?? []).length > 0),
  };
}

/** Keeps the original business axes, N0 spans and stacked cards when printing. */
export function buildReportMapPages(model: CatalogModel): ReportMapPage[] {
  const layout = model.layout as { columns?: ReportAxis[]; layers?: ReportAxis[] } | undefined;
  const columns = layout?.columns?.length ? layout.columns : [{ id: 'default-column', name: 'Cartographie' }];
  const layers = layout?.layers?.length ? layout.layers : [{ id: 'default-layer', name: 'Capacités' }];
  const stack = computeMosaicStackLayout(model.domains, columns, layers);
  const layerStarts = stack.rowCounts.map((_, index) => stack.rowCounts.slice(0, index).reduce((sum, count) => sum + count, 0));
  const placements = model.domains.map(domain => {
    const sourceColumn = Math.max(0, columns.findIndex(column => column.id === domain.layout?.columnId));
    const sourceLayer = Math.max(0, layers.findIndex(layer => layer.id === domain.layout?.layerId));
    const columnSpan = Math.max(1, Math.min(columns.length - sourceColumn, Number(domain.layout?.columnSpan) || 1));
    const layerSpan = Math.max(1, Math.min(layers.length - sourceLayer, Number(domain.layout?.rowSpan) || 1));
    const row = layerStarts[sourceLayer] + (layerSpan === 1 ? stack.tiers[domain.id] ?? 0 : 0);
    const rowSpan = layerSpan === 1 ? 1 : stack.rowCounts.slice(sourceLayer, sourceLayer + layerSpan).reduce((sum, count) => sum + count, 0);
    return { domain, column: sourceColumn, columnSpan, row, rowSpan };
  });
  const pages: ReportMapPage[] = [];
  let startLayer = 0;
  while (startLayer < layers.length) {
    let endLayer = startLayer;
    let rows = 0;
    do {
      rows += stack.rowCounts[endLayer];
      endLayer += 1;
    } while (endLayer < layers.length && rows + stack.rowCounts[endLayer] <= REPORT_MAP_ROWS_PER_PAGE);
    const start = layerStarts[startLayer];
    const end = start + rows;
    const pagePlacements = placements.flatMap(placement => {
      const visibleStart = Math.max(start, placement.row);
      const visibleEnd = Math.min(end, placement.row + placement.rowSpan);
      return visibleEnd <= visibleStart ? [] : [{
        ...placement, row: visibleStart - start, rowSpan: visibleEnd - visibleStart,
        continued: placement.row < start,
      }];
    });
    if (pagePlacements.length) pages.push({
      label: layers.slice(startLayer, endLayer).map(layer => layer.name).join(' — '),
      columns, rowCount: rows, placements: pagePlacements,
    });
    startLayer = endLayer;
  }
  // The report must also work with maps that have no N0 yet.
  return pages.length ? pages : [{ label: 'Cartographie', columns, rowCount: 1, placements: [] }];
}

export function reportSignal(target: ReportTarget | undefined, mode: ReportReadingMode): { label: string; tone: string } {
  if (!target) return { label: 'Non évalué', tone: 'neutral' };
  if (mode === 'coverage') {
    const tone = target.functionalCoverage === 'Suffisante' ? 'good' : target.functionalCoverage === 'Non couverte' ? 'critical'
      : target.functionalCoverage === 'Partielle' ? 'warning' : 'neutral';
    return { label: target.functionalCoverage, tone };
  }
  if (mode === 'maturity') {
    const level = target.currentMaturity;
    return { label: level === null ? 'Non évaluée' : String(level) + '/5' + (target.targetMaturity !== null ? ' → ' + target.targetMaturity + '/5' : ''),
      tone: level === null ? 'neutral' : level >= 4 ? 'good' : level >= 3 ? 'warning' : 'critical' };
  }
  if (mode === 'gaps') return {
    label: target.signals.length ? String(target.signals.length) + ' signal(s)' : target.functionalCoverage === 'À évaluer' ? 'À qualifier' : 'Aucun signal détecté',
    tone: target.signals.length ? 'critical' : target.functionalCoverage === 'À évaluer' ? 'neutral' : 'good',
  };
  return { label: '', tone: 'neutral' };
}

export function reportRiskLabel(level: RiskLevel): string {
  return { unknown: 'À qualifier', low: 'Faible', moderate: 'Modéré', high: 'Élevé', critical: 'Critique' }[level];
}

export function paginateReport<T>(entries: readonly T[], pageSize = REPORT_TABLE_ROWS_PER_PAGE): T[][] {
  if (pageSize < 1) throw new Error('La taille de page doit être positive.');
  const result: T[][] = [];
  for (let index = 0; index < entries.length; index += pageSize) result.push(entries.slice(index, index + pageSize));
  return result.length ? result : [[]];
}
