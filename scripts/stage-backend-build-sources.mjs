/**
 * Stage root backend entry files into backend/ before esbuild.
 * Used by npm run build:server locally; Docker copies the same files explicitly.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const backendDir = path.join(root, 'backend');

const pairs = [
  ['server.ts', 'server.ts'],
  ['notificationPushDispatch.ts', 'notificationPushDispatch.ts'],
  ['firebase-applet-config.json', 'firebase-applet-config.json'],
];

for (const [srcName, destName] of pairs) {
  const src = path.join(root, srcName);
  const dest = path.join(backendDir, destName);
  if (!fs.existsSync(src)) {
    console.error(`FAIL: missing ${srcName} at ${src}`);
    process.exit(1);
  }
  fs.copyFileSync(src, dest);
}

console.log('OK: staged backend build sources into backend/');
