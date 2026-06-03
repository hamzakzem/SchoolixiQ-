import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager, memoryLocalCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
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

// Avoid persistentMultipleTabManager in iframes to prevent BroadcastChannel/lock assertion errors
const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

// Resilient Local Cache Factory
const getResilientCache = () => {
  if (typeof window === 'undefined') {
    return memoryLocalCache();
  }

  try {
    const hasIndexedDB = 'indexedDB' in window && window.indexedDB !== null;
    if (!hasIndexedDB) {
      console.warn("IndexedDB is not supported on this browser. Falling back to in-memory cache.");
      return memoryLocalCache();
    }

    // Inside iframes (like the AI Studio sandbox), persistent tab managers can conflict with parent frame locks,
    // causing frequent database disconnects. We prioritize super-stable memory cache in nested frames.
    if (isInIframe) {
      console.log("Running inside iframe/preview: Using memoryLocalCache for absolute stability and zero IndexedDB locking issues.");
      return memoryLocalCache();
    }

    // For standalone production builds (e.g. mobile apps / main tabs), single-tab persistent cache works great
    return persistentLocalCache({
      tabManager: persistentSingleTabManager({})
    });
  } catch (error) {
    console.warn("IndexedDB access threw an error. Falling back to in-memory cache:", error);
    return memoryLocalCache();
  }
};

export const db = initializeFirestore(app, {
  localCache: getResilientCache()
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);
export const storage = getStorage(app);

// Disable Performance Monitoring to prevent "Attribute value is invalid" crashes
// when auto-tracing clicks on elements with long Tailwind class strings.
export const perf = null;

