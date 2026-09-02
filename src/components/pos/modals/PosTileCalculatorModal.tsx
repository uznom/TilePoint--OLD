import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Calculator, X } from "lucide-react";
import { CalculatorModule } from "../../CalculatorModule";
import { Product } from "../../../types/db";

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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 font-sans text-foreground">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 flex flex-col"
          >
            <div className="flex justify-between items-center border-b border-divider/20 pb-3.5 mb-4 shrink-0 text-left">
              <h3 className="text-base font-black text-primary flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                <span>Tile Coverage & Area Estimator Calculator</span>
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-default-500 hover:text-foreground cursor-pointer p-1.5 rounded-full hover:bg-primary/10 transition-colors active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
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

            <div className="flex justify-end gap-2 border-t border-divider/20 pt-4 mt-4 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-black uppercase tracking-wider rounded-full shadow-sm cursor-pointer transition-colors active:scale-95"
              >
                Close Calculator
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
