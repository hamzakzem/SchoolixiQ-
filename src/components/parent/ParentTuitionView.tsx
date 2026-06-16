import React, { useMemo } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Wallet,
} from 'lucide-react';
import { tuitionRemaining } from './parentUiHelpers';

type Props = {
  isRtl: boolean;
  t: (key: string) => string;
  language: string;
  student: any;
  payments: any[];
  installments: any[];
  escalation?: {
    restricted?: boolean;
    message?: string;
    studentName?: string;
  } | null;
};

export function ParentTuitionView({
  isRtl,
  t,
  language,
  student,
  payments,
  installments,
  escalation,
}: Props) {
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const remaining = tuitionRemaining(student);

  const nearestInstallment = useMemo(() => {
    return installments.find((i) => i.status !== 'paid') || installments[0];
  }, [installments]);

  const locale = language === 'ar' ? 'ar-IQ' : 'en-US';

  return (
    <div className="parent-tab space-y-6">
      <header>
        <h2 className="parent-page-title">
          {t('tuition')} — {student?.name}
        </h2>
        <p className="parent-page-subtitle">{isRtl ? 'ملخص الأقساط والمدفوعات' : 'Installments and payment summary'}</p>
      </header>

      {escalation && (
        <div
          className={`parent-warning-banner ${escalation.restricted ? 'parent-warning-banner--critical' : 'parent-warning-banner--amber'}`}
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="font-black text-sm">{escalation.studentName}</p>
              <p className="text-sm mt-1 opacity-90">{escalation.message}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="parent-tuition-stat">
          <span className="parent-tuition-stat__label">{isRtl ? 'المتبقي' : 'Remaining'}</span>
          <p className="parent-tuition-stat__value text-rose-600">{remaining.toLocaleString('ar-IQ')}</p>
          <span className="text-[10px] font-bold opacity-50">{t('iqd')}</span>
        </div>
        <div className="parent-tuition-stat">
          <span className="parent-tuition-stat__label">{isRtl ? 'المدفوع' : 'Paid'}</span>
          <p className="parent-tuition-stat__value text-emerald-600">{totalPaid.toLocaleString('ar-IQ')}</p>
          <span className="text-[10px] font-bold opacity-50">{t('iqd')}</span>
        </div>
        <div className="parent-tuition-stat col-span-2 lg:col-span-1">
          <span className="parent-tuition-stat__label">{isRtl ? 'إجمالي الرسوم' : 'Total fees'}</span>
          <p className="parent-tuition-stat__value">{(student?.totalTuition || 0).toLocaleString('ar-IQ')}</p>
          <span className="text-[10px] font-bold opacity-50">{t('iqd')}</span>
        </div>
        {nearestInstallment && (
          <div className="parent-tuition-stat col-span-2 lg:col-span-1">
            <span className="parent-tuition-stat__label">{isRtl ? 'أقرب قسط' : 'Next installment'}</span>
            <p className="parent-tuition-stat__value text-base">
              {nearestInstallment.dueDate?.seconds
                ? new Date(nearestInstallment.dueDate.seconds * 1000).toLocaleDateString(locale, {
                    month: 'short',
                    day: 'numeric',
                  })
                : '—'}
            </p>
            <span
              className={`parent-badge mt-1 ${
                nearestInstallment.status === 'late'
                  ? 'parent-badge--danger'
                  : nearestInstallment.status === 'paid'
                    ? 'parent-badge--success'
                    : ''
              }`}
            >
              {nearestInstallment.status === 'paid'
                ? 'تم الدفع'
                : nearestInstallment.status === 'late'
                  ? 'متأخر'
                  : isRtl
                    ? 'منتظر'
                    : 'Pending'}
            </span>
          </div>
        )}
      </div>

      {installments.length > 0 ? (
        <section className="space-y-3">
          <h3 className="parent-group-label">{t('upcomingInstallments')}</h3>
          {installments.map((inst) => (
            <div key={inst.id} className="parent-section-card flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    inst.status === 'paid'
                      ? 'bg-emerald-100 text-emerald-700'
                      : inst.status === 'late'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {inst.status === 'paid' ? (
                    <CheckCircle size={18} />
                  ) : inst.status === 'late' ? (
                    <AlertTriangle size={18} />
                  ) : (
                    <Calendar size={18} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{t('installmentFor')}</p>
                  <p className="text-[10px] text-[#0B2345]/45">
                    {inst.dueDate?.seconds
                      ? new Date(inst.dueDate.seconds * 1000).toLocaleDateString(locale)
                      : ''}
                  </p>
                </div>
              </div>
              <div className="text-end shrink-0">
                <p className="font-black text-sm tabular-nums">{inst.amount?.toLocaleString()} د.ع</p>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${
                    inst.status === 'paid'
                      ? 'bg-emerald-100 text-emerald-700'
                      : inst.status === 'late'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {inst.status === 'paid' ? 'تم الدفع' : inst.status === 'late' ? 'متأخر' : 'منتظر'}
                </span>
              </div>
            </div>
          ))}
        </section>
      ) : (
        <div className="parent-empty-state">
          <Wallet size={32} className="text-[#D4AF37] mb-3" aria-hidden />
          <p>{isRtl ? 'لا توجد أقساط مستحقة حالياً' : 'No installments due right now'}</p>
        </div>
      )}

      {payments.length > 0 && (
        <section className="space-y-3">
          <h3 className="parent-group-label">{t('paymentHistory')}</h3>
          {payments.map((payment) => (
            <div key={payment.id} className="parent-feed-card flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Wallet size={18} />
                </div>
                <div>
                  <p className="font-bold text-sm">{payment.type === 'tuition' ? 'قسط دراسي' : 'دفعة مالية'}</p>
                  <p className="text-[10px] text-[#0B2345]/45">
                    {payment.createdAt?.seconds
                      ? new Date(payment.createdAt.seconds * 1000).toLocaleString(locale)
                      : '—'}
                  </p>
                </div>
              </div>
              <p className="font-black text-emerald-600 tabular-nums">+{payment.amount?.toLocaleString()}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
