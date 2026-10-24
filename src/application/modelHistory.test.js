import test from 'node:test';
import assert from 'node:assert/strict';
import { createModelHistory } from './modelHistory.js';

test('model history commits, undoes and redoes without React or browser APIs', () => {
  const initial = { value: 1 };
  const history = createModelHistory(initial);
  const second = { value: 2 };
  const third = { value: 3 };

  assert.deepEqual(history.snapshot(), { current: initial, canUndo: false, canRedo: false });
  history.commit(second);
  assert.deepEqual(history.snapshot(), { current: second, canUndo: true, canRedo: false });
  history.commit(third);
  assert.deepEqual(history.snapshot(), { current: third, canUndo: true, canRedo: false });

  history.undo();
  assert.deepEqual(history.snapshot(), { current: second, canUndo: true, canRedo: true });
  history.undo();
  assert.deepEqual(history.snapshot(), { current: initial, canUndo: false, canRedo: true });
  history.redo();
  assert.deepEqual(history.snapshot(), { current: second, canUndo: true, canRedo: true });
});

test('a new commit clears the redo branch', () => {
  const history = createModelHistory({ value: 1 });
  history.commit({ value: 2 });
  history.undo();
  history.commit({ value: 4 });

  assert.equal(history.snapshot().canRedo, false);
  assert.deepEqual(history.snapshot().current, { value: 4 });
});
