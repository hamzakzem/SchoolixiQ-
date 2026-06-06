import { getDocs, Query, DocumentData, QuerySnapshot } from 'firebase/firestore';
import { captureMessage } from './sentryWrapper';
import { db, auth } from './firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { normalizeError } from './AppError';

export async function monitoredGetDocs<T = DocumentData>(
  q: Query<T>, 
  contextName: string
): Promise<QuerySnapshot<T>> {
  const startTime = performance.now();
  
  try {
    const snapshot = await getDocs(q);
    const duration = performance.now() - startTime;
    const documentCount = snapshot.empty ? 0 : snapshot.docs.length;

    // Log slow queries (> 1s)
    if (duration > 1000) {
      console.warn(`[SLOW QUERY] ${contextName} took ${Math.round(duration)}ms and returned ${documentCount} docs`);
      captureMessage('Slow Firestore Query', {
        level: 'warning',
        extra: { contextName, durationMs: duration, count: documentCount }
      });
      
      // We can also store this in a 'diagnostics' collection for the Analytics Dashboard
      if (auth.currentUser) {
        addDoc(collection(db, 'system_diagnostics'), {
          type: 'slow_query',
          context: contextName,
          durationMs: duration,
          documentCount,
          userId: auth.currentUser.uid,
          timestamp: serverTimestamp()
        }).catch(e => console.error('Failed to log diagnostic', e));
      }
    }

    // Log expensive queries (> 100 documents)
    if (documentCount > 100) {
      console.warn(`[EXPENSIVE QUERY] ${contextName} returned ${documentCount} docs in ${Math.round(duration)}ms`);
      captureMessage('Expensive Firestore Query', {
        level: 'warning',
        extra: { contextName, durationMs: duration, count: documentCount }
      });
      
      if (documentCount > 200 && auth.currentUser) {
        addDoc(collection(db, 'system_diagnostics'), {
          type: 'expensive_query',
          context: contextName,
          durationMs: duration,
          documentCount,
          userId: auth.currentUser.uid,
          timestamp: serverTimestamp()
        }).catch(e => console.error('Failed to log diagnostic', e));
      }
    }
    
    // Usage tracking - log session reads
    let sessionReads = parseInt(sessionStorage.getItem('sessionReadCount') || '0');
    sessionReads += documentCount;
    sessionStorage.setItem('sessionReadCount', sessionReads.toString());

    return snapshot;
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`[QUERY FAILED] ${contextName} failed after ${Math.round(duration)}ms`, error);
    throw normalizeError(error, `Query failed: ${contextName}`);
  }
}
