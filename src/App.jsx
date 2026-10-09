import React, { useEffect, useMemo, useState } from 'react';
import { DEMO_MODEL } from './data/demoData.js';
import { exportModel, importModel, loadModel, saveModel } from './services/storage.js';
import NewMapWizard from './components/NewMapWizard.jsx';
import TogafGuide from './components/TogafGuide.jsx';

const SOURCE_URL_KEY = 'enterprise-capacity-mapper:source-url';
const VISUAL_PREFS_KEY = 'enterprise-capacity-mapper:visual-preferences';
const uid = p => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const emptyForm = { name: '', code: '', description: '', status: 'Actif', type: 'SaaS', vendor: '', domainId: '', capabilityIds: [], columnId: '', layerId: '', columnSpan: '1' };
const DEFAULT_LAYOUTS = { columns: [{ id: 'business', name: 'Business', order: 0 }, { id: 'operations', name: 'Operations', order: 1 }, { id: 'support', name: 'Support', order: 2 }], layers: [{ id: 'strategic', name: 'Stratégique', order: 0 }, { id: 'core', name: 'Core / Value', order: 1 }, { id: 'support', name: 'Support', order: 2 }] };

function Modal({ title, children, onClose }) { return <div className="modal-backdrop"><div className="modal"><div className="modal-head"><h2>{title}</h2><button onClick={onClose}>×</button></div>{children}</div></div>; }
function Field({ label, required = false, error, ...p }) { return <label className={'field ' + (error ? 'has-error' : '')}><span>{label}{required && <b className="required" aria-hidden="true"> *</b>}</span><input aria-required={required} aria-invalid={!!error} {...p} />{error && <small className="field-error">{error}</small>}</label>; }

function App() {
  const [model, setModel] = useState(() => loadModel(DEMO_MODEL));
  const [mode, setMode] = useState('editor');
  const [mapViewMode, setMapViewMode] = useState('domain'); // 'domain' ou 'coverage'
  const [expandedCapId, setExpandedCapId] = useState(null); // Détail au clic pour N1
  const [presentation, setPresentation] = useState(false);
  const [inventoryCollapsed, setInventoryCollapsed] = useState(false);
  const [visualPrefs, setVisualPrefs] = useState(() => { try { return { theme: 'classic', density: 'comfortable', ...JSON.parse(localStorage.getItem(VISUAL_PREFS_KEY) || '{}') }; } catch { return { theme: 'classic', density: 'comfortable' }; } });
  const [mapQuery, setMapQuery] = useState('');
  const [sourceUrl, setSourceUrl] = useState(() => localStorage.getItem(SOURCE_URL_KEY) || '');
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [modal, setModal] = useState(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [editingDomainId, setEditingDomainId] = useState(null);
  const [editingCapabilityId, setEditingCapabilityId] = useState(null);
  const [layoutDraft, setLayoutDraft] = useState(null);
  const [layoutMode, setLayoutMode] = useState(model.layout?.mode || 'matrix');

  const depth = model.layout?.depth === 1 ? 1 : 2;
  const mappedItems = depth === 1 ? model.domains : model.capabilities;
  const relationIds = item => item.capabilityIds || [];
  const relationLabel = depth === 1 ? 'domaine N0' : 'capacité N1';

  useEffect(() => saveModel(model), [model]);
  useEffect(() => { localStorage.setItem(VISUAL_PREFS_KEY, JSON.stringify(visualPrefs)); }, [visualPrefs]);

  const apps = model.applications || [];
  const filteredApps = useMemo(() => apps.filter(a => (a.name + ' ' + a.code + ' ' + a.vendor).toLowerCase().includes(query.toLowerCase())), [apps, query]);
  const touched = apps.filter(a => relationIds(a).some(id => selected.includes(id)));
  const gaps = mappedItems.filter(c => selected.includes(c.id) && !apps.some(a => relationIds(a).includes(c.id)));
  const redundancy = mappedItems.filter(c => apps.filter(a => relationIds(a).includes(c.id)).length > 1);
  const notify = x => { setStatus(x); setTimeout(() => setStatus(''), 2500); };
  const update = patch => setModel(m => ({ ...m, ...patch }));
  const layout = model.layout || { mode: 'matrix', columns: DEFAULT_LAYOUTS.columns, layers: DEFAULT_LAYOUTS.layers };
  const columns = layout.columns?.length ? layout.columns : DEFAULT_LAYOUTS.columns;
  const layers = layout.layers?.length ? layout.layers : DEFAULT_LAYOUTS.layers;
  const zones = columns.flatMap(column => layers.map(layer => layout.zones?.find(zone => zone.columnId === column.id && zone.layerId === layer.id) || { id: `${column.id}:${layer.id}`, columnId: column.id, layerId: layer.id, name: column.name }));

  const setLayoutView = m => { setLayoutMode(m); update({ layout: { ...layout, mode: m } }); };
  const openLayoutEditor = () => { setLayoutDraft({ columns: columns.map(x => ({ ...x })), layers: layers.map(x => ({ ...x })), zones: zones.map(x => ({ ...x })) }); setModal('layout'); };
  
  const openWizard = () => setModal('wizard');
  const closeWizard = () => setModal(null);
  const createMap = ({ name, description, layout: nextLayout, backup }) => {
    if (backup) exportModel(model);
    setModel(m => ({ ...m, metadata: { ...m.metadata, name, description }, layout: nextLayout, domains: [], capabilities: [], applications: [] }));
    setSelected([]);
    setLayoutMode('matrix');
    setMode('editor');
    setSourceUrl('');
    localStorage.removeItem(SOURCE_URL_KEY);
    setModal(null);
    notify(backup ? 'Cartographie créée · sauvegarde JSON téléchargée' : 'Cartographie créée');
  };

  const placementAvailable = (domainId, columnId, layerId, columnSpan) => {
    const start = columns.findIndex(c => c.id === columnId);
    const span = Number(columnSpan) || 1;
    if (start < 0 || span < 1 || start + span > columns.length) return false;
    return !model.domains.some(d => {
      if (d.id === domainId || (d.layout?.layerId || layers[0].id) !== layerId) return false;
      const otherStart = columns.findIndex(c => c.id === (d.layout?.columnId || columns[0].id));
      const otherSpan = Math.max(1, Number(d.layout?.columnSpan) || 1);
      if (otherStart < 0) return false;
      if (otherStart === start && otherSpan === span) return false;
      return start < otherStart + otherSpan && otherStart < start + span;
    });
  };

  const placeDomain = (domainId, columnId, layerId) => {
    if (!domainId) return;
    const moving = model.domains.find(d => d.id === domainId);
    const targetColumn = columnId || moving?.layout?.columnId || columns[0].id;
    const targetLayer = layerId || moving?.layout?.layerId || layers[0].id;
    if (moving && !placementAvailable(domainId, targetColumn, targetLayer, moving.layout?.columnSpan || 1)) { notify('Déplacement impossible : cette étendue chevaucherait un autre domaine ou dépasserait la matrice.'); return; }
    update({ layout: { ...layout, mode: layoutMode, columns, layers }, domains: model.domains.map(d => d.id === domainId ? { ...d, layout: { ...(d.layout || {}), columnId: targetColumn, layerId: targetLayer } } : d) });
  };

  const openNew = (kind, parent, place) => { setEditingDomainId(null); setEditingCapabilityId(null); setFormErrors({}); setForm({ ...emptyForm, domainId: parent || '', capabilityIds: parent ? [parent] : [], columnId: place?.columnId || columns[0].id, layerId: place?.layerId || layers[0].id, columnSpan: '1' }); setModal(kind); };
  const openEditDomain = d => { setEditingDomainId(d.id); setEditingCapabilityId(null); setFormErrors({}); setForm({ ...emptyForm, name: d.name, code: d.code, description: d.description || '', columnId: d.layout?.columnId || columns[0].id, layerId: d.layout?.layerId || layers[0].id, columnSpan: String(d.layout?.columnSpan || 1) }); setModal('edit-domain'); };
  const openEditCapability = c => { setEditingCapabilityId(c.id); setFormErrors({}); setForm({ ...emptyForm, name: c.name }); setModal('edit-capability'); };

  const save = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Le nom est obligatoire.';
    if (modal !== 'edit-capability' && !form.code.trim()) errors.code = 'Le code est obligatoire.';
    if (modal === 'capability' && !form.domainId) errors.domainId = 'Le domaine est obligatoire.';
    if (modal === 'app' && !form.vendor.trim()) errors.vendor = 'L’éditeur / fournisseur est obligatoire.';
    if ((modal === 'domain' || modal === 'edit-domain') && !placementAvailable(modal === 'edit-domain' ? editingDomainId : null, form.columnId || columns[0].id, form.layerId || layers[0].id, form.columnSpan)) errors.columnSpan = 'Cette étendue chevauche un autre domaine ou dépasse les colonnes disponibles.';
    if (Object.keys(errors).length) { setFormErrors(errors); notify('Vérifiez les champs signalés.'); return; }
    setFormErrors({});
    if (modal === 'domain') update({ domains: [...model.domains, { id: uid('l0'), code: form.code || 'CAP', name: form.name, description: form.description, color: 'indigo', layout: { columnId: form.columnId || columns[0].id, layerId: form.layerId || layers[0].id, columnSpan: Number(form.columnSpan) || 1 } }] });
    if (modal === 'edit-domain') update({ domains: model.domains.map(d => d.id === editingDomainId ? { ...d, name: form.name.trim(), code: form.code.trim() || d.code, description: form.description, layout: { ...(d.layout || {}), columnId: form.columnId || d.layout?.columnId || columns[0].id, layerId: form.layerId || d.layout?.layerId || layers[0].id, columnSpan: Number(form.columnSpan) || 1 } } : d) });
    if (modal === 'edit-capability') update({ capabilities: model.capabilities.map(c => c.id === editingCapabilityId ? { ...c, name: form.name.trim() } : c) });
    if (modal === 'capability') update({ capabilities: [...model.capabilities, { id: uid('l1'), domainId: form.domainId, code: form.code || 'CAP-01', name: form.name, description: form.description }] });
    if (modal === 'app') update({ applications: [...apps, { id: uid('app'), name: form.name, code: form.code || 'APP', type: form.type, status: form.status, vendor: form.vendor, capabilityIds: form.capabilityIds, description: form.description }] });
    setModal(null);
  };

  const removeDomain = id => {
    const caps = model.capabilities.filter(c => c.domainId === id).map(c => c.id);
    const ids = new Set(depth === 1 ? [id] : caps);
    update({ domains: model.domains.filter(d => d.id !== id), capabilities: model.capabilities.filter(c => c.domainId !== id), applications: apps.map(a => ({ ...a, capabilityIds: relationIds(a).filter(x => !ids.has(x)) })) });
    notify('Domaine et dépendances supprimés');
  };

  const assign = (appId, capId) => update({ applications: apps.map(a => a.id === appId ? { ...a, capabilityIds: Array.from(new Set([...(a.capabilityIds || []), capId])) } : a) });
  const unassign = (appId, capId) => update({ applications: apps.map(a => a.id === appId ? { ...a, capabilityIds: (a.capabilityIds || []).filter(x => x !== capId) } : a) });
  const onDrop = (e, capId) => { e.preventDefault(); const id = e.dataTransfer.getData('app'); if (id) assign(id, capId); };

  // Helper pour calculer la couverture d'une capacité N1
  const getCapCoverageState = (capId) => {
    const assignedApps = apps.filter(a => (a.capabilityIds || []).includes(capId));
    const count = assignedApps.length;
    if (count === 0) return { state: 'gap', label: 'Gap', symbol: '✕', count: 0, apps: assignedApps };
    if (count === 1) return { state: 'ok', label: 'Couvert', symbol: '✓', count: 1, apps: assignedApps };
    return { state: 'redundant', label: 'Redondance', symbol: '⇄', count, apps: assignedApps };
  };

  // Composant Carte Domaine N0 (Rendu B - Poster & Heatmap)
  const DomainCard = ({ d }) => {
    const caps = model.capabilities.filter(c => c.domainId === d.id);
    const domainClass = `domain domain-card domain-color-${d.code?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'default'}`;

    return (
      <section
        className={domainClass}
        draggable
        onDragStart={e => e.dataTransfer.setData('domain', d.id)}
        onDragOver={e => depth === 1 && e.preventDefault()}
        onDrop={e => { if (depth === 1) { e.preventDefault(); onDrop(e, d.id); } }}
        key={d.id}
      >
        <div className="domain-banner">
          <div className="domain-banner-title">
            <h3>{d.name}</h3>
            <span className="domain-meta">{d.code} · {caps.length} N1</span>
          </div>
          <div className="domain-actions">
            <button className="icon-action" title="Modifier" onClick={() => openEditDomain(d)}>✎</button>
            {depth === 2 && <button className="icon-action" title="Ajouter N1" onClick={() => openNew('capability', d.id)}>＋</button>}
            <button className="icon-action danger-text" title="Supprimer" onClick={() => removeDomain(d.id)}>×</button>
          </div>
        </div>

        {depth === 1 ? (
          <div className="relations domain-relations">
            {apps.filter(a => relationIds(a).includes(d.id)).map(a => (
              <div className="rel" key={a.id} draggable onDragStart={e => e.dataTransfer.setData("app", a.id)}>
                <span>◈</span>{a.name}
                <button onClick={() => unassign(a.id, d.id)}>×</button>
              </div>
            ))}
            <div className="drop">Déposer une application ici</div>
          </div>
        ) : (
          <div className="caps-list">
            {caps.map(c => {
              const coverage = getCapCoverageState(c.id);
              const isExpanded = expandedCapId === c.id;
              const capItemClass = `cap-tile ${mapViewMode === 'coverage' ? `cov-${coverage.state}` : ''}`;

              return (
                <div
                  className={capItemClass}
                  key={c.id}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => onDrop(e, c.id)}
                  onClick={() => setExpandedCapId(isExpanded ? null : c.id)}
                >
                  <div className="cap-tile-header">
                    <span className="cap-tile-title">{c.name}</span>
                    <div className="cap-tile-badge">
                      {mapViewMode === 'coverage' && <span className="cov-symbol">{coverage.symbol}</span>}
                      <span className="app-count">{coverage.count}</span>
                    </div>
                  </div>

                  {/* Panneau réductible de détail au clic et réceptacle Drag&Drop */}
                  {isExpanded && (
                    <div className="cap-tile-detail" onClick={e => e.stopPropagation()}>
                      <p className="cap-desc">{c.description || 'Aucune description'}</p>
                      <div className="cap-detail-actions">
                        <button className="cap-edit-btn" onClick={() => openEditCapability(c)}>Renommer N1</button>
                      </div>
                      <div className="relations">
                        {coverage.apps.map(a => (
                          <div className="rel" key={a.id} draggable onDragStart={e => e.dataTransfer.setData('app', a.id)}>
                            <span>◈</span><b>{a.name}</b> <small>({a.status})</small>
                            <button onClick={() => unassign(a.id, c.id)}>×</button>
                          </div>
                        ))}
                        <div className="drop">Déposer une application ici pour l'associer</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    );
  };

  const matrixView = (
    <div className="map map-matrix">
      <div className="map-row map-head" style={{ gridTemplateColumns: `120px repeat(${columns.length}, minmax(220px, 1fr))` }}>
        <div />
        {columns.map(col => <div className="col-head" key={col.id}>{col.name}</div>)}
      </div>
      {layers.map(layer => (
        <div className="map-row" key={layer.id} style={{ gridTemplateColumns: `120px repeat(${columns.length}, minmax(220px, 1fr))` }}>
          <div className="axis-label">{layer.name}</div>
          {columns.map((col, index) => {
            const coveredByPrevious = model.domains.some(d => (d.layout?.layerId || layers[0].id) === layer.id && columns.findIndex(c => c.id === (d.layout?.columnId || columns[0].id)) < index && columns.findIndex(c => c.id === (d.layout?.columnId || columns[0].id)) + Math.max(1, Number(d.layout?.columnSpan) || 1) > index);
            if (coveredByPrevious) return null;
            const here = model.domains.filter(d => (d.layout?.columnId || columns[0].id) === col.id && (d.layout?.layerId || layers[0].id) === layer.id && (d.name + ' ' + d.code + ' ' + (d.description || '')).toLowerCase().includes(mapQuery.toLowerCase()));
            const span = Math.max(1, Math.min(columns.length - index, Number(here[0]?.layout?.columnSpan) || 1));
            const zone = zones.find(z => z.columnId === col.id && z.layerId === layer.id);
            const zoneLabel = zone?.name && zone.name !== col.name ? zone.name : '';

            return (
              <div className="map-cell" key={col.id} data-zone-key={`${col.id}:${layer.id}`} style={{ gridColumn: span > 1 ? `span ${span}` : undefined }} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); placeDomain(e.dataTransfer.getData('domain'), col.id, layer.id); }}>
                {zoneLabel && <div className="cell-label">{zoneLabel}</div>}
                {here.map(d => <DomainCard d={d} key={d.id} />)}
                <button className={'cell-add' + (here.length ? '' : ' empty')} onClick={() => openNew('domain', null, { columnId: col.id, layerId: layer.id })}>＋ Ajouter un domaine ici</button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  return (
    <div className={'app theme-' + visualPrefs.theme + ' density-' + visualPrefs.density + (presentation ? ' presentation-mode' : '')}>
      <header>
        <div><div className="eyebrow">ENTERPRISE ARCHITECTURE</div><h1>Capacity Mapper</h1></div>
        <div className="toolbar">
          <div className="toolbar-switch">
            <button className={mode === 'editor' ? 'active' : ''} onClick={() => setMode('editor')}>▦ Cartographie</button>
            <button className={mode === 'impact' ? 'active' : ''} onClick={() => setMode('impact')}>⚡ Impact</button>
          </div>
          <div className="toolbar-actions">
            <button className="secondary" onClick={() => setPresentation(v => !v)}>{presentation ? '↙ Quitter la présentation' : '⛶ Présentation'}</button>
            <button className="secondary" onClick={openWizard}>＋ Nouvelle cartographie</button>
            <button className="secondary" onClick={() => exportModel(model)}>↓ Export</button>
          </div>
        </div>
      </header>

      <div className={'workspace ' + (inventoryCollapsed ? 'inventory-collapsed' : '')}>
        <aside id="app-inventory">
          <div className="panel-title">
            <span>Inventaire SI <em>{apps.length}</em></span>
            <button className="side-add" onClick={() => openNew('app')}>＋ Application</button>
          </div>
          <input className="search" placeholder="Rechercher une application…" value={query} onChange={e => setQuery(e.target.value)} />
          <div className="hint">Glissez une application vers une tuile N1 pour créer une relation.</div>
          {filteredApps.map(a => (
            <div key={a.id} className="app-item" draggable onDragStart={e => e.dataTransfer.setData('app', a.id)}>
              <div><b>{a.name}</b><small>{a.code} · {a.vendor || '—'}</small></div>
              <span className={'badge ' + a.status.toLowerCase().replace('é', 'e')}>{a.status}</span>
            </div>
          ))}
        </aside>

        <main>
          {mode === 'editor' && (
            <>
              <div className="canvas-head">
                <button className="secondary inventory-toggle inventory-toggle-rail" onClick={() => setInventoryCollapsed(v => !v)} aria-label="Afficher/Masquer inventaire">
                  <span className="menu-glyph"></span>
                </button>
                <div className="canvas-title">
                  <div className="eyebrow">CAPABILITY MAP · V3</div>
                  <h2>Cartographie des capacités</h2>
                </div>
                
                {/* Bascule de mode de vue Maquette B */}
                <div className="map-view-toggle">
                  <button className={mapViewMode === 'domain' ? 'active' : ''} onClick={() => setMapViewMode('domain')}>Par domaine</button>
                  <button className={mapViewMode === 'coverage' ? 'active' : ''} onClick={() => setMapViewMode('coverage')}>Par couverture</button>
                </div>

                <div className="canvas-actions">
                  <button className="primary" onClick={() => openNew('domain')}>＋ Domaine N0</button>
                  <button className="secondary" onClick={openLayoutEditor}>⚙ Structure</button>
                  <button className="help-icon" onClick={() => setGuideOpen(true)} title="Aide TOGAF">?</button>
                </div>
              </div>

              {/* Légende en mode couverture */}
              {mapViewMode === 'coverage' && (
                <div className="coverage-legend">
                  <span className="legend-item legend-ok"><span className="cov-symbol">✓</span> Couvert (1 app)</span>
                  <span className="legend-item legend-redundant"><span className="cov-symbol">⇄</span> Redondance (&gt;1 app)</span>
                  <span className="legend-item legend-gap"><span className="cov-symbol">✕</span> Gap (0 app)</span>
                </div>
              )}

              {matrixView}
            </>
          )}
        </main>
      </div>

      {status && <div className="toast">{status}</div>}
      {modal === 'wizard' && <NewMapWizard model={model} onCancel={closeWizard} onCreate={createMap} />}
      {guideOpen && <TogafGuide onClose={() => setGuideOpen(false)} />}
    </div>
  );
}

export default App;