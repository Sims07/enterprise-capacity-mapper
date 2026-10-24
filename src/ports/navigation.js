/**
 * Inbound/outbound navigation port. React is an adapter; application code only
 * needs these operations and does not manipulate window.history directly.
 */
export const NAVIGATION_MODES = Object.freeze(['editor', 'dashboard', 'relations', 'impact', 'library']);

export const createNavigationPort = ({ history = window.history, location = window.location, onModeChange }) => ({
  currentMode: () => history.state?.capacityMapperMode || 'editor',
  goTo: mode => {
    if (!NAVIGATION_MODES.includes(mode)) throw new Error(`Mode de navigation inconnu : ${mode}`);
    history.pushState({ ...(history.state || {}), capacityMapperMode: mode, dashboardReturn: false }, '', location.href);
    onModeChange?.(mode);
  },
  replaceMode: mode => {
    if (!NAVIGATION_MODES.includes(mode)) throw new Error(`Mode de navigation inconnu : ${mode}`);
    history.replaceState({ ...(history.state || {}), capacityMapperMode: mode }, '', location.href);
    onModeChange?.(mode);
  },
});
