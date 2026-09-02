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

export type PaymentMethod = "Cash" | "Card" | "GCash" | "Bank Transfer" | "Check" | "Corporate Credit" | "Split Payment" | (string & {});
export type ShiftStatus = "OPEN" | "CLOSED" | "Open" | "Closed" | (string & {});
export type DeliveryStatus = "Pending" | "In Transit" | "Delivered" | "Failed Delivery" | "Cancelled" | (string & {});
export type BillStatus = "Active" | "Completed" | "Pending" | (string & {});
export type PaymentFrequency = "WEEKLY" | "MONTHLY" | "SEMI_QUARTERLY" | "QUARTERLY" | "YEARLY" | (string & {});
export type POStatus = "Draft" | "Pending" | "Approved" | "Completed" | "Cancelled" | (string & {});
export type TransmittalDocType = "Official Receipt" | "Sales Invoice" | "Collection Receipt" | "Delivery Receipt" | (string & {});
export type TransmittalStatus = "Draft" | "Transmitted" | "Acknowledged" | "Received" | (string & {});
export type TransferStatus = "Pending" | "Approved" | "In Transit" | "Received" | "Completed" | "Cancelled" | (string & {});
export type TransferType = "Outbound" | "Inbound" | (string & {});
export type UserStatus = "Active" | "Restricted" | "Suspended" | "Inactive" | (string & {});
export type DamageCategory = "Broken" | "Chipped" | "Factory Defect" | "Water Damage" | "Expired" | (string & {});
export type DamageActionTaken = "Scrapped" | "Returned to Supplier" | "Discounted Sale" | "Written Off" | (string & {});
export type DiscountType = "NONE" | "FLAT" | "PERCENT" | "SENIOR" | "SENIOR5" | "PWD" | "CONTRACT" | "SOLO" | "ATHLETES" | (string & {});
export type AuditLogAction =
  | "MEMBER_CREATE"
  | "MEMBER_DELETE"
  | "MEMBER_PAYMENT"
  | "LOYALTY_ADJUST"
  | "EXPENSE_ADD"
  | "EXPENSE_DELETE"
  | "RETURN_ADD"
  | "RETURN_DELETE"
  | "CUSTOM_BILL_ADD"
  | "PAYABLE_INSTALLMENT"
  | "POS_RECEIPT_PRINT"
  | "POS_UNIFIED_RECEIPT_PRINT"
  | "PRINT_DELIVERY_RECEIPT"
  | "SALE_VOID"
  | "SHIFT_OPEN"
  | "SHIFT_CLOSE"
  | "POS_DRAFT_RECOVERY"
  | "USER_CREATE"
  | "USER_UPDATE"
  | "USER_DELETE"
  | (string & {});

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
 isNew?: boolean;
 mustResetPassword?: boolean;
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
 receiptFacebook?: string;
 receiptPromoText?: string;
 receiptQrBase64?: string;
 receiptThankYou?: string;
 receiptReturnPolicy?: string;
 receiptNonReturnablePolicy?: string;
 tin?: string;
 logoSize?: number; // Height of receipt logo in pixels (e.g. 40)
 openingTime?: string;
 closingTime?: string;
 operatingDays?: string[];
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
 version?: number;
 markupPercent?: number;
 taxType?: string;
 hasExpiration?: boolean;
 expirationDate?: string;
}

export interface BranchStock {
 id: string;
 branchId: string;
 productId: string;
 quantity: number;
 lowStockThreshold?: number;
 lowStockThresholdOverride?: number;
 sellingPriceOverride?: number; // Local custom pricing override per branch layout rules
 costPriceOverride?: number;
 updatedAt?: string;
 version?: number;
}

export interface InventoryLocationStock {
 id: string;
 branchId: string;
 productId: string;
 quantity: number;
 lowStockThreshold?: number;
 lowStockThresholdOverride?: number;
 sellingPriceOverride?: number;
 costPriceOverride?: number;
 updatedAt?: string;
 version?: number;
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
 isDeleted?: boolean;
 deletedAt?: string;
 idempotencyKey?: string;
 paymentMode?: "fully_paid" | "terms";
 termStartDate?: string;
 termEndDate?: string;
 termsLength?: number;
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
 isDeleted?: boolean;
 deletedAt?: string;
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
 customerAddress?: string;
 customerTin?: string;
 businessStyle?: string;
 subtotal: number;
 vat: number; // 12% Output VAT metrics
 discount: number;
 grandTotal: number;
 paymentMethod: PaymentMethod;
 amountTendered: number;
 changeAmount: number;
 notes?: string;
 isDeleted: boolean; // true if invoice has been voided via supervisor PIN
 deletedAt?: string;
 createdAt: string;
 updatedAt?: string;
 idempotencyKey?: string;
 discountType?: string;
 pointsEarned?: number;
 pointsRedeemed?: number;
}

export interface LoyaltyConfig {
 spendPerPoint: number;
 pointsPerSpend: number;
 pointValueInPhp: number;
 enabled: boolean;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  discountType?: string;
  total: number;
  isDeleted?: boolean;
  deletedAt?: string;
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
 isDeleted?: boolean;
 deletedAt?: string;
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
 isDeleted?: boolean;
 deletedAt?: string;
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
 isDeleted?: boolean;
 deletedAt?: string;
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
 isDeleted?: boolean;
 deletedAt?: string;
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
 changePayload?: string; // JSON or text payload of details/state change
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
 isDeleted?: boolean;
 deletedAt?: string;
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
 fingerprint?: string;
 deviceInfo?: string;
 sessionStartedAt?: string;
 expiresAt?: string;
 maxDurationMinutes?: number;
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
 users?: User[];
 notes?: string;
 transferredAt: string;
 status: string;
 importVerificationId?: string;
 securitySignature?: string;
 approvedBy?: string;
 auditedBy?: string;
 auditedAt?: string;
 expenses?: any[];
 deliveries?: any[];
 purchaseOrders?: any[];
 pandl?: {
  revenue: number;
  cogs: number;
  expenses: number;
  netProfit: number;
 };
 heatmap?: {
  hour: number;
  count: number;
  amount: number;
 }[];
 boa?: any[];
}

export interface StockTransferItem {
 id: string;
 transferId: string;
 productId: string;
 productName: string;
 quantity: number;
 isDeleted?: boolean;
 deletedAt?: string;
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
 isDeleted?: boolean;
 deletedAt?: string;
}

export interface Member {
 id: string;
 fullName: string;
 phone: string;
 email: string;
 address?: string;
 tin?: string;
 businessStyle?: string;
 points: number;
 creditLimit: number;
 outstandingBalance: number;
 status: "Active" | "Suspended";
 createdAt?: string;
 updatedAt?: string;
 branchId?: string;
}

export interface Expense {
 id: string;
 dateTime: string;
 category: string;
 amount: number;
 recordedBy: string;
 notes: string;
 branchId: string;
 isDeleted?: boolean;
 deletedAt?: string;
}

export interface ProductReturn {
 id: string;
 saleId: string;
 productName: string;
 quantityReturned: number;
 amountRefunded: number;
 damageRestockFee: number;
 status: "Restocked" | "Defective/Damaged";
 dateTime: string;
 isDeleted?: boolean;
 deletedAt?: string;
}

export type ArchivableCategory =
  | "auditLogs"
  | "movements"
  | "sales"
  | "expenses"
  | "returns"
  | "damageLogs";

export type RetentionPolicyMap = Record<ArchivableCategory, number>;

export interface CategoryRetentionRule {
  category: ArchivableCategory;
  label: string;
  retentionMonths: number; // 0 = Keep Indefinitely
  autoArchiveEnabled: boolean;
}

export interface PurgeResult {
  count: number;
  exportedFilename: string | null;
  category: ArchivableCategory;
  ageMonths: number;
  timestamp: string;
}

// ----------------------------------------------------
// DYNAMIC SYSTEM CONFIGURATION SCHEMAS (HIGH-PRIORITY)
// ----------------------------------------------------

export interface ProductCategory {
  id: string;
  name: string;
  code?: string;
  description?: string;
  color?: string;
  isDefault?: boolean;
  isEnabled?: boolean;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface UnitType {
  id: string;
  name: string;
  abbreviation: string;
  description?: string;
  allowDecimals?: boolean;
  isDefault?: boolean;
  isEnabled?: boolean;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomPaymentMethod {
  id: string;
  name: string;
  code: string;
  category: "Cash" | "E-Wallet" | "Card" | "Bank" | "Credit" | "Other";
  color?: string;
  activeColor?: string;
  requiresReference: boolean;
  referenceLabel?: string;
  accountNumber?: string;
  accountName?: string;
  qrCodeUrl?: string;
  instructions?: string;
  description?: string;
  isEnabled: boolean;
  isActive?: boolean;
  isDefault?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface DiscountScheme {
  id: string;
  name: string;
  code: string;
  type: "PERCENT" | "FLAT";
  value: number; // e.g. 20 for 20% or 100 for 100 PHP flat
  vatExempt: boolean; // e.g. Senior & PWD
  requiresIdNumber: boolean;
  requiresCustomerName: boolean;
  minimumSpend?: number;
  description?: string;
  isEnabled: boolean;
  isActive?: boolean;
  discountType?: "percentage" | "flat_amount" | "PERCENT" | "FLAT";
  ratePercent?: number;
  flatAmount?: number;
  isDefault?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface DamageReasonOption {
  id: string;
  name: string;
  code: string;
  category: DamageCategory;
  defaultAction: DamageActionTaken;
  description?: string;
  isEnabled: boolean;
  isActive?: boolean;
  isDefault?: boolean;
  createdAt: string;
  updatedAt?: string;
}

