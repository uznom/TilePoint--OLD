import React from 'react';

export type HeroLinkColor = 'foreground' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
export type HeroLinkUnderline = 'none' | 'hover' | 'always' | 'active';

export interface HeroLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  color?: HeroLinkColor;
  underline?: HeroLinkUnderline;
  isExternal?: boolean;
  showAnchorIcon?: boolean;
  className?: string;
  children?: React.ReactNode;
  id?: string;
}

export const HeroLink: React.FC<HeroLinkProps> = ({
  color = 'primary',
  underline = 'hover',
  isExternal = false,
  showAnchorIcon = false,
  className = '',
  children,
  id,
  ...props
}) => {
  const getColorClass = () => {
    switch (color) {
      case 'foreground':
        return 'text-foreground hover:text-default-600';
      case 'secondary':
        return 'text-secondary hover:text-secondary-400';
      case 'success':
        return 'text-success hover:text-success-400';
      case 'warning':
        return 'text-warning hover:text-warning-400';
      case 'danger':
        return 'text-danger hover:text-danger-400';
      case 'primary':
      default:
        return 'text-primary hover:text-primary-400';
    }
  };

  const getUnderlineClass = () => {
    switch (underline) {
      case 'always':
        return 'underline underline-offset-4';
      case 'active':
        return 'active:underline underline-offset-4';
      case 'none':
        return 'no-underline';
      case 'hover':
      default:
        return 'hover:underline underline-offset-4';
    }
  };

  return (
    <a
      id={id}
      data-slot="link"
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className={`link inline-flex items-center gap-1 font-semibold transition-colors duration-150 cursor-pointer font-sans ${getColorClass()} ${getUnderlineClass()} ${className}`}
      {...props}
    >
      <span data-slot="content">{children}</span>
      {(isExternal || showAnchorIcon) && (
        <svg data-slot="anchor-icon" className="w-3.5 h-3.5 inline-block opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      )}
    </a>
  );
};

export const Link = HeroLink;

export default HeroLink;
