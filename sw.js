/* FEMIX Plumbing Services — Service Worker
   Strategy:
   - App shell (HTML/CSS/JS/logo): cache-first, falls back to network, then updates cache
   - Images: stale-while-revalidate (show cached instantly, refresh in background)
   - Everything else: network-first, falls back to cache when offline
*/

const CACHE_VERSION = 'femix-v1';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const SHELL_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './images/femix-plumbing-logo.webp',
  './images/femix-logo.webp'
];

// Install: pre-cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[SW] Shell cache failed:', err))
  );
});

// Activate: clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('femix-') && key !== SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: route by request type
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // don't intercept third-party (GTM, fonts CDN, etc.)

  const isImage = request.destination === 'image';
  const isShellAsset = SHELL_ASSETS.some((asset) => url.pathname.endsWith(asset.replace('./', '/')) || url.pathname === '/');

  if (isShellAsset) {
    // Cache-first for the app shell — instant load, refresh cache in background
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request).then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => cached);
        return cached || networkFetch;
      })
    );
    return;
  }

  if (isImage) {
    // Stale-while-revalidate for images
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const networkFetch = fetch(request).then((response) => {
            if (response && response.ok) cache.put(request, response.clone());
            return response;
          }).catch(() => cached);
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // Network-first for everything else, fall back to cache when offline
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});