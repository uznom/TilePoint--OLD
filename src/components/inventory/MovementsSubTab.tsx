import React, { useMemo } from 'react';
import { Activity, Search, Sliders } from 'lucide-react';
import { Branch, InventoryMovement, Product } from '../../types/db';
import { HeroButton } from '../common/ui/HeroButton';
import { HeroTable } from '../common/ui/HeroTable';
import { HeroDropdownSelect } from '../common/ui/HeroDropdown';
import { useMultiSort } from '../../hooks/useMultiSort';
import { MultiSortBadgeBar } from '../common/ui/MultiSortBadgeBar';

interface MovementsSubTabProps {
  setShowAdjustModal: (v: boolean) => void;
  filteredMovements: InventoryMovement[];
  movementSearch: string;
  setMovementSearch: (v: string) => void;
  movementTypeFilter: string;
  setMovementTypeFilter: (v: string) => void;
  products: Product[];
  branches: Branch[];
}

export const MovementsSubTab: React.FC<MovementsSubTabProps> = ({
  setShowAdjustModal,
  filteredMovements,
  movementSearch,
  setMovementSearch,
  movementTypeFilter,
  setMovementTypeFilter,
  products,
  branches,
}) => {
  // Multi-column sorting for inventory movements
  const {
    sortDescriptors: movementSortDescriptors,
    handleSort: handleMovementSort,
    getSortDirection: getMovementSortDir,
    getSortRank: getMovementSortRank,
    removeSort: removeMovementSort,
    clearSort: clearMovementSort,
    sortData: sortMovementData
  } = useMultiSort<InventoryMovement>({
    customGetters: {
      timestamp: (m) => new Date(m.timestamp).getTime(),
      branchId: (m) => {
        const br = branches.find(b => b.id === (m.sourceBranchId || m.destinationBranchId));
        return br ? br.name : (m.sourceBranchId || 'Central');
      },
      productName: (m) => {
        const prod = products.find(p => p.id === m.productId);
        return prod ? prod.productName : m.productId;
      },
      type: (m) => m.type || '',
      quantity: (m) => Number(m.quantity || 0),
      referenceId: (m) => m.referenceId || '',
      username: (m) => m.username || m.userId || '',
      notes: (m) => m.notes || '',
    }
  });

  const sortedMovements = useMemo(() => {
    if (movementSortDescriptors.length > 0) {
      return sortMovementData(filteredMovements);
    }
    return filteredMovements;
  }, [filteredMovements, movementSortDescriptors, sortMovementData]);

  return (
    <div className="space-y-6 text-left animate-fade-in font-sans">
      {/* Header & Primary Action Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-content1 dark:bg-[#18181B] p-5 rounded-2xl border border-divider dark:border-white/10 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <span>Stock Adjustments & Audit Movement Logs</span>
          </h2>
        </div>
        <HeroButton
          color="primary"
          onClick={() => setShowAdjustModal(true)}
          startIcon={<Sliders className="h-4 w-4" />}
          radius="full"
          className="font-semibold shadow-xs"
        >
          Record Manual Adjustment
        </HeroButton>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-sans">
        <div className="bg-content1 dark:bg-[#18181B] p-5 rounded-2xl border border-divider dark:border-white/10 space-y-1 shadow-xs">
          <span className="text-xs font-medium text-default-500 tracking-tight block">Total Movement Logs</span>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums">{filteredMovements.length}</div>
        </div>
        <div className="bg-content1 dark:bg-[#18181B] p-5 rounded-2xl border border-emerald-500/25 dark:border-emerald-500/20 space-y-1 shadow-xs">
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 tracking-tight block">Stock Inflows (+)</span>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
            +{filteredMovements.filter(m => Number(m.quantity || 0) > 0).reduce((acc, m) => acc + Number(m.quantity || 0), 0)} boxes
          </div>
        </div>
        <div className="bg-content1 dark:bg-[#18181B] p-5 rounded-2xl border border-rose-500/25 dark:border-rose-500/20 space-y-1 shadow-xs">
          <span className="text-xs font-medium text-rose-600 dark:text-rose-400 tracking-tight block">Deductions & Outflows (-)</span>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
            {filteredMovements.filter(m => Number(m.quantity || 0) < 0).reduce((acc, m) => acc + Number(m.quantity || 0), 0)} boxes
          </div>
        </div>
        <div className="bg-content1 dark:bg-[#18181B] p-5 rounded-2xl border border-amber-500/25 dark:border-amber-500/20 space-y-1 shadow-xs">
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400 tracking-tight block">Damaged / Write-Offs</span>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums">
            {filteredMovements.filter(m => (m.type || '').toUpperCase().includes('DAMAGE')).length} incidents
          </div>
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between font-sans">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-default-400" />
          <input
            type="text"
            value={movementSearch ?? ''}
            onChange={(e) => setMovementSearch(e.target.value)}
            placeholder="Search log by notes, ref #, or operator..."
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-full bg-default-100 dark:bg-zinc-800/80 border border-divider/40 focus:border-primary focus:outline-none text-foreground font-sans font-medium"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <HeroDropdownSelect
            items={[
              { key: 'All', label: 'All Operations' },
              { key: 'IN', label: 'Stock Inflow (IN)' },
              { key: 'OUT', label: 'Stock Outflow (OUT)' },
              { key: 'ADJUST', label: 'Manual Adjustments' },
              { key: 'DAMAGE', label: 'Damage & Breakage' },
            ]}
            selectedKey={movementTypeFilter ?? 'All'}
            onSelectionChange={(k) => setMovementTypeFilter(k)}
            size="sm"
            variant="pill"
            className="min-w-[170px]"
          />
        </div>
      </div>

      {/* Multi-Sort Badge Bar */}
      <MultiSortBadgeBar
        sortDescriptors={movementSortDescriptors}
        onRemoveSort={removeMovementSort}
        onClearSort={clearMovementSort}
        columnLabels={{
          timestamp: 'Date & Time',
          branchId: 'Branch',
          productName: 'Product Name',
          type: 'Movement Type',
          quantity: 'Quantity Change',
          referenceId: 'Reference No.',
          username: 'Operator',
          notes: 'Notes / Reason',
        }}
      />

      {/* Logs Table */}
      <div className="overflow-x-auto rounded-large border border-divider bg-content1 shadow-sm">
        <HeroTable isStriped className="min-w-full text-xs">
          <HeroTable.Header>
            <tr className="bg-content2 border-b border-divider font-black text-foreground">
              <HeroTable.Column
                allowsSorting
                sortDirection={getMovementSortDir('timestamp')}
                sortRank={getMovementSortRank('timestamp')}
                onSort={(e) => handleMovementSort('timestamp', e)}
                className="py-3 px-4"
              >
                Date & Time
              </HeroTable.Column>
              <HeroTable.Column
                allowsSorting
                sortDirection={getMovementSortDir('branchId')}
                sortRank={getMovementSortRank('branchId')}
                onSort={(e) => handleMovementSort('branchId', e)}
                className="py-3 px-4"
              >
                Branch
              </HeroTable.Column>
              <HeroTable.Column
                allowsSorting
                sortDirection={getMovementSortDir('productName')}
                sortRank={getMovementSortRank('productName')}
                onSort={(e) => handleMovementSort('productName', e)}
                className="py-3 px-4"
              >
                Product Name
              </HeroTable.Column>
              <HeroTable.Column
                align="center"
                allowsSorting
                sortDirection={getMovementSortDir('type')}
                sortRank={getMovementSortRank('type')}
                onSort={(e) => handleMovementSort('type', e)}
                className="py-3 px-4 text-center"
              >
                Movement Type
              </HeroTable.Column>
              <HeroTable.Column
                align="end"
                allowsSorting
                sortDirection={getMovementSortDir('quantity')}
                sortRank={getMovementSortRank('quantity')}
                onSort={(e) => handleMovementSort('quantity', e)}
                className="py-3 px-4 text-right"
              >
                Quantity Change
              </HeroTable.Column>
              <HeroTable.Column
                allowsSorting
                sortDirection={getMovementSortDir('referenceId')}
                sortRank={getMovementSortRank('referenceId')}
                onSort={(e) => handleMovementSort('referenceId', e)}
                className="py-3 px-4"
              >
                Reference No.
              </HeroTable.Column>
              <HeroTable.Column
                allowsSorting
                sortDirection={getMovementSortDir('username')}
                sortRank={getMovementSortRank('username')}
                onSort={(e) => handleMovementSort('username', e)}
                className="py-3 px-4"
              >
                Operator / User
              </HeroTable.Column>
              <HeroTable.Column
                allowsSorting
                sortDirection={getMovementSortDir('notes')}
                sortRank={getMovementSortRank('notes')}
                onSort={(e) => handleMovementSort('notes', e)}
                className="py-3 px-4"
              >
                Notes / Reason
              </HeroTable.Column>
            </tr>
          </HeroTable.Header>
          <HeroTable.Body>
            {sortedMovements.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-default-500 italic font-medium">
                  No movement log entries match the selected filters or branch view scope.
                </td>
              </tr>
            ) : (
              sortedMovements.map((m) => {
                const prod = products.find(p => p.id === m.productId);
                const br = branches.find(b => b.id === (m.sourceBranchId || m.destinationBranchId));
                const brName = br ? br.name : (m.sourceBranchId || 'Central');
                const qtyVal = Number(m.quantity || 0);
                const isPositive = qtyVal > 0;

                return (
                  <tr key={m.id} className="hover:bg-content2/40 transition-colors">
                    <td className="py-3 px-4 text-[11px] text-default-500">
                      {new Date(m.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-foreground">
                      {brName}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-foreground">
                      {prod ? prod.productName : m.productId}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider border ${
                        m.type === 'IN' || m.type === 'PURCHASE'
                          ? 'bg-success/10 text-success border-success/20'
                          : m.type === 'DAMAGE' || m.type === 'LOSS'
                          ? 'bg-danger/10 text-danger border-danger/20'
                          : 'bg-primary/10 text-primary border-primary/20'
                      }`}>
                        {m.type}
                      </span>
                    </td>
                    <td className={`py-3 px-4 text-right font-black ${isPositive ? 'text-success' : 'text-danger'}`}>
                      {isPositive ? `+${qtyVal}` : `${qtyVal}`} units
                    </td>
                    <td className="py-3 px-4 text-default-500">
                      {m.referenceId || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-default-500">
                      {m.username || m.userId || 'System Admin'}
                    </td>
                    <td className="py-3 px-4 text-default-500 italic max-w-xs truncate" title={m.notes}>
                      {m.notes || 'Routine stock operation'}
                    </td>
                  </tr>
                );
              })
            )}
          </HeroTable.Body>
        </HeroTable>
      </div>
    </div>
  );
};
