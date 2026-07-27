/**
 * Rule-based Schoolix Helper — no AI, no hallucination.
 */

export type SmartAssistantScope =
  | 'landing'
  | 'superadmin'
  | 'platform_assistant'
  | 'school_admin'
  | 'teacher'
  | 'parent'
  | 'guard'
  | 'distributor';

export type SmartAssistantAction = {
  type: 'open_section' | 'open_whatsapp' | 'open_email' | 'show_help' | 'start_chat';
  value: string;
};

export type SmartAssistantRule = {
  id: string;
  scope: SmartAssistantScope | SmartAssistantScope[];
  keywords: string[];
  response: string;
  actions?: SmartAssistantAction[];
  priority: number;
  active: boolean;
};

export type SmartAssistantMatch = {
  rule: SmartAssistantRule;
  score: number;
};

export const DEFAULT_SMART_ASSISTANT_CONTACT = {
  whatsapp: 'https://wa.me/9647757905554',
  email: 'scooopyiq@gmail.com',
};

const DASHBOARD_SCOPES: SmartAssistantScope[] = [
  'superadmin',
  'platform_assistant',
  'school_admin',
  'teacher',
  'parent',
  'guard',
  'distributor',
];

export const LANDING_SEED_RULES: SmartAssistantRule[] = [
  {
    id: 'landing-what-is',
    scope: ['landing', ...DASHBOARD_SCOPES],
    keywords: ['ما هي', 'ما هو', 'المنصة', 'schoolix', 'سكوليكس', 'تعريف'],
    response: 'SchoolixIQ منصة سحابية لإدارة المدارس: الحضور، الدرجات، التواصل، التسريح الآمن، والتقارير.',
    actions: [{ type: 'open_section', value: '#features' }],
    priority: 100,
    active: true,
  },
  {
    id: 'landing-packages',
    scope: 'landing',
    keywords: ['باقات', 'أسعار', 'اشتراك', 'خطة', 'pricing'],
    response: 'تجد الباقات والأسعار في قسم الباقات بالصفحة الرئيسية. يمكنك اختيار الخطة المناسبة لمدرستك.',
    actions: [{ type: 'open_section', value: '#pricing' }],
    priority: 95,
    active: true,
  },
  {
    id: 'landing-dismissal',
    scope: ['landing', 'school_admin', 'teacher', 'parent', 'guard'],
    keywords: ['تسريح', 'آمن', 'dismissal', 'استلام', 'طلاب'],
    response: 'التسريح الآمن يعتمد على مسح QR وتحقق الهوية قبل خروج الطالب — يقلل الأخطاء ويعزز الأمان.',
    actions: [{ type: 'open_section', value: '#dismissal' }],
    priority: 90,
    active: true,
  },
  {
    id: 'landing-register-school',
    scope: 'landing',
    keywords: ['تسجيل', 'مدرسة', 'اشترك', 'انضم', 'register'],
    response: 'لتسجيل مدرستك اضغط "ابدأ الآن" أو سجّل من صفحة التسجيل.',
    actions: [{ type: 'open_section', value: '/register' }],
    priority: 88,
    active: true,
  },
  {
    id: 'landing-distributor',
    scope: ['landing', 'distributor'],
    keywords: ['موزع', 'توزيع', 'distributor', 'عمولة'],
    response: 'يمكنك التقديم كموزع من قسم الموزعين في الصفحة الرئيسية. داخل لوحة الموزع تجد العمولات والكوبونات.',
    actions: [{ type: 'open_section', value: '#distributors' }],
    priority: 85,
    active: true,
  },
  {
    id: 'landing-app',
    scope: ['landing', ...DASHBOARD_SCOPES],
    keywords: ['تطبيق', 'apk', 'جوال', 'pwa', 'تحميل'],
    response: 'المنصة تعمل كتطبيق ويب تقدمي (PWA) ويمكن تثبيتها على الجوال. رابط التحميل متوفر في الصفحة.',
    actions: [{ type: 'open_section', value: '#download' }],
    priority: 80,
    active: true,
  },
  {
    id: 'landing-contact',
    scope: ['landing', ...DASHBOARD_SCOPES],
    keywords: ['تواصل', 'دعم', 'واتساب', 'بريد', 'مساعدة'],
    response: 'تواصل معنا عبر واتساب أو البريد الإلكتروني.',
    actions: [
      { type: 'open_whatsapp', value: DEFAULT_SMART_ASSISTANT_CONTACT.whatsapp },
      { type: 'open_email', value: DEFAULT_SMART_ASSISTANT_CONTACT.email },
    ],
    priority: 75,
    active: true,
  },
  {
    id: 'dash-chat',
    scope: ['superadmin', 'platform_assistant', 'school_admin', 'teacher', 'parent'],
    keywords: ['محادثة', 'شات', 'رسائل', 'chat', 'inbox'],
    response: 'افتح تبويب المحادثات من القائمة الجانبية لمتابعة الرسائل والرد عليها.',
    priority: 70,
    active: true,
  },
  {
    id: 'dash-assistant-ops',
    scope: 'platform_assistant',
    keywords: ['تعيين', 'مدارس', 'طلبات', 'صلاحيات'],
    response: 'كمساعد منصة: استخدم دليل جهات الاتصال للمدارس المسموحة، وصندوق الوارد للمحادثات المسندة إليك.',
    priority: 72,
    active: true,
  },
  {
    id: 'dash-superadmin-control',
    scope: 'superadmin',
    keywords: ['تحكم', 'تعيين', 'تصعيد', 'مركز', 'assignment'],
    response: 'من تبويب المحادثات: مركز التحكم يتيح التعيين والتحويل والإغلاق، وزر الإعدادات يعرض تفاصيل المحادثة.',
    priority: 72,
    active: true,
  },
];

function normalizeArabicText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function ruleMatchesScope(rule: SmartAssistantRule, scope: SmartAssistantScope): boolean {
  const scopes = Array.isArray(rule.scope) ? rule.scope : [rule.scope];
  return scopes.includes(scope);
}

export function matchSmartAssistantRules(
  query: string,
  rules: SmartAssistantRule[],
  scope: SmartAssistantScope,
): SmartAssistantMatch | null {
  const normalized = normalizeArabicText(query);
  if (!normalized) return null;

  const active = rules.filter((r) => r.active && ruleMatchesScope(r, scope));
  let best: SmartAssistantMatch | null = null;

  for (const rule of active) {
    let score = rule.priority;
    for (const kw of rule.keywords) {
      const nkw = normalizeArabicText(kw);
      if (nkw && normalized.includes(nkw)) score += 10 + nkw.length;
    }
    if (!best || score > best.score) {
      best = { rule, score };
    }
  }

  if (!best || best.score <= best.rule.priority) return null;
  return best;
}

export function smartAssistantFallback(isRtl: boolean): string {
  return isRtl
    ? 'لم أجد إجابة دقيقة. تواصل معنا عبر واتساب أو البريد.'
    : 'No exact match found. Contact us via WhatsApp or email.';
}

export function smartAssistantIntro(isRtl: boolean): string {
  return isRtl
    ? 'مرحباً! أنا Schoolix Helper — أساعدك بإجابات جاهزة من قواعد المنصة.'
    : 'Hi! I am Schoolix Helper — I answer from predefined platform rules only.';
}
