import React from 'react';
import { AlertTriangle, Phone, X } from 'lucide-react';
import { motion } from 'motion/react';

type EscalationAlert = {
  restricted?: boolean;
  studentName?: string;
  message?: string;
  amount?: number;
  dueDate?: string;
  schoolPhone?: string;
};

type Banner = {
  id: string;
  title?: string;
  message?: string;
};

type Props = {
  escalation?: EscalationAlert | null;
  banners?: Banner[];
  isRtl: boolean;
  onDismissBanner?: (id: string) => void;
  onGoTuition?: () => void;
};

export function ParentTuitionWarning({
  escalation,
  banners = [],
  isRtl,
  onDismissBanner,
  onGoTuition,
}: Props) {
  return (
    <>
      {escalation ? (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`parent-warning-banner ${escalation.restricted ? 'parent-warning-banner--critical' : 'parent-warning-banner--amber'}`}
          dir={isRtl ? 'rtl' : 'ltr'}
          role="alert"
        >
          <div className="flex items-start gap-3">
            <div className="parent-warning-banner__icon shrink-0">
              <AlertTriangle size={22} aria-hidden />
            </div>
            <div className="flex-1 min-w-0">
              <p className="parent-warning-banner__eyebrow">
                {escalation.restricted
                  ? 'تنبيه عاجل — أقساط متأخرة'
                  : 'تذكير بقسط دراسي مستحق'}
              </p>
              <h3 className="font-black text-[#0B2345] dark:text-white text-sm mt-0.5">
                {escalation.studentName}
              </h3>
              <p className="text-sm text-[#0B2345]/75 dark:text-slate-300 mt-1 leading-relaxed">
                {escalation.message}
              </p>
              <div className="flex flex-wrap gap-3 mt-2 text-xs font-bold text-[#0B2345]/60">
                {escalation.amount != null && (
                  <span>المبلغ: {Number(escalation.amount).toLocaleString('ar-IQ')} د.ع</span>
                )}
                {escalation.dueDate && <span>الاستحقاق: {String(escalation.dueDate)}</span>}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {onGoTuition && (
                  <button type="button" onClick={onGoTuition} className="parent-action-btn parent-action-btn--sm">
                    {isRtl ? 'عرض الأقساط' : 'View tuition'}
                  </button>
                )}
                {escalation.schoolPhone && (
                  <a
                    href={`tel:${escalation.schoolPhone}`}
                    className="parent-action-btn parent-action-btn--sm parent-action-btn--outline inline-flex items-center gap-1.5"
                    aria-label={isRtl ? 'اتصال بالمدرسة' : 'Call school'}
                  >
                    <Phone size={14} />
                    {isRtl ? 'اتصل بالمدرسة' : 'Call school'}
                  </a>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}

      {banners.map((banner) => (
        <motion.div
          key={banner.id}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="parent-warning-banner parent-warning-banner--amber relative"
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          {onDismissBanner && (
            <button
              type="button"
              onClick={() => onDismissBanner(banner.id)}
              className="absolute top-3 end-3 parent-icon-btn"
              aria-label={isRtl ? 'إخفاء التنبيه' : 'Dismiss alert'}
            >
              <X size={14} />
            </button>
          )}
          <div className="flex items-start gap-3 pe-8">
            <div className="parent-warning-banner__icon shrink-0">
              <AlertTriangle size={20} aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="parent-warning-banner__eyebrow">{isRtl ? 'تنبيه الأقساط' : 'Tuition alert'}</p>
              <h3 className="font-bold text-sm text-[#0B2345] dark:text-white">{banner.title}</h3>
              <p className="text-sm text-[#0B2345]/70 mt-1">{banner.message}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </>
  );
}
