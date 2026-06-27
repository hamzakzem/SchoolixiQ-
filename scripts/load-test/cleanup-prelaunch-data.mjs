#!/usr/bin/env node
/**
 * Delete load-test data tagged loadTest:true + matching testRunId only.
 *
 * Usage:
 *   node scripts/load-test/cleanup-prelaunch-data.mjs --testRunId=prelaunch-20260603-smoke
 */
import { parseCliArgs, loadConfig, assertSafeToMutate } from './lib/safety.mjs';
import { initFirebaseAdmin } from './lib/firebase-admin.mjs';

const COLLECTIONS = [
  'notifications',
  'system_messages',
  'conversations',
  'orders',
  'market',
  'marketplace',
  'grades',
  'homework',
  'attendance',
  'installments',
  'payments',
  'tuition_reminder_tracking',
  'tuition_reminder_logs',
  'students',
  'classes',
  'users',
  'schools',
];

async function deleteTaggedDocs(db, collectionName, testRunId, dryRun) {
  const col = db.collection(collectionName);
  const snap = await col.where('loadTest', '==', true).where('testRunId', '==', testRunId).get();

  if (snap.empty) {
    return 0;
  }

  if (dryRun) {
    console.log(`  [dry-run] would delete ${snap.size} from ${collectionName}`);
    return snap.size;
  }

  const batchSize = 400;
  let deleted = 0;
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = db.batch();
    for (const doc of docs.slice(i, i + batchSize)) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    deleted += Math.min(batchSize, docs.length - i);
  }
  return deleted;
}

async function collectAuthUids(db, testRunId) {
  const snap = await db
    .collection('users')
    .where('loadTest', '==', true)
    .where('testRunId', '==', testRunId)
    .get();
  return snap.docs.map((d) => d.id);
}

async function deleteAuthUsersByUid(auth, uids, dryRun) {
  let deleted = 0;
  for (const uid of uids) {
    if (dryRun) {
      console.log(`  [dry-run] would delete auth user ${uid}`);
    } else {
      try {
        await auth.deleteUser(uid);
      } catch (err) {
        if (err?.code !== 'auth/user-not-found') {
          console.warn(`  auth delete ${uid}: ${err.message}`);
        }
      }
    }
    deleted += 1;
  }
  return deleted;
}

async function main() {
  const flags = parseCliArgs();
  const config = loadConfig(flags.configPath);
  assertSafeToMutate(config, flags, 'cleanup');

  const db = initFirebaseAdmin(config);
  const { admin } = await import('./lib/firebase-admin.mjs');
  const auth = admin.auth();

  console.log('=== SchoolixIQ Pre-Launch Cleanup ===');
  console.log('testRunId:', flags.testRunId);
  console.log('Environment:', config.environment);
  console.log('Dry run:', flags.dryRun);

  const authUids = await collectAuthUids(db, flags.testRunId);
  console.log(`  Found ${authUids.length} auth users to remove`);

  let total = 0;
  for (const name of COLLECTIONS) {
    try {
      const count = await deleteTaggedDocs(db, name, flags.testRunId, flags.dryRun);
      if (count > 0) {
        console.log(`  ${name}: ${count} deleted`);
        total += count;
      }
    } catch (err) {
      if (err?.code === 5 || /NOT_FOUND/i.test(String(err.message))) {
        continue;
      }
      console.warn(`  ${name}: skipped (${err.message})`);
    }
  }

  const authDeleted = await deleteAuthUsersByUid(auth, authUids, flags.dryRun);
  console.log(`  auth users: ${authDeleted} deleted`);

  console.log(`\n✓ Cleanup complete — ${total} Firestore docs, ${authDeleted} auth users`);
}

main().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
