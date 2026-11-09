import type { BusinessProcess, CatalogModel } from './catalogModel.ts';
import { isCurrentApplication } from './coverage.ts';
import { assessApplicationRisk } from './applicationRisk.ts';

export function processCapabilityTargets(model: CatalogModel) {
  return (model.layout as { depth?: number } | undefined)?.depth === 1 ? model.domains : model.capabilities;
}

/** Validate optional process data at both editing and JSON boundaries. */
export function validateBusinessProcesses(value: unknown, targetIds: ReadonlySet<string>): BusinessProcess[] {
  if (!Array.isArray(value)) throw new Error('Les processus métier doivent être une liste.');
  const ids = new Set<string>();
  for (const entry of value) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Processus métier invalide.');
    const process = entry as Record<string, unknown>;
    if (typeof process.id !== 'string' || !process.id.trim() || typeof process.name !== 'string' || !process.name.trim()) {
      throw new Error('Chaque processus doit avoir un identifiant et un nom non vides.');
    }
    if (ids.has(process.id)) throw new Error('Identifiant de processus dupliqué.');
    ids.add(process.id);
    for (const field of ['code', 'owner', 'description', 'documentationUrl'] as const) {
      if (process[field] !== undefined && typeof process[field] !== 'string') throw new Error('Les informations du processus doivent être du texte.');
    }
    if (process.documentationUrl) {
      let valid = false;
      try { valid = ['https:', 'http:'].includes(new URL(process.documentationUrl as string).protocol); } catch { /* Invalid reference. */ }
      if (!valid) throw new Error('Le lien de documentation doit être une URL HTTP ou HTTPS valide.');
    }
    if (!Array.isArray(process.capabilityIds) || process.capabilityIds.some(id => typeof id !== 'string' || !targetIds.has(id))) {
      throw new Error('Un processus référence une capacité inexistante ou une liste de rattachements invalide.');
    }
    if (new Set(process.capabilityIds).size !== process.capabilityIds.length) throw new Error('Un processus contient un rattachement en double.');
  }
  return value as BusinessProcess[];
}

export function saveBusinessProcess(model: CatalogModel, draft: BusinessProcess): CatalogModel {
  const process = { ...draft, name: draft.name.trim(), code: draft.code?.trim(), owner: draft.owner?.trim(),
    description: draft.description?.trim(), documentationUrl: draft.documentationUrl?.trim(), capabilityIds: [...new Set(draft.capabilityIds)] };
  const existing = model.businessProcesses ?? [];
  const processes = existing.some(item => item.id === process.id) ? existing.map(item => item.id === process.id ? process : item) : [...existing, process];
  validateBusinessProcesses(processes, new Set(processCapabilityTargets(model).map(target => target.id)));
  return { ...model, businessProcesses: processes };
}

export function removeBusinessProcess(model: CatalogModel, processId: string): CatalogModel {
  return { ...model, businessProcesses: (model.businessProcesses ?? []).filter(process => process.id !== processId) };
}

/** Preserve a process when its capabilities disappear; only remove dangling links. */
export function removeProcessCapabilityLinks(model: CatalogModel, removedIds: ReadonlySet<string>): Pick<CatalogModel, 'businessProcesses'> {
  return model.businessProcesses === undefined ? {} : { businessProcesses: model.businessProcesses.map(process => ({ ...process,
    capabilityIds: process.capabilityIds.filter(id => !removedIds.has(id)) })) };
}

/** Application and risk exposure is inferred through capability links, never direct process usage. */
export function analyzeBusinessProcesses(model: CatalogModel, asOf: string) {
  const targets = processCapabilityTargets(model);
  return (model.businessProcesses ?? []).map(process => {
    const capabilities = targets.filter(target => process.capabilityIds.includes(target.id));
    const applications = model.applications.filter(app => app.capabilityIds?.some(id => process.capabilityIds.includes(id)));
    const currentApplications = applications.filter(isCurrentApplication);
    const plannedApplications = applications.filter(app => !isCurrentApplication(app));
    const unsupportedCapabilities = capabilities.filter(target => !currentApplications.some(app => app.capabilityIds?.includes(target.id)));
    const exposedApplications = currentApplications.map(app => assessApplicationRisk(app, asOf))
      .filter(item => item.status !== 'resolved' && ['high', 'critical'].includes(item.level));
    return { process, capabilities, currentApplications, plannedApplications, unsupportedCapabilities, exposedApplications };
  });
}
