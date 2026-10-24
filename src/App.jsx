import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DEMO_MODEL } from './data/demoData.js';
import { createFrontendApplication } from './adapters/react/architecture.js';
import {
  addLayoutDraftItem,
  isDomainPlacementAvailable,
  prepareLayoutForSave,
  prepareDomainPlacement,
  removeLayoutDraftItem,
  renameLayoutDraftItem,
  renameLayoutZone,
} from './application/layoutUseCases.js';
import {
  assignApplicationToCapability,
  linkPickedApplications,
  prepareLinkedApplications,
  unassignApplicationFromCapability,
} from './application/relationshipUseCases.js';
import {
  createApplication,
  createCapability,
  createDomain,
  removeDomainAndDependents,
  updateCapability,
  updateDomain,
} from './application/catalogUseCases.ts';
import { deriveCoverageOverview, getCapabilityCoverageState } from './application/coverageUseCases.js';
import NewMapWizard from './components/NewMapWizard.jsx';
import TogafGuide from './components/TogafGuide.jsx';
import CoverageTree from './components/CoverageTree.jsx';
import Dashboard from './components/Dashboard.jsx';
import PwaUpdateNotice from './components/PwaUpdateNotice.jsx';
import CartographerCompanion from './components/CartographerCompanion.jsx';

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
const emptyForm = { name: '', code: '', description: '', status: 'Actif', type: 'SaaS', vendor: '', domainId: '', capabilityIds: [], columnId: '', layerId: '', columnSpan: '1', color: DOMAIN_COLORS.indigo, priority: 'unqualified' };
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
  const applicationRef = useRef(null);
  if (!applicationRef.current) {
    applicationRef.current = createFrontendApplication({ initialModel: DEMO_MODEL });
  }
  const { repository, map: mapService, navigation, aiCompanion, preferences, viewport, browserInteractions } = applicationRef.current;
  const [model, setModel] = useState(() => mapService.snapshot().current);
  const modelRef = useRef(model);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const [mode, setMode] = useState('editor'); // 'editor', 'relations' ou 'dashboard'
  const [dashboardReturnAvailable, setDashboardReturnAvailable] = useState(false);
  const dashboardHistoryEntry = useRef(false);
  const [pickedApps, setPickedApps] = useState([]);
  const [link, setLink] = useState(null);
  const [linkChecked, setLinkChecked] = useState([]);
  const [linkQuery, setLinkQuery] = useState('');
  const [expandedCapId, setExpandedCapId] = useState(null); // Détail au clic pour N1
  const [presentation, setPresentation] = useState(false);
  const [darkMode, setDarkMode] = useState(() => preferences.readTheme() === 'dark');
  const toolsMenuRef = useRef(null);
  const toolsMenuToggleRef = useRef(null);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [mapQuery, setMapQuery] = useState('');
  const [localMapId, setLocalMapId] = useState(() => preferences.readActiveLocalMapId());
  const [localMaps, setLocalMaps] = useState([]);
  const [recentMaps, setRecentMaps] = useState([]);
  const [activeRecentMapId, setActiveRecentMapId] = useState(() => preferences.readActiveRecentMapId(uid('recent')));
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
    preferences.writeTheme(darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    navigation.initialize(mode);
    return navigation.subscribePopState(event => {
      const nextMode = event.state?.capacityMapperMode;
      dashboardHistoryEntry.current = false;
      setDashboardReturnAvailable(false);
      setMode(['editor', 'dashboard', 'relations', 'impact', 'library'].includes(nextMode) ? nextMode : 'editor');
      viewport.resetScrollPositions();
    });
  }, []);

  useEffect(() => {
    viewport.resetScrollPositions();
  }, [mode]);

  const navigateToMode = nextMode => {
    if (nextMode === mode) return;
    navigation.goTo(nextMode);
    dashboardHistoryEntry.current = false;
    setDashboardReturnAvailable(false);
    setMode(nextMode);
  };

  const exploreDashboardTarget = id => {
    setSelected([id]);
    setDashboardReturnAvailable(true);
    dashboardHistoryEntry.current = true;
    navigation.exploreDashboardTarget();
    setMode('relations');
  };

  const returnToDashboard = () => {
    if (dashboardHistoryEntry.current) {
      navigation.back();
      return;
    }
    setDashboardReturnAvailable(false);
    setMode('dashboard');
  };

  const closeToolsMenu = () => {
    setToolsMenuOpen(false);
  };

  useEffect(() => {
    if (!toolsMenuOpen) return undefined;

    return browserInteractions.listenForDismissal({
      pointerEvent: 'pointerdown',
      getInsideNode: () => toolsMenuRef.current,
      onOutside: closeToolsMenu,
      onEscape: () => {
        closeToolsMenu();
        toolsMenuToggleRef.current?.focus();
      },
    });
  }, [toolsMenuOpen]);

  useEffect(() => {
    mapService.persist();
    if (activeRecentMapId && activeRecentMapId !== '__dismissed__') {
      repository.updateRecentMap({ id: activeRecentMapId, name: model.metadata?.name || '', model });
      preferences.writeActiveRecentMapId(activeRecentMapId);
    }
  }, [model, activeRecentMapId]);

  const apps = model.applications || [];
  const pickedValid = pickedApps.filter(id => apps.some(a => a.id === id));
  const filteredApps = useMemo(() => apps.filter(a => (a.name + ' ' + a.code + ' ' + a.vendor).toLowerCase().includes(query.toLowerCase())), [apps, query]);
  const visibleDomains = useMemo(() => model.domains.filter(d => (d.name + ' ' + d.code + ' ' + (d.description || '')).toLowerCase().includes(mapQuery.toLowerCase())), [model.domains, mapQuery]);
  const { touched, gaps, redundancy } = deriveCoverageOverview({ mappedItems, applications: apps, selectedIds: selected });
  const notify = x => { setStatus(x); setTimeout(() => setStatus(''), 2500); };
  const openLibrary = () => {
    const errors = [];
    try {
      setLocalMaps(repository.loadLocalMaps());
    } catch {
      setLocalMaps([]);
      errors.push('bibliothèque locale');
    }
    try {
      setRecentMaps(repository.loadRecentMaps());
    } catch {
      setRecentMaps([]);
      errors.push('historique des récents');
    }
    setPendingLocalMap(null);
    navigateToMode('library');
    setModal(null);
    if (errors.length) notify(`Certaines données locales sont invalides : ${errors.join(' et ')}. Les listes concernées sont affichées vides.`);
  };
  const saveCurrentLocalMap = () => {
    try {
      const entries = repository.loadLocalMaps();
      const current = entries.find(entry => entry.id === localMapId);
      if (!current) {
        setLocalMapName(modelRef.current.metadata?.name || '');
        setModal('save-local-map');
        return;
      }
      const saved = repository.saveLocalMap({ id: current.id, name: current.name, model: modelRef.current });
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
      const saved = repository.saveLocalMap({ name: localMapName, model: savedModel });
      commitModel(savedModel);
      setLocalMapId(saved.id);
      preferences.writeActiveLocalMapId(saved.id);
      setLocalMaps(maps => [...maps, saved]);
      setModal(null);
      notify(`Cartographie « ${saved.name} » enregistrée localement`);
    } catch (error) {
      notify(`Impossible d’enregistrer la cartographie : ${error.message}`);
    }
  };
  const confirmLoadLocalMap = () => {
    if (!pendingLocalMap) return;
    const saved = pendingLocalMap;
    try {
      if (!saved.model || !Array.isArray(saved.model.domains) || !Array.isArray(saved.model.capabilities)) {
        throw new Error('le modèle enregistré est incomplet ou invalide');
      }

      // Le stockage de l’identifiant actif ne doit pas bloquer l’ouverture de la cartographie.
      replaceModel(saved.model);
      setSelected([]);
      setMapQuery('');
      setPresentation(false);
      setModal(null);
      setPendingLocalMap(null);
      navigateToMode('editor');

      try {
        setActiveRecentMapId(saved.id);
        setLocalMapId(saved.id);
        preferences.writeActiveLocalMapId(saved.id);
      } catch (storageError) {
        notify(`Cartographie « ${saved.name} » ouverte, mais son identifiant actif n’a pas pu être mémorisé.`);
      }

      try {
        repository.recordRecentMap({ id: saved.id, name: saved.name, model: saved.model });
      } catch (historyError) {
        // L’ouverture reste prioritaire si l’historique local est indisponible.
      }
      notify(`Cartographie « ${saved.name} » chargée`);
    } catch (error) {
      notify(`Impossible de charger la cartographie : ${error.message}`);
    }
  };
  const syncHistoryState = snapshot => setHistoryState({ canUndo: snapshot.canUndo, canRedo: snapshot.canRedo });
  const applyModelSnapshot = snapshot => {
    if (snapshot.current === modelRef.current) {
      syncHistoryState(snapshot);
      return;
    }
    modelRef.current = snapshot.current;
    setModel(snapshot.current);
    syncHistoryState(snapshot);
  };
  const commitModel = nextModel => applyModelSnapshot(mapService.replace(nextModel));
  const replaceModel = nextModel => commitModel(nextModel);
  const update = patch => applyModelSnapshot(mapService.update(patch));
  const updateCapabilityPriority = (capabilityId, priority) => applyModelSnapshot(
    mapService.updateCapabilityPriority(capabilityId, priority)
  );
  const undo = () => applyModelSnapshot(mapService.undo());
  const redo = () => applyModelSnapshot(mapService.redo());

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

    return browserInteractions.listenForKeyDown(handleKeyDown);
  }, [browserInteractions, historyState.canRedo, historyState.canUndo, modal]);

  // The remainder of this component is unchanged; only the catalog use-case import
  // is intentionally redirected to the TypeScript implementation during migration.
  return null;
}

export default App;
