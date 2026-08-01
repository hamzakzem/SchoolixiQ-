# SchoolixIQ Production Deployment

Reliability guide for Hostinger **Node Web App** releases. The production site serves the Vite SPA from Express (`dist/server.mjs`) on `process.env.PORT` bound to `0.0.0.0`.

## Architecture

| Layer | Role |
|--------|------|
| Vite SPA | Built into `dist/` (`index.html`, `assets/*`, SW, `.htaccess`) |
| Express (`dist/server.mjs`) | API + static SPA + SPA fallback |
| Hostinger Web App | Runs `npm run build` then `npm start` |
| GitHub Actions | Pre-deploy gates + live health probe |

Do **not** deploy a web-only `dist/` without `server.mjs` to the Node Web App.

---

## Local verification (required before release)

```bash
npm ci --legacy-peer-deps
npm run build                 # build:full + verify:production
npm run verify:web-build      # chunk / SW / htaccess integrity
npm run verify:server-start   # boot server, probe SPA routes
npm start                     # optional manual run (uses PORT or 3000)
```

Full pre-deploy gate:

```bash
npm run build:full
npm run predeploy:check       # verify:production + verify:server-start
```

Expected startup logs:

```
SERVER_BOOT_START
PORT_LISTENING { host: '0.0.0.0', port: <PORT> }
SERVER_READY
Server running on http://localhost:<PORT>
```

Manual route checks (with server running):

- `GET /` → 200 + `#root`
- `GET /login` → 200 + SPA shell
- Other SPA paths (`/admin`, `/teacher`, …) → 200 + SPA shell

Live site probe:

```bash
PRODUCTION_HEALTH_URL=https://schoolixiq.com npm run verify:deploy-health
```

---

## Build commands

| Script | Purpose |
|--------|---------|
| `npm run build:web` | Vite + SW shell + APK staging |
| `npm run build:server` | Bundle Express → `dist/server.mjs` + Firebase applet config |
| `npm run build:full` | web + server |
| `npm run build` | `build:full` then `verify:production` (**Hostinger build command**) |
| `npm start` | `node dist/server.mjs` (**Hostinger start / entry**) |
| `npm run verify:production` | Fail if `index.html`, `assets/*`, `server.mjs`, or chunks missing |
| `npm run verify:server-start` | Fail if server does not boot or SPA routes fail |
| `npm run verify:deploy-health` | Fail if live `/` or `/login` ≠ HTTP 200 |
| `npm run predeploy:check` | Artifact + local server smoke |

---

## Hostinger settings

| Field | Value |
|--------|--------|
| Framework | Other / Express (not Vite-static-only) |
| Node.js | **22** |
| Build command | `npm run build` |
| Start command / entry | `npm start` → **`dist/server.mjs`** |
| Output directory | `dist` |
| Env | `NODE_ENV=production`, Hostinger `PORT`, Firebase Admin + cron secrets as required |

Confirm **Runtime Logs** show `SERVER_READY` / `PORT_LISTENING` after each deploy.

### Atomic SFTP order (`scripts/hostinger-deploy.sh`)

Used for manual/FTP cutover (when SFTP secrets are configured):

1. Upload `assets/*` (hashed chunks)
2. Upload `server.mjs` + `firebase-applet-config.json`
3. Sync body / configuration (exclude shell + assets + server)
4. Upload `index.html` **last** (with SW / htaccess)

Never publish a new `index.html` before its hashed assets exist.

---

## GitHub Actions gate

Workflow: `.github/workflows/deploy-hostinger.yml`

1. `npm ci`
2. `npm run build:full`
3. `npm run verify:production`
4. `npm run verify:server-start`
5. VAPID + legacy-auth bundle greps
6. Require `dist/server.mjs` (never delete it)
7. Upload `schoolixiq-dist` artifact
8. **Live health job**: wait → probe `https://schoolixiq.com` `/` + `/login`

Optional secret: `PRODUCTION_HEALTH_URL` (defaults to `https://schoolixiq.com` in the script).  
Optional variable: `PRODUCTION_HEALTH_WAIT_SEC` (default 90).

If any gate fails, the workflow fails — do not treat the release as successful.

---

## Rollback procedure

1. **Hostinger → Deployments**: redeploy the last known-good deployment / commit.
2. Or restore previous artifact: download prior `schoolixiq-dist` from GitHub Actions → extract → atomic SFTP via `scripts/hostinger-deploy.sh`.
3. Confirm Runtime Logs: `SERVER_READY`.
4. Confirm live health:

   ```bash
   PRODUCTION_HEALTH_URL=https://schoolixiq.com npm run verify:deploy-health
   ```

5. If users still see a white screen: hard refresh / unregister SW (v17 purges old caches on activate; client recovery also handles stale chunks once).

---

## Common failure solutions

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| `ERR_CONNECTION_TIMED_OUT`, empty Runtime Logs | `dist/server.mjs` missing; Node never started | Ensure Hostinger build is `npm run build` (full), entry `dist/server.mjs` |
| `npm start` fails locally | Ran `build:web` only | Run `npm run build:full` or `npm run build` |
| White screen / missing chunk | New `index.html`, old cached assets | SW v17 network-only for hashed assets; purge caches; redeploy atomically |
| CI `verify:production` fails | Incomplete `dist/` | Fix build; do not deploy |
| CI `verify:server-start` fails | Server crash on boot / wrong PORT bind | Check boot logs; keep `0.0.0.0` + `process.env.PORT` |
| Live health job fails | Site down or Hostinger still deploying | Check Runtime Logs; increase `PRODUCTION_HEALTH_WAIT_SEC`; rollback if needed |
| SPA 404 on refresh (static Apache only) | Wrong hosting mode | Use Node Web App **or** ensure `.htaccess` SPA rewrite on `public_html` |

---

## Service Worker (v17)

- Never caches hashed `/assets/*.js|css`
- Purges all caches on install + activate
- `skipWaiting` + `clients.claim`
- Chunk fetch failures notify clients for one-time recovery reload

Do not add hashed Vite chunks to `sw-precache.json`.
