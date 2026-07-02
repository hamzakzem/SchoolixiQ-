import React from 'react';
import { motion } from 'motion/react';
import { prefersReducedMotion } from '../../lib/motion';
import { LandingHeroMockup } from './LandingHeroMockup';

const TECH_ITEMS = [
  'إدارة الطلاب والملفات',
  'إدارة المعلمين والموظفين',
  'الحضور والانصراف',
  'الرسوم والمحاسبة',
  'التقارير والإحصائيات',
  'التواصل مع أولياء الأمور',
  'التقويم والأنشطة',
  'البوابة الذكية للتسريح',
];

export function LandingTechSection() {
  const reduced = prefersReducedMotion();

  return (
    <section id="about" className="landing-tech-section" aria-labelledby="landing-tech-heading">
      <div className="landing-tech-orbit" aria-hidden="true">
        <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="lp-orbit-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#d4af37" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#06182f" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="400" cy="200" r="180" fill="url(#lp-orbit-glow)" />
          <ellipse cx="400" cy="200" rx="220" ry="80" fill="none" stroke="rgba(212,175,55,0.2)" strokeWidth="1" />
          <ellipse cx="400" cy="200" rx="160" ry="120" fill="none" stroke="rgba(212,175,55,0.12)" strokeWidth="1" />
          {[
            [580, 200],
            [400, 80],
            [220, 200],
            [400, 320],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="4" fill="#d4af37" opacity="0.6">
              {!reduced && (
                <animate attributeName="opacity" values="0.4;1;0.4" dur={`${3 + i * 0.4}s`} repeatCount="indefinite" />
              )}
            </circle>
          ))}
        </svg>
      </div>

      <div className="lp-container relative">
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-48px' }}
          transition={{ duration: 0.45 }}
          className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center"
        >
          <div className="order-2 lg:order-1 relative">
            <div className="landing-mockup-glow" />
            <LandingHeroMockup compact />
          </div>
          <div className="order-1 lg:order-2">
            <p className="lp-eyebrow">التقنية</p>
            <h2 id="landing-tech-heading" className="lp-section-title lp-title-gold">
              نظام متكامل لإدارة مدرستك
            </h2>
            <p className="lp-section-subtitle">
              بنية حديثة وآمنة تربط كل أقسام المدرسة في منصة واحدة — بدون تعقيد.
            </p>
            <ul className="landing-tech-list mt-8 grid sm:grid-cols-2 gap-x-4">
              {TECH_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
