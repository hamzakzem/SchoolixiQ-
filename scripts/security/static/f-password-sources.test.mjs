// F (source side). Static detection of code paths that persist or reuse plaintext passwords.
// Reads repository source files only; no emulator, no network, no data.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const src = (p) => readFileSync(path.join(root, p), 'utf8');
const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;

describe('F. Password storage (source code)', () => {
  it('[F3.1][H7] the public registration form does not persist a password into Firestore (src/views/Login.tsx)', () => {
    const s = src('src/views/Login.tsx');
    const formDecl = s.search(/const \[subscriptionForm, setSubscriptionForm\] = useState\(\{[\s\S]{0,400}?password:/);
    const persisted = s.search(/addDoc\(collection\(db, "registrations"\)[\s\S]{0,800}?customerInfo: subscriptionForm/);
    assert.ok(!(formDecl >= 0 && persisted >= 0),
      `SECURITY EXPECTATION VIOLATED — subscriptionForm holds a password (line ${lineOf(s, formDecl)}) and is stored as registrations.customerInfo (line ${lineOf(s, persisted)})`);
  });

  it('[F3.2][H7] school activation does not reuse a stored plaintext password (src/lib/auth/schoolActivation.ts)', () => {
    const s = src('src/lib/auth/schoolActivation.ts');
    const i = s.search(/request\.password\s*\|\|[\s\S]{0,120}customerInfo\.password/);
    assert.ok(i < 0, `SECURITY EXPECTATION VIOLATED — activation reads stored request/customerInfo password (line ${lineOf(s, i)})`);
  });

  it('[F3.3][H7] the super admin dashboard does not read stored registration passwords (src/views/SuperAdminDashboard.tsx)', () => {
    const s = src('src/views/SuperAdminDashboard.tsx');
    const i = s.search(/customerInfo\?\.password/);
    assert.ok(i < 0, `SECURITY EXPECTATION VIOLATED — dashboard reads customerInfo.password (line ${lineOf(s, i)})`);
  });

  it('[F3.4] server logging statements never interpolate a raw password value (server.ts)', () => {
    const s = src('server.ts');
    const offenders = [];
    for (const [n, line] of s.split('\n').entries()) {
      if (!/console\.(log|info|warn|error)\(/.test(line)) continue;
      // `${!!x.password}` (a boolean) is fine; any other interpolation / argument of a password is not.
      if (/password/i.test(line.replace(/!!\s*[\w.]*password/gi, ''))
        && /(\$\{[^}]*password[^}]*\}|,\s*[\w.]*password\b)/i.test(line.replace(/!!\s*[\w.]*password/gi, ''))) offenders.push(`server.ts:${n + 1}`);
      if (/console\.(log|info|warn|error)\([^)]*req\.body/.test(line)) offenders.push(`server.ts:${n + 1} (logs req.body)`);
    }
    assert.deepEqual(offenders, [], `password-bearing values in log statements: ${offenders.join(', ')}`);
  });

  it('[F3.5] audit logging of create-user never includes the password', () => {
    const s = src('server.ts');
    const m = s.match(/logAudit\(req, 'CREATE_USER', \{[^\n]*\}/);
    assert.ok(m, 'CREATE_USER audit call not found');
    assert.ok(!/password/i.test(m[0]), `CREATE_USER audit payload references a password: ${m[0]}`);
  });
});
