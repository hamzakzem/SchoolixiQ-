// Bump CACHE_NAME on every production deploy that changes hashed /assets/* bundles.
const CACHE_NAME = 'schoolix-cache-v11';
const ASSETS_TO_CACHE = ['/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key))),
    ).then(() => self.clients.claim()),
  );
});

function isHtmlNavigation(request) {
  return (
    request.mode === 'navigate' ||
    request.headers.get('accept')?.includes('text/html') ||
    request.url === self.location.origin ||
    request.url === self.location.origin + '/' ||
    request.url.endsWith('/index.html') ||
    request.url.endsWith('.html')
  );
}

function isServiceWorkerScript(request) {
  try {
    const path = new URL(request.url).pathname;
    return path === '/sw.js' || path.endsWith('/sw.js');
  } catch {
    return false;
  }
}

function isHashedBundle(request) {
  try {
    const path = new URL(request.url).pathname;
    return (
      path.startsWith('/assets/') &&
      /\.(js|mjs|css)(\?|$)/i.test(path)
    );
  } catch {
    return false;
  }
}

self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  // Never cache the HTML shell or SW script — stale copies cause missing chunk 404s.
  if (isHtmlNavigation(event.request) || isServiceWorkerScript(event.request)) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/index.html').then((cached) => cached || Response.error()),
      ),
    );
    return;
  }

  // Hashed Vite bundles: network-only (CDN/browser cache handles immutability).
  if (isHashedBundle(event.request)) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Stale-while-revalidate for images, fonts, and other static files.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic'
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    }),
  );
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Schoolix IQ Notification';
  const options = {
    body: data.body || 'You received a new message or update on Schoolix.',
    icon: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f3eb.svg',
    badge: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f3eb.svg',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
