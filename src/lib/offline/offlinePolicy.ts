import type {
  OfflineConflictPolicy,
  OfflineModule,
  OfflineOperationType,
} from './offlineTypes';

export type ModulePolicy = {
  offlineCreate: boolean;
  offlineUpdate: boolean;
  offlineSoftDelete: boolean;
  requiresOnlineApproval: boolean;
  conflictPolicy: OfflineConflictPolicy;
  deterministicIdFields?: string[];
  blockedFields?: string[];
  blockedFieldPatterns?: string[];
  notes?: string;
};

const DEFAULT_BLOCKED: ModulePolicy = {
  offlineCreate: false,
  offlineUpdate: false,
  offlineSoftDelete: false,
  requiresOnlineApproval: true,
  conflictPolicy: 'requires_online',
  notes: 'Online only',
};

export const MODULE_POLICIES: Record<OfflineModule, ModulePolicy> = {
  attendance: {
    offlineCreate: true,
    offlineUpdate: true,
    offlineSoftDelete: false,
    requiresOnlineApproval: false,
    conflictPolicy: 'latest_updated_at_wins',
    deterministicIdFields: ['schoolId', 'classId', 'date'],
  },
  students: {
    offlineCreate: true,
    offlineUpdate: true,
    offlineSoftDelete: false,
    requiresOnlineApproval: false,
    conflictPolicy: 'create_once_by_mutation_id',
    blockedFields: ['photoUrl', 'avatar', 'idCard', 'idCardUrl', 'photo', 'image', 'storagePath'],
    blockedFieldPatterns: ['photo', 'image', 'idcard', 'attachment', 'file', 'storage'],
  },
  payments: {
    offlineCreate: true,
    offlineUpdate: false,
    offlineSoftDelete: false,
    requiresOnlineApproval: false,
    conflictPolicy: 'never_overwrite',
    notes: 'Create-only payment records with clientMutationId dedup',
  },
  payroll: {
    offlineCreate: false,
    offlineUpdate: false,
    offlineSoftDelete: false,
    requiresOnlineApproval: true,
    conflictPolicy: 'requires_online',
    notes: 'Read/cache only in Phase 1',
  },
  inventory: {
    offlineCreate: true,
    offlineUpdate: false,
    offlineSoftDelete: false,
    requiresOnlineApproval: false,
    conflictPolicy: 'append_only',
    notes: 'Stock movement records only; no direct quantity overwrite',
  },
  grades: {
    offlineCreate: true,
    offlineUpdate: true,
    offlineSoftDelete: false,
    requiresOnlineApproval: false,
    conflictPolicy: 'latest_updated_at_wins',
    notes: 'Draft grades allowed offline',
  },
  homework: {
    offlineCreate: true,
    offlineUpdate: true,
    offlineSoftDelete: false,
    requiresOnlineApproval: false,
    conflictPolicy: 'latest_updated_at_wins',
    blockedFields: ['attachmentUrl', 'fileUrl', 'attachments', 'file', 'storagePath'],
    blockedFieldPatterns: ['attachment', 'file', 'storage'],
  },
  behavior: {
    offlineCreate: true,
    offlineUpdate: true,
    offlineSoftDelete: false,
    requiresOnlineApproval: false,
    conflictPolicy: 'latest_updated_at_wins',
  },
  evaluation: {
    offlineCreate: true,
    offlineUpdate: true,
    offlineSoftDelete: false,
    requiresOnlineApproval: false,
    conflictPolicy: 'latest_updated_at_wins',
  },
  schedules: {
    offlineCreate: false,
    offlineUpdate: false,
    offlineSoftDelete: false,
    requiresOnlineApproval: true,
    conflictPolicy: 'requires_online',
    notes: 'High conflict risk — online only',
  },
  messages: {
    offlineCreate: true,
    offlineUpdate: false,
    offlineSoftDelete: false,
    requiresOnlineApproval: false,
    conflictPolicy: 'create_once_by_mutation_id',
  },
  notifications: {
    offlineCreate: false,
    offlineUpdate: false,
    offlineSoftDelete: false,
    requiresOnlineApproval: true,
    conflictPolicy: 'requires_online',
    notes: 'Generated after domain sync',
  },
  market: {
    offlineCreate: true,
    offlineUpdate: false,
    offlineSoftDelete: false,
    requiresOnlineApproval: true,
    conflictPolicy: 'create_once_by_mutation_id',
    notes: 'Draft orders only; status/payment changes online',
  },
  super_admin: {
    offlineCreate: false,
    offlineUpdate: false,
    offlineSoftDelete: false,
    requiresOnlineApproval: true,
    conflictPolicy: 'requires_online',
    notes: 'Read/cache only',
  },
  settings: {
    offlineCreate: false,
    offlineUpdate: false,
    offlineSoftDelete: false,
    requiresOnlineApproval: true,
    conflictPolicy: 'requires_online',
    notes: 'Org settings require online',
  },
  other: DEFAULT_BLOCKED,
};

export function classifyCollection(collection: string): OfflineModule {
  const map: Record<string, OfflineModule> = {
    attendance: 'attendance',
    students: 'students',
    payments: 'payments',
    installments: 'payments',
    payroll: 'payroll',
    inventory: 'inventory',
    inventory_movements: 'inventory',
    grades: 'grades',
    homework: 'homework',
    behavior_reports: 'behavior',
    classes: 'schedules',
    schedules: 'schedules',
    system_messages: 'messages',
    conversations: 'messages',
    notifications: 'notifications',
    orders: 'market',
    store_items: 'market',
    schools: 'super_admin',
    packages: 'super_admin',
    registrations: 'super_admin',
    subscriptionRequests: 'super_admin',
    users: 'settings',
  };
  return map[collection] ?? 'other';
}

export function getModulePolicy(module: OfflineModule): ModulePolicy {
  return MODULE_POLICIES[module] ?? DEFAULT_BLOCKED;
}

export function isOperationAllowedOffline(
  module: OfflineModule,
  operation: OfflineOperationType,
): boolean {
  const policy = getModulePolicy(module);
  if (policy.requiresOnlineApproval) return false;
  if (operation === 'create') return policy.offlineCreate;
  if (operation === 'update') return policy.offlineUpdate;
  if (operation === 'soft_delete') return policy.offlineSoftDelete;
  return false;
}

export function hasBlockedOfflineFields(
  module: OfflineModule,
  payload: Record<string, unknown>,
): string | null {
  const policy = getModulePolicy(module);
  const blocked = policy.blockedFields ?? [];
  for (const field of blocked) {
    if (payload[field] !== undefined && payload[field] !== null && payload[field] !== '') {
      return field;
    }
  }
  const patterns = policy.blockedFieldPatterns ?? [];
  for (const key of Object.keys(payload)) {
    const lower = key.toLowerCase();
    for (const pattern of patterns) {
      if (lower.includes(pattern)) {
        const value = payload[key];
        if (value !== undefined && value !== null && value !== '') {
          return key;
        }
      }
    }
  }
  return null;
}

export function stripBlockedOfflineFields(
  module: OfflineModule,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const policy = getModulePolicy(module);
  const blocked = new Set(policy.blockedFields ?? []);
  const patterns = policy.blockedFieldPatterns ?? [];
  const cleaned = { ...payload };
  for (const field of blocked) {
    delete cleaned[field];
  }
  for (const key of Object.keys(cleaned)) {
    const lower = key.toLowerCase();
    if (patterns.some((pattern) => lower.includes(pattern))) {
      delete cleaned[key];
    }
  }
  return cleaned;
}

export function buildDeterministicDocId(
  module: OfflineModule,
  payload: Record<string, unknown>,
): string | undefined {
  if (module === 'attendance') {
    const schoolId = String(payload.schoolId ?? '');
    const classId = String(payload.classId ?? payload.class ?? '');
    const date = String(payload.date ?? '');
    if (schoolId && classId && date) return `${schoolId}_${classId}_${date}`;
    if (classId && date) return `${classId}_${date}`;
  }
  return undefined;
}
