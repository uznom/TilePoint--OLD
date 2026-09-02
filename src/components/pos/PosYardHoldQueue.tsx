import React from "react";
import { formatCurrency } from "../../utils/formatters";
import { Clock, Play, Trash2, ShoppingBag, X } from "lucide-react";

export interface HeldSaleItem {
  id: string;
  customerName?: string;
  heldAt: string | number;
  items: any[];
  notes?: string;
  grandTotal?: number;
}

export interface PosYardHoldQueueProps {
  isOpen: boolean;
  onClose: () => void;
  heldSales: HeldSaleItem[];
  onResumeHeldSale: (heldSale: HeldSaleItem) => void;
  onDeleteHeldSale: (heldSaleId: string) => void;
}

export const PosYardHoldQueue: React.FC<PosYardHoldQueueProps> = ({
  isOpen,
  onClose,
  heldSales,
  onResumeHeldSale,
  onDeleteHeldSale,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      <div className="relative bg-content1 border border-divider/40 rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl z-10 text-left space-y-6 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-divider/20 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shrink-0 border border-primary/20">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">Staged Orders & Held Carts</h3>
              <p className="text-[10px] text-default-500 font-bold uppercase tracking-wider">
                Floor Material Reservations & Staged Baskets
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-content2 text-default-500 hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
          {heldSales.length === 0 ? (
            <div className="py-12 text-center bg-content2/30 rounded-2xl border border-dashed border-divider/30 text-default-500 text-xs font-medium space-y-2">
              <ShoppingBag className="h-8 w-8 mx-auto text-default-400" />
              <p>No sales currently staged or held in queue.</p>
            </div>
          ) : (
            heldSales.map((sale) => {
              const totalAmount = sale.grandTotal || sale.items.reduce((sum, i) => sum + (i.subtotal || i.unitPrice * i.quantity), 0);
              return (
                <div key={sale.id} className="p-4 bg-content2/50 border border-divider/30 rounded-2xl flex items-center justify-between gap-3 hover:border-primary/40 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-foreground">
                        {sale.customerName || "Walk-In Customer"}
                      </span>
                      <span className="text-[10px] text-default-400 font-mono">
                        {new Date(sale.heldAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-[10px] text-default-500">
                      {sale.items.length} item line(s) • Total: <strong className="text-primary font-mono">{formatCurrency(totalAmount)}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onResumeHeldSale(sale)}
                      className="px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black uppercase tracking-wider rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Play className="h-3 w-3" />
                      <span>Resume</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteHeldSale(sale.id)}
                      className="p-1.5 rounded-xl hover:bg-danger/10 text-default-400 hover:text-danger transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end border-t border-divider/20 pt-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-content2 hover:bg-content3 border border-divider/30 text-xs font-bold text-foreground rounded-full transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
