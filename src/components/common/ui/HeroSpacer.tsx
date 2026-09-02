import React from 'react';

export interface HeroSpacerProps {
  x?: number | string;
  y?: number | string;
  className?: string;
  id?: string;
}

export const HeroSpacer: React.FC<HeroSpacerProps> = ({ x, y, className = '', id }) => {
  const getStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {};
    if (x !== undefined) {
      style.width = typeof x === 'number' ? `${x * 4}px` : x;
      style.minWidth = style.width;
    }
    if (y !== undefined) {
      style.height = typeof y === 'number' ? `${y * 4}px` : y;
      style.minHeight = style.height;
    }
    return style;
  };

  return <span id={id} data-slot="spacer" aria-hidden="true" style={getStyle()} className={`spacer inline-block shrink-0 ${className}`} />;
};

export const Spacer = HeroSpacer;

export default HeroSpacer;
