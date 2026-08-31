import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT_DIR = path.resolve(__dirname, '../../../');

// Boot-time security check: refuse to start if SECURITY_SECRET is missing or < 32 characters
export const BOOT_SECURITY_SECRET = process.env.SECURITY_SECRET;
if (!BOOT_SECURITY_SECRET || typeof BOOT_SECURITY_SECRET !== 'string' || BOOT_SECURITY_SECRET.trim().length < 32) {
  console.error("FATAL: SECURITY_SECRET environment variable is missing or under 32 characters. Refusing to boot.");
  process.exit(1);
}

export function getAppSecret() {
  const secret = process.env.SECURITY_SECRET;
  if (!secret || secret.length < 32) {
    console.error("FATAL: SECURITY_SECRET must be set and at least 32 characters long.");
    process.exit(1);
  }
  return secret;
}

export const PORT = Number(process.env.PORT) || 3000;
export const ALLOW_LOCAL_RESET = process.env.ALLOW_LOCAL_RESET === 'true' || process.env.ENABLE_LOCAL_RESET === 'true';

// SSL Certificate configurations
export const SSL_KEY_PATH = process.env.SSL_KEY_PATH || path.join(ROOT_DIR, 'key.pem');
export const SSL_CERT_PATH = process.env.SSL_CERT_PATH || path.join(ROOT_DIR, 'cert.pem');

export let useSsl = false;
export let sslOptions = {};

try {
  if (fs.existsSync(SSL_KEY_PATH) && fs.existsSync(SSL_CERT_PATH)) {
    sslOptions = {
      key: fs.readFileSync(SSL_KEY_PATH),
      cert: fs.readFileSync(SSL_CERT_PATH),
      minVersion: 'TLSv1.2',
    };
    useSsl = true;
  } else {
    console.info('[Security Notice] Standard HTTP mode active. To generate local TLS certificates, run: powershell -ExecutionPolicy Bypass -File .\\generate-certs.ps1');
  }
} catch (error) {
  console.warn('[Shared DB Server] SSL config detected but could not load files:', error.message);
}

export const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];

export const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    // Allow localhost, local network IPs, and AI Studio run.app domains dynamically
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const isRunApp = /\.run\.app$/.test(origin);
    const isLocalNetwork = /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin);
    
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin) || isLocalhost || isRunApp || isLocalNetwork) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'X-Session-Token', 'X-Client-ID', 'if-none-match'],
  credentials: true
};

export const DB_FILE_PATH = path.join(ROOT_DIR, 'db.json');
export const WAL_FILE_PATH = path.join(ROOT_DIR, 'degraded_wal.jsonl');

export const SHIFT_SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
export const DEFAULT_SESSION_MAX_DURATION_MINUTES = 480;
export const SESSION_IDLE_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours
export const LEGACY_MIGRATION_CUTOFF_DATE = new Date('2026-10-01T00:00:00.000Z');
export const BACKUP_SOFT_DELETE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Calculates the exact millisecond timestamp of the upcoming midnight (00:00:00.000)
 */
export function getNextMidnight(fromTimestamp = Date.now()) {
  const d = new Date(fromTimestamp);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

// Map JSON collection keys to MySQL tables
export const KEY_TO_TABLE_MAP = {
  'tp_branches': 'branches',
  'tp_users': 'users',
  'tp_suppliers': 'suppliers',
  'tp_brands': 'brands',
  'tp_products': 'products',
  'tp_inventory': 'inventory',
  'inventory': 'inventory',
  'tp_branch_stock': 'branch_stock',
  'tp_shifts': 'shifts',
  'tp_sales': 'sales',
  'tp_sale_items': 'sale_items',
  'tp_purchase_orders': 'purchase_orders',
  'tp_po_items': 'purchase_order_items',
  'tp_stock_transfers': 'stock_transfers',
  'tp_stock_transfer_items': 'stock_transfer_items',
  'tp_movements': 'stock_movements',
  'tp_inventory_movements': 'inventory_movements',
  'tp_deliveries': 'deliveries',
  'tp_damage_logs': 'damage_logs',
  'tp_ledger_entries': 'ledger_entries',
  'tp_audit_logs': 'audit_logs',
  'tp_custom_corporate_bills': 'custom_corporate_bills',
  'atpos_v2_custom_bills': 'custom_corporate_bills',
  'tp_transmittals': 'transmittals',
  'tp_members': 'members',
  'atpos_v2_members_list': 'members',
  'tp_expenses': 'expenses',
  'atpos_v2_expenses': 'expenses',
  'tp_product_returns': 'product_returns',
  'atpos_v2_returns': 'product_returns',
  'tp_branch_sales_reports': 'branch_sales_reports',
  'tp_active_sessions': 'active_sessions',
  'tp_db_snapshots': 'db_snapshots',
};

// Topological dependency order for foreign-key-safe batch inserts
export const DB_COLLECTION_PRIORITY_ORDER = Object.freeze([
  'tp_branches',
  'tp_suppliers',
  'tp_brands',
  'tp_users',
  'tp_products',
  'tp_inventory',
  'tp_branch_stock',
  'tp_shifts',
  'tp_sales',
  'tp_sale_items',
  'tp_purchase_orders',
  'tp_po_items',
  'tp_stock_transfers',
  'tp_stock_transfer_items',
  'tp_movements',
  'tp_inventory_movements',
  'tp_deliveries',
  'tp_damage_logs',
  'tp_ledger_entries',
  'tp_audit_logs',
  'tp_custom_corporate_bills',
  'atpos_v2_custom_bills',
  'tp_transmittals',
  'tp_members',
  'atpos_v2_members_list',
  'tp_expenses',
  'atpos_v2_expenses',
  'tp_product_returns',
  'atpos_v2_returns',
  'tp_branch_sales_reports',
  'tp_product_categories',
  'tp_unit_types',
  'tp_payment_methods',
  'tp_discount_schemes',
  'tp_damage_reasons'
]);

// Allowed schema columns per table for safe SQL generation
export const TABLE_COLUMNS = {
  branches: ['id', 'name', 'manager', 'address', 'phone', 'monthlySales', 'staffCount', 'activeCashiers', 'isDeleted', 'isDistributionBranch', 'storeLogo', 'branchCode', 'localIp', 'gatewayRules', 'receiptFacebook', 'receiptPromoText', 'receiptQrBase64', 'receiptThankYou', 'tin', 'logoSize', 'openingTime', 'closingTime', 'operatingDays', 'createdAt', 'updatedAt'],
  users: ['id', 'avatarInitials', 'fullName', 'username', 'email', 'role', 'branchAssignmentId', 'status', 'managerPin', 'passwordHash', 'profilePicture', 'isNew', 'mustResetPassword', 'createdAt', 'updatedAt'],
  suppliers: ['id', 'name', 'contactPerson', 'email', 'phone', 'address', 'isDeleted', 'createdAt', 'updatedAt'],
  brands: ['id', 'name', 'supplierId', 'description', 'isDeleted', 'createdAt'],
  products: ['id', 'productCode', 'productName', 'category', 'brand', 'sku', 'product_sku', 'category_id', 'barcode', 'unit', 'costPrice', 'sellingPrice', 'stockQuantity', 'lowStockThreshold', 'designName', 'size', 'supplierId', 'origin', 'image', 'boxQuantity', 'coveragePerBox', 'minimumStock', 'qrCode', 'createdBy', 'updatedBy', 'version', 'markupPercent', 'taxType', 'hasExpiration', 'expirationDate', 'isDeleted', 'createdAt', 'updatedAt'],
  inventory: ['id', 'productId', 'product_sku', 'category_id', 'productCode', 'productName', 'category', 'brand', 'sku', 'barcode', 'unit', 'branchId', 'stockQuantity', 'costPrice', 'sellingPrice', 'lowStockThreshold', 'supplierId', 'origin', 'version', 'isDeleted', 'createdAt', 'updatedAt'],
  branch_stock: ['id', 'branchId', 'productId', 'quantity', 'lowStockThreshold', 'lowStockThresholdOverride', 'sellingPriceOverride', 'version', 'updatedAt'],
  shifts: ['id', 'branchId', 'cashierId', 'cashierName', 'openedAt', 'closedAt', 'startCash', 'endCash', 'cashCount', 'status', 'notes', 'variance', 'shiftSalesTotal', 'shiftVatTotal', 'shiftDiscountTotal', 'shiftSalesCount'],
  sales: ['id', 'saleNumber', 'shiftId', 'branchId', 'cashierId', 'cashierName', 'customerName', 'subtotal', 'vat', 'discount', 'grandTotal', 'paymentMethod', 'amountTendered', 'changeAmount', 'notes', 'isDeleted', 'deletedAt', 'idempotencyKey', 'discountType', 'pointsEarned', 'pointsRedeemed', 'createdAt', 'updatedAt'],
  sale_items: ['id', 'saleId', 'productId', 'productName', 'quantity', 'unitPrice', 'total', 'isDeleted', 'deletedAt'],
  purchase_orders: ['id', 'poNumber', 'supplierId', 'supplierName', 'totalAmount', 'status', 'notes', 'branchId', 'requestedBy', 'date', 'isDeleted', 'deletedAt', 'idempotencyKey', 'paymentMode', 'termStartDate', 'termEndDate', 'termsLength', 'createdAt', 'updatedAt'],
  purchase_order_items: ['id', 'poId', 'productId', 'productName', 'quantityOrdered', 'quantityReceived', 'unitCost', 'totalCost', 'costPrice', 'quantityRequested', 'isDeleted', 'deletedAt'],
  stock_transfers: ['id', 'transferNo', 'fromBranchId', 'toBranchId', 'branchId', 'transferType', 'requestedBy', 'status', 'reason', 'approvedBy', 'isDeleted', 'deletedAt', 'timestamp', 'createdAt', 'updatedAt'],
  stock_transfer_items: ['id', 'transferId', 'productId', 'productName', 'quantity', 'isDeleted', 'deletedAt'],
  stock_movements: ['id', 'productId', 'branchId', 'type', 'quantity', 'referenceId', 'notes', 'createdBy', 'isDeleted', 'deletedAt', 'createdAt'],
  inventory_movements: ['id', 'productId', 'type', 'quantity', 'sourceBranchId', 'destinationBranchId', 'referenceId', 'notes', 'userId', 'username', 'timestamp', 'isDeleted', 'deletedAt'],
  deliveries: ['id', 'saleId', 'saleNumber', 'customerName', 'contactNumber', 'houseNo', 'street', 'barangay', 'cityMunicipality', 'landmark', 'deliveryDate', 'deliveryTime', 'status', 'notes', 'truck', 'driver', 'helper', 'branchId', 'branchName', 'receiverName', 'customerSignature', 'deliveredAt', 'deliveredBy', 'createdAt', 'updatedAt'],
  damage_logs: ['id', 'productId', 'productName', 'branchId', 'quantity', 'reason', 'notes', 'reportedBy', 'actionTaken', 'category', 'branchName', 'reportedAt', 'productSku', 'unitType', 'isDeleted', 'deletedAt', 'createdAt'],
  ledger_entries: ['id', 'date', 'productId', 'productName', 'branchId', 'movementType', 'quantity', 'referenceNo', 'remarks', 'isDeleted', 'deletedAt'],
  audit_logs: ['id', 'actionCode', 'description', 'module', 'userId', 'username', 'referenceId', 'action', 'tableAffected', 'recordId', 'changePayload', 'timestamp', 'createdAt', 'branchId'],
  custom_corporate_bills: ['id', 'title', 'supplierId', 'purchaseOrderId', 'totalAmount', 'remainingBalance', 'frequency', 'nextDueDate', 'installmentsCount', 'status', 'notes', 'isDeleted', 'deletedAt', 'createdAt', 'updatedAt'],
  transmittals: ['id', 'documentType', 'fromBranchId', 'toBranchId', 'submittedBy', 'status', 'payloadJson', 'notes', 'submittedAt', 'isDeleted'],
  members: ['id', 'fullName', 'phone', 'email', 'points', 'creditLimit', 'outstandingBalance', 'status', 'branchId', 'createdAt', 'updatedAt'],
  expenses: ['id', 'branchId', 'dateTime', 'category', 'amount', 'recordedBy', 'notes', 'isDeleted', 'deletedAt'],
  product_returns: ['id', 'saleId', 'productName', 'quantityReturned', 'amountRefunded', 'damageRestockFee', 'status', 'dateTime', 'isDeleted', 'deletedAt'],
  branch_sales_reports: ['id', 'branchId', 'branchName', 'reportingDate', 'totalSalesCount', 'totalSalesAmount', 'totalVatAmount', 'totalDiscountAmount', 'transmissionType', 'sales', 'saleItems', 'users', 'expenses', 'deliveries', 'purchaseOrders', 'pandl', 'heatmap', 'boa', 'notes', 'status', 'importVerificationId', 'securitySignature', 'approvedBy', 'auditedBy', 'auditedAt', 'transferredAt'],
  active_sessions: ['id', 'userId', 'username', 'fullName', 'role', 'branchId', 'branchName', 'lastActive', 'userAgent', 'fingerprint', 'deviceInfo', 'sessionStartedAt', 'expiresAt', 'maxDurationMinutes'],
  db_snapshots: ['id', 'name', 'creator', 'sizeBytes', 'data', 'timestamp', 'isDeleted', 'deletedAt']
};

export const SENSITIVE_FIELD_DENYLIST = Object.freeze(['passwordHash', 'managerPin']);
