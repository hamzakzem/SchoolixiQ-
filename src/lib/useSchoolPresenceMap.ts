import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, query } from 'firebase/firestore';
import { db } from './firebase';
import type { SchoolPresenceRecord } from './schoolPresence';

export function useSchoolPresenceMap(enabled: boolean) {
  const [presenceMap, setPresenceMap] = useState<
    Record<string, SchoolPresenceRecord>
  >({});

  useEffect(() => {
    if (!enabled) {
      setPresenceMap({});
      return;
    }

    const q = query(collection(db, 'school_presence'), limit(500));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: Record<string, SchoolPresenceRecord> = {};
        snap.docs.forEach((docSnap) => {
          next[docSnap.id] = {
            schoolId: docSnap.id,
            ...(docSnap.data() as Omit<SchoolPresenceRecord, 'schoolId'>),
          };
        });
        setPresenceMap(next);
      },
      (error) => {
        if (import.meta.env.DEV) {
          console.warn('[SchoolPresence] super admin map failed:', error);
        }
      },
    );

    return () => unsub();
  }, [enabled]);

  return presenceMap;
}
