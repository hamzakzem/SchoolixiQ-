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
  title?: string;
  logoUrl?: string;
  logo?: string;
  image?: string;
  imageUrl?: string;
  link?: string;
  url?: string;
  description?: string;
  active?: boolean;
  visible?: boolean;
};

function resolvePartnerLogoUrl(partner: RawPartner): string {
  return (
    safeString(partner.logoUrl) ||
    safeString(partner.logo) ||
    safeString(partner.image) ||
    safeString(partner.imageUrl)
  );
}

function resolvePartnerName(partner: RawPartner): string {
  return safeString(partner.name) || safeString(partner.title);
}

function resolvePartnerLink(partner: RawPartner): string | undefined {
  const link = safeString(partner.link) || safeString(partner.url);
  return link || undefined;
}

function resolvePartnerActive(partner: RawPartner): boolean {
  if (partner.active === false) return false;
  if (partner.visible === false) return false;
  return true;
}

function mapFooterPartner(partner: RawPartner, idx: number, prefix: string): FooterPartner {
  return {
    id: `${prefix}-${idx}`,
    name: resolvePartnerName(partner),
    logoUrl: resolvePartnerLogoUrl(partner),
    link: resolvePartnerLink(partner),
    description: safeString(partner.description) || undefined,
    active: resolvePartnerActive(partner),
  };
}

/** Partners from Super Admin → شركاء النجاح (system/config.successPartners). */
export function normalizeSuccessPartners(partners?: RawPartner[] | null): FooterPartner[] {
  if (!Array.isArray(partners)) return [];
  const mapped = partners.map((partner, idx) => mapFooterPartner(partner, idx, 'success'));
  const filtered = mapped.filter(
    (partner) => partner.active !== false && partner.logoUrl.length > 0,
  );

  if (import.meta.env.DEV && partners.length > 0) {
    console.log('[SuccessPartners] NORMALIZE', {
      rawCount: partners.length,
      normalizedCount: filtered.length,
      dropped: mapped
        .filter((partner) => partner.active === false || partner.logoUrl.length === 0)
        .map((partner) => ({
          name: partner.name,
          hasLogo: partner.logoUrl.length > 0,
          active: partner.active,
        })),
    });
  }

  return filtered;
}

/** Circular linked partners from Super Admin → شركائنا (system/config.ourPartners). */
export function normalizeOurPartners(partners?: RawPartner[] | null): FooterPartner[] {
  if (!Array.isArray(partners)) return [];
  return partners
    .map((partner, idx) => mapFooterPartner(partner, idx, 'our'))
    .filter((partner) => partner.active !== false && partner.logoUrl.length > 0);
}

/** Legacy display path: featured active schools (Super Admin star = شركاء النجاح). */
export function normalizeFeaturedSchoolPartners(
  schools: Array<{
    id: string;
    name?: string;
    logoUrl?: string;
    googleMapsUrl?: string;
    featured?: boolean;
    status?: string;
  }>,
): FooterPartner[] {
  return schools
    .filter(
      (school) =>
        school.featured === true &&
        school.status === 'active' &&
        resolvePartnerLogoUrl(school).length > 0,
    )
    .map((school, idx) => ({
      id: `featured-${school.id || idx}`,
      name: resolvePartnerName(school),
      logoUrl: resolvePartnerLogoUrl(school),
      link: safeString(school.googleMapsUrl) || undefined,
      active: true,
    }));
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
