import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronLeft,
  Headset,
  Home,
  MessageCircleQuestion,
  RotateCcw,
  Search,
  SendHorizontal,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';
import {
  buildAssistantSearchIndex,
  categoriesForScope,
  childAnswers,
  createAssistantSession,
  flowsForCategory,
  rootAnswersForFlow,
  runAssistantAction,
  searchAssistantAnswers,
  smartAssistantIntro,
  type AssistantAnswer,
  type AssistantCatalog,
  type AssistantCategory,
  type AssistantFlow,
  type AssistantSession,
  type KeywordMatch,
  type SmartAssistantScope,
} from '../../lib/smartAssistantEngine';
import { getSeedCatalog } from '../../lib/smartAssistantData';
import {
  createAssistantTicket,
  getCachedAssistantCatalog,
  logAssistantEvent,
  peekCachedAssistantCatalog,
} from '../../lib/smartAssistantStore';
import { prefersReducedMotion } from '../../lib/motion';
import { useDevice } from '../../lib/useDevice';

type ChatLine =
  | { id: string; kind: 'bot'; text: string }
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'answer'; answer: AssistantAnswer; related: AssistantAnswer[] };

type ViewMode = 'home' | 'flows' | 'answers' | 'detail';

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const TYPING_MS = 320;

export function SmartAssistantWidget({
  isRtl = true,
  scope = 'landing',
  userId = null,
  userRole = 'guest',
  catalog: catalogProp,
  variant = 'fab',
  open: openProp,
  onOpenChange,
  assistantName,
  introText,
  logoUrl,
}: {
  isRtl?: boolean;
  scope?: SmartAssistantScope;
  userId?: string | null;
  userRole?: string;
  catalog?: AssistantCatalog;
  /** fab = floating (landing); panel = navbar side drawer */
  variant?: 'fab' | 'panel';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  assistantName?: string;
  introText?: string;
  logoUrl?: string;
}) {
  const { isMobile } = useDevice();
  const reduced = prefersReducedMotion();
  const [internalOpen, setInternalOpen] = useState(false);
  const controlled = typeof openProp === 'boolean';
  const open = controlled ? openProp : internalOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      if (!controlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [controlled, onOpenChange],
  );

  const [catalog, setCatalog] = useState<AssistantCatalog>(
    () => catalogProp || peekCachedAssistantCatalog() || getSeedCatalog(),
  );
  const [session, setSession] = useState<AssistantSession>(() => createAssistantSession(scope));
  const [mode, setMode] = useState<ViewMode>('home');
  const [activeCategory, setActiveCategory] = useState<AssistantCategory | null>(null);
  const [activeFlow, setActiveFlow] = useState<AssistantFlow | null>(null);
  const [activeAnswer, setActiveAnswer] = useState<AssistantAnswer | null>(null);
  const intro = introText || smartAssistantIntro(isRtl);
  const [lines, setLines] = useState<ChatLine[]>([{ id: 'intro', kind: 'bot', text: intro }]);
  const [query, setQuery] = useState('');
  const [typing, setTyping] = useState(false);
  const [ticketBusy, setTicketBusy] = useState(false);
  const [feedbackFor, setFeedbackFor] = useState<string | null>(null);
  const lineSeq = useRef(0);
  const typingTimer = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const displayName = assistantName || (isRtl ? 'مساعد SchoolixIQ' : 'SchoolixIQ Assistant');
  const isPanel = variant === 'panel';
  const isSheet = !isPanel && isMobile;

  // ---- catalog: shared cache, fetched lazily (on open / FAB hover) ----
  const ensureCatalog = useCallback(() => {
    if (catalogProp) return;
    getCachedAssistantCatalog()
      .then(setCatalog)
      .catch(() => undefined);
  }, [catalogProp]);

  useEffect(() => {
    if (catalogProp) setCatalog(catalogProp);
  }, [catalogProp]);

  useEffect(() => {
    if (open) ensureCatalog();
  }, [open, ensureCatalog]);

  const cats = useMemo(() => categoriesForScope(catalog, scope), [catalog, scope]);
  const searchIndex = useMemo(() => buildAssistantSearchIndex(catalog, scope), [catalog, scope]);
  const suggestions = useMemo(
    () => (query.trim().length >= 2 ? searchAssistantAnswers(query, searchIndex, 4) : []),
    [query, searchIndex],
  );

  const nextId = (prefix: string) => `${prefix}-${++lineSeq.current}`;

  const clearTyping = () => {
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = null;
    setTyping(false);
  };

  /** Bot replies appear after a short typing beat (skipped with reduced motion). */
  const botSay = useCallback(
    (make: () => ChatLine | ChatLine[]) => {
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
      const flush = () => {
        typingTimer.current = null;
        setTyping(false);
        const out = make();
        setLines((prev) => [...prev, ...(Array.isArray(out) ? out : [out])]);
      };
      if (reduced) return flush();
      setTyping(true);
      typingTimer.current = window.setTimeout(flush, TYPING_MS);
    },
    [reduced],
  );

  const pushUser = (text: string) => setLines((prev) => [...prev, { id: nextId('u'), kind: 'user', text }]);
  const pushBot = (text: string) => botSay(() => ({ id: nextId('b'), kind: 'bot', text }));

  const resetConversation = useCallback(() => {
    clearTyping();
    setSession(createAssistantSession(scope));
    setMode('home');
    setActiveCategory(null);
    setActiveFlow(null);
    setActiveAnswer(null);
    setFeedbackFor(null);
    setQuery('');
    setLines([{ id: 'intro', kind: 'bot', text: introText || smartAssistantIntro(isRtl) }]);
  }, [scope, isRtl, introText]);

  useEffect(() => {
    resetConversation();
  }, [resetConversation]);

  useEffect(() => () => clearTyping(), []);

  // Keep the newest message in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  }, [lines, typing, mode, reduced]);

  // Escape closes; the mobile sheet locks page scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    let restore: (() => void) | undefined;
    if (isSheet) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      restore = () => {
        document.body.style.overflow = prev;
      };
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      restore?.();
    };
  }, [open, isSheet, setOpen]);

  const log = (input: Omit<Parameters<typeof logAssistantEvent>[0], 'scope' | 'userId' | 'conversationId'>) =>
    void logAssistantEvent({ ...input, scope, userId, conversationId: session.conversationId });

  const showAnswer = (answer: AssistantAnswer, related: AssistantAnswer[] = []) => {
    setActiveAnswer(answer);
    setMode('detail');
    setFeedbackFor(answer.id);
    botSay(() => ({ id: nextId('a'), kind: 'answer', answer, related }));
    log({ type: 'answer_view', answerId: answer.id, query: answer.titleAr });
  };

  const openCategory = (cat: AssistantCategory) => {
    pushUser(`${cat.emoji} ${cat.titleAr}`);
    setActiveCategory(cat);
    setFeedbackFor(null);
    log({ type: 'category_open', query: cat.titleAr });
    const flows = flowsForCategory(catalog, cat.id, scope);
    if (!flows.length) {
      pushBot(isRtl ? 'لا توجد مواضيع في هذا القسم حالياً.' : 'No topics in this section yet.');
      return;
    }
    if (flows.length === 1) return openFlow(flows[0], { silent: true });
    pushBot(isRtl ? 'اختر الموضوع الذي يهمك:' : 'Pick a topic:');
    setMode('flows');
  };

  const openFlow = (flow: AssistantFlow, opts: { silent?: boolean } = {}) => {
    if (!opts.silent) pushUser(flow.titleAr);
    setActiveFlow(flow);
    const answers = rootAnswersForFlow(catalog, flow.id, scope);
    if (!answers.length) {
      pushBot(isRtl ? 'لا توجد إجابات بعد.' : 'No answers yet.');
      return;
    }
    if (answers.length === 1) return showAnswer(answers[0]);
    pushBot(isRtl ? 'اختر سؤالك:' : 'Choose your question:');
    setMode('answers');
  };

  const pickSuggestion = (match: KeywordMatch, typed: string) => {
    pushUser(typed);
    setQuery('');
    const cat = catalog.categories.find((c) => c.id === match.answer.categoryId) || null;
    const flow = catalog.flows.find((f) => f.id === match.answer.flowId) || null;
    setActiveCategory(cat);
    setActiveFlow(flow);
    log({ type: 'keyword_hit', answerId: match.answer.id, query: typed });
    showAnswer(match.answer);
  };

  const submitQuery = (raw: string) => {
    const typed = raw.trim();
    if (!typed) return;
    const hits = searchAssistantAnswers(typed, searchIndex, 3);
    if (hits.length) {
      pushUser(typed);
      setQuery('');
      const [best, ...rest] = hits;
      setActiveCategory(catalog.categories.find((c) => c.id === best.answer.categoryId) || null);
      setActiveFlow(catalog.flows.find((f) => f.id === best.answer.flowId) || null);
      log({ type: 'keyword_hit', answerId: best.answer.id, query: typed });
      showAnswer(best.answer, rest.map((r) => r.answer));
      return;
    }
    pushUser(typed);
    setQuery('');
    log({ type: 'search_miss', query: typed });
    setMode('home');
    setFeedbackFor(null);
    pushBot(
      isRtl
        ? 'لم أجد إجابة مطابقة لسؤالك. جرّب كلمات أخرى، أو اختر قسماً بالأسفل، أو تواصل مع فريق الدعم.'
        : "I couldn't find a match. Try other words, pick a section below, or contact support.",
    );
  };

  const handleResolved = (yes: boolean) => {
    setFeedbackFor(null);
    if (yes) {
      log({ type: 'resolved', answerId: activeAnswer?.id });
      pushBot(isRtl ? 'رائع! سعيد بمساعدتك 🌟 هل تحتاج شيئاً آخر؟' : 'Great! Glad it helped 🌟 Anything else?');
      setMode('home');
      setActiveCategory(null);
      setActiveFlow(null);
      return;
    }
    log({ type: 'unresolved', answerId: activeAnswer?.id, query: activeAnswer?.titleAr || '' });
    pushBot(
      isRtl
        ? 'نعتذر عن ذلك. يمكنك كتابة سؤالك بكلمات أخرى، أو طلب مساعدة فريق الدعم.'
        : 'Sorry about that. Rephrase your question or ask our support team.',
    );
  };

  const requestHuman = async () => {
    if (ticketBusy) return;
    setTicketBusy(true);
    pushUser(isRtl ? 'أريد التحدث مع فريق الدعم' : 'I want to talk to support');
    try {
      const question =
        activeAnswer?.titleAr ||
        activeFlow?.titleAr ||
        activeCategory?.titleAr ||
        (isRtl ? 'طلب دعم من المساعد' : 'Support request');
      await createAssistantTicket({
        userId,
        role: userRole,
        scope,
        question,
        conversationId: session.conversationId,
        pathTitles: [activeCategory?.titleAr, activeFlow?.titleAr, activeAnswer?.titleAr].filter(Boolean) as string[],
      });
      pushBot(
        isRtl
          ? 'تم إرسال طلبك إلى فريق الدعم ✅ سيتواصل معك قريباً.'
          : 'Your request was sent to support ✅ We will follow up soon.',
      );
      setFeedbackFor(null);
    } catch {
      pushBot(
        isRtl
          ? 'تعذر إرسال الطلب الآن. يمكنك مراسلتنا مباشرة عبر واتساب.'
          : 'Could not send the request. You can message us on WhatsApp.',
      );
    } finally {
      setTicketBusy(false);
    }
  };

  const onAction = async (answer: AssistantAnswer, actionId: string) => {
    const action = answer.actions.find((a) => a.id === actionId);
    if (!action) return;
    if (action.type === 'create_ticket') return requestHuman();
    if (action.type === 'navigate_answer') {
      const next = catalog.answers.find((a) => a.id === action.value);
      if (next) {
        pushUser(next.titleAr);
        showAnswer(next);
      }
      return;
    }
    if (action.type === 'open_section' && !isPanel) setOpen(false);
    runAssistantAction(action);
  };

  const goBack = () => {
    setFeedbackFor(null);
    if (mode === 'detail' && activeFlow && rootAnswersForFlow(catalog, activeFlow.id, scope).length > 1) {
      setMode('answers');
      setActiveAnswer(null);
      return;
    }
    if ((mode === 'detail' || mode === 'answers') && activeCategory && flowsForCategory(catalog, activeCategory.id, scope).length > 1) {
      setMode('flows');
      setActiveFlow(null);
      setActiveAnswer(null);
      return;
    }
    setMode('home');
    setActiveCategory(null);
    setActiveFlow(null);
    setActiveAnswer(null);
  };

  // ---------------------------------------------------------------- render
  const msgMotion = reduced
    ? {}
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.28, ease: EASE_OUT } };

  const avatar = (
    <span className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-b from-[#EDD07F] to-[#C99A2E] text-[#0B1F3A] flex items-center justify-center shadow-sm">
      <Sparkles size={13} strokeWidth={2.2} />
    </span>
  );

  const chip =
    'inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-[12px] font-bold text-slate-700 dark:text-slate-200 hover:border-[#D4AF37]/60 hover:bg-[#D4AF37]/10 active:scale-[0.97] transition';
  const optionRow =
    'w-full flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] px-3.5 py-3 text-start text-[13px] font-bold text-slate-800 dark:text-slate-100 hover:border-[#D4AF37]/60 hover:bg-[#FFFBEB] dark:hover:bg-white/[0.07] active:scale-[0.99] transition';

  const renderLine = (line: ChatLine, isLast: boolean) => {
    if (line.kind === 'user') {
      return (
        <motion.div key={line.id} {...msgMotion} className="flex justify-end">
          <div className="max-w-[82%] rounded-2xl rounded-ee-md bg-gradient-to-b from-[#16345f] to-[#0B1F3A] text-white px-3.5 py-2.5 text-[13px] font-semibold leading-6 shadow-sm">
            {line.text}
          </div>
        </motion.div>
      );
    }
    if (line.kind === 'bot') {
      return (
        <motion.div key={line.id} {...msgMotion} className="flex items-end gap-2">
          {avatar}
          <div className="max-w-[82%] rounded-2xl rounded-es-md bg-white dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-100 px-3.5 py-2.5 text-[13px] leading-6 whitespace-pre-wrap shadow-sm">
            {line.text}
          </div>
        </motion.div>
      );
    }
    const a = line.answer;
    const children = childAnswers(catalog, a.id, scope);
    return (
      <motion.div key={line.id} {...msgMotion} className="flex items-start gap-2">
        {avatar}
        <div className="flex-1 min-w-0 rounded-2xl rounded-ss-md bg-white dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
          <div className="border-s-[3px] border-[#D4AF37] px-3.5 py-3 space-y-2">
            <p className="font-black text-[14px] text-[#0B1F3A] dark:text-white">{a.titleAr}</p>
            <p className="text-[13px] leading-7 text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{a.bodyAr}</p>
            {a.mediaUrl && (a.mediaType === 'image' || a.mediaType === 'gif') ? (
              <img src={a.mediaUrl} alt="" className="rounded-xl max-h-44 object-cover w-full" loading="lazy" decoding="async" />
            ) : null}
            {a.actions?.length ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {a.actions.map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => void onAction(a, act.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#0B1F3A] dark:bg-[#D4AF37] text-white dark:text-[#0B1F3A] px-3 py-1.5 text-[12px] font-bold hover:brightness-110 active:scale-[0.97] transition"
                  >
                    {act.labelAr}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {children.length || line.related.length ? (
            <div className="border-t border-slate-100 dark:border-white/10 px-3.5 py-2.5 space-y-1.5">
              <p className="text-[11px] font-bold text-slate-400">{isRtl ? 'أسئلة ذات صلة' : 'Related'}</p>
              <div className="flex flex-wrap gap-1.5">
                {[...children, ...line.related.filter((r) => !children.some((c) => c.id === r.id))].map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      pushUser(ch.titleAr);
                      showAnswer(ch);
                    }}
                    className={chip}
                  >
                    {ch.titleAr}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {isLast && feedbackFor === a.id ? (
            <div className="border-t border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.03] px-3.5 py-2.5 flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400 me-auto">
                {isRtl ? 'هل أفادتك الإجابة؟' : 'Was this helpful?'}
              </span>
              <button type="button" onClick={() => handleResolved(true)} className={chip} aria-label={isRtl ? 'نعم' : 'Yes'}>
                <ThumbsUp size={13} /> {isRtl ? 'نعم' : 'Yes'}
              </button>
              <button type="button" onClick={() => handleResolved(false)} className={chip} aria-label={isRtl ? 'لا' : 'No'}>
                <ThumbsDown size={13} /> {isRtl ? 'لا' : 'No'}
              </button>
            </div>
          ) : null}
        </div>
      </motion.div>
    );
  };

  const choices = (() => {
    if (typing) return null;
    if (mode === 'home') {
      return (
        <div className="grid grid-cols-2 gap-2 pt-1">
          {cats.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => openCategory(cat)}
              className="group text-start rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] p-3 hover:border-[#D4AF37]/60 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition"
            >
              <span className="w-9 h-9 rounded-xl bg-[#0B1F3A]/[0.04] dark:bg-white/10 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                {cat.emoji}
              </span>
              <p className="text-[12.5px] font-black mt-2 text-[#0B1F3A] dark:text-white leading-5">{cat.titleAr}</p>
            </button>
          ))}
        </div>
      );
    }
    const list =
      mode === 'flows' && activeCategory
        ? flowsForCategory(catalog, activeCategory.id, scope).map((f) => ({ id: f.id, title: f.titleAr, onClick: () => openFlow(f) }))
        : mode === 'answers' && activeFlow
          ? rootAnswersForFlow(catalog, activeFlow.id, scope).map((ans) => ({
              id: ans.id,
              title: ans.titleAr,
              onClick: () => {
                pushUser(ans.titleAr);
                showAnswer(ans);
              },
            }))
          : [];
    return (
      <div className="space-y-2 pt-1">
        {list.map((item) => (
          <button key={item.id} type="button" onClick={item.onClick} className={optionRow}>
            <span>{item.title}</span>
            <ChevronLeft size={16} className={`shrink-0 text-[#C99A2E] ${isRtl ? '' : 'rotate-180'}`} />
          </button>
        ))}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <button type="button" onClick={goBack} className={chip}>
            <ChevronLeft size={13} className={isRtl ? 'rotate-180' : ''} /> {isRtl ? 'رجوع' : 'Back'}
          </button>
          <button
            type="button"
            onClick={() => {
              setFeedbackFor(null);
              setMode('home');
              setActiveCategory(null);
              setActiveFlow(null);
              setActiveAnswer(null);
            }}
            className={chip}
          >
            <Home size={13} /> {isRtl ? 'القائمة الرئيسية' : 'Main menu'}
          </button>
        </div>
      </div>
    );
  })();

  const body = (
    <>
      <div className="shrink-0 relative flex items-center gap-3 px-4 py-3.5 bg-gradient-to-br from-[#16345f] via-[#0F2A50] to-[#0B1F3A] text-white">
        <div className="relative shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="w-10 h-10 rounded-full object-contain bg-white p-1" />
          ) : (
            <span className="w-10 h-10 rounded-full bg-gradient-to-b from-[#EDD07F] to-[#C99A2E] text-[#0B1F3A] flex items-center justify-center shadow-md">
              <Sparkles size={18} strokeWidth={2.2} />
            </span>
          )}
          <span className="absolute -bottom-0.5 -end-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#0F2A50]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-black truncate">{displayName}</p>
          <p className="text-[11px] text-slate-300 truncate">{isRtl ? 'متاح الآن • يرد فوراً على أسئلتك' : 'Online • instant answers'}</p>
        </div>
        <button
          type="button"
          onClick={resetConversation}
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
          aria-label={isRtl ? 'محادثة جديدة' : 'New conversation'}
          title={isRtl ? 'محادثة جديدة' : 'New conversation'}
        >
          <RotateCcw size={16} />
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
          aria-label={isRtl ? 'إغلاق' : 'Close'}
        >
          <X size={17} />
        </button>
        <span aria-hidden className="absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent" />
      </div>

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-slate-50 dark:bg-[#0a1220] px-3.5 py-4 space-y-3 custom-scrollbar"
        aria-live="polite"
      >
        {lines.map((line, i) => renderLine(line, i === lines.length - 1))}
        <AnimatePresence>
          {typing ? (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-end gap-2"
              aria-label={isRtl ? 'يكتب الآن' : 'Typing'}
            >
              {avatar}
              <div className="rounded-2xl rounded-es-md bg-white dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/10 px-4 py-3 flex gap-1">
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                    style={{ animationDelay: `${d * 120}ms`, animationDuration: '900ms' }}
                  />
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        {choices}
      </div>

      <div className="shrink-0 relative border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d1528] px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <AnimatePresence>
          {suggestions.length ? (
            <motion.ul
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-x-3 bottom-full mb-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111b30] shadow-xl overflow-hidden"
              role="listbox"
            >
              <li className="px-3.5 pt-2.5 pb-1 text-[11px] font-bold text-slate-400">{isRtl ? 'هل تقصد؟' : 'Did you mean?'}</li>
              {suggestions.map((s) => (
                <li key={s.answer.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => pickSuggestion(s, query.trim() || s.answer.titleAr)}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-start text-[13px] font-bold text-slate-700 dark:text-slate-100 hover:bg-[#FFFBEB] dark:hover:bg-white/5 transition"
                  >
                    <Search size={14} className="shrink-0 text-[#C99A2E]" />
                    <span className="truncate">{s.answer.titleAr}</span>
                  </button>
                </li>
              ))}
            </motion.ul>
          ) : null}
        </AnimatePresence>

        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submitQuery(query);
          }}
        >
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isRtl ? 'اكتب سؤالك هنا…' : 'Type your question…'}
            aria-label={isRtl ? 'اكتب سؤالك' : 'Your question'}
            enterKeyHint="send"
            className="flex-1 min-w-0 h-11 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3.5 text-[14px] text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:bg-white dark:focus:bg-white/10 focus:border-[#D4AF37]/70 focus:ring-4 focus:ring-[#D4AF37]/15 transition"
          />
          <button
            type="submit"
            disabled={!query.trim()}
            className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-b from-[#EDD07F] to-[#C99A2E] text-[#0B1F3A] flex items-center justify-center shadow-md disabled:opacity-40 disabled:shadow-none active:scale-95 transition"
            aria-label={isRtl ? 'إرسال' : 'Send'}
          >
            <SendHorizontal size={18} className={isRtl ? 'rotate-180' : ''} />
          </button>
        </form>
        <button
          type="button"
          disabled={ticketBusy}
          onClick={() => void requestHuman()}
          className="mt-2 w-full inline-flex items-center justify-center gap-1.5 text-[12px] font-bold text-slate-500 dark:text-slate-400 hover:text-[#0B1F3A] dark:hover:text-white disabled:opacity-50 transition"
        >
          <Headset size={14} />
          {ticketBusy
            ? isRtl
              ? 'جارٍ الإرسال…'
              : 'Sending…'
            : isRtl
              ? 'لم تجد الحل؟ تحدث مع فريق الدعم'
              : "Didn't find it? Talk to support"}
        </button>
      </div>
    </>
  );

  // ---- containers ----
  const fab = !isPanel ? (
    <motion.button
      type="button"
      onClick={() => setOpen(!open)}
      onPointerEnter={ensureCatalog}
      onFocus={ensureCatalog}
      initial={reduced ? false : { scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26, delay: reduced ? 0 : 0.6 }}
      className="fixed z-40 bottom-24 end-4 w-14 h-14 rounded-full bg-gradient-to-b from-[#16345f] to-[#0B1F3A] text-[#E8C76E] shadow-[0_14px_30px_-10px_rgba(0,0,0,0.6)] ring-1 ring-[#D4AF37]/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      aria-label={open ? (isRtl ? 'إغلاق المساعد' : 'Close assistant') : displayName}
      aria-expanded={open}
      title={displayName}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={open ? 'x' : 'q'}
          initial={reduced ? false : { rotate: -90, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={reduced ? undefined : { rotate: 90, opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.18 }}
          className="flex"
        >
          {open ? <X size={22} strokeWidth={2} /> : <MessageCircleQuestion size={24} strokeWidth={1.75} />}
        </motion.span>
      </AnimatePresence>
      {!open ? (
        <span aria-hidden className="absolute inset-0 rounded-full ring-2 ring-[#D4AF37]/40 animate-ping [animation-duration:2.6s] motion-reduce:hidden" />
      ) : null}
    </motion.button>
  ) : null;

  let surface: React.ReactNode = null;
  if (open && isPanel) {
    surface = (
      <motion.div
        key="panel"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0.01 : 0.2 }}
        className="sx-assistant-panel-overlay"
        dir={isRtl ? 'rtl' : 'ltr'}
        onClick={() => setOpen(false)}
      >
        <div
          className="sx-assistant-panel"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={displayName}
        >
          {body}
        </div>
      </motion.div>
    );
  } else if (open && isSheet) {
    surface = (
      <motion.div key="sheet" className="fixed inset-0 z-[60] flex flex-col justify-end" dir={isRtl ? 'rtl' : 'ltr'}>
        <motion.button
          type="button"
          aria-label={isRtl ? 'إغلاق' : 'Close'}
          className="absolute inset-0 bg-[#030a14]/60 backdrop-blur-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.01 : 0.22 }}
          onClick={() => setOpen(false)}
        />
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={displayName}
          className="relative w-full h-[min(88dvh,760px)] rounded-t-[28px] overflow-hidden flex flex-col bg-white dark:bg-[#0d1528] shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.6)]"
          initial={reduced ? { opacity: 0 } : { y: '100%' }}
          animate={reduced ? { opacity: 1 } : { y: 0 }}
          exit={reduced ? { opacity: 0 } : { y: '100%' }}
          transition={reduced ? { duration: 0.01 } : { type: 'spring', stiffness: 380, damping: 38 }}
        >
          {body}
        </motion.div>
      </motion.div>
    );
  } else if (open) {
    surface = (
      <motion.div
        key="popover"
        role="dialog"
        aria-label={displayName}
        dir={isRtl ? 'rtl' : 'ltr'}
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
        transition={reduced ? { duration: 0.01 } : { type: 'spring', stiffness: 420, damping: 34 }}
        style={{ transformOrigin: isRtl ? 'bottom left' : 'bottom right' }}
        className="fixed z-50 bottom-[10.5rem] end-4 w-[min(94vw,25rem)] h-[min(640px,calc(100dvh-12.5rem))] rounded-[24px] overflow-hidden flex flex-col bg-white dark:bg-[#0d1528] border border-black/5 dark:border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)]"
      >
        {body}
      </motion.div>
    );
  }

  return (
    <>
      {fab}
      <AnimatePresence>{surface}</AnimatePresence>
    </>
  );
}
