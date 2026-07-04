import React from 'react';
import { motion } from 'motion/react';
import { Building2, CheckCircle2, Lock, Shield, User, ArrowLeft } from 'lucide-react';
import { prefersReducedMotion } from '../../lib/motion';
import { LandingButton } from '../ui/LandingButton';
import { LandingFeatureSlider } from './LandingFeatureSlider';

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

function DismissalSlideCard({ step }: { step: (typeof WORKFLOW_STEPS)[number] }) {
  const Icon = step.icon;
  return (
    <div className="lp-dismissal-slide-card">
      <div className="lp-dismissal-slide-card__visual">
        <div className="lp-dismissal-visual__glow" aria-hidden="true" />
        <div
          className="lp-dismissal-step__node lp-dismissal-step__node--large"
          style={{ '--step-color': step.color } as React.CSSProperties}
        >
          <Icon size={28} aria-hidden="true" />
        </div>
        {step.id === 'done' && (
          <div className="lp-dismissal-visual__badge lp-dismissal-visual__badge--inline">
            <CheckCircle2 size={14} />
            تم التسريح بنجاح
          </div>
        )}
      </div>
      <div className="lp-dismissal-slide-card__body">
        <span className="lp-dismissal-step__role">{step.subtitle}</span>
        <strong>{step.title}</strong>
        <p>{step.detail}</p>
      </div>
    </div>
  );
}

export function LandingSafeDismissalShowcase({
  title = 'نظام التسريح الآمن',
  subtitle = 'سير عمل Enterprise يحمي الطلاب وينظّم الخروج — من الطلب حتى الاعتماد النهائي.',
}: Props) {
  const reduced = prefersReducedMotion();

  const slides = WORKFLOW_STEPS.map((step) => ({
    id: step.id,
    label: step.title,
    content: <DismissalSlideCard step={step} />,
  }));

  return (
    <section id="smart-gate" className="lp-dismissal-section" aria-labelledby="lp-dismissal-heading">
      <div className="lp-container">
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-8 lg:mb-12"
        >
          <p className="lp-eyebrow">البوابة الذكية</p>
          <h2 id="lp-dismissal-heading" className="lp-section-title lp-title-gold">
            {title}
          </h2>
          <p className="lp-section-subtitle mx-auto">{subtitle}</p>
        </motion.div>

        <LandingFeatureSlider slides={slides} ariaLabel="مراحل نظام التسريح الآمن" />

        <div className="lp-dismissal-benefits lp-dismissal-benefits--center">
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

        <div className="flex justify-center mt-8">
          <LandingButton
            to="/login?mode=signup"
            variant="primary"
            size="lg"
            icon={<ArrowLeft size={16} className="rotate-180" />}
          >
            اكتشف البوابة الذكية
          </LandingButton>
        </div>
      </div>
    </section>
  );
}
