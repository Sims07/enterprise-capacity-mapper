import { Catalog } from '../domain/catalog.ts';
import type { Application, Capability, CatalogModel, Domain } from '../domain/catalogModel.ts';
export type { Application, Capability, CatalogModel, Domain, Layout } from '../domain/catalogModel.ts';
export type DomainForm = { code?: string; name: string; description?: string; color?: string; columnId?: string; layerId?: string; columnSpan?: string | number };
export type CapabilityForm = { domainId: string; code?: string; name: string; description?: string; priority?: string };
export type ApplicationForm = { name: string; code?: string; type?: string; status?: string; vendor?: string; capabilityIds?: string[]; description?: string };

const toCatalog = (domains: Domain[], capabilities: Capability[], applications: Application[]): Catalog => Catalog.fromModel({ domains, capabilities, applications });

export const createDomain = ({ domains, form, id, defaultColumnId, defaultLayerId, resolveColor }: { domains: Domain[]; form: DomainForm; id: string; defaultColumnId: string; defaultLayerId: string; resolveColor: (color?: string) => string }): Domain[] =>
  toCatalog(domains, [], []).createDomain({ id, code: form.code || 'CAP', name: form.name, description: form.description, color: resolveColor(form.color), layout: { columnId: form.columnId || defaultColumnId, layerId: form.layerId || defaultLayerId, columnSpan: Number(form.columnSpan) || 1 } }).toModel().domains;

export const updateDomain = ({ domains, domainId, form, defaultColumnId, defaultLayerId, resolveColor }: { domains: Domain[]; domainId: string; form: DomainForm; defaultColumnId: string; defaultLayerId: string; resolveColor: (color?: string) => string }): Domain[] => {
  const current = domains.find(domain => domain.id === domainId);
  if (!current) return domains;
  const renamed = toCatalog(domains, [], []).renameDomain(domainId, form.name).toModel().domains;
  return renamed.map(domain => domain.id === domainId ? {
    ...domain,
    code: form.code?.trim() || current.code,
    description: form.description,
    color: resolveColor(form.color),
    layout: { ...(current.layout || {}), columnId: form.columnId || current.layout?.columnId || defaultColumnId, layerId: form.layerId || current.layout?.layerId || defaultLayerId, columnSpan: Number(form.columnSpan) || 1 },
  } : domain);
};

export const createCapability = ({ capabilities, form, id }: { capabilities: Capability[]; form: CapabilityForm; id: string }): Capability[] =>
  [...capabilities, { id, domainId: form.domainId, code: form.code || 'CAP-01', name: form.name.trim(), description: form.description, priority: form.priority || 'unqualified' }];

export const updateCapability = ({ capabilities, capabilityId, form }: { capabilities: Capability[]; capabilityId: string; form: CapabilityForm }): Capability[] => capabilities.map(capability => capability.id === capabilityId ? { ...capability, name: form.name.trim(), description: form.description, priority: form.priority || 'unqualified' } : capability);

export const createApplication = ({ applications, form, id }: { applications: Application[]; form: ApplicationForm; id: string }): Application[] => [...applications, { id, name: form.name.trim(), code: form.code || 'APP', type: form.type, status: form.status, vendor: form.vendor, capabilityIds: form.capabilityIds, description: form.description }];

export const removeDomainAndDependents = ({ model, domainId, depth }: { model: CatalogModel; domainId: string; depth: number }): CatalogModel => Catalog.fromModel(model).removeDomain(domainId, depth).toModel();
