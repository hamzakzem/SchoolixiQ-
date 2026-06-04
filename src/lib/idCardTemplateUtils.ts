import type { IdCardTemplate } from '../types/idCardTemplate';
import { DEFAULT_ID_CARD_TEMPLATE } from './idCardPresets';

/** Deep-merge Firestore/partial template with safe defaults so preview & print never break. */
export function mergeIdCardTemplate(
  partial?: Partial<IdCardTemplate> | null,
): IdCardTemplate {
  if (!partial) return { ...DEFAULT_ID_CARD_TEMPLATE };

  return {
    ...DEFAULT_ID_CARD_TEMPLATE,
    ...partial,
    colors: { ...DEFAULT_ID_CARD_TEMPLATE.colors, ...partial.colors },
    fonts: { ...DEFAULT_ID_CARD_TEMPLATE.fonts, ...partial.fonts },
    elements: { ...DEFAULT_ID_CARD_TEMPLATE.elements, ...partial.elements },
    photoSettings: {
      ...DEFAULT_ID_CARD_TEMPLATE.photoSettings,
      ...partial.photoSettings,
    },
    background: {
      ...DEFAULT_ID_CARD_TEMPLATE.background,
      ...partial.background,
    },
    printSettings: {
      ...DEFAULT_ID_CARD_TEMPLATE.printSettings,
      ...partial.printSettings,
    },
    customSize: partial.customSize ?? DEFAULT_ID_CARD_TEMPLATE.customSize,
  };
}
