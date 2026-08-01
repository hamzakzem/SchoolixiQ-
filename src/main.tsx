import {StrictMode, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/chat-ui.css';
import { initSentry } from './lib/sentryWrapper';

if (import.meta.env.VITE_SENTRY_DSN) {
  let dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn.startsWith('http://') && !dsn.startsWith('https://')) {
    dsn = `https://${dsn}`;
  }

  try {
    initSentry(dsn);
  } catch (error) {
    console.error("Failed to call initSentry:", error);
  }
} else {
  console.warn("Sentry error tracking is disabled: VITE_SENTRY_DSN is not set.");
}

// Handle Vit's HMR websocket errors which are benign in this environment
if (typeof window !== 'undefined') {
  const checkAndHandleDbError = (errMessage: string) => {
    const isInIframe = window.self !== window.top;
    if (isInIframe) {
      console.log("Suppressed IndexedDB connection error inside iframe since memory/session cache is used instead.");
      return;
    }

    if (
      errMessage && 
      (errMessage.includes('refusing to open IndexedDB') || 
       errMessage.includes('corruption of the IndexedDB') || 
       errMessage.includes('IndexedDB database data') || 
       errMessage.includes('Connection to Indexed Database') || 
       errMessage.includes('Database server lost'))
    ) {
      const reloadCount = parseInt(sessionStorage.getItem('db_error_reload_count') || '0', 10);
      if (reloadCount < 3) {
        sessionStorage.setItem('db_error_reload_count', (reloadCount + 1).toString());
        if (window.indexedDB && window.indexedDB.databases) {
          window.indexedDB.databases().then((databases) => {
            databases.forEach((dbInfo) => {
              if (dbInfo.name) {
                try {
                  window.indexedDB.deleteDatabase(dbInfo.name);
                } catch (e) {
                  console.error('Failed to delete corrupted database:', dbInfo.name, e);
                }
              }
            });
            setTimeout(() => {
              window.location.reload();
            }, 500);
          }).catch(() => {
            window.location.reload();
          });
        } else {
          window.location.reload();
        }
      } else {
        const warningDiv = document.createElement('div');
        warningDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#ef4444;color:white;text-align:center;padding:12px;font-weight:bold;z-index:99999;font-family:sans-serif;direction:rtl;';
        warningDiv.innerText = 'تنبيه: تم اكتشاف تعارض في قاعدة البيانات المحلية للمتصفح. يرجى إغلاق الصفحة ومحاولة فتح الرابط في علامة تبويب جديدة تماماً أو إعادة تحميل الصفحة يدوياً.';
        document.body.prepend(warningDiv);
      }
    }
  };

  window.addEventListener('error', (event) => {
    if (event.message) {
      checkAndHandleDbError(event.message);
    }
    const errorMsg = event.message || (event.error && event.error.message) || '';
    if (errorMsg) {
      const isChunkError = 
        errorMsg.toLowerCase().includes('failed to fetch dynamically imported module') || 
        errorMsg.toLowerCase().includes('chunkloaderror') || 
        errorMsg.toLowerCase().includes('loading chunk') ||
        errorMsg.toLowerCase().includes('error loading dynamically imported module');
      
      if (isChunkError) {
        const chunkReloadCount = parseInt(sessionStorage.getItem('chunk_error_reload_count') || '0', 10);
        if (chunkReloadCount < 2) {
          sessionStorage.setItem('chunk_error_reload_count', (chunkReloadCount + 1).toString());
          console.warn('Dynamic import load error caught. Forcing application update-reload...');
          window.location.reload();
        }
      }
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason) {
      const msg = typeof event.reason === 'string' ? event.reason : (event.reason.message || '');
      checkAndHandleDbError(msg);

      const isChunkError = 
        msg.toLowerCase().includes('failed to fetch dynamically imported module') || 
        msg.toLowerCase().includes('chunkloaderror') || 
        msg.toLowerCase().includes('loading chunk') ||
        msg.toLowerCase().includes('error loading dynamically imported module');

      if (isChunkError) {
        const chunkReloadCount = parseInt(sessionStorage.getItem('chunk_error_reload_count') || '0', 10);
        if (chunkReloadCount < 2) {
          sessionStorage.setItem('chunk_error_reload_count', (chunkReloadCount + 1).toString());
          console.warn('Dynamic import rejection caught. Forcing application update-reload...');
          window.location.reload();
        }
      }

      if (
        event.reason === 'WebSocket closed without opened.' ||
        msg.includes('WebSocket')
      ) {
        event.preventDefault();
        console.warn('Caught and suppressed benign Vite HMR WebSocket error.');
      }
    }
  });
}

import { SystemConfigProvider } from './lib/SystemConfigContext.tsx';
import {
  getServiceWorkerUrl,
  SW_BUILD_VERSION,
  installChunkLoadRecovery,
} from './lib/serviceWorkerRegistration';
import { initPwaInstallCapture, applyPwaStandaloneBodyClass } from './lib/pwaUtils';

import { getDrawerPortalNode } from './lib/drawerPortal';

initPwaInstallCapture();
applyPwaStandaloneBodyClass();
installChunkLoadRecovery();

if (typeof document !== 'undefined') {
  getDrawerPortalNode();
}

createRoot(document.getElementById('root')!).render(
  <SystemConfigProvider>
    <App />
  </SystemConfigProvider>
);

// PWA Service Worker Registration with strict cache-busting & update-forcing for mobile/iPad compatibility
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const buildVersion = SW_BUILD_VERSION;
    navigator.serviceWorker.register(getServiceWorkerUrl())
      .then((registration) => {
        console.log('Schoolix PWA ServiceWorker successfully registered with scope: ', registration.scope);

        registration.update();

        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker || !navigator.serviceWorker.controller) return;
          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state !== 'activated') return;
            const reloadKey = `schoolix_sw_reload_${buildVersion}`;
            if (sessionStorage.getItem(reloadKey)) return;
            sessionStorage.setItem(reloadKey, '1');
            console.log('New Schoolix service worker activated — reloading once to apply shell cache.');
            window.location.reload();
          });
        });
      })
      .catch((error) => {
        console.error('Schoolix PWA ServiceWorker registration failed: ', error);
        console.warn(
          '[SW] If running in Android WebView with server.url, service worker support depends on WebView version — open online once to precache the app shell.',
        );
      });
  });
}

