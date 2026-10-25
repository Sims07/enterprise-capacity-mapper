export type HistorySnapshot<T> = {
  current: T;
  canUndo: boolean;
  canRedo: boolean;
};

export type ModelHistory<T> = {
  commit: (nextModel: T) => HistorySnapshot<T>;
  replace: (nextModel: T) => HistorySnapshot<T>;
  undo: () => HistorySnapshot<T>;
  redo: () => HistorySnapshot<T>;
  snapshot: () => HistorySnapshot<T>;
};

/** Pure model history used by the application layer. */
export function createModelHistory<T>(initialModel: T, limit = 50): ModelHistory<T> {
  let current = initialModel;
  const undoStack: T[] = [];
  const redoStack: T[] = [];

  const snapshot = (): HistorySnapshot<T> => ({
    current,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  });

  const commit = (nextModel: T): HistorySnapshot<T> => {
    if (nextModel === current) return snapshot();
    undoStack.push(current);
    if (undoStack.length > limit) undoStack.shift();
    redoStack.length = 0;
    current = nextModel;
    return snapshot();
  };

  const replace = (nextModel: T) => commit(nextModel);

  const undo = () => {
    if (!undoStack.length) return snapshot();
    redoStack.push(current);
    current = undoStack.pop() as T;
    return snapshot();
  };

  const redo = () => {
    if (!redoStack.length) return snapshot();
    undoStack.push(current);
    if (undoStack.length > limit) undoStack.shift();
    current = redoStack.pop() as T;
    return snapshot();
  };

  return Object.freeze({ commit, replace, undo, redo, snapshot });
}
