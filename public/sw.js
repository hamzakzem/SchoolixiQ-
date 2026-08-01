// Bump SHELL_CACHE on every production deploy that changes the app shell.
// Hashed /assets/*.js|css must NEVER be precached or runtime-cached (prevents white-screen chunk mismatch).
const SHELL_CACHE = 'schoolix-shell-v15';
const RUNTIME_CACHE = 'schoolix-runtime-v15';
const PRECACHE_FALLBACK = [
  '/index.html',
  '/manifest.json',
  '/brand/schoolixiq-logo.png',
  '/favicon.ico',
  '/icon.svg',
];

let shellReloadSent = false;

function isHashedAssetUrl(url) {
  try {
    const path = new URL(url, self.location.origin).pathname;
    return path.startsWith('/assets/') && /\.(js|mjs|css)(\?|$)/i.test(path);
  } catch {
    return false;
  }
}

function filterShellPrecache(urls) {
  return [...new Set(urls)].filter((url) => {
    if (!url || typeof url !== 'string') return false;
    if (isHashedAssetUrl(url)) return false;
    // Never precache the SW script or API routes
    if (url.includes('/api/')) return false;
    if (url.endsWith('/sw.js') || url.includes('/sw.js?')) return false;
    return true;
  });
}

async function notifyClients(payload) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage(payload);
  }
}

async function purgeAllSchoolixCaches() {
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
  console.log('[SW] OLD_CACHE_CLEANED', keys);
  return keys;
}

async function purgeAndReloadClients(reason) {
  if (shellReloadSent) return;
  shellReloadSent = true;
  await purgeAllSchoolixCaches();
  await notifyClients({ type: 'SW_STALE_CHUNK_RELOAD', reason: reason || 'stale_chunk' });
}

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

      const urls = filterShellPrecache([...PRECACHE_FALLBACK, ...extras]);
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
      const stale = keys.filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE);
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
  return isHashedAssetUrl(request.url);
}

async function cachePut(cacheName, request, response) {
  if (!response || response.status !== 200 || response.type !== 'basic') return;
  // Hard guard: never persist hashed Vite chunks
  if (isHashedBundle(request)) return;
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
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) {
      const shellCache = await caches.open(SHELL_CACHE);
      const indexReq = new Request('/index.html');
      await shellCache.put(indexReq, response.clone());
      console.log('[SW] CACHE_UPDATED', '/index.html');
    }
    return response;
  } catch {
    console.log('[SW] NAVIGATION_FALLBACK', request.url);
    const cached = await caches.match('/index.html');
    if (cached) return cached;
    return Response.error();
  }
}

/** Network-only for hashed /assets/*.js|css — never serve or store stale chunks. */
async function hashedBundleStrategy(request) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) {
      return response;
    }
    if (response.status === 404) {
      await purgeAndReloadClients('hashed_asset_404');
    }
    return response;
  } catch {
    await purgeAndReloadClients('hashed_asset_network_error');
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith(self.location.origin)) return;
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) return;

  if (isServiceWorkerScript(event.request)) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  if (isHashedBundle(event.request)) {
    event.respondWith(hashedBundleStrategy(event.request));
    return;
  }

  if (isHtmlNavigation(event.request)) {
    event.respondWith(navigationFallback(event.request));
    return;
  }

  // Shell / static: network-first with cache fallback (icons, manifest, etc.)
  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.ok) {
          await cachePut(RUNTIME_CACHE, event.request, networkResponse);
        }
        return networkResponse;
      } catch {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;
        return (await caches.match('/index.html')) || Response.error();
      }
    })(),
  );
});

self.addEventListener('message', (event) => {
  const type = event.data?.type;
  if (type === 'SX_PURGE_CACHES') {
    event.waitUntil(purgeAllSchoolixCaches());
  }
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() };
  }
  const data = payload.data
    ? { ...payload.data, ...(payload.notification || {}) }
    : payload.notification
      ? { ...payload, ...payload.notification, ...payload.data }
      : payload;
  const title = data.title || payload.notification?.title || 'Schoolix IQ';
  const body = data.body || payload.notification?.body || data.message || 'إشعار جديد';
  const route = data.routeTarget || data.route || data.type || '/';
  const url = data.url || data.actionUrl || `/?tab=${encodeURIComponent(route)}`;
  const silent = data.sound === '0' || data.silent === true || data.silent === 'true';
  const vibrate =
    data.vibration === '0' ? undefined : Array.isArray(data.vibrate) ? data.vibrate : [120, 60, 120];
  const options = {
    body,
    icon: data.icon || '/brand/schoolixiq-logo.png',
    badge: '/favicon.ico',
    image: data.image || data.imageUrl || undefined,
    vibrate,
    silent: Boolean(silent),
    requireInteraction: false,
    tag: data.notificationId || data.dedupKey || `sx-${Date.now()}`,
    renotify: true,
    data: {
      url,
      route,
      routeTarget: route,
      notificationId: data.notificationId,
      type: data.type,
    },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  const route = event.notification.data?.routeTarget || event.notification.data?.route;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            route,
            routeTarget: route,
            url: targetUrl,
            notificationId: event.notification.data?.notificationId,
          });
          if (typeof client.navigate === 'function' && targetUrl) {
            try {
              client.navigate(targetUrl);
            } catch {
              /* ignore navigate failures */
            }
          }
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    }),
  );
});
