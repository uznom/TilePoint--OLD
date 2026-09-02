import React, { useMemo } from "react";
import { Branch, PurchaseOrder, Supplier, User } from "../../types/db";
import { Plus, Eye, Printer, PackageCheck } from "lucide-react";
import { formatCurrency } from "../../utils/formatters";
import { HeroButton } from "../common/ui/HeroButton";
import { TablePagination } from "../TablePagination";

export interface PurchaseOrdersTabProps {
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  branches: Branch[];
  currentUser: User | null;
  poFilterTab: "all" | "pending" | "outsourcing";
  setPoFilterTab: (tab: "all" | "pending" | "outsourcing") => void;
  poPage: number;
  setPoPage: (page: number) => void;
  poPageSize: number;
  onOpenCreatePo: () => void;
  onViewPoDetails: (po: PurchaseOrder) => void;
  onOpenReceiveModal: (po: PurchaseOrder) => void;
  onPrintPo: (po: PurchaseOrder) => void;
  onUpdatePoStatus: (poId: string, status: any) => void;
}

export const PurchaseOrdersTab: React.FC<PurchaseOrdersTabProps> = ({
  purchaseOrders,
  suppliers,
  branches,
  currentUser,
  poFilterTab,
  setPoFilterTab,
  poPage,
  setPoPage,
  poPageSize,
  onOpenCreatePo,
  onViewPoDetails,
  onOpenReceiveModal,
  onPrintPo,
  onUpdatePoStatus,
}) => {
  const pendingCount = purchaseOrders.filter(
    (po) => po.status === "Pending" || po.status === "Draft"
  ).length;

  const outsourcingCount = purchaseOrders.filter(
    (po) =>
      po.status === "Approved" ||
      po.status === "Ordered" ||
      po.status === "Partially Received"
  ).length;

  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      if (poFilterTab === "pending") {
        return po.status === "Pending" || po.status === "Draft";
      }
      if (poFilterTab === "outsourcing") {
        return (
          po.status === "Approved" ||
          po.status === "Ordered" ||
          po.status === "Partially Received"
        );
      }
      return true;
    });
  }, [purchaseOrders, poFilterTab]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / poPageSize));
  const paginatedOrders = filteredOrders.slice(
    (poPage - 1) * poPageSize,
    poPage * poPageSize
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
      case "Received":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "Approved":
      case "Ordered":
        return "bg-sky-500/10 text-sky-500 border-sky-500/20";
      case "Partially Received":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "Cancelled":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Sub Filter Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider/20 pb-4">
        <div className="flex items-center gap-2">
          {[
            { id: "all", label: "All Requisitions", count: purchaseOrders.length },
            { id: "pending", label: "Pending Approval", count: pendingCount },
            { id: "outsourcing", label: "In-Transit / Outsourced", count: outsourcingCount },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPoFilterTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                poFilterTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-content2/60 text-default-500 hover:text-foreground hover:bg-content2"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                poFilterTab === tab.id
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-content3 text-default-500"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <HeroButton
          size="sm"
          color="primary"
          radius="full"
          onClick={onOpenCreatePo}
          startIcon={<Plus className="h-3.5 w-3.5" />}
          className="font-black text-xs uppercase tracking-wider"
        >
          Draft Purchase Order
        </HeroButton>
      </div>

      {/* PO List Table */}
      <div className="bg-content1 rounded-3xl border border-divider/30 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-content2/60 border-b border-divider/20 text-[9px] font-black text-default-500 uppercase tracking-wider">
                <th className="p-4">PO Reference</th>
                <th className="p-4">Vendor Supplier</th>
                <th className="p-4">Destination Branch</th>
                <th className="p-4">Valuation</th>
                <th className="p-4">Terms / Due Date</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider/10">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-default-500 font-medium">
                    No purchase orders found in this view.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((po) => {
                  const supplier = suppliers.find((s) => s.id === po.supplierId);
                  const destBranch = branches.find((b) => b.id === po.branchId);
                  return (
                    <tr key={po.id} className="hover:bg-content2/40 transition-colors">
                      <td className="p-4">
                        <span className="font-black font-mono text-primary block">
                          #{po.poNumber}
                        </span>
                        <span className="text-[10px] text-default-500">
                          {po.date ? new Date(po.date).toLocaleDateString() : "N/A"}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-foreground">
                        {supplier?.name || "Verified Supplier"}
                      </td>
                      <td className="p-4 font-semibold text-default-500">
                        {destBranch?.name || "Main Warehouse"}
                      </td>
                      <td className="p-4 font-mono font-black text-foreground">
                        {formatCurrency(po.totalAmount || 0)}
                      </td>
                      <td className="p-4 text-[10px] text-default-500">
                        {po.paymentMode === "terms" ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-foreground">
                              {po.termsLength || 30} Days Net
                            </span>
                            {po.termEndDate && (
                              <span className="block text-[9px] font-mono text-primary">
                                Due: {new Date(po.termEndDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="font-medium">Cash on Delivery</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${getStatusBadge(po.status)}`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onViewPoDetails(po)}
                            className="p-1.5 rounded-xl hover:bg-content2 text-default-500 hover:text-primary transition-colors cursor-pointer"
                            title="View Requisition Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onPrintPo(po)}
                            className="p-1.5 rounded-xl hover:bg-content2 text-default-500 hover:text-foreground transition-colors cursor-pointer"
                            title="Print PO Document"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          {po.status !== "Completed" && po.status !== "Cancelled" && (
                            <button
                              type="button"
                              onClick={() => onOpenReceiveModal(po)}
                              className="px-2.5 py-1 bg-emerald-600/10 hover:bg-emerald-600 hover:text-white text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider rounded-full transition-all cursor-pointer flex items-center gap-1"
                              title="Ingest Inbound Stock"
                            >
                              <PackageCheck className="h-3 w-3" />
                              <span>Receive</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-divider/20 flex justify-end">
            <TablePagination
              currentPage={poPage}
              totalItems={filteredOrders.length}
              pageSize={poPageSize}
              onPageChange={setPoPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};
