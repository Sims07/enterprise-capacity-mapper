import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultRelationRole, relationRoleFor, retainRelationRoles, supportsCurrent, supportsTarget, validateRelationRoles } from './applicationRelations.ts';
import type { Application } from './catalogModel.ts';

const app = (status = 'Actif'): Application => ({ id: 'a', name: 'Application', status, capabilityIds: ['c'] });

test('legacy links use application status until an explicit per-capability role exists', () => {
  assert.equal(defaultRelationRole(app('Cible')), 'target');
  assert.equal(relationRoleFor(app('Cible'), 'c'), 'target');
  assert.equal(supportsCurrent(app('Cible'), 'c'), false);
  assert.equal(supportsTarget(app('Cible'), 'c'), true);
  assert.equal(relationRoleFor(app('Actif'), 'missing'), undefined);
  assert.equal(relationRoleFor({ ...app('Actif'), relationRoles: { c: 'target' } }, 'c'), 'target');
});

test('a single application may contribute to both horizons on one capability and only the future of another', () => {
  const application = { ...app('Actif'), capabilityIds: ['c', 'other'], relationRoles: { c: 'both', other: 'target' } } as Application;
  assert.equal(supportsCurrent(application, 'c'), true);
  assert.equal(supportsTarget(application, 'c'), true);
  assert.equal(supportsCurrent(application, 'other'), false);
  assert.equal(supportsTarget(application, 'other'), true);
});

test('roles are validated against actual links and orphaned values are pruned', () => {
  validateRelationRoles({ c: 'both' }, ['c']);
  validateRelationRoles(undefined, ['c']);
  for (const value of [null, [], 'target', { missing: 'both' }, { c: 'unknown' }]) {
    assert.throws(() => validateRelationRoles(value, ['c']));
  }
  assert.deepEqual(retainRelationRoles({ ...app(), relationRoles: { c: 'both', missing: 'target' } }, ['c']), { relationRoles: { c: 'both' } });
  assert.deepEqual(retainRelationRoles({ ...app(), relationRoles: { c: 'both' } }, []), {});
});
