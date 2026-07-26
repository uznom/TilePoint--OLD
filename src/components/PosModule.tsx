/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useDb } from "../context/DbContext";
import { Product, Sale, SaleItem, UserRole, Member } from "../types/db";
import { verifyPasswordWithToken } from "../lib/crypto";
import { saveFileToBackup } from "../lib/fileBackupHelper";
import { isProductInBranch, getBranchStockQuantity } from "../lib/branchUtils";
import {
 ShoppingCart,
 Trash2,
 Sparkles,
 CheckCircle,
 Printer,
 Lock,
 Keyboard,
 X,
 ShieldCheck,
 History,
 LockKeyhole,
 ShoppingBag,
 Truck,
 FileText,
 ChevronDown,
 ChevronUp,
 ShieldAlert,
 Calculator,
 Search,
 Building2,
 Loader2,
 Calendar,
 Download,
 Users,
 CreditCard,
  QrCode,
  Wallet,
  Smartphone,
  ArrowRight,
  UserPlus,
  Plus,
  Minus,
} from "lucide-react";
import { CalculatorModule } from "./CalculatorModule";
import { ExpressiveTooltip } from "./ExpressiveTooltip";

const formatTin = (value: string | undefined | null): string => {
 if (!value) return "";
 const clean = value.replace(/[-\s]/g, "");
 const match = clean.match(/.{1,3}/g);
 if (match) {
 return match.join(" ");
 }
 return value;
};

interface PosModuleProps {
 darkMode: boolean;
 onNavigate: (tab: string) => void;
 viewMode?: "checkout" | "ledger";
 showImmersiveControls?: boolean;
}

const CartQtyInput: React.FC<{
 quantity: number;
 productId: string;
 maxStock: number;
 updateCartQty: (productId: string, val: any, maxStock: number) => void;
 removeFromCart: (productId: string) => void;
}> = ({ quantity, productId, maxStock, updateCartQty, removeFromCart }) => {
 const [localVal, setLocalVal] = useState(quantity.toString());

 useEffect(() => {
 setLocalVal(quantity.toString());
 }, [quantity]);

 const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const val = e.target.value;
 setLocalVal(val);

 if (val === "-") return;

 const parsed = parseInt(val, 10);
 if (!isNaN(parsed) && parsed !== 0) {
 if (parsed > 0 && parsed > maxStock) {
 updateCartQty(productId, maxStock, maxStock);
 setLocalVal(maxStock.toString());
 } else {
 updateCartQty(productId, parsed, maxStock);
 }
 }
 };

 const handleBlur = () => {
 if (localVal === "-" || localVal.trim() === "") {
 removeFromCart(productId);
 return;
 }
 const parsed = parseInt(localVal, 10);
 if (isNaN(parsed) || parsed === 0) {
 removeFromCart(productId);
 } else if (parsed > 0 && parsed > maxStock) {
 updateCartQty(productId, maxStock, maxStock);
 setLocalVal(maxStock.toString());
 } else {
 updateCartQty(productId, parsed, maxStock);
 setLocalVal(parsed.toString());
 }
 };

 const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
 if (e.key === "Enter") {
 e.currentTarget.blur();
 }
 };

 return (
 <input
 type="number"
 value={localVal}
 onChange={handleChange}
 onBlur={handleBlur}
 onKeyDown={handleKeyDown}
 className={`w-12 text-center bg-transparent border-y-0 border-x border-m3-outline-variant/30 text-xs font-mono font-black ${
 quantity < 0 ? "text-rose-500 bg-rose-500/10 font-bold" : "text-m3-on-surface"
 } focus:outline-none focus:bg-m3-surface-low rounded-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
 />
 );
};

export const PosModule: React.FC<PosModuleProps> = ({
 darkMode,
 onNavigate,
 viewMode,
 showImmersiveControls = true,
}) => {
 const {
 products: rawProducts,
 activeShift,
 openShift,
 closeShift,
 getShiftReportStats,
 shifts,
 activeBranch,
 checkoutSale,
 voidSale,
 holdSale,
 parkedSales,
 setParkedSales,
 sales,
 saleItems,
 users,
 addAuditLog,
 currentUser,
 createDelivery,
 triggerSystemProcessing,
 branches,
 branchStock,
 syncFromSharedServer,
 syncStatus,
 	members: rawMembers,
	setMembers,
	loyaltyConfig,
	updateLoyaltyConfig,
	} = useDb();

  const [activePosBranchId, setActivePosBranchId] = useState<string>(
    currentUser?.branchAssignmentId || "B1"
  );

  useEffect(() => {
    if (currentUser?.branchAssignmentId) {
      setActivePosBranchId(currentUser.branchAssignmentId);
    }
  }, [currentUser?.branchAssignmentId]);

  const products = React.useMemo(() => {
    return rawProducts.map((p) => {
      const stockQty = getBranchStockQuantity(p, activePosBranchId, branchStock, branches);
      return {
        ...p,
        stockQuantity: stockQty,
      };
    });
  }, [rawProducts, branchStock, branches, activePosBranchId]);

  const branchFilteredMembers = React.useMemo(() => {
    const isAdmin = currentUser?.role === "Admin" || currentUser?.role?.toUpperCase() === "ADMIN";
    return rawMembers.filter((m) => {
      if (isAdmin) return true;
      const memberBranch = m.branchId || "B1";
      return memberBranch === activePosBranchId;
    });
  }, [rawMembers, currentUser, activePosBranchId]);

  const members = branchFilteredMembers;

 const getBranchPrice = (p: Product) => {
 const branchStockItem = branchStock.find(
 (bs) =>
 bs.productId === p.id && bs.branchId === currentUser?.branchAssignmentId,
 );
 return branchStockItem &&
 branchStockItem.sellingPriceOverride !== undefined &&
 branchStockItem.sellingPriceOverride > 0
 ? branchStockItem.sellingPriceOverride
 : p.sellingPrice;
 };

 // Active cashier shift states
 const [startCashInput, setStartCashInput] = useState("5000");
 const [showShiftModal, setShowShiftModal] = useState(false);
 const [hasDismissedShiftPromptState, setHasDismissedShiftPromptState] = useState(() => {
 return sessionStorage.getItem("tilepoint_dismissed_shift_prompt") === "true";
 });

 const hasDismissedShiftPrompt = hasDismissedShiftPromptState;
 const setHasDismissedShiftPrompt = (val: boolean) => {
 setHasDismissedShiftPromptState(val);
 if (val) {
 sessionStorage.setItem("tilepoint_dismissed_shift_prompt", "true");
 } else {
 sessionStorage.removeItem("tilepoint_dismissed_shift_prompt");
 }
 };

 // Closing shift states
 const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
 const [closeShiftCashInput, setCloseShiftCashInput] = useState("");
 const [showTileCalculatorModal, setShowTileCalculatorModal] = useState(false);

 // Add Member Modal states for Corporate Member Credit Desk
 const [showAddMemberModal, setShowAddMemberModal] = useState(false);
 const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
 const [showLoyaltyConfigModal, setShowLoyaltyConfigModal] = useState<boolean>(false);
 const [loyaltySpendInput, setLoyaltySpendInput] = useState<string>("500");
 const [loyaltyPointValueInput, setLoyaltyPointValueInput] = useState<string>("1.0");
 const [newMemberName, setNewMemberName] = useState("");
 const [newMemberPhone, setNewMemberPhone] = useState("");
 const [newMemberEmail, setNewMemberEmail] = useState("");
 const [newMemberLimit, setNewMemberLimit] = useState("15000");
 const [addMemberError, setAddMemberError] = useState("");

 const handleAddCorporateMember = (e?: React.FormEvent) => {
 if (e) e.preventDefault();
 setAddMemberError("");

 if (!newMemberName.trim()) {
 setAddMemberError("Please enter member full name or company name.");
 return;
 }
 if (!newMemberPhone.trim()) {
 setAddMemberError("Please enter contact phone number.");
 return;
 }
 const limitNum = Number(newMemberLimit);
 if (isNaN(limitNum) || limitNum < 0) {
 setAddMemberError("Credit limit must be a non-negative number.");
 return;
 }

 const newM: Member = {
 id: "M" + (rawMembers.length + 1) + "-" + Math.floor(Math.random() * 900 + 100),
 fullName: newMemberName.trim(),
 phone: newMemberPhone.trim(),
 email: newMemberEmail.trim() || "none@specified.com",
 points: 10,
 creditLimit: limitNum,
 outstandingBalance: 0,
 status: "Active",
 branchId: currentUser?.branchAssignmentId || "ETC_DIPOLOG MAIN",
 createdAt: new Date().toISOString(),
 };

 const updatedMembers = [...rawMembers, newM];
 setMembers(updatedMembers);
 try {
 localStorage.setItem("atpos_v2_members_list", JSON.stringify(updatedMembers));
 } catch (_) {}

 addAuditLog(
 "MEMBER_REGISTER",
 `Registered member ${newM.fullName} with credit ceiling of ₱${newM.creditLimit.toLocaleString()} via Corporate Member Credit Desk`,
 "Members",
 newM.id,
 JSON.stringify(newM)
 );

 setCustomerName(newM.fullName);
 showToast(`Registered and linked corporate member: ${newM.fullName}`);

 setNewMemberName("");
 setNewMemberPhone("");
 setNewMemberEmail("");
 setNewMemberLimit("15000");
 setShowAddMemberModal(false);
 };

 // Find the last closed shift at this branch to pre-fill starting cash
 const previouslyClosedShift = React.useMemo(() => {
 if (!shifts || shifts.length === 0) return null;
 return (
 [...shifts]
 .filter(
 (s) =>
 s.status === "CLOSED" &&
 s.branchId === currentUser?.branchAssignmentId,
 )
 .sort(
 (a, b) =>
 new Date(b.closedAt || 0).getTime() -
 new Date(a.closedAt || 0).getTime(),
 )[0] || null
 );
 }, [shifts, currentUser?.branchAssignmentId]);

 // Pre-fill starting cash when modal opens
 React.useEffect(() => {
 if (showShiftModal) {
 if (previouslyClosedShift) {
 setStartCashInput(previouslyClosedShift.cashCount.toString());
 } else {
 setStartCashInput("5000");
 }
 }
 }, [showShiftModal, previouslyClosedShift]);

 // Auto-prompt the user to initialize a shift on mount if not active
 React.useEffect(() => {
 if (viewMode === "checkout" && !activeShift && !hasDismissedShiftPrompt) {
 setShowShiftModal(true);
 }
 }, [activeShift, viewMode, hasDismissedShiftPrompt]);

 // Pagination State for Ledger Sales
 const [salesPage, setSalesPage] = useState(1);
 const [selectedSaleDetail, setSelectedSaleDetail] = useState<Sale | null>(
 null,
 );
 const [selectedPoolBranchId, setSelectedPoolBranchId] = useState<string>(
    currentUser?.role === "Admin" ? "All" : (currentUser?.branchAssignmentId || "B1")
  );
 const [ledgerSearchQuery, setLedgerSearchQuery] = useState("");
 const [ledgerPaymentFilter, setLedgerPaymentFilter] = useState<string>("All");
 const [ledgerDateFilter, setLedgerDateFilter] = useState<string>("");
 const [isStatsCollapsed, setIsStatsCollapsed] = useState(false);

 // Cart & POS Screen States
 const [cart, setCart] = useState<
 { product: Product; quantity: number; overridePrice?: number }[]
 >(() => {
 try {
 const cached = localStorage.getItem("tp_active_cart");
 return cached ? JSON.parse(cached) : [];
 } catch (e) {
 return [];
 }
 });
 const [searchTerm, setSearchTerm] = useState("");
 const [selectedCategory, setSelectedCategory] = useState("All");
 const [customerName, setCustomerName] = useState(() => {
 return (
 localStorage.getItem("tp_active_customer_name") || "Walk-in Customer"
 );
 });
 const [customerNotes, setCustomerNotes] = useState(() => {
 return localStorage.getItem("tp_active_customer_notes") || "";
 });
 const [isCategoryFilterCollapsed, setIsCategoryFilterCollapsed] =
 useState(false);
 const [isCustomerMetadataCollapsed, setIsCustomerMetadataCollapsed] =
 useState(false);
  const [paymentRef, setPaymentRef] = useState("");

 // Active Cart Write-Through Persistence to survive page refreshes and browser glitches
 useEffect(() => {
 localStorage.setItem("tp_active_cart", JSON.stringify(cart));
 }, [cart]);

 // Point of Sale Safeguard Guard: Block/intercept page refreshes and tab closures if there are items in the basket
 useEffect(() => {
 localStorage.setItem("tp_active_customer_name", customerName);
 }, [customerName]);

 useEffect(() => {
 localStorage.setItem("tp_active_customer_notes", customerNotes);
 }, [customerNotes]);

 // Reset salesPage when filters change
 useEffect(() => {
 setSalesPage(1);
 }, [searchTerm, selectedPoolBranchId]);

 // Surcharges, limits and discounts
 const [discountValue, setDiscountValue] = useState(0); // in PHP
 const [discountType, setDiscountType] = useState<
 "NONE" | "FLAT" | "PERCENT" | "SENIOR" | "PWD" | "CONTRACT"
 >("NONE");
 const [showDiscountModal, setShowDiscountModal] = useState(false);
 const [discountInput, setDiscountInput] = useState("");

 // Live Override / Permissions States
 interface ApprovalRequest {
 type: "DISCOUNT" | "PRICE_OVERRIDE";
 discountType?: "NONE" | "FLAT" | "PERCENT" | "SENIOR" | "PWD" | "CONTRACT";
 discountValue?: number;
 productId?: string;
 originalPrice?: number;
 overridePrice?: number;
 tempCartItemIndex?: number;
 requiredRole: UserRole;
 }
 const [pendingApproval, setPendingApproval] =
 useState<ApprovalRequest | null>(null);
 const [approverUsername, setApproverUsername] = useState("");
 const [approverPassword, setApproverPassword] = useState("");
 const [approvalError, setApprovalError] = useState("");

 // Price override popup input
 const [overrideModalOpen, setOverrideModalOpen] = useState(false);
 const [overrideItemIndex, setOverrideItemIndex] = useState<number | null>(
 null,
 );
 const [overridePriceInput, setOverridePriceInput] = useState("");

 // Checkout payment inputs
 const [paymentMethod, setPaymentMethod] = useState<"Cash" | "GCash" | "Maya" | "Card / Bank Terminal" | "Member Credit">("Cash");
 const [amountTendered, setAmountTendered] = useState<string>("");
 const [changeAmount, setChangeAmount] = useState<number>(0);
 const [errorMessage, setErrorMessage] = useState("");
 const [isCheckingOut, setIsCheckingOut] = useState(false);

 // Receipt & Checkout Completion Display
 const [showReceiptModal, setShowReceiptModal] = useState(false);
 const [activeReceipt, setActiveReceipt] = useState<Sale | null>(null);

 const receiptItems = React.useMemo(() => {
 if (!activeReceipt) return [];
 return saleItems.filter((item) => item.saleId === activeReceipt.id && !item.isDeleted);
 }, [activeReceipt, saleItems]);

 // Fulfillment & Store Delivery system states
 const [showFulfillmentModal, setShowFulfillmentModal] = useState(false);
 const [pendingSaleForFulfillment, setPendingSaleForFulfillment] =
 useState<Sale | null>(null);
 const [fulfillmentType, setFulfillmentType] = useState<
 "TakeHome" | "Delivery"
 >("TakeHome");

 // Delivery form state
 const [deliveryCustomerName, setDeliveryCustomerName] = useState("");
 const [deliveryContact, setDeliveryContact] = useState("");
 const [deliveryHouseNo, setDeliveryHouseNo] = useState("");
 const [deliveryStreet, setDeliveryStreet] = useState("");
 const [deliveryBarangay, setDeliveryBarangay] = useState("");
 const [deliveryCity, setDeliveryCity] = useState("");
 const [deliveryLandmark, setDeliveryLandmark] = useState("");
 const [deliveryDate, setDeliveryDate] = useState(
 new Date().toISOString().slice(0, 10),
 );
 const [deliveryTime, setDeliveryTime] = useState("10:00 AM - 2:00 PM");
 const [deliveryNotes, setDeliveryNotes] = useState("");

 // If check out and to be delivered, auto-fill the phone number of the registered member from the database
 useEffect(() => {
 if (deliveryCustomerName.trim()) {
 const match = members.find(
 (m) => m.fullName.toLowerCase() === deliveryCustomerName.trim().toLowerCase()
 );
 if (match && match.phone) {
 setDeliveryContact(match.phone);
 }
 }
 }, [deliveryCustomerName, members]);

 // Barcode quick search/scanner states
 const [barcodeSearchTerm, setBarcodeSearchTerm] = useState("");
 const [barcodeAddFeedback, setBarcodeAddFeedback] = useState<string | null>(
 null,
 );

 // Keyboard shortcut assistant status
 const [showHotkeysHelp, setShowHotkeysHelp] = useState(false);
 const [shortcutsCollapsed, setShortcutsCollapsed] = useState(true);

 // Mobile section toggle tab for responsive flow
 const [mobilePosTab, setMobilePosTab] = useState<"queue" | "basket">(
 "basket",
 );

 // Custom modal input states (replacing prompt)
 const [showCustomerModal, setShowCustomerModal] = useState(false);
 const [customerModalInput, setCustomerModalInput] = useState("");

 // Sub-navigation state derived from the parent layout sidebar tab selection
 const activeSubModule = viewMode || "checkout";

 // Supervisor PIN security prompt trigger state
 const [pinModalOpen, setPinModalOpen] = useState(false);
 const [pinAction, setPinAction] = useState<"REPRINT" | "VOID" | null>(null);
 const [pinTargetSale, setPinTargetSale] = useState<Sale | null>(null);
 const [securityPinInput, setSecurityPinInput] = useState("");
 const [securityPinError, setSecurityPinError] = useState("");

 // Toast feedback alert
 const [toastMessage, setToastMessage] = useState<string | null>(null);

 const showToast = (message: string) => {
 setToastMessage(message);
 setTimeout(() => {
 setToastMessage(null);
 }, 4000);
 };

 const playNotificationSound = () => {
 try {
 const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
 const playBeep = (freq: number, start: number, duration: number) => {
 const osc = audioCtx.createOscillator();
 const gain = audioCtx.createGain();
 osc.connect(gain);
 gain.connect(audioCtx.destination);
 osc.type = "sine";
 osc.frequency.setValueAtTime(freq, audioCtx.currentTime + start);
 gain.gain.setValueAtTime(0.12, audioCtx.currentTime + start);
 gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + start + duration);
 osc.start(audioCtx.currentTime + start);
 osc.stop(audioCtx.currentTime + start + duration);
 };
 playBeep(660, 0, 0.12);
 playBeep(880, 0.15, 0.18);
 } catch (e) {
 console.warn("Notification audio blocked by browser policy:", e);
 }
 };

 const prevParkedSalesRef = useRef<any[]>([]);

 useEffect(() => {
 if (prevParkedSalesRef.current.length > 0) {
 const prevIds = new Set(prevParkedSalesRef.current.map((ps) => ps.id));
 const newSales = parkedSales.filter((ps) => !prevIds.has(ps.id));
 if (newSales.length > 0) {
 const newest = newSales[newSales.length - 1];
 showToast(` NEW YARD ORDER RECEIVED: ${newest.customerName || "Walk-in Customer"}`);
 playNotificationSound();
 }
 }
 prevParkedSalesRef.current = parkedSales;
 }, [parkedSales]);

 // Search input referencer for hotkey focus
 const searchInputRef = useRef<HTMLInputElement>(null);

 // All product categories for filters
 const categories = [
 "All",
 ...Array.from(
 new Set(products.filter((p) => !p.isDeleted).map((p) => p.category)),
 ),
 ];

 // Map products
 const userBranchId = activePosBranchId;
 const filteredProducts = products.filter((p) => {
 if (p.isDeleted) return false;
 if (!isProductInBranch(p, userBranchId, branchStock, branches)) {
 return false;
 }
 const matchCat =
 selectedCategory === "All" || p.category === selectedCategory;
 const matchSearch =
 p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
 p.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
 p.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
 p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
 p.designName.toLowerCase().includes(searchTerm.toLowerCase());
 return matchCat && matchSearch;
 });

 // Dynamic Surcharges, VAT (12%), and Discounts compliant with Philippine and contractor standards
 const subtotal = cart.reduce((acc, item) => {
 const unitPrice =
 item.overridePrice !== undefined
 ? item.overridePrice
 : getBranchPrice(item.product);
 return acc + unitPrice * item.quantity;
 }, 0);

 let vat = parseFloat((subtotal * 0.12).toFixed(2));
 let discountAmount = 0;

 if (discountType === "FLAT") {
 discountAmount = discountValue;
 } else if (discountType === "PERCENT") {
 discountAmount = parseFloat((subtotal * (discountValue / 100)).toFixed(2));
 } else if (discountType === "SENIOR" || discountType === "PWD") {
 vat = 0; // VAT Exempt
 discountAmount = parseFloat((subtotal * 0.2).toFixed(2)); // 20% discount on base
 } else if (discountType === "CONTRACT") {
 discountAmount = parseFloat((subtotal * 0.1).toFixed(2)); // 10% Contractor affiliate discount
 }

 const grandTotal = parseFloat((subtotal + vat - discountAmount).toFixed(2));

 // Change computation effect
 useEffect(() => {
 const tendered = parseFloat(amountTendered) || 0;
 if (tendered >= grandTotal) {
 setChangeAmount(parseFloat((tendered - grandTotal).toFixed(2)));
 setErrorMessage("");
    setPaymentRef("");
 } else {
 setChangeAmount(0);
 }
 }, [amountTendered, grandTotal]);

 // POS Shortcuts Keylogger integration
 useEffect(() => {
 const handleKeyDown = (e: KeyboardEvent) => {
 const activeEl = document.activeElement;
 const isInput =
 activeEl?.tagName === "INPUT" || activeEl?.tagName === "TEXTAREA";

 if (e.key === "F1") {
 e.preventDefault();
 handleCancelSale();
 } else if (e.key === "F2") {
 e.preventDefault();
 searchInputRef.current?.focus();
 } else if (e.key === "F3") {
 e.preventDefault();
 handleHold();
 } else if (e.key === "F4") {
 e.preventDefault();
 const parkedDrawer = document.getElementById("parked-sales-drawer");
 parkedDrawer?.scrollIntoView({ behavior: "smooth" });
 } else if (e.key === "F5") {
 e.preventDefault();
 setCustomerModalInput(customerName);
 setShowCustomerModal(true);
 } else if (e.key === "F6") {
 e.preventDefault();
 setDiscountInput("");
 setShowDiscountModal(true);
 } else if (e.key === "F7") {
 e.preventDefault();
 if (cart.length > 0) {
 const checkSection = document.getElementById("checkout-action-panel");
 checkSection?.scrollIntoView({ behavior: "smooth" });
 const tenderIdx = document.getElementById("cash-tendered-field");
 tenderIdx?.focus();
 }
 } else if (e.key === "F8") {
 e.preventDefault();
 if (activeReceipt) {
 setShowReceiptModal(true);
 }
 } else if (e.key === "F9" || e.key === "F10") {
 // FIX: Re-purposed F9/F10 to serve as the automatic terminal toggle shortcut for shift controls
 e.preventDefault();
 if (activeShift) {
 setCloseShiftCashInput("");
 setShowCloseShiftModal(true);
 } else {
 setShowShiftModal(true);
 }
 } else if (e.ctrlKey && e.key === "/") {
 e.preventDefault();
 setShortcutsCollapsed((prev) => !prev);
 } else if (e.key === "Escape") {
 e.preventDefault();
 handleCancelSale();
 }
 };

 window.addEventListener("keydown", handleKeyDown);
 return () => window.removeEventListener("keydown", handleKeyDown);
 }, [cart, customerName, activeReceipt, activeShift]);

 // Cart operations
 const addToCart = (product: Product) => {
 const userBranchId = activePosBranchId;
 const realBranchStock = getBranchStockQuantity(product, userBranchId, branchStock, branches);

 if (realBranchStock <= 0) {
 showToast("Depleted Stock: Clicked product is currently out of stock.");
 return;
 }

 const updatedProduct = { ...product, stockQuantity: realBranchStock };

 setCart((prev) => {
 const idx = prev.findIndex((item) => item.product.id === product.id);
 if (idx !== -1) {
 const currentQty = prev[idx].quantity;
 if (currentQty >= realBranchStock) {
 showToast(
 `Stock Limit: Maximum available is ${realBranchStock} ${product.unit}.`,
 );
 return prev;
 }
 const updated = [...prev];
 updated[idx] = { ...updated[idx], product: updatedProduct, quantity: currentQty + 1 };
 return updated;
 }
 return [...prev, { product: updatedProduct, quantity: 1 }];
 });
 };

 const updateCartQty = (productId: string, val: any, _maxStockOverride?: number) => {
 const userBranchId = activePosBranchId;
 const matchedProduct = products.find((p) => p.id === productId);
 const cartProduct = cart.find((item) => item.product.id === productId)?.product;
 const realBranchStock = matchedProduct
 ? matchedProduct.stockQuantity
 : getBranchStockQuantity(cartProduct, userBranchId, branchStock, branches);

 let parsedQty = parseInt(val, 10);
 if (isNaN(parsedQty) || parsedQty === 0) {
 removeFromCart(productId);
 return;
 }
 const newQty = parsedQty;

 if (newQty > 0 && newQty > realBranchStock) {
 showToast(
 `Excess Volume: Cannot exceed active stock level of ${realBranchStock}.`,
 );
 return;
 }
 setCart((prev) =>
 prev.map((item) =>
 item.product.id === productId
 ? {
 ...item,
 product: { ...item.product, stockQuantity: realBranchStock },
 quantity: newQty,
 }
 : item,
 ),
 );
 };

 const removeFromCart = (productId: string) => {
 const p = cart.find((item) => item.product.id === productId);
 setCart((prev) => prev.filter((item) => item.product.id !== productId));
 if (p) {
 showToast(`Removed ${p.product.productName} from terminal basket.`);
 }
 };

 const handleCancelSale = () => {
 setCart([]);
 setCustomerName("Walk-in Customer");
 setCustomerNotes("");
 setDiscountValue(0);
 setDiscountType("NONE");
 setAmountTendered("");
 setChangeAmount(0);
 setErrorMessage("");
 };

 // Park Sale operations
 const handleHold = () => {
 if (cart.length === 0) return;
 holdSale(cart, customerName, customerNotes);
 handleCancelSale();
 showToast("Transaction parked inside safe hold registers.");
 };

 const handleResume = (parkedId: string) => {
 const record = parkedSales.find((p) => p.id === parkedId);
 if (!record) return;

 // Save current ongoing order if there are items in the cart
 const ongoingCart = [...cart];
 const ongoingCustomerName = customerName;
 const ongoingCustomerNotes = customerNotes;

 if (ongoingCart.length > 0) {
 holdSale(ongoingCart, ongoingCustomerName, ongoingCustomerNotes);
 }

 setCart(record.items);
 setCustomerName(record.customerName);
 setCustomerNotes(record.notes);

 // Remove from parked
 setParkedSales((prev) => prev.filter((p) => p.id !== parkedId));
 setMobilePosTab("basket");

 if (ongoingCart.length > 0) {
 showToast(`Current order auto-held. Resumed staged order for ${record.customerName || "Walk-in"}.`);
 } else {
 showToast(`Resumed staged order for ${record.customerName || "Walk-in"}.`);
 }
 };

 const checkDiscountApprovalRequired = (type: string, numericVal: number) => {
 let pct = 0;
 if (type === "PERCENT") {
 pct = numericVal;
 } else if (type === "SENIOR" || type === "PWD") {
 pct = 20;
 } else if (type === "CONTRACT") {
 pct = 10;
 } else if (type === "FLAT" && subtotal > 0) {
 pct = (numericVal / subtotal) * 100;
 }

 if (currentUser?.role === UserRole.ADMIN) {
 return { required: false, pct };
 }

 if (currentUser?.role === UserRole.MANAGER) {
 if (pct > 20) {
 return { required: true, roleNeeded: UserRole.ADMIN, pct };
 }
 return { required: false, pct };
 }

 // Cashier
 if (pct > 20) {
 return { required: true, roleNeeded: UserRole.ADMIN, pct };
 } else if (pct > 10) {
 return { required: true, roleNeeded: UserRole.MANAGER, pct };
 }

 return { required: false, pct };
 };

 const applyCustomDiscount = (
 type: "NONE" | "FLAT" | "PERCENT" | "SENIOR" | "PWD" | "CONTRACT",
 inputVal?: string,
 ) => {
 const numericVal = parseFloat(inputVal || "0") || 0;
 if (type === "FLAT" && (numericVal < 0 || numericVal > subtotal)) {
 showToast("Error: Invalid discount value.");
 return;
 }
 if (type === "PERCENT" && (numericVal < 0 || numericVal > 100)) {
 showToast("Error: Invalid percentage fraction.");
 return;
 }

 const approval = checkDiscountApprovalRequired(type, numericVal);
 if (approval.required) {
 setPendingApproval({
 type: "DISCOUNT",
 discountType: type,
 discountValue: numericVal,
 requiredRole: approval.roleNeeded!,
 });
 setShowDiscountModal(false);
 setApproverUsername("");
 setApproverPassword("");
 setApprovalError("");
 return;
 }

 setDiscountType(type);
 if (type === "FLAT" || type === "PERCENT") {
 setDiscountValue(numericVal);
 } else {
 setDiscountValue(0);
 }

 setShowDiscountModal(false);

 if (type === "NONE") {
 showToast("Removed all active discounts.");
 } else if (type === "FLAT") {
 showToast(`Applied ₱${numericVal.toFixed(2)} cash discount.`);
 } else if (type === "PERCENT") {
 showToast(`Applied ${numericVal}% percentage discount.`);
 } else if (type === "SENIOR") {
 showToast("Senior Privilege: Applied 20% Off + 12% VAT Exemption!");
 } else if (type === "PWD") {
 showToast("PWD Exemption: Applied 20% Off + 12% VAT Exemption!");
 } else if (type === "CONTRACT") {
 showToast("Contractor Special: Applied 10% Trade Alliance Discount!");
 }
 };

 async function clientCheckout() {
 if (cart.length === 0 || isCheckingOut) return;

 if (currentUser?.role === UserRole.STAFF) {
 setErrorMessage(
 "ACCESS RESTRICTED: Logistics Floor Staff (Santi Santos) is unauthorized to execute customer checkouts from this terminal. Please login as Cashier, Manager, or Admin to execute client checkouts.",
 );
 return;
 }

 if (!activeShift) {
 setShowShiftModal(true);
 return;
 }

 if (paymentMethod === "Cash") {
 const tendered = parseFloat(amountTendered) || 0;
 if (tendered < grandTotal) {
 setErrorMessage(
 `Tendered cash must equal or exceed total amount ₱${grandTotal.toFixed(2)}`,
 );
 return;
 }
 }

  if (paymentMethod !== "Cash" && paymentMethod !== "Member Credit") {
    if (!paymentRef.trim()) {
      setErrorMessage(
        `TRANSACTION RESTRICTED: Reference Number or Approval Code is required for ${paymentMethod} to verify collection.`
      );
      return;
    }
  }

 setIsCheckingOut(true);
 try {
 // Smooth ERP ledger settlement simulation delay
 await new Promise((resolve) => setTimeout(resolve, 150));

 // CONCURRENT STOCK CONFLICT RESOLUTION (ANTI-COLLISION LOCKS):
 try {
 const latestRes = await fetch("/api/db");
 if (latestRes.ok) {
 const responseData = await latestRes.json();
 if (responseData && responseData.success && responseData.data) {
 const freshDb = responseData.data;
 const freshBranchStock = freshDb["tp_branch_stock"] || [];
 const freshProducts = freshDb["tp_products"] || [];

 // Validate each item in cart
 for (const item of cart) {
 const serverStockRec = freshBranchStock.find(
 (bs: any) =>
 bs.productId === item.product.id &&
 bs.branchId === (currentUser?.branchAssignmentId || "B1"),
 );
 const serverProd = freshProducts.find((p: any) => p.id === item.product.id);
 const defaultProdQty = serverProd ? serverProd.stockQuantity : (item.product.stockQuantity ?? 0);
 const serverQty = serverStockRec ? serverStockRec.quantity : defaultProdQty;
 if (serverQty < item.quantity) {
 await syncFromSharedServer();
 setErrorMessage(
 `CONCURRENT STOCK CONFLICT DETECTED: The product "${item.product.productName}" has only ${serverQty} units remaining in the master database, but your billing basket requested ${item.quantity}. The transaction has been aborted to prevent inventory deficit. Local stock counters have been synchronized to match server state.`,
 );
 return;
 }
 }
 }
 }
 } catch (err) {
 console.warn(
 "[Anti-Collision Check] Could not verify host repository stock levels:",
 err,
 );
 }

  const cartHash = cart.map((item) => `${item.product.id}:${item.quantity}`).join(",");
  const timeBlock = Math.floor(Date.now() / 10000); // 10-second block to prevent rapid double-clicks
  const idempKey = `IDEMP-SL-${currentUser?.id || "anon"}-${activeShift?.id || "noshift"}-${cartHash}-${timeBlock}`;

 const finalNotes = paymentRef.trim()
    ? `[${paymentMethod} Ref: ${paymentRef.trim()}] ${customerNotes}`.trim()
    : customerNotes;

  const ptsDiscount = (pointsToRedeem || 0) * (loyaltyConfig?.pointValueInPhp || 1.0);
  const finalDiscount = discountAmount + ptsDiscount;
  const netPayable = Math.max(0, grandTotal - ptsDiscount);

  const completedInvoice = checkoutSale(
    cart,
    customerName,
    finalNotes,
 finalDiscount,
 paymentMethod,
 parseFloat(amountTendered) || netPayable,
 vat,
 idempKey,
 discountType,
 activePosBranchId,
 pointsToRedeem,
 );
  setPointsToRedeem(0);

 setDeliveryNotes(customerNotes || "");
 setDeliveryCustomerName(customerName || "");
 setPendingSaleForFulfillment(completedInvoice);
 setFulfillmentType("TakeHome");
 setShowFulfillmentModal(true);

 handleCancelSale();
 showToast("Payment Completed. Please assign receipt fulfillment.");
 } catch (e: any) {
 showToast("Checkout Error: " + e?.message);
 } finally {
 setIsCheckingOut(false);
 }
 }

 const handleFulfillmentTakeHome = () => {
 if (!pendingSaleForFulfillment) return;
 setActiveReceipt(pendingSaleForFulfillment);
 setShowReceiptModal(true);
 setShowFulfillmentModal(false);
 setPendingSaleForFulfillment(null);
 showToast("Invoice settled: Materials Released to Buyer.");
 };

 const handleFulfillmentDeliverySubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!pendingSaleForFulfillment) return;

 if (
 !deliveryContact.trim() ||
 !deliveryBarangay.trim() ||
 !deliveryCity.trim()
 ) {
 showToast(
 "Contact, Barangay, and City/Municipality are strictly required!",
 );
 return;
 }

 const dRecord = createDelivery({
 saleId: pendingSaleForFulfillment.id,
 saleNumber: pendingSaleForFulfillment.saleNumber,
 customerName: deliveryCustomerName.trim() || pendingSaleForFulfillment.customerName || "Walk-in Customer",
 contactNumber: deliveryContact,
 houseNo: deliveryHouseNo || undefined,
 street: deliveryStreet || undefined,
 barangay: deliveryBarangay,
 cityMunicipality: deliveryCity,
 landmark: deliveryLandmark || undefined,
 deliveryDate: deliveryDate,
 deliveryTime: deliveryTime || undefined,
 notes: deliveryNotes || undefined,
 });

 setActiveReceipt({
 ...pendingSaleForFulfillment,
 notes: `SYSTEM ASSIGNED STORE DELIVERY TRACE: ${dRecord.id}\n${deliveryNotes}`,
 });

 setShowReceiptModal(true);
 setShowFulfillmentModal(false);
 setPendingSaleForFulfillment(null);

 // Resetting form
 setDeliveryCustomerName("");
 setDeliveryContact("");
 setDeliveryHouseNo("");
 setDeliveryStreet("");
 setDeliveryBarangay("");
 setDeliveryCity("");
 setDeliveryLandmark("");
 setDeliveryNotes("");

 showToast(`Store delivery scheduled successfully: ${dRecord.id}`);
 };

 const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeSearchTerm.trim()) return;

    const query = barcodeSearchTerm.trim().toLowerCase();
    const userBranchId = activePosBranchId;

    // Search exact matches first
    const exactMatches = products.filter(
      (p) =>
        !p.isDeleted &&
        (p.barcode.toLowerCase() === query ||
          p.sku.toLowerCase() === query ||
          p.productCode.toLowerCase() === query ||
          p.productName.toLowerCase() === query)
    );

    const foundInBranch = exactMatches.find(p => isProductInBranch(p, userBranchId, branchStock, branches));

    if (foundInBranch) {
      const branchQty = getBranchStockQuantity(foundInBranch, userBranchId, branchStock, branches);

      if (branchQty <= 0) {
        showToast("Branch Stock Depleted: Cannot add " + foundInBranch.productName + " (0 remaining in " + (branches.find(b => b.id === userBranchId)?.name || userBranchId) + ")");
        return;
      }
      addToCart(foundInBranch);
      setBarcodeAddFeedback("Added to Basket: " + foundInBranch.productName + " (" + branchQty + " in stock)");
      setBarcodeSearchTerm("");
      setTimeout(() => setBarcodeAddFeedback(null), 3000);
      return;
    }

    if (exactMatches.length > 0) {
      const otherProduct = exactMatches[0];
      const locatedBranches = branchStock
        .filter(bs => bs.productId === otherProduct.id && bs.quantity > 0)
        .map(bs => branches.find(b => b.id === bs.branchId)?.name || bs.branchId)
        .join(", ");

      showToast("Branch Mismatch: \"" + otherProduct.productName + "\" is allocated to " + (locatedBranches || "other branches") + ", not available at your assigned branch.");
      return;
    }

    // Fallback loose match
    const looseMatches = products.filter(
      (p) =>
        !p.isDeleted &&
        (p.barcode.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          p.productName.toLowerCase().includes(query))
    );

    const looseInBranch = looseMatches.find(p => isProductInBranch(p, userBranchId, branchStock, branches));

    if (looseInBranch) {
      const branchQty = getBranchStockQuantity(looseInBranch, userBranchId, branchStock, branches);

      if (branchQty <= 0) {
        showToast("Branch Stock Depleted: " + looseInBranch.productName + " (0 remaining in " + (branches.find(b => b.id === userBranchId)?.name || userBranchId) + ")");
        return;
      }
      addToCart(looseInBranch);
      setBarcodeAddFeedback("Added Loose Match: " + looseInBranch.productName + " (" + branchQty + " in stock)");
      setBarcodeSearchTerm("");
      setTimeout(() => setBarcodeAddFeedback(null), 3000);
    } else if (looseMatches.length > 0) {
      showToast("Product found in catalog, but not allocated to your assigned branch.");
    } else {
      showToast("Match Failure: No tile product matches that barcode/SKU.");
    }
  };

 // Quick Open shift function
 const handleOpenShiftSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 const startingVal = parseFloat(startCashInput) || 0;
 openShift(startingVal);
 setShowShiftModal(false);
 showToast(
 `Cashier terminal shift opened: ₱${startingVal.toFixed(2)} starting drawer.`,
 );
 };

 // Close shift function
 const handleCloseShiftSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 const endingVal = parseFloat(closeShiftCashInput) || 0;
 closeShift(endingVal);
 setCloseShiftCashInput("");
 setShowCloseShiftModal(false);
 showToast(
 `Shift closed successfully. Current register drawer has been locked.`,
 );
 };

 const handleSaveCustomerName = (e: React.FormEvent) => {
 e.preventDefault();
 setCustomerName(customerModalInput.trim() || "Walk-in Customer");
 setShowCustomerModal(false);
 showToast(
 `Ticket assigned to "${customerModalInput || "Walk-in Customer"}".`,
 );
 };

 const handleExportLedgerToExcel = () => {
 if (filteredSales.length === 0) {
 showToast("Cannot export empty report: No transactions match the current filters.");
 return;
 }

 let csv = "";
 // Metadata Headers
 csv += `"TILEPOINT ENTERPRISES - RETAIL MANAGEMENT SYSTEM"\n`;
 csv += `"DAILY CASHIER SALES TRANSACTION REPORT"\n\n`;
 csv += `"Active Branch Pool:","${selectedPoolBranchId === "All" ? "Corporate (All Branches)" : (branches.find(b => b.id === selectedPoolBranchId)?.name || selectedPoolBranchId)}"\n`;
 csv += `"Filtered Payment Mode:","${ledgerPaymentFilter}"\n`;
 csv += `"Filtered Specific Date:","${ledgerDateFilter ? ledgerDateFilter : "All Recorded Dates"}"\n`;
 csv += `"Report Export Timestamp:","${new Date().toISOString()}"\n`;
 csv += `"Total Records Exported:","${filteredSales.length} Transactions"\n\n`;

 // Statistics section
 const totalSubtotal = filteredSales.reduce((acc, s) => acc + s.subtotal, 0);
 const totalDiscount = filteredSales.reduce((acc, s) => acc + s.discount, 0);
 const totalVat = filteredSales.reduce((acc, s) => acc + s.vat, 0);
 const totalGrand = filteredSales.reduce((acc, s) => acc + s.grandTotal, 0);

 csv += `"AGGREGATE SUMS STATISTICS"\n`;
 csv += `"Total Base Subtotal","PHP ${totalSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}"\n`;
 csv += `"Total Applied Discounts","PHP ${totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}"\n`;
 csv += `"Total VAT Covered (12%)","PHP ${totalVat.toLocaleString(undefined, { minimumFractionDigits: 2 })}"\n`;
 csv += `"TOTAL REVENUE SETTLED","PHP ${totalGrand.toLocaleString(undefined, { minimumFractionDigits: 2 })}"\n\n`;

 // Detailed Table headers
 csv += `"Invoice Number","Date Settled","Branch Pool","Cashier Operator","Customer Profile","Payment Mode","Subtotal","Discount","VAT Amount","Grand Total Paid"\n`;

 // Row detail population
 filteredSales.forEach((s) => {
 const branchName = branches.find((b) => b.id === s.branchId)?.name || s.branchId;
 const formattedDate = (s.createdAt && !isNaN(new Date(s.createdAt).getTime())) ? new Date(s.createdAt).toISOString().replace("T", " ").slice(0, 19) : "N/A";
 const customer = s.customerName || "Walk-in Buyer";
 
 const row = [
 s.saleNumber,
 formattedDate,
 branchName,
 s.cashierName,
 customer,
 s.paymentMethod,
 s.subtotal.toFixed(2),
 s.discount.toFixed(2),
 s.vat.toFixed(2),
 s.grandTotal.toFixed(2),
 ];

 csv += row.map((val) => `"${val.replace(/"/g, '""')}"`).join(",") + "\n";
 });

 const fileDateSuffix = ledgerDateFilter ? `_${ledgerDateFilter}` : "";
 const filename = `TilePoint_Cashier_Ledger_Report${fileDateSuffix}.csv`;
 const csvWithBOM = "\uFEFF" + csv;

 saveFileToBackup(csvWithBOM, filename, "Sales_Reports", "text/csv;charset=utf-8;")
 .then(() => {
 showToast(`Excel-ready Daily sales report saved successfully!`);
 })
 .catch((err) => {
 console.error(err);
 showToast("Failed to save report. Initiating direct browser download...");
 const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });
 const url = URL.createObjectURL(blob);
 const link = document.createElement("a");
 link.href = url;
 link.setAttribute("download", filename);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 });
 };

 const handleTriggerPriceOverride = (index: number) => {
 const item = cart[index];
 setOverrideItemIndex(index);
 setOverridePriceInput(
 (item.overridePrice !== undefined
 ? item.overridePrice
 : getBranchPrice(item.product)
 ).toString(),
 );
 setOverrideModalOpen(true);
 };

 const handleSavePriceOverride = (e: React.FormEvent) => {
 e.preventDefault();
 if (overrideItemIndex === null) return;

 const targetPrice = parseFloat(overridePriceInput) || 0;
 const item = cart[overrideItemIndex];

 if (targetPrice < 0) {
 showToast("Error: Overridden price cannot be negative.");
 return;
 }

 if (
 currentUser?.role === UserRole.ADMIN ||
 currentUser?.role === UserRole.MANAGER
 ) {
 // Direct apply
 const updatedCart = [...cart];
 updatedCart[overrideItemIndex].overridePrice = targetPrice;
 setCart(updatedCart);
 setOverrideModalOpen(false);
 showToast(`Applied Custom Price Override: ₱${targetPrice.toFixed(2)}`);
 addAuditLog(
 "POS_OVERRIDE_DIRECT",
 `Manager/Admin ${currentUser?.fullName} applied price override of ₱${targetPrice.toFixed(2)} directly on ${item.product.productName}`,
 "Sales",
 item.product.id,
 );
 } else {
 // Cashier requires authorization from Manager or Admin
 setPendingApproval({
 type: "PRICE_OVERRIDE",
 productId: item.product.id,
 originalPrice: getBranchPrice(item.product),
 overridePrice: targetPrice,
 tempCartItemIndex: overrideItemIndex,
 requiredRole: UserRole.MANAGER,
 });
 setOverrideModalOpen(false);
 setApproverUsername("");
 setApproverPassword("");
 setApprovalError("");
 }
 };

 const handleVerifyApprovalSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setApprovalError("");

 const approver = users.find(
 (u) =>
 u.username.trim().toLowerCase() ===
 approverUsername.trim().toLowerCase(),
 );
 if (!approver) {
 setApprovalError("Invalid approver username.");
 return;
 }

 if (approver.status !== "Active") {
 setApprovalError("Approver terminal credentials have been restricted.");
 return;
 }

 const required = pendingApproval?.requiredRole || UserRole.MANAGER;
 const isAuth =
 approver.role === UserRole.ADMIN ||
 (required === UserRole.MANAGER && approver.role === UserRole.MANAGER);
 if (!isAuth) {
 setApprovalError(
 `Authorization Refused: ${approver.fullName} has role ${approver.role}, but at least role ${required} is required.`,
 );
 return;
 }

 // Hash PBKDF2 check
 const isMatch = await verifyPasswordWithToken(
 approverPassword,
 approver.passwordHash || "",
 );
 if (!isMatch) {
 setApprovalError("Invalid security credentials password.");
 return;
 }

 // Approved! Resolve pending states
 if (pendingApproval?.type === "DISCOUNT") {
 setDiscountType(pendingApproval.discountType!);
 if (
 pendingApproval.discountType === "FLAT" ||
 pendingApproval.discountType === "PERCENT"
 ) {
 setDiscountValue(pendingApproval.discountValue!);
 } else {
 setDiscountValue(0);
 }
 addAuditLog(
 "POS_OVERRIDE_APPROVED",
 `${approver.role} ${approver.fullName} authorized discount override: ${pendingApproval.discountType}, value: ${pendingApproval.discountValue} for Cashier ${currentUser?.fullName}`,
 "Sales",
 "OVERRIDE",
 );
 showToast(
 `Custom discount authorized & applied by ${approver.fullName}!`,
 );
 } else if (pendingApproval?.type === "PRICE_OVERRIDE") {
 const idx = pendingApproval.tempCartItemIndex;
 if (idx !== undefined && idx !== null && cart[idx]) {
 const updatedCart = [...cart];
 updatedCart[idx].overridePrice = pendingApproval.overridePrice;
 setCart(updatedCart);
 addAuditLog(
 "POS_OVERRIDE_APPROVED",
 `${approver.role} ${approver.fullName} authorized price override: ₱${pendingApproval.overridePrice?.toFixed(2)} (was ₱${pendingApproval.originalPrice?.toFixed(2)}) on ${cart[idx].product.productName} for Cashier ${currentUser?.fullName}`,
 "Sales",
 pendingApproval.productId!,
 );
 showToast(
 `Price override authorized & applied by ${approver.fullName}!`,
 );
 }
 }

 // Clean up
 setPendingApproval(null);
 setApproverUsername("");
 setApproverPassword("");
 };

 const triggerReprintWithPin = (sale: Sale) => {
 setPinAction("REPRINT");
 setPinTargetSale(sale);
 setSecurityPinInput("");
 setSecurityPinError("");
 setPinModalOpen(true);
 };

 const triggerVoidWithPin = (sale: Sale) => {
 setPinAction("VOID");
 setPinTargetSale(sale);
 setSecurityPinInput("");
 setSecurityPinError("");
 setPinModalOpen(true);
 };

 const handleVerifySecurityPin = async (e: React.FormEvent) => {
 if (e) e.preventDefault();
 setSecurityPinError("");

 const input = securityPinInput.trim();
 if (!input) {
 setSecurityPinError("Please enter a supervisor PIN.");
 return;
 }

 let isAuthorized = false;
 let authorizerName = "Supervisor";

 // 1. Scan user records for an active Admin/Manager whose managerPin matches
 const foundUserByPin = users.find(
 (u) =>
 (u.role === UserRole.ADMIN || u.role === UserRole.MANAGER) &&
 u.status === "Active" &&
 u.managerPin === input,
 );

 if (foundUserByPin) {
 isAuthorized = true;
 authorizerName = foundUserByPin.fullName;
 } else {
 // 2. Validate fallback values for seed profiles or general manager overrides
 const isEricaPin = input === "4321";
 const isJuanPin = input === "9988";
 const isTomasPin = input === "1122";
 const isDemoPin =
 input === "1234" || input === "0000" || input === "8888";

 if (isEricaPin) {
 const erica = users.find((u) => u.username === "erica_admin");
 authorizerName = erica ? erica.fullName : "Erica Manaban (Admin)";
 isAuthorized = true;
 } else if (isJuanPin) {
 const juan = users.find((u) => u.username === "juan_mgr");
 authorizerName = juan ? juan.fullName : "Juan Gomez (Manager)";
 isAuthorized = true;
 } else if (isTomasPin) {
 const tomas = users.find((u) => u.username === "tomas_mgr");
 authorizerName = tomas ? tomas.fullName : "Tomas Santos (Manager)";
 isAuthorized = true;
 } else if (isDemoPin) {
 authorizerName = "Global Manager (Demo)";
 isAuthorized = true;
 }
 }

 if (!isAuthorized) {
 setSecurityPinError("Invalid Manager PIN. Verification failed.");
 return;
 }

 // Process action verified
 if (pinAction === "REPRINT" && pinTargetSale) {
 setActiveReceipt(pinTargetSale);
 setShowReceiptModal(true);
 showToast(`Recalled Receipt ticket: ${pinTargetSale.saleNumber}`);
 addAuditLog(
 "POS_REPRINT_PIN",
 `Manager ${authorizerName} authorized PIN reprint on transaction ${pinTargetSale.saleNumber}`,
 "Sales",
 pinTargetSale.id,
 );
 } else if (pinAction === "VOID" && pinTargetSale) {
 voidSale(pinTargetSale.id);
 showToast(
 `Void Complete. Restored stock and reversed invoice: ${pinTargetSale.saleNumber}`,
 );
 addAuditLog(
 "POS_VOID_PIN",
 `Manager ${authorizerName} authorized PIN void on transaction ${pinTargetSale.saleNumber}`,
 "Sales",
 pinTargetSale.id,
 );
 }

 // Cleanup
 setPinModalOpen(false);
 setPinAction(null);
 setPinTargetSale(null);
 setSecurityPinInput("");
 };

 const filteredSales = React.useMemo(() => {
 const query = ledgerSearchQuery.trim().toLowerCase();
 return sales.filter((s) => {
 if (selectedPoolBranchId !== "All" && s.branchId !== selectedPoolBranchId) {
 return false;
 }
 if (ledgerPaymentFilter !== "All") {
 if ((s.paymentMethod || "").toLowerCase() !== ledgerPaymentFilter.toLowerCase()) {
 return false;
 }
 }
 if (ledgerDateFilter) {
 const dateObj = new Date(s.createdAt);
 const year = dateObj.getFullYear();
 const month = String(dateObj.getMonth() + 1).padStart(2, "0");
 const day = String(dateObj.getDate()).padStart(2, "0");
 const saleLocalDate = `${year}-${month}-${day}`;
 if (saleLocalDate !== ledgerDateFilter) {
 return false;
 }
 }
 if (query) {
 return (
 (s.saleNumber || "").toLowerCase().includes(query) ||
 (s.customerName || "").toLowerCase().includes(query) ||
 (s.cashierName || "").toLowerCase().includes(query) ||
 (s.paymentMethod || "").toLowerCase().includes(query) ||
 (s.notes || "").toLowerCase().includes(query) ||
 s.grandTotal.toString().includes(query)
 );
 }
 return true;
 });
 }, [sales, selectedPoolBranchId, ledgerSearchQuery, ledgerPaymentFilter, ledgerDateFilter]);

 const SALES_PER_PAGE = 50;
 const totalSalesPages = Math.ceil(filteredSales.length / SALES_PER_PAGE) || 1;
 const paginatedSales = React.useMemo(() => {
 return filteredSales.slice(
 (salesPage - 1) * SALES_PER_PAGE,
 salesPage * SALES_PER_PAGE,
 );
 }, [filteredSales, salesPage]);

 const ledgerStats = React.useMemo(() => {
 const activeSales = filteredSales.filter(s => !s.isDeleted);
 const voidedSales = filteredSales.filter(s => s.isDeleted);
 const netRevenue = activeSales.reduce((acc, s) => acc + s.grandTotal, 0);
 const totalDiscount = activeSales.reduce((acc, s) => acc + s.discount, 0);
 const totalVat = activeSales.reduce((acc, s) => acc + s.vat, 0);
 return {
 activeCount: activeSales.length,
 voidedCount: voidedSales.length,
 netRevenue,
 totalDiscount,
 totalVat,
 totalCount: filteredSales.length
 };
 }, [filteredSales]);

 const receiptBranch = activeReceipt
 ? (branches?.find((b) => b.id === activeReceipt.branchId) || activeBranch)
 : activeBranch;

 return (
 <div className={`flex flex-col w-full gap-4 ${activeSubModule === "checkout" ? "h-full overflow-y-auto lg:overflow-hidden pb-1" : "min-h-fit overflow-visible"}`}>
 {/* FIX: WRAPPED THE ENTIRE ROW IN A CONDITIONAL BLOCK TO HIDE IT IN POS CHECKOUT MODE */}
 {activeSubModule !== "checkout" && (
 <div className="flex border-b border-m3-outline-variant/20 pb-3.5 items-center justify-between mb-2 text-left sticky top-0 bg-m3-surface/90 backdrop-blur-md z-20 pt-2 shadow-sm rounded-b-xl px-2 flex-shrink-0">
 <div>
 <h2 className="text-sm font-black uppercase tracking-widest text-m3-primary pl-1 flex items-center gap-2">
 {(activeSubModule as string) === "checkout" ? (
 <>
 <ShoppingCart className="h-4.5 w-4.5 text-emerald-400" />
 <span>ERP OS TERMINAL CHECKOUT MODE</span>
 </>
 ) : (
 <>
 <History className="h-4.5 w-4.5 text-m3-primary" />
 <span>DAILY SALES LEDGER & VOID TERMINAL (ERP OS)</span>
 </>
 )}
 </h2>
 <p className="text-[10.5px] text-zinc-400 font-semibold pl-1 mt-1">
 {(activeSubModule as string) === "checkout"
 ? "Process and settle materials queued and staged on-the-floor by yard staff."
 : "Audit corporate ledgers, reprint receipts, and execute manager-guarded void overrides."}
 </p>
 </div>

 <div className="flex items-center gap-3">
 {activeShift ? (
 <div className="flex items-center gap-3 bg-m3-surface-low border border-m3-outline-variant/30 p-1.5 pl-3.5 rounded-full shadow-sm">
 <div className="flex flex-col text-right">
 <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
 Shift Active
 </span>
 <span className="text-[10px] font-bold text-m3-on-surface font-sans">
 {activeShift.cashierName}
 </span>
 </div>
 <button
 type="button"
 onClick={() => {
 setCloseShiftCashInput("");
 setShowCloseShiftModal(true);
 }}
 className="py-1.5 px-3.5 bg-rose-500/10 hover:bg-rose-600 hover:text-white border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-wider rounded-full transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
 >
 <LockKeyhole className="h-3 w-3" />
 <span>Close Shift</span>
 </button>
 </div>
 ) : (
 <button
 type="button"
 onClick={() => setShowShiftModal(true)}
 className="py-1.5 px-3.5 bg-amber-500/10 dark:bg-amber-500/15 hover:bg-amber-500 hover:text-white dark:hover:text-black border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider rounded-full transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
 >
 <LockKeyhole className="h-3 w-3 animate-pulse" />
 <span>Open Shift</span>
 </button>
 )}
 </div>
 </div>
 )}

 {activeSubModule === "checkout" ? (
 <div className="flex-1 min-h-0 flex flex-col justify-between gap-4 w-full overflow-hidden">
 {/* MOBILE ONLY TAB SWITCHER */}
 <div className="flex lg:hidden bg-m3-surface-low border border-m3-outline-variant/15 p-1 rounded-2xl w-full gap-1 flex-shrink-0">
 <button
 onClick={() => setMobilePosTab("basket")}
 className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
 mobilePosTab === "basket"
 ? "bg-m3-primary text-m3-on-primary shadow-sm font-black"
 : "text-m3-on-surface-variant hover:bg-m3-primary/5"
 }`}
 >
 <ShoppingCart className="h-4 w-4" />
 <span>Basket ({cart.length})</span>
 </button>
 <button
 onClick={() => setMobilePosTab("queue")}
 className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 relative ${
 mobilePosTab === "queue"
 ? "bg-m3-primary text-m3-on-primary shadow-sm font-black"
 : "text-m3-on-surface-variant hover:bg-m3-primary/5"
 }`}
 >
 <History className="h-4 w-4" />
 <span>Hold Queue ({parkedSales.length})</span>
 {parkedSales.length > 0 && (
 <span className="absolute -top-1 right-2 bg-rose-500 text-white font-mono text-[9px] h-4.5 min-w-[18px] px-1 rounded-full flex items-center justify-center font-black border-2 border-m3-surface-low shadow">
 {parkedSales.length}
 </span>
 )}
 </button>
 </div>

 {/* MAIN GRID FRAMEWORK: ATTACHED DIRECTLY TO VIEWPORT */}
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-fade-in text-m3-on-surface items-stretch flex-1 min-h-0 lg:h-full overflow-y-auto lg:overflow-hidden">
 {/* LEFT COLUMN: HOLD QUEUE */}
 <div
 className={`lg:col-span-4 bg-m3-surface-low p-3.5 sm:p-4 rounded-2xl sm:rounded-[28px] border border-m3-outline-variant/20 shadow-sm space-y-4 text-left self-stretch flex flex-col h-full overflow-hidden min-h-0 ${
 mobilePosTab === "queue" ? "block" : "hidden lg:flex"
 }`}
 >
 <div className="border-b border-m3-outline-variant/15 pb-2 cursor-default flex-shrink-0">
 <h3 className="text-xs font-black text-m3-primary uppercase tracking-widest flex items-center justify-between gap-1.5 w-full">
 <div className="flex items-center gap-1.5">
 <span className="relative flex h-2 w-2">
 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
 <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
 </span>
 <span>
 Yard Staff Transactions HOLD Queue ({parkedSales.length})
 </span>
 </div>
 {syncStatus?.[currentUser?.branchAssignmentId || "B1"] === "Syncing" && (
 <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/25 text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full">
 <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
 Syncing
 </span>
 )}
 </h3>
 <p className="text-[10px] text-zinc-400 font-semibold mt-1 leading-tight">
 Materials staged on-the-floor by floor staff are queued below.
 Select to load basket inside terminal drawer.
 </p>
 </div>

 <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[600px] lg:max-h-none scrollbar-thin">
 {parkedSales.length > 0 ? (
 <div className="flex flex-col gap-3">
 {parkedSales.map((park, idx) => (
 <div
 key={idx}
 onClick={() => handleResume(park.id)}
 className="p-3.5 bg-m3-surface border border-m3-outline-variant/35 hover:border-m3-primary rounded-2xl flex flex-col justify-between shadow-sm cursor-pointer transition-all group relative overflow-hidden text-left gap-2"
 >
 <div className="absolute top-0 bottom-0 left-0 w-1 bg-m3-primary" />
 <div>
 <div className="text-xs font-extrabold text-m3-on-surface leading-snug group-hover:text-m3-primary transition-colors">
 {park.customerName}
 </div>
 <p className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1 font-mono font-bold">
 <span>{park.timestamp}</span>
 <span>•</span>
 <span className="text-m3-primary">
 {park.items.length} tile sets
 </span>
 </p>
 {park.notes && (
 <p className="text-[9px] italic text-[#10B981] mt-1.5 leading-tight bg-[#10B981]/5 p-1.5 rounded border border-[#10B981]/15">
 "{park.notes}"
 </p>
 )}
 </div>

 <button
 type="button"
 className="w-full py-1.5 text-[9.5px] font-black uppercase tracking-widest bg-m3-primary text-m3-on-primary hover:bg-m3-primary/95 transition-colors rounded-xl flex items-center justify-center gap-1 cursor-pointer shadow-sm mt-1"
 >
 Resume Staged Order &rarr;
 </button>
 </div>
 ))}
 </div>
 ) : (
 <div className="py-10 px-4 text-center text-xs text-zinc-400 font-bold border border-dashed border-m3-outline-variant/20 rounded-2xl bg-m3-surface-lowest flex flex-col items-center justify-center gap-2 min-h-[180px] h-full">
 <History className="h-5 w-5 text-zinc-500" />
 <span className="animate-pulse text-zinc-500 leading-relaxed">
 Staged Lobby Clear: Waiting for floor staff to upload
 material hold queues from customer devices.
 </span>
 </div>
 )}
 </div>

 {/* Keyboard Shortcuts & Interactive Speed-Dials */}
 <div className="border-t border-m3-outline-variant/15 pt-3 mt-auto flex-shrink-0 space-y-2.5">
 <button
 type="button"
 onClick={() => setShortcutsCollapsed(!shortcutsCollapsed)}
 className="flex items-center justify-between w-full hover:bg-m3-surface-high/15 p-1.5 rounded-xl transition-all cursor-pointer text-left"
 >
 <span className="text-[10px] font-black text-m3-primary uppercase tracking-widest flex items-center gap-1.5 font-sans">
 <Keyboard className="h-3.5 w-3.5 text-m3-primary animate-pulse" />
 <span>POS Checkout Speed-Dials</span>
 </span>
 <div className="flex items-center gap-2">
 <span className="text-[9px] bg-m3-primary/10 text-m3-primary px-2 py-0.5 rounded-full font-black uppercase tracking-wider font-mono">
 Active Hotkeys
 </span>
 {shortcutsCollapsed ? (
 <ChevronDown className="h-4 w-4 text-m3-primary transition-transform duration-200" />
 ) : (
 <ChevronUp className="h-4 w-4 text-m3-primary transition-transform duration-200" />
 )}
 </div>
 </button>

 {!shortcutsCollapsed && (
 <div className="space-y-2.5 animate-fade-in">
 <div className="grid grid-cols-2 gap-2">
 {[
 { key: "F1", desc: "Void Current Sale", action: () => handleCancelSale(), bg: "hover:bg-rose-500/10 hover:border-rose-500/30 text-rose-600 dark:text-rose-400" },
 { key: "F2", desc: "Focus Search Catalog", action: () => searchInputRef.current?.focus(), bg: "hover:bg-m3-primary/10 hover:border-m3-primary/30" },
 { key: "F3", desc: "Hold Order Stash", action: () => handleHold(), bg: "hover:bg-amber-500/10 hover:border-amber-500/30 text-amber-600 dark:text-amber-400" },
 { key: "F5", desc: "Assign Customer Name", action: () => { setCustomerModalInput(customerName); setShowCustomerModal(true); }, bg: "hover:bg-m3-primary/10 hover:border-m3-primary/30 text-m3-primary" },
 { key: "F6", desc: "Apply Code/Discount", action: () => { setDiscountInput(""); setShowDiscountModal(true); }, bg: "hover:bg-teal-500/10 hover:border-teal-500/30 text-teal-600 dark:text-teal-400" },
 { key: "F7", desc: "Go to Pay Tender", action: () => {
 if (cart.length > 0) {
 const checkSection = document.getElementById("checkout-action-panel");
 checkSection?.scrollIntoView({ behavior: "smooth" });
 const tenderIdx = document.getElementById("cash-tendered-field");
 tenderIdx?.focus();
 } else {
 alert("Your active cart is currently empty.");
 }
 }, bg: "hover:bg-emerald-500/10 hover:border-emerald-500/30 text-emerald-600 dark:text-emerald-400" },
 { key: "F8", desc: "Reprint Last Receipt", action: () => {
 if (activeReceipt) {
 setShowReceiptModal(true);
 } else {
 alert("No transaction has been processed in this session yet.");
 }
 }, bg: "hover:bg-purple-500/10 hover:border-purple-500/30 text-purple-600 dark:text-purple-400" },
 { key: "F9/10", desc: "Shift Active Controls", action: () => {
 if (activeShift) {
 setCloseShiftCashInput("");
 setShowCloseShiftModal(true);
 } else {
 setShowShiftModal(true);
 }
 }, bg: "hover:bg-m3-tertiary/10 hover:border-m3-tertiary/30 text-m3-tertiary" }
 ].map((sh, index) => (
 <button
 key={index}
 type="button"
 onClick={sh.action}
 className={`flex items-center gap-2 p-2 bg-m3-surface border border-m3-outline-variant/15 rounded-xl text-left transition-all active:scale-[0.98] group cursor-pointer ${sh.bg}`}
 >
 <kbd className="px-1.5 py-0.5 text-[9px] font-black font-mono bg-m3-surface-high/60 text-m3-on-surface border border-m3-outline-variant/30 rounded shadow-sm group-hover:bg-m3-primary group-hover:text-white group-hover:border-m3-primary transition-colors flex-shrink-0">
 {sh.key}
 </kbd>
 <span className="text-[10px] font-bold tracking-tight text-m3-on-surface-variant leading-tight truncate">
 {sh.desc}
 </span>
 </button>
 ))}
 </div>
 <p className="text-[8.5px] text-zinc-500 text-center font-mono">
 Press physical keys directly, or click above as interactive speed dials.
 </p>
 </div>
 )}
 </div>
 </div>

 {/* RIGHT COLUMN: ACTIVE ORDER LIST */}
 <div
 className={`lg:col-span-8 text-left h-full flex flex-col overflow-hidden min-h-0 ${
 mobilePosTab === "basket" ? "block" : "hidden lg:flex"
 }`}
 >
 <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-[28px] border border-m3-outline-variant/35 bg-m3-surface-low shadow-sm flex flex-col h-full overflow-hidden min-h-0">
 {/* Header Metadata block */}
 <div className="flex-shrink-0 space-y-2.5">
 <div className="border-b border-m3-outline-variant/15 pb-2">
 <div className="flex flex-wrap items-center justify-between gap-2 pl-1 mb-1">
 <h3 className="text-xs font-black text-m3-primary uppercase tracking-widest flex items-center gap-2">
 <ShoppingCart className="h-4 w-4" />
 <span>Active Order list of materials</span>
 {syncStatus?.[currentUser?.branchAssignmentId || "B1"] === "Syncing" && (
 <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/25 text-[9px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded-full ml-1.5">
 <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
 Syncing
 </span>
 )}
 </h3>
 <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] font-black uppercase tracking-wide">
<div className="flex items-center gap-1.5 bg-m3-surface border border-m3-outline-variant/30 px-2.5 py-1 rounded-full text-[10px] font-bold text-m3-on-surface shadow-xs">
  <Building2 className="h-3.5 w-3.5 text-m3-primary shrink-0" />
  <span className="text-zinc-400 font-medium">Branch:</span>
  <span className="font-black text-m3-primary uppercase">
    {branches.find(b => b.id === (currentUser?.branchAssignmentId || activePosBranchId))?.name || currentUser?.branchAssignmentId || activePosBranchId}
  </span>
</div>
<span className="text-zinc-500">•</span>
 <button
 type="button"
 onClick={() => setShowTileCalculatorModal(true)}
 className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9.5px]"
 title="Open Tile Coverage Calculator"
 >
 <Calculator className="h-3.5 w-3.5 text-emerald-400" />
 <span>Tile Calculator</span>
 </button>
 <span className="text-zinc-500">•</span>
 <button
 type="button"
 onClick={() =>
 setIsCustomerMetadataCollapsed(
 !isCustomerMetadataCollapsed,
 )
 }
 className="text-m3-primary hover:text-m3-primary/85 flex items-center gap-1 cursor-pointer transition-colors"
 >
 {isCustomerMetadataCollapsed
 ? "Show Profile"
 : "Hide Profile"}
 </button>
 <span className="text-zinc-500">•</span>
 <button
 type="button"
 onClick={handleCancelSale}
 className="text-rose-500 hover:text-rose-650 flex items-center gap-1 cursor-pointer transition-colors"
 >
 Clear Active Order
 </button>
 </div>
 </div>
 </div>

 {/* Customer context assignment */}
 <div className="mb-4 bg-m3-surface-low/60 border border-m3-outline-variant/25 p-3 rounded-2xl shadow-sm">
 <button
 type="button"
 onClick={() =>
 setIsCustomerMetadataCollapsed(
 !isCustomerMetadataCollapsed,
 )
 }
 className="w-full flex items-center justify-between text-left focus:outline-none group pb-1.5 border-b border-m3-outline-variant/10 cursor-pointer"
 >
 <span className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 block select-none">
 Customer Info & Project Assignment{" "}
 {customerName && customerName !== "Walk-in Customer"
 ? `(${customerName})`
 : ""}
 </span>
 <div className="flex items-center gap-1 text-[9px] text-zinc-400 group-hover:text-m3-primary transition-colors font-bold uppercase tracking-wider">
 <span>
 {isCustomerMetadataCollapsed ? "Show" : "Hide"}
 </span>
 {isCustomerMetadataCollapsed ? (
 <ChevronDown className="h-3 w-3" />
 ) : (
 <ChevronUp className="h-3 w-3" />
 )}
 </div>
 </button>

 <AnimatePresence initial={false}>
 {!isCustomerMetadataCollapsed && (
 <motion.div
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: "auto" }}
 exit={{ opacity: 0, height: 0 }}
 transition={{ duration: 0.15 }}
 className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 overflow-visible relative pb-1"
 >
 <div className="relative pl-0">
 <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest pl-1 block mb-1">
 Customer Profile
 </label>
 <input
 type="text"
 value={customerName}
 onChange={(e) =>
 setCustomerName(e.target.value.slice(0, 100))
 }
 maxLength={100}
 placeholder="Manuel Santos / Walk-in"
 className="w-full bg-m3-surface border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-1.5 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-lg font-bold"
 />
 {customerName.trim().length > 0 && (() => {
   const matchedMembers = members.filter(
     (m) =>
       m.status === "Active" &&
       m.fullName.toLowerCase() !== customerName.toLowerCase() &&
       (m.fullName.toLowerCase().includes(customerName.toLowerCase()) ||
        m.phone.includes(customerName) ||
        m.email.toLowerCase().includes(customerName.toLowerCase()))
   );
   if (matchedMembers.length === 0) return null;
   return (
     <div className="absolute left-0 right-0 mt-1 bg-m3-surface-low border border-m3-outline-variant/35 rounded-xl shadow-lg z-30 max-h-32 overflow-y-auto divide-y divide-m3-outline-variant/10 text-xs font-sans">
       <div className="p-1 text-[8.5px] font-bold uppercase tracking-wider text-m3-primary bg-m3-primary/5 px-2">
         Matching Registered Members (Click to Select)
       </div>
       {matchedMembers.slice(0, 5).map((m) => (
         <button
           type="button"
           key={m.id}
           onClick={() => {
             setCustomerName(m.fullName);
           }}
           className="w-full text-left px-2.5 py-1.5 hover:bg-m3-primary/10 text-[11px] font-bold text-m3-on-surface flex justify-between items-center transition-colors border-0 bg-transparent cursor-pointer"
         >
           <div>
             <span>{m.fullName}</span>
             <span className="text-[9px] text-zinc-400 font-normal block">{m.phone}</span>
           </div>
           <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-1 rounded">Select</span>
         </button>
       ))}
     </div>
   );
 })()}
 </div>
 <div className="relative pl-0">
 <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest pl-1 block mb-1">
 Ticket Note / Project Assign (Optional)
 </label>
 <input
 type="text"
 value={customerNotes}
 onChange={(e) =>
 setCustomerNotes(e.target.value.slice(0, 100))
 }
 maxLength={100}
 placeholder="e.g. Master Bedroom Toilet tiles, Travertine Matt"
 className="w-full bg-m3-surface border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-1.5 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-lg font-bold"
 />
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>

 {/* Barcode scan input search bar */}
 {!products.some((p) => !p.isDeleted) ? (
 <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-left font-sans shadow-inner">
 <div className="flex items-center gap-2 text-amber-500 font-extrabold text-xs uppercase tracking-wider mb-1">
 <span className="text-sm">️</span> Scanner Locked / Catalog Empty
 </div>
 <p className="text-[10.5px] text-zinc-300 font-medium leading-relaxed">
 The Rapid Barcode Laser Scanner is inactive because there are no products in the inventory catalog. Please navigate to the <strong className="text-m3-primary font-bold">Inventory Module</strong> to add or import tile products first.
 </p>
 </div>
 ) : (
 <form
 onSubmit={handleBarcodeSubmit}
 className="bg-m3-surface-low border border-m3-primary/15 hover:border-m3-primary/35 p-2.5 rounded-2xl transition-all relative"
 >
 <div className="flex flex-col md:flex-row gap-2 items-center">
 <div className="flex-1 w-full text-left">
 <label className="text-[9px] font-black text-m3-primary uppercase tracking-widest pl-1 block mb-1.5">
 Rapid Barcode Laser Scanner / Item SKU Input
 </label>
 <div className="relative font-sans">
 <input
 type="text"
 value={barcodeSearchTerm}
 onChange={(e) =>
 setBarcodeSearchTerm(e.target.value)
 }
 placeholder="Type product name, SKU, or custom design... (e.g. BLD01, SLVR-40, hit Enter)"
 className="w-full bg-m3-surface-lowest text-xs text-m3-on-surface focus:outline-none focus:ring-1 focus:ring-m3-primary/50 border border-m3-outline-variant/30 px-3.5 py-1.5 pr-12 rounded-xl placeholder-zinc-500 font-bold"
 />
 {barcodeSearchTerm && (
 <button
 type="button"
 onClick={() => setBarcodeSearchTerm("")}
 className="absolute right-16 top-1.5 text-zinc-400 hover:text-rose-500 text-xs font-black px-1"
 >
 
 </button>
 )}
 <span className="absolute right-3 top-2 text-zinc-500 text-[9px] uppercase font-mono font-bold select-none pointer-events-none">
 [ ENTER ]
 </span>

 {barcodeSearchTerm.trim().length > 0 && (
 <div className="absolute left-0 right-0 mt-2 bg-m3-surface-lowest border border-m3-outline-variant/60 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-m3-outline-variant/20 text-xs max-h-[180px] overflow-y-auto">
 {(() => {
 const matched = products.filter(
 (p) =>
 !p.isDeleted &&
 (selectedCategory === "All" ||
 p.category === selectedCategory) &&
 (p.productName
 .toLowerCase()
 .includes(
 barcodeSearchTerm.toLowerCase(),
 ) ||
 p.sku
 .toLowerCase()
 .includes(
 barcodeSearchTerm.toLowerCase(),
 ) ||
 p.barcode
 .toLowerCase()
 .includes(
 barcodeSearchTerm.toLowerCase(),
 )),
 );
 if (matched.length === 0) {
 return (
 <div className="p-4 text-center text-zinc-500 font-bold text-xs italic">
 No compatible tiles or SKU listings match "{barcodeSearchTerm}"
 </div>
 );
 }
 return matched.slice(0, 6).map((p) => (
 <div
 key={p.id}
 onClick={() => {
 if (p.stockQuantity <= 0) {
 showToast(
 `Out of stock: Cannot add ${p.productName}`,
 );
 return;
 }
 addToCart(p);
 setBarcodeAddFeedback(
 `Added: ${p.productName}`,
 );
 setBarcodeSearchTerm("");
 setTimeout(
 () => setBarcodeAddFeedback(null),
 3000,
 );
 }}
 className="p-2.5 hover:bg-m3-primary/10 cursor-pointer flex justify-between items-center transition-colors text-left"
 >
 <div className="space-y-0.5">
 <div className="font-extrabold text-m3-on-surface text-xs">
 {p.productName}
 </div>
 <div className="text-[10px] text-zinc-400 font-mono font-bold">
 SKU: {p.sku} • Stock: {p.stockQuantity}
 </div>
 </div>
 <div className="text-right font-black text-emerald-600 dark:text-emerald-400 text-xs">
 ₱
 {getBranchPrice(p).toLocaleString(
 undefined,
 { minimumFractionDigits: 2 },
 )}
 </div>
 </div>
 ));
 })()}
 </div>
 )}
 </div>
 </div>
 <button
 type="submit"
 className="w-full md:w-auto px-4 py-1.5 bg-m3-primary text-m3-on-primary hover:bg-m3-primary/95 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer self-end shrink-0 transition-all flex items-center gap-1.5 h-[32px] shadow-sm justify-center"
 >
 SKU Scan
 </button>
 </div>
 </form>
 )}
 </div>

 {/* DYNAMIC INDEPENDENT OVERFLOW SCROLL TRACK */}
 <div className="flex-1 h-0 overflow-auto my-3 pr-1 space-y-1.5 border border-m3-outline-variant/10 rounded-2xl p-2.5 bg-m3-surface/20 scrollbar-thin"><div className="min-w-[550px] w-full pb-1">
 <AnimatePresence initial={false}>
 {cart.map((item, idx) => (
 <motion.div
 key={item.product.id}
 initial={{ opacity: 0, y: 15 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, x: -30, height: 0, padding: 0 }}
 transition={{
 type: "spring",
 stiffness: 450,
 damping: 30,
 }}
 className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 py-2.5 border-b border-m3-outline-variant/10 last:border-0 pl-1 overflow-hidden"
 >
 <div className="space-y-0.5 text-left w-full sm:w-auto">
 <h5 className="text-xs font-black leading-tight text-m3-on-surface">
 {item.product.productName}
 </h5>
 <div className="text-[10px] text-zinc-400 flex flex-wrap items-center gap-1.5 font-mono font-bold">
 {item.overridePrice !== undefined ? (
 <>
 <span className="text-zinc-500 line-through">
 ₱{getBranchPrice(item.product).toFixed(2)}
 </span>
 <span className="text-emerald-500 font-extrabold bg-emerald-500/10 px-1 rounded">
 ₱{item.overridePrice.toFixed(2)}
 </span>
 </>
 ) : (
 <span className="text-zinc-300">
 ₱{getBranchPrice(item.product).toFixed(2)}
 </span>
 )}
 <span>/{item.product.unit}</span>
 <span>•</span>
 <span className="text-m3-primary">
 SKU: {item.product.sku}
 </span>
 <span>•</span>
 <button
 type="button"
 onClick={() => handleTriggerPriceOverride(idx)}
 className="text-[9px] font-black text-m3-primary hover:text-m3-primary/80 transition-colors uppercase bg-m3-primary/5 px-1.5 py-0.2 rounded"
 >
 [Override]
 </button>
 {item.quantity < 0 && (
 <>
 <span>•</span>
 <span className="text-[9px] font-black uppercase text-rose-500 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20 shrink-0">
 Return / Refund Item
 </span>
 </>
 )}
 </div>
 </div>

 <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto shrink-0">
 {(() => {
 const userBranchId = activePosBranchId;
 const currentMaxStock = products.find((p) => p.id === item.product.id)?.stockQuantity ?? getBranchStockQuantity(item.product, userBranchId, branchStock, branches);
 return (
 <div className="flex items-center border border-m3-outline-variant rounded-lg overflow-hidden shrink-0 bg-m3-surface">
 <button
 type="button"
 title="Decrement quantity"
 onClick={() => {
 let nextQty = item.quantity - 1;
 if (nextQty === 0) nextQty = -1;
 updateCartQty(
 item.product.id,
 nextQty,
 currentMaxStock,
 );
 }}
 className="px-2 py-0.5 hover:bg-m3-outline-variant/20 text-xs font-mono font-bold text-m3-on-surface cursor-pointer"
 >
 -
 </button>
 <CartQtyInput
 quantity={item.quantity}
 productId={item.product.id}
 maxStock={currentMaxStock}
 updateCartQty={updateCartQty}
 removeFromCart={removeFromCart}
 />
 <button
 type="button"
 title="Increment quantity"
 onClick={() => {
 let nextQty = item.quantity + 1;
 if (nextQty === 0) nextQty = 1;
 updateCartQty(
 item.product.id,
 nextQty,
 currentMaxStock,
 );
 }}
 className="px-2 py-0.5 hover:bg-m3-outline-variant/20 text-xs font-mono font-bold text-m3-on-surface cursor-pointer"
 >
 +
 </button>
 <button
 type="button"
 title="Toggle positive/negative quantity (Return item)"
 onClick={() =>
 updateCartQty(
 item.product.id,
 -item.quantity,
 currentMaxStock,
 )
 }
 className={`px-1.5 py-0.5 text-[10px] font-mono font-black border-l border-m3-outline-variant/30 cursor-pointer transition-colors ${
 item.quantity < 0
 ? "bg-rose-500/20 text-rose-500 hover:bg-rose-500/30"
 : "text-zinc-400 hover:text-m3-primary hover:bg-m3-outline-variant/20"
 }`}
 >
 +/-
 </button>
 </div>
 );
 })()}

 <div className="flex items-center gap-3">
 <span className="text-xs font-black font-mono min-w-[80px] text-right text-m3-on-surface">
 ₱
 {(
 (item.overridePrice !== undefined
 ? item.overridePrice
 : getBranchPrice(item.product)) *
 item.quantity
 ).toLocaleString(undefined, {
 minimumFractionDigits: 2,
 })}
 </span>
 <button
 type="button"
 onClick={() => removeFromCart(item.product.id)}
 className="text-zinc-400 hover:text-red-500 p-1 rounded-full hover:bg-red-500/10 transition-colors"
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </div>
 </div>
 </motion.div>
 ))}
 </AnimatePresence>

 {cart.length === 0 && (
 <div className="text-center py-12 text-zinc-400 text-xs flex flex-col items-center justify-center gap-2 font-bold min-h-[160px] h-full">
 <ShoppingCart className="h-8 w-8 text-m3-primary/30" />
 <span className="max-w-xs leading-relaxed text-zinc-500">
 Active Cashier billing basket is empty. Select a staged
 ticket from the hold queue to begin.
 </span>
 <button
 type="button"
 onClick={() => setShowTileCalculatorModal(true)}
 className="mt-3 py-2 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-[10.5px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
 >
 <Calculator className="h-4 w-4 text-emerald-400" />
 <span>Open Tile Calculator</span>
 </button>
 </div>
 )}
 </div>
 </div>

 {/* Fixed operational footer calculation layer */}
 <div className="flex-shrink-0 border-t border-m3-outline-variant/20 pt-3 grid grid-cols-1 xl:grid-cols-12 gap-5">
 <div className="xl:col-span-5 xl:space-y-1 pt-0.5">
 <div className="flex justify-between text-xs font-bold text-zinc-400">
 <span>
 {discountType === "SENIOR" || discountType === "PWD"
 ? "VAT-Exempt Sales"
 : "VATable Sales (Net)"}
 </span>
 <span className="font-mono">₱{subtotal.toFixed(2)}</span>
 </div>
 <div className="flex justify-between text-xs font-bold text-zinc-400 mt-0.5">
 <span>
 {discountType === "SENIOR" || discountType === "PWD"
 ? "12% Output VAT (Exempt)"
 : "12% Output VAT"}
 </span>
 <span className="font-mono">₱{vat.toFixed(2)}</span>
 </div>

 {discountAmount > 0 && (
 <div className="flex justify-between text-xs font-black text-emerald-500 mt-0.5">
 <span>Discount Voucher Applied</span>
 <span className="font-mono">
 -₱{discountAmount.toFixed(2)}
 </span>
 </div>
 )}

 <div className="flex justify-between text-sm font-black border-t border-dashed border-m3-outline-variant/30 pt-2 mt-1.5">
 <span className="text-m3-on-surface text-xs uppercase tracking-wide">
 GRAND TOTAL DUE
 </span>
 <span className="font-mono text-m3-primary text-lg font-extrabold">
 ₱
 {grandTotal.toLocaleString(undefined, {
 minimumFractionDigits: 2,
 })}
 </span>
 </div>

 <button
 type="button"
 onClick={() => {
 setDiscountInput("");
 setShowDiscountModal(true);
 }}
 className="w-full mt-2 flex items-center justify-center gap-1.5 text-[10px] py-1.5 bg-m3-primary/10 hover:bg-m3-primary/20 text-m3-primary font-black rounded-lg border border-m3-primary/25 uppercase tracking-wider transition-colors"
 >
 <Sparkles className="h-3 w-3" /> Apply Cardholder Discount
 (F6)
 </button>
 </div>

 <div
 id="checkout-action-panel"
 className="xl:col-span-7 bg-m3-surface p-3.5 rounded-2xl border border-m3-outline-variant/35 space-y-2.5 shadow-inner text-left"
 >
 <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
 <div className="sm:col-span-6 space-y-1">
 <label className="text-[9px] font-black text-m3-primary uppercase tracking-widest pl-1 block">
 Settlement Method
 </label>
 <div className="grid grid-cols-3 gap-1.5">
 {(
    [
      { name: `Cash`, label: `Cash`, color: `border-emerald-500/25 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5`, activeColor: `bg-emerald-600 border-emerald-600 text-white` },
      { name: `GCash`, label: `GCash`, color: `border-sky-500/25 text-sky-600 dark:text-sky-400 bg-sky-500/5`, activeColor: `bg-sky-600 border-sky-600 text-white` },
      { name: `Maya`, label: `Maya`, color: `border-green-500/25 text-green-600 dark:text-green-400 bg-green-500/5`, activeColor: `bg-green-600 border-green-600 text-white` },
      { name: `Card / Bank Terminal`, label: `Card / Bank Terminal`, color: `border-violet-500/25 text-violet-600 dark:text-violet-400 bg-violet-500/5`, activeColor: `bg-violet-600 border-violet-600 text-white` },
      { name: `Member Credit`, label: `Member`, color: `border-m3-primary/25 text-m3-primary bg-m3-primary/5`, activeColor: `bg-m3-primary border-m3-primary text-white` },
    ] as const
  ).map((method) => (
    <button
      key={method.name}
      type="button"
      onClick={() => {
        setPaymentMethod(method.name);
        if (method.name !== "Cash") {
          setAmountTendered(Math.abs(grandTotal).toString());
        } else {
          setAmountTendered("");
        }
      }}
      className={`py-1.5 px-0.5 text-[9px] rounded-lg border font-black select-none text-center transition-all cursor-pointer ${
        paymentMethod === method.name
          ? `${method.activeColor} shadow-md scale-[1.02]`
          : `bg-m3-surface-lowest border-m3-outline-variant/40 hover:bg-m3-outline-variant/20 ${method.color}`
      }`}
    >
      <span className="flex items-center justify-center gap-1">
        {method.label}
      </span>
    </button>
  ))}
 </div>
 </div>

 <div className="sm:col-span-6 space-y-1">
 <label className="text-[9px] font-black text-m3-primary uppercase tracking-widest pl-1 block">
 Amount Tendered (PHP)
 </label>
 <input
 id="cash-tendered-field"
 type="number"
 disabled={paymentMethod !== "Cash"}
 value={amountTendered}
 onChange={(e) => setAmountTendered(e.target.value)}
 placeholder={grandTotal.toFixed(0)}
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant px-3 py-1.5 text-xs text-m3-on-surface font-mono font-bold focus:outline-none focus:border-m3-primary transition-colors disabled:opacity-45 disabled:cursor-not-allowed rounded-t-lg"
 />

 {paymentMethod === "Cash" && grandTotal > 0 && (
 <div className="flex flex-wrap gap-1 mt-1">
 <button
 type="button"
 onClick={() =>
 setAmountTendered(grandTotal.toString())
 }
 className="text-[9px] font-black uppercase bg-m3-primary/10 text-m3-primary px-1.5 py-0.5 rounded border border-m3-primary/20 hover:bg-m3-primary/20"
 >
 Exact
 </button>
 {[100, 500, 1000].map((val) => (
 <button
 key={val}
 type="button"
 onClick={() => {
 const current =
 parseFloat(amountTendered) || 0;
 setAmountTendered((current + val).toString());
 }}
 className="text-[9px] font-black bg-zinc-800 text-white hover:bg-zinc-700 px-1.5 py-0.5 rounded shadow-sm"
 >
 +₱{val}
 </button>
 ))}
 </div>
 )}
 </div>
 </div>

{paymentMethod !== "Cash" && paymentMethod !== "Member Credit" && (
        <div className="p-3 bg-m3-surface-low border border-m3-outline-variant/30 rounded-xl space-y-2 mt-2 font-sans animate-fade-in text-xs text-left">
          {/* Verification Reference Number Field */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[9px] font-black text-m3-primary uppercase tracking-widest pl-1 block">
                {paymentMethod === "Card / Bank Terminal" ? "Receipt Reference / Approval No." : "Payment Reference Number"}
              </label>
            </div>
            <div className="relative">
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder={
                  paymentMethod === "Card / Bank Terminal"
                    ? "Enter printed receipt reference or card approval code"
                    : `Enter 13-digit reference number from ${paymentMethod} payment`
                }
                className="w-full bg-m3-surface-lowest border border-m3-outline-variant/60 rounded-lg px-3 py-1.5 text-xs text-m3-on-surface font-mono font-bold focus:outline-none focus:border-m3-primary transition-all"
              />
              {paymentRef.trim() && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500 text-[10px] font-bold select-none">
                  Verified
                </span>
              )}
            </div>
          </div>
        </div>
      )}

        {paymentMethod === "Cash" &&
 parseFloat(amountTendered) >= grandTotal && (
 <div className="p-1.5 px-3 bg-m3-tertiary-container border border-m3-tertiary/25 text-m3-on-tertiary-container rounded-lg flex justify-between items-center text-xs font-mono font-extrabold animate-fade-in mb-1">
 <span className="text-[9px] font-bold uppercase tracking-wider">
 CHANGE DISPENSE:
 </span>
 <span className="text-xs">
 ₱{changeAmount.toFixed(2)}
 </span>
 </div>
 )}

				{(paymentMethod === "Member Credit" || members.some(m => m.fullName.toLowerCase() === customerName.toLowerCase())) && (() => {
					const matchingMember = members.find(
						(m) => m.fullName.toLowerCase() === customerName.toLowerCase()
					);
					const spendPerPt = loyaltyConfig?.spendPerPoint || 500;
					const ptValPhp = loyaltyConfig?.pointValueInPhp || 1.0;
					const netAmountForPts = Math.max(0, grandTotal - (pointsToRedeem * ptValPhp));
					const projectedEarnedPts = (loyaltyConfig?.enabled && spendPerPt > 0 && netAmountForPts > 0)
						? Math.floor(netAmountForPts / spendPerPt) * (loyaltyConfig?.pointsPerSpend || 1)
						: 0;

					return (
						<div className="p-3 bg-m3-surface-low border border-m3-outline-variant/30 rounded-xl space-y-2 mt-2 font-sans animate-fade-in text-xs text-left">
							<div className="flex items-center justify-between font-bold text-[11px] text-m3-primary uppercase tracking-wider">
								<div className="flex items-center gap-1.5">
									<Users className="h-4 w-4" />
									<span>Member Account & Loyalty Desk</span>
								</div>
								<div className="flex items-center gap-1.5">
									<button
										type="button"
										onClick={() => {
											setNewMemberName(customerName !== "Walk-in Customer" ? customerName : "");
											setAddMemberError("");
											setShowAddMemberModal(true);
										}}
										className="px-2 py-0.5 bg-m3-primary hover:bg-m3-primary/90 text-m3-on-primary text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
									>
										<UserPlus className="h-3 w-3" />
										<span>+ Member</span>
									</button>
								</div>
							</div>

							{matchingMember ? (
								<div className="space-y-2">
									<div className="space-y-1 bg-m3-surface-lowest p-2.5 rounded-lg border border-m3-outline-variant/15">
										<div className="flex justify-between items-center">
											<span className="text-zinc-500 dark:text-zinc-400">Account:</span>
											<span className="font-extrabold text-m3-on-surface">{matchingMember.fullName}</span>
										</div>

										{paymentMethod === "Member Credit" && (
											<>
												<div className="flex justify-between items-center text-[11px]">
													<span className="text-zinc-500 dark:text-zinc-400">Credit Limit:</span>
													<span className="font-mono font-bold text-m3-on-surface">₱{matchingMember.creditLimit.toLocaleString()}</span>
												</div>
												<div className="flex justify-between items-center text-[11px]">
													<span className="text-zinc-500 dark:text-zinc-400">Outstanding Debt:</span>
													<span className="font-mono font-bold text-amber-500">₱{matchingMember.outstandingBalance.toLocaleString()}</span>
												</div>
												<div className="border-t border-m3-outline-variant/10 my-1 pt-1 flex justify-between items-center">
													<span className="font-bold text-zinc-500 dark:text-zinc-400">Available Credit:</span>
													<span className={`font-mono font-black ${matchingMember.creditLimit - matchingMember.outstandingBalance >= grandTotal ? 'text-emerald-500' : 'text-rose-500'}`}>
														₱{(matchingMember.creditLimit - matchingMember.outstandingBalance).toLocaleString()}
													</span>
												</div>
											</>
										)}

										{matchingMember.status !== "Active" ? (
											<div className="text-[10px] text-rose-500 font-bold bg-rose-500/10 p-1 px-2 rounded mt-1 border border-rose-500/20">
												⚠️ Account is suspended.
											</div>
										) : paymentMethod === "Member Credit" && matchingMember.creditLimit - matchingMember.outstandingBalance < grandTotal ? (
											<div className="text-[10px] text-rose-500 font-bold bg-rose-500/10 p-1 px-2 rounded mt-1 border border-rose-500/20">
												⚠️ Purchase exceeds available credit limit.
											</div>
										) : (
											<div className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 p-1 px-2 rounded mt-1 border border-emerald-500/20 flex items-center gap-1">
												✅ Account active for checkout.
											</div>
										)}
									</div>

									{/* LOYALTY POINTS & REWARDS BOX */}
									<div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-2.5 rounded-lg border border-amber-500/20 space-y-2">
										<div className="flex items-center justify-between">
											<span className="font-extrabold text-[11px] text-amber-500 flex items-center gap-1">
												<Sparkles className="h-3.5 w-3.5" />
												<span>Loyalty Points Rewards</span>
											</span>
											<span className="text-[10px] font-mono text-zinc-400 font-bold">
												Formula: ₱{spendPerPt.toLocaleString()} = 1 Pt
											</span>
										</div>

										<div className="grid grid-cols-2 gap-2 text-[11px]">
											<div className="bg-m3-surface-lowest/80 p-2 rounded-md border border-m3-outline-variant/10">
												<span className="text-zinc-400 text-[10px] block font-medium">Current Balance:</span>
												<span className="font-mono font-extrabold text-amber-500 text-xs">
													⭐ {(matchingMember.points || 0)} Pts
												</span>
												<span className="text-[9px] text-zinc-400 block font-mono">
													(Value: ₱{((matchingMember.points || 0) * ptValPhp).toFixed(2)})
												</span>
											</div>

											<div className="bg-m3-surface-lowest/80 p-2 rounded-md border border-m3-outline-variant/10">
												<span className="text-zinc-400 text-[10px] block font-medium">Earned This Order:</span>
												<span className="font-mono font-extrabold text-emerald-500 text-xs">
													+{projectedEarnedPts} Pts
												</span>
												<span className="text-[9px] text-zinc-400 block font-mono">
													(Auto-credited upon checkout)
												</span>
											</div>
										</div>

										{/* Point Redemption Action Box */}
										{(matchingMember.points || 0) > 0 && grandTotal > 0 && (
											<div className="pt-1.5 border-t border-amber-500/15 space-y-1.5">
												<div className="flex items-center justify-between">
													<label className="text-[10px] font-bold text-m3-on-surface uppercase tracking-wide">
														Redeem Points for Discount
													</label>
													{pointsToRedeem > 0 && (
														<span className="text-[10px] font-mono font-extrabold text-emerald-500">
															-₱{(pointsToRedeem * ptValPhp).toFixed(2)} Off
														</span>
													)}
												</div>

												<div className="flex items-center gap-1.5">
													<input
														type="number"
														min="0"
														max={Math.min(matchingMember.points || 0, Math.floor(grandTotal / ptValPhp))}
														value={pointsToRedeem || ""}
														onChange={(e) => {
															const val = parseInt(e.target.value) || 0;
															const maxAllowed = Math.min(matchingMember.points || 0, Math.floor(grandTotal / ptValPhp));
															setPointsToRedeem(Math.max(0, Math.min(val, maxAllowed)));
														}}
														placeholder="Enter points to redeem"
														className="w-full bg-m3-surface-lowest border border-m3-outline-variant/40 rounded-md px-2 py-1 text-xs font-mono font-bold text-m3-on-surface focus:outline-none focus:border-amber-500"
													/>
													<button
														type="button"
														onClick={() => {
															const maxAllowed = Math.min(matchingMember.points || 0, Math.floor(grandTotal / ptValPhp));
															setPointsToRedeem(maxAllowed);
														}}
														className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 text-[10px] font-extrabold rounded cursor-pointer whitespace-nowrap transition-colors"
													>
														Max ({Math.min(matchingMember.points || 0, Math.floor(grandTotal / ptValPhp))})
													</button>
													{pointsToRedeem > 0 && (
														<button
															type="button"
															onClick={() => setPointsToRedeem(0)}
															className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold rounded cursor-pointer transition-colors"
														>
															Clear
														</button>
													)}
												</div>

												{pointsToRedeem > 0 && (
													<div className="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-500/10 p-1.5 rounded border border-emerald-500/20 flex justify-between items-center">
														<span>Discount Applied:</span>
														<span>-₱{(pointsToRedeem * ptValPhp).toFixed(2)} | Net Payable: ₱{(Math.max(0, grandTotal - (pointsToRedeem * ptValPhp))).toFixed(2)}</span>
													</div>
												)}
											</div>
										)}
									</div>
								</div>
							) : (
								<div className="space-y-1.5">
									<div className="text-[10px] text-m3-on-surface-variant font-bold uppercase tracking-wider px-1">
										Select Active Member Account:
									</div>
									<div className="max-h-36 overflow-y-auto space-y-1 border border-m3-outline-variant/15 rounded-lg p-1 bg-m3-surface-lowest">
										{members.filter(m => m.status === "Active").map((m) => (
											<button
												type="button"
												key={m.id}
												onClick={() => {
													setCustomerName(m.fullName);
												}}
												className="w-full text-left p-1.5 px-2 hover:bg-m3-primary/10 rounded text-[11px] font-bold text-m3-on-surface flex justify-between items-center cursor-pointer border-0 bg-transparent transition-colors"
											>
												<span>{m.fullName}</span>
												<span className="font-mono text-[10px] text-amber-500">⭐ {m.points || 0} pts | Ceiling: ₱{m.creditLimit.toLocaleString()}</span>
											</button>
										))}
										{members.filter(m => m.status === "Active").length === 0 && (
											<p className="text-center p-2 text-zinc-500 dark:text-zinc-400 text-[10px] italic">No active corporate members found.</p>
										)}
									</div>
								</div>
							)}
						</div>
					);
				})()}

 {errorMessage && (
 <div className="bg-red-500/10 border border-red-500/25 text-red-500 p-1.5 text-[9.5px] font-bold leading-tight rounded-lg">
 {errorMessage}
 </div>
 )}

 <div className="pt-1 flex gap-2">
 <button
 type="button"
 onClick={handleCancelSale}
 className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-black uppercase tracking-wider border border-zinc-750 shadow-sm"
 >
 Cancel
 </button>
 <button
 type="button"
 disabled={cart.length === 0 || isCheckingOut}
 onClick={clientCheckout}
 className="flex-1 py-1.5 bg-m3-primary hover:bg-m3-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-m3-on-primary text-xs font-black uppercase tracking-widest rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
 >
 {isCheckingOut ? (
 <>
 <Loader2 className="h-3 w-3 animate-spin text-m3-on-primary" />
 <span>Processing...</span>
 </>
 ) : (
 <span>Execute Settlement (F7)</span>
 )}
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 ) : (
 /* DAILY SALES LEDGER & VOID TERMINAL (SUB-MODULE TAB) */
 <div className="flex-1 min-h-0 border border-m3-outline-variant/30 rounded-[28px] bg-m3-surface-low p-5 sm:p-6 text-left flex flex-col gap-6 animate-fade-in shadow-lg overflow-visible">
 
 {/* Title Section */}
 <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-m3-outline-variant/20 pb-4 gap-4">
 <div>
 <h3 className="text-sm font-black text-rose-500 flex items-center gap-2 uppercase tracking-widest pl-1 font-mono">
 <LockKeyhole className="h-5 w-5 animate-pulse text-rose-500" />
 <span>Corporate Daily Sales Ledger & Void Terminal</span>
 </h3>
 <p className="text-[10.5px] text-zinc-400 font-semibold leading-relaxed max-w-2xl pl-1 mt-1">
 Centralized accounting sub-module. Action control operations such as <strong className="text-rose-500 font-black">Invoice Voiding</strong> or <strong className="text-m3-primary font-black">Ticket Reprinting</strong> are strictly guarded and require a Manager PIN validation.
 </p>
 </div>
 
 {/* Actions & Controls in header */}
 <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
 <button
 type="button"
 onClick={() => setIsStatsCollapsed(!isStatsCollapsed)}
 className="flex items-center justify-center gap-2 px-3.5 py-2 bg-m3-surface hover:bg-m3-surface-high border border-m3-outline-variant/40 text-m3-primary text-[11px] font-sans font-black uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer shrink-0"
 title="Toggle statistics visibility"
 >
 {isStatsCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
 <span>{isStatsCollapsed ? "Show Stats" : "Hide Stats"}</span>
 </button>

 <button
 type="button"
 onClick={handleExportLedgerToExcel}
 className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-sans font-black uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer border-0 shrink-0"
 title="Export current filtered sales report as a formatted Excel spreadsheet"
 >
 <Download className="h-3.5 w-3.5" />
 <span>Export Excel Report</span>
 </button>
 </div>
 </div>

  <AnimatePresence initial={false}>
  {!isStatsCollapsed && (
  <motion.div
    key="ledger-stats-panel"
    initial={{ height: 0, opacity: 0, overflow: "hidden" }}
    animate={{ height: "auto", opacity: 1 }}
    exit={{ height: 0, opacity: 0, overflow: "hidden" }}
    transition={{ duration: 0.2, ease: "easeInOut" }}
  >
  {/* Quick Stats Grid Dashboard */}
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
 {/* Stat 1: Net Revenue */}
 <div className="bg-m3-surface border border-m3-outline-variant/15 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
 <span className="text-[10px] text-zinc-400 font-black uppercase tracking-wider font-mono">Net Settled Revenue</span>
 <div className="mt-2 flex items-baseline gap-1">
 <span className="text-lg font-black text-emerald-500 font-mono">
 ₱{ledgerStats.netRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
 </span>
 </div>
 <span className="text-[9px] text-zinc-500 font-bold font-sans mt-1">Excludes voided invoices</span>
 </div>

 {/* Stat 2: Active Tickets */}
 <div className="bg-m3-surface border border-m3-outline-variant/15 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
 <span className="text-[10px] text-zinc-400 font-black uppercase tracking-wider font-mono">Settled Sales</span>
 <div className="mt-2 flex items-baseline gap-1">
 <span className="text-lg font-black text-m3-primary font-mono">{ledgerStats.activeCount}</span>
 <span className="text-xs text-zinc-500 font-bold font-sans"> invoices</span>
 </div>
 <span className="text-[9px] text-zinc-500 font-bold font-sans mt-1">Completed settlements</span>
 </div>

 {/* Stat 3: Total Discounts */}
 <div className="bg-m3-surface border border-m3-outline-variant/15 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
 <span className="text-[10px] text-rose-500 font-black uppercase tracking-wider font-mono">Discounts Deducted</span>
 <div className="mt-2 flex items-baseline gap-1">
 <span className="text-lg font-black text-rose-500 font-mono">
 ₱{ledgerStats.totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
 </span>
 </div>
 <span className="text-[9px] text-zinc-500 font-bold font-sans mt-1">Promotional markdowns</span>
 </div>

 {/* Stat 4: Voided count */}
 <div className="bg-m3-surface border border-m3-outline-variant/15 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
 <span className="text-[10px] text-rose-500 font-black uppercase tracking-wider font-mono">Voided &amp; Reclaimed</span>
 <div className="mt-2 flex items-baseline gap-1">
 <span className="text-lg font-black text-amber-500 font-mono">{ledgerStats.voidedCount}</span>
 <span className="text-xs text-zinc-500 font-bold font-sans"> tickets</span>
 </div>
 <span className="text-[9px] text-zinc-500 font-bold font-sans mt-1">Reversed stock quantities</span>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Refactored Filter Controls Deck Card */}
 <div className="bg-m3-surface/60 border border-m3-outline-variant/20 rounded-2xl p-4">
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
 
 {/* Search Field */}
 <div className="flex flex-col gap-1.5">
 <span className="text-[10px] text-zinc-400 font-black uppercase tracking-wider font-mono">Search ledger</span>
 <div className="relative">
 <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
 <input
 type="text"
 value={ledgerSearchQuery}
 onChange={(e) => {
 setLedgerSearchQuery(e.target.value);
 setSalesPage(1);
 }}
 placeholder="Search invoice, customer, payment..."
 className="w-full bg-m3-surface border border-m3-outline-variant/40 focus:border-m3-primary pl-9 pr-8 py-2 text-[11px] font-sans font-black text-zinc-200 placeholder-zinc-500 rounded-xl outline-none focus:ring-1 focus:ring-m3-primary transition-all shadow-sm"
 />
 {ledgerSearchQuery && (
 <button
 type="button"
 onClick={() => {
 setLedgerSearchQuery("");
 setSalesPage(1);
 }}
 className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300 border-0 bg-transparent cursor-pointer"
 >
 <X className="h-3.5 w-3.5" />
 </button>
 )}
 </div>
 </div>

 {/* Branch Pool Selector */}
 <div className="flex flex-col gap-1.5">
 <span className="text-[10px] text-zinc-400 font-black uppercase tracking-wider font-mono flex items-center gap-1.5">
 <span className="h-2 w-2 bg-[#10B981] rounded-full animate-pulse" />
 <span>Active Pool</span>
 </span>
 {currentUser?.role === 'Admin' ? (
 <select
 value={selectedPoolBranchId}
 onChange={(e) => setSelectedPoolBranchId(e.target.value)}
 className="w-full text-[11px] font-sans font-black bg-m3-surface border border-m3-outline-variant/40 focus:border-m3-primary px-3 py-2 rounded-xl text-m3-primary focus:outline-none uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
 >
 <option value="All">All Pools (Corporate)</option>
 {branches.map((b) => (
 <option key={b.id} value={b.id}>
 {b.name}
 </option>
 ))}
 </select>
 ) : (
 <div className="w-full text-[11px] font-sans font-black bg-m3-surface/60 border border-m3-outline-variant/20 px-3 py-2 rounded-xl text-m3-on-surface uppercase tracking-wider">
 {branches.find(b => b.id === (currentUser?.branchAssignmentId || "B1"))?.name || 'N/A'}
 </div>
 )}
 </div>

 {/* Payment Filter */}
 <div className="flex flex-col gap-1.5">
 <span className="text-[10px] text-zinc-400 font-black uppercase tracking-wider font-mono flex items-center gap-1.5">
 <span className="h-2 w-2 bg-m3-primary rounded-full animate-pulse" />
 <span>Payment Method</span>
 </span>
 <select
 value={ledgerPaymentFilter}
 onChange={(e) => {
 setLedgerPaymentFilter(e.target.value);
 setSalesPage(1);
 }}
 className="w-full text-[11px] font-sans font-black bg-m3-surface border border-m3-outline-variant/40 focus:border-m3-primary px-3 py-2 rounded-xl text-m3-primary focus:outline-none uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
 >
 <option value="All">All Payments</option>
  <option value="Cash">Cash Only</option>
  <option value="GCash">GCash Only</option>
  <option value="Maya">Maya Only</option>
  <option value="Card / Bank Terminal">Card / Bank Terminal Only</option>
  <option value="Member Credit">Member Credit Only</option></select>
 </div>

 {/* Date Selector */}
 <div className="flex flex-col gap-1.5">
 <span className="text-[10px] text-zinc-400 font-black uppercase tracking-wider font-mono flex items-center gap-1.5">
 <Calendar className="h-3.5 w-3.5 text-m3-primary" />
 <span>Go to Date</span>
 </span>
 <div className="relative flex items-center gap-1">
 <input
 type="date"
 value={ledgerDateFilter}
 onChange={(e) => {
 setLedgerDateFilter(e.target.value);
 setSalesPage(1);
 }}
 className="w-full text-[11px] font-sans font-black bg-m3-surface border border-m3-outline-variant/40 focus:border-m3-primary px-3 py-1.5 rounded-xl text-m3-primary focus:outline-none uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
 />
 {ledgerDateFilter && (
 <button
 type="button"
 onClick={() => {
 setLedgerDateFilter("");
 setSalesPage(1);
 }}
 className="absolute right-2 top-2.5 p-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded transition-colors border-0 cursor-pointer flex items-center justify-center"
 title="Clear Date"
 >
 <X className="h-3 w-3" />
 </button>
 )}
 </div>
 </div>

 </div>
 </div>

 <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-m3-outline-variant/20 shadow-inner bg-m3-surface overflow-hidden snap-start scroll-mt-20">
 <div className="overflow-auto scrollbar-thin scrollbar-thumb-m3-outline-variant h-[58vh] md:h-[64vh] lg:h-[68vh] min-h-[380px]">
 <table className="w-full text-left border-collapse table-auto text-xs min-w-[1000px] font-sans">
 <thead>
 <tr className="border-b border-m3-outline-variant/30 bg-m3-surface/30 text-[9px] uppercase font-black text-zinc-400 tracking-wider">
 <th className="py-3 px-4 w-28">Ref Invoice</th>
 <th className="py-3 px-4">timestamp settled</th>
 <th className="py-3 px-4">Client Profile</th>
 <th className="py-3 px-4 text-right">Subtotal</th>
 <th className="py-3 px-4 text-right">VAT (12%)</th>
 <th className="py-3 px-4 text-right">Discount Given</th>
 <th className="py-3 px-4 text-right">Grand Total Paid</th>
 <th className="py-3 px-4 text-center">Settlement Status</th>
 <th className="py-3 px-4 text-center w-48">
 Audit Controls
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-m3-outline-variant/10 font-mono text-[11px] text-zinc-300">
 {paginatedSales.map((s, idx) => (
 <tr
 key={idx}
 onClick={() => setSelectedSaleDetail(s)}
 className={`hover:bg-m3-surface-low/90 hover:text-white cursor-pointer transition-colors font-bold ${s.isDeleted ? "bg-red-500/5 text-zinc-500 line-through decoration-rose-500" : ""}`}
 title="Click to view full transaction invoice ledger details"
 >
 <td className="py-3 px-4 text-m3-primary font-black uppercase hover:underline">
 {s.saleNumber}
 </td>
 <td
 className="py-3 px-4 text-zinc-550 font-sans font-medium hover:text-emerald-500"
 title="Settled instant transaction date"
 >
 {(s.createdAt && !isNaN(new Date(s.createdAt).getTime())) ? new Date(s.createdAt).toLocaleString() : "N/A"}
 </td>
 <td className="py-3 px-4 text-m3-on-surface font-sans font-extrabold">
 {s.customerName}
 </td>
 <td className="py-3 px-4 text-right text-zinc-400">
 ₱{s.subtotal.toFixed(2)}
 </td>
 <td className="py-3 px-4 text-right text-zinc-400">
 ₱{s.vat.toFixed(2)}
 </td>
 <td className="py-3 px-4 text-right text-rose-500">
 -₱{s.discount.toFixed(2)}
 </td>
 <td className="py-3 px-4 text-right text-m3-primary font-extrabold">
 ₱{s.grandTotal.toFixed(2)}
 </td>
 <td className="py-3 px-4 text-center uppercase text-[9.5px]">
 {s.isDeleted ? (
 <span className="bg-rose-500/10 text-rose-500 border border-rose-500/25 py-0.5 px-2.5 rounded-full font-black">
 Voided / Reclaimed
 </span>
 ) : (
 <span className="bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/25 py-0.5 px-2.5 rounded-full font-black">
 Settled
 </span>
 )}
 </td>
 <td
 className="py-3 px-4 text-center"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="flex gap-2 justify-center items-center">
 <button
 onClick={() => triggerReprintWithPin(s)}
 className="py-1 px-3 rounded-lg border border-m3-outline-variant/60 hover:border-m3-primary hover:bg-m3-primary/10 transition-all font-sans text-[10px] font-black uppercase text-m3-primary cursor-pointer"
 title="Reprint receipt (Guarded by Manager PIN)"
 >
 Reprint Ticket
 </button>

 {!s.isDeleted && (
 <button
 onClick={() => triggerVoidWithPin(s)}
 className="py-1 px-3 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white transition-all font-sans text-[10px] font-black uppercase cursor-pointer"
 title="Void sale and reclaim inventory quantities (Guarded by Manager PIN)"
 >
 Void Sale
 </button>
 )}
 </div>
 </td>
 </tr>
 ))}
 {filteredSales.length === 0 && (
 <tr>
 <td
 colSpan={9}
 className="py-12 text-center text-zinc-400 font-sans font-bold"
 >
 {ledgerSearchQuery
 ? `No matching sales invoice ledgers found for "${ledgerSearchQuery}".`
 : "No matching sales invoice ledgers recorded today."}
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>

 {/* Pagination Controls bar */}
 <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-m3-surface-low border-t border-m3-outline-variant/20 text-xs font-sans">
 <span className="font-semibold text-zinc-400 font-mono">
 Showing{" "}
 {Math.min(
 filteredSales.length,
 (salesPage - 1) * SALES_PER_PAGE + 1,
 )}
 -{Math.min(filteredSales.length, salesPage * SALES_PER_PAGE)} of{" "}
 {filteredSales.length} invoices
 </span>
 <div className="flex items-center gap-1.5 select-none font-sans">
 <button
 type="button"
 disabled={salesPage === 1}
 onClick={() => setSalesPage((prev) => Math.max(1, prev - 1))}
 className="px-3 py-1.5 rounded-lg border border-m3-outline-variant/60 hover:border-m3-primary hover:bg-m3-primary/10 text-m3-primary disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer font-bold uppercase text-[9.5px]"
 >
 Prev
 </button>
 {Array.from({ length: totalSalesPages }).map((_, i) => {
 const pNum = i + 1;
 if (
 totalSalesPages > 5 &&
 Math.abs(pNum - salesPage) > 2 &&
 pNum !== 1 &&
 pNum !== totalSalesPages
 ) {
 if (pNum === 2 || pNum === totalSalesPages - 1) {
 return (
 <span key={pNum} className="px-1 text-zinc-500">
 ...
 </span>
 );
 }
 return null;
 }
 return (
 <button
 key={pNum}
 type="button"
 onClick={() => setSalesPage(pNum)}
 className={`h-7 w-7 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
 salesPage === pNum
 ? "bg-m3-primary text-m3-on-primary shadow-md"
 : "border border-m3-outline-variant/20 hover:bg-m3-primary/10 text-zinc-300"
 }`}
 >
 {pNum}
 </button>
 );
 })}
 <button
 type="button"
 disabled={salesPage === totalSalesPages}
 onClick={() =>
 setSalesPage((prev) => Math.min(totalSalesPages, prev + 1))
 }
 className="px-3 py-1.5 rounded-lg border border-m3-outline-variant/60 hover:border-m3-primary hover:bg-m3-primary/10 text-m3-primary disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer font-bold uppercase text-[9.5px]"
 >
 Next
 </button>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* MODAL 1: Cashier Shift Opener */}
 <AnimatePresence>
 {showShiftModal && (
 <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.25 }}
 className="absolute inset-0 bg-gray-950/65 backdrop-blur-sm"
 onClick={() => {
 setShowShiftModal(false);
 setHasDismissedShiftPrompt(true);
 }}
 />
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 15 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 15 }}
 transition={{ type: "spring", duration: 0.4 }}
 className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface space-y-4"
 >
 <div className="flex items-start gap-3 mb-1">
 <div className="p-2 rounded-2xl bg-m3-primary/10 text-m3-primary shrink-0">
 <Lock className="h-5 w-5" />
 </div>
 <div className="text-left">
 <h3 className="text-base font-bold text-m3-primary">
 Cashier Terminal Shift Required
 </h3>
 <p className="text-xs text-m3-on-surface-variant mt-0.5 font-medium leading-relaxed">
 Please register an active cashier starting drawer fund to
 accept ERP OS payments.
 </p>
 </div>
 </div>

 <form
 onSubmit={handleOpenShiftSubmit}
 className="space-y-4 text-left"
 >
 {previouslyClosedShift && (
 <div className="p-3 bg-m3-surface-low border border-m3-outline-variant/30 rounded-2xl space-y-1.5 text-[11px] leading-normal">
 <div className="flex justify-between items-center text-amber-600 dark:text-amber-500 font-bold">
 <span>Previous Close Balance:</span>
 <span className="font-mono font-black text-xs text-m3-on-surface">
 ₱
 {previouslyClosedShift.cashCount.toLocaleString(
 undefined,
 { minimumFractionDigits: 2 },
 )}
 </span>
 </div>
 <p className="text-[9.5px] text-m3-on-surface-variant/80">
 Closed by{" "}
 <strong className="text-m3-on-surface-variant font-semibold">
 {previouslyClosedShift.cashierName}
 </strong>{" "}
 on{" "}
 {new Date(
 previouslyClosedShift.closedAt || "",
 ).toLocaleDateString("en-US", {
 month: "short",
 day: "numeric",
 hour: "2-digit",
 minute: "2-digit",
 })}
 .
 </p>
 <button
 type="button"
 onClick={() => {
 setStartCashInput(
 previouslyClosedShift.cashCount.toString(),
 );
 showToast(
 `Loaded previous shift balance of ₱${previouslyClosedShift.cashCount.toFixed(2)}`,
 );
 }}
 className="w-full py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl font-bold transition-all text-center text-[10px]"
 >
 Use Previous Shift Balance
 </button>
 </div>
 )}

 <div className="space-y-1 relative pr-0 pl-0">
 <label className="text-[10px] font-bold uppercase tracking-widest text-m3-primary block pl-1">
 Starting Cash fund (PHP)
 </label>
 <input
 type="number"
 step="any"
 required
 value={startCashInput}
 onChange={(e) => setStartCashInput(e.target.value)}
 className="w-full bg-m3-surface border-b-2 border-m3-outline-variant px-3 py-2 text-sm text-m3-on-surface focus:outline-none focus:border-m3-primary transition-colors text-center font-mono font-black rounded-t-lg"
 />
 </div>

 <div className="flex gap-2 border-t border-m3-outline-variant/15 pt-4">
 <button
 type="button"
 onClick={() => {
 setShowShiftModal(false);
 setHasDismissedShiftPrompt(true);
 }}
 className="flex-1 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-m3-outline-variant/15 text-m3-on-surface-variant transition-colors text-center"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="flex-1 m3-btn-primary py-2 text-xs shadow-sm cursor-pointer text-center"
 >
 Open Terminal Shift
 </button>
 </div>
 </form>
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 {/* MODAL: Close Drawer Shift */}
 <AnimatePresence>
 {showCloseShiftModal && activeShift && (
 <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.25 }}
 className="absolute inset-0 bg-gray-950/65 backdrop-blur-sm"
 onClick={() => setShowCloseShiftModal(false)}
 />
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 15 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 15 }}
 transition={{ type: "spring", duration: 0.4 }}
 className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface space-y-4"
 >
 <div className="flex items-start gap-3 mb-1">
 <div className="p-2 rounded-2xl bg-rose-500/10 text-rose-400 shrink-0">
 <LockKeyhole className="h-5 w-5" />
 </div>
 <div className="text-left">
 <h3 className="text-base font-bold text-rose-400">
 Close Cashier Drawer Shift
 </h3>
 <p className="text-xs text-m3-on-surface-variant mt-0.5 font-medium leading-relaxed">
 Verify and count the physical cash in the register drawer to
 close shift.
 </p>
 </div>
 </div>

 {activeShift &&
 (() => {
 const stats = getShiftReportStats(activeShift);
 const expectedCash = activeShift.startCash + stats.netTotal;
 const enteredCash = parseFloat(closeShiftCashInput) || 0;
 const variance =
 closeShiftCashInput === "" ? 0 : enteredCash - expectedCash;

 return (
 <form
 onSubmit={handleCloseShiftSubmit}
 className="space-y-4 text-left"
 >
 <div className="bg-m3-surface-lowest border border-m3-outline-variant/30 p-3.5 rounded-2xl space-y-2.5 text-xs">
 <div className="flex justify-between border-b border-m3-outline-variant/15 pb-2">
 <span className="text-m3-on-surface-variant">Active Cashier:</span>
 <span className="font-bold text-m3-on-surface">
 {activeShift.cashierName}
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-m3-on-surface-variant">Starting Cash:</span>
 <span className="font-mono font-bold text-m3-on-surface">
 ₱
 {activeShift.startCash.toLocaleString(undefined, {
 minimumFractionDigits: 2,
 })}
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-m3-on-surface-variant">
 Net Sales Added:
 </span>
 <span className="font-mono font-bold text-m3-on-surface">
 ₱
 {stats.netTotal.toLocaleString(undefined, {
 minimumFractionDigits: 2,
 })}
 </span>
 </div>
 <div className="flex justify-between border-t border-dashed border-m3-outline-variant/25 pt-2 text-sm font-bold">
 <span className="text-m3-primary">
 Expected Drawer Cash:
 </span>
 <span className="font-mono text-m3-primary">
 ₱
 {expectedCash.toLocaleString(undefined, {
 minimumFractionDigits: 2,
 })}
 </span>
 </div>
 </div>

 <div className="space-y-1 relative pr-0 pl-0">
 <label className="text-[10px] font-bold uppercase tracking-widest text-m3-primary block pl-1">
 Physical Cash Counted (PHP)
 </label>
 <input
 type="number"
 step="any"
 required
 value={closeShiftCashInput}
 onChange={(e) =>
 setCloseShiftCashInput(e.target.value)
 }
 placeholder="Enter counted physical cash..."
 className="w-full bg-m3-surface border-b-2 border-m3-outline-variant px-3 py-2 text-sm text-m3-on-surface focus:outline-none focus:border-m3-primary transition-colors text-center font-mono font-black rounded-t-lg"
 />
 </div>

 {closeShiftCashInput !== "" && (
 <div className="p-3 bg-m3-surface-lowest border border-m3-outline-variant/30 rounded-2xl flex justify-between items-center">
 <span className="text-xs text-m3-on-surface-variant font-bold uppercase">
 Variance:
 </span>
 <span
 className={`font-mono font-black text-sm ${
 variance === 0
 ? "text-m3-on-surface-variant"
 : variance > 0
 ? "text-emerald-600 dark:text-emerald-400"
 : "text-rose-600 dark:text-rose-400"
 }`}
 >
 {variance > 0 ? "+" : ""}₱
 {variance.toLocaleString(undefined, {
 minimumFractionDigits: 2,
 })}
 </span>
 </div>
 )}

 <div className="flex gap-2 border-t border-m3-outline-variant/15 pt-4">
 <button
 type="button"
 onClick={() => setShowCloseShiftModal(false)}
 className="flex-1 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-m3-outline-variant/15 text-m3-on-surface-variant transition-colors text-center"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-2 text-xs font-black uppercase rounded-full shadow-sm cursor-pointer text-center"
 >
 Close Out & Close Shift
 </button>
 </div>
 </form>
 );
 })()}
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 {/* MODAL: Discount Selection */}
 <AnimatePresence>
 {showDiscountModal && (
 <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.25 }}
 className="absolute inset-0 bg-gray-950/65 backdrop-blur-sm"
 onClick={() => setShowDiscountModal(false)}
 />
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 15 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 15 }}
 transition={{ type: "spring", duration: 0.4 }}
 className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface space-y-4 text-left"
 >
 <h3 className="text-sm font-bold text-m3-primary flex items-center gap-2">
 <Sparkles className="h-4.5 w-4.5 text-m3-primary" /> Select
 Trade & Exemption Discounts
 </h3>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <button
 type="button"
 onClick={() => applyCustomDiscount("NONE")}
 className={`p-3 rounded-2xl border text-left transition-colors cursor-pointer flex flex-col justify-between ${
 discountType === "NONE"
 ? "border-m3-primary bg-m3-primary/10"
 : "border-m3-outline-variant/20 bg-m3-surface hover:bg-m3-outline-variant/10"
 }`}
 >
 <div className="font-bold text-xs">No Discount</div>
 <div className="text-[10px] text-m3-on-surface-variant mt-1 font-medium">
 Standard cashier list pricing applies.
 </div>
 </button>

 <button
 type="button"
 onClick={() => applyCustomDiscount("SENIOR")}
 className={`p-3 rounded-2xl border text-left transition-colors cursor-pointer flex flex-col justify-between ${
 discountType === "SENIOR"
 ? "border-m3-primary bg-m3-primary/10"
 : "border-m3-outline-variant/20 bg-m3-surface hover:bg-m3-outline-variant/10"
 }`}
 >
 <div className="font-bold text-xs text-m3-primary flex items-center gap-1">
 Senior Citizen
 </div>
 <div className="text-[10px] text-m3-on-surface-variant mt-1 font-medium">
 20% Off base + 12% VAT exemption (Philippine RA 9994).
 </div>
 </button>

 <button
 type="button"
 onClick={() => applyCustomDiscount("PWD")}
 className={`p-3 rounded-2xl border text-left transition-colors cursor-pointer flex flex-col justify-between ${
 discountType === "PWD"
 ? "border-m3-primary bg-m3-primary/10"
 : "border-m3-outline-variant/20 bg-m3-surface hover:bg-m3-outline-variant/10"
 }`}
 >
 <div className="font-bold text-xs text-m3-primary flex items-center gap-1">
 PWD Resident
 </div>
 <div className="text-[10px] text-m3-on-surface-variant mt-1 font-medium">
 20% Off base + 12% VAT exemption (Philippine RA 10754).
 </div>
 </button>

 <button
 type="button"
 onClick={() => applyCustomDiscount("CONTRACT")}
 className={`p-3 rounded-2xl border text-left transition-colors cursor-pointer flex flex-col justify-between ${
 discountType === "CONTRACT"
 ? "border-m3-primary bg-m3-primary/10"
 : "border-m3-outline-variant/20 bg-m3-surface hover:bg-m3-outline-variant/10"
 }`}
 >
 <div className="font-bold text-xs text-m3-primary">
 Contractor Alliance
 </div>
 <div className="text-[10px] text-m3-on-surface-variant mt-1 font-medium">
 Flat 10% Trade Allied partner discount.
 </div>
 </button>
 </div>

 <div className="border-t border-m3-outline-variant/20 pt-4 space-y-4">
 <h4 className="text-[10px] font-bold text-m3-primary uppercase tracking-wider pl-1 font-sans">
 Or Apply Custom Values (Flat / Rate)
 </h4>

 <div className="flex gap-3">
 <div className="flex-1 relative pl-0">
 <label className="text-[9.5px] font-bold tracking-wider text-m3-on-surface-variant mb-1 block pl-1">
 Discount Amount/Value
 </label>
 <input
 type="number"
 value={discountInput}
 onChange={(e) => setDiscountInput(e.target.value)}
 placeholder={
 discountType === "PERCENT"
 ? "e.g. 15 for 15%"
 : "e.g. 100 for ₱100"
 }
 className="w-full bg-m3-surface border-b-2 border-m3-outline-variant px-3 py-2 text-xs font-mono font-bold text-m3-on-surface focus:outline-none focus:border-m3-primary rounded-t-lg transition-colors"
 />
 </div>

 <div className="flex flex-col justify-end gap-1.5 shrink-0">
 <div className="flex gap-2">
 <button
 type="button"
 onClick={() =>
 applyCustomDiscount("FLAT", discountInput)
 }
 className="px-4 py-2 bg-m3-primary/10 text-m3-primary border border-m3-primary/20 hover:bg-m3-primary/20 text-[10.5px] font-bold rounded-lg cursor-pointer transition-colors"
 >
 Apply Flat (₱)
 </button>
 <button
 type="button"
 onClick={() =>
 applyCustomDiscount("PERCENT", discountInput)
 }
 className="px-4 py-2 bg-m3-primary/10 text-m3-primary border border-m3-primary/20 hover:bg-m3-primary/20 text-[10.5px] font-bold rounded-lg cursor-pointer transition-colors"
 >
 Apply Percent (%)
 </button>
 </div>
 </div>
 </div>
 </div>

 <div className="flex justify-end gap-2 border-t border-m3-outline-variant/20 pt-4 flex-shrink-0">
 <button
 type="button"
 onClick={() => setShowDiscountModal(false)}
 className="px-5 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-m3-outline-variant/15 text-m3-on-surface-variant transition-colors text-center"
 >
 Close Panel
 </button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 {/* MODAL: Paper Receipt slip */}
 <AnimatePresence>
 {showReceiptModal && activeReceipt && (
 <div className="fixed inset-0 overflow-y-auto flex items-start justify-center z-50 p-4 md:items-center">
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.25 }}
 className="absolute inset-0 bg-gray-950/75 backdrop-blur-sm"
 onClick={() => setShowReceiptModal(false)}
 />
 <motion.div
 initial={{ opacity: 0, scale: 0.9, y: 30 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.9, y: 30 }}
 transition={{ type: "spring", stiffness: 350, damping: 25 }}
 className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-[28px] border border-m3-outline-variant/30 p-5 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface flex flex-col justify-between shrink-0"
 >
 <div className="flex flex-col items-center justify-center mb-4 text-center">
 <div className="p-2 rounded-full bg-m3-tertiary-container border border-m3-tertiary/20 text-m3-on-tertiary-container mb-2 text-center">
 <CheckCircle className="h-6 w-6 animate-bounce text-m3-tertiary" />
 </div>
 <h3 className="text-base font-bold text-m3-on-surface">
 Checkout Succeeded
 </h3>
 <p className="text-[11px] text-m3-on-surface-variant font-medium">
 Inventory files adjusted automatically.
 </p>
 </div>

 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: "auto", opacity: 1 }}
 transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
 className="px-5 py-5 bg-m3-surface-lowest border border-dashed border-m3-outline-variant/40 rounded-2xl text-[11px] leading-relaxed space-y-3 select-none text-m3-on-surface text-left max-h-[48vh] overflow-y-auto shadow-inner bir-receipt-container scrollbar-thin"
 >
 <div className="text-center font-bold tracking-tight border-b border-dashed border-m3-outline-variant/30 pb-3 flex flex-col items-center justify-center space-y-1">
 {receiptBranch?.storeLogo ? (
 <div 
 className="mb-1.5 w-auto flex items-center justify-center"
 style={{ height: `${receiptBranch.logoSize || Number(localStorage.getItem('tilepoint_receipt_logo_size_v1') || '40')}px` }}
 >
 <img
 src={receiptBranch.storeLogo}
 alt={`${receiptBranch.name} Logo`}
 className="h-full object-contain filter grayscale brightness-95 max-w-[150px]"
 referrerPolicy="no-referrer"
 />
 </div>
 ) : (
 <h4 className="text-xs font-black text-m3-primary tracking-widest font-mono uppercase mb-0.5">
 {receiptBranch?.name || "EMMAN TILE CENTER"}
 </h4>
 )}
 
 <div className="text-[9px] text-m3-on-surface-variant font-extrabold font-mono uppercase tracking-wider">
 Branch ID: {receiptBranch?.id || "ETC_DIPOLOG MAIN"}
 </div>
 
 <div className="text-[9px] text-m3-on-surface-variant font-semibold mt-0.5 leading-tight">
 {receiptBranch?.address || "Sta.Filomena,DipologCity"}
 </div>
 
 <div className="text-[8px] text-m3-on-surface-variant/80 mt-0.5 font-mono">
 Contact: {receiptBranch?.phone || "0000"} • TIN {formatTin(receiptBranch?.tin) || "000 111 222"}
 </div>
 </div>

 <div className="text-[10px] space-y-1.5 border-b border-dashed border-m3-outline-variant/30 pb-2 font-medium">
 <div className="flex justify-between">
 <span>Invoice Ref:</span>
 <span className="font-mono font-bold text-m3-primary">
 {activeReceipt.saleNumber}
 </span>
 </div>
 <div className="flex justify-between">
 <span>Terminal Date:</span>
 <span>
 {(activeReceipt?.createdAt && !isNaN(new Date(activeReceipt.createdAt).getTime())) ? new Date(activeReceipt.createdAt).toLocaleString() : "N/A"}
 </span>
 </div>
 <div className="flex justify-between">
 <span>Cashier Name:</span>
 <span>{activeReceipt.cashierName}</span>
 </div>
 <div className="flex justify-between">
 <span>Buyer:</span>
 <span className="font-bold">
 {activeReceipt.customerName}
 </span>
 </div>
 </div>

 <div className="space-y-1.5 font-mono text-[9px] border-b border-dashed border-m3-outline-variant/30 pb-2">
 <div className="flex justify-between font-extrabold text-m3-on-surface-variant border-b border-dashed border-m3-outline-variant/20 pb-1">
 <span>Item Details</span>
 <span>Amount</span>
 </div>

 {receiptItems.length > 0 ? (
 receiptItems.map((it, idx) => (
 <div
 key={idx}
 className="text-m3-on-surface space-y-0.5 pt-1.5 pb-1.5 border-b border-dotted border-m3-outline-variant/10 last:border-0"
 >
 <div className="font-bold text-[9.5px] break-words">
 {it.productName}
 </div>
 <div className="flex justify-between text-[8.5px] text-m3-on-surface-variant">
 <span>
 ₱{it.unitPrice.toFixed(2)} x {it.quantity}
 </span>
 <span className="font-bold text-m3-on-surface">
 ₱{it.total.toFixed(2)}
 </span>
 </div>
 </div>
 ))
 ) : (
 <p className="text-[9px] text-m3-on-surface-variant italic">
 Hardware ledger invoice saved correctly.
 </p>
 )}
 </div>

 <div className="space-y-1 text-[10px] border-b border-dashed border-m3-outline-variant/30 pb-2 font-mono">
 <div className="flex justify-between text-m3-on-surface-variant">
 <span>VATable Sales:</span>
 <span>
 ₱
 {activeReceipt.vat > 0
 ? activeReceipt.subtotal.toFixed(2)
 : "0.00"}
 </span>
 </div>
 <div className="flex justify-between text-m3-on-surface-variant">
 <span>VAT-Exempt Sales:</span>
 <span>
 ₱
 {activeReceipt.vat === 0
 ? activeReceipt.subtotal.toFixed(2)
 : "0.00"}
 </span>
 </div>
 <div className="flex justify-between text-m3-on-surface-variant">
 <span>Zero-Rated Sales:</span>
 <span>₱0.00</span>
 </div>
 <div className="flex justify-between text-m3-on-surface-variant">
 <span>12% Output VAT:</span>
 <span>₱{activeReceipt.vat.toFixed(2)}</span>
 </div>
 {activeReceipt.discount > 0 && (
 <div className="flex justify-between text-m3-primary font-bold">
 <span>BIR Discount Applied:</span>
 <span>-₱{activeReceipt.discount.toFixed(2)}</span>
 </div>
 )}
 <div className="flex justify-between font-black text-m3-on-surface text-xs pt-1 border-t border-dotted border-m3-outline-variant/20">
 <span>GRAND TOTAL DUE:</span>
 <span>₱{activeReceipt.grandTotal.toFixed(2)}</span>
 </div>
 </div>

 <div className="space-y-1 text-[10px] font-mono text-m3-on-surface-variant font-medium">
 <div className="flex justify-between">
 <span>Method:</span>
 <span className="text-m3-on-surface font-extrabold uppercase">
 {activeReceipt.paymentMethod}
 </span>
 </div>
 {activeReceipt.paymentMethod === "Cash" && (
 <>
 <div className="flex justify-between">
 <span>Tendered:</span>
 <span className="text-m3-on-surface">
 ₱{activeReceipt.amountTendered.toFixed(2)}
 </span>
 </div>
 <div className="flex justify-between font-bold">
 <span>Change:</span>
 <span className="text-m3-tertiary">
 ₱{activeReceipt.changeAmount.toFixed(2)}
 </span>
 </div>
 </>
 )}
 </div>

 {/* Receipt Custom Marketing, Promotion, and QR Engagement Section */}
 {(receiptBranch?.receiptFacebook || receiptBranch?.receiptPromoText || receiptBranch?.receiptQrBase64) && (
 <div className="border-t border-dashed border-m3-outline-variant/40 pt-3 mt-3 space-y-3.5">
 {receiptBranch.receiptFacebook && (
 <div className="text-center font-mono text-[8px] text-m3-on-surface-variant flex flex-col items-center justify-center space-y-0.5">
 <span className="font-extrabold uppercase text-m3-primary text-[8.5px] tracking-wide">Follow us on Facebook</span>
 <span className="font-bold text-m3-on-surface select-all">{receiptBranch.receiptFacebook}</span>
 </div>
 )}

 {receiptBranch.receiptPromoText && (
 <div className="text-center font-mono text-[8.5px] text-m3-on-surface-variant flex flex-col items-center justify-center space-y-0.5 px-2 bg-m3-surface-low/30 py-1 rounded">
 <span className="font-extrabold uppercase text-amber-500 text-[8.5px] tracking-wide">Special Offer / Promo</span>
 <p className="leading-snug text-center font-black text-m3-on-surface">{receiptBranch.receiptPromoText}</p>
 </div>
 )}

 {receiptBranch.receiptQrBase64 && (
 <div className="flex flex-col items-center justify-center space-y-1.5 pt-1">
 <span className="text-[7.5px] uppercase font-mono font-extrabold text-m3-on-surface-variant tracking-wider">Scan to Answer Survey & Feedback</span>
 <div className="h-24 w-24 border-2 border-black p-1 bg-white rounded flex items-center justify-center">
 <img
 src={receiptBranch.receiptQrBase64}
 alt="Survey QR Code"
 className="h-full w-full object-contain filter grayscale"
 referrerPolicy="no-referrer"
 />
 </div>
 </div>
 )}
 </div>
 )}

 <div className="text-center font-mono text-[7px] text-m3-on-surface-variant/70 uppercase tracking-widest pt-3 border-t border-dotted border-m3-outline-variant/30 mt-3.5">
 {receiptBranch?.receiptThankYou ? (
 <span className="font-black text-m3-on-surface text-[8px] tracking-tight block mb-1 normal-case font-mono">
 {receiptBranch.receiptThankYou}
 </span>
 ) : (
 `Thank you for shopping at ${receiptBranch?.name || "Emman Tile Center"}!`
 )}
 <div className="mt-1 lowercase font-sans text-[7.5px] italic text-zinc-400">This serves as an official customer transaction acknowledgment.</div>
 </div>
 </motion.div>

 <div className="flex gap-2 mt-4.5 flex-shrink-0 bir-report-no-print">
 <button
 onClick={() => {
 window.print();
 addAuditLog(
 "POS_RECEIPT_PRINT",
 `Printed physical invoice ticket ${activeReceipt.saleNumber}`,
 "Sales",
 activeReceipt.id,
 );
 showToast("Sent printing signal to hardware terminal.");
 }}
 className="flex-1 py-2 text-xs font-bold rounded-full border border-m3-outline-variant hover:bg-m3-outline-variant/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-center"
 >
 <Printer className="h-3.5 w-3.5" /> Print Receipt
 </button>
 <button
 onClick={() => setShowReceiptModal(false)}
 className="flex-1 m3-btn-primary py-2 text-xs shadow-sm cursor-pointer text-center"
 >
 Done
 </button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 {/* MODAL: Customer Profile Assignment */}
 <AnimatePresence>
 {showCustomerModal && (
 <div className="fixed inset-0 flex items-center justify-center z-50 p-4 text-left">
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.25 }}
 className="absolute inset-0 bg-gray-950/65 backdrop-blur-sm"
 onClick={() => setShowCustomerModal(false)}
 />
 <motion.form
 initial={{ opacity: 0, scale: 0.95, y: 15 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 15 }}
 transition={{ type: "spring", duration: 0.4 }}
 onSubmit={handleSaveCustomerName}
 className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface space-y-4"
 >
 <div className="flex justify-between items-center border-b border-m3-outline-variant/20 pb-2.5">
 <h3 className="text-base font-bold text-m3-primary flex items-center gap-2">
 <span>Assign Customer Profile</span>
 </h3>
 <button
 type="button"
 onClick={() => setShowCustomerModal(false)}
 className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1 rounded-full"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 <div className="space-y-1 relative pr-0 pl-0">
 <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1 block">
 Full Name
 </label>
 <input
 type="text"
 value={customerModalInput}
 onChange={(e) => setCustomerModalInput(e.target.value)}
 placeholder="e.g. Architect Manuel Santos"
 className="w-full bg-m3-surface border-b-2 border-m3-outline-variant px-3 py-2 text-xs text-m3-on-surface focus:outline-none focus:border-m3-primary transition-colors rounded-t-lg font-bold"
 />
 </div>

 {/* Searchable member selection */}
 <div className="space-y-1.5 pt-1">
   <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-1 block">
     Search Registered Corporate Members
   </label>
   <div className="max-h-36 overflow-y-auto border border-m3-outline-variant/20 rounded-xl p-1 bg-m3-surface-lowest divide-y divide-m3-outline-variant/10 scrollbar-thin">
     {(() => {
       const filteredModalMembers = members.filter((m) => {
         if (!customerModalInput.trim()) return true;
         return m.fullName.toLowerCase().includes(customerModalInput.toLowerCase()) ||
                m.phone.includes(customerModalInput) ||
                m.email.toLowerCase().includes(customerModalInput.toLowerCase());
       });

       if (filteredModalMembers.length === 0) {
         return (
           <p className="text-center p-3 text-m3-on-surface-variant text-[11px] font-medium italic">
             {customerModalInput.trim()
               ? `No corporate members found matching "${customerModalInput}".`
               : "No registered corporate members found."}
           </p>
         );
       }

       return filteredModalMembers.map((m) => (
         <button
           type="button"
           key={m.id}
           onClick={() => {
             setCustomerModalInput(m.fullName);
           }}
           className="w-full text-left p-2 hover:bg-m3-primary/10 rounded-lg text-xs font-bold text-m3-on-surface flex justify-between items-center cursor-pointer border-0 bg-transparent transition-colors"
         >
           <div className="flex flex-col text-left">
             <span>{m.fullName}</span>
             <span className="text-[8.5px] text-zinc-400 font-normal">{m.phone} • {m.email}</span>
           </div>
           <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
             Select
           </span>
         </button>
       ));
     })()}
   </div>
 </div>

 <div className="flex justify-end gap-2 border-t border-m3-outline-variant/20 pt-4">
 <button
 type="button"
 onClick={() => setShowCustomerModal(false)}
 className="px-4 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-m3-outline-variant/15 text-m3-on-surface-variant transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="m3-btn-primary px-5 py-2 text-xs shadow-sm cursor-pointer"
 >
 Assign Customer
 </button>
 </div>
 </motion.form>
 </div>
 )}
 </AnimatePresence>

 {/* MODAL 4: Dynamic Security Override Verification */}
 <AnimatePresence>
 {pendingApproval && (
 <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.25 }}
 className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm"
 onClick={() => setPendingApproval(null)}
 />
 <motion.form
 initial={{ opacity: 0, scale: 0.95, y: 15 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 15 }}
 transition={{ type: "spring", duration: 0.4 }}
 onSubmit={handleVerifyApprovalSubmit}
 className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-[28px] border border-rose-500/35 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface space-y-4 text-left border-t-4"
 >
 <div className="flex justify-between items-center border-b border-m3-outline-variant/20 pb-2.5">
 <h3 className="text-sm font-black text-rose-500 flex items-center gap-1.5 uppercase tracking-wider">
 <LockKeyhole className="h-5 w-5" />
 <span>Security override prompt</span>
 </h3>
 <button
 type="button"
 onClick={() => setPendingApproval(null)}
 className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-0.5 rounded-full"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 <div className="bg-rose-500/5 border border-rose-500/25 p-3 rounded-2xl text-[11px] leading-relaxed text-rose-300 font-bold space-y-1">
 <div>
 <strong>REASON:</strong> ERP OS Terminal requires authorization
 to proceed.
 </div>
 {pendingApproval.type === "DISCOUNT" ? (
 <div>
 Applying a{" "}
 <span className="text-amber-400 font-black">
 {pendingApproval.discountType} discount (
 {pendingApproval.discountValue}%)
 </span>{" "}
 which requires{" "}
 <span className="underline">
 {pendingApproval.requiredRole}+
 </span>{" "}
 clearance.
 </div>
 ) : (
 <div>
 Applying price override of{" "}
 <span className="text-amber-400 font-black">
 ₱{pendingApproval.overridePrice?.toFixed(2)}
 </span>{" "}
 instead of ₱{pendingApproval.originalPrice?.toFixed(2)} on
 SKU catalog. Requires{" "}
 <span className="underline">
 {pendingApproval.requiredRole}+
 </span>{" "}
 level override.
 </div>
 )}
 </div>

 <div className="space-y-3">
 <div className="space-y-1">
 <label className="text-[9px] font-black text-m3-primary uppercase tracking-widest pl-1 block">
 Authorize Username
 </label>
 <input
 type="text"
 required
 value={approverUsername}
 onChange={(e) => setApproverUsername(e.target.value)}
 placeholder="e.g. tomas_mgr, juan_mgr, or erica_admin"
 className="w-full bg-m3-surface border-b-2 border-m3-outline-variant px-3 py-2 text-xs text-m3-on-surface focus:outline-none focus:border-m3-primary transition-colors rounded-t-lg font-bold"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-black text-m3-primary uppercase tracking-widest pl-1 block">
 Security Clearance PIN Code / Password
 </label>
 <input
 type="password"
 required
 value={approverPassword}
 onChange={(e) => setApproverPassword(e.target.value)}
 placeholder="••••••••"
 className="w-full bg-m3-surface border-b-2 border-m3-outline-variant px-3 py-2 text-xs text-m3-on-surface focus:outline-none focus:border-m3-primary transition-colors rounded-t-lg font-bold"
 />
 </div>
 </div>

 {approvalError && (
 <div className="text-[10px] font-extrabold text-red-500 px-2 animate-pulse">
 {approvalError}
 </div>
 )}

 <div className="flex justify-end gap-2 border-t border-m3-outline-variant/20 pt-4">
 <button
 type="button"
 onClick={() => setPendingApproval(null)}
 className="px-4 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-m3-outline-variant/15 text-m3-on-surface-variant transition-colors"
 >
 Decline
 </button>
 <button
 type="submit"
 className="bg-gradient-to-r from-red-650 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-extrabold px-5 py-2 text-xs shadow-sm cursor-pointer rounded-full"
 >
 Authorize Override
 </button>
 </div>
 </motion.form>
 </div>
 )}
 </AnimatePresence>

 {/* MODAL 5: Single Item Price Override dialog */}
 <AnimatePresence>
 {overrideModalOpen &&
 overrideItemIndex !== null &&
 cart[overrideItemIndex] && (
 <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.25 }}
 className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm"
 onClick={() => setOverrideModalOpen(false)}
 />
 <motion.form
 initial={{ opacity: 0, scale: 0.95, y: 15 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 15 }}
 transition={{ type: "spring", duration: 0.4 }}
 onSubmit={handleSavePriceOverride}
 className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface space-y-4 text-left"
 >
 <div className="flex justify-between items-center border-b border-m3-outline-variant/20 pb-2.5">
 <h3 className="text-sm font-black text-m3-primary flex items-center gap-1.5 uppercase tracking-wider">
 <span>Unit Price Override</span>
 </h3>
 <button
 type="button"
 onClick={() => setOverrideModalOpen(false)}
 className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-0.5 rounded-full"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 <div className="space-y-1 leading-normal pl-1 text-[11px] font-medium text-m3-on-surface-variant">
 <div>
 <strong>Product:</strong>{" "}
 {cart[overrideItemIndex].product.productName}
 </div>
 <div>
 <strong>Default Unit Price:</strong> ₱
 {getBranchPrice(cart[overrideItemIndex].product).toFixed(2)}
 </div>
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-black text-m3-primary uppercase tracking-widest pl-1 block">
 New Unit Selling Price
 </label>
 <input
 type="number"
 required
 min={0}
 step="0.01"
 value={overridePriceInput}
 onChange={(e) => setOverridePriceInput(e.target.value)}
 className="w-full bg-m3-surface border-b-2 border-m3-outline-variant px-3 py-2 text-xs text-m3-on-surface focus:outline-none focus:border-m3-primary transition-colors rounded-t-lg font-bold font-mono"
 />
 <span className="text-[9px] text-m3-on-surface-variant pl-1 block mt-1 font-medium">
 {currentUser?.role === UserRole.CASHIER
 ? "Changing the standard price requires Manager override verification."
 : "Your role has privileges to direct-apply this override."}
 </span>
 </div>

 <div className="flex justify-end gap-2 border-t border-m3-outline-variant/20 pt-4 font-sans">
 <button
 type="button"
 onClick={() => setOverrideModalOpen(false)}
 className="px-4 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-m3-outline-variant/15 text-m3-on-surface-variant transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="m3-btn-primary px-5 py-2 text-xs shadow-sm cursor-pointer"
 >
 Apply Price
 </button>
 </div>
 </motion.form>
 </div>
 )}
 </AnimatePresence>

 {/* MODAL 6: Checkout Fulfillment Assignment & Delivery Scheduling Form */}
 <AnimatePresence>
 {showFulfillmentModal && pendingSaleForFulfillment && (
 <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.25 }}
 className="absolute inset-0 bg-gray-950/75 backdrop-blur-sm"
 onClick={() => setShowFulfillmentModal(false)}
 />
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 15 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 15 }}
 transition={{ type: "spring", duration: 0.4 }}
 className="relative w-full max-w-lg rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface text-left space-y-4 max-h-[90vh] overflow-y-auto"
 >
 <div className="flex justify-between items-center border-b border-m3-outline-variant/20 pb-3">
 <div>
 <h3 className="text-sm font-black text-m3-primary uppercase tracking-widest font-mono">
 Order Dispatch Fulfillment
 </h3>
 <p className="text-[10px] text-m3-on-surface-variant font-bold mt-0.5 uppercase tracking-wide">
 Receipt Ref: {pendingSaleForFulfillment.saleNumber} •
 Customer: {pendingSaleForFulfillment.customerName}
 </p>
 </div>
 </div>

 <div className="space-y-1.5 pl-1">
 <span className="text-[9.5px] font-black text-m3-primary uppercase tracking-widest block mb-1.5">
 How will the customer receive the items?
 </span>
 <div className="grid grid-cols-2 gap-3">
 <button
 type="button"
 onClick={() => setFulfillmentType("TakeHome")}
 className={`p-4 rounded-2xl border-2 transition-all cursor-pointer text-left flex flex-col justify-between h-[110px] ${
 fulfillmentType === "TakeHome"
 ? "border-m3-primary bg-m3-primary/5 text-m3-primary font-bold"
 : "border-m3-outline-variant/30 hover:border-m3-outline-variant/60 bg-m3-surface-lowest text-m3-on-surface"
 }`}
 >
 <ShoppingBag className="h-6 w-6 text-m3-primary" />
 <div>
 <h4 className="text-[10.5px] font-black uppercase tracking-wide">
 Take Home / Pickup
 </h4>
 <p className="text-[8.5px] opacity-80 mt-0.5 leading-normal font-medium">
 Material leaves physical store desk. Fulfillment
 releases immediately.
 </p>
 </div>
 </button>

 <button
 type="button"
 onClick={() => setFulfillmentType("Delivery")}
 className={`p-4 rounded-2xl border-2 transition-all cursor-pointer text-left flex flex-col justify-between h-[110px] ${
 fulfillmentType === "Delivery"
 ? "border-m3-primary bg-m3-primary/5 text-m3-primary font-bold"
 : "border-m3-outline-variant/30 hover:border-m3-outline-variant/60 bg-m3-surface-lowest text-m3-on-surface"
 }`}
 >
 <Truck className="h-6 w-6 text-m3-primary" />
 <div>
 <h4 className="text-[10.5px] font-black uppercase tracking-wide">
 Store Delivery
 </h4>
 <p className="text-[8.5px] opacity-80 mt-0.5 leading-normal font-medium">
 Customer requests heavy unloading trucks. Hold stock at
 distribution warehouse.
 </p>
 </div>
 </button>
 </div>
 </div>

 {fulfillmentType === "TakeHome" && (
 <div className="space-y-4 border-t border-m3-outline-variant/15 pt-4">
 <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-400 font-medium leading-relaxed">
 <strong>TAKE HOME IMMEDIATE RELEASE:</strong> All products
 in the cart are logged as released immediately. Stock has
 been deducted. No further truck scheduling is tracking.
 </div>
 <div className="flex justify-end pt-1">
 <button
 type="button"
 onClick={handleFulfillmentTakeHome}
 className="m3-btn-primary px-8 py-2.5 text-xs font-black uppercase tracking-widest shadow-md cursor-pointer"
 >
 Release Material & View Receipt
 </button>
 </div>
 </div>
 )}

 {fulfillmentType === "Delivery" && (
 <form
 onSubmit={handleFulfillmentDeliverySubmit}
 className="space-y-4 border-t border-m3-outline-variant/15 pt-4"
 >
 <div className="bg-m3-primary/10 border border-m3-primary/15 rounded-xl p-3 text-[10.5px] text-m3-primary font-medium leading-relaxed">
 <strong>STORE DELIVERY ALLOCATION:</strong> This creates a{" "}
 <strong>Pending Scheduling</strong> transport ledger. Stock
 quantities are reserved of this location immediately.
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pl-1">
 <div className="space-y-1 col-span-1 md:col-span-2">
 <label className="text-[9px] font-black text-m3-primary uppercase tracking-widest pl-1 block">
 Customer / Recipient Name *
 </label>
 <input
 type="text"
 required
 value={deliveryCustomerName}
 onChange={(e) => setDeliveryCustomerName(e.target.value)}
 placeholder="e.g. Architect Manuel Santos"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-1.5 text-xs focus:outline-none transition-colors rounded-t-lg font-bold"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-black text-m3-primary uppercase tracking-widest pl-1 block">
 Contact Number *
 </label>
 <input
 type="text"
 required
 value={deliveryContact}
 onChange={(e) => setDeliveryContact(e.target.value)}
 placeholder="e.g. 0917-555-1234"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-1.5 text-xs focus:outline-none transition-colors rounded-t-lg font-bold"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-black text-m3-primary uppercase tracking-widest pl-1 block">
 House No. / Building / Suite
 </label>
 <input
 type="text"
 value={deliveryHouseNo}
 onChange={(e) => setDeliveryHouseNo(e.target.value)}
 placeholder="e.g. Blk 12 Lot 14, 2nd Floor"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-1.5 text-xs focus:outline-none transition-colors rounded-t-lg"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-black text-m3-primary uppercase tracking-widest pl-1 block">
 Street / Subdivision
 </label>
 <input
 type="text"
 value={deliveryStreet}
 onChange={(e) => setDeliveryStreet(e.target.value)}
 placeholder="e.g. Sampaguita Street, Camella"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-1.5 text-xs focus:outline-none transition-colors rounded-t-lg"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-black text-m3-primary uppercase tracking-widest pl-1 block">
 Barangay *
 </label>
 <input
 type="text"
 required
 value={deliveryBarangay}
 onChange={(e) => setDeliveryBarangay(e.target.value)}
 placeholder="e.g. Mandalagan"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-1.5 text-xs focus:outline-none transition-colors rounded-t-lg font-bold"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-black text-m3-primary uppercase tracking-widest pl-1 block">
 City / Municipality *
 </label>
 <input
 type="text"
 required
 value={deliveryCity}
 onChange={(e) => setDeliveryCity(e.target.value)}
 placeholder="e.g. Bacolod City"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-1.5 text-xs focus:outline-none transition-colors rounded-t-lg font-bold"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-black text-m3-primary uppercase tracking-widest pl-1 block">
 Landmark / Directions
 </label>
 <input
 type="text"
 value={deliveryLandmark}
 onChange={(e) => setDeliveryLandmark(e.target.value)}
 placeholder="e.g. Near Shell gas station, red gate"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-1.5 text-xs focus:outline-none transition-colors rounded-t-lg"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-black text-m3-primary uppercase tracking-widest pl-1 block">
 Unloading Date *
 </label>
 <input
 type="date"
 required
 value={deliveryDate}
 onChange={(e) => setDeliveryDate(e.target.value)}
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-1.5 text-xs focus:outline-none transition-colors rounded-t-lg font-bold cursor-pointer"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-black text-m3-primary uppercase tracking-widest pl-1 block">
 Arrival Time Window
 </label>
 <input
 type="text"
 value={deliveryTime}
 onChange={(e) => setDeliveryTime(e.target.value)}
 placeholder="e.g. 10:00 AM - 2:00 PM"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-1.5 text-xs focus:outline-none transition-colors rounded-t-lg"
 />
 </div>
 </div>

 <div className="space-y-1 pl-1">
 <label className="text-[9px] font-black text-m3-primary uppercase tracking-widest block mb-0.5">
 Special Unloading Notes (e.g. Fragile, Heavy Lift)
 </label>
 <textarea
 rows={2}
 value={deliveryNotes}
 onChange={(e) => setDeliveryNotes(e.target.value)}
 placeholder="e.g. Heavy tiles, require helpers to haul on 2nd Floor."
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-1.5 text-xs focus:outline-none transition-colors rounded-t-lg"
 />
 </div>

 <div className="flex justify-end pt-2 border-t border-m3-outline-variant/10">
 <button
 type="submit"
 className="m3-btn-primary px-8 py-2.5 text-xs font-black uppercase tracking-widest shadow-md cursor-pointer flex items-center gap-1.5"
 >
 Schedule Store Delivery
 </button>
 </div>
 </form>
 )}
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 {/* MODAL 6: Security PIN verification passcode modal */}
 <AnimatePresence>
 {pinModalOpen && pinAction && pinTargetSale && (
 <div className="fixed inset-0 flex items-center justify-center z-50 p-4 font-sans">
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.25 }}
 className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm"
 onClick={() => {
 setPinModalOpen(false);
 setPinAction(null);
 setPinTargetSale(null);
 }}
 />
 <motion.form
 initial={{ opacity: 0, scale: 0.95, y: 15 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 15 }}
 transition={{ type: "spring", duration: 0.4 }}
 onSubmit={handleVerifySecurityPin}
 className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-[28px] border border-amber-500/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface space-y-4 text-left"
 >
 <div className="flex justify-between items-center border-b border-m3-outline-variant/20 pb-2.5">
 <h3 className="text-sm font-black text-amber-500 flex items-center gap-1.5 uppercase tracking-widest">
 <LockKeyhole className="h-4 w-4 animate-pulse text-amber-500" />
 <span>{pinAction} Verification</span>
 </h3>
 <button
 type="button"
 onClick={() => {
 setPinModalOpen(false);
 setPinAction(null);
 setPinTargetSale(null);
 }}
 className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-0.5 rounded-full"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 <div className="bg-amber-500/5 border border-amber-500/20 p-3 rounded-2xl text-[11px] leading-relaxed text-zinc-300 font-bold space-y-1">
 <div>
 <strong>SECURE OVERRIDE REASON:</strong>
 </div>
 <p className="text-amber-400 font-extrabold uppercase tracking-wide">
 Guarded Operation:{" "}
 {pinAction === "REPRINT"
 ? "Ticket Copy Reprinting"
 : "Sales Journal Invoice Voiding"}
 </p>
 <div className="text-zinc-400 mt-1">
 Transaction Ref:{" "}
 <span className="text-m3-on-surface select-all font-mono font-black">
 {pinTargetSale.saleNumber}
 </span>
 </div>
 <div className="text-zinc-400">
 Settled Amount:{" "}
 <span className="text-m3-on-surface font-mono font-bold">
 ₱{pinTargetSale.grandTotal.toFixed(2)}
 </span>
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest pl-1 block">
 Enter Manager / Administrator PIN
 </label>

 <div className="relative">
 <input
 type="password"
 required
 maxLength={6}
 value={securityPinInput}
 onChange={(e) => {
 setSecurityPinInput(e.target.value.replace(/\D/g, ""));
 setSecurityPinError("");
 }}
 placeholder="••••"
 className="w-full bg-m3-surface border-b-2 border-m3-outline-variant text-center tracking-[0.5em] text-lg font-black py-2 text-m3-on-surface focus:outline-none focus:border-amber-500 transition-colors rounded-t-lg font-mono"
 autoFocus
 />
 </div>

 {securityPinError ? (
 <p className="text-[9.5px] font-extrabold text-red-500 px-1 animate-pulse text-center">
 {securityPinError}
 </p>
 ) : (
 <p className="text-[9px] text-zinc-400 px-1 text-center font-medium">
 Ask a Store Supervisor or General Admin to verify their 4-6
 digit operational security PIN.
 </p>
 )}
 </div>

 <div className="grid grid-cols-3 gap-2 pt-2">
 {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
 <button
 key={num}
 type="button"
 onClick={() => {
 if (securityPinInput.length < 6) {
 setSecurityPinInput((prev) => prev + num);
 setSecurityPinError("");
 }
 }}
 className="py-2.5 rounded-xl bg-m3-surface hover:bg-m3-outline-variant/15 font-black text-sm text-m3-on-surface transition-all active:scale-95 shadow-sm border border-m3-outline-variant/10 cursor-pointer"
 >
 {num}
 </button>
 ))}
 <button
 type="button"
 onClick={() => {
 setSecurityPinInput("");
 setSecurityPinError("");
 }}
 className="py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-extrabold text-[10px] transition-all active:scale-95 cursor-pointer border border-rose-500/15 uppercase tracking-wider"
 >
 Clear
 </button>
 <button
 type="button"
 onClick={() => {
 if (securityPinInput.length < 6) {
 setSecurityPinInput((prev) => prev + "0");
 setSecurityPinError("");
 }
 }}
 className="py-2.5 rounded-xl bg-m3-surface hover:bg-m3-outline-variant/15 font-black text-sm text-m3-on-surface transition-all active:scale-95 shadow-sm border border-m3-outline-variant/10 cursor-pointer"
 >
 0
 </button>
 <button
 type="submit"
 className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[10px] transition-all active:scale-95 cursor-pointer shadow-md uppercase tracking-wider"
 >
 Enter
 </button>
 </div>

 <div className="flex justify-end gap-2 pt-2">
 <button
 type="button"
 onClick={() => {
 setPinModalOpen(false);
 setPinAction(null);
 setPinTargetSale(null);
 }}
 className="w-full py-2 bg-m3-outline-variant/10 hover:bg-m3-outline-variant/20 rounded-full text-zinc-300 font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer text-center"
 >
 Decline & Close
 </button>
 </div>
 </motion.form>
 </div>
 )}
 </AnimatePresence>

 {/* MODAL 10: Selected Sale Transaction Details */}
 {selectedSaleDetail && (
 <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in text-left">
 <div
 className="absolute inset-0 bg-gray-950/65 backdrop-blur-sm"
 onClick={() => setSelectedSaleDetail(null)}
 />
 <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface space-y-4">
 <div className="flex justify-between items-center border-b border-m3-outline-variant/20 pb-3">
 <h3 className="text-sm font-black text-rose-500 flex items-center gap-2 uppercase tracking-wider font-mono">
 <FileText className="h-5 w-5 text-rose-500" />
 <span>Invoice Ledger: {selectedSaleDetail.saleNumber}</span>
 </h3>
 <button
 onClick={() => setSelectedSaleDetail(null)}
 className="text-zinc-400 hover:text-white cursor-pointer p-1 rounded-full hover:bg-zinc-800"
 >
 <X className="h-4.5 w-4.5" />
 </button>
 </div>

 <div className="grid grid-cols-2 gap-3 bg-m3-surface-lowest/70 p-3.5 rounded-2xl border border-m3-outline-variant/10 text-xs font-sans">
 <div>
 <span className="block text-[10px] uppercase font-bold text-zinc-450 tracking-wider">
 Buyer Name
 </span>
 <span className="font-extrabold text-sm text-m3-primary mt-0.5 block">
 {selectedSaleDetail.customerName}
 </span>
 </div>
 <div>
 <span className="block text-[10px] uppercase font-bold text-zinc-450 tracking-wider">
 Settled Timestamp
 </span>
 <span className="font-mono mt-0.5 block">
 {(selectedSaleDetail?.createdAt && !isNaN(new Date(selectedSaleDetail.createdAt).getTime())) ? new Date(selectedSaleDetail.createdAt).toLocaleString() : "N/A"}
 </span>
 </div>
 <div>
 <span className="block text-[10px] uppercase font-bold text-zinc-450 tracking-wider">
 Cashier Agent
 </span>
 <span className="font-bold mt-0.5 block">
 {selectedSaleDetail.cashierName}
 </span>
 </div>
 <div>
 <span className="block text-[10px] uppercase font-bold text-zinc-450 tracking-wider">
 Settlement Type
 </span>
 <span className="font-bold mt-0.5 block text-[#10B981]">
 {selectedSaleDetail.paymentMethod}
 </span>
 </div>
 </div>

 <div className="space-y-2">
 <h4 className="text-[10px] font-black uppercase text-m3-primary tracking-wider pl-1 font-mono">
 Purchased Tile Products
 </h4>
 <div className="border border-m3-outline-variant/15 rounded-xl overflow-hidden bg-m3-surface-lowest">
 <table className="w-full text-left text-[11px] font-sans">
 <thead className="bg-m3-surface-low/50 text-[9px] uppercase font-bold text-zinc-400 border-b border-m3-outline-variant/15">
 <tr>
 <th className="py-2.5 px-3">Product Description</th>
 <th className="py-2.5 px-3 text-right">Unit Price</th>
 <th className="py-2.5 px-3 text-center">Qty</th>
 <th className="py-2.5 px-3 text-right">Total Price</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-m3-outline-variant/10 font-mono text-zinc-300">
 {saleItems
 .filter((item) => item.saleId === selectedSaleDetail.id)
 .map((item, idx) => (
 <tr key={idx} className="hover:bg-m3-surface-low/30">
 <td className="py-2 px-3 font-sans font-bold text-white">
 {item.productName}
 </td>
 <td className="py-2 px-3 text-right">
 ₱
 {item.unitPrice.toLocaleString(undefined, {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })}
 </td>
 <td className="py-2 px-3 text-center font-bold text-[#10B981]">
 x{item.quantity}
 </td>
 <td className="py-2 px-3 text-right text-m3-primary font-bold">
 ₱
 {item.total.toLocaleString(undefined, {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })}
 </td>
 </tr>
 ))}
 {saleItems.filter(
 (item) => item.saleId === selectedSaleDetail.id,
 ).length === 0 && (
 <tr>
 <td
 colSpan={4}
 className="py-4 text-center text-zinc-400 italic font-sans animate-pulse"
 >
 No products registered in this invoice record.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>

 <div className="p-3 bg-m3-surface-lowest/70 border border-m3-outline-variant/10 rounded-xl space-y-1.5 text-[11px] font-mono">
 <div className="flex justify-between">
 <span className="text-zinc-400 font-sans">Subtotal Sale:</span>
 <span className="font-bold">
 ₱{selectedSaleDetail.subtotal.toFixed(2)}
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-zinc-400 font-sans">
 VAT Included (12%):
 </span>
 <span className="font-bold text-zinc-300">
 ₱{selectedSaleDetail.vat.toFixed(2)}
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-zinc-400 font-sans">
 Discount Deductions:
 </span>
 <span className="font-bold text-rose-500">
 -₱{selectedSaleDetail.discount.toFixed(2)}
 </span>
 </div>
 <div className="flex justify-between border-t border-m3-outline-variant/10 pt-1.5 text-xs text-m3-primary font-bold">
 <span className="font-sans">Grand Total:</span>
 <span className="text-sm font-extrabold text-[#10B981]">
 ₱{selectedSaleDetail.grandTotal.toFixed(2)}
 </span>
 </div>
 <div className="flex justify-between text-[10px] text-zinc-500 pt-1">
 <span className="font-sans">Amount Tendered:</span>
 <span>₱{selectedSaleDetail.amountTendered.toFixed(2)}</span>
 </div>
 <div className="flex justify-between text-[10px] text-zinc-500">
 <span className="font-sans">Change Settled:</span>
 <span>₱{selectedSaleDetail.changeAmount.toFixed(2)}</span>
 </div>
 </div>

 {selectedSaleDetail.notes && (
 <div className="text-[10px] bg-amber-500/5 text-amber-500 px-3 py-2 border border-amber-500/10 rounded-xl font-sans">
 <strong>Transaction Notes:</strong> {selectedSaleDetail.notes}
 </div>
 )}

 <div className="flex justify-between gap-2 border-t border-m3-outline-variant/20 pt-4 font-sans">
 <div className="flex gap-2">
 {!selectedSaleDetail.isDeleted && (
 <button
 onClick={() => {
 const s = selectedSaleDetail;
 setSelectedSaleDetail(null);
 triggerVoidWithPin(s);
 }}
 className="px-3.5 py-2 bg-rose-500/15 hover:bg-rose-500 hover:text-black text-rose-500 rounded-full text-[10px] uppercase font-black tracking-widest transition-all cursor-pointer shadow-sm active:scale-95"
 title="Void sale and reclaim inventory quantities"
 >
 Void Sale
 </button>
 )}
 <button
 onClick={() => {
 const s = selectedSaleDetail;
 setSelectedSaleDetail(null);
 triggerReprintWithPin(s);
 }}
 className="px-3.5 py-2 bg-m3-primary/10 hover:bg-m3-primary/20 text-m3-primary rounded-full text-[10px] uppercase font-black tracking-widest transition-all cursor-pointer shadow-sm active:scale-95"
 title="Reprint Receipt Slip"
 >
 Reprint Slip
 </button>
 </div>

 <button
 onClick={() => setSelectedSaleDetail(null)}
 className="px-4 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-m3-outline-variant/15 text-zinc-400 transition-colors"
 >
 Close Details
 </button>
 </div>
 </div>
 </div>
 )}

 {/* MODAL: Tile Coverage Estimator Calculator */}
 <AnimatePresence>
 {showTileCalculatorModal && (
 <div className="fixed inset-0 flex items-center justify-center z-50 p-4 font-sans text-m3-on-surface">
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.25 }}
 className="absolute inset-0 bg-gray-950/75 backdrop-blur-sm"
 onClick={() => setShowTileCalculatorModal(false)}
 />
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 15 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 15 }}
 transition={{ type: "spring", duration: 0.4 }}
 className="relative w-full max-w-4xl max-h-[90vh] rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low flex flex-col"
 >
 <div className="flex justify-between items-center border-b border-m3-outline-variant/20 pb-3.5 mb-4 shrink-0 text-left">
 <h3 className="text-base font-black text-m3-primary flex items-center gap-2">
 <Calculator className="h-5 w-5 text-emerald-400 animate-pulse" />
 <span>Tile Coverage & Area Estimator Calculator</span>
 </h3>
 <button
 type="button"
 onClick={() => setShowTileCalculatorModal(false)}
 className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1.5 rounded-full hover:bg-m3-primary/10 transition-colors"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 <div className="flex-1 overflow-y-auto pr-1">
 <CalculatorModule
 darkMode={darkMode}
 onApply={(product, quantity) => {
 const userBranchId = activePosBranchId;
 const realBranchStock = getBranchStockQuantity(product, userBranchId, branchStock, branches);
 if (realBranchStock <= 0) {
 showToast("Depleted Stock: Selected product is currently out of stock.");
 return;
 }
 const productWithStock = { ...product, stockQuantity: realBranchStock };
 setCart((prev) => {
 const idx = prev.findIndex((item) => item.product.id === product.id);
 if (idx !== -1) {
 const currentQty = prev[idx].quantity;
 if (currentQty + quantity > realBranchStock) {
 showToast(`Stock Limit: Only ${realBranchStock} available. Added remaining stock.`);
 const updated = [...prev];
 updated[idx] = { ...updated[idx], product: productWithStock, quantity: realBranchStock };
 return updated;
 }
 const updated = [...prev];
 updated[idx] = { ...updated[idx], product: productWithStock, quantity: currentQty + quantity };
 return updated;
 }
 const finalQty = Math.min(quantity, realBranchStock);
 if (quantity > realBranchStock) {
 showToast(`Stock Limit: Requested ${quantity}, but only ${realBranchStock} available in branch inventory.`);
 }
 return [...prev, { product: productWithStock, quantity: finalQty }];
 });
 showToast(`Added ${Math.min(quantity, realBranchStock)} ${product.unit} of ${product.productName} to active invoice.`);
 setShowTileCalculatorModal(false);
 }}
 />
 </div>

 <div className="flex justify-end gap-2 border-t border-m3-outline-variant/20 pt-4 mt-4 shrink-0">
 <button
 type="button"
 onClick={() => setShowTileCalculatorModal(false)}
 className="px-6 py-2.5 bg-m3-primary hover:bg-m3-primary/95 text-m3-on-primary text-xs font-black uppercase tracking-wider rounded-full shadow-sm cursor-pointer transition-colors active:scale-95"
 >
 Close Calculator
 </button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 {/* Success toast alert bar */}
 {toastMessage && (
 <div className="fixed bottom-6 right-6 bg-m3-on-surface text-m3-surface text-xs font-bold py-3 px-5 rounded-[16px] shadow-xl z-50 border border-m3-outline-variant/30 flex items-center gap-2 animate-bounce max-w-[280px]">
 <ShieldCheck className="h-4.5 w-4.5 text-m3-tertiary shrink-0" />
 <span className="leading-tight">{toastMessage}</span>
 </div>
 )}

 {/* Register Corporate Member Modal */}
 <AnimatePresence>
 {showAddMemberModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="absolute inset-0 bg-gray-950/75 backdrop-blur-sm"
 onClick={() => setShowAddMemberModal(false)}
 />
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 15 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 15 }}
 className="relative w-full max-w-lg rounded-[24px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface flex flex-col space-y-4"
 >
 <div className="flex justify-between items-center border-b border-m3-outline-variant/20 pb-3">
 <div className="flex items-center gap-2">
 <div className="p-2 rounded-xl bg-m3-primary/10 text-m3-primary">
 <UserPlus className="h-5 w-5" />
 </div>
 <div className="text-left">
 <h3 className="text-sm font-extrabold text-m3-on-surface">Add Corporate Member Account</h3>
 <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Register new member profile & configure credit ceiling</p>
 </div>
 </div>
 <button
 type="button"
 onClick={() => setShowAddMemberModal(false)}
 className="text-m3-on-surface-variant hover:text-m3-on-surface p-1.5 rounded-full hover:bg-m3-primary/10 transition-colors cursor-pointer"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 {addMemberError && (
 <div className="p-2.5 bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs font-bold rounded-xl flex items-center gap-2">
 <ShieldAlert className="h-4 w-4 shrink-0" />
 <span>{addMemberError}</span>
 </div>
 )}

 <form onSubmit={handleAddCorporateMember} className="space-y-3 text-left">
 <div className="space-y-1">
 <label className="text-[10px] font-black text-m3-primary uppercase tracking-wider block">
 Full Name / Company Account Name *
 </label>
 <input
 type="text"
 required
 value={newMemberName}
 onChange={(e) => setNewMemberName(e.target.value)}
 placeholder="e.g. Acme Builders Corp / Juan Dela Cruz"
 className="w-full bg-m3-surface-low border border-m3-outline-variant/40 rounded-xl px-3.5 py-2 text-xs font-bold text-m3-on-surface focus:outline-none focus:border-m3-primary transition-all"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="text-[10px] font-black text-m3-primary uppercase tracking-wider block">
 Contact Phone Number *
 </label>
 <input
 type="text"
 required
 value={newMemberPhone}
 onChange={(e) => setNewMemberPhone(e.target.value)}
 placeholder="0917-123-4567"
 className="w-full bg-m3-surface-low border border-m3-outline-variant/40 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-m3-on-surface focus:outline-none focus:border-m3-primary transition-all"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] font-black text-m3-primary uppercase tracking-wider block">
 Email Address
 </label>
 <input
 type="email"
 value={newMemberEmail}
 onChange={(e) => setNewMemberEmail(e.target.value)}
 placeholder="billing@company.com"
 className="w-full bg-m3-surface-low border border-m3-outline-variant/40 rounded-xl px-3.5 py-2 text-xs font-bold text-m3-on-surface focus:outline-none focus:border-m3-primary transition-all"
 />
 </div>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] font-black text-m3-primary uppercase tracking-wider block">
 Credit Line Ceiling Limit (₱) *
 </label>
 <input
 type="number"
 required
 min="0"
 step="500"
 value={newMemberLimit}
 onChange={(e) => setNewMemberLimit(e.target.value)}
 className="w-full bg-m3-surface-low border border-m3-outline-variant/40 rounded-xl px-3.5 py-2 text-xs font-mono font-extrabold text-m3-on-surface focus:outline-none focus:border-m3-primary transition-all"
 />
 <p className="text-[9.5px] text-zinc-400 italic">Maximum authorized credit allowed for deferred billing checkout</p>
 </div>

 <div className="flex justify-end gap-2 border-t border-m3-outline-variant/20 pt-3 mt-4">
 <button
 type="button"
 onClick={() => setShowAddMemberModal(false)}
 className="px-4 py-2 border border-m3-outline-variant/40 hover:bg-m3-surface-high text-m3-on-surface text-xs font-bold rounded-xl cursor-pointer transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-5 py-2 bg-m3-primary hover:bg-m3-primary/90 text-m3-on-primary text-xs font-extrabold rounded-xl shadow-md cursor-pointer transition-colors flex items-center gap-1.5"
 >
 <UserPlus className="h-4 w-4" />
 <span>Save & Link Account</span>
 </button>
 </div>
 </form>
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 {/* Loyalty Points Mechanics Configuration Modal */}
 <AnimatePresence>
 {showLoyaltyConfigModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="absolute inset-0 bg-gray-950/75 backdrop-blur-sm"
 onClick={() => setShowLoyaltyConfigModal(false)}
 />
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 15 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 15 }}
 className="relative w-full max-w-md rounded-[24px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface flex flex-col space-y-4"
 >
 <div className="flex justify-between items-center border-b border-m3-outline-variant/20 pb-3">
 <div className="flex items-center gap-2">
 <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
 <Sparkles className="h-5 w-5" />
 </div>
 <div className="text-left">
 <h3 className="text-sm font-extrabold text-m3-on-surface">Member Loyalty Program Mechanics</h3>
 <p className="text-[10px] text-zinc-400">Configure point earning rates & redemption value</p>
 </div>
 </div>
 <button
 type="button"
 onClick={() => setShowLoyaltyConfigModal(false)}
 className="text-m3-on-surface-variant hover:text-m3-on-surface p-1.5 rounded-full hover:bg-m3-primary/10 transition-colors cursor-pointer"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 <form
 onSubmit={(e) => {
 e.preventDefault();
 const spendNum = parseFloat(loyaltySpendInput) || 500;
 const valueNum = parseFloat(loyaltyPointValueInput) || 1.0;
 updateLoyaltyConfig({
 spendPerPoint: spendNum,
 pointValueInPhp: valueNum,
 enabled: true,
 });
 showToast("Loyalty points program mechanics saved successfully!");
 setShowLoyaltyConfigModal(false);
 }}
 className="space-y-4 text-left"
 >
 <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
 <div className="flex items-center justify-between text-xs font-bold text-amber-500">
 <span>⭐ Active Formula Rules</span>
 <span className="text-[10px] font-mono font-black uppercase">Live System Rule</span>
 </div>
 <p className="text-[11px] text-m3-on-surface leading-relaxed">
 Every <strong>₱{(parseFloat(loyaltySpendInput) || 500).toLocaleString()}</strong> spent = <strong>1 Point</strong> earned.<br />
 <strong>1 Point</strong> = <strong>₱{(parseFloat(loyaltyPointValueInput) || 1.0).toFixed(2)}</strong> discount redemption value.
 </p>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] font-black text-m3-primary uppercase tracking-wider block">
 Spend Amount Per 1 Point (PHP) *
 </label>
 <div className="relative">
 <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-400">₱</span>
 <input
 type="number"
 required
 min="10"
 step="10"
 value={loyaltySpendInput}
 onChange={(e) => setLoyaltySpendInput(e.target.value)}
 placeholder="500"
 className="w-full bg-m3-surface-low border border-m3-outline-variant/40 rounded-xl pl-7 pr-3 py-2 text-xs font-mono font-bold text-m3-on-surface focus:outline-none focus:border-m3-primary transition-all"
 />
 </div>
 <p className="text-[9.5px] text-zinc-400 italic">Example: Enter 500 so buying ₱500 worth of tiles earns 1 point (e.g. ₱1,500 purchase = 3 points).</p>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] font-black text-m3-primary uppercase tracking-wider block">
 Redemption Value Per 1 Point (PHP) *
 </label>
 <div className="relative">
 <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-400">₱</span>
 <input
 type="number"
 required
 min="0.1"
 step="0.1"
 value={loyaltyPointValueInput}
 onChange={(e) => setLoyaltyPointValueInput(e.target.value)}
 placeholder="1.00"
 className="w-full bg-m3-surface-low border border-m3-outline-variant/40 rounded-xl pl-7 pr-3 py-2 text-xs font-mono font-bold text-m3-on-surface focus:outline-none focus:border-m3-primary transition-all"
 />
 </div>
 <p className="text-[9.5px] text-zinc-400 italic">Example: Enter 1.00 so 1 point deducts ₱1.00 from the bill.</p>
 </div>

 <div className="flex justify-end gap-2 border-t border-m3-outline-variant/20 pt-3 mt-4">
 <button
 type="button"
 onClick={() => setShowLoyaltyConfigModal(false)}
 className="px-4 py-2 border border-m3-outline-variant/40 hover:bg-m3-surface-high text-m3-on-surface text-xs font-bold rounded-xl cursor-pointer transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-colors flex items-center gap-1.5"
 >
 <Sparkles className="h-4 w-4" />
 <span>Save Mechanics</span>
 </button>
 </div>
 </form>
 </motion.div>
 </div>
 )}
 </AnimatePresence>
 </div>
 );
}
