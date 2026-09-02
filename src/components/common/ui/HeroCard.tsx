import React from 'react';

export type HeroCardVariant = 'flat' | 'elevated' | 'bordered' | 'shadow';
export type HeroCardRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface HeroCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  variant?: HeroCardVariant;
  radius?: HeroCardRadius;
  className?: string;
  id?: string;
  isHoverable?: boolean;
  isPressable?: boolean;
  onPress?: () => void;
}

export const HeroCard: React.FC<HeroCardProps> & {
  Header: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  Title: React.FC<React.HTMLAttributes<HTMLHeadingElement>>;
  Description: React.FC<React.HTMLAttributes<HTMLParagraphElement>>;
  Body: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  Content: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  Footer: React.FC<React.HTMLAttributes<HTMLDivElement>>;
} = ({
  children,
  variant = 'bordered',
  radius = '2xl',
  isHoverable = false,
  isPressable = false,
  onPress,
  className = '',
  id,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'flat':
        return 'bg-zinc-100/90 dark:bg-zinc-800/60 border border-transparent shadow-none text-foreground';
      case 'elevated':
        return 'bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/10 shadow-elevation-card text-foreground';
      case 'shadow':
        return 'bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 shadow-elevation-floating text-foreground';
      case 'bordered':
      default:
        return 'bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 shadow-elevation-soft text-foreground';
    }
  };

  const getRadiusStyles = () => {
    switch (radius) {
      case 'none':
        return 'rounded-none';
      case 'sm':
        return 'rounded-small';
      case 'md':
        return 'rounded-medium';
      case 'lg':
        return 'rounded-large';
      case 'xl':
        return 'rounded-xl';
      case '2xl':
      default:
        return 'rounded-2xl';
    }
  };

  const hoverStyle = isHoverable
    ? 'hover:border-primary/50 hover:shadow-elevation-card hover:-translate-y-[1.5px] transition-all duration-200 ease-out'
    : '';

  const pressStyle = isPressable
    ? 'cursor-pointer active:scale-[0.985] active:translate-y-[0px] transition-transform duration-150'
    : '';

  return (
    <div
      id={id}
      data-slot="card"
      onClick={onPress || props.onClick}
      className={`card ${getRadiusStyles()} overflow-hidden ${getVariantStyles()} ${hoverStyle} ${pressStyle} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

HeroCard.Header = ({ children, className = '', ...props }) => (
  <div
    data-slot="card-header"
    className={`card__header p-4 sm:p-5 border-b border-divider flex items-center justify-between gap-3 ${className}`}
    {...props}
  >
    {children}
  </div>
);

HeroCard.Title = ({ children, className = '', ...props }) => (
  <h3
    data-slot="card-title"
    className={`card__title text-sm font-semibold tracking-tight text-foreground ${className}`}
    {...props}
  >
    {children}
  </h3>
);

HeroCard.Description = ({ children, className = '', ...props }) => (
  <p data-slot="card-description" className={`card__description text-xs text-default-500 mt-0.5 font-normal ${className}`} {...props}>
    {children}
  </p>
);

HeroCard.Body = ({ children, className = '', ...props }) => (
  <div data-slot="card-body" className={`card__body p-4 sm:p-5 ${className}`} {...props}>
    {children}
  </div>
);

HeroCard.Content = HeroCard.Body;

HeroCard.Footer = ({ children, className = '', ...props }) => (
  <div
    data-slot="card-footer"
    className={`card__footer p-3.5 sm:p-4 border-t border-divider bg-content2/40 flex items-center justify-between gap-3 ${className}`}
    {...props}
  >
    {children}
  </div>
);

export default HeroCard;
