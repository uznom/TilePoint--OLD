/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Branch, InventoryLocationStock, UserRole, User } from '../../types/db';
import {
  Search,
  Plus,
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
import { getBranchStockQuantity, getBranchStockRecord, getBranchOptionLabel, isProductInBranch } from '../../lib/branchUtils';
import { formatCurrency } from '../../utils/formatters';
import { TablePagination } from '../TablePagination';
import { createSearchIndex, searchIndex } from '../../utils/searchIndex';
import { useVirtualList } from '../../hooks/useVirtualList';
import { StyledBarcode } from '../../utils/barcodeGenerator';
import { HeroButton } from '../common/ui/HeroButton';
import { HeroTooltip } from '../common/ui/HeroTooltip';
import { HeroTable } from '../common/ui/HeroTable';
import { HeroChip } from '../common/ui/HeroChip';
import { HeroDropdownSelect, HeroDropdownItem } from '../common/ui/HeroDropdown';
import { useMultiSort } from '../../hooks/useMultiSort';
import { MultiSortBadgeBar } from '../common/ui/MultiSortBadgeBar';

export interface CatalogStockLedgerProps {
  branchProducts: Product[];
  branchStock: InventoryLocationStock[];
  branches: Branch[];
  categories: string[];
  currentUser: User | null;
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
  sortBy: 'default' | 'qty-desc' | 'qty-asc' | 'alpha-asc' | 'alpha-desc' | 'price-desc' | 'price-asc' | 'sku-asc' | 'sku-desc' | string;
  setSortBy: (sort: any) => void;
  selectedProdIds: Record<string, boolean>;
  setSelectedProdIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  expandedProductIds: Record<string, boolean>;
  toggleProductExpand: (productId: string) => void;
  highlightedProductId: string | null;
  isCompactColumns: boolean;
  prodPage: number;
  setProdPage: (page: number) => void;
  prodsPerPage: number;
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
  isLoading?: boolean;
}

export const CatalogStockLedger: React.FC<CatalogStockLedgerProps> = ({
  isLoading = false,
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
      `${p.productName} ${p.productCode} ${p.barcode || ''} ${p.sku || ''} ${p.brand || ''} ${p.designName || ''} ${p.category || ''} ${p.size || ''} ${p.supplierId || ''} ${p.origin || ''} ${p.id || ''} ${(p as any).description || ''}`
    );
  }, [branchProducts]);

  // Branch scope toggle: "branch-only" (items stocked/assigned to selected branch) vs "all-catalog"
  const [branchScopeFilter, setBranchScopeFilter] = useState<'branch-only' | 'all-catalog'>('branch-only');

  // Reset page to 1 whenever search, category, status, or branch filters change
  useEffect(() => {
    setProdPage(1);
  }, [term, categoryFilter, statusFilter, selectedViewBranchId, branchScopeFilter, setProdPage]);

  // Multi-column sorting engine
  const {
    sortDescriptors,
    handleSort: handleTableSort,
    getSortDirection: getTableSortDir,
    getSortRank: getTableSortRank,
    removeSort,
    clearSort,
    sortData
  } = useMultiSort<Product>({
    customGetters: {
      sku: (p) => p.productCode || p.sku || '',
      name: (p) => p.productName || '',
      category: (p) => p.category || '',
      cost: (p) => p.costPrice || 0,
      price: (p) => p.sellingPrice || 0,
      stock: (p) => getBranchStockQuantity(p, selectedViewBranchId, branchStock, branches),
      threshold: (p) => {
        const isConsolidated = selectedViewBranchId === 'consolidated' || !selectedViewBranchId;
        const bsRec = getBranchStockRecord(p, selectedViewBranchId, branchStock, branches);
        return isConsolidated
          ? (p.minimumStock ?? p.lowStockThreshold ?? 10)
          : (bsRec?.lowStockThresholdOverride ?? bsRec?.lowStockThreshold ?? p.minimumStock ?? p.lowStockThreshold ?? 10);
      }
    }
  });

  // Catalog Filtration & Sorting
  const filteredProducts = useMemo(() => {
    const searchMatches = searchIndex(productSearchIndex, term);
    const isConsolidated = selectedViewBranchId === 'consolidated' || !selectedViewBranchId;

    const filtered = searchMatches.filter(p => {
      // 1. Branch Scope Filter
      if (!isConsolidated && branchScopeFilter === 'branch-only') {
        const inBranch = isProductInBranch(p, selectedViewBranchId, branchStock, branches);
        if (!inBranch) return false;
      }

      // 2. Category Filter
      const matchCategory = categoryFilter === 'All' || 
        (p.category && p.category.trim().toLowerCase() === categoryFilter.trim().toLowerCase());
      if (!matchCategory) return false;

      // 3. Status Filter
      if (statusFilter === 'All') return true;

      const qty = getBranchStockQuantity(p, selectedViewBranchId, branchStock, branches);
      const bsRec = getBranchStockRecord(p, selectedViewBranchId, branchStock, branches);
      const threshold = isConsolidated
        ? (p.minimumStock ?? p.lowStockThreshold ?? 10)
        : (bsRec?.lowStockThresholdOverride ?? bsRec?.lowStockThreshold ?? p.minimumStock ?? p.lowStockThreshold ?? 10);

      const isLow = statusFilter === 'Low Stock' || statusFilter === '● Low Stock';
      const isCritical = statusFilter === 'Critical' || statusFilter === '● Critical Stock';
      const isOut = statusFilter === 'Out of Stock' || statusFilter === '● Out of Stock';
      const isInStock = statusFilter === 'In Stock';

      if (isInStock) return qty > 0;
      if (isOut) return qty === 0;
      if (isLow) return qty > 0 && qty <= threshold;
      if (isCritical) {
        const critThreshold = Math.max(1, Math.floor(threshold * 0.5));
        return qty > 0 && qty <= critThreshold;
      }

      return true;
    });

    // If multi-sort descriptors are active, prioritize multi-sort
    if (sortDescriptors.length > 0) {
      return sortData(filtered);
    }

    // Fallback to legacy single dropdown sort if specified
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
    if (sortBy === 'sku-asc') {
      return [...filtered].sort((a, b) => (a.productCode || a.sku || '').localeCompare(b.productCode || b.sku || ''));
    }
    if (sortBy === 'sku-desc') {
      return [...filtered].sort((a, b) => (b.productCode || b.sku || '').localeCompare(a.productCode || a.sku || ''));
    }
    if (sortBy === 'price-desc') {
      return [...filtered].sort((a, b) => (b.sellingPrice || 0) - (a.sellingPrice || 0));
    }
    if (sortBy === 'price-asc') {
      return [...filtered].sort((a, b) => (a.sellingPrice || 0) - (b.sellingPrice || 0));
    }

    return filtered;
  }, [productSearchIndex, branchStock, branches, term, categoryFilter, statusFilter, selectedViewBranchId, branchScopeFilter, sortBy, sortDescriptors, sortData]);

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

  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (catalogTableContainerRef) {
      (catalogTableContainerRef as any).current = node;
    }
    if (catalogVirtualRef) {
      (catalogVirtualRef as any).current = node;
    }
  }, [catalogVirtualRef]);

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

  // Dynamic column count for colSpan consistency
  const totalColumnsCount = useMemo(() => {
    let count = 0;
    if (!hasActiveShift) count++; // checkbox
    count++; // expand toggle
    count++; // Code / SKU
    if (!isCompactColumns) count++; // Identifier codes
    count++; // Product Details
    if (!isCompactColumns) count++; // Category / Brand
    if (!isCompactColumns) count++; // Packaging
    if (!isCompactColumns && canSeeFinancialCostsAndSources) count++; // Unit Cost
    count++; // Sale Price
    count++; // Stock
    if (!isCompactColumns) count++; // Threshold
    count++; // Controls
    return count;
  }, [hasActiveShift, isCompactColumns, canSeeFinancialCostsAndSources]);

  // Memoized dropdown items for HeroUI v3 options floating menus
  const branchFilterItems: HeroDropdownItem[] = useMemo(() => {
    const list: HeroDropdownItem[] = [];
    if (isAdminUser) {
      list.push({ key: 'consolidated', label: 'HQ Consolidated (All Branches)' });
    }
    branches.filter(b => !b.isDeleted && (isAdminUser || b.id === (currentUser?.branchAssignmentId || 'B1'))).forEach(b => {
      list.push({ key: b.id, label: getBranchOptionLabel(b) });
    });
    return list;
  }, [isAdminUser, branches, currentUser]);

  const scopeFilterItems: HeroDropdownItem[] = useMemo(() => [
    { key: 'branch-only', label: 'Branch Items Only' },
    { key: 'all-catalog', label: 'Full Enterprise Catalog' },
  ], []);

  const categoryFilterItems: HeroDropdownItem[] = useMemo(() => {
    const list: HeroDropdownItem[] = [
      { key: 'All', label: `All Categories (${branchProducts.length})` }
    ];
    categories.forEach(cat => {
      const count = branchProducts.filter(p => p.category === cat).length;
      list.push({ key: cat, label: `${cat} ${count > 0 ? `(${count})` : ''}` });
    });
    return list;
  }, [branchProducts, categories]);

  const statusFilterItems: HeroDropdownItem[] = useMemo(() => [
    { key: 'All', label: 'All Statuses' },
    { key: 'In Stock', label: 'In Stock' },
    { key: 'Low Stock', label: '● Low Stock' },
    { key: 'Critical', label: '● Critical Stock' },
    { key: 'Out of Stock', label: '● Out of Stock' },
  ], []);

  const sortFilterItems: HeroDropdownItem[] = useMemo(() => [
    { key: 'default', label: 'Default Order' },
    { key: 'qty-desc', label: 'Stock (High → Low)' },
    { key: 'qty-asc', label: 'Stock (Low → High)' },
    { key: 'alpha-asc', label: 'Name (A → Z)' },
    { key: 'alpha-desc', label: 'Name (Z → A)' },
    { key: 'sku-asc', label: 'Code / SKU (A → Z)' },
    { key: 'sku-desc', label: 'Code / SKU (Z → A)' },
    { key: 'price-desc', label: 'Price (High → Low)' },
    { key: 'price-asc', label: 'Price (Low → High)' },
  ], []);

  return (
    <>
      {/* Main Filter Controller Panel Card */}
      <div className="bg-content1 p-5 rounded-2xl border border-divider shadow-xs space-y-4 font-sans">
        <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between">
          {/* Search query box */}
          <div className="relative w-full xl:max-w-md shrink-0">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-primary">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder={(branchProducts || []).some(p => p && !p.isDeleted) ? "Filter by Name, SKU, design name, code..." : "No items available to filter in this branch"}
              disabled={!(branchProducts || []).some(p => p && !p.isDeleted)}
              value={term}
              onChange={e => setTerm(e.target.value)}
              className="w-full bg-default-100 dark:bg-content2/80 border border-divider/40 focus:border-primary px-3.5 py-2 pl-10 pr-8 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all rounded-full font-sans font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {term && (
              <HeroTooltip content="Clear search">
                <button
                  type="button"
                  onClick={() => setTerm('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-default-400 hover:text-rose-500 cursor-pointer text-xs font-semibold transition-colors active:scale-[0.98]"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              </HeroTooltip>
            )}
          </div>

          {/* Advanced catalog filters and commands */}
          <div className="flex flex-wrap gap-2 w-full justify-start xl:justify-end items-center font-sans">
            {/* Branch view select / consolidated */}
            <HeroDropdownSelect
              items={branchFilterItems}
              selectedKey={selectedViewBranchId ?? ''}
              onSelectionChange={(k) => handleBranchSelect(k)}
              size="sm"
              variant="pill"
              className="min-w-[180px]"
            />

            {/* Branch inventory scope toggle when viewing a specific branch */}
            {selectedViewBranchId !== 'consolidated' && selectedViewBranchId && (
              <HeroDropdownSelect
                items={scopeFilterItems}
                selectedKey={branchScopeFilter}
                onSelectionChange={(k) => setBranchScopeFilter(k as 'branch-only' | 'all-catalog')}
                size="sm"
                variant="pill"
                className="min-w-[160px]"
              />
            )}

            {/* Category select */}
            <HeroDropdownSelect
              items={categoryFilterItems}
              selectedKey={categoryFilter ?? 'All'}
              onSelectionChange={(k) => setCategoryFilter(k)}
              size="sm"
              variant="pill"
              className="min-w-[160px]"
            />

            {/* Status select */}
            <HeroDropdownSelect
              items={statusFilterItems}
              selectedKey={statusFilter ?? 'All'}
              onSelectionChange={(k) => setStatusFilter(k)}
              size="sm"
              variant="pill"
              className="min-w-[140px]"
            />

            {/* Sort select */}
            <HeroDropdownSelect
              items={sortFilterItems}
              selectedKey={sortBy ?? 'default'}
              onSelectionChange={(k) => setSortBy(k)}
              startIcon={<ArrowUpDown className="h-3.5 w-3.5 text-primary" />}
              size="sm"
              variant="pill"
              className="min-w-[170px]"
            />

            {allowedToModify && (
              <HeroButton
                onClick={handleOpenAdd}
                color="primary"
                variant="solid"
                size="sm"
                radius="full"
                className="font-semibold shadow-xs"
                startIcon={<Plus className="h-4 w-4" />}
              >
                Register Product
              </HeroButton>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Operations Panel */}
      {!hasActiveShift && getSelectedProducts().length > 0 && (
        <div className="bg-content1 border border-divider p-3.5 rounded-large flex flex-wrap items-center justify-between gap-3 shadow-md animate-fade-in mb-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-xs font-black text-foreground">
              {getSelectedProducts().length} {getSelectedProducts().length === 1 ? 'item' : 'items'} selected for bulk actions
            </span>
          </div>
          <div className="flex items-center gap-2">
            <HeroButton
              onClick={() => handleBulkSimulatePrint(getSelectedProducts())}
              color="primary"
              variant="bordered"
              size="sm"
              className="text-[11px] font-bold uppercase tracking-wider"
              startIcon={<Printer className="h-3.5 w-3.5" />}
            >
              Print Barcodes
            </HeroButton>
            <HeroButton
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
              color="danger"
              variant="flat"
              size="sm"
              className="text-[11px] font-bold uppercase tracking-wider"
              startIcon={<AlertTriangle className="h-3.5 w-3.5" />}
            >
              Move to Damage Register
            </HeroButton>
            <HeroButton
              onClick={() => setSelectedProdIds({})}
              variant="light"
              size="sm"
              className="text-[11px] font-bold uppercase tracking-wider text-default-500 hover:text-danger active:scale-[0.98]"
            >
              Clear Selection
            </HeroButton>
          </div>
        </div>
      )}

      {/* Multi-Sort Active Badge Bar */}
      <MultiSortBadgeBar
        sortDescriptors={sortDescriptors}
        onRemoveSort={removeSort}
        onClearSort={clearSort}
        columnLabels={{
          sku: 'Code / SKU',
          name: 'Product Details',
          category: 'Category / Brand',
          cost: 'Unit Cost',
          price: 'Sale Price',
          stock: 'Stock Quantity',
          threshold: 'Low Stock Threshold',
        }}
      />

      {/* Database Catalog HeroTable Ledger */}
      <HeroTable
        containerRef={setContainerRef}
        onScroll={handleCatalogVirtualScroll}
        containerClassName="min-h-[280px] scrollbar-thin scrollbar-thumb-divider overflow-auto"
        className={isCompactColumns ? 'min-w-[700px]' : 'min-w-[1280px]'}
        isStriped
      >
        <HeroTable.Header>
          <tr className="border-b border-divider bg-content2/60 text-[10px] uppercase font-bold text-default-500 tracking-wider">
            {/* Checkbox column header */}
            {!hasActiveShift && (
              <HeroTable.Column align="center" className="py-3 px-2 w-10 text-center select-none bg-content2/40 border-r border-divider">
                <input
                  type="checkbox"
                  checked={paginatedProducts.length > 0 && paginatedProducts.every(p => !!selectedProdIds[p.id])}
                  onChange={handleToggleSelectAll}
                  className="rounded border-divider text-primary focus:ring-primary/35 cursor-pointer h-3.5 w-3.5 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Select/Deselect visible"
                  disabled={!allowedToModify}
                />
              </HeroTable.Column>
            )}
            <HeroTable.Column align="center" className="py-3 px-2 w-10 text-center bg-content2/40 select-none"></HeroTable.Column>
            <HeroTable.Column
              allowsSorting
              sortDirection={getTableSortDir('sku') !== 'none' ? getTableSortDir('sku') : (sortBy === 'sku-asc' ? 'ascending' : sortBy === 'sku-desc' ? 'descending' : 'none')}
              sortRank={getTableSortRank('sku')}
              onSort={(e) => handleTableSort('sku', e)}
              className="py-3 px-4"
            >
              Code / SKU
            </HeroTable.Column>
            {!isCompactColumns && (
              <HeroTable.Column className="py-3 px-4">
                Identifier Codes
              </HeroTable.Column>
            )}
            <HeroTable.Column
              allowsSorting
              sortDirection={getTableSortDir('name') !== 'none' ? getTableSortDir('name') : (sortBy === 'alpha-asc' ? 'ascending' : sortBy === 'alpha-desc' ? 'descending' : 'none')}
              sortRank={getTableSortRank('name')}
              onSort={(e) => handleTableSort('name', e)}
              className="py-3 px-4"
            >
              Product Details
            </HeroTable.Column>
            {!isCompactColumns && (
              <HeroTable.Column
                allowsSorting
                sortDirection={getTableSortDir('category')}
                sortRank={getTableSortRank('category')}
                onSort={(e) => handleTableSort('category', e)}
                className="py-3 px-4"
              >
                Category / Brand
              </HeroTable.Column>
            )}
            {!isCompactColumns && (
              <HeroTable.Column align="center" className="py-3 px-4 text-center">
                Packaging Dimensions
              </HeroTable.Column>
            )}
            {!isCompactColumns && canSeeFinancialCostsAndSources && (
              <HeroTable.Column
                align="end"
                allowsSorting
                sortDirection={getTableSortDir('cost')}
                sortRank={getTableSortRank('cost')}
                onSort={(e) => handleTableSort('cost', e)}
                className="py-3 px-4 text-right"
              >
                Unit Cost
              </HeroTable.Column>
            )}
            <HeroTable.Column
              align="end"
              allowsSorting
              sortDirection={getTableSortDir('price') !== 'none' ? getTableSortDir('price') : (sortBy === 'price-asc' ? 'ascending' : sortBy === 'price-desc' ? 'descending' : 'none')}
              sortRank={getTableSortRank('price')}
              onSort={(e) => handleTableSort('price', e)}
              className="py-3 px-4 text-right"
            >
              Sale Price
            </HeroTable.Column>
            <HeroTable.Column
              align="center"
              allowsSorting
              sortDirection={getTableSortDir('stock') !== 'none' ? getTableSortDir('stock') : (sortBy === 'qty-desc' ? 'descending' : sortBy === 'qty-asc' ? 'ascending' : 'none')}
              sortRank={getTableSortRank('stock')}
              onSort={(e) => handleTableSort('stock', e)}
              className="py-3 px-4 text-center"
            >
              Stock
            </HeroTable.Column>
            {!isCompactColumns && (
              <HeroTable.Column
                align="center"
                allowsSorting
                sortDirection={getTableSortDir('threshold')}
                sortRank={getTableSortRank('threshold')}
                onSort={(e) => handleTableSort('threshold', e)}
                className="py-3 px-2 text-center"
              >
                Threshold
              </HeroTable.Column>
            )}
            <HeroTable.Column align="center" className="py-3 px-4 text-center">
              Status
            </HeroTable.Column>
            <HeroTable.Column align="center" className="py-3 px-4 text-center">
              Controls
            </HeroTable.Column>
          </tr>
        </HeroTable.Header>

        <HeroTable.Body>
          {isLoading ? (
            <>
              {Array.from({ length: 6 }).map((_, idx) => (
                <HeroTable.Row key={idx} className="animate-pulse border-b border-divider bg-content2/20">
                  {!hasActiveShift && (
                    <HeroTable.Cell align="center" className="py-4 px-2 text-center"><div className="h-4 w-4 bg-default-200 rounded mx-auto" /></HeroTable.Cell>
                  )}
                  <HeroTable.Cell align="center" className="py-4 px-2 text-center"><div className="h-4 w-4 bg-default-200 rounded mx-auto" /></HeroTable.Cell>
                  <HeroTable.Cell className="py-4 px-4"><div className="h-4 w-28 bg-default-200 rounded mb-1.5" /><div className="h-3 w-20 bg-default-100 rounded" /></HeroTable.Cell>
                  {!isCompactColumns && <HeroTable.Cell className="py-4 px-4"><div className="h-4 w-20 bg-default-200 rounded" /></HeroTable.Cell>}
                  <HeroTable.Cell className="py-4 px-4"><div className="h-4 w-36 bg-default-200 rounded mb-1.5" /><div className="h-3 w-16 bg-default-100 rounded" /></HeroTable.Cell>
                  {!isCompactColumns && <HeroTable.Cell className="py-4 px-4"><div className="h-5 w-24 bg-default-200 rounded-full" /></HeroTable.Cell>}
                  {!isCompactColumns && <HeroTable.Cell align="center" className="py-4 px-4"><div className="h-4 w-16 bg-default-200 mx-auto rounded" /></HeroTable.Cell>}
                  {!isCompactColumns && canSeeFinancialCostsAndSources && <HeroTable.Cell align="end" className="py-4 px-4"><div className="h-4 w-14 bg-default-200 rounded ms-auto" /></HeroTable.Cell>}
                  <HeroTable.Cell align="end" className="py-4 px-4"><div className="h-4 w-16 bg-default-200 rounded ms-auto" /></HeroTable.Cell>
                  <HeroTable.Cell align="center" className="py-4 px-4"><div className="h-6 w-20 bg-default-200 rounded-medium mx-auto" /></HeroTable.Cell>
                  {!isCompactColumns && <HeroTable.Cell align="center" className="py-4 px-2"><div className="h-4 w-8 bg-default-200 rounded mx-auto" /></HeroTable.Cell>}
                  <HeroTable.Cell align="center" className="py-4 px-4"><div className="h-5 w-20 bg-default-200 rounded-full mx-auto" /></HeroTable.Cell>
                  <HeroTable.Cell align="center" className="py-4 px-4"><div className="h-7 w-20 bg-default-200 rounded-medium mx-auto" /></HeroTable.Cell>
                </HeroTable.Row>
              ))}
            </>
          ) : paginatedProducts.length === 0 ? (
            <HeroTable.Row isHoverable={false}>
              <HeroTable.Cell colSpan={totalColumnsCount} className="py-12 text-center text-sm font-medium text-default-400">
                No products found matching the search criteria or selected branch filter.
              </HeroTable.Cell>
            </HeroTable.Row>
          ) : (
            <>
              {catalogPaddingTop > 0 && (
                <tr style={{ height: catalogPaddingTop }}>
                  <td colSpan={totalColumnsCount} className="p-0 border-0" />
                </tr>
              )}
              {visibleCatalogIndices.map((idx) => {
                const p = paginatedProducts[idx];
                if (!p) return null;

                // Determine status indicators based on selected branch scope or consolidated HQ view
                const qty = getBranchStockQuantity(p, selectedViewBranchId, branchStock, branches);

                const bsRec = getBranchStockRecord(p, selectedViewBranchId, branchStock, branches);
                const threshold = selectedViewBranchId === 'consolidated'
                  ? (p.minimumStock ?? p.lowStockThreshold ?? 10)
                  : (bsRec?.lowStockThresholdOverride ?? bsRec?.lowStockThreshold ?? p.minimumStock ?? p.lowStockThreshold ?? 10);

                let statusLabel = 'In Stock';
                let statusChipColor: 'success' | 'warning' | 'danger' | 'default' = 'success';

                if (qty === 0) {
                  statusLabel = 'Out of Stock';
                  statusChipColor = 'default';
                } else if (qty <= threshold * 0.5) {
                  statusLabel = 'Critical';
                  statusChipColor = 'danger';
                } else if (qty <= threshold) {
                  statusLabel = 'Low Stock';
                  statusChipColor = 'warning';
                }

                const isExpanded = !!expandedProductIds[p.id];
                const isSelected = !!selectedProdIds[p.id];

                return (
                  <React.Fragment key={p.id}>
                    <HeroTable.Row
                      isSelected={isSelected}
                      className={`${
                        p.id === highlightedProductId
                          ? 'ring-2 ring-danger/80 bg-danger/5'
                          : ''
                      } ${isExpanded ? 'bg-primary/5 hover:bg-primary/10' : ''}`}
                      onClick={() => toggleProductExpand(p.id)}
                    >
                      {/* Checkbox Selection column */}
                      {!hasActiveShift && (
                        <HeroTable.Cell
                          align="center"
                          className="py-3.5 px-2 text-center bg-content2/20 border-r border-divider"
                          onClick={e => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
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
                            className="rounded border-divider text-primary focus:ring-primary/35 cursor-pointer h-3.5 w-3.5 disabled:opacity-30 disabled:cursor-not-allowed"
                            disabled={!allowedToModify}
                            aria-label={`Select ${p.productName}`}
                          />
                        </HeroTable.Cell>
                      )}

                      {/* Expand/Collapse Toggle Button column */}
                      <HeroTable.Cell
                        align="center"
                        className="py-3.5 px-2 text-center bg-content2/30"
                        onClick={e => e.stopPropagation()}
                      >
                        <HeroTooltip content={isExpanded ? "Collapse specifications" : "Expand specifications"}>
                          <button
                            type="button"
                            onClick={() => toggleProductExpand(p.id)}
                            className="p-1 hover:bg-primary/10 text-primary rounded-medium cursor-pointer transition-colors active:scale-95"
                            aria-label="Toggle details"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </HeroTooltip>
                      </HeroTable.Cell>

                      {/* Code / SKU details */}
                      <HeroTable.Cell className="py-3.5 px-4">
                        <div className="font-extrabold text-primary">{p.productCode}</div>
                        <div className="text-[10px] text-default-500 font-bold">{p.sku}</div>
                      </HeroTable.Cell>

                      {/* Scannable keys info */}
                      {!isCompactColumns && (
                        <HeroTable.Cell className="py-3.5 px-4 text-[10px] text-default-500 select-all">
                          <div>BC: {p.barcode}</div>
                        </HeroTable.Cell>
                      )}

                      {/* Primary specifications block */}
                      <HeroTable.Cell className="py-3.5 px-4">
                        <strong className="text-foreground text-xs block truncate max-w-[240px]">
                          {p.productName}
                        </strong>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {p.designName && (
                            <span className="text-[10px] text-default-600 font-medium bg-content2 px-1.5 py-0.5 rounded border border-divider font-sans">
                              Design: {p.designName}
                            </span>
                          )}
                          {p.coveragePerBox ? (
                            <span className="text-[10px] text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 font-sans">
                              Coverage: {p.coveragePerBox} m²
                            </span>
                          ) : null}
                          {p.origin && canSeeFinancialCostsAndSources && (
                            <span className="text-[10px] text-warning font-black bg-warning/10 px-1.5 py-0.5 rounded border border-warning/20 font-sans">
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
                                  <span className="text-[10px] text-danger font-extrabold bg-danger/10 px-1.5 py-0.5 rounded border border-danger/20 font-sans flex items-center gap-1">
                                    <Clock className="h-3 w-3 shrink-0 text-danger" /> Expired ({p.expirationDate})
                                  </span>
                                );
                              } else if (diffDays <= 30) {
                                return (
                                  <span className="text-[10px] text-warning font-extrabold bg-warning/10 px-1.5 py-0.5 rounded border border-warning/20 font-sans flex items-center gap-1">
                                    <Clock className="h-3 w-3 shrink-0 text-warning" /> Expiring Soon ({p.expirationDate})
                                  </span>
                                );
                              } else {
                                return (
                                  <span className="text-[10px] text-success font-extrabold bg-success/10 px-1.5 py-0.5 rounded border border-success/20 font-sans flex items-center gap-1">
                                    <Clock className="h-3 w-3 shrink-0 text-success" /> Expiry Tracked ({p.expirationDate})
                                  </span>
                                );
                              }
                            } else {
                              return (
                                <span className="text-[10px] text-warning font-extrabold bg-warning/10 px-1.5 py-0.5 rounded border border-warning/20 font-sans flex items-center gap-1">
                                  <Clock className="h-3 w-3 shrink-0 text-warning" /> Expiry Tracked
                                </span>
                              );
                            }
                          })()}
                        </div>
                      </HeroTable.Cell>

                      {/* Category metadata */}
                      {!isCompactColumns && (
                        <HeroTable.Cell className="py-3.5 px-4">
                          <span className="bg-content2 px-2.5 py-0.5 rounded-full text-foreground text-[11px] font-bold border border-divider">
                            {p.category}
                          </span>
                          <div className="text-[9px] text-default-500 mt-1.5 font-bold">Brand: {p.brand}</div>
                        </HeroTable.Cell>
                      )}

                      {/* Packaging dimensions and piece count */}
                      {!isCompactColumns && (
                        <HeroTable.Cell align="center" className="py-3.5 px-4 text-center font-bold">
                          <div className="text-foreground">{p.unit}</div>
                          {p.size && (
                            <div className="text-[10px] text-default-500 font-medium">
                              {p.size} {(p.boxQuantity ?? 0) > 1 && `(${p.boxQuantity} pcs)`}
                            </div>
                          )}
                        </HeroTable.Cell>
                      )}

                      {/* Financial unit cost */}
                      {!isCompactColumns && canSeeFinancialCostsAndSources && (
                        <HeroTable.Cell align="end" className="py-3.5 px-4 text-right font-bold text-foreground">
                          {formatCurrency(p.costPrice)}
                        </HeroTable.Cell>
                      )}

                      {/* Retail selling price */}
                      <HeroTable.Cell align="end" className="py-3.5 px-4 text-right font-extrabold text-primary">
                        {formatCurrency(p.sellingPrice)}
                      </HeroTable.Cell>

                      {/* Current physical warehouse qty */}
                      <HeroTable.Cell align="center" className="py-3.5 px-4 text-center text-sm font-extrabold">
                        <div className={
                          qty === 0
                            ? 'text-default-400'
                            : qty <= threshold
                            ? 'text-warning font-black tracking-wide'
                            : 'text-foreground'
                        }>
                          {qty} <span className="text-[10px] text-default-500 font-normal">{p.unit || "Unit"}</span>
                        </div>
                      </HeroTable.Cell>

                      {/* Threshold warnings trigger limit */}
                      {!isCompactColumns && (
                        <HeroTable.Cell align="center" className="py-3.5 px-2 text-center text-default-500 font-bold">
                          {threshold}
                        </HeroTable.Cell>
                      )}

                      {/* Visual Status badge with HeroChip */}
                      <HeroTable.Cell align="center" className="py-3.5 px-4 text-center select-none">
                        <HeroChip
                          size="sm"
                          variant="flat"
                          color={statusChipColor}
                          className={`font-black text-[9px] uppercase tracking-wider ${
                            statusChipColor === 'danger' ? '' : ''
                          }`}
                        >
                          {statusLabel}
                        </HeroChip>
                      </HeroTable.Cell>

                      {/* CRUD + Action buttons with HeroTooltip */}
                      <HeroTable.Cell
                        align="center"
                        className="py-3.5 px-4 text-center select-none"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex gap-1 justify-center">
                          <HeroTooltip content="View / Print Barcode Label">
                            <button
                              type="button"
                              onClick={() => handleOpenCodesModal(p)}
                              className="p-1.5 text-default-400 hover:text-primary hover:bg-default-100 transition-colors rounded-medium cursor-pointer shrink-0 active:scale-95"
                              aria-label="View or print barcode"
                            >
                              <Barcode className="h-4 w-4" />
                            </button>
                          </HeroTooltip>

                          <HeroTooltip content="Queue Restock in Sourcing Desk (+50 Units)">
                            <button
                              type="button"
                              onClick={() => handleQueueRestock(p.id)}
                              className="p-1.5 text-default-400 hover:text-warning hover:bg-warning/10 transition-colors rounded-medium cursor-pointer shrink-0 active:scale-95"
                              aria-label="Queue restock"
                            >
                              <Truck className="h-4 w-4" />
                            </button>
                          </HeroTooltip>

                          {allowedToModify && (
                            <>
                              <HeroTooltip content="Quick Stock Adjustment Intake/outtake">
                                <button
                                  type="button"
                                  onClick={() => handleOpenAdjust(p)}
                                  className="p-1.5 text-default-400 hover:text-success hover:bg-default-100 transition-colors rounded-medium cursor-pointer shrink-0 active:scale-95"
                                  aria-label="Adjust stock"
                                >
                                  <Sliders className="h-4 w-4" />
                                </button>
                              </HeroTooltip>
                              <HeroTooltip content="Edit product specs">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(p)}
                                  className="p-1.5 text-default-400 hover:text-primary hover:bg-default-100 transition-colors rounded-medium cursor-pointer shrink-0 active:scale-95"
                                  aria-label="Edit specs"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                              </HeroTooltip>
                              {!hasActiveShift && (
                                <HeroTooltip content="Soft-delete listings" color="danger">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTrigger(p.id, p.productName)}
                                    className="p-1.5 text-default-400 hover:text-danger hover:bg-danger/10 transition-colors rounded-medium cursor-pointer shrink-0 active:scale-95"
                                    aria-label="Delete product"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </HeroTooltip>
                              )}
                            </>
                          )}
                        </div>
                      </HeroTable.Cell>
                    </HeroTable.Row>

                    {/* Expanded Sub-Row with Detailed Layout Card */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <HeroTable.Row isHoverable={false} key={`${p.id}-expanded-details`}>
                          <HeroTable.Cell colSpan={totalColumnsCount} className="p-4 bg-content2/30 border-b border-divider">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                              className="overflow-hidden"
                            >
                              <div className={`bg-content1 p-5 rounded-large border border-divider grid grid-cols-1 ${currentUser?.role === UserRole.ADMIN ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6 shadow-inner text-left`}>

                                {/* Left specs: Branding & Thumbnail */}
                                <div className="space-y-4 border-b md:border-b-0 md:border-r border-divider pb-4 md:pb-0 md:pr-6">
                                  <div className="flex gap-4 items-start">
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-black uppercase text-primary tracking-widest block">Primary SKU Details</span>
                                      <strong className="text-sm text-foreground block leading-tight">{p.productName}</strong>
                                      <span className="text-[10px] text-default-500 block">ID Key: {p.id}</span>
                                    </div>
                                  </div>

                                  <div className="pt-2">
                                    <StyledBarcode code={p.barcode} />
                                    <span className="text-[9px] font-bold text-default-500 block mt-1.5 text-center">SCAN BARCODE: {p.barcode}</span>
                                  </div>
                                </div>

                                {/* Center specs: Dimensions, quantities and price indices */}
                                <div className={`space-y-3 ${currentUser?.role === UserRole.ADMIN ? 'md:border-r border-divider md:pr-6' : ''}`}>
                                  <span className="text-[10px] font-black uppercase text-primary tracking-widest block">Dimensional Specifications</span>
                                  <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
                                    <div>
                                      <span className="text-[9px] text-default-500 font-black uppercase block leading-none mb-1">Brand Name</span>
                                      <span className="text-foreground">{p.brand || 'No registered brand'}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-default-500 font-black uppercase block leading-none mb-1">Catalog Category</span>
                                      <span className="text-foreground">{p.category}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-default-500 font-black uppercase block leading-none mb-1">Dimensions / Size</span>
                                      <span className="text-foreground">{p.size || 'Unspecified'}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-default-500 font-black uppercase block leading-none mb-1">Box Coverage</span>
                                      <span className="text-primary">{p.coveragePerBox ? `${p.coveragePerBox} m²` : '0.00 m²'}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-default-500 font-black uppercase block leading-none mb-1">Pcs / Package</span>
                                      <span className="text-foreground">{p.boxQuantity} pieces</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-default-500 font-black uppercase block leading-none mb-1">Safety Threshold</span>
                                      <span className="text-warning font-bold">{p.minimumStock} {p.unit}</span>
                                    </div>
                                    <div className="border-t border-divider pt-2 col-span-2 grid grid-cols-2 gap-2">
                                      {canSeeFinancialCostsAndSources && (
                                        <div>
                                          <span className="text-[9px] text-default-500 font-black uppercase block leading-none mb-1">Unit Cost</span>
                                          <span className="text-default-500 text-xs">{formatCurrency(p.costPrice)}</span>
                                        </div>
                                      )}
                                      <div>
                                        <span className="text-[9px] text-default-500 font-black uppercase block leading-none mb-1">Selling Retail</span>
                                        <span className="text-primary text-xs font-extrabold">{formatCurrency(p.sellingPrice)}</span>
                                      </div>
                                      <div>
                                        <span className="text-[9px] text-default-500 font-black uppercase block leading-none mb-1">Markup %</span>
                                        <span className="text-success text-xs font-bold">
                                          {p.markupPercent !== undefined ? `${p.markupPercent}%` : (p.costPrice > 0 ? `${Math.round(((p.sellingPrice - p.costPrice) / p.costPrice) * 100 * 10) / 10}%` : '50%')}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-[9px] text-default-500 font-black uppercase block leading-none mb-1">Tax Type</span>
                                        <span className="text-teal-500 font-sans text-xs font-bold">
                                          {p.taxType || '12% VAT'}
                                        </span>
                                      </div>
                                      {p.origin && canSeeFinancialCostsAndSources && (
                                        <div className="col-span-2 pt-2 border-t border-divider">
                                          <span className="text-[9px] text-default-500 font-black uppercase block leading-none mb-1">Acquired From / Origin</span>
                                          <span className="text-warning font-bold text-[11px] block">{p.origin}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Right specs: Regional Branch distributions */}
                                {currentUser?.role === UserRole.ADMIN && (
                                  <div className="space-y-3">
                                    <span className="text-[10px] font-black uppercase text-primary tracking-widest block">Live Multi-Branch Stock balance</span>
                                    <div className="space-y-2">
                                      {branches.filter(b => !b.isDeleted).map((b) => {
                                        const branchRecord = branchStock.find(bs => bs.productId === p.id && bs.branchId === b.id);
                                        const qty = branchRecord?.quantity || 0;
                                        const overrideLimit = branchRecord?.lowStockThresholdOverride !== undefined
                                          ? branchRecord.lowStockThresholdOverride
                                          : (p.minimumStock ?? 0);

                                        let statusBg = 'bg-success/10 text-success border-success/20';
                                        if (qty === 0) statusBg = 'bg-danger/10 text-danger border-danger/20';
                                        else if (qty <= overrideLimit) statusBg = 'bg-warning/10 text-warning border-warning/20';

                                        return (
                                          <div key={b.id} className="flex flex-col md:flex-row justify-between md:items-center gap-2 text-xs p-3 rounded-medium bg-content2 border border-divider shadow-xs">
                                            <div className="flex flex-col">
                                              <span className="font-extrabold text-[10px] text-foreground uppercase">{b.name}</span>
                                              <span className="text-[8px] text-default-500 uppercase">Current Balance: <strong className="text-foreground">{qty} {p.unit || 'Unit'}</strong></span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                              {/* Alert limit settings for each branch */}
                                              <div className="flex items-center gap-1 bg-content1 px-2 py-1 rounded-medium border border-divider">
                                                <span className="text-[9px] text-default-500 font-bold uppercase tracking-wider">Alert Threshold:</span>
                                                <input
                                                  type="number"
                                                  className="w-12 bg-content2 text-xs font-bold text-center border-b border-divider text-foreground py-0.5"
                                                  value={overrideLimit ?? ''}
                                                  onChange={(e) => {
                                                    const val = parseInt(e.target.value);
                                                    updateBranchLowStockThreshold(p.id, b.id, isNaN(val) ? (p.minimumStock ?? 0) : val);
                                                  }}
                                                  min={0}
                                                />
                                              </div>

                                              <span className={`font-black text-xs px-2.5 py-1 rounded-medium border ${statusBg}`}>
                                                {qty} {p.unit || 'Unit'}
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
                          </HeroTable.Cell>
                        </HeroTable.Row>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                );
              })}
              {catalogPaddingBottom > 0 && (
                <tr style={{ height: catalogPaddingBottom }}>
                  <td colSpan={totalColumnsCount} className="p-0 border-0" />
                </tr>
              )}
            </>
          )}
        </HeroTable.Body>
      </HeroTable>

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

