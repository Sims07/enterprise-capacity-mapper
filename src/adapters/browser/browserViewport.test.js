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
  hoverNodes.forEach(node => node.classes.add('drop-over'));
  return {
    body: {},
    listeners,
    calls,
    hoverNodes,
    addEventListener(type, handler) { listeners.set(type, handler); calls.push(['add', type]); },
    removeEventListener(type, handler) { if (listeners.get(type) === handler) listeners.delete(type); calls.push(['remove', type]); },
    querySelectorAll(selector) {
      if (selector === '.drop-over') return hoverNodes.filter(node => node.classes.has('drop-over'));
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

  cleanup();
  assert.deepEqual(documentObject.calls, [
    ['add', 'dragover'], ['add', 'dragend'], ['add', 'drop'],
    ['remove', 'dragover'], ['remove', 'dragend'], ['remove', 'drop'],
  ]);
  assert.equal(documentObject.listeners.size, 0);
});
