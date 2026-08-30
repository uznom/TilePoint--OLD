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
    <div className="space-y-6 text-left animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-content1 p-5 rounded-large border border-divider shadow-sm">
        <div>
          <h2 className="text-base font-black text-foreground uppercase tracking-wider flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            <span>Inter-Branch Stock Transfers &amp; Transmittals</span>
          </h2>
        </div>
        <HeroButton
          color="primary"
          onClick={() => setShowCreateTransfer(true)}
          startIcon={<Plus className="h-4 w-4" />}
          className="text-xs font-black uppercase tracking-wider shadow-md"
        >
          Initiate Stock Transfer Request
        </HeroButton>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-content1 p-4 rounded-medium border border-divider space-y-1 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-default-500">Total Transfer Orders</span>
          <div className="text-xl font-black text-foreground">{branchFilteredTransfers.length}</div>
        </div>
        <div className="bg-warning/5 p-4 rounded-medium border border-warning/15 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-warning">Pending Approval</span>
          <div className="text-xl font-black text-warning">
            {branchFilteredTransfers.filter(t => t.status === 'Pending').length} requests
          </div>
        </div>
        <div className="bg-sky-500/5 p-4 rounded-medium border border-sky-500/15 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">In Transit / Dispatched</span>
          <div className="text-xl font-black text-sky-600 dark:text-sky-400">
            {branchFilteredTransfers.filter(t => t.status === 'Dispatched').length} orders
          </div>
        </div>
        <div className="bg-success/5 p-4 rounded-medium border border-success/15 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-success">Completed Transfers</span>
          <div className="text-xl font-black text-success">
            {branchFilteredTransfers.filter(t => t.status === 'Received' || t.status === 'Completed').length} received
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
