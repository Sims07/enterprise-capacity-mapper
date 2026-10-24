/**
 * Browser navigation adapter port. The UI works with navigation intent and
 * popstate subscriptions instead of directly reading or mutating browser history.
 */
export const NAVIGATION_MODES = Object.freeze(['editor', 'dashboard', 'relations', 'impact', 'library']);

export const createNavigationPort = ({
  history = globalThis.window?.history,
  location = globalThis.window?.location,
  eventTarget = globalThis.window,
  onModeChange,
} = {}) => {
  const validateMode = mode => {
    if (!NAVIGATION_MODES.includes(mode)) throw new Error(`Mode de navigation inconnu : ${mode}`);
  };
  const currentMode = () => history.state?.capacityMapperMode || 'editor';
  const stateWithMode = (mode, extra = {}) => ({
    ...(history.state || {}),
    capacityMapperMode: mode,
    ...extra,
  });
  const pushMode = (mode, extra = {}) => {
    validateMode(mode);
    history.pushState(stateWithMode(mode, extra), '', location.href);
    onModeChange?.(mode);
  };
  const replaceMode = (mode, extra = {}) => {
    validateMode(mode);
    history.replaceState(stateWithMode(mode, extra), '', location.href);
    onModeChange?.(mode);
  };

  return Object.freeze({
    currentMode,
    initialize: mode => {
      if (!history.state?.capacityMapperMode) replaceMode(mode);
    },
    goTo: mode => pushMode(mode, { dashboardReturn: false }),
    exploreDashboardTarget: () => pushMode('relations', { dashboardReturn: true }),
    replaceMode,
    back: () => history.back(),
    subscribePopState: handler => {
      eventTarget.addEventListener('popstate', handler);
      return () => eventTarget.removeEventListener('popstate', handler);
    },
  });
};
