import test from 'node:test';
import assert from 'node:assert/strict';
import { presentationCapabilitySignal, PRESENTATION_READING_LEGENDS } from './presentationReadout.ts';
import type { Capability } from '../domain/catalogModel.ts';
import type { CapabilityGapFinding } from '../domain/capabilityGaps.ts';

const capability: Capability = { id: 'c', domainId: 'd', name: 'Capacité' };
const finding = (kinds: CapabilityGapFinding['signals'] = [], needsQualification = false): CapabilityGapFinding => ({
  id: 'c', name: 'Capacité', domainId: 'd', priority: 'unqualified',
  currentApplications: [], targetApplications: [], functionalCoverage: 'unknown',
  maturityDelta: null, needsQualification, signals: kinds,
});

test('la couverture non évaluée est distincte de la couverture fonctionnelle absente', () => {
  assert.equal(presentationCapabilitySignal(capability, undefined, 'coverage').tone, 'neutral');
  assert.equal(presentationCapabilitySignal({ ...capability, assessment: { functionalCoverage: 'none' } }, undefined, 'coverage').tone, 'critical');
  assert.equal(presentationCapabilitySignal({ ...capability, assessment: { functionalCoverage: 'partial' } }, undefined, 'coverage').tone, 'high');
  assert.equal(presentationCapabilitySignal({ ...capability, assessment: { functionalCoverage: 'sufficient' } }, undefined, 'coverage').tone, 'covered');
});

test('la maturité utilise son niveau déclaré, sans déduire une note des applications', () => {
  assert.equal(presentationCapabilitySignal(capability, undefined, 'maturity').tone, 'neutral');
  assert.deepEqual(presentationCapabilitySignal({ ...capability, assessment: { currentMaturity: 2, targetMaturity: 4 } }, undefined, 'maturity'), { tone: 'high', label: '2/5 · cible 4' });
  assert.equal(presentationCapabilitySignal({ ...capability, assessment: { currentMaturity: 4, targetMaturity: 5 } }, undefined, 'maturity').tone, 'covered');
});

test('les écarts restent des signaux explicites et non un score de gravité calculé', () => {
  assert.equal(presentationCapabilitySignal(capability, finding([], true), 'gaps').tone, 'neutral');
  assert.equal(presentationCapabilitySignal(capability, finding(), 'gaps').tone, 'covered');
  assert.equal(presentationCapabilitySignal(capability, finding([{ kind: 'missing-current', description: '' }]), 'gaps').tone, 'critical');
  assert.equal(presentationCapabilitySignal(capability, finding([{ kind: 'maturity', description: '' }]), 'gaps').tone, 'gap');
});

test('la légende de présentation reste spécifique à la dimension et aux tons réellement utilisés', () => {
  assert.deepEqual(PRESENTATION_READING_LEGENDS.identity, []);
  const coverage = PRESENTATION_READING_LEGENDS.coverage;
  assert.equal(coverage.find(item => item.tone === 'critical')?.label, 'Non couverte');
  assert.equal(coverage.find(item => item.tone === 'high')?.label, 'Partielle');
  assert.equal(coverage.find(item => item.tone === 'neutral')?.label, 'À évaluer');
  const maturity = PRESENTATION_READING_LEGENDS.maturity;
  assert.match(maturity.find(item => item.tone === 'covered')?.label ?? '', /4/);
  assert.equal(maturity.find(item => item.tone === 'neutral')?.label, 'Non évaluée');
  const gaps = PRESENTATION_READING_LEGENDS.gaps;
  assert.equal(gaps.find(item => item.tone === 'covered')?.label, 'Aucun signal détecté');
  assert.equal(gaps.find(item => item.tone === 'neutral')?.label, 'Non évalué / à qualifier');
  for (const mode of ['coverage', 'maturity', 'gaps'] as const) {
    const tones = PRESENTATION_READING_LEGENDS[mode].map(item => item.tone);
    assert.equal(new Set(tones).size, tones.length, 'Un seul libellé par tonalité dans ' + mode);
  }
});
