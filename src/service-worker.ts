/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
// Makes TinyCoup an installable app: the app shell loads instantly and works
// offline; pages are network-first (always fresh when online).
// Never caches Firebase/Stripe/API traffic or premium signed URLs.
import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `tc-${version}`;
const PANELS = 'tc-panels';
const SHELL = [...build, ...files.filter((f) => !f.endsWith('.png') || f.includes('/icons/')), '/200.html'];

sw.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => sw.skipWaiting()));
});

sw.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== PANELS).map((k) => caches.delete(k)))).then(() => sw.clients.claim())
  );
});

sw.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Free comic panels are content-hashed and immutable: cache-first, capped.
  if (/\/p\/[0-9a-f]{20}-(400|800|1600)\.(avif|webp)$/.test(url.pathname)) {
    e.respondWith(caches.open(PANELS).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) { c.put(req, res.clone()); trim(c, 300); }
      return res;
    }));
    return;
  }
  if (url.origin !== location.origin) return; // Firebase, Stripe, signed URLs: straight to network

  // Build assets: cache-first (hashed filenames).
  if (SHELL.includes(url.pathname)) {
    e.respondWith(caches.match(req).then((r) => r ?? fetch(req)));
    return;
  }
  // Pages: network-first, fall back to cache, then the app shell.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
        .catch(async () => (await caches.match(req)) ?? (await caches.match('/200.html')) ?? Response.error())
    );
  }
});

async function trim(cache: Cache, max: number) {
  const keys = await cache.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(k);
}
