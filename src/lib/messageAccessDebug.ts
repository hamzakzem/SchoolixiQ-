import {
  authorizeConversationAccess,
  getExplicitVisibility,
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

function auditRowsForAssistant(
  raw: Record<string, unknown>[],
  access: MessagingAccess,
  profile: Record<string, unknown>,
  queryVisibility: string,
  source: string,
): Record<string, unknown>[] {
  const allowed: Record<string, unknown>[] = [];
  let rejectedPrivateCount = 0;

  for (const row of raw) {
    if (!authorizeConversationAccess(profile, row)) {
      const vis = getExplicitVisibility(row);
      if (
        vis === 'superadmin_private' ||
        (row.conversationPrivacy as { visibility?: string } | undefined)?.visibility ===
          'superadmin_private'
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
      (c) =>
        getExplicitVisibility(c) ||
        String(
          (c.conversationPrivacy as { visibility?: string } | undefined)
            ?.visibility ?? 'unknown',
        ),
    ),
    rejectedPrivateCount,
    source,
  });

  return allowed;
}

export function auditConversationsForAssistant(
  raw: Record<string, unknown>[],
  access: MessagingAccess,
  profile: Record<string, unknown>,
  queryVisibility: string,
  source: string,
): Record<string, unknown>[] {
  return auditRowsForAssistant(raw, access, profile, queryVisibility, source);
}

export function auditMessagesForAssistant(
  raw: Record<string, unknown>[],
  access: MessagingAccess,
  profile: Record<string, unknown>,
  queryVisibility: string,
  source: string,
): Record<string, unknown>[] {
  return auditRowsForAssistant(raw, access, profile, queryVisibility, source);
}
