import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DEMO_MODEL } from './data/demoData.js';
import { exportModel, importModel, loadModel, saveModel } from './services/storage.js';
import NewMapWizard from './components/NewMapWizard.jsx';
import TogafGuide from './components/TogafGuide.jsx';

const SOURCE_URL_KEY = 'enterprise-capacity-mapper:source-url';
const uid = p => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const DOMAIN_COLORS = { indigo: '#5b46be', emerald: '#0d6e53', amber: '#a43a18', rose: '#9d2b52' };
const DOMAIN_COLOR_PALETTE = [
  { name: 'Indigo', value: '#5b46be' },
  { name: 'Bleu', value: '#2563eb' },
  { name: 'Turquoise', value: '#0e7490' },
  { name: 'Émeraude', value: '#0d6e53' },
  { name: 'Vert', value: '#15803d' },
  { name: 'Olive', value: '#4d7c0f' },
  { name: 'Ambre', value: '#a16207' },
  { name: 'Orange', value: '#c2410c' },
  { name: 'Rouge', value: '#b91c1c' },
  { name: 'Rose', value: '#be185d' },
  { name: 'Prune', value: '#7e22ce' },
  { name: 'Ardoise', value: '#475569' }
];
const resolveDomainColor = color => /^#[\da-f]{6}$/i.test(color || '') ? color : DOMAIN_COLORS[color] || '#3b82f6';
const domainTextColor = color => {
  const hex = resolveDomainColor(color).slice(1);
  const [r, g, b] = [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
  const luminance = [r, g, b].map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  return luminance > 0.42 ? '#0f172a' : '#ffffff';
};
const emptyForm = { name: '', code: '', description: '', status: 'Actif', type: 'SaaS', vendor: '', domainId: '', capabilityIds: [], columnId: '', layerId: '', columnSpan: '1', color: DOMAIN_COLORS.indigo };
const DEFAULT_LAYOUTS = { columns: [{ id: 'business', name: 'Business', order: 0 }, { id: 'operations', name: 'Operations', order: 1 }, { id: 'support', name: 'Support', order: 2 }], layers: [{ id: 'strategic', name: 'Stratégique', order: 0 }, { id: 'core', name: 'Core / Value', order: 1 }, { id: 'support', name: 'Support', order: 2 }] };

function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, required = false, error, ...p }) {
  return (
    <label className={'field ' + (error ? 'has-error' : '')}>
      <span>{label}{required && <b className="required" aria-hidden="true"> *</b>}</span>
      <input aria-required={required} aria-invalid={!!error} {...p} />
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

function App() {
  const [model, setModel] = useState(() => loadModel(DEMO_MODEL));
  const modelRef = useRef(model);
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const [mode, setMode] = useState('editor'); // 'editor' ou 'impact'
  const [expandedCapId, setExpandedCapId] = useState(null); // Détail au clic pour N1
  const [presentation, setPresentation] = useState(false);
  const [inventoryCollapsed, setInventoryCollapsed] = useState(false);
  const [mapQuery, setMapQuery] = useState('');
  const [sourceUrl, setSourceUrl] = useState(() => localStorage.getItem(SOURCE_URL_KEY) || '');
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
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

  const apps = model.applications || [];
  const filteredApps = useMemo(() => apps.filter(a => (a.name + ' ' + a.code + ' ' + a.vendor).toLowerCase().includes(query.toLowerCase())), [apps, query]);
  const visibleDomains = useMemo(() => model.domains.filter(d => (d.name + ' ' + d.code + ' ' + (d.description || '')).toLowerCase().includes(mapQuery.toLowerCase())), [model.domains, mapQuery]);
  const touched = apps.filter(a => relationIds(a).some(id => selected.includes(id)));
  const gaps = mappedItems.filter(c => selected.includes(c.id) && !apps.some(a => relationIds(a).includes(c.id)));
  const redundancy = mappedItems.filter(c => apps.filter(a => relationIds(a).includes(c.id)).length > 1);
  const notify = x => { setStatus(x); setTimeout(() => setStatus(''), 2500); };
  const refreshHistoryState = () => setHistoryState({ canUndo: undoStack.current.length > 0, canRedo: redoStack.current.length > 0 });
  const commitModel = nextModel => {
    const currentModel = modelRef.current;
    if (nextModel === currentModel) return;
    undoStack.current = [...undoStack.current.slice(-49), currentModel];
    redoStack.current = [];
    modelRef.current = nextModel;
    setModel(nextModel);
    refreshHistoryState();
  };
  const replaceModel = nextModel => commitModel(nextModel);
  const update = patch => commitModel({ ...modelRef.current, ...patch });
  const undo = () => {
    if (!undoStack.current.length) return;
    redoStack.current.push(modelRef.current);
    modelRef.current = undoStack.current.pop();
    setModel(modelRef.current);
    refreshHistoryState();
  };
  const redo = () => {
    if (!redoStack.current.length) return;
    undoStack.current = [...undoStack.current.slice(-49), modelRef.current];
    modelRef.current = redoStack.current.pop();
    setModel(modelRef.current);
    refreshHistoryState();
  };

  useEffect(() => {
    const handleKeyDown = event => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || modal) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;

      const key = event.key.toLowerCase();
      if (key === 'z' && event.shiftKey && historyState.canRedo) {
        event.preventDefault();
        redo();
      } else if (key === 'z' && !event.shiftKey && historyState.canUndo) {
        event.preventDefault();
        undo();
      } else if (key === 'y' && !event.shiftKey && historyState.canRedo) {
        event.preventDefault();
        redo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [historyState, modal]);
  const openContextMenu = (event, menu) => {
    event.preventDefault();
    event.stopPropagation();
    const menuWidth = 180;
    const menuHeight = menu.type === 'domain' ? 132 : 58;
    setContextMenu({
      ...menu,
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - menuWidth - 8)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - menuHeight - 8))
    });
  };
  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    if (!contextMenu) return undefined;

    const handlePointerDown = event => {
      const menuNode = document.querySelector('.context-menu');
      if (!menuNode || menuNode.contains(event.target)) return;
      closeContextMenu();
    };

    const handleKeyDown = event => {
      if (event.key === 'Escape') closeContextMenu();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu]);

  const layout = model.layout || { mode: 'matrix', columns: DEFAULT_LAYOUTS.columns, layers: DEFAULT_LAYOUTS.layers };
  const columns = layout.columns?.length ? layout.columns : DEFAULT_LAYOUTS.columns;
  const layers = layout.layers?.length ? layout.layers : DEFAULT_LAYOUTS.layers;
  const zones = columns.flatMap(column => layers.map(layer => layout.zones?.find(zone => zone.columnId === column.id && zone.layerId === layer.id) || { id: `${column.id}:${layer.id}`, columnId: column.id, layerId: layer.id, name: column.name }));

  const setLayoutView = m => { setLayoutMode(m); update({ layout: { ...layout, mode: m } }); };
  const openLayoutEditor = () => {
    setLayoutDraft({ columns: columns.map(x => ({ ...x })), layers: layers.map(x => ({ ...x })), zones: zones.map(x => ({ ...x })) });
    setModal('layout');
  };

  const completeZones = (nextColumns, nextLayers, currentZones) => nextColumns.flatMap(column => nextLayers.map(layer => currentZones.find(zone => zone.columnId === column.id && zone.layerId === layer.id) || { id: `${column.id}:${layer.id}`, columnId: column.id, layerId: layer.id, name: column.name }));

  const updateLayoutDraft = (kind, id, name) => setLayoutDraft(d => {
    const previous = d[kind].find(x => x.id === id);
    const items = d[kind].map(x => x.id === id ? { ...x, name } : x);
    const nextColumns = kind === 'columns' ? items : d.columns;
    const nextLayers = kind === 'layers' ? items : d.layers;
    const syncedZones = kind === 'columns' && previous ? d.zones.map(z => z.columnId === id && z.name === previous.name ? { ...z, name } : z) : d.zones;
    return { ...d, [kind]: items, zones: completeZones(nextColumns, nextLayers, syncedZones) };
  });

  const updateZoneDraft = (columnId, layerId, name) => setLayoutDraft(d => ({ ...d, zones: d.zones.map(zone => zone.columnId === columnId && zone.layerId === layerId ? { ...zone, name } : zone) }));

  const addLayoutItem = kind => setLayoutDraft(d => {
    const items = [...d[kind], { id: uid(kind === 'columns' ? 'column' : 'layer'), name: kind === 'columns' ? 'Nouvelle colonne' : 'Nouveau layer', order: d[kind].length }];
    const nextColumns = kind === 'columns' ? items : d.columns;
    const nextLayers = kind === 'layers' ? items : d.layers;
    return { ...d, [kind]: items, zones: completeZones(nextColumns, nextLayers, d.zones) };
  });

  const removeLayoutItem = (kind, id) => setLayoutDraft(d => {
    if (d[kind].length <= 1) return d;
    const items = d[kind].filter(x => x.id !== id).map((x, i) => ({ ...x, order: i }));
    const nextColumns = kind === 'columns' ? items : d.columns;
    const nextLayers = kind === 'layers' ? items : d.layers;
    return { ...d, [kind]: items, zones: completeZones(nextColumns, nextLayers, d.zones) };
  });

  const saveLayout = () => {
    if (!layoutDraft.columns.length || !layoutDraft.layers.length || [...layoutDraft.columns, ...layoutDraft.layers, ...layoutDraft.zones].some(x => !x.name.trim())) {
      notify('Chaque colonne, layer et zone doit avoir un nom');
      return;
    }
    const columnIds = new Set(layoutDraft.columns.map(x => x.id));
    const layerIds = new Set(layoutDraft.layers.map(x => x.id));
    const nextColumns = layoutDraft.columns.map((x, i) => ({ ...x, name: x.name.trim(), order: i }));
    const nextLayers = layoutDraft.layers.map((x, i) => ({ ...x, name: x.name.trim(), order: i }));
    const validZones = layoutDraft.zones.filter(zone => columnIds.has(zone.columnId) && layerIds.has(zone.layerId)).map(zone => ({ ...zone, name: zone.name.trim() }));
    const zoneKeys = new Set(validZones.map(zone => `${zone.columnId}:${zone.layerId}`));
    nextColumns.forEach(column => nextLayers.forEach(layer => {
      if (!zoneKeys.has(`${column.id}:${layer.id}`)) validZones.push({ id: `${column.id}:${layer.id}`, columnId: column.id, layerId: layer.id, name: column.name });
    }));
    update({ layout: { ...layout, columns: nextColumns, layers: nextLayers, zones: validZones }, domains: model.domains.map((d, i) => ({ ...d, layout: { ...(d.layout || {}), columnId: columnIds.has(d.layout?.columnId) ? d.layout.columnId : nextColumns[i % nextColumns.length].id, layerId: layerIds.has(d.layout?.layerId) ? d.layout.layerId : nextLayers[0].id } })) });
    setModal(null);
    notify('Structure enregistrée');
  };

  const openWizard = () => setModal('wizard');
  const closeWizard = () => setModal(null);
  const createMap = ({ name, description, layout: nextLayout, backup }) => {
    if (backup) exportModel(model);
    replaceModel({ ...modelRef.current, metadata: { ...modelRef.current.metadata, name, description }, layout: nextLayout, domains: [], capabilities: [], applications: [] });
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
    if (moving && !placementAvailable(domainId, targetColumn, targetLayer, moving.layout?.columnSpan || 1)) {
      notify('Déplacement impossible : chevauchement de domaine.');
      return;
    }
    update({ layout: { ...layout, mode: layoutMode, columns, layers }, domains: model.domains.map(d => d.id === domainId ? { ...d, layout: { ...(d.layout || {}), columnId: targetColumn, layerId: targetLayer } } : d) });
  };

  const openNew = (kind, parent, place) => {
    setEditingDomainId(null);
    setEditingCapabilityId(null);
    setFormErrors({});
    const defaultDomain = parent || (model.domains[0]?.id || '');
    setForm({
      ...emptyForm,
      domainId: defaultDomain,
      capabilityIds: parent ? [parent] : [],
      columnId: place?.columnId || columns[0].id,
      layerId: place?.layerId || layers[0].id,
      columnSpan: '1'
    });
    setModal(kind);
  };

  const openEditDomain = d => {
    setEditingDomainId(d.id);
    setEditingCapabilityId(null);
    setFormErrors({});
    setForm({
      ...emptyForm,
      name: d.name,
      code: d.code,
      description: d.description || '',
      color: resolveDomainColor(d.color),
      columnId: d.layout?.columnId || columns[0].id,
      layerId: d.layout?.layerId || layers[0].id,
      columnSpan: String(d.layout?.columnSpan || 1)
    });
    setModal('edit-domain');
  };

  const openEditCapability = c => {
    setEditingCapabilityId(c.id);
    setFormErrors({});
    setForm({ ...emptyForm, name: c.name, code: c.code || '', description: c.description || '' });
    setModal('edit-capability');
  };

  const save = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Le nom est obligatoire.';
    if (modal !== 'edit-capability' && !form.code.trim()) errors.code = 'Le code est obligatoire.';
    if (modal === 'capability' && !form.domainId) errors.domainId = 'Le domaine est obligatoire.';
    if (modal === 'app' && !form.vendor.trim()) errors.vendor = 'L’éditeur / fournisseur est obligatoire.';
    if ((modal === 'domain' || modal === 'edit-domain') && !/^#[\da-f]{6}$/i.test(form.color)) errors.color = 'Saisissez une couleur hexadécimale au format #RRGGBB.';
    if ((modal === 'domain' || modal === 'edit-domain') && !placementAvailable(modal === 'edit-domain' ? editingDomainId : null, form.columnId || columns[0].id, form.layerId || layers[0].id, form.columnSpan)) errors.columnSpan = 'Cette étendue chevauche un autre domaine.';

    if (Object.keys(errors).length) {
      setFormErrors(errors);
      notify('Vérifiez les champs signalés.');
      return;
    }

    setFormErrors({});
    if (modal === 'domain') {
      update({ domains: [...model.domains, { id: uid('l0'), code: form.code || 'CAP', name: form.name.trim(), description: form.description, color: resolveDomainColor(form.color), layout: { columnId: form.columnId || columns[0].id, layerId: form.layerId || layers[0].id, columnSpan: Number(form.columnSpan) || 1 } }] });
      setMapQuery('');
      notify('Domaine N0 créé');
    }
    if (modal === 'edit-domain') {
      update({ domains: model.domains.map(d => d.id === editingDomainId ? { ...d, name: form.name.trim(), code: form.code.trim() || d.code, description: form.description, color: resolveDomainColor(form.color), layout: { ...(d.layout || {}), columnId: form.columnId || d.layout?.columnId || columns[0].id, layerId: form.layerId || d.layout?.layerId || layers[0].id, columnSpan: Number(form.columnSpan) || 1 } } : d) });
      notify('Domaine N0 modifié');
    }
    if (modal === 'edit-capability') {
      update({ capabilities: model.capabilities.map(c => c.id === editingCapabilityId ? { ...c, name: form.name.trim() } : c) });
      notify('Capacité N1 modifiée');
    }
    if (modal === 'capability') {
      update({ capabilities: [...model.capabilities, { id: uid('l1'), domainId: form.domainId, code: form.code || 'CAP-01', name: form.name.trim(), description: form.description }] });
      notify('Capacité N1 créée');
    }
    if (modal === 'app') {
      update({ applications: [...apps, { id: uid('app'), name: form.name.trim(), code: form.code || 'APP', type: form.type, status: form.status, vendor: form.vendor, capabilityIds: form.capabilityIds, description: form.description }] });
      notify('Application créée');
    }
    setModal(null);
  };

  const removeDomain = id => {
    const caps = model.capabilities.filter(c => c.domainId === id).map(c => c.id);
    const ids = new Set(depth === 1 ? [id] : caps);
    update({ domains: model.domains.filter(d => d.id !== id), capabilities: model.capabilities.filter(c => c.domainId !== id), applications: apps.map(a => ({ ...a, capabilityIds: relationIds(a).filter(x => !ids.has(x)) })) });
    notify('Domaine et dépendances supprimés');
  };

  const toggleCap = id => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const assign = (appId, capId) => update({ applications: apps.map(a => a.id === appId ? { ...a, capabilityIds: Array.from(new Set([...(a.capabilityIds || []), capId])) } : a) });
  const unassign = (appId, capId) => update({ applications: apps.map(a => a.id === appId ? { ...a, capabilityIds: (a.capabilityIds || []).filter(x => x !== capId) } : a) });
  const onDrop = (e, capId) => { e.preventDefault(); const id = e.dataTransfer.getData('app'); if (id) assign(id, capId); };

  const importJson = async e => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      replaceModel(await importModel(f));
      notify('Cartographie importée');
    } catch (err) {
      notify(err.message);
    }
    e.target.value = '';
  };

  const getCapCoverageState = capId => {
    const assignedApps = apps.filter(a => (a.capabilityIds || []).includes(capId));
    const count = assignedApps.length;
    if (count === 0) return { state: 'gap', label: 'Gap', symbol: '✕', count: 0, apps: assignedApps };
    if (count === 1) return { state: 'ok', label: 'Couvert', symbol: '✓', count: 1, apps: assignedApps };
    return { state: 'redundant', label: 'Redondance', symbol: '⇄', count, apps: assignedApps };
  };

  const DomainCard = ({ d }) => {
    const caps = model.capabilities.filter(c => c.domainId === d.id);
    const domainClass = `domain domain-card${selected.includes(d.id) ? ' impact-selected' : ''}`;

    return (
      <section
        className={domainClass}
        style={{ '--domain-color': resolveDomainColor(d.color) }}
        draggable
        onContextMenu={e => openContextMenu(e, { type: 'domain', item: d })}
        onDragStart={e => e.dataTransfer.setData('domain', d.id)}
        onDragOver={e => depth === 1 && e.preventDefault()}
        onDrop={e => { if (depth === 1) { e.preventDefault(); onDrop(e, d.id); } }}
        key={d.id}
      >
        <div className="domain-banner" style={{ backgroundColor: resolveDomainColor(d.color), color: domainTextColor(d.color) }}>
          <div className="domain-banner-title">
            <h3>{d.name}</h3>
            <span className="domain-meta">{d.code} · {caps.length} N1</span>
          </div>
          <div className="domain-actions">
            <button
              type="button"
              className="mini-action-trigger"
              aria-label={`Actions pour ${d.name}`}
              title="Actions du domaine"
              onClick={e => { e.stopPropagation(); openContextMenu(e, { type: 'domain', item: d }); }}
            >⋮</button>
          </div>
        </div>

        {depth === 1 ? (
          <div className="relations domain-relations">
            {apps.filter(a => relationIds(a).includes(d.id)).map(a => (
              <div className="rel" key={a.id} draggable onDragStart={e => e.dataTransfer.setData("app", a.id)}>
                <span>◈</span>{a.name}
                <button type="button" onClick={() => unassign(a.id, d.id)}>×</button>
              </div>
            ))}
            <div className="drop">Déposer une application ici</div>
          </div>
        ) : (
          <div className="caps-list">
            {caps.map(c => {
              const coverage = getCapCoverageState(c.id);
              const capItemClass = `cap${selected.includes(c.id) ? ' impact-selected' : ''}`;

              return (
                <div
                  className={capItemClass}
                  key={c.id}
                  onContextMenu={e => openContextMenu(e, { type: 'capability', item: c })}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => onDrop(e, c.id)}
                >
                  <div className="cap-head">
                    <b>{c.name}</b>
                    <button
                      type="button"
                      className="mini-action-trigger"
                      aria-label={`Renommer ${c.name}`}
                      title="Actions de la capacité"
                      onClick={e => { e.stopPropagation(); openContextMenu(e, { type: 'capability', item: c }); }}
                    >⋮</button>
                  </div>

                  <div className="cap-meta">
                    <span className="app-count">{coverage.count}</span>
                  </div>

                  <p className="cap-desc">{c.description || 'Aucune description'}</p>

                  <div className="relations">
                    {coverage.apps.map(a => (
                      <div className="rel" key={a.id} draggable onDragStart={e => e.dataTransfer.setData('app', a.id)}>
                        <span>◈</span><b>{a.name}</b> <small>({a.status})</small>
                        <button type="button" onClick={e => { e.stopPropagation(); unassign(a.id, c.id); }}>×</button>
                      </div>
                    ))}
                    <div className="drop">Déposer une application ici</div>
                  </div>
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
      <div className="map-row map-head" style={{ gridTemplateColumns: presentation ? `100px repeat(${columns.length}, minmax(0, 1fr))` : `120px repeat(${columns.length}, minmax(220px, 1fr))` }}>
        <div />
        {columns.map(col => <div className="col-head" key={col.id}>{col.name}</div>)}
      </div>
      {layers.map(layer => (
        <div className="map-row" key={layer.id} style={{ gridTemplateColumns: presentation ? `100px repeat(${columns.length}, minmax(0, 1fr))` : `120px repeat(${columns.length}, minmax(220px, 1fr))` }}>
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
                <button type="button" className={'cell-add' + (here.length ? '' : ' empty')} onClick={() => openNew('domain', null, { columnId: col.id, layerId: layer.id })}>＋ Ajouter un domaine ici</button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  return (
    <div className={'app' + (presentation ? ' presentation-mode' : '')}>
      <header>
        <div><div className="eyebrow">ENTERPRISE ARCHITECTURE</div><h1>Capacity Mapper</h1></div>
        <div className="toolbar">
          <div className="toolbar-switch">
            <button type="button" className={mode === 'editor' ? 'active' : ''} onClick={() => { setMode('editor'); setMapQuery(''); }}>▦ Cartographie</button>
            <button type="button" className={mode === 'impact' ? 'active' : ''} onClick={() => setMode('impact')}>⚡ Impact</button>
          </div>
          <div className="toolbar-actions">
            <button type="button" data-testid="undo-button" className="secondary history-button" aria-label="Annuler" title="Annuler (Ctrl+Z)" disabled={!historyState.canUndo} onClick={undo}>↶ Annuler</button>
            <button type="button" data-testid="redo-button" className="secondary history-button" aria-label="Rétablir" title="Rétablir (Ctrl+Y ou Ctrl+Maj+Z)" disabled={!historyState.canRedo} onClick={redo}>↷ Rétablir</button>
            <button type="button" className="secondary" onClick={() => setPresentation(v => !v)}>{presentation ? '↙ Quitter la présentation' : '⛶ Présentation'}</button>
            <button type="button" className="secondary" onClick={openWizard}>＋ Nouvelle cartographie</button>
            <button type="button" className="secondary" onClick={() => exportModel(model)}>↓ Export</button>
            <label className="button secondary">↑ Import<input hidden type="file" accept=".json,application/json" onChange={importJson} /></label>
          </div>
        </div>
      </header>

      <div className={'workspace ' + (inventoryCollapsed ? 'inventory-collapsed' : '')}>
        <aside id="app-inventory">
          <div className="panel-title">
            <span>Inventaire SI <em>{apps.length}</em></span>
            <button type="button" className="side-add" onClick={() => openNew('app')}>＋ Application</button>
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
          {mode === 'impact' ? (
            <section className="impact">
              <div className="hero">
                <div>
                  <div className="eyebrow">SIMULATION D'IMPACT</div>
                  <h2>Projet / fonctionnalité</h2>
                  <p>Sélectionnez les capacités métier sollicitées : on cherche « ce que l’entreprise doit savoir faire », pas une liste d’applications ou de processus.</p>
                </div>
                <div className="metric">
                  <strong>{selected.length}</strong>
                  <span>{relationLabel}s</span>
                </div>
                <div className="metric">
                  <strong>{touched.length}</strong>
                  <span>applications</span>
                </div>
                <div className="metric danger">
                  <strong>{gaps.length}</strong>
                  <span>gaps</span>
                </div>
              </div>

              <div className="impact-grid">
                <div className="impact-card">
                  <h3>Éléments sollicités</h3>
                  <p className="context-help">N0 : grand domaine métier. N1 : capacité détaillée et relativement stable.</p>
                  {mappedItems.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className={'cap-select ' + (selected.includes(c.id) ? 'selected' : '')}
                      aria-pressed={selected.includes(c.id)}
                      onClick={() => toggleCap(c.id)}
                    >
                      {selected.includes(c.id) ? '✓' : '○'} {c.code} — {c.name}
                    </button>
                  ))}
                </div>

                <div className="impact-card">
                  <h3>Applications impactées</h3>
                  {touched.length ? (
                    touched.map(a => (
                      <div className="result-row" key={a.id}>
                        <b>{a.name}</b>
                        <span>{a.status}</span>
                      </div>
                    ))
                  ) : (
                    <p className="empty">Aucune application impactée.</p>
                  )}

                  {gaps.length > 0 && (
                    <div className="gap-box">
                      <b>⚠ {gaps.length} gap(s) de couverture</b>
                      {gaps.map(c => (
                        <div key={c.id}>{c.code} — {c.name}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          ) : (
            <>
              <div className="map-controls-row">
                <button
                  type="button"
                  className="secondary inventory-toggle inventory-toggle-rail"
                  onClick={() => setInventoryCollapsed(v => !v)}
                  aria-label={inventoryCollapsed ? 'Afficher l’inventaire des applications' : 'Masquer l’inventaire des applications'}
                >
                  <span className="menu-glyph"></span>
                </button>
                <div className="map-filter-bar">
                  <label className="map-filter-control">
                    <span>Filtrer les domaines</span>
                    <input
                      data-testid="map-filter"
                      aria-label="Filtrer les domaines"
                      value={mapQuery}
                      onChange={e => setMapQuery(e.target.value)}
                      placeholder="Nom, code ou description"
                    />
                  </label>
                  <span className="filter-count" aria-live="polite">{visibleDomains.length} / {model.domains.length} domaines</span>
                </div>
                <div className="canvas-actions">
                  <button type="button" className="secondary" onClick={openLayoutEditor}>⚙ Structure</button>
                  <button type="button" className="help-icon" onClick={() => setGuideOpen(true)} title="Aide TOGAF">?</button>
                </div>
              </div>

              {matrixView}
            </>
          )}
        </main>
      </div>

      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={() => setContextMenu(null)}
        >
          {contextMenu.type === 'domain' && (
            <>
              {depth === 2 && <button type="button" onClick={e => { e.stopPropagation(); closeContextMenu(); openNew('capability', contextMenu.item.id); }}>＋ Ajouter N1</button>}
              <button type="button" onClick={e => { e.stopPropagation(); closeContextMenu(); openEditDomain(contextMenu.item); }}>Modifier</button>
              <button type="button" className="danger" onClick={e => { e.stopPropagation(); closeContextMenu(); removeDomain(contextMenu.item.id); }}>Supprimer</button>
            </>
          )}
          {contextMenu.type === 'capability' && (
            <>
              <button type="button" onClick={e => { e.stopPropagation(); closeContextMenu(); openEditCapability(contextMenu.item); }}>Renommer</button>
            </>
          )}
        </div>
      )}

      {status && <div className="toast">{status}</div>}
      {modal === 'wizard' && <NewMapWizard model={model} onCancel={closeWizard} onCreate={createMap} />}
      {guideOpen && <TogafGuide onClose={() => setGuideOpen(false)} />}

      {modal === 'layout' && layoutDraft && (
        <Modal title="Personnaliser la structure" onClose={() => setModal(null)}>
          <p className="structure-hint">Renommez les colonnes et les layers.</p>
          {[['columns', 'Colonnes'], ['layers', 'Layers']].map(([kind, title]) => (
            <section className="structure-section" key={kind}>
              <h3>{title}</h3>
              {layoutDraft[kind].map((item, index) => (
                <div className="structure-row" key={item.id}>
                  <label className="field">
                    <span>{title.slice(0, -1)} {index + 1}</span>
                    <input value={item.name} onChange={e => updateLayoutDraft(kind, item.id, e.target.value)} />
                  </label>
                  <button type="button" className="structure-remove" disabled={layoutDraft[kind].length === 1} onClick={() => removeLayoutItem(kind, item.id)}>Supprimer</button>
                </div>
              ))}
              <button type="button" className="structure-add" onClick={() => addLayoutItem(kind)}>＋ Ajouter {kind === 'columns' ? 'une colonne' : 'un layer'}</button>
            </section>
          ))}
          <section className="structure-section zone-editor">
            <h3>Zones de la matrice</h3>
            {layoutDraft.zones.map(zone => {
              const column = layoutDraft.columns.find(x => x.id === zone.columnId);
              const layer = layoutDraft.layers.find(x => x.id === zone.layerId);
              return (
                <label className="field zone-row" key={`${zone.columnId}:${zone.layerId}`} data-zone-key={`${zone.columnId}:${zone.layerId}`}>
                  <span>{column?.name} · {layer?.name}</span>
                  <input value={zone.name} onChange={e => updateZoneDraft(zone.columnId, zone.layerId, e.target.value)} />
                </label>
              );
            })}
          </section>
          <div className="modal-actions">
            <button type="button" onClick={() => setModal(null)}>Annuler</button>
            <button type="button" className="primary" onClick={saveLayout}>Enregistrer</button>
          </div>
        </Modal>
      )}

      {modal && modal !== 'layout' && modal !== 'wizard' && (
        <Modal
          title={modal === 'edit-capability' ? 'Renommer la capacité N1' : modal === 'domain' ? 'Nouveau domaine N0' : modal === 'edit-domain' ? 'Modifier le domaine N0' : modal === 'capability' ? 'Nouvelle capacité N1' : 'Nouvelle application'}
          onClose={() => setModal(null)}
        >
          {(modal === 'domain' || modal === 'edit-domain') && <div className="field-guidance"><b>N0 — Domaine métier</b><span>Regroupe un ensemble large de capacités.</span></div>}
          {(modal === 'capability' || modal === 'edit-capability') && <div className="field-guidance"><b>N1 — Capacité</b><span>Décrit ce que l’entreprise sait faire.</span></div>}

          <Field label="Nom" required error={formErrors.name} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />

          {modal !== 'edit-capability' && (
            <>
              <Field label="Code" required error={formErrors.code} value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
              {modal === 'capability' && (
                <label className={'field ' + (formErrors.domainId ? 'has-error' : '')}>
                  <span>Domaine <b className="required" aria-hidden="true">*</b></span>
                  <select value={form.domainId} onChange={e => setForm({ ...form, domainId: e.target.value })}>
                    {model.domains.map(d => <option value={d.id} key={d.id}>{d.code} — {d.name}</option>)}
                  </select>
                  {formErrors.domainId && <small className="field-error">{formErrors.domainId}</small>}
                </label>
              )}
              {(modal === 'domain' || modal === 'edit-domain') && (
                <>
                  <label className="field">
                    <span>Colonne</span>
                    <select value={form.columnId} onChange={e => setForm({ ...form, columnId: e.target.value })}>
                      {columns.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span>Ligne (layer)</span>
                    <select value={form.layerId} onChange={e => setForm({ ...form, layerId: e.target.value })}>
                      {layers.map(l => <option value={l.id} key={l.id}>{l.name}</option>)}
                    </select>
                  </label>
                  <label className={'field ' + (formErrors.columnSpan ? 'has-error' : '')}>
                    <span>Étendue sur les colonnes</span>
                    <select value={form.columnSpan} onChange={e => setForm({ ...form, columnSpan: e.target.value })}>
                      {columns.slice(Math.max(0, columns.findIndex(c => c.id === form.columnId))).map((c, i) => (
                        <option key={c.id} value={i + 1}>{i + 1} colonne{i ? 's' : ''}</option>
                      ))}
                    </select>
                    {formErrors.columnSpan && <small className="field-error">{formErrors.columnSpan}</small>}
                  </label>
                </>
              )}
              {modal === 'app' && (
                <>
                  <Field label="Éditeur / fournisseur" required error={formErrors.vendor} value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} />
                  <label className="field">
                    <span>Statut</span>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      <option>Actif</option>
                      <option>Cible</option>
                      <option>Obsolète</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Type</span>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                      <option>SaaS</option>
                      <option>ERP</option>
                      <option>On-Premise</option>
                      <option>Shadow IT</option>
                    </select>
                  </label>
                </>
              )}
              <Field label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </>
          )}

          {(modal === 'domain' || modal === 'edit-domain') && (
            <label className={'field domain-color-field ' + (formErrors.color ? 'has-error' : '')}>
              <span>Couleur du domaine N0</span>
              <span className="domain-color-palette" role="group" aria-label="Couleurs prédéfinies">
                {DOMAIN_COLOR_PALETTE.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    className="domain-color-swatch"
                    data-testid="domain-color-option"
                    data-color={color.value}
                    aria-label={color.name}
                    aria-pressed={resolveDomainColor(form.color) === color.value}
                    title={color.name}
                    style={{ '--swatch-color': color.value }}
                    onClick={() => setForm({ ...form, color: color.value })}
                  />
                ))}
              </span>
              <span className="domain-color-control">
                <input
                  type="color"
                  data-testid="domain-color"
                  aria-label="Couleur du domaine N0"
                  value={resolveDomainColor(form.color)}
                  onChange={e => setForm({ ...form, color: e.target.value })}
                />
                <input
                  type="text"
                  data-testid="domain-color-hex"
                  aria-label="Code couleur hexadécimal"
                  aria-invalid={!!formErrors.color}
                  maxLength="7"
                  value={form.color}
                  onChange={e => setForm({ ...form, color: e.target.value })}
                />
              </span>
              {formErrors.color && <small className="field-error">{formErrors.color}</small>}
            </label>
          )}

          <div className="modal-actions">
            <button type="button" onClick={() => setModal(null)}>Annuler</button>
            <button type="button" className="primary" onClick={save}>{modal === 'edit-domain' || modal === 'edit-capability' ? 'Enregistrer' : 'Créer'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default App;