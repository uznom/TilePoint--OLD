/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Branch, InventoryLocationStock, UserRole, User } from '../../types/db';
import {
  Search,
  Plus,
  Upload,
  ArrowUpDown,
  Printer,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Barcode,
  Truck,
  Sliders,
  Edit2,
  Trash2,
  Clock
} from 'lucide-react';
import { getBranchStockQuantity, getBranchStockRecord, getBranchOptionLabel } from '../../lib/branchUtils';
import { formatCurrency } from '../../utils/formatters';
import { TablePagination } from '../TablePagination';
import { createSearchIndex, searchIndex } from '../../utils/searchIndex';
import { useVirtualList } from '../../hooks/useVirtualList';
import { StyledBarcode } from '../../utils/barcodeGenerator';

export interface CatalogStockLedgerProps {
  branchProducts: Product[];
  branchStock: InventoryLocationStock[];
  branches: Branch[];
  categories: string[];
  currentUser: User;
  isAdminUser: boolean;
  allowedToModify: boolean;
  hasActiveShift: boolean;
  canSeeFinancialCostsAndSources: boolean;
  selectedViewBranchId: string;
  handleBranchSelect: (branchId: string) => void;
  term: string;
  setTerm: (term: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  sortBy: 'default' | 'qty-desc' | 'qty-asc' | 'alpha-asc' | 'alpha-desc';
  setSortBy: (sort: 'default' | 'qty-desc' | 'qty-asc' | 'alpha-asc' | 'alpha-desc') => void;
  selectedProdIds: Record<string, boolean>;
  setSelectedProdIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  expandedProductIds: Record<string, boolean>;
  toggleProductExpand: (productId: string) => void;
  highlightedProductId: string | null;
  isCompactColumns: boolean;
  prodPage: number;
  setProdPage: (page: number) => void;
  prodsPerPage: number;
  setShowPortabilityHubModal: (show: boolean) => void;
  handleOpenAdd: () => void;
  handleBulkSimulatePrint: (products: Product[]) => void;
  setBulkDamageQuantities: (qtys: Record<string, number>) => void;
  setBulkDamageBranchId: (branchId: string) => void;
  setShowBulkDamageModal: (show: boolean) => void;
  handleOpenCodesModal: (product: Product) => void;
  handleQueueRestock: (productId: string) => void;
  handleOpenAdjust: (product: Product) => void;
  handleOpenEdit: (product: Product) => void;
  handleDeleteTrigger: (productId: string, productName: string) => void;
  updateBranchLowStockThreshold: (productId: string, branchId: string, limit: number) => void;
  showToast: (msg: string) => void;
}

export const CatalogStockLedger: React.FC<CatalogStockLedgerProps> = ({
  branchProducts,
  branchStock,
  branches,
  categories,
  currentUser,
  isAdminUser,
  allowedToModify,
  hasActiveShift,
  canSeeFinancialCostsAndSources,
  selectedViewBranchId,
  handleBranchSelect,
  term,
  setTerm,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
  selectedProdIds,
  setSelectedProdIds,
  expandedProductIds,
  toggleProductExpand,
  highlightedProductId,
  isCompactColumns,
  prodPage,
  setProdPage,
  prodsPerPage,
  setShowPortabilityHubModal,
  handleOpenAdd,
  handleBulkSimulatePrint,
  setBulkDamageQuantities,
  setBulkDamageBranchId,
  setShowBulkDamageModal,
  handleOpenCodesModal,
  handleQueueRestock,
  handleOpenAdjust,
  handleOpenEdit,
  handleDeleteTrigger,
  updateBranchLowStockThreshold,
  showToast
}) => {
  // Pre-indexed search index for catalog products
  const productSearchIndex = useMemo(() => {
    return createSearchIndex(branchProducts, p =>
      `${p.productName} ${p.productCode} ${p.barcode || ''} ${p.sku || ''} ${p.brand || ''} ${p.designName || ''} ${p.category || ''}`
    );
  }, [branchProducts]);

  // Catalog Filtration & Sorting
  const filteredProducts = useMemo(() => {
    const searchMatches = searchIndex(productSearchIndex, term);
    const filtered = searchMatches.filter(p => {
      const matchCategory = categoryFilter === 'All' || p.category === categoryFilter;
      if (!matchCategory) return false;

      if (statusFilter === 'All') return true;

      const qty = getBranchStockQuantity(p, selectedViewBranchId, branchStock, branches);
      const bsRec = getBranchStockRecord(p, selectedViewBranchId, branchStock, branches);
      const threshold = selectedViewBranchId === 'consolidated'
        ? p.minimumStock
        : (bsRec?.lowStockThresholdOverride ?? p.minimumStock);

      let currentStatus = 'In Stock';
      if (qty === 0) {
        currentStatus = 'Out of Stock';
      } else if (qty <= threshold * 0.5) {
        currentStatus = 'Critical';
      } else if (qty <= threshold) {
        currentStatus = 'Low Stock';
      }

      return statusFilter === currentStatus;
    });

    if (sortBy === 'qty-desc') {
      return [...filtered].sort((a, b) => {
        const qtyA = getBranchStockQuantity(a, selectedViewBranchId, branchStock, branches);
        const qtyB = getBranchStockQuantity(b, selectedViewBranchId, branchStock, branches);
        return qtyB - qtyA;
      });
    }
    if (sortBy === 'qty-asc') {
      return [...filtered].sort((a, b) => {
        const qtyA = getBranchStockQuantity(a, selectedViewBranchId, branchStock, branches);
        const qtyB = getBranchStockQuantity(b, selectedViewBranchId, branchStock, branches);
        return qtyA - qtyB;
      });
    }
    if (sortBy === 'alpha-asc') {
      return [...filtered].sort((a, b) => a.productName.localeCompare(b.productName));
    }
    if (sortBy === 'alpha-desc') {
      return [...filtered].sort((a, b) => b.productName.localeCompare(a.productName));
    }

    return filtered;
  }, [productSearchIndex, branchStock, branches, term, categoryFilter, statusFilter, selectedViewBranchId, sortBy]);

  const totalProdPages = Math.ceil(filteredProducts.length / prodsPerPage) || 1;

  useEffect(() => {
    if (prodPage > totalProdPages && totalProdPages > 0) {
      setProdPage(totalProdPages);
    }
  }, [prodPage, totalProdPages, setProdPage]);

  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice((prodPage - 1) * prodsPerPage, prodPage * prodsPerPage);
  }, [filteredProducts, prodPage, prodsPerPage]);

  const catalogTableContainerRef = useRef<HTMLDivElement>(null);

  const {
    containerRef: catalogVirtualRef,
    handleScroll: handleCatalogVirtualScroll,
    visibleIndices: visibleCatalogIndices,
    paddingTop: catalogPaddingTop,
    paddingBottom: catalogPaddingBottom
  } = useVirtualList({
    itemCount: paginatedProducts.length,
    itemHeight: 52
  });

  const handleToggleSelectAll = () => {
    if (!allowedToModify) {
      showToast('Access Denied: Row selection is restricted to authorized roles (Admin/Manager).');
      return;
    }
    const visibleIds = paginatedProducts.map(p => p.id);
    const allSelected = visibleIds.every(id => !!selectedProdIds[id]);

    const nextSelected = { ...selectedProdIds };
    visibleIds.forEach(id => {
      nextSelected[id] = !allSelected;
    });
    setSelectedProdIds(nextSelected);
  };

  const getSelectedProducts = () => {
    return branchProducts.filter(p => selectedProdIds[p.id]);
  };

  return (
    <>
      {/* Main Filter Controller Panel Card */}
      <div className="bg-m3-surface-low p-4 rounded-[28px] border border-m3-outline-variant/20 shadow-sm space-y-4">
        <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between">
          {/* Search query box */}
          <div className="relative w-full xl:max-w-md shrink-0">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-m3-primary">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder={branchProducts.some(p => !p.isDeleted) ? "Filter by Name, SKU, design name, code..." : "No items available to filter in this branch"}
              disabled={!branchProducts.some(p => !p.isDeleted)}
              value={term}
              onChange={e => setTerm(e.target.value)}
              className="w-full bg-m3-surface-lowest border border-m3-outline-variant/25 focus:border-m3-primary px-3.5 py-2.5 pl-10 pr-8 text-xs text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-primary/10 transition-all rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {term && (
              <button
                onClick={() => setTerm('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-rose-500 cursor-pointer text-xs font-black transition-colors"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Advanced catalog filters and commands */}
          <div className="flex flex-wrap gap-2.5 w-full justify-start xl:justify-end items-center">
            {/* Branch view select / consolidated */}
            <div className="flex items-center gap-1.5 bg-m3-surface-lowest border border-emerald-500/30 px-3 py-1.5 rounded-xl shadow-sm">
              <span className="text-[9px] uppercase font-black tracking-widest text-emerald-600 font-mono">Branch:</span>
              <select
                value={selectedViewBranchId ?? ''}
                onChange={e => handleBranchSelect(e.target.value)}
                className="bg-transparent text-xs text-emerald-500 focus:outline-none cursor-pointer transition-colors font-extrabold outline-none"
              >
                {isAdminUser && (
                  <option value="consolidated">HQ Consolidated (All Branches)</option>
                )}
                {branches.filter(b => !b.isDeleted && (isAdminUser || b.id === (currentUser?.branchAssignmentId || 'B1'))).map((b) => (
                  <option key={b.id} value={b.id}>{getBranchOptionLabel(b)}</option>
                ))}
              </select>
            </div>

            {/* Category select */}
            <div className="flex items-center gap-1.5 bg-m3-surface-lowest border border-m3-outline-variant/25 px-3 py-1.5 rounded-xl shadow-sm">
              <span className="text-[9px] uppercase font-black tracking-widest text-m3-on-surface-variant font-mono">Category:</span>
              <select
                value={categoryFilter ?? ''}
                onChange={e => setCategoryFilter(e.target.value)}
                className="bg-transparent text-xs text-m3-on-surface focus:outline-none cursor-pointer transition-colors font-semibold outline-none"
              >
                <option value="All">All Categories ({branchProducts.length})</option>
                {categories.map((cat, i) => {
                  const count = branchProducts.filter(p => p.category === cat).length;
                  return (
                    <option key={i} value={cat}>{cat} {count > 0 ? `(${count})` : ''}</option>
                  );
                })}
              </select>
            </div>

            {/* Status select */}
            <div className="flex items-center gap-1.5 bg-m3-surface-lowest border border-m3-outline-variant/25 px-3 py-1.5 rounded-xl shadow-sm">
              <span className="text-[9px] uppercase font-black tracking-widest text-m3-on-surface-variant font-mono">Status:</span>
              <select
                value={statusFilter ?? ''}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs text-m3-on-surface focus:outline-none cursor-pointer transition-colors font-semibold outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="In Stock">In Stock</option>
                <option value="Low Stock">● Low Stock</option>
                <option value="Critical">● Critical Stock</option>
                <option value="Out of Stock">● Out of Stock</option>
              </select>
            </div>

            {/* Sort select */}
            <div className="flex items-center gap-1.5 bg-m3-surface-lowest border border-m3-outline-variant/25 px-3 py-1.5 rounded-xl shadow-sm">
              <ArrowUpDown className="h-3.5 w-3.5 text-m3-primary" />
              <span className="text-[9px] uppercase font-black tracking-widest text-m3-on-surface-variant font-mono">Sort By:</span>
              <select
                value={sortBy ?? ''}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs text-m3-on-surface focus:outline-none cursor-pointer transition-colors font-semibold outline-none"
              >
                <option value="default">Default Order</option>
                <option value="qty-desc">Stock Quantity (High → Low)</option>
                <option value="qty-asc">Stock Quantity (Low → High)</option>
                <option value="alpha-asc">Alphabetical (A → Z)</option>
                <option value="alpha-desc">Alphabetical (Z → A)</option>
              </select>
            </div>

            {allowedToModify && (
              <>
                <button
                  onClick={() => setShowPortabilityHubModal(true)}
                  className="p-2 px-3.5 text-m3-primary hover:bg-m3-outline-variant/25 text-xs font-black flex items-center gap-1.5 cursor-pointer rounded-full transition-colors border border-m3-outline-variant/15 hover:border-m3-primary/30"
                  title="Open JSON Import/Export Portability Modal Hub"
                >
                  <Upload className="h-4 w-4 text-emerald-500 animate-pulse" /> Data Portability Hub
                </button>

                <button
                  onClick={handleOpenAdd}
                  className="m3-btn-primary flex items-center gap-1.5 cursor-pointer shadow-sm text-xs px-4"
                >
                  <Plus className="h-4 w-4" /> Register Product
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Operations Panel */}
      {!hasActiveShift && getSelectedProducts().length > 0 && (
        <div className="bg-m3-surface-low border border-m3-outline-variant/25 p-3.5 rounded-[22px] flex flex-wrap items-center justify-between gap-3 shadow-md animate-fade-in mb-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-m3-primary animate-pulse" />
            <span className="text-xs font-black text-m3-on-surface">
              {getSelectedProducts().length} {getSelectedProducts().length === 1 ? 'item' : 'items'} selected for bulk actions
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkSimulatePrint(getSelectedProducts())}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-m3-primary/30 text-m3-primary hover:bg-m3-primary/10 text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-all active:scale-95 bg-m3-surface-lowest shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Barcodes</span>
            </button>
            <button
              onClick={() => {
                const selected = getSelectedProducts();
                const initialQtys: Record<string, number> = {};
                selected.forEach(p => {
                  initialQtys[p.id] = 1;
                });
                setBulkDamageQuantities(initialQtys);
                if (selectedViewBranchId !== 'consolidated') {
                  setBulkDamageBranchId(selectedViewBranchId);
                } else {
                  setBulkDamageBranchId('B1');
                }
                setShowBulkDamageModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 text-rose-500 text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-all active:scale-95"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Move to Damage Register</span>
            </button>
            <button
              onClick={() => setSelectedProdIds({})}
              className="px-3 py-1.5 rounded-xl text-zinc-400 hover:text-rose-500 text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-all hover:bg-m3-surface-lowest"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Database Catalog Table List */}
      <div className="m3-card shadow-sm p-0 overflow-hidden relative">
        <div
          ref={(node) => {
            (catalogTableContainerRef as any).current = node;
            (catalogVirtualRef as any).current = node;
          }}
          onScroll={handleCatalogVirtualScroll}
          className="overflow-auto scrollbar-thin scrollbar-thumb-m3-outline-variant min-h-[280px]"
        >
          <table className={`w-full text-left border-collapse table-auto text-xs transition-all ${isCompactColumns ? 'min-w-[700px]' : 'min-w-[1280px]'}`}>
            <thead>
              <tr className="border-b border-m3-outline-variant/20 bg-m3-surface/30 text-[10px] uppercase font-bold text-m3-on-surface-variant tracking-wider">
                {/* Checkbox column header */}
                {!hasActiveShift && (
                  <th className="py-3 px-2 w-10 text-center select-none bg-m3-surface-low/30 border-r border-m3-outline-variant/10">
                    <input
                      type="checkbox"
                      checked={paginatedProducts.length > 0 && paginatedProducts.every(p => !!selectedProdIds[p.id])}
                      onChange={handleToggleSelectAll}
                      className="rounded border-zinc-300 dark:border-zinc-700 text-m3-primary focus:ring-m3-primary/35 cursor-pointer h-3.5 w-3.5 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Select/Deselect visible"
                      disabled={!allowedToModify}
                    />
                  </th>
                )}
                <th className="py-3 px-2 w-10 text-center bg-m3-surface-low/40 select-none"></th>
                <th className="py-3 px-4">Code / SKU</th>
                {!isCompactColumns && <th className="py-3 px-4">Identifier codes</th>}
                <th className="py-3 px-4">Product Details</th>
                {!isCompactColumns && <th className="py-3 px-4">Category / Brand</th>}
                {!isCompactColumns && <th className="py-3 px-4 text-center">Packaging dimensions</th>}
                {!isCompactColumns && canSeeFinancialCostsAndSources && <th className="py-3 px-4 text-right">Unit cost</th>}
                <th className="py-3 px-4 text-right">Sale Price</th>
                <th className="py-3 px-4 text-center">Stock</th>
                {!isCompactColumns && <th className="py-3 px-2 text-center">Threshold</th>}
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-m3-outline-variant/10 text-m3-on-surface/90">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={hasActiveShift ? 9 : 10} className="py-12 text-center text-sm font-medium text-m3-on-surface-variant/70">
                    No products found matching the search criteria or selected branch filter.
                  </td>
                </tr>
              ) : (
                <>
                  {catalogPaddingTop > 0 && (
                    <tr style={{ height: catalogPaddingTop }}>
                      <td colSpan={hasActiveShift ? (isCompactColumns ? 7 : 13) : (isCompactColumns ? 8 : 14)} className="p-0 border-0" />
                    </tr>
                  )}
                  {visibleCatalogIndices.map((idx) => {
                    const p = paginatedProducts[idx];
                    if (!p) return null;

                    // Determine status indicators based on selected branch scope or consolidated HQ view
                    const qty = getBranchStockQuantity(p, selectedViewBranchId, branchStock, branches);

                    const bsRec = getBranchStockRecord(p, selectedViewBranchId, branchStock, branches);
                    const threshold = selectedViewBranchId === 'consolidated'
                      ? p.minimumStock
                      : (bsRec?.lowStockThresholdOverride ?? p.minimumStock);

                    let statusLabel = 'In Stock';
                    let statusClass = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25';

                    if (qty === 0) {
                      statusLabel = 'Out of Stock';
                      statusClass = 'bg-m3-outline-variant/15 text-m3-on-surface-variant/75 border-transparent';
                    } else if (qty <= threshold * 0.5) {
                      statusLabel = 'Critical';
                      statusClass = 'bg-rose-500/10 text-rose-500 border-rose-500/25 font-black animate-pulse';
                    } else if (qty <= threshold) {
                      statusLabel = 'Low Stock';
                      statusClass = 'bg-amber-500/10 text-amber-500 border-amber-500/25';
                    }

                    const isExpanded = !!expandedProductIds[p.id];

                    return (
                      <React.Fragment key={p.id}>
                        <tr
                          className={`hover:bg-m3-surface-low/50 transition-all cursor-pointer ${
                            p.id === highlightedProductId
                              ? 'animate-pulse-twice ring-2 ring-rose-500/80 bg-rose-500/5'
                              : ''
                          } ${isExpanded ? 'bg-m3-primary/5 hover:bg-m3-primary/10' : ''}`}
                          onClick={() => toggleProductExpand(p.id)}
                          title="Click to expand/collapse full tile specifications"
                        >
                          {/* Checkbox Selection column */}
                          {!hasActiveShift && (
                            <td className="py-3.5 px-2 text-center bg-m3-surface-low/10 border-r border-m3-outline-variant/10" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={!!selectedProdIds[p.id]}
                                onChange={() => {
                                  if (!allowedToModify) {
                                    showToast('Access Denied: Row selection is restricted to authorized roles (Admin/Manager).');
                                    return;
                                  }
                                  setSelectedProdIds(prev => ({
                                    ...prev,
                                    [p.id]: !prev[p.id]
                                  }));
                                }}
                                className="rounded border-zinc-300 dark:border-zinc-700 text-m3-primary focus:ring-m3-primary/35 cursor-pointer h-3.5 w-3.5 disabled:opacity-30 disabled:cursor-not-allowed"
                                disabled={!allowedToModify}
                              />
                            </td>
                          )}

                          {/* Expand/Collapse Toggle Button column */}
                          <td className="py-3.5 px-2 text-center bg-m3-surface-low/15" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => toggleProductExpand(p.id)}
                              className="p-1 hover:bg-m3-primary/10 text-m3-primary rounded-full cursor-pointer transition-all"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          </td>

                          {/* Code / SKU details */}
                          <td className="py-3.5 px-4 font-mono">
                            <div className="font-extrabold text-m3-primary">{p.productCode}</div>
                            <div className="text-[10px] text-m3-on-surface-variant font-bold">{p.sku}</div>
                          </td>

                          {/* Scannable keys info */}
                          {!isCompactColumns && (
                            <td className="py-3.5 px-4 font-mono text-[10px] text-zinc-500 select-all">
                              <div>BC: {p.barcode}</div>
                            </td>
                          )}

                          {/* Primary specifications block */}
                          <td className="py-3.5 px-4">
                            <strong className="text-m3-on-surface text-xs block truncate max-w-[240px]" title={p.productName}>
                              {p.productName}
                            </strong>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {p.designName && (
                                <span className="text-[10px] text-m3-on-surface-variant font-medium bg-m3-surface-lowest px-1.5 py-0.5 rounded border border-m3-outline-variant/15 font-sans">
                                  Design: {p.designName}
                                </span>
                              )}
                              {p.coveragePerBox ? (
                                <span className="text-[10px] text-m3-primary/95 font-bold bg-m3-primary/5 px-1.5 py-0.5 rounded border border-m3-primary/10 font-sans">
                                  Coverage: {p.coveragePerBox} m²
                                </span>
                              ) : null}
                              {p.origin && canSeeFinancialCostsAndSources && (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-black bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/10 font-sans" title={`Origin/Source: ${p.origin}`}>
                                  Source: {p.origin}
                                </span>
                              )}
                              {p.hasExpiration && (() => {
                                if (p.expirationDate) {
                                  const today = new Date();
                                  const exp = new Date(p.expirationDate);
                                  const diffTime = exp.getTime() - today.getTime();
                                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                  if (diffDays < 0) {
                                    return (
                                      <span className="text-[10px] text-rose-500 font-extrabold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 font-sans flex items-center gap-1" title={`Expired on ${p.expirationDate}. Quarantine immediately!`}>
                                        <Clock className="h-3 w-3 shrink-0 text-rose-500 animate-pulse" /> Expired ({p.expirationDate})
                                      </span>
                                    );
                                  } else if (diffDays <= 30) {
                                    return (
                                      <span className="text-[10px] text-amber-500 font-extrabold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-sans flex items-center gap-1" title={`Expiring soon on ${p.expirationDate}. Sell or move first!`}>
                                        <Clock className="h-3 w-3 shrink-0 text-amber-500 animate-pulse" /> Expiring Soon ({p.expirationDate})
                                      </span>
                                    );
                                  } else {
                                    return (
                                      <span className="text-[10px] text-emerald-500 font-extrabold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-sans flex items-center gap-1" title={`Valid until ${p.expirationDate}`}>
                                        <Clock className="h-3 w-3 shrink-0 text-emerald-500" /> Expiry Tracked ({p.expirationDate})
                                      </span>
                                    );
                                  }
                                } else {
                                  return (
                                    <span className="text-[10px] text-amber-500 font-extrabold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-sans flex items-center gap-1" title="This product has an expiration date requirement. Check calendar batches.">
                                      <Clock className="h-3 w-3 shrink-0 text-amber-500 animate-pulse" /> Expiry Tracked
                                    </span>
                                  );
                                }
                              })()}
                            </div>
                          </td>

                          {/* Category metadata */}
                          {!isCompactColumns && (
                            <td className="py-3.5 px-4">
                              <span className="bg-m3-outline-variant/25 px-2.5 py-0.5 rounded-full text-m3-on-surface text-[11px] font-bold">
                                {p.category}
                              </span>
                              <div className="text-[9px] text-m3-on-surface-variant mt-1.5 font-bold">Brand: {p.brand}</div>
                            </td>
                          )}

                          {/* Packaging dimensions and piece count */}
                          {!isCompactColumns && (
                            <td className="py-3.5 px-4 text-center font-bold">
                              <div className="text-m3-on-surface">{p.unit}</div>
                              {p.size && (
                                <div className="text-[10px] text-m3-on-surface-variant font-medium">
                                  {p.size} {p.boxQuantity > 1 && `(${p.boxQuantity} pcs)`}
                                </div>
                              )}
                            </td>
                          )}

                          {/* Financial unit cost */}
                          {!isCompactColumns && canSeeFinancialCostsAndSources && (
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-m3-on-surface">
                              {formatCurrency(p.costPrice)}
                            </td>
                          )}

                          {/* Retail selling price */}
                          <td className="py-3.5 px-4 text-right font-mono font-extrabold text-m3-primary">
                            {formatCurrency(p.sellingPrice)}
                          </td>

                          {/* Current physical warehouse qty */}
                          <td className="py-3.5 px-4 text-center font-mono text-sm font-extrabold">
                            <div className={
                              qty === 0
                                ? 'text-zinc-400 dark:text-zinc-600'
                                : qty <= threshold
                                ? 'text-m3-primary tracking-wide'
                                : 'text-m3-on-surface'
                            }>
                              {qty} <span className="text-[10px] text-m3-on-surface-variant font-normal">Boxes</span>
                            </div>
                          </td>

                          {/* Threshold warnings trigger limit */}
                          {!isCompactColumns && (
                            <td className="py-3.5 px-2 text-center font-mono text-m3-on-surface-variant font-bold">
                              {threshold}
                            </td>
                          )}

                          {/* Visual Status badge */}
                          <td className="py-3.5 px-4 text-center select-none">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase border ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </td>

                          {/* CRUD + Action buttons */}
                          <td className="py-3.5 px-4 text-center select-none" onClick={e => e.stopPropagation()}>
                            <div className="flex gap-0.5 justify-center">
                              <button
                                onClick={() => handleOpenCodesModal(p)}
                                className="p-1.5 text-zinc-500 hover:text-m3-primary hover:bg-m3-outline-variant/15 transition-all rounded-full cursor-pointer shrink-0"
                                title="View / Print Barcode Label"
                              >
                                <Barcode className="h-4 w-4" />
                              </button>

                              <button
                                onClick={() => handleQueueRestock(p.id)}
                                className="p-1.5 text-zinc-500 hover:text-amber-500 hover:bg-amber-500/10 transition-all rounded-full cursor-pointer shrink-0"
                                title="Queue Restock in Sourcing Desk (+50 Units)"
                              >
                                <Truck className="h-4 w-4" />
                              </button>

                              {allowedToModify && (
                                <>
                                  <button
                                    onClick={() => handleOpenAdjust(p)}
                                    className="p-1.5 text-zinc-500 hover:text-emerald-500 hover:bg-m3-outline-variant/15 transition-all rounded-full cursor-pointer shrink-0"
                                    title="Quick Stock Adjustment Intake/outtake"
                                  >
                                    <Sliders className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenEdit(p)}
                                    className="p-1.5 text-zinc-500 hover:text-m3-primary hover:bg-m3-outline-variant/15 transition-all rounded-full cursor-pointer shrink-0"
                                    title="Edit specs"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  {!hasActiveShift && (
                                    <button
                                      onClick={() => handleDeleteTrigger(p.id, p.productName)}
                                      className="p-1.5 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all rounded-full cursor-pointer shrink-0"
                                      title="Soft-delete listings"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Sub-Row with Detailed Layout Card */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <tr key={`${p.id}-expanded-details`}>
                              <td colSpan={hasActiveShift ? (isCompactColumns ? 7 : 13) : (isCompactColumns ? 8 : 14)} className="p-4 bg-m3-surface-low border-b border-m3-outline-variant/20">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                                  className="overflow-hidden"
                                >
                                  <div className={`bg-m3-surface-lowest p-5 rounded-2xl border border-m3-outline-variant/15 grid grid-cols-1 ${currentUser?.role === UserRole.ADMIN ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6 shadow-inner text-left`}>

                                    {/* Left specs: Branding & Thumbnail */}
                                    <div className="space-y-4 border-b md:border-b-0 md:border-r border-m3-outline-variant/10 pb-4 md:pb-0 md:pr-6">
                                      <div className="flex gap-4 items-start">
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-black uppercase text-m3-primary tracking-widest block">Primary SKU Details</span>
                                          <strong className="text-sm text-m3-on-surface block leading-tight">{p.productName}</strong>
                                          <span className="text-[10px] text-zinc-400 font-mono block">ID Key: {p.id}</span>
                                        </div>
                                      </div>

                                      <div className="pt-2">
                                        <StyledBarcode code={p.barcode} />
                                        <span className="text-[9px] font-mono font-bold text-zinc-400 block mt-1.5 text-center">SCAN BARCODE: {p.barcode}</span>
                                      </div>
                                    </div>

                                    {/* Center specs: Dimensions, quantities and price indices */}
                                    <div className={`space-y-3 ${currentUser?.role === UserRole.ADMIN ? 'md:border-r border-m3-outline-variant/10 md:pr-6' : ''}`}>
                                      <span className="text-[10px] font-black uppercase text-m3-primary tracking-widest block">Dimensional Specifications</span>
                                      <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
                                        <div>
                                          <span className="text-[9px] text-zinc-400 font-black uppercase block leading-none mb-1">Brand Name</span>
                                          <span className="text-m3-on-surface">{p.brand || 'No registered brand'}</span>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-zinc-400 font-black uppercase block leading-none mb-1">Catalog Category</span>
                                          <span className="text-m3-on-surface">{p.category}</span>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-zinc-400 font-black uppercase block leading-none mb-1">Dimensions / Size</span>
                                          <span className="text-m3-on-surface">{p.size || 'Unspecified'}</span>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-zinc-400 font-black uppercase block leading-none mb-1">Box Coverage</span>
                                          <span className="text-m3-primary">{p.coveragePerBox ? `${p.coveragePerBox} m²` : '0.00 m²'}</span>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-zinc-400 font-black uppercase block leading-none mb-1">Pcs / Package</span>
                                          <span className="text-m3-on-surface">{p.boxQuantity} pieces</span>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-zinc-400 font-black uppercase block leading-none mb-1">Safety Threshold</span>
                                          <span className="text-amber-500 font-mono">{p.minimumStock} {p.unit}</span>
                                        </div>
                                        <div className="border-t border-m3-outline-variant/10 pt-2 col-span-2 grid grid-cols-2 gap-2">
                                          {canSeeFinancialCostsAndSources && (
                                            <div>
                                              <span className="text-[9px] text-zinc-400 font-black uppercase block leading-none mb-1">Unit Cost</span>
                                              <span className="text-zinc-500 font-mono text-xs">{formatCurrency(p.costPrice)}</span>
                                            </div>
                                          )}
                                          <div>
                                            <span className="text-[9px] text-zinc-400 font-black uppercase block leading-none mb-1">Selling Retail</span>
                                            <span className="text-m3-primary font-mono text-xs font-extrabold">{formatCurrency(p.sellingPrice)}</span>
                                          </div>
                                          <div>
                                            <span className="text-[9px] text-zinc-400 font-black uppercase block leading-none mb-1">Markup %</span>
                                            <span className="text-emerald-500 font-mono text-xs font-bold">
                                              {p.markupPercent !== undefined ? `${p.markupPercent}%` : (p.costPrice > 0 ? `${Math.round(((p.sellingPrice - p.costPrice) / p.costPrice) * 100 * 10) / 10}%` : '50%')}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-[9px] text-zinc-400 font-black uppercase block leading-none mb-1">Tax Type</span>
                                            <span className="text-teal-500 font-sans text-xs font-bold">
                                              {p.taxType || '12% VAT'}
                                            </span>
                                          </div>
                                          {p.origin && canSeeFinancialCostsAndSources && (
                                            <div className="col-span-2 pt-2 border-t border-m3-outline-variant/10">
                                              <span className="text-[9px] text-zinc-400 font-black uppercase block leading-none mb-1">Acquired From / Origin</span>
                                              <span className="text-amber-500 dark:text-amber-400 font-bold text-[11px] block">{p.origin}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Right specs: Regional Branch distributions */}
                                    {currentUser?.role === UserRole.ADMIN && (
                                      <div className="space-y-3">
                                        <span className="text-[10px] font-black uppercase text-m3-primary tracking-widest block">Live Multi-Branch Stock balance</span>
                                        <div className="space-y-2">
                                          {branches.filter(b => !b.isDeleted).map((b) => {
                                            const branchRecord = branchStock.find(bs => bs.productId === p.id && bs.branchId === b.id);
                                            const qty = branchRecord?.quantity || 0;
                                            const overrideLimit = branchRecord?.lowStockThresholdOverride !== undefined
                                              ? branchRecord.lowStockThresholdOverride
                                              : p.minimumStock;

                                            let statusBg = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/10';
                                            if (qty === 0) statusBg = 'bg-rose-500/10 text-rose-500 border-rose-500/10';
                                            else if (qty <= overrideLimit) statusBg = 'bg-amber-500/10 text-amber-500 border-amber-500/10';

                                            return (
                                              <div key={b.id} className="flex flex-col md:flex-row justify-between md:items-center gap-2 text-xs p-3 rounded-xl bg-m3-surface border border-m3-outline-variant/10 shadow-3xs">
                                                <div className="flex flex-col">
                                                  <span className="font-extrabold text-[10px] text-m3-on-surface uppercase tracking-tight">{b.name.replace('Emman Tile Center ', '')}</span>
                                                  <span className="text-[8px] text-zinc-400 font-mono uppercase">Current Balance: <strong className="text-m3-on-surface">{qty} {p.unit || 'Boxes'}</strong></span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                  {/* Alert limit settings for each branch */}
                                                  <div className="flex items-center gap-1 bg-m3-surface-low px-2 py-1 rounded-lg border border-m3-outline-variant/20">
                                                    <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Alert Threshold:</span>
                                                    <input
                                                      type="number"
                                                      className="w-12 bg-m3-surface-lowest text-xs font-mono font-bold text-center border-b border-m3-outline-variant text-m3-on-surface py-0.5"
                                                      value={overrideLimit ?? ''}
                                                      onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        updateBranchLowStockThreshold(p.id, b.id, isNaN(val) ? p.minimumStock : val);
                                                      }}
                                                      min={0}
                                                    />
                                                  </div>

                                                  <span className={`font-mono font-black text-xs px-2.5 py-1 rounded-lg border ${statusBg}`}>
                                                    {qty} {p.unit || 'Boxes'}
                                                  </span>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })}
                  {catalogPaddingBottom > 0 && (
                    <tr style={{ height: catalogPaddingBottom }}>
                      <td colSpan={hasActiveShift ? (isCompactColumns ? 7 : 13) : (isCompactColumns ? 8 : 14)} className="p-0 border-0" />
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table Pagination */}
      <TablePagination
        currentPage={prodPage}
        pageSize={prodsPerPage}
        totalItems={filteredProducts.length}
        onPageChange={setProdPage}
        itemName="products"
      />
    </>
  );
};
