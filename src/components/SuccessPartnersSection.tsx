import React from 'react';
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

  const cardBody = (
    <>
      <div className="partner-logo-wrap mx-auto mb-6">
        <div className="partner-logo-ring" aria-hidden="true" />
        <div className="partner-logo-inner">
          <img
            src={partner.logoUrl}
            alt={title}
            className="w-full h-full object-contain p-2"
            loading="lazy"
          />
        </div>
      </div>

      <h4 className="text-lg font-black text-[#0B2345] dark:text-white mb-2">{title}</h4>
      <div
        className="w-10 h-0.5 rounded-full mx-auto mb-4"
        style={{ background: 'linear-gradient(90deg, #D4AF37, #0B2345)' }}
        aria-hidden="true"
      />
      <p className="text-sm leading-[1.85] text-slate-600 dark:text-slate-400 mb-4 min-h-[3.5rem]">
        {description}
      </p>

      {partner.link ? (
        <span className="inline-flex items-center justify-center gap-1.5 text-sm font-bold text-[#0B2345] dark:text-[#D4AF37] group-hover:text-[#D4AF37] dark:group-hover:text-[#D4AF37] transition-colors">
          زيارة الموقع
          <ExternalLink size={14} className="opacity-70" />
        </span>
      ) : null}
    </>
  );

  const cardClass =
    'partner-premium-card group relative flex flex-col items-center text-center p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-2 focus-within:ring-2 focus-within:ring-[#D4AF37]/40 focus-within:ring-offset-2 dark:focus-within:ring-offset-slate-950';

  if (partner.link) {
    return (
      <a
        href={partner.link}
        target="_blank"
        rel="noopener noreferrer"
        className={`${cardClass} partner-card-glow block no-underline`}
        aria-label={`${title} — زيارة الموقع`}
      >
        {cardBody}
      </a>
    );
  }

  return <article className={cardClass}>{cardBody}</article>;
}

export function SuccessPartnersSection({ partners }: { partners: FooterPartner[] }) {
  const reduced = prefersReducedMotion();

  if (!partners.length) return null;

  return (
    <section
      className="partner-success-section mb-16 md:mb-24"
      aria-labelledby="success-partners-heading"
    >
      <motion.div
        initial={reduced ? { opacity: 1 } : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-48px' }}
        transition={{ duration: reduced ? 0.01 : 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-3xl md:rounded-[2rem] px-6 py-12 md:px-10 md:py-16 shadow-[0_24px_64px_-32px_rgba(11,35,69,0.18)] border border-slate-200/60 dark:border-slate-800/60 overflow-hidden"
        style={{
          background:
            'linear-gradient(165deg, #F7F8FA 0%, #ffffff 45%, rgba(212,175,55,0.06) 100%)',
        }}
      >
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide text-[#0B2345] dark:text-[#D4AF37] bg-white/80 dark:bg-slate-900/80 border border-[#D4AF37]/25 mb-4">
            شركاؤنا
          </span>
          <h2
            id="success-partners-heading"
            className="text-2xl md:text-4xl font-black text-[#0B2345] dark:text-white leading-tight mb-4"
          >
            شركاء{' '}
            <span className="text-[#D4AF37]">النجاح</span>
          </h2>
          <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 leading-[1.85] font-medium">
            {SUBTITLE}
          </p>
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
