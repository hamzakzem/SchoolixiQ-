import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, BadgePercent, Handshake, LineChart, Ticket, Users } from 'lucide-react';
import { prefersReducedMotion } from '../../lib/motion';
import { LandingCircularLogo } from './LandingCircularLogo';

const DEFAULT_FEATURES = [
  { icon: Ticket, text: 'كوبونات تسويقية لربط المدارس بالمنصة' },
  { icon: LineChart, text: 'عمولات شهرية شفافة على الاشتراكات' },
  { icon: BadgePercent, text: 'متابعة أداء المدارس المرتبطة من لوحة الموزع' },
  { icon: Handshake, text: 'دعم مخصص وموافقة إدارية قبل تفعيل الحساب' },
];

export function LandingDistributorSection({
  title = 'برنامج الموزعين المعتمدين',
  subtitle = 'انضم كشريك توزيع لـ SchoolixIQ — سجّل مدارس جديدة، استخدم الكوبونات، وتابع عمولاتك الشهرية من لوحة مخصصة.',
  features = DEFAULT_FEATURES.map((f) => f.text),
  show = true,
}: {
  title?: string;
  subtitle?: string;
  features?: string[];
  show?: boolean;
}) {
  const reduced = prefersReducedMotion();
  if (!show) return null;

  const icons = [Ticket, LineChart, BadgePercent, Handshake];

  return (
    <section id="distributors" className="lp-distributor-section" aria-labelledby="landing-distributor-heading">
      <div className="lp-container">
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="lp-distributor-card"
        >
          <span className="lp-distributor-card__frame" aria-hidden="true" />
          <div className="lp-distributor-card__body">
            <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-center">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <LandingCircularLogo size={48} />
                  <div>
                    <p className="lp-eyebrow mb-0">للموزعين</p>
                    <h2 id="landing-distributor-heading" className="lp-section-title text-[#f2c866] text-xl lg:text-2xl">
                      {title}
                    </h2>
                  </div>
                </div>
                <p className="lp-section-subtitle max-w-xl">{subtitle}</p>
                <ul className="mt-6 grid sm:grid-cols-2 gap-3">
                  {features.slice(0, 4).map((text, i) => {
                    const Icon = icons[i] || Handshake;
                    return (
                      <li key={text} className="flex items-start gap-2.5 text-sm text-[#cbd5e1]">
                        <span className="w-8 h-8 shrink-0 rounded-lg bg-[#081f3d] border border-[rgba(212,175,55,0.25)] flex items-center justify-center text-[#d4af37]">
                          <Icon size={15} />
                        </span>
                        <span className="leading-[1.7] pt-1">{text}</span>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-6 flex items-center gap-2 text-xs text-[#8b9cb3]">
                  <Users size={14} className="text-[#d4af37]" />
                  شبكة موزعين معتمدين في العراق — توسّع معنا
                </div>
              </div>
              <div className="flex flex-col gap-3 lg:min-w-[240px]">
                <Link to="/login?panel=distributor" className="lp-btn-gold w-full text-center">
                  سجّل كموزع معتمد
                  <ArrowLeft size={16} className="rotate-180" />
                </Link>
                <Link to="/login" className="lp-btn-outline w-full text-center text-sm">
                  لديك حساب؟ تسجيل الدخول
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
