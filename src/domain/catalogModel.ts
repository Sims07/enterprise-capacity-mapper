import type { ApplicationRisk } from './applicationRisk.ts';
/** Data transfer structures used at the persistence/application boundary. */
export type Layout = { columnId?: string; layerId?: string; columnSpan?: number; rowSpan?: number; [key: string]: unknown };
export type Domain = { id: string; code: string; name: string; description?: string; color?: string; layout?: Layout; [key: string]: unknown };
export type FunctionalCoverage = 'unknown' | 'none' | 'partial' | 'sufficient';
export type CapabilityAssessment = {
  /** Qualitative assessment, never inferred from the number of applications. */
  functionalCoverage?: FunctionalCoverage;
  /** Explicitly assessed 1–5 maturity, not calculated automatically. */
  currentMaturity?: number;
  targetMaturity?: number;
  rationale?: string;
};
export type Capability = { id: string; domainId: string; code?: string; name: string; description?: string; priority?: string; assessment?: CapabilityAssessment; [key: string]: unknown };
export type Application = { risk?: ApplicationRisk; id: string; name: string; code?: string; type?: string; status?: string; vendor?: string; capabilityIds?: string[]; description?: string; [key: string]: unknown };
export type CatalogModel = { domains: Domain[]; capabilities: Capability[]; applications: Application[]; [key: string]: unknown };
