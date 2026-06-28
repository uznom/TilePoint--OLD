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

export type PaymentMethod = string;
export type ShiftStatus = string;
export type DeliveryStatus = string;
export type BillStatus = string;
export type PaymentFrequency = string;
export type POStatus = string;
export type TransmittalDocType = string;
export type TransmittalStatus = string;
export type TransferStatus = string;
export type TransferType = string;
export type UserStatus = string;
export type DamageCategory = string;
export type DamageActionTaken = string;

export interface User {
  id: string;
  avatarInitials: string;
  fullName: string;
  username: string;
  email: string;
  role: UserRole;
  branchAssignmentId: string | null; // null for Corporate Office
  status: "Active" | "Restricted" | UserStatus;
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
  isDistributionBranch?: boolean; // HQ distribution center vs retail branch node
  storeLogo?: string; // Base64 context handle
  branchCode?: string;
  localIp?: string;
  gatewayRules?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
  updatedAt?: string;
  isDeleted: boolean;
}

export interface Brand {
  id: string;
  name: string;
  supplierId: string;
  description?: string;
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
  lowStockThreshold?: number;
  designName: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Extended fields used in the UI & DB
  size?: string;
  supplierId?: string;
  origin?: string;
  image?: string;
  boxQuantity?: number;
  coveragePerBox?: number;
  minimumStock?: number;
  qrCode?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface BranchStock {
  id: string;
  branchId: string;
  productId: string;
  quantity: number;
  lowStockThreshold?: number;
  lowStockThresholdOverride?: number;
  sellingPriceOverride?: number; // Local custom pricing override per branch layout rules
  updatedAt?: string;
}

export interface InventoryLocationStock {
  id: string;
  branchId: string;
  productId: string;
  quantity: number;
  lowStockThreshold?: number;
  lowStockThresholdOverride?: number;
  sellingPriceOverride?: number;
  updatedAt?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string; // e.g., PO-2026-001
  supplierId: string;
  supplierName?: string;
  totalAmount?: number;
  status: POStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  branchId?: string;
  requestedBy?: string;
  date?: string;
}

export interface PurchaseOrderItem {
  id: string;
  poId: string;
  productId: string;
  productName?: string;
  quantityOrdered?: number;
  quantityReceived: number;
  unitCost?: number;
  totalCost?: number;
  costPrice?: number;
  quantityRequested?: number;
}

// Alias for backwards compatibility
export type PoItem = PurchaseOrderItem;

export interface Transmittal {
  id: string;
  documentType: TransmittalDocType;
  fromBranchId: string | null;
  toBranchId: string;
  submittedBy: string;
  status: TransmittalStatus;
  payloadJson: string;
  notes?: string;
  submittedAt: string;
  isDeleted: boolean;
}

export interface Shift {
  id: string;
  branchId: string;
  cashierId: string;
  cashierName: string;
  openedAt: string;
  closedAt?: string;
  startCash: number; // Drawer opening float
  endCash?: number;
  cashCount: number; // Final physical drawer count on closing
  status: ShiftStatus;
  notes?: string;
  variance?: number;
  
  // Stats aggregated
  shiftSalesTotal: number;
  shiftVatTotal: number;
  shiftDiscountTotal: number;
  shiftSalesCount: number;
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
  isDeleted?: boolean;
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

export interface InventoryMovement {
  id: string;
  productId: string;
  type: string; // e.g., "IN" | "OUT" | "ADJUST" | "TRANSFER" etc.
  quantity: number;
  sourceBranchId?: string;
  destinationBranchId?: string;
  referenceId: string;
  notes?: string;
  timestamp: string;
  userId: string;
  username: string;
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
  truck?: string;
  driver?: string;
  helper?: string;
  branchId?: string;
  branchName?: string;
  receiverName?: string;
  customerSignature?: string;
  deliveredAt?: string;
  deliveredBy?: string;
}

export interface DamageLog {
  id: string;
  productId: string;
  productName: string;
  branchId: string;
  quantity: number;
  reason?: "BROKEN" | "FACTORY_DEFECT" | "BOA" | "YARD_ACCIDENT" | string;
  notes?: string;
  reportedBy: string;
  createdAt?: string;
  actionTaken?: string;
  category?: string;
  branchName?: string;
  reportedAt?: string;
  productSku?: string;
  unitType?: string;
}

export interface LedgerEntry {
  id: string;
  date: string;
  productId: string;
  productName: string;
  branchId: string;
  movementType: string;
  quantity: number;
  referenceNo: string;
  remarks: string;
}

export interface AuditLog {
  id: string;
  actionCode?: string; // e.g., POS_OVERRIDE_APPROVED, POS_VOID_PIN, USER_RESTRICT
  description?: string;
  module?:
    | "Sales"
    | "Inventory"
    | "Procurement"
    | "Users"
    | "Branches"
    | "Settings"
    | "Transmittals"
    | "StockTransfer";
  userId?: string;
  userName?: string;
  username?: string;
  referenceId?: string;
  createdAt?: string;
  timestamp?: string;
  action?: string;
  tableAffected?: string;
  recordId?: string;
}

export interface CustomCorporateBill {
  id: string;
  title: string; // Name of liability/bill (e.g., "Meralco Utility HQ", "Holcim Cement Fleet Installment")
  supplierId?: string; // Links to Supplier if tied to raw wholesale materials
  purchaseOrderId?: string; // Links to PurchaseOrder if initialized from a specific PO split terms
  totalAmount: number; // Absolute debt initialized
  remainingBalance?: number; // Decremented upon every partial billing payout
  frequency: PaymentFrequency; // Recurrence index rule
  nextDueDate: string; // Tracking calculation marker string used to build calendar dots
  installmentsCount?: number; // Running count of cycles completed
  status: BillStatus;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DbSnapshot {
  id: string;
  name: string;
  timestamp: string;
  creator: string;
  sizeBytes: number;
  data: string; // Raw compiled database JSON string snapshot context
}

export interface ActiveSession {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  role: UserRole;
  branchId: string;
  branchName: string;
  lastActive: string;
  userAgent: string;
}

export interface BranchSalesReport {
  id: string;
  branchId: string;
  branchName: string;
  reportingDate: string;
  totalSalesCount: number;
  totalSalesAmount: number;
  totalVatAmount: number;
  totalDiscountAmount: number;
  transmissionType: string;
  sales: Sale[];
  saleItems: SaleItem[];
  notes?: string;
  transferredAt: string;
  status: string;
  importVerificationId?: string;
  securitySignature?: string;
  approvedBy?: string;
  auditedBy?: string;
  auditedAt?: string;
}

export interface StockTransferItem {
  id: string;
  transferId: string;
  productId: string;
  productName: string;
  quantity: number;
}

export interface StockTransfer {
  id: string;
  transferNo: string;
  fromBranchId: string;
  toBranchId: string;
  transferType: TransferType;
  requestedBy: string;
  status: TransferStatus;
  reason: string;
  createdAt: string;
  updatedAt: string;
  items: StockTransferItem[];
  approvedBy?: string;
}
