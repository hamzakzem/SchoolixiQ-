import { addDoc, updateDoc, deleteDoc, DocumentReference, CollectionReference, WithFieldValue, UpdateData } from 'firebase/firestore';
import { captureMessage } from './sentryWrapper';
import { handleFirestoreError, OperationType } from './firestore-errors';

// Simple token bucket rate limiter per session
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  
  constructor(private maxTokens: number = 30, private refillRatePerSec: number = 2) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  canConsume(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  private refill() {
    const now = Date.now();
    const elapsedSecs = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsedSecs * this.refillRatePerSec);
    this.lastRefill = now;
  }
}

const writeLimiter = new RateLimiter();

export async function rateLimitedAdd<T = any>(
  ref: CollectionReference<T>, 
  data: WithFieldValue<T>
): Promise<DocumentReference<T>> {
  if (!writeLimiter.canConsume()) {
    captureMessage('Rate limit exceeded (Add)', { level: 'warning' });
    throw new Error('تم تجاوز الحد المسموح للعمليات. يرجى الانتظار قليلاً.');
  }
  return addDoc(ref, data);
}

export async function rateLimitedUpdate<T = { [x: string]: any }>(
  ref: DocumentReference<T>, 
  data: UpdateData<T>
): Promise<void> {
  if (!writeLimiter.canConsume()) {
    captureMessage('Rate limit exceeded (Update)', { level: 'warning' });
    throw new Error('تم تجاوز الحد المسموح للعمليات. يرجى الانتظار قليلاً.');
  }
  return updateDoc(ref, data as any);
}

export async function rateLimitedDelete<T = any>(
  ref: DocumentReference<T>
): Promise<void> {
  if (!writeLimiter.canConsume()) {
    captureMessage('Rate limit exceeded (Delete)', { level: 'warning' });
    throw new Error('تم تجاوز الحد المسموح للعمليات. يرجى الانتظار قليلاً.');
  }
  return deleteDoc(ref);
}

export const UPLOAD_LIMIT_BYTES = 5 * 1024 * 1024; // 5MB Upload limit

export function validateFileSize(file: File) {
  if (file.size > UPLOAD_LIMIT_BYTES) {
    throw new Error(`حجم الملف كبير جداً. الحد المسموح هو 5MB`);
  }
}
