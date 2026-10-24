import { createModelHistory } from './modelHistory.js';
import { createEmptyMap, updateCapabilityPriority, updateModel } from './modelCommands.js';

/**
 * Application service. It coordinates the model repository port and model history.
 * No React or browser API is allowed in this layer.
 */
export const createMapService = ({ repository, initialModel, historyLimit = 50 }) => {
  const history = createModelHistory(initialModel, historyLimit);

  return Object.freeze({
    load: fallback => {
      const model = repository.load(fallback);
      history.replace(model);
      return model;
    },
    snapshot: () => history.snapshot(),
    update: patch => history.commit(updateModel(history.snapshot().current, patch)),
    updateCapabilityPriority: (capabilityId, priority) => history.commit(
      updateCapabilityPriority(history.snapshot().current, capabilityId, priority)
    ),
    createEmptyMap: options => history.commit(
      createEmptyMap(history.snapshot().current, options)
    ),
    replace: model => history.commit(model),
    undo: () => history.undo(),
    redo: () => history.redo(),
    persist: () => repository.save(history.snapshot().current),
  });
};
