import type { Application, Capability, CatalogModel, Domain } from './catalogModel.ts';

const normalizeName = (name: string): string => name.trim();
const copyApplication = (application: Application): Application => ({ ...application, capabilityIds: application.capabilityIds ? [...application.capabilityIds] : application.capabilityIds });

export class Catalog {
  private readonly model: CatalogModel;

  private constructor(model: CatalogModel) {
    this.model = model;
  }

  static fromModel(model: CatalogModel): Catalog { return new Catalog(Catalog.cloneModel(model)); }
  toModel(): CatalogModel { return Catalog.cloneModel(this.model); }

  createDomain(domain: Domain): Catalog {
    const name = normalizeName(domain.name);
    if (!name) throw new Error('Le nom du domaine est obligatoire.');
    if (this.model.domains.some(candidate => candidate.id === domain.id)) throw new Error(`Le domaine ${domain.id} existe déjà.`);
    return new Catalog({ ...this.model, domains: [...this.model.domains, { ...domain, name }] });
  }

  renameDomain(domainId: string, name: string): Catalog {
    const normalizedName = normalizeName(name);
    if (!normalizedName) throw new Error('Le nom du domaine est obligatoire.');
    if (!this.model.domains.some(domain => domain.id === domainId)) throw new Error(`Domaine introuvable : ${domainId}.`);
    return new Catalog({ ...this.model, domains: this.model.domains.map(domain => domain.id === domainId ? { ...domain, name: normalizedName } : domain) });
  }

  createCapability(capability: Capability): Catalog {
    const name = normalizeName(capability.name);
    if (!name) throw new Error('Le nom de la capacité est obligatoire.');
    if (!this.model.domains.some(domain => domain.id === capability.domainId)) throw new Error(`Domaine introuvable : ${capability.domainId}.`);
    if (this.model.capabilities.some(candidate => candidate.id === capability.id)) throw new Error(`La capacité ${capability.id} existe déjà.`);
    return new Catalog({ ...this.model, capabilities: [...this.model.capabilities, { ...capability, name }] });
  }

  linkApplicationToCapability(applicationId: string, capabilityId: string): Catalog {
    if (!this.model.applications.some(application => application.id === applicationId)) throw new Error(`Application introuvable : ${applicationId}.`);
    if (!this.model.capabilities.some(capability => capability.id === capabilityId)) throw new Error(`Capacité introuvable : ${capabilityId}.`);
    return new Catalog({ ...this.model, applications: this.model.applications.map(application => {
      if (application.id !== applicationId) return copyApplication(application);
      const capabilityIds = application.capabilityIds ?? [];
      return capabilityIds.includes(capabilityId) ? copyApplication(application) : { ...copyApplication(application), capabilityIds: [...capabilityIds, capabilityId] };
    }) });
  }

  unlinkApplicationFromCapability(applicationId: string, capabilityId: string): Catalog {
    return new Catalog({ ...this.model, applications: this.model.applications.map(application => application.id !== applicationId
      ? copyApplication(application)
      : { ...copyApplication(application), capabilityIds: (application.capabilityIds ?? []).filter(id => id !== capabilityId) }) });
  }

  removeDomain(domainId: string, depth = 2): Catalog {
    if (!this.model.domains.some(domain => domain.id === domainId)) return this;
    const capabilityIds = new Set(this.model.capabilities.filter(capability => capability.domainId === domainId).map(capability => capability.id));
    const removedRelationIds = new Set(depth === 1 ? [domainId] : capabilityIds);
    return new Catalog({
      ...this.model,
      domains: this.model.domains.filter(domain => domain.id !== domainId),
      capabilities: this.model.capabilities.filter(capability => capability.domainId !== domainId),
      applications: this.model.applications.map(application => ({ ...copyApplication(application), capabilityIds: (application.capabilityIds ?? []).filter(id => !removedRelationIds.has(id)) })),
    });
  }

  private static cloneModel(model: CatalogModel): CatalogModel {
    return {
      ...model,
      domains: model.domains.map(domain => domain.layout === undefined ? { ...domain } : { ...domain, layout: { ...domain.layout } }),
      capabilities: model.capabilities.map(capability => ({ ...capability })),
      applications: model.applications.map(copyApplication),
    };
  }
}
