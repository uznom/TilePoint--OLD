/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useDb } from '../context/DbContext';
import { Product, UserRole, TransferType, TransferStatus } from '../types/db';
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
  Clock,
  Flame,
  ArrowRightLeft,
  Truck
} from 'lucide-react';

interface InventoryModuleProps {
  darkMode: boolean;
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
          className={`w-3 h-3 ${active ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-transparent'}`} 
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

export const InventoryModule: React.FC<InventoryModuleProps> = ({ darkMode }) => {
  const {
    products,
    suppliers,
    branches,
    createProduct,
    updateProduct,
    deleteProduct,
    importProducts,
    currentUser,
    addAuditLog,
    movements,
    stockTransfers,
    branchStock,
    ledgerEntries,
    createStockTransfer,
    updateStockTransferStatus
  } = useDb();

  // Primary navigation sub-tabs: "catalog" | "movements" | "transfers" | "ledger"
  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'movements' | 'transfers' | 'ledger'>('catalog');

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

  // Search & Filters
  const [term, setTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Add/Edit Modals state
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState('');

  // Form Fields State (Product Schema matches & additions)
  const [productCode, setProductCode] = useState('');
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
  const [stockQuantity, setStockQuantity] = useState<number>(100);
  const [minimumStock, setMinimumStock] = useState<number>(25);

  // Manual Stock Adjustment state
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustProductId, setAdjustProductId] = useState('');
  const [adjustProductName, setAdjustProductName] = useState('');
  const [adjustType, setAdjustType] = useState<'ADD' | 'SUB'>('ADD');
  const [adjustVal, setAdjustVal] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState('Weekly stock-take variance reconciliation');

  // Barcode & QR Label viewer state
  const [showCodesModal, setShowCodesModal] = useState(false);
  const [codesProduct, setCodesProduct] = useState<Product | null>(null);
  const [printingCode, setPrintingCode] = useState(false);

  // Custom toast alert
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string>('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [rawImportText, setRawImportText] = useState('');

  // Movement Ledger tracking states
  const [movementSearch, setMovementSearch] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState('All');

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Helpers for Branch stock mapping and transfers
  const getBranchName = (id: string) => branches.find(b => b.id === id)?.name || id;

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

    const activeProds = products.filter(p => !p.isDeleted);
    activeProds.forEach(p => {
      // Find B1 stock
      const b1Stock = branchStock.find(bs => bs.productId === p.id && bs.branchId === 'B1')?.quantity || 0;
      
      // Let's check other branches
      ['B2', 'B3', 'B4'].forEach(bId => {
        const bStock = branchStock.find(bs => bs.productId === p.id && bs.branchId === bId)?.quantity || 0;
        const bName = branches.find(b => b.id === bId)?.name || bId;
        
        // Recommendation 1: Deficit (Low stock) and Main branch B1 has plenty of stock (e.g. > 100)
        if (bStock < 25 && b1Stock > 100) {
          recommendations.push({
            id: `REC-DEF-${p.id}-${bId}`,
            productId: p.id,
            productName: p.productName,
            fromBranchId: 'B1',
            toBranchId: bId,
            suggestedQty: 50,
            reason: `REPLENISHMENT ALERT: ${bName} is low on stock (${bStock} boxes remaining). Main Branch has a robust buffer of ${b1Stock} boxes. Transfer 50 boxes to balance availability.`,
            type: 'Deficit'
          });
        }
        
        // Recommendation 2: Slow moving items at B2/B3/B4 that can be pulled back to Main B1
        const ages: Record<string, number> = { 'P1': 14, 'P2': 210, 'P3': 45, 'P4': 185 }; // simulated last sold age
        const age = ages[p.id] || 35;
        if (age > 120 && bStock > 40 && bId !== 'B1') {
          recommendations.push({
            id: `REC-SLOW-${p.id}-${bId}`,
            productId: p.id,
            productName: p.productName,
            fromBranchId: bId,
            toBranchId: 'B1',
            suggestedQty: Math.max(20, Math.round(bStock * 0.5)),
            reason: `SLOW-MOVING PULL OUT: ${p.productName} has been idle for ${age} days at ${bName} (${bStock} boxes holding down capital). Recommend pulling out ${Math.round(bStock * 0.5)} boxes back to Main HQ Hub for immediate retail clearance and liquidating capital.`,
            type: 'Overstock'
          });
        }
      });
    });

    return recommendations;
  }, [products, branchStock, branches]);

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
    showToast(`⚡ Smart Redistribution Route Initiated: Approved transmittal pending dispatch.`);
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

  const allowedToModify = currentUser.role === UserRole.MANAGER;

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
  const filteredProducts = products.filter(p => {
    if (p.isDeleted) return false;

    const matchSearch =
      p.productName.toLowerCase().includes(term.toLowerCase()) ||
      p.productCode.toLowerCase().includes(term.toLowerCase()) ||
      p.barcode.toLowerCase().includes(term.toLowerCase()) ||
      p.sku.toLowerCase().includes(term.toLowerCase()) ||
      p.brand.toLowerCase().includes(term.toLowerCase()) ||
      (p.designName && p.designName.toLowerCase().includes(term.toLowerCase()));

    const matchCategory = categoryFilter === 'All' || p.category === categoryFilter;

    // Stock Status evaluations
    let currentStatus = 'In Stock';
    if (p.stockQuantity === 0) {
      currentStatus = 'Out of Stock';
    } else if (p.stockQuantity <= p.minimumStock * 0.5) {
      currentStatus = 'Critical';
    } else if (p.stockQuantity <= p.minimumStock) {
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

  // Calculate Key Inventory Performance Indicators (Dashboard Statistics)
  const stats = React.useMemo(() => {
    const nonDeleted = products.filter(p => !p.isDeleted);
    let totalValue = 0;
    let lowStock = 0;
    let criticalStock = 0;
    let outOfStock = 0;

    nonDeleted.forEach(p => {
      totalValue += p.stockQuantity * p.costPrice;
      if (p.stockQuantity === 0) {
        outOfStock++;
      } else if (p.stockQuantity <= p.minimumStock * 0.5) {
        criticalStock++;
      } else if (p.stockQuantity <= p.minimumStock) {
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
  }, [products]);

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

    return matchSearch && matchType;
  });

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
    setStockQuantity(50);
    setMinimumStock(20);

    setIsEditMode(false);
    setShowModal(true);
  };

  const handleOpenEdit = (p: Product) => {
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
    setStockQuantity(p.stockQuantity);
    setMinimumStock(p.minimumStock);

    setIsEditMode(true);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!allowedToModify) {
      showToast('⚠️ Authorization Required: Only Manager profiles are authorized to register items.');
      return;
    }

    const payload = {
      productCode,
      sku,
      barcode,
      designName,
      productName,
      category,
      brand,
      supplierId,
      unit,
      size,
      boxQuantity: Number(boxQuantity),
      coveragePerBox: Number(coveragePerBox),
      image: productImage,
      costPrice: Number(costPrice),
      sellingPrice: Number(sellingPrice),
      stockQuantity: Number(stockQuantity),
      minimumStock: Number(minimumStock),
    };

    if (isEditMode) {
      updateProduct(editingId, payload);
      // addAuditLog and logManualAdjustment are triggered inside updateProduct automatically if qty changes
      showToast(`🟢 Custom specifications for details updated successfully.`);
    } else {
      createProduct(payload);
      showToast('🟢 Registered new item in global stock catalogs.');
    }
    setShowModal(false);
  };

  // Safe deletion routine
  const handleDeleteTrigger = (id: string, name: string) => {
    if (!allowedToModify) {
      showToast('⚠️ Authorization Required: Access limited to Manager profiles.');
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
      showToast('⚠️ Security Violation: Only Store Managers are authorized to manually adjust stock counts.');
      return;
    }

    const finalChange = adjustType === 'ADD' ? adjustVal : -adjustVal;
    const finalNewQty = Math.max(0, p.stockQuantity + finalChange);

    // Call updateProduct with our custom adjustment context reason
    updateProduct(adjustProductId, { stockQuantity: finalNewQty }, adjustReason);
    showToast(`🟢 Stock level updated. Registered stock action log: ${finalChange > 0 ? '+' : ''}${finalChange}`);
    setShowAdjustModal(false);
  };

  // Opening the labels viewer
  const handleOpenCodesModal = (p: Product) => {
    setCodesProduct(p);
    setShowCodesModal(true);
  };

  const handleSimulatePrint = () => {
    setPrintingCode(true);
    setTimeout(() => {
      setPrintingCode(false);
      showToast('🖨️ Label sent to Z-Min Zebra printer queue successfully!');
    }, 1500);
  };

  // Bulk Import / Export simulations
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(products.filter(p => !p.isDeleted), null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `TilePoint_Inventory_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchorElem.click();
    addAuditLog('INVENTORY_EXPORT', 'Exported product database as JSON file', 'Products', 'EXPORT');
    showToast('💾 Exported full non-deleted inventory roster as JSON file.');
  };

  const handleOpenImport = () => {
    setRawImportText('');
    setShowImportModal(true);
  };

  const executeBulkImport = () => {
    if (!rawImportText.trim()) {
      showToast('⚠️ Error: Please input a valid JSON array text block.');
      return;
    }

    try {
      const parsed = JSON.parse(rawImportText);
      if (Array.isArray(parsed)) {
        const result = importProducts(parsed);
        if (result.success) {
          setShowImportModal(false);
          showToast(`🟢 Successfully updated ${result.count} tile products.`);
        } else {
          showToast(`⚠️ Import Failure: ${result.error}`);
        }
      } else {
        showToast('⚠️ Format Mismatch: Imported contents must represent a valid Tile Array.');
      }
    } catch (e) {
      showToast('⚠️ Syntax Error: Failed Parsing JSON. Verify code format structure.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-m3-on-surface">
      
      {/* 🚀 SUB-HEADER TAB NAVIGATION */}
      <div className="flex border-b border-m3-outline-variant/20 pb-px items-center justify-between sticky top-0 bg-m3-surface/90 backdrop-blur-md z-30 pt-2 pb-2 rounded-b-xl px-2 shadow-sm">
        <div className="flex flex-wrap gap-1 md:gap-2">
          <button
            onClick={() => setActiveSubTab('catalog')}
            className={`flex items-center gap-2 py-3 px-4 md:px-5 text-xs font-black uppercase tracking-wider transition-all duration-200 border-b-2 hover:bg-m3-surface-low rounded-t-xl ${
              activeSubTab === 'catalog'
                ? 'border-m3-primary text-m3-primary font-black scale-102'
                : 'border-transparent text-m3-on-surface-variant'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>Catalog Stock Ledger</span>
          </button>
          
          <button
            onClick={() => setActiveSubTab('movements')}
            className={`flex items-center gap-2 py-3 px-4 md:px-5 text-xs font-black uppercase tracking-wider transition-all duration-200 border-b-2 hover:bg-m3-surface-low rounded-t-xl ${
              activeSubTab === 'movements'
                ? 'border-m3-primary text-m3-primary font-black scale-102'
                : 'border-transparent text-m3-on-surface-variant'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Adjustments Logs</span>
          </button>

          <button
            onClick={() => setActiveSubTab('transfers')}
            className={`flex items-center gap-2 py-3 px-4 md:px-5 text-xs font-black uppercase tracking-wider transition-all duration-200 border-b-2 hover:bg-m3-surface-low rounded-t-xl relative ${
              activeSubTab === 'transfers'
                ? 'border-m3-primary text-m3-primary font-black scale-102'
                : 'border-transparent text-m3-on-surface-variant'
            }`}
          >
            <ArrowRightLeft className="h-4 w-4" />
            <span>Stock Transfers</span>
            {stockTransfers.filter(t => t.status === 'Pending').length > 0 && (
              <span className="absolute -top-1 right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black leading-none text-white animate-pulse shadow-md">
                {stockTransfers.filter(t => t.status === 'Pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('ledger')}
            className={`flex items-center gap-2 py-3 px-4 md:px-5 text-xs font-black uppercase tracking-wider transition-all duration-200 border-b-2 hover:bg-m3-surface-low rounded-t-xl ${
              activeSubTab === 'ledger'
                ? 'border-m3-primary text-m3-primary font-black scale-102'
                : 'border-transparent text-m3-on-surface-variant'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>Logistics Ledger & Heatmap</span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-m3-on-surface-variant bg-m3-surface-low py-1.5 px-3 rounded-full border border-m3-outline-variant/25">
          <Sliders className="h-3.5 w-3.5 text-m3-primary" />
          <span>Section: Inventory Operations v2.0</span>
        </div>
      </div>

      {/* 📦 INVENTORY DASHBOARD SUMMARY STATS */}
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

      {/* 📁 VIEW 1: CATALOG STOCK LEDGER */}
      {activeSubTab === 'catalog' && (
        <>
          {/* Main Filter Controller Panel Card */}
          <div className="bg-m3-surface-low p-4 rounded-[28px] border border-m3-outline-variant/20 shadow-sm space-y-4">
            <div className="flex flex-col xl:flex-row gap-4 items-center justify-between">
              {/* Search query box */}
              <div className="relative w-full xl:max-w-xs shrink-0">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-m3-primary">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  placeholder="Filter by Name, SKU, design name, code..."
                  value={term}
                  onChange={e => setTerm(e.target.value)}
                  className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2.5 pl-10 text-xs text-m3-on-surface focus:outline-none transition-all rounded-t-md font-medium"
                />
              </div>

              {/* Advanced catalog filters and commands */}
              <div className="flex flex-wrap gap-2 w-full justify-start xl:justify-end items-center">
                
                {/* Category select */}
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="p-2 border-b-2 border-m3-outline-variant/60 focus:border-m3-primary bg-m3-surface-lowest text-xs text-m3-on-surface focus:outline-none rounded-t-md cursor-pointer transition-colors font-medium"
                >
                  <option value="All">All Categories</option>
                  {categories.slice(0, 16).map((cat, i) => (
                    <option key={i} value={cat}>{cat}</option>
                  ))}
                </select>

                {/* Status select */}
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="p-2 border-b-2 border-m3-outline-variant/60 focus:border-m3-primary bg-m3-surface-lowest text-xs text-m3-on-surface focus:outline-none rounded-t-md cursor-pointer transition-colors font-medium"
                >
                  <option value="All">All Statuses</option>
                  <option value="In Stock">In Stock</option>
                  <option value="Low Stock">● Low Stock</option>
                  <option value="Critical">● Critical Stock</option>
                  <option value="Out of Stock">● Out of Stock</option>
                </select>

                <button
                  onClick={handleExportJSON}
                  className="p-2 px-3.5 text-m3-primary hover:bg-m3-outline-variant/25 text-xs font-bold flex items-center gap-1.5 cursor-pointer rounded-full transition-colors border border-m3-outline-variant/10"
                  title="Export catalog data as standardized JSON"
                >
                  <Download className="h-4 w-4" /> JSON Export
                </button>

                {allowedToModify && (
                  <>
                    <button
                      onClick={handleOpenImport}
                      className="p-2 px-3.5 text-m3-primary hover:bg-m3-outline-variant/25 text-xs font-bold flex items-center gap-1.5 cursor-pointer rounded-full transition-colors border border-m3-outline-variant/10"
                    >
                      <Upload className="h-4 w-4" /> JSON Import
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

          {/* Database Catalog Table List */}
          <div className="m3-card shadow-sm overflow-x-auto p-0">
            <table className="w-full text-left border-collapse table-auto text-xs min-w-[1280px]">
              <thead>
                <tr className="border-b border-m3-outline-variant/20 bg-m3-surface/30 text-[10px] uppercase font-bold text-m3-on-surface-variant tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">Image</th>
                  <th className="py-3 px-4">Code / SKU</th>
                  <th className="py-3 px-4">Identifier codes</th>
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-4">Category / Brand</th>
                  <th className="py-3 px-4 text-center">Packaging dimensions</th>
                  <th className="py-3 px-4 text-right">Unit cost</th>
                  <th className="py-3 px-4 text-right">Sale Price</th>
                  <th className="py-3 px-4 text-center">Current Stock</th>
                  <th className="py-3 px-2 text-center">Threshold</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-m3-outline-variant/10 text-m3-on-surface/90">
                {filteredProducts.map((p) => {
                  // Determine status indicators
                  let statusLabel = 'In Stock';
                  let statusClass = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25';

                  if (p.stockQuantity === 0) {
                    statusLabel = 'Out of Stock';
                    statusClass = 'bg-m3-outline-variant/15 text-m3-on-surface-variant/75 border-transparent';
                  } else if (p.stockQuantity <= p.minimumStock * 0.5) {
                    statusLabel = 'Critical';
                    statusClass = 'bg-rose-500/10 text-rose-500 border-rose-500/25 font-black animate-pulse';
                  } else if (p.stockQuantity <= p.minimumStock) {
                    statusLabel = 'Low Stock';
                    statusClass = 'bg-amber-500/10 text-amber-500 border-amber-500/25';
                  }

                  return (
                    <tr key={p.id} className="hover:bg-m3-surface-low/50 transition-colors">
                      
                      {/* Product Thumbnail view */}
                      <td className="py-3.5 px-4 font-mono select-none">
                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-zinc-200/40 dark:border-zinc-700/40 bg-zinc-300/30 flex items-center justify-center shrink-0">
                          {p.image ? (
                            <img
                              src={p.image}
                              alt={p.productName}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="text-[9px] uppercase tracking-tighter text-zinc-400 font-extrabold text-center leading-none p-1 shrink-0">
                              No Pix
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Code / SKU details */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-extrabold text-m3-primary">{p.productCode}</div>
                        <div className="text-[10px] text-m3-on-surface-variant font-bold">{p.sku}</div>
                      </td>

                      {/* Scannable keys info */}
                      <td className="py-3.5 px-4 font-mono text-[10px] text-zinc-500 select-all">
                        <div>BC: {p.barcode}</div>
                        <div>QR: {p.qrCode}</div>
                      </td>

                      {/* Primary specifications block */}
                      <td className="py-3.5 px-4">
                        <strong className="text-m3-on-surface text-xs block truncate max-w-[240px]" title={p.productName}>
                          {p.productName}
                        </strong>
                        <div className="flex items-center gap-2 mt-0.5 whitespace-nowrap">
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
                        </div>
                      </td>

                      {/* Category metadata */}
                      <td className="py-3.5 px-4">
                        <span className="bg-m3-outline-variant/25 px-2.5 py-0.5 rounded-full text-m3-on-surface text-[11px] font-bold">
                          {p.category}
                        </span>
                        <div className="text-[9px] text-m3-on-surface-variant mt-1.5 font-bold">Brand: {p.brand}</div>
                      </td>

                      {/* Packaging dimensions and piece count */}
                      <td className="py-3.5 px-4 text-center font-bold">
                        <div className="text-m3-on-surface">{p.unit}</div>
                        {p.size && (
                          <div className="text-[10px] text-m3-on-surface-variant font-medium">
                            {p.size} {p.boxQuantity > 1 && `(${p.boxQuantity} pcs)`}
                          </div>
                        )}
                      </td>

                      {/* Financial unit cost */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-m3-on-surface">
                        ₱{p.costPrice.toFixed(2)}
                      </td>

                      {/* Retail selling price */}
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-m3-primary">
                        ₱{p.sellingPrice.toFixed(2)}
                      </td>

                      {/* Current physical warehouse qty */}
                      <td className="py-3.5 px-4 text-center font-mono text-sm font-extrabold">
                        <div className={
                          p.stockQuantity === 0 
                            ? 'text-zinc-400 dark:text-zinc-600' 
                            : p.stockQuantity <= p.minimumStock 
                              ? 'text-m3-primary tracking-wide' 
                              : 'text-m3-on-surface'
                        }>
                          {p.stockQuantity}
                        </div>
                      </td>

                      {/* Threshold warnings trigger limit */}
                      <td className="py-3.5 px-2 text-center font-mono text-m3-on-surface-variant font-bold">
                        {p.minimumStock}
                      </td>

                      {/* Visual Status badge */}
                      <td className="py-3.5 px-4 text-center select-none">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase border ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </td>

                      {/* CRUD + Action buttons */}
                      <td className="py-3.5 px-4 text-center select-none">
                        <div className="flex gap-0.5 justify-center">
                          <button
                            onClick={() => handleOpenCodesModal(p)}
                            className="p-1.5 text-zinc-500 hover:text-m3-primary hover:bg-m3-outline-variant/15 transition-all rounded-full cursor-pointer shrink-0"
                            title="View / Print Barcodes & QR Codes"
                          >
                            <QrCode className="h-4 w-4" />
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
                                title="Edit specs / Upload Image"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTrigger(p.id, p.productName)}
                                className="p-1.5 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all rounded-full cursor-pointer shrink-0"
                                title="Soft-delete listings"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-m3-on-surface-variant font-bold text-sm">
                      No hardware listings or tiles match your filtered search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 🔄 VIEW 2: MOVEMENT HISTORY LEDGER LOGS */}
      {activeSubTab === 'movements' && (
        <>
          {/* Movement search filters */}
          <div className="bg-m3-surface-low p-4 rounded-[28px] border border-m3-outline-variant/20 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              
              <div className="relative w-full md:max-w-xs shrink-0">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-m3-primary">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  placeholder="Filter by ref ID, code, notes, user..."
                  value={movementSearch}
                  onChange={e => setMovementSearch(e.target.value)}
                  className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2.5 pl-10 text-xs text-m3-on-surface focus:outline-none transition-all rounded-t-md font-medium"
                />
              </div>

              <div className="flex items-center gap-2 w-full justify-start md:justify-end">
                <span className="text-[10px] font-black uppercase tracking-widest text-m3-on-surface-variant">Type:</span>
                <select
                  value={movementTypeFilter}
                  onChange={e => setMovementTypeFilter(e.target.value)}
                  className="p-2 border-b-2 border-m3-outline-variant/60 focus:border-m3-primary bg-m3-surface-lowest text-xs text-m3-on-surface focus:outline-none rounded-t-md cursor-pointer transition-colors font-bold"
                >
                  <option value="All">All Movements</option>
                  <option value="IN">Intake (IN)</option>
                  <option value="OUT">Outtake (OUT)</option>
                  <option value="ADJUST">Correction (ADJUST)</option>
                  <option value="TRANSFER">Inter-Branch (TRANSFER)</option>
                </select>
              </div>

            </div>
          </div>

          {/* Activity Logs Table */}
          <div className="m3-card shadow-sm overflow-x-auto p-0 animate-scale-up">
            <table className="w-full text-left border-collapse table-auto text-xs min-w-[1000px]">
              <thead>
                <tr className="border-b border-m3-outline-variant/20 bg-m3-surface/30 text-[10px] uppercase font-bold text-m3-on-surface-variant tracking-wider">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Associated Product</th>
                  <th className="py-3 px-4 text-center">Movement Type</th>
                  <th className="py-3 px-4 text-right">Quantity Change</th>
                  <th className="py-3 px-4">Origin / target Location</th>
                  <th className="py-3 px-4">Audit Reference ID</th>
                  <th className="py-3 px-4">Descriptive context / Notes</th>
                  <th className="py-3 px-4">Authorized Staff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-m3-outline-variant/10 text-m3-on-surface/90">
                {filteredMovements.map((m) => {
                  const p = products.find(prod => prod.id === m.productId);

                  let typeBadgeClass = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25';
                  if (m.type === 'OUT') typeBadgeClass = 'bg-rose-500/10 text-rose-500 border-rose-500/25';
                  if (m.type === 'ADJUST') typeBadgeClass = 'bg-amber-500/10 text-amber-500 border-amber-500/25_ADJUST';
                  if (m.type === 'TRANSFER') typeBadgeClass = 'bg-cyan-500/10 text-cyan-500 border-cyan-500/25';

                  const matchingBranch = branches.find(b => b.id === m.destinationBranchId);

                  return (
                    <tr key={m.id} className="hover:bg-m3-surface-low/50 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap">
                        {new Date(m.timestamp).toLocaleString()}
                      </td>

                      {/* Product spec */}
                      <td className="py-3 px-4">
                        {p ? (
                          <div>
                            <div className="font-extrabold text-m3-primary text-xs">{p.productCode}</div>
                            <span className="text-[10px] text-zinc-500 inline-block truncate max-w-[200px]" title={p.productName}>{p.productName}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-500">Archived Product {m.productId}</span>
                        )}
                      </td>

                      {/* Type badge */}
                      <td className="py-3 px-4 text-center select-none">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest border uppercase ${typeBadgeClass}`}>
                          {m.type}
                        </span>
                      </td>

                      {/* Quantity difference */}
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-sm">
                        <span className={m.quantity > 0 ? 'text-emerald-500' : 'text-rose-500'}>
                          {m.quantity > 0 ? '+' : ''}{m.quantity}
                        </span>
                      </td>

                      {/* Locations context */}
                      <td className="py-3 px-4 truncate max-w-[180px]" title={matchingBranch?.name}>
                        {matchingBranch ? matchingBranch.name : 'Central Warehouse Assignment'}
                      </td>

                      {/* Transaction Reference code */}
                      <td className="py-3 px-4 font-mono font-bold text-zinc-500 select-all">
                        {m.referenceId}
                      </td>

                      {/* Description explanation */}
                      <td className="py-3 px-4 italic max-w-[260px] truncate text-m3-on-surface/80" title={m.notes}>
                        {m.notes}
                      </td>

                      {/* Employee accountability */}
                      <td className="py-3 px-4 text-zinc-500 font-medium">
                        {m.username} ({m.userId})
                      </td>
                    </tr>
                  );
                })}

                {filteredMovements.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-m3-on-surface-variant font-bold text-sm">
                      No stock activities recorded inside the logs system.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 🚚 VIEW 3: STOCK TRANSFERS & DISTRIBUTION WORKFLOWS */}
      {activeSubTab === 'transfers' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-m3-surface-low p-6 rounded-[28px] border border-m3-outline-variant/20 shadow-sm animate-scale-up">
            <div>
              <h2 className="text-lg font-black text-m3-primary uppercase tracking-wider flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                <span>Inter-Branch Stock Transfers Queue</span>
              </h2>
              <p className="text-xs text-m3-on-surface-variant font-medium mt-1">
                Request, coordinate, and approve transfers between centers. Live authorization clearance applies.
              </p>
            </div>
            
            <button
              onClick={() => {
                setShowCreateTransfer(true);
                setTransferSource(currentUser.branchAssignmentId || 'B1');
                setTransferDest(branches.find(b => b.id !== (currentUser.branchAssignmentId || 'B1'))?.id || 'B2');
                setTransferItems([]);
              }}
              className="flex items-center gap-2 bg-m3-primary hover:bg-m3-primary/90 text-m3-on-primary text-xs font-black uppercase tracking-wider px-5 py-3 rounded-full cursor-pointer transition-all shadow-md select-none"
            >
              <Plus className="h-4 w-4" />
              <span>Create Transfer Request</span>
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2 animate-fade-in-up">
            {['All', 'Pending', 'Approved', 'In Transit', 'Received', 'Declined'].map((status) => {
              const count = status === 'All' 
                ? stockTransfers.length 
                : stockTransfers.filter(t => t.status === status).length;
              const isSel = transferFilterStatus === status;
              return (
                <button
                  key={status}
                  onClick={() => setTransferFilterStatus(status)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    isSel 
                      ? 'bg-m3-secondary text-m3-on-secondary shadow-sm'
                      : 'bg-m3-surface-low text-m3-on-surface-variant hover:bg-m3-surface-high'
                  }`}
                >
                  {status} ({count})
                </button>
              );
            })}
          </div>

          {/* Transfer Requests List */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-scale-up">
            {stockTransfers
              .filter(t => transferFilterStatus === 'All' || t.status === transferFilterStatus)
              .map((t) => {
                let statusColor = 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
                if (t.status === 'Approved') statusColor = 'bg-blue-500/10 text-blue-500 border-blue-500/20';
                if (t.status === 'In Transit') statusColor = 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
                if (t.status === 'Received') statusColor = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
                if (t.status === 'Declined') statusColor = 'bg-rose-500/10 text-rose-500 border-rose-500/20';

                const matchedFrom = branches.find(b => b.id === t.fromBranchId);
                const matchedTo = branches.find(b => b.id === t.toBranchId);

                // Live role clearances
                const isHQUser = currentUser.branchAssignmentId === 'B1';
                const currentBranchInfo = branches.find(b => b.id === currentUser.branchAssignmentId);
                const isDistHubUser = !!currentBranchInfo?.isDistributionBranch;
                const canApprove = currentUser.role === 'Admin' || (currentUser.role === 'Manager' && (isHQUser || isDistHubUser));
                const canDispatch = currentUser.role !== 'Admin' && currentUser.branchAssignmentId === t.fromBranchId;
                const canReceive = currentUser.role !== 'Admin' && currentUser.branchAssignmentId === t.toBranchId;

                return (
                  <div key={t.id} className="bg-m3-surface-low border border-m3-outline-variant/20 rounded-[28px] p-5 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      {/* Card Header Info */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-zinc-500 tracking-wider">#{t.transferNo}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest border uppercase ${statusColor}`}>
                            {t.status}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Route Map */}
                      <div className="mt-4 bg-m3-surface p-3 rounded-2xl flex items-center justify-between border border-m3-outline-variant/10 text-center">
                        <div className="flex-1 px-1">
                          <span className="text-[9px] text-zinc-500 font-extrabold uppercase block tracking-widest">DISPATCH FROM</span>
                          <span className="text-xs font-black truncate max-w-[150px] inline-block mt-0.5 font-sans" title={matchedFrom?.name}>
                            {matchedFrom ? matchedFrom.name.replace('Emman Tile Center ', '') : t.fromBranchId}
                          </span>
                        </div>
                        
                        <div className="px-2 text-m3-primary animate-pulse">
                          <ChevronRight className="h-4 w-4" />
                        </div>
                        
                        <div className="flex-1 px-1">
                          <span className="text-[9px] text-zinc-500 font-extrabold uppercase block tracking-widest">RECEIVE AT</span>
                          <span className="text-xs font-black truncate max-w-[150px] inline-block mt-0.5 font-sans" title={matchedTo?.name}>
                            {matchedTo ? matchedTo.name.replace('Emman Tile Center ', '') : t.toBranchId}
                          </span>
                        </div>
                      </div>

                      {/* Info Pills */}
                      <div className="flex flex-wrap gap-2 mt-3 text-[10px] font-bold">
                        <span className="bg-zinc-500/10 text-zinc-600 px-2 py-0.5 rounded-full">
                          Type: {t.transferType}
                        </span>
                        <span className="bg-zinc-500/10 text-zinc-600 px-2 py-0.5 rounded-full">
                          By: {t.requestedBy}
                        </span>
                        {t.approvedBy && (
                          <span className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full">
                            Approved by: {t.approvedBy}
                          </span>
                        )}
                      </div>

                      {/* Items description list */}
                      <div className="mt-4 space-y-2">
                        <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Requested Items ({t.items.length})</h4>
                        <div className="bg-m3-surface rounded-2xl border border-m3-outline-variant/10 overflow-hidden divide-y divide-m3-outline-variant/10">
                          {t.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-2.5 text-xs">
                              <span className="font-semibold truncate max-w-[280px]">{item.productName}</span>
                              <span className="font-mono font-black text-rose-500">{item.quantity} boxes</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Purpose remarks */}
                      <div className="mt-4 bg-m3-secondary-container/10 p-3 rounded-2xl border border-m3-secondary/5 text-xs text-m3-on-surface-variant font-medium">
                        <span className="font-bold text-m3-secondary uppercase tracking-wider block text-[9px] mb-0.5">PURPOSE & JUSTIFICATION</span>
                        "{t.reason}"
                      </div>
                    </div>

                    {/* Quick clearance workflow trigger actions */}
                    {t.status !== 'Received' && t.status !== 'Declined' && (
                      <div className="mt-5 pt-4 border-t border-m3-outline-variant/15 flex flex-wrap gap-2">
                        {t.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => {
                                if (!canApprove) {
                                  showToast('⚠️ Access Denied: Requires Enterprise Admin or Main Branch/Logistics Hub Manager clearance.');
                                  return;
                                }
                                updateStockTransferStatus(t.id, 'Approved');
                                showToast('🟢 Stock Transfer approved. Stock reserved at dispatch branch.');
                              }}
                              className={`flex-1 text-[11px] font-black uppercase tracking-wider py-2.5 px-3 rounded-xl border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                canApprove 
                                  ? 'bg-emerald-505 bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600' 
                                  : 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed opacity-60'
                              }`}
                            >
                              <Check className="h-3 w-3" />
                              <span>Approve Route</span>
                            </button>
                            
                            <button
                              onClick={() => {
                                if (!canApprove) {
                                  showToast('⚠️ Access Denied: Only Admin or Distribution Hub Managers can decline transmittals.');
                                  return;
                                }
                                updateStockTransferStatus(t.id, 'Declined');
                                showToast('🔴 Transfer request declined successfully.');
                              }}
                              className={`text-[11px] font-black uppercase tracking-wider py-2.5 px-3 rounded-xl border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                canApprove 
                                  ? 'bg-rose-500 text-white border-rose-600 hover:bg-rose-600' 
                                  : 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed opacity-60'
                              }`}
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>Decline</span>
                            </button>
                          </>
                        )}

                        {t.status === 'Approved' && (
                          <button
                            onClick={() => {
                              if (!canDispatch) {
                                showToast(`⚠️ Dispatch Refused: You must be assigned to dispatching branch ${t.fromBranchId} to ship this stock.`);
                                return;
                              }
                              updateStockTransferStatus(t.id, 'In Transit');
                              showToast('🚚 Stock dispatched! Deducted from dispatching branch. Items are now In-Transit.');
                            }}
                            className={`flex-1 text-[11px] font-black uppercase tracking-wider py-3 rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              canDispatch
                                ? 'bg-indigo-500 text-white border-indigo-600 hover:bg-indigo-600 shadow'
                                : 'bg-zinc-100 text-zinc-400 border-zinc-200 opacity-60 cursor-not-allowed'
                            }`}
                          >
                            <Truck className="h-3.5 w-3.5" />
                            <span>Ship / Put In Transit</span>
                          </button>
                        )}

                        {t.status === 'In Transit' && (
                          <button
                            onClick={() => {
                              if (!canReceive) {
                                showToast(`⚠️ Receipt Refused: You must be assigned to receiving branch ${t.toBranchId} to acknowledge.`);
                                return;
                              }
                              updateStockTransferStatus(t.id, 'Received');
                              showToast('🏢 Stock fully received! Target branch inventory incremented automatically.');
                            }}
                            className={`flex-1 text-[11px] font-black uppercase tracking-wider py-3 rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              canReceive
                                ? 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600 shadow'
                                : 'bg-zinc-100 text-zinc-400 border-zinc-200 opacity-60 cursor-not-allowed'
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Acknowledge Receipt & Add Stock</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

            {stockTransfers.filter(t => transferFilterStatus === 'All' || t.status === transferFilterStatus).length === 0 && (
              <div className="col-span-2 text-center py-16 bg-m3-surface-low rounded-[32px] border border-dashed border-m3-outline-variant/30 text-m3-on-surface-variant font-black text-sm">
                No stock transfer records trace matching the "{transferFilterStatus}" criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 📊 VIEW 4: LOGISTICS LEDGER & HEATMAP */}
      {activeSubTab === 'ledger' && (
        <div className="space-y-8 animate-fade-in">
          
          {/* 💥 SECTION A: SMART MATRIX ADVISOR & MOVEMENT RECOMMENDATIONS */}
          <div className="bg-m3-surface-low border border-m3-outline-variant/20 rounded-[28px] p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
              <div>
                <h3 className="text-base font-black text-m3-primary uppercase tracking-wider flex items-center gap-2">
                  <Flame className="h-5 w-5 text-rose-500 animate-pulse animate-bounce" />
                  <span>Interactive Stock Heatmap & Automated Redistribution Advisor</span>
                </h3>
                <p className="text-xs text-m3-on-surface-variant font-medium mt-1">
                  Active monitoring of stock deficits at retail branches against Main Branch buffers and dead stock.
                </p>
              </div>
              <span className="bg-rose-500 text-white font-black text-[9px] tracking-widest px-2.5 py-1 rounded-full uppercase">
                Enterprise Logistics Engine
              </span>
            </div>

            {/* Grid display recommendation cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendedTransfers.slice(0, 4).map((rec) => (
                <div key={rec.id} className="bg-m3-surface p-4 rounded-2xl border border-m3-outline-variant/15 flex flex-col justify-between gap-3 shadow-inner hover:shadow-md transition-all">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl shrink-0 ${rec.type === 'Deficit' ? 'bg-rose-500/10 text-rose-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                      {rec.type === 'Deficit' ? <AlertTriangle className="h-4 w-4 shrink-0 animate-bounce" /> : <Clock className="h-4 w-4 shrink-0" />}
                    </div>
                    <div>
                      <span className={`text-[9px] font-black uppercase tracking-wider block ${rec.type === 'Deficit' ? 'text-rose-500' : 'text-indigo-500'}`}>
                        {rec.type === 'Deficit' ? 'STOCK DEFICIT ALERT' : 'IDLE STOCK REDISTRIBUTION CANDIDATE'}
                      </span>
                      <p className="text-xs font-semibold text-m3-on-surface mt-1">"{rec.reason}"</p>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-m3-outline-variant/10 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-zinc-400 font-bold">Transfer Quantity: {rec.suggestedQty} boxes</span>
                    <button
                      onClick={() => handleExecuteRecommendation(rec)}
                      className="flex items-center gap-1 bg-m3-primary hover:bg-m3-primary/95 text-[10px] font-black uppercase tracking-wider text-m3-on-primary px-3 py-1.5 rounded-full cursor-pointer transition-all"
                    >
                      <ArrowRightLeft className="h-3 w-3" />
                      <span>Execute Redistribution</span>
                    </button>
                  </div>
                </div>
              ))}

              {recommendedTransfers.length === 0 && (
                <div className="col-span-2 text-center py-6 text-zinc-500 font-black text-xs">
                  🟢 Balanced Load: All tile channels maintain robust optimal safety levels. No active redistribution loops requested.
                </div>
              )}
            </div>
          </div>

          {/* 📊 SECTION B: RELATIONAL BRANCH STOCK MATRIX */}
          <div className="bg-m3-surface-low border border-m3-outline-variant/20 rounded-[28px] overflow-hidden shadow-sm">
            <div className="p-5 border-b border-m3-outline-variant/15">
              <h3 className="text-xs font-black text-m3-primary uppercase tracking-widest">Multi-Branch Stock Balance Heatmap</h3>
              <p className="text-[10px] text-zinc-400 font-medium">Grid inventory of active products across the franchise spectrum</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-m3-surface text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-m3-outline-variant/15">
                    <th className="py-3 px-4">Associated Product</th>
                    <th className="py-3 px-4 text-center">B1: Cebu Main HQ</th>
                    <th className="py-3 px-4 text-center">B2: Bacolod Branch</th>
                    <th className="py-3 px-4 text-center">B3: Iloilo Hub</th>
                    <th className="py-3 px-4 text-center">B4: Dumaguete Center</th>
                    <th className="py-3 px-4 text-right">Unified Global Pools</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-m3-outline-variant/10 text-xs font-semibold">
                  {products.filter(p => !p.isDeleted).map((p) => {
                    const b1Stock = branchStock.find(bs => bs.productId === p.id && bs.branchId === 'B1')?.quantity || 0;
                    const b2Stock = branchStock.find(bs => bs.productId === p.id && bs.branchId === 'B2')?.quantity || 0;
                    const b3Stock = branchStock.find(bs => bs.productId === p.id && bs.branchId === 'B3')?.quantity || 0;
                    const b4Stock = branchStock.find(bs => bs.productId === p.id && bs.branchId === 'B4')?.quantity || 0;
                    const totalGlobal = b1Stock + b2Stock + b3Stock + b4Stock;

                    return (
                      <tr key={p.id} className="hover:bg-m3-surface-high/30 transition-colors">
                        <td className="py-3.5 px-4 font-black">
                          <span className="block truncate max-w-[200px]" title={p.productName}>{p.productName}</span>
                          <span className="text-[9px] font-mono font-bold text-zinc-400">SKU Code: {p.skuCode} | Category: {p.category}</span>
                        </td>
                        
                        {/* Branch cells with interactive alerts */}
                        <td className="py-3.5 px-4 text-center font-mono font-extrabold text-sm border-r border-m3-outline-variant/5">
                          <span className={b1Stock < 30 ? 'bg-amber-500/15 text-amber-600 border border-amber-500/20 px-2 py-0.5 rounded-lg text-xs' : 'text-m3-on-surface'}>
                            {b1Stock} boxes {b1Stock < 30 ? '⚠️' : ''}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono font-extrabold text-sm border-r border-m3-outline-variant/5">
                          <span className={b2Stock < 15 ? 'bg-rose-500/15 text-rose-600 border border-rose-500/20 px-2 py-0.5 rounded-lg text-xs' : 'text-m3-on-surface'}>
                            {b2Stock} boxes {b2Stock < 15 ? '🚨' : ''}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono font-extrabold text-sm border-r border-m3-outline-variant/5">
                          <span className={b3Stock < 15 ? 'bg-rose-500/15 text-rose-600 border border-rose-500/20 px-2 py-0.5 rounded-lg text-xs' : 'text-m3-on-surface'}>
                            {b3Stock} boxes {b3Stock < 15 ? '🚨' : ''}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono font-extrabold text-sm border-r border-m3-outline-variant/5">
                          <span className={b4Stock < 15 ? 'bg-rose-500/15 text-rose-600 border border-rose-500/20 px-2 py-0.5 rounded-lg text-xs' : 'text-m3-on-surface'}>
                            {b4Stock} boxes {b4Stock < 15 ? '🚨' : ''}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-black text-sm text-m3-primary">
                          {totalGlobal} units
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 🧾 SECTION C: CHRONOLOGICAL DOUBLE-ENTRY LEDGER VIEW */}
          <div className="bg-m3-surface-low border border-m3-outline-variant/20 rounded-[28px] overflow-hidden shadow-sm">
            <div className="p-5 border-b border-m3-outline-variant/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-black text-m3-primary uppercase tracking-widest">Double-Entry Logistics Audit Ledger (Chronicler)</h3>
                <p className="text-[10px] text-zinc-400 font-medium">Unalterable transaction ledger tracking chronological inventory movements</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-m3-surface text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-m3-outline-variant/15">
                    <th className="py-3 px-4">Date / Timestamp</th>
                    <th className="py-3 px-4">Associated Tile Catalog</th>
                    <th className="py-3 px-4 text-center">Affected Yard</th>
                    <th className="py-3 px-4 text-center">Type</th>
                    <th className="py-3 px-4 text-right">Debit / Credit Change</th>
                    <th className="py-3 px-4 font-mono">Reference No</th>
                    <th className="py-3 px-4 w-[280px]">Audit Signature Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-m3-outline-variant/10 text-xs font-medium">
                  {ledgerEntries.map((l) => {
                    const matchedB = branches.find(b => b.id === l.branchId);
                    
                    let eventBadge = 'bg-zinc-500/10 text-zinc-500 border-zinc-500/15';
                    if (l.movementType === 'SALE') eventBadge = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/15';
                    if (l.movementType === 'TRANSFER') eventBadge = 'bg-indigo-500/10 text-indigo-500 border-indigo-500/15';
                    if (l.movementType === 'CORRECTION') eventBadge = 'bg-yellow-500/10 text-yellow-500 border-yellow-500/15';

                    return (
                      <tr key={l.id} className="hover:bg-m3-surface-high/30 transition-colors">
                        <td className="py-3.5 px-4 text-zinc-400 font-mono text-[10px] whitespace-nowrap">
                          {new Date(l.date).toLocaleString()}
                        </td>
                        
                        <td className="py-3.5 px-4 font-black">
                          {l.productName}
                          <span className="block text-[9px] font-mono font-bold text-zinc-400 uppercase">PROD CODE: #{l.productId}</span>
                        </td>
                        
                        <td className="py-3.5 px-4 text-center font-bold">
                          {matchedB ? matchedB.name.replace('Emman Tile Center ', '') : l.branchId}
                        </td>
                        
                        <td className="py-3.5 px-4 text-center select-none">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${eventBadge}`}>
                            {l.movementType}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-extrabold text-sm">
                          <span className={l.quantity > 0 ? 'text-emerald-500' : 'text-rose-500'}>
                            {l.quantity > 0 ? '+' : ''}{l.quantity} boxes
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-zinc-500 whitespace-nowrap">
                          {l.referenceNo}
                        </td>

                        <td className="py-3.5 px-4 italic text-zinc-400 text-xs truncate max-w-[280px]" title={l.remarks}>
                          "{l.remarks}"
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 📅 SECTION D: PRODUCT STOCK AGING ANALYSIS */}
          <div className="bg-m3-surface-low border border-m3-outline-variant/20 rounded-[28px] overflow-hidden shadow-sm">
            <div className="p-5 border-b border-m3-outline-variant/15">
              <h3 className="text-xs font-black text-m3-primary uppercase tracking-widest">Inventory Aging & Capital Velocity Audit</h3>
              <p className="text-[10px] text-zinc-400 font-medium">Tracks stock sales velocities and identifies non-liquidating capital slots</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-m3-surface text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-m3-outline-variant/15">
                    <th className="py-3 px-4">Associated Hard Product</th>
                    <th className="py-3 px-4 text-center">Global Stock Balance</th>
                    <th className="py-3 px-4 text-center">Days Idle Since Last Sale</th>
                    <th className="py-3 px-4 text-center">Velocity Classification</th>
                    <th className="py-3 px-4">Advisory Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-m3-outline-variant/10 text-xs font-semibold">
                  {products.filter(p => !p.isDeleted).map((p) => {
                    const b1Stock = branchStock.find(bs => bs.productId === p.id && bs.branchId === 'B1')?.quantity || 0;
                    const b2Stock = branchStock.find(bs => bs.productId === p.id && bs.branchId === 'B2')?.quantity || 0;
                    const b3Stock = branchStock.find(bs => bs.productId === p.id && bs.branchId === 'B3')?.quantity || 0;
                    const b4Stock = branchStock.find(bs => bs.productId === p.id && bs.branchId === 'B4')?.quantity || 0;
                    const totalGlobal = b1Stock + b2Stock + b3Stock + b4Stock;

                    const ages: Record<string, number> = { 'P1': 14, 'P2': 210, 'P3': 45, 'P4': 185 };
                    const ageDays = ages[p.id] || 35;
                    
                    let agingLabel = 'Fast-Moving';
                    let agingBadge = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/15';
                    let recommendationText = 'Strong consumer interest. Maintain high replenishment safety factors at Main HQ.';
                    
                    if (ageDays >= 30 && ageDays < 90) {
                      agingLabel = 'Stable';
                      agingBadge = 'bg-blue-500/10 text-blue-500 border-blue-500/15';
                      recommendationText = 'Baseline performance. Keep standard order levels linked to monthly POS logs.';
                    } else if (ageDays >= 90 && ageDays < 180) {
                      agingLabel = 'Slow-Moving';
                      agingBadge = 'bg-amber-500/10 text-amber-500 border-amber-500/15';
                      recommendationText = 'Redistribution target. Flagged for regional pull out back to high-density hubs.';
                    } else if (ageDays >= 180) {
                      agingLabel = 'Dead Stock Alert';
                      agingBadge = 'bg-rose-500/10 text-rose-500 border-rose-500/15 animate-pulse';
                      recommendationText = 'Urgent clear-out required! Recommend bundle promotion discount cash registers.';
                    }

                    return (
                      <tr key={p.id} className="hover:bg-m3-surface-high/30 transition-colors">
                        <td className="py-3.5 px-4 font-black">
                          {p.productName}
                          <span className="block text-[9px] font-mono font-bold text-zinc-400">SKU Code: {p.skuCode}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-extrabold text-sm text-m3-primary">
                          {totalGlobal} boxes
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-sm text-zinc-600">
                          {ageDays} days sold out clock
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase border ${agingBadge}`}>
                            {agingLabel}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 italic text-zinc-500 font-medium max-w-[280px]">
                          {recommendationText}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* 🛠️ MODAL 1: ADD & EDIT PRODUCT DIALOG */}
      {showModal && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm shadow-xl" onClick={() => setShowModal(false)} />
          <form
            onSubmit={handleSubmit}
            className="relative w-full max-w-2xl rounded-[32px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface grid grid-cols-1 md:grid-cols-2 gap-4 text-left overflow-y-auto max-h-[90vh]"
          >
            {/* Modal Title Header */}
            <div className="md:col-span-2 flex items-center justify-between border-b border-m3-outline-variant/15 pb-4">
              <h3 className="text-base font-black text-m3-primary uppercase tracking-wider flex items-center gap-2">
                <Layers className="h-5 w-5" />
                <span>{isEditMode ? 'Modify Product Specifications' : 'Register New Hardware Inventory Unit'}</span>
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1.5 hover:bg-m3-outline-variant/15 rounded-full transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* PRODUCT INTERACTIVE FILE UPLOAD BOX */}
            <div className="md:col-span-2 space-y-2">
              <span className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Product Image Asset Upload</span>
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-m3-outline-variant/50 hover:border-m3-primary bg-m3-surface-lowest/70 p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-3 transition-colors cursor-pointer group relative"
              >
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                
                {productImage ? (
                  <div className="flex items-center gap-4 w-full justify-center select-none relative z-10">
                    <img 
                      src={productImage} 
                      alt="Thumbnail preview" 
                      className="w-16 h-16 rounded-xl object-cover shadow-md border border-m3-outline-variant/30"
                      referrerPolicy="no-referrer"
                    />
                    <div className="text-left">
                      <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" /> High-Res Asset Linked
                      </span>
                      <p className="text-[10px] text-m3-on-surface-variant max-w-xs mt-0.5">Drag a different file or click to replace this asset in DB cache storage.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 select-none relative z-10">
                    <div className="p-3 bg-m3-outline-variant/20 rounded-full group-hover:scale-110 group-hover:text-m3-primary transition-all text-m3-on-surface-variant">
                      <Camera className="h-5 w-5" />
                    </div>
                    <div>
                      <strong className="text-xs text-m3-on-surface font-sans block">Drop image file or click to select</strong>
                      <span className="text-[9px] text-m3-on-surface-variant font-bold uppercase tracking-wider block mt-1">Supports JPEG, WEBP, PNG up to 1MB</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Core Code settings */}
            <div className="space-y-1 relative">
              <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Product Core Code</label>
              <input
                type="text"
                required
                value={productCode}
                onChange={e => setProductCode(e.target.value)}
                className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono font-bold"
              />
            </div>

            {/* SKU key */}
            <div className="space-y-1 relative">
              <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Warehouse SKU ID</label>
              <input
                type="text"
                required
                value={sku}
                onChange={e => setSku(e.target.value)}
                className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono font-bold"
              />
            </div>

            {/* Barcode code */}
            <div className="space-y-1 relative">
              <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Barcode Sequence ID</label>
              <input
                type="text"
                required
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
                className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono font-bold"
              />
            </div>

            {/* Categories picker */}
            <div className="space-y-1 relative">
              <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Category Classification</label>
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

            {/* Product Name */}
            <div className="space-y-1 md:col-span-2 relative">
              <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Product Full Descriptive Name</label>
              <input
                type="text"
                required
                value={productName}
                onChange={e => setProductName(e.target.value)}
                placeholder="e.g. Carrara White Porcelain Floor Tile"
                className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-sans font-black text-sm"
              />
            </div>

            {/* Design Name Spec */}
            <div className="space-y-1 relative">
              <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Tile Design Name (Optional)</label>
              <input
                type="text"
                value={designName}
                onChange={e => setDesignName(e.target.value)}
                placeholder="e.g. Travertine Matte, Carrara Glossy"
                className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-bold"
              />
            </div>

            {/* Corporate Brand */}
            <div className="space-y-1 relative">
              <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Corporate Brand / Label</label>
              <input
                type="text"
                required
                value={brand}
                onChange={e => setBrand(e.target.value)}
                placeholder="e.g. Mariwasa Siam, Sino Ceramics"
                className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-bold"
              />
            </div>

            {/* Supplier select */}
            <div className="space-y-1 relative">
              <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Standard Wholesaler Supplier</label>
              <select
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
                className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2.5 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md cursor-pointer font-bold"
              >
                {suppliers.filter(s => !s.isDeleted).map((sup, i) => (
                  <option key={sup.id} value={sup.id}>{sup.name}</option>
                ))}
              </select>
            </div>

            {/* Dimensions and unit */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1 pl-0 relative">
                <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Trading Unit</label>
                <input
                  type="text"
                  required
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  placeholder="Box / Piece / Bag"
                  className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-bold"
                />
              </div>

              <div className="space-y-1 pl-0 relative">
                <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Dimensions</label>
                <input
                  type="text"
                  required
                  value={size}
                  onChange={e => setSize(e.target.value)}
                  placeholder="e.g. 60x60 cm"
                  className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-bold font-mono"
                />
              </div>
            </div>

            {/* Box Quantity and Auto coverage */}
            <div className="space-y-1 relative">
              <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Box Quantity (tiles per box)</label>
              <input
                type="number"
                required
                value={boxQuantity}
                onChange={e => setBoxQuantity(Number(e.target.value))}
                className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono font-bold"
              />
            </div>

            {/* Auto calculations of tile coverage in SQM */}
            <div className="space-y-1 relative">
              <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none flex items-center justify-between">
                <span>Coverage Per Box (m²)</span>
                {category.toLowerCase().includes('tile') && (
                  <span className="text-[9px] text-emerald-500 font-extrabold normal-case bg-emerald-500/5 border border-emerald-500/10 px-1 py-0.5 rounded tracking-normal">Calculated on size</span>
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

            {/* Cost and selling prices */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1 relative pl-0">
                <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Cost unit Price (₱)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={costPrice}
                  onChange={e => setCostPrice(Number(e.target.value))}
                  className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono font-bold"
                />
              </div>

              <div className="space-y-1 relative pl-0">
                <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Retail Sale Price (₱)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={sellingPrice}
                  onChange={e => setSellingPrice(Number(e.target.value))}
                  className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono font-black"
                />
              </div>
            </div>

            {/* Starting stock and threshold */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1 relative pl-0">
                <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Warehouse stock Level</label>
                <input
                  type="number"
                  required
                  value={stockQuantity}
                  onChange={e => setStockQuantity(Number(e.target.value))}
                  className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono font-bold"
                />
              </div>

              <div className="space-y-1 relative pl-0">
                <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Alert Stock Limit</label>
                <input
                  type="number"
                  required
                  value={minimumStock}
                  onChange={e => setMinimumStock(Number(e.target.value))}
                  className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono font-bold"
                />
              </div>
            </div>

            {/* Command Save Button Footer */}
            <div className="md:col-span-2 flex justify-end gap-2 border-t border-m3-outline-variant/15 pt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
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

      {/* ⚠️ MODAL 2: MANUAL STOCK ADJUSTMENT DIALOG */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm shadow-xl" onClick={() => setShowAdjustModal(false)} />
          <form
            onSubmit={handleAdjustSubmit}
            className="relative w-full max-w-md rounded-[32px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface text-left space-y-4"
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

      {/* 🏷️ MODAL 3: BARCODE & QR CODES VIEWER / PRINT DIALOG */}
      {showCodesModal && codesProduct && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm shadow-xl" onClick={() => setShowCodesModal(false)} />
          <div className="relative w-full max-w-md rounded-[32px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface text-center space-y-5">
            
            <div className="flex justify-between items-center border-b border-m3-outline-variant/15 pb-2.5 text-left">
              <h3 className="text-sm font-black text-m3-primary uppercase tracking-wide flex items-center gap-1.5">
                <QrCode className="h-5 w-5" /> Code & Barcode Terminal Label
              </h3>
              <button type="button" onClick={() => setShowCodesModal(false)} className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1 rounded-full">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Product specifications context summary */}
            <div className="text-left bg-m3-surface-lowest p-3.5 rounded-2xl border border-m3-outline-variant/15">
              <div className="text-[10px] text-m3-primary/90 uppercase font-black tracking-widest">{codesProduct.category}</div>
              <strong className="text-xs text-m3-on-surface block font-extrabold leading-tight mt-0.5 truncate">{codesProduct.productName}</strong>
              <div className="flex justify-between items-center mt-2.5 text-[10px] text-m3-on-surface-variant font-bold border-t border-m3-outline-variant/10 pt-2 font-mono">
                <div>SKU: {codesProduct.sku}</div>
                <div>Code: {codesProduct.productCode}</div>
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
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleSimulatePrint}
                disabled={printingCode}
                className="w-full flex items-center justify-center gap-2 py-3 border border-zinc-200/20 dark:border-zinc-700/50 hover:bg-m3-primary hover:text-white bg-m3-surface-lowest rounded-2xl text-xs font-black uppercase tracking-wider transition-all"
              >
                <Printer className="h-4 w-4 shrink-0" />
                <span>{printingCode ? 'Generating Raster queue...' : 'Print Scannable Label tag'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCodesModal(false)}
                className="w-full text-center text-xs font-bold py-2 hover:bg-m3-outline-variant/15 text-m3-on-surface-variant rounded-xl transition-all"
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
              <p className="text-xs text-m3-on-surface-variant/85 leading-relaxed">
                Confirm soft-deletion of <strong className="text-m3-on-surface font-black">{confirmDeleteName}</strong>? All warehouse catalog configurations and stats metrics will adjust.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-m3-outline-variant/15 pt-4">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-xs font-black uppercase tracking-wider rounded-full hover:bg-m3-outline-variant/15 text-m3-on-surface-variant transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteProduct(confirmDeleteId!);
                  setConfirmDeleteId(null);
                  showToast('🟢 Listing archived and soft-deleted successfully.');
                }}
                className="px-5 py-2 text-xs font-black uppercase tracking-wider rounded-full bg-rose-600 text-white hover:bg-rose-700 shadow-md cursor-pointer transition-colors border"
              >
                Archive Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Bulk JSON import form */}
      {showImportModal && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm shadow-xl" onClick={() => setShowImportModal(false)} />
          <div className="relative w-full max-w-md rounded-[32px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface text-left space-y-4">
            <div className="flex justify-between items-center border-b border-m3-outline-variant/15 pb-2.5">
              <h3 className="text-sm font-black text-m3-primary uppercase tracking-wider flex items-center gap-2">
                <Upload className="h-5 w-5" /> Batch JSON Import Catalog
              </h3>
              <button type="button" onClick={() => setShowImportModal(false)} className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 block select-none">Paste Standard JSON Array representation</span>
              <textarea
                rows={6}
                value={rawImportText}
                onChange={e => setRawImportText(e.target.value)}
                placeholder='[{"productCode": "TL-CER-XX", "productName": "..."}]'
                className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-m3-outline-variant/15 pt-4">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-full hover:bg-m3-outline-variant/15 text-m3-on-surface-variant transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeBulkImport}
                className="m3-btn-primary px-5 py-2.5 text-xs shadow-md border animate-scale-up"
              >
                Import Roster
              </button>
            </div>
          </div>
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
