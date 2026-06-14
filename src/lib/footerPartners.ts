export type FooterPartner = {
  id: string;
  name: string;
  logoUrl: string;
  link?: string;
};

function safeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Partners from Super Admin → شركاء النجاح (system/config.successPartners). */
export function normalizeSuccessPartners(
  partners?: { name?: string; logoUrl?: string; link?: string }[] | null,
): FooterPartner[] {
  if (!Array.isArray(partners)) return [];
  return partners
    .map((partner, idx) => ({
      id: `success-${idx}`,
      name: safeString(partner?.name),
      logoUrl: safeString(partner?.logoUrl),
      link: safeString(partner?.link),
    }))
    .filter((partner) => partner.logoUrl.length > 0);
}

/** Circular linked partners from Super Admin → شركائنا (system/config.ourPartners). */
export function normalizeOurPartners(
  partners?: { name?: string; logoUrl?: string; link?: string; active?: boolean }[] | null,
): FooterPartner[] {
  if (!Array.isArray(partners)) return [];
  return partners
    .map((partner, idx) => ({
      id: `our-${idx}`,
      name: safeString(partner?.name),
      logoUrl: safeString(partner?.logoUrl),
      link: safeString(partner?.link),
      active: partner?.active !== false,
    }))
    .filter((partner) => partner.active && partner.logoUrl.length > 0);
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
