/**
 * Production entry for hosts that start `node server.js` (Hostinger default
 * Express settings). The real server is the bundled dist/server.mjs, built by
 * `npm run build` (also run automatically after `npm install`, see
 * scripts/postinstall-build.mjs).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(fileURLToPath(import.meta.url));
const entry = path.join(root, 'dist', 'server.mjs');

if (!fs.existsSync(entry)) {
  console.error('FAIL: dist/server.mjs is missing — run `npm run build` before starting.');
  process.exit(1);
}

process.env.NODE_ENV ||= 'production';
await import('./dist/server.mjs');
