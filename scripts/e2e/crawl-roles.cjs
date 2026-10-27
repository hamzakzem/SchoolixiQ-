/**
 * Log in as every seeded role and open every dashboard tab, recording page
 * errors, console errors (incl. Firestore permission-denied) and failed API
 * responses. Usage: node scripts/e2e/crawl-roles.cjs <baseUrl> <outDir> [role...]
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.argv[2] || 'http://localhost:3500';
const OUT = process.argv[3] || '/tmp/e2e-out';
const ONLY = process.argv.slice(4);
const PASSWORD = 'Test@12345';
const ROLES = {
  superadmin: 'super@e2e.test',
  platform_assistant: 'passist@e2e.test',
  admin: 'admin@e2e.test',
  school_assistant: 'sassist@e2e.test',
  staff: 'staff@e2e.test',
  teacher: 'teacher@e2e.test',
  parent: 'parent@e2e.test',
  guard: 'guard@e2e.test',
  distributor: 'dist@e2e.test',
};

const NOISE = [
  /Sentry error tracking is disabled/i,
  /googletagmanager|gtag/i,
  /Download the React DevTools/i,
  /ERR_TUNNEL_CONNECTION_FAILED|net::ERR_/i,
  /fonts\.(googleapis|gstatic)/i,
  /Failed to load resource: the server responded with a status of 404 \(Not Found\).*favicon/i,
];
const isNoise = (t) => NOISE.some((r) => r.test(t));

const NAV_SELECTORS = [
  '.sx-ds-nav-item',
  '[data-tab-id]',
  'aside nav button',
  'nav[aria-label] button',
  '[role="tablist"] [role="tab"]',
];

async function login(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="email"]', { timeout: 30000 });
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"], input[placeholder*="كلمة"]').first().fill(PASSWORD);
  const captcha = page.locator('input[type="number"]').first();
  if (await captcha.count()) {
    const text = await captcha.evaluate((el) => {
      let node = el;
      for (let i = 0; i < 5 && node; i++) {
        if (/\d+\s*\+\s*\d+/.test(node.textContent || '')) return node.textContent;
        node = node.parentElement;
      }
      return '';
    });
    const m = /(\d+)\s*\+\s*(\d+)/.exec(text || '');
    if (m) await captcha.fill(String(Number(m[1]) + Number(m[2])));
  }
  // The login button is a plain <button> inside the form; Enter submits it.
  await page.keyboard.press('Enter');
}

async function visibleNavButtons(page) {
  for (const sel of NAV_SELECTORS) {
    const items = page.locator(sel);
    const n = await items.count();
    const visible = [];
    for (let i = 0; i < n; i++) {
      if (await items.nth(i).isVisible().catch(() => false)) visible.push(i);
    }
    if (visible.length >= 2) return { sel, indices: visible };
  }
  return { sel: null, indices: [] };
}

async function crawlRole(browser, role, email) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar' });
  const page = await context.newPage();
  const events = [];
  let current = 'login';
  page.on('pageerror', (e) => events.push({ tab: current, type: 'pageerror', text: e.message.slice(0, 400) }));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (!isNoise(t)) events.push({ tab: current, type: 'console', text: t.slice(0, 400) });
  });
  page.on('response', (r) => {
    const u = r.url();
    if (r.status() >= 400 && u.startsWith(BASE) && u.includes('/api/')) {
      events.push({ tab: current, type: 'http', text: `${r.status()} ${r.request().method()} ${u.replace(BASE, '')}` });
    }
  });

  const result = { role, email, loggedIn: false, tabs: [], events };
  try {
    await login(page, email);
    await page.waitForTimeout(8000);
    const url = page.url();
    const bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 300);
    result.landing = { url: url.replace(BASE, ''), text: bodyText.replace(/\s+/g, ' ') };
    result.loggedIn = !/\/login/.test(url) || !(await page.locator('input[type="email"]').count());
    current = 'landing';
    await page.screenshot({ path: path.join(OUT, `${role}__00_landing.png`) });

    const { sel, indices } = await visibleNavButtons(page);
    result.navSelector = sel;
    for (let k = 0; k < indices.length; k++) {
      const btn = page.locator(sel).nth(indices[k]);
      const label = ((await btn.innerText().catch(() => '')) || `tab${k}`).replace(/\s+/g, ' ').trim().slice(0, 40);
      current = label;
      const before = events.length;
      try {
        await btn.click({ timeout: 5000 });
      } catch (e) {
        events.push({ tab: label, type: 'click', text: e.message.slice(0, 200) });
        continue;
      }
      await page.waitForTimeout(3000);
      const crashed = await page.locator('text=/حدث خطأ غير متوقع|Something went wrong|عذراً، حدث خطأ/').count();
      await page.screenshot({ path: path.join(OUT, `${role}__${String(k + 1).padStart(2, '0')}.png`) });
      result.tabs.push({ label, newEvents: events.length - before, crashed: crashed > 0 });
    }
  } catch (e) {
    events.push({ tab: current, type: 'fatal', text: e.message.slice(0, 400) });
  }
  await context.close();
  return result;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const report = [];
  for (const [role, email] of Object.entries(ROLES)) {
    if (ONLY.length && !ONLY.includes(role)) continue;
    const r = await crawlRole(browser, role, email);
    report.push(r);
    console.log(`== ${role}: loggedIn=${r.loggedIn} tabs=${r.tabs.length} events=${r.events.length} landing=${r.landing && r.landing.url}`);
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
})();
