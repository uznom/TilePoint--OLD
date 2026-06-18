/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ADMIN = 'Admin',
  MANAGER = 'Manager',
  CASHIER = 'Cashier',
  STAFF = 'Staff',
}

export type UserStatus = 'Active' | 'Disabled';

export interface User {
  id: string;
  avatarInitials: string;
  fullName: string;
  username: string;
  email: string;
  role: UserRole;
  branchAssignmentId: string;
  status: UserStatus;
  passwordHash?: string; // Salted cryptographic pbkdf2 hash token
  managerPin?: string; // 4-6 digit passcode distinct from password for manager-level overrides
  profilePicture?: string; // Custom profile photo or SVG URL
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
  isDistributionBranch?: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
  isDeleted: boolean;
}

export interface Product {
  id: string;
  productCode: string;
  sku: string;
  barcode: string;
  qrCode: string;
  designName: string;
  productName: string;
  category: string;
  brand: string;
  supplierId: string;
  unit: string;
  size: string; // e.g. "60x60 cm"
  boxQuantity: number; // tiles per box
  coveragePerBox?: number; // coverage per box in sqm
  image?: string; // base64 string or image URL
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minimumStock: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  origin?: string; // where the product/stock came from
}

export type POStatus =
  | 'Draft'
  | 'Pending'
  | 'Approved'
  | 'Ordered'
  | 'Partially Received'
  | 'Completed'
  | 'Cancelled';

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  branchId: string;
  status: POStatus;
  requestedBy: string; // User Name
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  poId: string;
  productId: string;
  costPrice: number;
  quantityRequested: number;
  quantityReceived: number;
}

export type TransmittalDocType =
  | 'Daily Sales Report'
  | 'Inventory Count Report'
  | 'Purchase Order'
  | 'Receiving Report'
  | 'Branch Request'
  | 'Full Branch State Snapshot';

export type TransmittalStatus =
  | 'Draft'
  | 'Submitted'
  | 'Received'
  | 'Approved'
  | 'Archived';

export interface Transmittal {
  id: string;
  documentType: TransmittalDocType;
  fromBranchId: string;
  toBranchId: string;
  submittedBy: string;
  status: TransmittalStatus;
  payloadJson: string; // raw file contents (JSON)
  notes?: string;
  submittedAt: string;
  isDeleted: boolean;
}

export type ShiftStatus = 'OPEN' | 'CLOSED';

export interface Shift {
  id: string;
  cashierId: string;
  cashierName: string;
  branchId: string;
  status: ShiftStatus;
  startCash: number;
  endCash: number;
  cashCount: number;
  variance: number;
  openedAt: string;
  closedAt: string | null;
  shiftSalesCount: number;
  shiftSalesTotal: number;
  shiftVatTotal: number;
  shiftDiscountTotal: number;
}

export interface Sale {
  id: string;
  saleNumber: string;
  shiftId: string;
  branchId: string;
  cashierId: string;
  cashierName: string;
  customerName: string;
  subtotal: number;
  vat: number; // 12%
  discount: number; // flat amount or rate
  grandTotal: number;
  paymentMethod: 'Cash' | 'GCash' | 'Maya' | 'Credit Card' | 'Bank Transfer';
  amountTendered: number;
  changeAmount: number;
  notes?: string;
  createdAt: string;
  isDeleted: boolean;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  total: number;
  isDeleted: boolean;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  type: 'IN' | 'OUT' | 'ADJUST' | 'TRANSFER';
  quantity: number; // change quantity (+ for in, - for out)
  sourceBranchId?: string;
  destinationBranchId?: string;
  referenceId: string; // saleId or poId or manual adjust reference
  notes: string;
  timestamp: string;
  userId: string;
  username: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  description: string;
  tableAffected: string;
  recordId: string;
}

export type TransferStatus = 'Pending' | 'Approved' | 'In Transit' | 'Received' | 'Declined' | 'Cancelled';
export type TransferType = 'Replenishment' | 'Pull Out' | 'Redistribution' | 'Return to Warehouse';

export interface StockTransferItem {
  id: string;
  transferId: string;
  productId: string;
  productName: string;
  quantity: number;
}

export interface StockTransfer {
  id: string; // matches transfer_no
  transferNo: string;
  fromBranchId: string;
  toBranchId: string;
  transferType: TransferType;
  requestedBy: string; // username
  approvedBy?: string; // username
  status: TransferStatus;
  reason: string;
  createdAt: string;
  updatedAt: string;
  items: StockTransferItem[];
}

export interface InventoryLocationStock {
  id: string; // branchId + '_' + productId
  branchId: string;
  productId: string;
  quantity: number;
  sellingPriceOverride?: number;
  lowStockThresholdOverride?: number;
}

export interface LedgerEntry {
  id: string;
  date: string;
  productId: string;
  productName: string;
  branchId: string;
  movementType: 'IN' | 'OUT' | 'ADJUST' | 'TRANSFER' | 'PURCHASE' | 'SALE';
  quantity: number;
  referenceNo: string;
  remarks: string;
}

export interface BranchSalesReport {
  id: string;
  branchId: string;
  branchName: string;
  transferredAt: string;
  reportingDate: string;
  totalSalesCount: number;
  totalSalesAmount: number;
  totalVatAmount: number;
  totalDiscountAmount: number;
  transmissionType: 'Online' | 'Manual';
  status: 'Pending Audit' | 'Verified';
  sales: Sale[];
  saleItems: SaleItem[];
  auditedBy?: string;
  auditedAt?: string;
  notes?: string;
  importVerificationId?: string;
  securitySignature?: string;
}

export type DeliveryStatus = 'Pending Scheduling' | 'Scheduled' | 'Out For Delivery' | 'Delivered' | 'Failed Delivery' | 'Cancelled' | 'Packed';

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
  notes?: string;
  status: DeliveryStatus;
  truck?: string;
  driver?: string;
  helper?: string;
  deliveredBy?: string;
  deliveredAt?: string;
  proofPhotoUrl?: string; // base64 mockup or photo string
  customerSignature?: string; // signature text / doodle mock
  receiverName?: string;
  createdAt: string;
  updatedAt: string;
  branchId: string;
  branchName: string;
}

export type DamageCategory = 'BOA' | 'Warehouse Breakage' | 'Showroom Casualty' | 'Delivery Transit';
export type DamageActionTaken = 'Disposed / Scrapped' | 'Saved for Mosaic' | 'Claimed from Supplier / Insurance Code' | 'Returned for Credit';

export interface DamageLog {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  branchId: string;
  branchName: string;
  quantity: number;
  unitType: 'Box' | 'Piece';
  category: DamageCategory;
  actionTaken: DamageActionTaken;
  reportedBy: string;
  notes: string;
  reportedAt: string;
}




