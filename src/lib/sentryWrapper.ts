let sentryPromise: Promise<typeof import('@sentry/react')> | null = null;

function getSentry() {
  if (!sentryPromise) {
    sentryPromise = import('@sentry/react');
  }
  return sentryPromise;
}

export function initSentry(dsn: string) {
  getSentry().then((Sentry) => {
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
  }).catch((err) => {
    console.warn("Failed to load Sentry for initialization:", err);
  });
}

export function captureException(error: any, hint?: any) {
  getSentry().then((Sentry) => {
    Sentry.captureException(error, hint);
  }).catch(() => {
    console.error("Fallback Uncaught Error:", error, hint);
  });
}

export function captureMessage(message: string, context?: any) {
  getSentry().then((Sentry) => {
    Sentry.captureMessage(message, context);
  }).catch(() => {
    console.warn("Fallback Captured Message:", message, context);
  });
}
