#!/usr/bin/env node
// Runs every Phase-0 security regression test against ALREADY RUNNING local emulators and stores
// the results under scripts/security/results/<run-id>/ (also copied to results/latest/).
//
//   node scripts/security/run-all.mjs            # all suites
//   node scripts/security/run-all.mjs rules      # only files whose path contains "rules"
//
// A FAILED test is a proven weakness (the secure expectation was violated); it is reported, never
// hidden. Exit code: 0 = all expectations met, 1 = at least one weakness or broken flow, 2 = setup error.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync, readFileSync, rmSync, cpSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const filter = process.argv[2] || '';
const PROJECT = process.env.SECURITY_TEST_PROJECT || 'demo-schoolixiq-security';
const FS_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8085';
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';

if (!PROJECT.startsWith('demo-')) { console.error('Refusing: project id must start with demo-'); process.exit(2); }
for (const v of ['GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_SERVICE_ACCOUNT']) {
  if (process.env[v]) { console.error(`Refusing: ${v} is set. Unset real credentials before running.`); process.exit(2); }
}

async function reachable(url) {
  try { const r = await fetch(url, { signal: AbortSignal.timeout(3000) }); return r.status < 500; } catch { return false; }
}
if (!(await reachable(`http://${FS_HOST}/`)) || !(await reachable(`http://${AUTH_HOST}/`))) {
  console.error(`Emulators not reachable at ${FS_HOST} / ${AUTH_HOST}. Start them first (see scripts/security/README.md).`);
  process.exit(2);
}

const files = [];
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = path.join(d, f);
    if (statSync(p).isDirectory()) { if (!['lib', 'results', 'node_modules'].includes(f)) walk(p); } else if (f.endsWith('.test.mjs') && p.includes(filter)) files.push(p);
  }
};
walk(here);
files.sort();

const runId = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join(here, 'results', runId);
mkdirSync(outDir, { recursive: true });
const junit = path.join(outDir, 'junit.xml');

const env = {
  ...process.env,
  SECURITY_TEST_PROJECT: PROJECT, FIRESTORE_EMULATOR_HOST: FS_HOST, FIREBASE_AUTH_EMULATOR_HOST: AUTH_HOST,
  GCLOUD_PROJECT: PROJECT, METADATA_SERVER_DETECTION: 'none', SECURITY_RESULTS_DIR: outDir,
};
const res = spawnSync(process.execPath, [
  '--test', '--test-concurrency=1', '--test-timeout=180000',
  '--test-reporter=spec', '--test-reporter-destination=stdout',
  '--test-reporter=junit', `--test-reporter-destination=${junit}`,
  ...files,
], { env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const log = `${res.stdout || ''}${res.stderr || ''}`;
writeFileSync(path.join(outDir, 'run.log'), log);
process.stdout.write(log);

// ---- Summarise from JUnit -------------------------------------------------------------------
const xml = existsSync(junit) ? readFileSync(junit, 'utf8') : '';
const cases = [];
for (const m of xml.matchAll(/<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g)) {
  const attrs = Object.fromEntries([...m[1].matchAll(/(\w+)="([^"]*)"/g)].map((a) => [a[1], a[2]]));
  const body = m[3] || '';
  const unescapeOnce = (s) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  // Node's JUnit reporter can escape attribute text twice; undo until stable.
  const unescape = (s) => { let prev; let cur = s; do { prev = cur; cur = unescapeOnce(cur); } while (cur !== prev); return cur; };
  const name = unescape(attrs.name || '');
  let status = 'passed';
  if (/<skipped[^>]*type="todo"|<skipped[^>]*message="TODO/i.test(body) || /# TODO/.test(body)) status = 'not-testable';
  else if (/<skipped/.test(body)) status = 'skipped';
  else if (/<failure/.test(body)) status = 'failed';
  const msg = (body.match(/<failure[^>]*message="([^"]*)"/) || [])[1];
  cases.push({ suite: unescape(attrs.classname || ''), name, status, message: msg ? unescape(msg).slice(0, 400) : undefined });
}
const count = (s) => cases.filter((c) => c.status === s).length;
const isControl = (c) => /CONTROL/.test(c.name);
const summary = {
  runId, project: PROJECT, files: files.map((f) => path.relative(here, f)),
  total: cases.length, passed: count('passed'), failed: count('failed'), notTestable: count('not-testable'), skipped: count('skipped'),
  provenWeaknesses: cases.filter((c) => c.status === 'failed' && !isControl(c)).map((c) => c.name),
  brokenControls: cases.filter((c) => c.status === 'failed' && isControl(c)).map((c) => c.name),
  cases,
};
writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
const md = [
  `# Security regression run ${runId}`, '',
  `Project: \`${PROJECT}\` (emulator only). Files: ${summary.files.length}.`, '',
  '| Total | Passed | Failed (proven weakness / broken control) | Not testable | Skipped |', '|---|---|---|---|---|',
  `| ${summary.total} | ${summary.passed} | ${summary.failed} (${summary.provenWeaknesses.length} / ${summary.brokenControls.length}) | ${summary.notTestable} | ${summary.skipped} |`, '',
  '## Results', '', '| Status | Test |', '|---|---|',
  ...cases.map((c) => `| ${c.status === 'failed' ? (isControl(c) ? 'FAILED (control)' : 'FAILED — weakness proven') : c.status} | ${c.name.replace(/\|/g, '\\|')} |`),
].join('\n');
writeFileSync(path.join(outDir, 'SUMMARY.md'), `${md}\n`);

const latest = path.join(here, 'results', 'latest');
rmSync(latest, { recursive: true, force: true });
cpSync(outDir, latest, { recursive: true });
console.log(`\nSummary: total=${summary.total} passed=${summary.passed} failed=${summary.failed} not-testable=${summary.notTestable} skipped=${summary.skipped}`);
console.log(`Results: ${path.relative(process.cwd(), outDir)}`);
process.exit(summary.failed > 0 || res.status !== 0 ? 1 : 0);
