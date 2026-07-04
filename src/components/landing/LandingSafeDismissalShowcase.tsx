import React from 'react';
import { motion } from 'motion/react';
import { Building2, CheckCircle2, Lock, Shield, User, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { prefersReducedMotion } from '../../lib/motion';

const WORKFLOW_STEPS = [
  {
    id: 'request',
    icon: User,
    color: '#eab308',
    title: 'طلب تسريح',
    subtitle: 'ولي الأمر',
    detail: 'يرسل ولي الأمر طلباً رقمياً موثّقاً من التطبيق مع رمز QR صالح لمدة محدودة.',
  },
  {
    id: 'guard',
    icon: Shield,
    color: '#3b82f6',
    title: 'تأكيد الحارس',
    subtitle: 'البوابة',
    detail: 'الحارس يطابق بيانات الطالب وولي الأمر ويتحقق من الرمز قبل إرسال الطلب للإدارة.',
  },
  {
    id: 'manager',
    icon: Building2,
    color: '#22c55e',
    title: 'موافقة الإدارة',
    subtitle: 'المدير',
    detail: 'الإدارة تراجع السجل وتعتمد التسريح النهائي — سير عمل محكوم بصلاحيات واضحة.',
  },
  {
    id: 'done',
    icon: Lock,
    color: '#a855f7',
    title: 'تم التسريح',
    subtitle: 'مكتمل',
    detail: 'يُسجّل الخروج في النظام — شفافية كاملة للإدارة وولي الأمر مع سجل أحداث.',
  },
] as const;

type Props = {
  title?: string;
  subtitle?: string;
};

export function LandingSafeDismissalShowcase({
  title = 'نظام التسريح الآمن',
  subtitle = 'سير عمل Enterprise يحمي الطلاب وينظّم الخروج — من الطلب حتى الاعتماد النهائي.',
}: Props) {
  const reduced = prefersReducedMotion();

  return (
    <section id="smart-gate" className="lp-dismissal-section" aria-labelledby="lp-dismissal-heading">
      <div className="lp-container">
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <p className="lp-eyebrow">البوابة الذكية</p>
          <h2 id="lp-dismissal-heading" className="lp-section-title lp-title-gold">
            {title}
          </h2>
          <p className="lp-section-subtitle mx-auto">{subtitle}</p>
        </motion.div>

        <div className="lp-dismissal-layout">
          <motion.div
            initial={reduced ? {} : { opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lp-dismissal-visual"
          >
            <div className="lp-dismissal-visual__glow" aria-hidden="true" />
            <div className="lp-dismissal-visual__scene">
              <div className="lp-dismissal-visual__photo">
                <Shield size={48} className="text-[#d4af37] opacity-40" />
                <p>بوابة آمنة — تحقق قبل الخروج</p>
              </div>
              <div className="lp-dismissal-visual__badge">
                <CheckCircle2 size={14} />
                تم التسريح بنجاح
              </div>
            </div>
          </motion.div>

          <div className="lp-dismissal-flow">
            <div className="lp-dismissal-stepper" role="list" aria-label="مراحل التسريح الآمن">
              {WORKFLOW_STEPS.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={step.id}
                    role="listitem"
                    initial={reduced ? {} : { opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.08, duration: 0.35 }}
                    className="lp-dismissal-step"
                  >
                    {idx < WORKFLOW_STEPS.length - 1 && (
                      <span className="lp-dismissal-step__line" aria-hidden="true" />
                    )}
                    <div
                      className="lp-dismissal-step__node"
                      style={{ '--step-color': step.color } as React.CSSProperties}
                    >
                      <Icon size={20} aria-hidden="true" />
                    </div>
                    <div className="lp-dismissal-step__text">
                      <strong>{step.title}</strong>
                      <span className="lp-dismissal-step__role">{step.subtitle}</span>
                      <p>{step.detail}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="lp-dismissal-benefits">
              {[
                'تقليل الازدحام عند البوابة',
                'حماية الطلاب من التسليم الخاطئ',
                'سجل أحداث كامل للإدارة',
                'تنبيهات فورية لولي الأمر',
              ].map((b) => (
                <span key={b} className="lp-dismissal-benefit">
                  <CheckCircle2 size={12} />
                  {b}
                </span>
              ))}
            </div>

            <Link to="/login?mode=signup" className="lp-btn-gold inline-flex mt-6">
              اكتشف البوابة الذكية
              <ArrowLeft size={16} className="rotate-180" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
