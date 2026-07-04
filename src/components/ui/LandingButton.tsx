import React from 'react';
import { Link } from 'react-router-dom';

export type LandingButtonVariant = 'primary' | 'secondary' | 'ghost' | 'whatsapp';
export type LandingButtonSize = 'md' | 'lg';

type CommonProps = {
  variant?: LandingButtonVariant;
  size?: LandingButtonSize;
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  'aria-label'?: string;
};

type AsButton = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    href?: undefined;
    to?: undefined;
  };

type AsAnchor = CommonProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & {
    href: string;
    to?: undefined;
  };

type AsLink = CommonProps & {
  to: string;
  href?: undefined;
  target?: string;
  rel?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

export type LandingButtonProps = AsButton | AsAnchor | AsLink;

function buildClassName(
  variant: LandingButtonVariant,
  size: LandingButtonSize,
  fullWidth: boolean,
  className?: string,
): string {
  return [
    'lp-landing-btn',
    `lp-landing-btn--${variant}`,
    size === 'lg' ? 'lp-landing-btn--lg' : '',
    fullWidth ? 'lp-landing-btn--full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

export function LandingButton(props: LandingButtonProps) {
  const {
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    className,
    children,
    icon,
    disabled,
    'aria-label': ariaLabel,
  } = props;

  const classes = buildClassName(variant, size, fullWidth, className);
  const content = (
    <>
      {icon}
      <span>{children}</span>
    </>
  );

  if ('to' in props && props.to) {
    const { to, target, rel, onClick } = props;
    return (
      <Link
        to={to}
        target={target}
        rel={rel}
        onClick={onClick}
        className={classes}
        aria-label={ariaLabel}
      >
        {content}
      </Link>
    );
  }

  if ('href' in props && props.href) {
    const { href, target, rel, onClick, ...rest } = props as AsAnchor;
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        onClick={onClick}
        className={classes}
        aria-label={ariaLabel}
        {...rest}
      >
        {content}
      </a>
    );
  }

  const { type = 'button', onClick, ...buttonRest } = props as AsButton;
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={classes}
      aria-label={ariaLabel}
      {...buttonRest}
    >
      {content}
    </button>
  );
}
