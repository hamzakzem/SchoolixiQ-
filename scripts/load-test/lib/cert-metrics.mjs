/** Metrics collector for certification load tests. */

export function createCollector() {
  return {
    operations: [],
    counters: {
      permission_denied: 0,
      resource_exhausted: 0,
      deadline_exceeded: 0,
      unavailable: 0,
      index_required: 0,
      auth_failures: 0,
      rate_limit: 0,
      script_error: 0,
    },
    firestoreReads: 0,
    firestoreWrites: 0,
    httpCalls: 0,
  };
}

export function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

export async function record(collector, meta, fn) {
  const start = performance.now();
  const ts = Date.now();
  try {
    const result = await fn();
    const ms = Math.round(performance.now() - start);
    collector.operations.push({
      ...meta,
      ok: true,
      ms,
      ts,
      error: null,
    });
    return result;
  } catch (err) {
    const ms = Math.round(performance.now() - start);
    const kind = err?.kind || 'other';
    if (kind === 'auth_failure') collector.counters.auth_failures += 1;
    else if (kind in collector.counters) collector.counters[kind] += 1;
    collector.operations.push({
      ...meta,
      ok: false,
      ms,
      ts,
      error: err?.message || String(err),
      errorKind: kind,
    });
    return null;
  }
}

export function mergeCollectors(target, source) {
  target.operations.push(...source.operations);
  for (const k of Object.keys(target.counters)) {
    target.counters[k] += source.counters[k] || 0;
  }
  target.firestoreReads += source.firestoreReads || 0;
  target.firestoreWrites += source.firestoreWrites || 0;
  target.httpCalls += source.httpCalls || 0;
}

export function summarize(collector, { writesEnabled = false } = {}) {
  const ops = collector.operations;
  const total = ops.length;
  const failed = ops.filter((o) => !o.ok).length;
  const durations = ops.map((o) => o.ms).sort((a, b) => a - b);
  const readDurations = ops.filter((o) => o.kind !== 'write').map((o) => o.ms).sort((a, b) => a - b);
  const writeDurations = ops.filter((o) => o.kind === 'write').map((o) => o.ms).sort((a, b) => a - b);

  const elapsedMs =
    total >= 2 ? ops[ops.length - 1].ts - ops[0].ts : durations.reduce((a, b) => a + b, 0);
  const elapsedSec = Math.max(elapsedMs / 1000, 0.001);

  const mid = Math.floor(ops.length / 2);
  const firstHalf = ops.slice(0, mid).map((o) => o.ms);
  const secondHalf = ops.slice(mid).map((o) => o.ms);
  const firstP95 = percentile([...firstHalf].sort((a, b) => a - b), 95);
  const secondP95 = percentile([...secondHalf].sort((a, b) => a - b), 95);
  const latencyTrendIncreasing = secondHalf.length > 10 && secondP95 > firstP95 * 1.5;

  const byScenario = {};
  const byOperation = {};
  for (const op of ops) {
    const sc = op.scenario || 'unknown';
    if (!byScenario[sc]) byScenario[sc] = { total: 0, failed: 0, durations: [] };
    byScenario[sc].total += 1;
    if (!op.ok) byScenario[sc].failed += 1;
    byScenario[sc].durations.push(op.ms);

    const opName = op.operation || op.name || 'unknown';
    if (!byOperation[opName]) byOperation[opName] = { total: 0, failed: 0, durations: [] };
    byOperation[opName].total += 1;
    if (!op.ok) byOperation[opName].failed += 1;
    byOperation[opName].durations.push(op.ms);
  }

  const enrich = (bucket) => {
    const d = [...bucket.durations].sort((a, b) => a - b);
    return {
      total: bucket.total,
      failed: bucket.failed,
      errorRate: bucket.total ? bucket.failed / bucket.total : 0,
      p50: percentile(d, 50),
      p95: percentile(d, 95),
      p99: percentile(d, 99),
      max: d.length ? d[d.length - 1] : 0,
    };
  };

  const p95All = percentile(durations, 95);
  const p95Read = percentile(readDurations, 95);
  const p95Write = percentile(writeDurations, 95);
  const p99All = percentile(durations, 99);

  const thresholds = {
    errorRate: 0.01,
    permissionDenied: 0,
    resourceExhausted: 0,
    indexRequired: 0,
    p95ReadMs: 1500,
    p95WriteMs: 2500,
    p99Ms: 4000,
  };

  const failReasons = [];
  const errorRate = total ? failed / total : 0;
  const platformFailed = ops.filter((o) => !o.ok && o.errorKind !== 'script_error').length;
  const platformErrorRate = total ? platformFailed / total : 0;

  if (collector.counters.script_error > 0) {
    failReasons.push(`script_error: ${collector.counters.script_error} (malformed test requests)`);
  }
  if (platformErrorRate >= thresholds.errorRate) {
    failReasons.push(
      `platform error rate ${(platformErrorRate * 100).toFixed(2)}% >= ${thresholds.errorRate * 100}%`,
    );
  }
  if (collector.counters.permission_denied > thresholds.permissionDenied) {
    failReasons.push(`permission-denied: ${collector.counters.permission_denied}`);
  }
  if (collector.counters.resource_exhausted > thresholds.resourceExhausted) {
    failReasons.push(`resource-exhausted: ${collector.counters.resource_exhausted}`);
  }
  if (collector.counters.index_required > thresholds.indexRequired) {
    failReasons.push(`index-required: ${collector.counters.index_required}`);
  }

  const p95Limit = writesEnabled ? thresholds.p95WriteMs : thresholds.p95ReadMs;
  const p95Check = writesEnabled && writeDurations.length > 0 ? p95Write : p95Read || p95All;
  if (p95Check > p95Limit) {
    failReasons.push(`p95 ${p95Check}ms > ${p95Limit}ms`);
  }
  if (p99All > thresholds.p99Ms) {
    failReasons.push(`p99 ${p99All}ms > ${thresholds.p99Ms}ms`);
  }

  let decision = 'GO';
  if (failReasons.length > 0) decision = 'NO-GO';
  else if (latencyTrendIncreasing) decision = 'GO WITH LIMITS';

  return {
    total,
    failed,
    errorRate,
    platformErrorRate,
    platformFailed,
    opsPerSecond: total / elapsedSec,
    durations: {
      p50: percentile(durations, 50),
      p95: p95All,
      p95Read,
      p95Write,
      p99: p99All,
      max: durations.length ? durations[durations.length - 1] : 0,
      avg: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
    },
    latencyTrend: { firstP95, secondP95, increasing: latencyTrendIncreasing },
    counters: { ...collector.counters },
    estimatedFirestoreReads: collector.firestoreReads,
    estimatedFirestoreWrites: collector.firestoreWrites,
    httpCalls: collector.httpCalls,
    byScenario: Object.fromEntries(Object.entries(byScenario).map(([k, v]) => [k, enrich(v)])),
    byOperation: Object.fromEntries(Object.entries(byOperation).map(([k, v]) => [k, enrich(v)])),
    failReasons,
    decision,
    elapsedSec,
  };
}
