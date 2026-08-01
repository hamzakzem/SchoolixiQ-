/**
 * Production server smoke test (local / CI).
 * Boots dist/server.mjs, waits for SERVER_READY, probes SPA routes, then exits.
 */
import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const root = path.resolve('.');
const serverPath = path.join(root, 'dist', 'server.mjs');
const PORT = String(process.env.VERIFY_PORT || '3417');
const HOST = '127.0.0.1';
const BASE = `http://${HOST}:${PORT}`;
const BOOT_TIMEOUT_MS = Number(process.env.VERIFY_BOOT_TIMEOUT_MS || 45000);
const ROUTES = ['/', '/login', '/admin', '/teacher', '/parent'];

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

try {
  await access(serverPath);
} catch {
  fail('dist/server.mjs missing — run npm run build (or build:server) first');
}

const child = spawn(process.execPath, [serverPath], {
  cwd: root,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
let ready = false;

const onChunk = (buf) => {
  const text = buf.toString('utf8');
  output += text;
  process.stdout.write(text);
  if (text.includes('SERVER_READY') || text.includes('PORT_LISTENING')) {
    ready = true;
  }
};

child.stdout.on('data', onChunk);
child.stderr.on('data', onChunk);

const startedAt = Date.now();
while (!ready && Date.now() - startedAt < BOOT_TIMEOUT_MS) {
  if (child.exitCode !== null) {
    fail(`server exited early with code ${child.exitCode}`);
  }
  await sleep(150);
}

if (!ready) {
  child.kill('SIGTERM');
  fail(`server did not emit SERVER_READY / PORT_LISTENING within ${BOOT_TIMEOUT_MS}ms`);
}

for (const marker of ['SERVER_BOOT_START', 'PORT_LISTENING', 'SERVER_READY', '0.0.0.0']) {
  if (!output.includes(marker)) {
    child.kill('SIGTERM');
    fail(`missing required startup marker: ${marker}`);
  }
}
console.log('OK: startup markers present (SERVER_BOOT_START / PORT_LISTENING / SERVER_READY / 0.0.0.0)');

let failed = false;
for (const route of ROUTES) {
  try {
    const res = await fetch(`${BASE}${route}`, { redirect: 'manual' });
    if (res.status !== 200) {
      console.error(`FAIL route ${route}: HTTP ${res.status}`);
      failed = true;
      continue;
    }
    const html = await res.text();
    if (!html.includes('id="root"') && !html.includes("id='root'")) {
      console.error(`FAIL route ${route}: response is not SPA index.html`);
      failed = true;
      continue;
    }
    console.log(`OK: ${route} -> HTTP 200 (SPA shell)`);
  } catch (err) {
    console.error(`FAIL route ${route}:`, err?.message || err);
    failed = true;
  }
}

child.kill('SIGTERM');
await Promise.race([
  new Promise((resolve) => child.once('exit', resolve)),
  sleep(3000),
]);
if (child.exitCode === null && !child.killed) {
  child.kill('SIGKILL');
}

if (failed) {
  process.exit(1);
}

console.log('OK: production server start validation passed');
