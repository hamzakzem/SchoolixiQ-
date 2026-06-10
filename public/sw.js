// Bump CACHE_NAME on every production deploy that changes hashed /assets/* bundles.
const CACHE_NAME = 'schoolix-cache-v10';
const ASSETS_TO_CACHE = ['/manifest.json'];

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
  
  const isHashedBundle =
    event.request.url.includes('/assets/') &&
    /\.(js|mjs|css)(\?|$)/i.test(event.request.url);

  if (isHashedBundle) {
    // Network-only for Vite hashed bundles — never serve a cached chunk after deploy.
    event.respondWith(fetch(event.request));
    return;
  }

  // Stale-While-Revalidate for images, fonts, and other static files
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
