/**
 * Reconcile a local review with the current model-derived observations.
 * The saved exchange is historical; live findings reflect the current graph.
 * Only stable observation IDs are compared, never user-provided text.
 */
export type CompanionFindingIdentity = { id: string };

export type CompanionReviewProgress<T extends CompanionFindingIdentity> = {
  current: T[];
  resolvedCount: number;
  newlyDetectedCount: number;
  changed: boolean;
};

export function reconcileCompanionReview<T extends CompanionFindingIdentity>(
  initial: readonly T[],
  live: readonly T[],
): CompanionReviewProgress<T> {
  const oldIds = new Set(initial.map(item => item.id));
  const newIds = new Set(live.map(item => item.id));
  const resolvedCount = initial.filter(item => !newIds.has(item.id)).length;
  const newlyDetectedCount = live.filter(item => !oldIds.has(item.id)).length;
  return {
    current: [...live],
    resolvedCount,
    newlyDetectedCount,
    changed: resolvedCount > 0 || newlyDetectedCount > 0,
  };
}
