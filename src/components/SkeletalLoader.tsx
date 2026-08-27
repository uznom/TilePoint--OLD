/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HeroSkeleton } from './common/ui/HeroSkeleton';
import { HeroCard } from './common/ui/HeroCard';

export const SkeletalLoader: React.FC = () => {
  return (
    <div className="w-full space-y-6 animate-fade-in p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <HeroCard key={i} className="p-4 bg-content1 rounded-2xl border border-divider/40">
            <HeroSkeleton className="h-4 w-20 rounded-md mb-2" />
            <HeroSkeleton className="h-8 w-28 rounded-lg" />
          </HeroCard>
        ))}
      </div>
      <HeroCard className="p-6 bg-content1 rounded-2xl border border-divider/40">
        <HeroSkeleton className="h-6 w-48 rounded-lg mb-4" />
        <HeroSkeleton className="h-64 w-full rounded-xl" />
      </HeroCard>
    </div>
  );
};

export default SkeletalLoader;
