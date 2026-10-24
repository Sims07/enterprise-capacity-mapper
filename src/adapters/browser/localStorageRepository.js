import {
  exportModel,
  importModel,
  loadLocalMaps,
  loadModel,
  loadRecentMaps,
  recordRecentMap,
  removeRecentMap,
  saveLocalMap,
  saveModel,
  updateRecentMap,
} from '../../services/storage.js';

/** Browser adapter for the model repository port. */
export const createLocalStorageModelRepository = () => ({
  load: loadModel,
  save: saveModel,
  loadLocalMaps,
  saveLocalMap,
  loadRecentMaps,
  recordRecentMap,
  updateRecentMap,
  removeRecentMap,
  importModel,
  exportModel,
});
