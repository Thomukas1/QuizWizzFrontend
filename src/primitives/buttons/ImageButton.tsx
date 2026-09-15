import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface ImageButtonProps {
  href?: string;
  // When true, treat `href` as an in-app route and navigate via React Router
  // instead of a full-page <a>. Required for headers/persistent UI (e.g. the
  // music player) to survive the navigation.
  isLink?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  target?: string;
  rel?: string;
  ariaLabel?: string;
  ariaDisabled?: boolean;
  children: ReactNode;
  className?: string;
}

export function ImageButton({
  href,
  isLink = false,
  onClick,
  disabled = false,
  target,
  rel,
  ariaLabel,
  ariaDisabled,
  children,
  className = '',
}: ImageButtonProps) {
  const classes = `image-button ${disabled ? 'disabled' : ''} ${className}`.trim();

  if (href && isLink) {
    return (
      <Link
        to={disabled ? '#' : href}
        onClick={(e) => {
          if (disabled) e.preventDefault();
          onClick?.(e);
        }}
        target={target}
        rel={rel}
        aria-label={ariaLabel}
        aria-disabled={ariaDisabled}
        className={classes}
      >
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a
        href={disabled ? undefined : href}
        onClick={(e) => {
          if (disabled) e.preventDefault();
          onClick?.(e);
        }}
        target={target}
        rel={rel}
        aria-label={ariaLabel}
        aria-disabled={ariaDisabled}
        className={classes}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={classes}
    >
      {children}
    </button>
  );
}
