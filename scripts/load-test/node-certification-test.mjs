#!/usr/bin/env node
/**
 * SchoolixIQ — Production Certification Load Test (Node.js)
 *
 * Read-only (default):
 *   node scripts/load-test/node-certification-test.mjs \
 *     --runId=prelaunch-load100-001 \
 *     --baseUrl=https://schoolixiq.com \
 *     --maxUsers=100 --concurrency=25 --durationMinutes=10 \
 *     --confirmProduction=true
 *
 * Write-enabled:
 *   node scripts/load-test/node-certification-test.mjs \
 *     --runId=prelaunch-load100-001 \
 *     --baseUrl=https://schoolixiq.com \
 *     --maxUsers=100 --concurrency=10 --durationMinutes=5 \
 *     --writes=true --confirmWrites=true --confirmProduction=true
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCollector, mergeCollectors, summarize } from './lib/cert-metrics.mjs';
import {
  runLandingScenario,
  runScenarioForUser,
} from './lib/cert-scenarios.mjs';
import { SessionCache, warmSessions } from './lib/cert-auth.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../..');

const PRODUCTION_HOSTS = ['schoolixiq.com', 'www.schoolixiq.com'];

function parseArgs(argv = process.argv.slice(2)) {
  const flags = {
    runId: null,
    baseUrl: null,
    apiKey: null,
    maxUsers: 100,
    concurrency: 25,
    durationMinutes: 10,
    writes: false,
    confirmWrites: false,
    confirmProduction: false,
    dryRun: false,
  };

  for (const arg of argv) {
    if (arg.startsWith('--runId=')) flags.runId = arg.split('=')[1];
    else if (arg.startsWith('--run-id=')) flags.runId = arg.split('=')[1];
    else if (arg.startsWith('--baseUrl=')) flags.baseUrl = arg.split('=')[1];
    else if (arg.startsWith('--base-url=')) flags.baseUrl = arg.split('=')[1];
    else if (arg.startsWith('--apiKey=')) flags.apiKey = arg.split('=')[1];
    else if (arg.startsWith('--maxUsers=')) flags.maxUsers = Number(arg.split('=')[1]) || 100;
    else if (arg.startsWith('--concurrency=')) flags.concurrency = Number(arg.split('=')[1]) || 25;
    else if (arg.startsWith('--durationMinutes=')) {
      flags.durationMinutes = Number(arg.split('=')[1]) || 10;
    }
    else if (arg === '--writes=true') flags.writes = true;
    else if (arg === '--writes=false') flags.writes = false;
    else if (arg === '--confirmWrites=true') flags.confirmWrites = true;
    else if (arg === '--confirmProduction=true') flags.confirmProduction = true;
    else if (arg === '--dryRun' || arg === '--dry-run') flags.dryRun = true;
  }

  return flags;
}

function isProductionBaseUrl(baseUrl) {
  try {
    const host = new URL(baseUrl).hostname.toLowerCase();
    return PRODUCTION_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

function loadFirebaseConfig() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'firebase-applet-config.json'), 'utf8'));
}

function loadCredentials(runId) {
  const file = path.join(__dirname, '.runs', runId, 'credentials.json');
  if (!fs.existsSync(file)) {
    throw new Error(
      `Credentials not found: ${file}\nSeed first:\n  node scripts/load-test/seed-prelaunch-data.mjs --preset=load100 --testRunId=${runId}`,
    );
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function pickUsers(credentials, maxUsers) {
  const users = credentials.users || [];
  const byRole = { admin: [], teacher: [], parent: [], staff: [] };
  for (const u of users) {
    if (byRole[u.role]) byRole[u.role].push(u);
    else byRole.staff.push(u);
  }

  const weights = { admin: 0.2, teacher: 0.25, parent: 0.45, staff: 0.1 };
  const picked = [];
  const seen = new Set();

  for (const [role, weight] of Object.entries(weights)) {
    const target = Math.max(role === 'staff' ? 0 : 1, Math.round(maxUsers * weight));
    for (const u of byRole[role].slice(0, target)) {
      if (picked.length >= maxUsers) break;
      if (seen.has(u.uid)) continue;
      seen.add(u.uid);
      picked.push(u);
    }
  }

  for (const u of users) {
    if (picked.length >= maxUsers) break;
    if (seen.has(u.uid)) continue;
    seen.add(u.uid);
    picked.push(u);
  }

  return picked.slice(0, maxUsers);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function inferTier(maxUsers) {
  if (maxUsers >= 1000) return 4;
  if (maxUsers >= 500) return 3;
  if (maxUsers >= 300) return 2;
  return 1;
}

async function workerLoop(workerId, ctx) {
  const col = createCollector();
  const { users, endTime, writesEnabled } = ctx;
  const user = users[workerId % users.length];
  let iterations = 0;

  while (Date.now() < endTime) {
    if (workerId % 25 === 0 && iterations % 5 === 0) {
      await runLandingScenario(col, ctx);
    }
    await runScenarioForUser(col, ctx, user, workerId, iterations);
    iterations += 1;
    await sleep(80 + Math.random() * 120);
  }

  return col;
}

function buildMarkdownReport(report) {
  const lines = [
    '# SchoolixIQ Certification Load Test Report',
    '',
    `| Field | Value |`,
    `|-------|-------|`,
    `| Run ID | \`${report.runId}\` |`,
    `| Tier | ${report.tier} |`,
    `| Base URL | ${report.baseUrl} |`,
    `| Duration | ${report.durationMinutes} min (actual ${report.summary.elapsedSec.toFixed(1)}s) |`,
    `| Max users | ${report.maxUsers} |`,
    `| Concurrency | ${report.concurrency} |`,
    `| Writes | ${report.writesEnabled ? 'enabled' : 'disabled'} |`,
    `| Decision | **${report.summary.decision}** |`,
    '',
    '## Summary',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total operations | ${report.summary.total} |`,
    `| Failed | ${report.summary.failed} |`,
    `| Error rate | ${(report.summary.errorRate * 100).toFixed(2)}% |`,
    `| Ops/sec | ${report.summary.opsPerSecond.toFixed(2)} |`,
    `| p50 | ${report.summary.durations.p50}ms |`,
    `| p95 | ${report.summary.durations.p95}ms |`,
    `| p99 | ${report.summary.durations.p99}ms |`,
    `| max | ${report.summary.durations.max}ms |`,
    `| Est. Firestore reads | ${report.summary.estimatedFirestoreReads} |`,
    `| Est. Firestore writes | ${report.summary.estimatedFirestoreWrites} |`,
    '',
    '## Error counters',
    '',
  ];

  for (const [k, v] of Object.entries(report.summary.counters)) {
    lines.push(`- **${k}**: ${v}`);
  }

  if (report.summary.failReasons.length) {
    lines.push('', '## Failure reasons', '');
    for (const r of report.summary.failReasons) lines.push(`- ${r}`);
  }

  lines.push('', '## Per-scenario', '', '| Scenario | Total | Failed | p95 |', '|----------|-------|--------|-----|');
  for (const [name, s] of Object.entries(report.summary.byScenario)) {
    lines.push(`| ${name} | ${s.total} | ${s.failed} | ${s.p95}ms |`);
  }

  lines.push('', '## Cleanup', '', '```bash');
  lines.push(`node scripts/load-test/cleanup-prelaunch-data.mjs --testRunId=${report.runId}`);
  lines.push('```');

  return lines.join('\n');
}

function assertSafety(flags, baseUrl) {
  if (!flags.runId) {
    throw new Error('--runId=<id> is required');
  }
  if (isProductionBaseUrl(baseUrl) && !flags.confirmProduction) {
    throw new Error(
      'Production baseUrl detected. Pass --confirmProduction=true to proceed.',
    );
  }
  if (flags.writes && !flags.confirmWrites) {
    throw new Error('Writes enabled but --confirmWrites=true not provided. Aborting.');
  }
}

async function main() {
  const flags = parseArgs();
  const firebaseConfig = loadFirebaseConfig();
  const credentials = loadCredentials(flags.runId);
  const baseUrl = (flags.baseUrl || 'https://schoolixiq.com').replace(/\/$/, '');
  const apiKey = flags.apiKey || firebaseConfig.apiKey;
  const projectId = firebaseConfig.projectId;
  const password = credentials.password || 'LoadTest!SchoolixIQ2026';
  const users = pickUsers(credentials, flags.maxUsers);
  const schools = credentials.schools || [];
  const adminUser = users.find((u) => u.role === 'admin') || users[0];
  const tier = inferTier(flags.maxUsers);

  assertSafety(flags, baseUrl);

  const plan = {
    runId: flags.runId,
    tier,
    baseUrl,
    projectId,
    maxUsers: users.length,
    concurrency: flags.concurrency,
    durationMinutes: flags.durationMinutes,
    writesEnabled: flags.writes,
    schoolsInCredentials: schools.length,
  };

  console.log('=== SchoolixIQ Production Certification Test ===');
  console.log(JSON.stringify(plan, null, 2));
  console.log('');

  if (flags.dryRun) {
    console.log('[dry-run] No operations executed.');
    process.exit(0);
  }

  if (users.length === 0) {
    throw new Error('No users available in credentials.json');
  }

  const ctx = {
    runId: flags.runId,
    testRunId: flags.runId,
    baseUrl,
    projectId,
    apiKey,
    password,
    users,
    schools,
    adminUser,
    writesEnabled: flags.writes,
    sessionCache: null,
  };

  const endTime = Date.now() + flags.durationMinutes * 60 * 1000;
  const workerCount = Math.min(flags.concurrency, users.length);
  ctx.endTime = endTime;

  const sessionCache = new SessionCache(apiKey, password);
  ctx.sessionCache = sessionCache;

  console.log(`Warming ${users.length} user sessions (login once per user)...`);
  try {
    await warmSessions(sessionCache, users, Math.min(15, users.length));
  } catch (err) {
    console.error('Session warm-up failed:', err.message);
    process.exit(1);
  }
  console.log(
    `Sessions ready — logins: ${sessionCache.stats.loginAttempts} ok, failures: ${sessionCache.getAuthFailureCount()}`,
  );

  console.log(`Starting ${workerCount} concurrent workers for ${flags.durationMinutes} minutes...`);
  console.log(`Writes: ${flags.writes ? 'ENABLED (tagged only)' : 'disabled'}`);
  console.log('');

  const startedAt = new Date().toISOString();
  const workers = Array.from({ length: workerCount }, (_, i) => workerLoop(i, ctx));
  const results = await Promise.all(workers);

  const collector = createCollector();
  for (const r of results) mergeCollectors(collector, r);

  const summary = summarize(collector, { writesEnabled: flags.writes });
  summary.counters.auth_failures = sessionCache.getAuthFailureCount();
  summary.authStats = { ...sessionCache.stats };
  const runDir = path.join(__dirname, '.runs', flags.runId);
  fs.mkdirSync(runDir, { recursive: true });

  const report = {
    runId: flags.runId,
    tier,
    baseUrl,
    projectId,
    startedAt,
    finishedAt: new Date().toISOString(),
    maxUsers: users.length,
    concurrency: workerCount,
    durationMinutes: flags.durationMinutes,
    writesEnabled: flags.writes,
    summary,
    failures: collector.operations.filter((o) => !o.ok).slice(0, 50),
  };

  const jsonPath = path.join(runDir, 'certification-report.json');
  const mdPath = path.join(runDir, 'certification-report.md');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, buildMarkdownReport(report));

  console.log('--- Results ---');
  console.log('Total operations:   ', summary.total);
  console.log('Failed:             ', summary.failed);
  console.log('Error rate (all):   ', `${(summary.errorRate * 100).toFixed(2)}%`);
  console.log('Platform error rate:', `${(summary.platformErrorRate * 100).toFixed(2)}%`);
  console.log('Ops/sec:            ', summary.opsPerSecond.toFixed(2));
  console.log('p50 / p95 / p99:    ', `${summary.durations.p50} / ${summary.durations.p95} / ${summary.durations.p99} ms`);
  console.log('max duration:       ', `${summary.durations.max} ms`);
  console.log('Est. Firestore reads: ', summary.estimatedFirestoreReads);
  console.log('Est. Firestore writes:', summary.estimatedFirestoreWrites);
  console.log('');
  console.log('Counters:');
  for (const [k, v] of Object.entries(summary.counters)) {
    if (v > 0) console.log(`  ${k}: ${v}`);
  }
  console.log('');
  console.log('Per-scenario p95:');
  for (const [name, s] of Object.entries(summary.byScenario)) {
    console.log(`  ${name}: ${s.p95}ms (${s.failed}/${s.total} failed)`);
  }
  console.log('');
  if (summary.latencyTrend.increasing) {
    console.log(`⚠ Latency trend: first-half p95=${summary.latencyTrend.firstP95}ms → second-half p95=${summary.latencyTrend.secondP95}ms`);
  }
  console.log('════════════════════════════════════════');
  console.log(`  CERTIFICATION: ${summary.decision}`);
  console.log('════════════════════════════════════════');
  if (summary.failReasons.length) {
    console.log('\nFailure reasons:');
    for (const r of summary.failReasons) console.log(`  • ${r}`);
  }
  console.log('\nReports saved:');
  console.log(' ', jsonPath);
  console.log(' ', mdPath);
  console.log('\nCleanup when finished:');
  console.log(`  node scripts/load-test/cleanup-prelaunch-data.mjs --testRunId=${flags.runId}`);

  process.exit(summary.decision === 'NO-GO' ? 1 : 0);
}

main().catch((err) => {
  console.error('Certification test aborted:', err.message);
  process.exit(1);
});
