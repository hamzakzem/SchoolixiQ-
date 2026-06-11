import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Download,
  GraduationCap,
  LayoutDashboard,
  LogIn,
  Shield,
  Smartphone,
  Sparkles,
  Star,
  Users,
  Wallet,
} from 'lucide-react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useLandingPageConfig, FALLBACK_PRICING_PACKAGES, formatIqdPrice, getPackageMarketingFeatures } from '../lib/landingPageConfig';
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

const FEATURE_ICONS: Record<string, React.ElementType> = {
  students: Users,
  attendance: CheckCircle2,
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
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: MOTION_DURATION.slow, ease: MOTION_EASE }}
    >
      {children}
    </motion.section>
  );
}

export default function LandingPage() {
  const { config, loading } = useLandingPageConfig();
  const { config: systemConfig } = useSystemConfig();
  const [packages, setPackages] = useState<any[]>([]);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const reduced = prefersReducedMotion();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'packages'), (snap) => {
      const rows = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((p: any) => p.active !== false);
      setPackages(rows.length ? rows : FALLBACK_PRICING_PACKAGES);
    }, () => setPackages(FALLBACK_PRICING_PACKAGES));
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#0B2345] border-t-[#D4A64A] rounded-full animate-spin" />
      </div>
    );
  }

  const floatAnim = reduced
    ? {}
    : {
        animate: { y: [0, -8, 0] },
        transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' as const },
      };

  const showTestimonials =
    config.showTestimonials && config.testimonials.length > 0;

  return (
    <div
      className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
      dir="rtl"
    >
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <SchoolixLogo className="w-10 h-10" />
            <span className="font-black text-lg text-[#0B2345] dark:text-white hidden sm:block">
              {systemConfig.appName}
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-bold text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-[#0B2345] dark:hover:text-[#D4A64A] transition-colors">المميزات</a>
            <a href="#smart-gate" className="hover:text-[#0B2345] dark:hover:text-[#D4A64A] transition-colors">البوابة الذكية</a>
            {config.showPricing && <a href="#pricing" className="hover:text-[#0B2345] dark:hover:text-[#D4A64A] transition-colors">الباقات</a>}
            {config.showFaq && <a href="#faq" className="hover:text-[#0B2345] dark:hover:text-[#D4A64A] transition-colors">الأسئلة</a>}
          </nav>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              <LogIn size={16} />
              {config.secondaryCtaLabel}
            </Link>
            <Link
              to="/login?mode=signup"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B2345] hover:bg-[#D4A64A] text-white hover:text-[#0B2345] font-bold text-sm shadow-lg transition-all duration-200"
            >
              {config.primaryCtaLabel}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <SectionShell className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B2345]/5 via-transparent to-[#D4A64A]/10 dark:from-[#0B2345]/30 dark:to-[#D4A64A]/5 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            {config.heroBadgeText && (
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4A64A]/15 text-[#0B2345] dark:text-[#D4A64A] text-sm font-bold border border-[#D4A64A]/30">
                <Sparkles size={16} />
                {config.heroBadgeText}
              </span>
            )}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight text-[#0B2345] dark:text-white">
              {config.heroTitle}
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
              {config.heroSubtitle}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/login?mode=signup"
                className="px-6 py-3.5 rounded-2xl bg-[#0B2345] hover:bg-[#D4A64A] text-white hover:text-[#0B2345] font-black shadow-xl transition-all duration-200 hover:-translate-y-0.5"
              >
                {config.primaryCtaLabel}
              </Link>
              <Link
                to="/login"
                className="px-6 py-3.5 rounded-2xl border-2 border-[#0B2345]/20 dark:border-slate-600 font-bold hover:bg-white dark:hover:bg-slate-800 transition-all duration-200"
              >
                {config.secondaryCtaLabel}
              </Link>
              {config.showAppDownload && (
                <button
                  type="button"
                  onClick={handleApkDownload}
                  className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 transition-all duration-200"
                >
                  <Download size={18} />
                  تحميل تطبيق Android
                </button>
              )}
            </div>
          </div>

          <div className="relative min-h-[320px] lg:min-h-[420px]">
            {config.heroImageUrl ? (
              <img
                src={config.heroImageUrl}
                alt=""
                className="rounded-3xl shadow-2xl w-full object-cover max-h-[420px]"
                loading="lazy"
              />
            ) : (
              <div className="relative h-full">
                <motion.div
                  {...floatAnim}
                  className="absolute top-0 right-0 w-[85%] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5 z-10"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <LayoutDashboard className="text-[#D4A64A]" size={20} />
                    <span className="font-bold text-sm">لوحة الإدارة</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {['الحضور', 'الأقساط', 'التقارير'].map((l) => (
                      <div key={l} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold">
                        {l}
                      </div>
                    ))}
                  </div>
                </motion.div>
                <motion.div
                  {...floatAnim}
                  style={{ animationDelay: '1s' }}
                  className="absolute bottom-4 left-0 w-[55%] bg-gradient-to-br from-[#0B2345] to-slate-800 rounded-2xl shadow-xl p-4 text-white z-20"
                >
                  <Smartphone className="mb-2 text-[#D4A64A]" size={22} />
                  <p className="text-sm font-bold">تطبيق ولي الأمر</p>
                  <p className="text-xs text-slate-300 mt-1">حضور • واجبات • تسريح</p>
                </motion.div>
                <motion.div
                  {...floatAnim}
                  className="absolute top-1/3 left-[10%] w-[45%] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-3 z-30"
                >
                  <Shield className="text-emerald-600 mb-1" size={18} />
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">البوابة الذكية — جاهز للتسريح</p>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </SectionShell>

      {/* Problem / Solution */}
      <SectionShell className="py-16 lg:py-24 bg-white dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="rounded-3xl border border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/20 p-8">
              <h2 className="text-xl font-black text-red-700 dark:text-red-400 mb-6">قبل SchoolixIQ</h2>
              <ul className="space-y-4">
                {config.problemPoints.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-slate-700 dark:text-slate-300 font-medium">
                    <span className="w-2 h-2 rounded-full bg-red-500 mt-2 shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-8">
              <h2 className="text-xl font-black text-emerald-700 dark:text-emerald-400 mb-6">بعد SchoolixIQ</h2>
              <ul className="space-y-4">
                {config.solutionPoints.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-slate-700 dark:text-slate-300 font-medium">
                    <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </SectionShell>

      {/* Features */}
      <SectionShell id="features" className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-[#0B2345] dark:text-white mb-3">كل ما تحتاجه مدرستك</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              منصة SaaS متكاملة لإدارة العمليات اليومية والتواصل والمالية.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {config.featureCards.map((card, i) => {
              const Icon = FEATURE_ICONS[card.id] || Sparkles;
              return (
                <motion.div
                  key={card.id}
                  initial={reduced ? {} : { opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04, duration: MOTION_DURATION.base }}
                  className="group p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#0B2345]/10 dark:bg-[#D4A64A]/10 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                    <Icon className="text-[#0B2345] dark:text-[#D4A64A]" size={22} />
                  </div>
                  <h3 className="font-black text-lg mb-2">{card.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{card.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </SectionShell>

      {/* Smart Gate */}
      <SectionShell id="smart-gate" className="py-16 lg:py-24 bg-[#0B2345] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl font-black mb-4 text-[#D4A64A]">{config.smartGateTitle}</h2>
            <p className="text-slate-300 leading-relaxed mb-8">{config.smartGateDescription}</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                'ولي الأمر يطلب التسريح',
                'المعلم ينادي الطالب',
                'الحارس يتحقق من الرمز',
                'الإدارة تتابع السجل',
              ].map((step, idx) => (
                <div key={step} className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                  <span className="w-8 h-8 rounded-full bg-[#D4A64A] text-[#0B2345] font-black flex items-center justify-center text-sm">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-sm">{step}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-white/5 border border-white/10 p-8 backdrop-blur">
            <Shield size={48} className="text-[#D4A64A] mb-4" />
            <p className="text-lg font-bold">تسريح آمن — بلا ازدحام عند البوابة</p>
            <p className="text-slate-400 mt-2 text-sm">سجل كامل لكل عملية تسريح مع تحقق متعدد المراحل.</p>
          </div>
        </div>
      </SectionShell>

      {/* Parent App */}
      <SectionShell className="py-16 lg:py-24 bg-white dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10 items-center">
          <div className="order-2 lg:order-1 rounded-3xl bg-gradient-to-br from-blue-600 to-[#0B2345] p-8 text-white shadow-2xl">
            <Smartphone size={40} className="mb-4" />
            <div className="space-y-3">
              {['الحضور', 'الواجبات', 'الأقساط', 'التبليغات', 'التسريح الآمن'].map((item) => (
                <div key={item} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3 font-bold">
                  <CheckCircle2 size={18} className="text-[#D4A64A]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl font-black text-[#0B2345] dark:text-white mb-4">{config.parentAppTitle}</h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{config.parentAppDescription}</p>
          </div>
        </div>
      </SectionShell>

      {/* Pricing */}
      {config.showPricing && (
        <SectionShell id="pricing" className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-black text-[#0B2345] dark:text-white mb-3">باقات مرنة لكل مدرسة</h2>
              <p className="text-slate-600 dark:text-slate-400">أسعار شفافة مع مميزات واضحة — تُحدّث من لوحة السوبر أدمن.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {pricingPlans.map((pkg: any) => {
                const topFeatures = getPackageMarketingFeatures(pkg.permissions as PackagePermissions);
                const displayFeatures =
                  topFeatures.length > 0
                    ? topFeatures
                    : (Array.isArray(pkg.features) ? pkg.features : []).slice(0, 5);
                const maxLabel =
                  pkg.maxStudents > 0
                    ? `حتى ${pkg.maxStudents.toLocaleString('ar-IQ')} طالب`
                    : 'عدد طلاب غير محدود';
                return (
                  <div
                    key={pkg.id}
                    className={`relative rounded-3xl p-8 border transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
                      pkg.isPopular
                        ? 'border-[#D4A64A] bg-[#0B2345] text-white shadow-2xl scale-[1.02]'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    {pkg.isPopular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#D4A64A] text-[#0B2345] text-xs font-black">
                        الأكثر طلباً
                      </span>
                    )}
                    <h3 className="text-xl font-black mb-2">{pkg.name}</h3>
                    <p className={`text-sm mb-4 ${pkg.isPopular ? 'text-slate-300' : 'text-slate-500'}`}>{maxLabel}</p>
                    <div className="mb-6">
                      <p className="text-2xl font-black">
                        {formatIqdPrice(pkg.priceMonthly)}
                        <span className="text-sm font-bold opacity-70"> / شهرياً</span>
                      </p>
                      {pkg.priceYearly > 0 && (
                        <p className={`text-sm mt-1 ${pkg.isPopular ? 'text-slate-400' : 'text-slate-500'}`}>
                          أو {formatIqdPrice(pkg.priceYearly)} سنوياً
                        </p>
                      )}
                    </div>
                    <ul className="space-y-2 mb-8">
                      {displayFeatures.map((f: string) => (
                        <li key={f} className="flex items-center gap-2 text-sm font-medium">
                          <CheckCircle2 size={16} className={pkg.isPopular ? 'text-[#D4A64A]' : 'text-emerald-500'} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link
                      to="/login?mode=signup"
                      className={`block text-center py-3 rounded-xl font-bold transition-all ${
                        pkg.isPopular
                          ? 'bg-[#D4A64A] text-[#0B2345] hover:bg-white'
                          : 'bg-[#0B2345] text-white hover:bg-[#D4A64A] hover:text-[#0B2345]'
                      }`}
                    >
                      ابدأ مع هذه الباقة
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
        <SectionShell className="py-16 lg:py-24 bg-white dark:bg-slate-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-black text-center mb-10 text-[#0B2345] dark:text-white">ماذا يقول عملاؤنا</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {config.testimonials.map((t) => (
                <div key={t.id} className="p-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
                  <p className="font-black">{t.name}</p>
                  <p className="text-sm text-slate-500">{t.role}</p>
                </div>
              ))}
            </div>
          </div>
        </SectionShell>
      )}

      {/* FAQ */}
      {config.showFaq && config.faq.length > 0 && (
        <SectionShell id="faq" className="py-16 lg:py-24">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-black text-center mb-10 text-[#0B2345] dark:text-white">الأسئلة الشائعة</h2>
            <div className="space-y-3">
              {config.faq.map((item) => {
                const open = openFaq === item.id;
                return (
                  <div key={item.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : item.id)}
                      className="w-full flex items-center justify-between gap-4 p-5 text-right font-bold hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {item.question}
                      <ChevronDown size={18} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {open && (
                      <div className="px-5 pb-5 text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-4">
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </SectionShell>
      )}

      {/* App Download */}
      {config.showAppDownload && (
        <SectionShell className="py-16 bg-gradient-to-r from-[#0B2345] to-slate-800 text-white">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-2xl font-black mb-4">حمّل تطبيق SchoolixIQ لأندرويد</h2>
            <p className="text-slate-300 mb-8">تجربة أسرع مع إشعارات فورية ووصول مباشر لحسابك.</p>
            <button
              type="button"
              onClick={handleApkDownload}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-[#D4A64A] text-[#0B2345] font-black hover:bg-white transition-all duration-200"
            >
              <Download size={22} />
              تحميل تطبيق Android
            </button>
          </div>
        </SectionShell>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800">
        {config.footerMarketingText && (
          <div className="max-w-7xl mx-auto px-4 py-8 text-center text-slate-600 dark:text-slate-400 font-medium">
            {config.footerMarketingText}
          </div>
        )}
        {config.showPartners && <GlobalFooter />}
      </footer>
    </div>
  );
}
