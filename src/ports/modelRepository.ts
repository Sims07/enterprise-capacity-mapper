import type { CatalogModel, Application, Capability, Domain } from '../application/catalogUseCases.ts';

export interface LocalMapEntry {
  id: string;
  name: string;
  model: CatalogModel;
  updatedAt?: string;
  openedAt?: string;
}

/**
 * Outbound persistence port for cartography models.
 * Infrastructure adapters must implement this contract without leaking storage details.
 */
export interface ModelRepository {
  load(fallback: CatalogModel): CatalogModel;
  save(model: CatalogModel): void;
  loadLocalMaps(): LocalMapEntry[];
  saveLocalMap(input: { id?: string; name: string; model: CatalogModel }): LocalMapEntry;
  loadRecentMaps(): LocalMapEntry[];
  recordRecentMap(input: { id: string; name: string; model: CatalogModel }): LocalMapEntry;
  updateRecentMap(input: { id: string; name: string; model: CatalogModel }): LocalMapEntry;
  removeRecentMap(id: string): LocalMapEntry[];
  importModel(file: File): Promise<CatalogModel>;
  exportModel(model: CatalogModel): void;
}

export const MODEL_REPOSITORY = Object.freeze({
  load: 'load',
  save: 'save',
  loadLocalMaps: 'loadLocalMaps',
  saveLocalMap: 'saveLocalMap',
  loadRecentMaps: 'loadRecentMaps',
  recordRecentMap: 'recordRecentMap',
  updateRecentMap: 'updateRecentMap',
  removeRecentMap: 'removeRecentMap',
  importModel: 'importModel',
  exportModel: 'exportModel',
});

export type { Application, Capability, Domain };
