import React from 'react';
import { Barcode, X, Printer } from 'lucide-react';
import { Product } from '../../types/db';
import { StyledBarcode } from '../../utils/barcodeGenerator';

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

  return (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
      <div 
        className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm shadow-xl" 
        onClick={onClose} 
      />
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[32px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface text-center space-y-5">
        
        <div className="flex justify-between items-center border-b border-m3-outline-variant/15 pb-2.5 text-left">
          <h3 className="text-sm font-black text-m3-primary uppercase tracking-wide flex items-center gap-1.5">
            <Barcode className="h-5 w-5" /> Barcode Terminal Label
          </h3>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1 rounded-full"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Product specifications context summary */}
        <div className="text-left bg-m3-surface-lowest p-4 rounded-2xl border border-m3-outline-variant/15 space-y-3">
          <div>
            <div className="text-[9px] text-m3-primary/95 font-black uppercase tracking-wider">
              {product.category}
            </div>
            <strong className="text-sm text-m3-on-surface block font-extrabold leading-tight mt-0.5">
              {product.productName}
            </strong>
            <p className="text-[10px] text-zinc-400 mt-1">
              Brand: <span className="font-semibold text-zinc-350">{product.brand || 'TilePoint'}</span> • Design: <span className="font-semibold text-zinc-350">{product.designName || 'N/A'}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-m3-outline-variant/15 pt-2.5 text-[10px] font-mono text-zinc-350">
            <div 
              className="bg-m3-surface-low p-2 rounded-xl border border-m3-outline-variant/10 hover:border-m3-primary/50 transition-colors cursor-pointer group rel"
              onClick={() => {
                navigator.clipboard.writeText(product.sku);
                showToast(`SKU ${product.sku} copied to clipboard!`);
              }}
              title="Click to copy SKU"
            >
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-extrabold font-sans">Product SKU</span>
                <span className="text-[7.5px] text-m3-primary opacity-0 group-hover:opacity-100 transition-opacity font-bold font-sans">COPY</span>
              </div>
              <span className="font-bold text-m3-primary text-[11px] block truncate">{product.sku}</span>
            </div>

            <div className="bg-m3-surface-low p-2 rounded-xl border border-m3-outline-variant/10">
              <span className="block text-[8px] uppercase tracking-wider text-zinc-500 font-extrabold font-sans mb-0.5">Dimension (Size)</span>
              <span className="font-bold text-white text-[11px] block truncate">{product.size || 'N/A'}</span>
            </div>

            <div 
              className="bg-m3-surface-low p-2 rounded-xl border border-m3-outline-variant/10 hover:border-m3-primary/50 transition-colors cursor-pointer group rel"
              onClick={() => {
                navigator.clipboard.writeText(product.productCode);
                showToast(`Product Code ${product.productCode} copied to clipboard!`);
              }}
              title="Click to copy Product Code"
            >
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-extrabold font-sans">Product Code</span>
                <span className="text-[7.5px] text-m3-primary opacity-0 group-hover:opacity-100 transition-opacity font-bold font-sans">COPY</span>
              </div>
              <span className="font-bold text-white text-[11px] block truncate">{product.productCode}</span>
            </div>

            <div className="bg-m3-surface-low p-2 rounded-xl border border-m3-outline-variant/10">
              <span className="block text-[8px] uppercase tracking-wider text-zinc-500 font-extrabold font-sans mb-0.5">
                {isTile ? 'Box Quantity' : 'Packaging Factor'}
              </span>
              <span className="font-bold text-white text-[11px] block truncate">
                {isTile ? `${product.boxQuantity || 1} Tiles / Box` : `${product.boxQuantity || 1} ${unit}`}
              </span>
            </div>
          </div>
        </div>

        {/* Visual barcode layout */}
        <div className="flex flex-col items-center justify-center space-y-1.5 py-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1">
            <Barcode className="h-3.5 w-3.5 text-m3-primary" /> Barcode label
          </span>
          <StyledBarcode code={product.barcode} />
        </div>

        {/* Print action buttons */}
        <div className="flex flex-col gap-2 pt-2.5">
          <button
            type="button"
            onClick={onSimulatePrint}
            disabled={printingCode}
            className="w-full flex items-center justify-center gap-2 py-3 border border-zinc-200/20 dark:border-zinc-700/50 hover:bg-m3-primary hover:text-white bg-m3-surface-lowest rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
          >
            <Printer className="h-4 w-4 shrink-0" />
            <span>{printingCode ? 'Smart Spooling...' : 'Print Scannable Label'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(product.barcode);
              showToast(`Barcode ${product.barcode} copied to clipboard!`);
            }}
            className="w-full text-center text-[10px] font-black uppercase tracking-wider py-2 bg-m3-surface-lowest hover:bg-m3-outline-variant/10 text-m3-primary rounded-xl transition-all border border-m3-outline-variant/10 cursor-pointer"
          >
            Copy Barcode Raw
          </button>

          <div className="text-[9px] text-zinc-500 font-medium leading-normal bg-m3-surface-lowest p-2 rounded-xl border border-m3-outline-variant/10 mt-1">
            Compatible with Zebra, Brother, & standard web spoolers.
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full text-center text-xs font-bold py-1.5 hover:bg-m3-outline-variant/15 text-m3-on-surface-variant rounded-xl transition-all mt-1 cursor-pointer"
          >
            Close View
          </button>
        </div>

      </div>
    </div>
  );
});

BarcodeModal.displayName = 'BarcodeModal';
