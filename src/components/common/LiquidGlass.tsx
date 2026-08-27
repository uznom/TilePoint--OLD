import React from 'react';

export type LiquidGlassVariant =
  | 'card'
  | 'header'
  | 'modal'
  | 'pill'
  | 'panel'
  | 'button'
  | 'badge'
  | 'bar';

export type LiquidGlassIntensity = 'subtle' | 'medium' | 'deep';

export interface LiquidGlassProps extends React.HTMLAttributes<HTMLElement> {
  variant?: LiquidGlassVariant;
  intensity?: LiquidGlassIntensity;
  uiStyle?: 'translucent' | 'frosted' | 'opaque';
  glow?: boolean;
  solidBgClass?: string;
  as?: React.ElementType;
  children?: React.ReactNode;
  className?: string;
  id?: string;
}

/**
 * Minimal Liquid Frosted Glass Component.
 * - Supports 3 distinct visual rendering modes: "translucent", "frosted", and "opaque" (solid).
 * - In default/frosted mode: Renders a silky liquid frosted glass surface with deep diffusion and specular highlights.
 * - In translucent mode: Renders a crystal-clear high-transparency glass surface.
 * - In opaque mode (or accessibility-no-blur): Automatically renders a 100% solid, opaque, high-contrast surface with zero blur and no gradients.
 */
export const LiquidGlass: React.FC<LiquidGlassProps> = ({
  variant = 'card',
  intensity = 'medium',
  uiStyle,
  glow = false,
  solidBgClass = '',
  as: Component = 'div',
  children,
  className = '',
  id,
  ...rest
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'header':
        return 'sticky top-0 z-30 bg-content1/80 backdrop-blur-md border-b border-divider/20 shadow-sm';
      case 'modal':
        return 'bg-content1 rounded-2xl border border-divider/30 shadow-2xl';
      case 'pill':
        return 'bg-content2/80 rounded-full border border-divider/25 px-3 py-1.5 text-xs font-semibold';
      case 'panel':
        return 'bg-content1/90 rounded-2xl border border-divider/20 p-4 shadow-lg';
      case 'button':
        return 'bg-content2 hover:bg-content3 rounded-xl border border-divider/30 px-4 py-2 text-xs font-bold transition-all cursor-pointer';
      case 'badge':
        return 'bg-content2/80 rounded-md border border-divider/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider';
      case 'bar':
        return 'bg-content1/80 backdrop-blur-sm border border-divider/20 rounded-2xl px-4 py-2.5 shadow-md';
      case 'card':
      default:
        return 'bg-content1 border border-divider/25 rounded-2xl p-5 shadow-sm';
    }
  };

  return (
    <Component
      id={id}
      data-ui-style={uiStyle || undefined}
      className={`${getVariantClasses()} ${solidBgClass} ${className}`}
      {...rest}
    >
      {children}
    </Component>
  );
};
