/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useDb } from '../context/DbContext';
import { Product } from '../types/db';
import {
  QrCode,
  Search,
  Moon,
  Sun,
  Power,
  Package,
  Layers,
  Sparkles,
  Info,
  CheckCircle,
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
  Palette
} from 'lucide-react';

interface StaffPortalProps {
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export const StaffPortal: React.FC<StaffPortalProps> = ({ darkMode, setDarkMode }) => {
  const { currentUser, products, logout, branches, addAuditLog, holdSale } = useDb();

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

  // View toggles within our scan view
  const [isCalculatorExpanded, setIsCalculatorExpanded] = useState(false);
  const [isCartOverlayOpen, setIsCartOverlayOpen] = useState(false);

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
  const [calcTilesPlain, setCalcTilesPlain] = useState(0);
  const [calcTilesWithWastage, setCalcTilesWithWastage] = useState(0);
  const [calcBoxesNeeded, setCalcBoxesNeeded] = useState(0);

  // Load target branch-specific products for this staff assignment
  const staffBranchProducts = products.filter(p => !p.isDeleted);

  // Search filter matches
  const filteredProducts = searchQuery.trim() === ''
    ? []
    : staffBranchProducts.filter(p => 
        p.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
      );

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
    setScanMessage(`matched barcode: SKU ${prod.sku}`);
    stopCameraStream();
    
    // Auto audit log search/scan
    addAuditLog(
      'STAFF_LOOKUP',
      `Staff ${currentUser.fullName} checked price & stock of ${prod.productName} via handheld lookup/simulation.`,
      'Products',
      prod.id
    );

    // Alert popup feedback
    setScanMessage(`Verified: ${prod.productName}`);
    setTimeout(() => {
      setScanMessage(null);
    }, 4000);
  };

  const handleCopyToCalc = (prod: Product) => {
    // Attempt parse sizes e.g. "60x60 cm"
    const sizeStr = prod.size || '60x60 cm';
    const cleanNumbers = sizeStr.replace(/[^0-9x]/gi, ''); // keep only digits and 'x'
    const dimensions = cleanNumbers.split('x');

    if (dimensions.length >= 2) {
      setCalcTileLength(dimensions[0]);
      setCalcTileWidth(dimensions[1]);
    }
    
    if (prod.boxQuantity) {
      setCalcBoxDensity(prod.boxQuantity.toString());
    }

    // Expand calculator card
    setIsCalculatorExpanded(true);
    playBeep();
    showToast('Tile specs copied to Estimator!');
  };

  const getBranchStockInfo = (prod: Product) => {
    const branchName = branches.find(b => b.id === currentUser.branchAssignmentId)?.name || 'This Branch';
    const isOutOfStock = prod.stockQuantity <= 0;
    const isCritical = prod.stockQuantity <= prod.minimumStock;

    return {
      branchName,
      isOutOfStock,
      isCritical,
      stockClass: isOutOfStock 
        ? 'text-red-500 bg-red-500/10 border-red-500/20' 
        : isCritical 
          ? 'text-amber-500 bg-amber-500/10 border-amber-500/20 animate-pulse'
          : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
    };
  };

  // Cart helper functions
  const handleAddToStaffCart = (prod: Product) => {
    playBeep();
    setStaffCart(prev => {
      const existing = prev.find(item => item.product.id === prod.id);
      if (existing) {
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

  const handlePublishOrder = () => {
    if (staffCart.length === 0) {
      showToast('Cannot publish an empty order!');
      return;
    }
    const cleanCustomerName = customerName.trim() || 'Walk-in Customer (Handheld Portal)';
    const holdId = holdSale(staffCart, cleanCustomerName, orderNotes);
    
    // Reset state & inform user
    setStaffCart([]);
    setCustomerName('');
    setOrderNotes('');
    setIsCartOverlayOpen(false);
    
    playBeep();
    
    // Explicit long running toast or message
    setScanMessage(`Pre-Saved Order Code: ${holdId}`);
    setTimeout(() => {
      setScanMessage(null);
    }, 6000);
  };

  // Summary figures
  const totalCartItemsCount = staffCart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartPrice = staffCart.reduce((sum, item) => sum + (item.product.sellingPrice * item.quantity), 0);

  return (
    <div className="w-full max-w-md mx-auto min-h-screen flex flex-col bg-m3-surface text-m3-on-surface relative pb-24">
      
      {/* 1. COMPACT SPECIALIZED HEADER FOR PHONE SCREENS */}
      <header className="p-4 border-b border-m3-outline-variant/20 flex justify-between items-center bg-m3-surface-low sticky top-0 z-30 shadow-sm rounded-b-[20px]">
        {/* Left Side: Professional Corporate Logo tag */}
        <div className="flex items-center gap-1.5" id="staff-header-left">
          <div className="p-1.5 bg-m3-primary text-m3-on-primary m3-shape-asymmetric">
            <Package className="h-3.5 w-3.5" />
          </div>
          <span className="text-[13px] font-black tracking-tighter uppercase text-m3-primary font-mono">TilePoint</span>
        </div>

        {/* Center label */}
        <div className="text-center">
          <div className="text-[9px] font-black uppercase text-m3-primary tracking-widest leading-none">Handheld Scan View</div>
          <div className="text-[9px] font-bold text-zinc-500 lowercase leading-tight mt-0.5">{currentUser.fullName}</div>
        </div>

        {/* Right Side: Dark Theme trigger + Logout icon */}
        <div className="flex items-center gap-2" id="staff-header-right">
          <button
            id="theme-toggle-staff"
            onClick={() => setDarkMode(!darkMode)}
            className="p-2.5 rounded-xl border border-m3-outline-variant text-m3-primary hover:bg-m3-primary/10 transition-colors cursor-pointer"
            title="Toggle color theme"
          >
            {darkMode ? <Sun className="h-4 w-4 text-amber-500 animate-pulse" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            id="accessibility-toggle-staff"
            onClick={() => window.dispatchEvent(new Event('open-privacy-hub'))}
            className="p-2.5 rounded-xl border border-m3-outline-variant text-m3-primary hover:bg-m3-primary/10 transition-colors cursor-pointer"
            title="Privacy Policies & Accessibility Hub"
          >
            <Accessibility className="h-4 w-4" />
          </button>

          <button
            id="theme-colors-staff"
            onClick={() => window.dispatchEvent(new Event('open-privacy-hub'))}
            className="p-2.5 rounded-xl border border-m3-outline-variant text-m3-primary hover:bg-m3-primary/10 transition-colors cursor-pointer"
            title="Material Dynamic Theme Colors"
          >
            <Palette className="h-4 w-4" />
          </button>

          <button
            id="logout-staff"
            onClick={() => logout()}
            className="p-2.5 rounded-xl border border-rose-500/30 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Log out of Terminal"
          >
            <Power className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* SUB-HEADER USER STATISTICS CARD */}
      <div className="p-3">
        <div className="bg-m3-surface-container-lowest border border-m3-outline-variant/15 p-3 rounded-2xl flex items-center justify-between text-left text-xs text-m3-on-surface-variant animate-pulse-slow">
          <div className="space-y-0.5">
            <div className="font-extrabold text-m3-on-surface flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5 text-m3-primary text-emerald-500" />
              <span>Scanning Hub Connected</span>
            </div>
            <span className="font-bold text-[11px] text-zinc-400">
              {branches.find(b => b.id === currentUser.branchAssignmentId)?.name || 'HQ Warehouse'}
            </span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg border flex items-center gap-1.5 transition-all text-[11px] font-black uppercase tracking-wide cursor-pointer ${
              soundEnabled 
                ? 'border-m3-primary/30 text-m3-primary bg-m3-primary/5' 
                : 'border-zinc-500/20 text-zinc-400 bg-zinc-500/5'
            }`}
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-emerald-500" /> : <VolumeX className="h-3.5 w-3.5" />}
            <span>{soundEnabled ? 'Beep ON' : 'Mute'}</span>
          </button>
        </div>
      </div>

      {/* MAIN UNIFIED WORKSPACE */}
      <div className="flex-1 p-3 space-y-4">
        
        {/* LARGE BARCODE / SKU LOOKUP BOX WITH CAMERA TOGGLE */}
        <div className="bg-m3-surface-low border border-m3-outline-variant/25 rounded-3xl p-4 shadow-sm space-y-3.5 text-left">
          <label className="text-[10px] font-black tracking-wider uppercase text-m3-primary block">
            Scan Input (Type SKU / Brand or Tap Camera)
          </label>
          
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-m3-on-surface-variant/70" />
              <input
                id="staff-search-input-unified"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search catalog or simulation SKU..."
                className="w-full bg-m3-surface border-2 border-m3-outline-variant/40 px-10 py-3.5 text-sm placeholder-m3-on-surface-variant/50 focus:outline-none focus:border-m3-primary text-m3-on-surface font-extrabold tracking-wide rounded-2xl"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-m3-on-surface cursor-pointer rounded-full"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {!isCameraActive ? (
              <button
                id="btn-trigger-camera-unified"
                onClick={startCameraStream}
                className="p-3.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-2xl transition-all border border-emerald-500/25 cursor-pointer shrink-0 animate-pulse"
                title="Launch Live Scan Viewfinder"
              >
                <Camera className="h-5.5 w-5.5" />
              </button>
            ) : (
              <button
                id="btn-close-camera-unified"
                onClick={stopCameraStream}
                className="p-3.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-2xl transition-all border border-red-500/25 cursor-pointer shrink-0"
                title="Deactivate Viewfinder"
              >
                <X className="h-5.5 w-5.5" />
              </button>
            )}
          </div>

          {/* DYNAMIC AUTO-SUGGEST LIST */}
          {searchQuery.trim() !== '' && (
            <div className="bg-m3-surface border border-m3-outline-variant rounded-2xl overflow-hidden shadow-lg max-h-52 overflow-y-auto z-20 relative">
              <div className="p-2 border-b border-m3-outline-variant/10 text-[9px] uppercase font-black text-m3-primary tracking-wide bg-m3-surface-low">
                Matching Catalog ({filteredProducts.length})
              </div>
              {filteredProducts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectProduct(p)}
                  className="w-full text-left p-3 hover:bg-emerald-500/5 transition-all flex items-center justify-between border-b border-m3-outline-variant/5 last:border-0 font-bold"
                >
                  <div>
                    <div className="text-xs text-m3-on-surface font-extrabold truncate">{p.productName}</div>
                    <div className="text-[10px] text-zinc-400 font-mono font-medium">SKU: {p.sku} • ₱{p.sellingPrice.toFixed(2)}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-emerald-500" />
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <div className="p-4 text-center text-xs text-zinc-400 font-medium">
                  No matching products.
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3A. PHYSICAL WEBCAM VIEWFINDER / CAMERA STREAM BOX */}
        {isCameraActive && (
          <div className="border-2 border-dashed border-emerald-500/40 relative overflow-hidden bg-zinc-950 rounded-3xl p-3 text-left" id="camera-viewport-card">
            
            {/* Viewport Frame with perfect relative containment */}
            <div className="relative w-full h-[280px] sm:h-[320px] bg-black rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
              
              {/* Actual Video stream inside card */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Glowing Laser scanning brackets - centered precisely over the video stream */}
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none p-4">
                <div className="w-[190px] h-[190px] sm:w-[220px] sm:h-[220px] border-2 border-emerald-500/35 rounded-2xl relative animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.25)] bg-emerald-500/[0.04]">
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-500 rounded-tl-sm" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-500 rounded-tr-sm" />
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-500 rounded-bl-sm" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-500 rounded-br-sm" />
                  
              {/* Dynamic laser scanning horizontal line - centered so translation centers perfectly */}
              <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-emerald-400 opacity-95 animate-scan-line shadow-[0_0_15px_rgba(16,185,129,0.95)]" />

              {/* Central Barcode Silhouette Guideline for precise user scanning alignment */}
              <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex items-center justify-center opacity-20 pointer-events-none z-0">
                <div className="w-[124px] h-[36px] flex justify-between items-center gap-[2px]">
                  <div className="w-1.5 h-full bg-emerald-400 rounded" />
                  <div className="w-[1px] h-full bg-emerald-400" />
                  <div className="w-1 h-full bg-emerald-400" />
                  <div className="w-[2px] h-full bg-emerald-400" />
                  <div className="w-0.5 h-full bg-emerald-400 rounded" />
                  <div className="w-[1.5px] h-full bg-emerald-400" />
                  <div className="w-2.5 h-full bg-emerald-400 rounded" />
                  <div className="w-[1px] h-full bg-emerald-400" />
                  <div className="w-1 h-full bg-emerald-400 rounded" />
                  <div className="w-[3px] h-full bg-emerald-400" />
                  <div className="w-0.5 h-full bg-emerald-400" />
                  <div className="w-[1.5px] h-full bg-emerald-400" />
                  <div className="w-1.5 h-full bg-emerald-400 rounded" />
                </div>
              </div>
            </div>
          </div>

          {/* LIVE VIEWFINDER Label PWA Style - Mathematically Symmetrical and aligned with Active Session */}
          <div className="absolute top-3.5 left-3.5 z-20 bg-rose-600 px-3 py-1.5 rounded-full text-[9px] font-black text-white uppercase tracking-widest flex items-center lg:gap-1.5 shadow-md border border-rose-500/20">
            <span className="w-1.5 h-1.5 bg-white rounded-full block animate-ping" />
            <span>LIVE VIEWFINDER</span>
          </div>

          {/* Active Session Label PWA Style - Surcharged with matching dimensions for perfect horizontal symmetry and alignment */}
          <div className="absolute top-3.5 right-3.5 z-20 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-full text-[9px] uppercase tracking-widest font-black flex items-center gap-1.5 shadow-md backdrop-blur-md">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full block animate-pulse" />
            <span>ACTIVE SESSION</span>
          </div>

              {cameraError && (
                <div className="absolute inset-0 z-35 bg-zinc-950/95 flex flex-col justify-center items-center text-center p-4 text-xs space-y-3 text-zinc-300">
                  <AlertTriangle className="h-8 w-8 text-amber-500 animate-pulse" />
                  <p className="font-extrabold max-w-[260px] text-zinc-200 leading-normal">{cameraError}</p>
                  <button
                    onClick={startCameraStream}
                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] uppercase font-black tracking-widest rounded-full cursor-pointer transition-all active:scale-95 shadow-lg"
                  >
                    Retry Connection
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center mt-3 relative z-10">
              <span className="text-[10px] text-zinc-400 font-bold animate-pulse-slow">Align product barcode inside green frame</span>
              <button
                onClick={stopCameraStream}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full text-[10px] uppercase font-black cursor-pointer shadow-sm transition-all"
              >
                Hide Viewfinder
              </button>
            </div>
          </div>
        )}

        {/* FEEDBACK STATUS BAR */}
        {scanMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-2xl text-center text-emerald-500 text-xs font-black uppercase tracking-wider animate-pulse flex items-center justify-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span>{scanMessage}</span>
          </div>
        )}

        {/* LIVE ITEM DETAIL CARD */}
        {scannedProduct ? (
          <div className="bg-m3-surface-low border border-m3-outline-variant/35 rounded-3xl p-5 shadow-sm space-y-4 animate-fade-in relative overflow-hidden text-left" id="spec-display-box-unified">
            
            {/* Corner status label */}
            <div className="absolute top-3 right-3 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase py-1 px-2.5 rounded-full border border-emerald-500/20 tracking-wider">
              Scanned
            </div>

            <div className="border-b border-m3-outline-variant/10 pb-3 text-left">
              <span className="text-[10px] bg-m3-primary/10 text-m3-primary font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider block w-fit mb-1.5">
                {scannedProduct.category}
              </span>
              <h3 className="text-sm font-black text-m3-on-surface leading-snug">
                {scannedProduct.productName}
              </h3>
              <div className="text-[10px] text-zinc-400 font-bold font-mono tracking-wide mt-1 uppercase">
                SKU: <span className="text-m3-primary font-black">{scannedProduct.sku}</span> • Barcode: {scannedProduct.barcode || 'N/A'}
              </div>
            </div>

            {/* RETAIL PRICE & CORE INVENTORY GRID */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-m3-surface border border-m3-outline-variant/20 rounded-2xl p-3 text-center space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block select-none">Selling price / Unit</span>
                <div className="text-lg font-black text-m3-tertiary font-mono">
                  ₱{scannedProduct.sellingPrice.toFixed(2)}
                </div>
                <span className="text-[10px] text-zinc-400 font-bold font-medium">per {scannedProduct.unit}</span>
              </div>

              {(() => {
                const stats = getBranchStockInfo(scannedProduct);
                return (
                  <div className={`border rounded-2xl p-3 text-center space-y-1 transition-all ${stats.stockClass}`}>
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block select-none">Available Stock</span>
                    <div className="text-lg font-black font-mono">
                      {scannedProduct.stockQuantity} {scannedProduct.unit}s
                    </div>
                    <span className="text-[9px] block font-black uppercase tracking-wider font-mono">
                      {stats.isOutOfStock 
                        ? 'Depleted' 
                        : stats.isCritical 
                          ? 'Critical Alert!' 
                          : 'Safe Stock'}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* ACCORDION / SPEC SHEET DETAILS */}
            <div className="space-y-2 border-t border-m3-outline-variant/15 pt-3 text-xs leading-relaxed font-semibold text-m3-on-surface-variant">
              <div className="flex justify-between items-center font-bold text-[11px] border-b border-m3-outline-variant/5 pb-1.5">
                <span className="text-zinc-450">Design Finish Profile:</span>
                <span className="text-m3-on-surface font-extrabold">{scannedProduct.designName || 'Standard Plain'}</span>
              </div>

              <div className="flex justify-between items-center font-bold text-[11px] border-b border-m3-outline-variant/5 pb-1.5">
                <span className="text-zinc-450">Dimensions Size:</span>
                <span className="text-m3-on-surface font-extrabold font-mono">{scannedProduct.size || 'N/A'}</span>
              </div>

              <div className="flex justify-between items-center font-bold text-[11px] border-b border-m3-outline-variant/5 pb-1.5">
                <span className="text-zinc-450">Brand Manufacturer:</span>
                <span className="text-m3-on-surface font-extrabold uppercase">{scannedProduct.brand || 'Local Brand'}</span>
              </div>

              <div className="flex justify-between items-center font-bold text-[11px] pb-1">
                <span className="text-zinc-450">Box Packing factor:</span>
                <span className="text-m3-on-surface font-extrabold font-mono">{scannedProduct.boxQuantity} tiles / box</span>
              </div>
            </div>

            {/* DYNAMIC ACTIONS ON SCAN CARD */}
            <div className="border-t border-m3-outline-variant/15 pt-4 space-y-2">
              <button
                onClick={() => handleAddToStaffCart(scannedProduct)}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-colors"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Add to Clerk Order Cart</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleCopyToCalc(scannedProduct)}
                  className="py-2.5 bg-m3-primary/10 text-m3-primary hover:bg-m3-primary/20 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 text-m3-primary" />
                  <span>Send to Estimator</span>
                </button>

                <button
                  onClick={() => {
                    setScannedProduct(null);
                    showToast('Cleared specifications lookup.');
                  }}
                  className="py-2.5 bg-m3-surface border border-m3-outline-variant text-m3-on-surface hover:bg-m3-outline-variant/15 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer"
                >
                  Clear Lookup
                </button>
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-m3-surface-low border border-m3-outline-variant/20 rounded-3xl p-8 text-center text-zinc-400 border-dashed space-y-3">
            <QrCode className="h-10 w-10 text-m3-primary/40 mx-auto animate-pulse" />
            <div>
              <h4 className="text-xs font-extrabold text-m3-on-surface">No Product Queried</h4>
              <p className="text-[10px] text-zinc-505 mt-1 max-w-[240px] mx-auto leading-normal font-medium">
                Type details above or tap any Quick-Scan bar in the floor list simulation below to pull stock data instantly.
              </p>
            </div>
          </div>
        )}

        {/* EXPANDABLE COLLAPSIBLE QUICK CALCULATOR */}
        <div className="bg-m3-surface-low border border-m3-outline-variant/25 rounded-3xl overflow-hidden shadow-sm text-left">
          <button
            onClick={() => setIsCalculatorExpanded(!isCalculatorExpanded)}
            className="w-full p-4 flex items-center justify-between font-black text-xs text-m3-on-surface uppercase tracking-wide hover:bg-m3-outline-variant/5 transition-colors focus:outline-none"
          >
            <div className="flex items-center gap-2">
              <CalcIcon className="h-4 w-4 text-m3-primary" />
              <span>Workspace Tile Estimator</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-m3-primary font-bold">
              <span>{isCalculatorExpanded ? 'Collapse' : 'Expand'}</span>
              <ChevronDown className={`h-4.5 w-4.5 transition-transform duration-300 ${isCalculatorExpanded ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {isCalculatorExpanded && (
            <div className="p-4 border-t border-m3-outline-variant/10 space-y-4 animate-fade-in text-xs leading-normal font-semibold text-m3-on-surface-variant">
              {/* Room Ground dimensions in Meters */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-m3-primary uppercase block">Room Length (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={calcRoomLength}
                    onChange={e => setCalcRoomLength(e.target.value)}
                    className="w-full bg-m3-surface border-b-2 border-m3-outline-variant/40 px-3 py-2 text-xs text-m3-on-surface focus:outline-none focus:border-m3-primary rounded-t-lg font-bold font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-m3-primary uppercase block">Room Width (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={calcRoomWidth}
                    onChange={e => setCalcRoomWidth(e.target.value)}
                    className="w-full bg-m3-surface border-b-2 border-m3-outline-variant/40 px-3 py-2 text-xs text-m3-on-surface focus:outline-none focus:border-m3-primary rounded-t-lg font-bold font-mono"
                  />
                </div>
              </div>

              {/* Tile sizes in CM */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-m3-primary uppercase block">Tile Length (cm)</label>
                  <input
                    type="number"
                    value={calcTileLength}
                    onChange={e => setCalcTileLength(e.target.value)}
                    className="w-full bg-m3-surface border-b-2 border-m3-outline-variant/40 px-3 py-2 text-xs text-m3-on-surface focus:outline-none focus:border-m3-primary rounded-t-lg font-bold font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-m3-primary uppercase block">Tile Width (cm)</label>
                  <input
                    type="number"
                    value={calcTileWidth}
                    onChange={e => setCalcTileWidth(e.target.value)}
                    className="w-full bg-m3-surface border-b-2 border-m3-outline-variant/40 px-3 py-2 text-xs text-m3-on-surface focus:outline-none focus:border-m3-primary rounded-t-lg font-bold font-mono"
                  />
                </div>
              </div>

              {/* Factors */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-m3-primary uppercase block">Tiles Per Box</label>
                  <input
                    type="number"
                    value={calcBoxDensity}
                    onChange={e => setCalcBoxDensity(e.target.value)}
                    className="w-full bg-m3-surface border-b-2 border-m3-outline-variant/40 px-3 py-2 text-xs text-m3-on-surface focus:outline-none focus:border-m3-primary rounded-t-lg font-bold font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-m3-primary uppercase block">Wastage / Slicing (%)</label>
                  <input
                    type="number"
                    value={calcWastagePercent}
                    onChange={e => setCalcWastagePercent(e.target.value)}
                    className="w-full bg-m3-surface border-b-2 border-m3-outline-variant/40 px-3 py-2 text-xs text-m3-on-surface focus:outline-none focus:border-m3-primary rounded-t-lg font-bold font-mono"
                  />
                </div>
              </div>

              {/* Output Results bar */}
              <div className="bg-m3-surface border border-m3-outline-variant/20 p-3 rounded-2xl space-y-2 text-xs font-bold leading-none">
                <div className="flex justify-between items-center text-[11px] border-b border-m3-outline-variant/10 pb-1.5">
                  <span className="text-zinc-400">Total Area:</span>
                  <span className="text-m3-on-surface font-extrabold font-mono">{calcAreaSqm} SQM</span>
                </div>
                <div className="flex justify-between items-center text-[11px] border-b border-m3-outline-variant/10 pb-1.5">
                  <span className="text-zinc-400">Required tiles ({calcWastagePercent}% wastage):</span>
                  <span className="text-m3-on-surface font-black font-mono">{calcTilesWithWastage} pcs</span>
                </div>
                <div className="flex justify-between items-center bg-m3-primary/10 p-2.5 rounded-xl">
                  <span className="text-m3-primary text-[10px] font-black uppercase">Packaging Packages Needed</span>
                  <span className="text-m3-primary font-black font-mono text-sm">{calcBoxesNeeded} Boxes</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SCANNER SIMULATOR SYSTEM BAR (FLOOR DIRECT CATALOG) */}
        <div className="space-y-2 pt-2 text-left">
          <span className="text-[10px] font-black tracking-wider text-m3-primary uppercase pl-1 block">
            Tactile Quick-Scan Catalog (Test simul barcodes)
          </span>
          <div className="grid grid-cols-2 gap-2">
            {staffBranchProducts.slice(0, 8).map((p, idx) => (
              <div 
                key={idx}
                className="p-2.5 bg-m3-surface-low border border-m3-outline-variant/20 rounded-xl flex items-center justify-between text-left transition-all font-bold shrink-0"
              >
                <button
                  onClick={() => handleSelectProduct(p)}
                  className="flex-1 text-left truncate min-w-0 font-bold focus:outline-none cursor-pointer"
                >
                  <div className="text-[10px] text-m3-on-surface font-extrabold truncate leading-tight">{p.productName}</div>
                  <span className="text-[8px] text-zinc-500 font-mono italic font-semibold">{p.sku}</span>
                </button>
                
                <div className="flex items-center gap-1.5 shrink-0 ml-1">
                  <span className="text-[8px] font-black text-m3-primary font-mono bg-m3-primary/10 py-0.5 px-1 rounded border border-m3-primary/15">
                    ₱{Math.round(p.sellingPrice)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToStaffCart(p);
                    }}
                    className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors cursor-pointer"
                    title="Quick add to Order Cart"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* PERSISTENT FLOATING 'CART' SUMMARY BUTTON FOR CASHIER QUEUE */}
      <div className="fixed bottom-4 left-0 right-0 max-w-md mx-auto px-4 z-40">
        <button
          id="btn-floating-cart-view"
          onClick={() => setIsCartOverlayOpen(true)}
          className={`w-full py-4 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xl flex items-center justify-between transition-all transform hover:scale-[1.02] cursor-pointer border border-emerald-500/35 relative ${
            totalCartItemsCount > 0 ? 'animate-pulse-slow' : 'opacity-85'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="relative bg-black/20 p-2 rounded-xl">
              <ShoppingCart className="h-5 w-5 text-white" />
              {totalCartItemsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-black border-2 border-emerald-600 rounded-full text-[9px] px-1.5 py-0.5 font-black">
                  {totalCartItemsCount}
                </span>
              )}
            </div>
            <div className="text-left font-bold">
              <div className="text-[10px] uppercase font-black text-emerald-100 tracking-wider leading-none">Review Active Cart</div>
              <div className="text-xs font-black text-white mt-1">
                {totalCartItemsCount > 0 ? `${totalCartItemsCount} item${totalCartItemsCount > 1 ? 's' : ''} staged` : 'Cart is vacant'}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] uppercase font-black text-emerald-200 tracking-wider block leading-none">Cashier Total</span>
            <span className="text-sm font-black font-mono text-white block mt-1">
              ₱{totalCartPrice.toFixed(2)}
            </span>
          </div>
        </button>
      </div>

      {/* CASHIER QUEUE OVERLAY DRAWER / FULL SLIDE-UP SHEET */}
      {isCartOverlayOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center animate-fade-in-rapid">
          {/* Click background to close */}
          <div className="absolute inset-0" onClick={() => setIsCartOverlayOpen(false)} />

          {/* Drawer content body */}
          <div className="bg-m3-surface border-t border-m3-outline-variant/30 rounded-t-[32px] w-full max-w-md max-h-[88vh] overflow-y-auto p-4 z-10 relative flex flex-col space-y-4 shadow-2xl text-left">
            
            {/* Handle/Close Header */}
            <div className="flex justify-between items-center pb-2 border-b border-m3-outline-variant/10">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4.5 w-4.5 text-m3-primary" />
                <span className="text-xs font-black uppercase tracking-wider text-m3-primary">Queue Dispatch Review</span>
              </div>
              <button
                onClick={() => setIsCartOverlayOpen(false)}
                className="p-1.5 rounded-full bg-m3-outline-variant/20 text-m3-on-surface hover:bg-m3-outline-variant/40 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* CART LIST OR PLACEHOLDER */}
            {staffCart.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 space-y-3">
                <ShoppingCart className="h-10 w-10 text-m3-primary/30 mx-auto animate-pulse" />
                <div>
                  <h4 className="text-xs font-extrabold text-m3-on-surface">Queue is currently vacant</h4>
                  <p className="text-[10px] text-zinc-505 mt-1 font-semibold leading-normal">
                    Add catalog or simulation items on the scanner workspace to stage customer orders.
                  </p>
                </div>
                <button
                  onClick={() => setIsCartOverlayOpen(false)}
                  className="px-4 py-2 bg-m3-primary text-m3-on-primary rounded-xl text-[10px] uppercase font-black cursor-pointer"
                >
                  Return to Scanner
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* ITEMS LIST */}
                <div className="bg-m3-surface-low border border-m3-outline-variant/15 rounded-2xl overflow-hidden shadow-inner">
                  <div className="divide-y divide-m3-outline-variant/10">
                    {staffCart.map((item, idx) => {
                      const totalItemPrice = item.product.sellingPrice * item.quantity;
                      return (
                        <div key={idx} className="p-3.5 flex items-center justify-between gap-3 text-xs font-semibold">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-extrabold text-m3-on-surface truncate">{item.product.productName}</h4>
                            <div className="text-[9px] text-zinc-400 font-mono mt-0.5 uppercase">
                              SKU: {item.product.sku} • ₱{item.product.sellingPrice.toFixed(2)}
                            </div>
                          </div>

                          {/* Quick Adjust buttons */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleUpdateCartQty(item.product.id, -1)}
                              className="w-6 h-6 rounded-lg bg-m3-surface-medium text-m3-on-surface hover:bg-m3-outline-variant/20 flex items-center justify-center font-black cursor-pointer"
                            >
                              <Minus className="h-2.5 w-2.5" />
                            </button>
                            <span className="w-5 text-center font-mono font-black text-xs text-m3-on-surface">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateCartQty(item.product.id, 1)}
                              className="w-6 h-6 rounded-lg bg-m3-surface-medium text-m3-on-surface hover:bg-m3-outline-variant/20 flex items-center justify-center font-black cursor-pointer"
                            >
                              <Plus className="h-2.5 w-2.5" />
                            </button>
                          </div>

                          {/* Unit Total price */}
                          <div className="text-right shrink-0 min-w-[65px] flex flex-col items-end">
                            <span className="font-mono font-extrabold text-m3-tertiary">
                              ₱{totalItemPrice.toFixed(2)}
                            </span>
                            <button
                              onClick={() => handleRemoveFromCart(item.product.id)}
                              className="text-[9.5px] text-red-500 hover:text-red-400 flex items-center gap-0.5 mt-0.5 cursor-pointer font-bold"
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
                  <div className="p-3 bg-m3-surface/40 border-t border-m3-outline-variant/10 text-xs font-black flex justify-between items-center text-left">
                    <span className="text-zinc-450 uppercase tracking-widest text-[9.5px]">Estimate Subtotal</span>
                    <span className="text-sm font-black font-mono text-m3-primary">
                      ₱{totalCartPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* VISUAL REF FORM FOR THE CASHIER DESK */}
                <div className="bg-m3-surface-low border border-m3-outline-variant/20 rounded-2xl p-4 space-y-3">
                  <h4 className="text-[10px] font-black tracking-widest text-m3-primary uppercase border-b border-m3-outline-variant/10 pb-1.5 flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5" />
                    <span>Customer Queue Context</span>
                  </h4>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-m3-primary uppercase pl-1 block">Customer Identifier Name</label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        placeholder="e.g. Maria Clara / Walk-in bathroom client"
                        className="w-full bg-m3-surface border-b-2 border-m3-outline-variant/40 px-3 py-2 text-xs text-m3-on-surface focus:outline-none focus:border-m3-primary rounded-t-lg font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-m3-primary uppercase pl-1 block">Floor Assistant Notes / Dispatch Remarks</label>
                      <textarea
                        value={orderNotes}
                        onChange={e => setOrderNotes(e.target.value)}
                        placeholder="e.g. Customer will make final adjustments at cashier counter, wants delivery quote..."
                        rows={2}
                        className="w-full bg-m3-surface border-b-2 border-m3-outline-variant/40 px-3 py-1.5 text-xs text-m3-on-surface focus:outline-none focus:border-m3-primary rounded-t-lg font-normal resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* DISPATCH TO THE PUBLIC REGISTER QUEUE */}
                <button
                  onClick={handlePublishOrder}
                  className="w-full p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
                >
                  <Check className="h-4 w-4" />
                  <span>Send to Cashier Counter</span>
                </button>

                <div className="pt-1">
                  <button
                    onClick={() => setIsCartOverlayOpen(false)}
                    className="w-full py-2 border border-m3-outline-variant text-[10px] text-zinc-400 font-extrabold uppercase rounded-xl hover:bg-zinc-500/5 cursor-pointer text-center"
                  >
                    Keep Staging / Return to Scanner
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

      {/* QUICK FLOATING TOAST BAR */}
      <ToastContainerComponent />

    </div>
  );
};

// Global simple custom feedback micro-toast engine
let toastTimer: any = null;

let toastSetterCallback: ((msg: string) => void) | null = null;
export function showToast(message: string) {
  if (toastSetterCallback) {
    toastSetterCallback(message);
  }
}

// Global hook listener for displaying instant notifications
export function ToastContainerComponent() {
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
    <div className="fixed bottom-24 right-6 left-6 mx-auto max-w-xs bg-m3-on-surface text-m3-surface text-[10px] font-black uppercase tracking-wider py-2.5 px-4 rounded-full shadow-2xl border border-m3-outline-variant/30 text-center flex items-center justify-center gap-1.5 animate-pulse z-50">
      <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
      <span>{toastText}</span>
    </div>
  );
}
