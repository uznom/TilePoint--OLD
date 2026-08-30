/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
AlertCircle,
Calculator,
Calendar,
CheckCircle,
ChevronDown,
ChevronUp,
Download,
FileText,
History,
Keyboard,
Loader2,
Lock,
LockKeyhole,
Printer,
RefreshCw,
RotateCcw,
Scissors,
Search,
ShieldAlert,
ShieldCheck,
ShoppingBag,
ShoppingCart,
Sparkles,
Trash2,
Truck,
UserPlus,
Users,
X
} from "lucide-react";
import { AnimatePresence,motion } from "motion/react";
import React,{ useCallback,useEffect,useRef,useState } from "react";
import { useDb,useDbBranchStock,useDbProducts } from "../context/DbContext";
import { useVirtualList } from "../hooks/useVirtualList";
import { getBranchStockQuantity,getBranchStockRecord,isProductInBranch,isSameBranch } from "../lib/branchUtils";
import { saveFileToBackup } from "../lib/fileBackupHelper";
import { Member,Product,Sale,UserRole } from "../types/db";
import { formatCurrency } from "../utils/formatters";
import { CalculatorModule } from "./CalculatorModule";
import { ToastNotification } from "./ToastNotification";
import { useReceiptFontSize } from "./ReceiptFontSizeControl";

import { formatTin } from '../utils/formatters';

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
 value={localVal ?? ''}
 onChange={handleChange}
 onBlur={handleBlur}
 onKeyDown={handleKeyDown}
 className={`w-12 text-center bg-transparent border-y-0 border-x border-divider/30 text-xs font-black ${
 quantity < 0 ? "text-rose-500 bg-rose-500/10 font-bold" : "text-foreground"
 } focus:outline-none focus:bg-content1 rounded-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
 />
 );
};

export const PosModule: React.FC<PosModuleProps> = ({
 darkMode,
 onNavigate: _onNavigate, viewMode,
}) => {
 const rawProducts = useDbProducts();
 const branchStock = useDbBranchStock();
 const {
 activeShift,
 openShift,
 closeShift,
 getShiftReportStats,
 shifts,
 activeBranch,
 checkoutSale,
 voidSale,
 holdSale,
 resumeParkedSale,
 parkedSales,
 sales,
 saleItems,
 users,
 addAuditLog,
 currentUser,
 createDelivery,
		discountSchemes,
 deliveries,
 branches,
 syncFromSharedServer,
 syncStatus,
 	members: rawMembers,
	setMembers,
	loyaltyConfig,
	updateLoyaltyConfig,
	} = useDb();

  const [activePosBranchId, setActivePosBranchId] = useState<string>(
    currentUser?.branchAssignmentId || (branches && branches[0]?.id) || ""
  );

  const branchParkedSales = React.useMemo(() => {
    const currentBranch = activePosBranchId || currentUser?.branchAssignmentId || (branches && branches[0]?.id) || "";
    return parkedSales.filter((p: any) => {
      const pBranch = p.heldByBranchId || (p as any).branchId;
      if (!pBranch) return false;
      return isSameBranch(pBranch, currentBranch, branches);
    });
  }, [parkedSales, activePosBranchId, currentUser?.branchAssignmentId, branches]);

  useEffect(() => {
    if (currentUser?.branchAssignmentId) {
      setActivePosBranchId(currentUser.branchAssignmentId);
    } else if (branches && branches.length > 0 && !activePosBranchId) {
      setActivePosBranchId(branches[0].id);
    }
  }, [currentUser?.branchAssignmentId, branches, activePosBranchId]);

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
      const memberBranch = m.branchId || activePosBranchId;
      return isSameBranch(memberBranch, activePosBranchId, branches);
    });
  }, [rawMembers, currentUser, activePosBranchId, branches]);

  const members = branchFilteredMembers;

  const getBranchPrice = React.useCallback((p: Product) => {
    if (!p) return 0;
    const branchStockItem = getBranchStockRecord(p, activePosBranchId || currentUser?.branchAssignmentId || (branches && branches[0]?.id) || "", branchStock, branches);
    const price = branchStockItem &&
    branchStockItem.sellingPriceOverride !== undefined &&
    branchStockItem.sellingPriceOverride !== null &&
    branchStockItem.sellingPriceOverride > 0
    ? branchStockItem.sellingPriceOverride
    : (p.sellingPrice || 0);
    return Number(price) || 0;
  }, [activePosBranchId, currentUser?.branchAssignmentId, branches, branchStock]);

 // Active cashier shift states
 const [startCashInput, setStartCashInput] = useState("5000");
 const [showShiftModal, setShowShiftModal] = useState(false);
 const [showEscConfirmModal, setShowEscConfirmModal] = useState(false);
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
 const [resumingParkedId, setResumingParkedId] = useState<string | null>(null);

 // Add Member Modal states for Corporate Member Credit Desk
 const [showAddMemberModal, setShowAddMemberModal] = useState(false);
 const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
 const [showLoyaltyConfigModal, setShowLoyaltyConfigModal] = useState<boolean>(false);
 const [loyaltySpendInput, setLoyaltySpendInput] = useState<string>("500");
 const [loyaltyPointValueInput, setLoyaltyPointValueInput] = useState<string>("1.0");
 const [newMemberName, setNewMemberName] = useState("");
 const [newMemberPhone, setNewMemberPhone] = useState("");
 const [newMemberEmail, setNewMemberEmail] = useState("");
 const [newMemberLimit, setNewMemberLimit] = useState("0");
 const [addMemberError, setAddMemberError] = useState("");

 const handleAddCorporateMember = (e?: React.FormEvent) => {
 if (e) e.preventDefault();
 setAddMemberError("");

 if (!newMemberName.trim()) {
 setAddMemberError("Please enter member full name or company name.");
 return;
 }
 const limitNum = newMemberLimit.trim() === "" ? 0 : Number(newMemberLimit);
 if (isNaN(limitNum) || limitNum < 0) {
 setAddMemberError("Credit limit must be a non-negative number.");
 return;
 }

 const newM: Member = {
 id: "M" + (rawMembers.length + 1) + "-" + Math.floor(Math.random() * 900 + 100),
 fullName: newMemberName.trim(),
 phone: newMemberPhone.trim() || "N/A",
 email: newMemberEmail.trim() || "none@specified.com",
 points: 1,
 creditLimit: limitNum,
 outstandingBalance: 0,
 status: "Active",
  branchId: currentUser?.branchAssignmentId || branches[0]?.id || "main",
 createdAt: new Date().toISOString(),
 };

 const updatedMembers = [...rawMembers, newM];
 setMembers(updatedMembers);
  try {
    localStorage.setItem("atpos_v2_members_list", JSON.stringify(updatedMembers));
  } catch (storageErr) {
    console.warn('[POS Member Register] Failed to save member list to localStorage:', storageErr);
  }

 addAuditLog(
 "MEMBER_REGISTER",
 `Registered member ${newM.fullName} with credit ceiling of ₱${(Number(newM.creditLimit) || 0).toLocaleString()} via Corporate Member Credit Desk`,
 "Members",
 newM.id,
 JSON.stringify(newM)
 );

 setCustomerName(newM.fullName);
 showToast(`Registered and linked corporate member: ${newM.fullName}`);

 setNewMemberName("");
 setNewMemberPhone("");
 setNewMemberEmail("");
 setNewMemberLimit("0");
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
 const [ledgerSearchQuery, setLedgerSearchQuery] = useState("");
 const [ledgerPaymentFilter, setLedgerPaymentFilter] = useState<string>("All");
 const [ledgerDateFilter, setLedgerDateFilter] = useState<string>("");
 const [isStatsCollapsed, setIsStatsCollapsed] = useState(false);
 const { fontClass: receiptFontClass } = useReceiptFontSize();

  const [selectedPoolBranchId, _setSelectedPoolBranchId] = useState<string>("All");
  const [selectedCategory, _setSelectedCategory] = useState<string>("All");
  const [searchTerm, _setSearchTerm] = useState("");
  const [_barcodeAddFeedback, setBarcodeAddFeedback] = useState<string | null>(null);


 // Cart & POS Screen States
 const [cart, setCart] = useState<
 {
 product: Product;
 quantity: number;
 overridePrice?: number;
 discountType?: "NONE" | "FLAT" | "PERCENT" | "SENIOR" | "PWD" | "CONTRACT";
 discountValue?: number;
 discountAmount?: number;
 }[]
 >(() => {
 try {
 const cached = localStorage.getItem("tp_active_cart");
 return cached ? JSON.parse(cached) : [];
 } catch (e) {
 return [];
 }
 });
 const [customerName, setCustomerName] = useState(() => {
 return (
 localStorage.getItem("tp_active_customer_name") || "Walk-in Customer"
 );
 });
 const [customerAddress, setCustomerAddress] = useState(() => {
 return localStorage.getItem("tp_active_customer_address") || "";
 });
 const [customerTin, setCustomerTin] = useState(() => {
 return localStorage.getItem("tp_active_customer_tin") || "";
 });
 const [businessStyle, setBusinessStyle] = useState(() => {
 return localStorage.getItem("tp_active_business_style") || "";
 });
 const [customerNotes, setCustomerNotes] = useState(() => {
 return localStorage.getItem("tp_active_customer_notes") || "";
 });
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
 localStorage.setItem("tp_active_customer_address", customerAddress);
 }, [customerAddress]);

 useEffect(() => {
 localStorage.setItem("tp_active_customer_tin", customerTin);
 }, [customerTin]);

 useEffect(() => {
 localStorage.setItem("tp_active_business_style", businessStyle);
 }, [businessStyle]);

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
 const [selectedDiscountItemIndex, setSelectedDiscountItemIndex] = useState<number | null>(null);

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
 const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  

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

 const activeReceiptMember = React.useMemo(() => {
 if (!activeReceipt || !activeReceipt.customerName) return null;
 const nameTrimmed = activeReceipt.customerName.trim().toLowerCase();
 if (!nameTrimmed || nameTrimmed === "walk-in customer" || nameTrimmed === "walk-in" || nameTrimmed === "walk in") return null;
 return members.find((m) => m.fullName.trim().toLowerCase() === nameTrimmed) || null;
 }, [activeReceipt, members]);

 const [receiptViewMode, setReceiptViewMode] = useState<"unified" | "official" | "delivery">("unified");

 const activeReceiptDelivery = React.useMemo(() => {
 if (!activeReceipt) return null;
 return (deliveries || []).find(d => d.saleId === activeReceipt.id || d.saleNumber === activeReceipt.saleNumber) || null;
 }, [activeReceipt, deliveries]);

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

  // Safe Transaction Commit & Recovery State
  interface RecoveredSessionDraft {
    itemCount: number;
    grandTotal: number;
    customerName: string;
    customerNotes?: string;
    lastSavedAt: string;
    hasDeliveryDraft?: boolean;
  }
  const [recoveredSession, setRecoveredSession] = useState<RecoveredSessionDraft | null>(null);
  const [showRecoveryBanner, setShowRecoveryBanner] = useState(false);

  // Safe Transaction Commit: Flush active cart and delivery state synchronously
  const flushPosSessionToStorage = useCallback(() => {
    try {
      if (cart && cart.length > 0) {
        const deliveryDraftObj = {
          deliveryCustomerName,
          deliveryContact,
          deliveryHouseNo,
          deliveryStreet,
          deliveryBarangay,
          deliveryCity,
          deliveryLandmark,
          deliveryDate,
          deliveryTime,
          deliveryNotes,
        };

        const sessionCheckpoint = {
          cart,
          customerName,
          customerNotes,
          discountValue,
          discountType,
          paymentMethod,
          paymentRef,
          deliveryDraft: deliveryDraftObj,
          timestamp: new Date().toISOString(),
          status: "UNCOMMITTED_DRAFT",
          cashier: currentUser?.fullName || currentUser?.username || "Cashier",
        };

        localStorage.setItem("tp_active_cart", JSON.stringify(cart));
        localStorage.setItem("tp_active_customer_name", customerName);
        localStorage.setItem("tp_active_customer_notes", customerNotes);
        localStorage.setItem("tp_pos_session_checkpoint", JSON.stringify(sessionCheckpoint));
        localStorage.setItem("tp_pending_delivery_draft", JSON.stringify(deliveryDraftObj));
      } else {
        localStorage.removeItem("tp_pos_session_checkpoint");
        localStorage.removeItem("tp_pending_delivery_draft");
      }
    } catch (err) {
      console.warn("[POS Safe Commit] Local Storage Flush Warning:", err);
    }
  }, [
    cart,
    customerName,
    customerNotes,
    discountValue,
    discountType,
    paymentMethod,
    paymentRef,
    deliveryCustomerName,
    deliveryContact,
    deliveryHouseNo,
    deliveryStreet,
    deliveryBarangay,
    deliveryCity,
    deliveryLandmark,
    deliveryDate,
    deliveryTime,
    deliveryNotes,
    currentUser,
  ]);

  // Point of Sale Safeguard Guard: Flush cart & session draft before refresh/unload or tab hide
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      flushPosSessionToStorage();
      if (cart && cart.length > 0) {
        e.preventDefault();
        e.returnValue = "Active POS transaction in progress! Reloading will preserve your draft session safely.";
        return e.returnValue;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushPosSessionToStorage();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", flushPosSessionToStorage);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", flushPosSessionToStorage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [cart, flushPosSessionToStorage]);

  // Recovery Task: Check for abandoned/unsynced local session drafts on hydration
  useEffect(() => {
    try {
      const checkpointRaw = localStorage.getItem("tp_pos_session_checkpoint");
      if (checkpointRaw) {
        const parsed = JSON.parse(checkpointRaw);
        if (parsed && Array.isArray(parsed.cart) && parsed.cart.length > 0) {
          const totalQty = parsed.cart.reduce((acc: number, item: any) => acc + (item.quantity || 1), 0);
          const subtotalVal = parsed.cart.reduce((acc: number, item: any) => {
            const price = item.overridePrice !== undefined ? item.overridePrice : (item.product?.sellingPrice || 0);
            return acc + price * (item.quantity || 1);
          }, 0);
          const discountVal = parsed.discountValue || 0;
          const totalVal = Math.max(0, subtotalVal - discountVal);

          setRecoveredSession({
            itemCount: totalQty,
            grandTotal: totalVal,
            customerName: parsed.customerName || "Walk-in Customer",
            customerNotes: parsed.customerNotes || "",
            lastSavedAt: parsed.timestamp ? new Date(parsed.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "previous session",
            hasDeliveryDraft: Boolean(parsed.deliveryDraft && parsed.deliveryDraft.deliveryBarangay),
          });
          setShowRecoveryBanner(true);

          if (parsed.deliveryDraft) {
            if (parsed.deliveryDraft.deliveryCustomerName) setDeliveryCustomerName(parsed.deliveryDraft.deliveryCustomerName);
            if (parsed.deliveryDraft.deliveryContact) setDeliveryContact(parsed.deliveryDraft.deliveryContact);
            if (parsed.deliveryDraft.deliveryHouseNo) setDeliveryHouseNo(parsed.deliveryDraft.deliveryHouseNo);
            if (parsed.deliveryDraft.deliveryStreet) setDeliveryStreet(parsed.deliveryDraft.deliveryStreet);
            if (parsed.deliveryDraft.deliveryBarangay) setDeliveryBarangay(parsed.deliveryDraft.deliveryBarangay);
            if (parsed.deliveryDraft.deliveryCity) setDeliveryCity(parsed.deliveryDraft.deliveryCity);
            if (parsed.deliveryDraft.deliveryLandmark) setDeliveryLandmark(parsed.deliveryDraft.deliveryLandmark);
            if (parsed.deliveryDraft.deliveryNotes) setDeliveryNotes(parsed.deliveryDraft.deliveryNotes);
          }

          addAuditLog(
            "POS_DRAFT_RECOVERY",
            `Hydration Safeguard: Restored abandoned uncommitted POS transaction session draft (${totalQty} item(s), ₱${totalVal.toFixed(2)}) for ${parsed.customerName || "Walk-in Customer"}.`,
            "POS_Session",
            `RECOVERY-${Date.now()}`
          );

          console.log(`[POS Recovery Task] Successfully hydrated ${totalQty} cart item(s) from session checkpoint.`);
        }
      }
    } catch (err) {
      console.warn("[POS Recovery Task] Session hydration warning:", err);
    }
  }, [addAuditLog]);

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

 // Keyboard shortcut assistant status
 const [_showHotkeysHelp, _setShowHotkeysHelp] = useState(false);
 const [shortcutsCollapsed, setShortcutsCollapsed] = useState(true);

 // Mobile section toggle tab for responsive flow
 const [mobilePosTab, setMobilePosTab] = useState<"queue" | "basket">(
 "basket",
 );

 // Custom modal input states (replacing prompt)
 const [showCustomerModal, setShowCustomerModal] = useState(false);
 const [customerModalInput, setCustomerModalInput] = useState("");
 const [customerModalAddressInput, setCustomerModalAddressInput] = useState("");
 const [customerModalTinInput, setCustomerModalTinInput] = useState("");
 const [customerModalBusinessStyleInput, setCustomerModalBusinessStyleInput] = useState("");
 const [customerModalNotesInput, setCustomerModalNotesInput] = useState("");

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

 const [isManualSyncingQueue, setIsManualSyncingQueue] = useState(false);

 useEffect(() => {
 if (prevParkedSalesRef.current.length > 0) {
 const prevIds = new Set(prevParkedSalesRef.current.map((ps) => ps.id));
 const newSales = parkedSales.filter((ps) => {
      const psBranch = ps.heldByBranchId || (ps as any).branchId || activePosBranchId;
      return isSameBranch(psBranch, activePosBranchId, branches) && !prevIds.has(ps.id);
    });
 if (newSales.length > 0) {
 const newest = newSales[newSales.length - 1];
 showToast(`NEW YARD ORDER RECEIVED: ${newest.customerName || "Walk-in Customer"}`);
 playNotificationSound();
 } else if (parkedSales.length < prevParkedSalesRef.current.length) {
 showToast("Queue synchronized: Hold order processed/resumed");
 }
 }
 prevParkedSalesRef.current = parkedSales;
 }, [parkedSales, activePosBranchId, branches]);

  useEffect(() => {
    if (syncStatus?.sseConnected) return;

    const queueSyncInterval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        syncFromSharedServer(true).catch(() => {});
      }
    }, 15000);
    return () => clearInterval(queueSyncInterval);
  }, [syncFromSharedServer, syncStatus?.sseConnected]);

 // Search input referencer for hotkey focus
 const searchInputRef = useRef<HTMLInputElement>(null);

	// Map products

	// All product categories for filters in current branch
	

	// Pre-indexed search index for POS product catalog
	

	

 // Dynamic Surcharges, VAT (12%), and Discounts compliant with Philippine and contractor standards
 const getItemDiscount = useCallback(
 (item: {
 product: Product;
 quantity: number;
 overridePrice?: number;
 discountType?: "NONE" | "FLAT" | "PERCENT" | "SENIOR" | "PWD" | "CONTRACT";
 discountValue?: number;
 discountAmount?: number;
 }) => {
 const basePrice = getBranchPrice(item.product);
 const unitPrice = item.overridePrice !== undefined ? item.overridePrice : basePrice;
 const lineSubtotal = unitPrice * item.quantity;

 let discAmt = 0;
 let isVatExempt = false;
 const dType = item.discountType || "NONE";
 const dVal = item.discountValue || 0;

 if (dType === "FLAT") {
 discAmt = Math.min(lineSubtotal, dVal);
 } else if (dType === "PERCENT") {
 discAmt = parseFloat((lineSubtotal * (dVal / 100)).toFixed(2));
 } else if (dType === "SENIOR" || dType === "PWD") {
 isVatExempt = true;
 discAmt = parseFloat((lineSubtotal * 0.20).toFixed(2));
 } else if (dType === "CONTRACT") {
 discAmt = parseFloat((lineSubtotal * 0.10).toFixed(2));
 } else if (item.discountAmount) {
 discAmt = item.discountAmount;
 }

 discAmt = Math.min(lineSubtotal, Math.max(0, discAmt));
 return {
 unitPrice,
 lineSubtotal,
 itemDiscount: discAmt,
 isVatExempt,
 lineNet: Math.max(0, lineSubtotal - discAmt),
 };
 },
 [getBranchPrice],
 );

 const cartItemDetails = React.useMemo(() => {
 return cart.map((item) => {
 const calc = getItemDiscount(item);
 return {
 ...item,
 ...calc,
 };
 });
 }, [cart, getItemDiscount]);

 const subtotal = cartItemDetails.reduce((acc, i) => acc + i.lineSubtotal, 0);
 const discountAmount = cartItemDetails.reduce((acc, i) => acc + i.itemDiscount, 0);

 const vat = cartItemDetails.reduce((acc, i) => {
 if (i.isVatExempt || (i.product as any).vatExempt) return acc;
 return acc + parseFloat((i.lineNet * 0.12).toFixed(2));
 }, 0);

 const grandTotal = parseFloat((subtotal - discountAmount).toFixed(2));

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
 

 if (e.key === "F1") {
 e.preventDefault();
 handleCancelSale();
 } else if (e.key === "F2") {
 e.preventDefault();
 handleFocusSearch();
 } else if (e.key === "F3") {
 e.preventDefault();
 handleHold();
 } else if (e.key === "F4") {
 e.preventDefault();
 handleViewParkedSales();
 } else if (e.key === "F5") {
 e.preventDefault();
 setCustomerModalInput(customerName);
 setCustomerModalAddressInput(customerAddress);
 setCustomerModalTinInput(customerTin);
 setCustomerModalBusinessStyleInput(businessStyle);
 setCustomerModalNotesInput(customerNotes);
 setShowCustomerModal(true);
 } else if (e.key === "F6") {
 e.preventDefault();
 setDiscountInput("");
 setShowDiscountModal(true);
 } else if (e.key === "F7") {
 e.preventDefault();
 handlePaySettleSale();
 } else if (e.key === "F8") {
 e.preventDefault();
 handleReprintLastReceipt();
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
 if (showEscConfirmModal) { setShowEscConfirmModal(false); return; }
 if (showCustomerModal) { setShowCustomerModal(false); return; }
 if (showDiscountModal) { setShowDiscountModal(false); return; }
 if (showShiftModal) { setShowShiftModal(false); return; }
 if (showCloseShiftModal) { setShowCloseShiftModal(false); return; }
 if (showReceiptModal) { setShowReceiptModal(false); return; }
 if (showFulfillmentModal) { setShowFulfillmentModal(false); return; }
 if (showTileCalculatorModal) { setShowTileCalculatorModal(false); return; }
 if (showAddMemberModal) { setShowAddMemberModal(false); return; }
 if (showLoyaltyConfigModal) { setShowLoyaltyConfigModal(false); return; }

 if (cart.length > 0 || isCheckingOut) {
 setShowEscConfirmModal(true);
 } else {
 showToast("Active cart is currently empty.");
 }
 }
 };

 window.addEventListener("keydown", handleKeyDown);
 return () => { window.removeEventListener("keydown", handleKeyDown); };
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [cart, customerName, amountTendered, grandTotal, paymentMethod, activeReceipt, activeShift, sales, showEscConfirmModal, showCustomerModal, showDiscountModal, showShiftModal, showCloseShiftModal, showReceiptModal, showFulfillmentModal, showTileCalculatorModal, showAddMemberModal, showLoyaltyConfigModal, isCheckingOut]);

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

 const parsedQty = parseInt(val, 10);
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

  const handleCancelSale = (silent: boolean | React.MouseEvent = false) => {
    const isSilent = typeof silent === "boolean" ? silent : false;
    if (cart.length === 0) {
      if (!isSilent) showToast("Active cart is already empty.");
      return;
    }
    setCart([]);
    setCustomerName("Walk-in Customer");
    setCustomerAddress("");
    setCustomerTin("");
    setBusinessStyle("");
    setCustomerNotes("");
    setDiscountValue(0);
    setDiscountType("NONE");
    setAmountTendered("");
    setChangeAmount(0);
    setErrorMessage("");
    setRecoveredSession(null);
    setShowRecoveryBanner(false);
    try {
      localStorage.removeItem("tp_active_cart");
      localStorage.removeItem("tp_active_customer_name");
      localStorage.removeItem("tp_active_customer_address");
      localStorage.removeItem("tp_active_customer_tin");
      localStorage.removeItem("tp_active_business_style");
      localStorage.removeItem("tp_active_customer_notes");
      localStorage.removeItem("tp_pos_session_checkpoint");
      localStorage.removeItem("tp_pending_delivery_draft");
    } catch (storageErr) {
      console.warn('[POS Clear] Failed to clear cart keys from localStorage:', storageErr);
    }
    if (!isSilent) showToast("Active transaction basket cleared.");
  };

  const handleFocusSearch = () => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
      try { 
        searchInputRef.current.select(); 
      } catch (focusErr) { 
        console.debug('[POS Focus] Text selection error (non-fatal):', focusErr); 
      }
      try {
        searchInputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (scrollErr) {
        console.debug('[POS Focus] Scroll to search error (non-fatal):', scrollErr);
      }
    }
  };

  const handleViewParkedSales = () => {
    try {
      const parkedDrawer = document.getElementById("parked-sales-drawer");
      if (parkedDrawer) {
        parkedDrawer.scrollIntoView({ behavior: "smooth" });
      } else {
        showToast("No parked hold transactions in memory.");
      }
    } catch (scrollErr) {
      console.debug('[POS Parked] Scroll into view error (non-fatal):', scrollErr);
    }
  };

  const handlePaySettleSale = () => {
    if (cart.length === 0) {
      showToast("Your active cart is currently empty.");
      return;
    }
    const tenderIdx = document.getElementById("cash-tendered-field") as HTMLInputElement | null;
    const parsedTender = parseFloat(amountTendered || "0");
    const isCashValid = paymentMethod === "Cash" && !isNaN(parsedTender) && parsedTender >= grandTotal;
    const isNonCash = paymentMethod !== "Cash";

    if (isCashValid || isNonCash) {
      clientCheckout();
    } else {
      if (paymentMethod === "Cash" && (!amountTendered || parsedTender < grandTotal)) {
        setAmountTendered(grandTotal.toString());
      }
      try {
        const checkSection = document.getElementById("checkout-action-panel");
        checkSection?.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => tenderIdx?.focus(), 100);
      } catch (scrollErr) {
        console.debug('[POS Settle] Scroll into view error (non-fatal):', scrollErr);
      }
    }
  };

 const handleReprintLastReceipt = () => {
 if (activeReceipt) {
 setShowReceiptModal(true);
 } else if (sales && sales.length > 0) {
 const lastSale = sales[sales.length - 1];
 setActiveReceipt(lastSale);
 setShowReceiptModal(true);
 } else {
 showToast("No transaction has been processed in this session yet.");
 }
 };

 // Park Sale operations
 const handleHold = () => {
 if (cart.length === 0) {
 showToast("Basket is empty. Nothing to park.");
 return;
 }
 holdSale(cart, customerName, customerNotes, activePosBranchId);
 handleCancelSale(true);
 showToast("Transaction parked inside safe hold registers.");
 };

 const handleResume = (parkedId: string) => {
 if (resumingParkedId === parkedId) return;
 setResumingParkedId(parkedId);

 const res = resumeParkedSale(parkedId, currentUser?.fullName || currentUser?.username || "Cashier");

 if (!res.success) {
 showToast(res.error || "This transaction was already resumed on another register.");
 setResumingParkedId(null);
 return;
 }

 const record = res.record;
 if (!record) {
 setResumingParkedId(null);
 return;
 }

 // Save current ongoing order if there are items in the cart
 const ongoingCart = [...cart];
 const ongoingCustomerName = customerName;
 const ongoingCustomerNotes = customerNotes;

 if (ongoingCart.length > 0) {
 holdSale(ongoingCart, ongoingCustomerName, ongoingCustomerNotes, activePosBranchId);
 }

 // Refreshes stock quantity on resumed cart items from latest products list
 const refreshedItems = (record.items || []).map((item: any) => {
 const freshProd = rawProducts.find((p) => p.id === item.product.id);
 const freshStock = freshProd
 ? getBranchStockQuantity(freshProd, activePosBranchId, branchStock, branches)
 : (item.product.stockQuantity ?? 0);
 return {
 ...item,
 product: {
 ...(freshProd || item.product),
 stockQuantity: freshStock,
 },
 };
 });

 setCart(refreshedItems);
 setCustomerName(record.customerName || "");
 setCustomerNotes(record.notes || "");
 setMobilePosTab("basket");

 if (ongoingCart.length > 0) {
 showToast(`Current order auto-held. Resumed staged order for ${record.customerName || "Walk-in"}. Locked to this register to prevent double records.`);
 } else {
 showToast(`Resumed staged order for ${record.customerName || "Walk-in"}. Locked to this register to prevent double records.`);
 }

 setTimeout(() => {
 setResumingParkedId(null);
 }, 500);
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

 const executeApplyDiscount = (
 type: "NONE" | "FLAT" | "PERCENT" | "SENIOR" | "PWD" | "CONTRACT",
 numericVal: number,
 targetIndex: number | null,
 ) => {
 if (cart.length === 0) {
 showToast("Active cart is empty.");
 setShowDiscountModal(false);
 return;
 }

 setCart((prevCart) =>
 prevCart.map((item, idx) => {
 if (targetIndex === null || targetIndex === idx) {
 const basePrice = getBranchPrice(item.product);
 const unitPrice = item.overridePrice !== undefined ? item.overridePrice : basePrice;
 const lineSubtotal = unitPrice * item.quantity;
 let discAmt = 0;

 if (type === "FLAT") {
 discAmt = Math.min(lineSubtotal, numericVal);
 } else if (type === "PERCENT") {
 discAmt = parseFloat((lineSubtotal * (numericVal / 100)).toFixed(2));
 } else if (type === "SENIOR" || type === "PWD") {
 discAmt = parseFloat((lineSubtotal * 0.20).toFixed(2));
 } else if (type === "CONTRACT") {
 discAmt = parseFloat((lineSubtotal * 0.10).toFixed(2));
 }

 return {
 ...item,
 discountType: type,
 discountValue: numericVal,
 discountAmount: discAmt,
 };
 }
 return item;
 }),
 );

 setShowDiscountModal(false);
 setDiscountInput("");

 const targetDesc =
 targetIndex !== null && cart[targetIndex]
 ? `for "${cart[targetIndex].product.productName}"`
 : "for all cart items";

 if (type === "NONE") {
 showToast(`Discount removed ${targetDesc}.`);
 } else if (type === "FLAT") {
 showToast(`Applied ₱${numericVal.toFixed(2)} item discount ${targetDesc}.`);
 } else if (type === "PERCENT") {
 showToast(`Applied ${numericVal}% item discount ${targetDesc}.`);
 } else if (type === "SENIOR") {
 showToast(`Senior Privilege: Applied 20% Off + VAT Exemption ${targetDesc}!`);
 } else if (type === "PWD") {
 showToast(`PWD Exemption: Applied 20% Off + VAT Exemption ${targetDesc}!`);
 } else if (type === "CONTRACT") {
 showToast(`Contractor Special: Applied 10% Trade Discount ${targetDesc}!`);
 }
 };

 const applyCustomDiscount = (
 type: "NONE" | "FLAT" | "PERCENT" | "SENIOR" | "PWD" | "CONTRACT",
 inputVal?: string,
 ) => {
 const numericVal = parseFloat(inputVal || "0") || 0;
 const targetIdx = selectedDiscountItemIndex;
 const targetSubtotal =
 targetIdx !== null && cart[targetIdx]
 ? (cart[targetIdx].overridePrice ?? getBranchPrice(cart[targetIdx].product)) * cart[targetIdx].quantity
 : subtotal;

 if (type === "FLAT" && (numericVal < 0 || numericVal > targetSubtotal)) {
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
 tempCartItemIndex: targetIdx !== null ? targetIdx : undefined,
 });
 setShowDiscountModal(false);
 setApproverUsername("");
 setApproverPassword("");
 setApprovalError("");
 return;
 }

 executeApplyDiscount(type, numericVal, targetIdx);
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
 const freshBranches = freshDb["tp_branches"] || branches || [];
 const targetBranchId = activePosBranchId || currentUser?.branchAssignmentId || "B1";

 // Validate each item in cart
 for (const item of cart) {
 const serverProd = freshProducts.find((p: any) => p.id === item.product.id) || item.product;
 const serverQty = getBranchStockQuantity(serverProd, targetBranchId, freshBranchStock, freshBranches);
 const effectiveQty = serverQty;

 if (effectiveQty < item.quantity) {
 await syncFromSharedServer();
 setErrorMessage(
 `CONCURRENT STOCK CONFLICT DETECTED: The product "${item.product.productName}" has only ${effectiveQty} units remaining in inventory, but your billing basket requested ${item.quantity}. The transaction has been aborted to prevent inventory deficit. Local stock counters have been synchronized to match server state.`,
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
    customerAddress,
    customerTin,
    businessStyle,
  );
  setPointsToRedeem(0);

 setDeliveryNotes(customerNotes || "");
 setDeliveryCustomerName(customerName || "");
 setPendingSaleForFulfillment(completedInvoice);
 setFulfillmentType("TakeHome");
 setShowFulfillmentModal(true);

 handleCancelSale();
 showToast("Payment Completed. Please assign receipt fulfillment.");
 syncFromSharedServer(true).catch(() => {});
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
 if (activeShift) {
 showToast("An active shift drawer is already open for your account. Please close it first.");
 setShowShiftModal(false);
 setShowCloseShiftModal(true);
 return;
 }
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
 const inputName = customerModalInput.trim() || "Walk-in Customer";
 setCustomerName(inputName);
 setCustomerAddress(customerModalAddressInput.trim());
 setCustomerTin(customerModalTinInput.trim());
 setBusinessStyle(customerModalBusinessStyleInput.trim());
 setCustomerNotes(customerModalNotesInput.trim());
 setShowCustomerModal(false);

 if (
 inputName &&
 inputName.toLowerCase() !== "walk-in customer" &&
 inputName.toLowerCase() !== "walk-in" &&
 !members.some((m) => m.fullName.toLowerCase() === inputName.toLowerCase())
 ) {
 setNewMemberName(inputName);
 setAddMemberError("");
 setShowAddMemberModal(true);
 showToast(`Ticket assigned to "${inputName}". Complete setup to save member profile.`);
 } else {
 showToast(`Ticket assigned to "${inputName}".`);
 }
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
 const totalSubtotal = filteredSales.reduce((acc, s) => acc + (Number(s.subtotal) || 0), 0);
 const totalDiscount = filteredSales.reduce((acc, s) => acc + (Number(s.discount) || 0), 0);
 const totalVat = filteredSales.reduce((acc, s) => acc + (Number(s.vat) || 0), 0);
 const totalGrand = filteredSales.reduce((acc, s) => acc + (Number(s.grandTotal) || 0), 0);

 csv += `"AGGREGATE SUMS STATISTICS"\n`;
 csv += `"Total Base Subtotal","PHP ${(Number(totalSubtotal) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}"\n`;
 csv += `"Total Applied Discounts","PHP ${(Number(totalDiscount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}"\n`;
 csv += `"Total VAT Covered (12%)","PHP ${(Number(totalVat) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}"\n`;
 csv += `"TOTAL REVENUE SETTLED","PHP ${(Number(totalGrand) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}"\n\n`;

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
 (Number(s.subtotal) || 0).toFixed(2),
 (Number(s.discount) || 0).toFixed(2),
 (Number(s.vat) || 0).toFixed(2),
 (Number(s.grandTotal) || 0).toFixed(2),
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

 // Server-side credential verification
 try {
   const res = await fetch("/api/auth/verify-override", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({
       username: approver.username,
       password: approverPassword,
       requiredRole: required
     })
   });
   const data = await res.json();
   if (!res.ok || !data.success) {
     setApprovalError(data.error || "Invalid security credentials password.");
     return;
   }
 } catch (netErr) {
   setApprovalError("Unable to verify security credentials with server.");
   return;
 }

 // Approved! Resolve pending states
 if (pendingApproval?.type === "DISCOUNT") {
 const targetIdx = pendingApproval.tempCartItemIndex !== undefined ? pendingApproval.tempCartItemIndex : null;
 executeApplyDiscount(
 pendingApproval.discountType!,
 pendingApproval.discountValue || 0,
 targetIdx
 );
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

 const {
 containerRef: salesVirtualRef,
 handleScroll: handleSalesVirtualScroll,
 visibleIndices: visibleSalesIndices,
 paddingTop: salesPaddingTop,
 paddingBottom: salesPaddingBottom
 } = useVirtualList({
 itemCount: paginatedSales.length,
 itemHeight: 48
 });

 const ledgerStats = React.useMemo(() => {
 const activeSales = filteredSales.filter(s => !s.isDeleted);
 const voidedSales = filteredSales.filter(s => s.isDeleted);
 const netRevenue = activeSales.reduce((acc, s) => acc + (Number(s.grandTotal) || 0), 0);
 const totalDiscount = activeSales.reduce((acc, s) => acc + (Number(s.discount) || 0), 0);
 const totalVat = activeSales.reduce((acc, s) => acc + (Number(s.vat) || 0), 0);
 return {
 activeCount: activeSales.length,
 voidedCount: voidedSales.length,
 netRevenue,
 totalDiscount,
 totalVat,
 totalCount: filteredSales.length
 };
 }, [filteredSales]);


  const getCleanCashierName = (name?: string, id?: string) => {
    if (name && name.trim()) return name.trim();
    const u = users.find((user) => user.id === id);
    return u?.fullName || "Staff Cashier";
  };

  const renderPosSalesReceipt = () => (
    <div data-receipt-print="true" className="receipt-container px-5 py-5 bg-content1 border border-dashed border-divider/40 rounded-2xl text-[11px] leading-relaxed space-y-3 select-text text-foreground text-left shadow-xs print:border-none print:shadow-none print:p-0 print:text-black">
      <div className="text-center font-bold tracking-tight border-b border-dashed border-divider/30 pb-3 flex flex-col items-center justify-center space-y-1">
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
          <h4 className="text-xs font-black text-primary tracking-widest font-mono uppercase mb-0.5">
            {receiptBranch?.name || branches[0]?.name || localStorage.getItem("tilepoint_company_name_v1") || "MAIN STORE"}
          </h4>
        )}
        
        <div className="text-[9px] text-default-500 font-semibold mt-0.5 leading-tight">
          {receiptBranch?.address || branches[0]?.address || "Store Address"}
        </div>
        
        <div className="text-[8px] text-default-500/80 mt-0.5 font-mono">
          Contact: {receiptBranch?.phone || "0000"} • TIN {formatTin(receiptBranch?.tin) || "000 111 222"}
        </div>

        <div className="inline-block mt-1 bg-primary/10 text-primary border border-primary/30 px-2.5 py-0.5 rounded font-mono font-black text-[9px] uppercase tracking-widest print:bg-black print:text-white">
          OFFICIAL SALES RECEIPT
        </div>
      </div>

      <div className="text-[10px] space-y-1.5 border-b border-dashed border-divider/30 pb-2 font-medium">
        <div className="flex justify-between">
          <span>Invoice Ref:</span>
          <span className="font-mono font-bold text-primary print:text-black">
            {activeReceipt?.saleNumber}
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
          <span className="font-bold">{getCleanCashierName(activeReceipt?.cashierName, activeReceipt?.cashierId)}</span>
        </div>
        <div className="flex justify-between">
          <span>Buyer:</span>
          <span className="font-bold">
            {activeReceipt?.customerName}
          </span>
        </div>
        {activeReceipt?.customerAddress && (
          <div className="flex justify-between">
            <span>Address:</span>
            <span className="font-medium text-right max-w-[65%] truncate">
              {activeReceipt.customerAddress}
            </span>
          </div>
        )}
        {activeReceipt?.customerTin && (
          <div className="flex justify-between">
            <span>Buyer TIN:</span>
            <span className="font-mono font-bold">
              {activeReceipt.customerTin}
            </span>
          </div>
        )}
        {activeReceipt?.businessStyle && (
          <div className="flex justify-between">
            <span>Bus. Style:</span>
            <span className="font-medium">
              {activeReceipt.businessStyle}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-1.5 font-mono text-[9px] border-b border-dashed border-divider/30 pb-2">
        <div className="flex justify-between font-extrabold text-default-500 border-b border-dashed border-divider/20 pb-1">
          <span>Item Details</span>
          <span>Amount</span>
        </div>

        {receiptItems.length > 0 ? (
          <>
            {receiptItems.map((it, idx) => (
              <div
                key={idx}
                className="text-foreground space-y-0.5 pt-1.5 pb-1.5 border-b border-dotted border-divider/10 last:border-0"
              >
                <div className="font-bold text-[9.5px] break-words">
                  {it.productName}
                </div>
                <div className="flex justify-between text-[8.5px] text-default-500">
                  <span>
                    {formatCurrency(it.unitPrice)} x {it.quantity}
                    {(it.discount || 0) > 0 && (
                      <span className="text-amber-600 dark:text-amber-400 font-bold ml-1">
                        (Disc: -{formatCurrency(it.discount!)})
                      </span>
                    )}
                  </span>
                  <span className="font-bold text-foreground">
                    {formatCurrency(it.total)}
                  </span>
                </div>
              </div>
            ))}
            <div className="flex justify-between font-extrabold text-[9.5px] border-t border-dashed border-divider/30 pt-1.5 mt-1 text-foreground">
              <span>Total Items Bought:</span>
              <span className="font-mono text-primary font-black">
                {receiptItems.reduce((sum, item) => sum + (item.quantity || 0), 0)} pcs ({receiptItems.length} {receiptItems.length === 1 ? 'line' : 'lines'})
              </span>
            </div>
          </>
        ) : (
          <p className="text-[9px] text-default-500 italic">
            Hardware ledger invoice saved correctly.
          </p>
        )}
      </div>

      <div className="space-y-1 text-[10px] border-b border-dashed border-divider/30 pb-2 font-mono">
        <div className="flex justify-between text-default-500">
          <span>VATable Sales:</span>
          <span>
            {activeReceipt && (Number(activeReceipt.vat) || 0) > 0
              ? formatCurrency((Number(activeReceipt.grandTotal || activeReceipt.subtotal) || 0) - (Number(activeReceipt.vat) || 0))
              : "₱0.00"}
          </span>
        </div>
        <div className="flex justify-between text-default-500">
          <span>VAT-Exempt Sales:</span>
          <span>
            {activeReceipt && (Number(activeReceipt.vat) || 0) === 0
              ? formatCurrency(activeReceipt.grandTotal || activeReceipt.subtotal)
              : "₱0.00"}
          </span>
        </div>
        <div className="flex justify-between text-default-500">
          <span>Zero-Rated Sales:</span>
          <span>₱0.00</span>
        </div>
        <div className="flex justify-between text-default-500">
          <span>12% Output VAT:</span>
          <span>{formatCurrency(activeReceipt?.vat)}</span>
        </div>
        {activeReceipt && (Number(activeReceipt.discount) || 0) > 0 && (
          <div className="flex justify-between text-primary font-bold">
            <span>BIR Discount Applied:</span>
            <span>-{formatCurrency(activeReceipt.discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-black text-foreground text-xs pt-1 border-t border-dotted border-divider/20">
          <span>GRAND TOTAL DUE:</span>
          <span>{formatCurrency(activeReceipt?.grandTotal)}</span>
        </div>
      </div>

      {(activeReceiptMember || (activeReceipt?.pointsRedeemed || 0) > 0 || (activeReceipt?.pointsEarned || 0) > 0) && (
        <div className="space-y-1 text-[9.5px] border-b border-dashed border-divider/30 pb-2 font-mono text-default-500">
          <div className="font-extrabold text-[9px] text-amber-500 uppercase flex items-center justify-between">
            <span>Customer Loyalty Points</span>
            {activeReceiptMember && (
              <span className="text-[8px] text-default-500 font-sans normal-case font-semibold">
                {activeReceiptMember.fullName}
              </span>
            )}
          </div>
          {(activeReceipt?.pointsEarned || 0) > 0 && (
            <div className="flex justify-between text-emerald-500 font-bold">
              <span>Points Earned This Order:</span>
              <span>+{activeReceipt?.pointsEarned} Pts</span>
            </div>
          )}
          {(activeReceipt?.pointsRedeemed || 0) > 0 && (
            <div className="flex justify-between text-rose-500 font-bold">
              <span>Points Redeemed:</span>
              <span>-{activeReceipt?.pointsRedeemed} Pts (-{formatCurrency((activeReceipt?.pointsRedeemed || 0) * (loyaltyConfig?.pointValueInPhp || 1.0))})</span>
            </div>
          )}
          {activeReceiptMember && (
            <div className="flex justify-between font-black text-amber-500 pt-0.5 border-t border-dotted border-amber-500/20">
              <span>Available Points Balance:</span>
              <span>{activeReceiptMember.points || 0} Pts</span>
            </div>
          )}
        </div>
      )}

      <div className="space-y-1 text-[10px] font-mono text-default-500 font-medium border-t border-dashed border-divider/30 pt-2">
        <div className="flex justify-between items-center">
          <span>Payment Method:</span>
          <span className="text-foreground font-black uppercase bg-primary/10 text-primary px-2 py-0.5 rounded text-[9.5px]">
            {activeReceipt?.paymentMethod || "CASH"}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Amount Tendered:</span>
          <span className="text-foreground font-bold">
            {formatCurrency(activeReceipt?.amountTendered || activeReceipt?.grandTotal)}
          </span>
        </div>
        {activeReceipt && (activeReceipt.changeAmount > 0 || activeReceipt.paymentMethod === "Cash") && (
          <div className="flex justify-between font-extrabold">
            <span>Change:</span>
            <span className="text-emerald-500 font-bold">
              {formatCurrency(activeReceipt.changeAmount)}
            </span>
          </div>
        )}
      </div>

      {(receiptBranch?.receiptFacebook || receiptBranch?.receiptPromoText || receiptBranch?.receiptQrBase64) && (
        <div className="border-t border-dashed border-divider/40 pt-3 mt-3 space-y-3.5">
          {receiptBranch.receiptFacebook && (
            <div className="text-center font-mono text-[8px] text-default-500 flex flex-col items-center justify-center space-y-0.5">
              <span className="font-extrabold uppercase text-primary text-[8.5px] tracking-wide">Follow us on Facebook</span>
              <span className="font-bold text-foreground select-all">{receiptBranch.receiptFacebook}</span>
            </div>
          )}

          {receiptBranch.receiptPromoText && (
            <div className="text-center font-mono text-[8.5px] text-default-500 flex flex-col items-center justify-center space-y-0.5 px-2 bg-content1/30 py-1 rounded">
              <span className="font-extrabold uppercase text-amber-500 text-[8.5px] tracking-wide">Special Offer / Promo</span>
              <p className="leading-snug text-center font-black text-foreground">{receiptBranch.receiptPromoText}</p>
            </div>
          )}

          {receiptBranch.receiptQrBase64 && (
            <div className="flex flex-col items-center justify-center space-y-1.5 pt-1">
              <span className="text-[7.5px] uppercase font-mono font-extrabold text-default-500 tracking-wider">Scan to Answer Survey & Feedback</span>
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

      {(receiptBranch?.receiptReturnPolicy || receiptBranch?.receiptNonReturnablePolicy) && (
        <div className="text-center text-[7.5px] border-t border-dashed border-divider/30 pt-2 space-y-1 font-sans text-default-500">
          {receiptBranch.receiptReturnPolicy && (
            <div>
              <span className="font-extrabold uppercase text-foreground tracking-wider block text-[7px]">Return & Exchange Policy:</span>
              <span>{receiptBranch.receiptReturnPolicy}</span>
            </div>
          )}
          {receiptBranch.receiptNonReturnablePolicy && (
            <div className="italic text-default-500/80">
              <span className="font-extrabold not-italic text-foreground uppercase text-[7px] block">Notice:</span>
              <span>{receiptBranch.receiptNonReturnablePolicy}</span>
            </div>
          )}
        </div>
      )}

      <div className="text-center font-mono text-[7px] text-default-500/70 uppercase tracking-widest pt-3 border-t border-dotted border-divider/30 mt-3.5">
        {receiptBranch?.receiptThankYou ? (
          <span className="font-black text-foreground text-[8px] tracking-tight block mb-1 normal-case font-mono">
            {receiptBranch.receiptThankYou}
          </span>
        ) : (
          `Thank you for shopping at ${receiptBranch?.name || branches[0]?.name || localStorage.getItem("tilepoint_company_name_v1") || "our store"}!`
        )}
        <div className="mt-1 lowercase font-sans text-[7.5px] italic text-default-500">This serves as an official customer transaction acknowledgment.</div>
      </div>
    </div>
  );

   const renderPosDeliveryReceiptCopy = (copyType: "STORE COPY" | "CUSTOMER COPY") => {
     if (!activeReceipt) return null;
     return (
       <div key={copyType} className="border border-gray-300 rounded-lg p-3 bg-white text-black text-[11px] leading-relaxed space-y-2 shadow-xs text-left">
      <div className="text-center pb-2 border-b-2 border-black space-y-1">
        {receiptBranch?.storeLogo ? (
          <div className="mb-1 flex items-center justify-center h-8">
            <img
              src={receiptBranch.storeLogo}
              alt="Logo"
              className="h-full object-contain filter grayscale"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <h4 className="text-xs font-black tracking-wider uppercase font-mono text-black">
            {receiptBranch?.name || branches[0]?.name || localStorage.getItem("tilepoint_company_name_v1") || "MAIN STORE"}
          </h4>
        )}
        <p className="text-[9px] font-semibold text-gray-700">
          {receiptBranch?.address || branches[0]?.address || "Store Address"}
        </p>
        <p className="text-[8px] font-mono text-gray-600">
          Contact: {receiptBranch?.phone || "0000"} | TIN: {receiptBranch?.tin || "000-000-000"}
        </p>
        <div className="flex items-center justify-between pt-1">
          <span className="bg-black text-white px-2 py-0.5 rounded font-mono font-black text-[9px] uppercase tracking-widest">
            DELIVERY RECEIPT
          </span>
          <span className="font-mono font-black text-[8.5px] uppercase tracking-wider px-2 py-0.5 bg-gray-200 text-gray-800 rounded border border-gray-400">
            [{copyType}]
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[9.5px] border-b border-dashed border-gray-400 pb-1.5 font-sans">
        <div>
          <span className="text-[7.5px] font-black uppercase text-gray-500 block">DR Ref / Invoice</span>
          <span className="font-mono font-bold text-black">{activeReceipt.saleNumber}</span>
        </div>
        <div className="text-right">
          <span className="text-[7.5px] font-black uppercase text-gray-500 block">Cashier / Date</span>
          <span className="font-bold text-black">{getCleanCashierName(activeReceipt.cashierName, activeReceipt.cashierId)} • {new Date(activeReceipt.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="bg-gray-50 p-2 rounded border border-gray-200 text-[9.5px] space-y-1">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[7.5px] font-extrabold uppercase text-gray-500 block">Customer Name</span>
            <span className="font-extrabold text-black uppercase">{activeReceipt.customerName || "Walk-in Customer"}</span>
          </div>
          <div>
            <span className="text-[7.5px] font-extrabold uppercase text-gray-500 block">Contact</span>
            <span className="font-mono font-bold text-black">{activeReceiptDelivery?.contactNumber || "N/A"}</span>
          </div>
        </div>
        {activeReceipt.customerAddress && (
          <div className="pt-1 border-t border-gray-200">
            <span className="text-[7.5px] font-extrabold uppercase text-gray-500 block">Billing Address</span>
            <span className="font-semibold text-gray-900 block truncate">{activeReceipt.customerAddress}</span>
          </div>
        )}
        {activeReceipt.customerTin && (
          <div className="pt-1 border-t border-gray-200 flex justify-between">
            <span className="text-[7.5px] font-extrabold uppercase text-gray-500">Buyer TIN:</span>
            <span className="font-mono font-bold text-black">{activeReceipt.customerTin}</span>
          </div>
        )}
        {activeReceiptDelivery && (
          <div className="pt-1 border-t border-gray-200">
            <span className="text-[7.5px] font-extrabold uppercase text-gray-500 block">Unloading Destination</span>
            <span className="font-semibold text-gray-900 block">
              {[activeReceiptDelivery.houseNo, activeReceiptDelivery.street, activeReceiptDelivery.barangay, activeReceiptDelivery.cityMunicipality].filter(Boolean).join(", ")}
            </span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="space-y-1">
        <div className="text-[8px] font-black uppercase text-gray-700 flex justify-between border-b border-black pb-0.5">
          <span>Deliverable Items</span>
          <span>Checklist</span>
        </div>
        <table className="w-full text-left text-[9px]">
          <thead>
            <tr className="border-b border-gray-300 text-[7.5px] uppercase text-gray-600 font-bold">
              <th className="py-0.5">Product</th>
              <th className="py-0.5 text-right">Qty</th>
              <th className="py-0.5 text-center pl-2">Chk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 font-sans">
            {receiptItems.map((it, idx) => (
              <tr key={idx}>
                <td className="py-0.5 font-bold text-black">{it.productName}</td>
                <td className="py-0.5 text-right font-mono font-bold">{it.quantity} pcs</td>
                <td className="py-0.5 text-center pl-2">
                  <span className="inline-block h-2.5 w-2.5 border border-black rounded-xs"></span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-black text-[8.5px] font-black">
              <td className="py-1 text-black">Total Items Bought:</td>
              <td className="py-1 text-right font-mono text-black">
                {receiptItems.reduce((sum, item) => sum + (item.quantity || 0), 0)} pcs ({receiptItems.length} {receiptItems.length === 1 ? 'line' : 'lines'})
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Payment summary */}
      <div className="bg-emerald-50 p-1.5 rounded border border-emerald-300 text-[9px] font-mono flex justify-between items-center">
        <span className="font-bold text-emerald-900">Total: {formatCurrency(activeReceipt.grandTotal)}</span>
        <span className="text-emerald-800">Paid: {formatCurrency(activeReceipt.amountTendered || activeReceipt.grandTotal)}</span>
        <span className="font-extrabold text-emerald-900">Change: {formatCurrency(activeReceipt.changeAmount)}</span>
      </div>

      {/* Receiver Sign-Off */}
      <div className="border-t-2 border-black pt-1.5 space-y-1.5">
        <div className="bg-gray-100 p-1 rounded border border-gray-300 text-[7.5px] font-bold text-center text-gray-800">
          DELIVERY CONFIRMATION: I acknowledge receipt of items in complete quantity and good condition.
        </div>
        <div className="grid grid-cols-2 gap-2 text-center text-[7.5px] pt-1">
          <div>
            <div className="border-b border-black h-4"></div>
            <span className="font-extrabold uppercase text-gray-800 block mt-0.5">Released By (Warehouse)</span>
          </div>
          <div>
            <div className="border-b border-black h-4"></div>
            <span className="font-extrabold uppercase text-black block mt-0.5">Received By (Signature)</span>
            <span className="text-[7px] text-gray-600 block font-mono">Date/Time: ________________</span>
          </div>
        </div>
      </div>
    </div>
  );
};

  const renderCutSeparator = (label: string) => (
    <div key={label} className="bir-receipt-cut-separator relative flex my-3 py-1.5 items-center justify-center text-center">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t-2 border-dashed border-divider/60 print:border-black" />
      </div>
      <div className="relative flex items-center gap-1.5 bg-content2 text-foreground print:bg-white px-3 py-1 rounded-full border border-divider/40 print:border-black shadow-xs font-mono text-[8.5px] font-black uppercase print:text-black">
        <Scissors className="h-3 w-3 text-amber-500 print:text-black shrink-0" />
        <span>AUTO-CUT • {label}</span>
      </div>
    </div>
  );

  const receiptBranch = activeReceipt
 ? (branches?.find((b) => b.id === activeReceipt.branchId) || activeBranch)
 : activeBranch;

 return (
 <div className={`flex flex-col w-full gap-4 ${activeSubModule === "checkout" ? "h-full overflow-y-auto lg:overflow-hidden pb-1" : "min-h-fit overflow-visible"}`}>
 {/* FIX: WRAPPED THE ENTIRE ROW IN A CONDITIONAL BLOCK TO HIDE IT IN POS CHECKOUT MODE */}
 {activeSubModule !== "checkout" && (
 <div className="flex border-b border-divider/20 pb-3.5 items-center justify-between mb-2 text-left sticky top-0 bg-background/90 backdrop-blur-md z-20 pt-2 shadow-sm rounded-b-xl px-2 flex-shrink-0">
 <div>
 <h2 className="text-sm font-black uppercase tracking-widest text-primary pl-1 flex items-center gap-2">
 {(activeSubModule as string) === "checkout" ? (
 <>
 <ShoppingCart className="h-4.5 w-4.5 text-primary" />
 <span>ERP OS TERMINAL CHECKOUT MODE</span>
 </>
 ) : (
 <>
 <History className="h-4.5 w-4.5 text-primary" />
 <span>DAILY SALES LEDGER & VOID TERMINAL (ERP OS)</span>
 </>
 )}
 </h2>
 
 </div>

 <div className="flex items-center gap-3">
 {activeShift ? (
 <div className="flex items-center gap-3 bg-content1 border border-divider/30 p-1.5 pl-3.5 rounded-full shadow-sm">
 <div className="flex flex-col text-right">
 <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
 Shift Active
 </span>
 <span className="text-[10px] font-bold text-foreground font-sans">
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
 <LockKeyhole className="h-3 w-3" />
 <span>Open Shift</span>
 </button>
 )}
 </div>
 </div>
 )}

 {activeSubModule === "checkout" ? (
 <div className="flex-1 min-h-0 flex flex-col justify-between gap-4 w-full overflow-hidden">
      {/* SAFE TRANSACTION COMMIT & HYDRATION RECOVERY BANNER */}
      {showRecoveryBanner && recoveredSession && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-500/40 rounded-2xl p-3.5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-fade-in shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                  Safe Transaction Commit: Abandoned Session Restored
                </span>
 <span className="text-[9.5px] px-2 py-0.5 bg-emerald-200/70 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 rounded-md font-bold">
                  {recoveredSession.lastSavedAt}
                </span>
              </div>
              <p className="text-xs text-emerald-950 dark:text-foreground font-medium mt-0.5">
                Hydration Safeguard recovered an uncommitted POS checkout session with <strong className="text-emerald-800 dark:text-emerald-300">{recoveredSession.itemCount} item(s)</strong> worth <strong className="text-emerald-800 dark:text-emerald-300">₱{recoveredSession.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> for customer <strong className="text-emerald-800 dark:text-emerald-300">"{recoveredSession.customerName}"</strong>.
                {recoveredSession.hasDeliveryDraft && " (Includes active delivery schedule draft)"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
            <button
              type="button"
              onClick={() => {
                setShowRecoveryBanner(false);
                showToast("Uncommitted draft session resumed. Ready for settlement.");
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-black text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Resume Active Cart</span>
            </button>
            <button
              type="button"
              onClick={() => {
                handleCancelSale();
                showToast("Abandoned transaction draft discarded.");
              }}
              className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1"
            >
              <X className="h-3.5 w-3.5" />
              <span>Discard Draft</span>
            </button>
          </div>
        </div>
      )}
 <div className="flex lg:hidden bg-content1 border border-divider/15 p-1 rounded-2xl w-full gap-1 flex-shrink-0">
 <button
 onClick={() => setMobilePosTab("basket")}
 className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
 mobilePosTab === "basket"
 ? "bg-primary text-primary-foreground shadow-sm font-black"
 : "text-default-500 hover:bg-primary/5"
 }`}
 >
 <ShoppingCart className="h-4 w-4" />
 <span>Basket ({cart.length})</span>
 </button>
 <button
 onClick={() => setMobilePosTab("queue")}
 className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 relative ${
 mobilePosTab === "queue"
 ? "bg-primary text-primary-foreground shadow-sm font-black"
 : "text-default-500 hover:bg-primary/5"
 }`}
 >
 <History className="h-4 w-4" />
 <span>Hold Queue ({branchParkedSales.length})</span>
 {branchParkedSales.length > 0 && (
 <span className="absolute -top-1 right-2 bg-rose-500 text-white text-[9px] h-4.5 min-w-[18px] px-1 rounded-full flex items-center justify-center font-black border-2 border-divider shadow">
 {branchParkedSales.length}
 </span>
 )}
 </button>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-fade-in text-foreground items-stretch flex-1 min-h-0 lg:h-full overflow-y-auto lg:overflow-hidden">
 <div
 className={`lg:col-span-4 bg-content1 p-3.5 sm:p-4 rounded-2xl sm:rounded-2xl border border-divider/20 shadow-sm space-y-4 text-left self-stretch flex flex-col h-full overflow-hidden min-h-0 ${
 mobilePosTab === "queue" ? "block" : "hidden lg:flex"
 }`}
 >
 <div className="border-b border-divider/15 pb-2 cursor-default flex-shrink-0">
 <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center justify-between gap-1.5 w-full">
 <div className="flex items-center gap-1.5">
 <span className="relative flex h-2 w-2">
 <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500"></span>
 </span>
 <span>
 Yard Staff Transactions HOLD Queue ({branchParkedSales.length})
 </span>
 </div>
 <div className="flex items-center gap-1.5">
 {syncStatus?.[activePosBranchId || "B1"] === "Syncing" && (
 <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/25 text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full">
 <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
 Syncing
 </span>
 )}
 <button
 type="button"
 onClick={async (e) => {
 e.stopPropagation();
 setIsManualSyncingQueue(true);
 try {
 await syncFromSharedServer(true);
 showToast("Queue state refreshed from central register!");
 } catch (_) {
 showToast("Unable to reach sync server.");
 } finally {
 setTimeout(() => setIsManualSyncingQueue(false), 600);
 }
 }}
 className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 rounded-md text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95"
 title="Force refresh hold queue state from server"
 >
 <RefreshCw className={`h-3 w-3 ${isManualSyncingQueue ? "animate-spin" : ""}`} />
 <span>Sync</span>
 </button>
 </div>
 </h3>
 <p className="text-[10px] text-default-500 font-semibold mt-1 leading-tight">
 Materials staged on-the-floor by floor staff are queued below.
 Select to load basket inside terminal drawer.
 </p>
 </div>

 <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[600px] lg:max-h-none scrollbar-thin">
 {branchParkedSales.length > 0 ? (
 <div className="flex flex-col gap-3">
 {branchParkedSales.map((park) => {
 const isCurrentResuming = resumingParkedId === park.id;
 return (
 <div
 key={park.id}
 onClick={() => !isCurrentResuming && handleResume(park.id)}
 className={`p-3.5 bg-background border border-divider/35 hover:border-primary rounded-2xl flex flex-col justify-between shadow-sm cursor-pointer transition-all group relative overflow-hidden text-left gap-2 ${
 isCurrentResuming ? "opacity-60 pointer-events-none" : ""
 }`}
 >
 <div className="absolute top-0 bottom-0 left-0 w-1 bg-primary" />
 <div>
 <div className="flex items-center justify-between gap-1">
 <div className="text-xs font-extrabold text-foreground leading-snug group-hover:text-primary transition-colors">
 {park.customerName}
 </div>
 {park.heldBy && (
 <span className="text-[9px] font-bold px-1.5 py-0.5 bg-primary/10 text-primary rounded border border-primary/20">
 {park.heldBy}
 </span>
 )}
 </div>
 <p className="text-[10px] text-default-500 mt-1 flex items-center gap-1 font-bold">
 <span>{park.timestamp}</span>
 <span>•</span>
 <span className="text-primary">
 {park.items?.length || 0} tile sets
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
 disabled={isCurrentResuming}
 className="w-full py-1.5 text-[9.5px] font-black uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/95 transition-colors rounded-xl flex items-center justify-center gap-1 cursor-pointer shadow-sm mt-1 disabled:opacity-50"
 >
 {isCurrentResuming ? "Claiming Order..." : "Resume Staged Order \u2192"}
 </button>
 </div>
 );
 })}
 </div>
 ) : (
 <div className="py-10 px-4 text-center text-xs text-default-500 font-bold border border-dashed border-divider/20 rounded-2xl bg-content1 flex flex-col items-center justify-center gap-2 min-h-[180px] h-full">
 <History className="h-5 w-5 text-default-400" />
 <span className="text-default-400 font-medium">
 No staged or parked orders in queue.
 </span>
 </div>
 )}
 </div>

 <div className="border-t border-divider/15 pt-3 mt-auto flex-shrink-0 space-y-2.5">
 <button
 type="button"
 onClick={() => setShortcutsCollapsed(!shortcutsCollapsed)}
 className="flex items-center justify-between w-full hover:bg-content3/15 p-1.5 rounded-xl transition-all cursor-pointer text-left"
 >
 <span className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5 font-sans">
 <Keyboard className="h-3.5 w-3.5 text-primary" />
 <span>Checkout Hotkeys</span>
 </span>
 <div className="flex items-center gap-2">
 <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-black uppercase tracking-wider ">
 Active Hotkeys
 </span>
 {shortcutsCollapsed ? (
 <ChevronDown className="h-4 w-4 text-primary transition-transform duration-200" />
 ) : (
 <ChevronUp className="h-4 w-4 text-primary transition-transform duration-200" />
 )}
 </div>
 </button>

 {!shortcutsCollapsed && (
 <div className="space-y-2.5 animate-fade-in">
 <div className="grid grid-cols-2 gap-2">
 {[
 { key: "F1", desc: "Void Current Sale", action: () => handleCancelSale(), bg: "hover:bg-rose-500/10 hover:border-rose-500/30 text-rose-600 dark:text-rose-400" },
 { key: "F2", desc: "Focus Search Catalog", action: () => handleFocusSearch(), bg: "hover:bg-primary/10 hover:border-primary/30 text-primary" },
 { key: "F3", desc: "Hold Order Stash", action: () => handleHold(), bg: "hover:bg-amber-500/10 hover:border-amber-500/30 text-amber-600 dark:text-amber-400" },
 { key: "F4", desc: "View Parked Sales", action: () => handleViewParkedSales(), bg: "hover:bg-primary/10 hover:border-primary/30 text-primary" },
 { key: "F5", desc: "Assign Customer Details", action: () => { setCustomerModalInput(customerName); setCustomerModalAddressInput(customerAddress); setCustomerModalTinInput(customerTin); setCustomerModalBusinessStyleInput(businessStyle); setCustomerModalNotesInput(customerNotes); setShowCustomerModal(true); }, bg: "hover:bg-primary/10 hover:border-primary/30 text-primary" },
 { key: "F6", desc: "Apply Code/Discount", action: () => { setDiscountInput(""); setShowDiscountModal(true); }, bg: "hover:bg-teal-500/10 hover:border-teal-500/30 text-teal-600 dark:text-teal-400" },
 { key: "F7", desc: "Pay / Settle Sale", action: () => handlePaySettleSale(), bg: "hover:bg-emerald-500/10 hover:border-emerald-500/30 text-emerald-600 dark:text-emerald-400" },
 { key: "F8", desc: "Reprint Last Receipt", action: () => handleReprintLastReceipt(), bg: "hover:bg-purple-500/10 hover:border-purple-500/30 text-purple-600 dark:text-purple-400" },
 { key: "F9/10", desc: "Shift Active Controls", action: () => {
 if (activeShift) {
 setCloseShiftCashInput("");
 setShowCloseShiftModal(true);
 } else {
 setShowShiftModal(true);
 }
 }, bg: "hover:bg-secondary/10 hover:border-secondary/30 text-secondary" }
 ].map((sh, index) => (
 <button
 key={index}
 type="button"
 onClick={sh.action}
 className={`flex items-center gap-2 p-2 bg-background border border-divider/15 rounded-xl text-left transition-all active:scale-[0.98] group cursor-pointer ${sh.bg}`}
 >
 <kbd className="px-1.5 py-0.5 text-[9px] font-black bg-content3/60 text-foreground border border-divider/30 rounded shadow-sm group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-colors flex-shrink-0">
 {sh.key}
 </kbd>
 <span className="text-[10px] font-bold tracking-tight text-default-500 leading-tight truncate">
 {sh.desc}
 </span>
 </button>
 ))}
 </div>
 <p className="text-[8.5px] text-default-500 text-center ">
 Press physical keys directly, or click above as interactive speed dials.
 </p>
 </div>
 )}
 </div>
 </div>

 <div
 className={`lg:col-span-8 text-left h-full flex flex-col overflow-hidden min-h-0 ${
 mobilePosTab === "basket" ? "block" : "hidden lg:flex"
 }`}
 >
 <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-2xl border border-divider/35 bg-content1 shadow-sm flex flex-col h-full overflow-hidden min-h-0">
 <div className="flex-shrink-0 space-y-2.5">
 <div className="border-b border-divider/15 pb-2">
 <div className="flex flex-wrap items-center justify-between gap-2 pl-1 mb-1">
 <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
 <ShoppingCart className="h-4 w-4" />
 <span>Active Order list of materials</span>
 {syncStatus?.[activePosBranchId || "B1"] === "Syncing" && (
 <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/25 text-[9px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded-full ml-1.5">
 <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
 Syncing
 </span>
 )}
 </h3>
 <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] font-black uppercase tracking-wide">
 <button
 type="button"
 onClick={() => setShowTileCalculatorModal(true)}
 className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9.5px]"
 title="Open Tile Coverage Calculator"
 >
 <Calculator className="h-3.5 w-3.5 text-primary" />
 <span>Tile Calculator</span>
 </button>
 <span className="text-default-500">•</span>
 <button
 type="button"
 onClick={() => {
 setCustomerModalInput(customerName);
 setCustomerModalAddressInput(customerAddress);
 setCustomerModalTinInput(customerTin);
 setCustomerModalBusinessStyleInput(businessStyle);
 setCustomerModalNotesInput(customerNotes);
 setShowCustomerModal(true);
 }}
 className="text-primary hover:text-primary/85 flex items-center gap-1.5 cursor-pointer transition-colors px-2.5 py-1 bg-primary/10 border border-primary/25 rounded-full text-[9.5px]"
 title="Assign Customer Profile & Project Note (F5)"
 >
 <Users className="h-3.5 w-3.5 text-primary" />
 <span className="max-w-[130px] truncate">{customerName && customerName !== "Walk-in Customer" ? customerName : "Walk-in Buyer"}</span>
 <span className="text-[8px] bg-primary text-black px-1 rounded font-black">F5</span>
 </button>
 <span className="text-default-500">•</span>
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

 {!products.some((p) => !p.isDeleted) ? (
 <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-left font-sans shadow-inner">
 <div className="flex items-center gap-2 text-amber-500 font-extrabold text-xs uppercase tracking-wider mb-1">
 <span className="text-sm"></span> Scanner Locked / Catalog Empty
 </div>
 <p className="text-[10.5px] text-default-500 font-medium leading-relaxed">
 The Rapid Barcode Laser Scanner is inactive because there are no products in the inventory catalog. Please navigate to the <strong className="text-primary font-bold">Inventory Module</strong> to add or import tile products first.
 </p>
 </div>
 ) : (
 <form
 onSubmit={handleBarcodeSubmit}
 className="bg-content1 border border-primary/15 hover:border-primary/35 p-2.5 rounded-2xl transition-all relative"
 >
 <div className="flex flex-col md:flex-row gap-2 items-end">
 <div className="flex-1 w-full text-left">
 <label className="text-[9px] font-black text-primary uppercase tracking-widest pl-1 block mb-1.5">
 Rapid Barcode Laser Scanner / Item SKU Input
 </label>
 <div className="relative font-sans flex items-center">
 <input ref={searchInputRef}
 type="text"
 value={barcodeSearchTerm ?? ''}
 onChange={(e) =>
 setBarcodeSearchTerm(e.target.value)
 }
 placeholder="Type product name, SKU, or custom design and press Enter..."
 className="w-full bg-content1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 border border-divider/30 pl-3.5 pr-24 py-1.5 rounded-xl placeholder-zinc-500 font-bold h-9 shadow-inner"
 />
 <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-auto">
 {barcodeSearchTerm && (
 <button
 type="button"
 onClick={() => setBarcodeSearchTerm("")}
 className="text-default-500 hover:text-rose-500 text-xs font-black p-0.5 rounded-full hover:bg-default-100 transition-colors cursor-pointer"
 title="Clear search"
 >
 ✕
 </button>
 )}
 <span className="px-1.5 py-0.5 rounded-md bg-background border border-divider/30 text-default-500 text-[9px] font-extrabold uppercase select-none tracking-wider shadow-2xs pointer-events-none">
 ↵ Enter
 </span>
 </div>

 {barcodeSearchTerm.trim().length > 0 && (
 <div className="absolute left-0 right-0 mt-2 bg-content1 border border-divider/60 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-divider/20 text-xs max-h-[180px] overflow-y-auto">
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
 <div className="p-4 text-center text-default-500 font-bold text-xs italic">
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
 className="p-2.5 hover:bg-primary/10 cursor-pointer flex justify-between items-center transition-colors text-left"
 >
 <div className="space-y-0.5">
 <div className="font-extrabold text-foreground text-xs">
 {p.productName}
 </div>
 <div className="text-[10px] text-default-500 font-bold">
 SKU: {p.sku} • Stock: {p.stockQuantity}
 </div>
 </div>
 <div className="text-right font-black text-emerald-600 dark:text-emerald-400 text-xs">
 ₱
 {(Number(getBranchPrice(p)) || 0).toLocaleString(
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
 className="w-full md:w-auto px-4 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shrink-0 transition-all flex items-center gap-1.5 h-9 shadow-sm justify-center active:scale-95"
 >
 SKU Scan
 </button>
 </div>
 </form>
 )}
 </div>

 <div className="flex-1 h-0 overflow-auto my-3 pr-1 space-y-1.5 border border-divider/10 rounded-2xl p-2.5 bg-background/20 scrollbar-thin"><div className="min-w-[550px] w-full pb-1">
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
 className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 py-2.5 border-b border-divider/10 last:border-0 pl-1 overflow-hidden"
 >
 <div className="space-y-1 text-left w-full sm:w-auto">
 <h5 className="text-sm font-black leading-tight text-foreground">
 {item.product.productName}
 </h5>
 <div className="text-xs text-default-500 flex flex-wrap items-center gap-1.5 font-bold">
 {item.overridePrice !== undefined ? (
 <>
 <span className="text-default-500 line-through text-xs">
 {formatCurrency(getBranchPrice(item.product))}
 </span>
 <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md shadow-2xs">
 {formatCurrency(item.overridePrice)}
 </span>
 </>
 ) : (
 <span className="text-default-500 text-xs">
 {formatCurrency(getBranchPrice(item.product))}
 </span>
 )}
 <span>/{item.product.unit}</span>
 <span>•</span>
 <span className="text-primary text-xs">
 SKU: {item.product.sku}
 </span>
 <span>•</span>
 <button
 type="button"
 onClick={() => handleTriggerPriceOverride(idx)}
 className="text-[11px] font-extrabold text-primary hover:bg-primary/20 bg-primary/10 border border-primary/30 px-2.5 py-1 rounded-md transition-colors uppercase cursor-pointer"
 >
 Override Price
 </button>
 <span>•</span>
 <button
 type="button"
 onClick={() => {
 setSelectedDiscountItemIndex(idx);
 setShowDiscountModal(true);
 }}
 className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-md transition-colors uppercase cursor-pointer"
 >
 {item.discountType && item.discountType !== "NONE" ? `Disc: ${item.discountType}` : "Discount"}
 </button>
 {(() => {
 const itemDetail = cartItemDetails[idx];
 if (itemDetail && itemDetail.itemDiscount > 0) {
 return (
 <>
 <span>•</span>
 <span className="text-[11px] font-black text-amber-700 dark:text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-md border border-amber-500/40 shadow-2xs">
 -₱{itemDetail.itemDiscount.toFixed(2)} OFF
 </span>
 </>
 );
 }
 return null;
 })()}
 {item.quantity < 0 && (
 <>
 <span>•</span>
 <span className="text-[10px] font-black uppercase text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 shrink-0">
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
 <div className="flex items-center border border-divider rounded-lg overflow-hidden shrink-0 bg-background">
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
 className="px-2 py-0.5 hover:bg-default-100 text-xs font-bold text-foreground cursor-pointer"
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
 className="px-2 py-0.5 hover:bg-default-100 text-xs font-bold text-foreground cursor-pointer"
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
 className={`px-1.5 py-0.5 text-[10px] font-black border-l border-divider/30 cursor-pointer transition-colors ${
 item.quantity < 0
 ? "bg-rose-500/20 text-rose-500 hover:bg-rose-500/30"
 : "text-default-500 hover:text-primary hover:bg-default-100"
 }`}
 >
 +/-
 </button>
 </div>
 );
 })()}

 <div className="flex items-center gap-3">
 <span className="text-xs font-black min-w-[80px] text-right text-foreground">
 ₱
 {(
 (Number(item.overridePrice !== undefined && item.overridePrice !== null
 ? item.overridePrice
 : getBranchPrice(item.product)) * (item.quantity || 1)) || 0
 ).toLocaleString(undefined, {
 minimumFractionDigits: 2,
 })}
 </span>
 <button
 type="button"
 onClick={() => removeFromCart(item.product.id)}
 className="text-default-500 hover:text-red-500 p-1 rounded-full hover:bg-red-500/10 transition-colors"
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </div>
 </div>
 </motion.div>
 ))}
 </AnimatePresence>

 {cart.length === 0 && (
 <div className="text-center py-12 text-default-500 text-xs flex flex-col items-center justify-center gap-2 font-bold min-h-[160px] h-full">
 <ShoppingCart className="h-8 w-8 text-primary/30" />
 <span className="max-w-xs leading-relaxed text-default-500">
 Active Cashier billing basket is empty. Select a staged
 ticket from the hold queue to begin.
 </span>
 <button
 type="button"
 onClick={() => setShowTileCalculatorModal(true)}
 className="mt-3 py-2 px-4 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-[10.5px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
 >
 <Calculator className="h-4 w-4 text-primary" />
 <span>Open Tile Calculator</span>
 </button>
 </div>
 )}
 </div>
 </div>

 <div className="flex-shrink-0 border-t border-divider/20 pt-3 grid grid-cols-1 xl:grid-cols-12 gap-5">
 <div className="xl:col-span-5 xl:space-y-1 pt-0.5">
 <div className="flex justify-between text-xs font-bold text-default-500">
 <span>
 {discountType === "SENIOR" || discountType === "PWD"
 ? "VAT-Exempt Sales"
 : "VATable Sales (Net)"}
 </span>
 <span className="">{formatCurrency(grandTotal - vat)}</span>
 </div>
 <div className="flex justify-between text-xs font-bold text-default-500 mt-0.5">
 <span>
 {discountType === "SENIOR" || discountType === "PWD"
 ? "12% Output VAT (Exempt)"
 : "12% Output VAT"}
 </span>
 <span className="">{formatCurrency(vat)}</span>
 </div>

 {discountAmount > 0 && (
 <div className="flex justify-between text-xs font-black text-emerald-500 mt-0.5">
 <span>Discount Voucher Applied</span>
 <span className="">
 -{formatCurrency(discountAmount)}
 </span>
 </div>
 )}

 <div className="flex justify-between text-sm font-black border-t border-dashed border-divider/30 pt-2 mt-1.5">
 <span className="text-foreground text-xs uppercase tracking-wide">
 GRAND TOTAL DUE
 </span>
 <span className=" text-primary text-lg font-extrabold">
 ₱
 {(Number(grandTotal) || 0).toLocaleString(undefined, {
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
 className="w-full mt-2.5 flex items-center justify-center gap-2 text-xs py-2 px-3 bg-primary/10 hover:bg-primary/20 text-primary font-extrabold rounded-xl border border-primary/30 uppercase tracking-wider transition-colors cursor-pointer shadow-2xs"
 >
 <Sparkles className="h-3.5 w-3.5" /> Apply Cardholder Discount
 (F6)
 </button>
 </div>

 <div
 id="checkout-action-panel"
 className="xl:col-span-7 bg-background p-3.5 rounded-2xl border border-divider/35 space-y-2.5 shadow-inner text-left"
 >
 <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
 <div className="sm:col-span-6 space-y-1">
 <label className="text-[9px] font-black text-primary uppercase tracking-widest pl-1 block">
 Settlement Method
 </label>
 <div className="grid grid-cols-3 gap-1.5">
 {(
    [
      { name: `Cash`, label: `Cash`, color: `border-emerald-500/25 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5`, activeColor: `bg-emerald-600 border-emerald-600 text-white` },
      { name: `GCash`, label: `GCash`, color: `border-sky-500/25 text-sky-600 dark:text-sky-400 bg-sky-500/5`, activeColor: `bg-sky-600 border-sky-600 text-white` },
      { name: `Maya`, label: `Maya`, color: `border-green-500/25 text-green-600 dark:text-green-400 bg-green-500/5`, activeColor: `bg-green-600 border-green-600 text-white` },
      { name: `Card / Bank Terminal`, label: `Card / Bank Terminal`, color: `border-violet-500/25 text-violet-600 dark:text-violet-400 bg-violet-500/5`, activeColor: `bg-violet-600 border-violet-600 text-white` },
      { name: `Member Credit`, label: `Member`, color: `border-primary/25 text-primary bg-primary/5`, activeColor: `bg-primary border-primary text-white` },
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
          : `bg-content1 border-divider/40 hover:bg-default-100 ${method.color}`
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
 <label className="text-[9px] font-black text-primary uppercase tracking-widest pl-1 block">
 Amount Tendered (PHP)
 </label>
 <input
 id="cash-tendered-field"
 type="number"
 disabled={paymentMethod !== "Cash"}
 value={amountTendered ?? ''}
 onChange={(e) => setAmountTendered(e.target.value)}
 placeholder={grandTotal.toFixed(0)}
 className="w-full bg-content1 border-b-2 border-divider px-3 py-1.5 text-xs text-foreground font-bold focus:outline-none focus:border-primary transition-colors disabled:opacity-45 disabled:cursor-not-allowed rounded-lg"
 />


 </div>
 </div>

{paymentMethod !== "Cash" && paymentMethod !== "Member Credit" && (
        <div className="p-3 bg-content1 border border-divider/30 rounded-xl space-y-2 mt-2 font-sans animate-fade-in text-xs text-left">
          {/* Verification Reference Number Field */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[9px] font-black text-primary uppercase tracking-widest pl-1 block">
                {paymentMethod === "Card / Bank Terminal" ? "Receipt Reference / Approval No." : "Payment Reference Number"}
              </label>
            </div>
            <div className="relative">
              <input
                type="text"
                value={paymentRef ?? ''}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder={
                  paymentMethod === "Card / Bank Terminal"
                    ? "Enter printed receipt reference or card approval code"
                    : `Enter 13-digit reference number from ${paymentMethod} payment`
                }
 className="w-full bg-content1 border border-divider/60 rounded-lg px-3 py-1.5 text-xs text-foreground font-bold focus:outline-none focus:border-primary transition-all"
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
 <div className="p-1.5 px-3 bg-secondary-50 border border-secondary/25 text-secondary-700 rounded-lg flex justify-between items-center text-xs font-extrabold animate-fade-in mb-1">
 <span className="text-[9px] font-bold uppercase tracking-wider">
 CHANGE DISPENSE:
 </span>
 <span className="text-xs">
 {formatCurrency(changeAmount)}
 </span>
 </div>
 )}

				{(paymentMethod === "Member Credit" || (customerName && !customerName.toLowerCase().startsWith("walk-in") && members.some(m => m.fullName.toLowerCase() === customerName.toLowerCase()))) && (() => {
					const isWalkInName = !customerName || customerName.trim().toLowerCase().startsWith("walk-in");
					const matchingMember = !isWalkInName ? members.find(
						(m) => m.fullName.toLowerCase() === customerName.toLowerCase()
					) : undefined;
					const spendPerPt = loyaltyConfig?.spendPerPoint || 500;
					const ptValPhp = loyaltyConfig?.pointValueInPhp || 1.0;
					const netAmountForPts = Math.max(0, grandTotal - (pointsToRedeem * ptValPhp));
					const projectedEarnedPts = (!isWalkInName && loyaltyConfig?.enabled && spendPerPt > 0 && netAmountForPts > 0)
						? Math.floor(netAmountForPts / spendPerPt) * (loyaltyConfig?.pointsPerSpend || 1)
						: 0;

					return (
						<div className="p-3 bg-content1 border border-divider/30 rounded-xl space-y-2 mt-2 font-sans animate-fade-in text-xs text-left">
							<div className="flex items-center justify-between font-bold text-[11px] text-primary uppercase tracking-wider">
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
										className="px-2 py-0.5 bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
									>
										<UserPlus className="h-3 w-3" />
										<span>+ Member</span>
									</button>
								</div>
							</div>

							{matchingMember ? (
								<div className="space-y-2">
									<div className="space-y-1 bg-content1 p-2.5 rounded-lg border border-divider/15">
										<div className="flex justify-between items-center">
											<span className="text-default-500 dark:text-default-500">Account:</span>
											<span className="font-extrabold text-foreground">{matchingMember.fullName}</span>
										</div>

										{paymentMethod === "Member Credit" && (
											<>
												<div className="flex justify-between items-center text-[11px]">
													<span className="text-default-500 dark:text-default-500">Credit Limit:</span>
													<span className=" font-bold text-foreground">₱{(Number(matchingMember.creditLimit) || 0).toLocaleString()}</span>
												</div>
												<div className="flex justify-between items-center text-[11px]">
													<span className="text-default-500 dark:text-default-500">Outstanding Debt:</span>
													<span className=" font-bold text-amber-500">₱{(Number(matchingMember.outstandingBalance) || 0).toLocaleString()}</span>
												</div>
												<div className="border-t border-divider/10 my-1 pt-1 flex justify-between items-center">
													<span className="font-bold text-default-500 dark:text-default-500">Available Credit:</span>
													<span className={` font-black ${(Number(matchingMember.creditLimit) || 0) - (Number(matchingMember.outstandingBalance) || 0) >= grandTotal ? 'text-emerald-500' : 'text-rose-500'}`}>
														₱{((Number(matchingMember.creditLimit) || 0) - (Number(matchingMember.outstandingBalance) || 0)).toLocaleString()}
													</span>
												</div>
											</>
										)}

										{matchingMember.status !== "Active" ? (
											<div className="text-[10px] text-rose-500 font-bold bg-rose-500/10 p-1 px-2 rounded mt-1 border border-rose-500/20">
												Account is suspended.
											</div>
										) : paymentMethod === "Member Credit" && matchingMember.creditLimit - matchingMember.outstandingBalance < grandTotal ? (
											<div className="text-[10px] text-rose-500 font-bold bg-rose-500/10 p-1 px-2 rounded mt-1 border border-rose-500/20">
												Purchase exceeds available credit limit.
											</div>
										) : null}
									</div>

									{/* COMPACT LOYALTY POINTS DISPLAY */}
									<div className="bg-content1 p-2 rounded-lg border border-divider/20 space-y-1.5 text-xs">
										<div className="flex items-center justify-between text-[11px]">
											<span className="text-default-500 font-medium">
												Available Points: <strong className="text-amber-500 ">{matchingMember.points || 0}</strong>
												{projectedEarnedPts > 0 && (
													<span className="text-emerald-500 text-[10.5px] ml-1.5 font-bold">
														(+{projectedEarnedPts} earned)
													</span>
												)}
											</span>
											{(matchingMember.points || 0) > 0 && (
												<span className="text-[10px] text-default-500">
													(₱{((matchingMember.points || 0) * ptValPhp).toFixed(2)})
												</span>
											)}
										</div>

										{/* Point Redemption Input */}
										{(matchingMember.points || 0) > 0 && grandTotal > 0 && (
											<div className="flex items-center gap-1.5 pt-1 border-t border-divider/15">
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
													className="w-full bg-content3 border border-divider/30 rounded-md px-2 py-1 text-xs font-bold text-foreground focus:outline-none focus:border-amber-500"
												/>
												<button
													type="button"
													onClick={() => {
														const maxAllowed = Math.min(matchingMember.points || 0, Math.floor(grandTotal / ptValPhp));
														setPointsToRedeem(maxAllowed);
													}}
													className="px-2 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 text-[10px] font-extrabold rounded cursor-pointer whitespace-nowrap transition-colors"
												>
													Max
												</button>
												{pointsToRedeem > 0 && (
													<button
														type="button"
														onClick={() => setPointsToRedeem(0)}
														className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-[10px] font-bold rounded cursor-pointer transition-colors"
													>
														Clear
													</button>
												)}
												{pointsToRedeem > 0 && (
													<span className="text-[10px] font-bold text-emerald-500 whitespace-nowrap">
														-₱{(pointsToRedeem * ptValPhp).toFixed(2)}
													</span>
												)}
											</div>
										)}
									</div>
								</div>
							) : (
								<div className="space-y-1.5">
									<div className="text-[10px] text-default-500 font-bold uppercase tracking-wider px-1">
										Select Active Member Account:
									</div>
									<div className="max-h-36 overflow-y-auto space-y-1 border border-divider/15 rounded-lg p-1 bg-content1">
										{members.filter(m => m.status === "Active").map((m) => (
											<button
												type="button"
												key={m.id}
												onClick={() => {
													setCustomerName(m.fullName);
												}}
												className="w-full text-left p-1.5 px-2 hover:bg-primary/10 rounded text-[11px] font-bold text-foreground flex justify-between items-center cursor-pointer border-0 bg-transparent transition-colors"
											>
												<span>{m.fullName}</span>
												<span className=" text-[10px] text-amber-500">{m.points || 0} pts | Ceiling: ₱{(Number(m?.creditLimit) || 0).toLocaleString()}</span>
											</button>
										))}
										{members.filter(m => m.status === "Active").length === 0 && (
											<p className="text-center p-2 text-default-500 dark:text-default-500 text-[10px] italic">No active corporate members found.</p>
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
 className="px-3.5 py-2.5 sm:py-1.5 min-h-[42px] bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider border border-zinc-700 shadow-sm cursor-pointer transition-all shrink-0"
 >
 Cancel
 </button>
 <button
 type="button"
 disabled={cart.length === 0 || isCheckingOut}
 onClick={clientCheckout}
 className="flex-1 py-2.5 sm:py-1.5 min-h-[42px] bg-primary hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-xs font-black uppercase tracking-widest rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
 >
 {isCheckingOut ? (
 <>
 <Loader2 className="h-3 w-3 animate-spin text-primary-foreground" />
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
 <div className="flex-1 min-h-0 border border-divider/30 rounded-2xl bg-content1 p-5 sm:p-6 text-left flex flex-col gap-6 animate-fade-in shadow-lg overflow-visible">
 
 {/* Title Section */}
 <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-divider/20 pb-4 gap-4">
 <div>
 <h3 className="text-sm font-black text-rose-500 flex items-center gap-2 uppercase tracking-widest pl-1 ">
 <LockKeyhole className="h-5 w-5 text-rose-500" />
 <span>Corporate Daily Sales Ledger & Void Terminal</span>
 </h3>
 </div>
 
 {/* Actions & Controls in header */}
 <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
 <button
 type="button"
 onClick={() => setIsStatsCollapsed(!isStatsCollapsed)}
 className="flex items-center justify-center gap-2 px-3.5 py-2 bg-background hover:bg-content3 border border-divider/40 text-primary text-[11px] font-sans font-black uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer shrink-0"
 title="Toggle statistics visibility"
 >
 {isStatsCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
 <span>{isStatsCollapsed ? "Show Stats" : "Hide Stats"}</span>
 </button>

 <button
 type="button"
 onClick={handleExportLedgerToExcel}
 className="flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-sans font-black uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer border-0 shrink-0"
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
 <div className="bg-background border border-divider/15 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
 <span className="text-[10px] text-default-500 font-black uppercase tracking-wider ">Net Settled Revenue</span>
 <div className="mt-2 flex items-baseline gap-1">
 <span className="text-lg font-black text-emerald-500 ">
 ₱{(Number(ledgerStats?.netRevenue) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
 </span>
 </div>
 <span className="text-[9px] text-default-500 font-bold font-sans mt-1">Excludes voided invoices</span>
 </div>

 {/* Stat 2: Active Tickets */}
 <div className="bg-background border border-divider/15 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
 <span className="text-[10px] text-default-500 font-black uppercase tracking-wider ">Settled Sales</span>
 <div className="mt-2 flex items-baseline gap-1">
 <span className="text-lg font-black text-primary ">{ledgerStats.activeCount}</span>
 <span className="text-xs text-default-500 font-bold font-sans"> invoices</span>
 </div>
 <span className="text-[9px] text-default-500 font-bold font-sans mt-1">Completed settlements</span>
 </div>

 {/* Stat 3: Total Discounts */}
 <div className="bg-background border border-divider/15 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
 <span className="text-[10px] text-rose-500 font-black uppercase tracking-wider ">Discounts Deducted</span>
 <div className="mt-2 flex items-baseline gap-1">
 <span className="text-lg font-black text-rose-500 ">
 ₱{(Number(ledgerStats?.totalDiscount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
 </span>
 </div>
 <span className="text-[9px] text-default-500 font-bold font-sans mt-1">Promotional markdowns</span>
 </div>

 {/* Stat 4: Voided count */}
 <div className="bg-background border border-divider/15 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
 <span className="text-[10px] text-rose-500 font-black uppercase tracking-wider ">Voided &amp; Reclaimed</span>
 <div className="mt-2 flex items-baseline gap-1">
 <span className="text-lg font-black text-amber-500 ">{ledgerStats.voidedCount}</span>
 <span className="text-xs text-default-500 font-bold font-sans"> tickets</span>
 </div>
 <span className="text-[9px] text-default-500 font-bold font-sans mt-1">Reversed stock quantities</span>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Refactored Filter Controls Deck Card */}
 <div className="bg-background/60 border border-divider/20 rounded-2xl p-4">
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
 
 {/* Search Field */}
 <div className="flex flex-col gap-1.5">
 <span className="text-[10px] text-default-500 font-black uppercase tracking-wider ">Search ledger</span>
 <div className="relative">
 <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-default-500" />
 <input
 type="text"
 value={ledgerSearchQuery ?? ''}
 onChange={(e) => {
 setLedgerSearchQuery(e.target.value);
 setSalesPage(1);
 }}
 placeholder="Search invoice, customer, payment..."
 className="w-full bg-background border border-divider/40 focus:border-primary pl-9 pr-8 py-2 text-[11px] font-sans font-black text-zinc-200 placeholder-zinc-500 rounded-xl outline-none focus:ring-1 focus:ring-primary transition-all shadow-sm"
 />
 {ledgerSearchQuery && (
 <button
 type="button"
 onClick={() => {
 setLedgerSearchQuery("");
 setSalesPage(1);
 }}
 className="absolute right-2.5 top-2.5 text-default-500 hover:text-default-500 border-0 bg-transparent cursor-pointer"
 >
 <X className="h-3.5 w-3.5" />
 </button>
 )}
 </div>
 </div>

 {/* Payment Filter */}
 <div className="flex flex-col gap-1.5">
 <span className="text-[10px] text-default-500 font-black uppercase tracking-wider flex items-center gap-1.5">
 <span className="h-2 w-2 bg-primary rounded-full" />
 <span>Payment Method</span>
 </span>
 <select
 value={ledgerPaymentFilter ?? ''}
 onChange={(e) => {
 setLedgerPaymentFilter(e.target.value);
 setSalesPage(1);
 }}
 className="w-full text-[11px] font-sans font-black bg-background border border-divider/40 focus:border-primary px-3 py-2 rounded-xl text-primary focus:outline-none uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
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
 <span className="text-[10px] text-default-500 font-black uppercase tracking-wider flex items-center gap-1.5">
 <Calendar className="h-3.5 w-3.5 text-primary" />
 <span>Go to Date</span>
 </span>
 <div className="relative flex items-center gap-1">
 <input
 type="date"
 value={ledgerDateFilter ?? ''}
 onChange={(e) => {
 setLedgerDateFilter(e.target.value);
 setSalesPage(1);
 }}
 className="w-full text-[11px] font-sans font-black bg-background border border-divider/40 focus:border-primary px-3 py-1.5 rounded-xl text-primary focus:outline-none uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
 />
 {ledgerDateFilter && (
 <button
 type="button"
 onClick={() => {
 setLedgerDateFilter("");
 setSalesPage(1);
 }}
 className="absolute right-2 top-2.5 p-0.5 bg-zinc-800 hover:bg-zinc-700 text-default-500 hover:text-zinc-200 rounded transition-colors border-0 cursor-pointer flex items-center justify-center"
 title="Clear Date"
 >
 <X className="h-3 w-3" />
 </button>
 )}
 </div>
 </div>

 </div>
 </div>

 <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-divider/20 shadow-inner bg-background overflow-hidden">
 <div ref={salesVirtualRef} onScroll={handleSalesVirtualScroll} className="overflow-auto scrollbar-thin scrollbar-thumb-divider h-[58vh] md:h-[64vh] lg:h-[68vh] min-h-[380px]">
 <table className="w-full text-left border-collapse table-auto text-xs min-w-[1000px] font-sans">
 <thead>
 <tr className="border-b border-divider/30 bg-background/30 text-[9px] uppercase font-black text-default-500 tracking-wider">
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
 <tbody className="divide-y divide-divider/10 text-[11px] text-default-500">
 {filteredSales.length === 0 ? (
 <tr>
 <td
 colSpan={9}
 className="py-12 text-center text-default-500 font-sans font-bold"
 >
 {ledgerSearchQuery
 ? `No matching sales invoice ledgers found for "${ledgerSearchQuery}".`
 : "No matching sales invoice ledgers recorded today."}
 </td>
 </tr>
 ) : (
 <>
 {salesPaddingTop > 0 && (
 <tr style={{ height: salesPaddingTop }}>
 <td colSpan={9} className="p-0 border-0" />
 </tr>
 )}
 {visibleSalesIndices.map((vIdx) => {
 const s = paginatedSales[vIdx];
 if (!s) return null;
 return (
 <tr
 key={s.id || vIdx}
 onClick={() => setSelectedSaleDetail(s)}
 className={`hover:bg-content1/90 hover:text-white cursor-pointer transition-colors font-bold ${s.isDeleted ? "bg-red-500/5 text-default-500 line-through decoration-rose-500" : ""}`}
 title="Click to view full transaction invoice ledger details"
 >
 <td className="py-3 px-4 text-primary font-black uppercase hover:underline">
 {s.saleNumber}
 </td>
 <td
 className="py-3 px-4 text-zinc-550 font-sans font-medium hover:text-primary"
 title="Settled instant transaction date"
 >
 {(s.createdAt && !isNaN(new Date(s.createdAt).getTime())) ? new Date(s.createdAt).toLocaleString() : "N/A"}
 </td>
 <td className="py-3 px-4 text-foreground font-sans font-extrabold">
 {s.customerName}
 </td>
 <td className="py-3 px-4 text-right text-default-500">
 {formatCurrency(s.subtotal)}
 </td>
 <td className="py-3 px-4 text-right text-default-500">
 {formatCurrency(s.vat)}
 </td>
 <td className="py-3 px-4 text-right text-rose-500">
 -{formatCurrency(s.discount)}
 </td>
 <td className="py-3 px-4 text-right text-primary font-extrabold">
 {formatCurrency(s.grandTotal)}
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
 className="py-1 px-3 rounded-lg border border-divider/60 hover:border-primary hover:bg-primary/10 transition-all font-sans text-[10px] font-black uppercase text-primary cursor-pointer"
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
  );
  })}
  
  {salesPaddingBottom > 0 && (
  <tr style={{ height: salesPaddingBottom }}>
  <td colSpan={9} className="p-0 border-0" />
  </tr>
  )}
  </>
  )}
 </tbody>
 </table>
 </div>

 <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-content1 border-t border-divider/20 text-xs font-sans">
 <span className="font-semibold text-default-500 ">
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
 className="px-3 py-1.5 rounded-lg border border-divider/60 hover:border-primary hover:bg-primary/10 text-primary disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer font-bold uppercase text-[9.5px]"
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
 <span key={pNum} className="px-1 text-default-500">
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
 className={`h-7 w-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
 salesPage === pNum
 ? "bg-primary text-primary-foreground shadow-md"
 : "border border-divider/20 hover:bg-primary/10 text-default-500"
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
 className="px-3 py-1.5 rounded-lg border border-divider/60 hover:border-primary hover:bg-primary/10 text-primary disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer font-bold uppercase text-[9.5px]"
 >
 Next
 </button>
 </div>
 </div>
 </div>
 </div>
 )}

 <AnimatePresence>
 {showShiftModal && (
 <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.25 }}
 className="absolute inset-0 bg-black/50 backdrop-blur-sm"
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
 className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground space-y-4"
 >
 <div className="flex items-start gap-3 mb-1">
 <div className="p-2 rounded-2xl bg-primary/10 text-primary shrink-0">
 <Lock className="h-5 w-5" />
 </div>
 <div className="text-left">
 <h3 className="text-base font-bold text-primary">
 Cashier Terminal Shift Required
 </h3>
 <p className="text-xs text-default-500 mt-0.5 font-medium leading-relaxed">
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
 <div className="p-3 bg-content1 border border-divider/30 rounded-2xl space-y-1.5 text-[11px] leading-normal">
 <div className="flex justify-between items-center text-amber-600 dark:text-amber-500 font-bold">
 <span>Previous Close Balance:</span>
 <span className=" font-black text-xs text-foreground">
 ₱
 {(Number(previouslyClosedShift?.cashCount) || 0).toLocaleString(
 undefined,
 { minimumFractionDigits: 2 },
 )}
 </span>
 </div>
 <p className="text-[9.5px] text-default-500/80">
 Closed by{" "}
 <strong className="text-default-500 font-semibold">
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
 (Number(previouslyClosedShift?.cashCount) || 0).toString(),
 );
 showToast(
 `Loaded previous shift balance of ₱${(Number(previouslyClosedShift?.cashCount) || 0).toFixed(2)}`,
 );
 }}
 className="w-full py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl font-bold transition-all text-center text-[10px]"
 >
 Use Previous Shift Balance
 </button>
 </div>
 )}

 <div className="space-y-1 relative pr-0 pl-0">
 <label className="text-[10px] font-bold uppercase tracking-widest text-primary block pl-1">
 Starting Cash fund (PHP)
 </label>
 <input
 type="number"
 step="any"
 required
 value={startCashInput ?? ''}
 onChange={(e) => setStartCashInput(e.target.value)}
 className="w-full bg-background border-b-2 border-divider px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors text-center font-black rounded-lg"
 />
 </div>

 <div className="flex gap-2 border-t border-divider/15 pt-4">
 <button
 type="button"
 onClick={() => {
 setShowShiftModal(false);
 setHasDismissedShiftPrompt(true);
 }}
 className="flex-1 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-default-100 text-default-500 transition-colors text-center"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="flex-1 bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 rounded-xl px-4 py-2 text-xs shadow-sm cursor-pointer text-center hover:bg-primary/90 transition-colors"
 >
 Open Terminal Shift
 </button>
 </div>
 </form>
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 <AnimatePresence>
 {showCloseShiftModal && activeShift && (
 <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.25 }}
 className="absolute inset-0 bg-black/50 backdrop-blur-sm"
 onClick={() => setShowCloseShiftModal(false)}
 />
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 15 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 15 }}
 transition={{ type: "spring", duration: 0.4 }}
 className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground space-y-4"
 >
 <div className="flex items-start gap-3 mb-1">
 <div className="p-2 rounded-2xl bg-rose-500/10 text-rose-400 shrink-0">
 <LockKeyhole className="h-5 w-5" />
 </div>
 <div className="text-left">
 <h3 className="text-base font-bold text-rose-400">
 Close Cashier Drawer Shift
 </h3>
 <p className="text-xs text-default-500 mt-0.5 font-medium leading-relaxed">
 Verify and count the physical cash in the register drawer to
 close shift.
 </p>
 </div>
 </div>

 {activeShift &&
 (() => {
 const stats = getShiftReportStats(activeShift);
 const expectedCash = activeShift.startCash + stats.cashSalesTotal;
 const enteredCash = parseFloat(closeShiftCashInput) || 0;
 const variance =
 closeShiftCashInput === "" ? 0 : enteredCash - expectedCash;

 return (
 <form
 onSubmit={handleCloseShiftSubmit}
 className="space-y-4 text-left"
 >
 <div className="bg-content1 border border-divider/30 p-3.5 rounded-2xl space-y-2.5 text-xs">
 <div className="flex justify-between border-b border-divider/15 pb-2">
 <span className="text-default-500">Active Cashier:</span>
 <span className="font-bold text-foreground">
 {activeShift.cashierName}
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-default-500">Starting Cash:</span>
 <span className=" font-bold text-foreground">
 ₱
 {(Number(activeShift?.startCash) || 0).toLocaleString(undefined, {
 minimumFractionDigits: 2,
 })}
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-default-500">
 Cash Sales Added:
 </span>
 <span className=" font-bold text-foreground">
 ₱
 {(Number(stats?.cashSalesTotal) || 0).toLocaleString(undefined, {
 minimumFractionDigits: 2,
 })}
 </span>
 </div>
 {stats && stats.netTotal > stats.cashSalesTotal && (
 <div className="flex justify-between text-[11px] text-default-500/80">
 <span>Non-Cash Payments (Card/GCash/Credit):</span>
 <span className=" font-bold">
 ₱
 {(Number(stats.netTotal - stats.cashSalesTotal) || 0).toLocaleString(undefined, {
 minimumFractionDigits: 2,
 })}
 </span>
 </div>
 )}
 <div className="flex justify-between border-t border-dashed border-divider/25 pt-2 text-sm font-bold">
 <span className="text-primary">
 Expected Drawer Cash:
 </span>
 <span className=" text-primary">
 ₱
 {(Number(expectedCash) || 0).toLocaleString(undefined, {
 minimumFractionDigits: 2,
 })}
 </span>
 </div>
 </div>

 <div className="space-y-1 relative pr-0 pl-0">
 <label className="text-[10px] font-bold uppercase tracking-widest text-primary block pl-1">
 Physical Cash Counted (PHP)
 </label>
 <input
 type="number"
 step="any"
 required
 value={closeShiftCashInput ?? ''}
 onChange={(e) =>
 setCloseShiftCashInput(e.target.value)
 }
 placeholder="Enter counted physical cash..."
 className="w-full bg-background border-b-2 border-divider px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors text-center font-black rounded-lg"
 />
 </div>

 {closeShiftCashInput !== "" && (
 <div className="p-3 bg-content1 border border-divider/30 rounded-2xl flex justify-between items-center">
 <span className="text-xs text-default-500 font-bold uppercase">
 Variance:
 </span>
 <span
 className={` font-black text-sm ${
 variance === 0
 ? "text-default-500"
 : variance > 0
 ? "text-emerald-600 dark:text-emerald-400"
 : "text-rose-600 dark:text-rose-400"
 }`}
 >
 {variance > 0 ? "+" : ""}₱
 {(Number(variance) || 0).toLocaleString(undefined, {
 minimumFractionDigits: 2,
 })}
 </span>
 </div>
 )}

 <div className="flex gap-2 border-t border-divider/15 pt-4">
 <button
 type="button"
 onClick={() => setShowCloseShiftModal(false)}
 className="flex-1 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-default-100 text-default-500 transition-colors text-center"
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
 className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground space-y-4 text-left"
 >
 <h3 className="text-base font-extrabold text-primary flex items-center gap-2">
 <Sparkles className="h-5 w-5 text-primary" /> Select
 Item Discount & Exemptions
 </h3>

 <div className="bg-background p-3.5 rounded-2xl border border-divider/20 space-y-1.5">
 <label className="text-xs font-bold text-primary uppercase tracking-wider block">
 Target Item for Discount
 </label>
 <select
 value={selectedDiscountItemIndex === null ? "ALL" : selectedDiscountItemIndex}
 onChange={(e) => {
 const val = e.target.value;
 setSelectedDiscountItemIndex(val === "ALL" ? null : parseInt(val, 10));
 }}
 className="w-full bg-content1 border border-divider/30 text-xs font-bold rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:border-primary"
 >
 <option value="ALL">Apply to ALL Items in Cart ({cart.length} item{cart.length === 1 ? '' : 's'})</option>
 {cart.map((it, i) => {
 const baseP = getBranchPrice(it.product);
 const p = it.overridePrice !== undefined ? it.overridePrice : baseP;
 return (
 <option key={i} value={i}>
 Item #{i + 1}: {it.product.productName} ({formatCurrency(p)}/unit x {it.quantity})
 </option>
 );
 })}
 </select>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <button
 type="button"
 onClick={() => applyCustomDiscount("NONE")}
 className={`p-3.5 rounded-2xl border text-left transition-colors cursor-pointer flex flex-col justify-between ${
 discountType === "NONE"
 ? "border-primary bg-primary/10"
 : "border-divider/20 bg-background hover:bg-default-100"
 }`}
 >
 <div className="font-bold text-sm">No Discount</div>
 <div className="text-xs text-default-500 mt-1 font-medium">
 Standard cashier list pricing applies.
 </div>
 </button>

 <button
 type="button"
 onClick={() => applyCustomDiscount("SENIOR")}
 className={`p-3.5 rounded-2xl border text-left transition-colors cursor-pointer flex flex-col justify-between ${
 discountType === "SENIOR"
 ? "border-primary bg-primary/10"
 : "border-divider/20 bg-background hover:bg-default-100"
 }`}
 >
 <div className="font-bold text-sm text-primary flex items-center gap-1">
 Senior Citizen
 </div>
 <div className="text-xs text-default-500 mt-1 font-medium">
 20% Off base + 12% VAT exemption (Philippine RA 9994).
 </div>
 </button>

 <button
 type="button"
 onClick={() => applyCustomDiscount("PWD")}
 className={`p-3.5 rounded-2xl border text-left transition-colors cursor-pointer flex flex-col justify-between ${
 discountType === "PWD"
 ? "border-primary bg-primary/10"
 : "border-divider/20 bg-background hover:bg-default-100"
 }`}
 >
 <div className="font-bold text-sm text-primary flex items-center gap-1">
 PWD Resident
 </div>
 <div className="text-xs text-default-500 mt-1 font-medium">
 20% Off base + 12% VAT exemption (Philippine RA 10754).
 </div>
 </button>

 <button
 type="button"
 onClick={() => applyCustomDiscount("CONTRACT")}
 className={`p-3.5 rounded-2xl border text-left transition-colors cursor-pointer flex flex-col justify-between ${
 discountType === "CONTRACT"
 ? "border-primary bg-primary/10"
 : "border-divider/20 bg-background hover:bg-default-100"
 }`}
 >
 <div className="font-bold text-sm text-primary">
 Contractor Alliance
 </div>
 <div className="text-xs text-default-500 mt-1 font-medium">
 Flat 10% Trade Allied partner discount.
 </div>
 </button>
                {discountSchemes && discountSchemes.filter(d => d.isActive !== false && d.id !== "disc-senior" && d.id !== "disc-pwd" && d.id !== "disc-contract").map(scheme => (
                  <button
                    key={scheme.id}
                    type="button"
                    onClick={() => {
                      if (scheme.discountType === "percentage") {
                        applyCustomDiscount("PERCENT", String(scheme.ratePercent || 0));
                      } else {
                        applyCustomDiscount("FLAT", String(scheme.flatAmount || 0));
                      }
                    }}
                    className="p-3.5 rounded-2xl border text-left transition-colors cursor-pointer flex flex-col justify-between border-divider/20 bg-background hover:bg-default-100"
                  >
                    <div className="font-bold text-sm text-primary flex items-center justify-between">
                      <span>{scheme.name}</span>
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-black">
                        {scheme.discountType === "percentage" ? `${scheme.ratePercent}% OFF` : `₱${scheme.flatAmount} OFF`}
                      </span>
                    </div>
                    <div className="text-xs text-default-500 mt-1 font-medium">
                      {scheme.description || `${scheme.name} promotional pricing rule.`}
                    </div>
                  </button>
                ))}
              </div>

 <div className="border-t border-divider/20 pt-4 space-y-4">
 <h4 className="text-xs font-extrabold text-primary uppercase tracking-wider pl-1 font-sans">
 Or Apply Custom Values (Flat / Rate)
 </h4>

 <div className="flex gap-3">
 <div className="flex-1 relative pl-0">
 <label className="text-xs font-bold tracking-wider text-default-500 mb-1 block pl-1">
 Discount Amount/Value
 </label>
 <input
 type="number"
 value={discountInput ?? ''}
 onChange={(e) => setDiscountInput(e.target.value)}
 placeholder={
 discountType === "PERCENT"
 ? "e.g. 15 for 15%"
 : "e.g. 100 for ₱100"
 }
 className="w-full bg-background border-b-2 border-divider px-3.5 py-2.5 text-sm font-bold text-foreground focus:outline-none focus:border-primary rounded-lg transition-colors"
 />
 </div>

 <div className="flex flex-col justify-end gap-1.5 shrink-0">
 <div className="flex gap-2">
 <button
 type="button"
 onClick={() =>
 applyCustomDiscount("FLAT", discountInput)
 }
 className="px-4 py-2.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 text-xs font-bold rounded-lg cursor-pointer transition-colors"
 >
 Apply Flat (₱)
 </button>
 <button
 type="button"
 onClick={() =>
 applyCustomDiscount("PERCENT", discountInput)
 }
 className="px-4 py-2.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 text-xs font-bold rounded-lg cursor-pointer transition-colors"
 >
 Apply Percent (%)
 </button>
 </div>
 </div>
 </div>
 </div>

 <div className="flex justify-end gap-2 border-t border-divider/20 pt-4 flex-shrink-0">
 <button
 type="button"
 onClick={() => setShowDiscountModal(false)}
 className="px-5 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-default-100 text-default-500 transition-colors text-center"
 >
 Close Panel
 </button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>

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
 className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border border-divider/30 p-5 z-20 shadow-2xl bg-content1 text-foreground flex flex-col justify-between shrink-0"
 >
 <div className="flex flex-col items-center justify-center mb-4 text-center">
 <div className="p-2 rounded-full bg-secondary-50 border border-secondary/20 text-secondary-700 mb-2 text-center">
 <CheckCircle className="h-6 w-6 text-secondary" />
 </div>
 <h3 className="text-base font-bold text-foreground">
 Checkout Succeeded
 </h3>
 <p className="text-[11px] text-default-500 font-medium">
 Inventory files adjusted automatically.
 </p>
 </div>

  <div className="flex bg-content1 p-1 rounded-xl border border-divider/30 mb-3 bir-report-no-print text-center gap-1">
    <button
      type="button"
      onClick={() => setReceiptViewMode("unified")}
      className={`flex-1 py-1.5 px-2 text-[10px] font-extrabold uppercase rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
        receiptViewMode === "unified"
          ? "bg-primary text-primary-foreground shadow-xs"
          : "text-default-500 hover:text-foreground"
      }`}
    >
      <Scissors className="h-3 w-3" /> All (Auto-Cut)
    </button>

    <button
      type="button"
      onClick={() => setReceiptViewMode("official")}
      className={`flex-1 py-1.5 px-2 text-[10px] font-extrabold uppercase rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
        receiptViewMode === "official"
          ? "bg-primary text-primary-foreground shadow-xs"
          : "text-default-500 hover:text-foreground"
      }`}
    >
      <FileText className="h-3 w-3" /> Sales Receipt
    </button>

    {activeReceiptDelivery && (
      <button
        type="button"
        onClick={() => setReceiptViewMode("delivery")}
        className={`flex-1 py-1.5 px-2 text-[10px] font-extrabold uppercase rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
          receiptViewMode === "delivery"
            ? "bg-primary text-primary-foreground shadow-xs"
            : "text-default-500 hover:text-foreground"
        }`}
      >
        <Truck className="h-3 w-3" /> Delivery Receipt
      </button>
    )}
  </div>

  <div className={`space-y-3 my-2 select-text text-left max-h-[50vh] overflow-y-auto bir-receipt-container scrollbar-thin p-1 ${receiptFontClass}`}>
    {receiptViewMode === "unified" && (
      <>
        {renderPosSalesReceipt()}
        {activeReceiptDelivery && (
          <>
            {renderCutSeparator("SALES RECEIPT / DELIVERY RECEIPT (STORE COPY)")}
            {renderPosDeliveryReceiptCopy("STORE COPY")}
            {renderCutSeparator("STORE COPY / CUSTOMER COPY")}
            {renderPosDeliveryReceiptCopy("CUSTOMER COPY")}
          </>
        )}
      </>
    )}

    {receiptViewMode === "official" && (
      renderPosSalesReceipt()
    )}

    {receiptViewMode === "delivery" && activeReceiptDelivery && (
      <>
        {renderPosDeliveryReceiptCopy("STORE COPY")}
        {renderCutSeparator("STORE COPY / CUSTOMER COPY")}
        {renderPosDeliveryReceiptCopy("CUSTOMER COPY")}
      </>
    )}
  </div>

  <div className="flex flex-col sm:flex-row gap-2 mt-4 flex-shrink-0 bir-report-no-print">
    <button
      type="button"
      onClick={() => {
        window.print();
        const logType = receiptViewMode === "delivery" 
          ? "PRINT_DELIVERY_RECEIPT" 
          : receiptViewMode === "unified" 
            ? "POS_UNIFIED_RECEIPT_PRINT" 
            : "POS_RECEIPT_PRINT";
        const logMsg = receiptViewMode === "delivery"
          ? `Printed delivery receipt for ${activeReceipt.saleNumber}`
          : receiptViewMode === "unified"
            ? `Printed unified sales & delivery receipts (auto-cut) for ${activeReceipt.saleNumber}`
            : `Printed sales receipt for ${activeReceipt.saleNumber}`;
        
        addAuditLog(logType, logMsg, "Sales", activeReceipt.id);
        showToast("Sent printing signal to hardware terminal.");
      }}
      className="flex-1 py-2.5 px-3 text-xs font-black rounded-full bg-primary text-primary-foreground hover:brightness-110 shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center uppercase tracking-wider"
    >
      <Printer className="h-4 w-4" />
      <span>
        {receiptViewMode === "unified"
          ? activeReceiptDelivery
            ? "Print All (1-Click Auto-Cut)"
            : "Print Receipt"
          : receiptViewMode === "delivery"
            ? "Print Delivery Receipt"
            : "Print Sales Receipt"}
      </span>
    </button>

    {activeReceiptDelivery && receiptViewMode !== "unified" && (
      <button
        type="button"
        onClick={() => {
          setReceiptViewMode("unified");
          setTimeout(() => {
            window.print();
            addAuditLog(
              "POS_UNIFIED_RECEIPT_PRINT",
              `Printed unified sales & delivery receipts (auto-cut) for ${activeReceipt.saleNumber}`,
              "Sales",
              activeReceipt.id
            );
            showToast("Sent unified printing signal (Auto-Cut) to terminal.");
          }, 120);
        }}
        className="py-2.5 px-3 text-xs font-bold rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center uppercase tracking-wider"
        title="Print Sales + Delivery Receipts with Auto-Cut in 1 job"
      >
        <Scissors className="h-3.5 w-3.5" />
        <span>Print All (Auto-Cut)</span>
      </button>
    )}

    <button
      type="button"
      onClick={() => {
        setShowReceiptModal(false);
        setReceiptViewMode("unified");
      }}
      className="py-2.5 px-4 text-xs font-bold rounded-full border border-divider/50 hover:bg-default-100 text-foreground transition-colors cursor-pointer text-center uppercase tracking-wider"
    >
      Done
    </button>
  </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>

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
 className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground space-y-4"
 >
 <div className="flex justify-between items-center border-b border-divider/20 pb-2.5">
 <h3 className="text-base font-bold text-primary flex items-center gap-2">
 <span>Assign Customer Profile</span>
 </h3>
 <button
 type="button"
 onClick={() => setShowCustomerModal(false)}
 className="text-default-500 hover:text-foreground cursor-pointer p-1 rounded-full"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 <div className="space-y-1 relative pr-0 pl-0">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1 block">
 Buyer's Name
 </label>
 <input
 type="text"
 value={customerModalInput ?? ''}
 onChange={(e) => setCustomerModalInput(e.target.value)}
 placeholder="Full Name / Company Name"
 className="w-full bg-background border-b-2 border-divider px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors rounded-lg font-bold"
 />
 </div>

 <div className="space-y-1 relative pr-0 pl-0">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1 block">
 Buyer's Address (BIR / Invoicing)
 </label>
 <input
 type="text"
 value={customerModalAddressInput ?? ''}
 onChange={(e) => setCustomerModalAddressInput(e.target.value)}
 placeholder="Unit / Street / Barangay / City / Province"
 className="w-full bg-background border-b-2 border-divider px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors rounded-lg font-bold"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1 relative pr-0 pl-0">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1 block">
 Buyer TIN
 </label>
 <input
 type="text"
 value={customerModalTinInput ?? ''}
 onChange={(e) => setCustomerModalTinInput(formatTin(e.target.value))}
 placeholder="000-000-000-000"
 className="w-full bg-background border-b-2 border-divider px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors rounded-lg font-bold"
 />
 </div>

 <div className="space-y-1 relative pr-0 pl-0">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1 block">
 Business Style
 </label>
 <input
 type="text"
 value={customerModalBusinessStyleInput ?? ''}
 onChange={(e) => setCustomerModalBusinessStyleInput(e.target.value)}
 placeholder="e.g. Retail / General Contractor"
 className="w-full bg-background border-b-2 border-divider px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors rounded-lg font-bold"
 />
 </div>
 </div>

 <div className="space-y-1 relative pr-0 pl-0">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1 block">
 Ticket Note / Project Assign (Optional)
 </label>
 <input
 type="text"
 value={customerModalNotesInput ?? ''}
 onChange={(e) => setCustomerModalNotesInput(e.target.value)}
 placeholder="e.g. Master Bath Renovation / Lot 4 Villa"
 className="w-full bg-background border-b-2 border-divider px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors rounded-lg font-bold"
 />
 </div>

 <div className="space-y-1.5 pt-1">
   <label className="text-[9px] font-black text-default-500 uppercase tracking-widest pl-1 block">
     Search Registered Corporate Members
   </label>
   <div className="max-h-36 overflow-y-auto border border-divider/20 rounded-xl p-1 bg-content1 divide-y divide-divider/10 scrollbar-thin">
     {(() => {
       const filteredModalMembers = members.filter((m) => {
         if (!customerModalInput.trim()) return true;
         return m.fullName.toLowerCase().includes(customerModalInput.toLowerCase()) ||
                m.phone.includes(customerModalInput) ||
                m.email.toLowerCase().includes(customerModalInput.toLowerCase());
       });

       if (filteredModalMembers.length === 0) {
         return (
           <div className="p-3 text-center space-y-2">
             <p className="text-default-500 text-[11px] font-medium italic">
               {customerModalInput.trim()
                 ? `No corporate members found matching "${customerModalInput}".`
                 : "No registered corporate members found."}
             </p>
             {customerModalInput.trim() &&
              customerModalInput.toLowerCase() !== "walk-in customer" &&
              customerModalInput.toLowerCase() !== "walk-in" && (
               <button
                 type="button"
                 onClick={() => {
                   setNewMemberName(customerModalInput.trim());
                   setAddMemberError("");
                   setShowCustomerModal(false);
                   setShowAddMemberModal(true);
                 }}
                 className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 text-xs font-extrabold rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-colors border-0"
               >
                 <UserPlus className="h-3.5 w-3.5" />
                 <span>Add "{customerModalInput.trim()}" as Member</span>
               </button>
             )}
           </div>
         );
       }

       return filteredModalMembers.map((m) => (
         <button
           type="button"
           key={m.id}
           onClick={() => {
             setCustomerModalInput(m.fullName);
             if (m.address) setCustomerModalAddressInput(m.address);
             if (m.tin) setCustomerModalTinInput(formatTin(m.tin));
           }}
           className="w-full text-left p-2 hover:bg-primary/10 rounded-lg text-xs font-bold text-foreground flex justify-between items-center cursor-pointer border-0 bg-transparent transition-colors"
         >
           <div className="flex flex-col text-left">
             <span>{m.fullName}</span>
             <span className="text-[8.5px] text-default-500 font-normal">{m.phone} • {m.email} {m.tin ? `• TIN: ${m.tin}` : ''}</span>
           </div>
           <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
             Select
           </span>
         </button>
       ));
     })()}
   </div>
 </div>

 <div className="flex justify-end gap-2 border-t border-divider/20 pt-4">
 <button
 type="button"
 onClick={() => setShowCustomerModal(false)}
 className="px-4 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-default-100 text-default-500 transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 rounded-medium px-5 py-2 text-xs shadow-sm cursor-pointer"
 >
 Assign Customer
 </button>
 </div>
 </motion.form>
 </div>
 )}
 </AnimatePresence>

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
 className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border border-rose-500/35 p-6 z-20 shadow-2xl bg-content1 text-foreground space-y-4 text-left border-t-4"
 >
 <div className="flex justify-between items-center border-b border-divider/20 pb-2.5">
 <h3 className="text-sm font-black text-rose-500 flex items-center gap-1.5 uppercase tracking-wider">
 <LockKeyhole className="h-5 w-5" />
 <span>Security override prompt</span>
 </h3>
 <button
 type="button"
 onClick={() => setPendingApproval(null)}
 className="text-default-500 hover:text-foreground cursor-pointer p-0.5 rounded-full"
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
 <label className="text-[9px] font-black text-primary uppercase tracking-widest pl-1 block">
 Authorize Username
 </label>
 <input
 type="text"
 required
 value={approverUsername ?? ''}
 onChange={(e) => setApproverUsername(e.target.value)}
 placeholder="Authorize username"
 className="w-full bg-background border-b-2 border-divider px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors rounded-lg font-bold"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-black text-primary uppercase tracking-widest pl-1 block">
 Security Clearance PIN Code / Password
 </label>
 <input
 type="password"
 required
 value={approverPassword ?? ''}
 onChange={(e) => setApproverPassword(e.target.value)}
 placeholder="••••••••"
 className="w-full bg-background border-b-2 border-divider px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors rounded-lg font-bold"
 />
 </div>
 </div>

 {approvalError && (
 <div className="text-[10px] font-extrabold text-red-500 px-2">
 {approvalError}
 </div>
 )}

 <div className="flex justify-end gap-2 border-t border-divider/20 pt-4">
 <button
 type="button"
 onClick={() => setPendingApproval(null)}
 className="px-4 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-default-100 text-default-500 transition-colors"
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
 className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground space-y-4 text-left"
 >
 <div className="flex justify-between items-center border-b border-divider/20 pb-2.5">
 <h3 className="text-base font-black text-primary flex items-center gap-1.5 uppercase tracking-wider">
 <span>Unit Price Override</span>
 </h3>
 <button
 type="button"
 onClick={() => setOverrideModalOpen(false)}
 className="text-default-500 hover:text-foreground cursor-pointer p-1 rounded-full hover:bg-default-100 transition-colors"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 <div className="space-y-1.5 leading-normal pl-1 text-xs font-semibold text-default-500 bg-background p-3 rounded-xl border border-divider/20">
 <div>
 <strong>Product:</strong>{" "}
 {cart[overrideItemIndex].product.productName}
 </div>
 <div>
 <strong>Default Unit Price:</strong> ₱
 {getBranchPrice(cart[overrideItemIndex].product).toFixed(2)}
 </div>
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-bold text-primary uppercase tracking-wider pl-1 block">
 New Unit Selling Price
 </label>
 <input
 type="number"
 required
 min={0}
 step="0.01"
 value={overridePriceInput ?? ''}
 onChange={(e) => setOverridePriceInput(e.target.value)}
 className="w-full bg-background border-b-2 border-divider px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors rounded-lg font-bold "
 />
 <span className="text-xs text-default-500 pl-1 block mt-1 font-medium">
 {currentUser?.role === UserRole.CASHIER
 ? "Changing the standard price requires Manager override verification."
 : "Your role has privileges to direct-apply this override."}
 </span>
 </div>

 <div className="flex justify-end gap-2 border-t border-divider/20 pt-4 font-sans">
 <button
 type="button"
 onClick={() => setOverrideModalOpen(false)}
 className="px-4 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-default-100 text-default-500 transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 rounded-medium px-5 py-2 text-xs shadow-sm cursor-pointer"
 >
 Apply Price
 </button>
 </div>
 </motion.form>
 </div>
 )}
 </AnimatePresence>

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
 className="relative w-full max-w-lg rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground text-left space-y-4 max-h-[90vh] overflow-y-auto"
 >
 <div className="flex justify-between items-center border-b border-divider/20 pb-3">
 <div>
 <h3 className="text-sm font-black text-primary uppercase tracking-widest ">
 Order Dispatch Fulfillment
 </h3>
 <p className="text-[10px] text-default-500 font-bold mt-0.5 uppercase tracking-wide">
 Receipt Ref: {pendingSaleForFulfillment.saleNumber} •
 Customer: {pendingSaleForFulfillment.customerName}
 </p>
 </div>
 </div>

 <div className="bg-content1 p-3 rounded-2xl border border-divider/20 space-y-1.5 text-xs ">
 <div className="flex justify-between items-center text-default-500">
 <span>Total Bill: <strong className="text-foreground">{formatCurrency(pendingSaleForFulfillment?.grandTotal)}</strong></span>
 <span>Tendered ({pendingSaleForFulfillment?.paymentMethod || "Cash"}): <strong className="text-foreground">{formatCurrency(pendingSaleForFulfillment?.amountTendered || pendingSaleForFulfillment?.grandTotal)}</strong></span>
 </div>
 {(pendingSaleForFulfillment?.changeAmount || 0) > 0 && (
 <div className="flex justify-between items-center pt-1.5 border-t border-dashed border-divider/20 font-extrabold text-emerald-400 bg-emerald-500/10 -mx-3 -mb-3 p-2.5 rounded-b-2xl">
 <span className="uppercase text-[10px] tracking-wider font-sans">Customer Change Due:</span>
 <span className="text-sm font-black text-emerald-300">{formatCurrency(pendingSaleForFulfillment?.changeAmount)}</span>
 </div>
 )}
 </div>

 <div className="space-y-1.5 pl-1">
 <span className="text-[9.5px] font-black text-primary uppercase tracking-widest block mb-1.5">
 How will the customer receive the items?
 </span>
 <div className="grid grid-cols-2 gap-3">
 <button
 type="button"
 onClick={() => setFulfillmentType("TakeHome")}
 className={`p-4 rounded-2xl border-2 transition-all cursor-pointer text-left flex flex-col justify-between h-[110px] ${
 fulfillmentType === "TakeHome"
 ? "border-primary bg-primary/5 text-primary font-bold"
 : "border-divider/30 hover:border-divider/60 bg-content1 text-foreground"
 }`}
 >
 <ShoppingBag className="h-6 w-6 text-primary" />
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
 ? "border-primary bg-primary/5 text-primary font-bold"
 : "border-divider/30 hover:border-divider/60 bg-content1 text-foreground"
 }`}
 >
 <Truck className="h-6 w-6 text-primary" />
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
 <div className="space-y-4 border-t border-divider/15 pt-4">
 <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-400 font-medium leading-relaxed">
 <strong>TAKE HOME IMMEDIATE RELEASE:</strong> All products
 in the cart are logged as released immediately. Stock has
 been deducted. No further truck scheduling is tracking.
 </div>
 <div className="flex justify-end pt-1">
 <button
 type="button"
 onClick={handleFulfillmentTakeHome}
 className="bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 rounded-medium px-8 py-2.5 text-xs font-black uppercase tracking-widest shadow-md cursor-pointer"
 >
 Release Material & View Receipt
 </button>
 </div>
 </div>
 )}

 {fulfillmentType === "Delivery" && (
 <form
 onSubmit={handleFulfillmentDeliverySubmit}
 className="space-y-4 border-t border-divider/15 pt-4"
 >
 <div className="bg-primary/10 border border-primary/15 rounded-xl p-3 text-[10.5px] text-primary font-medium leading-relaxed">
 <strong>STORE DELIVERY ALLOCATION:</strong> This creates a{" "}
 <strong>Pending Scheduling</strong> transport ledger. Stock
 quantities are reserved of this location immediately.
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pl-1">
 <div className="space-y-1 col-span-1 md:col-span-2">
 <label className="text-[9px] font-black text-primary uppercase tracking-widest pl-1 block">
 Customer / Recipient Name *
 </label>
 <input
 type="text"
 required
 value={deliveryCustomerName ?? ''}
 onChange={(e) => setDeliveryCustomerName(e.target.value)}
 placeholder="Recipient name"
 className="w-full bg-content1 border-b-2 border-divider/60 focus:border-primary px-3 py-1.5 text-xs focus:outline-none transition-colors rounded-lg font-bold"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-black text-primary uppercase tracking-widest pl-1 block">
 Contact Number *
 </label>
 <input
 type="text"
 required
 value={deliveryContact ?? ''}
 onChange={(e) => setDeliveryContact(e.target.value)}
 placeholder="Phone number"
 className="w-full bg-content1 border-b-2 border-divider/60 focus:border-primary px-3 py-1.5 text-xs focus:outline-none transition-colors rounded-lg font-bold"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-black text-primary uppercase tracking-widest pl-1 block">
 House No. / Building / Suite
 </label>
 <input
 type="text"
 value={deliveryHouseNo ?? ''}
 onChange={(e) => setDeliveryHouseNo(e.target.value)}
 placeholder="House No. / Building / Suite"
 className="w-full bg-content1 border-b-2 border-divider/60 focus:border-primary px-3 py-1.5 text-xs focus:outline-none transition-colors rounded-lg"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-black text-primary uppercase tracking-widest pl-1 block">
 Street / Subdivision
 </label>
 <input
 type="text"
 value={deliveryStreet ?? ''}
 onChange={(e) => setDeliveryStreet(e.target.value)}
 placeholder="Street / Subdivision"
 className="w-full bg-content1 border-b-2 border-divider/60 focus:border-primary px-3 py-1.5 text-xs focus:outline-none transition-colors rounded-lg"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-black text-primary uppercase tracking-widest pl-1 block">
 Barangay *
 </label>
 <input
 type="text"
 required
 value={deliveryBarangay ?? ''}
 onChange={(e) => setDeliveryBarangay(e.target.value)}
 placeholder="Barangay"
 className="w-full bg-content1 border-b-2 border-divider/60 focus:border-primary px-3 py-1.5 text-xs focus:outline-none transition-colors rounded-lg font-bold"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-black text-primary uppercase tracking-widest pl-1 block">
 City / Municipality *
 </label>
 <input
 type="text"
 required
 value={deliveryCity ?? ''}
 onChange={(e) => setDeliveryCity(e.target.value)}
 placeholder="City / Municipality"
 className="w-full bg-content1 border-b-2 border-divider/60 focus:border-primary px-3 py-1.5 text-xs focus:outline-none transition-colors rounded-lg font-bold"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-black text-primary uppercase tracking-widest pl-1 block">
 Landmark / Directions
 </label>
 <input
 type="text"
 value={deliveryLandmark ?? ''}
 onChange={(e) => setDeliveryLandmark(e.target.value)}
 placeholder="Landmarks or special delivery instructions"
 className="w-full bg-content1 border-b-2 border-divider/60 focus:border-primary px-3 py-1.5 text-xs focus:outline-none transition-colors rounded-lg"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-black text-primary uppercase tracking-widest pl-1 block">
 Unloading Date *
 </label>
 <input
 type="date"
 required
 value={deliveryDate ?? ''}
 onChange={(e) => setDeliveryDate(e.target.value)}
 className="w-full bg-content1 border-b-2 border-divider/60 focus:border-primary px-3 py-1.5 text-xs focus:outline-none transition-colors rounded-lg font-bold cursor-pointer"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-black text-primary uppercase tracking-widest pl-1 block">
 Arrival Time Window
 </label>
 <input
 type="text"
 value={deliveryTime ?? ''}
 onChange={(e) => setDeliveryTime(e.target.value)}
 placeholder="Arrival window (e.g. 10:00 AM - 2:00 PM)"
 className="w-full bg-content1 border-b-2 border-divider/60 focus:border-primary px-3 py-1.5 text-xs focus:outline-none transition-colors rounded-lg"
 />
 </div>
 </div>

 <div className="space-y-1 pl-1">
 <label className="text-[9px] font-black text-primary uppercase tracking-widest block mb-0.5">
 Special Unloading Notes (e.g. Fragile, Heavy Lift)
 </label>
 <textarea
 rows={2}
 value={deliveryNotes ?? ''}
 onChange={(e) => setDeliveryNotes(e.target.value)}
 placeholder="Special instructions or notes"
 className="w-full bg-content1 border-b-2 border-divider/60 focus:border-primary px-3 py-1.5 text-xs focus:outline-none transition-colors rounded-lg"
 />
 </div>

 <div className="flex justify-end pt-2 border-t border-divider/10">
 <button
 type="submit"
 className="bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 rounded-medium px-8 py-2.5 text-xs font-black uppercase tracking-widest shadow-md cursor-pointer flex items-center gap-1.5"
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

 <AnimatePresence>
 {pinModalOpen && pinAction && pinTargetSale && (
 <div className="fixed inset-0 flex items-center justify-center z-[80] p-4 font-sans">
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
 className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border border-amber-500/30 p-6 z-20 shadow-2xl bg-content1 text-foreground space-y-4 text-left"
 >
 <div className="flex justify-between items-center border-b border-divider/20 pb-2.5">
 <h3 className="text-sm font-black text-amber-500 flex items-center gap-1.5 uppercase tracking-widest">
 <LockKeyhole className="h-4 w-4 text-amber-500" />
 <span>{pinAction} Verification</span>
 </h3>
 <button
 type="button"
 onClick={() => {
 setPinModalOpen(false);
 setPinAction(null);
 setPinTargetSale(null);
 }}
 className="text-default-500 hover:text-foreground cursor-pointer p-0.5 rounded-full"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 <div className="bg-amber-500/5 border border-amber-500/20 p-3 rounded-2xl text-[11px] leading-relaxed text-default-500 font-bold space-y-1">
 <div>
 <strong>SECURE OVERRIDE REASON:</strong>
 </div>
 <p className="text-amber-400 font-extrabold uppercase tracking-wide">
 Guarded Operation:{" "}
 {pinAction === "REPRINT"
 ? "Ticket Copy Reprinting"
 : "Sales Journal Invoice Voiding"}
 </p>
 <div className="text-default-500 mt-1">
 Transaction Ref:{" "}
 <span className="text-foreground select-all font-black">
 {pinTargetSale.saleNumber}
 </span>
 </div>
 <div className="text-default-500">
 Settled Amount:{" "}
 <span className="text-foreground font-bold">
 ₱{(Number(pinTargetSale.grandTotal) || 0).toFixed(2)}
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
 value={securityPinInput ?? ''}
 onChange={(e) => {
 setSecurityPinInput(e.target.value.replace(/\D/g, ""));
 setSecurityPinError("");
 }}
 placeholder="••••"
 className="w-full bg-background border-b-2 border-divider text-center tracking-[0.5em] text-lg font-black py-2 text-foreground focus:outline-none focus:border-amber-500 transition-colors rounded-lg "
 autoFocus
 />
 </div>

 {securityPinError ? (
 <p className="text-[9.5px] font-extrabold text-red-500 px-1 text-center">
 {securityPinError}
 </p>
 ) : (
 <p className="text-[9px] text-default-500 px-1 text-center font-medium">
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
 className="py-2.5 rounded-xl bg-background hover:bg-default-100 font-black text-sm text-foreground transition-all active:scale-95 shadow-sm border border-divider/10 cursor-pointer"
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
 className="py-2.5 rounded-xl bg-background hover:bg-default-100 font-black text-sm text-foreground transition-all active:scale-95 shadow-sm border border-divider/10 cursor-pointer"
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
 className="w-full py-2 bg-default-100 hover:bg-default-100 rounded-full text-default-500 font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer text-center"
 >
 Decline & Close
 </button>
 </div>
 </motion.form>
 </div>
 )}
 </AnimatePresence>

 {selectedSaleDetail && (
 <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in text-left">
 <div
 className="absolute inset-0 bg-gray-950/65 backdrop-blur-sm"
 onClick={() => setSelectedSaleDetail(null)}
 />
 <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground space-y-4">
 <div className="flex justify-between items-center border-b border-divider/20 pb-3">
 <h3 className="text-sm font-black text-rose-500 flex items-center gap-2 uppercase tracking-wider ">
 <FileText className="h-5 w-5 text-rose-500" />
 <span>Invoice Ledger: {selectedSaleDetail.saleNumber}</span>
 </h3>
 <button
 onClick={() => setSelectedSaleDetail(null)}
 className="text-default-500 hover:text-white cursor-pointer p-1 rounded-full hover:bg-zinc-800"
 >
 <X className="h-4.5 w-4.5" />
 </button>
 </div>

 <div className="grid grid-cols-2 gap-3 bg-content1/70 p-3.5 rounded-2xl border border-divider/10 text-xs font-sans">
 <div>
 <span className="block text-[10px] uppercase font-bold text-zinc-450 tracking-wider">
 Buyer Name
 </span>
 <span className="font-extrabold text-sm text-primary mt-0.5 block">
 {selectedSaleDetail.customerName}
 </span>
 </div>
 <div>
 <span className="block text-[10px] uppercase font-bold text-zinc-450 tracking-wider">
 Settled Timestamp
 </span>
 <span className=" mt-0.5 block">
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
 <h4 className="text-[10px] font-black uppercase text-primary tracking-wider pl-1 ">
 Purchased Tile Products
 </h4>
 <div className="border border-divider/15 rounded-xl overflow-hidden bg-content1">
 <table className="w-full text-left text-[11px] font-sans">
 <thead className="bg-content1/50 text-[9px] uppercase font-bold text-default-500 border-b border-divider/15">
 <tr>
 <th className="py-2.5 px-3">Product Description</th>
 <th className="py-2.5 px-3 text-right">Unit Price</th>
 <th className="py-2.5 px-3 text-center">Qty</th>
 <th className="py-2.5 px-3 text-right">Total Price</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-divider/10 text-default-500">
 {saleItems
 .filter((item) => item.saleId === selectedSaleDetail.id)
 .map((item, idx) => (
 <tr key={idx} className="hover:bg-content1/30">
 <td className="py-2 px-3 font-sans font-bold text-white">
 {item.productName}
 </td>
 <td className="py-2 px-3 text-right">
 ₱
 {(Number(item.unitPrice) || 0).toLocaleString(undefined, {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })}
 </td>
 <td className="py-2 px-3 text-center font-bold text-[#10B981]">
 x{item.quantity}
 </td>
 <td className="py-2 px-3 text-right text-primary font-bold">
 ₱
 {(Number(item.total) || 0).toLocaleString(undefined, {
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
 className="py-4 text-center text-default-400 italic font-sans"
 >
 No products registered in this invoice record.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>

 <div className="p-3 bg-content1/70 border border-divider/10 rounded-xl space-y-1.5 text-[11px] ">
 <div className="flex justify-between">
 <span className="text-default-500 font-sans">Subtotal Sale:</span>
 <span className="font-bold">
 {formatCurrency(selectedSaleDetail.subtotal)}
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-default-500 font-sans">
 VAT Included (12%):
 </span>
 <span className="font-bold text-default-500">
 {formatCurrency(selectedSaleDetail.vat)}
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-default-500 font-sans">
 Discount Deductions:
 </span>
 <span className="font-bold text-rose-500">
 -{formatCurrency(selectedSaleDetail.discount)}
 </span>
 </div>
 <div className="flex justify-between border-t border-divider/10 pt-1.5 text-xs text-primary font-bold">
 <span className="font-sans">Grand Total:</span>
 <span className="text-sm font-extrabold text-[#10B981]">
 {formatCurrency(selectedSaleDetail.grandTotal)}
 </span>
 </div>
 <div className="flex justify-between text-[10px] text-default-500 pt-1">
 <span className="font-sans">Amount Tendered:</span>
 <span>{formatCurrency(selectedSaleDetail.amountTendered)}</span>
 </div>
 <div className="flex justify-between text-[10px] text-default-500">
 <span className="font-sans">Change Settled:</span>
 <span>{formatCurrency(selectedSaleDetail.changeAmount)}</span>
 </div>
 </div>

 {selectedSaleDetail.notes && (
 <div className="text-[10px] bg-amber-500/5 text-amber-500 px-3 py-2 border border-amber-500/10 rounded-xl font-sans">
 <strong>Transaction Notes:</strong> {selectedSaleDetail.notes}
 </div>
 )}

 <div className="flex justify-between gap-2 border-t border-divider/20 pt-4 font-sans">
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
 className="px-3.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-[10px] uppercase font-black tracking-widest transition-all cursor-pointer shadow-sm active:scale-95"
 >
 Reprint Slip
 </button>
 </div>

 <button
 onClick={() => setSelectedSaleDetail(null)}
 className="px-4 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-default-100 text-default-500 transition-colors"
 >
 Close Details
 </button>
 </div>
 </div>
 </div>
 )}

 <AnimatePresence>
 {showTileCalculatorModal && (
 <div className="fixed inset-0 flex items-center justify-center z-50 p-4 font-sans text-foreground">
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
 className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 flex flex-col"
 >
 <div className="flex justify-between items-center border-b border-divider/20 pb-3.5 mb-4 shrink-0 text-left">
 <h3 className="text-base font-black text-primary flex items-center gap-2">
 <Calculator className="h-5 w-5 text-primary" />
 <span>Tile Coverage & Area Estimator Calculator</span>
 </h3>
 <button
 type="button"
 onClick={() => setShowTileCalculatorModal(false)}
 className="text-default-500 hover:text-foreground cursor-pointer p-1.5 rounded-full hover:bg-primary/10 transition-colors"
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

 <div className="flex justify-end gap-2 border-t border-divider/20 pt-4 mt-4 shrink-0">
 <button
 type="button"
 onClick={() => setShowTileCalculatorModal(false)}
 className="px-6 py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-black uppercase tracking-wider rounded-full shadow-sm cursor-pointer transition-colors active:scale-95"
 >
 Close Calculator
 </button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 {/* Success toast alert bar */}
 <ToastNotification
 message={toastMessage}
 onClose={() => setToastMessage(null)}
 />

 {/* Register Corporate Member Modal */}
 <AnimatePresence>
 {showAddMemberModal && (
 <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
 className="relative w-full max-w-lg rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-background flex flex-col space-y-4"
 >
 <div className="flex justify-between items-center border-b border-divider/20 pb-3">
 <div className="flex items-center gap-2">
 <div className="p-2 rounded-xl bg-primary/10 text-primary">
 <UserPlus className="h-5 w-5" />
 </div>
 <div className="text-left">
 <h3 className="text-sm font-extrabold text-foreground">Add Corporate Member Account</h3>
 
 </div>
 </div>
 <button
 type="button"
 onClick={() => setShowAddMemberModal(false)}
 className="text-default-500 hover:text-foreground p-1.5 rounded-full hover:bg-primary/10 transition-colors cursor-pointer"
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
 <label className="text-[10px] font-black text-primary uppercase tracking-wider block">
 Full Name / Company Account Name *
 </label>
 <input
 type="text"
 required
 value={newMemberName ?? ''}
 onChange={(e) => setNewMemberName(e.target.value)}
 placeholder="Full Name / Company"
 className="w-full bg-content1 border border-divider/40 rounded-xl px-3.5 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-primary transition-all"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="text-[10px] font-black text-primary uppercase tracking-wider block">
 Contact Phone Number (Optional)
 </label>
 <input
 type="text"
 value={newMemberPhone ?? ''}
 onChange={(e) => setNewMemberPhone(e.target.value)}
 placeholder="Phone number"
 className="w-full bg-content1 border border-divider/40 rounded-xl px-3.5 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-primary transition-all"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] font-black text-primary uppercase tracking-wider block">
 Email Address (Optional)
 </label>
 <input
 type="email"
 value={newMemberEmail ?? ''}
 onChange={(e) => setNewMemberEmail(e.target.value)}
 placeholder="Email address"
 className="w-full bg-content1 border border-divider/40 rounded-xl px-3.5 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-primary transition-all"
 />
 </div>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] font-black text-primary uppercase tracking-wider block">
 Credit Line Ceiling Limit (₱) (Optional)
 </label>
 <input
 type="number"
 min="0"
 step="500"
 value={newMemberLimit ?? ''}
 onChange={(e) => setNewMemberLimit(e.target.value)}
 placeholder="0"
 className="w-full bg-content1 border border-divider/40 rounded-xl px-3.5 py-2 text-xs font-extrabold text-foreground focus:outline-none focus:border-primary transition-all"
 />
 
 </div>

 <div className="flex justify-end gap-2 border-t border-divider/20 pt-3 mt-4">
 <button
 type="button"
 onClick={() => setShowAddMemberModal(false)}
 className="px-4 py-2 border border-divider/40 hover:bg-content3 text-foreground text-xs font-bold rounded-xl cursor-pointer transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-extrabold rounded-xl shadow-md cursor-pointer transition-colors flex items-center gap-1.5"
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
 <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
 className="relative w-full max-w-md rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-background flex flex-col space-y-4"
 >
 <div className="flex justify-between items-center border-b border-divider/20 pb-3">
 <div className="flex items-center gap-2">
 <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
 <Sparkles className="h-5 w-5" />
 </div>
 <div className="text-left">
 <h3 className="text-sm font-extrabold text-foreground">Member Loyalty Program Mechanics</h3>
 
 </div>
 </div>
 <button
 type="button"
 onClick={() => setShowLoyaltyConfigModal(false)}
 className="text-default-500 hover:text-foreground p-1.5 rounded-full hover:bg-primary/10 transition-colors cursor-pointer"
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
 <span>Active Formula Rules</span>
 <span className="text-[10px] font-black uppercase">Live System Rule</span>
 </div>
 <p className="text-[11px] text-foreground leading-relaxed">
 Every <strong>₱{(parseFloat(loyaltySpendInput) || 500).toLocaleString()}</strong> spent = <strong>1 Point</strong> earned.<br />
 <strong>1 Point</strong> = <strong>₱{(parseFloat(loyaltyPointValueInput) || 1.0).toFixed(2)}</strong> discount redemption value.
 </p>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] font-black text-primary uppercase tracking-wider block">
 Spend Amount Per 1 Point (PHP) *
 </label>
 <div className="relative">
 <span className="absolute left-3 top-2.5 text-xs font-bold text-default-500">₱</span>
 <input
 type="number"
 required
 min="10"
 step="10"
 value={loyaltySpendInput ?? ''}
 onChange={(e) => setLoyaltySpendInput(e.target.value)}
 placeholder="500"
 className="w-full bg-content1 border border-divider/40 rounded-xl pl-7 pr-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-primary transition-all"
 />
 </div>
 
 </div>

 <div className="space-y-1">
 <label className="text-[10px] font-black text-primary uppercase tracking-wider block">
 Redemption Value Per 1 Point (PHP) *
 </label>
 <div className="relative">
 <span className="absolute left-3 top-2.5 text-xs font-bold text-default-500">₱</span>
 <input
 type="number"
 required
 min="0.1"
 step="0.1"
 value={loyaltyPointValueInput ?? ''}
 onChange={(e) => setLoyaltyPointValueInput(e.target.value)}
 placeholder="1.00"
 className="w-full bg-content1 border border-divider/40 rounded-xl pl-7 pr-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-primary transition-all"
 />
 </div>
 
 </div>

 <div className="flex justify-end gap-2 border-t border-divider/20 pt-3 mt-4">
 <button
 type="button"
 onClick={() => setShowLoyaltyConfigModal(false)}
 className="px-4 py-2 border border-divider/40 hover:bg-content3 text-foreground text-xs font-bold rounded-xl cursor-pointer transition-colors"
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

 {showEscConfirmModal && (
 <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
 <motion.div
 initial={{ scale: 0.95, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.95, opacity: 0 }}
 className="bg-background border border-rose-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
 >
 <div className="flex items-center gap-3 text-rose-500">
 <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
 <AlertCircle className="h-6 w-6" />
 </div>
 <div>
 <h3 className="text-base font-black tracking-tight text-foreground">Exit Checkout / Cancel Sale?</h3>
 <p className="text-xs text-default-500 font-medium">ESC shortcut key triggered</p>
 </div>
 </div>

 <p className="text-xs text-default-500 leading-relaxed bg-content1 p-3.5 rounded-2xl border border-divider/15">
 You currently have <strong className="text-primary">{cart.length} item(s)</strong> worth <strong className="text-emerald-500">₱{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> in the active terminal basket.
 </p>

 <div className="flex flex-col gap-2 pt-2">
 <button
 type="button"
 onClick={() => setShowEscConfirmModal(false)}
 className="w-full py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
 >
 <span>Continue Sale (Keep Cart)</span>
 </button>

 <button
 type="button"
 onClick={() => {
 handleHold();
 setShowEscConfirmModal(false);
 }}
 className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2"
 >
 <span>Park Transaction to Hold Register</span>
 </button>

 <button
 type="button"
 onClick={() => {
 handleCancelSale();
 setShowEscConfirmModal(false);
 showToast("Active cart order discarded.");
 }}
 className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2"
 >
 <span>Clear & Discard Active Cart</span>
 </button>
 </div>
 </motion.div>
 </div>
 )}
 </div>
 );
}
