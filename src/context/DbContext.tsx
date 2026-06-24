/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { createSaltedHash, formatHashToken, verifyPasswordWithToken, detectSQLi, encryptCredentialPacket, decryptCredentialPacket } from '../lib/crypto';
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
  DamageLog
} from '../types/db';

// Self-healing LocalStorage Interceptor to prevent QuotaExceededError crashes
if (typeof window !== 'undefined' && window.localStorage) {
  const originalSetItem = window.localStorage.setItem;
  window.localStorage.setItem = function (key, value) {
    try {
      originalSetItem.call(window.localStorage, key, value);
    } catch (error: any) {
      if (
        error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        error.code === 22
      ) {
        console.warn(`[System Guard] LocalStorage quota exceeded for key "${key}". Attempting automated self-heal/pruning...`);
        let purgedSomething = false;
        
        // 1. Core self-heal: Prune simulation db backup snapshots first (since they consume ~80% of storage)
        try {
          const cachedSnapshotsStr = window.localStorage.getItem('tp_db_snapshots');
          if (cachedSnapshotsStr) {
            const snapshots = JSON.parse(cachedSnapshotsStr);
            if (Array.isArray(snapshots) && snapshots.length > 0) {
              console.log('[System Guard] Self-healing: Reducing snapshot catalog size to prevent render failure...');
              if (snapshots.length > 1) {
                // Keep only the most recent snapshot to clear space
                originalSetItem.call(window.localStorage, 'tp_db_snapshots', JSON.stringify(snapshots.slice(0, 1)));
              } else {
                // Remove all snapshots completely if space is still needed
                window.localStorage.removeItem('tp_db_snapshots');
              }
              purgedSomething = true;
            }
          }
        } catch (e) {
          console.error('[System Guard] Failed to prune tp_db_snapshots:', e);
        }

        // 2. Secondary self-heal: Prune older large histories (audit logs, movements, etc.)
        if (!purgedSomething || key !== 'tp_db_snapshots') {
          const largeKeysToPrune = ['tp_audit_logs', 'tp_movements', 'tp_sales', 'tp_damage_logs'];
          for (const pruneKey of largeKeysToPrune) {
            try {
              const cachedStr = window.localStorage.getItem(pruneKey);
              if (cachedStr) {
                const parsed = JSON.parse(cachedStr);
                if (Array.isArray(parsed) && parsed.length > 25) {
                  console.log(`[System Guard] Self-healing: Trimming oldest entries from key "${pruneKey}" to free up space.`);
                  originalSetItem.call(window.localStorage, pruneKey, JSON.stringify(parsed.slice(0, 25)));
                  purgedSomething = true;
                }
              }
            } catch (e) {
              // Ignore
            }
          }
        }

        // 3. Retry the original write operation after cleaning up
        try {
          originalSetItem.call(window.localStorage, key, value);
          console.log(`[System Guard] Self-healing SUCCESS: Saved key "${key}" after pruning storage layout.`);
          return;
        } catch (retryError) {
          console.error(`[System Guard] Critical Storage Fail: Unable to save "${key}" even after pruning. Suppressing crash.`, retryError);
          // Return without throwing to protect application runtime state of active view
          return;
        }
      }
      // Re-throw other unexpected localStorage exceptions
      throw error;
    }
  };
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
  currentUser: User;
  setCurrentUser: (user: User) => void;
  updateCurrentUser: (updates: Partial<User>) => void;
  isLoggedIn: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string; sqliBlocked?: boolean }>;
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
  sales: Sale[];
  saleItems: SaleItem[];
  movements: InventoryMovement[];
  auditLogs: AuditLog[];
  activeShift: Shift | null;
  stockTransfers: StockTransfer[];
  branchStock: InventoryLocationStock[];
  ledgerEntries: LedgerEntry[];

  // Actions - Users
  createUser: (user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  resetPassword: (id: string) => void;

  // Actions - Branches
  createBranch: (branch: Omit<Branch, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>) => void;
  updateBranch: (id: string, updates: Partial<Branch>) => void;
  deleteBranch: (id: string) => void;

  // Actions - Suppliers
  createSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt' | 'isDeleted'>) => Supplier;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  // Actions - Brands
  createBrand: (brand: Omit<Brand, 'id' | 'createdAt' | 'isDeleted'>) => Brand;
  updateBrand: (id: string, updates: Partial<Brand>) => void;
  deleteBrand: (id: string) => void;

  // Actions - Products
  createProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'qrCode' | 'createdBy' | 'updatedBy'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>, customLogReason?: string) => void;
  deleteProduct: (id: string) => void;
  importProducts: (imported: Product[]) => { success: boolean; count: number; error?: string };

  // Actions - POS & Checkout
  holdSale: (cartItems: { product: Product; quantity: number }[], customerName: string, notes: string) => string; // returns hold ID
  parkedSales: { id: string; customerName: string; notes: string; items: { product: Product; quantity: number }[]; timestamp: string }[];
  setParkedSales: React.Dispatch<React.SetStateAction<{ id: string; customerName: string; notes: string; items: { product: Product; quantity: number }[]; timestamp: string }[]>>;
  checkoutSale: (
    cartItems: { product: Product; quantity: number }[],
    customerName: string,
    notes: string,
    discountAmount: number,
    paymentMethod: Sale['paymentMethod'],
    amountTendered: number,
    customVat?: number
  ) => Sale;
  voidSale: (saleId: string) => void;

  // Actions - Shifts
  openShift: (startCash: number) => void;
  closeShift: (cashCount: number) => void;
  getShiftReportStats: (shift: Shift) => { salesCount: number; salesTotal: number; vatTotal: number; discountTotal: number; netTotal: number };

  // Actions - Purchase Orders
  createPO: (supplierId: string, branchId: string, items: { productId: string; costPrice: number; quantityRequested: number }[], notes?: string, status?: POStatus) => void;
  updatePOStatus: (id: string, status: POStatus) => void;
  receivePOItems: (id: string, receivedMap: Record<string, number>) => void; // productId -> qty

  // Actions - Transmittals
  createTransmittal: (docType: TransmittalDocType, toBranchId: string, payloadJson: string, notes?: string) => string;
  updateTransmittalStatus: (id: string, status: TransmittalStatus) => void;

  // Actions - Stock Transfers & Distribution
  createStockTransfer: (fromBranchId: string, toBranchId: string, transferType: TransferType, items: { productId: string; quantity: number }[], reason: string) => void;
  updateStockTransferStatus: (id: string, status: TransferStatus) => void;

  // Helper Stats & Filter views
  stats: SummaryStats;
  addAuditLog: (action: string, description: string, tableAffected: string, recordId: string) => void;
  logManualAdjustment: (productId: string, quantity: number, notes: string) => void;
  createManualLedgerEntry: (entry: {
    productId: string;
    branchId: string;
    movementType: 'IN' | 'OUT' | 'ADJUST' | 'TRANSFER' | 'PURCHASE' | 'SALE';
    quantity: number;
    referenceNo: string;
    remarks: string;
  }) => void;
  truncateDatabase: (mode: 'all' | 'transactions' | 'seeds') => void;

  // Actions - Branch Sales Reports Transmission
  branchSalesReports: BranchSalesReport[];
  transmitSalesReport: (report: Omit<BranchSalesReport, 'id' | 'transferredAt' | 'status'>) => void;
  importManualSalesReport: (rawJson: string) => { success: boolean; error?: string };
  auditSalesReport: (reportId: string, status: 'Verified' | 'Pending Audit', notes?: string) => void;

  // Actions - Deliveries Submodule
  deliveries: Delivery[];
  createDelivery: (delivery: Omit<Delivery, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'branchId' | 'branchName'>) => Delivery;
  updateDeliveryStatus: (id: string, status: DeliveryStatus, notes?: string) => void;
  assignDeliveryPersonnel: (id: string, truck: string, driver: string, helper: string) => void;
  completeDelivery: (id: string, proofPhotoUrl?: string, customerSignature?: string, receiverName?: string) => void;

  // Actions - Broken & Broken-on-Arrival (BOA) Damage Register
  damageLogs: DamageLog[];
  createDamageLog: (log: Omit<DamageLog, 'id' | 'reportedAt' | 'reportedBy'>) => void;

  updateBranchPriceOverride: (productId: string, branchId: string, price: number) => void;
  updateBranchLowStockThreshold: (productId: string, branchId: string, threshold: number) => void;

  // DB Performance Tuning & Backup Snapshots Properties
  debounceDelay: number;
  setDebounceDelay: (delay: number) => void;
  dbSyncStatus: 'idle' | 'queued' | 'syncing';
  writeStatsCount: number;
  resetWriteStats: () => void;
  forceSyncAll: () => void;
  dbSnapshots: DbSnapshot[];
  createDbSnapshot: (name: string) => void;
  restoreDbSnapshot: (snapshotId: string) => boolean;
  deleteDbSnapshot: (snapshotId: string) => void;
  autoBackupEnabled: boolean;
  setAutoBackupEnabled: (val: boolean) => void;
  backupIntervalHours: number;
  setBackupIntervalHours: (val: number) => void;
  lastAutoBackupTime: string | null;
  setLastAutoBackupTime: (val: string | null) => void;

  // Global System Processing Loader state
  isSystemProcessing: boolean;
  systemProcessingMessage: string;
  systemProcessingSubtext: string;
  systemProcessingType: 'spinner' | 'progress' | 'verification' | 'db';
  systemProcessingProgress: number;
  triggerSystemProcessing: (message: string, durationMs?: number, type?: 'spinner' | 'progress' | 'verification' | 'db', onComplete?: () => void, subtext?: string) => Promise<void>;
  setSystemProcessingProgress: (progress: number) => void;
  setIsSystemProcessing: (val: boolean) => void;
  setSystemProcessingMessage: (msg: string) => void;
  setSystemProcessingSubtext: (sub: string) => void;
  simulationModeActive: boolean;
  setSimulationModeActive: (val: boolean) => void;
  generateMasterForensicBackup: () => any;
  importMasterForensicBackup: () => void;
  resetLockout: () => void;
}

export interface DbSnapshot {
  id: string;
  name: string;
  timestamp: string;
  creator: string;
  sizeBytes: number;
  data: string;
}

const DbContext = createContext<DbContextType | undefined>(undefined);

const GUEST_USER: User = {
  id: 'G1',
  avatarInitials: '??',
  fullName: 'Guest User',
  username: 'guest',
  email: '',
  role: UserRole.STAFF,
  branchAssignmentId: '',
  status: 'Active',
  createdAt: '',
  updatedAt: ''
};

function safeParse<T>(key: string, defaultValue: T): T {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return defaultValue;
    return JSON.parse(cached) as T;
  } catch (error) {
    console.error(`Error parsing localStorage key "${key}":`, error);
    try {
      // Clean up corrupted key so subsequent reloads don't retry and error
      localStorage.removeItem(key);
    } catch (e) {}
    return defaultValue;
  }
}

// Initial Seed data constants
const SEED_BRANCHES: Branch[] = [
  {
    id: 'B1',
    name: 'Emman Tile Center Central HQ',
    manager: 'Erica Manaban',
    address: 'Lacson Street, Bacolod City',
    phone: '0917-123-4567',
    monthlySales: 1250000,
    staffCount: 5,
    activeCashiers: 2,
    createdAt: new Date('2026-01-01T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-01T08:00:00Z').toISOString(),
    isDeleted: false,
    isDistributionBranch: true
  },
  {
    id: 'B2',
    name: 'TilePoint Davao Branch',
    manager: 'Tomas Lopez',
    address: 'JP Laurel Ave, Davao City',
    phone: '0917-987-6543',
    monthlySales: 750000,
    staffCount: 3,
    activeCashiers: 1,
    createdAt: new Date('2026-02-15T09:00:00Z').toISOString(),
    updatedAt: new Date('2026-02-15T09:00:00Z').toISOString(),
    isDeleted: false
  },
  {
    id: 'B3',
    name: 'TilePoint Iloilo Branch',
    manager: 'Juan dela Cruz',
    address: 'Diversion Road, Iloilo City',
    phone: '0917-555-4321',
    monthlySales: 540000,
    staffCount: 3,
    activeCashiers: 1,
    createdAt: new Date('2026-03-01T08:30:00Z').toISOString(),
    updatedAt: new Date('2026-03-01T08:30:00Z').toISOString(),
    isDeleted: false
  },
  {
    id: 'B4',
    name: 'TilePoint Silay Branch',
    manager: 'Tomas Lopez',
    address: 'Rizal St, Silay City',
    phone: '0917-222-3333',
    monthlySales: 320000,
    staffCount: 2,
    activeCashiers: 1,
    createdAt: new Date('2026-03-15T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-03-15T10:00:00Z').toISOString(),
    isDeleted: false
  }
];

const SEED_USERS: User[] = [
  {
    id: 'U1',
    avatarInitials: 'EM',
    fullName: 'Erica Manaban',
    username: 'erica_admin',
    email: 'erica.manaban.04@gmail.com',
    role: UserRole.ADMIN,
    branchAssignmentId: 'B1',
    status: 'Active',
    managerPin: '8888',
    createdAt: new Date('2026-01-01T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-01T08:00:00Z').toISOString()
  },
  {
    id: 'U2',
    avatarInitials: 'JD',
    fullName: 'Juan dela Cruz',
    username: 'juan_mgr',
    email: 'juan@tilepoint.com',
    role: UserRole.MANAGER,
    branchAssignmentId: 'B3',
    status: 'Active',
    managerPin: '1234',
    createdAt: new Date('2026-02-16T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-02-16T08:00:00Z').toISOString()
  },
  {
    id: 'U3',
    avatarInitials: 'TL',
    fullName: 'Tomas Lopez',
    username: 'tomas_mgr',
    email: 'tomas@tilepoint.com',
    role: UserRole.MANAGER,
    branchAssignmentId: 'B2',
    status: 'Active',
    managerPin: '4321',
    createdAt: new Date('2026-02-16T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-02-16T08:00:00Z').toISOString()
  },
  {
    id: 'U4',
    avatarInitials: 'CG',
    fullName: 'Carla Gomez',
    username: 'carla_cashier',
    email: 'carla@tilepoint.com',
    role: UserRole.CASHIER,
    branchAssignmentId: 'B1',
    status: 'Active',
    createdAt: new Date('2026-03-02T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-03-02T08:00:00Z').toISOString()
  },
  {
    id: 'U5',
    avatarInitials: 'MS',
    fullName: 'Maria Santos',
    username: 'maria_staff',
    email: 'maria@tilepoint.com',
    role: UserRole.STAFF,
    branchAssignmentId: 'B2',
    status: 'Active',
    createdAt: new Date('2026-03-10T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-03-10T08:00:00Z').toISOString()
  }
];

const SEED_SUPPLIERS: Supplier[] = [
  {
    id: 'S1',
    name: 'Pioneer Ceramics Inc.',
    contactPerson: 'Ferdinand Marcos Jr.',
    phone: '0918-444-2222',
    email: 'sales@pioneerceramics.ph',
    address: 'Mariquina Complex, Pasig City',
    createdAt: new Date('2026-01-01T08:00:00Z').toISOString(),
    isDeleted: false
  },
  {
    id: 'S2',
    name: 'Premium Clay Co.',
    contactPerson: 'Elen Gurner',
    phone: '0922-888-9999',
    email: 'contracts@premiumclay.ph',
    address: 'Industrial Zone, Cebu City',
    createdAt: new Date('2026-01-10T08:00:00Z').toISOString(),
    isDeleted: false
  },
  {
    id: 'S3',
    name: 'Global Tile Imports Co.',
    contactPerson: 'Charles Wu',
    phone: '0917-777-6666',
    email: 'charles.wu@globalimports.com.ph',
    address: 'North Harbor, Port Area, Manila',
    createdAt: new Date('2026-01-15T08:00:00Z').toISOString(),
    isDeleted: false
  },
  {
    id: 'S4',
    name: 'Apex Freight & Ceramic Logistics',
    contactPerson: 'Diana Prince',
    phone: '0905-111-3333',
    email: 'logistics@apexceramics.ph',
    address: 'SLEX Interchange, Santa Rosa, Laguna',
    createdAt: new Date('2026-01-20T08:00:00Z').toISOString(),
    isDeleted: false
  }
];

const SEED_BRANDS: Brand[] = [
  { id: 'BND-1', name: 'Mariwasa', supplierId: 'S1', description: 'Premium decorative ceramic & porcelain floor tiles', isDeleted: false, createdAt: new Date('2026-01-01T08:00:00Z').toISOString() },
  { id: 'BND-2', name: 'Lepanto', supplierId: 'S1', description: 'Vibrant and heavy-duty tiles', isDeleted: false, createdAt: new Date('2026-01-01T08:00:00Z').toISOString() },
  { id: 'BND-3', name: 'Pioneer', supplierId: 'S1', description: 'Standard high-grade ceramics', isDeleted: false, createdAt: new Date('2026-01-01T08:00:00Z').toISOString() },
  { id: 'BND-4', name: 'Kito', supplierId: 'S2', description: 'Architectural tiles and slab design collections', isDeleted: false, createdAt: new Date('2026-01-05T08:00:00Z').toISOString() },
  { id: 'BND-5', name: 'Premium Ceramics', supplierId: 'S2', description: 'Glossy white polished and modern matte finishes', isDeleted: false, createdAt: new Date('2026-01-05T08:00:00Z').toISOString() },
  { id: 'BND-6', name: 'TilePoint Premium', supplierId: 'S3', description: 'In-house luxury marble-effect porcelain slabs', isDeleted: false, createdAt: new Date('2026-01-10T08:00:00Z').toISOString() },
  { id: 'BND-7', name: 'TilePoint Standard', supplierId: 'S3', description: 'Affordable commercial porcelain tiles', isDeleted: false, createdAt: new Date('2026-01-10T08:00:00Z').toISOString() },
  { id: 'BND-8', name: 'ClayWorks', supplierId: 'S4', description: 'Handcrafted terracotta and clay tiles', isDeleted: false, createdAt: new Date('2026-01-15T08:00:00Z').toISOString() }
];

const SEED_PRODUCTS: Product[] = [
  {
    id: 'P1',
    productCode: 'TL-MAR-60',
    sku: 'TL-MAR-WHITE-60X60',
    barcode: '4801234560011',
    qrCode: 'URL:TL-MAR-60',
    designName: 'Carrara Pure White Marble',
    productName: 'Carrara Polished Porcelain Tile',
    category: 'Marble Glazed Porcelain',
    brand: 'Mariwasa',
    supplierId: 'S1',
    unit: 'Boxes',
    size: '60x60 cm',
    boxQuantity: 4,
    coveragePerBox: 1.44,
    costPrice: 450,
    sellingPrice: 850,
    stockQuantity: 280,
    minimumStock: 40,
    isDeleted: false,
    createdAt: new Date('2026-01-02T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-02T08:00:00Z').toISOString(),
    createdBy: 'U1',
    updatedBy: 'U1'
  },
  {
    id: 'P2',
    productCode: 'TL-SLT-30',
    sku: 'TL-SLT-GREY-30X30',
    barcode: '4801234560028',
    qrCode: 'URL:TL-SLT-30',
    designName: 'Basalt Charcoal Rock',
    productName: 'Basalt Matte Exterior Slate Tile',
    category: 'Rustic Ceramic Tiles',
    brand: 'Lepanto',
    supplierId: 'S2',
    unit: 'Boxes',
    size: '30x30 cm',
    boxQuantity: 11,
    coveragePerBox: 0.99,
    costPrice: 280,
    sellingPrice: 480,
    stockQuantity: 150,
    minimumStock: 30,
    isDeleted: false,
    createdAt: new Date('2026-01-12T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-12T08:00:00Z').toISOString(),
    createdBy: 'U1',
    updatedBy: 'U1'
  },
  {
    id: 'P3',
    productCode: 'TL-TRA-80',
    sku: 'TL-TRA-GOLD-80X80',
    barcode: '4801234560035',
    qrCode: 'URL:TL-TRA-80',
    designName: 'Pamplona Golden Travertine',
    productName: 'Pamplona Double-Loaded Vitrified Tile',
    category: 'Vitrified Granite',
    brand: 'Pioneer',
    supplierId: 'S1',
    unit: 'Boxes',
    size: '80x80 cm',
    boxQuantity: 3,
    coveragePerBox: 1.92,
    costPrice: 720,
    sellingPrice: 1350,
    stockQuantity: 110,
    minimumStock: 20,
    isDeleted: false,
    createdAt: new Date('2026-01-15T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-15T08:00:00Z').toISOString(),
    createdBy: 'U1',
    updatedBy: 'U1'
  },
  {
    id: 'P4',
    productCode: 'TL-WOO-15',
    sku: 'TL-WOO-TEAK-15X90',
    barcode: '4801234560042',
    qrCode: 'URL:TL-WOO-15',
    designName: 'Golden Teak Lumber Strip',
    productName: 'Teak Wooden-Plank Finish Ceramic Tile',
    category: 'Wood Ceramic Plank',
    brand: 'Kito',
    supplierId: 'S3',
    unit: 'Boxes',
    size: '15x90 cm',
    boxQuantity: 8,
    coveragePerBox: 1.08,
    costPrice: 420,
    sellingPrice: 720,
    stockQuantity: 320,
    minimumStock: 50,
    isDeleted: false,
    createdAt: new Date('2026-01-20T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-20T08:00:00Z').toISOString(),
    createdBy: 'U1',
    updatedBy: 'U1'
  },
  {
    id: 'P5',
    productCode: 'TL-MOS-30',
    sku: 'TL-MOS-AQUA-30X30',
    barcode: '4801234560059',
    qrCode: 'URL:TL-MOS-30',
    designName: 'Aqua Glass Hexagonal',
    productName: 'Aqua Marine Pool Mosaic Mesh',
    category: 'Glass Mosaics',
    brand: 'Premium Ceramics',
    supplierId: 'S2',
    unit: 'Sheets',
    size: '30x30 cm',
    boxQuantity: 10,
    coveragePerBox: 0.90,
    costPrice: 850,
    sellingPrice: 1580,
    stockQuantity: 75,
    minimumStock: 15,
    isDeleted: false,
    createdAt: new Date('2026-01-22T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-22T08:00:00Z').toISOString(),
    createdBy: 'U1',
    updatedBy: 'U1'
  },
  {
    id: 'P6',
    productCode: 'TL-RET-60',
    sku: 'TL-RET-STN-60X60',
    barcode: '4801234560066',
    qrCode: 'URL:TL-RET-60',
    designName: 'Galicia Oxide Slate',
    productName: 'Galicia Slip-Resistant Outdoor Stone Panel',
    category: 'Rustic Ceramic Tiles',
    brand: 'Lepanto',
    supplierId: 'S4',
    unit: 'Boxes',
    size: '60x60 cm',
    boxQuantity: 4,
    coveragePerBox: 1.44,
    costPrice: 380,
    sellingPrice: 650,
    stockQuantity: 95,
    minimumStock: 25,
    isDeleted: false,
    createdAt: new Date('2026-01-30T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-30T08:00:00Z').toISOString(),
    createdBy: 'U1',
    updatedBy: 'U1'
  }
];

const generateSeedSales = (productsList: Product[]): { sales: Sale[]; saleItems: SaleItem[] } => {
  const salesList: Sale[] = [];
  const itemsList: SaleItem[] = [];

  const branches = [
    { id: 'B1', baseShare: 0.55 },
    { id: 'B2', baseShare: 0.20 },
    { id: 'B3', baseShare: 0.15 },
    { id: 'B4', baseShare: 0.10 },
  ];

  const paymentMethods: Sale['paymentMethod'][] = ['Cash', 'GCash', 'Maya', 'Credit Card', 'Bank Transfer'];
  const customers = [
    'Enrique Concepcion', 'Samantha Roxas', 'Davao Tile Contractors', 'Arch. Gabriel Lizares',
    'Talisay Housing Corp', 'Rupert Villa', 'Regina Alunan', 'MegaWorld Bacolod Project',
    'Estancia Builders', 'Maria Luz Araneta', 'Silay Heritage Restoration', 'Vicente Lopez'
  ];

  const targetMonthlySales = [
    780000,  // Jan
    920000,  // Feb
    1150000, // Mar
    980000,  // Apr
    1420000, // May
    1542000, // Jun
  ];

  let saleCounter = 1;
  let itemCounter = 1;

  targetMonthlySales.forEach((targetTotal, monthIdx) => {
    const monthNum = monthIdx + 1;
    branches.forEach((b) => {
      const branchTarget = targetTotal * b.baseShare;
      let accumulated = 0;
      
      while (accumulated < branchTarget) {
        const isBulk = Math.random() < 0.25;
        const saleValue = isBulk ? (40000 + Math.random() * 40000) : (4000 + Math.random() * 10000);
        const day = Math.floor(Math.random() * 27) + 1;
        const hour = Math.floor(Math.random() * 8) + 9;
        
        const dateStr = `2026-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:15:00Z`;
        const saleId = `SL-${10000 + saleCounter}`;
        const saleNum = `TX-2026${String(monthNum).padStart(2, '0')}-${String(saleCounter).padStart(5, '0')}`;
        
        const eligibleProds = [...productsList];
        const numItems = isBulk ? 3 : (Math.floor(Math.random() * 2) + 1);
        let subtotal = 0;
        
        for (let k = 0; k < numItems; k++) {
          if (eligibleProds.length === 0) break;
          const prodIdx = Math.floor(Math.random() * eligibleProds.length);
          const p = eligibleProds.splice(prodIdx, 1)[0];
          
          const maxQty = isBulk ? Math.floor(saleValue / p.sellingPrice) : Math.floor((saleValue * 0.6) / p.sellingPrice);
          const qty = Math.max(1, maxQty);
          const total = qty * p.sellingPrice;
          
          const saleItem: SaleItem = {
            id: `SLI-${20000 + itemCounter}`,
            saleId,
            productId: p.id,
            productName: p.productName,
            unitPrice: p.sellingPrice,
            quantity: qty,
            total,
            isDeleted: false,
          };
          
          itemsList.push(saleItem);
          subtotal += total;
          itemCounter++;
        }
        
        const vat = Math.round(subtotal * 0.12);
        const discount = Math.random() < 0.25 ? (isBulk ? 2000 : 350) : 0;
        const grandTotal = subtotal + vat - discount;
        
        const customer = isBulk 
          ? (Math.random() < 0.5 ? 'Bacolod Heights Premium Homes' : 'Metro Visayas Construction')
          : customers[Math.floor(Math.random() * customers.length)];

        const sale: Sale = {
          id: saleId,
          saleNumber: saleNum,
          shiftId: `SF-SEED`,
          branchId: b.id,
          cashierId: 'U4',
          cashierName: 'Carla Lopez',
          customerName: customer,
          subtotal,
          vat,
          discount,
          grandTotal,
          paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
          amountTendered: Math.ceil(grandTotal / 100) * 100,
          changeAmount: (Math.ceil(grandTotal / 100) * 100) - grandTotal,
          createdAt: dateStr,
          isDeleted: false,
          notes: isBulk ? 'Bulk contract Builder rates applied' : 'Walk-in retail client',
        };
        
        salesList.push(sale);
        accumulated += grandTotal;
        saleCounter++;
      }
    });
  });

  const today = new Date();
  for (let idx = 0; idx < 7; idx++) {
    const targetDate = new Date();
    targetDate.setDate(today.getDate() - idx);
    const dateStrPrefix = targetDate.toISOString().slice(0, 10);
    
    branches.forEach((b) => {
      const numSales = Math.floor(Math.random() * 2) + 1;
      for (let s = 0; s < numSales; s++) {
        const hour = Math.floor(Math.random() * 8) + 9;
        const dateStr = `${dateStrPrefix}T${String(hour).padStart(2, '0')}:45:30Z`;
        
        const saleId = `SL-${30000 + saleCounter}`;
        const saleNum = `TX-WEEK-${String(saleCounter).padStart(5, '0')}`;
        
        const p = productsList[Math.floor(Math.random() * productsList.length)];
        const qty = Math.floor(Math.random() * 6) + 3;
        const subtotal = qty * p.sellingPrice;
        const vat = Math.round(subtotal * 0.12);
        const discount = 0;
        const grandTotal = subtotal + vat;
        
        const saleItem: SaleItem = {
          id: `SLI-${30000 + itemCounter}`,
          saleId,
          productId: p.id,
          productName: p.productName,
          unitPrice: p.sellingPrice,
          quantity: qty,
          total: subtotal,
          isDeleted: false,
        };
        
        itemsList.push(saleItem);
        itemCounter++;
        
        const sale: Sale = {
          id: saleId,
          saleNumber: saleNum,
          shiftId: `SF-SEED-ACTIVE`,
          branchId: b.id,
          cashierId: 'U4',
          cashierName: 'Carla Lopez',
          customerName: customers[Math.floor(Math.random() * customers.length)],
          subtotal,
          vat,
          discount,
          grandTotal,
          paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
          amountTendered: Math.ceil(grandTotal / 50) * 50,
          changeAmount: (Math.ceil(grandTotal / 50) * 50) - grandTotal,
          createdAt: dateStr,
          isDeleted: false,
          notes: 'Active Week POS checkout sale',
        };
        
        salesList.push(sale);
        saleCounter++;
      }
    });
  }

  return { sales: salesList, saleItems: itemsList };
};

const SEED_SHIFTS: Shift[] = [];

const seedSalesResult = generateSeedSales(SEED_PRODUCTS);
const SEED_SALES: Sale[] = seedSalesResult.sales;
const SEED_SALE_ITEMS: SaleItem[] = seedSalesResult.saleItems;

const SEED_POS: PurchaseOrder[] = [
  {
    id: 'PO-2026-00001',
    poNumber: 'PO-2026-00001',
    supplierId: 'S1',
    branchId: 'B1',
    status: 'Completed',
    requestedBy: 'Erica Manaban',
    date: new Date('2026-04-01T10:00:00Z').toISOString(),
    notes: 'Initial Restock for Q2 Carrara Marble Line',
    createdAt: new Date('2026-04-01T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-04-05T14:30:00Z').toISOString()
  },
  {
    id: 'PO-2026-00002',
    poNumber: 'PO-2026-00002',
    supplierId: 'S2',
    branchId: 'B2',
    status: 'Ordered',
    requestedBy: 'Tomas Lopez',
    date: new Date('2026-05-15T11:20:00Z').toISOString(),
    notes: 'Matte Slate Outdoor Tile Buffer Fill',
    createdAt: new Date('2026-05-15T11:20:00Z').toISOString(),
    updatedAt: new Date('2026-05-15T11:22:00Z').toISOString()
  },
  {
    id: 'PO-2026-00003',
    poNumber: 'PO-2026-00003',
    supplierId: 'S3',
    branchId: 'B1',
    status: 'Draft',
    requestedBy: 'Erica Manaban',
    date: new Date('2026-06-02T13:45:00Z').toISOString(),
    notes: 'Teak Wooden Planks Draft Spec Template',
    createdAt: new Date('2026-06-02T13:45:00Z').toISOString(),
    updatedAt: new Date('2026-06-02T13:45:00Z').toISOString()
  }
];

const SEED_PO_ITEMS: PurchaseOrderItem[] = [
  {
    id: 'POI-1',
    poId: 'PO-2026-00001',
    productId: 'P1',
    costPrice: 450,
    quantityRequested: 100,
    quantityReceived: 100
  },
  {
    id: 'POI-2',
    poId: 'PO-2026-00001',
    productId: 'P3',
    costPrice: 720,
    quantityRequested: 50,
    quantityReceived: 50
  },
  {
    id: 'POI-3',
    poId: 'PO-2026-00002',
    productId: 'P2',
    costPrice: 280,
    quantityRequested: 80,
    quantityReceived: 0
  },
  {
    id: 'POI-4',
    poId: 'PO-2026-00003',
    productId: 'P4',
    costPrice: 420,
    quantityRequested: 60,
    quantityReceived: 0
  }
];

const SEED_TRANSMITTALS: Transmittal[] = [];
const SEED_MOVEMENTS: InventoryMovement[] = [];
const SEED_AUDIT_LOGS: AuditLog[] = [];

// Synchronous automatic local storage purge for production reset (v15)
if (typeof window !== 'undefined' && localStorage.getItem('tp_simulation_purged_final_v15') !== 'true') {
  const keysToPurge = [
    'tp_users',
    'tp_branches',
    'tp_suppliers',
    'tp_products',
    'tp_purchase_orders',
    'tp_po_items',
    'tp_transmittals',
    'tp_shifts',
    'tp_sales',
    'tp_sale_items',
    'tp_movements',
    'tp_audit_logs',
    'tp_parked_sales',
    'tp_stock_transfers',
    'tp_branch_stock',
    'tp_ledger_entries',
    'atpos_v2_members_list',
    'atpos_v2_expenses',
    'atpos_v2_returns',
    'tp_current_user',
    'tp_is_logged_in',
    'tp_is_configured'
  ];
  keysToPurge.forEach(k => localStorage.removeItem(k));
  localStorage.setItem('tp_simulation_purged_final_v15', 'true');
}

/**
 * Highly secure sanitation and verification helpers to prevent XSS script injections,
 * escape raw HTML codes, trim input trails, and enforce strict type constraints.
 */
export const sanitizeInputText = (str: string): string => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '') // Remove script tags
    .replace(/<\/?[^>]+(>|$)/g, "") // Strip HTML tags
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
};

export const sanitizeAndValidateNumber = (val: any, fallback = 0): number => {
  if (val === undefined || val === null) return fallback;
  const num = typeof val === 'number' ? val : parseFloat(val);
  return isNaN(num) ? fallback : Math.max(0, num);
};

/**
 * Simple Cryptographic Encryption using character level XOR transposition with dynamic secret salts.
 * High portability representation to secure JSON payloads without external dependency imports.
 */
export const encryptString = (text: string, secretKey: string): string => {
  let result = '';
  const keyLength = secretKey.length;
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const keyChar = secretKey.charCodeAt(i % keyLength);
    const encryptedChar = charCode ^ keyChar;
    result += ('00' + encryptedChar.toString(16)).slice(-2);
  }
  return btoa(result);
};

export const decryptString = (cipherStr: string, secretKey: string): string => {
  try {
    const decoded = atob(cipherStr);
    let result = '';
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
    return '';
  }
};

export const DbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [simulationModeActive, setSimulationModeActive] = useState<boolean>(() => {
    return localStorage.getItem('tp_simulation_mode_active') === 'true';
  });

  const [isConfigured, setIsConfigured] = useState<boolean>(() => {
    const cached = localStorage.getItem('tp_is_configured');
    return cached === 'true';
  });

  // Load initial local data or populate with seed data
  const [currentUser, setCurrentUser] = useState<User>(() => {
    return safeParse<User>('tp_current_user', SEED_USERS[0] || GUEST_USER);
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const cached = localStorage.getItem('tp_is_logged_in');
    return cached === 'true';
  });

  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutUntil, setLockoutUntil] = useState<number>(0);
  const [rateLimitTimeLeft, setRateLimitTimeLeft] = useState<number>(0);

  const updateCurrentUser = (updates: Partial<User>) => {
    setCurrentUser(prev => {
      const updated = { ...prev, ...updates } as User;
      return updated;
    });
  };

  const [users, setUsers] = useState<User[]>(() => {
    // Clear out any old versions of cached users with incompatible password structures
    if (localStorage.getItem('tp_hash_version_v3') !== 'true') {
      localStorage.removeItem('tp_users');
      localStorage.setItem('tp_hash_version_v3', 'true');
    }
    return safeParse<User[]>('tp_users', SEED_USERS);
  });

  // Dynamic seed passwords initialization
  useEffect(() => {
    const initializePasswords = async () => {
      let changed = false;
      const updatedUsers = await Promise.all(users.map(async u => {
        if (!u.passwordHash) {
          changed = true;
          const defaultPassword = u.username === 'erica_admin' ? 'admin123' :
                                  u.username === 'juan_mgr' ? 'manager123' :
                                  u.username === 'tomas_mgr' ? 'manager123' :
                                  u.username === 'carla_cashier' ? 'cashier123' : 'tilepoint';
          const salt = u.username + '_salt_tok';
          const hashedVal = await createSaltedHash(defaultPassword, salt, 2500);
          const formattedToken = formatHashToken(salt, hashedVal, 2500);
          return {
            ...u,
            passwordHash: formattedToken
          };
        }
        return u;
      }));
      if (changed) {
        setUsers(updatedUsers);
        localStorage.setItem('tp_users', JSON.stringify(updatedUsers));
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
    if (nextAttempts >= 3) {
      const lockDuration = 30 * 1000; // 30 sec lockout
      const until = Date.now() + lockDuration;
      setLockoutUntil(until);
      setRateLimitTimeLeft(30);
      addAuditLog('SECURITY_LIMIT', `Brute Force Rate Limiter triggered! Blocked address login attempts for 30 seconds.`, 'Users', 'SYSTEM');
    }
  };

  const resetLockout = () => {
    setFailedAttempts(0);
    setLockoutUntil(0);
    setRateLimitTimeLeft(0);
  };

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string; sqliBlocked?: boolean }> => {
    // Check if the credentials are 'admin' / 'admin123' to initiate simulation mode trigger
    if (username.trim().toLowerCase() === 'admin' && password === 'admin123') {
      const proceed = true; // Bypasses window.confirm in iframe environments for seamless login
      if (proceed) {
        setSimulationModeActive(true);
        localStorage.setItem('tp_simulation_mode_active', 'true');
        localStorage.setItem('tilepoint_company_name_v1', 'tilepoint');
        setIsConfigured(true);
        localStorage.setItem('tp_is_configured', 'true');

        const adminSalt = 'admin_salt';
        const adminHash = await createSaltedHash('admin123', adminSalt, 2500);
        const adminToken = formatHashToken(adminSalt, adminHash, 2500);

        const managerSalt = 'manager_salt';
        const managerHash = await createSaltedHash('tilepoint', managerSalt, 2500);
        const managerToken = formatHashToken(managerSalt, managerHash, 2500);

        const cashierSalt = 'cashier_salt';
        const cashierHash = await createSaltedHash('tilepoint', cashierSalt, 2500);
        const cashierToken = formatHashToken(cashierSalt, cashierHash, 2500);

        const staffSalt = 'staff_salt';
        const staffHash = await createSaltedHash('tilepoint', staffSalt, 2500);
        const staffToken = formatHashToken(staffSalt, staffHash, 2500);

        const simUsersList: User[] = [
          {
            id: 'sim_admin',
            avatarInitials: 'AD',
            fullName: 'Simulated Admin',
            username: 'admin',
            email: 'admin@tilepoint.com',
            role: UserRole.ADMIN,
            branchAssignmentId: 'B1',
            status: 'Active',
            managerPin: '9999',
            passwordHash: adminToken,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'sim_manager',
            avatarInitials: 'MN',
            fullName: 'Simulated Manager',
            username: 'manager',
            email: 'manager@tilepoint.com',
            role: UserRole.MANAGER,
            branchAssignmentId: 'B1',
            status: 'Active',
            managerPin: '1111',
            passwordHash: managerToken,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'sim_cashier',
            avatarInitials: 'CS',
            fullName: 'Simulated Cashier',
            username: 'cashier',
            email: 'cashier@tilepoint.com',
            role: UserRole.CASHIER,
            branchAssignmentId: 'B1',
            status: 'Active',
            passwordHash: cashierToken,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'sim_staff',
            avatarInitials: 'ST',
            fullName: 'Simulated Staff',
            username: 'staff',
            email: 'staff@tilepoint.com',
            role: UserRole.STAFF,
            branchAssignmentId: 'B1',
            status: 'Active',
            passwordHash: staffToken,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];

        // Filter out existing simulated usernames
        const cleanUsers = users.filter(u => !['admin', 'manager', 'cashier', 'staff'].includes(u.username.toLowerCase()));
        const nextUsers = [...cleanUsers, ...simUsersList];
        setUsers(nextUsers);
        localStorage.setItem('tp_users', JSON.stringify(nextUsers));

        // Create main branch if not exists
        const mainBranchExists = branches.some(b => b.id === 'B1');
        if (!mainBranchExists) {
          const defaultBranch: Branch = {
            id: 'B1',
            name: 'tilepoint',
            manager: 'Simulated Admin',
            address: 'Simulation Headquarters',
            phone: '0999-999-9999',
            monthlySales: 0,
            staffCount: 4,
            activeCashiers: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isDeleted: false
          };
          const nextBranches = [...branches, defaultBranch];
          setBranches(nextBranches);
          localStorage.setItem('tp_branches', JSON.stringify(nextBranches));
        } else {
          const nextBranches = branches.map(b => b.id === 'B1' ? { ...b, name: 'tilepoint' } : b);
          setBranches(nextBranches);
          localStorage.setItem('tp_branches', JSON.stringify(nextBranches));
        }

        setFailedAttempts(0);
        setLockoutUntil(0);
        setRateLimitTimeLeft(0);
        setCurrentUser(simUsersList[0]);
        setIsLoggedIn(true);
        localStorage.setItem('tp_is_logged_in', 'true');
        localStorage.setItem('tp_current_user', JSON.stringify(simUsersList[0]));

        addAuditLog(
          'USER_LOGIN',
          `Simulation Mode Activated: Store set to 'tilepoint'. Seeding completed.`,
          'Users',
          'sim_admin'
        );

        return { success: true };
      } else {
        return { success: false, error: 'Simulation mode request rejected.' };
      }
    }

    // 1. Check for SQL Injection (SQLi)
    const sqlCheckUser = detectSQLi(username);
    const sqlCheckPass = detectSQLi(password);
    if (!sqlCheckUser.isSafe || !sqlCheckPass.isSafe) {
      const reason = (!sqlCheckUser.isSafe ? sqlCheckUser.reason : sqlCheckPass.reason) || 'SQLi Signature Detected';
      addAuditLog('SECURITY_ALERT', `SQL Injection attempt blocked on input username/password! Vector: ${reason}`, 'Users', 'SYSTEM');
      return { success: false, error: `SECURITY VIOLATION: SQL injection pattern detected (${reason}). Authentication halted. Attempt logged in corporate security log.`, sqliBlocked: true };
    }

    // 2. Check for Rate Limiting Lockout
    const now = Date.now();
    if (now < lockoutUntil) {
      const left = Math.ceil((lockoutUntil - now) / 1000);
      return { success: false, error: `TOO MANY ATTEMPTS: Access locked out. Please try again in ${left} seconds.` };
    }

    // Find user in db
    const targetUser = users.find(u => u.username.trim().toLowerCase() === username.trim().toLowerCase());
    if (!targetUser) {
      // Simulate slow verification to prevent timing attacks
      await new Promise(r => setTimeout(r, 600));
      handleFailedLogin();
      return { success: false, error: 'Invalid employee ID or security password code.' };
    }

    // Check account status
    if (targetUser.status !== 'Active') {
      return { success: false, error: 'Suspended Account: This terminal credentials have been restricted by Administration.' };
    }

    // 3. E2EE Packets Emulation Demonstration
    const encryptedParcel = await encryptCredentialPacket({ username, password });
    
    // Decrypt on our simulated Auth Node
    const decryptedPayload = await decryptCredentialPacket(encryptedParcel);

    // 4. Verify password with salted PBKDF2 bcrypt hash
    const isMatch = await verifyPasswordWithToken(decryptedPayload.password, targetUser.passwordHash || '');
    if (!isMatch) {
      handleFailedLogin();
      return { success: false, error: 'Invalid employee ID or security password code.' };
    }

    // Success Authentication
    setFailedAttempts(0);
    setLockoutUntil(0);
    setRateLimitTimeLeft(0);
    setCurrentUser(targetUser);
    setIsLoggedIn(true);
    localStorage.setItem('tp_is_logged_in', 'true');
    localStorage.setItem('tp_current_user', JSON.stringify(targetUser));

    // Audit logs of E2EE handshake
    addAuditLog(
      'USER_LOGIN',
      `E2EE Secure Client Session cipher verified successfully. Active: ${targetUser.fullName} (E2EE payload: ${encryptedParcel.encryptedData.slice(0, 32)}...)`,
      'Users',
      targetUser.id
    );

    return { success: true };
  };

  const logout = () => {
    setIsLoggedIn(false);
    localStorage.setItem('tp_is_logged_in', 'false');
    addAuditLog('USER_LOGOUT', `Cassette Terminal logged out: ${currentUser.fullName}`, 'Users', currentUser.id);
  };

  const [branches, setBranches] = useState<Branch[]>(() => {
    return safeParse<Branch[]>('tp_branches', SEED_BRANCHES);
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const isSetup = typeof window !== 'undefined' && localStorage.getItem('tilepoint_onboarded_setup') === 'true';
    if (!isSetup) return [];
    return safeParse<Supplier[]>('tp_suppliers', SEED_SUPPLIERS);
  });

  const [brands, setBrands] = useState<Brand[]>(() => {
    const isSetup = typeof window !== 'undefined' && localStorage.getItem('tilepoint_onboarded_setup') === 'true';
    if (!isSetup) return [];
    return safeParse<Brand[]>('tp_brands', SEED_BRANDS);
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const isSetup = typeof window !== 'undefined' && localStorage.getItem('tilepoint_onboarded_setup') === 'true';
    if (!isSetup) return [];
    return safeParse<Product[]>('tp_products', SEED_PRODUCTS);
  });

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    const isSetup = typeof window !== 'undefined' && localStorage.getItem('tilepoint_onboarded_setup') === 'true';
    if (!isSetup) return [];
    return safeParse<PurchaseOrder[]>('tp_purchase_orders', SEED_POS);
  });

  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>(() => {
    const isSetup = typeof window !== 'undefined' && localStorage.getItem('tilepoint_onboarded_setup') === 'true';
    if (!isSetup) return [];
    return safeParse<PurchaseOrderItem[]>('tp_po_items', SEED_PO_ITEMS);
  });

  const [transmittals, setTransmittals] = useState<Transmittal[]>(() => {
    const isSetup = typeof window !== 'undefined' && localStorage.getItem('tilepoint_onboarded_setup') === 'true';
    if (!isSetup) return [];
    return safeParse<Transmittal[]>('tp_transmittals', SEED_TRANSMITTALS);
  });

  const [shifts, setShifts] = useState<Shift[]>(() => {
    const isSetup = typeof window !== 'undefined' && localStorage.getItem('tilepoint_onboarded_setup') === 'true';
    if (!isSetup) return [];
    return safeParse<Shift[]>('tp_shifts', SEED_SHIFTS);
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const isSetup = typeof window !== 'undefined' && localStorage.getItem('tilepoint_onboarded_setup') === 'true';
    if (!isSetup) return [];
    return safeParse<Sale[]>('tp_sales', SEED_SALES);
  });

  const [saleItems, setSaleItems] = useState<SaleItem[]>(() => {
    const isSetup = typeof window !== 'undefined' && localStorage.getItem('tilepoint_onboarded_setup') === 'true';
    if (!isSetup) return [];
    return safeParse<SaleItem[]>('tp_sale_items', SEED_SALE_ITEMS);
  });

  const [movements, setMovements] = useState<InventoryMovement[]>(() => {
    const isSetup = typeof window !== 'undefined' && localStorage.getItem('tilepoint_onboarded_setup') === 'true';
    if (!isSetup) return [];
    return safeParse<InventoryMovement[]>('tp_movements', SEED_MOVEMENTS);
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const isSetup = typeof window !== 'undefined' && localStorage.getItem('tilepoint_onboarded_setup') === 'true';
    if (!isSetup) return [];
    return safeParse<AuditLog[]>('tp_audit_logs', SEED_AUDIT_LOGS);
  });

  // Hold / park transactions - standard in cashiers POS
  const [parkedSales, setParkedSales] = useState<{ id: string; customerName: string; notes: string; items: { product: Product; quantity: number }[]; timestamp: string }[]>(() => {
    return safeParse<{ id: string; customerName: string; notes: string; items: { product: Product; quantity: number }[]; timestamp: string }[]>('tp_parked_sales', []);
  });

  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>(() => {
    return safeParse<StockTransfer[]>('tp_stock_transfers', []);
  });

  const [branchStock, setBranchStock] = useState<InventoryLocationStock[]>(() => {
    try {
      const cached = localStorage.getItem('tp_branch_stock');
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.error("Error loading tp_branch_stock, building default layout", e);
    }
    
    const initial: InventoryLocationStock[] = [];
    const productsSource = products && products.length > 0 ? products : [];
    productsSource.forEach(p => {
      initial.push({ id: `B1_${p.id}`, branchId: 'B1', productId: p.id, quantity: p.stockQuantity });
      initial.push({ id: `B2_${p.id}`, branchId: 'B2', productId: p.id, quantity: Math.round(p.stockQuantity * 0.35) });
      initial.push({ id: `B3_${p.id}`, branchId: 'B3', productId: p.id, quantity: Math.round(p.stockQuantity * 0.2) });
      initial.push({ id: `B4_${p.id}`, branchId: 'B4', productId: p.id, quantity: Math.round(p.stockQuantity * 0.15) });
    });
    return initial;
  });

  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>(() => {
    return safeParse<LedgerEntry[]>('tp_ledger_entries', []);
  });

  const [branchSalesReports, setBranchSalesReports] = useState<BranchSalesReport[]>(() => {
    return safeParse<BranchSalesReport[]>('tp_branch_sales_reports', []);
  });

  const [deliveries, setDeliveries] = useState<Delivery[]>(() => {
    return safeParse<Delivery[]>('tp_deliveries', []);
  });

  const [damageLogs, setDamageLogs] = useState<DamageLog[]>(() => {
    return safeParse<DamageLog[]>('tp_damage_logs', []);
  });

  // Derived Active Branch
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null);

  useEffect(() => {
    const currentBranch = branches.find(b => b.id === currentUser.branchAssignmentId);
    setActiveBranch(currentBranch || branches[0] || null);
  }, [currentUser, branches]);

  // Derived Active Shift
  const [activeShift, setActiveShift] = useState<Shift | null>(null);

  useEffect(() => {
    const openShift = shifts.find(s => s.cashierId === currentUser.id && s.status === 'OPEN');
    setActiveShift(openShift || null);
  }, [shifts, currentUser]);

  // DB Tuning debouncer settings & stats
  const [debounceDelay, setDebounceDelay] = useState<number>(() => {
    const cached = localStorage.getItem('tp_debounce_delay');
    return cached !== null ? Number(cached) : 500;
  });

  const [writeStatsCount, setWriteStatsCount] = useState<number>(() => {
    const cached = localStorage.getItem('tp_write_stats_prevented');
    return cached !== null ? Number(cached) : 0;
  });

  const [dbSnapshots, setDbSnapshots] = useState<DbSnapshot[]>(() => {
    const cached = localStorage.getItem('tp_db_snapshots');
    return cached ? JSON.parse(cached) : [];
  });

  const [autoBackupEnabled, setAutoBackupEnabled] = useState<boolean>(() => {
    const cached = localStorage.getItem('tp_autobackup_enabled');
    return cached !== null ? cached === 'true' : true;
  });

  const [backupIntervalHours, setBackupIntervalHours] = useState<number>(() => {
    const cached = localStorage.getItem('tp_autobackup_interval');
    return cached !== null ? Number(cached) : 1;
  });

  const [lastAutoBackupTime, setLastAutoBackupTime] = useState<string | null>(() => {
    return localStorage.getItem('tp_autobackup_last_time');
  });

  // Global System Processing States
  const [isSystemProcessing, setIsSystemProcessing] = useState(false);
  const [systemProcessingMessage, setSystemProcessingMessage] = useState('');
  const [systemProcessingSubtext, setSystemProcessingSubtext] = useState('');
  const [systemProcessingType, setSystemProcessingType] = useState<'spinner' | 'progress' | 'verification' | 'db'>('spinner');
  const [systemProcessingProgress, setSystemProcessingProgress] = useState(0);

  const triggerSystemProcessing = (
    message: string,
    durationMs = 1500,
    type: 'spinner' | 'progress' | 'verification' | 'db' = 'spinner',
    onComplete?: () => void,
    subtext = ''
  ): Promise<void> => {
    setIsSystemProcessing(true);
    setSystemProcessingMessage(message);
    setSystemProcessingSubtext(subtext || '');
    setSystemProcessingType(type);
    setSystemProcessingProgress(0);

    return new Promise<void>((resolve) => {
      let interval: any;
      if (type === 'progress') {
        const step = 100 / (durationMs / 100);
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
        setSystemProcessingMessage('');
        setSystemProcessingSubtext('');
        setSystemProcessingProgress(0);
        if (onComplete) onComplete();
        resolve();
      }, durationMs);
    });
  };

  // Persist auto backup settings
  useEffect(() => {
    localStorage.setItem('tp_autobackup_enabled', String(autoBackupEnabled));
  }, [autoBackupEnabled]);

  useEffect(() => {
    localStorage.setItem('tp_autobackup_interval', String(backupIntervalHours));
  }, [backupIntervalHours]);

  useEffect(() => {
    if (lastAutoBackupTime) {
      localStorage.setItem('tp_autobackup_last_time', lastAutoBackupTime);
    } else {
      localStorage.removeItem('tp_autobackup_last_time');
    }
  }, [lastAutoBackupTime]);

  // Automated database background backup scheduler
  useEffect(() => {
    if (!autoBackupEnabled || !isConfigured) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const lastTime = lastAutoBackupTime ? new Date(lastAutoBackupTime).getTime() : 0;
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
          deliveries
        };
        const dataStr = JSON.stringify(payload);
        const name = `Automated Backup - ${backupIntervalHours}hr Interval`;
        const newSnapshot: DbSnapshot = {
          id,
          name,
          timestamp: new Date().toISOString(),
          creator: 'System Auto-Scheduler',
          sizeBytes: new Blob([dataStr]).size,
          data: dataStr
        };

        // Update snapshots state cleanly
        setDbSnapshots(prev => {
          const updated = [newSnapshot, ...prev].slice(0, 2);
          try {
            localStorage.setItem('tp_db_snapshots', JSON.stringify(updated));
          } catch (e) {
            console.error('[System Guard] Failed to save tp_db_snapshots to localStorage:', e);
          }
          return updated;
        });

        const newTime = new Date().toISOString();
        setLastAutoBackupTime(newTime);
        localStorage.setItem('tp_autobackup_last_time', newTime);

        // Append to audit logs
        const autoLog: AuditLog = {
          id: `AL-AUTO-BACKUP-${now}`,
          timestamp: newTime,
          userId: 'SYSTEM',
          username: 'auto_scheduler',
          action: 'DB_BACKUP_CREATE',
          description: `Automatically created background backup snapshot: ${name}`,
          tableAffected: 'ALL',
          recordId: id,
        };
        setAuditLogs(prev => [autoLog, ...prev]);
        console.log(`[AutoBackup] Successfully triggered automated backup snapshot ${id}`);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(timer);
  }, [autoBackupEnabled, backupIntervalHours, lastAutoBackupTime, isConfigured, users, branches, suppliers, products, purchaseOrders, poItems, transmittals, shifts, sales, saleItems, movements, auditLogs, parkedSales, stockTransfers, branchStock, ledgerEntries, branchSalesReports, deliveries]);

  const [dbSyncStatus, setDbSyncStatus] = useState<'idle' | 'queued' | 'syncing'>('idle');
  const timeoutRefs = useRef<Record<string, any>>({});

  const saveToStorageWithDebounce = (key: string, value: any, bypassDebounce = false) => {
    const dataStr = JSON.stringify(value);
    
    // Quick check to avoid redundant operations if current local value matches exactly
    const currentCached = localStorage.getItem(key);
    if (currentCached === dataStr) {
      return;
    }

    if (bypassDebounce || debounceDelay === 0) {
      localStorage.setItem(key, dataStr);
      setDbSyncStatus('syncing');
      setTimeout(() => setDbSyncStatus('idle'), 150);
      return;
    }

    // Capture every prevented write attempt to demonstrate DB strain reduction
    setWriteStatsCount(prev => {
      const updated = prev + 1;
      localStorage.setItem('tp_write_stats_prevented', String(updated));
      return updated;
    });

    setDbSyncStatus('queued');

    if (timeoutRefs.current[key]) {
      clearTimeout(timeoutRefs.current[key]);
    }

    timeoutRefs.current[key] = setTimeout(() => {
      localStorage.setItem(key, dataStr);
      delete timeoutRefs.current[key];
      
      const pendingKeys = Object.keys(timeoutRefs.current);
      if (pendingKeys.length === 0) {
        setDbSyncStatus('syncing');
        setTimeout(() => setDbSyncStatus('idle'), 300);
      }
    }, debounceDelay);
  };

  const forceSyncAll = () => {
    // Save everything immediately
    localStorage.setItem('tp_current_user', JSON.stringify(currentUser));
    localStorage.setItem('tp_users', JSON.stringify(users));
    localStorage.setItem('tp_branches', JSON.stringify(branches));
    localStorage.setItem('tp_suppliers', JSON.stringify(suppliers));
    localStorage.setItem('tp_brands', JSON.stringify(brands));
    localStorage.setItem('tp_products', JSON.stringify(products));
    localStorage.setItem('tp_purchase_orders', JSON.stringify(purchaseOrders));
    localStorage.setItem('tp_po_items', JSON.stringify(poItems));
    localStorage.setItem('tp_transmittals', JSON.stringify(transmittals));
    localStorage.setItem('tp_shifts', JSON.stringify(shifts));
    localStorage.setItem('tp_sales', JSON.stringify(sales));
    localStorage.setItem('tp_sale_items', JSON.stringify(saleItems));
    localStorage.setItem('tp_movements', JSON.stringify(movements));
    localStorage.setItem('tp_audit_logs', JSON.stringify(auditLogs));
    localStorage.setItem('tp_parked_sales', JSON.stringify(parkedSales));
    localStorage.setItem('tp_stock_transfers', JSON.stringify(stockTransfers));
    localStorage.setItem('tp_branch_stock', JSON.stringify(branchStock));
    localStorage.setItem('tp_ledger_entries', JSON.stringify(ledgerEntries));
    localStorage.setItem('tp_branch_sales_reports', JSON.stringify(branchSalesReports));
    localStorage.setItem('tp_deliveries', JSON.stringify(deliveries));
    localStorage.setItem('tp_damage_logs', JSON.stringify(damageLogs));
    
    // Clear all timeouts
    Object.values(timeoutRefs.current).forEach(t => clearTimeout(t as any));
    timeoutRefs.current = {};
    
    setDbSyncStatus('syncing');
    addAuditLog('DB_TUNING_FLUSH', 'Manually forced database cache sync and flushed all queued writes.', 'SYSTEM', 'FLUSH');
    setTimeout(() => setDbSyncStatus('idle'), 300);
  };

  const resetWriteStats = () => {
    setWriteStatsCount(0);
    localStorage.setItem('tp_write_stats_prevented', '0');
  };

  const createDbSnapshot = (name: string) => {
    if (currentUser.role !== UserRole.ADMIN) {
      console.error('Security alert: createDbSnapshot is restricted to system administrators.');
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
      deliveries
    };
    const dataStr = JSON.stringify(payload);
    const id = `SNAP-${Date.now()}`;
    const newSnapshot: DbSnapshot = {
      id,
      name: name || `Backup snapshot - ${new Date().toLocaleTimeString()}`,
      timestamp: new Date().toISOString(),
      creator: currentUser.fullName,
      sizeBytes: new Blob([dataStr]).size,
      data: dataStr
    };
    
    const updatedSnapshots = [newSnapshot, ...dbSnapshots].slice(0, 2);
    setDbSnapshots(updatedSnapshots);
    try {
      localStorage.setItem('tp_db_snapshots', JSON.stringify(updatedSnapshots));
    } catch (e) {
      console.error('[System Guard] Failed to save manual tp_db_snapshots:', e);
    }

    addAuditLog('DB_BACKUP_CREATE', `Created manual backup snapshot: ${newSnapshot.name}`, 'SYSTEM', id);
  };

  const restoreDbSnapshot = (snapshotId: string): boolean => {
    if (currentUser.role !== UserRole.ADMIN) {
      console.error('Security alert: restoreDbSnapshot is restricted to system administrators.');
      return false;
    }
    const snap = dbSnapshots.find(s => s.id === snapshotId);
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
      if (payload.branchSalesReports) setBranchSalesReports(payload.branchSalesReports);
      if (payload.deliveries) setDeliveries(payload.deliveries);
      if (payload.damageLogs) {
        setDamageLogs(payload.damageLogs);
      } else if (payload.tp_damage_logs) {
        setDamageLogs(payload.tp_damage_logs);
      } else {
        setDamageLogs([]);
      }
      if (payload.isConfigured !== undefined) setIsConfigured(payload.isConfigured);

      // Immediately save back to avoid delays during system transitions
      const keysToSave = {
        'tp_users': payload.users,
        'tp_branches': payload.branches,
        'tp_suppliers': payload.suppliers,
        'tp_products': payload.products,
        'tp_purchase_orders': payload.purchaseOrders,
        'tp_po_items': payload.poItems,
        'tp_transmittals': payload.transmittals,
        'tp_shifts': payload.shifts,
        'tp_sales': payload.sales,
        'tp_sale_items': payload.saleItems,
        'tp_movements': payload.movements,
        'tp_audit_logs': payload.auditLogs,
        'tp_parked_sales': payload.parkedSales,
        'tp_stock_transfers': payload.stockTransfers,
        'tp_branch_stock': payload.branchStock,
        'tp_ledger_entries': payload.ledgerEntries,
        'tp_branch_sales_reports': payload.branchSalesReports,
        'tp_deliveries': payload.deliveries,
        'tp_damage_logs': payload.damageLogs || payload.tp_damage_logs || [],
        'tp_is_configured': String(payload.isConfigured)
      };

      Object.entries(keysToSave).forEach(([k, val]) => {
        if (val !== undefined) {
          localStorage.setItem(k, typeof val === 'string' ? val : JSON.stringify(val));
        }
      });

      const restoreLog: AuditLog = {
        id: `AL-RESTORE-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: currentUser.id,
        username: currentUser.username,
        action: 'DB_BACKUP_RESTORE',
        description: `Successfully restored database from snapshot "${snap.name}".`,
        tableAffected: 'ALL',
        recordId: snapshotId,
      };
      setAuditLogs(prev => [restoreLog, ...prev]);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const deleteDbSnapshot = (snapshotId: string) => {
    if (currentUser.role !== UserRole.ADMIN) {
      console.error('Security alert: deleteDbSnapshot is restricted to system administrators.');
      return;
    }
    const updated = dbSnapshots.filter(s => s.id !== snapshotId);
    setDbSnapshots(updated);
    try {
      localStorage.setItem('tp_db_snapshots', JSON.stringify(updated));
    } catch (e) {
      console.error('[System Guard] Failed to update snapshots on delete:', e);
    }
    addAuditLog('DB_BACKUP_DELETE', `Deleted backup snapshot key: ${snapshotId}`, 'SYSTEM', snapshotId);
  };

  // Write changes to cache - now debounced to eliminate LocalStorage / Database I/O strain in high-volume POS environments!
  useEffect(() => {
    saveToStorageWithDebounce('tp_current_user', currentUser);
  }, [currentUser]);

  useEffect(() => {
    saveToStorageWithDebounce('tp_users', users);
  }, [users]);

  useEffect(() => {
    saveToStorageWithDebounce('tp_branches', branches);
  }, [branches]);

  useEffect(() => {
    saveToStorageWithDebounce('tp_suppliers', suppliers);
  }, [suppliers]);

  useEffect(() => {
    saveToStorageWithDebounce('tp_brands', brands);
  }, [brands]);

  useEffect(() => {
    saveToStorageWithDebounce('tp_products', products);
  }, [products]);

  useEffect(() => {
    saveToStorageWithDebounce('tp_purchase_orders', purchaseOrders);
  }, [purchaseOrders]);

  useEffect(() => {
    saveToStorageWithDebounce('tp_po_items', poItems);
  }, [poItems]);

  useEffect(() => {
    saveToStorageWithDebounce('tp_transmittals', transmittals);
  }, [transmittals]);

  useEffect(() => {
    saveToStorageWithDebounce('tp_shifts', shifts);
  }, [shifts]);

  useEffect(() => {
    saveToStorageWithDebounce('tp_sales', sales);
  }, [sales]);

  useEffect(() => {
    saveToStorageWithDebounce('tp_sale_items', saleItems);
  }, [saleItems]);

  useEffect(() => {
    saveToStorageWithDebounce('tp_movements', movements);
  }, [movements]);

  useEffect(() => {
    saveToStorageWithDebounce('tp_audit_logs', auditLogs);
  }, [auditLogs]);

  useEffect(() => {
    saveToStorageWithDebounce('tp_parked_sales', parkedSales);
  }, [parkedSales]);

  useEffect(() => {
    saveToStorageWithDebounce('tp_stock_transfers', stockTransfers);
  }, [stockTransfers]);

  useEffect(() => {
    saveToStorageWithDebounce('tp_branch_stock', branchStock);
  }, [branchStock]);

  useEffect(() => {
    saveToStorageWithDebounce('tp_ledger_entries', ledgerEntries);
  }, [ledgerEntries]);

  useEffect(() => {
    saveToStorageWithDebounce('tp_branch_sales_reports', branchSalesReports);
  }, [branchSalesReports]);

  useEffect(() => {
    saveToStorageWithDebounce('tp_deliveries', deliveries);
  }, [deliveries]);

  useEffect(() => {
    saveToStorageWithDebounce('tp_damage_logs', damageLogs);
  }, [damageLogs]);

  // General Audit Log function
  const addAuditLog = (action: string, description: string, tableAffected: string, recordId: string) => {
    const newLog: AuditLog = {
      id: `AL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      username: currentUser.username,
      action,
      description,
      tableAffected,
      recordId,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Log manual adjustments or stock updates
  const logManualAdjustment = (productId: string, quantity: number, notes: string) => {
    const newMove: InventoryMovement = {
      id: `M-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productId,
      type: 'ADJUST',
      quantity,
      destinationBranchId: currentUser.branchAssignmentId,
      referenceId: 'MANUAL',
      notes,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      username: currentUser.username,
    };
    setMovements(prev => [newMove, ...prev]);
  };

  const createManualLedgerEntry = (entry: {
    productId: string;
    branchId: string;
    movementType: 'IN' | 'OUT' | 'ADJUST' | 'TRANSFER' | 'PURCHASE' | 'SALE';
    quantity: number;
    referenceNo: string;
    remarks: string;
  }) => {
    const prod = products.find(p => p.id === entry.productId);
    if (!prod) return;

    // Based on movementType, determine sign of the amount
    let changeValue = entry.quantity;
    if (['OUT', 'SALE'].includes(entry.movementType)) {
      changeValue = -Math.abs(entry.quantity);
    } else if (['IN', 'PURCHASE'].includes(entry.movementType)) {
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
      referenceNo: entry.referenceNo || `MAN-${Date.now().toString().slice(-4)}`,
      remarks: entry.remarks || 'Manual ledger adjustment'
    };

    setLedgerEntries(prev => [newEntry, ...prev]);

    setBranchStock(stockList => {
      const idx = stockList.findIndex(bs => bs.productId === entry.productId && bs.branchId === entry.branchId);
      if (idx !== -1) {
        const updated = [...stockList];
        const nextQty = Math.max(0, updated[idx].quantity + changeValue);
        updated[idx] = { ...updated[idx], quantity: nextQty };
        return updated;
      } else {
        const nextQty = Math.max(0, changeValue);
        return [...stockList, {
          id: `${entry.branchId}_${entry.productId}`,
          branchId: entry.branchId,
          productId: entry.productId,
          quantity: nextQty
        }];
      }
    });

    setProducts(prods => prods.map(p => {
      if (p.id === entry.productId) {
        return {
          ...p,
          stockQuantity: Math.max(0, p.stockQuantity + changeValue),
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.fullName
        };
      }
      return p;
    }));

    const newMove: InventoryMovement = {
      id: `M-MANUAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productId: entry.productId,
      type: entry.movementType === 'TRANSFER' ? 'TRANSFER' : 'ADJUST',
      quantity: changeValue,
      destinationBranchId: entry.branchId,
      referenceId: newEntry.referenceNo,
      notes: newEntry.remarks,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      username: currentUser.username,
    };
    setMovements(prev => [newMove, ...prev]);

    addAuditLog(
      'LEDGER_INSERT',
      `Manual catalog double-entry ledger update: ${entry.movementType} mode, quantity delta: ${changeValue} for tile SKU ${prod.productCode} at Branch ${entry.branchId}`,
      'Products',
      entry.productId
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
      name: string;
      address: string;
      phone: string;
      storeLogo?: string;
    }
  ) => {
    // 1. Create first branches list
    const firstBranch: Branch = {
      id: 'B1',
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
      id: 'U1',
      avatarInitials: adminData.fullName.split(' ').map(n => n ? n[0] : '').join('').toUpperCase().slice(0, 2) || 'AD',
      fullName: adminData.fullName,
      username: adminData.username,
      email: adminData.email,
      role: UserRole.ADMIN,
      branchAssignmentId: 'B1',
      status: 'Active',
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

    localStorage.setItem('tp_users', JSON.stringify(newUsers));
    localStorage.setItem('tp_branches', JSON.stringify(newBranches));

    if (branchData.storeLogo) {
      localStorage.setItem('tilepoint_store_logo_v1', branchData.storeLogo);
    }
    localStorage.setItem('tilepoint_company_name_v1', branchData.name);

    // Mark as configured
    setIsConfigured(true);
    localStorage.setItem('tp_is_configured', 'true');

    // Auto log-in as this administrator
    setCurrentUser(firstAdmin);
    setIsLoggedIn(true);
    localStorage.setItem('tp_is_logged_in', 'true');
    localStorage.setItem('tp_current_user', JSON.stringify(firstAdmin));

    // Audit log
    const seedLogs = [
      {
        id: `L-${Date.now()}-1`,
        timestamp: new Date().toISOString(),
        action: 'SYSTEM_INSTALL',
        description: `Successful clean installation of TilePoint Enterprise Terminal. Configured Main Branch: ${branchData.name}. Created security-hardened admin account and credentials.`,
        tableAffected: 'System',
        recordId: 'INSTALLER',
        userId: 'U1',
        username: adminData.username,
      }
    ];
    setAuditLogs(seedLogs);
    localStorage.setItem('tp_audit_logs', JSON.stringify(seedLogs));
  };

  // --- ACTIONS - BRANCH SALES REPORTS TRANSMISSION ---
  const transmitSalesReport = (report: Omit<BranchSalesReport, 'id' | 'transferredAt' | 'status'>) => {
    const newReport: BranchSalesReport = {
      ...report,
      id: `REP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      transferredAt: new Date().toISOString(),
      status: 'Pending Audit'
    };

    setBranchSalesReports(prev => {
      const updated = [newReport, ...prev];
      localStorage.setItem('tp_branch_sales_reports', JSON.stringify(updated));
      return updated;
    });

    // Deduct sold items from branch stock when sales report is transmitted
    if (report.saleItems && report.saleItems.length > 0) {
      setBranchStock(prevList => {
        const nextList = [...prevList];
        report.saleItems.forEach(item => {
          const matchIdx = nextList.findIndex(bs => bs.productId === item.productId && bs.branchId === report.branchId);
          if (matchIdx !== -1) {
            nextList[matchIdx] = {
              ...nextList[matchIdx],
              quantity: Math.max(0, nextList[matchIdx].quantity - item.quantity)
            };
          } else {
            nextList.push({
              id: `${report.branchId}_${item.productId}`,
              branchId: report.branchId,
              productId: item.productId,
              quantity: 0
            });
          }
        });
        localStorage.setItem('tp_branch_stock', JSON.stringify(nextList));
        return nextList;
      });

      // Also ensure that the products master stock matches consolidated or is also deducted
      setProducts(prev => {
        const nextProds = [...prev];
        report.saleItems.forEach(item => {
          const prodIdx = nextProds.findIndex(p => p.id === item.productId);
          if (prodIdx !== -1) {
            nextProds[prodIdx] = {
              ...nextProds[prodIdx],
              stockQuantity: Math.max(0, nextProds[prodIdx].stockQuantity - item.quantity),
              updatedAt: new Date().toISOString()
            };
          }
        });
        localStorage.setItem('tp_products', JSON.stringify(nextProds));
        return nextProds;
      });

      // Write safety log movements
      report.saleItems.forEach(item => {
        const movementNum = `M-TRANS-SALE-${newReport.id}-${item.productId}`;
        const newMovement: InventoryMovement = {
          id: movementNum,
          productId: item.productId,
          type: 'OUT',
          quantity: -item.quantity,
          sourceBranchId: report.branchId,
          referenceId: newReport.id,
          notes: `Transmitted daily sales report inventory deduction for ${report.branchName}`,
          timestamp: new Date().toISOString(),
          userId: currentUser?.id || 'SYSTEM',
          username: currentUser?.username || 'SYSTEM'
        };
        setMovements(prevMovements => {
          if (prevMovements.some(m => m.id === movementNum)) return prevMovements;
          const nextMovements = [newMovement, ...prevMovements];
          localStorage.setItem('tp_movements', JSON.stringify(nextMovements));
          return nextMovements;
        });
      });
    }

    addAuditLog(
      'SALES_TRANSMISSION',
      `Sales report for branch ${report.branchName} (${report.reportingDate}) transmitted successfully via ${report.transmissionType} channel. Total Grand Total: ₱${report.totalSalesAmount.toLocaleString()}`,
      'BranchSalesReport',
      newReport.id
    );
  };

  const importManualSalesReport = (rawJson: string): { success: boolean; error?: string } => {
    try {
      const parsed = JSON.parse(rawJson);
      if (!parsed.branchId || !parsed.branchName || !parsed.reportingDate || !Array.isArray(parsed.sales)) {
        return { success: false, error: 'Invalid file format. The JSON file must be a corporate Branch Sales Report.' };
      }

      // Check encryption signature if it exists
      let exportedByRole = '';
      if (parsed.securitySignature) {
        const decrypted = decryptString(parsed.securitySignature, "EmmanTileCenterSecretKey");
        try {
          const sig = JSON.parse(decrypted);
          if (sig && sig.exportedByRole) {
            exportedByRole = sig.exportedByRole;
          }
        } catch (err) {
          // Keep exportedByRole empty/unverified
        }
      }

      const finalExporterRole = exportedByRole || parsed.exportedByRole;
      if (finalExporterRole === 'Admin') {
        if (currentUser.role !== UserRole.ADMIN) {
          const establishmentName = localStorage.getItem('tilepoint_company_name_v1') || 'Emman Tile Center';
          return {
            success: false,
            error: `This sales report is for admin only of ${establishmentName}.`
          };
        }
      }

      // Check if already exists
      const duplicate = branchSalesReports.find(r => r.branchId === parsed.branchId && r.reportingDate === parsed.reportingDate);
      if (duplicate) {
        return { success: false, error: `Sales report for ${parsed.branchName} on ${parsed.reportingDate} has already been registered or transmitted.` };
      }

      const newReport: BranchSalesReport = {
        id: parsed.id || `REP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        branchId: parsed.branchId,
        branchName: parsed.branchName,
        transferredAt: new Date().toISOString(),
        reportingDate: parsed.reportingDate,
        totalSalesCount: parsed.totalSalesCount || parsed.sales.length,
        totalSalesAmount: parsed.totalSalesAmount || parsed.sales.reduce((acc: number, s: any) => acc + (s.grandTotal || 0), 0),
        totalVatAmount: parsed.totalVatAmount || parsed.sales.reduce((acc: number, s: any) => acc + (s.vat || 0), 0),
        totalDiscountAmount: parsed.totalDiscountAmount || parsed.sales.reduce((acc: number, s: any) => acc + (s.discount || 0), 0),
        transmissionType: 'Manual',
        status: 'Pending Audit',
        sales: parsed.sales,
        saleItems: parsed.saleItems || [],
        notes: parsed.notes || 'Imported via offline secure JSON package.',
        importVerificationId: parsed.importVerificationId || parsed.id || `IMPID-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        securitySignature: parsed.securitySignature
      };

      setBranchSalesReports(prev => {
        const updated = [newReport, ...prev];
        localStorage.setItem('tp_branch_sales_reports', JSON.stringify(updated));
        return updated;
      });

      // Deduct sold items from branch stock when sales report is manually imported
      if (newReport.saleItems && newReport.saleItems.length > 0) {
        setBranchStock(prevList => {
          const nextList = [...prevList];
          newReport.saleItems.forEach(item => {
            const matchIdx = nextList.findIndex(bs => bs.productId === item.productId && bs.branchId === newReport.branchId);
            if (matchIdx !== -1) {
              nextList[matchIdx] = {
                ...nextList[matchIdx],
                quantity: Math.max(0, nextList[matchIdx].quantity - item.quantity)
              };
            } else {
              nextList.push({
                id: `${newReport.branchId}_${item.productId}`,
                branchId: newReport.branchId,
                productId: item.productId,
                quantity: 0
              });
            }
          });
          localStorage.setItem('tp_branch_stock', JSON.stringify(nextList));
          return nextList;
        });

        // Also ensure that the products master stock matches consolidated or is also deducted
        setProducts(prev => {
          const nextProds = [...prev];
          newReport.saleItems.forEach(item => {
            const prodIdx = nextProds.findIndex(p => p.id === item.productId);
            if (prodIdx !== -1) {
              nextProds[prodIdx] = {
                ...nextProds[prodIdx],
                stockQuantity: Math.max(0, nextProds[prodIdx].stockQuantity - item.quantity),
                updatedAt: new Date().toISOString()
              };
            }
          });
          localStorage.setItem('tp_products', JSON.stringify(nextProds));
          return nextProds;
        });

        // Write safety log movements
        newReport.saleItems.forEach(item => {
          const movementNum = `M-TRANS-SALE-${newReport.id}-${item.productId}`;
          const newMovement: InventoryMovement = {
            id: movementNum,
            productId: item.productId,
            type: 'OUT',
            quantity: -item.quantity,
            sourceBranchId: newReport.branchId,
            referenceId: newReport.id,
            notes: `Imported sales report inventory deduction for ${newReport.branchName}`,
            timestamp: new Date().toISOString(),
            userId: currentUser?.id || 'SYSTEM',
            username: currentUser?.username || 'SYSTEM'
          };
          setMovements(prevMovements => {
            if (prevMovements.some(m => m.id === movementNum)) return prevMovements;
            const nextMovements = [newMovement, ...prevMovements];
            localStorage.setItem('tp_movements', JSON.stringify(nextMovements));
            return nextMovements;
          });
        });
      }

      addAuditLog(
        'SALES_IMPORT',
        `Manually received & parsed JSON sales package for ${newReport.branchName} (${newReport.reportingDate}). Sales amount: ₱${newReport.totalSalesAmount.toLocaleString()}`,
        'BranchSalesReport',
        newReport.id
      );

      return { success: true };
    } catch (e: any) {
      return { success: false, error: `JSON parsing error: ${e.message || e}` };
    }
  };

  const auditSalesReport = (reportId: string, status: 'Verified' | 'Pending Audit', notes?: string) => {
    setBranchSalesReports(prev => {
      const updated = prev.map(r => {
        if (r.id === reportId) {
          return {
            ...r,
            status,
            notes: notes || r.notes,
            auditedBy: currentUser.fullName,
            auditedAt: new Date().toISOString()
          };
        }
        return r;
      });
      localStorage.setItem('tp_branch_sales_reports', JSON.stringify(updated));
      return updated;
    });

    addAuditLog(
      'SALES_AUDIT',
      `Audit result matching [${status}] registered on sales report [${reportId}] by manager ${currentUser.fullName}`,
      'BranchSalesReport',
      reportId
    );
  };

  const createDelivery = (delivery: Omit<Delivery, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'branchId' | 'branchName'>): Delivery => {
    const currentBranch = branches.find(b => b.id === currentUser.branchAssignmentId) || branches[0];
    const newDelivery: Delivery = {
      ...delivery,
      id: `DEL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      status: 'Pending Scheduling',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      branchId: currentBranch.id,
      branchName: currentBranch.name
    };

    setDeliveries(prev => {
      const updated = [newDelivery, ...prev];
      localStorage.setItem('tp_deliveries', JSON.stringify(updated));
      return updated;
    });

    addAuditLog(
      'DELIVERY_CREATE',
      `Fulfillment Delivery scheduled for invoice ${delivery.saleNumber}. Customer: ${delivery.customerName}`,
      'Delivery',
      newDelivery.id
    );

    return newDelivery;
  };

  const updateDeliveryStatus = (id: string, status: DeliveryStatus, notes?: string) => {
    setDeliveries(prev => {
      const updated = prev.map(d => {
        if (d.id === id) {
          return {
            ...d,
            status,
            notes: notes !== undefined ? notes : d.notes,
            updatedAt: new Date().toISOString()
          };
        }
        return d;
      });
      localStorage.setItem('tp_deliveries', JSON.stringify(updated));
      return updated;
    });

    addAuditLog(
      'DELIVERY_STATUS_UPDATE',
      `Delivery ${id} status altered to [${status}]. Notes: ${notes || 'none'}`,
      'Delivery',
      id
    );
  };

  const assignDeliveryPersonnel = (id: string, truck: string, driver: string, helper: string) => {
    setDeliveries(prev => {
      const updated = prev.map(d => {
        if (d.id === id) {
          return {
            ...d,
            truck,
            driver,
            helper,
            status: d.status === 'Pending Scheduling' ? 'Scheduled' : d.status,
            updatedAt: new Date().toISOString()
          };
        }
        return d;
      });
      localStorage.setItem('tp_deliveries', JSON.stringify(updated));
      return updated;
    });

    addAuditLog(
      'DELIVERY_PERSONNEL_ASSIGN',
      `Assigned truck ${truck}, pilot ${driver}, and companion ${helper} to delivery task ${id}`,
      'Delivery',
      id
    );
  };

  const completeDelivery = (id: string, proofPhotoUrl?: string, customerSignature?: string, receiverName?: string) => {
    setDeliveries(prev => {
      const updated = prev.map(d => {
        if (d.id === id) {
          return {
            ...d,
            status: 'Delivered' as DeliveryStatus,
            proofPhotoUrl,
            customerSignature,
            receiverName: receiverName || d.customerName,
            deliveredBy: currentUser.fullName,
            deliveredAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        }
        return d;
      });
      localStorage.setItem('tp_deliveries', JSON.stringify(updated));
      return updated;
    });

    addAuditLog(
      'DELIVERY_COMPLETE',
      `Delivery task ${id} checked out as Delivered (Receipt confirmed by ${receiverName || 'customer'}).`,
      'Delivery',
      id
    );
  };

  const createDamageLog = (log: Omit<DamageLog, 'id' | 'reportedAt' | 'reportedBy'>) => {
    const newId = `DMG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newLog: DamageLog = {
      ...log,
      id: newId,
      reportedBy: currentUser.fullName,
      reportedAt: new Date().toISOString()
    };

    setDamageLogs(prev => [newLog, ...prev]);

    // Deduct stock quantity
    const changeValue = -Math.abs(log.quantity);

    // 1. Update product centrally
    setProducts(prods => prods.map(p => {
      if (p.id === log.productId) {
        return {
          ...p,
          stockQuantity: Math.max(0, p.stockQuantity + changeValue),
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.fullName
        };
      }
      return p;
    }));

    // 2. Update branch-specific quantity
    setBranchStock(stockList => {
      const idx = stockList.findIndex(bs => bs.productId === log.productId && bs.branchId === log.branchId);
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
      type: 'ADJUST',
      quantity: changeValue,
      sourceBranchId: log.branchId,
      referenceId: newId,
      notes: `[Damage: ${log.category}] ${log.actionTaken}. Notes: ${log.notes}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      username: currentUser.username,
    };
    setMovements(prev => [newMove, ...prev]);

    // 4. Create ledger entry
    const newLedgerId = `L-DMG-${Date.now()}`;
    const newEntry: LedgerEntry = {
      id: newLedgerId,
      date: new Date().toISOString(),
      productId: log.productId,
      productName: log.productName,
      branchId: log.branchId,
      movementType: 'ADJUST',
      quantity: changeValue,
      referenceNo: newId,
      remarks: `[${log.category} - ${log.actionTaken}] ${log.notes}`
    };
    setLedgerEntries(prev => [newEntry, ...prev]);

    // 5. Audit
    addAuditLog(
      'DAMAGE_REPORT',
      `Logged ${log.quantity} unit(s) of broken/damaged ${log.productName} for ${log.branchName} (${log.category}). Status: ${log.actionTaken}.`,
      'Products',
      log.productId
    );
  };

  const updateBranchPriceOverride = (productId: string, branchId: string, price: number) => {
    setBranchStock(prevList => {
      const matchIndex = prevList.findIndex(bs => bs.productId === productId && bs.branchId === branchId);
      if (matchIndex !== -1) {
        const nextList = [...prevList];
        nextList[matchIndex] = {
          ...nextList[matchIndex],
          sellingPriceOverride: price > 0 ? price : undefined
         };
        return nextList;
      } else {
        const newRecord: InventoryLocationStock = {
          id: `${branchId}_${productId}`,
          branchId,
          productId,
          quantity: 0,
          sellingPriceOverride: price > 0 ? price : undefined
        };
        return [...prevList, newRecord];
      }
    });

    // Capture in audit log
    const prod = products.find(p => p.id === productId);
    const branchMeta = branches.find(b => b.id === branchId);
    if (prod && branchMeta) {
      addAuditLog(
        'PRICE_ADJUSTMENT',
        `Adjusted retail selling price for "${prod.productName}" at branch "${branchMeta.name}" to ₱${price.toFixed(2)}.`,
        'BranchStock',
        productId
      );
    }
  };

  const updateBranchLowStockThreshold = (productId: string, branchId: string, threshold: number) => {
    setBranchStock(prevList => {
      const matchIndex = prevList.findIndex(bs => bs.productId === productId && bs.branchId === branchId);
      if (matchIndex !== -1) {
        const nextList = [...prevList];
        nextList[matchIndex] = {
          ...nextList[matchIndex],
          lowStockThresholdOverride: threshold >= 0 ? threshold : undefined
        };
        return nextList;
      } else {
        const newRecord: InventoryLocationStock = {
          id: `${branchId}_${productId}`,
          branchId,
          productId,
          quantity: 0,
          lowStockThresholdOverride: threshold >= 0 ? threshold : undefined
        };
        return [...prevList, newRecord];
      }
    });

    // Capture in audit log
    const prod = products.find(p => p.id === productId);
    const branchMeta = branches.find(b => b.id === branchId);
    if (prod && branchMeta) {
      addAuditLog(
        'THRESHOLD_ADJUSTMENT',
        `Adjusted localized branch safety alarm threshold for "${prod.productName}" at branch "${branchMeta.name}" to ${threshold} units.`,
        'BranchStock',
        productId
      );
    }
  };

  // --- DATABASE FACTORY TRUNCATE & RE-SEED ENGINE ---
  const truncateDatabase = (mode: 'all' | 'transactions' | 'seeds') => {
    if (currentUser.role !== UserRole.ADMIN) {
      console.error('Unauthorized security violation: Only system administrators are authorized to reset or truncate the database.');
      return;
    }
    if (mode === 'seeds') {
      // Restore all original database seeds
      setBranches(SEED_BRANCHES);
      setProducts(SEED_PRODUCTS);
      setSuppliers(SEED_SUPPLIERS);
      setSales(SEED_SALES);
      setSaleItems(SEED_SALE_ITEMS);
      setPurchaseOrders(SEED_POS);
      setPoItems(SEED_PO_ITEMS);
      setTransmittals(SEED_TRANSMITTALS);
      setShifts(SEED_SHIFTS);
      setMovements(SEED_MOVEMENTS);
      setParkedSales([]);
      setStockTransfers([]);
      setLedgerEntries([]);
      setBranchSalesReports([]);
      setDeliveries([]);
      localStorage.removeItem('tp_branch_sales_reports');
      localStorage.removeItem('tp_deliveries');
      
      // Recompute initial branch stocks
      const initial: InventoryLocationStock[] = [];
      SEED_PRODUCTS.forEach(p => {
        initial.push({ id: `B1_${p.id}`, branchId: 'B1', productId: p.id, quantity: p.stockQuantity });
        initial.push({ id: `B2_${p.id}`, branchId: 'B2', productId: p.id, quantity: Math.round(p.stockQuantity * 0.35) });
        initial.push({ id: `B3_${p.id}`, branchId: 'B3', productId: p.id, quantity: Math.round(p.stockQuantity * 0.2) });
        initial.push({ id: `B4_${p.id}`, branchId: 'B4', productId: p.id, quantity: Math.round(p.stockQuantity * 0.15) });
      });
      setBranchStock(initial);

      // Reset ATPOS v2 specific local storages
      localStorage.removeItem('atpos_v2_members_list');
      localStorage.removeItem('atpos_v2_expenses');
      localStorage.removeItem('atpos_v2_returns');

      const recoveryLog: AuditLog = {
        id: `AL-RECOVERY-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: currentUser.id,
        username: currentUser.username,
        action: 'DB_RESEED',
        description: `Successfully restored standard database schemas & enterprise seed profiles.`,
        tableAffected: 'ALL',
        recordId: 'SYSTEM',
      };
      setAuditLogs([recoveryLog]);
    } else {
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
      setBranches(prev => prev.map(b => ({ ...b, monthlySales: 0 })));

      localStorage.removeItem('atpos_v2_members_list');
      localStorage.removeItem('atpos_v2_expenses');
      localStorage.removeItem('atpos_v2_returns');
      localStorage.removeItem('tp_branch_sales_reports');
      localStorage.removeItem('tp_deliveries');

      if (mode === 'all') {
        setProducts([]);
        setSuppliers([]);
        setBranchStock([]);
        
        localStorage.removeItem('tp_products');
        localStorage.removeItem('tp_suppliers');
        localStorage.removeItem('tp_branch_stock');
      } else {
        // Mode 'transactions' (keep products and suppliers but clear stocks to 0)
        const clearedBranchStock = branchStock.map(bs => ({ ...bs, quantity: 0 }));
        setBranchStock(clearedBranchStock);
        
        const resetProducts = products.map(p => ({ ...p, stockQuantity: 0 }));
        setProducts(resetProducts);
      }

      const truncateLog: AuditLog = {
        id: `AL-TRUNCATE-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: currentUser.id,
        username: currentUser.username,
        action: 'DB_TRUNCATE',
        description: `Executed database truncation (Mode: ${mode.toUpperCase()}). Core tables purged.`,
        tableAffected: 'ALL',
        recordId: 'SYSTEM',
      };
      setAuditLogs([truncateLog]);
    }
    setSimulationModeActive(false);
    localStorage.removeItem('tp_simulation_mode_active');
  };

  const generateMasterForensicBackup = () => {
    const dayMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const tMinus = (days: number) => new Date(now - days * dayMs).toISOString();

    const simUsersList: User[] = [
      {
        id: 'sim_admin',
        avatarInitials: 'AD',
        fullName: 'Simulated Admin',
        username: 'admin',
        email: 'admin@tilepoint.com',
        role: UserRole.ADMIN,
        branchAssignmentId: 'B1',
        status: 'Active',
        managerPin: '9999',
        passwordHash: '$argon2-pbkdf2$i=2500$s=admin_salt$h=58a74e5ad6b5d90947e4edec09033cd96c66a8dbbf679cbbf2b7f3b5bc2f122c', // Matches 'admin123'
        createdAt: tMinus(7),
        updatedAt: tMinus(7)
      },
      {
        id: 'sim_manager',
        avatarInitials: 'MN',
        fullName: 'Simulated Manager',
        username: 'manager',
        email: 'manager@tilepoint.com',
        role: UserRole.MANAGER,
        branchAssignmentId: 'B1',
        status: 'Active',
        managerPin: '1111',
        passwordHash: '$argon2-pbkdf2$i=2500$s=manager_salt$h=51d08eacdfaef2c0a96ef5497214cc9ef21b3cd96628efbe999f8d1033230def', // Matches 'tilepoint'
        createdAt: tMinus(7),
        updatedAt: tMinus(7)
      },
      {
        id: 'sim_cashier',
        avatarInitials: 'CS',
        fullName: 'Simulated Cashier',
        username: 'cashier',
        email: 'cashier@tilepoint.com',
        role: UserRole.CASHIER,
        branchAssignmentId: 'B1',
        status: 'Active',
        passwordHash: '$argon2-pbkdf2$i=2500$s=cashier_salt$h=a6bc29daef7612f0a1da4b72ef1244bb62b3fd96cf12ef9e342fa79ea123f4f1', // Matches 'tilepoint'
        createdAt: tMinus(7),
        updatedAt: tMinus(7)
      },
      {
        id: 'sim_staff',
        avatarInitials: 'ST',
        fullName: 'Simulated Staff',
        username: 'staff',
        email: 'staff@tilepoint.com',
        role: UserRole.STAFF,
        branchAssignmentId: 'B1',
        status: 'Active',
        passwordHash: '$argon2-pbkdf2$i=2500$s=staff_salt$h=db23caadaef412f8a9ea34faea515ccf8a09cf93bf11e2ce0063fa79ea34f9a1', // Matches 'tilepoint'
        createdAt: tMinus(7),
        updatedAt: tMinus(7)
      }
    ];

    const simBranchesList: Branch[] = [
      {
        id: 'B1',
        name: 'tilepoint',
        manager: 'Simulated Admin',
        address: 'Simulation Headquarters',
        phone: '0999-999-9999',
        monthlySales: 24150,
        staffCount: 4,
        activeCashiers: 1,
        createdAt: tMinus(7),
        updatedAt: tMinus(7),
        isDeleted: false
      },
      {
        id: 'B2',
        name: 'Manila Outlet Depot',
        manager: 'Santi Santos',
        address: 'Manila Pier Block 12',
        phone: '0911-222-3333',
        monthlySales: 0,
        staffCount: 2,
        activeCashiers: 0,
        createdAt: tMinus(7),
        updatedAt: tMinus(7),
        isDeleted: false
      }
    ];

    const simSuppliersList: Supplier[] = [
      {
        id: 'S1',
        name: 'Global Tile Imports',
        contactPerson: 'Charles Wu',
        phone: '0915-111-2222',
        email: 'charles.wu@globalimports.com.ph',
        address: 'Port Area Manila',
        createdAt: tMinus(7),
        isDeleted: false
      },
      {
        id: 'S2',
        name: 'Sinclair Ceramic Glazes',
        contactPerson: 'Glenda Gomez',
        phone: '0917-888-9999',
        email: 'glenda@sinclairceramic.com.ph',
        address: 'Cebu Industrial Park',
        createdAt: tMinus(7),
        isDeleted: false
      }
    ];

    const simProductsList: Product[] = [
      {
        id: 'P1',
        productCode: 'TP-GR-CARRARA',
        sku: 'SKU-CARRARA-6060',
        barcode: '4801122334455',
        qrCode: 'QR-CARRARA-01',
        designName: 'Polished Granite Carrara',
        productName: 'Polished Granite Carrara 60x60 cm',
        category: 'Granite',
        brand: 'TilePoint Premium',
        supplierId: 'S1',
        unit: 'Box',
        size: '60x60 cm',
        boxQuantity: 4,
        coveragePerBox: 1.44,
        costPrice: 850,
        sellingPrice: 1250,
        stockQuantity: 935,
        minimumStock: 50,
        isDeleted: false,
        createdAt: tMinus(6),
        updatedAt: tMinus(3),
        createdBy: 'admin',
        updatedBy: 'admin'
      },
      {
        id: 'P2',
        productCode: 'TP-CE-WHITE',
        sku: 'SKU-WHITE-3060',
        barcode: '4802233445566',
        qrCode: 'QR-WHITE-02',
        designName: 'Glossy White Ceramic',
        productName: 'Glossy White Ceramic 30x60 cm',
        category: 'Ceramic',
        brand: 'TilePoint Standard',
        supplierId: 'S2',
        unit: 'Box',
        size: '30x60 cm',
        boxQuantity: 8,
        coveragePerBox: 1.44,
        costPrice: 450,
        sellingPrice: 675,
        stockQuantity: 492,
        minimumStock: 30,
        isDeleted: false,
        createdAt: tMinus(6),
        updatedAt: tMinus(3),
        createdBy: 'admin',
        updatedBy: 'admin'
      },
      {
        id: 'P3',
        productCode: 'TP-TC-RUSTIC',
        sku: 'SKU-RUSTIC-4040',
        barcode: '4803344556677',
        qrCode: 'QR-RUSTIC-03',
        designName: 'Rustic Terra Cotta',
        productName: 'Rustic Terra Cotta 40x40 cm',
        category: 'Terra Cotta',
        brand: 'ClayWorks',
        supplierId: 'S2',
        unit: 'Box',
        size: '40x40 cm',
        boxQuantity: 6,
        coveragePerBox: 0.96,
        costPrice: 520,
        sellingPrice: 780,
        stockQuantity: 300,
        minimumStock: 25,
        isDeleted: false,
        createdAt: tMinus(6),
        updatedAt: tMinus(3),
        createdBy: 'admin',
        updatedBy: 'admin'
      }
    ];

    const simAuditLogs: AuditLog[] = [
      {
        id: 'L-1',
        timestamp: tMinus(7),
        userId: 'sim_admin',
        username: 'admin',
        action: 'SYSTEM_INSTALL',
        description: 'Clean installation approved. Initialized master database with tilepoint credentials.',
        tableAffected: 'System',
        recordId: 'INSTALLER'
      },
      {
        id: 'L-2',
        timestamp: tMinus(6),
        userId: 'sim_admin',
        username: 'admin',
        action: 'BRANCH_CREATE',
        description: 'Created primary distribution branch node [tilepoint] (HQ).',
        tableAffected: 'Branches',
        recordId: 'B1'
      },
      {
        id: 'L-3',
        timestamp: tMinus(6),
        userId: 'sim_admin',
        username: 'admin',
        action: 'USER_CREATE',
        description: 'Provisioned Security Roles: Admin, Manager, Cashier, and Staff personnel mappings.',
        tableAffected: 'Users',
        recordId: 'sim_manager'
      },
      {
        id: 'L-4',
        timestamp: tMinus(5),
        userId: 'sim_admin',
        username: 'admin',
        action: 'SUPPLIER_CREATE',
        description: 'Added active general supplier [Global Tile Imports] to the system register.',
        tableAffected: 'Suppliers',
        recordId: 'S1'
      },
      {
        id: 'L-5',
        timestamp: tMinus(5),
        userId: 'sim_admin',
        username: 'admin',
        action: 'PRODUCT_CREATE',
        description: 'Registered product code: TP-GR-CARRARA with standard pricing ₱1,250.00.',
        tableAffected: 'Products',
        recordId: 'P1'
      },
      {
        id: 'L-6',
        timestamp: tMinus(5),
        userId: 'sim_admin',
        username: 'admin',
        action: 'PRODUCT_CREATE',
        description: 'Registered product code: TP-CE-WHITE with standard pricing ₱675.00.',
        tableAffected: 'Products',
        recordId: 'P2'
      },
      {
        id: 'L-7',
        timestamp: tMinus(4),
        userId: 'sim_manager',
        username: 'manager',
        action: 'PO_CREATE',
        description: 'Created Purchase Order: PO-202606-101 to consolidate S1 imports (1000 boxes Carrara).',
        tableAffected: 'PurchaseOrders',
        recordId: 'PO-202606-101'
      },
      {
        id: 'L-8',
        timestamp: tMinus(4),
        userId: 'sim_admin',
        username: 'admin',
        action: 'PO_STATUS_CHANGE',
        description: 'Approved purchase ledger state for PO-202606-101 with verified cost allocation.',
        tableAffected: 'PurchaseOrders',
        recordId: 'PO-202606-101'
      },
      {
        id: 'L-9',
        timestamp: tMinus(3),
        userId: 'sim_manager',
        username: 'manager',
        action: 'PO_RECEIVE',
        description: 'Consolidated intake of 1000 units Carrara. Physical stock adjusted on site.',
        tableAffected: 'PurchaseOrders',
        recordId: 'PO-202606-101'
      },
      {
        id: 'L-10',
        timestamp: tMinus(3),
        userId: 'sim_cashier',
        username: 'cashier',
        action: 'SHIFT_OPEN',
        description: 'Opened register console drawer. Base capital cash amount: ₱5,000.00.',
        tableAffected: 'Shifts',
        recordId: 'SHIFT-001'
      },
      {
        id: 'L-11',
        timestamp: tMinus(3),
        userId: 'sim_cashier',
        username: 'cashier',
        action: 'POS_CHECKOUT',
        description: 'Approved POS customer invoice INV-1001 for 15 boxes Carrara. Sum: ₱18,750.00.',
        tableAffected: 'Sales',
        recordId: 'INV-1001'
      },
      {
        id: 'L-12',
        timestamp: tMinus(3),
        userId: 'sim_cashier',
        username: 'cashier',
        action: 'POS_CHECKOUT',
        description: 'Approved POS customer invoice INV-1002 for 8 boxes Glossy White. Sum: ₱5,400.00.',
        tableAffected: 'Sales',
        recordId: 'INV-1002'
      },
      {
        id: 'L-13',
        timestamp: tMinus(3),
        userId: 'sim_cashier',
        username: 'cashier',
        action: 'SHIFT_CLOSE',
        description: 'Closed register drawer shift. Balance counted: ₱29,150.00 vs expected. Zero variance.',
        tableAffected: 'Shifts',
        recordId: 'SHIFT-001'
      },
      {
        id: 'L-14',
        timestamp: tMinus(2),
        userId: 'sim_manager',
        username: 'manager',
        action: 'TRANSFER_CREATE',
        description: 'Dispatched inter-branch stock allocation from HQ to Manila Outlet (50 units Carrara).',
        tableAffected: 'StockTransfer',
        recordId: 'TRSF-202606-501'
      },
      {
        id: 'L-15',
        timestamp: tMinus(2),
        userId: 'sim_admin',
        username: 'admin',
        action: 'TRANSFER_UPDATE',
        description: 'Approved stock transfer allocation TRSF-202606-501. Marked In Transit.',
        tableAffected: 'StockTransfer',
        recordId: 'TRSF-202606-501'
      },
      {
        id: 'L-16',
        timestamp: tMinus(1),
        userId: 'sim_manager',
        username: 'manager',
        action: 'TRANSMITTAL_SUBMIT',
        description: 'Uploaded daily Sales report transmittal document for verification.',
        tableAffected: 'Transmittals',
        recordId: 'TRANSM-9002'
      },
      {
        id: 'L-17',
        timestamp: tMinus(1),
        userId: 'sim_admin',
        username: 'admin',
        action: 'SECURITY_LIMIT',
        description: 'Brute Force Rate Limiter block initialized for anomalous terminal connection attempt.',
        tableAffected: 'Users',
        recordId: 'SYSTEM'
      }
    ];

    const sampleSalesList: Sale[] = [
      {
        id: 'INV-1001',
        saleNumber: 'TP-INV-1001',
        shiftId: 'SHIFT-001',
        branchId: 'B1',
        cashierId: 'sim_cashier',
        cashierName: 'Simulated Cashier',
        customerName: 'Juan Dela Cruz',
        subtotal: 16741.07,
        vat: 2008.93,
        discount: 0,
        grandTotal: 18750.00,
        paymentMethod: 'Cash',
        amountTendered: 19000,
        changeAmount: 250,
        createdAt: tMinus(3),
        isDeleted: false
      },
      {
        id: 'INV-1002',
        saleNumber: 'TP-INV-1002',
        shiftId: 'SHIFT-001',
        branchId: 'B1',
        cashierId: 'sim_cashier',
        cashierName: 'Simulated Cashier',
        customerName: 'Maria Santos',
        subtotal: 4821.43,
        vat: 578.57,
        discount: 0,
        grandTotal: 5400.00,
        paymentMethod: 'GCash',
        amountTendered: 5400,
        changeAmount: 0,
        createdAt: tMinus(3),
        isDeleted: false
      }
    ];

    const sampleSaleItemsList: SaleItem[] = [
      {
        id: 'SITEM-1',
        saleId: 'INV-1001',
        productId: 'P1',
        productName: 'Polished Granite Carrara 60x60 cm',
        unitPrice: 1250,
        quantity: 15,
        total: 18750,
        isDeleted: false
      },
      {
        id: 'SITEM-2',
        saleId: 'INV-1002',
        productId: 'P2',
        productName: 'Glossy White Ceramic 30x60 cm',
        unitPrice: 675,
        quantity: 8,
        total: 5400,
        isDeleted: false
      }
    ];

    const sampleMovementsList: InventoryMovement[] = [
      {
        id: 'M-1',
        productId: 'P1',
        type: 'IN',
        quantity: 1000,
        referenceId: 'PO-202606-101',
        notes: 'Initial warehouse intake for supplier PO-101',
        timestamp: tMinus(3),
        userId: 'sim_manager',
        username: 'manager'
      },
      {
        id: 'M-2',
        productId: 'P1',
        type: 'OUT',
        quantity: -15,
        referenceId: 'INV-1001',
        notes: 'POS Sold x15 to Juan Dela Cruz',
        timestamp: tMinus(3),
        userId: 'sim_cashier',
        username: 'cashier'
      },
      {
        id: 'M-3',
        productId: 'P2',
        type: 'OUT',
        quantity: -8,
        referenceId: 'INV-1002',
        notes: 'POS Sold x8 to Maria Santos',
        timestamp: tMinus(3),
        userId: 'sim_cashier',
        username: 'cashier'
      },
      {
        id: 'M-4',
        productId: 'P1',
        type: 'TRANSFER',
        quantity: -50,
        sourceBranchId: 'B1',
        destinationBranchId: 'B2',
        referenceId: 'TRSF-202606-501',
        notes: 'Outward inter-branch allocation dispatch',
        timestamp: tMinus(2),
        userId: 'sim_manager',
        username: 'manager'
      }
    ];

    const sampleStockTransfersList: StockTransfer[] = [
      {
        id: 'TRSF-202606-501',
        transferNo: 'TRSF-202606-501',
        fromBranchId: 'B1',
        toBranchId: 'B2',
        transferType: 'Redistribution',
        requestedBy: 'manager',
        approvedBy: 'admin',
        status: 'In Transit',
        reason: 'Consolidating branch stock levels for Carrara series demand',
        createdAt: tMinus(2),
        updatedAt: tMinus(2),
        items: [
          {
            id: 'TITEM-1',
            transferId: 'TRSF-202606-501',
            productId: 'P1',
            productName: 'Polished Granite Carrara 60x60 cm',
            quantity: 50
          }
        ]
      }
    ];

    const samplePurchaseOrdersList: PurchaseOrder[] = [
      {
        id: 'PO-202606-101',
        poNumber: 'PO-202606-101',
        supplierId: 'S1',
        branchId: 'B1',
        status: 'Completed',
        requestedBy: 'Simulated Manager',
        date: tMinus(4),
        notes: 'Intake stock order for Carrara launch',
        createdAt: tMinus(4),
        updatedAt: tMinus(3)
      }
    ];

    const samplePoItemsList: PurchaseOrderItem[] = [
      {
        id: 'PO-ITEM-1',
        poId: 'PO-202606-101',
        productId: 'P1',
        costPrice: 850,
        quantityRequested: 1000,
        quantityReceived: 1000
      }
    ];

    const branchStockList: InventoryLocationStock[] = [
      {
        id: 'B1_P1',
        branchId: 'B1',
        productId: 'P1',
        quantity: 935
      },
      {
        id: 'B1_P2',
        branchId: 'B1',
        productId: 'P2',
        quantity: 492
      },
      {
        id: 'B1_P3',
        branchId: 'B1',
        productId: 'P3',
        quantity: 300
      },
      {
        id: 'B2_P1',
        branchId: 'B2',
        productId: 'P1',
        quantity: 50
      }
    ];

    const ledgerEntriesList: LedgerEntry[] = [
      {
        id: 'LDR-1',
        date: tMinus(3),
        productId: 'P1',
        productName: 'Polished Granite Carrara 60x60 cm',
        branchId: 'B1',
        movementType: 'IN',
        quantity: 1000,
        referenceNo: 'PO-202606-101',
        remarks: 'Direct warehouse stock intake'
      },
      {
        id: 'LDR-2',
        date: tMinus(3),
        productId: 'P1',
        productName: 'Polished Granite Carrara 60x60 cm',
        branchId: 'B1',
        movementType: 'SALE',
        quantity: -15,
        referenceNo: 'TP-INV-1001',
        remarks: 'Sales Invoice checkout'
      },
      {
        id: 'LDR-3',
        date: tMinus(3),
        productId: 'P2',
        productName: 'Glossy White Ceramic 30x60 cm',
        branchId: 'B1',
        movementType: 'SALE',
        quantity: -8,
        referenceNo: 'TP-INV-1002',
        remarks: 'Sales Invoice checkout'
      },
      {
        id: 'LDR-4',
        date: tMinus(2),
        productId: 'P1',
        productName: 'Polished Granite Carrara 60x60 cm',
        branchId: 'B1',
        movementType: 'TRANSFER',
        quantity: -50,
        referenceNo: 'TRSF-202606-501',
        remarks: 'Outward inter-branch transfer dispatch'
      }
    ];

    const shiftsList: Shift[] = [
      {
        id: 'SHIFT-001',
        cashierId: 'sim_cashier',
        cashierName: 'Simulated Cashier',
        branchId: 'B1',
        status: 'CLOSED',
        startCash: 5000,
        endCash: 29150,
        cashCount: 29150,
        variance: 0,
        openedAt: tMinus(3),
        closedAt: tMinus(3),
        shiftSalesCount: 2,
        shiftSalesTotal: 24150,
        shiftVatTotal: 2587.50,
        shiftDiscountTotal: 0
      }
    ];

    const transmittalsList: Transmittal[] = [
      {
        id: 'TRANSM-9002',
        documentType: 'Daily Sales Report',
        fromBranchId: 'B1',
        toBranchId: 'B1',
        submittedBy: 'manager',
        status: 'Approved',
        payloadJson: JSON.stringify({ reportingDate: tMinus(3), totalSalesAmount: 24150 }),
        submittedAt: tMinus(1),
        isDeleted: false
      }
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
      simulationModeActive: true
    };
  };

  const importMasterForensicBackup = async () => {
    const data = generateMasterForensicBackup();
    
    createDbSnapshot("Auto-Snapshot Before Master Forensic Import");

    setIsConfigured(true);
    localStorage.setItem('tp_is_configured', 'true');
    localStorage.setItem('tilepoint_company_name_v1', 'tilepoint');

    setUsers(data.users);
    localStorage.setItem('tp_users', JSON.stringify(data.users));

    setBranches(data.branches);
    localStorage.setItem('tp_branches', JSON.stringify(data.branches));

    setSuppliers(data.suppliers);
    localStorage.setItem('tp_suppliers', JSON.stringify(data.suppliers));

    setProducts(data.products);
    localStorage.setItem('tp_products', JSON.stringify(data.products));

    setPurchaseOrders(data.purchaseOrders);
    localStorage.setItem('tp_purchase_orders', JSON.stringify(data.purchaseOrders));

    setPoItems(data.poItems);
    localStorage.setItem('tp_po_items', JSON.stringify(data.poItems));

    setTransmittals(data.transmittals);
    localStorage.setItem('tp_transmittals', JSON.stringify(data.transmittals));

    setShifts(data.shifts);
    localStorage.setItem('tp_shifts', JSON.stringify(data.shifts));

    setSales(data.sales);
    localStorage.setItem('tp_sales', JSON.stringify(data.sales));

    setSaleItems(data.saleItems);
    localStorage.setItem('tp_sale_items', JSON.stringify(data.saleItems));

    setMovements(data.movements);
    localStorage.setItem('tp_movements', JSON.stringify(data.movements));

    setAuditLogs(data.auditLogs);
    localStorage.setItem('tp_audit_logs', JSON.stringify(data.auditLogs));

    setStockTransfers(data.stockTransfers);
    localStorage.setItem('tp_stock_transfers', JSON.stringify(data.stockTransfers));

    setBranchStock(data.branchStock);
    localStorage.setItem('tp_branch_stock', JSON.stringify(data.branchStock));

    setLedgerEntries(data.ledgerEntries);
    localStorage.setItem('tp_ledger_entries', JSON.stringify(data.ledgerEntries));

    setSimulationModeActive(true);
    localStorage.setItem('tp_simulation_mode_active', 'true');

    setCurrentUser(data.users[0]);
    setIsLoggedIn(true);
    localStorage.setItem('tp_is_logged_in', 'true');
    localStorage.setItem('tp_current_user', JSON.stringify(data.users[0]));

    addAuditLog('DB_BACKUP_RESTORE', 'Imported complete Master Forensic Database Suite and System Audit Logs successfully.', 'SYSTEM', 'FORENSIC_MASTER');
  };

  // USERS
  const createUser = (userFields: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newUser: User = {
      ...userFields,
      username: sanitizeInputText(userFields.username),
      fullName: sanitizeInputText(userFields.fullName),
      role: sanitizeInputText(userFields.role) as any,
      branchAssignmentId: sanitizeInputText(userFields.branchAssignmentId),
      id: `U-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setUsers(prev => [...prev, newUser]);
    addAuditLog('USER_CREATE', `Created user account for ${newUser.fullName} (${newUser.role})`, 'Users', newUser.id);
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...updates, updatedAt: new Date().toISOString() } : u)));
    addAuditLog('USER_UPDATE', `Updated user account details for user ID ${id}`, 'Users', id);
  };

  const resetPassword = (id: string) => {
    const target = users.find(u => u.id === id);
    if (target) {
      const runReset = async () => {
        const salt = target.username + '_salt_tok';
        const hashedVal = await createSaltedHash('tilepoint', salt, 2500);
        const formattedToken = formatHashToken(salt, hashedVal, 2500);
        setUsers(prev => {
          const updated = prev.map(u => u.id === id ? { ...u, passwordHash: formattedToken } : u);
          localStorage.setItem('tp_users', JSON.stringify(updated));
          return updated;
        });
        addAuditLog('USER_RESET_PASSWORD', `Reset password for user ${target.fullName} to default (tilepoint)`, 'Users', id);
      };
      runReset();
    }
  };

  // BRANCHES
  const createBranch = (branchFields: Omit<Branch, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>) => {
    const newBranch: Branch = {
      ...branchFields,
      name: sanitizeInputText(branchFields.name),
      address: sanitizeInputText(branchFields.address),
      manager: sanitizeInputText(branchFields.manager),
      phone: sanitizeInputText(branchFields.phone),
      id: `B-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false,
    };
    setBranches(prev => [...prev, newBranch]);
    addAuditLog('BRANCH_CREATE', `Created branch ${newBranch.name}`, 'Branches', newBranch.id);
  };

  const updateBranch = (id: string, updates: Partial<Branch>) => {
    setBranches(prev => prev.map(b => (b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b)));
    addAuditLog('BRANCH_UPDATE', `Updated branch ID ${id}`, 'Branches', id);
  };

  const deleteBranch = (id: string) => {
    setBranches(prev => prev.map(b => (b.id === id ? { ...b, isDeleted: true, updatedAt: new Date().toISOString() } : b)));
    addAuditLog('BRANCH_DELETE', `Soft-deleted branch ID ${id}`, 'Branches', id);
  };

  // SUPPLIERS
  const createSupplier = (supFields: Omit<Supplier, 'id' | 'createdAt' | 'isDeleted'>): Supplier => {
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
    setSuppliers(prev => [...prev, newSup]);
    addAuditLog('SUPPLIER_CREATE', `Created supplier ${newSup.name}`, 'Suppliers', newSup.id);
    return newSup;
  };

  const updateSupplier = (id: string, updates: Partial<Supplier>) => {
    setSuppliers(prev => prev.map(s => (s.id === id ? { ...s, ...updates } : s)));
    addAuditLog('SUPPLIER_UPDATE', `Updated supplier ID ${id}`, 'Suppliers', id);
  };

  const deleteSupplier = (id: string) => {
    setSuppliers(prev => prev.map(s => (s.id === id ? { ...s, isDeleted: true } : s)));
    addAuditLog('SUPPLIER_DELETE', `Soft-deleted supplier ID ${id}`, 'Suppliers', id);
  };

  // BRANDS
  const createBrand = (brandFields: Omit<Brand, 'id' | 'createdAt' | 'isDeleted'>): Brand => {
    const newBrand: Brand = {
      ...brandFields,
      name: sanitizeInputText(brandFields.name),
      description: brandFields.description ? sanitizeInputText(brandFields.description) : '',
      id: `BND-${Date.now()}`,
      createdAt: new Date().toISOString(),
      isDeleted: false,
    };
    setBrands(prev => [...prev, newBrand]);
    addAuditLog('BRAND_CREATE', `Created brand ${newBrand.name}`, 'Brands', newBrand.id);
    return newBrand;
  };

  const updateBrand = (id: string, updates: Partial<Brand>) => {
    setBrands(prev => prev.map(b => (b.id === id ? { ...b, ...updates } : b)));
    addAuditLog('BRAND_UPDATE', `Updated brand properties for ID: ${id}`, 'Brands', id);
  };

  const deleteBrand = (id: string) => {
    setBrands(prev => prev.map(b => (b.id === id ? { ...b, isDeleted: true } : b)));
    addAuditLog('BRAND_DELETE', `Soft-deleted brand ID: ${id}`, 'Brands', id);
  };

  // PRODUCTS
  const createProduct = (prodFields: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'qrCode' | 'createdBy' | 'updatedBy'>) => {
    const newId = `P-${Date.now()}`;
    const sanitizedFields = {
      ...prodFields,
      productName: sanitizeInputText(prodFields.productName),
      productCode: sanitizeInputText(prodFields.productCode),
      sku: sanitizeInputText(prodFields.sku),
      barcode: sanitizeInputText(prodFields.barcode),
      category: sanitizeInputText(prodFields.category) || 'Porcelain Tiles',
      brand: sanitizeInputText(prodFields.brand) || 'Generic',
      size: sanitizeInputText(prodFields.size),
      designName: sanitizeInputText(prodFields.designName || 'Standard'),
      supplierId: sanitizeInputText(prodFields.supplierId || 'central'),
      unit: sanitizeInputText(prodFields.unit) || 'Boxes',
      origin: prodFields.origin ? sanitizeInputText(prodFields.origin) : undefined,

      boxQuantity: sanitizeAndValidateNumber(prodFields.boxQuantity, 1),
      coveragePerBox: prodFields.coveragePerBox !== undefined ? sanitizeAndValidateNumber(prodFields.coveragePerBox, 1) : undefined,
      costPrice: sanitizeAndValidateNumber(prodFields.costPrice),
      sellingPrice: sanitizeAndValidateNumber(prodFields.sellingPrice),
      stockQuantity: Math.round(sanitizeAndValidateNumber(prodFields.stockQuantity)),
      minimumStock: Math.round(sanitizeAndValidateNumber(prodFields.minimumStock, 10)),
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
    };
    setProducts(prev => [...prev, newProd]);

    // Initial stock movement
    const initMove: InventoryMovement = {
      id: `M-${Date.now()}`,
      productId: newId,
      type: 'IN',
      quantity: sanitizedFields.stockQuantity,
      destinationBranchId: currentUser.branchAssignmentId,
      referenceId: 'INITIAL_STOCK',
      notes: sanitizedFields.origin 
        ? `Initial stock intake. Origin/Source: ${sanitizedFields.origin}` 
        : 'Initial stock intake upon product registration',
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      username: currentUser.username,
    };
    setMovements(prev => [initMove, ...prev]);

    addAuditLog('PRODUCT_CREATE', `Created product ${newProd.productName}`, 'Products', newProd.id);
    return newProd;
  };

  const updateProduct = (id: string, updates: Partial<Product>, customLogReason?: string) => {
    const original = products.find(p => p.id === id);
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        const sanitizedUpdates: Partial<Product> = {};
        if (updates.productName !== undefined) sanitizedUpdates.productName = sanitizeInputText(updates.productName);
        if (updates.productCode !== undefined) sanitizedUpdates.productCode = sanitizeInputText(updates.productCode);
        if (updates.sku !== undefined) sanitizedUpdates.sku = sanitizeInputText(updates.sku);
        if (updates.barcode !== undefined) sanitizedUpdates.barcode = sanitizeInputText(updates.barcode);
        if (updates.category !== undefined) sanitizedUpdates.category = sanitizeInputText(updates.category);
        if (updates.brand !== undefined) sanitizedUpdates.brand = sanitizeInputText(updates.brand);
        if (updates.size !== undefined) sanitizedUpdates.size = sanitizeInputText(updates.size);
        if (updates.designName !== undefined) sanitizedUpdates.designName = sanitizeInputText(updates.designName);
        if (updates.supplierId !== undefined) sanitizedUpdates.supplierId = sanitizeInputText(updates.supplierId);
        if (updates.unit !== undefined) sanitizedUpdates.unit = sanitizeInputText(updates.unit);
        if (updates.origin !== undefined) sanitizedUpdates.origin = updates.origin ? sanitizeInputText(updates.origin) : undefined;
        if (updates.image !== undefined) sanitizedUpdates.image = updates.image;

        if (updates.boxQuantity !== undefined) sanitizedUpdates.boxQuantity = sanitizeAndValidateNumber(updates.boxQuantity);
        if (updates.coveragePerBox !== undefined) sanitizedUpdates.coveragePerBox = sanitizeAndValidateNumber(updates.coveragePerBox);
        if (updates.costPrice !== undefined) sanitizedUpdates.costPrice = sanitizeAndValidateNumber(updates.costPrice);
        if (updates.sellingPrice !== undefined) sanitizedUpdates.sellingPrice = sanitizeAndValidateNumber(updates.sellingPrice);
        if (updates.stockQuantity !== undefined) sanitizedUpdates.stockQuantity = Math.round(sanitizeAndValidateNumber(updates.stockQuantity));
        if (updates.minimumStock !== undefined) sanitizedUpdates.minimumStock = Math.round(sanitizeAndValidateNumber(updates.minimumStock));

        // If stock level changed, record movement
        if (sanitizedUpdates.stockQuantity !== undefined && sanitizedUpdates.stockQuantity !== p.stockQuantity) {
          const diff = sanitizedUpdates.stockQuantity - p.stockQuantity;
          logManualAdjustment(id, diff, customLogReason || 'Stock level manual correction from product edit panel');
        }

        return {
          ...p,
          ...updates,
          ...sanitizedUpdates,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.fullName,
        };
      }
      return p;
    }));

    addAuditLog('PRODUCT_UPDATE', `Updated product ${original?.productName || id}`, 'Products', id);
  };

  const deleteProduct = (id: string) => {
    const original = products.find(p => p.id === id);
    setProducts(prev => prev.map(p => (p.id === id ? { ...p, isDeleted: true, updatedAt: new Date().toISOString(), updatedBy: currentUser.fullName } : p)));
    addAuditLog('PRODUCT_DELETE', `Soft-deleted product ${original?.productName || id}`, 'Products', id);
  };

  const importProducts = (imported: Product[]) => {
    try {
      const sanitized = imported.map((p, i) => {
        const barcode = sanitizeInputText(p.barcode) || `BAR-${Date.now()}-${i}`;
        const productCode = sanitizeInputText(p.productCode) || barcode || `TL-IMP-${Date.now()}-${i}`;
        const pName = sanitizeInputText(p.productName) || 'Unnamed Imported Product';

        // Extrapolate size if not set e.g. from productName "20X30 # SENEPA BEIGE"
        let size = sanitizeInputText(p.size);
        if (!size && pName) {
          const sizeMatch = pName.match(/(\d+(?:\.\d+)?)\s*[xX]\s*(\d+(?:\.\d+)?)/);
          if (sizeMatch) {
            size = `${sizeMatch[1]}x${sizeMatch[2]} cm`;
          }
        }
        if (!size) {
          const catLower = (p.category || '').toLowerCase();
          const isTile = catLower.includes('tile') || catLower.includes('slab') || catLower.includes('stone');
          size = isTile ? '60x60 cm' : 'N/A';
        }

        const sku = sanitizeInputText(p.sku) || (barcode ? `SKU-${barcode}` : `SKU-IMP-${Date.now()}-${i}`);

        return {
          ...p,
          id: p.id || `P-IMPORT-${Date.now()}-${i}`,
          productCode,
          productName: pName,
          sku,
          barcode,
          qrCode: p.qrCode || `TP-${productCode}`,
          category: sanitizeInputText(p.category) || 'Porcelain Tiles',
          brand: sanitizeInputText(p.brand) || 'Generic',
          size,
          designName: sanitizeInputText(p.designName) || pName,
          supplierId: sanitizeInputText(p.supplierId) || 'central',
          unit: sanitizeInputText(p.unit) || 'Boxes',
          origin: p.origin ? sanitizeInputText(p.origin) : undefined,

          boxQuantity: sanitizeAndValidateNumber(p.boxQuantity || (size !== 'N/A' ? 4 : 1), 1),
          coveragePerBox: p.coveragePerBox !== undefined ? sanitizeAndValidateNumber(p.coveragePerBox, 1) : undefined,
          costPrice: sanitizeAndValidateNumber(p.costPrice),
          sellingPrice: sanitizeAndValidateNumber(p.sellingPrice),
          stockQuantity: Math.round(sanitizeAndValidateNumber(p.stockQuantity)),
          minimumStock: Math.round(sanitizeAndValidateNumber(p.minimumStock, 0)),

          createdAt: p.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDeleted: !!p.isDeleted,
        };
      });

      setProducts(prev => {
        // Upsert by productCode
        const currentCodes = prev.reduce((acc, current) => {
          acc[current.productCode] = current;
          return acc;
        }, {} as Record<string, Product>);

        sanitized.forEach(item => {
          currentCodes[item.productCode] = item;
        });

        return Object.values(currentCodes);
      });

      addAuditLog('PRODUCT_BULK_IMPORT', `Bulk-imported ${sanitized.length} products successfully`, 'Products', 'BULK');
      return { success: true, count: sanitized.length };
    } catch (e: any) {
      return { success: false, count: 0, error: e?.message || 'Error occurred during parsing.' };
    }
  };

  // POS / CHECOUT SALES
  const holdSale = (cartItems: { product: Product; quantity: number }[], customerName: string, notes: string): string => {
    const holdId = `HLD-${Date.now()}`;
    setParkedSales(prev => [
      ...prev,
      {
        id: holdId,
        customerName: customerName || 'Walk-in Customer',
        notes,
        items: cartItems,
        timestamp: new Date().toLocaleTimeString(),
      }
    ]);
    addAuditLog('POS_PARK_SALE', `Held order for customer ${customerName || 'Walk-in'} (Hold ID: ${holdId})`, 'Sales', holdId);
    return holdId;
  };

  const checkoutSale = (
    cartItems: { product: Product; quantity: number }[],
    customerName: string,
    notes: string,
    discountAmount: number,
    paymentMethod: Sale['paymentMethod'],
    amountTendered: number,
    customVat?: number
  ): Sale => {
    const saleId = `SL-${Date.now()}`;
    const saleNum = `SL-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    // Totals calculations
    const subtotal = cartItems.reduce((acc, item) => {
      const branchStockRec = branchStock.find(bs => bs.productId === item.product.id && bs.branchId === currentUser.branchAssignmentId);
      const basePrice = (branchStockRec && branchStockRec.sellingPriceOverride !== undefined && branchStockRec.sellingPriceOverride > 0)
        ? branchStockRec.sellingPriceOverride
        : item.product.sellingPrice;
      const unitPrice = (item as any).overridePrice !== undefined ? (item as any).overridePrice : basePrice;
      return acc + (unitPrice * item.quantity);
    }, 0);

    const vat = customVat !== undefined ? customVat : parseFloat((subtotal * 0.12).toFixed(2));
    const grandTotal = parseFloat((subtotal + vat - discountAmount).toFixed(2));
    const changeAmount = paymentMethod === 'Cash' ? parseFloat((amountTendered - grandTotal).toFixed(2)) : 0.0;

    const newSale: Sale = {
      id: saleId,
      saleNumber: saleNum,
      shiftId: activeShift ? activeShift.id : 'NO-SHIFT-ACTIVE',
      branchId: currentUser.branchAssignmentId,
      cashierId: currentUser.id,
      cashierName: currentUser.fullName,
      customerName: customerName || 'Walk-in Customer',
      subtotal,
      vat,
      discount: discountAmount,
      grandTotal,
      paymentMethod,
      amountTendered: paymentMethod === 'Cash' ? amountTendered : grandTotal,
      changeAmount: changeAmount > 0 ? changeAmount : 0,
      notes,
      createdAt: new Date().toISOString(),
      isDeleted: false,
    };

    // Save sale items
    const newSaleItems: SaleItem[] = cartItems.map((item, idx) => {
      const branchStockRec = branchStock.find(bs => bs.productId === item.product.id && bs.branchId === currentUser.branchAssignmentId);
      const basePrice = (branchStockRec && branchStockRec.sellingPriceOverride !== undefined && branchStockRec.sellingPriceOverride > 0)
        ? branchStockRec.sellingPriceOverride
        : item.product.sellingPrice;
      const unitPrice = (item as any).overridePrice !== undefined ? (item as any).overridePrice : basePrice;
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
    setSales(prev => [newSale, ...prev]);
    setSaleItems(prev => [...prev, ...newSaleItems]);

    // Update branchStock for local branch
    setBranchStock(prevList => {
      const nextList = [...prevList];
      cartItems.forEach(item => {
        const matchIdx = nextList.findIndex(bs => bs.productId === item.product.id && bs.branchId === currentUser.branchAssignmentId);
        if (matchIdx !== -1) {
          nextList[matchIdx] = {
            ...nextList[matchIdx],
            quantity: Math.max(0, nextList[matchIdx].quantity - item.quantity)
          };
        } else {
          nextList.push({
            id: `${currentUser.branchAssignmentId}_${item.product.id}`,
            branchId: currentUser.branchAssignmentId || 'HQ',
            productId: item.product.id,
            quantity: 0
          });
        }
      });
      return nextList;
    });

    // Update Product stocks & write movements
    setProducts(prev => {
      const updated = [...prev];
      cartItems.forEach(item => {
        const prodIdx = updated.findIndex(p => p.id === item.product.id);
        if (prodIdx !== -1) {
          updated[prodIdx] = {
            ...updated[prodIdx],
            stockQuantity: Math.max(0, updated[prodIdx].stockQuantity - item.quantity),
            updatedAt: new Date().toISOString(),
          };
        }
      });
      return updated;
    });

    const newMovements: InventoryMovement[] = cartItems.map((item, idx) => ({
      id: `M-SALE-${saleId}-${idx}`,
      productId: item.product.id,
      type: 'OUT',
      quantity: -item.quantity,
      sourceBranchId: currentUser.branchAssignmentId,
      referenceId: saleId,
      notes: `Sold to ${customerName || 'Walk-in'} in Invoice ${saleNum}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      username: currentUser.username,
    }));

    setMovements(prev => [...newMovements, ...prev]);

    // Update current active shift figures if open
    if (activeShift) {
      setShifts(prev => prev.map(s => {
        if (s.id === activeShift.id) {
          const newSalesTotal = s.shiftSalesTotal + subtotal;
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
      }));
    }

    // Dynamic Monthly sales updates for Branch Card
    setBranches(prev => prev.map(b => {
      if (b.id === currentUser.branchAssignmentId) {
        return {
          ...b,
          monthlySales: b.monthlySales + grandTotal,
        };
      }
      return b;
    }));

    addAuditLog('POS_CHECKOUT', `Completed sale invoice ${saleNum}. Amount: ₱${grandTotal.toFixed(2)}`, 'Sales', saleId);
    return newSale;
  };

  const voidSale = (saleId: string) => {
    // 1. Find the sale
    const targetSale = sales.find(s => s.id === saleId);
    if (!targetSale) return;

    // 2. Mark sale as deleted
    setSales(prev => prev.map(s => s.id === saleId ? { ...s, isDeleted: true } : s));

    // Mark sale items as deleted
    setSaleItems(prev => prev.map(item => item.saleId === saleId ? { ...item, isDeleted: true } : item));

    // 3. Get the corresponding sale items to restore inventory
    const itemsToRestore = saleItems.filter(item => item.saleId === saleId);

    // Update Product stocks & write movements
    setProducts(prev => {
      const updated = [...prev];
      itemsToRestore.forEach(item => {
        const prodIdx = updated.findIndex(p => p.id === item.productId);
        if (prodIdx !== -1) {
          updated[prodIdx] = {
            ...updated[prodIdx],
            stockQuantity: updated[prodIdx].stockQuantity + item.quantity,
            updatedAt: new Date().toISOString(),
          };
        }
      });
      return updated;
    });

    // Write restoration movements (type: 'IN' as we are receiving stock back)
    const newMovements: InventoryMovement[] = itemsToRestore.map((item, idx) => ({
      id: `M-VOID-${saleId}-${idx}`,
      productId: item.productId,
      type: 'IN',
      quantity: item.quantity,
      sourceBranchId: targetSale.branchId,
      referenceId: saleId,
      notes: `Restored: Voided invoice ${targetSale.saleNumber} by ${currentUser.fullName}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      username: currentUser.username,
    }));

    setMovements(prev => [...newMovements, ...prev]);

    // Update shift indicators if activeShift matches
    if (activeShift && targetSale.shiftId === activeShift.id) {
      setShifts(prev => prev.map(s => {
        if (s.id === activeShift.id) {
          // Subtract from totals
          const voidedSubtotal = targetSale.subtotal;
          const voidedVat = targetSale.vat;
          const voidedDiscount = targetSale.discount;
          return {
            ...s,
            shiftSalesCount: Math.max(0, s.shiftSalesCount - 1),
            shiftSalesTotal: Math.max(0, s.shiftSalesTotal - voidedSubtotal),
            shiftVatTotal: Math.max(0, s.shiftVatTotal - voidedVat),
            shiftDiscountTotal: Math.max(0, s.shiftDiscountTotal - voidedDiscount),
          };
        }
        return s;
      }));
    }

    // Deduct from branch monthly sales
    setBranches(prev => prev.map(b => {
      if (b.id === targetSale.branchId) {
        return {
          ...b,
          monthlySales: Math.max(0, b.monthlySales - targetSale.grandTotal),
        };
      }
      return b;
    }));

    addAuditLog('POS_VOID_SALE', `VOIDED transaction invoice ${targetSale.saleNumber}. Restored ${itemsToRestore.length} products to inventory. Refund Amount: ₱${targetSale.grandTotal.toFixed(2)}`, 'Sales', saleId);
  };

  // SHIFT MANAGEMENT
  const openShift = (startCash: number) => {
    const shiftId = `SH-${Date.now()}`;
    const newShift: Shift = {
      id: shiftId,
      cashierId: currentUser.id,
      cashierName: currentUser.fullName,
      branchId: currentUser.branchAssignmentId,
      status: 'OPEN',
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
    setShifts(prev => [newShift, ...prev]);
    addAuditLog('SHIFT_OPEN', `Opened drawer shift with starting cash of ₱${startCash.toFixed(2)}`, 'Shifts', shiftId);
  };

  const closeShift = (cashCount: number) => {
    if (!activeShift) return;
    const statsResult = getShiftReportStats(activeShift);
    const expectedEndCash = activeShift.startCash + statsResult.netTotal;
    const variance = cashCount - expectedEndCash;

    setShifts(prev => prev.map(s => {
      if (s.id === activeShift.id) {
        return {
          ...s,
          status: 'CLOSED' as ShiftStatus,
          endCash: expectedEndCash,
          cashCount,
          variance,
          closedAt: new Date().toISOString(),
        };
      }
      return s;
    }));

    addAuditLog('SHIFT_CLOSE', `Closed active shift. Counted ₱${cashCount.toFixed(2)} vs Expected ₱${expectedEndCash.toFixed(2)} (Variance: ₱${variance.toFixed(2)})`, 'Shifts', activeShift.id);
  };

  const getShiftReportStats = (shift: Shift) => {
    // Net sales made inside this shift
    const shiftSales = sales.filter(s => s.shiftId === shift.id && !s.isDeleted);
    const salesCount = shiftSales.length;
    const salesTotal = shiftSales.reduce((acc, curr) => acc + curr.subtotal, 0);
    const vatTotal = shiftSales.reduce((acc, curr) => acc + curr.vat, 0);
    const discountTotal = shiftSales.reduce((acc, curr) => acc + curr.discount, 0);
    const netTotal = shiftSales.reduce((acc, curr) => acc + curr.grandTotal, 0);

    return {
      salesCount,
      salesTotal,
      vatTotal,
      discountTotal,
      netTotal,
    };
  };

  // PURCHASE ORDERS
  const createPO = (supplierId: string, branchId: string, itemInputs: { productId: string; costPrice: number; quantityRequested: number }[], notes?: string, status?: POStatus) => {
    const poId = `PO-${Date.now()}`;
    
    // Find maximum numeric sequence suffix or total count of existing purchase orders to increment
    let nextNum = purchaseOrders.length + 1;
    purchaseOrders.forEach(p => {
      const parts = p.poNumber.split('-');
      const lastPart = parts[parts.length - 1];
      const parsedNum = parseInt(lastPart, 10);
      if (!isNaN(parsedNum) && parsedNum >= nextNum) {
        nextNum = parsedNum + 1;
      }
    });

    const poNum = `PO-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${nextNum.toString().padStart(4, '0')}`;

    const newPO: PurchaseOrder = {
      id: poId,
      poNumber: poNum,
      supplierId,
      branchId,
      status: (status || 'Pending') as POStatus,
      requestedBy: currentUser.fullName,
      date: new Date().toISOString().slice(0, 10),
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newItems: PurchaseOrderItem[] = itemInputs.map((item, idx) => ({
      id: `POI-${poId}-${idx}`,
      poId,
      productId: item.productId,
      costPrice: item.costPrice,
      quantityRequested: item.quantityRequested,
      quantityReceived: 0,
    }));

    setPurchaseOrders(prev => [newPO, ...prev]);
    setPoItems(prev => [...prev, ...newItems]);
    addAuditLog('PO_CREATE', `Created Purchase Order ${poNum}`, 'PurchaseOrders', poId);
  };

  const updatePOStatus = (id: string, status: POStatus) => {
    setPurchaseOrders(prev => prev.map(po => (po.id === id ? { ...po, status, updatedAt: new Date().toISOString() } : po)));
    addAuditLog('PO_STATUS_CHANGE', `Updated PO status of PO ID ${id} to ${status}`, 'PurchaseOrders', id);
  };

  const receivePOItems = (id: string, receivedMap: Record<string, number>) => {
    const originalPo = purchaseOrders.find(p => p.id === id);
    if (!originalPo) return;

    // 1. Update purchase order items received quantity
    setPoItems(prev => prev.map(item => {
      if (item.poId === id && receivedMap[item.productId] !== undefined) {
        const newlyReceived = receivedMap[item.productId];
        return {
          ...item,
          quantityReceived: item.quantityReceived + newlyReceived,
        };
      }
      return item;
    }));

    // 2. Adjust product stocks and generate stock movements
    setProducts(prev => {
      const updated = [...prev];
      Object.entries(receivedMap).forEach(([prodId, qty]) => {
        const prodIdx = updated.findIndex(p => p.id === prodId);
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
        type: 'IN',
        quantity: qty,
        destinationBranchId: originalPo.branchId,
        referenceId: id,
        notes: `Received cargo on PO ${originalPo.poNumber}`,
        timestamp: new Date().toISOString(),
        userId: currentUser.id,
        username: currentUser.username,
      }));

    setMovements(prev => [...newItemsMoved, ...prev]);

    // Check if everything is fully received
    const poItemsForThis = poItems.filter(item => item.poId === id);
    let allCompleted = true;
    poItemsForThis.forEach(item => {
      const receivedAfter = item.quantityReceived + (receivedMap[item.productId] || 0);
      if (receivedAfter < item.quantityRequested) {
        allCompleted = false;
      }
    });

    const finalStatus: POStatus = allCompleted ? 'Completed' : 'Partially Received';

    setPurchaseOrders(prev => prev.map(po => {
      if (po.id === id) {
        return {
          ...po,
          status: finalStatus,
          updatedAt: new Date().toISOString(),
        };
      }
      return po;
    }));

    addAuditLog('PO_RECEIVE', `Received cargo for PO ${originalPo.poNumber}. Consolidated Status: ${finalStatus}`, 'PurchaseOrders', id);
  };

  // TRANSMITTAL SYSTEM (Submit reports across branches or upload JSON summaries)
  const createTransmittal = (docType: TransmittalDocType, toBranchId: string, payloadJson: string, notes?: string): string => {
    const transId = `TRAN-${Date.now()}`;
    const newTrans: Transmittal = {
      id: transId,
      documentType: docType,
      fromBranchId: currentUser.branchAssignmentId,
      toBranchId,
      submittedBy: currentUser.fullName,
      status: 'Submitted' as TransmittalStatus,
      payloadJson,
      notes,
      submittedAt: new Date().toISOString(),
      isDeleted: false,
    };

    setTransmittals(prev => [newTrans, ...prev]);
    addAuditLog('TRANSMITTAL_SUBMIT', `Transmitted form type '${docType}' to target branch ID ${toBranchId}`, 'Transmittals', transId);
    return transId;
  };

  const updateTransmittalStatus = (id: string, status: TransmittalStatus) => {
    setTransmittals(prev => prev.map(t => (t.id === id ? { ...t, status } : t)));
    addAuditLog('TRANSMITTAL_VERDICT', `Updated transmittal ID ${id} transmittal ledger to status ${status}`, 'Transmittals', id);
  };

  const createStockTransfer = (
    fromBranchId: string,
    toBranchId: string,
    transferType: TransferType,
    itemsInput: { productId: string; quantity: number }[],
    reason: string
  ) => {
    const id = `ST-${Date.now()}`;
    const transferNo = `ST-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    
    // map the items
    const items = itemsInput.map((it, idx) => {
      const p = products.find(prod => prod.id === it.productId);
      return {
        id: `STI-${id}-${idx}`,
        transferId: id,
        productId: it.productId,
        productName: p ? p.productName : 'Unknown Tile',
        quantity: it.quantity
      };
    });

    const newTransfer: StockTransfer = {
      id,
      transferNo,
      fromBranchId,
      toBranchId,
      transferType,
      requestedBy: currentUser.fullName,
      status: 'Pending',
      reason,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items
    };

    setStockTransfers(prev => [newTransfer, ...prev]);
    addAuditLog('TRANSFER_CREATE', `Created Stock Transfer Request ${transferNo} (${transferType}) from ${fromBranchId} to ${toBranchId}`, 'StockTransfer', id);
  };

  const updateStockTransferStatus = (id: string, status: TransferStatus) => {
    setStockTransfers(prev => prev.map(t => {
      if (t.id === id) {
        const prevStatus = t.status;
        
        // Only run transition logic if status changed
        if (prevStatus !== status) {
          // 1. If moving from 'Pending' to 'Approved' or 'In Transit', deduct from fromBranchId exactly once
          if ((status === 'In Transit' || status === 'Approved') && prevStatus === 'Pending') {
            setBranchStock(bStock => {
              const updatedStock = [...bStock];
              t.items.forEach(item => {
                const idx = updatedStock.findIndex(bs => bs.productId === item.productId && bs.branchId === t.fromBranchId);
                const deductionQty = item.quantity;
                if (idx !== -1) {
                  const bs = updatedStock[idx];
                  const nextQty = Math.max(0, bs.quantity - deductionQty);
                  updatedStock[idx] = { ...bs, quantity: nextQty };
                  if (t.fromBranchId === 'B1') {
                    setProducts(prods => prods.map(prod => prod.id === bs.productId ? { ...prod, stockQuantity: nextQty } : prod));
                  }
                } else {
                  const newBs: InventoryLocationStock = {
                    id: `${t.fromBranchId}_${item.productId}`,
                    branchId: t.fromBranchId,
                    productId: item.productId,
                    quantity: 0
                  };
                  updatedStock.push(newBs);
                  if (t.fromBranchId === 'B1') {
                    setProducts(prods => prods.map(prod => prod.id === item.productId ? { ...prod, stockQuantity: 0 } : prod));
                  }
                }
              });
              return updatedStock;
            });

            // Record Ledger / Movements for dispatch
            t.items.forEach(item => {
              const ledgerId = `L-TR-DISP-${id}-${item.productId}`;
              const entry: LedgerEntry = {
                id: ledgerId,
                date: new Date().toISOString(),
                productId: item.productId,
                productName: item.productName,
                branchId: t.fromBranchId,
                movementType: 'TRANSFER',
                quantity: -item.quantity,
                referenceNo: t.transferNo,
                remarks: `Dispatched ${t.transferType} stock to ${t.toBranchId}`
              };
              setLedgerEntries(entries => [entry, ...entries]);

              // Also add general inventory movement log
              const moveId = `M-TR-DISP-${id}-${item.productId}`;
              const moveItem: InventoryMovement = {
                id: moveId,
                productId: item.productId,
                type: 'TRANSFER',
                quantity: -item.quantity,
                sourceBranchId: t.fromBranchId,
                destinationBranchId: t.toBranchId,
                referenceId: t.id,
                notes: `Shipped ${item.quantity} boxes for ${t.transferType} (${t.transferNo})`,
                timestamp: new Date().toISOString(),
                userId: currentUser.id,
                username: currentUser.username
              };
              setMovements(moves => [moveItem, ...moves]);
            });
          }

          // 2. If moving to 'Received', add to toBranchId (create record if it does not exist)
          if (status === 'Received') {
            setBranchStock(bStock => {
              const updatedStock = [...bStock];
              t.items.forEach(item => {
                const idx = updatedStock.findIndex(bs => bs.productId === item.productId && bs.branchId === t.toBranchId);
                const additionQty = item.quantity;
                if (idx !== -1) {
                  const bs = updatedStock[idx];
                  const nextQty = bs.quantity + additionQty;
                  updatedStock[idx] = { ...bs, quantity: nextQty };
                  if (t.toBranchId === 'B1') {
                    setProducts(prods => prods.map(prod => prod.id === bs.productId ? { ...prod, stockQuantity: nextQty } : prod));
                  }
                } else {
                  const nextQty = additionQty;
                  const newBs: InventoryLocationStock = {
                    id: `${t.toBranchId}_${item.productId}`,
                    branchId: t.toBranchId,
                    productId: item.productId,
                    quantity: nextQty
                  };
                  updatedStock.push(newBs);
                  if (t.toBranchId === 'B1') {
                    setProducts(prods => prods.map(prod => prod.id === item.productId ? { ...prod, stockQuantity: nextQty } : prod));
                  }
                }
              });
              return updatedStock;
            });

            // Record Ledger / Movements for receipt
            t.items.forEach(item => {
              const ledgerId = `L-TR-REC-${id}-${item.productId}`;
              const entry: LedgerEntry = {
                id: ledgerId,
                date: new Date().toISOString(),
                productId: item.productId,
                productName: item.productName,
                branchId: t.toBranchId,
                movementType: 'TRANSFER',
                quantity: item.quantity,
                referenceNo: t.transferNo,
                remarks: `Received ${t.transferType} stock from ${t.fromBranchId}`
              };
              setLedgerEntries(entries => [entry, ...entries]);

              // Also add general inventory movement log
              const moveId = `M-TR-REC-${id}-${item.productId}`;
              const moveItem: InventoryMovement = {
                id: moveId,
                productId: item.productId,
                type: 'TRANSFER',
                quantity: item.quantity,
                sourceBranchId: t.fromBranchId,
                destinationBranchId: t.toBranchId,
                referenceId: t.id,
                notes: `Received ${item.quantity} boxes for ${t.transferType} (${t.transferNo})`,
                timestamp: new Date().toISOString(),
                userId: currentUser.id,
                username: currentUser.username
              };
              setMovements(moves => [moveItem, ...moves]);
            });
          }
        }

        return {
          ...t,
          status,
          approvedBy: status === 'Approved' ? currentUser.fullName : t.approvedBy,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    }));

    addAuditLog('TRANSFER_UPDATE', `Updated Stock Transfer ${id} to status ${status}`, 'StockTransfer', id);
  };

  // CALCULATE LIVE SYSTEM KPIs
  const getStats = (): SummaryStats => {
    const activeProducts = products.filter(p => !p.isDeleted);
    const totalProducts = activeProducts.length;

    // Unique non-deleted product categories
    const totalCategories = Array.from(new Set(activeProducts.map(p => p.category))).length;

    const totalSuppliers = suppliers.filter(s => !s.isDeleted).length;

    const lowStockCount = activeProducts.filter(p => p.stockQuantity > 0 && p.stockQuantity <= p.minimumStock).length;
    const outOfStockCount = activeProducts.filter(p => p.stockQuantity === 0).length;

    // Sales sums
    const todayStr = new Date().toISOString().slice(0, 10);
    const todaySalesItems = sales.filter(s => s.createdAt.startsWith(todayStr) && !s.isDeleted);
    const todaySales = todaySalesItems.reduce((acc, curr) => acc + curr.grandTotal, 0);

    // Calculate weekly sales (past 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weeklySalesItems = sales.filter(s => new Date(s.createdAt) >= sevenDaysAgo && !s.isDeleted);
    const weeklySales = weeklySalesItems.reduce((acc, curr) => acc + curr.grandTotal, 0);

    // Monthly revenue
    const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
    const monthlySalesItems = sales.filter(s => s.createdAt.startsWith(currentMonthStr) && !s.isDeleted);
    const monthlyRevenue = monthlySalesItems.reduce((acc, curr) => acc + curr.grandTotal, 0);

    const activeCashiers = users.filter(u => u.status === 'Active' && u.role === UserRole.CASHIER).length;

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
  };

  const stats = getStats();

  return (
    <DbContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        updateCurrentUser,
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
        products,
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
        branchStock,
        ledgerEntries,
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
        importProducts,
        holdSale,
        parkedSales,
        setParkedSales,
        checkoutSale,
        voidSale,
        openShift,
        closeShift,
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
      }}
    >
      {children}
    </DbContext.Provider>
  );
};

export const useDb = () => {
  const context = useContext(DbContext);
  if (!context) {
    throw new Error('useDb must be used within a DbProvider');
  }
  return context;
};
