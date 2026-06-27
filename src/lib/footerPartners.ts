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

/** Only Firebase Storage / external HTTPS URLs — never base64/data URIs. */
export function isHttpLogoUrl(url: string | undefined | null): boolean {
  const value = safeString(url);
  if (!value || /^data:/i.test(value)) return false;
  return /^https?:\/\//i.test(value);
}

export function sanitizePartnerLogoUrl(url: string | undefined | null): string {
  return isHttpLogoUrl(url) ? safeString(url) : '';
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
  const raw =
    safeString(partner.logoUrl) ||
    safeString(partner.logo) ||
    safeString(partner.image) ||
    safeString(partner.imageUrl);
  return sanitizePartnerLogoUrl(raw);
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
    (partner) =>
      partner.active !== false &&
      (partner.logoUrl.length > 0 || partner.name.length > 0),
  );

  if (import.meta.env.DEV && partners.length > 0) {
    console.log('[SuccessPartners] NORMALIZE', {
      rawCount: partners.length,
      normalizedCount: filtered.length,
      dropped: mapped
        .filter((partner) => partner.active === false || (partner.logoUrl.length === 0 && partner.name.length === 0))
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
    .filter(
      (partner) =>
        partner.active !== false &&
        (partner.logoUrl.length > 0 || partner.name.length > 0),
    );
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

export function dedupePartnersByLogo(partners: FooterPartner[]): FooterPartner[] {
  const seen = new Set<string>();
  const result: FooterPartner[] = [];
  for (const partner of partners) {
    const key = partner.logoUrl.trim().toLowerCase() || partner.id;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(partner);
  }
  return result;
}

export function excludePartnersByLogo(
  partners: FooterPartner[],
  exclude: FooterPartner[],
): FooterPartner[] {
  const excludeKeys = new Set(
    exclude.map((partner) => partner.logoUrl.trim().toLowerCase() || partner.id),
  );
  return partners.filter((partner) => {
    const key = partner.logoUrl.trim().toLowerCase() || partner.id;
    return !excludeKeys.has(key);
  });
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
