const CACHE = 'mri-study-lab-shell-6';
const ROOT = new URL(self.registration.scope);
const FILES = [
  './', './index.html', './manifest.webmanifest', './icon.png', './real-scans.html',
  './planner-geometry.js', './real-planner.js', './brain-atlas.html', './brain-atlas.js', './brain-reference.js', './nifti.js', './study-backup.js', './mri-physics.js', './physics-view.js'
];
const shellURLs = new Set(FILES.map(file => new URL(file, ROOT).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache =>
    cache.addAll(FILES.map(file => new Request(new URL(file, ROOT), { cache: 'reload' })))));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if ((name.startsWith('mri-study-lab-shell-') && name !== CACHE) || name === 'mri-study-lab-real-1') {
        await caches.delete(name);
      }
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== ROOT.origin) return;
  if (event.request.mode === 'navigate') url.search = '';
  if (!shellURLs.has(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    return (await cache.match(url.href)) ?? fetch(event.request);
  })());
});
