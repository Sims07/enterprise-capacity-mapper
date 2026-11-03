/** Domain rules for the TOGAF capability-map matrix layout. */

export type LayoutAxis = { id: string; name: string; order?: number; size?: number; [key: string]: unknown };
export type LayoutZone = { id: string; columnId: string; layerId: string; name: string; [key: string]: unknown };
export type LayoutDraft = { columns: LayoutAxis[]; layers: LayoutAxis[]; zones: LayoutZone[]; [key: string]: unknown };
export type MapLayoutData = { mode?: string; columns?: LayoutAxis[]; layers?: LayoutAxis[]; zones?: LayoutZone[]; [key: string]: unknown };
export type DomainPlacement = {
  id: string;
  layout?: { columnId?: string; layerId?: string; columnSpan?: string | number; rowSpan?: string | number; [key: string]: unknown };
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

const normalizedSpan = (value: string | number | undefined): number | null => {
  const span = value === undefined ? 1 : Number(value);
  return Number.isInteger(span) && span >= 1 ? span : null;
};

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
    return completeZones(columns, layers, zones).map(zone => cloneValue(zone));
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
      !uniqueIds(draft.zones) ||
      [...draft.columns, ...draft.layers, ...draft.zones].some(item => !item.name.trim()) ||
      [...draft.columns, ...draft.layers].some(item => item.size !== undefined && (!Number.isFinite(item.size) || item.size <= 0))
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

    const preparedDomains: DomainPlacement[] = [];
    for (const [index, domain] of domains.entries()) {
      const columnId = columnIds.has(domain.layout?.columnId as string)
        ? domain.layout?.columnId as string
        : columns[index % columns.length].id;
      const layerId = layerIds.has(domain.layout?.layerId as string)
        ? domain.layout?.layerId as string
        : layers[0].id;
      const columnSpan = normalizedSpan(domain.layout?.columnSpan);
      const rowSpan = normalizedSpan(domain.layout?.rowSpan);
      const columnStart = columns.findIndex(column => column.id === columnId);
      const layerStart = layers.findIndex(layer => layer.id === layerId);
      if (
        columnSpan === null || rowSpan === null ||
        columnStart < 0 || layerStart < 0 ||
        columnStart + columnSpan > columns.length ||
        layerStart + rowSpan > layers.length
      ) return null;
      preparedDomains.push(cloneValue({
        ...domain,
        layout: { ...(domain.layout || {}), columnId, layerId },
      }));
    }

    for (const [index, domain] of preparedDomains.entries()) {
      const placement = domain.layout || {};
      if (!this.isPlacementAvailable({
        domains: preparedDomains.slice(0, index),
        columns,
        layers,
        domainId: domain.id,
        columnId: placement.columnId as string,
        layerId: placement.layerId as string,
        columnSpan: placement.columnSpan as string | number | undefined ?? 1,
        rowSpan: placement.rowSpan as string | number | undefined ?? 1,
        allowExactOverlap: layout.mode !== 'mosaic',
      })) return null;
    }

    return {
      layout: cloneValue({ ...layout, columns, layers, zones }),
      domains: preparedDomains,
    };
  }

  isPlacementAvailable({
    domains, columns, layers, domainId, columnId, layerId, columnSpan, rowSpan, allowExactOverlap = true,
  }: {
    domains: DomainPlacement[];
    columns: LayoutAxis[];
    layers: LayoutAxis[];
    domainId?: string;
    columnId: string;
    layerId: string;
    columnSpan: string | number;
    rowSpan?: string | number;
    allowExactOverlap?: boolean;
  }): boolean {
    const columnStart = columns.findIndex(column => column.id === columnId);
    const layerStart = layers.findIndex(layer => layer.id === layerId);
    const columnSize = normalizedSpan(columnSpan);
    const layerSize = normalizedSpan(rowSpan);
    if (
      columnStart < 0 || layerStart < 0 || columnSize === null || layerSize === null ||
      columnStart + columnSize > columns.length || layerStart + layerSize > layers.length
    ) return false;

    return !domains.some(domain => {
      if (domain.id === domainId) return false;
      const otherColumnStart = columns.findIndex(column => column.id === (domain.layout?.columnId || columns[0].id));
      const otherLayerStart = layers.findIndex(layer => layer.id === (domain.layout?.layerId || layers[0].id));
      if (otherColumnStart < 0 || otherLayerStart < 0) return false;
      const otherColumnSize = normalizedSpan(domain.layout?.columnSpan);
      const otherLayerSize = normalizedSpan(domain.layout?.rowSpan);
      if (otherColumnSize === null || otherLayerSize === null) return true;

      const sameRectangle = otherColumnStart === columnStart && otherLayerStart === layerStart
        && otherColumnSize === columnSize && otherLayerSize === layerSize;
      // Legacy matrix layouts may intentionally share an identical placement.
      if (allowExactOverlap && sameRectangle) return false;

      const columnsOverlap = columnStart < otherColumnStart + otherColumnSize
        && otherColumnStart < columnStart + columnSize;
      const layersOverlap = layerStart < otherLayerStart + otherLayerSize
        && otherLayerStart < layerStart + layerSize;
      return columnsOverlap && layersOverlap;
    });
  }

  prepareDomainPlacement({
    domains, layout, layoutMode, columns, layers, domainId, columnId, layerId, columnSpan, rowSpan, allowExactOverlap = true,
  }: {
    domains: DomainPlacement[];
    layout: MapLayoutData;
    layoutMode: string;
    columns: LayoutAxis[];
    layers: LayoutAxis[];
    domainId?: string;
    columnId?: string;
    layerId?: string;
    columnSpan?: string | number;
    rowSpan?: string | number;
    allowExactOverlap?: boolean;
  }): PreparedLayout | null {
    if (!domainId) return null;
    const moving = domains.find(domain => domain.id === domainId);
    if (!columns.length || !layers.length) return null;
    if (!moving) return null;
    const targetColumn = columnId || moving.layout?.columnId as string || columns[0].id;
    const targetLayer = layerId || moving.layout?.layerId as string || layers[0].id;

    const targetColumnSpan = columnSpan ?? moving.layout?.columnSpan ?? 1;
    const targetRowSpan = rowSpan ?? moving.layout?.rowSpan ?? 1;
    if (!this.isPlacementAvailable({
      domains, columns, layers, domainId, columnId: targetColumn, layerId: targetLayer,
      columnSpan: targetColumnSpan, rowSpan: targetRowSpan, allowExactOverlap,
    })) return null;

    return {
      layout: cloneValue({ ...layout, mode: layoutMode, columns, layers }),
      domains: domains.map(domain => cloneValue(domain.id === domainId
        ? { ...domain, layout: { ...(domain.layout || {}), columnId: targetColumn, layerId: targetLayer,
          ...(columnSpan === undefined ? {} : { columnSpan: targetColumnSpan }),
          ...(rowSpan === undefined ? {} : { rowSpan: targetRowSpan }),
        } }
        : domain)),
    };
  }
}
