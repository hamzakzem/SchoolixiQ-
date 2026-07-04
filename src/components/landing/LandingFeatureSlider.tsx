import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const SLIDER_EASE = [0.65, 0.05, 0.2, 1] as const;
const AUTO_PLAY_DELAY_MS = 6500;
const IDLE_RESUME_MS = 10_000;
const SWIPE_OFFSET_THRESHOLD = 52;
const SWIPE_VELOCITY_THRESHOLD = 380;

type SlideMotionProps = {
  slide: LandingFeatureSlide;
  offset: number;
  isActive: boolean;
  isAdjacent: boolean;
  reduced: boolean;
  isMobile: boolean;
  rtl: boolean;
  shouldRender: boolean;
};

const SliderSlide = React.memo(function SliderSlide({
  slide,
  offset,
  isActive,
  isAdjacent,
  reduced,
  isMobile,
  rtl,
  shouldRender,
}: SlideMotionProps) {
  const sideRotate =
    isAdjacent && !isMobile
      ? offset > 0
        ? rtl
          ? 8
          : -8
        : rtl
          ? -8
          : 8
      : 0;

  const animate = useMemo(() => {
    if (reduced) {
      return {
        opacity: isActive ? 1 : 0,
        scale: isActive ? 1 : 0.92,
        x: 0,
        rotateY: 0,
        filter: 'blur(0px)',
      };
    }

    if (isActive) {
      return {
        opacity: 1,
        scale: 1,
        x: 0,
        rotateY: 0,
        filter: 'blur(0px)',
      };
    }

    if (isAdjacent) {
      if (isMobile) {
        return {
          opacity: 0.6,
          scale: 0.92,
          x: offset * 28,
          rotateY: 0,
          filter: 'blur(1px)',
        };
      }
      return {
        opacity: 0.45,
        scale: 0.88,
        x: offset * 36,
        rotateY: sideRotate,
        filter: 'blur(3px)',
      };
    }

    return {
      opacity: 0,
      scale: 0.82,
      x: offset * 20,
      rotateY: 0,
      filter: 'blur(4px)',
    };
  }, [isActive, isAdjacent, isMobile, offset, reduced, sideRotate]);

  return (
    <motion.div
      className={`lp-feature-slider__slide ${isActive ? 'is-active' : ''} ${isAdjacent ? 'is-adjacent' : 'is-hidden'}`}
      animate={animate}
      transition={{ duration: reduced ? 0.2 : 0.55, ease: SLIDER_EASE }}
      aria-hidden={!isActive}
    >
      {shouldRender ? slide.content : <div className="lp-feature-slider__placeholder" aria-hidden />}
    </motion.div>
  );
});

export function LandingFeatureSlider({
  slides,
  ariaLabel,
  autoPlayMs = AUTO_PLAY_DELAY_MS,
  rtl = true,
  className = '',
}: Props) {
  const reduced = prefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [autoplayPaused, setAutoplayPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<number | null>(null);
  const count = slides.length;

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  /** Pause autoplay; resume only after 10s without interaction */
  const lockAutoplay = useCallback(() => {
    setAutoplayPaused(true);
    clearIdleTimer();
    idleTimerRef.current = window.setTimeout(() => {
      setAutoplayPaused(false);
      idleTimerRef.current = null;
    }, IDLE_RESUME_MS);
  }, [clearIdleTimer]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => () => clearIdleTimer(), [clearIdleTimer]);

  const goTo = useCallback(
    (next: number) => {
      if (count <= 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  const goNext = useCallback(() => {
    setIndex((i) => (count <= 0 ? i : (i + 1) % count));
  }, [count]);

  const goPrev = useCallback(() => {
    setIndex((i) => (count <= 0 ? i : (i - 1 + count) % count));
  }, [count]);

  useEffect(() => {
    if (reduced || autoplayPaused || count <= 1) return;
    const timer = window.setInterval(goNext, autoPlayMs);
    return () => window.clearInterval(timer);
  }, [autoPlayMs, autoplayPaused, count, goNext, reduced]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const focusedInSlider =
        viewportRef.current?.contains(document.activeElement) ||
        document.activeElement === viewportRef.current;
      if (!focusedInSlider) return;

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
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, lockAutoplay, rtl]);

  const handleDragStart = () => {
    lockAutoplay();
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    lockAutoplay();

    const { offset, velocity } = info;
    const delta = offset.x;
    const vel = velocity.x;
    const passedOffset = Math.abs(delta) >= SWIPE_OFFSET_THRESHOLD;
    const passedVelocity = Math.abs(vel) >= SWIPE_VELOCITY_THRESHOLD;
    if (!passedOffset && !passedVelocity) return;

    const swipeLeft = passedVelocity ? vel < 0 : delta < 0;
    const swipeRight = passedVelocity ? vel > 0 : delta > 0;

    if (rtl) {
      if (swipeLeft) goNext();
      else if (swipeRight) goPrev();
    } else {
      if (swipeLeft) goPrev();
      else if (swipeRight) goNext();
    }
  };

  const getOffset = useCallback(
    (i: number) => {
      let diff = i - index;
      if (diff > count / 2) diff -= count;
      if (diff < -count / 2) diff += count;
      return diff;
    },
    [count, index],
  );

  const shouldRenderSlide = useCallback(
    (i: number) => {
      if (reduced) return i === index;
      return Math.abs(getOffset(i)) <= 1;
    },
    [getOffset, index, reduced],
  );

  if (count === 0) return null;

  return (
    <div
      className={`lp-feature-slider ${className}`.trim()}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onMouseEnter={lockAutoplay}
      onMouseLeave={lockAutoplay}
      onFocusCapture={lockAutoplay}
      onPointerDown={lockAutoplay}
      tabIndex={0}
      ref={viewportRef}
    >
      {count > 1 && (
        <div className="lp-feature-slider__controls">
          <button
            type="button"
            className="lp-feature-slider__arrow"
            onClick={() => {
              lockAutoplay();
              goPrev();
            }}
            aria-label="الشريحة السابقة"
          >
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            className="lp-feature-slider__arrow"
            onClick={() => {
              lockAutoplay();
              goNext();
            }}
            aria-label="الشريحة التالية"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
      )}

      <div className="lp-feature-slider__viewport">
        <motion.div
          className="lp-feature-slider__track"
          drag={count > 1 && !reduced ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.06}
          dragMomentum={false}
          dragSnapToOrigin
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {slides.map((slide, i) => {
            const offset = getOffset(i);
            return (
              <SliderSlide
                key={slide.id}
                slide={slide}
                offset={offset}
                isActive={offset === 0}
                isAdjacent={Math.abs(offset) === 1}
                reduced={reduced}
                isMobile={isMobile}
                rtl={rtl}
                shouldRender={shouldRenderSlide(i)}
              />
            );
          })}
        </motion.div>
      </div>

      {count > 1 && (
        <div className="lp-feature-slider__dots" role="tablist" aria-label="تنقل الشرائح">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={slide.label || `الشريحة ${i + 1}`}
              className={`lp-feature-slider__dot ${i === index ? 'is-active' : ''}`}
              onClick={() => {
                lockAutoplay();
                goTo(i);
              }}
            />
          ))}
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {slides[index]?.label || `الشريحة ${index + 1} من ${count}`}
      </p>
    </div>
  );
}
