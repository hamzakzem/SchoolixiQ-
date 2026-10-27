import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, PanInfo } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { prefersReducedMotion } from '../../lib/motion';

export type LandingFeatureSlide = {
  id: string;
  content: React.ReactNode;
  label?: string;
};

type Props = {
  slides: LandingFeatureSlide[];
  ariaLabel: string;
  autoPlayMs?: number;
  rtl?: boolean;
  className?: string;
};

const SLIDER_EASE = [0.22, 1, 0.36, 1] as const;
const AUTO_PLAY_DELAY_MS = 6500;
const IDLE_RESUME_MS = 10_000;
const SWIPE_OFFSET_THRESHOLD = 52;
const SWIPE_VELOCITY_THRESHOLD = 380;
const SLIDE_SHIFT_PX = 48;

/**
 * Slides are stacked in one CSS grid cell, so the slider is exactly as tall
 * as its tallest slide and inactive slides never show through the active one.
 */
export function LandingFeatureSlider({
  slides,
  ariaLabel,
  autoPlayMs = AUTO_PLAY_DELAY_MS,
  rtl = true,
  className = '',
}: Props) {
  const reduced = prefersReducedMotion();
  const [index, setIndexState] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  // +1 = moving to the next slide, -1 = moving to the previous one
  const [direction, setDirection] = useState<1 | -1>(1);
  const [hovered, setHovered] = useState(false);
  const [interactionLocked, setInteractionLocked] = useState(false);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<number | null>(null);
  const count = slides.length;

  const setIndex = useCallback((update: number | ((i: number) => number)) => {
    setIndexState((current) => {
      const next = typeof update === 'function' ? update(current) : update;
      if (next !== current) setPrevious(current);
      return next;
    });
  }, []);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  /** After a manual interaction, wait before autoplay resumes. */
  const lockAutoplay = useCallback(() => {
    setInteractionLocked(true);
    clearIdleTimer();
    idleTimerRef.current = window.setTimeout(() => {
      setInteractionLocked(false);
      idleTimerRef.current = null;
    }, IDLE_RESUME_MS);
  }, [clearIdleTimer]);

  useEffect(() => () => clearIdleTimer(), [clearIdleTimer]);

  // Only autoplay while the slider is on screen and the tab is visible.
  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const update = () => setPageVisible(document.visibilityState !== 'hidden');
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  const goTo = useCallback(
    (next: number) => {
      if (count <= 0) return;
      setIndex((current) => {
        const target = ((next % count) + count) % count;
        setDirection(target >= current ? 1 : -1);
        return target;
      });
    },
    [count, setIndex],
  );

  const goNext = useCallback(() => {
    if (count <= 1) return;
    setDirection(1);
    setIndex((i) => (i + 1) % count);
  }, [count, setIndex]);

  const goPrev = useCallback(() => {
    if (count <= 1) return;
    setDirection(-1);
    setIndex((i) => (i - 1 + count) % count);
  }, [count, setIndex]);

  const autoplayActive =
    !reduced && count > 1 && inView && pageVisible && !hovered && !interactionLocked;

  useEffect(() => {
    if (!autoplayActive) return;
    const timer = window.setTimeout(goNext, autoPlayMs);
    return () => window.clearTimeout(timer);
  }, [autoPlayMs, autoplayActive, goNext, index]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const nextKey = rtl ? 'ArrowLeft' : 'ArrowRight';
    const prevKey = rtl ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === nextKey) {
      e.preventDefault();
      lockAutoplay();
      goNext();
    } else if (e.key === prevKey) {
      e.preventDefault();
      lockAutoplay();
      goPrev();
    }
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    lockAutoplay();
    const { offset, velocity } = info;
    const passedOffset = Math.abs(offset.x) >= SWIPE_OFFSET_THRESHOLD;
    const passedVelocity = Math.abs(velocity.x) >= SWIPE_VELOCITY_THRESHOLD;
    if (!passedOffset && !passedVelocity) return;

    const towardLeft = passedVelocity ? velocity.x < 0 : offset.x < 0;
    // In RTL the next slide sits to the left, so dragging left reveals it.
    if (towardLeft === rtl) goNext();
    else goPrev();
  };

  if (count === 0) return null;

  // Visual offset for a slide: in RTL "next" enters from the left.
  const inlineSign = rtl ? -1 : 1;

  // The outgoing slide leaves toward one side while the incoming one enters
  // from the other; idle slides wait (invisible) on the entry side.
  const exitX = reduced ? 0 : -direction * inlineSign * SLIDE_SHIFT_PX;
  const entryX = -exitX;
  const duration = reduced ? 0.15 : 0.5;

  const slideMotion = (i: number) => {
    if (i === index) {
      return {
        animate: { opacity: 1, x: 0, scale: 1 },
        transition: { duration, ease: SLIDER_EASE },
      };
    }
    if (i === previous) {
      return {
        animate: { opacity: 0, x: exitX, scale: reduced ? 1 : 0.98 },
        transition: { duration, ease: SLIDER_EASE },
      };
    }
    return {
      animate: { opacity: 0, x: entryX, scale: 1 },
      transition: { duration: 0 },
    };
  };

  return (
    <div
      ref={rootRef}
      className={`lp-feature-slider ${className}`.trim()}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={lockAutoplay}
    >
      <div className="lp-feature-slider__viewport">
        <motion.div
          className="lp-feature-slider__track"
          drag={count > 1 && !reduced ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          dragMomentum={false}
          dragSnapToOrigin
          onDragStart={lockAutoplay}
          onDragEnd={handleDragEnd}
        >
          {slides.map((slide, i) => {
            const active = i === index;
            return (
              <motion.div
                key={slide.id}
                className={`lp-feature-slider__slide ${active ? 'is-active' : ''}`}
                initial={false}
                {...slideMotion(i)}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} / ${count}${slide.label ? ` — ${slide.label}` : ''}`}
                aria-hidden={!active}
                inert={!active ? true : undefined}
              >
                {slide.content}
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {count > 1 && (
        <div className="lp-feature-slider__nav">
          <button
            type="button"
            className="lp-feature-slider__arrow"
            onClick={() => {
              lockAutoplay();
              goPrev();
            }}
            aria-label="الشريحة السابقة"
          >
            {rtl ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>

          <div className="lp-feature-slider__dots" role="tablist" aria-label="تنقل الشرائح">
            {slides.map((slide, i) => {
              const active = i === index;
              return (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={slide.label || `الشريحة ${i + 1}`}
                  className={`lp-feature-slider__dot ${active ? 'is-active' : ''}`}
                  onClick={() => {
                    lockAutoplay();
                    goTo(i);
                  }}
                >
                  {active && (
                    <span
                      key={`${index}-${autoplayActive}`}
                      className={`lp-feature-slider__dot-progress ${autoplayActive ? 'is-running' : ''}`}
                      style={{ animationDuration: `${autoPlayMs}ms` }}
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="lp-feature-slider__arrow"
            onClick={() => {
              lockAutoplay();
              goNext();
            }}
            aria-label="الشريحة التالية"
          >
            {rtl ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {slides[index]?.label || `الشريحة ${index + 1} من ${count}`}
      </p>
    </div>
  );
}
