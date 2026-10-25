import { Catalog } from '../domain/catalog.ts';
import type { Application, Capability, CatalogModel, Domain } from '../domain/catalogModel.ts';
export type { Application, Capability, CatalogModel, Domain, Layout } from '../domain/catalogModel.ts';

export type DomainForm = { code?: string; name: string; description?: string; color?: string; columnId?: string; layerId?: string; columnSpan?: string | number };
export type CapabilityForm = { domainId: string; code?: string; name: string; description?: string; priority?: string };
export type ApplicationForm = { name: string; code?: string; type?: string; status?: string; vendor?: string; capabilityIds?: string[]; description?: string };

const catalogWith = (model: CatalogModel): Catalog => Catalog.fromModel(model);

export const createDomain = ({ domains, form, id, defaultColumnId, defaultLayerId, resolveColor }: {
  domains: Domain[]; form: DomainForm; id: string; defaultColumnId: string; defaultLayerId: string;
  resolveColor: (color?: string) => string;
}): Domain[] => catalogWith({ domains, capabilities: [], applications: [] })
  .createDomain({
    id, code: form.code || 'CAP', name: form.name, description: form.description,
    color: resolveColor(form.color),
    layout: { columnId: form.columnId || defaultColumnId, layerId: form.layerId || defaultLayerId, columnSpan: Number(form.columnSpan) || 1 },
  }).toModel().domains;

export const updateDomain = ({ domains, domainId, form, defaultColumnId, defaultLayerId, resolveColor }: {
  domains: Domain[]; domainId: string; form: DomainForm; defaultColumnId: string; defaultLayerId: string;
  resolveColor: (color?: string) => string;
}): Domain[] => {
  const current = domains.find(domain => domain.id === domainId);
  if (!current) return domains;
  const updated = catalogWith({ domains, capabilities: [], applications: [] }).updateDomain(domainId, {
    name: form.name,
    code: form.code?.trim() || current.code,
    description: form.description,
    color: resolveColor(form.color),
    layout: {
      ...(current.layout || {}),
      columnId: form.columnId || current.layout?.columnId || defaultColumnId,
      layerId: form.layerId || current.layout?.layerId || defaultLayerId,
      columnSpan: Number(form.columnSpan) || 1,
    },
  });
  return updated.toModel().domains;
};

export const createCapability = ({ capabilities, form, id, domains = [] }: {
  capabilities: Capability[]; form: CapabilityForm; id: string; domains?: Domain[];
}): Capability[] => catalogWith({ domains, capabilities, applications: [] }).createCapability({
  id, domainId: form.domainId, code: form.code || 'CAP-01', name: form.name,
  description: form.description, priority: form.priority || 'unqualified',
}).toModel().capabilities;

export const updateCapability = ({ capabilities, capabilityId, form, domains = [] }: {
  capabilities: Capability[]; capabilityId: string; form: CapabilityForm; domains?: Domain[];
}): Capability[] => {
  const current = capabilities.find(capability => capability.id === capabilityId);
  if (!current) return capabilities;
  return catalogWith({ domains, capabilities, applications: [] }).updateCapability(capabilityId, {
    name: form.name,
    description: form.description,
    priority: form.priority || 'unqualified',
  }).toModel().capabilities;
};

export const createApplication = ({ applications, form, id, domains = [], capabilities = [], layout }: {
  applications: Application[]; form: ApplicationForm; id: string; domains?: Domain[]; capabilities?: Capability[]; layout?: CatalogModel['layout'];
}): Application[] => catalogWith({ domains, capabilities, applications, ...(layout === undefined ? {} : { layout }) }).createApplication({
  id, name: form.name, code: form.code || 'APP', type: form.type, status: form.status,
  vendor: form.vendor, capabilityIds: form.capabilityIds, description: form.description,
}).toModel().applications;

export const updateApplication = ({ applications, applicationId, form, domains = [], capabilities = [], layout }: {
  applications: Application[]; applicationId: string; form: ApplicationForm; domains?: Domain[]; capabilities?: Capability[]; layout?: CatalogModel['layout'];
}): Application[] => {
  if (!applications.some(application => application.id === applicationId)) return applications;
  return catalogWith({ domains, capabilities, applications, ...(layout === undefined ? {} : { layout }) }).updateApplication(applicationId, {
    name: form.name, code: form.code, type: form.type, status: form.status, vendor: form.vendor,
    capabilityIds: form.capabilityIds, description: form.description,
  }).toModel().applications;
};

export const removeCapabilityAndDependents = ({ model, capabilityId }: { model: CatalogModel; capabilityId: string }): CatalogModel =>
  catalogWith(model).removeCapability(capabilityId).toModel();

export const removeDomainAndDependents = ({ model, domainId, depth }: { model: CatalogModel; domainId: string; depth: number }): CatalogModel =>
  catalogWith(model).removeDomain(domainId, depth).toModel();
