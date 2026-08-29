import { z } from 'zod';

/**
 * Zod Schemas for Runtime API Boundary Validation
 * Validates untrusted or dynamic JSON responses from the server before state hydration.
 */

export const UserRoleSchema = z.enum(['Admin', 'Manager', 'Cashier', 'Staff']);

export const UserSchema = z.object({
  id: z.string(),
  avatarInitials: z.string().default('U'),
  fullName: z.string().default(''),
  username: z.string(),
  email: z.string().default(''),
  role: UserRoleSchema.default('Cashier'),
  branchAssignmentId: z.string().nullable().default(null),
  status: z.enum(['Active', 'Restricted', 'Archived']).or(z.string()).default('Active'),
  managerPin: z.string().optional(),
  profilePicture: z.string().optional(),
  isNew: z.boolean().optional(),
  mustResetPassword: z.boolean().optional(),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString())
});

export const BranchSchema = z.object({
  id: z.string(),
  name: z.string(),
  manager: z.string().default(''),
  address: z.string().default(''),
  phone: z.string().default(''),
  monthlySales: z.number().default(0),
  staffCount: z.number().default(0),
  activeCashiers: z.number().default(0),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
  isDeleted: z.boolean().default(false),
  branchCode: z.string().optional(),
  storeLogo: z.string().optional(),
  tin: z.string().optional()
});

export const ProductSchema = z.object({
  id: z.string(),
  productCode: z.string().default(''),
  productName: z.string().default('Unnamed Product'),
  category: z.string().default('Uncategorized'),
  category_id: z.string().optional(),
  brand: z.string().default('General'),
  supplierId: z.string().default(''),
  sku: z.string().default(''),
  product_sku: z.string().optional(),
  barcode: z.string().default(''),
  unitPrice: z.number().default(0),
  costPrice: z.number().default(0),
  stockQuantity: z.number().default(0),
  unitOfMeasure: z.string().default('Piece'),
  lowStockThreshold: z.number().default(5),
  vatExempt: z.boolean().default(false),
  vatInclusive: z.boolean().default(true),
  isDeleted: z.boolean().default(false),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString())
});

export const BranchStockSchema = z.object({
  id: z.string(),
  branchId: z.string(),
  productId: z.string(),
  quantity: z.number().default(0),
  lowStockThreshold: z.number().default(5),
  sellingPriceOverride: z.number().optional(),
  updatedAt: z.string().default(() => new Date().toISOString()),
  isDeleted: z.boolean().default(false)
});

export const SaleItemSchema = z.object({
  id: z.string(),
  saleId: z.string().default(''),
  productId: z.string(),
  productName: z.string().default(''),
  sku: z.string().default(''),
  quantity: z.number().default(1),
  unitPrice: z.number().default(0),
  lineTotal: z.number().default(0),
  discountPercent: z.number().default(0),
  discountAmount: z.number().default(0),
  costPrice: z.number().default(0),
  isDeleted: z.boolean().default(false)
});

export const SaleSchema = z.object({
  id: z.string(),
  saleNumber: z.string().default(''),
  branchId: z.string().default(''),
  cashierId: z.string().default(''),
  shiftId: z.string().default(''),
  subtotal: z.number().default(0),
  discount: z.number().default(0),
  vat: z.number().default(0),
  grandTotal: z.number().default(0),
  paymentMethod: z.string().default('Cash'),
  amountPaid: z.number().default(0),
  changeGiven: z.number().default(0),
  status: z.string().default('Completed'),
  createdAt: z.string().default(() => new Date().toISOString()),
  isDeleted: z.boolean().default(false),
  items: z.array(SaleItemSchema).default([])
});

export const AuditLogSchema = z.object({
  id: z.string(),
  timestamp: z.string().default(() => new Date().toISOString()),
  userId: z.string().default(''),
  userName: z.string().default(''),
  action: z.string().default(''),
  module: z.string().default('System'),
  details: z.string().default(''),
  branchId: z.string().optional(),
  ipAddress: z.string().optional()
});

export const DbSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  creator: z.string().default('System'),
  sizeBytes: z.number().default(0),
  timestamp: z.string().default(() => new Date().toISOString()),
  isDeleted: z.boolean().default(false),
  deletedAt: z.string().nullable().optional()
});

export const FullDatabaseEnvelopeSchema = z.object({
  success: z.boolean().default(true),
  hash: z.string().optional(),
  timestamp: z.string().optional(),
  data: z.record(z.string(), z.any()).optional(),
  db: z.record(z.string(), z.any()).optional()
});

export const LoginResponseSchema = z.object({
  success: z.boolean(),
  token: z.string().optional(),
  sessionId: z.string().optional(),
  user: UserSchema.optional(),
  error: z.string().optional(),
  mustResetPassword: z.boolean().optional()
});

/**
 * Safe parser for boundary validation with fallback
 */
export function safeParseApi<T>(schema: z.ZodType<T>, rawData: unknown, fallback: T): T {
  const result = schema.safeParse(rawData);
  if (result.success) {
    return result.data;
  }
  console.warn('[API Schema Validation Warning] Malformed payload received at boundary:', result.error.format());
  return fallback;
}

export function safeParseApiArray<T>(schema: z.ZodType<T>, rawArray: unknown): T[] {
  if (!Array.isArray(rawArray)) {
    return [];
  }
  return rawArray
    .map(item => {
      const res = schema.safeParse(item);
      return res.success ? res.data : null;
    })
    .filter((item): item is T => item !== null);
}
