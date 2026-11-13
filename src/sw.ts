import { fetchFreshNavigation } from './services/pwaNavigation.ts';
import { appPrecacheAssets, obsoletePwaCaches, PWA_ASSET_MANIFEST } from './services/pwaAssetCache.ts';

const CACHE = 'ecm-v2.0.190';
const PRECACHE = ['./', './index.html', './manifest.webmanifest', './icons/icon.svg'];

interface ExtendableEventLike extends Event {
  waitUntil(promise: Promise<unknown>): void;
}

interface FetchEventLike extends Event {
  request: Request;
  respondWith(response: Promise<Response | undefined>): void;
  waitUntil(promise: Promise<unknown>): void;
}

interface ServiceWorkerRuntime extends EventTarget {
  skipWaiting(): Promise<void>;
  clients: { claim(): Promise<void> };
}

const worker = globalThis as unknown as ServiceWorkerRuntime;

worker.addEventListener('install', event => {
  (event as ExtendableEventLike).waitUntil((async () => {
    // Cache scripts and styles of this *exact* release before activating.
    // GitHub Pages deletes old hashed filenames on deploy; keeping only HTML
    // would otherwise leave existing tabs unable to import their modules.
    const response = await fetch(PWA_ASSET_MANIFEST, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Missing PWA release asset manifest: ${response.status}`);
    const assets = appPrecacheAssets(await response.json());
    const cache = await caches.open(CACHE);
    await cache.addAll([...PRECACHE, PWA_ASSET_MANIFEST, ...assets]);
  })());
});

worker.addEventListener('message', event => {
  if ((event as MessageEvent<{ type?: string }>).data?.type === 'SKIP_WAITING') {
    // Keep the message event alive until the activation request is handled.
    (event as ExtendableEventLike).waitUntil(worker.skipWaiting());
  }
});

worker.addEventListener('activate', event => {
  (event as ExtendableEventLike).waitUntil(
    caches.keys()
      .then(keys => Promise.all(obsoletePwaCaches(keys, CACHE).map(key => caches.delete(key))))
      .then(() => worker.clients.claim())
  );
});

worker.addEventListener('fetch', event => {
  const fetchEvent = event as FetchEventLike;
  if (fetchEvent.request.method !== 'GET') return;

  const request = fetchEvent.request;
  const url = new URL(request.url);
  const isNavigation = request.mode === 'navigate' || url.pathname.endsWith('/index.html');

  if (isNavigation) {
    fetchEvent.respondWith(
      fetchFreshNavigation(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            fetchEvent.waitUntil(caches.open(CACHE).then(cache => cache.put('./index.html', copy)));
          }
          return response;
        })
        .catch(() => caches.open(CACHE).then(cache => cache.match('./index.html')))
    );
    return;
  }

  fetchEvent.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;

    // Only versioned JS/CSS may need a previous release's cache after
    // GitHub Pages has removed its hashed filename from the current deploy.
    const isHashedAsset = /\/assets\/[a-zA-Z0-9_.-]+-[a-zA-Z0-9_-]+\.(?:js|css)$/.test(url.pathname);
    if (isHashedAsset) {
      const previous = await caches.match(request);
      if (previous) return previous;
    }

    const response = await fetch(request);
    if (response.ok) {
      fetchEvent.waitUntil(cache.put(request, response.clone()));
    }
    return response;
  })());
});
