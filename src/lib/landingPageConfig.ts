import { useEffect, useState } from 'react';
import { db } from './firebase';
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { SCHOOL_FEATURES, type PackagePermissions } from './featureRegistry';

export type LandingFeatureCard = {
  id: string;
  title: string;
  description: string;
  icon?: string;
};

export type LandingTestimonial = {
  id: string;
  name: string;
  role: string;
  quote: string;
  avatarUrl?: string;
};

export type LandingFaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type LandingPageConfig = {
  landingEnabled: boolean;
  heroTitle: string;
  heroSubtitle: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  heroImageUrl: string;
  heroBadgeText: string;
  problemPoints: string[];
  solutionPoints: string[];
  featureCards: LandingFeatureCard[];
  smartGateTitle: string;
  smartGateDescription: string;
  parentAppTitle: string;
  parentAppDescription: string;
  testimonials: LandingTestimonial[];
  faq: LandingFaqItem[];
  showPricing: boolean;
  showTestimonials: boolean;
  showFaq: boolean;
  showAppDownload: boolean;
  showPartners: boolean;
  footerMarketingText: string;
  updatedAt?: unknown;
};

export const LANDING_PAGE_DOC_PATH = ['system', 'landingPage'] as const;

export const DEFAULT_LANDING_FEATURE_CARDS: LandingFeatureCard[] = [
  { id: 'students', title: 'إدارة الطلاب', description: 'سجلات كاملة، صور، وربط أولياء الأمور في مكان واحد.' },
  { id: 'attendance', title: 'الحضور والغياب', description: 'تسجيل يومي دقيق مع تنبيهات فورية للإدارة وأولياء الأمور.' },
  { id: 'grades', title: 'الدرجات والشهادات', description: 'نتائج شهرية وشهادات احترافية قابلة للطباعة.' },
  { id: 'tuition', title: 'الأقساط المدرسية', description: 'متابعة التحصيل، الديون، والتقارير المالية.' },
  { id: 'payroll', title: 'الرواتب', description: 'هيكل رواتب الكادر وتقارير صرف منظمة.' },
  { id: 'homework', title: 'الواجبات البيتية', description: 'إرسال ومتابعة الواجبات بين المعلمين وأولياء الأمور.' },
  { id: 'announcements', title: 'الإعلانات والتبليغات', description: 'قنوات تواصل رسمية للمدرسة بكل الأدوار.' },
  { id: 'parent_app', title: 'تطبيق ولي الأمر', description: 'متابعة الأبناء من الهاتف بسهولة وأمان.' },
  { id: 'smart_gate', title: 'البوابة الذكية / التسريح الآمن', description: 'تسريح منظم يحمي الطلاب ويريح الإدارة.' },
  { id: 'reports', title: 'التقارير المتقدمة', description: 'لوحات وإحصائيات تدعم قرارات الإدارة.' },
  { id: 'id_cards', title: 'هويات الطلاب', description: 'بطاقات هوية احترافية مع QR وباركود.' },
  { id: 'marketplace', title: 'المتجر المدرسي', description: 'طلب مستلزمات ومنتجات المدرسة إلكترونياً.' },
];

export const DEFAULT_LANDING_FAQ: LandingFaqItem[] = [
  {
    id: 'faq-1',
    question: 'هل النظام مناسب للمدارس الصغيرة؟',
    answer: 'نعم، SchoolixIQ يدعم المدارس الصغيرة والمتوسطة والكبيرة مع باقات مرنة حسب عدد الطلاب.',
  },
  {
    id: 'faq-2',
    question: 'هل يوجد تطبيق ولي الأمر؟',
    answer: 'نعم، يتوفر تطبيق ولي الأمر لمتابعة الحضور والواجبات والأقساط والتبليغات والتسريح الآمن.',
  },
  {
    id: 'faq-3',
    question: 'هل يمكن التحكم بالصلاحيات؟',
    answer: 'يمكن تحديد صلاحيات دقيقة للكادر والمساعدين حسب الباقة وسياسة المدرسة.',
  },
  {
    id: 'faq-4',
    question: 'هل يعمل على الهاتف؟',
    answer: 'المنصة متجاوبة بالكامل وتعمل على الهاتف والتابلت وسطح المكتب.',
  },
  {
    id: 'faq-5',
    question: 'هل يمكن تحميل تطبيق Android؟',
    answer: 'نعم، يتوفر تطبيق Android للتثبيت المباشر من رابط التحميل الرسمي للمنصة.',
  },
];

export const DEFAULT_LANDING_PAGE_CONFIG: LandingPageConfig = {
  landingEnabled: true,
  heroTitle: 'SchoolixIQ — نظام إدارة المدارس الذكي',
  heroSubtitle:
    'منصة عربية متكاملة تربط الإدارة والمعلمين وأولياء الأمور: حضور، أقساط، تقارير، وبوابة تسريح آمنة في تجربة واحدة.',
  primaryCtaLabel: 'ابدأ الآن',
  secondaryCtaLabel: 'تسجيل الدخول',
  heroImageUrl: '',
  heroBadgeText: 'الخيار الأول للمدارس الأهلية في العراق',
  problemPoints: [
    'فوضى الحضور والغياب اليومي',
    'ضياع متابعة الأقساط والتحصيل',
    'تواصل ضعيف مع أولياء الأمور',
    'ضغط وقت الخروج والتسريح عند البوابة',
  ],
  solutionPoints: [
    'إدارة مركزية لكل العمليات المدرسية',
    'تقارير واضحة لحظية للإدارة',
    'تواصل فوري مع أولياء الأمور',
    'تسريح آمن ومنظم عبر البوابة الذكية',
  ],
  featureCards: DEFAULT_LANDING_FEATURE_CARDS,
  smartGateTitle: 'البوابة الذكية — تسريح آمن بلا فوضى',
  smartGateDescription:
    'سير عمل واضح: ولي الأمر يطلب التسريح، المعلم ينادي الطالب، الحارس يتحقق من الرمز، والإدارة تتابع السجل لحظياً.',
  parentAppTitle: 'تطبيق ولي الأمر — كل ما يهمك في جيبك',
  parentAppDescription:
    'تابع حضور أبنائك، واجباتهم، الأقساط، التبليغات الرسمية، وطلبات التسريح الآمن من هاتفك.',
  testimonials: [],
  faq: DEFAULT_LANDING_FAQ,
  showPricing: true,
  showTestimonials: true,
  showFaq: true,
  showAppDownload: true,
  showPartners: true,
  footerMarketingText:
    'SchoolixIQ — شريكك الرقمي لإدارة المدرسة باحترافية. انضم إلى المدارس التي اختارت التحول الذكي.',
};

export const FALLBACK_PRICING_PACKAGES = [
  {
    id: 'basic',
    name: 'الباقة الأساسية',
    priceMonthly: 150000,
    priceYearly: 1500000,
    maxStudents: 250,
    isPopular: false,
    features: ['إدارة الطلاب', 'الحضور والغياب', 'لوحة تحكم', 'دعم فني'],
  },
  {
    id: 'professional',
    name: 'الباقة الاحترافية',
    priceMonthly: 300000,
    priceYearly: 3000000,
    maxStudents: 750,
    isPopular: true,
    features: ['تطبيق ولي الأمر', 'الرواتب', 'الشهادات', 'دعم مباشر'],
  },
  {
    id: 'premium',
    name: 'الباقة الشاملة',
    priceMonthly: 500000,
    priceYearly: 5000000,
    maxStudents: 0,
    isPopular: false,
    features: ['طلاب غير محدود', 'كل المميزات', 'محاسبة متقدمة', 'تخصيص الهوية'],
  },
];

function mergeLandingConfig(data: Record<string, unknown> | undefined): LandingPageConfig {
  if (!data) return { ...DEFAULT_LANDING_PAGE_CONFIG };
  return {
    ...DEFAULT_LANDING_PAGE_CONFIG,
    ...data,
    problemPoints:
      Array.isArray(data.problemPoints) && data.problemPoints.length
        ? (data.problemPoints as string[])
        : DEFAULT_LANDING_PAGE_CONFIG.problemPoints,
    solutionPoints:
      Array.isArray(data.solutionPoints) && data.solutionPoints.length
        ? (data.solutionPoints as string[])
        : DEFAULT_LANDING_PAGE_CONFIG.solutionPoints,
    featureCards:
      Array.isArray(data.featureCards) && data.featureCards.length
        ? (data.featureCards as LandingFeatureCard[])
        : DEFAULT_LANDING_PAGE_CONFIG.featureCards,
    testimonials: Array.isArray(data.testimonials)
      ? (data.testimonials as LandingTestimonial[])
      : [],
    faq:
      Array.isArray(data.faq) && data.faq.length
        ? (data.faq as LandingFaqItem[])
        : DEFAULT_LANDING_PAGE_CONFIG.faq,
  };
}

export async function fetchLandingPageConfig(): Promise<LandingPageConfig> {
  const snap = await getDoc(doc(db, ...LANDING_PAGE_DOC_PATH));
  return mergeLandingConfig(snap.exists() ? snap.data() : undefined);
}

export async function saveLandingPageConfig(
  config: LandingPageConfig,
): Promise<void> {
  await setDoc(
    doc(db, ...LANDING_PAGE_DOC_PATH),
    { ...config, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export function useLandingPageConfig(): {
  config: LandingPageConfig;
  loading: boolean;
} {
  const [config, setConfig] = useState<LandingPageConfig>(DEFAULT_LANDING_PAGE_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = doc(db, ...LANDING_PAGE_DOC_PATH);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setConfig(mergeLandingConfig(snap.exists() ? snap.data() : undefined));
        setLoading(false);
      },
      () => {
        setConfig(DEFAULT_LANDING_PAGE_CONFIG);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  return { config, loading };
}

/** Top enabled package features using featureRegistry labels (Arabic). */
export function getPackageMarketingFeatures(
  permissions: PackagePermissions | undefined,
  limit = 5,
): string[] {
  if (!permissions) return [];
  const labels: string[] = [];
  for (const feature of SCHOOL_FEATURES) {
    if (permissions[feature.key] === true) {
      labels.push(feature.labelAr);
    }
    if (labels.length >= limit) break;
  }
  return labels;
}

export function formatIqdPrice(amount: number): string {
  if (!amount || amount <= 0) return 'حسب الطلب';
  return `${amount.toLocaleString('ar-IQ')} د.ع`;
}
