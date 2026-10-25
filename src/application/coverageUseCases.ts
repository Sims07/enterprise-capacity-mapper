import type { Application } from './catalogUseCases.ts';

export type MappedItem = { id: string; [key: string]: unknown };
export type CoverageState = {
  state: 'gap' | 'ok' | 'redundant';
  label: string;
  symbol: string;
  count: number;
  apps: Application[];
};

const relationIds = (application: Application): string[] => application.capabilityIds || [];

export const getCapabilityCoverageState = (capabilityId: string, applications: Application[]): CoverageState => {
  const assignedApplications = applications.filter(application => relationIds(application).includes(capabilityId));
  const count = assignedApplications.length;
  if (count === 0) return { state: 'gap', label: 'Gap', symbol: '✕', count: 0, apps: assignedApplications };
  if (count === 1) return { state: 'ok', label: 'Couvert', symbol: '✓', count: 1, apps: assignedApplications };
  return { state: 'redundant', label: 'Redondance', symbol: '⇄', count, apps: assignedApplications };
};

export const deriveCoverageOverview = ({ mappedItems, applications, selectedIds }: { mappedItems: MappedItem[]; applications: Application[]; selectedIds: string[] }) => {
  const selected = new Set(selectedIds);
  const coveredIds = new Set(applications.flatMap(relationIds));
  const relationCounts = new Map<string, number>();
  applications.forEach(application => relationIds(application).forEach(id => relationCounts.set(id, (relationCounts.get(id) || 0) + 1)));
  return {
    touched: applications.filter(application => relationIds(application).some(id => selected.has(id))),
    gaps: mappedItems.filter(item => selected.has(item.id) && !coveredIds.has(item.id)),
    redundancy: mappedItems.filter(item => (relationCounts.get(item.id) || 0) > 1),
  };
};
