/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ADMIN = "Admin",
  MANAGER = "Manager",
  CASHIER = "Cashier",
  STAFF = "Staff",
}

export type PaymentMethod =
  | "Cash"
  | "GCash"
  | "Maya"
  | "Credit Card"
  | "Bank Transfer";
export type ShiftStatus = "OPEN" | "CLOSED";
export type DeliveryStatus =
  | "PENDING"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";
export type BillStatus = "ACTIVE" | "SETTLED" | "SUSPENDED";
export type PaymentFrequency =
  | "WEEKLY"
  | "MONTHLY"
  | "SEMI_QUARTERLY"
  | "QUARTERLY"
  | "YEARLY";

export interface User {
  id: string;
  avatarInitials: string;
  fullName: string;
  username: string;
  email: string;
  role: UserRole;
  branchAssignmentId: string | null; // null for Corporate Office
  status: "Active" | "Restricted";
  managerPin?: string; // 4-digit PIN for overrides
  passwordHash?: string; // PBKDF2 secure token
  profilePicture?: string; // Base64 or URI asset pointer
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  name: string;
  manager: string;
  address: string;
  phone: string;
  monthlySales: number;
  staffCount: number;
  activeCashiers: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  isDistributionBranch: boolean; // HQ distribution center vs retail branch node
  storeLogo?: string; // Base64 context handle
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

export interface Brand {
  id: string;
  name: string;
  supplierId: string;
  createdAt: string;
  isDeleted: boolean;
}

export interface Product {
  id: string;
  productCode: string; // Unique enterprise alpha-numeric identifier
  productName: string;
  category: string;
  brand: string;
  sku: string;
  barcode: string;
  unit: string; // e.g., Pcs, Boxes, Sqm
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number; // Aggregate inventory counter across enterprise
  lowStockThreshold: number;
  designName: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BranchStock {
  id: string;
  branchId: string;
  productId: string;
  quantity: number;
  lowStockThreshold: number;
  sellingPriceOverride?: number; // Local custom pricing override per branch layout rules
  updatedAt: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string; // e.g., PO-2026-001
  supplierId: string;
  supplierName: string;
  totalAmount: number;
  status: "PENDING" | "APPROVED" | "RECEIVED" | "CANCELLED";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PoItem {
  id: string;
  poId: string;
  productId: string;
  productName: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  totalCost: number;
}

export interface Transmittal {
  id: string;
  transmittalNumber: string;
  sourceBranchId: string;
  destinationBranchId: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Shift {
  id: string;
  branchId: string;
  cashierId: string;
  cashierName: string;
  openedAt: string;
  closedAt?: string;
  startingCash: number;
  cashCount: number; // Final physical drawer count on closing
  status: ShiftStatus;
  notes?: string;
}

export interface Sale {
  id: string;
  saleNumber: string; // e.g., INV-10001
  shiftId: string;
  branchId: string;
  cashierId: string;
  cashierName: string;
  customerName: string;
  subtotal: number;
  vat: number; // 12% Output VAT metrics
  discount: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  amountTendered: number;
  changeAmount: number;
  notes?: string;
  isDeleted: boolean; // true if invoice has been voided via supervisor PIN
  createdAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface StockMovement {
  id: string;
  productId: string;
  branchId: string;
  type:
    | "IN"
    | "OUT"
    | "ADJUSTMENT_ADD"
    | "ADJUSTMENT_SUB"
    | "TRANSFER_OUT"
    | "TRANSFER_IN"
    | "DAMAGE_BOA";
  quantity: number;
  referenceId: string; // ID linking to Sale, PO, Transmittal, or Damage Log
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface Delivery {
  id: string;
  saleId: string;
  saleNumber: string;
  customerName: string;
  contactNumber: string;
  houseNo?: string;
  street?: string;
  barangay: string;
  cityMunicipality: string;
  landmark?: string;
  deliveryDate: string;
  deliveryTime?: string;
  status: DeliveryStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DamageLog {
  id: string;
  productId: string;
  productName: string;
  branchId: string;
  quantity: number;
  reason: "BROKEN" | "FACTORY_DEFECT" | "BOA" | "YARD_ACCIDENT";
  notes?: string;
  reportedBy: string;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  branchId: string;
  type: "DEBIT" | "CREDIT";
  category:
    | "SALES"
    | "PROCUREMENT"
    | "EXPENSE"
    | "FLOAT_ADJUSTMENT"
    | "BILL_PAYMENT";
  amount: number;
  referenceId: string;
  description: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actionCode: string; // e.g., POS_OVERRIDE_APPROVED, POS_VOID_PIN, USER_RESTRICT
  description: string;
  module:
    | "Sales"
    | "Inventory"
    | "Procurement"
    | "Users"
    | "Branches"
    | "Settings";
  userId: string;
  userName: string;
  referenceId?: string;
  createdAt: string;
}

/**
 * FIXED: SCHEMA EXTENSIONS TO FULLY ALIGN PROCUREMENT & RECURRING BILLS WITH THE PAYMENT CALENDAR
 */
export interface CustomCorporateBill {
  id: string;
  title: string; // Name of liability/bill (e.g., "Meralco Utility HQ", "Holcim Cement Fleet Installment")
  supplierId?: string; // Links to Supplier if tied to raw wholesale materials
  purchaseOrderId?: string; // Links to PurchaseOrder if initialized from a specific PO split terms
  totalAmount: number; // Absolute debt initialized
  remainingBalance: number; // Decremented upon every partial billing payout
  frequency: PaymentFrequency; // Recurrence index rule
  nextDueDate: string; // Tracking calculation marker string used to build calendar dots
  installmentsCount: number; // Running count of cycles completed
  status: BillStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbSnapshot {
  id: string;
  name: string;
  timestamp: string;
  creator: string;
  sizeBytes: number;
  data: string; // Raw compiled database JSON string snapshot context
}
