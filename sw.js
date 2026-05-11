/* APP-BCB · PWA service worker v3.8 final sync · local mensual estable */
const CACHE_NAME = "app-bcb-pwa-v3-8-0-local-mensual";
const APP_SHELL = [
  "./",
  "./index.html?v=3.8.0-bcb",
  "./manifest.json?v=3.8.0-bcb",
  "./css/styles.css?v=3.8.0-bcb",
  "./css/admin-guard.css?v=3.8.0-bcb",
  "./js/assets.js?v=3.8.0-bcb",
  "./js/data.js?v=3.8.0-bcb",
  "./js/app.js?v=3.8.0-bcb",
  "./js/admin-guard.js?v=3.8.0-bcb",
  "./assets/bcb_logo_main.png",
  "./assets/bcb_home_background.png",
  "./assets/bcb_setlist_base.png",
  "./assets/BCB_Tonalidades_Setlist_v2_SOLO_MIGUEL_CARMEN.xlsx",
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
      .then(keys => Promise.all(keys.map(key => key !== CACHE_NAME && key.includes("app-bcb") ? caches.delete(key) : Promise.resolve())))
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
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match("./index.html?v=3.8.0-bcb") || caches.match("./")))
    );
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(cached => cached || fetch(request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      }))
  );
});
