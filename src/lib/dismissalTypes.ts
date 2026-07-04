/** Enterprise dismissal workflow states */
export type DismissalStatus =
  | 'REQUESTED'
  | 'GUARD_REVIEWING'
  | 'GUARD_VERIFIED'
  | 'MANAGER_REVIEWING'
  | 'APPROVED'
  | 'DISMISSED'
  | 'REJECTED'
  | 'EXPIRED';

export type DismissalEventType =
  | 'REQUEST_CREATED'
  | 'GUARD_VERIFIED'
  | 'GUARD_REJECTED'
  | 'MANAGER_APPROVED'
  | 'MANAGER_REJECTED'
  | 'DISMISSED'
  | 'SYSTEM_RECONCILE';

export type DismissalSnapshot = {
  requestId: string;
  derivedStatus: DismissalStatus;
  lastEventId: string | null;
  eventCount?: number;
  updatedAt?: { seconds: number; nanoseconds?: number };
  compactedAt?: { seconds: number; nanoseconds?: number };
  archivedCount?: number;
};

export type DismissalEvent = {
  eventId?: string;
  type: DismissalEventType | string;
  by: string;
  byName?: string;
  timestamp?: { seconds: number; nanoseconds?: number } | null;
  metadata?: Record<string, unknown>;
};

/** In-flight workflow states */
export const ACTIVE_DISMISSAL_STATUSES: DismissalStatus[] = [
  'REQUESTED',
  'GUARD_REVIEWING',
  'GUARD_VERIFIED',
  'MANAGER_REVIEWING',
  'APPROVED',
];

export const TERMINAL_DISMISSAL_STATUSES: DismissalStatus[] = [
  'DISMISSED',
  'REJECTED',
  'EXPIRED',
];

/** Guard queue — only fresh requests */
export const GUARD_PENDING_STATUSES: DismissalStatus[] = ['REQUESTED'];

/** Manager queue — guard verified only */
export const MANAGER_QUEUE_STATUSES: DismissalStatus[] = ['GUARD_VERIFIED'];

export type DismissalStatusEvent = {
  status: DismissalStatus | string;
  at: { seconds: number; nanoseconds?: number } | null;
  by?: string;
  byName?: string;
  note?: string;
  studentId?: string;
  classId?: string;
};

export const DISMISSAL_NO_VALID_CLASS_MSG =
  'لا يمكن إنشاء طلب تسريح لأن الطالب غير مرتبط بصف صحيح';

export type DismissalRequest = {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  registrationNumber?: string;
  photoUrl?: string;
  parentIds?: string[];
  parentId: string;
  parentName: string;
  requestedByName: string;
  status: DismissalStatus;
  createdAt?: { seconds: number; nanoseconds?: number };
  updatedAt?: { seconds: number; nanoseconds?: number };
  token: string;
  tokenExpiresAt: { seconds: number; nanoseconds?: number };
  pickupPersonName?: string;
  pickupPersonRelation?: string;
  pickupNote?: string;
  isProcessing?: boolean;
  processingBy?: string;
  processingStartedAt?: { seconds: number; nanoseconds?: number };
  guardVerifiedBy?: string;
  guardVerifiedByName?: string;
  guardVerifiedAt?: { seconds: number; nanoseconds?: number };
  managerVerifiedBy?: string;
  managerVerifiedByName?: string;
  managerVerifiedAt?: { seconds: number; nanoseconds?: number };
  dismissedAt?: { seconds: number; nanoseconds?: number };
  rejectReason?: string;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedAt?: { seconds: number; nanoseconds?: number };
  dismissalEvents?: DismissalEvent[];
  dismissalEventsArchive?: DismissalEvent[];
  dismissalSnapshot?: DismissalSnapshot;
  /** Event-derived status — always use resolveDismissalStatus() */
  derivedStatus?: DismissalStatus;
  statusDrift?: boolean;
  stateReconciledAt?: { seconds: number; nanoseconds?: number };
  /** @deprecated use dismissalEvents */
  statusHistory?: DismissalStatusEvent[];
};

const LEGACY_STATUS_MAP: Record<string, DismissalStatus> = {
  waiting: 'REQUESTED',
  called: 'REQUESTED',
  pending_guard_review: 'REQUESTED',
  ready: 'GUARD_VERIFIED',
  guard_verified: 'GUARD_VERIFIED',
  guard_rejected: 'REJECTED',
  manager_rejected: 'REJECTED',
  cancelled: 'REJECTED',
  manager_approved: 'DISMISSED',
  completed: 'DISMISSED',
  expired: 'EXPIRED',
};

export function coerceDismissalStatus(raw: unknown): DismissalStatus {
  const s = String(raw || '');
  if (LEGACY_STATUS_MAP[s]) return LEGACY_STATUS_MAP[s];
  const valid: DismissalStatus[] = [
    'REQUESTED',
    'GUARD_REVIEWING',
    'GUARD_VERIFIED',
    'MANAGER_REVIEWING',
    'APPROVED',
    'DISMISSED',
    'REJECTED',
    'EXPIRED',
  ];
  if (valid.includes(s as DismissalStatus)) return s as DismissalStatus;
  return 'REQUESTED';
}

export const DISMISSAL_STATUS_LABELS: Record<
  DismissalStatus,
  { ar: string; en: string }
> = {
  REQUESTED: { ar: 'طلب جديد', en: 'Requested' },
  GUARD_REVIEWING: { ar: 'الحارس يراجع', en: 'Guard reviewing' },
  GUARD_VERIFIED: { ar: 'تحقق الحارس', en: 'Guard verified' },
  MANAGER_REVIEWING: { ar: 'الإدارة تراجع', en: 'Manager reviewing' },
  APPROVED: { ar: 'معتمد', en: 'Approved' },
  DISMISSED: { ar: 'تم التسريح', en: 'Dismissed' },
  REJECTED: { ar: 'مرفوض', en: 'Rejected' },
  EXPIRED: { ar: 'منتهي الصلاحية', en: 'Expired' },
};

export const DISMISSAL_EVENT_LABELS: Record<
  string,
  { ar: string; en: string }
> = {
  REQUEST_CREATED: { ar: 'إنشاء الطلب', en: 'Request created' },
  GUARD_VERIFIED: { ar: 'تحقق الحارس', en: 'Guard verified' },
  GUARD_REJECTED: { ar: 'رفض الحارس', en: 'Guard rejected' },
  MANAGER_APPROVED: { ar: 'اعتماد الإدارة', en: 'Manager approved' },
  MANAGER_REJECTED: { ar: 'رفض الإدارة', en: 'Manager rejected' },
  DISMISSED: { ar: 'تسريح نهائي', en: 'Final dismissal' },
  SYSTEM_RECONCILE: { ar: 'تصحيح تلقائي', en: 'System reconcile' },
};

/** Ordered timeline steps for parent UI */
export const DISMISSAL_TIMELINE_STEPS: {
  key: DismissalEventType;
  status: DismissalStatus;
}[] = [
  { key: 'REQUEST_CREATED', status: 'REQUESTED' },
  { key: 'GUARD_VERIFIED', status: 'GUARD_VERIFIED' },
  { key: 'MANAGER_APPROVED', status: 'APPROVED' },
  { key: 'DISMISSED', status: 'DISMISSED' },
];

const META_EVENT_TYPES = new Set<string>(['SYSTEM_RECONCILE']);

function lastEventId(events: DismissalEvent[]): string | null {
  if (!events.length) return null;
  return events[events.length - 1]?.eventId || null;
}

export function deriveDismissalState(
  events: DismissalEvent[],
  fallback: DismissalStatus = 'REQUESTED',
): DismissalStatus {
  if (!events.length) return fallback;
  let state: DismissalStatus = 'REQUESTED';
  for (const ev of events) {
    if (META_EVENT_TYPES.has(ev.type)) continue;
    switch (ev.type) {
      case 'REQUEST_CREATED':
        state = 'REQUESTED';
        break;
      case 'GUARD_VERIFIED':
        state = 'GUARD_VERIFIED';
        break;
      case 'GUARD_REJECTED':
        state = 'REJECTED';
        break;
      case 'MANAGER_APPROVED':
      case 'DISMISSED':
        state = 'DISMISSED';
        break;
      case 'MANAGER_REJECTED':
        state = 'REJECTED';
        break;
      default:
        break;
    }
  }
  return state;
}

/** Snapshot-first status resolution — never use raw stored status in UI. */
export function resolveDismissalStatus(request: DismissalRequest): DismissalStatus {
  const events = getDismissalEvents(request);
  const archive = Array.isArray(request.dismissalEventsArchive)
    ? request.dismissalEventsArchive
    : [];
  const snap = request.dismissalSnapshot;

  if (snap?.derivedStatus && snap.lastEventId) {
    const tailId = lastEventId(events);
    if (tailId && tailId === snap.lastEventId) {
      return coerceDismissalStatus(snap.derivedStatus);
    }
  }

  if (snap?.derivedStatus && !events.length) {
    return coerceDismissalStatus(snap.derivedStatus);
  }

  const fullChain = [...archive, ...events];
  if (fullChain.length) {
    return deriveDismissalState(fullChain, 'REQUESTED');
  }

  return deriveDismissalState(events, 'REQUESTED');
}

export function reconcileDismissalRequest(request: DismissalRequest): DismissalRequest {
  const derived = resolveDismissalStatus(request);
  const stored = coerceDismissalStatus(request.status);
  const snapDerived = request.dismissalSnapshot?.derivedStatus
    ? coerceDismissalStatus(request.dismissalSnapshot.derivedStatus)
    : null;

  return {
    ...request,
    status: derived,
    derivedStatus: derived,
    statusDrift: stored !== derived || (snapDerived !== null && snapDerived !== derived),
  };
}

/** Workflow graph nodes for visual engine */
export type WorkflowNodeState = 'completed' | 'current' | 'blocked' | 'rejected';

export type DismissalWorkflowNode = {
  id: string;
  labelAr: string;
  labelEn: string;
  eventType?: DismissalEventType;
  status: DismissalStatus;
};

export const DISMISSAL_WORKFLOW_NODES: DismissalWorkflowNode[] = [
  { id: 'parent', labelAr: 'ولي الأمر', labelEn: 'Parent', eventType: 'REQUEST_CREATED', status: 'REQUESTED' },
  { id: 'guard', labelAr: 'الحارس', labelEn: 'Guard', eventType: 'GUARD_VERIFIED', status: 'GUARD_VERIFIED' },
  { id: 'manager', labelAr: 'الإدارة', labelEn: 'Manager', eventType: 'MANAGER_APPROVED', status: 'APPROVED' },
  { id: 'done', labelAr: 'تم', labelEn: 'Done', eventType: 'DISMISSED', status: 'DISMISSED' },
];

export function getWorkflowNodeStates(request: DismissalRequest): WorkflowNodeState[] {
  const events = getDismissalEvents(request);
  const derived = resolveDismissalStatus(request);
  const isRejected = derived === 'REJECTED';
  const rejectAt = events.find((e) => e.type === 'GUARD_REJECTED' || e.type === 'MANAGER_REJECTED');

  if (isRejected) {
    const guardRejected = rejectAt?.type === 'GUARD_REJECTED';
    return guardRejected
      ? ['completed', 'rejected', 'blocked', 'blocked']
      : ['completed', 'completed', 'rejected', 'blocked'];
  }

  if (derived === 'DISMISSED') {
    return ['completed', 'completed', 'completed', 'completed'];
  }

  const order: DismissalStatus[] = ['REQUESTED', 'GUARD_VERIFIED', 'APPROVED', 'DISMISSED'];
  const idx = order.indexOf(
    derived === 'GUARD_REVIEWING' ? 'REQUESTED' : derived === 'MANAGER_REVIEWING' ? 'APPROVED' : derived,
  );

  return DISMISSAL_WORKFLOW_NODES.map((_, i) => {
    if (idx < 0) return i === 0 ? 'current' : 'blocked';
    if (i < idx) return 'completed';
    if (i === idx) return 'current';
    return 'blocked';
  });
}

export function getDismissalEvents(request: DismissalRequest): DismissalEvent[] {
  if (Array.isArray(request.dismissalEvents) && request.dismissalEvents.length) {
    return request.dismissalEvents;
  }
  return (request.statusHistory || []).map((h) => ({
    type: String(h.status),
    by: h.by || '',
    byName: h.byName,
    timestamp: h.at,
    metadata: h.note ? { note: h.note } : undefined,
  }));
}

/** Who is responsible for the next action — for UX clarity */
export function getDismissalResponsibleParty(
  request: DismissalRequest,
  locale: 'ar' | 'en' = 'ar',
): { role: string; label: string } | null {
  const status = resolveDismissalStatus(request);
  const map: Record<string, { ar: string; en: string; role: string }> = {
    REQUESTED: { ar: 'الحارس', en: 'Guard', role: 'guard' },
    GUARD_REVIEWING: { ar: 'الحارس', en: 'Guard', role: 'guard' },
    GUARD_VERIFIED: { ar: 'الإدارة', en: 'Manager', role: 'manager' },
    MANAGER_REVIEWING: { ar: 'الإدارة', en: 'Manager', role: 'manager' },
    APPROVED: { ar: 'الإدارة', en: 'Manager', role: 'manager' },
  };
  const entry = map[status];
  if (!entry) return null;
  return { role: entry.role, label: locale === 'ar' ? entry.ar : entry.en };
}

export function eventTypeToRoleLabel(type: string, locale: 'ar' | 'en' = 'ar'): string {
  const roles: Record<string, { ar: string; en: string }> = {
    REQUEST_CREATED: { ar: 'ولي الأمر', en: 'Parent' },
    GUARD_VERIFIED: { ar: 'الحارس', en: 'Guard' },
    GUARD_REJECTED: { ar: 'الحارس', en: 'Guard' },
    MANAGER_APPROVED: { ar: 'الإدارة', en: 'Manager' },
    MANAGER_REJECTED: { ar: 'الإدارة', en: 'Manager' },
    DISMISSED: { ar: 'النظام', en: 'System' },
    SYSTEM_RECONCILE: { ar: 'النظام', en: 'System' },
  };
  return roles[type]?.[locale] || type;
}

export type DismissalViewerRole = 'parent' | 'guard' | 'manager' | 'admin';

/** Action Highlight — what must happen next (decision layer, not history) */
export function getDismissalActionRequired(
  request: DismissalRequest,
  locale: 'ar' | 'en' = 'ar',
  viewerRole?: DismissalViewerRole,
): {
  actionLabel: string;
  responsibleLabel: string;
  responsibleRole: string;
  tone: 'active' | 'done' | 'rejected';
} | null {
  const status = resolveDismissalStatus(request);
  const responsible = getDismissalResponsibleParty(request, locale);
  const isAr = locale === 'ar';

  if (status === 'DISMISSED') {
    return {
      actionLabel: isAr ? 'تم التسريح — يمكن استلام الطالب' : 'Dismissed — pickup allowed',
      responsibleLabel: isAr ? 'مكتمل' : 'Complete',
      responsibleRole: 'system',
      tone: 'done',
    };
  }
  if (status === 'REJECTED' || status === 'EXPIRED') {
    return {
      actionLabel: isAr ? 'الطلب مغلق' : 'Request closed',
      responsibleLabel: request.rejectReason || (isAr ? 'مرفوض' : 'Rejected'),
      responsibleRole: 'system',
      tone: 'rejected',
    };
  }

  const byRole: Record<string, { ar: string; en: string }> = {
    parent_REQUESTED: { ar: 'بانتظار تحقق الحارس عند البوابة', en: 'Waiting for guard verification' },
    parent_GUARD_VERIFIED: { ar: 'بانتظار اعتماد الإدارة', en: 'Waiting for manager approval' },
    guard_REQUESTED: { ar: 'مطابقة بيانات ولي الأمر والطالب', en: 'Verify parent & student data' },
    manager_GUARD_VERIFIED: { ar: 'اعتماد التسريح النهائي', en: 'Final dismissal approval' },
    _REQUESTED: { ar: 'بانتظار تحقق الحارس', en: 'Waiting for guard' },
    _GUARD_VERIFIED: { ar: 'بانتظار اعتماد الإدارة', en: 'Waiting for manager' },
  };

  const key = viewerRole ? `${viewerRole}_${status}` : `_${status}`;
  const action = byRole[key] || byRole[`_${status}`];
  const actionLabel = action
    ? isAr ? action.ar : action.en
    : isAr
      ? 'متابعة الطلب'
      : 'Continue request';

  if (!responsible) return null;

  return {
    actionLabel,
    responsibleLabel: responsible.label,
    responsibleRole: responsible.role,
    tone: 'active',
  };
}

/** Current step index for compact stepper (state only, no event names) */
export function getDismissalCurrentStepIndex(request: DismissalRequest): number {
  const states = getWorkflowNodeStates(request);
  const current = states.indexOf('current');
  if (current >= 0) return current;
  const rejected = states.indexOf('rejected');
  if (rejected >= 0) return rejected;
  if (states.every((s) => s === 'completed')) return states.length - 1;
  return 0;
}
