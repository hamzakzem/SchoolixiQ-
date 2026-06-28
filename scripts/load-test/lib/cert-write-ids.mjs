import { randomBytes } from 'crypto';

let globalWriteSeq = 0;

/** Monotonic suffix — safe in Node single-threaded event loop between awaits. */
export function nextWriteSeq() {
  globalWriteSeq += 1;
  return globalWriteSeq;
}

function slugPart(value, max = 16) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, max)
    .toLowerCase();
}

/**
 * Unique Firestore document ID for load-test writes.
 * Includes: testRunId, scenario, worker, iteration, sequence, random suffix.
 */
export function buildWriteDocId({
  testRunId,
  scenario,
  collection,
  workerId = 0,
  iteration = 0,
  userIndex = 0,
}) {
  const run = slugPart(testRunId, 12);
  const sc = slugPart(scenario, 10);
  const col = slugPart(collection, 8);
  const seq = nextWriteSeq();
  const rand = randomBytes(4).toString('hex');
  const ts = Date.now().toString(36);
  return `lt-${run}-${sc}-${col}-w${workerId}-u${userIndex}-i${iteration}-s${seq}-${ts}-${rand}`;
}
