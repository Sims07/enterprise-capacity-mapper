import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeCartography } from '../../src/services/ai/cartographyAnalysis.js';

const model = overrides => ({
  schemaVersion: 3,
  metadata: { name: 'Carte de test' },
  layout: { depth: 2 },
  domains: [{ id: 'd1', name: 'Finance' }],
  capabilities: [{ id: 'c1', domainId: 'd1', name: 'Gestion de la facturation' }],
  applications: [{ id: 'a1', name: 'ERP', status: 'Actif', capabilityIds: ['c1'] }],
  ...overrides,
});

test('signale une entrée invalide sans lever d’exception', () => {
  const result = analyzeCartography(null);
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.observations[0].ruleId, 'model.invalid');
});

test('un modèle cohérent et couvert ne génère pas de constat', () => {
  const result = analyzeCartography(model());
  assert.deepEqual(result.observations, []);
  assert.match(result.summary, /Aucun point de vigilance/);
});

test('signale une capacité rattachée à un domaine absent', () => {
  const result = analyzeCartography(model({
    capabilities: [{ id: 'c1', domainId: 'absent', name: 'Facturation' }],
  }));
  assert.ok(result.observations.some(item => item.ruleId === 'relationship.capability-domain-missing'));
});

test('signale une relation applicative vers une cible absente', () => {
  const result = analyzeCartography(model({
    applications: [{ id: 'a1', name: 'ERP', capabilityIds: ['absent'] }],
  }));
  assert.ok(result.observations.some(item => item.ruleId === 'relationship.application-target-missing'));
  assert.ok(result.observations.some(item => item.ruleId === 'coverage.target-uncovered'));
});

test('en profondeur 1, la couverture cible les domaines N0', () => {
  const result = analyzeCartography(model({
    layout: { depth: 1 },
    applications: [{ id: 'a1', name: 'ERP', capabilityIds: ['d1'] }],
  }));
  assert.equal(result.observations.some(item => item.ruleId === 'coverage.target-uncovered'), false);
  assert.equal(result.context.depth, 1);
});

test('signale une cible non couverte et une application non reliée', () => {
  const result = analyzeCartography(model({
    applications: [{ id: 'a1', name: 'ERP', capabilityIds: [] }],
  }));
  assert.ok(result.observations.some(item => item.ruleId === 'coverage.target-uncovered'));
  assert.ok(result.observations.some(item => item.ruleId === 'coverage.application-unlinked'));
});

test('signale les doublons potentiels sans confondre les accents et la casse', () => {
  const result = analyzeCartography(model({
    domains: [
      { id: 'd1', name: 'Finance' },
      { id: 'd2', name: 'FINANCE' },
    ],
    capabilities: [{ id: 'c1', domainId: 'd1', name: 'Gestion de la facturation' }],
  }));
  assert.ok(result.observations.some(item => item.ruleId === 'name.duplicate'));
});

test('suggère de revoir un intitulé verbal sans en faire une erreur', () => {
  const result = analyzeCartography(model({
    capabilities: [{ id: 'c1', domainId: 'd1', name: 'Gérer les factures' }],
  }));
  const observation = result.observations.find(item => item.ruleId === 'naming.action-phrase');
  assert.ok(observation);
  assert.equal(observation.severity, 'suggestion');
});

test('ne considère pas des statuts applicatifs différents comme une incohérence', () => {
  const result = analyzeCartography(model({
    applications: [
      { id: 'a1', name: 'ERP actuel', status: 'Actif', capabilityIds: ['c1'] },
      { id: 'a2', name: 'ERP cible', status: 'Cible', capabilityIds: ['c1'] },
    ],
  }));
  assert.equal(result.observations.some(item => /statut|cycle de vie/i.test(item.ruleId + ' ' + item.title)), false);
});

test('ne modifie jamais le modèle analysé', () => {
  const input = model();
  const before = structuredClone(input);
  analyzeCartography(input);
  assert.deepEqual(input, before);
});
