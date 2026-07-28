import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  ChevronLeft,
  Headset,
  Search,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';
import {
  categoriesForScope,
  childAnswers,
  createAssistantSession,
  flowsForCategory,
  matchAssistantKeywords,
  rootAnswersForFlow,
  runAssistantAction,
  smartAssistantIntro,
  type AssistantAnswer,
  type AssistantCatalog,
  type AssistantCategory,
  type AssistantFlow,
  type AssistantSession,
  type SmartAssistantScope,
} from '../../lib/smartAssistantEngine';
import { getSeedCatalog } from '../../lib/smartAssistantData';
import {
  createAssistantTicket,
  logAssistantEvent,
  subscribeAssistantCatalog,
} from '../../lib/smartAssistantStore';
import { prefersReducedMotion } from '../../lib/motion';
import { useDevice } from '../../lib/useDevice';

type ChatLine =
  | { id: string; kind: 'bot'; text: string }
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'answer'; answer: AssistantAnswer };

type ViewMode = 'home' | 'flows' | 'answers' | 'detail' | 'search';

export function SmartAssistantWidget({
  isRtl = true,
  scope = 'landing',
  userId = null,
  userRole = 'guest',
  catalog: catalogProp,
}: {
  isRtl?: boolean;
  scope?: SmartAssistantScope;
  userId?: string | null;
  userRole?: string;
  catalog?: AssistantCatalog;
}) {
  const { isMobile } = useDevice();
  const reduced = prefersReducedMotion();
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<AssistantCatalog>(catalogProp || getSeedCatalog());
  const [session, setSession] = useState<AssistantSession>(() => createAssistantSession(scope));
  const [mode, setMode] = useState<ViewMode>('home');
  const [activeCategory, setActiveCategory] = useState<AssistantCategory | null>(null);
  const [activeFlow, setActiveFlow] = useState<AssistantFlow | null>(null);
  const [activeAnswer, setActiveAnswer] = useState<AssistantAnswer | null>(null);
  const [lines, setLines] = useState<ChatLine[]>([
    { id: 'intro', kind: 'bot', text: smartAssistantIntro(isRtl) },
  ]);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [ticketBusy, setTicketBusy] = useState(false);
  const [resolvedPrompt, setResolvedPrompt] = useState(false);

  useEffect(() => {
    if (catalogProp) {
      setCatalog(catalogProp);
      return;
    }
    return subscribeAssistantCatalog(setCatalog);
  }, [catalogProp]);

  useEffect(() => {
    setSession(createAssistantSession(scope));
    setMode('home');
    setActiveCategory(null);
    setActiveFlow(null);
    setActiveAnswer(null);
    setLines([{ id: 'intro', kind: 'bot', text: smartAssistantIntro(isRtl) }]);
    setResolvedPrompt(false);
  }, [scope, isRtl]);

  const cats = useMemo(() => categoriesForScope(catalog, scope), [catalog, scope]);

  const resetHome = () => {
    setMode('home');
    setActiveCategory(null);
    setActiveFlow(null);
    setActiveAnswer(null);
    setResolvedPrompt(false);
    setShowSearch(false);
    setSearch('');
  };

  const pushBot = (text: string) =>
    setLines((prev) => [...prev, { id: `b-${Date.now()}`, kind: 'bot', text }]);
  const pushUser = (text: string) =>
    setLines((prev) => [...prev, { id: `u-${Date.now()}`, kind: 'user', text }]);

  const openCategory = (cat: AssistantCategory) => {
    pushUser(`${cat.emoji} ${cat.titleAr}`);
    setActiveCategory(cat);
    const flows = flowsForCategory(catalog, cat.id, scope);
    void logAssistantEvent({
      type: 'category_open',
      scope,
      userId,
      conversationId: session.conversationId,
      query: cat.titleAr,
    });
    if (!flows.length) {
      pushBot(isRtl ? 'لا توجد مواضيع في هذا القسم حالياً.' : 'No topics in this section yet.');
      return;
    }
    pushBot(isRtl ? 'ماذا تريد؟' : 'What do you need?');
    setMode('flows');
  };

  const openFlow = (flow: AssistantFlow) => {
    pushUser(flow.titleAr);
    setActiveFlow(flow);
    const answers = rootAnswersForFlow(catalog, flow.id, scope);
    if (!answers.length) {
      pushBot(isRtl ? 'لا توجد إجابات بعد.' : 'No answers yet.');
      return;
    }
    if (answers.length === 1) {
      showAnswer(answers[0]);
      return;
    }
    pushBot(isRtl ? 'اختر موضوعاً:' : 'Choose a topic:');
    setMode('answers');
  };

  const showAnswer = (answer: AssistantAnswer) => {
    setActiveAnswer(answer);
    setMode('detail');
    setResolvedPrompt(true);
    setLines((prev) => [
      ...prev,
      { id: `a-${Date.now()}`, kind: 'answer', answer },
    ]);
    void logAssistantEvent({
      type: 'answer_view',
      scope,
      userId,
      answerId: answer.id,
      conversationId: session.conversationId,
      query: answer.titleAr,
    });
  };

  const runKeywordSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    pushUser(trimmed);
    setSearch('');
    setShowSearch(false);
    const hit = matchAssistantKeywords(trimmed, catalog, scope);
    if (hit) {
      void logAssistantEvent({
        type: 'keyword_hit',
        scope,
        userId,
        answerId: hit.answer.id,
        query: trimmed,
        conversationId: session.conversationId,
      });
      const cat = catalog.categories.find((c) => c.id === hit.answer.categoryId) || null;
      const flow = catalog.flows.find((f) => f.id === hit.answer.flowId) || null;
      setActiveCategory(cat);
      setActiveFlow(flow);
      showAnswer(hit.answer);
      return;
    }
    void logAssistantEvent({
      type: 'search_miss',
      scope,
      userId,
      query: trimmed,
      conversationId: session.conversationId,
    });
    pushBot(
      isRtl
        ? 'لم أجد جواباً مطابقاً. اختر قسماً من الأزرار أو اطلب الدعم البشري.'
        : 'No match found. Pick a category or request human support.',
    );
    setResolvedPrompt(true);
    setMode('home');
  };

  const handleResolved = async (yes: boolean) => {
    setResolvedPrompt(false);
    if (yes) {
      pushBot(isRtl ? 'سعيد بمساعدتك! هل تحتاج شيئاً آخر؟' : 'Glad it helped! Need anything else?');
      void logAssistantEvent({
        type: 'resolved',
        scope,
        userId,
        answerId: activeAnswer?.id,
        conversationId: session.conversationId,
      });
      resetHome();
      return;
    }
    pushBot(isRtl ? 'حسناً — يمكنك طلب دعم بشري.' : 'You can request human support.');
    void logAssistantEvent({
      type: 'unresolved',
      scope,
      userId,
      answerId: activeAnswer?.id,
      conversationId: session.conversationId,
      query: activeAnswer?.titleAr || '',
    });
  };

  const requestHuman = async () => {
    setTicketBusy(true);
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
        pathTitles: [
          activeCategory?.titleAr,
          activeFlow?.titleAr,
          activeAnswer?.titleAr,
        ].filter(Boolean) as string[],
      });
      pushBot(
        isRtl
          ? 'تم فتح تذكرة دعم. سيتواصل معك الفريق قريباً.'
          : 'Support ticket created. Our team will follow up.',
      );
      setResolvedPrompt(false);
    } catch {
      pushBot(isRtl ? 'تعذر فتح التذكرة. جرّب واتساب.' : 'Could not create ticket. Try WhatsApp.');
    } finally {
      setTicketBusy(false);
    }
  };

  const onAction = async (answer: AssistantAnswer, actionId: string) => {
    const action = answer.actions.find((a) => a.id === actionId);
    if (!action) return;
    if (action.type === 'create_ticket' || action.type === 'navigate_answer') {
      if (action.type === 'create_ticket') {
        await requestHuman();
        return;
      }
      const next = catalog.answers.find((a) => a.id === action.value);
      if (next) showAnswer(next);
      return;
    }
    runAssistantAction(action);
  };

  const panelClass = isMobile
    ? 'fixed inset-0 z-50 flex flex-col bg-[#0B1F3A]/40 backdrop-blur-[2px]'
    : 'fixed z-50 bottom-40 end-4 w-[min(94vw,24rem)]';

  const cardClass = isMobile
    ? 'm-auto w-full max-w-lg h-[min(92dvh,720px)] rounded-t-3xl sm:rounded-3xl border border-white/10 bg-white dark:bg-[#0d1528] shadow-2xl overflow-hidden flex flex-col'
    : 'w-full max-h-[min(78vh,640px)] rounded-2xl border border-[#0B1F3A]/12 bg-white/95 dark:bg-[#0d1528]/95 backdrop-blur-md shadow-2xl overflow-hidden flex flex-col';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed z-40 bottom-24 end-4 w-14 h-14 rounded-full bg-[#0B1F3A] text-[#D4AF37] shadow-xl flex items-center justify-center hover:scale-105 transition-transform ring-2 ring-[#D4AF37]/35 animate-pulse"
        aria-label="مساعد SchoolixIQ"
      >
        <span className="text-lg font-black">S</span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.97 }}
            transition={{ duration: 0.22 }}
            className={panelClass}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {isMobile ? (
              <button type="button" className="flex-1" aria-label="close" onClick={() => setOpen(false)} />
            ) : null}
            <div className={cardClass}>
              <header className="shrink-0 flex items-center justify-between gap-2 px-3 py-3 bg-[#0B1F3A] text-white">
                <div className="min-w-0">
                  <p className="text-sm font-black truncate">مساعد SchoolixIQ</p>
                  <p className="text-[10px] opacity-70">
                    {isRtl ? 'قواعد جاهزة — بدون ذكاء اصطناعي' : 'Rule-based — no AI'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="p-2 rounded-lg hover:bg-white/10"
                    onClick={() => setShowSearch((v) => !v)}
                    aria-label="search"
                  >
                    <Search size={16} />
                  </button>
                  <button type="button" className="p-2 rounded-lg hover:bg-white/10" onClick={() => setOpen(false)}>
                    <X size={16} />
                  </button>
                </div>
              </header>

              {showSearch ? (
                <form
                  className="shrink-0 flex gap-2 p-2 border-b border-[#0B1F3A]/10"
                  onSubmit={(e) => {
                    e.preventDefault();
                    runKeywordSearch(search);
                  }}
                >
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={isRtl ? 'ابحث بكلمات مثل: كلمة المرور' : 'Search keywords…'}
                    className="flex-1 text-sm px-3 py-2 rounded-xl bg-[#0B1F3A]/5 outline-none"
                  />
                  <button type="submit" className="sx-btn sx-btn-primary !h-10 !min-h-10 !px-3 !text-xs">
                    {isRtl ? 'بحث' : 'Go'}
                  </button>
                </form>
              ) : null}

              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 text-sm custom-scrollbar">
                {lines.map((line) => {
                  if (line.kind === 'bot') {
                    return (
                      <div key={line.id} className="me-6 rounded-2xl bg-[#0B1F3A]/06 px-3 py-2 whitespace-pre-wrap">
                        {line.text}
                      </div>
                    );
                  }
                  if (line.kind === 'user') {
                    return (
                      <div key={line.id} className="ms-6 rounded-2xl bg-[#D4AF37]/20 px-3 py-2 font-semibold text-[#0B1F3A]">
                        {line.text}
                      </div>
                    );
                  }
                  const a = line.answer;
                  return (
                    <div key={line.id} className="me-2 rounded-2xl border border-[#0B1F3A]/10 bg-white dark:bg-[#141c2e] p-3 space-y-2">
                      <p className="font-black text-[#0B1F3A] dark:text-white">{a.titleAr}</p>
                      <p className="text-[13px] leading-7 text-[#0B1F3A]/80 dark:text-slate-300 whitespace-pre-wrap">
                        {a.bodyAr}
                      </p>
                      {a.mediaUrl && (a.mediaType === 'image' || a.mediaType === 'gif') ? (
                        <img src={a.mediaUrl} alt="" className="rounded-xl max-h-40 object-cover w-full" loading="lazy" />
                      ) : null}
                      {a.actions?.length ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {a.actions.map((act) => (
                            <button
                              key={act.id}
                              type="button"
                              onClick={() => void onAction(a, act.id)}
                              className="sx-btn sx-btn-secondary !h-9 !min-h-9 !px-3 !text-[11px]"
                            >
                              {act.labelAr}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      {childAnswers(catalog, a.id, scope).length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {childAnswers(catalog, a.id, scope).map((ch) => (
                            <button
                              key={ch.id}
                              type="button"
                              onClick={() => {
                                pushUser(ch.titleAr);
                                showAnswer(ch);
                              }}
                              className="text-[11px] font-bold rounded-full border border-[#D4AF37]/40 px-2.5 py-1"
                            >
                              {ch.titleAr}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {resolvedPrompt ? (
                <div className="shrink-0 border-t border-[#0B1F3A]/10 p-3 space-y-2 bg-[#F4F6F9]/80 dark:bg-[#0a1220]">
                  <p className="text-xs font-bold text-[#0B1F3A]/70 dark:text-slate-300">
                    {isRtl ? 'هل تم حل المشكلة؟' : 'Was this helpful?'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="sx-btn sx-btn-primary !h-10 !min-h-10 !px-3 !text-xs" onClick={() => void handleResolved(true)}>
                      <ThumbsUp size={14} /> {isRtl ? 'نعم' : 'Yes'}
                    </button>
                    <button type="button" className="sx-btn sx-btn-secondary !h-10 !min-h-10 !px-3 !text-xs" onClick={() => void handleResolved(false)}>
                      <ThumbsDown size={14} /> {isRtl ? 'لا' : 'No'}
                    </button>
                    <button
                      type="button"
                      disabled={ticketBusy}
                      className="sx-btn sx-btn-ghost !h-10 !min-h-10 !px-3 !text-xs"
                      onClick={() => void requestHuman()}
                    >
                      <Headset size={14} /> {isRtl ? 'أحتاج دعم' : 'Need support'}
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="shrink-0 border-t border-[#0B1F3A]/10 p-2 space-y-2">
                {mode !== 'home' ? (
                  <button
                    type="button"
                    className="text-[11px] font-bold text-[#0B1F3A]/60 flex items-center gap-1 px-1"
                    onClick={() => {
                      if (mode === 'detail' && activeFlow) {
                        setMode('answers');
                        setActiveAnswer(null);
                        setResolvedPrompt(false);
                        return;
                      }
                      if (mode === 'answers' || mode === 'detail') {
                        setMode('flows');
                        setActiveFlow(null);
                        setActiveAnswer(null);
                        setResolvedPrompt(false);
                        return;
                      }
                      resetHome();
                    }}
                  >
                    <ChevronLeft size={14} className={isRtl ? 'rotate-180' : ''} />
                    {isRtl ? 'رجوع' : 'Back'}
                  </button>
                ) : null}

                {mode === 'home' ? (
                  <div className="grid grid-cols-2 gap-1.5">
                    {cats.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => openCategory(cat)}
                        className="text-start rounded-xl border border-[#0B1F3A]/10 px-2.5 py-2.5 hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/10 transition-colors"
                      >
                        <span className="text-base">{cat.emoji}</span>
                        <p className="text-[11px] font-black mt-1 text-[#0B1F3A] dark:text-white">{cat.titleAr}</p>
                      </button>
                    ))}
                  </div>
                ) : null}

                {mode === 'flows' && activeCategory ? (
                  <div className="flex flex-col gap-1.5">
                    {flowsForCategory(catalog, activeCategory.id, scope).map((flow) => (
                      <button
                        key={flow.id}
                        type="button"
                        onClick={() => openFlow(flow)}
                        className="flex items-center justify-between rounded-xl border border-[#0B1F3A]/10 px-3 py-2.5 text-sm font-bold hover:bg-[#D4AF37]/10"
                      >
                        <span>{flow.titleAr}</span>
                        <ArrowRight size={14} className={isRtl ? 'rotate-180' : ''} />
                      </button>
                    ))}
                  </div>
                ) : null}

                {mode === 'answers' && activeFlow ? (
                  <div className="flex flex-col gap-1.5">
                    {rootAnswersForFlow(catalog, activeFlow.id, scope).map((ans) => (
                      <button
                        key={ans.id}
                        type="button"
                        onClick={() => {
                          pushUser(ans.titleAr);
                          showAnswer(ans);
                        }}
                        className="flex items-center justify-between rounded-xl border border-[#0B1F3A]/10 px-3 py-2.5 text-sm font-bold hover:bg-[#D4AF37]/10"
                      >
                        <span>{ans.titleAr}</span>
                        <ArrowRight size={14} className={isRtl ? 'rotate-180' : ''} />
                      </button>
                    ))}
                  </div>
                ) : null}

                {mode === 'home' ? (
                  <button
                    type="button"
                    disabled={ticketBusy}
                    onClick={() => void requestHuman()}
                    className="w-full sx-btn sx-btn-secondary !h-10 !min-h-10 !text-xs"
                  >
                    <Headset size={14} />
                    {isRtl ? 'لم أجد الحل — تذكرة دعم' : 'No solution — support ticket'}
                  </button>
                ) : null}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
