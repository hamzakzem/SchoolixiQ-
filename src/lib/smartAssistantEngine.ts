/**
 * SchoolixIQ Rule-Based Support Assistant engine.
 * No AI / no external LLM APIs — decision tree + keyword matching only.
 */

export type SmartAssistantScope =
  | 'landing'
  | 'superadmin'
  | 'platform_assistant'
  | 'school_admin'
  | 'teacher'
  | 'parent'
  | 'guard'
  | 'distributor';

export type AssistantActionType =
  | 'open_route'
  | 'open_url'
  | 'open_whatsapp'
  | 'open_email'
  | 'open_section'
  | 'navigate_answer'
  | 'create_ticket';

export type AssistantAction = {
  id: string;
  type: AssistantActionType;
  labelAr: string;
  labelEn?: string;
  value: string;
};

export type AssistantCategory = {
  id: string;
  titleAr: string;
  titleEn?: string;
  emoji: string;
  order: number;
  scopes: SmartAssistantScope[];
  active: boolean;
};

export type AssistantFlow = {
  id: string;
  categoryId: string;
  titleAr: string;
  titleEn?: string;
  order: number;
  scopes: SmartAssistantScope[];
  active: boolean;
};

export type AssistantAnswer = {
  id: string;
  categoryId: string;
  flowId: string;
  parentAnswerId?: string | null;
  titleAr: string;
  titleEn?: string;
  bodyAr: string;
  bodyEn?: string;
  mediaType?: 'none' | 'image' | 'gif';
  mediaUrl?: string;
  keywords: string[];
  actions: AssistantAction[];
  priority: number;
  order: number;
  scopes: SmartAssistantScope[];
  active: boolean;
};

export type AssistantKeyword = {
  id: string;
  keyword: string;
  answerId: string;
  scopes: SmartAssistantScope[];
  active: boolean;
};

export type AssistantTicket = {
  id?: string;
  userId: string | null;
  role: string;
  scope: SmartAssistantScope;
  question: string;
  conversationId: string;
  pathTitles: string[];
  status: 'open' | 'closed';
  createdAt?: unknown;
};

export type AssistantEventType =
  | 'category_open'
  | 'answer_view'
  | 'keyword_hit'
  | 'resolved'
  | 'unresolved'
  | 'ticket_created'
  | 'search_miss';

export type AssistantCatalog = {
  categories: AssistantCategory[];
  flows: AssistantFlow[];
  answers: AssistantAnswer[];
  keywords: AssistantKeyword[];
};

export type AssistantSession = {
  scope: SmartAssistantScope;
  /** Root → category → flow → answer stack */
  stack: Array<{ type: 'category' | 'flow' | 'answer'; id: string }>;
  conversationId: string;
};

/** Legacy rule shape (compat) */
export type SmartAssistantRule = {
  id: string;
  scope: SmartAssistantScope | SmartAssistantScope[];
  keywords: string[];
  response: string;
  actions?: Array<{ type: string; value: string }>;
  priority: number;
  active: boolean;
};

export type SmartAssistantAction = {
  type: 'open_section' | 'open_whatsapp' | 'open_email' | 'show_help' | 'start_chat';
  value: string;
};

export const DEFAULT_SMART_ASSISTANT_CONTACT = {
  whatsapp: 'https://wa.me/9647757905554',
  email: 'scooopyiq@gmail.com',
};

export function normalizeAssistantText(input: string): string {
  return String(input || '')
    .toLowerCase()
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[\u064B-\u065F]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function scopeListIncludes(
  scopes: SmartAssistantScope[] | undefined,
  scope: SmartAssistantScope,
): boolean {
  if (!scopes?.length) return true;
  return scopes.includes(scope);
}

export function createAssistantSession(scope: SmartAssistantScope): AssistantSession {
  return {
    scope,
    stack: [],
    conversationId: `asst_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  };
}

export function categoriesForScope(
  catalog: AssistantCatalog,
  scope: SmartAssistantScope,
): AssistantCategory[] {
  return catalog.categories
    .filter((c) => c.active && scopeListIncludes(c.scopes, scope))
    .sort((a, b) => a.order - b.order);
}

export function flowsForCategory(
  catalog: AssistantCatalog,
  categoryId: string,
  scope: SmartAssistantScope,
): AssistantFlow[] {
  return catalog.flows
    .filter(
      (f) =>
        f.active &&
        f.categoryId === categoryId &&
        scopeListIncludes(f.scopes, scope),
    )
    .sort((a, b) => a.order - b.order);
}

export function rootAnswersForFlow(
  catalog: AssistantCatalog,
  flowId: string,
  scope: SmartAssistantScope,
): AssistantAnswer[] {
  return catalog.answers
    .filter(
      (a) =>
        a.active &&
        a.flowId === flowId &&
        !a.parentAnswerId &&
        scopeListIncludes(a.scopes, scope),
    )
    .sort((a, b) => a.order - b.order || b.priority - a.priority);
}

export function childAnswers(
  catalog: AssistantCatalog,
  parentAnswerId: string,
  scope: SmartAssistantScope,
): AssistantAnswer[] {
  return catalog.answers
    .filter(
      (a) =>
        a.active &&
        a.parentAnswerId === parentAnswerId &&
        scopeListIncludes(a.scopes, scope),
    )
    .sort((a, b) => a.order - b.order || b.priority - a.priority);
}

export type KeywordMatch = {
  answer: AssistantAnswer;
  score: number;
  keyword: string;
};

export function matchAssistantKeywords(
  query: string,
  catalog: AssistantCatalog,
  scope: SmartAssistantScope,
): KeywordMatch | null {
  const normalized = normalizeAssistantText(query);
  if (!normalized) return null;

  let best: KeywordMatch | null = null;
  const answerById = new Map(catalog.answers.map((a) => [a.id, a]));

  const consider = (answer: AssistantAnswer, keyword: string, base: number) => {
    if (!answer.active || !scopeListIncludes(answer.scopes, scope)) return;
    const nkw = normalizeAssistantText(keyword);
    if (!nkw || !normalized.includes(nkw)) return;
    const score = base + nkw.length + (answer.priority || 0);
    if (!best || score > best.score) {
      best = { answer, score, keyword };
    }
  };

  for (const kw of catalog.keywords) {
    if (!kw.active || !scopeListIncludes(kw.scopes, scope)) continue;
    const answer = answerById.get(kw.answerId);
    if (!answer) continue;
    consider(answer, kw.keyword, 40);
  }

  for (const answer of catalog.answers) {
    for (const keyword of answer.keywords || []) {
      consider(answer, keyword, 20);
    }
  }

  return best;
}

/** Legacy keyword matcher kept for older call sites */
export function matchSmartAssistantRules(
  query: string,
  rules: SmartAssistantRule[],
  scope: SmartAssistantScope,
): { rule: SmartAssistantRule; score: number } | null {
  const normalized = normalizeAssistantText(query);
  if (!normalized) return null;
  let best: { rule: SmartAssistantRule; score: number } | null = null;
  for (const rule of rules.filter((r) => r.active)) {
    const scopes = Array.isArray(rule.scope) ? rule.scope : [rule.scope];
    if (!scopes.includes(scope)) continue;
    let score = rule.priority;
    for (const kw of rule.keywords) {
      const nkw = normalizeAssistantText(kw);
      if (nkw && normalized.includes(nkw)) score += 10 + nkw.length;
    }
    if (!best || score > best.score) best = { rule, score };
  }
  if (!best || best.score <= best.rule.priority) return null;
  return best;
}

export function smartAssistantFallback(isRtl: boolean): string {
  return isRtl
    ? 'لم أجد جواباً مطابقاً. يمكنك اختيار قسم من الأزرار أو طلب الدعم البشري.'
    : 'No matching answer. Pick a category or request human support.';
}

export function smartAssistantIntro(isRtl: boolean): string {
  return isRtl
    ? 'مرحباً بك 👋\nكيف يمكنني مساعدتك؟'
    : 'Welcome 👋\nHow can I help you?';
}

export function runAssistantAction(action: AssistantAction): void {
  const { type, value } = action;
  if (type === 'open_whatsapp' || type === 'open_url') {
    window.open(value, '_blank', 'noopener,noreferrer');
    return;
  }
  if (type === 'open_email') {
    window.location.href = value.startsWith('mailto:') ? value : `mailto:${value}`;
    return;
  }
  if (type === 'open_section' && value.startsWith('#')) {
    document.querySelector(value)?.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  if (type === 'open_route' || (type === 'open_section' && value.startsWith('/'))) {
    window.location.href = value;
  }
}

export function buildKeywordsFromAnswers(answers: AssistantAnswer[]): AssistantKeyword[] {
  const rows: AssistantKeyword[] = [];
  for (const a of answers) {
    for (const keyword of a.keywords || []) {
      const id = `kw_${a.id}_${normalizeAssistantText(keyword).replace(/\s+/g, '_')}`;
      rows.push({
        id,
        keyword,
        answerId: a.id,
        scopes: a.scopes,
        active: a.active,
      });
    }
  }
  return rows;
}

export type AssistantSearchIndexEntry = {
  answer: AssistantAnswer;
  phrases: string[];
  titleTokens: string[];
  bodyTokens: Set<string>;
};

/** Pre-normalizes answers once per catalog so typing-time search stays cheap. */
export function buildAssistantSearchIndex(
  catalog: AssistantCatalog,
  scope: SmartAssistantScope,
): AssistantSearchIndexEntry[] {
  const extra = new Map<string, string[]>();
  for (const kw of catalog.keywords) {
    if (!kw.active || !scopeListIncludes(kw.scopes, scope)) continue;
    const list = extra.get(kw.answerId) || [];
    list.push(kw.keyword);
    extra.set(kw.answerId, list);
  }
  return catalog.answers
    .filter((a) => a.active && scopeListIncludes(a.scopes, scope))
    .map((answer) => {
      const phrases = [...(answer.keywords || []), ...(extra.get(answer.id) || [])]
        .map(normalizeAssistantText)
        .filter(Boolean);
      const title = normalizeAssistantText(answer.titleAr);
      return {
        answer,
        phrases: [...new Set([title, ...phrases])],
        titleTokens: title.split(' ').filter((t) => t.length > 1),
        bodyTokens: new Set(normalizeAssistantText(answer.bodyAr).split(' ').filter((t) => t.length > 2)),
      };
    });
}

/** Strip the Arabic definite article so "الاشتراك" matches "اشتراك". */
function stem(token: string): string {
  return token.length > 4 && token.startsWith('ال') ? token.slice(2) : token;
}

/**
 * Ranked answer search: whole keyword phrases score highest, then shared
 * words with the title/keywords (prefix-tolerant), then body words.
 */
export function searchAssistantAnswers(
  query: string,
  index: AssistantSearchIndexEntry[],
  limit = 3,
): KeywordMatch[] {
  const normalized = normalizeAssistantText(query);
  if (normalized.length < 2) return [];
  const tokens = normalized.split(' ').filter((t) => t.length > 1).map(stem);

  const results: KeywordMatch[] = [];
  for (const entry of index) {
    let score = 0;
    let keyword = '';
    for (const phrase of entry.phrases) {
      if (phrase && normalized.includes(phrase)) {
        const s = 40 + phrase.length;
        if (s > score) {
          score = s;
          keyword = phrase;
        }
      }
    }
    const phraseTokens = entry.phrases.flatMap((p) => p.split(' ')).map(stem);
    for (const token of tokens) {
      if (phraseTokens.some((p) => p === token)) score += 12;
      else if (token.length >= 3 && phraseTokens.some((p) => p.startsWith(token) || (token.startsWith(p) && p.length >= 3))) score += 7;
      else if (entry.bodyTokens.has(token)) score += 3;
    }
    if (score >= 7) {
      results.push({ answer: entry.answer, score: score + (entry.answer.priority || 0) / 10, keyword: keyword || normalized });
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
