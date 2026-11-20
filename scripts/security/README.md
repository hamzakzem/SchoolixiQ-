# Security regression tests — Phase 0

These tests **document** the privilege-escalation and isolation weaknesses found in the security
audit of commit `1f350cb`. Each test asserts the **secure** behaviour, so on the current code many
of them **fail on purpose**: a failing test is a proven weakness, not a broken test. Do not change
the expectations to make them pass; Phase 1 fixes the code and the tests then turn green.

Controls (`CONTROL` in the name) check legitimate flows that the fixes must keep working. A failing
control means a legitimate flow is broken.

## Safety

* Local Firebase Emulator Suite only, project id `demo-schoolixiq-security`. For `demo-` projects
  the emulators refuse to contact any real Google service.
* `lib/harness.mjs` refuses to run if the project id is not `demo-*`, if the emulator hosts are not
  loopback addresses, or if any real credential variable is set
  (`GOOGLE_APPLICATION_CREDENTIALS`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_SERVICE_ACCOUNT`).
* All data is synthetic (`lib/fixtures.mjs`).
* The server suite starts the repository's own `server.ts` locally against the emulators with no
  credentials and with HTTP(S) proxies pointed at a dead local port, so no request can leave the
  machine. The upload route (Cloud Storage) is not exercised.
* No production file is modified; `firestore.rules` / `storage.rules` are read by the emulator as-is.

## Requirements

* Node.js 22, Java 21 (for the emulators), repository dependencies installed:

```bash
SKIP_POSTINSTALL_BUILD=1 npm ci
```

## Run

1. Start the emulators (terminal 1, from the repository root). The existing `firebase.e2e.json`
   is reused (Firestore `127.0.0.1:8085`, Auth `127.0.0.1:9099`):

```bash
npx --yes firebase-tools@13.35.1 emulators:start --config firebase.e2e.json --project demo-schoolixiq-security --only auth,firestore
```

2. Run every suite (terminal 2, from the repository root):

```bash
node scripts/security/run-all.mjs
```

   Or one suite only (argument = substring of the file path):

```bash
node scripts/security/run-all.mjs rules/c-
```

3. Read the results in `scripts/security/results/latest/`:
   * `SUMMARY.md` — table of every test and its status;
   * `summary.json` — machine-readable, with `provenWeaknesses` and `brokenControls`;
   * `junit.xml`, `run.log` — raw output;
   * `server-under-test.log` — output of the local server during the backend suite.
   Every run is also kept in `scripts/security/results/<timestamp>/`.

Exit code: `0` all expectations met, `1` at least one weakness/broken control, `2` setup problem.

## Suites

| File | Area | Needs |
|---|---|---|
| `rules/a-privilege-escalation.test.mjs` | A — roles, schoolId, permissions, `users/metadata` | Firestore emulator |
| `rules/b-identity.test.mjs` | B — other UIDs, other accounts, e-mail spoofing, case/whitespace | Firestore emulator |
| `rules/c-parent-linking.test.mjs` | C — parent↔student links (D1 approval, D2 verified e-mail), concurrency | Firestore emulator |
| `rules/d-school-isolation.test.mjs` | D — cross-school reads/writes, teacher/assistant/parent scope | Firestore emulator |
| `rules/f-password-rules.test.mjs` | F — rules accepting plaintext passwords | Firestore emulator |
| `server/e-admin-api.test.mjs` | E — custom claims, trusted role source, pickup safety, passwords in logs | Firestore + Auth emulators, local `server.ts` |
| `static/f-password-sources.test.mjs` | F — source paths that store or reuse plaintext passwords | none |
| `worker/f-credential-scrub.test.mjs` | F — `backend/credentialScrub.mjs` behaviour | Firestore emulator |

Test ids map to the audit findings: `C1`…`C7`, `H1`…`H7`, `M1`…`M3`, and to the decisions
`D1` (school-admin approval for parent links) and `D2` (verified e-mail required).

## Known limitations

* The parent-link **approval workflow (D1) does not exist yet**; its request-level cases are
  `todo` (reported as *not-testable*). The current direct-write paths that bypass any approval are tested instead.
* Cloud Storage rules / the upload API are not covered in Phase 0.
* The server runs in development mode (`NODE_ENV=test`); Vite's dependency scan prints esbuild
  errors about `src/lib/firestoreListenShim.ts` into `server-under-test.log`. They concern the web
  bundle only and do not affect the API routes under test.

See `STAGING_SPEC.md` for the separate staging project required before production rollout.
