export const NAVIGATION_MODES = ['editor', 'dashboard', 'relations', 'impact', 'library'] as const;
export type NavigationMode = typeof NAVIGATION_MODES[number];

export interface NavigationState {
  capacityMapperMode?: NavigationMode;
  dashboardReturn?: boolean;
  [key: string]: unknown;
}

/** Outbound port for navigation; browser history is supplied by the adapter. */
export interface NavigationPort {
  currentMode(): NavigationMode;
  initialize(mode: NavigationMode): void;
  goTo(mode: NavigationMode): void;
  exploreDashboardTarget(): void;
  replaceMode(mode: NavigationMode, extra?: Record<string, unknown>): void;
  back(): void;
  subscribePopState(handler: EventListener): () => void;
}

type HistoryLike = Pick<History, 'back' | 'pushState' | 'replaceState'> & { state: NavigationState | null };
type LocationLike = Pick<Location, 'href'>;
type EventTargetLike = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;

export const createNavigationPort = ({
  history = globalThis.window?.history,
  location = globalThis.window?.location,
  eventTarget = globalThis.window,
  onModeChange,
}: {
  history?: HistoryLike;
  location?: LocationLike;
  eventTarget?: EventTargetLike;
  onModeChange?: (mode: NavigationMode) => void;
} = {}): NavigationPort => {
  if (!history || !location) throw new Error('Navigation port requires browser history and location');
  const validateMode = (mode: NavigationMode): void => {
    if (!NAVIGATION_MODES.includes(mode)) throw new Error(`Mode de navigation inconnu : ${mode}`);
  };
  const currentMode = (): NavigationMode => history.state?.capacityMapperMode || 'editor';
  const stateWithMode = (mode: NavigationMode, extra: Record<string, unknown> = {}): NavigationState => ({ ...(history.state || {}), capacityMapperMode: mode, ...extra });
  const pushMode = (mode: NavigationMode, extra: Record<string, unknown> = {}): void => {
    validateMode(mode);
    history.pushState(stateWithMode(mode, extra), '', location.href);
    onModeChange?.(mode);
  };
  const replaceMode = (mode: NavigationMode, extra: Record<string, unknown> = {}): void => {
    validateMode(mode);
    history.replaceState(stateWithMode(mode, extra), '', location.href);
    onModeChange?.(mode);
  };
  return Object.freeze({
    currentMode,
    initialize: (mode: NavigationMode) => { if (!history.state?.capacityMapperMode) replaceMode(mode); },
    goTo: (mode: NavigationMode) => pushMode(mode, { dashboardReturn: false }),
    exploreDashboardTarget: () => pushMode('relations', { dashboardReturn: true }),
    replaceMode,
    back: () => history.back(),
    subscribePopState: handler => {
      if (!eventTarget) throw new Error('Navigation port requires an event target to subscribe to popstate');
      eventTarget.addEventListener('popstate', handler);
      return () => eventTarget.removeEventListener('popstate', handler);
    },
  });
};
