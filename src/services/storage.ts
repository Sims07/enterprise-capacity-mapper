import type { CatalogModel } from '../application/catalogUseCases.ts';

const KEY = 'enterprise-capacity-mapper:model:v3';
const LOCAL_MAPS_KEY = 'enterprise-capacity-mapper:local-maps:v1';
const RECENT_MAPS_KEY = 'enterprise-capacity-mapper:recent-maps:v1';
const LEGACY = ['ea_canvas_l0', 'ea_canvas_l1', 'ea_canvas_apps'];

type MapEntry = { id: string; name: string; model: CatalogModel; updatedAt?: string; openedAt?: string };
type ModelMetadata = Record<string, unknown> & { name?: string; updatedAt?: string };
type LegacyModel = CatalogModel & { schemaVersion: number; metadata?: ModelMetadata };
type StoredModel = CatalogModel & { schemaVersion: number; metadata?: ModelMetadata };

export function loadModel(fallback: CatalogModel): CatalogModel {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const model = JSON.parse(raw) as StoredModel;
      if (model?.schemaVersion === 3) return normalizeModel(model);
      if (model?.schemaVersion === 2) return migrateV2(model);
    }
    const legacy = legacyModel();
    if (legacy) {
      const migrated = migrateV2(legacy);
      localStorage.setItem(KEY, JSON.stringify(migrated));
      return migrated;
    }
    return normalizeModel(fallback);
  } catch {
    return fallback;
  }
}

function legacyModel(): LegacyModel | null {
  try {
    const domains = JSON.parse(localStorage.getItem(LEGACY[0]) || 'null');
    const capabilities = JSON.parse(localStorage.getItem(LEGACY[1]) || 'null');
    const apps = JSON.parse(localStorage.getItem(LEGACY[2]) || 'null');
    if (!domains || !capabilities || !apps) return null;
    return {
      schemaVersion: 2,
      metadata: { name: 'Cartographie migrée', updatedAt: new Date().toISOString() },
      domains,
      capabilities: capabilities.map((x: Record<string, unknown>) => ({ ...x, domainId: x.l0Id })),
      applications: apps.map((x: Record<string, unknown>) => ({ ...x, capabilityIds: x.l1Id ? [x.l1Id] : [] })),
    };
  } catch {
    return null;
  }
}

export function saveModel(model: CatalogModel): void {
  localStorage.setItem(KEY, JSON.stringify({
    ...normalizeModel(model),
    metadata: { ...(model.metadata || {}), updatedAt: new Date().toISOString() },
  }));
}

export function loadLocalMaps(): MapEntry[] { return loadMapCollection(LOCAL_MAPS_KEY, 'La bibliothèque locale de cartographies est invalide.'); }
export function saveLocalMap({ id, name, model }: { id?: string; name: string; model: CatalogModel }): MapEntry {
  const cleanName = name.trim(); if (!cleanName) throw new Error('Le nom de la cartographie est obligatoire.');
  const entries = loadLocalMaps(); const saved: MapEntry = { id: id || `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: cleanName, model: validateModel(model), updatedAt: new Date().toISOString() };
  const index = entries.findIndex(entry => entry.id === saved.id); if (index < 0) entries.push(saved); else entries[index] = saved;
  localStorage.setItem(LOCAL_MAPS_KEY, JSON.stringify(entries)); return saved;
}
export function loadRecentMaps(): MapEntry[] { return loadMapCollection(RECENT_MAPS_KEY, 'La liste des cartographies récentes est invalide.'); }
export function removeRecentMap(id: string): MapEntry[] { const next = loadRecentMaps().filter(entry => entry.id !== id); localStorage.setItem(RECENT_MAPS_KEY, JSON.stringify(next)); return next; }
export function recordRecentMap({ id, name, model }: { id: string; name: string; model: CatalogModel }): MapEntry {
  const entries = loadRecentMaps(); const metadata = model.metadata as ModelMetadata | undefined;
  const recent: MapEntry = { id, name: name.trim() || metadata?.name || 'Cartographie sans nom', model: validateModel(model), openedAt: new Date().toISOString() };
  const next = [recent, ...entries.filter(entry => entry.id !== id)].slice(0, 10); localStorage.setItem(RECENT_MAPS_KEY, JSON.stringify(next)); return recent;
}
export function updateRecentMap({ id, name, model }: { id: string; name: string; model: CatalogModel }): MapEntry {
  const entries = loadRecentMaps(); const index = entries.findIndex(entry => entry.id === id); if (index < 0) return recordRecentMap({ id, name, model });
  const metadata = model.metadata as ModelMetadata | undefined;
  const recent = { ...entries[index], name: name.trim() || metadata?.name || 'Cartographie sans nom', model: validateModel(model) }; entries[index] = recent;
  localStorage.setItem(RECENT_MAPS_KEY, JSON.stringify(entries)); return recent;
}
function loadMapCollection(key: string, errorMessage: string): MapEntry[] {
  const raw = localStorage.getItem(key); if (!raw) return []; const entries = JSON.parse(raw) as unknown;
  if (!Array.isArray(entries)) throw new Error(errorMessage);
  return entries.map(entry => { const candidate = entry as Partial<MapEntry>; if (!candidate || typeof candidate.id !== 'string' || typeof candidate.name !== 'string' || !candidate.name.trim() || !candidate.model) throw new Error(errorMessage); return { ...candidate, model: validateModel(candidate.model as CatalogModel) } as MapEntry; });
}
export function exportModel(model: CatalogModel): void { const blob = new Blob([JSON.stringify(model, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `enterprise-capacity-mapper-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url); }
export function validateModel(model: CatalogModel): CatalogModel {
  model = normalizeModel(model);
  const candidate = model as CatalogModel & { schemaVersion?: number };
  if (!candidate || candidate.schemaVersion !== 3 || !Array.isArray(model.domains) || !Array.isArray(model.capabilities) || !Array.isArray(model.applications)) throw new Error('Format de cartographie invalide ou version non supportée.');
  const domainIds = new Set(model.domains.map(x => x.id)); const capIds = new Set(model.capabilities.map(x => x.id));
  if (model.capabilities.some(x => !domainIds.has(x.domainId))) throw new Error('Une capacité référence un domaine inexistant.');
  const relationTargetIds = (model.layout as { depth?: number } | undefined)?.depth === 1 ? domainIds : capIds;
  if (model.applications.some(x => x.capabilityIds?.some(id => !relationTargetIds.has(id)))) throw new Error('Une application référence une capacité inexistante.');
  return model;
}
export async function importModel(file: File): Promise<CatalogModel> { return validateModel(JSON.parse(await file.text()) as CatalogModel); }
function migrateV2(model: LegacyModel): CatalogModel { return normalizeModel({ ...model, schemaVersion: 3 }); }
function normalizeModel(model: CatalogModel): CatalogModel {
  if (!model) return model;
  const layout = (model.layout as Record<string, unknown> | undefined) || { mode: 'matrix', columns: [{ id: 'customer', name: 'Client', order: 0 }, { id: 'product', name: 'Produit', order: 1 }, { id: 'operations', name: 'Opérations', order: 2 }, { id: 'support', name: 'Support', order: 3 }], layers: [{ id: 'strategic', name: 'Stratégique', order: 0 }, { id: 'core', name: 'Core / Value', order: 1 }, { id: 'support', name: 'Support', order: 2 }] };
  const columns = Array.isArray(layout.columns) && layout.columns.length ? layout.columns : [{ id: 'default', name: 'Général', order: 0 }]; const layers = Array.isArray(layout.layers) && layout.layers.length ? layout.layers : [{ id: 'default', name: 'Principal', order: 0 }];
  return { ...model, schemaVersion: 3, layout: { ...layout, mode: layout.mode || 'matrix', columns, layers }, domains: model.domains.map((domain, i) => ({ ...domain, layout: { ...(domain.layout || {}), columnId: domain.layout?.columnId || (columns[i % columns.length] as { id: string }).id, layerId: domain.layout?.layerId || (layers[0] as { id: string }).id } })) };
}
export async function loadRemoteModel(url: string): Promise<CatalogModel> { const response = await fetch(url, { cache: 'no-store' }); if (!response.ok) throw new Error(`Impossible de charger le JSON distant (${response.status}).`); return validateModel(await response.json() as CatalogModel); }
export function normalizeJsonUrl(input: string): string { const value = input.trim(); if (!value) return ''; if (value.includes('github.com') && value.includes('/blob/')) { const u = new URL(value); const parts = u.pathname.split('/').filter(Boolean); if (parts.length >= 5) return `https://raw.githubusercontent.com/${parts[0]}/${parts[1]}/${parts.slice(3).join('/')}`; } return value; }
