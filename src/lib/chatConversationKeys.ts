/**
 * Conversation key builders — isolate assistant vs superadmin threads.
 */

export type ChatContactType =
  | 'school'
  | 'superadmin'
  | 'distributor'
  | 'platform_assistant';

export function assistantSchoolConversationKey(
  assistantUid: string,
  schoolId: string,
): string {
  return `platform_assistant:${assistantUid}:school:${schoolId}`;
}

export function superAdminSchoolConversationKey(
  superAdminUid: string,
  schoolId: string,
): string {
  return `superadmin:${superAdminUid}:school:${schoolId}`;
}

export function assistantSuperAdminConversationKey(
  assistantUid: string,
  superAdminUid: string,
): string {
  return `platform_assistant:${assistantUid}:superadmin:${superAdminUid}`;
}

export function assistantDistributorConversationKey(
  assistantUid: string,
  distributorId: string,
): string {
  return `platform_assistant:${assistantUid}:distributor:${distributorId}`;
}

/** Legacy Super Admin school thread id (read-only fallback). */
export function legacySuperAdminSchoolConversationKey(schoolId: string): string {
  return `superadmin_${schoolId}`;
}

export function resolveConversationIdForContact(params: {
  contactType: string;
  contactId: string;
  assistantUid?: string;
  superAdminUid?: string;
  conversationId?: string;
}): string {
  if (params.conversationId) return params.conversationId;
  const type = String(params.contactType || 'school').toLowerCase();
  const id = String(params.contactId || '').trim();
  if (!id) return '';
  if (type === 'assistant_private' || type === 'platform_assistant') {
    return id;
  }
  if (type === 'superadmin' && params.assistantUid) {
    return assistantSuperAdminConversationKey(params.assistantUid, id);
  }
  if (type === 'distributor' && params.assistantUid) {
    return assistantDistributorConversationKey(params.assistantUid, id);
  }
  if (type === 'school') {
    if (params.assistantUid) {
      return assistantSchoolConversationKey(params.assistantUid, id);
    }
    if (params.superAdminUid) {
      return superAdminSchoolConversationKey(params.superAdminUid, id);
    }
    return legacySuperAdminSchoolConversationKey(id);
  }
  return id;
}
