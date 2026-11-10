import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileCompanionReview } from './companionReviewProgress.ts';

const gap = { id: 'coverage.target-uncovered:cap-1' };
const other = { id: 'coverage.target-uncovered:cap-2' };
const newer = { id: 'coverage.application-unlinked:app-3' };

test('a linked capability no longer appears as an active problem', () => {
  const result = reconcileCompanionReview([gap], []);
  assert.deepEqual(result, { current: [], resolvedCount: 1, newlyDetectedCount: 0, changed: true });
});

test('a partial fix preserves the remaining problems', () => {
  const result = reconcileCompanionReview([gap, other], [other]);
  assert.deepEqual(result, { current: [other], resolvedCount: 1, newlyDetectedCount: 0, changed: true });
});

test('new problems are not accidentally hidden by a resolved previous finding', () => {
  const result = reconcileCompanionReview([gap], [newer]);
  assert.deepEqual(result, { current: [newer], resolvedCount: 1, newlyDetectedCount: 1, changed: true });
});

test('without a model change, diagnostic history stays unchanged', () => {
  const result = reconcileCompanionReview([gap], [gap]);
  assert.deepEqual(result, { current: [gap], resolvedCount: 0, newlyDetectedCount: 0, changed: false });
});
