/**
 * Copy Hostinger/Node production entry artifacts into dist/.
 * Required so `npm start` → `node dist/server.mjs` can boot after build:server.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist');
const backendDir = path.join(root, 'backend');

const required = [
  ['server.mjs', path.join(backendDir, 'server.mjs'), path.join(distDir, 'server.mjs')],
  [
    'firebase-applet-config.json',
    path.join(backendDir, 'firebase-applet-config.json'),
    path.join(distDir, 'firebase-applet-config.json'),
  ],
];

fs.mkdirSync(distDir, { recursive: true });

for (const [label, src, dest] of required) {
  if (!fs.existsSync(src)) {
    console.error(`FAIL: missing ${label} at ${src}`);
    process.exit(1);
  }
  fs.copyFileSync(src, dest);
  console.log(`OK: staged ${path.relative(root, dest)}`);
}

if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.warn(
    'WARN: dist/index.html missing — run build:web before start, or use npm run build:full',
  );
}

console.log('OK: Hostinger Node entry artifacts staged into dist/');
