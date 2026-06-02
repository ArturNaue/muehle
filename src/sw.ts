// v1.0.0 | 2026-06-02 MEZ
/// <reference lib="webworker" />

type PrecacheEntry = string | { url: string; revision?: string | null };

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: PrecacheEntry[];
};

const PRECACHE_CACHE = 'muehle-precache-v1';
const RUNTIME_CACHE = 'muehle-runtime-network-first-v1';
const PRECACHE_MANIFEST = self.__WB_MANIFEST;
const PRECACHE_URLS = Array.from(new Set(PRECACHE_MANIFEST.map(entry => manifestUrl(entry))))
  .map(entry => cacheUrl(entry));
const APP_SCOPE = new URL(self.registration.scope);
const FONT_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);

function manifestUrl(entry: PrecacheEntry): string {
  return typeof entry === 'string' ? entry : entry.url;
}

function cacheUrl(path: string): URL {
  return new URL(path, self.registration.scope);
}

function isCacheable(response: Response): boolean {
  return response.ok || response.type === 'opaque';
}

function isAppRequest(request: Request): boolean {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);
  return url.origin === APP_SCOPE.origin && url.pathname.startsWith(APP_SCOPE.pathname);
}

function isFontRequest(request: Request): boolean {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);
  return FONT_HOSTS.has(url.hostname);
}

async function trimPrecache(cache: Cache): Promise<void> {
  const expected = new Set(PRECACHE_URLS.map(url => url.href));
  const requests = await cache.keys();
  await Promise.all(
    requests
      .filter(request => !expected.has(request.url))
      .map(request => cache.delete(request))
  );
}

async function precacheAppShell(): Promise<void> {
  const cache = await caches.open(PRECACHE_CACHE);
  await cache.addAll(PRECACHE_URLS);
  await trimPrecache(cache);
}

async function cachedFallback(request: Request): Promise<Response | undefined> {
  const runtime = await caches.open(RUNTIME_CACHE);
  const runtimeMatch = await runtime.match(request);
  if (runtimeMatch) return runtimeMatch;

  const precache = await caches.open(PRECACHE_CACHE);
  const precacheMatch = await precache.match(request);
  if (precacheMatch) return precacheMatch;

  if (request.mode === 'navigate') {
    return precache.match(cacheUrl('index.html'));
  }

  return undefined;
}

async function serverFirst(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    if (isCacheable(response)) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const fallback = await cachedFallback(request);
    if (fallback) return fallback;
    throw new Error(`No network or cache response for ${request.url}`);
  }
}

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(precacheAppShell());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(key => key.startsWith('muehle-') && key !== PRECACHE_CACHE && key !== RUNTIME_CACHE)
            .map(key => caches.delete(key))
        )
      ),
    ])
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (isAppRequest(request) || isFontRequest(request)) {
    event.respondWith(serverFirst(request));
  }
});
