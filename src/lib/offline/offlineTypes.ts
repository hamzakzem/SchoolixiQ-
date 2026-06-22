export type OfflineModule =
  | 'attendance'
  | 'students'
  | 'payments'
  | 'payroll'
  | 'inventory'
  | 'grades'
  | 'homework'
  | 'behavior'
  | 'schedules'
  | 'messages'
  | 'notifications'
  | 'market'
  | 'super_admin'
  | 'settings'
  | 'evaluation'
  | 'other';

export type OfflineOperationType = 'create' | 'update' | 'soft_delete';

export type OfflineOperationStatus =
  | 'pending'
  | 'syncing'
  | 'synced'
  | 'failed'
  | 'blocked';

export type OfflineConflictPolicy =
  | 'latest_updated_at_wins'
  | 'create_once_by_mutation_id'
  | 'append_only'
  | 'never_overwrite'
  | 'requires_online';

export type OfflineQueuedOperation = {
  id: string;
  module: OfflineModule;
  collection: string;
  operation: OfflineOperationType;
  payload: Record<string, unknown>;
  originalDocId?: string;
  deterministicDocId?: string;
  schoolId: string;
  userId: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  status: OfflineOperationStatus;
  retryCount: number;
  errorMessage?: string;
  clientMutationId: string;
  deviceId: string;
  conflictPolicy: OfflineConflictPolicy;
  requiresOnlineApproval: boolean;
  /** Optional batch writes for composite financial flows */
  batchWrites?: OfflineBatchWrite[];
};

export type OfflineBatchWrite = {
  collection: string;
  docId?: string;
  operation: 'create' | 'set' | 'update';
  data: Record<string, unknown>;
  merge?: boolean;
};

export type OfflineQueueCounts = {
  pending: number;
  syncing: number;
  synced: number;
  failed: number;
  blocked: number;
  total: number;
};

export type OfflineActor = {
  userId: string;
  role: string;
  schoolId: string;
};

export type QueueOperationInput = Omit<
  OfflineQueuedOperation,
  'id' | 'createdAt' | 'updatedAt' | 'status' | 'retryCount' | 'deviceId'
> & {
  id?: string;
  deviceId?: string;
};

export const OFFLINE_SYNC_META_FIELDS = [
  'clientMutationId',
  'syncedFromOffline',
  'syncedAt',
  'deviceId',
] as const;
