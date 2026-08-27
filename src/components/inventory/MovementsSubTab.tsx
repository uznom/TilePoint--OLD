import React, { useMemo } from 'react';
import { Activity, Search, Sliders } from 'lucide-react';
import { Branch, InventoryMovement, Product } from '../../types/db';
import { HeroButton } from '../common/ui/HeroButton';
import { HeroTable } from '../common/ui/HeroTable';
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
    <div className="space-y-6 text-left animate-fade-in">
      {/* Header & Primary Action Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-content1 p-5 rounded-large border border-divider shadow-sm">
        <div>
          <h2 className="text-base font-black text-foreground uppercase tracking-wider flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <span>Stock Adjustments & Audit Movement Logs</span>
          </h2>
        </div>
        <HeroButton
          color="primary"
          onClick={() => setShowAdjustModal(true)}
          startIcon={<Sliders className="h-4 w-4" />}
          className="text-xs font-black uppercase tracking-wider shadow-md"
        >
          Record Manual Adjustment
        </HeroButton>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-content1 p-4 rounded-medium border border-divider space-y-1 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-default-500">Total Movement Logs</span>
          <div className="text-xl font-black text-foreground">{filteredMovements.length}</div>
        </div>
        <div className="bg-success/5 p-4 rounded-medium border border-success/15 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-success">Stock Inflows (+)</span>
          <div className="text-xl font-black text-success">
            +{filteredMovements.filter(m => Number(m.quantity || 0) > 0).reduce((acc, m) => acc + Number(m.quantity || 0), 0)} boxes
          </div>
        </div>
        <div className="bg-danger/5 p-4 rounded-medium border border-danger/15 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-danger">Deductions & Outflows (-)</span>
          <div className="text-xl font-black text-danger">
            {filteredMovements.filter(m => Number(m.quantity || 0) < 0).reduce((acc, m) => acc + Number(m.quantity || 0), 0)} boxes
          </div>
        </div>
        <div className="bg-warning/5 p-4 rounded-medium border border-warning/15 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-warning">Damaged / Write-Offs</span>
          <div className="text-xl font-black text-warning">
            {filteredMovements.filter(m => (m.type || '').toUpperCase().includes('DAMAGE')).length} incidents
          </div>
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-default-500/60" />
          <input
            type="text"
            value={movementSearch ?? ''}
            onChange={(e) => setMovementSearch(e.target.value)}
            placeholder="Search log by notes, ref #, or operator..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-medium bg-content1 border border-divider focus:border-primary focus:outline-none text-foreground"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={movementTypeFilter ?? ''}
            onChange={(e) => setMovementTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-medium bg-content1 border border-divider text-foreground font-bold focus:outline-none"
          >
            <option value="All">All Movement Types</option>
            <option value="IN">Stock Inflow (IN)</option>
            <option value="OUT">Stock Outflow (OUT)</option>
            <option value="ADJUST">Manual Adjustments</option>
            <option value="DAMAGE">Damage & Breakage</option>
          </select>
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
