import React from "react";
import { Calculator } from "lucide-react";
import { CalculatorModule } from "../../CalculatorModule";
import { Product } from "../../../types/db";
import { HeroModal } from "../../common/ui/HeroModal";
import { HeroButton } from "../../common/ui/HeroButton";

export interface PosTileCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
  onApplyProductQuantity: (product: Product, quantity: number) => void;
}

export const PosTileCalculatorModal: React.FC<PosTileCalculatorModalProps> = ({
  isOpen,
  onClose,
  darkMode,
  onApplyProductQuantity,
}) => {
  return (
    <HeroModal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
    >
      <div className="p-5 sm:p-6 space-y-4 font-sans text-xs text-foreground text-left flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center border-b border-divider/20 pb-3 shrink-0">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2 tracking-tight">
            <Calculator className="h-5 w-5 text-primary" />
            <span>Tile Coverage & Area Estimator Calculator</span>
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          <CalculatorModule
            darkMode={darkMode}
            onApply={(product, quantity) => {
              onApplyProductQuantity(product, quantity);
              onClose();
            }}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-divider/20 pt-4 shrink-0">
          <HeroButton
            type="button"
            variant="flat"
            size="md"
            radius="full"
            onClick={onClose}
          >
            Close Calculator
          </HeroButton>
        </div>
      </div>
    </HeroModal>
  );
};
