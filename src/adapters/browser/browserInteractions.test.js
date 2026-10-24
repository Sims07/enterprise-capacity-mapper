import test from 'node:test';
import assert from 'node:assert/strict';
import { createBrowserInteractions } from './browserInteractions.js';

const createDocument = () => {
  const listeners = new Map();
  const calls = [];
  return {
    listeners,
    calls,
    addEventListener(type, handler) { listeners.set(type, handler); calls.push(['add', type]); },
    removeEventListener(type, handler) {
      if (listeners.get(type) === handler) listeners.delete(type);
      calls.push(['remove', type]);
    },
    dispatch(type, event) { listeners.get(type)?.(event); },
  };
};

test('menu position is clamped to viewport bounds with padding', () => {
  const interactions = createBrowserInteractions({
    windowObject: { innerWidth: 800, innerHeight: 600 },
    documentObject: createDocument(),
  });

  assert.deepEqual(interactions.clampMenuPosition({ x: 100, y: 120, width: 180, height: 96 }), { x: 100, y: 120 });
  assert.deepEqual(interactions.clampMenuPosition({ x: 790, y: 590, width: 180, height: 168 }), { x: 612, y: 424 });
  assert.deepEqual(interactions.clampMenuPosition({ x: -20, y: -10, width: 180, height: 96 }), { x: 8, y: 8 });
});

test('dismissal listeners ignore inside clicks, dismiss outside, handle Escape and clean up', () => {
  const documentObject = createDocument();
  const inside = { contains: target => target === 'inside' };
  const calls = [];
  const interactions = createBrowserInteractions({
    windowObject: { innerWidth: 800, innerHeight: 600 },
    documentObject,
  });

  const cleanup = interactions.listenForDismissal({
    pointerEvent: 'mousedown',
    getInsideNode: () => inside,
    onOutside: () => calls.push('outside'),
    onEscape: () => calls.push('escape'),
  });

  documentObject.dispatch('mousedown', { target: 'inside' });
  documentObject.dispatch('mousedown', { target: 'outside' });
  documentObject.dispatch('keydown', { key: 'Enter' });
  documentObject.dispatch('keydown', { key: 'Escape' });
  assert.deepEqual(calls, ['outside', 'escape']);

  cleanup();
  assert.equal(documentObject.listeners.size, 0);
  assert.deepEqual(documentObject.calls, [
    ['add', 'mousedown'], ['add', 'keydown'],
    ['remove', 'mousedown'], ['remove', 'keydown'],
  ]);
});

test('keyboard subscription registers and removes the same handler', () => {
  const documentObject = createDocument();
  const interactions = createBrowserInteractions({
    windowObject: { innerWidth: 800, innerHeight: 600 },
    documentObject,
  });
  const handler = () => {};
  const cleanup = interactions.listenForKeyDown(handler);

  assert.equal(documentObject.listeners.get('keydown'), handler);
  cleanup();
  assert.equal(documentObject.listeners.has('keydown'), false);
  assert.deepEqual(documentObject.calls, [['add', 'keydown'], ['remove', 'keydown']]);
});
