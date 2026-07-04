/**
 * Recovery worker — self-healing: locks, drift repair, snapshot rebuild.
 * POST /api/internal/dismissal-recovery/run
 */

import {
  deriveState,
  lockExpired,
  LOCK_TTL_MS,
  appendEvents,
  EVENT_TYPES,
} from './dismissalStateMachine.mjs';
import {
  buildSnapshot,
  detectDrift,
  materializeFromEvents,
  makeReconcileEvent,
  writeSnapshotDoc,
} from './dismissalSnapshot.mjs';

const DISMISSAL_COL = 'dismissal_requests';

function lockAge(data) {
  const started = data.processingStartedAt?.toDate?.() || data.processingStartedAt;
  if (!started) return null;
  const ms = started instanceof Date ? started.getTime() : new Date(started).getTime();
  return Date.now() - ms;
}

/** Repair drift: derive from events, update cache + snapshot, append SYSTEM_RECONCILE. */
async function repairDrift(db, docRef, data, reason = 'drift_detected') {
  const events = Array.isArray(data.dismissalEvents) ? [...data.dismissalEvents] : [];
  const { derived, cachedStatus, snapStatus, drift } = detectDrift(data);
  if (!drift && data.dismissalSnapshot?.lastEventId) {
    return { action: 'noop', derived };
  }

  const hasReconcile = events.some((e) => e.type === EVENT_TYPES.SYSTEM_RECONCILE);
  let nextEvents = events;

  if (!hasReconcile || cachedStatus !== derived || snapStatus !== derived) {
    const reconcileEv = makeReconcileEvent(docRef.id, derived, cachedStatus, snapStatus);
    if (!events.some((e) => e.eventId === reconcileEv.eventId)) {
      nextEvents = appendEvents(events, reconcileEv);
    }
  }

  const patch = materializeFromEvents(docRef.id, nextEvents, {
    isProcessing: false,
    processingBy: null,
    processingStartedAt: null,
    stateReconciledAt: new Date(),
    stateDriftFrom: cachedStatus,
    recoveryReason: reason,
    updatedAt: new Date(),
    recoveryAt: new Date(),
  });

  await docRef.update(patch);
  await writeSnapshotDoc(db, docRef.id, patch.dismissalSnapshot, data.schoolId);

  return {
    action: 'drift_repaired',
    derived,
    wasStored: cachedStatus,
    wasSnap: snapStatus,
    reconcileAppended: nextEvents.length > events.length,
  };
}

/** Rebuild missing or stale snapshot from events. */
async function rebuildSnapshot(db, docRef, data) {
  const events = Array.isArray(data.dismissalEvents) ? data.dismissalEvents : [];
  if (!events.length) return { action: 'skipped', reason: 'no_events' };

  const snapshot = buildSnapshot(docRef.id, events);
  const derived = deriveState(events);
  const patch = {
    dismissalSnapshot: snapshot,
    status: derived,
    statusDrift: false,
    snapshotRebuiltAt: new Date(),
    updatedAt: new Date(),
  };

  await docRef.update(patch);
  await writeSnapshotDoc(db, docRef.id, snapshot, data.schoolId);

  return { action: 'snapshot_rebuilt', derived, lastEventId: snapshot.lastEventId };
}

export async function runDismissalRecovery(db, options = {}) {
  const limit = Math.min(Number(options.limit) || 50, 200);
  const schoolId = options.schoolId ? String(options.schoolId) : null;
  const results = [];

  // 1. Stale locks
  let lockQuery = db.collection(DISMISSAL_COL).where('isProcessing', '==', true).limit(limit);
  if (schoolId) {
    lockQuery = db
      .collection(DISMISSAL_COL)
      .where('schoolId', '==', schoolId)
      .where('isProcessing', '==', true)
      .limit(limit);
  }

  const lockSnap = await lockQuery.get();

  for (const doc of lockSnap.docs) {
    const data = doc.data();
    if (!lockExpired(data)) {
      results.push({ id: doc.id, action: 'lock_skipped', lockAgeMs: lockAge(data) });
      continue;
    }

    const repair = await repairDrift(db, doc.ref, data, 'stale_lock_recovery');
    results.push({
      id: doc.id,
      action: 'lock_released',
      lockReleased: true,
      ...repair,
    });
  }

  // 2. Missing snapshot
  const snapLimit = Math.min(Number(options.snapshotScanLimit) || 40, 150);
  let missingQuery = db.collection(DISMISSAL_COL).orderBy('updatedAt', 'desc').limit(snapLimit);
  if (schoolId) {
    missingQuery = db
      .collection(DISMISSAL_COL)
      .where('schoolId', '==', schoolId)
      .orderBy('updatedAt', 'desc')
      .limit(snapLimit);
  }

  const recentSnap = await missingQuery.get().catch(() => ({ docs: [] }));

  for (const doc of recentSnap.docs) {
    const data = doc.data();
    if (data.isProcessing) continue;

    const missingSnap = !data.dismissalSnapshot?.derivedStatus || !data.dismissalSnapshot?.lastEventId;
    if (missingSnap) {
      const rebuilt = await rebuildSnapshot(db, doc.ref, data);
      results.push({ id: doc.id, ...rebuilt });
      continue;
    }

    const { drift } = detectDrift(data);
    if (drift) {
      const repaired = await repairDrift(db, doc.ref, data, 'auto_drift_repair');
      results.push({ id: doc.id, ...repaired });
    }
  }

  // 3. Retry hint — clear failed transition marker on recovered docs
  const retryCleared = results.filter((r) => r.lockReleased || r.action === 'drift_repaired').length;

  return {
    scannedLocks: lockSnap.size,
    scannedRecent: recentSnap.docs?.length || 0,
    lockReleased: results.filter((r) => r.lockReleased).length,
    driftRepaired: results.filter((r) => r.action === 'drift_repaired').length,
    snapshotsRebuilt: results.filter((r) => r.action === 'snapshot_rebuilt').length,
    retryReady: retryCleared,
    lockTtlMs: LOCK_TTL_MS,
    results,
  };
}

export function registerDismissalRecoveryRoute(app, { getDb, resolveCronSecret }) {
  app.post('/api/internal/dismissal-recovery/run', async (req, res) => {
    const secret = resolveCronSecret(
      process.env.DISMISSAL_CRON_SECRET,
      process.env.CRON_SECRET,
    );
    if (!secret || req.headers['x-cron-secret'] !== secret) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    try {
      const report = await runDismissalRecovery(getDb(), req.body || {});
      return res.json({ success: true, ...report });
    } catch (e) {
      console.error('[DismissalRecovery]', e);
      return res.status(500).json({ success: false, error: e.message || 'Recovery failed' });
    }
  });
}
