import { toast } from 'react-hot-toast';

export const QUOTA_EXHAUSTED_MESSAGE_AR =
  'تم استهلاك حد قاعدة البيانات اليومي. يرجى المحاولة لاحقاً أو ترقية قاعدة البيانات.';

const QUOTA_RESUME_STORAGE_KEY = 'schoolix_quota_resume_at';
const QUOTA_PAUSE_MS = 60 * 60 * 1000;

let quotaPausedUntilMs = 0;
let lastQuotaToastAtMs = 0;

export function isResourceExhaustedError(error: unknown): boolean {
  const err = error as { code?: string; message?: string };
  const code = String(err?.code ?? '').toLowerCase();
  const msg = String(err?.message ?? error ?? '').toLowerCase();
  return (
    code === 'resource-exhausted' ||
    msg.includes('resource-exhausted') ||
    msg.includes('quota exceeded')
  );
}

function readStoredQuotaResumeAt(): number {
  if (typeof localStorage === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(QUOTA_RESUME_STORAGE_KEY);
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

export function markQuotaExhausted(source: string): number {
  const resumeAt = Date.now() + QUOTA_PAUSE_MS;
  quotaPausedUntilMs = resumeAt;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(QUOTA_RESUME_STORAGE_KEY, String(resumeAt));
    } catch {
      /* ignore */
    }
  }
  console.error('[Quota] RESOURCE_EXHAUSTED', { source, resumeAt });
  return resumeAt;
}

export function isQuotaWritePaused(): boolean {
  const now = Date.now();
  if (quotaPausedUntilMs > now) return true;
  const stored = readStoredQuotaResumeAt();
  if (stored > now) {
    quotaPausedUntilMs = stored;
    return true;
  }
  return false;
}

export function getQuotaResumeAtMs(): number {
  return Math.max(quotaPausedUntilMs, readStoredQuotaResumeAt());
}

export function notifyQuotaExhaustedIfNeeded(): void {
  const now = Date.now();
  if (now - lastQuotaToastAtMs < 30_000) return;
  lastQuotaToastAtMs = now;
  toast.error(QUOTA_EXHAUSTED_MESSAGE_AR, { id: 'firestore-quota-exhausted' });
}

export function logWriteSkippedDuplicate(
  source: string,
  detail?: Record<string, unknown>,
): void {
  console.info('[Quota] WRITE_SKIPPED_DUPLICATE', { source, ...detail });
}

export function shouldThrottleWrite(key: string, ttlMs: number): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    if (Date.now() - ts < ttlMs) {
      logWriteSkippedDuplicate('throttle', { key });
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function markWriteThrottled(key: string): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function handleResourceExhausted(source: string, notify = true): void {
  markQuotaExhausted(source);
  if (notify) {
    notifyQuotaExhaustedIfNeeded();
  }
}
