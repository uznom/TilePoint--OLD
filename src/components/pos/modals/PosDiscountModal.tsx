import React from "react";
import { Sparkles } from "lucide-react";
import { Product } from "../../../types/db";
import { formatCurrency } from "../../../utils/formatters";
import { HeroModal } from "../../common/ui/HeroModal";
import { HeroInput } from "../../common/ui/HeroInput";
import { HeroButton } from "../../common/ui/HeroButton";
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
  const isSeniorEnabled =
    !discountSchemes ||
    discountSchemes.find(
      (d) => d.code === "SENIOR" || d.id === "disc_senior" || d.id === "disc-senior"
    )?.isEnabled !== false;
  const isPwdEnabled =
    !discountSchemes ||
    discountSchemes.find(
      (d) => d.code === "PWD" || d.id === "disc_pwd" || d.id === "disc-pwd"
    )?.isEnabled !== false;
  const isContractEnabled =
    !discountSchemes ||
    discountSchemes.find(
      (d) => d.code === "CONTRACT" || d.id === "disc_contract" || d.id === "disc-contract"
    )?.isEnabled !== false;

  return (
    <HeroModal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
    >
      <div className="p-5 sm:p-6 space-y-4 font-sans text-xs text-foreground text-left">
        <div className="flex items-center justify-between border-b border-divider/20 pb-3">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2 tracking-tight">
            <Sparkles className="h-5 w-5 text-primary" />
            <span>Select Item Discount & Exemptions</span>
          </h3>
        </div>

        <div className="bg-zinc-100/90 dark:bg-zinc-900/80 p-3.5 rounded-2xl border border-zinc-200/60 dark:border-white/5 space-y-1.5 shadow-2xs">
          <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
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
            onSelectionChange={(key) => {
              if (key === 'ALL') {
                setSelectedDiscountItemIndex(null);
              } else {
                setSelectedDiscountItemIndex(Number(key));
              }
            }}
            placeholder="Choose target item"
            color="primary"
            variant="flat"
            size="sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => applyCustomDiscount("NONE")}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between active:scale-[0.98] ${
              discountType === "NONE"
                ? "border-primary bg-primary/10 shadow-2xs ring-1 ring-primary/20"
                : "border-zinc-200/70 dark:border-white/10 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 shadow-2xs"
            }`}
          >
            <div className="font-bold text-sm text-foreground">No Discount</div>
            <div className="text-xs text-default-500 mt-1 font-medium">
              Standard cashier list pricing applies.
            </div>
          </button>

          {isSeniorEnabled && (
            <button
              type="button"
              onClick={() => applyCustomDiscount("SENIOR")}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between active:scale-[0.98] ${
                discountType === "SENIOR"
                  ? "border-primary bg-primary/10 shadow-2xs ring-1 ring-primary/20"
                  : "border-zinc-200/70 dark:border-white/10 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 shadow-2xs"
              }`}
            >
              <div className="font-bold text-sm text-primary flex items-center gap-1">
                Senior Citizen
              </div>
              <div className="text-xs text-default-500 mt-1 font-medium">
                20% Off base + 12% VAT exemption (Philippine RA 9994).
              </div>
            </button>
          )}

          {isPwdEnabled && (
            <button
              type="button"
              onClick={() => applyCustomDiscount("PWD")}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between active:scale-[0.98] ${
                discountType === "PWD"
                  ? "border-primary bg-primary/10 shadow-2xs ring-1 ring-primary/20"
                  : "border-zinc-200/70 dark:border-white/10 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 shadow-2xs"
              }`}
            >
              <div className="font-bold text-sm text-primary flex items-center gap-1">
                PWD Resident
              </div>
              <div className="text-xs text-default-500 mt-1 font-medium">
                20% Off base + 12% VAT exemption (Philippine RA 10754).
              </div>
            </button>
          )}

          {isContractEnabled && (
            <button
              type="button"
              onClick={() => applyCustomDiscount("CONTRACT")}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between active:scale-[0.98] ${
                discountType === "CONTRACT"
                  ? "border-primary bg-primary/10 shadow-2xs ring-1 ring-primary/20"
                  : "border-zinc-200/70 dark:border-white/10 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 shadow-2xs"
              }`}
            >
              <div className="font-bold text-sm text-primary">
                Contractor Alliance
              </div>
              <div className="text-xs text-default-500 mt-1 font-medium">
                Flat 10% Trade Allied partner discount.
              </div>
            </button>
          )}

          {discountSchemes &&
            discountSchemes
              .filter(
                (d) =>
                  d.isEnabled !== false &&
                  d.isActive !== false &&
                  d.code !== "SENIOR" &&
                  d.code !== "PWD" &&
                  d.code !== "CONTRACT" &&
                  d.id !== "disc-senior" &&
                  d.id !== "disc-pwd" &&
                  d.id !== "disc-contract" &&
                  d.id !== "disc_senior" &&
                  d.id !== "disc_pwd" &&
                  d.id !== "disc_contract"
              )
              .map((scheme) => {
                const isPercent =
                  scheme.discountType === "percentage" || scheme.type === "PERCENT";
                const discountDisplay = isPercent
                  ? `${scheme.ratePercent || scheme.value || 0}% OFF`
                  : `₱${scheme.flatAmount || scheme.value || 0} OFF`;
                return (
                  <button
                    key={scheme.id}
                    type="button"
                    onClick={() => {
                      if (isPercent) {
                        applyCustomDiscount(
                          "PERCENT",
                          String(scheme.ratePercent || scheme.value || 0)
                        );
                      } else {
                        applyCustomDiscount(
                          "FLAT",
                          String(scheme.flatAmount || scheme.value || 0)
                        );
                      }
                    }}
                    className="p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between border-zinc-200/70 dark:border-white/10 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 shadow-2xs active:scale-[0.98]"
                  >
                    <div className="font-bold text-sm text-primary flex items-center justify-between">
                      <span>{scheme.name}</span>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                        {discountDisplay}
                      </span>
                    </div>
                    <div className="text-xs text-default-500 mt-1 font-medium">
                      {scheme.description || `${scheme.name} promotional pricing rule.`}
                    </div>
                  </button>
                );
              })}
        </div>

        <div className="border-t border-divider/20 pt-4 space-y-3">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider pl-1 font-sans">
            Or Apply Custom Values (Flat / Rate)
          </h4>

          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <HeroInput
                label="Discount Amount / Value"
                type="number"
                size="lg"
                value={discountInput}
                onValueChange={(val) => setDiscountInput(val)}
                placeholder={discountType === "PERCENT" ? "e.g. 15 for 15%" : "e.g. 100 for ₱100"}
                radius="lg"
                variant="flat"
                startContent={<span className="text-lg font-black text-default-400 font-mono select-none">₱ / %</span>}
                classNames={{
                  input: "text-xl font-black font-mono tracking-tight",
                  inputWrapper: "h-14 shadow-inner border border-divider/40",
                }}
              />
            </div>

            <div className="flex gap-2 shrink-0">
              <HeroButton
                type="button"
                variant="flat"
                color="primary"
                size="md"
                radius="lg"
                onClick={() => applyCustomDiscount("FLAT", discountInput)}
                className="font-bold"
              >
                Apply Flat (₱)
              </HeroButton>
              <HeroButton
                type="button"
                variant="flat"
                color="primary"
                size="md"
                radius="lg"
                onClick={() => applyCustomDiscount("PERCENT", discountInput)}
                className="font-bold"
              >
                Apply Percent (%)
              </HeroButton>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-divider/20 pt-4">
          <HeroButton
            type="button"
            variant="flat"
            size="sm"
            radius="full"
            onClick={onClose}
          >
            Close Panel
          </HeroButton>
        </div>
      </div>
    </HeroModal>
  );
};
