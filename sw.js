const CACHE = 'mri-study-lab-shell-17';
const ROOT = new URL(self.registration.scope);
importScripts('./anatomy-plates.js','./quiz-assets.js','./registry-images.js');
const FILES = [
  './artifact-lessons.js', './artifact-browser.js', './registry-bank-artifacts.js',
  './study-focus.js', './registry-bank-focus.js', './body-browser.js',
  './study-resume.js', './study-guidance.js', './lower-extremity.js', './registry-bank-lower.js', './study-coverage.js', './lower-library.js',
  './academy.html', './physics-lessons.js', './physics-diagrams.js', './physics-videos.js', './physics-academy.js',
  './practice.html', './study-practice.js', './study-review.js', './study-store.js', './study-v2.css',
  './study-content-map.js', './study-variants.js', './registry-bank-academy.js',
  './registry.html', './registry.css', './registry.js', './registry-blueprints.js', './registry-core.js',
  './registry-content.js', './registry-image-view.js', './registry-images.js', './registry-bank-physics.js', './registry-calculations.js',
  './registry-bank-acquisition.js', './registry-bank-procedures.js', './registry-bank-safety.js', './registry-bank-pilot.js',
  ...Object.values(self.RegistryImages).map(asset=>asset.path),
  './app-navigation.js', './app-navigation.css', './anatomy-quiz-ui.js', './atlas-study.js',
  './quiz-assets.js', './atlas/quiz/LICENSE-BY-SA.txt', './atlas/cerebra-preview.webp',
  ...Object.values(self.QuizAssets).map(asset=>asset.asset),
  './anatomy-plates.js', './organ-catalog.js', './atlas-layers.js', './atlas-plate-practice.js',
  './atlas/plates/LICENSE-BY.txt', './atlas/plates/LICENSE-BY-NC-SA.txt',
  ...Object.values(self.AnatomyPlates).map(plate=>plate.asset),
  './', './index.html', './manifest.webmanifest', './icon.png', './real-scans.html',
  './study-center.html', './study-center.js', './study-content.js', './planner-geometry.js', './real-planner.js', './brain-atlas.html', './brain-atlas.js', './brain-reference.js', './nifti.js', './study-backup.js', './mri-physics.js', './physics-view.js'
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
