import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentReference,
  type UpdateData,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { isLogoutInProgress } from '../logoutGuard';
import {
  buildDeterministicDocId,
  classifyCollection,
  getModulePolicy,
  hasBlockedOfflineFields,
  isOperationAllowedOffline,
  stripBlockedOfflineFields,
} from './offlinePolicy';
import {
  clearQueueItemsByStatus,
  deleteQueueItem,
  getAllQueueItems,
  getQueueItem,
  putQueueItem,
} from './offlineQueue';
import {
  attachOfflineNetworkListeners,
  getOfflineStatusSnapshot,
  setLastSyncAt,
  setLastSyncError,
  setOnlineStatus,
  setQueueCounts,
  setSyncing,
} from './offlineStatus';
import type {
  OfflineActor,
  OfflineBatchWrite,
  OfflineModule,
  OfflineOperationStatus,
  OfflineOperationType,
  OfflineQueuedOperation,
  OfflineQueueCounts,
  QueueOperationInput,
} from './offlineTypes';
import { toast } from 'react-hot-toast';
import {
  getQuotaResumeAtMs,
  handleResourceExhausted,
  isQuotaWritePaused,
  isResourceExhaustedError,
  notifyQuotaExhaustedIfNeeded,
} from '../firestoreQuota';

const DEVICE_ID_KEY = 'schoolixiq_offline_device_id';
let syncInFlight = false;
let syncPaused = false;
let quotaResumeTimer: ReturnType<typeof setTimeout> | null = null;
let initialized = false;

function getDeviceId(): string {
  if (typeof localStorage === 'undefined') return 'unknown-device';
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

const SERVER_TIMESTAMP_MARKER = '__SERVER_TIMESTAMP__';

function sanitizePayloadForQueue(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value && typeof value === 'object' && '_methodName' in (value as Record<string, unknown>)) {
      out[key] = SERVER_TIMESTAMP_MARKER;
    } else if (Array.isArray(value)) {
      out[key] = value;
    } else if (value && typeof value === 'object') {
      out[key] = sanitizePayloadForQueue(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function restorePayloadFromQueue(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === SERVER_TIMESTAMP_MARKER) {
      out[key] = serverTimestamp();
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = restorePayloadFromQueue(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function sanitizeBatchWritesForQueue(writes: OfflineBatchWrite[]): OfflineBatchWrite[] {
  return writes.map((write) => ({
    ...write,
    data: sanitizePayloadForQueue(write.data),
  }));
}

function restoreBatchWritesFromQueue(writes: OfflineBatchWrite[]): OfflineBatchWrite[] {
  return writes.map((write) => ({
    ...write,
    data: restorePayloadFromQueue(write.data),
  }));
}

export function createClientMutationId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `mut-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function isNetworkFirestoreError(error: unknown): boolean {
  const err = error as { code?: string; message?: string };
  const code = err?.code ?? '';
  const msg = String(err?.message ?? error ?? '').toLowerCase();
  return (
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    msg.includes('offline') ||
    msg.includes('network') ||
    msg.includes('failed to get document') ||
    msg.includes('client is offline')
  );
}

export function isPermissionDeniedError(error: unknown): boolean {
  const err = error as { code?: string; message?: string };
  return err?.code === 'permission-denied' || /permission/i.test(String(err?.message ?? ''));
}

function scheduleQuotaSyncResume(): void {
  if (quotaResumeTimer) {
    clearTimeout(quotaResumeTimer);
    quotaResumeTimer = null;
  }
  const resumeAt = getQuotaResumeAtMs();
  const delay = Math.max(5_000, resumeAt - Date.now());
  quotaResumeTimer = setTimeout(() => {
    quotaResumeTimer = null;
    console.info('[Quota] SYNC_RESUMED', { reason: 'quota_cooldown_elapsed' });
    resumeOfflineSync();
  }, delay);
}

function pauseSyncForQuota(source: string): void {
  handleResourceExhausted(source);
  pauseOfflineSync();
  console.warn('[Quota] SYNC_PAUSED', { source, resumeAt: getQuotaResumeAtMs() });
  notifyQuotaExhaustedIfNeeded();
  scheduleQuotaSyncResume();
}

function shouldAttemptOfflineQueue(): boolean {
  return !getOfflineStatusSnapshot().isOnline;
}

function withSyncMeta(
  data: Record<string, unknown>,
  clientMutationId: string,
): Record<string, unknown> {
  return {
    ...data,
    clientMutationId,
    syncedFromOffline: true,
    syncedAt: serverTimestamp(),
    deviceId: getDeviceId(),
  };
}

async function refreshQueueCounts(): Promise<OfflineQueueCounts> {
  const items = await getAllQueueItems<OfflineQueuedOperation>();
  const counts: OfflineQueueCounts = {
    pending: 0,
    syncing: 0,
    synced: 0,
    failed: 0,
    blocked: 0,
    total: items.length,
  };
  for (const item of items) {
    counts[item.status] += 1;
  }
  setQueueCounts(counts);
  return counts;
}

export async function queueOfflineOperation(
  input: QueueOperationInput,
): Promise<OfflineQueuedOperation> {
  const now = new Date().toISOString();
  const operation: OfflineQueuedOperation = {
    ...input,
    id: input.id ?? createClientMutationId(),
    deviceId: input.deviceId ?? getDeviceId(),
    payload: sanitizePayloadForQueue(input.payload),
    batchWrites: input.batchWrites ? sanitizeBatchWritesForQueue(input.batchWrites) : undefined,
    createdAt: now,
    updatedAt: now,
    status: 'pending',
    retryCount: 0,
  };

  await putQueueItem(operation);
  await refreshQueueCounts();
  console.info('[Offline] QUEUED', {
    id: operation.id,
    module: operation.module,
    collection: operation.collection,
    operation: operation.operation,
    clientMutationId: operation.clientMutationId,
  });
  toast.success('تم حفظ العملية محلياً — ستُرفع عند عودة الاتصال');
  return operation;
}

async function patchQueueOperation(
  id: string,
  patch: Partial<OfflineQueuedOperation>,
): Promise<void> {
  const existing = await getQueueItem<OfflineQueuedOperation>(id);
  if (!existing) return;
  const updated: OfflineQueuedOperation = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await putQueueItem(updated);
}

async function findExistingByClientMutationId(
  collectionName: string,
  clientMutationId: string,
  options?: { failOnQueryError?: boolean },
): Promise<boolean> {
  try {
    const q = query(
      collection(db, collectionName),
      where('clientMutationId', '==', clientMutationId),
      limit(1),
    );
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (error) {
    if (options?.failOnQueryError) {
      throw error;
    }
    return false;
  }
}

async function findPaymentByClientMutationId(
  clientMutationId: string,
): Promise<{ exists: boolean; amount?: number }> {
  const q = query(
    collection(db, 'payments'),
    where('clientMutationId', '==', clientMutationId),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return { exists: false };
  const data = snap.docs[0].data();
  const amount = typeof data.amount === 'number' ? data.amount : Number(data.amount);
  return {
    exists: true,
    amount: Number.isFinite(amount) ? amount : undefined,
  };
}

function toComparableTime(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'object') {
    const record = value as { seconds?: number; toDate?: () => Date };
    if (typeof record.seconds === 'number') {
      return record.seconds * 1000;
    }
    if (typeof record.toDate === 'function') {
      const date = record.toDate();
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() : null;
    }
  }
  return null;
}

function isRemoteNewer(
  remoteValue: unknown,
  localValue: unknown,
  fallbackLocalIso?: string,
): boolean {
  const remoteMs = toComparableTime(remoteValue);
  const localMs = toComparableTime(localValue) ?? toComparableTime(fallbackLocalIso);
  if (remoteMs == null || localMs == null) return false;
  return remoteMs > localMs;
}

async function applyBatchWrites(
  writes: OfflineBatchWrite[],
  clientMutationId: string,
): Promise<void> {
  const batch = writeBatch(db);
  const { increment } = await import('firebase/firestore');
  for (const write of writes) {
    const rawData = { ...write.data };
    const incrementMap = rawData.__increment as Record<string, number> | undefined;
    if (incrementMap) {
      delete rawData.__increment;
    }
    const data = withSyncMeta(rawData, clientMutationId);
    if (incrementMap) {
      for (const [field, value] of Object.entries(incrementMap)) {
        data[field] = increment(value);
      }
    }
    if (write.operation === 'create') {
      const ref = write.docId
        ? doc(db, write.collection, write.docId)
        : doc(collection(db, write.collection));
      batch.set(ref, data);
    } else if (write.operation === 'set') {
      const ref = doc(db, write.collection, write.docId!);
      batch.set(ref, data, { merge: write.merge ?? false });
    } else {
      const ref = doc(db, write.collection, write.docId!);
      batch.update(ref, data as UpdateData<Record<string, unknown>>);
    }
  }
  await batch.commit();
}

async function syncSingleOperation(op: OfflineQueuedOperation): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== op.userId) {
    throw new Error('signed_out');
  }

  if (op.batchWrites?.length) {
    const existingPayment = await findPaymentByClientMutationId(op.clientMutationId);
    if (existingPayment.exists) {
      const queuedAmount = Number(op.payload.amount);
      if (
        Number.isFinite(queuedAmount) &&
        existingPayment.amount !== undefined &&
        existingPayment.amount !== queuedAmount
      ) {
        throw new Error('payment_amount_mismatch');
      }
      console.info('[Offline] DUPLICATE_SKIPPED', {
        clientMutationId: op.clientMutationId,
        module: op.module,
      });
      return;
    }
    await applyBatchWrites(restoreBatchWritesFromQueue(op.batchWrites), op.clientMutationId);
    return;
  }

  const metaPayload = withSyncMeta(restorePayloadFromQueue(op.payload), op.clientMutationId);

  if (op.operation === 'create') {
    const exists = await findExistingByClientMutationId(op.collection, op.clientMutationId, {
      failOnQueryError: op.module === 'payments',
    });
    if (exists) {
      console.info('[Offline] DUPLICATE_SKIPPED', {
        clientMutationId: op.clientMutationId,
        collection: op.collection,
      });
      return;
    }

    if (op.deterministicDocId) {
      const ref = doc(db, op.collection, op.deterministicDocId);
      const existingDoc = await getDoc(ref);
      if (existingDoc.exists()) {
        if (op.conflictPolicy === 'latest_updated_at_wins') {
          if (
            isRemoteNewer(
              existingDoc.data()?.updatedAt,
              op.payload.updatedAt,
              op.updatedAt,
            )
          ) {
            throw new Error('conflict_remote_newer');
          }
        }
        await setDoc(ref, metaPayload, { merge: true });
        return;
      }
      await setDoc(ref, metaPayload, { merge: true });
      return;
    }

    await addDoc(collection(db, op.collection), metaPayload);
    return;
  }

  if (op.operation === 'update') {
    const docId = op.originalDocId;
    if (!docId) throw new Error('missing_original_doc_id');
    const ref = doc(db, op.collection, docId);

    if (op.conflictPolicy === 'latest_updated_at_wins') {
      const existingDoc = await getDoc(ref);
      if (existingDoc.exists()) {
        if (
          isRemoteNewer(
            existingDoc.data()?.updatedAt,
            op.payload.updatedAt,
            op.updatedAt,
          )
        ) {
          throw new Error('conflict_remote_newer');
        }
      }
    }

    await updateDoc(ref, metaPayload as UpdateData<Record<string, unknown>>);
    return;
  }

  if (op.operation === 'soft_delete') {
    const docId = op.originalDocId;
    if (!docId) throw new Error('missing_original_doc_id');
    await updateDoc(doc(db, op.collection, docId), {
      ...metaPayload,
      deletedAt: serverTimestamp(),
      isDeleted: true,
    } as UpdateData<Record<string, unknown>>);
  }
}

export async function syncOfflineQueue(): Promise<void> {
  if (syncInFlight || syncPaused) return;
  if (isQuotaWritePaused()) return;
  if (!getOfflineStatusSnapshot().isOnline) return;
  if (!auth.currentUser || isLogoutInProgress()) return;

  syncInFlight = true;
  setSyncing(true);
  console.info('[Offline] SYNC_START');

  try {
    const items = (await getAllQueueItems<OfflineQueuedOperation>())
      .filter((item) => item.status === 'pending' || item.status === 'failed')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    for (const item of items) {
      if (!auth.currentUser || isLogoutInProgress()) break;
      if (item.requiresOnlineApproval) {
        await patchQueueOperation(item.id, {
          status: 'blocked',
          errorMessage: 'requires_online_approval',
        });
        console.info('[Offline] BLOCKED', { id: item.id, reason: 'requires_online_approval' });
        continue;
      }

      await patchQueueOperation(item.id, { status: 'syncing' });
      await refreshQueueCounts();

      try {
        await syncSingleOperation(item);
        await patchQueueOperation(item.id, { status: 'synced', errorMessage: undefined });
        console.info('[Offline] SYNC_SUCCESS', { id: item.id, module: item.module });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isResourceExhaustedError(error)) {
          await patchQueueOperation(item.id, {
            status: 'pending',
            errorMessage: 'resource-exhausted',
            retryCount: item.retryCount + 1,
          });
          pauseSyncForQuota('offline_sync');
          break;
        }
        if (isPermissionDeniedError(error)) {
          await patchQueueOperation(item.id, {
            status: 'failed',
            errorMessage: message,
            retryCount: item.retryCount + 1,
          });
          console.error('[Offline] SYNC_FAILED', { id: item.id, code: 'permission-denied', message });
          continue;
        }
        if (message === 'conflict_remote_newer' || message === 'payment_amount_mismatch' || message === 'signed_out') {
          await patchQueueOperation(item.id, {
            status: 'blocked',
            errorMessage: message,
          });
          console.info('[Offline] BLOCKED', { id: item.id, reason: message });
          continue;
        }
        await patchQueueOperation(item.id, {
          status: 'failed',
          errorMessage: message,
          retryCount: item.retryCount + 1,
        });
        console.error('[Offline] SYNC_FAILED', { id: item.id, message });
      }
    }

    setLastSyncAt(new Date().toISOString());
    setLastSyncError(null);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setLastSyncError(message);
  } finally {
    await refreshQueueCounts();
    syncInFlight = false;
    setSyncing(false);
  }
}

export function pauseOfflineSync(): void {
  syncPaused = true;
}

export function resumeOfflineSync(): void {
  syncPaused = false;
  if (getOfflineStatusSnapshot().isOnline) {
    void syncOfflineQueue();
  }
}

export async function retryFailedOfflineOperations(): Promise<void> {
  const failed = await getAllQueueItems<OfflineQueuedOperation>();
  for (const item of failed.filter((op) => op.status === 'failed')) {
    await patchQueueOperation(item.id, { status: 'pending', errorMessage: undefined });
  }
  await refreshQueueCounts();
  await syncOfflineQueue();
}

export async function clearSyncedOfflineOperations(): Promise<number> {
  const cleared = await clearQueueItemsByStatus('synced');
  await refreshQueueCounts();
  return cleared;
}

export async function listOfflineOperations(limitCount = 20): Promise<OfflineQueuedOperation[]> {
  const items = await getAllQueueItems<OfflineQueuedOperation>();
  return items
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limitCount);
}

type SafeWriteContext = {
  module?: OfflineModule;
  actor: OfflineActor;
  clientMutationId?: string;
  originalDocId?: string;
  deterministicDocId?: string;
  batchWrites?: OfflineBatchWrite[];
  merge?: boolean;
  onQueued?: (op: OfflineQueuedOperation) => void;
};

async function maybeQueueOrThrow(
  module: OfflineModule,
  collectionName: string,
  operation: OfflineOperationType,
  payload: Record<string, unknown>,
  ctx: SafeWriteContext,
): Promise<'queued'> {
  if (!isOperationAllowedOffline(module, operation)) {
    console.info('[Offline] POLICY_REQUIRES_ONLINE', { module, operation, collection: collectionName });
    toast.error('هذه العملية تحتاج اتصالاً بالإنترنت');
    throw new Error('offline_policy_requires_online');
  }

  const blockedField = hasBlockedOfflineFields(module, payload);
  if (blockedField && operation === 'create') {
    console.info('[Offline] BLOCKED', { module, blockedField });
    toast.error('هذا الحقل غير متاح بدون اتصال بالإنترنت');
    throw new Error(`offline_blocked_field:${blockedField}`);
  }

  const queuePayload =
    blockedField && operation === 'update'
      ? stripBlockedOfflineFields(module, payload)
      : payload;

  const policy = getModulePolicy(module);
  const clientMutationId = ctx.clientMutationId ?? createClientMutationId();
  const deterministicDocId =
    ctx.deterministicDocId ?? buildDeterministicDocId(module, queuePayload);

  const queued = await queueOfflineOperation({
    module,
    collection: collectionName,
    operation,
    payload: queuePayload,
    originalDocId: ctx.originalDocId,
    deterministicDocId,
    schoolId: ctx.actor.schoolId,
    userId: ctx.actor.userId,
    role: ctx.actor.role,
    clientMutationId,
    conflictPolicy: policy.conflictPolicy,
    requiresOnlineApproval: policy.requiresOnlineApproval,
    batchWrites: ctx.batchWrites,
  });
  ctx.onQueued?.(queued);
  return 'queued';
}

async function tryOnlineOrQueue<T>(
  onlineFn: () => Promise<T>,
  queueFn: () => Promise<T>,
): Promise<T> {
  if (isQuotaWritePaused()) {
    notifyQuotaExhaustedIfNeeded();
    throw new Error('resource-exhausted');
  }
  if (shouldAttemptOfflineQueue()) {
    return queueFn();
  }
  try {
    return await onlineFn();
  } catch (error) {
    if (isResourceExhaustedError(error)) {
      pauseSyncForQuota('safe_firestore_write');
      throw error;
    }
    if (isNetworkFirestoreError(error)) {
      return queueFn();
    }
    throw error;
  }
}

export async function safeFirestoreSet(
  ref: DocumentReference,
  data: Record<string, unknown>,
  ctx: SafeWriteContext,
  options?: { merge?: boolean },
): Promise<{ mode: 'online' | 'queued'; id: string }> {
  const collectionName = ref.path.split('/')[0];
  const module = ctx.module ?? classifyCollection(collectionName);
  const docId = ref.id;
  const operation: OfflineOperationType = options?.merge ? 'update' : 'create';

  return tryOnlineOrQueue(
    async () => {
      await setDoc(ref, data, { merge: options?.merge ?? false });
      return { mode: 'online' as const, id: docId };
    },
    async () => {
      await maybeQueueOrThrow(module, collectionName, operation, data, {
        ...ctx,
        originalDocId: docId,
        deterministicDocId: ctx.deterministicDocId ?? docId,
        merge: options?.merge,
      });
      return { mode: 'queued' as const, id: docId };
    },
  );
}

export async function safeFirestoreAdd(
  collectionName: string,
  data: Record<string, unknown>,
  ctx: SafeWriteContext,
): Promise<{ mode: 'online' | 'queued'; id: string }> {
  const module = ctx.module ?? classifyCollection(collectionName);

  return tryOnlineOrQueue(
    async () => {
      const ref = await addDoc(collection(db, collectionName), data);
      return { mode: 'online' as const, id: ref.id };
    },
    async () => {
      await maybeQueueOrThrow(module, collectionName, 'create', data, ctx);
      return {
        mode: 'queued' as const,
        id: ctx.deterministicDocId ?? ctx.clientMutationId ?? createClientMutationId(),
      };
    },
  );
}

export async function safeFirestoreUpdate(
  ref: DocumentReference,
  data: Record<string, unknown>,
  ctx: SafeWriteContext,
): Promise<{ mode: 'online' | 'queued'; id: string }> {
  const collectionName = ref.path.split('/')[0];
  const module = ctx.module ?? classifyCollection(collectionName);
  const docId = ref.id;

  return tryOnlineOrQueue(
    async () => {
      await updateDoc(ref, data as UpdateData<Record<string, unknown>>);
      return { mode: 'online' as const, id: docId };
    },
    async () => {
      await maybeQueueOrThrow(module, collectionName, 'update', data, {
        ...ctx,
        originalDocId: docId,
      });
      return { mode: 'queued' as const, id: docId };
    },
  );
}

export async function safeFirestoreDelete(): Promise<never> {
  toast.error('هذه العملية تحتاج اتصالاً بالإنترنت');
  console.info('[Offline] POLICY_REQUIRES_ONLINE', { operation: 'hard_delete' });
  throw new Error('offline_hard_delete_blocked');
}

export function initOfflineSystem(): () => void {
  if (initialized || typeof window === 'undefined') return () => {};
  initialized = true;
  attachOfflineNetworkListeners();

  const onOnline = () => {
    setOnlineStatus(true);
    void syncOfflineQueue();
  };
  const onOffline = () => setOnlineStatus(false);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  void refreshQueueCounts();

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

export async function queuePaymentBatchOperation(params: {
  actor: OfflineActor;
  clientMutationId: string;
  batchWrites: OfflineBatchWrite[];
  paymentPayload: Record<string, unknown>;
}): Promise<OfflineQueuedOperation> {
  return queueOfflineOperation({
    module: 'payments',
    collection: 'payments',
    operation: 'create',
    payload: params.paymentPayload,
    schoolId: params.actor.schoolId,
    userId: params.actor.userId,
    role: params.actor.role,
    clientMutationId: params.clientMutationId,
    conflictPolicy: 'never_overwrite',
    requiresOnlineApproval: false,
    batchWrites: params.batchWrites,
  });
}

export async function tryOnlinePaymentBatch(
  onlineCommit: () => Promise<void>,
  offlineFallback: () => Promise<OfflineQueuedOperation>,
): Promise<'online' | 'queued'> {
  if (shouldAttemptOfflineQueue()) {
    await offlineFallback();
    return 'queued';
  }
  try {
    await onlineCommit();
    return 'online';
  } catch (error) {
    if (isNetworkFirestoreError(error)) {
      await offlineFallback();
      return 'queued';
    }
    throw error;
  }
}

export type { OfflineQueuedOperation, OfflineOperationStatus };
