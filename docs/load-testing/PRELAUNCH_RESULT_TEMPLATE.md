# SchoolixIQ Pre-Launch Load Test — Result Report

> Copy this template for each test run. Fill all sections before making a launch decision.

---

## Run metadata

| Field | Value |
|-------|-------|
| **Run ID** (`testRunId`) | |
| **Date / time (UTC)** | |
| **Tester** | |
| **Environment** | staging / production |
| **Firebase project** | |
| **Preset** | smoke / load100 / stress300 / stress500 / spike1000 |
| **k6 script** | |
| **SKIP_WRITES** | true / false |
| **Git commit** (optional) | |

---

## Scale

| Metric | Planned | Actual seeded |
|--------|---------|---------------|
| Schools | | |
| Students | | |
| Test users (auth) | | |
| Peak VUs | | |
| Test duration | | |

---

## Pass / fail summary

| Criterion | Target | Actual | Pass? |
|-----------|--------|--------|-------|
| Read p95 (`read_duration`) | < 2.5s | | ☐ |
| Write p95 (`write_duration`) | < 3.5s | | ☐ |
| Error rate | < 1% | | ☐ |
| `auth_failures` | 0 | | ☐ |
| `firestore_permission_denied` | 0 | | ☐ |
| `firestore_resource_exhausted` | 0 | | ☐ |
| `firestore_index_required` | 0 | | ☐ |
| Page load failures | 0 | | ☐ |
| Manual app freeze reports | 0 | | ☐ |
| FCM sends during test | 0 | | ☐ |

**Overall:** ☐ PASS  ☐ FAIL

---

## k6 metrics (paste from summary)

```
http_req_duration..............: avg=    p95=
read_duration..................: avg=    p95=
write_duration.................: avg=    p95=
http_req_failed................: rate=
errors.........................: rate=
auth_failures..................: count=
firestore_permission_denied....: count=
firestore_resource_exhausted...: count=
firestore_index_required.......: count=
firestore_rest_failures........: count=
page_load_failures.............: count=
```

---

## Errors & bottlenecks

### Top errors (Logs / k6)

| Error | Count | Source | Notes |
|-------|-------|--------|-------|
| | | | |

### Bottlenecks identified

1. 
2. 
3. 

---

## Firebase usage (before / after)

| Metric | Before test | After test | Delta |
|--------|-------------|------------|-------|
| Firestore reads (day) | | | |
| Firestore writes (day) | | | |
| Firestore deletes (day) | | | |
| Auth sign-ins (day) | | | |
| Storage operations | | | |
| FCM sends | | | |
| Functions invocations | | | |

**Query Insights slow queries:**

- 

---

## Estimated cost

| Service | Estimated cost (USD) | Notes |
|---------|---------------------|-------|
| Firestore | | |
| Auth | | |
| Functions | | |
| Storage | | |
| **Total** | | Budget limit: $ |

---

## Browser spot-check (smoke only)

| Page | Console errors? | Notes |
|------|-----------------|-------|
| Landing / footer | | |
| Admin dashboard | | |
| Students list | | |
| Parent dashboard | | |
| Chat (`__SCHOOLIX_CHAT_PERF__`) | | |

---

## Cleanup confirmation

| Step | Done? |
|------|-------|
| `cleanup-prelaunch-data.mjs` run | ☐ |
| Auth users `@schoolixiq-loadtest.invalid` removed | ☐ |
| Firestore tagged docs removed | ☐ |
| `.runs/<testRunId>/` archived or deleted | ☐ |

---

## Launch decision

**Decision:** ☐ **GO**  ☐ **GO WITH LIMITS**  ☐ **NO-GO**

**Rationale:**

**Limits (if GO WITH LIMITS):**

**Required follow-ups before launch:**

1. 
2. 

---

## Sign-off

| Role | Name | Date |
|------|------|------|
| Engineering | | |
| Product / Owner | | |
