import test from 'node:test';
import assert from 'node:assert/strict';
import { createBrowserViewport } from './browserViewport.ts';

class FakeElement {
  constructor({ parentElement = null, top = 0, bottom = 300, scrollHeight = 400, clientHeight = 100 } = {}) {
    Object.assign(this, { parentElement, scrollHeight, clientHeight });
    this.rect = { top, bottom };
    this.scrollCalls = [];
    this.classes = new Set();
  }
  getBoundingClientRect() { return this.rect; }
  scrollBy(x, y) { this.scrollCalls.push([x, y]); }
  classList = {
    remove: name => this.classes.delete(name),
  };
}

const createDocument = () => {
  const listeners = new Map();
  const calls = [];
  const hoverNodes = [new FakeElement(), new FakeElement()];
  hoverNodes.forEach(node => { node.classes.add('drop-over'); node.classes.add('capability-drop-target'); });
  return {
    body: {},
    listeners,
    calls,
    hoverNodes,
    mosaicNodes: [],
    addEventListener(type, handler) { listeners.set(type, handler); calls.push(['add', type]); },
    removeEventListener(type, handler) { if (listeners.get(type) === handler) listeners.delete(type); calls.push(['remove', type]); },
    querySelectorAll(selector) {
      if (selector === '.drop-over') return hoverNodes.filter(node => node.classes.has('drop-over'));
      if (selector === '.capability-drop-target') return hoverNodes.filter(node => node.classes.has('capability-drop-target'));
      if (selector === '.map-mosaic .mosaic-domain[data-layout-grid-column][data-layout-grid-row]') return this.mosaicNodes;
      return [];
    },
    dispatch(type, event) { listeners.get(type)?.(event); },
  };
};

test('viewport adapter resets page and nested scroll positions', () => {
  const calls = [];
  const nodes = [{ scrollTop: 12, scrollLeft: 5 }, { scrollTop: 20, scrollLeft: 7 }];
  const viewport = createBrowserViewport({
    windowObject: { scrollTo: options => calls.push(options) },
    documentObject: { querySelectorAll: () => nodes },
    getComputedStyleFn: () => ({ overflowY: 'visible' }),
    ElementClass: FakeElement,
  });

  viewport.resetScrollPositions();

  assert.deepEqual(calls, [{ top: 0, left: 0, behavior: 'auto' }]);
  assert.deepEqual(nodes, [{ scrollTop: 0, scrollLeft: 0 }, { scrollTop: 0, scrollLeft: 0 }]);
});

test('viewport adapter installs auto-scroll and removes listeners on cleanup', () => {
  const documentObject = createDocument();
  const windowObject = { innerHeight: 600, scrollBy() {} };
  const scrollContainer = new FakeElement();
  const target = new FakeElement({ parentElement: scrollContainer });
  const viewport = createBrowserViewport({
    windowObject,
    documentObject,
    getComputedStyleFn: node => ({ overflowY: node === scrollContainer ? 'auto' : 'visible' }),
    ElementClass: FakeElement,
  });

  const cleanup = viewport.installDragAutoScroll();
  documentObject.dispatch('dragover', { target, clientY: 5 });

  assert.deepEqual(scrollContainer.scrollCalls, [[0, -17]]);
  documentObject.dispatch('drop', {});
  assert.equal(documentObject.hoverNodes.some(node => node.classes.has('drop-over')), false);
  assert.equal(documentObject.hoverNodes.some(node => node.classes.has('capability-drop-target')), false);

  cleanup();
  assert.deepEqual(documentObject.calls, [
    ['add', 'dragover'], ['add', 'dragstart'], ['add', 'dragend'], ['add', 'drop'],
    ['remove', 'dragover'], ['remove', 'dragstart'], ['remove', 'dragend'], ['remove', 'drop'],
  ]);
  assert.equal(documentObject.listeners.size, 0);
});

const createResizingMosaicCard = () => {
  const draggableDomain = {
    dataset: { resizeWasDraggable: 'true' },
    attributes: { draggable: 'false' },
    setAttribute(name, value) { this.attributes[name] = value; },
  };
  const card = {
    dataset: {
      layoutGridColumn: '2 / span 1',
      layoutGridRow: '3 / span 1',
      resizeStartX: '300',
      resizeOriginalColumn: '2 / span 1',
      resizeOriginalRow: '3 / span 1',
    },
    style: { gridColumn: '2 / span 2', gridRow: '3 / span 2' },
    querySelector: selector => selector === '.domain-card' ? draggableDomain : null,
  };
  return { card, draggableDomain };
};

test('native drag cancellation restores N0 placement and draggable state without reloading', () => {
  const documentObject = createDocument();
  const { card, draggableDomain } = createResizingMosaicCard();
  documentObject.mosaicNodes.push(card);
  const viewport = createBrowserViewport({
    documentObject,
    windowObject: { innerHeight: 600, scrollBy() {} },
    getComputedStyleFn: () => ({ overflowY: 'visible' }),
    ElementClass: FakeElement,
  });

  const cleanup = viewport.installDragAutoScroll();
  documentObject.dispatch('dragend', {});

  assert.deepEqual(card.style, { gridColumn: '2 / span 1', gridRow: '3 / span 1' });
  assert.equal(card.dataset.resizeStartX, undefined);
  assert.equal(card.dataset.resizeOriginalRow, undefined);
  assert.equal(draggableDomain.attributes.draggable, 'true');
  assert.equal(draggableDomain.dataset.resizeWasDraggable, undefined);

  // An invalid/no-op drop must repair another transient preview as well.
  card.style.gridRow = '99 / span 1';
  documentObject.dispatch('drop', {});
  assert.equal(card.style.gridRow, card.dataset.layoutGridRow);

  cleanup();
});

test('pointer capture interruption restores the persisted grid placement', () => {
  const { card, draggableDomain } = createResizingMosaicCard();
  const viewport = createBrowserViewport({
    documentObject: createDocument(),
    windowObject: { scrollTo() {} },
    getComputedStyleFn: () => ({ overflowY: 'visible' }),
    ElementClass: FakeElement,
  });

  viewport.resetMosaicResizePreview(card);

  assert.equal(card.style.gridColumn, card.dataset.layoutGridColumn);
  assert.equal(card.style.gridRow, card.dataset.layoutGridRow);
  assert.equal(draggableDomain.attributes.draggable, 'true');
  assert.equal(card.dataset.resizeStartX, undefined);
});
