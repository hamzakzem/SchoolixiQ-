const CACHE_NAME = 'schoolix-cache-v6';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only intercept same-origin requests to prevent cross-origin issues
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Only cache GET requests and do not cache dynamic API requests to prevent staleness and WebKit errors
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }
  
  // Stale-While-Revalidate strategy for lightning-fast UI rendering & offline stability
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch((error) => {
          console.warn('Network request failed inside Service Worker:', error);
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// Push notification events
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Schoolix IQ Notification';
  const options = {
    body: data.body || 'You received a new message or update on Schoolix.',
    icon: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f3eb.svg',
    badge: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f3eb.svg',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
