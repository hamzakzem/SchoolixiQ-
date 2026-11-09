# Secure deletion (branch `claude/secure-deletion`)

All deletes of school data go through the server engine `backend/deletionService.mjs`
(`POST /api/records/delete | restore | purge | resume | void-payment | delete-notifications | delete-school | school-preview`).
Firestore and Storage rules give browsers **no delete** on these data; the Admin SDK (which bypasses rules) is only used after the
actor, school, role, ownership and partial permissions were read from Firestore on the server.

## Behaviour
- Delete = move to `recycle_bin/{bundleId}` (+ `items`, `files`): record + dependants (+ real files moved to `_trash/{bundleId}/…`).
  Restore returns documents, parent/student links, counters, login and **files**; it only reports success when all are back
  (`RESTORE_INCOMPLETE` otherwise, retry completes it).
- Permanent delete (purge) is separate: admin only, typed confirmation, removes trashed files/Auth login.
- Retention: `standard` = 30 days then automatic purge; `protected` (grades, archives, payroll, finance, school bundles) never auto-purged.
- Money: payments are never deleted (use `void-payment`: status/who/why/history kept, balance reversed once); installments with a paid
  amount are never deleted; deleting a student keeps its payments/paid installments, flagged `studentDeleted`.
- Registration / subscription requests: approved ones are decision records (never deleted); reject = status change.
- School deletion (Super Admin only): preview → school id + exact name + phrase `حذف المدرسة` (+ separate `حذف نهائي` for permanent);
  checkpointed per collection, resumable by the sweep; accounts disabled not deleted; accounts shared with another school only leave
  the school; `audit_logs`/`login_logs`/`deletion_logs` are never touched.
- Job fields: jobId, schoolId, initiatedBy, entityType/entityId, status + `jobStatus`
  (PENDING, PROCESSING, PARTIALLY_COMPLETED, COMPLETED, RESTORING, RESTORED, FAILED, PERMANENTLY_DELETED), createdAt, expiresAt,
  processedItems, failedItems, retryCount (bounded exponential back-off, max 6), relatedRecords, storageReferences.
- Safety: per-record lock (`deletion_locks`), idempotency key, every attempt in `deletion_logs` (server-write-only).

## Hostinger (not applied by this branch)
Without Admin credentials every delete answers `503 ADMIN_UNAVAILABLE` before touching data. Set in hPanel:
`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (PEM; `\n` escapes are accepted), and
`NOTIFICATION_CRON_SECRET` (≥ 32 chars). `/api/public/status` shows `adminCredentialsValid`, `adminCredentialProblems`,
`deletionEnabled` (no values). Use a dedicated service account with only Firestore + Storage + Auth-admin roles.

## Merge / deploy / rollback
1. Set the Hostinger variables, deploy Firestore indexes if needed (`firebase deploy --only firestore:indexes`).
2. Merge the PR (the workflows publish the site plus `firestore.rules` and `storage.rules`). Merge only AFTER step 1: the new rules
   close client deletes, so without Admin credentials nothing could be deleted at all.
3. Check `/api/public/status` → `deletionEnabled: true`, then test one delete + restore on a test school.
4. Rollback: revert the merge commit (rules revert with it); bundles in `recycle_bin` and `_trash/` stay valid and can be restored
   later by the engine. Git tags: `checkpoint-before-del-phase2`, `checkpoint-del-phase2-engine`.

## Known limits
- Files are found by scanning the record for Storage URLs plus exclusive folders; free-text links that are not Firebase URLs are not.
- A payment void does not recompute per-installment allocations (the payment stores only installment ids): referenced installments
  get `reviewRequired: true`. There is no void button in the Tuition screen yet (API + client function exist).
- Distributor records (`deleteDistributorRecords`) and chat messages (`permanent-delete`) keep their own Super-Admin-only paths.
- Smart-assistant content (`assistant_*`) is platform configuration deleted directly by Super Admin rules.
