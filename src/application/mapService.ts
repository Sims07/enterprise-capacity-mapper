import { createModelHistory, type ModelHistory } from './modelHistory.ts';
import { createEmptyMap, updateCapabilityPriority, updateModel, type Model, type MapCreationOptions } from './modelUseCases.ts';

export type MapRepository<M extends Model = Model> = {
  load: (fallback: M) => M;
  save: (model: M) => void;
};

export type MapService<M extends Model = Model> = {
  load: (fallback: M) => M;
  snapshot: () => ReturnType<ModelHistory<M>['snapshot']>;
  update: (patch: Partial<M>) => ReturnType<ModelHistory<M>['commit']>;
  updateCapabilityPriority: (capabilityId: string, priority?: string) => ReturnType<ModelHistory<M>['commit']>;
  createEmptyMap: (options: MapCreationOptions) => ReturnType<ModelHistory<M>['commit']>;
  replace: (model: M) => ReturnType<ModelHistory<M>['commit']>;
  undo: () => ReturnType<ModelHistory<M>['undo']>;
  redo: () => ReturnType<ModelHistory<M>['redo']>;
  persist: () => void;
};

export const createMapService = <M extends Model>({
  repository,
  initialModel,
  historyLimit = 50,
}: {
  repository: MapRepository<M>;
  initialModel: M;
  historyLimit?: number;
}): MapService<M> => {
  const history = createModelHistory(initialModel, historyLimit);

  return Object.freeze({
    load: (fallback: M) => {
      const model = repository.load(fallback);
      history.replace(model);
      return model;
    },
    snapshot: () => history.snapshot(),
    update: (patch: Partial<M>) => history.commit(updateModel(history.snapshot().current, patch)),
    updateCapabilityPriority: (capabilityId: string, priority?: string) => history.commit(
      updateCapabilityPriority(history.snapshot().current, capabilityId, priority)
    ),
    createEmptyMap: (options: MapCreationOptions) => history.commit(
      createEmptyMap(history.snapshot().current, options)
    ),
    replace: (model: M) => history.commit(model),
    undo: () => history.undo(),
    redo: () => history.redo(),
    persist: () => repository.save(history.snapshot().current),
  });
};
