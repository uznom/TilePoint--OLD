import React from 'react';

export interface HeroBreadcrumbItem {
  key?: string | number;
  label: React.ReactNode;
  href?: string;
  onClick?: () => void;
  isCurrent?: boolean;
}

export interface HeroBreadcrumbsProps {
  items?: HeroBreadcrumbItem[];
  separator?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
  id?: string;
}

export const HeroBreadcrumbs: React.FC<HeroBreadcrumbsProps> = ({
  items,
  separator = '/',
  size = 'sm',
  className = '',
  children,
  id,
}) => {
  const getSizeClass = () => {
    switch (size) {
      case 'lg':
        return 'text-sm';
      case 'md':
        return 'text-xs';
      case 'sm':
      default:
        return 'text-[11px]';
    }
  };

  return (
    <nav id={id} aria-label="Breadcrumbs" className={`flex items-center gap-1.5 font-medium ${getSizeClass()} ${className}`}>
      {items
        ? items.map((item, idx) => {
            const isLast = idx === items.length - 1 || item.isCurrent;
            return (
              <React.Fragment key={item.key || idx}>
                {idx > 0 && <span className="text-default-400 select-none">{separator}</span>}
                {isLast ? (
                  <span className="font-bold text-foreground truncate" aria-current="page">
                    {item.label}
                  </span>
                ) : item.onClick ? (
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="text-default-500 hover:text-primary transition-colors cursor-pointer truncate"
                  >
                    {item.label}
                  </button>
                ) : item.href ? (
                  <a
                    href={item.href}
                    className="text-default-500 hover:text-primary transition-colors cursor-pointer truncate"
                  >
                    {item.label}
                  </a>
                ) : (
                  <span className="text-default-500 truncate">{item.label}</span>
                )}
              </React.Fragment>
            );
          })
        : children}
    </nav>
  );
};

export default HeroBreadcrumbs;
