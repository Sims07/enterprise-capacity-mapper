/** Fetches a navigation document without reusing a stale browser HTTP-cache entry. */
export const fetchFreshNavigation = (
  request: Request,
  fetcher: typeof fetch = fetch,
): Promise<Response> => fetcher(new Request(request, { cache: 'no-store' }));
