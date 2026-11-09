import test from 'node:test';
import assert from 'node:assert/strict';
import { GUIDED_REVIEW_LIMIT, resolveCompanionReview } from './companionReview.ts';

const finding = (ruleId: string) => ({ id: 'finding-1', ruleId, title: 'Observation métier' });

test('guidance starts with a local contextual question and does not infer a risk', () => {
  const step = resolveCompanionReview(finding('coverage.target-uncovered'));
  assert.equal(GUIDED_REVIEW_LIMIT, 3);
  assert.equal(step.status, 'question');
  if (step.status !== 'question') throw new Error('Question attendue');
  assert.match(step.prompt, /absence de relation/);
  assert.deepEqual(step.choices.map(choice => choice.id), ['confirmed', 'incomplete', 'outside', 'unknown']);
  assert.deepEqual(resolveCompanionReview(finding('coverage.target-uncovered'), ['invalid']), step);
});

test('a confirmed gap asks for business impact before suggesting a review', () => {
  const next = resolveCompanionReview(finding('coverage.target-uncovered'), ['confirmed']);
  assert.equal(next.status, 'question');
  if (next.status !== 'question') throw new Error('Deuxième question attendue');
  assert.match(next.prompt, /processus métier/);
  assert.deepEqual(resolveCompanionReview(finding('coverage.target-uncovered'), ['confirmed', 'invalid']), next);
  const critical = resolveCompanionReview(finding('coverage.target-uncovered'), ['confirmed', 'important']);
  assert.equal(critical.status, 'completed');
  if (critical.status === 'completed') assert.match(critical.action, /Ne pas déduire automatiquement/);
  const ordinary = resolveCompanionReview(finding('coverage.target-uncovered'), ['confirmed', 'not-important']);
  assert.equal(ordinary.status, 'completed');
  const unknownImpact = resolveCompanionReview(finding('coverage.target-uncovered'), ['confirmed', 'unknown']);
  assert.equal(unknownImpact.status, 'completed');
  if (unknownImpact.status === 'completed') assert.equal(unknownImpact.classification, 'À qualifier');
});

test('missing data and out-of-scope answers never become confirmed deficiencies', () => {
  const incomplete = resolveCompanionReview(finding('coverage.target-uncovered'), ['incomplete']);
  assert.deepEqual(incomplete, { status: 'completed', classification: 'Donnée incomplète', action: 'Compléter les relations applicatives existantes avant de qualifier un risque.' });
  const outside = resolveCompanionReview(finding('coverage.target-uncovered'), ['outside']);
  assert.equal(outside.status, 'completed');
  if (outside.status === 'completed') assert.match(outside.action, /périmètre/);
  const pending = resolveCompanionReview(finding('coverage.target-uncovered'), ['unknown']);
  assert.equal(pending.status, 'completed');
});

test('each existing rule provides a deterministic question and a review action', () => {
  const cases: Array<[string, string[]]> = [
    ['coverage.application-unlinked', ['incomplete', 'outside', 'unknown']],
    ['name.duplicate', ['same', 'different', 'unknown']],
    ['name.missing', ['ready', 'later', 'unknown']],
    ['naming.action-phrase', ['process', 'capability', 'unknown']],
    ['relationship.capability-domain-missing', ['existing', 'missing', 'unknown']],
    ['relationship.application-target-missing', ['removed', 'error', 'unknown']],
    ['model.invalid', ['yes', 'no', 'unknown']],
  ];
  for (const [ruleId, choices] of cases) {
    const first = resolveCompanionReview(finding(ruleId));
    assert.equal(first.status, 'question', ruleId);
    if (first.status !== 'question') throw new Error('Question attendue');
    assert.deepEqual(first.choices.map(choice => choice.id), choices, ruleId);
    for (const choice of choices) {
      const resolution = resolveCompanionReview(finding(ruleId), [choice]);
      assert.equal(resolution.status, 'completed', ruleId + ':' + choice);
      if (resolution.status === 'completed') {
        assert.ok(resolution.classification);
        assert.ok(resolution.action);
      }
    }
  }
});
