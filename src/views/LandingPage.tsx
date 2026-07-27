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
  Play,
  Rocket,
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
import { MOTION_DURATION, MOTION_EASE, prefersReducedMotion } from '../lib/motion';
import { LandingNavbar } from '../components/landing/LandingNavbar';
import { LandingWhatsAppFab } from '../components/landing/LandingWhatsAppFab';
import { SmartAssistantWidget } from '../components/smart-assistant/SmartAssistantWidget';
import { LandingTechSection } from '../components/landing/LandingTechSection';
import { LandingHeroMockup } from '../components/landing/LandingHeroMockup';
import { LandingDistributorSection } from '../components/landing/LandingDistributorSection';
import { LandingFeaturesShowcase } from '../components/landing/LandingFeaturesShowcase';
import { LandingRoleInterfaces } from '../components/landing/LandingRoleInterfaces';
import { LandingSafeDismissalShowcase } from '../components/landing/LandingSafeDismissalShowcase';
import { LandingFooterShell } from '../components/landing/LandingFooterShell';
import { LandingButton } from '../components/ui/LandingButton';
import { LandingFeatureSlider } from '../components/landing/LandingFeatureSlider';
import {
  LandingPartnersSection,
  useLandingPartners,
} from '../components/landing/LandingPartnersSection';
import {
  ANDROID_APK_NOT_CONFIGURED_MSG_AR,
  resolveAndroidApkUrl,
  triggerAndroidApkDownload,
} from '../lib/androidApk';
import { toast } from 'react-hot-toast';
import type { PackagePermissions } from '../lib/featureRegistry';

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
    accent: 'from-[#8a7330] to-[#c9a84c]',
  },
  {
    id: 'parent',
    title: 'لولي الأمر',
    description: 'متابعة الأبناء: حضور، أقساط، واجبات، وتبليغات في تطبيق واحد.',
    icon: Smartphone,
    accent: 'from-[#0B2345] to-[#1a3a5c]',
  },
  {
    id: 'guard',
    title: 'للحارس / البوابة الذكية',
    description: 'تحقق التسريح، مسح الرمز، وسجل خروج آمن ومنظم.',
    icon: Shield,
    accent: 'from-[#06182f] to-[#0b2345]',
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
  return <p className="lp-eyebrow">{children}</p>;
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  goldTitle = false,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: 'center' | 'start';
  light?: boolean;
  goldTitle?: boolean;
}) {
  return (
    <div className={`mb-12 lg:mb-16 max-w-2xl ${align === 'center' ? 'mx-auto text-center' : 'text-right'}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className={`lp-section-title ${goldTitle ? 'lp-title-gold' : ''}`}>{title}</h2>
      {subtitle && (
        <p className={`lp-section-subtitle ${align === 'center' ? 'mx-auto' : ''}`}>{subtitle}</p>
      )}
    </div>
  );
}

function HeroTitle({ text }: { text: string }) {
  if (text.includes('\n')) {
    return (
      <>
        {text.split('\n').map((line, i) => (
          <span key={i} className="block">
            {line}
          </span>
        ))}
      </>
    );
  }
  const splitIdx = text.indexOf(' لمستقبل');
  if (splitIdx > 0) {
    return (
      <>
        <span className="block">{text.slice(0, splitIdx)}</span>
        <span className="block">{text.slice(splitIdx + 1)}</span>
      </>
    );
  }
  return <>{text}</>;
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
      { href: '#interfaces', label: 'الواجهات' },
      { href: '#smart-gate', label: 'التسريح الآمن' },
    ];
    if (config.showPricing) links.push({ href: '#pricing', label: 'الباقات' });
    links.push({ href: '#partners', label: 'الشركاء' });
    if (config.showDistributorSection !== false) {
      links.push({ href: '#distributors', label: 'الموزعين' });
    }
    links.push({ href: '#about', label: 'عن المنصة' });
    links.push({ href: '#contact', label: 'تواصل معنا' });
    return links;
  }, [config.showPricing, config.showDistributorSection]);

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
  const showPartnerSections =
    hasConfiguredFooterPartners(systemConfig) || config.showPartners !== false;
  /** Partners render once in page section — footer partners hidden on landing */
  const showFooterPartners = false;
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
        demoLabel={config.demoCtaLabel || 'احجز عرضاً مجانياً'}
      />

      {/* Hero */}
      <SectionShell id="hero" className="landing-hero">
        <div className="landing-hero__glow" />
        <div className="lp-container relative">
          <div className="landing-hero__grid">
            <div>
              {config.heroBadgeText && (
                <div className="landing-hero__badge">
                  <Sparkles size={12} className="text-[#d4af37]" />
                  {config.heroBadgeText}
                </div>
              )}
              <h1 className="landing-hero__title">
                <HeroTitle text={config.heroTitle} />
              </h1>
              <p className="landing-hero__subtitle">{config.heroSubtitle}</p>

              <div className="landing-hero__cta landing-hero__cta--stack">
                <LandingButton
                  to="/login?mode=signup"
                  variant="primary"
                  size="lg"
                  icon={<Rocket size={16} />}
                >
                  {config.primaryCtaLabel || 'ابدأ الآن مجاناً'}
                </LandingButton>
                <LandingButton
                  href="#features"
                  variant="secondary"
                  size="lg"
                  icon={<Play size={14} className="fill-current opacity-70" />}
                >
                  {config.exploreCtaLabel || 'استكشف المميزات'}
                </LandingButton>
              </div>
              <div className="landing-hero__note">
                <span>بدون التزام طويل</span>
                <span>دعم فني عربي</span>
                <span>تجربة متجاوبة</span>
              </div>
              <div className="landing-hero__social" aria-label="مدارس تستخدم المنصة">
                <div className="landing-hero__avatars" aria-hidden="true">
                  {['م', 'د', 'ر'].map((l, i) => (
                    <span key={l} style={{ zIndex: 3 - i }}>{l}</span>
                  ))}
                </div>
                <p>
                  <strong>+100</strong> مدرسة تثق بمنصتنا
                </p>
              </div>
            </div>
            <div className="landing-hero__visual">
              {config.heroImageUrl ? (
                <img
                  src={config.heroImageUrl}
                  alt=""
                  className="rounded-3xl border border-[rgba(255,255,255,0.08)] shadow-2xl w-full object-cover max-h-[440px] landing-fade-up"
                  loading="lazy"
                />
              ) : (
                <LandingHeroMockup />
              )}
            </div>
          </div>
        </div>
      </SectionShell>

      {/* Feature highlight strip */}
      {featureStrip.length > 0 && (
        <SectionShell className="landing-feature-strip">
          <div className="lp-container">
            <LandingFeatureSlider
              ariaLabel="أبرز مميزات المنصة"
              slides={featureStrip.map(({ id, title, description }) => {
                const Icon = FEATURE_STRIP_ICONS[id] || Sparkles;
                return {
                  id,
                  label: title,
                  content: (
                    <div className="landing-feature-strip__card lp-card landing-feature-strip__card--slider">
                      <div className="landing-feature-strip__icon">
                        <Icon size={20} strokeWidth={1.5} />
                      </div>
                      <h3 className="font-black text-sm text-white mb-2">{title}</h3>
                      <p className="text-xs leading-[1.75] text-[#8b9cb3]">{description}</p>
                    </div>
                  ),
                };
              })}
            />
          </div>
        </SectionShell>
      )}

      <LandingRoleInterfaces />

      <LandingSafeDismissalShowcase
        title={config.smartGateTitle}
        subtitle={config.smartGateDescription}
      />

      {/* Features — alternating showcase */}
      <SectionShell id="features" className={`${SECTION_PY} lp-section--deep`}>
        <div className="lp-container">
          <SectionHeader
            eyebrow="خدماتنا"
            goldTitle
            title="كل ما تحتاجه مدرستك في مكان واحد"
            subtitle="وحدات متكاملة للإدارة والمعلمين وأولياء الأمور — بدون أدوات متفرقة."
          />
          <LandingFeaturesShowcase features={showcaseFeatures} icons={FEATURE_ICONS} />
        </div>
      </SectionShell>

      {config.showPricing && (
        <SectionShell id="pricing" className="landing-pricing-section lp-section--alt">
          <div className="lp-container">
            <SectionHeader
              eyebrow="الأسعار"
              goldTitle
              title={config.pricingTitle || 'اختر الباقة المناسبة لمدرستك'}
              subtitle={config.pricingSubtitle || 'جميع الباقات تشمل التحديثات والدعم الفني'}
            />
            <div className="landing-pricing-grid">
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
                    className={`landing-pricing-card flex flex-col text-white ${
                      isCenter ? 'landing-pricing-card--featured z-10' : ''
                    }`}
                  >
                    {isCenter && (
                      <span className="landing-pricing-badge">
                        <Star size={10} />
                        {popular ? 'الأكثر اختياراً' : 'موصى به'}
                      </span>
                    )}
                    <h3 className="text-lg font-black">{pkg.name}</h3>
                    <p className="text-sm mt-1 mb-5 text-[#8b9cb3]">{maxLabel}</p>
                    <p className="landing-pricing-card__price">{formatIqdPrice(pkg.priceMonthly)}</p>
                    <p className="text-xs font-semibold mt-2 mb-8 text-[#8b9cb3]">
                      شهرياً
                      {pkg.priceYearly > 0 && <span className="block mt-1">أو {formatIqdPrice(pkg.priceYearly)} / سنة</span>}
                    </p>
                    <ul className="space-y-3 mb-10 flex-1 text-sm text-[#b8c5d6]">
                      {displayFeatures.map((f: string) => (
                        <li key={f} className="flex items-start gap-2.5 leading-relaxed">
                          <Check size={14} className="shrink-0 mt-1 text-[#d4af37]" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <LandingButton
                      to="/login?mode=signup"
                      variant={isCenter ? 'primary' : 'secondary'}
                      fullWidth
                    >
                      ابدأ الآن
                    </LandingButton>
                  </motion.div>
                );
              })}
            </div>
            <p className="landing-pricing-compare">
              جميع الباقات تشمل التحديثات، الدعم الفني، وتجربة موحّدة للإدارة والمعلمين وأولياء الأمور.
            </p>
          </div>
        </SectionShell>
      )}

      <LandingPartnersSection
        successPartners={successPartners}
        ourPartners={ourPartners}
        title={config.partnersTitle || 'شركاؤنا في النجاح'}
        subtitle={config.partnersSubtitle || 'مؤسسات ومدارس تثق بمنصة SchoolixIQ'}
        showPartners={showPartnerSections}
      />

      <LandingDistributorSection
        show={config.showDistributorSection !== false}
        title={config.distributorTitle}
        subtitle={config.distributorSubtitle}
        features={config.distributorFeatures}
      />

      {config.showTechSection !== false && <LandingTechSection />}

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
      <SectionShell className={`${SECTION_PY} border-t border-[rgba(255,255,255,0.06)]`}>
        <div className="lp-container">
          <div className="landing-final-cta">
            <div className="landing-final-cta__glow" />
            <div className="relative text-center">
              <Eyebrow>ابدأ اليوم</Eyebrow>
              <h2 className="lp-section-title max-w-xl mx-auto">
                {config.finalCtaTitle || 'جاهز لإدارة مدرستك بذكاء؟'}
              </h2>
              <p className="lp-section-subtitle max-w-md mx-auto">
                {config.finalCtaSubtitle || 'تجربة موحّدة للإدارة والمعلمين وأولياء الأمور.'}
              </p>
              <div className="mt-8 landing-final-cta__actions">
                <LandingButton
                  to="/login?mode=signup"
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto sm:min-w-[200px]"
                >
                  {config.primaryCtaLabel || 'ابدأ الآن مجاناً'}
                </LandingButton>
                {config.showAppDownload && (
                  <LandingButton
                    type="button"
                    variant="secondary"
                    size="lg"
                    icon={<Download size={18} />}
                    onClick={handleApkDownload}
                    className="w-full sm:w-auto sm:min-w-[200px]"
                  >
                    تحميل Android
                  </LandingButton>
                )}
                <LandingButton
                  href={resolveWhatsAppUrl(config.whatsappNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto sm:min-w-[200px]"
                >
                  تواصل عبر واتساب
                </LandingButton>
              </div>
            </div>
          </div>
        </div>
      </SectionShell>

      <LandingWhatsAppFab whatsappNumber={config.whatsappNumber} />
      <SmartAssistantWidget isRtl />

      {/* Footer */}
      <footer id="contact" className="landing-footer-wrap pb-6">
        <LandingFooterShell
          appName={systemConfig.appName}
          description={config.footerMarketingText}
          whatsappNumber={config.whatsappNumber}
          phone="07757905554"
          email={systemConfig.supportEmails?.[0]}
          location="العراق"
        />
        <GlobalFooter compact={false} showPartnerSections={showFooterPartners} />
      </footer>
    </div>
  );
}
