import React from "react";
import { formatCurrency } from "../../utils/formatters";

export interface PosReceiptPrintLayoutProps {
  printableReceipt: any;
  receiptFontSize?: "compact" | "normal" | "large";
}

export const PosReceiptPrintLayout: React.FC<PosReceiptPrintLayoutProps> = ({
  printableReceipt,
  receiptFontSize = "normal",
}) => {
  if (!printableReceipt) return null;

  return (
    <div id="printable-receipt" className="hidden print:block text-black bg-white p-2 font-mono text-xs max-w-[80mm] mx-auto">
      {/* Header */}
      <div className="text-center space-y-0.5 border-b border-dashed border-black pb-2 mb-2">
        <h2 className="text-sm font-black tracking-wider uppercase">TILEPOINT CERAMICS</h2>
        <p className="text-[10px]">{printableReceipt.branchName || "Main Showroom"}</p>
        <p className="text-[9px]">TIN: {printableReceipt.branchTin || "000-000-000-000"}</p>
        <p className="text-[9px]">{printableReceipt.branchAddress || "Metro Manila, Philippines"}</p>
        <p className="text-[9px]">Tel: {printableReceipt.branchPhone || "(02) 8000-0000"}</p>
      </div>

      {/* Ticket Details */}
      <div className="space-y-0.5 text-[10px] border-b border-dashed border-black pb-2 mb-2">
        <div className="flex justify-between">
          <span>INVOICE #:</span>
          <span className="font-bold">{printableReceipt.saleNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>DATE / TIME:</span>
          <span>{printableReceipt.dateTime || new Date().toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>CASHIER:</span>
          <span>{printableReceipt.cashierName || "Terminal 1"}</span>
        </div>
        {printableReceipt.customerName && (
          <div className="flex justify-between">
            <span>CUSTOMER:</span>
            <span>{printableReceipt.customerName}</span>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="space-y-1 border-b border-dashed border-black pb-2 mb-2 text-[10px]">
        <div className="grid grid-cols-12 font-bold">
          <span className="col-span-6">DESCRIPTION</span>
          <span className="col-span-2 text-right">QTY</span>
          <span className="col-span-4 text-right">AMOUNT</span>
        </div>
        {printableReceipt.items && printableReceipt.items.map((item: any, idx: number) => (
          <div key={idx} className="grid grid-cols-12">
            <span className="col-span-6 truncate">{item.productName}</span>
            <span className="col-span-2 text-right">{item.quantity}</span>
            <span className="col-span-4 text-right font-bold">{formatCurrency(item.subtotal || item.quantity * item.unitPrice)}</span>
          </div>
        ))}
      </div>

      {/* Financial Summary */}
      <div className="space-y-0.5 text-[10px] border-b border-dashed border-black pb-2 mb-2">
        <div className="flex justify-between">
          <span>SUBTOTAL:</span>
          <span>{formatCurrency(printableReceipt.subtotal || printableReceipt.grandTotal)}</span>
        </div>
        {printableReceipt.discountTotal > 0 && (
          <div className="flex justify-between">
            <span>DISCOUNT:</span>
            <span>-{formatCurrency(printableReceipt.discountTotal)}</span>
          </div>
        )}
        <div className="flex justify-between text-xs font-black pt-1 border-t border-black">
          <span>TOTAL DUE:</span>
          <span>{formatCurrency(printableReceipt.grandTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>TENDER ({printableReceipt.paymentMethod}):</span>
          <span>{formatCurrency(printableReceipt.amountTendered || printableReceipt.grandTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>CHANGE:</span>
          <span>{formatCurrency(printableReceipt.changeAmount || 0)}</span>
        </div>
      </div>

      {/* BIR Compliance Footnote */}
      <div className="text-center text-[8px] space-y-0.5 pt-1">
        <p className="font-bold">THIS SERVES AS AN OFFICIAL SALES RECEIPT</p>
        <p>Thank you for choosing TilePoint!</p>
        <p className="pt-2">*** AUTO-CUT RECEIPT FOOTER ***</p>
      </div>
    </div>
  );
};
