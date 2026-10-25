import { Catalog } from '../domain/catalog.ts';
import type { Application, Capability, Domain } from '../domain/catalogModel.ts';

export type RelatedApplication = Application;
export type MappedItem = { id: string; [key: string]: unknown };
export type Link = { kind: 'target' | 'application'; id: string };

const withCatalog = (applications: RelatedApplication[], domains: Domain[], capabilities: Capability[]) =>
  Catalog.fromModel({ domains, capabilities, applications });

export const assignApplicationToCapability = (
  applications: RelatedApplication[], appId: string, capabilityId: string,
  domains: Domain[] = [], capabilities: Capability[] = [],
): RelatedApplication[] => withCatalog(applications, domains, capabilities)
  .linkApplicationToCapability(appId, capabilityId).toModel().applications;

export const unassignApplicationFromCapability = (
  applications: RelatedApplication[], appId: string, capabilityId: string,
  domains: Domain[] = [], capabilities: Capability[] = [],
): RelatedApplication[] => withCatalog(applications, domains, capabilities)
  .unlinkApplicationFromCapability(appId, capabilityId).toModel().applications;

export const linkPickedApplications = (
  applications: RelatedApplication[], selectedApplicationIds: string[], targetId: string,
  domains: Domain[] = [], capabilities: Capability[] = [],
): RelatedApplication[] => {
  if (!selectedApplicationIds.length) return applications;
  let catalog = withCatalog(applications, domains, capabilities);
  for (const applicationId of new Set(selectedApplicationIds)) {
    catalog = catalog.linkApplicationToMappedItem(applicationId, targetId);
  }
  return catalog.toModel().applications;
};

export const prepareLinkedApplications = ({
  applications, mappedItems, link, checkedIds, domains = [], capabilities = [],
}: {
  applications: RelatedApplication[];
  mappedItems: MappedItem[];
  link: Link | null;
  checkedIds: string[];
  domains?: Domain[];
  capabilities?: Capability[];
}): RelatedApplication[] => {
  if (!link) return applications;
  const managedIds = mappedItems.map(item => item.id);
  let catalog = withCatalog(applications, domains, capabilities);
  if (link.kind === 'target') {
    for (const application of applications) {
      const shouldBeLinked = checkedIds.includes(application.id);
      const currentlyLinked = (application.capabilityIds ?? []).includes(link.id);
      if (shouldBeLinked === currentlyLinked) continue;
      catalog = shouldBeLinked
        ? catalog.linkApplicationToMappedItem(application.id, link.id)
        : catalog.synchronizeApplicationLinks(application.id, [link.id], []);
    }
  } else {
    catalog = catalog.synchronizeApplicationLinks(link.id, managedIds, checkedIds);
  }
  return catalog.toModel().applications;
};
