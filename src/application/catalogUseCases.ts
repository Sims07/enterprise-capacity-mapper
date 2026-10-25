import { Catalog } from '../domain/catalog.ts';
import type { Application, Capability, CatalogModel, Domain } from '../domain/catalogModel.ts';
export type { Application, Capability, CatalogModel, Domain, Layout } from '../domain/catalogModel.ts';
export type DomainForm = { code?: string; name: string; description?: string; color?: string; columnId?: string; layerId?: string; columnSpan?: string | number };
export type CapabilityForm = { domainId: string; code?: string; name: string; description?: string; priority?: string };
export type ApplicationForm = { name: string; code?: string; type?: string; status?: string; vendor?: string; capabilityIds?: string[]; description?: string };

const toCatalog = (domains: Domain[], capabilities: Capability[], applications: Application[]): Catalog =>
  Catalog.fromModel({ domains, capabilities, applications });

const catalogModel = (catalog: Catalog) => catalog.toModel();

export const createDomain = ({ domains, form, id, defaultColumnId, defaultLayerId, resolveColor }: { domains: Domain[]; form: DomainForm; id: string; defaultColumnId: string; defaultLayerId: string; resolveColor: (color?: string) => string }): Domain[] => {
  const model = catalogModel(toCatalog(domains, [], []).createDomain({
    id,
    code: form.code || 'CAP',
    name: form.name,
    description: form.description,
    color: resolveColor(form.color),
    layout: { columnId: form.columnId || defaultColumnId, layerId: form.layerId || defaultLayerId, columnSpan: Number(form.columnSpan) || 1 },
  }));
  return model.domains;
};

export const updateDomain = ({ domains, domainId, form, defaultColumnId, defaultLayerId, resolveColor }: { domains: Domain[]; domainId: string; form: DomainForm; defaultColumnId: string; defaultLayerId: string; resolveColor: (color?: string) => string }): Domain[] => {
  const catalog = toCatalog(domains, [], []);
  const current = domains.find(domain => domain.id === domainId);
  if (!current) return domains;
  const updated = {
    ...current,
    name: form.name,
    code: form.code?.trim() || current.code,
    description: form.description,
    color: resolveColor(form.color),
    layout: { ...(current.layout || {}), columnId: form.columnId || current.layout?.columnId || defaultColumnId, layerId: form.layerId || current.layout?.layerId || defaultLayerId, columnSpan: Number(form.columnSpan) || 1 },
  };
  return catalog.renameDomain(domainId, updated.name).toModel().domains.map(domain => domain.id === domainId ? { ...domain, ...updated, name: updated.name.trim() } : domain);
};

export const createCapability = ({ capabilities, form, id }: { capabilities: Capability[]; form: CapabilityForm; id: string }): Capability[] => {
  const model = catalogModel(toCatalog([{ id: form.domainId, code: '', name: '' }], capabilities, []).createCapability({
    id, domainId: form.domainId, code: form.code || 'CAP-01', name: form.name, description: form.description, priority: form.priority || 'unqualified',
  }));
  return model.capabilities;
};

export const updateCapability = ({ capabilities, capabilityId, form }: { capabilities: Capability[]; capabilityId: string; form: CapabilityForm }): Capability[] => capabilities.map(capability => capability.id === capabilityId ? { ...capability, name: form.name.trim(), description: form.description, priority: form.priority || 'unqualified' } : capability);

export const createApplication = ({ applications, form, id }: { applications: Application[]; form: ApplicationForm; id: string }): Application[] => [...applications, { id, name: form.name.trim(), code: form.code || 'APP', type: form.type, status: form.status, vendor: form.vendor, capabilityIds: form.capabilityIds, description: form.description }];

export const removeDomainAndDependents = ({ model, domainId }: { model: CatalogModel; domainId: string; depth: number }) => Catalog.fromModel(model).removeDomain(domainId).toModel();
