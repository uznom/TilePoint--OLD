import React from 'react';
import { LiquidGlass, LiquidGlassIntensity } from './LiquidGlass';

export interface LiquidGlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  intensity?: LiquidGlassIntensity;
  glow?: boolean;
  solidBgClass?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  id?: string;
}

/**
 * Reusable Minimal Liquid Frosted Glass Card.
 * Renders an optical frosted glass surface with seamless solid fallback when "Remove UI blurs & backdrop" is active.
 */
export const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({
  intensity = 'medium',
  glow = false,
  solidBgClass = '',
  header,
  footer,
  children,
  className = '',
  id,
  ...rest
}) => {
  return (
    <LiquidGlass
      as="div"
      id={id}
      variant="card"
      intensity={intensity}
      glow={glow}
      solidBgClass={solidBgClass}
      className={`relative overflow-hidden flex flex-col transition-all duration-300 ${className}`}
      {...rest}
    >
      {header && (
        <div className="pb-3 mb-4 border-b border-divider/15 flex items-center justify-between">
          {header}
        </div>
      )}
      <div className="flex-1 w-full">{children}</div>
      {footer && (
        <div className="pt-3 mt-4 border-t border-divider/15 flex items-center justify-end gap-2">
          {footer}
        </div>
      )}
    </LiquidGlass>
  );
};
