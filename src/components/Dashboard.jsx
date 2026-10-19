import React, { useMemo } from 'react';

const linksFor = (app, targetId) => (app.capabilityIds || []).includes(targetId);
const coverageState = count => count === 0 ? 'gap' : count === 1 ? 'covered' : 'redundant';

export default function Dashboard({ model, depth, onExploreTarget, onLinkApp }) {
  const domains = model.domains || [];
  const capabilities = model.capabilities || [];
  const apps = model.applications || [];
  const targets = depth === 1 ? domains : capabilities;

  const stats = useMemo(() => {
    const enriched = targets.map(target => {
      const linkedApps = apps.filter(app => linksFor(app, target.id));
      return { ...target, linkedApps, coverageCount: linkedApps.length, state: coverageState(linkedApps.length) };
    });
    const covered = enriched.filter(target => target.coverageCount > 0).length;
    const gaps = enriched.filter(target => target.coverageCount === 0);
    const redundancies = enriched.filter(target => target.coverageCount > 1);
    const relationCount = enriched.reduce((sum, target) => sum + target.coverageCount, 0);
    const domainStats = domains.map(domain => {
      const domainTargets = depth === 1
        ? enriched.filter(target => target.id === domain.id)
        : enriched.filter(target => target.domainId === domain.id);
      const domainCovered = domainTargets.filter(target => target.coverageCount > 0).length;
      return {
        ...domain,
        targetCount: domainTargets.length,
        coveredCount: domainCovered,
        coverage: domainTargets.length ? Math.round(domainCovered / domainTargets.length * 100) : 0,
        gaps: domainTargets.filter(target => target.coverageCount === 0),
        redundancies: domainTargets.filter(target => target.coverageCount > 1)
      };
    });
    return {
      enriched,
      covered,
      gaps,
      redundancies,
      relationCount,
      coverage: enriched.length ? Math.round(covered / enriched.length * 100) : 0,
      domainStats,
      unlinkedApps: apps.filter(app => !(app.capabilityIds || []).length)
    };
  }, [targets, apps, domains, depth]);

  const targetLabel = depth === 1 ? 'domaines N0' : 'capacités N1';
  const targetSingular = depth === 1 ? 'domaine' : 'capacité';

  const targetButton = target => (
    <button
      type="button"
      className="dashboard-target"
      key={target.id}
      onClick={() => onExploreTarget(target.id)}
      aria-label={`Explorer ${target.name} dans Relations`}
    >
      <span className="dashboard-target-name">{target.code ? `${target.code} — ` : ''}{target.name}</span>
      <span className={`dashboard-status is-${target.state}`}>{target.state === 'gap' ? 'Gap' : target.state === 'redundant' ? 'Redondance' : 'Couvert'}</span>
      <span className="dashboard-target-apps">{target.coverageCount} application{target.coverageCount > 1 ? 's' : ''}</span>
      <span className="dashboard-target-action" aria-hidden="true">↗</span>
    </button>
  );

  return (
    <section className="dashboard" data-testid="capability-dashboard" aria-label="Dashboard de couverture">
      <div className="dashboard-kpis" aria-label="Indicateurs de couverture">
        <article className="dashboard-kpi dashboard-kpi-primary">
          <span>Couverture globale</span>
          <strong data-testid="dashboard-coverage-rate">{stats.coverage}%</strong>
          <div className="dashboard-progress" role="progressbar" aria-label="Couverture globale" aria-valuemin="0" aria-valuemax="100" aria-valuenow={stats.coverage}><span style={{ width: `${stats.coverage}%` }} /></div>
          <small>{stats.covered} sur {targets.length} {targetLabel} couverts</small>
        </article>
        <article className="dashboard-kpi">
          <span>{targetLabel.charAt(0).toUpperCase() + targetLabel.slice(1)}</span>
          <strong>{targets.length}</strong>
          <small>dans la cartographie active</small>
        </article>
        <article className="dashboard-kpi dashboard-kpi-gap">
          <span>Gaps de couverture</span>
          <strong data-testid="dashboard-gap-count">{stats.gaps.length}</strong>
          <small>{stats.gaps.length ? 'À qualifier ou à prendre en charge' : 'Aucun élément sans application'}</small>
        </article>
        <article className="dashboard-kpi dashboard-kpi-redundancy">
          <span>Redondances</span>
          <strong data-testid="dashboard-redundancy-count">{stats.redundancies.length}</strong>
          <small>{stats.redundancies.length ? 'Plusieurs applications sur un même élément' : 'Aucune couverture multiple'}</small>
        </article>
        <article className="dashboard-kpi">
          <span>Applications</span>
          <strong>{apps.length}</strong>
          <small>{stats.unlinkedApps.length} sans relation à une {targetSingular}</small>
        </article>
      </div>

      <div className="dashboard-content">
        <section className="dashboard-panel dashboard-domain-panel">
          <div className="dashboard-panel-heading">
            <div><h3>Couverture par domaine N0</h3><p>Comparez la couverture entre domaines métier.</p></div>
            <span>{stats.domainStats.length} domaines</span>
          </div>
          {stats.domainStats.length ? (
            <div className="dashboard-domain-list">
              {stats.domainStats.map(domain => (
                <article className="dashboard-domain-row" key={domain.id}>
                  <div className="dashboard-domain-label">
                    <strong>{domain.name}</strong>
                    <span>{domain.coveredCount}/{domain.targetCount} couverts</span>
                  </div>
                  <div className="dashboard-domain-progress" role="progressbar" aria-label={`Couverture ${domain.name}`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={domain.coverage}>
                    <span style={{ width: `${domain.coverage}%` }} />
                  </div>
                  <div className="dashboard-domain-meta"><b>{domain.coverage}%</b><span>{domain.gaps.length} gap{domain.gaps.length > 1 ? 's' : ''} · {domain.redundancies.length} redondance{domain.redundancies.length > 1 ? 's' : ''}</span></div>
                  {domain.gaps.length > 0 && <div className="dashboard-domain-detail"><span>À couvrir :</span> {domain.gaps.map(target => target.name).join(', ')}</div>}
                </article>
              ))}
            </div>
          ) : <p className="dashboard-empty">Aucun domaine dans cette cartographie.</p>}
        </section>

        <div className="dashboard-issues">
          <section className="dashboard-panel">
            <div className="dashboard-panel-heading">
              <div><h3>Gaps à traiter</h3><p>Éléments sans application associée.</p></div>
              <span className="dashboard-count is-gap">{stats.gaps.length}</span>
            </div>
            {stats.gaps.length ? <div className="dashboard-target-list">{stats.gaps.slice(0, 6).map(targetButton)}{stats.gaps.length > 6 && <p className="dashboard-more">+ {stats.gaps.length - 6} autres gaps</p>}</div> : <p className="dashboard-empty">La couverture est complète sur ce périmètre.</p>}
          </section>
          <section className="dashboard-panel">
            <div className="dashboard-panel-heading">
              <div><h3>Couvertures multiples</h3><p>Éléments associés à plusieurs applications.</p></div>
              <span className="dashboard-count is-redundant">{stats.redundancies.length}</span>
            </div>
            {stats.redundancies.length ? <div className="dashboard-target-list">{stats.redundancies.slice(0, 6).map(targetButton)}{stats.redundancies.length > 6 && <p className="dashboard-more">+ {stats.redundancies.length - 6} autres éléments</p>}</div> : <p className="dashboard-empty">Aucune couverture multiple détectée.</p>}
          </section>
          <section className="dashboard-panel dashboard-unlinked-apps" data-testid="dashboard-unlinked-apps">
            <div className="dashboard-panel-heading">
              <div><h3>Applications sans relation</h3><p>Applications qui ne contribuent actuellement à aucune capacité de ce modèle.</p></div>
              <span className="dashboard-count is-gap">{stats.unlinkedApps.length}</span>
            </div>
            {stats.unlinkedApps.length ? (
              <div className="dashboard-app-list">
                {stats.unlinkedApps.map(app => (
                  <div className="dashboard-app-row" key={app.id}>
                    <div className="dashboard-app-details">
                      <strong>{app.name}</strong>
                      <span>{app.code || 'Sans code'} · {app.status || 'Statut non défini'}{app.vendor ? ` · ${app.vendor}` : ''}</span>
                    </div>
                    <button type="button" className="dashboard-app-action" aria-label={`Relier ${app.name} à des ${targetSingular === 'domaine' ? 'domaines N0' : 'capacités N1'}`} onClick={() => onLinkApp?.(app)}>Relier…</button>
                  </div>
                ))}
              </div>
            ) : <p className="dashboard-empty">Toutes les applications sont reliées à au moins un élément de la cartographie.</p>}
          </section>
        </div>
      </div>

      <p className="dashboard-footnote">Les indicateurs décrivent les relations présentes dans la cartographie ; une redondance n’est pas nécessairement une anomalie. Vérifiez la criticité et le rôle des applications avant toute rationalisation.</p>
    </section>
  );
}
