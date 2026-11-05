import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCapabilityAssessment, MATURITY_LEVELS, FUNCTIONAL_COVERAGE_STATES } from './capabilityAssessment.ts';

test('supports explicitly qualified coverage and five maturity levels', () => {
  const assessment = { functionalCoverage: 'partial', currentMaturity: 2, targetMaturity: 4, rationale: 'Revue métier' };
  assert.equal(validateCapabilityAssessment(assessment), assessment);
  assert.deepEqual(MATURITY_LEVELS, [1, 2, 3, 4, 5]);
  assert.deepEqual(FUNCTIONAL_COVERAGE_STATES, ['unknown', 'none', 'partial', 'sufficient']);
  assert.deepEqual(validateCapabilityAssessment({}), {});
});

test('rejects unsupported coverage states, maturity scores and malformed rationale', () => {
  for (const value of [null, [], 'nope']) assert.throws(() => validateCapabilityAssessment(value), /invalide/i);
  for (const state of ['automatic', '', null, 2]) assert.throws(() => validateCapabilityAssessment({ functionalCoverage: state }), /couverture/i);
  for (const field of ['currentMaturity', 'targetMaturity']) {
    for (const value of [0, 6, 2.5, '3', null]) assert.throws(() => validateCapabilityAssessment({ [field]: value }), /maturité/i);
  }
  assert.throws(() => validateCapabilityAssessment({ rationale: 3 }), /justification/i);
});
