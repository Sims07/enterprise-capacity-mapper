import { describe, it, expect } from 'vitest';
import { assessApplicationRisk, analyzeApplicationRisks, scoreRisk, validateApplicationRisk } from '../../src/domain/applicationRisk.ts';
import type { Application, CatalogModel } from '../../src/domain/catalogModel.ts';
const asOf = '2026-11-09';
const app: Application = { id: 'a', name: 'Application', capabilityIds: ['c'] };
const model: CatalogModel = { domains: [{ id: 'd', code: 'D', name: 'Domaine' }, { id: 'empty', code: 'E', name: 'Vide' }], capabilities: [{ id: 'c', domainId: 'd', name: 'Capacité' }], applications: [app] };

describe('risk assessment', () => {
  it.each([[1, 'low'], [4, 'low'], [5, 'moderate'], [9, 'moderate'], [10, 'high'], [16, 'high'], [17, 'critical'], [25, 'critical']])('classifies score %s as %s', (score, level) => expect(scoreRisk(Number(score))).toBe(level));
  it('keeps missing assessments unknown and does not infer risk from application status', () => {
    expect(assessApplicationRisk({ ...app, status: 'Obsolète' }, asOf)).toMatchObject({ score: null, level: 'unknown', needsQualification: true, supportUnknown: true });
  });
  it('combines declared risk and lifecycle without mutating input', () => {
    const assessed = { ...app, risk: { likelihood: 1, impact: 1, supportEndDate: '2026-11-09' } };
    expect(assessApplicationRisk(assessed, asOf)).toMatchObject({ score: 1, level: 'high', support: 'expired', daysToSupportEnd: 0 });
    expect(assessed.risk.likelihood).toBe(1);
    expect(assessApplicationRisk({ ...app, risk: { likelihood: 5, impact: 5, supportEndDate: '2027-01-01' } }, asOf)).toMatchObject({ level: 'critical', support: 'upcoming' });
    expect(assessApplicationRisk({ ...app, risk: { supportEndDate: '2027-01-01' } }, asOf)).toMatchObject({ level: 'moderate', needsQualification: true });
    expect(assessApplicationRisk({ ...app, risk: { supportEndDate: '2028-01-01' } }, asOf)).toMatchObject({ level: 'unknown', support: 'supported' });
  });
  it('uses the 180 day support boundary', () => {
    expect(assessApplicationRisk({ ...app, risk: { supportEndDate: '2027-05-08' } }, asOf).support).toBe('upcoming');
    expect(assessApplicationRisk({ ...app, risk: { supportEndDate: '2027-05-09' } }, asOf).support).toBe('supported');
  });
  it('does not reduce an accepted or mitigating risk and reopens overdue acceptance', () => {
    const risk = { likelihood: 5, impact: 5, status: 'accepted' as const, dueDate: '2027-01-01' };
    expect(assessApplicationRisk({ ...app, risk }, asOf)).toMatchObject({ level: 'critical', actionable: false, overdue: false });
    expect(assessApplicationRisk({ ...app, risk: { ...risk, dueDate: '2026-11-08' } }, asOf)).toMatchObject({ level: 'critical', actionable: true, overdue: true });
    expect(assessApplicationRisk({ ...app, risk: { ...risk, status: 'mitigating' } }, asOf)).toMatchObject({ level: 'critical', actionable: true });
    expect(assessApplicationRisk({ ...app, risk: { ...risk, status: 'resolved', dueDate: '2026-01-01' } }, asOf)).toMatchObject({ inherentLevel: 'critical', level: 'low', actionable: false, overdue: false });
  });
  it('aggregates worst exposure, deduplicates application links and excludes targets', () => {
    const applications: Application[] = [app, { ...app, id: 'critical', risk: { likelihood: 5, impact: 5 } }, { ...app, id: 'target', status: ' Cible ', risk: { likelihood: 5, impact: 5 } }, { ...app, id: 'resolved', risk: { likelihood: 5, impact: 5, status: 'resolved' } }];
    const result = analyzeApplicationRisks({ ...model, applications }, asOf);
    expect(result.plannedCount).toBe(1);
    expect(result.domains[0]).toMatchObject({ level: 'critical', unknownCount: 1 });
    expect(result.domains[0].applications).toHaveLength(3);
    expect(result.targets[0].level).toBe('critical');
    expect(result.domains[1].level).toBe('unknown');
    expect(result.applications[0].application.id).toBe('critical');
    const resolvedOnly = analyzeApplicationRisks({ ...model, applications: [applications[3]] }, asOf);
    expect(resolvedOnly.targets[0].level).toBe('unknown');
    const single = analyzeApplicationRisks({ ...model, layout: { depth: 1 }, applications: [{ ...applications[1], capabilityIds: ['d', 'd'] }] }, asOf);
    expect(single.domains[0].applications).toHaveLength(1);
    expect(single.targets[0].level).toBe('critical');
  });
  it('sorts equal severity by due dates and names', () => {
    const result = analyzeApplicationRisks({ ...model, applications: [{ ...app, name: 'Z', risk: { likelihood: 3, impact: 5 } }, { ...app, id: 'b', name: 'B', risk: { likelihood: 3, impact: 5 } }, { ...app, id: 'late', risk: { likelihood: 3, impact: 5, dueDate: '2026-01-01' } }] }, asOf);
    expect(result.applications.map(item => item.application.id)).toEqual(['late', 'b', 'a']);
  });
});

describe('risk persistence validation', () => {
  it.each([null, [], 'risk', { likelihood: 0, impact: 2 }, { likelihood: 2, impact: 6 }, { likelihood: 2.5, impact: 2 }, { likelihood: 1 }, { impact: 2 }, { category: 'x' }, { status: 'x' }, { owner: 5 }, { mitigation: [] }, { rationale: {} }, { dueDate: '2026-02-30' }, { supportEndDate: 'tomorrow' }, { dueDate: 23 }, { dueDate: '' }, { status: 'accepted' }, { status: 'resolved' }])('rejects invalid assessment %j', value => expect(() => validateApplicationRisk(value)).toThrow());
  it('accepts optional data, valid dates and documented decisions', () => {
    expect(validateApplicationRisk({})).toEqual({});
    const risk = { likelihood: 3, impact: 5, category: 'security' as const, owner: 'RSSI', dueDate: '2027-02-28', supportEndDate: '2028-02-29', rationale: 'Décision documentée', status: 'accepted' as const };
    expect(validateApplicationRisk(risk)).toBe(risk);
    expect(validateApplicationRisk({ ...risk, status: 'resolved', mitigation: 'Migration réalisée' }).status).toBe('resolved');
  });
});
