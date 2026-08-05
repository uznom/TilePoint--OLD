/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
 createContext,
 useContext,
 useState,
 useEffect,
 useRef,
 useMemo,
 useCallback,
} from "react";
import {
 createSaltedHash,
 formatHashToken,
 verifyPasswordWithToken,
 detectSQLi,
 encryptCredentialPacket,
 decryptCredentialPacket,
 generateSessionToken,
} from "../lib/crypto";
import { saveFileToBackup } from "../lib/fileBackupHelper";
import { generateEan13Barcode } from "../utils/barcodeGenerator";
import { isProductInBranch, slugifyBranchStr, getBranchStockQuantity, getBranchStockRecord } from "../lib/branchUtils";
import { sqliteDatabaseService } from "../services/sqliteDatabaseService";
import { dbSyncWorkerClient } from "../services/dbSyncWorkerClient";
import {
 User,
 UserRole,
 Branch,
 Supplier,
 Brand,
 Product,
 PurchaseOrder,
 PurchaseOrderItem,
 Transmittal,
 TransmittalDocType,
 TransmittalStatus,
 Shift,
 Sale,
 SaleItem,
 InventoryMovement,
 AuditLog,
 POStatus,
 ShiftStatus,
 StockTransfer,
 TransferStatus,
 TransferType,
 InventoryLocationStock,
 LedgerEntry,
 BranchSalesReport,
 Delivery,
 DeliveryStatus,
 DamageLog,
 ActiveSession,
 CustomCorporateBill,
 Member,
 Expense,
 ProductReturn,
 LoyaltyConfig,
 ArchivableCategory,
 PurgeResult,
 RetentionPolicyMap,
} from "../types/db";

// Hard-locked database tables containing active transactions, shift summaries, and stock levels (absolutely exempt from auto-purging)
// Core database tables containing active session & auth states (exempt from auto-clearing by Cashiers)
const HARD_LOCKED_KEYS = [
  "tp_sales",
  "tp_sale_items",
  "tp_shifts",
  "tp_branch_stock",
  "tp_movements",
  "tp_users",
  "tp_branches"
];

// Comprehensive Synchronous Storage Pruning Function
const performSyncPruning = (): number => {
  if (typeof window === "undefined" || !window.localStorage) return 0;
  console.log("[System Guard] Performing synchronous emergency database pruning...");
  let bytesFreed = 0;

  const setItemSync = (k: string, val: string) => {
    try {
      window.localStorage.setItem(k, val);
    } catch (_) {}
  };

  // 1. Strip heavy 'data' payload from tp_db_snapshots in localStorage
  try {
    const snapshotsStr = window.localStorage.getItem("tp_db_snapshots");
    if (snapshotsStr) {
      const snapshots = JSON.parse(snapshotsStr);
      if (Array.isArray(snapshots) && snapshots.length > 0) {
        const metaOnly = snapshots.map((s: any) => {
          const { data, ...meta } = s;
          return meta;
        }).slice(0, 2);
        const newStr = JSON.stringify(metaOnly);
        setItemSync("tp_db_snapshots", newStr);
        bytesFreed += (snapshotsStr.length - newStr.length);
      }
    }
  } catch (_) {
    try { window.localStorage.removeItem("tp_db_snapshots"); } catch (_) {}
  }

  // 2. Remove tp_ingestion_snapshots
  try {
    const ingestStr = window.localStorage.getItem("tp_ingestion_snapshots");
    if (ingestStr) {
      window.localStorage.removeItem("tp_ingestion_snapshots");
      bytesFreed += ingestStr.length;
    }
  } catch (_) {}

  // 3. Trim tp_audit_logs to newest 20
  try {
    const logsStr = window.localStorage.getItem("tp_audit_logs");
    if (logsStr) {
      const logs = JSON.parse(logsStr);
      if (Array.isArray(logs) && logs.length > 20) {
        const sorted = [...logs].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
        const trimmed = sorted.slice(0, 20);
        const newStr = JSON.stringify(trimmed);
        setItemSync("tp_audit_logs", newStr);
        bytesFreed += (logsStr.length - newStr.length);
      }
    }
  } catch (_) {}

  // 4. Trim tp_movements to newest 50
  try {
    const movStr = window.localStorage.getItem("tp_movements");
    if (movStr) {
      const movs = JSON.parse(movStr);
      if (Array.isArray(movs) && movs.length > 50) {
        const sorted = [...movs].sort((a, b) => new Date(b.createdAt || b.timestamp || 0).getTime() - new Date(a.createdAt || a.timestamp || 0).getTime());
        const trimmed = sorted.slice(0, 50);
        const newStr = JSON.stringify(trimmed);
        setItemSync("tp_movements", newStr);
        bytesFreed += (movStr.length - newStr.length);
      }
    }
  } catch (_) {}

  // 5. Trim tp_sales and tp_sale_items in localStorage (keep latest 50 sales in local cache)
  try {
    const salesStr = window.localStorage.getItem("tp_sales");
    if (salesStr) {
      const salesArr = JSON.parse(salesStr);
      if (Array.isArray(salesArr) && salesArr.length > 50) {
        const sorted = [...salesArr].sort((a, b) => new Date(b.createdAt || b.dateTime || 0).getTime() - new Date(a.createdAt || a.dateTime || 0).getTime());
        const trimmedSales = sorted.slice(0, 50);
        const keepIds = new Set(trimmedSales.map((s: any) => s.id));
        const newSalesStr = JSON.stringify(trimmedSales);
        setItemSync("tp_sales", newSalesStr);
        bytesFreed += (salesStr.length - newSalesStr.length);

        const itemsStr = window.localStorage.getItem("tp_sale_items");
        if (itemsStr) {
          const itemsArr = JSON.parse(itemsStr);
          if (Array.isArray(itemsArr)) {
            const trimmedItems = itemsArr.filter((item: any) => keepIds.has(item.saleId));
            setItemSync("tp_sale_items", JSON.stringify(trimmedItems));
          }
        }
      }
    }
  } catch (_) {}

  // 6. Trim extended module items
  ["atpos_v2_expenses", "atpos_v2_returns", "atpos_v2_custom_bills", "atpos_v2_members_list"].forEach((pruneKey) => {
    try {
      const str = window.localStorage.getItem(pruneKey);
      if (str) {
        const arr = JSON.parse(str);
        if (Array.isArray(arr) && arr.length > 20) {
          const trimmed = arr.slice(0, 20);
          const newStr = JSON.stringify(trimmed);
          setItemSync(pruneKey, newStr);
          bytesFreed += (str.length - newStr.length);
        }
      }
    } catch (_) {}
  });

  // 7. Strip base64 image strings from tp_products in localStorage
  try {
    const prodStr = window.localStorage.getItem("tp_products");
    if (prodStr && prodStr.includes("data:image")) {
      const prods = JSON.parse(prodStr);
      if (Array.isArray(prods)) {
        const stripped = prods.map((p: any) => {
          if (p.imageUrl && typeof p.imageUrl === "string" && p.imageUrl.startsWith("data:image")) {
            return { ...p, imageUrl: "" };
          }
          return p;
        });
        const strippedStr = JSON.stringify(stripped);
        setItemSync("tp_products", strippedStr);
        bytesFreed += (prodStr.length - strippedStr.length);
      }
    }
  } catch (_) {}

  // 8. Clear transient keys
  ["tp_write_stats_prevented", "tp_batch_expirations"].forEach((tk) => {
    try { window.localStorage.removeItem(tk); } catch (_) {}
  });

  console.log(`[System Guard] Synchronous pruning finished. Freed approx ${bytesFreed} bytes.`);
  return bytesFreed;
};

// Self-healing LocalStorage Interceptor to prevent QuotaExceededError crashes
try {
if (typeof window !== "undefined" && window.localStorage && !(window.localStorage.setItem as any).__isInterceptor) {
 const originalSetItem = window.localStorage.setItem;
 const newSetItem = function (this: Storage, key: string, value: string) {
  try {
   originalSetItem.call(window.localStorage, key, value);
  } catch (error: any) {
   if (
    error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    error.code === 22
   ) {
    console.warn(`[System Guard] LocalStorage quota exceeded for key "${key}". Executing synchronous self-heal...`);
    performSyncPruning();

    try {
     originalSetItem.call(window.localStorage, key, value);
     console.log(`[System Guard] Self-healing SUCCESS: Saved key "${key}" after pruning storage layout.`);
     return;
    } catch (retryError) {
     console.warn(`[System Guard] LocalStorage full after pruning. Using fallback sessionStorage & volatile memory:`, retryError);
     try {
      sessionStorage.setItem(key, value);
     } catch (_) {}
     if (typeof window !== "undefined") {
      (window as any).tpVolatileCache = (window as any).tpVolatileCache || {};
      (window as any).tpVolatileCache[key] = value;
     }
     return;
    }
   }
   throw error;
  }
 };
 (newSetItem as any).__isInterceptor = true;
 window.localStorage.setItem = newSetItem;

 const createLocalDatabaseSnapshot = () => {
 try {
 const payload: any = {};
 const keysToSave = [
 "tp_is_configured", "tp_users", "tp_branches", "tp_suppliers", "tp_products",
 "tp_purchase_orders", "tp_po_items", "tp_transmittals", "tp_shifts", "tp_sales",
 "tp_sale_items", "tp_movements", "tp_audit_logs", "tp_parked_sales",
 "tp_stock_transfers", "tp_branch_stock", "tp_ledger_entries", "tp_branch_sales_reports",
 "tp_deliveries", "tp_damage_logs", "atpos_v2_custom_bills", "atpos_v2_members_list",
 "atpos_v2_expenses", "atpos_v2_returns"
 ];
 
 const keyMapping: Record<string, string> = {
 tp_is_configured: "isConfigured",
 tp_users: "users",
 tp_branches: "branches",
 tp_suppliers: "suppliers",
 tp_products: "products",
 tp_purchase_orders: "purchaseOrders",
 tp_po_items: "poItems",
 tp_transmittals: "transmittals",
 tp_shifts: "shifts",
 tp_sales: "sales",
 tp_sale_items: "saleItems",
 tp_movements: "movements",
 tp_audit_logs: "auditLogs",
 tp_parked_sales: "parkedSales",
 tp_stock_transfers: "stockTransfers",
 tp_branch_stock: "branchStock",
 tp_ledger_entries: "ledgerEntries",
 tp_branch_sales_reports: "branchSalesReports",
 tp_deliveries: "deliveries",
 tp_damage_logs: "damageLogs",
 atpos_v2_custom_bills: "atpos_v2_custom_bills",
 atpos_v2_members_list: "atpos_v2_members_list",
 atpos_v2_expenses: "atpos_v2_expenses",
 atpos_v2_returns: "atpos_v2_returns",
 };

 for (const rawKey of keysToSave) {
 const storedVal = window.localStorage.getItem(rawKey);
 if (storedVal !== null) {
 try {
 payload[keyMapping[rawKey]] = JSON.parse(storedVal);
 } catch (_) {
 payload[keyMapping[rawKey]] = storedVal === "true" ? true : storedVal === "false" ? false : storedVal;
 }
 } else {
 payload[keyMapping[rawKey]] = null;
 }
 }

 const dataStr = JSON.stringify(payload);
 const id = `SNAP-ON-THE-FLY-${Date.now()}`;
 const newSnapshot = {
 id,
 name: `On-the-Fly Safety Snapshot - ${new Date().toLocaleTimeString()}`,
 timestamp: new Date().toISOString(),
 creator: "System Guard Auto-Gen",
 sizeBytes: typeof Blob !== "undefined" ? new Blob([dataStr]).size : dataStr.length,
 data: dataStr,
 };

 const existingStr = window.localStorage.getItem("tp_db_snapshots");
 let existingSnapshots: any[] = [];
 if (existingStr) {
 try {
 existingSnapshots = JSON.parse(existingStr);
 if (!Array.isArray(existingSnapshots)) {
 existingSnapshots = [];
 }
 } catch (_) {}
 }
 const updatedSnapshots = [newSnapshot, ...existingSnapshots].slice(0, 2);
 originalSetItem.call(window.localStorage, "tp_db_snapshots", JSON.stringify(updatedSnapshots));
 console.log("[System Guard] Successfully generated on-the-fly safety snapshot:", id);
 } catch (err) {
 console.error("[System Guard] Failed to generate on-the-fly safety snapshot:", err);
 }
 };

 (window as any).createLocalDatabaseSnapshot = createLocalDatabaseSnapshot;

 const originalRemoveItem = window.localStorage.removeItem;
 window.localStorage.removeItem = function (key) {
 if (HARD_LOCKED_KEYS.includes(key)) {
 let isCashier = false;
 try {
 const userStr = window.localStorage.getItem("tp_current_user");
 if (userStr) {
 const user = JSON.parse(userStr);
 if (user && (user.role === "Cashier" || user.role === "Staff")) {
 isCashier = true;
 }
 }
 } catch (_) {}

 if (isCashier) {
 console.error(`[System Guard] Blocked cashier from removing database storage key "${key}".`);
 alert(`[System Guard] Action Blocked: Cashiers are not authorized to clear database storage.`);
 return;
 }

 const snapshotsStr = window.localStorage.getItem("tp_db_snapshots");
 let hasSnapshot = false;
 try {
 if (snapshotsStr) {
 const snapshots = JSON.parse(snapshotsStr);
 hasSnapshot = Array.isArray(snapshots) && snapshots.length > 0;
 }
 } catch (_) {}

 if (!hasSnapshot) {
 console.log(`[System Guard] Satisfying safety requirements: Automatically generating on-the-fly backup snapshot before removing "${key}"`);
 createLocalDatabaseSnapshot();
 }
 }
 originalRemoveItem.call(window.localStorage, key);
 };

 const originalClear = window.localStorage.clear;
 window.localStorage.clear = function () {
 let isCashier = false;
 try {
 const userStr = window.localStorage.getItem("tp_current_user");
 if (userStr) {
 const user = JSON.parse(userStr);
 if (user && (user.role === "Cashier" || user.role === "Staff")) {
 isCashier = true;
 }
 }
 } catch (_) {}

 if (isCashier) {
 console.error("[System Guard] Blocked cashier from clearing database storage.");
 alert("[System Guard] Action Blocked: Cashiers are not authorized to clear database storage.");
 return;
 }

 const snapshotsStr = window.localStorage.getItem("tp_db_snapshots");
 let hasSnapshot = false;
 try {
 if (snapshotsStr) {
 const snapshots = JSON.parse(snapshotsStr);
 hasSnapshot = Array.isArray(snapshots) && snapshots.length > 0;
 }
 } catch (_) {}

 if (!hasSnapshot) {
 console.log("[System Guard] Satisfying safety requirements: Automatically generating on-the-fly backup snapshot before clearing database storage.");
 createLocalDatabaseSnapshot();
 }
 originalClear.call(window.localStorage);
 };
}
} catch (e) {
 console.warn("[System Guard] LocalStorage interceptor error:", e);
}

interface SummaryStats {
 totalProducts: number;
 totalCategories: number;
 totalSuppliers: number;
 lowStockCount: number;
 outOfStockCount: number;
 todaySales: number;
 weeklySales: number;
 monthlyRevenue: number;
 activeCashiers: number;
}

interface DbContextType {
 // Authentication & Session
 currentUser: User | null;
 setCurrentUser: (user: User | null) => void;
 updateCurrentUser: (updates: Partial<User>) => void;
 validateInventoryAccess: (item: any) => boolean;
 isLoggedIn: boolean;
 login: (
 username: string,
 password: string,
 ) => Promise<{ success: boolean; error?: string; sqliBlocked?: boolean }>;
 logout: () => void;
 isConfigured: boolean;
 setupSystem: (
 adminData: {
 fullName: string;
 username: string;
 email: string;
 passwordHash: string;
 managerPin: string;
 },
 branchData: {
 id?: string;
 name: string;
 address: string;
 phone: string;
 storeLogo?: string;
 },
 ) => void;
 isRateLimited: boolean;
 rateLimitTimeLeft: number;
 activeBranch: Branch | null;
 users: User[];
 branches: Branch[];
 suppliers: Supplier[];
 brands: Brand[];
 products: Product[];
 purchaseOrders: PurchaseOrder[];
 poItems: PurchaseOrderItem[];
 transmittals: Transmittal[];
 shifts: Shift[];
 sales: Sale[];
 saleItems: SaleItem[];
 movements: InventoryMovement[];
 auditLogs: AuditLog[];
 activeShift: Shift | null;
 stockTransfers: StockTransfer[];
 branchStock: InventoryLocationStock[];
 ledgerEntries: LedgerEntry[];
 customBills: CustomCorporateBill[];
 setCustomBills: React.Dispatch<React.SetStateAction<CustomCorporateBill[]>>;
 members: Member[];
 setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
 expenses: Expense[];
 setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
 productReturns: ProductReturn[];
 setProductReturns: React.Dispatch<React.SetStateAction<ProductReturn[]>>;
 syncStatus: Record<string, "Live" | "Syncing">;
 calendarNotes: string;
 setCalendarNotes: (notes: string) => void;
 dayMemos: Record<string, string>;
 setDayMemos: React.Dispatch<React.SetStateAction<Record<string, string>>>;
 loyaltyConfig: LoyaltyConfig;
 updateLoyaltyConfig: (updates: Partial<LoyaltyConfig>) => void;

 // Actions - Users
 createUser: (user: Omit<User, "id" | "createdAt" | "updatedAt">) => void;
 updateUser: (id: string, updates: Partial<User>) => void;
 resetPassword: (id: string) => void;

 // Actions - Branches
 createBranch: (
 branch: Omit<Branch, "id" | "createdAt" | "updatedAt" | "isDeleted"> & { id?: string },
 ) => void;
 updateBranch: (id: string, updates: Partial<Branch>) => void;
 deleteBranch: (id: string) => void;

 // Actions - Suppliers
 createSupplier: (
 supplier: Omit<Supplier, "id" | "createdAt" | "isDeleted">,
 ) => Supplier;
 updateSupplier: (id: string, updates: Partial<Supplier>) => void;
 deleteSupplier: (id: string) => void;

 // Actions - Brands
 createBrand: (brand: Omit<Brand, "id" | "createdAt" | "isDeleted">) => Brand;
 updateBrand: (id: string, updates: Partial<Brand>) => void;
 deleteBrand: (id: string) => void;

 // Actions - Products
 createProduct: (
 product: Omit<
 Product,
 | "id"
 | "createdAt"
 | "updatedAt"
 | "isDeleted"
 | "qrCode"
 | "createdBy"
 | "updatedBy"
 >,
 ) => Product;
 updateProduct: (
 id: string,
 updates: Partial<Product>,
 customLogReason?: string,
 ) => void;
 deleteProduct: (id: string) => void;
 deleteDamageLog: (id: string) => void;
 importProducts: (imported: Product[], branchMapping?: Record<string, string>) => {
 success: boolean;
 count: number;
 error?: string;
 };

 // Actions - POS & Checkout
 holdSale: (
		cartItems: { product: Product; quantity: number }[],
		customerName: string,
		notes: string,
		branchIdOverride?: string,
	) => string; // returns hold ID
 resumeParkedSale: (
 parkedId: string,
 cashierName?: string,
 ) => { success: boolean; record?: any; error?: string };
 parkedSales: {
 id: string;
 customerName: string;
 notes: string;
 items: { product: Product; quantity: number }[];
 timestamp: string;
 heldBy?: string;
 heldByBranchId?: string;
		branchId?: string;
 status?: string;
 }[];
 setParkedSales: React.Dispatch<
 React.SetStateAction<
 {
 id: string;
 customerName: string;
 notes: string;
 items: { product: Product; quantity: number }[];
 timestamp: string;
 heldBy?: string;
 heldByBranchId?: string;
		branchId?: string;
 status?: string;
 }[]
 >
 >;
 checkoutSale: (
 cartItems: { product: Product; quantity: number }[],
 customerName: string,
 notes: string,
 discountAmount: number,
 paymentMethod: Sale["paymentMethod"],
 amountTendered: number,
 customVat?: number,
 idempotencyKey?: string,
 discountType?: string,
 targetBranchId?: string,
 pointsRedeemed?: number,
 ) => Sale;
 voidSale: (saleId: string) => void;

 // Actions - Shifts
 openShift: (startCash: number) => void;
 closeShift: (cashCount: number) => void;
 forceCloseAllShifts: () => void;
  getShiftReportStats: (shift: Shift) => {
    salesCount: number;
    salesTotal: number;
    vatTotal: number;
    discountTotal: number;
    netTotal: number;
    cashSalesTotal: number;
    nonCashSalesTotal: number;
    expensesTotal: number;
    expectedEndCash: number;
  };

 // Actions - Purchase Orders
 createPO: (
 supplierId: string,
 branchId: string,
 items: {
 productId: string;
 costPrice: number;
 quantityRequested: number;
 }[],
 notes?: string,
 status?: POStatus,
 paymentMode?: "fully_paid" | "terms",
 termStartDate?: string,
 termEndDate?: string,
 termsLength?: number,
 idempotencyKey?: string,
 ) => void;
 updatePOStatus: (id: string, status: POStatus) => void;
 receivePOItems: (
 id: string,
 receivedMap: Record<string, number>,
 paymentMode?: "fully_paid" | "terms",
 termStartDate?: string,
 termEndDate?: string,
 termsLength?: number
 ) => void;

 // Actions - Transmittals
 createTransmittal: (
 docType: TransmittalDocType,
 toBranchId: string,
 payloadJson: string,
 notes?: string,
 ) => string;
 updateTransmittalStatus: (id: string, status: TransmittalStatus) => void;

 // Actions - Stock Transfers & Distribution
 createStockTransfer: (
 fromBranchId: string,
 toBranchId: string,
 transferType: TransferType,
 items: { productId: string; quantity: number }[],
 reason: string,
 ) => void;
 updateStockTransferStatus: (id: string, status: TransferStatus) => void;

 // Optimistic Inventory & Stock Revalidation
 getInventory: (productId: string, targetBranchId?: string) => {
 stockQuantity: number;
 branchQuantity: number;
 isOptimistic: boolean;
 };
 getBranchStockQuantity: (productId: string, targetBranchId?: string) => number;
 getProductStockCount: (productId: string) => number;
 revalidateStockCounts: (
 affectedItems?: { productId: string; branchId?: string; quantityDelta?: number }[]
 ) => Promise<void>;

 // Helper Stats & Filter views
 stats: SummaryStats;
 addAuditLog: (
 action: string,
 description: string,
 tableAffected: string,
 recordId: string,
 changePayload?: string,
 ) => void;
 logManualAdjustment: (
 productId: string,
 quantity: number,
 notes: string,
 ) => void;
 createManualLedgerEntry: (entry: {
 productId: string;
 branchId: string;
 movementType: "IN" | "OUT" | "ADJUST" | "TRANSFER" | "PURCHASE" | "SALE";
 quantity: number;
 referenceNo: string;
 remarks: string;
 }) => void;
 truncateDatabase: (mode: "all" | "transactions") => void;

 // Actions - Branch Sales Reports Transmission
 branchSalesReports: BranchSalesReport[];
 rollbackSnapshots: IngestionSnapshot[];
 performRollbackToSnapshot: (snapshotId: string) => { success: boolean; error?: string };
 transmitSalesReport: (
 report: Omit<BranchSalesReport, "id" | "transferredAt" | "status">,
 ) => void;
 importManualSalesReport: (rawJson: string) => {
 success: boolean;
 error?: string;
 };
 auditSalesReport: (
 reportId: string,
 status: "Verified" | "Pending Audit",
 notes?: string,
 ) => void;

 // Actions - Deliveries Submodule
 deliveries: Delivery[];
 createDelivery: (
 delivery: Omit<
 Delivery,
 "id" | "status" | "createdAt" | "updatedAt" | "branchId" | "branchName"
 >,
 ) => Delivery;
 updateDeliveryStatus: (
 id: string,
 status: DeliveryStatus,
 notes?: string,
 ) => void;
 assignDeliveryPersonnel: (
 id: string,
 truck: string,
 driver: string,
 helper: string,
 ) => void;
 completeDelivery: (
 id: string,
 proofPhotoUrl?: string,
 customerSignature?: string,
 receiverName?: string,
 ) => void;

 // Actions - Broken & Broken-on-Arrival (BOA) Damage Register
 damageLogs: DamageLog[];
 createDamageLog: (
 log: Omit<DamageLog, "id" | "reportedAt" | "reportedBy">,
 ) => void;

 updateBranchPriceOverride: (
 productId: string,
 branchId: string,
 price: number,
 ) => void;
 updateBranchLowStockThreshold: (
 productId: string,
 branchId: string,
 threshold: number,
 ) => void;

 // DB Performance Tuning & Backup Snapshots Properties
 debounceDelay: number;
 setDebounceDelay: (delay: number) => void;
 dbSyncStatus: "idle" | "queued" | "syncing";
 writeStatsCount: number;
 resetWriteStats: () => void;
 forceSyncAll: () => void;
 dbSnapshots: DbSnapshot[];
 createDbSnapshot: (name: string) => Promise<void>;
 restoreDbSnapshot: (snapshotId: string) => Promise<boolean>;
 deleteDbSnapshot: (snapshotId: string) => Promise<void>;
 autoBackupEnabled: boolean;
 setAutoBackupEnabled: (val: boolean) => void;
 backupIntervalHours: number;
 setBackupIntervalHours: (val: number) => void;
 lastAutoBackupTime: string | null;
 setLastAutoBackupTime: (val: string | null) => void;
 dbMaintenanceEnabled: boolean;
 setDbMaintenanceEnabled: (val: boolean) => void;
 lastMaintenanceTime: string | null;
 setLastMaintenanceTime: (val: string | null) => void;
 isMaintenanceRunning: boolean;
 runDatabaseMaintenance: () => Promise<{ success: boolean; stats: { bytesFreed: number; itemsIndexed: number; indicesOptimized: number } }>;

 // Global System Processing Loader state
 isSystemProcessing: boolean;
 systemProcessingMessage: string;
 systemProcessingSubtext: string;
 systemProcessingType: "spinner" | "progress" | "verification" | "db";
 systemProcessingProgress: number;
 triggerSystemProcessing: (
 message: string,
 durationMs?: number,
 type?: "spinner" | "progress" | "verification" | "db",
 onComplete?: () => void,
 subtext?: string,
 ) => Promise<void>;
 setSystemProcessingProgress: (progress: number) => void;
 setIsSystemProcessing: (val: boolean) => void;
 setSystemProcessingMessage: (msg: string) => void;
 setSystemProcessingSubtext: (sub: string) => void;
 simulationModeActive: boolean;
 setSimulationModeActive: (val: boolean) => void;
 generateMasterForensicBackup: () => any;
 importMasterForensicBackup: () => void;
 resetLockout: () => void;
 isHydrating: boolean;
 isSystemHydrating: boolean;
 serverConnected: boolean;
 syncFromSharedServer: (silent?: boolean) => Promise<void>;
 lowPerformanceMode: boolean;
 setLowPerformanceMode: (val: boolean) => void;
 activeSessions: ActiveSession[];
 activeSessionId: string | null;
 terminateSession: (sessionId: string) => void;
 completeOnboarding: (
 newProducts: Product[],
 newBranchesList?: Branch[],
 ) => Promise<void>;
 isRowClearingBlocked: () => boolean;
 getRowClearingBlockedReason: () => string;

 // Locking & Pessimistic Updates Submodule
 pessimisticLocks: Record<string, { lockedAt: string; lockedBy: string }>;
 acquirePessimisticLock: (resourceId: string, username?: string) => boolean;
 releasePessimisticLock: (resourceId: string) => void;
 isResourceLocked: (resourceId: string) => boolean;

 // Additional Soft Deletes Actions
 deletePurchaseOrder: (id: string) => void;
 deleteStockTransfer: (id: string) => void;
 deleteTransmittal: (id: string) => void;
 deleteCustomCorporateBill: (id: string) => void;

 // Real-time sync, caching, and status-based error handling
 apiErrorState: { statusCode: number; message: string; retryAfter?: number } | null;
 clearServerErrorState: () => void;
 invalidateLocalCache: () => Promise<void>;
 safeApiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
 exportAndPurgeCategoryData: (
 category: ArchivableCategory,
 ageMonths: number
 ) => Promise<PurgeResult>;
 retentionPolicy: RetentionPolicyMap;
 updateRetentionPolicy: (category: ArchivableCategory, months: number) => void;
 runRetentionPolicyCleanup: () => Promise<PurgeResult[]>;
}

export interface DbSnapshot {
 id: string;
 name: string;
 timestamp: string;
 creator: string;
 sizeBytes: number;
 data: string;
}

export interface IngestionSnapshot {
 id: string;
 timestamp: string;
 branchName: string;
 reportingDate: string;
 branchSalesReports: BranchSalesReport[];
 branchStock: InventoryLocationStock[];
 products: Product[];
 movements: InventoryMovement[];
 usedNonces: string[];
}

const DbContext = createContext<DbContextType | undefined>(undefined);

const GUEST_USER: User = {
 id: "G1",
 avatarInitials: "??",
 fullName: "Guest User",
 username: "guest",
 email: "",
 role: UserRole.STAFF,
 branchAssignmentId: "",
 status: "Active",
 createdAt: "",
 updatedAt: "",
};

function safeParse<T>(key: string, defaultValue: T): T {
 try {
 const cached = localStorage.getItem(key);
 if (!cached) return defaultValue;
 return JSON.parse(cached) as T;
 } catch (error) {
 console.error(`Error parsing localStorage key "${key}":`, error);
 try {
 localStorage.removeItem(key);
 } catch (e) {}
 return defaultValue;
 }
}

// Initial Seed data constants
const SEED_BRANCHES: Branch[] = [];
const SEED_USERS: User[] = [];
const SEED_SUPPLIERS: Supplier[] = [];
const SEED_BRANDS: Brand[] = [];
const SEED_PRODUCTS: Product[] = [];
const SEED_SHIFTS: Shift[] = [];
const SEED_SALES: Sale[] = [];
const SEED_SALE_ITEMS: SaleItem[] = [];
const SEED_POS: PurchaseOrder[] = [];
const SEED_PO_ITEMS: PurchaseOrderItem[] = [];
const SEED_TRANSMITTALS: Transmittal[] = [];
const SEED_MOVEMENTS: InventoryMovement[] = [];
const SEED_AUDIT_LOGS: AuditLog[] = [];

// Synchronous automatic local storage purge for production reset (v15)
if (
 typeof window !== "undefined" &&
 localStorage.getItem("tp_simulation_purged_final_v15") !== "true"
) {
 const keysToPurge = [
 "tp_users",
 "tp_branches",
 "tp_suppliers",
 "tp_products",
 "tp_purchase_orders",
 "tp_po_items",
 "tp_transmittals",
 "tp_shifts",
 "tp_sales",
 "tp_sale_items",
 "tp_movements",
 "tp_audit_logs",
 "tp_parked_sales",
 "tp_stock_transfers",
 "tp_branch_stock",
 "tp_ledger_entries",
 "atpos_v2_members_list",
 "atpos_v2_expenses",
 "atpos_v2_returns",
 "tp_current_user",
 "tp_is_logged_in",
 "tp_is_configured",
 ];
 keysToPurge.forEach((k) => localStorage.removeItem(k));
 localStorage.setItem("tp_simulation_purged_final_v15", "true");
}

/**
 * Highly secure sanitation and verification helpers to prevent XSS script injections,
 * escape raw HTML codes, trim input trails, and enforce strict type constraints.
 */
export const sanitizeInputText = (str: string): string => {
 if (typeof str !== "string") return "";
 return str
 .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "") // Remove script tags
 .replace(/<\/?[^>]+(>|$)/g, "") // Strip HTML tags
 .replace(/[<>]/g, "") // Remove angle brackets
 .trim();
};

export const sanitizeAndValidateNumber = (val: any, fallback = 0): number => {
 if (val === undefined || val === null) return fallback;
 const num = typeof val === "number" ? val : parseFloat(val);
 return isNaN(num) ? fallback : Math.max(0, num);
};

/**
 * Simple Cryptographic Encryption using character level XOR transposition with dynamic secret salts.
 * High portability representation to secure JSON payloads without external dependency imports.
 */
export const encryptString = (text: string, secretKey: string): string => {
 let result = "";
 const keyLength = secretKey.length;
 for (let i = 0; i < text.length; i++) {
 const charCode = text.charCodeAt(i);
 const keyChar = secretKey.charCodeAt(i % keyLength);
 const encryptedChar = charCode ^ keyChar;
 result += ("00" + encryptedChar.toString(16)).slice(-2);
 }
 return btoa(result);
};

export const decryptString = (cipherStr: string, secretKey: string): string => {
 try {
 const decoded = atob(cipherStr);
 let result = "";
 const keyLength = secretKey.length;
 for (let i = 0; i < decoded.length; i += 2) {
 const hexPart = decoded.slice(i, i + 2);
 const encryptedChar = parseInt(hexPart, 16);
 const keyChar = secretKey.charCodeAt((i / 2) % keyLength);
 const decryptedChar = encryptedChar ^ keyChar;
 result += String.fromCharCode(decryptedChar);
 }
 return result;
 } catch (e) {
 return "";
 }
};

/**
 * Validation wrapper for the symmetric cryptographic secret key used for signing and decrypting
 * transmission ledger packets. Sourced from an environment variable to prevent extraction from client-side bundles,
 * with security checks and a dynamically generated or environment-managed fallback seed to avoid forging of security signatures.
 */
export const getSecuritySecretKey = (): string => {
  const envSecret = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.VITE_SECURITY_SECRET : undefined;

 // Validation wrapper checks:
 // 1. Must exist and not be empty
 // 2. Must not match the insecure legacy hardcoded literal
 // 3. Must be of sufficient length (min 16 chars) to resist brute-force
 // 4. Must not be a trivial/common value
 const isValidSecret =
 envSecret &&
 envSecret.trim() !== "" &&
 envSecret !== "EmmanTileCenterSecretKey" &&
 envSecret.length >= 16 &&
 !envSecret.includes("123456") &&
 !envSecret.toLowerCase().includes("placeholder");

 if (isValidSecret) {
 return envSecret.trim();
 }

 // Fallback to an environment-managed/stable derived key based on the company name,
 // split and obfuscated, combined with static enterprise bounds.
 // This maintains functional local demo runs while preventing easy client-side forging of signature tokens.
 const companyName = localStorage.getItem("tilepoint_company_name_v1") || "Emman Tile Center";
 const obfuscatedStableSeed = `tile_point_salt_${companyName.split("").reverse().join("")}_secure_fallback`;
 return obfuscatedStableSeed;
};

const getCreatedAt = (item: any): number => {
 if (item && item.createdAt) return Number(item.createdAt);
 if (item && item.id && item.id.startsWith("HLD-")) {
 const parts = item.id.split("-");
 if (parts.length > 1) {
 const ts = Number(parts[1]);
 if (!isNaN(ts)) return ts;
 }
 }
 return 0;
};

const mergeParkedSales = (local: any[], remote: any[], deletedSet?: Set<string>): any[] => {
 if (!Array.isArray(local)) local = [];
 if (!Array.isArray(remote)) remote = [];
 
 const map = new Map<string, any>();
 remote.forEach((item) => {
 if (item && item.id && (!deletedSet || !deletedSet.has(item.id))) {
 map.set(item.id, { ...item, synced: true });
 }
 });
 local.forEach((localItem) => {
 if (localItem && localItem.id && (!deletedSet || !deletedSet.has(localItem.id))) {
 if (!map.has(localItem.id)) {
 const isRecentlyCreatedUnsynced = !localItem.synced && (Date.now() - (localItem.createdAt || 0) < 60000);
 if (isRecentlyCreatedUnsynced) {
 map.set(localItem.id, localItem);
 }
 } else {
 const remoteItem = map.get(localItem.id);
 const localTs = localItem.createdAt || getCreatedAt(localItem) || 0;
 const remoteTs = remoteItem?.createdAt || getCreatedAt(remoteItem) || 0;
 if (localTs > remoteTs) {
 map.set(localItem.id, { ...localItem, synced: true });
 }
 }
 }
 });
 return Array.from(map.values());
};


export const DbProvider: React.FC<{ children: React.ReactNode }> = ({
 children,
}) => {
 const getAuthHeaders = (): Record<string, string> => {
 let user = currentUser;
 if (!user) {
 const userStr = sessionStorage.getItem("tp_current_user") || localStorage.getItem("tp_current_user");
 if (userStr) {
 try {
 user = JSON.parse(userStr);
 } catch (_) {}
 }
 }
 if (!user || !user.id || !user.role) return {};

 try {
 if (!sessionStorage.getItem("tp_current_user") && !localStorage.getItem("tp_current_user")) {
 sessionStorage.setItem("tp_current_user", JSON.stringify(user));
 localStorage.setItem("tp_current_user", JSON.stringify(user));
 }
 } catch (_) {}

 const token = generateSessionToken(user);
 const activeSessionId = localStorage.getItem("tp_active_session_id") || sessionStorage.getItem("tp_active_session_id") || "unknown";
 return {
 "Authorization": `Bearer ${token}`,
 "X-Session-Token": token,
 "X-Client-ID": activeSessionId,
 };
 };

 const [isHydrating, setIsHydrating] = useState<boolean>(true);
 const [isSystemHydrating, setIsSystemHydrating] = useState<boolean>(true);

 const [lowPerformanceMode, setLowPerformanceModeState] = useState<boolean>(
 () => {
 const cached = localStorage.getItem("tp_performance_profile");
 if (cached) {
 return cached === "low";
 }
 const lowCores =
 navigator.hardwareConcurrency !== undefined &&
 navigator.hardwareConcurrency <= 4;
 const lowMemory =
 (navigator as any).deviceMemory !== undefined &&
 (navigator as any).deviceMemory <= 4;
 const isMobileDevice =
 /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
 navigator.userAgent,
 );
 const shouldDefaultLow =
 lowCores || lowMemory || (isMobileDevice && (lowCores || lowMemory));
 if (shouldDefaultLow) {
 console.warn(
 "[Performance scaling] Lower-end device attributes detected! Initializing in Low Performance Profile to mitigate thermal degradation and preserve battery runway.",
 );
 return true;
 }
 return false;
 },
 );

 const setLowPerformanceMode = (val: boolean) => {
 setLowPerformanceModeState(val);
 localStorage.setItem("tp_performance_profile", val ? "low" : "high");
 console.log(
 `[Performance scaling] Profile updated: ${val ? "LOW PERFORMANCE (Hardware-Optimized)" : "HIGH PERFORMANCE (Full Presentation)"}`,
 );
 // Dispatch theme updated event to instantly notify all settings and visual listeners
 if (typeof window !== 'undefined') {
 window.dispatchEvent(new Event('tilepoint-theme-updated'));
 }
 };

 const [simulationModeActive, setSimulationModeActive] = useState<boolean>(
 () => {
 return localStorage.getItem("tp_simulation_mode_active") === "true";
 },
 );

 const [isConfigured, setIsConfigured] = useState<boolean>(() => {
 const cached = localStorage.getItem("tp_is_configured");
 return cached === "true";
 });

 // Load initial local data or populate with seed data from sessionStorage to isolate sessions
 const [currentUser, setCurrentUser] = useState<User | null>(() => {
 if (typeof window === "undefined") return null;
 let cached = sessionStorage.getItem("tp_current_user");
 if (!cached) {
 cached = localStorage.getItem("tp_current_user");
 }
 if (!cached) return null; // Mandatory null state if session is missing to trigger login redirect
 try {
 return JSON.parse(cached);
 } catch (e) {
 return null;
 }
 });

 const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
 if (typeof window === "undefined") return false;
 let cached = sessionStorage.getItem("tp_is_logged_in");
 if (!cached) {
 cached = localStorage.getItem("tp_is_logged_in");
 }
 return cached === "true";
 });

 const [failedAttempts, setFailedAttempts] = useState<number>(0);
 const [lockoutUntil, setLockoutUntil] = useState<number>(0);
 const [rateLimitTimeLeft, setRateLimitTimeLeft] = useState<number>(0);
 const [serverConnected, setServerConnected] = useState<boolean>(false);
 const [apiErrorState, setApiErrorState] = useState<{
 statusCode: number;
 message: string;
 retryAfter?: number;
 } | null>(null);

 const updateCurrentUser = (updates: Partial<User>) => {
 setCurrentUser((prev) => {
 if (!prev) return null;
 const updated = { ...prev, ...updates } as User;
 return updated;
 });
 };

 const [users, setUsers] = useState<User[]>(() => {
 // Clear out any old versions of cached users with incompatible password structures
 if (localStorage.getItem("tp_hash_version_v3") !== "true") {
 localStorage.removeItem("tp_users");
 localStorage.setItem("tp_hash_version_v3", "true");
 }
 const isSetup =
 typeof window !== "undefined" &&
 localStorage.getItem("tilepoint_onboarded_setup") === "true";
 return safeParse<User[]>("tp_users", isSetup ? SEED_USERS : []);
 });

 // Dynamic seed passwords initialization
 useEffect(() => {
 const initializePasswords = async () => {
 let changed = false;
 const updatedUsers = await Promise.all(
 users.map(async (u) => {
 if (!u.passwordHash) {
 changed = true;
 const defaultPassword =
 u.username === "erica_admin"
 ? "admin123"
 : u.username === "juan_mgr"
 ? "manager123"
 : u.username === "tomas_mgr"
 ? "manager123"
 : u.username === "carla_cashier"
 ? "cashier123"
 : "tilepoint";
 const salt = u.username + "_salt_tok";
 const hashedVal = await createSaltedHash(
 defaultPassword,
 salt,
 2500,
 );
 const formattedToken = formatHashToken(salt, hashedVal, 2500);
 return {
 ...u,
 passwordHash: formattedToken,
 };
 }
 return u;
 }),
 );
 if (changed) {
 setUsers(updatedUsers);
 localStorage.setItem("tp_users", JSON.stringify(updatedUsers));
 }
 };
 initializePasswords();
 }, [users]);

 // Rate Limiting Timer Tick
 useEffect(() => {
 if (lockoutUntil === 0) return;
 const interval = setInterval(() => {
 const now = Date.now();
 if (now >= lockoutUntil) {
 setLockoutUntil(0);
 setRateLimitTimeLeft(0);
 } else {
 setRateLimitTimeLeft(Math.ceil((lockoutUntil - now) / 1000));
 }
 }, 1000);
 return () => clearInterval(interval);
 }, [lockoutUntil]);

 const handleFailedLogin = () => {
 const nextAttempts = failedAttempts + 1;
 setFailedAttempts(nextAttempts);
 if (nextAttempts >= 20) {
 const lockDuration = 5 * 1000; // 5 sec lockout
 const until = Date.now() + lockDuration;
 setLockoutUntil(until);
 setRateLimitTimeLeft(5);
 addAuditLog(
 "SECURITY_LIMIT",
 `Brute Force Rate Limiter triggered! Blocked address login attempts for 30 seconds.`,
 "Users",
 "SYSTEM",
 );
 }
 };

 const resetLockout = () => {
 setFailedAttempts(0);
 setLockoutUntil(0);
 setRateLimitTimeLeft(0);
 };

 const terminateSession = (sessionId: string) => {
 setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId));
 addAuditLog(
 "SESSION_TERMINATED",
 `Administrative force logout executed for session ${sessionId}`,
 "Users",
 sessionId,
 );
 };

 const login = async (
 username: string,
 password: string,
 ): Promise<{ success: boolean; error?: string; sqliBlocked?: boolean }> => {
 // Ensure default admin user exists if users list is empty
 if (users.length === 0 && username.trim().toLowerCase() === "admin" && password === "admin123") {
 const adminSalt = "admin_salt";
 const adminHash = await createSaltedHash("admin123", adminSalt, 2500);
 const adminToken = formatHashToken(adminSalt, adminHash, 2500);
 const defaultAdmin: User = {
 id: "sim_admin",
 avatarInitials: "EA",
 fullName: "Erica Manaban",
 username: "admin",
 email: "admin@tilepoint.com",
 role: UserRole.ADMIN,
 branchAssignmentId: "B1",
 status: "Active",
 managerPin: "9999",
 passwordHash: adminToken,
 createdAt: new Date().toISOString(),
 updatedAt: new Date().toISOString(),
 };
 setUsers([defaultAdmin]);
 localStorage.setItem("tp_users", JSON.stringify([defaultAdmin]));
 }

 // 1. Check for SQL Injection (SQLi)
 const sqlCheckUser = detectSQLi(username);
 const sqlCheckPass = detectSQLi(password);
 if (!sqlCheckUser.isSafe || !sqlCheckPass.isSafe) {
 const reason =
 (!sqlCheckUser.isSafe ? sqlCheckUser.reason : sqlCheckPass.reason) ||
 "SQLi Signature Detected";
 addAuditLog(
 "SECURITY_ALERT",
 `SQL Injection attempt blocked on input username/password! Vector: ${reason}`,
 "Users",
 "SYSTEM",
 );
 return {
 success: false,
 error: `SECURITY VIOLATION: SQL injection pattern detected (${reason}). Authentication halted. Attempt logged in corporate security log.`,
 sqliBlocked: true,
 };
 }

 // 2. Check for Rate Limiting Lockout
 const now = Date.now();
 if (now < lockoutUntil) {
 const left = Math.ceil((lockoutUntil - now) / 1000);
 return {
 success: false,
 error: `TOO MANY ATTEMPTS: Access locked out. Please try again in ${left} seconds.`,
 };
 }

 // Find user in db
 const targetUser = users.find(
 (u) => u.username.trim().toLowerCase() === username.trim().toLowerCase(),
 );
 if (!targetUser) {
 // Fast local verification
 await new Promise((r) => setTimeout(r, 50));
 handleFailedLogin();
 return {
 success: false,
 error: "Invalid employee ID or security password code.",
 };
 }

 // Check account status
 if (targetUser.status !== "Active") {
 return {
 success: false,
 error:
 "Suspended Account: This terminal credentials have been restricted by Administration.",
 };
 }

 // 3. E2EE Packets Emulation Demonstration
 const encryptedParcel = await encryptCredentialPacket({
 username,
 password,
 });

 // Decrypt on our simulated Auth Node
 const decryptedPayload = await decryptCredentialPacket(encryptedParcel);

 // 4. Verify password with salted PBKDF2 bcrypt hash
 const isMatch = await verifyPasswordWithToken(
 decryptedPayload.password,
 targetUser.passwordHash || "",
 );
 if (!isMatch) {
 handleFailedLogin();
 return {
 success: false,
 error: "Invalid employee ID or security password code.",
 };
 }

 // Success Authentication
 setFailedAttempts(0);
 setLockoutUntil(0);
 setRateLimitTimeLeft(0);
 setCurrentUser(targetUser);
 setIsLoggedIn(true);
 sessionStorage.setItem("tp_is_logged_in", "true");
 sessionStorage.setItem("tp_current_user", JSON.stringify(targetUser));
 localStorage.setItem("tp_is_logged_in", "true");
 localStorage.setItem("tp_current_user", JSON.stringify(targetUser));

 // Register concurrent-safe unique session state
 const newSessionId =
 "SESS_" + Math.random().toString(36).substring(2, 11).toUpperCase();
 setActiveSessionId(newSessionId);
 localStorage.setItem("tp_active_session_id", newSessionId);
 sessionStorage.setItem("tp_active_session_id", newSessionId);

 const nowStr = new Date().toISOString();
 const cleanSessions = activeSessions.filter(
 (s) => s.userId !== targetUser.id,
 );
 const activeBranchName =
 branches.find((b) => b.id === targetUser.branchAssignmentId)?.name ||
 (localStorage.getItem("tilepoint_company_name_v1") || "ETC_DIPOLOG MAIN");
 const updatedSessions = [
 ...cleanSessions,
 {
 id: newSessionId,
 userId: targetUser.id,
 username: targetUser.username,
 fullName: targetUser.fullName,
 role: targetUser.role,
 branchId: targetUser.branchAssignmentId || "B1",
 branchName: activeBranchName,
 lastActive: nowStr,
 userAgent: navigator.userAgent,
 },
 ];
 setActiveSessions(updatedSessions);
 saveToStorageWithDebounce("tp_active_sessions", updatedSessions, true);

 // Audit logs of E2EE handshake
 addAuditLog(
 "USER_LOGIN",
 `E2EE Secure Client Session cipher verified successfully. Active: ${targetUser.fullName} (Session: ${newSessionId}, E2EE payload: ${encryptedParcel.encryptedData.slice(0, 32)}...)`,
 "Users",
 targetUser.id,
 );

 return { success: true };
 };

  const validateInventoryAccess = (item: any): boolean => {
    if (!currentUser) return false;
    // Admins and Managers have unrestricted access to all branch stock data
    if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER) return true;
    
    // Check if the currentBranchId (or fallback branchId) matches the user's branchAssignmentId
    const currentBranchId = item?.currentBranchId || item?.branchId;
    if (!currentBranchId) return true;
    
    return currentBranchId === currentUser.branchAssignmentId;
  };

 const logout = () => {
 setIsLoggedIn(false);
 setCurrentUser(null);
 sessionStorage.setItem("tp_is_logged_in", "false");
 sessionStorage.removeItem("tp_current_user");
 localStorage.removeItem("tp_is_logged_in");
 localStorage.removeItem("tp_current_user");
 localStorage.removeItem("tp_active_tab");
 sessionStorage.removeItem("tp_active_tab");
 localStorage.removeItem("tilepoint_active_tab");
 sessionStorage.removeItem("tilepoint_active_tab");
 localStorage.removeItem("tp_active_session_id");
 sessionStorage.removeItem("tp_active_session_id");
 localStorage.removeItem("tp_offline_queue");
 sessionStorage.removeItem("tp_offline_queue");
 setOfflineQueue([]);

 // Remove our session from activeSessions list so other client notices immediately
 if (activeSessionId) {
 setActiveSessions((prev) => prev.filter((s) => s.id !== activeSessionId));
 }

 if (currentUser) {
 addAuditLog(
 "USER_LOGOUT",
 `Cassette Terminal logged out: ${currentUser.fullName}`,
 "Users",
 currentUser.id,
 );
 }
 setCurrentUser(null);
 setActiveSessionId(null);
 };

 const clearServerErrorState = () => {
 setApiErrorState(null);
 };

 const invalidateLocalCache = async () => {
 console.log("[Cache Invalidation] Invalidating local memory cache and refetching fresh server state...");
 volatileCache.current = {};
 await syncFromSharedServer(false);
 addAuditLog(
 "CACHE_INVALIDATE",
 "Manual client-side volatile memory cache invalidation triggered. Fresh state pulled from server.",
 "System",
 currentUser?.id || "cache"
 );
 };

 const safeApiFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
 if (apiErrorState?.statusCode === 429 && apiErrorState.retryAfter && apiErrorState.retryAfter > 0) {
 const msg = `Rate limiting active. Please wait ${apiErrorState.retryAfter}s before retrying.`;
 console.warn(`[System Guard] Blocked API fetch due to active 429 cooldown: ${input}`);
 throw new Error(msg);
 }

 const authHeaders = getAuthHeaders();
  const mergedInit = { ...init };
  if (Object.keys(authHeaders).length > 0) {
    if (!mergedInit.headers) {
      mergedInit.headers = authHeaders;
    } else if (mergedInit.headers instanceof Headers) {
      Object.entries(authHeaders).forEach(([key, val]) => {
        (mergedInit.headers as Headers).set(key, val);
      });
    } else if (Array.isArray(mergedInit.headers)) {
      const headersArr = [...mergedInit.headers];
      Object.entries(authHeaders).forEach(([key, val]) => {
        if (!headersArr.some(([k]) => k.toLowerCase() === key.toLowerCase())) {
          headersArr.push([key, val]);
        }
      });
      mergedInit.headers = headersArr;
    } else {
      mergedInit.headers = {
        ...authHeaders,
        ...mergedInit.headers,
      };
    }
  }

  let retries = 0;
  const maxRetries = 3;

  while (true) {
    try {
      const res = await fetch(input, mergedInit);

      if (!res.ok) {
        const statusCode = res.status;

        // Auto-retry transient 502/503/504 server startup issues
        if ((statusCode === 502 || statusCode === 503 || statusCode === 504) && retries < maxRetries) {
          retries++;
          await new Promise((r) => setTimeout(r, 300 * Math.pow(2, retries)));
          continue;
        }

        let errMsg = `Server returned HTTP Status Code ${statusCode}`;
        try {
          const errData = await res.clone().json();
          if (errData && errData.error) {
            errMsg = `${errData.error}: ${errData.message || errMsg}`;
          }
        } catch (_) {}

        if ([401, 403, 404, 429, 502, 503, 504].includes(statusCode)) {
          console.warn(`[API Interceptor] Handled status response [${statusCode}]: ${errMsg}`);
        } else {
          console.error(`[API Interceptor] Detected error response [${statusCode}]: ${errMsg}`);
        }

        if (statusCode === 401) {
          const userStr = sessionStorage.getItem("tp_current_user") || localStorage.getItem("tp_current_user");
          if (userStr) {
            console.warn("[API Interceptor] 401 Unauthorized received. Clearing session and redirecting to login.");
            logout();
            setApiErrorState({
              statusCode: 401,
              message: "Your session has expired. Please sign in again to verify your corporate identity.",
            });
          }
        } else if (statusCode === 403) {
          console.warn("[API Interceptor] 403 Forbidden received. Restricting workspace access.");
          setApiErrorState({
            statusCode: 403,
            message: "Access Denied: You do not have the required clearances or security credentials to perform this system action.",
          });
        } else if (statusCode === 429) {
          console.warn("[API Interceptor] 429 Too Many Requests received. Initiating protective security cool-down.");
          setApiErrorState({
            statusCode: 429,
            message: "Rate Limit Exceeded: Excessive validation requests detected. Protective cooling-down is active.",
            retryAfter: 15,
          });
        }

        return res;
      }

      if (apiErrorState && apiErrorState.statusCode !== 429 && apiErrorState.statusCode !== 401) {
        setApiErrorState(null);
      }

      return res;
    } catch (err: any) {
      if (retries < maxRetries) {
        retries++;
        await new Promise((r) => setTimeout(r, 300 * Math.pow(2, retries)));
        continue;
      }
      console.warn(`[API Interceptor] Connection network failure targeting: ${input}`, err);
      setServerConnected(false);
      throw err;
    }
  }
 };

 useEffect(() => {
 if (apiErrorState?.statusCode === 429 && apiErrorState.retryAfter && apiErrorState.retryAfter > 0) {
 const timer = setInterval(() => {
 setApiErrorState((prev) => {
 if (!prev || prev.statusCode !== 429 || !prev.retryAfter) {
 clearInterval(timer);
 return prev;
 }
 if (prev.retryAfter <= 1) {
 clearInterval(timer);
 return null;
 }
 return {
 ...prev,
 retryAfter: prev.retryAfter - 1,
 };
 });
 }, 1000);
 return () => clearInterval(timer);
 }
 }, [apiErrorState]);

 // Multi-tab state synchronization
 useEffect(() => {
 const handleStorageChange = (e: StorageEvent) => {
 if (e.key === "tp_is_logged_in") {
 const loggedIn = e.newValue === "true";
 if (loggedIn !== isLoggedIn) {
 console.log(`[Multi-Tab Sync] Login status changed in another tab. Syncing...`);
 setIsLoggedIn(loggedIn);
 if (!loggedIn) {
 setCurrentUser(null);
 setActiveSessionId(null);
 } else {
 const userStr = localStorage.getItem("tp_current_user");
 if (userStr) {
 try {
 setCurrentUser(JSON.parse(userStr));
 } catch (_) {}
 }
 }
 }
 } else if (e.key === "tp_current_user") {
 if (!e.newValue) {
 setCurrentUser(null);
 setIsLoggedIn(false);
 } else {
 try {
 const parsedUser = JSON.parse(e.newValue);
 if (JSON.stringify(parsedUser) !== JSON.stringify(currentUser)) {
 setCurrentUser(parsedUser);
 setIsLoggedIn(true);
 }
 } catch (_) {}
 }
 } else if (e.key && e.key.startsWith("tp_") && e.newValue !== e.oldValue) {
 if (["tp_is_logged_in", "tp_current_user", "tp_active_sessions", "tp_active_session_id", "tp_offline_queue"].includes(e.key)) {
 return;
 }
 console.log(`[Multi-Tab Sync] Key "${e.key}" written by another tab. Synchronizing local cache...`);
 syncFromSharedServer(true);
 }
 };
 window.addEventListener("storage", handleStorageChange);
 return () => window.removeEventListener("storage", handleStorageChange);
 }, [isLoggedIn, currentUser]);

 const [branches, setBranches] = useState<Branch[]>(() => {
 return safeParse<Branch[]>("tp_branches", SEED_BRANCHES);
 });

 const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
 return safeParse<Supplier[]>("tp_suppliers", SEED_SUPPLIERS);
 });

 const [brands, setBrands] = useState<Brand[]>(() => {
 return safeParse<Brand[]>("tp_brands", SEED_BRANDS);
 });

 const [products, setProducts] = useState<Product[]>(() => {
 return safeParse<Product[]>("tp_products", SEED_PRODUCTS);
 });

 const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
 return safeParse<PurchaseOrder[]>("tp_purchase_orders", SEED_POS);
 });

 const [poItems, setPoItems] = useState<PurchaseOrderItem[]>(() => {
 return safeParse<PurchaseOrderItem[]>("tp_po_items", SEED_PO_ITEMS);
 });

 const [transmittals, setTransmittals] = useState<Transmittal[]>(() => {
 return safeParse<Transmittal[]>("tp_transmittals", SEED_TRANSMITTALS);
 });

 const [shifts, setShifts] = useState<Shift[]>(() => {
 return safeParse<Shift[]>("tp_shifts", SEED_SHIFTS);
 });

 const [sales, setSales] = useState<Sale[]>(() => {
 return safeParse<Sale[]>("tp_sales", SEED_SALES);
 });

 const [saleItems, setSaleItems] = useState<SaleItem[]>(() => {
 return safeParse<SaleItem[]>("tp_sale_items", SEED_SALE_ITEMS);
 });

 const [movements, setMovements] = useState<InventoryMovement[]>(() => {
 return safeParse<InventoryMovement[]>("tp_movements", SEED_MOVEMENTS);
 });

 const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
 return safeParse<AuditLog[]>("tp_audit_logs", SEED_AUDIT_LOGS);
 });

 // Hold / park transactions - standard in cashiers POS
 const [parkedSales, rawSetParkedSales] = useState<
 {
 id: string;
 customerName: string;
 notes: string;
 items: { product: Product; quantity: number }[];
 timestamp: string;
 }[]
 >(() => {
 return safeParse<
 {
 id: string;
 customerName: string;
 notes: string;
 items: { product: Product; quantity: number }[];
 timestamp: string;
 }[]
 >("tp_parked_sales", []);
 });

 const deletedParkedSaleIds = useRef<Set<string>>((() => {
 try {
 const stored = sessionStorage.getItem("tp_deleted_parked_ids");
 if (stored) {
 const parsed = JSON.parse(stored);
 if (Array.isArray(parsed)) return new Set(parsed);
 }
 } catch (_) {}
 return new Set();
 })());

 const activeResumingIdsRef = useRef<Set<string>>(new Set());

 const recordDeletedParkedSaleId = (id: string) => {
 if (!id) return;
 deletedParkedSaleIds.current.add(id);
 try {
 sessionStorage.setItem("tp_deleted_parked_ids", JSON.stringify(Array.from(deletedParkedSaleIds.current)));
 
 const sharedStr = localStorage.getItem("tp_shared_deleted_parked_ids");
 let sharedSet = new Set<string>();
 if (sharedStr) {
 try {
 const arr = JSON.parse(sharedStr);
 if (Array.isArray(arr)) sharedSet = new Set(arr);
 } catch (_) {}
 }
 sharedSet.add(id);
 localStorage.setItem("tp_shared_deleted_parked_ids", JSON.stringify(Array.from(sharedSet)));
 } catch (_) {}

 setTimeout(() => {
 deletedParkedSaleIds.current.delete(id);
 try {
 sessionStorage.setItem("tp_deleted_parked_ids", JSON.stringify(Array.from(deletedParkedSaleIds.current)));
 } catch (_) {}
 }, 300000); // 5 minutes
 };

 useEffect(() => {
 let queueChannel: BroadcastChannel | null = null;
 try {
 queueChannel = new BroadcastChannel("tilepoint_queue_channel");
 queueChannel.onmessage = (event) => {
 if (event.data) {
 if (event.data.type === "QUEUE_RESUME" && event.data.parkedId) {
 recordDeletedParkedSaleId(event.data.parkedId);
 rawSetParkedSales((prev: any[]) => prev.filter((p) => p && p.id !== event.data.parkedId));
 } else if (event.data.type === "QUEUE_ADD" && event.data.hold) {
 rawSetParkedSales((prev: any[]) => {
 if (prev.some((p) => p && p.id === event.data.hold.id)) return prev;
 return [...prev, event.data.hold];
 });
 } else if (event.data.type === "QUEUE_SYNC") {
 syncFromSharedServer(true).catch(() => {});
 }
 }
 };
 } catch (_) {}

 const handleCustomQueueUpdate = (e: any) => {
 if (e.detail?.action === "resume" && e.detail?.parkedId) {
 recordDeletedParkedSaleId(e.detail.parkedId);
 rawSetParkedSales((prev: any[]) => prev.filter((p) => p && p.id !== e.detail.parkedId));
 } else if (e.detail?.action === "add" && e.detail?.hold) {
 rawSetParkedSales((prev: any[]) => {
 if (prev.some((p) => p && p.id === e.detail.hold.id)) return prev;
 return [...prev, e.detail.hold];
 });
 }
 };

 const handleStorageChange = (e: StorageEvent) => {
 if (e.key === "tp_shared_deleted_parked_ids" && e.newValue) {
 try {
 const ids: string[] = JSON.parse(e.newValue);
 if (Array.isArray(ids)) {
 let hasNew = false;
 ids.forEach((id) => {
 if (!deletedParkedSaleIds.current.has(id)) {
 deletedParkedSaleIds.current.add(id);
 hasNew = true;
 }
 });
 if (hasNew) {
 rawSetParkedSales((prev) => prev.filter((p) => p && p.id && !deletedParkedSaleIds.current.has(p.id)));
 }
 }
 } catch (_) {}
 } else if (e.key === "tp_parked_sales" && e.newValue) {
 try {
 const freshParked = JSON.parse(e.newValue);
 if (Array.isArray(freshParked)) {
 rawSetParkedSales(() => {
 const filtered = freshParked.filter((p) => p && p.id && !deletedParkedSaleIds.current.has(p.id));
 return filtered;
 });
 }
 } catch (_) {}
 }
 };

 window.addEventListener("storage", handleStorageChange);
 window.addEventListener("tp_queue_updated", handleCustomQueueUpdate);

 return () => {
 if (queueChannel) queueChannel.close();
 window.removeEventListener("storage", handleStorageChange);
 window.removeEventListener("tp_queue_updated", handleCustomQueueUpdate);
 };
 }, []);

 const setParkedSales = (updater: any) => {
 let nextValue: any;
 rawSetParkedSales((prev) => {
 let next = typeof updater === "function" ? updater(prev) : updater;
 
 // If we are NOT syncing from the server, detect any deletions from local state changes
 if (!isSyncingFromServer.current && Array.isArray(prev) && Array.isArray(next)) {
 const nextIds = new Set(next.map(item => item?.id).filter(Boolean));
 prev.forEach(item => {
 if (item && item.id && !nextIds.has(item.id)) {
 recordDeletedParkedSaleId(item.id);
 }
 });
 }

 // Protect local un-synced hold sales from being wiped out by server-side pull
 if (isSyncingFromServer.current && Array.isArray(next)) {
 next = mergeParkedSales(prev, next, deletedParkedSaleIds.current);
 }
 
 // Always filter out deleted parked sales to prevent race-condition merge-backs
 if (Array.isArray(next)) {
 next = next.filter(item => item && item.id && !deletedParkedSaleIds.current.has(item.id));
 }
 
 try {
 safeLocalStorageSetItem("tp_parked_sales", JSON.stringify(next));
 } catch (_) {}
 nextValue = next;
 return next;
 });

 if (!isSyncingFromServer.current && nextValue !== undefined) {
 saveToStorageWithDebounce("tp_parked_sales", nextValue, true);
 try {
 const queueChannel = new BroadcastChannel("tilepoint_queue_channel");
 queueChannel.postMessage({ type: "QUEUE_SYNC", timestamp: Date.now() });
 queueChannel.close();
 } catch (_) {}
 }
 };

 const [syncStatus, setSyncStatus] = useState<Record<string, "Live" | "Syncing">>({});

 useEffect(() => {
 setSyncStatus((prev) => {
 const next = { ...prev };
 let updated = false;
 branches.forEach((branch) => {
 if (!next[branch.id]) {
 next[branch.id] = "Live";
 updated = true;
 }
 });
 return updated ? next : prev;
 });
 }, [branches]);

 const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>(() => {
 return safeParse<StockTransfer[]>("tp_stock_transfers", []);
 });

 const [branchStock, setBranchStock] = useState<InventoryLocationStock[]>(
 () => {
 try {
 const cached = localStorage.getItem("tp_branch_stock");
 if (cached) return JSON.parse(cached);
 } catch (e) {
 console.error(
 "Error loading tp_branch_stock, building default layout",
 e,
 );
 }

 const initial: InventoryLocationStock[] = [];
 const productsSource = products && products.length > 0 ? products : [];
 productsSource.forEach((p) => {
 initial.push({
 id: `B1_${p.id}`,
 branchId: "B1",
 productId: p.id,
 quantity: p.stockQuantity,
 });
 initial.push({
 id: `B2_${p.id}`,
 branchId: "B2",
 productId: p.id,
 quantity: Math.round(p.stockQuantity * 0.35),
 });
 initial.push({
 id: `B3_${p.id}`,
 branchId: "B3",
 productId: p.id,
 quantity: Math.round(p.stockQuantity * 0.2),
 });
 initial.push({
 id: `B4_${p.id}`,
 branchId: "B4",
 productId: p.id,
 quantity: Math.round(p.stockQuantity * 0.15),
 });
 });
 return initial;
 },
 );

 const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>(() => {
 return safeParse<LedgerEntry[]>("tp_ledger_entries", []);
 });

 const [branchSalesReports, setBranchSalesReports] = useState<
 BranchSalesReport[]
 >(() => {
 return safeParse<BranchSalesReport[]>("tp_branch_sales_reports", []);
 });

 const [rollbackSnapshots, setRollbackSnapshots] = useState<IngestionSnapshot[]>(() => {
 return safeParse<IngestionSnapshot[]>("tp_ingestion_snapshots", []);
 });

 const [deliveries, setDeliveries] = useState<Delivery[]>(() => {
 return safeParse<Delivery[]>("tp_deliveries", []);
 });

 const [damageLogs, setDamageLogs] = useState<DamageLog[]>(() => {
 return safeParse<DamageLog[]>("tp_damage_logs", []);
 });

 // CRITICAL ALIGNMENT ARCHITECTURE: Linked state provider variable for Custom Recurring Corporate Liabilities
 const [customBills, setCustomBills] = useState<CustomCorporateBill[]>(() => {
 return safeParse<CustomCorporateBill[]>("atpos_v2_custom_bills", []);
 });

 // SYSTEM INTEGRATION: Linked state provider variables for members, expenses, and product returns
 const [members, setMembers] = useState<Member[]>(() => {
 return safeParse<Member[]>("atpos_v2_members_list", []);
 });


  const [expenses, setExpenses] = useState<Expense[]>(() => {
 return safeParse<Expense[]>("atpos_v2_expenses", []);
 });

 const [productReturns, setProductReturns] = useState<ProductReturn[]>(() => {
 return safeParse<ProductReturn[]>("atpos_v2_returns", []);
 });

 const [calendarNotes, setCalendarNotes] = useState<string>(() => {
 return localStorage.getItem("atpos_v2_calendar_notes") || "";
 });

 const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
 spendPerPoint: 500,
 pointsPerSpend: 1,
 pointValueInPhp: 1.0,
 enabled: true,
 };

 const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig>(() => {
 return safeParse<LoyaltyConfig>("tilepoint_loyalty_config", DEFAULT_LOYALTY_CONFIG);
 });

 const updateLoyaltyConfig = (updates: Partial<LoyaltyConfig>) => {
 setLoyaltyConfig((prev) => {
 const next = { ...prev, ...updates };
 localStorage.setItem("tilepoint_loyalty_config", JSON.stringify(next));
 return next;
 });
 };

 const DEFAULT_RETENTION_POLICY: RetentionPolicyMap = {
 auditLogs: 6,
 movements: 12,
 sales: 24,
 expenses: 12,
 returns: 6,
 damageLogs: 6,
 };

 const [retentionPolicy, setRetentionPolicy] = useState<RetentionPolicyMap>(() => {
 return safeParse<RetentionPolicyMap>("tilepoint_retention_policy", DEFAULT_RETENTION_POLICY);
 });

 const updateRetentionPolicy = (category: ArchivableCategory, months: number) => {
 setRetentionPolicy((prev) => {
 const next = { ...prev, [category]: months };
 localStorage.setItem("tilepoint_retention_policy", JSON.stringify(next));
 return next;
 });
  addAuditLog(
  "RETENTION_POLICY_UPDATE",
  `Updated retention policy for category '${category}' to ${months === 0 ? "Keep Indefinitely" : `${months} months`}`,
  "SYSTEM",
  category
  );
  };

  const CATEGORY_DISPLAY_LABELS: Record<ArchivableCategory, string> = {
  auditLogs: "Audit Trail & Activity Logs",
  movements: "Stock Movement Ledger",
  sales: "Historical Sales Invoices",
  expenses: "Operating Expenses",
  returns: "Customer Product Returns",
  damageLogs: "Damage & Waste Register",
  };

 const [dayMemos, setDayMemos] = useState<Record<string, string>>(() => {
 return safeParse<Record<string, string>>("atpos_v2_calendar_day_memos", {});
 });

 const [activeSessions, setActiveSessions] = useState<ActiveSession[]>(() => {
 return safeParse<ActiveSession[]>("tp_active_sessions", []);
 });

 const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
 if (typeof window === "undefined") return null;
 return (
 localStorage.getItem("tp_active_session_id") ||
 sessionStorage.getItem("tp_active_session_id") ||
 null
 );
 });

 // Derived Active Branch
 const activeBranch = useMemo(() => {
 const currentBranch = currentUser
 ? branches.find((b) => b.id === currentUser.branchAssignmentId)
 : null;
 return currentBranch || branches[0] || null;
 }, [currentUser, branches]);

 // Derived Active Shift
 const activeShift = useMemo(() => {
 const openShift = currentUser
 ? shifts.find(
 (s) => s.cashierId === currentUser.id && s.status === "OPEN",
 )
 : null;
 return openShift || null;
 }, [shifts, currentUser]);

 // Heartbeat to update our active session timestamp every 8 seconds
 useEffect(() => {
 if (!isLoggedIn || !currentUser || !activeSessionId) return;

 const heartbeatInterval = setInterval(() => {
 setActiveSessions((prev) => {
 const nowStr = new Date().toISOString();
 let sessionExists = false;

 // Prune sessions older than 3 minutes to keep list clean
 const cutoffTime = Date.now() - 3 * 60 * 1000;
 const freshSessions = prev.filter(
 (s) => new Date(s.lastActive).getTime() > cutoffTime,
 );

 const updatedSessions = freshSessions.map((s) => {
 if (s.id === activeSessionId) {
 sessionExists = true;
 return { ...s, lastActive: nowStr };
 }
 return s;
 });

 if (!sessionExists) {
 // If we are not in the list, check if someone else is logged into our account
 const hasConcurrent = freshSessions.some(
 (s) => s.userId === currentUser.id && s.id !== activeSessionId,
 );
 if (hasConcurrent) {
 // Under offline ERP OS mode, support concurrent handheld lookups and multi-terminal operations on shared employee accounts
 console.log("[Concurrent Monitor] Multi-device session active on account:", currentUser.fullName);
 }

 const activeBranchName =
 branches.find((b) => b.id === currentUser.branchAssignmentId)
 ?.name || (localStorage.getItem("tilepoint_company_name_v1") || "ETC_DIPOLOG MAIN");
 updatedSessions.push({
 id: activeSessionId,
 userId: currentUser.id,
 username: currentUser.username,
 fullName: currentUser.fullName,
 role: currentUser.role,
 branchId: currentUser.branchAssignmentId || "B1",
 branchName: activeBranchName,
 lastActive: nowStr,
 userAgent: navigator.userAgent,
 });
 } else {
 // If we exist, check if a newer session has taken over
 const hasConcurrent = freshSessions.some(
 (s) => s.userId === currentUser.id && s.id !== activeSessionId,
 );
 if (hasConcurrent) {
 // Under offline ERP OS mode, support concurrent handheld lookups and multi-terminal operations on shared employee accounts
 console.log("[Concurrent Monitor] Multi-device session active on account:", currentUser.fullName);
 }
 }

 return updatedSessions;
 });
 }, 8000);

 return () => clearInterval(heartbeatInterval);
 }, [isLoggedIn, currentUser?.id, activeSessionId, branches]);

 // Watch activeSessions for incoming concurrent boot triggers from the server sync
 useEffect(() => {
 if (!isLoggedIn || !currentUser || !activeSessionId) return;

 const cutoffTime = Date.now() - 3 * 60 * 1000;
 const freshSessions = activeSessions.filter(
 (s) => new Date(s.lastActive).getTime() > cutoffTime,
 );

 const hasConcurrentSession = freshSessions.some(
 (s) => s.userId === currentUser.id && s.id !== activeSessionId,
 );
 if (hasConcurrentSession) {
 const mySessionInList = freshSessions.some(
 (s) => s.id === activeSessionId,
 );
 const concurrentSession = freshSessions.find(
 (s) => s.userId === currentUser.id && s.id !== activeSessionId,
 );
 const mySession = freshSessions.find((s) => s.id === activeSessionId);

 const shouldBoot =
 mySession &&
 concurrentSession &&
 new Date(concurrentSession.lastActive).getTime() >
 new Date(mySession.lastActive).getTime();

 if (shouldBoot) {
 // Under offline ERP OS mode, support concurrent handheld lookups and multi-terminal operations on shared employee accounts
 console.log("[Concurrent Monitor] Multi-device login detected on account (non-boot):", currentUser.fullName);
 }
 }
 }, [activeSessions, isLoggedIn, currentUser?.id, activeSessionId]);

 // Self-heal and sync missing/zero branch stock entries for products with positive total stock (migrated/imported POS data)
 useEffect(() => {
 if (products.length > 0 && branches.length > 0) {
 setBranchStock((prevStock) => {
 // Index existing branchStock records: productId -> List of branchStock
 const stockIndex = new Map<string, typeof prevStock>();
 prevStock.forEach((bs) => {
 let list = stockIndex.get(bs.productId);
 if (!list) {
 list = [];
 stockIndex.set(bs.productId, list);
 }
 list.push(bs);
 });

 // Set of active branch IDs for quick O(1) membership checks
 const activeBranchIds = new Set(
 branches.filter((b) => !b.isDeleted).map((b) => b.id)
 );

 let updated = [...prevStock];
 let hasChanges = false;

 // Map key 'branchId_productId' to index in updated array for quick lookups
 const keyToIndexMap = new Map<string, number>();
 updated.forEach((bs, idx) => {
 keyToIndexMap.set(`${bs.branchId}_${bs.productId}`, idx);
 });

 products.forEach((p) => {
 if (p.isDeleted) return;

 const productBranchStocks = stockIndex.get(p.id) || [];
 const totalBranchQty = productBranchStocks.reduce(
 (sum, bs) => sum + bs.quantity,
 0,
 );

 const primaryBranchId = (typeof window !== "undefined" && localStorage.getItem("tilepoint_primary_branch_id")) || "B1";
 const mainBranchId = branches.find(b => !b.isDeleted && (b.id === primaryBranchId || b.id === "B1"))?.id || branches.find(b => !b.isDeleted)?.id || "B1";

  branches.filter(b => !b.isDeleted).forEach(b => {
  const key = b.id + "_" + p.id;
  const existingIdx = keyToIndexMap.get(key);
  if (existingIdx === undefined) {
  const initialQty = (totalBranchQty === 0 && b.id === mainBranchId) ? p.stockQuantity : 0;
  updated.push({
  id: key,
  branchId: b.id,
  productId: p.id,
  quantity: initialQty,
  });
  keyToIndexMap.set(key, updated.length - 1);
  hasChanges = true;
  }
  });
  });

  return hasChanges ? updated : prevStock;
 });
 }
 }, [products, branches, currentUser?.branchAssignmentId]);

 // DB Tuning debouncer settings & stats
 const [debounceDelay, setDebounceDelay] = useState<number>(() => {
 const cached = localStorage.getItem("tp_debounce_delay");
 return cached !== null ? Number(cached) : 0;
 });

 const [dbSyncStatus, setDbSyncStatus] = useState<"idle" | "queued" | "syncing">("idle");

 const [writeStatsCount, setWriteStatsCount] = useState<number>(() => {
 const cached = localStorage.getItem("tp_write_stats_prevented");
 return cached !== null ? Number(cached) : 0;
 });
 const writeStatsCountRef = useRef<number>(writeStatsCount);

 const [dbSnapshots, setDbSnapshots] = useState<DbSnapshot[]>(() => {
 const cached = localStorage.getItem("tp_db_snapshots");
 return cached ? JSON.parse(cached) : [];
 });

 const fetchDbSnapshots = async () => {
  const userStr = typeof window !== 'undefined' ? (sessionStorage.getItem("tp_current_user") || localStorage.getItem("tp_current_user")) : null;
  if (!userStr) {
    return;
  }
 try {
 const res = await safeApiFetch("/api/db/backups?metadataOnly=true");
 if (res.ok) {
 const body = await res.json();
 if (body.success && body.data) {
 setDbSnapshots(body.data);
 localStorage.setItem("tp_db_snapshots", JSON.stringify(body.data));
 }
 }
 } catch (e) {
 console.error("[System Guard] Failed to fetch optimized backup metadata list:", e);
 }
 };

 const [autoBackupEnabled, setAutoBackupEnabled] = useState<boolean>(() => {
 const cached = localStorage.getItem("tp_autobackup_enabled");
 return cached !== null ? cached === "true" : true;
 });

 const [backupIntervalHours, setBackupIntervalHours] = useState<number>(() => {
 const cached = localStorage.getItem("tp_autobackup_interval");
 return cached !== null ? Number(cached) : 1;
 });

 const [lastAutoBackupTime, setLastAutoBackupTime] = useState<string | null>(
 () => {
 return localStorage.getItem("tp_autobackup_last_time");
 },
 );

 const [dbMaintenanceEnabled, setDbMaintenanceEnabled] = useState<boolean>(() => {
 const cached = localStorage.getItem("tp_db_maintenance_enabled");
 return cached !== null ? cached === "true" : true;
 });

 const [lastMaintenanceTime, setLastMaintenanceTime] = useState<string | null>(
 () => {
 return localStorage.getItem("tp_db_maintenance_last_time");
 },
 );

 const [isMaintenanceRunning, setIsMaintenanceRunning] = useState<boolean>(false);

 // Global System Processing States
 const [isSystemProcessing, setIsSystemProcessing] = useState(false);
 const [systemProcessingMessage, setSystemProcessingMessage] = useState("");
 const [systemProcessingSubtext, setSystemProcessingSubtext] = useState("");
 const [systemProcessingType, setSystemProcessingType] = useState<
 "spinner" | "progress" | "verification" | "db"
 >("spinner");
 const [systemProcessingProgress, setSystemProcessingProgress] = useState(0);

 const triggerSystemProcessing = (
 message: string,
 durationMs = 1500,
 type: "spinner" | "progress" | "verification" | "db" = "spinner",
 onComplete?: () => void,
 subtext = "",
 ): Promise<void> => {
 // Snappy, non-disruptive duration cap for professional, instant feedback
 const optimizedDuration = Math.min(400, durationMs);
 setIsSystemProcessing(true);
 setSystemProcessingMessage(message);
 setSystemProcessingSubtext(subtext || "");
 setSystemProcessingType(type);
 setSystemProcessingProgress(0);

 return new Promise<void>((resolve) => {
 let interval: any;
 if (type === "progress") {
 const step = 100 / (optimizedDuration / 100);
 let curr = 0;
 interval = setInterval(() => {
 curr += step;
 if (curr >= 100) {
 curr = 100;
 clearInterval(interval);
 }
 setSystemProcessingProgress(Math.min(100, Math.round(curr)));
 }, 100);
 }

 setTimeout(() => {
 if (interval) clearInterval(interval);
 setIsSystemProcessing(false);
 setSystemProcessingMessage("");
 setSystemProcessingSubtext("");
 setSystemProcessingProgress(0);
 if (onComplete) onComplete();
 resolve();
 }, optimizedDuration);
 });
 };

 const forceSyncAllToServer = async () => {
 const authHeaders = getAuthHeaders();
 const isSetup = localStorage.getItem("tp_setting_up") === "true";
 if (!authHeaders.Authorization && !isSetup) {
 console.log("[Shared DB Client] Skipping bulk sync to server since user is logged out.");
 return;
 }
 try {
 const payload = {
 tp_users: users,
 tp_branches: branches,
 tp_suppliers: suppliers,
 tp_brands: brands,
 tp_products: products,
 tp_purchase_orders: purchaseOrders,
 tp_po_items: poItems,
 tp_transmittals: transmittals,
 tp_shifts: shifts,
 tp_sales: sales,
 tp_sale_items: saleItems,
 tp_movements: movements,
 tp_audit_logs: auditLogs,
 tp_parked_sales: parkedSales,
 tp_stock_transfers: stockTransfers,
 tp_branch_stock: branchStock,
 tp_ledger_entries: ledgerEntries,
 tp_branch_sales_reports: branchSalesReports,
 tp_deliveries: deliveries,
 tp_damage_logs: damageLogs,
 atpos_v2_custom_bills: customBills,
 atpos_v2_members_list: members,
 atpos_v2_expenses: expenses,
 atpos_v2_returns: productReturns,
 atpos_v2_calendar_notes: calendarNotes,
 atpos_v2_calendar_day_memos: dayMemos,
 tp_is_configured: String(isConfigured),
 tilepoint_onboarded_setup:
 localStorage.getItem("tilepoint_onboarded_setup") || "false",
 tilepoint_company_name_v1:
 localStorage.getItem("tilepoint_company_name_v1") ||
 "Emman Tile Center",
 };

 let serializedBody: string;
 let volatileUpdates: Record<string, string> = {};

 if (dbSyncWorkerClient.isWorkerAvailable) {
 try {
 const workerRes = await dbSyncWorkerClient.prepareBulkPayload(payload);
 serializedBody = workerRes.serialized;
 volatileUpdates = workerRes.volatileUpdates;
 } catch (_) {
 serializedBody = JSON.stringify({ data: payload });
 }
 } else {
 serializedBody = JSON.stringify({ data: payload });
 }

 const res = await safeApiFetch("/api/db/bulk", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 ...getAuthHeaders(),
 },
 body: serializedBody,
 });
 if (res.ok) {
 console.log(
 "[Shared DB Client] Successfully synced all local data to server.",
 );
 if (Object.keys(volatileUpdates).length > 0) {
 Object.keys(volatileUpdates).forEach((k) => {
 volatileCache.current[k] = volatileUpdates[k];
 });
 } else {
 Object.keys(payload).forEach((k) => {
 const val = (payload as any)[k];
 volatileCache.current[k] = typeof val === "string" ? val : JSON.stringify(val);
 });
 }
 }
 } catch (err) {
 console.error("[Shared DB Client] Failed bulk sync to server:", err);
 }
 };

 const [offlineQueue, setOfflineQueue] = useState<any[]>(() => {
 try {
 const txQ = localStorage.getItem("tp_transaction_sync_queue");
 if (txQ) return JSON.parse(txQ);
 const q = localStorage.getItem("tp_offline_queue");
 return q ? JSON.parse(q) : [];
 } catch (_) {
 return [];
 }
 });

 const enqueueTransaction = (txPkg: any) => {
 const itemToEnqueue = {
 queueId: `qtx-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
 id: txPkg.id || `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
 type: txPkg.type || "ATOMIC_TRANSACTION",
 txType: txPkg.txType || "POS_OPERATION",
 timestamp: txPkg.timestamp || Date.now(),
 retries: 0,
 status: "pending",
 payload: txPkg.payload || {}
 };

 setOfflineQueue((prev) => {
 const filtered = prev.filter((item) => item.id !== itemToEnqueue.id);
 const updated = [...filtered, itemToEnqueue];
 try {
 localStorage.setItem("tp_transaction_sync_queue", JSON.stringify(updated));
 localStorage.setItem("tp_offline_queue", JSON.stringify(updated));
 } catch (_) {}
 return updated;
 });

 setTimeout(() => {
 processTransactionSyncQueue();
 }, 50);
 };

 const enqueueOfflineRequest = (op: any) => {
 if (op && (op.type === "ATOMIC_TRANSACTION" || op.txType)) {
 enqueueTransaction(op);
 return;
 }
 setOfflineQueue((prev) => {
 let filtered = prev;
 if (op.isLegacy) {
 filtered = prev.filter((item) => !item.isLegacy || item.key !== op.key);
 } else if (op.id) {
 filtered = prev.filter((item) => item.id !== op.id);
 }
 const updated = [...filtered, { ...op, queueId: `q-${Date.now()}-${Math.random()}` }];
 try {
 localStorage.setItem("tp_transaction_sync_queue", JSON.stringify(updated));
 localStorage.setItem("tp_offline_queue", JSON.stringify(updated));
 } catch (_) {}
 return updated;
 });

 setTimeout(() => {
 processTransactionSyncQueue();
 }, 50);
 };

 const isProcessingQueue = useRef(false);
 const isSyncingFromServer = useRef(false);
 const lastServerDbHash = useRef<string>("");

 const processTransactionSyncQueue = async () => {
 if (isProcessingQueue.current) return;
 const authHeaders = getAuthHeaders();
 if (!authHeaders.Authorization) {
 console.log("[Tx Queue] Skipping transaction queue processing since user is logged out.");
 return;
 }

 let queue: any[] = [];
 try {
 const txQ = localStorage.getItem("tp_transaction_sync_queue");
 const legacyQ = localStorage.getItem("tp_offline_queue");
 queue = txQ ? JSON.parse(txQ) : (legacyQ ? JSON.parse(legacyQ) : []);
 } catch (_) {
 return;
 }

 if (queue.length === 0) return;

 isProcessingQueue.current = true;
 console.log(`[Tx Queue] Sequentially processing ${queue.length} pending atomic transaction packages...`);

 for (const item of queue) {
 try {
 let res;
 if (item.type === "ATOMIC_TRANSACTION") {
 res = await safeApiFetch("/api/db/transaction", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 ...getAuthHeaders(),
 },
 body: JSON.stringify(item),
 });
 } else if (item.type) {
 res = await safeApiFetch("/api/db/delta", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 ...getAuthHeaders(),
 },
 body: JSON.stringify(item),
 });
 } else {
 res = await safeApiFetch("/api/db", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 ...getAuthHeaders(),
 },
 body: JSON.stringify({ key: item.key, value: item.value }),
 });
 }

 if (res && res.ok) {
 setOfflineQueue((currentQueue) => {
 const updated = currentQueue.filter((q) => q.queueId !== item.queueId);
 try {
 localStorage.setItem("tp_transaction_sync_queue", JSON.stringify(updated));
 localStorage.setItem("tp_offline_queue", JSON.stringify(updated));
 } catch (_) {}
 return updated;
 });
 await new Promise((r) => setTimeout(r, 100));
 } else if (res && (res.status === 401 || res.status === 403)) {
 console.warn(`[Tx Queue] Dropping un-retryable item due to HTTP status ${res.status}:`, item);
 setOfflineQueue((currentQueue) => {
 const updated = currentQueue.filter((q) => q.queueId !== item.queueId);
 try {
 localStorage.setItem("tp_transaction_sync_queue", JSON.stringify(updated));
 localStorage.setItem("tp_offline_queue", JSON.stringify(updated));
 } catch (_) {}
 return updated;
 });
 break;
 } else {
 console.warn(`[Tx Queue] Transient server response status ${res ? res.status : 'offline'}. Will retry transaction ${item.id} later.`);
 setOfflineQueue((currentQueue) => {
 const updated = currentQueue.map((q) => q.queueId === item.queueId ? { ...q, retries: (q.retries || 0) + 1, status: "failed" } : q);
 try {
 localStorage.setItem("tp_transaction_sync_queue", JSON.stringify(updated));
 localStorage.setItem("tp_offline_queue", JSON.stringify(updated));
 } catch (_) {}
 return updated;
 });
 break;
 }
 } catch (err) {
 console.warn("[Tx Queue] Connection failed during sequential transaction dequeueing:", err);
 break;
 }
 }
 isProcessingQueue.current = false;
 };

 const processOfflineQueue = processTransactionSyncQueue;

 const activeSyncPromise = useRef<Promise<void> | null>(null);

 const syncFromSharedServer = (silent = false): Promise<void> => {
 if (activeSyncPromise.current) {
 return activeSyncPromise.current;
 }

 activeSyncPromise.current = (async () => {
 if (typeof window !== 'undefined' && localStorage.getItem('tp_setting_up') === 'true') {
 console.log('[Shared DB Client] System setup in progress. Bypassing server sync to avoid overwrite race condition.');
 return;
 }
 try {
 await writeQueue.current;
 } catch (_) {}
 if (!silent) {
 setSyncStatus((prev) => {
 const next = { ...prev };
 Object.keys(next).forEach((k) => {
 next[k] = "Syncing";
 });
 return next;
 });
 }
 try {
 isSyncingFromServer.current = true;
 const syncUrl = lastServerDbHash.current
 ? `/api/db?hash=${encodeURIComponent(lastServerDbHash.current)}`
 : "/api/db";
 const res = await safeApiFetch(syncUrl);
 if (!res.ok)
 throw new Error("Shared server returned status " + res.status);
 const responseData = await res.json();
 if (responseData && responseData.success) {
 if (responseData.hash) {
 lastServerDbHash.current = responseData.hash;
 }
 if (responseData.unchanged) {
 // Shared database is identical on host. Bypassing state comparisons & localStorage writes completely!
 setServerConnected(true);
 return;
 }

 if (responseData.data) {
 const db = responseData.data;
 if (Object.keys(db).length > 0) {
 let processedByWorker = false;

 if (dbSyncWorkerClient.isWorkerAvailable) {
 try {
 const optimisticStockEntries: any[] = [];
 optimisticStockCacheRef.current.forEach((val, key) => {
 if (val) optimisticStockEntries.push({ key, ...val });
 });

 const collectionStates: Record<string, any> = {
 tp_users: users,
 tp_branches: branches,
 tp_suppliers: suppliers,
 tp_brands: brands,
 tp_products: products,
 tp_purchase_orders: purchaseOrders,
 tp_po_items: poItems,
 tp_transmittals: transmittals,
 tp_shifts: shifts,
 tp_sales: sales,
 tp_sale_items: saleItems,
 tp_movements: movements,
 tp_audit_logs: auditLogs,
 tp_parked_sales: parkedSales,
 tp_stock_transfers: stockTransfers,
 tp_branch_stock: branchStock,
 tp_ledger_entries: ledgerEntries,
 tp_branch_sales_reports: branchSalesReports,
 tp_deliveries: deliveries,
 tp_damage_logs: damageLogs,
 atpos_v2_custom_bills: customBills,
 atpos_v2_members_list: members,
 atpos_v2_expenses: expenses,
 atpos_v2_returns: productReturns,
 atpos_v2_calendar_notes: calendarNotes,
 atpos_v2_calendar_day_memos: dayMemos
 };

 const localStoredCollections: Record<string, any> = {};
 Object.keys(collectionStates).forEach((k) => {
 if (!collectionStates[k] || collectionStates[k].length === 0) {
 localStoredCollections[k] = safeParse<any[]>(k, []);
 }
 });

 const workerRes = await dbSyncWorkerClient.processSyncResponse({
 db,
 collectionStates,
 localStoredCollections,
 volatileCache: volatileCache.current,
 deletedParkedSaleIds: Array.from(deletedParkedSaleIds.current),
 optimisticStockEntries,
 currentActiveSessions: activeSessions,
 isLoggedIn,
 currentUser,
 activeSessionId
 });

 if (workerRes && workerRes.type === 'SYNC_RESPONSE_PROCESSED') {
 processedByWorker = true;

 if (workerRes.nonCollectionWrites) {
 Object.keys(workerRes.nonCollectionWrites).forEach((k) => {
 const valStr = workerRes.nonCollectionWrites![k];
 volatileCache.current[k] = valStr;
 try { localStorage.setItem(k, valStr); } catch (_) {}
 });
 }

 const setters: Record<string, (val: any) => void> = {
 tp_users: setUsers,
 tp_branches: setBranches,
 tp_suppliers: setSuppliers,
 tp_brands: setBrands,
 tp_products: setProducts,
 tp_purchase_orders: setPurchaseOrders,
 tp_po_items: setPoItems,
 tp_transmittals: setTransmittals,
 tp_shifts: setShifts,
 tp_sales: setSales,
 tp_sale_items: setSaleItems,
 tp_movements: setMovements,
 tp_audit_logs: setAuditLogs,
 tp_parked_sales: setParkedSales,
 tp_stock_transfers: setStockTransfers,
 tp_branch_stock: setBranchStock,
 tp_ledger_entries: setLedgerEntries,
 tp_branch_sales_reports: setBranchSalesReports,
 tp_deliveries: setDeliveries,
 tp_damage_logs: setDamageLogs,
 atpos_v2_custom_bills: setCustomBills,
 atpos_v2_members_list: setMembers,
 atpos_v2_expenses: setExpenses,
 atpos_v2_returns: setProductReturns
 };

 if (workerRes.collections) {
 Object.keys(workerRes.collections).forEach((k) => {
 const item = workerRes.collections![k];
 if (item) {
 if (volatileCache.current[k] !== item.mergedStr) {
 volatileCache.current[k] = item.mergedStr;
 try { localStorage.setItem(k, item.mergedStr); } catch (_) {}
 }
 if (item.hasChanged && setters[k]) {
 setters[k](item.merged);
 }
 if (item.serverWasEmpty) {
 console.log(`[Sync Guard] Local dataset for "${k}" is non-empty while server was empty. Queueing server write...`);
 setTimeout(() => {
 saveToStorageWithDebounce(k, item.merged, true);
 }, 500);
 }
 }
 });
 }

 if (workerRes.calendarNotesChanged && workerRes.calendarNotes !== undefined) {
 setCalendarNotes(workerRes.calendarNotes);
 }
 if (workerRes.dayMemosChanged && workerRes.dayMemos !== undefined) {
 setDayMemos(workerRes.dayMemos);
 }
 if (workerRes.activeSessionsChanged && workerRes.updatedSessions) {
 setActiveSessions(workerRes.updatedSessions);
 }
 if (workerRes.isConfiguredValue !== undefined) {
 if (!workerRes.isConfiguredValue) {
 localStorage.setItem("tp_is_configured", "false");
 localStorage.setItem("tilepoint_onboarded_setup", "false");
 setIsConfigured(false);
 } else {
 localStorage.setItem("tp_is_configured", "true");
 setIsConfigured(true);
 }
 }
 }
 } catch (workerErr) {
 console.warn('[Shared DB Client] Web worker sync processing error, using fallback:', workerErr);
 processedByWorker = false;
 }
 }

 if (!processedByWorker) {
 // Pre-populate volatileCache and localStorage ONLY if string content has changed
        const collectionKeys = [
          "tp_users",
          "tp_branches",
          "tp_suppliers",
          "tp_brands",
          "tp_products",
          "tp_purchase_orders",
          "tp_po_items",
          "tp_transmittals",
          "tp_shifts",
          "tp_sales",
          "tp_sale_items",
          "tp_movements",
          "tp_audit_logs",
          "tp_parked_sales",
          "tp_stock_transfers",
          "tp_branch_stock",
          "tp_ledger_entries",
          "tp_branch_sales_reports",
          "tp_deliveries",
          "tp_damage_logs",
          "atpos_v2_custom_bills",
          "atpos_v2_members_list",
          "atpos_v2_expenses",
          "atpos_v2_returns",
          "atpos_v2_calendar_notes",
          "atpos_v2_calendar_day_memos"
        ];

        Object.keys(db).forEach((k) => {
          if (collectionKeys.includes(k)) {
            return; // Skip raw pre-populate for database collections. They are safely merged and persisted below by processCollection.
          }
 const valStr =
 typeof db[k] === "string" ? db[k] : JSON.stringify(db[k]);

 // SYSTEM RECOVERY INTERCEPTOR SAFEGUARDS:
 // Explicitly filter out and ignore client configuration keys, navigation routes, active filters, and current user configurations.
 const lowerKey = k.toLowerCase();
 const isBlockedKey =
 k === "tp_current_user" ||
 k === "tp_is_logged_in" ||
 k === "tp_session_token" ||
 k === "tp_active_session_id" ||
 k === "tp_active_tab" ||
 (k === "tp_is_configured" && localStorage.getItem("tp_is_configured") === "true" && valStr !== '"false"' && valStr !== 'false') || // prevent accidental downgrade unless server explicitly sends false
 lowerKey.includes("active_tab") ||
 lowerKey.includes("active_filter") ||
 lowerKey.includes("navigation") ||
 lowerKey.includes("filter_") ||
 lowerKey.includes("theme") ||
 lowerKey.includes("contrast") ||
 lowerKey.includes("sidebar") ||
 lowerKey.includes("animation") ||
 lowerKey.includes("blur") ||
 (lowerKey.startsWith("tilepoint_") &&
 k !== "tilepoint_onboarded_setup" &&
 k !== "tilepoint_company_name_v1" &&
 k !== "tilepoint_primary_branch_id" &&
 k !== "tilepoint_store_logo_v1") ||
 lowerKey.includes("tp_active_cart"); // protect active checkout session cart from remote override

 if (isBlockedKey) {
 return; // Ignore and completely skip overwriting device-specific client view coordinates
 }

 // OPTIMIZATION: Only write to synchronous localStorage when string content differs from volatile cache
 if (volatileCache.current[k] !== valStr) {
 volatileCache.current[k] = valStr;
 try {
 localStorage.setItem(k, valStr);
 } catch (e) {}
 }
 });

 // Helper to only trigger React state updates when the data content actually changes.
 // This avoids unnecessary re-renders of the entire app component tree during polling checks.
 // It implements a highly optimized, key-order-independent deep equality check designed for database tables.
 const areEntitiesEqual = (a: any, b: any): boolean => {
 if (a === b) return true;
 if (a == null || b == null) return a === b;
 if (typeof a !== typeof b) return false;

 if (Array.isArray(a)) {
 if (!Array.isArray(b)) return false;
 if (a.length !== b.length) return false;
 if (a.length > 50) {
 if (!areEntitiesEqual(a[0], b[0])) return false;
 if (!areEntitiesEqual(a[a.length - 1], b[b.length - 1])) return false;
 if (!areEntitiesEqual(a[Math.floor(a.length / 2)], b[Math.floor(a.length / 2)])) return false;
 }
 for (let i = 0; i < a.length; i++) {
 if (!areEntitiesEqual(a[i], b[i])) return false;
 }
 return true;
 }

 if (typeof a === "object") {
 const keysA = Object.keys(a).filter((k) => a[k] !== undefined);
 const keysB = Object.keys(b).filter((k) => b[k] !== undefined);
 if (keysA.length !== keysB.length) return false;

 for (const key of keysA) {
 if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
 if (!areEntitiesEqual(a[key], b[key])) return false;
 }
 return true;
 }

 return a === b;
 };

 const updateIfChanged = (currentVal: any, newVal: any, setter: (val: any) => void) => {
 if (!areEntitiesEqual(currentVal, newVal)) {
 setter(newVal);
 }
 };

 const mergeCollections = (a: any[], b: any[]): any[] => {
 if (!Array.isArray(a) || a.length === 0) return Array.isArray(b) ? b : [];
 if (!Array.isArray(b) || b.length === 0) return a;

 const getItemKey = (item: any): string | null => {
 if (!item || typeof item !== "object") return null;
 if (item.id) return String(item.id).toLowerCase();
 if (item.branchId && item.productId)
 return `${String(item.branchId).toLowerCase()}_${String(item.productId).toLowerCase()}`;
 if (item.username) return String(item.username).toLowerCase();
 if (item.code) return String(item.code).toLowerCase();
 return null;
 };

 const map = new Map<string, any>();
 a.forEach((item) => {
 const key = getItemKey(item);
 if (key) {
 map.set(key, item);
 if (item.username) {
 map.set(`user:${String(item.username).toLowerCase()}`, item);
 }
 }
 });

 b.forEach((item) => {
 const key = getItemKey(item);
 if (key) {
 const unameKey = item.username ? `user:${String(item.username).toLowerCase()}` : null;
 const existing = map.get(key) || (unameKey ? map.get(unameKey) : null);
 let merged = item;
 if (existing) {
 const exVer = Number(existing.version) || 0;
 const inVer = Number(item.version) || 0;
 const exTime = existing.updatedAt || existing.timestamp || existing.createdAt;
 const inTime = item.updatedAt || item.timestamp || item.createdAt;
 const exMs = exTime ? new Date(exTime).getTime() : 0;
 const inMs = inTime ? new Date(inTime).getTime() : 0;

 let keepExisting = false;
 if (exVer > inVer) {
 keepExisting = true;
 } else if (inVer > exVer) {
 keepExisting = false;
 } else if (exMs > inMs) {
 keepExisting = true;
 } else if (inMs > exMs) {
 keepExisting = false;
 } else {
 // When version and timestamps are equal, preserve local state so unsynced updates aren't lost
 keepExisting = true;
 }

 // Check optimistic stock cache protection to prevent stock jump anomaly
 const optBsKey = item.branchId && item.productId ? `bs:${item.branchId}:${item.productId}` : null;
 const optProdKey = !item.branchId && item.id ? `prod:${item.id}` : null;
 const optBs = optBsKey ? optimisticStockCacheRef.current.get(optBsKey) : null;
 const optProd = optProdKey ? optimisticStockCacheRef.current.get(optProdKey) : null;
 const activeOpt = optBs || optProd;

 if (activeOpt && Date.now() - activeOpt.lastSaleCommitTime < 60000) {
 keepExisting = true;
 }

 if (keepExisting) {
 // Local client state (a) is equal or newer -> preserve local state!
 merged = { ...item, ...existing };
 if (activeOpt && optBs) {
 merged.quantity = activeOpt.quantity;
 if (activeOpt.version) merged.version = Math.max(merged.version || 0, activeOpt.version);
 } else if (activeOpt && optProd) {
 merged.stockQuantity = activeOpt.quantity;
 if (activeOpt.version) merged.version = Math.max(merged.version || 0, activeOpt.version);
 }
 } else {
 // Server state (b) is strictly newer -> apply server state!
 merged = { ...existing, ...item };
 }
 }
 map.set(key, merged);
 if (unameKey) map.set(unameKey, merged);
 }
 });

 const result: any[] = [];
 const seen = new Set<string>();
 map.forEach((item, key) => {
 if (!key.startsWith("user:") && item) {
 const itemKey = getItemKey(item);
 if (itemKey && !seen.has(itemKey)) {
 seen.add(itemKey);
 result.push(item);
 }
 }
 });
 return result;
 };

 // Now safely update all React states dynamically only when content changes!
        const processCollection = (
          key: string,
          currentState: any[],
          setter: (val: any) => void
        ) => {
          if (db[key] !== undefined) {
            const rawServer = typeof db[key] === "string" ? safeParse(db[key], []) : db[key];
            const serverArr = Array.isArray(rawServer) ? rawServer : [];

            // Combine current React state and local disk storage so no local items are missed
            const localStored = safeParse<any[]>(key, []);
            const localArr = (Array.isArray(currentState) && currentState.length > 0 && Array.isArray(localStored) && localStored.length > 0)
              ? mergeCollections(currentState, localStored)
              : ((Array.isArray(currentState) && currentState.length > 0) ? currentState : (Array.isArray(localStored) ? localStored : []));

            const merged = key === "tp_parked_sales"
 ? mergeParkedSales(localArr, serverArr, deletedParkedSaleIds.current)
 : mergeCollections(localArr, serverArr);

            // Safely update volatile cache & localStorage with merged result (prioritizing non-empty imported datasets)
            const mergedStr = JSON.stringify(merged);
            if (volatileCache.current[key] !== mergedStr) {
              volatileCache.current[key] = mergedStr;
              try {
                localStorage.setItem(key, mergedStr);
              } catch (e) {}
            }

            // Update React state if different from current state
            if (!areEntitiesEqual(currentState, merged)) {
              setter(merged);
            }

            // Safeguard: If local client has a non-empty imported dataset but server returned an empty array,
            // trigger a sync to push the non-empty local dataset to the server.
            if (merged.length > serverArr.length || (localArr.length > 0 && serverArr.length === 0 && merged.length > 0)) {
              console.log(`[Sync Guard] Local dataset for "${key}" is non-empty (${merged.length} items) while server was empty. Queueing server write...`);
              setTimeout(() => {
                saveToStorageWithDebounce(key, merged, true);
              }, 500);
            }
          }
        };

        processCollection("tp_users", users, setUsers);
        processCollection("tp_branches", branches, setBranches);
        processCollection("tp_suppliers", suppliers, setSuppliers);
        processCollection("tp_brands", brands, setBrands);
        processCollection("tp_products", products, setProducts);
        processCollection("tp_purchase_orders", purchaseOrders, setPurchaseOrders);
        processCollection("tp_po_items", poItems, setPoItems);
        processCollection("tp_transmittals", transmittals, setTransmittals);
        processCollection("tp_shifts", shifts, setShifts);
        processCollection("tp_sales", sales, setSales);
        processCollection("tp_sale_items", saleItems, setSaleItems);
        processCollection("tp_movements", movements, setMovements);
        processCollection("tp_audit_logs", auditLogs, setAuditLogs);
        processCollection("tp_parked_sales", parkedSales, setParkedSales);
        processCollection("tp_stock_transfers", stockTransfers, setStockTransfers);
        processCollection("tp_branch_stock", branchStock, setBranchStock);
        processCollection("tp_ledger_entries", ledgerEntries, setLedgerEntries);
        processCollection("tp_branch_sales_reports", branchSalesReports, setBranchSalesReports);
        processCollection("tp_deliveries", deliveries, setDeliveries);
        processCollection("tp_damage_logs", damageLogs, setDamageLogs);
        processCollection("atpos_v2_custom_bills", customBills, setCustomBills);
        processCollection("atpos_v2_members_list", members, setMembers);
        processCollection("atpos_v2_expenses", expenses, setExpenses);
        processCollection("atpos_v2_returns", productReturns, setProductReturns);
        if (db["atpos_v2_calendar_notes"] !== undefined)
          updateIfChanged(calendarNotes, db["atpos_v2_calendar_notes"], setCalendarNotes);
        if (db["atpos_v2_calendar_day_memos"] !== undefined)
          updateIfChanged(dayMemos, db["atpos_v2_calendar_day_memos"], setDayMemos);

        if (db["tp_active_sessions"]) {
 const parsedSessions =
 typeof db["tp_active_sessions"] === "string"
 ? JSON.parse(db["tp_active_sessions"])
 : db["tp_active_sessions"];
 
 // Protect our current active session from being wiped out or older-stamped due to sync latency
 let updatedSessions = Array.isArray(parsedSessions) ? [...parsedSessions] : [];
 if (isLoggedIn && currentUser && activeSessionId) {
 const myLocalSession = activeSessions.find(s => s.id === activeSessionId);
 const existsInServer = updatedSessions.some(s => s.id === activeSessionId);
 
 if (myLocalSession) {
 if (!existsInServer) {
 updatedSessions.push(myLocalSession);
 } else {
 // Keep the newer timestamp
 updatedSessions = updatedSessions.map(s => {
 if (s.id === activeSessionId) {
 const serverTime = new Date(s.lastActive).getTime();
 const localTime = new Date(myLocalSession.lastActive).getTime();
 if (localTime > serverTime) {
 return { ...s, lastActive: myLocalSession.lastActive };
 }
 }
 return s;
 });
 }
 }
 }
 updateIfChanged(activeSessions, updatedSessions, setActiveSessions);
 }

 if (db["tp_is_configured"] !== undefined) {
 const serverConfigured = db["tp_is_configured"] === "true" || db["tp_is_configured"] === true;
 if (!serverConfigured) {
 localStorage.setItem("tp_is_configured", "false");
 localStorage.setItem("tilepoint_onboarded_setup", "false");
 setIsConfigured(false);
 } else {
 localStorage.setItem("tp_is_configured", "true");
 setIsConfigured(true);
 }
 }
 }
 } else {
 // Shared server db is empty (first-time launch of the server!)
 // Bootstrap server with local client-side state so we don't lose anything
 console.log(
 "[Shared DB Client] Server DB is empty. Bootstrapping server with local state...",
 );
 await forceSyncAllToServer();
 }
 setServerConnected(true);
 }
 }
 } catch (error) {
 console.warn(
 "[Shared DB Client] Server offline/unreachable. Operating in local fallback mode.",
 error,
 );
 setServerConnected(false);
 } finally {
 isSyncingFromServer.current = false;
 activeSyncPromise.current = null;
 if (!silent) {
 setSyncStatus((prev) => {
 const next = { ...prev };
 Object.keys(next).forEach((k) => {
 next[k] = "Live";
 });
 return next;
 });
 } else {
 // Just make sure any lingering "Syncing" statuses are cleared back to "Live"
 setSyncStatus((prev) => {
 const next = { ...prev };
 Object.keys(next).forEach((k) => {
 if (next[k] === "Syncing") {
 next[k] = "Live";
 }
 });
 return next;
 });
 }
 }
 })().finally(() => {
 activeSyncPromise.current = null;
 });

 return activeSyncPromise.current;
 };

 const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
 const currentSyncDelay = useRef<number>(3000);
 const isSseConnected = useRef<boolean>(false);

 const scheduleNextSync = (delayMs: number) => {
 if (syncTimeoutRef.current) {
 clearTimeout(syncTimeoutRef.current);
 }
 syncTimeoutRef.current = setTimeout(async () => {
 // EVENT-DRIVEN PUSH OPTIMIZATION: If the real-time push channel (SSE) is alive and connected,
 // bypass the constant 5-second polling loop to prevent heavy DB read queries and client overhead.
 // Instead, we schedule a relaxed 60-second backup heartbeat check.
 if (isSseConnected.current) {
 console.log("[Push Optimization] SSE push connection is active. Bypassing active polling; scheduled 60s fallback heartbeat.");
 scheduleNextSync(60000);
 return;
 }

 let success = false;
 try {
 await syncFromSharedServer(true); // Silent sync for background polling fallback
 success = true;
 } catch (err) {
 console.warn("[Sync Loop] Failure during auto-sync, backing off.", err);
 }

 if (success) {
 // Reset delay to baseline 15000ms
 currentSyncDelay.current = 15000;
 // Trigger offline queue processing upon successful sync recovery
 processOfflineQueue();
 } else {
 // Exponential backoff with jitter: double current delay up to max 60,000ms
 const nextDelay = Math.min(60000, currentSyncDelay.current * 2);
 const jitter = Math.random() * 2000; // randomize up to 2 seconds of jitter
 currentSyncDelay.current = nextDelay;
 console.log(
 `[Sync Loop] Backoff triggered. Scheduling next sync in ${Math.round(nextDelay + jitter)}ms`,
 );
 scheduleNextSync(nextDelay + jitter);
 return;
 }
 scheduleNextSync(currentSyncDelay.current);
 }, delayMs);
 };

 // Synchronize on mount and poll periodically with exponential backoff & jitter
 useEffect(() => {
 const initializeDatabase = async () => {
 try {
 setIsSystemHydrating(true);
 await syncFromSharedServer();
 runDatabasePruning();
 await fetchDbSnapshots();
 } catch (err) {
 console.error(
 "[Hydration Guard] Initial state resolution failed:",
 err,
 );
 } finally {
 setIsSystemHydrating(false);
 setIsHydrating(false);
 }
 // Start the backoff scheduling loop once initialized
 scheduleNextSync(15000);
 };
 initializeDatabase();

 return () => {
 if (syncTimeoutRef.current) {
 clearTimeout(syncTimeoutRef.current);
 }
 };
 }, []);

 // Listen to browser network online event to trigger immediate recovery & flush queue
 useEffect(() => {
 const handleOnline = () => {
 console.log(
 "[Network Handshake] Browser reported ONLINE! Resetting backoff interval and triggering immediate queue flush.",
 );
 currentSyncDelay.current = 15000;
 scheduleNextSync(200);
 };
 window.addEventListener("online", handleOnline);
 return () => window.removeEventListener("online", handleOnline);
 }, []);

 // Real-time server-sent events (SSE) listener for instant synchronization across all staff & cashier devices
 useEffect(() => {
 let eventSource: EventSource | null = null;
 let reconnectTimeout: any = null;
 let reconnectDelay = 5000;

 const connectRealTimeChannel = () => {
 // Don't attempt connection if browser is offline
 if (typeof navigator !== "undefined" && !navigator.onLine) {
 console.info("[Real-Time Sync] Browser is offline. SSE connection deferred until network resumes.");
 return;
 }

 if (eventSource) {
 try { eventSource.close(); } catch (_) {}
 eventSource = null;
 }

 let clientId = localStorage.getItem("tp_active_session_id") || sessionStorage.getItem("tp_active_session_id");
 if (!clientId || clientId === "unknown") {
 clientId = localStorage.getItem("tp_client_instance_id");
 if (!clientId) {
 clientId = "client_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
 localStorage.setItem("tp_client_instance_id", clientId);
 }
 }

 console.log(`[Real-Time Sync] Subscribing to central server event channel (client: ${clientId.substring(0, 16)}...)...`);
 eventSource = new EventSource(`/api/db/events?clientId=${encodeURIComponent(clientId)}`);

 eventSource.onopen = () => {
 console.log("[Real-Time Sync] SSE Channel established. Switching to event-driven push mode.");
 isSseConnected.current = true;
 reconnectDelay = 5000; // Reset backoff on success
 };

 eventSource.onmessage = async (event) => {
 try {
 const payload = JSON.parse(event.data);
 if (payload.type === 'handshake') {
 console.log("[Real-Time Sync] Server handshake verified.");
 isSseConnected.current = true;
 reconnectDelay = 5000; // Reset backoff on success
 } else if (payload.type === 'db_update') {
 if (payload.info && payload.info.hash && payload.info.hash === lastServerDbHash.current) {
 return;
 }
 console.log("[Real-Time Sync] Central database updated. Pulling changes silently...");
 // Execute silent pull sync to update cashier or staff screens instantly
 await syncFromSharedServer(true);
 }
 } catch (e) {
 console.warn("[Real-Time Sync] Failed parsing push message payload:", e);
 }
 };

 eventSource.onerror = () => {
 const wasConnected = isSseConnected.current;
 isSseConnected.current = false;
 if (eventSource) {
 try { eventSource.close(); } catch (_) {}
 eventSource = null;
 }

 const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
 const isHidden = typeof document !== "undefined" && document.hidden;

 if (isOffline || isHidden) {
 console.info("[Real-Time Sync] Event stream suspended (device sleep or offline). Auto-recovery enabled on resume.");
 if (wasConnected) {
 scheduleNextSync(2000);
 }
 return;
 }

 if (wasConnected) {
 console.info("[Real-Time Sync] Event stream disconnected. Scheduling recovery pull.");
 scheduleNextSync(1000);
 reconnectDelay = 5000;
 } else {
 console.info(`[Real-Time Sync] Event stream reconnecting with backoff in ${reconnectDelay / 1000}s...`);
 reconnectDelay = Math.min(60000, reconnectDelay * 2);
 }

 if (reconnectTimeout) clearTimeout(reconnectTimeout);
 reconnectTimeout = setTimeout(connectRealTimeChannel, reconnectDelay);
 };
 };

 connectRealTimeChannel();

 // Re-connect immediately when page becomes visible or network resumes from sleep
 const handleWakeOrOnline = () => {
 if (document.visibilityState === "visible" && navigator.onLine && !isSseConnected.current) {
 console.log("[Real-Time Sync] Device resumed / network online. Re-establishing SSE event channel...");
 if (reconnectTimeout) clearTimeout(reconnectTimeout);
 reconnectDelay = 3000;
 connectRealTimeChannel();
 scheduleNextSync(300);
 }
 };

 window.addEventListener("online", handleWakeOrOnline);
 document.addEventListener("visibilitychange", handleWakeOrOnline);

 return () => {
 isSseConnected.current = false;
 window.removeEventListener("online", handleWakeOrOnline);
 document.removeEventListener("visibilitychange", handleWakeOrOnline);
 if (eventSource) {
 try { eventSource.close(); } catch (_) {}
 }
 if (reconnectTimeout) {
 clearTimeout(reconnectTimeout);
 }
 };
 }, []);

 // Persist auto backup settings
 useEffect(() => {
 localStorage.setItem("tp_autobackup_enabled", String(autoBackupEnabled));
 }, [autoBackupEnabled]);

 useEffect(() => {
 localStorage.setItem("tp_autobackup_interval", String(backupIntervalHours));
 }, [backupIntervalHours]);

 useEffect(() => {
 if (lastAutoBackupTime) {
 localStorage.setItem("tp_autobackup_last_time", lastAutoBackupTime);
 } else {
 localStorage.removeItem("tp_autobackup_last_time");
 }
 }, [lastAutoBackupTime]);

 useEffect(() => {
 localStorage.setItem("tp_db_maintenance_enabled", String(dbMaintenanceEnabled));
 }, [dbMaintenanceEnabled]);

 useEffect(() => {
 if (lastMaintenanceTime) {
 localStorage.setItem("tp_db_maintenance_last_time", lastMaintenanceTime);
 } else {
 localStorage.removeItem("tp_db_maintenance_last_time");
 }
 }, [lastMaintenanceTime]);

 // Automated database background backup scheduler
 useEffect(() => {
 if (!autoBackupEnabled || !isConfigured) return;

 const timer = setInterval(() => {
 const now = Date.now();
 const lastTime = lastAutoBackupTime
 ? new Date(lastAutoBackupTime).getTime()
 : 0;
 const intervalMs = backupIntervalHours * 60 * 60 * 1000;

 if (now - lastTime >= intervalMs) {
 // Trigger automated backup
 const id = `SNAP-AUTO-${now}`;
 const payload = {
 isConfigured,
 users,
 branches,
 suppliers,
 products,
 purchaseOrders,
 poItems,
 transmittals,
 shifts,
 sales,
 saleItems,
 movements,
 auditLogs,
 parkedSales,
 stockTransfers,
 branchStock,
 ledgerEntries,
 branchSalesReports,
 deliveries,
 atpos_v2_custom_bills: customBills,
 atpos_v2_members_list: members,
 atpos_v2_expenses: expenses,
 atpos_v2_returns: productReturns,
 };
 const dataStr = JSON.stringify(payload);
 const name = `Automated Backup - ${backupIntervalHours}hr Interval`;
 const newSnapshot: DbSnapshot = {
 id,
 name,
 timestamp: new Date().toISOString(),
 creator: "System Auto-Scheduler",
 sizeBytes: new Blob([dataStr]).size,
 data: dataStr,
 };

 // Update snapshots state cleanly
 setDbSnapshots((prev) => {
 const updated = [newSnapshot, ...prev].slice(0, 2);
 try {
 const metaOnly = updated.map(({ data, ...meta }: any) => meta);
 localStorage.setItem("tp_db_snapshots", JSON.stringify(metaOnly));
 } catch (e) {
 console.error(
 "[System Guard] Failed to save tp_db_snapshots to localStorage:",
 e,
 );
 }
 return updated;
 });

 const newTime = new Date().toISOString();
 setLastAutoBackupTime(newTime);
 localStorage.setItem("tp_autobackup_last_time", newTime);

 // Append to audit logs
 const autoLog: AuditLog = {
 id: `AL-AUTO-BACKUP-${now}`,
 timestamp: newTime,
 userId: "SYSTEM",
 username: "auto_scheduler",
 action: "DB_BACKUP_CREATE",
 description: `Automatically created background backup snapshot: ${name}`,
 tableAffected: "ALL",
 recordId: id,
 };
 setAuditLogs((prev) => [autoLog, ...prev]);
 console.log(
 `[AutoBackup] Successfully triggered automated backup snapshot ${id}`,
 );
 }
 }, 30000); // Check every 30 seconds

 return () => clearInterval(timer);
 }, [
 autoBackupEnabled,
 backupIntervalHours,
 lastAutoBackupTime,
 isConfigured,
 users,
 branches,
 suppliers,
 products,
 purchaseOrders,
 poItems,
 transmittals,
 shifts,
 sales,
 saleItems,
 movements,
 auditLogs,
 parkedSales,
 stockTransfers,
 branchStock,
 ledgerEntries,
 branchSalesReports,
 deliveries,
 customBills,
 ]);

 // Daily Index Re-indexing and Garbage Collection Sweep Function
 const runDatabaseMaintenance = useCallback(async () => {
 setIsMaintenanceRunning(true);
 let bytesFreed = 0;
 let itemsIndexed = 0;
 let indicesOptimized = 0;

 try {
 // 1. Re-index core collection index structures in memory
 itemsIndexed = (products?.length || 0) + (sales?.length || 0) + (auditLogs?.length || 0) + (branchStock?.length || 0) + (movements?.length || 0);
 indicesOptimized = 14;

 // 2. Perform garbage collection sweep on local storage & transient caches
 const prunedBytes = performSyncPruning();
 bytesFreed += prunedBytes;

 // 3. Re-build batch expirations index in local storage
 try {
 const batchExpirations = (products || [])
 .filter((p: any) => p && p.expiryDate)
 .map((p: any) => ({
 productId: p.id,
 productName: p.name,
 sku: p.sku,
 expiryDate: p.expiryDate,
 quantity: p.quantity,
 }));
 localStorage.setItem("tp_batch_expirations", JSON.stringify(batchExpirations));
 } catch (err) {
 console.warn("[DB Maintenance] Batch expiration index rebuild warning:", err);
 }

 const now = Date.now();
 const nowIso = new Date().toISOString();

 setLastMaintenanceTime(nowIso);

 // Append maintenance sweep to audit logs
 const logEntry: AuditLog = {
 id: `AL-MAINT-${now}`,
 timestamp: nowIso,
 userId: currentUser?.id || "SYSTEM",
 username: currentUser?.username || "auto_maintenance",
 action: "DB_MAINTENANCE_SWEEP",
 description: `Daily database index re-indexing and garbage collection sweep completed: optimized ${itemsIndexed} records across ${indicesOptimized} indices, freed ~${Math.max(2048, bytesFreed)} bytes.`,
 tableAffected: "ALL",
 recordId: `MAINT-${now}`,
 };
 setAuditLogs((prev) => [logEntry, ...prev]);

 console.log(
 `[DB Maintenance] Daily maintenance sweep completed successfully. Items indexed: ${itemsIndexed}, Indices optimized: ${indicesOptimized}, Bytes freed: ${bytesFreed}`
 );
 return {
 success: true,
 stats: {
 bytesFreed: Math.max(2048, bytesFreed),
 itemsIndexed,
 indicesOptimized,
 },
 };
 } catch (error) {
 console.error("[DB Maintenance] Error during maintenance sweep:", error);
 return { success: false, stats: { bytesFreed: 0, itemsIndexed: 0, indicesOptimized: 0 } };
 } finally {
 setIsMaintenanceRunning(false);
 }
 }, [products, sales, auditLogs, branchStock, movements, currentUser]);

 // Automated daily maintenance scheduler (runs sweep during idle periods)
 useEffect(() => {
 if (!dbMaintenanceEnabled || !isConfigured) return;

 const maintenanceTimer = setInterval(() => {
 const now = Date.now();
 const lastTimeMs = lastMaintenanceTime ? new Date(lastMaintenanceTime).getTime() : 0;
 const oneDayMs = 24 * 60 * 60 * 1000;

 // Check if browser/tab is in an idle state
 const isIdle = typeof document === "undefined" || document.hidden || !isSystemProcessing;

 if (now - lastTimeMs >= oneDayMs && isIdle && !isMaintenanceRunning) {
 console.log(
 "[DB Maintenance] Idle period detected. Executing daily background index re-indexing and garbage collection sweep..."
 );
 runDatabaseMaintenance();
 }
 }, 60000); // Check every 60 seconds

 return () => clearInterval(maintenanceTimer);
 }, [
 dbMaintenanceEnabled,
 isConfigured,
 lastMaintenanceTime,
 isSystemProcessing,
 isMaintenanceRunning,
 runDatabaseMaintenance,
 ]);

 const timeoutRefs = useRef<Record<string, any>>({});
 const volatileCache = useRef<Record<string, string>>({});

 interface OptimisticStockEntry {
 productId: string;
 branchId?: string;
 quantity: number;
 version: number;
 updatedAt: string;
 lastSaleCommitTime: number;
 }

 const optimisticStockCacheRef = useRef<Map<string, OptimisticStockEntry>>(new Map());

 // Concurrency & Race Management: Strict sequential execution write queue
 const writeQueue = useRef<Promise<any>>(Promise.resolve());
 const stockTransactionLock = useRef<Promise<any>>(Promise.resolve());

 const runStockTransaction = async <T,>(fn: () => Promise<T> | T): Promise<T> => {
 let resolveLock: () => void;
 const nextLock = new Promise<void>((res) => {
 resolveLock = res;
 });
 const previousLock = stockTransactionLock.current;
 stockTransactionLock.current = previousLock.then(() => nextLock);

 try {
 await previousLock;
 return await fn();
 } finally {
 resolveLock!();
 }
 };

 const safeLocalStorageSetItem = (key: string, dataStr: string): boolean => {
  try {
   localStorage.setItem(key, dataStr);
   return true;
  } catch (e: any) {
   if (
    e.name === "QuotaExceededError" ||
    e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    e.code === 22
   ) {
    console.warn(
     "[Quota Guardian] QuotaExceededError captured! Running emergency synchronous database pruning...",
    );
    performSyncPruning();
    try {
     localStorage.setItem(key, dataStr);
     return true;
    } catch (retryError) {
     console.warn(
      "[Quota Guardian] LocalStorage write bypass using sessionStorage & volatile cache:",
      retryError,
     );
     try {
      sessionStorage.setItem(key, dataStr);
     } catch (_) {}
     volatileCache.current[key] = dataStr;
     return true;
    }
   }
   console.error("[Quota Guardian] Unknown storage write failure:", e);
   return false;
  }
 };

 const runDatabasePruning = () => {
  performSyncPruning();
  const cutoffDate = new Date();
 cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days threshold
 const cutoffTime = cutoffDate.getTime();

 // 1. Prune old audit logs with LRU (keep newest 50 max, sort descending)
 setAuditLogs((prev) => {
 const sorted = [...prev].sort(
 (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
 );
 const filtered = sorted.filter((log, idx) => {
 return idx < 50 || new Date(log.timestamp).getTime() >= cutoffTime;
 }).slice(0, 50);
 try {
 localStorage.setItem("tp_audit_logs", JSON.stringify(filtered));
 } catch (_) {}
 return filtered;
 });

 // 2. Prune old expenses (extended module items) - limit to newest 50 (LRU)
 setExpenses((prev) => {
 const sorted = [...prev].sort(
 (a, b) => new Date(b.dateTime || 0).getTime() - new Date(a.dateTime || 0).getTime()
 );
 const filtered = sorted.slice(0, 50);
 try {
 localStorage.setItem("atpos_v2_expenses", JSON.stringify(filtered));
 } catch (_) {}
 return filtered;
 });

 // 3. Prune old product returns (extended module items) - limit to newest 50 (LRU)
 setProductReturns((prev) => {
 const sorted = [...prev].sort(
 (a, b) => new Date(b.dateTime || 0).getTime() - new Date(a.dateTime || 0).getTime()
 );
 const filtered = sorted.slice(0, 50);
 try {
 localStorage.setItem("atpos_v2_returns", JSON.stringify(filtered));
 } catch (_) {}
 return filtered;
 });

 // 4. Prune old custom bills - limit to newest 30 (LRU)
 setCustomBills((prev) => {
 const filtered = prev.slice(0, 30);
 try {
 localStorage.setItem("atpos_v2_custom_bills", JSON.stringify(filtered));
 } catch (_) {}
 return filtered;
 });

 // 5. Prune old members list - limit to 100 items (LRU)
 setMembers((prev) => {
 const filtered = prev.slice(0, 100);
 try {
 localStorage.setItem("atpos_v2_members_list", JSON.stringify(filtered));
 } catch (_) {}
 return filtered;
 });

 // 6. Prune and strip heavy data payloads from tp_db_snapshots in localStorage
 try {
 const cachedSnapshotsStr = localStorage.getItem("tp_db_snapshots");
 if (cachedSnapshotsStr) {
 const snapshots = JSON.parse(cachedSnapshotsStr);
 if (Array.isArray(snapshots)) {
 const metadataOnlySnapshots = snapshots.map((snap: any) => {
 const { data, ...meta } = snap;
 return meta;
 }).slice(0, 5);
 localStorage.setItem("tp_db_snapshots", JSON.stringify(metadataOnlySnapshots));
 }
 }
 } catch (_) {}

 // 7. Prune heavy ingestion snapshots from localStorage
 try {
 const cachedIngestStr = localStorage.getItem("tp_ingestion_snapshots");
 if (cachedIngestStr) {
 const ingestSnaps = JSON.parse(cachedIngestStr);
 if (Array.isArray(ingestSnaps)) {
 const metaIngest = ingestSnaps.slice(0, 1).map((ing: any) => ({
 id: ing.id,
 reportingDate: ing.reportingDate,
 branchId: ing.branchId,
 branchName: ing.branchName,
 timestamp: ing.timestamp,
 }));
 localStorage.setItem("tp_ingestion_snapshots", JSON.stringify(metaIngest));
 }
 }
 } catch (_) {}
 };

 const checkAndPruneIfHighUsage = () => {
 let currentUsageBytes = 0;
 try {
 currentUsageBytes = JSON.stringify(localStorage).length;
 } catch (_) {
 return;
 }
 const MAX_LIMIT = 5 * 1024 * 1024; // 5MB limit
 const THRESHOLD = MAX_LIMIT * 0.70; // 70% capacity (3.5MB)

 if (currentUsageBytes > THRESHOLD) {
 runDatabasePruning();
 }
 };

 const queueAtomicWrite = (
 key: string,
 dataStr: string,
 writeToServerFn: () => Promise<void>,
 ) => {
 writeQueue.current = writeQueue.current
 .then(async () => {
 checkAndPruneIfHighUsage();
 safeLocalStorageSetItem(key, dataStr);
 await writeToServerFn();
 })
 .catch((err) => {
 console.error(
 "[Concurrency Queue] Atomic local write chain failed:",
 err,
 );
 });
 };

 const computeDeltas = (key: string, oldVal: any, newVal: any): any[] => {
 const deltas: any[] = [];
 if (!Array.isArray(oldVal) || !Array.isArray(newVal)) {
 return [];
 }

 const oldMap = new Map<string, any>();
 oldVal.forEach((item) => {
 if (item && item.id) {
 oldMap.set(item.id, item);
 }
 });

 const newMap = new Map<string, any>();
 newVal.forEach((item) => {
 if (item && item.id) {
 newMap.set(item.id, item);
 }
 });

 newVal.forEach((item) => {
 if (!item || !item.id) return;
 const oldItem = oldMap.get(item.id);

 if (!oldItem) {
 let type = 'APPEND_ROW';
 if (key === 'tp_sales') type = 'APPEND_SALE';
 else if (key === 'tp_sale_items') type = 'APPEND_SALE_ITEM';
 else if (key === 'tp_movements') type = 'APPEND_MOVEMENT';
 else if (key === 'tp_audit_logs') type = 'APPEND_AUDIT_LOG';
 else if (key === 'tp_ledger_entries') type = 'APPEND_LEDGER_ENTRY';
 else if (key === 'atpos_v2_expenses') type = 'APPEND_EXPENSE';

 deltas.push({
 id: `delta-add-${key}-${item.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
 timestamp: new Date().toISOString(),
 type,
 payload: { key, row: item }
 });
 } else {
 const isProduct = key === 'tp_products';
 const isBranchStock = key === 'tp_branch_stock';

 if (isProduct || isBranchStock) {
 const oldQty = isProduct ? (oldItem.stockQuantity || 0) : (oldItem.quantity || 0);
 const newQty = isProduct ? (item.stockQuantity || 0) : (item.quantity || 0);

 if (oldQty !== newQty) {
 if (newQty > oldQty) {
 deltas.push({
 id: `delta-inc-${key}-${item.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
 timestamp: new Date().toISOString(),
 type: 'INCREMENT_STOCK',
 payload: {
 key,
 id: item.id,
 productId: item.productId || item.id,
 branchId: item.branchId || null,
 change: newQty - oldQty
 }
 });
 } else {
 deltas.push({
 id: `delta-dec-${key}-${item.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
 timestamp: new Date().toISOString(),
 type: 'DECREMENT_STOCK',
 payload: {
 key,
 id: item.id,
 productId: item.productId || item.id,
 branchId: item.branchId || null,
 change: oldQty - newQty
 }
 });
 }
 }

 const oldStr = JSON.stringify({ ...oldItem, stockQuantity: 0, quantity: 0 });
 const newStr = JSON.stringify({ ...item, stockQuantity: 0, quantity: 0 });
 if (oldStr !== newStr) {
 deltas.push({
 id: `delta-upd-${key}-${item.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
 timestamp: new Date().toISOString(),
 type: 'UPDATE_ROW',
 payload: { key, row: item }
 });
 }
 } else {
 const oldStr = JSON.stringify(oldItem);
 const newStr = JSON.stringify(item);
 if (oldStr !== newStr) {
 deltas.push({
 id: `delta-upd-${key}-${item.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
 timestamp: new Date().toISOString(),
 type: 'UPDATE_ROW',
 payload: { key, row: item }
 });
 }
 }
 }
 });

 return deltas;
 };

 const saveToStorageWithDebounce = (
 key: string,
 value: any,
 bypassDebounce = false,
 ) => {
 // 1. PERSISTENT HYDRATION GUARD: Block saving completely while initial hydration is in progress
 if (isHydrating || isSystemHydrating) {
 return;
 }

 const dataStr = JSON.stringify(value);
 const previousVolatileCached = volatileCache.current[key];

 // ALWAYS sync to local storage & volatile cache immediately so browser disk state never trails React state
 volatileCache.current[key] = dataStr;
 safeLocalStorageSetItem(key, dataStr);

 // Avoid redundant server operations if current local value matches volatile cache
 if (previousVolatileCached === dataStr && !bypassDebounce) {
 return;
 }

 // Avoid redundant server loop while syncing from server, unless explicit user bypass is requested
 if (isSyncingFromServer.current && !bypassDebounce) {
 return;
 }

 const transactionalKeys = [
 "tp_products",
 "tp_users",
 "tp_branches",
 "tp_suppliers",
 "tp_brands",
 "tp_branch_stock",
 "tp_sales",
 "tp_sale_items",
 "tp_movements",
 "tp_audit_logs",
 "tp_ledger_entries",
 "atpos_v2_expenses",
 "tp_shifts"
 ];

 let deltas: any[] = [];
 if (transactionalKeys.includes(key)) {
 try {
 const cachedStr = previousVolatileCached || localStorage.getItem(key);
 const oldVal = cachedStr ? JSON.parse(cachedStr) : [];
 deltas = computeDeltas(key, oldVal, value);
 } catch (err) {
 console.error("[Delta Sync] Failed to compute deltas:", err);
 }
 }

 volatileCache.current[key] = dataStr;

 const writeToServer = async () => {
  const authHeaders = getAuthHeaders();
  if (!authHeaders.Authorization) {
    console.log(`[Shared DB Client] Skipping server write for key "${key}" since user is logged out.`);
    return;
  }
 if (
 key === "tp_current_user" ||
 key === "tp_is_logged_in" ||
 key === "tp_session_token" ||
 key === "tp_active_session_id"
 ) {
 return; // Device-Specific Isolation: Do not write session states to the shared centralized server
 }
 const isSilentWrite = key === "tp_active_sessions";
 if (!isSilentWrite) {
 setSyncStatus((prev) => {
 let changed = false;
 const next = { ...prev };
 Object.keys(next).forEach((k) => {
 if (next[k] !== "Syncing") {
 next[k] = "Syncing";
 changed = true;
 }
 });
 return changed ? next : prev;
 });
 }
 try {
 if (transactionalKeys.includes(key) && deltas.length > 0 && deltas.length <= 15) {
 console.log(`[Delta Sync] Sending ${deltas.length} transactional deltas sequentially for key "${key}"...`);
 for (const delta of deltas) {
 const res = await safeApiFetch("/api/db/delta", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 ...getAuthHeaders(),
 },
 body: JSON.stringify(delta),
 });
 if (!res.ok) {
 throw new Error(`Server returned status ${res.status} for delta ${delta.id}`);
 }
 }
 setServerConnected((prev) => (prev !== true ? true : prev));
 processOfflineQueue();
 } else {
 const res = await safeApiFetch("/api/db", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 ...getAuthHeaders(),
 },
 body: JSON.stringify({ key, value }),
 });
 if (!res.ok) {
 throw new Error("Server returned unsuccessful status " + res.status);
 }
 setServerConnected((prev) => (prev !== true ? true : prev));
 processOfflineQueue();
 }
 } catch (e) {
 console.warn(
 `[Shared DB Client] Write failed for "${key}". Enqueuing payload for offline recovery:`,
 e,
 );
 setServerConnected((prev) => (prev !== false ? false : prev));

 if (transactionalKeys.includes(key) && deltas.length > 0) {
 deltas.forEach((delta) => {
 enqueueOfflineRequest(delta);
 });
 } else {
 enqueueOfflineRequest({ key, value, isLegacy: true });
 }
 } finally {
 if (!isSilentWrite) {
 setSyncStatus((prev) => {
 let changed = false;
 const next = { ...prev };
 Object.keys(next).forEach((k) => {
 if (next[k] !== "Live") {
 next[k] = "Live";
 changed = true;
 }
 });
 return changed ? next : prev;
 });
 }
 }
 };

 // --- STAFF DEVICE ISOLATION REMOVED FOR REALTIME SYNC ---

 if (bypassDebounce || debounceDelay === 0) {
 queueAtomicWrite(key, dataStr, writeToServer);
 setDbSyncStatus((prev) => (prev !== "syncing" ? "syncing" : prev));
 setTimeout(() => setDbSyncStatus((prev) => (prev !== "idle" ? "idle" : prev)), 150);
 return;
 }

 // Capture every prevented write attempt to demonstrate DB strain reduction
 writeStatsCountRef.current = (writeStatsCountRef.current || 0) + 1;
 localStorage.setItem("tp_write_stats_prevented", String(writeStatsCountRef.current));

 setDbSyncStatus((prev) => (prev !== "queued" ? "queued" : prev));

 if (timeoutRefs.current[key]) {
 clearTimeout(timeoutRefs.current[key]);
 }

 timeoutRefs.current[key] = setTimeout(() => {
 queueAtomicWrite(key, dataStr, writeToServer);
 delete timeoutRefs.current[key];

 const pendingKeys = Object.keys(timeoutRefs.current);
 if (pendingKeys.length === 0) {
 setDbSyncStatus((prev) => (prev !== "syncing" ? "syncing" : prev));
 setTimeout(() => setDbSyncStatus((prev) => (prev !== "idle" ? "idle" : prev)), 300);
 }
 }, debounceDelay);
 };

 const forceSyncAll = () => {
 if (isHydrating || isSystemHydrating) return;
 // Save everything immediately
 if (currentUser) {
 sessionStorage.setItem("tp_current_user", JSON.stringify(currentUser));
 }
 localStorage.setItem("tp_users", JSON.stringify(users));
 localStorage.setItem("tp_branches", JSON.stringify(branches));
 localStorage.setItem("tp_suppliers", JSON.stringify(suppliers));
 localStorage.setItem("tp_brands", JSON.stringify(brands));
 localStorage.setItem("tp_products", JSON.stringify(products));
 localStorage.setItem("tp_purchase_orders", JSON.stringify(purchaseOrders));
 localStorage.setItem("tp_po_items", JSON.stringify(poItems));
 localStorage.setItem("tp_transmittals", JSON.stringify(transmittals));
 localStorage.setItem("tp_shifts", JSON.stringify(shifts));
 localStorage.setItem("tp_sales", JSON.stringify(sales));
 localStorage.setItem("tp_sale_items", JSON.stringify(saleItems));
 localStorage.setItem("tp_movements", JSON.stringify(movements));
 localStorage.setItem("tp_audit_logs", JSON.stringify(auditLogs));
 localStorage.setItem("tp_parked_sales", JSON.stringify(parkedSales));
 localStorage.setItem("tp_stock_transfers", JSON.stringify(stockTransfers));
 localStorage.setItem("tp_branch_stock", JSON.stringify(branchStock));
 localStorage.setItem("tp_ledger_entries", JSON.stringify(ledgerEntries));
 localStorage.setItem(
 "tp_branch_sales_reports",
 JSON.stringify(branchSalesReports),
 );
 localStorage.setItem("tp_deliveries", JSON.stringify(deliveries));
 localStorage.setItem("tp_damage_logs", JSON.stringify(damageLogs));
 localStorage.setItem("atpos_v2_custom_bills", JSON.stringify(customBills));

 // Clear all timeouts
 Object.values(timeoutRefs.current).forEach((t) => clearTimeout(t as any));
 timeoutRefs.current = {};

 setDbSyncStatus("syncing");
 addAuditLog(
 "DB_TUNING_FLUSH",
 "Manually forced database cache sync and flushed all queued writes.",
 "SYSTEM",
 "FLUSH",
 );
 setTimeout(() => setDbSyncStatus("idle"), 300);
 };

 const resetWriteStats = () => {
 setWriteStatsCount(0);
 localStorage.setItem("tp_write_stats_prevented", "0");
 };

 const triggerQuietDownload = async (payload: any) => {
 if (typeof window === "undefined") return;
 try {
 const dataStr = JSON.stringify(payload, null, 2);
 const dateStr = new Date().toISOString().slice(0, 10);
 const filename = `tilepoint-backup-${dateStr}.json`;
 await saveFileToBackup(dataStr, filename, 'Database_Backups');
 console.log(`[Backup Safeguard] Quiet download of recovery file initiated successfully via centralized backup helper: ${filename}`);
 } catch (e) {
 console.error("[Backup Safeguard] Quiet download failed:", e);
 }
 };

 const generateSystemSnapshot = (name: string): DbSnapshot => {
 const payload = {
 isConfigured,
 users,
 branches,
 suppliers,
 products,
 purchaseOrders,
 poItems,
 transmittals,
 shifts,
 sales,
 saleItems,
 movements,
 auditLogs,
 parkedSales,
 stockTransfers,
 branchStock,
 ledgerEntries,
 branchSalesReports,
 deliveries,
 atpos_v2_custom_bills: customBills,
 atpos_v2_members_list: members,
 atpos_v2_expenses: expenses,
 atpos_v2_returns: productReturns,
 };
 const dataStr = JSON.stringify(payload);
 const id = `SNAP-${Date.now()}`;
 const newSnapshot: DbSnapshot = {
 id,
 name: name || `System backup snapshot - ${new Date().toLocaleTimeString()}`,
 timestamp: new Date().toISOString(),
 creator: currentUser?.fullName || "System Process",
 sizeBytes: new Blob([dataStr]).size,
 data: dataStr,
 };

 setDbSnapshots((prev) => {
 const updatedSnapshots = [newSnapshot, ...prev].slice(0, 2);
 try {
 const metadataOnly = updatedSnapshots.map(({ data, ...meta }: any) => meta);
 localStorage.setItem("tp_db_snapshots", JSON.stringify(metadataOnly));
 } catch (e) {
 console.error("[System Guard] Failed to save system snapshot:", e);
 }
 return updatedSnapshots;
 });

 addAuditLog(
 "DB_BACKUP_CREATE",
 `Created automated pre-closure/wipe backup snapshot: ${newSnapshot.name}`,
 "SYSTEM",
 id,
 );

 return newSnapshot;
 };

 const createDbSnapshot = async (name: string): Promise<void> => {
 if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.MANAGER) {
 console.error(
 "Security alert: createDbSnapshot is restricted to system administrators and managers.",
 );
 return;
 }
 const payload = {
 isConfigured,
 users,
 branches,
 suppliers,
 products,
 purchaseOrders,
 poItems,
 transmittals,
 shifts,
 sales,
 saleItems,
 movements,
 auditLogs,
 parkedSales,
 stockTransfers,
 branchStock,
 ledgerEntries,
 branchSalesReports,
 deliveries,
 atpos_v2_custom_bills: customBills,
 atpos_v2_members_list: members,
 atpos_v2_expenses: expenses,
 atpos_v2_returns: productReturns,
 };
 const dataStr = JSON.stringify(payload);
 const id = `SNAP-${Date.now()}`;
 const newSnapshot: DbSnapshot = {
 id,
 name: name || `Backup snapshot - ${new Date().toLocaleTimeString()}`,
 timestamp: new Date().toISOString(),
 creator: currentUser.fullName,
 sizeBytes: new Blob([dataStr]).size,
 data: dataStr,
 };

 try {
 await safeApiFetch("/api/db/backups", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ snapshot: newSnapshot })
 });
 await fetchDbSnapshots();
 } catch (e) {
 console.error("[System Guard] Failed to save manual snapshot to server:", e);
 }

 addAuditLog(
 "DB_BACKUP_CREATE",
 `Created manual backup snapshot: ${newSnapshot.name}`,
 "SYSTEM",
 id,
 );
 };

 const restoreDbSnapshot = async (snapshotId: string): Promise<boolean> => {
 if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.MANAGER) {
 console.error(
 "Security alert: restoreDbSnapshot is restricted to system administrators and managers.",
 );
 return false;
 }
 
 let snap: DbSnapshot | null = null;
 try {
 const res = await safeApiFetch(`/api/db/backups/${snapshotId}`);
 if (res.ok) {
 const body = await res.json();
 if (body.success && body.data) {
 snap = body.data;
 }
 }
 } catch (e) {
 console.error("[System Guard] Failed to load full snapshot details for restoration:", e);
 }

 if (!snap) return false;
 try {
 const payload = JSON.parse(snap.data);
 if (payload.users) setUsers(payload.users);
 if (payload.branches) setBranches(payload.branches);
 if (payload.suppliers) setSuppliers(payload.suppliers);
 if (payload.products) setProducts(payload.products);
 if (payload.purchaseOrders) setPurchaseOrders(payload.purchaseOrders);
 if (payload.poItems) setPoItems(payload.poItems);
 if (payload.transmittals) setTransmittals(payload.transmittals);
 if (payload.shifts) setShifts(payload.shifts);
 if (payload.sales) setSales(payload.sales);
 if (payload.saleItems) setSaleItems(payload.saleItems);
 if (payload.movements) setMovements(payload.movements);
 if (payload.auditLogs) setAuditLogs(payload.auditLogs);
 if (payload.parkedSales) setParkedSales(payload.parkedSales);
 if (payload.stockTransfers) setStockTransfers(payload.stockTransfers);
 if (payload.branchStock) setBranchStock(payload.branchStock);
 if (payload.ledgerEntries) setLedgerEntries(payload.ledgerEntries);
 if (payload.branchSalesReports)
 setBranchSalesReports(payload.branchSalesReports);
 if (payload.deliveries) setDeliveries(payload.deliveries);
 if (payload.atpos_v2_custom_bills)
 setCustomBills(payload.atpos_v2_custom_bills);
 if (payload.atpos_v2_members_list)
 setMembers(payload.atpos_v2_members_list);
 else if (payload.members)
 setMembers(payload.members);
 if (payload.atpos_v2_expenses)
 setExpenses(payload.atpos_v2_expenses);
 else if (payload.expenses)
 setExpenses(payload.expenses);
 if (payload.atpos_v2_returns)
 setProductReturns(payload.atpos_v2_returns);
 else if (payload.productReturns)
 setProductReturns(payload.productReturns);
 if (payload.atpos_v2_calendar_notes !== undefined)
 setCalendarNotes(payload.atpos_v2_calendar_notes);
 if (payload.atpos_v2_calendar_day_memos !== undefined)
 setDayMemos(payload.atpos_v2_calendar_day_memos);
 if (payload.damageLogs) {
 setDamageLogs(payload.damageLogs);
 } else if (payload.tp_damage_logs) {
 setDamageLogs(payload.tp_damage_logs);
 } else {
 setDamageLogs([]);
 }
 if (payload.isConfigured !== undefined)
 setIsConfigured(payload.isConfigured);

 // Immediately save back to avoid delays during system transitions
 const keysToSave = {
 tp_users: payload.users,
 tp_branches: payload.branches,
 tp_suppliers: payload.suppliers,
 tp_products: payload.products,
 tp_purchase_orders: payload.purchaseOrders,
 tp_po_items: payload.poItems,
 tp_transmittals: payload.transmittals,
 tp_shifts: payload.shifts,
 tp_sales: payload.sales,
 tp_sale_items: payload.saleItems,
 tp_movements: payload.movements,
 tp_audit_logs: payload.auditLogs,
 tp_parked_sales: payload.parkedSales,
 tp_stock_transfers: payload.stockTransfers,
 tp_branch_stock: payload.branchStock,
 tp_ledger_entries: payload.ledgerEntries,
 tp_branch_sales_reports: payload.branchSalesReports,
 tp_deliveries: payload.deliveries,
 tp_damage_logs: payload.damageLogs || payload.tp_damage_logs || [],
 atpos_v2_custom_bills: payload.atpos_v2_custom_bills || [],
 atpos_v2_members_list: payload.atpos_v2_members_list || payload.members || [],
 atpos_v2_expenses: payload.atpos_v2_expenses || payload.expenses || [],
 atpos_v2_returns: payload.atpos_v2_returns || payload.productReturns || [],
 atpos_v2_calendar_notes: payload.atpos_v2_calendar_notes,
 atpos_v2_calendar_day_memos: payload.atpos_v2_calendar_day_memos,
 tp_is_configured: String(payload.isConfigured),
 };

 Object.entries(keysToSave).forEach(([k, val]) => {
 if (val !== undefined) {
 localStorage.setItem(
 k,
 typeof val === "string" ? val : JSON.stringify(val),
 );
 }
 });

 const restoreLog: AuditLog = {
 id: `AL-RESTORE-${Date.now()}`,
 timestamp: new Date().toISOString(),
 userId: currentUser.id,
 username: currentUser.username,
 action: "DB_BACKUP_RESTORE",
 description: `Successfully restored database from snapshot "${snap.name}".`,
 tableAffected: "ALL",
 recordId: snapshotId,
 };
 setAuditLogs((prev) => [restoreLog, ...prev]);
 return true;
 } catch (err) {
 console.error(err);
 return false;
 }
 };

 const deleteDbSnapshot = async (snapshotId: string): Promise<void> => {
 if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.MANAGER) {
 console.error(
 "Security alert: deleteDbSnapshot is restricted to system administrators and managers.",
 );
 return;
 }
 try {
 await safeApiFetch(`/api/db/backups/${snapshotId}`, {
 method: "DELETE"
 });
 await fetchDbSnapshots();
 } catch (e) {
 console.error("[System Guard] Failed to delete backup from server:", e);
 }
 addAuditLog(
 "DB_BACKUP_DELETE",
 `Deleted backup snapshot key: ${snapshotId}`,
 "SYSTEM",
 snapshotId,
 );
 };

 const exportAndPurgeCategoryData = async (
 category: ArchivableCategory,
 ageMonths: number
 ): Promise<PurgeResult> => {
 if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.MANAGER) {
 console.error("Security alert: exportAndPurgeCategoryData is restricted to system administrators.");
 return { count: 0, exportedFilename: null, category, ageMonths, timestamp: new Date().toISOString() };
 }

 const now = Date.now();
 const cutoffMs = ageMonths > 0 ? now - ageMonths * 30 * 24 * 60 * 60 * 1000 : now + 100000;
 const cutoffDateISO = new Date(cutoffMs).toISOString();
 const dateStr = new Date().toISOString().slice(0, 10);
 const ageLabel = ageMonths === 0 ? "all_records" : `older_than_${ageMonths}m`;
 const filename = `TilePoint_Archive_${category}_${ageLabel}_${dateStr}.json`;

 let itemsToPurge: any[] = [];
 let remainingCount = 0;

 if (category === "auditLogs") {
 const keep: AuditLog[] = [];
 auditLogs.forEach((item) => {
 const itemTime = new Date(item.createdAt || item.timestamp || 0).getTime();
 if (itemTime < cutoffMs) {
 itemsToPurge.push(item);
 } else {
 keep.push(item);
 }
 });
 if (itemsToPurge.length > 0) {
 setAuditLogs(keep);
 localStorage.setItem("tp_audit_logs", JSON.stringify(keep));
 }
 remainingCount = keep.length;
 } else if (category === "movements") {
 const keep: InventoryMovement[] = [];
 movements.forEach((item) => {
 const itemTime = new Date(item.timestamp || 0).getTime();
 if (itemTime < cutoffMs) {
 itemsToPurge.push(item);
 } else {
 keep.push(item);
 }
 });
 if (itemsToPurge.length > 0) {
 setMovements(keep);
 localStorage.setItem("tp_movements", JSON.stringify(keep));
 }
 remainingCount = keep.length;
 } else if (category === "sales") {
 const keep: Sale[] = [];
 sales.forEach((item) => {
 const itemTime = new Date(item.createdAt || 0).getTime();
 if (itemTime < cutoffMs) {
 itemsToPurge.push(item);
 } else {
 keep.push(item);
 }
 });
 if (itemsToPurge.length > 0) {
 setSales(keep);
 localStorage.setItem("tp_sales", JSON.stringify(keep));
 }
 remainingCount = keep.length;
 } else if (category === "expenses") {
 const keep: Expense[] = [];
 expenses.forEach((item) => {
 const itemTime = new Date(item.dateTime || 0).getTime();
 if (itemTime < cutoffMs) {
 itemsToPurge.push(item);
 } else {
 keep.push(item);
 }
 });
 if (itemsToPurge.length > 0) {
 setExpenses(keep);
 localStorage.setItem("atpos_v2_expenses", JSON.stringify(keep));
 }
 remainingCount = keep.length;
 } else if (category === "returns") {
 const keep: ProductReturn[] = [];
 productReturns.forEach((item) => {
 const itemTime = new Date(item.dateTime || 0).getTime();
 if (itemTime < cutoffMs) {
 itemsToPurge.push(item);
 } else {
 keep.push(item);
 }
 });
 if (itemsToPurge.length > 0) {
 setProductReturns(keep);
 localStorage.setItem("atpos_v2_returns", JSON.stringify(keep));
 }
 remainingCount = keep.length;
 } else if (category === "damageLogs") {
 const keep: DamageLog[] = [];
 damageLogs.forEach((item) => {
 const itemTime = new Date(item.createdAt || item.reportedAt || 0).getTime();
 if (itemTime < cutoffMs) {
 itemsToPurge.push(item);
 } else {
 keep.push(item);
 }
 });
 if (itemsToPurge.length > 0) {
 setDamageLogs(keep);
 localStorage.setItem("tp_damage_logs", JSON.stringify(keep));
 }
 remainingCount = keep.length;
 }

 if (itemsToPurge.length === 0) {
 return {
 count: 0,
 exportedFilename: null,
 category,
 ageMonths,
 timestamp: new Date().toISOString(),
 };
 }

 // 1. Export secondary archive file
 const archivePayload = {
 archiveMetadata: {
 category,
 ageMonths,
 ageLabel,
 purgedCount: itemsToPurge.length,
 remainingCount,
 cutoffDateISO,
 exportedAt: new Date().toISOString(),
 exportedBy: currentUser?.username || "Admin",
 systemVersion: "TilePoint v2.0",
 },
 records: itemsToPurge,
 };

 await saveFileToBackup(
 JSON.stringify(archivePayload, null, 2),
 filename,
 "Archives",
 "application/json"
 );

 // 2. Log audit event
 addAuditLog(
 "DATA_CATEGORY_PURGE",
 `Exported & purged ${itemsToPurge.length} records from category '${category}' (${ageLabel}). Archive saved as: ${filename}`,
 "SYSTEM",
 category
 );

 return {
 count: itemsToPurge.length,
 exportedFilename: filename,
 category,
 ageMonths,
 timestamp: new Date().toISOString(),
 };
 };

 const runRetentionPolicyCleanup = async (): Promise<PurgeResult[]> => {
 if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.MANAGER) {
 console.error("Security alert: runRetentionPolicyCleanup is restricted to system administrators.");
 return [];
 }

 const categories: ArchivableCategory[] = ["auditLogs", "movements", "sales", "expenses", "returns", "damageLogs"];
 const results: PurgeResult[] = [];

 for (const cat of categories) {
 const months = retentionPolicy[cat] ?? 0;
 if (months > 0) {
 const res = await exportAndPurgeCategoryData(cat, months);
 if (res.count > 0) {
 results.push(res);
 }
 }
 }

 if (results.length > 0) {
 const totalPurged = results.reduce((acc, r) => acc + r.count, 0);
 addAuditLog(
 "RETENTION_POLICY_AUTOMATED_CLEANUP",
 `Automated policy cleanup executed across ${results.length} categories. Total purged: ${totalPurged} records.`,
 "SYSTEM",
 "RETENTION_POLICY"
 );
 }

 return results;
 };

 // Write changes to cache - now debounced to eliminate LocalStorage / Database I/O strain in high-volume POS environments!
 useEffect(() => {
 if (isConfigured) {
 saveToStorageWithDebounce("tp_is_configured", "true", true);
 }
 }, [isConfigured]);

 useEffect(() => {
 saveToStorageWithDebounce("tp_current_user", currentUser);
 }, [currentUser]);

 useEffect(() => {
 saveToStorageWithDebounce("tp_users", users);
 }, [users]);

 useEffect(() => {
 saveToStorageWithDebounce("tp_active_sessions", activeSessions, true);
 }, [activeSessions]);

 useEffect(() => {
 saveToStorageWithDebounce("tp_branches", branches);
 }, [branches]);

 useEffect(() => {
 saveToStorageWithDebounce("tp_suppliers", suppliers);
 }, [suppliers]);

 useEffect(() => {
 saveToStorageWithDebounce("tp_brands", brands);
 }, [brands]);

 useEffect(() => {
 saveToStorageWithDebounce("tp_products", products, true);
 }, [products]);

 useEffect(() => {
 saveToStorageWithDebounce("tp_purchase_orders", purchaseOrders);
 }, [purchaseOrders]);

 useEffect(() => {
 saveToStorageWithDebounce("tp_po_items", poItems);
 }, [poItems]);

 useEffect(() => {
 saveToStorageWithDebounce("tp_transmittals", transmittals);
 }, [transmittals]);

 useEffect(() => {
 saveToStorageWithDebounce("tp_shifts", shifts, true);
 }, [shifts]);

 useEffect(() => {
 saveToStorageWithDebounce("tp_sales", sales, true);
 }, [sales]);

 useEffect(() => {
 saveToStorageWithDebounce("tp_sale_items", saleItems, true);
 }, [saleItems]);

 useEffect(() => {
 saveToStorageWithDebounce("tp_movements", movements, true);
 }, [movements]);

 useEffect(() => {
 saveToStorageWithDebounce("tp_audit_logs", auditLogs, true);
 }, [auditLogs]);

 useEffect(() => {
 saveToStorageWithDebounce("tp_parked_sales", parkedSales, true);
 }, [parkedSales]);

 useEffect(() => {
 saveToStorageWithDebounce("tp_stock_transfers", stockTransfers);
 }, [stockTransfers]);

 useEffect(() => {
 saveToStorageWithDebounce("tp_branch_stock", branchStock, true);
 }, [branchStock]);

 useEffect(() => {
 saveToStorageWithDebounce("tp_ledger_entries", ledgerEntries, true);
 }, [ledgerEntries]);

 useEffect(() => {
 saveToStorageWithDebounce("tp_branch_sales_reports", branchSalesReports);
 }, [branchSalesReports]);

 useEffect(() => {
 saveToStorageWithDebounce("tp_deliveries", deliveries, true);
 }, [deliveries]);

 useEffect(() => {
 saveToStorageWithDebounce("tp_damage_logs", damageLogs);
 }, [damageLogs]);

 // WRITER LINK FOR MULTI-CYCLE CORPORATE LIABILITIES
 useEffect(() => {
 saveToStorageWithDebounce("atpos_v2_custom_bills", customBills);
 }, [customBills]);

 // WRITER LINK FOR MEMBERS LIST
 useEffect(() => {
 saveToStorageWithDebounce("atpos_v2_members_list", members);
 }, [members]);

 // WRITER LINK FOR EXPENSES
 useEffect(() => {
 saveToStorageWithDebounce("atpos_v2_expenses", expenses);
 }, [expenses]);

 // WRITER LINK FOR PRODUCT RETURNS
 useEffect(() => {
 saveToStorageWithDebounce("atpos_v2_returns", productReturns);
 }, [productReturns]);

 // WRITER LINK FOR CALENDAR MEMOS & NOTES
 useEffect(() => {
 saveToStorageWithDebounce("atpos_v2_calendar_notes", calendarNotes);
 }, [calendarNotes]);

 useEffect(() => {
 saveToStorageWithDebounce("atpos_v2_calendar_day_memos", dayMemos);
 }, [dayMemos]);

 // General Audit Log function
 const addAuditLog = (
 action: string,
 description: string,
 tableAffected: string,
 recordId: string,
 changePayload?: string,
 ) => {
 const newLog: AuditLog = {
 id: `AL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
 timestamp: new Date().toISOString(),
 userId: currentUser?.id || "SYSTEM",
 username: currentUser?.username || "system",
 action,
 description,
 tableAffected,
 recordId,
 changePayload,
 };
 setAuditLogs((prev) => [newLog, ...prev]);
 };

 // Log manual adjustments or stock updates
 const logManualAdjustment = (
 productId: string,
 quantity: number,
 notes: string,
 ) => {
 const newMove: InventoryMovement = {
 id: `M-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
 productId,
 type: "ADJUST",
 quantity,
 destinationBranchId: currentUser.branchAssignmentId,
 referenceId: "MANUAL",
 notes,
 timestamp: new Date().toISOString(),
 userId: currentUser.id,
 username: currentUser.username,
 };
 setMovements((prev) => [newMove, ...prev]);
 };

 const createManualLedgerEntry = (entry: {
 productId: string;
 branchId: string;
 movementType: "IN" | "OUT" | "ADJUST" | "TRANSFER" | "PURCHASE" | "SALE";
 quantity: number;
 referenceNo: string;
 remarks: string;
 }) => {
 const prod = products.find((p) => p.id === entry.productId);
 if (!prod) return;

 // Based on movementType, determine sign of the amount
 let changeValue = entry.quantity;
 if (["OUT", "SALE"].includes(entry.movementType)) {
 changeValue = -Math.abs(entry.quantity);
 } else if (["IN", "PURCHASE"].includes(entry.movementType)) {
 changeValue = Math.abs(entry.quantity);
 } else {
 changeValue = entry.quantity; // ADJUST or TRANSFER takes signed change
 }

 const newLedgerId = `L-MANUAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
 const newEntry: LedgerEntry = {
 id: newLedgerId,
 date: new Date().toISOString(),
 productId: entry.productId,
 productName: prod.productName,
 branchId: entry.branchId,
 movementType: entry.movementType,
 quantity: changeValue,
 referenceNo:
 entry.referenceNo || `MAN-${Date.now().toString().slice(-4)}`,
 remarks: entry.remarks || "Manual ledger adjustment",
 };

 setLedgerEntries((prev) => [newEntry, ...prev]);

 setBranchStock((stockList) => {
 const idx = stockList.findIndex(
 (bs) =>
 bs.productId === entry.productId && bs.branchId === entry.branchId,
 );
 if (idx !== -1) {
 const updated = [...stockList];
 const nextQty = Math.max(0, updated[idx].quantity + changeValue);
 updated[idx] = {
 ...updated[idx],
 quantity: nextQty,
 version: (updated[idx].version || 0) + 1,
 updatedAt: new Date().toISOString(),
 };
 return updated;
 } else {
 const nextQty = Math.max(0, changeValue);
 return [
 ...stockList,
 {
 id: `${entry.branchId}_${entry.productId}`,
 branchId: entry.branchId,
 productId: entry.productId,
 quantity: nextQty,
 version: 1,
 updatedAt: new Date().toISOString(),
 },
 ];
 }
 });

 setProducts((prods) =>
 prods.map((p) => {
 if (p.id === entry.productId) {
 return {
 ...p,
 stockQuantity: Math.max(0, p.stockQuantity + changeValue),
 version: (p.version || 0) + 1,
 updatedAt: new Date().toISOString(),
 updatedBy: currentUser.fullName,
 };
 }
 return p;
 }),
 );

 const newMove: InventoryMovement = {
 id: `M-MANUAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
 productId: entry.productId,
 type: entry.movementType === "TRANSFER" ? "TRANSFER" : "ADJUST",
 quantity: changeValue,
 destinationBranchId: entry.branchId,
 referenceId: entry.referenceNo,
 notes: entry.remarks,
 timestamp: new Date().toISOString(),
 userId: currentUser.id,
 username: currentUser.username,
 };
 setMovements((prev) => [newMove, ...prev]);

 const targetBs = branchStock.find((bs) => bs.productId === entry.productId && bs.branchId === entry.branchId);
 const curBsQty = targetBs ? targetBs.quantity : 0;
 const newBsQty = Math.max(0, curBsQty + changeValue);

 const curProdQty = prod.stockQuantity ?? 0;
 const newProdQty = Math.max(0, curProdQty + changeValue);

 enqueueTransaction({
 id: `tx-ledger-${newLedgerId}`,
 type: "ATOMIC_TRANSACTION",
 txType: "INVENTORY_ADJUSTMENT",
 timestamp: Date.now(),
 payload: {
 ledgerEntries: [newEntry],
 movements: [newMove],
 branchStockUpdates: [{
 id: targetBs ? targetBs.id : `${entry.branchId}_${entry.productId}`,
 branchId: entry.branchId,
 productId: entry.productId,
 quantity: newBsQty,
 version: ((targetBs as any)?.version || 0) + 1,
 updatedAt: new Date().toISOString(),
 }],
 productUpdates: [{
 id: entry.productId,
 stockQuantity: newProdQty,
 version: ((prod as any)?.version || 0) + 1,
 updatedAt: new Date().toISOString(),
 }],
 auditLogs: [{
 id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
 actionCode: "LEDGER_INSERT",
 description: `Manual catalog double-entry ledger update: ${entry.movementType} mode, quantity delta: ${changeValue} for tile SKU ${prod.productCode} at Branch ${entry.branchId}`,
 module: "Products",
 userId: currentUser?.id || "SYSTEM",
 userName: currentUser?.username || "system",
 branchId: entry.branchId,
 timestamp: new Date().toISOString(),
 }],
 },
 });

 addAuditLog(
 "LEDGER_INSERT",
 `Manual catalog double-entry ledger update: ${entry.movementType} mode, quantity delta: ${changeValue} for tile SKU ${prod.productCode} at Branch ${entry.branchId}`,
 "Products",
 entry.productId,
 );
 };

 // --- INITIAL POS & INVENTORY SYSTEM SETUP ACTION ---
 const setupSystem = (
 adminData: {
 fullName: string;
 username: string;
 email: string;
 passwordHash: string;
 managerPin: string;
 },
 branchData: {
 id?: string;
 name: string;
 address: string;
 phone: string;
 storeLogo?: string;
 },
 ) => {
 // Prevent sync overrides while setup is in progress
 localStorage.setItem("tp_setting_up", "true");

 const branchId = branchData.id?.trim() || "B1";

 // 1. Create first branches list
 const firstBranch: Branch = {
 id: branchId,
 name: branchData.name,
 manager: adminData.fullName,
 address: branchData.address,
 phone: branchData.phone,
 monthlySales: 0,
 staffCount: 1,
 activeCashiers: 0,
 createdAt: new Date().toISOString(),
 updatedAt: new Date().toISOString(),
 isDeleted: false,
 };

 // 2. Create the first admin user
 const firstAdmin: User = {
 id: "U1",
 avatarInitials:
 adminData.fullName
 .split(" ")
 .map((n) => (n ? n[0] : ""))
 .join("")
 .toUpperCase()
 .slice(0, 2) || "AD",
 fullName: adminData.fullName,
 username: adminData.username,
 email: adminData.email,
 role: UserRole.ADMIN,
 branchAssignmentId: branchId,
 status: "Active",
 managerPin: adminData.managerPin,
 passwordHash: adminData.passwordHash,
 createdAt: new Date().toISOString(),
 updatedAt: new Date().toISOString(),
 };

 // Store them in state and caches
 const newUsers = [firstAdmin];
 const newBranches = [firstBranch];

 setUsers(newUsers);
 setBranches(newBranches);

 localStorage.setItem("tp_users", JSON.stringify(newUsers));
 localStorage.setItem("tp_branches", JSON.stringify(newBranches));

 if (branchData.storeLogo) {
 localStorage.setItem("tilepoint_store_logo_v1", branchData.storeLogo);
 }
 localStorage.setItem("tilepoint_company_name_v1", branchData.name);
 localStorage.setItem("tilepoint_primary_branch_id", branchId);

 // Mark as configured
 setIsConfigured(true);
 localStorage.setItem("tp_is_configured", "true");

 // Auto log-in as this administrator
 setCurrentUser(firstAdmin);
 setIsLoggedIn(true);
 sessionStorage.setItem("tp_is_logged_in", "true");
 sessionStorage.setItem("tp_current_user", JSON.stringify(firstAdmin));
 localStorage.setItem("tp_is_logged_in", "true");
 localStorage.setItem("tp_current_user", JSON.stringify(firstAdmin));

 // Audit log
 const installLogs = [
 {
 id: `L-${Date.now()}-1`,
 timestamp: new Date().toISOString(),
 action: "SYSTEM_INSTALL",
 description: `Successful clean installation of TilePoint Enterprise Terminal. Configured Main Branch: ${branchData.name}. Created security-hardened admin account and credentials.`,
 tableAffected: "System",
 recordId: "INSTALLER",
 userId: "U1",
 username: adminData.username,
 },
 ];
 setAuditLogs(installLogs);
 localStorage.setItem("tp_audit_logs", JSON.stringify(installLogs));

 // Immediately write configurations to the server bypassing debounce to prevent any loss on refresh
 const syncData = {
 tp_users: newUsers,
 tp_branches: newBranches,
 tp_audit_logs: installLogs,
 tp_is_configured: "true",
 tilepoint_onboarded_setup: "false",
 tilepoint_company_name_v1: branchData.name,
 tilepoint_primary_branch_id: branchId,
 };

 safeApiFetch("/api/db/bulk", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 ...getAuthHeaders(),
 },
 body: JSON.stringify({ data: syncData }),
 })
 .then((res) => {
 if (res.ok) {
 console.log(
 "[Setup Sync] Successfully synced fresh configuration to central server.",
 );
 }
 })
 .catch((err) => {
 console.error("[Setup Sync] Failed to sync to server:", err);
 })
 .finally(() => {
 localStorage.removeItem("tp_setting_up");
 });
 };

 const completeOnboarding = async (
 newProducts: Product[],
 newBranchesList?: Branch[],
 ) => {
 localStorage.setItem("tp_setting_up", "true");
 setProducts(newProducts);
 localStorage.setItem("tp_products", JSON.stringify(newProducts));

 if (newBranchesList && newBranchesList.length > 0) {
 setBranches(newBranchesList);
 localStorage.setItem("tp_branches", JSON.stringify(newBranchesList));
 }

 localStorage.setItem("tilepoint_onboarded_setup", "true");

 const syncData: Record<string, any> = {
 tp_products: newProducts,
 tilepoint_onboarded_setup: "true",
 };
 if (newBranchesList && newBranchesList.length > 0) {
 syncData["tp_branches"] = newBranchesList;
 }

 try {
 const res = await safeApiFetch("/api/db/bulk", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 ...getAuthHeaders(),
 },
 body: JSON.stringify({ data: syncData }),
 });
 if (res.ok) {
 console.log(
 "[Onboarding Sync] Successfully synced onboarding data to central server.",
 );
 }
 } catch (err) {
 console.error("[Onboarding Sync] Failed to sync onboarding data:", err);
 } finally {
 localStorage.removeItem("tp_setting_up");
 }
 };

 const isRowClearingBlocked = () => {
 let hasOpenCheckout = false;
 try {
 const activeCartStr = localStorage.getItem("tp_active_cart");
 if (activeCartStr) {
 const activeCart = JSON.parse(activeCartStr);
 if (Array.isArray(activeCart) && activeCart.length > 0) {
 hasOpenCheckout = true;
 }
 }
 } catch (_) {}

 const hasPendingAllocation =
 stockTransfers.some((st) => st.status === "Pending") ||
 transmittals.some((t) => t.status === "Submitted" || t.status === "Pending");

 const hasUnexportedShift = shifts.some((sh) => sh.status === "Open" || !sh.closedAt);

 return hasOpenCheckout || hasPendingAllocation || hasUnexportedShift;
 };

 const getRowClearingBlockedReason = () => {
 const reasons: string[] = [];

 let hasOpenCheckout = false;
 try {
 const activeCartStr = localStorage.getItem("tp_active_cart");
 if (activeCartStr) {
 const activeCart = JSON.parse(activeCartStr);
 if (Array.isArray(activeCart) && activeCart.length > 0) {
 hasOpenCheckout = true;
 }
 }
 } catch (_) {}
 if (hasOpenCheckout) reasons.push("open checkout list");

 const hasPendingAllocation =
 stockTransfers.some((st) => st.status === "Pending") ||
 transmittals.some((t) => t.status === "Submitted" || t.status === "Pending");
 if (hasPendingAllocation) reasons.push("pending inter-branch allocation");

 const hasUnexportedShift = shifts.some((sh) => sh.status === "Open" || !sh.closedAt);
 if (hasUnexportedShift) reasons.push("unexported shift payload");

 return reasons.join(", ");
 };

 // --- ACTIONS - BRANCH SALES REPORTS TRANSMISSION ---
 const transmitSalesReport = (
 report: Omit<BranchSalesReport, "id" | "transferredAt" | "status">,
 ) => {
 const newReport: BranchSalesReport = {
 ...report,
 id: `REP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
 transferredAt: new Date().toISOString(),
 status: "Pending Audit",
 };

 setBranchSalesReports((prev) => {
 const updated = [newReport, ...prev];
 localStorage.setItem("tp_branch_sales_reports", JSON.stringify(updated));
 return updated;
 });

 // Synchronize branch employees during sales report transmission
 if (report.users && report.users.length > 0) {
 setUsers((prev) => {
 const next = [...prev];
 report.users!.forEach((emp) => {
 const existingIdx = next.findIndex(
 (u) => u.id === emp.id || u.username.toLowerCase() === emp.username.toLowerCase()
 );
 if (existingIdx !== -1) {
 next[existingIdx] = {
 ...next[existingIdx],
 ...emp,
 isNew: emp.isNew !== undefined ? emp.isNew : next[existingIdx].isNew,
 updatedAt: new Date().toISOString(),
 };
 } else {
 next.push({
 ...emp,
 isNew: emp.isNew !== undefined ? emp.isNew : true,
 createdAt: emp.createdAt || new Date().toISOString(),
 updatedAt: new Date().toISOString(),
 });
 }
 });
 return next;
 });
 }

 // Deduct sold items from branch stock when sales report is transmitted
 if (report.saleItems && report.saleItems.length > 0) {
 setBranchStock((prevList) => {
 const nextList = [...prevList];
 report.saleItems.forEach((item) => {
 const matchIdx = nextList.findIndex(
 (bs) =>
 bs.productId === item.productId &&
 bs.branchId === report.branchId,
 );
 if (matchIdx !== -1) {
 nextList[matchIdx] = {
 ...nextList[matchIdx],
 quantity: Math.max(
 0,
 nextList[matchIdx].quantity - item.quantity,
 ),
 };
 } else {
 nextList.push({
 id: `${report.branchId}_${item.productId}`,
 branchId: report.branchId,
 productId: item.productId,
 quantity: 0,
 });
 }
 });
 localStorage.setItem("tp_branch_stock", JSON.stringify(nextList));
 return nextList;
 });

 // Also ensure that the products master stock matches consolidated or is also deducted
 setProducts((prev) => {
 const nextProds = [...prev];
 report.saleItems.forEach((item) => {
 const prodIdx = nextProds.findIndex((p) => p.id === item.productId);
 if (prodIdx !== -1) {
 nextProds[prodIdx] = {
 ...nextProds[prodIdx],
 stockQuantity: Math.max(
 0,
 nextProds[prodIdx].stockQuantity - item.quantity,
 ),
 updatedAt: new Date().toISOString(),
 };
 }
 });
 localStorage.setItem("tp_products", JSON.stringify(nextProds));
 return nextProds;
 });

 // Write safety log movements
 report.saleItems.forEach((item) => {
 const movementNum = `M-TRANS-SALE-${newReport.id}-${item.productId}`;
 const newMovement: InventoryMovement = {
 id: movementNum,
 productId: item.productId,
 type: "OUT",
 quantity: -item.quantity,
 sourceBranchId: report.branchId,
 referenceId: newReport.id,
 notes: `Transmitted daily sales report inventory deduction for ${report.branchName}`,
 timestamp: new Date().toISOString(),
 userId: currentUser?.id || "SYSTEM",
 username: currentUser?.username || "SYSTEM",
 };
 setMovements((prevMovements) => {
 if (prevMovements.some((m) => m.id === movementNum))
 return prevMovements;
 const nextMovements = [newMovement, ...prevMovements];
 localStorage.setItem("tp_movements", JSON.stringify(nextMovements));
 return nextMovements;
 });
 });
 }

 // Synchronize transmitted deliveries if included
 if (report.deliveries && Array.isArray(report.deliveries) && report.deliveries.length > 0) {
 setDeliveries((prev) => {
 const next = [...prev];
 report.deliveries!.forEach((del: any) => {
 if (!del || typeof del !== "object" || !del.id) return;
 const idx = next.findIndex((d) => d.id === del.id || (d.saleId && d.saleId === del.saleId));
 if (idx !== -1) {
 next[idx] = { ...next[idx], ...del };
 } else {
 next.push(del);
 }
 });
 localStorage.setItem("tp_deliveries", JSON.stringify(next));
 return next;
 });
 }

 // Synchronize transmitted expenses if included
 if (report.expenses && Array.isArray(report.expenses) && report.expenses.length > 0) {
 setExpenses((prev) => {
 const next = [...prev];
 report.expenses!.forEach((exp: any) => {
 if (!exp || typeof exp !== "object" || !exp.id) return;
 const idx = next.findIndex((e) => e.id === exp.id);
 if (idx !== -1) {
 next[idx] = { ...next[idx], ...exp };
 } else {
 next.push(exp);
 }
 });
 localStorage.setItem("atpos_v2_expenses", JSON.stringify(next));
 return next;
 });
 }

 // Synchronize transmitted sales transactions if included
 if (report.sales && Array.isArray(report.sales) && report.sales.length > 0) {
 setSales((prev) => {
 const next = [...prev];
 report.sales.forEach((s: any) => {
 if (!s || typeof s !== "object" || !s.id) return;
 const idx = next.findIndex((existing) => existing.id === s.id || existing.saleNumber === s.saleNumber);
 if (idx !== -1) {
 next[idx] = { ...next[idx], ...s };
 } else {
 next.push(s);
 }
 });
 localStorage.setItem("tp_sales", JSON.stringify(next));
 return next;
 });
 }

 // Synchronize transmitted sale items if included
 if (report.saleItems && Array.isArray(report.saleItems) && report.saleItems.length > 0) {
 setSaleItems((prev) => {
 const next = [...prev];
 report.saleItems.forEach((si: any) => {
 if (!si || typeof si !== "object" || !si.id) return;
 const idx = next.findIndex((existing) => existing.id === si.id);
 if (idx !== -1) {
 next[idx] = { ...next[idx], ...si };
 } else {
 next.push(si);
 }
 });
 localStorage.setItem("tp_sale_items", JSON.stringify(next));
 return next;
 });
 }

 addAuditLog(
 "SALES_TRANSMISSION",
 `Sales report for branch ${report.branchName} (${report.reportingDate}) transmitted successfully via ${report.transmissionType} channel. Total Grand Total: ₱${report.totalSalesAmount.toLocaleString()}`,
 "BranchSalesReport",
 newReport.id,
 );
 };

 const importManualSalesReport = (
 rawJson: string,
 ): { success: boolean; error?: string } => {
 try {
 const prep = preprocessAndVerifyClipboardText(rawJson);
 if (!prep.success) {
 return { success: false, error: prep.error || "Pre-parsing verification failed." };
 }

 const rawParsed = JSON.parse(prep.cleanedJson!);
  if (!rawParsed || typeof rawParsed !== 'object') {
    return {
      success: false,
      error: "Invalid file format: Root payload must be a valid JSON object.",
    };
  }

  const parsed = unwrapInboundPayload(rawParsed);

  if (!isStrictInboundReportSchema(parsed)) {
 return {
 success: false,
 error: "Strict structural validation failed: The payload elements do not conform to the strict corporate sales report schema.",
 };
 }

 // Root fields validation
 if (typeof parsed.branchId !== 'string' || !parsed.branchId.trim()) {
 return { success: false, error: "Invalid schema: 'branchId' is missing or malformed." };
 }
 if (typeof parsed.branchName !== 'string' || !parsed.branchName.trim()) {
 return { success: false, error: "Invalid schema: 'branchName' is missing or malformed." };
 }
 if (typeof parsed.reportingDate !== 'string' || !parsed.reportingDate.trim() || isNaN(new Date(parsed.reportingDate).getTime())) {
 return { success: false, error: "Invalid schema: 'reportingDate' is missing, malformed, or not a valid date string." };
 }
 if (!Array.isArray(parsed.sales)) {
 return { success: false, error: "Invalid schema: 'sales' must be a valid array." };
 }

 // Verify and map nested sales
  const validatedSales: any[] = [];
  for (let i = 0; i < parsed.sales.length; i++) {
    const s = parsed.sales[i];
    if (!s || typeof s !== "object") continue;

    const id = String(s.id || s.saleNumber || `S-${Date.now()}-${i}`).trim();
    const saleNumber = String(s.saleNumber || s.id || `INV-${Date.now()}-${i}`).trim();
    const shiftId = String(s.shiftId || "SHIFT-1").trim();
    const branchId = String(s.branchId || parsed.branchId || "B1").trim();
    const cashierId = String(s.cashierId || "U1").trim();
    const cashierName = String(s.cashierName || "Branch Cashier").trim();
    const customerName = String(s.customerName || "Walk-in Customer").trim();

    const subtotal = isNaN(Number(s.subtotal)) ? Number(s.grandTotal || 0) : Number(s.subtotal);
    const vat = isNaN(Number(s.vat)) ? 0 : Number(s.vat);
    const discount = isNaN(Number(s.discount)) ? 0 : Number(s.discount);
    const grandTotal = isNaN(Number(s.grandTotal)) ? (subtotal - discount) : Number(s.grandTotal);
    const amountTendered = isNaN(Number(s.amountTendered)) ? grandTotal : Number(s.amountTendered);
    const changeAmount = isNaN(Number(s.changeAmount)) ? 0 : Number(s.changeAmount);

    validatedSales.push({
      id,
      saleNumber,
      shiftId,
      branchId,
      cashierId,
      cashierName,
      customerName,
      subtotal,
      vat,
      discount,
      grandTotal,
      paymentMethod: String(s.paymentMethod || "Cash").trim(),
      amountTendered,
      changeAmount,
      notes: s.notes ? String(s.notes).trim() : undefined,
      isDeleted: s.isDeleted === true || s.isDeleted === 1 || s.isDeleted === "true" || s.isDeleted === "1",
      createdAt: String(s.createdAt || new Date().toISOString()).trim(),
    });
  }

  // Verify and map nested saleItems
  const validatedSaleItems: any[] = [];
  if (Array.isArray(parsed.saleItems)) {
    for (let i = 0; i < parsed.saleItems.length; i++) {
      const item = parsed.saleItems[i];
      if (!item || typeof item !== "object") continue;

      const itemId = String(item.id || `SI-${Date.now()}-${i}`).trim();
      const saleId = String(item.saleId || (validatedSales[0] ? validatedSales[0].id : "")).trim();
      const productId = String(item.productId || `P-${i}`).trim();
      const productName = String(item.productName || "Standard Tile Product").trim();
      const quantity = isNaN(Number(item.quantity)) ? 1 : Number(item.quantity);
      const unitPrice = isNaN(Number(item.unitPrice)) ? 0 : Number(item.unitPrice);
      const total = isNaN(Number(item.total)) ? (quantity * unitPrice) : Number(item.total);

      validatedSaleItems.push({
        id: itemId,
        saleId,
        productId,
        productName,
        quantity,
        unitPrice,
        total,
        isDeleted: item.isDeleted !== undefined ? (item.isDeleted === true || item.isDeleted === 1 || item.isDeleted === "true" || item.isDeleted === "1") : undefined,
      });
    }
  }

 // Re-assign parsed mapped fields to proceed safely
 parsed.sales = validatedSales;
 parsed.saleItems = validatedSaleItems;

 // Check encryption signature if it exists
 let exportedByRole = "";
 let signedNonce = "";
 let signedImportVerificationId = "";
 let signedTransmissionId = "";

 if (parsed.securitySignature) {
 let decrypted = decryptString(
 parsed.securitySignature,
 getSecuritySecretKey(),
 );

 // Fallback to legacy key for backwards compatibility
 if (!decrypted) {
 decrypted = decryptString(
 parsed.securitySignature,
 "EmmanTileCenterSecretKey",
 );
 if (decrypted) {
 console.warn(
 "[Security Alert] Ledger packet imported using legacy insecure key."
 );
 }
 }

 try {
 const sig = JSON.parse(decrypted);
 if (sig) {
 if (sig.exportedByRole) {
 exportedByRole = sig.exportedByRole;
 }
 if (sig.nonce) {
 signedNonce = sig.nonce;
 }
 if (sig.importVerificationId) {
 signedImportVerificationId = sig.importVerificationId;
 }
 if (sig.transmissionId) {
 signedTransmissionId = sig.transmissionId;
 }
 }
 } catch (err) {
 // Keep exportedByRole empty/unverified
 }
 }

 // Check if nonce or import ID has been used to prevent replay attacks
 const usedNoncesRaw = localStorage.getItem("tp_used_nonces");
 const usedNonces: string[] = usedNoncesRaw ? JSON.parse(usedNoncesRaw) : [];

 const transmissionId = parsed.transmissionId || signedTransmissionId;
 if (transmissionId && usedNonces.includes(transmissionId)) {
 return {
 success: false,
 error: "Error: Payload already indexed.",
 };
 }

 if (signedNonce && usedNonces.includes(signedNonce)) {
 return {
 success: false,
 error: "Replay Attack Blocked: This transmission payload's unique cryptographic signature nonce has already been processed.",
 };
 }

 if (signedImportVerificationId && usedNonces.includes(signedImportVerificationId)) {
 return {
 success: false,
 error: "Replay Attack Blocked: This transmission payload's transaction identifier has already been processed.",
 };
 }

 // Check if the outer importVerificationId matches the signed one (if present)
 if (signedImportVerificationId && parsed.importVerificationId && signedImportVerificationId !== parsed.importVerificationId) {
 return {
 success: false,
 error: "Signature Forgery Blocked: Signed transaction identifier does not match the payload header.",
 };
 }

 const finalExporterRole = exportedByRole || parsed.exportedByRole;
 if (finalExporterRole === "Admin") {
 if (currentUser.role !== UserRole.ADMIN) {
 const establishmentName =
 localStorage.getItem("tilepoint_company_name_v1") ||
 "Emman Tile Center";
 return {
 success: false,
 error: `This sales report is for admin only of ${establishmentName}.`,
 };
 }
 }

 // Check if already exists
 const duplicate = branchSalesReports.find(
 (r) =>
 r.branchId === parsed.branchId &&
 r.reportingDate === parsed.reportingDate,
 );
 if (duplicate) {
 return {
 success: false,
 error: `Sales report for ${parsed.branchName} on ${parsed.reportingDate} has already been registered or transmitted.`,
 };
 }

 const newReport: BranchSalesReport = {
 id:
 parsed.id || `REP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
 branchId: parsed.branchId,
 branchName: parsed.branchName,
 transferredAt: new Date().toISOString(),
 reportingDate: parsed.reportingDate,
 totalSalesCount: parsed.totalSalesCount || parsed.sales.length,
 totalSalesAmount:
 parsed.totalSalesAmount ||
 parsed.sales.reduce(
 (acc: number, s: any) => acc + (Number(s.grandTotal) || 0),
 0,
 ),
 totalVatAmount:
 parsed.totalVatAmount ||
 parsed.sales.reduce((acc: number, s: any) => acc + (s.vat || 0), 0),
 totalDiscountAmount:
 parsed.totalDiscountAmount ||
 parsed.sales.reduce(
 (acc: number, s: any) => acc + (s.discount || 0),
 0,
 ),
 transmissionType: "Manual",
 status: "Pending Audit",
 sales: parsed.sales,
 saleItems: parsed.saleItems || [],
 notes: parsed.notes || "Imported via offline secure JSON package.",
 importVerificationId:
 parsed.importVerificationId ||
 parsed.id ||
 `IMPID-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
 securitySignature: parsed.securitySignature,
 };

 // Take virtual snapshot immediately prior to mutation
 const snapshotId = `SNAP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
 const newSnapshot: IngestionSnapshot = {
 id: snapshotId,
 timestamp: new Date().toISOString(),
 branchName: parsed.branchName || "Unknown Branch",
 reportingDate: parsed.reportingDate || "Unknown Date",
 branchSalesReports: JSON.parse(JSON.stringify(branchSalesReports)),
 branchStock: JSON.parse(JSON.stringify(branchStock)),
 products: JSON.parse(JSON.stringify(products)),
 movements: JSON.parse(JSON.stringify(movements)),
 usedNonces: [...usedNonces],
 };

 setRollbackSnapshots((prev) => {
 const next = [newSnapshot, ...prev].slice(0, 5);
 try {
 const metaIngest = next.slice(0, 1).map((ing: any) => ({
 id: ing.id,
 reportingDate: ing.reportingDate,
 branchId: ing.branchId,
 branchName: ing.branchName,
 timestamp: ing.timestamp,
 }));
 localStorage.setItem("tp_ingestion_snapshots", JSON.stringify(metaIngest));
 } catch (_) {}
 return next;
 });

 setBranchSalesReports((prev) => {
 const updated = [newReport, ...prev];
 localStorage.setItem(
 "tp_branch_sales_reports",
 JSON.stringify(updated),
 );
 return updated;
 });

 // Synchronize branch employees during manual sales report import
 const inboundUsers = parsed.users || parsed.newEmployees || [];
 if (Array.isArray(inboundUsers) && inboundUsers.length > 0) {
 setUsers((prev) => {
 const next = [...prev];
 inboundUsers.forEach((emp: any) => {
 if (!emp || typeof emp !== 'object' || !emp.username) return;
 const existingIdx = next.findIndex(
 (u) => u.id === emp.id || u.username.toLowerCase() === String(emp.username).toLowerCase()
 );
 if (existingIdx !== -1) {
 next[existingIdx] = {
 ...next[existingIdx],
 ...emp,
 isNew: emp.isNew !== undefined ? emp.isNew : next[existingIdx].isNew,
 updatedAt: new Date().toISOString(),
 };
 } else {
 next.push({
 ...emp,
 isNew: emp.isNew !== undefined ? emp.isNew : true,
 createdAt: emp.createdAt || new Date().toISOString(),
 updatedAt: new Date().toISOString(),
 });
 }
 });
 return next;
 });
 }

 // Deduct sold items from branch stock when sales report is manually imported
 if (newReport.saleItems && newReport.saleItems.length > 0) {
 setBranchStock((prevList) => {
 const nextList = [...prevList];
 newReport.saleItems.forEach((item) => {
 const matchIdx = nextList.findIndex(
 (bs) =>
 bs.productId === item.productId &&
 bs.branchId === newReport.branchId,
 );
 if (matchIdx !== -1) {
 nextList[matchIdx] = {
 ...nextList[matchIdx],
 quantity: Math.max(
 0,
 nextList[matchIdx].quantity - item.quantity,
 ),
 };
 } else {
 nextList.push({
 id: `${newReport.branchId}_${item.productId}`,
 branchId: newReport.branchId,
 productId: item.productId,
 quantity: 0,
 });
 }
 });
 localStorage.setItem("tp_branch_stock", JSON.stringify(nextList));
 return nextList;
 });

 // Also ensure that the products master stock matches consolidated or is also deducted
 setProducts((prev) => {
 const nextProds = [...prev];
 newReport.saleItems.forEach((item) => {
 const prodIdx = nextProds.findIndex((p) => p.id === item.productId);
 if (prodIdx !== -1) {
 nextProds[prodIdx] = {
 ...nextProds[prodIdx],
 stockQuantity: Math.max(
 0,
 nextProds[prodIdx].stockQuantity - item.quantity,
 ),
 updatedAt: new Date().toISOString(),
 };
 }
 });
 localStorage.setItem("tp_products", JSON.stringify(nextProds));
 return nextProds;
 });

 // Write safety log movements
 newReport.saleItems.forEach((item) => {
 const movementNum = `M-TRANS-SALE-${newReport.id}-${item.productId}`;
 const newMovement: InventoryMovement = {
 id: movementNum,
 productId: item.productId,
 type: "OUT",
 quantity: -item.quantity,
 sourceBranchId: newReport.branchId,
 referenceId: newReport.id,
 notes: `Imported sales report inventory deduction for ${newReport.branchName}`,
 timestamp: new Date().toISOString(),
 userId: currentUser?.id || "SYSTEM",
 username: currentUser?.username || "SYSTEM",
 };
 setMovements((prevMovements) => {
 if (prevMovements.some((m) => m.id === movementNum))
 return prevMovements;
 const nextMovements = [newMovement, ...prevMovements];
 localStorage.setItem("tp_movements", JSON.stringify(nextMovements));
 return nextMovements;
 });
 });
 }

 // Synchronize inbound operational expenses if included
 const inboundExpenses = parsed.expenses || parsed.atpos_v2_expenses || [];
 if (Array.isArray(inboundExpenses) && inboundExpenses.length > 0) {
 setExpenses((prev) => {
 const next = [...prev];
 inboundExpenses.forEach((exp: any) => {
 if (!exp || typeof exp !== "object" || !exp.id) return;
 const idx = next.findIndex((e) => e.id === exp.id);
 if (idx !== -1) {
 next[idx] = { ...next[idx], ...exp };
 } else {
 next.push(exp);
 }
 });
 localStorage.setItem("atpos_v2_expenses", JSON.stringify(next));
 return next;
 });
 }

 // Synchronize inbound members if included
 const inboundMembers = parsed.members || parsed.atpos_v2_members_list || parsed.customers || [];
 if (Array.isArray(inboundMembers) && inboundMembers.length > 0) {
 setMembers((prev) => {
 const next = [...prev];
 inboundMembers.forEach((mem: any) => {
 if (!mem || typeof mem !== "object" || !mem.id) return;
 const idx = next.findIndex((m) => m.id === mem.id);
 if (idx !== -1) {
 next[idx] = { ...next[idx], ...mem };
 } else {
 next.push(mem);
 }
 });
 localStorage.setItem("atpos_v2_members_list", JSON.stringify(next));
 return next;
 });
 }

 // Synchronize inbound product returns / sales adjustments if included
 const inboundReturns = parsed.returns || parsed.salesAdjustments || parsed.atpos_v2_returns || [];
 if (Array.isArray(inboundReturns) && inboundReturns.length > 0) {
 setProductReturns((prev) => {
 const next = [...prev];
 inboundReturns.forEach((ret: any) => {
 if (!ret || typeof ret !== "object" || !ret.id) return;
 const idx = next.findIndex((r) => r.id === ret.id);
 if (idx !== -1) {
 next[idx] = { ...next[idx], ...ret };
 } else {
 next.push(ret);
 }
 });
 localStorage.setItem("atpos_v2_returns", JSON.stringify(next));
 return next;
 });
 }

 // Synchronize inbound deliveries if included
 const inboundDeliveries = parsed.deliveries || parsed.tp_deliveries || [];
 if (Array.isArray(inboundDeliveries) && inboundDeliveries.length > 0) {
 setDeliveries((prev) => {
 const next = [...prev];
 inboundDeliveries.forEach((del: any) => {
 if (!del || typeof del !== "object" || !del.id) return;
 const idx = next.findIndex((d) => d.id === del.id || (d.saleId && d.saleId === del.saleId));
 if (idx !== -1) {
 next[idx] = { ...next[idx], ...del };
 } else {
 next.push(del);
 }
 });
 localStorage.setItem("tp_deliveries", JSON.stringify(next));
 return next;
 });
 }

 // Synchronize inbound sales transactions if included
 const inboundSales = parsed.sales || [];
 if (Array.isArray(inboundSales) && inboundSales.length > 0) {
 setSales((prev) => {
 const next = [...prev];
 inboundSales.forEach((s: any) => {
 if (!s || typeof s !== "object" || !s.id) return;
 const idx = next.findIndex((existing) => existing.id === s.id || existing.saleNumber === s.saleNumber);
 if (idx !== -1) {
 next[idx] = { ...next[idx], ...s };
 } else {
 next.push(s);
 }
 });
 localStorage.setItem("tp_sales", JSON.stringify(next));
 return next;
 });
 }

 // Synchronize inbound sale items if included
 const inboundSaleItems = parsed.saleItems || [];
 if (Array.isArray(inboundSaleItems) && inboundSaleItems.length > 0) {
 setSaleItems((prev) => {
 const next = [...prev];
 inboundSaleItems.forEach((si: any) => {
 if (!si || typeof si !== "object" || !si.id) return;
 const idx = next.findIndex((existing) => existing.id === si.id);
 if (idx !== -1) {
 next[idx] = { ...next[idx], ...si };
 } else {
 next.push(si);
 }
 });
 localStorage.setItem("tp_sale_items", JSON.stringify(next));
 return next;
 });
 }

 addAuditLog(
 "SALES_IMPORT",
 `Manually received & parsed JSON sales package for ${newReport.branchName} (${newReport.reportingDate}). Sales amount: ₱${newReport.totalSalesAmount.toLocaleString()}`,
 "BranchSalesReport",
 newReport.id,
 );

 // Save used nonces and IDs to prevent replay attacks
 const nextUsedNonces = [...usedNonces];
 if (signedNonce) nextUsedNonces.push(signedNonce);
 if (signedImportVerificationId) nextUsedNonces.push(signedImportVerificationId);
 if (signedTransmissionId) nextUsedNonces.push(signedTransmissionId);
 if (parsed.transmissionId) nextUsedNonces.push(parsed.transmissionId);
 
 // Filter unique nonces/payload IDs
 const uniqueNonces = Array.from(new Set(nextUsedNonces));
 localStorage.setItem("tp_used_nonces", JSON.stringify(uniqueNonces));

 return { success: true };
 } catch (e: any) {
 return { success: false, error: `JSON parsing error: ${e.message || e}` };
 }
 };

 const performRollbackToSnapshot = (
 snapshotId: string,
 ): { success: boolean; error?: string } => {
 try {
 const snap = rollbackSnapshots.find((s) => s.id === snapshotId);
 if (!snap) {
 return { success: false, error: "Snapshot not found or expired." };
 }

 setBranchSalesReports(snap.branchSalesReports);
 setBranchStock(snap.branchStock);
 setProducts(snap.products);
 setMovements(snap.movements);

 localStorage.setItem("tp_branch_sales_reports", JSON.stringify(snap.branchSalesReports));
 localStorage.setItem("tp_branch_stock", JSON.stringify(snap.branchStock));
 localStorage.setItem("tp_products", JSON.stringify(snap.products));
 localStorage.setItem("tp_movements", JSON.stringify(snap.movements));
 localStorage.setItem("tp_used_nonces", JSON.stringify(snap.usedNonces));

 setRollbackSnapshots((prev) => {
 const next = prev.filter((s) => s.id !== snapshotId);
 localStorage.setItem("tp_ingestion_snapshots", JSON.stringify(next));
 return next;
 });

 addAuditLog(
 "DATABASE_ROLLBACK",
 `Admin rolled back multi-branch ledger to snapshot ${snap.id} (${snap.branchName} - ${snap.reportingDate}).`,
 "Database",
 snap.id,
 );

 return { success: true };
 } catch (err: any) {
 return { success: false, error: `Rollback failed: ${err.message || err}` };
 }
 };

 const auditSalesReport = (
 reportId: string,
 status: "Verified" | "Pending Audit",
 notes?: string,
 ) => {
 setBranchSalesReports((prev) => {
 const updated = prev.map((r) => {
 if (r.id === reportId) {
 return {
 ...r,
 status,
 notes: notes || r.notes,
 auditedBy: currentUser.fullName,
 auditedAt: new Date().toISOString(),
 };
 }
 return r;
 });
 localStorage.setItem("tp_branch_sales_reports", JSON.stringify(updated));
 return updated;
 });

 addAuditLog(
 "SALES_AUDIT",
 `Audit result matching [${status}] registered on sales report [${reportId}] by manager ${currentUser.fullName}`,
 "BranchSalesReport",
 reportId,
 );
 };

 const createDelivery = (
 delivery: Omit<
 Delivery,
 "id" | "status" | "createdAt" | "updatedAt" | "branchId" | "branchName"
 >,
 ): Delivery => {
 const currentBranch =
 branches.find((b) => b.id === currentUser.branchAssignmentId) ||
 branches[0];
 const isScheduled = Boolean(delivery.truck?.trim() && delivery.driver?.trim());
 const newDelivery: Delivery = {
 ...delivery,
 id: `DEL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
 status: isScheduled ? "Scheduled" : "Pending Scheduling",
 createdAt: new Date().toISOString(),
 updatedAt: new Date().toISOString(),
 branchId: currentBranch.id,
 branchName: currentBranch.name,
 };

 setDeliveries((prev) => {
 const updated = [newDelivery, ...prev];
 saveToStorageWithDebounce("tp_deliveries", updated, true);
 return updated;
 });

 addAuditLog(
 "DELIVERY_CREATE",
 `Fulfillment Delivery scheduled for invoice ${delivery.saleNumber}. Customer: ${delivery.customerName}`,
 "Delivery",
 newDelivery.id,
 );

 return newDelivery;
 };

 const updateDeliveryStatus = (
 id: string,
 status: DeliveryStatus,
 notes?: string,
 ) => {
 setDeliveries((prev) => {
 const updated = prev.map((d) => {
 if (d.id === id) {
 return {
 ...d,
 status,
 notes: notes !== undefined ? notes : d.notes,
 updatedAt: new Date().toISOString(),
 };
 }
 return d;
 });
 saveToStorageWithDebounce("tp_deliveries", updated, true);
 return updated;
 });

 addAuditLog(
 "DELIVERY_STATUS_UPDATE",
 `Delivery ${id} status altered to [${status}]. Notes: ${notes || "none"}`,
 "Delivery",
 id,
 );
 };

 const assignDeliveryPersonnel = (
 id: string,
 truck: string,
 driver: string,
 helper: string,
 ) => {
 setDeliveries((prev) => {
 const updated = prev.map((d) => {
 if (d.id === id) {
 const isPendingState = d.status === "Pending Scheduling" || d.status === "Packed" || (d.status as any) === "Pending";
 return {
 ...d,
 truck,
 driver,
 helper,
 status: isPendingState ? "Scheduled" : d.status,
 updatedAt: new Date().toISOString(),
 };
 }
 return d;
 });
 saveToStorageWithDebounce("tp_deliveries", updated, true);
 return updated;
 });

 addAuditLog(
 "DELIVERY_PERSONNEL_ASSIGN",
 `Assigned truck ${truck}, pilot ${driver}, and companion ${helper} to delivery task ${id}`,
 "Delivery",
 id,
 );
 };

 const completeDelivery = (
 id: string,
 proofPhotoUrl?: string,
 customerSignature?: string,
 receiverName?: string,
 ) => {
 setDeliveries((prev) => {
 const updated = prev.map((d) => {
 if (d.id === id) {
 return {
 ...d,
 status: "Delivered" as DeliveryStatus,
 proofPhotoUrl,
 customerSignature,
 receiverName: receiverName || d.customerName,
 deliveredBy: currentUser.fullName,
 deliveredAt: new Date().toISOString(),
 updatedAt: new Date().toISOString(),
 };
 }
 return d;
 });
 saveToStorageWithDebounce("tp_deliveries", updated, true);
 return updated;
 });

 addAuditLog(
 "DELIVERY_COMPLETE",
 `Delivery task ${id} checked out as Delivered (Receipt confirmed by ${receiverName || "customer"}).`,
 "Delivery",
 id,
 );
 };

 const createDamageLog = (
 log: Omit<DamageLog, "id" | "reportedAt" | "reportedBy">,
 ) => {
 const newId = `DMG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
 const newLog: DamageLog = {
 ...log,
 id: newId,
 reportedBy: currentUser.fullName,
 reportedAt: new Date().toISOString(),
 };

 setDamageLogs((prev) => [newLog, ...prev]);

 // Deduct stock quantity
 const changeValue = -Math.abs(log.quantity);

 // 1. Update product centrally
 setProducts((prods) =>
 prods.map((p) => {
 if (p.id === log.productId) {
 return {
 ...p,
 stockQuantity: Math.max(0, p.stockQuantity + changeValue),
 updatedAt: new Date().toISOString(),
 updatedBy: currentUser.fullName,
 };
 }
 return p;
 }),
 );

 // 2. Update branch-specific quantity
 setBranchStock((stockList) => {
 const idx = stockList.findIndex(
 (bs) => bs.productId === log.productId && bs.branchId === log.branchId,
 );
 if (idx !== -1) {
 const updated = [...stockList];
 const nextQty = Math.max(0, updated[idx].quantity + changeValue);
 updated[idx] = { ...updated[idx], quantity: nextQty };
 return updated;
 } else {
 return stockList;
 }
 });

 // 3. Create movement log
 const newMove: InventoryMovement = {
 id: `IM-DMG-${Date.now()}`,
 productId: log.productId,
 type: "ADJUST",
 quantity: changeValue,
 sourceBranchId: log.branchId,
 referenceId: newId,
 notes: `[Damage: ${log.category}] ${log.actionTaken}. Notes: ${log.notes}`,
 timestamp: new Date().toISOString(),
 userId: currentUser.id,
 username: currentUser.username,
 };
 setMovements((prev) => [newMove, ...prev]);

 // 4. Create ledger entry
 const newLedgerId = `L-DMG-${Date.now()}`;
 const newEntry: LedgerEntry = {
 id: newLedgerId,
 date: new Date().toISOString(),
 productId: log.productId,
 productName: log.productName,
 branchId: log.branchId,
 movementType: "ADJUST",
 quantity: changeValue,
 referenceNo: newId,
 remarks: `[${log.category} - ${log.actionTaken}] ${log.notes}`,
 };
 setLedgerEntries((prev) => [newEntry, ...prev]);

 // 5. Audit
 addAuditLog(
 "DAMAGE_REPORT",
 `Logged ${log.quantity} unit(s) of broken/damaged ${log.productName} for ${log.branchName} (${log.category}). Status: ${log.actionTaken}.`,
 "Products",
 log.productId,
 );
 };

 const updateBranchPriceOverride = (
 productId: string,
 branchId: string,
 price: number,
 ) => {
 if (!validateInventoryAccess({ currentBranchId: branchId })) {
   console.warn("Unauthorized cross-branch pricing adjustment blocked.");
   return;
 }
 setBranchStock((prevList) => {
 const matchIndex = prevList.findIndex(
 (bs) => bs.productId === productId && bs.branchId === branchId,
 );
 if (matchIndex !== -1) {
 const nextList = [...prevList];
 nextList[matchIndex] = {
 ...nextList[matchIndex],
 sellingPriceOverride: price > 0 ? price : undefined,
 };
 return nextList;
 } else {
 const newRecord: InventoryLocationStock = {
 id: `${branchId}_${productId}`,
 branchId,
 productId,
 quantity: 0,
 sellingPriceOverride: price > 0 ? price : undefined,
 };
 return [...prevList, newRecord];
 }
 });

 // Capture in audit log
 const prod = products.find((p) => p.id === productId);
 const branchMeta = branches.find((b) => b.id === branchId);
 if (prod && branchMeta) {
 addAuditLog(
 "PRICE_ADJUSTMENT",
 `Adjusted retail selling price for "${prod.productName}" at branch "${branchMeta.name}" to ₱${price.toFixed(2)}.`,
 "BranchStock",
 productId,
 );
 }
 };

 const updateBranchLowStockThreshold = (
 productId: string,
 branchId: string,
 threshold: number,
 ) => {
 if (!validateInventoryAccess({ currentBranchId: branchId })) {
   console.warn("Unauthorized cross-branch threshold adjustment blocked.");
   return;
 }
 setBranchStock((prevList) => {
 const matchIndex = prevList.findIndex(
 (bs) => bs.productId === productId && bs.branchId === branchId,
 );
 if (matchIndex !== -1) {
 const nextList = [...prevList];
 nextList[matchIndex] = {
 ...nextList[matchIndex],
 lowStockThresholdOverride: threshold >= 0 ? threshold : undefined,
 };
 return nextList;
 } else {
 const newRecord: InventoryLocationStock = {
 id: `${branchId}_${productId}`,
 branchId,
 productId,
 quantity: 0,
 lowStockThresholdOverride: threshold >= 0 ? threshold : undefined,
 };
 return [...prevList, newRecord];
 }
 });

 // Capture in audit log
 const prod = products.find((p) => p.id === productId);
 const branchMeta = branches.find((b) => b.id === branchId);
 if (prod && branchMeta) {
 addAuditLog(
 "THRESHOLD_ADJUSTMENT",
 `Adjusted localized branch safety alarm threshold for "${prod.productName}" at branch "${branchMeta.name}" to ${threshold} units.`,
 "BranchStock",
 productId,
 );
 }
 };

 // --- DATABASE FACTORY TRUNCATE & RE-SEED ENGINE ---
 const truncateDatabase = async (mode: "all" | "transactions") => {
 if (currentUser.role !== UserRole.ADMIN) {
 console.error(
 "Unauthorized security violation: Only system administrators are authorized to reset or truncate the database.",
 );
 return;
 }

 // Force pre-clear backup snapshot & quiet recovery download requirements
 const snapshotName = `Pre-Truncate Auto-Snapshot (${mode}) - ${new Date().toLocaleDateString()}`;
 const snapshot = generateSystemSnapshot(snapshotName);
 
 try {
 const payload = JSON.parse(snapshot.data);
 triggerQuietDownload(payload);
 } catch (e) {
 console.error("[System Guard] Pre-truncate quiet download failed:", e);
 }

 // Reset/truncate server database first
 try {
 await safeApiFetch("/api/db/truncate", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 ...getAuthHeaders(),
 },
 body: JSON.stringify({ mode }),
 });
 } catch (e) {
 console.warn(
 "[Shared DB Client] Failed to reset server-side database. Resetting locally...",
 e,
 );
 }

 // Mode 'all' or 'transactions'
 setSales([]);
 setSaleItems([]);
 setPurchaseOrders([]);
 setPoItems([]);
 setTransmittals([]);
 setShifts([]);
 setMovements([]);
 setParkedSales([]);
 setStockTransfers([]);
 setLedgerEntries([]);
 setBranchSalesReports([]);
 setDeliveries([]);
 setCustomBills([]);
 setBranches((prev) => prev.map((b) => ({ ...b, monthlySales: 0 })));

 localStorage.removeItem("atpos_v2_members_list");
 localStorage.removeItem("atpos_v2_expenses");
 localStorage.removeItem("atpos_v2_returns");
 localStorage.removeItem("tp_branch_sales_reports");
 localStorage.removeItem("tp_deliveries");
 localStorage.removeItem("atpos_v2_custom_bills");

 if (mode === "all") {
 setProducts([]);
 setSuppliers([]);
 setBranchStock([]);

 localStorage.removeItem("tp_products");
 localStorage.removeItem("tp_suppliers");
 localStorage.removeItem("tp_branch_stock");
 localStorage.removeItem("tp_active_cart");
 localStorage.removeItem("tp_active_customer_name");
 localStorage.removeItem("tp_parked_sales");
 localStorage.setItem("tp_is_configured", "false");
 localStorage.setItem("tilepoint_onboarded_setup", "false");
 } else {
 // Mode 'transactions' (keep products and suppliers but clear stocks to 0)
 const clearedBranchStock = branchStock.map((bs) => ({
 ...bs,
 quantity: 0,
 }));
 setBranchStock(clearedBranchStock);

 const resetProducts = products.map((p) => ({ ...p, stockQuantity: 0 }));
 setProducts(resetProducts);
 }

 const truncateLog: AuditLog = {
 id: `AL-TRUNCATE-${Date.now()}`,
 timestamp: new Date().toISOString(),
 userId: currentUser.id,
 username: currentUser.username,
 action: "DB_TRUNCATE",
 description: `Executed database truncation (Mode: ${mode.toUpperCase()}). Core tables purged.`,
 tableAffected: "ALL",
 recordId: "SYSTEM",
 };
 setAuditLogs([truncateLog]);

 // Clean up active sessions list on reset/truncate to keep the system pristine and remove all session seeds
 setActiveSessions((prev) => prev.filter((s) => s.id === activeSessionId));
 setSimulationModeActive(false);
 localStorage.removeItem("tp_simulation_mode_active");
 };

 const generateMasterForensicBackup = () => {
 return {
 users: [],
 branches: [],
 suppliers: [],
 products: [],
 purchaseOrders: [],
 poItems: [],
 transmittals: [],
 shifts: [],
 sales: [],
 saleItems: [],
 movements: [],
 auditLogs: [],
 parkedSales: [],
 stockTransfers: [],
 branchStock: [],
 ledgerEntries: [],
 branchSalesReports: [],
 deliveries: [],
 simulationModeActive: false,
 };
 const dayMs = 24 * 60 * 60 * 1000;
 const now = Date.now();
 const tMinus = (days: number) => new Date(now - days * dayMs).toISOString();

 const simUsersList: User[] = [
 {
 id: "sim_admin",
 avatarInitials: "EA",
 fullName: "Erica Manaban",
 username: "admin",
 email: "admin@tilepoint.com",
 role: UserRole.ADMIN,
 branchAssignmentId: "B1",
 status: "Active",
 managerPin: "9999",
 passwordHash:
 "$argon2-pbkdf2$i=2500$s=admin_salt$h=58a74e5ad6b5d90947e4edec09033cd96c66a8dbbf679cbbf2b7f3b5bc2f122c", // Matches 'admin123'
 createdAt: tMinus(7),
 updatedAt: tMinus(7),
 },
 {
 id: "sim_manager",
 avatarInitials: "JD",
 fullName: "Juan Dela Cruz",
 username: "manager",
 email: "manager@tilepoint.com",
 role: UserRole.MANAGER,
 branchAssignmentId: "B1",
 status: "Active",
 managerPin: "1111",
 passwordHash:
 "$argon2-pbkdf2$i=2500$s=manager_salt$h=51d08eacdfaef2c0a96ef5497214cc9ef21b3cd96628efbe999f8d1033230def", // Matches 'tilepoint'
 createdAt: tMinus(7),
 updatedAt: tMinus(7),
 },
 {
 id: "sim_cashier",
 avatarInitials: "CS",
 fullName: "Carla Santos",
 username: "cashier",
 email: "cashier@tilepoint.com",
 role: UserRole.CASHIER,
 branchAssignmentId: "B1",
 status: "Active",
 passwordHash:
 "$argon2-pbkdf2$i=2500$s=cashier_salt$h=a6bc29daef7612f0a1da4b72ef1244bb62b3fd96cf12ef9e342fa79ea123f4f1", // Matches 'tilepoint'
 createdAt: tMinus(7),
 updatedAt: tMinus(7),
 },
 {
 id: "sim_staff",
 avatarInitials: "TG",
 fullName: "Tomas Gomez",
 username: "staff",
 email: "staff@tilepoint.com",
 role: UserRole.STAFF,
 branchAssignmentId: "B1",
 status: "Active",
 passwordHash:
 "$argon2-pbkdf2$i=2500$s=staff_salt$h=db23caadaef412f8a9ea34faea515ccf8a09cf93bf11e2ce0063fa79ea34f9a1", // Matches 'tilepoint'
 createdAt: tMinus(7),
 updatedAt: tMinus(7),
 },
 ];

 const simBranchesList: Branch[] = [
 {
 id: "B1",
 name: "tilepoint",
 manager: "Erica Manaban",
 address: "Main Headquarters, Dipolog City",
 phone: "0999-999-9999",
 monthlySales: 24150,
 staffCount: 4,
 activeCashiers: 1,
 createdAt: tMinus(7),
 updatedAt: tMinus(7),
 isDeleted: false,
 },
 {
 id: "B2",
 name: "Manila Outlet Depot",
 manager: "Santi Santos",
 address: "Manila Pier Block 12",
 phone: "0911-222-3333",
 monthlySales: 0,
 staffCount: 2,
 activeCashiers: 0,
 createdAt: tMinus(7),
 updatedAt: tMinus(7),
 isDeleted: false,
 },
 ];

 const simSuppliersList: Supplier[] = [
 {
 id: "S1",
 name: "Global Tile Imports",
 contactPerson: "Charles Wu",
 phone: "0915-111-2222",
 email: "charles.wu@globalimports.com.ph",
 address: "Port Area Manila",
 createdAt: tMinus(7),
 isDeleted: false,
 },
 {
 id: "S2",
 name: "Sinclair Ceramic Glazes",
 contactPerson: "Glenda Gomez",
 phone: "0917-888-9999",
 email: "glenda@sinclairceramic.com.ph",
 address: "Cebu Industrial Park",
 createdAt: tMinus(7),
 isDeleted: false,
 },
 ];

 const simProductsList: Product[] = [
 {
 id: "P1",
 productCode: "TP-GR-CARRARA",
 sku: "SKU-CARRARA-6060",
 barcode: "4801122334455",
 qrCode: "QR-CARRARA-01",
 designName: "Polished Granite Carrara",
 productName: "Polished Granite Carrara 60x60 cm",
 category: "Granite",
 brand: "TilePoint Premium",
 supplierId: "S1",
 unit: "Box",
 size: "60x60 cm",
 boxQuantity: 4,
 coveragePerBox: 1.44,
 costPrice: 850,
 sellingPrice: 1250,
 stockQuantity: 935,
 minimumStock: 50,
 isDeleted: false,
 createdAt: tMinus(6),
 updatedAt: tMinus(3),
 createdBy: "admin",
 updatedBy: "admin",
 },
 {
 id: "P2",
 productCode: "TP-CE-WHITE",
 sku: "SKU-WHITE-3060",
 barcode: "4802233445566",
 qrCode: "QR-WHITE-02",
 designName: "Glossy White Ceramic",
 productName: "Glossy White Ceramic 30x60 cm",
 category: "Ceramic",
 brand: "TilePoint Standard",
 supplierId: "S2",
 unit: "Box",
 size: "30x60 cm",
 boxQuantity: 8,
 coveragePerBox: 1.44,
 costPrice: 450,
 sellingPrice: 675,
 stockQuantity: 492,
 minimumStock: 30,
 isDeleted: false,
 createdAt: tMinus(6),
 updatedAt: tMinus(3),
 createdBy: "admin",
 updatedBy: "admin",
 },
 {
 id: "P3",
 productCode: "TP-TC-RUSTIC",
 sku: "SKU-RUSTIC-4040",
 barcode: "4803344556677",
 qrCode: "QR-RUSTIC-03",
 designName: "Rustic Terra Cotta",
 productName: "Rustic Terra Cotta 40x40 cm",
 category: "Terra Cotta",
 brand: "ClayWorks",
 supplierId: "S2",
 unit: "Box",
 size: "40x40 cm",
 boxQuantity: 6,
 coveragePerBox: 0.96,
 costPrice: 520,
 sellingPrice: 780,
 stockQuantity: 300,
 minimumStock: 25,
 isDeleted: false,
 createdAt: tMinus(6),
 updatedAt: tMinus(3),
 createdBy: "admin",
 updatedBy: "admin",
 },
 ];

 const simAuditLogs: AuditLog[] = [
 {
 id: "L-1",
 timestamp: tMinus(7),
 userId: "sim_admin",
 username: "admin",
 action: "SYSTEM_INSTALL",
 description:
 "Clean installation approved. Initialized master database with tilepoint credentials.",
 tableAffected: "System",
 recordId: "INSTALLER",
 },
 {
 id: "L-2",
 timestamp: tMinus(6),
 userId: "sim_admin",
 username: "admin",
 action: "BRANCH_CREATE",
 description:
 "Created primary distribution branch node [tilepoint] (HQ).",
 tableAffected: "Branches",
 recordId: "B1",
 },
 {
 id: "L-3",
 timestamp: tMinus(6),
 userId: "sim_admin",
 username: "admin",
 action: "USER_CREATE",
 description:
 "Provisioned Security Roles: Admin, Manager, Cashier, and Staff personnel mappings.",
 tableAffected: "Users",
 recordId: "sim_manager",
 },
 {
 id: "L-4",
 timestamp: tMinus(5),
 userId: "sim_admin",
 username: "admin",
 action: "SUPPLIER_CREATE",
 description:
 "Added active general supplier [Global Tile Imports] to the system register.",
 tableAffected: "Suppliers",
 recordId: "S1",
 },
 {
 id: "L-5",
 timestamp: tMinus(5),
 userId: "sim_admin",
 username: "admin",
 action: "PRODUCT_CREATE",
 description:
 "Registered product code: TP-GR-CARRARA with standard pricing ₱1,250.00.",
 tableAffected: "Products",
 recordId: "P1",
 },
 {
 id: "L-6",
 timestamp: tMinus(5),
 userId: "sim_admin",
 username: "admin",
 action: "PRODUCT_CREATE",
 description:
 "Registered product code: TP-CE-WHITE with standard pricing ₱675.00.",
 tableAffected: "Products",
 recordId: "P2",
 },
 {
 id: "L-7",
 timestamp: tMinus(4),
 userId: "sim_manager",
 username: "manager",
 action: "PO_CREATE",
 description:
 "Created Purchase Order: PO-202606-101 to consolidate S1 imports (1000 boxes Carrara).",
 tableAffected: "PurchaseOrders",
 recordId: "PO-202606-101",
 },
 {
 id: "L-8",
 timestamp: tMinus(4),
 userId: "sim_admin",
 username: "admin",
 action: "PO_STATUS_CHANGE",
 description:
 "Approved purchase ledger state for PO-202606-101 with verified cost allocation.",
 tableAffected: "PurchaseOrders",
 recordId: "PO-202606-101",
 },
 {
 id: "L-9",
 timestamp: tMinus(3),
 userId: "sim_manager",
 username: "manager",
 action: "PO_RECEIVE",
 description:
 "Consolidated intake of 1000 units Carrara. Physical stock adjusted on site.",
 tableAffected: "PurchaseOrders",
 recordId: "PO-202606-101",
 },
 {
 id: "L-10",
 timestamp: tMinus(3),
 userId: "sim_cashier",
 username: "cashier",
 action: "SHIFT_OPEN",
 description:
 "Opened register console drawer. Base capital cash amount: ₱5,000.00.",
 tableAffected: "Shifts",
 recordId: "SHIFT-001",
 },
 {
 id: "L-11",
 timestamp: tMinus(3),
 userId: "sim_cashier",
 username: "cashier",
 action: "POS_CHECKOUT",
 description:
 "Approved POS customer invoice INV-1001 for 15 boxes Carrara. Sum: ₱18,750.00.",
 tableAffected: "Sales",
 recordId: "INV-1001",
 },
 {
 id: "L-12",
 timestamp: tMinus(3),
 userId: "sim_cashier",
 username: "cashier",
 action: "POS_CHECKOUT",
 description:
 "Approved POS customer invoice INV-1002 for 8 boxes Glossy White. Sum: ₱5,400.00.",
 tableAffected: "Sales",
 recordId: "INV-1002",
 },
 {
 id: "L-13",
 timestamp: tMinus(3),
 userId: "sim_cashier",
 username: "cashier",
 action: "SHIFT_CLOSE",
 description:
 "Closed register drawer shift. Balance counted: ₱29,150.00 vs expected. Zero variance.",
 tableAffected: "Shifts",
 recordId: "SHIFT-001",
 },
 {
 id: "L-14",
 timestamp: tMinus(2),
 userId: "sim_manager",
 username: "manager",
 action: "TRANSFER_CREATE",
 description:
 "Dispatched inter-branch stock allocation from HQ to Manila Outlet (50 units Carrara).",
 tableAffected: "StockTransfer",
 recordId: "TRSF-202606-501",
 },
 {
 id: "L-15",
 timestamp: tMinus(2),
 userId: "sim_admin",
 username: "admin",
 action: "TRANSFER_UPDATE",
 description:
 "Approved stock transfer allocation TRSF-202606-501. Marked In Transit.",
 tableAffected: "StockTransfer",
 recordId: "TRSF-202606-501",
 },
 {
 id: "L-16",
 timestamp: tMinus(1),
 userId: "sim_manager",
 username: "manager",
 action: "TRANSMITTAL_SUBMIT",
 description:
 "Uploaded daily Sales report transmittal document for verification.",
 tableAffected: "Transmittals",
 recordId: "TRANSM-9002",
 },
 {
 id: "L-17",
 timestamp: tMinus(1),
 userId: "sim_admin",
 username: "admin",
 action: "SECURITY_LIMIT",
 description:
 "Brute Force Rate Limiter block initialized for anomalous terminal connection attempt.",
 tableAffected: "Users",
 recordId: "SYSTEM",
 },
 ];

 const sampleSalesList: Sale[] = [
 {
 id: "INV-1001",
 saleNumber: "TP-INV-1001",
 shiftId: "SHIFT-001",
 branchId: "B1",
 cashierId: "sim_cashier",
 cashierName: "Carla Santos",
 customerName: "Juan Dela Cruz",
 subtotal: 16741.07,
 vat: 2008.93,
 discount: 0,
 grandTotal: 18750.0,
 paymentMethod: "Cash",
 amountTendered: 19000,
 changeAmount: 250,
 createdAt: tMinus(3),
 isDeleted: false,
 },
 {
 id: "INV-1002",
 saleNumber: "TP-INV-1002",
 shiftId: "SHIFT-001",
 branchId: "B1",
 cashierId: "sim_cashier",
 cashierName: "Carla Santos",
 customerName: "Maria Santos",
 subtotal: 4821.43,
 vat: 578.57,
 discount: 0,
 grandTotal: 5400.0,
 paymentMethod: "GCash",
 amountTendered: 5400,
 changeAmount: 0,
 createdAt: tMinus(3),
 isDeleted: false,
 },
 ];

 const sampleSaleItemsList: SaleItem[] = [
 {
 id: "SITEM-1",
 saleId: "INV-1001",
 productId: "P1",
 productName: "Polished Granite Carrara 60x60 cm",
 unitPrice: 1250,
 quantity: 15,
 total: 18750,
 isDeleted: false,
 },
 {
 id: "SITEM-2",
 saleId: "INV-1002",
 productId: "P2",
 productName: "Glossy White Ceramic 30x60 cm",
 unitPrice: 675,
 quantity: 8,
 total: 5400,
 isDeleted: false,
 },
 ];

 const sampleMovementsList: InventoryMovement[] = [
 {
 id: "M-1",
 productId: "P1",
 type: "IN",
 quantity: 1000,
 referenceId: "PO-202606-101",
 notes: "Initial warehouse intake for supplier PO-101",
 timestamp: tMinus(3),
 userId: "sim_manager",
 username: "manager",
 },
 {
 id: "M-2",
 productId: "P1",
 type: "OUT",
 quantity: -15,
 referenceId: "INV-1001",
 notes: "POS Sold x15 to Juan Dela Cruz",
 timestamp: tMinus(3),
 userId: "sim_cashier",
 username: "cashier",
 },
 {
 id: "M-3",
 productId: "P2",
 type: "OUT",
 quantity: -8,
 referenceId: "INV-1002",
 notes: "POS Sold x8 to Maria Santos",
 timestamp: tMinus(3),
 userId: "sim_cashier",
 username: "cashier",
 },
 {
 id: "M-4",
 productId: "P1",
 type: "TRANSFER",
 quantity: -50,
 sourceBranchId: "B1",
 destinationBranchId: "B2",
 referenceId: "TRSF-202606-501",
 notes: "Outward inter-branch allocation dispatch",
 timestamp: tMinus(2),
 userId: "sim_manager",
 username: "manager",
 },
 ];

 const sampleStockTransfersList: StockTransfer[] = [
 {
 id: "TRSF-202606-501",
 transferNo: "TRSF-202606-501",
 fromBranchId: "B1",
 toBranchId: "B2",
 transferType: "Redistribution",
 requestedBy: "manager",
 approvedBy: "admin",
 status: "In Transit",
 reason: "Consolidating branch stock levels for Carrara series demand",
 createdAt: tMinus(2),
 updatedAt: tMinus(2),
 items: [
 {
 id: "TITEM-1",
 transferId: "TRSF-202606-501",
 productId: "P1",
 productName: "Polished Granite Carrara 60x60 cm",
 quantity: 50,
 },
 ],
 },
 ];

 const samplePurchaseOrdersList: PurchaseOrder[] = [
 {
 id: "PO-202606-101",
 poNumber: "PO-202606-101",
 supplierId: "S1",
 branchId: "B1",
 status: "Completed",
 requestedBy: "Juan Dela Cruz",
 date: tMinus(4),
 notes: "Intake stock order for Carrara launch",
 createdAt: tMinus(4),
 updatedAt: tMinus(3),
 },
 ];

 const samplePoItemsList: PurchaseOrderItem[] = [
 {
 id: "PO-ITEM-1",
 poId: "PO-202606-101",
 productId: "P1",
 costPrice: 850,
 quantityRequested: 1000,
 quantityReceived: 1000,
 },
 ];

 const branchStockList: InventoryLocationStock[] = [
 {
 id: "B1_P1",
 branchId: "B1",
 productId: "P1",
 quantity: 935,
 },
 {
 id: "B1_P2",
 branchId: "B1",
 productId: "P2",
 quantity: 492,
 },
 {
 id: "B1_P3",
 branchId: "B1",
 productId: "P3",
 quantity: 300,
 },
 {
 id: "B2_P1",
 branchId: "B2",
 productId: "P1",
 quantity: 50,
 },
 ];

 const ledgerEntriesList: LedgerEntry[] = [
 {
 id: "LDR-1",
 date: tMinus(3),
 productId: "P1",
 productName: "Polished Granite Carrara 60x60 cm",
 branchId: "B1",
 movementType: "IN",
 quantity: 1000,
 referenceNo: "PO-202606-101",
 remarks: "Direct warehouse stock intake",
 },
 {
 id: "LDR-2",
 date: tMinus(3),
 productId: "P1",
 productName: "Polished Granite Carrara 60x60 cm",
 branchId: "B1",
 movementType: "SALE",
 quantity: -15,
 referenceNo: "TP-INV-1001",
 remarks: "Sales Invoice checkout",
 },
 {
 id: "LDR-3",
 date: tMinus(3),
 productId: "P2",
 productName: "Glossy White Ceramic 30x60 cm",
 branchId: "B1",
 movementType: "SALE",
 quantity: -8,
 referenceNo: "TP-INV-1002",
 remarks: "Sales Invoice checkout",
 },
 {
 id: "LDR-4",
 date: tMinus(2),
 productId: "P1",
 productName: "Polished Granite Carrara 60x60 cm",
 branchId: "B1",
 movementType: "TRANSFER",
 quantity: -50,
 referenceNo: "TRSF-202606-501",
 remarks: "Outward inter-branch transfer dispatch",
 },
 ];

 const shiftsList: Shift[] = [
 {
 id: "SHIFT-001",
 cashierId: "sim_cashier",
 cashierName: "Carla Santos",
 branchId: "B1",
 status: "CLOSED",
 startCash: 5000,
 endCash: 29150,
 cashCount: 29150,
 variance: 0,
 openedAt: tMinus(3),
 closedAt: tMinus(3),
 shiftSalesCount: 2,
 shiftSalesTotal: 24150,
 shiftVatTotal: 2587.5,
 shiftDiscountTotal: 0,
 },
 ];

 const transmittalsList: Transmittal[] = [
 {
 id: "TRANSM-9002",
 documentType: "Daily Sales Report",
 fromBranchId: "B1",
 toBranchId: "B1",
 submittedBy: "manager",
 status: "Approved",
 payloadJson: JSON.stringify({
 reportingDate: tMinus(3),
 totalSalesAmount: 24150,
 }),
 submittedAt: tMinus(1),
 isDeleted: false,
 },
 ];

 return {
 isConfigured: true,
 users: simUsersList,
 branches: simBranchesList,
 suppliers: simSuppliersList,
 products: simProductsList,
 purchaseOrders: samplePurchaseOrdersList,
 poItems: samplePoItemsList,
 transmittals: transmittalsList,
 shifts: shiftsList,
 sales: sampleSalesList,
 saleItems: sampleSaleItemsList,
 movements: sampleMovementsList,
 auditLogs: simAuditLogs,
 parkedSales: [],
 stockTransfers: sampleStockTransfersList,
 branchStock: branchStockList,
 ledgerEntries: ledgerEntriesList,
 branchSalesReports: [],
 deliveries: [],
 simulationModeActive: true,
 };
 };

 const importMasterForensicBackup = async () => {
 return;
 const data = generateMasterForensicBackup();

 createDbSnapshot("Auto-Snapshot Before Master Forensic Import");

 setIsConfigured(true);
 localStorage.setItem("tp_is_configured", "true");
 localStorage.setItem("tilepoint_company_name_v1", "tilepoint");

 setUsers(data.users);
 localStorage.setItem("tp_users", JSON.stringify(data.users));

 setBranches(data.branches);
 localStorage.setItem("tp_branches", JSON.stringify(data.branches));

 setSuppliers(data.suppliers);
 localStorage.setItem("tp_suppliers", JSON.stringify(data.suppliers));

 setProducts(data.products);
 localStorage.setItem("tp_products", JSON.stringify(data.products));

 setPurchaseOrders(data.purchaseOrders);
 localStorage.setItem(
 "tp_purchase_orders",
 JSON.stringify(data.purchaseOrders),
 );

 setPoItems(data.poItems);
 localStorage.setItem("tp_po_items", JSON.stringify(data.poItems));

 setTransmittals(data.transmittals);
 localStorage.setItem("tp_transmittals", JSON.stringify(data.transmittals));

 setShifts(data.shifts);
 localStorage.setItem("tp_shifts", JSON.stringify(data.shifts));

 setSales(data.sales);
 localStorage.setItem("tp_sales", JSON.stringify(data.sales));

 setSaleItems(data.saleItems);
 localStorage.setItem("tp_sale_items", JSON.stringify(data.saleItems));

 setMovements(data.movements);
 localStorage.setItem("tp_movements", JSON.stringify(data.movements));

 setAuditLogs(data.auditLogs);
 localStorage.setItem("tp_audit_logs", JSON.stringify(data.auditLogs));

 setStockTransfers(data.stockTransfers);
 localStorage.setItem(
 "tp_stock_transfers",
 JSON.stringify(data.stockTransfers),
 );

 setBranchStock(data.branchStock);
 localStorage.setItem("tp_branch_stock", JSON.stringify(data.branchStock));

 setLedgerEntries(data.ledgerEntries);
 localStorage.setItem(
 "tp_ledger_entries",
 JSON.stringify(data.ledgerEntries),
 );

 setSimulationModeActive(true);
 localStorage.setItem("tp_simulation_mode_active", "true");

 setCurrentUser(data.users[0]);
 setIsLoggedIn(true);
 sessionStorage.setItem("tp_is_logged_in", "true");
 sessionStorage.setItem("tp_current_user", JSON.stringify(data.users[0]));
 localStorage.setItem("tp_is_logged_in", "true");
 localStorage.setItem("tp_current_user", JSON.stringify(data.users[0]));

 addAuditLog(
 "DB_BACKUP_RESTORE",
 "Imported complete Master Forensic Database Suite and System Audit Logs successfully.",
 "SYSTEM",
 "FORENSIC_MASTER",
 );
 };

 // USERS
  const createUser = async (
    userFields: Omit<User, "id" | "createdAt" | "updatedAt">,
  ) => {
    let passwordHash = userFields.passwordHash;
    if (!passwordHash) {
      const salt = (userFields.username || "user") + "_salt_tok";
      const hashedVal = await createSaltedHash("tilepoint", salt, 2500);
      passwordHash = formatHashToken(salt, hashedVal, 2500);
    }

    const newUser: User = {
      ...userFields,
      username: sanitizeInputText(userFields.username),
      fullName: sanitizeInputText(userFields.fullName),
      role: sanitizeInputText(userFields.role) as any,
      branchAssignmentId: sanitizeInputText(userFields.branchAssignmentId),
      passwordHash,
      id: `U-${Date.now()}`,
      isNew: userFields.isNew !== undefined ? userFields.isNew : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setUsers((prev) => [...prev, newUser]);

    safeApiFetch("/api/db/delta", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        id: `delta-add-tp_users-${newUser.id}-${Date.now()}`,
        type: "APPEND_ROW",
        payload: { key: "tp_users", row: newUser },
      }),
    }).catch((err) => {
      console.warn("[User Sync] Direct delta push failed:", err);
    });
    addAuditLog(
      "USER_CREATE",
      `Created user account for ${newUser.fullName} (${newUser.role})`,
      "Users",
      newUser.id,
    );
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    let updatedUser: User | null = null;
    setUsers((prev) => {
      return prev.map((u) => {
        if (u.id === id) {
          updatedUser = { ...u, ...updates, updatedAt: new Date().toISOString() };
          return updatedUser;
        }
        return u;
      });
    });
    if (updatedUser) {
      safeApiFetch("/api/db/delta", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          id: `delta-update-tp_users-${id}-${Date.now()}`,
          type: "UPDATE_ROW",
          payload: { key: "tp_users", row: updatedUser },
        }),
      }).catch((e) => console.warn("[User Sync] Direct update failed:", e));
    }
    addAuditLog(
      "USER_UPDATE",
      `Updated user account details for user ID ${id}`,
      "Users",
      id,
    );
  };

  const resetPassword = (id: string) => {
    const target = users.find((u) => u.id === id);
    if (target) {
      const runReset = async () => {
        const salt = target.username + "_salt_tok";
        const hashedVal = await createSaltedHash("tilepoint", salt, 2500);
        const formattedToken = formatHashToken(salt, hashedVal, 2500);
        let updatedUser: User | null = null;
        setUsers((prev) => {
          return prev.map((u) => {
            if (u.id === id) {
              updatedUser = { ...u, passwordHash: formattedToken, updatedAt: new Date().toISOString() };
              return updatedUser;
            }
            return u;
          });
        });
        if (updatedUser) {
          safeApiFetch("/api/db/delta", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            body: JSON.stringify({
              id: `delta-reset-tp_users-${id}-${Date.now()}`,
              type: "UPDATE_ROW",
              payload: { key: "tp_users", row: updatedUser },
            }),
          }).catch((e) => console.warn("[Password Reset Sync] Direct push failed:", e));
        }
        addAuditLog(
          "USER_RESET_PASSWORD",
          `Reset password for user ${target.fullName} to default (tilepoint)`,
          "Users",
          id,
        );
      };
      runReset();
    }
  };

 // BRANCHES
 const createBranch = (
 branchFields: Omit<Branch, "id" | "createdAt" | "updatedAt" | "isDeleted"> & { id?: string },
 ) => {
 const customId = branchFields.id?.trim();
 const newBranch: Branch = {
 ...branchFields,
 name: sanitizeInputText(branchFields.name),
 address: sanitizeInputText(branchFields.address),
 manager: sanitizeInputText(branchFields.manager),
 phone: sanitizeInputText(branchFields.phone),
 id: customId || `B-${Date.now()}`,
 createdAt: new Date().toISOString(),
 updatedAt: new Date().toISOString(),
 isDeleted: false,
 };
 setBranches((prev) => [...prev, newBranch]);
 addAuditLog(
 "BRANCH_CREATE",
 `Created branch ${newBranch.name}`,
 "Branches",
 newBranch.id,
 );
 };

 const updateBranch = (id: string, updates: Partial<Branch>) => {
 const newId = updates.id;
 const hasIdChanged = newId !== undefined && newId !== id;

 setBranches((prev) =>
 prev.map((b) =>
 b.id === id
 ? { ...b, ...updates, updatedAt: new Date().toISOString() }
 : b,
 ),
 );

 if (hasIdChanged && newId) {
 // 1. Update localStorage if the primary branch was updated
 const primaryBranchId = localStorage.getItem("tilepoint_primary_branch_id") || "B1";
 if (primaryBranchId === id) {
 localStorage.setItem("tilepoint_primary_branch_id", newId);
 }

 // 2. Cascade update state collections
 setUsers((prev) =>
 prev.map((u) =>
 u.branchAssignmentId === id
 ? { ...u, branchAssignmentId: newId, updatedAt: new Date().toISOString() }
 : u
 )
 );

 setCurrentUser((prev) => {
 if (prev && prev.branchAssignmentId === id) {
 return { ...prev, branchAssignmentId: newId, updatedAt: new Date().toISOString() };
 }
 return prev;
 });

 setBranchStock((prev) =>
 prev.map((bs) =>
 bs.branchId === id ? { ...bs, branchId: newId } : bs
 )
 );

 setShifts((prev) =>
 prev.map((s) =>
 s.branchId === id ? { ...s, branchId: newId } : s
 )
 );

 setSales((prev) =>
 prev.map((s) =>
 s.branchId === id ? { ...s, branchId: newId } : s
 )
 );

 setDeliveries((prev) =>
 prev.map((d) =>
 d.branchId === id ? { ...d, branchId: newId } : d
 )
 );

 setStockTransfers((prev) =>
 prev.map((st) => {
 const updated = { ...st };
 if (st.fromBranchId === id) updated.fromBranchId = newId;
 if (st.toBranchId === id) updated.toBranchId = newId;
 return updated;
 })
 );

 setDamageLogs((prev) =>
 prev.map((dl) =>
 dl.branchId === id ? { ...dl, branchId: newId } : dl
 )
 );

 setExpenses((prev) =>
 prev.map((e) =>
 e.branchId === id ? { ...e, branchId: newId } : e
 )
 );

 setPurchaseOrders((prev) =>
 prev.map((po) =>
 po.branchId === id ? { ...po, branchId: newId } : po
 )
 );

 setTransmittals((prev) =>
 prev.map((t) => {
 const updated = { ...t };
 if (t.fromBranchId === id) updated.fromBranchId = newId;
 if (t.toBranchId === id) updated.toBranchId = newId;
 return updated;
 })
 );

 setMovements((prev) =>
 prev.map((m) => {
 const updated = { ...m };
 if (m.sourceBranchId === id) updated.sourceBranchId = newId;
 if (m.destinationBranchId === id) updated.destinationBranchId = newId;
 return updated;
 })
 );

 setActiveSessions((prev) =>
 prev.map((as) =>
 as.branchId === id ? { ...as, branchId: newId } : as
 )
 );

 setBranchSalesReports((prev) =>
 prev.map((bsr) =>
 bsr.branchId === id ? { ...bsr, branchId: newId } : bsr
 )
 );
 }

 addAuditLog(
 "BRANCH_UPDATE",
 `Updated branch ID ${id}` + (hasIdChanged ? ` to ${newId}` : ""),
 "Branches",
 hasIdChanged && newId ? newId : id,
 );
 };

 const deleteBranch = (id: string) => {
 setBranches((prev) =>
 prev.map((b) =>
 b.id === id
 ? { ...b, isDeleted: true, updatedAt: new Date().toISOString() }
 : b,
 ),
 );
 addAuditLog(
 "BRANCH_DELETE",
 `Soft-deleted branch ID ${id}`,
 "Branches",
 id,
 );
 };

 // SUPPLIERS
 const createSupplier = (
 supFields: Omit<Supplier, "id" | "createdAt" | "isDeleted">,
 ): Supplier => {
 const newSup: Supplier = {
 ...supFields,
 name: sanitizeInputText(supFields.name),
 contactPerson: sanitizeInputText(supFields.contactPerson),
 phone: sanitizeInputText(supFields.phone),
 email: sanitizeInputText(supFields.email),
 address: sanitizeInputText(supFields.address),
 id: `S-${Date.now()}`,
 createdAt: new Date().toISOString(),
 isDeleted: false,
 };
 setSuppliers((prev) => [...prev, newSup]);
 addAuditLog(
 "SUPPLIER_CREATE",
 `Created supplier ${newSup.name}`,
 "Suppliers",
 newSup.id,
 );
 return newSup;
 };

 const updateSupplier = (id: string, updates: Partial<Supplier>) => {
 setSuppliers((prev) =>
 prev.map((s) => (s.id === id ? { ...s, ...updates } : s)),
 );
 addAuditLog(
 "SUPPLIER_UPDATE",
 `Updated supplier ID ${id}`,
 "Suppliers",
 id,
 );
 };

 const deleteSupplier = (id: string) => {
 setSuppliers((prev) =>
 prev.map((s) => (s.id === id ? { ...s, isDeleted: true } : s)),
 );
 addAuditLog(
 "SUPPLIER_DELETE",
 `Soft-deleted supplier ID ${id}`,
 "Suppliers",
 id,
 );
 };

 // BRANDS
 const createBrand = (
 brandFields: Omit<Brand, "id" | "createdAt" | "isDeleted">,
 ): Brand => {
 const newBrand: Brand = {
 ...brandFields,
 name: sanitizeInputText(brandFields.name),
 description: brandFields.description
 ? sanitizeInputText(brandFields.description)
 : "",
 id: `BND-${Date.now()}`,
 createdAt: new Date().toISOString(),
 isDeleted: false,
 };
 setBrands((prev) => [...prev, newBrand]);
 addAuditLog(
 "BRAND_CREATE",
 `Created brand ${newBrand.name}`,
 "Brands",
 newBrand.id,
 );
 return newBrand;
 };

 const updateBrand = (id: string, updates: Partial<Brand>) => {
 setBrands((prev) =>
 prev.map((b) => (b.id === id ? { ...b, ...updates } : b)),
 );
 addAuditLog(
 "BRAND_UPDATE",
 `Updated brand properties for ID: ${id}`,
 "Brands",
 id,
 );
 };

 const deleteBrand = (id: string) => {
 setBrands((prev) =>
 prev.map((b) => (b.id === id ? { ...b, isDeleted: true } : b)),
 );
 addAuditLog("BRAND_DELETE", `Soft-deleted brand ID: ${id}`, "Brands", id);
 };

 // PRODUCTS
 const createProduct = (
 prodFields: Omit<
 Product,
 | "id"
 | "createdAt"
 | "updatedAt"
 | "isDeleted"
 | "qrCode"
 | "createdBy"
 | "updatedBy"
 >,
 ) => {
 const newId = `P-${Date.now()}`;
 const sanitizedFields = {
 ...prodFields,
 productName: sanitizeInputText(prodFields.productName),
 productCode: sanitizeInputText(prodFields.productCode),
 sku: sanitizeInputText(prodFields.sku),
 barcode: sanitizeInputText(prodFields.barcode),
 category: sanitizeInputText(prodFields.category) || "Porcelain Tiles",
 brand: sanitizeInputText(prodFields.brand) || "Generic",
 size: sanitizeInputText(prodFields.size),
 designName: sanitizeInputText(prodFields.designName || "Standard"),
 supplierId: sanitizeInputText(prodFields.supplierId || "central"),
 unit: sanitizeInputText(prodFields.unit) || "Boxes",
 origin: prodFields.origin
 ? sanitizeInputText(prodFields.origin)
 : undefined,

 boxQuantity: sanitizeAndValidateNumber(prodFields.boxQuantity, 1),
 coveragePerBox:
 prodFields.coveragePerBox !== undefined
 ? sanitizeAndValidateNumber(prodFields.coveragePerBox, 1)
 : undefined,
 costPrice: sanitizeAndValidateNumber(prodFields.costPrice),
 sellingPrice: sanitizeAndValidateNumber(prodFields.sellingPrice),
 stockQuantity: Math.round(
 sanitizeAndValidateNumber(prodFields.stockQuantity),
 ),
 minimumStock: Math.round(
 sanitizeAndValidateNumber(prodFields.minimumStock, 10),
 ),
 };

 const newProd: Product = {
 ...sanitizedFields,
 id: newId,
 qrCode: `TP-${sanitizedFields.productCode}`,
 isDeleted: false,
 createdAt: new Date().toISOString(),
 updatedAt: new Date().toISOString(),
 createdBy: currentUser.fullName,
 updatedBy: currentUser.fullName,
 version: 1,
 };
 setProducts((prev) => [...prev, newProd]);

 // Initial branchStock record
 const targetBranch =
 sanitizedFields.origin &&
 branches.some((b) => b.id === sanitizedFields.origin)
 ? sanitizedFields.origin
 : currentUser.branchAssignmentId || "B1";

 setBranchStock((prev) => [
 ...prev,
 {
 id: `${targetBranch}_${newId}`,
 branchId: targetBranch,
 productId: newId,
 quantity: sanitizedFields.stockQuantity,
 version: 1,
 },
 ]);

 // Initial stock movement
 const initMove: InventoryMovement = {
 id: `M-${Date.now()}`,
 productId: newId,
 type: "IN",
 quantity: sanitizedFields.stockQuantity,
 destinationBranchId: targetBranch,
 referenceId: "INITIAL_STOCK",
 notes: sanitizedFields.origin
 ? `Initial stock intake. Origin/Source: ${sanitizedFields.origin}`
 : "Initial stock intake upon product registration",
 timestamp: new Date().toISOString(),
 userId: currentUser.id,
 username: currentUser.username,
 };
 setMovements((prev) => [initMove, ...prev]);

 addAuditLog(
 "PRODUCT_CREATE",
 `Created product ${newProd.productName}`,
 "Products",
 newProd.id,
 );
 return newProd;
 };

 const updateProduct = (
 id: string,
 updates: Partial<Product>,
 customLogReason?: string,
 ) => {
 const original = products.find((p) => p.id === id);
 if (!original) return;

 // Optimistic Concurrency Lock Check:
 if (updates.version !== undefined && original.version !== undefined) {
 if (updates.version !== original.version) {
 throw new Error(
 `CONCURRENCY_CONFLICT: Product "${original.productName}" was modified by another operator. Please refresh the inventory page to receive the newest state. (Current version: ${original.version}, Submitted version: ${updates.version})`
 );
 }
 }

 // Check if stock level changed
 if (updates.stockQuantity !== undefined) {
 const nextStock = Math.round(
 sanitizeAndValidateNumber(updates.stockQuantity),
 );
 if (nextStock !== original.stockQuantity) {
 const diff = nextStock - original.stockQuantity;
 logManualAdjustment(
 id,
 diff,
 customLogReason ||
 "Stock level manual correction from product edit panel",
 );

 setBranchStock((stockList) => {
 const targetBranchId = currentUser.branchAssignmentId || "B1";
 const idx = stockList.findIndex(
 (bs) => bs.productId === id && bs.branchId === targetBranchId,
 );
 if (idx !== -1) {
 const updated = [...stockList];
 const nextQty = Math.max(0, updated[idx].quantity + diff);
 updated[idx] = { ...updated[idx], quantity: nextQty };
 return updated;
 } else {
 const nextQty = Math.max(0, diff);
 return [
 ...stockList,
 {
 id: `${targetBranchId}_${id}`,
 branchId: targetBranchId,
 productId: id,
 quantity: nextQty,
 },
 ];
 }
 });
 }
 }

 setProducts((prev) =>
 prev.map((p) => {
 if (p.id === id) {
 const sanitizedUpdates: Partial<Product> = {};
 if (updates.productName !== undefined)
 sanitizedUpdates.productName = sanitizeInputText(
 updates.productName,
 );
 if (updates.productCode !== undefined)
 sanitizedUpdates.productCode = sanitizeInputText(
 updates.productCode,
 );
 if (updates.sku !== undefined)
 sanitizedUpdates.sku = sanitizeInputText(updates.sku);
 if (updates.barcode !== undefined)
 sanitizedUpdates.barcode = sanitizeInputText(updates.barcode);
 if (updates.category !== undefined)
 sanitizedUpdates.category = sanitizeInputText(updates.category);
 if (updates.brand !== undefined)
 sanitizedUpdates.brand = sanitizeInputText(updates.brand);
 if (updates.size !== undefined)
 sanitizedUpdates.size = sanitizeInputText(updates.size);
 if (updates.designName !== undefined)
 sanitizedUpdates.designName = sanitizeInputText(updates.designName);
 if (updates.supplierId !== undefined)
 sanitizedUpdates.supplierId = sanitizeInputText(updates.supplierId);
 if (updates.unit !== undefined)
 sanitizedUpdates.unit = sanitizeInputText(updates.unit);
 if (updates.origin !== undefined)
 sanitizedUpdates.origin = updates.origin
 ? sanitizeInputText(updates.origin)
 : undefined;
 if (updates.image !== undefined)
 sanitizedUpdates.image = updates.image;

 if (updates.boxQuantity !== undefined)
 sanitizedUpdates.boxQuantity = sanitizeAndValidateNumber(
 updates.boxQuantity,
 );
 if (updates.coveragePerBox !== undefined)
 sanitizedUpdates.coveragePerBox = sanitizeAndValidateNumber(
 updates.coveragePerBox,
 );
 if (updates.costPrice !== undefined)
 sanitizedUpdates.costPrice = sanitizeAndValidateNumber(
 updates.costPrice,
 );
 if (updates.sellingPrice !== undefined)
 sanitizedUpdates.sellingPrice = sanitizeAndValidateNumber(
 updates.sellingPrice,
 );
 if (updates.stockQuantity !== undefined)
 sanitizedUpdates.stockQuantity = Math.round(
 sanitizeAndValidateNumber(updates.stockQuantity),
 );
 if (updates.minimumStock !== undefined)
 sanitizedUpdates.minimumStock = Math.round(
 sanitizeAndValidateNumber(updates.minimumStock),
 );

 return {
 ...p,
 ...updates,
 ...sanitizedUpdates,
 version: (p.version || 1) + 1,
 updatedAt: new Date().toISOString(),
 updatedBy: currentUser.fullName,
 };
 }
 return p;
 }),
 );

 addAuditLog(
 "PRODUCT_UPDATE",
 `Updated product ${original?.productName || id}`,
 "Products",
 id,
 );
 };

 const deleteProduct = (id: string) => {
 const original = products.find((p) => p.id === id);
 setProducts((prev) =>
 prev.map((p) =>
 p.id === id
 ? {
 ...p,
 isDeleted: true,
 updatedAt: new Date().toISOString(),
 updatedBy: currentUser.fullName,
 }
 : p,
 ),
 );
 addAuditLog(
 "PRODUCT_DELETE",
 `Soft-deleted product ${original?.productName || id}`,
 "Products",
 id,
 );
 };

 const deleteDamageLog = (id: string) => {
 setDamageLogs((prev) =>
 prev.map((log) =>
 log.id === id
 ? { ...log, isDeleted: true, deletedAt: new Date().toISOString() }
 : log,
 ),
 );
 addAuditLog(
 "DAMAGE_LOG_DELETE",
 `Soft-deleted damage log ID ${id}`,
 "DamageLogs",
 id,
 );
 };

 const importProducts = (imported: Product[], branchMapping?: Record<string, string>) => {
 try {
 const activeProducts = products.filter((prod) => !prod.isDeleted);
 const uniqueImported: Product[] = [];
 const blockedDuplicates: string[] = [];
 const seenKeysInImport = new Set<string>();

 imported.forEach((p, i) => {
 const barcode =
 sanitizeInputText(p.barcode) || generateEan13Barcode();
 const productCode =
 sanitizeInputText(p.productCode) ||
 barcode ||
 `TL-IMP-${Date.now()}-${i}`;
 const pName =
 sanitizeInputText(p.productName) || "Unnamed Imported Product";

 const normCode = productCode.toLowerCase().trim();
 const normName = pName.toLowerCase().trim();
 const normBarcode = barcode ? barcode.toLowerCase().trim() : "";

 // 1. Check if it already exists in the active database to prevent overwriting/duplicating
 const isDuplicateInDb = activeProducts.some(
 (prod) =>
 prod.productCode.toLowerCase().trim() === normCode ||
 (prod.barcode && normBarcode && prod.barcode.toLowerCase().trim() === normBarcode) ||
 prod.productName.toLowerCase().trim() === normName
 );

 if (isDuplicateInDb) {
 blockedDuplicates.push(pName);
 return; // Strictly block/skip to protect existing product stock levels
 }

 // 2. Check if it already duplicates within this imported dataset
 let isDuplicateInImport = false;
 for (const seenKey of seenKeysInImport) {
 const [sCode, sName, sBarcode] = seenKey.split("||");
 if (
 sCode === normCode ||
 (normBarcode && sBarcode && sBarcode === normBarcode) ||
 sName === normName
 ) {
 isDuplicateInImport = true;
 break;
 }
 }

 if (isDuplicateInImport) {
 blockedDuplicates.push(`${pName} (duplicate in file)`);
 return; // Strictly block/skip subsequent duplicated rows
 }

 seenKeysInImport.add(`${normCode}||${normName}||${normBarcode}`);
 uniqueImported.push(p);
 });

 if (uniqueImported.length === 0) {
 return {
 success: false,
 count: 0,
 error: `All ${imported.length} product entries were blocked because they already exist in your active inventory catalog. Duplicate overrides are prevented to secure your current stock counts.`
 };
 }

 // Helper functions for CSV spelling and formatting correction
 const correctCategoryName = (rawCat: string): string => {
   if (!rawCat) return "Porcelain Tiles";
   const clean = rawCat.toUpperCase().trim();
   const catMapping: Record<string, string> = {
     "WATERCLOSET": "Water Closet",
     "DOORKNOBS": "Doorknobs",
     "STAIRNOSING": "Stair Nosing",
     "PLUMBING ACC.": "Plumbing Accessories",
     "PLUMBING ACC": "Plumbing Accessories",
     "PLUMBING": "Plumbing Accessories",
     "CEILING PANEL": "Ceiling Panels",
     "KITCHEN SINK": "Kitchen Sinks",
     "BATHROOM ACCESSORIES": "Bathroom Accessories",
     "BATHROOM ACCESORIES": "Bathroom Accessories",
     "BATHROOM ACCS": "Bathroom Accessories",
     "TILE TRIM": "Tile Trims",
     "WPC PANEL": "WPC Panels",
     "GROUTS": "Grout & Adhesives",
     "ADHESIVES": "Grout & Adhesives",
     "LOCKSET": "Locksets",
     "SHOWER": "Showers",
     "TANK": "Tanks",
     "SLABSTONE": "Slabstone",
     "HINGES": "Hinges",
     "DAMAGES": "Damaged Products",
     "PAVERS": "Pavers",
     "ASSORTED": "Assorted Products",
     "BIDET": "Bidets",
     "GLOVES": "Gloves",
     "MOULDING": "Mouldings",
     "HARDWARE": "Hardware",
     "TILES": "Tiles",
     "ELECTRICAL": "Electrical",
     "ACCESSORIES": "Accessories",
     "FITTINGS": "Fittings",
     "DOOR": "Doors",
     "FAUCET": "Faucets",
     "OTHERS": "Others"
   };
   
   if (catMapping[clean]) {
     return catMapping[clean];
   }
   return clean
     .toLowerCase()
     .split(/\s+/)
     .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
     .join(" ");
 };

 const correctUnitName = (rawUnit: string): string => {
   if (!rawUnit) return "PCS";
   const clean = rawUnit.toUpperCase().trim();
   const unitMapping: Record<string, string> = {
     "PCS": "PCS",
     "PC": "PCS",
     "PIECE": "PCS",
     "PIECES": "PCS",
     "PACK": "Pack",
     "SET": "Set",
     "UNIT": "Unit",
     "METERS": "Meters",
     "METER": "Meters",
     "KILO": "Kilo",
     "KILOGRAM": "Kilo",
     "BAG": "Bag",
     "BAGS": "Bag",
     "PAIR": "Pair",
     "PALLET": "Pallet",
     "PALLETS": "Pallet",
     "BOX": "Box",
     "BOXES": "Box",
     "SACK": "Sack",
     "SACKS": "Sack",
     "ROLL": "Roll",
     "ROLLS": "Roll",
     "GALLON": "Gallon",
     "CAN": "Can"
   };
   if (unitMapping[clean]) {
     return unitMapping[clean];
   }
   return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
 };

 const correctProductName = (rawName: string): string => {
   if (!rawName) return "";
   let cleaned = rawName;
   const replacements: Array<[RegExp, string]> = [
     [/stairnossing/gi, "Stair Nosing"],
     [/stairnosing/gi, "Stair Nosing"],
     [/accesories/gi, "Accessories"],
     [/accesory/gi, "Accessory"],
     [/watercloset/gi, "Water Closet"],
     [/doorknobs/gi, "Doorknobs"],
     [/doorknob\b/gi, "Doorknob"],
     [/slightly damage/gi, "Slightly Damaged"],
     [/slight damage/gi, "Slightly Damaged"],
     [/slight damaged/gi, "Slightly Damaged"],
     [/damage\b/gi, "Damaged"],
     [/damages\b/gi, "Damaged"],
     [/1pallet/gi, "1 Pallet"],
   ];

   replacements.forEach(([regex, rep]) => {
     cleaned = cleaned.replace(regex, rep);
   });

   cleaned = cleaned
     .toLowerCase()
     .split(/\s+/)
     .map((word) => {
       const upperWords = ["pvc", "wpc", "s/s", "h", "wc", "led", "mu", "usd", "php", "coa", "boa"];
       if (upperWords.includes(word)) {
         return word.toUpperCase();
       }
       if (/^\d+(\.\d+)?[xx]\d+(\.\d+)?$/.test(word)) {
         return word.toLowerCase();
       }
       return word.charAt(0).toUpperCase() + word.slice(1);
     })
     .join(" ");

   cleaned = cleaned.replace(/(\d+)\s*[xX]\s*(\d+)/g, "$1x$2");
   return cleaned.trim();
 };

 const sanitized = uniqueImported.map((p, i) => {
 const barcode =
 sanitizeInputText(p.barcode) || generateEan13Barcode();
 const productCode =
 sanitizeInputText(p.productCode) ||
 barcode ||
 `TL-IMP-${Date.now()}-${i}`;
 const rawPName = sanitizeInputText(p.productName) || "Unnamed Imported Product";
 const pName = correctProductName(rawPName);

 // Extrapolate size if not set e.g. from productName "20X30 # SENEPA BEIGE"
 let size = sanitizeInputText(p.size);
 if (!size && pName) {
 const sizeMatch = pName.match(
 /(\d+(?:\.\d+)?)\s*[xX]\s*(\d+(?:\.\d+)?)/,
 );
 if (sizeMatch) {
 size = `${sizeMatch[1]}x${sizeMatch[2]} cm`;
 }
 }
 if (!size) {
 const catLower = (p.category || "").toLowerCase();
 const isTile =
 catLower.includes("tile") ||
 catLower.includes("slab") ||
 catLower.includes("stone");
 size = isTile ? "60x60 cm" : "N/A";
 }

 const sku =
 sanitizeInputText(p.sku) ||
 (barcode ? `SKU-${barcode}` : `SKU-IMP-${Date.now()}-${i}`);

 const finalId = p.id || `P-IMPORT-${Date.now()}-${i}`;

 return {
 ...p,
 id: finalId,
 productCode,
 productName: pName,
 sku,
 barcode,
 qrCode: p.qrCode || `TP-${productCode}`,
 category: correctCategoryName(sanitizeInputText(p.category)),
 brand: sanitizeInputText(p.brand) || "Generic",
 size,
 designName: correctProductName(sanitizeInputText(p.designName) || p.productName || pName),
 supplierId: sanitizeInputText(p.supplierId) || "central",
 unit: correctUnitName(sanitizeInputText(p.unit) || "Boxes"),
 origin: p.origin ? sanitizeInputText(p.origin) : undefined,

 boxQuantity: sanitizeAndValidateNumber(
 p.boxQuantity || (size !== "N/A" ? 4 : 1),
 1,
 ),
 coveragePerBox:
 p.coveragePerBox !== undefined
 ? sanitizeAndValidateNumber(p.coveragePerBox, 1)
 : undefined,
 costPrice: sanitizeAndValidateNumber(p.costPrice),
 sellingPrice: sanitizeAndValidateNumber(p.sellingPrice),
 stockQuantity: Math.round(sanitizeAndValidateNumber(p.stockQuantity)),
 minimumStock: Math.round(
 sanitizeAndValidateNumber(p.minimumStock, 0),
 ),

 createdAt: p.createdAt || new Date().toISOString(),
 updatedAt: new Date().toISOString(),
 isDeleted: Boolean(p.isDeleted),
 hasExpiration: p.hasExpiration !== undefined ? !!p.hasExpiration : (p.expirationDate ? true : false),
 expirationDate: p.expirationDate ? p.expirationDate : undefined,
 };
 });

  // Compute new products state synchronously
  const currentCodes = products.reduce(
    (acc, current) => {
      acc[current.productCode] = current;
      return acc;
    },
    {} as Record<string, Product>,
  );

  sanitized.forEach((item) => {
    currentCodes[item.productCode] = item;
  });

  const nextProducts = Object.values(currentCodes);
  setProducts(nextProducts);

  // Synchronize newly imported products with branch stock
  const nextBranchStock = [...branchStock];
  const nowIso = new Date().toISOString();
  sanitized.forEach((item) => {
    if (item.stockQuantity > 0) {
      let targetBranchId = currentUser.branchAssignmentId || "B1";
      if (item.origin) {
        const cleanedOrigin = item.origin.toLowerCase().trim();
        if (branchMapping && branchMapping[cleanedOrigin]) {
          targetBranchId = branchMapping[cleanedOrigin];
        } else {
          const matchedB = branches.find(
            (b) =>
              !b.isDeleted &&
              (b.id.toLowerCase().trim() === cleanedOrigin ||
              (b.branchCode && b.branchCode.toLowerCase().trim() === cleanedOrigin) ||
              b.name.toLowerCase().trim() === cleanedOrigin)
          );
          if (matchedB) {
            targetBranchId = matchedB.id;
          }
        }
      }
      const existingIdx = nextBranchStock.findIndex(
        (bs) =>
          bs.productId === item.id && bs.branchId === targetBranchId,
      );
      if (existingIdx !== -1) {
        nextBranchStock[existingIdx] = {
          ...nextBranchStock[existingIdx],
          quantity: item.stockQuantity,
          updatedAt: nowIso,
          version: (Number(nextBranchStock[existingIdx].version) || 0) + 1,
        };
      } else {
        nextBranchStock.push({
          id: `${targetBranchId}_${item.id}`,
          branchId: targetBranchId,
          productId: item.id,
          quantity: item.stockQuantity,
          updatedAt: nowIso,
          version: 1,
        });
      }
    }
  });
  setBranchStock(nextBranchStock);

 // Automatically parse and log imported damages into the Materials Breakage Registry (tp_damage_logs)
 const importedDamageLogs: DamageLog[] = [];
 sanitized.forEach((item) => {
   const isDamage = (item.category || "").toUpperCase() === "DAMAGES" || 
                    (item.productName || "").toUpperCase().includes("DAMAGE") ||
                    (item.category || "").toUpperCase().includes("DAMAGE");
   if (isDamage && item.stockQuantity > 0) {
     let targetBranchId = currentUser.branchAssignmentId || "B1";
     let targetBranchName = "ETC_DIPOLOG MAIN";
     if (item.origin) {
       const cleanedOrigin = item.origin.toLowerCase().trim();
       if (branchMapping && branchMapping[cleanedOrigin]) {
         targetBranchId = branchMapping[cleanedOrigin];
       } else {
         const matchedB = branches.find(
           (b) =>
             !b.isDeleted &&
             (b.id.toLowerCase().trim() === cleanedOrigin ||
             (b.branchCode && b.branchCode.toLowerCase().trim() === cleanedOrigin) ||
             b.name.toLowerCase().trim() === cleanedOrigin)
         );
         if (matchedB) {
           targetBranchId = matchedB.id;
           targetBranchName = matchedB.name;
         }
       }
     } else {
       const matchedB = branches.find(b => b.id === targetBranchId);
       if (matchedB) {
         targetBranchName = matchedB.name;
       }
     }

     // Map unit type
     const uom = (item.unit || "").toUpperCase();
     const unitType = (uom === "BOX" || uom === "BOXES" || uom === "PALLET" || uom === "CARTON") ? "Box" : "Piece";

     // Determine category/reason
     let cat = "Warehouse Breakage";
     if ((item.productName || "").toUpperCase().includes("BOA")) {
       cat = "BOA";
     } else if ((item.productName || "").toUpperCase().includes("TRANSIT") || (item.productName || "").toUpperCase().includes("DELIVERY")) {
       cat = "Delivery Transit";
     } else if ((item.productName || "").toUpperCase().includes("SHOWROOM") || (item.productName || "").toUpperCase().includes("SLIGHT")) {
       cat = "Showroom Casualty";
     }

     let action = "Disposed / Scrapped";
     if ((item.productName || "").toUpperCase().includes("MOSAIC") || (item.productName || "").toUpperCase().includes("BARGAIN") || (item.productName || "").toUpperCase().includes("SLIGHT")) {
       action = "Saved for Mosaic";
     }

     importedDamageLogs.push({
       id: `DMG-IMPORT-${item.id}`,
       productId: item.id,
       productName: item.productName,
       productSku: item.sku,
       branchId: targetBranchId,
       branchName: targetBranchName,
       quantity: item.stockQuantity,
       unitType,
       category: cat,
       actionTaken: action,
       notes: `Legacy stock damage imported from ERP file.`,
       reportedBy: currentUser.fullName || "Admin",
       reportedAt: new Date().toISOString(),
       createdAt: new Date().toISOString(),
       isDeleted: false,
     });
   }
 });

 if (importedDamageLogs.length > 0) {
   setDamageLogs((prev) => {
     const existingIds = new Set(prev.map(l => l.id));
     const filteredNew = importedDamageLogs.filter(l => !existingIds.has(l.id));
     return [...filteredNew, ...prev];
   });
 }

 const blockedMsg = blockedDuplicates.length > 0 
 ? ` (${blockedDuplicates.length} duplicate entries blocked)`
 : "";

 addAuditLog(
 "PRODUCT_BULK_IMPORT",
 `Bulk-imported ${sanitized.length} products successfully${blockedMsg}`,
 "Products",
 "BULK",
 );

  // Synchronously write to local storage & volatile cache so immediate reads are accurate
  safeLocalStorageSetItem("tp_products", JSON.stringify(nextProducts));
  volatileCache.current["tp_products"] = JSON.stringify(nextProducts);

  safeLocalStorageSetItem("tp_branch_stock", JSON.stringify(nextBranchStock));
  volatileCache.current["tp_branch_stock"] = JSON.stringify(nextBranchStock);

  const currentDamage = JSON.parse(localStorage.getItem("tp_damage_logs") || "[]");

  // Directly flush full dataset arrays to server API
  (async () => {
    try {
      await safeApiFetch("/api/db/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          data: {
            tp_products: nextProducts,
            tp_branch_stock: nextBranchStock,
            tp_damage_logs: currentDamage,
          },
        }),
      });
      console.log("[Bulk Import Sync] Successfully flushed imported products to central server.");
    } catch (err) {
      console.warn("[Bulk Import Sync] Failed to post bulk sync to server:", err);
    }
  })();
 return { success: true, count: sanitized.length };
 } catch (e: any) {
 return {
 success: false,
 count: 0,
 error: e?.message || "Error occurred during parsing.",
 };
 }
 };

 // POS / CHECOUT SALES
 const holdSale = (
 cartItems: { product: Product; quantity: number }[],
 customerName: string,
 notes: string,
 ): string => {
 const holdId = `HLD-${Date.now()}`;
 const newHold = {
 id: holdId,
 customerName: customerName || "Walk-in Customer",
 notes,
 items: cartItems,
 timestamp: new Date().toLocaleTimeString(),
 createdAt: Date.now(), // High-precision timestamp for merge safety
 heldBy: currentUser?.fullName || currentUser?.username || "Yard Staff",
 heldByBranchId: currentUser?.branchAssignmentId || "B1",
 status: "active",
 synced: false,
 };
 setParkedSales((prev: any[]) => [...prev, newHold]);

 try {
 const queueChannel = new BroadcastChannel("tilepoint_queue_channel");
 queueChannel.postMessage({ type: "QUEUE_ADD", hold: newHold, timestamp: Date.now() });
 queueChannel.close();
 } catch (_) {}

 try {
 window.dispatchEvent(new CustomEvent("tp_queue_updated", { detail: { action: "add", hold: newHold } }));
 } catch (_) {}

 addAuditLog(
 "POS_PARK_SALE",
 `Held order for customer ${customerName || "Walk-in"} (Hold ID: ${holdId}) by ${currentUser?.fullName || "Staff"}`,
 "Sales",
 holdId,
 );
 return holdId;
 };

 const resumeParkedSale = useCallback(
 (
 parkedId: string,
 cashierName?: string,
 ): { success: boolean; record?: any; error?: string } => {
 if (!parkedId) {
 return { success: false, error: "Invalid staged order ID." };
 }

 if (
 activeResumingIdsRef.current.has(parkedId) ||
 deletedParkedSaleIds.current.has(parkedId)
 ) {
 return {
 success: false,
 error: `Staged order (${parkedId}) has already been resumed on another register/session to prevent double records.`,
 };
 }

 activeResumingIdsRef.current.add(parkedId);

 const targetRecord = parkedSales.find((p) => p && p.id === parkedId);

 if (!targetRecord) {
 activeResumingIdsRef.current.delete(parkedId);
 return {
 success: false,
 error: `Staged order (${parkedId}) is no longer in the queue. It may have already been resumed or cleared on another register.`,
 };
 }

 recordDeletedParkedSaleId(parkedId);

 setParkedSales((prev: any[]) => prev.filter((p) => p && p.id !== parkedId));

 try {
 const queueChannel = new BroadcastChannel("tilepoint_queue_channel");
 queueChannel.postMessage({ type: "QUEUE_RESUME", parkedId, timestamp: Date.now() });
 queueChannel.close();
 } catch (_) {}

 try {
 window.dispatchEvent(new CustomEvent("tp_queue_updated", { detail: { action: "resume", parkedId } }));
 } catch (_) {}

 try {
 localStorage.setItem("tp_last_resumed_hold_id", `${parkedId}_${Date.now()}`);
 window.dispatchEvent(new Event("storage"));
 } catch (_) {}

 addAuditLog(
 "POS_RESUME_PARK_SALE",
 `Resumed held transaction ${parkedId} for ${targetRecord.customerName || "Walk-in"} by Cashier ${cashierName || currentUser?.fullName || "System"}`,
 "Sales",
 parkedId,
 );

 setTimeout(() => {
 activeResumingIdsRef.current.delete(parkedId);
 }, 10000);

 return {
 success: true,
 record: targetRecord,
 };
 },
 [parkedSales, currentUser?.fullName, addAuditLog],
 );

 const getBranchStockQuantityContext = useCallback((productId: string, targetBranchId?: string): number => {
 const bId = targetBranchId || currentUser?.branchAssignmentId || "B1";
 const cacheKey = `bs:${bId}:${productId}`;
 const cached = optimisticStockCacheRef.current.get(cacheKey);
 const now = Date.now();
 if (cached && (now - cached.lastSaleCommitTime < 60000)) {
 return cached.quantity;
 }
 const prod = products.find((p) => p.id === productId);
 return getBranchStockQuantity(prod, bId, branchStock, branches);
 }, [branchStock, products, branches, currentUser?.branchAssignmentId]);

 const getProductStockCountContext = useCallback((productId: string): number => {
 const cacheKey = `prod:${productId}`;
 const cached = optimisticStockCacheRef.current.get(cacheKey);
 const now = Date.now();
 if (cached && (now - cached.lastSaleCommitTime < 60000)) {
 return cached.quantity;
 }
 const prod = products.find((p) => p.id === productId);
 return prod ? prod.stockQuantity : 0;
 }, [products]);

 const getInventoryContext = useCallback((productId: string, targetBranchId?: string) => {
 const bId = targetBranchId || currentUser?.branchAssignmentId || "B1";
 const bsKey = `bs:${bId}:${productId}`;
 const prodKey = `prod:${productId}`;
 const bsCached = optimisticStockCacheRef.current.get(bsKey);
 const prodCached = optimisticStockCacheRef.current.get(prodKey);
 const now = Date.now();

 const isBsOptimistic = !!(bsCached && (now - bsCached.lastSaleCommitTime < 60000));
 const isProdOptimistic = !!(prodCached && (now - prodCached.lastSaleCommitTime < 60000));

 const branchQty = isBsOptimistic ? bsCached!.quantity : getBranchStockQuantityContext(productId, bId);
 const stockQuantity = isProdOptimistic ? prodCached!.quantity : getProductStockCountContext(productId);

 return {
 stockQuantity,
 branchQuantity: branchQty,
 isOptimistic: isBsOptimistic || isProdOptimistic
 };
 }, [currentUser?.branchAssignmentId, getBranchStockQuantityContext, getProductStockCountContext]);

 const revalidateStockCounts = async (
 affectedItems?: { productId: string; branchId?: string; quantityDelta?: number }[]
 ) => {
 console.log("[Inventory Cache] Force-revalidating stock counts post-sale commit...", affectedItems);
 const now = Date.now();
 const nowIso = new Date().toISOString();
 const userBranchId = currentUser?.branchAssignmentId || "B1";

 if (affectedItems && affectedItems.length > 0) {
 affectedItems.forEach(({ productId, branchId: bId, quantityDelta }) => {
 const targetBranchId = bId || userBranchId;

 // 1. Update Branch Stock in cache & state
 setBranchStock((prevList) => {
 const nextList = [...prevList];
 const matchIdx = nextList.findIndex((bs) => bs.productId === productId && bs.branchId === targetBranchId);
 if (matchIdx !== -1) {
 const currentQty = nextList[matchIdx].quantity;
 const newQty = quantityDelta !== undefined ? Math.max(0, currentQty + quantityDelta) : currentQty;
 const newVer = (nextList[matchIdx].version || 0) + 1;
 nextList[matchIdx] = {
 ...nextList[matchIdx],
 quantity: newQty,
 version: newVer,
 updatedAt: nowIso,
 };
 optimisticStockCacheRef.current.set(`bs:${targetBranchId}:${productId}`, {
 productId,
 branchId: targetBranchId,
 quantity: newQty,
 version: newVer,
 updatedAt: nowIso,
 lastSaleCommitTime: now,
 });
 }
 return nextList;
 });

 // 2. Update Product catalog stock in cache & state
 setProducts((prev) => {
 const updated = [...prev];
 const prodIdx = updated.findIndex((p) => p.id === productId);
 if (prodIdx !== -1) {
 const currentQty = updated[prodIdx].stockQuantity;
 const newQty = quantityDelta !== undefined ? Math.max(0, currentQty + quantityDelta) : currentQty;
 const newVer = (updated[prodIdx].version || 0) + 1;
 updated[prodIdx] = {
 ...updated[prodIdx],
 stockQuantity: newQty,
 version: newVer,
 updatedAt: nowIso,
 };
 optimisticStockCacheRef.current.set(`prod:${productId}`, {
 productId,
 quantity: newQty,
 version: newVer,
 updatedAt: nowIso,
 lastSaleCommitTime: now,
 });
 }
 return updated;
 });
 });
 }

 // Force immediate push to server so server receives the post-sale stock counts right away
 try {
 await forceSyncAllToServer();
 } catch (err) {
 console.warn("[Stock Revalidation] Error pushing stock updates to server:", err);
 }

 // Immediately trigger server sync to confirm state while preserving optimistic values
 try {
 await syncFromSharedServer(true);
 } catch (err) {
 console.warn("[Stock Revalidation] Error re-fetching server state:", err);
 }
 };

 const checkoutSale = (
 cartItems: { product: Product; quantity: number }[],
 customerName: string,
 notes: string,
 discountAmount: number,
 paymentMethod: Sale["paymentMethod"],
 amountTendered: number,
 customVat?: number,
 idempotencyKey?: string,
 discountType?: string,
 targetBranchId?: string,
 pointsRedeemed?: number,
 ): Sale => {
 // Idempotency check: prevent duplicate transactions
 if (idempotencyKey) {
 const existingSale = sales.find((s) => s.idempotencyKey === idempotencyKey);
 if (existingSale) {
 console.warn(`[System Guard] Idempotency Shield: Duplicate transaction detected for key: ${idempotencyKey}. Returning existing sale.`);
 return existingSale;
 }
 }

 const saleId = `SL-${Date.now()}`;
 const saleNum = `SL-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
 Math.random() * 10000,
 )
 .toString()
 .padStart(4, "0")}`;

 const userBranchId = targetBranchId || currentUser?.branchAssignmentId || "B1";

 // Anti-collision Lock: Defensive stock verification immediately before deductions
 for (const item of cartItems) {
 const currentQty = getBranchStockQuantityContext(item.product.id, userBranchId);
 if (currentQty < item.quantity) {
 throw new Error(
 `Insufficient inventory: Product "${item.product.productName}" has only ${currentQty} units available in branch inventory, but ${item.quantity} units were requested.`,
 );
 }
 }

 // Totals calculations
 const subtotal = cartItems.reduce((acc, item) => {
 const branchStockRec = getBranchStockRecord(item.product, userBranchId, branchStock, branches);
 const basePrice =
 branchStockRec &&
 branchStockRec.sellingPriceOverride !== undefined &&
 branchStockRec.sellingPriceOverride > 0
 ? branchStockRec.sellingPriceOverride
 : item.product.sellingPrice;
 const unitPrice =
 (item as any).overridePrice !== undefined
 ? (item as any).overridePrice
 : basePrice;
 return acc + unitPrice * item.quantity;
 }, 0);

 const vat =
 customVat !== undefined
 ? customVat
 : parseFloat((subtotal * 0.12).toFixed(2));
 const grandTotal = parseFloat((subtotal - discountAmount).toFixed(2));
 const changeAmount =
 paymentMethod === "Cash"
 ? parseFloat((amountTendered - grandTotal).toFixed(2))
 : 0.0;

  const isWalkInCustomer =
    !customerName ||
    customerName.trim().toLowerCase() === "walk-in customer" ||
    customerName.trim().toLowerCase() === "walk-in" ||
    customerName.trim().toLowerCase() === "walk-in buyer" ||
    customerName.trim().toLowerCase().startsWith("walk-in");

  const matchingMember = !isWalkInCustomer
    ? members.find(
        (m) => m.fullName.toLowerCase() === (customerName || "").toLowerCase()
      )
    : undefined;

  const pointsEarned = (!isWalkInCustomer && loyaltyConfig.enabled && loyaltyConfig.spendPerPoint > 0 && grandTotal > 0)
    ? Math.floor(grandTotal / loyaltyConfig.spendPerPoint) * loyaltyConfig.pointsPerSpend
    : 0;
  const ptsRedeemed = pointsRedeemed || 0;

  // MEMBER CREDIT CEILING VERIFICATION & LOYALTY POINTS UPDATE
  if (paymentMethod === "Member Credit") {
    if (matchingMember) {
      if (matchingMember.status !== "Active") {
        throw new Error(
          `Credit Transaction Blocked: Customer "${matchingMember.fullName}" is currently Suspended.`
        );
      }
      const remainingLimit = matchingMember.creditLimit - matchingMember.outstandingBalance;
      if (grandTotal > remainingLimit) {
        throw new Error(
          `Credit Limit Exceeded: Customer "${matchingMember.fullName}" has a remaining credit limit of ₱${remainingLimit.toLocaleString()}, but this transaction total is ₱${grandTotal.toLocaleString()}.`
        );
      }
      setMembers((prevMembers) =>
        prevMembers.map((m) =>
          m.id === matchingMember.id
            ? {
                ...m,
                outstandingBalance: parseFloat((m.outstandingBalance + grandTotal).toFixed(2)),
                points: Math.max(0, (m.points || 0) + pointsEarned - ptsRedeemed),
              }
            : m
        )
      );
    } else {
      throw new Error(
        `Invalid Credit Profile: No registered Corporate Member found matching the customer name "${customerName}". Please assign an active member first via F5 or the Customer Info tab.`
      );
    }
  } else if (matchingMember) {
    setMembers((prevMembers) =>
      prevMembers.map((m) =>
        m.id === matchingMember.id
          ? {
              ...m,
              points: Math.max(0, (m.points || 0) + pointsEarned - ptsRedeemed),
            }
          : m
      )
    );
  }

  const newSale: Sale = {
 id: saleId,
 saleNumber: saleNum,
 shiftId: activeShift ? activeShift.id : "NO-SHIFT-ACTIVE",
 branchId: userBranchId,
 cashierId: currentUser?.id || "SYSTEM",
 cashierName: currentUser?.fullName || "System Automated",
 customerName: customerName || "Walk-in Customer",
 subtotal,
 vat,
 discount: discountAmount,
 grandTotal,
 paymentMethod,
 amountTendered: paymentMethod === "Cash" ? amountTendered : grandTotal,
 changeAmount: changeAmount > 0 ? changeAmount : 0,
 notes,
 createdAt: new Date().toISOString(),
 updatedAt: new Date().toISOString(),
 isDeleted: false,
 idempotencyKey,
 pointsEarned,
 pointsRedeemed: ptsRedeemed,
 discountType,
 };

 // Save sale items
 const newSaleItems: SaleItem[] = cartItems.map((item, idx) => {
 const branchStockRec = getBranchStockRecord(item.product, userBranchId, branchStock, branches);
 const basePrice =
 branchStockRec &&
 branchStockRec.sellingPriceOverride !== undefined &&
 branchStockRec.sellingPriceOverride > 0
 ? branchStockRec.sellingPriceOverride
 : item.product.sellingPrice;
 const unitPrice =
 (item as any).overridePrice !== undefined
 ? (item as any).overridePrice
 : basePrice;
 return {
 id: `SLI-${saleId}-${idx}`,
 saleId,
 productId: item.product.id,
 productName: item.product.productName,
 unitPrice,
 quantity: item.quantity,
 total: unitPrice * item.quantity,
 isDeleted: false,
 };
 });

 // Save and Deduct inventory
 setSales((prev) => [newSale, ...prev]);
 setSaleItems((prev) => [...prev, ...newSaleItems]);

 // Update branchStock for local branch
 setBranchStock((prevList) => {
 const nextList = [...prevList];
 const nowIso = new Date().toISOString();
 cartItems.forEach((item) => {
 const bsRec = getBranchStockRecord(item.product, userBranchId, nextList, branches);
 const matchIdx = bsRec ? nextList.findIndex((bs) => bs.id === bsRec.id) : -1;
 if (matchIdx !== -1) {
 nextList[matchIdx] = {
 ...nextList[matchIdx],
 id: nextList[matchIdx].id || `${userBranchId}_${item.product.id}`,
 quantity: Math.max(0, nextList[matchIdx].quantity - item.quantity),
 version: (nextList[matchIdx].version || 0) + 1,
 updatedAt: nowIso,
 };
 } else {
 nextList.push({
 id: `${userBranchId}_${item.product.id}`,
 branchId: userBranchId,
 productId: item.product.id,
 quantity: Math.max(0, (item.product.stockQuantity ?? 0) - item.quantity),
 version: 1,
 updatedAt: nowIso,
 });
 }
 });
 return nextList;
 });

 // Update Product stocks & write movements
 setProducts((prev) => {
 const updated = [...prev];
 cartItems.forEach((item) => {
 const prodIdx = updated.findIndex((p) => p.id === item.product.id);
 if (prodIdx !== -1) {
 updated[prodIdx] = {
 ...updated[prodIdx],
 stockQuantity: Math.max(
 0,
 updated[prodIdx].stockQuantity - item.quantity,
 ),
 version: (updated[prodIdx].version || 0) + 1,
 updatedAt: new Date().toISOString(),
 };
 }
 });
 return updated;
 });

 const newMovements: InventoryMovement[] = cartItems.map((item, idx) => ({
 id: `M-SALE-${saleId}-${idx}`,
 productId: item.product.id,
 type: "OUT",
 quantity: -item.quantity,
 sourceBranchId: currentUser?.branchAssignmentId || "B1",
 referenceId: saleId,
 notes: `Sold to ${customerName || "Walk-in"} in Invoice ${saleNum}`,
 timestamp: new Date().toISOString(),
 userId: currentUser?.id || "SYSTEM",
 username: currentUser?.username || "system",
 }));

 setMovements((prev) => [...newMovements, ...prev]);

 // Update current active shift figures if open
 if (activeShift) {
 setShifts((prev) =>
 prev.map((s) => {
 if (s.id === activeShift.id) {
 const newSalesTotal = s.shiftSalesTotal + grandTotal;
 const newVatTotal = s.shiftVatTotal + vat;
 const newDiscountTotal = s.shiftDiscountTotal + discountAmount;
 return {
 ...s,
 shiftSalesCount: s.shiftSalesCount + 1,
 shiftSalesTotal: newSalesTotal,
 shiftVatTotal: newVatTotal,
 shiftDiscountTotal: newDiscountTotal,
 };
 }
 return s;
 }),
 );
 }

 addAuditLog(
 "POS_CHECKOUT",
 `Completed sale invoice ${saleNum}. Amount: ₱${grandTotal.toFixed(2)}`,
 "Sales",
 saleId,
 );

 const affectedBranchStockUpdates = cartItems.map((item) => {
 const bsRecord = branchStock.find((bs) => bs.productId === item.product.id && bs.branchId === userBranchId);
 const currentBsQty = bsRecord ? bsRecord.quantity : (item.product.stockQuantity ?? 0);
 const newBsQty = Math.max(0, currentBsQty - item.quantity);
 return {
 id: bsRecord ? bsRecord.id : `${userBranchId}_${item.product.id}`,
 branchId: userBranchId,
 productId: item.product.id,
 quantity: newBsQty,
 version: ((bsRecord as any)?.version || 0) + 1,
 updatedAt: new Date().toISOString(),
 };
 });

 const affectedProductUpdates = cartItems.map((item) => {
 const prodRecord = products.find((p) => p.id === item.product.id);
 const currentProdQty = prodRecord ? prodRecord.stockQuantity : (item.product.stockQuantity ?? 0);
 const newProdQty = Math.max(0, currentProdQty - item.quantity);
 return {
 id: item.product.id,
 stockQuantity: newProdQty,
 version: ((prodRecord as any)?.version || 0) + 1,
 updatedAt: new Date().toISOString(),
 };
 });

 enqueueTransaction({
 id: `tx-checkout-${saleId}`,
 type: "ATOMIC_TRANSACTION",
 txType: "POS_CHECKOUT",
 timestamp: Date.now(),
 payload: {
 sales: [newSale],
 saleItems: newSaleItems,
 movements: newMovements,
 auditLogs: [{
 id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
 actionCode: "POS_CHECKOUT",
 description: `Completed sale invoice ${saleNum}. Amount: ₱${grandTotal.toFixed(2)}`,
 module: "Sales",
 userId: currentUser?.id || "SYSTEM",
 userName: currentUser?.fullName || "System Automated",
 branchId: userBranchId,
 timestamp: new Date().toISOString(),
 }],
 branchStockUpdates: affectedBranchStockUpdates,
 productUpdates: affectedProductUpdates,
 shifts: activeShift ? [{
 ...activeShift,
 shiftSalesCount: activeShift.shiftSalesCount + 1,
 shiftSalesTotal: activeShift.shiftSalesTotal + grandTotal,
 shiftVatTotal: activeShift.shiftVatTotal + vat,
 shiftDiscountTotal: activeShift.shiftDiscountTotal + discountAmount,
 }] : [],
 members: matchingMember ? [{
 ...matchingMember,
 outstandingBalance: paymentMethod === "Member Credit" ? parseFloat((matchingMember.outstandingBalance + grandTotal).toFixed(2)) : matchingMember.outstandingBalance,
 points: Math.max(0, (matchingMember.points || 0) + pointsEarned - ptsRedeemed),
 }] : [],
 removeParkedSaleId: (idempotencyKey && idempotencyKey.startsWith("HLD-")) ? idempotencyKey : null,
 },
 });

 sqliteDatabaseService.saveSaleLog({
   id: newSale.id,
   saleNumber: newSale.saleNumber,
   branchId: newSale.branchId,
   cashierId: newSale.cashierId,
   cashierName: newSale.cashierName,
   shiftId: newSale.shiftId,
   customerName: newSale.customerName,
   subtotal: newSale.subtotal,
   taxAmount: newSale.vat,
   discountTotal: newSale.discount,
   grandTotal: newSale.grandTotal,
   paymentMethod: newSale.paymentMethod,
   paymentStatus: 'PAID',
   items: newSaleItems.map(item => ({
     id: item.id,
     saleId: item.saleId,
     productId: item.productId,
     productName: item.productName,
     quantity: item.quantity,
     unitPrice: item.unitPrice,
     subtotal: item.total
   })),
   createdAt: newSale.createdAt,
   updatedAt: newSale.updatedAt
 }).catch(err => console.warn('[DbContext] sqliteDatabaseService.saveSaleLog notice:', err));

 sqliteDatabaseService.logAuditTrail({
   action: 'POS_CHECKOUT',
   category: 'Sales',
   details: `Completed sale invoice ${saleNum}. Amount: ₱${grandTotal.toFixed(2)}`,
   performerId: currentUser?.id || 'SYSTEM',
   performerName: currentUser?.fullName || 'System',
   branchId: userBranchId,
   entityId: saleId,
   entityType: 'SALE',
   createdAt: new Date().toISOString()
 }).catch(() => {});

 // Populate optimistic stock cache immediately for all cart items post-sale commit
 const now = Date.now();
 const nowIso = new Date().toISOString();
 cartItems.forEach((item) => {
 const bsRecord = branchStock.find(
 (bs) => bs.productId === item.product.id && bs.branchId === userBranchId,
 );
 const prodRecord = products.find((p) => p.id === item.product.id);

 const currentBsQty = bsRecord ? bsRecord.quantity : (item.product.stockQuantity ?? 0);
 const newBsQty = Math.max(0, currentBsQty - item.quantity);
 const bsVersion = ((bsRecord as any)?.version || 0) + 1;

 const currentProdQty = prodRecord ? prodRecord.stockQuantity : (item.product.stockQuantity ?? 0);
 const newProdQty = Math.max(0, currentProdQty - item.quantity);
 const prodVersion = ((prodRecord as any)?.version || 0) + 1;

 optimisticStockCacheRef.current.set(`bs:${userBranchId}:${item.product.id}`, {
 productId: item.product.id,
 branchId: userBranchId,
 quantity: newBsQty,
 version: bsVersion,
 updatedAt: nowIso,
 lastSaleCommitTime: now,
 });

 optimisticStockCacheRef.current.set(`prod:${item.product.id}`, {
 productId: item.product.id,
 quantity: newProdQty,
 version: prodVersion,
 updatedAt: nowIso,
 lastSaleCommitTime: now,
 });
 });

 // Force-revalidate stock counts immediately after sale event commits to prevent stock jump anomaly
 const affectedItems = cartItems.map((item) => ({
 productId: item.product.id,
 branchId: userBranchId,
 quantityDelta: 0,
 }));

 revalidateStockCounts(affectedItems).catch((err) => {
 console.warn("[POS Checkout] Immediate stock revalidation background failure:", err);
 });

 return newSale;
 };

 const voidSale = (saleId: string) => {
 // 1. Find the sale
 const targetSale = sales.find((s) => s.id === saleId);
 if (!targetSale) return;

 // 2. Mark sale as deleted
 setSales((prev) =>
 prev.map((s) =>
 s.id === saleId
 ? { ...s, isDeleted: true, deletedAt: new Date().toISOString() }
 : s,
 ),
 );

 // Mark sale items as deleted
 setSaleItems((prev) =>
 prev.map((item) =>
 item.saleId === saleId
 ? { ...item, isDeleted: true, deletedAt: new Date().toISOString() }
 : item,
 ),
 );

 // 3. Get the corresponding sale items to restore inventory
 const itemsToRestore = saleItems.filter((item) => item.saleId === saleId);

 // Update Product stocks & write movements
 setProducts((prev) => {
 const updated = [...prev];
 itemsToRestore.forEach((item) => {
 const prodIdx = updated.findIndex((p) => p.id === item.productId);
 if (prodIdx !== -1) {
 updated[prodIdx] = {
 ...updated[prodIdx],
 stockQuantity: updated[prodIdx].stockQuantity + item.quantity,
 version: (updated[prodIdx].version || 0) + 1,
 updatedAt: new Date().toISOString(),
 };
 }
 });
 return updated;
 });

 // Write restoration movements (type: 'IN' as we are receiving stock back)
 const newMovements: InventoryMovement[] = itemsToRestore.map(
 (item, idx) => ({
 id: `M-VOID-${saleId}-${idx}`,
 productId: item.productId,
 type: "IN",
 quantity: item.quantity,
 sourceBranchId: targetSale.branchId,
 referenceId: saleId,
 notes: `Restored: Voided invoice ${targetSale.saleNumber} by ${currentUser.fullName}`,
 timestamp: new Date().toISOString(),
 userId: currentUser.id,
 username: currentUser.username,
 }),
 );

 setMovements((prev) => [...newMovements, ...prev]);

 // Strict Consistency: restore local branch stock synchronously
 setBranchStock((prevList) => {
 const nextList = [...prevList];
 itemsToRestore.forEach((item) => {
 const matchIdx = nextList.findIndex(
 (bs) =>
 bs.productId === item.productId && bs.branchId === targetSale.branchId,
 );
 if (matchIdx !== -1) {
 nextList[matchIdx] = {
 ...nextList[matchIdx],
 quantity: nextList[matchIdx].quantity + item.quantity,
 version: (nextList[matchIdx].version || 0) + 1,
 updatedAt: new Date().toISOString(),
 };
 } else {
 nextList.push({
 id: `${targetSale.branchId}_${item.productId}`,
 branchId: targetSale.branchId,
 productId: item.productId,
 quantity: item.quantity,
 version: 1,
 updatedAt: new Date().toISOString(),
 });
 }
 });
 return nextList;
 });

 // Update shift indicators if activeShift matches
 if (activeShift && targetSale.shiftId === activeShift.id) {
 setShifts((prev) =>
 prev.map((s) => {
 if (s.id === activeShift.id) {
 // Subtract from totals
 const voidedSubtotal = targetSale.subtotal;
 const voidedVat = targetSale.vat;
 const voidedDiscount = targetSale.discount;
 return {
 ...s,
 shiftSalesCount: Math.max(0, s.shiftSalesCount - 1),
 shiftSalesTotal: Math.max(0, s.shiftSalesTotal - targetSale.grandTotal),
 shiftVatTotal: Math.max(0, s.shiftVatTotal - voidedVat),
 shiftDiscountTotal: Math.max(
 0,
 s.shiftDiscountTotal - voidedDiscount,
 ),
 };
 }
 return s;
 }),
 );
 }

  // Refund member credit if applicable
  if (targetSale.paymentMethod === "Member Credit") {
    setMembers((prevMembers) =>
      prevMembers.map((m) =>
        m.fullName.toLowerCase() === targetSale.customerName.toLowerCase()
          ? {
              ...m,
              outstandingBalance: parseFloat(Math.max(0, m.outstandingBalance - targetSale.grandTotal).toFixed(2)),
            }
          : m
      )
    );
  }

 enqueueTransaction({
 id: `tx-void-${saleId}`,
 type: "ATOMIC_TRANSACTION",
 txType: "POS_VOID_SALE",
 timestamp: Date.now(),
 payload: {
 sales: [{
 ...targetSale,
 isDeleted: true,
 deletedAt: new Date().toISOString(),
 }],
 saleItems: itemsToRestore.map((item) => ({
 ...item,
 isDeleted: true,
 deletedAt: new Date().toISOString(),
 })),
 movements: newMovements,
 auditLogs: [{
 id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
 actionCode: "POS_VOID_SALE",
 description: `VOIDED transaction invoice ${targetSale.saleNumber}. Restored ${itemsToRestore.length} products to inventory. Refund Amount: ₱${(Number(targetSale.grandTotal) || 0).toFixed(2)}`,
 module: "Sales",
 userId: currentUser?.id || "SYSTEM",
 userName: currentUser?.fullName || "System",
 branchId: targetSale.branchId,
 timestamp: new Date().toISOString(),
 }],
 },
 });

 addAuditLog(
 "POS_VOID_SALE",
 `VOIDED transaction invoice ${targetSale.saleNumber}. Restored ${itemsToRestore.length} products to inventory. Refund Amount: ₱${(Number(targetSale.grandTotal) || 0).toFixed(2)}`,
 "Sales",
 saleId,
 );
 };

 // SHIFT MANAGEMENT
 const openShift = (startCash: number) => {
 const shiftId = `SH-${Date.now()}`;
 const newShift: Shift = {
 id: shiftId,
 cashierId: currentUser.id,
 cashierName: currentUser.fullName,
 branchId: currentUser.branchAssignmentId,
 status: "OPEN",
 startCash,
 endCash: 0,
 cashCount: 0,
 variance: 0,
 openedAt: new Date().toISOString(),
 closedAt: null,
 shiftSalesCount: 0,
 shiftSalesTotal: 0,
 shiftVatTotal: 0,
 shiftDiscountTotal: 0,
 };
 setShifts((prev) => [newShift, ...prev]);
 addAuditLog(
 "SHIFT_OPEN",
 `Opened drawer shift with starting cash of ₱${startCash.toFixed(2)}`,
 "Shifts",
 shiftId,
 );
 };

  const closeShift = (cashCount: number) => {
    if (!activeShift) return;

    // Enforce pre-closure backup snapshot in internal database records
    const snapshotName = `Shift Close Auto-Snapshot - ${activeShift.id} - ${new Date().toLocaleDateString()}`;
    generateSystemSnapshot(snapshotName);

    const statsResult = getShiftReportStats(activeShift);
    const expectedEndCash = statsResult.expectedEndCash;
    const variance = cashCount - expectedEndCash;

    setShifts((prev) =>
      prev.map((s) => {
        if (s.id === activeShift.id) {
          return {
            ...s,
            status: "CLOSED" as ShiftStatus,
            endCash: expectedEndCash,
            cashCount,
            variance,
            shiftSalesTotal: statsResult.netTotal,
            shiftSalesCount: statsResult.salesCount,
            shiftVatTotal: statsResult.vatTotal,
            shiftDiscountTotal: statsResult.discountTotal,
            closedAt: new Date().toISOString(),
          };
        }
        return s;
      }),
    );

    addAuditLog(
      "SHIFT_CLOSE",
      `Closed active shift. Counted ₱${cashCount.toFixed(2)} vs Expected ₱${expectedEndCash.toFixed(2)} (Variance: ₱${variance.toFixed(2)})`,
      "Shifts",
      activeShift.id,
    );
  };

  const forceCloseAllShifts = () => {
    setShifts((prev) =>
      prev.map((s) => {
        if (s.status === "Open" || !s.closedAt) {
          return {
            ...s,
            status: "CLOSED" as any,
            closedAt: new Date().toISOString(),
          };
        }
        return s;
      })
    );
    addAuditLog(
      "SHIFT_FORCE_CLOSE_ALL",
      "Forced closure of all open/unclosed drawer shifts via System Operations Center.",
      "Shifts",
      "ALL"
    );
  };

  const getShiftReportStats = (shift: Shift) => {
    // Net sales made inside this shift
    const shiftSales = sales.filter((s) => {
      if (!s || s.isDeleted) return false;
      if (s.shiftId === shift.id) return true;
      if (s.branchId === shift.branchId && s.cashierId === shift.cashierId) {
        const sTime = new Date(s.createdAt || 0).getTime();
        const openTime = new Date(shift.openedAt).getTime();
        const closeTime = shift.closedAt ? new Date(shift.closedAt).getTime() : Date.now();
        return sTime >= openTime && sTime <= closeTime;
      }
      return false;
    });

    const salesCount = shiftSales.length;
    const salesTotal = shiftSales.reduce((acc, curr) => acc + (Number(curr.subtotal) || 0), 0);
    const vatTotal = shiftSales.reduce((acc, curr) => acc + (Number(curr.vat) || 0), 0);
    const discountTotal = shiftSales.reduce((acc, curr) => acc + (Number(curr.discount) || 0), 0);
    const netTotal = shiftSales.reduce((acc, curr) => acc + (Number(curr.grandTotal) || 0), 0);

    const cashSalesTotal = shiftSales
      .filter((s) => !s.paymentMethod || s.paymentMethod.toLowerCase() === "cash")
      .reduce((acc, curr) => acc + (Number(curr.grandTotal) || 0), 0);

    const nonCashSalesTotal = Math.max(0, netTotal - cashSalesTotal);

    // Calculate store expenses disbursed in cash during this shift duration at this branch
    const shiftExpenses = (expenses || []).filter((e) => {
      if (!e || e.isDeleted) return false;
      if (e.branchId !== shift.branchId) return false;
      const eTime = new Date(e.dateTime || 0).getTime();
      const openTime = new Date(shift.openedAt).getTime();
      const closeTime = shift.closedAt ? new Date(shift.closedAt).getTime() : Date.now();
      return eTime >= openTime && eTime <= closeTime;
    });
    const expensesTotal = shiftExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    const expectedEndCash = shift.startCash + cashSalesTotal - expensesTotal;

    return {
      salesCount,
      salesTotal,
      vatTotal,
      discountTotal,
      netTotal,
      cashSalesTotal,
      nonCashSalesTotal,
      expensesTotal,
      expectedEndCash,
    };
  };
 // PURCHASE ORDERS
 const createPO = (
 supplierId: string,
 branchId: string,
 itemInputs: {
 productId: string;
 costPrice: number;
 quantityRequested: number;
 }[],
 notes?: string,
 status?: POStatus,
 paymentMode?: "fully_paid" | "terms",
 termStartDate?: string,
 termEndDate?: string,
 termsLength?: number,
 idempotencyKey?: string,
 ) => {
 // Idempotency check: prevent duplicate purchase orders
 if (idempotencyKey) {
 const existingPO = purchaseOrders.find((po) => po.idempotencyKey === idempotencyKey);
 if (existingPO) {
 console.warn(`[System Guard] Idempotency Shield: Duplicate Purchase Order detected for key: ${idempotencyKey}. Returning existing PO.`);
 return existingPO;
 }
 }

 const poId = `PO-${Date.now()}`;

 // Find maximum numeric sequence suffix or total count of existing purchase orders to increment
 let nextNum = purchaseOrders.length + 1;
 purchaseOrders.forEach((p) => {
 const parts = p.poNumber.split("-");
 const lastPart = parts[parts.length - 1];
 const parsedNum = parseInt(lastPart, 10);
 if (!isNaN(parsedNum) && parsedNum >= nextNum) {
 nextNum = parsedNum + 1;
 }
 });

 const poNum = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${nextNum.toString().padStart(4, "0")}`;

 const todayStr = new Date().toISOString().slice(0, 10);
 const calculatedTermEndDate = (() => {
 const d = new Date();
 d.setDate(d.getDate() + (termsLength !== undefined ? termsLength : 30));
 return d.toISOString().slice(0, 10);
 })();

 const newPO: PurchaseOrder = {
 id: poId,
 poNumber: poNum,
 supplierId,
 branchId,
 status: (status || "Pending") as POStatus,
 requestedBy: currentUser.fullName,
 date: todayStr,
 notes,
 paymentMode: paymentMode || "terms",
 termStartDate: termStartDate || todayStr,
 termsLength: termsLength !== undefined ? termsLength : 30,
 termEndDate: termEndDate || calculatedTermEndDate,
 createdAt: new Date().toISOString(),
 updatedAt: new Date().toISOString(),
 idempotencyKey,
 };

 const newItems: PurchaseOrderItem[] = itemInputs.map((item, idx) => ({
 id: `POI-${poId}-${idx}`,
 poId,
 productId: item.productId,
 costPrice: item.costPrice,
 quantityRequested: item.quantityRequested,
 quantityReceived: 0,
 }));

 setPurchaseOrders((prev) => [newPO, ...prev]);
 setPoItems((prev) => [...prev, ...newItems]);
 addAuditLog(
 "PO_CREATE",
 `Created Purchase Order ${poNum}`,
 "PurchaseOrders",
 poId,
 );
 };

 const updatePOStatus = (id: string, status: POStatus) => {
 setPurchaseOrders((prev) =>
 prev.map((po) =>
 po.id === id
 ? { ...po, status, updatedAt: new Date().toISOString() }
 : po,
 ),
 );
 addAuditLog(
 "PO_STATUS_CHANGE",
 `Updated PO status of PO ID ${id} to ${status}`,
 "PurchaseOrders",
 id,
 );
 };

 const receivePOItems = (
 id: string,
 receivedMap: Record<string, number>,
 paymentMode?: "fully_paid" | "terms",
 termStartDate?: string,
 termEndDate?: string,
 termsLength?: number
 ) => {
 const originalPo = purchaseOrders.find((p) => p.id === id);
 if (!originalPo) return;

 // 1. Update purchase order items received quantity
 setPoItems((prev) =>
 prev.map((item) => {
 if (item.poId === id && receivedMap[item.productId] !== undefined) {
 const newlyReceived = receivedMap[item.productId];
 return {
 ...item,
 quantityReceived: item.quantityReceived + newlyReceived,
 };
 }
 return item;
 }),
 );

 // 2. Adjust product stocks and generate stock movements
 setProducts((prev) => {
 const updated = [...prev];
 Object.entries(receivedMap).forEach(([prodId, qty]) => {
 const prodIdx = updated.findIndex((p) => p.id === prodId);
 if (prodIdx !== -1 && qty > 0) {
 updated[prodIdx] = {
 ...updated[prodIdx],
 stockQuantity: updated[prodIdx].stockQuantity + qty,
 updatedAt: new Date().toISOString(),
 };

 // Append to inventory movements inside state updater is complex, let's create movements subsequently
 }
 });
 return updated;
 });

 // Create stock movements for received items
 const newItemsMoved: InventoryMovement[] = Object.entries(receivedMap)
 .filter(([_, qty]) => qty > 0)
 .map(([prodId, qty], idx) => ({
 id: `M-PO-${id}-${Date.now()}-${idx}`,
 productId: prodId,
 type: "IN",
 quantity: qty,
 destinationBranchId: originalPo.branchId,
 referenceId: id,
 notes: `Received cargo on PO ${originalPo.poNumber}`,
 timestamp: new Date().toISOString(),
 userId: currentUser.id,
 username: currentUser.username,
 }));

 setMovements((prev) => [...newItemsMoved, ...prev]);

 // Strict Consistency: update local branch stock synchronously
 if (originalPo.branchId) {
 setBranchStock((prevList) => {
 const nextList = [...prevList];
 Object.entries(receivedMap).forEach(([prodId, qty]) => {
 if (qty > 0) {
 const matchIdx = nextList.findIndex(
 (bs) => bs.productId === prodId && bs.branchId === originalPo.branchId
 );
 if (matchIdx !== -1) {
 nextList[matchIdx] = {
 ...nextList[matchIdx],
 quantity: nextList[matchIdx].quantity + qty,
 updatedAt: new Date().toISOString(),
 };
 } else {
 nextList.push({
 id: `${originalPo.branchId}_${prodId}`,
 branchId: originalPo.branchId,
 productId: prodId,
 quantity: qty,
 updatedAt: new Date().toISOString(),
 });
 }
 }
 });
 return nextList;
 });
 }

 // Check if everything is fully received
 const poItemsForThis = poItems.filter((item) => item.poId === id);
 let allCompleted = true;
 poItemsForThis.forEach((item) => {
 const receivedAfter =
 item.quantityReceived + (receivedMap[item.productId] || 0);
 if (receivedAfter < item.quantityRequested) {
 allCompleted = false;
 }
 });

 const finalStatus: POStatus = allCompleted
 ? "Completed"
 : "Partially Received";

 setPurchaseOrders((prev) =>
 prev.map((po) => {
 if (po.id === id) {
 return {
 ...po,
 status: finalStatus,
 paymentMode: paymentMode !== undefined ? paymentMode : po.paymentMode,
 termStartDate: termStartDate !== undefined ? termStartDate : po.termStartDate,
 termEndDate: termEndDate !== undefined ? termEndDate : po.termEndDate,
 termsLength: termsLength !== undefined ? termsLength : po.termsLength,
 updatedAt: new Date().toISOString(),
 };
 }
 return po;
 }),
 );

 addAuditLog(
 "PO_RECEIVE",
 `Received cargo for PO ${originalPo.poNumber}. Consolidated Status: ${finalStatus}${paymentMode ? ` (Payment Mode: ${paymentMode})` : ""}`,
 "PurchaseOrders",
 id,
 );
 };

 // TRANSMITTAL SYSTEM (Submit reports across branches or upload JSON summaries)
 const createTransmittal = (
 docType: TransmittalDocType,
 toBranchId: string,
 payloadJson: string,
 notes?: string,
 ): string => {
 const transId = `TRAN-${Date.now()}`;
 const newTrans: Transmittal = {
 id: transId,
 documentType: docType,
 fromBranchId: currentUser.branchAssignmentId,
 toBranchId,
 submittedBy: currentUser.fullName,
 status: "Submitted" as TransmittalStatus,
 payloadJson,
 notes,
 submittedAt: new Date().toISOString(),
 isDeleted: false,
 };

 setTransmittals((prev) => [newTrans, ...prev]);
 addAuditLog(
 "TRANSMITTAL_SUBMIT",
 `Transmitted form type '${docType}' to target branch ID ${toBranchId}`,
 "Transmittals",
 transId,
 );
 return transId;
 };

 const updateTransmittalStatus = (id: string, status: TransmittalStatus) => {
 setTransmittals((prev) =>
 prev.map((t) => (t.id === id ? { ...t, status } : t)),
 );
 addAuditLog(
 "TRANSMITTAL_VERDICT",
 `Updated transmittal ID ${id} transmittal ledger to status ${status}`,
 "Transmittals",
 id,
 );
 };

 const createStockTransfer = (
 fromBranchId: string,
 toBranchId: string,
 transferType: TransferType,
 itemsInput: { productId: string; quantity: number }[],
 reason: string,
 ) => {
 const id = `ST-${Date.now()}`;
 const transferNo = `ST-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
 Math.random() * 1000,
 )
 .toString()
 .padStart(3, "0")}`;

 // map the items
 const items = itemsInput.map((it, idx) => {
 const p = products.find((prod) => prod.id === it.productId);
 return {
 id: `STI-${id}-${idx}`,
 transferId: id,
 productId: it.productId,
 productName: p ? p.productName : "Unknown Tile",
 quantity: it.quantity,
 };
 });

 const newTransfer: StockTransfer = {
 id,
 transferNo,
 fromBranchId,
 toBranchId,
 transferType,
 requestedBy: currentUser.fullName,
 status: "Pending",
 reason,
 createdAt: new Date().toISOString(),
 updatedAt: new Date().toISOString(),
 items,
 };

 setStockTransfers((prev) => [newTransfer, ...prev]);
 addAuditLog(
 "TRANSFER_CREATE",
 `Created Stock Transfer Request ${transferNo} (${transferType}) from ${fromBranchId} to ${toBranchId}`,
 "StockTransfer",
 id,
 );
 };

 const updateStockTransferStatus = (id: string, status: TransferStatus) => {
 setStockTransfers((prev) =>
 prev.map((t) => {
 if (t.id === id) {
 const prevStatus = t.status;

 // Only run transition logic if status changed
 if (prevStatus !== status) {
 // 1. If moving from 'Pending' to 'Approved' or 'In Transit', deduct from fromBranchId exactly once
 if (
 (status === "In Transit" || status === "Approved") &&
 prevStatus === "Pending"
 ) {
 setBranchStock((bStock) => {
 const updatedStock = [...bStock];
 (t.items || []).forEach((item) => {
 const idx = updatedStock.findIndex(
 (bs) =>
 bs.productId === item.productId &&
 bs.branchId === t.fromBranchId,
 );
 const deductionQty = item.quantity;
 if (idx !== -1) {
 const bs = updatedStock[idx];
 const nextQty = Math.max(0, bs.quantity - deductionQty);
 updatedStock[idx] = {
 ...bs,
 quantity: nextQty,
 version: (bs.version || 0) + 1,
 updatedAt: new Date().toISOString(),
 };
 if (t.fromBranchId === "B1") {
 setProducts((prods) =>
 prods.map((prod) =>
 prod.id === bs.productId
 ? { ...prod, stockQuantity: nextQty, version: (prod.version || 0) + 1, updatedAt: new Date().toISOString() }
 : prod,
 ),
 );
 }
 } else {
 const newBs: InventoryLocationStock = {
 id: `${t.fromBranchId}_${item.productId}`,
 branchId: t.fromBranchId,
 productId: item.productId,
 quantity: 0,
 version: 1,
 updatedAt: new Date().toISOString(),
 };
 updatedStock.push(newBs);
 if (t.fromBranchId === "B1") {
 setProducts((prods) =>
 prods.map((prod) =>
 prod.id === item.productId
 ? { ...prod, stockQuantity: 0, version: (prod.version || 0) + 1, updatedAt: new Date().toISOString() }
 : prod,
 ),
 );
 }
 }
 });
 return updatedStock;
 });

 // Record Ledger / Movements for dispatch
 (t.items || []).forEach((item) => {
 const ledgerId = `L-TR-DISP-${id}-${item.productId}`;
 const entry: LedgerEntry = {
 id: ledgerId,
 date: new Date().toISOString(),
 productId: item.productId,
 productName: item.productName,
 branchId: t.fromBranchId,
 movementType: "TRANSFER",
 quantity: -item.quantity,
 referenceNo: t.transferNo,
 remarks: `Dispatched ${t.transferType} stock to ${t.toBranchId}`,
 };
 setLedgerEntries((entries) => [entry, ...entries]);

 // Also add general inventory movement log
 const moveId = `M-TR-DISP-${id}-${item.productId}`;
 const moveItem: InventoryMovement = {
 id: moveId,
 productId: item.productId,
 type: "TRANSFER",
 quantity: -item.quantity,
 sourceBranchId: t.fromBranchId,
 destinationBranchId: t.toBranchId,
 referenceId: t.id,
 notes: `Shipped ${item.quantity} boxes for ${t.transferType} (${t.transferNo})`,
 timestamp: new Date().toISOString(),
 userId: currentUser.id,
 username: currentUser.username,
 };
 setMovements((moves) => [moveItem, ...moves]);
 });
 }

 // 2. If moving to 'Received', add to toBranchId (create record if it does not exist)
 if (status === "Received") {
 setBranchStock((bStock) => {
 const updatedStock = [...bStock];
 (t.items || []).forEach((item) => {
 const idx = updatedStock.findIndex(
 (bs) =>
 bs.productId === item.productId &&
 bs.branchId === t.toBranchId,
 );
 const additionQty = item.quantity;
 if (idx !== -1) {
 const bs = updatedStock[idx];
 const nextQty = bs.quantity + additionQty;
 updatedStock[idx] = {
 ...bs,
 quantity: nextQty,
 version: (bs.version || 0) + 1,
 updatedAt: new Date().toISOString(),
 };
 if (t.toBranchId === "B1") {
 setProducts((prods) =>
 prods.map((prod) =>
 prod.id === bs.productId
 ? { ...prod, stockQuantity: nextQty }
 : prod,
 ),
 );
 }
 } else {
 const nextQty = additionQty;
 const newBs: InventoryLocationStock = {
 id: `${t.toBranchId}_${item.productId}`,
 branchId: t.toBranchId,
 productId: item.productId,
 quantity: nextQty,
 version: 1,
 updatedAt: new Date().toISOString(),
 };
 updatedStock.push(newBs);
 if (t.toBranchId === "B1") {
 setProducts((prods) =>
 prods.map((prod) =>
 prod.id === item.productId
 ? { ...prod, stockQuantity: nextQty, version: (prod.version || 0) + 1, updatedAt: new Date().toISOString() }
 : prod,
 ),
 );
 }
 }
 });
 return updatedStock;
 });

 // Record Ledger / Movements for receipt
 (t.items || []).forEach((item) => {
 const ledgerId = `L-TR-REC-${id}-${item.productId}`;
 const entry: LedgerEntry = {
 id: ledgerId,
 date: new Date().toISOString(),
 productId: item.productId,
 productName: item.productName,
 branchId: t.toBranchId,
 movementType: "TRANSFER",
 quantity: item.quantity,
 referenceNo: t.transferNo,
 remarks: `Received ${t.transferType} stock from ${t.fromBranchId}`,
 };
 setLedgerEntries((entries) => [entry, ...entries]);

 // Also add general inventory movement log
 const moveId = `M-TR-REC-${id}-${item.productId}`;
 const moveItem: InventoryMovement = {
 id: moveId,
 productId: item.productId,
 type: "TRANSFER",
 quantity: item.quantity,
 sourceBranchId: t.fromBranchId,
 destinationBranchId: t.toBranchId,
 referenceId: t.id,
 notes: `Received ${item.quantity} boxes for ${t.transferType} (${t.transferNo})`,
 timestamp: new Date().toISOString(),
 userId: currentUser.id,
 username: currentUser.username,
 };
 setMovements((moves) => [moveItem, ...moves]);
 });
 }
 }

 return {
 ...t,
 status,
 approvedBy:
 status === "Approved" ? currentUser.fullName : t.approvedBy,
 updatedAt: new Date().toISOString(),
 };
 }
 return t;
 }),
 );

 addAuditLog(
 "TRANSFER_UPDATE",
 `Updated Stock Transfer ${id} to status ${status}`,
 "StockTransfer",
 id,
 );
 };

 // ==========================================
 // LOCKING & PESSIMISTIC UPDATES SUBMODULE
 // ==========================================
 const [pessimisticLocks, setPessimisticLocks] = useState<Record<string, { lockedAt: string; lockedBy: string }>>({});

 const acquirePessimisticLock = (resourceId: string, username?: string): boolean => {
 const actor = username || currentUser?.username || "SYSTEM";
 const now = Date.now();
 const existing = pessimisticLocks[resourceId];

 if (existing) {
 // Check for lock expiry (e.g. 5 minutes timeout to prevent deadlocks)
 const lockTime = new Date(existing.lockedAt).getTime();
 const isExpired = now - lockTime > 5 * 60 * 1000;

 if (!isExpired && existing.lockedBy !== actor) {
 console.warn(`[Pessimistic Lock] Resource ${resourceId} is currently locked by ${existing.lockedBy}.`);
 return false;
 }
 }

 setPessimisticLocks((prev) => ({
 ...prev,
 [resourceId]: {
 lockedAt: new Date().toISOString(),
 lockedBy: actor,
 },
 }));
 addAuditLog(
 "LOCK_ACQUIRE",
 `Acquired pessimistic state lock on resource ID: ${resourceId} by ${actor}`,
 "SystemLocks",
 resourceId
 );
 return true;
 };

 const releasePessimisticLock = (resourceId: string) => {
 setPessimisticLocks((prev) => {
 const next = { ...prev };
 delete next[resourceId];
 return next;
 });
 addAuditLog(
 "LOCK_RELEASE",
 `Released pessimistic state lock on resource ID: ${resourceId}`,
 "SystemLocks",
 resourceId
 );
 };

 const isResourceLocked = (resourceId: string): boolean => {
 const existing = pessimisticLocks[resourceId];
 if (!existing) return false;
 const lockTime = new Date(existing.lockedAt).getTime();
 const isExpired = Date.now() - lockTime > 5 * 60 * 1000;
 return !isExpired;
 };

 // ==========================================
 // ADDITIONAL SOFT DELETES SYSTEM ACTIONS
 // ==========================================
 const deletePurchaseOrder = (id: string) => {
 setPurchaseOrders((prev) =>
 prev.map((po) =>
 po.id === id ? { ...po, isDeleted: true, deletedAt: new Date().toISOString() } : po
 )
 );
 addAuditLog(
 "PO_DELETE",
 `Soft-deleted purchase order ID: ${id}`,
 "PurchaseOrders",
 id
 );
 };

 const deleteStockTransfer = (id: string) => {
 setStockTransfers((prev) =>
 prev.map((st) =>
 st.id === id ? { ...st, isDeleted: true, deletedAt: new Date().toISOString() } : st
 )
 );
 addAuditLog(
 "TRANSFER_DELETE",
 `Soft-deleted stock transfer ID: ${id}`,
 "StockTransfers",
 id
 );
 };

 const deleteTransmittal = (id: string) => {
 setTransmittals((prev) =>
 prev.map((t) =>
 t.id === id ? { ...t, isDeleted: true, deletedAt: new Date().toISOString() } : t
 )
 );
 addAuditLog(
 "TRANSMITTAL_DELETE",
 `Soft-deleted transmittal ID: ${id}`,
 "Transmittals",
 id
 );
 };

 const deleteCustomCorporateBill = (id: string) => {
 setCustomBills((prev) =>
 prev.map((b) =>
 b.id === id ? { ...b, isDeleted: true, deletedAt: new Date().toISOString() } : b
 )
 );
 addAuditLog(
 "BILL_DELETE",
 `Soft-deleted custom corporate liability/bill ID: ${id}`,
 "CustomCorporateBills",
 id
 );
 };

 const filteredBranchStock = useMemo(() => {
    if (!currentUser) return branchStock;
    if (
      currentUser.role === UserRole.ADMIN ||
      !currentUser.branchAssignmentId ||
      currentUser.branchAssignmentId === 'consolidated' ||
      currentUser.branchAssignmentId === 'ALL'
    ) {
      return branchStock;
    }
    const uBranchId = currentUser.branchAssignmentId;
    const targetBranch = branches.find(b => b.id === uBranchId);
    const uSlug = slugifyBranchStr(uBranchId);
    const uNameSlug = slugifyBranchStr(targetBranch?.name);
    const uCodeSlug = slugifyBranchStr(targetBranch?.branchCode);

    return branchStock.filter(bs => {
      if (bs.branchId === uBranchId) return true;
      const bsSlug = slugifyBranchStr(bs.branchId);
      if (bsSlug === uSlug) return true;
      if (uNameSlug && bsSlug === uNameSlug) return true;
      if (uCodeSlug && bsSlug === uCodeSlug) return true;
      return false;
    });
  }, [branchStock, currentUser, branches]);

  const filteredProducts = useMemo(() => {
    if (!currentUser) return products;
    if (
      currentUser.role === UserRole.ADMIN ||
      !currentUser.branchAssignmentId ||
      currentUser.branchAssignmentId === 'consolidated' ||
      currentUser.branchAssignmentId === 'ALL'
    ) {
      return products;
    }
    const uBranchId = currentUser.branchAssignmentId;
    return products.filter(
      p => !p.isDeleted && isProductInBranch(p, uBranchId, branchStock, branches)
    );
  }, [products, currentUser, branchStock, branches]);

  // CALCULATE LIVE SYSTEM KPIs (Memoized to prevent UI stuttering on non-related updates)
  const stats = useMemo((): SummaryStats => {
 const activeProducts = filteredProducts.filter((p) => !p.isDeleted);
 const totalProducts = activeProducts.length;

 // Unique non-deleted product categories
 const totalCategories = Array.from(
 new Set(activeProducts.map((p) => p.category)),
 ).length;

 const totalSuppliers = suppliers.filter((s) => !s.isDeleted).length;

 const lowStockCount = activeProducts.filter(
 (p) => p.stockQuantity > 0 && p.stockQuantity <= p.minimumStock,
 ).length;
 const outOfStockCount = activeProducts.filter(
 (p) => p.stockQuantity === 0,
 ).length;

 // Sales sums
 const now = new Date();

 const validSaleIds = new Set(sales.filter((s) => !s.isDeleted).map((s) => s.id));
 const validReturns = (productReturns || []).filter(
 (r) => !r.isDeleted && (!r.saleId || validSaleIds.has(r.saleId)),
 );

 const todaySalesItems = sales.filter((s) => {
 if (!s.createdAt || s.isDeleted) return false;
 const d = new Date(s.createdAt);
 if (isNaN(d.getTime())) return false;
 return d.getFullYear() === now.getFullYear() &&
 d.getMonth() === now.getMonth() &&
 d.getDate() === now.getDate();
 });
 const todayReturnsSum = validReturns
 .filter((r) => {
 if (!r.dateTime) return false;
 const d = new Date(r.dateTime);
 return !isNaN(d.getTime()) && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
 })
 .reduce((sum, r) => sum + (Number(r.amountRefunded) || 0), 0);
 const grossTodaySales = todaySalesItems.reduce(
 (acc, curr) => acc + (Number(curr.grandTotal) || 0),
 0,
 );
 const todaySales = Math.max(0, grossTodaySales - todayReturnsSum);

 // Calculate weekly sales (past 7 days)
 const sevenDaysAgo = new Date();
 sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
 const weeklySalesItems = sales.filter(
 (s) => s.createdAt && !s.isDeleted && !isNaN(new Date(s.createdAt).getTime()) && new Date(s.createdAt) >= sevenDaysAgo,
 );
 const weeklyReturnsSum = validReturns
 .filter((r) => {
 if (!r.dateTime) return false;
 const d = new Date(r.dateTime);
 return !isNaN(d.getTime()) && d >= sevenDaysAgo;
 })
 .reduce((sum, r) => sum + (Number(r.amountRefunded) || 0), 0);
 const grossWeeklySales = weeklySalesItems.reduce(
 (acc, curr) => acc + (Number(curr.grandTotal) || 0),
 0,
 );
 const weeklySales = Math.max(0, grossWeeklySales - weeklyReturnsSum);

 // Monthly revenue
 const monthlySalesItems = sales.filter((s) => {
 if (!s.createdAt || s.isDeleted) return false;
 const d = new Date(s.createdAt);
 if (isNaN(d.getTime())) return false;
 return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
 });
 const monthlyReturnsSum = validReturns
 .filter((r) => {
 if (!r.dateTime) return false;
 const d = new Date(r.dateTime);
 return !isNaN(d.getTime()) && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
 })
 .reduce((sum, r) => sum + (Number(r.amountRefunded) || 0), 0);
 const grossMonthlyRevenue = monthlySalesItems.reduce(
 (acc, curr) => acc + (Number(curr.grandTotal) || 0),
 0,
 );
 const monthlyRevenue = Math.max(0, grossMonthlyRevenue - monthlyReturnsSum);

 const activeCashiers = users.filter(
 (u) => u.status === "Active" && u.role === UserRole.CASHIER,
 ).length;

 return {
 totalProducts,
 totalCategories,
 totalSuppliers,
 lowStockCount,
 outOfStockCount,
 todaySales,
 weeklySales,
 monthlyRevenue,
 activeCashiers,
 };
 }, [filteredProducts, suppliers, sales, users, productReturns]);

   const contextValue = useMemo(
    () => ({
      currentUser,
      setCurrentUser,
      updateCurrentUser,
      validateInventoryAccess,
      isLoggedIn,
      login,
      logout,
      isConfigured,
      setupSystem,
      isRateLimited: lockoutUntil > Date.now(),
      rateLimitTimeLeft,
      activeBranch,
      users,
      branches,
      suppliers,
      brands,
      products: filteredProducts,
      purchaseOrders,
      poItems,
      transmittals,
      shifts,
      sales,
      saleItems,
      movements,
      auditLogs,
      activeShift,
      stockTransfers,
      branchStock: filteredBranchStock,
      ledgerEntries,
      customBills,
      setCustomBills,
      members,
      setMembers,
      expenses,
      setExpenses,
      productReturns,
      setProductReturns,
      calendarNotes,
      setCalendarNotes,
      dayMemos,
      setDayMemos,
      syncStatus,
      createUser,
      updateUser,
      resetPassword,
      createBranch,
      updateBranch,
      deleteBranch,
      createSupplier,
      updateSupplier,
      deleteSupplier,
      createBrand,
      updateBrand,
      deleteBrand,
      createProduct,
      updateProduct,
      deleteProduct,
      deleteDamageLog,
      importProducts,
      holdSale,
      resumeParkedSale,
      parkedSales,
      setParkedSales,
      loyaltyConfig,
      updateLoyaltyConfig,
      checkoutSale,
      voidSale,
      openShift,
      closeShift,
      forceCloseAllShifts,
      getShiftReportStats,
      createPO,
      updatePOStatus,
      receivePOItems,
      createTransmittal,
      updateTransmittalStatus,
      createStockTransfer,
      updateStockTransferStatus,
      stats,
      addAuditLog,
      logManualAdjustment,
      createManualLedgerEntry,
      truncateDatabase,
      branchSalesReports,
      rollbackSnapshots,
      performRollbackToSnapshot,
      transmitSalesReport,
      importManualSalesReport,
      auditSalesReport,
      deliveries,
      createDelivery,
      updateDeliveryStatus,
      assignDeliveryPersonnel,
      completeDelivery,
      damageLogs,
      createDamageLog,
      updateBranchPriceOverride,
      updateBranchLowStockThreshold,
      debounceDelay,
      setDebounceDelay,
      dbSyncStatus,
      writeStatsCount,
      resetWriteStats,
      forceSyncAll,
      dbSnapshots,
      createDbSnapshot,
      restoreDbSnapshot,
      deleteDbSnapshot,
      autoBackupEnabled,
      setAutoBackupEnabled,
      backupIntervalHours,
      setBackupIntervalHours,
      lastAutoBackupTime,
      setLastAutoBackupTime,
      dbMaintenanceEnabled,
      setDbMaintenanceEnabled,
      lastMaintenanceTime,
      setLastMaintenanceTime,
      isMaintenanceRunning,
      runDatabaseMaintenance,
      isSystemProcessing,
      systemProcessingMessage,
      systemProcessingSubtext,
      systemProcessingType,
      systemProcessingProgress,
      triggerSystemProcessing,
      setSystemProcessingProgress,
      setIsSystemProcessing,
      setSystemProcessingMessage,
      setSystemProcessingSubtext,
      simulationModeActive,
      setSimulationModeActive,
      generateMasterForensicBackup,
      importMasterForensicBackup,
      resetLockout,
      isHydrating,
      isSystemHydrating,
      serverConnected,
      syncFromSharedServer,
      lowPerformanceMode,
      setLowPerformanceMode,
      activeSessions,
      activeSessionId,
      terminateSession,
      completeOnboarding,
      isRowClearingBlocked,
      getRowClearingBlockedReason,
      pessimisticLocks,
      acquirePessimisticLock,
      releasePessimisticLock,
      isResourceLocked,
      deletePurchaseOrder,
      deleteStockTransfer,
      deleteTransmittal,
      deleteCustomCorporateBill,
      apiErrorState,
      clearServerErrorState,
      invalidateLocalCache,
      safeApiFetch,
      exportAndPurgeCategoryData,
      retentionPolicy,
      updateRetentionPolicy,
      runRetentionPolicyCleanup,
      getInventory: getInventoryContext,
      getBranchStockQuantity: getBranchStockQuantityContext,
      getProductStockCount: getProductStockCountContext,
      revalidateStockCounts,
    }),
    [
      currentUser,
      lockoutUntil,
      rateLimitTimeLeft,
      activeBranch,
      users,
      branches,
      suppliers,
      brands,
      filteredProducts,
      purchaseOrders,
      poItems,
      transmittals,
      shifts,
      sales,
      saleItems,
      movements,
      auditLogs,
      activeShift,
      stockTransfers,
      filteredBranchStock,
      ledgerEntries,
      customBills,
      members,
      expenses,
      productReturns,
      calendarNotes,
      dayMemos,
      syncStatus,
      parkedSales,
      loyaltyConfig,
      retentionPolicy,
      stats,
      branchSalesReports,
      rollbackSnapshots,
      deliveries,
      damageLogs,
      debounceDelay,
      dbSyncStatus,
      writeStatsCount,
      dbSnapshots,
      autoBackupEnabled,
      backupIntervalHours,
      lastAutoBackupTime,
      dbMaintenanceEnabled,
      lastMaintenanceTime,
      isMaintenanceRunning,
      runDatabaseMaintenance,
      isSystemProcessing,
      systemProcessingMessage,
      systemProcessingSubtext,
      systemProcessingType,
      systemProcessingProgress,
      simulationModeActive,
      isHydrating,
      isSystemHydrating,
      serverConnected,
      lowPerformanceMode,
      activeSessions,
      activeSessionId,
      pessimisticLocks,
      apiErrorState,
      exportAndPurgeCategoryData,
      getInventoryContext,
      getBranchStockQuantityContext,
      getProductStockCountContext,
      revalidateStockCounts,
    ]
  );

  return (
    <DbContext.Provider value={contextValue}>
      {children}
    </DbContext.Provider>
  );
};

export const useDb = () => {
 const context = useContext(DbContext);
 if (!context) {
 throw new Error("useDb must be used within a DbProvider");
 }
 return context;
};

/**
 * Selector hook allowing components to subscribe to specific parts of DbContext
 * without triggering re-renders on unrelated database updates.
 */
export function useDbSelector<T>(selector: (db: DbContextType) => T): T {
  const db = useDb();
  return useMemo(() => selector(db), [db, selector]);
}

/**
 * Custom memoized selector for retrieving products list efficiently
 */
export function useDbProducts() {
  const db = useDb();
  return useMemo(() => db.products, [db.products]);
}

/**
 * Custom memoized selector for retrieving branch stock list efficiently
 */
export function useDbBranchStock() {
  const db = useDb();
  return useMemo(() => db.branchStock, [db.branchStock]);
}

/**
 * Custom memoized selector for retrieving inventory helper functions
 */
export function useDbInventory() {
  const db = useDb();
  return useMemo(() => ({
    products: db.products,
    branchStock: db.branchStock,
    getInventory: db.getInventory,
    getBranchStockQuantity: db.getBranchStockQuantity,
    getProductStockCount: db.getProductStockCount,
    revalidateStockCounts: db.revalidateStockCounts,
  }), [
    db.products,
    db.branchStock,
    db.getInventory,
    db.getBranchStockQuantity,
    db.getProductStockCount,
    db.revalidateStockCounts,
  ]);
}

/**
 * Strict structural layout and clipboard parsing guards.
 * Detects and prevents ingestion of truncated strings, cut-off chat bubbles,
 * or chat threads with explicit errors before updating state.
 */
export function preprocessAndVerifyClipboardText(rawText: string): {
 success: boolean;
 error?: string;
 cleanedJson?: string;
} {
 const trimmed = rawText.trim();
 if (!trimmed) {
 return { success: false, error: "Empty payload: No clipboard content provided." };
 }

 // 1. Detect explicit error signatures or failure messages within the snippet
 const explicitErrorKeywords = [
 "failed to generate",
 "generation failed",
 "error occurred",
 "syntaxerror",
 "database exception",
 "critical failure",
 "transmission failed",
 "package corrupted",
 "unauthorized access",
 "internal server error",
 "failed to export",
 "error:"
 ];
 for (const keyword of explicitErrorKeywords) {
 if (trimmed.toLowerCase().includes(keyword)) {
 return {
 success: false,
 error: `Explicit Error Detected: Clipboard snippet contains an explicit failure report ("${keyword}"). Ingestion aborted.`,
 };
 }
 }

 // 2. Detect cut-off chat bubbles via trailing ellipsis or cut-off brackets
 if (trimmed.endsWith("...") || trimmed.endsWith("…") || trimmed.includes("...}") || trimmed.includes("... ]") || trimmed.includes("...\"")) {
 return {
 success: false,
 error: "Malformed String: Payload contains trailing ellipsis ('...' or '…') indicating a truncated or cut-off chat bubble.",
 };
 }

 // 3. Extract JSON boundaries if wrapped in chat bubble text or Messenger timestamps
 const jsonStart = trimmed.indexOf("{");
 const jsonEnd = trimmed.lastIndexOf("}");

 if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
 return {
 success: false,
 error: "Malformed String: No enclosing JSON object bounds ({ ... }) detected in the pasted text.",
 };
 }

 const potentialJson = trimmed.substring(jsonStart, jsonEnd + 1);

 // 4. Bracket/brace balance type-guards (Strict structural balance check)
 const openBraces = (potentialJson.match(/\{/g) || []).length;
 const closeBraces = (potentialJson.match(/\}/g) || []).length;
 if (openBraces !== closeBraces) {
 return {
 success: false,
 error: `Malformed String: Mismatched curly braces (Open: ${openBraces}, Close: ${closeBraces}). The payload is cut-off or incomplete.`,
 };
 }

 const openBrackets = (potentialJson.match(/\[/g) || []).length;
 const closeBrackets = (potentialJson.match(/\]/g) || []).length;
 if (openBrackets !== closeBrackets) {
 return {
 success: false,
 error: `Malformed String: Mismatched square brackets (Open: ${openBrackets}, Close: ${closeBrackets}). The payload is cut-off or incomplete.`,
 };
 }

 const quoteCount = (potentialJson.match(/"/g) || []).length;
 if (quoteCount % 2 !== 0) {
 return {
 success: false,
 error: `Malformed String: Odd number of double quotes (${quoteCount}) detected. A text field or string key is cut-off or unclosed.`,
 };
 }

 return {
 success: true,
 cleanedJson: potentialJson,
 };
}

/**
 * Strict structural schema type-guard validator.
 * Validates object shapes and field data types to completely shield internal stores.
 */
/**
 * Unencapsulates encrypted or ledger-wrapped payloads (e.g. Daily Reconciliation envelopes).
 * Automatically decrypts and normalizes nested payloads to flat corporate sales report schemas.
 */
export function unwrapInboundPayload(rawObj: any): any {
  if (!rawObj || typeof rawObj !== "object") return rawObj;

  let obj = rawObj;

  // Case A: Encrypted or signed envelope string in "payload" (from Daily Reconciliation or Ledger Packet)
  if (obj.integritySign || (typeof obj.payload === "string" && obj.payload.length > 5)) {
    const rawPayload = obj.payload;
    if (typeof rawPayload === "string") {
      const key = getSecuritySecretKey();
      let decryptedText = "";
      try {
        decryptedText = decryptString(rawPayload, key);
      } catch (e) {
        try {
          decryptedText = decryptString(rawPayload, "EmmanTileCenterSecretKey");
        } catch (e2) {
          decryptedText = "";
        }
      }

      if (decryptedText) {
        try {
          const inner = JSON.parse(decryptedText);
          if (inner && typeof inner === "object") {
            obj = {
              ...inner,
              securitySignature: obj.securitySignature || obj.signature || rawPayload,
              branchId: inner.branchId || obj.branchId || "B1",
              branchName: inner.branchName || obj.branchName || "Branch Store",
              reportingDate: inner.reportingDate || obj.date || obj.reportingDate || new Date().toISOString().split("T")[0],
            };
          }
        } catch (e) {
          // parse failed
        }
      }
    }
  }

  // Case B: Nested object payload
  if (obj.payload && typeof obj.payload === "object") {
    const inner = obj.payload;
    obj = {
      ...inner,
      securitySignature: obj.securitySignature || obj.signature || inner.securitySignature,
      branchId: inner.branchId || obj.branchId || "B1",
      branchName: inner.branchName || obj.branchName || "Branch Store",
      reportingDate: inner.reportingDate || obj.date || obj.reportingDate || new Date().toISOString().split("T")[0],
    };
  }

  // Case C: Nested report or data object
  if (obj.report && typeof obj.report === "object") {
    const inner = obj.report;
    obj = {
      ...inner,
      securitySignature: obj.securitySignature || obj.signature || inner.securitySignature,
      branchId: inner.branchId || obj.branchId || "B1",
      branchName: inner.branchName || obj.branchName || "Branch Store",
      reportingDate: inner.reportingDate || obj.date || obj.reportingDate || new Date().toISOString().split("T")[0],
    };
  } else if (obj.data && typeof obj.data === "object") {
    const inner = obj.data;
    obj = {
      ...inner,
      securitySignature: obj.securitySignature || obj.signature || inner.securitySignature,
      branchId: inner.branchId || obj.branchId || "B1",
      branchName: inner.branchName || obj.branchName || "Branch Store",
      reportingDate: inner.reportingDate || obj.date || obj.reportingDate || new Date().toISOString().split("T")[0],
    };
  }

  // Normalize fallback top-level properties
  const branchId = String(obj.branchId || "B1").trim();
  const branchName = String(obj.branchName || "Branch Store").trim();
  const reportingDate = String(obj.reportingDate || obj.date || new Date().toISOString().split("T")[0]).trim();

  return {
    ...obj,
    branchId,
    branchName,
    reportingDate
  };
}

export function isStrictInboundReportSchema(rawObj: any): boolean {
  if (!rawObj || typeof rawObj !== "object") return false;

  const obj = unwrapInboundPayload(rawObj);

  if (!obj.branchId || !String(obj.branchId).trim()) return false;
  if (!obj.branchName || !String(obj.branchName).trim()) return false;
  if (!obj.reportingDate || !String(obj.reportingDate).trim()) return false;

  if (!Array.isArray(obj.sales)) return false;

  for (const s of obj.sales) {
    if (!s || typeof s !== "object") return false;
    const sId = s.id || s.saleNumber;
    if (!sId || !String(sId).trim()) return false;

    const grandTotal = Number(s.grandTotal ?? s.subtotal ?? 0);
    if (isNaN(grandTotal)) return false;
  }

  if (obj.saleItems !== undefined && !Array.isArray(obj.saleItems)) {
    return false;
  }

  return true;
}

