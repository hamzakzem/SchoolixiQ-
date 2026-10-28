import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { applyTheme, useIsDarkTheme } from './ThemeToggle';

type Option<T extends string> = { value: T; label: string; icon?: React.ReactNode };

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="sx-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`sx-seg__opt${value === o.value ? ' is-active' : ''}`}
          onClick={() => value !== o.value && onChange(o.value)}
        >
          {o.icon}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Light / dark switch for menus and sheets. */
export function ThemeSegment() {
  const { isRtl } = useLanguage();
  const isDark = useIsDarkTheme();
  return (
    <Segmented
      label={isRtl ? 'المظهر' : 'Appearance'}
      value={isDark ? 'dark' : 'light'}
      onChange={(v) => applyTheme(v === 'dark')}
      options={[
        { value: 'light', label: isRtl ? 'فاتح' : 'Light', icon: <Sun size={15} aria-hidden /> },
        { value: 'dark', label: isRtl ? 'داكن' : 'Dark', icon: <Moon size={15} aria-hidden /> },
      ]}
    />
  );
}

/** Arabic / English switch for menus and sheets. */
export function LanguageSegment() {
  const { language, setLanguage, isRtl } = useLanguage();
  return (
    <Segmented
      label={isRtl ? 'اللغة' : 'Language'}
      value={language === 'en' ? 'en' : 'ar'}
      onChange={(v) => setLanguage(v)}
      options={[
        { value: 'ar', label: 'العربية' },
        { value: 'en', label: 'English' },
      ]}
    />
  );
}
