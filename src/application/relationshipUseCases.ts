import { Catalog } from '../domain/catalog.ts';
import type { Application, Capability, CatalogModel, Domain } from '../domain/catalogModel.ts';

export type RelatedApplication = { id: string; capabilityIds?: string[]; [key: string]: unknown };
export type MappedItem = { id: string; [key: string]: unknown };
export type Link = { kind: 'target' | 'app' | 'application'; id: string };
type TargetDepth = 1 | 2;

const catalogFor = (
  applications: RelatedApplication[],
  domains: Domain[],
  capabilities: Capability[],
  depth: TargetDepth,
): Catalog => Catalog.fromModel({
  domains,
  capabilities,
  applications: applications as unknown as Application[],
  layout: { depth },
} as CatalogModel);

const applicationSnapshots = (catalog: Catalog): RelatedApplication[] =>
  catalog.toModel().applications as RelatedApplication[];

export const assignApplicationToCapability = (
  applications: RelatedApplication[],
  appId: string,
  targetId: string,
  domains: Domain[] = [],
  capabilities: Capability[] = [],
  depth: TargetDepth = 2,
): RelatedApplication[] => applicationSnapshots(
  catalogFor(applications, domains, capabilities, depth).linkApplicationToMappedItem(appId, targetId),
);

export const unassignApplicationFromCapability = (
  applications: RelatedApplication[],
  appId: string,
  targetId: string,
  domains: Domain[] = [],
  capabilities: Capability[] = [],
  depth: TargetDepth = 2,
): RelatedApplication[] => applicationSnapshots(
  catalogFor(applications, domains, capabilities, depth).unlinkApplicationFromMappedItem(appId, targetId),
);

export const linkPickedApplications = (
  applications: RelatedApplication[],
  selectedApplicationIds: string[],
  targetId: string,
  domains: Domain[] = [],
  capabilities: Capability[] = [],
  depth: TargetDepth = 2,
): RelatedApplication[] => {
  if (!selectedApplicationIds.length) return applications;
  let catalog = catalogFor(applications, domains, capabilities, depth);
  selectedApplicationIds.forEach(id => {
    catalog = catalog.linkApplicationToMappedItem(id, targetId);
  });
  return applicationSnapshots(catalog);
};

export const prepareLinkedApplications = ({
  applications, mappedItems, link, checkedIds, domains = [], capabilities = [], depth = 2,
}: {
  applications: RelatedApplication[];
  mappedItems: MappedItem[];
  link: Link | null;
  checkedIds: string[];
  domains?: Domain[];
  capabilities?: Capability[];
  depth?: TargetDepth;
}): RelatedApplication[] => {
  if (!link) return applications;
  const catalog = catalogFor(applications, domains, capabilities, depth);
  const mappedIds = mappedItems.map(item => item.id);

  if (link.kind === 'target') {
    const checked = new Set(checkedIds);
    let next = catalog;
    applications.forEach(application => {
      next = checked.has(application.id)
        ? next.linkApplicationToMappedItem(application.id, link.id)
        : next.unlinkApplicationFromMappedItem(application.id, link.id);
    });
    return applicationSnapshots(next);
  }

  return applicationSnapshots(catalog.replaceMappedRelations(link.id, mappedIds, checkedIds));
};
