import React, { useEffect, useId, useRef, useState } from 'react';
import { Globe } from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '../lib/LanguageContext';

type LanguageToggleProps = {
  /** `icon` = navbar 40×40 menu; `default` = legacy (Landing / dock) */
  variant?: 'default' | 'icon';
  className?: string;
};

export function LanguageToggle({ variant = 'default', className }: LanguageToggleProps) {
  const { language, setLanguage, isRtl } = useLanguage();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (variant === 'icon') {
    return (
      <div className={clsx('sx-lang-toggle sx-lang-toggle--icon', className)} ref={wrapRef}>
        <button
          type="button"
          className="sx-lang-toggle__btn"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={isRtl ? 'تغيير اللغة' : 'Change language'}
          title={isRtl ? 'تغيير اللغة' : 'Change language'}
          onClick={() => setOpen((v) => !v)}
        >
          <Globe size={18} strokeWidth={1.75} aria-hidden />
        </button>
        {open ? (
          <div id={menuId} className="sx-lang-toggle__menu" role="menu">
            <button
              type="button"
              role="menuitem"
              className={clsx('sx-lang-toggle__item', language === 'ar' && 'is-active')}
              onClick={() => {
                setLanguage('ar');
                setOpen(false);
              }}
            >
              العربية
            </button>
            <button
              type="button"
              role="menuitem"
              className={clsx('sx-lang-toggle__item', language === 'en' && 'is-active')}
              onClick={() => {
                setLanguage('en');
                setOpen(false);
              }}
            >
              English
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
      className={clsx(
        'sx-lang-toggle sx-lang-toggle--default inline-flex items-center gap-1.5 rounded-xl sm:rounded-full font-bold transition-all duration-300 bg-[#0B2345] hover:bg-[#D4A64A] text-[#D4A64A] hover:text-[#0B2345] border border-[#D4A64A]/30 hover:border-[#D4A64A] shadow-md shadow-[#0B2345]/10 active:scale-95 cursor-pointer z-50 select-none h-11 min-w-[44px] md:h-11 justify-center px-3 sm:px-4 group',
        className,
      )}
      title={language === 'ar' ? 'Switch to English' : 'التحويل إلى العربية'}
    >
      <Globe className="w-[18px] h-[18px] sm:w-4 sm:h-4 text-[#D4A64A] group-hover:text-[#0B2345] shrink-0 transition-colors duration-300" />
      <span className="sx-lang-toggle__label font-sans whitespace-nowrap hidden sm:block text-xs text-[#D4A64A] group-hover:text-[#0B2345] transition-colors duration-300">
        {language === 'ar' ? 'English' : 'العربية'}
      </span>
    </button>
  );
}
