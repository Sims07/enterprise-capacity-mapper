import React, { useMemo } from 'react';
import type { CatalogModel } from '../domain/catalogModel.ts';
import { RISK_CATEGORIES, RISK_STATUSES } from '../domain/applicationRisk.ts';
import {
  buildArchitectureReport, buildReportMapPages, paginateReport,
  reportRiskLabel, reportSignal, REPORT_READING_MODES,
  REPORT_DOMAIN_DETAILS_PER_PAGE, type ReportReadingMode, type ReportData,
} from '../application/architectureReport.ts';

const MODE_NAMES: Record<ReportReadingMode, string> = {
  identity: 'Cartographie des capacités', coverage: 'Couverture fonctionnelle',
  maturity: 'Maturité actuelle et cible', gaps: 'Écarts et points à examiner',
};
const empty = (value?: string | number | null): string => value === undefined || value === null || String(value).trim() === '' ? 'Non renseigné' : String(value);
const joinNames = (items: { name: string }[]) => items.length ? items.map(item => item.name).join(' · ') : 'Aucune';
const formatted = (value: string) => value.split('-').reverse().join('/');
const today = () => {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
};

function ReportPage({ title, subtitle, kind, children }: {
  title: string; subtitle?: string; kind: string; children: React.ReactNode;
}) {
  return <section className="architecture-report-page" data-report-section={kind}>
    <header className="architecture-report-page-header">
      <div><span className="architecture-report-eyebrow">ENTERPRISE CAPACITY MAPPER · RAPPORT D’ARCHITECTURE</span>
        <h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
    </header>
    <div className="architecture-report-page-body">{children}</div>
    <footer className="architecture-report-page-footer"><span>Document généré à partir de la cartographie active — données locales</span><span>Enterprise Capacity Mapper</span></footer>
  </section>;
}

function Metric({ value, label }: { value: number; label: string }) {
  return <div className="architecture-report-metric"><strong>{value}</strong><span>{label}</span></div>;
}

function ReportTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return <table className="architecture-report-table"><thead><tr>{headers.map(header => <th key={header}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table>;
}

function DomainMap({ model, data, mode, mapPage }: {
  model: CatalogModel; data: ReportData; mode: ReportReadingMode; mapPage: ReturnType<typeof buildReportMapPages>[number];
}) {
  const targets = new Map(data.targets.map(target => [target.id, target]));
  const depth = data.depth;
  const columnTemplate = mapPage.columns.map(column => 'minmax(0, ' + Math.max(0.1, Number(column.size) || 1) + 'fr)').join(' ');
  return <div className="architecture-report-map" data-testid={'report-map-' + mode}
    style={{ gridTemplateColumns: columnTemplate, gridTemplateRows: 'repeat(' + mapPage.rowCount + ', minmax(0, 1fr))' }}>
    {mapPage.placements.map(placement => {
      const domain = placement.domain;
      const domainTargets = depth === 1 ? [targets.get(domain.id)].filter((target): target is NonNullable<typeof target> => !!target)
        : data.targets.filter(target => model.capabilities.some(capability => capability.id === target.id && capability.domainId === domain.id));
      const color = /^#[0-9a-f]{6}$/i.test(domain.color ?? '') ? domain.color : ({
        indigo: '#5b46be', emerald: '#0d6e53', amber: '#a43a18', rose: '#9d2b52',
      } as Record<string, string>)[domain.color ?? ''] ?? 'var(--color-accent)';
      return <article className="architecture-report-domain" key={domain.id}
        style={{ gridColumn: (placement.column + 1) + ' / span ' + placement.columnSpan, gridRow: (placement.row + 1) + ' / span ' + placement.rowSpan }}>
        <div className="architecture-report-domain-heading" style={{ borderColor: color }}>
          <b>{domain.name}{placement.continued ? ' (suite)' : ''}</b><span>{domain.code}</span>
        </div>
        <div className="architecture-report-domain-targets">
          {domainTargets.map(target => {
            const signal = reportSignal(target, mode);
            return <div className={'architecture-report-capability tone-' + signal.tone} key={target.id}>
              <div><strong>{target.name}</strong>{mode !== 'identity' && <small>{signal.label}</small>}</div>
              {mode === 'identity' && <small>{target.currentApplications.slice(0, 2).map(application => application.name).join(' · ') || 'Sans application actuelle'}{target.currentApplications.length > 2 ? ' · +' + (target.currentApplications.length - 2) : ''}</small>}
            </div>;
          })}
          {!domainTargets.length && <span className="architecture-report-none">Aucune capacité rattachée</span>}
        </div>
      </article>;
    })}
    {mapPage.placements.length === 0 && <div className="architecture-report-none">Aucun domaine renseigné dans la cartographie.</div>}
  </div>;
}

function Report({ model, onClose }: { model: CatalogModel; onClose: () => void }) {
  const asOf = useMemo(today, []);
  const report = useMemo(() => buildArchitectureReport(model, asOf), [model, asOf]);
  const mapPages = useMemo(() => buildReportMapPages(model), [model]);
  const domainPages = paginateReport(report.domains, REPORT_DOMAIN_DETAILS_PER_PAGE);
  const capabilityPages = paginateReport(report.targets);
  const applicationPages = paginateReport(report.applications);
  const gapPages = paginateReport(report.targets.filter(target => target.signals.length || target.functionalCoverage === 'À évaluer'));
  const riskPages = paginateReport(report.risks.applications);
  const processPages = paginateReport(report.processes);
  const relationPages = paginateReport(report.targets);
  return <div className="architecture-report" data-testid="architecture-report">
    <div className="architecture-report-toolbar" role="toolbar" aria-label="Actions du rapport">
      <div><strong>Rapport d'architecture</strong><small>Prévisualisation · {report.modelName} · {formatted(report.date)}</small></div>
      <div className="architecture-report-toolbar-buttons">
        <button type="button" className="architecture-report-back" data-testid="report-close" onClick={onClose}>Retour à la cartographie</button>
        <button type="button" className="architecture-report-print" data-testid="report-print" onClick={() => window.print()}>Imprimer / Enregistrer en PDF</button>
      </div>
    </div>
    <div className="architecture-report-pages">
      <ReportPage title={report.modelName} subtitle="État des lieux et analyse des capacités d'entreprise" kind="cover">
        <div className="architecture-report-cover">
          <div className="architecture-report-cover-kicker">DOSSIER D'ARCHITECTURE D'ENTREPRISE</div>
          <h1>Cartographie, couverture, écarts et risques</h1>
          <p>Rapport complet généré le {formatted(report.date)} à partir de la cartographie active.</p>
          <div className="architecture-report-metrics">
            <Metric value={report.domainCount} label="Domaines N0" />
            <Metric value={report.targetCount} label={report.depth === 2 ? 'Capacités N1' : 'Domaines cartographiés'} />
            <Metric value={report.applicationCount} label="Applications" />
            <Metric value={report.processesCount} label="Processus métier" />
          </div>
          <p className="architecture-report-note">Le rapport restitue uniquement les données enregistrées. Une relation application–capacité ne prouve pas la couverture fonctionnelle. Les informations non qualifiées sont explicitement signalées.</p>
        </div>
      </ReportPage>

      <ReportPage title="Synthèse exécutive" subtitle="Constats factuels sur le périmètre cartographié" kind="summary">
        <div className="architecture-report-metrics">
          <Metric value={report.withoutCurrent.length} label="Capacités sans application actuelle" />
          <Metric value={report.withRedundancy.length} label="Capacités à plusieurs applications actuelles" />
          <Metric value={report.unqualified.length} label="Couvertures fonctionnelles à évaluer" />
          <Metric value={report.urgentRisks.length} label="Risques élevés ou critiques à traiter" />
        </div>
        <div className="architecture-report-two-columns">
          <section><h3>Points d'attention</h3>
            <p>{report.withoutCurrent.length} capacité(s) sans application actuelle déclarée ; une application uniquement cible n'est pas comptée comme support existant.</p>
            <p>{report.withSignals.length} capacité(s) comportent un ou plusieurs signaux d'écart ; ces signaux ne constituent pas une priorité métier calculée.</p>
            <p>{report.missingMaturity.length} capacité(s) sans niveau de maturité actuelle renseigné.</p>
          </section>
          <section><h3>Portée et méthode</h3>
            <p>Couverture applicative : rattachements actuels. Couverture fonctionnelle : évaluation métier déclarée, indépendante de ces rattachements.</p>
            <p>Risques : niveau déclaré et échéance de support, uniquement pour les applications actuelles. Processus : exposition indirecte déduite des capacités rattachées.</p>
            <p>Les données non renseignées restent « À qualifier » ; aucune décision ni recommandation attribuée à un responsable n'est inventée.</p>
          </section>
        </div>
      </ReportPage>

      {REPORT_READING_MODES.flatMap(mode => mapPages.map((mapPage, index) =>
        <ReportPage key={mode + '-' + index} title={MODE_NAMES[mode]}
          subtitle={'Vue ' + (index + 1) + '/' + mapPages.length + ' · ' + mapPage.label}
          kind={'map-' + mode}>
          <DomainMap model={model} data={report} mode={mode} mapPage={mapPage} />
          <p className="architecture-report-map-legend">{mode === 'coverage' ? 'Suffisante · Partielle · Non couverte · À évaluer (déclaratif)'
            : mode === 'maturity' ? 'Niveau actuel /5 et cible /5 lorsque renseignés'
              : mode === 'gaps' ? 'Signaux constatés, sans criticité métier déduite'
                : 'Domaines N0 et capacités N1, avec aperçu des applications actuelles'}</p>
        </ReportPage>
      ))}

      <ReportPage title="Couverture applicative et fonctionnelle" subtitle="Deux dimensions distinctes : rattachements SI et qualification métier" kind="coverage">
        <div className="architecture-report-metrics">
          <Metric value={report.targetCount - report.withoutCurrent.length} label="Avec application actuelle" />
          <Metric value={report.withoutCurrent.length} label="Sans application actuelle" />
          <Metric value={report.withRedundancy.length} label="Plusieurs applications actuelles" />
          <Metric value={report.coverage.unknown} label="Couverture à évaluer" />
        </div>
        <h3>Couverture fonctionnelle déclarée</h3>
        <div className="architecture-report-coverage">
          <Metric value={report.coverage.sufficient} label="Suffisante" />
          <Metric value={report.coverage.partial} label="Partielle" />
          <Metric value={report.coverage.none} label="Non couverte" />
          <Metric value={report.coverage.unknown} label="À évaluer" />
        </div>
        <p className="architecture-report-note">La redondance signale plusieurs applications rattachées, pas nécessairement un doublon fonctionnel. En cartographie N0 seule, la couverture métier et la maturité N1 ne sont pas évaluables et restent non renseignées.</p>
      </ReportPage>

      {gapPages.map((targets, index) => <ReportPage key={'gap-' + index} title="Écarts, maturité et qualification"
        subtitle={'Observations ' + (index + 1) + '/' + gapPages.length} kind="gaps">
        <ReportTable headers={['Capacité', 'Maturité actuelle / cible', 'Couverture métier', 'Signaux constatés']}>
          {targets.map(target => <tr key={target.id}><td><strong>{target.name}</strong><small>{target.domain}</small></td>
            <td>{target.currentMaturity === null ? 'À évaluer' : target.currentMaturity + '/5'} / {target.targetMaturity === null ? 'À définir' : target.targetMaturity + '/5'}</td>
            <td>{target.functionalCoverage}</td>
            <td>{target.signals.length ? target.signals.join(' ; ') : 'Couverture à qualifier'}</td></tr>)}
          {!targets.length && <tr><td colSpan={4}>Aucun signal relevé dans les données disponibles.</td></tr>}
        </ReportTable>
      </ReportPage>)}

      {riskPages.map((items, index) => <ReportPage key={'risk-' + index} title="Registre des risques applicatifs"
        subtitle={'Applications actuelles · ' + (index + 1) + '/' + riskPages.length} kind="risks">
        <ReportTable headers={['Application / risque', 'Niveau', 'Traitement', 'Responsable et échéance', 'Éléments et action']}>
          {items.map(item => <tr key={item.application.id}>
            <td><strong>{item.application.name}</strong><small>{item.risk.category ? RISK_CATEGORIES[item.risk.category] : 'Catégorie à qualifier'} · score : {item.score ?? 'À qualifier'}</small></td>
            <td>{reportRiskLabel(item.level)}{item.support === 'expired' ? ' · Fin de support atteinte' : item.support === 'upcoming' ? ' · Fin de support proche' : ''}</td>
            <td>{RISK_STATUSES[item.status]}</td>
            <td>{empty(item.risk.owner)}<small>Échéance : {empty(item.risk.dueDate)}</small></td>
            <td>{empty(item.risk.rationale)}<small>Action : {empty(item.risk.mitigation)}</small></td>
          </tr>)}
          {!items.length && <tr><td colSpan={5}>Aucune application actuelle évaluée.</td></tr>}
        </ReportTable>
      </ReportPage>)}

      {processPages.map((items, index) => <ReportPage key={'process-' + index} title="Processus métier et exposition indirecte"
        subtitle={'Processus documentés · ' + (index + 1) + '/' + processPages.length} kind="processes">
        <ReportTable headers={['Processus / responsable', 'Capacités rattachées', 'Applications associées', 'Points d’exposition']}>
          {items.map(item => <tr key={item.process.id}>
            <td><strong>{item.process.name}</strong><small>{empty(item.process.owner)} · {empty(item.process.description)}</small></td>
            <td>{joinNames(item.capabilities)}</td>
            <td>Actuelles : {joinNames(item.currentApplications)}<small>Cibles : {joinNames(item.plannedApplications)}</small></td>
            <td>{item.unsupportedCapabilities.length ? item.unsupportedCapabilities.length + ' sans support actuel. ' : ''}
              {item.exposedApplications.length ? item.exposedApplications.length + ' application(s) à risque élevé/critique.' : 'Aucune exposition élevée déduite.'}</td>
          </tr>)}
          {!items.length && <tr><td colSpan={4}>Aucun processus métier renseigné.</td></tr>}
        </ReportTable>
        <p className="architecture-report-note">Les associations et risques sont indirects via les capacités ; aucune utilisation directe des applications par les processus n'est déduite.</p>
      </ReportPage>)}

      {domainPages.map((domains, index) => <ReportPage key={'domain-' + index} title="Annexe A · Domaines N0"
        subtitle={'Inventaire détaillé · ' + (index + 1) + '/' + domainPages.length} kind="annex-domains">
        <div className="architecture-report-domain-details">{domains.map(domain => <section key={domain.id}>
          <h3>{domain.code} · {domain.name}</h3><p>{empty(domain.description)}</p>
          <p>Capacités N1 : {report.depth === 1 ? 'Cartographie N0' : report.targets.filter(target => model.capabilities.some(capability => capability.domainId === domain.id && capability.id === target.id)).map(target => target.name).join(' · ') || 'Aucune'}</p>
        </section>)}</div>
      </ReportPage>)}

      {capabilityPages.map((targets, index) => <ReportPage key={'capability-' + index} title={report.depth === 2 ? 'Annexe B · Capacités N1' : 'Annexe B · Capacités cartographiées N0'}
        subtitle={'Fiches exhaustives · ' + (index + 1) + '/' + capabilityPages.length} kind="annex-capabilities">
        <ReportTable headers={['Code et capacité', 'Description / domaine', 'Évaluation', 'Justification et écarts']}>
          {targets.map(target => <tr key={target.id}><td><strong>{target.code} · {target.name}</strong></td>
            <td>{empty(target.description)}<small>Domaine : {target.domain}</small></td>
            <td>Couverture : {target.functionalCoverage}<small>Maturité : {target.currentMaturity ?? 'À évaluer'} / cible {target.targetMaturity ?? 'À définir'}</small></td>
            <td>{empty(target.rationale)}<small>{target.signals.join(' ; ') || 'Aucun signal documenté'}</small></td></tr>)}
          {!targets.length && <tr><td colSpan={4}>Aucune capacité renseignée.</td></tr>}
        </ReportTable>
      </ReportPage>)}

      {applicationPages.map((applications, index) => <ReportPage key={'application-' + index} title="Annexe C · Applications"
        subtitle={'Inventaire exhaustif · ' + (index + 1) + '/' + applicationPages.length} kind="annex-applications">
        <ReportTable headers={['Code et application', 'Statut / type / éditeur', 'Description', 'Capacités reliées']}>
          {applications.map(application => <tr key={application.id}>
            <td><strong>{empty(application.code)} · {application.name}</strong></td>
            <td>{empty(application.status)}<small>{empty(application.type)} · {empty(application.vendor)}</small></td>
            <td>{empty(application.description)}</td>
            <td>{(application.capabilityIds ?? []).map(id => report.targets.find(item => item.id === id)?.name ?? model.capabilities.find(item => item.id === id)?.name ?? model.domains.find(item => item.id === id)?.name ?? id).join(' · ') || 'Aucune relation'}</td>
          </tr>)}
          {!applications.length && <tr><td colSpan={4}>Aucune application renseignée.</td></tr>}
        </ReportTable>
      </ReportPage>)}

      {relationPages.map((targets, index) => <ReportPage key={'relation-' + index} title="Annexe D · Relations et trajectoire applicative"
        subtitle={'Relations actuelles et cibles · ' + (index + 1) + '/' + relationPages.length} kind="annex-relations">
        <ReportTable headers={['Capacité', 'Applications actuelles', 'Applications cibles', 'Qualification et signaux']}>
          {targets.map(target => <tr key={target.id}><td><strong>{target.name}</strong><small>{target.domain}</small></td>
            <td>{joinNames(target.currentApplications)}</td><td>{joinNames(target.targetApplications)}</td>
            <td>{target.functionalCoverage}<small>{target.signals.join(' ; ') || 'Aucun signal documenté'}</small></td></tr>)}
          {!targets.length && <tr><td colSpan={4}>Aucune relation renseignée.</td></tr>}
        </ReportTable>
      </ReportPage>)}
    </div>
  </div>;
}

export default Report;
