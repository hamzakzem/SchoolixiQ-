/**
 * Pre-deploy gate for Hostinger Node Web App releases.
 * Fails the build if dist is incomplete or Node entry artifacts are missing.
 */
import { access, readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist');

let failed = false;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed = true;
}

async function mustExist(rel, label = rel) {
  const full = path.join(distDir, rel);
  try {
    await access(full);
    return true;
  } catch {
    fail(`missing ${label} (expected dist/${rel})`);
    return false;
  }
}

console.log('=== verify-production-release: dist structure ===');

for (const rel of [
  'index.html',
  'server.mjs',
  'firebase-applet-config.json',
  'sw.js',
  'sw-precache.json',
  '.htaccess',
  'assets/.htaccess',
]) {
  await mustExist(rel);
}

const assetsDir = path.join(distDir, 'assets');
let assetFiles = [];
try {
  assetFiles = await readdir(assetsDir);
} catch {
  fail('dist/assets/ missing or unreadable');
}

const jsAssets = assetFiles.filter((f) => f.endsWith('.js'));
const cssAssets = assetFiles.filter((f) => f.endsWith('.css'));
if (jsAssets.length === 0) {
  fail('dist/assets/ has no .js bundles');
} else {
  console.log(`OK: dist/assets has ${jsAssets.length} JS + ${cssAssets.length} CSS files`);
}

try {
  const serverStat = await stat(path.join(distDir, 'server.mjs'));
  if (serverStat.size < 1024) {
    fail(`dist/server.mjs too small (${serverStat.size} bytes)`);
  } else {
    console.log(`OK: dist/server.mjs present (${serverStat.size} bytes)`);
  }
} catch {
  /* already reported */
}

try {
  const serverSrc = await readFile(path.join(distDir, 'server.mjs'), 'utf8');
  for (const needle of ['0.0.0.0', 'process.env.PORT', 'SERVER_BOOT_START', 'PORT_LISTENING', 'SERVER_READY']) {
    if (!serverSrc.includes(needle)) {
      fail(`dist/server.mjs missing required marker: ${needle}`);
    }
  }
  if (!failed) {
    console.log('OK: dist/server.mjs binds 0.0.0.0 / PORT and emits boot logs');
  }
} catch {
  /* already reported */
}

console.log('=== verify-production-release: web integrity ===');
const web = spawnSync(process.execPath, [path.join(root, 'scripts', 'verify-web-build.mjs')], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});
if (web.status !== 0) {
  fail('verify:web-build failed');
}

if (failed) {
  console.error('BLOCKED: production release verification failed — do not deploy');
  process.exit(1);
}

console.log('OK: production release verification passed — safe to deploy');
process.exit(0);
