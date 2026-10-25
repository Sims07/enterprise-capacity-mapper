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
} from '../../services/storage.ts';
import type { CatalogModel } from '../../application/catalogUseCases.ts';
import type { ModelRepository } from '../../ports/modelRepository.ts';

/** Browser adapter for the model repository port. */
export const createLocalStorageModelRepository = (): ModelRepository => {
  const adapter = {
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
  } satisfies ModelRepository;
  return Object.freeze(adapter);
};

export type LocalStorageRepositoryModel = CatalogModel;
