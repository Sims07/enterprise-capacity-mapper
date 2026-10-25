/** Domain rules for the TOGAF capability-map matrix layout. */

export type LayoutAxis = { id: string; name: string; order?: number; [key: string]: unknown };
export type LayoutZone = { id: string; columnId: string; layerId: string; name: string; [key: string]: unknown };
export type LayoutDraft = { columns: LayoutAxis[]; layers: LayoutAxis[]; zones: LayoutZone[]; [key: string]: unknown };
export type MapLayoutData = { mode?: string; columns?: LayoutAxis[]; layers?: LayoutAxis[]; zones?: LayoutZone[]; [key: string]: unknown };
export type DomainPlacement = {
  id: string;
  layout?: { columnId?: string; layerId?: string; columnSpan?: string | number; [key: string]: unknown };
  [key: string]: unknown;
};
export type PreparedLayout = { layout: MapLayoutData; domains: DomainPlacement[] };

const completeZones = (columns: LayoutAxis[], layers: LayoutAxis[], currentZones: LayoutZone[]): LayoutZone[] =>
  columns.flatMap(column => layers.map(layer =>
    currentZones.find(zone => zone.columnId === column.id && zone.layerId === layer.id) ||
    { id: `${column.id}:${layer.id}`, columnId: column.id, layerId: layer.id, name: column.name }
  ));

const cloneValue = <T>(value: T): T => {
  if (Array.isArray(value)) return value.map(item => cloneValue(item)) as T;
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)])) as T;
  }
  return value;
};

const cloneDraft = (draft: LayoutDraft): LayoutDraft => cloneValue(draft);

/** Immutable domain object: every transition returns a new layout value. */
export class MapLayout {
  private readonly draft: LayoutDraft;

  private constructor(draft: LayoutDraft) {
    this.draft = cloneDraft(draft);
  }

  static fromDraft(draft: LayoutDraft): MapLayout {
    return new MapLayout(draft);
  }

  toDraft(): LayoutDraft {
    return cloneDraft(this.draft);
  }

  static completeZones(columns: LayoutAxis[], layers: LayoutAxis[], zones: LayoutZone[]): LayoutZone[] {
    return completeZones(columns, layers, zones).map(zone => ({ ...zone }));
  }

  renameItem(kind: 'columns' | 'layers', id: string, name: string): MapLayout {
    const previous = this.draft[kind].find(item => item.id === id);
    const items = this.draft[kind].map(item => item.id === id ? { ...item, name } : { ...item });
    const columns = kind === 'columns' ? items : this.draft.columns;
    const layers = kind === 'layers' ? items : this.draft.layers;
    const zones = kind === 'columns' && previous
      ? this.draft.zones.map(zone => zone.columnId === id && zone.name === previous.name ? { ...zone, name } : { ...zone })
      : this.draft.zones;
    return new MapLayout({ ...this.draft, [kind]: items, zones: completeZones(columns, layers, zones) });
  }

  renameZone(columnId: string, layerId: string, name: string): MapLayout {
    return new MapLayout({
      ...this.draft,
      zones: this.draft.zones.map(zone =>
        zone.columnId === columnId && zone.layerId === layerId ? { ...zone, name } : { ...zone }
      ),
    });
  }

  addItem(kind: 'columns' | 'layers', id: string): MapLayout {
    if (!id.trim() || this.draft[kind].some(item => item.id === id)) {
      throw new Error('Un identifiant de colonne ou de layer unique est obligatoire.');
    }
    const item: LayoutAxis = {
      id,
      name: kind === 'columns' ? 'Nouvelle colonne' : 'Nouveau layer',
      order: this.draft[kind].length,
    };
    const items = [...this.draft[kind].map(existing => ({ ...existing })), item];
    const columns = kind === 'columns' ? items : this.draft.columns;
    const layers = kind === 'layers' ? items : this.draft.layers;
    return new MapLayout({ ...this.draft, [kind]: items, zones: completeZones(columns, layers, this.draft.zones) });
  }

  removeItem(kind: 'columns' | 'layers', id: string): MapLayout {
    if (this.draft[kind].length <= 1 || !this.draft[kind].some(item => item.id === id)) return this;
    const items = this.draft[kind].filter(item => item.id !== id).map((item, index) => ({ ...item, order: index }));
    const columns = kind === 'columns' ? items : this.draft.columns;
    const layers = kind === 'layers' ? items : this.draft.layers;
    return new MapLayout({ ...this.draft, [kind]: items, zones: completeZones(columns, layers, this.draft.zones) });
  }

  prepareForSave(layout: MapLayoutData, domains: DomainPlacement[]): PreparedLayout | null {
    const draft = this.draft;
    const uniqueIds = (items: { id: string }[]) => items.every(item => item.id.trim()) && new Set(items.map(item => item.id)).size === items.length;
    if (
      !draft.columns.length ||
      !draft.layers.length ||
      !uniqueIds(draft.columns) ||
      !uniqueIds(draft.layers) ||
      [...draft.columns, ...draft.layers, ...draft.zones].some(item => !item.name.trim())
    ) return null;

    const columnIds = new Set(draft.columns.map(item => item.id));
    const layerIds = new Set(draft.layers.map(item => item.id));
    const columns = draft.columns.map((item, index) => ({ ...item, name: item.name.trim(), order: index }));
    const layers = draft.layers.map((item, index) => ({ ...item, name: item.name.trim(), order: index }));
    const zones = draft.zones
      .filter(zone => columnIds.has(zone.columnId) && layerIds.has(zone.layerId))
      .map(zone => ({ ...zone, name: zone.name.trim() }));
    const zoneKeys = new Set<string>();
    for (const zone of zones) {
      const key = `${zone.columnId}:${zone.layerId}`;
      if (zoneKeys.has(key)) return null;
      zoneKeys.add(key);
    }

    columns.forEach(column => layers.forEach(layer => {
      const key = `${column.id}:${layer.id}`;
      if (!zoneKeys.has(key)) {
        zones.push({ id: key, columnId: column.id, layerId: layer.id, name: column.name });
        zoneKeys.add(key);
      }
    }));

    return {
      layout: { ...layout, columns, layers, zones },
      domains: domains.map((domain, index) => ({
        ...domain,
        layout: {
          ...(domain.layout || {}),
          columnId: columnIds.has(domain.layout?.columnId as string) ? domain.layout?.columnId : columns[index % columns.length].id,
          layerId: layerIds.has(domain.layout?.layerId as string) ? domain.layout?.layerId : layers[0].id,
        },
      })),
    };
  }

  isPlacementAvailable({
    domains, columns, layers, domainId, columnId, layerId, columnSpan,
  }: {
    domains: DomainPlacement[];
    columns: LayoutAxis[];
    layers: LayoutAxis[];
    domainId?: string;
    columnId: string;
    layerId: string;
    columnSpan: string | number;
  }): boolean {
    const start = columns.findIndex(column => column.id === columnId);
    const span = Number(columnSpan) || 1;
    if (start < 0 || !Number.isInteger(span) || span < 1 || start + span > columns.length || !layers.some(layer => layer.id === layerId)) return false;

    return !domains.some(domain => {
      if (domain.id === domainId || (domain.layout?.layerId || layers[0].id) !== layerId) return false;
      const otherStart = columns.findIndex(column => column.id === (domain.layout?.columnId || columns[0].id));
      const otherSpan = Math.max(1, Number(domain.layout?.columnSpan) || 1);
      if (otherStart < 0) return false;
      return start < otherStart + otherSpan && otherStart < start + span;
    });
  }

  prepareDomainPlacement({
    domains, layout, layoutMode, columns, layers, domainId, columnId, layerId,
  }: {
    domains: DomainPlacement[];
    layout: MapLayoutData;
    layoutMode: string;
    columns: LayoutAxis[];
    layers: LayoutAxis[];
    domainId?: string;
    columnId?: string;
    layerId?: string;
  }): PreparedLayout | null {
    if (!domainId) return null;
    const moving = domains.find(domain => domain.id === domainId);
    if (!columns.length || !layers.length) return null;
    if (!moving) return null;
    const targetColumn = columnId || moving.layout?.columnId as string || columns[0].id;
    const targetLayer = layerId || moving.layout?.layerId as string || layers[0].id;

    if (!this.isPlacementAvailable({
      domains, columns, layers, domainId, columnId: targetColumn, layerId: targetLayer,
      columnSpan: moving.layout?.columnSpan || 1,
    })) return null;

    return {
      layout: { ...layout, mode: layoutMode, columns: columns.map(column => ({ ...column })), layers: layers.map(layer => ({ ...layer })) },
      domains: domains.map(domain => domain.id === domainId
        ? { ...domain, layout: { ...(domain.layout || {}), columnId: targetColumn, layerId: targetLayer } }
        : { ...domain, ...(domain.layout === undefined ? {} : { layout: { ...domain.layout } }) }),
    };
  }
}
