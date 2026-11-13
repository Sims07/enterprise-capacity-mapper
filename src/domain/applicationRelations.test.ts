import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultRelationRole, lifecycleLabel, outgoingApplicationsForCapability, relationRoleFor, retainRelationRoles, supportsCurrent, supportsTarget, validateRelationRoles } from './applicationRelations.ts';
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

test('lifecycle label does not confuse planned applications with target-only relations', () => {
  assert.equal(lifecycleLabel('Cible'), 'Planifiée');
  assert.equal(lifecycleLabel('Actif'), 'Actif');
  assert.equal(lifecycleLabel(undefined), 'Non renseigné');
});

test('outgoing applications are current-only for the capability, regardless of lifecycle status', () => {
  const old = { ...app('Actif'), id: 'old', name: 'Web PS' };
  const shared = { ...app('Obsolète'), id: 'shared', name: 'Ameli Pro' };
  const planned = { ...app('Actif'), id: 'planned', name: 'Dossier de santé' };
  const current = [old, shared];
  const target = [shared, planned];

  assert.deepEqual(outgoingApplicationsForCapability(current, target), [old]);
  assert.deepEqual(outgoingApplicationsForCapability(current, []), current);
  assert.deepEqual(outgoingApplicationsForCapability([], target), []);
  assert.deepEqual(outgoingApplicationsForCapability([shared], [shared]), []);
  // The source projections must remain unchanged.
  assert.deepEqual(current, [old, shared]);
  assert.deepEqual(target, [shared, planned]);
});
