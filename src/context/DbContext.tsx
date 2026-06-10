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
  DeliveryStatus
} from '../types/db';

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
  createSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt' | 'isDeleted'>) => void;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  // Actions - Products
  createProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'qrCode' | 'createdBy' | 'updatedBy'>) => void;
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
  createPO: (supplierId: string, branchId: string, items: { productId: string; costPrice: number; quantityRequested: number }[], notes?: string) => void;
  updatePOStatus: (id: string, status: POStatus) => void;
  receivePOItems: (id: string, receivedMap: Record<string, number>) => void; // productId -> qty

  // Actions - Transmittals
  createTransmittal: (docType: TransmittalDocType, toBranchId: string, payloadJson: string, notes?: string) => void;
  updateTransmittalStatus: (id: string, status: TransmittalStatus) => void;

  // Actions - Stock Transfers & Distribution
  createStockTransfer: (fromBranchId: string, toBranchId: string, transferType: TransferType, items: { productId: string; quantity: number }[], reason: string) => void;
  updateStockTransferStatus: (id: string, status: TransferStatus) => void;

  // Helper Stats & Filter views
  stats: SummaryStats;
  addAuditLog: (action: string, description: string, tableAffected: string, recordId: string) => void;
  logManualAdjustment: (productId: string, quantity: number, notes: string) => void;
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

// Initial Seed data constants
const SEED_BRANCHES: Branch[] = [];

const SEED_USERS: User[] = [];

const SEED_SUPPLIERS: Supplier[] = [];

const SEED_PRODUCTS: Product[] = [];

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
const SEED_SALES: Sale[] = [];
const SEED_SALE_ITEMS: SaleItem[] = [];
const SEED_POS: PurchaseOrder[] = [];
const SEED_PO_ITEMS: PurchaseOrderItem[] = [];
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

export const DbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConfigured, setIsConfigured] = useState<boolean>(() => {
    const cached = localStorage.getItem('tp_is_configured');
    return cached === 'true';
  });

  // Load initial local data or populate with seed data
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const cached = localStorage.getItem('tp_current_user');
    if (cached) return JSON.parse(cached);
    return SEED_USERS[0] || GUEST_USER;
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
    const cached = localStorage.getItem('tp_users');
    return cached ? JSON.parse(cached) : SEED_USERS;
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
                                  u.username === 'carla_cashier' ? 'cashier123' : 'staff123';
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

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string; sqliBlocked?: boolean }> => {
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
    const cached = localStorage.getItem('tp_branches');
    return cached ? JSON.parse(cached) : SEED_BRANCHES;
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const cached = localStorage.getItem('tp_suppliers');
    return cached ? JSON.parse(cached) : SEED_SUPPLIERS;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const cached = localStorage.getItem('tp_products');
    return cached ? JSON.parse(cached) : SEED_PRODUCTS;
  });

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    const cached = localStorage.getItem('tp_purchase_orders');
    return cached ? JSON.parse(cached) : SEED_POS;
  });

  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>(() => {
    const cached = localStorage.getItem('tp_po_items');
    return cached ? JSON.parse(cached) : SEED_PO_ITEMS;
  });

  const [transmittals, setTransmittals] = useState<Transmittal[]>(() => {
    const cached = localStorage.getItem('tp_transmittals');
    return cached ? JSON.parse(cached) : SEED_TRANSMITTALS;
  });

  const [shifts, setShifts] = useState<Shift[]>(() => {
    const cached = localStorage.getItem('tp_shifts');
    return cached ? JSON.parse(cached) : SEED_SHIFTS;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const cached = localStorage.getItem('tp_sales');
    return cached ? JSON.parse(cached) : SEED_SALES;
  });

  const [saleItems, setSaleItems] = useState<SaleItem[]>(() => {
    const cached = localStorage.getItem('tp_sale_items');
    return cached ? JSON.parse(cached) : SEED_SALE_ITEMS;
  });

  const [movements, setMovements] = useState<InventoryMovement[]>(() => {
    const cached = localStorage.getItem('tp_movements');
    return cached ? JSON.parse(cached) : SEED_MOVEMENTS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const cached = localStorage.getItem('tp_audit_logs');
    return cached ? JSON.parse(cached) : SEED_AUDIT_LOGS;
  });

  // Hold / park transactions - standard in cashiers POS
  const [parkedSales, setParkedSales] = useState<{ id: string; customerName: string; notes: string; items: { product: Product; quantity: number }[]; timestamp: string }[]>(() => {
    const cached = localStorage.getItem('tp_parked_sales');
    return cached ? JSON.parse(cached) : [];
  });

  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>(() => {
    const cached = localStorage.getItem('tp_stock_transfers');
    return cached ? JSON.parse(cached) : [];
  });

  const [branchStock, setBranchStock] = useState<InventoryLocationStock[]>(() => {
    const cached = localStorage.getItem('tp_branch_stock');
    if (cached) return JSON.parse(cached);
    
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
    const cached = localStorage.getItem('tp_ledger_entries');
    return cached ? JSON.parse(cached) : [];
  });

  const [branchSalesReports, setBranchSalesReports] = useState<BranchSalesReport[]>(() => {
    const cached = localStorage.getItem('tp_branch_sales_reports');
    return cached ? JSON.parse(cached) : [];
  });

  const [deliveries, setDeliveries] = useState<Delivery[]>(() => {
    const cached = localStorage.getItem('tp_deliveries');
    return cached ? JSON.parse(cached) : [];
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
    
    const updatedSnapshots = [newSnapshot, ...dbSnapshots];
    setDbSnapshots(updatedSnapshots);
    localStorage.setItem('tp_db_snapshots', JSON.stringify(updatedSnapshots));

    addAuditLog('DB_BACKUP_CREATE', `Created manual backup snapshot: ${newSnapshot.name}`, 'SYSTEM', id);
  };

  const restoreDbSnapshot = (snapshotId: string): boolean => {
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
    const updated = dbSnapshots.filter(s => s.id !== snapshotId);
    setDbSnapshots(updated);
    localStorage.setItem('tp_db_snapshots', JSON.stringify(updated));
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
        notes: parsed.notes || 'Imported via offline secure JSON package.'
      };

      setBranchSalesReports(prev => {
        const updated = [newReport, ...prev];
        localStorage.setItem('tp_branch_sales_reports', JSON.stringify(updated));
        return updated;
      });

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

  // --- DATABASE FACTORY TRUNCATE & RE-SEED ENGINE ---
  const truncateDatabase = (mode: 'all' | 'transactions' | 'seeds') => {
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
  };

  // USERS
  const createUser = (userFields: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newUser: User = {
      ...userFields,
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
    addAuditLog('USER_RESET_PASSWORD', `Reset password request for user ID ${id}`, 'Users', id);
  };

  // BRANCHES
  const createBranch = (branchFields: Omit<Branch, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>) => {
    const newBranch: Branch = {
      ...branchFields,
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
  const createSupplier = (supFields: Omit<Supplier, 'id' | 'createdAt' | 'isDeleted'>) => {
    const newSup: Supplier = {
      ...supFields,
      id: `S-${Date.now()}`,
      createdAt: new Date().toISOString(),
      isDeleted: false,
    };
    setSuppliers(prev => [...prev, newSup]);
    addAuditLog('SUPPLIER_CREATE', `Created supplier ${newSup.name}`, 'Suppliers', newSup.id);
  };

  const updateSupplier = (id: string, updates: Partial<Supplier>) => {
    setSuppliers(prev => prev.map(s => (s.id === id ? { ...s, ...updates } : s)));
    addAuditLog('SUPPLIER_UPDATE', `Updated supplier ID ${id}`, 'Suppliers', id);
  };

  const deleteSupplier = (id: string) => {
    setSuppliers(prev => prev.map(s => (s.id === id ? { ...s, isDeleted: true } : s)));
    addAuditLog('SUPPLIER_DELETE', `Soft-deleted supplier ID ${id}`, 'Suppliers', id);
  };

  // PRODUCTS
  const createProduct = (prodFields: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'qrCode' | 'createdBy' | 'updatedBy'>) => {
    const newId = `P-${Date.now()}`;
    const newProd: Product = {
      ...prodFields,
      id: newId,
      qrCode: `TP-${prodFields.productCode}`,
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
      quantity: prodFields.stockQuantity,
      destinationBranchId: currentUser.branchAssignmentId,
      referenceId: 'INITIAL_STOCK',
      notes: 'Initial stock intake upon product registration',
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      username: currentUser.username,
    };
    setMovements(prev => [initMove, ...prev]);

    addAuditLog('PRODUCT_CREATE', `Created product ${newProd.productName}`, 'Products', newProd.id);
  };

  const updateProduct = (id: string, updates: Partial<Product>, customLogReason?: string) => {
    const original = products.find(p => p.id === id);
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        const nextQty = updates.stockQuantity !== undefined ? updates.stockQuantity : p.stockQuantity;
        // If stock level changed, record movement
        if (updates.stockQuantity !== undefined && updates.stockQuantity !== p.stockQuantity) {
          const diff = updates.stockQuantity - p.stockQuantity;
          logManualAdjustment(id, diff, customLogReason || 'Stock level manual correction from product edit panel');
        }

        return {
          ...p,
          ...updates,
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
      const sanitized = imported.map((p, i) => ({
        ...p,
        id: p.id || `P-IMPORT-${Date.now()}-${i}`,
        productCode: p.productCode || `TL-IMP-${Date.now()}-${i}`,
        sku: p.sku || `SKU-IMP-${Date.now()}-${i}`,
        barcode: p.barcode || `BAR-${Date.now()}-${i}`,
        qrCode: p.qrCode || `TP-IMP-${Date.now()}-${i}`,
        createdAt: p.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDeleted: !!p.isDeleted,
      }));

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
    const subtotal = cartItems.reduce((acc, item) => acc + (item.product.sellingPrice * item.quantity), 0);
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
      const unitPrice = (item as any).overridePrice !== undefined ? (item as any).overridePrice : item.product.sellingPrice;
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
  const createPO = (supplierId: string, branchId: string, itemInputs: { productId: string; costPrice: number; quantityRequested: number }[], notes?: string) => {
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
      status: 'Pending' as POStatus,
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
  const createTransmittal = (docType: TransmittalDocType, toBranchId: string, payloadJson: string, notes?: string) => {
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
          // 1. If moving to 'In Transit', deduct from fromBranchId
          if (status === 'In Transit' || (status === 'Approved' && prevStatus === 'Pending')) {
            setBranchStock(bStock => bStock.map(bs => {
              const matchedItem = t.items.find(item => item.productId === bs.productId && bs.branchId === t.fromBranchId);
              if (matchedItem) {
                const nextQty = Math.max(0, bs.quantity - matchedItem.quantity);
                // If this is Main Branch B1, synchronize the global product quantity too!
                if (t.fromBranchId === 'B1') {
                  setProducts(prods => prods.map(prod => prod.id === bs.productId ? { ...prod, stockQuantity: nextQty } : prod));
                }
                return { ...bs, quantity: nextQty };
              }
              return bs;
            }));

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

          // 2. If moving to 'Received', add to toBranchId
          if (status === 'Received') {
            setBranchStock(bStock => bStock.map(bs => {
              const matchedItem = t.items.find(item => item.productId === bs.productId && bs.branchId === t.toBranchId);
              if (matchedItem) {
                const nextQty = bs.quantity + matchedItem.quantity;
                // If this is Main Branch B1, synchronize global product quantity!
                if (t.toBranchId === 'B1') {
                  setProducts(prods => prods.map(prod => prod.id === bs.productId ? { ...prod, stockQuantity: nextQty } : prod));
                }
                return { ...bs, quantity: nextQty };
              }
              return bs;
            }));

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
