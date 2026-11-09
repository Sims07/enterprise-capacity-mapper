import { describe, it, expect } from 'vitest';
import { analyzeBusinessProcesses, processCapabilityTargets, saveBusinessProcess, removeBusinessProcess, removeProcessCapabilityLinks, validateBusinessProcesses } from '../../src/domain/businessProcesses.ts';
import { Catalog } from '../../src/domain/catalog.ts';
import type { CatalogModel, BusinessProcess } from '../../src/domain/catalogModel.ts';
const process: BusinessProcess = { id: 'p', name: 'Traiter une commande', capabilityIds: ['c1', 'c2'] };
const base: CatalogModel = { domains: [{ id: 'd', code: 'D', name: 'Commerce' }], capabilities: [{ id: 'c1', domainId: 'd', name: 'Commandes' }, { id: 'c2', domainId: 'd', name: 'Facturation' }],
  applications: [{ id: 'a', name: 'ERP', capabilityIds: ['c1', 'c2'], risk: { likelihood: 5, impact: 5 } }, { id: 'future', name: 'Cible', status: 'Cible', capabilityIds: ['c2'] }], businessProcesses: [process] };
const ids = new Set(['c1', 'c2']);

describe('process model validation', () => {
  it.each([null, {}, [null], [[]], [{ id: '', name: 'x', capabilityIds: [] }], [{ id: 'p', name: ' ', capabilityIds: [] }], [{ id: 1, name: 'x', capabilityIds: [] }], [{ id: 'p', name: 'x', capabilityIds: {} }], [{ ...process, capabilityIds: ['missing'] }], [{ ...process, capabilityIds: [5] }], [{ ...process, capabilityIds: ['c1', 'c1'] }], [process, process], [{ ...process, owner: 3 }], [{ ...process, code: [] }], [{ ...process, description: false }], [{ ...process, documentationUrl: 'javascript:alert(1)' }], [{ ...process, documentationUrl: 'file:///x' }], [{ ...process, documentationUrl: 'relative/path' }]])('rejects malformed process data %j', value => expect(() => validateBusinessProcesses(value, ids)).toThrow());
  it('accepts optional descriptive fields, unlinked drafts and HTTP(S) references', () => {
    expect(validateBusinessProcesses([], ids)).toEqual([]);
    expect(validateBusinessProcesses([{ ...process, documentationUrl: 'https://example.org/process', owner: 'Commerce' }], ids)).toHaveLength(1);
    expect(validateBusinessProcesses([{ ...process, capabilityIds: [], documentationUrl: 'http://example.org' }], ids)).toHaveLength(1);
  });
});

describe('process editing and impact', () => {
  it('creates, updates and removes processes without changing application links or input', () => {
    const created = saveBusinessProcess({ ...base, businessProcesses: undefined }, { ...process, name: ' Traiter une commande ', owner: ' Commerce ', code: ' P01 ', capabilityIds: ['c1', 'c1'] });
    expect(created.businessProcesses?.[0]).toMatchObject({ name: 'Traiter une commande', owner: 'Commerce', code: 'P01', capabilityIds: ['c1'] });
    expect(base.businessProcesses?.[0]).toEqual(process);
    const updated = saveBusinessProcess(created, { ...process, name: 'Encaisser la commande' });
    expect(updated.businessProcesses).toHaveLength(1);
    expect(updated.businessProcesses?.[0].name).toBe('Encaisser la commande');
    expect(removeBusinessProcess(updated, 'p').businessProcesses).toEqual([]);
    expect(removeBusinessProcess({ ...base, businessProcesses: undefined }, 'missing').businessProcesses).toEqual([]);
    expect(updated.applications).toBe(base.applications);
    expect(() => saveBusinessProcess(base, { ...process, name: ' ' })).toThrow();
  });
  it('deduplicates application exposure across capabilities and keeps target applications distinct', () => {
    const finding = analyzeBusinessProcesses(base, '2026-11-09')[0];
    expect(finding.capabilities).toHaveLength(2);
    expect(finding.currentApplications).toHaveLength(1);
    expect(finding.plannedApplications).toHaveLength(1);
    expect(finding.exposedApplications).toHaveLength(1);
    expect(finding.unsupportedCapabilities).toEqual([]);
    expect(analyzeBusinessProcesses({ ...base, applications: [base.applications[1]] }, '2026-11-09')[0].unsupportedCapabilities).toHaveLength(2);
    expect(analyzeBusinessProcesses({ ...base, businessProcesses: undefined }, '2026-11-09')).toEqual([]);
  });
  it('does not hide accepted risk or show resolved risk as process exposure', () => {
    for (const status of ['accepted', 'resolved'] as const) {
      const result = analyzeBusinessProcesses({ ...base, applications: [{ ...base.applications[0], risk: { likelihood: 5, impact: 5, status } }] }, '2026-11-09')[0];
      expect(result.exposedApplications).toHaveLength(status === 'accepted' ? 1 : 0);
    }
  });
  it('works with direct domain links in a one-level map', () => {
    const single = { ...base, layout: { depth: 1 }, businessProcesses: [{ ...process, capabilityIds: ['d'] }], applications: [{ id: 'app', name: 'Application', capabilityIds: ['d'] }] };
    expect(processCapabilityTargets(single)).toBe(single.domains);
    expect(analyzeBusinessProcesses(single, '2026-11-09')[0].currentApplications).toHaveLength(1);
    expect(validateBusinessProcesses(single.businessProcesses, new Set(['d']))).toHaveLength(1);
  });
  it('removes dangling links when capabilities or domains are deleted, preserving the process', () => {
    const withoutCapability = Catalog.fromModel(base).removeCapability('c1').toModel();
    expect(withoutCapability.businessProcesses?.[0].capabilityIds).toEqual(['c2']);
    const withoutDomain = Catalog.fromModel(base).removeDomain('d').toModel();
    expect(withoutDomain.businessProcesses?.[0].capabilityIds).toEqual([]);
    expect(withoutDomain.businessProcesses?.[0].name).toBe(process.name);
    const single = Catalog.fromModel({ ...base, layout: { depth: 1 }, businessProcesses: [{ ...process, capabilityIds: ['d'] }] }).removeDomain('d', 1).toModel();
    expect(single.businessProcesses?.[0].capabilityIds).toEqual([]);
    expect(removeProcessCapabilityLinks({ ...base, businessProcesses: undefined }, new Set(['c1']))).toEqual({});
    expect(base.businessProcesses?.[0].capabilityIds).toEqual(['c1', 'c2']);
  });
  it('starts a new map without retaining processes from the previous map', () => {
    expect(Catalog.fromModel(base).createEmptyMap('Nouvelle', '', {}).toModel().businessProcesses).toEqual([]);
    expect(Catalog.fromModel({ ...base, businessProcesses: undefined }).createEmptyMap('Nouvelle', '', {}).toModel().businessProcesses).toBeUndefined();
  });
});
