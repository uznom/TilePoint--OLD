/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AuditLog,
  Branch,
  Brand,
  InventoryMovement,
  Product,
  PurchaseOrder,
  PurchaseOrderItem,
  Sale,
  SaleItem,
  Shift,
  Supplier,
  Transmittal,
} from "../types/db";

// Hard-locked database tables containing active transactions, shift summaries, and stock levels (absolutely exempt from auto-purging)
// Core database tables containing active session & auth states (exempt from auto-clearing by Cashiers)
export const HARD_LOCKED_KEYS = [
  "tp_sales",
  "tp_sale_items",
  "tp_shifts",
  "tp_branch_stock",
  "tp_movements",
  "tp_users",
  "tp_branches",
];

// Production Seed collections (Clean empty initial states)
export const SEED_BRANCHES: Branch[] = [];
export const SEED_SUPPLIERS: Supplier[] = [];
export const SEED_BRANDS: Brand[] = [];
export const SEED_PRODUCTS: Product[] = [];
export const SEED_SHIFTS: Shift[] = [];
export const SEED_SALES: Sale[] = [];
export const SEED_SALE_ITEMS: SaleItem[] = [];
export const SEED_POS: PurchaseOrder[] = [];
export const SEED_PO_ITEMS: PurchaseOrderItem[] = [];
export const SEED_TRANSMITTALS: Transmittal[] = [];
export const SEED_MOVEMENTS: InventoryMovement[] = [];
export const SEED_AUDIT_LOGS: AuditLog[] = [];
