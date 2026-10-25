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
  assert.deepEqual(getCapabilityCoverageState('cap-3', applications), {
    state: 'gap', label: 'Gap', symbol: '✕', count: 0, apps: [],
  });
  assert.deepEqual(getCapabilityCoverageState('cap-2', applications), {
    state: 'ok', label: 'Couvert', symbol: '✓', count: 1, apps: [applications[0]],
  });
  assert.deepEqual(getCapabilityCoverageState('cap-1', applications), {
    state: 'redundant', label: 'Redondance', symbol: '⇄', count: 2, apps: [applications[0], applications[1]],
  });
});

test('coverage domain derives impact, selected gaps and redundancy without mutation', () => {
  const result = deriveCoverageOverview({ mappedItems, applications, selectedIds: ['cap-2', 'cap-3'] });
  assert.deepEqual(result.touched, [applications[0]]);
  assert.deepEqual(result.gaps, [{ id: 'cap-3' }]);
  assert.deepEqual(result.redundancy, [{ id: 'cap-1' }]);
  assert.deepEqual(applications[0].capabilityIds, ['cap-1', 'cap-2', 'domain-1']);
  assert.deepEqual(deriveCoverageOverview({
    mappedItems: [{ id: 'cap-3' }],
    applications: [{ id: 'app-empty', name: 'Empty' }],
    selectedIds: ['cap-3'],
  }).gaps, [{ id: 'cap-3' }]);
});
