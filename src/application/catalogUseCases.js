/**
 * Pure application use cases for creating, editing and removing map catalogue entities.
 * Form validation, IDs and user feedback remain the responsibility of the UI adapter.
 */

export const createDomain = ({ domains, form, id, defaultColumnId, defaultLayerId, resolveColor }) => [
  ...domains,
  {
    id,
    code: form.code || 'CAP',
    name: form.name.trim(),
    description: form.description,
    color: resolveColor(form.color),
    layout: {
      columnId: form.columnId || defaultColumnId,
      layerId: form.layerId || defaultLayerId,
      columnSpan: Number(form.columnSpan) || 1,
    },
  },
];

export const updateDomain = ({ domains, domainId, form, defaultColumnId, defaultLayerId, resolveColor }) =>
  domains.map(domain => domain.id === domainId
    ? {
        ...domain,
        name: form.name.trim(),
        code: form.code.trim() || domain.code,
        description: form.description,
        color: resolveColor(form.color),
        layout: {
          ...(domain.layout || {}),
          columnId: form.columnId || domain.layout?.columnId || defaultColumnId,
          layerId: form.layerId || domain.layout?.layerId || defaultLayerId,
          columnSpan: Number(form.columnSpan) || 1,
        },
      }
    : domain);

export const createCapability = ({ capabilities, form, id }) => [
  ...capabilities,
  {
    id,
    domainId: form.domainId,
    code: form.code || 'CAP-01',
    name: form.name.trim(),
    description: form.description,
    priority: form.priority || 'unqualified',
  },
];

export const updateCapability = ({ capabilities, capabilityId, form }) =>
  capabilities.map(capability => capability.id === capabilityId
    ? {
        ...capability,
        name: form.name.trim(),
        description: form.description,
        priority: form.priority || 'unqualified',
      }
    : capability);

export const createApplication = ({ applications, form, id }) => [
  ...applications,
  {
    id,
    name: form.name.trim(),
    code: form.code || 'APP',
    type: form.type,
    status: form.status,
    vendor: form.vendor,
    capabilityIds: form.capabilityIds,
    description: form.description,
  },
];

export const removeDomainAndDependents = ({ model, domainId, depth }) => {
  const dependentCapabilityIds = model.capabilities
    .filter(capability => capability.domainId === domainId)
    .map(capability => capability.id);
  const removedRelationIds = new Set(depth === 1 ? [domainId] : dependentCapabilityIds);

  return {
    domains: model.domains.filter(domain => domain.id !== domainId),
    capabilities: model.capabilities.filter(capability => capability.domainId !== domainId),
    applications: (model.applications || []).map(application => ({
      ...application,
      capabilityIds: (application.capabilityIds || []).filter(id => !removedRelationIds.has(id)),
    })),
  };
};
