/**
 * Snapshot layer — fast read path; events remain source of truth.
 * dismissalSnapshot is a materialized view updated after every event.
 */

import {
  deriveState,
  normalizeState,
  makeEvent,
  appendEvents,
  EVENT_TYPES,
  STATES,
} from './dismissalStateMachine.mjs';

export const SNAPSHOT_COL = 'dismissal_snapshots';
export const ARCHIVE_FIELD = 'dismissalEventsArchive';
export const COMPACTION_TAIL_EVENTS = 8;

export function lastEventId(events) {
  if (!Array.isArray(events) || !events.length) return null;
  return events[events.length - 1]?.eventId || null;
}

/** Build snapshot materialized view from event log. */
export function buildSnapshot(requestId, events) {
  const list = Array.isArray(events) ? events : [];
  const derivedStatus = deriveState(list, STATES.REQUESTED);
  return {
    requestId: String(requestId),
    derivedStatus,
    lastEventId: lastEventId(list),
    eventCount: list.length,
    updatedAt: new Date(),
  };
}

/** Snapshot-first resolution; deriveState only when snapshot missing or stale. */
export function resolveEffectiveState(data) {
  const events = Array.isArray(data?.dismissalEvents) ? data.dismissalEvents : [];
  const snap = data?.dismissalSnapshot;

  if (snap?.derivedStatus && snap?.lastEventId && events.length) {
    const tailId = lastEventId(events);
    if (tailId && tailId === snap.lastEventId) {
      return normalizeState(snap.derivedStatus);
    }
  }

  if (snap?.derivedStatus && !events.length) {
    return normalizeState(snap.derivedStatus);
  }

  return deriveState(events, STATES.REQUESTED);
}

/** Detect drift between cached status/snapshot and event-derived truth. */
export function detectDrift(data) {
  const events = Array.isArray(data?.dismissalEvents) ? data.dismissalEvents : [];
  const derived = deriveState(events, STATES.REQUESTED);
  const cachedStatus = normalizeState(data?.status);
  const snapStatus = data?.dismissalSnapshot?.derivedStatus
    ? normalizeState(data.dismissalSnapshot.derivedStatus)
    : null;

  const statusDrift = cachedStatus !== derived;
  const snapshotDrift = snapStatus !== null && snapStatus !== derived;
  const snapshotStale =
    snapStatus !== null &&
    events.length > 0 &&
    data.dismissalSnapshot?.lastEventId !== lastEventId(events);

  return {
    derived,
    cachedStatus,
    snapStatus,
    drift: statusDrift || snapshotDrift || snapshotStale,
    statusDrift,
    snapshotDrift,
    snapshotStale,
  };
}

export function makeReconcileEvent(requestId, derived, wasStored, wasSnap) {
  return makeEvent(requestId, EVENT_TYPES.SYSTEM_RECONCILE, 'system', {
    byName: 'System',
    idempotencyKey: `reconcile:${derived}:${wasStored}:${Date.now()}`,
    derived,
    wasStored,
    wasSnap,
  });
}

/** Patch fields after any event append — keeps cache + snapshot in sync. */
export function materializeFromEvents(requestId, events, extra = {}) {
  const derived = deriveState(events, STATES.REQUESTED);
  const snapshot = buildSnapshot(requestId, events);
  return {
    status: derived,
    dismissalSnapshot: snapshot,
    dismissalEvents: events,
    statusDrift: false,
    ...extra,
  };
}

export async function writeSnapshotDoc(db, requestId, snapshot, schoolId) {
  const ref = db.collection(SNAPSHOT_COL).doc(requestId);
  await ref.set(
    {
      ...snapshot,
      schoolId: schoolId || null,
    },
    { merge: true },
  );
}

export function compactEventLog(events, archiveBeforeDays = 30) {
  const list = Array.isArray(events) ? [...events] : [];
  if (list.length <= COMPACTION_TAIL_EVENTS) {
    return { kept: list, archived: [], didCompact: false };
  }

  const cutoff = Date.now() - archiveBeforeDays * 24 * 60 * 60 * 1000;
  const isOld = (ev) => {
    const ts = ev?.timestamp?.toDate?.() || ev?.timestamp;
    if (!ts) return false;
    const ms = ts instanceof Date ? ts.getTime() : new Date(ts).getTime();
    return ms < cutoff;
  };

  const terminal = deriveState(list);
  const isTerminal = ['DISMISSED', 'REJECTED', 'EXPIRED'].includes(terminal);
  if (!isTerminal) {
    return { kept: list, archived: [], didCompact: false };
  }

  const oldEvents = list.filter(isOld);
  if (oldEvents.length === 0) {
    return { kept: list, archived: [], didCompact: false };
  }

  const tail = list.slice(-COMPACTION_TAIL_EVENTS);
  const archived = list.slice(0, list.length - tail.length);
  return { kept: tail, archived, didCompact: archived.length > 0 };
}
