/**
 * Pure application rules for the many-to-many relationship between applications
 * and capability-map targets. UI state and notifications remain in React.
 */
const relationIds = application => application.capabilityIds || [];

export const assignApplicationToCapability = (applications, appId, capabilityId) =>
  applications.map(application => application.id === appId
    ? { ...application, capabilityIds: Array.from(new Set([...relationIds(application), capabilityId])) }
    : application);

export const unassignApplicationFromCapability = (applications, appId, capabilityId) =>
  applications.map(application => application.id === appId
    ? { ...application, capabilityIds: relationIds(application).filter(id => id !== capabilityId) }
    : application);

export const linkPickedApplications = (applications, selectedApplicationIds, targetId) => {
  const selected = new Set(selectedApplicationIds);
  if (!selected.size) return applications;
  return applications.map(application => selected.has(application.id)
    ? { ...application, capabilityIds: Array.from(new Set([...relationIds(application), targetId])) }
    : application);
};

export const prepareLinkedApplications = ({ applications, mappedItems, link, checkedIds }) => {
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
        capabilityIds: checked.has(application.id)
          ? [...current, link.id]
          : current.filter(id => id !== link.id),
      };
    }

    if (application.id !== link.id) return application;
    const kept = current.filter(id => !mappedIds.has(id));
    const next = [...kept, ...mappedItems.filter(item => checked.has(item.id)).map(item => item.id)];
    return next.length === current.length && next.every(id => current.includes(id))
      ? application
      : { ...application, capabilityIds: next };
  });
};
