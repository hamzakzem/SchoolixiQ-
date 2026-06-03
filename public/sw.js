// Cache name with versioning
const CACHE_NAME = 'schoolix-cache-v12-deploy';
const BRAND_ASSETS = ['/logo.png', '/icon-192.png', '/icon-512.png', '/favicon.png'];

const isBrandAsset = (url) =>
  BRAND_ASSETS.some((path) => {
    try {
      const u = new URL(url);
      return u.pathname === path || u.pathname.endsWith(path);
    } catch {
      return url.includes(path);
    }
  });

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(['/', '/index.html', '/manifest.json']),
    ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key))),
    ).then(() => self.clients.matchAll({ type: 'window' })).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'SCHOOLIX_SW_UPDATED' });
      });
    }).then(() => self.clients.claim()),
  );
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
  
  // Detect if the request is for an HTML page or root routing (SPA Navigation)
  const isHtmlRequest = 
    event.request.mode === 'navigate' || 
    event.request.headers.get('accept')?.includes('text/html') ||
    event.request.url === self.location.origin ||
    event.request.url === self.location.origin + '/' ||
    event.request.url.endsWith('.html');

  if (isHtmlRequest) {
    // NETWORK-FIRST Strategy for HTML/routing to prevent white-screen on new build hash updates
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
          return caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || caches.match('/index.html') || caches.match('/');
          });
        })
    );
    return;
  }
  
  // Vite hashed bundles: network-first (avoid stale JS after deploy)
  const isHashedAsset =
    event.request.url.includes('/assets/') ||
    event.request.url.includes('.js') ||
    event.request.url.includes('.css');

  if (isHashedAsset) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Brand images: network-first so new logo reaches phones after deploy
  if (isBrandAsset(event.request.url)) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request)),
    );
    return;
  }

  // Other images/fonts: stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    }),
  );
});

// Push notification events
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Schoolix IQ Notification';
  const options = {
    body: data.body || 'You received a new message or update on Schoolix.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
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
