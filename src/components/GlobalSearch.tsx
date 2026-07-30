import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { Search, X, Users, UserRound, Building, Wallet, Bell, BookOpen } from 'lucide-react';
import { filterActiveRecords } from '../lib/softDelete';
import { motion, AnimatePresence } from 'motion/react';

type SearchResult = {
  id: string;
  type: 'student' | 'staff' | 'class' | 'tuition' | 'announcement' | 'homework';
  label: string;
  sublabel?: string;
  tabId: string;
};

const TYPE_META: Record<
  SearchResult['type'],
  { icon: React.ComponentType<{ size?: number }>; ar: string; en: string }
> = {
  student: { icon: Users, ar: 'طالب', en: 'Student' },
  staff: { icon: UserRound, ar: 'موظف', en: 'Staff' },
  class: { icon: Building, ar: 'صف', en: 'Class' },
  tuition: { icon: Wallet, ar: 'قسط', en: 'Tuition' },
  announcement: { icon: Bell, ar: 'إعلان', en: 'Announcement' },
  homework: { icon: BookOpen, ar: 'واجب', en: 'Homework' },
};

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

function ResultsList({
  loading,
  term,
  results,
  isRtl,
  onPick,
}: {
  loading: boolean;
  term: string;
  results: SearchResult[];
  isRtl: boolean;
  onPick: (tabId: string) => void;
}) {
  return (
    <>
      {loading && (
        <p className="sx-global-search__empty">
          {isRtl ? 'جاري التحميل...' : 'Loading...'}
        </p>
      )}
      {!loading && term.trim().length < 2 && (
        <p className="sx-global-search__empty">
          {isRtl ? 'اكتب حرفين على الأقل' : 'Type at least 2 characters'}
        </p>
      )}
      {!loading &&
        term.trim().length >= 2 &&
        results.map((r) => {
          const meta = TYPE_META[r.type];
          const Icon = meta.icon;
          return (
            <button
              key={`${r.type}-${r.id}`}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPick(r.tabId)}
              className="sx-global-search__result"
            >
              <span className="sx-global-search__result-icon">
                <Icon size={16} />
              </span>
              <span className="sx-global-search__result-copy">
                <span className="sx-global-search__result-title">{r.label}</span>
                <span className="sx-global-search__result-meta">
                  {isRtl ? meta.ar : meta.en}
                  {r.sublabel ? ` · ${r.sublabel}` : ''}
                </span>
              </span>
            </button>
          );
        })}
      {!loading && term.trim().length >= 2 && results.length === 0 && (
        <p className="sx-global-search__empty">
          {isRtl ? 'لا نتائج' : 'No results'}
        </p>
      )}
    </>
  );
}

export default function GlobalSearch({
  onNavigate,
}: {
  onNavigate: (tabId: string) => void;
}) {
  const { profile } = useAuth();
  const { isRtl } = useLanguage();
  const isMobile = useIsMobileSearch();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState(false);
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [pool, setPool] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const placeholder = isRtl
    ? 'ابحث عن طالب، مدرسة، رسالة...'
    : 'Search students, schools, messages...';

  const shouldLoad = Boolean(profile?.schoolId) && (active || mobileOpen);

  useEffect(() => {
    if (!profile?.schoolId || !shouldLoad) return;

    let cancelled = false;
    const schoolId = profile.schoolId;

    (async () => {
      setLoading(true);
      try {
        const [students, staff, classes, installments, announcements, homework] =
          await Promise.all([
            getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId), limit(500))),
            getDocs(
              query(
                collection(db, 'users'),
                where('schoolId', '==', schoolId),
                where('role', 'in', ['admin', 'assistant', 'teacher', 'staff', 'guard']),
                limit(200),
              ),
            ),
            getDocs(query(collection(db, 'classes'), where('schoolId', '==', schoolId), limit(100))),
            getDocs(query(collection(db, 'installments'), where('schoolId', '==', schoolId), limit(300))),
            getDocs(query(collection(db, 'announcements'), where('schoolId', '==', schoolId), limit(100))),
            getDocs(query(collection(db, 'homework'), where('schoolId', '==', schoolId), limit(100))),
          ]);

        if (cancelled) return;

        const studentRows: SearchResult[] = filterActiveRecords(
          students.docs.map((d) => ({ id: d.id, ...d.data() })),
        ).map((s) => ({
          id: s.id,
          type: 'student' as const,
          label: String(s.name || s.id),
          sublabel: String(s.class || s.className || ''),
          tabId: 'students',
        }));

        const staffRows: SearchResult[] = staff.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            type: 'staff' as const,
            label: String(data.name || data.email || d.id),
            sublabel: String(data.role || ''),
            tabId: 'staff',
          };
        });

        const classRows: SearchResult[] = filterActiveRecords(
          classes.docs.map((d) => ({ id: d.id, ...d.data() })),
        ).map((c) => ({
          id: c.id,
          type: 'class' as const,
          label: String(c.name || c.id),
          tabId: 'classes',
        }));

        const tuitionRows: SearchResult[] = installments.docs
          .filter((d) => !d.data().isDeleted)
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              type: 'tuition' as const,
              label: String(data.studentName || data.title || d.id),
              sublabel: String(data.amount || ''),
              tabId: 'tuition',
            };
          });

        const annRows: SearchResult[] = filterActiveRecords(
          announcements.docs.map((d) => ({ id: d.id, ...d.data() })),
        ).map((a) => ({
          id: a.id,
          type: 'announcement' as const,
          label: String(a.title || a.message || a.id).slice(0, 80),
          tabId: 'announcements',
        }));

        const hwRows: SearchResult[] = homework.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            type: 'homework' as const,
            label: String(data.title || data.subject || d.id),
            sublabel: String(data.className || ''),
            tabId: 'homework',
          };
        });

        setPool([
          ...studentRows,
          ...staffRows,
          ...classRows,
          ...tuitionRows,
          ...annRows,
          ...hwRows,
        ]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile?.schoolId, shouldLoad]);

  const results = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return pool
      .filter(
        (r) =>
          r.label.toLowerCase().includes(q) ||
          (r.sublabel || '').toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [pool, term]);

  useEffect(() => {
    if (mobileOpen) inputRef.current?.focus();
  }, [mobileOpen]);

  useEffect(() => {
    if (isMobile || !active) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setActive(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [active, isMobile]);

  const pick = (tabId: string) => {
    onNavigate(tabId);
    setTerm('');
    setActive(false);
    setMobileOpen(false);
  };

  const showInlinePanel = !isMobile && active && term.trim().length >= 2;

  return (
    <div className="sx-global-search" dir={isRtl ? 'rtl' : 'ltr'} ref={rootRef}>
      {/* Desktop / tablet — permanently visible; focus only, no modal */}
      <label className="sx-global-search__field sx-global-search__field--bar">
        <Search size={18} strokeWidth={1.75} className="sx-global-search__icon" aria-hidden />
        <input
          ref={fieldInputRef}
          type="search"
          className="sx-global-search__input"
          placeholder={placeholder}
          value={term}
          aria-label={isRtl ? 'بحث شامل' : 'Global search'}
          aria-expanded={showInlinePanel}
          aria-controls="sx-global-search-panel"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setTerm(e.target.value)}
          onFocus={() => {
            if (!isMobile) setActive(true);
          }}
        />
      </label>

      <AnimatePresence>
        {showInlinePanel && (
          <motion.div
            id="sx-global-search-panel"
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            className="sx-global-search__panel"
          >
            <ResultsList
              loading={loading}
              term={term}
              results={results}
              isRtl={isRtl}
              onPick={pick}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile — icon opens full search */}
      <button
        type="button"
        className="sx-global-search__mobile-btn"
        onClick={() => setMobileOpen(true)}
        aria-label={isRtl ? 'بحث' : 'Search'}
      >
        <Search size={18} strokeWidth={1.75} aria-hidden />
      </button>

      <AnimatePresence>
        {isMobile && mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="sx-global-search__overlay"
            onClick={() => setMobileOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              className="sx-global-search__modal"
              onClick={(e) => e.stopPropagation()}
              dir={isRtl ? 'rtl' : 'ltr'}
              role="dialog"
              aria-modal="true"
              aria-label={isRtl ? 'بحث شامل' : 'Global search'}
            >
              <div className="sx-global-search__modal-field">
                <Search size={18} strokeWidth={1.75} className="sx-global-search__icon" aria-hidden />
                <input
                  ref={inputRef}
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder={placeholder}
                  className="sx-global-search__modal-input"
                />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="sx-global-search__close"
                  aria-label={isRtl ? 'إغلاق' : 'Close'}
                >
                  <X size={18} strokeWidth={1.75} />
                </button>
              </div>

              <div className="sx-global-search__results">
                <ResultsList
                  loading={loading}
                  term={term}
                  results={results}
                  isRtl={isRtl}
                  onPick={pick}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
