/** Enterprise dismissal workflow — events are the single source of truth */

import crypto from 'crypto';

export const STATES = {
  REQUESTED: 'REQUESTED',
  GUARD_REVIEWING: 'GUARD_REVIEWING',
  GUARD_VERIFIED: 'GUARD_VERIFIED',
  MANAGER_REVIEWING: 'MANAGER_REVIEWING',
  APPROVED: 'APPROVED',
  DISMISSED: 'DISMISSED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
};

export const EVENT_TYPES = {
  REQUEST_CREATED: 'REQUEST_CREATED',
  GUARD_VERIFIED: 'GUARD_VERIFIED',
  GUARD_REJECTED: 'GUARD_REJECTED',
  MANAGER_APPROVED: 'MANAGER_APPROVED',
  MANAGER_REJECTED: 'MANAGER_REJECTED',
  DISMISSED: 'DISMISSED',
  SYSTEM_RECONCILE: 'SYSTEM_RECONCILE',
};

/** System/meta events — do not change workflow state when replayed. */
export const META_EVENT_TYPES = new Set([EVENT_TYPES.SYSTEM_RECONCILE]);

export const ACTIVE_STATES = [
  STATES.REQUESTED,
  STATES.GUARD_REVIEWING,
  STATES.GUARD_VERIFIED,
  STATES.MANAGER_REVIEWING,
  STATES.APPROVED,
];

export const TERMINAL_STATES = [STATES.DISMISSED, STATES.REJECTED, STATES.EXPIRED];

export const GUARD_QUEUE = [STATES.REQUESTED];
export const MANAGER_QUEUE = [STATES.GUARD_VERIFIED];

const LEGACY_MAP = {
  waiting: STATES.REQUESTED,
  called: STATES.REQUESTED,
  pending_guard_review: STATES.REQUESTED,
  ready: STATES.GUARD_VERIFIED,
  guard_verified: STATES.GUARD_VERIFIED,
  guard_rejected: STATES.REJECTED,
  manager_rejected: STATES.REJECTED,
  cancelled: STATES.REJECTED,
  manager_approved: STATES.DISMISSED,
  completed: STATES.DISMISSED,
  expired: STATES.EXPIRED,
};

export const LOCK_TTL_MS = 2 * 60 * 1000;

/** Derive workflow state purely from event log (source of truth). */
export function deriveState(events, fallback = STATES.REQUESTED) {
  if (!Array.isArray(events) || !events.length) return fallback;
  let state = STATES.REQUESTED;
  for (const ev of events) {
    if (META_EVENT_TYPES.has(ev?.type)) continue;
    switch (ev?.type) {
      case EVENT_TYPES.REQUEST_CREATED:
        state = STATES.REQUESTED;
        break;
      case EVENT_TYPES.GUARD_VERIFIED:
        state = STATES.GUARD_VERIFIED;
        break;
      case EVENT_TYPES.GUARD_REJECTED:
        state = STATES.REJECTED;
        break;
      case EVENT_TYPES.MANAGER_APPROVED:
      case EVENT_TYPES.DISMISSED:
        state = STATES.DISMISSED;
        break;
      case EVENT_TYPES.MANAGER_REJECTED:
        state = STATES.REJECTED;
        break;
      default:
        break;
    }
  }
  return state;
}

export function normalizeState(raw) {
  const s = String(raw || '');
  if (LEGACY_MAP[s]) return LEGACY_MAP[s];
  if (Object.values(STATES).includes(s)) return s;
  return STATES.REQUESTED;
}

/** Compare cached status field vs event-derived state. */
export function reconcileState(data) {
  const events = Array.isArray(data?.dismissalEvents) ? data.dismissalEvents : [];
  const derived = deriveState(events, normalizeState(data?.status));
  const stored = normalizeState(data?.status);
  return {
    derived,
    stored,
    drift: derived !== stored,
  };
}

export function makeEventId(requestId, type, idempotencyKey) {
  const seed = `${String(requestId)}:${String(type)}:${String(idempotencyKey || '')}`;
  return crypto.createHash('sha256').update(seed).digest('hex').slice(0, 20);
}

export function makeEvent(requestId, type, by, metadata = {}) {
  const idempotencyKey =
    metadata.idempotencyKey ||
    metadata.clientIdempotencyKey ||
    `${type}:${Date.now()}`;
  const eventId = makeEventId(requestId, type, idempotencyKey);
  const meta = { ...metadata };
  delete meta.idempotencyKey;
  delete meta.clientIdempotencyKey;

  return {
    eventId,
    type,
    by: String(by || ''),
    byName: metadata.byName ? String(metadata.byName) : undefined,
    timestamp: new Date(),
    metadata:
      metadata.note || metadata.reason || Object.keys(meta).length
        ? { note: metadata.note, reason: metadata.reason, ...meta }
        : undefined,
  };
}

export function appendEvents(existing, ...events) {
  const list = Array.isArray(existing) ? [...existing] : [];
  for (const ev of events) {
    if (!ev?.eventId || !list.some((e) => e?.eventId === ev.eventId)) {
      list.push(ev);
    }
  }
  return list;
}

export function hasEvent(events, type) {
  return Array.isArray(events) && events.some((e) => e?.type === type);
}

export function hasEventId(events, eventId) {
  return Array.isArray(events) && events.some((e) => e?.eventId === eventId);
}

export function lockExpired(data) {
  if (!data?.isProcessing) return true;
  const started = data.processingStartedAt?.toDate?.() || data.processingStartedAt;
  if (!started) return true;
  const ms = started instanceof Date ? started.getTime() : new Date(started).getTime();
  return Date.now() - ms > LOCK_TTL_MS;
}

export function assertCanAcquireLock(data, uid) {
  if (!data?.isProcessing) return;
  if (data.processingBy === uid) return;
  if (lockExpired(data)) return;
  const err = new Error('الطلب قيد المعالجة من مستخدم آخر');
  err.code = 'LOCKED';
  err.status = 409;
  throw err;
}

export function assertTransition(from, to, allowedFrom) {
  const state = normalizeState(from);
  if (!allowedFrom.includes(state)) {
    const err = new Error(`انتقال غير مسموح: ${state} → ${to}`);
    err.code = 'INVALID_TRANSITION';
    err.status = 400;
    throw err;
  }
  if (TERMINAL_STATES.includes(state)) {
    const err = new Error('الطلب مغلق ولا يمكن تعديله');
    err.code = 'REQUEST_CLOSED';
    err.status = 400;
    throw err;
  }
}

export function duplicateEventError() {
  const err = new Error('تم تنفيذ هذا الإجراء مسبقاً');
  err.code = 'DUPLICATE_EVENT';
  err.status = 409;
  err.idempotent = true;
  return err;
}

export function assertIdempotent(events, eventType, targetState, currentState, eventId) {
  if (eventId && hasEventId(events, eventId)) {
    throw duplicateEventError();
  }
  if (normalizeState(currentState) === targetState) {
    const err = new Error('الطلب في هذه الحالة بالفعل');
    err.code = 'ALREADY_IN_STATE';
    err.status = 409;
    err.idempotent = true;
    throw err;
  }
  if (hasEvent(events, eventType)) {
    const err = new Error('تم تنفيذ هذا الإجراء مسبقاً');
    err.code = 'DUPLICATE_EVENT';
    err.status = 409;
    err.idempotent = true;
    throw err;
  }
}

export const TRANSITIONS = {
  guardVerify: {
    allowedFrom: [STATES.REQUESTED, STATES.GUARD_REVIEWING],
    reviewState: STATES.GUARD_REVIEWING,
    targetState: STATES.GUARD_VERIFIED,
    eventType: EVENT_TYPES.GUARD_VERIFIED,
  },
  guardReject: {
    allowedFrom: [STATES.REQUESTED, STATES.GUARD_REVIEWING],
    reviewState: STATES.GUARD_REVIEWING,
    targetState: STATES.REJECTED,
    eventType: EVENT_TYPES.GUARD_REJECTED,
  },
  managerApprove: {
    allowedFrom: [STATES.GUARD_VERIFIED, STATES.MANAGER_REVIEWING],
    reviewState: STATES.MANAGER_REVIEWING,
    targetState: STATES.DISMISSED,
    eventType: EVENT_TYPES.MANAGER_APPROVED,
    alsoEvents: [EVENT_TYPES.DISMISSED],
  },
  managerReject: {
    allowedFrom: [STATES.GUARD_VERIFIED, STATES.MANAGER_REVIEWING],
    reviewState: STATES.MANAGER_REVIEWING,
    targetState: STATES.REJECTED,
    eventType: EVENT_TYPES.MANAGER_REJECTED,
  },
};
