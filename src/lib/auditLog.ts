import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'soft_delete'
  | 'restore'
  | 'permission_change'
  | 'subscription_change'
  | 'dismissal_action'
  | 'login'
  | 'logout'
  | string;

export type AuditLogInput = {
  schoolId: string;
  actorId: string;
  actorRole: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  beforeSummary?: string;
  afterSummary?: string;
  details?: Record<string, unknown>;
};

const SENSITIVE_KEYS = /password|secret|token|private.?key|credential/i;

function sanitizeDetails(details?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!details) return undefined;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    if (SENSITIVE_KEYS.test(key)) continue;
    if (typeof value === 'string' && value.length > 500) {
      clean[key] = `${value.slice(0, 500)}…`;
    } else {
      clean[key] = value;
    }
  }
  return Object.keys(clean).length ? clean : undefined;
}

/** Best-effort client audit log — never throws; never logs secrets. */
export async function logAction(input: AuditLogInput): Promise<void> {
  try {
    const details = sanitizeDetails(input.details);
    await addDoc(collection(db, 'audit_logs'), {
      schoolId: input.schoolId || 'system',
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId || '',
      beforeSummary: input.beforeSummary || '',
      afterSummary: input.afterSummary || '',
      createdAt: serverTimestamp(),
      // Legacy fields for Super Admin viewer compatibility with server logs
      uid: input.actorId,
      performedBy: input.actorId,
      timestamp: serverTimestamp(),
      details: details || {
        beforeSummary: input.beforeSummary || '',
        afterSummary: input.afterSummary || '',
        entityType: input.entityType,
        entityId: input.entityId || '',
      },
    });
  } catch (error) {
    console.warn('[auditLog] Failed to write audit entry:', error);
  }
}
