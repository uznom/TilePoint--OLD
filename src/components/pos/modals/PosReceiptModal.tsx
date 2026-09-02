import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle, FileText, Printer, Scissors, Truck } from "lucide-react";
import { Sale } from "../../../types/db";

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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 overflow-y-auto flex items-start justify-center z-50 p-4 md:items-center font-sans text-xs">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border border-divider/30 p-5 z-20 shadow-2xl bg-content1 text-foreground flex flex-col justify-between shrink-0"
          >
            <div className="flex flex-col items-center justify-center mb-4 text-center">
              <div className="p-2 rounded-full bg-secondary-50 border border-secondary/20 text-secondary-700 mb-2 text-center">
                <CheckCircle className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                Checkout Succeeded
              </h3>
              <p className="text-[11px] text-default-500 font-medium">
                Inventory files adjusted automatically.
              </p>
            </div>

            <div className="flex bg-content1 p-1 rounded-xl border border-divider/30 mb-3 bir-report-no-print text-center gap-1">
              <button
                type="button"
                onClick={() => setReceiptViewMode("unified")}
                className={`flex-1 py-1.5 px-2 text-[10px] font-extrabold uppercase rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  receiptViewMode === "unified"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-default-500 hover:text-foreground"
                }`}
              >
                <Scissors className="h-3 w-3" /> All (Auto-Cut)
              </button>

              <button
                type="button"
                onClick={() => setReceiptViewMode("official")}
                className={`flex-1 py-1.5 px-2 text-[10px] font-extrabold uppercase rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  receiptViewMode === "official"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-default-500 hover:text-foreground"
                }`}
              >
                <FileText className="h-3 w-3" /> Sales Receipt
              </button>

              {activeReceiptDelivery && (
                <button
                  type="button"
                  onClick={() => setReceiptViewMode("delivery")}
                  className={`flex-1 py-1.5 px-2 text-[10px] font-extrabold uppercase rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    receiptViewMode === "delivery"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-default-500 hover:text-foreground"
                  }`}
                >
                  <Truck className="h-3 w-3" /> Delivery Receipt
                </button>
              )}
            </div>

            <div className={`space-y-3 my-2 select-text text-left max-h-[50vh] overflow-y-auto bir-receipt-container scrollbar-thin p-1 ${receiptFontClass}`}>
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

            <div className="flex flex-col sm:flex-row gap-2 mt-4 flex-shrink-0 bir-report-no-print">
              <button
                type="button"
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
                className="flex-1 py-2.5 px-3 text-xs font-black rounded-full bg-primary text-primary-foreground hover:brightness-110 shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center uppercase tracking-wider active:scale-95"
              >
                <Printer className="h-4 w-4" />
                <span>
                  {receiptViewMode === "unified"
                    ? activeReceiptDelivery
                      ? "Print All (Auto-Cut)"
                      : "Print Receipt"
                    : receiptViewMode === "delivery"
                    ? "Print Delivery Receipt"
                    : "Print Sales Receipt"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  setReceiptViewMode("unified");
                }}
                className="py-2.5 px-4 text-xs font-bold rounded-full border border-divider/50 hover:bg-default-100 text-foreground transition-colors cursor-pointer text-center uppercase tracking-wider active:scale-95"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
