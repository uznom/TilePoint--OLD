import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { Product } from "../../../types/db";
import { formatCurrency } from "../../../utils/formatters";
import { HeroDropdownSelect } from "../../common/ui/HeroDropdown";

export interface PosCartItem {
  product: Product;
  quantity: number;
  overridePrice?: number;
  discount?: number;
}

export interface PosDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: PosCartItem[];
  getBranchPrice: (prod: any) => number;
  selectedDiscountItemIndex: number | null;
  setSelectedDiscountItemIndex: (idx: number | null) => void;
  discountType: string;
  discountInput: string;
  setDiscountInput: (val: string) => void;
  discountSchemes?: any[];
  applyCustomDiscount: (type: any, inputVal?: string) => void;
}

export const PosDiscountModal: React.FC<PosDiscountModalProps> = ({
  isOpen,
  onClose,
  cart,
  getBranchPrice,
  selectedDiscountItemIndex,
  setSelectedDiscountItemIndex,
  discountType,
  discountInput,
  setDiscountInput,
  discountSchemes,
  applyCustomDiscount,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 font-sans text-xs">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-gray-950/65 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground space-y-4 text-left"
          >
            <h3 className="text-base font-extrabold text-primary flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span>Select Item Discount & Exemptions</span>
            </h3>

            <div className="bg-background p-3.5 rounded-2xl border border-divider/20 space-y-1.5">
              <label className="text-xs font-bold text-primary uppercase tracking-wider block">
                Target Item for Discount
              </label>
              <HeroDropdownSelect
                items={[
                  { key: 'ALL', label: `Apply to ALL Items in Cart (${cart.length} item${cart.length === 1 ? '' : 's'})` },
                  ...cart.map((it, i) => {
                    const baseP = getBranchPrice(it.product);
                    const p = it.overridePrice !== undefined ? it.overridePrice : baseP;
                    return {
                      key: String(i),
                      label: `Item #${i + 1}: ${it.product.productName} (${formatCurrency(p)}/unit x ${it.quantity})`,
                    };
                  }),
                ]}
                selectedKey={selectedDiscountItemIndex === null ? 'ALL' : String(selectedDiscountItemIndex)}
                onSelectionChange={(val) => {
                  setSelectedDiscountItemIndex(val === 'ALL' ? null : parseInt(String(val), 10));
                }}
                size="sm"
                variant="pill"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => applyCustomDiscount("NONE")}
                className={`p-3.5 rounded-2xl border text-left transition-colors cursor-pointer flex flex-col justify-between ${
                  discountType === "NONE"
                    ? "border-primary bg-primary/10"
                    : "border-divider/20 bg-background hover:bg-default-100"
                }`}
              >
                <div className="font-bold text-sm">No Discount</div>
                <div className="text-xs text-default-500 mt-1 font-medium">
                  Standard cashier list pricing applies.
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyCustomDiscount("SENIOR")}
                className={`p-3.5 rounded-2xl border text-left transition-colors cursor-pointer flex flex-col justify-between ${
                  discountType === "SENIOR"
                    ? "border-primary bg-primary/10"
                    : "border-divider/20 bg-background hover:bg-default-100"
                }`}
              >
                <div className="font-bold text-sm text-primary flex items-center gap-1">
                  Senior Citizen
                </div>
                <div className="text-xs text-default-500 mt-1 font-medium">
                  20% Off base + 12% VAT exemption (Philippine RA 9994).
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyCustomDiscount("PWD")}
                className={`p-3.5 rounded-2xl border text-left transition-colors cursor-pointer flex flex-col justify-between ${
                  discountType === "PWD"
                    ? "border-primary bg-primary/10"
                    : "border-divider/20 bg-background hover:bg-default-100"
                }`}
              >
                <div className="font-bold text-sm text-primary flex items-center gap-1">
                  PWD Resident
                </div>
                <div className="text-xs text-default-500 mt-1 font-medium">
                  20% Off base + 12% VAT exemption (Philippine RA 10754).
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyCustomDiscount("CONTRACT")}
                className={`p-3.5 rounded-2xl border text-left transition-colors cursor-pointer flex flex-col justify-between ${
                  discountType === "CONTRACT"
                    ? "border-primary bg-primary/10"
                    : "border-divider/20 bg-background hover:bg-default-100"
                }`}
              >
                <div className="font-bold text-sm text-primary">
                  Contractor Alliance
                </div>
                <div className="text-xs text-default-500 mt-1 font-medium">
                  Flat 10% Trade Allied partner discount.
                </div>
              </button>

              {discountSchemes &&
                discountSchemes
                  .filter((d) => d.isActive !== false && d.id !== "disc-senior" && d.id !== "disc-pwd" && d.id !== "disc-contract")
                  .map((scheme) => (
                    <button
                      key={scheme.id}
                      type="button"
                      onClick={() => {
                        if (scheme.discountType === "percentage") {
                          applyCustomDiscount("PERCENT", String(scheme.ratePercent || 0));
                        } else {
                          applyCustomDiscount("FLAT", String(scheme.flatAmount || 0));
                        }
                      }}
                      className="p-3.5 rounded-2xl border text-left transition-colors cursor-pointer flex flex-col justify-between border-divider/20 bg-background hover:bg-default-100"
                    >
                      <div className="font-bold text-sm text-primary flex items-center justify-between">
                        <span>{scheme.name}</span>
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-black">
                          {scheme.discountType === "percentage" ? `${scheme.ratePercent}% OFF` : `₱${scheme.flatAmount} OFF`}
                        </span>
                      </div>
                      <div className="text-xs text-default-500 mt-1 font-medium">
                        {scheme.description || `${scheme.name} promotional pricing rule.`}
                      </div>
                    </button>
                  ))}
            </div>

            <div className="border-t border-divider/20 pt-4 space-y-4">
              <h4 className="text-xs font-extrabold text-primary uppercase tracking-wider pl-1 font-sans">
                Or Apply Custom Values (Flat / Rate)
              </h4>

              <div className="flex gap-3">
                <div className="flex-1 relative pl-0">
                  <label className="text-xs font-bold tracking-wider text-default-500 mb-1 block pl-1">
                    Discount Amount/Value
                  </label>
                  <input
                    type="number"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    placeholder={discountType === "PERCENT" ? "e.g. 15 for 15%" : "e.g. 100 for ₱100"}
                    className="w-full bg-background border-b-2 border-divider px-3.5 py-2.5 text-sm font-bold text-foreground focus:outline-none focus:border-primary rounded-lg transition-colors"
                  />
                </div>

                <div className="flex flex-col justify-end gap-1.5 shrink-0">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => applyCustomDiscount("FLAT", discountInput)}
                      className="px-4 py-2.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                    >
                      Apply Flat (₱)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyCustomDiscount("PERCENT", discountInput)}
                      className="px-4 py-2.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                    >
                      Apply Percent (%)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-divider/20 pt-4 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-default-100 text-default-500 transition-colors text-center"
              >
                Close Panel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
