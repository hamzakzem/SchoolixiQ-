import type { IdCardTemplate } from '../types/idCardTemplate';

/**
 * The look of an ID card before the school customises anything. Used by the settings
 * screen and by every place that draws a card: a school that never saved a template
 * used to get a blank card (the layout engine returned nothing without a template).
 */
export const DEFAULT_ID_CARD_TEMPLATE: IdCardTemplate = {
  layout: 'corporate',
  size: 'pvc',
  customSize: { width: 54, height: 86 },
  colors: { primary: '#4f46e5', secondary: '#000000', background: '#ffffff', text: '#1e293b', border: '#e2e8f0' },
  fonts: { family: 'Inter', size: 'medium', weight: 'normal' },
  elements: {
    schoolLogo: true, studentPhoto: true, qrCode: true, barcode: false, grade: true, className: true,
    examNumber: false, issueDate: false, expiryDate: true, signature: false, stamp: false,
    parentPhone: true, parentEmail: false, driverPhone: false, carNumber: false,
    guardianName: true, driverName: true, schoolPhone: true,
  },
  background: { type: 'solid', imageUrl: '', watermarkText: '' },
  printSettings: { doubleSided: false, copies: 1, showCropMarks: false, quality: 'high' },
} as IdCardTemplate;
