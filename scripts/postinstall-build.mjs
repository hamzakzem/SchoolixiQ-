/**
 * Build the production release right after `npm install`.
 *
 * Hostinger's default Express settings run only `npm install` and then start
 * `server.js` (no build command), so without this the deployed site would
 * never be rebuilt. Set SKIP_POSTINSTALL_BUILD=1 to skip (CI builds explicitly).
 */
import { spawnSync } from 'child_process';

const skip = ['1', 'true', 'yes'].includes(String(process.env.SKIP_POSTINSTALL_BUILD || '').toLowerCase());
if (skip || process.env.npm_config_global === 'true') {
  console.log('[postinstall] build skipped');
  process.exit(0);
}

console.log('[postinstall] running npm run build');
const result = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(result.status ?? 1);
