export type Model = {
  metadata?: Record<string, unknown>;
  layout?: unknown;
  domains: unknown[];
  capabilities: unknown[];
  applications: unknown[];
  [key: string]: unknown;
};

export type MapCreationOptions = { name: string; description?: string; layout: unknown };

export const updateModel = <T extends Model>(model: T, patch: Partial<T>): T => ({ ...model, ...patch });

export const updateCapabilityPriority = <T extends Model>(model: T, capabilityId: string, priority?: string): T => ({
  ...model,
  capabilities: model.capabilities.map(capability => {
    const candidate = capability as { id?: string; priority?: string };
    return candidate.id === capabilityId ? { ...candidate, priority: priority || 'unqualified' } : capability;
  }),
});

export const createEmptyMap = <T extends Model>(model: T, { name, description, layout }: MapCreationOptions): T => ({
  ...model,
  metadata: { ...(model.metadata || {}), name, description },
  layout,
  domains: [],
  capabilities: [],
  applications: [],
});
