import type { CatalogModel, Application, Capability, Domain } from '../domain/catalogModel.ts';

export type LocalMapEntry = {
  id: string;
  name: string;
  model: CatalogModel;
  updatedAt?: string;
  openedAt?: string;
};

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
  importModel(source: { text(): Promise<string> }): Promise<CatalogModel>;
  exportModel(model: CatalogModel): void;
}


export type { Application, Capability, Domain };
