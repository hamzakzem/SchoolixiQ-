import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const distDir = path.resolve('dist');

/**
 * Precache shell/static only — never hashed Vite chunks under /assets/*.
 * Hashed JS/CSS must always be network-fetched to avoid post-deploy white screens.
 */
const assets = [
  '/index.html',
  '/manifest.json',
  '/brand/schoolixiq-logo.png',
  '/favicon.ico',
  '/icon.svg',
];

const payload = {
  version: 15,
  updatedAt: new Date().toISOString(),
  assets,
};

const outPath = path.join(distDir, 'sw-precache.json');
await writeFile(outPath, JSON.stringify(payload, null, 2), 'utf8');
console.log(`[stage-sw-shell] wrote ${assets.length} precache assets -> dist/sw-precache.json`);
