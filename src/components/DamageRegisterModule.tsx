import {
  AlertTriangle,
  Archive,
  DollarSign,
  Info,
  Layers,
  Plus,
  Search,
  ShieldAlert,
  Sliders,
  Trash,
  Trash2,
  X
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useState } from 'react';
import { useDb, useDbBranchStock, useDbProducts } from '../context/DbContext';
import { getBranchOptionLabel, isProductInBranch } from '../lib/branchUtils';
import { DamageActionTaken, DamageCategory, UserRole } from '../types/db';
import { ConfirmationModal } from './ConfirmationModal';
import { TablePagination, useResponsivePageSize } from './TablePagination';
import { HeaderBar } from './common/HeaderBar';
import { HeroButton } from './common/ui/HeroButton';
import { HeroSelect } from './common/ui/HeroSelect';
import { HeroDropdownSelect } from './common/ui/HeroDropdown';
import { formatCurrency } from '../utils/formatters';

interface DamageRegisterModuleProps {
  darkMode: boolean;
}

export const DamageRegisterModule: React.FC<DamageRegisterModuleProps> = () => {
  const products = useDbProducts();
  const branchStock = useDbBranchStock();
  const {
    branches,
    damageLogs,
    createDamageLog,
    deleteDamageLog,
    currentUser,
    isRowClearingBlocked,
    getRowClearingBlockedReason,
  } = useDb();

  const [searchTerm, setSearchTerm] = useState('');
  const [confirmTargetId, setConfirmTargetId] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>(
    currentUser?.role === UserRole.ADMIN ? 'All' : (currentUser?.branchAssignmentId || '')
  );

  useEffect(() => {
    const isAdmin = currentUser?.role === UserRole.ADMIN;
    if (isAdmin) {
      setBranchFilter('All');
    } else {
      const uBranch = currentUser?.branchAssignmentId || '';
      setBranchFilter(uBranch);
      setSelectedBranchId(uBranch);
    }
  }, [currentUser?.id, currentUser?.role, currentUser?.branchAssignmentId]);
  const [showAddForm, setShowAddForm] = useState(false);

  // Pagination states
  const [damagePage, setDamagePage] = useState(1);
  const damagePageSize = useResponsivePageSize(64, 460, 10);

  // Reset page when search or filters change
  useEffect(() => {
    setDamagePage(1);
  }, [searchTerm, categoryFilter, branchFilter]);

  // Form States
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState(currentUser?.branchAssignmentId || '');
  const [quantity, setQuantity] = useState<number>(5);
  const [unitType, setUnitType] = useState<'Box' | 'Piece'>('Box');
  const [category, setCategory] = useState<DamageCategory>('Warehouse Breakage');
  const [actionTaken, setActionTaken] = useState<DamageActionTaken>('Disposed / Scrapped');
  const [notes, setNotes] = useState('');

  // Search/Filter for product in creation form
  const [productSearch, setProductSearch] = useState('');

  const activeBranchMeta = (branches || []).find(b => b.id === selectedBranchId) || (branches || [])[0] || { id: selectedBranchId || 'B1', name: 'Main Branch' };
  const selectedProductMeta = (products || []).find(p => p.id === selectedProductId);

  // Filtered Products for the selection panel
  const filteredProductsSelect = products.filter(p => {
    if (p.isDeleted) return false;
    if (!isProductInBranch(p, selectedBranchId, branchStock, branches)) return false;
    const searchString = `${p.productName} ${p.sku} ${p.productCode} ${p.brand}`.toLowerCase();
    return searchString.includes(productSearch.toLowerCase());
  }).slice(0, 5); // display top 5 matches for convenience

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setAlertMessage("Please select a product SKU first.");
      return;
    }
    if (!selectedBranchId) {
      setAlertMessage("Please assign a branch for this entry.");
      return;
    }
    if (quantity <= 0) {
      setAlertMessage("Please input a valid quantity of broken material.");
      return;
    }

    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) {
      setAlertMessage("Selected product SKU not found.");
      return;
    }
    const branchMeta = branches.find(b => b.id === selectedBranchId) || activeBranchMeta;

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
    if (log.isDeleted) return false;
    const prod = products.find(p => p.id === log.productId);
    const prodName = (prod ? prod.productName : log.productName) || '';
    const prodSku = (prod ? prod.sku : log.productSku) || '';
    const logNotes = log.notes || '';
    
    const matchesSearch = 
      prodName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      prodSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      logNotes.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'All' || log.category === categoryFilter;
    const matchesBranch = branchFilter === 'All' || log.branchId === branchFilter;

    return matchesSearch && matchesCategory && matchesBranch;
  });

  // Calculate Aggregates dynamically based on filtered logs (respects branch and search filters)
  const statsTotalShatteredBoxes = filteredLogs
    .filter(l => l.unitType === 'Box')
    .reduce((sum, curr) => sum + Number(curr.quantity || 0), 0);

  const statsTotalShatteredPieces = filteredLogs
    .filter(l => l.unitType === 'Piece')
    .reduce((sum, curr) => sum + Number(curr.quantity || 0), 0);

  // Financial impact calculation (estimate)
  const statsFinancialImpact = filteredLogs
    .reduce((sum, curr) => {
      const prod = products.find(p => p.id === curr.productId);
      if (!prod) return sum;
      // Calculate fractional cost if Pieces vs Box
      const costPerUnit = curr.unitType === 'Box' ? prod.costPrice : (prod.costPrice / (prod.boxQuantity || 4));
      return sum + (costPerUnit * Number(curr.quantity || 0));
    }, 0);

  // Count by Category
  const categorySummaryCount = filteredLogs
    .reduce((acc, curr) => {
      if (curr.category) {
        acc[curr.category] = (acc[curr.category] || 0) + Number(curr.quantity || 0);
      }
      return acc;
    }, {} as Record<DamageCategory, number>);

  return (
    <div className="space-y-6 w-full animate-fade-in text-foreground p-2 font-sans" id="tilepoint-damage-logs-panel">
      
      {/* Dynamic Upper Header Card */}
      <HeaderBar
        title="Broken & BOA Damage Register"
        subtitle="Track, log, and audit tile breakage casualties, broken-on-arrival (BOA) incidents, and inventory write-offs."
        icon={AlertTriangle}
        badge={{ text: `${filteredLogs.length} Incident Logs`, variant: 'accent' }}
        actions={
          <HeroButton
            onClick={() => {
              if (!selectedProductId && products.length > 0) {
                setSelectedProductId(products[0].id);
              }
              setShowAddForm(!showAddForm);
            }}
            color="danger"
            variant="solid"
            size="sm"
            radius="full"
            className="font-bold text-xs shadow-[0_2px_8px_rgba(243,18,96,0.25)]"
            startIcon={showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          >
            {showAddForm ? 'Cancel Entry' : 'Log New Incident'}
          </HeroButton>
        }
      />

      {/* Overview Analytics Bento Box */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Shattered Boxes */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 p-5 rounded-2xl flex items-center gap-4 shadow-elevation-soft">
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[10px] text-default-500 uppercase font-bold tracking-wider font-mono">Shattered Cartons (Boxes)</span>
            <span className="text-2xl font-bold text-foreground font-mono">{statsTotalShatteredBoxes} <span className="text-xs font-sans text-rose-500">boxes</span></span>
          </div>
        </div>

        {/* Total Shattered Pieces */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 p-5 rounded-2xl flex items-center gap-4 shadow-elevation-soft">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl border border-amber-500/20">
            <Trash className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[10px] text-default-500 uppercase font-bold tracking-wider font-mono">Broken Local Pieces</span>
            <span className="text-2xl font-bold text-foreground font-mono">{statsTotalShatteredPieces} <span className="text-xs font-sans text-amber-500">pcs</span></span>
          </div>
        </div>

        {/* Estimated Cost of Damages */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 p-5 rounded-2xl flex items-center gap-4 shadow-elevation-soft">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[10px] text-default-500 uppercase font-bold tracking-wider font-mono">Estimated Total Loss</span>
            <span className="text-2xl font-bold text-emerald-500 font-mono">{formatCurrency(statsFinancialImpact)}</span>
          </div>
        </div>

        {/* Total Incurred Incidents */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 p-5 rounded-2xl flex items-center gap-4 shadow-elevation-soft">
          <div className="p-3 bg-zinc-100 dark:bg-zinc-800 text-foreground rounded-2xl border border-zinc-200/50 dark:border-white/5">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[10px] text-default-500 uppercase font-bold tracking-wider font-mono">Incident Log Counter</span>
            <span className="text-2xl font-bold text-foreground font-mono">{filteredLogs.length} <span className="text-xs font-sans text-default-400">records</span></span>
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
            className="bg-white dark:bg-zinc-900 border border-rose-500/30 rounded-3xl p-6 shadow-elevation-soft relative text-left"
          >
            <div className="absolute top-5 right-5">
              <HeroButton 
                onClick={() => setShowAddForm(false)}
                variant="flat"
                size="sm"
                radius="full"
                className="font-bold text-xs"
              >
                Close
              </HeroButton>
            </div>

            <div className="border-b border-divider/20 pb-3 mb-5 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-tight text-foreground">Log Material Damage/Breakage</h3>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Product Selection Search deck */}
              <div className="space-y-3 bg-zinc-100/90 dark:bg-zinc-800/80 p-4 rounded-2xl border border-zinc-200/50 dark:border-white/5 shadow-2xs">
                <label className="block text-[10px] uppercase font-bold text-rose-500 tracking-wider font-mono">Product Selection</label>
                
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-default-400" />
                  <input
                    type="text"
                    placeholder="Type name, brand, or SKU..."
                    value={productSearch ?? ''}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-xs font-medium rounded-full border border-zinc-200/50 dark:border-white/5 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-rose-500/30 text-foreground transition-all"
                  />
                </div>

                <div className="space-y-2 max-h-[170px] overflow-y-auto">
                  {filteredProductsSelect.map(p => {
                    const isSelected = p.id === selectedProductId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedProductId(p.id)}
                        className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected 
                            ? 'border-rose-500/40 bg-rose-500/10 text-rose-500 font-bold shadow-2xs' 
                            : 'border-zinc-200/60 dark:border-white/5 bg-white dark:bg-zinc-900 hover:bg-zinc-100/80 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <div>
                          <div className="text-[11px] font-bold truncate max-w-[170px]">{p.productName}</div>
                          <div className="text-[9px] text-default-500 mt-0.5 font-mono">{p.sku} | {p.size}</div>
                        </div>
                        <div className="text-right">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full font-mono ${p.stockQuantity <= (p.minimumStock ?? 0) ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'}`}>
                            {p.stockQuantity} box
                          </span>
                        </div>
                      </button>
                    );
                  })}
                  {filteredProductsSelect.length === 0 && (
                    <div className="text-[10px] text-default-500 text-center py-4 italic">No matching tiles found.</div>
                  )}
                </div>

                {selectedProductMeta && (
                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-rose-500/20 text-xs space-y-1 shadow-2xs">
                    <span className="font-bold text-foreground block text-[11px]">Selected Product Details:</span>
                    <div className="flex justify-between text-[11px] text-default-500">
                      <span>Dimensions:</span>
                      <span className="font-bold text-foreground">{selectedProductMeta.size}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-default-500">
                      <span>Tiles / Box:</span>
                      <span className="font-bold text-foreground font-mono">{selectedProductMeta.boxQuantity} pieces</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-default-500">
                      <span>Category:</span>
                      <span className="font-bold text-foreground">{selectedProductMeta.category}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Center Column: Branch, Quantities & Unit Type */}
              <div className="space-y-4">
                <div>
                  {currentUser?.role === UserRole.ADMIN ? (
                    <HeroSelect
                      label="2. Reporting Showroom Branch"
                      value={selectedBranchId ?? ''}
                      placeholder="-- Choose Showroom Branch --"
                      onValueChange={(val) => setSelectedBranchId(val)}
                      radius="lg"
                      items={branches.map(b => ({
                        key: b.id,
                        value: b.id,
                        label: getBranchOptionLabel(b),
                      }))}
                    />
                  ) : (
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-default-500 tracking-wider">2. Reporting Showroom Branch</label>
                      <div className="w-full p-2.5 text-xs font-bold bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-white/5 text-foreground rounded-xl">
                        {branches.find(b => b.id === (currentUser?.branchAssignmentId || 'B1'))?.name || 'N/A'}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-default-500 tracking-wider mb-1.5">Damaged Qty</label>
                    <input
                      type="number"
                      min={1}
                      value={quantity ?? ''}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full p-2 text-xs font-bold font-mono rounded-xl border border-zinc-200/50 dark:border-white/5 bg-zinc-100 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-rose-500/30 text-foreground transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-default-500 tracking-wider mb-1.5">Unit Standard</label>
                    <div className="flex rounded-full border border-zinc-200/50 dark:border-white/5 overflow-hidden bg-zinc-100 dark:bg-zinc-800 p-1 items-center">
                      <button
                        type="button"
                        onClick={() => setUnitType('Box')}
                        className={`flex-1 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
                          unitType === 'Box' 
                            ? 'bg-white dark:bg-zinc-900 text-rose-500 shadow-2xs font-bold' 
                            : 'text-default-500 hover:text-foreground'
                        }`}
                      >
                        Box
                      </button>
                      <button
                        type="button"
                        onClick={() => setUnitType('Piece')}
                        className={`flex-1 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
                          unitType === 'Piece' 
                            ? 'bg-white dark:bg-zinc-900 text-rose-500 shadow-2xs font-bold' 
                            : 'text-default-500 hover:text-foreground'
                        }`}
                      >
                        Piece
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <HeroSelect
                    label="Incident Cause"
                    value={category ?? ''}
                    onValueChange={(val) => setCategory(val as DamageCategory)}
                    radius="lg"
                    items={[
                      { key: 'Warehouse Breakage', value: 'Warehouse Breakage', label: 'Warehouse Drop / Forklift Clash' },
                      { key: 'BOA', value: 'BOA', label: 'BOA (Broken On Arrival from Supplier)' },
                      { key: 'Showroom Casualty', value: 'Showroom Casualty', label: 'Showroom Display Chipped' },
                      { key: 'Delivery Transit', value: 'Delivery Transit', label: 'Transport Transit Fractures' },
                    ]}
                  />
                </div>
              </div>

              {/* Right Column: Actions Taken & Incident Log Notes */}
              <div className="space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <HeroSelect
                      label="Action Taken"
                      value={actionTaken ?? ''}
                      onValueChange={(val) => setActionTaken(val as DamageActionTaken)}
                      radius="lg"
                      items={[
                        { key: 'Disposed / Scrapped', value: 'Disposed / Scrapped', label: 'Shattered - Disposed & Scrapped' },
                        { key: 'Saved for Mosaic', value: 'Saved for Mosaic', label: 'Saved for Low-Cost Mosaic Sales' },
                        { key: 'Claimed from Supplier / Insurance Code', value: 'Claimed from Supplier / Insurance Code', label: 'Pending Supplier Cargo Claim / BOA Reimbursement' },
                        { key: 'Returned for Credit', value: 'Returned for Credit', label: 'Returned to Supplier Warehouse for Credit Note' },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-default-500 tracking-wider mb-1.5">Audit Notes</label>
                    <textarea
                      placeholder="Add optional observations or details..."
                      value={notes ?? ''}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full p-2.5 text-xs font-medium rounded-xl border border-zinc-200/50 dark:border-white/5 bg-zinc-100 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-rose-500/30 text-foreground placeholder:text-default-400 transition-all"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <HeroButton
                    type="submit"
                    color="danger"
                    variant="solid"
                    size="sm"
                    radius="full"
                    className="w-full font-bold text-xs uppercase tracking-wider shadow-[0_2px_8px_rgba(243,18,96,0.25)]"
                  >
                    Commit Stock Damage Reduction
                  </HeroButton>
                </div>
              </div>

            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Filterable History List and Sidebar Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 text-left">
        
        {/* Left Side: Filter Panels */}
        <div className="space-y-4 bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 p-5 rounded-2xl shadow-elevation-soft h-fit">
          <div className="flex items-center gap-2 border-b border-divider/20 pb-2 mb-3">
            <Sliders className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Filters</h3>
          </div>

          {/* Text Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-default-500 tracking-wider font-mono">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-default-400" />
              <input
                type="text"
                placeholder="Product, SKU, notes..."
                value={searchTerm ?? ''}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs font-medium rounded-full border border-zinc-200/50 dark:border-white/5 bg-zinc-100 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground transition-all"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-default-500 tracking-wider font-mono mb-1">Category</label>
            <HeroDropdownSelect
              items={[
                { key: 'All', label: 'All Causes' },
                { key: 'Warehouse Breakage', label: 'Warehouse Drop / Forklift' },
                { key: 'BOA', label: 'BOA (Broken on Arrival)' },
                { key: 'Showroom Casualty', label: 'Showroom Casualty' },
                { key: 'Delivery Transit', label: 'Delivery Transit' },
              ]}
              selectedKey={categoryFilter ?? 'All'}
              onSelectionChange={(val) => setCategoryFilter(val)}
              size="sm"
              variant="pill"
              className="w-full"
            />
          </div>

          {/* Branch Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-default-500 tracking-wider font-mono mb-1">Branch</label>
            {currentUser?.role === UserRole.ADMIN ? (
              <HeroDropdownSelect
                items={[
                  { key: 'All', label: 'All Branches' },
                  ...branches.map(b => ({
                    key: b.id,
                    label: getBranchOptionLabel(b),
                  })),
                ]}
                selectedKey={branchFilter ?? 'All'}
                onSelectionChange={(val) => setBranchFilter(val)}
                size="sm"
                variant="pill"
                className="w-full"
              />
            ) : (
              <div className="w-full p-2 text-xs font-semibold rounded-xl border border-zinc-200/50 dark:border-white/5 bg-zinc-100 dark:bg-zinc-800 text-foreground">
                {branches.find(b => b.id === (currentUser?.branchAssignmentId || 'B1'))?.name || 'N/A'}
              </div>
            )}
          </div>

          {/* Category Quick stats bar */}
          <div className="border-t border-divider/20 pt-4 mt-2">
            <span className="text-[9px] uppercase font-bold text-default-400 tracking-wider block mb-2 font-mono">Category Breakdowns</span>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center bg-rose-500/10 p-2 rounded-xl text-rose-500 border border-rose-500/20">
                <span className="font-bold text-[10px] uppercase tracking-wider">Broken on Arrival</span>
                <span className="font-bold font-mono">{categorySummaryCount['BOA'] || 0} units</span>
              </div>
              <div className="flex justify-between items-center bg-amber-500/10 p-2 rounded-xl text-amber-500 border border-amber-500/20">
                <span className="font-bold text-[10px] uppercase tracking-wider">Warehouse Drop</span>
                <span className="font-bold font-mono">{categorySummaryCount['Warehouse Breakage'] || 0} units</span>
              </div>
              <div className="flex justify-between items-center bg-primary/10 p-2 rounded-xl text-primary border border-primary/20">
                <span className="font-bold text-[10px] uppercase tracking-wider">Delivery Transit</span>
                <span className="font-bold font-mono">{categorySummaryCount['Delivery Transit'] || 0} units</span>
              </div>
              <div className="flex justify-between items-center bg-purple-500/10 p-2 rounded-xl text-purple-600 dark:text-purple-400 border border-purple-500/20">
                <span className="font-bold text-[10px] uppercase tracking-wider">Showroom Casualty</span>
                <span className="font-bold font-mono">{categorySummaryCount['Showroom Casualty'] || 0} units</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Chronological Incidents Table */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 rounded-2xl overflow-hidden shadow-elevation-soft">
            <div className="bg-zinc-100/80 dark:bg-zinc-800/80 px-5 py-4 border-b border-divider/20 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Audit Logs &amp; Breakage Journal</h3>
                <p className="text-[10px] text-default-500 font-medium mt-0.5">Total matched index: {filteredLogs.length} incident entries.</p>
              </div>
              
              <div className="flex items-center gap-1">
                <span className="text-[10px] uppercase font-bold text-default-500 bg-white dark:bg-zinc-900 px-2.5 py-1 rounded-full border border-zinc-200/60 dark:border-white/10 font-mono">
                  Chronological
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left min-w-[760px]">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/40 border-b border-divider/20 text-[10px] font-bold uppercase text-default-500 tracking-wider">
                    <th className="py-3 px-4">Incident ID</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Product SKU / Code</th>
                    <th className="py-3 px-4">Showroom Branch</th>
                    <th className="py-3 px-4 text-right">Quantity</th>
                    <th className="py-3 px-4">Breakage Reason</th>
                    <th className="py-3 px-4">Action / Treatment</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider/10 text-xs">
                  {filteredLogs
                    .slice((damagePage - 1) * damagePageSize, damagePage * damagePageSize)
                    .map(log => {
                      let catColorAndLabel = 'bg-zinc-100 dark:bg-zinc-800 text-default-500 border-zinc-200/50 dark:border-white/5';
                      if (log.category === 'BOA') catColorAndLabel = 'bg-rose-500/10 text-rose-500 border-rose-500/20';
                      if (log.category === 'Warehouse Breakage') catColorAndLabel = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
                      if (log.category === 'Delivery Transit') catColorAndLabel = 'bg-primary/10 text-primary border-primary/20';
                      if (log.category === 'Showroom Casualty') catColorAndLabel = 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';

                      let actionLabelColor = 'text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800';
                      if (log.actionTaken === 'Saved for Mosaic') actionLabelColor = 'text-amber-700 dark:text-amber-300 bg-amber-500/15';
                      if (log.actionTaken === 'Returned for Credit') actionLabelColor = 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/15';
                      if (log.actionTaken === 'Claimed from Supplier / Insurance Code') actionLabelColor = 'text-rose-700 dark:text-rose-300 bg-rose-500/15';

                      return (
                        <tr key={log.id} className="hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition font-medium">
                          <td className="py-3.5 px-4 font-bold text-default-400 font-mono text-[11px]">
                            {log.id.slice(0, 12)}
                          </td>
                          <td className="py-3.5 px-4 text-default-500 whitespace-nowrap font-mono text-[11px]">
                            {new Date(log.reportedAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour12: true, hour: 'numeric', minute: 'numeric' })}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="block font-bold text-foreground max-w-[220px] truncate">{log.productName}</span>
                            <span className="text-[10px] text-default-500 uppercase block mt-0.5 font-mono">{log.productSku}</span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-foreground font-medium">
                            {log.branchName}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold">
                            <span className="text-rose-500 text-sm">-{Math.abs(Number(log.quantity) || 0)}</span>
                            <span className="text-[9px] uppercase block tracking-wider text-default-400 mt-0.5 font-sans">{log.unitType}s</span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 text-[9.5px] font-bold uppercase border rounded-full inline-block font-mono ${catColorAndLabel}`}>
                              {log.category === 'BOA' ? 'BOA Supplier' : log.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 min-w-[140px]">
                            <span className={`px-2.5 py-0.5 text-[9.5px] font-bold rounded-full block text-center truncate max-w-[180px] font-mono ${actionLabelColor}`}>
                              {log.actionTaken}
                            </span>
                            {log.notes && (
                              <span className="text-[10px] text-default-500 block truncate max-w-[200px] italic mt-1" title={log.notes}>
                                "{log.notes}"
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (isRowClearingBlocked()) {
                                  setAlertMessage(`Action Restricted: Cannot delete damage log records because the register is currently holding: ${getRowClearingBlockedReason()}`);
                                  return;
                                }
                                setConfirmTargetId(log.id);
                              }}
                              className="p-1.5 hover:bg-rose-500/10 text-default-400 hover:text-rose-500 rounded-full transition border-0 cursor-pointer bg-transparent disabled:opacity-40 active:scale-95"
                              title={isRowClearingBlocked() ? `Deactivated: register is holding ${getRowClearingBlockedReason()}` : "Soft-delete damage log"}
                              disabled={isRowClearingBlocked()}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-default-400 italic bg-white dark:bg-zinc-900">
                        <Archive className="h-8 w-8 mx-auto stroke-[1.5] text-default-300 mb-2" />
                        No breakage incidents or BOA claims are found matching current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <TablePagination
              currentPage={damagePage}
              totalItems={filteredLogs.length}
              pageSize={damagePageSize}
              onPageChange={setDamagePage}
              itemName="incidents"
            />
          </div>

          {/* Operational Policy reminder footer Card */}
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 flex items-start gap-3 shadow-2xs">
            <Info className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-left">
              <span className="block text-[11px] font-bold uppercase text-rose-500 tracking-wider font-mono">Corporate Tile Breakage Compliance Directive</span>
              <p className="text-[11px] text-default-500 font-medium leading-relaxed">
                All logs processed in this damage registry trigger automatic inventory adjustments and log real-time audit ledger sequences. In the event of high volume freight damages (specifically Broken on Arrival cargos exceeding 20 boxes), branch managers must capture site delivery container pictures to support procurement reimbursement claims from suppliers.
              </p>
            </div>
          </div>

          {/* Delete Confirmation Modal */}
          <ConfirmationModal
            isOpen={!!confirmTargetId}
            title="Confirm Soft-Delete"
            alertType="danger"
            confirmText="Yes, Soft-Delete"
            cancelText="Cancel"
            message="Are you sure you want to soft-delete this damage log entry? The record will be archived for audit compliance and can be restored by system administrators."
            onConfirm={() => {
              if (confirmTargetId) {
                deleteDamageLog(confirmTargetId);
                setConfirmTargetId(null);
              }
            }}
            onCancel={() => setConfirmTargetId(null)}
          />

          {/* Restriction Alert Modal */}
          <ConfirmationModal
            isOpen={!!alertMessage}
            title="Action Restricted"
            alertType="warning"
            confirmText="Understand"
            cancelText="Close"
            message={alertMessage || ''}
            onConfirm={() => setAlertMessage(null)}
            onCancel={() => setAlertMessage(null)}
          />
        </div>
      </div>
    </div>
  );
};

export default DamageRegisterModule;
