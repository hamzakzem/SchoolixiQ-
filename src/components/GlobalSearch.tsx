import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from 'react';
import {
  collection,
  getDocs,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { useLanguage } from '../lib/LanguageContext';
import {
  Search,
  X,
  Users,
  GraduationCap,
  UserRound,
  Receipt,
  MessageSquare,
  Clock,
} from 'lucide-react';
import { filterActiveRecords } from '../lib/softDelete';
import { AnimatePresence, motion } from 'motion/react';

type ResultGroup = 'students' | 'teachers' | 'parents' | 'invoices' | 'messages';

type SearchResult = {
  id: string;
  group: ResultGroup;
  label: string;
  sublabel?: string;
  tabId: string;
};

type QuickAction = {
  id: ResultGroup;
  tabId: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  ar: string;
  en: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'students', tabId: 'students', icon: Users, ar: 'الطلاب', en: 'Students' },
  { id: 'teachers', tabId: 'staff', icon: GraduationCap, ar: 'المعلمون', en: 'Teachers' },
  { id: 'parents', tabId: 'parents', icon: UserRound, ar: 'أولياء الأمور', en: 'Parents' },
  { id: 'invoices', tabId: 'tuition', icon: Receipt, ar: 'الفواتير', en: 'Invoices' },
  { id: 'messages', tabId: 'chat', icon: MessageSquare, ar: 'الرسائل', en: 'Messages' },
];

const GROUP_META: Record<ResultGroup, { ar: string; en: string; order: number }> = {
  students: { ar: 'الطلاب', en: 'Students', order: 0 },
  teachers: { ar: 'المعلمون', en: 'Teachers', order: 1 },
  parents: { ar: 'أولياء الأمور', en: 'Parents', order: 2 },
  invoices: { ar: 'الفواتير', en: 'Invoices', order: 3 },
  messages: { ar: 'الرسائل', en: 'Messages', order: 4 },
};

const RECENT_KEY = 'sx-global-search-recent';
const MAX_RECENT = 6;

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === 'string').slice(0, MAX_RECENT)
      : [];
  } catch {
    return [];
  }
}

function pushRecent(term: string) {
  const t = term.trim();
  if (t.length < 2) return;
  const next = [t, ...readRecent().filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(
    0,
    MAX_RECENT,
  );
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}

function useIsMobileSearch() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function groupIcon(group: ResultGroup) {
  switch (group) {
    case 'students':
      return Users;
    case 'teachers':
      return GraduationCap;
    case 'parents':
      return UserRound;
    case 'invoices':
      return Receipt;
    case 'messages':
      return MessageSquare;
    default:
      return Search;
  }
}

type GroupedResults = { group: ResultGroup; items: SearchResult[] }[];

function buildGrouped(results: SearchResult[]): GroupedResults {
  const map = new Map<ResultGroup, SearchResult[]>();
  for (const r of results) {
    const list = map.get(r.group) || [];
    list.push(r);
    map.set(r.group, list);
  }
  return [...map.entries()]
    .sort((a, b) => GROUP_META[a[0]].order - GROUP_META[b[0]].order)
    .map(([group, items]) => ({ group, items }));
}

const ResultRow = memo(function ResultRow({
  item,
  isRtl,
  active,
  onPick,
  id,
}: {
  item: SearchResult;
  isRtl: boolean;
  active: boolean;
  onPick: (item: SearchResult) => void;
  id: string;
}) {
  const Icon = groupIcon(item.group);
  return (
    <button
      type="button"
      id={id}
      role="option"
      aria-selected={active}
      className={`sx-gs__row${active ? ' is-active' : ''}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onPick(item)}
    >
      <span className="sx-gs__row-icon" aria-hidden>
        <Icon size={16} strokeWidth={1.75} />
      </span>
      <span className="sx-gs__row-copy">
        <span className="sx-gs__row-title">{item.label}</span>
        <span className="sx-gs__row-meta">
          {isRtl ? GROUP_META[item.group].ar : GROUP_META[item.group].en}
          {item.sublabel ? ` · ${item.sublabel}` : ''}
        </span>
      </span>
    </button>
  );
});

const GroupedPanel = memo(function GroupedPanel({
  loading,
  queryText,
  grouped,
  flat,
  activeIndex,
  isRtl,
  onPick,
  emptyHint,
}: {
  loading: boolean;
  queryText: string;
  grouped: GroupedResults;
  flat: SearchResult[];
  activeIndex: number;
  isRtl: boolean;
  onPick: (item: SearchResult) => void;
  emptyHint?: string;
}) {
  if (loading) {
    return (
      <p className="sx-gs__empty" role="status">
        {isRtl ? 'جاري التحميل...' : 'Loading...'}
      </p>
    );
  }

  if (queryText.trim().length < 2) {
    return emptyHint ? <p className="sx-gs__empty">{emptyHint}</p> : null;
  }

  if (flat.length === 0) {
    return (
      <p className="sx-gs__empty" role="status">
        {isRtl ? 'لا نتائج' : 'No results'}
      </p>
    );
  }

  let offset = 0;
  return (
    <>
      {grouped.map(({ group, items }) => {
        const start = offset;
        offset += items.length;
        return (
          <div key={group} className="sx-gs__group" role="group" aria-label={isRtl ? GROUP_META[group].ar : GROUP_META[group].en}>
            <div className="sx-gs__group-label">
              {isRtl ? GROUP_META[group].ar : GROUP_META[group].en}
            </div>
            {items.map((item, i) => {
              const index = start + i;
              return (
                <ResultRow
                  key={`${item.group}-${item.id}`}
                  id={`sx-gs-option-${index}`}
                  item={item}
                  isRtl={isRtl}
                  active={index === activeIndex}
                  onPick={onPick}
                />
              );
            })}
          </div>
        );
      })}
    </>
  );
});

export default function GlobalSearch({
  onNavigate,
}: {
  onNavigate: (tabId: string) => void;
}) {
  const { profile } = useAuth();
  const { isRtl } = useLanguage();
  const isMobile = useIsMobileSearch();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [active, setActive] = useState(false);
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [pool, setPool] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState<string[]>(() =>
    typeof window !== 'undefined' ? readRecent() : [],
  );

  const debouncedTerm = useDebouncedValue(term, 250);
  const rootRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLInputElement>(null);
  const sheetInputRef = useRef<HTMLInputElement>(null);
  const listboxId = 'sx-gs-listbox';

  const placeholder = isRtl
    ? 'ابحث عن طالب، معلم، فاتورة...'
    : 'Search students, teachers, invoices...';

  const shouldLoad = Boolean(profile?.schoolId) && (active || sheetOpen);

  useEffect(() => {
    if (!profile?.schoolId || !shouldLoad) return;
    let cancelled = false;
    const schoolId = profile.schoolId;

    (async () => {
      setLoading(true);
      try {
        const [students, staff, parents, installments, announcements] = await Promise.all([
          getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId), limit(500))),
          getDocs(
            query(
              collection(db, 'users'),
              where('schoolId', '==', schoolId),
              where('role', 'in', ['teacher', 'admin', 'assistant', 'staff']),
              limit(200),
            ),
          ),
          getDocs(
            query(
              collection(db, 'users'),
              where('schoolId', '==', schoolId),
              where('role', '==', 'parent'),
              limit(300),
            ),
          ),
          getDocs(query(collection(db, 'installments'), where('schoolId', '==', schoolId), limit(300))),
          getDocs(query(collection(db, 'announcements'), where('schoolId', '==', schoolId), limit(100))),
        ]);

        if (cancelled) return;

        const studentRows: SearchResult[] = filterActiveRecords(
          students.docs.map((d) => ({ id: d.id, ...d.data() })),
        ).map((s) => ({
          id: s.id,
          group: 'students' as const,
          label: String(s.name || s.id),
          sublabel: String(s.class || s.className || ''),
          tabId: 'students',
        }));

        const teacherRows: SearchResult[] = staff.docs
          .filter((d) => {
            const role = String(d.data().role || '');
            return role === 'teacher' || role === 'admin' || role === 'assistant' || role === 'staff';
          })
          .map((d) => {
            const data = d.data();
            const role = String(data.role || '');
            return {
              id: d.id,
              group: 'teachers' as const,
              label: String(data.name || data.email || d.id),
              sublabel: role,
              tabId: role === 'teacher' ? 'staff' : 'staff',
            };
          });

        const parentRows: SearchResult[] = parents.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            group: 'parents' as const,
            label: String(data.name || data.email || d.id),
            sublabel: String(data.phone || data.email || ''),
            tabId: 'parents',
          };
        });

        const invoiceRows: SearchResult[] = installments.docs
          .filter((d) => !d.data().isDeleted)
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              group: 'invoices' as const,
              label: String(data.studentName || data.title || d.id),
              sublabel: String(data.amount ?? ''),
              tabId: 'tuition',
            };
          });

        const messageRows: SearchResult[] = filterActiveRecords(
          announcements.docs.map((d) => ({ id: d.id, ...d.data() })),
        ).map((a) => ({
          id: a.id,
          group: 'messages' as const,
          label: String(a.title || a.message || a.id).slice(0, 80),
          tabId: 'announcements',
        }));

        setPool([...studentRows, ...teacherRows, ...parentRows, ...invoiceRows, ...messageRows]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile?.schoolId, shouldLoad]);

  const flatResults = useMemo(() => {
    const q = debouncedTerm.trim().toLowerCase();
    if (!q || q.length < 2) return [] as SearchResult[];
    return pool
      .filter(
        (r) =>
          r.label.toLowerCase().includes(q) ||
          (r.sublabel || '').toLowerCase().includes(q),
      )
      .slice(0, 24);
  }, [pool, debouncedTerm]);

  const grouped = useMemo(() => buildGrouped(flatResults), [flatResults]);

  const showDesktopPanel = !isMobile && active && term.trim().length >= 2;

  useEffect(() => {
    setActiveIndex(flatResults.length ? 0 : -1);
  }, [flatResults]);

  useEffect(() => {
    if (sheetOpen) {
      setRecent(readRecent());
      const t = window.setTimeout(() => sheetInputRef.current?.focus(), 40);
      return () => window.clearTimeout(t);
    }
  }, [sheetOpen]);

  useEffect(() => {
    if (isMobile || !active) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setActive(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [active, isMobile]);

  const closeAll = useCallback(() => {
    setActive(false);
    setSheetOpen(false);
    setActiveIndex(-1);
  }, []);

  const pickResult = useCallback(
    (item: SearchResult) => {
      pushRecent(term.trim() || item.label);
      setRecent(readRecent());
      onNavigate(item.tabId);
      setTerm('');
      closeAll();
    },
    [closeAll, onNavigate, term],
  );

  const pickQuick = useCallback(
    (action: QuickAction) => {
      onNavigate(action.tabId);
      setTerm('');
      closeAll();
    },
    [closeAll, onNavigate],
  );

  const applyRecent = useCallback((value: string) => {
    setTerm(value);
    if (!isMobile) {
      setActive(true);
      fieldRef.current?.focus();
    } else {
      sheetInputRef.current?.focus();
    }
  }, [isMobile]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeAll();
        (e.target as HTMLInputElement).blur();
        return;
      }

      if (!flatResults.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % flatResults.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? flatResults.length - 1 : i - 1));
        return;
      }
      if (e.key === 'Enter' && activeIndex >= 0 && flatResults[activeIndex]) {
        e.preventDefault();
        pickResult(flatResults[activeIndex]);
      }
    },
    [activeIndex, closeAll, flatResults, pickResult],
  );

  const activeDescendant =
    activeIndex >= 0 ? `sx-gs-option-${activeIndex}` : undefined;

  return (
    <div className="sx-gs" dir={isRtl ? 'rtl' : 'ltr'} ref={rootRef}>
      {/* Desktop / tablet permanent field */}
      <div className="sx-gs__field">
        <Search size={18} strokeWidth={1.75} className="sx-gs__icon" aria-hidden />
        <input
          ref={fieldRef}
          type="search"
          className="sx-gs__input"
          placeholder={placeholder}
          value={term}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={showDesktopPanel}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={showDesktopPanel ? activeDescendant : undefined}
          aria-label={isRtl ? 'بحث شامل' : 'Global search'}
          onChange={(e) => setTerm(e.target.value)}
          onFocus={() => {
            if (!isMobile) setActive(true);
          }}
          onKeyDown={onKeyDown}
        />
      </div>

      <AnimatePresence>
        {showDesktopPanel && (
          <motion.div
            id={listboxId}
            role="listbox"
            aria-label={isRtl ? 'نتائج البحث' : 'Search results'}
            className="sx-gs__panel"
            initial={{ opacity: 0, y: -4, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -2, scale: 0.99 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            <GroupedPanel
              loading={loading}
              queryText={debouncedTerm}
              grouped={grouped}
              flat={flatResults}
              activeIndex={activeIndex}
              isRtl={isRtl}
              onPick={pickResult}
              emptyHint={isRtl ? 'اكتب حرفين على الأقل' : 'Type at least 2 characters'}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile trigger — isolated from other navbar action styles */}
      <button
        type="button"
        className="sx-gs__mobile-trigger"
        onClick={() => setSheetOpen(true)}
        aria-label={isRtl ? 'فتح البحث' : 'Open search'}
      >
        <Search size={18} strokeWidth={1.75} aria-hidden />
      </button>

      {/* Mobile top sheet */}
      <AnimatePresence>
        {isMobile && sheetOpen && (
          <motion.div
            className="sx-gs__sheet-root"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <button
              type="button"
              className="sx-gs__sheet-backdrop"
              aria-label={isRtl ? 'إغلاق' : 'Close'}
              onClick={closeAll}
            />
            <motion.div
              className="sx-gs__sheet"
              role="dialog"
              aria-modal="true"
              aria-label={isRtl ? 'بحث شامل' : 'Global search'}
              initial={{ y: '-100%' }}
              animate={{ y: 0 }}
              exit={{ y: '-100%' }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="sx-gs__sheet-head">
                <div className="sx-gs__sheet-field">
                  <Search size={18} strokeWidth={1.75} className="sx-gs__sheet-icon" aria-hidden />
                  <input
                    ref={sheetInputRef}
                    type="search"
                    className="sx-gs__sheet-input"
                    placeholder={placeholder}
                    value={term}
                    autoComplete="off"
                    spellCheck={false}
                    role="combobox"
                    aria-expanded={true}
                    aria-controls={`${listboxId}-mobile`}
                    aria-autocomplete="list"
                    aria-activedescendant={activeDescendant}
                    aria-label={isRtl ? 'بحث شامل' : 'Global search'}
                    onChange={(e) => setTerm(e.target.value)}
                    onKeyDown={onKeyDown}
                  />
                </div>
                <button
                  type="button"
                  className="sx-gs__sheet-close"
                  onClick={closeAll}
                  aria-label={isRtl ? 'إغلاق' : 'Close'}
                >
                  <X size={18} strokeWidth={1.75} />
                </button>
              </div>

              <div className="sx-gs__sheet-body" id={`${listboxId}-mobile`} role="listbox">
                {term.trim().length < 2 ? (
                  <>
                    {recent.length > 0 && (
                      <div className="sx-gs__group">
                        <div className="sx-gs__group-label">
                          {isRtl ? 'عمليات البحث الأخيرة' : 'Recent searches'}
                        </div>
                        {recent.map((r) => (
                          <button
                            key={r}
                            type="button"
                            className="sx-gs__row"
                            onClick={() => applyRecent(r)}
                          >
                            <span className="sx-gs__row-icon" aria-hidden>
                              <Clock size={16} strokeWidth={1.75} />
                            </span>
                            <span className="sx-gs__row-copy">
                              <span className="sx-gs__row-title">{r}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="sx-gs__group">
                      <div className="sx-gs__group-label">
                        {isRtl ? 'اختصارات سريعة' : 'Quick actions'}
                      </div>
                      <div className="sx-gs__quick">
                        {QUICK_ACTIONS.map((action) => {
                          const Icon = action.icon;
                          return (
                            <button
                              key={action.id}
                              type="button"
                              className="sx-gs__quick-btn"
                              onClick={() => pickQuick(action)}
                            >
                              <Icon size={18} strokeWidth={1.75} aria-hidden />
                              <span>{isRtl ? action.ar : action.en}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <GroupedPanel
                    loading={loading}
                    queryText={debouncedTerm}
                    grouped={grouped}
                    flat={flatResults}
                    activeIndex={activeIndex}
                    isRtl={isRtl}
                    onPick={pickResult}
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
