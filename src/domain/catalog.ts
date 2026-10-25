import type { Application, Capability, CatalogModel, Domain } from './catalogModel.ts';

const normalizedName = (name: string): string => name.trim();
const copyApplication = (application: Application): Application => ({
  ...application,
  ...(application.capabilityIds === undefined
    ? {}
    : { capabilityIds: [...application.capabilityIds] }),
});

/**
 * Rich aggregate for the cartography domain.
 *
 * CatalogModel is the persistence DTO. The aggregate owns domain invariants
 * and always returns new snapshots so callers cannot mutate its internal state.
 */
export class Catalog {
  private readonly model: CatalogModel;

  private constructor(model: CatalogModel) {
    this.model = model;
  }

  static fromModel(model: CatalogModel): Catalog {
    return new Catalog(Catalog.cloneModel(model));
  }

  toModel(): CatalogModel {
    return Catalog.cloneModel(this.model);
  }

  createDomain(domain: Domain): Catalog {
    const name = Catalog.requireName(domain.name, 'Le nom du domaine est obligatoire.');
    Catalog.requireUniqueId(this.model.domains, domain.id, 'domaine');
    return this.with({ domains: [...this.model.domains, { ...domain, name }] });
  }

  updateDomain(domainId: string, changes: Partial<Omit<Domain, 'id'>>): Catalog {
    const current = this.requireDomain(domainId);
    const name = changes.name === undefined ? current.name : Catalog.requireName(changes.name, 'Le nom du domaine est obligatoire.');
    return this.with({
      domains: this.model.domains.map(domain => domain.id === domainId
        ? { ...domain, ...changes, id: domain.id, name }
        : domain),
    });
  }

  renameDomain(domainId: string, name: string): Catalog {
    return this.updateDomain(domainId, { name });
  }

  createCapability(capability: Capability): Catalog {
    const name = Catalog.requireName(capability.name, 'Le nom de la capacité est obligatoire.');
    this.requireDomain(capability.domainId);
    Catalog.requireUniqueId(this.model.capabilities, capability.id, 'capacité');
    return this.with({ capabilities: [...this.model.capabilities, { ...capability, name }] });
  }

  updateCapability(capabilityId: string, changes: Partial<Omit<Capability, 'id'>>): Catalog {
    const current = this.requireCapability(capabilityId);
    const domainId = changes.domainId || current.domainId;
    this.requireDomain(domainId);
    const name = changes.name === undefined
      ? current.name
      : Catalog.requireName(changes.name, 'Le nom de la capacité est obligatoire.');
    return this.with({
      capabilities: this.model.capabilities.map(capability => capability.id === capabilityId
        ? { ...capability, ...changes, id: capability.id, domainId, name }
        : capability),
    });
  }

  createEmptyMap(name: string, description: string | undefined, layout: unknown): Catalog {
    return this.with({
      metadata: { ...(this.model.metadata ?? {}), name, description },
      layout,
      domains: [],
      capabilities: [],
      applications: [],
    });
  }

  updateCapabilityPriority(capabilityId: string, priority?: string): Catalog {
    return this.updateCapability(capabilityId, { priority: priority || 'unqualified' });
  }

  removeCapability(capabilityId: string): Catalog {
    if (!this.model.capabilities.some(capability => capability.id === capabilityId)) return this;
    return this.with({
      capabilities: this.model.capabilities.filter(capability => capability.id !== capabilityId),
      applications: this.model.applications.map(application => ({
        ...copyApplication(application),
        ...(application.capabilityIds === undefined ? {} : {
          capabilityIds: application.capabilityIds.filter(id => id !== capabilityId),
        }),
      })),
    });
  }

  createApplication(application: Application): Catalog {
    const name = Catalog.requireName(application.name, 'Le nom de l’application est obligatoire.');
    Catalog.requireUniqueId(this.model.applications, application.id, 'application');
    const capabilityIds = Catalog.unique(application.capabilityIds ?? []);
    capabilityIds.forEach(id => this.requireMappedTarget(id));
    return this.with({
      applications: [...this.model.applications, {
        ...application,
        name,
        ...(application.capabilityIds === undefined ? {} : { capabilityIds }),
      }],
    });
  }

  updateApplication(applicationId: string, changes: Partial<Omit<Application, 'id'>>): Catalog {
    const current = this.requireApplication(applicationId);
    const name = changes.name === undefined
      ? current.name
      : Catalog.requireName(changes.name, 'Le nom de l’application est obligatoire.');
    const { capabilityIds: requestedCapabilityIds, ...otherChanges } = changes;
    const capabilityIds = requestedCapabilityIds === undefined
      ? current.capabilityIds
      : Catalog.unique(requestedCapabilityIds);
    capabilityIds?.forEach(id => this.requireMappedTarget(id));
    return this.with({
      applications: this.model.applications.map(application => application.id === applicationId
        ? {
          ...application,
          ...otherChanges,
          id: application.id,
          name,
          ...(capabilityIds === undefined ? {} : { capabilityIds: [...capabilityIds] }),
        }
        : copyApplication(application)),
    });
  }

  linkApplicationToCapability(applicationId: string, capabilityId: string): Catalog {
    this.requireCapability(capabilityId);
    return this.linkApplicationToMappedItem(applicationId, capabilityId);
  }

  unlinkApplicationFromCapability(applicationId: string, capabilityId: string): Catalog {
    return this.unlinkApplicationFromMappedItem(applicationId, capabilityId);
  }

  linkApplicationToMappedItem(applicationId: string, targetId: string): Catalog {
    const application = this.requireApplication(applicationId);
    this.requireMappedTarget(targetId);
    const capabilityIds = application.capabilityIds ?? [];
    if (capabilityIds.includes(targetId)) return this;
    return this.with({
      applications: this.model.applications.map(candidate => candidate.id === applicationId
        ? { ...copyApplication(candidate), capabilityIds: [...capabilityIds, targetId] }
        : copyApplication(candidate)),
    });
  }

  unlinkApplicationFromMappedItem(applicationId: string, targetId: string): Catalog {
    const application = this.requireApplication(applicationId);
    const capabilityIds = application.capabilityIds ?? [];
    if (!capabilityIds.includes(targetId)) return this;
    return this.with({
      applications: this.model.applications.map(candidate => candidate.id === applicationId
        ? { ...copyApplication(candidate), capabilityIds: capabilityIds.filter(id => id !== targetId) }
        : copyApplication(candidate)),
    });
  }

  replaceMappedRelations(applicationId: string, mappedItemIds: string[], selectedItemIds: string[]): Catalog {
    const application = this.requireApplication(applicationId);
    const allowed = new Set(mappedItemIds);
    const selected = Catalog.unique(selectedItemIds);
    selected.forEach(id => { this.requireMappedTarget(id); if (!allowed.has(id)) throw new Error(`Cible de cartographie inconnue : ${id}.`); });
    const current = application.capabilityIds ?? [];
    const next = [...current.filter(id => !allowed.has(id)), ...selected];
    if (next.length === current.length && next.every((id, index) => id === current[index])) return this;
    return this.with({ applications: this.model.applications.map(candidate => candidate.id === applicationId
      ? { ...copyApplication(candidate), capabilityIds: next }
      : copyApplication(candidate)) });
  }

  removeDomain(domainId: string, depth = 2): Catalog {
    if (!this.model.domains.some(domain => domain.id === domainId)) return this;
    const capabilityIds = new Set(this.model.capabilities
      .filter(capability => capability.domainId === domainId)
      .map(capability => capability.id));
    // Keep the established depth-1 behaviour; at depth 2 all N1 links are cleaned.
    const removedRelationIds = new Set(depth === 1 ? [domainId] : [domainId, ...capabilityIds]);
    return this.with({
      domains: this.model.domains.filter(domain => domain.id !== domainId),
      capabilities: this.model.capabilities.filter(capability => capability.domainId !== domainId),
      applications: this.model.applications.map(application => ({
        ...copyApplication(application),
        capabilityIds: (application.capabilityIds ?? []).filter(id => !removedRelationIds.has(id)),
      })),
    });
  }

  private with(changes: Partial<CatalogModel>): Catalog {
    return new Catalog(Catalog.cloneModel({ ...this.model, ...changes }));
  }

  private requireDomain(domainId: string): Domain {
    const domain = this.model.domains.find(candidate => candidate.id === domainId);
    if (!domain) throw new Error(`Domaine introuvable : ${domainId}.`);
    return domain;
  }

  private requireCapability(capabilityId: string): Capability {
    const capability = this.model.capabilities.find(candidate => candidate.id === capabilityId);
    if (!capability) throw new Error(`Capacité introuvable : ${capabilityId}.`);
    return capability;
  }

  private requireMappedTarget(targetId: string): Domain | Capability {
    const depth = (this.model.layout as { depth?: number } | undefined)?.depth;
    return depth === 1 ? this.requireDomain(targetId) : this.requireCapability(targetId);
  }

  private requireApplication(applicationId: string): Application {
    const application = this.model.applications.find(candidate => candidate.id === applicationId);
    if (!application) throw new Error(`Application introuvable : ${applicationId}.`);
    return application;
  }

  private static requireName(name: string, message: string): string {
    const normalized = normalizedName(name);
    if (!normalized) throw new Error(message);
    return normalized;
  }

  private static requireUniqueId(items: { id: string }[], id: string, kind: string): void {
    if (!id.trim()) throw new Error(`L’identifiant du/de la ${kind} est obligatoire.`);
    if (items.some(item => item.id === id)) throw new Error(`Le/la ${kind} ${id} existe déjà.`);
  }

  private static unique(values: string[]): string[] {
    return [...new Set(values)];
  }

  private static cloneModel(model: CatalogModel): CatalogModel {
    return {
      ...model,
      domains: model.domains.map(domain => domain.layout === undefined
        ? { ...domain }
        : { ...domain, layout: { ...domain.layout } }),
      capabilities: model.capabilities.map(capability => ({ ...capability })),
      applications: model.applications.map(copyApplication),
    };
  }
}
