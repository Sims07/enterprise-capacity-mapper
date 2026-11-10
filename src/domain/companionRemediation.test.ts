import test from 'node:test';
import assert from 'node:assert/strict';
import { companionRemediation } from './companionRemediation.ts';

const model = {
  layout: { depth: 2 },
  domains: [{ id: 'd', name: 'Opérations', code: 'OPS' }],
  capabilities: [{ id: 'c', name: 'Gestion des identités', domainId: 'd' }],
  applications: [{ id: 'a', name: 'IAM', capabilityIds: [] }],
};
const gap = { id: 'coverage.target-uncovered:c', ruleId: 'coverage.target-uncovered', title: 'Capacité sans application', evidence: [{ type: 'capability', id: 'c', name: 'Gestion des identités' }] };

test('only completed qualifying answers offer actions targeting the real capability', () => {
  assert.equal(companionRemediation(gap, [], model).state, 'none');
  assert.equal(companionRemediation(gap, ['confirmed'], model).state, 'none');
  const incomplete = companionRemediation(gap, ['incomplete'], model);
  assert.equal(incomplete.state, 'available');
  assert.deepEqual(incomplete.actions.map(item => item.kind), ['link-target', 'create-application']);
  assert.deepEqual(incomplete.actions[0].reference, { type: 'capability', id: 'c', name: 'Gestion des identités' });
  const confirmed = companionRemediation(gap, ['confirmed', 'important'], model);
  assert.deepEqual(confirmed.actions.map(item => item.kind), ['create-application', 'link-target']);
  assert.deepEqual(companionRemediation(gap, ['outside'], model).actions, []);
  assert.deepEqual(companionRemediation(gap, ['unknown'], model).actions, []);
});

test('handles no application, N0 cartographies, deleted target and stale findings safely', () => {
  const empty = { ...model, applications: [] };
  assert.deepEqual(companionRemediation(gap, ['incomplete'], empty).actions.map(item => item.kind), ['create-application']);
  const n0 = { ...model, layout: { depth: 1 }, domains: model.domains };
  const n0Gap = { ...gap, evidence: [{ type: 'domain', id: 'd', name: 'Opérations' }] };
  assert.deepEqual(companionRemediation(n0Gap, ['incomplete'], n0).actions[0].reference, { type: 'domain', id: 'd', name: 'Opérations' });
  assert.equal(companionRemediation(gap, ['incomplete'], n0).state, 'none');
  assert.equal(companionRemediation(gap, ['incomplete'], { ...model, capabilities: [] }).state, 'none');
  assert.equal(companionRemediation(gap, ['incomplete'], { ...model, applications: [{ ...model.applications[0], capabilityIds: ['c'] }] }).state, 'relation-added');
});

test('unlinked applications use the existing inverse linking flow', () => {
  const finding = { id: 'coverage.application-unlinked:a', ruleId: 'coverage.application-unlinked', title: 'Application sans relation', evidence: [{ type: 'application', id: 'a', name: 'IAM' }] };
  assert.deepEqual(companionRemediation(finding, ['incomplete'], model).actions.map(item => item.kind), ['link-application']);
  assert.equal(companionRemediation(finding, ['outside'], model).state, 'none');
  assert.equal(companionRemediation(finding, ['incomplete'], { ...model, applications: [{ ...model.applications[0], capabilityIds: ['c'] }] }).state, 'relation-added');
  assert.equal(companionRemediation(finding, ['incomplete'], { ...model, applications: [] }).state, 'none');
  assert.equal(companionRemediation({ ...finding, ruleId: 'name.duplicate' }, ['same'], model).state, 'none');
});
