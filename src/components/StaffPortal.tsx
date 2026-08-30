/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

import { useDb, useDbProducts, useDbBranchStock } from '../context/DbContext';
import { Product } from '../types/db';
import { getBranchStockQuantity, getBranchStockRecord, isProductInBranch } from '../lib/branchUtils';
import { formatCurrency } from '../utils/formatters';
import { isTileProduct } from '../utils/productUtils';
import {
  QrCode,
  Search,
  Power,
  Package,
  Info,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Volume2,
  VolumeX,
  Smartphone,
  ChevronRight,
  Calculator as CalcIcon,
  Camera,
  X,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Check,
  ChevronDown,
  Accessibility,
  CheckCircle2
} from 'lucide-react';
import {
  HeroButton,
  HeroCard,
  HeroChip,
  HeroInput,
  HeroTooltip,
} from './common/ui';
import { ToastNotification } from './ToastNotification';

interface StaffPortalProps {
  darkMode?: boolean;
  setDarkMode?: (dark: boolean) => void;
}

export const StaffPortal: React.FC<StaffPortalProps> = ({ darkMode: _darkMode, setDarkMode: _setDarkMode }) => {
  const products = useDbProducts();
  const branchStock = useDbBranchStock();
  const { currentUser, logout, branches, holdSale } = useDb();

  // Customer order cart states
  const [staffCart, setStaffCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Scanning & searching states
  const [searchQuery, setSearchQuery] = useState('');
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Handshake and transmission states
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  // View toggles within our scan view
  const [isCalculatorExpanded, setIsCalculatorExpanded] = useState(false);
  const [isCartOverlayOpen, setIsCartOverlayOpen] = useState(false);
  const [catalogCategory, setCatalogCategory] = useState<'ALL' | 'TILES' | 'SUPPLIES'>('ALL');

  // Video capture refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Tile coverage calculator states (initially standard 60x60 size)
  const [calcRoomLength, setCalcRoomLength] = useState('4');
  const [calcRoomWidth, setCalcRoomWidth] = useState('3.5');
  const [calcTileLength, setCalcTileLength] = useState('60');
  const [calcTileWidth, setCalcTileWidth] = useState('60');
  const [calcBoxDensity, setCalcBoxDensity] = useState('4');
  const [calcWastagePercent, setCalcWastagePercent] = useState('10');

  // Calculated variables
  const [calcAreaSqm, setCalcAreaSqm] = useState(0);
  const [_calcTilesPlain, setCalcTilesPlain] = useState(0);
  const [calcTilesWithWastage, setCalcTilesWithWastage] = useState(0);
  const [calcBoxesNeeded, setCalcBoxesNeeded] = useState(0);

  // Load target branch-specific products for this staff assignment
  const userBranchId = currentUser?.branchAssignmentId || 'B1';

  // Fast O(1) stock map lookup table to prevent O(N*M) loop on every render
  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < branchStock.length; i++) {
      const bs = branchStock[i];
      if (bs && bs.productId && (bs.branchId === userBranchId || bs.branchId === 'B1')) {
        map.set(bs.productId, bs.quantity ?? 0);
      }
    }
    return map;
  }, [branchStock, userBranchId]);

  const getStockQty = useCallback((p: Product | undefined | null): number => {
    if (!p) return 0;
    if (stockMap.has(p.id)) return stockMap.get(p.id)!;
    return getBranchStockQuantity(p, userBranchId, branchStock, branches);
  }, [stockMap, userBranchId, branchStock, branches]);

  // Strictly filter products that are assigned to and stocked in the staff member's branch
  const staffBranchProducts = useMemo(() => {
    const raw = products.filter(p => !p.isDeleted && isProductInBranch(p, userBranchId, branchStock, branches));
    return [...raw].sort((a, b) => {
      const qtyA = stockMap.get(a.id) ?? (a.stockQuantity ?? 0);
      const qtyB = stockMap.get(b.id) ?? (b.stockQuantity ?? 0);
      const inStockA = qtyA > 0 ? 1 : 0;
      const inStockB = qtyB > 0 ? 1 : 0;
      if (inStockA !== inStockB) {
        return inStockB - inStockA;
      }
      return a.productName.localeCompare(b.productName);
    });
  }, [products, stockMap, userBranchId, branchStock, branches]);

  // Search filter matches (memoized)
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return staffBranchProducts.filter(p =>
      (p.productName || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  }, [searchQuery, staffBranchProducts]);

  // Standard Web Audio synthesizer beep sound
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitched scan beep
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.warn('Audio check blocked by user gesture restrictions.', e);
    }
  };

  // Close camera helper
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Open actual video camera stream for phone viewfinder PWA feel
  const startCameraStream = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    setScanMessage('Scanning room surface tracking active...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Prefer back-facing camera
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error('Webcam target denied:', err);
      setCameraError(
        'Physical camera stream restricted. Direct barcode input and interactive SKU simulator pre-loaded!'
      );
    }
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  // Compute calculator in real-time
  useEffect(() => {
    const length = parseFloat(calcRoomLength) || 0;
    const width = parseFloat(calcRoomWidth) || 0;
    const tLengthM = (parseFloat(calcTileLength) || 0) / 100;
    const tWidthM = (parseFloat(calcTileWidth) || 0) / 100;
    const boxQty = parseFloat(calcBoxDensity) || 1;
    const wasteMultiplier = 1 + (parseFloat(calcWastagePercent) || 0) / 100;

    const area = length * width;
    setCalcAreaSqm(parseFloat(area.toFixed(2)));

    const singleTileArea = tLengthM * tWidthM;
    if (singleTileArea > 0 && area > 0) {
      const rawNeeded = Math.ceil(area / singleTileArea);
      setCalcTilesPlain(rawNeeded);

      const computedWithWastage = Math.ceil(rawNeeded * wasteMultiplier);
      setCalcTilesWithWastage(computedWithWastage);

      const boxes = Math.ceil(computedWithWastage / boxQty);
      setCalcBoxesNeeded(boxes);
    } else {
      setCalcTilesPlain(0);
      setCalcTilesWithWastage(0);
      setCalcBoxesNeeded(0);
    }
  }, [calcRoomLength, calcRoomWidth, calcTileLength, calcTileWidth, calcBoxDensity, calcWastagePercent]);

  // Handle SKU match / simulate barcode match
  const handleSelectProduct = (prod: Product) => {
    playBeep();
    setScannedProduct(prod);
    setSearchQuery('');
    setScanMessage(`Verified: ${prod.productName}`);
    stopCameraStream();

    setTimeout(() => {
      setScanMessage(null);
    }, 4000);
  };

  const handleCopyToCalc = (prod: Product) => {
    if (!isTileProduct(prod)) {
      showToast('Estimator is strictly reserved for Tile items (Porcelain, Ceramic, Granite, Marble).');
      return;
    }
    const sizeStr = prod.size || '60x60 cm';
    const cleanNumbers = sizeStr.replace(/[^0-9x]/gi, '');
    const dimensions = cleanNumbers.split('x');

    if (dimensions.length >= 2 && dimensions[0] && dimensions[1]) {
      setCalcTileLength(dimensions[0]);
      setCalcTileWidth(dimensions[1]);
    }

    if (prod.boxQuantity) {
      setCalcBoxDensity(prod.boxQuantity.toString());
    }

    setIsCalculatorExpanded(true);
    playBeep();
    showToast(`Tile specs for ${prod.productName} copied to Estimator!`);
  };

  const getBranchStockInfo = (prod: Product) => {
    const branchName = branches.find(b => b.id === currentUser?.branchAssignmentId)?.name || 'This Branch';
    const qty = getStockQty(prod);
    const bsRec = getBranchStockRecord(prod, userBranchId, branchStock, branches);
    const threshold = bsRec?.lowStockThresholdOverride ?? prod.minimumStock ?? 10;
    const isOutOfStock = qty <= 0;
    const isCritical = qty > 0 && qty <= threshold;

    return {
      branchName,
      qty,
      isOutOfStock,
      isCritical,
      stockClass: isOutOfStock
        ? 'text-danger bg-danger/10 border-danger/20'
        : isCritical
        ? 'text-warning bg-warning/10 border-warning/20'
        : 'text-primary bg-primary/10 border-primary/20'
    };
  };

  // Cart helper functions
  const handleAddToStaffCart = (prod: Product) => {
    const availableQty = getStockQty(prod);
    if (availableQty <= 0) {
      showToast(`Cannot add ${prod.productName}: NO STOCKS available!`);
      return;
    }
    playBeep();
    setStaffCart(prev => {
      const existing = prev.find(item => item.product.id === prod.id);
      if (existing) {
        if (existing.quantity >= availableQty) {
          showToast(`Stock limit reached (${availableQty} ${prod.unit}s available)!`);
          return prev;
        }
        return prev.map(item =>
          item.product.id === prod.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product: prod, quantity: 1 }];
    });
    showToast(`Added to cart: ${prod.productName}`);
  };

  const handleUpdateCartQty = (prodId: string, delta: number) => {
    setStaffCart(prev => {
      const targetItem = prev.find(item => item.product.id === prodId);
      if (targetItem && delta > 0) {
        const availableQty = getStockQty(targetItem.product);
        if (targetItem.quantity + delta > availableQty) {
          showToast(`Stock limit reached (${availableQty} ${targetItem.product.unit}s in stock)!`);
          return prev;
        }
      }
      return prev.map(item => {
        if (item.product.id === prodId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const handleRemoveFromCart = (prodId: string) => {
    setStaffCart(prev => prev.filter(item => item.product.id !== prodId));
    showToast('Removed item from cart.');
  };

  const handlePublishOrder = async () => {
    if (staffCart.length === 0) {
      showToast('Cannot publish an empty order!');
      return;
    }

    // Check stock availability for all cart items
    for (const item of staffCart) {
      const avail = getStockQty(item.product);
      if (avail <= 0) {
        showToast(`Order failed: "${item.product.productName}" has NO STOCKS available!`);
        return;
      }
      if (item.quantity > avail) {
        showToast(`Order failed: "${item.product.productName}" only has ${avail} units in stock!`);
        return;
      }
    }

    const cleanCustomerName = customerName.trim() || 'Walk-in Customer (Handheld Portal)';

    setIsTransmitting(true);

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        const holdId = holdSale(staffCart, cleanCustomerName, orderNotes, userBranchId);

        setStaffCart([]);
        setCustomerName('');
        setOrderNotes('');
        setIsCartOverlayOpen(false);
        playBeep();

        setScanMessage(`Pre-Saved Order Code: ${holdId}`);
        setTimeout(() => {
          setScanMessage(null);
        }, 6000);

        resolve();
      }, 1200);
    });

    setIsTransmitting(false);
    setShowSuccessAlert(true);
    setTimeout(() => {
      setShowSuccessAlert(false);
    }, 4000);
  };

  // Summary figures
  const totalCartItemsCount = staffCart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartPrice = staffCart.reduce((sum, item) => sum + (item.product.sellingPrice * item.quantity), 0);

  return (
    <div className="w-full max-w-md mx-auto min-h-screen flex flex-col bg-background text-foreground relative pb-28">
      {/* 1. HEROUI v3 SPECIALIZED HANDHELD HEADER */}
      <header className="p-3.5 border-b border-divider/20 flex justify-between items-center bg-content1/90 backdrop-blur-md sticky top-0 z-30 shadow-sm rounded-b-2xl">
        {/* Left Side: Brand Logo tag */}
        <div className="flex items-center gap-2" id="staff-header-left">
          <div className="p-2 bg-primary text-primary-foreground rounded-xl shadow-sm">
            <Package className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-black tracking-tight uppercase text-primary">TilePoint</span>
            <div className="text-[9px] font-bold text-default-500 uppercase tracking-widest leading-none mt-0.5">Staff Portal</div>
          </div>
        </div>

        {/* Center: User Tag */}
        <div className="text-center">
          <HeroChip size="sm" variant="flat" color="primary" className="font-bold text-[10px]">
            {currentUser?.fullName || 'Staff Member'}
          </HeroChip>
        </div>

        {/* Right Side: Accessibility & Logout */}
        <div className="flex items-center gap-1.5" id="staff-header-right">
          <HeroTooltip content="Accessibility Controls" placement="bottom">
            <HeroButton
              isIconOnly
              size="sm"
              variant="flat"
              color="default"
              className="rounded-xl"
              onClick={() => window.dispatchEvent(new Event('open-privacy-hub'))}
              id="accessibility-toggle-staff"
            >
              <Accessibility className="h-4 w-4 text-default-600" />
            </HeroButton>
          </HeroTooltip>

          <HeroTooltip content="Safely Sign Out" placement="bottom">
            <HeroButton
              isIconOnly
              size="sm"
              variant="flat"
              color="danger"
              className="rounded-xl"
              onClick={() => logout()}
              id="logout-staff"
            >
              <Power className="h-4 w-4 text-danger" />
            </HeroButton>
          </HeroTooltip>
        </div>
      </header>

      {/* SUB-HEADER USER STATISTICS CARD */}
      <div className="p-3">
        <HeroCard variant="flat" className="p-3 bg-content1/80 border border-divider/20 rounded-2xl flex items-center justify-between text-left text-xs">
          <div className="space-y-0.5">
            <div className="font-extrabold text-foreground flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <Smartphone className="h-3.5 w-3.5 text-primary" />
              <span>Scanning Hub Connected</span>
            </div>
            <span className="font-semibold text-[11px] text-default-500 block">
              {branches.find(b => b.id === currentUser?.branchAssignmentId)?.name || 'Main Warehouse Branch'}
            </span>
          </div>

          <HeroButton
            size="sm"
            variant={soundEnabled ? 'flat' : 'bordered'}
            color={soundEnabled ? 'primary' : 'default'}
            className="rounded-xl font-bold text-[11px] gap-1.5 h-8 px-2.5"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5 text-default-400" />}
            <span>{soundEnabled ? 'Beep ON' : 'Muted'}</span>
          </HeroButton>
        </HeroCard>
      </div>

      {/* MAIN UNIFIED WORKSPACE */}
      <div className="flex-1 p-3 space-y-4">
        {/* LARGE BARCODE / SKU LOOKUP BOX WITH CAMERA TOGGLE */}
        {!products.some(p => !p.isDeleted) ? (
          <HeroCard variant="flat" className="bg-warning-50/10 border border-warning/20 p-4 rounded-2xl text-left space-y-2">
            <div className="flex items-center gap-2 text-warning font-black text-xs uppercase tracking-wider">
              <AlertTriangle className="h-4 w-4" /> Scanner Offline / Catalog Empty
            </div>
            <p className="text-xs text-default-600 font-medium leading-relaxed">
              No inventory or tile catalog records exist. The barcode scanner and manual item SKU inputs are locked until catalog products are added via the Inventory module.
            </p>
          </HeroCard>
        ) : (
          <HeroCard variant="bordered" className="bg-content1/80 border border-divider/25 rounded-2xl p-4 shadow-sm space-y-3.5 text-left">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black tracking-wider uppercase text-primary block">
                Scan or Type Product SKU / Barcode
              </label>
              <HeroChip size="sm" variant="dot" color="primary" className="text-[9px]">
                {staffBranchProducts.length} in Branch Catalog
              </HeroChip>
            </div>

            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <HeroInput
                  id="staff-search-input-unified"
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search SKU, brand, or name..."
                  size="md"
                  variant="bordered"
                  className="w-full text-xs font-semibold"
                  startContent={<Search className="h-4 w-4 text-default-400" />}
                  endContent={
                    searchQuery ? (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="text-default-400 hover:text-foreground cursor-pointer p-0.5 rounded-full"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : undefined
                  }
                />
              </div>

              {!isCameraActive ? (
                <HeroButton
                  isIconOnly
                  size="md"
                  color="primary"
                  variant="flat"
                  className="rounded-xl shrink-0"
                  onClick={startCameraStream}
                  id="btn-trigger-camera-unified"
                  title="Launch Camera Viewfinder"
                >
                  <Camera className="h-5 w-5" />
                </HeroButton>
              ) : (
                <HeroButton
                  isIconOnly
                  size="md"
                  color="danger"
                  variant="flat"
                  className="rounded-xl shrink-0"
                  onClick={stopCameraStream}
                  id="btn-close-camera-unified"
                  title="Close Camera Viewfinder"
                >
                  <X className="h-5 w-5" />
                </HeroButton>
              )}
            </div>

            {/* DYNAMIC AUTO-SUGGEST LIST */}
            {searchQuery.trim() !== '' && (
              <div className="bg-content1 border border-divider rounded-2xl overflow-hidden shadow-xl max-h-52 overflow-y-auto z-20 relative animate-fade-in">
                <div className="p-2 border-b border-divider/10 text-[9px] uppercase font-black text-primary tracking-wide bg-content2/50 flex justify-between items-center">
                  <span>Matching Catalog</span>
                  <span>{filteredProducts.length} results</span>
                </div>
                {filteredProducts.map((p, idx) => {
                  const stockQty = getStockQty(p);
                  const isNoStock = stockQty <= 0;
                  return (
                    <button
                      key={p.id || idx}
                      onClick={() => handleSelectProduct(p)}
                      className={`w-full text-left p-3 hover:bg-primary/5 transition-all flex items-center justify-between border-b border-divider/5 last:border-0 font-medium ${
                        isNoStock ? 'bg-danger/5' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="text-xs text-foreground font-bold truncate flex items-center gap-1.5 flex-wrap">
                          <span className="truncate">{p.productName}</span>
                          {isNoStock ? (
                            <HeroChip size="sm" variant="flat" color="danger" className="text-[8px] h-4">
                              OUT OF STOCK
                            </HeroChip>
                          ) : (
                            <HeroChip size="sm" variant="flat" color="primary" className="text-[8px] h-4">
                              {stockQty} {p.unit || 'pcs'}
                            </HeroChip>
                          )}
                        </div>
                        <div className="text-[10px] text-default-500 font-medium mt-0.5">
                          SKU: {p.sku} • {formatCurrency(p.sellingPrice)}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-primary shrink-0" />
                    </button>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <div className="p-4 text-center text-xs text-default-500 font-medium">
                    No matching products in current branch inventory.
                  </div>
                )}
              </div>
            )}
          </HeroCard>
        )}

        {/* 3A. PHYSICAL WEBCAM VIEWFINDER / CAMERA STREAM BOX */}
        {isCameraActive && (
          <HeroCard variant="bordered" className="border-2 border-dashed border-primary/40 relative overflow-hidden bg-content1 rounded-2xl p-3 text-left" id="camera-viewport-card">
            <div className="relative w-full h-[260px] sm:h-[300px] bg-black rounded-xl overflow-hidden shadow-xl flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Laser scanning brackets */}
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none p-4">
                <div className="w-[180px] h-[180px] sm:w-[210px] sm:h-[210px] border-2 border-primary/40 rounded-2xl relative shadow-[0_0_20px_rgba(var(--heroui-primary-rgb,0,111,238),0.25)] bg-primary/[0.04]">
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-primary rounded-tl-sm" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-primary rounded-tr-sm" />
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-primary rounded-bl-sm" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-primary rounded-br-sm" />
                  <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-primary opacity-95 animate-scan-line shadow-[0_0_15px_rgba(var(--heroui-primary-rgb,0,111,238),0.95)]" />
                </div>
              </div>

              {/* Status Chips */}
              <div className="absolute top-3 left-3 z-20">
                <HeroChip size="sm" variant="solid" color="danger" className="text-[9px] font-black uppercase tracking-wider">
                  Live Viewfinder
                </HeroChip>
              </div>

              <div className="absolute top-3 right-3 z-20">
                <HeroChip size="sm" variant="flat" color="primary" className="text-[9px] font-black uppercase tracking-wider backdrop-blur-md">
                  Active Session
                </HeroChip>
              </div>

              {cameraError && (
                <div className="absolute inset-0 z-30 bg-background/95 flex flex-col justify-center items-center text-center p-4 text-xs space-y-3 text-default-700">
                  <AlertTriangle className="h-8 w-8 text-warning" />
                  <p className="font-extrabold max-w-[260px] text-foreground leading-normal">{cameraError}</p>
                  <HeroButton
                    size="sm"
                    color="primary"
                    variant="solid"
                    className="rounded-full font-bold text-[10px] uppercase tracking-wider"
                    onClick={startCameraStream}
                  >
                    Retry Connection
                  </HeroButton>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center mt-3 relative z-10">
              <span className="text-[10px] text-default-500 font-bold">Align product barcode inside frame</span>
              <HeroButton
                size="sm"
                color="danger"
                variant="flat"
                className="rounded-full text-[10px] font-black uppercase h-7 px-3"
                onClick={stopCameraStream}
              >
                Hide Viewfinder
              </HeroButton>
            </div>
          </HeroCard>
        )}

        {/* FEEDBACK STATUS BAR */}
        {scanMessage && (
          <HeroCard variant="flat" className="bg-primary/10 border border-primary/30 p-3 rounded-2xl text-center text-primary text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span>{scanMessage}</span>
          </HeroCard>
        )}

        {/* LIVE ITEM DETAIL CARD */}
        {scannedProduct ? (
          <HeroCard variant="bordered" className="bg-content1 border border-divider/35 rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in relative overflow-hidden text-left" id="spec-display-box-unified">
            {/* Corner status label */}
            <div className="absolute top-3.5 right-3.5">
              {getStockQty(scannedProduct) <= 0 ? (
                <HeroChip size="sm" variant="flat" color="danger" className="text-[9px] font-black uppercase">
                  NO STOCKS
                </HeroChip>
              ) : (
                <HeroChip size="sm" variant="flat" color="primary" className="text-[9px] font-black uppercase">
                  SCANNED
                </HeroChip>
              )}
            </div>

            <div className="border-b border-divider/10 pb-3 text-left">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <HeroChip size="sm" variant="flat" color="primary" className="text-[9px] font-black uppercase">
                  {scannedProduct.category}
                </HeroChip>
                {isTileProduct(scannedProduct) ? (
                  <HeroChip size="sm" variant="bordered" color="primary" className="text-[9px] font-bold">
                    Tile Item • Estimator Ready
                  </HeroChip>
                ) : (
                  <HeroChip size="sm" variant="bordered" color="warning" className="text-[9px] font-bold">
                    Non-Tile Supply
                  </HeroChip>
                )}
              </div>
              <h3 className="text-sm font-black text-foreground leading-snug">
                {scannedProduct.productName}
              </h3>
              <div className="text-[10px] text-default-500 font-bold tracking-wide mt-1 uppercase">
                SKU: <span className="text-primary font-black">{scannedProduct.sku}</span> • Barcode: {scannedProduct.barcode || 'N/A'}
              </div>
            </div>

            {/* RETAIL PRICE & CORE INVENTORY GRID */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-content2/50 border border-divider/20 rounded-xl p-3 text-center space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-default-500 block">Unit Price</span>
                <div className="text-lg font-black text-primary">
                  {formatCurrency(scannedProduct.sellingPrice)}
                </div>
                <span className="text-[10px] text-default-500 font-semibold">per {scannedProduct.unit}</span>
              </div>

              {(() => {
                const stats = getBranchStockInfo(scannedProduct);
                return (
                  <div className={`border rounded-xl p-3 text-center space-y-1 transition-all ${stats.stockClass}`}>
                    <span className="text-[9px] font-black uppercase tracking-widest text-default-500 block">Available Stock</span>
                    <div className="text-lg font-black">
                      {stats.qty} {scannedProduct.unit}s
                    </div>
                    <span className="text-[9px] block font-black uppercase tracking-wider">
                      {stats.isOutOfStock ? 'NO STOCKS' : stats.isCritical ? 'Low Stock' : 'In Stock'}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* SPEC SHEET DETAILS */}
            <div className="space-y-2 border-t border-divider/15 pt-3 text-xs leading-relaxed font-medium text-default-500">
              <div className="flex justify-between items-center font-semibold text-[11px] border-b border-divider/5 pb-1.5">
                <span>Design Finish:</span>
                <span className="text-foreground font-bold">{scannedProduct.designName || 'Standard Plain'}</span>
              </div>
              <div className="flex justify-between items-center font-semibold text-[11px] border-b border-divider/5 pb-1.5">
                <span>Dimensions / Size:</span>
                <span className="text-foreground font-bold">{scannedProduct.size || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center font-semibold text-[11px] border-b border-divider/5 pb-1.5">
                <span>Brand Manufacturer:</span>
                <span className="text-foreground font-bold uppercase">{scannedProduct.brand || 'Standard'}</span>
              </div>
              <div className="flex justify-between items-center font-semibold text-[11px] pb-1">
                <span>Packing Factor:</span>
                <span className="text-foreground font-bold">
                  {scannedProduct.category?.toLowerCase().includes('tile')
                    ? `${scannedProduct.boxQuantity || 1} tiles / box`
                    : `${scannedProduct.boxQuantity || 1} ${scannedProduct.unit || 'pcs'} / pack`}
                </span>
              </div>
            </div>

            {/* ACTIONS ON SCAN CARD */}
            <div className="border-t border-divider/15 pt-4 space-y-2">
              <HeroButton
                color="primary"
                variant="solid"
                size="lg"
                className="w-full font-black uppercase tracking-wider text-xs rounded-xl shadow-md gap-2"
                onClick={() => handleAddToStaffCart(scannedProduct)}
                disabled={getStockQty(scannedProduct) <= 0}
              >
                <ShoppingCart className="h-4 w-4" />
                <span>
                  {getStockQty(scannedProduct) <= 0
                    ? 'NO STOCKS — ADD DISABLED'
                    : 'Add to Staged Cart'}
                </span>
              </HeroButton>

              <div className="grid grid-cols-2 gap-2">
                {isTileProduct(scannedProduct) ? (
                  <HeroButton
                    size="sm"
                    color="primary"
                    variant="flat"
                    className="font-bold text-[10px] uppercase rounded-xl gap-1.5"
                    onClick={() => handleCopyToCalc(scannedProduct)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Send to Estimator</span>
                  </HeroButton>
                ) : (
                  <div className="py-2 px-2 bg-content2/40 border border-divider/20 text-default-400 rounded-xl text-[9px] font-bold uppercase tracking-wider flex items-center justify-center text-center select-none">
                    Non-Tile Supply
                  </div>
                )}

                <HeroButton
                  size="sm"
                  variant="bordered"
                  className="font-bold text-[10px] uppercase rounded-xl"
                  onClick={() => {
                    setScannedProduct(null);
                    showToast('Cleared specifications lookup.');
                  }}
                >
                  Clear Lookup
                </HeroButton>
              </div>
            </div>
          </HeroCard>
        ) : (
          <HeroCard variant="flat" className="bg-content1/60 border border-divider/20 rounded-2xl p-8 text-center text-default-500 border-dashed space-y-3">
            <QrCode className="h-10 w-10 text-primary/40 mx-auto" />
            <div>
              <h4 className="text-xs font-bold text-foreground">No Product Selected</h4>
              <p className="text-[11px] text-default-500 mt-1 max-w-[240px] mx-auto leading-normal">
                Type details above or tap any item in the floor catalog below to pull stock data.
              </p>
            </div>
          </HeroCard>
        )}

        {/* EXPANDABLE QUICK CALCULATOR */}
        <HeroCard variant="bordered" className="bg-content1/80 border border-divider/25 rounded-2xl overflow-hidden shadow-sm text-left">
          <button
            type="button"
            onClick={() => setIsCalculatorExpanded(!isCalculatorExpanded)}
            className="w-full p-4 flex items-center justify-between font-black text-xs text-foreground uppercase tracking-wide hover:bg-content2/40 transition-colors focus:outline-none cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <CalcIcon className="h-4 w-4 text-primary" />
              <span>Workspace Tile Estimator</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-primary font-bold">
              <span>{isCalculatorExpanded ? 'Collapse' : 'Expand'}</span>
              <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isCalculatorExpanded ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {isCalculatorExpanded && (
            <div className="p-4 border-t border-divider/10 space-y-4 animate-fade-in text-xs leading-normal font-medium text-default-500">
              {/* Room Ground dimensions in Meters */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-primary uppercase block">Room Length (m)</label>
                  <HeroInput
                    type="number"
                    step="0.1"
                    size="sm"
                    variant="bordered"
                    value={calcRoomLength}
                    onChange={e => setCalcRoomLength(e.target.value)}
                    className="font-bold text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-primary uppercase block">Room Width (m)</label>
                  <HeroInput
                    type="number"
                    step="0.1"
                    size="sm"
                    variant="bordered"
                    value={calcRoomWidth}
                    onChange={e => setCalcRoomWidth(e.target.value)}
                    className="font-bold text-xs"
                  />
                </div>
              </div>

              {/* Tile sizes in CM */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-primary uppercase block">Tile Length (cm)</label>
                  <HeroInput
                    type="number"
                    size="sm"
                    variant="bordered"
                    value={calcTileLength}
                    onChange={e => setCalcTileLength(e.target.value)}
                    className="font-bold text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-primary uppercase block">Tile Width (cm)</label>
                  <HeroInput
                    type="number"
                    size="sm"
                    variant="bordered"
                    value={calcTileWidth}
                    onChange={e => setCalcTileWidth(e.target.value)}
                    className="font-bold text-xs"
                  />
                </div>
              </div>

              {/* Factors */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-primary uppercase block">Tiles Per Box</label>
                  <HeroInput
                    type="number"
                    size="sm"
                    variant="bordered"
                    value={calcBoxDensity}
                    onChange={e => setCalcBoxDensity(e.target.value)}
                    className="font-bold text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-primary uppercase block">Wastage (%)</label>
                  <HeroInput
                    type="number"
                    size="sm"
                    variant="bordered"
                    value={calcWastagePercent}
                    onChange={e => setCalcWastagePercent(e.target.value)}
                    className="font-bold text-xs"
                  />
                </div>
              </div>

              {/* Results bar */}
              <div className="bg-content2/60 border border-divider/20 p-3.5 rounded-xl space-y-2 text-xs font-semibold">
                <div className="flex justify-between items-center text-[11px] border-b border-divider/10 pb-1.5">
                  <span className="text-default-500">Floor Surface Area:</span>
                  <span className="text-foreground font-black">{calcAreaSqm} SQM</span>
                </div>
                <div className="flex justify-between items-center text-[11px] border-b border-divider/10 pb-1.5">
                  <span className="text-default-500">Tiles Required ({calcWastagePercent}% waste):</span>
                  <span className="text-foreground font-black">{calcTilesWithWastage} pcs</span>
                </div>
                <div className="flex justify-between items-center bg-primary/10 p-2.5 rounded-lg">
                  <span className="text-primary text-[10px] font-black uppercase">Packaging Boxes Needed</span>
                  <span className="text-primary font-black text-sm">{calcBoxesNeeded} Boxes</span>
                </div>
              </div>
            </div>
          )}
        </HeroCard>

        {/* FLOOR QUICK-SCAN CATALOG */}
        <div className="space-y-2 pt-2 text-left">
          <div className="flex justify-between items-center px-1 flex-wrap gap-1">
            <span className="text-[10px] font-black tracking-wider text-primary uppercase block">
              Floor Quick-Scan Catalog
            </span>
            <div className="flex gap-1">
              <HeroButton
                size="sm"
                variant={catalogCategory === 'ALL' ? 'solid' : 'flat'}
                color={catalogCategory === 'ALL' ? 'primary' : 'default'}
                className="h-6 px-2 text-[9px] font-bold uppercase rounded-lg"
                onClick={() => setCatalogCategory('ALL')}
              >
                All
              </HeroButton>
              <HeroButton
                size="sm"
                variant={catalogCategory === 'TILES' ? 'solid' : 'flat'}
                color={catalogCategory === 'TILES' ? 'primary' : 'default'}
                className="h-6 px-2 text-[9px] font-bold uppercase rounded-lg"
                onClick={() => setCatalogCategory('TILES')}
              >
                Tiles
              </HeroButton>
              <HeroButton
                size="sm"
                variant={catalogCategory === 'SUPPLIES' ? 'solid' : 'flat'}
                color={catalogCategory === 'SUPPLIES' ? 'warning' : 'default'}
                className="h-6 px-2 text-[9px] font-bold uppercase rounded-lg"
                onClick={() => setCatalogCategory('SUPPLIES')}
              >
                Supplies
              </HeroButton>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {staffBranchProducts
              .filter(p => {
                if (catalogCategory === 'TILES') return isTileProduct(p);
                if (catalogCategory === 'SUPPLIES') return !isTileProduct(p);
                return true;
              })
              .map((p, idx) => {
                const isTile = isTileProduct(p);
                const qty = getStockQty(p);
                const isNoStock = qty <= 0;
                return (
                  <HeroCard
                    key={p.id || idx}
                    variant="bordered"
                    className={`p-2.5 bg-content1 border ${
                      isNoStock ? 'border-danger/30 bg-danger/5' : 'border-divider/20'
                    } rounded-xl flex items-center justify-between text-left transition-all shrink-0`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectProduct(p)}
                      className="flex-1 text-left truncate min-w-0 font-medium focus:outline-none cursor-pointer pr-1"
                    >
                      <div className="text-[10.5px] text-foreground font-bold truncate leading-tight">{p.productName}</div>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <span className="text-[8px] text-default-500 font-semibold">{p.sku}</span>
                        <HeroChip size="sm" variant="flat" color={isTile ? 'primary' : 'default'} className="text-[7.5px] h-3.5 px-1 font-bold">
                          {isTile ? 'TILE' : 'ITEM'}
                        </HeroChip>
                        {isNoStock ? (
                          <HeroChip size="sm" variant="flat" color="danger" className="text-[7.5px] h-3.5 px-1 font-bold">
                            OUT
                          </HeroChip>
                        ) : (
                          <HeroChip size="sm" variant="flat" color="success" className="text-[7.5px] h-3.5 px-1 font-bold">
                            {qty} left
                          </HeroChip>
                        )}
                      </div>
                    </button>

                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      <HeroButton
                        isIconOnly
                        size="sm"
                        variant={isNoStock ? 'flat' : 'solid'}
                        color={isNoStock ? 'default' : 'primary'}
                        className="rounded-lg h-7 w-7"
                        disabled={isNoStock}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToStaffCart(p);
                        }}
                        title={isNoStock ? 'Out of stock' : 'Add to cart'}
                      >
                        {isNoStock ? <X className="h-3 w-3 text-default-400" /> : <Plus className="h-3.5 w-3.5" />}
                      </HeroButton>
                    </div>
                  </HeroCard>
                );
              })}
          </div>
        </div>
      </div>

      {/* PERSISTENT FLOATING 'CART' SUMMARY BUTTON FOR CASHIER QUEUE */}
      <div className="fixed bottom-4 left-0 right-0 max-w-md mx-auto px-4 z-40">
        <HeroButton
          id="btn-floating-cart-view"
          onClick={() => setIsCartOverlayOpen(true)}
          color="primary"
          variant="solid"
          className="w-full py-6 px-5 rounded-2xl shadow-xl flex items-center justify-between transition-all transform hover:scale-[1.01] cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="relative bg-black/20 p-2 rounded-xl">
              <ShoppingCart className="h-5 w-5 text-white" />
              {totalCartItemsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-black rounded-full text-[9px] px-1.5 py-0.5 font-black">
                  {totalCartItemsCount}
                </span>
              )}
            </div>
            <div className="text-left font-bold">
              <div className="text-[10px] uppercase font-bold text-primary-foreground/80 tracking-wider leading-none">
                Review Active Cart
              </div>
              <div className="text-xs font-black text-white mt-1">
                {totalCartItemsCount > 0 ? `${totalCartItemsCount} item${totalCartItemsCount > 1 ? 's' : ''} staged` : 'Cart is empty'}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] uppercase font-bold text-primary-foreground tracking-wider block leading-none">Total</span>
            <span className="text-sm font-black text-white block mt-1">
              {formatCurrency(totalCartPrice)}
            </span>
          </div>
        </HeroButton>
      </div>

      {/* CASHIER QUEUE OVERLAY DRAWER / SLIDE-UP SHEET */}
      {isCartOverlayOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center animate-fade-in">
          <div className="absolute inset-0" onClick={() => setIsCartOverlayOpen(false)} />

          <div className="bg-content1 border-t border-divider/30 rounded-t-2xl w-full max-w-md max-h-[88vh] overflow-y-auto p-4 z-10 relative flex flex-col space-y-4 shadow-2xl text-left">
            {/* Handle/Close Header */}
            <div className="flex justify-between items-center pb-2 border-b border-divider/10">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4.5 w-4.5 text-primary" />
                <span className="text-xs font-black uppercase tracking-wider text-primary">Staged Cart Dispatch</span>
              </div>
              <HeroButton
                isIconOnly
                size="sm"
                variant="flat"
                className="rounded-full"
                onClick={() => setIsCartOverlayOpen(false)}
              >
                <X className="h-4 w-4" />
              </HeroButton>
            </div>

            {/* CART LIST OR PLACEHOLDER */}
            {staffCart.length === 0 ? (
              <div className="py-12 text-center text-default-500 space-y-3">
                <ShoppingCart className="h-10 w-10 text-primary/30 mx-auto" />
                <div>
                  <h4 className="text-xs font-bold text-foreground">Staged cart is empty</h4>
                  <p className="text-[11px] text-default-500 mt-1 font-medium leading-normal">
                    Add catalog items on the scanner workspace to stage customer orders.
                  </p>
                </div>
                <HeroButton
                  size="sm"
                  color="primary"
                  variant="solid"
                  className="rounded-xl font-bold text-xs"
                  onClick={() => setIsCartOverlayOpen(false)}
                >
                  Return to Scanner
                </HeroButton>
              </div>
            ) : (
              <div className="space-y-4">
                {/* ITEMS LIST */}
                <HeroCard variant="bordered" className="bg-content2/30 border border-divider/15 rounded-2xl overflow-hidden">
                  <div className="divide-y divide-divider/10">
                    {staffCart.map((item, idx) => {
                      const totalItemPrice = item.product.sellingPrice * item.quantity;
                      const availStock = getStockQty(item.product);
                      const isNoStock = availStock <= 0;
                      return (
                        <div key={idx} className={`p-3 flex items-center justify-between gap-3 text-xs font-semibold ${isNoStock ? 'bg-danger/5' : ''}`}>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-xs font-bold text-foreground truncate">{item.product.productName}</h4>
                              {isNoStock ? (
                                <HeroChip size="sm" variant="flat" color="danger" className="text-[8px] h-3.5 px-1 font-bold">
                                  OUT OF STOCK
                                </HeroChip>
                              ) : (
                                <HeroChip size="sm" variant="flat" color="primary" className="text-[8px] h-3.5 px-1 font-bold">
                                  {availStock} avail
                                </HeroChip>
                              )}
                            </div>
                            <div className="text-[9px] text-default-500 mt-0.5 uppercase">
                              SKU: {item.product.sku} • {formatCurrency(item.product.sellingPrice)}
                            </div>
                          </div>

                          {/* Quick Adjust buttons */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <HeroButton
                              isIconOnly
                              size="sm"
                              variant="flat"
                              className="rounded-lg h-6 w-6"
                              onClick={() => handleUpdateCartQty(item.product.id, -1)}
                            >
                              <Minus className="h-2.5 w-2.5" />
                            </HeroButton>
                            <span className="w-5 text-center font-black text-xs text-foreground">
                              {item.quantity}
                            </span>
                            <HeroButton
                              isIconOnly
                              size="sm"
                              variant="flat"
                              className="rounded-lg h-6 w-6"
                              onClick={() => handleUpdateCartQty(item.product.id, 1)}
                            >
                              <Plus className="h-2.5 w-2.5" />
                            </HeroButton>
                          </div>

                          {/* Unit Total price */}
                          <div className="text-right shrink-0 min-w-[65px] flex flex-col items-end">
                            <span className="font-extrabold text-primary">
                              {formatCurrency(totalItemPrice)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(item.product.id)}
                              className="text-[9.5px] text-danger hover:text-danger-400 flex items-center gap-0.5 mt-0.5 cursor-pointer font-bold"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* SUB TOTAL BAR */}
                  <div className="p-3 bg-content2/50 border-t border-divider/10 text-xs font-bold flex justify-between items-center text-left">
                    <span className="text-default-500 uppercase tracking-wider text-[10px]">Staged Total</span>
                    <span className="text-sm font-black text-primary">
                      {formatCurrency(totalCartPrice)}
                    </span>
                  </div>
                </HeroCard>

                {/* FORM FOR CASHIER DESK */}
                <HeroCard variant="bordered" className="bg-content1 border border-divider/20 rounded-2xl p-4 space-y-3">
                  <h4 className="text-[10px] font-black tracking-widest text-primary uppercase border-b border-divider/10 pb-1.5 flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5" />
                    <span>Customer Queue Notes</span>
                  </h4>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-primary uppercase pl-0.5 block">Customer Name</label>
                      <HeroInput
                        type="text"
                        size="sm"
                        variant="bordered"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        placeholder="Customer Name / Walk-in"
                        className="font-semibold text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-primary uppercase pl-0.5 block">Floor Dispatch Remarks</label>
                      <textarea
                        value={orderNotes}
                        onChange={e => setOrderNotes(e.target.value)}
                        placeholder="Special handling, tile batching, or discount remarks"
                        rows={2}
                        className="w-full bg-content2/40 border border-divider/40 focus:border-primary px-3 py-1.5 text-xs text-foreground focus:outline-none rounded-xl font-medium resize-none"
                      />
                    </div>
                  </div>
                </HeroCard>

                {/* DISPATCH BUTTON */}
                <HeroButton
                  color="primary"
                  variant="solid"
                  size="lg"
                  className="w-full font-black uppercase tracking-wider text-xs rounded-2xl shadow-md gap-2"
                  onClick={handlePublishOrder}
                >
                  <Check className="h-4 w-4" />
                  <span>Send to Cashier Counter</span>
                </HeroButton>

                <div>
                  <HeroButton
                    variant="bordered"
                    size="sm"
                    className="w-full text-default-500 font-bold uppercase rounded-xl"
                    onClick={() => setIsCartOverlayOpen(false)}
                  >
                    Keep Staging / Return to Scanner
                  </HeroButton>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TWO-WAY TRANSPORTS HANDSHAKE MODAL */}
      {isTransmitting && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center z-[1000] p-6 text-center animate-fade-in select-none">
          <HeroCard variant="bordered" className="bg-content1 border border-primary/40 p-8 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-emerald-500 to-primary" />
            <div className="flex justify-center">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
            </div>
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Sending Cart to Cashier...</h3>
            <p className="text-[11px] text-default-500 leading-relaxed">
              Negotiating secure channel with Cashier POS terminal. Please wait...
            </p>
          </HeroCard>
        </div>
      )}

      {showSuccessAlert && (
        <div className="fixed top-6 right-6 left-6 mx-auto max-w-sm bg-content1 border-2 border-primary text-foreground p-4 rounded-2xl shadow-2xl z-[1000] flex items-center gap-3 animate-bounce select-none">
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-xs font-black uppercase tracking-wider text-primary">Handshake Verified</div>
            <div className="text-[11px] text-default-700 font-bold">Cart Successfully Sent to Cashier Counter</div>
          </div>
        </div>
      )}

      {/* QUICK FLOATING TOAST BAR */}
      <ToastContainerComponent />
    </div>
  );
};

// Global feedback micro-toast engine
let toastTimer: any = null;
let toastSetterCallback: ((msg: string) => void) | null = null;
function showToast(message: string) {
  if (toastSetterCallback) {
    toastSetterCallback(message);
  }
}

function ToastContainerComponent() {
  const [toastText, setToastText] = useState('');

  useEffect(() => {
    toastSetterCallback = (msg: string) => {
      setToastText(msg);
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        setToastText('');
      }, 2500);
    };
    return () => {
      toastSetterCallback = null;
    };
  }, []);

  if (!toastText) return null;
  return (
    <ToastNotification
      message={toastText}
      onClose={() => setToastText('')}
    />
  );
}
