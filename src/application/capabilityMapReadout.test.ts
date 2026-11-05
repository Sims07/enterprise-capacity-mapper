import test from 'node:test';
import assert from 'node:assert/strict';
import { capabilityMapReadout, MAP_READING_MODES } from './capabilityMapReadout.ts';
import { analyzeCapabilityGaps } from '../domain/capabilityGaps.ts';
import { getCapabilityCoverageState } from '../domain/coverage.ts';
import type { CatalogModel } from '../domain/catalogModel.ts';

const model = (): CatalogModel => ({
  domains: [{ id: 'd', code: 'D', name: 'Domaine' }],
  capabilities: [{ id: 'c', domainId: 'd', name: 'Contrats', priority: 'P1' }],
  applications: [{ id: 'a', name: 'Actuelle', status: 'Actif', capabilityIds: ['c'] },
    { id: 't', name: 'Future', status: 'Cible', capabilityIds: ['c'] }],
});

test('reading modes are explicit and preserve the existing applications mode', () => {
  assert.deepEqual(MAP_READING_MODES.map(mode => mode.id), ['applications', 'coverage', 'maturity', 'gaps']);
  assert.ok(MAP_READING_MODES.every(mode => mode.help.length > 0));
});

test('an unqualified capability remains unknown even if an application is linked', () => {
  const input = model();
  const readout = capabilityMapReadout(
    input.capabilities[0],
    getCapabilityCoverageState('c', input.applications),
    analyzeCapabilityGaps(input)[0],
  );
  assert.equal(readout.functionalLabel, 'À évaluer');
  assert.equal(readout.applicationLabel, '1 application(s) actuelle(s)');
  assert.equal(readout.targetApplicationLabel, '1 application(s) cible(s)');
  assert.equal(readout.currentMaturityLabel, 'Non évaluée');
  assert.equal(readout.targetMaturityLabel, 'Non définie');
  assert.equal(readout.maturityGapLabel, 'Écart non calculable');
  assert.equal(readout.needsQualification, true);
});

test('functional coverage, maturity and gap signals reflect assessed facts only', () => {
  const input = model();
  input.capabilities[0].assessment = { functionalCoverage: 'partial', currentMaturity: 2, targetMaturity: 4 };
  const readout = capabilityMapReadout(input.capabilities[0], getCapabilityCoverageState('c', input.applications), analyzeCapabilityGaps(input)[0]);
  assert.equal(readout.functionalLabel, 'Partielle');
  assert.equal(readout.currentMaturityLabel, '2/5');
  assert.equal(readout.targetMaturityLabel, '4/5');
  assert.equal(readout.maturityGapLabel, '+2 niveau(x) à atteindre');
  assert.deepEqual(readout.signals.map(signal => signal.kind), ['functional-partial', 'maturity']);
  assert.equal(readout.needsQualification, false);
});

test('coverage states and reached maturity targets stay distinct', () => {
  const input = model();
  input.capabilities[0].assessment = { functionalCoverage: 'sufficient', currentMaturity: 4, targetMaturity: 3 };
  const readout = capabilityMapReadout(input.capabilities[0], getCapabilityCoverageState('c', []), undefined);
  assert.equal(readout.functionalLabel, 'Suffisante');
  assert.equal(readout.applicationLabel, 'Aucune application actuelle');
  assert.equal(readout.targetApplicationLabel, 'Aucune application cible');
  assert.equal(readout.maturityGapLabel, 'Cible atteinte ou dépassée');
  assert.deepEqual(readout.signals, []);
});
