/**
 * Canonical school feature registry — single source for package permissions,
 * admin menu gating, and staff permission pickers.
 */

export type FeatureCategory =
  | 'core'
  | 'academic'
  | 'finance'
  | 'communication'
  | 'operations'
  | 'advanced';

export type SchoolFeature = {
  /** Stored in packages.permissions */
  key: string;
  labelAr: string;
  labelEn: string;
  category: FeatureCategory;
  descriptionAr?: string;
  descriptionEn?: string;
  defaultEnabled: boolean;
  /** Admin dashboard tab ids */
  menuIds: string[];
  /** Staff / assistant permission picker ids */
  staffPermissionIds?: string[];
  /** Legacy Firestore permission keys mapped to this feature */
  legacyKeys?: string[];
  /** Restrict package toggle to school admin role only (e.g. assistants_manage) */
  adminOnly?: boolean;
};

export type PackagePermissions = Record<string, boolean | undefined>;

export const FEATURE_CATEGORIES: Record<
  FeatureCategory,
  { labelAr: string; labelEn: string }
> = {
  core: { labelAr: 'أساسي', labelEn: 'Core' },
  academic: { labelAr: 'أكاديمي', labelEn: 'Academic' },
  finance: { labelAr: 'مالي', labelEn: 'Finance' },
  communication: { labelAr: 'تواصل', labelEn: 'Communication' },
  operations: { labelAr: 'تشغيلي', labelEn: 'Operations' },
  advanced: { labelAr: 'متقدم', labelEn: 'Advanced' },
};

export const SCHOOL_FEATURES: SchoolFeature[] = [
  {
    key: 'overview',
    labelAr: 'نظرة عامة',
    labelEn: 'Overview',
    category: 'core',
    defaultEnabled: true,
    menuIds: ['overview'],
  },
  {
    key: 'daily_summary',
    labelAr: 'ملخص المدرسة اليومي',
    labelEn: 'Daily School Summary',
    category: 'core',
    defaultEnabled: true,
    menuIds: ['overview'],
  },
  {
    key: 'chat',
    labelAr: 'الدردشة',
    labelEn: 'Chat',
    category: 'communication',
    defaultEnabled: true,
    menuIds: ['chat'],
  },
  {
    key: 'students_view',
    labelAr: 'عرض الطلاب',
    labelEn: 'View Students',
    category: 'core',
    defaultEnabled: true,
    menuIds: ['students'],
  },
  {
    key: 'students_edit',
    labelAr: 'إدارة الطلاب',
    labelEn: 'Manage Students',
    category: 'core',
    defaultEnabled: true,
    menuIds: ['students_edit'],
    staffPermissionIds: ['students'],
  },
  {
    key: 'classes',
    labelAr: 'الصفوف',
    labelEn: 'Classes',
    category: 'core',
    defaultEnabled: true,
    menuIds: ['classes'],
    staffPermissionIds: ['classes'],
  },
  {
    key: 'staff_manage',
    labelAr: 'الموظفين والمعلمين',
    labelEn: 'Staff Management',
    category: 'core',
    defaultEnabled: true,
    menuIds: ['staff'],
    staffPermissionIds: ['staff'],
  },
  {
    key: 'attendance_track',
    labelAr: 'الحضور والغياب',
    labelEn: 'Attendance',
    category: 'academic',
    defaultEnabled: true,
    menuIds: ['attendance'],
    staffPermissionIds: ['attendance'],
  },
  {
    key: 'homework_and_tasks',
    labelAr: 'الواجبات والمهام',
    labelEn: 'Homework & Tasks',
    category: 'academic',
    defaultEnabled: true,
    menuIds: ['homework'],
    staffPermissionIds: ['homework'],
  },
  {
    key: 'exams_and_results',
    labelAr: 'النتائج والدرجات',
    labelEn: 'Grades & Results',
    category: 'academic',
    defaultEnabled: true,
    menuIds: ['grades'],
    staffPermissionIds: ['grades'],
  },
  {
    key: 'student_archive',
    labelAr: 'أرشيف الطالب',
    labelEn: 'Student Archive',
    category: 'operations',
    defaultEnabled: true,
    menuIds: ['student_archive'],
    staffPermissionIds: ['student_archive'],
  },
  {
    key: 'behavior_management',
    labelAr: 'السلوك والتبليغات',
    labelEn: 'Behavior',
    category: 'academic',
    defaultEnabled: true,
    menuIds: ['behavior'],
    staffPermissionIds: ['behavior'],
  },
  {
    key: 'student_evaluation_reports',
    labelAr: 'تقارير التقييم',
    labelEn: 'Evaluation Reports',
    category: 'academic',
    defaultEnabled: true,
    menuIds: ['evaluation_reports'],
    staffPermissionIds: ['evaluation_reports'],
  },
  {
    key: 'advanced_reports',
    labelAr: 'تقارير متقدمة',
    labelEn: 'Advanced Reports',
    category: 'advanced',
    defaultEnabled: false,
    menuIds: ['advanced_reports'],
    staffPermissionIds: ['advanced_reports'],
  },
  {
    key: 'automated_schedules',
    labelAr: 'الجداول الدراسية',
    labelEn: 'Schedules',
    category: 'academic',
    defaultEnabled: false,
    menuIds: ['schedules'],
    staffPermissionIds: ['schedules'],
  },
  {
    key: 'school_subjects',
    labelAr: 'المواد الدراسية المعتمدة',
    labelEn: 'School Subjects',
    category: 'academic',
    descriptionAr: 'إدارة المواد الدراسية المعتمدة داخل إعدادات المدرسة',
    descriptionEn: 'Manage approved school subjects inside school settings',
    defaultEnabled: true,
    menuIds: [],
  },
  {
    key: 'dismissal_smart_gate',
    labelAr: 'البوابة الذكية / التسريح الآمن',
    labelEn: 'Smart Gate / Safe Dismissal',
    category: 'operations',
    descriptionAr: 'نظام تسريح الطلاب الآمن عند البوابة',
    descriptionEn: 'Safe student dismissal at the school gate',
    defaultEnabled: true,
    menuIds: ['dismissal_gate'],
    staffPermissionIds: ['dismissal_gate'],
  },
  {
    key: 'announcements',
    labelAr: 'الإعلانات والتعليمات',
    labelEn: 'Announcements',
    category: 'communication',
    defaultEnabled: true,
    menuIds: ['announcements'],
    staffPermissionIds: ['announcements'],
  },
  {
    key: 'parent_app_access',
    labelAr: 'تطبيق أولياء الأمور',
    labelEn: 'Parent App Access',
    category: 'communication',
    defaultEnabled: true,
    menuIds: ['parents'],
    staffPermissionIds: ['parents'],
  },
  {
    key: 'tuition_fees',
    labelAr: 'أقساط الطلاب',
    labelEn: 'Tuition & Fees',
    category: 'finance',
    defaultEnabled: false,
    menuIds: ['tuition'],
    staffPermissionIds: ['tuition'],
  },
  {
    key: 'staff_payroll',
    labelAr: 'الرواتب والمالية',
    labelEn: 'Payroll',
    category: 'finance',
    defaultEnabled: false,
    menuIds: ['payroll'],
    staffPermissionIds: ['payroll'],
  },
  {
    key: 'inventory_and_assets',
    labelAr: 'مخزن المدرسة',
    labelEn: 'Inventory',
    category: 'finance',
    defaultEnabled: false,
    menuIds: ['inventory'],
    staffPermissionIds: ['inventory'],
  },
  {
    key: 'marketplace_ordering',
    labelAr: 'المتجر الداخلي',
    labelEn: 'Marketplace',
    category: 'operations',
    defaultEnabled: true,
    menuIds: ['market'],
    staffPermissionIds: ['market'],
  },
  {
    key: 'id_card_generation',
    labelAr: 'هويات الطالب',
    labelEn: 'ID Cards',
    category: 'operations',
    defaultEnabled: false,
    menuIds: ['id_cards'],
    staffPermissionIds: ['id_cards'],
  },
  {
    key: 'assistants_manage',
    labelAr: 'إدارة المساعدين',
    labelEn: 'Assistants Management',
    category: 'core',
    defaultEnabled: false,
    menuIds: ['assistants'],
    adminOnly: true,
  },
  {
    key: 'settings',
    labelAr: 'الإعدادات العامة',
    labelEn: 'Settings',
    category: 'core',
    defaultEnabled: true,
    menuIds: ['settings'],
    staffPermissionIds: ['settings'],
  },
];

/** Display labels for staff permission ids (may differ from feature labels). */
const STAFF_PERMISSION_LABELS: Record<string, { labelAr: string; labelEn: string }> = {
  students: { labelAr: 'إدارة الطلاب', labelEn: 'Manage Students' },
  classes: { labelAr: 'إدارة الصفوف', labelEn: 'Manage Classes' },
  parents: { labelAr: 'حسابات أولياء الأمور', labelEn: 'Parent Accounts' },
  staff: { labelAr: 'الموظفين والمعلمين', labelEn: 'Staff & Teachers' },
  tuition: { labelAr: 'أقساط الطلاب', labelEn: 'Tuition' },
  behavior: { labelAr: 'السلوك والتبليغات', labelEn: 'Behavior' },
  attendance: { labelAr: 'الحضور والغياب', labelEn: 'Attendance' },
  grades: { labelAr: 'النتائج والدرجات', labelEn: 'Grades' },
  homework: { labelAr: 'الواجبات والمهام', labelEn: 'Homework' },
  schedules: { labelAr: 'الجداول الدراسية', labelEn: 'Schedules' },
  evaluation_reports: { labelAr: 'تقارير التقييم', labelEn: 'Evaluation Reports' },
  advanced_reports: { labelAr: 'تقارير متقدمة', labelEn: 'Advanced Reports' },
  announcements: { labelAr: 'الإعلانات والتعليمات', labelEn: 'Announcements' },
  payroll: { labelAr: 'الرواتب والمالية', labelEn: 'Payroll' },
  inventory: { labelAr: 'مخزن المدرسة', labelEn: 'Inventory' },
  market: { labelAr: 'المتجر الداخلي', labelEn: 'Marketplace' },
  id_cards: { labelAr: 'هويات الطالب', labelEn: 'ID Cards' },
  student_archive: { labelAr: 'أرشيف الطالب', labelEn: 'Student Archive' },
  dismissal_gate: { labelAr: 'البوابة الذكية / التسريح الآمن', labelEn: 'Smart Gate / Safe Dismissal' },
  settings: { labelAr: 'الإعدادات العامة', labelEn: 'Settings' },
};

const featureByKey = new Map(SCHOOL_FEATURES.map((f) => [f.key, f]));

const legacyToCanonical = new Map<string, string>();
SCHOOL_FEATURES.forEach((f) => {
  f.legacyKeys?.forEach((legacy) => legacyToCanonical.set(legacy, f.key));
});

/** Admin menu tab id → package permission keys (any enabled grants access) */
const menuToPackageKeys: Record<string, string[]> = {};
SCHOOL_FEATURES.forEach((f) => {
  f.menuIds.forEach((menuId) => {
    if (!menuToPackageKeys[menuId]) menuToPackageKeys[menuId] = [];
    if (!menuToPackageKeys[menuId].includes(f.key)) {
      menuToPackageKeys[menuId].push(f.key);
    }
  });
});

/** Staff permission id → package permission keys */
const staffToPackageKeys: Record<string, string[]> = {};
SCHOOL_FEATURES.forEach((f) => {
  f.staffPermissionIds?.forEach((staffId) => {
    if (!staffToPackageKeys[staffId]) staffToPackageKeys[staffId] = [];
    if (!staffToPackageKeys[staffId].includes(f.key)) {
      staffToPackageKeys[staffId].push(f.key);
    }
  });
});

/** Teacher sidebar item id → package key */
const teacherMenuToPackageKey: Record<string, string> = {
  homework: 'homework_and_tasks',
  grades: 'exams_and_results',
  behavior: 'behavior_management',
  reports: 'student_evaluation_reports',
  advanced_reports: 'advanced_reports',
  schedules: 'automated_schedules',
  id_cards: 'id_card_generation',
  market: 'marketplace_ordering',
  dismissal: 'dismissal_smart_gate',
};

export function buildDefaultPackagePermissions(): PackagePermissions {
  const perms: PackagePermissions = {};
  SCHOOL_FEATURES.forEach((f) => {
    perms[f.key] = f.defaultEnabled;
  });
  return perms;
}

/**
 * Merge stored package permissions with defaults and legacy aliases.
 * Missing keys inherit defaultEnabled; explicit false disables.
 */
export function normalizePackagePermissions(
  raw: PackagePermissions | null | undefined,
): PackagePermissions {
  const defaults = buildDefaultPackagePermissions();
  if (!raw || typeof raw !== 'object') return defaults;

  const normalized: PackagePermissions = { ...defaults };

  Object.entries(raw).forEach(([key, value]) => {
    const canonical = legacyToCanonical.get(key) || key;
    if (featureByKey.has(canonical)) {
      normalized[canonical] = value;
    } else if (key in defaults) {
      normalized[key] = value;
    }
  });

  return normalized;
}

export function isPackageFeatureEnabled(
  key: string,
  perms: PackagePermissions | undefined,
): boolean {
  if (!perms || typeof perms !== 'object') return true;
  const normalized = normalizePackagePermissions(perms);
  return normalized[key] !== false;
}

export function menuIdToPackageKeys(menuId: string): string[] {
  return menuToPackageKeys[menuId] || [];
}

export function staffPermissionToPackageKeys(staffId: string): string[] {
  return staffToPackageKeys[staffId] || [staffId];
}

export function isMenuFeatureEnabled(
  menuId: string,
  perms: PackagePermissions | undefined,
): boolean {
  if (menuId === 'overview') return true;
  const keys = menuIdToPackageKeys(menuId);
  if (keys.length === 0) return true;
  return keys.some((key) => isPackageFeatureEnabled(key, perms));
}

export function isStaffPermissionAllowedByPackage(
  staffPermId: string,
  perms: PackagePermissions | undefined,
): boolean {
  const keys = staffPermissionToPackageKeys(staffPermId);
  return keys.some((key) => isPackageFeatureEnabled(key, perms));
}

export function isTeacherMenuFeatureEnabled(
  menuId: string,
  perms: PackagePermissions | undefined,
): boolean {
  if (menuId === 'home' || menuId === 'chat') return true;
  const key = teacherMenuToPackageKey[menuId];
  if (!key) return true;
  return isPackageFeatureEnabled(key, perms);
}

export function getFeaturesByCategory(): Record<FeatureCategory, SchoolFeature[]> {
  const grouped = {} as Record<FeatureCategory, SchoolFeature[]>;
  (Object.keys(FEATURE_CATEGORIES) as FeatureCategory[]).forEach((cat) => {
    grouped[cat] = SCHOOL_FEATURES.filter((f) => f.category === cat);
  });
  return grouped;
}

/**
 * Flat ordered list for Super Admin package permission checkboxes.
 * Preserves legacy permission order and appends newer module keys explicitly.
 */
export const PACKAGE_PERMISSION_CHECKBOX_ORDER: string[] = [
  'overview',
  'daily_summary',
  'chat',
  'students_view',
  'students_edit',
  'staff_manage',
  'attendance_track',
  'exams_and_results',
  'student_archive',
  'tuition_fees',
  'staff_payroll',
  'inventory_and_assets',
  'behavior_management',
  'student_evaluation_reports',
  'homework_and_tasks',
  'classes',
  'automated_schedules',
  'school_subjects',
  'announcements',
  'parent_app_access',
  'advanced_reports',
  'marketplace_ordering',
  'id_card_generation',
  'assistants_manage',
  'settings',
  'dismissal_smart_gate',
];

export function getPackagePermissionCheckboxFeatures(): SchoolFeature[] {
  const byKey = new Map(SCHOOL_FEATURES.map((f) => [f.key, f]));
  const ordered = PACKAGE_PERMISSION_CHECKBOX_ORDER.map((key) => byKey.get(key)).filter(
    (f): f is SchoolFeature => Boolean(f),
  );
  const known = new Set(PACKAGE_PERMISSION_CHECKBOX_ORDER);
  const extras = SCHOOL_FEATURES.filter((f) => !known.has(f.key));
  return [...ordered, ...extras];
}

export type StaffPermissionOption = { id: string; label: string; labelEn: string };

/** Staff picker options derived from registry, filtered by active package. */
export function getStaffPermissionOptions(
  packagePerms: PackagePermissions | undefined,
  isRtl = true,
): StaffPermissionOption[] {
  const seen = new Set<string>();
  const options: StaffPermissionOption[] = [];

  SCHOOL_FEATURES.forEach((f) => {
    f.staffPermissionIds?.forEach((staffId) => {
      if (seen.has(staffId)) return;
      if (!isStaffPermissionAllowedByPackage(staffId, packagePerms)) return;
      seen.add(staffId);
      const labels = STAFF_PERMISSION_LABELS[staffId];
      options.push({
        id: staffId,
        label: labels?.labelAr || f.labelAr,
        labelEn: labels?.labelEn || f.labelEn,
      });
    });
  });

  return options.sort((a, b) =>
    (isRtl ? a.label : a.labelEn).localeCompare(isRtl ? b.label : b.labelEn, isRtl ? 'ar' : 'en'),
  );
}

export function getFeatureLabel(
  key: string,
  isRtl = true,
): string {
  const feature = featureByKey.get(key);
  if (!feature) return key;
  return isRtl ? feature.labelAr : feature.labelEn;
}

export function isSchoolSubjectsEnabled(perms: PackagePermissions | undefined): boolean {
  return isPackageFeatureEnabled('school_subjects', perms);
}
