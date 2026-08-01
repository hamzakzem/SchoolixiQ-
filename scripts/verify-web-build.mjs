import { access, readdir, readFile } from 'node:fs/promises';
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
const cssFiles = files.filter((f) => f.endsWith('.css'));
let failed = false;

async function mustExist(relFromDist, label) {
  const full = path.join(distDir, relFromDist.replace(/^\//, ''));
  try {
    await access(full);
    return true;
  } catch {
    console.error(`FAIL missing ${label || 'file'}: ${relFromDist}`);
    failed = true;
    return false;
  }
}

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

// Every asset referenced by index.html must exist on disk
const indexAssetRefs = [
  ...indexHtml.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g),
].map((m) => m[1]);
if (indexAssetRefs.length === 0) {
  console.error('FAIL index.html: no /assets/* references');
  failed = true;
} else {
  for (const ref of indexAssetRefs) {
    await mustExist(ref, 'index.html asset');
  }
  console.log(`OK: index.html references ${indexAssetRefs.length} assets (all present)`);
}

const entryMatch = indexHtml.match(/src="(\/assets\/index-[^"]+\.js)"/);
if (!entryMatch) {
  console.error('FAIL index.html: missing entry script');
  failed = true;
} else {
  const entryPath = entryMatch[1].replace(/^\//, '');
  try {
    const entryContent = await readFile(path.join(distDir, entryPath), 'utf8');
    console.log(`OK: entry bundle -> ${entryMatch[1]}`);

    // Collect absolute and relative hashed chunk refs from every JS bundle
    const needed = new Set();
    const absRe = /["'`](\/?assets\/[A-Za-z0-9_.-]+\.(?:js|css))["'`]/g;
    const relImportRe = /import\(["'`]\.\/([A-Za-z0-9_.-]+\.js)["'`]\)/g;

    for (const file of jsFiles) {
      const content = await readFile(path.join(distAssets, file), 'utf8');
      for (const m of content.matchAll(absRe)) {
        needed.add(m[1].replace(/^\//, ''));
      }
      for (const m of content.matchAll(relImportRe)) {
        needed.add(`assets/${m[1]}`);
      }
    }

    let missing = 0;
    for (const chunk of needed) {
      try {
        await access(path.join(distDir, chunk));
      } catch {
        console.error(`FAIL missing chunk referenced by bundles: ${chunk}`);
        failed = true;
        missing += 1;
      }
    }
    console.log(
      `OK: verified ${needed.size - missing}/${needed.size} hashed chunks referenced by JS bundles`,
    );

    const superAdminChunk = [...needed].find((c) => c.includes('SuperAdminDashboard-'));
    if (superAdminChunk) console.log(`OK: SuperAdminDashboard chunk -> ${superAdminChunk}`);
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
  const hashed = assets.filter(
    (a) => typeof a === 'string' && /^\/assets\/.+\.(js|mjs|css)(\?|$)/i.test(a),
  );
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
  if (!sw.includes('schoolix-shell-v16') && !sw.includes("schoolix-shell-${SW_VERSION}") && !sw.includes('v16')) {
    // Template uses SW_VERSION = 'v16' → schoolix-shell-v16 at runtime string
  }
  if (!sw.includes("const SW_VERSION = 'v16'") && !sw.includes('schoolix-shell-v16')) {
    console.error('FAIL sw.js: expected SW_VERSION v16');
    failed = true;
  } else {
    console.log('OK: sw.js version v16');
  }
  if (!sw.includes('never persist hashed') && !sw.includes('Hard guard: never persist hashed')) {
    console.error('FAIL sw.js: missing hashed-asset cache guard');
    failed = true;
  } else {
    console.log('OK: sw.js rejects hashed /assets cache');
  }
  if (!sw.includes('skipWaiting')) {
    console.error('FAIL sw.js: missing skipWaiting');
    failed = true;
  }
  if (!sw.includes('clients.claim')) {
    console.error('FAIL sw.js: missing clients.claim');
    failed = true;
  }
} catch (err) {
  console.error('FAIL reading sw.js', err);
  failed = true;
}

try {
  const htaccess = await readFile(path.join(distDir, '.htaccess'), 'utf8');
  if (!/Cache-Control.*no-cache/i.test(htaccess) || !htaccess.includes('index.html')) {
    console.error('FAIL .htaccess: index.html must be no-cache');
    failed = true;
  } else {
    console.log('OK: .htaccess no-cache for index.html');
  }
  const assetsHt = await readFile(path.join(distDir, 'assets/.htaccess'), 'utf8');
  if (!assetsHt.includes('immutable')) {
    console.error('FAIL assets/.htaccess: expected immutable cache');
    failed = true;
  } else {
    console.log('OK: assets/.htaccess immutable');
  }
} catch (err) {
  console.error('FAIL reading htaccess', err);
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

console.log(
  `OK: ${jsFiles.length} JS + ${cssFiles.length} CSS bundles — production integrity checks passed`,
);
