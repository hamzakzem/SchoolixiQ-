import React from 'react';
import { motion } from 'motion/react';
import {
  BarChart3,
  Bell,
  LayoutDashboard,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { MOTION_EASE, prefersReducedMotion } from '../../lib/motion';

export function LandingHeroMockup({ compact = false }: { compact?: boolean }) {
  const reduced = prefersReducedMotion();

  return (
    <div className={`landing-mockup-stage ${compact ? 'landing-mockup-stage--compact' : ''}`}>
      <div className="landing-mockup-stage__glow" aria-hidden="true" />
      <div className="landing-mockup-stage__grid" aria-hidden="true" />

      <motion.div
        initial={reduced ? {} : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: MOTION_EASE }}
        className="landing-mockup-device landing-mockup-device--laptop"
      >
        <div className="landing-mockup-laptop__screen">
          <div className="landing-mockup-laptop__chrome">
            <span className="landing-mockup-dot landing-mockup-dot--red" />
            <span className="landing-mockup-dot landing-mockup-dot--amber" />
            <span className="landing-mockup-dot landing-mockup-dot--green" />
            <span className="landing-mockup-laptop__url">admin.schoolixiq.com</span>
          </div>
          <div className={`landing-mockup-laptop__ui ${compact ? 'landing-mockup-laptop__ui--compact' : ''}`}>
            <aside className="landing-mockup-sidebar">
              {[LayoutDashboard, Users, Wallet, Bell, BarChart3].map((Icon, i) => (
                <div key={i} className={`landing-mockup-sidebar__item ${i === 0 ? 'is-active' : ''}`}>
                  <Icon size={15} strokeWidth={1.5} />
                </div>
              ))}
            </aside>
            <div className="landing-mockup-dashboard">
              <p className="landing-mockup-dashboard__eyebrow">لوحة المدرسة</p>
              <p className="landing-mockup-dashboard__title">ملخص اليوم</p>
              <div className="landing-mockup-stats">
                {[
                  { l: 'حضور', icon: UserCheck, v: '94%' },
                  { l: 'أقساط', icon: Wallet, v: '78%' },
                  { l: 'تبليغات', icon: Bell, v: '3' },
                ].map(({ l, icon: Icon, v }) => (
                  <div key={l} className="landing-mockup-stat">
                    <Icon size={13} />
                    <span className="landing-mockup-stat__label">{l}</span>
                    <strong>{v}</strong>
                  </div>
                ))}
              </div>
              <div className="landing-mockup-feed">
                <p className="landing-mockup-feed__head">آخر النشاطات</p>
                {['تسجيل حضور — الصف الخامس', 'تذكير أقساط — ولي أمر', 'طلب تسريح — البوابة'].map((row) => (
                  <div key={row} className="landing-mockup-feed__row">
                    <span />
                    {row}
                  </div>
                ))}
              </div>
              <div className="landing-mockup-chart">
                {[42, 68, 48, 82, 58, 74, 52].map((h, i) => (
                  <div key={i} style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="landing-mockup-laptop__base">
          <div className="landing-mockup-laptop__hinge" />
        </div>
      </motion.div>

      {!compact && (
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 20, x: 12 }}
          whileInView={{ opacity: 1, y: 0, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.12, ease: MOTION_EASE }}
          className="landing-mockup-device landing-mockup-device--phone"
        >
          <div className="landing-mockup-phone__frame">
            <div className="landing-mockup-phone__notch" />
            <div className="landing-mockup-phone__screen">
              <p className="landing-mockup-phone__title">ولي الأمر</p>
              {['الحضور', 'واجب جديد', 'قسط'].map((t, i) => (
                <div key={t} className={`landing-mockup-phone__item ${i === 0 ? 'is-active' : ''}`}>
                  {t}
                </div>
              ))}
              <div className="landing-mockup-phone__pill">تسريح آمن ✓</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
