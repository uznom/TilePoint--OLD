import React from 'react';
import { Plus, Sliders } from 'lucide-react';
import { Branch, Product } from '../../types/db';
import { HeroButton } from '../common/ui/HeroButton';
import { HeroTable } from '../common/ui/HeroTable';

interface StockLedgerSubTabProps {
  setShowManualLedgerModal: (v: boolean) => void;
  branches: Branch[];
  isAdminUser: boolean;
  activeBranchId: string;
  selectedViewBranchId: string;
  products: Product[];
  branchStock: any[];
  isProductInBranch: (p: Product, bId: string, branchStock: any[], branches: Branch[]) => boolean;
  getBranchStockQuantity: (p: Product, bId: string, branchStock: any[], branches: Branch[]) => number;
  filteredLedgerEntries: any[];
  paginatedLedger: any[];
}

export const StockLedgerSubTab: React.FC<StockLedgerSubTabProps> = ({
  setShowManualLedgerModal,
  branches,
  isAdminUser,
  activeBranchId,
  selectedViewBranchId,
  products,
  branchStock,
  isProductInBranch,
  getBranchStockQuantity,
  filteredLedgerEntries,
  paginatedLedger,
}) => {
  return (
    <div className="space-y-6 text-left animate-fade-in font-sans text-xs">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/70 dark:border-white/10 shadow-elevation-soft">
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sliders className="h-5 w-5 text-primary" />
            <span>Branch Logistics Distribution &amp; Ledger Heatmap</span>
          </h2>
          <p className="text-xs text-default-500 font-medium mt-0.5">
            Physical stock allocation breakdown across all active company branches and yards.
          </p>
        </div>
        <HeroButton
          color="primary"
          onClick={() => setShowManualLedgerModal(true)}
          startIcon={<Plus className="h-4 w-4" />}
          radius="full"
          className="font-bold shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
        >
          Manual Ledger Entry
        </HeroButton>
      </div>

      {/* Branch Heatmap Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-sans">
        {branches.filter(b => !b.isDeleted && (isAdminUser || b.id === activeBranchId)).map(b => {
          const bProducts = products.filter(p => !p.isDeleted && isProductInBranch(p, b.id, branchStock, branches));
          const totalUnitsInBranch = bProducts.reduce((acc, p) => acc + getBranchStockQuantity(p, b.id, branchStock, branches), 0);
          const lowStockCount = bProducts.filter(p => {
            const qty = getBranchStockQuantity(p, b.id, branchStock, branches);
            return qty > 0 && qty <= (p.minimumStock || 20);
          }).length;

          return (
            <div key={b.id} className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/70 dark:border-white/10 space-y-3.5 relative overflow-hidden shadow-elevation-soft">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-foreground tracking-tight">{b.name}</h3>
                  <span className="text-[10px] text-default-500 font-mono">Code: {b.branchCode || b.id}</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                  b.id === selectedViewBranchId || selectedViewBranchId === 'consolidated'
                    ? 'bg-primary/10 text-primary border-primary/20'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-default-500 border-zinc-200/50 dark:border-white/5'
                }`}>
                  {b.isDistributionBranch ? 'HQ Hub' : 'Store Branch'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-zinc-100/90 dark:bg-zinc-800/80 p-3 rounded-2xl border border-zinc-200/50 dark:border-white/5 shadow-2xs">
                  <span className="text-[10px] text-default-500 font-bold uppercase tracking-wider block">Physical Units</span>
                  <span className="text-base font-bold text-primary font-mono">{totalUnitsInBranch.toLocaleString()} Units</span>
                </div>
                <div className="bg-zinc-100/90 dark:bg-zinc-800/80 p-3 rounded-2xl border border-zinc-200/50 dark:border-white/5 shadow-2xs">
                  <span className="text-[10px] text-default-500 font-bold uppercase tracking-wider block">Low Stock Items</span>
                  <span className={`text-base font-bold font-mono ${lowStockCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {lowStockCount}
                  </span>
                </div>
              </div>

              {/* Intensity Bar */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[10px] font-bold text-default-500">
                  <span>Capacity Volume Allocation</span>
                  <span className="font-mono">{Math.min(100, Math.round((totalUnitsInBranch / 5000) * 100))}%</span>
                </div>
                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((totalUnitsInBranch / 5000) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ledger Entries Table */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-default-500">
          Enterprise Financial &amp; Movement Ledger Log ({filteredLedgerEntries.length})
        </h3>
        <HeroTable isStriped className="min-w-full">
          <HeroTable.Header>
            <HeroTable.Column>Date</HeroTable.Column>
            <HeroTable.Column>Branch Node</HeroTable.Column>
            <HeroTable.Column>Product Name</HeroTable.Column>
            <HeroTable.Column align="center">Movement Type</HeroTable.Column>
            <HeroTable.Column align="end">Quantity</HeroTable.Column>
            <HeroTable.Column>Reference No</HeroTable.Column>
            <HeroTable.Column>Remarks</HeroTable.Column>
          </HeroTable.Header>
          <HeroTable.Body>
            {filteredLedgerEntries.length === 0 ? (
              <HeroTable.Row isHoverable={false}>
                <HeroTable.Cell colSpan={7} className="py-12 text-center text-default-500 italic font-medium">
                  No ledger entries recorded for this branch scope yet.
                </HeroTable.Cell>
              </HeroTable.Row>
            ) : (
              paginatedLedger.map((le) => {
                const br = branches.find(b => b.id === le.branchId);
                return (
                  <HeroTable.Row key={le.id}>
                    <HeroTable.Cell className="text-[11px] text-default-500 font-mono">
                      {le.date}
                    </HeroTable.Cell>
                    <HeroTable.Cell className="font-bold text-foreground">
                      {br?.name || le.branchId}
                    </HeroTable.Cell>
                    <HeroTable.Cell className="font-semibold text-foreground">
                      {le.productName}
                    </HeroTable.Cell>
                    <HeroTable.Cell align="center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        le.type === 'IN' || le.type === 'PURCHASE'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : le.type === 'OUT' || le.type === 'SALE'
                          ? 'bg-rose-500/10 text-rose-500'
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {le.type}
                      </span>
                    </HeroTable.Cell>
                    <HeroTable.Cell align="end" className="font-bold text-foreground font-mono">
                      {le.quantity}
                    </HeroTable.Cell>
                    <HeroTable.Cell className="text-default-500 font-mono text-[11px]">
                      {le.referenceNo || '—'}
                    </HeroTable.Cell>
                    <HeroTable.Cell className="text-default-500 text-[11px] max-w-xs truncate font-medium">
                      {le.remarks || '—'}
                    </HeroTable.Cell>
                  </HeroTable.Row>
                );
              })
            )}
          </HeroTable.Body>
        </HeroTable>
      </div>
    </div>
  );
};

export default StockLedgerSubTab;
