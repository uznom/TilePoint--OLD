import React, { useMemo } from 'react';
import { Clock, ChevronLeft, ChevronRight, Eye, Plus, Trash2 } from 'lucide-react';
import { Branch, Product, User } from '../../types/db';
import { BatchExpiration } from '../InventoryModule';
import { HeroButton } from '../common/ui/HeroButton';
import { HeroTooltip } from '../common/ui/HeroTooltip';
import { HeroTable } from '../common/ui/HeroTable';
import { useMultiSort } from '../../hooks/useMultiSort';
import { MultiSortBadgeBar } from '../common/ui/MultiSortBadgeBar';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface ExpirySubTabProps {
  calendarSelectedDay: string | null;
  setCalendarSelectedDay: (day: string | null) => void;
  calendarMonth: number;
  setCalendarMonth: React.Dispatch<React.SetStateAction<number>>;
  calendarYear: number;
  setCalendarYear: React.Dispatch<React.SetStateAction<number>>;
  batches: BatchExpiration[];
  filteredBatches: BatchExpiration[];
  computeLiveBatchStatus: (expiryDate: string) => 'Good' | 'Expiring Soon' | 'Expired';
  handleResetSimulationBatches: () => void;
  products: Product[];
  branches: Branch[];
  setSelectedBatchDetail: (b: BatchExpiration | null) => void;
  setBatchFormBranchId: (id: string) => void;
  selectedViewBranchId: string;
  currentUser: User | null;
  setShowAddBatchModal: (v: boolean) => void;
  hasActiveShift: boolean;
  handleRemoveBatch: (id: string) => void;
}

export const ExpirySubTab: React.FC<ExpirySubTabProps> = ({
  calendarSelectedDay,
  setCalendarSelectedDay,
  calendarMonth,
  setCalendarMonth,
  calendarYear,
  setCalendarYear,
  batches,
  filteredBatches,
  computeLiveBatchStatus,
  handleResetSimulationBatches,
  products,
  branches,
  setSelectedBatchDetail,
  setBatchFormBranchId,
  selectedViewBranchId,
  currentUser,
  setShowAddBatchModal,
  hasActiveShift,
  handleRemoveBatch,
}) => {
  const jumpToToday = () => {
    const d = new Date();
    setCalendarYear(d.getFullYear());
    setCalendarMonth(d.getMonth());
    setCalendarSelectedDay(d.toISOString().split('T')[0]);
  };

  const prevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(y => y - 1);
    } else {
      setCalendarMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(y => y + 1);
    } else {
      setCalendarMonth(m => m + 1);
    }
  };

  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const startDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay();
  const todayStr = new Date().toISOString().split('T')[0];

  // Multi-column sorting for chemical batch expiration logs
  const {
    sortDescriptors: batchSortDescriptors,
    handleSort: handleBatchSort,
    getSortDirection: getBatchSortDir,
    getSortRank: getBatchSortRank,
    removeSort: removeBatchSort,
    clearSort: clearBatchSort,
    sortData: sortBatchData
  } = useMultiSort<BatchExpiration>({
    customGetters: {
      productName: (b) => {
        const prod = products.find(p => p.id === b.productId);
        return (prod ? prod.productName : b.productName) || '';
      },
      batchNumber: (b) => b.batchNumber || '',
      quantity: (b) => Number(b.quantity || 0),
      manufactureDate: (b) => b.manufactureDate || '',
      expiryDate: (b) => b.expiryDate || '',
      branchId: (b) => {
        const br = branches.find(branch => branch.id === b.branchId);
        return br ? br.name : b.branchId;
      },
      status: (b) => computeLiveBatchStatus(b.expiryDate),
      remarks: (b) => b.remarks || '',
    }
  });

  const sortedBatches = useMemo(() => {
    if (batchSortDescriptors.length > 0) {
      return sortBatchData(filteredBatches);
    }
    return filteredBatches;
  }, [filteredBatches, batchSortDescriptors, sortBatchData]);

  return (
    <div className="space-y-6 text-left animate-fade-in font-sans">
      {/* Top Split: Calendar View Matrix (cols 1 & 2) + Analytics / Protocol (col 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1 & 2: Interactive Expiration Calendar Matrix */}
        <div className="lg:col-span-2 bg-content1 border border-divider p-5 rounded-2xl space-y-4 shadow-xs">
          {/* Calendar Header Navigation */}
          <div className="flex flex-wrap justify-between items-center gap-3 border-b border-divider pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-sans font-semibold text-xs tracking-tight text-foreground">
                Interactive Expiration Calendar
              </span>
              {calendarSelectedDay && (
                <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-semibold border border-primary/20 flex items-center gap-1">
                  Selected: {calendarSelectedDay}
                  <button 
                    onClick={() => setCalendarSelectedDay(null)}
                    className="ml-1 hover:text-rose-500 font-bold cursor-pointer"
                    title="Clear date filter"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <HeroButton
                size="sm"
                variant="bordered"
                radius="full"
                onClick={jumpToToday}
                className="text-xs font-semibold h-8 px-3"
              >
                Today
              </HeroButton>
              <div className="flex items-center gap-1 bg-default-100 dark:bg-content2/80 rounded-full p-1 border border-divider/40 shadow-xs">
                <HeroButton
                  size="sm"
                  variant="light"
                  isIconOnly
                  radius="full"
                  onClick={prevMonth}
                  className="h-7 w-7 min-w-7 p-0"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4 text-foreground" />
                </HeroButton>
                <span className="text-xs font-semibold font-sans px-3 min-w-[120px] text-center text-foreground">
                  {MONTH_NAMES[calendarMonth]} {calendarYear}
                </span>
                <HeroButton
                  size="sm"
                  variant="light"
                  isIconOnly
                  radius="full"
                  onClick={nextMonth}
                  className="h-7 w-7 min-w-7 p-0"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4 text-foreground" />
                </HeroButton>
              </div>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-default-500 border-b border-divider pb-2">
            <span className="text-danger">Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Monthly Day Grid Matrix */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Empty leading slots */}
            {Array.from({ length: startDayOfWeek }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-16 rounded-medium bg-content2/30 border border-transparent opacity-30" />
            ))}

            {/* Day Tiles */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              
              // Find batches expiring on dateStr
              const dayBatches = batches.filter(b => b.expiryDate === dateStr);
              const expiredCount = dayBatches.filter(b => computeLiveBatchStatus(b.expiryDate) === 'Expired').length;
              const expiringSoonCount = dayBatches.filter(b => computeLiveBatchStatus(b.expiryDate) === 'Expiring Soon').length;
              const goodCount = dayBatches.filter(b => computeLiveBatchStatus(b.expiryDate) === 'Good').length;

              const isToday = dateStr === todayStr;
              const isSelected = calendarSelectedDay === dateStr;

              return (
                <div
                  key={`day-${dayNum}`}
                  onClick={() => setCalendarSelectedDay(isSelected ? null : dateStr)}
                  className={`h-16 p-1.5 rounded-medium border flex flex-col justify-between transition-all cursor-pointer select-none relative ${
                    isSelected
                      ? 'bg-primary/15 border-primary ring-2 ring-primary/30 shadow-md scale-[1.02]'
                      : isToday
                      ? 'bg-warning/10 border-warning/40'
                      : dayBatches.length > 0
                      ? 'bg-content2 border-divider hover:border-primary/50 hover:bg-content3'
                      : 'bg-content2/50 border-divider/50 opacity-70 hover:opacity-100 hover:border-divider'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-black ${
                      isToday ? 'text-warning font-extrabold' : 'text-foreground'
                    }`}>
                      {dayNum}
                    </span>
                    {isToday && (
                      <span className="text-[7.5px] font-extrabold uppercase bg-warning text-black px-1 rounded">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Expiry Indicators */}
                  <div className="space-y-0.5">
                    {expiredCount > 0 && (
                      <div className="bg-danger text-white text-[8px] font-black px-1 py-0.2 rounded truncate flex items-center justify-between">
                        <span>Expired</span>
                        <span>{expiredCount}</span>
                      </div>
                    )}
                    {expiringSoonCount > 0 && (
                      <div className="bg-warning text-slate-950 text-[8px] font-black px-1 py-0.2 rounded truncate flex items-center justify-between">
                        <span>Soon</span>
                        <span>{expiringSoonCount}</span>
                      </div>
                    )}
                    {goodCount > 0 && expiredCount === 0 && expiringSoonCount === 0 && (
                      <div className="bg-success/20 text-success text-[8px] font-bold px-1 rounded truncate text-center">
                        {goodCount} Stable
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-divider text-[10px] text-default-500 font-sans">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-danger inline-block" /> Expired
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-warning inline-block" /> Expiring &lt;= 30 Days
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-success inline-block" /> Stable (&gt; 30 Days)
              </span>
            </div>
            <span className="text-[9px] text-default-500/70">
              Click any day tile to isolate batch entries
            </span>
          </div>
        </div>

        {/* Column 3: Shelf-Life Analytics & Real-Time Alerts */}
        <div className="bg-content1 border border-divider p-5 rounded-large space-y-4 text-left flex flex-col justify-between shadow-sm">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-divider pb-3">
              <span className="font-sans font-black text-xs uppercase tracking-widest text-primary block">
                Shelf-Life Warnings &amp; Logs
              </span>
              <button
                type="button"
                onClick={handleResetSimulationBatches}
                className="text-[9.5px] font-extrabold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                title="Re-synchronize chemical stock batch logs directly with products catalog"
              >
                <span>Re-Sync Database</span>
              </button>
            </div>

            <div className="space-y-3">
              {/* Expired count stat */}
              <div className="flex justify-between items-center bg-danger/5 p-3.5 rounded-medium border border-danger/10">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-danger" />
                  <span className="text-[11px] font-bold text-danger uppercase">Expired Batches</span>
                </div>
                <span className="text-sm font-black text-danger">
                  {filteredBatches.filter(b => computeLiveBatchStatus(b.expiryDate) === "Expired").length}
                </span>
              </div>

              {/* Expiring Soon count stat */}
              <div className="flex justify-between items-center bg-warning/5 p-3.5 rounded-medium border border-warning/10">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-warning" />
                  <span className="text-[11px] font-bold text-warning uppercase">Expiring (&lt;= 30 days)</span>
                </div>
                <span className="text-sm font-black text-warning">
                  {filteredBatches.filter(b => computeLiveBatchStatus(b.expiryDate) === "Expiring Soon").length}
                </span>
              </div>

              {/* Healthy count stat */}
              <div className="flex justify-between items-center bg-success/5 p-3.5 rounded-medium border border-success/10">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  <span className="text-[11px] font-bold text-success uppercase">Stable Stocks</span>
                </div>
                <span className="text-sm font-black text-success">
                  {filteredBatches.filter(b => computeLiveBatchStatus(b.expiryDate) === "Good").length}
                </span>
              </div>
            </div>
          </div>

          {/* Expiry Action Protocol Notice */}
          <div className="p-3.5 rounded-medium bg-content2 border border-divider space-y-1.5 mt-2">
            <span className="text-[9px] font-black text-primary uppercase tracking-wider block font-sans">
              ERP Quality &amp; Safety Protocol
            </span>
            <p className="text-[11px] text-default-500 font-medium leading-relaxed font-sans">
              <strong>Notice:</strong> Expired grout, tile mortar adhesives, and chemical sealants must be quarantined immediately. Expired chemicals lose bonding strength and cannot be sold.
            </p>
          </div>
        </div>
      </div>

      {/* Batches Log Table */}
      <div className="space-y-3.5 text-left pt-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-sans font-black text-xs uppercase tracking-widest text-primary block">
              Chemical Batch Expiration Log Entries ({filteredBatches.length})
            </span>
            {calendarSelectedDay && (
              <span className="text-[10px] font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-full border border-warning/20">
                Filtered for {calendarSelectedDay}
              </span>
            )}
          </div>
          <HeroButton
            size="sm"
            color="primary"
            onClick={() => {
              setBatchFormBranchId(selectedViewBranchId === 'consolidated' ? (currentUser?.branchAssignmentId || 'B1') : selectedViewBranchId);
              setShowAddBatchModal(true);
            }}
            startIcon={<Plus className="h-4 w-4" />}
            className="text-xs font-black uppercase tracking-wider shadow-sm"
          >
            Register Chemical Stock Batch
          </HeroButton>
        </div>

        {/* Multi-Sort Active Badge Bar */}
        <MultiSortBadgeBar
          sortDescriptors={batchSortDescriptors}
          onRemoveSort={removeBatchSort}
          onClearSort={clearBatchSort}
          columnLabels={{
            productName: 'Product / Code',
            batchNumber: 'Batch Number',
            quantity: 'Quantity',
            manufactureDate: 'Mfg Date',
            expiryDate: 'Expiry Date',
            branchId: 'Branch Allocation',
            status: 'Status',
            remarks: 'Remarks / Notes',
          }}
        />

        <div className="overflow-x-auto rounded-large border border-divider bg-content1 shadow-sm">
          <HeroTable isStriped className="min-w-full text-xs">
            <HeroTable.Header>
              <tr className="bg-content2 border-b border-divider font-black text-foreground">
                <HeroTable.Column
                  allowsSorting
                  sortDirection={getBatchSortDir('productName')}
                  sortRank={getBatchSortRank('productName')}
                  onSort={(e) => handleBatchSort('productName', e)}
                  className="py-3 px-4 font-sans"
                >
                  Product / Code
                </HeroTable.Column>
                <HeroTable.Column
                  align="center"
                  allowsSorting
                  sortDirection={getBatchSortDir('batchNumber')}
                  sortRank={getBatchSortRank('batchNumber')}
                  onSort={(e) => handleBatchSort('batchNumber', e)}
                  className="py-3 px-4 font-sans text-center"
                >
                  Batch Number
                </HeroTable.Column>
                <HeroTable.Column
                  align="end"
                  allowsSorting
                  sortDirection={getBatchSortDir('quantity')}
                  sortRank={getBatchSortRank('quantity')}
                  onSort={(e) => handleBatchSort('quantity', e)}
                  className="py-3 px-4 font-sans text-right"
                >
                  Quantity
                </HeroTable.Column>
                <HeroTable.Column
                  align="center"
                  allowsSorting
                  sortDirection={getBatchSortDir('manufactureDate')}
                  sortRank={getBatchSortRank('manufactureDate')}
                  onSort={(e) => handleBatchSort('manufactureDate', e)}
                  className="py-3 px-4 font-sans text-center"
                >
                  Mfg Date
                </HeroTable.Column>
                <HeroTable.Column
                  align="center"
                  allowsSorting
                  sortDirection={getBatchSortDir('expiryDate')}
                  sortRank={getBatchSortRank('expiryDate')}
                  onSort={(e) => handleBatchSort('expiryDate', e)}
                  className="py-3 px-4 font-sans text-center"
                >
                  Expiry Date
                </HeroTable.Column>
                <HeroTable.Column
                  align="center"
                  allowsSorting
                  sortDirection={getBatchSortDir('branchId')}
                  sortRank={getBatchSortRank('branchId')}
                  onSort={(e) => handleBatchSort('branchId', e)}
                  className="py-3 px-4 font-sans text-center"
                >
                  Branch Allocation
                </HeroTable.Column>
                <HeroTable.Column
                  align="center"
                  allowsSorting
                  sortDirection={getBatchSortDir('status')}
                  sortRank={getBatchSortRank('status')}
                  onSort={(e) => handleBatchSort('status', e)}
                  className="py-3 px-4 font-sans text-center"
                >
                  Status
                </HeroTable.Column>
                <HeroTable.Column
                  allowsSorting
                  sortDirection={getBatchSortDir('remarks')}
                  sortRank={getBatchSortRank('remarks')}
                  onSort={(e) => handleBatchSort('remarks', e)}
                  className="py-3 px-4 font-sans text-center"
                >
                  Remarks / Notes
                </HeroTable.Column>
                <th className="py-3 px-4 font-sans text-center">Actions</th>
              </tr>
            </HeroTable.Header>
            <HeroTable.Body>
              {sortedBatches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-default-500 italic">
                    No chemical stock batches match the active filters or selected date. Click "Register Chemical Stock Batch" to log a new record.
                  </td>
                </tr>
              ) : (
                sortedBatches.map(b => {
                  const prod = products.find(p => p.id === b.productId);
                  const pName = prod ? prod.productName : b.productName;
                  const pCode = prod ? prod.productCode : b.productCode;
                  const pUnit = prod?.unit || 'bags';
                  const liveStatus = computeLiveBatchStatus(b.expiryDate);

                  return (
                    <tr 
                      key={b.id} 
                      onClick={() => setSelectedBatchDetail(b)}
                      className="hover:bg-content2/60 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-sans">
                        <strong className="text-foreground font-black block group-hover:text-primary transition-colors">{pName}</strong>
                        <span className="text-[9px] text-primary font-bold">{pCode}</span>
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-foreground">
                        #{b.batchNumber}
                      </td>

                      <td className="py-3 px-4 text-right font-black text-foreground">
                        {b.quantity} {pUnit}
                      </td>

                      <td className="py-3 px-4 text-center text-default-500 font-semibold">
                        {b.manufactureDate}
                      </td>

                      <td className="py-3 px-4 text-center text-foreground font-bold">
                        {b.expiryDate}
                      </td>

                      <td className="py-3 px-4 text-center font-bold">
                        {branches.find(br => br.id === b.branchId)?.name || b.branchId}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wide border ${
                          liveStatus === "Expired"
                            ? "bg-danger/10 text-danger border-danger/20 font-black"
                            : liveStatus === "Expiring Soon"
                            ? "bg-warning/10 text-warning border-warning/20"
                            : "bg-success/10 text-success border-success/20"
                        }`}>
                          {liveStatus}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-sans text-default-500 italic font-medium max-w-[200px] truncate" title={b.remarks}>
                        {b.remarks || "N/A"}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <HeroTooltip content="View Full Batch Details">
                            <HeroButton
                              size="sm"
                              variant="light"
                              isIconOnly
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBatchDetail(b);
                              }}
                              className="h-7 w-7 min-w-7 p-0 text-primary"
                              aria-label="View Full Batch Details"
                            >
                              <Eye className="h-4 w-4" />
                            </HeroButton>
                          </HeroTooltip>
                          {!hasActiveShift && (
                            <HeroTooltip content="Remove batch log entry">
                              <HeroButton
                                size="sm"
                                variant="light"
                                isIconOnly
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveBatch(b.id);
                                }}
                                className="h-7 w-7 min-w-7 p-0 text-default-500 hover:text-danger"
                                aria-label="Remove batch log entry"
                              >
                                <Trash2 className="h-4 w-4" />
                              </HeroButton>
                            </HeroTooltip>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </HeroTable.Body>
          </HeroTable>
        </div>
      </div>
    </div>
  );
};
