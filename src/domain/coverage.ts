import type { Application } from './catalogModel.ts';
import { supportsCurrent, supportsTarget } from './applicationRelations.ts';

export type MappedItem = { id: string; [key: string]: unknown };
export type CoverageState = {
  state: 'gap' | 'ok' | 'redundant';
  label: string;
  symbol: string;
  /** Number of distinct linked applications, including planned target applications. */
  count: number;
  /** Number of applications contributing to the current state, including those also in the target. */
  currentCount: number;
  targetCount: number;
  apps: Application[];
};

const relationIds = (application: Application): string[] => application.capabilityIds ?? [];

/** A planned ("Cible") application cannot prove coverage of the current state. */
export const isCurrentApplication = (application: Application): boolean =>
  String(application.status ?? '').trim().toLocaleLowerCase('fr') !== 'cible';

/** Derives current coverage without hiding planned application relations. */
export const getCapabilityCoverageState = (targetId: string, applications: Application[]): CoverageState => {
  const assignedApplications = applications.filter(application => relationIds(application).includes(targetId));
  const count = assignedApplications.length;
  const currentCount = assignedApplications.filter(application => supportsCurrent(application, targetId)).length;
  const targetCount = assignedApplications.filter(application => supportsTarget(application, targetId)).length;
  if (currentCount === 0) return { state: 'gap', label: 'Gap', symbol: '✕', count, currentCount, targetCount, apps: assignedApplications };
  if (currentCount === 1) return { state: 'ok', label: 'Couvert', symbol: '✓', count, currentCount, targetCount, apps: assignedApplications };
  return { state: 'redundant', label: 'Redondance', symbol: '⇄', count, currentCount, targetCount, apps: assignedApplications };
};

export const deriveCoverageOverview = ({
  mappedItems, applications, selectedIds,
}: {
  mappedItems: MappedItem[];
  applications: Application[];
  selectedIds: string[];
}) => {
  const selected = new Set(selectedIds);
  const coveredIds = new Set(applications.flatMap(application =>
    relationIds(application).filter(id => supportsCurrent(application, id))));
  const relationCounts = new Map<string, number>();
  applications.forEach(application => relationIds(application)
    .filter(id => supportsCurrent(application, id))
    .forEach(id => relationCounts.set(id, (relationCounts.get(id) ?? 0) + 1)));
  return {
    touched: applications.filter(application => relationIds(application).some(id => selected.has(id))),
    gaps: mappedItems.filter(item => selected.has(item.id) && !coveredIds.has(item.id)),
    redundancy: mappedItems.filter(item => (relationCounts.get(item.id) ?? 0) > 1),
  };
};
