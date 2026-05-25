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

// PWA Service Worker Registration
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Schoolix PWA ServiceWorker successfully registered with scope: ', registration.scope);
      })
      .catch((error) => {
        console.error('Schoolix PWA ServiceWorker registration failed: ', error);
      });
  });
}

