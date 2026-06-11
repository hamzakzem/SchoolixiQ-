import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
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
  Minus,
  Shield,
  Smartphone,
  Sparkles,
  Star,
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
const GOLD = '#D4A64A';
const MUTED = 'text-slate-600 dark:text-slate-400';
const SECTION_PY = 'py-24 lg:py-32';

const PLATFORM_STATS = [
  { label: 'مدارس', value: '120+' },
  { label: 'طلاب', value: '45,000+' },
  { label: 'مستخدمون', value: '18,000+' },
  { label: 'تقارير يومية', value: '2,500+' },
];

const TRUST_BADGES = ['تشفير آمن', 'صلاحيات دقيقة', 'دعم عربي', 'Firebase Auth'];

const FEATURE_ICONS: Record<string, React.ElementType> = {
  students: Users,
  attendance: Check,
  grades: GraduationCap,
  tuition: Wallet,
  payroll: CreditCard,
  homework: BookOpen,
  announcements: Bell,
  parent_app: Smartphone,
  smart_gate: Shield,
  reports: LayoutDashboard,
  id_cards: Sparkles,
  marketplace: Star,
};

function groupFeatureCards(cards: LandingFeatureCard[]) {
  const parent = cards.filter((c) => c.id === 'parent_app');
  const gate = cards.filter((c) => c.id === 'smart_gate');
  const core = cards.filter((c) => c.id !== 'parent_app' && c.id !== 'smart_gate');
  return { core, parent, gate };
}

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
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: MOTION_DURATION.slow, ease: MOTION_EASE }}
    >
      {children}
    </motion.section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold tracking-[0.22em] uppercase mb-4" style={{ color: GOLD }}>
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
}) {
  return (
    <div className={`mb-14 lg:mb-20 max-w-2xl ${align === 'center' ? 'mx-auto text-center' : 'text-right'}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="text-2xl sm:text-3xl lg:text-[2.125rem] font-black leading-[1.2] text-[#0B2345] dark:text-white tracking-[-0.02em]">
        {title}
      </h2>
      {subtitle && <p className={`mt-5 text-base sm:text-lg leading-[1.9] ${MUTED}`}>{subtitle}</p>}
    </div>
  );
}

function FeatureRow({
  card,
  compact = false,
}: {
  card: LandingFeatureCard;
  compact?: boolean;
}) {
  const Icon = FEATURE_ICONS[card.id] || Sparkles;
  return (
    <div
      className={`group flex gap-5 ${compact ? 'p-5' : 'p-6 lg:p-7'} rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0a1525] hover:border-[#D4A64A]/25 transition-all duration-200 hover:shadow-[0_8px_30px_-12px_rgba(11,35,69,0.12)]`}
    >
      <div className="w-10 h-10 shrink-0 rounded-lg border border-slate-100 dark:border-white/10 flex items-center justify-center text-[#0B2345] dark:text-[#D4A64A]">
        <Icon size={18} strokeWidth={1.5} />
      </div>
      <div className="min-w-0">
        <h3 className="font-black text-[16px] tracking-tight text-[#0B2345] dark:text-white mb-1.5">{card.title}</h3>
        <p className={`text-sm leading-[1.85] ${MUTED}`}>{card.description}</p>
      </div>
    </div>
  );
}

/** Realistic admin dashboard mockup */
function HeroVisualStack() {
  const reduced = prefersReducedMotion();
  const enter = reduced
    ? { opacity: 1 }
    : { opacity: 0, y: 16 };
  const animate = { opacity: 1, y: 0 };

  return (
    <div className="relative w-full max-w-[540px] mx-auto lg:mx-0 lg:mr-auto">
      <motion.div
        initial={enter}
        animate={animate}
        transition={{ duration: 0.45, ease: MOTION_EASE }}
        className="relative z-10 rounded-[1.25rem] border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#081220] shadow-[0_32px_80px_-24px_rgba(11,35,69,0.22)] overflow-hidden"
      >
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/90 dark:bg-white/[0.02]">
          <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
          <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
          <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
          <span className="mr-auto text-[9px] font-mono text-slate-400">admin.schoolixiq.com</span>
        </div>
        <div className="flex min-h-[300px] sm:min-h-[340px]">
          <div className="w-[52px] shrink-0 bg-[#07172E] flex flex-col items-center py-5 gap-2.5 border-l border-white/[0.04]">
            {[LayoutDashboard, Users, Wallet, Bell, Shield].map((Icon, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-md flex items-center justify-center ${i === 0 ? 'bg-[#D4A64A]/15 text-[#D4A64A]' : 'text-white/30'}`}
              >
                <Icon size={14} strokeWidth={1.5} />
              </div>
            ))}
          </div>
          <div className="flex-1 p-4 sm:p-5">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">اليوم</p>
                <p className="text-base font-black text-[#0B2345] dark:text-white mt-0.5">ملخص المدرسة</p>
              </div>
              <span className="text-[9px] font-bold px-2 py-1 rounded border border-[#D4A64A]/30 text-[#D4A64A] bg-[#D4A64A]/5">
                LIVE
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { l: 'حضور', v: '94%', w: 94 },
                { l: 'تحصيل', v: '87%', w: 87 },
                { l: 'غياب', v: '6', w: 20 },
              ].map((s) => (
                <div key={s.l} className="rounded-lg border border-slate-100 dark:border-white/[0.06] p-2.5">
                  <p className="text-[9px] text-slate-500 font-semibold">{s.l}</p>
                  <p className="text-sm font-black tabular-nums mt-1">{s.v}</p>
                  <div className="mt-2 h-0.5 rounded-full bg-slate-100 dark:bg-white/10">
                    <div className="h-full rounded-full bg-[#D4A64A]" style={{ width: `${s.w}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-slate-100 dark:border-white/[0.06] overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-white/[0.06] text-[9px] font-bold text-slate-500">
                آخر النشاطات
              </div>
              {['تسجيل حضور — الصف الخامس', 'دفعة أقساط — ولي أمر', 'طلب تسريح — بوابة A'].map((row, i) => (
                <div key={row} className="flex items-center gap-2 px-3 py-2.5 border-b last:border-0 border-slate-50 dark:border-white/[0.04]">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${i === 2 ? 'bg-[#D4A64A]' : 'bg-slate-300 dark:bg-slate-600'}`} />
                  <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 truncate">{row}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Phone */}
      <motion.div
        initial={reduced ? {} : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08, ease: MOTION_EASE }}
        className="absolute -bottom-8 left-0 sm:left-2 z-20 w-[38%] max-w-[168px]"
      >
        <div className="rounded-[1.6rem] p-[3px] bg-slate-800 dark:bg-slate-700 shadow-2xl">
          <div className="rounded-[1.45rem] overflow-hidden bg-[#07172E]">
            <div className="h-4 flex justify-center items-end pb-0.5">
              <div className="w-10 h-1 rounded-full bg-black/40" />
            </div>
            <div className="bg-[#fafbfc] dark:bg-[#0a1525] px-2.5 pb-3 pt-1 space-y-1.5">
              <p className="text-[8px] font-black text-[#0B2345] dark:text-white px-1">ولي الأمر</p>
              {['حضور ✓', 'واجب جديد', 'تسريح'].map((t) => (
                <div key={t} className="text-[8px] font-bold py-1.5 px-2 rounded-md bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 text-slate-600 dark:text-slate-300">
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Gate chip */}
      <motion.div
        initial={reduced ? {} : { opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, delay: 0.14, ease: MOTION_EASE }}
        className="absolute top-6 -right-1 sm:right-0 z-30 rounded-lg border border-[#D4A64A]/25 bg-white dark:bg-[#0a1525] shadow-lg px-3 py-2 max-w-[180px]"
      >
        <div className="flex items-center gap-2">
          <Shield size={13} className="text-[#D4A64A]" strokeWidth={2} />
          <div>
            <p className="text-[9px] font-black text-[#0B2345] dark:text-white">البوابة الذكية</p>
            <p className="text-[8px] text-slate-500">847 تسريح اليوم</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[280px] sm:w-[300px]">
      <div className="absolute inset-x-8 -bottom-6 h-12 bg-[#0B2345]/10 dark:bg-black/30 blur-2xl rounded-full pointer-events-none" />
      <div className="relative rounded-[2.5rem] p-[5px] bg-gradient-to-b from-slate-700 to-slate-900 shadow-[0_40px_80px_-30px_rgba(11,35,69,0.45)]">
        <div className="rounded-[2.15rem] overflow-hidden bg-[#07172E]">
          <div className="h-8 flex items-center justify-center">
            <div className="w-[72px] h-[18px] rounded-full bg-black/50" />
          </div>
          <div className="bg-[#fafbfc] dark:bg-[#0a1525] min-h-[380px] px-5 pb-8 pt-2">
            <div className="flex items-center gap-3 mb-8 pt-2">
              <SchoolixLogo size={36} />
              <div>
                <p className="text-sm font-black text-[#0B2345] dark:text-white">SchoolixIQ</p>
                <p className="text-[11px] text-slate-500 font-semibold">بوابة ولي الأمر</p>
              </div>
            </div>
            <div className="space-y-2">
              {['الحضور والغياب', 'الواجبات', 'الأقساط', 'التبليغات', 'التسريح الآمن'].map((item, i) => (
                <div
                  key={item}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-[13px] font-bold ${
                    i === 0
                      ? 'bg-[#0B2345] text-white shadow-md'
                      : 'bg-white dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] text-[#0B2345] dark:text-slate-200'
                  }`}
                >
                  <span>{item}</span>
                  <ArrowLeft size={14} className="opacity-35 rotate-180" strokeWidth={2} />
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

  const featureGroups = useMemo(() => groupFeatureCards(config.featureCards), [config.featureCards]);

  const showTestimonials = config.showTestimonials && config.testimonials.length > 0;

  const popularIndex = pricingPlans.findIndex((p: any) => p.isPopular);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafbfc] dark:bg-[#050a12] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-[#D4A64A] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafbfc] dark:bg-[#050a12] text-[#0B2345] dark:text-slate-100 antialiased selection:bg-[#D4A64A]/30" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/60 dark:border-white/[0.05] bg-[#fafbfc]/95 dark:bg-[#050a12]/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-[4.5rem] flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <SchoolixLogo size={34} />
            <span className="font-black text-[15px] tracking-tight hidden sm:block">{systemConfig.appName}</span>
          </Link>
          <nav className="hidden lg:flex items-center gap-8 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
            {[['#features', 'المميزات'], ['#smart-gate', 'البوابة الذكية'], ...(config.showPricing ? [['#pricing', 'الباقات'] as const] : []), ...(config.showFaq ? [['#faq', 'الأسئلة'] as const] : [])].map(
              ([href, label]) => (
                <a key={href} href={href} className="hover:text-[#0B2345] dark:hover:text-white transition-colors">
                  {label}
                </a>
              ),
            )}
          </nav>
          <div className="flex items-center gap-1.5">
            <LanguageToggle />
            <ThemeToggle />
            <Link to="/login" className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-bold text-slate-600 dark:text-slate-400 hover:text-[#0B2345] dark:hover:text-white">
              <LogIn size={15} strokeWidth={2} />
              {config.secondaryCtaLabel}
            </Link>
            <Link to="/login?mode=signup" className="px-4 py-2 rounded-lg text-[13px] font-bold bg-[#0B2345] text-white dark:bg-[#D4A64A] dark:text-[#0B2345]">
              {config.primaryCtaLabel}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <SectionShell className={`relative ${SECTION_PY} overflow-hidden`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1fr_1.05fr] gap-16 lg:gap-20 items-center">
            <div className="max-w-[700px]">
              {config.heroBadgeText && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-400 mb-8">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4A64A]" />
                  {config.heroBadgeText}
                </div>
              )}
              <h1 className="text-[2rem] sm:text-[2.75rem] lg:text-[3.25rem] font-black leading-[1.12] tracking-[-0.03em] text-[#0B2345] dark:text-white">
                {config.heroTitle}
              </h1>
              <p className={`mt-6 text-lg sm:text-xl leading-[1.9] max-w-[600px] ${MUTED}`}>{config.heroSubtitle}</p>

              <div className="mt-10 flex flex-col sm:flex-row flex-wrap gap-3">
                <Link
                  to="/login?mode=signup"
                  className="inline-flex justify-center items-center px-7 py-3.5 rounded-xl text-sm font-bold bg-[#0B2345] text-white dark:bg-[#D4A64A] dark:text-[#0B2345] shadow-[0_4px_20px_-4px_rgba(11,35,69,0.35)] hover:opacity-[0.92] transition-opacity"
                >
                  {config.primaryCtaLabel}
                </Link>
                <Link
                  to="/login"
                  className="inline-flex justify-center items-center px-7 py-3.5 rounded-xl text-sm font-bold border border-slate-200 dark:border-white/15 hover:border-[#D4A64A]/40 transition-colors"
                >
                  {config.secondaryCtaLabel}
                </Link>
              </div>

              <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 pt-10 border-t border-slate-200/80 dark:border-white/[0.06]">
                {PLATFORM_STATS.map((s) => (
                  <div key={s.label}>
                    <p className="text-xl sm:text-2xl font-black tabular-nums tracking-tight text-[#0B2345] dark:text-white">{s.value}</p>
                    <p className="text-xs font-semibold text-slate-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-2">
                {TRUST_BADGES.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 bg-white/60 dark:bg-white/[0.03]"
                  >
                    <Lock size={11} strokeWidth={2} className="text-[#D4A64A]" />
                    {b}
                  </span>
                ))}
              </div>
            </div>

            <div className="lg:pt-4">
              {config.heroImageUrl ? (
                <img src={config.heroImageUrl} alt="" className="rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl w-full object-cover max-h-[480px]" loading="lazy" />
              ) : (
                <HeroVisualStack />
              )}
            </div>
          </div>
        </div>
      </SectionShell>

      {/* Problem / Solution — lighter, list-based */}
      <SectionShell className={`${SECTION_PY} border-t border-slate-200/60 dark:border-white/[0.05] bg-white dark:bg-[#070f1a]`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="التحول" title="من الفوضى إلى نظام واحد موثوق" subtitle="مدارس كثيرة تعاني من أدوات متفرقة — SchoolixIQ يجمع كل شيء في منصة واحدة." />
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
            <div>
              <p className="text-sm font-bold text-slate-500 mb-6 flex items-center gap-2">
                <Minus size={16} /> قبل SchoolixIQ
              </p>
              <ul className="space-y-5">
                {config.problemPoints.map((point) => (
                  <li key={point} className={`text-[15px] leading-[1.9] pl-4 border-r-2 border-slate-200 dark:border-white/10 ${MUTED}`}>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-bold text-[#0B2345] dark:text-[#D4A64A] mb-6 flex items-center gap-2">
                <Check size={16} strokeWidth={2.5} /> بعد SchoolixIQ
              </p>
              <ul className="space-y-5">
                {config.solutionPoints.map((point) => (
                  <li key={point} className="text-[15px] leading-[1.9] font-medium text-[#0B2345] dark:text-slate-200 pl-4 border-r-2 border-[#D4A64A]/50">
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </SectionShell>

      {/* Features — 3 groups */}
      <SectionShell id="features" className={SECTION_PY}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20 lg:space-y-28">
          <SectionHeader eyebrow="المنصة" title="قدرات مصممة حسب دورك" subtitle="ليس شبكة بطاقات متساوية — بل وحدات واضحة لكل جانب من المدرسة." />

          {featureGroups.core.length > 0 && (
            <div>
              <Eyebrow>الإدارة الأساسية</Eyebrow>
              <h3 className="text-xl font-black mb-8 tracking-tight">Core Management</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {featureGroups.core.map((card) => (
                  <FeatureRow key={card.id} card={card} />
                ))}
              </div>
            </div>
          )}

          {featureGroups.parent.length > 0 && (
            <div className="grid lg:grid-cols-2 gap-10 items-start">
              <div>
                <Eyebrow>تجربة ولي الأمر</Eyebrow>
                <h3 className="text-xl font-black mb-6 tracking-tight">Parent Experience</h3>
                {featureGroups.parent.map((card) => (
                  <FeatureRow key={card.id} card={card} />
                ))}
              </div>
              <div className="hidden lg:block opacity-90">
                <PhoneMockup />
              </div>
            </div>
          )}

          {featureGroups.gate.length > 0 && (
            <div>
              <Eyebrow>البوابة الذكية</Eyebrow>
              <h3 className="text-xl font-black mb-6 tracking-tight">Smart Gate</h3>
              <div className="max-w-xl">
                {featureGroups.gate.map((card) => (
                  <FeatureRow key={card.id} card={card} compact />
                ))}
              </div>
            </div>
          )}
        </div>
      </SectionShell>

      {/* Smart Gate flagship */}
      <SectionShell id="smart-gate" className={`${SECTION_PY} bg-[#0B2345] text-white`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-16">
            <Eyebrow>المنتج الرئيسي</Eyebrow>
            <h2 className="text-2xl sm:text-4xl font-black leading-[1.15] tracking-[-0.02em]">{config.smartGateTitle}</h2>
            <p className="mt-6 text-slate-400 text-lg leading-[1.9]">{config.smartGateDescription}</p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10">
            <div className="lg:col-span-7 space-y-0 relative">
              {[
                'ولي الأمر يطلب التسريح',
                'المعلم ينادي الطالب',
                'الحارس يتحقق من الرمز',
                'الإدارة تتابع السجل',
              ].map((step, idx) => (
                <div key={step} className="flex gap-5 pb-10 last:pb-0 relative">
                  {idx < 3 && <div className="absolute top-10 bottom-0 right-[15px] w-px bg-white/10" />}
                  <div className="w-8 h-8 rounded-full border-2 border-[#D4A64A] bg-[#0B2345] flex items-center justify-center text-xs font-black text-[#D4A64A] shrink-0 z-10">
                    {idx + 1}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className="font-bold text-[15px]">{step}</p>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                      {idx === 0 && 'طلب رقمي موثّق من التطبيق'}
                      {idx === 1 && 'تنبيه فوري للصف والحارس'}
                      {idx === 2 && 'مسح QR — لا تسريح بدون تحقق'}
                      {idx === 3 && 'سجل كامل لحظي للإدارة'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="lg:col-span-5 space-y-4">
              {[
                { label: 'حالة البوابة', val: 'نشطة', sub: 'جميع المنافذ متصلة' },
                { label: 'تسريح اليوم', val: '847', sub: '+12% عن أمس' },
                { label: 'متوسط الانتظار', val: '4 د', sub: 'عند الذروة' },
              ].map((c) => (
                <div key={c.label} className="rounded-xl border border-white/10 bg-white/[0.04] p-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">{c.label}</p>
                    <p className="text-2xl font-black tabular-nums mt-1">{c.val}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{c.sub}</p>
                  </div>
                  <Shield size={20} className="text-[#D4A64A]/60 shrink-0" strokeWidth={1.5} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionShell>

      {/* Parent App */}
      <SectionShell className={`${SECTION_PY} border-t border-slate-200/60 dark:border-white/[0.05] bg-white dark:bg-[#070f1a]`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1 flex justify-center">
            <PhoneMockup />
          </div>
          <div className="order-1 lg:order-2">
            <SectionHeader eyebrow="تطبيق ولي الأمر" title={config.parentAppTitle} subtitle={config.parentAppDescription} align="start" />
          </div>
        </div>
      </SectionShell>

      {/* Pricing */}
      {config.showPricing && (
        <SectionShell id="pricing" className={SECTION_PY}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader eyebrow="الأسعار" title="اختر الباقة المناسبة" subtitle="شفافية كاملة — بدون رسوم مخفية." />
            <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-end max-w-5xl mx-auto">
              {pricingPlans.map((pkg: any, index: number) => {
                const popular = pkg.isPopular;
                const topFeatures = getPackageMarketingFeatures(pkg.permissions as PackagePermissions);
                const displayFeatures = topFeatures.length > 0 ? topFeatures : (Array.isArray(pkg.features) ? pkg.features : []).slice(0, 5);
                const maxLabel = pkg.maxStudents > 0 ? `حتى ${pkg.maxStudents.toLocaleString('ar-IQ')} طالب` : 'طلاب غير محدود';
                const isCenter = popular || (popularIndex === -1 && index === 1);

                return (
                  <div
                    key={pkg.id}
                    className={`relative flex flex-col rounded-2xl transition-transform duration-200 ${
                      isCenter
                        ? 'md:-mt-4 md:mb-4 p-9 lg:p-10 border-2 border-[#D4A64A] bg-[#0B2345] text-white shadow-[0_32px_64px_-20px_rgba(11,35,69,0.5)] md:scale-[1.03] z-10'
                        : 'p-8 border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0a1525] hover:scale-[1.01]'
                    }`}
                  >
                    {isCenter && (
                      <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-black bg-[#D4A64A] text-[#0B2345] whitespace-nowrap">
                        {popular ? 'الأكثر طلباً' : 'موصى به'}
                      </span>
                    )}
                    <h3 className="text-lg font-black">{pkg.name}</h3>
                    <p className={`text-sm mt-1 mb-6 ${isCenter ? 'text-slate-400' : MUTED}`}>{maxLabel}</p>
                    <p className="text-[2rem] font-black tabular-nums leading-none tracking-tight">{formatIqdPrice(pkg.priceMonthly)}</p>
                    <p className={`text-xs font-semibold mt-2 mb-8 ${isCenter ? 'text-slate-500' : 'text-slate-500'}`}>
                      شهرياً
                      {pkg.priceYearly > 0 && <span className="block mt-1">أو {formatIqdPrice(pkg.priceYearly)} / سنة</span>}
                    </p>
                    <ul className={`space-y-3 mb-10 flex-1 text-sm ${isCenter ? 'text-slate-300' : ''}`}>
                      {displayFeatures.map((f: string) => (
                        <li key={f} className="flex items-start gap-2.5 leading-relaxed">
                          <Check size={14} className={`shrink-0 mt-1 ${isCenter ? 'text-[#D4A64A]' : 'text-[#0B2345] dark:text-[#D4A64A]'}`} strokeWidth={2.5} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link
                      to="/login?mode=signup"
                      className={`block text-center py-3.5 rounded-xl text-sm font-black transition-opacity hover:opacity-90 ${
                        isCenter ? 'bg-[#D4A64A] text-[#0B2345]' : 'bg-[#0B2345] text-white dark:bg-white/10 dark:hover:bg-[#D4A64A] dark:hover:text-[#0B2345]'
                      }`}
                    >
                      {isCenter ? 'ابدأ الآن — الأكثر شعبية' : 'اختر هذه الباقة'}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </SectionShell>
      )}

      {/* Testimonials */}
      {showTestimonials && (
        <SectionShell className={`${SECTION_PY} border-t border-slate-200/60 dark:border-white/[0.05] bg-white dark:bg-[#070f1a]`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader eyebrow="آراء العملاء" title="مدارس تثق بـ SchoolixIQ" />
            <div className="grid md:grid-cols-3 gap-8">
              {config.testimonials.map((t, i) => (
                <figure key={t.id} className={`relative ${i === 1 ? 'md:-mt-2' : ''}`}>
                  <span className="block text-5xl font-serif leading-none text-[#D4A64A]/40 mb-4 select-none">&ldquo;</span>
                  <blockquote className={`text-[15px] leading-[1.95] ${MUTED}`}>{t.quote}</blockquote>
                  <figcaption className="mt-8 pt-6 border-t border-slate-200/80 dark:border-white/10">
                    <p className="font-black text-[#0B2345] dark:text-white">{t.name}</p>
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
                      className="w-full flex items-center justify-between gap-4 px-6 py-5 text-right text-[15px] font-bold text-[#0B2345] dark:text-white hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {item.question}
                      <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
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
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-[#0B2345] px-8 py-16 sm:px-12 sm:py-20 lg:px-16 text-center">
            <Eyebrow>ابدأ اليوم</Eyebrow>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-[-0.02em] leading-tight max-w-xl mx-auto">
              انضم إلى المدارس التي تدير عملياتها بثقة
            </h2>
            <p className="mt-5 text-slate-400 text-base sm:text-lg leading-[1.9] max-w-md mx-auto">
              تجربة موحّدة للإدارة والمعلمين وأولياء الأمور — جاهزة للتوسع.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login?mode=signup"
                className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-4 rounded-xl text-sm font-black bg-[#D4A64A] text-[#0B2345] hover:opacity-95 transition-opacity min-w-[200px]"
              >
                {config.primaryCtaLabel}
              </Link>
              {config.showAppDownload && (
                <button
                  type="button"
                  onClick={handleApkDownload}
                  className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-8 py-4 rounded-xl text-sm font-bold border border-white/20 text-white hover:bg-white/5 transition-colors min-w-[200px]"
                >
                  <Download size={18} strokeWidth={2} />
                  تحميل تطبيق Android
                </button>
              )}
            </div>
          </div>
        </div>
      </SectionShell>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 dark:border-white/[0.05] bg-white dark:bg-[#070f1a] pb-8">
        {config.footerMarketingText && (
          <div className={`max-w-6xl mx-auto px-4 py-8 text-center text-sm leading-[1.9] ${MUTED}`}>
            {config.footerMarketingText}
          </div>
        )}
        {config.showPartners && <GlobalFooter />}
      </footer>
    </div>
  );
}
