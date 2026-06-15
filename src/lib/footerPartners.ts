export type FooterPartner = {
  id: string;
  name: string;
  logoUrl: string;
  link?: string;
  description?: string;
  active?: boolean;
};

export const PARTNER_DESCRIPTION_FALLBACK =
  'شريك يساهم معنا في تطوير البيئة التعليمية.';

function safeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

type RawPartner = {
  name?: string;
  logoUrl?: string;
  link?: string;
  description?: string;
  active?: boolean;
};

function mapFooterPartner(partner: RawPartner, idx: number, prefix: string): FooterPartner {
  return {
    id: `${prefix}-${idx}`,
    name: safeString(partner?.name),
    logoUrl: safeString(partner?.logoUrl),
    link: safeString(partner?.link) || undefined,
    description: safeString(partner?.description) || undefined,
    active: partner?.active !== false,
  };
}

/** Partners from Super Admin → شركاء النجاح (system/config.successPartners). */
export function normalizeSuccessPartners(partners?: RawPartner[] | null): FooterPartner[] {
  if (!Array.isArray(partners)) return [];
  return partners
    .map((partner, idx) => mapFooterPartner(partner, idx, 'success'))
    .filter((partner) => partner.active !== false && partner.logoUrl.length > 0);
}

/** Circular linked partners from Super Admin → شركائنا (system/config.ourPartners). */
export function normalizeOurPartners(partners?: RawPartner[] | null): FooterPartner[] {
  if (!Array.isArray(partners)) return [];
  return partners
    .map((partner, idx) => mapFooterPartner(partner, idx, 'our'))
    .filter((partner) => partner.active !== false && partner.logoUrl.length > 0);
}

export function hasConfiguredFooterPartners(config: {
  successPartners?: { logoUrl?: string }[];
  ourPartners?: { logoUrl?: string; active?: boolean }[];
}): boolean {
  return (
    normalizeSuccessPartners(config.successPartners).length > 0 ||
    normalizeOurPartners(config.ourPartners).length > 0
  );
}
