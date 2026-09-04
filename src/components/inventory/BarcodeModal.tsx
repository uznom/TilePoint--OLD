import { Barcode, Building2, Copy, Hash, Layers, Printer, QrCode } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { Product } from '../../types/db';
import { StyledBarcode, StyledQrCode } from '../../utils/barcodeGenerator';
import { HeroButton } from '../common/ui/HeroButton';
import { HeroModal } from '../common/ui/HeroModal';

export type PaperSize =
  | '1x2.625'   // 1" x 2⅝" Standard Address Label (Continuous Roll / Avery 5160)
  | 'letter-30' // US Letter Sheet - 30 Labels/Sheet (Avery 5160 template, 3 cols × 10 rows)
  | 'a4-24'     // A4 Sheet - 24 Labels/Sheet (3 cols × 8 rows)
  | '50x30'     // 50mm × 30mm Shelf Tag
  | '100x60'    // 100mm × 60mm Box / Crate Master
  | '40x25';    // 40mm × 25mm Compact Tag

export interface PrintLabelOptions {
  paperSize: PaperSize;
  quantity: number;
  establishmentName: string;
  layoutStyle: 'retail-yellow' | 'classic-shelf';
}

interface BarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  establishmentName?: string;
  onSimulatePrint: (options: PrintLabelOptions) => void;
  printingCode: boolean;
  showToast: (msg: string) => void;
}

export const BarcodeModal: React.FC<BarcodeModalProps> = React.memo(({
  isOpen,
  onClose,
  product,
  establishmentName = '',
  onSimulatePrint,
  printingCode,
  showToast,
}) => {
  const [selectedPaperSize, setSelectedPaperSize] = useState<PaperSize>('1x2.625');
  const [quantity, setQuantity] = useState<number>(1);
  const [storeName, setStoreName] = useState<string>('');
  const [layoutStyle, setLayoutStyle] = useState<'retail-yellow' | 'classic-shelf'>('retail-yellow');

  useEffect(() => {
    if (isOpen) {
      const defaultName = establishmentName || localStorage.getItem('tilepoint_company_name_v1') || 'MAIN DEPOT & SHOWROOM';
      setStoreName(defaultName);
      setQuantity(1);
    }
  }, [isOpen, establishmentName]);

  // Adjust default quantity when selecting a sheet format
  const handleSelectPaperSize = (size: PaperSize) => {
    setSelectedPaperSize(size);
    if (size === 'letter-30' && quantity < 30) {
      setQuantity(30);
    } else if (size === 'a4-24' && quantity < 24) {
      setQuantity(24);
    }
  };

  const sheetsRequired = useMemo(() => {
    if (selectedPaperSize === 'letter-30') return Math.ceil(quantity / 30);
    if (selectedPaperSize === 'a4-24') return Math.ceil(quantity / 24);
    return quantity;
  }, [selectedPaperSize, quantity]);

  if (!isOpen || !product) return null;

  const isTile = (product.category || '').toLowerCase().includes('tile');
  const unit = product.unit || 'pcs';
  const dimLabel = isTile ? 'Dim' : 'Spec';
  const dimVal = product.size || (isTile ? 'N/A' : 'Standard');
  const qtyVal = isTile
    ? `${product.boxQuantity || 1} pcs/box`
    : `${product.boxQuantity || 1} ${unit}`;

  return (
    <HeroModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
    >
      <HeroModal.Header className="pb-3.5 border-b border-divider/20">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
            <Barcode className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-foreground uppercase tracking-wider">
              Retail Price Tag & Barcode Printer
            </h3>
            <p className="text-[10.5px] text-default-500 font-medium">
              Dynamic multi-size labels with QR code, Code 128 & establishment branding
            </p>
          </div>
        </div>
      </HeroModal.Header>

      <HeroModal.Body className="py-4 space-y-4 text-left font-sans">
        {/* Establishment Name & Layout Style Config */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3.5 bg-content2/40 border border-divider/30 rounded-2xl">
          <div className="sm:col-span-7 space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-default-600 flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              Establishment / Store Header Name:
            </label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="e.g. City Tile & Bath Center"
              className="w-full bg-content1 border border-divider/50 focus:border-primary px-3 py-1.5 text-xs text-foreground font-bold rounded-xl focus:outline-none transition-colors"
            />
            <span className="text-[9px] text-default-500 block leading-tight">
              Printed at the top of each label instead of software name
            </span>
          </div>

          <div className="sm:col-span-5 space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-default-600 block">
              Label Theme Style:
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setLayoutStyle('retail-yellow')}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer ${
                  layoutStyle === 'retail-yellow'
                    ? 'border-amber-400 bg-amber-400/15 text-amber-600 dark:text-amber-400 shadow-2xs'
                    : 'border-divider/40 bg-content1 text-default-500 hover:bg-content2'
                }`}
              >
                Retail Yellow
              </button>
              <button
                type="button"
                onClick={() => setLayoutStyle('classic-shelf')}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer ${
                  layoutStyle === 'classic-shelf'
                    ? 'border-primary bg-primary/10 text-primary shadow-2xs'
                    : 'border-divider/40 bg-content1 text-default-500 hover:bg-content2'
                }`}
              >
                Classic Mono
              </button>
            </div>
            <span className="text-[9px] text-default-500 block leading-tight">
              {layoutStyle === 'retail-yellow' ? 'Eye-catching yellow price badge' : 'Standard clean black & white'}
            </span>
          </div>
        </div>

        {/* Paper Size Selector (Supports Single Roll, Avery 5160 Sheet, A4, Shelf Tag) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-default-600 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" />
              Target Paper Size:
            </span>
            <span className="text-[9.5px] font-mono text-primary font-bold">
              {selectedPaperSize === '1x2.625' && '1" × 2⅝" Continuous Thermal Roll'}
              {selectedPaperSize === 'letter-30' && 'Letter Sheet (30 labels/page • Avery 5160)'}
              {selectedPaperSize === 'a4-24' && 'A4 Sheet (24 labels/page • 3×8 grid)'}
              {selectedPaperSize === '50x30' && '50mm × 30mm Shelf Edge Tag'}
              {selectedPaperSize === '100x60' && '100mm × 60mm Box / Crate Master'}
              {selectedPaperSize === '40x25' && '40mm × 25mm Mini Product Tag'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: '1x2.625' as PaperSize, label: '1" × 2⅝"', sub: 'Single Roll / Avery', type: 'Roll' },
              { id: 'letter-30' as PaperSize, label: 'Letter (30-up)', sub: 'Avery 5160 Sheets', type: 'Sheet' },
              { id: 'a4-24' as PaperSize, label: 'A4 (24-up)', sub: '3×8 Standard Grid', type: 'Sheet' },
              { id: '50x30' as PaperSize, label: '50 × 30mm', sub: 'Retail Shelf Tag', type: 'Roll' },
              { id: '100x60' as PaperSize, label: '100 × 60mm', sub: 'Box / Crate Master', type: 'Roll' },
              { id: '40x25' as PaperSize, label: '40 × 25mm', sub: 'Compact Tag', type: 'Roll' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPaperSize(p.id)}
                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                  selectedPaperSize === p.id
                    ? 'border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary'
                    : 'border-divider/40 bg-content1 hover:bg-content2 text-default-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black">{p.label}</span>
                  <span className={`text-[8px] font-bold uppercase px-1 rounded ${
                    p.type === 'Sheet' ? 'bg-secondary/15 text-secondary' : 'bg-primary/15 text-primary'
                  }`}>
                    {p.type}
                  </span>
                </div>
                <span className="block text-[8.5px] opacity-75 mt-0.5">{p.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* How Many Labels (Quantity Selector) */}
        <div className="p-3 bg-content2/30 border border-divider/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-default-600 flex items-center gap-1">
              <Hash className="h-3.5 w-3.5 text-primary" />
              How Many Labels to Print?
            </span>
            <span className="text-[10px] text-default-500 font-medium block">
              {selectedPaperSize.startsWith('letter')
                ? `${quantity} labels = ${sheetsRequired} Letter sheet${sheetsRequired === 1 ? '' : 's'} (30/sheet)`
                : selectedPaperSize.startsWith('a4')
                ? `${quantity} labels = ${sheetsRequired} A4 sheet${sheetsRequired === 1 ? '' : 's'} (24/sheet)`
                : `${quantity} thermal sticker${quantity === 1 ? '' : 's'} on continuous roll`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-content1 p-1 rounded-xl border border-divider/50">
              {[1, 5, 10, 30, 60].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setQuantity(num)}
                  className={`px-2 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    quantity === num
                      ? 'bg-primary text-white shadow-2xs'
                      : 'text-default-600 hover:bg-content2'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={600}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-16 bg-content1 border border-divider/60 focus:border-primary px-2 py-1.5 text-xs text-center text-foreground font-mono font-bold rounded-xl focus:outline-none"
              />
              <span className="text-xs text-default-500 font-medium">pcs</span>
            </div>
          </div>
        </div>

        {/* 1:1 Live Physical Label Mockup (Inspired by Retail Price Tag designs) */}
        <div className="bg-content1 rounded-2xl border border-divider/40 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-default-500 flex items-center gap-1.5">
              <QrCode className="h-3.5 w-3.5 text-amber-500" />
              Live Retail Label Mockup ({selectedPaperSize})
            </span>
            <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              High Contrast Barcode & QR Active
            </span>
          </div>

          {/* Actual white sticker card with clean typography and high-visibility yellow price badge */}
          <div className="w-full max-w-md mx-auto bg-white text-black p-3.5 rounded-2xl border-2 border-black/80 shadow-md font-sans select-none flex flex-col justify-between space-y-2">
            {/* Header with Establishment Name */}
            <div className="flex justify-between items-start border-b border-black/80 pb-1.5">
              <div>
                <span className="text-[11px] font-black tracking-wider uppercase block text-black leading-tight">
                  {storeName || 'ESTABLISHMENT NAME'}
                </span>
                <span className="text-[8px] text-zinc-600 font-bold uppercase">
                  Brand: {product.brand || 'Store Exclusive'}
                </span>
              </div>
              <span className="bg-black text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-md leading-none">
                {product.category || 'RETAIL'}
              </span>
            </div>

            {/* Product Title and Specs */}
            <div>
              <div className="text-[13px] font-black text-black leading-snug truncate">
                {product.productName}
              </div>
              <div className="text-[9px] text-zinc-700 font-semibold truncate flex items-center gap-2 mt-0.5">
                <span>SKU: <strong className="text-black">{product.sku}</strong></span>
                <span>•</span>
                <span>{dimLabel}: <strong className="text-black">{dimVal}</strong></span>
                <span>•</span>
                <span>Pack: <strong className="text-black">{qtyVal}</strong></span>
              </div>
            </div>

            {/* Middle / Bottom: Yellow Retail Price Badge + QR Code & Barcode */}
            <div className="flex items-stretch justify-between gap-3 pt-1 border-t border-dashed border-zinc-300">
              {/* QR Code and Barcode Section */}
              <div className="flex-1 flex flex-col justify-between">
                <div className="flex items-center gap-2">
                  <StyledQrCode value={product.barcode || product.sku} size={42} />
                  <div className="flex-1 overflow-hidden">
                    <StyledBarcode code={product.barcode} height={26} showText={true} />
                  </div>
                </div>
              </div>

              {/* Retail Price Badge (Yellow Accent from User Image) */}
              <div className={`flex flex-col justify-center items-center px-3 py-1.5 rounded-xl border-2 shrink-0 ${
                layoutStyle === 'retail-yellow'
                  ? 'bg-[#FFD814] text-black border-black shadow-xs'
                  : 'bg-black text-white border-black'
              }`}>
                <span className="text-[8px] font-black uppercase tracking-wider leading-none">
                  Retail Price
                </span>
                <span className="text-lg sm:text-xl font-black font-mono leading-tight tracking-tight mt-0.5">
                  ₱{Number(product.sellingPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-[10px] text-default-500 font-medium text-center leading-normal bg-content2/40 p-2.5 rounded-xl border border-divider/20">
          Compatible with thermal rolls (Zebra, Brother, TSC) and standard laser/inkjet sheet printers (Avery 5160 / A4).
        </div>
      </HeroModal.Body>

      <HeroModal.Footer className="justify-between gap-2 pt-3 pb-4 border-t border-divider/20">
        <HeroButton
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(product.barcode);
            showToast(`Barcode ${product.barcode} copied to clipboard!`);
          }}
          variant="flat"
          color="default"
          size="sm"
          radius="full"
          startIcon={<Copy className="h-3.5 w-3.5" />}
          className="font-bold text-xs"
        >
          Copy Barcode
        </HeroButton>

        <div className="flex items-center gap-2">
          <HeroButton
            type="button"
            onClick={onClose}
            variant="flat"
            size="sm"
            radius="full"
            className="font-bold text-xs"
          >
            Close
          </HeroButton>
          <HeroButton
            type="button"
            onClick={() => onSimulatePrint({
              paperSize: selectedPaperSize,
              quantity,
              establishmentName: storeName || 'ESTABLISHMENT NAME',
              layoutStyle,
            })}
            isLoading={printingCode}
            color="primary"
            variant="solid"
            size="sm"
            radius="full"
            startIcon={!printingCode ? <Printer className="h-4 w-4 shrink-0" /> : undefined}
            className="text-xs font-bold shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
          >
            {printingCode ? 'Spooling Spooler...' : `Print ${quantity} Label${quantity === 1 ? '' : 's'}`}
          </HeroButton>
        </div>
      </HeroModal.Footer>
    </HeroModal>
  );
});

BarcodeModal.displayName = 'BarcodeModal';

export default BarcodeModal;
