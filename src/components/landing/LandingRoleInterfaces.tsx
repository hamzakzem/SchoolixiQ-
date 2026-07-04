import React from 'react';
import { motion } from 'motion/react';
import {
  BarChart3,
  Bell,
  CheckCircle2,
  LayoutDashboard,
  Smartphone,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { prefersReducedMotion } from '../../lib/motion';
import { LandingCircularLogo } from './LandingCircularLogo';
import { LandingFeatureSlider } from './LandingFeatureSlider';

function AdminDashboardMock() {
  return (
    <div className="lp-role-mock lp-role-mock--admin" aria-hidden="true">
      <div className="lp-role-mock__device lp-role-mock__device--laptop">
        <div className="lp-role-mock__chrome">
          <span /><span /><span />
          <em>admin.schoolixiq.com</em>
        </div>
        <div className="lp-role-mock__screen">
          <aside className="lp-role-mock__sidebar">
            {[LayoutDashboard, Users, Wallet, Bell, BarChart3].map((Icon, i) => (
              <div key={i} className={i === 0 ? 'is-active' : ''}>
                <Icon size={14} />
              </div>
            ))}
          </aside>
          <div className="lp-role-mock__main">
            <div className="lp-role-mock__header">
              <LandingCircularLogo size={28} />
              <span>لوحة المدرسة</span>
            </div>
            <div className="lp-role-mock__stats">
              {[
                { l: 'حضور', v: '94%', icon: UserCheck },
                { l: 'أقساط', v: '78%', icon: Wallet },
                { l: 'طلاب', v: '842', icon: Users },
              ].map(({ l, v, icon: Icon }) => (
                <div key={l} className="lp-role-mock__stat">
                  <Icon size={12} />
                  <strong>{v}</strong>
                  <small>{l}</small>
                </div>
              ))}
            </div>
            <div className="lp-role-mock__chart">
              {[38, 62, 45, 78, 52, 68, 44].map((h, i) => (
                <div key={i} style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="lp-role-mock__device lp-role-mock__device--phone-sm">
        <div className="lp-role-mock__phone-body">
          <p>تنبيهات</p>
          {['حضور — صف خامس', 'قسط مستحق'].map((t) => (
            <div key={t}>{t}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ParentAppMock() {
  return (
    <div className="lp-role-mock lp-role-mock--parent" aria-hidden="true">
      <div className="lp-role-mock__device lp-role-mock__device--phone">
        <div className="lp-role-mock__phone-notch" />
        <div className="lp-role-mock__phone-body lp-role-mock__phone-body--parent">
          <div className="lp-role-mock__parent-head">
            <LandingCircularLogo size={26} />
            <div>
              <strong>ولي الأمر</strong>
              <small>أحمد — الصف الخامس</small>
            </div>
          </div>
          {[
            { t: 'الحضور والغياب', active: true },
            { t: 'الواجبات', active: false },
            { t: 'الأقساط', active: false },
            { t: 'التسريح الآمن', active: false },
          ].map(({ t, active }) => (
            <div key={t} className={`lp-role-mock__parent-row ${active ? 'is-active' : ''}`}>
              {t}
            </div>
          ))}
          <div className="lp-role-mock__parent-pill">
            <CheckCircle2 size={10} />
            تسريح آمن — نشط
          </div>
        </div>
      </div>
      <div className="lp-role-mock__device lp-role-mock__device--tablet">
        <div className="lp-role-mock__tablet-body">
          <p>متابعة الأبناء</p>
          <div className="lp-role-mock__tablet-chart">
            {[55, 72, 48, 80].map((h, i) => (
              <div key={i} style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const ADMIN_FEATURES = [
  'إدارة الطلاب والكادر والصفوف',
  'الحضور والأقساط والرواتب',
  'تقارير وإحصائيات لحظية',
  'إعدادات المدرسة والصلاحيات',
];

const PARENT_FEATURES = [
  'متابعة الحضور والغياب يومياً',
  'الواجبات والدرجات والتبليغات',
  'دفع الأقساط ومتابعة الرصيد',
  'طلب التسريح الآمن من البوابة',
];

function RoleSlideCard({
  label,
  icon: Icon,
  mock,
  features,
}: {
  label: string;
  icon: React.ElementType;
  mock: React.ReactNode;
  features: string[];
}) {
  return (
    <article className="lp-role-card lp-role-card--slider">
      <div className="lp-role-card__frame" aria-hidden="true" />
      <div className="lp-role-card__body">
        <div className="lp-role-card__label">
          <Icon size={16} />
          {label}
        </div>
        {mock}
        <ul className="lp-role-card__list">
          {features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export function LandingRoleInterfaces() {
  const reduced = prefersReducedMotion();

  const slides = [
    {
      id: 'admin',
      label: 'واجهة إدارة المدرسة',
      content: (
        <RoleSlideCard
          label="واجهة إدارة المدرسة"
          icon={LayoutDashboard}
          mock={<AdminDashboardMock />}
          features={ADMIN_FEATURES}
        />
      ),
    },
    {
      id: 'parent',
      label: 'واجهة ولي الأمر',
      content: (
        <RoleSlideCard
          label="واجهة ولي الأمر"
          icon={Smartphone}
          mock={<ParentAppMock />}
          features={PARENT_FEATURES}
        />
      ),
    },
  ];

  return (
    <section id="interfaces" className="lp-role-section" aria-labelledby="lp-role-heading">
      <div className="lp-container">
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-48px' }}
          transition={{ duration: 0.45 }}
          className="text-center max-w-2xl mx-auto mb-8 lg:mb-12"
        >
          <p className="lp-eyebrow">واجهات احترافية</p>
          <h2 id="lp-role-heading" className="lp-section-title lp-title-gold">
            واجهات مصممة لكل دور
          </h2>
          <p className="lp-section-subtitle mx-auto">
            تجربة مخصّصة للإدارة المدرسية وولي الأمر — على الكمبيوتر والهاتف والتابلت.
          </p>
        </motion.div>

        <LandingFeatureSlider slides={slides} ariaLabel="عرض واجهات المدرسة وولي الأمر" />
      </div>
    </section>
  );
}
