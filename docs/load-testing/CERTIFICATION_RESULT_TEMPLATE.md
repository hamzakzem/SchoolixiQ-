# SchoolixIQ Certification Load Test — Result Report

> Fill after running `node-certification-test.mjs`. Reports are also auto-generated in `.runs/<runId>/`.

---

## Run metadata

| Field | Value |
|-------|-------|
| **Run ID** | |
| **Tier** | 1 / 2 / 3 / 4 |
| **Date (UTC)** | |
| **Base URL** | |
| **Firebase project** | |
| **Duration (planned)** | min |
| **Duration (actual)** | s |
| **Max users** | |
| **Concurrency** | |
| **Writes** | disabled / enabled |
| **Tester** | |

---

## Certification decision

**Result:** ☐ **GO**  ☐ **GO WITH LIMITS**  ☐ **NO-GO**

**Rationale:**

---

## Summary metrics

| Metric | Target | Actual | Pass? |
|--------|--------|--------|-------|
| Total operations | — | | |
| Failed operations | — | | |
| Error rate | < 1% | | ☐ |
| Ops/sec | — | | |
| p50 | — | ms | |
| p95 (read) | < 1500ms | ms | ☐ |
| p95 (write) | < 2500ms | ms | ☐ |
| p99 | < 4000ms | ms | ☐ |
| max duration | — | ms | |
| Est. Firestore reads | — | | |
| Est. Firestore writes | — | | |

---

## Error counters

| Counter | Target | Actual |
|---------|--------|--------|
| permission-denied | 0 | |
| resource-exhausted | 0 | |
| deadline-exceeded | 0 | |
| unavailable | 0 | |
| index-required | 0 | |
| auth-failures | 0 | |
| rate-limit | 0 | |

---

## Latency trend

| Window | p95 |
|--------|-----|
| First half | ms |
| Second half | ms |
| Increasing? | yes / no |

---

## Per-scenario results

| Scenario | Total | Failed | Error rate | p95 |
|----------|-------|--------|------------|-----|
| landing | | | | |
| admin | | | | |
| teacher | | | | |
| parent | | | | |
| staff | | | | |

---

## Top failures (max 10)

| Operation | Error | Count |
|-----------|-------|-------|
| | | |

---

## Firebase usage (before / after window)

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Firestore reads | | | |
| Firestore writes | | | |
| Auth sign-ins | | | |
| FCM sends | | | |

---

## Estimated cost (USD)

| Service | Estimate |
|---------|----------|
| Firestore | |
| Auth | |
| **Total** | |

---

## Cleanup confirmed

```bash
node scripts/load-test/cleanup-prelaunch-data.mjs --testRunId=<runId>
```

☐ Cleanup completed  
☐ Auth test users removed  
☐ Tagged Firestore docs removed  

---

## Launch recommendation

**Proceed to next tier?** yes / no / with limits

**Limits (if any):**

**Required fixes before launch:**

1. 
2. 

---

## Sign-off

| Role | Name | Date |
|------|------|------|
| Engineering | | |
| Product / Owner | | |
