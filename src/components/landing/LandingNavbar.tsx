import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { LandingCircularLogoWithLabel } from './LandingCircularLogo';
import { LandingButton } from '../ui/LandingButton';
import { prefersReducedMotion } from '../../lib/motion';

type NavLink = { href: string; label: string };

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
  const reduced = prefersReducedMotion();
  const demoHref = resolveDemoHref(links);

  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header className="landing-navbar">
      <div className="landing-navbar__inner">
        <Link to="/" className="landing-navbar__brand" onClick={close}>
          <LandingCircularLogoWithLabel size={36} appName={appName} />
        </Link>

        <nav className="landing-navbar__links" aria-label="التنقل الرئيسي">
          {links.map(({ href, label }) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
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
            type="button"
            className="landing-navbar__menu-btn"
            aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={open}
            aria-controls="landing-mobile-drawer"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} strokeWidth={1.75} /> : <Menu size={18} strokeWidth={1.75} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              className="landing-drawer-overlay"
              aria-label="إغلاق القائمة"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0.01 : 0.2 }}
              onClick={close}
            />
            <motion.nav
              id="landing-mobile-drawer"
              className="landing-drawer"
              aria-label="قائمة الجوال"
              initial={reduced ? { opacity: 1 } : { x: '100%' }}
              animate={{ x: 0, opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { x: '100%' }}
              transition={{ duration: reduced ? 0.01 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="landing-drawer__head">
                <LandingCircularLogoWithLabel size={34} appName={appName} />
                <button
                  type="button"
                  onClick={close}
                  className="landing-drawer__close"
                  aria-label="إغلاق"
                >
                  <X size={18} strokeWidth={1.75} />
                </button>
              </div>

              <div className="landing-drawer__links">
                {links.map(({ href, label }) => (
                  <a key={href} href={href} onClick={close}>
                    {label}
                  </a>
                ))}
              </div>

              <div className="landing-drawer__actions">
                <LandingButton to="/login" variant="secondary" fullWidth onClick={close}>
                  {loginLabel}
                </LandingButton>
                <LandingButton href={demoHref} variant="primary" fullWidth onClick={close}>
                  {demoLabel}
                </LandingButton>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}

function resolveDemoHref(links: NavLink[]): string {
  const contact = links.find((l) => l.href.includes('contact') || l.label.includes('تواصل'));
  return contact?.href || '#contact';
}
