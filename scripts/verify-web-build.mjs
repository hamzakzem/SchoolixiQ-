import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const distDir = path.resolve('dist');
const distAssets = path.join(distDir, 'assets');
const forbidden = [
  'iframerpc',
  'idpiframe',
  'platform.js',
  'gapi.auth2',
  'gsi/client',
  'signInWithRedirect',
  '@codetrix-studio/capacitor-google-auth',
];

const files = await readdir(distAssets);
const jsFiles = files.filter((f) => f.endsWith('.js'));
let failed = false;

for (const file of jsFiles) {
  const content = await readFile(path.join(distAssets, file), 'utf8');
  for (const pattern of forbidden) {
    if (content.includes(pattern)) {
      console.error(`FAIL ${file}: contains "${pattern}"`);
      failed = true;
    }
  }
}

const indexHtml = await readFile(path.join(distDir, 'index.html'), 'utf8');
const entryMatch = indexHtml.match(/src="(\/assets\/index-[^"]+\.js)"/);
if (!entryMatch) {
  console.error('FAIL index.html: missing entry script');
  failed = true;
} else {
  const entryPath = entryMatch[1].replace(/^\//, '');
  const entryFile = path.join(distDir, entryPath);
  try {
    const entryContent = await readFile(entryFile, 'utf8');
    console.log(`OK: entry bundle -> ${entryMatch[1]}`);
    const chunkRefs = [...entryContent.matchAll(/assets\/[A-Za-z0-9_.-]+\.js/g)].map((m) => m[0]);
    const uniqueChunks = [...new Set(chunkRefs)];
    for (const chunk of uniqueChunks) {
      const chunkPath = path.join(distDir, chunk);
      try {
        await readFile(chunkPath, 'utf8');
      } catch {
        console.error(`FAIL missing chunk referenced by entry bundle: ${chunk}`);
        failed = true;
      }
    }
    const superAdminChunk = uniqueChunks.find((c) => c.includes('SuperAdminDashboard-'));
    if (superAdminChunk) {
      console.log(`OK: SuperAdminDashboard chunk -> ${superAdminChunk}`);
    }
  } catch {
    console.error(`FAIL entry bundle missing on disk: ${entryPath}`);
    failed = true;
  }
}

for (const required of ['.htaccess', 'sw.js', 'index.html', 'assets/.htaccess', 'sw-precache.json']) {
  try {
    await readFile(path.join(distDir, required), 'utf8');
  } catch {
    console.error(`FAIL dist/${required} missing`);
    failed = true;
  }
}

const adminChunk = jsFiles.find((f) => f.startsWith('AdminDashboard-') && f.endsWith('.js'));
if (!adminChunk) {
  console.error('FAIL: missing AdminDashboard-*.js chunk in dist/assets');
  failed = true;
} else {
  console.log(`OK: AdminDashboard chunk -> ${adminChunk}`);
}

try {
  const precache = JSON.parse(await readFile(path.join(distDir, 'sw-precache.json'), 'utf8'));
  const assets = Array.isArray(precache.assets) ? precache.assets : [];
  const hashed = assets.filter((a) => typeof a === 'string' && /^\/assets\/.+\.(js|mjs|css)(\?|$)/i.test(a));
  if (hashed.length > 0) {
    console.error('FAIL sw-precache.json must not list hashed Vite chunks:', hashed);
    failed = true;
  } else {
    console.log(`OK: sw-precache.json shell-only (${assets.length} urls)`);
  }
} catch (err) {
  console.error('FAIL reading sw-precache.json', err);
  failed = true;
}

try {
  const sw = await readFile(path.join(distDir, 'sw.js'), 'utf8');
  if (!sw.includes('schoolix-shell-v15')) {
    console.error('FAIL sw.js: expected SHELL_CACHE schoolix-shell-v15');
    failed = true;
  }
  if (!sw.includes('never persist hashed') && !sw.includes('Hard guard: never persist hashed')) {
    console.error('FAIL sw.js: missing hashed-asset cache guard');
    failed = true;
  } else {
    console.log('OK: sw.js rejects hashed /assets cache');
  }
} catch (err) {
  console.error('FAIL reading sw.js', err);
  failed = true;
}

const apkPath = path.join(distDir, 'downloads', 'schoolixiq.apk');
try {
  await readFile(apkPath);
  console.log('OK: dist/downloads/schoolixiq.apk present');
} catch {
  console.warn(
    'WARN: No APK at dist/downloads/schoolixiq.apk — run npm run stage:apk or set ANDROID_APK_DOWNLOAD_URL for CI deploy',
  );
}

if (failed) {
  process.exit(1);
}

console.log(`OK: ${jsFiles.length} bundles — no legacy Google auth patterns`);
