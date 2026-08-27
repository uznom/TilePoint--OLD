import React from 'react';

export interface BoneyardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width of the skeleton element (e.g. '100%', '120px', 'w-32') */
  width?: string;
  /** Height of the skeleton element (e.g. '16px', 'h-8', '2.5rem') */
  height?: string;
  /** Shape variant */
  variant?: 'rectangular' | 'rounded' | 'circular' | 'pill' | 'text';
  /** Animation speed / intensity */
  speed?: 'normal' | 'fast' | 'pulse';
  /** Animation type */
  animationType?: 'pulse' | 'shimmer' | 'none';
  /** Extra Tailwind classes */
  className?: string;
  /** Optional inner children to wrap with skeleton when isLoaded is false */
  children?: React.ReactNode;
  /** When true, renders children instead of the skeleton placeholder */
  isLoaded?: boolean;
  /** Optional custom ID for accessibility and testing */
  id?: string;
}

/**
 * Boneyard Primitive Skeleton Loader
 * Built with high-performance native CSS skeleton primitives harmonized with dynamic color tokens.
 */
export const Boneyard: React.FC<BoneyardProps> = ({
  width,
  height,
  variant = 'rounded',
  speed = 'normal',
  animationType = 'shimmer',
  className = '',
  children,
  isLoaded = false,
  id,
  style,
  ...props
}) => {
  if (isLoaded && children) {
    return <>{children}</>;
  }

  // Determine radius based on shape variant
  const radiusClass =
    variant === 'circular'
      ? 'rounded-full'
      : variant === 'pill'
      ? 'rounded-full'
      : variant === 'text'
      ? 'rounded-md'
      : variant === 'rectangular'
      ? 'rounded-none'
      : 'rounded-xl';

  const defaultHeight = variant === 'text' ? 'h-4' : height ? '' : 'h-6';

  const animClass =
    animationType === 'none'
      ? ''
      : animationType === 'pulse' || speed === 'pulse'
      ? speed === 'fast'
        ? 'animate-pulse [animation-duration:800ms]'
        : 'animate-pulse'
      : 'animate-pulse [animation-duration:1.5s]';

  // Compute inline style if width/height are specified as raw CSS dimensions
  const customStyle: React.CSSProperties = {
    ...style,
    ...(width && !width.startsWith('w-') ? { width } : {}),
    ...(height && !height.startsWith('h-') ? { height } : {}),
  };

  const widthClass = width && width.startsWith('w-') ? width : !width ? 'w-full' : '';
  const heightClass = height && height.startsWith('h-') ? height : defaultHeight;

  return (
    <div
      id={id}
      className={`relative overflow-hidden bg-content2/70 dark:bg-content2/50 ${radiusClass} ${widthClass} ${heightClass} ${animClass} ${className}`}
      style={customStyle}
      {...props}
    >
      {children || <div className="w-full h-full opacity-0 pointer-events-none select-none">.</div>}
    </div>
  );
};

export default Boneyard;
