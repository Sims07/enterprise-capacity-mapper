/**
 * Outbound port for map persistence.
 * The application layer depends on this contract, never on localStorage.
 */
export const MODEL_REPOSITORY = Object.freeze({
  load: 'load',
  save: 'save',
  loadLocalMaps: 'loadLocalMaps',
  saveLocalMap: 'saveLocalMap',
  loadRecentMaps: 'loadRecentMaps',
  recordRecentMap: 'recordRecentMap',
  updateRecentMap: 'updateRecentMap',
  removeRecentMap: 'removeRecentMap',
  importModel: 'importModel',
  exportModel: 'exportModel',
});
