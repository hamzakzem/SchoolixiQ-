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

export default function GlobalSearch({
  onNavigate,
}: {
  onNavigate: (tabId: string) => void;
}) {
  const { profile } = useAuth();
  const { isRtl } = useLanguage();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [pool, setPool] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile?.schoolId || !open) return;

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
  }, [profile?.schoolId, open]);

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
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 text-xs font-bold hover:border-[#D4A64A]/40 transition-all"
        aria-label={isRtl ? 'بحث شامل' : 'Global search'}
      >
        <Search size={14} />
        <span>{isRtl ? 'بحث...' : 'Search...'}</span>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden w-11 h-11 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500"
        aria-label={isRtl ? 'بحث' : 'Search'}
      >
        <Search size={18} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              dir={isRtl ? 'rtl' : 'ltr'}
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <Search size={18} className="text-slate-400 shrink-0" />
                <input
                  ref={inputRef}
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder={isRtl ? 'ابحث في مدرستك فقط...' : 'Search your school only...'}
                  className="flex-1 bg-transparent outline-none text-sm font-bold text-slate-800 dark:text-white"
                />
                <button type="button" onClick={() => setOpen(false)} className="text-slate-400">
                  <X size={18} />
                </button>
              </div>
              <div className="max-h-[50vh] overflow-y-auto p-2">
                {loading && (
                  <p className="text-xs font-bold text-slate-400 p-3">{isRtl ? 'جاري التحميل...' : 'Loading...'}</p>
                )}
                {!loading && term.length < 2 && (
                  <p className="text-xs font-bold text-slate-400 p-3">
                    {isRtl ? 'اكتب حرفين على الأقل' : 'Type at least 2 characters'}
                  </p>
                )}
                {!loading &&
                  term.length >= 2 &&
                  results.map((r) => {
                    const meta = TYPE_META[r.type];
                    const Icon = meta.icon;
                    return (
                      <button
                        key={`${r.type}-${r.id}`}
                        type="button"
                        onClick={() => {
                          onNavigate(r.tabId);
                          setOpen(false);
                          setTerm('');
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-right transition-colors"
                      >
                        <Icon size={16} className="text-[#0B2345] dark:text-[#D4A64A] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-slate-900 dark:text-white truncate">{r.label}</p>
                          <p className="text-[10px] font-bold text-slate-400">
                            {isRtl ? meta.ar : meta.en}
                            {r.sublabel ? ` · ${r.sublabel}` : ''}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                {!loading && term.length >= 2 && results.length === 0 && (
                  <p className="text-xs font-bold text-slate-400 p-3">{isRtl ? 'لا نتائج' : 'No results'}</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
