import test from 'node:test';
import assert from 'node:assert/strict';
import type { CatalogModel } from '../domain/catalogModel.ts';
import {
  buildArchitectureReport, buildReportMapPages, paginateReport,
  reportSignal, REPORT_MAP_ROWS_PER_PAGE,
} from './architectureReport.ts';

const fixture = (): CatalogModel => ({
  layout: {
    columns: [{ id: 'left', name: 'Métier' }, { id: 'right', name: 'Support' }],
    layers: [{ id: 'top', name: 'Stratégique' }, { id: 'bottom', name: 'Opérationnelle' }],
  },
  domains: [
    { id: 'd1', name: 'Relation client', code: 'CRM', layout: { columnId: 'left', layerId: 'top', columnSpan: 2 } },
    { id: 'd2', name: 'Finance', code: 'FIN', layout: { columnId: 'right', layerId: 'bottom' } },
  ],
  capabilities: [
    { id: 'c1', name: 'Vente', code: 'C1', domainId: 'd1',
      assessment: { functionalCoverage: 'partial', currentMaturity: 2, targetMaturity: 4 } },
    { id: 'c2', name: 'Support', domainId: 'd1' },
    { id: 'c3', name: 'Facturation', domainId: 'd2',
      assessment: { functionalCoverage: 'sufficient', currentMaturity: 4, targetMaturity: 4 } },
  ],
  applications: [
    { id: 'a1', name: 'CRM actuel', status: 'Actif', capabilityIds: ['c1'],
      relationRoles: { c1: 'both' }, risk: { likelihood: 4, impact: 4, status: 'open', rationale: 'Support critique' } },
    { id: 'a2', name: 'CRM futur', status: 'Cible', capabilityIds: ['c1', 'c2'] },
    { id: 'a3', name: 'ERP', status: 'Actif', capabilityIds: ['c3'] },
  ],
  businessProcesses: [{ id: 'p1', name: 'Traiter une commande', capabilityIds: ['c1'], owner: 'Métier' }],
  metadata: { name: 'Cartographie de test' },
});

test('distinguishes planned links, current coverage and declared functional coverage', () => {
  const model = fixture();
  const report = buildArchitectureReport(model, '2026-11-13');
  assert.equal(report.modelName, 'Cartographie de test');
  assert.equal(report.modelDescription, '');
  assert.equal(report.targetCount, 3);
  assert.deepEqual(report.withoutCurrent.map(item => item.name), ['Support']);
  assert.equal(report.coverage.partial, 1);
  assert.equal(report.coverage.unknown, 1);
  assert.equal(report.withRedundancy.length, 0);
  const vente = report.targets.find(item => item.id === 'c1')!;
  assert.deepEqual(vente.currentApplications.map(app => app.name), ['CRM actuel']);
  assert.deepEqual(vente.targetApplications.map(app => app.name), ['CRM actuel', 'CRM futur']);
  assert(vente.signals.some(signal => signal.includes('maturité')));
  assert.equal(report.urgentRisks.length, 1);
  assert.equal(report.processes[0].exposedApplications.length, 1);
  assert(report.actionItems.some(item => item.category === 'Capacité' && item.action === 'À définir avec le métier'));
  assert(report.actionItems.some(item => item.category === 'Risque applicatif' && item.owner === 'À désigner'));
  assert.equal(reportSignal(vente, 'coverage').label, 'Partielle');
  assert.equal(reportSignal(vente, 'maturity').label, '2/5 → 4/5');
  assert.equal(reportSignal(vente, 'gaps').tone, 'critical');
});

test('report is read-only and never creates inferred assessments or risk decisions', () => {
  const model = fixture();
  const original = JSON.stringify(model);
  const report = buildArchitectureReport(model, '2026-11-13');
  assert.equal(JSON.stringify(model), original);
  assert.equal(report.targets.find(item => item.id === 'c2')!.currentMaturity, null);
  assert.equal(report.targets.find(item => item.id === 'c2')!.functionalCoverage, 'À évaluer');
  assert.equal(report.risks.applications.find(item => item.application.id === 'a3')!.needsQualification, true);
  assert.equal(report.linkedApplications.length, 3);
});

test('preserves N0 columns and spans while paginating dense layout bands', () => {
  const model = fixture();
  const pages = buildReportMapPages(model);
  assert.equal(pages.length, 1);
  assert.equal(pages[0].placements.find(item => item.domain.id === 'd1')!.columnSpan, 2);
  assert.equal(pages[0].placements.find(item => item.domain.id === 'd2')!.column, 1);
  model.layout = {
    ...(model.layout as Record<string, unknown>),
    layers: Array.from({ length: REPORT_MAP_ROWS_PER_PAGE + 2 }, (_, index) =>
      ({ id: 'l' + index, name: 'Ligne ' + index })),
  };
  model.domains[0].layout = { columnId: 'left', layerId: 'l0', rowSpan: REPORT_MAP_ROWS_PER_PAGE + 1 };
  model.domains[1].layout = { columnId: 'right', layerId: 'l' + REPORT_MAP_ROWS_PER_PAGE };
  const split = buildReportMapPages(model);
  assert.equal(split.length, 2);
  assert.equal(split[0].placements.find(item => item.domain.id === 'd1')!.rowSpan, REPORT_MAP_ROWS_PER_PAGE);
  assert.equal(split[1].placements.find(item => item.domain.id === 'd1')!.continued, true);
  assert.equal(split[1].placements.find(item => item.domain.id === 'd1')!.rowSpan, 1);
});

test('handles empty maps and single-level N0 reporting', () => {
  const empty: CatalogModel = { domains: [], capabilities: [], applications: [] };
  const report = buildArchitectureReport(empty, '2026-11-13');
  assert.equal(report.targetCount, 0);
  assert.equal(buildReportMapPages(empty).length, 1);
  const model = fixture();
  model.layout = { ...(model.layout as object), depth: 1 };
  model.applications = [{ id: 'a', name: 'N0 actuelle', capabilityIds: ['d1'], status: 'Actif' }];
  const single = buildArchitectureReport(model, '2026-11-13');
  assert.equal(single.depth, 1);
  assert.equal(single.targetCount, 2);
  assert.equal(single.targets.find(item => item.id === 'd1')!.currentApplications.length, 1);
  assert.equal(single.coverage.unknown, 2);
});

test('paginates detailed tables without losing or repeating inventory entries', () => {
  const values = Array.from({ length: 37 }, (_, index) => 'CAP-' + index);
  const pages = paginateReport(values);
  assert.deepEqual(pages.flat(), values);
  assert(pages.every(page => page.length > 0 && page.length <= 6));
  assert.deepEqual(paginateReport([]), [[]]);
  assert.throws(() => paginateReport(values, 0));
});
