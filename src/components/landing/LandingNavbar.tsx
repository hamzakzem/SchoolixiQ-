import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  CreditCard,
  Handshake,
  Home,
  LayoutDashboard,
  LogIn,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { LandingCircularLogoWithLabel } from './LandingCircularLogo';
import { LandingButton } from '../ui/LandingButton';
import { prefersReducedMotion } from '../../lib/motion';

type NavLink = { href: string; label: string };

const LINK_ICONS: Record<string, React.ElementType> = {
  '#hero': Home,
  '#features': Sparkles,
  '#interfaces': LayoutDashboard,
  '#smart-gate': ShieldCheck,
  '#pricing': CreditCard,
  '#partners': Handshake,
  '#distributors': Users,
  '#contact': MessageCircle,
};

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Lock page scroll without jumping back to the top (works on iOS Safari too). */
function lockScroll(): () => void {
  const y = window.scrollY;
  const { body, documentElement: html } = document;
  const prev = {
    position: body.style.position,
    top: body.style.top,
    width: body.style.width,
    behavior: html.style.scrollBehavior,
  };
  body.style.position = 'fixed';
  body.style.top = `-${y}px`;
  body.style.width = '100%';
  return () => {
    body.style.position = prev.position;
    body.style.top = prev.top;
    body.style.width = prev.width;
    html.style.scrollBehavior = 'auto';
    window.scrollTo(0, y);
    html.style.scrollBehavior = prev.behavior;
  };
}

/** Highlights the nav link of the section currently in view. */
function useActiveSection(hrefs: string[]): string {
  const [active, setActive] = useState(hrefs[0] || '');
  const key = hrefs.join('|');

  useEffect(() => {
    const sections = hrefs
      .map((href) => document.getElementById(href.slice(1)))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!sections.length || typeof IntersectionObserver === 'undefined') return;

    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.boundingClientRect.top);
          else visible.delete(entry.target.id);
        }
        if (!visible.size) return;
        // The section nearest the top of the reading band wins.
        const [id] = [...visible.entries()].sort((a, b) => Math.abs(a[1]) - Math.abs(b[1]))[0];
        setActive(`#${id}`);
      },
      { rootMargin: '-35% 0px -55% 0px' },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return active;
}

export function LandingNavbar({
  appName,
  links,
  loginLabel,
  demoLabel,
}: {
  appName: string;
  links: NavLink[];
  loginLabel: string;
  demoLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduced = prefersReducedMotion();
  const demoHref = resolveDemoHref(links);
  const active = useActiveSection(links.map((l) => l.href));
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const pendingTarget = useRef<string | null>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const unlock = lockScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 60);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKey);
      unlock();
      menuButtonRef.current?.focus({ preventScroll: true });
    };
  }, [open, close]);

  const scrollToHash = (href: string) => {
    const el = document.getElementById(href.slice(1));
    if (!el) return;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    window.history.replaceState(null, '', href);
  };

  /** Drawer links: close first, then scroll once the page is unlocked. */
  const onDrawerLink = (e: React.MouseEvent, href: string) => {
    if (!href.startsWith('#')) return close();
    e.preventDefault();
    pendingTarget.current = href;
    close();
  };

  const onDrawerExited = () => {
    const target = pendingTarget.current;
    pendingTarget.current = null;
    if (target) scrollToHash(target);
  };

  const drawer = (
    <AnimatePresence onExitComplete={onDrawerExited}>
      {open && (
        <div className="landing-drawer-root" dir="rtl" key="landing-drawer">
          <motion.button
            type="button"
            className="landing-drawer-overlay"
            aria-label="إغلاق القائمة"
            tabIndex={-1}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.01 : 0.25 }}
            onClick={close}
          />
          <motion.nav
            id="landing-mobile-drawer"
            className="landing-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="قائمة الموقع"
            initial={reduced ? { opacity: 0 } : { x: '-104%' }}
            animate={reduced ? { opacity: 1 } : { x: 0 }}
            exit={reduced ? { opacity: 0 } : { x: '-104%' }}
            transition={
              reduced
                ? { duration: 0.01 }
                : { type: 'spring', stiffness: 420, damping: 40, mass: 0.9 }
            }
            drag={reduced ? false : 'x'}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0.5, right: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -90 || info.velocity.x < -500) close();
            }}
          >
            <div className="landing-drawer__glow" aria-hidden="true" />

            <div className="landing-drawer__head">
              <Link to="/" onClick={close} className="landing-drawer__brand">
                <LandingCircularLogoWithLabel size={34} appName={appName} />
              </Link>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={close}
                className="landing-drawer__close"
                aria-label="إغلاق القائمة"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <p className="landing-drawer__eyebrow">القائمة</p>

            <motion.ul
              className="landing-drawer__links"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: reduced ? 0 : 0.045, delayChildren: reduced ? 0 : 0.08 } },
              }}
            >
              {links.map(({ href, label }) => {
                const Icon = LINK_ICONS[href] || Sparkles;
                const isActive = active === href;
                return (
                  <motion.li
                    key={href}
                    variants={{
                      hidden: reduced ? { opacity: 0 } : { opacity: 0, x: 24 },
                      show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: EASE_OUT } },
                    }}
                  >
                    <a
                      href={href}
                      onClick={(e) => onDrawerLink(e, href)}
                      className={`landing-drawer__link ${isActive ? 'is-active' : ''}`}
                      aria-current={isActive ? 'true' : undefined}
                    >
                      <span className="landing-drawer__link-icon">
                        <Icon size={17} strokeWidth={1.9} />
                      </span>
                      <span className="landing-drawer__link-label">{label}</span>
                      <ChevronLeft size={16} className="landing-drawer__link-chevron" />
                    </a>
                  </motion.li>
                );
              })}
            </motion.ul>

            <motion.div
              className="landing-drawer__actions"
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduced ? 0 : 0.22, duration: 0.35, ease: EASE_OUT }}
            >
              <LandingButton href={demoHref} variant="primary" fullWidth onClick={(e: React.MouseEvent) => onDrawerLink(e, demoHref)}>
                {demoLabel}
              </LandingButton>
              <LandingButton
                to="/login"
                variant="secondary"
                fullWidth
                icon={<LogIn size={15} strokeWidth={1.9} />}
                onClick={close}
              >
                {loginLabel}
              </LandingButton>
              <p className="landing-drawer__note">دعم فني عربي — نرد عليك خلال ساعات العمل</p>
            </motion.div>
          </motion.nav>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <header className={`landing-navbar ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="landing-navbar__inner">
        <Link to="/" className="landing-navbar__brand" onClick={close}>
          <LandingCircularLogoWithLabel size={36} appName={appName} />
        </Link>

        <nav className="landing-navbar__links" aria-label="التنقل الرئيسي">
          {links.map(({ href, label }) => {
            const isActive = active === href;
            return (
              <a key={href} href={href} className={isActive ? 'is-active' : undefined} aria-current={isActive ? 'true' : undefined}>
                {label}
                {isActive && (
                  <motion.span
                    layoutId="landing-nav-indicator"
                    className="landing-navbar__indicator"
                    transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
              </a>
            );
          })}
        </nav>

        <div className="landing-navbar__actions">
          <LandingButton
            to="/login"
            variant="secondary"
            icon={<LogIn size={14} strokeWidth={1.75} />}
            className="landing-navbar__btn landing-navbar__btn--login"
          >
            {loginLabel}
          </LandingButton>
          <LandingButton
            href={demoHref}
            variant="primary"
            className="landing-navbar__btn landing-navbar__btn--cta"
          >
            {demoLabel}
          </LandingButton>
          <button
            ref={menuButtonRef}
            type="button"
            className={`landing-navbar__menu-btn ${open ? 'is-open' : ''}`}
            aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={open}
            aria-controls="landing-mobile-drawer"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="landing-burger" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>

      {typeof document !== 'undefined' ? createPortal(drawer, document.body) : null}
    </header>
  );
}

function resolveDemoHref(links: NavLink[]): string {
  const contact = links.find((l) => l.href.includes('contact') || l.label.includes('تواصل'));
  return contact?.href || '#contact';
}
