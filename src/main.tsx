import {StrictMode, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import * as Sentry from "@sentry/react";

if (import.meta.env.VITE_SENTRY_DSN) {
  let dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn.startsWith('http://') && !dsn.startsWith('https://')) {
    dsn = `https://${dsn}`;
  }

  try {
    Sentry.init({
      dsn: dsn,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
      tracesSampleRate: 1.0,
      tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
  } catch (error) {
    console.error("Failed to initialize Sentry:", error);
  }
} else {
  console.warn("Sentry error tracking is disabled: VITE_SENTRY_DSN is not set.");
}

// Handle Vit's HMR websocket errors which are benign in this environment
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && (
      event.reason === 'WebSocket closed without opened.' ||
      (typeof event.reason === 'string' && event.reason.includes('WebSocket')) ||
      (event.reason.message && event.reason.message.includes('WebSocket'))
    )) {
      event.preventDefault();
      console.warn('Caught and suppressed benign Vite HMR WebSocket error.');
    }
  });
}

import { SystemConfigProvider } from './lib/SystemConfigContext.tsx';

createRoot(document.getElementById('root')!).render(
  <SystemConfigProvider>
    <App />
  </SystemConfigProvider>
);

// PWA Service Worker Registration with strict cache-busting & update-forcing for mobile/iPad compatibility
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    // Append a unique build version query to force update detection on all mobile/tablet browsers
    const buildVersion = '2026-05-25-v4';
    navigator.serviceWorker.register(`/sw.js?build=${buildVersion}`)
      .then((registration) => {
        console.log('Schoolix PWA ServiceWorker successfully registered with scope: ', registration.scope);
        
        // Force checking for updates immediately on load
        registration.update();

        // Listen for new service worker installations and reload automatically to apply changes
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'activated') {
                console.log('New Schoolix version activated! Reloading application to apply brand updates...');
                window.location.reload();
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('Schoolix PWA ServiceWorker registration failed: ', error);
      });
  });
}

