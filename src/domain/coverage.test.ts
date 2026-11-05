import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveCoverageOverview, getCapabilityCoverageState } from './coverage.ts';

const mappedItems = [{ id: 'cap-1' }, { id: 'cap-2' }, { id: 'cap-3' }, { id: 'domain-1' }];
const applications = [
  { id: 'app-1', name: 'Application 1', capabilityIds: ['cap-1', 'cap-2', 'domain-1'] },
  { id: 'app-2', name: 'Application 2', capabilityIds: ['cap-1'] },
  { id: 'app-3', name: 'Application 3' },
];

test('coverage domain classifies gaps, coverage and redundancy', () => {
  assert.deepEqual(getCapabilityCoverageState('cap-3', applications), { state: 'gap', label: 'Gap', symbol: '✕', count: 0, currentCount: 0, targetCount: 0, apps: [] });
  assert.deepEqual(getCapabilityCoverageState('cap-2', applications), { state: 'ok', label: 'Couvert', symbol: '✓', count: 1, currentCount: 1, targetCount: 0, apps: [applications[0]] });
  assert.deepEqual(getCapabilityCoverageState('cap-1', applications), { state: 'redundant', label: 'Redondance', symbol: '⇄', count: 2, currentCount: 2, targetCount: 0, apps: [applications[0], applications[1]] });
});

test('coverage overview derives impact, selected gaps and redundancy without mutation', () => {
  const result = deriveCoverageOverview({ mappedItems, applications, selectedIds: ['cap-2', 'cap-3'] });
  assert.deepEqual(result.touched, [applications[0]]);
  assert.deepEqual(result.gaps, [{ id: 'cap-3' }]);
  assert.deepEqual(result.redundancy, [{ id: 'cap-1' }]);
  assert.deepEqual(applications[0].capabilityIds, ['cap-1', 'cap-2', 'domain-1']);
});

test('coverage overview returns empty impact and gaps for an empty selection but still reports redundancy', () => {
  const result = deriveCoverageOverview({ mappedItems, applications, selectedIds: [] });
  assert.deepEqual(result.touched, []);
  assert.deepEqual(result.gaps, []);
  assert.deepEqual(result.redundancy, [{ id: 'cap-1' }]);
});

test('coverage overview deduplicates selected ids and reports only selected uncovered targets', () => {
  const result = deriveCoverageOverview({ mappedItems, applications, selectedIds: ['cap-3', 'cap-3', 'cap-2'] });
  assert.deepEqual(result.gaps, [{ id: 'cap-3' }]);
  assert.deepEqual(result.touched, [applications[0]]);
});

test('coverage state treats missing relations as empty and counts each application once per target', () => {
  const withoutRelations = { id: 'app-empty', name: 'Empty' };
  assert.deepEqual(getCapabilityCoverageState('cap-3', [withoutRelations]).apps, []);
  assert.deepEqual(getCapabilityCoverageState('cap-1', [
    { id: 'app-1', name: 'Application 1', capabilityIds: ['cap-1', 'cap-1'] },
    { id: 'app-2', name: 'Application 2', capabilityIds: ['cap-1'] },
  ]).apps.map(application => application.id), ['app-1', 'app-2']);
  assert.deepEqual(deriveCoverageOverview({ mappedItems: [{ id: 'cap-3' }], applications: [withoutRelations], selectedIds: ['cap-3'] }).gaps, [{ id: 'cap-3' }]);
});

test('planned target-only links stay visible but do not count as current coverage or redundancy', () => {
  const input = [
    { id: 'future', name: 'Future', status: 'Cible', capabilityIds: ['cap-1', 'cap-2'] },
    { id: 'active', name: 'Active', status: 'Actif', capabilityIds: ['cap-2'] },
    { id: 'old', name: 'Obsolète', status: 'Obsolète', capabilityIds: ['cap-2'] },
  ];
  assert.deepEqual(getCapabilityCoverageState('cap-1', input), {
    state: 'gap', label: 'Gap', symbol: '✕', count: 1, currentCount: 0, targetCount: 1, apps: [input[0]],
  });
  assert.deepEqual(getCapabilityCoverageState('cap-2', input), {
    state: 'redundant', label: 'Redondance', symbol: '⇄', count: 3, currentCount: 2, targetCount: 1, apps: input,
  });
  const result = deriveCoverageOverview({ mappedItems, applications: input, selectedIds: ['cap-1', 'cap-2'] });
  assert.deepEqual(result.gaps.map(item => item.id), ['cap-1']);
  assert.deepEqual(result.redundancy.map(item => item.id), ['cap-2']);
  assert.deepEqual(result.touched, input);
});
