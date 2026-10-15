import React, { useEffect, useRef, useState } from 'react';

const statusClass = status => 'badge ' + String(status || '').toLowerCase().replace('é', 'e');

const coverageOf = count => count === 0
  ? { state: 'gap', symbol: '✕', label: 'Gap' }
  : count === 1
    ? { state: 'ok', symbol: '✓', label: 'Couvert' }
    : { state: 'redundant', symbol: '⇄', label: 'Redondance' };

const dropOver = e => { e.preventDefault(); e.currentTarget.classList.add('drop-over'); };
const dropOut = e => { if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.classList.remove('drop-over'); };

/**
 * Vue arborescente Domaine N0 → Capacité N1 → Applications.
 * Chaque ligne cible (N1, ou N0 en profondeur 1) est une zone de dépôt pleine largeur.
 * Le composant ne modifie jamais le modèle lui-même : il délègue à App.jsx via onAssign / onUnassign / onLinkPicked / onOpenLink.
 */
export default function CoverageTree({ domains, capabilities, apps, depth, colorOf, pickedCount, onAssign, onUnassign, onLinkPicked, onOpenLink }) {
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [query, setQuery] = useState('');
  const [coverage, setCoverage] = useState('all');
  const hoverTimer = useRef(null);
  const q = query.trim().toLowerCase();
  const filtering = Boolean(q) || coverage !== 'all';

  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  const appsFor = id => apps.filter(a => (a.capabilityIds || []).includes(id));
  const matchesCoverage = id => {
    const n = appsFor(id).length;
    return coverage === 'all' || (coverage === 'gap' && n === 0) || (coverage === 'redundant' && n > 1);
  };
  const matchesText = item => !q
    || `${item.code || ''} ${item.name} ${item.description || ''}`.toLowerCase().includes(q)
    || appsFor(item.id).some(a => a.name.toLowerCase().includes(q));

  const targets = depth === 1 ? domains : capabilities;
  const gapCount = targets.filter(t => appsFor(t.id).length === 0).length;
  const redundantCount = targets.filter(t => appsFor(t.id).length > 1).length;

  const rows = domains.map(d => {
    if (depth === 1) return { d, caps: [], visible: matchesText(d) && matchesCoverage(d.id) };
    const caps = capabilities.filter(c => c.domainId === d.id);
    const shown = caps.filter(c => matchesCoverage(c.id) && (matchesText(d) || matchesText(c)));
    return { d, caps: shown, visible: filtering ? shown.length > 0 : true };
  }).filter(r => r.visible);

  const setOpen = (id, open) => setCollapsed(prev => {
    const next = new Set(prev);
    if (open) next.delete(id); else next.add(id);
    return next;
  });
  const toggle = id => setOpen(id, collapsed.has(id));
  const expandable = [...domains.map(d => d.id), ...(depth === 2 ? capabilities.map(c => c.id) : [])];
  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => setCollapsed(new Set(expandable));
  const reset = () => { setQuery(''); setCoverage('all'); };

  // Pendant un glisser-déposer, un domaine replié s'ouvre après un court survol.
  const hoverExpand = id => {
    if (!collapsed.has(id)) return;
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpen(id, true), 500);
  };
  const hoverCancel = () => clearTimeout(hoverTimer.current);

  const handleDrop = (e, id) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drop-over');
    hoverCancel();
    const appId = e.dataTransfer.getData('app');
    if (appId) onAssign(appId, id);
  };

  const onKeyDown = e => {
    const current = e.target.closest?.('[data-tree-focus]');
    if (!current) return;
    const items = [...e.currentTarget.querySelectorAll('[data-tree-focus]')];
    const i = items.indexOf(current);
    const id = current.dataset.expand;
    if (e.key === 'ArrowDown') items[Math.min(i + 1, items.length - 1)]?.focus();
    else if (e.key === 'ArrowUp') items[Math.max(i - 1, 0)]?.focus();
    else if (e.key === 'Home') items[0]?.focus();
    else if (e.key === 'End') items[items.length - 1]?.focus();
    else if (e.key === 'ArrowRight' && id) { if (collapsed.has(id)) setOpen(id, true); else items[i + 1]?.focus(); }
    else if (e.key === 'ArrowLeft' && id) setOpen(id, false);
    else return;
    e.preventDefault();
  };

  const AppChild = ({ app, target }) => (
    <div className="tree-app" role="treeitem" aria-level={depth === 1 ? 2 : 3} draggable onDragStart={e => e.dataTransfer.setData('app', app.id)}>
      <span className="tree-app-icon" aria-hidden="true">◈</span>
      <b>{app.name}</b>
      <small>{app.code}</small>
      <span className={statusClass(app.status)}>{app.status}</span>
      <button type="button" className="tree-remove" aria-label={`Retirer ${app.name} de ${target.name}`} title="Retirer cette relation" onClick={() => onUnassign(app.id, target.id)}>×</button>
    </div>
  );

  const TargetActions = ({ target }) => (
    <span className="tree-actions">
      {pickedCount > 0 && <button type="button" className="tree-link-here" onClick={() => onLinkPicked(target.id)}>Relier ici ({pickedCount})</button>}
      <button type="button" className="tree-link" aria-label={`Relier des applications à ${target.name}`} onClick={() => onOpenLink(target)}>＋ Relier…</button>
    </span>
  );

  const renderTargetBody = (target, level) => {
    const linked = appsFor(target.id);
    const cov = coverageOf(linked.length);
    const isOpen = !collapsed.has(target.id);
    return { linked, cov, isOpen, level };
  };

  const renderCap = cap => {
    const { linked, cov, isOpen } = renderTargetBody(cap, 2);
    return (
      <div className="tree-node tree-node-cap" role="treeitem" aria-level={2} aria-expanded={isOpen} key={cap.id}>
        <div className={`tree-row tree-cap cov-${cov.state}`} onDragOver={dropOver} onDragLeave={dropOut} onDrop={e => handleDrop(e, cap.id)}>
          <button type="button" className="tree-toggle" data-tree-focus data-expand={cap.id} onClick={() => toggle(cap.id)}>
            <span className="tree-caret" aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
            <span className="tree-code">{cap.code}</span>
            <span className="tree-name">{cap.name}</span>
          </button>
          <span className={`tree-cov cov-${cov.state}`}><span aria-hidden="true">{cov.symbol}</span> {cov.label} · {linked.length}</span>
          <TargetActions target={cap} />
        </div>
        {isOpen && (
          <div role="group" className="tree-children">
            {linked.map(a => <AppChild app={a} target={cap} key={a.id} />)}
            {!linked.length && <div className="tree-empty-line">Aucune application — déposez-en une sur cette ligne ou utilisez « Relier… ».</div>}
          </div>
        )}
      </div>
    );
  };

  const renderDomain = ({ d, caps }) => {
    const { linked, cov, isOpen } = renderTargetBody(d, 1);
    const allCaps = capabilities.filter(c => c.domainId === d.id);
    const isTarget = depth === 1;
    return (
      <div className="tree-node tree-node-domain" role="treeitem" aria-level={1} aria-expanded={isOpen} key={d.id}>
        <div
          className={`tree-row tree-domain${isTarget ? ` tree-cap cov-${cov.state}` : ''}`}
          onDragEnter={() => hoverExpand(d.id)}
          onDragOver={isTarget ? dropOver : e => e.preventDefault()}
          onDragLeave={e => { hoverCancel(); if (isTarget) dropOut(e); }}
          onDrop={isTarget ? e => handleDrop(e, d.id) : hoverCancel}
        >
          <button type="button" className="tree-toggle" data-tree-focus data-expand={d.id} onClick={() => toggle(d.id)}>
            <span className="tree-caret" aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
            <span className="tree-dot" style={{ backgroundColor: colorOf(d.color) }} aria-hidden="true" />
            <span className="tree-code">{d.code}</span>
            <span className="tree-name">{d.name}</span>
          </button>
          {isTarget
            ? <><span className={`tree-cov cov-${cov.state}`}><span aria-hidden="true">{cov.symbol}</span> {cov.label} · {linked.length}</span><TargetActions target={d} /></>
            : <span className="tree-count">{allCaps.length} N1</span>}
        </div>
        {isOpen && (
          <div role="group" className="tree-children">
            {isTarget
              ? <>
                  {linked.map(a => <AppChild app={a} target={d} key={a.id} />)}
                  {!linked.length && <div className="tree-empty-line">Aucune application — déposez-en une sur cette ligne ou utilisez « Relier… ».</div>}
                </>
              : <>
                  {caps.map(renderCap)}
                  {!allCaps.length && <div className="tree-empty-line">Aucune capacité N1 dans ce domaine.</div>}
                </>}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="coverage-tree" aria-label="Relations entre capacités et applications">
      <div className="tree-toolbar">
        <label className="map-filter-control">
          <span>Filtrer l’arbre</span>
          <input data-testid="tree-filter" value={query} onChange={e => setQuery(e.target.value)} placeholder="Domaine, capacité ou application" />
        </label>
        <label className="map-filter-control tree-select">
          <span>Couverture</span>
          <select data-testid="tree-coverage-filter" value={coverage} onChange={e => setCoverage(e.target.value)}>
            <option value="all">Tout</option>
            <option value="gap">Gaps seulement ({gapCount})</option>
            <option value="redundant">Redondances seulement ({redundantCount})</option>
          </select>
        </label>
        <div className="tree-bulk">
          <button type="button" className="secondary" onClick={expandAll}>Tout déplier</button>
          <button type="button" className="secondary" onClick={collapseAll}>Tout replier</button>
        </div>
      </div>
      <div className="tree-summary" aria-live="polite">
        <span>{targets.length} {depth === 1 ? 'domaines N0' : 'capacités N1'}</span>
        <span className="cov-gap">✕ {gapCount} gap{gapCount > 1 ? 's' : ''}</span>
        <span className="cov-redundant">⇄ {redundantCount} redondance{redundantCount > 1 ? 's' : ''}</span>
        {filtering && <button type="button" className="tree-reset" onClick={reset}>Réinitialiser le filtre</button>}
      </div>
      {rows.length ? (
        <div className="tree-body" role="tree" aria-label={depth === 1 ? 'Domaines N0 et applications' : 'Domaines N0, capacités N1 et applications'} onKeyDown={onKeyDown}>
          {rows.map(renderDomain)}
        </div>
      ) : (
        <p className="tree-empty">{domains.length ? 'Aucun élément ne correspond au filtre.' : 'Aucun domaine à afficher. Créez-en depuis l’onglet Cartographie.'}</p>
      )}
    </section>
  );
}
