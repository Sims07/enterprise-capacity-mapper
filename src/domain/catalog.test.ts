import test from 'node:test';
import assert from 'node:assert/strict';
import { Catalog } from './catalog.ts';

const model = {
  domains: [{ id: 'd1', code: 'D1', name: 'Domain' }],
  capabilities: [{ id: 'c1', domainId: 'd1', name: 'Capability' }],
  applications: [{ id: 'a1', name: 'Application', capabilityIds: [] }],
};

test('Catalog enforces domain invariants and returns immutable snapshots', () => {
  const catalog = Catalog.fromModel(model);
  const updated = catalog.renameDomain('d1', '  Customer  ');

  assert.equal(updated.toModel().domains[0].name, 'Customer');
  assert.equal(catalog.toModel().domains[0].name, 'Domain');
  assert.throws(() => catalog.renameDomain('missing', 'Name'), /Domaine introuvable/);
  assert.throws(() => catalog.renameDomain('d1', '   '), /obligatoire/);
});

test('Catalog rejects capabilities that reference an unknown domain', () => {
  assert.throws(() => Catalog.fromModel(model).createCapability({ id: 'c2', domainId: 'missing', name: 'Capability 2' }), /Domaine introuvable/);
});

test('Catalog makes application-capability links idempotent', () => {
  const catalog = Catalog.fromModel(model);
  const linked = catalog.linkApplicationToCapability('a1', 'c1').linkApplicationToCapability('a1', 'c1');
  assert.deepEqual(linked.toModel().applications[0].capabilityIds, ['c1']);
  const unlinked = linked.unlinkApplicationFromCapability('a1', 'c1');
  assert.deepEqual(unlinked.toModel().applications[0].capabilityIds, []);
});

test('Catalog removes a domain and its dependent capability links', () => {
  const catalog = Catalog.fromModel({
    ...model,
    applications: [{ id: 'a1', name: 'Application', capabilityIds: ['c1', 'external'] }],
  });
  assert.deepEqual(catalog.removeDomain('d1').toModel(), {
    domains: [],
    capabilities: [],
    applications: [{ id: 'a1', name: 'Application', capabilityIds: ['external'] }],
  });
});
