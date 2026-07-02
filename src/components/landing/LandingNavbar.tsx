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
  primaryLabel,
  demoLabel,
}: {
  appName: string;
  links: NavLink[];
  loginLabel: string;
  primaryLabel: string;
  demoLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const reduced = prefersReducedMotion();

  const close = () => setOpen(false);

  return (
    <header className="landing-navbar">
      <div className="landing-navbar__inner">
        <Link to="/" className="flex items-center gap-2 shrink-0 min-w-0" onClick={close}>
          <SchoolixLogo size={34} className="landing-hero__logo-float" />
          <span className="font-black text-sm sm:text-[15px] tracking-tight truncate text-white">{appName}</span>
        </Link>

        <nav className="landing-navbar__links" aria-label="التنقل الرئيسي">
          {links.map(({ href, label }) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>

        <div className="landing-navbar__actions">
          <Link
            to="/login"
            className="hidden sm:inline-flex items-center gap-1 px-3 py-2 text-[12px] sm:text-[13px] font-bold text-[#cbd5e1] hover:text-[#f2c866] transition-colors"
          >
            <LogIn size={14} />
            {loginLabel}
          </Link>
          <a href={resolveDemoHref(links)} className="hidden md:inline-flex lp-btn-gold !py-2 !px-4 !text-[12px]">
            {demoLabel}
          </a>
          <Link to="/login?mode=signup" className="lp-btn-gold !py-2 !px-3 sm:!px-4 !text-[12px] sm:!text-[13px]">
            {primaryLabel}
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
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-[rgba(212,175,55,0.28)]">
                <span className="font-black text-white">{appName}</span>
                <button type="button" onClick={close} className="text-[#94a3b8]" aria-label="إغلاق">
                  <X size={20} />
                </button>
              </div>
              {links.map(({ href, label }) => (
                <a key={href} href={href} onClick={close}>
                  {label}
                </a>
              ))}
              <div className="mt-auto pt-4 flex flex-col gap-2 border-t border-[rgba(212,175,55,0.28)]">
                <Link to="/login" onClick={close} className="lp-btn-outline w-full">
                  {loginLabel}
                </Link>
                <a href={resolveDemoHref(links)} onClick={close} className="lp-btn-outline w-full">
                  {demoLabel}
                </a>
                <Link to="/login?mode=signup" onClick={close} className="lp-btn-gold w-full">
                  {primaryLabel}
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
