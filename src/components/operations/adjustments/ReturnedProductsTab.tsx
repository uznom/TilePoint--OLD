import React, { useState } from "react";
import { AlertCircle, CheckCircle2, RefreshCw, Trash2 } from "lucide-react";
import { ProductReturn } from "../../../types/db";
import { formatCurrency } from "../../../utils/formatters";
import { HeroSelect } from "../../common/ui/HeroSelect";
import { HeroInput } from "../../common/ui/HeroInput";
import { HeroButton } from "../../common/ui/HeroButton";
import { HeroTable } from "../../common/ui/HeroTable";

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
    <div className="grid md:grid-cols-3 gap-6 font-sans text-xs text-left">
      <div className="md:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 p-5 rounded-2xl h-fit space-y-4 shadow-elevation-soft">
        <h3 className="font-bold text-sm text-foreground border-b border-divider/20 pb-3 flex items-center gap-2 tracking-tight">
          <RefreshCw className="h-5 w-5 text-primary" />
          <span>Register Sales Return</span>
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <HeroInput
            label="Original System Sale Receipt ID *"
            required
            value={retSaleId}
            onValueChange={(val) => setRetSaleId(val)}
            placeholder="Receipt ID (e.g. S-1001)"
            radius="lg"
            variant="flat"
          />

          <HeroInput
            label="Select Tile / Product Return *"
            required
            value={retProduct}
            onValueChange={(val) => setRetProduct(val)}
            placeholder="Ceramic Floor Tile Carrara"
            radius="lg"
            variant="flat"
          />

          <div className="grid grid-cols-2 gap-3">
            <HeroInput
              label="Qty Returned *"
              type="number"
              required
              value={retQty}
              onValueChange={(val) => setRetQty(val)}
              placeholder="1"
              radius="lg"
              variant="flat"
            />
            <HeroSelect
              label="Damage Fee %"
              value={retFee}
              onValueChange={(val) => setRetFee(val)}
              radius="lg"
              items={[
                { key: '5', label: '5% fee' },
                { key: '10', label: '10% fee' },
                { key: '15', label: '15% fee' },
                { key: '0', label: '0% fee' },
              ]}
            />
          </div>

          <HeroInput
            label="Gross Item Cost Refundable (PHP) *"
            type="number"
            step="any"
            required
            size="lg"
            value={retRef}
            onValueChange={(val) => setRetRef(val)}
            placeholder="0.00"
            radius="lg"
            variant="flat"
            startContent={<span className="text-xl sm:text-2xl font-black text-default-400 font-mono select-none">₱</span>}
            classNames={{
              input: "text-xl sm:text-2xl font-black font-mono tracking-tight",
              inputWrapper: "h-14 sm:h-16 shadow-inner border border-divider/40",
            }}
          />

          <div className="space-y-1.5">
            <label className="font-bold text-default-500 uppercase tracking-wider text-[10px]">
              Restocking Stock Status
            </label>
            <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-full border border-zinc-200/50 dark:border-white/5">
              <button
                type="button"
                onClick={() => setRetStatus("Restocked")}
                className={`flex-1 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer font-sans active:scale-[0.98] ${
                  retStatus === "Restocked"
                    ? "bg-emerald-500 text-white shadow-[0_2px_8px_rgba(23,201,100,0.25)] font-bold"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                Good Stock
              </button>
              <button
                type="button"
                onClick={() => setRetStatus("Defective/Damaged")}
                className={`flex-1 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer font-sans active:scale-[0.98] ${
                  retStatus === "Defective/Damaged"
                    ? "bg-rose-500 text-white shadow-[0_2px_8px_rgba(243,18,96,0.25)] font-bold"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                Damaged/Defect
              </button>
            </div>
          </div>

          <HeroButton
            type="submit"
            color="primary"
            variant="solid"
            size="md"
            radius="full"
            startIcon={<CheckCircle2 className="h-4 w-4" />}
            className="w-full font-bold shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
          >
            Submit Sales Return
          </HeroButton>
        </form>
      </div>

      <div className="md:col-span-2 space-y-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 p-5 rounded-2xl flex items-start gap-3 shadow-elevation-soft">
          <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-xs font-sans space-y-1">
            <div className="font-bold text-foreground">
              Returned Stock &amp; Accounting Policy
            </div>
            <p className="text-default-500 leading-relaxed font-medium text-[11px]">
              All processed customer returns add the tiles back into Warehouse Inventory immediately if logged as "Good Stock". Restocking charges are deducted dynamically from the net drawer payout.
            </p>
          </div>
        </div>

        <HeroTable isStriped className="min-w-full">
          <HeroTable.Header>
            <HeroTable.Column>Track Return</HeroTable.Column>
            <HeroTable.Column>Receipt Ref</HeroTable.Column>
            <HeroTable.Column>Inventory Status</HeroTable.Column>
            <HeroTable.Column align="end">Fee Deduction</HeroTable.Column>
            <HeroTable.Column align="end">Net Refunded</HeroTable.Column>
            <HeroTable.Column align="center">Actions</HeroTable.Column>
          </HeroTable.Header>
          <HeroTable.Body>
            {productReturns.filter(rt => !rt.isDeleted).length === 0 ? (
              <HeroTable.Row isHoverable={false}>
                <HeroTable.Cell colSpan={6} className="p-8 text-center text-default-500 font-sans">
                  No returned items registered yet.
                </HeroTable.Cell>
              </HeroTable.Row>
            ) : (
              productReturns.filter(rt => !rt.isDeleted).map((rt) => (
                <HeroTable.Row key={rt.id}>
                  <HeroTable.Cell>
                    <div className="font-semibold text-foreground">{rt.productName}</div>
                    <div className="text-[10px] text-default-400 mt-0.5 font-mono">
                      {rt.id} · {rt.dateTime && !isNaN(new Date(rt.dateTime).getTime()) ? new Date(rt.dateTime).toLocaleString("en-US") : "N/A"}
                    </div>
                  </HeroTable.Cell>
                  <HeroTable.Cell className="font-bold text-foreground font-mono">{rt.saleId}</HeroTable.Cell>
                  <HeroTable.Cell>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      rt.status === "Restocked" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                    }`}>
                      {rt.status}
                    </span>
                  </HeroTable.Cell>
                  <HeroTable.Cell align="end" className="text-default-500 font-bold font-mono">
                    {formatCurrency(rt.damageRestockFee || 0)}
                  </HeroTable.Cell>
                  <HeroTable.Cell align="end" className="text-emerald-500 font-bold font-mono">
                    {formatCurrency(rt.amountRefunded || 0)}
                  </HeroTable.Cell>
                  <HeroTable.Cell align="center">
                    <button
                      type="button"
                      onClick={() => onDeleteReturn(rt.id)}
                      className="p-1.5 hover:bg-rose-500/10 text-default-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                      title="Delete Return Log"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </HeroTable.Cell>
                </HeroTable.Row>
              ))
            )}
          </HeroTable.Body>
        </HeroTable>
      </div>
    </div>
  );
};
