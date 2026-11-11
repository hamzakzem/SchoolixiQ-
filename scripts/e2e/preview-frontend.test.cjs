/**
 * Browser-level proof that a PREVIEW page never talks to the production Firebase project.
 * Builds the web app twice (default config = production project; and with a full VITE_FIREBASE_* override for a separate project),
 * serves each statically, and loads it in Chromium under the real preview host name (resolved to 127.0.0.1).
 *   node scripts/e2e/preview-frontend.test.cjs
 */
const { chromium } = require('playwright');
const { spawnSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const PREVIEW = 'yellowgreen-loris-564484.hostingersite.com';
const base = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
let pass = 0, fail = 0;
const T = (n, c, i = '') => { console.log(c ? 'PASS' : 'FAIL', n, i); c ? pass++ : fail++; };

function build(outDir, extraEnv) {
  const r = spawnSync('npx', ['vite', 'build', '--outDir', outDir, '--emptyOutDir'], { env: { ...process.env, ...extraEnv }, encoding: 'utf8' });
  if (r.status !== 0) throw new Error('build failed: ' + (r.stderr || r.stdout).slice(-400));
}
function serve(dir, port) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = path.join(dir, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(dir) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(dir, 'index.html');
      res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(res);
    }).listen(port, '127.0.0.1', () => resolve(srv));
  });
}
const FIREBASE_HOSTS = /(firestore|identitytoolkit|securetoken|firebasestorage|firebaseinstallations|firebase|fcmregistrations)\.googleapis\.com|firebaseio\.com|\.firebaseapp\.com|firebasestorage\.app/i;

async function visit(browser, url, hostMap) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await ctx.newPage();
  const urls = [];
  page.on('request', (r) => { urls.push(r.url() + ' ' + (r.postData() || '')); });
  await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(6000);
  const blocked = (await page.locator('[data-testid="preview-blocked"]').count()) > 0;
  const text = (await page.locator('body').innerText().catch(() => '')).slice(0, 200);
  await ctx.close();
  return { urls, blocked, text };
}

(async () => {
  const outProd = '/tmp/claude-0/web-prod', outOverride = '/tmp/claude-0/web-override';
  build(outProd, {});
  build(outOverride, { VITE_FIREBASE_API_KEY: 'AIzaFAKE-preview-key-for-test', VITE_FIREBASE_AUTH_DOMAIN: 'preview-test-project.firebaseapp.com', VITE_FIREBASE_PROJECT_ID: 'preview-test-project', VITE_FIREBASE_STORAGE_BUCKET: 'preview-test-project.firebasestorage.app', VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789', VITE_FIREBASE_APP_ID: '1:123456789:web:fake' });
  const s1 = await serve(outProd, 4871), s2 = await serve(outOverride, 4872);
  const browser = await chromium.launch({ args: [`--host-resolver-rules=MAP ${PREVIEW} 127.0.0.1`] });

  // 1. preview host + default (production) config
  let r = await visit(browser, `http://${PREVIEW}:4871/`);
  const fbReq = r.urls.filter((u) => FIREBASE_HOSTS.test(u));
  T('preview host + production config: the page is BLOCKED with an explicit message (nothing loads)', r.blocked, r.text.slice(0, 60));
  T('…no request at all reaches a Firebase/Google API host', fbReq.length === 0, fbReq.slice(0, 2).join(' | '));
  T('…and the production project id / API key never appear in any request', !r.urls.some((u) => u.includes(base.projectId) && !u.startsWith('http://' + PREVIEW) ) && !r.urls.some((u) => base.apiKey && u.includes(base.apiKey)));

  // 2. control: the same build on a non-preview host (the check really would see Firebase traffic)
  r = await visit(browser, `http://127.0.0.1:4871/`);
  T('control: the SAME build served on a non-preview host is not blocked and does talk to Firebase (so the test above is meaningful)', !r.blocked && r.urls.some((u) => FIREBASE_HOSTS.test(u)));

  // 3. preview host + separate project config
  r = await visit(browser, `http://${PREVIEW}:4872/`);
  T('preview host + complete VITE_FIREBASE_* override for a separate project: the app loads (not blocked)', !r.blocked);
  T('…it talks to the separate project (override API key / project) and never to the production project', r.urls.some((u) => u.includes('AIzaFAKE-preview-key-for-test') || u.includes('preview-test-project')) && !r.urls.some((u) => base.apiKey && u.includes(base.apiKey)) && !r.urls.some((u) => u.includes('/projects/' + base.projectId) || u.includes('key=' + base.apiKey)));
  await browser.close(); s1.close(); s2.close();
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
