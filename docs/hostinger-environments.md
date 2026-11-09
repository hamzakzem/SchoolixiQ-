# Hostinger: Production vs Preview environments

What the repository can and cannot prove (checked in this PR; Hostinger hPanel itself could not be inspected from the build environment):

| Question | Finding | Evidence |
|---|---|---|
| Firebase project of the Preview **frontend** | `yala-safari-iq` (production) unless the build sets all `VITE_FIREBASE_*` | `firebase-applet-config.json` is committed and bundled |
| Firebase project of the Preview **backend** | whatever the preview's `FIREBASE_*` variables say; default = production config file | `server.ts` read `firebase-applet-config.json` + `FIREBASE_PROJECT_ID` |
| Does Preview inherit production Admin credentials? | **Unknown from the repository** — depends on how the Hostinger preview gets its environment variables. Treated as *possible* | not inspectable |
| Could a preview with inherited credentials touch production **before** this PR? | Yes: at boot it started the FCM push listener, chat-notification listener, credential scrub, chat migration, deletion sweep and **wrote `system/config.appUrl`** with its own URL | `server.ts` startup block (pre-PR) |
| Do production and preview share a process / storage? | No shared process (separate deployments). They share **Firebase** (same project) and possibly environment variables | — |
| GitHub Actions | `deploy-hostinger.yml` only builds/verifies on `main`; `deploy-firebase-rules.yml` uses `FIREBASE_SERVICE_ACCOUNT` on `main` only; PR workflow `pr-safety.yml` has no secrets | `.github/workflows` |

## What the code now guarantees (fail closed)
`backend/runtimeEnv.mjs` decides the deployment identity at boot (details in the file header):

| `DEPLOY_ENV` | Credentials present | Result |
|---|---|---|
| `production` (+ `NODE_ENV=production`) | production project, or none | Admin **enabled**; background workers start after the first request seen on `*.schoolixiq.com/.iq` |
| `production` | another project's | `unknown` → Admin **disabled**, no workers |
| `preview` / `staging` / `development` / `dev` / `test` | **production** project's | Admin **disabled** (credentials ignored), no workers, cron endpoints 503 |
| `preview` … | a **different** project's (service-account e-mail names it) | Admin enabled on that project; workers allowed (they only act on that project) |
| `preview` … | none | Admin disabled |
| missing / unrecognised / `NODE_ENV` ≠ production | any | `unknown` → Admin **disabled**, no workers, startup write skipped |
| any + `FIRESTORE_EMULATOR_HOST` | any | emulator (cannot reach production) |

"Admin disabled" = Firebase Admin is initialised with a credential that always throws `ADMIN_DISABLED` (never a silent fallback to production).
Gated processes: FCM push listener, chat-notification listener, deletion sweep, credential scrub, chat-thread migration, the startup write to
`system/config` (a production URL is written only by a verified production deployment on a production host), every `/api/internal/*` endpoint
(tuition reminders, push dispatch, chat escalation, dismissal recovery/compaction) and every destructive endpoint (also host-gated).
The web client refuses to initialise Firebase on a preview host when its config is the production project (shows a notice, sends no requests).
Check any deployment at `GET /api/public/status` → `deployment` (`kind`, `adminEnabled`, `adminReason`, `workers`), no secrets.

## hPanel configuration (manual — I cannot change Hostinger)

### Production site (schoolixiq.com / schoolixiq.iq) — add/keep
| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DEPLOY_ENV` | `production` **(new, required)** |
| `FIREBASE_PROJECT_ID` | `yala-safari-iq` |
| `FIREBASE_CLIENT_EMAIL` | the production service account e-mail (ends `@yala-safari-iq.iam.gserviceaccount.com`) |
| `FIREBASE_PRIVATE_KEY` | its private key (PEM, `\n` escapes OK) — entered only in hPanel |
| `NOTIFICATION_CRON_SECRET` (or `CRON_SECRET`) | ≥ 32 random characters |
| `TUITION_CRON_SECRET` / `CHAT_CRON_SECRET` | ≥ 32 random characters (or one `CRON_SECRET`) |
| `APP_URL` | `https://schoolixiq.com` |
Until `DEPLOY_ENV=production` is set, the production server runs with Admin **disabled** and no workers (today production already has no Admin credentials, so nothing regresses).

### Preview (yellowgreen-loris-564484.hostingersite.com and any future preview)
Required outcome: the preview must **not** see the production `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, cron secrets or `NOTIFICATION_*`.
1. Open the preview's environment-variable settings. If it **shares** the production app's variables, create a **separate Node.js application/website** for previews (own variables) — a shared variable set cannot be made different per environment.
2. Remove (or never set) on the preview: `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `NOTIFICATION_CRON_SECRET`, `TUITION_CRON_SECRET`, `CHAT_CRON_SECRET`, `CRON_SECRET`.
3. Set on the preview: `NODE_ENV=production`, `DEPLOY_ENV=preview`, and set `APP_URL` to the preview URL.
4. **Safe default (no separate Firebase project):** stop here. The web client shows the "preview not configured" notice, Admin is disabled, nothing reaches production.
5. **Full preview (recommended, needs a new Firebase project you create):** set build-time `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` (all six, values from the *preview* project) and runtime `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET` of that project. Publish this repo's Firestore/Storage rules and indexes to that project yourself.
6. Verify: `https://<preview>/api/public/status` must show `deployment.kind: "preview"` and either `adminEnabled: false` (safe default) or `adminProjectVerified: "<your preview project>"` with `targetsProductionProject: false`. Anything else, or any mention of `yala-safari-iq`, means a production credential is still present.
