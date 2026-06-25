import { useEffect, useRef } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { UserRole } from '../types';
import {
  handleResourceExhausted,
  isQuotaWritePaused,
  isResourceExhaustedError,
} from './firestoreQuota';
import {
  PRESENCE_HEARTBEAT_MS,
  PRESENCE_TAB_LOCK_MS,
  type SchoolPresenceRecord,
} from './schoolPresence';

const TAB_ID =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2)}`;

function lockKey(schoolId: string) {
  return `schoolix_presence_lock_${schoolId}`;
}

function canSendHeartbeat(schoolId: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = localStorage.getItem(lockKey(schoolId));
    const now = Date.now();
    if (!raw) {
      localStorage.setItem(
        lockKey(schoolId),
        JSON.stringify({ tabId: TAB_ID, ts: now }),
      );
      return true;
    }
    const parsed = JSON.parse(raw) as { tabId?: string; ts?: number };
    if (
      parsed.tabId === TAB_ID ||
      !parsed.ts ||
      now - parsed.ts >= PRESENCE_TAB_LOCK_MS
    ) {
      localStorage.setItem(
        lockKey(schoolId),
        JSON.stringify({ tabId: TAB_ID, ts: now }),
      );
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

function releaseTabLock(schoolId: string) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(lockKey(schoolId));
    if (!raw) return;
    const parsed = JSON.parse(raw) as { tabId?: string };
    if (parsed.tabId === TAB_ID) {
      localStorage.removeItem(lockKey(schoolId));
    }
  } catch {
    /* ignore */
  }
}

async function writeSchoolHeartbeat(
  schoolId: string,
  userId: string,
  userName: string,
  role: string,
  touchSeenOnly = false,
): Promise<void> {
  if (!canSendHeartbeat(schoolId)) return;
  if (isQuotaWritePaused()) return;

  const payload: Partial<SchoolPresenceRecord> & {
    schoolId: string;
    lastHeartbeatAt?: ReturnType<typeof serverTimestamp>;
    lastSeenAt?: ReturnType<typeof serverTimestamp>;
    updatedAt: ReturnType<typeof serverTimestamp>;
    online?: boolean;
  } = {
    schoolId,
    updatedAt: serverTimestamp(),
  };

  if (touchSeenOnly) {
    payload.lastSeenAt = serverTimestamp();
    payload.online = false;
  } else {
    payload.online = true;
    payload.activeUsers = 1;
    payload.lastHeartbeatAt = serverTimestamp();
    payload.lastSeenAt = serverTimestamp();
    payload.lastActiveUserId = userId;
    payload.lastActiveUserName = userName;
    payload.lastActiveRole = role;
  }

  try {
    await setDoc(doc(db, 'school_presence', schoolId), payload, { merge: true });
  } catch (error) {
    if (isResourceExhaustedError(error)) {
      handleResourceExhausted('school_presence');
    }
    throw error;
  }
}

/**
 * Heartbeat for school-scoped users only. Super Admin and users without schoolId are excluded.
 */
export function useSchoolPresence() {
  const { user, profile } = useAuth();
  const schoolId = profile?.schoolId?.trim() || '';
  const role = profile?.role;
  const userName = profile?.name?.trim() || '';
  const intervalRef = useRef<number | null>(null);
  const lastBeatRef = useRef(0);

  useEffect(() => {
    const isEligible =
      Boolean(user?.uid) &&
      Boolean(schoolId) &&
      role !== UserRole.SUPERADMIN;

    if (!isEligible) return;

    let cancelled = false;

    const beat = async (force = false) => {
      if (cancelled || !user?.uid) return;
      const now = Date.now();
      if (!force && now - lastBeatRef.current < PRESENCE_HEARTBEAT_MS - 2000) {
        return;
      }
      try {
        await writeSchoolHeartbeat(schoolId, user.uid, userName, String(role), false);
        lastBeatRef.current = Date.now();
      } catch (error) {
        if (isResourceExhaustedError(error)) {
          handleResourceExhausted('school_presence');
          if (intervalRef.current != null) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return;
        }
        if (import.meta.env.DEV) {
          console.warn('[SchoolPresence] heartbeat failed:', error);
        }
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void beat(true);
      }
    };

    const onHidden = () => {
      if (document.visibilityState !== 'hidden') return;
      void writeSchoolHeartbeat(schoolId, user!.uid, userName, String(role), true).catch(
        () => undefined,
      );
    };

    void beat(true);

    intervalRef.current = window.setInterval(() => {
      void beat(false);
    }, PRESENCE_HEARTBEAT_MS);

    document.addEventListener('visibilitychange', onVisible);
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('focus', onVisible);

    return () => {
      cancelled = true;
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', onVisible);
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('focus', onVisible);
      releaseTabLock(schoolId);
    };
  }, [user?.uid, schoolId, role, userName]);
}
