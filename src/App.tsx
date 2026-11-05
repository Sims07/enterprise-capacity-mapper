import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DEMO_MODEL } from './data/demoData.ts';
import { MATURITY_LEVELS } from './domain/capabilityAssessment.ts';
import { analyzeCapabilityGaps } from './domain/capabilityGaps.ts';
import { capabilityMapReadout, MAP_READING_MODES, type MapReadingMode } from './application/capabilityMapReadout.ts';
import { presentationCapabilitySignal, PRESENTATION_READING_OPTIONS, type PresentationReadingMode } from './application/presentationReadout.ts';
import { downloadDecisionReview } from './adapters/browser/decisionReviewDownload.ts';
import type { CapabilityAssessment, CatalogModel } from './domain/catalogModel.ts';
import { createFrontendApplication } from './adapters/react/architecture.ts';
import {
  addLayoutDraftItem,
  isDomainPlacementAvailable,
  prepareLayoutForSave,
  prepareDomainPlacement,
  removeLayoutDraftItem,
  renameLayoutDraftItem,
  renameLayoutZone,
} from './application/layoutUseCases.ts';
import {
  assignApplicationToCapability,
  linkPickedApplications,
  prepareLinkedApplications,
  unassignApplicationFromCapability,
} from './application/relationshipUseCases.ts';
import {
  createApplication,
  updateApplication,
  createCapability,
  createDomain,
  removeDomainAndDependents,
  updateCapability,
  updateDomain,
} from './application/catalogUseCases.ts';
import { deriveCoverageOverview, getCapabilityCoverageState } from './application/coverageUseCases.ts';
import { isCurrentApplication } from './domain/coverage.ts';
import NewMapWizard from './components/NewMapWizard.tsx';
import TogafGuide from './components/TogafGuide.tsx';
import CoverageTree from './components/CoverageTree.tsx';
import Dashboard from './components/Dashboard.tsx';
import PwaUpdateNotice from './components/PwaUpdateNotice.tsx';
import CartographerCompanion from './components/CartographerCompanion.tsx';
import { publishPresentationUpdate, publishPresentationView, subscribeToPresentationUpdates, type PresentationViewState } from './adapters/browser/presentationSync.ts';

const LOCAL_AUTOSAVE_DELAY_MS = 450;
const PRESENTATION_APP_PREVIEW_LIMIT = 2;

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
const mixDomainColor = (foreground, background, amount) => {
  const foregroundHex = resolveDomainColor(foreground).slice(1);
  const backgroundHex = resolveDomainColor(background).slice(1);
  const channels = [0, 2, 4].map(index => {
    const front = Number.parseInt(foregroundHex.slice(index, index + 2), 16);
    const back = Number.parseInt(backgroundHex.slice(index, index + 2), 16);
    return Math.round(back + (front - back) * amount).toString(16).padStart(2, '0');
  });
  return `#${channels.join('')}`;
};
const emptyForm = { name: '', code: '', description: '', status: 'Actif', type: 'SaaS', vendor: '', domainId: '', capabilityIds: [], columnId: '', layerId: '', columnSpan: '1', color: DOMAIN_COLORS.indigo, priority: 'unqualified', assessment: { functionalCoverage: 'unknown' as CapabilityAssessment['functionalCoverage'], currentMaturity: undefined as number | undefined, targetMaturity: undefined as number | undefined, rationale: '' } };
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

function Field({ label, required = false, error = undefined, ...p }) {
  return (
    <label className={'field ' + (error ? 'has-error' : '')}>
      <span>{label}{required && <b className="required" aria-hidden="true"> *</b>}</span>
      <input aria-required={required} aria-invalid={!!error} {...p} />
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

function App({ experienceKind = 'desktop' }: { experienceKind?: 'desktop' | 'mobile' } = {}) {
  const applicationRef = useRef(null);
  if (!applicationRef.current) {
    applicationRef.current = createFrontendApplication({ initialModel: DEMO_MODEL });
  }
  const { repository, map: mapService, navigation, aiCompanion, preferences, companionPreferences, viewport, browserInteractions } = applicationRef.current;
  const [model, setModel] = useState(() => mapService.snapshot().current);
  const [capabilityReference, setCapabilityReference] = useState(null);
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
  const isPresentationWindow = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('view') === 'presentation';
  const [presentation, setPresentation] = useState(isPresentationWindow);
  const [presentationControlsVisible, setPresentationControlsVisible] = useState(true);
  const [presentationActivity, setPresentationActivity] = useState(0);
  const [darkMode, setDarkMode] = useState(() => preferences.readTheme() === 'dark');
  const toolsMenuRef = useRef(null);
  const toolsMenuToggleRef = useRef(null);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [mapQuery, setMapQuery] = useState('');
  const [mapReadingMode, setMapReadingMode] = useState<MapReadingMode>('applications');
  const [presentationReadingMode, setPresentationReadingMode] = useState<PresentationReadingMode>('identity');
  const [presentationShowApplications, setPresentationShowApplications] = useState(false);
  const [presentationFocusedCapabilityId, setPresentationFocusedCapabilityId] = useState<string | null>(null);
  const [presentationFocusedDomainId, setPresentationFocusedDomainId] = useState<string | null>(null);
  const [presentationDirectorOpen, setPresentationDirectorOpen] = useState(false);
  const [directorView, setDirectorView] = useState<PresentationViewState>({
    readingMode: 'identity', showApplications: false, focusedDomainId: null,
  });
  const [localMapId, setLocalMapId] = useState(() => preferences.readActiveLocalMapId());
  const [autoSaveState, setAutoSaveState] = useState<'draft' | 'saving' | 'saved' | 'error'>('draft');
  const [workingCopySaveError, setWorkingCopySaveError] = useState(false);
  const lastSavedLocalSnapshotRef = useRef<{ id: string; json: string } | null>(null);
  const [localMaps, setLocalMaps] = useState([]);
  const [recentMaps, setRecentMaps] = useState([]);
  const [activeRecentMapId, setActiveRecentMapId] = useState(() => preferences.readActiveRecentMapId(uid('recent')));
  const [localMapName, setLocalMapName] = useState('');
  const [pendingLocalMap, setPendingLocalMap] = useState(null);
  const [selected, setSelected] = useState([]);
  const [pendingCompanionEvidence, setPendingCompanionEvidence] = useState(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [modal, setModal] = useState(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [editingDomainId, setEditingDomainId] = useState(null);
  const [editingCapabilityId, setEditingCapabilityId] = useState(null);
  const [editingApplicationId, setEditingApplicationId] = useState(null);
  const [layoutDraft, setLayoutDraft] = useState(null);
  const [showMosaicInventory, setShowMosaicInventory] = useState(false);

  const depth = model.layout?.depth === 1 ? 1 : 2;
  const mappedItems = depth === 1 ? model.domains : model.capabilities;
  const relationIds = item => item.capabilityIds || [];
  const relationLabel = depth === 1 ? 'domaine N0' : 'capacité N1';

  useEffect(() => {
    preferences.writeTheme(darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    if (!presentation) {
      setPresentationControlsVisible(true);
      return undefined;
    }
    const revealControls = (event?: Event) => {
      // Ne pas remonter App pendant l'activation d'une N1 :
      // pointerdown comme focusin précèdent click et DomainCard est recréé au rendu.
      if (event?.target instanceof Element && event.target.closest('.mosaic-domain .cap[role="button"]')) return;
      if (document.activeElement?.closest('.mosaic-domain .cap[role="button"]')) return;
      setPresentationControlsVisible(true);
      setPresentationActivity(value => value + 1);
    };
    const exitPresentation = event => {
      revealControls();
      if (event.key === 'Escape') {
        if (presentationFocusedCapabilityId) setPresentationFocusedCapabilityId(null);
        else togglePresentation(false);
      }
    };
    window.addEventListener('pointermove', revealControls, { passive: true });
    window.addEventListener('pointerdown', revealControls);
    window.addEventListener('keydown', exitPresentation);
    window.addEventListener('focusin', revealControls);
    return () => {
      window.removeEventListener('pointermove', revealControls);
      window.removeEventListener('pointerdown', revealControls);
      window.removeEventListener('keydown', exitPresentation);
      window.removeEventListener('focusin', revealControls);
    };
  }, [presentation, presentationFocusedCapabilityId]);

  useEffect(() => {
    if (!presentation || !presentationControlsVisible) return undefined;
    const timeout = window.setTimeout(() => setPresentationControlsVisible(false), 3000);
    return () => window.clearTimeout(timeout);
  }, [presentation, presentationActivity, presentationControlsVisible]);

  useEffect(() => {
    navigation.initialize(mode);
    return navigation.subscribePopState(state => {
      const nextMode = state?.capacityMapperMode;
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

  const openBusinessDiagnosis = () => {
    navigateToMode('dashboard');
    window.history.replaceState(
      { ...(window.history.state || {}), capacityMapperMode: 'dashboard', capacityMapperDashboardView: 'attention' },
      '', window.location.href,
    );
  };
  const showCapabilityOnMap = capabilityId => {
    setMapReadingMode('gaps');
    setPendingCompanionEvidence({ id: capabilityId, type: 'capability' });
    navigateToMode('editor');
  };

  const navigateToCompanionEvidence = evidence => {
    if (!evidence?.id) return;
    setPendingCompanionEvidence({ id: evidence.id, type: evidence.type });
    if (evidence.type === 'application') {
      setSelected([]);
      setQuery(String(evidence.name || ''));
    } else {
      setSelected([evidence.id]);
    }
    navigateToMode('editor');
  };

  useEffect(() => {
    if (!pendingCompanionEvidence || mode !== 'editor') return;
    const { id } = pendingCompanionEvidence;
    const target = Array.from(document.querySelectorAll('[data-entity-id]'))
      .find(element => element.getAttribute('data-entity-id') === id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      const focusTarget = target.querySelector('button');
      focusTarget?.focus({ preventScroll: true });
    }
    setPendingCompanionEvidence(null);
  }, [mode, pendingCompanionEvidence, model]);

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

  const presentationSourceId = useRef(`window-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const updateDirectorView = (patch: Partial<PresentationViewState>) => {
    const next = { ...directorView, ...patch };
    setDirectorView(next);
    publishPresentationView({ sourceId: presentationSourceId.current, view: next });
  };
  const publishLocalPresentationView = (patch: Partial<PresentationViewState>) => {
    publishPresentationView({
      sourceId: presentationSourceId.current,
      view: {
        readingMode: presentationReadingMode,
        showApplications: presentationShowApplications,
        focusedDomainId: presentationFocusedDomainId,
        ...patch,
      },
    });
  };
  const stepDirectorDomain = (step: -1 | 1) => {
    if (!model.domains.length) return;
    const current = model.domains.findIndex(domain => domain.id === directorView.focusedDomainId);
    const index = Math.min(model.domains.length - 1, Math.max(0, (current < 0 ? (step > 0 ? -1 : model.domains.length) : current) + step));
    updateDirectorView({ focusedDomainId: model.domains[index].id });
  };

  const togglePresentation = enabled => {
    if (isPresentationWindow) {
      if (!enabled) {
        window.close();
        if (!window.closed) {
          const editorUrl = new URL(window.location.href);
          editorUrl.searchParams.delete('view');
          window.location.assign(editorUrl.toString());
        }
      }
      return;
    }
    if (!enabled) return;
    mapService.persist();
    const presentationUrl = new URL(window.location.href);
    presentationUrl.searchParams.set('view', 'presentation');
    const presentationWindow = window.open(presentationUrl.toString(), '_blank');
    if (presentationWindow) presentationWindow.opener = null;
    else notify('La fenêtre de présentation a été bloquée par le navigateur. Autorisez les fenêtres contextuelles pour ce site.');
  };

  useEffect(() => {
    return subscribeToPresentationUpdates({
      sourceId: presentationSourceId.current,
      onUpdate: () => {
        if (!isPresentationWindow) return;
        const latest = mapService.load(modelRef.current);
        modelRef.current = latest;
        setModel(latest);
        syncHistoryState(mapService.snapshot());
      },
      onView: view => {
        if (isPresentationWindow) {
          setPresentationReadingMode(view.readingMode);
          setPresentationShowApplications(view.showApplications);
          setPresentationFocusedDomainId(
            view.focusedDomainId && modelRef.current.domains.some(domain => domain.id === view.focusedDomainId)
              ? view.focusedDomainId : null,
          );
          setPresentationFocusedCapabilityId(null);
        } else {
          setDirectorView(view);
        }
      },
    });
  }, [isPresentationWindow]);

  // La copie de travail permet de retrouver un brouillon après rechargement, même
  // avant son ajout à la bibliothèque. Un échec ne doit pas faire planter React.
  const persistWorkingCopy = () => {
    try {
      mapService.persist();
      if (activeRecentMapId && activeRecentMapId !== '__dismissed__') {
        repository.updateRecentMap({ id: activeRecentMapId, name: modelRef.current.metadata?.name || '', model: modelRef.current });
        preferences.writeActiveRecentMapId(activeRecentMapId);
      }
      setWorkingCopySaveError(false);
      return true;
    } catch {
      setWorkingCopySaveError(true);
      return false;
    }
  };

  useEffect(() => {
    if (!isPresentationWindow && persistWorkingCopy()) {
      publishPresentationUpdate({ sourceId: presentationSourceId.current });
    }
  }, [model, activeRecentMapId, isPresentationWindow]);

  const persistLocalSnapshot = (id: string, snapshot: CatalogModel) => {
    const current = repository.loadLocalMaps().find(entry => entry.id === id);
    if (!current) throw new Error('La cartographie ne se trouve plus dans la bibliothèque locale.');
    const saved = repository.saveLocalMap({ id: current.id, name: current.name, model: snapshot });
    lastSavedLocalSnapshotRef.current = { id: saved.id, json: JSON.stringify(snapshot) };
    setLocalMaps(entries => entries.map(entry => entry.id === saved.id ? saved : entry));
    setAutoSaveState('saved');
    return saved;
  };

  // Lors d'un changement de cartographie, enregistrer immédiatement la dernière
  // modification au lieu d'annuler silencieusement le délai de regroupement.
  const flushCurrentLocalMap = () => {
    if (!localMapId) return true;
    const json = JSON.stringify(modelRef.current);
    if (lastSavedLocalSnapshotRef.current?.id === localMapId && lastSavedLocalSnapshotRef.current.json === json) return true;
    try {
      persistLocalSnapshot(localMapId, modelRef.current);
      return true;
    } catch {
      setAutoSaveState('error');
      notify('Sauvegarde impossible : les modifications restent ouvertes. Réessayez ou exportez en JSON avant de changer de cartographie.');
      return false;
    }
  };

  // Ne pas écrire à nouveau une cartographie identique. Les modifications rapides
  // restent regroupées ; le dernier snapshot du modèle est la source de vérité.
  useEffect(() => {
    if (isPresentationWindow) return undefined;
    if (!localMapId) {
      setAutoSaveState('draft');
      return undefined;
    }
    const json = JSON.stringify(model);
    if (lastSavedLocalSnapshotRef.current?.id === localMapId && lastSavedLocalSnapshotRef.current.json === json) {
      setAutoSaveState('saved');
      return undefined;
    }
    try {
      const current = repository.loadLocalMaps().find(entry => entry.id === localMapId);
      if (!current) {
        setAutoSaveState('error');
        return undefined;
      }
      if (JSON.stringify(current.model) === json) {
        lastSavedLocalSnapshotRef.current = { id: localMapId, json };
        setAutoSaveState('saved');
        return undefined;
      }
    } catch {
      setAutoSaveState('error');
      return undefined;
    }

    setAutoSaveState('saving');
    const timeout = window.setTimeout(() => {
      if (lastSavedLocalSnapshotRef.current?.id === localMapId && lastSavedLocalSnapshotRef.current.json === json) {
        setAutoSaveState('saved');
        return;
      }
      try {
        persistLocalSnapshot(localMapId, model);
      } catch {
        setAutoSaveState('error');
      }
    }, LOCAL_AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(timeout);
  }, [model, localMapId, isPresentationWindow]);

  // Le navigateur peut fermer ou masquer l'onglet avant la fin du debounce.
  useEffect(() => {
    if (isPresentationWindow) return undefined;
    const flushOnLeave = () => {
      if (!localMapId) return;
      const json = JSON.stringify(modelRef.current);
      if (lastSavedLocalSnapshotRef.current?.id === localMapId && lastSavedLocalSnapshotRef.current.json === json) return;
      try {
        persistLocalSnapshot(localMapId, modelRef.current);
      } catch {
        setAutoSaveState('error');
      }
    };
    const flushOnHidden = () => {
      if (document.visibilityState === 'hidden') flushOnLeave();
    };
    window.addEventListener('pagehide', flushOnLeave);
    document.addEventListener('visibilitychange', flushOnHidden);
    return () => {
      window.removeEventListener('pagehide', flushOnLeave);
      document.removeEventListener('visibilitychange', flushOnHidden);
    };
  }, [localMapId, isPresentationWindow]);

  const apps = model.applications || [];
  const presentationFocusedCapability = presentation ? model.capabilities.find(item => item.id === presentationFocusedCapabilityId) : undefined;
  const capabilityFindings = useMemo(() => new Map(analyzeCapabilityGaps(model).map(finding => [finding.id, finding])), [model]);
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
    errors.push(...(repository.consumeStorageRecoveryWarnings?.() ?? []));
    setPendingLocalMap(null);
    navigateToMode('library');
    setModal(null);
    if (errors.length) notify(`Certaines données locales sont invalides : ${errors.join(' et ')}. Les listes concernées sont affichées vides.`);
  };
  const saveCurrentLocalMap = () => {
    try {
      if (!localMapId || !repository.loadLocalMaps().some(entry => entry.id === localMapId)) {
        setLocalMapName(modelRef.current.metadata?.name || '');
        setModal('save-local-map');
        return;
      }
      const saved = persistLocalSnapshot(localMapId, modelRef.current);
      const workingCopySaved = persistWorkingCopy();
      notify(workingCopySaved
        ? `Cartographie « ${saved.name} » enregistrée sur cet appareil`
        : 'Cartographie enregistrée dans la bibliothèque, mais la copie de travail n’a pas pu être mise à jour.');
    } catch (error) {
      setAutoSaveState('error');
      notify(`Impossible d’enregistrer la cartographie : ${error.message}`);
    }
  };
  useEffect(() => {
    if (isPresentationWindow) return undefined;
    const saveOnShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveCurrentLocalMap();
      }
    };
    window.addEventListener('keydown', saveOnShortcut);
    return () => window.removeEventListener('keydown', saveOnShortcut);
  }, [isPresentationWindow, localMapId]);

  const saveNamedLocalMap = () => {
    try {
      const currentModel = modelRef.current;
      const savedModel = { ...currentModel, metadata: { ...currentModel.metadata, name: localMapName.trim() } };
      const saved = repository.saveLocalMap({ name: localMapName, model: savedModel });
      lastSavedLocalSnapshotRef.current = { id: saved.id, json: JSON.stringify(savedModel) };
      commitModel(savedModel);
      setLocalMapId(saved.id);
      setAutoSaveState('saved');
      setLocalMaps(maps => [...maps, saved]);
      setModal(null);
      try {
        preferences.writeActiveLocalMapId(saved.id);
        notify(`Cartographie « ${saved.name} » enregistrée sur cet appareil`);
      } catch {
        notify('Cartographie enregistrée, mais le navigateur ne peut pas mémoriser son ouverture automatique.');
      }
    } catch (error) {
      setAutoSaveState('error');
      notify(`Impossible d’enregistrer la cartographie : ${error.message}`);
    }
  };
  const confirmLoadLocalMap = () => {
    if (!pendingLocalMap) return;
    try {
      if (!flushCurrentLocalMap()) return;

      // La bibliothèque peut avoir changé depuis l'affichage de la liste.
      // Ne pas restaurer un ancien snapshot sur celui qu'on vient de sauvegarder.
      const latestInLibrary = repository.loadLocalMaps().find(entry => entry.id === pendingLocalMap.id);
      const saved = latestInLibrary || pendingLocalMap;
      if (!saved.model || !Array.isArray(saved.model.domains) || !Array.isArray(saved.model.capabilities)) {
        throw new Error('le modèle enregistré est incomplet ou invalide');
      }

      // Une entrée « récente » peut être un brouillon, sans sauvegarde en bibliothèque.
      const savedInLibrary = Boolean(latestInLibrary);
      lastSavedLocalSnapshotRef.current = savedInLibrary ? { id: saved.id, json: JSON.stringify(saved.model) } : null;
      replaceModel(saved.model);
      setSelected([]);
      setMapQuery('');
      setPresentation(false);
      setModal(null);
      setPendingLocalMap(null);
      navigateToMode('editor');

      try {
        setActiveRecentMapId(saved.id);
        setLocalMapId(savedInLibrary ? saved.id : '');
        if (savedInLibrary) preferences.writeActiveLocalMapId(saved.id);
        else preferences.clearActiveLocalMapId();
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
  }, [historyState, modal]);
  // L'adaptateur gère les détails DOM du glisser-déposer et son nettoyage.
  useEffect(() => viewport.installDragAutoScroll(), []);

  const openContextMenu = (event, menu) => {
    event.preventDefault();
    event.stopPropagation();
    const menuWidth = 180;
    const menuHeight = menu.type === 'domain' ? 168 : 96;
    const position = browserInteractions.clampMenuPosition({
      x: event.clientX,
      y: event.clientY,
      width: menuWidth,
      height: menuHeight,
    });
    setContextMenu({ ...menu, ...position });
  };
  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    if (!contextMenu) return undefined;

    return browserInteractions.listenForDismissal({
      pointerEvent: 'mousedown',
      getInsideNode: () => browserInteractions.findElement('.context-menu'),
      onOutside: closeContextMenu,
      onEscape: closeContextMenu,
    });
  }, [contextMenu]);

  const layout = model.layout || { columns: DEFAULT_LAYOUTS.columns, layers: DEFAULT_LAYOUTS.layers };
  const columns = layout.columns?.length ? layout.columns : DEFAULT_LAYOUTS.columns;
  const layers = layout.layers?.length ? layout.layers : DEFAULT_LAYOUTS.layers;
  const showColumnHeadings = layout.showColumnHeadings !== false;
  const showRowHeadings = layout.showRowHeadings !== false;
  const zones = columns.flatMap(column => layers.map(layer => layout.zones?.find(zone => zone.columnId === column.id && zone.layerId === layer.id) || { id: `${column.id}:${layer.id}`, columnId: column.id, layerId: layer.id, name: column.name }));
  const nextDomainPlacement = columns.flatMap(column => layers.map(layer => ({
    columnId: column.id,
    layerId: layer.id,
  }))).find(placement => isDomainPlacementAvailable({
    domains: model.domains,
    columns,
    layers,
    ...placement,
    columnSpan: 1,
    rowSpan: 1,
    allowExactOverlap: false,
  })) || null;


  const openLayoutEditor = () => {
    setLayoutDraft({ columns: columns.map(x => ({ ...x })), layers: layers.map(x => ({ ...x })), zones: zones.map(x => ({ ...x })), showColumnHeadings, showRowHeadings });
    setModal('layout');
  };

  const updateLayoutDraft = (kind, id, name) => setLayoutDraft(d => renameLayoutDraftItem(d, kind, id, name));

  const updateZoneDraft = (columnId, layerId, name) => setLayoutDraft(d => renameLayoutZone(d, columnId, layerId, name));

  const addLayoutItem = kind => setLayoutDraft(d => addLayoutDraftItem(d, kind, uid(kind === 'columns' ? 'column' : 'layer')));

  const removeLayoutItem = (kind, id) => setLayoutDraft(d => removeLayoutDraftItem(d, kind, id));

  const saveLayout = () => {
    const prepared = prepareLayoutForSave(layoutDraft, layout, model.domains);
    if (!prepared) {
      notify('Chaque colonne, layer et zone doit avoir un nom');
      return;
    }
    update({ ...prepared, layout: { ...prepared.layout, showColumnHeadings: layoutDraft.showColumnHeadings !== false, showRowHeadings: layoutDraft.showRowHeadings !== false } });
    setModal(null);
    notify('Structure enregistrée');
  };

  const openWizard = () => setModal('wizard');
  const closeWizard = () => setModal(null);
  const createMap = ({ name, description, layout: nextLayout, backup }) => {
    if (!flushCurrentLocalMap()) return;
    if (backup) repository.exportModel(model);
    applyModelSnapshot(mapService.createEmptyMap({ name, description, layout: nextLayout }));
    setActiveRecentMapId(uid('recent'));
    setLocalMapId('');
    preferences.clearActiveLocalMapId();
    setSelected([]);
    navigateToMode('editor');
    setModal(null);
    notify(backup ? 'Cartographie créée · sauvegarde JSON téléchargée' : 'Cartographie créée');
  };

  const placementAvailable = (domainId, columnId, layerId, columnSpan) => isDomainPlacementAvailable({
    domains: model.domains,
    columns,
    layers,
    domainId,
    columnId,
    layerId,
    columnSpan,
    allowExactOverlap: false,
  });

  const placeDomain = (domainId, columnId, layerId) => {
    const patch = prepareDomainPlacement({
      domains: model.domains,
      layout,
      columns,
      layers,
      domainId,
      columnId,
      layerId,
      allowExactOverlap: false,
    });
    if (!patch) {
      if (domainId) notify('Déplacement impossible : chevauchement de domaine.');
      return;
    }
    update(patch);
  };

  const resizeDomain = (domain, columnSpan, rowSpan) => {
    const patch = prepareDomainPlacement({
      domains: model.domains,
      layout,
      columns,
      layers,
      domainId: domain.id,
      columnId: domain.layout?.columnId || columns[0].id,
      layerId: domain.layout?.layerId || layers[0].id,
      columnSpan,
      rowSpan,
      allowExactOverlap: false,
    });
    if (!patch) {
      notify('Redimensionnement impossible : la zone est occupée ou dépasse la grille.');
      return;
    }
    update(patch);
  };

  const openNew = (kind, parent = null, place = null) => {
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
    setForm({ ...emptyForm, name: c.name, code: c.code || '', description: c.description || '', priority: c.priority || 'unqualified', assessment: { ...emptyForm.assessment, ...c.assessment } });
    setModal('edit-capability');
  };

  const openEditApplication = application => {
    setEditingApplicationId(application.id);
    setFormErrors({});
    setForm({ ...emptyForm, name: application.name || '', code: application.code || '', description: application.description || '', vendor: application.vendor || '', status: application.status || 'Actif', type: application.type || 'SaaS', capabilityIds: application.capabilityIds || [] });
    setModal('edit-app');
  };

  const save = () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'Le nom est obligatoire.';
    if (modal !== 'edit-capability' && !form.code.trim()) errors.code = 'Le code est obligatoire.';
    if (modal === 'capability' && !form.domainId) errors.domainId = 'Le domaine est obligatoire.';
    if (['app', 'edit-app'].includes(modal) && !form.vendor.trim()) errors.vendor = 'L’éditeur / fournisseur est obligatoire.';
    if ((modal === 'domain' || modal === 'edit-domain') && !/^#[\da-f]{6}$/i.test(form.color)) errors.color = 'Saisissez une couleur hexadécimale au format #RRGGBB.';
    if ((modal === 'domain' || modal === 'edit-domain') && !placementAvailable(modal === 'edit-domain' ? editingDomainId : null, form.columnId || columns[0].id, form.layerId || layers[0].id, form.columnSpan)) errors.columnSpan = 'Cette étendue chevauche un autre domaine.';

    if (Object.keys(errors).length) {
      setFormErrors(errors);
      notify('Vérifiez les champs signalés.');
      return;
    }

    setFormErrors({});
    if (modal === 'domain') {
      update({ domains: createDomain({ domains: model.domains, capabilities: model.capabilities, applications: apps, layout: model.layout, form, id: uid('l0'), defaultColumnId: columns[0].id, defaultLayerId: layers[0].id, resolveColor: resolveDomainColor }) });
      setMapQuery('');
      notify('Domaine N0 créé');
    }
    if (modal === 'edit-domain') {
      update({ domains: updateDomain({ domains: model.domains, capabilities: model.capabilities, applications: apps, layout: model.layout, domainId: editingDomainId, form, defaultColumnId: columns[0].id, defaultLayerId: layers[0].id, resolveColor: resolveDomainColor }) });
      notify('Domaine N0 modifié');
    }
    if (modal === 'edit-capability') {
      update({ capabilities: updateCapability({ domains: model.domains, capabilities: model.capabilities, capabilityId: editingCapabilityId, form }) });
      notify('Capacité N1 modifiée');
    }
    if (modal === 'capability') {
      update({ capabilities: createCapability({ domains: model.domains, capabilities: model.capabilities, form, id: uid('l1') }) });
      notify('Capacité N1 créée');
    }
    if (modal === 'app') {
      update({ applications: createApplication({ applications: apps, domains: model.domains, capabilities: model.capabilities, layout: model.layout, form, id: uid('app') }) });
      notify('Application créée');
    }
    if (modal === 'edit-app') {
      update({ applications: updateApplication({ applications: apps, applicationId: editingApplicationId, domains: model.domains, capabilities: model.capabilities, layout: model.layout, form }) });
      notify('Application modifiée');
    }
    setModal(null);
  };

  const removeDomain = id => {
    update(removeDomainAndDependents({ model, domainId: id, depth }));
    notify('Domaine et dépendances supprimés');
  };

  const toggleCap = id => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const assign = (appId, capId) => update({ applications: assignApplicationToCapability(apps, appId, capId, model.domains, model.capabilities, depth) });
  const unassign = (appId, capId) => update({ applications: unassignApplicationFromCapability(apps, appId, capId, model.domains, model.capabilities, depth) });
  const hoverOn = e => { e.preventDefault(); e.currentTarget.classList.add('drop-over'); };
  const hoverOff = e => { if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.classList.remove('drop-over'); };
  const onDrop = (e, capId) => { e.preventDefault(); e.currentTarget.classList.remove('drop-over'); const id = e.dataTransfer.getData('app'); if (id) assign(id, capId); };

  const togglePicked = id => setPickedApps(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const linkPicked = targetId => {
    if (!pickedValid.length) return;
    update({ applications: linkPickedApplications(apps, pickedValid, targetId, model.domains, model.capabilities, depth) });
    setPickedApps([]);
    notify(`${pickedValid.length} application(s) reliée(s)`);
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
    const nextApps = prepareLinkedApplications({ applications: apps, mappedItems, link, checkedIds: linkChecked, domains: model.domains, capabilities: model.capabilities, depth });
    if (nextApps.some((a, i) => a !== apps[i])) update({ applications: nextApps });
    notify('Relations mises à jour');
    closeLink();
  };

  const importJson = async e => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const imported = await repository.importModel(f);
      if (!flushCurrentLocalMap()) return;
      replaceModel(imported);
      setActiveRecentMapId(uid('recent'));
      setLocalMapId('');
      preferences.clearActiveLocalMapId();
      notify('Cartographie importée');
    } catch (err) {
      notify(err.message);
    }
    e.target.value = '';
  };

  const getCapCoverageState = capId => getCapabilityCoverageState(capId, apps);

  const DomainCard = ({ d }) => {
    const caps = model.capabilities.filter(c => c.domainId === d.id);
    const domainColor = resolveDomainColor(d.color);
    const presentationColor = presentation
      ? mixDomainColor(domainColor, darkMode ? '#20232b' : '#ffffff', darkMode ? 0.42 : 0.14)
      : domainColor;
    const presentationText = domainTextColor(presentationColor);
    const bannerColor = presentation ? presentationColor : domainColor;
    const bannerText = presentation ? presentationText : domainTextColor(d.color);
    const domainClass = `domain domain-card${selected.includes(d.id) ? ' impact-selected' : ''}${presentation && caps.length === 0 ? ' mosaic-presentation-empty' : ''}`;

    return (
      <section
        className={domainClass}
        data-entity-id={d.id}
        data-entity-type="domain"
        style={{ '--domain-color': domainColor, '--domain-text-color': domainTextColor(d.color), '--presentation-domain-color': presentationColor, '--presentation-domain-text-color': presentationText } as React.CSSProperties}
        draggable={!presentation}
        onContextMenu={e => { if (!presentation) openContextMenu(e, { type: 'domain', item: d }); }}
        onDragStart={e => { if (presentation) { e.preventDefault(); return; } e.dataTransfer.setData('domain', d.id); }}
        onDragOver={e => { if (!presentation && depth === 1) hoverOn(e); }}
        onDragLeave={e => { if (!presentation && depth === 1) hoverOff(e); }}
        onDrop={e => { if (!presentation && depth === 1) { e.preventDefault(); onDrop(e, d.id); } }}
        key={d.id}
      >
        <div className="domain-banner" style={{ backgroundColor: bannerColor, color: bannerText, "--n0-header-color": bannerColor, "--n0-header-text-color": bannerText } as React.CSSProperties}>
          <div className="domain-banner-title">
            {depth === 1 ? (
              presentation ? <span className="map-domain-select">{d.name}</span> : <button type="button" className="map-domain-select" data-testid="map-domain-select" aria-pressed={selected.includes(d.id)} onClick={() => toggleCap(d.id)}>{d.name}</button>
            ) : <h3>{d.name}</h3>}
            <span className="domain-meta">{d.code}{(!presentation || caps.length > 0) && <> · {caps.length} N1</>}</span>
          </div>
          {!presentation && <div className="domain-actions">
            {depth === 2 && <button type="button" className="domain-add-capability" data-testid="add-capability-to-domain" aria-label={`Ajouter une capacité N1 à ${d.name}`} onClick={e => { e.stopPropagation(); openNew('capability', d.id); }}>＋ N1</button>}
            <button type="button" className="mini-action-trigger" aria-label={`Actions pour ${d.name}`} title="Actions du domaine" onClick={e => { e.stopPropagation(); openContextMenu(e, { type: 'domain', item: d }); }}>⋮</button>
          </div>}
        </div>

        {d.description?.trim() && <p className="cap-desc domain-desc">{d.description.trim()}</p>}

        {depth === 1 ? (
          <div className="relations domain-relations">
            {apps.filter(a => relationIds(a).includes(d.id)).map(a => (
              <div className="rel" key={a.id} draggable={!presentation} onDragStart={e => { if (presentation) { e.preventDefault(); return; } e.dataTransfer.setData("app", a.id); }}>
                <span>◈</span>{a.name}
                {!presentation && <button type="button" onClick={() => unassign(a.id, d.id)}>×</button>}
              </div>
            ))}
            {!presentation && <div className="drop">Déposer une application ici</div>}
          </div>
        ) : (
          <div className="caps-list">
            {caps.map(c => {
              const coverage = getCapCoverageState(c.id);
              const insight = capabilityMapReadout(c, coverage, capabilityFindings.get(c.id));
              const signal = presentationCapabilitySignal(c, capabilityFindings.get(c.id), presentationReadingMode);
              const capItemClass = `cap${selected.includes(c.id) ? ' impact-selected' : ''}`;

              return (
                <div
                  className={capItemClass}
                  data-presentation-tone={presentation && presentationReadingMode !== 'identity' ? signal.tone : undefined}
                  data-show-applications={presentation && presentationShowApplications ? 'true' : undefined}
                  role={presentation ? 'button' : undefined}
                  tabIndex={presentation ? 0 : undefined}
                  aria-label={presentation ? `Détails de ${c.name}` : undefined}
                  onClick={presentation ? () => setPresentationFocusedCapabilityId(c.id) : undefined}
                  onKeyDown={presentation ? event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setPresentationFocusedCapabilityId(c.id);
                    }
                  } : undefined}
                  data-entity-id={c.id}
                  data-entity-type="capability"
                  key={c.id}
                  onContextMenu={e => { if (!presentation) openContextMenu(e, { type: 'capability', item: c }); }}
                  onDragOver={e => { if (!presentation) hoverOn(e); }}
                  onDragLeave={e => { if (!presentation) hoverOff(e); }}
                  onDrop={e => { if (!presentation) onDrop(e, c.id); }}
                >
                  <div className="cap-head">
                    {presentation ? <span className="map-cap-select">{c.name}</span> : <button type="button" className="map-cap-select" data-testid="map-cap-select" aria-pressed={selected.includes(c.id)} onClick={() => toggleCap(c.id)}>{c.name}</button>}
                    {!presentation && <div className="capability-card-actions">
                      <button type="button" className="capability-open-sheet" data-testid="capability-open-sheet"
                        aria-label={`Ouvrir la fiche de ${c.name}`}
                        title="Nom, couverture, maturité et justification"
                        onClick={event => { event.stopPropagation(); openEditCapability(c); }}>Fiche</button>
                      <button
                        type="button"
                        className="mini-action-trigger"
                        aria-label={`Actions pour ${c.name}`}
                        title="Autres actions et relations"
                        onClick={event => { event.stopPropagation(); openContextMenu(event, { type: 'capability', item: c }); }}
                      >⋮</button>
                    </div>}
                  </div>
                  {presentation && presentationReadingMode !== 'identity' && <span className="presentation-cap-signal">{signal.label}</span>}
                  {presentation && presentationShowApplications && <div className="presentation-app-preview" aria-label="Applications rattachées">
                    {coverage.apps.slice(0, PRESENTATION_APP_PREVIEW_LIMIT).map(application => <span
                      className={isCurrentApplication(application) ? 'presentation-app-chip' : 'presentation-app-chip is-target'}
                      key={application.id} title={`${application.name} · ${isCurrentApplication(application) ? 'Actuelle' : 'Cible'}`}>
                      {application.name}{!isCurrentApplication(application) && <em>cible</em>}
                    </span>)}
                    {coverage.apps.length > PRESENTATION_APP_PREVIEW_LIMIT && <span className="presentation-app-more">+{coverage.apps.length - PRESENTATION_APP_PREVIEW_LIMIT} autres</span>}
                    {coverage.apps.length === 0 && <span className="presentation-app-empty">Aucune application reliée</span>}
                  </div>}

                  <div className="cap-meta">
                    <span className="app-count" title={`${coverage.currentCount} application(s) actuelle(s), ${coverage.targetCount} cible(s)`}>{coverage.currentCount}{coverage.targetCount > 0 ? ` +${coverage.targetCount}` : ''}</span>
                    {!presentation && <span className={`capability-qualification is-${insight.functionalCoverage}`}
                      data-testid="capability-qualification" title="Couverture fonctionnelle déclarée par les métiers">
                      {insight.functionalLabel}
                    </span>}
                  </div>

                  {c.description?.trim() && <p className="cap-desc">{c.description.trim()}</p>}

                  {!presentation && mapReadingMode !== 'applications' && (
                    <div className="capability-reading-detail" data-testid="capability-reading-detail" data-reading={mapReadingMode} aria-live="polite">
                      {mapReadingMode === 'coverage' && (
                        <>
                          <span>Support actuel : <strong>{insight.applicationLabel}</strong></span>
                          {coverage.targetCount > 0 && <span>À venir : <strong>{insight.targetApplicationLabel}</strong></span>}
                          <span>Couverture métier : <strong>{insight.functionalLabel}</strong></span>
                        </>
                      )}
                      {mapReadingMode === 'maturity' && (
                        <>
                          <span>Actuelle : <strong>{insight.currentMaturityLabel}</strong></span>
                          <span>Cible : <strong>{insight.targetMaturityLabel}</strong></span>
                          <span>{insight.maturityGapLabel}</span>
                        </>
                      )}
                      {mapReadingMode === 'gaps' && (
                        <>
                          <strong>{insight.signals.length ? `${insight.signals.length} point(s) à examiner` : insight.needsQualification ? 'Évaluation à compléter' : 'Aucun signal détecté'}</strong>
                          {insight.signals.length > 0 && <span>{insight.signals.map(signal => signal.description).join(' · ')}</span>}
                          {insight.needsQualification && <span>Couverture fonctionnelle non évaluée</span>}
                        </>
                      )}
                    </div>
                  )}

                  {(presentation || mapReadingMode === 'applications') && <div className="relations">
                    {coverage.apps.map(a => (
                      <div className="rel" key={a.id} draggable={!presentation} onDragStart={e => { if (presentation) { e.preventDefault(); return; } e.dataTransfer.setData('app', a.id); }}>
                        <span>◈</span><b>{a.name}</b> <small>({a.status})</small>
                        {!presentation && <button type="button" onClick={e => { e.stopPropagation(); unassign(a.id, c.id); }}>×</button>}
                      </div>
                    ))}
                    {!presentation && <div className="drop">Déposer une application ici</div>}
                  </div>}
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

  // Les modèles importés peuvent référencer des pistes supprimées ou renommées.
  // Replier ces références sur la première piste évite de faire disparaître les domaines.
  const resolveTrackIndex = (tracks, requestedId) => {
    const index = tracks.findIndex(track => track.id === requestedId);
    return index >= 0 ? index : 0;
  };
  const mosaicColumnOffset = !presentation && showRowHeadings ? 2 : 1;
  const mosaicRowOffset = !presentation && showColumnHeadings ? 2 : 1;
  const usedPresentationColumnIndexes = new Set<number>();
  const usedPresentationLayerIndexes = new Set<number>();
  if (presentation) {
    model.domains.forEach(domain => {
      const columnStart = resolveTrackIndex(columns, domain.layout?.columnId || columns[0]?.id);
      const layerStart = resolveTrackIndex(layers, domain.layout?.layerId || layers[0]?.id);
      if (columnStart < 0 || layerStart < 0) return;
      const columnSpan = Math.max(1, Math.min(columns.length - columnStart, Number(domain.layout?.columnSpan) || 1));
      const layerSpan = Math.max(1, Math.min(layers.length - layerStart, Number(domain.layout?.rowSpan) || 1));
      for (let index = columnStart; index < columnStart + columnSpan; index += 1) usedPresentationColumnIndexes.add(index);
      for (let index = layerStart; index < layerStart + layerSpan; index += 1) usedPresentationLayerIndexes.add(index);
    });
  }
  const mosaicColumnsLayout = presentation && usedPresentationColumnIndexes.size > 0 ? columns.filter((_, index) => usedPresentationColumnIndexes.has(index)) : columns;
  const mosaicLayersLayout = presentation && usedPresentationLayerIndexes.size > 0 ? layers.filter((_, index) => usedPresentationLayerIndexes.has(index)) : layers;
  const mosaicColumns = `${!presentation && showRowHeadings ? '110px ' : ''}${mosaicColumnsLayout.map(column => `minmax(0, ${Math.max(0.1, Number(column.size) || 1)}fr)`).join(' ')}`;
  const mosaicRows = presentation
    ? mosaicLayersLayout.map(layer => `minmax(0, ${Math.max(0.1, Number(layer.size) || 1)}fr)`).join(' ')
    : `${showColumnHeadings ? '44px ' : ''}${layers.map(() => 'minmax(180px, auto)').join(' ')}`;
  const capabilityMap = (
    <div className="map map-mosaic" data-testid="capability-map" style={{ gridTemplateColumns: mosaicColumns, gridTemplateRows: mosaicRows }}>
      {!presentation && showColumnHeadings && showRowHeadings && <div className="mosaic-corner" />}
      {!presentation && showColumnHeadings && columns.map(column => <div className="mosaic-column-heading" key={column.id} style={{ gridColumn: columns.indexOf(column) + mosaicColumnOffset, gridRow: 1 }}>{column.name}</div>)}
      {!presentation && showRowHeadings && layers.map((layer, rowIndex) => <div className="mosaic-row-heading" key={layer.id} style={{ gridColumn: 1, gridRow: rowIndex + mosaicRowOffset }}>{layer.name}</div>)}
      {layers.flatMap((layer, rowIndex) => columns.map((column, columnIndex) => {
        const zone = zones.find(item => item.columnId === column.id && item.layerId === layer.id);
        const occupied = model.domains.some(domain => {
          const startColumn = resolveTrackIndex(columns, domain.layout?.columnId || columns[0].id);
          const startLayer = resolveTrackIndex(layers, domain.layout?.layerId || layers[0].id);
          const columnSpan = Math.max(1, Number(domain.layout?.columnSpan) || 1);
          const rowSpan = Math.max(1, Number(domain.layout?.rowSpan) || 1);
          return startColumn >= 0 && startLayer >= 0
            && columnIndex >= startColumn && columnIndex < startColumn + columnSpan
            && rowIndex >= startLayer && rowIndex < startLayer + rowSpan;
        });
        return presentation ? null : <div className="mosaic-zone" key={`${column.id}:${layer.id}`} data-zone-key={`${column.id}:${layer.id}`} data-occupied={occupied}
          style={{ gridColumn: columnIndex + mosaicColumnOffset, gridRow: rowIndex + mosaicRowOffset }}
          onDragOver={event => event.preventDefault()}
          onDrop={event => { event.preventDefault(); placeDomain(event.dataTransfer.getData('domain'), column.id, layer.id); }}>
          {zone?.name && zone.name !== column.name && <span className="mosaic-zone-label">{zone.name}</span>}
          <span className="mosaic-zone-mobile-label">{layer.name} · {column.name}</span>
          {!occupied && <button type="button" className="cell-add empty" aria-label={`Ajouter un domaine dans ${zone?.name || column.name}`} onClick={() => openNew('domain', null, { columnId: column.id, layerId: layer.id })}>＋ Domaine N0</button>}
        </div>;
      }))}
      {model.domains.filter(domain => (domain.name + ' ' + domain.code + ' ' + (domain.description || '')).toLowerCase().includes(mapQuery.toLowerCase())).map(domain => {
        const sourceColumnIndex = resolveTrackIndex(columns, domain.layout?.columnId || columns[0].id);
        const sourceRowIndex = resolveTrackIndex(layers, domain.layout?.layerId || layers[0].id);
        if (sourceColumnIndex < 0 || sourceRowIndex < 0) return null;
        const sourceColumnSpan = Math.max(1, Math.min(columns.length - sourceColumnIndex, Number(domain.layout?.columnSpan) || 1));
        const sourceRowSpan = Math.max(1, Math.min(layers.length - sourceRowIndex, Number(domain.layout?.rowSpan) || 1));
        const columnIndex = mosaicColumnsLayout.findIndex(column => column.id === columns[sourceColumnIndex].id);
        const rowIndex = mosaicLayersLayout.findIndex(layer => layer.id === layers[sourceRowIndex].id);
        if (columnIndex < 0 || rowIndex < 0) return null;
        const columnSpan = presentation
          ? mosaicColumnsLayout.filter(column => { const index = columns.findIndex(item => item.id === column.id); return index >= sourceColumnIndex && index < sourceColumnIndex + sourceColumnSpan; }).length
          : sourceColumnSpan;
        const rowSpan = presentation
          ? mosaicLayersLayout.filter(layer => { const index = layers.findIndex(item => item.id === layer.id); return index >= sourceRowIndex && index < sourceRowIndex + sourceRowSpan; }).length
          : sourceRowSpan;
        return <div className={'mosaic-domain' + (presentation && presentationFocusedDomainId && presentationFocusedDomainId !== domain.id ? ' is-presentation-dimmed' : '') + (presentation && presentationFocusedDomainId === domain.id ? ' is-presentation-focused' : '')} key={domain.id} tabIndex={presentation ? -1 : 0} role="group"
          aria-label={presentation ? `Carte ${domain.name}` : `Carte ${domain.name}. Utilisez les bords droit et inférieur pour redimensionner.`}
          style={{ gridColumn: `${columnIndex + mosaicColumnOffset} / span ${columnSpan}`, gridRow: `${rowIndex + mosaicRowOffset} / span ${rowSpan}` }}
          onPointerDown={event => {
            if (presentation) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            const edgeSize = 12;
            const resizeColumn = bounds.right - event.clientX <= edgeSize;
            const resizeRow = bounds.bottom - event.clientY <= edgeSize;
            if (!resizeColumn && !resizeRow) return;
            event.preventDefault();
            event.stopPropagation();
            const draggableDomain = event.currentTarget.querySelector('.domain-card') as HTMLElement | null;
            if (draggableDomain) {
              draggableDomain.dataset.resizeWasDraggable = draggableDomain.getAttribute('draggable') || 'false';
              draggableDomain.setAttribute('draggable', 'false');
            }
            const map = event.currentTarget.closest('.map-mosaic');
            const cell = map?.querySelector(`[data-zone-key="${domain.layout?.columnId || columns[0].id}:${domain.layout?.layerId || layers[0].id}"]`);
            const cellBounds = cell?.getBoundingClientRect();
            event.currentTarget.setPointerCapture(event.pointerId);
            event.currentTarget.dataset.resizeStartX = String(event.clientX);
            event.currentTarget.dataset.resizeStartY = String(event.clientY);
            event.currentTarget.dataset.resizeLastX = String(event.clientX);
            event.currentTarget.dataset.resizeLastY = String(event.clientY);
            event.currentTarget.dataset.resizeCellWidth = String(cellBounds?.width || 0);
            event.currentTarget.dataset.resizeCellHeight = String(cellBounds?.height || 0);
            event.currentTarget.dataset.resizeColumn = String(resizeColumn);
            event.currentTarget.dataset.resizeRow = String(resizeRow);
            event.currentTarget.dataset.resizeOriginalColumn = event.currentTarget.style.gridColumn;
            event.currentTarget.dataset.resizeOriginalRow = event.currentTarget.style.gridRow;
          }}
          onPointerMove={event => {
            const card = event.currentTarget;
            if (card.dataset.resizeStartX === undefined) return;
            card.dataset.resizeLastX = String(event.clientX);
            card.dataset.resizeLastY = String(event.clientY);
            const startX = Number(card.dataset.resizeStartX);
            const startY = Number(card.dataset.resizeStartY);
            const cellWidth = Number(card.dataset.resizeCellWidth || 0);
            const cellHeight = Number(card.dataset.resizeCellHeight || 0);
            const columnDelta = card.dataset.resizeColumn === 'true' && cellWidth > 0 ? Math.round((event.clientX - startX) / cellWidth) : 0;
            const rowDelta = card.dataset.resizeRow === 'true' && cellHeight > 0 ? Math.round((event.clientY - startY) / cellHeight) : 0;
            const previewColumnSpan = Math.max(1, Math.min(columns.length - sourceColumnIndex, columnSpan + columnDelta));
            const previewRowSpan = Math.max(1, Math.min(layers.length - sourceRowIndex, rowSpan + rowDelta));
            card.style.gridColumn = `${columnIndex + mosaicColumnOffset} / span ${previewColumnSpan}`;
            card.style.gridRow = `${rowIndex + mosaicRowOffset} / span ${previewRowSpan}`;
          }}
          onPointerUp={event => {
            const card = event.currentTarget;
            if (card.dataset.resizeStartX === undefined) return;
            const startX = Number(card.dataset.resizeStartX);
            const startY = Number(card.dataset.resizeStartY);
            const cellWidth = Number(card.dataset.resizeCellWidth || 0);
            const cellHeight = Number(card.dataset.resizeCellHeight || 0);
            const columnDelta = card.dataset.resizeColumn === 'true' && cellWidth > 0 ? Math.round((event.clientX - startX) / cellWidth) : 0;
            const rowDelta = card.dataset.resizeRow === 'true' && cellHeight > 0 ? Math.round((event.clientY - startY) / cellHeight) : 0;
            if (columnDelta || rowDelta) resizeDomain(domain, columnSpan + columnDelta, rowSpan + rowDelta);
            card.style.gridColumn = card.dataset.resizeOriginalColumn || '';
            card.style.gridRow = card.dataset.resizeOriginalRow || '';
            ['resizeStartX', 'resizeStartY', 'resizeLastX', 'resizeLastY', 'resizeCellWidth', 'resizeCellHeight', 'resizeColumn', 'resizeRow', 'resizeOriginalColumn', 'resizeOriginalRow'].forEach(key => delete card.dataset[key]);
            const draggableDomain = card.querySelector('.domain-card') as HTMLElement | null;
            if (draggableDomain?.dataset.resizeWasDraggable === 'true') draggableDomain.setAttribute('draggable', 'true');
            if (draggableDomain) delete draggableDomain.dataset.resizeWasDraggable;
          }}
          onPointerCancel={event => {
            const card = event.currentTarget;
            card.style.gridColumn = card.dataset.resizeOriginalColumn || '';
            card.style.gridRow = card.dataset.resizeOriginalRow || '';
            ['resizeStartX', 'resizeStartY', 'resizeLastX', 'resizeLastY', 'resizeCellWidth', 'resizeCellHeight', 'resizeColumn', 'resizeRow', 'resizeOriginalColumn', 'resizeOriginalRow'].forEach(key => delete card.dataset[key]);
            const draggableDomain = card.querySelector('.domain-card') as HTMLElement | null;
            if (draggableDomain?.dataset.resizeWasDraggable === 'true') draggableDomain.setAttribute('draggable', 'true');
            if (draggableDomain) delete draggableDomain.dataset.resizeWasDraggable;
          }}
          onKeyDown={event => {
            if (presentation) return;
            const changes = {
              ArrowLeft: [-1, 0], ArrowRight: [1, 0],
              ArrowUp: [0, -1], ArrowDown: [0, 1],
            };
            const change = changes[event.key];
            if (!change) return;
            event.preventDefault();
            resizeDomain(domain, columnSpan + change[0], rowSpan + change[1]);
          }}>
          <DomainCard d={domain} />
        </div>;
      })}
    </div>
  );


  return (
    <div className={'app' + (presentation ? ' presentation-mode' : '') + (presentation ? ' mosaic-presentation-mode' : '') + (darkMode ? ' theme-dark' : '')} data-ui-experience={experienceKind} data-presentation-reading={presentation ? presentationReadingMode : undefined}>
      <header>
        <div><div className="eyebrow">ENTERPRISE ARCHITECTURE</div><h1>Capacity Mapper</h1></div>
        <div className="toolbar">
          <nav className="toolbar-switch primary-navigation" aria-label="Navigation principale">
            <button type="button" className={mode === 'editor' ? 'active' : ''} data-testid="nav-cartography" aria-current={mode === 'editor' ? 'page' : undefined} onClick={() => { navigateToMode('editor'); setMapQuery(''); }}>▦ Cartographie</button>
            <button type="button" className={['dashboard', 'relations'].includes(mode) ? 'active' : ''} data-testid="nav-analysis" aria-current={['dashboard', 'relations', 'impact'].includes(mode) ? 'page' : undefined} onClick={() => navigateToMode('dashboard')}>▥ Analyse</button>
            <button type="button" className={mode === 'library' ? 'active' : ''} data-testid="primary-library" aria-current={mode === 'library' ? 'page' : undefined} onClick={openLibrary}>▤ Bibliothèque</button>
            <div
              className={'toolbar-tools' + (toolsMenuOpen ? ' is-open' : '')}
              data-testid="tools-menu"
              ref={toolsMenuRef}
            >
              <button
                type="button"
                className="toolbar-tools-toggle"
                data-testid="tools-menu-toggle"
                ref={toolsMenuToggleRef}
                aria-label="Ouvrir le menu Outils"
                aria-haspopup="true"
                aria-expanded={toolsMenuOpen}
                onClick={() => setToolsMenuOpen(open => !open)}
              >
                <span>Outils</span><span aria-hidden="true">⌄</span>
              </button>
              {toolsMenuOpen && <div className="toolbar-tools-panel" aria-label="Outils et actions">
                <section className="toolbar-menu-group" aria-labelledby="tools-group-maps">
                  <h3 id="tools-group-maps" className="toolbar-menu-heading">Cartographie</h3>
                  <button type="button" className="secondary new-map-button" data-testid="new-map-button" onClick={() => { closeToolsMenu(); openWizard(); }}>
                    <span className="new-map-button-mark" aria-hidden="true">+</span>
                    <span>Nouvelle cartographie</span>
                  </button>
                  <button type="button" className="primary" data-testid="save-local-map" onClick={() => { closeToolsMenu(); saveCurrentLocalMap(); }}>Enregistrer la cartographie</button>
                </section>
                <div className="toolbar-menu-divider" role="separator" />
                <section className="toolbar-menu-group" aria-labelledby="tools-group-data">
                  <h3 id="tools-group-data" className="toolbar-menu-heading">Données</h3>
                  <button type="button" className="secondary" data-testid="export-model" onClick={() => { closeToolsMenu(); repository.exportModel(model); }}>↓ Exporter en JSON</button>
                  <label className="button secondary toolbar-import">↑ Importer depuis JSON<input data-testid="import-model" hidden type="file" accept=".json,application/json" onChange={event => { closeToolsMenu(); importJson(event); }} /></label>
                </section>
                <div className="toolbar-menu-divider" role="separator" />
                <section className="toolbar-menu-group" aria-labelledby="tools-group-display">
                  <h3 id="tools-group-display" className="toolbar-menu-heading">Affichage</h3>
                  <button type="button" className="secondary theme-toggle" data-testid="theme-toggle" aria-pressed={darkMode} onClick={() => { setDarkMode(value => !value); closeToolsMenu(); }}>{darkMode ? '☀ Thème clair' : '☾ Dark Linear'}</button>
                </section>
                <div className="toolbar-menu-divider" role="separator" />
                <section className="toolbar-menu-group toolbar-menu-version" aria-labelledby="tools-group-version">
                  <h3 id="tools-group-version" className="toolbar-menu-heading">Version</h3>
                  <PwaUpdateNotice />
                </section>
              </div>}
            </div>
          </nav>
          <div className="toolbar-actions">
            {!isPresentationWindow && (
              <div
                className={`autosave-control autosave-control--${workingCopySaveError ? 'error' : autoSaveState}`}
                data-testid="autosave-control"
                title={workingCopySaveError || autoSaveState === 'error'
                  ? 'Échec de l’enregistrement local. Vérifiez l’espace disponible ou les autorisations du navigateur.'
                  : 'Conservée dans ce navigateur, pas sur un serveur. Un export JSON permet de garder une copie externe.'}
              >
                <span className="autosave-status" data-testid="autosave-status" role="status" aria-live="polite">
                  <span className="autosave-indicator" aria-hidden="true" />
                  {workingCopySaveError || autoSaveState === 'error' ? 'Sauvegarde échouée'
                    : autoSaveState === 'saving' ? 'Enregistrement…'
                      : autoSaveState === 'saved' ? 'Enregistrée sur cet appareil' : 'Brouillon local'}
                </span>
                {(workingCopySaveError || autoSaveState === 'error' || !localMapId) && (
                  <button type="button" className="autosave-action" data-testid="autosave-action" onClick={() => {
                    if (workingCopySaveError) {
                      const recovered = persistWorkingCopy();
                      if (!recovered) {
                        notify('Stockage local indisponible. Exportez votre cartographie en JSON pour la conserver.');
                        return;
                      }
                    }
                    saveCurrentLocalMap();
                  }}>
                    {workingCopySaveError || autoSaveState === 'error' ? 'Réessayer' : 'Enregistrer'}
                  </button>
                )}
              </div>
            )}
            <div className="toolbar-history" role="group" aria-label="Historique des modifications">
              <button type="button" data-testid="undo-button" className="secondary history-button" aria-label="Annuler" aria-keyshortcuts="Control+Z Meta+Z" title="Annuler la dernière modification (Ctrl+Z)" disabled={!historyState.canUndo} onClick={undo}><span className="history-button-icon" aria-hidden="true">↶</span><span className="history-button-label">Annuler</span></button>
              <button type="button" data-testid="redo-button" className="secondary history-button" aria-label="Rétablir" aria-keyshortcuts="Control+Y Control+Shift+Z Meta+Shift+Z" title="Rétablir la modification (Ctrl+Y ou Ctrl+Maj+Z)" disabled={!historyState.canRedo} onClick={redo}><span className="history-button-icon" aria-hidden="true">↷</span><span className="history-button-label">Rétablir</span></button>
            </div>
            <label className="presentation-switch">
              <span>Présentation</span>
              <input type="checkbox" data-testid="presentation-switch-toolbar" aria-label="Mode présentation" checked={presentation} onChange={event => togglePresentation(event.target.checked)} />
              <span className="presentation-switch-track" aria-hidden="true"><span className="presentation-switch-thumb" /></span>
            </label>

          </div>
        </div>
      </header>

      {mode === 'library' ? (
        <section className="standalone-page library-page" data-testid="library-page">
          <div className="standalone-page-heading library-page-heading" data-testid="library-page-heading">
            <div>
              <div className="eyebrow">ESPACE DE TRAVAIL · STOCKAGE LOCAL</div>
              <h2>Bibliothèque de cartographies</h2>
              <p>Retrouvez vos modèles récents, gérez les sauvegardes de cet appareil et rouvrez une cartographie sans quitter cet espace.</p>
            </div>
            <div className="library-page-actions">
              <button type="button" className="secondary" data-testid="back-to-cartography" onClick={() => navigateToMode('editor')}>Retour à la cartographie</button>
              <button type="button" className="primary" data-testid="save-current-from-library" onClick={saveCurrentLocalMap}>＋ Sauvegarder la cartographie actuelle</button>
            </div>
          </div>

          <div className="library-stats" aria-label="Résumé de la bibliothèque">
            <article className="library-stat-card"><span>Cartographie active</span><strong>{model.metadata?.name || 'Sans nom'}</strong><small>{model.domains.length} domaines N0 · {model.capabilities.length} capacités N1</small></article>
            <article className="library-stat-card"><span>Récemment ouvertes</span><strong data-testid="recent-maps-count">{recentMaps.length}</strong><small>Jusqu’à 10 cartographies conservées dans l’historique</small></article>
            <article className="library-stat-card"><span>Sauvegardes locales</span><strong data-testid="saved-maps-count">{localMaps.length}</strong><small>Disponibles sur cet appareil</small></article>
          </div>

          <div className="library-content-grid" data-testid="library-content-grid">
          <section className="library-section library-saved-section" aria-labelledby="saved-maps-heading">
            <div className="library-section-heading"><div><h3 id="saved-maps-heading">Cartographies enregistrées</h3><p>Vos versions nommées, conservées sur cet appareil.</p></div><span className="library-section-count">{localMaps.length} sauvegarde(s)</span></div>
            {localMaps.length ? (
              <div className="library-card-grid" data-testid="saved-maps-list">
                {localMaps.map(saved => (
                  <article className="library-map-card" key={saved.id}>
                    <div className="library-map-card-top"><span className="library-map-type saved">SAUVEGARDE</span><span className="library-map-date">{saved.updatedAt ? new Date(saved.updatedAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : 'Enregistrée localement'}</span></div>
                    <h4>{saved.name}</h4>
                    <p className="library-map-description">{saved.model.metadata?.description || 'Cartographie de capacités d’entreprise'}</p>
                    <div className="library-map-metrics"><span><strong>{saved.model.domains.length}</strong> domaines N0</span><span><strong>{saved.model.capabilities.length}</strong> capacités N1</span><span><strong>{saved.model.applications.length}</strong> applications</span></div>
                    <div className="library-map-card-actions"><button type="button" className="secondary" onClick={() => { setPendingLocalMap(saved); setModal('confirm-local-map'); }}>Ouvrir cette cartographie</button></div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="library-empty-state" data-testid="saved-maps-empty"><strong>Aucune sauvegarde nommée</strong><p>Enregistrez la cartographie active pour lui donner un nom et la retrouver ici, même après avoir travaillé sur un autre modèle.</p><button type="button" className="primary" onClick={saveCurrentLocalMap}>Sauvegarder la cartographie actuelle</button></div>
            )}
          </section>

          <section className="library-section library-recent-section" aria-labelledby="recent-maps-heading">
            <div className="library-section-heading"><div><h3 id="recent-maps-heading">Récemment ouvertes</h3><p>Retrouvez les cartographies utilisées dernièrement.</p></div></div>
            {recentMaps.length ? (
              <div className="library-card-grid" data-testid="recent-maps-list">
                {recentMaps.map(saved => (
                  <article className="library-map-card" key={saved.id}>
                    <div className="library-map-card-top"><span className="library-map-type">RÉCENT</span><span className="library-map-date">{saved.openedAt ? new Date(saved.openedAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : 'Historique sans date'}</span></div>
                    <h4>{saved.name}</h4>
                    <p className="library-map-description">{saved.model.metadata?.description || 'Cartographie de capacités d’entreprise'}</p>
                    <div className="library-map-metrics"><span><strong>{saved.model.domains.length}</strong> domaines N0</span><span><strong>{saved.model.capabilities.length}</strong> capacités N1</span><span><strong>{saved.model.applications.length}</strong> applications</span></div>
                    <div className="library-map-card-actions">
                      <button type="button" className="secondary" onClick={() => { setPendingLocalMap(saved); setModal('confirm-local-map'); }}>Ouvrir cette cartographie</button>
                      <button type="button" className="library-remove-recent" data-testid={`remove-recent-${saved.id}`} aria-label={`Retirer ${saved.name} des récents`} onClick={() => {
                        try {
                          repository.removeRecentMap(saved.id);
                          setRecentMaps(repository.loadRecentMaps());
                          if (saved.id === activeRecentMapId) {
                            preferences.writeActiveRecentMapId('__dismissed__');
                            setActiveRecentMapId('__dismissed__');
                          }
                          notify(`« ${saved.name} » retirée des récents`);
                        } catch (error) {
                          notify(`Impossible de retirer cette entrée : ${error.message}`);
                        }
                      }}>Retirer des récents</button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="library-empty-state" data-testid="recent-maps-empty"><strong>Aucune cartographie récente</strong><p>Les cartographies que vous ouvrez apparaîtront ici. Vous pouvez retirer une entrée sans supprimer sa sauvegarde locale.</p></div>
            )}
          </section>
        </div>

        </section>
      ) : (
      <div className={'workspace' + ` mosaic-workspace${showMosaicInventory ? ' mosaic-inventory-open' : ''}`}>
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
            <div key={a.id} className={'app-item' + (pickedValid.includes(a.id) ? ' picked' : '')} data-entity-id={a.id} data-entity-type="application" draggable onDragStart={e => e.dataTransfer.setData('app', a.id)}>
              <input type="checkbox" className="app-pick" aria-label={`Sélectionner ${a.name}`} checked={pickedValid.includes(a.id)} onChange={() => togglePicked(a.id)} />
              <div className="app-main"><b>{a.name}</b><small>{a.code} · {a.vendor || '—'}</small></div>
              <div className="app-side">
                <span className={'badge ' + a.status.toLowerCase().replace('é', 'e')}>{a.status}</span>
                <button type="button" className="app-edit" aria-label={`Modifier ${a.name}`} title={`Modifier ${a.name}`} onClick={() => openEditApplication(a)}><svg aria-hidden="true" viewBox="0 0 16 16" focusable="false"><path d="M11.8 2.2a1.4 1.4 0 0 1 2 2L6 12l-3 .8.8-3zM10.8 3.2l2 2" /></svg></button>
                <button type="button" className="app-link" aria-label={`Relier ${a.name} à des ${depth === 1 ? 'domaines N0' : 'capacités N1'}`} onClick={() => openLinkForApp(a)}>Relier à…</button>
              </div>
            </div>
          ))}
        </aside>

        <main>
          {['dashboard', 'relations'].includes(mode) && (
            <div className="analysis-view-switch" role="group" aria-label="Mode d'analyse" data-testid="analysis-view-switch">
              <button type="button" data-testid="tab-dashboard" className={mode === 'dashboard' ? 'active' : ''} aria-pressed={mode === 'dashboard'} onClick={() => navigateToMode('dashboard')}>Vue d'ensemble</button>
              <button type="button" data-testid="tab-relations" className={mode === 'relations' ? 'active' : ''} aria-pressed={mode === 'relations'} onClick={() => navigateToMode('relations')}>Gérer les relations</button>
            </div>
          )}
          {mode === 'dashboard' ? (
            <Dashboard
              model={model}
              depth={depth}
              capabilityReference={capabilityReference}
              onImportReference={async file => setCapabilityReference(await repository.importModel(file))}
              onClearReference={() => setCapabilityReference(null)}
              onLoadReferenceUrl={async url => {
                if (!repository.loadRemoteModel) throw new Error('Source de référence distante indisponible.');
                setCapabilityReference(await repository.loadRemoteModel(repository.normalizeJsonUrl?.(url) || url));
              }}
              onExportReview={downloadDecisionReview}
              onExploreTarget={exploreDashboardTarget}
              onEditCapability={capabilityId => {
                const capability = model.capabilities.find(item => item.id === capabilityId);
                if (capability) openEditCapability(capability);
              }}
              onShowOnMap={showCapabilityOnMap}
              onLinkApp={openLinkForApp}
              onUpdatePriority={updateCapabilityPriority}
              selected={selected}
              onToggleTarget={toggleCap}
            />
          ) : mode === 'relations' ? (
            <>
              {dashboardReturnAvailable && (
                <div className="relations-return-row">
                  <button type="button" className="secondary relations-return-button" data-testid="return-to-dashboard" onClick={returnToDashboard}>
                    ← Retour au dashboard
                  </button>
                </div>
              )}
              <CoverageTree
              domains={model.domains}
              capabilities={model.capabilities}
              apps={apps}
              depth={depth}
              colorOf={resolveDomainColor}
              selected={selected}
              pickedCount={pickedValid.length}
              onAssign={assign}
              onUnassign={unassign}
              onLinkPicked={linkPicked}
              onOpenLink={openLinkForTarget}
              onToggleSelection={toggleCap}
              />
            </>
          ) : (
            <>
              <div className="map-controls-row">
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
                  <button type="button" className="secondary" data-testid="map-add-domain" disabled={!nextDomainPlacement} title={nextDomainPlacement ? 'Créer un domaine N0 dans la première zone libre' : 'Ajoutez une ligne ou une colonne dans Structure pour libérer une zone'} onClick={() => openNew('domain', null, nextDomainPlacement)}>＋ Domaine N0</button>
                  <button type="button" className="secondary" data-testid="map-inventory-toggle" aria-expanded={showMosaicInventory} onClick={() => setShowMosaicInventory(value => !value)}>{showMosaicInventory ? 'Masquer les applications' : `Applications (${apps.length})`}</button>
                  <button type="button" className="secondary" onClick={openLayoutEditor}>⚙ Structure</button>
                  <button type="button" className="help-icon" onClick={() => setGuideOpen(true)} title="Aide TOGAF">?</button>
                </div>
              </div>

              {!presentation && depth === 2 && (
                <section className="capability-reading-toolbar" data-testid="capability-reading-toolbar" aria-label="Lire la cartographie métier">
                  <div className="capability-reading-intro">
                    <strong>Lecture métier</strong>
                    <span>{MAP_READING_MODES.find(reading => reading.id === mapReadingMode)?.help}</span>
                  </div>
                  <div className="capability-reading-summary" data-testid="capability-reading-summary">
                    <span><strong>{[...capabilityFindings.values()].filter(finding => finding.needsQualification).length}</strong> à qualifier</span>
                    <span><strong>{[...capabilityFindings.values()].filter(finding => finding.signals.length > 0).length}</strong> avec écarts</span>
                  </div>
                  <div className="capability-reading-options" role="group" aria-label="Mode de lecture des capacités">
                    {MAP_READING_MODES.map(reading => (
                      <button type="button" key={reading.id} data-testid={`map-reading-${reading.id}`}
                        className={mapReadingMode === reading.id ? 'is-active' : ''}
                        aria-pressed={mapReadingMode === reading.id}
                        onClick={() => setMapReadingMode(reading.id)}>{reading.label}</button>
                    ))}
                  </div>
                  <button type="button" className="capability-diagnostic-shortcut" data-testid="capability-diagnostic-shortcut"
                    onClick={openBusinessDiagnosis}>Examiner les écarts</button>
                  <div className="presentation-director">
                    <button type="button" className="presentation-director-toggle" data-testid="presentation-director-toggle"
                      aria-expanded={presentationDirectorOpen} onClick={() => setPresentationDirectorOpen(value => !value)}>Piloter la présentation</button>
                    {presentationDirectorOpen && <div className="presentation-director-panel" data-testid="presentation-director-panel">
                      <strong>Écran de restitution</strong>
                      <p>Commandes envoyées à l'onglet de présentation ouvert dans ce navigateur.</p>
                      <div className="presentation-director-readings" role="group" aria-label="Lecture sur l'écran de présentation">
                        {PRESENTATION_READING_OPTIONS.map(option => <button key={option.id} type="button"
                          data-testid={`director-reading-${option.id}`} aria-pressed={directorView.readingMode === option.id}
                          className={directorView.readingMode === option.id ? 'is-active' : ''}
                          onClick={() => updateDirectorView({ readingMode: option.id })}>{option.label}</button>)}
                      </div>
                      <label className="presentation-director-checkbox"><input type="checkbox" data-testid="director-show-applications"
                        checked={directorView.showApplications} onChange={event => updateDirectorView({ showApplications: event.target.checked })} />
                        Afficher les applications</label>
                      <label className="presentation-director-domain-label">Mettre en avant un domaine N0
                        <select data-testid="presentation-director-domain" value={directorView.focusedDomainId ?? ''}
                          onChange={event => updateDirectorView({ focusedDomainId: event.target.value || null })}>
                          <option value="">Tous les domaines</option>
                          {model.domains.map(domain => <option key={domain.id} value={domain.id}>{domain.name}</option>)}
                        </select>
                      </label>
                      <div className="presentation-director-navigation">
                        <button type="button" data-testid="presentation-director-prev" disabled={!model.domains.length}
                          onClick={() => stepDirectorDomain(-1)}>← Précédent</button>
                        <button type="button" data-testid="presentation-director-next" disabled={!model.domains.length}
                          onClick={() => stepDirectorDomain(1)}>Suivant →</button>
                      </div>
                    </div>}
                  </div>
                </section>
              )}
              {capabilityMap}
            </>
          )}
        </main>
      </div>
      )}


      {presentation && <div className="presentation-exit-bar" data-visible={presentationControlsVisible}>
        <span className="presentation-bar-label">Présentation</span>
        <div className="presentation-reading-controls" role="group" aria-label="Coloration de la présentation">
          {PRESENTATION_READING_OPTIONS.map(option => (
            <button key={option.id} type="button" data-testid={`presentation-reading-${option.id}`}
              aria-pressed={presentationReadingMode === option.id}
              className={presentationReadingMode === option.id ? 'is-active' : ''}
              onClick={() => { setPresentationReadingMode(option.id); publishLocalPresentationView({ readingMode: option.id }); }}>{option.label}</button>
          ))}
        </div>
        <label className="presentation-app-toggle">
          <input type="checkbox" data-testid="presentation-show-applications" checked={presentationShowApplications}
            disabled={depth !== 2} onChange={event => {
              setPresentationShowApplications(event.target.checked);
              publishLocalPresentationView({ showApplications: event.target.checked });
            }} />Applications
        </label>
        {presentationReadingMode !== 'identity' && <div className="presentation-reading-legend" data-testid="presentation-legend" aria-label="Légende de la coloration">
          {(['covered', 'gap', 'high', 'critical', 'neutral'] as const).map(tone => (
            <span key={tone}><i data-tone={tone} aria-hidden="true" />{({ covered: 'Satisfaisant', gap: 'Intermédiaire', high: 'Attention', critical: 'Écart important', neutral: 'Non évalué' })[tone]}</span>
          ))}
        </div>}
        <label className="presentation-switch">
          <span>Active</span>
          <input type="checkbox" data-testid="presentation-switch-exit" aria-label="Désactiver le mode présentation" checked={presentation} onChange={event => togglePresentation(event.target.checked)} />
          <span className="presentation-switch-track" aria-hidden="true"><span className="presentation-switch-thumb" /></span>
        </label>
      </div>}

      {presentation && presentationFocusedCapability && (() => {
        const coverage = getCapCoverageState(presentationFocusedCapability.id);
        const detail = capabilityMapReadout(presentationFocusedCapability, coverage, capabilityFindings.get(presentationFocusedCapability.id));
        const current = coverage.apps.filter(isCurrentApplication);
        const targets = coverage.apps.filter(application => !isCurrentApplication(application));
        return <div className="presentation-focus-overlay" onMouseDown={event => {
          if (event.target === event.currentTarget) setPresentationFocusedCapabilityId(null);
        }}>
          <section className="presentation-focus-sheet" role="dialog" aria-modal="true" aria-label={`Détail de ${presentationFocusedCapability.name}`}>
            <div className="presentation-focus-header">
              <div><span>Capacité N1 · Restitution</span><h2>{presentationFocusedCapability.name}</h2></div>
              <button autoFocus type="button" aria-label="Fermer le détail" data-testid="presentation-focus-close" onClick={() => setPresentationFocusedCapabilityId(null)}>×</button>
            </div>
            <div className="presentation-focus-metrics">
              <div><span>Couverture métier</span><strong>{detail.functionalLabel}</strong></div>
              <div><span>Maturité</span><strong>{detail.currentMaturityLabel}</strong><small>Cible : {detail.targetMaturityLabel}</small></div>
              <div><span>Écarts</span><strong>{detail.signals.length ? `${detail.signals.length} point(s) à examiner` : detail.needsQualification ? 'À qualifier' : 'Aucun signal détecté'}</strong></div>
            </div>
            <div className="presentation-focus-application-groups">
              <section><h3>Applications actuelles <span>{current.length}</span></h3>
                {current.length ? <ul>{current.map(a => <li key={a.id}><strong>{a.name}</strong><small>{a.status || 'Statut non renseigné'}</small></li>)}</ul> : <p>Aucune application actuelle rattachée.</p>}
              </section>
              <section><h3>Applications cibles <span>{targets.length}</span></h3>
                {targets.length ? <ul>{targets.map(a => <li key={a.id}><strong>{a.name}</strong><small>{a.status || 'Cible'}</small></li>)}</ul> : <p>Aucune application cible rattachée.</p>}
              </section>
            </div>
          </section>
        </div>;
      })()}
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
              <button type="button" onClick={e => { e.stopPropagation(); closeContextMenu(); openEditCapability(contextMenu.item); }}>Ouvrir la fiche de capacité</button>
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
        <Modal title="Ouvrir une cartographie" onClose={() => { setModal(mode === 'library' ? null : 'local-maps'); setPendingLocalMap(null); }}>
          <p>Ouvrir « {pendingLocalMap.name} » remplacera la cartographie actuellement affichée. Enregistrez vos dernières modifications avant de continuer si nécessaire.</p>
          <div className="modal-actions">
            <button type="button" onClick={() => { setModal(mode === 'library' ? null : 'local-maps'); setPendingLocalMap(null); }}>Annuler</button>
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
          <p className="structure-hint">Renommez les colonnes et les lignes, et choisissez les intitulés visibles sur la cartographie.</p>
          <section className="structure-section" data-testid="axis-heading-options">
            <h3>Intitulés des axes</h3>
            <label className="structure-visibility-option"><input type="checkbox" checked={layoutDraft.showColumnHeadings !== false} onChange={event => setLayoutDraft(draft => ({ ...draft, showColumnHeadings: event.target.checked }))} /> Afficher les titres des colonnes</label>
            <label className="structure-visibility-option"><input type="checkbox" checked={layoutDraft.showRowHeadings !== false} onChange={event => setLayoutDraft(draft => ({ ...draft, showRowHeadings: event.target.checked }))} /> Afficher les titres des lignes</label>
          </section>
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

      {['domain', 'edit-domain', 'capability', 'edit-capability', 'app', 'edit-app'].includes(modal) && (
        <Modal
          title={modal === 'edit-app' ? 'Modifier l’application' : modal === 'edit-capability' ? 'Fiche de capacité N1' : modal === 'domain' ? 'Nouveau domaine N0' : modal === 'edit-domain' ? 'Modifier le domaine N0' : modal === 'capability' ? 'Nouvelle capacité N1' : 'Nouvelle application'}
          onClose={() => setModal(null)}
        >
          {(modal === 'domain' || modal === 'edit-domain') && <div className="field-guidance"><b>N0 — Domaine métier</b><span>Regroupe un ensemble large de capacités.</span></div>}
          {(modal === 'capability' || modal === 'edit-capability') && <div className="field-guidance"><b>N1 — Capacité</b><span>Décrit ce que l’entreprise sait faire.</span></div>}
          {modal === 'edit-capability' && (
            <div className="capability-sheet-context" data-testid="capability-sheet-context">
              <strong>{model.domains.find(domain => domain.id === model.capabilities.find(capability => capability.id === editingCapabilityId)?.domainId)?.name ?? 'Domaine non renseigné'}</strong>
              <span>Code : {model.capabilities.find(capability => capability.id === editingCapabilityId)?.code || '—'}</span>
              <span>{getCapCoverageState(editingCapabilityId).currentCount} application(s) actuelle(s) · {getCapCoverageState(editingCapabilityId).targetCount} cible(s)</span>
              <span>Une liaison applicative ne suffit pas à prouver la couverture métier.</span>
            </div>
          )}

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
              {['app', 'edit-app'].includes(modal) && (
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
            </>
          )}

          {(modal === 'domain' || modal === 'edit-domain') ? (
            <label className="field">
              <span>Description</span>
              <textarea data-testid="domain-description" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Décrivez le périmètre du domaine (facultatif)" />
            </label>
          ) : (modal === 'capability' || modal === 'edit-capability') ? (
            <label className="field">
              <span>Description</span>
              <textarea data-testid="capability-description" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Décrivez la capacité (facultatif)" />
            </label>
          ) : ['app', 'edit-app'].includes(modal) ? (
            <Field label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          ) : null}

          {(modal === 'capability' || modal === 'edit-capability') && (
            <label className="field">
              <span>Priorité métier</span>
              <select data-testid="capability-priority" value={form.priority || 'unqualified'} onChange={e => setForm({ ...form, priority: e.target.value })}>
                <option value="unqualified">À qualifier</option>
                <option value="P1">P1 — Critique</option>
                <option value="P2">P2 — Élevée</option>
                <option value="P3">P3 — Normale</option>
              </select>
              <small>Qualifiez la criticité métier ; un gap n’est pas automatiquement un risque élevé.</small>
            </label>
          )}

          {(modal === 'capability' || modal === 'edit-capability') && (
            <section className="capability-assessment-fields" aria-label="Évaluation métier de la capacité">
              <h3>Évaluation métier <small>(facultative)</small></h3>
              <p className="structure-hint">Qualifiez la couverture réelle, indépendamment du nombre d'applications reliées. Une valeur non renseignée reste inconnue.</p>
              <label className="field">
                <span>Couverture fonctionnelle</span>
                <select data-testid="capability-functional-coverage" value={form.assessment.functionalCoverage || 'unknown'}
                  onChange={event => setForm({ ...form, assessment: { ...form.assessment, functionalCoverage: event.target.value as CapabilityAssessment['functionalCoverage'] } })}>
                  <option value="unknown">Non évaluée</option>
                  <option value="none">Non couverte</option>
                  <option value="partial">Partiellement couverte</option>
                  <option value="sufficient">Suffisamment couverte</option>
                </select>
              </label>
              <label className="field">
                <span>Maturité actuelle</span>
                <select data-testid="capability-current-maturity" value={form.assessment.currentMaturity ?? ''}
                  onChange={event => setForm({ ...form, assessment: { ...form.assessment, currentMaturity: event.target.value ? Number(event.target.value) : undefined } })}>
                  <option value="">Non évaluée</option>
                  {MATURITY_LEVELS.map(level => <option key={level} value={level}>{level} / {MATURITY_LEVELS.length}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Maturité cible</span>
                <select data-testid="capability-target-maturity" value={form.assessment.targetMaturity ?? ''}
                  onChange={event => setForm({ ...form, assessment: { ...form.assessment, targetMaturity: event.target.value ? Number(event.target.value) : undefined } })}>
                  <option value="">Non définie</option>
                  {MATURITY_LEVELS.map(level => <option key={level} value={level}>{level} / {MATURITY_LEVELS.length}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Justification de l'évaluation</span>
                <textarea data-testid="capability-assessment-rationale" rows={2} value={form.assessment.rationale || ''}
                  onChange={event => setForm({ ...form, assessment: { ...form.assessment, rationale: event.target.value } })}
                  placeholder="Faits métier vérifiés, limites ou hypothèses" />
              </label>
            </section>
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
                    style={{ '--swatch-color': color.value } as React.CSSProperties}
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
                  maxLength={7}
                  value={form.color}
                  onChange={e => setForm({ ...form, color: e.target.value })}
                />
              </span>
              {formErrors.color && <small className="field-error">{formErrors.color}</small>}
            </label>
          )}

          <div className="modal-actions">
            <button type="button" onClick={() => setModal(null)}>Annuler</button>
            <button type="button" className="primary" onClick={save}>{['edit-domain', 'edit-capability', 'edit-app'].includes(modal) ? 'Enregistrer' : 'Créer'}</button>
          </div>
        </Modal>
      )}
      <CartographerCompanion model={model} darkMode={darkMode} aiCompanionFactory={aiCompanion} companionPreferences={companionPreferences} onNavigateToEvidence={navigateToCompanionEvidence} />
    </div>
  );
}

export default App;