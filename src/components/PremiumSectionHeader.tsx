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

export interface PanelSectionTitleProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
}

/** Compact in-panel section label (Quick Access groups, More groups, notification time groups). */
export function PanelSectionTitle({ title, description, icon: Icon }: PanelSectionTitleProps) {
  return (
    <div className="sx-panel-section-title" data-ui="panel-section-title">
      {Icon ? (
        <span className="sx-panel-section-title__icon" aria-hidden>
          <Icon size={14} strokeWidth={2.25} />
        </span>
      ) : (
        <span className="sx-panel-section-title__mark" aria-hidden />
      )}
      <div className="sx-panel-section-title__copy">
        <h3 className="sx-panel-section-title__text">{title}</h3>
        {description ? <p className="sx-panel-section-title__desc">{description}</p> : null}
      </div>
    </div>
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
          <Icon size={18} strokeWidth={2.15} />
        </span>
        <div className="sx-mobile-panel-header-v3__copy">
          <h2 className="sx-mobile-panel-header-v3__title">{title}</h2>
          <p className="sx-mobile-panel-header-v3__subtitle">{subtitle}</p>
        </div>
        {actions ? <div className="sx-mobile-panel-header-v3__actions">{actions}</div> : null}
      </div>
    </header>
  );
}
