/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';

interface ImportProgressOverlayProps {
  isImportingProgress: boolean;
  importProgressStatus: string;
  importProgressSubtext: string;
  importProgressPercent: number;
  importTotalRecords: number;
}

export const ImportProgressOverlay: React.FC<ImportProgressOverlayProps> = ({
  isImportingProgress,
  importProgressStatus,
  importProgressSubtext,
  importProgressPercent,
  importTotalRecords
}) => {
  if (!isImportingProgress) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md pointer-events-auto select-none font-sans"
      onKeyDown={(e) => e.preventDefault()}
    >
      <div className="bg-content1 border border-divider/30 rounded-2xl p-8 shadow-2xl w-full max-w-md text-center space-y-6 animate-scale-up border-t-4 border-t-zinc-700 dark:border-t-zinc-300">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-default-100 border border-divider/30 text-default-800 dark:text-default-200 shadow-inner">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase text-primary tracking-widest bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
            HIGH-PRIORITY INVENTORY IMPORT
          </span>
          <h3 className="text-base font-extrabold text-foreground">
            {importProgressStatus || 'Migrating CSV Data Records...'}
          </h3>
          <p className="text-xs text-default-500 font-medium leading-relaxed">
            {importProgressSubtext || 'Processing CSV rows, verifying data types, and updating catalog tables.'}
          </p>
        </div>

        {/* Progress Bar Container */}
        <div className="space-y-2 px-1">
          <div className="flex justify-between items-center text-xs font-extrabold">
            <span className="text-default-500 uppercase tracking-wider text-[11px]">CSV Migration Status</span>
            <span className="text-default-800 dark:text-default-200 text-sm font-black">{Math.min(100, Math.max(0, importProgressPercent))}%</span>
          </div>

          <div className="h-4 w-full bg-default-100/40 rounded-full overflow-hidden p-[2px] border border-divider/25 shadow-inner">
            <div
              className="h-full rounded-full bg-content2 dark:bg-content2 transition-all duration-300 shadow-sm"
              style={{ width: `${Math.min(100, Math.max(0, importProgressPercent))}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] text-default-500/80 pt-1">
            <span>{importTotalRecords > 0 ? `${importTotalRecords.toLocaleString()} Total Items` : 'Stream Processing'}</span>
            <span className="text-rose-500 dark:text-rose-400 font-black uppercase tracking-wider flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              LOCKED UNTIL FINISHED
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-left text-xs text-amber-700 dark:text-amber-300 font-medium flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 shrink-0 text-amber-500" />
          <p className="text-[11px] leading-tight font-sans">
            Please wait while the import completes. System window closure and user interactions are locked to ensure data integrity.
          </p>
        </div>
      </div>
    </div>
  );
};
