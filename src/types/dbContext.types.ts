/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  ActiveSession,
  ArchivableCategory,
  AuditLog,
  Branch,
  BranchSalesReport,
  Brand,
  CustomCorporateBill,
  CustomPaymentMethod,
  DamageLog,
  DamageReasonOption,
  Delivery,
  DeliveryStatus,
  DiscountScheme,
  Expense,
  InventoryLocationStock,
  InventoryMovement,
  LedgerEntry,
  LoyaltyConfig,
  Member,
  POStatus,
  Product,
  ProductCategory,
  ProductReturn,
  PurchaseOrder,
  PurchaseOrderItem,
  PurgeResult,
  RetentionPolicyMap,
  Sale,
  SaleItem,
  Shift,
  StockTransfer,
  Supplier,
  TransferStatus,
  TransferType,
  Transmittal,
  TransmittalDocType,
  TransmittalStatus,
  UnitType,
  User,
} from "./db";
import {
  OutboxRecord,
  OutboxStats,
  EnqueueOutboxOptions,
} from "../services/transactionOutboxService";

export interface BranchStockStats {
  totalItems: number;
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  criticalCount: number;
  outOfStockCount: number;
  lowStockProducts: Product[];
  criticalProducts: Product[];
  outOfStockProducts: Product[];
}

export interface SummaryStats {
  totalProducts: number;
  totalCategories: number;
  totalSuppliers: number;
  lowStockCount: number;
  criticalCount: number;
  outOfStockCount: number;
  totalItems: number;
  totalValue: number;
  todaySales: number;
  weeklySales: number;
  monthlyRevenue: number;
  activeCashiers: number;
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

export interface DbContextType {
  // Authentication & Session
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  updateCurrentUser: (updates: Partial<User>) => void;
  validateInventoryAccess: (item: any) => boolean;
  logBranchAccessScope: (
    operation: string,
    entityName: string,
    targetBranchId?: string | null,
    recordId?: string | null,
    additionalDetails?: any
  ) => {
    userRole: string;
    userBranch: string;
    targetBranch: string;
    isAllowed: boolean;
    scope: string;
    message: string;
  };
  isLoggedIn: boolean;
  login: (
    username: string,
    password: string
  ) => Promise<{ success: boolean; error?: string; sqliBlocked?: boolean }>;
  logout: () => void;
  isConfigured: boolean;
  setIsConfigured: React.Dispatch<React.SetStateAction<boolean>>;
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
    }
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
  setShifts: React.Dispatch<React.SetStateAction<Shift[]>>;
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
  syncStatus: Record<string, any> & { sseConnected?: boolean };
  calendarNotes: string;
  setCalendarNotes: React.Dispatch<React.SetStateAction<string>>;
  dayMemos: Record<string, string>;
  setDayMemos: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  loyaltyConfig: LoyaltyConfig;
  updateLoyaltyConfig: (updates: Partial<LoyaltyConfig>) => void;
  selectedViewBranchId: string;
  setSelectedViewBranchId: (id: string) => void;

  // Dynamic Entity Configuration Matrices
  productCategories: ProductCategory[];
  setProductCategories: React.Dispatch<React.SetStateAction<ProductCategory[]>>;
  createProductCategory: (category: Omit<ProductCategory, "id" | "createdAt" | "updatedAt"> & Partial<ProductCategory>) => ProductCategory | void;
  updateProductCategory: (id: string, updates: Partial<ProductCategory>) => void;
  deleteProductCategory: (id: string) => void;
  unitTypes: UnitType[];
  setUnitTypes: React.Dispatch<React.SetStateAction<UnitType[]>>;
  createUnitType: (unit: Omit<UnitType, "id" | "createdAt" | "updatedAt"> & Partial<UnitType>) => UnitType | void;
  updateUnitType: (id: string, updates: Partial<UnitType>) => void;
  deleteUnitType: (id: string) => void;
  paymentMethodsList: CustomPaymentMethod[];
  setPaymentMethodsList: React.Dispatch<
    React.SetStateAction<CustomPaymentMethod[]>
  >;
  createPaymentMethod: (method: Omit<CustomPaymentMethod, "id" | "createdAt" | "updatedAt"> & Partial<CustomPaymentMethod>) => CustomPaymentMethod | void;
  updatePaymentMethod: (
    id: string,
    updates: Partial<CustomPaymentMethod>
  ) => void;
  deletePaymentMethod: (id: string) => void;
  togglePaymentMethod: (id: string, enabled?: boolean) => void;
  discountSchemes: DiscountScheme[];
  setDiscountSchemes: React.Dispatch<React.SetStateAction<DiscountScheme[]>>;
  createDiscountScheme: (scheme: Omit<DiscountScheme, "id" | "createdAt" | "updatedAt"> & Partial<DiscountScheme>) => DiscountScheme | void;
  updateDiscountScheme: (id: string, updates: Partial<DiscountScheme>) => void;
  deleteDiscountScheme: (id: string) => void;
  toggleDiscountScheme: (id: string, enabled?: boolean) => void;
  damageReasonsList: DamageReasonOption[];
  setDamageReasonsList: React.Dispatch<
    React.SetStateAction<DamageReasonOption[]>
  >;
  createDamageReason: (reason: Omit<DamageReasonOption, "id" | "createdAt" | "updatedAt"> & Partial<DamageReasonOption>) => DamageReasonOption | void;
  updateDamageReason: (
    id: string,
    updates: Partial<DamageReasonOption>
  ) => void;
  deleteDamageReason: (id: string) => void;
  toggleDamageReason: (id: string, enabled?: boolean) => void;

  // Actions - Users
  createUser: (user: Omit<User, "id" | "createdAt" | "updatedAt"> & Partial<User>) => Promise<void> | void;
  updateUser: (id: string, updates: Partial<User>) => void;
  resetPassword: (id: string, newPasswordHash?: string) => void;

  // Actions - Branches
  createBranch: (branch: Omit<Branch, "id" | "createdAt" | "updatedAt" | "isDeleted"> & Partial<Branch>) => void;
  updateBranch: (id: string, updates: Partial<Branch>) => void;
  deleteBranch: (id: string) => void;

  // Actions - Suppliers
  createSupplier: (supplier: Omit<Supplier, "id" | "createdAt" | "isDeleted"> & Partial<Supplier>) => Supplier;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  // Actions - Brands
  createBrand: (brand: Omit<Brand, "id" | "createdAt" | "isDeleted"> & Partial<Brand>) => Brand;
  updateBrand: (id: string, updates: Partial<Brand>) => void;
  deleteBrand: (id: string) => void;

  // Actions - Products
  createProduct: (product: Omit<Product, "id" | "createdAt" | "updatedAt" | "isDeleted" | "qrCode" | "createdBy" | "updatedBy"> & Partial<Product>) => Product;
  updateProduct: (id: string, updates: Partial<Product>, customLogReason?: string) => void;
  deleteProduct: (id: string) => void;
  deleteDamageLog: (id: string) => void;
  bulkDeleteProducts: (productIds: string[]) => void;
  restoreProduct: (id: string) => void;
  deleteUser: (id: string) => void;
  restoreUser: (id: string) => void;
  restoreBranch: (id: string) => void;
  restoreSupplier: (id: string) => void;
  restoreBrand: (id: string) => void;
  restoreSale: (id: string) => void;
  restorePurchaseOrder: (id: string) => void;
  restoreTransmittal: (id: string) => void;
  restoreExpense: (id: string) => void;
  restoreDamageLog: (id: string) => void;
  purgeArchivedItem: (
    type: string,
    id: string
  ) => void;
  bulkRestoreItems: (
    items: { type: string; id: string }[] | any
  ) => void;
  importProducts: (newProducts: Product[] | any[], branchMapping?: Record<string, string> | any) => any;

  // Actions - Sales & Transactions
  holdSale: (
    cartItems: { product: Product; quantity: number }[],
    customerName: string,
    notes: string,
    targetBranchId?: string
  ) => string;
  resumeParkedSale: (parkedSaleId: string, cashierName?: string) => { success: boolean; record?: any; error?: string };
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
    customerAddress?: string,
    customerTin?: string,
    businessStyle?: string
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
    idempotencyKey?: string
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
    notes?: string
  ) => string;
  updateTransmittalStatus: (id: string, status: TransmittalStatus) => void;

  // Actions - Stock Transfers & Distribution
  createStockTransfer: (
    fromBranchId: string,
    toBranchId: string,
    transferType: TransferType,
    items: { productId: string; quantity: number }[],
    reason: string
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
  getBranchStockStats: (selectedBranchId?: string) => BranchStockStats;
  filterBranchStockByBranch: (selectedBranchId?: string) => InventoryLocationStock[];
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
    changePayload?: string
  ) => void;
  logManualAdjustment: (
    productId: string,
    quantity: number,
    notes: string
  ) => void;
  createManualLedgerEntry: (entry: {
    productId: string;
    branchId: string;
    movementType: "IN" | "OUT" | "ADJUST" | "TRANSFER" | "PURCHASE" | "SALE";
    quantity: number;
    referenceNo: string;
    remarks: string;
  }) => void;
  truncateDatabase: (
    mode: "all" | "transactions",
    confirmationPhrase?: string
  ) => Promise<void> | void;

  // Actions - Branch Sales Reports Transmission
  branchSalesReports: BranchSalesReport[];
  rollbackSnapshots: IngestionSnapshot[];
  performRollbackToSnapshot: (snapshotId: string) => {
    success: boolean;
    error?: string;
  };
  transmitSalesReport: (
    report: Omit<BranchSalesReport, "id" | "transferredAt" | "status">
  ) => void;
  importManualSalesReport: (rawJson: string) => {
    success: boolean;
    error?: string;
  };
  auditSalesReport: (
    reportId: string,
    status: "Verified" | "Pending Audit",
    notes?: string
  ) => void;

  // Actions - Deliveries Submodule
  deliveries: Delivery[];
  createDelivery: (
    delivery: Omit<
      Delivery,
      "id" | "status" | "createdAt" | "updatedAt" | "branchId" | "branchName"
    >
  ) => Delivery;
  updateDeliveryStatus: (
    id: string,
    status: DeliveryStatus,
    notes?: string
  ) => void;
  assignDeliveryPersonnel: (
    id: string,
    truck: string,
    driver: string,
    helper: string
  ) => void;
  completeDelivery: (
    id: string,
    proofPhotoUrl?: string,
    customerSignature?: string,
    receiverName?: string
  ) => void;

  // Actions - Broken & Broken-on-Arrival (BOA) Damage Register
  damageLogs: DamageLog[];
  createDamageLog: (
    log: Omit<DamageLog, "id" | "reportedAt" | "reportedBy">
  ) => void;

  updateBranchPriceOverride: (
    productId: string,
    branchId: string,
    price: number
  ) => void;
  updateBranchLowStockThreshold: (
    productId: string,
    branchId: string,
    threshold: number
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
  runDatabaseMaintenance: () => Promise<{
    success: boolean;
    stats: {
      bytesFreed: number;
      itemsIndexed: number;
      indicesOptimized: number;
    };
  }>;

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
    subtext?: string
  ) => Promise<void>;
  setSystemProcessingProgress: (progress: number) => void;
  setIsSystemProcessing: (val: boolean) => void;
  setSystemProcessingMessage: (msg: string) => void;
  setSystemProcessingSubtext: (sub: string) => void;
  simulationModeActive: boolean;
  setSimulationModeActive: (val: boolean) => void;
  generateMasterForensicBackup: () => any;
  importMasterForensicBackup: (payload?: any) => any;
  resetLockout: () => void;
  isHydrating: boolean;
  isSystemHydrating: boolean;
  serverConnected: boolean;
  syncFromSharedServer: (silent?: boolean) => Promise<void>;
  lastSyncTime: string | null;
  setLastSyncTime: (val: string | null) => void;
  lowPerformanceMode: boolean;
  setLowPerformanceMode: (val: boolean) => void;
  activeSessions: ActiveSession[];
  activeSessionId: string | null;
  terminateSession: (sessionId: string) => void;
  sessionRemainingSeconds: number;
  sessionExpiresAt: string | null;
  extendSession: (additionalMinutes?: number) => Promise<boolean>;
  sessionSupersededNotice: string | null;
  clearSessionNotice: () => void;
  completeOnboarding: (
    newProducts?: Product[],
    newBranchesList?: Branch[]
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
  getAuthHeaders: () => Record<string, string>;
  exportAndPurgeCategoryData: (
    category: ArchivableCategory,
    ageMonths: number
  ) => Promise<PurgeResult>;
  retentionPolicy: RetentionPolicyMap;
  updateRetentionPolicy: (category: ArchivableCategory, months: number) => void;
  runRetentionPolicyCleanup: () => Promise<PurgeResult[]>;

  // Transactional Outbox Pattern Subsystem
  outboxStats: OutboxStats;
  outboxItems: OutboxRecord[];
  isOutboxModalOpen: boolean;
  setIsOutboxModalOpen: (open: boolean) => void;
  flushOutbox: () => Promise<{ successCount: number; failCount: number }>;
  retryOutboxItem: (queueId: string) => void;
  retryAllOutboxItems: () => void;
  clearCompletedOutbox: () => void;
  clearDeadLetterOutbox: () => void;
  enqueueOutboxTransaction: (options: EnqueueOutboxOptions) => OutboxRecord;

  // MySQL Persistence & Synchronization
  syncAllLocalToMysql: () => Promise<{ success: boolean; message?: string; error?: string }>;
  getMysqlStatus: () => Promise<any>;

  // Server Degraded State & Recovery
  serverDegradedState: {
    isDegraded: boolean;
    dbEngine: string;
    degradedSince?: string | null;
    lastDegradedReason?: string;
    queuedWritesCount?: number;
  };
  refreshServerStatus: () => Promise<void>;
}
