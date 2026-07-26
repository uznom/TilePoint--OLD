/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDb } from '../context/DbContext';
import { saveFileToBackup } from '../lib/fileBackupHelper';
import { runPreflightValidation, PreflightReport } from '../lib/preflightValidator';
import { PreflightReportCard } from './PreflightReportCard';
import { isProductInBranch, getBranchStockQuantity, getBranchStockRecord, slugifyBranchStr } from '../lib/branchUtils';
import { Product, UserRole, TransferType, TransferStatus } from '../types/db';
import { HoldToConfirmButton } from './HoldToConfirmButton';
import { useResponsivePageSize, useTableAutoPageSize, TablePagination } from './TablePagination';
import {
 Plus,
 Edit2,
 Trash2,
 Download,
 Upload,
 Search,
 Layers,
 X,
 AlertTriangle,
 ShieldCheck,
 Eye,
 Building2,
 Activity,
 FileText,
 Sliders,
 QrCode,
 Barcode,
 Image as ImageIcon,
 Camera,
 AlertCircle,
 Package,
 DollarSign,
 Check,
 Printer,
 ChevronRight,
 ChevronLeft,
 ChevronDown,
 ChevronUp,
 Clock,
 Flame,
 ArrowRightLeft,
 Truck,
 Database,
 Copy,
 MapPin,
 ShieldAlert
} from 'lucide-react';

interface InventoryModuleProps {
 darkMode: boolean;
 initialSubTab?: 'catalog' | 'movements' | 'transfers' | 'ledger' | 'import' | 'branch-prices' | 'expiry';
 hideTabHeader?: boolean;
 isCompactGlobal?: boolean;
 onSubTabChange?: (sub: 'catalog' | 'movements' | 'transfers' | 'ledger' | 'import' | 'branch-prices' | 'expiry') => void;
}

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
 status: "Good" | "Expiring Soon" | "Expired";
 remarks?: string;
}

// Visual Barcode Component utilizing custom styled SVG lines for absolute accuracy
const StyledBarcode: React.FC<{ code: string }> = ({ code }) => {
 const totalBars = 32;
 const bars = [];
 let seed = 0;
 for (let i = 0; i < code.length; i++) seed += code.charCodeAt(i);
 
 for (let i = 0; i < totalBars; i++) {
 const isDark = (seed + i * 7) % 3 !== 0;
 const widthClass = (seed + i * 13) % 4 === 0 ? 'w-1.5' : 'w-0.5';
 bars.push(
 <div 
 key={i} 
 className={`${isDark ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-transparent'} ${widthClass} h-12 shrink-0`} 
 />
 );
 }
 return (
 <div className="flex flex-col items-center gap-1.5 p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50">
 <div className="flex items-center justify-center overflow-hidden w-full max-w-[200px] h-12">
 {bars}
 </div>
 <span className="font-mono text-[10px] tracking-widest text-zinc-500 dark:text-zinc-400 font-extrabold uppercase select-all">{code}</span>
 </div>
 );
};

// Visual Block QR Code Component using an algorithmic pixel check pattern
const StyledQrCode: React.FC<{ code: string }> = ({ code }) => {
 const size = 11;
 const grid = [];
 let seed = 0;
 for (let i = 0; i < code.length; i++) seed += code.charCodeAt(i);

 for (let r = 0; r < size; r++) {
 const cols = [];
 for (let c = 0; c < size; c++) {
 // Corners finders (distinct square layout of QR code standards)
 const isFinder = 
 (r < 3 && c < 3) || 
 (r < 3 && c >= size - 3) || 
 (r >= size - 3 && c < 3);
 
 const isCornerFill = 
 isFinder && 
 (r === 0 || r === 2 || c === 0 || c === 2 || (r === size - 1 || r === size - 3 || c === size - 1 || c === size - 3));

 let active = false;
 if (isFinder) {
 active = isCornerFill;
 } else {
 active = (seed + r * 17 + c * 31) % 3 === 0;
 }

 cols.push(
 <div 
 key={c} 
 className={`w-3 h-3 ${active ? 'bg-zinc-950' : 'bg-transparent'}`} 
 />
 );
 }
 grid.push(
 <div key={r} className="flex shrink-0">
 {cols}
 </div>
 );
 }

 return (
 <div className="flex flex-col items-center gap-1.5 p-3.5 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50">
 <div className="p-1 bg-white inline-block border border-zinc-200/20 shadow-sm rounded-md overflow-hidden shrink-0">
 {grid}
 </div>
 <span className="font-mono text-[9px] tracking-wider text-zinc-400 font-bold uppercase truncate max-w-[150px]">{code}</span>
 </div>
 );
};

export const InventoryModule: React.FC<InventoryModuleProps> = ({ darkMode, initialSubTab, hideTabHeader, isCompactGlobal, onSubTabChange }) => {
 const {
 products,
 suppliers,
 branches,
 sales,
 saleItems,
 createProduct,
 updateProduct,
 deleteProduct,
 importProducts,
 createBranch,
 currentUser,
 addAuditLog,
 movements,
 stockTransfers,
 branchStock,
 ledgerEntries,
 createStockTransfer,
 updateStockTransferStatus,
 createSupplier,
 triggerSystemProcessing,
 createManualLedgerEntry,
 updateBranchPriceOverride,
 updateBranchLowStockThreshold,
 isRowClearingBlocked,
 getRowClearingBlockedReason,
 createDamageLog,
 shifts,
 activeShift,
 acquirePessimisticLock,
 releasePessimisticLock,
 isResourceLocked,
 pessimisticLocks,
 restoreDbSnapshot
 } = useDb();

  const hasActiveShift = !!activeShift || (shifts && shifts.some(s => s.status === "Open" || s.status === "OPEN"));

 // Primary navigation sub-tabs: "catalog" | "movements" | "transfers" | "ledger" | "import" | "branch-prices" | "expiry"
 const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'movements' | 'transfers' | 'ledger' | 'import' | 'branch-prices' | 'expiry'>(initialSubTab || 'catalog');

 // Synchronized Sourcing / Procurement Requisitions Queue Cart State
 const [poCart, setPoCart] = useState<{ productId: string; quantity: number; notes?: string; requestedByBranchId?: string }[]>(() => {
 try {
 const cached = localStorage.getItem('tp_po_cart');
 return cached ? JSON.parse(cached) : [];
 } catch (e) {
 return [];
 }
 });

 const syncPoCart = (newCart: any[]) => {
 setPoCart(newCart);
 localStorage.setItem('tp_po_cart', JSON.stringify(newCart));
 // Dispatch system-wide event so the Procurement module balances its cart state in real-time
 window.dispatchEvent(new Event('tp_po_cart_updated'));
 };

 const handleQueueRestock = (productId: string) => {
 const exists = poCart.some(item => item.productId === productId);
 if (exists) {
 const updated = poCart.map(item => {
 if (item.productId === productId) {
 return { ...item, quantity: item.quantity + 50 };
 }
 return item;
 });
 syncPoCart(updated);
 showToast('Restock desk updated: Increased queue quantity for this tile code!');
 } else {
 const updated = [...poCart, { productId, quantity: 50 }];
 syncPoCart(updated);
 showToast('Sourcing Deck linked: Added item to your Procurement Restock Queue!');
 }
 };

 // Table layout optimization states
 const isCompactColumns = isCompactGlobal !== undefined ? isCompactGlobal : true;
 const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});
 const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
 heatmap: false,
 ledger: false,
 aging: false,
 });

 const toggleProductExpand = (id: string) => {
 setExpandedProductIds(prev => ({ ...prev, [id]: !prev[id] }));
 };

 const toggleSection = (sectionId: string) => {
 setCollapsedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
 };

 const changeActiveSubTab = (tab: 'catalog' | 'movements' | 'transfers' | 'ledger' | 'import' | 'branch-prices' | 'expiry') => {
 setActiveSubTab(tab);
 if (onSubTabChange) {
 onSubTabChange(tab as any);
 }
 };

 useEffect(() => {
 if (initialSubTab) {
 setActiveSubTab(initialSubTab);
 }
 }, [initialSubTab]);

 // Real-time synchronization event listener from other modules
 useEffect(() => {
 const handleCartSync = () => {
 try {
 const cached = localStorage.getItem('tp_po_cart');
 setPoCart(cached ? JSON.parse(cached) : []);
 } catch (e) {
 // Safe fallback
 }
 };
 window.addEventListener('tp_po_cart_updated', handleCartSync);
 return () => {
 window.removeEventListener('tp_po_cart_updated', handleCartSync);
 };
 }, []);

 const isAdminUser = (currentUser?.role as any) === 'Admin' || (currentUser?.role as any) === UserRole.ADMIN;

 const [selectedViewBranchId, setSelectedViewBranchId] = useState<string>(
   isAdminUser ? 'consolidated' : (currentUser?.branchAssignmentId || 'B1')
 );

 useEffect(() => {
   const isNowAdmin = (currentUser?.role as any) === 'Admin' || (currentUser?.role as any) === UserRole.ADMIN;
   if (isNowAdmin) {
     setSelectedViewBranchId('consolidated');
   } else {
     const bId = currentUser?.branchAssignmentId || 'B1';
     setSelectedViewBranchId(bId);
     setBatchFormBranchId(bId);
     setSelectedPoolBranchId(bId);
     setTransferSource(bId);
     setManualLedgerBranchId(bId);
   }
 }, [currentUser?.id, currentUser?.role, currentUser?.branchAssignmentId]);

 const activeBranchId = isAdminUser 
   ? selectedViewBranchId 
   : (currentUser?.branchAssignmentId || 'B1');

 // Strict branch isolation filter: products list filtered by active branchAssignmentId / scope
 const branchProducts = React.useMemo(() => {
   return products.filter(p => !p.isDeleted && isProductInBranch(p, activeBranchId, branchStock, branches));
 }, [products, activeBranchId, branchStock, branches]);
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
              setSelectedViewBranchId("consolidated");
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

      // Update names, codes, quantities, and live status for all existing batches from products catalog
      return updatedList.map(b => {
        const liveProd = products.find(p => p.id === b.productId);
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

  const handleResetSimulationBatches = () => {
    if (window.confirm("Purge legacy simulation data and synchronize chemical batches directly with live catalog products?")) {
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
    }
  };

  const handleRemoveBatch = (id: string) => {
    const target = batches.find(b => b.id === id);
    if (!target) return;
    if (window.confirm(`Are you sure you want to delete Chemical Batch #${target.batchNumber} (${target.productName})? This action cannot be undone.`)) {
      setBatches(prev => prev.filter(b => b.id !== id));
      showToast("Batch record removed from ERP shelf-life database.");
    }
  };

 // Search & Filters
 const [term, setTerm] = useState('');
 const [categoryFilter, setCategoryFilter] = useState('All');
 const [statusFilter, setStatusFilter] = useState('All');
 
 const [showPortabilityHubModal, setShowPortabilityHubModal] = useState<boolean>(false);

 const canSeeFinancialCostsAndSources = currentUser.role === 'Admin';

 // Branch Specific pricing filter states
 const [branchPriceSearch, setBranchPriceSearch] = useState('');
 const [selectedPoolBranchId, setSelectedPoolBranchId] = useState<string>(currentUser?.branchAssignmentId || (branches[0]?.id || ''));
 const [priceOverridesInput, setPriceOverridesInput] = useState<Record<string, string>>({});

 // Pagination State for lists inside Inventory
 const [prodPage, setProdPage] = useState(1);
 const [ledgerPage, setLedgerPage] = useState(1);

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

 // Reset prodPage when filters or page size changes
 useEffect(() => {
 setProdPage(1);
 }, [term, categoryFilter, statusFilter, prodsPerPage]);

 // Reset ledgerPage when sub-tab or page size changes
 useEffect(() => {
 setLedgerPage(1);
 }, [activeSubTab, ledgerPerPage]);

 // Stock Transfer Creation Form States
 const [showCreateTransfer, setShowCreateTransfer] = useState(false);
 const [transferSource, setTransferSource] = useState(currentUser.branchAssignmentId || 'B1');
 const [transferDest, setTransferDest] = useState('');
 const [transferTypeSelect, setTransferTypeSelect] = useState<TransferType>('Replenishment');
 const [transferItems, setTransferItems] = useState<{ productId: string; quantity: number }[]>([]);
 const [transferReasonInput, setTransferReasonInput] = useState('');
 const [tempProductId, setTempProductId] = useState('');
 const [tempQty, setTempQty] = useState(15);
 const [transferFilterStatus, setTransferFilterStatus] = useState<string>('All');

 // Ensure non-Admin users are strictly locked to their branchAssignmentId for viewing stocks and performing actions
 useEffect(() => {
   if (currentUser) {
     const assignedBranch = currentUser.branchAssignmentId || 'B1';
     if (currentUser.role !== 'Admin') {
       if (selectedViewBranchId !== assignedBranch) {
         setSelectedViewBranchId(assignedBranch);
       }
       if (selectedPoolBranchId !== assignedBranch) {
         setSelectedPoolBranchId(assignedBranch);
       }
       if (transferSource !== assignedBranch) {
         setTransferSource(assignedBranch);
       }
     }
   }
 }, [currentUser, selectedViewBranchId, selectedPoolBranchId, transferSource]);

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
 const [brand, setBrand] = useState('');
 const [supplierId, setSupplierId] = useState('');
 const [unit, setUnit] = useState('Box');
 const [size, setSize] = useState('60x60 cm');
 const [boxQuantity, setBoxQuantity] = useState<number>(4);
 const [coveragePerBox, setCoveragePerBox] = useState<number>(1.44);
 const [productImage, setProductImage] = useState<string>('');
 const [costPrice, setCostPrice] = useState<number>(300);
 const [sellingPrice, setSellingPrice] = useState<number>(450);
 const [markupPercent, setMarkupPercent] = useState<number>(50);
 const [taxType, setTaxType] = useState<string>('12% VAT');
 const [stockQuantity, setStockQuantity] = useState<number>(100);
 const [minimumStock, setMinimumStock] = useState<number>(25);
 const [origin, setOrigin] = useState('');

 const handleCostPriceChange = (val: number) => {
 setCostPrice(val);
 if (val > 0) {
 const calculatedSelling = Math.round(val * (1 + markupPercent / 100) * 100) / 100;
 setSellingPrice(calculatedSelling);
 }
 };

 const handleMarkupChange = (val: number) => {
 setMarkupPercent(val);
 if (costPrice > 0) {
 const calculatedSelling = Math.round(costPrice * (1 + val / 100) * 100) / 100;
 setSellingPrice(calculatedSelling);
 }
 };

 const handleSellingPriceChange = (val: number) => {
 setSellingPrice(val);
 if (costPrice > 0) {
 const calculatedMarkup = Math.round(((val - costPrice) / costPrice) * 100 * 10) / 10;
 setMarkupPercent(calculatedMarkup);
 }
 };

 // Manual Stock Adjustment state
 const [showAdjustModal, setShowAdjustModal] = useState(false);
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
   return 'ETC_DIPOLOG MAIN';
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
 const [showBranchRecommendationBanner, setShowBranchRecommendationBanner] = useState<boolean>(true);
 const [showImportModal, setShowImportModal] = useState(false);
 const [rawImportText, setRawImportText] = useState('');
 const [preflightReport, setPreflightReport] = useState<PreflightReport | null>(null);
 const [isAnalyzingPreflight, setIsAnalyzingPreflight] = useState(false);

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
 };
 const [isDragging, setIsDragging] = useState(false);
 const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
 const [pendingBranches, setPendingBranches] = useState<any[]>([]);
 const [showBranchConfigs, setShowBranchConfigs] = useState(false);
 const [migrationSubTab, setMigrationSubTab] = useState<'import' | 'export'>('import');
 const [exportDataType, setExportDataType] = useState<'products' | 'suppliers' | 'branches'>('products');
 const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
 const fileInputRef = useRef<HTMLInputElement>(null);

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

 // Helpers for Branch stock mapping and transfers
 const getBranchName = (id: string | null) => {
 if (!id || id === "B1" || id === "main") {
 const stored = localStorage.getItem("tilepoint_company_name_v1");
 if (stored) return stored;
 }
 const b = branches.find((br) => br.id === id);
 if (!b) {
 const stored = localStorage.getItem("tilepoint_company_name_v1");
 if (stored) return stored;
 return "ETC_DIPOLOG MAIN";
 }
 return b.name;
 };

 // Dynamic Recommendation Engine for Stocks & Redistribution
 const recommendedTransfers = React.useMemo(() => {
 const recommendations: {
 id: string;
 productId: string;
 productName: string;
 fromBranchId: string;
 toBranchId: string;
 suggestedQty: number;
 reason: string;
 type: 'Deficit' | 'Overstock';
 }[] = [];

 const activeProds = branchProducts;
 const activeBranches = branches.filter(b => !b.isDeleted);
 
 // Dynamically identify the main distribution branch (either B1 or a branch marked as isDistributionBranch)
 const mainBranch = activeBranches.find(b => b.isDistributionBranch || b.id === 'B1') || activeBranches[0];
 if (!mainBranch) return [];

 const retailBranches = activeBranches.filter(b => b.id !== mainBranch.id);

 activeProds.forEach(p => {
 // Find main stock dynamically
 const mainStock = branchStock.find(bs => bs.productId === p.id && bs.branchId === mainBranch.id)?.quantity || 0;
 
 // Check other active branches
 retailBranches.forEach(b => {
 const bStock = branchStock.find(bs => bs.productId === p.id && bs.branchId === b.id)?.quantity || 0;
 
 // Recommendation 1: Deficit (Low stock) and Main branch has plenty of stock (e.g. > 100)
 if (bStock < 25 && mainStock > 100) {
 recommendations.push({
 id: `REC-DEF-${p.id}-${b.id}`,
 productId: p.id,
 productName: p.productName,
 fromBranchId: mainBranch.id,
 toBranchId: b.id,
 suggestedQty: 50,
 reason: `REPLENISHMENT ALERT: ${b.name} is low on stock (${bStock} boxes remaining). ${mainBranch.name} has a robust buffer of ${mainStock} boxes. Transfer 50 boxes to balance availability.`,
 type: 'Deficit'
 });
 }
 
 // Recommendation 2: Slow moving items at retail branch that can be pulled back to Main branch
 const bSaleItems = saleItems.filter(si => si.productId === p.id && !si.isDeleted);
 const bSaleIds = new Set(bSaleItems.map(si => si.saleId));
 const bSales = sales.filter(s => bSaleIds.has(s.id) && s.branchId === b.id && !s.isDeleted);

 let lastSaleDate = new Date(p.createdAt || '2026-01-01');
 if (bSales.length > 0) {
 const saleTimes = bSales.map(s => new Date(s.createdAt).getTime());
 const latestTime = Math.max(...saleTimes);
 if (!isNaN(latestTime)) {
 lastSaleDate = new Date(latestTime);
 }
 }

 const now = new Date();
 const diffTime = now.getTime() - lastSaleDate.getTime();
 const age = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

 if (age > 120 && bStock > 40) {
 recommendations.push({
 id: `REC-SLOW-${p.id}-${b.id}`,
 productId: p.id,
 productName: p.productName,
 fromBranchId: b.id,
 toBranchId: mainBranch.id,
 suggestedQty: Math.max(20, Math.round(bStock * 0.5)),
 reason: `SLOW-MOVING PULL OUT: ${p.productName} has been idle for ${age} days at ${b.name} (${bStock} boxes holding down capital). Recommend pulling out ${Math.round(bStock * 0.5)} boxes back to ${mainBranch.name} HQ Hub for immediate retail clearance and liquidating capital.`,
 type: 'Overstock'
 });
 }
 });
 });

 return recommendations;
 }, [products, branchStock, branches, sales, saleItems]);

 const handleExecuteRecommendation = (rec: {
 id: string;
 productId: string;
 productName: string;
 fromBranchId: string;
 toBranchId: string;
 suggestedQty: number;
 reason: string;
 type: 'Deficit' | 'Overstock';
 }) => {
 createStockTransfer(
 rec.fromBranchId,
 rec.toBranchId,
 rec.type === 'Deficit' ? 'Replenishment' : 'Pull Out',
 [{ productId: rec.productId, quantity: rec.suggestedQty }],
 rec.reason
 );
 showToast(`Smart Redistribution Route Initiated: Approved transmittal pending dispatch.`);
 };

 // Categories list
 const categories = [
 'Ceramic Tiles',
 'Porcelain Tiles',
 'Vitrified Tiles',
 'Floor Tiles',
 'Wall Tiles',
 'Mosaic Tiles',
 'Decorative Tiles',
 'Bathroom Tiles',
 'Kitchen Tiles',
 'Cement',
 'Sand & Gravel',
 'Steel Bars',
 'Pipes',
 'Fittings',
 'Faucets',
 'Valves',
 'Wires',
 'Switches',
 'Outlets',
 'Breakers',
 'Paints',
 'Primers',
 'Sealants',
 'Hand Tools',
 'Power Tools',
 'Fasteners',
 'Tile Adhesives',
 'Grouts',
 'Doors & Windows'
 ];

 const allowedToModify = currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.ADMIN;
 const allowedToImport = currentUser.role === UserRole.ADMIN;

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

 // Catalog Filtration
 const filteredProducts = React.useMemo(() => {
 return branchProducts.filter(p => {
 const matchSearch =
 p.productName.toLowerCase().includes(term.toLowerCase()) ||
 p.productCode.toLowerCase().includes(term.toLowerCase()) ||
 p.barcode.toLowerCase().includes(term.toLowerCase()) ||
 p.sku.toLowerCase().includes(term.toLowerCase()) ||
 p.brand.toLowerCase().includes(term.toLowerCase()) ||
 (p.designName && p.designName.toLowerCase().includes(term.toLowerCase()));

 const matchCategory = categoryFilter === 'All' || p.category === categoryFilter;

 // Stock Status evaluations based on selected branch/consolidated view mode
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

 const matchStatus =
 statusFilter === 'All' ||
 (statusFilter === 'In Stock' && currentStatus === 'In Stock') ||
 (statusFilter === 'Low Stock' && currentStatus === 'Low Stock') ||
 (statusFilter === 'Critical' && currentStatus === 'Critical') ||
 (statusFilter === 'Out of Stock' && currentStatus === 'Out of Stock');

 return matchSearch && matchCategory && matchStatus;
 });
 }, [branchProducts, branchStock, term, categoryFilter, statusFilter, selectedViewBranchId]);

 const totalProdPages = Math.ceil(filteredProducts.length / prodsPerPage) || 1;
 const paginatedProducts = React.useMemo(() => {
 return filteredProducts.slice((prodPage - 1) * prodsPerPage, prodPage * prodsPerPage);
 }, [filteredProducts, prodPage, prodsPerPage]);

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

 const filteredLedgerEntries = React.useMemo(() => {
   return ledgerEntries.filter(le => {
     if (activeBranchId !== 'consolidated') {
       const targetBranch = branches.find(b => b.id === activeBranchId);
       const leBranchSlug = slugifyBranchStr(le.branchId);
       const matchBranch = 
         le.branchId === activeBranchId || 
         (targetBranch && (
           leBranchSlug === slugifyBranchStr(targetBranch.id) ||
           leBranchSlug === slugifyBranchStr(targetBranch.name) ||
           leBranchSlug === slugifyBranchStr(targetBranch.branchCode)
         ));
       if (!matchBranch) return false;
     }
     const prod = products.find(p => p.id === le.productId || p.productName === le.productName);
     if (prod && !isProductInBranch(prod, activeBranchId, branchStock, branches)) return false;
     return true;
   });
 }, [ledgerEntries, activeBranchId, branches, products, branchStock]);

 const totalLedgerPages = Math.ceil(filteredLedgerEntries.length / ledgerPerPage) || 1;
 const paginatedLedger = React.useMemo(() => {
   return filteredLedgerEntries.slice((ledgerPage - 1) * ledgerPerPage, ledgerPage * ledgerPerPage);
 }, [filteredLedgerEntries, ledgerPage, ledgerPerPage]);

 // Calculate Key Inventory Performance Indicators (Dashboard Statistics)
 const stats = React.useMemo(() => {
 const nonDeleted = branchProducts;
 let totalValue = 0;
 let lowStock = 0;
 let criticalStock = 0;
 let outOfStock = 0;

 nonDeleted.forEach(p => {
 const qty = getBranchStockQuantity(p, selectedViewBranchId, branchStock, branches);

 const bsRec = getBranchStockRecord(p, selectedViewBranchId, branchStock, branches);
 const threshold = selectedViewBranchId === 'consolidated'
 ? p.minimumStock
 : (bsRec?.lowStockThresholdOverride ?? p.minimumStock);

 totalValue += qty * p.costPrice;
 if (qty === 0) {
 outOfStock++;
 } else if (qty <= threshold * 0.5) {
 criticalStock++;
 } else if (qty <= threshold) {
 lowStock++;
 }
 });

 return {
 totalSKUs: nonDeleted.length,
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

 const matchBranch = activeBranchId === 'consolidated' || (m as any).branchId === activeBranchId || m.sourceBranchId === activeBranchId || m.destinationBranchId === activeBranchId;

 return matchSearch && matchType && matchBranch;
 });

 // Dynamic Chemical Stock Batches Filtering
 const filteredBatches = React.useMemo(() => {
 return batches.filter(b => {
 const matchBranch = activeBranchId === 'consolidated' || b.branchId === activeBranchId;
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

 // Handle image conversion and store in state
 const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) {
 const reader = new FileReader();
 reader.onloadend = () => {
 setProductImage(reader.result as string);
 };
 reader.readAsDataURL(file);
 }
 };

 const handleDragOver = (e: React.DragEvent) => {
 e.preventDefault();
 };

 const handleDrop = (e: React.DragEvent) => {
 e.preventDefault();
 const file = e.dataTransfer.files?.[0];
 if (file) {
 const reader = new FileReader();
 reader.onloadend = () => {
 setProductImage(reader.result as string);
 };
 reader.readAsDataURL(file);
 }
 };

 const handleOpenAdd = () => {
 setProductCode(`TL-PR-${Date.now().toString().slice(-4)}`);
 setSku(`SKU-TPL-${Math.floor(Math.random()*10000)}`);
 setBarcode(`480${Math.floor(1000000000 + Math.random()*9000000000)}`);
 setDesignName('');
 setProductName('');
 setCategory('Ceramic Tiles');
 setBrand('');
 setSupplierId(suppliers[0]?.id || 'S1');
 setUnit('Box');
 setSize('60x60 cm');
 setBoxQuantity(4);
 setCoveragePerBox(1.44);
 setProductImage('');
 setCostPrice(300);
 setSellingPrice(450);
 setMarkupPercent(50);
 setTaxType('12% VAT');
 setStockQuantity(50);
 setMinimumStock(20);
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
 setBarcode(p.barcode);
 setDesignName(p.designName || '');
 setProductName(p.productName);
 setCategory(p.category);
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

 const payload = {
 productCode,
 sku,
 barcode,
 designName,
 productName,
 category,
 brand: isRegisteringNewSupplier ? newSupplierName.trim() : brand,
 supplierId: finalSupplierId,
 unit,
 size,
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
 .qr-section {
 width: 38px;
 height: 38px;
 border: 1px solid #777;
 display: flex;
 align-items: center;
 justify-content: center;
 flex-shrink: 0;
 padding: 1px;
 }
 .qr-box {
 display: grid;
 grid-template-columns: repeat(15, 1fr);
 width: 34px;
 height: 34px;
 }
 .qr-pixel {
 width: 100%;
 height: 100%;
 }
 .qr-pixel.black {
 background: #000000;
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
 <div class="meta-item">DIMENSION: <strong>${codesProduct.size || '60x60 cm'}</strong></div>
 <div class="meta-item">CODE: <strong>${codesProduct.productCode}</strong></div>
 <div class="meta-item">BOX QTY: <strong>${codesProduct.boxQuantity || 4} pcs</strong></div>
 </div>
 </div>

 <div class="codes-area">
 <div class="barcode-section">
 <div class="barcode-lines">
 ${Array.from({ length: 42 }).map((_, i) => {
 const isThick = (i % 3 === 0 || i % 7 === 0);
 const isVisible = (i % 5 !== 0 && i % 13 !== 0);
 return isVisible ? `<div class="line" style="width: ${isThick ? '2px' : '1px'}"></div>` : `<div style="width: 1px"></div>`;
 }).join('')}
 </div>
 <div class="barcode-text">${codesProduct.barcode}</div>
 </div>
 
 <div class="qr-section">
 <div class="qr-box">
 ${Array.from({ length: 225 }).map((_, i) => {
 const x = i % 15;
 const y = Math.floor(i / 15);
 const isCorner = (x < 4 && y < 4) || (x > 10 && y < 4) || (x < 4 && y > 10);
 const isBorderMatch = isCorner && (x === 0 || x === 3 || y === 0 || y === 3 || x === 11 || x === 14 || y === 11 || y === 14);
 const isRandom = (Math.sin(i * 1.5) > 0.1);
 const isBlack = isBorderMatch || (isCorner && x !== 1 && x !== 2 && y !== 1 && y !== 2 && x !== 12 && x !== 13 && y !== 12 && y !== 13) || (!isCorner && isRandom);
 return `<div class="qr-pixel ${isBlack ? 'black' : ''}"></div>`;
 }).join('')}
 </div>
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
 .qr-section {
 width: 38px;
 height: 38px;
 border: 1px solid #777;
 display: flex;
 align-items: center;
 justify-content: center;
 flex-shrink: 0;
 padding: 1px;
 }
 .qr-box {
 display: grid;
 grid-template-columns: repeat(15, 1fr);
 width: 34px;
 height: 34px;
 }
 .qr-pixel {
 width: 100%;
 height: 100%;
 }
 .qr-pixel.black {
 background: #000000;
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
 <div class="meta-item">DIMENSION: <strong>${pItem.size || '60x60 cm'}</strong></div>
 <div class="meta-item">CODE: <strong>${pItem.productCode}</strong></div>
 <div class="meta-item">BOX QTY: <strong>${pItem.boxQuantity || 4} pcs</strong></div>
 </div>
 </div>

 <div class="codes-area">
 <div class="barcode-section">
 <div class="barcode-lines">
 ${Array.from({ length: 42 }).map((_, i) => {
 const isThick = (i % 3 === 0 || i % 7 === 0);
 const isVisible = (i % 5 !== 0 && i % 13 !== 0);
 return isVisible ? `<div class="line" style="width: ${isThick ? '2px' : '1px'}"></div>` : `<div style="width: 1px"></div>`;
 }).join('')}
 </div>
 <div class="barcode-text">${pItem.barcode}</div>
 </div>
 
 <div class="qr-section">
 <div class="qr-box">
 ${Array.from({ length: 225 }).map((_, i) => {
 const x = i % 15;
 const y = Math.floor(i / 15);
 const isCorner = (x < 4 && y < 4) || (x > 10 && y < 4) || (x < 4 && y > 10);
 const isBorderMatch = isCorner && (x === 0 || x === 3 || y === 0 || y === 3 || x === 11 || x === 14 || y === 11 || y === 14);
 const isRandom = (Math.sin(i * 1.5) > 0.1);
 const isBlack = isBorderMatch || (isCorner && x !== 1 && x !== 2 && y !== 1 && y !== 2 && x !== 12 && x !== 13 && y !== 12 && y !== 13) || (!isCorner && isRandom);
 return `<div class="qr-pixel ${isBlack ? 'black' : ''}"></div>`;
 }).join('')}
 </div>
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
 const handleExportJSON = () => {
 const jsonString = JSON.stringify(branchProducts, null, 2);
 const filename = `TilePoint_Inventory_${new Date().toISOString().slice(0, 10)}.json`;
 saveFileToBackup(jsonString, filename, 'Inventory_Exports').then((res) => {
 addAuditLog('INVENTORY_EXPORT', 'Exported product database as JSON file', 'Products', 'EXPORT');
 showToast(`Exported full non-deleted inventory roster as JSON to: ${res.path || filename}.`);
 });
 };

 const handleOpenImport = () => {
 setRawImportText('');
 setShowImportModal(true);
 };

 const handleImportDragOver = (e: React.DragEvent) => {
 e.preventDefault();
 setIsDragging(true);
 };

 const handleImportDragLeave = () => {
 setIsDragging(false);
 };

 const handleImportDrop = (e: React.DragEvent) => {
 e.preventDefault();
 setIsDragging(false);
 const file = e.dataTransfer.files?.[0];
 if (file) {
 processSelectedFile(file);
 }
 };

 const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) {
 processSelectedFile(file);
 }
 };

 const processSelectedFile = (file: File) => {
 const reader = new FileReader();
 reader.onload = async (event) => {
 const text = event.target?.result as string;
 if (text) {
 setRawImportText(text);
 showToast(`Loaded file: ${file.name}. Running pre-flight schema inspection...`);
 setIsAnalyzingPreflight(true);
 try {
 const report = await runPreflightValidation(
 text,
 importTargetBranchId,
 branches,
 products,
 currentUser?.role
 );
 setPreflightReport(report);
 } catch (err: any) {
 showToast(`Pre-flight analysis error: ${err.message}`);
 } finally {
 setIsAnalyzingPreflight(false);
 }
 }
 };
 reader.readAsText(file);
 };

 const handleExportData = (type: 'products' | 'suppliers' | 'branches', format: 'json' | 'csv') => {
 let dataToExport: any[] = [];
 let filename = '';

 if (type === 'products') {
 dataToExport = branchProducts;
 filename = `enterprise-products-catalog-${Date.now()}`;
 } else if (type === 'suppliers') {
 dataToExport = suppliers.filter(s => !s.isDeleted);
 filename = `enterprise-suppliers-register-${Date.now()}`;
 } else if (type === 'branches') {
 dataToExport = branches.filter(b => !b.isDeleted);
 filename = `enterprise-branches-register-${Date.now()}`;
 }

 if (format === 'json') {
 const jsonString = JSON.stringify(dataToExport, null, 2);
 downloadFile(jsonString, `${filename}.json`, 'application/json');
 showToast(`Exported ${dataToExport.length} ${type} records successfully in JSON format!`);
 } else {
 if (dataToExport.length === 0) {
 showToast(`No records to export for ${type}.`);
 return;
 }
 const csvContent = convertToCSV(dataToExport, type);
 downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
 showToast(`Exported ${dataToExport.length} ${type} records successfully in CSV format!`);
 }
 };

 const convertToCSV = (data: any[], type: 'products' | 'suppliers' | 'branches'): string => {
 let headers: string[] = [];
 if (type === 'products') {
 headers = ['productName', 'productCode', 'sku', 'barcode', 'category', 'brand', 'costPrice', 'sellingPrice', 'stockQuantity', 'size', 'unit', 'origin'];
 } else if (type === 'suppliers') {
 headers = ['id', 'name', 'contactPerson', 'email', 'phone', 'address'];
 } else if (type === 'branches') {
 headers = ['id', 'name', 'manager', 'address', 'phone', 'monthlySales', 'staffCount'];
 }

 const csvRows = [];
 csvRows.push(headers.join(','));

 for (const row of data) {
 const values = headers.map(header => {
 const val = row[header];
 const stringVal = val === undefined || val === null ? '' : String(val);
 const escaped = stringVal.replace(/"/g, '""');
 return `"${escaped}"`;
 });
 csvRows.push(values.join(','));
 }

 return csvRows.join('\n');
 };

 const downloadFile = (content: string, filename: string, contentType: string) => {
 saveFileToBackup(content, filename, 'Inventory_Exports', contentType);
 };

 const handleCopyExportText = (type: 'products' | 'suppliers' | 'branches', format: 'json' | 'csv') => {
 let dataToExport: any[] = [];
 if (type === 'products') {
 dataToExport = branchProducts;
 } else if (type === 'suppliers') {
 dataToExport = suppliers.filter(s => !s.isDeleted);
 } else if (type === 'branches') {
 dataToExport = branches.filter(b => !b.isDeleted);
 }

 let text = '';
 if (format === 'json') {
 text = JSON.stringify(dataToExport, null, 2);
 } else {
 text = convertToCSV(dataToExport, type);
 }

 navigator.clipboard.writeText(text)
 .then(() => {
 showToast(`Copied ${dataToExport.length} ${type} records in ${format.toUpperCase()} format to your clipboard!`);
 })
 .catch(() => {
 showToast('Failed to copy to clipboard. Please try again.');
 });
 };

 const executeBulkImport = async () => {
 if (!allowedToImport) {
 showToast('RBAC Protection: Only System Administrators (Admins) are authorized to import files.');
 return;
 }
 const trimmedInput = rawImportText.trim();
 if (!trimmedInput) {
 showToast('Error: Please input valid JSON or CSV product data.');
 return;
 }

 // Pre-flight schema & branch compatibility validation step
 let currentReport = preflightReport;
 if (!currentReport) {
 setIsAnalyzingPreflight(true);
 try {
 currentReport = await runPreflightValidation(
 trimmedInput,
 importTargetBranchId,
 branches,
 products,
 currentUser?.role
 );
 setPreflightReport(currentReport);
 } catch (e: any) {
 showToast(`Pre-flight Schema Error: ${e.message}`);
 setIsAnalyzingPreflight(false);
 return;
 } finally {
 setIsAnalyzingPreflight(false);
 }
 }

 if (currentReport.status === 'FAIL') {
 showToast('Commit Rejected: Pre-flight schema or cryptographic signature validation failed.');
 return;
 }

 // If full database backup snapshot was uploaded, commit directly using atomic restore
 if (currentReport.parsedFullSnapshot) {
 try {
 const newSnap = {
 id: `SNAP-IMPORT-${Date.now()}`,
 name: `Imported Snapshot Data Payload`,
 timestamp: new Date().toISOString(),
 creator: currentUser.fullName,
 sizeBytes: new Blob([trimmedInput]).size,
 data: JSON.stringify(currentReport.parsedFullSnapshot),
 };
 await fetch('/api/db/backups', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ snapshot: newSnap })
 });
 await restoreDbSnapshot(newSnap.id);
 showToast('Successfully committed full snapshot import! Reloading UI...');
 setTimeout(() => window.location.reload(), 1200);
 return;
 } catch (snapErr: any) {
 showToast(`Snapshot Commit Failure: ${snapErr.message}`);
 return;
 }
 }

 // Helper to parse CSV raw text into rows
 const parseCSV = (text: string): Array<Record<string, any>> => {
 const lines: string[] = [];
 let currentLine = '';
 let insideQuotes = false;
 
 for (let i = 0; i < text.length; i++) {
 const char = text[i];
 if (char === '"' || char === "'") {
 insideQuotes = !insideQuotes;
 }
 if ((char === '\r' || char === '\n') && !insideQuotes) {
 if (currentLine.trim()) {
 lines.push(currentLine);
 }
 currentLine = '';
 if (char === '\r' && text[i + 1] === '\n') {
 i++;
 }
 } else {
 currentLine += char;
 }
 }
 if (currentLine.trim()) {
 lines.push(currentLine);
 }

 if (lines.length < 2) {
 throw new Error('CSV must contain a header row and at least one data row.');
 }

 const headerLine = lines[0];
 let delimiter = ',';
 const commaCount = (headerLine.match(/,/g) || []).length;
 const semiCount = (headerLine.match(/;/g) || []).length;
 const tabCount = (headerLine.match(/\t/g) || []).length;
 
 if (semiCount > commaCount && semiCount > tabCount) {
 delimiter = ';';
 } else if (tabCount > commaCount && tabCount > semiCount) {
 delimiter = '\t';
 }

 const splitLine = (line: string): string[] => {
 const result: string[] = [];
 let cell = '';
 let inQuotes = false;
 for (let j = 0; j < line.length; j++) {
 const c = line[j];
 if (c === '"' || c === "'") {
 inQuotes = !inQuotes;
 } else if (c === delimiter && !inQuotes) {
 result.push(cell.trim());
 cell = '';
 } else {
 cell += c;
 }
 }
 result.push(cell.trim());
 return result;
 };

 const headers = splitLine(headerLine).map(h => h.replace(/^["']|["']$/g, '').trim());
 const rows: Array<Record<string, any>> = [];

 for (let k = 1; k < lines.length; k++) {
 const cells = splitLine(lines[k]);
 if (cells.length > 0 && cells.some(c => c)) {
 const rowObj: Record<string, any> = {};
 headers.forEach((header, index) => {
 const val = (cells[index] || '').replace(/^["']|["']$/g, '').trim();
 rowObj[header] = val;
 });
 rows.push(rowObj);
 }
 }

 return rows;
 };

 let parsed: any[] = [];
 let formatType = 'JSON';

 try {
 if (trimmedInput.startsWith('[') || trimmedInput.startsWith('{')) {
 const jsonParsed = JSON.parse(trimmedInput);
 if (jsonParsed && typeof jsonParsed === 'object' && 'inventoryCounts' in jsonParsed && Array.isArray(jsonParsed.inventoryCounts)) {
 formatType = 'StockTally JSON';
 const origin = jsonParsed.exportMeta?.originBranchId || '';
 parsed = jsonParsed.inventoryCounts.map((item, i) => {
 const flatProduct: any = {
 id: item.id || `P-IMPORT-${Date.now()}-${i}`,
 barcode: item.barcode,
 category: item.category,
 productName: item.productName,
 brand: item.brand,
 size: item.size,
 unit: item.uom || item.unit || 'PCS',
 origin: origin || item.origin,
 };
 if (item.pricing) {
 flatProduct.costPrice = item.pricing.costPrice;
 flatProduct.sellingPrice = item.pricing.sellingPrice;
 flatProduct.taxType = item.pricing.taxType;
 if (item.pricing.markup) {
 const numMarkup = parseInt(item.pricing.markup.replace('%', ''), 10);
 flatProduct.markupPercent = isNaN(numMarkup) ? undefined : numMarkup;
 }
 }
 if (item.stock) {
 flatProduct.minimumStock = item.stock.minimumStock;
 flatProduct.boxQuantity = item.stock.piecesPerBox;
 flatProduct.stockQuantity = item.stock.stockQuantity;
 if (item.stock.expiryDate) {
 flatProduct.expirationDate = item.stock.expiryDate;
 flatProduct.hasExpiration = true;
 }
 }
 if (item.logistics) {
 flatProduct.supplierId = item.logistics.supplierId;
 flatProduct.isDeleted = item.logistics.isDeleted;
 }
 return flatProduct;
 });
 } else {
 parsed = Array.isArray(jsonParsed) ? jsonParsed : [jsonParsed];
 }
 } else {
 formatType = 'CSV';
 const csvRows = parseCSV(trimmedInput);
 
 // Map older header formats from common schemas to clean database object fields
 const headerMapping: Record<string, string> = {
 'product name': 'productName',
 'product_name': 'productName',
 'name': 'productName',
 'tile name': 'productName',
 'tile': 'productName',
 'item name': 'productName',
 'product': 'productName',
 'product code': 'productCode',
 'product_code': 'productCode',
 'code': 'productCode',
 'item code': 'productCode',
 'sku': 'sku',
 'sku code': 'sku',
 'sku_code': 'sku',
 'skucode': 'sku',
 'barcode': 'barcode',
 'bar code': 'barcode',
 'bar_code': 'barcode',
 'category': 'category',
 'cat': 'category',
 'group': 'category',
 'brand': 'brand',
 'brand_name': 'brand',
 'manufacturer': 'brand',
 'cost': 'costPrice',
 'cost price': 'costPrice',
 'cost_price': 'costPrice',
 'p price': 'costPrice',
 'p_price': 'costPrice',
 'purchase price': 'costPrice',
 'selling price': 'sellingPrice',
 'selling_price': 'sellingPrice',
 'selling': 'sellingPrice',
 'price': 'sellingPrice',
 'rate': 'sellingPrice',
 'retail': 'sellingPrice',
 's price': 'sellingPrice',
 's_price': 'sellingPrice',
 'size': 'size',
 'dimensions': 'size',
 'dimension': 'size',
 'stock': 'stockQuantity',
 'quantity': 'stockQuantity',
 'qty': 'stockQuantity',
 'stock quantity': 'stockQuantity',
 'stock_quantity': 'stockQuantity',
 'min stock': 'minimumStock',
 'minimum stock': 'minimumStock',
 'min_stock': 'minimumStock',
 'minimum_stock': 'minimumStock',
 'alert level': 'minimumStock',
 'alert_level': 'minimumStock',
 'design': 'designName',
 'design name': 'designName',
 'design_name': 'designName',
 'supplier': 'supplierId',
 'supplier id': 'supplierId',
 'supplier_id': 'supplierId',
 'unit': 'unit',
 'uom': 'unit',
 'box qty': 'boxQuantity',
 'box quantity': 'boxQuantity',
 'box_quantity': 'boxQuantity',
 'piecesperbox': 'boxQuantity',
 'pieces_per_box': 'boxQuantity',
 'location': 'origin',
 'origin': 'origin',
 'originbranchid': 'origin',
 'origin_branch_id': 'origin',
 'expirydate': 'expirationDate',
 'expiry_date': 'expirationDate',
  'mu%': 'markupPercent',
  'tax type': 'taxType',
  'tax_type': 'taxType'
 };

 parsed = csvRows.map(row => {
 const mappedRow: Record<string, any> = {};
 Object.keys(row).forEach(key => {
 const cleanKey = key.toLowerCase().trim();
 const mappedKey = headerMapping[cleanKey];
 if (mappedKey) {
 const numericFields = ['costPrice', 'sellingPrice', 'stockQuantity', 'minimumStock', 'boxQuantity', 'coveragePerBox', 'markupPercent'];
 if (numericFields.includes(mappedKey)) {
 const cleanVal = String(row[key]).replace(/[$,₱ %]/g, '').replace(/,/g, '');
 const valNum = parseFloat(cleanVal);
 mappedRow[mappedKey] = isNaN(valNum) ? 0 : valNum;
 } else {
 mappedRow[mappedKey] = row[key];
 }
 } else {
 mappedRow[key] = row[key];
 }
 });
 return mappedRow;
 });
 }

 if (parsed.length > 0) {
 // Auto-detect branch locations mapped in imported rows
 const uniqueLocations = Array.from(new Set(
 parsed.map(item => item.origin || item.location).map(v => String(v || '').trim()).filter(Boolean)
 )) as string[];

 const activeBranches = branches.filter(b => !b.isDeleted);
 const existingBranchIdentifiers = new Set([
 ...activeBranches.map(b => b.name.toLowerCase().trim()),
 ...activeBranches.map(b => b.id.toLowerCase().trim()),
 ...activeBranches.map(b => (b.branchCode || '').toLowerCase().trim()).filter(Boolean)
 ]);
 const newLocations = uniqueLocations.filter(loc => !existingBranchIdentifiers.has(loc.toLowerCase().trim()));

 if (newLocations.length > 0) {
 setPendingProducts(parsed);
 setPendingBranches(newLocations.map(loc => ({
 detectedLocation: loc,
 mode: 'existing', // Default to existing branch mapping so they can choose to map it immediately
 selectedExistingBranchId: activeBranches[0]?.id || 'B1',
 id: loc, // prefilled branch ID from CSV
 name: 'Emman Tile Center', // Default name as requested
 manager: 'Operational Branch Manager',
 address: 'Region Branch Site, Dipolog City',
 phone: '+63 920 123 4567',
 isDistributionBranch: false,
 staffCount: 3
 })));
 setShowBranchConfigs(true);
 setShowImportModal(false);
 setShowPortabilityHubModal(false);
 showToast(`Detected ${newLocations.length} brand new branch location(s) in CSV! Please map or configure them to finalize.`);
 } else {
 await triggerSystemProcessing(
 `Executing Legacy ERP OS Data Importer (${formatType})...`,
 1600,
 'db',
 undefined,
 `Parsing ${formatType}, validating product columns, and updating regional catalog tables...`
 );

 const sanitizedParsed = parsed.map(item => ({
 ...item,
 origin: item.origin || importTargetBranchId
 }));
 const result = importProducts(sanitizedParsed);
 if (result.success) {
 setShowImportModal(false);
 setShowPortabilityHubModal(false);
 showToast(`Successfully migrated ${result.count} tile products from old ERP OS system!`);
 } else {
 showToast(`Import Failure: ${result.error}`);
 }
 }
 } else {
 showToast('Format Mismatch: Imported contents must represent a valid dataset block.');
 }
 } catch (e: any) {
 showToast(`Migration Error: ${e.message || 'Failed parsing input data'}. Check layout / columns.`);
 }
 };

 const handleFinalizeImportWithBranches = async () => {
 if (!allowedToImport) {
 showToast('RBAC Protection: Only System Administrators (Admins) are authorized to import files.');
 return;
 }
 const invalid = pendingBranches.some(b => b.mode === 'new' && (!b.name.trim() || !b.id.trim() || !b.manager.trim() || !b.address.trim() || !b.phone.trim()));
 if (invalid) {
 showToast('Error: Please complete Name, ID, Manager, Address, and Phone for all brand new branches.');
 return;
 }

 try {
 await triggerSystemProcessing(
 `Registering Branches & Migrating Catalog...`,
 1800,
 'db',
 undefined,
 `Instantiating regional stores, mapping inventories, and synching product lines...`
 );

 // Create new branches only
 let newCount = 0;
 pendingBranches.forEach(b => {
 if (b.mode === 'new') {
 newCount++;
 createBranch({
 id: b.id.trim(), // Unique ID/code detected from CSV
 branchCode: b.id.trim(),
 name: b.name.trim(),
 manager: b.manager,
 address: b.address,
 phone: b.phone,
 monthlySales: 0,
 staffCount: b.staffCount,
 activeCashiers: 1,
 isDistributionBranch: b.isDistributionBranch
 });
 }
 });

 // Build branch mapping dictionary: [detectedLocation.toLowerCase()] -> targetBranchId
 const branchMapping: Record<string, string> = {};
 pendingBranches.forEach(b => {
 const key = b.detectedLocation.toLowerCase().trim();
 if (b.mode === 'existing') {
 branchMapping[key] = b.selectedExistingBranchId;
 } else {
 branchMapping[key] = b.id.trim();
 }
 });

 // Import products passing our override mapping dictionary
 const result = importProducts(pendingProducts, branchMapping);
 if (result.success) {
 if (newCount > 0) {
 showToast(`Successfully registered ${newCount} new branches and migrated ${result.count} tile products!`);
 } else {
 showToast(`Successfully mapped inventories and migrated ${result.count} tile products to existing branches!`);
 }
 setPendingBranches([]);
 setPendingProducts([]);
 setShowBranchConfigs(false);
 } else {
 showToast(`Product Import Error: ${result.error}`);
 }
 } catch (e: any) {
 showToast(`Error: ${e.message || 'Verification failed.'}`);
 }
 };

 return (
 <div className="space-y-6 animate-fade-in text-m3-on-surface">
 <style>{`
 @keyframes borderPulseTwice {
 0%, 100% { border-color: rgba(244, 63, 94, 0.2); box-shadow: 0 0 0 0px rgba(244, 63, 94, 0); }
 25%, 75% { border-color: rgba(244, 63, 94, 1); box-shadow: 0 0 0 4px rgba(244, 63, 94, 0.45); }
 50% { border-color: rgba(244, 63, 94, 0.2); box-shadow: 0 0 0 0px rgba(244, 63, 94, 0); }
 }
 .animate-pulse-twice {
 animation: borderPulseTwice 1.2s ease-in-out 2 !important;
 border-width: 2px !important;
 border-color: rgba(244, 63, 94, 1) !important;
 }
 `}</style>
 
 {/* SUB-HEADER TAB NAVIGATION */}
 {!hideTabHeader && (
 <div className="flex flex-wrap gap-1 md:gap-2 border-b border-m3-outline-variant/20 pb-px items-center sticky top-0 bg-m3-surface/90 backdrop-blur-md z-30 pt-2 pb-2 rounded-b-xl px-2 shadow-sm">
 <button
 onClick={() => changeActiveSubTab('catalog')}
 className={`flex items-center gap-2 py-3 px-4 md:px-5 text-xs font-black uppercase tracking-wider transition-all duration-200 border-b-2 hover:bg-m3-surface-low rounded-t-xl ${
 activeSubTab === 'catalog'
 ? 'border-m3-primary text-m3-primary font-black scale-[1.02]'
 : 'border-transparent text-m3-on-surface-variant'
 }`}
 >
 <Package className="h-4 w-4" />
 <span>Catalog Stock Ledger</span>
 </button>
 
 <button
 onClick={() => changeActiveSubTab('movements')}
 className={`flex items-center gap-2 py-3 px-4 md:px-5 text-xs font-black uppercase tracking-wider transition-all duration-200 border-b-2 hover:bg-m3-surface-low rounded-t-xl ${
 activeSubTab === 'movements'
 ? 'border-m3-primary text-m3-primary font-black scale-[1.02]'
 : 'border-transparent text-m3-on-surface-variant'
 }`}
 >
 <Activity className="h-4 w-4" />
 <span>Adjustments Logs</span>
 </button>

 <button
 onClick={() => changeActiveSubTab('transfers')}
 className={`flex items-center gap-2 py-3 px-4 md:px-5 text-xs font-black uppercase tracking-wider transition-all duration-200 border-b-2 hover:bg-m3-surface-low rounded-t-xl relative ${
 activeSubTab === 'transfers'
 ? 'border-m3-primary text-m3-primary font-black scale-[1.02]'
 : 'border-transparent text-m3-on-surface-variant'
 }`}
 >
 <ArrowRightLeft className="h-4 w-4" />
 <span>Stock Transfers</span>
 {stockTransfers.filter(t => t.status === 'Pending').length > 0 && (
 <span className="absolute -top-1 right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black leading-none text-white shadow-md">
 {stockTransfers.filter(t => t.status === 'Pending').length}
 </span>
 )}
 </button>

 <button
 onClick={() => changeActiveSubTab('ledger')}
 className={`flex items-center gap-2 py-3 px-4 md:px-5 text-xs font-black uppercase tracking-wider transition-all duration-200 border-b-2 hover:bg-m3-surface-low rounded-t-xl ${
 activeSubTab === 'ledger'
 ? 'border-m3-primary text-m3-primary font-black scale-[1.02]'
 : 'border-transparent text-m3-on-surface-variant'
 }`}
 >
 <Sliders className="h-4 w-4" />
 <span>Logistics Ledger & Heatmap</span>
 </button>

 <button
 onClick={() => changeActiveSubTab('import')}
 className={`flex items-center gap-2 py-3 px-4 md:px-5 text-xs font-black uppercase tracking-wider transition-all duration-200 border-b-2 hover:bg-m3-surface-low rounded-t-xl ${
 activeSubTab === 'import'
 ? 'border-m3-primary text-m3-primary font-black scale-[1.02]'
 : 'border-transparent text-m3-on-surface-variant'
 }`}
 >
 <Database className="h-4 w-4 text-emerald-500" />
 <span>Portability &amp; Import Hub</span>
 </button>

 <button
 onClick={() => changeActiveSubTab('branch-prices')}
 className={`flex items-center gap-2 py-3 px-4 md:px-5 text-xs font-black uppercase tracking-wider transition-all duration-200 border-b-2 hover:bg-m3-surface-low rounded-t-xl ${
 activeSubTab === 'branch-prices'
 ? 'border-m3-primary text-m3-primary font-black scale-[1.02]'
 : 'border-transparent text-m3-on-surface-variant'
 }`}
 >
 <DollarSign className="h-4 w-4 text-m3-primary" />
 <span>Branch MSRP & SRP Suggestions</span>
 </button>

 <button
 onClick={() => changeActiveSubTab('expiry')}
 className={`flex items-center gap-2 py-3 px-4 md:px-5 text-xs font-black uppercase tracking-wider transition-all duration-200 border-b-2 hover:bg-m3-surface-low rounded-t-xl ${
 activeSubTab === 'expiry'
 ? 'border-m3-primary text-m3-primary font-black scale-[1.02]'
 : 'border-transparent text-m3-on-surface-variant'
 }`}
 >
 <Clock className="h-4 w-4 text-rose-500" />
 <span>Shelf-Life & Expiry Calendar</span>
 </button>

 <div className="ml-auto flex items-center gap-2 pl-4 py-1.5">
 {allowedToModify && (
 <button
 onClick={handleOpenAdd}
 className="px-4 py-2 bg-m3-primary hover:bg-m3-primary/95 text-white hover:shadow-md font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-lg"
 >
 <Plus className="h-4.5 w-4.5" />
 <span>Add Item (Manual)</span>
 </button>
 )}
 </div>
 </div>
 )}

 {/* INVENTORY DASHBOARD SUMMARY STATS */}
 {['catalog', 'movements', 'ledger'].includes(activeSubTab) && (
 <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
 {/* Total SKUs */}
 <div className="p-4 rounded-3xl bg-m3-surface-low border border-m3-outline-variant/30 flex items-center gap-3.5 relative shadow-sm overflow-hidden group">
 <div className="p-3 rounded-2xl bg-m3-primary/10 text-m3-primary transition-all duration-300">
 <Package className="h-5 w-5" />
 </div>
 <div>
 <span className="text-[10px] text-m3-on-surface-variant font-extrabold uppercase tracking-wide">Total Items</span>
 <div className="text-xl font-black">{stats.totalSKUs}</div>
 </div>
 </div>

 {/* Global Valuation */}
 <div className="p-4 rounded-3xl bg-m3-surface-low border border-m3-outline-variant/30 flex items-center gap-3.5 relative shadow-sm overflow-hidden group">
 <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 transition-all duration-300">
 <DollarSign className="h-5 w-5" />
 </div>
 <div>
 <span className="text-[10px] text-m3-on-surface-variant font-extrabold uppercase tracking-wide">Value of Stock</span>
 <div className="text-xl font-black text-emerald-500">₱{stats.totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
 </div>
 </div>

 {/* Low Stock Alerts */}
 <div className={`p-4 rounded-3xl border flex items-center gap-3.5 relative shadow-sm overflow-hidden shrink-0 ${
 stats.lowStockCount > 0 
 ? 'bg-amber-500/5 border-amber-500/25' 
 : 'bg-m3-surface-low border-m3-outline-variant/30'
 }`}>
 <div className={`p-3 rounded-2xl ${
 stats.lowStockCount > 0 
 ? 'bg-amber-500/15 text-amber-500 animate-pulse' 
 : 'bg-zinc-500/10 text-zinc-400'
 }`}>
 <AlertTriangle className="h-5 w-5" />
 </div>
 <div>
 <span className="text-[10px] text-m3-on-surface-variant font-extrabold uppercase tracking-wide">Low Stock Alert</span>
 <div className={`text-xl font-black ${stats.lowStockCount > 0 ? 'text-amber-500' : ''}`}>{stats.lowStockCount}</div>
 </div>
 </div>

 {/* Critical Stock Alerts */}
 <div className={`p-4 rounded-3xl border flex items-center gap-3.5 relative shadow-sm overflow-hidden shrink-0 ${
 stats.criticalStockCount > 0 
 ? 'bg-rose-500/5 border-rose-500/20' 
 : 'bg-m3-surface-low border-m3-outline-variant/30'
 }`}>
 <div className={`p-3 rounded-2xl ${
 stats.criticalStockCount > 0 
 ? 'bg-rose-500/15 text-rose-500 animate-bounce' 
 : 'bg-zinc-500/10 text-zinc-400'
 }`}>
 <AlertCircle className="h-5 w-5" />
 </div>
 <div>
 <span className="text-[10px] text-m3-on-surface-variant font-extrabold uppercase tracking-wide">Critical Warns</span>
 <div className={`text-xl font-black ${stats.criticalStockCount > 0 ? 'text-rose-500 font-extrabold' : ''}`}>{stats.criticalStockCount}</div>
 </div>
 </div>

 {/* Out of Stock Alerts */}
 <div className={`p-4 rounded-3xl border col-span-2 lg:col-span-1 flex items-center gap-3.5 relative shadow-sm overflow-hidden shrink-0 ${
 stats.outOfStockCount > 0 
 ? 'bg-red-600/5 border-red-600/20' 
 : 'bg-m3-surface-low border-m3-outline-variant/30'
 }`}>
 <div className="p-3 rounded-2xl bg-zinc-500/10 text-zinc-400">
 <X className="h-5 w-5 font-black" />
 </div>
 <div>
 <span className="text-[10px] text-m3-on-surface-variant font-extrabold uppercase tracking-wide font-black">Out of Stock</span>
 <div className={`text-xl font-black ${stats.outOfStockCount > 0 ? 'text-red-500' : ''}`}>{stats.outOfStockCount}</div>
 </div>
 </div>
 </div>
 )}

 {/* VIEW 1: CATALOG STOCK LEDGER */}
 {activeSubTab === 'catalog' && (
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
 placeholder={products.some(p => !p.isDeleted) ? "Filter by Name, SKU, design name, code..." : "No items available to filter (Inventory empty)"}
 disabled={!products.some(p => !p.isDeleted)}
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
 
 </button>
 )}
 </div>

 {/* Advanced catalog filters and commands */}
 <div className="flex flex-wrap gap-2.5 w-full justify-start xl:justify-end items-center">
 
 {/* Branch view select / consolidated */}
 <div className="flex items-center gap-1.5 bg-m3-surface-lowest border border-emerald-500/30 px-3 py-1.5 rounded-xl shadow-sm">
 <span className="text-[9px] uppercase font-black tracking-widest text-emerald-600 font-mono">Branch:</span>
 {isAdminUser ? (
 <select
 value={selectedViewBranchId}
 onChange={e => setSelectedViewBranchId(e.target.value)}
 className="bg-transparent text-xs text-emerald-500 focus:outline-none cursor-pointer transition-colors font-extrabold outline-none"
 >
 <option value="consolidated">HQ Consolidated (HQ Master)</option>
 {branches.filter(b => !b.isDeleted).map((b) => (
 <option key={b.id} value={b.id}>{b.name.replace('Emman Tile Center ', 'Branch: ')}</option>
 ))}
 </select>
 ) : (
 <span className="text-xs text-emerald-500 font-extrabold">
 {branches.find(b => b.id === (currentUser?.branchAssignmentId || 'B1'))?.name || 'N/A'}
 </span>
 )}
 </div>

 {/* Category select */}
 <div className="flex items-center gap-1.5 bg-m3-surface-lowest border border-m3-outline-variant/25 px-3 py-1.5 rounded-xl shadow-sm">
 <span className="text-[9px] uppercase font-black tracking-widest text-m3-on-surface-variant font-mono">Category:</span>
 <select
 value={categoryFilter}
 onChange={e => setCategoryFilter(e.target.value)}
 className="bg-transparent text-xs text-m3-on-surface focus:outline-none cursor-pointer transition-colors font-semibold outline-none"
 >
 <option value="All">All Categories</option>
 {categories.slice(0, 16).map((cat, i) => (
 <option key={i} value={cat}>{cat}</option>
 ))}
 </select>
 </div>

 {/* Status select */}
 <div className="flex items-center gap-1.5 bg-m3-surface-lowest border border-m3-outline-variant/25 px-3 py-1.5 rounded-xl shadow-sm">
 <span className="text-[9px] uppercase font-black tracking-widest text-m3-on-surface-variant font-mono">Status:</span>
 <select
 value={statusFilter}
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
 {getSelectedProducts().length > 0 && (
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
 <div className="m3-card shadow-sm p-0 overflow-hidden snap-start scroll-mt-20">
 <div ref={catalogTableContainerRef} className="overflow-auto scrollbar-thin scrollbar-thumb-m3-outline-variant min-h-[280px]">
 <table className={`w-full text-left border-collapse table-auto text-xs transition-all ${isCompactColumns ? 'min-w-[700px]' : 'min-w-[1280px]'}`}>
 <thead>
 <tr className="border-b border-m3-outline-variant/20 bg-m3-surface/30 text-[10px] uppercase font-bold text-m3-on-surface-variant tracking-wider">
 {/* Checkbox column header */}
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
    <td colSpan={10} className="py-12 text-center text-sm font-medium text-m3-on-surface-variant/70">
      No products found matching the search criteria or selected branch filter.
    </td>
  </tr>
) : (
  paginatedProducts.map((p) => {
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
 <div>QR: {p.qrCode}</div>
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
 const today = new Date("2026-07-18");
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
 ₱{p.costPrice.toFixed(2)}
 </td>
 )}

 {/* Retail selling price */}
 <td className="py-3.5 px-4 text-right font-mono font-extrabold text-m3-primary">
 ₱{p.sellingPrice.toFixed(2)}
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
 title="View / Print Barcodes & QR Codes"
 >
 <QrCode className="h-4 w-4" />
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

 {/* Expanded Sub-Row with Detailed Layout Card to Prevent Screen Overflow */}
 <AnimatePresence initial={false}>
 {isExpanded && (
 <tr key={`${p.id}-expanded-details`}>
 <td colSpan={isCompactColumns ? 8 : 14} className="p-4 bg-m3-surface-low border-b border-m3-outline-variant/20">
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
 <span className="text-zinc-500 font-mono text-xs">₱{p.costPrice.toFixed(2)}</span>
 </div>
 )}
 <div>
 <span className="text-[9px] text-zinc-400 font-black uppercase block leading-none mb-1">Selling Retail</span>
 <span className="text-m3-primary font-mono text-xs font-extrabold">₱{p.sellingPrice.toFixed(2)}</span>
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
  value={overrideLimit}
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
  })
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
  )}

  {/* VIEW 7: SHELF-LIFE & EXPIRY CALENDAR */}
  {activeSubTab === 'expiry' && (() => {
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const startDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay(); // 0 = Sun
    const todayStr = new Date().toISOString().split('T')[0];
    const MONTH_NAMES = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const prevMonth = () => {
      if (calendarMonth === 0) {
        setCalendarMonth(11);
        setCalendarYear(v => v - 1);
      } else {
        setCalendarMonth(v => v - 1);
      }
    };

    const nextMonth = () => {
      if (calendarMonth === 11) {
        setCalendarMonth(0);
        setCalendarYear(v => v + 1);
      } else {
        setCalendarMonth(v => v + 1);
      }
    };

    const jumpToToday = () => {
      const now = new Date();
      setCalendarYear(now.getFullYear());
      setCalendarMonth(now.getMonth());
      setCalendarSelectedDay(now.toISOString().split('T')[0]);
    };

    return (
      <div className="space-y-6 text-left animate-fade-in">
        {/* Top Split: Calendar View Matrix (cols 1 & 2) + Analytics / Protocol (col 3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1 & 2: Interactive Expiration Calendar Matrix */}
          <div className="lg:col-span-2 bg-m3-surface border border-m3-outline-variant/15 p-5 rounded-2xl space-y-4 shadow-sm">
            {/* Calendar Header Navigation */}
            <div className="flex flex-wrap justify-between items-center gap-3 border-b border-m3-outline-variant/10 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-m3-primary" />
                <span className="font-sans font-black text-xs uppercase tracking-widest text-m3-primary">
                  Interactive Expiration Calendar
                </span>
                {calendarSelectedDay && (
                  <span className="text-[10px] font-mono bg-m3-primary/10 text-m3-primary px-2 py-0.5 rounded-full font-bold border border-m3-primary/20 flex items-center gap-1">
                    Selected: {calendarSelectedDay}
                    <button 
                      onClick={() => setCalendarSelectedDay(null)}
                      className="ml-1 hover:text-rose-500 font-black cursor-pointer"
                      title="Clear date filter"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={jumpToToday}
                  className="px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-lg border border-m3-outline-variant/30 hover:bg-m3-surface-high text-m3-on-surface transition-colors cursor-pointer"
                >
                  Today
                </button>
                <div className="flex items-center gap-1 bg-m3-surface-low rounded-xl p-1 border border-m3-outline-variant/20">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="p-1 hover:bg-m3-surface-high text-m3-on-surface rounded-lg transition-colors cursor-pointer"
                    title="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-black font-sans px-3 min-w-[120px] text-center text-m3-on-surface">
                    {MONTH_NAMES[calendarMonth]} {calendarYear}
                  </span>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="p-1 hover:bg-m3-surface-high text-m3-on-surface rounded-lg transition-colors cursor-pointer"
                    title="Next month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] font-black uppercase text-m3-on-surface-variant/70 border-b border-m3-outline-variant/10 pb-2">
              <span className="text-rose-500/80">Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Monthly Day Grid Matrix */}
            <div className="grid grid-cols-7 gap-1.5">
              {/* Empty leading slots */}
              {Array.from({ length: startDayOfWeek }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-16 rounded-xl bg-m3-surface-low/30 border border-transparent opacity-30" />
              ))}

              {/* Day Tiles */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                
                // Find batches expiring on dateStr
                const dayBatches = batches.filter(b => b.expiryDate === dateStr);
                const expiredCount = dayBatches.filter(b => computeLiveBatchStatus(b.expiryDate) === 'Expired').length;
                const expiringSoonCount = dayBatches.filter(b => computeLiveBatchStatus(b.expiryDate) === 'Expiring Soon').length;
                const goodCount = dayBatches.filter(b => computeLiveBatchStatus(b.expiryDate) === 'Good').length;

                const isToday = dateStr === todayStr;
                const isSelected = calendarSelectedDay === dateStr;

                return (
                  <div
                    key={`day-${dayNum}`}
                    onClick={() => setCalendarSelectedDay(isSelected ? null : dateStr)}
                    className={`h-16 p-1.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer select-none relative ${
                      isSelected
                        ? 'bg-m3-primary/15 border-m3-primary ring-2 ring-m3-primary/30 shadow-md scale-[1.02]'
                        : isToday
                        ? 'bg-amber-500/10 border-amber-500/40'
                        : dayBatches.length > 0
                        ? 'bg-m3-surface-low border-m3-outline-variant/30 hover:border-m3-primary/50 hover:bg-m3-surface-high'
                        : 'bg-m3-surface-low/50 border-m3-outline-variant/15 opacity-70 hover:opacity-100 hover:border-m3-outline-variant/30'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-black font-mono ${
                        isToday ? 'text-amber-500 font-extrabold' : 'text-m3-on-surface'
                      }`}>
                        {dayNum}
                      </span>
                      {isToday && (
                        <span className="text-[7.5px] font-extrabold uppercase bg-amber-500 text-black px-1 rounded">
                          Today
                        </span>
                      )}
                    </div>

                    {/* Expiry Indicators */}
                    <div className="space-y-0.5">
                      {expiredCount > 0 && (
                        <div className="bg-rose-500 text-white text-[8px] font-black px-1 py-0.2 rounded truncate flex items-center justify-between">
                          <span>Expired</span>
                          <span>{expiredCount}</span>
                        </div>
                      )}
                      {expiringSoonCount > 0 && (
                        <div className="bg-amber-500 text-slate-950 text-[8px] font-black px-1 py-0.2 rounded truncate flex items-center justify-between">
                          <span>Soon</span>
                          <span>{expiringSoonCount}</span>
                        </div>
                      )}
                      {goodCount > 0 && expiredCount === 0 && expiringSoonCount === 0 && (
                        <div className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[8px] font-bold px-1 rounded truncate text-center">
                          {goodCount} Stable
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-m3-outline-variant/10 text-[10px] text-m3-on-surface-variant font-sans">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" /> Expired
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" /> Expiring &lt;= 30 Days
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Stable (&gt; 30 Days)
                </span>
              </div>
              <span className="text-[9px] font-mono text-m3-on-surface-variant/70">
                Click any day tile to isolate batch entries
              </span>
            </div>
          </div>

          {/* Column 3: Shelf-Life Analytics & Real-Time Alerts */}
          <div className="bg-m3-surface border border-m3-outline-variant/15 p-5 rounded-2xl space-y-4 text-left flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-m3-outline-variant/10 pb-3">
                <span className="font-sans font-black text-xs uppercase tracking-widest text-m3-primary block">
                  Shelf-Life Warnings &amp; Logs
                </span>
                <button
                  type="button"
                  onClick={handleResetSimulationBatches}
                  className="text-[9.5px] font-extrabold text-m3-primary hover:underline flex items-center gap-1 cursor-pointer"
                  title="Re-synchronize chemical stock batch logs directly with products catalog"
                >
                  <span>Re-Sync Database</span>
                </button>
              </div>

              <div className="space-y-3">
                {/* Expired count stat */}
                <div className="flex justify-between items-center bg-rose-500/5 p-3.5 rounded-xl border border-rose-500/10">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    <span className="text-[11px] font-bold text-rose-500 uppercase">Expired Batches</span>
                  </div>
                  <span className="font-mono text-sm font-black text-rose-600 dark:text-rose-400">
                    {filteredBatches.filter(b => computeLiveBatchStatus(b.expiryDate) === "Expired").length}
                  </span>
                </div>

                {/* Expiring Soon count stat */}
                <div className="flex justify-between items-center bg-amber-500/5 p-3.5 rounded-xl border border-amber-500/10">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="text-[11px] font-bold text-amber-500 uppercase">Expiring (&lt;= 30 days)</span>
                  </div>
                  <span className="font-mono text-sm font-black text-amber-600 dark:text-amber-400">
                    {filteredBatches.filter(b => computeLiveBatchStatus(b.expiryDate) === "Expiring Soon").length}
                  </span>
                </div>

                {/* Healthy count stat */}
                <div className="flex justify-between items-center bg-emerald-500/5 p-3.5 rounded-xl border border-emerald-500/10">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-bold text-emerald-500 uppercase">Stable Stocks</span>
                  </div>
                  <span className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {filteredBatches.filter(b => computeLiveBatchStatus(b.expiryDate) === "Good").length}
                  </span>
                </div>
              </div>
            </div>

            {/* Expiry Action Protocol Notice */}
            <div className="p-3.5 rounded-xl bg-m3-surface-low border border-m3-outline-variant/20 space-y-1.5 mt-2">
              <span className="text-[9px] font-black text-m3-primary uppercase tracking-wider block font-sans">
                ERP Quality &amp; Safety Protocol
              </span>
              <p className="text-[11px] text-m3-on-surface-variant font-medium leading-relaxed font-sans">
                <strong>Notice:</strong> Expired grout, tile mortar adhesives, and chemical sealants must be quarantined immediately. Expired chemicals lose bonding strength and cannot be sold.
              </p>
            </div>
          </div>
        </div>

        {/* Batches Log Table */}
        <div className="space-y-3.5 text-left pt-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="font-sans font-black text-xs uppercase tracking-widest text-m3-primary block">
                Chemical Batch Expiration Log Entries ({filteredBatches.length})
              </span>
              {calendarSelectedDay && (
                <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  Filtered for {calendarSelectedDay}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setBatchFormBranchId(selectedViewBranchId === 'consolidated' ? (currentUser?.branchAssignmentId || 'B1') : selectedViewBranchId);
                setShowAddBatchModal(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-m3-primary hover:bg-m3-primary/90 text-m3-on-primary text-xs font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Register Chemical Stock Batch</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-m3-outline-variant/15">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-m3-surface-high/15 border-b border-m3-outline-variant/20 font-black text-m3-on-surface">
                <tr>
                  <th className="py-3 px-4 font-sans">Product / Code</th>
                  <th className="py-3 px-4 font-sans text-center">Batch Number</th>
                  <th className="py-3 px-4 font-sans text-right">Quantity</th>
                  <th className="py-3 px-4 font-sans text-center">Mfg Date</th>
                  <th className="py-3 px-4 font-sans text-center">Expiry Date</th>
                  <th className="py-3 px-4 font-sans text-center">Branch Allocation</th>
                  <th className="py-3 px-4 font-sans text-center">Status</th>
                  <th className="py-3 px-4 font-sans text-center">Remarks / Notes</th>
                  <th className="py-3 px-4 font-sans text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-m3-outline-variant/10 text-m3-on-surface/90">
                {filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-zinc-400 italic">
                      No chemical stock batches match the active filters or selected date. Click "Register Chemical Stock Batch" to log a new record.
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map(b => {
                    const prod = products.find(p => p.id === b.productId);
                    const pName = prod ? prod.productName : b.productName;
                    const pCode = prod ? prod.productCode : b.productCode;
                    const pUnit = prod?.unit || 'bags';
                    const liveStatus = computeLiveBatchStatus(b.expiryDate);

                    return (
                      <tr 
                        key={b.id} 
                        onClick={() => setSelectedBatchDetail(b)}
                        className="hover:bg-m3-surface-high/60 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-4 font-sans">
                          <strong className="text-m3-on-surface font-black block group-hover:text-m3-primary transition-colors">{pName}</strong>
                          <span className="text-[9px] font-mono text-m3-primary font-bold">{pCode}</span>
                        </td>

                        <td className="py-3 px-4 font-mono text-center font-bold text-zinc-700 dark:text-zinc-300">
                          #{b.batchNumber}
                        </td>

                        <td className="py-3 px-4 font-mono text-right font-black text-m3-on-surface">
                          {b.quantity} {pUnit}
                        </td>

                        <td className="py-3 px-4 font-mono text-center text-zinc-500 font-semibold">
                          {b.manufactureDate}
                        </td>

                        <td className="py-3 px-4 font-mono text-center text-zinc-700 dark:text-zinc-300 font-bold">
                          {b.expiryDate}
                        </td>

                        <td className="py-3 px-4 text-center font-bold">
                          {branches.find(br => br.id === b.branchId)?.name || b.branchId}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wide border ${
                            liveStatus === "Expired"
                              ? "bg-rose-500/10 text-rose-500 border-rose-500/20 font-black animate-pulse"
                              : liveStatus === "Expiring Soon"
                              ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          }`}>
                            {liveStatus}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-sans text-zinc-500 italic font-medium max-w-[200px] truncate" title={b.remarks}>
                          {b.remarks || "N/A"}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBatchDetail(b);
                              }}
                              className="p-1 hover:bg-m3-primary/10 text-m3-primary/70 hover:text-m3-primary rounded-full transition-colors cursor-pointer"
                              title="View Full Batch Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {!hasActiveShift && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveBatch(b.id);
                                }}
                                className="p-1 hover:bg-rose-500/10 hover:text-rose-500 text-zinc-400 rounded-full transition-colors cursor-pointer"
                                title="Remove batch log entry"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  })()}

  {/* ---------------------------------------------------------------------- */}
  {/* SUB-TAB 2: ADJUSTMENTS & MOVEMENT LOGS */}
  {/* ---------------------------------------------------------------------- */}
  {activeSubTab === 'movements' && (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Header & Primary Action Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-m3-surface-low p-5 rounded-[24px] border border-m3-outline-variant/20 shadow-sm">
        <div>
          <h2 className="text-base font-black text-m3-on-surface uppercase tracking-wider flex items-center gap-2">
            <Activity className="h-5 w-5 text-m3-primary" />
            <span>Stock Adjustments & Audit Movement Logs</span>
          </h2>
          <p className="text-xs text-m3-on-surface-variant font-medium mt-0.5">
            Complete audit trail of all physical stock additions, inventory manual write-offs, damages, and reconciliations.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdjustModal(true)}
          className="px-4 py-2.5 rounded-xl bg-m3-primary hover:bg-m3-primary/90 text-m3-on-primary text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <Sliders className="h-4 w-4" />
          <span>Record Manual Adjustment</span>
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-m3-surface p-4 rounded-2xl border border-m3-outline-variant/15 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-m3-on-surface-variant">Total Movement Logs</span>
          <div className="text-xl font-black font-mono text-m3-on-surface">{filteredMovements.length}</div>
        </div>
        <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/15 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Stock Inflows (+)</span>
          <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            +{filteredMovements.filter(m => m.quantity > 0).reduce((acc, m) => acc + m.quantity, 0)} boxes
          </div>
        </div>
        <div className="bg-rose-500/5 p-4 rounded-2xl border border-rose-500/15 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">Deductions & Outflows (-)</span>
          <div className="text-xl font-black font-mono text-rose-600 dark:text-rose-400">
            {filteredMovements.filter(m => m.quantity < 0).reduce((acc, m) => acc + m.quantity, 0)} boxes
          </div>
        </div>
        <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/15 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Damaged / Write-Offs</span>
          <div className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
            {filteredMovements.filter(m => (m.type || '').toUpperCase().includes('DAMAGE')).length} incidents
          </div>
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-m3-on-surface-variant/60" />
          <input
            type="text"
            value={movementSearch}
            onChange={(e) => setMovementSearch(e.target.value)}
            placeholder="Search log by notes, ref #, or operator..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-m3-surface-low border border-m3-outline-variant/30 focus:border-m3-primary focus:outline-none text-m3-on-surface"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={movementTypeFilter}
            onChange={(e) => setMovementTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-m3-surface-low border border-m3-outline-variant/30 text-m3-on-surface font-bold focus:outline-none"
          >
            <option value="All">All Movement Types</option>
            <option value="IN">Stock Inflow (IN)</option>
            <option value="OUT">Stock Outflow (OUT)</option>
            <option value="ADJUST">Manual Adjustments</option>
            <option value="DAMAGE">Damage & Breakage</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto rounded-2xl border border-m3-outline-variant/20 bg-m3-surface shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-m3-surface-high/20 border-b border-m3-outline-variant/20 font-black text-m3-on-surface">
            <tr>
              <th className="py-3 px-4">Date & Time</th>
              <th className="py-3 px-4">Branch</th>
              <th className="py-3 px-4">Product Name</th>
              <th className="py-3 px-4 text-center">Movement Type</th>
              <th className="py-3 px-4 text-right">Quantity Change</th>
              <th className="py-3 px-4">Reference No.</th>
              <th className="py-3 px-4">Operator / User</th>
              <th className="py-3 px-4">Notes / Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-m3-outline-variant/10 text-m3-on-surface/90">
            {filteredMovements.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-m3-on-surface-variant/70 italic font-medium">
                  No movement log entries match the selected filters or branch view scope.
                </td>
              </tr>
            ) : (
              filteredMovements.map((m) => {
                const prod = products.find(p => p.id === m.productId);
                const br = branches.find(b => b.id === (m.sourceBranchId || m.destinationBranchId));
                const brName = br ? br.name : (m.sourceBranchId || 'Central');
                const isPositive = m.quantity > 0;

                return (
                  <tr key={m.id} className="hover:bg-m3-surface-low/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-m3-on-surface-variant">
                      {new Date(m.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-m3-on-surface">
                      {brName}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-m3-on-surface">
                      {prod ? prod.productName : m.productId}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider border ${
                        m.type === 'IN' || m.type === 'PURCHASE'
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          : m.type === 'DAMAGE' || m.type === 'LOSS'
                          ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                          : 'bg-m3-primary/10 text-m3-primary border-m3-primary/20'
                      }`}>
                        {m.type}
                      </span>
                    </td>
                    <td className={`py-3 px-4 text-right font-mono font-black ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {isPositive ? `+${m.quantity}` : m.quantity} units
                    </td>
                    <td className="py-3 px-4 font-mono text-m3-on-surface-variant">
                      {m.referenceId || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-m3-on-surface-variant">
                      {m.username || m.userId || 'System Admin'}
                    </td>
                    <td className="py-3 px-4 text-m3-on-surface-variant/80 italic max-w-xs truncate" title={m.notes}>
                      {m.notes || 'Routine stock operation'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )}

  {/* ---------------------------------------------------------------------- */}
  {/* SUB-TAB 3: STOCK TRANSFERS */}
  {/* ---------------------------------------------------------------------- */}
  {activeSubTab === 'transfers' && (
    <div className="space-y-6 text-left animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-m3-surface-low p-5 rounded-[24px] border border-m3-outline-variant/20 shadow-sm">
        <div>
          <h2 className="text-base font-black text-m3-on-surface uppercase tracking-wider flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-m3-primary" />
            <span>Inter-Branch Stock Transfers & Transmittals</span>
          </h2>
          <p className="text-xs text-m3-on-surface-variant font-medium mt-0.5">
            Manage multi-store inventory relocations, pending dispatch approvals, and branch receipt confirmations.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateTransfer(true)}
          className="px-4 py-2.5 rounded-xl bg-m3-primary hover:bg-m3-primary/90 text-m3-on-primary text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Initiate Stock Transfer Request</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-m3-surface p-4 rounded-2xl border border-m3-outline-variant/15 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-m3-on-surface-variant">Total Transfer Orders</span>
          <div className="text-xl font-black font-mono text-m3-on-surface">{stockTransfers.length}</div>
        </div>
        <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/15 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Pending Approval</span>
          <div className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
            {stockTransfers.filter(t => t.status === 'Pending').length} requests
          </div>
        </div>
        <div className="bg-sky-500/5 p-4 rounded-2xl border border-sky-500/15 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">In Transit / Dispatched</span>
          <div className="text-xl font-black font-mono text-sky-600 dark:text-sky-400">
            {stockTransfers.filter(t => t.status === 'Dispatched').length} orders
          </div>
        </div>
        <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/15 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Completed Transfers</span>
          <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {stockTransfers.filter(t => t.status === 'Received' || t.status === 'Completed').length} received
          </div>
        </div>
      </div>

      {/* Transfers List Table */}
      <div className="overflow-x-auto rounded-2xl border border-m3-outline-variant/20 bg-m3-surface shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-m3-surface-high/20 border-b border-m3-outline-variant/20 font-black text-m3-on-surface">
            <tr>
              <th className="py-3 px-4">Transfer Ref #</th>
              <th className="py-3 px-4">Date & Time</th>
              <th className="py-3 px-4">Source Origin</th>
              <th className="py-3 px-4">Destination Store</th>
              <th className="py-3 px-4 text-center">Items Count</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4">Requested By</th>
              <th className="py-3 px-4">Reason / Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-m3-outline-variant/10 text-m3-on-surface/90">
            {stockTransfers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-m3-on-surface-variant/70 italic font-medium">
                  No stock transfer orders recorded yet. Click Initiate Stock Transfer Request to transfer items between branches.
                </td>
              </tr>
            ) : (
              stockTransfers.map((t) => {
                const srcBranch = branches.find(b => b.id === t.fromBranchId);
                const destBranch = branches.find(b => b.id === t.toBranchId);
                const itemCount = (t.items || []).reduce((acc, item) => acc + item.quantity, 0);

                return (
                  <tr key={t.id} className="hover:bg-m3-surface-low/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-m3-primary">
                      {t.transferNo || t.id.slice(-8)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-m3-on-surface-variant">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-m3-on-surface">
                      {srcBranch ? srcBranch.name : t.fromBranchId}
                    </td>
                    <td className="py-3 px-4 font-bold text-m3-on-surface">
                      {destBranch ? destBranch.name : t.toBranchId}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold">
                      {itemCount} units ({t.items?.length || 0} SKUs)
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider border ${
                        t.status === 'Completed' || t.status === 'Received'
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          : t.status === 'Dispatched'
                          ? 'bg-sky-500/10 text-sky-500 border-sky-500/20'
                          : t.status === 'Pending'
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse'
                          : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-m3-on-surface-variant">
                      {t.requestedBy || 'Store Manager'}
                    </td>
                    <td className="py-3 px-4 text-m3-on-surface-variant/80 italic max-w-xs truncate" title={t.reason}>
                      {t.reason || 'Inter-branch inventory rebalancing'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )}

  {/* ---------------------------------------------------------------------- */}
  {/* SUB-TAB 4: LOGISTICS LEDGER & HEATMAP */}
  {/* ---------------------------------------------------------------------- */}
  {activeSubTab === 'ledger' && (
    <div className="space-y-6 text-left animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-m3-surface-low p-5 rounded-[24px] border border-m3-outline-variant/20 shadow-sm">
        <div>
          <h2 className="text-base font-black text-m3-on-surface uppercase tracking-wider flex items-center gap-2">
            <Sliders className="h-5 w-5 text-m3-primary" />
            <span>Branch Logistics Distribution & Ledger Heatmap</span>
          </h2>
          <p className="text-xs text-m3-on-surface-variant font-medium mt-0.5">
            Real-time visual map of inventory volume, cross-node movement intensity, and financial stock ledgers.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowManualLedgerModal(true)}
          className="px-4 py-2.5 rounded-xl bg-m3-primary hover:bg-m3-primary/90 text-m3-on-primary text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Manual Ledger Entry</span>
        </button>
      </div>

      {/* Branch Heatmap Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.filter(b => !b.isDeleted && (isAdminUser || b.id === activeBranchId)).map(b => {
          const bStockItems = branchStock.filter(bs => bs.branchId === b.id);
          const totalUnitsInBranch = bStockItems.reduce((acc, bs) => acc + bs.quantity, 0);
          const lowStockCount = bStockItems.filter(bs => bs.quantity < 20).length;

          return (
            <div key={b.id} className="bg-m3-surface p-5 rounded-2xl border border-m3-outline-variant/20 space-y-3 relative overflow-hidden">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black text-m3-on-surface">{b.name}</h3>
                  <span className="text-[10px] text-m3-on-surface-variant font-mono">Code: {b.branchCode || b.id}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                  b.id === selectedViewBranchId || selectedViewBranchId === 'consolidated'
                    ? 'bg-m3-primary/10 text-m3-primary border-m3-primary/20'
                    : 'bg-m3-surface-low text-m3-on-surface-variant border-transparent'
                }`}>
                  {b.isDistributionBranch ? 'HQ Hub' : 'Store Branch'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-m3-surface-low p-2.5 rounded-xl">
                  <span className="text-[9.5px] text-m3-on-surface-variant font-bold block">Physical Units</span>
                  <span className="text-base font-black font-mono text-m3-primary">{totalUnitsInBranch.toLocaleString()}</span>
                </div>
                <div className="bg-m3-surface-low p-2.5 rounded-xl">
                  <span className="text-[9.5px] text-m3-on-surface-variant font-bold block">Low Stock Items</span>
                  <span className={`text-base font-black font-mono ${lowStockCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {lowStockCount}
                  </span>
                </div>
              </div>

              {/* Intensity Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-m3-on-surface-variant">
                  <span>Capacity Volume Allocation</span>
                  <span>{Math.min(100, Math.round((totalUnitsInBranch / 5000) * 100))}%</span>
                </div>
                <div className="h-2 w-full bg-m3-surface-low rounded-full overflow-hidden">
                  <div
                    className="h-full bg-m3-primary rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((totalUnitsInBranch / 5000) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ledger Entries Table */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-m3-primary">
          Enterprise Financial & Movement Ledger Log ({filteredLedgerEntries.length})
        </h3>
        <div className="overflow-x-auto rounded-2xl border border-m3-outline-variant/20 bg-m3-surface shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-m3-surface-high/20 border-b border-m3-outline-variant/20 font-black text-m3-on-surface">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Branch Node</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4 text-center">Movement Type</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4">Reference No</th>
                <th className="py-3 px-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-m3-outline-variant/10 text-m3-on-surface/90">
              {filteredLedgerEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-m3-on-surface-variant/70 italic font-medium">
                    No ledger entries recorded for this branch scope yet.
                  </td>
                </tr>
              ) : (
                paginatedLedger.map((le) => {
                  const br = branches.find(b => b.id === le.branchId);
                  return (
                    <tr key={le.id} className="hover:bg-m3-surface-low/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-m3-on-surface-variant">
                        {le.date}
                      </td>
                      <td className="py-3 px-4 font-bold text-m3-on-surface">
                        {br ? br.name : le.branchId}
                      </td>
                      <td className="py-3 px-4 font-bold text-m3-on-surface">
                        {le.productName}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider border ${
                          le.movementType === 'IN' || le.movementType === 'PURCHASE'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : 'bg-m3-primary/10 text-m3-primary border-m3-primary/20'
                        }`}>
                          {le.movementType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-m3-on-surface">
                        {le.quantity}
                      </td>
                      <td className="py-3 px-4 font-mono text-m3-on-surface-variant">
                        {le.referenceNo || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-m3-on-surface-variant/80 italic max-w-xs truncate" title={le.remarks}>
                        {le.remarks || 'Standard ledger entry'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}

  {/* ---------------------------------------------------------------------- */}
  {/* SUB-TAB 5: PORTABILITY & IMPORT HUB */}
  {/* ---------------------------------------------------------------------- */}
  {activeSubTab === 'import' && (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Tool Header & Mode Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-m3-surface-low p-5 rounded-[24px] border border-m3-outline-variant/20 shadow-sm">
        <div>
          <h2 className="text-base font-black text-m3-on-surface uppercase tracking-wider flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-500" />
            <span>Migration & Import / Export Tool</span>
          </h2>
          <p className="text-xs text-m3-on-surface-variant font-medium mt-0.5">
            Import tile catalog CSV or JSON files into TilePoint database or download full system backups.
          </p>
        </div>

        {/* Tab Switcher: Import vs Export */}
        <div className="flex bg-m3-surface p-1 rounded-xl border border-m3-outline-variant/20 shrink-0">
          <button
            type="button"
            onClick={() => setMigrationSubTab('import')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              migrationSubTab === 'import'
                ? 'bg-m3-primary text-white shadow-sm'
                : 'text-m3-on-surface-variant hover:text-m3-on-surface'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import & Migration</span>
          </button>
          <button
            type="button"
            onClick={() => setMigrationSubTab('export')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              migrationSubTab === 'export'
                ? 'bg-m3-primary text-white shadow-sm'
                : 'text-m3-on-surface-variant hover:text-m3-on-surface'
            }`}
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export & Backups</span>
          </button>
        </div>
      </div>

      {/* MODE 1: IMPORT & MIGRATION */}
      {migrationSubTab === 'import' && (
        <div className="space-y-6 animate-fade-in">
          {/* Target Branch Selection */}
          <div className="p-4 rounded-2xl bg-m3-surface border border-m3-outline-variant/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-m3-primary tracking-wider">
              <MapPin className="h-4 w-4" />
              <span>Target Destination Branch Allocation</span>
            </div>
            {currentUser?.role === UserRole.ADMIN ? (
              <select
                value={importTargetBranchId}
                onChange={e => setImportTargetBranchId(e.target.value)}
                className="bg-m3-surface-lowest border border-m3-outline-variant/30 px-3 py-2 text-xs font-bold text-m3-on-surface rounded-xl focus:outline-none focus:border-m3-primary cursor-pointer max-w-md w-full sm:w-auto"
              >
                {branches.filter(b => !b.isDeleted).map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.id}) - {b.address}
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-1.5 text-xs font-bold text-m3-on-surface bg-m3-surface-low rounded-xl border border-m3-outline-variant/20 flex items-center gap-2">
                <span>{branches.find(b => b.id === (currentUser?.branchAssignmentId || 'B1'))?.name}</span>
                <span className="text-[10px] font-mono text-m3-tertiary">({currentUser?.branchAssignmentId || 'B1'})</span>
              </div>
            )}
          </div>

          {/* Upload Box & Drag Zone */}
          <div className="bg-m3-surface p-6 rounded-2xl border border-m3-outline-variant/20 space-y-4">
            <h3 className="text-sm font-black text-m3-on-surface uppercase tracking-wider flex items-center gap-2">
              <Upload className="h-4 w-4 text-emerald-500" />
              <span>Upload CSV / JSON Dataset</span>
            </h3>
            
            <div
              onDragOver={handleImportDragOver}
              onDragLeave={handleImportDragLeave}
              onDrop={handleImportDrop}
              onClick={() => {
                const fileInput = document.getElementById('inventory-import-file-input');
                if (fileInput) fileInput.click();
              }}
              className="border-2 border-dashed border-m3-outline-variant/30 hover:border-m3-primary p-8 rounded-2xl text-center cursor-pointer transition-all bg-m3-surface-low hover:bg-m3-primary/5 space-y-2 group"
            >
              <input
                id="inventory-import-file-input"
                type="file"
                accept=".csv,.json,text/csv,application/json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Database className="h-8 w-8 text-m3-primary mx-auto group-hover:scale-110 transition-transform" />
              <div className="text-xs font-black text-m3-on-surface">Click to Browse or Drag & Drop Catalog Files Here</div>
              <div className="text-[10.5px] text-m3-on-surface-variant font-mono">Supports .CSV spreadsheet tables and .JSON exports</div>
            </div>
          </div>

          {/* Raw Text Input & Inspector */}
          <div className="bg-m3-surface p-6 rounded-2xl border border-m3-outline-variant/20 space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-black text-m3-on-surface uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>Pre-Flight Schema & Validation Inspector</span>
                </h3>
                <p className="text-xs text-m3-on-surface-variant mt-0.5">
                  Paste raw JSON array or CSV text, or check loaded dataset before committing to live inventory.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRunPreflightManual}
                disabled={!rawImportText.trim() || isAnalyzingPreflight}
                className="px-4 py-2 bg-m3-primary hover:bg-m3-primary/95 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Run Pre-Flight Inspection</span>
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-m3-primary tracking-wider block">Raw Data / Payload Preview</label>
              <textarea
                value={rawImportText}
                onChange={(e) => setRawImportText(e.target.value)}
                rows={5}
                placeholder="Paste raw JSON array or CSV text content here..."
                className="w-full bg-m3-surface-lowest border border-m3-outline-variant/30 focus:border-m3-primary p-3.5 text-xs font-mono text-m3-on-surface rounded-2xl focus:outline-none transition-colors"
              />
            </div>

            <PreflightReportCard
              report={preflightReport}
              isAnalyzing={isAnalyzingPreflight}
              onRunInspection={handleRunPreflightManual}
              onConfirmCommit={executeBulkImport}
              allowedToImport={allowedToImport}
            />
          </div>
        </div>
      )}

      {/* MODE 2: EXPORT & BACKUPS */}
      {migrationSubTab === 'export' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          {/* JSON Export Card */}
          <div className="bg-m3-surface p-6 rounded-2xl border border-m3-outline-variant/20 space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <h3 className="text-sm font-black text-m3-on-surface uppercase tracking-wider flex items-center gap-2">
                <Database className="h-4 w-4 text-m3-primary" />
                <span>Export Product Catalog (.JSON)</span>
              </h3>
              <p className="text-xs text-m3-on-surface-variant leading-relaxed">
                Download a complete, structured JSON backup of your active product listings and metadata suitable for cross-system database restores.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  const jsonStr = JSON.stringify(products, null, 2);
                  const filename = `tilepoint_catalog_export_${new Date().toISOString().slice(0, 10)}.json`;
                  saveFileToBackup(jsonStr, filename, "Inventory_Exports", "application/json")
                    .then((res) => {
                      showToast(`Product catalog JSON backup saved to ${res.path || filename}!`);
                    })
                    .catch(() => {
                      const blob = new Blob([jsonStr], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const downloadAnchor = document.createElement("a");
                      downloadAnchor.setAttribute("href", url);
                      downloadAnchor.setAttribute("download", filename);
                      document.body.appendChild(downloadAnchor);
                      downloadAnchor.click();
                      downloadAnchor.remove();
                      URL.revokeObjectURL(url);
                      showToast("Product catalog JSON backup downloaded!");
                    });
                }}
                className="w-full py-3 px-4 rounded-xl bg-m3-primary hover:bg-m3-primary/95 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-between shadow-md"
              >
                <span className="flex items-center gap-2"><Download className="h-4 w-4" /> Download JSON Backup</span>
                <span className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded-full">{branchProducts.length} Items</span>
              </button>
            </div>
          </div>

          {/* CSV Export Card */}
          <div className="bg-m3-surface p-6 rounded-2xl border border-m3-outline-variant/20 space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <h3 className="text-sm font-black text-m3-on-surface uppercase tracking-wider flex items-center gap-2">
                <Sliders className="h-4 w-4 text-emerald-500" />
                <span>Export Inventory CSV Spreadsheet</span>
              </h3>
              <p className="text-xs text-m3-on-surface-variant leading-relaxed">
                Export standard UTF-8 encoded CSV files compatible with Microsoft Excel, Google Sheets, or third-party POS/ERP accounting tools.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  const csvHeader = "ID,Product Code,Product Name,Category,Brand,Selling Price,Stock Quantity\n";
                  const csvRows = branchProducts.map(p => `"${p.id}","${p.productCode}","${p.productName}","${p.category}","${p.brand}",${p.sellingPrice},${p.stockQuantity}`).join("\n");
                  const csvContent = "\uFEFF" + csvHeader + csvRows;
                  const filename = `tilepoint_catalog_${new Date().toISOString().slice(0, 10)}.csv`;

                  saveFileToBackup(csvContent, filename, "Inventory_Exports", "text/csv;charset=utf-8;")
                    .then((res) => {
                      showToast(`Product catalog CSV exported to ${res.path || filename}!`);
                    })
                    .catch(() => {
                      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const downloadAnchor = document.createElement("a");
                      downloadAnchor.setAttribute("href", url);
                      downloadAnchor.setAttribute("download", filename);
                      document.body.appendChild(downloadAnchor);
                      downloadAnchor.click();
                      downloadAnchor.remove();
                      URL.revokeObjectURL(url);
                      showToast("Product catalog CSV exported!");
                    });
                }}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-between shadow-md"
              >
                <span className="flex items-center gap-2"><Download className="h-4 w-4" /> Download CSV Spreadsheet</span>
                <span className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded-full">.CSV Table</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )}

  {/* ---------------------------------------------------------------------- */}
  {/* SUB-TAB 6: BRANCH PRICE OVERRIDES */}
  {/* ---------------------------------------------------------------------- */}
  {activeSubTab === 'branch-prices' && (
    <div className="space-y-6 text-left animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-m3-surface-low p-5 rounded-[24px] border border-m3-outline-variant/20 shadow-sm">
        <div>
          <h2 className="text-base font-black text-m3-on-surface uppercase tracking-wider flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-m3-primary" />
            <span>Branch MSRP & SRP Pricing Overrides</span>
          </h2>
          <p className="text-xs text-m3-on-surface-variant font-medium mt-0.5">
            Configure custom branch selling prices or localized retail price markups for specific store locations.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-m3-outline-variant/20 bg-m3-surface shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-m3-surface-high/20 border-b border-m3-outline-variant/20 font-black text-m3-on-surface">
            <tr>
              <th className="py-3 px-4">Product Code / Name</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4 text-right">Central Base SRP</th>
              {branches.filter(b => !b.isDeleted && (isAdminUser || b.id === activeBranchId)).map(b => (
                <th key={b.id} className="py-3 px-4 text-center font-black text-m3-primary">
                  {b.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-m3-outline-variant/10 text-m3-on-surface/90">
            {branchProducts.slice(0, 30).map((p) => {
              return (
                <tr key={p.id} className="hover:bg-m3-surface-low/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-extrabold text-m3-on-surface">{p.productName}</div>
                    <div className="text-[10.5px] font-mono text-m3-on-surface-variant">{p.productCode}</div>
                  </td>
                  <td className="py-3 px-4 text-m3-on-surface-variant font-medium">
                    {p.category}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-m3-on-surface">
                    ₱{p.sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  {branches.filter(b => !b.isDeleted && (isAdminUser || b.id === activeBranchId)).map(b => {
                    const bsRec = branchStock.find(bs => bs.productId === p.id && bs.branchId === b.id);
                    const overridePrice = bsRec?.sellingPriceOverride ?? p.sellingPrice;

                    return (
                      <td key={b.id} className="py-3 px-4 text-center font-mono font-bold">
                        <span className="px-2.5 py-1 rounded-lg bg-m3-surface-low border border-m3-outline-variant/25 text-m3-primary">
                          ₱{overridePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  )}

  {/* CHEMICAL BATCH DETAIL MODAL */}
  {selectedBatchDetail && (() => {
    const b = selectedBatchDetail;
    const prod = products.find(p => p.id === b.productId);
    const pName = prod ? prod.productName : b.productName;
    const pCode = prod ? prod.productCode : b.productCode;
    const pUnit = prod?.unit || 'bags';
    const liveStatus = computeLiveBatchStatus(b.expiryDate);
    const branchName = branches.find(br => br.id === b.branchId)?.name || b.branchId;

    // Find supplier info from product
    const supplier = suppliers.find(s => s.id === prod?.supplierId);

    // Calculate days remaining or days past expiry
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDateObj = new Date(b.expiryDate);
    expDateObj.setHours(0, 0, 0, 0);
    const diffTime = expDateObj.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Branch stock for this product
    const currentBranchStock = branchStock.find(bs => bs.productId === b.productId && bs.branchId === b.branchId)?.quantity ?? prod?.stockQuantity ?? 0;

    const handleTriggerTransfer = () => {
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

    return (
      <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
        <div 
          className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm shadow-xl" 
          onClick={() => setSelectedBatchDetail(null)} 
        />
        <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[32px] border border-m3-outline-variant/30 p-6 z-30 shadow-2xl bg-m3-surface-low text-m3-on-surface text-left space-y-5">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b border-m3-outline-variant/15 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-m3-primary/10 text-m3-primary px-2.5 py-0.5 rounded-full border border-m3-primary/20">
                  Batch #{b.batchNumber}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wide border ${
                  liveStatus === "Expired"
                    ? "bg-rose-500/10 text-rose-500 border-rose-500/20 font-black animate-pulse"
                    : liveStatus === "Expiring Soon"
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                }`}>
                  {liveStatus}
                </span>
              </div>
              <h3 className="text-base font-black text-m3-on-surface leading-tight">
                {pName}
              </h3>
              <span className="text-xs font-mono font-bold text-m3-primary">
                Product Code: {pCode}
              </span>
            </div>
            <button 
              type="button" 
              onClick={() => setSelectedBatchDetail(null)} 
              className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1.5 rounded-full hover:bg-m3-surface-high transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            
            {/* Section 1: Quantity & Location */}
            <div className="bg-m3-surface p-4 rounded-2xl border border-m3-outline-variant/15 space-y-2.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-m3-primary block">
                Stock &amp; Allocation
              </span>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-1 border-b border-m3-outline-variant/10">
                  <span className="text-m3-on-surface-variant font-medium">Batch Quantity Remaining:</span>
                  <span className="font-mono font-black text-sm text-m3-primary">
                    {b.quantity} {pUnit}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-m3-outline-variant/10">
                  <span className="text-m3-on-surface-variant font-medium">Branch Location:</span>
                  <span className="font-extrabold text-m3-on-surface">
                    {branchName}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-m3-on-surface-variant font-medium">Total Branch Stock:</span>
                  <span className="font-mono font-bold text-m3-on-surface">
                    {currentBranchStock} {pUnit}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 2: Shelf-Life & Dates */}
            <div className="bg-m3-surface p-4 rounded-2xl border border-m3-outline-variant/15 space-y-2.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-m3-primary block">
                Manufacture &amp; Expiry
              </span>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-1 border-b border-m3-outline-variant/10">
                  <span className="text-m3-on-surface-variant font-medium">Manufacture Date:</span>
                  <span className="font-mono font-semibold text-m3-on-surface">
                    {b.manufactureDate}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-m3-outline-variant/10">
                  <span className="text-m3-on-surface-variant font-medium">Expiration Date:</span>
                  <span className="font-mono font-bold text-m3-on-surface">
                    {b.expiryDate}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-m3-on-surface-variant font-medium">Timeline Status:</span>
                  <span className={`font-mono font-bold ${
                    isNaN(diffDays) ? 'text-m3-on-surface-variant' : diffDays < 0 ? 'text-rose-500' : diffDays <= 30 ? 'text-amber-500' : 'text-emerald-500'
                  }`}>
                    {isNaN(diffDays)
                      ? "Unspecified / Lifetime"
                      : diffDays < 0 
                      ? `Expired ${Math.abs(diffDays)} days ago` 
                      : diffDays === 0 
                      ? `Expires today!` 
                      : `${diffDays} days remaining`}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 3: Supplier Information */}
            <div className="md:col-span-2 bg-m3-surface p-4 rounded-2xl border border-m3-outline-variant/15 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-m3-primary block">
                  Supplier &amp; Vendor Information
                </span>
                {prod?.brand && (
                  <span className="text-[9.5px] font-mono bg-m3-surface-high px-2 py-0.5 rounded text-m3-on-surface-variant font-bold">
                    Brand: {prod.brand}
                  </span>
                )}
              </div>
              
              {supplier ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[9px] text-m3-on-surface-variant uppercase tracking-wider block font-bold">Company Name</span>
                    <span className="font-bold text-m3-on-surface">{supplier.name}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-m3-on-surface-variant uppercase tracking-wider block font-bold">Contact Person</span>
                    <span className="font-semibold text-m3-on-surface">{supplier.contactPerson || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-m3-on-surface-variant uppercase tracking-wider block font-bold">Phone / Mobile</span>
                    <span className="font-mono text-m3-on-surface">{supplier.phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-m3-on-surface-variant uppercase tracking-wider block font-bold">Email Address</span>
                    <span className="font-mono text-m3-on-surface">{supplier.email || 'N/A'}</span>
                  </div>
                  {supplier.address && (
                    <div className="sm:col-span-2">
                      <span className="text-[9px] text-m3-on-surface-variant uppercase tracking-wider block font-bold">Business Address</span>
                      <span className="text-m3-on-surface text-[11px]">{supplier.address}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-m3-surface-low rounded-xl border border-dashed border-m3-outline-variant/20 text-[11px] text-m3-on-surface-variant leading-relaxed">
                  <p>
                    <strong>Supplier Note:</strong> No specific supplier record is linked to this product (Brand: <strong>{prod?.brand || 'Default Chemical Supplier'}</strong>).
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    You can assign a registered supplier to this product from the Catalog module edit page.
                  </p>
                </div>
              )}
            </div>

            {/* Section 4: Remarks / Log Notes */}
            <div className="md:col-span-2 bg-m3-surface p-4 rounded-2xl border border-m3-outline-variant/15 space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-m3-primary block">
                Batch Remarks &amp; ERP Notes
              </span>
              <p className="text-xs text-m3-on-surface-variant italic font-medium">
                {b.remarks || "No custom remarks recorded for this chemical stock batch entry."}
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-m3-outline-variant/15">
            <button
              type="button"
              onClick={() => setSelectedBatchDetail(null)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-m3-outline-variant/30 hover:bg-m3-surface-high text-m3-on-surface text-xs font-bold transition-all cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleTriggerTransfer}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-m3-primary hover:bg-m3-primary/90 text-m3-on-primary text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <ArrowRightLeft className="h-4 w-4" />
              <span>Trigger Stock Transfer</span>
            </button>
          </div>

        </div>
      </div>
    );
  })()}

 {/* REGISTER NEW BATCH MODAL */}
 {showAddBatchModal && (
 <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
 <div className="absolute inset-0 bg-gray-950/75 backdrop-blur-sm shadow-xl" onClick={() => setShowAddBatchModal(false)} />
 <form
 onSubmit={handleRegisterBatch}
 className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[32px] border border-m3-outline-variant/30 p-6 z-30 shadow-2xl bg-m3-surface-low text-m3-on-surface text-left space-y-4"
 >
 <div className="flex justify-between items-center border-b border-m3-outline-variant/15 pb-3">
 <h3 className="text-sm font-black text-m3-primary uppercase tracking-wider flex items-center gap-2">
 <Clock className="h-5 w-5 text-rose-500 animate-pulse" />
 <span>Register Chemical Stock Batch</span>
 </h3>
 <button type="button" onClick={() => setShowAddBatchModal(false)} className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1 rounded-full">
 <X className="h-4.5 w-4.5" />
 </button>
 </div>

 <div className="space-y-3 text-xs">
 {/* Product Selection */}
 <div className="space-y-1">
 <label className="font-extrabold text-m3-on-surface-variant uppercase tracking-wider text-[10px]">Select Catalog Product</label>
 <select
 value={batchFormProductId}
 onChange={e => {
 const val = e.target.value;
 setBatchFormProductId(val);
 const prod = products.find(p => p.id === val);
 if (prod) {
 if (prod.expirationDate) setBatchFormExpDate(prod.expirationDate);
 if (prod.stockQuantity) setBatchFormQty(prod.stockQuantity);
 if (!batchFormNo) setBatchFormNo(`B-${prod.productCode.replace(/[^A-Z0-9]/gi, '')}-${Date.now().toString().slice(-4)}`);
 }
 }}
 className="w-full bg-m3-surface-lowest border border-m3-outline-variant/30 focus:border-m3-primary px-3 py-2 text-xs focus:outline-none rounded-xl font-bold text-m3-on-surface"
 required
 >
 <option value="" disabled>Select a product...</option>
 {branchProducts.map(p => (
 <option key={p.id} value={p.id}>
 {p.productName} ({p.productCode}){p.hasExpiration ? ' - [⚠️ Expiry Tracked]' : ''}
 </option>
 ))}
 </select>
 {batchFormProductId && (() => {
 const selectedProductObj = products.find(p => p.id === batchFormProductId);
 if (selectedProductObj && !selectedProductObj.hasExpiration) {
 return (
 <div className="bg-amber-500/10 border border-amber-500/15 text-amber-600 dark:text-amber-400 p-2.5 rounded-xl text-[10.5px] leading-relaxed mt-1">
 <strong>Note:</strong> This product is configured as <strong>not having an expiration date</strong> in the catalog. If you are tracking a chemical material, consider editing the product details to enable "Expiry Tracked" status.
 </div>
 );
 }
 return null;
 })()}
 </div>

 {/* Batch Number & Quantity */}
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="font-extrabold text-m3-on-surface-variant uppercase tracking-wider text-[10px]">Batch / Lot #</label>
 <input
 type="text"
 required
 placeholder="e.g. B-260716X"
 value={batchFormNo}
 onChange={e => setBatchFormNo(e.target.value)}
 className="w-full bg-m3-surface-lowest border border-m3-outline-variant/30 focus:border-m3-primary px-3 py-2 text-xs focus:outline-none rounded-xl font-bold font-mono text-m3-on-surface"
 />
 </div>
 <div className="space-y-1">
 <label className="font-extrabold text-m3-on-surface-variant uppercase tracking-wider text-[10px]">Qty (Bags/Units)</label>
 <input
 type="number"
 required
 min={1}
 value={batchFormQty}
 onChange={e => setBatchFormQty(parseInt(e.target.value) || 0)}
 className="w-full bg-m3-surface-lowest border border-m3-outline-variant/30 focus:border-m3-primary px-3 py-2 text-xs focus:outline-none rounded-xl font-bold font-mono text-m3-on-surface"
 />
 </div>
 </div>

 {/* Mfg Date & Expiry Date */}
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="font-extrabold text-m3-on-surface-variant uppercase tracking-wider text-[10px]">Manufacture Date</label>
 <input
 type="date"
 required
 value={batchFormMfgDate}
 onChange={e => setBatchFormMfgDate(e.target.value)}
 className="w-full bg-m3-surface-lowest border border-m3-outline-variant/30 focus:border-m3-primary px-3 py-2 text-xs focus:outline-none rounded-xl font-bold font-mono text-m3-on-surface"
 />
 </div>
 <div className="space-y-1">
 <label className="font-extrabold text-m3-on-surface-variant uppercase tracking-wider text-[10px]">Expiry Date</label>
 <input
 type="date"
 required
 value={batchFormExpDate}
 onChange={e => setBatchFormExpDate(e.target.value)}
 className="w-full bg-m3-surface-lowest border border-m3-outline-variant/30 focus:border-m3-primary px-3 py-2 text-xs focus:outline-none rounded-xl font-bold font-mono text-m3-on-surface"
 />
 </div>
 </div>

 {/* Branch Assignment */}
 <div className="space-y-1">
 <label className="font-extrabold text-m3-on-surface-variant uppercase tracking-wider text-[10px]">Branch Allocation</label>
 {currentUser?.role === 'Admin' ? (
 <select
 value={batchFormBranchId}
 onChange={e => setBatchFormBranchId(e.target.value)}
 className="w-full bg-m3-surface-lowest border border-m3-outline-variant/30 focus:border-m3-primary px-3 py-2 text-xs focus:outline-none rounded-xl font-bold text-m3-on-surface"
 required
 >
 {branches.map(b => (
 <option key={b.id} value={b.id}>
 {b.name}
 </option>
 ))}
 </select>
 ) : (
 <div className="w-full bg-m3-surface-lowest/60 border border-m3-outline-variant/15 px-3 py-2 text-xs rounded-xl font-bold font-mono text-zinc-400">
 {branches.find(b => b.id === (currentUser?.branchAssignmentId || 'B1'))?.name || 'N/A'}
 </div>
 )}
 </div>

 {/* Remarks */}
 <div className="space-y-1">
 <label className="font-extrabold text-m3-on-surface-variant uppercase tracking-wider text-[10px]">Storage Notes / Remarks</label>
 <textarea
 rows={2}
 placeholder="Storage specifications, quality checks..."
 value={batchFormRemarks}
 onChange={e => setBatchFormRemarks(e.target.value)}
 className="w-full bg-m3-surface-lowest border border-m3-outline-variant/30 focus:border-m3-primary px-3 py-2 text-xs focus:outline-none rounded-xl font-medium text-m3-on-surface"
 />
 </div>
 </div>

 <div className="pt-4 flex justify-end gap-2 border-t border-m3-outline-variant/15">
 <button
 type="button"
 onClick={() => setShowAddBatchModal(false)}
 className="px-4 py-2 hover:bg-m3-outline-variant/10 text-m3-on-surface font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl hover:shadow-md transition-all cursor-pointer active:scale-95"
 >
 Log Batch Entry
 </button>
 </div>
 </form>
 </div>
 )}

 {/* QUICK SUPPLIER REGISTRATION MODAL */}
 {showQuickSupplierModal && (
 <div className="fixed inset-0 bg-transparent flex items-center justify-center z-[60] p-4 animate-fade-in">
 <div className="absolute inset-0 bg-gray-950/75 backdrop-blur-sm shadow-xl" onClick={() => setShowQuickSupplierModal(false)} />
 <form
 onSubmit={handleSaveQuickSupplier}
 className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[32px] border border-m3-outline-variant/30 p-6 z-50 shadow-2xl bg-m3-surface-low text-m3-on-surface text-left space-y-4"
 >
 <div className="flex justify-between items-center border-b border-m3-outline-variant/15 pb-3">
 <h3 className="text-sm font-black text-m3-primary uppercase tracking-wider flex items-center gap-2">
 <Building2 className="h-5 w-5" />
 <span>Quick Add New Supplier</span>
 </h3>
 <button type="button" onClick={() => setShowQuickSupplierModal(false)} className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1 rounded-full">
 <X className="h-4.5 w-4.5" />
 </button>
 </div>

 <p className="text-[10px] text-m3-on-surface-variant font-medium leading-normal bg-m3-primary/5 p-2 rounded-lg">
 This will register a new vendor profile in the database on-the-fly and link it directly to this product, without reloading your catalog form.
 </p>

 <div className="space-y-3 pt-1">
 <div className="space-y-1">
 <label className="text-[9px] font-bold text-m3-on-surface-variant uppercase pl-0.5">Supplier Company Name *</label>
 <input
 type="text"
 required
 value={quickSupName}
 onChange={e => setQuickSupName(e.target.value)}
 placeholder="e.g. Asia Pacific Ceramics Inc."
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-bold"
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="text-[9px] font-bold text-m3-on-surface-variant uppercase pl-0.5">Primary Contact Agent</label>
 <input
 type="text"
 value={quickSupContact}
 onChange={e => setQuickSupContact(e.target.value)}
 placeholder="e.g. Matthew Lim"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-bold text-m3-on-surface-variant uppercase pl-0.5">Contact Phone</label>
 <input
 type="text"
 value={quickSupPhone}
 onChange={e => setQuickSupPhone(e.target.value)}
 placeholder="e.g. +63 2 8111 2222"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono"
 />
 </div>
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-bold text-m3-on-surface-variant uppercase pl-0.5">Corporate Email</label>
 <input
 type="email"
 value={quickSupEmail}
 onChange={e => setQuickSupEmail(e.target.value)}
 placeholder="e.g. contact@asiapacific.ph"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-bold text-m3-on-surface-variant uppercase pl-0.5">Office Address</label>
 <input
 type="text"
 value={quickSupAddress}
 onChange={e => setQuickSupAddress(e.target.value)}
 placeholder="e.g. 15th Flr, Pacific Star Bldg, Makati City"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md"
 />
 </div>
 </div>

 <div className="flex justify-end gap-2 border-t border-m3-outline-variant/15 pt-4">
 <button
 type="button"
 onClick={() => setShowQuickSupplierModal(false)}
 className="px-4 py-2 text-xs font-black uppercase tracking-wider rounded-full hover:bg-m3-outline-variant/15 text-m3-on-surface-variant transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="m3-btn-primary px-5 py-2 text-xs shadow-md border"
 >
 Save Supplier
 </button>
 </div>
 </form>
 </div>
 )}

 {/* MODAL 1: ADD & EDIT PRODUCT DIALOG */}
 {showModal && (
 <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
 <div className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm shadow-xl" onClick={handleCloseProductModal} />
 <form
 onSubmit={handleSubmit}
 className="relative w-full max-w-4xl rounded-[32px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface flex flex-col gap-5 text-left overflow-y-auto max-h-[90vh]"
 >
 {/* Modal Title Header */}
 <div className="flex items-center justify-between border-b border-m3-outline-variant/15 pb-4">
 <h3 className="text-base font-black text-m3-primary uppercase tracking-wider flex items-center gap-2">
 <Layers className="h-5 w-5" />
 <span>{isEditMode ? 'Modify Product Specifications' : 'Register New Hardware Inventory Unit'}</span>
 </h3>
 <button type="button" onClick={handleCloseProductModal} className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1.5 hover:bg-m3-outline-variant/15 rounded-full transition-all">
 <X className="h-5 w-5" />
 </button>
 </div>

 <div className="space-y-6">
 {/* SECTION 1: GENERAL SPECIFICATIONS */}
 <div className="p-4 rounded-2xl bg-m3-surface-lowest/40 border border-m3-outline-variant/20 space-y-4">
 <div className="flex items-center gap-2 border-b border-m3-outline-variant/10 pb-2 mb-1">
 <Package className="h-4 w-4 text-m3-primary" />
 <span className="text-xs font-black uppercase tracking-wider text-m3-primary">1. General Product Identification</span>
 </div>
 
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="space-y-1 relative">
 <label className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest pl-1 select-none">Product Core Code</label>
 <input
 type="text"
 required
 value={productCode}
 onChange={e => setProductCode(e.target.value)}
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono font-bold"
 />
 </div>

 <div className="space-y-1 relative">
 <label className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest pl-1 select-none">Warehouse SKU ID</label>
 <input
 type="text"
 required
 value={sku}
 onChange={e => setSku(e.target.value)}
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono font-bold"
 />
 </div>

 <div className="space-y-1 relative">
 <label className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest pl-1 select-none">Barcode Sequence ID</label>
 <input
 type="text"
 required
 value={barcode}
 onChange={e => setBarcode(e.target.value)}
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono font-bold"
 />
 </div>

 <div className="space-y-1 relative">
 <label className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest pl-1 select-none">Category Classification</label>
 <select
 value={category}
 onChange={e => setCategory(e.target.value)}
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2.5 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md cursor-pointer font-bold"
 >
 {categories.map((cat, i) => (
 <option key={i} value={cat}>{cat}</option>
 ))}
 </select>
 </div>

 <div className="space-y-1 relative">
 <label className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest pl-1 select-none">Corporate Brand / Label</label>
 <input
 type="text"
 required
 value={brand}
 onChange={e => setBrand(e.target.value)}
 placeholder="e.g. Mariwasa Siam"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-bold"
 />
 </div>

 <div className="space-y-1 relative">
 <label className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest pl-1 select-none">Tile Design Name (Optional)</label>
 <input
 type="text"
 value={designName}
 onChange={e => setDesignName(e.target.value)}
 placeholder="e.g. Travertine Matte"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-bold"
 />
 </div>

 <div className="space-y-1 md:col-span-3 relative">
 <label className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest pl-1 select-none">Product Full Descriptive Name</label>
 <input
 type="text"
 required
 value={productName}
 onChange={e => setProductName(e.target.value)}
 placeholder="e.g. Carrara White Porcelain Floor Tile"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-sans font-black text-sm"
 />
 </div>
 </div>
 </div>

 {/* SECTION 2: PHYSICAL SPECS & PACKAGING */}
 <div className="p-4 rounded-2xl bg-m3-surface-lowest/40 border border-m3-outline-variant/20 space-y-4">
 <div className="flex items-center gap-2 border-b border-m3-outline-variant/10 pb-2 mb-1">
 <Layers className="h-4 w-4 text-m3-primary" />
 <span className="text-xs font-black uppercase tracking-wider text-m3-primary">2. Physical Attributes & Packaging</span>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div className="space-y-1 relative">
 <label className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest pl-1 select-none">Trading Unit</label>
 <input
 type="text"
 required
 value={unit}
 onChange={e => setUnit(e.target.value)}
 placeholder="Box / Piece / Bag"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-bold"
 />
 </div>

 <div className="space-y-1 relative">
 <label className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest pl-1 select-none">Dimensions</label>
 <input
 type="text"
 required
 value={size}
 onChange={e => setSize(e.target.value)}
 placeholder="e.g. 60x60 cm"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-bold font-mono"
 />
 </div>

 <div className="space-y-1 relative">
 <label className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest pl-1 select-none">Tiles Per Box</label>
 <input
 type="number"
 required
 value={boxQuantity}
 onChange={e => setBoxQuantity(Number(e.target.value))}
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono font-bold"
 />
 </div>

 <div className="space-y-1 relative">
 <label className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest pl-1 select-none flex items-center justify-between gap-1">
 <span>Coverage (m²)</span>
 {category.toLowerCase().includes('tile') && (
 <span className="text-[8px] text-emerald-500 font-extrabold normal-case bg-emerald-500/5 border border-emerald-500/10 px-1 rounded tracking-normal">Calculated</span>
 )}
 </label>
 <input
 type="number"
 step="0.001"
 required
 value={coveragePerBox}
 onChange={e => setCoveragePerBox(Number(e.target.value))}
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono font-bold"
 />
 </div>
 </div>
 </div>

 {/* SECTION 3: SOURCING & SUPPLIER */}
 <div className="p-4 rounded-2xl bg-m3-surface-lowest/40 border border-m3-outline-variant/20 space-y-4">
 <div className="flex items-center gap-2 border-b border-m3-outline-variant/10 pb-2 mb-1">
 <Building2 className="h-4 w-4 text-m3-primary" />
 <span className="text-xs font-black uppercase tracking-wider text-m3-primary">3. Wholesaler Supplier & Sourcing</span>
 </div>

 <div className="space-y-3 relative">
 <div className="flex items-center justify-between">
 <label className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest select-none">Supplier Source Link</label>
 {!isEditMode && (
 <label className="flex items-center gap-1.5 cursor-pointer text-[10.5px] font-bold text-m3-tertiary select-none">
 <input
 type="checkbox"
 checked={isRegisteringNewSupplier}
 onChange={e => setIsRegisteringNewSupplier(e.target.checked)}
 className="rounded text-m3-tertiary focus:ring-m3-tertiary"
 />
 <span>Register Brand New Supplier</span>
 </label>
 )}
 </div>

 {!isRegisteringNewSupplier ? (
 <div className="flex gap-2 items-center">
 <select
 value={supplierId}
 onChange={e => setSupplierId(e.target.value)}
 className="flex-1 bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md cursor-pointer font-bold"
 >
 {suppliers.filter(s => !s.isDeleted).map((sup) => (
 <option key={sup.id} value={sup.id}>{sup.name}</option>
 ))}
 </select>
 <button
 type="button"
 onClick={() => setShowQuickSupplierModal(true)}
 className="px-3 py-2 bg-m3-tertiary/15 hover:bg-m3-tertiary/25 text-m3-tertiary rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 border border-m3-tertiary/20"
 title="Quickly register a new supplier on-the-fly"
 >
 <Plus className="h-3.5 w-3.5" /> Quick Add
 </button>
 </div>
 ) : (
 <div className="space-y-3 pt-1">
 <p className="text-[10px] text-m3-on-surface-variant font-medium leading-normal bg-m3-primary/5 p-2 rounded-lg">
 This will register a new vendor profile in the database and automatically link it to this product.
 </p>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="text-[9px] font-bold text-m3-on-surface-variant uppercase pl-0.5">Supplier Company Name *</label>
 <input
 type="text"
 required={isRegisteringNewSupplier}
 value={newSupplierName}
 onChange={e => setNewSupplierName(e.target.value)}
 placeholder="e.g. Asia Pacific Ceramics Inc."
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-2 py-1.5 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-bold"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-bold text-m3-on-surface-variant uppercase pl-0.5">Primary Contact Agent</label>
 <input
 type="text"
 value={newSupplierContact}
 onChange={e => setNewSupplierContact(e.target.value)}
 placeholder="e.g. Matthew Lim"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-2 py-1.5 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="text-[9px] font-bold text-m3-on-surface-variant uppercase pl-0.5">Contact Phone</label>
 <input
 type="text"
 value={newSupplierPhone}
 onChange={e => setNewSupplierPhone(e.target.value)}
 placeholder="e.g. +63 2 8111 2222"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-2 py-1.5 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-bold text-m3-on-surface-variant uppercase pl-0.5">Corporate Email</label>
 <input
 type="email"
 value={newSupplierEmail}
 onChange={e => setNewSupplierEmail(e.target.value)}
 placeholder="e.g. contact@asiapacific.ph"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-2 py-1.5 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md"
 />
 </div>
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-bold text-m3-on-surface-variant uppercase pl-0.5">Office Address</label>
 <input
 type="text"
 value={newSupplierAddress}
 onChange={e => setNewSupplierAddress(e.target.value)}
 placeholder="e.g. 15th Flr, Pacific Star Bldg, Makati City"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-2 py-1.5 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md"
 />
 </div>
 </div>
 )}
 </div>
 </div>

 {/* SECTION 4: FINANCIAL DETAILS */}
 <div className="p-4 rounded-2xl bg-m3-surface-lowest/40 border border-m3-outline-variant/20 space-y-4">
 <div className="flex items-center gap-2 border-b border-m3-outline-variant/10 pb-2 mb-1">
 <DollarSign className="h-4 w-4 text-m3-primary" />
 <span className="text-xs font-black uppercase tracking-wider text-m3-primary">4. Pricing, Markups & Tax</span>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="space-y-1 relative pl-0">
 <label className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest pl-1 select-none">Cost Price (₱)</label>
 <input
 type="number"
 step="0.1"
 required
 value={costPrice}
 onChange={e => handleCostPriceChange(Number(e.target.value))}
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono font-bold"
 />
 </div>

 <div className="space-y-1 relative pl-0">
 <label className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest pl-1 select-none">Markup (%)</label>
 <input
 type="number"
 step="0.1"
 required
 value={markupPercent}
 onChange={e => handleMarkupChange(Number(e.target.value))}
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono font-bold"
 />
 </div>

 <div className="space-y-1 relative pl-0">
 <label className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest pl-1 select-none">Selling Price (Retail ₱)</label>
 <input
 type="number"
 step="0.1"
 required
 value={sellingPrice}
 onChange={e => handleSellingPriceChange(Number(e.target.value))}
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono font-black text-m3-primary"
 />
 </div>

 <div className="space-y-1 relative pl-0">
 <label className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest pl-1 select-none">VAT Taxation Type</label>
 <select
 value={taxType}
 onChange={e => setTaxType(e.target.value)}
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-bold cursor-pointer"
 >
 <option value="12% VAT">Standard 12% VAT</option>
 <option value="VAT Exempt">VAT Exempt</option>
 <option value="Zero Rated">Zero Rated (0% VAT)</option>
 </select>
 </div>
 </div>
 </div>

 {/* SECTION 5: STOCK LEVELS & EXPIRATION */}
 <div className="p-4 rounded-2xl bg-m3-surface-lowest/40 border border-m3-outline-variant/20 space-y-4">
 <div className="flex items-center gap-2 border-b border-m3-outline-variant/10 pb-2 mb-1">
 <Sliders className="h-4 w-4 text-m3-primary" />
 <span className="text-xs font-black uppercase tracking-wider text-m3-primary">5. Stock Control & Limits</span>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="space-y-1 relative pl-0 md:col-span-3 bg-m3-surface-lowest p-3 rounded-2xl border border-m3-outline-variant/30">
 <div className="flex items-center justify-between mb-1">
 <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none flex items-center gap-1.5">
 <MapPin className="h-3.5 w-3.5" />
 <span>Assigned Branch / Stock Location</span>
 </label>
 {currentUser?.role !== UserRole.ADMIN && (
 <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-m3-primary/10 text-m3-primary border border-m3-primary/20">
 {branches.find(b => b.id === (currentUser?.branchAssignmentId || 'B1'))?.name || `Branch ${currentUser?.branchAssignmentId}`}
 </span>
 )}
 </div>
 {currentUser?.role === UserRole.ADMIN ? (
 <select
 value={targetBranchId}
 onChange={e => {
 setTargetBranchId(e.target.value);
 setOrigin(e.target.value);
 }}
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs font-bold text-m3-on-surface focus:outline-none transition-colors rounded-t-md cursor-pointer"
 >
 {branches.filter(b => !b.isDeleted).map(b => (
 <option key={b.id} value={b.id}>
 {b.name} ({b.id}) - {b.address}
 </option>
 ))}
 </select>
 ) : (
 <div className="px-3 py-2 text-xs font-bold text-m3-on-surface bg-m3-surface-low rounded-lg border border-m3-outline-variant/20 flex items-center justify-between">
 <span>{branches.find(b => b.id === (currentUser?.branchAssignmentId || 'B1'))?.name || currentUser?.branchAssignmentId}</span>
 <span className="text-[10px] font-mono font-bold text-m3-tertiary">ID: {currentUser?.branchAssignmentId || 'B1'}</span>
 </div>
 )}
 </div>

 <div className="space-y-1 relative pl-0">
 <label className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest pl-1 select-none">Initial Warehouse Stock</label>
 <input
 type="number"
 required
 value={stockQuantity}
 onChange={e => setStockQuantity(Number(e.target.value))}
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono font-bold"
 />
 </div>

 <div className="space-y-1 relative pl-0">
 <label className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest pl-1 select-none">Alert Stock Limit</label>
 <input
 type="number"
 required
 value={minimumStock}
 onChange={e => setMinimumStock(Number(e.target.value))}
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono font-bold"
 />
 </div>

 <div className="space-y-1 relative pl-0 bg-m3-surface-lowest p-3 rounded-2xl border border-m3-outline-variant/30 flex flex-col justify-between">
 <div>
 <label className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest pl-1 select-none block">Shelf-Life Expiration</label>
 <span className="text-[9px] text-m3-on-surface-variant font-medium pl-1 select-none block mt-0.5 leading-snug">Requires expiration date?</span>
 </div>
 <div className="flex items-center gap-2 mt-2">
 <button
 type="button"
 onClick={() => setHasExpiration(true)}
 className={`flex-1 py-1.5 px-3 rounded-xl border text-[11px] font-bold transition-all text-center cursor-pointer ${
 hasExpiration 
 ? 'bg-amber-500/10 border-amber-500 text-amber-500 font-extrabold shadow-xs' 
 : 'bg-m3-surface-low border-m3-outline-variant/30 text-m3-on-surface-variant'
 }`}
 >
 Yes, Has Expiry
 </button>
 <button
 type="button"
 onClick={() => setHasExpiration(false)}
 className={`flex-1 py-1.5 px-3 rounded-xl border text-[11px] font-bold transition-all text-center cursor-pointer ${
 !hasExpiration 
 ? 'bg-m3-primary/10 border-m3-primary text-m3-primary font-extrabold shadow-xs' 
 : 'bg-m3-surface-low border-m3-outline-variant/30 text-m3-on-surface-variant'
 }`}
 >
 No Expiry Date
 </button>
 </div>
 </div>

 {hasExpiration && (
 <div className="space-y-1 relative pl-0 md:col-span-3 bg-amber-500/5 p-4 rounded-2xl border border-amber-500/20 animate-fade-in mt-2 flex flex-col gap-2">
 <div className="flex items-center gap-1.5 text-amber-500">
 <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
 <span className="text-xs font-black uppercase tracking-wider">Specify Product Expiration Date</span>
 </div>
 <p className="text-[10px] text-m3-on-surface-variant leading-relaxed">
 Set the standard expiration date of this product catalog listing. The system will flag this item in the catalog table if it is expiring or expired.
 </p>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
 <div className="space-y-1">
 <label className="text-[9px] font-extrabold text-m3-on-surface-variant uppercase pl-0.5">Catalog Expiry Date *</label>
 <input
 type="date"
 required={hasExpiration}
 value={expirationDate}
 onChange={e => setExpirationDate(e.target.value)}
 className="w-full bg-white dark:bg-[#131A22] border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono font-bold cursor-pointer"
 />
 </div>
 <div className="bg-m3-surface-low/50 p-2.5 rounded-xl border border-m3-outline-variant/10 text-[10px] text-m3-on-surface-variant flex flex-col justify-center">
 <div className="font-bold text-amber-600 dark:text-amber-400">⚠️ Active Expiry Flagging</div>
 <div>Items with active expirations are automatically tracked and marked on sales invoices, and listed on the central Expiry Calendar.</div>
 </div>
 </div>
 </div>
 )}

 <div className="space-y-1 relative md:col-span-3">
 <label className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest pl-1 select-none">Acquired From / Stock Source</label>
 <input
 type="text"
 value={origin}
 onChange={e => setOrigin(e.target.value)}
 placeholder="e.g. Main Cebu Yard, China Lot B-12, Local Consignment Importer"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-sans font-bold"
 />
 </div>
 </div>
 </div>
 </div>

 {/* Command Save Button Footer */}
 <div className="flex justify-end gap-2 border-t border-m3-outline-variant/15 pt-4">
 <button
 type="button"
 onClick={handleCloseProductModal}
 className="px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-full hover:bg-m3-outline-variant/15 text-m3-on-surface-variant transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="m3-btn-primary px-6 py-2.5 text-xs shadow-md animate-scale-up border"
 >
 Validate & Save Product
 </button>
 </div>
 </form>
 </div>
 )}

 {/* MODAL 2: MANUAL STOCK ADJUSTMENT DIALOG */}
 {showAdjustModal && (
 <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
 <div className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm shadow-xl" onClick={() => setShowAdjustModal(false)} />
 <form
 onSubmit={handleAdjustSubmit}
 className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[32px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface text-left space-y-4"
 >
 <div className="flex justify-between items-center border-b border-m3-outline-variant/15 pb-3">
 <h3 className="text-sm font-black text-m3-primary uppercase tracking-wider flex items-center gap-2">
 <Sliders className="h-5 w-5" />
 <span>Manual Stock Correction</span>
 </h3>
 <button type="button" onClick={() => setShowAdjustModal(false)} className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1 rounded-full">
 <X className="h-4.5 w-4.5" />
 </button>
 </div>

 <div>
 <span className="text-[10px] text-m3-on-surface-variant font-bold uppercase tracking-wider block mb-0.5 select-none">Adjusting Product</span>
 <strong className="text-xs text-m3-on-surface font-extrabold max-w-[300px] truncate block">{adjustProductName}</strong>
 </div>

 {/* Adjust Type segment */}
 <div className="space-y-1.5">
 <span className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-0.5 block select-none">Adjustment Type</span>
 <div className="grid grid-cols-2 gap-2">
 <button
 type="button"
 onClick={() => setAdjustType('ADD')}
 className={`py-2 px-3.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 mt-1 transition-all ${
 adjustType === 'ADD' 
 ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 font-extrabold shadow-sm' 
 : 'bg-m3-surface-lowest border-m3-outline-variant/35 text-m3-on-surface-variant'
 }`}
 >
 <Plus className="h-4 w-4 shrink-0" />
 <span>Receive Quantity (+)</span>
 </button>
 <button
 type="button"
 onClick={() => setAdjustType('SUB')}
 className={`py-2 px-3.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 mt-1 transition-all ${
 adjustType === 'SUB' 
 ? 'bg-rose-500/15 border-rose-500 text-rose-500 font-extrabold shadow-sm' 
 : 'bg-m3-surface-lowest border-m3-outline-variant/35 text-m3-on-surface-variant'
 }`}
 >
 <Trash2 className="h-3.5 w-3.5 shrink-0" />
 <span>Deduct Quantity (-)</span>
 </button>
 </div>
 </div>

 {/* Adjust Value input */}
 <div className="space-y-1 relative">
 <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Quantity Delta count</label>
 <input
 type="number"
 required
 min={1}
 value={adjustVal}
 onChange={e => setAdjustVal(Math.max(1, Number(e.target.value)))}
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono font-bold"
 />
 </div>

 {/* Adjust Reason log detail */}
 <div className="space-y-1 relative">
 <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Adjustment Reason / Notes</label>
 <textarea
 required
 rows={3}
 value={adjustReason}
 onChange={e => setAdjustReason(e.target.value)}
 placeholder="e.g. Audit variance, broken box count, tile sample pull..."
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-sans italic"
 />
 </div>

 <div className="flex justify-end gap-2 border-t border-m3-outline-variant/15 pt-4">
 <button
 type="button"
 onClick={() => setShowAdjustModal(false)}
 className="px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-full hover:bg-m3-outline-variant/15 text-m3-on-surface-variant transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="m3-btn-primary px-5 py-2.5 text-xs shadow-md border"
 >
 Execute Stock Correction
 </button>
 </div>
 </form>
 </div>
 )}

 {/* MODAL: MANUAL STOCK LEDGER ENTRY DIALOG */}
 {showManualLedgerModal && (
 <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
 <div className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm shadow-xl" onClick={() => setShowManualLedgerModal(false)} />
 <form
 onSubmit={handleManualLedgerSubmit}
 className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[32px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface text-left space-y-4"
 >
 <div className="flex justify-between items-center border-b border-m3-outline-variant/15 pb-3">
 <h3 className="text-sm font-black text-m3-primary uppercase tracking-wider flex items-center gap-2">
 <Sliders className="h-5 w-5" />
 <span>Insert Manual Stock Ledger Entry</span>
 </h3>
 <button type="button" onClick={() => setShowManualLedgerModal(false)} className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1 rounded-full border-0 bg-transparent">
 <X className="h-4.5 w-4.5" />
 </button>
 </div>

 <p className="text-xs text-m3-on-surface-variant font-medium">
 Create a custom movement to adjust both physical multi-branch inventory tracking registers and cumulative catalog quantities instantly.
 </p>

 {/* Product selection dropdown */}
 <div className="space-y-1">
 <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Select Catalogue Tile</label>
 <select
 required
 value={manualLedgerProductId}
 onChange={e => setManualLedgerProductId(e.target.value)}
 className="w-full bg-m3-surface-lowest border border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface rounded-xl focus:outline-none transition-colors font-sans"
 >
 <option value="" disabled>-- Choose a product --</option>
 {branchProducts.map(p => (
 <option key={p.id} value={p.id}>
 {p.productName} ({p.sku || p.id.slice(-6)}) - Current Qty: {p.stockQuantity}
 </option>
 ))}
 </select>
 </div>

 {/* Grid for parameters */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {/* Branch Yard selector */}
 <div className="space-y-1">
 <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Impacted Yard / Branch</label>
 {currentUser?.role === 'Admin' ? (
 <select
 required
 value={manualLedgerBranchId}
 onChange={e => setManualLedgerBranchId(e.target.value)}
 className="w-full bg-m3-surface-lowest border border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface rounded-xl focus:outline-none transition-colors font-sans"
 >
 {branches.map(b => (
 <option key={b.id} value={b.id}>{b.name}</option>
 ))}
 </select>
 ) : (
 <div className="w-full bg-m3-surface-lowest/60 border border-m3-outline-variant/30 px-3 py-2 text-xs rounded-xl font-bold font-mono text-zinc-400">
 {branches.find(b => b.id === (currentUser?.branchAssignmentId || 'B1'))?.name || 'N/A'}
 </div>
 )}
 </div>

 {/* Movement Type */}
 <div className="space-y-1">
 <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Movement Ledger Type</label>
 <select
 required
 value={manualLedgerType}
 onChange={e => setManualLedgerType(e.target.value as any)}
 className="w-full bg-m3-surface-lowest border border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface rounded-xl focus:outline-none transition-colors font-sans font-bold"
 >
 <option value="ADJUST">ADJUST (Signed variance +/-)</option>
 <option value="IN">IN (Receive to stock +)</option>
 <option value="OUT">OUT (Issue out / breakages -)</option>
 <option value="PURCHASE">PURCHASE (Direct replenishment +)</option>
 <option value="SALE">SALE (Floor sale issue out -)</option>
 <option value="TRANSFER">TRANSFER (Signed Inter-branch +/-)</option>
 </select>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {/* Quantity */}
 <div className="space-y-1">
 <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Quantity Delta count</label>
 <input
 type="number"
 required
 min={1}
 value={manualLedgerQty}
 onChange={e => setManualLedgerQty(Math.max(1, Number(e.target.value)))}
 className="w-full bg-m3-surface-lowest border border-m3-outline-variant/35 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-xl font-mono font-bold"
 />
 <span className="text-[9px] text-zinc-400 font-mono italic block pt-0.5 pl-1">
 Note: IN/PURCHASE adds. OUT/SALE subtracts automatically.
 </span>
 </div>

 {/* Reference No */}
 <div className="space-y-1">
 <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Reference Code / Ticket ID</label>
 <input
 type="text"
 required
 placeholder="e.g. TKT-YRD-2092"
 value={manualLedgerRefNo}
 onChange={e => setManualLedgerRefNo(e.target.value)}
 className="w-full bg-m3-surface-lowest border border-m3-outline-variant/35 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-xl font-mono font-bold"
 />
 </div>
 </div>

 {/* Remarks / Reason */}
 <div className="space-y-1">
 <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Audit Sign-off Remarks</label>
 <textarea
 required
 rows={3}
 placeholder="Describe why this entry is being manually added (e.g., Audit mismatch on Cebu yard, physical breakage during transport, showroom sample allocation...)"
 value={manualLedgerRemarks}
 onChange={e => setManualLedgerRemarks(e.target.value)}
 className="w-full bg-m3-surface-lowest border border-m3-outline-variant/35 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-xl font-sans italic"
 />
 </div>

 <div className="flex justify-end gap-2 border-t border-m3-outline-variant/15 pt-4">
 <button
 type="button"
 onClick={() => setShowManualLedgerModal(false)}
 className="px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-full hover:bg-m3-outline-variant/15 text-m3-on-surface-variant transition-colors border-0 bg-transparent cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="m3-btn-primary px-5 py-2.5 text-xs shadow-md border cursor-pointer font-black uppercase tracking-wider"
 >
 Apply Ledger Movement
 </button>
 </div>
 </form>
 </div>
 )}

 {/* MODAL 3: BARCODE & QR CODES VIEWER / PRINT DIALOG */}
 {showCodesModal && codesProduct && (
 <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
 <div className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm shadow-xl" onClick={() => setShowCodesModal(false)} />
 <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[32px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface text-center space-y-5">
 
 <div className="flex justify-between items-center border-b border-m3-outline-variant/15 pb-2.5 text-left">
 <h3 className="text-sm font-black text-m3-primary uppercase tracking-wide flex items-center gap-1.5">
 <QrCode className="h-5 w-5" /> Code & Barcode Terminal Label
 </h3>
 <button type="button" onClick={() => setShowCodesModal(false)} className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1 rounded-full">
 <X className="h-4.5 w-4.5" />
 </button>
 </div>

 {/* Product specifications context summary */}
 <div className="text-left bg-m3-surface-lowest p-4 rounded-2xl border border-m3-outline-variant/15 space-y-3">
 <div>
 <div className="text-[9px] text-m3-primary/95 font-black uppercase tracking-wider">{codesProduct.category}</div>
 <strong className="text-sm text-m3-on-surface block font-extrabold leading-tight mt-0.5">{codesProduct.productName}</strong>
 <p className="text-[10px] text-zinc-400 mt-1">Brand: <span className="font-semibold text-zinc-350">{codesProduct.brand || 'TilePoint'}</span> • Design: <span className="font-semibold text-zinc-350">{codesProduct.designName || 'N/A'}</span></p>
 </div>

 <div className="grid grid-cols-2 gap-2 border-t border-m3-outline-variant/15 pt-2.5 text-[10px] font-mono text-zinc-350">
 <div 
 className="bg-m3-surface-low p-2 rounded-xl border border-m3-outline-variant/10 hover:border-m3-primary/50 transition-colors cursor-pointer group rel"
 onClick={() => {
 navigator.clipboard.writeText(codesProduct.sku);
 showToast(`SKU ${codesProduct.sku} copied to clipboard!`);
 }}
 title="Click to copy SKU"
 >
 <div className="flex justify-between items-center mb-0.5">
 <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-extrabold font-sans">Product SKU</span>
 <span className="text-[7.5px] text-m3-primary opacity-0 group-hover:opacity-100 transition-opacity font-bold font-sans">COPY</span>
 </div>
 <span className="font-bold text-m3-primary text-[11px] block truncate">{codesProduct.sku}</span>
 </div>

 <div className="bg-m3-surface-low p-2 rounded-xl border border-m3-outline-variant/10">
 <span className="block text-[8px] uppercase tracking-wider text-zinc-500 font-extrabold font-sans mb-0.5">Dimension (Size)</span>
 <span className="font-bold text-white text-[11px] block truncate">{codesProduct.size || 'N/A'}</span>
 </div>

 <div 
 className="bg-m3-surface-low p-2 rounded-xl border border-m3-outline-variant/10 hover:border-m3-primary/50 transition-colors cursor-pointer group rel"
 onClick={() => {
 navigator.clipboard.writeText(codesProduct.productCode);
 showToast(`Product Code ${codesProduct.productCode} copied to clipboard!`);
 }}
 title="Click to copy Product Code"
 >
 <div className="flex justify-between items-center mb-0.5">
 <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-extrabold font-sans">Product Code</span>
 <span className="text-[7.5px] text-m3-primary opacity-0 group-hover:opacity-100 transition-opacity font-bold font-sans">COPY</span>
 </div>
 <span className="font-bold text-white text-[11px] block truncate">{codesProduct.productCode}</span>
 </div>

 <div className="bg-m3-surface-low p-2 rounded-xl border border-m3-outline-variant/10">
 <span className="block text-[8px] uppercase tracking-wider text-zinc-500 font-extrabold font-sans mb-0.5">Box Quantity</span>
 <span className="font-bold text-white text-[11px] block truncate">{codesProduct.boxQuantity} Tiles</span>
 </div>
 </div>
 </div>

 {/* Visual barcode and QR layout */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-1.5 flex flex-col items-center">
 <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1">
 <Barcode className="h-3.5 w-3.5 text-m3-primary" /> Barcode label
 </span>
 <StyledBarcode code={codesProduct.barcode} />
 </div>

 <div className="space-y-1.5 flex flex-col items-center">
 <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1 animate-scale-up">
 <QrCode className="h-3.5 w-3.5 text-m3-primary" /> QR Label Tag
 </span>
 <StyledQrCode code={codesProduct.qrCode} />
 </div>
 </div>

 {/* Print action buttons */}
 <div className="flex flex-col gap-2 pt-2.5">
 <button
 type="button"
 onClick={handleSimulatePrint}
 disabled={printingCode}
 className="w-full flex items-center justify-center gap-2 py-3 border border-zinc-200/20 dark:border-zinc-700/50 hover:bg-m3-primary hover:text-white bg-m3-surface-lowest rounded-2xl text-xs font-black uppercase tracking-wider transition-all"
 >
 <Printer className="h-4 w-4 shrink-0" />
 <span>{printingCode ? 'Smart Spooling...' : 'Print Scannable Label'}</span>
 </button>

 <div className="flex gap-2">
 <button
 type="button"
 onClick={() => {
 navigator.clipboard.writeText(codesProduct.barcode);
 showToast(`Barcode ${codesProduct.barcode} copied to clipboard!`);
 }}
 className="flex-1 text-center text-[10px] font-black uppercase tracking-wider py-2 bg-m3-surface-lowest hover:bg-m3-outline-variant/10 text-m3-primary rounded-xl transition-all border border-m3-outline-variant/10"
 >
 Copy Barcode Raw
 </button>
 <button
 type="button"
 onClick={() => {
 navigator.clipboard.writeText(codesProduct.qrCode);
 showToast(`QR URL payload copied!`);
 }}
 className="flex-1 text-center text-[10px] font-black uppercase tracking-wider py-2 bg-m3-surface-lowest hover:bg-m3-outline-variant/10 text-zinc-300 rounded-xl transition-all border border-m3-outline-variant/10"
 >
 Copy QR Data
 </button>
 </div>

 <div className="text-[9px] text-zinc-500 font-medium leading-normal bg-m3-surface-lowest p-2 rounded-xl border border-m3-outline-variant/10 mt-1">
 Compatible with Zebra, Brother, & standard web spoolers. If popup blockers or safe sandboxed environments are detected, an automatic nested context fallback activates instantly.
 </div>

 <button
 type="button"
 onClick={() => setShowCodesModal(false)}
 className="w-full text-center text-xs font-bold py-1.5 hover:bg-m3-outline-variant/15 text-m3-on-surface-variant rounded-xl transition-all mt-1"
 >
 Close View
 </button>
 </div>

 </div>
 </div>
 )}

 {/* Confirmation soft-delete modal */}
 {confirmDeleteId && (
 <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
 <div className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm shadow-xl" onClick={() => setConfirmDeleteId(null)} />
 <div className="relative w-full max-w-sm rounded-[32px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface text-center space-y-4">
 <div className="text-left space-y-2">
 <h3 className="text-base font-black text-m3-primary uppercase tracking-wide flex items-center gap-2">
 <AlertTriangle className="text-rose-500 h-5 w-5" /> Archive Product safe-listing?
 </h3>
 {isRowClearingBlocked() ? (
 <div className="bg-amber-500/15 border border-amber-500/30 p-3 rounded-xl text-left space-y-1 mt-2">
 <span className="text-[10px] font-black uppercase text-amber-500 font-mono tracking-wider block">️ Archiving Blocked</span>
 <p className="text-[10.5px] text-zinc-300 leading-normal font-sans">
 Row-clearing and product archiving are disabled because the register has: <strong className="text-amber-400 font-black">{getRowClearingBlockedReason()}</strong>.
 </p>
 </div>
 ) : (
 <p className="text-xs text-m3-on-surface-variant/85 leading-relaxed">
 Confirm soft-deletion of <strong className="text-m3-on-surface font-black">{confirmDeleteName}</strong>? All warehouse catalog configurations and stats metrics will adjust.
 </p>
 )}
 </div>
 <div className="flex flex-col gap-2 border-t border-m3-outline-variant/15 pt-4">
 <div className="flex justify-end gap-2">
 <button
 type="button"
 onClick={() => setConfirmDeleteId(null)}
 className="px-4 py-2 text-xs font-black uppercase tracking-wider rounded-full hover:bg-m3-outline-variant/15 text-m3-on-surface-variant transition-colors"
 >
 Cancel
 </button>
 {!isRowClearingBlocked() && (
 <div className="w-48">
 <HoldToConfirmButton
 onConfirm={() => {
 deleteProduct(confirmDeleteId!);
 setConfirmDeleteId(null);
 showToast('Listing archived and soft-deleted successfully.');
 }}
 variant="rose"
 >
 Hold 3s to Archive
 </HoldToConfirmButton>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 )}

 {/* MODAL 4: Bulk JSON Data Portability Hub and Import/Migration Modal */}
 {showPortabilityHubModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-m3-scrim/60 backdrop-blur-sm animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) setShowPortabilityHubModal(false); }}>
 <div className="bg-m3-surface-low border border-m3-outline-variant/30 rounded-[28px] p-6 shadow-2xl space-y-6 w-full max-w-2xl animate-scale-up text-left max-h-[90vh] overflow-y-auto">
 <div className="flex justify-between items-center border-b border-m3-outline-variant/15 pb-4">
 <div>
 <h3 className="text-base font-black text-m3-primary uppercase tracking-wider flex items-center gap-2">
 <Upload className="h-5 w-5 text-emerald-500 animate-pulse" />
 <span>Administrative Data Portability Hub</span>
 </h3>
 <p className="text-xs text-m3-on-surface-variant font-medium mt-1">
 Export standard inventory catalog data or import tiles and old legacy ERP OS rosters.
 </p>
 </div>
 <button
 onClick={() => setShowPortabilityHubModal(false)}
 className="text-zinc-500 hover:text-rose-500 p-2 hover:bg-rose-500/10 rounded-full transition-all text-xl cursor-pointer font-black"
 >
 
 </button>
 </div>

 <div className="space-y-4">
 {/* Informative Step banner */}
 <div className="grid grid-cols-1 gap-4">
 <div className="p-4 rounded-2xl bg-m3-surface border border-m3-outline-variant/10 space-y-2">
 <span className="text-[10px] font-black text-emerald-500 uppercase tracking-wider block">Standardized Export</span>
 <p className="text-xs text-m3-on-surface-variant font-medium">
 Save the current live catalog stock listings as a standard corporate JSON database backup copy.
 </p>
 <button
 onClick={() => {
 handleExportJSON();
 showToast("Standardized catalog export processed!");
 }}
 className="w-full py-2 bg-m3-primary hover:bg-m3-primary/95 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow transition-all cursor-pointer flex items-center justify-center gap-1.5"
 >
 <Download className="h-4 w-4" /> Download catalog.json
 </button>
 </div>
 </div>

 {/* Paste Space */}
 {!allowedToImport ? (
 <div className="p-6 rounded-2xl bg-rose-500/5 border border-rose-500/15 text-center space-y-2 font-sans">
 <span className="text-2xl block">️</span>
 <h4 className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">Administrator Clearance Required</h4>
 <p className="text-[11px] text-m3-on-surface-variant max-w-md mx-auto leading-relaxed">
 You are logged in as a <strong>{currentUser.role}</strong>. Your current role permits full viewing and local exporting of active assets, but importing or changing the global tilepoint database is disabled.
 </p>
 </div>
 ) : (
 <div className="space-y-3">
 <div className="p-3 rounded-2xl bg-m3-surface border border-m3-outline-variant/20 space-y-1.5">
 <label className="text-[10px] font-black uppercase text-m3-primary tracking-wider flex items-center justify-between">
 <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Target Destination Branch Allocation</span>
 {currentUser?.role !== UserRole.ADMIN && (
 <span className="text-[9px] font-bold text-m3-primary bg-m3-primary/10 px-2 py-0.5 rounded-full border border-m3-primary/20">
 {branches.find(b => b.id === (currentUser?.branchAssignmentId || 'B1'))?.name || `Branch ${currentUser?.branchAssignmentId}`}
 </span>
 )}
 </label>
 {currentUser?.role === UserRole.ADMIN ? (
 <select
 value={importTargetBranchId}
 onChange={e => setImportTargetBranchId(e.target.value)}
 className="w-full bg-m3-surface-lowest border border-m3-outline-variant/30 px-3 py-2 text-xs font-bold text-m3-on-surface rounded-xl focus:outline-none focus:border-m3-primary cursor-pointer"
 >
 {branches.filter(b => !b.isDeleted).map(b => (
 <option key={b.id} value={b.id}>
 {b.name} ({b.id}) - {b.address}
 </option>
 ))}
 </select>
 ) : (
 <div className="px-3 py-2 text-xs font-bold text-m3-on-surface bg-m3-surface-low rounded-xl border border-m3-outline-variant/20 flex items-center justify-between">
 <span>{branches.find(b => b.id === (currentUser?.branchAssignmentId || 'B1'))?.name}</span>
 <span className="text-[10px] font-mono text-m3-tertiary">({currentUser?.branchAssignmentId || 'B1'})</span>
 </div>
 )}
 </div>

 <div className="space-y-1">
 <label className="text-[10px] font-black uppercase text-m3-primary tracking-wider block">Paste JSON import array data block</label>
 <textarea
 value={rawImportText}
 onChange={(e) => setRawImportText(e.target.value)}
 rows={6}
 placeholder={`[
 {
 "productName": "Old ERP OS Ceramic Tile x5",
 "productCode": "OP-CER-01",
 "costPrice": 120,
 "sellingPrice": 190,
 "stockQuantity": 80
 }
]`}
 className="w-full bg-m3-surface-lowest border border-m3-outline-variant/30 focus:border-m3-primary p-3.5 text-xs font-mono text-m3-on-surface rounded-2xl focus:outline-none transition-colors"
 />
 </div>

 <div className="pt-2">
 <PreflightReportCard
 report={preflightReport}
 isAnalyzing={isAnalyzingPreflight}
 onRunInspection={handleRunPreflightManual}
 onConfirmCommit={() => {
 executeBulkImport();
 }}
 onCancel={() => setShowPortabilityHubModal(false)}
 allowedToImport={allowedToImport}
 />
 </div>
 </div>
 )}

 {/* Action buttons */}
 <div className="flex justify-end gap-2 border-t border-m3-outline-variant/15 pt-4">
 <button
 type="button"
 onClick={() => setShowPortabilityHubModal(false)}
 className="px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-full hover:bg-m3-outline-variant/15 text-m3-on-surface-variant transition-colors"
 >
 {allowedToImport ? 'Cancel' : 'Close Hub'}
 </button>
 {allowedToImport && (
 <button
 onClick={() => {
 executeBulkImport();
 setShowPortabilityHubModal(false);
 }}
 className="px-6 py-2.5 bg-m3-primary hover:bg-m3-primary/95 text-white font-black text-xs uppercase tracking-wider rounded-full shadow transition-all active:scale-95 cursor-pointer flex items-center gap-2"
 >
 <Check className="h-4 w-4" />
 <span>Verify & Commit Import</span>
 </button>
 )}
 </div>
 </div>
 </div>
 </div>
 )}

 {/* NEW MODAL: Newly Discovered Outlets / Branches Configure & Register Form Panel */}
 {showBranchConfigs && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-m3-scrim/60 backdrop-blur-sm animate-fade-in text-m3-on-surface" onClick={(e) => { if (e.target === e.currentTarget) setShowBranchConfigs(false); }}>
 <div className="bg-m3-surface-low border border-m3-outline-variant/30 rounded-[28px] p-6 shadow-2xl space-y-6 w-full max-w-4xl animate-scale-up text-left max-h-[90vh] overflow-y-auto">
 <div className="flex justify-between items-center border-b border-m3-outline-variant/15 pb-4">
 <div>
 <h3 className="text-base font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
 <span className="p-1.5 rounded-xl bg-amber-500/10"></span>
 <span>Branch Outposts Detected in CSV</span>
 </h3>
 <p className="text-xs text-m3-on-surface-variant font-medium mt-1 font-sans">
 The imported dataset references location(s) not currently registered in TilePoint. Please map each to an existing branch or create a new branch profile:
 </p>
 </div>
 <button
 onClick={() => setShowBranchConfigs(false)}
 className="text-zinc-500 hover:text-rose-500 p-2 hover:bg-rose-500/10 rounded-full transition-all text-xl cursor-pointer font-black"
 >
 
 </button>
 </div>

 <div className="space-y-5">
 {pendingBranches.map((pb, idx) => (
 <div key={idx} className="p-5 rounded-[24px] bg-m3-surface border border-m3-outline-variant/20 space-y-4 font-sans shadow-sm">
 <div className="pb-3 border-b border-m3-outline-variant/10 flex flex-wrap justify-between items-center gap-2">
 <div>
 <span className="text-xs font-black uppercase tracking-wider text-amber-500 block">
 CSV Detected Location: "{pb.detectedLocation}"
 </span>
 <span className="text-[10px] text-m3-on-surface-variant font-medium mt-0.5 block">
 Specify if this maps to an existing branch or should be created as a new outlet.
 </span>
 </div>
 <div className="flex items-center gap-2 bg-m3-surface-low p-1 rounded-xl border border-m3-outline-variant/10">
 <button
 type="button"
 onClick={() => {
 const updated = [...pendingBranches];
 updated[idx].mode = 'existing';
 setPendingBranches(updated);
 }}
 className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
 pb.mode === 'existing'
 ? 'bg-m3-primary text-white shadow-sm'
 : 'text-m3-on-surface-variant hover:bg-m3-outline-variant/10'
 }`}
 >
 Map to Existing
 </button>
 <button
 type="button"
 onClick={() => {
 const updated = [...pendingBranches];
 updated[idx].mode = 'new';
 setPendingBranches(updated);
 }}
 className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
 pb.mode === 'new'
 ? 'bg-amber-600 text-white shadow-sm'
 : 'text-m3-on-surface-variant hover:bg-m3-outline-variant/10'
 }`}
 >
 Create as New
 </button>
 </div>
 </div>

 {pb.mode === 'existing' ? (
 <div className="p-4 bg-m3-surface-low border border-m3-outline-variant/15 rounded-2xl space-y-2">
 <label className="text-[10px] font-black uppercase text-m3-primary tracking-wider font-mono block pl-1">
 Select Existing Destination Branch *
 </label>
 <select
 value={pb.selectedExistingBranchId}
 onChange={(e) => {
 const updated = [...pendingBranches];
 updated[idx].selectedExistingBranchId = e.target.value;
 setPendingBranches(updated);
 }}
 className="w-full bg-m3-surface-lowest border border-m3-outline-variant/30 rounded-xl p-2.5 focus:outline-none focus:border-m3-primary text-m3-on-surface font-sans text-xs shadow-inner"
 >
 {branches.filter(b => !b.isDeleted).map(b => (
 <option key={b.id} value={b.id}>
 {b.name} ({b.id}) - {b.address || 'No address'}
 </option>
 ))}
 </select>
 <div className="flex items-center gap-1.5 text-[10px] text-m3-on-surface-variant pl-1">
 <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
 <span>All imported items matching "{pb.detectedLocation}" will automatically be imported into this branch's stock.</span>
 </div>
 </div>
 ) : (
 <div className="space-y-4 p-4 bg-m3-surface-low border border-m3-outline-variant/15 rounded-2xl">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
 <div className="space-y-1">
 <label className="text-[10px] font-black uppercase text-m3-primary tracking-wider pl-1 font-mono">
 Detected Branch ID (from CSV)
 </label>
 <input
 type="text"
 value={pb.id}
 disabled
 className="w-full bg-m3-surface-lowest opacity-75 border-b-2 border-m3-outline-variant/20 p-2.5 focus:outline-none text-m3-on-surface-variant font-mono font-bold rounded-t cursor-not-allowed"
 title="Detected uniquely from the CSV records"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] font-black uppercase text-m3-primary tracking-wider pl-1">
 Branch Outpost Name *
 </label>
 <input
 type="text"
 value={pb.name}
 onChange={(e) => {
 const updated = [...pendingBranches];
 updated[idx].name = e.target.value;
 setPendingBranches(updated);
 }}
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/55 focus:border-m3-primary p-2.5 focus:outline-none text-m3-on-surface transition-colors rounded-t font-sans font-bold"
 placeholder="e.g. Emman Tile Center"
 required
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] font-black uppercase text-m3-primary tracking-wider pl-1">
 Manager Name *
 </label>
 <input
 type="text"
 value={pb.manager}
 onChange={(e) => {
 const updated = [...pendingBranches];
 updated[idx].manager = e.target.value;
 setPendingBranches(updated);
 }}
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/55 focus:border-m3-primary p-2.5 focus:outline-none text-m3-on-surface transition-colors rounded-t font-sans"
 placeholder="e.g. Maria Clara"
 required
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] font-black uppercase text-m3-primary tracking-wider pl-1 font-mono">
 Contact Phone *
 </label>
 <input
 type="text"
 value={pb.phone}
 onChange={(e) => {
 const updated = [...pendingBranches];
 updated[idx].phone = e.target.value;
 setPendingBranches(updated);
 }}
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/55 focus:border-m3-primary p-2.5 focus:outline-none text-m3-on-surface transition-colors rounded-t font-sans"
 placeholder="e.g. +63 920 123 4567"
 required
 />
 </div>

 <div className="space-y-1 sm:col-span-2">
 <label className="text-[10px] font-black uppercase text-m3-primary tracking-wider pl-1">
 Full Workplace Dispatch Address *
 </label>
 <input
 type="text"
 value={pb.address}
 onChange={(e) => {
 const updated = [...pendingBranches];
 updated[idx].address = e.target.value;
 setPendingBranches(updated);
 }}
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/55 focus:border-m3-primary p-2.5 focus:outline-none text-m3-on-surface transition-colors rounded-t font-sans"
 placeholder="e.g. Rizal Highway, Dipolog City, Zamboanga del Norte"
 required
 />
 </div>

 <div className="flex items-center gap-2 pt-1 font-sans">
 <input
 type="checkbox"
 id={`modal-dist-hub-${idx}`}
 checked={pb.isDistributionBranch}
 onChange={(e) => {
 const updated = [...pendingBranches];
 updated[idx].isDistributionBranch = e.target.checked;
 setPendingBranches(updated);
 }}
 className="rounded border-m3-outline-variant text-m3-primary focus:ring-m3-primary/50 h-4 w-4 cursor-pointer"
 />
 <label htmlFor={`modal-dist-hub-${idx}`} className="text-[10px] font-black uppercase text-m3-on-surface-variant cursor-pointer select-none">
 Is Distribution Hub
 </label>
 </div>

 <div className="flex items-center gap-2 pt-1 font-sans">
 <label className="text-[10px] font-black uppercase text-m3-on-surface-variant block select-none">
 Assigned Force:
 </label>
 <input
 type="number"
 min={1}
 max={50}
 value={pb.staffCount}
 onChange={(e) => {
 const updated = [...pendingBranches];
 updated[idx].staffCount = parseInt(e.target.value) || 3;
 setPendingBranches(updated);
 }}
 className="w-16 bg-m3-surface-lowest border-b-2 border-m3-outline-variant/55 focus:border-m3-primary p-1 focus:outline-none text-m3-on-surface text-center font-mono text-xs"
 />
 </div>
 </div>
 </div>
 )}
 </div>
 ))}
 </div>

 <div className="flex justify-end gap-2 border-t border-m3-outline-variant/15 pt-4">
 <button
 type="button"
 onClick={() => setShowBranchConfigs(false)}
 className="px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-full hover:bg-m3-outline-variant/15 text-m3-on-surface-variant transition-colors"
 >
 Discard Import
 </button>
 <button
 onClick={handleFinalizeImportWithBranches}
 className="px-6 py-2.5 bg-m3-primary hover:bg-m3-primary/95 text-white font-black text-xs uppercase tracking-wider rounded-full shadow transition-all active:scale-95 cursor-pointer flex items-center gap-2"
 >
 <Check className="h-4 w-4" />
 <span>Instantiate Outlets & Commit Products</span>
 </button>
 </div>
 </div>
 </div>
 )}

 {/* MODAL 5: Create Stock Transfer Request Modal */}
 {showCreateTransfer && (
 <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
 <div className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm shadow-xl" onClick={() => setShowCreateTransfer(false)} />
 <div className="relative w-full max-w-2xl rounded-[32px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface text-left space-y-4 max-h-[90vh] overflow-y-auto">
 <div className="flex justify-between items-center border-b border-m3-outline-variant/15 pb-2.5">
 <h3 className="text-sm font-black text-m3-primary uppercase tracking-wider flex items-center gap-2">
 <ArrowRightLeft className="h-5 w-5" /> Formulate Stock Transfer Request
 </h3>
 <button type="button" onClick={() => setShowCreateTransfer(false)} className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1 rounded-full">
 <X className="h-5 w-5" />
 </button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* Dispatch branch assignment */}
 <div className="space-y-1">
 <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 block select-none">Dispensing Branch (Source)</label>
 <select
 disabled={currentUser.role !== 'Admin'}
 value={transferSource}
 onChange={e => {
 const src = e.target.value;
 setTransferSource(src);
 if (src === transferDest) {
 setTransferDest(branches.find(b => b.id !== src)?.id || '');
 }
 }}
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary p-2.5 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-sans"
 >
 {branches.filter(b => !b.isDeleted).map(b => (
 <option key={b.id} value={b.id}>{b.name}</option>
 ))}
 </select>
 {currentUser.role !== 'Admin' && (
 <span className="text-[9px] text-zinc-400 pl-1">{branches.find(b => b.id === (currentUser?.branchAssignmentId || 'B1'))?.name}</span>
 )}
 </div>

 {/* Destination branch assignment */}
 <div className="space-y-1">
 <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 block select-none">Receiving Branch (Destination)</label>
 <select
 value={transferDest}
 onChange={e => setTransferDest(e.target.value)}
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary p-2.5 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-sans"
 >
 <option value="" disabled>Select target branch...</option>
 {branches.filter(b => !b.isDeleted && b.id !== transferSource).map(b => (
 <option key={b.id} value={b.id}>{b.name}</option>
 ))}
 </select>
 </div>

 {/* Transfer Type Selection */}
 <div className="space-y-1 md:col-span-2">
 <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 block select-none">Transfer Type Category</label>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
 {(['Replenishment', 'Pull Out', 'Redistribution', 'Return to Warehouse'] as TransferType[]).map((type) => (
 <button
 key={type}
 type="button"
 onClick={() => setTransferTypeSelect(type)}
 className={`py-2 px-3 text-2xs font-extrabold uppercase rounded-lg border text-center transition-all cursor-pointer ${
 transferTypeSelect === type
 ? 'bg-m3-primary/10 border-m3-primary text-m3-primary'
 : 'bg-m3-surface border-m3-outline-variant/15 text-m3-on-surface-variant hover:bg-m3-surface-high'
 }`}
 >
 {type}
 </button>
 ))}
 </div>
 </div>
 </div>

 {/* NESTED BUILDER CAROUSEL */}
 <div className="bg-m3-surface p-4 rounded-2xl border border-m3-outline-variant/15 space-y-3.5">
 <span className="text-[10px] font-extrabold text-m3-secondary uppercase tracking-wider block">Add Items to Transfer Order</span>
 <div className="flex flex-col sm:flex-row gap-3">
 <div className="flex-1 space-y-1">
 <span className="text-[9px] text-zinc-500 font-bold block">Select Ceramic Product</span>
 <select
 value={tempProductId}
 onChange={e => setTempProductId(e.target.value)}
 className="w-full bg-m3-surface-lowest border border-m3-outline-variant/20 focus:border-m3-primary px-3 py-1.5 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-lg font-sans"
 >
 <option value="">Choose a product...</option>
 {branchProducts.map(p => {
 const stockInBranch = branchStock.find(bs => bs.productId === p.id && bs.branchId === transferSource)?.quantity || 0;
 return (
 <option key={p.id} value={p.id}>
 {p.productName} ({p.size}) [&nbsp;Stock: {stockInBranch} {p.unit || 'Boxes'}&nbsp;]
 </option>
 );
 })}
 </select>
 </div>
 <div className="w-full sm:w-28 space-y-1">
 <span className="text-[9px] text-zinc-500 font-bold block">Request Qty (Boxes)</span>
 <input
 type="number"
 min={1}
 value={tempQty}
 onChange={e => setTempQty(Math.max(1, parseInt(e.target.value) || 1))}
 className="w-full bg-m3-surface-lowest border border-m3-outline-variant/20 focus:border-m3-primary px-3 py-1.5 text-xs text-m3-on-surface text-center focus:outline-none transition-colors rounded-lg font-mono"
 />
 </div>
 <div className="flex items-end">
 <button
 type="button"
 onClick={() => {
 if (!tempProductId) {
 showToast('Please select a product from the list first.');
 return;
 }
 const matchedProd = products.find(prod => prod.id === tempProductId);
 if (!matchedProd) return;

 const stockInBranch = branchStock.find(bs => bs.productId === tempProductId && bs.branchId === transferSource)?.quantity || 0;
 if (tempQty > stockInBranch) {
 showToast(`Warning: Dispatch branch only holds ${stockInBranch} boxes. Request exceeds available stock.`);
 }

 // Check if product is already in the transfer items cart
 const existingIdx = transferItems.findIndex(it => it.productId === tempProductId);
 if (existingIdx !== -1) {
 setTransferItems(prev => prev.map((it, idx) => {
 if (idx === existingIdx) {
 return { ...it, quantity: it.quantity + tempQty };
 }
 return it;
 }));
 } else {
 setTransferItems(prev => [...prev, { productId: tempProductId, quantity: tempQty }]);
 }
 
 showToast(`Added ${tempQty} units of "${matchedProd.productName}"`);
 setTempProductId('');
 }}
 className="w-full bg-m3-secondary hover:bg-m3-secondary/90 text-m3-on-secondary px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer"
 >
 Add Line
 </button>
 </div>
 </div>

 {/* Added product items card view */}
 {transferItems.length > 0 ? (
 <div className="bg-m3-surface-low border border-m3-outline-variant/10 rounded-xl divide-y divide-m3-outline-variant/10">
 {transferItems.map((item, idx) => {
 const prodDetails = products.find(p => p.id === item.productId);
 return (
 <div key={idx} className="flex justify-between items-center p-2.5 text-xs text-m3-on-surface">
 <div className="flex flex-col">
 <span className="font-extrabold">{prodDetails ? prodDetails.productName : 'Unknown Tile'}</span>
 <span className="text-[10px] text-zinc-400 font-mono">Product Code: {prodDetails ? prodDetails.productCode : item.productId}</span>
 </div>
 <div className="flex items-center gap-4">
 <span className="font-mono font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md">{item.quantity} boxes</span>
 <button
 type="button"
 onClick={() => setTransferItems(prev => prev.filter((_, i) => i !== idx))}
 className="text-zinc-400 hover:text-rose-500 p-1 cursor-pointer transition-colors hover:bg-rose-500/10 rounded-full"
 >
 <Trash2 className="h-4 w-4" />
 </button>
 </div>
 </div>
 );
 })}
 </div>
 ) : (
 <div className="text-center py-6 text-zinc-400 text-xs italic bg-m3-surface-low rounded-xl border border-dashed border-m3-outline-variant/20">
 Item queue empty. Select tile and request quantity to populate list.
 </div>
 )}
 </div>

 {/* Purpose input */}
 <div className="space-y-1">
 <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 block select-none">Justification Remarks / Transfer Motivation</label>
 <textarea
 rows={2}
 value={transferReasonInput}
 onChange={e => setTransferReasonInput(e.target.value)}
 placeholder="e.g., showroom display replenishment, customer pre-purchase balance delivery..."
 className="w-full bg-m3-surface-lowest border border-m3-outline-variant/20 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-lg font-sans"
 />
 </div>

 {/* Submit Actions */}
 <div className="flex justify-end gap-2 border-t border-m3-outline-variant/15 pt-4">
 <button
 type="button"
 onClick={() => setShowCreateTransfer(false)}
 className="px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-full hover:bg-m3-outline-variant/15 text-m3-on-surface-variant transition-colors"
 >
 Refuse
 </button>
 <button
 type="button"
 onClick={() => {
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
 className="m3-btn-primary px-5 py-2.5 text-xs shadow-md border animate-scale-up"
 >
 File Request
 </button>
 </div>
 </div>
 </div>
 )}

 {/* MODAL 6: Bulk Damage Register Modal */}
 {showBulkDamageModal && (
 <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
 <div className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm shadow-xl" onClick={() => setShowBulkDamageModal(false)} />
 <form
 onSubmit={handleBulkSubmitDamage}
 className="relative w-full max-w-2xl rounded-[32px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface text-left space-y-4 max-h-[90vh] overflow-y-auto animate-scale-up"
 >
 {/* Header */}
 <div className="flex justify-between items-center border-b border-m3-outline-variant/15 pb-3">
 <h3 className="text-sm font-black text-rose-500 uppercase tracking-wider flex items-center gap-2">
 <AlertTriangle className="h-5 w-5 text-rose-500 animate-pulse" />
 <span>Register Bulk Damages & Log Breakages</span>
 </h3>
 <button type="button" onClick={() => setShowBulkDamageModal(false)} className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1 rounded-full hover:bg-m3-outline-variant/15 transition-all">
 <X className="h-5 w-5" />
 </button>
 </div>

 {/* Config Fields Grid */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
 {/* Reporting Showroom/Warehouse Branch */}
 <div className="space-y-1">
 <label className="text-[9px] font-black text-m3-primary uppercase tracking-widest pl-1 block">Reporting Branch</label>
 <select
 required
 value={bulkDamageBranchId}
 onChange={e => setBulkDamageBranchId(e.target.value)}
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary p-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-sans"
 >
 {branches.filter(b => !b.isDeleted).map(b => (
 <option key={b.id} value={b.id}>{b.name} ({b.id})</option>
 ))}
 </select>
 </div>

 {/* Breakage Cause Category */}
 <div className="space-y-1">
 <label className="text-[9px] font-black text-m3-primary uppercase tracking-widest pl-1 block">Damage Category</label>
 <select
 value={bulkDamageCategory}
 onChange={e => setBulkDamageCategory(e.target.value)}
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary p-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-sans"
 >
 <option value="Warehouse Breakage">Warehouse Drop / Forklift Clash</option>
 <option value="BOA">BOA (Broken On Arrival from Supplier)</option>
 <option value="Showroom Casualty">Showroom Display Chipped</option>
 <option value="Delivery Transit">Transport Transit Fractures</option>
 </select>
 </div>

 {/* Action / Treatment */}
 <div className="space-y-1">
 <label className="text-[9px] font-black text-m3-primary uppercase tracking-widest pl-1 block">Action / Treatment Taken</label>
 <select
 value={bulkDamageAction}
 onChange={e => setBulkDamageAction(e.target.value)}
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary p-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-sans"
 >
 <option value="Disposed / Scrapped">Shattered - Disposed & Scrapped</option>
 <option value="Saved for Mosaic">Saved for Low-Cost Mosaic Sales</option>
 <option value="Claimed from Supplier / Insurance Code">Pending Supplier Cargo Claim / BOA Reimbursement</option>
 <option value="Returned for Credit">Returned to Supplier Warehouse for Credit Note</option>
 </select>
 </div>
 </div>

 {/* Selected Products Quantities list */}
 <div className="space-y-2">
 <label className="text-[9px] font-black text-m3-primary uppercase tracking-widest pl-1 block">Damaged Quantities per Tile Code</label>
 <div className="bg-m3-surface-lowest border border-m3-outline-variant/15 rounded-2xl max-h-[240px] overflow-y-auto divide-y divide-m3-outline-variant/10 scrollbar-thin">
 {getSelectedProducts().map((pItem) => {
 const branchStockVal = branchStock.find(bs => bs.productId === pItem.id && bs.branchId === bulkDamageBranchId)?.quantity ?? 0;
 return (
 <div key={pItem.id} className="p-3 flex items-center justify-between gap-4 text-xs">
 <div className="flex-1 min-w-0">
 <div className="font-extrabold truncate text-m3-on-surface">{pItem.productName}</div>
 <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
 SKU: {pItem.sku} • Stock in Branch: <span className="font-bold text-m3-primary">{branchStockVal} boxes</span>
 </div>
 </div>
 <div className="flex items-center gap-2 shrink-0">
 <span className="text-[10px] font-bold text-zinc-400 uppercase">Damaged Boxes:</span>
 <input
 type="number"
 min={1}
 max={9999}
 required
 value={bulkDamageQuantities[pItem.id] ?? 1}
 onChange={e => {
 const val = Math.max(1, parseInt(e.target.value) || 1);
 setBulkDamageQuantities(prev => ({
 ...prev,
 [pItem.id]: val
 }));
 }}
 className="w-16 bg-m3-surface-low border border-m3-outline-variant/30 rounded-lg text-center p-1 font-mono font-bold text-xs focus:border-m3-primary focus:outline-none"
 />
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Incident description */}
 <div className="space-y-1">
 <label className="text-[9px] font-black text-m3-primary uppercase tracking-widest pl-1 block">Incident Description & Audit Remarks</label>
 <textarea
 required
 rows={2}
 value={bulkDamageNotes}
 onChange={e => setBulkDamageNotes(e.target.value)}
 placeholder="Describe the incident causing the stock breakages or suppliers delivery issue..."
 className="w-full bg-m3-surface-lowest border border-m3-outline-variant/20 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-xl font-sans"
 />
 </div>

 {/* Submit / Cancel Actions */}
 <div className="flex justify-end gap-2 border-t border-m3-outline-variant/15 pt-4">
 <button
 type="button"
 onClick={() => setShowBulkDamageModal(false)}
 className="px-4 py-2 text-xs font-black uppercase tracking-wider rounded-full hover:bg-m3-outline-variant/15 text-m3-on-surface-variant transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="bg-rose-500 hover:bg-rose-600 text-white font-black uppercase tracking-wider px-5 py-2.5 rounded-full text-xs shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
 >
 <Check className="h-4 w-4" />
 <span>Register Bulk Damages</span>
 </button>
 </div>
 </form>
 </div>
 )}

 {/* Success toast alert bar */}
 {toastMessage && (
 <div className="fixed bottom-6 right-6 bg-m3-on-surface text-m3-surface text-xs font-bold py-3 px-5 rounded-2xl shadow-2xl z-50 border border-m3-outline-variant/30 flex items-center gap-2 animate-bounce max-w-[280px]">
 <ShieldCheck className="h-4.5 w-4.5 text-m3-tertiary shrink-0" />
 <span className="leading-tight">{toastMessage}</span>
 </div>
 )}
 </div>
 );
};
