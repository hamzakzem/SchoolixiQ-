/**
 * Event compaction — archive old events, keep snapshot + tail chain.
 * POST /api/internal/dismissal-compaction/run (daily cron)
 */

import { deriveState } from './dismissalStateMachine.mjs';
import {
  buildSnapshot,
  compactEventLog,
  writeSnapshotDoc,
  ARCHIVE_FIELD,
} from './dismissalSnapshot.mjs';

const DISMISSAL_COL = 'dismissal_requests';
const TERMINAL = new Set(['DISMISSED', 'REJECTED', 'EXPIRED']);
const DEFAULT_ARCHIVE_DAYS = 30;

export async function runDismissalCompaction(db, options = {}) {
  const limit = Math.min(Number(options.limit) || 100, 300);
  const archiveDays = Number(options.archiveDays) || DEFAULT_ARCHIVE_DAYS;
  const schoolId = options.schoolId ? String(options.schoolId) : null;

  const cutoffDate = new Date(Date.now() - archiveDays * 24 * 60 * 60 * 1000);

  let query = db
    .collection(DISMISSAL_COL)
    .where('updatedAt', '<', cutoffDate)
    .orderBy('updatedAt', 'asc')
    .limit(limit);

  if (schoolId) {
    query = db
      .collection(DISMISSAL_COL)
      .where('schoolId', '==', schoolId)
      .where('updatedAt', '<', cutoffDate)
      .orderBy('updatedAt', 'asc')
      .limit(limit);
  }

  const snap = await query.get().catch(async () => {
    const fallback = db.collection(DISMISSAL_COL).limit(limit);
    return schoolId
      ? fallback.where('schoolId', '==', schoolId).limit(limit).get()
      : fallback.get();
  });

  const results = [];
  let compacted = 0;
  let archivedEvents = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const events = Array.isArray(data.dismissalEvents) ? data.dismissalEvents : [];
    const state = deriveState(events);

    if (!TERMINAL.has(state)) {
      results.push({ id: doc.id, action: 'skipped', reason: 'not_terminal' });
      continue;
    }

    if (data.dismissalSnapshot?.compactedAt) {
      const compactedAt = data.dismissalSnapshot.compactedAt?.toDate?.() || data.dismissalSnapshot.compactedAt;
      const ms = compactedAt instanceof Date ? compactedAt.getTime() : new Date(compactedAt).getTime();
      if (Date.now() - ms < 24 * 60 * 60 * 1000) {
        results.push({ id: doc.id, action: 'skipped', reason: 'recently_compacted' });
        continue;
      }
    }

    const { kept, archived, didCompact } = compactEventLog(events, archiveDays);
    if (!didCompact) {
      results.push({ id: doc.id, action: 'skipped', reason: 'no_old_events' });
      continue;
    }

    const existingArchive = Array.isArray(data[ARCHIVE_FIELD]) ? data[ARCHIVE_FIELD] : [];
    const snapshot = {
      ...buildSnapshot(doc.id, [...existingArchive, ...archived, ...kept]),
      compactedAt: new Date(),
      archivedCount: existingArchive.length + archived.length,
    };

    await doc.ref.update({
      dismissalEvents: kept,
      [ARCHIVE_FIELD]: [...existingArchive, ...archived],
      dismissalSnapshot: snapshot,
      status: snapshot.derivedStatus,
      statusDrift: false,
      compactedAt: new Date(),
      updatedAt: new Date(),
    });

    await writeSnapshotDoc(db, doc.id, snapshot, data.schoolId);

    compacted += 1;
    archivedEvents += archived.length;
    results.push({
      id: doc.id,
      action: 'compacted',
      keptEvents: kept.length,
      archivedBatch: archived.length,
      totalArchived: snapshot.archivedCount,
    });
  }

  return {
    scanned: snap.size,
    compacted,
    archivedEvents,
    archiveDays,
    results,
  };
}

export function registerDismissalCompactionRoute(app, { getDb, resolveCronSecret }) {
  app.post('/api/internal/dismissal-compaction/run', async (req, res) => {
    const secret = resolveCronSecret(
      process.env.DISMISSAL_CRON_SECRET,
      process.env.CRON_SECRET,
    );
    if (!secret || req.headers['x-cron-secret'] !== secret) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    try {
      const report = await runDismissalCompaction(getDb(), req.body || {});
      return res.json({ success: true, ...report });
    } catch (e) {
      console.error('[DismissalCompaction]', e);
      return res.status(500).json({ success: false, error: e.message || 'Compaction failed' });
    }
  });
}
