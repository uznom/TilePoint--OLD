import React from "react";
import { Sale, User } from "../../types/db";
import { formatCurrency } from "../../utils/formatters";
import { Search, Eye, Printer, ShieldAlert, DollarSign, Receipt, Tag, AlertTriangle, RefreshCw } from "lucide-react";
import { HeroButton, HeroSelect, HeroInput, HeroDateRangePicker, HeroTable } from "../common/ui";

export interface PosSalesLedgerTabProps {
  sales: Sale[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterPaymentMethod: string;
  setFilterPaymentMethod: (pm: string) => void;
  filterDate: string;
  setFilterDate: (d: string) => void;
  filterDateEnd: string;
  setFilterDateEnd: (d: string) => void;
  currentUser: User | null;
  onViewReceipt: (sale: Sale) => void;
  onPrintReceipt: (sale: Sale) => void;
  onOpenVoidModal: (sale: Sale) => void;
  onExportCsv?: () => void;
  onRefreshSales?: () => void;
}

export const PosSalesLedgerTab: React.FC<PosSalesLedgerTabProps> = ({
  sales,
  searchQuery,
  setSearchQuery,
  filterPaymentMethod,
  setFilterPaymentMethod,
  filterDate,
  setFilterDate,
  filterDateEnd,
  setFilterDateEnd,
  currentUser,
  onViewReceipt,
  onPrintReceipt,
  onOpenVoidModal,
  onExportCsv,
  onRefreshSales,
}) => {
  const activeSales = sales.filter((s) => !s.isDeleted);
  const voidedSales = sales.filter((s) => s.isDeleted);

  const totalRevenue = activeSales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
  const totalDiscounts = activeSales.reduce((sum, s) => sum + (s.discount || 0), 0);

  const filteredSales = sales.filter((sale) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const numMatch = (sale.saleNumber || "").toLowerCase().includes(q);
      const custMatch = (sale.customerName || "").toLowerCase().includes(q);
      const cashierMatch = (sale.cashierName || "").toLowerCase().includes(q);
      if (!numMatch && !custMatch && !cashierMatch) return false;
    }
    if (filterPaymentMethod && filterPaymentMethod !== "ALL") {
      if (sale.paymentMethod !== filterPaymentMethod) return false;
    }
    if (filterDate) {
      const saleDate = (sale.createdAt || "").slice(0, 10);
      if (filterDateEnd) {
        if (saleDate < filterDate || saleDate > filterDateEnd) return false;
      } else {
        if (saleDate !== filterDate) return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="bg-content1 p-4 rounded-2xl border border-divider/20 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[8px] font-extrabold text-default-500 uppercase tracking-widest">Gross Revenue</span>
            <div className="text-xl font-black mt-1 text-emerald-500 font-mono">
              {formatCurrency(totalRevenue)}
            </div>
          </div>
        </div>

        <div className="bg-content1 p-4 rounded-2xl border border-divider/20 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[8px] font-extrabold text-default-500 uppercase tracking-widest">Active Tickets</span>
            <div className="text-xl font-black mt-1 text-primary">
              {activeSales.length} Completed
            </div>
          </div>
        </div>

        <div className="bg-content1 p-4 rounded-2xl border border-divider/20 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
            <Tag className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[8px] font-extrabold text-default-500 uppercase tracking-widest">Discounts Applied</span>
            <div className="text-xl font-black mt-1 text-amber-500 font-mono">
              {formatCurrency(totalDiscounts)}
            </div>
          </div>
        </div>

        <div className="bg-content1 p-4 rounded-2xl border border-divider/20 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-500 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[8px] font-extrabold text-default-500 uppercase tracking-widest">Void Invoices</span>
            <div className="text-xl font-black mt-1 text-rose-500">
              {voidedSales.length} Voided
            </div>
          </div>
        </div>
      </div>

      {/* Filter Controls Deck */}
      <div className="bg-content1 p-4 rounded-3xl border border-divider/25 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[180px]">
            <HeroInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice #, customer name, cashier..."
              startContent={<Search className="h-4 w-4 text-default-400" />}
              size="sm"
            />
          </div>

          <div className="min-w-[150px]">
            <HeroSelect
              value={filterPaymentMethod}
              onChange={(e) => setFilterPaymentMethod(e.target.value)}
              size="sm"
            >
              <option value="ALL">All Tender Types</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="GCash">GCash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Corporate Credit">Corporate Credit</option>
            </HeroSelect>
          </div>

          <div className="min-w-[220px]">
            <HeroDateRangePicker
              value={{ start: filterDate, end: filterDateEnd }}
              onChange={(range) => {
                setFilterDate(range.start);
                setFilterDateEnd(range.end);
              }}
              size="sm"
              radius="full"
              placeholder="Filter Date Range"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefreshSales && (
            <HeroButton
              size="sm"
              variant="flat"
              color="default"
              radius="full"
              onClick={onRefreshSales}
              startIcon={<RefreshCw className="h-3.5 w-3.5" />}
              className="font-bold text-xs"
            >
              Refresh
            </HeroButton>
          )}
        </div>
      </div>

      {/* Sales Table */}
      <HeroTable isStriped className="min-w-full">
        <HeroTable.Header>
          <HeroTable.Column>Invoice Reference</HeroTable.Column>
          <HeroTable.Column>Customer</HeroTable.Column>
          <HeroTable.Column>Cashier</HeroTable.Column>
          <HeroTable.Column>Payment Tender</HeroTable.Column>
          <HeroTable.Column>Valuation</HeroTable.Column>
          <HeroTable.Column>Status</HeroTable.Column>
          <HeroTable.Column align="end">Actions</HeroTable.Column>
        </HeroTable.Header>
        <HeroTable.Body>
          {filteredSales.length === 0 ? (
            <HeroTable.Row isHoverable={false}>
              <HeroTable.Cell colSpan={7} className="p-8 text-center text-default-500 font-medium">
                No transactions match the selected filter criteria.
              </HeroTable.Cell>
            </HeroTable.Row>
          ) : (
            filteredSales.map((sale) => (
              <HeroTable.Row key={sale.id}>
                <HeroTable.Cell>
                  <span className="font-black font-mono text-primary block">
                    #{sale.saleNumber || sale.id}
                  </span>
                  <span className="text-[10px] text-default-500">
                    {sale.createdAt ? new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A"}
                  </span>
                </HeroTable.Cell>
                <HeroTable.Cell className="font-bold text-foreground">{sale.customerName || "Walk-In Customer"}</HeroTable.Cell>
                <HeroTable.Cell className="text-default-500 font-medium">{sale.cashierName || "Terminal Cashier"}</HeroTable.Cell>
                <HeroTable.Cell>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-content2 border border-divider/30 text-foreground">
                    {sale.paymentMethod || "Cash"}
                  </span>
                </HeroTable.Cell>
                <HeroTable.Cell className="font-mono font-black text-foreground">
                  {formatCurrency(sale.grandTotal || 0)}
                </HeroTable.Cell>
                <HeroTable.Cell>
                  {sale.isDeleted ? (
                    <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/20">
                      Voided
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      Cleared
                    </span>
                  )}
                </HeroTable.Cell>
                <HeroTable.Cell align="end">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => onViewReceipt(sale)}
                      className="p-1.5 rounded-xl hover:bg-content2 text-default-500 hover:text-primary transition-colors cursor-pointer"
                      title="View Official Receipt"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onPrintReceipt(sale)}
                      className="p-1.5 rounded-xl hover:bg-content2 text-default-500 hover:text-foreground transition-colors cursor-pointer"
                      title="Print Receipt"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                    {!sale.isDeleted && (
                      <button
                        type="button"
                        onClick={() => onOpenVoidModal(sale)}
                        className="p-1.5 rounded-xl hover:bg-rose-500/10 text-default-500 hover:text-rose-500 transition-colors cursor-pointer"
                        title="Void / Refund Invoice"
                      >
                        <ShieldAlert className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </HeroTable.Cell>
              </HeroTable.Row>
            ))
          )}
        </HeroTable.Body>
      </HeroTable>
    </div>
  );
};
