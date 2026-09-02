import React, { useState } from "react";
import { CheckCircle, FileText, Printer, Scissors, Truck } from "lucide-react";
import { Sale } from "../../../types/db";
import { HeroModal } from "../../common/ui/HeroModal";
import { HeroButton } from "../../common/ui/HeroButton";

export interface PosReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeReceipt: Sale | null;
  activeReceiptDelivery: any;
  receiptFontClass: string;
  renderPosSalesReceipt: () => React.ReactNode;
  renderPosDeliveryReceiptCopy: (copyType: "STORE COPY" | "CUSTOMER COPY" | any) => React.ReactNode;
  renderCutSeparator: (label: string) => React.ReactNode;
  addAuditLog: (action: string, description: string, tableAffected: string, recordId: string) => void;
  showToast: (msg: string) => void;
}

export const PosReceiptModal: React.FC<PosReceiptModalProps> = ({
  isOpen,
  onClose,
  activeReceipt,
  activeReceiptDelivery,
  receiptFontClass,
  renderPosSalesReceipt,
  renderPosDeliveryReceiptCopy,
  renderCutSeparator,
  addAuditLog,
  showToast,
}) => {
  const [receiptViewMode, setReceiptViewMode] = useState<"unified" | "official" | "delivery">("unified");

  if (!activeReceipt) return null;

  return (
    <HeroModal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
    >
      <div className="p-5 sm:p-6 space-y-4 font-sans text-xs text-foreground text-left">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="p-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mb-2">
            <CheckCircle className="h-6 w-6 text-emerald-500" />
          </div>
          <h3 className="text-base font-bold text-foreground tracking-tight">
            Checkout Succeeded
          </h3>
          <p className="text-xs text-default-500 font-medium">
            Inventory stock deducted & recorded.
          </p>
        </div>

        {/* Tactile Segmented Print View Selector */}
        <div className="flex p-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/50 dark:border-white/5 shadow-2xs bir-report-no-print text-center gap-1">
          <button
            type="button"
            onClick={() => setReceiptViewMode("unified")}
            className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded-full transition-all cursor-pointer flex items-center justify-center gap-1 font-sans active:scale-[0.98] ${
              receiptViewMode === "unified"
                ? "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-bold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <Scissors className="h-3 w-3" /> All (Auto-Cut)
          </button>

          <button
            type="button"
            onClick={() => setReceiptViewMode("official")}
            className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded-full transition-all cursor-pointer flex items-center justify-center gap-1 font-sans active:scale-[0.98] ${
              receiptViewMode === "official"
                ? "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-bold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <FileText className="h-3 w-3" /> Sales Receipt
          </button>

          {activeReceiptDelivery && (
            <button
              type="button"
              onClick={() => setReceiptViewMode("delivery")}
              className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded-full transition-all cursor-pointer flex items-center justify-center gap-1 font-sans active:scale-[0.98] ${
                receiptViewMode === "delivery"
                  ? "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-bold"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <Truck className="h-3 w-3" /> Delivery
            </button>
          )}
        </div>

        <div className={`space-y-3 my-2 select-text text-left max-h-[50vh] overflow-y-auto bir-receipt-container scrollbar-thin p-2 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-white/5 ${receiptFontClass}`}>
          {receiptViewMode === "unified" && (
            <>
              {renderPosSalesReceipt()}
              {activeReceiptDelivery && (
                <>
                  {renderCutSeparator("SALES RECEIPT / DELIVERY RECEIPT (STORE COPY)")}
                  {renderPosDeliveryReceiptCopy("STORE COPY")}
                  {renderCutSeparator("STORE COPY / CUSTOMER COPY")}
                  {renderPosDeliveryReceiptCopy("CUSTOMER COPY")}
                </>
              )}
            </>
          )}

          {receiptViewMode === "official" && renderPosSalesReceipt()}

          {receiptViewMode === "delivery" && activeReceiptDelivery && (
            <>
              {renderPosDeliveryReceiptCopy("STORE COPY")}
              {renderCutSeparator("STORE COPY / CUSTOMER COPY")}
              {renderPosDeliveryReceiptCopy("CUSTOMER COPY")}
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-divider/20 bir-report-no-print">
          <HeroButton
            type="button"
            color="primary"
            variant="solid"
            size="md"
            radius="full"
            startIcon={<Printer className="h-4 w-4" />}
            onClick={() => {
              window.print();
              const logType =
                receiptViewMode === "delivery"
                  ? "PRINT_DELIVERY_RECEIPT"
                  : receiptViewMode === "unified"
                  ? "POS_UNIFIED_RECEIPT_PRINT"
                  : "POS_RECEIPT_PRINT";
              const logMsg =
                receiptViewMode === "delivery"
                  ? `Printed delivery receipt for ${activeReceipt.saleNumber}`
                  : receiptViewMode === "unified"
                  ? `Printed unified sales & delivery receipts (auto-cut) for ${activeReceipt.saleNumber}`
                  : `Printed sales receipt for ${activeReceipt.saleNumber}`;

              addAuditLog(logType, logMsg, "Sales", activeReceipt.id);
              showToast("Sent printing signal to hardware terminal.");
            }}
            className="flex-1 font-bold shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
          >
            {receiptViewMode === "unified"
              ? activeReceiptDelivery
                ? "Print All (Auto-Cut)"
                : "Print Receipt"
              : receiptViewMode === "delivery"
              ? "Print Delivery Receipt"
              : "Print Sales Receipt"}
          </HeroButton>

          <HeroButton
            type="button"
            variant="flat"
            size="md"
            radius="full"
            onClick={() => {
              onClose();
              setReceiptViewMode("unified");
            }}
          >
            Done
          </HeroButton>
        </div>
      </div>
    </HeroModal>
  );
};
