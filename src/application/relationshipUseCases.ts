export type RelatedApplication = { id: string; capabilityIds?: string[]; [key: string]: unknown };
export type MappedItem = { id: string; [key: string]: unknown };
export type Link = { kind: 'target' | 'application'; id: string };

const relationIds = (application: RelatedApplication): string[] => application.capabilityIds || [];

export const assignApplicationToCapability = (applications: RelatedApplication[], appId: string, capabilityId: string): RelatedApplication[] =>
  applications.map(application => application.id === appId
    ? { ...application, capabilityIds: Array.from(new Set([...relationIds(application), capabilityId])) }
    : application);

export const unassignApplicationFromCapability = (applications: RelatedApplication[], appId: string, capabilityId: string): RelatedApplication[] =>
  applications.map(application => application.id === appId
    ? { ...application, capabilityIds: relationIds(application).filter(id => id !== capabilityId) }
    : application);

export const linkPickedApplications = (applications: RelatedApplication[], selectedApplicationIds: string[], targetId: string): RelatedApplication[] => {
  const selected = new Set(selectedApplicationIds);
  if (!selected.size) return applications;
  return applications.map(application => selected.has(application.id)
    ? { ...application, capabilityIds: Array.from(new Set([...relationIds(application), targetId])) }
    : application);
};

export const prepareLinkedApplications = ({ applications, mappedItems, link, checkedIds }: { applications: RelatedApplication[]; mappedItems: MappedItem[]; link: Link | null; checkedIds: string[] }): RelatedApplication[] => {
  if (!link) return applications;
  const checked = new Set(checkedIds);
  const mappedIds = new Set(mappedItems.map(item => item.id));

  return applications.map(application => {
    const current = relationIds(application);
    if (link.kind === 'target') {
      const hasRelation = current.includes(link.id);
      if (checked.has(application.id) === hasRelation) return application;
      return {
        ...application,
        capabilityIds: checked.has(application.id) ? [...current, link.id] : current.filter(id => id !== link.id),
      };
    }

    if (application.id !== link.id) return application;
    const kept = current.filter(id => !mappedIds.has(id));
    const next = [...kept, ...mappedItems.filter(item => checked.has(item.id)).map(item => item.id)];
    return next.length === current.length && next.every(id => current.includes(id)) ? application : { ...application, capabilityIds: next };
  });
};
