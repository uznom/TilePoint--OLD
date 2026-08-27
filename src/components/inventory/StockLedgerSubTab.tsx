import React from 'react';
import { Plus, Sliders } from 'lucide-react';
import { Branch, Product } from '../../types/db';
import { HeroButton } from '../common/ui/HeroButton';

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
    <div className="space-y-6 text-left animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-content1 p-5 rounded-large border border-divider shadow-sm">
        <div>
          <h2 className="text-base font-black text-foreground uppercase tracking-wider flex items-center gap-2">
            <Sliders className="h-5 w-5 text-primary" />
            <span>Branch Logistics Distribution &amp; Ledger Heatmap</span>
          </h2>
        </div>
        <HeroButton
          color="primary"
          onClick={() => setShowManualLedgerModal(true)}
          startIcon={<Plus className="h-4 w-4" />}
          className="text-xs font-black uppercase tracking-wider shadow-md"
        >
          Manual Ledger Entry
        </HeroButton>
      </div>

      {/* Branch Heatmap Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.filter(b => !b.isDeleted && (isAdminUser || b.id === activeBranchId)).map(b => {
          const bProducts = products.filter(p => !p.isDeleted && isProductInBranch(p, b.id, branchStock, branches));
          const totalUnitsInBranch = bProducts.reduce((acc, p) => acc + getBranchStockQuantity(p, b.id, branchStock, branches), 0);
          const lowStockCount = bProducts.filter(p => {
            const qty = getBranchStockQuantity(p, b.id, branchStock, branches);
            return qty > 0 && qty <= (p.minimumStock || 20);
          }).length;

          return (
            <div key={b.id} className="bg-content1 p-5 rounded-large border border-divider space-y-3 relative overflow-hidden shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black text-foreground">{b.name}</h3>
                  <span className="text-[10px] text-default-500">Code: {b.branchCode || b.id}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                  b.id === selectedViewBranchId || selectedViewBranchId === 'consolidated'
                    ? 'bg-primary/10 text-primary border-primary/20'
                    : 'bg-content2 text-default-500 border-transparent'
                }`}>
                  {b.isDistributionBranch ? 'HQ Hub' : 'Store Branch'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-content2 p-2.5 rounded-medium">
                  <span className="text-[9.5px] text-default-500 font-bold block">Physical Units</span>
                  <span className="text-base font-black text-primary">{totalUnitsInBranch.toLocaleString()} Units</span>
                </div>
                <div className="bg-content2 p-2.5 rounded-medium">
                  <span className="text-[9.5px] text-default-500 font-bold block">Low Stock Items</span>
                  <span className={`text-base font-black ${lowStockCount > 0 ? 'text-danger' : 'text-success'}`}>
                    {lowStockCount}
                  </span>
                </div>
              </div>

              {/* Intensity Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-default-500">
                  <span>Capacity Volume Allocation</span>
                  <span>{Math.min(100, Math.round((totalUnitsInBranch / 5000) * 100))}%</span>
                </div>
                <div className="h-2 w-full bg-content2 rounded-full overflow-hidden">
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
        <h3 className="text-xs font-black uppercase tracking-wider text-primary">
          Enterprise Financial &amp; Movement Ledger Log ({filteredLedgerEntries.length})
        </h3>
        <div className="overflow-x-auto rounded-large border border-divider bg-content1 shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-content2 border-b border-divider font-black text-foreground">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Branch Node</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4 text-center">Movement Type</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4">Reference No</th>
                <th className="py-3 px-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider text-foreground/90">
              {filteredLedgerEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-default-500 italic font-medium">
                    No ledger entries recorded for this branch scope yet.
                  </td>
                </tr>
              ) : (
                paginatedLedger.map((le) => {
                  const br = branches.find(b => b.id === le.branchId);
                  return (
                    <tr key={le.id} className="hover:bg-content2/40 transition-colors">
                      <td className="py-3 px-4 text-[11px] text-default-500">
                        {le.date}
                      </td>
                      <td className="py-3 px-4 font-bold text-foreground">
                        {br ? br.name : le.branchId}
                      </td>
                      <td className="py-3 px-4 font-bold text-foreground">
                        {le.productName}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider border ${
                          le.movementType === 'IN' || le.movementType === 'PURCHASE'
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-primary/10 text-primary border-primary/20'
                        }`}>
                          {le.movementType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-foreground">
                        {le.quantity}
                      </td>
                      <td className="py-3 px-4 text-default-500">
                        {le.referenceNo || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-default-500 italic max-w-xs truncate" title={le.remarks}>
                        {le.remarks || 'Standard ledger entry'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
