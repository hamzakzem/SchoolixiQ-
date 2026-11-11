/** UI flow: admin deletes a student in the real UI, sees it in the recycle bin, restores it, deletes again and purges.
 *  Usage: node scripts/e2e/deletion-ui.cjs http://localhost:3500   (emulators seeded, server up, emulator-built web bundle) */
const { chromium } = require('playwright');
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8085';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'yala-safari-iq' });
const db = admin.firestore();
const BASE = process.argv[2] || 'http://localhost:3500';
let pass = 0, fail = 0;
const T = (n, c) => { console.log(c ? 'PASS' : 'FAIL', n); c ? pass++ : fail++; };

(async () => {
  const sid = 'UIDEL' + Date.now().toString(36);
  const tmpl = await db.doc('students/ST1').get();
  await db.doc('students/' + sid).set({ ...tmpl.data(), name: 'طالب واجهة الحذف', parentIds: [], studentCode: 'UI9999' });
  await db.doc('grades/' + sid + '_g').set({ studentId: sid, schoolId: 'S1', subject: 'math', score: 90 });
  const before = (await db.doc('schools/S1').get()).get('studentCount') || 0;

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar' });
  const page = await ctx.newPage();
  const apiCalls = [];
  page.on('response', async (r) => { if (r.url().includes('/api/records/')) { apiCalls.push(`${r.status()} ${r.url().split('/api/')[1]} ${(await r.text().catch(() => '')).slice(0, 300)}`); } });
  page.on('request', (r) => { if (r.url().includes('/api/records/')) apiCalls.push('REQ ' + r.postData()); });
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="email"]', { timeout: 30000 });
  await page.locator('input[type="email"]').first().fill('admin@e2e.test');
  await page.locator('input[type="password"], input[placeholder*="كلمة"]').first().fill('Test@12345');
  const cap = page.locator('input[type="number"]').first();
  if (await cap.count()) {
    const text = await cap.evaluate((el) => { let n = el; for (let i = 0; i < 5 && n; i++) { if (/\d+\s*\+\s*\d+/.test(n.textContent || '')) return n.textContent; n = n.parentElement; } return ''; });
    const m = /(\d+)\s*\+\s*(\d+)/.exec(text || ''); if (m) await cap.fill(String(+m[1] + +m[2]));
  }
  await page.keyboard.press('Enter');
  await page.waitForTimeout(8000);

  // open students tab, search the student, delete
  await page.locator('.sx-ds-nav-item:has-text("إدارة الطلاب")').first().click();
  await page.waitForTimeout(3000);
  const search = page.locator('main input[placeholder*="ابحث عن طالب"], input[placeholder="ابحث عن طالب..."]').first();
  await page.screenshot({ path: '/tmp/claude-0/del_ui_s.png' });
  const row = page.locator(`text=طالب واجهة الحذف`).first();
  T('student visible in the list', await row.count() > 0);
  await row.locator('xpath=ancestor::*[.//button[.//*[contains(@class,"lucide-ellipsis-vertical") or contains(@class,"lucide-more-vertical")]]][1]').locator('button:has(svg[class*="ellipsis-vertical"], svg[class*="more-vertical"])').first().click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/claude-0/del_ui_0.png' });
  await page.locator('text=حذف الطالب').first().click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/claude-0/del_ui_1.png' });
  await page.locator('button:has-text("نعم، احذف السجل")').last().click();
  await page.waitForTimeout(4000);
  const gone = !(await db.doc('students/' + sid).get()).exists;
  const bundles = await db.collection('recycle_bin').where('recordId', '==', sid).get();
  T('UI delete removed the student from Firestore', gone);
  T('UI delete created a trash bundle with the grade', bundles.size === 1 && !(await db.doc('grades/' + sid + '_g').get()).exists && bundles.docs[0].get('childCounts.grades') === 1);
  T('student count decreased', (await db.doc('schools/S1').get()).get('studentCount') === before - 1);
  const logs = await db.collection('deletion_logs').where('recordId', '==', sid).get();
  T('deletion logged', logs.size >= 1);
  console.log('api:', apiCalls.join(' | '));

  // recycle bin tab
  await page.locator('[data-tab-id="recycle_bin"], .sx-ds-nav-item:has-text("سلة")').first().click().catch(() => {});
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/claude-0/del_ui_2.png' });
  T('bin shows the student bundle', await page.locator('[data-testid="trash-bundles"]').locator('text=طالب واجهة الحذف').count() > 0);
  await page.locator('[data-testid="trash-bundles"] button:has-text("استعادة")').first().click();
  await page.waitForTimeout(4000);
  T('UI restore brings back student + grade', (await db.doc('students/' + sid).get()).exists && (await db.doc('grades/' + sid + '_g').get()).exists);
  // delete again via API-less path: use UI again is long; trash through engine and purge from UI

  // second round: delete again in the UI, then permanently delete from the bin with the typed confirmation
  await page.locator('.sx-ds-nav-item:has-text("إدارة الطلاب")').first().click();
  await page.waitForTimeout(3000);
  const row2 = page.locator('text=طالب واجهة الحذف').first();
  await row2.locator('xpath=ancestor::*[.//button[.//*[contains(@class,"lucide-ellipsis-vertical") or contains(@class,"lucide-more-vertical")]]][1]').locator('button:has(svg[class*="ellipsis-vertical"], svg[class*="more-vertical"])').first().click();
  await page.waitForTimeout(800);
  await page.locator('text=حذف الطالب').first().click();
  await page.locator('button:has-text("نعم، احذف السجل")').click();
  await page.waitForTimeout(4000);
  await page.locator('.sx-ds-nav-item:has-text("سلة")').first().click();
  await page.waitForTimeout(3000);
  await page.locator('[data-testid="trash-bundles"] button:has-text("حذف نهائي")').first().click();
  const okBtn = page.locator('button:has-text("حذف نهائياً")');
  T('permanent delete button disabled until the phrase is typed', await okBtn.isDisabled());
  await page.locator('[data-testid="purge-confirm-input"]').fill('حذف نهائي');
  await okBtn.click();
  await page.waitForTimeout(4000);
  const b2 = await db.collection('recycle_bin').where('recordId', '==', sid).get();
  T('purge from the UI: bundle purged and grade gone', b2.docs.some((d) => d.get('status') === 'purged') && !(await db.doc('grades/' + sid + '_g').get()).exists && !(await db.doc('students/' + sid).get()).exists);
  const pl = await db.collection('deletion_logs').where('recordId', '==', sid).get();
  T('purge logged as permanent', pl.docs.some((d) => /PERMANENT|PURGE/.test(d.get('action'))));
  await page.screenshot({ path: '/tmp/claude-0/del_ui_3.png' });
  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
