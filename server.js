/**
 * Production entry for hosts that start `node server.js` (Hostinger default
 * Express settings). The real server is the bundled dist/server.mjs, built by
 * `npm run build` — normally right after `npm install` (postinstall). If the
 * host starts the app without that build output, build it here first.
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const root = path.dirname(fileURLToPath(import.meta.url));
const entry = path.join(root, 'dist', 'server.mjs');
const indexHtml = path.join(root, 'dist', 'index.html');

if (!fs.existsSync(entry) || !fs.existsSync(indexHtml)) {
  console.warn('[server.js] dist/ build output missing — running npm run build:full');
  const result = spawnSync('npm', ['run', 'build:full'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, SKIP_POSTINSTALL_BUILD: '1' },
  });
  if (result.status !== 0 || !fs.existsSync(entry)) {
    console.error('FAIL: could not build dist/server.mjs');
    process.exit(1);
  }
}

process.env.NODE_ENV ||= 'production';

// No top-level await: Hostinger (LiteSpeed lsnode) loads this file with
// require(), which rejects ES modules that use top-level await.
import('./dist/server.mjs').catch((error) => {
  console.error('FAIL: could not start dist/server.mjs', error);
  process.exit(1);
});
