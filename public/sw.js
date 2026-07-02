// Bump SHELL_CACHE / RUNTIME_CACHE on production deploys that change hashed /assets/* bundles.
const SHELL_CACHE = 'schoolix-shell-v12';
const RUNTIME_CACHE = 'schoolix-runtime-v12';
const PRECACHE_FALLBACK = [
  '/index.html',
  '/manifest.json',
  '/brand/schoolixiq-logo.png',
  '/favicon.ico',
];

let shellReloadSent = false;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      let extras = [];
      try {
        const res = await fetch('/sw-precache.json', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          extras = Array.isArray(json.assets) ? json.assets : [];
        }
      } catch {
        // Offline install — use fallback list only.
      }

      const urls = [...new Set([...PRECACHE_FALLBACK, ...extras])];
      const results = await Promise.allSettled(
        urls.map(async (url) => {
          try {
            await cache.add(url);
          } catch (err) {
            console.warn('[SW] precache skip', url, err);
          }
        }),
      );
      const ok = results.filter((r) => r.status === 'fulfilled').length;
      console.log('[SW] APP_SHELL_CACHE_READY', { total: urls.length, cached: ok });
      await notifyClients({
        type: 'SW_APP_SHELL_CACHE_READY',
        updatedAt: new Date().toISOString(),
        count: ok,
      });
    })(),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const stale = keys.filter(
        (key) =>
          (key.startsWith('schoolix-') || key.startsWith('schoolixiq-')) &&
          key !== SHELL_CACHE &&
          key !== RUNTIME_CACHE,
      );
      if (stale.length > 0) {
        await Promise.all(stale.map((key) => caches.delete(key)));
        console.log('[SW] OLD_CACHE_CLEANED', stale);
      }
      await self.clients.claim();
    })(),
  );
});

function isHtmlNavigation(request) {
  return (
    request.mode === 'navigate' ||
    request.headers.get('accept')?.includes('text/html') ||
    request.url === self.location.origin ||
    request.url === `${self.location.origin}/` ||
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
    return path.startsWith('/assets/') && /\.(js|mjs|css)(\?|$)/i.test(path);
  } catch {
    return false;
  }
}

async function notifyClients(payload) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage(payload);
  }
}

async function cachePut(cacheName, request, response) {
  if (!response || response.status !== 200 || response.type !== 'basic') return;
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
  console.log('[SW] CACHE_UPDATED', request.url);
  await notifyClients({
    type: 'SW_CACHE_UPDATED',
    url: request.url,
    updatedAt: new Date().toISOString(),
  });
}

async function navigationFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const shellCache = await caches.open(SHELL_CACHE);
      const indexReq = new Request('/index.html');
      await shellCache.put(indexReq, response.clone());
      console.log('[SW] CACHE_UPDATED', '/index.html');
    }
    return response;
  } catch {
    console.log('[SW] NAVIGATION_FALLBACK', request.url);
    const cached =
      (await caches.match('/index.html')) ||
      (await caches.match(new Request('/index.html', { cacheName: SHELL_CACHE })));
    if (cached) return cached;
    return Response.error();
  }
}

async function hashedBundleStrategy(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cachePut(RUNTIME_CACHE, request, response);
      return response;
    }
    if (response.status === 404) {
      const cached = await caches.match(request);
      if (!cached && !shellReloadSent) {
        shellReloadSent = true;
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        console.log('[SW] OLD_CACHE_CLEANED', keys);
        await notifyClients({ type: 'SW_STALE_CHUNK_RELOAD' });
      }
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith(self.location.origin)) return;
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) return;

  if (isServiceWorkerScript(event.request)) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (isHtmlNavigation(event.request)) {
    event.respondWith(navigationFallback(event.request));
    return;
  }

  if (isHashedBundle(event.request)) {
    event.respondWith(hashedBundleStrategy(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then(async (networkResponse) => {
          await cachePut(RUNTIME_CACHE, event.request, networkResponse);
          return networkResponse;
        })
        .catch(async () => {
          if (cachedResponse) return cachedResponse;
          return (await caches.match('/')) || (await caches.match('/index.html')) || Response.error();
        });

      return cachedResponse || fetchPromise;
    }),
  );
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() };
  }
  const data = payload.notification ? { ...payload, ...payload.data } : payload;
  const title = data.title || payload.notification?.title || 'Schoolix IQ';
  const body = data.body || payload.notification?.body || 'إشعار جديد';
  const route = data.routeTarget || data.route || data.type || '/';
  const url = data.url || `/?tab=${encodeURIComponent(route)}`;
  const options = {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    tag: data.notificationId || data.dedupKey || undefined,
    data: { url, route, routeTarget: route, notificationId: data.notificationId },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            route: event.notification.data?.route,
            routeTarget: event.notification.data?.routeTarget || event.notification.data?.route,
          });
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    }),
  );
});
