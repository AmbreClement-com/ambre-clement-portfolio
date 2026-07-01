// Service worker MINIMAL — sert uniquement à rendre le site installable (PWA) et
// résilient hors-ligne. Il NE modifie AUCUN comportement en ligne :
//  • seules les NAVIGATIONS (documents) sont interceptées, en « réseau d'abord » →
//    le contenu reste toujours frais quand il y a du réseau ;
//  • hors-ligne, on retombe sur la page d'accueil mise en cache (coquille de secours) ;
//  • tout le reste (assets, API, images) passe directement au réseau (non intercepté).
const CACHE = "ac-shell-v1";
const FALLBACK = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.add(FALLBACK))
      .catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // On ne gère QUE les navigations GET → réseau d'abord, secours = accueil en cache.
  if (req.method !== "GET" || req.mode !== "navigate") return;
  event.respondWith(
    fetch(req).catch(() => caches.match(FALLBACK, { ignoreSearch: true })),
  );
});
