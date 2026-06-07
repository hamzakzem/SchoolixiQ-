# SchoolixiQ — Google AI Studio Production Synchronization Package

**Generated:** 2026-06-06  
**Baseline commit:** `7d6b92be7185cfb3d88fe2c8fd63f7f5cad16f4c`  
**Purpose:** Safe synchronization reference for Google AI Studio. Documentation only.

---

## Project identity

| Field | Value |
|-------|-------|
| **Project name** | SchoolixiQ |
| **GitHub repository** | [hamzakzem/SchoolixiQ-](https://github.com/hamzakzem/SchoolixiQ-) |
| **Branch** | `main` |
| **Production URL** | https://schoolixiq.com |

---

## Mandatory instruction for Google AI Studio

Google AI Studio must treat GitHub main as the source of truth.  
If its workspace differs from GitHub main, it must stop and ask the user to reset/reconnect.  
It must never commit or push automatically.  
It must never prepare deletion operations.  
It must never replace Firebase Auth with simulated login.  
It must never use localStorage as a replacement for Firestore.  
It must never redesign UI unless explicitly requested.

---

## Required first prompt for Google AI Studio

```
Read AI_RULES.md and GOOGLE_AI_STUDIO_SYNC.md first.
Do not modify anything.
Verify the workspace matches GitHub main.
Confirm all protected files exist.
If any protected file is missing, stop immediately.
Do not create, delete, modify, commit, or push anything.
```

---

## Pre-flight checklist (local baseline verified 2026-06-06)

| Check | Status |
|-------|--------|
| `git status` clean | ✅ |
| Current branch `main` | ✅ |
| `origin/main` synced (`7d6b92b`) | ✅ |
| `AI_RULES.md` exists | ✅ |
| `.cursorrules` exists | ✅ |
| `package.json` exists | ✅ |
| `src/` exists | ✅ |
| `src/lib/auth/` exists (8 modules) | ✅ |
| `src/lib/AppError.ts` exists | ✅ |
| `.github/workflows/deploy-hostinger.yml` exists | ✅ |
| `scripts/verify-web-build.mjs` exists | ✅ |
| `scripts/hostinger-deploy.sh` exists | ✅ |
| `vite.config.ts` exists | ✅ |
| `npm run build` | ✅ Success |
| `npm run verify:web-build` | ✅ OK: 21 bundles — no legacy Google auth patterns |

---

## Protected architecture summary

SchoolixiQ is a **React 19 + Vite 6 + Firebase 11** school management platform with:

- **Web SPA** deployed statically to Hostinger (`public_html/`)
- **Express API** bundled as `dist/server.mjs` (not uploaded in static deploy)
- **Capacitor 8** Android/iOS shell with native Google Auth bridge
- **Centralized auth** in `src/lib/auth/*` with `AppError` normalization
- **CI/CD** via GitHub Actions → FTPS/SFTP to Hostinger

### Authentication (web)

- Firebase Auth v9 modular SDK only
- Google: `GoogleAuthProvider` + `signInWithPopup` — **popup only, no redirect**
- No legacy Google Identity Services (`gapi`, `platform.js`, `gsi/client`, `auth2`, `iframerpc`)
- No `@codetrix-studio/capacitor-google-auth` import in web application code

### Authentication (native)

- Isolated in `src/lib/auth/googleSignIn.native.ts`
- Uses `registerPlugin('GoogleAuth')` from `@capacitor/core`
- `signInWithCredential` after native ID token
- Never loaded on web platform (`Capacitor.getPlatform() === 'web'`)

### School / admin registration

- Google sign-in **verifies identity only** for admin signup
- Admin must: choose package → complete school form → submit pending request
- Creates `registrations/{id}` with `type: "subscription_request"`, `status: "pending"`
- Creates `users/{uid}` with `role: "admin"`, `status: "pending"`, `schoolId: ""`
- **Never** auto-creates `schools/{id}` with `status: active`
- Super Admin approves before dashboard access
- `isPendingSchoolAdmin()` blocks `AdminDashboard` until approval

### Deployment

- Workflow: `.github/workflows/deploy-hostinger.yml`
- Node 22, `npm ci --legacy-peer-deps`, `npm run build:web`
- CI grep + local `verify-web-build.mjs` block legacy Google patterns
- Primary deploy: FTP-Deploy-Action (FTPS port 21)
- Fallback: `scripts/hostinger-deploy.sh` (lftp FTPS/SFTP)
- Artifact: `schoolixiq-dist.zip` for manual upload

### Build

- `npm run build` = `build:web` + `build:server`
- `esbuild` pinned to `0.25.12` via `package.json` overrides
- `package-lock.json` must stay synced for CI `npm ci`

---

## Exact protected files list

### Tier A — Never delete, rename, or refactor without explicit user approval

```
AI_RULES.md
.cursorrules
GOOGLE_AI_STUDIO_SYNC.md
package.json
package-lock.json
vite.config.ts
capacitor.config.ts

src/lib/AppError.ts
src/lib/auth/index.ts
src/lib/auth/googleSignIn.ts
src/lib/auth/googleSignIn.native.ts
src/lib/auth/environment.ts
src/lib/auth/errors.ts
src/lib/auth/emailAuth.ts
src/lib/auth/profileProvisioning.ts
src/lib/auth/adminRegistration.ts

scripts/verify-web-build.mjs
scripts/hostinger-deploy.sh
.github/workflows/deploy-hostinger.yml
```

### Tier B — Behaviorally coupled (change only with explicit approval)

```
src/views/Login.tsx
src/App.tsx
src/views/AdminDashboard.tsx
src/lib/AuthContext.tsx
src/lib/firebase.ts
android/capacitor.settings.gradle
android/app/capacitor.build.gradle
```

### Tier C — Native platform (do not remove without approval)

```
android/*
ios/*
```

---

## Authentication rules

1. **Web Google login:** `signInWithPopup(auth, new GoogleAuthProvider())` only.
2. **No redirect flow:** never `signInWithRedirect` or `getRedirectResult`.
3. **No legacy GIS:** never `gapi`, `google.accounts`, `gsi/client`, `platform.js`, `gapi.auth2`, `idpiframe`.
4. **No Capacitor npm web fallback** in web bundles.
5. **Native path:** only via dynamic import of `googleSignIn.native.ts` when platform is not web.
6. **Existing users:** respect existing Firestore profile; do not overwrite active accounts.
7. **Admin Google signup:** authenticate only; defer provisioning to onboarding + `submitPendingAdminSubscription`.
8. **Parent Google signup:** may use `provisionUserProfile` for non-admin roles.

---

## School / admin registration rules

1. Google confirms identity — **not** full school registration.
2. Required flow: **package selection → school information form → pending subscription request**.
3. Firestore `registrations` document must include:
   - `type: "subscription_request"`
   - `status: "pending"`
   - `authProvider: "google"` (or `"password"` for email)
   - `uid`, `email`, `customerInfo`, package fields, `billingCycle`, `createdAt`
4. Firestore `users/{uid}` for new admin:
   - `role: "admin"`
   - `status: "pending"`
   - `subscriptionStatus: "pending"`
   - `schoolId: ""`
   - `pendingRegistrationId`
5. **Do not** create `schools/{schoolId}` until Super Admin approves.
6. Pending admins must see approval/waiting UI — not `AdminDashboard`.

---

## Deployment rules

1. Keep `.github/workflows/deploy-hostinger.yml` functional.
2. Keep `scripts/hostinger-deploy.sh` as lftp fallback — CI calls it on primary FTPS failure.
3. Keep `scripts/verify-web-build.mjs` — run after every web build change.
4. Keep `package.json` and `package-lock.json` synchronized (`npm ci` in CI).
5. Do not change `esbuild` override (`0.25.12`) without explicit approval.
6. CI uses **Node 22**.
7. Static deploy uploads `dist/` only — excludes `server.mjs`.
8. Production build env in CI: `VITE_APP_URL=https://schoolixiq.com` plus secrets for Sentry, VAPID, APK URL.

---

## Build commands

```bash
# Development
npm run dev

# Full production build (web + server)
npm run build

# Web static bundle only (matches CI deploy)
npm run build:web

# Verify no legacy Google auth in dist/assets
npm run verify:web-build

# Production API server
npm run start

# CI-equivalent clean install
npm ci --legacy-peer-deps

# Typecheck
npm run lint
```

**Required before completing any auth/build/deploy task:**

```bash
npm run build
npm run verify:web-build
```

---

## Forbidden changes

Google AI Studio must **never** (without explicit user approval):

| Forbidden action | Reason |
|------------------|--------|
| Delete or rename protected files | Breaks auth, CI, or deploy |
| Import `@codetrix-studio/capacitor-google-auth` in web `src/` | Loads deprecated `platform.js` / `gapi.auth2` |
| Use `signInWithRedirect` or GIS SDKs | Causes `idpiframe` / production login failures |
| Auto-create active schools on admin signup | Security / billing bypass |
| Replace Firebase Auth with mock/simulated login | Breaks production auth |
| Use `localStorage` instead of Firestore for profiles | Data loss / desync |
| Redesign UI, CSS, RTL layouts unprompted | Destroys Arabic RTL identity |
| Commit or push automatically | User controls release |
| Prepare bulk deletion operations | Risk of removing protected baseline |
| Change dependency versions casually | Breaks `npm ci` / esbuild pin |
| Remove deploy workflow or hostinger script | Stops production updates |
| Simplify/refactor `src/lib/auth/*` into Login.tsx | Regresses protected architecture |

---

## How Google AI Studio should work safely

### 1. Connect to source of truth

- Clone or sync from `https://github.com/hamzakzem/SchoolixiQ-`
- Branch: **`main` only** for production work
- Compare local/workspace HEAD with `origin/main` — if different, **stop**

### 2. Read rules first

1. `AI_RULES.md` (mandatory — overrides simplification suggestions)
2. `GOOGLE_AI_STUDIO_SYNC.md` (this file)
3. `.cursorrules` (UI freeze + surgical edits)

### 3. Verify protected files exist

Run through Tier A list above. If **any** file is missing → **stop immediately** and ask user to reset/reconnect from GitHub.

### 4. Make surgical changes only

- Line-level edits for the requested task
- No file-wide rewrites
- No UI changes unless explicitly requested
- No deletions without explicit approval

### 5. Validate before reporting done

```bash
npm run build
npm run verify:web-build
```

Report: build pass/fail, verify output, files touched.

### 6. Hand off to user for git operations

- **Never** `git commit`, `git push`, or `git add` automatically
- User reviews diff and commits manually

---

## What files Google AI Studio must never delete

```
AI_RULES.md
.cursorrules
package.json
package-lock.json
vite.config.ts
src/lib/AppError.ts
src/lib/auth/*  (all 8 files)
scripts/verify-web-build.mjs
scripts/hostinger-deploy.sh
.github/workflows/deploy-hostinger.yml
capacitor.config.ts
```

Also avoid deleting:

- `src/views/Login.tsx`, `src/App.tsx`, `src/views/AdminDashboard.tsx`
- `src/lib/AuthContext.tsx`, `src/lib/firebase.ts`
- `android/` native Google Auth wiring

---

## What to verify before any task

### Workspace integrity

- [ ] On branch `main`
- [ ] `git status` clean (or user aware of local diffs)
- [ ] `HEAD` matches `origin/main`
- [ ] All Tier A protected files present

### Auth safety (if touching login/signup)

- [ ] Web still uses `signInWithPopup` only
- [ ] No new `gapi` / `platform.js` / redirect imports
- [ ] Admin signup still creates pending `subscription_request`
- [ ] No auto `schools/` creation for new admins

### Build safety (if touching build/deps)

- [ ] `esbuild` override still `0.25.12`
- [ ] `package-lock.json` updated if `package.json` changed
- [ ] `npm run build` passes
- [ ] `npm run verify:web-build` passes

### Deploy safety (if touching CI/scripts)

- [ ] `deploy-hostinger.yml` still runs `npm ci` + `build:web`
- [ ] Legacy auth grep step intact
- [ ] `hostinger-deploy.sh` fallback present

---

## Key module reference

| Module | Path | Role |
|--------|------|------|
| Auth barrel | `src/lib/auth/index.ts` | Public auth API |
| Web Google | `src/lib/auth/googleSignIn.ts` | Popup + `authenticateWithGoogle` |
| Native Google | `src/lib/auth/googleSignIn.native.ts` | Capacitor plugin bridge |
| Admin pending | `src/lib/auth/adminRegistration.ts` | `submitPendingAdminSubscription` |
| Profiles | `src/lib/auth/profileProvisioning.ts` | Parent/teacher provisioning |
| Errors | `src/lib/auth/errors.ts` + `src/lib/AppError.ts` | Normalized errors |
| Login UI | `src/views/Login.tsx` | Google button, email auth |
| Onboarding | `src/App.tsx` | Package + school form for pending admin |
| Dashboard guard | `src/views/AdminDashboard.tsx` | Blocks pending admins |

---

## Related documentation

- `AI_RULES.md` — mandatory agent rules (read first)
- `.cursorrules` — Cursor/UI protection guidelines
- Production deploy: GitHub Actions → Hostinger FTPS → https://schoolixiq.com

---

*This file is part of the SchoolixiQ protected production baseline. Update only when the user explicitly requests a baseline revision.*
