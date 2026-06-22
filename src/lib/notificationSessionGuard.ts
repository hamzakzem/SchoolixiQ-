const STORAGE_KEY = 'schoolixiq_seen_notification_ids';

let listenerStartTimeMs: number | null = null;
let activeSessionUid: string | null = null;
const seenNotificationIds = new Set<string>();
const hydratedListeners = new Set<string>();

function loadSeenFromStorage(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return;
    for (const id of parsed) {
      if (typeof id === 'string' && id) seenNotificationIds.add(id);
    }
  } catch {
    /* ignore corrupt session storage */
  }
}

function persistSeenToStorage(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(seenNotificationIds)));
  } catch {
    /* quota / private mode */
  }
}

export function getNotificationListenerStartTime(): number {
  if (listenerStartTimeMs === null) {
    listenerStartTimeMs = Date.now();
  }
  return listenerStartTimeMs;
}

export function ensureNotificationSession(uid: string): void {
  if (activeSessionUid === uid) return;
  activeSessionUid = uid;
  listenerStartTimeMs = Date.now();
  seenNotificationIds.clear();
  hydratedListeners.clear();
  loadSeenFromStorage();
}

export function resetNotificationSession(): void {
  activeSessionUid = null;
  listenerStartTimeMs = null;
  seenNotificationIds.clear();
  hydratedListeners.clear();
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}

export function resolveNotificationCreatedAtMs(data: Record<string, unknown>): number {
  const createdAt = data.createdAt as
    | { toMillis?: () => number; seconds?: number; toDate?: () => Date }
    | Date
    | undefined;

  if (!createdAt) return 0;
  if (typeof (createdAt as { toMillis?: () => number }).toMillis === 'function') {
    return (createdAt as { toMillis: () => number }).toMillis();
  }
  if (createdAt instanceof Date) return createdAt.getTime();
  if (typeof (createdAt as { seconds?: number }).seconds === 'number') {
    return (createdAt as { seconds: number }).seconds * 1000;
  }
  if (typeof (createdAt as { toDate?: () => Date }).toDate === 'function') {
    return (createdAt as { toDate: () => Date }).toDate().getTime();
  }
  return 0;
}

export function markNotificationsSeen(ids: string[]): void {
  let changed = false;
  for (const id of ids) {
    if (!id || seenNotificationIds.has(id)) continue;
    seenNotificationIds.add(id);
    changed = true;
  }
  if (changed) persistSeenToStorage();
}

export function beginListenerSubscription(listenerKey: string): void {
  hydratedListeners.delete(listenerKey);
}

export function isListenerHydrated(listenerKey: string): boolean {
  return hydratedListeners.has(listenerKey);
}

export function hydrateListenerSnapshot(
  listenerKey: string,
  docIds: string[],
  options?: { markHydrated?: boolean },
): void {
  markNotificationsSeen(docIds);
  if (options?.markHydrated !== false) {
    hydratedListeners.add(listenerKey);
  }
  console.info('[NotificationsAudio] INITIAL_SNAPSHOT_SILENT', {
    listenerKey,
    count: docIds.length,
    hydrated: options?.markHydrated !== false,
  });
}

export type NotificationAudioDecision =
  | { action: 'trigger' }
  | { action: 'skip'; reason: 'listener_not_hydrated' | 'already_seen' | 'read' | 'old_created_at' };

export function evaluateNotificationAudioTrigger(
  id: string,
  data: Record<string, unknown>,
  listenerKey: string,
): NotificationAudioDecision {
  if (!hydratedListeners.has(listenerKey)) {
    return { action: 'skip', reason: 'listener_not_hydrated' };
  }

  if (seenNotificationIds.has(id)) {
    console.info('[NotificationsAudio] OLD_NOTIFICATION_SKIPPED', {
      id,
      createdAt: resolveNotificationCreatedAtMs(data),
      reason: 'already_seen',
    });
    return { action: 'skip', reason: 'already_seen' };
  }

  if (data.read === true) {
    return { action: 'skip', reason: 'read' };
  }

  const createdAtMs = resolveNotificationCreatedAtMs(data);
  const listenerStart = getNotificationListenerStartTime();
  if (createdAtMs <= listenerStart) {
    markNotificationsSeen([id]);
    console.info('[NotificationsAudio] OLD_NOTIFICATION_SKIPPED', {
      id,
      createdAt: createdAtMs,
      reason: 'old_created_at',
    });
    return { action: 'skip', reason: 'old_created_at' };
  }

  markNotificationsSeen([id]);
  console.info('[NotificationsAudio] NEW_NOTIFICATION_TRIGGERED', {
    id,
    createdAt: createdAtMs,
  });
  return { action: 'trigger' };
}
