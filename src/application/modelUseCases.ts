import { Catalog } from '../domain/catalog.ts';
import type { CatalogModel } from '../domain/catalogModel.ts';

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

export const updateCapabilityPriority = <T extends Model>(model: T, capabilityId: string, priority?: string): T => {
  const catalog = Catalog.fromModel(model as unknown as CatalogModel).updateCapabilityPriority(capabilityId, priority);
  return catalog.toModel() as T;
};

export const createEmptyMap = <T extends Model>(model: T, { name, description, layout }: MapCreationOptions): T =>
  Catalog.fromModel(model as unknown as CatalogModel).createEmptyMap(name, description, layout).toModel() as T;
