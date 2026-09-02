import React from 'react';

export interface HeroDividerProps extends React.HTMLAttributes<HTMLHRElement | HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  id?: string;
}

export const HeroDivider: React.FC<HeroDividerProps> = ({
  orientation = 'horizontal',
  className = '',
  id,
  ...props
}) => {
  if (orientation === 'vertical') {
    return (
      <div
        id={id}
        data-slot="divider"
        role="separator"
        aria-orientation="vertical"
        className={`divider w-px h-full min-h-4 bg-divider self-stretch shrink-0 ${className}`}
        {...props}
      />
    );
  }

  return (
    <hr
      id={id}
      data-slot="divider"
      role="separator"
      aria-orientation="horizontal"
      className={`divider w-full border-none h-px bg-divider shrink-0 my-2 ${className}`}
      {...props}
    />
  );
};

export const Divider = HeroDivider;

export default HeroDivider;
