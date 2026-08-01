/**
 * Post-deploy HTTP health gate.
 * Usage:
 *   PRODUCTION_HEALTH_URL=https://schoolixiq.com npm run verify:deploy-health
 *
 * Marks the release failed (exit 1) if homepage or SPA routes are not HTTP 200.
 */
const base = String(
  process.env.PRODUCTION_HEALTH_URL || process.env.APP_URL || 'https://schoolixiq.com',
)
  .trim()
  .replace(/\/$/, '');

const routes = String(process.env.PRODUCTION_HEALTH_ROUTES || '/,/login')
  .split(',')
  .map((r) => r.trim())
  .filter(Boolean);

const timeoutMs = Number(process.env.PRODUCTION_HEALTH_TIMEOUT_MS || 20000);
const retries = Number(process.env.PRODUCTION_HEALTH_RETRIES || 3);
const retryDelayMs = Number(process.env.PRODUCTION_HEALTH_RETRY_MS || 5000);

if (!base || !/^https?:\/\//i.test(base)) {
  console.error(
    'FAIL: PRODUCTION_HEALTH_URL (or APP_URL) must be an absolute http(s) URL',
  );
  process.exit(1);
}

async function probe(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { Accept: 'text/html,application/xhtml+xml' },
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

let failed = false;

for (const route of routes) {
  const path = route.startsWith('/') ? route : `/${route}`;
  const url = `${base}${path}`;
  let ok = false;
  let lastStatus = 'n/a';
  let lastError = '';

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await probe(url);
      lastStatus = String(res.status);
      if (res.status === 200) {
        const body = await res.text();
        if (body.includes('id="root"') || body.includes("id='root'")) {
          ok = true;
          console.log(`OK: ${url} -> HTTP 200 (SPA shell)`);
          break;
        }
        lastError = 'response missing #root';
      } else {
        lastError = `HTTP ${res.status}`;
      }
    } catch (err) {
      lastError = err?.message || String(err);
    }
    if (attempt < retries) {
      console.warn(
        `RETRY ${attempt}/${retries}: ${url} (${lastError || lastStatus})`,
      );
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }
  }

  if (!ok) {
    console.error(`FAIL: ${url} — ${lastError || lastStatus}`);
    failed = true;
  }
}

if (failed) {
  console.error('BLOCKED: post-deploy health check failed — mark deployment failed');
  process.exit(1);
}

console.log('OK: post-deploy health check passed');
