import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { motion } from 'motion/react';
import { db } from '../../lib/firebase';
import {
  excludePartnersByLogo,
  isHttpLogoUrl,
  normalizeFeaturedSchoolPartners,
  normalizeOurPartners,
  normalizeSuccessPartners,
  type FooterPartner,
} from '../../lib/footerPartners';
import { prefersReducedMotion } from '../../lib/motion';

function PartnerCarouselCard({ partner }: { partner: FooterPartner }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = isHttpLogoUrl(partner.logoUrl) && !logoFailed;
  const initial = (partner.name || 'ش').trim().charAt(0);

  const card = (
    <div className="landing-partner-carousel-card">
      <div className="landing-partner-carousel-card__logo">
        {showLogo ? (
          <img
            src={partner.logoUrl}
            alt={partner.name}
            className="w-full h-full object-contain p-1"
            loading="lazy"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <span className="text-2xl font-black text-[#d4af37]">{initial}</span>
        )}
      </div>
      <p className="landing-partner-carousel-card__name">{partner.name}</p>
    </div>
  );

  if (partner.link) {
    return (
      <a href={partner.link} target="_blank" rel="noopener noreferrer" className="no-underline shrink-0">
        {card}
      </a>
    );
  }
  return <div className="shrink-0">{card}</div>;
}

export function LandingPartnersSection({
  successPartners,
  ourPartners,
  title,
  subtitle,
  showPartners,
}: {
  successPartners: FooterPartner[];
  ourPartners: FooterPartner[];
  title: string;
  subtitle: string;
  showPartners: boolean;
}) {
  const reduced = prefersReducedMotion();
  const [featuredSchoolPartners, setFeaturedSchoolPartners] = useState<FooterPartner[]>([]);

  const premiumSuccess = successPartners.length ? successPartners : featuredSchoolPartners;

  const displayPartners = useMemo(() => {
    const ourFiltered = excludePartnersByLogo(ourPartners, premiumSuccess);
    return [...premiumSuccess, ...ourFiltered];
  }, [premiumSuccess, ourPartners]);

  useEffect(() => {
    if (successPartners.length > 0 || !showPartners) {
      setFeaturedSchoolPartners([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const schoolsQ = query(
          collection(db, 'schools'),
          where('featured', '==', true),
          where('status', '==', 'active'),
          limit(12),
        );
        const snap = await getDocs(schoolsQ);
        if (cancelled) return;
        setFeaturedSchoolPartners(
          normalizeFeaturedSchoolPartners(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })),
          ),
        );
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [successPartners.length, showPartners]);

  if (!showPartners) return null;
  if (!displayPartners.length) {
    if (!import.meta.env.DEV) return null;
    return (
      <section id="partners" className="landing-partners-section">
        <div className="lp-container">
          <div className="lp-card p-8 text-center text-[#94a3b8] text-sm">
            لا توجد شعارات شركاء — أضفها من إعدادات السوبر أدمن
          </div>
        </div>
      </section>
    );
  }

  const doubled = [...displayPartners, ...displayPartners];

  return (
    <section id="partners" className="landing-partners-section" aria-labelledby="landing-partners-heading">
      <div className="lp-container">
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="text-center max-w-2xl mx-auto mb-10"
        >
          <p className="lp-eyebrow">الشركاء</p>
          <h2 id="landing-partners-heading" className="lp-section-title lp-title-gold">
            {title}
          </h2>
          <p className="lp-section-subtitle">{subtitle}</p>
        </motion.div>

        <div className="landing-partners-carousel-wrap" aria-label="شركاء النجاح">
          <div className={`landing-partners-carousel-track ${reduced ? '' : 'landing-partners-carousel-track--animate'}`}>
            {doubled.map((partner, idx) => (
              <PartnerCarouselCard key={`${partner.id}-${idx}`} partner={partner} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function useLandingPartners(systemConfig: {
  successPartners?: unknown;
  ourPartners?: unknown;
}) {
  const successPartners = useMemo(
    () => normalizeSuccessPartners(systemConfig.successPartners as Parameters<typeof normalizeSuccessPartners>[0]),
    [systemConfig.successPartners],
  );
  const ourPartners = useMemo(
    () => normalizeOurPartners(systemConfig.ourPartners as Parameters<typeof normalizeOurPartners>[0]),
    [systemConfig.ourPartners],
  );
  return { successPartners, ourPartners };
}
