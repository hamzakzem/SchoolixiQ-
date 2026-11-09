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
  the student is flagged `financialReviewRequired`, new payments for that student are blocked, and an admin confirms the review
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
`market/{id}/`). A file is moved only if its path is safe (no traversal), inside the record's own scope
(`schools/{school}/`, `students/{school}/`, record folders) and not referenced by another live record of the school (shared files stay).
Paths: `students/{school}/{id}/photo_*`, `schools/{school}/store/products|logo|idcards/*`, `users/{uid}/*`, `market/{id}/*`,
`chat_files/*`, `chat_attachments/*` (the last two belong to the message cleaner, hard delete by design).

## Delete paths that are NOT in the generic engine (each with a stated reason)
| Path | Why | Control |
|---|---|---|
| Chat messages (`/api/admin/messages/permanent-delete`) and user conversation purge | privacy/abuse removal must be irreversible | Super Admin only, per-target lock, `deletion_logs` entry via `deleteChatMessage` / `runAuditedPlatformDelete` |
| Plans/packages (`DELETE_PLAN`) | references must be migrated first (PR #30 logic) | `manage_packages` check + lock + `deletion_logs` |
| Users' own `users/{uid}` claim/migration deletes (`AuthContext`, `profileProvisioning`) | account provisioning, not data deletion | rules: only `canClaimProvisionedUserDoc` |
| Operational logs deleted by Super Admin rules (`login_logs`, `print_logs`, `tuition_reminder_*`, `notification_logs`, `system_diagnostics`, `logs`, `school_presence`, `assistant_tickets/events`, `distributor_support_*`, `system*`) | platform telemetry/support data, no school records | rules: Super Admin only |
Everything else (students … assistant content, distributors, notifications, requests, schools, accounts) is covered; direct client deletes are denied by rules
(`rules-deletion.mjs` proves it for 8 roles × 35 collections).

## Hostinger (not applied by this branch)
Without valid Admin credentials every delete answers `503 ADMIN_UNAVAILABLE` before touching data. Set in hPanel:
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
`rules-deletion.mjs`, `rules-school-isolation.mjs`, `deletion-ui.cjs`, `deletion-ui-finance.cjs` (+ existing suites).

## Known limits
- Free-text links that are not Firebase Storage URLs are not discovered as files.
- Distributor commission history (`distributorMonthlyCommissions`) is never touched by distributor deletion.
- The generic restore of a *school* does not recreate messaging that a permanent purge removed.
- Nothing here was exercised against production Firebase (credentials not available).
