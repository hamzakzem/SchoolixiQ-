import { Timestamp } from 'firebase/firestore';

/** Retention windows (days) for TTL + scheduled cleanup. */
export const RETENTION_DAYS = {
  notifications: 30,
  system_messages: 90,
  login_logs: 60,
  print_logs: 30,
  tuition_reminder_logs: 60,
  audit_logs: 90,
} as const;

export type RetentionCollection = keyof typeof RETENTION_DAYS;

export function retentionExpiresAtDays(days: number): Timestamp {
  const expires = new Date();
  expires.setUTCDate(expires.getUTCDate() + days);
  return Timestamp.fromDate(expires);
}

export function retentionExpiresAt(collection: RetentionCollection): Timestamp {
  return retentionExpiresAtDays(RETENTION_DAYS[collection]);
}

export function retentionField(collection: RetentionCollection): { expiresAt: Timestamp } {
  return { expiresAt: retentionExpiresAt(collection) };
}

export function isMessageRetentionExempt(data: {
  pinned?: boolean;
  archived?: boolean;
  legalHold?: boolean;
}): boolean {
  return data.pinned === true || data.archived === true || data.legalHold === true;
}

/** Attach expiresAt for chat/system messages unless legally pinned/archived. */
export function withMessageRetentionFields<T extends Record<string, unknown>>(
  data: T,
): T & { expiresAt?: Timestamp } {
  if (isMessageRetentionExempt(data as { pinned?: boolean; archived?: boolean; legalHold?: boolean })) {
    return data;
  }
  return { ...data, ...retentionField('system_messages') };
}
