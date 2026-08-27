/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React,{ useEffect,useRef,useState } from 'react';
import { useDb } from '../context/DbContext';
import {
getBranchOptionLabel,
getBranchStockQuantity,
getBranchStockRecord,
isProductInBranch,
isSameBranch
} from '../lib/branchUtils';
import { exportInventoryCatalogToXLSX,exportStockAlertsToXLSX } from '../lib/excelExportHelper';
import { saveFileToBackup } from '../lib/fileBackupHelper';
import { PreflightReport,runPreflightValidation } from '../lib/preflightValidator';
import {
Product,
TransferType,
UserRole
} from '../types/db';
import { generateCode128SvgHtml,generateEan13Barcode } from '../utils/barcodeGenerator';
import { ConfirmationModal } from './ConfirmationModal';
import { DynamicEntityConfigModal } from './DynamicEntityConfigModal';
import { ToastNotification } from './ToastNotification';
import { useResponsivePageSize,useTableAutoPageSize } from './TablePagination';

// Subcomponents
import { BranchPricesSubTab } from './inventory/BranchPricesSubTab';
import { CatalogStockLedger } from './inventory/CatalogStockLedger';
import { ExpirySubTab } from './inventory/ExpirySubTab';
import { ImportExportSubTab } from './inventory/ImportExportSubTab';
import { InventoryHeaderNav,InventorySubTab } from './inventory/InventoryHeaderNav';
import { InventoryStatsCards } from './inventory/InventoryStatsCards';
import { MovementsSubTab } from './inventory/MovementsSubTab';
import { StockLedgerSubTab } from './inventory/StockLedgerSubTab';
import { TransfersSubTab } from './inventory/TransfersSubTab';

// Modals
import { AddEditProductModal } from './inventory/AddEditProductModal';
import { BarcodeModal } from './inventory/BarcodeModal';
import { BranchConfigsModal } from './inventory/BranchConfigsModal';
import { BulkDamageModal } from './inventory/BulkDamageModal';
import { ChemicalBatchDetailModal } from './inventory/ChemicalBatchDetailModal';
import { ConfirmDeleteProductModal } from './inventory/ConfirmDeleteProductModal';
import { CreateTransferModal } from './inventory/CreateTransferModal';
import { ImportProgressOverlay } from './inventory/ImportProgressOverlay';
import { ManualLedgerModal } from './inventory/ManualLedgerModal';
import { QuickSupplierModal } from './inventory/QuickSupplierModal';
import { RegisterBatchModal } from './inventory/RegisterBatchModal';
import { StockAdjustmentModal } from './inventory/StockAdjustmentModal';
import { StockAlertsModal } from './inventory/StockAlertsModal';

export interface BatchExpiration {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  batchNumber: string;
  quantity: number;
  manufactureDate: string;
  expiryDate: string;
  branchId: string;
  status: 'Good' | 'Expiring Soon' | 'Expired';
  remarks?: string;
}

export interface InventoryModuleProps {
  darkMode?: boolean;
  hideTabHeader?: boolean;
  initialSubTab?: InventorySubTab | string;
  isCompactGlobal?: boolean;
  onSubTabChange?: (subTab: string) => void;
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({
  darkMode: _darkMode,
  hideTabHeader = true,
  initialSubTab = 'catalog',
  isCompactGlobal: _isCompactGlobal,
  onSubTabChange,
}) => {
  const {
    products,
    branchStock,
    branches,
    suppliers,
    movements,
    ledgerEntries,
    currentUser,
    updateProduct,
    deleteProduct,
    updateBranchLowStockThreshold,
    selectedViewBranchId,
    setSelectedViewBranchId,
    shifts,
    createStockTransfer,
    productCategories,
    poCart,
    syncPoCart,
    isResourceLocked,
    pessimisticLocks,
    acquirePessimisticLock,
    releasePessimisticLock,
    createSupplier,
    createProduct,
    activeShift,
    triggerSystemProcessing,
    createManualLedgerEntry,
    createDamageLog,
    stockTransfers,
    isRowClearingBlocked,
    getRowClearingBlockedReason,
    importProducts,
  } = useDb() as any;

  const [activeSubTab, setActiveSubTab] = useState<InventorySubTab>(
    (initialSubTab as InventorySubTab) || 'catalog'
  );

  useEffect(() => {
    if (initialSubTab && (initialSubTab as InventorySubTab) !== activeSubTab) {
      setActiveSubTab(initialSubTab as InventorySubTab);
    }
  }, [initialSubTab]);

  const [isFetching, setIsFetching] = useState(false);
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});
  const [showDynamicConfigModal, setShowDynamicConfigModal] = useState(false);
  const [dynamicConfigTab] = useState<any>("categories");

  const isAdminUser = currentUser?.role === 'Admin';
  const hasActiveShift = !!(activeShift || (shifts && shifts.some((s: any) => s.userId === currentUser?.id && s.status === 'Open')));

  const changeActiveSubTab = (tab: InventorySubTab | string) => {
    const target = tab as InventorySubTab;
    setActiveSubTab(target);
    if (onSubTabChange) {
      onSubTabChange(target);
    }
  };

  const handleBranchSelect = (bId: string) => {
    setSelectedViewBranchId(bId);
  };

  const toggleProductExpand = (pId: string) => {
    setExpandedProductIds(prev => ({ ...prev, [pId]: !prev[pId] }));
  };

  const isBranchLoading = isFetching;

  const handleQueueRestock = (productIdOrProd: string | Product) => {
    const prod = typeof productIdOrProd === 'string' ? products.find(p => p.id === productIdOrProd) : productIdOrProd;
    if (prod && syncPoCart) {
      syncPoCart([...(poCart || []), { product: prod, quantity: 20 }]);
    }
  };

  const activeBranchId = selectedViewBranchId;

  // Branch inventory scope: filter items based on selected branch ID to prevent cross-branch consolidation
  const branchProducts = React.useMemo(() => {
    const nonDeleted = products.filter(p => p && !p.isDeleted);
    if (!selectedViewBranchId || selectedViewBranchId === 'consolidated' || selectedViewBranchId === 'all' || selectedViewBranchId === 'ALL') {
      return nonDeleted;
    }
    return nonDeleted.filter(p => isProductInBranch(p, selectedViewBranchId, branchStock, branches));
  }, [products, selectedViewBranchId, branchStock, branches]);
  // Highlight and filter product for "Inspect Section" interactions
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);

  useEffect(() => {
    const checkAndApplyFilter = (targetCode?: string) => {
      const code = targetCode || localStorage.getItem("tp_pending_product_filter");
      if (code) {
        localStorage.removeItem("tp_pending_product_filter");
        
        const query = code.trim().toLowerCase();
        const found = products.find(p => 
          !p.isDeleted && (
            p.productCode.toLowerCase() === query ||
            (p.barcode && p.barcode.toLowerCase() === query) ||
            (p.sku && p.sku.toLowerCase() === query) ||
            p.id.toLowerCase() === query
          )
        );

        if (found) {
          const isInBranch = isProductInBranch(found, activeBranchId, branchStock, branches);
          if (!isInBranch) {
            if (currentUser?.role === "Admin") {
              setIsFetching(true); setSelectedViewBranchId("consolidated"); setTimeout(() => setIsFetching(false), 300);
              showToast("Scanned item is allocated to another branch. Switched view to Consolidated Inventory.");
            } else {
              const assignedBranches = branchStock
                .filter(bs => bs.productId === found.id && bs.quantity > 0)
                .map(bs => branches.find(b => b.id === bs.branchId)?.name || bs.branchId);
              const bNames = assignedBranches.length > 0 ? assignedBranches.join(", ") : "other branches";
              showToast("Scanned item is allocated to " + bNames + " (not in your assigned branch).");
            }
          }

          changeActiveSubTab("catalog");
          setTerm(found.productCode);
          setProdPage(1);
          setHighlightedProductId(found.id);
          setExpandedProductIds(prev => ({ ...prev, [found.id]: true }));
          
          setTimeout(() => {
            setHighlightedProductId(null);
          }, 2500);
        } else {
          showToast("No product found matching scannable code \"" + code + "\".");
        }
      }
    };

    checkAndApplyFilter();

    const handleSearchEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        checkAndApplyFilter(customEvent.detail);
      }
    };

    window.addEventListener("tp-search-product", handleSearchEvent);
    return () => {
      window.removeEventListener("tp-search-product", handleSearchEvent);
    };
  }, [products, activeBranchId, branchStock, branches, currentUser]);

  // Dynamic status evaluator based on current system date
  const computeLiveBatchStatus = (expiryDateStr: string): "Good" | "Expiring Soon" | "Expired" => {
    if (!expiryDateStr) return "Good";
    const exp = new Date(expiryDateStr);
    exp.setHours(23, 59, 59, 999);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (exp.getTime() < today.getTime()) {
      return "Expired";
    }
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 30) {
      return "Expiring Soon";
    }
    return "Good";
  };

  // Batch Expiration & Shelf-life Tracker state
  const [batches, setBatches] = useState<BatchExpiration[]>(() => {
    try {
      const cached = localStorage.getItem("tp_batch_expirations");
      if (cached) {
        const parsed = JSON.parse(cached) as BatchExpiration[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Remove legacy hardcoded fake seed batches if they are old mock simulation items
          const cleaned = parsed.filter(b => b.id !== "batch-1" && b.id !== "batch-2" && b.id !== "batch-3");
          if (cleaned.length > 0) return cleaned;
        }
      }
    } catch (_) {}
    return [];
  });

  // Automatically synchronize batch records with products catalog (and recalculate status dynamically)
  useEffect(() => {
    setBatches(prevBatches => {
      let updatedList = [...prevBatches];

      // Remove legacy simulation mock seeds
      updatedList = updatedList.filter(b => b.id !== "batch-1" && b.id !== "batch-2" && b.id !== "batch-3");

      // Find all catalog products in active branch scope that have expiration flagged or expiry dates
      const expiryTrackedProds = branchProducts.filter(p => p.hasExpiration || p.expirationDate);

      // Ensure every tracked product has at least one dynamic batch entry
      expiryTrackedProds.forEach(prod => {
        const exists = updatedList.some(b => b.productId === prod.id);
        if (!exists) {
          const expDate = prod.expirationDate || new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0];
          const mfgDate = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
          updatedList.push({
            id: `batch-${prod.id}`,
            productId: prod.id,
            productName: prod.productName,
            productCode: prod.productCode,
            batchNumber: `B-${prod.productCode.replace(/[^A-Z0-9]/gi, '')}-${expDate.replace(/-/g, '').slice(2)}`,
            quantity: prod.stockQuantity || 25,
            manufactureDate: mfgDate,
            expiryDate: expDate,
            branchId: prod.origin || 'B1',
            status: computeLiveBatchStatus(expDate),
            remarks: `Auto-linked from catalog (${prod.category || 'Chemical'})`
          });
        }
      });

      // Build fast Map lookup to avoid O(N*M) linear search across 2000+ products
      const productMap = new Map<string, Product>(products.map(p => [p.id, p]));

      // Update names, codes, quantities, and live status for all existing batches from products catalog
      return updatedList.map(b => {
        const liveProd = productMap.get(b.productId);
        const liveStatus = computeLiveBatchStatus(b.expiryDate);
        return {
          ...b,
          productName: liveProd ? liveProd.productName : b.productName,
          productCode: liveProd ? liveProd.productCode : b.productCode,
          quantity: liveProd ? liveProd.stockQuantity : b.quantity,
          status: liveStatus
        };
      });
    });
  }, [branchProducts]);

  // Sync batch changes to local storage so Notification Center reads them dynamically
  useEffect(() => {
    try {
      localStorage.setItem("tp_batch_expirations", JSON.stringify(batches));
    } catch (_) {}
  }, [batches]);

  // Expiration Calendar view dates (default to live system date)
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth()); // 0-indexed
  const [calendarSelectedDay, setCalendarSelectedDay] = useState<string | null>(null);

  // Add Batch Form & Detail Modal states
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [selectedBatchDetail, setSelectedBatchDetail] = useState<BatchExpiration | null>(null);
  const [batchFormProductId, setBatchFormProductId] = useState("");
  const [batchFormNo, setBatchFormNo] = useState("");
  const [batchFormQty, setBatchFormQty] = useState(50);
  const [batchFormMfgDate, setBatchFormMfgDate] = useState(() => new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]);
  const [batchFormExpDate, setBatchFormExpDate] = useState(() => new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]);
  const [batchFormBranchId, setBatchFormBranchId] = useState(currentUser?.branchAssignmentId || "B1");
  const [batchFormRemarks, setBatchFormRemarks] = useState("");

  const handleRegisterBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchFormProductId) {
      showToast("Please select a target product for the batch.");
      return;
    }

    const prod = products.find(p => p.id === batchFormProductId);
    if (!prod) return;

    const bNo = batchFormNo.trim() || `B-${prod.productCode.replace(/[^A-Z0-9]/gi, '')}-${Date.now().toString().slice(-4)}`;
    const computedStatus = computeLiveBatchStatus(batchFormExpDate);

    const newBatch: BatchExpiration = {
      id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      productId: batchFormProductId,
      productName: prod.productName,
      productCode: prod.productCode,
      batchNumber: bNo,
      quantity: batchFormQty,
      manufactureDate: batchFormMfgDate,
      expiryDate: batchFormExpDate,
      branchId: batchFormBranchId,
      status: computedStatus,
      remarks: batchFormRemarks.trim() || "Manual batch log entry"
    };

    setBatches(prev => [newBatch, ...prev]);

    // Automatically flag product in catalog as expiry-tracked if not already
    if (!prod.hasExpiration || prod.expirationDate !== batchFormExpDate) {
      updateProduct(prod.id, {
        hasExpiration: true,
        expirationDate: batchFormExpDate
      });
    }

    showToast(`Logged Chemical Batch #${bNo} for "${prod.productName}" successfully!`);

    // Reset Form
    setBatchFormNo("");
    setBatchFormQty(50);
    setBatchFormRemarks("");
    setShowAddBatchModal(false);
  };

  const [confirmResetBatchesModal, setConfirmResetBatchesModal] = useState(false);
  const [confirmDeleteBatchId, setConfirmDeleteBatchId] = useState<string | null>(null);

  const handleExecuteResetSimulationBatches = () => {
    localStorage.removeItem("tp_batch_expirations");
    const expiryTrackedProds = branchProducts.filter(p => p.hasExpiration || p.expirationDate);
    const freshBatches: BatchExpiration[] = expiryTrackedProds.map(prod => {
      const expDate = prod.expirationDate || new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0];
      const mfgDate = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
      return {
        id: `batch-${prod.id}`,
        productId: prod.id,
        productName: prod.productName,
        productCode: prod.productCode,
        batchNumber: `B-${prod.productCode.replace(/[^A-Z0-9]/gi, '')}-${expDate.replace(/-/g, '').slice(2)}`,
        quantity: prod.stockQuantity || 25,
        manufactureDate: mfgDate,
        expiryDate: expDate,
        branchId: prod.origin || 'B1',
        status: computeLiveBatchStatus(expDate),
        remarks: `Catalog dynamic batch for ${prod.productName}`
      };
    });
    setBatches(freshBatches);
    showToast("Chemical batch log entries synchronized directly with live inventory catalog!");
    setConfirmResetBatchesModal(false);
  };

  const handleResetSimulationBatches = () => {
    setConfirmResetBatchesModal(true);
  };

  const handleExecuteRemoveBatch = () => {
    if (!confirmDeleteBatchId) return;
    setBatches(prev => prev.filter(b => b.id !== confirmDeleteBatchId));
    showToast("Batch record removed from ERP shelf-life database.");
    setConfirmDeleteBatchId(null);
  };

  const handleRemoveBatch = (id: string) => {
    setConfirmDeleteBatchId(id);
  };

 // Search & Filters
 const [term, setTerm] = useState('');
 const [categoryFilter, setCategoryFilter] = useState('All');
 const [statusFilter, setStatusFilter] = useState('All');
 const [sortBy, setSortBy] = useState<'default' | 'qty-desc' | 'qty-asc' | 'alpha-asc' | 'alpha-desc'>('default');
 

 const canSeeFinancialCostsAndSources = currentUser.role === 'Admin';

 // Branch Specific pricing filter states

 // Pagination State for lists inside Inventory
 const [prodPage, setProdPage] = useState(1);
 const [ledgerPage, setLedgerPage] = useState(1);
  const isCompactColumns = false;

 const catalogTableContainerRef = useRef<HTMLDivElement | null>(null);
 const catalogRowHeight = isCompactColumns ? 52 : 68;
 const autoCatalogPageSize = useTableAutoPageSize(catalogTableContainerRef, {
 rowHeight: catalogRowHeight,
 minRows: 4,
 maxRows: 50,
 });

 const responsiveLedgerPerPage = useResponsivePageSize(48, 480, 10); // ledger table row is 48px tall

 const [prodsPerPage, setProdsPerPage] = useState<number>(8);
 const [ledgerPerPage, setLedgerPerPage] = useState<number>(10);

 // Sync with responsive sizing
 useEffect(() => {
 setProdsPerPage(autoCatalogPageSize);
 }, [autoCatalogPageSize]);

 useEffect(() => {
 setLedgerPerPage(responsiveLedgerPerPage);
 }, [responsiveLedgerPerPage]);

   // Reset prodPage when filters change
  useEffect(() => {
    setProdPage(1);
  }, [term, categoryFilter, statusFilter, sortBy]);

  // Reset ledgerPage when sub-tab changes
  useEffect(() => {
    setLedgerPage(1);
  }, [activeSubTab]);

 // Stock Transfer Creation Form States
 const [showCreateTransfer, setShowCreateTransfer] = useState(false);
 const [transferSource, setTransferSource] = useState(currentUser.branchAssignmentId || 'B1');
 const [transferDest, setTransferDest] = useState('');
 const [transferTypeSelect, setTransferTypeSelect] = useState<TransferType>('Replenishment');
 const [transferItems, setTransferItems] = useState<{ productId: string; quantity: number }[]>([]);
 const [transferReasonInput, setTransferReasonInput] = useState('');
 const [tempProductId, setTempProductId] = useState('');
 const [tempQty, setTempQty] = useState(15);

 const handleTriggerTransfer = (b: BatchExpiration) => {
   const prod = products.find(p => p.id === b.productId);
   const pName = prod ? prod.productName : b.productName;
   const pUnit = prod?.unit || 'bags';
   setSelectedBatchDetail(null);
   changeActiveSubTab('transfers');
   setShowCreateTransfer(true);
   setTransferSource(b.branchId);
   setTempProductId(b.productId);
   setTempQty(b.quantity);
   setTransferItems(prev => {
     const existingIdx = prev.findIndex(it => it.productId === b.productId);
     if (existingIdx !== -1) {
       return prev.map((it, idx) => idx === existingIdx ? { ...it, quantity: it.quantity + b.quantity } : it);
     }
     return [...prev, { productId: b.productId, quantity: b.quantity }];
   });
   showToast(`Stock transfer order form pre-filled for Batch #${b.batchNumber} (${pName}) - ${b.quantity} ${pUnit}`);
 };

 // Ensure non-Admin users are strictly locked to their branchAssignmentId for viewing stocks and performing actions
 useEffect(() => {
   if (currentUser) {
     // Non-admin branch view lock removed to allow viewing consolidated catalog stock
   }
 }, [currentUser, selectedViewBranchId, transferSource]);

 // Add/Edit Modals state
 const [showModal, setShowModal] = useState(false);
 const [isEditMode, setIsEditMode] = useState(false);
 const [editingId, setEditingId] = useState('');

 // Quick Supplier registration from add product modal
 const [showQuickSupplierModal, setShowQuickSupplierModal] = useState(false);
 const [quickSupName, setQuickSupName] = useState('');
 const [quickSupContact, setQuickSupContact] = useState('');
 const [quickSupPhone, setQuickSupPhone] = useState('');
 const [quickSupEmail, setQuickSupEmail] = useState('');
 const [quickSupAddress, setQuickSupAddress] = useState('');

 // Form Fields State (Product Schema matches & additions)
 const [productCode, setProductCode] = useState('');
 const [hasExpiration, setHasExpiration] = useState(false);
 const [expirationDate, setExpirationDate] = useState('');
 const [sku, setSku] = useState('');
 const [barcode, setBarcode] = useState('');
 const [designName, setDesignName] = useState('');
 const [productName, setProductName] = useState('');
 const [category, setCategory] = useState('Ceramic Tiles');
 const [isCustomCategoryInput, setIsCustomCategoryInput] = useState(false);
 const [brand, setBrand] = useState('');
 const [supplierId, setSupplierId] = useState('');
 const [unit, setUnit] = useState('Unit');
 const [size, setSize] = useState('');
 const [boxQuantity, setBoxQuantity] = useState<number>(1);
 const [coveragePerBox, setCoveragePerBox] = useState<number>(0);
 const [productImage, setProductImage] = useState<string>('');
 const [costPrice, setCostPrice] = useState<number>(0);
 const [sellingPrice, setSellingPrice] = useState<number>(0);
 const [markupPercent, setMarkupPercent] = useState<number>(0);
 const [taxType, setTaxType] = useState<string>('12% VAT');
 const [stockQuantity, setStockQuantity] = useState<number>(0);
 const [minimumStock, setMinimumStock] = useState<number>(0);
 const [origin, setOrigin] = useState('');

 const handleCostPriceChange = (val: number) => {
 setCostPrice(val);
 if (val > 0) {
 if (markupPercent !== 0) {
 const calculatedSelling = Math.round(val * (1 + markupPercent / 100) * 100) / 100;
 setSellingPrice(calculatedSelling);
 } else if (sellingPrice > 0) {
 const calculatedMarkup = Math.round(((sellingPrice - val) / val) * 100 * 10) / 10;
 setMarkupPercent(calculatedMarkup);
 }
 }
 };

 const handleMarkupChange = (val: number) => {
 setMarkupPercent(val);
 if (costPrice > 0) {
 const calculatedSelling = Math.round(costPrice * (1 + val / 100) * 100) / 100;
 setSellingPrice(calculatedSelling);
 } else if (sellingPrice > 0 && val > -100) {
 const calculatedCost = Math.round((sellingPrice / (1 + val / 100)) * 100) / 100;
 setCostPrice(calculatedCost);
 }
 };

 const handleSellingPriceChange = (val: number) => {
 setSellingPrice(val);
 if (costPrice > 0) {
 const calculatedMarkup = Math.round(((val - costPrice) / costPrice) * 100 * 10) / 10;
 setMarkupPercent(calculatedMarkup);
 } else if (markupPercent > 0) {
 const calculatedCost = Math.round((val / (1 + markupPercent / 100)) * 100) / 100;
 setCostPrice(calculatedCost);
 }
 };

 // Manual Stock Adjustment state
 const [showAdjustModal, setShowAdjustModal] = useState(false);
  // Stock Alert Diagnostics Modal state
  const [showStockAlertsModal, setShowStockAlertsModal] = useState(false);
  const [stockAlertModalFilter, setStockAlertModalFilter] = useState<'ALL' | 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK'>('ALL');
  const [stockAlertSearch, _setStockAlertSearch] = useState("");
  const [stockAlertCategory, _setStockAlertCategory] = useState("All");
 const [adjustProductId, setAdjustProductId] = useState('');
 const [adjustProductName, setAdjustProductName] = useState('');
 const [adjustType, setAdjustType] = useState<'ADD' | 'SUB'>('ADD');
 const [adjustVal, setAdjustVal] = useState<number>(10);
 const [adjustReason, setAdjustReason] = useState('Weekly stock-take variance reconciliation');

 // Manual Stock Ledger entry form state
 const [showManualLedgerModal, setShowManualLedgerModal] = useState(false);
 const [manualLedgerProductId, setManualLedgerProductId] = useState('');
 const [manualLedgerBranchId, setManualLedgerBranchId] = useState(currentUser?.branchAssignmentId || 'B1');
 const [manualLedgerType, setManualLedgerType] = useState<'IN' | 'OUT' | 'ADJUST' | 'TRANSFER' | 'PURCHASE' | 'SALE'>('ADJUST');
 const [manualLedgerQty, setManualLedgerQty] = useState<number>(10);
 const [manualLedgerRefNo, setManualLedgerRefNo] = useState('');
 const [manualLedgerRemarks, setManualLedgerRemarks] = useState('');

 // Barcode & QR Label viewer state
 const [showCodesModal, setShowCodesModal] = useState(false);
 const [codesProduct, setCodesProduct] = useState<Product | null>(null);
 const [printingCode, setPrintingCode] = useState(false);

 // States to register a brand new supplier inside Add Product Modal
 const [isRegisteringNewSupplier, setIsRegisteringNewSupplier] = useState(false);
 const [newSupplierName, setNewSupplierName] = useState('');
 const [newSupplierContact, setNewSupplierContact] = useState('');
 const [newSupplierPhone, setNewSupplierPhone] = useState('');
 const [newSupplierEmail, setNewSupplierEmail] = useState('');
 const [newSupplierAddress, setNewSupplierAddress] = useState('');

 // Custom toast alert
 const [toastMessage, setToastMessage] = useState<string | null>(null);
 const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
 const [confirmDeleteName, setConfirmDeleteName] = useState<string>('');
 const getDefaultBranchId = (): string => {
   if (currentUser?.branchAssignmentId && branches.some(b => b.id === currentUser.branchAssignmentId && !b.isDeleted)) {
     return currentUser.branchAssignmentId;
   }
   const activeB = branches.find(b => !b.isDeleted);
   if (activeB) return activeB.id;
   return branches[0]?.id || branches[0]?.branchCode || 'main';
 };

 const [targetBranchId, setTargetBranchId] = useState<string>(() => getDefaultBranchId());
 const [importTargetBranchId, setImportTargetBranchId] = useState<string>(() => getDefaultBranchId());

 useEffect(() => {
   const activeDefaultId = getDefaultBranchId();
   if (activeDefaultId) {
     if (!branches.some(b => b.id === targetBranchId && !b.isDeleted)) {
       setTargetBranchId(activeDefaultId);
     }
     if (!branches.some(b => b.id === importTargetBranchId && !b.isDeleted)) {
       setImportTargetBranchId(activeDefaultId);
     }
   }
 }, [branches, currentUser]);
 const [rawImportText, setRawImportText] = useState('');
 const [preflightReport, setPreflightReport] = useState<PreflightReport | null>(null);
 const [isAnalyzingPreflight, setIsAnalyzingPreflight] = useState(false);

  const [isImportingProgress, setIsImportingProgress] = useState(false);
  const [importProgressStatus, setImportProgressStatus] = useState("");
  const [importProgressSubtext, _setImportProgressSubtext] = useState("");
  const [importProgressPercent, setImportProgressPercent] = useState(0);
  const [importTotalRecords, _setImportTotalRecords] = useState(0);

  const handleImportDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleImportDragLeave = () => {};
  const handleImportDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        setRawImportText((ev.target?.result as string) || "");
        showToast("Loaded " + file.name + " successfully.");
      };
      reader.readAsText(file);
    }
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        setRawImportText((ev.target?.result as string) || "");
        showToast("Loaded " + file.name + " successfully.");
      };
      reader.readAsText(file);
    }
  };
  const executeBulkImport = async () => {
    if (!preflightReport || preflightReport.status === "FAIL") {
      showToast("Cannot execute import: Please run pre-flight validation first.");
      return;
    }

    const itemsToImport = preflightReport.parsedProducts || [];
    if (itemsToImport.length === 0) {
      showToast("No valid products detected to import.");
      return;
    }

    setIsImportingProgress(true);
    setImportProgressStatus("Parsing and verifying records...");
    setImportProgressPercent(25);

    try {
      await new Promise(r => setTimeout(r, 200));
      setImportProgressPercent(60);
      setImportProgressStatus("Committing database transactions and branch stock mappings...");

      const branchMapping: Record<string, string> = {};
      if (importTargetBranchId && importTargetBranchId !== 'ALL' && importTargetBranchId !== 'consolidated') {
        branchMapping['default'] = importTargetBranchId;
      }

      const res = importProducts(itemsToImport, branchMapping);

      setImportProgressPercent(100);
      setImportProgressStatus("Finalizing catalog indexes...");
      await new Promise(r => setTimeout(r, 300));
      setIsImportingProgress(false);

      if (res && res.error) {
        showToast(`Import Warning: ${res.error}`);
      } else {
        const count = res?.count ?? itemsToImport.length;
        showToast(`Bulk import completed successfully! ${count} product(s) added/updated.`);
        setRawImportText("");
        setPreflightReport(null);
      }
    } catch (err: any) {
      setIsImportingProgress(false);
      showToast(`Bulk Import Error: ${err.message || 'Import failed'}`);
    }
  };
  const handleFinalizeImportWithBranches = () => {
    setShowBranchConfigs(false);
    showToast("Branch configuration finalized.");
  };


 // CSV Import state with non-dismissable progress bar
 const handleRunPreflightManual = async () => {
 if (!rawImportText.trim()) {
 showToast('Please enter or upload JSON / CSV data first.');
 return;
 }
 setIsAnalyzingPreflight(true);
 try {
 const report = await runPreflightValidation(
 rawImportText,
 importTargetBranchId,
 branches,
 products,
 currentUser?.role
 );
 setPreflightReport(report);
 if (report.status === 'PASS') {
 showToast('Pre-flight Validation PASSED! Schema & Branch compatibility verified.');
 } else if (report.status === 'WARNING') {
 showToast('Pre-flight Validation PASSED WITH WARNINGS. Check branch mapping report.');
 } else {
 showToast('Pre-flight Validation REJECTED! Review critical diagnostics.');
 }
 } catch (err: any) {
 showToast(`Pre-flight Analysis Error: ${err.message}`);
 } finally {
 setIsAnalyzingPreflight(false);
 }
 }; const [pendingBranches, setPendingBranches] = useState<any[]>([]);
 const [showBranchConfigs, setShowBranchConfigs] = useState(false);
 const [migrationSubTab, setMigrationSubTab] = useState<'import' | 'export'>('import');

 // Movement Ledger tracking states
 const [movementSearch, setMovementSearch] = useState('');
 const [movementTypeFilter, setMovementTypeFilter] = useState('All');

 // State for selected product IDs in Catalog Stock Ledger
 const [selectedProdIds, setSelectedProdIds] = useState<Record<string, boolean>>({});

 // Bulk Damage Register Modal state
 const [showBulkDamageModal, setShowBulkDamageModal] = useState(false);
 const [bulkDamageBranchId, setBulkDamageBranchId] = useState('B1');
 const [bulkDamageQuantities, setBulkDamageQuantities] = useState<Record<string, number>>({});
 const [bulkDamageCategory, setBulkDamageCategory] = useState('Warehouse Breakage');
 const [bulkDamageAction, setBulkDamageAction] = useState('Disposed / Scrapped');
 const [bulkDamageNotes, setBulkDamageNotes] = useState('Bulk damaged items registered from Stock Ledger');

 const showToast = (message: string) => {
 setToastMessage(message);
 setTimeout(() => {
 setToastMessage(null);
 }, 4000);
 };

 // Standard dynamic catalog category list derived from productCategories configuration and existing product tags
 const categories = React.useMemo(() => {
 const set = new Set<string>();
 if (productCategories && productCategories.length > 0) {
 productCategories
 .filter(c => c.isActive !== false)
 .forEach(c => set.add(c.name));
 }
 products.forEach(p => {
 if (p.category && p.category.trim() !== '') {
 set.add(p.category.trim());
 }
 });
 return Array.from(set).sort();
 }, [products, productCategories]);

 const allowedToModify = currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.ADMIN;
 const allowedToImport = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER;

 // Auto-coverage calculator effect based on tile dimensions & box contents
 useEffect(() => {
 if (category.toLowerCase().includes('tile')) {
 const matches = size.match(/(\d+)\s*[xX*]\s*(\d+)/);
 if (matches && matches.length >= 3) {
 const w = parseFloat(matches[1]);
 const h = parseFloat(matches[2]);
 if (!isNaN(w) && !isNaN(h)) {
 // Math: (Width in cm * Height in cm / 10000) * pieces in box
 const sqm = (w * h / 10000) * Number(boxQuantity);
 setCoveragePerBox(parseFloat(sqm.toFixed(3)));
 }
 }
 } else {
 setCoveragePerBox(0);
 }
 }, [size, boxQuantity, category]);

 const getSelectedProducts = () => {
 return branchProducts.filter(p => selectedProdIds[p.id]);
 };

 const filteredLedgerEntries = React.useMemo(() => {
   return ledgerEntries.filter(le => {
     if (activeBranchId !== 'consolidated' && activeBranchId) {
       const matchBranch = isSameBranch(le.branchId, activeBranchId, branches);
       if (!matchBranch) return false;
     }
     const prod = products.find(p => p.id === le.productId || p.productName === le.productName);
     if (prod && !isProductInBranch(prod, activeBranchId, branchStock, branches)) return false;
     return true;
   });
 }, [ledgerEntries, activeBranchId, branches, products, branchStock]);

 const totalLedgerPages = Math.ceil(filteredLedgerEntries.length / ledgerPerPage) || 1;

 useEffect(() => {
 if (ledgerPage > totalLedgerPages && totalLedgerPages > 0) {
 setLedgerPage(totalLedgerPages);
 }
 }, [ledgerPage, totalLedgerPages]);
 const paginatedLedger = React.useMemo(() => {
   return filteredLedgerEntries.slice((ledgerPage - 1) * ledgerPerPage, ledgerPage * ledgerPerPage);
 }, [filteredLedgerEntries, ledgerPage, ledgerPerPage]);

  // List of all products with stock alerts (Out of Stock, Critical, Low Stock) for current branch scope
  const alertProductsList = React.useMemo(() => {
    return branchProducts.map(p => {
      const qty = getBranchStockQuantity(p, selectedViewBranchId, branchStock, branches);
      const bsRec = getBranchStockRecord(p, selectedViewBranchId, branchStock, branches);
      const threshold = selectedViewBranchId === 'consolidated'
        ? (p.minimumStock ?? p.lowStockThreshold ?? 10)
        : (bsRec?.lowStockThresholdOverride ?? bsRec?.lowStockThreshold ?? p.minimumStock ?? p.lowStockThreshold ?? 10);

      let alertType: 'OUT_OF_STOCK' | 'CRITICAL' | 'LOW' | 'NORMAL' = 'NORMAL';
      if (qty === 0) alertType = 'OUT_OF_STOCK';
      else if (qty <= threshold * 0.5) alertType = 'CRITICAL';
      else if (qty <= threshold) alertType = 'LOW';

      return {
        product: p,
        qty,
        threshold,
        alertType,
        deficit: Math.max(0, threshold - qty)
      };
    }).filter(item => item.alertType !== 'NORMAL');
  }, [branchProducts, selectedViewBranchId, branchStock, branches]);

  // Filtered alert items inside modal based on tab filter, search, and category
  const modalFilteredAlertItems = React.useMemo(() => {
    return alertProductsList.filter(item => {
      const matchFilter = 
        stockAlertModalFilter === 'ALL' ||
        (stockAlertModalFilter === 'OUT_OF_STOCK' && item.alertType === 'OUT_OF_STOCK') ||
        (stockAlertModalFilter === 'CRITICAL' && item.alertType === 'CRITICAL') ||
        (stockAlertModalFilter === 'LOW' && item.alertType === 'LOW');

      const q = stockAlertSearch.trim().toLowerCase();
      const matchSearch = !q || (
        item.product.productName.toLowerCase().includes(q) ||
        item.product.productCode.toLowerCase().includes(q) ||
        item.product.sku.toLowerCase().includes(q) ||
        (item.product.barcode && item.product.barcode.toLowerCase().includes(q)) ||
        item.product.category.toLowerCase().includes(q) ||
        item.product.brand.toLowerCase().includes(q)
      );

      const matchCategory = stockAlertCategory === 'All' || item.product.category === stockAlertCategory;

      return matchFilter && matchSearch && matchCategory;
    });
  }, [alertProductsList, stockAlertModalFilter, stockAlertSearch, stockAlertCategory]);

  // Bulk add all currently filtered alert items to PO Cart
  const handleBulkQueueAlertsToPoCart = () => {
    if (modalFilteredAlertItems.length === 0) {
      showToast('No items in the current view to queue.');
      return;
    }
    let updated = [...poCart];
    let countAdded = 0;

    modalFilteredAlertItems.forEach(item => {
      const requiredQty = item.deficit > 0 ? Math.max(item.deficit, 50) : 50;
      const idx = updated.findIndex(cartItem => cartItem.productId === item.product.id);
      if (idx >= 0) {
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + requiredQty };
      } else {
        updated.push({ productId: item.product.id, quantity: requiredQty });
      }
      countAdded++;
    });

    syncPoCart(updated);
    showToast(`Queued ${countAdded} alert item(s) to Procurement Restock Queue!`);
  };

  // Calculate Key Inventory Performance Indicators (Dashboard Statistics)
  const stats = React.useMemo(() => {
    const isConsolidated = selectedViewBranchId === 'consolidated' || !selectedViewBranchId;
    const nonDeleted = isConsolidated
      ? branchProducts
      : branchProducts.filter(p => isProductInBranch(p, selectedViewBranchId, branchStock, branches));

    let totalValue = 0;
    let totalItems = 0;
    let lowStock = 0;
    let criticalStock = 0;
    let outOfStock = 0;

    nonDeleted.forEach(p => {
      const qty = getBranchStockQuantity(p, selectedViewBranchId, branchStock, branches);

      const bsRec = getBranchStockRecord(p, selectedViewBranchId, branchStock, branches);
      const threshold = isConsolidated
        ? (p.minimumStock ?? p.lowStockThreshold ?? 10)
        : (bsRec?.lowStockThresholdOverride ?? bsRec?.lowStockThreshold ?? p.minimumStock ?? p.lowStockThreshold ?? 10);

      totalItems += qty;
      const unitValuation = bsRec?.costPriceOverride && bsRec.costPriceOverride > 0
        ? bsRec.costPriceOverride
        : (p.costPrice > 0 
            ? p.costPrice 
            : (bsRec?.sellingPriceOverride && bsRec.sellingPriceOverride > 0 
                ? bsRec.sellingPriceOverride 
                : (p.sellingPrice || 0)));

      totalValue += qty * unitValuation;
      if (qty === 0) {
        outOfStock++;
      } else {
        if (qty <= threshold) {
          lowStock++;
        }
        if (qty <= threshold * 0.5) {
          criticalStock++;
        }
      }
    });

    return {
      totalSKUs: nonDeleted.length,
      totalItems,
      totalValuation: totalValue,
      lowStockCount: lowStock,
      criticalStockCount: criticalStock,
      outOfStockCount: outOfStock
    };
  }, [branchProducts, branchStock, branches, activeBranchId, selectedViewBranchId]);

 // Movemet logs filtering logic
 const filteredMovements = movements.filter(m => {
 const p = products.find(prod => prod.id === m.productId);
 const prodName = p ? p.productName.toLowerCase() : '';
 const prodCode = p ? p.productCode.toLowerCase() : '';
 const skuCode = p ? p.sku.toLowerCase() : '';

 const matchSearch = 
 m.notes.toLowerCase().includes(movementSearch.toLowerCase()) ||
 m.referenceId.toLowerCase().includes(movementSearch.toLowerCase()) ||
 m.username.toLowerCase().includes(movementSearch.toLowerCase()) ||
 prodName.includes(movementSearch.toLowerCase()) ||
 prodCode.includes(movementSearch.toLowerCase()) ||
 skuCode.includes(movementSearch.toLowerCase());

 const matchType = 
 movementTypeFilter === 'All' || m.type === movementTypeFilter;

 const matchBranch = activeBranchId === 'consolidated' || 
   isSameBranch((m as any).branchId, activeBranchId, branches) || 
   isSameBranch(m.sourceBranchId, activeBranchId, branches) || 
   isSameBranch(m.destinationBranchId, activeBranchId, branches);

 return matchSearch && matchType && matchBranch;
 });

 // Dynamic Chemical Stock Batches Filtering
 const filteredBatches = React.useMemo(() => {
 return batches.filter(b => {
 const matchBranch = activeBranchId === 'consolidated' || isSameBranch(b.branchId, activeBranchId, branches);
 const prod = products.find(p => p.id === b.productId);
 const pName = prod ? prod.productName.toLowerCase() : (b.productName?.toLowerCase() || '');
 const pCode = prod ? prod.productCode.toLowerCase() : (b.productCode?.toLowerCase() || '');
 const bNo = b.batchNumber ? b.batchNumber.toLowerCase() : '';

 const matchSearch = !term.trim() ||
 pName.includes(term.toLowerCase()) ||
 pCode.includes(term.toLowerCase()) ||
 bNo.includes(term.toLowerCase());

 const matchStatus = statusFilter === 'All' ||
 (statusFilter === 'In Stock' && b.status === 'Good') ||
 (statusFilter === 'Low Stock' && b.status === 'Expiring Soon') ||
 (statusFilter === 'Out of Stock' && b.status === 'Expired') ||
 (statusFilter === 'Critical' && (b.status === 'Expiring Soon' || b.status === 'Expired')) ||
 b.status === statusFilter;

 const matchDate = !calendarSelectedDay || b.expiryDate === calendarSelectedDay;

 return matchBranch && matchSearch && matchStatus && matchDate;
 });
 }, [batches, activeBranchId, products, term, statusFilter, calendarSelectedDay]);

 const handleOpenAdd = () => {
 setProductCode(`TL-PR-${Date.now().toString().slice(-4)}`);
 setSku(`SKU-TPL-${Math.floor(Math.random()*10000)}`);
 setBarcode(generateEan13Barcode());
 setDesignName('');
 setProductName('');
 setCategory('Ceramic Tiles');
 setIsCustomCategoryInput(false);
 setBrand('');
 setSupplierId(suppliers[0]?.id || 'S1');
 setUnit('Unit');
 setSize('');
 setBoxQuantity(1);
 setCoveragePerBox(0);
 setProductImage('');
 setCostPrice(0);
 setSellingPrice(0);
 setMarkupPercent(0);
 setTaxType('12% VAT');
 setStockQuantity(0);
 setMinimumStock(0);
 const initBranch = currentUser?.role === UserRole.ADMIN 
   ? (selectedViewBranchId === 'consolidated' ? 'B1' : selectedViewBranchId)
   : (currentUser?.branchAssignmentId || 'B1');
 setTargetBranchId(initBranch);
 setOrigin(initBranch);
 setHasExpiration(false);
 setExpirationDate('');

 // Reset new supplier registration sub-fields
 setIsRegisteringNewSupplier(false);
 setNewSupplierName('');
 setNewSupplierContact('');
 setNewSupplierPhone('');
 setNewSupplierEmail('');
 setNewSupplierAddress('');

 setIsEditMode(false);
 setShowModal(true);
 };

 const handleOpenEdit = (p: Product) => {
 if (isResourceLocked(p.id)) {
  const lock = pessimisticLocks[p.id];
  showToast(`Access Denied: Product "${p.productName}" is currently locked by ${lock?.lockedBy || 'another operator'} who is editing it.`);
  return;
 }
 const success = acquirePessimisticLock(p.id);
 if (!success) {
  showToast(`Access Denied: Failed to acquire editing lock for "${p.productName}".`);
  return;
 }

 setEditingId(p.id);
 setProductCode(p.productCode);
 setSku(p.sku);
 setBarcode(p.barcode || generateEan13Barcode());
 setDesignName(p.designName || '');
 setProductName(p.productName);
 setCategory(p.category);
 setIsCustomCategoryInput(!categories.includes(p.category));
 setBrand(p.brand);
 setSupplierId(p.supplierId);
 setUnit(p.unit);
 setSize(p.size);
 setBoxQuantity(p.boxQuantity);
 setCoveragePerBox(p.coveragePerBox || 1.44);
 setProductImage(p.image || '');
 setCostPrice(p.costPrice);
 setSellingPrice(p.sellingPrice);
 const calculatedMarkup = p.markupPercent !== undefined ? p.markupPercent : (p.costPrice > 0 ? Math.round(((p.sellingPrice - p.costPrice) / p.costPrice) * 100 * 10) / 10 : 0);
 setMarkupPercent(calculatedMarkup);
 setTaxType(p.taxType || '12% VAT');
 setStockQuantity(p.stockQuantity);
 setMinimumStock(p.minimumStock);
 setOrigin(p.origin || '');
 setTargetBranchId(p.origin || (currentUser?.branchAssignmentId || 'B1'));
 setHasExpiration(!!p.hasExpiration);
 setExpirationDate(p.expirationDate || '');

 // Reset new supplier fields for edit mode
 setIsRegisteringNewSupplier(false);
 setIsEditMode(true);
 setShowModal(true);
 };

 const handleCloseProductModal = () => {
 if (isEditMode && editingId) {
  releasePessimisticLock(editingId);
 }
 setShowModal(false);
 };

 const handleSaveQuickSupplier = (e: React.FormEvent) => {
 e.preventDefault();
 if (!quickSupName.trim()) {
 showToast('Validation Error: Supplier Company Name is required.');
 return;
 }
 const newSup = createSupplier({
 name: quickSupName.trim(),
 contactPerson: quickSupContact.trim() || 'N/A',
 phone: quickSupPhone.trim() || 'N/A',
 email: quickSupEmail.trim() || 'N/A',
 address: quickSupAddress.trim() || 'Registered on-the-fly in catalog'
 });
 
 setSupplierId(newSup.id);
 showToast(`Supplier "${newSup.name}" registered successfully!`);
 
 // reset states
 setQuickSupName('');
 setQuickSupContact('');
 setQuickSupPhone('');
 setQuickSupEmail('');
 setQuickSupAddress('');
 setShowQuickSupplierModal(false);
 };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();

 if (!allowedToModify) {
 showToast('Authorization Required: Only Manager profiles are authorized to register items.');
 return;
 }

 if (!productCode.trim()) {
 showToast('Validation Error: Product Core Code is required.');
 return;
 }
 if (!sku.trim()) {
 showToast('Validation Error: Warehouse SKU ID is required.');
 return;
 }
 if (!productName.trim()) {
 showToast('Validation Error: Product Full Descriptive Name is required.');
 return;
 }
 if (!isRegisteringNewSupplier && !brand.trim()) {
 showToast('Validation Error: Corporate Brand / Label is required.');
 return;
 }
 if (hasExpiration && !expirationDate) {
 showToast('Validation Error: Catalog Expiration Date is required when Shelf-Life Expiration is active.');
 return;
 }

 let finalSupplierId = supplierId;

 if (!isEditMode && isRegisteringNewSupplier) {
 if (!newSupplierName.trim()) {
 showToast('Validation Error: Please provide a Supplier company name or uncheck registering new supplier.');
 return;
 }

 const newSup = createSupplier({
 name: newSupplierName.trim(),
 contactPerson: newSupplierContact.trim() || 'N/A',
 phone: newSupplierPhone.trim() || 'N/A',
 email: newSupplierEmail.trim() || 'N/A',
 address: newSupplierAddress.trim() || 'Registered on item addition'
 });
 finalSupplierId = newSup.id;
 }

 const finalCategory = category.trim() || 'Ceramic Tiles';

 const payload = {
 productCode: productCode.trim(),
 sku: sku.trim(),
 barcode: barcode.trim(),
 designName: designName.trim() || 'Standard',
 productName: productName.trim(),
 category: finalCategory,
 brand: isRegisteringNewSupplier ? newSupplierName.trim() : (brand.trim() || 'Generic'),
 supplierId: finalSupplierId,
 unit: unit.trim() || 'Unit',
 size: size.trim() || 'N/A',
 boxQuantity: Number(boxQuantity),
 coveragePerBox: Number(coveragePerBox),
 image: productImage,
 costPrice: Number(costPrice),
 sellingPrice: Number(sellingPrice),
 stockQuantity: Number(stockQuantity),
 minimumStock: Number(minimumStock),
 origin: targetBranchId || origin,
 markupPercent: Number(markupPercent),
 taxType,
 hasExpiration,
 expirationDate: hasExpiration ? expirationDate : undefined,
 };

 if (isEditMode) {
 updateProduct(editingId, payload);
 // addAuditLog and logManualAdjustment are triggered inside updateProduct automatically if qty changes
 showToast(`Custom specifications for details updated successfully.`);
 releasePessimisticLock(editingId);
 } else {
 createProduct(payload);
 const targetBName = branches.find(b => b.id === targetBranchId)?.name || targetBranchId;
 showToast(`Registered new item assigned to ${targetBName} branch.`);
 }
 setShowModal(false);
 };

 // Safe deletion routine
 const handleDeleteTrigger = (id: string, name: string) => {
   const hasActiveShift = !!activeShift || (shifts && shifts.some(s => s.status === "Open" || s.status === "OPEN"));
   if (hasActiveShift) {
     showToast("Cannot delete products while there is an active register shift.");
     return;
   }
 if (!allowedToModify) {
 showToast('Authorization Required: Access limited to Manager profiles.');
 return;
 }
 setConfirmDeleteId(id);
 setConfirmDeleteName(name);
 };

 // Opening the direct stock adjustment modal
 const handleOpenAdjust = (p: Product) => {
 setAdjustProductId(p.id);
 setAdjustProductName(p.productName);
 setAdjustType('ADD');
 setAdjustVal(10);
 setAdjustReason('Regular cyclic floor audit restock adjustment');
 setShowAdjustModal(true);
 };

 const handleAdjustSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 const p = products.find(prod => prod.id === adjustProductId);
 if (!p) return;

 if (!allowedToModify) {
 showToast('Security Violation: Only Store Managers are authorized to manually adjust stock counts.');
 return;
 }

 const finalChange = adjustType === 'ADD' ? adjustVal : -adjustVal;
 const finalNewQty = Math.max(0, p.stockQuantity + finalChange);

 // Call updateProduct with our custom adjustment context reason
 updateProduct(adjustProductId, { stockQuantity: finalNewQty }, adjustReason);
 showToast(`Stock level updated. Registered stock action log: ${finalChange > 0 ? '+' : ''}${finalChange}`);
 setShowAdjustModal(false);
 };

 const handleManualLedgerSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!manualLedgerProductId) {
 showToast('Error: Please select a target product.');
 return;
 }
 if (manualLedgerQty <= 0) {
 showToast('Error: Quantity must be greater than zero.');
 return;
 }

 try {
 await triggerSystemProcessing(
 'Processing Manual Ledger Double-Entry...',
 1400,
 'db',
 undefined,
 'Validating SKU constraints, preparing ledgers, and adjusting inventories...'
 );

 createManualLedgerEntry({
 productId: manualLedgerProductId,
 branchId: manualLedgerBranchId,
 movementType: manualLedgerType,
 quantity: manualLedgerQty,
 referenceNo: manualLedgerRefNo,
 remarks: manualLedgerRemarks
 });

 showToast('Success: Manual ledger entry registered and stock levels synced!');
 setShowManualLedgerModal(false);
 
 // Reset form fields
 setManualLedgerProductId('');
 setManualLedgerRefNo('');
 setManualLedgerRemarks('');
 setManualLedgerQty(10);
 } catch (err) {
 showToast('Error: Failed to register manual ledger entry.');
 }
 };

 // Opening the labels viewer
 const handleOpenCodesModal = (p: Product) => {
 setCodesProduct(p);
 setShowCodesModal(true);
 };

 const handleSimulatePrint = () => {
 if (!codesProduct) return;
 setPrintingCode(true);

 const isTile = (codesProduct.category || '').toLowerCase().includes('tile');
 const dimLabel = isTile ? 'DIMENSION' : 'SPEC/SIZE';
 const dimVal = codesProduct.size || (isTile ? 'N/A' : 'Standard');
 const qtyLabel = isTile ? 'BOX QTY' : 'PACK QTY';
 const qtyVal = isTile
 ? `${codesProduct.boxQuantity || 1} tiles/box`
 : `${codesProduct.boxQuantity || 1} ${codesProduct.unit || 'pcs'}`;

 const printHtmlContents = `
 <html>
 <head>
 <title>Label Print - ${codesProduct.sku}</title>
 <style>
 @page {
 size: 4in 2.5in;
 margin: 0;
 }
 body {
 font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
 margin: 0;
 padding: 10px;
 background: #ffffff;
 color: #000000;
 width: 4in;
 height: 2.5in;
 box-sizing: border-box;
 display: flex;
 flex-direction: column;
 justify-content: space-between;
 -webkit-print-color-adjust: exact;
 print-color-adjust: exact;
 }
 .header {
 border-bottom: 2px solid #000;
 padding-bottom: 3px;
 margin-bottom: 4px;
 display: flex;
 justify-content: space-between;
 align-items: center;
 }
 .logo {
 font-weight: 900;
 font-size: 13px;
 letter-spacing: 1px;
 }
 .category {
 font-size: 8px;
 text-transform: uppercase;
 background: #000;
 color: #fff;
 padding: 1px 4px;
 font-weight: bold;
 }
 .details {
 font-size: 11px;
 font-weight: 800;
 line-height: 1.2;
 margin-bottom: 2px;
 display: -webkit-box;
 -webkit-line-clamp: 2;
 -webkit-box-orient: vertical;
 overflow: hidden;
 }
 .brand-desc {
 font-size: 8px;
 color: #333;
 margin-bottom: 4px;
 text-transform: uppercase;
 font-weight: 600;
 }
 .meta-grid {
 display: grid;
 grid-template-cols: 1fr 1fr;
 gap: 2px 8px;
 font-size: 9px;
 margin-bottom: 6px;
 border-top: 1px dashed #777;
 border-bottom: 1px dashed #777;
 padding: 3px 0;
 }
 .meta-item strong {
 font-weight: 900;
 }
 .codes-area {
 display: flex;
 justify-content: space-between;
 align-items: center;
 gap: 4px;
 }
 .barcode-section {
 flex: 1;
 display: flex;
 flex-direction: column;
 align-items: center;
 }
 .barcode-lines {
 display: flex;
 gap: 1px;
 height: 32px;
 align-items: flex-end;
 margin-bottom: 2px;
 }
 .line {
 background: #000;
 height: 100%;
 }
 .barcode-text {
 font-family: monospace;
 font-size: 8.5px;
 letter-spacing: 1.5px;
 font-weight: bold;
 }
 </style>
 </head>
 <body>
 <div>
 <div class="header">
 <span class="logo">TILEPOINT</span>
 <span class="category">${codesProduct.category || 'TILE'}</span>
 </div>
 <div class="details">${codesProduct.productName}</div>
 <div class="brand-desc">Brand: ${codesProduct.brand || 'Unbranded'} • Design: ${codesProduct.designName || 'N/A'}</div>
 
 <div class="meta-grid">
 <div class="meta-item">SKU: <strong>${codesProduct.sku}</strong></div>
 <div class="meta-item">${dimLabel}: <strong>${dimVal}</strong></div>
 <div class="meta-item">CODE: <strong>${codesProduct.productCode}</strong></div>
 <div class="meta-item">${qtyLabel}: <strong>${qtyVal}</strong></div>
 </div>
 </div>

 <div class="codes-area">
 <div class="barcode-section">
 <div style="width: 100%; max-width: 180px; height: 34px;">
 ${generateCode128SvgHtml(codesProduct.barcode, 34)}
 </div>
 <div class="barcode-text">${codesProduct.barcode}</div>
 </div>
 </div>

 <script>
 window.onload = function() {
 window.focus();
 window.print();
 setTimeout(function() { window.close(); }, 800);
 }
 </script>
 </body>
 </html>
 `;

 let popupOpened = false;
 try {
 // First try standard target popup window approach
 const printWindow = window.open('', '_blank', 'width=600,height=420');
 if (printWindow) {
 printWindow.document.write(printHtmlContents);
 printWindow.document.close();
 popupOpened = true;
 }
 } catch (err) {
 console.warn("Popup blocked or unsupported. Invoking robust invisible iframe print fallback...", err);
 }

 if (!popupOpened) {
 // Robust browser & iframe-proof fallback: dynamically insert an invisible iframe in the document root
 try {
 const fallbackIframe = document.createElement('iframe');
 fallbackIframe.style.position = 'fixed';
 fallbackIframe.style.width = '0px';
 fallbackIframe.style.height = '0px';
 fallbackIframe.style.border = 'none';
 fallbackIframe.style.bottom = '0px';
 fallbackIframe.style.right = '0px';
 fallbackIframe.style.opacity = '0';
 document.body.appendChild(fallbackIframe);

 const iframeDoc = fallbackIframe.contentWindow ? fallbackIframe.contentWindow.document : fallbackIframe.contentDocument;
 if (iframeDoc) {
 iframeDoc.open();
 iframeDoc.write(printHtmlContents);
 iframeDoc.close();

 setTimeout(() => {
 if (fallbackIframe.contentWindow) {
 fallbackIframe.contentWindow.focus();
 fallbackIframe.contentWindow.print();
 }
 // Cleanup the temporary iframe to conserve browser resource efficiency
 setTimeout(() => {
 if (document.body.contains(fallbackIframe)) {
 document.body.removeChild(fallbackIframe);
 }
 }, 3000);
 }, 800);
 }
 } catch (fallbackError) {
 console.error("Print spooling fallback failed completely", fallbackError);
 showToast("Error spelling to print spooler. Please trigger window print manual command (Ctrl+P/Cmd+P).");
 }
 }

 setTimeout(() => {
 setPrintingCode(false);
 showToast('Barcode label layout dispatched to print spooler!');
 }, 1200);
 };

 const handleBulkSimulatePrint = (selectedProducts: Product[]) => {
 if (selectedProducts.length === 0) return;
 setPrintingCode(true);

 const printHtmlContents = `
 <html>
 <head>
 <title>Bulk Label Print (${selectedProducts.length} items)</title>
 <style>
 @page {
 size: 4in 2.5in;
 margin: 0;
 }
 body {
 font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
 margin: 0;
 padding: 0;
 background: #ffffff;
 color: #000000;
 -webkit-print-color-adjust: exact;
 print-color-adjust: exact;
 }
 .label-page {
 width: 4in;
 height: 2.5in;
 padding: 10px;
 box-sizing: border-box;
 display: flex;
 flex-direction: column;
 justify-content: space-between;
 page-break-after: always;
 overflow: hidden;
 }
 .label-page:last-child {
 page-break-after: avoid;
 }
 .header {
 border-bottom: 2px solid #000;
 padding-bottom: 3px;
 margin-bottom: 4px;
 display: flex;
 justify-content: space-between;
 align-items: center;
 }
 .logo {
 font-weight: 900;
 font-size: 13px;
 letter-spacing: 1px;
 }
 .category {
 font-size: 8px;
 text-transform: uppercase;
 background: #000;
 color: #fff;
 padding: 1px 4px;
 font-weight: bold;
 }
 .details {
 font-size: 11px;
 font-weight: 800;
 line-height: 1.2;
 margin-bottom: 2px;
 display: -webkit-box;
 -webkit-line-clamp: 2;
 -webkit-box-orient: vertical;
 overflow: hidden;
 }
 .brand-desc {
 font-size: 8px;
 color: #333;
 margin-bottom: 4px;
 text-transform: uppercase;
 font-weight: 600;
 }
 .meta-grid {
 display: grid;
 grid-template-cols: 1fr 1fr;
 gap: 2px 8px;
 font-size: 9px;
 margin-bottom: 6px;
 border-top: 1px dashed #777;
 border-bottom: 1px dashed #777;
 padding: 3px 0;
 }
 .meta-item strong {
 font-weight: 900;
 }
 .codes-area {
 display: flex;
 justify-content: space-between;
 align-items: center;
 gap: 4px;
 }
 .barcode-section {
 flex: 1;
 display: flex;
 flex-direction: column;
 align-items: center;
 }
 .barcode-lines {
 display: flex;
 gap: 1px;
 height: 32px;
 align-items: flex-end;
 margin-bottom: 2px;
 }
 .line {
 background: #000;
 height: 100%;
 }
 .barcode-text {
 font-family: monospace;
 font-size: 8.5px;
 letter-spacing: 1.5px;
 font-weight: bold;
 }
 </style>
 </head>
 <body>
 ${selectedProducts.map((pItem) => `
 <div class="label-page">
 <div>
 <div class="header">
 <span class="logo">TILEPOINT</span>
 <span class="category">${pItem.category || 'TILE'}</span>
 </div>
 <div class="details">${pItem.productName}</div>
 <div class="brand-desc">Brand: ${pItem.brand || 'Unbranded'} • Design: ${pItem.designName || 'N/A'}</div>
 
 <div class="meta-grid">
 <div class="meta-item">SKU: <strong>${pItem.sku}</strong></div>
 <div class="meta-item">${(pItem.category || '').toLowerCase().includes('tile') ? 'DIMENSION' : 'SPEC/SIZE'}: <strong>${pItem.size || ((pItem.category || '').toLowerCase().includes('tile') ? 'N/A' : 'Standard')}</strong></div>
 <div class="meta-item">CODE: <strong>${pItem.productCode}</strong></div>
 <div class="meta-item">${(pItem.category || '').toLowerCase().includes('tile') ? 'BOX QTY' : 'PACK QTY'}: <strong>${(pItem.category || '').toLowerCase().includes('tile') ? (pItem.boxQuantity || 1) + ' tiles/box' : (pItem.boxQuantity || 1) + ' ' + (pItem.unit || 'pcs')}</strong></div>
 </div>
 </div>

 <div class="codes-area">
 <div class="barcode-section">
 <div style="width: 100%; max-width: 180px; height: 34px;">
 ${generateCode128SvgHtml(pItem.barcode, 34)}
 </div>
 <div class="barcode-text">${pItem.barcode}</div>
 </div>
 </div>
 </div>
 `).join('')}

 <script>
 window.onload = function() {
 window.focus();
 window.print();
 setTimeout(function() { window.close(); }, 800);
 }
 </script>
 </body>
 </html>
 `;

 let popupOpened = false;
 try {
 const printWindow = window.open('', '_blank', 'width=600,height=420');
 if (printWindow) {
 printWindow.document.write(printHtmlContents);
 printWindow.document.close();
 popupOpened = true;
 }
 } catch (err) {
 console.warn("Popup blocked or unsupported. Invoking robust invisible iframe print fallback...", err);
 }

 if (!popupOpened) {
 try {
 const fallbackIframe = document.createElement('iframe');
 fallbackIframe.style.position = 'fixed';
 fallbackIframe.style.width = '0px';
 fallbackIframe.style.height = '0px';
 fallbackIframe.style.border = 'none';
 fallbackIframe.style.bottom = '0px';
 fallbackIframe.style.right = '0px';
 fallbackIframe.style.opacity = '0';
 document.body.appendChild(fallbackIframe);

 const iframeDoc = fallbackIframe.contentWindow ? fallbackIframe.contentWindow.document : fallbackIframe.contentDocument;
 if (iframeDoc) {
 iframeDoc.open();
 iframeDoc.write(printHtmlContents);
 iframeDoc.close();

 setTimeout(() => {
 if (fallbackIframe.contentWindow) {
 fallbackIframe.contentWindow.focus();
 fallbackIframe.contentWindow.print();
 }
 setTimeout(() => {
 if (document.body.contains(fallbackIframe)) {
 document.body.removeChild(fallbackIframe);
 }
 }, 3000);
 }, 800);
 }
 } catch (fallbackError) {
 console.error("Print spooling fallback failed completely", fallbackError);
 showToast("Error spelling to print spooler.");
 }
 }

 setTimeout(() => {
 setPrintingCode(false);
 showToast('Bulk barcode label layouts dispatched to print spooler!');
 }, 1200);
 };

 const handleBulkSubmitDamage = (e: React.FormEvent) => {
 e.preventDefault();
 const selected = branchProducts.filter(p => selectedProdIds[p.id]);
 if (selected.length === 0) {
 showToast("Error: No items selected.");
 return;
 }

 const branchObj = branches.find(b => b.id === bulkDamageBranchId);
 const branchName = branchObj?.name || bulkDamageBranchId;

 let successCount = 0;
 selected.forEach(p => {
 const qty = bulkDamageQuantities[p.id] || 1;
 if (qty > 0) {
 createDamageLog({
 productId: p.id,
 productName: p.productName,
 productSku: p.sku || '',
 branchId: bulkDamageBranchId,
 branchName: branchName,
 quantity: qty,
 category: bulkDamageCategory,
 actionTaken: bulkDamageAction,
 notes: bulkDamageNotes,
 reason: bulkDamageCategory
 });
 successCount++;
 }
 });

 setSelectedProdIds({});
 setShowBulkDamageModal(false);
 showToast(`Bulk damage register compiled successfully: logged ${successCount} broken items for ${branchName}.`);
 };

 // Bulk Import / Export simulations
 return (
 <div className="space-y-6 animate-fade-in text-foreground">
  {/* SUB-HEADER TAB NAVIGATION */}
  {!hideTabHeader && (
    <InventoryHeaderNav
      activeSubTab={activeSubTab}
      changeActiveSubTab={changeActiveSubTab}
      stockTransfers={stockTransfers}
    />
  )}

  {/* INVENTORY DASHBOARD SUMMARY STATS */}
  {['catalog', 'movements', 'ledger'].includes(activeSubTab) && (
    <InventoryStatsCards
      stats={stats}
      onOpenStockAlertsModal={(filter) => {
        setStockAlertModalFilter(filter);
        setShowStockAlertsModal(true);
      }}
    />
  )}

  {/* VIEW 1: CATALOG STOCK LEDGER */}
  {activeSubTab === "catalog" && (
    <CatalogStockLedger
      branchProducts={branchProducts}
      branchStock={branchStock}
      branches={branches}
      categories={categories}
      currentUser={currentUser}
      isAdminUser={isAdminUser}
      allowedToModify={allowedToModify}
      hasActiveShift={hasActiveShift}
      canSeeFinancialCostsAndSources={canSeeFinancialCostsAndSources}
      selectedViewBranchId={selectedViewBranchId}
      handleBranchSelect={handleBranchSelect}
      term={term}
      setTerm={setTerm}
      categoryFilter={categoryFilter}
      setCategoryFilter={setCategoryFilter}
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      sortBy={sortBy}
      setSortBy={setSortBy}
      selectedProdIds={selectedProdIds}
      setSelectedProdIds={setSelectedProdIds}
      expandedProductIds={expandedProductIds}
      toggleProductExpand={toggleProductExpand}
      highlightedProductId={highlightedProductId}
      isCompactColumns={isCompactColumns}
      prodPage={prodPage}
      setProdPage={setProdPage}
      prodsPerPage={prodsPerPage}
      handleOpenAdd={handleOpenAdd}
      handleBulkSimulatePrint={handleBulkSimulatePrint}
      setBulkDamageQuantities={setBulkDamageQuantities}
      setBulkDamageBranchId={setBulkDamageBranchId}
      setShowBulkDamageModal={setShowBulkDamageModal}
      handleOpenCodesModal={handleOpenCodesModal}
      handleQueueRestock={handleQueueRestock}
      handleOpenAdjust={handleOpenAdjust}
      handleOpenEdit={handleOpenEdit}
      handleDeleteTrigger={handleDeleteTrigger}
      updateBranchLowStockThreshold={updateBranchLowStockThreshold}
      showToast={showToast}
      isLoading={isBranchLoading || isFetching}
    />
  )}

  {/* VIEW 7: SHELF-LIFE & EXPIRY CALENDAR */}
  {activeSubTab === 'expiry' && (
    <ExpirySubTab
      calendarSelectedDay={calendarSelectedDay}
      setCalendarSelectedDay={setCalendarSelectedDay}
      calendarMonth={calendarMonth}
      setCalendarMonth={setCalendarMonth}
      calendarYear={calendarYear}
      setCalendarYear={setCalendarYear}
      batches={batches}
      filteredBatches={filteredBatches}
      computeLiveBatchStatus={computeLiveBatchStatus}
      handleResetSimulationBatches={handleResetSimulationBatches}
      products={products}
      branches={branches}
      setSelectedBatchDetail={setSelectedBatchDetail}
      setBatchFormBranchId={setBatchFormBranchId}
      selectedViewBranchId={selectedViewBranchId}
      currentUser={currentUser}
      setShowAddBatchModal={setShowAddBatchModal}
      hasActiveShift={hasActiveShift}
      handleRemoveBatch={handleRemoveBatch}
    />
  )}

  {/* ---------------------------------------------------------------------- */}
  {/* SUB-TAB 2: ADJUSTMENTS & MOVEMENT LOGS */}
  {/* ---------------------------------------------------------------------- */}
  {activeSubTab === 'movements' && (
    <MovementsSubTab
      setShowAdjustModal={setShowAdjustModal}
      filteredMovements={filteredMovements}
      movementSearch={movementSearch}
      setMovementSearch={setMovementSearch}
      movementTypeFilter={movementTypeFilter}
      setMovementTypeFilter={setMovementTypeFilter}
      products={products}
      branches={branches}
    />
  )}

  {/* ---------------------------------------------------------------------- */}
  {/* SUB-TAB 3: STOCK TRANSFERS */}
  {/* ---------------------------------------------------------------------- */}
  {activeSubTab === 'transfers' && (
    <TransfersSubTab
      setShowCreateTransfer={setShowCreateTransfer}
      stockTransfers={stockTransfers}
      activeBranchId={activeBranchId}
      branches={branches}
      isSameBranch={isSameBranch}
    />
  )}

  {/* ---------------------------------------------------------------------- */}
  {/* SUB-TAB 4: LOGISTICS LEDGER & HEATMAP */}
  {/* ---------------------------------------------------------------------- */}
  {activeSubTab === 'ledger' && (
    <StockLedgerSubTab
      setShowManualLedgerModal={setShowManualLedgerModal}
      branches={branches}
      isAdminUser={isAdminUser}
      activeBranchId={activeBranchId}
      selectedViewBranchId={selectedViewBranchId}
      products={products}
      branchStock={branchStock}
      isProductInBranch={isProductInBranch}
      getBranchStockQuantity={getBranchStockQuantity}
      filteredLedgerEntries={filteredLedgerEntries}
      paginatedLedger={paginatedLedger}
    />
  )}

  {/* ---------------------------------------------------------------------- */}
  {/* SUB-TAB 5: IMPORT & MIGRATION */}
  {/* ---------------------------------------------------------------------- */}
  {activeSubTab === 'import' && (
    <ImportExportSubTab
      migrationSubTab={migrationSubTab}
      setMigrationSubTab={setMigrationSubTab}
      currentUser={currentUser}
      importTargetBranchId={importTargetBranchId}
      setImportTargetBranchId={setImportTargetBranchId}
      branches={branches}
      getBranchOptionLabel={getBranchOptionLabel}
      handleImportDragOver={handleImportDragOver}
      handleImportDragLeave={handleImportDragLeave}
      handleImportDrop={handleImportDrop}
      handleFileSelect={handleFileSelect}
      handleRunPreflightManual={handleRunPreflightManual}
      rawImportText={rawImportText}
      setRawImportText={setRawImportText}
      isAnalyzingPreflight={isAnalyzingPreflight}
      preflightReport={preflightReport}
      executeBulkImport={executeBulkImport}
      allowedToImport={allowedToImport}
      products={products}
      branchProducts={branchProducts}
      saveFileToBackup={saveFileToBackup}
      showToast={showToast}
      getBranchStockQuantity={getBranchStockQuantity}
      selectedViewBranchId={selectedViewBranchId}
      branchStock={branchStock}
      suppliers={suppliers}
      exportInventoryCatalogToXLSX={exportInventoryCatalogToXLSX}
    />
  )}

  {/* ---------------------------------------------------------------------- */}
  {/* SUB-TAB 6: BRANCH PRICE OVERRIDES */}
  {/* ---------------------------------------------------------------------- */}
  {activeSubTab === 'branch-prices' && (
    <BranchPricesSubTab
      branches={branches}
      isAdminUser={isAdminUser}
      activeBranchId={activeBranchId}
      getBranchOptionLabel={getBranchOptionLabel}
      branchProducts={branchProducts}
      branchStock={branchStock}
    />
  )}

  {/* CHEMICAL BATCH DETAIL MODAL */}
  <ChemicalBatchDetailModal
    batch={selectedBatchDetail}
    onClose={() => setSelectedBatchDetail(null)}
    products={products}
    branches={branches}
    suppliers={suppliers}
    branchStock={branchStock}
    onTriggerTransfer={handleTriggerTransfer}
    computeLiveBatchStatus={computeLiveBatchStatus}
  />

  {/* REGISTER NEW BATCH MODAL */}
  <RegisterBatchModal
    isOpen={showAddBatchModal}
    onClose={() => setShowAddBatchModal(false)}
    onSubmit={handleRegisterBatch}
    branchProducts={branchProducts}
    products={products}
    branches={branches}
    currentUser={currentUser}
    batchFormProductId={batchFormProductId}
    setBatchFormProductId={setBatchFormProductId}
    batchFormNo={batchFormNo}
    setBatchFormNo={setBatchFormNo}
    batchFormQty={batchFormQty}
    setBatchFormQty={setBatchFormQty}
    batchFormMfgDate={batchFormMfgDate}
    setBatchFormMfgDate={setBatchFormMfgDate}
    batchFormExpDate={batchFormExpDate}
    setBatchFormExpDate={setBatchFormExpDate}
    batchFormBranchId={batchFormBranchId}
    setBatchFormBranchId={setBatchFormBranchId}
    batchFormRemarks={batchFormRemarks}
    setBatchFormRemarks={setBatchFormRemarks}
  />

  {/* QUICK SUPPLIER REGISTRATION MODAL */}
  <QuickSupplierModal
    isOpen={showQuickSupplierModal}
    onClose={() => setShowQuickSupplierModal(false)}
    onSubmit={handleSaveQuickSupplier}
    quickSupName={quickSupName}
    setQuickSupName={setQuickSupName}
    quickSupContact={quickSupContact}
    setQuickSupContact={setQuickSupContact}
    quickSupPhone={quickSupPhone}
    setQuickSupPhone={setQuickSupPhone}
    quickSupEmail={quickSupEmail}
    setQuickSupEmail={setQuickSupEmail}
    quickSupAddress={quickSupAddress}
    setQuickSupAddress={setQuickSupAddress}
  />

  {/* MODAL 1: ADD & EDIT PRODUCT DIALOG */}
  <AddEditProductModal
    isOpen={showModal}
    onClose={handleCloseProductModal}
    onSubmit={handleSubmit}
    isEditMode={isEditMode}
    productCode={productCode}
    setProductCode={setProductCode}
    sku={sku}
    setSku={setSku}
    barcode={barcode}
    setBarcode={setBarcode}
    generateEan13Barcode={generateEan13Barcode}
    showToast={showToast}
    category={category}
    setCategory={setCategory}
    categories={categories}
    isCustomCategoryInput={isCustomCategoryInput}
    setIsCustomCategoryInput={setIsCustomCategoryInput}
    brand={brand}
    setBrand={setBrand}
    designName={designName}
    setDesignName={setDesignName}
    productName={productName}
    setProductName={setProductName}
    unit={unit}
    setUnit={setUnit}
    size={size}
    setSize={setSize}
    boxQuantity={boxQuantity}
    setBoxQuantity={setBoxQuantity}
    coveragePerBox={coveragePerBox}
    setCoveragePerBox={setCoveragePerBox}
    isRegisteringNewSupplier={isRegisteringNewSupplier}
    setIsRegisteringNewSupplier={setIsRegisteringNewSupplier}
    supplierId={supplierId}
    setSupplierId={setSupplierId}
    suppliers={suppliers}
    setShowQuickSupplierModal={setShowQuickSupplierModal}
    newSupplierName={newSupplierName}
    setNewSupplierName={setNewSupplierName}
    newSupplierContact={newSupplierContact}
    setNewSupplierContact={setNewSupplierContact}
    newSupplierPhone={newSupplierPhone}
    setNewSupplierPhone={setNewSupplierPhone}
    newSupplierEmail={newSupplierEmail}
    setNewSupplierEmail={setNewSupplierEmail}
    newSupplierAddress={newSupplierAddress}
    setNewSupplierAddress={setNewSupplierAddress}
    costPrice={costPrice}
    handleCostPriceChange={handleCostPriceChange}
    markupPercent={markupPercent}
    handleMarkupChange={handleMarkupChange}
    sellingPrice={sellingPrice}
    handleSellingPriceChange={handleSellingPriceChange}
    taxType={taxType}
    setTaxType={setTaxType}
    targetBranchId={targetBranchId}
    setTargetBranchId={setTargetBranchId}
    origin={origin}
    setOrigin={setOrigin}
    currentUser={currentUser}
    branches={branches}
    stockQuantity={stockQuantity}
    setStockQuantity={setStockQuantity}
    minimumStock={minimumStock}
    setMinimumStock={setMinimumStock}
    hasExpiration={hasExpiration}
    setHasExpiration={setHasExpiration}
    expirationDate={expirationDate}
    setExpirationDate={setExpirationDate}
  />

 {/* MODAL 2: MANUAL STOCK ADJUSTMENT DIALOG */}
  <StockAdjustmentModal
    isOpen={showAdjustModal}
    onClose={() => setShowAdjustModal(false)}
    onSubmit={handleAdjustSubmit}
    adjustProductName={adjustProductName}
    adjustType={adjustType}
    setAdjustType={setAdjustType}
    adjustVal={adjustVal}
    setAdjustVal={setAdjustVal}
    adjustReason={adjustReason}
    setAdjustReason={setAdjustReason}
  />

  {/* MODAL: MANUAL STOCK LEDGER ENTRY DIALOG */}
  <ManualLedgerModal
    isOpen={showManualLedgerModal}
    onClose={() => setShowManualLedgerModal(false)}
    onSubmit={handleManualLedgerSubmit}
    products={branchProducts}
    branches={branches}
    currentUser={currentUser}
    manualLedgerProductId={manualLedgerProductId}
    setManualLedgerProductId={setManualLedgerProductId}
    manualLedgerBranchId={manualLedgerBranchId}
    setManualLedgerBranchId={setManualLedgerBranchId}
    manualLedgerType={manualLedgerType}
    setManualLedgerType={setManualLedgerType}
    manualLedgerQty={manualLedgerQty}
    setManualLedgerQty={setManualLedgerQty}
    manualLedgerRefNo={manualLedgerRefNo}
    setManualLedgerRefNo={setManualLedgerRefNo}
    manualLedgerRemarks={manualLedgerRemarks}
    setManualLedgerRemarks={setManualLedgerRemarks}
  />

  {/* MODAL 3: BARCODE & QR CODES VIEWER / PRINT DIALOG */}
  <BarcodeModal
    isOpen={showCodesModal}
    onClose={() => setShowCodesModal(false)}
    product={codesProduct}
    onSimulatePrint={handleSimulatePrint}
    printingCode={printingCode}
    showToast={showToast}
  />

  {/* Confirmation soft-delete modal */}
  <ConfirmDeleteProductModal
    isOpen={!!confirmDeleteId}
    onClose={() => setConfirmDeleteId(null)}
    productName={confirmDeleteName}
    isBlocked={isRowClearingBlocked()}
    blockedReason={getRowClearingBlockedReason()}
    onConfirm={() => {
      deleteProduct(confirmDeleteId!);
      setConfirmDeleteId(null);
      showToast('Listing archived and soft-deleted successfully.');
    }}
  />

  {/* NEW MODAL: Newly Discovered Outlets / Branches Configure & Register Form Panel */}
  <BranchConfigsModal
    isOpen={showBranchConfigs}
    onClose={() => setShowBranchConfigs(false)}
    pendingBranches={pendingBranches}
    setPendingBranches={setPendingBranches}
    branches={branches}
    onFinalizeImport={handleFinalizeImportWithBranches}
  />

  {/* MODAL 5: Create Stock Transfer Request Modal */}
  <CreateTransferModal
    isOpen={showCreateTransfer}
    onClose={() => setShowCreateTransfer(false)}
    branches={branches}
    products={products}
    branchProducts={branchProducts}
    branchStock={branchStock}
    currentUser={currentUser}
    transferSource={transferSource}
    setTransferSource={setTransferSource}
    transferDest={transferDest}
    setTransferDest={setTransferDest}
    transferTypeSelect={transferTypeSelect}
    setTransferTypeSelect={setTransferTypeSelect}
    tempProductId={tempProductId}
    setTempProductId={setTempProductId}
    tempQty={tempQty}
    setTempQty={setTempQty}
    transferItems={transferItems}
    setTransferItems={setTransferItems}
    transferReasonInput={transferReasonInput}
    setTransferReasonInput={setTransferReasonInput}
    onSubmit={() => {
      if (transferSource === transferDest || !transferDest) {
        showToast('Invalid Route: Source and Destination branch must be distinct.');
        return;
      }
      if (transferItems.length === 0) {
        showToast('Catalog Empty: Add at least one tile product to the queue before executing dispatch request.');
        return;
      }
      const reason = transferReasonInput.trim() || `Inter-branch stock transfer of ${transferItems.length} products`;
      createStockTransfer(transferSource, transferDest, transferTypeSelect, transferItems, reason);
      setShowCreateTransfer(false);
      showToast('Stock Transfer Request successfully formulated and placed in Pending approval pipe!');
    }}
    showToast={showToast}
  />

 {/* MODAL 6: Bulk Damage Register Modal */}
  <BulkDamageModal
    isOpen={showBulkDamageModal}
    onClose={() => setShowBulkDamageModal(false)}
    onSubmit={handleBulkSubmitDamage}
    branches={branches}
    branchStock={branchStock}
    selectedProducts={getSelectedProducts()}
    bulkDamageBranchId={bulkDamageBranchId}
    setBulkDamageBranchId={setBulkDamageBranchId}
    bulkDamageCategory={bulkDamageCategory}
    setBulkDamageCategory={setBulkDamageCategory}
    bulkDamageAction={bulkDamageAction}
    setBulkDamageAction={setBulkDamageAction}
    bulkDamageNotes={bulkDamageNotes}
    setBulkDamageNotes={setBulkDamageNotes}
    bulkDamageQuantities={bulkDamageQuantities}
    setBulkDamageQuantities={setBulkDamageQuantities}
  />

  {/* Success toast alert bar */}
  <ToastNotification
    message={toastMessage}
    onClose={() => setToastMessage(null)}
  />
 
  {/* STOCK ALERT DIAGNOSTICS & ACTION HUB MODAL */}
  <StockAlertsModal
    isOpen={showStockAlertsModal}
    onClose={() => setShowStockAlertsModal(false)}
    selectedViewBranchId={selectedViewBranchId}
    branches={branches}
    products={products}
    alertProductsList={alertProductsList}
    stats={stats}
    poCart={poCart}
    onQueueRestock={handleQueueRestock}
    onBulkQueueAlerts={handleBulkQueueAlertsToPoCart}
    onOpenAdjust={handleOpenAdjust}
    onLocateInCatalog={(pCode, pId) => {
      setTerm(pCode);
      setHighlightedProductId(pId);
      changeActiveSubTab("catalog");
    }}
    exportStockAlertsToXLSX={exportStockAlertsToXLSX}
    showToast={showToast}
    initialFilter={stockAlertModalFilter}
  />

  {/* Reset/Synchronize Chemical Batches Confirmation Modal */}
  <ConfirmationModal
    isOpen={confirmResetBatchesModal}
    title="Synchronize Chemical Batches"
    alertType="warning"
    confirmText="Purge & Synchronize"
    cancelText="Cancel"
    message="Are you sure you want to synchronize chemical batches directly with live catalog products?"
    onConfirm={handleExecuteResetSimulationBatches}
    onCancel={() => setConfirmResetBatchesModal(false)}
  />

  {/* Delete Chemical Batch Confirmation Modal */}
  <ConfirmationModal
    isOpen={!!confirmDeleteBatchId}
    title="Delete Chemical Batch"
    alertType="danger"
    confirmText="Delete Batch"
    cancelText="Cancel"
    message={`Are you sure you want to delete Chemical Batch #${batches.find(b => b.id === confirmDeleteBatchId)?.batchNumber || ''}? This action cannot be undone.`}
    onConfirm={handleExecuteRemoveBatch}
    onCancel={() => setConfirmDeleteBatchId(null)}
  />

  {/* Master Data Dynamic Entity Config Modal */}
  <DynamicEntityConfigModal
    isOpen={showDynamicConfigModal}
    onClose={() => setShowDynamicConfigModal(false)}
    initialTab={dynamicConfigTab}
  />

  {/* Non-dismissable High-Priority CSV Import Progress Modal Overlay */}
  <ImportProgressOverlay
    isImportingProgress={isImportingProgress}
    importProgressStatus={importProgressStatus}
    importProgressSubtext={importProgressSubtext}
    importProgressPercent={importProgressPercent}
    importTotalRecords={importTotalRecords}
  />
  </div>
 );
};
