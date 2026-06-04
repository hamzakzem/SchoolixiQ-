import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, X, ChevronDown, Download } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { ANDROID_INSTALL_GUIDE_EVENT } from '../lib/androidAppDownload';

export default function AndroidInstallGuideModal() {
  const { t, isRtl } = useLanguage();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onShow = () => setOpen(true);
    window.addEventListener(ANDROID_INSTALL_GUIDE_EVENT, onShow);
    return () => window.removeEventListener(ANDROID_INSTALL_GUIDE_EVENT, onShow);
  }, []);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10050] flex items-end sm:items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm"
        dir={isRtl ? 'rtl' : 'ltr'}
        onClick={() => setOpen(false)}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start gap-3">
            <span className="shrink-0 w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Shield size={22} />
            </span>
            <div className="flex-1 min-w-0 text-start">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
                {t('androidPlayProtectTitle')}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                {t('androidPlayProtectSubtitle')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="shrink-0 p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label={t('closeNotification')}
            >
              <X size={18} />
            </button>
          </div>

          <ol className="px-5 sm:px-6 py-4 space-y-3 text-sm font-bold text-slate-700 dark:text-slate-200 list-none">
            {[1, 2, 3, 4, 5].map((step) => (
              <li key={step} className="flex gap-3 text-start">
                <span className="shrink-0 w-7 h-7 rounded-lg bg-[#0B2345] text-white text-xs font-black flex items-center justify-center">
                  {step}
                </span>
                <span className="text-[13px] leading-relaxed font-semibold pt-0.5">
                  {t(`androidInstallStep${step}` as 'androidInstallStep1')}
                </span>
              </li>
            ))}
          </ol>

          <div className="mx-5 sm:mx-6 mb-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700">
            <p className="text-[11px] font-black text-[#0B2345] dark:text-indigo-300 flex items-center gap-1.5 mb-1">
              <ChevronDown size={14} className="rotate-180" />
              {t('androidPlayProtectMoreDetails')}
            </p>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              {t('androidPlayProtectNote')}
            </p>
          </div>

          <div className="px-5 sm:px-6 pb-5 sm:pb-6">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full py-3 rounded-2xl bg-[#0B2345] hover:bg-[#1a3a6b] text-white font-black text-sm flex items-center justify-center gap-2"
            >
              <Download size={16} />
              {t('androidInstallGuideDone')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
