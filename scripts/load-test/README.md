# SchoolixIQ Pre-Launch Load Tests

Production-safe load testing with tagged data (`loadTest: true`, `testRunId`).

**Full plan:** [docs/load-testing/PRELAUNCH_TEST_PLAN.md](../../docs/load-testing/PRELAUNCH_TEST_PLAN.md)

## Quick start

```bash
# 1. Config
cp scripts/load-test/config.example.json scripts/load-test/config.local.json
# Edit: apiKey, serviceAccountPath, baseUrl, environment

# 2. Set credentials (or use serviceAccountPath in config)
export FIREBASE_CLIENT_EMAIL="..."
export FIREBASE_PRIVATE_KEY="..."

# 3. Choose a run ID (unique per test)
export RUN_ID=prelaunch-20260603-smoke
```

---

## PART F — Exact commands

### Smoke (10 schools)

```bash
# Cleanup first (safe even if empty)
node scripts/load-test/cleanup-prelaunch-data.mjs --testRunId=$RUN_ID

# Seed
node scripts/load-test/seed-prelaunch-data.mjs --preset=smoke --testRunId=$RUN_ID

# Run k6 (PowerShell)
$env:K6_FIREBASE_API_KEY="YOUR_API_KEY"
$env:K6_FIREBASE_PROJECT_ID="yala-safari-iq"
$env:K6_BASE_URL="https://yala-safari-iq.web.app"
$env:K6_BACKEND_URL="https://yala-safari-iq.web.app"
$env:K6_TEST_RUN_ID=$RUN_ID
$env:K6_SKIP_WRITES="true"
$env:K6_CREDENTIALS_FILE="scripts/load-test/.runs/$RUN_ID/credentials.json"
k6 run scripts/load-test/k6/prelaunch-smoke-10.js

# Cleanup after
node scripts/load-test/cleanup-prelaunch-data.mjs --testRunId=$RUN_ID
```

### Load 100 schools

```bash
export RUN_ID=prelaunch-20260603-load100
node scripts/load-test/cleanup-prelaunch-data.mjs --testRunId=$RUN_ID
node scripts/load-test/seed-prelaunch-data.mjs --preset=load100 --testRunId=$RUN_ID
# ... same K6 env vars ...
k6 run scripts/load-test/k6/prelaunch-load-100.js
node scripts/load-test/cleanup-prelaunch-data.mjs --testRunId=$RUN_ID
```

### Stress 300

```bash
export RUN_ID=prelaunch-20260603-stress300
node scripts/load-test/cleanup-prelaunch-data.mjs --testRunId=$RUN_ID
node scripts/load-test/seed-prelaunch-data.mjs --preset=stress300 --testRunId=$RUN_ID
k6 run scripts/load-test/k6/prelaunch-stress-300.js
node scripts/load-test/cleanup-prelaunch-data.mjs --testRunId=$RUN_ID
```

### Stress 500

```bash
export RUN_ID=prelaunch-20260603-stress500
node scripts/load-test/cleanup-prelaunch-data.mjs --testRunId=$RUN_ID
node scripts/load-test/seed-prelaunch-data.mjs --preset=stress500 --testRunId=$RUN_ID
k6 run scripts/load-test/k6/prelaunch-stress-500.js
node scripts/load-test/cleanup-prelaunch-data.mjs --testRunId=$RUN_ID
```

### Spike 1000

```bash
export RUN_ID=prelaunch-20260603-spike1000
node scripts/load-test/cleanup-prelaunch-data.mjs --testRunId=$RUN_ID
node scripts/load-test/seed-prelaunch-data.mjs --preset=spike1000 --testRunId=$RUN_ID
# Spike: keep SKIP_WRITES=true strongly recommended
$env:K6_SKIP_WRITES="true"
k6 run scripts/load-test/k6/prelaunch-spike-1000.js
node scripts/load-test/cleanup-prelaunch-data.mjs --testRunId=$RUN_ID
```

### Enable write scenarios (optional)

```bash
$env:K6_SKIP_WRITES="false"
# Only on staging / after --confirm-production if using production config
```

### Production (discouraged)

```bash
node scripts/load-test/seed-prelaunch-data.mjs --preset=smoke --testRunId=$RUN_ID --confirm-production
```

---

## How to stop a running test

- **k6:** `Ctrl+C` in the terminal running k6
- **Then always cleanup:**

```bash
node scripts/load-test/cleanup-prelaunch-data.mjs --testRunId=$RUN_ID
```

---

## Presets

| `--preset` | Schools | Students |
|------------|---------|----------|
| `smoke` | 10 | 100 |
| `load100` | 100 | 1,000 |
| `stress300` | 300 | 5,000 |
| `stress500` | 500 | 10,000 |
| `spike1000` | 1,000 | 20,000 |

---

## Output

- Credentials: `scripts/load-test/.runs/<testRunId>/credentials.json` (gitignored)
- k6 summary: stdout — copy into `docs/load-testing/PRELAUNCH_RESULT_TEMPLATE.md`

---

## Requirements

- Node.js 20+
- [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/)
- Firebase Admin service account (seed/cleanup only)
