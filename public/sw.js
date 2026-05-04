const CACHE_NAME = "ecosystem-v2";
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "https://tytpht.hdd.io.vn/img/bmassloadings.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// Push Notification Handling
self.addEventListener('push', (event) => {
  let data = { title: 'Thông báo mới', body: 'Bạn có một thông báo mới từ hệ thống.' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { ...data, body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: 'https://tytpht.hdd.io.vn/img/bmassloadings.png',
    badge: 'https://tytpht.hdd.io.vn/img/bmassloadings.png',
    data: data.url || '/',
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'Xem ngay' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
