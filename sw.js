/* APP-BCB Â· Service Worker v7.1 estable auditorÃ­a */
const CACHE_NAME = "app-bcb-pwa-v7-1-audio-library-nocache-20260705_172557";
const APP_SHELL = [
  "./",
  "./index.html?v=7.1.0-estable",
  "./manifest.json?v=7.1.0-estable",
  "./css/styles.css?v=7.1.0-estable",
  "./css/admin-guard.css?v=7.1.0-estable",
  "./css/news-modal.css?v=7.1.0-estable",
  "./js/assets.js?v=7.1.0-estable",
  "./js/data.js?v=7.1.0-estable",
  "./js/app.js?v=7.1.0-estable",
  "./js/news-modal.js?v=7.1.0-estable",
  "./js/admin-guard.js?v=7.1.0-estable",
  "./js/audio-library.js?v=7.1.0-estable",
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
      .then(cache => cache.addAll(APP_SHELL.map(u => new Request(u, {cache: "reload"}))).catch(() => caches.open(CACHE_NAME)))
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

  // AUDIO_LIBRARY_NO_CACHE_PATCH
  // La biblioteca y los audios deben ir siempre a red.
  // Si el Service Worker cachea un 404 antiguo, la app pÃºblica puede quedarse sin canciones
  // aunque GitHub y library_bcb.json estÃ©n actualizados.
  if (url.pathname.includes("/assets/audio-library/")) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then(response => response)
        .catch(() => caches.match(request))
    );
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
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(()=>{});
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match("./index.html?v=7.1.0-estable") || caches.match("./")))
    );
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(cached => cached || fetch(request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(()=>{});
        return response;
      }))
  );
});

