/**
 * Stage schoolixiq.apk into dist/downloads for Hostinger deploy.
 *
 * Sources (first match wins):
 *  1. public/downloads/schoolixiq.apk (local or copied into CI workspace)
 *  2. dist/downloads/schoolixiq.apk (already present, e.g. from vite public copy)
 *  3. ANDROID_APK_DOWNLOAD_URL env (CI secret — direct HTTPS URL to the APK file)
 *
 * Pass --require to exit 1 when no APK could be staged (deploy pipeline).
 */
import { mkdir, copyFile, access, stat, unlink } from 'node:fs/promises';
import { constants, createWriteStream } from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const requireApk = process.argv.includes('--require');
const publicApk = path.resolve('public/downloads/schoolixiq.apk');
const distDir = path.resolve('dist/downloads');
const distApk = path.join(distDir, 'schoolixiq.apk');
const downloadUrl = String(process.env.ANDROID_APK_DOWNLOAD_URL || '').trim();

const MIN_APK_BYTES = 1_000_000;

async function readable(pathname) {
  try {
    await access(pathname, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function assertValidApk(filePath) {
  const info = await stat(filePath);
  if (!info.isFile() || info.size < MIN_APK_BYTES) {
    throw new Error(
      `Invalid APK at ${filePath}: expected a file >= ${MIN_APK_BYTES} bytes, got ${info.size}`,
    );
  }
  return info.size;
}

async function copyApk(from) {
  await mkdir(distDir, { recursive: true });
  await copyFile(from, distApk);
  const size = await assertValidApk(distApk);
  console.log(`OK: staged APK from ${from} (${size} bytes) -> dist/downloads/schoolixiq.apk`);
}

async function downloadApk(url) {
  await mkdir(distDir, { recursive: true });
  const tmpPath = `${distApk}.part`;

  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok || !response.body) {
    throw new Error(`ANDROID_APK_DOWNLOAD_URL failed: HTTP ${response.status}`);
  }

  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('text/html')) {
    throw new Error(
      'ANDROID_APK_DOWNLOAD_URL returned HTML, not an APK — check the direct file URL',
    );
  }

  const nodeStream = Readable.fromWeb(response.body);
  await pipeline(nodeStream, createWriteStream(tmpPath));
  await copyFile(tmpPath, distApk);
  await unlink(tmpPath).catch(() => {});

  const size = await assertValidApk(distApk);
  console.log(`OK: downloaded APK (${size} bytes) -> dist/downloads/schoolixiq.apk`);
}

async function main() {
  if (await readable(publicApk)) {
    await copyApk(publicApk);
    return;
  }

  if (await readable(distApk)) {
    const size = await assertValidApk(distApk);
    console.log(`OK: dist/downloads/schoolixiq.apk already present (${size} bytes)`);
    return;
  }

  if (downloadUrl) {
    console.log('Fetching APK from ANDROID_APK_DOWNLOAD_URL...');
    await downloadApk(downloadUrl);
    return;
  }

  const message =
    'No APK available to stage. Add public/downloads/schoolixiq.apk locally, or set GitHub secret ANDROID_APK_DOWNLOAD_URL to a direct HTTPS APK URL.';

  if (requireApk) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }

  console.warn(`WARN: ${message}`);
}

main().catch((error) => {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
