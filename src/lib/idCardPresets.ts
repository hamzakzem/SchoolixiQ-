import type { IdCardTemplate } from '../types/idCardTemplate';

export type IdCardLayoutId = IdCardTemplate['layout'];

export type LayoutPreset = {
  id: IdCardLayoutId;
  nameAr: string;
  nameEn: string;
  preview: { from: string; to: string; accent: string };
  descriptionAr: string;
};

export const ID_CARD_LAYOUTS: LayoutPreset[] = [
  { id: 'corporate', nameAr: 'احترافي', nameEn: 'Corporate', preview: { from: '#f8fafc', to: '#ffffff', accent: '#0B2345' }, descriptionAr: 'رأسية واضحة وإطار رسمي' },
  { id: 'executive', nameAr: 'تنفيذي', nameEn: 'Executive', preview: { from: '#f1f5f9', to: '#e2e8f0', accent: '#4f46e5' }, descriptionAr: 'بطاقة فاخرة بظلال ناعمة' },
  { id: 'glass', nameAr: 'زجاجي', nameEn: 'Glass', preview: { from: '#e0e7ff', to: '#f8fafc', accent: '#6366f1' }, descriptionAr: 'شفافية عصرية مع ضبابية' },
  { id: 'gradient', nameAr: 'تدرج عصري', nameEn: 'Gradient', preview: { from: '#0B2345', to: '#1e3a8a', accent: '#D4A64A' }, descriptionAr: 'تدرج لوني جريء' },
  { id: 'dark', nameAr: 'داكن فاخر', nameEn: 'Luxury Dark', preview: { from: '#0f172a', to: '#1e293b', accent: '#D4A64A' }, descriptionAr: 'خلفية داكنة وأنيقة' },
  { id: 'minimal', nameAr: 'تعليمي بسيط', nameEn: 'Minimal', preview: { from: '#ffffff', to: '#f8fafc', accent: '#64748b' }, descriptionAr: 'خطوط نظيفة وبساطة' },
  { id: 'academy', nameAr: 'أكاديمي', nameEn: 'Academy', preview: { from: '#ffffff', to: '#f0f9ff', accent: '#0284c7' }, descriptionAr: 'شريط جانبي مدرسي' },
  { id: 'royal', nameAr: 'ملكي', nameEn: 'Royal', preview: { from: '#fffbeb', to: '#ffffff', accent: '#0B2345' }, descriptionAr: 'لمسات ذهبية راقية' },
  { id: 'spotlight', nameAr: 'بروز الصورة', nameEn: 'Spotlight', preview: { from: '#faf5ff', to: '#ffffff', accent: '#7c3aed' }, descriptionAr: 'تركيز على صورة الطالب' },
  { id: 'heritage', nameAr: 'كلاسيكي', nameEn: 'Heritage', preview: { from: '#fff7ed', to: '#ffffff', accent: '#9a3412' }, descriptionAr: 'إطار مزدوج كلاسيكي' },
  { id: 'wave', nameAr: 'موجي', nameEn: 'Wave', preview: { from: '#ecfeff', to: '#ffffff', accent: '#0891b2' }, descriptionAr: 'رأسية بموجة ناعمة' },
  { id: 'horizontal', nameAr: 'أفقي', nameEn: 'Horizontal', preview: { from: '#f8fafc', to: '#ffffff', accent: '#0B2345' }, descriptionAr: 'تصميم عرضي للبطاقات العريضة' },
];

export const COLOR_PRESETS: { nameAr: string; colors: IdCardTemplate['colors'] }[] = [
  { nameAr: 'SchoolixiQ', colors: { primary: '#0B2345', secondary: '#D4A64A', background: '#ffffff', text: '#1e293b', border: '#e2e8f0', headerText: '#ffffff' } },
  { nameAr: 'أزرق أكاديمي', colors: { primary: '#1d4ed8', secondary: '#60a5fa', background: '#f8fafc', text: '#0f172a', border: '#cbd5e1', headerText: '#ffffff' } },
  { nameAr: 'أخضر طبيعي', colors: { primary: '#047857', secondary: '#34d399', background: '#ffffff', text: '#14532d', border: '#d1fae5', headerText: '#ffffff' } },
  { nameAr: 'بنفسجي عصري', colors: { primary: '#6d28d9', secondary: '#a78bfa', background: '#faf5ff', text: '#4c1d95', border: '#e9d5ff', headerText: '#ffffff' } },
  { nameAr: 'داكن ذهبي', colors: { primary: '#0B2345', secondary: '#D4A64A', background: '#0f172a', text: '#f1f5f9', border: '#334155', headerText: '#D4A64A' } },
];

export const ELEMENT_TOGGLE_KEYS = [
  'schoolLogo', 'studentPhoto', 'qrCode', 'barcode', 'grade', 'className',
  'examNumber', 'issueDate', 'expiryDate', 'signature', 'stamp',
  'parentPhone', 'parentEmail', 'driverPhone', 'carNumber',
  'guardianName', 'driverName', 'schoolPhone',
] as const;

export const ELEMENT_LABELS_AR: Record<string, string> = {
  schoolLogo: 'شعار المدرسة',
  studentPhoto: 'صورة الطالب',
  qrCode: 'رمز QR',
  barcode: 'الباركود',
  grade: 'الصف',
  className: 'الشعبة',
  examNumber: 'الرقم الامتحاني',
  issueDate: 'تاريخ الإصدار',
  expiryDate: 'تاريخ الانتهاء',
  signature: 'توقيع الإدارة',
  stamp: 'الختم',
  parentPhone: 'هاتف ولي الأمر',
  parentEmail: 'إيميل ولي الأمر',
  driverPhone: 'هاتف السائق',
  carNumber: 'رقم السيارة',
  guardianName: 'اسم ولي الأمر',
  driverName: 'اسم السائق',
  schoolPhone: 'هاتف المدرسة',
};

export const ELEMENT_LABELS_EN: Record<string, string> = {
  schoolLogo: 'School Logo',
  studentPhoto: 'Student Photo',
  qrCode: 'QR Code',
  barcode: 'Barcode',
  grade: 'Grade',
  className: 'Class',
  examNumber: 'Exam Number',
  issueDate: 'Issue Date',
  expiryDate: 'Expiry Date',
  signature: 'Signature',
  stamp: 'Stamp',
  parentPhone: 'Parent Phone',
  parentEmail: 'Parent Email',
  driverPhone: 'Driver Phone',
  carNumber: 'Car Number',
  guardianName: 'Guardian Name',
  driverName: 'Driver Name',
  schoolPhone: 'School Phone',
};

export const GOOGLE_FONT_FAMILIES = [
  'Cairo', 'Tajawal', 'Almarai', 'Changa', 'IBM Plex Sans Arabic', 'Noto Sans Arabic', 'Amiri', 'Rubik',
  'Inter', 'Poppins', 'Roboto', 'Montserrat', 'Open Sans', 'Nunito', 'Lato',
];

export const DEFAULT_ID_CARD_TEMPLATE: IdCardTemplate = {
  layout: 'corporate',
  size: 'pvc',
  customSize: { width: 54, height: 86 },
  photoSettings: {
    shape: 'rounded',
    width: 44,
    height: 48,
    borderThickness: 2,
    borderColor: '#ffffff',
    frameStyle: 'modern',
    fitMode: 'cover',
    position: 'center',
  },
  colors: COLOR_PRESETS[0].colors,
  fonts: { family: 'Cairo', size: 'medium', weight: 'bold', customFonts: [] },
  elements: {
    schoolLogo: true,
    studentPhoto: true,
    qrCode: true,
    barcode: false,
    grade: true,
    className: true,
    examNumber: false,
    issueDate: false,
    expiryDate: true,
    signature: false,
    stamp: false,
    parentPhone: true,
    parentEmail: false,
    driverPhone: false,
    carNumber: false,
    guardianName: true,
    driverName: true,
    schoolPhone: true,
  },
  background: {
    type: 'solid',
    imageUrl: '',
    watermarkText: '',
    watermarkOpacity: 0.12,
    watermarkScale: 80,
  },
  printSettings: {
    doubleSided: false,
    copies: 1,
    showCropMarks: false,
    quality: 'high',
  },
};
