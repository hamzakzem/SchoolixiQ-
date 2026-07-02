import React from 'react';
import { motion } from 'motion/react';
import { prefersReducedMotion } from '../../lib/motion';
import type { LandingFeatureCard } from '../../lib/landingPageConfig';

function FeatureMiniMock({ featureId }: { featureId: string }) {
  const rows: Record<string, { label: string; value: string }[]> = {
    students: [
      { label: 'طلاب نشطون', value: '842' },
      { label: 'صفوف', value: '24' },
      { label: 'أولياء مرتبطون', value: '96%' },
    ],
    tuition: [
      { label: 'محصّل', value: '78%' },
      { label: 'متأخر', value: '12' },
      { label: 'هذا الشهر', value: '+4.2M' },
    ],
    attendance: [
      { label: 'حضور اليوم', value: '94%' },
      { label: 'غياب', value: '18' },
      { label: 'تأخر', value: '6' },
    ],
    announcements: [
      { label: 'تبليغات', value: '3 جديدة' },
      { label: 'مقروء', value: '128' },
      { label: 'عاجل', value: '1' },
    ],
    parent_app: [
      { label: 'ولي أمر', value: 'متصل' },
      { label: 'واجبات', value: '2' },
      { label: 'قسط', value: 'مدفوع' },
    ],
    reports: [
      { label: 'تقارير', value: '12' },
      { label: 'مالي', value: 'جاهز' },
      { label: 'تعليمي', value: 'محدّث' },
    ],
  };
  const data = rows[featureId] || rows.students;

  return (
    <div className="landing-feature-mock" aria-hidden="true">
      <div className="landing-feature-mock__bar">
        <span />
        <span />
        <span />
      </div>
      <div className="landing-feature-mock__body">
        {data.map((row) => (
          <div key={row.label} className="landing-feature-mock__row">
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </div>
        ))}
        <div className="landing-feature-mock__chart">
          {[35, 55, 40, 70, 50, 65].map((h, i) => (
            <div key={i} style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function LandingFeaturesShowcase({
  features,
  icons,
}: {
  features: LandingFeatureCard[];
  icons: Record<string, React.ElementType>;
}) {
  const reduced = prefersReducedMotion();

  return (
    <div className="landing-features-showcase space-y-6 lg:space-y-10">
      {features.map((card, idx) => {
        const Icon = icons[card.id] || icons.reports;
        const reversed = idx % 2 === 1;

        return (
          <motion.article
            key={card.id}
            initial={reduced ? {} : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: reduced ? 0 : 0.06 }}
            className={`landing-feature-row ${reversed ? 'landing-feature-row--reverse' : ''}`}
          >
            <div className="landing-feature-row__content">
              <div className="lp-icon-box">
                <Icon size={22} strokeWidth={1.5} />
              </div>
              <h3 className="landing-feature-row__title">{card.title}</h3>
              <p className="landing-feature-row__desc">{card.description}</p>
            </div>
            <div className="landing-feature-row__visual">
              <FeatureMiniMock featureId={card.id} />
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}
