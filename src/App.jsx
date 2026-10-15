import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DEMO_MODEL } from './data/demoData.js';
import { exportModel, importModel, loadLocalMaps, loadModel, loadRecentMaps, recordRecentMap, saveLocalMap as persistLocalMap, saveModel, updateRecentMap } from './services/storage.js';
import NewMapWizard from './components/NewMapWizard.jsx';
import TogafGuide from './components/TogafGuide.jsx';
import CoverageTree from './components/CoverageTree.jsx';

const SOURCE_URL_KEY = 'enterprise-capacity-mapper:source-url';
const ACTIVE_LOCAL_MAP_KEY = 'enterprise-capacity-mapper:active-local-map';
const ACTIVE_RECENT_MAP_KEY = 'enterprise-capacity-mapper:active-recent-map';
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
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
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
  const [mode, setMode] = useState('editor'); // 'editor', 'relations' ou 'impact'
  const [pickedApps, setPickedApps] = useState([]);
  const [link, setLink] = useState(null);
  const [linkChecked, setLinkChecked] = useState([]);
  const [linkQuery, setLinkQuery] = useState('');
  const [expandedCapId, setExpandedCapId] = useState(null); // Détail au clic pour N1
  const [presentation, setPresentation] = useState(false);
  const [inventoryCollapsed, setInventoryCollapsed] = useState(() => window.matchMedia('(max-width: 600px)').matches);
  const [mapQuery, setMapQuery] = useState('');
  const [sourceUrl, setSourceUrl] = useState(() => localStorage.getItem(SOURCE_URL_KEY) || '');
  const [localMapId, setLocalMapId] = useState(() => localStorage.getItem(ACTIVE_LOCAL_MAP_KEY) || '');
  const [localMaps, setLocalMaps] = useState([]);
  const [recentMaps, setRecentMaps] = useState([]);
  const [activeRecentMapId, setActiveRecentMapId] = useState(() => localStorage.getItem(ACTIVE_RECENT_MAP_KEY) || uid('recent'));
  const [localMapName, setLocalMapName] = useState('');
  const [pendingLocalMap, setPendingLocalMap] = useState(null);
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

  useEffect(() => {
    saveModel(model);
    updateRecentMap({ id: activeRecentMapId, name: model.metadata?.name || '', model });
    localStorage.setItem(ACTIVE_RECENT_MAP_KEY, activeRecentMapId);
  }, [model, activeRecentMapId]);

  const apps = model.applications || [];
  const pickedValid = pickedApps.filter(id => apps.some(a => a.id === id));
  const filteredApps = useMemo(() => apps.filter(a => (a.name + ' ' + a.code + ' ' + a.vendor).toLowerCase().includes(query.toLowerCase())), [apps, query]);
  const visibleDomains = useMemo(() => model.domains.filter(d => (d.name + ' ' + d.code + ' ' + (d.description || '')).toLowerCase().includes(mapQuery.toLowerCase())), [model.domains, mapQuery]);
  const touched = apps.filter(a => relationIds(a).some(id => selected.includes(id)));
  const gaps = mappedItems.filter(c => selected.includes(c.id) && !apps.some(a => relationIds(a).includes(c.id)));
  const redundancy = mappedItems.filter(c => apps.filter(a => relationIds(a).includes(c.id)).length > 1);
  const notify = x => { setStatus(x); setTimeout(() => setStatus(''), 2500); };
  const openLocalMaps = () => {
    try {
      setLocalMaps(loadLocalMaps());
      setRecentMaps(loadRecentMaps());
      setModal('local-maps');
    } catch (error) {
      notify(`Impossible de lire la bibliothèque locale : ${error.message}`);
    }
  };
  const saveCurrentLocalMap = () => {
    try {
      const entries = loadLocalMaps();
      const current = entries.find(entry => entry.id === localMapId);
      if (!current) {
        setLocalMapName(modelRef.current.metadata?.name || '');
        setModal('save-local-map');
        return;
      }
      const saved = persistLocalMap({ id: current.id, name: current.name, model: modelRef.current });
      setLocalMaps(entries.map(entry => entry.id === saved.id ? saved : entry));
      notify(`Cartographie « ${saved.name} » enregistrée localement`);
    } catch (error) {
      notify(`Impossible d’enregistrer la cartographie : ${error.message}`);
    }
  };
  const saveNamedLocalMap = () => {
    try {
      const currentModel = modelRef.current;
      const savedModel = { ...currentModel, metadata: { ...currentModel.metadata, name: localMapName.trim() } };
      const saved = persistLocalMap({ name: localMapName, model: savedModel });
      commitModel(savedModel);
      setLocalMapId(saved.id);
      localStorage.setItem(ACTIVE_LOCAL_MAP_KEY, saved.id);
      setLocalMaps(maps => [...maps, saved]);
      setModal(null);
      notify(`Cartographie « ${saved.name} » enregistrée localement`);
    } catch (error) {
      notify(`Impossible d’enregistrer la cartographie : ${error.message}`);
    }
  };
  const confirmLoadLocalMap = () => {
    if (!pendingLocalMap) return;
    try {
      replaceModel(pendingLocalMap.model);
      recordRecentMap({ id: pendingLocalMap.id, name: pendingLocalMap.name, model: pendingLocalMap.model });
      setActiveRecentMapId(pendingLocalMap.id);
      setLocalMapId(pendingLocalMap.id);
      localStorage.setItem(ACTIVE_LOCAL_MAP_KEY, pendingLocalMap.id);
      setSelected([]);
      setMapQuery('');
      setMode('editor');
      setPresentation(false);
      setModal(null);
      setPendingLocalMap(null);
      notify(`Cartographie « ${pendingLocalMap.name} » chargée`);
    } catch (error) {
      notify(`Impossible de charger la cartographie : ${error.message}`);
    }
  };
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
  // Auto-scroll pendant un glisser-déposer : le HTML5 DnD ne défile pas de façon fiable seul.
  useEffect(() => {
    const EDGE = 70;
    const MAX = 18;
    const scrollableAncestor = node => {
      for (let n = node; n && n !== document.body; n = n.parentElement) {
        const overflowY = getComputedStyle(n).overflowY;
        if (/(auto|scroll)/.test(overflowY) && n.scrollHeight > n.clientHeight + 1) return n;
      }
      return null;
    };
    const onDragOver = event => {
      if (!(event.target instanceof Element)) return;
      const el = scrollableAncestor(event.target);
      const rect = el ? el.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
      const top = Math.max(rect.top, 0);
      const bottom = Math.min(rect.bottom, window.innerHeight);
      let dy = 0;
      if (event.clientY < top + EDGE) dy = -MAX * Math.min(1, (top + EDGE - event.clientY) / EDGE);
      else if (event.clientY > bottom - EDGE) dy = MAX * Math.min(1, (event.clientY - (bottom - EDGE)) / EDGE);
      if (dy) (el || window).scrollBy(0, Math.round(dy));
    };
    const clearHover = () => document.querySelectorAll('.drop-over').forEach(node => node.classList.remove('drop-over'));
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('dragend', clearHover);
    document.addEventListener('drop', clearHover);
    return () => {
      document.removeEventListener('dragover', onDragOver);
      document.removeEventListener('dragend', clearHover);
      document.removeEventListener('drop', clearHover);
    };
  }, []);

  const openContextMenu = (event, menu) => {
    event.preventDefault();
    event.stopPropagation();
    const menuWidth = 180;
    const menuHeight = menu.type === 'domain' ? 168 : 96;
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
    setActiveRecentMapId(uid('recent'));
    setLocalMapId('');
    localStorage.removeItem(ACTIVE_LOCAL_MAP_KEY);
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
  const hoverOn = e => { e.preventDefault(); e.currentTarget.classList.add('drop-over'); };
  const hoverOff = e => { if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.classList.remove('drop-over'); };
  const onDrop = (e, capId) => { e.preventDefault(); e.currentTarget.classList.remove('drop-over'); const id = e.dataTransfer.getData('app'); if (id) assign(id, capId); };

  const togglePicked = id => setPickedApps(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const linkPicked = targetId => {
    const ids = new Set(pickedValid);
    if (!ids.size) return;
    update({ applications: apps.map(a => ids.has(a.id) ? { ...a, capabilityIds: Array.from(new Set([...relationIds(a), targetId])) } : a) });
    setPickedApps([]);
    notify(`${ids.size} application(s) reliée(s)`);
  };
  const openLinkForTarget = item => {
    setLink({ kind: 'target', id: item.id, name: item.name });
    setLinkChecked(apps.filter(a => relationIds(a).includes(item.id)).map(a => a.id));
    setLinkQuery('');
    setModal('link');
  };
  const openLinkForApp = app => {
    setLink({ kind: 'app', id: app.id, name: app.name });
    setLinkChecked(relationIds(app).filter(id => mappedItems.some(m => m.id === id)));
    setLinkQuery('');
    setModal('link');
  };
  const closeLink = () => { setModal(null); setLink(null); };
  const toggleLinkChecked = id => setLinkChecked(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]);
  const saveLink = () => {
    if (!link) return;
    const checked = new Set(linkChecked);
    const mappedIds = new Set(mappedItems.map(m => m.id));
    const nextApps = apps.map(a => {
      const current = relationIds(a);
      if (link.kind === 'target') {
        const has = current.includes(link.id);
        if (checked.has(a.id) === has) return a;
        return { ...a, capabilityIds: checked.has(a.id) ? [...current, link.id] : current.filter(x => x !== link.id) };
      }
      if (a.id !== link.id) return a;
      const kept = current.filter(id => !mappedIds.has(id));
      const next = [...kept, ...mappedItems.filter(m => checked.has(m.id)).map(m => m.id)];
      return next.length === current.length && next.every(id => current.includes(id)) ? a : { ...a, capabilityIds: next };
    });
    if (nextApps.some((a, i) => a !== apps[i])) update({ applications: nextApps });
    notify('Relations mises à jour');
    closeLink();
  };

  const importJson = async e => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      replaceModel(await importModel(f));
      setActiveRecentMapId(uid('recent'));
      setLocalMapId('');
      localStorage.removeItem(ACTIVE_LOCAL_MAP_KEY);
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
        onDragOver={e => { if (depth === 1) hoverOn(e); }}
        onDragLeave={e => { if (depth === 1) hoverOff(e); }}
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
                  onDragOver={hoverOn}
                  onDragLeave={hoverOff}
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

  const linkMatch = text => text.toLowerCase().includes(linkQuery.trim().toLowerCase());
  const linkOption = (id, title, sub) => (
    <label className="link-option" key={id}>
      <input type="checkbox" checked={linkChecked.includes(id)} onChange={() => toggleLinkChecked(id)} />
      <span><b>{title}</b>{sub && <small>{sub}</small>}</span>
    </label>
  );
  let linkOptions = null;
  if (link?.kind === 'target') {
    const list = apps.filter(a => linkMatch(`${a.name} ${a.code} ${a.vendor || ''}`));
    linkOptions = list.length ? list.map(a => linkOption(a.id, a.name, `${a.code} · ${a.status}`)) : <p className="local-map-empty">Aucune application.</p>;
  } else if (link?.kind === 'app') {
    const groups = (depth === 1 ? [{ d: null, items: model.domains }] : model.domains.map(d => ({ d, items: model.capabilities.filter(c => c.domainId === d.id) })))
      .map(g => ({ ...g, items: g.items.filter(i => linkMatch(`${i.code} ${i.name}`)) }))
      .filter(g => g.items.length);
    linkOptions = groups.length ? groups.map(g => (
      <div className="link-group" key={g.d?.id || 'flat'}>
        {g.d && <h4>{g.d.code} — {g.d.name}</h4>}
        {g.items.map(i => linkOption(i.id, i.name, i.code))}
      </div>
    )) : <p className="local-map-empty">Aucun élément.</p>;
  }

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
                <div className="cell-column-label">{col.name}</div>
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
            <button type="button" className={mode === 'relations' ? 'active' : ''} data-testid="tab-relations" onClick={() => setMode('relations')}>⛓ Relations</button>
            <button type="button" className={mode === 'impact' ? 'active' : ''} onClick={() => setMode('impact')}>⚡ Impact</button>
          </div>
          <div className="toolbar-actions">
            <button type="button" data-testid="undo-button" className="secondary history-button" aria-label="Annuler" title="Annuler (Ctrl+Z)" disabled={!historyState.canUndo} onClick={undo}>↶ Annuler</button>
            <button type="button" data-testid="redo-button" className="secondary history-button" aria-label="Rétablir" title="Rétablir (Ctrl+Y ou Ctrl+Maj+Z)" disabled={!historyState.canRedo} onClick={redo}>↷ Rétablir</button>
            <button type="button" className="secondary" onClick={() => setPresentation(v => !v)}>{presentation ? '↙ Quitter la présentation' : '⛶ Présentation'}</button>
            <button type="button" className="secondary new-map-button" data-testid="new-map-button" onClick={openWizard}>
              <span className="new-map-button-mark" aria-hidden="true">+</span>
              <span>Nouvelle cartographie</span>
            </button>
            <button type="button" className="secondary" data-testid="open-local-maps" onClick={openLocalMaps}>▤ Mes cartographies</button>
            <button type="button" className="primary" data-testid="save-local-map" onClick={saveCurrentLocalMap}>Enregistrer</button>
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
          <div className="hint">Glissez une application vers une capacité, ou cochez-en plusieurs puis utilisez « Relier ici » dans l’onglet Relations. Le bouton « Relier à… » permet de relier sans glisser-déposer.</div>
          {pickedValid.length > 0 && (
            <div className="picked-bar" role="status" data-testid="picked-bar">
              <span>{pickedValid.length} sélectionnée(s)</span>
              <button type="button" onClick={() => setPickedApps([])}>Tout désélectionner</button>
            </div>
          )}
          {filteredApps.map(a => (
            <div key={a.id} className={'app-item' + (pickedValid.includes(a.id) ? ' picked' : '')} draggable onDragStart={e => e.dataTransfer.setData('app', a.id)}>
              <input type="checkbox" className="app-pick" aria-label={`Sélectionner ${a.name}`} checked={pickedValid.includes(a.id)} onChange={() => togglePicked(a.id)} />
              <div className="app-main"><b>{a.name}</b><small>{a.code} · {a.vendor || '—'}</small></div>
              <div className="app-side">
                <span className={'badge ' + a.status.toLowerCase().replace('é', 'e')}>{a.status}</span>
                <button type="button" className="app-link" aria-label={`Relier ${a.name} à des ${depth === 1 ? 'domaines N0' : 'capacités N1'}`} onClick={() => openLinkForApp(a)}>Relier à…</button>
              </div>
            </div>
          ))}
        </aside>

        <main>
          {mode === 'relations' ? (
            <CoverageTree
              domains={model.domains}
              capabilities={model.capabilities}
              apps={apps}
              depth={depth}
              colorOf={resolveDomainColor}
              pickedCount={pickedValid.length}
              onAssign={assign}
              onUnassign={unassign}
              onLinkPicked={linkPicked}
              onOpenLink={openLinkForTarget}
            />
          ) : mode === 'impact' ? (
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
                  title={inventoryCollapsed ? 'Afficher l’inventaire des applications' : 'Masquer l’inventaire des applications'}
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
              {depth === 1 && <button type="button" onClick={e => { e.stopPropagation(); closeContextMenu(); openLinkForTarget(contextMenu.item); }}>Relier des applications…</button>}
              <button type="button" onClick={e => { e.stopPropagation(); closeContextMenu(); openEditDomain(contextMenu.item); }}>Modifier</button>
              <button type="button" className="danger" onClick={e => { e.stopPropagation(); closeContextMenu(); removeDomain(contextMenu.item.id); }}>Supprimer</button>
            </>
          )}
          {contextMenu.type === 'capability' && (
            <>
              <button type="button" onClick={e => { e.stopPropagation(); closeContextMenu(); openLinkForTarget(contextMenu.item); }}>Relier des applications…</button>
              <button type="button" onClick={e => { e.stopPropagation(); closeContextMenu(); openEditCapability(contextMenu.item); }}>Renommer</button>
            </>
          )}
        </div>
      )}

      {status && <div className="toast">{status}</div>}
      {modal === 'wizard' && <NewMapWizard model={model} onCancel={closeWizard} onCreate={createMap} />}
      {guideOpen && <TogafGuide onClose={() => setGuideOpen(false)} />}

      {modal === 'save-local-map' && (
        <Modal title="Enregistrer dans Mes cartographies" onClose={() => setModal(null)}>
          <p className="structure-hint">Cette cartographie sera conservée dans le navigateur et pourra être ouverte depuis cette application.</p>
          <Field
            label="Nom de la cartographie"
            required
            data-testid="local-map-name"
            value={localMapName}
            onChange={event => setLocalMapName(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter' && localMapName.trim()) saveNamedLocalMap(); }}
          />
          <div className="modal-actions">
            <button type="button" onClick={() => setModal(null)}>Annuler</button>
            <button type="button" className="primary" disabled={!localMapName.trim()} onClick={saveNamedLocalMap}>Enregistrer</button>
          </div>
        </Modal>
      )}

      {modal === 'local-maps' && (
        <Modal title="Mes cartographies" onClose={() => setModal(null)}>
          <h3 className="local-map-section-title">Récemment ouvertes</h3>
          {recentMaps.length ? (
            <div className="local-map-list" data-testid="recent-maps-list">
              {recentMaps.map(saved => (
                <div className="local-map-row" key={saved.id}>
                  <div>
                    <strong>{saved.name}</strong>
                    <span>{saved.model.domains.length} domaines N0 · {saved.model.capabilities.length} capacités N1 · {saved.model.applications.length} applications</span>
                  </div>
                  <button type="button" className="secondary" onClick={() => { setPendingLocalMap(saved); setModal('confirm-local-map'); }}>Ouvrir</button>
                </div>
              ))}
            </div>
          ) : <p className="local-map-empty">Aucune cartographie récente.</p>}
          <h3 className="local-map-section-title">Cartographies enregistrées</h3>
          {localMaps.length ? (
            <div className="local-map-list" data-testid="saved-maps-list">
              {localMaps.map(saved => (
                <div className="local-map-row" key={saved.id}>
                  <div>
                    <strong>{saved.name}</strong>
                    <span>{saved.model.domains.length} domaines N0 · {saved.model.capabilities.length} capacités N1 · {saved.model.applications.length} applications</span>
                  </div>
                  <button type="button" className="secondary" onClick={() => { setPendingLocalMap(saved); setModal('confirm-local-map'); }}>Ouvrir</button>
                </div>
              ))}
            </div>
          ) : <p className="local-map-empty">Aucune sauvegarde nommée. Utilisez « Sauvegarder » pour en ajouter une.</p>}
          <div className="modal-actions">
            <button type="button" className="primary" onClick={saveCurrentLocalMap}>Sauvegarder la cartographie actuelle</button>
          </div>
        </Modal>
      )}

      {modal === 'confirm-local-map' && pendingLocalMap && (
        <Modal title="Ouvrir une cartographie" onClose={() => { setModal('local-maps'); setPendingLocalMap(null); }}>
          <p>Ouvrir « {pendingLocalMap.name} » remplacera la cartographie actuellement affichée. Enregistrez vos dernières modifications avant de continuer si nécessaire.</p>
          <div className="modal-actions">
            <button type="button" onClick={() => { setModal('local-maps'); setPendingLocalMap(null); }}>Annuler</button>
            <button type="button" className="primary" data-testid="confirm-load-local-map" onClick={confirmLoadLocalMap}>Ouvrir la cartographie</button>
          </div>
        </Modal>
      )}

      {modal === 'link' && link && (
        <Modal
          title={link.kind === 'target' ? `Relier des applications à « ${link.name} »` : `Relier « ${link.name} » à des ${depth === 1 ? 'domaines N0' : 'capacités N1'}`}
          onClose={closeLink}
        >
          <p className="structure-hint">Cochez les {link.kind === 'target' ? 'applications qui supportent' : depth === 1 ? 'domaines supportés par' : 'capacités supportées par'} {link.kind === 'target' ? `ce ${relationLabel}` : 'cette application'}. Décochez pour retirer une relation.</p>
          <input className="search" aria-label="Rechercher dans la liste" placeholder="Rechercher…" value={linkQuery} onChange={e => setLinkQuery(e.target.value)} />
          <div className="link-list" data-testid="link-list">
            {linkOptions}
          </div>
          <div className="modal-actions">
            <button type="button" onClick={closeLink}>Annuler</button>
            <button type="button" className="primary" data-testid="link-save" onClick={saveLink}>Enregistrer</button>
          </div>
        </Modal>
      )}

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

      {['domain', 'edit-domain', 'capability', 'edit-capability', 'app'].includes(modal) && (
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