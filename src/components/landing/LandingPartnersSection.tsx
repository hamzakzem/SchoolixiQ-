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
import { SuccessPartnersSection } from '../SuccessPartnersSection';

function PartnerScrollChip({ partner }: { partner: FooterPartner }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = isHttpLogoUrl(partner.logoUrl) && !logoFailed;
  const initial = (partner.name || 'ش').trim().charAt(0);

  const inner = (
    <div className="landing-partner-chip lp-card">
      <div className="w-14 h-14 mx-auto mb-3 rounded-full border border-[rgba(212,175,55,0.28)] bg-[#081f3d] flex items-center justify-center overflow-hidden">
        {showLogo ? (
          <img
            src={partner.logoUrl}
            alt={partner.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <span className="text-xl font-black text-[#d4af37]">{initial}</span>
        )}
      </div>
      <p className="text-sm font-bold text-white truncate">{partner.name}</p>
    </div>
  );

  if (partner.link) {
    return (
      <a href={partner.link} target="_blank" rel="noopener noreferrer" className="no-underline">
        {inner}
      </a>
    );
  }
  return inner;
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
  const premiumSource: 'config' | 'featured-schools' | null = successPartners.length
    ? 'config'
    : featuredSchoolPartners.length
      ? 'featured-schools'
      : null;

  const premiumOur = useMemo(
    () => excludePartnersByLogo(ourPartners, premiumSuccess),
    [ourPartners, premiumSuccess],
  );

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

  const allForScroll = [...premiumSuccess, ...premiumOur];
  const hasPartners = allForScroll.length > 0;

  return (
    <section id="partners" className="py-20 lg:py-28" aria-labelledby="landing-partners-heading">
      <div className="lp-container">
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <p className="lp-eyebrow">الشركاء</p>
          <h2 id="landing-partners-heading" className="lp-section-title">
            {title}
          </h2>
          <p className="lp-section-subtitle">{subtitle}</p>
        </motion.div>

        {hasPartners ? (
          <>
            {premiumSuccess.length > 0 && premiumSource && (
              <SuccessPartnersSection
                partners={premiumSuccess}
                source={premiumSource}
                variant="success"
                theme="dark"
                title={title}
                subtitle={subtitle}
                hideHeader
              />
            )}
            {premiumOur.length > 0 && (
              <div className="mt-8">
                <p className="text-center text-xs font-bold text-[#94a3b8] mb-4 uppercase tracking-widest">شركاؤنا</p>
                <div className="landing-partners-scroll">
                  {premiumOur.map((p) => (
                    <PartnerScrollChip key={p.id} partner={p} />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : import.meta.env.DEV ? (
          <div className="lp-card p-10 text-center text-[#94a3b8] text-sm">
            لا توجد شعارات شركاء — أضفها من إعدادات السوبر أدمن
          </div>
        ) : null}
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
