/* Firebase Cloud Messaging — background push when app/tab is closed */
importScripts('https://www.gstatic.com/firebasejs/11.3.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.3.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyD1-Wp-pVMceqVrpNlj--mdA5OXq236XdU',
  authDomain: 'yala-safari-iq.firebaseapp.com',
  projectId: 'yala-safari-iq',
  storageBucket: 'yala-safari-iq.firebasestorage.app',
  messagingSenderId: '377979165565',
  appId: '1:377979165565:web:9f31d525eaad7477b78a14',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || 'schoolixiQ';
  const body =
    payload.notification?.body || payload.data?.body || payload.data?.message || '';
  const url = payload.data?.url || payload.fcmOptions?.link || '/';

  self.registration.showNotification(title, {
    body,
    icon: '/logo.png',
    badge: '/logo.png',
    tag: payload.data?.type || 'schoolix-notification',
    data: { url },
    vibrate: [120, 60, 120],
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes(self.location.origin)) {
            return client.focus();
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    }),
  );
});
