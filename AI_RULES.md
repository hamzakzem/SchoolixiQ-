# SchoolixiQ AI Rules

## Protected files

Never delete, rename, simplify, or refactor:

* src/lib/auth/*
* src/lib/AppError.ts
* .github/workflows/*
* scripts/*
* vite.config.ts
* vite.config.mjs
* package.json
* package-lock.json
* capacitor.config.ts
* android/*
* ios/*

## Authentication rules

Web Google authentication must use:

* Firebase Auth v9
* GoogleAuthProvider
* signInWithPopup

Never introduce:

* gapi
* platform.js
* google.accounts
* gsi/client
* gapi.auth2
* signInWithRedirect
* getRedirectResult
* idpiframe

Never import @codetrix-studio/capacitor-google-auth into web code.

Native Google login must remain isolated in:

src/lib/auth/googleSignIn.native.ts

## School registration flow

Google only verifies identity.

Flow:

Google login
→ package selection
→ school information
→ create registrations/{id}
→ type: subscription_request
→ status: pending
→ Super Admin approval

Never create active schools automatically.

## Deployment rules

Never remove or break:

* .github/workflows/deploy-hostinger.yml
* scripts/hostinger-deploy.sh
* scripts/verify-web-build.mjs

Keep package.json and package-lock.json synchronized.

Do not change dependency versions unless explicitly requested.

## Before completing any task

Run:

* npm run build
* npm run verify:web-build

Then report:

1. Changed files.
2. Reason for each file change.
3. Confirmation that no protected files were deleted.
4. Confirmation that no legacy Google auth patterns exist.
5. Build result.
6. Verification result.

## Work discipline

Modify only files required for the task.

Do not perform broad refactors.

Do not delete files to simplify the project.

Do not modify ID card settings unless explicitly requested.

If a protected file must change, stop and ask for explicit approval first.
