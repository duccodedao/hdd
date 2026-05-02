const CACHE_NAME = "ecosystem-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "https://tytpht.hdd.io.vn/img/bmassloadings.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).catch(() => {
        // Fallback for offline if network fails and mostly it's a SPA navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
