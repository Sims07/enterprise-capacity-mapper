/**
 * DOM event subscriptions and viewport calculations used by React menus.
 * Browser globals are injectable to keep the adapter deterministic in tests.
 */
export const createBrowserInteractions = ({
  windowObject = window,
  documentObject = document,
} = {}) => ({
  clampMenuPosition: ({ x, y, width, height, padding = 8 }) => ({
    x: Math.max(padding, Math.min(x, windowObject.innerWidth - width - padding)),
    y: Math.max(padding, Math.min(y, windowObject.innerHeight - height - padding)),
  }),

  listenForKeyDown: handler => {
    documentObject.addEventListener('keydown', handler);
    return () => documentObject.removeEventListener('keydown', handler);
  },

  listenForDismissal: ({
    pointerEvent = 'pointerdown',
    getInsideNode,
    onOutside,
    onEscape,
  }) => {
    const handlePointer = event => {
      const insideNode = getInsideNode();
      if (insideNode?.contains(event.target)) return;
      onOutside();
    };
    const handleKeyDown = event => {
      if (event.key === 'Escape') onEscape();
    };

    documentObject.addEventListener(pointerEvent, handlePointer);
    documentObject.addEventListener('keydown', handleKeyDown);
    return () => {
      documentObject.removeEventListener(pointerEvent, handlePointer);
      documentObject.removeEventListener('keydown', handleKeyDown);
    };
  },
});
