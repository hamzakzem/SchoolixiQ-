import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const distAssets = path.resolve('dist/assets');
const forbidden = [
  'iframerpc',
  'idpiframe',
  'platform.js',
  'gapi.auth2',
  'gsi/client',
  'signInWithRedirect',
  '@codetrix-studio/capacitor-google-auth',
];

const files = await readdir(distAssets);
const jsFiles = files.filter((f) => f.endsWith('.js'));
let failed = false;

for (const file of jsFiles) {
  const content = await readFile(path.join(distAssets, file), 'utf8');
  for (const pattern of forbidden) {
    if (content.includes(pattern)) {
      console.error(`FAIL ${file}: contains "${pattern}"`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log(`OK: ${jsFiles.length} bundles — no legacy Google auth patterns`);
