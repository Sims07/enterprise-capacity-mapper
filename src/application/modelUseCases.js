/**
 * Application use-cases for enterprise-capacity model mutations.
 * These functions are framework-agnostic and therefore form the inner hexagon.
 */
export const updateModel = (model, patch) => ({ ...model, ...patch });

export const updateCapabilityPriority = (model, capabilityId, priority) => ({
  ...model,
  capabilities: (model.capabilities || []).map(capability =>
    capability.id === capabilityId
      ? { ...capability, priority: priority || 'unqualified' }
      : capability
  ),
});

export const createEmptyMap = (model, { name, description, layout }) => ({
  ...model,
  metadata: { ...model.metadata, name, description },
  layout,
  domains: [],
  capabilities: [],
  applications: [],
});
