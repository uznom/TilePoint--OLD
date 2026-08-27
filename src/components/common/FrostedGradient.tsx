import React from 'react';

export type GradientPreset =
  | 'dynamic'
  | 'dynamic-glass'
  | 'primary'
  | 'secondary'
  | 'emerald'
  | 'rose'
  | 'amber'
  | 'indigo'
  | 'dark-glass'
  | 'light-glass';

export interface FrostedGradientProps extends React.HTMLAttributes<HTMLDivElement> {
  preset?: GradientPreset;
  customGradient?: string;
  solidFallbackColor?: string;
  as?: React.ElementType;
  children?: React.ReactNode;
  className?: string;
  id?: string;
}

const PRESET_STYLES: Record<
  GradientPreset,
  { gradient: string; solidFallback: string; text: string }
> = {
  dynamic: {
    gradient: 'bg-gradient-to-r from-primary via-secondary/90 to-secondary',
    solidFallback: 'solid-primary-bg',
    text: 'text-white',
  },
  'dynamic-glass': {
    gradient:
      'bg-gradient-to-br from-primary/[0.08] via-white/80 to-secondary/[0.05] dark:from-primary/[0.12] dark:via-zinc-900/80 dark:to-secondary/[0.08]',
    solidFallback: 'solid-surface-bg',
    text: 'text-foreground',
  },
  primary: {
    gradient: 'bg-gradient-to-r from-primary via-primary/80 to-secondary',
    solidFallback: 'solid-primary-bg',
    text: 'text-white',
  },
  secondary: {
    gradient: 'bg-gradient-to-r from-secondary via-secondary/80 to-primary',
    solidFallback: 'solid-secondary-bg',
    text: 'text-white',
  },
  emerald: {
    gradient: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600',
    solidFallback: 'solid-emerald-bg',
    text: 'text-white',
  },
  rose: {
    gradient: 'bg-gradient-to-r from-rose-600 via-red-600 to-pink-600',
    solidFallback: 'solid-rose-bg',
    text: 'text-white',
  },
  amber: {
    gradient: 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600',
    solidFallback: 'solid-amber-bg',
    text: 'text-white',
  },
  indigo: {
    gradient: 'bg-gradient-to-r from-indigo-600 via-sky-600 to-blue-600',
    solidFallback: 'solid-indigo-bg',
    text: 'text-white',
  },
  'dark-glass': {
    gradient:
      'bg-gradient-to-b from-white/[0.08] to-white/[0.02] dark:from-zinc-900/80 dark:to-zinc-950/90',
    solidFallback: 'solid-surface-bg',
    text: 'text-foreground',
  },
  'light-glass': {
    gradient:
      'bg-gradient-to-b from-white/90 to-white/70 dark:from-zinc-900/90 dark:to-zinc-950/90',
    solidFallback: 'solid-surface-bg',
    text: 'text-foreground',
  },
};

/**
 * Frosted Gradient Container Component.
 * - Displays a rich liquid gradient with frosted backdrop filter in standard mode.
 * - Seamlessly strips all gradients and switches to a crisp, high-contrast solid color when "Remove UI blurs and backdrop" is active.
 */
export const FrostedGradient: React.FC<FrostedGradientProps> = ({
  preset = 'primary',
  customGradient,
  solidFallbackColor,
  as: Component = 'div',
  children,
  className = '',
  id,
  ...rest
}) => {
  const config = PRESET_STYLES[preset];
  const gradientClass = customGradient || config.gradient;
  const solidClass = solidFallbackColor || config.solidFallback;

  return (
    <Component
      id={id}
      className={`frosted-gradient-box ${gradientClass} ${solidClass} ${config.text} transition-all duration-300 ${className}`}
      {...rest}
    >
      {children}
    </Component>
  );
};
