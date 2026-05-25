import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Initialize Analytics conditionally
export const initAnalytics = async () => {
  try {
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
