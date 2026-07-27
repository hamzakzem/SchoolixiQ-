/** Debug logging for Platform Assistant contact directory — no sensitive payloads. */

export type ChatDirectoryDebugPayload = {
  uid: string;
  effectiveRole: string;
  permissions: string[];
  queryStarted: boolean;
  schoolsCount: number;
  distributorsCount?: number;
  superAdminsCount?: number;
  totalContacts?: number;
  errorCode?: string | null;
  source?: string;
};

export function logChatDirectoryDebug(payload: ChatDirectoryDebugPayload): void {
  console.info('[CHAT_DIRECTORY_DEBUG]', {
    uid: payload.uid,
    effectiveRole: payload.effectiveRole,
    permissions: payload.permissions,
    queryStarted: payload.queryStarted,
    schoolsCount: payload.schoolsCount,
    distributorsCount: payload.distributorsCount ?? 0,
    superAdminsCount: payload.superAdminsCount ?? 0,
    totalContacts: payload.totalContacts ?? payload.schoolsCount,
    errorCode: payload.errorCode ?? null,
    source: payload.source ?? 'client',
  });
}
