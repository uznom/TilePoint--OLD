import React, { useMemo } from 'react';
import { ArrowRightLeft, Plus } from 'lucide-react';
import { Branch, StockTransfer } from '../../types/db';
import { HeroButton } from '../common/ui/HeroButton';
import { HeroTable } from '../common/ui/HeroTable';
import { useMultiSort } from '../../hooks/useMultiSort';
import { MultiSortBadgeBar } from '../common/ui/MultiSortBadgeBar';

interface TransfersSubTabProps {
  setShowCreateTransfer: (v: boolean) => void;
  stockTransfers: StockTransfer[];
  activeBranchId: string;
  branches: Branch[];
  isSameBranch: (b1: string, b2: string, branches: Branch[]) => boolean;
}

export const TransfersSubTab: React.FC<TransfersSubTabProps> = ({
  setShowCreateTransfer,
  stockTransfers,
  activeBranchId,
  branches,
  isSameBranch,
}) => {
  const branchFilteredTransfers = stockTransfers.filter(t => 
    activeBranchId === 'consolidated' || 
    isSameBranch(t.fromBranchId, activeBranchId, branches) || 
    isSameBranch(t.toBranchId, activeBranchId, branches) ||
    isSameBranch((t as any).branchId, activeBranchId, branches)
  );

  // Multi-column sorting for stock transfers
  const {
    sortDescriptors: transferSortDescriptors,
    handleSort: handleTransferSort,
    getSortDirection: getTransferSortDir,
    getSortRank: getTransferSortRank,
    removeSort: removeTransferSort,
    clearSort: clearTransferSort,
    sortData: sortTransferData
  } = useMultiSort<StockTransfer>({
    customGetters: {
      transferNo: (t) => t.transferNo || t.id,
      createdAt: (t) => new Date(t.createdAt).getTime(),
      fromBranchId: (t) => {
        const src = branches.find(b => b.id === t.fromBranchId);
        return src ? src.name : t.fromBranchId;
      },
      toBranchId: (t) => {
        const dest = branches.find(b => b.id === t.toBranchId);
        return dest ? dest.name : t.toBranchId;
      },
      itemCount: (t) => (t.items || []).reduce((acc, item) => acc + item.quantity, 0),
      status: (t) => t.status || '',
      requestedBy: (t) => t.requestedBy || '',
      reason: (t) => t.reason || '',
    }
  });

  const sortedTransfers = useMemo(() => {
    if (transferSortDescriptors.length > 0) {
      return sortTransferData(branchFilteredTransfers);
    }
    return branchFilteredTransfers;
  }, [branchFilteredTransfers, transferSortDescriptors, sortTransferData]);

  return (
    <div className="space-y-6 text-left animate-fade-in font-sans text-xs">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/70 dark:border-white/10 shadow-elevation-soft">
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            <span>Inter-Branch Stock Transfers &amp; Transmittals</span>
          </h2>
          <p className="text-xs text-default-500 font-medium mt-0.5">
            Monitor, approve, and track logistics dispatches across all store branches.
          </p>
        </div>
        <HeroButton
          color="primary"
          onClick={() => setShowCreateTransfer(true)}
          startIcon={<Plus className="h-4 w-4" />}
          radius="full"
          className="font-bold shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
        >
          Initiate Stock Transfer Request
        </HeroButton>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-sans">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/70 dark:border-white/10 space-y-1 shadow-elevation-soft">
          <span className="text-xs font-medium text-default-500 tracking-tight block">Total Transfer Orders</span>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono">{branchFilteredTransfers.length}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-amber-500/25 space-y-1 shadow-elevation-soft">
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400 tracking-tight block">Pending Approval</span>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
            {branchFilteredTransfers.filter(t => t.status === 'Pending').length} requests
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-sky-500/25 space-y-1 shadow-elevation-soft">
          <span className="text-xs font-medium text-sky-600 dark:text-sky-400 tracking-tight block">In Transit / Dispatched</span>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-sky-600 dark:text-sky-400 font-mono">
            {branchFilteredTransfers.filter(t => t.status === 'Dispatched').length} orders
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-emerald-500/25 space-y-1 shadow-elevation-soft">
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 tracking-tight block">Received &amp; Settled</span>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
            {branchFilteredTransfers.filter(t => t.status === 'Received').length} transfers
          </div>
        </div>
      </div>

      {/* Multi-Sort Active Badge Bar */}
      <MultiSortBadgeBar
        sortDescriptors={transferSortDescriptors}
        onRemoveSort={removeTransferSort}
        onClearSort={clearTransferSort}
        columnLabels={{
          transferNo: 'Transfer Ref #',
          createdAt: 'Date & Time',
          fromBranchId: 'Source Origin',
          toBranchId: 'Destination Store',
          itemCount: 'Items Count',
          status: 'Status',
          requestedBy: 'Requested By',
          reason: 'Reason / Notes',
        }}
      />

      {/* Transfers List Table */}
      <div className="overflow-x-auto rounded-2xl border border-zinc-200/70 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-elevation-soft">
        <HeroTable isStriped className="min-w-full text-xs">
          <HeroTable.Header>
            <tr className="bg-zinc-100/80 dark:bg-zinc-800/80 border-b border-divider/20 font-bold text-default-600 dark:text-default-400">
              <HeroTable.Column
                allowsSorting
                sortDirection={getTransferSortDir('transferNo')}
                sortRank={getTransferSortRank('transferNo')}
                onSort={(e) => handleTransferSort('transferNo', e)}
                className="py-3.5 px-4"
              >
                Transfer Ref #
              </HeroTable.Column>
              <HeroTable.Column
                allowsSorting
                sortDirection={getTransferSortDir('createdAt')}
                sortRank={getTransferSortRank('createdAt')}
                onSort={(e) => handleTransferSort('createdAt', e)}
                className="py-3.5 px-4"
              >
                Date &amp; Time
              </HeroTable.Column>
              <HeroTable.Column
                allowsSorting
                sortDirection={getTransferSortDir('fromBranchId')}
                sortRank={getTransferSortRank('fromBranchId')}
                onSort={(e) => handleTransferSort('fromBranchId', e)}
                className="py-3.5 px-4"
              >
                Source Origin
              </HeroTable.Column>
              <HeroTable.Column
                allowsSorting
                sortDirection={getTransferSortDir('toBranchId')}
                sortRank={getTransferSortRank('toBranchId')}
                onSort={(e) => handleTransferSort('toBranchId', e)}
                className="py-3.5 px-4"
              >
                Destination Store
              </HeroTable.Column>
              <HeroTable.Column
                align="end"
                allowsSorting
                sortDirection={getTransferSortDir('itemCount')}
                sortRank={getTransferSortRank('itemCount')}
                onSort={(e) => handleTransferSort('itemCount', e)}
                className="py-3.5 px-4 text-right"
              >
                Total Items
              </HeroTable.Column>
              <HeroTable.Column
                allowsSorting
                sortDirection={getTransferSortDir('status')}
                sortRank={getTransferSortRank('status')}
                onSort={(e) => handleTransferSort('status', e)}
                className="py-3.5 px-4 text-center"
              >
                Transfer Status
              </HeroTable.Column>
              <HeroTable.Column
                allowsSorting
                sortDirection={getTransferSortDir('requestedBy')}
                sortRank={getTransferSortRank('requestedBy')}
                onSort={(e) => handleTransferSort('requestedBy', e)}
                className="py-3.5 px-4"
              >
                Requested By
              </HeroTable.Column>
              <th className="py-3.5 px-4 font-bold text-default-600 dark:text-default-400">
                Reason / Notes
              </th>
            </tr>
          </HeroTable.Header>
          <HeroTable.Body>
            {sortedTransfers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-default-500 italic">
                  No inter-branch transfer orders found matching current branch filter.
                </td>
              </tr>
            ) : (
              sortedTransfers.map((t) => {
                const src = branches.find(b => b.id === t.fromBranchId);
                const dest = branches.find(b => b.id === t.toBranchId);
                const totalUnits = (t.items || []).reduce((acc, item) => acc + item.quantity, 0);

                return (
                  <tr key={t.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-primary font-mono">
                      {t.transferNo || t.id}
                    </td>
                    <td className="py-3.5 px-4 text-default-500 font-mono text-[11px]">
                      {new Date(t.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      {src?.name || t.fromBranchId}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      {dest?.name || t.toBranchId}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-foreground font-mono">
                      {totalUnits} units
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        t.status === 'Received'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : t.status === 'Dispatched'
                          ? 'bg-sky-500/10 text-sky-500'
                          : t.status === 'Cancelled'
                          ? 'bg-rose-500/10 text-rose-500'
                          : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-default-500 font-medium">
                      {t.requestedBy || 'System'}
                    </td>
                    <td className="py-3.5 px-4 text-default-500 text-[11px] max-w-xs truncate font-medium" title={t.reason}>
                      {t.reason || '—'}
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

export default TransfersSubTab;
