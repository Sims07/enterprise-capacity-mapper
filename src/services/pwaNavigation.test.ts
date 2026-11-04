import { describe, expect, it, vi } from 'vitest';
import { fetchFreshNavigation } from './pwaNavigation.ts';

describe('fetchFreshNavigation', () => {
  it('bypasses the browser HTTP cache while preserving the presentation URL', async () => {
    const request = new Request('https://example.github.io/enterprise-capacity-mapper/?view=presentation', { mode: 'navigate' });
    const response = new Response('<html>fresh</html>');
    const fetcher = vi.fn().mockResolvedValue(response);
    await expect(fetchFreshNavigation(request, fetcher)).resolves.toBe(response);
    const sentRequest = fetcher.mock.calls[0][0] as Request;
    expect(sentRequest.url).toBe(request.url);
    expect(sentRequest.cache).toBe('no-store');
    expect(sentRequest.mode).toBe('navigate');
  });
});
