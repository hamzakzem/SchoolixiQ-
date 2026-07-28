/**
 * Firestore client for Rule-Based Support Assistant.
 * Public read of active content; Super Admin writes only (enforced by rules).
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { getSeedCatalog } from './smartAssistantData';
import type {
  AssistantAnswer,
  AssistantCatalog,
  AssistantCategory,
  AssistantEventType,
  AssistantFlow,
  AssistantKeyword,
  AssistantTicket,
  SmartAssistantScope,
} from './smartAssistantEngine';

const COL = {
  categories: 'assistant_categories',
  flows: 'assistant_flows',
  answers: 'assistant_answers',
  keywords: 'assistant_keywords',
  tickets: 'assistant_tickets',
  events: 'assistant_events',
} as const;

function mapDocs<T extends { id: string }>(snap: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }): T[] {
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as T[];
}

export async function loadAssistantCatalog(): Promise<AssistantCatalog> {
  try {
    const [catSnap, flowSnap, ansSnap, kwSnap] = await Promise.all([
      getDocs(collection(db, COL.categories)),
      getDocs(collection(db, COL.flows)),
      getDocs(collection(db, COL.answers)),
      getDocs(collection(db, COL.keywords)),
    ]);

    const categories = mapDocs<AssistantCategory>(catSnap);
    const flows = mapDocs<AssistantFlow>(flowSnap);
    const answers = mapDocs<AssistantAnswer>(ansSnap);
    const keywords = mapDocs<AssistantKeyword>(kwSnap);

    if (!categories.length && !answers.length) {
      return getSeedCatalog();
    }

    return { categories, flows, answers, keywords };
  } catch (err) {
    console.warn('[SmartAssistant] catalog fallback to seed', err);
    return getSeedCatalog();
  }
}

export function subscribeAssistantCatalog(onData: (c: AssistantCatalog) => void): Unsubscribe {
  let categories: AssistantCategory[] = [];
  let flows: AssistantFlow[] = [];
  let answers: AssistantAnswer[] = [];
  let keywords: AssistantKeyword[] = [];
  const flags = { c: false, f: false, a: false, k: false };

  const tryEmit = () => {
    if (!flags.c || !flags.f || !flags.a || !flags.k) return;
    if (!categories.length && !answers.length) onData(getSeedCatalog());
    else onData({ categories, flows, answers, keywords });
  };

  const u1 = onSnapshot(
    collection(db, COL.categories),
    (snap) => {
      categories = mapDocs<AssistantCategory>(snap);
      flags.c = true;
      tryEmit();
    },
    () => {
      flags.c = true;
      tryEmit();
    },
  );
  const u2 = onSnapshot(
    collection(db, COL.flows),
    (snap) => {
      flows = mapDocs<AssistantFlow>(snap);
      flags.f = true;
      tryEmit();
    },
    () => {
      flags.f = true;
      tryEmit();
    },
  );
  const u3 = onSnapshot(
    collection(db, COL.answers),
    (snap) => {
      answers = mapDocs<AssistantAnswer>(snap);
      flags.a = true;
      tryEmit();
    },
    () => {
      flags.a = true;
      tryEmit();
    },
  );
  const u4 = onSnapshot(
    collection(db, COL.keywords),
    (snap) => {
      keywords = mapDocs<AssistantKeyword>(snap);
      flags.k = true;
      tryEmit();
    },
    () => {
      flags.k = true;
      tryEmit();
    },
  );

  return () => {
    u1();
    u2();
    u3();
    u4();
  };
}

export async function seedAssistantCatalogIfEmpty(): Promise<{ seeded: boolean }> {
  const existing = await getDocs(collection(db, COL.categories));
  if (!existing.empty) return { seeded: false };
  const seed = getSeedCatalog();
  await Promise.all([
    ...seed.categories.map((c) => setDoc(doc(db, COL.categories, c.id), c)),
    ...seed.flows.map((f) => setDoc(doc(db, COL.flows, f.id), f)),
    ...seed.answers.map((a) => setDoc(doc(db, COL.answers, a.id), a)),
    ...seed.keywords.map((k) => setDoc(doc(db, COL.keywords, k.id), k)),
  ]);
  return { seeded: true };
}

export async function upsertCategory(data: AssistantCategory) {
  await setDoc(doc(db, COL.categories, data.id), data, { merge: true });
}
export async function upsertFlow(data: AssistantFlow) {
  await setDoc(doc(db, COL.flows, data.id), data, { merge: true });
}
export async function upsertAnswer(data: AssistantAnswer) {
  await setDoc(doc(db, COL.answers, data.id), data, { merge: true });
  for (const keyword of data.keywords || []) {
    const id = `kw_${data.id}_${keyword}`.replace(/\s+/g, '_').slice(0, 120);
    await setDoc(
      doc(db, COL.keywords, id),
      {
        id,
        keyword,
        answerId: data.id,
        scopes: data.scopes,
        active: data.active,
      } satisfies AssistantKeyword,
      { merge: true },
    );
  }
}
export async function deleteCategory(id: string) {
  await deleteDoc(doc(db, COL.categories, id));
}
export async function deleteFlow(id: string) {
  await deleteDoc(doc(db, COL.flows, id));
}
export async function deleteAnswer(id: string) {
  await deleteDoc(doc(db, COL.answers, id));
}

export async function logAssistantEvent(input: {
  type: AssistantEventType;
  scope: SmartAssistantScope;
  userId?: string | null;
  answerId?: string | null;
  query?: string | null;
  conversationId?: string | null;
}) {
  try {
    await addDoc(collection(db, COL.events), {
      ...input,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[SmartAssistant] event log skipped', err);
  }
}

export async function createAssistantTicket(input: Omit<AssistantTicket, 'id' | 'createdAt' | 'status'> & { status?: 'open' | 'closed' }) {
  const ref = await addDoc(collection(db, COL.tickets), {
    ...input,
    status: input.status || 'open',
    createdAt: serverTimestamp(),
  });

  try {
    await addDoc(collection(db, 'notifications'), {
      userId: 'super_admin',
      roleTarget: 'superadmin',
      title: 'تذكرة دعم من المساعد الذكي',
      message: String(input.question || '').slice(0, 180),
      type: 'support',
      read: false,
      createdAt: serverTimestamp(),
      metadata: {
        ticketId: ref.id,
        conversationId: input.conversationId,
        routeTarget: 'smart_assistant',
      },
    });
  } catch {
    /* notification best-effort */
  }

  await logAssistantEvent({
    type: 'ticket_created',
    scope: input.scope,
    userId: input.userId,
    query: input.question,
    conversationId: input.conversationId,
  });

  return ref.id;
}

export async function loadAssistantTickets(): Promise<AssistantTicket[]> {
  const snap = await getDocs(query(collection(db, COL.tickets), orderBy('createdAt', 'desc')));
  return mapDocs<AssistantTicket>(snap);
}

export async function closeAssistantTicket(id: string) {
  await updateDoc(doc(db, COL.tickets, id), { status: 'closed' });
}

export type AssistantAnalytics = {
  keywordHits: number;
  unresolved: number;
  resolved: number;
  tickets: number;
  topQueries: Array<{ query: string; count: number }>;
};

export async function loadAssistantAnalytics(): Promise<AssistantAnalytics> {
  try {
    const snap = await getDocs(collection(db, COL.events));
    let keywordHits = 0;
    let unresolved = 0;
    let resolved = 0;
    let tickets = 0;
    const qMap = new Map<string, number>();
    snap.docs.forEach((d) => {
      const data = d.data() as { type?: string; query?: string };
      if (data.type === 'keyword_hit') keywordHits += 1;
      if (data.type === 'unresolved' || data.type === 'search_miss') unresolved += 1;
      if (data.type === 'resolved') resolved += 1;
      if (data.type === 'ticket_created') tickets += 1;
      const q = String(data.query || '').trim();
      if (q) qMap.set(q, (qMap.get(q) || 0) + 1);
    });
    const topQueries = [...qMap.entries()]
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
    return { keywordHits, unresolved, resolved, tickets, topQueries };
  } catch {
    return { keywordHits: 0, unresolved: 0, resolved: 0, tickets: 0, topQueries: [] };
  }
}

export async function loadOpenTicketsCount(): Promise<number> {
  try {
    const snap = await getDocs(query(collection(db, COL.tickets), where('status', '==', 'open')));
    return snap.size;
  } catch {
    return 0;
  }
}

export type AssistantUiSettings = {
  nameAr: string;
  nameEn: string;
  logoUrl: string;
  introAr: string;
  introEn: string;
  visibleSections: SmartAssistantScope[];
  visibility: 'public' | 'school_users' | 'platform_only';
  quickButtons: Array<{ id: string; labelAr: string; answerId?: string }>;
};

export const DEFAULT_ASSISTANT_SETTINGS: AssistantUiSettings = {
  nameAr: 'مساعد SchoolixIQ',
  nameEn: 'Schoolix Assistant',
  logoUrl: '',
  introAr: 'مرحباً! اختر قسماً أو ابحث بكلمة مفتاحية لأجد لك الحل بسرعة.',
  introEn: 'Welcome! Pick a category or search a keyword for a quick answer.',
  visibleSections: ['landing', 'school_admin', 'parent', 'teacher', 'distributor'],
  visibility: 'public',
  quickButtons: [],
};

export async function loadAssistantSettings(): Promise<AssistantUiSettings> {
  try {
    const snap = await getDocs(collection(db, 'assistant_settings'));
    const row = snap.docs.find((d) => d.id === 'global') || snap.docs[0];
    if (!row) return DEFAULT_ASSISTANT_SETTINGS;
    return { ...DEFAULT_ASSISTANT_SETTINGS, ...(row.data() as Partial<AssistantUiSettings>) };
  } catch {
    return DEFAULT_ASSISTANT_SETTINGS;
  }
}

export function subscribeAssistantSettings(
  onData: (s: AssistantUiSettings) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'assistant_settings', 'global'),
    (snap) => {
      if (!snap.exists()) {
        onData(DEFAULT_ASSISTANT_SETTINGS);
        return;
      }
      onData({ ...DEFAULT_ASSISTANT_SETTINGS, ...(snap.data() as Partial<AssistantUiSettings>) });
    },
    () => onData(DEFAULT_ASSISTANT_SETTINGS),
  );
}

export async function saveAssistantSettings(data: AssistantUiSettings): Promise<void> {
  await setDoc(doc(db, 'assistant_settings', 'global'), data, { merge: true });
}

export async function upsertKeyword(data: AssistantKeyword): Promise<void> {
  await setDoc(doc(db, COL.keywords, data.id), data, { merge: true });
}

export async function deleteKeyword(id: string): Promise<void> {
  await deleteDoc(doc(db, COL.keywords, id));
}
