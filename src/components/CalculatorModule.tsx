/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ArrowRight,
  Boxes,
  Check,
  Info,
  Ruler,
  Search,
  Sparkles
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useDb, useDbBranchStock, useDbProducts } from '../context/DbContext';
import { getBranchStockQuantity, isProductInBranch } from '../lib/branchUtils';
import { Product } from '../types/db';
import { isTileProduct } from '../utils/productUtils';
import { formatCurrency } from '../utils/formatters';
import { HeroButton, HeroSwitch } from './common/ui';

interface CalculatorModuleProps {
  darkMode?: boolean;
  _darkMode?: boolean;
  onApply?: (product: Product, quantity: number) => void;
}

export const CalculatorModule: React.FC<CalculatorModuleProps> = ({ darkMode: _darkModeProp, _darkMode, onApply }) => {
  const products = useDbProducts();
  const branchStock = useDbBranchStock();
  const { branches, currentUser } = useDb();

  // Dimensional Inputs
  const [roomLength, setRoomLength] = useState('4.0');
  const [roomWidth, setRoomWidth] = useState('3.5');

  // Tile Dimensions (cm)
  const [tileLength, setTileLength] = useState('60');
  const [tileWidth, setTileWidth] = useState('60');

  // Waste Margin Override (default to true / standard +10%)
  const [isWasteOverride, setIsWasteOverride] = useState(true);

  // Manual Pieces Per Box override state
  const [boxQuantity, setBoxQuantity] = useState('4');

  // Search & Selected Product
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Filter only tile products
  const userBranchId = currentUser?.branchAssignmentId || 'B1';
  const tileProducts = useMemo(() => {
    return products
      .map((p) => ({
        ...p,
        stockQuantity: getBranchStockQuantity(p, userBranchId, branchStock, branches),
      }))
      .filter((p) => {
        if (p.isDeleted) return false;
        if (!isProductInBranch(p, userBranchId, branchStock, branches)) return false;
        if (!isTileProduct(p)) return false;

        // Apply search term filter if any
        const term = searchQuery.toLowerCase().trim();
        if (!term) return true;

        const nameMatch = (p.productName || '').toLowerCase().includes(term);
        const codeMatch = (p.productCode || '').toLowerCase().includes(term);
        const catMatch = (p.category || '').toLowerCase().includes(term);
        return nameMatch || codeMatch || catMatch;
      });
  }, [products, searchQuery, userBranchId, branchStock, branches]);

  // Size shortcuts helper
  const sizeShortcuts = [
    { label: '60x60 cm', length: 60, width: 60, pcs: 4 },
    { label: '30x60 cm', length: 30, width: 60, pcs: 8 },
    { label: '80x80 cm', length: 80, width: 80, pcs: 3 },
    { label: '30x30 cm', length: 30, width: 30, pcs: 11 },
    { label: '40x40 cm', length: 40, width: 40, pcs: 6 }
  ];

  const handleApplyShortcut = (shortcut: typeof sizeShortcuts[0]) => {
    setTileLength(shortcut.length.toString());
    setTileWidth(shortcut.width.toString());
    setBoxQuantity(shortcut.pcs.toString());
    
    // Clear product selection if its size does not match
    if (selectedProduct && selectedProduct.size) {
      const sizeStr = `${shortcut.length}x${shortcut.width}`;
      if (!selectedProduct.size.includes(sizeStr)) {
        setSelectedProduct(null);
      }
    }
  };

  // Autodetect size & box quantity when product is selected
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowProductDropdown(false);
    setSearchQuery('');

    // Extract sizes if in format "60x60" or "30x60" etc.
    if (product.size) {
      const matches = product.size.match(/(\d+)\s*x\s*(\d+)/i);
      if (matches && matches.length >= 3) {
        setTileLength(matches[1]);
        setTileWidth(matches[2]);
      }
    }

    if (product.boxQuantity) {
      setBoxQuantity(product.boxQuantity.toString());
    } else {
      // Default guess based on size
      const sizeStr = product.size || '';
      if (sizeStr.includes('60x60')) setBoxQuantity('4');
      else if (sizeStr.includes('30x60')) setBoxQuantity('8');
      else if (sizeStr.includes('80x80')) setBoxQuantity('3');
      else if (sizeStr.includes('30x30')) setBoxQuantity('11');
      else if (sizeStr.includes('40x40')) setBoxQuantity('6');
      else setBoxQuantity('4');
    }
  };

  // Calculations Results
  const calculations = useMemo(() => {
    const lRoom = parseFloat(roomLength) || 0;
    const wRoom = parseFloat(roomWidth) || 0;
    const lTile = parseFloat(tileLength) || 0;
    const wTile = parseFloat(tileWidth) || 0;
    const pcsPerBox = parseInt(boxQuantity, 10) || 4;

    const areaSqm = lRoom * wRoom;
    const tileAreaSqm = (lTile / 100) * (wTile / 100);

    let perfectTilesCount = 0;
    let tilesWithWaste = 0;
    let boxesNeeded = 0;
    let looseBreakage = 0;

    if (tileAreaSqm > 0 && areaSqm > 0) {
      // Round up to nearest whole tile for perfect fit
      perfectTilesCount = Math.ceil(areaSqm / tileAreaSqm);
      
      // waste factor: +10% standard or 0%
      const wasteMultiplier = isWasteOverride ? 1.10 : 1.0;
      tilesWithWaste = Math.ceil(perfectTilesCount * wasteMultiplier);

      // Pack into boxes
      boxesNeeded = Math.ceil(tilesWithWaste / pcsPerBox);

      // Estimated Loose Breakage Pieces (standard 3% of perfect tiles count, rounded up)
      looseBreakage = Math.ceil(perfectTilesCount * 0.03);
    }

    return {
      areaSqm: parseFloat(areaSqm.toFixed(3)),
      perfectTilesCount,
      tilesWithWaste,
      boxesNeeded,
      looseBreakage,
      tileAreaSqm
    };
  }, [roomLength, roomWidth, tileLength, tileWidth, boxQuantity, isWasteOverride]);

  // Total estimated price calculation if product is selected
  const estimatedCost = useMemo(() => {
    if (!selectedProduct) return null;
    const price = selectedProduct.sellingPrice || 0;
    const isBoxUnit = selectedProduct.unit?.toLowerCase().includes('box');
    
    if (isBoxUnit) {
      return calculations.boxesNeeded * price;
    } else {
      return calculations.tilesWithWaste * price;
    }
  }, [selectedProduct, calculations]);

  const handleApplyToInvoice = () => {
    if (!selectedProduct) {
      return;
    }
    const isBoxUnit = selectedProduct.unit?.toLowerCase().includes('box');
    const finalQty = isBoxUnit ? calculations.boxesNeeded : calculations.tilesWithWaste;
    
    if (onApply) {
      onApply(selectedProduct, finalQty);
    }
  };

  return (
    <div className="space-y-6 text-foreground font-sans" id="tile-coverage-calculator-module">
      {/* Search Header Selector */}
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/70 dark:border-white/10 shadow-elevation-soft relative z-30">
        <span className="text-[10px] font-bold uppercase text-primary tracking-wider block mb-2.5 font-mono">
          Step 1: Link System Product to Calculate Inventory Ratios (Optional)
        </span>
        <div className="relative">
          <div className="flex gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-default-400" />
              <input
                type="text"
                placeholder="Search tile inventory by name, code or category..."
                value={searchQuery ?? ''}
                onFocus={() => setShowProductDropdown(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowProductDropdown(true);
                }}
                className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-white/5 rounded-full pl-10 pr-4 py-2 text-xs text-foreground placeholder:text-default-400 focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium transition-all"
              />
            </div>
            {selectedProduct && (
              <HeroButton
                type="button"
                variant="flat"
                color="danger"
                size="sm"
                radius="full"
                onClick={() => setSelectedProduct(null)}
                className="font-bold text-xs"
              >
                Reset Choice
              </HeroButton>
            )}
          </div>

          {/* Dropdown popup */}
          {showProductDropdown && (
            <>
              <div 
                className="fixed inset-0 z-[9998]" 
                onClick={() => setShowProductDropdown(false)} 
              />
              <div className="absolute left-0 right-0 mt-2 max-h-56 overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.14)] z-[9999] divide-y divide-divider/10">
                {tileProducts.length > 0 ? (
                  tileProducts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleSelectProduct(p)}
                      className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors text-left flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-foreground">{p.productName}</p>
                        <p className="text-[10px] text-default-500 mt-0.5 font-medium">
                          Code: <span className="font-mono">{p.productCode}</span> • Size: <span className="font-bold">{p.size || 'Unspecified'}</span> • Box Qty: <span className="font-bold font-mono">{p.boxQuantity || 4} pcs</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-primary font-bold block font-mono">{formatCurrency(p.sellingPrice)} / {p.unit}</span>
                        {p.stockQuantity <= 0 ? (
                          <span className="text-[9px] font-bold uppercase text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 ml-1 font-mono">NO STOCKS</span>
                        ) : (
                          <span className="text-[10px] text-default-500 font-mono">Stock: {p.stockQuantity}</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-default-500 text-xs italic">
                    No matching tile products found in inventory.
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {selectedProduct && (
          <div className="mt-3.5 p-3.5 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between animate-fade-in text-xs shadow-2xs">
            <div>
              <span className="text-[9px] uppercase font-bold tracking-wider text-primary block font-mono">Linked Product</span>
              <p className="font-bold text-foreground mt-0.5">{selectedProduct.productName}</p>
              <p className="text-[10px] text-default-500 mt-0.5 font-medium">
                Price: <span className="font-mono">{formatCurrency(selectedProduct.sellingPrice)}</span> per {selectedProduct.unit} • Size: {selectedProduct.size || 'Auto'} • Pack Qty: <span className="font-mono">{boxQuantity} pcs/box</span>
              </p>
            </div>
            <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xs">
              <Check className="h-4 w-4 stroke-[3]" />
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Left Column & Right Column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* Left Column (Dimensional Inputs) - 5 Cols */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 rounded-3xl p-5 shadow-elevation-soft text-left">
            <div className="flex items-center gap-2 mb-4 border-b border-divider/20 pb-3">
              <Ruler className="h-5 w-5 text-primary" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Dimensional Inputs</h4>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Length and Width */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-default-500 tracking-wider">Room Length (m)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={roomLength ?? ''}
                    onChange={(e) => setRoomLength(e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-white/5 text-xs px-3.5 py-2 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-center font-bold font-mono transition-all"
                    placeholder="4.0"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-default-500 tracking-wider">Room Width (m)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={roomWidth ?? ''}
                    onChange={(e) => setRoomWidth(e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-white/5 text-xs px-3.5 py-2 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-center font-bold font-mono transition-all"
                    placeholder="3.5"
                  />
                </div>
              </div>

              {/* Tile Size Selector & Shortcuts */}
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-bold uppercase text-default-500 tracking-wider block">Tile Size Selector</span>
                
                {/* Standard shortcuts */}
                <div className="grid grid-cols-3 gap-1.5 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-2xl border border-zinc-200/50 dark:border-white/5">
                  {sizeShortcuts.map((sc) => {
                    const isActive = tileLength === sc.length.toString() && tileWidth === sc.width.toString();
                    return (
                      <button
                        key={sc.label}
                        type="button"
                        onClick={() => handleApplyShortcut(sc)}
                        className={`py-1.5 px-2 rounded-xl border text-[10px] font-bold text-center cursor-pointer transition-all ${
                          isActive
                            ? 'bg-white dark:bg-zinc-900 border-zinc-200/70 dark:border-white/10 text-primary shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                            : 'bg-transparent border-transparent text-default-500 hover:text-foreground'
                        }`}
                      >
                        {sc.label}
                      </button>
                    );
                  })}
                </div>

                {/* Manual Size Entry */}
                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-default-500 uppercase tracking-wider">Length (cm)</label>
                    <input
                      type="number"
                      min="1"
                      value={tileLength ?? ''}
                      onChange={(e) => setTileLength(e.target.value)}
                      className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-white/5 text-xs p-2 rounded-xl text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/30 font-bold font-mono transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-default-500 uppercase tracking-wider">Width (cm)</label>
                    <input
                      type="number"
                      min="1"
                      value={tileWidth ?? ''}
                      onChange={(e) => setTileWidth(e.target.value)}
                      className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-white/5 text-xs p-2 rounded-xl text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/30 font-bold font-mono transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-default-500 uppercase tracking-wider">Pcs / Box</label>
                    <input
                      type="number"
                      min="1"
                      value={boxQuantity ?? ''}
                      onChange={(e) => setBoxQuantity(e.target.value)}
                      className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-white/5 text-xs p-2 rounded-xl text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/30 font-bold font-mono transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Waste Margin Override Toggle */}
              <div className="pt-3.5 border-t border-divider/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-foreground block">Waste Margin Override</span>
                  <span className="text-[9px] text-default-500 font-medium">Append +10% standard reserve for corner trims &amp; shards</span>
                </div>

                <HeroSwitch
                  size="sm"
                  color="primary"
                  isSelected={isWasteOverride}
                  onValueChange={(val) => setIsWasteOverride(val)}
                />
              </div>

            </div>
          </div>
        </div>

        {/* Right Column (Instant Box Packing) - 7 Cols */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 rounded-3xl p-5 shadow-elevation-soft text-left h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4.5 border-b border-divider/20 pb-3">
                <div className="flex items-center gap-2">
                  <Boxes className="h-5 w-5 text-primary" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Instant Packing Output</h4>
                </div>
                <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono">
                  Ledger Ratio OK
                </span>
              </div>

              {/* The result card layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                {/* Surface Area */}
                <div className="p-4 rounded-2xl bg-zinc-100/90 dark:bg-zinc-800/80 border border-zinc-200/50 dark:border-white/5 text-center shadow-2xs">
                  <span className="text-[9px] font-bold uppercase text-default-500 block tracking-wider">Total Area</span>
                  <div className="text-2xl font-bold text-primary mt-1 font-mono">
                    {calculations.areaSqm} <span className="text-xs font-sans">m²</span>
                  </div>
                  <span className="text-[9px] text-default-500 font-medium block mt-0.5">Floor plane size</span>
                </div>

                {/* Total Boxes Required */}
                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 text-center relative overflow-hidden shadow-2xs">
                  <div className="absolute top-0 right-0 h-8 w-8 bg-primary/20 rounded-bl-2xl flex items-center justify-center text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[9px] font-bold uppercase text-primary block tracking-wider">Boxes Needed</span>
                  <div className="text-2xl font-bold text-foreground mt-1 font-mono">
                    {calculations.boxesNeeded} <span className="text-xs font-sans">Boxes</span>
                  </div>
                  <span className="text-[9px] text-primary font-bold block mt-0.5">Auto-rounded up</span>
                </div>

                {/* Estimated Loose Breakage Pieces */}
                <div className="p-4 rounded-2xl bg-zinc-100/90 dark:bg-zinc-800/80 border border-zinc-200/50 dark:border-white/5 text-center shadow-2xs">
                  <span className="text-[9px] font-bold uppercase text-default-500 block tracking-wider">Est. Breakage</span>
                  <div className="text-2xl font-bold text-amber-500 mt-1 font-mono">
                    {calculations.looseBreakage} <span className="text-xs font-sans">pcs</span>
                  </div>
                  <span className="text-[9px] text-default-500 font-medium block mt-0.5">~3% standard loss</span>
                </div>
              </div>

              {/* Tiling detail ledger statistics */}
              <div className="bg-zinc-100/90 dark:bg-zinc-800/80 rounded-2xl p-4 border border-zinc-200/50 dark:border-white/5 space-y-2 text-xs shadow-2xs">
                <div className="flex justify-between items-center text-[11px] text-default-500">
                  <span>Single tile layout surface:</span>
                  <span className="font-bold text-foreground font-mono">{calculations.tileAreaSqm.toFixed(4)} m² ({tileLength}x{tileWidth} cm)</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-default-500">
                  <span>Net tile count required (Perfect layout):</span>
                  <span className="font-bold text-foreground font-mono">{calculations.perfectTilesCount} pcs</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-default-500">
                  <span>Gross tiles required (With {isWasteOverride ? '10%' : '0%'} waste):</span>
                  <span className="font-bold text-foreground font-mono">{calculations.tilesWithWaste} pcs</span>
                </div>
                {selectedProduct && (
                  <div className="pt-2.5 border-t border-divider/20 flex justify-between items-center text-xs font-bold text-primary">
                    <span>Estimated Retail Price:</span>
                    <span className="text-sm font-mono font-bold">{formatCurrency(estimatedCost || 0)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Layout representation */}
            <div className="mt-4 pt-3.5 border-t border-divider/20 flex items-center gap-2 text-[10px] text-default-500 font-medium">
              <Info className="h-4 w-4 text-primary shrink-0" />
              <span>Calculated pack logic is optimized for batch shade consistency from wholesale tile crates.</span>
            </div>
          </div>
        </div>

      </div>

      {/* Action Footer */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200/70 dark:border-white/10 shadow-elevation-soft flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-left">
          <div className="p-2.5 bg-primary/10 text-primary border border-primary/20 rounded-2xl shrink-0">
            <Check className="h-4 w-4" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-foreground uppercase tracking-tight">Add To Active Check</h5>
            <p className="text-[11px] text-default-500 font-medium">
              {selectedProduct 
                ? `Ready to push ${selectedProduct.unit?.toLowerCase().includes('box') ? calculations.boxesNeeded : calculations.tilesWithWaste} ${selectedProduct.unit} into invoice.`
                : 'Please search and select an inventory product above to commit the quantities.'}
            </p>
          </div>
        </div>

        <HeroButton
          type="button"
          disabled={!selectedProduct || calculations.boxesNeeded <= 0 || (selectedProduct.stockQuantity ?? 0) <= 0}
          onClick={handleApplyToInvoice}
          color={selectedProduct && calculations.boxesNeeded > 0 && (selectedProduct.stockQuantity ?? 0) > 0 ? "primary" : "default"}
          variant={selectedProduct && calculations.boxesNeeded > 0 && (selectedProduct.stockQuantity ?? 0) > 0 ? "solid" : "flat"}
          size="sm"
          radius="full"
          endIcon={<ArrowRight className="h-4 w-4" />}
          className="font-bold text-xs uppercase tracking-wider shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
        >
          {(selectedProduct && (selectedProduct.stockQuantity ?? 0) <= 0) ? "NO STOCKS AVAILABLE — PURCHASE DISABLED" : "Apply & Add to Active Invoice"}
        </HeroButton>
      </div>
    </div>
  );
};

export default CalculatorModule;
