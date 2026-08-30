import React, { useEffect, useState, useMemo } from 'react';
import { Loader2, Gauge, HardDrive, Sparkles, Layers } from 'lucide-react';
import { HeroSkeleton } from './common/ui/HeroSkeleton';
import { HeroCard } from './common/ui/HeroCard';

export interface PageLoadingFallbackProps {
  message?: string;
  activeTab?: string;
  moduleKey?: string;
  estimatedSizeKB?: number;
  title?: string;
}

interface ModuleMeta {
  displayName: string;
  sizeKB: number;
  complexity: 'Light' | 'Standard' | 'Medium' | 'High' | 'Heavy';
  category: string;
}

// Module Bundle Size Registry (Calibrated to production bundle weights)
const MODULE_REGISTRY: Record<string, ModuleMeta> = {
  pos: { displayName: 'Point of Sale Terminal', sizeKB: 215, complexity: 'Heavy', category: 'Transaction Engine' },
  ledger: { displayName: 'Customer Receivables & Ledger', sizeKB: 215, complexity: 'Heavy', category: 'Financials' },
  'atpos-extra': { displayName: 'Extended Reports & BIR Operations', sizeKB: 148, complexity: 'Heavy', category: 'Compliance' },
  procurement: { displayName: 'Procurement & Purchase Orders', sizeKB: 124, complexity: 'High', category: 'Supply Chain' },
  'procurement-po': { displayName: 'Purchase Order Management', sizeKB: 124, complexity: 'High', category: 'Supply Chain' },
  'sales-transmission': { displayName: 'Sales Transmission Hub', sizeKB: 118, complexity: 'High', category: 'Integration' },
  branches: { displayName: 'Multi-Branch Operations', sizeKB: 89, complexity: 'Medium', category: 'Enterprise' },
  inventory: { displayName: 'Inventory & Stock Management', sizeKB: 79, complexity: 'Standard', category: 'Warehousing' },
  'inventory-stocks': { displayName: 'Stock Level Overview', sizeKB: 79, complexity: 'Standard', category: 'Warehousing' },
  'inventory-adjustments': { displayName: 'Stock Adjustments', sizeKB: 79, complexity: 'Standard', category: 'Warehousing' },
  'inventory-transfer': { displayName: 'Stock Transfers', sizeKB: 79, complexity: 'Standard', category: 'Logistics' },
  deliveries: { displayName: 'Dispatch & Fleet Logistics', sizeKB: 79, complexity: 'Standard', category: 'Logistics' },
  users: { displayName: 'Staff & Access Control Matrix', sizeKB: 76, complexity: 'Standard', category: 'Administration' },
  'profit-analytics': { displayName: 'Profit Margins & Loss Auditing', sizeKB: 65, complexity: 'Standard', category: 'Analytics' },
  analytics: { displayName: 'Executive Financial Analytics', sizeKB: 65, complexity: 'Standard', category: 'Analytics' },
  dashboard: { displayName: 'Executive Dashboard & KPI Hub', sizeKB: 61, complexity: 'Standard', category: 'Executive' },
  'system-settings': { displayName: 'System Configuration & Controls', sizeKB: 61, complexity: 'Standard', category: 'System' },
  settings: { displayName: 'System Configuration', sizeKB: 61, complexity: 'Standard', category: 'System' },
  transmittal: { displayName: 'Branch Stock Transmittals', sizeKB: 59, complexity: 'Standard', category: 'Logistics' },
  'staff-portal': { displayName: 'Staff Portal & Terminal', sizeKB: 59, complexity: 'Standard', category: 'Operations' },
  portal: { displayName: 'Staff Portal', sizeKB: 59, complexity: 'Standard', category: 'Operations' },
  'daily-reconciliation': { displayName: 'EOD Daily Sales Reconciliation', sizeKB: 50, complexity: 'Standard', category: 'Accounting' },
  archives: { displayName: 'Archived Documents & Records', sizeKB: 36, complexity: 'Light', category: 'Records' },
  setup: { displayName: 'Enterprise System Setup', sizeKB: 36, complexity: 'Light', category: 'Administration' },
  tutorials: { displayName: 'Interactive Onboarding', sizeKB: 31, complexity: 'Light', category: 'Guide' },
  'damage-register': { displayName: 'Defect & Damage Registry', sizeKB: 29, complexity: 'Light', category: 'Audit' },
  shift: { displayName: 'Cashier Shift Reconciliation', sizeKB: 23, complexity: 'Light', category: 'POS' },
  shifts: { displayName: 'Shift Operations', sizeKB: 23, complexity: 'Light', category: 'POS' },
  calculator: { displayName: 'Tile Estimator & Calculator', sizeKB: 20, complexity: 'Light', category: 'Utility' },
};

export const PageLoadingFallback: React.FC<PageLoadingFallbackProps> = ({
  message,
  activeTab,
  moduleKey,
  estimatedSizeKB,
  title,
}) => {
  const currentKey = (moduleKey || activeTab || '').toLowerCase();
  
  // Resolve module specifications based on registry or props
  const meta: ModuleMeta = useMemo(() => {
    if (estimatedSizeKB) {
      return {
        displayName: title || 'Application Module',
        sizeKB: estimatedSizeKB,
        complexity: estimatedSizeKB > 120 ? 'Heavy' : estimatedSizeKB > 60 ? 'Standard' : 'Light',
        category: 'Subsystem',
      };
    }
    if (currentKey && MODULE_REGISTRY[currentKey]) {
      return MODULE_REGISTRY[currentKey];
    }
    // Check partial prefix matching
    const matchingKey = Object.keys(MODULE_REGISTRY).find((k) => currentKey.startsWith(k) || k.startsWith(currentKey));
    if (matchingKey) {
      return MODULE_REGISTRY[matchingKey];
    }
    return {
      displayName: title || 'Loading Module',
      sizeKB: 48,
      complexity: 'Standard',
      category: 'System Component',
    };
  }, [currentKey, estimatedSizeKB, title]);

  // Compute dynamic estimated completion time in milliseconds based on payload size & connection profile
  const { totalEstimatedMs, connectionSpeedLabel } = useMemo(() => {
    let speedFactor = 1.0; // Default fast connection baseline
    let label = 'High-Speed LAN / 4G';

    if (typeof navigator !== 'undefined' && (navigator as any).connection) {
      const conn = (navigator as any).connection;
      if (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g') {
        speedFactor = 4.2;
        label = 'Slow 2G Connection';
      } else if (conn.effectiveType === '3g') {
        speedFactor = 2.4;
        label = '3G Network';
      } else if (conn.downlink && conn.downlink < 2) {
        speedFactor = 1.8;
        label = 'Moderate Connection';
      }
    }

    // Base parse & execution overhead (~90ms) + Transfer & AST compile (~2.2ms per KB)
    const rawEst = (90 + meta.sizeKB * 2.2) * speedFactor;
    const boundedEst = Math.max(160, Math.min(2800, Math.round(rawEst)));

    return {
      totalEstimatedMs: boundedEst,
      connectionSpeedLabel: label,
    };
  }, [meta.sizeKB]);

  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const startTime = performance.now();
    const interval = setInterval(() => {
      const currentElapsed = Math.round(performance.now() - startTime);
      setElapsedMs(currentElapsed);
    }, 40);

    return () => clearInterval(interval);
  }, []);

  // Compute smooth logarithmic progress towards 96%
  const progressRatio = Math.min(0.96, (elapsedMs / totalEstimatedMs) * 0.92 + 0.05);
  const progressPercent = Math.round(progressRatio * 100);

  // Compute remaining time in seconds
  const remainingSec = Math.max(0.1, (totalEstimatedMs - elapsedMs) / 1000).toFixed(1);
  const totalEstSec = (totalEstimatedMs / 1000).toFixed(1);

  // Dynamic lifecycle stage
  const loadingStage = useMemo(() => {
    if (progressPercent < 35) return `Fetching Chunk Bundles (~${meta.sizeKB} KB)...`;
    if (progressPercent < 75) return 'Parsing AST & Component Tree...';
    return 'Mounting Dynamic Layout & State...';
  }, [progressPercent, meta.sizeKB]);

  return (
    <div className="flex flex-col items-start justify-start w-full min-h-[calc(100vh-140px)] p-2 sm:p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Dynamic Module Loading Status Card */}
      <div className="w-full bg-content1/80 backdrop-blur-md rounded-2xl border border-divider/60 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-foreground">
                  {meta.displayName}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-default-100 text-default-600 border border-divider">
                  <Layers className="w-3 h-3" />
                  {meta.category}
                </span>
              </div>
              <p className="text-xs text-default-500 font-medium">
                {message || loadingStage}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-default-100/80 border border-divider/80 text-xs font-semibold text-foreground">
              <HardDrive className="w-3.5 h-3.5 text-primary" />
              <span>{meta.sizeKB} KB</span>
              <span className="hidden md:inline text-[10px] text-default-500 font-normal">({connectionSpeedLabel})</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
              <Gauge className="w-3.5 h-3.5" />
              <span>Est. ~{totalEstSec}s</span>
              <span className="text-[10px] opacity-75 font-normal">({remainingSec}s left)</span>
            </div>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center text-[11px] font-semibold text-default-600">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary" />
              {loadingStage}
            </span>
            <span className="tabular-nums font-mono text-primary">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-default-100 rounded-full overflow-hidden border border-divider/40">
            <div
              className="h-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-150 ease-out rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="w-full space-y-6">
        {/* Top Header Bar Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
          <div className="space-y-2">
            <HeroSkeleton className="w-64 h-8 rounded-xl" />
            <HeroSkeleton className="w-96 h-4 rounded-lg" />
          </div>
          <div className="flex items-center gap-3">
            <HeroSkeleton className="w-28 h-10 rounded-xl" />
            <HeroSkeleton className="w-36 h-10 rounded-xl" />
          </div>
        </div>

        {/* Responsive Metric KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-4 gap-4 w-full">
          <HeroCard className="p-5 bg-content1 rounded-2xl border border-divider/40 space-y-3">
            <div className="flex items-center justify-between">
              <HeroSkeleton className="h-4 w-28 rounded-md" />
              <HeroSkeleton className="h-8 w-8 rounded-xl" />
            </div>
            <HeroSkeleton className="h-8 w-36 rounded-lg" />
            <HeroSkeleton className="h-3 w-20 rounded-md" />
          </HeroCard>
          <HeroCard className="p-5 bg-content1 rounded-2xl border border-divider/40 space-y-3">
            <div className="flex items-center justify-between">
              <HeroSkeleton className="h-4 w-28 rounded-md" />
              <HeroSkeleton className="h-8 w-8 rounded-xl" />
            </div>
            <HeroSkeleton className="h-8 w-36 rounded-lg" />
            <HeroSkeleton className="h-3 w-20 rounded-md" />
          </HeroCard>
          <HeroCard className="p-5 bg-content1 rounded-2xl border border-divider/40 space-y-3">
            <div className="flex items-center justify-between">
              <HeroSkeleton className="h-4 w-28 rounded-md" />
              <HeroSkeleton className="h-8 w-8 rounded-xl" />
            </div>
            <HeroSkeleton className="h-8 w-36 rounded-lg" />
            <HeroSkeleton className="h-3 w-20 rounded-md" />
          </HeroCard>
          <HeroCard className="p-5 bg-content1 rounded-2xl border border-divider/40 space-y-3">
            <div className="flex items-center justify-between">
              <HeroSkeleton className="h-4 w-28 rounded-md" />
              <HeroSkeleton className="h-8 w-8 rounded-xl" />
            </div>
            <HeroSkeleton className="h-8 w-36 rounded-lg" />
            <HeroSkeleton className="h-3 w-20 rounded-md" />
          </HeroCard>
        </div>

        {/* Full Screen Main Table / Workspace Card */}
        <HeroCard className="p-6 bg-content1 rounded-2xl border border-divider/40 space-y-4 w-full flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-divider/20">
            <HeroSkeleton className="h-6 w-52 rounded-lg" />
            <div className="flex items-center gap-2">
              <HeroSkeleton className="h-9 w-48 rounded-xl" />
              <HeroSkeleton className="h-9 w-24 rounded-xl" />
            </div>
          </div>
          <div className="space-y-3 pt-2">
            <HeroSkeleton className="h-10 w-full rounded-xl" />
            <HeroSkeleton className="h-14 w-full rounded-xl" />
            <HeroSkeleton className="h-14 w-full rounded-xl" />
            <HeroSkeleton className="h-14 w-full rounded-xl" />
            <HeroSkeleton className="h-14 w-full rounded-xl" />
            <HeroSkeleton className="h-14 w-full rounded-xl" />
          </div>
        </HeroCard>
      </div>
    </div>
  );
};

export default PageLoadingFallback;
