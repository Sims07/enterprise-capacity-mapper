/** Data transfer structures used at the persistence/application boundary. */
export type Layout = { columnId?: string; layerId?: string; columnSpan?: number; [key: string]: unknown };
export type Domain = { id: string; code: string; name: string; description?: string; color?: string; layout?: Layout; [key: string]: unknown };
export type Capability = { id: string; domainId: string; code?: string; name: string; description?: string; priority?: string; [key: string]: unknown };
export type Application = { id: string; name: string; code?: string; type?: string; status?: string; vendor?: string; capabilityIds?: string[]; description?: string; [key: string]: unknown };
export type CatalogModel = { domains: Domain[]; capabilities: Capability[]; applications: Application[]; [key: string]: unknown };
