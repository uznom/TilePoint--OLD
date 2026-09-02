import React from "react";
import { Sale, User } from "../../types/db";
import { formatCurrency } from "../../utils/formatters";
import { Search, Eye, Printer, ShieldAlert, DollarSign, Receipt, Tag, AlertTriangle, RefreshCw } from "lucide-react";
import { HeroButton } from "../common/ui/HeroButton";

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
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice #, customer name, cashier..."
              className="w-full bg-content2 border border-divider/40 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <Search className="h-4 w-4 text-default-400 absolute left-3 top-2.5" />
          </div>

          <select
            value={filterPaymentMethod}
            onChange={(e) => setFilterPaymentMethod(e.target.value)}
            className="bg-content2 border border-divider/40 rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="ALL">All Tender Types</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="GCash">GCash</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Corporate Credit">Corporate Credit</option>
          </select>

          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="bg-content2 border border-divider/40 rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
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
      <div className="bg-content1 rounded-3xl border border-divider/30 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-content2/60 border-b border-divider/20 text-[9px] font-black text-default-500 uppercase tracking-wider">
                <th className="p-4">Invoice Reference</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Cashier</th>
                <th className="p-4">Payment Tender</th>
                <th className="p-4">Valuation</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider/10">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-default-500 font-medium">
                    No transactions match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-content2/40 transition-colors">
                    <td className="p-4">
                      <span className="font-black font-mono text-primary block">
                        #{sale.saleNumber || sale.id}
                      </span>
                      <span className="text-[10px] text-default-500">
                        {sale.createdAt ? new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A"}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-foreground">{sale.customerName || "Walk-In Customer"}</td>
                    <td className="p-4 text-default-500 font-medium">{sale.cashierName || "Terminal Cashier"}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-content2 border border-divider/30 text-foreground">
                        {sale.paymentMethod || "Cash"}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-black text-foreground">
                      {formatCurrency(sale.grandTotal || 0)}
                    </td>
                    <td className="p-4">
                      {sale.isDeleted ? (
                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/20">
                          Voided
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          Cleared
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
