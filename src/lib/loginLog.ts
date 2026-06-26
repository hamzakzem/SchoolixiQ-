import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { retentionField } from './dataRetention';
import { isLogoutInProgress } from './logoutGuard';
import {
  handleResourceExhausted,
  isQuotaWritePaused,
  isResourceExhaustedError,
  markWriteThrottled,
  shouldThrottleWrite,
} from './firestoreQuota';

const LOGIN_LOG_THROTTLE_MS = 6 * 60 * 60 * 1000;

function summarizeUserAgent(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/windows/i.test(ua)) return 'Windows';
  if (/macintosh|mac os/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua)) return 'Linux';
  return ua.slice(0, 80);
}

export type LoginLogEvent = 'login' | 'logout';

export async function writeLoginLog(params: {
  userId: string;
  role: string;
  schoolId?: string;
  event: LoginLogEvent;
  email?: string | null;
}): Promise<void> {
  if (!auth.currentUser) {
    return;
  }
  if (isQuotaWritePaused()) {
    return;
  }

  const throttleKey = `schoolix_login_log_${params.userId}_${params.event}`;
  if (shouldThrottleWrite(throttleKey, LOGIN_LOG_THROTTLE_MS)) {
    return;
  }

  try {
    await addDoc(collection(db, 'login_logs'), {
      userId: params.userId,
      role: params.role || 'unknown',
      schoolId: params.schoolId || '',
      event: params.event,
      email: params.email ? String(params.email).slice(0, 120) : '',
      userAgentSummary: summarizeUserAgent(),
      createdAt: serverTimestamp(),
      ...retentionField('login_logs'),
    });
    markWriteThrottled(throttleKey);
  } catch (error) {
    const err = error as { code?: string; message?: string };
    if (err?.code === 'permission-denied' || isLogoutInProgress()) {
      return;
    }
    if (isResourceExhaustedError(error)) {
      handleResourceExhausted('login_log');
      return;
    }
    console.warn('[loginLog] Failed to write login log:', error);
  }
}
