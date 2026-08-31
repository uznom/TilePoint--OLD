import React, { useState } from "react";
import { AlertCircle, CheckCircle2, RefreshCw, Trash2 } from "lucide-react";
import { ProductReturn } from "../../../types/db";
import { formatCurrency } from "../../../utils/formatters";
import { HeroSelect } from "../../common/ui/HeroSelect";

export interface ReturnedProductsTabProps {
  productReturns: ProductReturn[];
  onAddReturn: (returnData: {
    saleId: string;
    productName: string;
    quantity: number;
    amountRefunded: number;
    damageRestockFee: number;
    status: "Restocked" | "Defective/Damaged";
  }) => void;
  onDeleteReturn: (id: string) => void;
}

export const ReturnedProductsTab: React.FC<ReturnedProductsTabProps> = ({
  productReturns,
  onAddReturn,
  onDeleteReturn,
}) => {
  const [retSaleId, setRetSaleId] = useState("");
  const [retProduct, setRetProduct] = useState("");
  const [retQty, setRetQty] = useState("");
  const [retRef, setRetRef] = useState("");
  const [retFee, setRetFee] = useState("5");
  const [retStatus, setRetStatus] = useState<"Restocked" | "Defective/Damaged">("Restocked");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(retQty, 10);
    const ref = parseFloat(retRef);
    const feePct = parseFloat(retFee) || 0;

    if (!retSaleId.trim() || !retProduct.trim() || isNaN(qty) || qty <= 0 || isNaN(ref) || ref <= 0) {
      alert("Please fill out all required fields with valid numerical values.");
      return;
    }

    const feeAmt = (ref * feePct) / 100;
    const netRefund = ref - feeAmt;

    onAddReturn({
      saleId: retSaleId.trim(),
      productName: retProduct.trim(),
      quantity: qty,
      amountRefunded: netRefund,
      damageRestockFee: feeAmt,
      status: retStatus,
    });

    setRetSaleId("");
    setRetProduct("");
    setRetQty("");
    setRetRef("");
  };

  return (
    <div className="grid md:grid-cols-3 gap-6 font-sans text-xs">
      <div className="md:col-span-1 bg-content1 border border-divider/15 p-5 rounded-2xl h-fit space-y-4">
        <h3 className="font-bold text-sm text-primary border-b border-divider/10 pb-3 flex items-center gap-1.5">
          <RefreshCw className="h-5 w-5" />
          Register Sales Return
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="font-bold text-default-500">Original System Sale Receipt ID *</label>
            <input
              required
              value={retSaleId}
              onChange={(e) => setRetSaleId(e.target.value)}
              type="text"
              placeholder="Receipt ID (e.g. S-1001)"
              className="w-full bg-content3 border border-divider rounded-lg p-2.5 font-bold outline-none focus:border-primary text-foreground"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-default-500">Select Tile / Product Return *</label>
            <input
              required
              value={retProduct}
              onChange={(e) => setRetProduct(e.target.value)}
              type="text"
              placeholder="Ceramic Floor Tile Carrara"
              className="w-full bg-content3 border border-divider rounded-lg p-2.5 outline-none focus:border-primary text-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-default-500">Qty Returned *</label>
              <input
                required
                value={retQty}
                onChange={(e) => setRetQty(e.target.value)}
                type="number"
                placeholder="1"
                className="w-full bg-content3 border border-divider rounded-lg p-2.5 outline-none focus:border-primary text-foreground font-bold"
              />
            </div>
            <div className="space-y-1">
              <HeroSelect
                label="Damage Fee %"
                value={retFee}
                onValueChange={(val) => setRetFee(val)}
                radius="md"
                items={[
                  { key: '5', label: '5% fee' },
                  { key: '10', label: '10% fee' },
                  { key: '15', label: '15% fee' },
                  { key: '0', label: '0% fee' },
                ]}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-default-500">Gross Item Cost Refundable (PHP) *</label>
            <input
              required
              value={retRef}
              onChange={(e) => setRetRef(e.target.value)}
              type="number"
              placeholder="580"
              className="w-full bg-content3 border border-divider rounded-lg p-2.5 outline-none focus:border-primary text-foreground font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-default-500">Restocking Stock Status</label>
            <div className="flex gap-4 p-2 bg-content3 border border-divider rounded-lg">
              <label className="flex items-center gap-1.5 cursor-pointer text-foreground">
                <input
                  type="radio"
                  name="restock_status"
                  checked={retStatus === "Restocked"}
                  onChange={() => setRetStatus("Restocked")}
                />
                <span>Good Stock</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-foreground">
                <input
                  type="radio"
                  name="restock_status"
                  checked={retStatus === "Defective/Damaged"}
                  onChange={() => setRetStatus("Defective/Damaged")}
                />
                <span>Damaged/Defect</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-bold transition hover:opacity-90 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4" />
            Submit Sales Return
          </button>
        </form>
      </div>

      <div className="md:col-span-2 space-y-4">
        <div className="bg-content1 border border-divider/15 p-5 rounded-2xl flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-xs font-sans space-y-1">
            <div className="font-bold text-foreground">
              Returned Stock & Accounting Policy
            </div>
            <p className="text-default-500 leading-relaxed">
              All processed customer returns add the tiles back into Warehouse Inventory immediately if logged as "Good Stock". Restocking charges are deducted dynamically from the net drawer payout.
            </p>
          </div>
        </div>

        <div className="bg-content1 border border-divider/15 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-auto scrollbar-thin scrollbar-thumb-divider max-h-[60vh]">
            <table className="w-full text-left font-sans text-xs">
              <thead className="bg-content3/50 font-bold border-b border-divider/15 text-default-500">
                <tr>
                  <th className="p-3">Track Return</th>
                  <th className="p-3">Receipt Ref</th>
                  <th className="p-3">Inventory Status</th>
                  <th className="p-3 text-right">Fee Deduction</th>
                  <th className="p-3 text-right">Net Refunded</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/10">
                {productReturns.filter(rt => !rt.isDeleted).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-default-500">
                      No returned items registered yet.
                    </td>
                  </tr>
                ) : (
                  productReturns.filter(rt => !rt.isDeleted).map((rt) => (
                    <tr key={rt.id} className="hover:bg-content2/40 transition">
                      <td className="p-3 font-semibold text-foreground">
                        <div>{rt.productName}</div>
                        <div className="text-[10px] text-default-400 mt-0.5">
                          {rt.id} · {rt.dateTime && !isNaN(new Date(rt.dateTime).getTime()) ? new Date(rt.dateTime).toLocaleString("en-US") : "N/A"}
                        </div>
                      </td>
                      <td className="p-3 font-black text-foreground">{rt.saleId}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rt.status === "Restocked" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                        }`}>
                          {rt.status}
                        </span>
                      </td>
                      <td className="p-3 text-right text-default-500 font-bold">
                        {formatCurrency(rt.damageRestockFee || 0)}
                      </td>
                      <td className="p-3 text-right text-emerald-500 font-bold">
                        {formatCurrency(rt.amountRefunded || 0)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => onDeleteReturn(rt.id)}
                          className="p-1 hover:bg-danger/10 text-default-400 hover:text-danger rounded-lg transition cursor-pointer"
                          title="Delete Return Log"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
