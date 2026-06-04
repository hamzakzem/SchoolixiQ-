import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../lib/LanguageContext';

export type MobileModuleItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

type Props = {
  open: boolean;
  onClose: () => void;
  modules: MobileModuleItem[];
  onSelect: (tabId: string) => void;
  schoolName?: string;
};

export default function MobileModuleSearch({
  open,
  onClose,
  modules,
  onSelect,
  schoolName,
}: Props) {
  const { isRtl } = useLanguage();
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return modules;
    return modules.filter((m) => m.label.toLowerCase().includes(term));
  }, [modules, q]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] bg-slate-900/50 backdrop-blur-md pt-[72px] pb-[84px] px-3 flex flex-col"
          dir={isRtl ? 'rtl' : 'ltr'}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 bg-gradient-to-b from-[#f8fafc] to-white">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-[#D4A64A] uppercase tracking-widest">
                    SchoolixiQ
                  </p>
                  <h2 className="text-base font-black text-[#0B2345] truncate">
                    {isRtl ? 'بحث الأقسام' : 'Find a section'}
                  </h2>
                  {schoolName ? (
                    <p className="text-[11px] text-slate-500 font-semibold truncate mt-0.5">
                      {schoolName}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0"
                  aria-label={isRtl ? 'إغلاق' : 'Close'}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="relative">
                <Search
                  size={18}
                  className="absolute top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none start-3"
                />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={isRtl ? 'ابحث عن قسم المدرسة...' : 'Search school modules...'}
                  className="w-full h-11 ps-10 pe-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#0B2345]/15 focus:border-[#0B2345]/30"
                  autoFocus
                />
              </div>
            </div>
            <ul className="overflow-y-auto custom-scrollbar p-2 flex-1 min-h-0">
              {filtered.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(m.id);
                      setQ('');
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-[#0B2345]/5 active:bg-[#0B2345]/10 transition-colors text-start"
                  >
                    <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0B2345] to-[#163a6b] text-white flex items-center justify-center shrink-0 shadow-sm">
                      <m.icon size={18} strokeWidth={2.35} />
                    </span>
                    <span className="text-sm font-black text-slate-800 leading-snug">
                      {m.label}
                    </span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 ? (
                <p className="text-center text-sm text-slate-400 font-bold py-10">
                  {isRtl ? 'لا توجد نتائج' : 'No results'}
                </p>
              ) : null}
            </ul>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
