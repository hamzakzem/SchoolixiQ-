import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const distDir = path.resolve('dist');
const indexPath = path.join(distDir, 'index.html');

const indexHtml = await readFile(indexPath, 'utf8');
const assetRefs = [
  ...indexHtml.matchAll(/(?:src|href)="(\/(?:assets\/[^"]+|[^"]+\.(?:css|js|ico|png|svg|webp)))"/g),
].map((m) => m[1]);

const staticShell = [
  '/index.html',
  '/manifest.json',
  '/brand/schoolixiq-logo.png',
  '/favicon.ico',
];

const assets = [...new Set([...staticShell, ...assetRefs])];
const payload = {
  version: 12,
  updatedAt: new Date().toISOString(),
  assets,
};

const outPath = path.join(distDir, 'sw-precache.json');
await writeFile(outPath, JSON.stringify(payload, null, 2), 'utf8');
console.log(`[stage-sw-shell] wrote ${assets.length} precache assets -> dist/sw-precache.json`);
