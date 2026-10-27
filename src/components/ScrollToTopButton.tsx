import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';

const RING_RADIUS = 21;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/**
 * Floating "back to top" button with a gold ring showing scroll progress.
 * Sits bottom-left so it never covers the WhatsApp button (bottom-right).
 */
export function ScrollToTopButton({
  threshold = 480,
  label = 'العودة للأعلى',
}: {
  threshold?: number;
  label?: string;
}) {
  const [visible, setVisible] = useState(false);
  const ringRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      setVisible(window.scrollY > threshold);
      ringRef.current?.setAttribute('stroke-dashoffset', String(RING_LENGTH * (1 - progress)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [threshold]);

  const scrollToTop = () => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label={label}
      title={label}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={`fixed z-[46] left-5 w-12 h-12 rounded-full flex items-center justify-center
        bg-[#0B2345]/90 text-[#E8C76E] backdrop-blur-md border border-white/10
        shadow-[0_12px_30px_-8px_rgba(0,0,0,0.55)] transition-all duration-300 ease-out
        hover:bg-[#0f2c57] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8C76E]/70
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'}`}
      style={{ bottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))' }}
    >
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r={RING_RADIUS} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
        <circle
          ref={ringRef}
          cx="24"
          cy="24"
          r={RING_RADIUS}
          fill="none"
          stroke="#D4AF37"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={RING_LENGTH}
        />
      </svg>
      <ArrowUp size={18} strokeWidth={2.5} className="relative" />
    </button>
  );
}
