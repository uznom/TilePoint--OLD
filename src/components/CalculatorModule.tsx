/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useDb } from '../context/DbContext';
import { Product } from '../types/db';
import {
  Calculator,
  Ruler,
  Boxes,
  Percent,
  Plus,
  Info,
  Sparkles,
  ChevronDown,
  Search,
  Check,
  AlertTriangle,
  Layers,
  ArrowRight
} from 'lucide-react';

interface CalculatorModuleProps {
  darkMode: boolean;
  onApply?: (product: Product, quantity: number) => void;
}

export const CalculatorModule: React.FC<CalculatorModuleProps> = ({ darkMode, onApply }) => {
  const { products } = useDb();

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

  // Filter only tile products or display all tile categories
  const tileProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.isDeleted) return false;
      const term = searchQuery.toLowerCase();
      const nameMatch = p.productName.toLowerCase().includes(term);
      const codeMatch = p.productCode?.toLowerCase().includes(term) || false;
      const catMatch = p.category?.toLowerCase().includes(term) || false;
      return nameMatch || codeMatch || catMatch;
    });
  }, [products, searchQuery]);

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
    <div className="space-y-6 text-m3-on-surface" id="tile-coverage-calculator-module">
      {/* Search Header Selector */}
      <div className="bg-m3-surface-low p-4 rounded-[20px] border border-m3-outline-variant/35 shadow-sm relative z-30">
        <span className="text-[10px] font-black uppercase text-m3-primary tracking-widest block mb-2.5">
          Step 1: Link system product to calculate inventory ratios (Optional)
        </span>
        <div className="relative">
          <div className="flex gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search tile inventory by name, code or category..."
                value={searchQuery}
                onFocus={() => setShowProductDropdown(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowProductDropdown(true);
                }}
                className="w-full bg-zinc-950/40 border border-m3-outline-variant/25 rounded-xl pl-9.5 pr-4 py-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-m3-primary"
              />
            </div>
            {selectedProduct && (
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl hover:bg-rose-500/20 text-[11px] font-black uppercase transition-colors cursor-pointer"
              >
                Reset Choice
              </button>
            )}
          </div>

          {/* Dropdown popup */}
          {showProductDropdown && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowProductDropdown(false)} 
              />
              <div className="absolute left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-zinc-900 border border-m3-outline-variant/30 rounded-xl shadow-2xl z-50 divide-y divide-m3-outline-variant/10">
                {tileProducts.length > 0 ? (
                  tileProducts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleSelectProduct(p)}
                      className="p-3 hover:bg-m3-primary/10 cursor-pointer transition-colors text-left flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-extrabold text-zinc-200">{p.productName}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          Code: <span className="font-mono">{p.productCode}</span> • Size: <span className="font-bold">{p.size || 'Unspecified'}</span> • Box Qty: <span className="font-bold">{p.boxQuantity || 4} pcs</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono text-emerald-400 font-bold block">₱{p.sellingPrice?.toLocaleString()} / {p.unit}</span>
                        <span className="text-[10px] text-zinc-400">Stock: {p.stockQuantity}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-zinc-500 text-xs italic">
                    No matching tile products found in inventory.
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {selectedProduct && (
          <div className="mt-3 p-3 bg-m3-primary/10 border border-m3-primary/20 rounded-xl flex items-center justify-between animate-fade-in text-xs">
            <div>
              <span className="text-[9px] uppercase font-black tracking-widest text-m3-primary block">Linked Product</span>
              <p className="font-black text-zinc-200 mt-0.5">{selectedProduct.productName}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                Price: ₱{selectedProduct.sellingPrice} per {selectedProduct.unit} • Size: {selectedProduct.size || 'Auto'} • Pack Qty: {boxQuantity} pcs/box
              </p>
            </div>
            <div className="h-7 w-7 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Check className="h-4 w-4" />
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Left Column & Right Column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* Left Column (Dimensional Inputs) - 5 Cols */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-m3-surface-low border border-m3-outline-variant/35 rounded-[24px] p-5 shadow-sm text-left">
            <div className="flex items-center gap-2 mb-4 border-b border-m3-outline-variant/15 pb-3">
              <Ruler className="h-5 w-5 text-m3-primary" />
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-m3-on-surface">Dimensional Inputs</h4>
                <p className="text-[10.5px] text-zinc-400 font-medium">Define showroom room measurements</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Length and Width */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-400">Room Length (m)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={roomLength}
                    onChange={(e) => setRoomLength(e.target.value)}
                    className="w-full bg-zinc-950/40 border border-m3-outline-variant/30 text-xs px-3.5 py-2.5 rounded-xl font-mono text-zinc-200 focus:outline-none focus:ring-1 focus:ring-m3-primary text-center"
                    placeholder="4.0"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-400">Room Width (m)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={roomWidth}
                    onChange={(e) => setRoomWidth(e.target.value)}
                    className="w-full bg-zinc-950/40 border border-m3-outline-variant/30 text-xs px-3.5 py-2.5 rounded-xl font-mono text-zinc-200 focus:outline-none focus:ring-1 focus:ring-m3-primary text-center"
                    placeholder="3.5"
                  />
                </div>
              </div>

              {/* Tile Size Selector & Shortcuts */}
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-black uppercase text-zinc-400 block">Tile Size Selector</span>
                
                {/* Standard shortcuts */}
                <div className="grid grid-cols-3 gap-1.5">
                  {sizeShortcuts.map((sc) => {
                    const isActive = tileLength === sc.length.toString() && tileWidth === sc.width.toString();
                    return (
                      <button
                        key={sc.label}
                        type="button"
                        onClick={() => handleApplyShortcut(sc)}
                        className={`py-1.5 px-2 rounded-lg border text-[10px] font-bold text-center cursor-pointer transition-all ${
                          isActive
                            ? 'bg-m3-primary/10 border-m3-primary text-m3-primary font-black shadow-inner'
                            : 'bg-zinc-950/20 border-m3-outline-variant/20 text-zinc-400 hover:text-zinc-200 hover:border-m3-outline-variant/45'
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
                    <label className="text-[9px] font-bold text-zinc-500 uppercase">Length (cm)</label>
                    <input
                      type="number"
                      min="1"
                      value={tileLength}
                      onChange={(e) => setTileLength(e.target.value)}
                      className="w-full bg-zinc-950/40 border border-m3-outline-variant/30 text-xs p-2 rounded-lg font-mono text-zinc-300 text-center focus:outline-none focus:ring-1 focus:ring-m3-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase">Width (cm)</label>
                    <input
                      type="number"
                      min="1"
                      value={tileWidth}
                      onChange={(e) => setTileWidth(e.target.value)}
                      className="w-full bg-zinc-950/40 border border-m3-outline-variant/30 text-xs p-2 rounded-lg font-mono text-zinc-300 text-center focus:outline-none focus:ring-1 focus:ring-m3-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase">Pcs / Box</label>
                    <input
                      type="number"
                      min="1"
                      value={boxQuantity}
                      onChange={(e) => setBoxQuantity(e.target.value)}
                      className="w-full bg-zinc-950/40 border border-m3-outline-variant/30 text-xs p-2 rounded-lg font-mono text-zinc-300 text-center focus:outline-none focus:ring-1 focus:ring-m3-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Waste Margin Override Toggle */}
              <div className="pt-3 border-t border-m3-outline-variant/15 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-zinc-400 block">Waste Margin Override</span>
                  <span className="text-[9px] text-zinc-500">Append +10% standard reserve for corner trims & shards</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsWasteOverride(!isWasteOverride)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isWasteOverride ? 'bg-m3-primary' : 'bg-zinc-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isWasteOverride ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* Right Column (Instant Box Packing) - 7 Cols */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-m3-surface-low border border-m3-outline-variant/35 rounded-[24px] p-5 shadow-sm text-left h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4.5 border-b border-m3-outline-variant/15 pb-3">
                <div className="flex items-center gap-2">
                  <Boxes className="h-5 w-5 text-emerald-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-m3-on-surface">Instant Packing Output</h4>
                </div>
                <span className="text-[9.5px] font-mono bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold">
                  LEDGER RATIO OK
                </span>
              </div>

              {/* The high-contrast result card layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                {/* Surface Area */}
                <div className="p-4 rounded-2xl bg-zinc-950/20 border border-m3-outline-variant/15 text-center">
                  <span className="text-[9px] font-extrabold uppercase text-zinc-400 block tracking-wider">Total Area</span>
                  <div className="text-2xl font-black text-emerald-500 mt-1 font-mono">
                    {calculations.areaSqm} <span className="text-xs">m²</span>
                  </div>
                  <span className="text-[9px] text-zinc-500 font-medium block mt-0.5">Floor plane size</span>
                </div>

                {/* Total Boxes Required */}
                <div className="p-4 rounded-2xl bg-m3-primary/15 border border-m3-primary/30 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 h-8 w-8 bg-m3-primary/20 rounded-bl-2xl flex items-center justify-center text-m3-primary">
                    <Sparkles className="h-3 w-3 animate-spin" style={{ animationDuration: '6s' }} />
                  </div>
                  <span className="text-[9px] font-extrabold uppercase text-m3-primary block tracking-wider">Boxes Needed</span>
                  <div className="text-2xl font-black text-zinc-100 mt-1 font-mono">
                    {calculations.boxesNeeded} <span className="text-xs">Boxes</span>
                  </div>
                  <span className="text-[9px] text-m3-primary/80 font-bold block mt-0.5">Auto-rounded up</span>
                </div>

                {/* Estimated Loose Breakage Pieces */}
                <div className="p-4 rounded-2xl bg-zinc-950/20 border border-m3-outline-variant/15 text-center">
                  <span className="text-[9px] font-extrabold uppercase text-zinc-400 block tracking-wider">Est. Breakage</span>
                  <div className="text-2xl font-black text-amber-500 mt-1 font-mono">
                    {calculations.looseBreakage} <span className="text-xs">pcs</span>
                  </div>
                  <span className="text-[9px] text-zinc-500 font-medium block mt-0.5">~3% standard loss</span>
                </div>
              </div>

              {/* Tiling detail ledger statistics */}
              <div className="bg-zinc-950/30 rounded-xl p-3 border border-m3-outline-variant/10 space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-[10.5px] text-zinc-400">
                  <span>Single tile layout surface:</span>
                  <span className="font-mono font-bold text-zinc-300">{calculations.tileAreaSqm.toFixed(4)} m² ({tileLength}x{tileWidth} cm)</span>
                </div>
                <div className="flex justify-between items-center text-[10.5px] text-zinc-400">
                  <span>Net tile count required (Perfect layout):</span>
                  <span className="font-mono font-bold text-zinc-300">{calculations.perfectTilesCount} pcs</span>
                </div>
                <div className="flex justify-between items-center text-[10.5px] text-zinc-400">
                  <span>Gross tiles required (With {isWasteOverride ? '10%' : '0%'} waste):</span>
                  <span className="font-mono font-bold text-zinc-300">{calculations.tilesWithWaste} pcs</span>
                </div>
                {selectedProduct && (
                  <div className="pt-2 border-t border-m3-outline-variant/10 flex justify-between items-center text-[11px] font-bold text-emerald-400">
                    <span>Estimated Retail Price:</span>
                    <span className="font-mono text-sm">₱{estimatedCost?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Layout representation */}
            <div className="mt-4 pt-3.5 border-t border-m3-outline-variant/15 flex items-center gap-2 text-[10px] text-zinc-500">
              <Info className="h-4.5 w-4.5 text-m3-primary shrink-0" />
              <span>Calculated pack logic is optimized for batch shade consistency from wholesale tile crates.</span>
            </div>
          </div>
        </div>

      </div>

      {/* Action Footer (The Third Section) */}
      <div className="bg-m3-surface-low p-4 rounded-[20px] border border-m3-outline-variant/35 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-left">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <Check className="h-4.5 w-4.5" />
          </div>
          <div>
            <h5 className="text-[11px] font-black text-m3-on-surface uppercase tracking-wide">Add To Active Check</h5>
            <p className="text-[10px] text-zinc-400">
              {selectedProduct 
                ? `Ready to push ${selectedProduct.unit?.toLowerCase().includes('box') ? calculations.boxesNeeded : calculations.tilesWithWaste} ${selectedProduct.unit} into invoice.`
                : 'Please search and select an inventory product above to commit the quantities.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={!selectedProduct || calculations.boxesNeeded <= 0}
          onClick={handleApplyToInvoice}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md transition-all ${
            selectedProduct && calculations.boxesNeeded > 0
              ? 'bg-m3-primary hover:bg-m3-primary/90 text-m3-on-primary hover:scale-[1.02] active:scale-95'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50'
          }`}
        >
          <span>Apply & Add to Active Invoice</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
