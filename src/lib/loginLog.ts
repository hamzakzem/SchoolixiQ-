import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

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
  try {
    await addDoc(collection(db, 'login_logs'), {
      userId: params.userId,
      role: params.role || 'unknown',
      schoolId: params.schoolId || '',
      event: params.event,
      email: params.email ? String(params.email).slice(0, 120) : '',
      userAgentSummary: summarizeUserAgent(),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn('[loginLog] Failed to write login log:', error);
  }
}
