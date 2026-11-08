import assert from 'node:assert/strict';
import { cronSecretMatches } from '../../backend/cronSecret.mjs';
const cases = [
  ['exact match', 's3cret-Value', 's3cret-Value', true],
  ['wrong value same length', 's3cret-Valuf', 's3cret-Value', false],
  ['shorter', 's3cret', 's3cret-Value', false],
  ['longer', 's3cret-Value-extra', 's3cret-Value', false],
  ['missing header', undefined, 's3cret-Value', false],
  ['empty header', '', 's3cret-Value', false],
  ['array header (first used)', ['s3cret-Value'], 's3cret-Value', true],
  ['array header wrong', ['bad', 's3cret-Value'], 's3cret-Value', false],
  ['non-string header', 12345, 's3cret-Value', false],
  ['server secret unset', 'anything', undefined, false],
  ['server secret empty', '', '', false],
  ['oversized header', 'a'.repeat(100000), 's3cret-Value', false],
  ['unicode', 'سر-سري', 'سر-سري', true],
];
let bad = 0;
for (const [n, given, secret, want] of cases) {
  let got; try { got = cronSecretMatches(given, secret); } catch (e) { got = 'THROW ' + e.message; }
  const ok = got === want; if (!ok) bad++;
  console.log(ok ? 'PASS' : 'FAIL', n);
}
assert.equal(bad, 0); console.log(`\n${cases.length - bad}/${cases.length} passed`);
