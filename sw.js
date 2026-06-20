const CACHE_NAME = 'tortugotchi-v13';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './media/turtvox001_another_day_in_the_deep_blue.m4a',
  './media/turtvox002_best_human_ever.m4a',
  './media/turtvox003_bitten_shell_but_ok.m4a',
  './media/turtvox004_somebodys_coming.m4a',
  './media/turtvox005_ate_a_bag_toxic.m4a',
  './media/turtvox006_propeller_strike_fatal_wound.m4a',
  './media/turtvox006_heeheehee.m4a',
  './media/turtvox008_more_please.m4a',
  './media/turtvox008_glub_glub_glub.m4a',
  './media/turtvox09_hehe_that_tickles.m4a',
  './media/turtvox011_yummy_seagrass.m4a',
  './media/turtvox012_another_turtle_lets_play.m4a',
  './media/turtvox013_swim_safe_friend.m4a',
  './media/turtvox014_applying_salve.m4a',
  './media/turtvox15_I_think_I_grew_a_little.m4a',
  './media/turtvox016_crunchy_crab.m4a',
  './media/turtvox017_soft_jellyfish.m4a',
  './media/water_sfx_001.m4a',
  './media/water_sfx_002.m4a',
  './media/water_sfx_003.m4a'
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
