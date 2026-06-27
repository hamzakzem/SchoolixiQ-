# SchoolixIQ — Pre-Launch Load & Reliability Test Plan

**Version:** 1.0  
**Last updated:** 2026-06-03  
**Status:** Pre-commercial launch gate

---

## 1. Objectives

Validate SchoolixIQ capacity and reliability under realistic mixed workloads before commercial launch:

| Scale | Schools | Students | Virtual users (k6) |
|-------|---------|----------|-------------------|
| Smoke | 10 | 100 | 10 |
| Load 100 | 100 | 1,000 | 100 |
| Stress 300 | 300 | 5,000 | 300 |
| Stress 500 | 500 | 10,000 | 500 |
| Spike 1000 | 1,000 | 20,000 | 1,000 (burst) |

Cover all major roles: Super Admin, School Admin, Teacher, Parent, Staff.

---

## 2. Safety rules (mandatory)

| Rule | Implementation |
|------|----------------|
| **No destructive tests on production real data** | All seeded docs tagged `loadTest: true` + `testRunId` |
| **Staging preferred** | `config.local.json` → `"environment": "staging"` |
| **Production blocked by default** | CLI requires `--confirm-production` for seed/cleanup |
| **Writes off by default in k6** | `K6_SKIP_WRITES=true` (default) — read-heavy load only |
| **No FCM spam** | Notifications seeded with `pushDelivery.status: "skipped"` |
| **No real emails** | All test users: `*@schoolixiq-loadtest.invalid` |
| **Cleanup before seed** | Always run cleanup for the same `testRunId` first |
| **Cleanup scope** | Only docs where `loadTest==true` AND `testRunId` matches |

> **Note:** This repo uses Firebase project `yala-safari-iq` for both dev and prod. “Staging” means **tagged load-test data**, not a separate project. For true isolation, use a dedicated Firebase staging project and point `config.local.json` at it.

---

## 3. Scenarios covered

| # | Scenario | Module | Auth | Writes (if enabled) |
|---|----------|--------|------|---------------------|
| 1 | Login | `auth-login.js` | Firebase Identity Toolkit | — |
| 2 | Dashboard overview | `dashboard-overview.js` | School admin | — |
| 3 | Students list read | `students-read.js` | School admin | — |
| 4 | Add student | `student-create.js` | School admin | Firestore create |
| 5 | Attendance read/write | `attendance-write.js` | School admin | Firestore create |
| 6 | Homework create/read | `homework.js` | School admin | Firestore create |
| 7 | Grades read/write | `grades.js` | School admin | Firestore create |
| 8 | Tuition/installments read | `tuition-read.js` | School admin | — |
| 9 | Marketplace read/add | `marketplace.js` | School admin | Metadata only (no image upload) |
| 10 | Chat open + send | `chat.js` | Parent/admin | Firestore message create |
| 11 | Notifications list/create | `notifications.js` | Parent | No FCM dispatch |
| 12 | Parent dashboard | `parent-dashboard.js` | Parent | — |
| 13 | Teacher dashboard | `teacher-dashboard.js` | Teacher | — |
| 14 | Super Admin dashboard | `superadmin-dashboard.js` | Admin (sample) | — |
| 15 | Landing + footer | `landing-page.js` | Public + optional auth | HTTP GET |
| 16 | Image/logo upload | — | **Skipped** | Simulated via empty `imageUrl` on market products |

---

## 4. Success criteria (thresholds)

| Metric | Target |
|--------|--------|
| `read_duration` p95 | < 2.5s (normal), < 3.5s (stress), < 5s (spike) |
| `write_duration` p95 | < 3.5s (normal), < 4.5s (stress) |
| `http_req_failed` / `errors` | < 1% (normal), < 3% (stress), < 5% (spike) |
| `auth_failures` | 0 (smoke/load), < 10 (spike) |
| `firestore_permission_denied` | **0** for valid test users |
| `firestore_resource_exhausted` | **0** |
| `firestore_index_required` | **0** |
| App freeze / tab crash | 0 manual reports during test window |
| Firebase billing | Within `budgetUsd` in config (default $50) |

**Launch decision:**
- **GO** — all thresholds met, no critical errors, billing OK
- **GO WITH LIMITS** — minor p95 breaches, no permission/quota/index errors; document limits (e.g. max 300 schools)
- **NO-GO** — permission-denied, quota exhaustion, index errors, or error rate > 5%

---

## 5. Observability checklist

### Firebase Console (`yala-safari-iq`)

| Area | What to watch |
|------|---------------|
| **Firestore → Usage** | Reads/writes/deletes per minute; compare before/after test |
| **Firestore → Query Insights** | Slow queries, full collection scans |
| **Authentication** | Sign-in count spike; users `@schoolixiq-loadtest.invalid` only |
| **Storage** | Should stay flat (no upload tests) |
| **Cloud Messaging** | **Should be ~0** — verify no FCM sends from load test |
| **Functions** | Invocations/errors if push-dispatch cron fires |

### Google Cloud Console

| Area | What to watch |
|------|---------------|
| **Billing → Reports** | Cost delta during test window |
| **Logs Explorer** | `severity>=ERROR`, filter `loadTest` |
| **Error Reporting** | New error groups |
| **Cloud Run / Functions** | Instance count, latency, 5xx |

### Browser (manual spot-check during smoke)

| Check | How |
|-------|-----|
| Console errors | DevTools → Console (no red errors on dashboard) |
| Performance | DevTools → Performance → record 10s on Students list |
| Chat perf | `window.__SCHOOLIX_CHAT_PERF__` in console after opening chat |

### k6 output

Custom metrics exported:
- `auth_failures`
- `firestore_permission_denied`
- `firestore_resource_exhausted`
- `firestore_index_required`
- `firestore_rest_failures`
- `page_load_failures`
- `read_duration` / `write_duration`

---

## 6. Prerequisites

1. **Node.js 20+** (seed/cleanup scripts)
2. **k6** — [install](https://grafana.com/docs/k6/latest/set-up/install-k6/)
3. **Firebase Admin credentials** — service account JSON or `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` in `.env`
4. **Copy config:** `cp scripts/load-test/config.example.json scripts/load-test/config.local.json`
5. Set `apiKey` from `firebase-applet-config.json` and `baseUrl` / `backendUrl`

---

## 7. Execution order

```
1. Copy & edit config.local.json
2. cleanup-prelaunch-data.mjs  (--testRunId)
3. seed-prelaunch-data.mjs     (--preset, --testRunId)
4. k6 run prelaunch-*.js       (with env vars)
5. Record results in PRELAUNCH_RESULT_TEMPLATE.md
6. cleanup-prelaunch-data.mjs  (always after test)
```

See `scripts/load-test/README.md` for exact commands.

---

## 8. Files reference

```
docs/load-testing/
  PRELAUNCH_TEST_PLAN.md          (this file)
  PRELAUNCH_RESULT_TEMPLATE.md
scripts/load-test/
  config.example.json
  config.local.json               (gitignored)
  seed-prelaunch-data.mjs
  cleanup-prelaunch-data.mjs
  .runs/<testRunId>/credentials.json  (gitignored)
  k6/
    prelaunch-smoke-10.js
    prelaunch-load-100.js
    prelaunch-stress-300.js
    prelaunch-stress-500.js
    prelaunch-spike-1000.js
    lib/          (config, auth, firestore, metrics, runner)
    scenarios/    (14 scenario modules)
```

---

## 9. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Quota exhaustion on shared project | Start with smoke; monitor Firestore usage; cleanup immediately |
| Auth rate limits | Ramp VUs gradually (built into k6 stages) |
| Leftover test data | Mandatory cleanup script; tagged queries only |
| Accidental production impact | `--confirm-production` gate; `loadTest` tags |
| Missing composite indexes | `firestore_index_required` metric = NO-GO |
