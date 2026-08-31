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
    <div className="space-y-6 text-left animate-fade-in font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-content1 dark:bg-[#18181B] p-5 rounded-2xl border border-divider dark:border-white/10 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            <span>Inter-Branch Stock Transfers &amp; Transmittals</span>
          </h2>
        </div>
        <HeroButton
          color="primary"
          onClick={() => setShowCreateTransfer(true)}
          startIcon={<Plus className="h-4 w-4" />}
          radius="full"
          className="font-semibold shadow-xs"
        >
          Initiate Stock Transfer Request
        </HeroButton>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-sans">
        <div className="bg-content1 dark:bg-[#18181B] p-5 rounded-2xl border border-divider dark:border-white/10 space-y-1 shadow-xs">
          <span className="text-xs font-medium text-default-500 tracking-tight block">Total Transfer Orders</span>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums">{branchFilteredTransfers.length}</div>
        </div>
        <div className="bg-content1 dark:bg-[#18181B] p-5 rounded-2xl border border-amber-500/25 dark:border-amber-500/20 space-y-1 shadow-xs">
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400 tracking-tight block">Pending Approval</span>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums">
            {branchFilteredTransfers.filter(t => t.status === 'Pending').length} requests
          </div>
        </div>
        <div className="bg-content1 dark:bg-[#18181B] p-5 rounded-2xl border border-sky-500/25 dark:border-sky-500/20 space-y-1 shadow-xs">
          <span className="text-xs font-medium text-sky-600 dark:text-sky-400 tracking-tight block">In Transit / Dispatched</span>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-sky-600 dark:text-sky-400 tabular-nums">
            {branchFilteredTransfers.filter(t => t.status === 'Dispatched').length} orders
          </div>
        </div>
        <div className="bg-content1 dark:bg-[#18181B] p-5 rounded-2xl border border-emerald-500/25 dark:border-emerald-500/20 space-y-1 shadow-xs">
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 tracking-tight block">Received & Settled</span>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
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
      <div className="overflow-x-auto rounded-large border border-divider bg-content1 shadow-sm">
        <HeroTable isStriped className="min-w-full text-xs">
          <HeroTable.Header>
            <tr className="bg-content2 border-b border-divider font-black text-foreground">
              <HeroTable.Column
                allowsSorting
                sortDirection={getTransferSortDir('transferNo')}
                sortRank={getTransferSortRank('transferNo')}
                onSort={(e) => handleTransferSort('transferNo', e)}
                className="py-3 px-4"
              >
                Transfer Ref #
              </HeroTable.Column>
              <HeroTable.Column
                allowsSorting
                sortDirection={getTransferSortDir('createdAt')}
                sortRank={getTransferSortRank('createdAt')}
                onSort={(e) => handleTransferSort('createdAt', e)}
                className="py-3 px-4"
              >
                Date &amp; Time
              </HeroTable.Column>
              <HeroTable.Column
                allowsSorting
                sortDirection={getTransferSortDir('fromBranchId')}
                sortRank={getTransferSortRank('fromBranchId')}
                onSort={(e) => handleTransferSort('fromBranchId', e)}
                className="py-3 px-4"
              >
                Source Origin
              </HeroTable.Column>
              <HeroTable.Column
                allowsSorting
                sortDirection={getTransferSortDir('toBranchId')}
                sortRank={getTransferSortRank('toBranchId')}
                onSort={(e) => handleTransferSort('toBranchId', e)}
                className="py-3 px-4"
              >
                Destination Store
              </HeroTable.Column>
              <HeroTable.Column
                align="center"
                allowsSorting
                sortDirection={getTransferSortDir('itemCount')}
                sortRank={getTransferSortRank('itemCount')}
                onSort={(e) => handleTransferSort('itemCount', e)}
                className="py-3 px-4 text-center"
              >
                Items Count
              </HeroTable.Column>
              <HeroTable.Column
                align="center"
                allowsSorting
                sortDirection={getTransferSortDir('status')}
                sortRank={getTransferSortRank('status')}
                onSort={(e) => handleTransferSort('status', e)}
                className="py-3 px-4 text-center"
              >
                Status
              </HeroTable.Column>
              <HeroTable.Column
                allowsSorting
                sortDirection={getTransferSortDir('requestedBy')}
                sortRank={getTransferSortRank('requestedBy')}
                onSort={(e) => handleTransferSort('requestedBy', e)}
                className="py-3 px-4"
              >
                Requested By
              </HeroTable.Column>
              <HeroTable.Column
                allowsSorting
                sortDirection={getTransferSortDir('reason')}
                sortRank={getTransferSortRank('reason')}
                onSort={(e) => handleTransferSort('reason', e)}
                className="py-3 px-4"
              >
                Reason / Notes
              </HeroTable.Column>
            </tr>
          </HeroTable.Header>
          <HeroTable.Body>
            {sortedTransfers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-default-500 italic font-medium">
                  No stock transfer orders recorded yet for this branch. Click Initiate Stock Transfer Request to transfer items between branches.
                </td>
              </tr>
            ) : (
              sortedTransfers.map((t) => {
                const srcBranch = branches.find(b => b.id === t.fromBranchId);
                const destBranch = branches.find(b => b.id === t.toBranchId);
                const itemCount = (t.items || []).reduce((acc, item) => acc + item.quantity, 0);

                return (
                  <tr key={t.id} className="hover:bg-content2/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-primary">
                      {t.transferNo || t.id.slice(-8)}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-default-500">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-foreground">
                      {srcBranch ? srcBranch.name : t.fromBranchId}
                    </td>
                    <td className="py-3 px-4 font-bold text-foreground">
                      {destBranch ? destBranch.name : t.toBranchId}
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      {itemCount} units ({t.items?.length || 0} SKUs)
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider border ${
                        t.status === 'Completed' || t.status === 'Received'
                          ? 'bg-success/10 text-success border-success/20'
                          : t.status === 'Dispatched'
                          ? 'bg-sky-500/10 text-sky-500 border-sky-500/20'
                          : t.status === 'Pending'
                          ? 'bg-warning/10 text-warning border-warning/20'
                          : 'bg-danger/10 text-danger border-danger/20'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-default-500">
                      {t.requestedBy || 'Store Manager'}
                    </td>
                    <td className="py-3 px-4 text-default-500 italic max-w-xs truncate" title={t.reason}>
                      {t.reason || 'Inter-branch inventory rebalancing'}
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
