import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  BarChart3,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  CreditCard,
  Download,
  GraduationCap,
  LayoutDashboard,
  Lock,
  Shield,
  Smartphone,
  Sparkles,
  Star,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  useLandingPageConfig,
  FALLBACK_PRICING_PACKAGES,
  formatIqdPrice,
  getPackageMarketingFeatures,
  resolveWhatsAppUrl,
  type LandingFeatureCard,
} from '../lib/landingPageConfig';
import { useSystemConfig } from '../lib/SystemConfigContext';
import { hasConfiguredFooterPartners } from '../lib/footerPartners';
import { GlobalFooter } from '../components/GlobalFooter';
import SchoolixLogo from '../components/SchoolixLogo';
import { LandingNavbar } from '../components/landing/LandingNavbar';
import { LandingWhatsAppFab } from '../components/landing/LandingWhatsAppFab';
import { LandingTechSection } from '../components/landing/LandingTechSection';
import {
  LandingPartnersSection,
  useLandingPartners,
} from '../components/landing/LandingPartnersSection';
import {
  ANDROID_APK_NOT_CONFIGURED_MSG_AR,
  resolveAndroidApkUrl,
  triggerAndroidApkDownload,
} from '../lib/androidApk';
import { MOTION_DURATION, MOTION_EASE, prefersReducedMotion } from '../lib/motion';
import { toast } from 'react-hot-toast';
import type { PackagePermissions } from '../lib/featureRegistry';

const NAVY = '#0B2345';
const GOLD = '#D4AF37';
const SECTION_PY = 'py-20 lg:py-28';

const FEATURE_STRIP_ICONS: Record<string, React.ElementType> = {
  reports: BarChart3,
  comms: Bell,
  manage: LayoutDashboard,
  ease: Sparkles,
  security: Lock,
};

const EXPLAINER_SECTIONS = [
  {
    id: 'central',
    icon: LayoutDashboard,
    title: 'إدارة مركزية',
    description: 'إدارة الطلاب، الصفوف، الكادر، الحضور، الأقساط، الجداول والملفات من مكان واحد.',
    mini: 'لوحة موحّدة للإدارة',
  },
  {
    id: 'comms',
    icon: Bell,
    title: 'تواصل أسرع',
    description: 'رسائل وتنبيهات فورية بين الإدارة والمعلمين وأولياء الأمور.',
    mini: 'تنبيهات لحظية',
  },
  {
    id: 'decisions',
    icon: BarChart3,
    title: 'قرارات أدق',
    description: 'تقارير لحظية تساعد الإدارة على متابعة الأداء المالي والتعليمي.',
    mini: 'تقارير وإحصائيات',
  },
  {
    id: 'responsive',
    icon: Smartphone,
    title: 'جاهز للهاتف والكمبيوتر',
    description: 'تجربة متجاوبة على الهاتف والتابلت والكمبيوتر.',
    mini: 'متجاوب بالكامل',
  },
] as const;

/** Six flagship features — synced with marketing requirements */
const SHOWCASE_FEATURE_IDS = [
  'students',
  'tuition',
  'attendance',
  'announcements',
  'parent_app',
  'reports',
] as const;

const SHOWCASE_FALLBACK: LandingFeatureCard[] = [
  { id: 'students', title: 'إدارة الطلاب', description: 'سجلات كاملة، صفوف، وربط أولياء الأمور في قاعدة بيانات واحدة.' },
  { id: 'tuition', title: 'الأقساط والتحصيل', description: 'متابعة الدفعات، التذكيرات، والتقارير المالية للإدارة وأولياء الأمور.' },
  { id: 'attendance', title: 'الحضور والغياب', description: 'تسجيل يومي دقيق مع تنبيهات فورية للإدارة وولي الأمر.' },
  { id: 'announcements', title: 'الإشعارات', description: 'تبليغات وإعلانات موثّقة تصل للمعلمين وأولياء الأمور في الوقت المناسب.' },
  { id: 'parent_app', title: 'تطبيق ولي الأمر', description: 'متابعة الحضور والواجبات والأقساط والتسريح من الهاتف.' },
  { id: 'reports', title: 'التقارير', description: 'لوحات وإحصائيات تدعم قرارات الإدارة اليومية.' },
];

const AUDIENCE_ROLES = [
  {
    id: 'admin',
    title: 'للمدير',
    description: 'لوحة شاملة للطلاب، الأقساط، الكادر، التقارير، والإعدادات.',
    icon: LayoutDashboard,
    accent: 'from-[#0B2345] to-[#153a6b]',
  },
  {
    id: 'teacher',
    title: 'للمعلم',
    description: 'حضور، واجبات، درجات، وتواصل مع الإدارة وأولياء الأمور.',
    icon: GraduationCap,
    accent: 'from-[#D4AF37] to-[#c9a030]',
  },
  {
    id: 'parent',
    title: 'لولي الأمر',
    description: 'متابعة الأبناء: حضور، أقساط، واجبات، وتبليغات في تطبيق واحد.',
    icon: Smartphone,
    accent: 'from-emerald-600 to-emerald-500',
  },
  {
    id: 'guard',
    title: 'للحارس / البوابة الذكية',
    description: 'تحقق التسريح، مسح الرمز، وسجل خروج آمن ومنظم.',
    icon: Shield,
    accent: 'from-slate-700 to-slate-600',
  },
];

const FEATURE_ICONS: Record<string, React.ElementType> = {
  students: Users,
  attendance: UserCheck,
  grades: GraduationCap,
  tuition: Wallet,
  payroll: CreditCard,
  homework: BookOpen,
  announcements: Bell,
  parent_app: Smartphone,
  smart_gate: Shield,
  reports: BarChart3,
  id_cards: Sparkles,
  marketplace: Star,
};

function SectionShell({
  id,
  children,
  className = '',
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = prefersReducedMotion();
  return (
    <motion.section
      id={id}
      className={className}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-48px' }}
      transition={{ duration: MOTION_DURATION.slow, ease: MOTION_EASE }}
    >
      {children}
    </motion.section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: GOLD }}>
      {children}
    </p>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = 'center',
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: 'center' | 'start';
  light?: boolean;
}) {
  return (
    <div className={`mb-12 lg:mb-16 max-w-2xl ${align === 'center' ? 'mx-auto text-center' : 'text-right'}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="lp-section-title">{title}</h2>
      {subtitle && <p className="lp-section-subtitle">{subtitle}</p>}
    </div>
  );
}

function HeroVisualStack() {
  const reduced = prefersReducedMotion();
  return (
    <div className="relative w-full max-w-[520px] mx-auto lg:mx-0 lg:mr-auto">
      <div
        className="absolute -top-8 -left-8 w-48 h-48 rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(circle, ${GOLD}40, transparent)` }}
      />
      <div
        className="absolute -bottom-6 -right-6 w-56 h-56 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(circle, ${NAVY}50, transparent)` }}
      />

      <motion.div
        initial={reduced ? {} : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: MOTION_EASE }}
        className="landing-mockup-laptop relative z-10 landing-fade-up"
      >
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[rgba(212,175,55,0.2)] bg-[#081f3d]">
          <span className="w-2 h-2 rounded-full bg-red-400/70" />
          <span className="w-2 h-2 rounded-full bg-amber-400/70" />
          <span className="w-2 h-2 rounded-full bg-emerald-400/70" />
          <span className="mr-auto text-[9px] font-mono text-[#94a3b8]">admin.schoolixiq.com</span>
        </div>
        <div className="flex min-h-[280px] sm:min-h-[320px]">
          <div className="w-14 shrink-0 bg-[#06182f] flex flex-col items-center py-5 gap-3 border-l border-[rgba(212,175,55,0.12)]">
            {[LayoutDashboard, Users, Wallet, Bell, BarChart3].map((Icon, i) => (
              <div
                key={i}
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${i === 0 ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'text-white/35'}`}
              >
                <Icon size={16} strokeWidth={1.5} />
              </div>
            ))}
          </div>
          <div className="flex-1 p-4 sm:p-5 bg-[#0b2345]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">لوحة المدرسة</p>
            <p className="text-lg font-black text-white mt-0.5">ملخص اليوم</p>
            <div className="grid grid-cols-3 gap-2 mt-4 mb-4">
              {[
                { l: 'حضور', icon: UserCheck },
                { l: 'أقساط', icon: Wallet },
                { l: 'تبليغات', icon: Bell },
              ].map(({ l, icon: Icon }) => (
                <div
                  key={l}
                  className="rounded-xl border border-[rgba(212,175,55,0.2)] p-2.5 bg-[#081f3d]"
                >
                  <Icon size={14} className="text-[#d4af37] mb-1" />
                  <p className="text-[9px] font-bold text-[#cbd5e1]">{l}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-[rgba(212,175,55,0.2)] overflow-hidden">
              <div className="px-3 py-2 text-[9px] font-bold text-[#94a3b8] bg-[#081f3d]">
                آخر النشاطات
              </div>
              {['تسجيل حضور — الصف الخامس', 'تذكير أقساط — ولي أمر', 'طلب تسريح — البوابة'].map((row) => (
                <div
                  key={row}
                  className="flex items-center gap-2 px-3 py-2.5 border-b last:border-0 border-[rgba(212,175,55,0.1)] text-[10px] font-medium text-[#cbd5e1]"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] shrink-0" />
                  <span className="truncate">{row}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 h-12 rounded-lg border border-[rgba(212,175,55,0.15)] bg-[#081f3d] flex items-end gap-1 px-2 pb-2">
              {[40, 65, 45, 80, 55, 70].map((h, i) => (
                <div key={i} className="flex-1 rounded-sm bg-[#d4af37]/60" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={reduced ? {} : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="landing-mockup-phone"
      >
        <div className="rounded-[1.75rem] p-[3px] bg-[#081f3d] border border-[rgba(212,175,55,0.3)] shadow-2xl">
          <div className="rounded-[1.6rem] overflow-hidden bg-[#06182f]">
            <div className="h-4 flex justify-center items-end">
              <div className="w-10 h-1 rounded-full bg-black/50" />
            </div>
            <div className="bg-[#0b2345] px-2.5 pb-3 pt-1 space-y-1.5">
              <p className="text-[8px] font-black text-white px-1">ولي الأمر</p>
              {['حضور', 'واجب', 'قسط'].map((t) => (
                <div
                  key={t}
                  className="text-[8px] font-bold py-1.5 px-2 rounded-lg bg-[#081f3d] border border-[rgba(212,175,55,0.2)] text-[#cbd5e1]"
                >
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[260px] sm:w-[280px]">
      <div className="absolute inset-x-6 -bottom-4 h-10 bg-[#0B2345]/10 blur-2xl rounded-full pointer-events-none" />
      <div className="relative rounded-[2.25rem] p-[4px] bg-gradient-to-b from-slate-600 to-slate-900 shadow-xl">
        <div className="rounded-[2rem] overflow-hidden bg-[#07172E]">
          <div className="h-7 flex items-center justify-center">
            <div className="w-16 h-4 rounded-full bg-black/40" />
          </div>
          <div className="bg-[#F7F8FA] dark:bg-[#0a1525] min-h-[340px] px-4 pb-6 pt-2">
            <div className="flex items-center gap-2 mb-6 pt-1">
              <SchoolixLogo size={32} />
              <div>
                <p className="text-sm font-black text-[#0B2345] dark:text-white">SchoolixIQ</p>
                <p className="text-[10px] text-slate-500 font-semibold">بوابة ولي الأمر</p>
              </div>
            </div>
            <div className="space-y-2">
              {['الحضور والغياب', 'الواجبات', 'الأقساط', 'التبليغات', 'التسريح الآمن'].map((item, i) => (
                <div
                  key={item}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-[12px] font-bold ${
                    i === 0
                      ? 'bg-[#0B2345] text-white'
                      : 'bg-white dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] text-[#0B2345] dark:text-slate-200'
                  }`}
                >
                  <span>{item}</span>
                  <ArrowLeft size={12} className="opacity-40 rotate-180" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { config, loading } = useLandingPageConfig();
  const { config: systemConfig } = useSystemConfig();
  const { successPartners, ourPartners } = useLandingPartners(systemConfig);
  const [packages, setPackages] = useState<any[]>([]);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const reduced = prefersReducedMotion();

  const navLinks = useMemo(() => {
    const links: { href: string; label: string }[] = [
      { href: '#hero', label: 'الرئيسية' },
      { href: '#features', label: 'المميزات' },
    ];
    if (config.showPricing) links.push({ href: '#pricing', label: 'الباقات' });
    links.push({ href: '#partners', label: 'الشركاء' });
    links.push({ href: '#about', label: 'عن المنصة' });
    links.push({ href: '#contact', label: 'تواصل معنا' });
    return links;
  }, [config.showPricing]);

  const featureStrip = config.featureStrip?.length ? config.featureStrip : [];

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'packages'),
      (snap) => {
        const rows = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p: any) => p.active !== false);
        setPackages(rows.length ? rows : FALLBACK_PRICING_PACKAGES);
      },
      () => setPackages(FALLBACK_PRICING_PACKAGES),
    );
    return () => unsub();
  }, []);

  const apkUrl = resolveAndroidApkUrl(systemConfig.androidApkUrl);

  const handleApkDownload = () => {
    if (!apkUrl) {
      toast.error(ANDROID_APK_NOT_CONFIGURED_MSG_AR);
      return;
    }
    triggerAndroidApkDownload(apkUrl);
  };

  const pricingPlans = useMemo(() => {
    const source = packages.length ? packages : FALLBACK_PRICING_PACKAGES;
    return source.slice(0, 3);
  }, [packages]);

  const showcaseFeatures = useMemo(() => {
    return SHOWCASE_FEATURE_IDS.map((id) => {
      const fromConfig = config.featureCards.find((c) => c.id === id);
      const fallback = SHOWCASE_FALLBACK.find((c) => c.id === id);
      return fromConfig || fallback!;
    });
  }, [config.featureCards]);

  const showTestimonials = config.showTestimonials && config.testimonials.length > 0;
  /** Super Admin footer partners always show when configured; landing toggle is an extra gate only when empty. */
  const showPartnerSections =
    hasConfiguredFooterPartners(systemConfig) || config.showPartners !== false;
  const popularIndex = pricingPlans.findIndex((p: any) => p.isPopular);

  if (loading) {
    return (
      <div className="landing-page min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#081f3d] border-t-[#d4af37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="landing-page min-h-screen antialiased selection:bg-[#D4AF37]/30 overflow-x-hidden" dir="rtl">
      <LandingNavbar
        appName={systemConfig.appName}
        links={navLinks}
        loginLabel={config.secondaryCtaLabel || 'تسجيل الدخول'}
        primaryLabel={config.primaryCtaLabel || 'ابدأ الآن مجاناً'}
        demoLabel={config.demoCtaLabel || 'احجز عرضاً مجانياً'}
      />

      {/* Hero */}
      <SectionShell id="hero" className="landing-hero">
        <div className="landing-hero__glow" />
        <div className="lp-container relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="max-w-xl order-1">
              {config.heroBadgeText && (
                <div className="landing-hero__badge">
                  <Sparkles size={12} style={{ color: GOLD }} />
                  {config.heroBadgeText}
                </div>
              )}
              <h1 className="landing-hero__title text-white">{config.heroTitle}</h1>
              <p className="landing-hero__subtitle">{config.heroSubtitle}</p>

              <div className="mt-8 flex flex-col sm:flex-row flex-wrap gap-3">
                <Link to="/login?mode=signup" className="lp-btn-gold">
                  {config.primaryCtaLabel || 'ابدأ الآن مجاناً'}
                </Link>
                <a href="#features" className="lp-btn-outline">
                  {config.exploreCtaLabel || 'استكشف المميزات'}
                </a>
              </div>
            </div>
            <div className="order-2 lg:pt-2 pb-8 lg:pb-0 relative">
              <div className="landing-mockup-glow" />
              {config.heroImageUrl ? (
                <img
                  src={config.heroImageUrl}
                  alt=""
                  className="rounded-3xl border border-[rgba(212,175,55,0.28)] shadow-2xl w-full object-cover max-h-[440px] landing-fade-up"
                  loading="lazy"
                />
              ) : (
                <HeroVisualStack />
              )}
            </div>
          </div>
        </div>
      </SectionShell>

      {/* Feature highlight strip */}
      {featureStrip.length > 0 && (
        <SectionShell className="landing-feature-strip">
          <div className="lp-container">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {featureStrip.map(({ id, title, description }, idx) => {
                const Icon = FEATURE_STRIP_ICONS[id] || Sparkles;
                return (
                  <motion.div
                    key={id}
                    initial={reduced ? {} : { opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.06, duration: 0.35 }}
                    className="landing-feature-strip__card lp-card"
                  >
                    <div className="landing-feature-strip__icon">
                      <Icon size={20} strokeWidth={1.5} />
                    </div>
                    <h3 className="font-black text-sm text-white mb-2">{title}</h3>
                    <p className="text-xs leading-[1.75] text-[#94a3b8]">{description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </SectionShell>
      )}

      {/* Features grid */}
      <SectionShell id="features" className={SECTION_PY}>
        <div className="lp-container">
          <SectionHeader
            eyebrow="خدماتنا"
            title="كل ما تحتاجه مدرستك في مكان واحد"
            subtitle="وحدات متكاملة للإدارة والمعلمين وأولياء الأمور — بدون أدوات متفرقة."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
            {showcaseFeatures.map((card, idx) => {
              const Icon = FEATURE_ICONS[card.id] || Sparkles;
              return (
                <motion.div
                  key={card.id}
                  initial={reduced ? {} : { opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05, duration: 0.35 }}
                  className="lp-card p-6 lg:p-7 hover:-translate-y-1 transition-transform duration-300"
                >
                  <div className="landing-feature-strip__icon !mx-0 mb-4">
                    <Icon size={20} strokeWidth={1.5} />
                  </div>
                  <h3 className="font-black text-[17px] text-white mb-2">{card.title}</h3>
                  <p className="text-sm leading-[1.85] text-[#94a3b8]">{card.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </SectionShell>

      {/* Explainer sections */}
      {config.showExplainerSections !== false && (
        <SectionShell className={`${SECTION_PY} border-t border-[rgba(212,175,55,0.2)] bg-[#081f3d]`}>
          <div className="lp-container">
            <SectionHeader
              eyebrow="لماذا SchoolixIQ"
              title="حلول عملية لإدارة يومية أسهل"
              subtitle="أربعة محاور تغطي احتياجات المدرسة الحديثة."
            />
            <div className="grid sm:grid-cols-2 gap-5 lg:gap-6">
              {EXPLAINER_SECTIONS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.id}
                    initial={reduced ? {} : { opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.07, duration: 0.35 }}
                    className="landing-explainer-card lp-card"
                  >
                    <div className="landing-feature-strip__icon !mx-0 mb-4">
                      <Icon size={20} strokeWidth={1.5} />
                    </div>
                    <h3 className="font-black text-lg text-white mb-2">{item.title}</h3>
                    <p className="text-sm leading-[1.85] text-[#cbd5e1]">{item.description}</p>
                    <div className="landing-explainer-mini">{item.mini}</div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </SectionShell>
      )}

      {/* Audience */}
      <SectionShell id="audience" className={`${SECTION_PY} border-t border-[rgba(212,175,55,0.2)]`}>
        <div className="lp-container">
          <SectionHeader
            eyebrow="لمن؟"
            title="منصة واحدة لكل أدوار المدرسة"
            subtitle="تجربة مخصّصة للمدير والمعلم وولي الأمر والحارس."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {AUDIENCE_ROLES.map((role) => {
              const Icon = role.icon;
              return (
                <div
                  key={role.id}
                  className="lp-card overflow-hidden hover:-translate-y-1 transition-transform"
                >
                  <div className={`h-2 bg-gradient-to-l ${role.accent}`} />
                  <div className="p-6">
                    <div className="w-10 h-10 rounded-xl bg-[#081f3d] border border-[rgba(212,175,55,0.2)] flex items-center justify-center mb-4">
                      <Icon size={18} className="text-[#d4af37]" />
                    </div>
                    <h3 className="font-black text-base mb-2 text-white">{role.title}</h3>
                    <p className="text-sm leading-[1.8] text-[#94a3b8]">{role.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </SectionShell>

      {/* Problem / Solution */}
      <SectionShell className={SECTION_PY}>
        <div className="lp-container">
          <SectionHeader eyebrow="التحول" title="من الفوضى إلى نظام واحد موثوق" />
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
            <div className="lp-card p-8 lg:p-10">
              <p className="text-sm font-bold text-[#94a3b8] mb-5">قبل SchoolixIQ</p>
              <ul className="space-y-4">
                {config.problemPoints.map((point) => (
                  <li key={point} className="text-[15px] leading-[1.85] pr-4 border-r-2 border-[rgba(212,175,55,0.2)] text-[#cbd5e1]">
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lp-card p-8 lg:p-10 border-[#d4af37]/40">
              <p className="text-sm font-bold mb-5 text-[#f2c866]">بعد SchoolixIQ</p>
              <ul className="space-y-4">
                {config.solutionPoints.map((point) => (
                  <li key={point} className="text-[15px] leading-[1.85] font-medium pr-4 border-r-2 border-[#D4AF37]/50 flex items-start gap-2 text-white">
                    <Check size={16} className="shrink-0 mt-1 text-[#d4af37]" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </SectionShell>

      {/* Smart Gate */}
      <SectionShell id="smart-gate" className={`${SECTION_PY} bg-[#081f3d] border-y border-[rgba(212,175,55,0.2)]`}>
        <div className="lp-container">
          <SectionHeader eyebrow="البوابة الذكية" title={config.smartGateTitle} subtitle={config.smartGateDescription} />
          <div className="grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-7 space-y-0">
              {[
                { step: 'ولي الأمر يطلب التسريح', detail: 'طلب رقمي موثّق من التطبيق' },
                { step: 'المعلم ينادي الطالب', detail: 'تنبيه فوري للصف والحارس' },
                { step: 'الحارس يتحقق من الرمز', detail: 'مسح QR — لا تسريح بدون تحقق' },
                { step: 'الإدارة تتابع السجل', detail: 'سجل كامل لحظي للإدارة' },
              ].map((item, idx) => (
                <div key={item.step} className="flex gap-5 pb-8 last:pb-0 relative">
                  {idx < 3 && <div className="absolute top-10 bottom-0 right-[15px] w-px bg-white/10" />}
                  <div
                    className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-black shrink-0 z-10"
                    style={{ borderColor: GOLD, color: GOLD, background: NAVY }}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-bold text-[15px] text-white">{item.step}</p>
                    <p className="text-sm text-[#94a3b8] mt-1">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="lg:col-span-5 lp-card p-6 lg:p-8">
              <Shield size={32} className="mb-4 text-[#d4af37]" />
              <p className="font-black text-lg mb-2 text-white">تسريح آمن ومنظم</p>
              <p className="text-sm text-[#94a3b8] leading-[1.85]">
                تقليل الازدحام عند البوابة، حماية الطلاب، وشفافية كاملة للإدارة وأولياء الأمور.
              </p>
            </div>
          </div>
        </div>
      </SectionShell>

      {/* Parent App */}
      <SectionShell className={`${SECTION_PY} border-t border-[rgba(212,175,55,0.2)]`}>
        <div className="lp-container grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="order-2 lg:order-1 flex justify-center">
            <PhoneMockup />
          </div>
          <div className="order-1 lg:order-2">
            <SectionHeader eyebrow="تطبيق ولي الأمر" title={config.parentAppTitle} subtitle={config.parentAppDescription} align="start" />
            <Link to="/login?mode=signup" className="lp-btn-gold mt-2">
              ابدأ الآن
              <ArrowLeft size={16} className="rotate-180" />
            </Link>
          </div>
        </div>
      </SectionShell>

      {/* Tech motion section */}
      {config.showTechSection !== false && <LandingTechSection />}

      {/* Pricing */}
      {config.showPricing && (
        <SectionShell id="pricing" className={SECTION_PY}>
          <div className="lp-container">
            <SectionHeader
              eyebrow="الأسعار"
              title={config.pricingTitle || 'اختر الباقة المناسبة لمدرستك'}
              subtitle={config.pricingSubtitle || 'جميع الباقات تشمل التحديثات والدعم الفني'}
            />
            <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-end max-w-5xl mx-auto">
              {pricingPlans.map((pkg: any, index: number) => {
                const popular = pkg.isPopular;
                const topFeatures = getPackageMarketingFeatures(pkg.permissions as PackagePermissions);
                const displayFeatures =
                  topFeatures.length > 0 ? topFeatures : (Array.isArray(pkg.features) ? pkg.features : []).slice(0, 5);
                const maxLabel = pkg.maxStudents > 0 ? `حتى ${pkg.maxStudents.toLocaleString('ar-IQ')} طالب` : 'طلاب غير محدود';
                const isCenter = popular || (popularIndex === -1 && index === 1);

                return (
                  <motion.div
                    key={pkg.id}
                    initial={reduced ? {} : { opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08, duration: 0.4 }}
                    className={`landing-pricing-card flex flex-col ${
                      isCenter
                        ? 'landing-pricing-card--featured md:-mt-4 md:scale-[1.03] z-10 text-white'
                        : 'lp-card text-white'
                    }`}
                  >
                    {isCenter && (
                      <span className="landing-pricing-badge">
                        {popular ? 'الأكثر اختياراً' : 'موصى به'}
                      </span>
                    )}
                    <h3 className="text-lg font-black">{pkg.name}</h3>
                    <p className={`text-sm mt-1 mb-6 ${isCenter ? 'text-[#94a3b8]' : 'text-[#94a3b8]'}`}>{maxLabel}</p>
                    <p className="text-[2rem] font-black tabular-nums leading-none text-[#f2c866]">{formatIqdPrice(pkg.priceMonthly)}</p>
                    <p className="text-xs font-semibold mt-2 mb-8 text-[#94a3b8]">
                      شهرياً
                      {pkg.priceYearly > 0 && <span className="block mt-1">أو {formatIqdPrice(pkg.priceYearly)} / سنة</span>}
                    </p>
                    <ul className="space-y-3 mb-10 flex-1 text-sm text-[#cbd5e1]">
                      {displayFeatures.map((f: string) => (
                        <li key={f} className="flex items-start gap-2.5 leading-relaxed">
                          <Check size={14} className="shrink-0 mt-1 text-[#d4af37]" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link
                      to="/login?mode=signup"
                      className={isCenter ? 'lp-btn-gold w-full text-center' : 'lp-btn-outline w-full text-center'}
                    >
                      ابدأ الآن
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </SectionShell>
      )}

      {/* Partners */}
      <LandingPartnersSection
        successPartners={successPartners}
        ourPartners={ourPartners}
        title={config.partnersTitle || 'شركاؤنا في النجاح'}
        subtitle={config.partnersSubtitle || 'مؤسسات ومدارس تثق بمنصة SchoolixIQ'}
        showPartners={showPartnerSections}
      />

      {/* Testimonials — real config only */}
      {showTestimonials && (
        <SectionShell className={`${SECTION_PY} border-t border-[rgba(212,175,55,0.2)] bg-[#081f3d]`}>
          <div className="lp-container">
            <SectionHeader eyebrow="آراء العملاء" title="تجارب من الميدان" />
            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
              {config.testimonials.map((t) => (
                <figure key={t.id} className="lp-card p-6 lg:p-8">
                  <blockquote className="text-[15px] leading-[1.9] text-[#cbd5e1]">&ldquo;{t.quote}&rdquo;</blockquote>
                  <figcaption className="mt-6 pt-5 border-t border-[rgba(212,175,55,0.2)]">
                    <p className="font-black text-white">{t.name}</p>
                    <p className="text-xs font-semibold text-[#94a3b8] mt-1">{t.role}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </SectionShell>
      )}

      {/* FAQ */}
      {config.showFaq && config.faq.length > 0 && (
        <SectionShell id="faq" className={SECTION_PY}>
          <div className="lp-container max-w-2xl">
            <SectionHeader eyebrow="الدعم" title="أسئلة شائعة" />
            <div className="divide-y divide-[rgba(212,175,55,0.15)] border border-[rgba(212,175,55,0.28)] rounded-2xl overflow-hidden lp-card">
              {config.faq.map((item) => {
                const open = openFaq === item.id;
                return (
                  <div key={item.id}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : item.id)}
                      className="w-full flex items-center justify-between gap-4 px-6 py-5 text-right text-[15px] font-bold text-white hover:bg-[#081f3d] transition-colors"
                    >
                      {item.question}
                      <ChevronDown size={18} className={`shrink-0 text-[#94a3b8] transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div
                          initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
                          transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-5 text-[15px] leading-[1.9] text-[#cbd5e1]">{item.answer}</div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </SectionShell>
      )}

      {/* Final CTA */}
      <SectionShell className={`${SECTION_PY} border-t border-[rgba(212,175,55,0.2)]`}>
        <div className="lp-container">
          <div className="lp-card px-8 py-14 sm:px-12 sm:py-16 lg:px-16 text-center relative overflow-hidden border-[#d4af37]/35">
            <div
              className="absolute inset-0 opacity-40 pointer-events-none"
              style={{ background: `radial-gradient(circle at 80% 20%, ${GOLD}30, transparent 50%)` }}
            />
            <div className="relative">
              <Eyebrow>ابدأ اليوم</Eyebrow>
              <h2 className="lp-section-title max-w-xl mx-auto">
                {config.finalCtaTitle || 'جاهز لإدارة مدرستك بذكاء؟'}
              </h2>
              <p className="lp-section-subtitle max-w-md mx-auto">
                {config.finalCtaSubtitle || 'تجربة موحّدة للإدارة والمعلمين وأولياء الأمور.'}
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/login?mode=signup" className="lp-btn-gold w-full sm:w-auto min-w-[200px]">
                  {config.primaryCtaLabel || 'ابدأ الآن مجاناً'}
                </Link>
                {config.showAppDownload && (
                  <button
                    type="button"
                    onClick={handleApkDownload}
                    className="lp-btn-outline w-full sm:w-auto min-w-[200px]"
                  >
                    <Download size={18} />
                    تحميل Android
                  </button>
                )}
                <a
                  href={resolveWhatsAppUrl(config.whatsappNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lp-btn-outline w-full sm:w-auto min-w-[200px]"
                >
                  تواصل عبر واتساب
                </a>
              </div>
            </div>
          </div>
        </div>
      </SectionShell>

      <LandingWhatsAppFab whatsappNumber={config.whatsappNumber} />

      {/* Footer */}
      <footer id="contact" className="landing-footer-wrap pb-8">
        {config.footerMarketingText && (
          <div className="lp-container py-8 text-center text-sm leading-[1.9] text-[#94a3b8]">
            {config.footerMarketingText}
          </div>
        )}
        <GlobalFooter compact={false} showPartnerSections={showPartnerSections} />
      </footer>
    </div>
  );
}
