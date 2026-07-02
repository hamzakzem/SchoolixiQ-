import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import SchoolixLogo from '../SchoolixLogo';
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

  const close = () => setOpen(false);

  return (
    <header className="landing-navbar">
      <div className="landing-navbar__inner">
        <Link to="/" className="landing-navbar__brand" onClick={close}>
          <SchoolixLogo size={36} className="landing-hero__logo-float" />
          <span>{appName}</span>
        </Link>

        <nav className="landing-navbar__links" aria-label="التنقل الرئيسي">
          {links.map(({ href, label }) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>

        <div className="landing-navbar__actions">
          <a href={resolveDemoHref(links)} className="hidden md:inline-flex lp-btn-outline !py-2 !px-4 !text-[12px]">
            {demoLabel}
          </a>
          <Link to="/login" className="hidden sm:inline-flex lp-btn-gold !py-2 !px-4 !text-[12px]">
            <LogIn size={14} />
            {loginLabel}
          </Link>
          <button
            type="button"
            className="landing-navbar__menu-btn"
            aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
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
              className="landing-drawer"
              aria-label="قائمة الجوال"
              initial={reduced ? { opacity: 1 } : { x: '100%' }}
              animate={{ x: 0, opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { x: '100%' }}
              transition={{ duration: reduced ? 0.01 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-[rgba(255,255,255,0.06)]">
                <span className="font-black text-white">{appName}</span>
                <button type="button" onClick={close} className="text-[#8b9cb3]" aria-label="إغلاق">
                  <X size={20} />
                </button>
              </div>
              {links.map(({ href, label }) => (
                <a key={href} href={href} onClick={close}>
                  {label}
                </a>
              ))}
              <div className="mt-auto pt-4 flex flex-col gap-2 border-t border-[rgba(255,255,255,0.06)]">
                <a href={resolveDemoHref(links)} onClick={close} className="lp-btn-outline w-full">
                  {demoLabel}
                </a>
                <Link to="/login" onClick={close} className="lp-btn-gold w-full">
                  {loginLabel}
                </Link>
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
