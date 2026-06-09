export type DismissalStatus =
  | 'waiting'
  | 'called'
  | 'ready'
  | 'completed'
  | 'cancelled'
  | 'expired';

export const ACTIVE_DISMISSAL_STATUSES: DismissalStatus[] = [
  'waiting',
  'called',
  'ready',
];

export type DismissalStatusEvent = {
  status: DismissalStatus;
  at: { seconds: number; nanoseconds?: number } | null;
  by?: string;
  byName?: string;
  note?: string;
};

export type DismissalRequest = {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
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
  calledAt?: { seconds: number; nanoseconds?: number };
  calledByTeacherId?: string;
  calledByTeacherName?: string;
  readyAt?: { seconds: number; nanoseconds?: number };
  readyByTeacherId?: string;
  readyByTeacherName?: string;
  completedAt?: { seconds: number; nanoseconds?: number };
  completedByGuardId?: string;
  completedByGuardName?: string;
  cancelledAt?: { seconds: number; nanoseconds?: number };
  cancelledByGuardId?: string;
  cancelledByGuardName?: string;
  cancelReason?: string;
  statusHistory?: DismissalStatusEvent[];
};

export const DISMISSAL_STATUS_LABELS: Record<
  DismissalStatus,
  { ar: string; en: string }
> = {
  waiting: { ar: 'بانتظار النداء', en: 'Waiting' },
  called: { ar: 'تم النداء', en: 'Called' },
  ready: { ar: 'جاهز للتسليم', en: 'Ready' },
  completed: { ar: 'تم التسليم', en: 'Completed' },
  cancelled: { ar: 'ملغي', en: 'Cancelled' },
  expired: { ar: 'منتهي الصلاحية', en: 'Expired' },
};
