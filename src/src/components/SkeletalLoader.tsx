/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export const SkeletalLoader: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse w-full max-w-7xl mx-auto">
      {/* Top micro alerts bar mock skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-20 bg-m3-surface-low border border-m3-outline-variant/20 rounded-[24px] flex items-center p-4 gap-4">
          <div className="h-10 w-10 bg-m3-outline-variant/35 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-3.5 bg-m3-outline-variant/35 rounded-md w-1/4" />
            <div className="h-3 bg-m3-outline-variant/20 rounded-md w-3/4" />
          </div>
        </div>
        <div className="h-20 bg-m3-surface-low border border-m3-outline-variant/20 rounded-[24px] flex items-center p-4 gap-4">
          <div className="h-10 w-10 bg-m3-outline-variant/35 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-3.5 bg-m3-outline-variant/35 rounded-md w-1/3" />
            <div className="h-3 bg-m3-outline-variant/20 rounded-md w-2/3" />
          </div>
        </div>
      </div>

      {/* KPI Cards bento skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, idx) => (
          <div key={idx} className="p-5 rounded-[24px] border border-m3-outline-variant/25 bg-m3-surface-low flex items-center justify-between shadow-sm">
            <div className="space-y-2.5 flex-1 mr-4">
              <div className="h-3 bg-m3-outline-variant/30 rounded w-1/2" />
              <div className="h-7 bg-m3-outline-variant/40 rounded w-2/3" />
              <div className="h-2 bg-m3-outline-variant/20 rounded w-1/3" />
            </div>
            <div className="h-11 w-11 bg-m3-outline-variant/30 rounded-[14px] shrink-0" />
          </div>
        ))}
      </div>

      {/* Main double column feed skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left wider block */}
        <div className="lg:col-span-8 p-6 bg-m3-surface-low rounded-[28px] border border-m3-outline-variant/20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-4.5 bg-m3-outline-variant/45 rounded w-1/4" />
            <div className="h-3.5 bg-m3-outline-variant/25 rounded-full w-20" />
          </div>
          <div className="border border-m3-outline-variant/15 rounded-2xl overflow-hidden divide-y divide-m3-outline-variant/15">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-9 w-9 bg-m3-outline-variant/30 rounded-xl shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3 bg-m3-outline-variant/35 rounded w-1/3" />
                    <div className="h-2.5 bg-m3-outline-variant/20 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-3.5 bg-m3-outline-variant/35 rounded w-12" />
              </div>
            ))}
          </div>
        </div>

        {/* Right side widgets block */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 bg-m3-surface-low rounded-[28px] border border-m3-outline-variant/20 space-y-4">
            <div className="h-4 bg-m3-outline-variant/45 rounded w-1/3" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-3 bg-m3-surface rounded-xl border border-m3-outline-variant/10 flex items-center justify-between">
                  <div className="space-y-2 flex-1 mr-4">
                    <div className="h-3 bg-m3-outline-variant/30 rounded w-2/3" />
                    <div className="h-2 bg-m3-outline-variant/15 rounded w-1/3" />
                  </div>
                  <div className="h-6 w-14 bg-m3-outline-variant/25 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
