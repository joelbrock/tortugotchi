const CACHE_NAME = 'tortugotchi-v11';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;

  // Only handle GETs over http(s) to our own origin. Skip POST/PUT/DELETE,
  // chrome-extension://, data:, blob:, ws:, and cross-origin requests so the
  // worker can never be coerced into serving the wrong response.
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).catch(() => {
      if (req.destination === 'document') return caches.match('./index.html');
      return new Response('', { status: 504, statusText: 'Offline' });
    }))
  );
});
