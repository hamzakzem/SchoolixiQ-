# Secure deletion (branch `claude/secure-deletion`)

All deletes of school/platform data go through the server engine `backend/deletionService.mjs`
(`POST /api/records/delete | restore | purge | resume | void-payment | resolve-financial-review | delete-notifications | delete-school | school-preview`
plus the legacy `/api/admin/*` delete routes, which are now thin wrappers). Firestore and Storage rules give browsers **no delete** on
school data; the Admin SDK (which bypasses rules) is only used after the actor, school, role, ownership and partial permissions were
read from Firestore **on the server** (nothing the browser sends — role, schoolId, permissions — is trusted).

## Behaviour
- **Delete = trash**: record + dependants go to `recycle_bin/{bundleId}` (+ `items`, `files`); the live collections lose them at once so
  lists/counters/reports are right. Files are **moved** to `_trash/{bundleId}/…` (download token kept).
- **Restore** returns documents, parent/student links, counters, login **and files**; it only reports success when everything is back
  (`RESTORE_INCOMPLETE` otherwise; retrying finishes it). School bundles restore sub-collections, accounts and files too.
- **Permanent delete (purge)** is separate: admin only (school) / super admin (platform), typed confirmation `حذف نهائي`.
- **Retention**: `standard` = 30 days then automatic purge; `protected` (grades, archives, payroll, finance, school and distributor
  bundles) is never purged automatically.
- **Money**: payments are never deleted (not even permanently). `void-payment` keeps amount/date/receipt/collector, stores who/when/why
  in `history`, reverses the student balance **once** and re-allocates the remaining money over the installments (earliest due first, like
  the payment screen). If the stored installments do not add up to the payments (manual toggles, extra payments) nothing is guessed:
  the student is flagged `financialReviewRequired`, new payments for that student are **refused by the Firestore rule** (not only the UI), and an admin confirms the review
  (`resolve-financial-review`, logged). Installments with money on them are never deleted; deleting a student keeps its payments and
  paid installments flagged `studentDeleted`.
- **Requests**: approved registration/subscription requests are decision records (never deleted). Rejecting/approving = status change.
- **School deletion** (Super Admin only): preview (counts, accounts, shared accounts, files) → school id + exact name + phrase
  `حذف المدرسة` (+ separate `حذف نهائي` for permanent). Checkpointed per collection/page, resumable by the sweep; accounts are
  disabled not deleted; an account shared with another school only leaves this school; super-admin accounts are never touched;
  `audit_logs`, `login_logs`, `deletion_logs` are retained. Messaging of the school is removed only on permanent purge.
- **Job fields**: jobId, schoolId, initiatedBy, entityType/entityId, `status` + `jobStatus` (PENDING, PROCESSING, PARTIALLY_COMPLETED,
  COMPLETED, RESTORING, RESTORED, FAILED, PERMANENTLY_DELETED), createdAt, expiresAt, processedItems, failedItems, retryCount
  (exponential back-off 1 min → 1 h, max 6 tries, then FAILED until an admin resumes), relatedRecords, storageReferences.
- **Safety**: per-record lock (`deletion_locks`), idempotency keys, id validation (no `/`, `..`, prototype names), every attempt in
  `deletion_logs` (server-write-only, no TTL). No single transaction is used for large jobs (pages of ≤ 400 writes + checkpoints).

## Storage Cleanup Registry (`backend/storageRegistry.mjs`)
Files are discovered from the record itself (every string, nested, including links embedded in free text; `gs://`, firebasestorage,
storage.googleapis, emulator URLs) plus folders that belong to exactly one record (`students/{school}/{id}/`, `users/{uid}/`,
`market/{id}/`). A file is moved to `_trash` only if **all** hold:
1. its path is safe (no `..`, no leading `/`, no `//`, no control characters) and inside the record's own scope
   (`schools/{school}/`, `students/{school}/`, the record's own folder) — otherwise `out_of_scope`: never touched, not even by a permanent delete;
2. **no other record of ANY school references it**. Verified with a *global* server-side scan (Admin SDK, all schools, paginated 500/page,
   bounded to 200 000 documents): live records, the main record and `items` of every other bundle in any bin (restorable data keeps its
   files in use). References are found in every string of the document (nested arrays/objects, free text);
3. the scan completed. If it cannot (bound exceeded) the file is **left in place** (`unverified`), the bundle gets
   `storageWarnings: [{code: "REFERENCE_SCAN_INCOMPLETE"}]` and the audit log entry carries `storage.unverified`. Query errors
   are not swallowed: the job fails and is retried.
Identifiers of another tenant's records are never written into job data (`sharedWith` is only `same_school` / `other_tenant`).
**Purge re-verifies**: a file referenced again after the delete is *rescued* back to its original path (`filesRescued`); if the check cannot
complete the trashed copy is kept (`filesRetained`); files left in place because they were shared are removed by the purge of the
last bundle that used them, once nothing references them. School deletion applies the same checks to every file of the school.
Paths: `students/{school}/{id}/photo_*`, `schools/{school}/store/products|logo|idcards/*`, `users/{uid}/*`, `market/{id}/*`,
`chat_files/*`, `chat_attachments/*` (the last two belong to the message cleaner, hard delete by design).
Limit: the scan reads every document of the scanned collections; at very large scale a maintained reference index is the next step
(until then the bound makes it fail closed, never delete).

## Preview environments (Hostinger / Cloudflare / any other)
Evidence from the repository (the Hostinger preview runtime itself cannot be inspected from here):
- Both GitHub workflows run only on push to `main` (and manual dispatch); pull requests and feature branches deploy nothing from GitHub.
  A Hostinger Git preview is built by Hostinger itself, outside GitHub Actions.
- The committed web client config (`firebase-applet-config.json`) names the **production** project `yala-safari-iq`: any build of any
  branch, including a preview, talks to production Firestore/Auth/Storage with the *client* SDK (subject to the security rules).
- A preview's backend gets whatever environment variables the Hostinger site defines; whether they include the production Admin
  credentials is **unknown** from the repository. CORS (`server.ts`) allows only the production origins (+ `APP_URL`), so a preview page
  calling its own backend with an `Origin` header is blocked unless `APP_URL` is set to the preview domain.
Therefore destructive operations **fail closed outside production hosts** (`backend/runtimeGuard.mjs`):
all destructive routes (`/api/records/*`, `/api/admin/delete-*`, school/message/plan/distributor deletes) answer `503
DESTRUCTIVE_OPS_DISABLED` unless the request host is `*.schoolixiq.com|iq` or the process runs on the Firebase emulators; known preview
hosts (`*.hostingersite.com`, `pages.dev`, `vercel.app`, `netlify.app`, …) and unknown hosts are refused; `DEPLOY_ENV=preview|staging`
or `DELETION_DISABLED=true` force-disable; the background sweep runs only on a process that has served a production host and never one that
served a preview host; the web client also refuses these calls on preview hosts.
`node scripts/check-preview-isolation.mjs` (npm `check:preview-isolation`, workflow `pr-safety.yml`) fails if a PR/branch workflow
deploys or uses Firebase credentials, if a preview/staging config file names the production project or Admin credentials, if service-account
material is in the repo or the build, or if the guard/wiring regresses; `scripts/e2e/preview-isolation.test.mjs` proves it fails on unsafe fixtures
and exercises the real server.
Not covered (outside this PR's scope, **needs a Hostinger-side decision**): a preview that holds the production Admin credentials can still
run the *other* background workers (push dispatcher, chat notifications) and non-destructive server routes against production data.
Give the preview its own environment variables (no `FIREBASE_PRIVATE_KEY`) or a dedicated Firebase project.

## Delete paths that are NOT in the generic engine (verified, each with a stated reason)
| Path | Verified behaviour | Why it stays outside |
|---|---|---|
| Chat messages (`/api/admin/messages/permanent-delete`) and user conversation purge | Super Admin only (admin/teacher/parent get 403 in `deletion-phase4`), per-target lock, `deletion_logs` entry (`DELETE_MESSAGE_PERMANENT`, `PURGE_USER_CONVERSATIONS`) | Privacy/abuse removal must be irreversible; a trash copy would defeat it. A super admin can purge any user's conversations by design (platform policy unchanged) |
| School messaging on school deletion | Messages are removed **only on the permanent purge** of a school bundle, after which the bundle (and therefore restore) no longer exists; a *trashed* school keeps its messages untouched, so a restore never loses messages | Same privacy reason; documented order prevents a half-restorable state |
| Plans/packages (`DELETE_PLAN`) | `manage_packages` permission (Super Admin or delegated assistant) checked server-side, references migrated first, lock + `deletion_logs` | Reference-migration logic (PR #30) |
| `distributorMonthlyCommissions` | Never touched by distributor deletion (rules: no client create/update/delete); the school keeps `distributorDeleted/CommissionPaused` flags | Commission ledger = financial history, retained by policy |
| Operational/audit-style logs (`login_logs`, `print_logs`, `tuition_reminder_logs`, `logs`, `notification_logs`) | **Client deletion closed in rules** (no code ever deleted them); Super Admin may still create/update where it could before | Tamper-proofing; any future clean-up must be a server job |
| Telemetry/support data (`tuition_reminder_tracking`, `system_diagnostics`, `school_presence`, `assistant_tickets/events`, `distributor_support_*`, `system*`) | Super Admin only by rules; no school records inside | Platform data, not tenant records |
| Users' own `users/{uid}` claim/migration deletes (`AuthContext`, `profileProvisioning`) | rules: only `canClaimProvisionedUserDoc` | Account provisioning, not data deletion |
| Non-Firebase links in free text (external URLs, `data:` URIs) | Not recognised as Storage files → **never** deleted or moved (fails safe: possible orphan files, never data loss) | Not our objects |
Everything else (students … assistant content, distributors, notifications, requests, schools, accounts) is covered; direct client deletes are
denied by rules (`rules-deletion.mjs` proves it for 8 roles × 40 collections).

## Hostinger (not applied by this branch)
Without valid Admin credentials every delete answers `503 ADMIN_UNAVAILABLE` before touching data. Set in hPanel (production site only):
`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` (service-account email), `FIREBASE_PRIVATE_KEY` (PEM; `\n` escapes accepted),
`NOTIFICATION_CRON_SECRET` (≥ 32 chars). `/api/public/status` shows `adminCredentialsValid`, `adminCredentialProblems`,
`deletionEnabled` (names/messages only, never values). Use a dedicated service account limited to Firestore, Storage and Auth admin.

## Merge / deploy / rollback
1. Set the Hostinger variables; deploy Firestore indexes (`firebase deploy --only firestore:indexes`) — the workflow publishes rules
   but index creation failed with 403 earlier.
2. Merge the PR **only after step 1**: the workflows publish the site plus `firestore.rules` and `storage.rules` on push to `main`
   (opening/updating the PR deploys nothing — both workflows trigger on `main` only), and the new rules close client deletes.
3. Check `/api/public/status` → `deletionEnabled: true`, then delete + restore one record in a test school.
4. Rollback: revert the merge commit (rules revert with it). Bundles in `recycle_bin` and files in `_trash/` stay valid and restorable by a
   later deploy of the engine. Git tags: `checkpoint-before-del-phase2`, `checkpoint-del-phase2-engine`.

## Tests (Firebase emulators; run each after restarting the emulator — they create data)
`scripts/e2e/`: `deletion-api.test.mjs`, `deletion-phase2.test.mjs`, `deletion-phase3.test.mjs`, `deletion-phase4.test.mjs`,
`deletion-phase5.test.mjs` (cross-school Storage), `deletion-phase6-finance.test.mjs` (payment cancellation), `preview-isolation.test.mjs`,
`rules-deletion.mjs`, `rules-school-isolation.mjs`, `deletion-ui.cjs`, `deletion-ui-finance.cjs` (+ existing suites).

## Known limits
- Free-text links that are not Firebase Storage URLs are not discovered as files (see table).
- The reference scan is O(documents) per delete that has files; bounded, fails closed.
- A file that lives in School A's folder and stays referenced only by School B after A deleted its record can never be removed by B (out of scope): it remains until a platform operator cleans it.
- Hostinger preview runtime was not inspectable from this environment (sandbox proxy returns 403 for that host).
- Nothing here was exercised against production Firebase (credentials not available).
