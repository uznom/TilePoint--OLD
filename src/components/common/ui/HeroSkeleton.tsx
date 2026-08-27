import React from 'react';

export interface HeroSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  isLoaded?: boolean;
  className?: string;
  children?: React.ReactNode;
  id?: string;
}

export const HeroSkeleton: React.FC<HeroSkeletonProps> = ({
  isLoaded = false,
  className = '',
  children,
  id,
  ...props
}) => {
  if (isLoaded) {
    return <>{children}</>;
  }

  return (
    <div
      id={id}
      className={`animate-pulse bg-default-200 dark:bg-default-100 rounded-medium ${className}`}
      {...props}
    >
      <div className="invisible">{children}</div>
    </div>
  );
};

HeroSkeleton.displayName = 'HeroSkeleton';

export const Skeleton = HeroSkeleton;

export default HeroSkeleton;

