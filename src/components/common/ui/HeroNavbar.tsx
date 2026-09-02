import React from 'react';

export interface HeroNavbarProps extends React.HTMLAttributes<HTMLElement> {
  isBordered?: boolean;
  className?: string;
  children?: React.ReactNode;
  id?: string;
}

export const HeroNavbar: React.FC<HeroNavbarProps> & {
  Brand: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  Content: React.FC<React.HTMLAttributes<HTMLDivElement> & { justify?: 'start' | 'center' | 'end' }>;
  Item: React.FC<React.HTMLAttributes<HTMLDivElement> & { isActive?: boolean }>;
} = ({ isBordered = true, className = '', children, id, ...props }) => {
  return (
    <nav
      id={id}
      data-slot="navbar"
      className={`navbar w-full h-14 sm:h-16 px-4 sm:px-6 bg-content1/80 backdrop-blur-md flex items-center justify-between gap-4 sticky top-0 z-40 transition-colors ${
        isBordered ? 'border-b border-divider/40' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </nav>
  );
};

HeroNavbar.Brand = ({ children, className = '', ...props }) => (
  <div data-slot="brand" className={`navbar__brand flex items-center gap-3 shrink-0 ${className}`} {...props}>
    {children}
  </div>
);

HeroNavbar.Content = ({ children, justify = 'start', className = '', ...props }) => {
  const getJustify = () => {
    switch (justify) {
      case 'center':
        return 'justify-center';
      case 'end':
        return 'justify-end';
      case 'start':
      default:
        return 'justify-start';
    }
  };

  return (
    <div data-slot="content" className={`navbar__content flex items-center gap-3 flex-1 min-w-0 ${getJustify()} ${className}`} {...props}>
      {children}
    </div>
  );
};

HeroNavbar.Item = ({ children, isActive = false, className = '', ...props }) => (
  <div
    data-slot="item"
    className={`navbar__item flex items-center text-xs font-semibold transition-colors ${
      isActive ? 'text-primary font-bold' : 'text-default-600 hover:text-foreground'
    } ${className}`}
    {...props}
  >
    {children}
  </div>
);

export default HeroNavbar;
