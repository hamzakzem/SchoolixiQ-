# SchoolixIQ — Production Certification Load Test

Node.js concurrent certification suite (no k6). Validates production readiness under sustained mixed-role load with optional controlled writes.

**Script:** `scripts/load-test/node-certification-test.mjs`

---

## Prerequisites

1. Seed tagged test data for the target tier:

| Tier | Preset | Schools | Users (approx) |
|------|--------|---------|----------------|
| 1 | `load100` | 100 | ~700 |
| 2 | `stress300` | 300 | ~2,100 |
| 3 | `stress500` | 500 | ~3,500 |
| 4 | `spike1000` | 1000 | ~7,000 |

```bash
node scripts/load-test/cleanup-prelaunch-data.mjs --testRunId=prelaunch-load100-001
node scripts/load-test/seed-prelaunch-data.mjs --preset=load100 --testRunId=prelaunch-load100-001
```

2. Credentials file: `scripts/load-test/.runs/<runId>/credentials.json`

3. Firebase Web API key in `firebase-applet-config.json` (or `--apiKey=`)

---

## Safety rules

| Rule | Enforcement |
|------|-------------|
| No real emails | Seed uses `@schoolixiq-loadtest.invalid` |
| No FCM | All test notifications: `pushDelivery.status = "skipped"` |
| Tagged writes only | `loadTest: true` + `testRunId` on every write |
| Writes off by default | `--writes=true` requires `--confirmWrites=true` |
| Production guard | `schoolixiq.com` requires `--confirmProduction=true` |
| No app/rule changes | Test scripts only |
| Cleanup scoped | Only matching `loadTest` + `testRunId` |

---

## Test tiers

### Tier 1 — 100 schools / 100 users

```bash
node scripts/load-test/node-certification-test.mjs \
  --runId=prelaunch-load100-001 \
  --baseUrl=https://schoolixiq.com \
  --maxUsers=100 \
  --concurrency=25 \
  --durationMinutes=30 \
  --confirmProduction=true
```

Shorter local run: `--durationMinutes=10`

### Tier 2 — 300 users

```bash
# seed --preset=stress300 first
node scripts/load-test/node-certification-test.mjs \
  --runId=prelaunch-stress300-001 \
  --baseUrl=https://schoolixiq.com \
  --maxUsers=300 \
  --concurrency=50 \
  --durationMinutes=30 \
  --confirmProduction=true
```

### Tier 3 — 500 users

```bash
node scripts/load-test/node-certification-test.mjs \
  --runId=prelaunch-stress500-001 \
  --baseUrl=https://schoolixiq.com \
  --maxUsers=500 \
  --concurrency=75 \
  --durationMinutes=30 \
  --confirmProduction=true
```

### Tier 4 — 1000 users (spike)

```bash
node scripts/load-test/node-certification-test.mjs \
  --runId=prelaunch-spike1000-001 \
  --baseUrl=https://schoolixiq.com \
  --maxUsers=1000 \
  --concurrency=100 \
  --durationMinutes=15 \
  --confirmProduction=true
```

---

## Write-enabled (controlled)

```bash
node scripts/load-test/node-certification-test.mjs \
  --runId=prelaunch-load100-001 \
  --baseUrl=https://schoolixiq.com \
  --maxUsers=100 \
  --concurrency=10 \
  --durationMinutes=5 \
  --writes=true \
  --confirmWrites=true \
  --confirmProduction=true
```

Writes per scenario cycle (tagged):
- **Admin:** student, attendance, notification (FCM skipped), market product, chat message
- **Teacher:** homework, grade
- **Parent:** create/mark-read/delete own test notification
- **Staff:** read-only always

---

## Scenarios

| Scenario | Operations |
|----------|------------|
| **Landing** | `GET /`, favicon, `system/config` |
| **Admin** | login, profile, school, students, classes, notifications, installments (+ writes) |
| **Teacher** | login, profile, class, students, homework, notifications (+ writes) |
| **Parent** | login, profile, linked students, notifications, installments, homework (+ writes) |
| **Staff** | login, profile, students, classes, attendance (read-only) |

---

## Success thresholds

| Metric | Read-only | Write-enabled |
|--------|-----------|---------------|
| Error rate | < 1% | < 1% |
| permission-denied | 0 | 0 |
| resource-exhausted | 0 | 0 |
| index-required | 0 | 0 |
| p95 | < 1500ms | < 2500ms |
| p99 | < 4000ms | < 4000ms |
| Latency trend | No sustained increase (2nd half p95 ≤ 1.5× 1st half) | same |

**Decision:**
- **GO** — all thresholds met
- **GO WITH LIMITS** — thresholds met but latency trend increasing
- **NO-GO** — any hard threshold breach

---

## Output

- Console summary
- `scripts/load-test/.runs/<runId>/certification-report.json`
- `scripts/load-test/.runs/<runId>/certification-report.md`

---

## Cleanup (mandatory)

```bash
node scripts/load-test/cleanup-prelaunch-data.mjs --testRunId=prelaunch-load100-001
```

---

## Observability during test

**Firebase Console:** Firestore reads/writes, Auth sign-ins, Query Insights, FCM (should stay ~0)

**GCP:** Billing, Logs Explorer (`severity>=ERROR`), Error Reporting

**Browser spot-check:** Console errors, `window.__SCHOOLIX_CHAT_PERF__` after chat

---

## Related

- Smoke test (sequential): `node-smoke-test.mjs`
- Seed: `seed-prelaunch-data.mjs`
- Result template: `CERTIFICATION_RESULT_TEMPLATE.md`
