import { NAVIGATION_MODES, type NavigationMode, type NavigationPort, type NavigationState } from '../../ports/navigation.ts';

type HistoryLike = Pick<History, 'back' | 'pushState' | 'replaceState'> & { state: NavigationState | null };
type LocationLike = Pick<Location, 'href'>;
type EventTargetLike = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;

/** Browser adapter implementing the navigation port through the History API. */
export const createBrowserNavigationAdapter = ({
  history = globalThis.window?.history,
  location = globalThis.window?.location,
  eventTarget = globalThis.window,
  onModeChange,
}: {
  history?: HistoryLike;
  location?: LocationLike;
  eventTarget?: EventTargetLike;
  onModeChange?: (mode: NavigationMode) => void;
} = {}) => {
  if (!history || !location) throw new Error('Navigation adapter requires browser history and location');
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
  const adapter = {
    currentMode,
    initialize: (mode: NavigationMode) => { if (!history.state?.capacityMapperMode) replaceMode(mode); },
    goTo: (mode: NavigationMode) => pushMode(mode, { dashboardReturn: false }),
    exploreDashboardTarget: () => pushMode('relations', { dashboardReturn: true }),
    replaceMode,
    back: () => history.back(),
    subscribePopState: handler => {
      if (!eventTarget) throw new Error('Navigation adapter requires an event target to subscribe to popstate');
      eventTarget.addEventListener('popstate', handler);
      return () => eventTarget.removeEventListener('popstate', handler);
    },
  } satisfies NavigationPort;
  return Object.freeze(adapter);
};
