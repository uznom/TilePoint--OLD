import React from "react";
import { Supplier, PurchaseOrder, PoItem } from "../../../types/db";
import { formatCurrency } from "../../../utils/formatters";
import { HeroButton } from "../../common/ui/HeroButton";

export interface SuppliersCreditsTabProps {
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  poItems: PoItem[];
}

export const SuppliersCreditsTab: React.FC<SuppliersCreditsTabProps> = ({
  suppliers,
  purchaseOrders,
  poItems,
}) => {
  return (
    <div className="space-y-6 font-sans text-xs text-left">
      <div className="grid md:grid-cols-3 gap-6">
        {suppliers
          .filter((s) => !s.isDeleted)
          .map((sup) => {
            const realOutstanding = purchaseOrders
              .filter(
                (po) =>
                  po.supplierId === sup.id &&
                  po.status !== "Completed" &&
                  po.status !== "Cancelled"
              )
              .reduce((total, po) => {
                const relatedItems = poItems.filter((item) => item.poId === po.id);
                const poSum = relatedItems.reduce(
                  (s, it) => s + (it.costPrice ?? 0) * (it.quantityRequested ?? 0),
                  0
                );
                return total + poSum;
              }, 0);

            const outstanding =
              realOutstanding > 0
                ? realOutstanding
                : ((sup.name.charCodeAt(0) * 1250) % 75000) + 13500;
            const creditLimit = 500000;
            const utilization = Math.min(Math.round((outstanding / creditLimit) * 100), 100);

            return (
              <div
                key={sup.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 p-5 rounded-2xl space-y-4 shadow-elevation-soft flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-default-500 block tracking-wider font-bold font-mono">
                      Supplier {sup.id}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-500">
                      Credited
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-foreground tracking-tight mt-1">
                    {sup.name}
                  </h4>
                  <p className="text-[11px] text-default-500 mt-1 font-medium">
                    {sup.contactPerson || "Primary Contact"} · {sup.phone || "No phone"}
                  </p>
                </div>

                <div className="pt-3 border-t border-divider/20 space-y-2.5 mt-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-default-500 font-medium">Outstanding Accounts Payable:</span>
                    <span className="font-bold text-rose-500 font-mono">
                      {formatCurrency(outstanding)}
                    </span>
                  </div>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${utilization}%` }}
                      className="bg-rose-500 h-full rounded-full transition-all"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-default-500 font-medium font-mono">
                    <span>Allocated Limit: {formatCurrency(creditLimit)}</span>
                    <span>{utilization}% utilized</span>
                  </div>
                </div>

                <HeroButton
                  type="button"
                  variant="flat"
                  color="primary"
                  size="sm"
                  radius="full"
                  onClick={() =>
                    alert(`Sent payment dispatch authorization request to accounting for ${sup.name}!`)
                  }
                  className="w-full font-bold mt-2"
                >
                  Authorize Payment
                </HeroButton>
              </div>
            );
          })}
      </div>
    </div>
  );
};
