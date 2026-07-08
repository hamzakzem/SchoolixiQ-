import {
  authorizeConversationAccess,
  getExplicitVisibility,
  normalizeConversationVisibility,
  type MessagingAccess,
} from './messagingAccess';

export type MessageAccessDebugPayload = {
  userId: string;
  role: string;
  assistantScope: string;
  queryVisibility: string;
  returnedConversationIds: string[];
  returnedVisibilityValues: string[];
  rejectedPrivateCount: number;
  source?: string;
};

/** Temporary security audit logging for platform assistant inbox loads. */
export function logMessageAccessDebug(
  payload: MessageAccessDebugPayload,
): void {
  console.info('[MESSAGE_ACCESS_DEBUG]', payload);
}

export function auditConversationsForAssistant(
  raw: Record<string, unknown>[],
  access: MessagingAccess,
  profile: Record<string, unknown>,
  queryVisibility: string,
  source: string,
): Record<string, unknown>[] {
  const allowed: Record<string, unknown>[] = [];
  let rejectedPrivateCount = 0;

  for (const row of raw) {
    const explicit = getExplicitVisibility(row);
    const normalized = normalizeConversationVisibility(row);
    if (
      explicit !== 'platform_operations' ||
      normalized === 'superadmin_private' ||
      !authorizeConversationAccess(profile, row)
    ) {
      if (
        normalized === 'superadmin_private' ||
        explicit === 'superadmin_private' ||
        String(row.createdByRole ?? row.senderRole ?? '')
          .toLowerCase()
          .includes('superadmin')
      ) {
        rejectedPrivateCount += 1;
      }
      continue;
    }
    allowed.push(row);
  }

  logMessageAccessDebug({
    userId: String(profile.uid ?? ''),
    role: access.role,
    assistantScope: access.scope,
    queryVisibility,
    returnedConversationIds: allowed.map((c) =>
      String(c.conversationId ?? c.id ?? ''),
    ),
    returnedVisibilityValues: allowed.map(
      (c) => getExplicitVisibility(c) ?? normalizeConversationVisibility(c),
    ),
    rejectedPrivateCount,
    source,
  });

  return allowed;
}

export function auditMessagesForAssistant(
  raw: Record<string, unknown>[],
  access: MessagingAccess,
  profile: Record<string, unknown>,
  queryVisibility: string,
  source: string,
): Record<string, unknown>[] {
  const allowed: Record<string, unknown>[] = [];
  let rejectedPrivateCount = 0;

  for (const row of raw) {
    const explicit = getExplicitVisibility(row);
    const normalized = normalizeConversationVisibility(row);
    if (
      explicit !== 'platform_operations' ||
      normalized === 'superadmin_private' ||
      !authorizeConversationAccess(profile, row)
    ) {
      if (
        normalized === 'superadmin_private' ||
        explicit === 'superadmin_private' ||
        ['superadmin', 'super_admin'].includes(
          String(row.createdByRole ?? row.senderRole ?? '').toLowerCase(),
        )
      ) {
        rejectedPrivateCount += 1;
      }
      continue;
    }
    allowed.push(row);
  }

  logMessageAccessDebug({
    userId: String(profile.uid ?? ''),
    role: access.role,
    assistantScope: access.scope,
    queryVisibility,
    returnedConversationIds: [
      ...new Set(
        allowed.map((m) => String(m.conversationId ?? m.id ?? '')),
      ),
    ],
    returnedVisibilityValues: allowed.map(
      (m) => getExplicitVisibility(m) ?? normalizeConversationVisibility(m),
    ),
    rejectedPrivateCount,
    source,
  });

  return allowed;
}
