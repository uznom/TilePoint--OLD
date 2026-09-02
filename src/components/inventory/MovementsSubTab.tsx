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
    <div className="space-y-6 text-left animate-fade-in font-sans text-xs">
      {/* Header & Primary Action Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/70 dark:border-white/10 shadow-elevation-soft">
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <span>Stock Adjustments &amp; Audit Movement Logs</span>
          </h2>
          <p className="text-xs text-default-500 font-medium mt-0.5">
            Audit ledger of stock adjustments, damaged write-offs, and transfers across all branches.
          </p>
        </div>
        <HeroButton
          color="primary"
          onClick={() => setShowAdjustModal(true)}
          startIcon={<Sliders className="h-4 w-4" />}
          radius="full"
          className="font-bold shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
        >
          Record Manual Adjustment
        </HeroButton>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-sans">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/70 dark:border-white/10 space-y-1 shadow-elevation-soft">
          <span className="text-xs font-medium text-default-500 tracking-tight block">Total Movement Logs</span>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono">{filteredMovements.length}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-emerald-500/25 space-y-1 shadow-elevation-soft">
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 tracking-tight block">Stock Inflows (+)</span>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
            +{filteredMovements.filter(m => Number(m.quantity || 0) > 0).reduce((acc, m) => acc + Number(m.quantity || 0), 0)} boxes
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-rose-500/25 space-y-1 shadow-elevation-soft">
          <span className="text-xs font-medium text-rose-600 dark:text-rose-400 tracking-tight block">Deductions &amp; Outflows (-)</span>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 font-mono">
            {filteredMovements.filter(m => Number(m.quantity || 0) < 0).reduce((acc, m) => acc + Number(m.quantity || 0), 0)} boxes
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-amber-500/25 space-y-1 shadow-elevation-soft">
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400 tracking-tight block">Damaged / Write-Offs</span>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
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
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-white/5 focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground font-sans font-medium"
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

      {/* Multi-Sort Active Badge Bar */}
      <MultiSortBadgeBar
        sortDescriptors={movementSortDescriptors}
        onRemoveSort={removeMovementSort}
        onClearSort={clearMovementSort}
        columnLabels={{
          timestamp: 'Timestamp',
          branchId: 'Branch / Yard',
          productName: 'Product Item',
          type: 'Operation Type',
          quantity: 'Delta Quantity',
          referenceId: 'Ticket Ref',
          username: 'Operator / User',
        }}
      />

      {/* Primary Log Table */}
      <div className="overflow-x-auto rounded-2xl border border-zinc-200/70 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-elevation-soft">
        <HeroTable isStriped className="min-w-full text-xs">
          <HeroTable.Header>
            <tr className="bg-zinc-100/80 dark:bg-zinc-800/80 border-b border-divider/20 font-bold text-default-600 dark:text-default-400">
              <HeroTable.Column
                allowsSorting
                sortDirection={getMovementSortDir('timestamp')}
                sortRank={getMovementSortRank('timestamp')}
                onSort={(e) => handleMovementSort('timestamp', e)}
                className="py-3.5 px-4"
              >
                Timestamp
              </HeroTable.Column>
              <HeroTable.Column
                allowsSorting
                sortDirection={getMovementSortDir('branchId')}
                sortRank={getMovementSortRank('branchId')}
                onSort={(e) => handleMovementSort('branchId', e)}
                className="py-3.5 px-4"
              >
                Branch / Yard
              </HeroTable.Column>
              <HeroTable.Column
                allowsSorting
                sortDirection={getMovementSortDir('productName')}
                sortRank={getMovementSortRank('productName')}
                onSort={(e) => handleMovementSort('productName', e)}
                className="py-3.5 px-4"
              >
                Product Item
              </HeroTable.Column>
              <HeroTable.Column
                allowsSorting
                sortDirection={getMovementSortDir('type')}
                sortRank={getMovementSortRank('type')}
                onSort={(e) => handleMovementSort('type', e)}
                className="py-3.5 px-4 text-center"
              >
                Operation Type
              </HeroTable.Column>
              <HeroTable.Column
                align="end"
                allowsSorting
                sortDirection={getMovementSortDir('quantity')}
                sortRank={getMovementSortRank('quantity')}
                onSort={(e) => handleMovementSort('quantity', e)}
                className="py-3.5 px-4 text-right"
              >
                Delta Qty
              </HeroTable.Column>
              <HeroTable.Column
                allowsSorting
                sortDirection={getMovementSortDir('referenceId')}
                sortRank={getMovementSortRank('referenceId')}
                onSort={(e) => handleMovementSort('referenceId', e)}
                className="py-3.5 px-4"
              >
                Ticket Ref
              </HeroTable.Column>
              <HeroTable.Column
                allowsSorting
                sortDirection={getMovementSortDir('username')}
                sortRank={getMovementSortRank('username')}
                onSort={(e) => handleMovementSort('username', e)}
                className="py-3.5 px-4"
              >
                Operator
              </HeroTable.Column>
              <th className="py-3.5 px-4 font-bold text-default-600 dark:text-default-400">
                Audit Remarks
              </th>
            </tr>
          </HeroTable.Header>
          <HeroTable.Body>
            {sortedMovements.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-default-500 italic">
                  No stock adjustments or movement records matching current filter criteria.
                </td>
              </tr>
            ) : (
              sortedMovements.map((m) => {
                const prod = products.find(p => p.id === m.productId);
                const br = branches.find(b => b.id === (m.sourceBranchId || m.destinationBranchId));
                const isPositive = Number(m.quantity || 0) > 0;
                const isNegative = Number(m.quantity || 0) < 0;

                return (
                  <tr key={m.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="py-3.5 px-4 text-default-500 font-mono text-[11px]">
                      {new Date(m.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-foreground">
                      {br?.name || m.sourceBranchId || 'Central Stock'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-foreground">{prod?.productName || m.productId}</div>
                      <div className="text-[10px] text-default-500 font-mono">{prod?.sku || prod?.productCode || ''}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        m.type === 'IN' || m.type === 'PURCHASE'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : m.type === 'OUT' || m.type === 'SALE'
                          ? 'bg-rose-500/10 text-rose-500'
                          : m.type?.includes('DAMAGE')
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {m.type}
                      </span>
                    </td>
                    <td className={`py-3.5 px-4 text-right font-bold font-mono text-sm ${
                      isPositive ? 'text-emerald-500' : isNegative ? 'text-rose-500' : 'text-foreground'
                    }`}>
                      {isPositive ? `+${m.quantity}` : m.quantity}
                    </td>
                    <td className="py-3.5 px-4 text-default-500 font-mono text-[11px]">
                      {m.referenceId || '—'}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      {m.username || m.userId || 'System'}
                    </td>
                    <td className="py-3.5 px-4 text-default-500 text-[11px] max-w-xs truncate font-medium" title={m.notes}>
                      {m.notes || '—'}
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

export default MovementsSubTab;
