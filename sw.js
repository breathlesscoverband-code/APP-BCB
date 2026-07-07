/* APP-BCB - Service Worker - biblioteca publica no-cache - 20260705-181434 */
const CACHE_NAME = "app-bcb-pwa-reproductor-fix-20260707-174016";

const APP_SHELL = [
  "./",
  "./index.html?v=20260705-181434",
  "./manifest.json",
  "./css/styles.css",
  "./css/admin-guard.css",
  "./css/news-modal.css",
  "./js/assets.js",
  "./js/data.js",
  "./js/app.js",
  "./js/news-modal.js",
  "./js/admin-guard.js",
  "./js/audio-library.js?v=20260707-174016",
  "./assets/bcb_logo_main.png",
  "./assets/bcb_home_background.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL.map(u => new Request(u, { cache: "reload" }))).catch(() => caches.open(CACHE_NAME)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => key.includes("app-bcb") && key !== CACHE_NAME ? caches.delete(key) : Promise.resolve())))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  // CLAVE: la biblioteca y los audios no deben salir nunca de cache.
  if (url.pathname.includes("/assets/audio-library/")) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  const isCore =
    request.mode === "navigate" ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith("manifest.json");

  if (isCore) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match("./index.html?v=20260705-181434") || caches.match("./")))
    );
    return;
  }

  event.respondWith(
    fetch(request, { cache: "no-store" })
      .catch(() => caches.match(request))
  );
});
