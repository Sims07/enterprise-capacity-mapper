/**
 * Browser viewport and drag-and-drop behavior kept outside React orchestration.
 * Browser objects are injectable so this adapter can be exercised in Node tests.
 */
export const createBrowserViewport = ({
  windowObject = window,
  documentObject = document,
  getComputedStyleFn = getComputedStyle,
  ElementClass = Element,
} = {}) => ({
  resetScrollPositions: () => {
    windowObject.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    documentObject.querySelectorAll('main, aside, [data-scroll-container]').forEach(node => {
      node.scrollTop = 0;
      node.scrollLeft = 0;
    });
  },

  installDragAutoScroll: () => {
    const EDGE = 70;
    const MAX = 18;
    const scrollableAncestor = node => {
      for (let current = node; current && current !== documentObject.body; current = current.parentElement) {
        const overflowY = getComputedStyleFn(current).overflowY;
        if (/(auto|scroll)/.test(overflowY) && current.scrollHeight > current.clientHeight + 1) return current;
      }
      return null;
    };
    const onDragOver = event => {
      if (!(event.target instanceof ElementClass)) return;
      const element = scrollableAncestor(event.target);
      const rect = element ? element.getBoundingClientRect() : { top: 0, bottom: windowObject.innerHeight };
      const top = Math.max(rect.top, 0);
      const bottom = Math.min(rect.bottom, windowObject.innerHeight);
      let dy = 0;
      if (event.clientY < top + EDGE) dy = -MAX * Math.min(1, (top + EDGE - event.clientY) / EDGE);
      else if (event.clientY > bottom - EDGE) dy = MAX * Math.min(1, (event.clientY - (bottom - EDGE)) / EDGE);
      if (dy) (element || windowObject).scrollBy(0, Math.round(dy));
    };
    const clearHover = () => documentObject.querySelectorAll('.drop-over').forEach(node => node.classList.remove('drop-over'));
    documentObject.addEventListener('dragover', onDragOver);
    documentObject.addEventListener('dragend', clearHover);
    documentObject.addEventListener('drop', clearHover);
    return () => {
      documentObject.removeEventListener('dragover', onDragOver);
      documentObject.removeEventListener('dragend', clearHover);
      documentObject.removeEventListener('drop', clearHover);
    };
  },
});
