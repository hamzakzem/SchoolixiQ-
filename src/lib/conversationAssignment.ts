/**
 * Conversation assignment model — UI + client helpers (writes via backend only).
 */

export type AssignmentStatus =
  | 'unassigned'
  | 'assigned'
  | 'waiting'
  | 'escalated'
  | 'closed';

export type AssignmentRole = 'superadmin' | 'platform_assistant' | null;

export type TransferHistoryEntry = {
  fromUserId: string | null;
  fromName: string | null;
  toUserId: string | null;
  toName: string | null;
  transferredBy: string;
  reason?: string;
  transferredAt: unknown;
};

export type ConversationAssignment = {
  assignedToUserId: string | null;
  assignedToName: string | null;
  assignedToRole: AssignmentRole;
  assignedBy: string | null;
  assignedAt: unknown;
  status: AssignmentStatus;
  lastResponseAt: unknown;
  firstResponseDueAt: unknown;
  transferHistory: TransferHistoryEntry[];
};

export function extractConversationAssignment(
  doc: Record<string, unknown> | null | undefined,
): ConversationAssignment | null {
  const raw = doc?.conversationAssignment;
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Record<string, unknown>;
  const status = String(a.status ?? 'unassigned') as AssignmentStatus;
  return {
    assignedToUserId: a.assignedToUserId ? String(a.assignedToUserId) : null,
    assignedToName: a.assignedToName ? String(a.assignedToName) : null,
    assignedToRole: (a.assignedToRole as AssignmentRole) ?? null,
    assignedBy: a.assignedBy ? String(a.assignedBy) : null,
    assignedAt: a.assignedAt ?? null,
    status,
    lastResponseAt: a.lastResponseAt ?? null,
    firstResponseDueAt: a.firstResponseDueAt ?? null,
    transferHistory: Array.isArray(a.transferHistory)
      ? (a.transferHistory as TransferHistoryEntry[])
      : [],
  };
}

export function assignmentStatusLabel(status: AssignmentStatus, isRtl: boolean): string {
  const map: Record<AssignmentStatus, { ar: string; en: string }> = {
    unassigned: { ar: 'غير مسندة', en: 'Unassigned' },
    assigned: { ar: 'مسندة', en: 'Assigned' },
    waiting: { ar: 'بانتظار الرد', en: 'Waiting' },
    escalated: { ar: 'مُصعَّدة', en: 'Escalated' },
    closed: { ar: 'مغلقة', en: 'Closed' },
  };
  return isRtl ? map[status].ar : map[status].en;
}

export function canAssistantViewAssignedConversation(
  assignment: ConversationAssignment | null,
  assistantUid: string,
  allowedUserIds: string[] = [],
): boolean {
  if (!assignment) return allowedUserIds.includes(assistantUid);
  if (assignment.status === 'closed') return false;
  if (assignment.assignedToUserId === assistantUid) return true;
  return allowedUserIds.includes(assistantUid);
}
