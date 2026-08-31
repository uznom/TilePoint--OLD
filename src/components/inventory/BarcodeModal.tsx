import { Barcode, Printer } from 'lucide-react';
import React from 'react';
import { Product } from '../../types/db';
import { StyledBarcode } from '../../utils/barcodeGenerator';
import { HeroButton } from '../common/ui/HeroButton';
import { HeroModal } from '../common/ui/HeroModal';
import { HeroTooltip } from '../common/ui/HeroTooltip';

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
    <HeroModal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
    >
      <HeroModal.Header className="pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
            <Barcode className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-foreground uppercase tracking-wider">
              Barcode Terminal Label
            </h3>
            <p className="text-[10.5px] text-default-500 font-medium">Scannable SKU & EAN-13 generator</p>
          </div>
        </div>
      </HeroModal.Header>

      <HeroModal.Body className="py-4 space-y-4 text-left">
        {/* Product specifications context summary */}
        <div className="bg-content2/50 p-4 rounded-2xl border border-divider/30 space-y-3">
          <div>
            <div className="text-[9px] text-primary font-black uppercase tracking-wider">
              {product.category}
            </div>
            <strong className="text-sm text-foreground block font-extrabold leading-tight mt-0.5">
              {product.productName}
            </strong>
            <p className="text-[10.5px] text-default-500 mt-1 font-medium">
              Brand: <span className="font-semibold text-foreground">{product.brand || 'TilePoint'}</span> • Design: <span className="font-semibold text-foreground">{product.designName || 'N/A'}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-divider/20 pt-2.5 text-[10px] text-default-500">
            <HeroTooltip content="Click to copy SKU to clipboard" placement="top">
              <div 
                className="bg-content1 p-2 rounded-xl border border-divider/40 hover:border-primary/50 transition-colors cursor-pointer group select-none"
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

            <div className="bg-content1 p-2 rounded-xl border border-divider/40">
              <span className="block text-[8px] uppercase tracking-wider text-default-400 font-extrabold font-sans mb-0.5">Dimension (Size)</span>
              <span className="font-bold text-foreground text-[11px] block truncate">{product.size || 'N/A'}</span>
            </div>

            <HeroTooltip content="Click to copy Product Code to clipboard" placement="top">
              <div 
                className="bg-content1 p-2 rounded-xl border border-divider/40 hover:border-primary/50 transition-colors cursor-pointer group select-none"
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

            <div className="bg-content1 p-2 rounded-xl border border-divider/40">
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
        <div className="flex flex-col items-center justify-center space-y-2 py-2 bg-content1 rounded-2xl border border-divider/20 p-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-default-500 flex items-center gap-1.5">
            <Barcode className="h-3.5 w-3.5 text-primary" /> Barcode Scannable Preview
          </span>
          <StyledBarcode code={product.barcode} />
        </div>

        <div className="text-[10px] text-default-500 font-medium text-center leading-normal bg-content2/40 p-2.5 rounded-xl border border-divider/20">
          Compatible with Zebra, Brother, TSC, and standard thermal barcode printers.
        </div>
      </HeroModal.Body>

      <HeroModal.Footer className="justify-between gap-2 pt-3 pb-4">
        <HeroButton
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(product.barcode);
            showToast(`Barcode ${product.barcode} copied to clipboard!`);
          }}
          variant="flat"
          color="default"
          size="sm"
          className="font-bold text-xs"
        >
          Copy Barcode Raw
        </HeroButton>

        <div className="flex items-center gap-2">
          <HeroButton
            type="button"
            onClick={onClose}
            variant="flat"
            size="sm"
            className="font-bold text-xs"
          >
            Close
          </HeroButton>
          <HeroButton
            type="button"
            onClick={onSimulatePrint}
            isLoading={printingCode}
            color="primary"
            variant="solid"
            size="sm"
            startIcon={!printingCode ? <Printer className="h-4 w-4 shrink-0" /> : undefined}
            className="text-xs font-black uppercase tracking-wider"
          >
            {printingCode ? 'Spooling...' : 'Print Scannable Label'}
          </HeroButton>
        </div>
      </HeroModal.Footer>
    </HeroModal>
  );
});

BarcodeModal.displayName = 'BarcodeModal';

export default BarcodeModal;
