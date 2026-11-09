/**
 * Browser viewport and drag-and-drop behavior kept outside React orchestration.
 * Browser objects are injectable so this adapter can be exercised in Node tests.
 */
/**
 * A resize preview writes directly to grid styles for immediate feedback.
 * The model, exposed via data-layout-grid-*, remains authoritative: native
 * drag/drop can cancel pointer capture without the normal pointerup callback.
 */
const RESIZE_DATA_KEYS = [
  'resizeStartX', 'resizeStartY', 'resizeLastX', 'resizeLastY',
  'resizeCellWidth', 'resizeCellHeight', 'resizeColumn', 'resizeRow',
  'resizeOriginalColumn', 'resizeOriginalRow',
] as const;

const restoreMosaicResizePreview = (card: HTMLElement) => {
  if (card.dataset.layoutGridColumn) card.style.gridColumn = card.dataset.layoutGridColumn;
  if (card.dataset.layoutGridRow) card.style.gridRow = card.dataset.layoutGridRow;

  RESIZE_DATA_KEYS.forEach(key => delete card.dataset[key]);

  const draggableDomain = card.querySelector<HTMLElement>('.domain-card');
  if (draggableDomain?.dataset.resizeWasDraggable !== undefined) {
    draggableDomain.setAttribute('draggable', draggableDomain.dataset.resizeWasDraggable);
    delete draggableDomain.dataset.resizeWasDraggable;
  }
};

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

  resetMosaicResizePreview: restoreMosaicResizePreview,

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
    const clearDragState = () => {
      documentObject.querySelectorAll('.drop-over').forEach(node => node.classList.remove('drop-over'));
      // Ended or canceled HTML drag-and-drop must never leave a temporary CSS
      // grid position behind, even when the model placement is unchanged.
      documentObject.querySelectorAll('.map-mosaic .mosaic-domain[data-layout-grid-column][data-layout-grid-row]')
        .forEach(node => restoreMosaicResizePreview(node as HTMLElement));
    };
    documentObject.addEventListener('dragover', onDragOver);
    documentObject.addEventListener('dragstart', clearDragState);
    documentObject.addEventListener('dragend', clearDragState);
    documentObject.addEventListener('drop', clearDragState);
    return () => {
      documentObject.removeEventListener('dragover', onDragOver);
      documentObject.removeEventListener('dragstart', clearDragState);
      documentObject.removeEventListener('dragend', clearDragState);
      documentObject.removeEventListener('drop', clearDragState);
    };
  },
});
