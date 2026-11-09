/** Sort the library for display without rewriting the persisted order or timestamps. */
export type LibraryDateKind = 'saved' | 'recent';

export function sortLibraryEntriesByDate<T extends { updatedAt?: string; openedAt?: string }>(
  entries: readonly T[],
  kind: LibraryDateKind,
): T[] {
  const key = kind === 'saved' ? 'updatedAt' : 'openedAt';
  const dateOf = (entry: T): number => {
    const value = entry[key];
    if (!value) return Number.NEGATIVE_INFINITY;
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
  };

  // Stable sort keeps the original order when timestamps are equal or absent.
  return [...entries].sort((first, second) => {
    const left = dateOf(first);
    const right = dateOf(second);
    if (left === right) return 0;
    return left > right ? -1 : 1;
  });
}
