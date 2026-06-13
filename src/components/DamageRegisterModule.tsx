/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useDb } from '../context/DbContext';
import { DamageLog, DamageCategory, DamageActionTaken, UserRole, Product } from '../types/db';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  Plus,
  Search,
  Trash2,
  Trash,
  Sliders,
  Calendar,
  FileText,
  User,
  ShieldAlert,
  Archive,
  Info,
  DollarSign,
  Layers,
  ArrowDownCircle,
  Truck,
  Store,
  RefreshCcw,
  Check,
  X
} from 'lucide-react';

interface DamageRegisterModuleProps {
  darkMode: boolean;
}

export const DamageRegisterModule: React.FC<DamageRegisterModuleProps> = () => {
  const {
    products,
    branches,
    damageLogs,
    createDamageLog,
    currentUser,
    addAuditLog
  } = useDb();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form States
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState(currentUser.branchAssignmentId || '');
  const [quantity, setQuantity] = useState<number>(5);
  const [unitType, setUnitType] = useState<'Box' | 'Piece'>('Box');
  const [category, setCategory] = useState<DamageCategory>('Warehouse Breakage');
  const [actionTaken, setActionTaken] = useState<DamageActionTaken>('Disposed / Scrapped');
  const [notes, setNotes] = useState('');

  // Search/Filter for product in creation form
  const [productSearch, setProductSearch] = useState('');

  const activeBranchMeta = branches.find(b => b.id === selectedBranchId) || branches[0];
  const selectedProductMeta = products.find(p => p.id === selectedProductId);

  // Filtered Products for the selection panel
  const filteredProductsSelect = products.filter(p => {
    if (p.isDeleted) return false;
    const searchString = `${p.productName} ${p.sku} ${p.productCode} ${p.brand}`.toLowerCase();
    return searchString.includes(productSearch.toLowerCase());
  }).slice(0, 5); // display top 5 matches for convenience

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      alert("Please select a product SKU first.");
      return;
    }
    if (!selectedBranchId) {
      alert("Please assign a branch for this entry.");
      return;
    }
    if (quantity <= 0) {
      alert("Please input a valid quantity of broken material.");
      return;
    }

    const prod = products.find(p => p.id === selectedProductId)!;
    const branchMeta = branches.find(b => b.id === selectedBranchId)!;

    createDamageLog({
      productId: selectedProductId,
      productName: prod.productName,
      productSku: prod.sku,
      branchId: selectedBranchId,
      branchName: branchMeta.name,
      quantity,
      unitType,
      category,
      actionTaken,
      notes: notes || `Logged standard ${category.toLowerCase()} inventory loss.`
    });

    // Reset Form
    setSelectedProductId('');
    setQuantity(5);
    setNotes('');
    setShowAddForm(false);
  };

  // Filter existing logs
  const filteredLogs = damageLogs.filter(log => {
    const prod = products.find(p => p.id === log.productId);
    const prodName = prod ? prod.productName : log.productName;
    const prodSku = prod ? prod.sku : log.productSku;
    
    const matchesSearch = 
      prodName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      prodSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.notes.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'All' || log.category === categoryFilter;
    const matchesBranch = branchFilter === 'All' || log.branchId === branchFilter;

    return matchesSearch && matchesCategory && matchesBranch;
  });

  // Calculate Aggregates
  const statsTotalShatteredBoxes = damageLogs
    .filter(l => l.unitType === 'Box')
    .reduce((sum, curr) => sum + curr.quantity, 0);

  const statsTotalShatteredPieces = damageLogs
    .filter(l => l.unitType === 'Piece')
    .reduce((sum, curr) => sum + curr.quantity, 0);

  // Financial impact calculation (estimate)
  const statsFinancialImpact = damageLogs.reduce((sum, curr) => {
    const prod = products.find(p => p.id === curr.productId);
    if (!prod) return sum;
    // Calculate fractional cost if Pieces vs Box
    const costPerUnit = curr.unitType === 'Box' ? prod.costPrice : (prod.costPrice / (prod.boxQuantity || 4));
    return sum + (costPerUnit * curr.quantity);
  }, 0);

  // Count by Category
  const categorySummaryCount = damageLogs.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.quantity;
    return acc;
  }, {} as Record<DamageCategory, number>);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2" id="tilepoint-damage-logs-panel">
      
      {/* Dynamic Upper Header Card */}
      <div className="relative rounded-3xl overflow-hidden bg-m3-surface-container-high border border-m3-outline-variant/30 px-6 py-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="absolute top-0 right-0 p-12 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center gap-1 text-[10px] uppercase font-black tracking-wider text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
            <AlertTriangle className="h-3 w-3" /> Materials Breakage Registry
          </div>
          <h2 className="text-xl md:text-2xl font-black text-m3-on-surface uppercase tracking-tight">Broken & BOA Damage Register</h2>
          <p className="text-xs text-m3-on-surface-variant max-w-xl font-medium">
            Standard logging platform to track tile fractures, warehouse drop damage, and shipping defects. Recorded breakage instantly balances branch stocks with proper double-entry ledger entries.
          </p>
        </div>
        <div className="flex relative z-10 shrink-0">
          <button
            type="button"
            onClick={() => {
              // Pre-select first product if empty
              if (!selectedProductId && products.length > 0) {
                setSelectedProductId(products[0].id);
              }
              setShowAddForm(!showAddForm);
            }}
            className="flex items-center gap-2 px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
          >
            {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            <span>{showAddForm ? 'Cancel Entry' : 'Log New Incident'}</span>
          </button>
        </div>
      </div>

      {/* Overview Analytics Bento Box */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Shattered Boxes */}
        <div className="bg-m3-surface-container-low border border-m3-outline-variant/20 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3.5 bg-rose-500/10 text-rose-500 rounded-xl">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-[10px] text-m3-on-surface-variant uppercase font-bold tracking-wider">Shattered Cartons (Boxes)</span>
            <span className="text-2xl font-black font-mono text-m3-on-surface">{statsTotalShatteredBoxes} <span className="text-[10px] font-sans text-rose-500">boxes</span></span>
          </div>
        </div>

        {/* Total Shattered Pieces */}
        <div className="bg-m3-surface-container-low border border-m3-outline-variant/20 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3.5 bg-amber-500/10 text-amber-500 rounded-xl">
            <Trash className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-[10px] text-m3-on-surface-variant uppercase font-bold tracking-wider">Broken Local Pieces</span>
            <span className="text-2xl font-black font-mono text-m3-on-surface">{statsTotalShatteredPieces} <span className="text-[10px] font-sans text-amber-500">pcs</span></span>
          </div>
        </div>

        {/* Estimated Cost of Damages */}
        <div className="bg-m3-surface-container-low border border-m3-outline-variant/20 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-[10px] text-m3-on-surface-variant uppercase font-bold tracking-wider">Estimated Total Loss</span>
            <span className="text-2xl font-black font-mono text-emerald-500">₱{statsFinancialImpact.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Total Incurred Incidents */}
        <div className="bg-m3-surface-container-low border border-m3-outline-variant/20 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3.5 bg-zinc-500/10 text-m3-on-surface rounded-xl">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-[10px] text-m3-on-surface-variant uppercase font-bold tracking-wider">Incident Log Counter</span>
            <span className="text-2xl font-black font-mono text-m3-on-surface">{damageLogs.length} <span className="text-[10px] font-sans text-zinc-400">records</span></span>
          </div>
        </div>

      </div>

      {/* Creation Modal / Form Drawer */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-m3-surface-container-high border border-rose-500/20 rounded-2xl p-6 shadow-xl relative"
          >
            <div className="absolute top-4 right-4">
              <button 
                onClick={() => setShowAddForm(false)}
                className="p-1 px-2.5 rounded-lg border border-m3-outline-variant/30 hover:bg-m3-surface-container-highest transition text-xs font-bold uppercase tracking-wider"
              >
                Close
              </button>
            </div>

            <div className="border-b border-m3-outline-variant/30 pb-3 mb-5 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              <div>
                <h3 className="text-sm font-black uppercase text-m3-on-surface">Log Material Damage/Breakage</h3>
                <p className="text-[10px] text-m3-on-surface-variant">Accurately select details below. Submission immediately deducts physical stock from active showrooms.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Product Selection Search deck */}
              <div className="space-y-3 bg-m3-surface-container-lowest p-4 rounded-xl border border-m3-outline-variant/20">
                <label className="block text-[10px] uppercase font-black text-rose-500 tracking-wider">1. Search & Choose Product SKU</label>
                
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-m3-on-surface-variant" />
                  <input
                    type="text"
                    placeholder="Type name, brand, or SKU..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs font-medium rounded-lg border border-m3-outline/40 bg-m3-surface focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div className="space-y-2 max-h-[170px] overflow-y-auto">
                  {filteredProductsSelect.map(p => {
                    const isSelected = p.id === selectedProductId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedProductId(p.id);
                          // Suggest size unit types directly if known
                        }}
                        className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${
                          isSelected 
                            ? 'border-rose-600 bg-rose-500/10 text-rose-500' 
                            : 'border-m3-outline-variant/20 bg-m3-surface hover:bg-m3-surface-container'
                        }`}
                      >
                        <div>
                          <div className="text-[11px] font-bold truncate max-w-[170px]">{p.productName}</div>
                          <div className="text-[9px] font-mono text-zinc-500 mt-0.5">{p.sku} | {p.size}</div>
                        </div>
                        <div className="text-right">
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md ${p.stockQuantity <= p.minimumStock ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                            {p.stockQuantity} box
                          </span>
                        </div>
                      </button>
                    );
                  })}
                  {filteredProductsSelect.length === 0 && (
                    <div className="text-[10px] text-zinc-500 text-center py-4">No matching tiles found.</div>
                  )}
                </div>

                {selectedProductMeta && (
                  <div className="p-2.5 bg-rose-500/5 rounded-lg border border-rose-500/10 text-[10.5px]">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 block">Selected Product Meta Details:</span>
                    <div className="flex justify-between mt-1 text-zinc-600 dark:text-zinc-400">
                      <span>Dimensions size:</span>
                      <span className="font-mono">{selectedProductMeta.size}</span>
                    </div>
                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                      <span>Tiles per Box:</span>
                      <span className="font-mono">{selectedProductMeta.boxQuantity} pieces</span>
                    </div>
                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                      <span>Product Category:</span>
                      <span className="font-mono">{selectedProductMeta.category}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Center Column: Branch, Quantities & Unit Type */}
              <div className="space-y-4">
                
                <div>
                  <label className="block text-[10px] uppercase font-black text-zinc-400 tracking-wider mb-1.5">2. Reporting Showroom Branch</label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full p-2.5 text-xs font-semibold rounded-lg border border-m3-outline/40 bg-m3-surface focus:outline-none focus:ring-1 focus:ring-rose-500"
                  >
                    <option value="">-- Choose Showroom Branch --</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.address.split(',')[0]})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-black text-zinc-400 tracking-wider mb-1.5">Damaged Qty</label>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full p-2.5 text-xs font-black font-mono rounded-lg border border-m3-outline/40 bg-m3-surface focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-black text-zinc-400 tracking-wider mb-1.5">Unit Standard</label>
                    <div className="flex rounded-lg border border-m3-outline/40 overflow-hidden bg-m3-surface h-[38px] items-center p-0.5">
                      <button
                        type="button"
                        onClick={() => setUnitType('Box')}
                        className={`flex-1 h-full rounded text-[10px] uppercase font-black tracking-wider transition-all ${
                          unitType === 'Box' 
                            ? 'bg-rose-600 text-white shadow-xs' 
                            : 'hover:bg-m3-surface-container text-zinc-500'
                        }`}
                      >
                        Carton (Box)
                      </button>
                      <button
                        type="button"
                        onClick={() => setUnitType('Piece')}
                        className={`flex-1 h-full rounded text-[10px] uppercase font-black tracking-wider transition-all ${
                          unitType === 'Piece' 
                            ? 'bg-rose-600 text-white shadow-xs' 
                            : 'hover:bg-m3-surface-container text-zinc-500'
                        }`}
                      >
                        Piece (Tile)
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-black text-zinc-400 tracking-wider mb-1.5">Breakage Incident Cause (Category)</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as DamageCategory)}
                    className="w-full p-2.5 text-xs font-semibold rounded-lg border border-m3-outline/40 bg-m3-surface focus:outline-none focus:ring-1 focus:ring-rose-500"
                  >
                    <option value="Warehouse Breakage">Warehouse Drop / Forklift Clash</option>
                    <option value="BOA">BOA (Broken On Arrival from Supplier)</option>
                    <option value="Showroom Casualty">Showroom Display Chipped</option>
                    <option value="Delivery Transit">Transport Transit Fractures</option>
                  </select>
                </div>

              </div>

              {/* Right Column: Actions Taken & Incident Log Notes */}
              <div className="space-y-4 flex flex-col justify-between">
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase font-black text-zinc-400 tracking-wider mb-1.5">Action & Disposal Treatment</label>
                    <select
                      value={actionTaken}
                      onChange={(e) => setActionTaken(e.target.value as DamageActionTaken)}
                      className="w-full p-2.5 text-xs font-semibold rounded-lg border border-m3-outline/40 bg-m3-surface focus:outline-none focus:ring-1 focus:ring-rose-500"
                    >
                      <option value="Disposed / Scrapped">Shattered - Disposed & Scrapped</option>
                      <option value="Saved for Mosaic">Saved for Low-Cost Mosaic Sales</option>
                      <option value="Claimed from Supplier / Insurance Code">Pending Supplier Cargo Claim / BOA Reimbursement</option>
                      <option value="Returned for Credit">Returned to Supplier Warehouse for Credit Note</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-black text-zinc-400 tracking-wider mb-1.5">Incident Description & Audit Notes</label>
                    <textarea
                      placeholder="Input specific observations (e.g., 'Box arrived completely crushed on transit truck #3', 'Chipped corner discovered upon showroom sample rotation')..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full p-2.5 text-xs font-medium rounded-lg border border-m3-outline/40 bg-m3-surface focus:outline-none focus:ring-1 focus:ring-rose-500 placeholder:text-zinc-500"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md cursor-pointer border border-transparent"
                  >
                    Commit Stock Damage Reduction
                  </button>
                </div>

              </div>

            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Filterable History List and Sidebar Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Side: Filter Panels */}
        <div className="space-y-4 bg-m3-surface-container-low border border-m3-outline-variant/20 p-5 rounded-2xl h-fit">
          <div className="flex items-center gap-2 border-b border-m3-outline-variant/30 pb-2 mb-3">
            <Sliders className="h-4 w-4 text-m3-primary" />
            <h3 className="text-xs font-black uppercase text-m3-on-surface">Audit Filter Panel</h3>
          </div>

          {/* Text Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">Search Keywords</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Product, SKU, notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs font-medium rounded-lg border border-m3-outline/40 bg-m3-surface focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black text-zinc-400 tracking-wider mb-1">Incident Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full p-2 text-xs font-semibold rounded-lg border border-m3-outline/40 bg-m3-surface focus:outline-none"
            >
              <option value="All">All Breakage Causes</option>
              <option value="Warehouse Breakage">Warehouse Drop / Forklift</option>
              <option value="BOA">BOA (Broken on Arrival)</option>
              <option value="Showroom Casualty">Showroom Casualty</option>
              <option value="Delivery Transit">Delivery Transit</option>
            </select>
          </div>

          {/* Branch Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black text-zinc-400 tracking-wider mb-1">Branch Store Location</label>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full p-2 text-xs font-semibold rounded-lg border border-m3-outline/40 bg-m3-surface focus:outline-none"
            >
              <option value="All">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Category Quick stats bar */}
          <div className="border-t border-m3-outline-variant/30 pt-4 mt-2">
            <span className="text-[9px] uppercase font-black text-zinc-400 tracking-wider block mb-2">Category Breakdowns</span>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center bg-rose-500/5 p-1.5 rounded-lg text-rose-500">
                <span className="font-extrabold text-[9px] uppercase tracking-wider">Broken on Arrival</span>
                <span className="font-mono font-black">{categorySummaryCount['BOA'] || 0} units</span>
              </div>
              <div className="flex justify-between items-center bg-amber-500/5 p-1.5 rounded-lg text-amber-500">
                <span className="font-extrabold text-[9px] uppercase tracking-wider">Warehouse Drop</span>
                <span className="font-mono font-black">{categorySummaryCount['Warehouse Breakage'] || 0} units</span>
              </div>
              <div className="flex justify-between items-center bg-blue-500/5 p-1.5 rounded-lg text-blue-500">
                <span className="font-extrabold text-[9px] uppercase tracking-wider">Delivery Transit</span>
                <span className="font-mono font-black">{categorySummaryCount['Delivery Transit'] || 0} units</span>
              </div>
              <div className="flex justify-between items-center bg-purple-500/5 p-1.5 rounded-lg text-purple-600">
                <span className="font-extrabold text-[9px] uppercase tracking-wider">Showroom Casualty</span>
                <span className="font-mono font-black">{categorySummaryCount['Showroom Casualty'] || 0} units</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Chronological Incidents Table */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-m3-surface-container-low border border-m3-outline-variant/20 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-m3-surface-container px-5 py-4 border-b border-m3-outline-variant/30 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase text-m3-on-surface">Audit Logs & Breakage Journal</h3>
                <p className="text-[10px] text-zinc-400">Total matched index: {filteredLogs.length} incident entries.</p>
              </div>
              
              <div className="flex items-center gap-1">
                <span className="text-[10px] uppercase font-black text-zinc-400 bg-m3-surface px-2 py-1 rounded border border-m3-outline-variant/40">Chronological</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-m3-surface-container border-b border-m3-outline-variant/20">
                    <th className="py-2.5 px-4 text-[10px] font-black uppercase text-zinc-400 tracking-wider">Incident ID</th>
                    <th className="py-2.5 px-4 text-[10px] font-black uppercase text-zinc-400 tracking-wider">Timestamp</th>
                    <th className="py-2.5 px-4 text-[10px] font-black uppercase text-zinc-400 tracking-wider">Product SKU / Code</th>
                    <th className="py-2.5 px-4 text-[10px] font-black uppercase text-zinc-400 tracking-wider">Showroom Branch</th>
                    <th className="py-2.5 px-4 text-[10px] font-black uppercase text-zinc-400 tracking-wider text-right">Quantity</th>
                    <th className="py-2.5 px-4 text-[10px] font-black uppercase text-zinc-400 tracking-wider">Breakage Reason</th>
                    <th className="py-2.5 px-4 text-[10px] font-black uppercase text-zinc-400 tracking-wider">Action / Treatment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-m3-outline-variant/20">
                  {filteredLogs.map(log => {
                    let catColorAndLabel = 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
                    if (log.category === 'BOA') catColorAndLabel = 'bg-rose-500/10 text-rose-500 border-rose-500/20';
                    if (log.category === 'Warehouse Breakage') catColorAndLabel = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
                    if (log.category === 'Delivery Transit') catColorAndLabel = 'bg-blue-500/10 text-blue-500 border-blue-500/20';
                    if (log.category === 'Showroom Casualty') catColorAndLabel = 'bg-purple-500/10 text-purple-600 border-purple-500/20';

                    let actionLabelColor = 'text-zinc-650 bg-zinc-200/40';
                    if (log.actionTaken === 'Saved for Mosaic') actionLabelColor = 'text-amber-700 bg-amber-100';
                    if (log.actionTaken === 'Returned for Credit') actionLabelColor = 'text-green-700 bg-green-100';
                    if (log.actionTaken === 'Claimed from Supplier / Insurance Code') actionLabelColor = 'text-rose-700 bg-rose-100';

                    return (
                      <tr key={log.id} className="hover:bg-m3-surface-container-high transition text-xs font-semibold">
                        <td className="py-3 px-4 font-mono font-black text-zinc-400">
                          {log.id.slice(0, 12)}
                        </td>
                        <td className="py-3 px-4 text-zinc-500 whitespace-nowrap">
                          {new Date(log.reportedAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour12: true, hour: 'numeric', minute: 'numeric' })}
                        </td>
                        <td className="py-3 px-4">
                          <span className="block font-black text-m3-on-surface truncate max-w-[170px]">{log.productName}</span>
                          <span className="text-[9.5px] font-mono text-zinc-500 uppercase block mt-0.5">{log.productSku}</span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-zinc-700 dark:text-zinc-300">
                          {log.branchName}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-extrabold font-mono text-rose-500 text-sm">-{log.quantity}</span>
                          <span className="text-[9px] uppercase block tracking-wider font-extrabold text-zinc-400 mt-0.5">{log.unitType}s</span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 text-[9.5px] font-extrabold uppercase border rounded-full ${catColorAndLabel}`}>
                            {log.category === 'BOA' ? 'BOA Supplier' : log.category}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 text-[9.5px] font-bold rounded block text-center truncate max-w-[120px] ${actionLabelColor}`}>
                            {log.actionTaken}
                          </span>
                          <span className="text-[9px] text-zinc-500 block truncate max-w-[160px] italic mt-1" title={log.notes}>"{log.notes}"</span>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-zinc-400 italic bg-m3-surface-container-low">
                        <Archive className="h-8 w-8 mx-auto stroke-[1.5] text-zinc-300 mb-2" />
                        No breakage incidents or BOA claims are found matching current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Operational Policy reminder footer Card */}
          <div className="rounded-xl border border-rose-500/15 bg-rose-500/5 p-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="block text-[11px] font-extrabold uppercase text-rose-500 tracking-wider">Corporate Tile Breakage Compliance Directive</span>
              <p className="text-[10px] text-rose-800/90 dark:text-rose-100/85">
                All logs processed in this damage registry trigger automatic inventory adjustments and log real-time audit ledger sequences. In the event of high volume freight damages (specifically Broken on Arrival cargos exceeding 20 boxes), branch managers must capture site delivery container pictures to support procurement reimbursement claims from suppliers.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
