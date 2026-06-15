import React, { useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import {
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

function PartnerPremiumCard({ partner }: { partner: FooterPartner }) {
  const description = partner.description?.trim() || PARTNER_DESCRIPTION_FALLBACK;
  const title = partner.name || 'شريك';

  const logoBlock = (
    <div className="partner-logo-wrap relative mx-auto mb-6 w-[7.5rem] h-[7.5rem] shrink-0">
      {/* Gradient ring — CSS class + Tailwind fallback so ring is always visible */}
      <div
        className="partner-logo-ring absolute -inset-2 rounded-full pointer-events-none border-4 border-dashed border-[#D4AF37]/45"
        aria-hidden="true"
      />
      <div className="partner-logo-inner absolute inset-0 rounded-full bg-white dark:bg-slate-900 border-2 border-[#0B2345]/10 dark:border-[#D4AF37]/20 shadow-inner flex items-center justify-center overflow-hidden">
        <img
          src={partner.logoUrl}
          alt={title}
          className="w-[85%] h-[85%] object-contain"
          loading="lazy"
        />
      </div>
    </div>
  );

  const cardBody = (
    <>
      {logoBlock}

      <h4 className="text-lg font-black text-[#0B2345] dark:text-white mb-2 px-2">{title}</h4>
      <div
        className="w-12 h-1 rounded-full mx-auto mb-4"
        style={{ background: 'linear-gradient(90deg, #D4AF37, #0B2345)' }}
        aria-hidden="true"
      />
      <p className="text-sm leading-[1.85] text-slate-600 dark:text-slate-400 mb-5 px-2 flex-1">
        {description}
      </p>

      {partner.link ? (
        <span className="mt-auto inline-flex items-center justify-center gap-1.5 text-sm font-bold text-[#0B2345] dark:text-[#D4AF37] group-hover:text-[#D4AF37] transition-colors">
          زيارة الموقع
          <ExternalLink size={14} className="opacity-80" />
        </span>
      ) : (
        <span className="mt-auto h-5" aria-hidden="true" />
      )}
    </>
  );

  const cardClass =
    'partner-premium-card group relative flex flex-col items-center text-center p-8 md:p-9 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-md min-h-[260px] transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:border-[#D4AF37]/30 focus-within:ring-2 focus-within:ring-[#D4AF37]/50 focus-within:ring-offset-2 dark:focus-within:ring-offset-slate-950';

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
}: {
  partners: FooterPartner[];
  source?: 'config' | 'featured-schools';
  variant?: 'success' | 'our';
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

  return (
    <section
      className={`partner-success-section ${isOurVariant ? 'mb-12 md:mb-16' : 'mb-16 md:mb-24'}`}
      aria-labelledby={isOurVariant ? 'our-partners-heading' : 'success-partners-heading'}
      data-partners-section="premium"
      data-partners-source={source}
      data-partners-variant={variant}
    >
      <motion.div
        initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0.01 : 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-3xl md:rounded-[2rem] px-6 py-12 md:px-10 md:py-16 shadow-[0_24px_64px_-32px_rgba(11,35,69,0.22)] border border-slate-200/70 dark:border-slate-800/60 overflow-hidden"
        style={{
          background:
            'linear-gradient(165deg, #F7F8FA 0%, #ffffff 45%, rgba(212,175,55,0.08) 100%)',
        }}
      >
        {import.meta.env.DEV && (
          <p className="text-center text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-6">
            Premium Partners UI Active
          </p>
        )}

        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
          {!isOurVariant && (
            <span className="inline-block px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide text-[#0B2345] dark:text-[#D4AF37] bg-white/80 dark:bg-slate-900/80 border border-[#D4AF37]/25 mb-4">
              شركاؤنا
            </span>
          )}
          <h2
            id={isOurVariant ? 'our-partners-heading' : 'success-partners-heading'}
            className="text-2xl md:text-4xl font-black text-[#0B2345] dark:text-white leading-tight mb-4"
          >
            {isOurVariant ? (
              'شركاؤنا'
            ) : (
              <>
                شركاء <span className="text-[#D4AF37]">النجاح</span>
              </>
            )}
          </h2>
          {!isOurVariant && (
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 leading-[1.85] font-medium">
              {SUBTITLE}
            </p>
          )}
        </div>

        <div className={`grid gap-6 md:gap-8 ${gridClassForCount(partners.length)}`}>
          {partners.map((partner) => (
            <PartnerPremiumCard key={partner.id} partner={partner} />
          ))}
        </div>
      </motion.div>
    </section>
  );
}
