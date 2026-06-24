/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Printer,
  Sparkles,
  Layers,
  Info
} from 'lucide-react';

interface CalculatorModuleProps {
  darkMode: boolean;
}

export const CalculatorModule: React.FC<CalculatorModuleProps> = ({ darkMode }) => {
  // Room Inputs (meters)
  const [roomLength, setRoomLength] = useState('4');
  const [roomWidth, setRoomWidth] = useState('3.5');

  // Tile Size Inputs (cm)
  const [tileLength, setTileLength] = useState('60');
  const [tileWidth, setTileWidth] = useState('60');

  // Box Packing Factor
  const [boxDensity, setBoxDensity] = useState('4');

  // Wastage Factor
  const [wastagePercent, setWastagePercent] = useState('10');

  // Calculations Results
  const [totalAreaSqm, setTotalAreaSqm] = useState(0);
  const [tilesNeededPlain, setTilesNeededPlain] = useState(0);
  const [tilesNeededWastage, setTilesNeededWastage] = useState(0);
  const [boxesNeeded, setBoxesNeeded] = useState(0);

  useEffect(() => {
    const lRoom = parseFloat(roomLength) || 0;
    const wRoom = parseFloat(roomWidth) || 0;
    const lTileCv = (parseFloat(tileLength) || 0) / 100; // cm to m
    const wTileCv = (parseFloat(tileWidth) || 0) / 100; // cm to m
    const density = parseFloat(boxDensity) || 1;
    const wasteMul = 1 + (parseFloat(wastagePercent) || 0) / 100;

    // 1. Sqm area
    const area = lRoom * wRoom;
    setTotalAreaSqm(parseFloat(area.toFixed(2)));

    // 2. Individual tile area
    const tileArea = lTileCv * wTileCv;

    if (tileArea > 0 && area > 0) {
      // 3. Tile counts needed
      const rawNeeded = Math.ceil(area / tileArea);
      setTilesNeededPlain(rawNeeded);

      const netWithWastage = Math.ceil(rawNeeded * wasteMul);
      setTilesNeededWastage(netWithWastage);

      // 4. Boxes computed
      const boxes = Math.ceil(netWithWastage / density);
      setBoxesNeeded(boxes);
    } else {
      setTilesNeededPlain(0);
      setTilesNeededWastage(0);
      setBoxesNeeded(0);
    }
  }, [roomLength, roomWidth, tileLength, tileWidth, boxDensity, wastagePercent]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in text-m3-on-surface">
      {/* Inputs Columns (Columns 5) */}
      <div className="m3-card shadow-sm lg:col-span-5 h-fit">
        <h3 className="text-sm font-bold flex items-center gap-2 border-b border-m3-outline-variant/20 pb-3 mb-4 text-m3-primary">
          <Calculator className="h-5 w-5" /> Ground Area tile Estimator
        </h3>

        <div className="space-y-4 text-xs">
          {/* Room Specs */}
          <div>
            <span className="text-[10px] uppercase font-bold text-m3-on-surface-variant/80 tracking-widest block mb-2">Ground area (meters)</span>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-m3-primary">Room Length (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={roomLength}
                  onChange={e => setRoomLength(e.target.value)}
                  className="w-full bg-m3-surface border-b-2 border-m3-outline-variant focus:border-m3-primary p-2.5 font-mono font-bold text-center text-sm text-m3-on-surface focus:outline-none transition-colors rounded-t-md"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-m3-primary">Room Width (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={roomWidth}
                  onChange={e => setRoomWidth(e.target.value)}
                  className="w-full bg-m3-surface border-b-2 border-m3-outline-variant focus:border-m3-primary p-2.5 font-mono font-bold text-center text-sm text-m3-on-surface focus:outline-none transition-colors rounded-t-md"
                />
              </div>
            </div>
          </div>

          {/* Tile Dimensions */}
          <div>
            <span className="text-[10px] uppercase font-bold text-m3-on-surface-variant/80 tracking-widest block mb-2">Selected Tile Dimensions (CM)</span>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-m3-primary">Tile Length (cm)</label>
                <input
                  type="number"
                  value={tileLength}
                  onChange={e => setTileLength(e.target.value)}
                  className="w-full bg-m3-surface border-b-2 border-m3-outline-variant focus:border-m3-primary p-2.5 font-mono font-bold text-center text-sm text-m3-on-surface focus:outline-none transition-colors rounded-t-md"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-m3-primary">Tile Width (cm)</label>
                <input
                  type="number"
                  value={tileWidth}
                  onChange={e => setTileWidth(e.target.value)}
                  className="w-full bg-m3-surface border-b-2 border-m3-outline-variant focus:border-m3-primary p-2.5 font-mono font-bold text-center text-sm text-m3-on-surface focus:outline-none transition-colors rounded-t-md"
                />
              </div>
            </div>
          </div>

          {/* Density & Wastage */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 text-left">
              <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">Pcs per Box</label>
              <input
                type="number"
                value={boxDensity}
                onChange={e => setBoxDensity(e.target.value)}
                className="w-full bg-m3-surface border-b-2 border-m3-outline-variant focus:border-m3-primary p-2.5 font-mono font-bold text-center text-sm text-m3-on-surface focus:outline-none transition-colors rounded-t-md"
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">Scrap wastage</label>
              <select
                value={wastagePercent}
                onChange={e => setWastagePercent(e.target.value)}
                className="w-full bg-m3-surface border-b-2 border-m3-outline-variant focus:border-m3-primary p-2.5 text-xs font-bold text-center text-m3-on-surface focus:outline-none transition-colors rounded-t-md cursor-pointer"
              >
                <option value="0">0% Perfect Cut</option>
                <option value="5">5% Trim factor</option>
                <option value="10">10% Recommended Extra</option>
                <option value="15">15% Complex angles cut</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Outputs & Custom Layout Mock Visualizer (Columns 7) */}
      <div className="lg:col-span-7 space-y-4">
        {/* Output values summary card */}
        <div id="calculator-printed-panel" className="m3-card shadow-sm">
          <div className="flex justify-between items-center border-b border-m3-outline-variant/20 pb-2 mb-4">
            <h4 className="text-sm font-extrabold flex items-center gap-1.5 text-m3-primary">
              <Sparkles className="h-4.5 w-4.5" /> Estimation Outputs Card
            </h4>

            <button
              onClick={() => {
                window.print();
              }}
              className="p-1 px-3 bg-m3-outline-variant/15 text-m3-primary hover:bg-m3-outline-variant/25 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer rounded-full transition-colors border border-m3-outline-variant/10"
            >
              <Printer className="h-4 w-4" /> Print Estimate Format
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-2">
            <div className="p-3.5 bg-m3-primary-container text-m3-on-primary-container border border-m3-primary/20 rounded-2xl text-center space-y-1">
              <span className="text-[9px] uppercase font-bold text-m3-on-primary-container-variant/80">Total area</span>
              <h5 className="text-base font-extrabold font-mono text-m3-primary">{totalAreaSqm} sqm</h5>
            </div>

            <div className="p-3 bg-m3-surface border border-m3-outline-variant/35 rounded-2xl text-center space-y-1">
              <span className="text-[9px] uppercase font-bold text-m3-on-surface-variant">Perfect Tiles</span>
              <h5 className="text-base font-extrabold font-mono text-m3-on-surface">{tilesNeededPlain} pcs</h5>
            </div>

            <div className="p-3 bg-m3-tertiary-container text-m3-on-tertiary-container border border-m3-tertiary/20 rounded-2xl text-center space-y-1" title="Includes wastage margin">
              <span className="text-[9px] uppercase font-bold text-m3-on-tertiary-container-variant/80">Tiles with Scrap</span>
              <h5 className="text-base font-extrabold font-mono text-m3-tertiary">{tilesNeededWastage} pcs</h5>
            </div>

            <div className="p-3.5 bg-m3-primary-container text-m3-on-primary-container border border-m3-primary/20 rounded-2xl text-center space-y-1">
              <span className="text-[9px] uppercase font-bold text-m3-on-primary-container-variant/80">Boxes req.</span>
              <h5 className="text-base font-extrabold font-mono text-m3-primary">{boxesNeeded} Boxes</h5>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2.5 text-[11px] text-m3-on-surface-variant/80 leading-relaxed max-w-xl">
            <Info className="h-5 w-5 text-m3-primary shrink-0 mt-0.5" />
            <span>
              Wastage calculations of <strong>{wastagePercent}%</strong> are automatically appended to provide reserve files when corner cuts, layout breaks, or tiling fractures occur on site.
            </span>
          </div>
        </div>

        {/* Visual Simulated Mock grid display of physical tile layout */}
        <div className="m3-card shadow-sm">
          <h5 className="text-xs font-bold text-m3-primary uppercase tracking-widest mb-3.5 flex items-center gap-1.5">
            <Layers className="h-4.5 w-4.5 text-m3-tertiary" /> Interactive Tiles Grid Mockup Map
          </h5>

          {/* Interactive CSS simulated floor tile boxes */}
          <div className="relative h-44 w-full bg-m3-surface-lowest rounded-2xl border border-m3-outline-variant/35 overflow-hidden flex items-center justify-center p-4">
            <div className="grid grid-cols-6 gap-0.5 w-[2400px] h-full rotate-[1.5deg] opacity-35">
              {Array.from({ length: 42 }).map((_, i) => (
                <div key={i} className="bg-m3-primary/5 border border-m3-outline-variant/30 h-10 w-full hover:bg-m3-primary/20 transition-colors cursor-crosshair flex items-center justify-center text-[8px] font-mono font-bold" />
              ))}
            </div>

            <div className="absolute inset-0 bg-transparent flex flex-col justify-center items-center text-center p-3">
              <h5 className="text-xs font-extrabold uppercase tracking-widest text-m3-primary leading-normal mb-1 bg-m3-primary-container/85 px-3 py-1 rounded-full border border-m3-primary/10">
                Visual Area: Room ({roomLength}m x {roomWidth}m)
              </h5>
              <p className="text-[10.5px] text-m3-on-surface font-semibold max-w-sm leading-relaxed mt-2 bg-m3-surface-low/90 p-2.5 rounded-2xl border border-m3-outline-variant/30">
                Fits approximately <span className="text-m3-primary font-black">{tilesNeededPlain} standard {tileLength}x{tileWidth} cm tiles</span>. Ordered checklist recommends total packaging of <span className="text-m3-tertiary font-black font-mono">{boxesNeeded} complete boxes</span> to stay safe.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
