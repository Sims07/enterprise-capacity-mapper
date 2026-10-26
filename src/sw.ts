const CACHE = 'ecm-v2.0.59';
const PRECACHE = ['./', './index.html', './manifest.webmanifest', './icons/icon.svg'];

interface ExtendableEventLike extends Event {
  waitUntil(promise: Promise<unknown>): void;
}

interface FetchEventLike extends Event {
  request: Request;
  respondWith(response: Promise<Response | undefined>): void;
}

interface ServiceWorkerRuntime extends EventTarget {
  skipWaiting(): Promise<void>;
  clients: { claim(): Promise<void> };
}

const worker = globalThis as unknown as ServiceWorkerRuntime;

worker.addEventListener('install', event => {
  (event as ExtendableEventLike).waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE))
  );
});

worker.addEventListener('message', event => {
  if ((event as MessageEvent<{ type?: string }>).data?.type === 'SKIP_WAITING') {
    void worker.skipWaiting();
  }
});

worker.addEventListener('activate', event => {
  (event as ExtendableEventLike).waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith('ecm-') && key !== CACHE)
          .map(key => caches.delete(key))
      ))
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
      fetch(request)
        .then(response => {
          const copy = response.clone();
          void caches.open(CACHE).then(cache => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  fetchEvent.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
