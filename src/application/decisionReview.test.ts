import test from 'node:test';
import assert from 'node:assert/strict';
import { createDecisionReview, formatDecisionReviewMarkdown, simulateApplicationRetirement, DECISION_REVIEW_DISPLAY_LIMIT } from './decisionReview.ts';
import type { CatalogModel } from '../domain/catalogModel.ts';

const model = (): CatalogModel => ({
  metadata: { name: 'Cartographie test' },
  domains: [{ id: 'domain', code: 'D', name: 'Domaine' }],
  capabilities: [
    { id: 'a', domainId: 'domain', name: 'Contrats', code: 'C1', priority: 'P1', assessment: { functionalCoverage: 'partial', currentMaturity: 2, targetMaturity: 4 } },
    { id: 'b', domainId: 'domain', name: 'Paie', code: 'C2', assessment: { functionalCoverage: 'sufficient' } },
    { id: 'c', domainId: 'domain', name: 'Achats', code: 'C3' },
  ],
  applications: [
    { id: 'legacy', name: 'Application historique', status: 'Obsolète', capabilityIds: ['a', 'b'] },
    { id: 'active', name: 'Application active', status: 'Actif', capabilityIds: ['b'] },
    { id: 'future', name: 'Application future', status: 'Cible', capabilityIds: ['a', 'c'] },
  ],
});

test('prepares sourced review questions ordered by declared priority and with unknowns counted', () => {
  const review = createDecisionReview(model());
  assert.equal(review.mapName, 'Cartographie test');
  assert.equal(review.unqualifiedCoverage, 1);
  assert.equal(review.missingFromReference, 0);
  assert.equal(review.items[0].priority, 'P1');
  assert.ok(review.items.some(item => item.question.includes('trajectoire')));
  assert.ok(review.items.some(item => item.evidence.includes('obsolète')));
  assert.equal(DECISION_REVIEW_DISPLAY_LIMIT, 10);
  const markdown = formatDecisionReviewMarkdown(review);
  assert.match(markdown, /Revue d’architecture — Cartographie test/);
  assert.match(markdown, /Les faits non renseignés sont inconnus/);
  assert.match(markdown, /priorité déclarée : P1/);
});

test('reports absent reference capabilities as validation questions rather than decisions', () => {
  const reference = model();
  reference.capabilities.push({ id: 'z', domainId: 'domain', code: 'C4', name: 'Archives' });
  const review = createDecisionReview(model(), reference);
  assert.equal(review.missingFromReference, 1);
  assert.ok(review.items.some(item => item.title === 'Archives' && item.capabilityId === null));
  assert.match(formatDecisionReviewMarkdown(review), /Archives/);
});

test('handles a blank map without fake decisions and uses an explicit empty-state', () => {
  const review = createDecisionReview({ domains: [], capabilities: [], applications: [] });
  assert.equal(review.mapName, 'Cartographie sans nom');
  assert.equal(review.items.length, 0);
  assert.match(formatDecisionReviewMarkdown(review), /Aucun signal déterministe/);
});

test('simulates loss of last support, decreased support and target support without mutating the map', () => {
  const original = model();
  assert.equal(simulateApplicationRetirement(original, 'not-found'), null);
  const legacy = simulateApplicationRetirement(original, 'legacy');
  assert.equal(legacy?.applicationName, 'Application historique');
  assert.deepEqual(legacy?.lostLastCurrentSupport.map(item => item.id), ['a']);
  assert.deepEqual(legacy?.reducedCurrentSupport.map(item => item.id), ['b']);
  assert.deepEqual(legacy?.lostTargetSupport, []);
  const future = simulateApplicationRetirement(original, 'future');
  assert.deepEqual(future?.lostTargetSupport.map(item => item.id), ['a', 'c']);
  assert.deepEqual(future?.lostLastCurrentSupport, []);
  assert.equal(original.applications.length, 3);
});
