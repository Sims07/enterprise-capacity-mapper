export type Layout = { columnId?: string; layerId?: string; columnSpan?: number; [key: string]: unknown };
export type Domain = { id: string; code: string; name: string; description?: string; color?: string; layout?: Layout; [key: string]: unknown };
export type Capability = { id: string; domainId: string; code?: string; name: string; description?: string; priority?: string; [key: string]: unknown };
export type Application = { id: string; name: string; code?: string; type?: string; status?: string; vendor?: string; capabilityIds?: string[]; description?: string; [key: string]: unknown };
export type CatalogModel = { domains: Domain[]; capabilities: Capability[]; applications: Application[]; [key: string]: unknown };
export type DomainForm = { code?: string; name: string; description?: string; color?: string; columnId?: string; layerId?: string; columnSpan?: string | number };
export type CapabilityForm = { domainId: string; code?: string; name: string; description?: string; priority?: string };
export type ApplicationForm = { name: string; code?: string; type?: string; status?: string; vendor?: string; capabilityIds?: string[]; description?: string };

export const createDomain = ({ domains, form, id, defaultColumnId, defaultLayerId, resolveColor }: { domains: Domain[]; form: DomainForm; id: string; defaultColumnId: string; defaultLayerId: string; resolveColor: (color?: string) => string }): Domain[] => [
  ...domains,
  { id, code: form.code || 'CAP', name: form.name.trim(), description: form.description, color: resolveColor(form.color), layout: { columnId: form.columnId || defaultColumnId, layerId: form.layerId || defaultLayerId, columnSpan: Number(form.columnSpan) || 1 } },
];
export const updateDomain = ({ domains, domainId, form, defaultColumnId, defaultLayerId, resolveColor }: { domains: Domain[]; domainId: string; form: DomainForm; defaultColumnId: string; defaultLayerId: string; resolveColor: (color?: string) => string }): Domain[] => domains.map(domain => domain.id === domainId ? { ...domain, name: form.name.trim(), code: form.code?.trim() || domain.code, description: form.description, color: resolveColor(form.color), layout: { ...(domain.layout || {}), columnId: form.columnId || domain.layout?.columnId || defaultColumnId, layerId: form.layerId || domain.layout?.layerId || defaultLayerId, columnSpan: Number(form.columnSpan) || 1 } } : domain);
export const createCapability = ({ capabilities, form, id }: { capabilities: Capability[]; form: CapabilityForm; id: string }): Capability[] => [...capabilities, { id, domainId: form.domainId, code: form.code || 'CAP-01', name: form.name.trim(), description: form.description, priority: form.priority || 'unqualified' }];
export const updateCapability = ({ capabilities, capabilityId, form }: { capabilities: Capability[]; capabilityId: string; form: CapabilityForm }): Capability[] => capabilities.map(capability => capability.id === capabilityId ? { ...capability, name: form.name.trim(), description: form.description, priority: form.priority || 'unqualified' } : capability);
export const createApplication = ({ applications, form, id }: { applications: Application[]; form: ApplicationForm; id: string }): Application[] => [...applications, { id, name: form.name.trim(), code: form.code || 'APP', type: form.type, status: form.status, vendor: form.vendor, capabilityIds: form.capabilityIds, description: form.description }];
export const removeDomainAndDependents = ({ model, domainId, depth }: { model: CatalogModel; domainId: string; depth: number }) => {
  const dependentCapabilityIds = model.capabilities.filter(capability => capability.domainId === domainId).map(capability => capability.id);
  const removedRelationIds = new Set(depth === 1 ? [domainId] : dependentCapabilityIds);
  return { domains: model.domains.filter(domain => domain.id !== domainId), capabilities: model.capabilities.filter(capability => capability.domainId !== domainId), applications: model.applications.map(application => ({ ...application, capabilityIds: (application.capabilityIds || []).filter(id => !removedRelationIds.has(id)) })) };
};
