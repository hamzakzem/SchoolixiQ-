import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import {
  isHttpLogoUrl,
  PARTNER_DESCRIPTION_FALLBACK,
  type FooterPartner,
} from '../lib/footerPartners';
import { prefersReducedMotion } from '../lib/motion';

const SUBTITLE =
  'نفخر بشراكاتنا مع مؤسسات رائدة تشاركنا رؤيتنا في بناء مستقبل أفضل لأطفالنا';

function gridClassForCount(count: number): string {
  if (count <= 1) return 'grid-cols-1 max-w-md mx-auto';
  if (count === 2) return 'grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto';
  if (count === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto';
  return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-6xl mx-auto';
}

function PartnerPremiumCard({ partner, isDark = false }: { partner: FooterPartner; isDark?: boolean }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const description = partner.description?.trim() || PARTNER_DESCRIPTION_FALLBACK;
  const title = partner.name || 'شريك';
  const showLogo = isHttpLogoUrl(partner.logoUrl) && !logoFailed;
  const initial = title.trim().charAt(0) || 'ش';

  const logoBlock = (
    <div className="partner-logo-wrap relative mx-auto mb-6 shrink-0">
      <div className="partner-logo-ring" aria-hidden="true" />
      <div className="partner-logo-inner">
        {showLogo ? (
          <img
            src={partner.logoUrl}
            alt={title}
            className="partner-logo-image"
            loading="lazy"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <span className="text-2xl font-black text-[#0B2345] dark:text-[#D4AF37]" aria-hidden="true">
            {initial}
          </span>
        )}
      </div>
    </div>
  );

  const cardBody = (
    <>
      {logoBlock}

      <h4 className={`text-base font-semibold mb-2 px-2 ${isDark ? 'text-white' : 'text-[#0B2345] dark:text-slate-100'}`}>
        {title}
      </h4>
      <div
        className="w-8 h-px rounded-full mx-auto mb-4 bg-gradient-to-r from-[#D4AF37]/70 to-[#0B2345]/30"
        aria-hidden="true"
      />
      <p className={`text-sm leading-[1.85] mb-5 px-2 flex-1 ${isDark ? 'text-[#cbd5e1]' : 'text-slate-600 dark:text-slate-400'}`}>
        {description}
      </p>

      {partner.link ? (
        <span className="mt-auto inline-flex items-center justify-center gap-1 text-sm font-medium text-[#0B2345] dark:text-[#D4AF37] group-hover:text-[#D4AF37] transition-colors underline-offset-4 group-hover:underline">
          زيارة الموقع
          <ExternalLink size={13} className="opacity-70" />
        </span>
      ) : (
        <span className="mt-auto h-5" aria-hidden="true" />
      )}
    </>
  );

  const cardClass =
    `partner-premium-card group relative flex flex-col items-center text-center p-8 md:p-9 rounded-3xl min-h-[260px] transition-all duration-300 ease-out hover:shadow-lg hover:-translate-y-1 focus-within:ring-2 focus-within:ring-[#D4AF37]/25 focus-within:ring-offset-2 ${
      isDark
        ? 'bg-[#081f3d] border border-[rgba(212,175,55,0.28)] shadow-none hover:border-[rgba(212,175,55,0.45)] focus-within:ring-offset-[#06182f]'
        : 'bg-white dark:bg-slate-900/95 border border-slate-100 dark:border-slate-800 shadow-sm hover:border-slate-200 dark:focus-within:ring-offset-slate-950'
    }`;

  if (partner.link) {
    return (
      <a
        href={partner.link}
        target="_blank"
        rel="noopener noreferrer"
        className={`${cardClass} partner-card-glow block no-underline w-full`}
        aria-label={`${title} — زيارة الموقع`}
      >
        {cardBody}
      </a>
    );
  }

  return <article className={`${cardClass} w-full`}>{cardBody}</article>;
}

export function SuccessPartnersSection({
  partners,
  source = 'config',
  variant = 'success',
  theme = 'light',
  title,
  subtitle,
  hideHeader = false,
}: {
  partners: FooterPartner[];
  source?: 'config' | 'featured-schools';
  variant?: 'success' | 'our';
  theme?: 'light' | 'dark';
  title?: string;
  subtitle?: string;
  hideHeader?: boolean;
}) {
  const reduced = prefersReducedMotion();

  useEffect(() => {
    console.log('[SuccessPartners] RENDER_PREMIUM_SECTION', {
      count: partners.length,
      source,
      variant,
    });
  }, [partners.length, source, variant]);

  if (!partners.length) return null;

  const isOurVariant = variant === 'our';
  const isDark = theme === 'dark';
  const displayTitle = title || (isOurVariant ? 'شركاؤنا' : 'شركاء النجاح');
  const displaySubtitle = subtitle || SUBTITLE;

  return (
    <section
      className={`partner-success-section ${isOurVariant ? 'mb-12 md:mb-16' : 'mb-16 md:mb-24'}`}
      aria-labelledby={isOurVariant ? 'our-partners-heading' : 'success-partners-heading'}
      data-partners-section="premium"
      data-partners-source={source}
      data-partners-variant={variant}
      data-partners-theme={theme}
    >
      <motion.div
        initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0.01 : 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={`rounded-3xl md:rounded-[2rem] px-6 py-12 md:px-10 md:py-16 overflow-hidden ${
          isDark
            ? 'border border-[rgba(212,175,55,0.28)] bg-[#0b2345] shadow-none'
            : 'shadow-[0_20px_48px_-28px_rgba(11,35,69,0.14)] border border-slate-200/60 dark:border-slate-800/60'
        }`}
        style={
          isDark
            ? undefined
            : {
                background:
                  'linear-gradient(165deg, #F7F8FA 0%, #ffffff 45%, rgba(212,175,55,0.08) 100%)',
              }
        }
      >
        {import.meta.env.DEV && (
          <p className="text-center text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-6">
            Premium Partners UI Active
          </p>
        )}

        {!hideHeader && (
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
          {!isOurVariant && (
            <span
              className={`inline-block px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide mb-4 ${
                isDark
                  ? 'text-[#f2c866] bg-[#081f3d] border border-[rgba(212,175,55,0.28)]'
                  : 'text-[#0B2345] dark:text-[#D4AF37] bg-white/80 dark:bg-slate-900/80 border border-[#D4AF37]/25'
              }`}
            >
              شركاؤنا
            </span>
          )}
          <h2
            id={isOurVariant ? 'our-partners-heading' : 'success-partners-heading'}
            className={`text-2xl md:text-4xl font-black leading-tight mb-4 ${isDark ? 'text-white' : 'text-[#0B2345] dark:text-white'}`}
          >
            {isOurVariant ? (
              displayTitle
            ) : (
              <>
                {displayTitle.includes('النجاح') ? (
                  <>
                    شركاء <span className="text-[#D4AF37]">النجاح</span>
                  </>
                ) : (
                  displayTitle
                )}
              </>
            )}
          </h2>
          {!isOurVariant && (
            <p
              className={`text-sm md:text-base leading-[1.85] font-medium ${
                isDark ? 'text-[#cbd5e1]' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {displaySubtitle}
            </p>
          )}
        </div>
        )}

        <div className={`grid gap-6 md:gap-8 ${gridClassForCount(partners.length)}`}>
          {partners.map((partner) => (
            <PartnerPremiumCard key={partner.id} partner={partner} isDark={isDark} />
          ))}
        </div>
      </motion.div>
    </section>
  );
}
