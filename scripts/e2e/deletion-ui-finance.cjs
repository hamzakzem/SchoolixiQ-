/** UI: admin cancels a payment from the Tuition settings modal (reason + confirm), ledger re-allocated; Super Admin sees deleted-school panel.
 *  node scripts/e2e/deletion-ui-finance.cjs http://localhost:3500 */
const { chromium } = require('playwright');
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8085';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'yala-safari-iq' });
const db = admin.firestore();
const BASE = process.argv[2] || 'http://localhost:3500';
let pass = 0, fail = 0;
const T = (n, c) => { console.log(c ? 'PASS' : 'FAIL', n); c ? pass++ : fail++; };
async function login(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="email"]', { timeout: 30000 });
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"], input[placeholder*="كلمة"]').first().fill('Test@12345');
  const cap = page.locator('input[type="number"]').first();
  if (await cap.count()) {
    const text = await cap.evaluate((el) => { let n = el; for (let i = 0; i < 5 && n; i++) { if (/\d+\s*\+\s*\d+/.test(n.textContent || '')) return n.textContent; n = n.parentElement; } return ''; });
    const m = /(\d+)\s*\+\s*(\d+)/.exec(text || ''); if (m) await cap.fill(String(+m[1] + +m[2]));
  }
  await page.keyboard.press('Enter');
  await page.waitForTimeout(8000);
}
(async () => {
  const id = Date.now().toString(36);
  const now = admin.firestore.Timestamp.now();
  const tmpl = await db.doc('students/ST1').get();
  const sid = 'UIFIN' + id;
  await db.doc('students/' + sid).set({ ...tmpl.data(), name: 'طالب إلغاء دفعة', tuitionBalance: 100, totalTuition: 200 });
  await db.doc(`installments/${sid}_1`).set({ schoolId: 'S1', studentId: sid, amount: 100, status: 'paid', paidAmount: 100, dueDate: new Date(2026, 1, 1).toISOString() });
  await db.doc(`installments/${sid}_2`).set({ schoolId: 'S1', studentId: sid, amount: 100, status: 'pending', dueDate: new Date(2026, 2, 1).toISOString() });
  await db.doc(`payments/${sid}_p`).set({ schoolId: 'S1', studentId: sid, studentName: 'طالب إلغاء دفعة', amount: 100, receiptNumber: 'UI-' + id, installmentIds: [`${sid}_1`], createdAt: now });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar' });
  const page = await ctx.newPage();
  await login(page, 'admin@e2e.test');
  await page.locator('.sx-ds-nav-item:has-text("الأقساط")').first().click();
  await page.waitForTimeout(3000);
  await page.locator('button:has-text("إعدادات الرسوم")').first().click();
  await page.waitForTimeout(1500);
  await page.locator('[data-testid="void-payments"] summary').click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/claude-0/fin_ui_1.png' });
  const row = page.locator('[data-testid="void-payments"] div:has-text("UI-' + id + '")').last();
  T('payment appears in the cancel list', (await page.locator('[data-testid="void-payments"]').innerText()).includes('UI-' + id));
  await page.locator('[data-testid="void-payments"] div.flex:has-text("UI-' + id + '") button:has-text("إلغاء الدفعة")').first().click();
  const confirmBtn = page.locator('[data-testid="void-confirm"]');
  T('confirm button disabled until a reason is typed', await confirmBtn.isDisabled());
  await page.locator('[data-testid="void-reason"]').fill('دفعة مكررة من واجهة الاختبار');
  await confirmBtn.click();
  await page.waitForTimeout(4000);
  const pay = (await db.doc(`payments/${sid}_p`).get()).data();
  const i1 = (await db.doc(`installments/${sid}_1`).get()).data();
  T('UI void: payment kept (amount, receipt) and marked voided with the reason', pay.status === 'voided' && pay.amount === 100 && pay.receiptNumber === 'UI-' + id && pay.voidReason.includes('مكررة'));
  T('UI void: installment re-allocated to pending and student balance back to 0', i1.status === 'pending' && i1.paidAmount === 0 && (await db.doc('students/' + sid).get()).get('tuitionBalance') === 0);
  T('UI void logged in deletion_logs', (await db.collection('deletion_logs').where('recordId', '==', `${sid}_p`).where('action', '==', 'VOID_PAYMENT').where('result', '==', 'success').get()).size === 1);
  await ctx.close();

  // Super admin: deleted school panel
  const sch = 'UISCH' + id;
  await db.doc('schools/' + sch).set({ name: 'مدرسة لواجهة الحذف ' + id, status: 'active' });
  await db.doc('students/' + sch + '_s').set({ schoolId: sch, name: 'x', createdAt: now });
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar' });
  const p2 = await ctx2.newPage();
  await login(p2, 'super@e2e.test');
  const sidAdm = (await admin.auth().getUserByEmail('super@e2e.test')).uid;
  const tok = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=x', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'super@e2e.test', password: 'Test@12345', returnSecureToken: true }) })).json();
  const r = await fetch(BASE + '/api/records/delete-school', { method: 'POST', headers: { Authorization: 'Bearer ' + tok.idToken, 'content-type': 'application/json' }, body: JSON.stringify({ schoolId: sch, mode: 'trash', confirmSchoolId: sch, confirmName: 'مدرسة لواجهة الحذف ' + id, confirmText: 'حذف المدرسة' }) });
  T('school deleted through the API (setup)', r.status === 200);
  await p2.reload(); await p2.waitForTimeout(6000);
  await p2.locator('.sx-ds-nav-item:has-text("المدارس"), [id*="schools"]').first().click().catch(() => {});
  await p2.waitForTimeout(3000);
  await p2.screenshot({ path: '/tmp/claude-0/fin_ui_2.png' });
  T('Super Admin sees the deleted school in the platform recycle panel', (await p2.locator('[data-testid="school-bundles"]').innerText().catch(() => '')).includes('مدرسة لواجهة الحذف ' + id));
  await p2.locator('[data-testid="school-bundles"] div:has-text("مدرسة لواجهة الحذف ' + id + '") button:has-text("استعادة")').last().click();
  await p2.waitForTimeout(5000);
  T('restore from the panel brings the school and its student back', (await db.doc('schools/' + sch).get()).exists && (await db.doc('students/' + sch + '_s').get()).exists);
  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
