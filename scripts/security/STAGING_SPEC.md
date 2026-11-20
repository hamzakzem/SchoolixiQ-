# Staging Firebase project — specification (decision D3)

Specification only. **Nothing here has been created.** The project is created later by the owner,
after explicit approval, and must never share data or credentials with production.

## Identity

| Item | Value |
|---|---|
| Project id | e.g. `schoolixiq-staging` (must differ from `yala-safari-iq`; not a `demo-` id because staging runs on real Firebase) |
| Billing | separate budget with a low alert threshold |
| Owners | the platform owner only; CI uses a dedicated service account |
| Region | same Firestore location as production, so rules/index behaviour matches |

## Services

| Service | Configuration |
|---|---|
| Firestore `(default)` | rules and indexes deployed from the branch under test, never from production |
| Authentication | Email/Password + Google enabled, e-mail enumeration protection on, authorized domains limited to the staging host |
| Storage | own bucket, `storage.rules` from the branch under test |
| Cloud Functions | only if a test needs them; no scheduled functions against production URLs |
| Cloud Messaging | own sender id / VAPID key (never production keys) |

## Data

* Synthetic data only, generated from `scripts/security/lib/fixtures.mjs` / `scripts/e2e/seed-emulator.ts`.
* **No copy of production data**, no production export/import, no real e-mail addresses or phone numbers.
* `users/metadata` created at setup with `{ initialized: true }` (boolean, no other fields).

## Hosting / backend

* Separate Hostinger (or other) app/subdomain, e.g. `staging.schoolixiq.com`, behind HTTP auth or an IP allow-list.
* Environment variables for staging only: `FIREBASE_PROJECT_ID=schoolixiq-staging`, staging service
  account e-mail/private key, a fresh `CRON_SECRET` (≥ 32 chars), `NODE_ENV=production`.
* CORS allow-list contains only the staging origin.

## Credentials and IAM (least privilege)

| Principal | Roles |
|---|---|
| Staging runtime service account | `roles/datastore.user`, `roles/firebaseauth.admin`, `roles/storage.objectUser` (bucket-level), `roles/firebasecloudmessaging.admin` |
| Staging CI deploy service account | `roles/firebaserules.admin`, `roles/datastore.indexAdmin` |
| No principal | Owner/Editor, or any access to `yala-safari-iq` |

Secrets live only in the staging environment's secret store / GitHub *environment* `staging`
(not repository-wide secrets), so a staging job can never read production secrets.

## Promotion gate (staging → production)

1. `node scripts/security/run-all.mjs` green on the emulators (all weaknesses fixed, all controls passing).
2. Same rules deployed to staging; smoke tests for registration, school activation, parent link approval,
   dismissal request/verify, staff management, notifications.
3. Rules monitor in staging shows no unexpected denies for 24 h of exercising.
4. Production deploy keeps the previous ruleset id for one-click rollback.
