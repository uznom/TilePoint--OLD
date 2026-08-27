import React from 'react';
import { createPortal } from 'react-dom';
import { Barcode, X, Printer } from 'lucide-react';
import { Product } from '../../types/db';
import { StyledBarcode } from '../../utils/barcodeGenerator';
import { HeroTooltip } from '../common/ui/HeroTooltip';
import { HeroButton } from '../common/ui/HeroButton';

interface BarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSimulatePrint: () => void;
  printingCode: boolean;
  showToast: (msg: string) => void;
}

export const BarcodeModal: React.FC<BarcodeModalProps> = React.memo(({
  isOpen,
  onClose,
  product,
  onSimulatePrint,
  printingCode,
  showToast,
}) => {
  if (!isOpen || !product) return null;

  const isTile = (product.category || '').toLowerCase().includes('tile');
  const unit = product.unit || 'pcs';

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
      {/* Full-Screen Uniform Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md" 
        onClick={onClose} 
      />
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-large border border-divider p-6 z-20 shadow-2xl bg-content1 text-foreground text-center space-y-5">
        
        <div className="flex justify-between items-center border-b border-divider pb-3 text-left">
          <h3 className="text-sm font-black text-primary uppercase tracking-wide flex items-center gap-2">
            <Barcode className="h-5 w-5 text-primary" /> Barcode Terminal Label
          </h3>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-default-400 hover:text-foreground cursor-pointer p-1 rounded-medium hover:bg-default-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Product specifications context summary */}
        <div className="text-left bg-content2 p-4 rounded-medium border border-divider space-y-3">
          <div>
            <div className="text-[9px] text-primary font-black uppercase tracking-wider">
              {product.category}
            </div>
            <strong className="text-sm text-foreground block font-extrabold leading-tight mt-0.5">
              {product.productName}
            </strong>
            <p className="text-[10px] text-default-500 mt-1">
              Brand: <span className="font-semibold text-default-700 dark:text-default-300">{product.brand || 'TilePoint'}</span> • Design: <span className="font-semibold text-default-700 dark:text-default-300">{product.designName || 'N/A'}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-divider pt-2.5 text-[10px] text-default-600">
            <HeroTooltip content="Click to copy SKU to clipboard" placement="top">
              <div 
                className="bg-content1 p-2 rounded-medium border border-divider hover:border-primary/50 transition-colors cursor-pointer group select-none"
                onClick={() => {
                  navigator.clipboard.writeText(product.sku);
                  showToast(`SKU ${product.sku} copied to clipboard!`);
                }}
              >
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[8px] uppercase tracking-wider text-default-400 font-extrabold font-sans">Product SKU</span>
                  <span className="text-[7.5px] text-primary opacity-0 group-hover:opacity-100 transition-opacity font-bold font-sans">COPY</span>
                </div>
                <span className="font-bold text-primary text-[11px] block truncate">{product.sku}</span>
              </div>
            </HeroTooltip>

            <div className="bg-content1 p-2 rounded-medium border border-divider">
              <span className="block text-[8px] uppercase tracking-wider text-default-400 font-extrabold font-sans mb-0.5">Dimension (Size)</span>
              <span className="font-bold text-foreground text-[11px] block truncate">{product.size || 'N/A'}</span>
            </div>

            <HeroTooltip content="Click to copy Product Code to clipboard" placement="top">
              <div 
                className="bg-content1 p-2 rounded-medium border border-divider hover:border-primary/50 transition-colors cursor-pointer group select-none"
                onClick={() => {
                  navigator.clipboard.writeText(product.productCode);
                  showToast(`Product Code ${product.productCode} copied to clipboard!`);
                }}
              >
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[8px] uppercase tracking-wider text-default-400 font-extrabold font-sans">Product Code</span>
                  <span className="text-[7.5px] text-primary opacity-0 group-hover:opacity-100 transition-opacity font-bold font-sans">COPY</span>
                </div>
                <span className="font-bold text-foreground text-[11px] block truncate">{product.productCode}</span>
              </div>
            </HeroTooltip>

            <div className="bg-content1 p-2 rounded-medium border border-divider">
              <span className="block text-[8px] uppercase tracking-wider text-default-400 font-extrabold font-sans mb-0.5">
                {isTile ? 'Box Quantity' : 'Packaging Factor'}
              </span>
              <span className="font-bold text-foreground text-[11px] block truncate">
                {isTile ? `${product.boxQuantity || 1} Tiles / Box` : `${product.boxQuantity || 1} ${unit}`}
              </span>
            </div>
          </div>
        </div>

        {/* Visual barcode layout */}
        <div className="flex flex-col items-center justify-center space-y-1.5 py-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-default-500 flex items-center gap-1">
            <Barcode className="h-3.5 w-3.5 text-primary" /> Barcode label
          </span>
          <StyledBarcode code={product.barcode} />
        </div>

        {/* Print action buttons */}
        <div className="flex flex-col gap-2 pt-2.5">
          <HeroButton
            type="button"
            onClick={onSimulatePrint}
            isLoading={printingCode}
            color="primary"
            variant="solid"
            startIcon={!printingCode ? <Printer className="h-4 w-4 shrink-0" /> : undefined}
            className="w-full text-xs font-black uppercase tracking-wider"
          >
            {printingCode ? 'Smart Spooling...' : 'Print Scannable Label'}
          </HeroButton>

          <HeroButton
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(product.barcode);
              showToast(`Barcode ${product.barcode} copied to clipboard!`);
            }}
            variant="bordered"
            color="default"
            size="sm"
            className="w-full text-[10px] font-black uppercase tracking-wider"
          >
            Copy Barcode Raw
          </HeroButton>

          <div className="text-[9px] text-default-500 font-medium leading-normal bg-content2 p-2 rounded-medium border border-divider mt-1">
            Compatible with Zebra, Brother, & standard web spoolers.
          </div>

          <HeroButton
            type="button"
            onClick={onClose}
            variant="light"
            size="sm"
            className="w-full text-xs font-bold text-default-600 hover:text-foreground mt-1"
          >
            Close View
          </HeroButton>
        </div>

      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
});

BarcodeModal.displayName = 'BarcodeModal';
