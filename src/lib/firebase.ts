import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator, memoryLocalCache, doc, getDocFromServer, setLogLevel } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';
import firebaseConfig from '../../firebase-applet-config.json';

// Global error interrupter for unhandled IndexedDB / Connection Lost errors
if (typeof window !== 'undefined') {
  const isIndexedDbError = (msg: string) => {
    if (!msg) return false;
    const lower = msg.toLowerCase();
    return lower.includes('indexed database') || 
           lower.includes('indexeddb') || 
           lower.includes('connection to indexed database') ||
           lower.includes('lost connection');
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason) {
      const msg = typeof reason === 'string' ? reason : (reason.message || reason.toString() || '');
      if (isIndexedDbError(msg)) {
        console.warn('Suppressing unhandled IndexedDB rejection event:', msg);
        event.preventDefault();
        event.stopPropagation();
      }
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (isIndexedDbError(msg)) {
      console.warn('Suppressing standard IndexedDB error event:', msg);
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

const app = initializeApp(firebaseConfig);

// Firestore keeps its local cache in memory. The persistent (IndexedDB) cache reuses
// the same internal target id when a query is listened to again, and a quick
// unlisten → re-listen then trips an SDK assertion ("INTERNAL ASSERTION FAILED:
// Unexpected state", ids ca9/b815) that kills Firestore until the page reloads —
// seen on iPhone in the school messaging screen. Offline support does not depend on
// it: the app keeps its own IndexedDB queue and data cache (src/lib/offline).
const getResilientCache = () => memoryLocalCache();

const firestoreDatabaseId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
const useDefaultFirestore =
  !firestoreDatabaseId || firestoreDatabaseId === '(default)';

export const db = useDefaultFirestore
  ? initializeFirestore(app, { localCache: getResilientCache() })
  : initializeFirestore(app, { localCache: getResilientCache() }, firestoreDatabaseId);

export const auth = getAuth(app);
export const storage = getStorage(
  app,
  firebaseConfig.storageBucket
    ? `gs://${firebaseConfig.storageBucket}`
    : undefined,
);

// Local end-to-end testing only (VITE_USE_FIREBASE_EMULATORS=1 at build time).
// Never set in production builds, so this block is dropped from the bundle.
if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === '1') {
  const host = String(import.meta.env.VITE_FIREBASE_EMULATOR_HOST || '127.0.0.1');
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8085);
  // Emulator builds only: localStorage.fs_debug = '1' turns on the SDK's watch-stream log.
  if (typeof localStorage !== 'undefined' && localStorage.getItem('fs_debug') === '1') setLogLevel('debug');
  connectStorageEmulator(storage, host, 9199);
}

// Initialize Analytics conditionally
export const initAnalytics = async () => {
  try {
    // Without a measurement ID Analytics only loads gtag.js?id=undefined.
    if (!firebaseConfig.measurementId) return null;
    const supported = await isSupported();
    if (supported) {
      return getAnalytics(app);
    }
    return null;
  } catch (error) {
    console.error("Firebase Analytics initialization failed:", error);
    return null;
  }
};
export const analyticsPromise = initAnalytics();

// Disable Performance Monitoring to prevent "Attribute value is invalid" crashes
// when auto-tracing clicks on elements with long Tailwind class strings.
export const perf = null;

async function testConnection() {
  try {
    const startTime = performance.now();
    await getDocFromServer(doc(db, 'test', 'connection'));
    const endTime = performance.now();
    if (endTime - startTime > 3000) {
      console.warn(`Slow Firestore connection: ${Math.round(endTime - startTime)}ms`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    } else if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
      // Ignore permission denied, it still proves we reached the server
      return;
    } else {
      console.error("Firestore test connection error:", error);
    }
  }
}
// testConnection();
