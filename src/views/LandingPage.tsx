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
  LogIn,
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
  type LandingFeatureCard,
} from '../lib/landingPageConfig';
import { useSystemConfig } from '../lib/SystemConfigContext';
import { hasConfiguredFooterPartners } from '../lib/footerPartners';
import { GlobalFooter } from '../components/GlobalFooter';
import SchoolixLogo from '../components/SchoolixLogo';
import { ThemeToggle } from '../components/ThemeToggle';
import { LanguageToggle } from '../components/LanguageToggle';
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
const BG = '#F7F8FA';
const MUTED = 'text-slate-600 dark:text-slate-400';
const SECTION_PY = 'py-20 lg:py-28';

const TRUST_PILLARS = [
  {
    icon: Lock,
    title: 'أمان وصلاحيات',
    description: 'تشفير Firebase وصلاحيات دقيقة لكل دور في المدرسة.',
  },
  {
    icon: LayoutDashboard,
    title: 'لوحة موحّدة',
    description: 'إدارة الطلاب والحضور والأقساط والتقارير من مكان واحد.',
  },
  {
    icon: Smartphone,
    title: 'تجربة متجاوبة',
    description: 'تعمل على الهاتف والتابلت والحاسوب — للإدارة ولأولياء الأمور.',
  },
];

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
  light = false,
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
      <h2
        className={`text-2xl sm:text-3xl lg:text-[2.35rem] font-black leading-[1.15] tracking-[-0.02em] ${light ? 'text-white' : 'text-[#0B2345] dark:text-white'}`}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={`mt-4 text-base sm:text-lg leading-[1.85] ${light ? 'text-slate-300' : MUTED}`}>{subtitle}</p>
      )}
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
        className="relative z-10 rounded-[1.5rem] border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#081220] shadow-[0_40px_80px_-24px_rgba(11,35,69,0.25)] overflow-hidden"
      >
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 dark:border-white/[0.06] bg-[#F7F8FA] dark:bg-white/[0.02]">
          <span className="w-2 h-2 rounded-full bg-red-300/80" />
          <span className="w-2 h-2 rounded-full bg-amber-300/80" />
          <span className="w-2 h-2 rounded-full bg-emerald-300/80" />
          <span className="mr-auto text-[9px] font-mono text-slate-400">admin.schoolixiq.com</span>
        </div>
        <div className="flex min-h-[280px] sm:min-h-[320px]">
          <div className="w-14 shrink-0 bg-[#07172E] flex flex-col items-center py-5 gap-3 border-l border-white/[0.04]">
            {[LayoutDashboard, Users, Wallet, Bell, BarChart3].map((Icon, i) => (
              <div
                key={i}
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${i === 0 ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'text-white/35'}`}
              >
                <Icon size={16} strokeWidth={1.5} />
              </div>
            ))}
          </div>
          <div className="flex-1 p-4 sm:p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">لوحة المدرسة</p>
            <p className="text-lg font-black text-[#0B2345] dark:text-white mt-0.5">ملخص اليوم</p>
            <div className="grid grid-cols-3 gap-2 mt-4 mb-4">
              {[
                { l: 'حضور', icon: UserCheck },
                { l: 'أقساط', icon: Wallet },
                { l: 'تبليغات', icon: Bell },
              ].map(({ l, icon: Icon }) => (
                <div
                  key={l}
                  className="rounded-xl border border-slate-100 dark:border-white/[0.06] p-2.5 bg-[#F7F8FA]/80 dark:bg-white/[0.02]"
                >
                  <Icon size={14} className="text-[#D4AF37] mb-1" />
                  <p className="text-[9px] font-bold text-slate-500">{l}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-slate-100 dark:border-white/[0.06] overflow-hidden">
              <div className="px-3 py-2 text-[9px] font-bold text-slate-500 bg-slate-50/80 dark:bg-white/[0.02]">
                آخر النشاطات
              </div>
              {['تسجيل حضور — الصف الخامس', 'تذكير أقساط — ولي أمر', 'طلب تسريح — البوابة'].map((row) => (
                <div
                  key={row}
                  className="flex items-center gap-2 px-3 py-2.5 border-b last:border-0 border-slate-50 dark:border-white/[0.04] text-[10px] font-medium text-slate-600 dark:text-slate-400"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shrink-0" />
                  <span className="truncate">{row}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={reduced ? {} : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="absolute -bottom-6 left-2 sm:left-4 z-20 w-[42%] max-w-[160px]"
      >
        <div className="rounded-[1.75rem] p-[3px] bg-slate-800 shadow-2xl">
          <div className="rounded-[1.6rem] overflow-hidden bg-[#07172E]">
            <div className="h-4 flex justify-center items-end">
              <div className="w-10 h-1 rounded-full bg-black/40" />
            </div>
            <div className="bg-[#F7F8FA] dark:bg-[#0a1525] px-2.5 pb-3 pt-1 space-y-1.5">
              <p className="text-[8px] font-black text-[#0B2345] dark:text-white px-1">ولي الأمر</p>
              {['حضور', 'واجب', 'قسط'].map((t) => (
                <div
                  key={t}
                  className="text-[8px] font-bold py-1.5 px-2 rounded-lg bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 text-slate-600"
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
  const [packages, setPackages] = useState<any[]>([]);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const reduced = prefersReducedMotion();

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
  const showPartners = config.showPartners || hasConfiguredFooterPartners(systemConfig);
  const popularIndex = pricingPlans.findIndex((p: any) => p.isPopular);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-[#D4AF37] animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen text-[#0B2345] dark:text-slate-100 antialiased selection:bg-[#D4AF37]/30 overflow-x-hidden"
      style={{ background: BG }}
      dir="rtl"
    >
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/70 dark:border-white/[0.06] bg-[#F7F8FA]/95 dark:bg-[#050a12]/95 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[4.25rem] flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 shrink-0 min-w-0">
            <SchoolixLogo size={32} />
            <span className="font-black text-sm sm:text-[15px] tracking-tight truncate">{systemConfig.appName}</span>
          </Link>
          <nav className="hidden lg:flex items-center gap-7 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
            {[
              ['#features', 'المميزات'],
              ['#audience', 'لمن؟'],
              ['#smart-gate', 'البوابة الذكية'],
              ...(config.showPricing ? [['#pricing', 'الباقات'] as const] : []),
              ...(config.showFaq ? [['#faq', 'الأسئلة'] as const] : []),
            ].map(([href, label]) => (
              <a key={href} href={href} className="hover:text-[#0B2345] dark:hover:text-white transition-colors">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1 shrink-0">
            <LanguageToggle />
            <ThemeToggle />
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center gap-1 px-3 py-2 text-[12px] sm:text-[13px] font-bold text-slate-600 dark:text-slate-400"
            >
              <LogIn size={14} />
              {config.secondaryCtaLabel || 'تسجيل الدخول'}
            </Link>
            <Link
              to="/login?mode=signup"
              className="px-3 sm:px-4 py-2 rounded-xl text-[12px] sm:text-[13px] font-bold text-white"
              style={{ background: NAVY }}
            >
              {config.primaryCtaLabel || 'ابدأ الآن'}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <SectionShell className={`relative ${SECTION_PY} overflow-hidden`}>
        <div
          className="absolute inset-0 pointer-events-none opacity-60 dark:opacity-30"
          style={{
            background: `radial-gradient(ellipse 80% 50% at 100% 0%, ${GOLD}18, transparent), radial-gradient(ellipse 60% 40% at 0% 100%, ${NAVY}12, transparent)`,
          }}
        />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="max-w-xl">
              {config.heroBadgeText && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#D4AF37]/30 bg-white dark:bg-white/[0.04] text-xs font-bold text-slate-600 dark:text-slate-300 mb-6">
                  <Sparkles size={12} style={{ color: GOLD }} />
                  {config.heroBadgeText}
                </div>
              )}
              <h1 className="text-[1.85rem] sm:text-[2.5rem] lg:text-[3rem] font-black leading-[1.12] tracking-[-0.03em] text-[#0B2345] dark:text-white">
                {config.heroTitle}
              </h1>
              <p className={`mt-5 text-base sm:text-lg lg:text-xl leading-[1.85] ${MUTED}`}>{config.heroSubtitle}</p>

              <div className="mt-8 flex flex-col xs:flex-row flex-wrap gap-3">
                <Link
                  to="/login?mode=signup"
                  className="inline-flex justify-center items-center px-8 py-3.5 rounded-2xl text-sm font-black text-[#0B2345] shadow-lg hover:opacity-95 transition-opacity"
                  style={{ background: GOLD }}
                >
                  {config.primaryCtaLabel || 'ابدأ الآن'}
                </Link>
                <Link
                  to="/login"
                  className="inline-flex justify-center items-center px-8 py-3.5 rounded-2xl text-sm font-bold border-2 border-[#0B2345]/15 dark:border-white/15 bg-white dark:bg-white/[0.04] hover:border-[#D4AF37]/50 transition-colors"
                >
                  {config.secondaryCtaLabel || 'تسجيل الدخول'}
                </Link>
              </div>
            </div>
            <div className="lg:pt-2 pb-8 lg:pb-0">
              {config.heroImageUrl ? (
                <img
                  src={config.heroImageUrl}
                  alt=""
                  className="rounded-3xl border border-slate-200/80 shadow-2xl w-full object-cover max-h-[440px]"
                  loading="lazy"
                />
              ) : (
                <HeroVisualStack />
              )}
            </div>
          </div>
        </div>
      </SectionShell>

      {/* Trust pillars — no fake numbers */}
      <SectionShell className="py-14 lg:py-16 bg-white dark:bg-[#070f1a] border-y border-slate-200/60 dark:border-white/[0.05]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-3 gap-6 lg:gap-8">
            {TRUST_PILLARS.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-[#F7F8FA] dark:bg-white/[0.02] p-6 lg:p-7 text-center sm:text-right hover:shadow-md transition-shadow"
              >
                <div
                  className="w-12 h-12 mx-auto sm:mx-0 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: `${GOLD}22`, color: NAVY }}
                >
                  <Icon size={22} strokeWidth={1.5} />
                </div>
                <h3 className="font-black text-base text-[#0B2345] dark:text-white mb-2">{title}</h3>
                <p className={`text-sm leading-[1.8] ${MUTED}`}>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionShell>

      {/* Features — StepUp-style grid */}
      <SectionShell id="features" className={SECTION_PY}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  className="group rounded-2xl lg:rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0a1525] p-6 lg:p-7 shadow-sm hover:shadow-[0_20px_40px_-16px_rgba(11,35,69,0.15)] hover:border-[#D4AF37]/30 transition-all duration-300"
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform"
                    style={{ background: `${GOLD}18`, color: NAVY }}
                  >
                    <Icon size={20} strokeWidth={1.5} />
                  </div>
                  <h3 className="font-black text-[17px] text-[#0B2345] dark:text-white mb-2">{card.title}</h3>
                  <p className={`text-sm leading-[1.85] ${MUTED}`}>{card.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </SectionShell>

      {/* Audience */}
      <SectionShell id="audience" className={`${SECTION_PY} bg-white dark:bg-[#070f1a] border-y border-slate-200/60 dark:border-white/[0.05]`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  className="rounded-2xl lg:rounded-3xl overflow-hidden border border-slate-200/80 dark:border-white/[0.08] bg-[#F7F8FA] dark:bg-[#0a1525] shadow-sm hover:shadow-lg transition-shadow"
                >
                  <div className={`h-2 bg-gradient-to-l ${role.accent}`} />
                  <div className="p-6">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/[0.06] border border-slate-100 dark:border-white/10 flex items-center justify-center mb-4">
                      <Icon size={18} className="text-[#0B2345] dark:text-[#D4AF37]" />
                    </div>
                    <h3 className="font-black text-base mb-2">{role.title}</h3>
                    <p className={`text-sm leading-[1.8] ${MUTED}`}>{role.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </SectionShell>

      {/* Problem / Solution */}
      <SectionShell className={SECTION_PY}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="التحول" title="من الفوضى إلى نظام واحد موثوق" />
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
            <div className="rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0a1525] p-8 lg:p-10">
              <p className="text-sm font-bold text-slate-500 mb-5">قبل SchoolixIQ</p>
              <ul className="space-y-4">
                {config.problemPoints.map((point) => (
                  <li key={point} className={`text-[15px] leading-[1.85] pr-4 border-r-2 border-slate-200 dark:border-white/10 ${MUTED}`}>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border-2 p-8 lg:p-10 bg-[#0B2345] text-white" style={{ borderColor: `${GOLD}44` }}>
              <p className="text-sm font-bold mb-5" style={{ color: GOLD }}>
                بعد SchoolixIQ
              </p>
              <ul className="space-y-4">
                {config.solutionPoints.map((point) => (
                  <li key={point} className="text-[15px] leading-[1.85] font-medium pr-4 border-r-2 border-[#D4AF37]/50 flex items-start gap-2">
                    <Check size={16} className="shrink-0 mt-1" style={{ color: GOLD }} />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </SectionShell>

      {/* Smart Gate */}
      <SectionShell id="smart-gate" className={`${SECTION_PY} bg-[#0B2345] text-white`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="البوابة الذكية" title={config.smartGateTitle} subtitle={config.smartGateDescription} light />
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
                    <p className="font-bold text-[15px]">{item.step}</p>
                    <p className="text-sm text-slate-400 mt-1">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-white/[0.04] p-6 lg:p-8">
              <Shield size={32} className="mb-4" style={{ color: GOLD }} />
              <p className="font-black text-lg mb-2">تسريح آمن ومنظم</p>
              <p className="text-sm text-slate-400 leading-[1.85]">
                تقليل الازدحام عند البوابة، حماية الطلاب، وشفافية كاملة للإدارة وأولياء الأمور.
              </p>
            </div>
          </div>
        </div>
      </SectionShell>

      {/* Parent App */}
      <SectionShell className={`${SECTION_PY} bg-white dark:bg-[#070f1a] border-t border-slate-200/60 dark:border-white/[0.05]`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="order-2 lg:order-1 flex justify-center">
            <PhoneMockup />
          </div>
          <div className="order-1 lg:order-2">
            <SectionHeader eyebrow="تطبيق ولي الأمر" title={config.parentAppTitle} subtitle={config.parentAppDescription} align="start" />
            <Link
              to="/login?mode=signup"
              className="inline-flex items-center gap-2 mt-2 px-6 py-3 rounded-xl text-sm font-bold text-white"
              style={{ background: NAVY }}
            >
              ابدأ الآن
              <ArrowLeft size={16} className="rotate-180" />
            </Link>
          </div>
        </div>
      </SectionShell>

      {/* Pricing — unchanged logic */}
      {config.showPricing && (
        <SectionShell id="pricing" className={SECTION_PY}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader eyebrow="الأسعار" title="اختر الباقة المناسبة" subtitle="شفافية كاملة — بدون رسوم مخفية." />
            <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-end max-w-5xl mx-auto">
              {pricingPlans.map((pkg: any, index: number) => {
                const popular = pkg.isPopular;
                const topFeatures = getPackageMarketingFeatures(pkg.permissions as PackagePermissions);
                const displayFeatures =
                  topFeatures.length > 0 ? topFeatures : (Array.isArray(pkg.features) ? pkg.features : []).slice(0, 5);
                const maxLabel = pkg.maxStudents > 0 ? `حتى ${pkg.maxStudents.toLocaleString('ar-IQ')} طالب` : 'طلاب غير محدود';
                const isCenter = popular || (popularIndex === -1 && index === 1);

                return (
                  <div
                    key={pkg.id}
                    className={`relative flex flex-col rounded-3xl transition-transform duration-200 ${
                      isCenter
                        ? 'md:-mt-4 p-9 border-2 bg-[#0B2345] text-white shadow-xl md:scale-[1.03] z-10'
                        : 'p-8 border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0a1525]'
                    }`}
                    style={isCenter ? { borderColor: GOLD } : undefined}
                  >
                    {isCenter && (
                      <span
                        className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-black text-[#0B2345] whitespace-nowrap"
                        style={{ background: GOLD }}
                      >
                        {popular ? 'الأكثر طلباً' : 'موصى به'}
                      </span>
                    )}
                    <h3 className="text-lg font-black">{pkg.name}</h3>
                    <p className={`text-sm mt-1 mb-6 ${isCenter ? 'text-slate-400' : MUTED}`}>{maxLabel}</p>
                    <p className="text-[2rem] font-black tabular-nums leading-none">{formatIqdPrice(pkg.priceMonthly)}</p>
                    <p className={`text-xs font-semibold mt-2 mb-8 ${isCenter ? 'text-slate-500' : 'text-slate-500'}`}>
                      شهرياً
                      {pkg.priceYearly > 0 && <span className="block mt-1">أو {formatIqdPrice(pkg.priceYearly)} / سنة</span>}
                    </p>
                    <ul className={`space-y-3 mb-10 flex-1 text-sm ${isCenter ? 'text-slate-300' : ''}`}>
                      {displayFeatures.map((f: string) => (
                        <li key={f} className="flex items-start gap-2.5 leading-relaxed">
                          <Check size={14} className={`shrink-0 mt-1 ${isCenter ? '' : 'text-[#0B2345] dark:text-[#D4AF37]'}`} style={isCenter ? { color: GOLD } : undefined} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link
                      to="/login?mode=signup"
                      className={`block text-center py-3.5 rounded-xl text-sm font-black transition-opacity hover:opacity-90 ${
                        isCenter ? 'text-[#0B2345]' : 'bg-[#0B2345] text-white dark:bg-white/10'
                      }`}
                      style={isCenter ? { background: GOLD } : undefined}
                    >
                      {isCenter ? 'ابدأ الآن' : 'اختر هذه الباقة'}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </SectionShell>
      )}

      {/* Testimonials — real config only */}
      {showTestimonials && (
        <SectionShell className={`${SECTION_PY} bg-white dark:bg-[#070f1a] border-t border-slate-200/60 dark:border-white/[0.05]`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader eyebrow="آراء العملاء" title="تجارب من الميدان" />
            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
              {config.testimonials.map((t) => (
                <figure key={t.id} className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-[#F7F8FA] dark:bg-[#0a1525] p-6 lg:p-8">
                  <blockquote className={`text-[15px] leading-[1.9] ${MUTED}`}>&ldquo;{t.quote}&rdquo;</blockquote>
                  <figcaption className="mt-6 pt-5 border-t border-slate-200/80 dark:border-white/10">
                    <p className="font-black">{t.name}</p>
                    <p className="text-xs font-semibold text-slate-500 mt-1">{t.role}</p>
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
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader eyebrow="الدعم" title="أسئلة شائعة" />
            <div className="divide-y divide-slate-200/80 dark:divide-white/10 border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-[#0a1525]">
              {config.faq.map((item) => {
                const open = openFaq === item.id;
                return (
                  <div key={item.id}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : item.id)}
                      className="w-full flex items-center justify-between gap-4 px-6 py-5 text-right text-[15px] font-bold hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {item.question}
                      <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
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
                          <div className={`px-6 pb-5 text-[15px] leading-[1.9] ${MUTED}`}>{item.answer}</div>
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
      <SectionShell className={`${SECTION_PY} border-t border-slate-200/60 dark:border-white/[0.05]`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl px-8 py-14 sm:px-12 sm:py-18 lg:px-16 text-center relative overflow-hidden" style={{ background: NAVY }}>
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{ background: `radial-gradient(circle at 80% 20%, ${GOLD}40, transparent 50%)` }}
            />
            <div className="relative">
              <Eyebrow>ابدأ اليوم</Eyebrow>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight max-w-xl mx-auto">
                جاهز لإدارة مدرستك بذكاء؟
              </h2>
              <p className="mt-4 text-slate-300 text-base leading-[1.85] max-w-md mx-auto">
                تجربة موحّدة للإدارة والمعلمين وأولياء الأمور.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/login?mode=signup"
                  className="w-full sm:w-auto inline-flex justify-center px-8 py-4 rounded-2xl text-sm font-black text-[#0B2345] min-w-[200px]"
                  style={{ background: GOLD }}
                >
                  {config.primaryCtaLabel || 'ابدأ الآن'}
                </Link>
                {config.showAppDownload && (
                  <button
                    type="button"
                    onClick={handleApkDownload}
                    className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-8 py-4 rounded-2xl text-sm font-bold border border-white/25 text-white hover:bg-white/5 min-w-[200px]"
                  >
                    <Download size={18} />
                    تحميل Android
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </SectionShell>

      {/* Partners footer */}
      <footer className="border-t border-slate-200/60 dark:border-white/[0.05] bg-white dark:bg-[#070f1a] pb-8">
        {config.footerMarketingText && (
          <div className={`max-w-6xl mx-auto px-4 py-8 text-center text-sm leading-[1.9] ${MUTED}`}>
            {config.footerMarketingText}
          </div>
        )}
        {showPartners && <GlobalFooter />}
      </footer>
    </div>
  );
}
