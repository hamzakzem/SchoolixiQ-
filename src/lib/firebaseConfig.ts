import baseConfig from '../../firebase-applet-config.json';

/**
 * The Firebase web config this build/page talks to.
 *
 * The committed JSON names the PRODUCTION project. A preview (Hostinger/Cloudflare/…) may bring its own separate project by
 * setting ALL of the VITE_FIREBASE_* variables at build time; a partial set is ignored. A preview page that would still talk to the
 * production project is BLOCKED: it gets an inert config (no network calls reach production) and `previewBlocked` is true so
 * the UI shows an explicit message instead of silently using production.
 */
export const PRODUCTION_PROJECT_ID = 'yala-safari-iq';
export const PREVIEW_HOST_RE = /\.(hostingersite\.com|pages\.dev|netlify\.app|vercel\.app|web\.app|firebaseapp\.com|run\.app)$/i;

type WebConfig = typeof baseConfig & { firestoreDatabaseId?: string };

const env = import.meta.env as Record<string, string | undefined>;
const overrideKeys = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_STORAGE_BUCKET', 'VITE_FIREBASE_MESSAGING_SENDER_ID', 'VITE_FIREBASE_APP_ID'] as const;
const hasFullOverride = overrideKeys.every((k) => Boolean(env[k]));

const configured: WebConfig = hasFullOverride
  ? {
      ...(baseConfig as WebConfig),
      apiKey: env.VITE_FIREBASE_API_KEY!,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN!,
      projectId: env.VITE_FIREBASE_PROJECT_ID!,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET!,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID!,
      appId: env.VITE_FIREBASE_APP_ID!,
      measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || '',
      firestoreDatabaseId: env.VITE_FIREBASE_DATABASE_ID || '(default)',
    }
  : (baseConfig as WebConfig);

const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
export const isPreviewHost = PREVIEW_HOST_RE.test(hostname);
const emulatorBuild = env.VITE_USE_FIREBASE_EMULATORS === '1';

/** true when a preview page would use the production Firebase project. */
export const previewBlocked = isPreviewHost && !emulatorBuild && configured.projectId === PRODUCTION_PROJECT_ID;
export const usingSeparateProject = configured.projectId !== PRODUCTION_PROJECT_ID;

const inert: WebConfig = {
  ...(configured as WebConfig),
  apiKey: 'preview-blocked',
  authDomain: 'preview-blocked.invalid',
  projectId: 'preview-blocked-no-production',
  storageBucket: 'preview-blocked-no-production.invalid',
  messagingSenderId: '0',
  appId: '1:0:web:preview-blocked',
  measurementId: '',
};

const firebaseConfig: WebConfig = previewBlocked ? inert : configured;
export default firebaseConfig;
