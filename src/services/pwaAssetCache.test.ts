import { describe, expect, it } from 'vitest';
import { appPrecacheAssets, obsoletePwaCaches, RETAINED_PWA_RELEASES } from './pwaAssetCache.ts';

describe('appPrecacheAssets', () => {
  it('returns a deduplicated list of scripts and styles emitted by the same Vite build', () => {
    expect(appPrecacheAssets({
      assets: ['./assets/app-abc123.js', './assets/app-abc123.js', './assets/index-xyz.css'],
    })).toEqual(['./assets/app-abc123.js', './assets/index-xyz.css']);
  });

  it.each([null, {}, { assets: [] }, { assets: ['/external.js'] }, { assets: ['./index.html'] }])(
    'rejects a missing or invalid asset manifest (%j)',
    manifest => expect(() => appPrecacheAssets(manifest)).toThrow(),
  );
});

describe('obsoletePwaCaches', () => {
  it('keeps the current version and two previous versions so open tabs can still load their bundles', () => {
    const names = ['unrelated', 'ecm-v2.0.142', 'ecm-v2.0.143', 'ecm-v2.0.144', 'ecm-v2.0.145'];
    expect(obsoletePwaCaches(names, 'ecm-v2.0.146')).toEqual(['ecm-v2.0.142', 'ecm-v2.0.143']);
    expect(RETAINED_PWA_RELEASES).toBe(3);
  });

  it('does not remove an active cache or unrelated caches', () => {
    expect(obsoletePwaCaches(['ecm-v2.0.145', 'ecm-v2.0.146', 'other'], 'ecm-v2.0.146')).toEqual([]);
  });
});
