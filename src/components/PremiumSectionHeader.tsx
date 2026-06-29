import React from "react";
import type { LucideIcon } from "lucide-react";

export type SectionHeaderIconTone = "gold" | "navy";

export interface PremiumSectionHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  iconTone?: SectionHeaderIconTone;
  actions?: React.ReactNode;
  sticky?: boolean;
  className?: string;
}

export function SectionHeaderButton({
  onClick,
  ariaLabel,
  children,
  disabled,
}: {
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="sx-section-header__btn"
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function PremiumSectionHeader({
  icon: Icon,
  title,
  subtitle,
  iconTone = "navy",
  actions,
  sticky = false,
  className = "",
}: PremiumSectionHeaderProps) {
  return (
    <header
      className={`sx-section-header${sticky ? " sx-section-header--sticky" : ""}${className ? ` ${className}` : ""}`}
    >
      <div className="sx-section-header__row">
        <span
          className={`sx-section-header__icon sx-section-header__icon--${iconTone}`}
          aria-hidden
        >
          <Icon size={22} strokeWidth={2} />
        </span>
        <h2 className="sx-section-header__title">{title}</h2>
        {actions ? <div className="sx-section-header__actions">{actions}</div> : null}
      </div>
      <p className="sx-section-header__subtitle">{subtitle}</p>
    </header>
  );
}
