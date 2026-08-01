/**
 * Ensure backend/node_modules exists before esbuild.
 * Prefers npm ci; falls back to npm install; skips if esbuild already present.
 */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.join(__dirname, '..', 'backend');
const esbuildBin = path.join(backendDir, 'node_modules', 'esbuild');

function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });
  return result.status === 0;
}

if (existsSync(esbuildBin) && process.env.FORCE_BACKEND_NPM_CI !== '1') {
  console.log('OK: backend dependencies already present (esbuild)');
  process.exit(0);
}

console.log('Installing backend dependencies (npm ci)...');
if (run('npm', ['ci', '--prefix', 'backend'])) {
  process.exit(0);
}

console.warn('WARN: npm ci failed — retrying with npm install --prefix backend');
if (run('npm', ['install', '--prefix', 'backend'])) {
  process.exit(0);
}

console.error('FAIL: could not install backend dependencies');
process.exit(1);
