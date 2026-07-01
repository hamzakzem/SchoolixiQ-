import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const serverMjs = path.join(root, 'backend', 'server.mjs');
const backendPkg = path.join(root, 'backend', 'package.json');

const forbidden = [
  '@capacitor/',
  '@codetrix-studio/capacitor-google-auth',
  'react',
  'vite',
];

let failed = false;

if (!fs.existsSync(serverMjs)) {
  console.error('FAIL: backend/server.mjs missing — run: cd backend && npm ci && npm run build');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(backendPkg, 'utf8'));
const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
for (const dep of Object.keys(allDeps)) {
  const blocked = forbidden.some(
    (f) => dep === f || dep.startsWith(f) || dep.includes('capacitor'),
  );
  if (blocked) {
    console.error(`FAIL: forbidden backend dependency: ${dep}`);
    failed = true;
  }
}

const bundle = fs.readFileSync(serverMjs, 'utf8');
if (bundle.includes('capacitor-google-auth')) {
  console.error('FAIL: server bundle references capacitor-google-auth');
  failed = true;
}

const requiredRoutes = [
  '/api/admin/delete-user',
  '/api/admin/schools/:schoolId/permanent-delete',
  '/api/admin/distributors/generate-monthly-commissions',
  '/api/admin/distributors/commissions/:commissionId/mark-paid',
];
for (const route of requiredRoutes) {
  if (!bundle.includes(route)) {
    console.error(`FAIL: server bundle missing route ${route}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log('OK: backend build verified — no Capacitor/mobile deps in backend package or bundle');
