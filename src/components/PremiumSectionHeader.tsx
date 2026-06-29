import React from "react";
import type { LucideIcon } from "lucide-react";

export type SectionHeaderIconTone = "gold" | "navy";
export type MobilePanelId = "notifications" | "quick-access" | "more";

export interface PremiumSectionHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  panel: MobilePanelId;
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
      className="sx-mobile-panel-header-v3__btn"
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
  panel,
  iconTone = "navy",
  actions,
  sticky = false,
  className = "",
}: PremiumSectionHeaderProps) {
  return (
    <header
      data-ui="mobile-panel-header-v3"
      data-panel={panel}
      className={`sx-mobile-panel-header-v3${sticky ? " sx-mobile-panel-header-v3--sticky" : ""}${className ? ` ${className}` : ""}`}
    >
      <div className="sx-mobile-panel-header-v3__row">
        <span
          className={`sx-mobile-panel-header-v3__icon sx-mobile-panel-header-v3__icon--${iconTone}`}
          aria-hidden
        >
          <Icon size={20} strokeWidth={2} />
        </span>
        <h2 className="sx-mobile-panel-header-v3__title">{title}</h2>
        {actions ? <div className="sx-mobile-panel-header-v3__actions">{actions}</div> : null}
      </div>
      <p className="sx-mobile-panel-header-v3__subtitle">{subtitle}</p>
    </header>
  );
}
