import React, { useMemo, useState } from 'react';

const DOMAIN_COLORS = { indigo: '#5b46be', emerald: '#0d6e53', amber: '#a43a18', rose: '#9d2b52' };
const resolveDomainColor = color => /^#[\da-f]{6}$/i.test(color || '') ? color : DOMAIN_COLORS[color] || '#3b82f6';
const linksFor = (app, targetId) => (app.capabilityIds || []).includes(targetId);
const coverageState = count => count === 0 ? 'gap' : count === 1 ? 'covered' : 'redundant';

export default function Dashboard({ model, depth, onExploreTarget, onLinkApp }) {
  const domains = model.domains || [];
  const capabilities = model.capabilities || [];
  const apps = model.applications || [];
  const targets = depth === 1 ? domains : capabilities;
  const layout = model.layout || {};
  const columns = [...(layout.columns || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const layers = [...(layout.layers || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const [statusFilter, setStatusFilter] = useState('all');
  const [domainFilter, setDomainFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const stats = useMemo(() => {
    const enriched = targets.map(target => {
      const linkedApps = apps.filter(app => linksFor(app, target.id));
      return { ...target, linkedApps, coverageCount: linkedApps.length, state: coverageState(linkedApps.length) };
    });
    const covered = enriched.filter(target => target.coverageCount > 0).length;
    const priorityOrder = { P1: 0, P2: 1, P3: 2, unqualified: 3 };
    const gaps = enriched.filter(target => target.coverageCount === 0).sort((a, b) => (priorityOrder[a.priority || 'unqualified'] ?? 3) - (priorityOrder[b.priority || 'unqualified'] ?? 3) || a.name.localeCompare(b.name, 'fr'));
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
  const enrichedById = new Map(stats.enriched.map(target => [target.id, target]));
  const capabilitiesByDomain = new Map(domains.map(domain => [domain.id, stats.enriched.filter(target => target.domainId === domain.id)]));
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase('fr');
  const matchesFilters = (target, domain) => {
    const targetDomainId = depth === 1 ? target.id : target.domainId;
    if (statusFilter !== 'all' && target.state !== statusFilter) return false;
    if (domainFilter !== 'all' && targetDomainId !== domainFilter) return false;
    if (priorityFilter !== 'all' && (target.state !== 'gap' || (target.priority || 'unqualified') !== priorityFilter)) return false;
    if (!normalizedQuery) return true;
    const searchableText = [target.name, target.code, domain?.name, domain?.code].filter(Boolean).join(' ').toLocaleLowerCase('fr');
    return searchableText.includes(normalizedQuery);
  };
  const filteredTargets = stats.enriched.filter(target => {
    const domain = depth === 1 ? target : domains.find(item => item.id === target.domainId);
    return matchesFilters(target, domain);
  });
  const hasActiveFilters = statusFilter !== 'all' || domainFilter !== 'all' || searchQuery.trim().length > 0 || priorityFilter !== 'all';
  const resetFilters = () => { setStatusFilter('all'); setDomainFilter('all'); setSearchQuery(''); setPriorityFilter('all'); };
  const focusCoverageState = state => {
    setStatusFilter(state);
    setDomainFilter('all');
    setSearchQuery('');
    setPriorityFilter('all');
    document.querySelector('[data-testid="dashboard-coverage-heatmap"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const focusDomain = domainId => {
    setDomainFilter(domainId);
    setStatusFilter('all');
    setSearchQuery('');
    setPriorityFilter('all');
    document.querySelector('[data-testid="dashboard-coverage-heatmap"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
      {target.state === 'gap' ? <span className={`dashboard-priority is-${target.priority || 'unqualified'}`}>{target.priority || 'À qualifier'}</span> : <span className="dashboard-priority-placeholder" aria-hidden="true" />}
      <span className="dashboard-target-apps">{target.coverageCount} application{target.coverageCount > 1 ? 's' : ''}</span>
      <span className="dashboard-target-action" aria-hidden="true">↗</span>
    </button>
  );

  const mapCell = (column, layer, columnIndex) => {
    const cellDomains = domains.filter(domain => {
      const domainLayout = domain.layout || {};
      return (domainLayout.columnId || columns[0]?.id) === column.id
        && (domainLayout.layerId || layers[0]?.id) === layer.id;
    });
    const coveredByPrevious = domains.some(domain => {
      const domainLayout = domain.layout || {};
      if ((domainLayout.layerId || layers[0]?.id) !== layer.id) return false;
      const start = columns.findIndex(item => item.id === (domainLayout.columnId || columns[0]?.id));
      const span = Math.max(1, Number(domainLayout.columnSpan) || 1);
      return start >= 0 && start < columnIndex && start + span > columnIndex;
    });
    if (coveredByPrevious) return null;

    const columnSpan = Math.max(1, Math.min(
      columns.length - columnIndex,
      Number(cellDomains[0]?.layout?.columnSpan) || 1
    ));

    return (
      <div
        className="dashboard-map-cell"
        key={`${layer.id}-${column.id}`}
        data-column={column.id}
        data-layer={layer.id}
        style={{ gridColumn: columnSpan > 1 ? `span ${columnSpan}` : undefined }}
      >
        {cellDomains.length ? cellDomains.map(domain => {
          const domainTargets = depth === 1
            ? [enrichedById.get(domain.id)].filter(Boolean)
            : (capabilitiesByDomain.get(domain.id) || []);
          const visibleTargets = domainTargets.filter(target => matchesFilters(target, domain));
          if (hasActiveFilters && visibleTargets.length === 0) return null;
          return (
            <article
              className="dashboard-map-domain"
              key={domain.id}
              style={{ '--dashboard-domain-color': resolveDomainColor(domain.color) }}
              data-domain-id={domain.id}
              aria-label={`Domaine ${domain.name}`}
            >
              <header className="dashboard-map-domain-header">
                <div className="dashboard-map-domain-title">
                  <strong>{domain.name}</strong>
                  <span className="dashboard-map-domain-code">{domain.code}</span>
                </div>
                <span className="dashboard-map-domain-count">{visibleTargets.length}</span>
              </header>
              <div className="dashboard-map-capabilities">
                {visibleTargets.length ? visibleTargets.map(target => (
                  <button
                    key={target.id}
                    type="button"
                    className={`dashboard-map-capability is-${target.state}`}
                    onClick={() => onExploreTarget(target.id)}
                    aria-label={`${target.name} : ${target.coverageCount} application${target.coverageCount > 1 ? 's' : ''}. Explorer dans Relations`}
                    title={`${target.name} — ${target.coverageCount} application(s)`}
                  >
                    <span className="dashboard-map-capability-name">{target.name}</span>
                    <span className="dashboard-map-capability-coverage" aria-hidden="true">
                      <b>{target.coverageCount}</b>
                      <span>{target.coverageCount === 0 ? 'Gap' : target.coverageCount === 1 ? 'Couvert' : 'Multiple'}</span>
                    </span>
                  </button>
                )) : (
                  <span className="dashboard-map-empty">{hasActiveFilters ? 'Aucun résultat avec ces filtres' : 'Aucun élément'}</span>
                )}
              </div>
            </article>
          );
        }) : <span className="dashboard-map-empty-cell" aria-hidden="true">—</span>}
      </div>
    );
  };

  const mapGroups = layers.length && columns.length
    ? layers.map(layer => ({ layer, cells: columns.map((column, index) => mapCell(column, layer, index)) }))
    : [];

  return (
    <section className="dashboard" data-testid="capability-dashboard" aria-label="Dashboard de couverture">
      <div className="dashboard-kpis" aria-label="Indicateurs de couverture">
        <article className="dashboard-kpi dashboard-kpi-primary">
          <span>Couverture globale</span>
          <strong data-testid="dashboard-coverage-rate">{stats.coverage}%</strong>
          <div className="dashboard-progress" role="progressbar" aria-label="Couverture globale" aria-valuemin="0" aria-valuemax="100" aria-valuenow={stats.coverage}><span style={{ width: `${stats.coverage}%` }} /></div>
          <small>{stats.covered} sur {targets.length} {targetLabel} couverts</small>
        </article>
        <article className="dashboard-kpi"><span>{targetLabel.charAt(0).toUpperCase() + targetLabel.slice(1)}</span><strong>{targets.length}</strong><small>dans la cartographie active</small></article>
        <article className="dashboard-kpi dashboard-kpi-gap"><span>Gaps de couverture</span><strong data-testid="dashboard-gap-count">{stats.gaps.length}</strong><small>{stats.gaps.filter(target => target.priority === 'P1').length} P1 · {stats.gaps.filter(target => target.priority === 'P2').length} P2 · {stats.gaps.filter(target => target.priority === 'P3').length} P3</small><button type="button" className="dashboard-kpi-action" data-testid="dashboard-focus-gaps" onClick={() => focusCoverageState('gap')}>Afficher les gaps <span aria-hidden="true">↗</span></button></article>
        <article className="dashboard-kpi dashboard-kpi-redundancy"><span>Redondances</span><strong data-testid="dashboard-redundancy-count">{stats.redundancies.length}</strong><small>{stats.redundancies.length ? 'Plusieurs applications sur un même élément' : 'Aucune couverture multiple'}</small><button type="button" className="dashboard-kpi-action" data-testid="dashboard-focus-redundancies" onClick={() => focusCoverageState('redundant')}>Voir les couvertures multiples <span aria-hidden="true">↗</span></button></article>
        <article className="dashboard-kpi"><span>Applications</span><strong>{apps.length}</strong><small>{stats.unlinkedApps.length} sans relation à une {targetSingular}</small></article>
      </div>

      <section className="dashboard-panel dashboard-heatmap" data-testid="dashboard-coverage-heatmap" aria-label="Heatmap de couverture">
        <div className="dashboard-panel-heading">
          <div><h3>Heatmap de couverture</h3><p>La heatmap reprend la même matrice de positionnement que la cartographie : colonnes métier en horizontal, couches en vertical et capacités dans leur domaine.</p></div>
          <span>{stats.enriched.length} éléments</span>
        </div>
        <div className="dashboard-heatmap-legend" aria-label="Légende de la couverture">
          <span><i className="is-gap" /> Sans application</span>
          <span><i className="is-covered" /> Une application</span>
          <span><i className="is-redundant" /> Plusieurs applications</span>
        </div>
        <div className="dashboard-heatmap-filters" data-testid="dashboard-heatmap-filters" role="search" aria-label="Filtres de la heatmap">
          <label className="dashboard-heatmap-filter dashboard-heatmap-search">
            <span>Rechercher une capacité</span>
            <input type="search" data-testid="dashboard-heatmap-search" aria-label="Rechercher une capacité par nom ou code" placeholder="Nom ou code…" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} />
          </label>
          <label className="dashboard-heatmap-filter">
            <span>État de couverture</span>
            <select data-testid="dashboard-heatmap-status-filter" aria-label="Filtrer par état de couverture" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              <option value="all">Tous les états</option><option value="gap">Gaps</option><option value="covered">Couvertes (1 application)</option><option value="redundant">Couvertures multiples</option>
            </select>
          </label>
          <label className="dashboard-heatmap-filter">
            <span>Priorité des gaps</span>
            <select data-testid="dashboard-heatmap-priority-filter" aria-label="Filtrer les gaps par priorité" value={priorityFilter} onChange={event => setPriorityFilter(event.target.value)}>
              <option value="all">Toutes les priorités</option><option value="unqualified">À qualifier</option><option value="P1">P1 — Critique</option><option value="P2">P2 — Élevée</option><option value="P3">P3 — Normale</option>
            </select>
          </label>
          <label className="dashboard-heatmap-filter">
            <span>Domaine N0</span>
            <select data-testid="dashboard-heatmap-domain-filter" aria-label="Filtrer par domaine N0" value={domainFilter} onChange={event => setDomainFilter(event.target.value)}>
              <option value="all">Tous les domaines</option>
              {domains.map(domain => <option key={domain.id} value={domain.id}>{domain.code ? `${domain.code} — ` : ''}{domain.name}</option>)}
            </select>
          </label>
          <div className="dashboard-heatmap-filter-summary">
            <span data-testid="dashboard-heatmap-result-count" aria-live="polite">{filteredTargets.length} / {stats.enriched.length} éléments</span>
            {hasActiveFilters && <button type="button" className="dashboard-filter-reset" data-testid="dashboard-heatmap-reset" onClick={resetFilters}>Réinitialiser</button>}
          </div>
        </div>
        {mapGroups.length ? (
          <div className="dashboard-map" data-testid="dashboard-map-layout" style={{ '--dashboard-map-columns': columns.length }}>
            <div className="dashboard-map-column-headings" aria-hidden="true">
              {columns.map(column => <span key={column.id}>{column.name}</span>)}
            </div>
            {mapGroups.map(({ layer, cells }) => (
              <div className="dashboard-map-row" key={layer.id} data-layer={layer.id}>
                <div className="dashboard-map-layer-label">{layer.name}</div>
                <div className="dashboard-map-grid">{cells}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="dashboard-empty">La cartographie active ne possède pas encore de matrice de positionnement.</p>
        )}
        {hasActiveFilters && (
          <section className="dashboard-filter-results" data-testid="dashboard-filter-results" aria-label="Résultats des filtres">
            <div className="dashboard-panel-heading"><div><h3>Résultats filtrés</h3><p>Chaque résultat ouvre directement l’élément dans Relations.</p></div><span>{filteredTargets.length} résultat{filteredTargets.length > 1 ? 's' : ''}</span></div>
            {filteredTargets.length ? <div className="dashboard-target-list">{filteredTargets.map(targetButton)}</div> : <p className="dashboard-empty">Aucun élément ne correspond à ces critères. Essayez d’élargir les filtres.</p>}
          </section>
        )}
      </section>

      <div className="dashboard-content">
        <section className="dashboard-panel dashboard-domain-panel">
          <div className="dashboard-panel-heading"><div><h3>Couverture par domaine N0</h3><p>Comparez la couverture entre domaines métier.</p></div><span>{stats.domainStats.length} domaines</span></div>
          {stats.domainStats.length ? (
            <div className="dashboard-domain-list">
              {stats.domainStats.map(domain => (
                <article className="dashboard-domain-row" key={domain.id}>
                  <div className="dashboard-domain-label"><strong>{domain.name}</strong><span>{domain.coveredCount}/{domain.targetCount} couverts</span></div>
                  <div className="dashboard-domain-progress" role="progressbar" aria-label={`Couverture ${domain.name}`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={domain.coverage}><span style={{ width: `${domain.coverage}%` }} /></div>
                  <div className="dashboard-domain-meta"><b>{domain.coverage}%</b><span>{domain.gaps.length} gap{domain.gaps.length > 1 ? 's' : ''} · {domain.redundancies.length} redondance{domain.redundancies.length > 1 ? 's' : ''}</span></div>
                  {domain.gaps.length > 0 && <div className="dashboard-domain-detail"><span>À couvrir :</span> {domain.gaps.map(target => target.name).join(', ')}</div>}
                  <button type="button" className="dashboard-domain-filter-action" data-testid={`dashboard-domain-drilldown-${domain.id}`} onClick={() => focusDomain(domain.id)}>Explorer ce domaine dans la heatmap <span aria-hidden="true">↗</span></button>
                </article>
              ))}
            </div>
          ) : <p className="dashboard-empty">Aucun domaine dans cette cartographie.</p>}
        </section>

        <div className="dashboard-issues">
          <section className="dashboard-panel"><div className="dashboard-panel-heading"><div><h3>Gaps à traiter</h3><p>Éléments sans application associée.</p></div><span className="dashboard-count is-gap">{stats.gaps.length}</span></div>{stats.gaps.length ? <div className="dashboard-target-list">{stats.gaps.slice(0, 6).map(targetButton)}{stats.gaps.length > 6 && <p className="dashboard-more">+ {stats.gaps.length - 6} autres gaps</p>}</div> : <p className="dashboard-empty">La couverture est complète sur ce périmètre.</p>}</section>
          <section className="dashboard-panel"><div className="dashboard-panel-heading"><div><h3>Couvertures multiples</h3><p>Éléments associés à plusieurs applications.</p></div><span className="dashboard-count is-redundant">{stats.redundancies.length}</span></div>{stats.redundancies.length ? <div className="dashboard-target-list">{stats.redundancies.slice(0, 6).map(targetButton)}{stats.redundancies.length > 6 && <p className="dashboard-more">+ {stats.redundancies.length - 6} autres éléments</p>}</div> : <p className="dashboard-empty">Aucune couverture multiple détectée.</p>}</section>
          <section className="dashboard-panel dashboard-unlinked-apps" data-testid="dashboard-unlinked-apps"><div className="dashboard-panel-heading"><div><h3>Applications sans relation</h3><p>Applications qui ne contribuent actuellement à aucune capacité de ce modèle.</p></div><span className="dashboard-count is-gap">{stats.unlinkedApps.length}</span></div>{stats.unlinkedApps.length ? <div className="dashboard-app-list">{stats.unlinkedApps.map(app => <div className="dashboard-app-row" key={app.id}><div className="dashboard-app-details"><strong>{app.name}</strong><span>{app.code || 'Sans code'} · {app.status || 'Statut non défini'}{app.vendor ? ` · ${app.vendor}` : ''}</span></div><button type="button" className="dashboard-app-action" aria-label={`Relier ${app.name} à des ${targetSingular === 'domaine' ? 'domaines N0' : 'capacités N1'}`} onClick={() => onLinkApp?.(app)}>Relier…</button></div>)}</div> : <p className="dashboard-empty">Toutes les applications sont reliées à au moins un élément de la cartographie.</p>}</section>
        </div>
      </div>

      <p className="dashboard-footnote">Les indicateurs décrivent les relations présentes dans la cartographie ; une redondance n’est pas nécessairement une anomalie. Vérifiez la criticité et le rôle des applications avant toute rationalisation.</p>
    </section>
  );
}
