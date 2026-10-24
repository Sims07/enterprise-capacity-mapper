/**
 * Pure model history used by the application layer.
 * It deliberately knows nothing about React, the DOM or browser storage.
 */
export function createModelHistory(initialModel, limit = 50) {
  let current = initialModel;
  const undoStack = [];
  const redoStack = [];

  const snapshot = () => ({
    current,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  });

  const commit = nextModel => {
    if (nextModel === current) return snapshot();
    undoStack.push(current);
    if (undoStack.length > limit) undoStack.shift();
    redoStack.length = 0;
    current = nextModel;
    return snapshot();
  };

  const replace = nextModel => commit(nextModel);

  const undo = () => {
    if (!undoStack.length) return snapshot();
    redoStack.push(current);
    current = undoStack.pop();
    return snapshot();
  };

  const redo = () => {
    if (!redoStack.length) return snapshot();
    undoStack.push(current);
    if (undoStack.length > limit) undoStack.shift();
    current = redoStack.pop();
    return snapshot();
  };

  return Object.freeze({ commit, replace, undo, redo, snapshot });
}
