import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { KEY_TO_TABLE_MAP, TABLE_COLUMNS, SENSITIVE_FIELD_DENYLIST, DB_COLLECTION_PRIORITY_ORDER } from '../config/serverConfig.js';
import { pool, isConnectionError } from './mysqlPool.js';
import { alasql, upsertRecordAlasql } from './alasqlEngine.js';
import {
  getIsMysqlActive,
  getMysqlEnforced,
  markServerDegraded,
  setExecuteReplayOpHandler
} from './degradedStore.js';

// Legacy system_settings keys that now live in dedicated MySQL tables.
// These must be purged from system_settings and stripped from the in-memory
// db object to prevent stale empty-array data from shadowing real table data.
const STALE_SETTINGS_KEYS = new Set([
  'sales', 'saleItems', 'shifts', 'movements', 'products', 'branchStock',
  'users', 'branches', 'suppliers', 'brands', 'customBills', 'damageLogs',
  'deliveries', 'expenses', 'ledgerEntries', 'members', 'poItems',
  'productReturns', 'purchaseOrders', 'transmittals',
  // Also strip any mirror-style keys that collide with mirrorStandardDbKeys()
  'auditLogs', 'stockTransfers', 'inventory_movements', 'stock_movements',
  'purchase_order_items', 'branch_stock', 'sale_items', 'audit_logs',
  'ledger_entries', 'purchase_orders', 'po_items', 'stock_transfers',
  'damage_logs', 'product_returns', 'branch_sales_reports', 'branchSalesReports',
  'custom_corporate_bills', 'inventory',
]);

let cachedFullDb = null;
let cachedDbHash = null;
let isDbCacheDirty = true;
let isConfiguredCache = null;

export function isBcryptHash(token) {
  if (typeof token !== 'string') return false;
  return token.startsWith('$2a$') || token.startsWith('$2b$') || token.startsWith('$2y$');
}

export function computeDatabaseHash(dbObj) {
  try {
    const rawStr = JSON.stringify(dbObj, (key, value) => {
      if (key === 'tp_db_snapshots' || key === 'tp_processed_delta_ids') return undefined;
      return value;
    });
    return crypto.createHash('md5').update(rawStr).digest('hex');
  } catch (err) {
    return String(Date.now());
  }
}

export function invalidateDbCache() {
  isDbCacheDirty = true;
  cachedFullDb = null;
  cachedDbHash = null;
  isConfiguredCache = null;
}

export function getCachedDbHash() {
  return cachedDbHash;
}

export function getCachedFullDb() {
  return cachedFullDb;
}

export function getIsDbCacheDirty() {
  return isDbCacheDirty;
}

export function readDbFile() { return {}; }

export function writeDbFile(data) {
  if (!getIsMysqlActive()) {
    if (data && typeof data === 'object') {
      cachedFullDb = data;
      cachedDbHash = computeDatabaseHash(data);
      isDbCacheDirty = false;
    }
  } else {
    invalidateDbCache();
  }
}

export function scheduleDebouncedDbFileWrite() { return; }

export function parseRowFromMysql(tableName, row) {
  if (!row) return row;
  const res = { ...row };
  
  const parseBoolVal = (val) => {
    if (val === true || val === 1 || val === '1' || val === 'true' || val === 'TRUE') return true;
    return false;
  };
  const boolCols = ['isDeleted', 'isDistributionBranch', 'isNew', 'hasExpiration'];
  boolCols.forEach(col => {
    if (col in res) {
      res[col] = parseBoolVal(res[col]);
    }
  });

  const jsonCols = [
    'operatingDays', 'changePayload', 'payloadJson', 'sales', 'saleItems',
    'users', 'expenses', 'deliveries', 'purchaseOrders', 'pandl', 'heatmap', 'boa'
  ];
  jsonCols.forEach(col => {
    if (col in res && typeof res[col] === 'string') {
      try {
        res[col] = JSON.parse(res[col]);
      } catch (e) {}
    }
  });

  NUMERIC_COLUMNS.forEach(col => {
    if (col in res && res[col] !== null && res[col] !== undefined && typeof res[col] !== 'number') {
      const n = Number(res[col]);
      if (!isNaN(n)) {
        res[col] = n;
      }
    }
  });

  return res;
}

export const NUMERIC_COLUMNS = new Set([
  'subtotal', 'vat', 'discount', 'grandTotal', 'amountTendered', 'changeAmount', 'pointsEarned', 'pointsRedeemed',
  'quantity', 'unitPrice', 'total', 'costPrice', 'sellingPrice', 'stockQuantity', 'boxQuantity', 'coveragePerBox',
  'minimumStock', 'markupPercent', 'lowStockThreshold', 'lowStockThresholdOverride', 'sellingPriceOverride', 'costPriceOverride',
  'startCash', 'endCash', 'cashCount', 'variance', 'shiftSalesTotal', 'shiftVatTotal', 'shiftDiscountTotal', 'shiftSalesCount',
  'totalAmount', 'termsLength', 'quantityOrdered', 'quantityReceived', 'unitCost', 'totalCost', 'quantityRequested',
  'amount', 'refundAmount', 'downpayment', 'balance', 'totalSpent', 'points', 'creditLimit', 'outstandingBalance', 'damageRestockFee'
]);

export async function upsertRecordMysql(tableName, record, executor = pool) {
  if (!record || typeof record !== 'object') return;
  const allowed = TABLE_COLUMNS[tableName];
  
  let keys = Object.keys(record).filter(k => record[k] !== undefined);
  if (allowed) {
    keys = keys.filter(k => allowed.includes(k));
  }
  if (keys.length === 0) return;

  const exec = executor || pool;

  const formatValue = (val, k) => {
    if (val === null || val === undefined) return null;
    if (NUMERIC_COLUMNS.has(k)) {
      if (typeof val === 'number') return isNaN(val) ? 0 : val;
      const n = Number(val);
      return isNaN(n) ? 0 : n;
    }
    if (typeof val === 'boolean') return val ? 1 : 0;
    if (val instanceof Date) {
      return val.toISOString().slice(0, 19).replace('T', ' ');
    }
    if (typeof val === 'object') return JSON.stringify(val);
    if (typeof val === 'string' && (k.endsWith('At') || k.endsWith('Date') || k === 'timestamp' || k === 'dateTime' || k === 'lastActive')) {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d.toISOString().slice(0, 19).replace('T', ' ');
      }
    }
    return val;
  };

  // If record has an id, check if it already exists to safely perform an UPDATE without violating NOT NULL constraints on untouched columns
  if (record.id !== undefined && record.id !== null) {
    try {
      const [existing] = await exec.query(`SELECT 1 FROM \`${tableName}\` WHERE id = ? LIMIT 1`, [record.id]);
      if (existing && existing.length > 0) {
        const updateKeys = keys.filter(k => k !== 'id');
        if (updateKeys.length === 0) return; // Nothing to update
        const setClause = updateKeys.map(k => `\`${k}\` = ?`).join(', ');
        const updateValues = updateKeys.map(k => formatValue(record[k], k));
        updateValues.push(record.id);
        await exec.execute(`UPDATE \`${tableName}\` SET ${setClause} WHERE id = ?`, updateValues);
        return;
      }
    } catch (_) {
      // If table doesn't have an id column or check fails, fallback to INSERT ... ON DUPLICATE KEY UPDATE
    }
  }

  // Fallback defaults for NOT NULL columns without default values if inserting brand new record
  if (tableName === 'products') {
    if (!record.productCode) {
      keys.push('productCode');
      record.productCode = record.id;
    }
    if (!record.productName) {
      keys.push('productName');
      record.productName = 'Product ' + record.id;
    }
    if (!record.category) {
      keys.push('category');
      record.category = 'General';
    }
  } else if (tableName === 'branches') {
    if (!record.name) {
      keys.push('name');
      record.name = record.id || 'Branch';
    }
  }

  const columns = keys.map(k => `\`${k}\``).join(', ');
  const placeholders = keys.map(() => '?').join(', ');
  const updateClause = keys.filter(k => k !== 'id').map(k => `\`${k}\` = VALUES(\`${k}\`)`).join(', ');
  const values = keys.map(k => formatValue(record[k], k));

  const sql = `
    INSERT INTO \`${tableName}\` (${columns})
    VALUES (${placeholders})
    ${updateClause ? `ON DUPLICATE KEY UPDATE ${updateClause}` : ''}
  `;

  await exec.execute(sql, values);
}

export async function upsertBatchMysql(tableName, records, chunkSize = 50, executor = pool) {
  if (!records || !Array.isArray(records) || records.length === 0) return;
  const allowed = TABLE_COLUMNS[tableName];
  if (!allowed) return;

  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const keySet = new Set();
    chunk.forEach(rec => {
      if (rec && typeof rec === 'object') {
        Object.keys(rec).forEach(k => {
          if (allowed.includes(k) && rec[k] !== undefined) {
            keySet.add(k);
          }
        });
      }
    });

    const keys = Array.from(keySet);
    if (keys.length === 0) continue;

    const columnsStr = keys.map(k => `\`${k}\``).join(', ');
    const updateClause = keys.filter(k => k !== 'id').map(k => `\`${k}\` = VALUES(\`${k}\`)`).join(', ');

    const rowPlaceholders = [];
    const values = [];

    for (const rec of chunk) {
      if (!rec || typeof rec !== 'object') continue;
      const placeholders = keys.map(() => '?').join(', ');
      rowPlaceholders.push(`(${placeholders})`);

      for (const k of keys) {
        const val = rec[k];
        if (val === null || val === undefined) {
          values.push(null);
        } else if (typeof val === 'boolean') {
          values.push(val ? 1 : 0);
        } else if (val instanceof Date) {
          values.push(val.toISOString().slice(0, 19).replace('T', ' '));
        } else if (typeof val === 'object') {
          values.push(JSON.stringify(val));
        } else if (typeof val === 'string' && (k.endsWith('At') || k.endsWith('Date') || k === 'timestamp' || k === 'dateTime' || k === 'lastActive')) {
          const d = new Date(val);
          if (!isNaN(d.getTime())) {
            values.push(d.toISOString().slice(0, 19).replace('T', ' '));
          } else {
            values.push(val);
          }
        } else {
          values.push(val);
        }
      }
    }

    if (rowPlaceholders.length === 0) continue;

    const sql = `
      INSERT INTO \`${tableName}\` (${columnsStr})
      VALUES ${rowPlaceholders.join(', ')}
      ${updateClause ? `ON DUPLICATE KEY UPDATE ${updateClause}` : ''}
    `;

    const exec = executor || pool;
    await exec.execute(sql, values);
  }
}

export function stripSensitiveFields(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => stripSensitiveFields(item));
  }
  const clean = { ...obj };
  for (const field of SENSITIVE_FIELD_DENYLIST) {
    delete clean[field];
  }
  return clean;
}

export function sanitizeDatabaseFields(db) {
  if (!db || typeof db !== 'object') return db;
  for (const key of Object.keys(db)) {
    if (Array.isArray(db[key])) {
      db[key] = db[key].map(item => stripSensitiveFields(item));
    }
  }
  return db;
}

export async function getInternalUserByUsername(username) {
  const cleanUsername = (username || '').trim().toLowerCase();
  if (!cleanUsername) return null;

  if (getIsMysqlActive() || getMysqlEnforced()) {
    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?', [cleanUsername, cleanUsername]);
      if (rows.length > 0) {
        return parseRowFromMysql('users', rows[0]);
      }
    } catch (err) {
      console.warn('[User Store] MySQL query user error:', err.message);
    }
  }

  try {
    const rows = alasql('SELECT * FROM `users` WHERE LOWER(username) = ? OR LOWER(email) = ?', [cleanUsername, cleanUsername]) || [];
    if (rows.length > 0) {
      return parseRowFromMysql('users', rows[0]);
    }
  } catch (e) {}

  const db = readDbFile();
  const users = Array.isArray(db.tp_users) ? db.tp_users : [];
  return users.find(u => 
    (u.username || '').trim().toLowerCase() === cleanUsername ||
    (u.email || '').trim().toLowerCase() === cleanUsername
  ) || null;
}

export function getInternalUserSync(userId) {
  if (!userId) return null;
  try {
    const rows = alasql('SELECT * FROM `users` WHERE id = ?', [userId]);
    if (rows && rows.length > 0) {
      return parseRowFromMysql('users', rows[0]);
    }
  } catch (_) {}
  const db = readDbFile();
  const users = Array.isArray(db.tp_users) ? db.tp_users : [];
  return users.find(u => u.id === userId) || null;
}

export async function getInternalUserById(userId) {
  if (!userId) return null;
  if (getIsMysqlActive() || getMysqlEnforced()) {
    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
      if (rows.length > 0) {
        return parseRowFromMysql('users', rows[0]);
      }
    } catch (err) {
      console.warn('[User Store] MySQL query user by id error:', err.message);
    }
  }
  return getInternalUserSync(userId);
}

/**
 * Strips stale legacy collection keys that were loaded from system_settings.
 * Must be called AFTER loading system_settings but BEFORE loading real table data
 * or running mirrorStandardDbKeys(), so that stale empty arrays don't shadow real data.
 */
export function cleanStaleSettingsFromDb(db) {
  if (!db || typeof db !== 'object') return db;
  for (const key of STALE_SETTINGS_KEYS) {
    if (key in db) {
      delete db[key];
    }
  }
  return db;
}

/**
 * One-time cleanup: DELETE stale collection keys from the system_settings MySQL table.
 * These keys now live in dedicated tables and their system_settings copies are outdated.
 */
export async function cleanStaleSettingsFromMysql() {
  if (!getIsMysqlActive() && !getMysqlEnforced()) return;
  try {
    const keys = Array.from(STALE_SETTINGS_KEYS);
    if (keys.length === 0) return;
    const placeholders = keys.map(() => '?').join(', ');
    const [result] = await pool.query(
      `DELETE FROM system_settings WHERE setting_key IN (${placeholders})`,
      keys
    );
    if (result.affectedRows > 0) {
      console.log(`[DB Cleanup] Purged ${result.affectedRows} stale system_settings keys: ${keys.filter(k => result.affectedRows > 0).join(', ')}`);
      invalidateDbCache();
    }
  } catch (err) {
    console.warn('[DB Cleanup] Could not purge stale system_settings:', err.message);
  }
}

export function mirrorStandardDbKeys(db) {
  if (!db || typeof db !== 'object') return db;

  // Use direct reference assignment so all aliases point to the same array object
  if (db.tp_sales) { db.sales = db.tp_sales; }
  if (db.tp_sale_items) { db.sale_items = db.tp_sale_items; db.saleItems = db.tp_sale_items; }
  if (db.tp_shifts) { db.shifts = db.tp_shifts; }
  if (db.tp_movements || db.tp_inventory_movements) {
    db.movements = (db.tp_inventory_movements && db.tp_inventory_movements.length > 0) ? db.tp_inventory_movements : (db.tp_movements || []);
    db.inventory_movements = db.tp_inventory_movements || [];
    db.stock_movements = db.tp_movements || [];
  }
  if (db.tp_audit_logs) { db.audit_logs = db.tp_audit_logs; db.auditLogs = db.tp_audit_logs; }
  if (db.tp_ledger_entries) { db.ledger_entries = db.tp_ledger_entries; db.ledgerEntries = db.tp_ledger_entries; }
  if (db.tp_purchase_orders) { db.purchase_orders = db.tp_purchase_orders; db.purchaseOrders = db.tp_purchase_orders; }
  if (db.tp_po_items) { db.po_items = db.tp_po_items; db.purchase_order_items = db.tp_po_items; db.poItems = db.tp_po_items; }
  if (db.tp_stock_transfers) { db.stock_transfers = db.tp_stock_transfers; db.stockTransfers = db.tp_stock_transfers; }
  if (db.tp_deliveries) { db.deliveries = db.tp_deliveries; }
  if (db.tp_damage_logs) { db.damage_logs = db.tp_damage_logs; db.damageLogs = db.tp_damage_logs; }
  if (db.tp_transmittals) { db.transmittals = db.tp_transmittals; }
  if (db.tp_custom_corporate_bills || db.atpos_v2_custom_bills) {
    const bills = db.tp_custom_corporate_bills || db.atpos_v2_custom_bills || [];
    db.custom_corporate_bills = bills;
    db.customBills = bills;
    db.atpos_v2_custom_bills = bills;
  }
  if (db.tp_members || db.atpos_v2_members_list) {
    const mems = db.tp_members || db.atpos_v2_members_list || [];
    db.members = mems;
    db.atpos_v2_members_list = mems;
  }
  if (db.tp_expenses || db.atpos_v2_expenses) {
    const exps = db.tp_expenses || db.atpos_v2_expenses || [];
    db.expenses = exps;
    db.atpos_v2_expenses = exps;
  }
  if (db.tp_product_returns || db.atpos_v2_returns) {
    const rets = db.tp_product_returns || db.atpos_v2_returns || [];
    db.product_returns = rets;
    db.productReturns = rets;
    db.atpos_v2_returns = rets;
  }
  if (db.tp_branch_sales_reports) {
    db.branch_sales_reports = db.tp_branch_sales_reports;
    db.branchSalesReports = db.tp_branch_sales_reports;
  }
  if (db.tp_branches) { db.branches = db.tp_branches; }
  if (db.tp_users) { db.users = db.tp_users; }
  if (db.tp_suppliers) { db.suppliers = db.tp_suppliers; }
  if (db.tp_brands) { db.brands = db.tp_brands; }
  if (db.tp_products) { db.products = db.tp_products; }
  if (db.tp_branch_stock) { db.branch_stock = db.tp_branch_stock; db.branchStock = db.tp_branch_stock; }

  return db;
}

export function readFullDatabaseFromAlasql() {
  const db = {};

  try {
    const settings = alasql('SELECT setting_key, setting_value FROM `system_settings`') || [];
    for (const r of settings) {
      try {
        db[r.setting_key] = JSON.parse(r.setting_value);
      } catch {
        db[r.setting_key] = r.setting_value;
      }
    }
  } catch (e) {}

  // Strip stale legacy collection keys before loading real table data
  cleanStaleSettingsFromDb(db);

  for (const [tpKey, tableName] of Object.entries(KEY_TO_TABLE_MAP)) {
    if (tpKey === 'tp_db_snapshots') continue;
    try {
      const tableRows = alasql(`SELECT * FROM \`${tableName}\``) || [];
      db[tpKey] = tableRows.map(r => parseRowFromMysql(tableName, r));
    } catch (err) {
      db[tpKey] = [];
    }
  }

  if (Array.isArray(db.tp_users) && db.tp_users.length > 0) {
    db.tp_is_configured = 'true';
    db.tilepoint_onboarded_setup = 'true';
  }

  sanitizeDatabaseFields(db);
  mirrorStandardDbKeys(db);

  const hash = computeDatabaseHash(db);
  return { db, hash };
}

export async function readFullDatabaseFromMysql() {
  const db = {};

  try {
    const [rows] = await pool.query('SELECT setting_key, setting_value FROM system_settings');
    for (const r of rows) {
      try {
        db[r.setting_key] = JSON.parse(r.setting_value);
      } catch {
        db[r.setting_key] = r.setting_value;
      }
    }
  } catch (e) {}

  // Strip stale legacy collection keys before loading real table data
  cleanStaleSettingsFromDb(db);

  const entries = Object.entries(KEY_TO_TABLE_MAP).filter(([tpKey]) => tpKey !== 'tp_db_snapshots');

  const results = await Promise.allSettled(
    entries.map(async ([tpKey, tableName]) => {
      const [tableRows] = await pool.query(`SELECT * FROM \`${tableName}\``);
      return { tpKey, tableName, tableRows };
    })
  );

  for (const res of results) {
    if (res.status === 'fulfilled') {
      const { tpKey, tableName, tableRows } = res.value;
      db[tpKey] = tableRows.map(r => parseRowFromMysql(tableName, r));
    } else {
      console.warn('[MySQL Read Error]', res.reason?.message);
    }
  }

  if (Array.isArray(db.tp_users) && db.tp_users.length > 0) {
    db.tp_is_configured = 'true';
    db.tilepoint_onboarded_setup = 'true';
  }

  sanitizeDatabaseFields(db);
  mirrorStandardDbKeys(db);

  const hash = computeDatabaseHash(db);
  return { db, hash };
}

export async function readFullDatabase() {
  if (!isDbCacheDirty && cachedFullDb && cachedDbHash) {
    return { db: cachedFullDb, hash: cachedDbHash };
  }

  if (getIsMysqlActive() || getMysqlEnforced()) {
    try {
      const res = await readFullDatabaseFromMysql();
      cachedFullDb = res.db;
      cachedDbHash = res.hash;
      isDbCacheDirty = false;
      return res;
    } catch (err) {
      if (isConnectionError(err)) {
        markServerDegraded(`MySQL read failed: ${err.message} (${err.code})`);
      } else {
        console.error('[Database Query Error] readFullDatabaseFromMysql query error:', err.message);
      }
    }
  }

  return readFullDatabaseFromAlasql();
}

export function saveKeyToAlasql(key, value) {
  const tableName = KEY_TO_TABLE_MAP[key];

  if (tableName) {
    if (Array.isArray(value)) {
      for (const item of value) {
        upsertRecordAlasql(tableName, item);
      }
      if (key === 'tp_products') {
        for (const item of value) {
          const invItem = {
            id: item.id,
            productId: item.id,
            product_sku: item.product_sku || item.sku || item.productCode,
            category_id: item.category_id || item.category || 'General',
            productCode: item.productCode,
            productName: item.productName,
            category: item.category,
            brand: item.brand,
            sku: item.sku,
            barcode: item.barcode,
            unit: item.unit,
            stockQuantity: item.stockQuantity !== undefined ? item.stockQuantity : 0,
            costPrice: item.costPrice !== undefined ? item.costPrice : 0,
            sellingPrice: item.sellingPrice !== undefined ? item.sellingPrice : 0,
            lowStockThreshold: item.minimumStock || item.lowStockThreshold || 10,
            supplierId: item.supplierId || null,
            origin: item.origin || null,
            version: item.version || 1,
            isDeleted: item.isDeleted ? 1 : 0
          };
          try {
            upsertRecordAlasql('inventory', invItem);
          } catch (_) {}
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      upsertRecordAlasql(tableName, value);
    }
  } else {
    const valStr = typeof value === 'string' ? value : JSON.stringify(value);
    try {
      alasql('DELETE FROM `system_settings` WHERE `setting_key` = ?', [key]);
      alasql('INSERT INTO `system_settings` VALUES (?, ?)', [key, valStr]);
    } catch (e) {}
  }
}

export async function saveKeyToMysql(key, value) {
  const tableName = KEY_TO_TABLE_MAP[key];

  if (tableName) {
    if (Array.isArray(value)) {
      let sanitizedBatch = value;
      if (key === 'tp_products') {
        // Sanitize supplierId foreign key if needed
        sanitizedBatch = value.map(p => ({
          ...p,
          supplierId: (p.supplierId && p.supplierId !== 'central') ? p.supplierId : null
        }));
      }
      await upsertBatchMysql(tableName, sanitizedBatch);

      if (key === 'tp_products') {
        const inventoryItems = sanitizedBatch.map(p => ({
          id: p.id,
          productId: p.id,
          product_sku: p.product_sku || p.sku || p.productCode,
          category_id: p.category_id || p.category || 'General',
          productCode: p.productCode,
          productName: p.productName,
          category: p.category,
          brand: p.brand,
          sku: p.sku,
          barcode: p.barcode,
          unit: p.unit,
          stockQuantity: p.stockQuantity !== undefined ? p.stockQuantity : 0,
          costPrice: p.costPrice !== undefined ? p.costPrice : 0,
          sellingPrice: p.sellingPrice !== undefined ? p.sellingPrice : 0,
          lowStockThreshold: p.minimumStock || p.lowStockThreshold || 10,
          supplierId: p.supplierId || null,
          origin: p.origin || null,
          version: p.version || 1,
          isDeleted: p.isDeleted ? 1 : 0
        }));
        try {
          await upsertBatchMysql('inventory', inventoryItems);
        } catch (invErr) {
          console.warn('[saveKeyToMysql inventory sync warning]:', invErr.message);
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      let sanitizedRec = value;
      if (key === 'tp_products') {
        sanitizedRec = {
          ...value,
          supplierId: (value.supplierId && value.supplierId !== 'central') ? value.supplierId : null
        };
      }
      await upsertRecordMysql(tableName, sanitizedRec);
    }
  } else {
    const valStr = typeof value === 'string' ? value : JSON.stringify(value);
    await pool.execute(`
      INSERT INTO system_settings (setting_key, setting_value)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    `, [key, valStr]);
  }
}

export async function saveKeyToStore(key, value) {
  if (key === 'tp_users' && Array.isArray(value)) {
    for (const u of value) {
      if (u.passwordHash && typeof u.passwordHash === 'string' && !isBcryptHash(u.passwordHash)) {
        u.passwordHash = await bcrypt.hash(u.passwordHash, 10);
      }
    }
  }

  if (key === 'tp_bootstrap_init' && value && typeof value === 'object') {
    if (Array.isArray(value.tp_users)) {
      for (const u of value.tp_users) {
        if (u.passwordHash && typeof u.passwordHash === 'string' && !isBcryptHash(u.passwordHash)) {
          u.passwordHash = await bcrypt.hash(u.passwordHash, 10);
        }
      }
    }
  }

  if (key === 'tp_is_configured') {
    isConfiguredCache = (value === 'true' || value === true);
  }
  if (key === 'tp_bootstrap_init') {
    isConfiguredCache = true;
    if (value && typeof value === 'object') {
      const keys = Object.keys(value).sort((a, b) => {
        const idxA = DB_COLLECTION_PRIORITY_ORDER.indexOf(a);
        const idxB = DB_COLLECTION_PRIORITY_ORDER.indexOf(b);
        const posA = idxA === -1 ? 999 : idxA;
        const posB = idxB === -1 ? 999 : idxB;
        return posA - posB;
      });
      for (const k of keys) {
        saveKeyToAlasql(k, value[k]);
      }
    }
    saveKeyToAlasql('tp_is_configured', 'true');
    saveKeyToAlasql('tilepoint_onboarded_setup', 'true');
  } else {
    saveKeyToAlasql(key, value);
  }

  if (getIsMysqlActive() || getMysqlEnforced()) {
    try {
      if (key === 'tp_bootstrap_init') {
        await pool.query('SET FOREIGN_KEY_CHECKS = 0');
        if (value && typeof value === 'object') {
          const keys = Object.keys(value).sort((a, b) => {
            const idxA = DB_COLLECTION_PRIORITY_ORDER.indexOf(a);
            const idxB = DB_COLLECTION_PRIORITY_ORDER.indexOf(b);
            const posA = idxA === -1 ? 999 : idxA;
            const posB = idxB === -1 ? 999 : idxB;
            return posA - posB;
          });
          for (const k of keys) {
            await saveKeyToMysql(k, value[k]);
          }
        }
        await saveKeyToMysql('tp_is_configured', 'true');
        await saveKeyToMysql('tilepoint_onboarded_setup', 'true');
        await pool.query('SET FOREIGN_KEY_CHECKS = 1');
      } else {
        await saveKeyToMysql(key, value);
      }
    } catch (err) {
      try { await pool.query('SET FOREIGN_KEY_CHECKS = 1'); } catch (_) {}
      if (isConnectionError(err)) {
        markServerDegraded(`MySQL write error: ${err.message} (${err.code})`);
      } else {
        console.error('[Database Query Error] saveKeyToMysql error:', err.message);
      }
    }
  }

  invalidateDbCache();
  scheduleDebouncedDbFileWrite();
}

export async function isDatabaseConfiguredStore() {
  if (isConfiguredCache !== null) {
    return isConfiguredCache;
  }

  if (getIsMysqlActive() || getMysqlEnforced()) {
    try {
      const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
      const hasUsers = users && users[0] && Number(users[0].count) > 0;
      if (!hasUsers) {
        isConfiguredCache = false;
        return false;
      }

      isConfiguredCache = true;
      return true;
    } catch (e) {
      if (isConnectionError(e)) {
        markServerDegraded(`MySQL isConfigured query failed: ${e.message} (${e.code})`);
      } else {
        console.error('[Database Query Error] isDatabaseConfiguredStore query error:', e.message);
      }
    }
  }

  try {
    const users = alasql('SELECT COUNT(*) as count FROM `users`');
    const hasUsers = users && users[0] && Number(users[0].count) > 0;
    if (!hasUsers) {
      isConfiguredCache = false;
      return false;
    }
    isConfiguredCache = true;
    return true;
  } catch (e) {}

  return false;
}

export function getIsConfiguredCache() {
  return isConfiguredCache;
}

export function setIsConfiguredCache(val) {
  isConfiguredCache = val;
}

export async function getSalesWithItemsLookups(filters = {}) {
  const { branchId, shiftId, cashierId, startDate, endDate, saleNumber, isDeleted = 0, limit = 100, offset = 0 } = filters;

  if (getIsMysqlActive() || getMysqlEnforced()) {
    try {
      const conditions = ['s.isDeleted = ?'];
      const params = [isDeleted ? 1 : 0];

      if (branchId) {
        conditions.push('s.branchId = ?');
        params.push(branchId);
      }
      if (shiftId) {
        conditions.push('s.shiftId = ?');
        params.push(shiftId);
      }
      if (cashierId) {
        conditions.push('s.cashierId = ?');
        params.push(cashierId);
      }
      if (saleNumber) {
        conditions.push('s.saleNumber = ?');
        params.push(saleNumber);
      }
      if (startDate) {
        conditions.push('s.createdAt >= ?');
        params.push(startDate);
      }
      if (endDate) {
        conditions.push('s.createdAt <= ?');
        params.push(endDate);
      }

      const whereClause = conditions.join(' AND ');
      const salesSql = `
        SELECT s.* 
        FROM sales s 
        WHERE ${whereClause} 
        ORDER BY s.createdAt DESC 
        LIMIT ? OFFSET ?
      `;
      params.push(Number(limit) || 100, Number(offset) || 0);

      const [salesRows] = await pool.query(salesSql, params);
      const salesList = salesRows.map(r => parseRowFromMysql('sales', r));

      if (salesList.length === 0) {
        return [];
      }

      const saleIds = salesList.map(s => s.id);
      const placeholders = saleIds.map(() => '?').join(', ');
      const [itemRows] = await pool.query(`
        SELECT si.* 
        FROM sale_items si 
        WHERE si.saleId IN (${placeholders}) AND si.isDeleted = 0
      `, saleIds);

      const parsedItems = itemRows.map(r => parseRowFromMysql('sale_items', r));

      const salesMap = new Map();
      salesList.forEach(s => {
        s.items = [];
        salesMap.set(s.id, s);
      });
      parsedItems.forEach(item => {
        const sale = salesMap.get(item.saleId);
        if (sale) {
          sale.items.push(item);
        }
      });

      return salesList;
    } catch (err) {
      if (isConnectionError(err)) {
        markServerDegraded(`MySQL sales lookup connection error: ${err.message} (${err.code})`);
      } else {
        console.error('[Database Query Error] getSalesWithItemsLookups query error:', err.message);
      }
    }
  }

  // AlaSQL fallback
  try {
    const conditions = ['isDeleted = ?'];
    const params = [isDeleted ? 1 : 0];

    if (branchId) {
      conditions.push('branchId = ?');
      params.push(branchId);
    }
    if (shiftId) {
      conditions.push('shiftId = ?');
      params.push(shiftId);
    }
    if (cashierId) {
      conditions.push('cashierId = ?');
      params.push(cashierId);
    }
    if (saleNumber) {
      conditions.push('saleNumber = ?');
      params.push(saleNumber);
    }

    const whereClause = conditions.join(' AND ');
    const query = `SELECT * FROM sales WHERE ${whereClause} ORDER BY createdAt DESC`;

    let sales = alasql(query, params) || [];
    if (startDate) sales = sales.filter(s => new Date(s.createdAt) >= new Date(startDate));
    if (endDate) sales = sales.filter(s => new Date(s.createdAt) <= new Date(endDate));

    const allItems = alasql('SELECT * FROM sale_items WHERE isDeleted = ?', [0]) || [];
    const itemsMap = new Map();
    allItems.forEach(i => {
      if (!itemsMap.has(i.saleId)) itemsMap.set(i.saleId, []);
      itemsMap.get(i.saleId).push(i);
    });

    return sales.slice(Number(offset) || 0, (Number(offset) || 0) + (Number(limit) || 100)).map(s => ({
      ...parseRowFromMysql('sales', s),
      items: (itemsMap.get(s.id) || []).map(i => parseRowFromMysql('sale_items', i))
    }));
  } catch (e) {
    return [];
  }
}

export async function getInventoryAndBranchStockLookups(filters = {}) {
  const { branchId, category, category_id, categoryId, brand, supplierId, sku, product_sku, productSku, barcode, search, isDeleted = 0, limit = 100, offset = 0 } = filters;
  const targetSku = product_sku || productSku || sku;
  const targetCat = category_id || categoryId || category;

  if (getIsMysqlActive() || getMysqlEnforced()) {
    try {
      const conditions = ['p.isDeleted = ?'];
      const params = [isDeleted ? 1 : 0];

      if (targetCat) {
        conditions.push('(p.category_id = ? OR p.category = ?)');
        params.push(targetCat, targetCat);
      }
      if (brand) {
        conditions.push('p.brand = ?');
        params.push(brand);
      }
      if (supplierId) {
        conditions.push('p.supplierId = ?');
        params.push(supplierId);
      }
      if (targetSku) {
        conditions.push('(p.product_sku = ? OR p.sku = ?)');
        params.push(targetSku, targetSku);
      }
      if (barcode) {
        conditions.push('p.barcode = ?');
        params.push(barcode);
      }
      if (search) {
        conditions.push('(p.productName LIKE ? OR p.productCode LIKE ? OR p.sku LIKE ? OR p.product_sku LIKE ? OR p.barcode LIKE ?)');
        const term = `%${search}%`;
        params.push(term, term, term, term, term);
      }

      const whereClause = conditions.join(' AND ');

      if (branchId) {
        const sql = `
          SELECT p.*, 
                 bs.id as branchStockId, 
                 bs.quantity as branchQuantity, 
                 bs.lowStockThreshold as branchLowStockThreshold, 
                 bs.sellingPriceOverride
          FROM products p
          LEFT JOIN branch_stock bs ON (p.id = bs.productId AND bs.branchId = ?)
          WHERE ${whereClause}
          ORDER BY p.productName ASC
          LIMIT ? OFFSET ?
        `;
        const sqlParams = [branchId, ...params, Number(limit) || 100, Number(offset) || 0];
        const [rows] = await pool.query(sql, sqlParams);
        return rows.map(r => parseRowFromMysql('products', r));
      } else {
        const sql = `
          SELECT p.*
          FROM products p
          WHERE ${whereClause}
          ORDER BY p.productName ASC
          LIMIT ? OFFSET ?
        `;
        const sqlParams = [...params, Number(limit) || 100, Number(offset) || 0];
        const [rows] = await pool.query(sql, sqlParams);
        return rows.map(r => parseRowFromMysql('products', r));
      }
    } catch (err) {
      if (isConnectionError(err)) {
        markServerDegraded(`MySQL inventory lookup connection error: ${err.message} (${err.code})`);
      } else {
        console.error('[Database Query Error] getInventoryAndBranchStockLookups query error:', err.message);
      }
    }
  }

  // AlaSQL fallback
  try {
    const conditions = ['isDeleted = ?'];
    const params = [isDeleted ? 1 : 0];

    if (targetCat) {
      conditions.push('(category = ? OR category_id = ?)');
      params.push(targetCat, targetCat);
    }
    if (brand) {
      conditions.push('brand = ?');
      params.push(brand);
    }
    if (supplierId) {
      conditions.push('supplierId = ?');
      params.push(supplierId);
    }
    if (targetSku) {
      conditions.push('(sku = ? OR product_sku = ?)');
      params.push(targetSku, targetSku);
    }
    if (barcode) {
      conditions.push('barcode = ?');
      params.push(barcode);
    }

    const whereClause = conditions.join(' AND ');
    const query = `SELECT * FROM products WHERE ${whereClause} ORDER BY productName ASC`;
    let products = alasql(query, params) || [];

    if (search) {
      const term = search.toLowerCase();
      products = products.filter(p => 
        (p.productName || '').toLowerCase().includes(term) ||
        (p.productCode || '').toLowerCase().includes(term) ||
        (p.sku || '').toLowerCase().includes(term) ||
        (p.product_sku || '').toLowerCase().includes(term) ||
        (p.barcode || '').toLowerCase().includes(term)
      );
    }

    let branchStocks = [];
    if (branchId) {
      branchStocks = alasql('SELECT * FROM branch_stock WHERE branchId = ?', [branchId]) || [];
    }
    const bsMap = new Map(branchStocks.map(bs => [bs.productId, bs]));

    return products.slice(Number(offset) || 0, (Number(offset) || 0) + (Number(limit) || 100)).map(p => {
      const parsed = parseRowFromMysql('products', p);
      if (branchId) {
        const bs = bsMap.get(p.id);
        if (bs) {
          parsed.branchStockId = bs.id;
          parsed.branchQuantity = bs.quantity;
          parsed.branchLowStockThreshold = bs.lowStockThreshold;
          parsed.sellingPriceOverride = bs.sellingPriceOverride;
        }
      }
      return parsed;
    });
  } catch (e) {
    return [];
  }
}

export async function getInventoryMovementsLookups(filters = {}) {
  const { productId, sourceBranchId, destinationBranchId, userId, startDate, endDate, limit = 100, offset = 0 } = filters;

  if (getIsMysqlActive() || getMysqlEnforced()) {
    try {
      const conditions = ['im.isDeleted = 0'];
      const params = [];

      if (productId) {
        conditions.push('im.productId = ?');
        params.push(productId);
      }
      if (sourceBranchId) {
        conditions.push('im.sourceBranchId = ?');
        params.push(sourceBranchId);
      }
      if (destinationBranchId) {
        conditions.push('im.destinationBranchId = ?');
        params.push(destinationBranchId);
      }
      if (userId) {
        conditions.push('im.userId = ?');
        params.push(userId);
      }
      if (startDate) {
        conditions.push('im.timestamp >= ?');
        params.push(startDate);
      }
      if (endDate) {
        conditions.push('im.timestamp <= ?');
        params.push(endDate);
      }

      const whereClause = conditions.join(' AND ');
      const sql = `
        SELECT im.* 
        FROM inventory_movements im 
        WHERE ${whereClause} 
        ORDER BY im.timestamp DESC 
        LIMIT ? OFFSET ?
      `;
      params.push(Number(limit) || 100, Number(offset) || 0);

      const [rows] = await pool.query(sql, params);
      return rows.map(r => parseRowFromMysql('inventory_movements', r));
    } catch (err) {
      if (isConnectionError(err)) {
        markServerDegraded(`MySQL inventory movements connection error: ${err.message} (${err.code})`);
      } else {
        console.error('[Database Query Error] getInventoryMovementsLookups query error:', err.message);
      }
    }
  }

  // AlaSQL fallback
  try {
    const conditions = ['isDeleted = ?'];
    const params = [0];

    if (productId) {
      conditions.push('productId = ?');
      params.push(productId);
    }
    if (sourceBranchId) {
      conditions.push('sourceBranchId = ?');
      params.push(sourceBranchId);
    }
    if (destinationBranchId) {
      conditions.push('destinationBranchId = ?');
      params.push(destinationBranchId);
    }
    if (userId) {
      conditions.push('userId = ?');
      params.push(userId);
    }

    const whereClause = conditions.join(' AND ');
    const query = `SELECT * FROM inventory_movements WHERE ${whereClause} ORDER BY timestamp DESC`;

    let movements = alasql(query, params) || [];
    if (startDate) movements = movements.filter(m => new Date(m.timestamp) >= new Date(startDate));
    if (endDate) movements = movements.filter(m => new Date(m.timestamp) <= new Date(endDate));

    return movements.slice(Number(offset) || 0, (Number(offset) || 0) + (Number(limit) || 100)).map(m => parseRowFromMysql('inventory_movements', m));
  } catch (e) {
    return [];
  }
}

export async function getShiftSalesSummaryLookups(shiftId) {
  if (!shiftId) return null;

  if (getIsMysqlActive() || getMysqlEnforced()) {
    try {
      const [rows] = await pool.query(`
        SELECT 
          COUNT(*) as totalSalesCount,
          COALESCE(SUM(subtotal), 0) as totalSubtotal,
          COALESCE(SUM(vat), 0) as totalVat,
          COALESCE(SUM(discount), 0) as totalDiscount,
          COALESCE(SUM(grandTotal), 0) as totalGrandTotal
        FROM sales
        WHERE shiftId = ? AND isDeleted = 0
      `, [shiftId]);

      return rows[0];
    } catch (err) {
      if (isConnectionError(err)) {
        markServerDegraded(`MySQL shift summary connection error: ${err.message} (${err.code})`);
      } else {
        console.error('[Database Query Error] getShiftSalesSummaryLookups query error:', err.message);
      }
    }
  }

  // AlaSQL fallback
  try {
    const sales = alasql(`SELECT * FROM sales WHERE shiftId = ? AND isDeleted = 0`, [shiftId]) || [];
    const summary = sales.reduce((acc, s) => {
      acc.totalSalesCount++;
      acc.totalSubtotal += Number(s.subtotal) || 0;
      acc.totalVat += Number(s.vat) || 0;
      acc.totalDiscount += Number(s.discount) || 0;
      acc.totalGrandTotal += Number(s.grandTotal) || 0;
      return acc;
    }, { totalSalesCount: 0, totalSubtotal: 0, totalVat: 0, totalDiscount: 0, totalGrandTotal: 0 });

    return summary;
  } catch (e) {
    return null;
  }
}

export function getEmptyDatabaseStructure() {
  const empty = {};
  for (const key of Object.keys(KEY_TO_TABLE_MAP)) {
    empty[key] = [];
  }
  empty.tp_is_configured = 'false';
  empty.tilepoint_onboarded_setup = 'false';
  return empty;
}

// Hook degraded store write replay handler to execute MySQL writes
setExecuteReplayOpHandler(async (op) => {
  const allowedTables = new Set(Object.keys(TABLE_COLUMNS));
  if (op.tableName && !allowedTables.has(op.tableName)) {
    console.error(`[Security Warning] Blocked replay operation with unwhitelisted table name: "${op.tableName}"`);
    return;
  }

  if (op.type === 'upsert') {
    await upsertRecordMysql(op.tableName, op.record);
  } else if (op.type === 'delete') {
    await pool.execute(`DELETE FROM \`${op.tableName}\` WHERE id = ?`, [op.id]);
  } else if (op.type === 'soft_delete_backup') {
    await pool.execute('UPDATE db_snapshots SET isDeleted = 1, deletedAt = NOW() WHERE id = ?', [op.id]);
  } else if (op.type === 'custom_query') {
    await pool.execute(op.sql, op.params);
  } else if (op.type === 'atomic_package') {
    const tx = op.tx;
    if (tx && tx.payload) {
      let conn;
      try {
        conn = await pool.getConnection();
        await conn.beginTransaction();
        await conn.query('SET FOREIGN_KEY_CHECKS = 0');
        const keyMap = {
          shifts: 'tp_shifts',
          branches: 'tp_branches',
          sales: 'tp_sales',
          saleItems: 'tp_sale_items',
          movements: 'tp_movements',
          auditLogs: 'tp_audit_logs',
          ledgerEntries: 'tp_ledger_entries',
          expenses: 'atpos_v2_expenses',
          stockTransfers: 'tp_stock_transfers',
          members: 'tp_members',
          customBills: 'atpos_v2_custom_bills',
          parkedSales: 'tp_parked_sales'
        };
        for (const [propName, key] of Object.entries(keyMap)) {
          const items = tx.payload[propName];
          if (Array.isArray(items) && items.length > 0) {
            const tableName = KEY_TO_TABLE_MAP[key];
            if (tableName) {
              for (const rawItem of items) {
                if (!rawItem || !rawItem.id) continue;
                const item = { ...rawItem };

                if (propName === 'sales') {
                  if (item.shiftId === 'NO-SHIFT-ACTIVE' || !item.shiftId) {
                    item.shiftId = null;
                  }
                }

                if (propName === 'movements') {
                  item.branchId = item.branchId || item.sourceBranchId || item.destinationBranchId || 'B1';
                  item.createdBy = item.createdBy || item.userId || item.username || 'system';
                  if (typeof item.quantity === 'number') {
                    item.quantity = Math.abs(item.quantity);
                  }
                  try {
                    const invMovRec = {
                      id: item.id || `IM-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                      productId: item.productId,
                      type: item.type || 'OUT',
                      quantity: item.quantity,
                      sourceBranchId: item.sourceBranchId || item.branchId,
                      destinationBranchId: item.destinationBranchId || null,
                      referenceId: item.referenceId || '',
                      notes: item.notes || '',
                      userId: item.userId || 'SYSTEM',
                      username: item.username || item.createdBy || 'system',
                      timestamp: item.timestamp || new Date().toISOString().slice(0, 19).replace('T', ' ')
                    };
                    await upsertRecordMysql('inventory_movements', invMovRec, conn);
                  } catch (_) {}
                }

                await upsertRecordMysql(tableName, item, conn);
              }
            }
          }
        }
        if (tx.payload.removeParkedSaleId) {
          await conn.execute("DELETE FROM parked_sales WHERE id = ?", [tx.payload.removeParkedSaleId]);
        }
        if (Array.isArray(tx.payload.branchStockUpdates)) {
          for (const bsUpdate of tx.payload.branchStockUpdates) {
            if (!bsUpdate || !bsUpdate.branchId || !bsUpdate.productId) continue;
            const numQty = bsUpdate.quantity !== undefined ? Number(bsUpdate.quantity) : 0;
            await upsertRecordMysql('branch_stock', {
              id: bsUpdate.id || `${bsUpdate.branchId}_${bsUpdate.productId}`,
              branchId: bsUpdate.branchId,
              productId: bsUpdate.productId,
              quantity: numQty,
              version: bsUpdate.version || 1,
              updatedAt: bsUpdate.updatedAt || new Date().toISOString().slice(0, 19).replace('T', ' ')
            }, conn);
            try {
              await conn.execute("UPDATE `inventory` SET `stockQuantity` = ? WHERE (`productId` = ? OR `id` = ?) AND `branchId` = ?", [
                numQty,
                bsUpdate.productId,
                bsUpdate.productId,
                bsUpdate.branchId
              ]);
            } catch (_) {}
          }
        }
        if (Array.isArray(tx.payload.productUpdates)) {
          for (const pUpdate of tx.payload.productUpdates) {
            if (pUpdate && pUpdate.id) {
              const numProdQty = pUpdate.stockQuantity !== undefined ? Number(pUpdate.stockQuantity) : 0;
              await upsertRecordMysql('products', pUpdate, conn);
              try {
                await conn.execute("UPDATE `inventory` SET `stockQuantity` = ? WHERE `productId` = ? OR `id` = ?", [
                  numProdQty,
                  pUpdate.id,
                  pUpdate.id
                ]);
              } catch (_) {}
            }
          }
        }
        await conn.commit();
      } catch (err) {
        if (conn) {
          try { await conn.rollback(); } catch (_) {}
        }
        throw err;
      } finally {
        if (conn) {
          try { await conn.query('SET FOREIGN_KEY_CHECKS = 1'); } catch (_) {}
          conn.release();
        }
      }
    }
  } else if (op.type === 'pos_sale') {
    const { sale, items = [] } = op;
    if (sale && sale.id) {
      let conn;
      try {
        conn = await pool.getConnection();
        await conn.beginTransaction();
        await upsertRecordMysql('sales', sale, conn);
        for (const item of items) {
          if (!item.saleId) item.saleId = sale.id;
          await upsertRecordMysql('sale_items', item, conn);
          if (item.productId && item.quantity) {
            const qty = Number(item.quantity) || 0;
            if (sale.branchId) {
              await conn.execute(`
                UPDATE branch_stock 
                SET quantity = GREATEST(0, quantity - ?), version = version + 1, updatedAt = NOW()
                WHERE branchId = ? AND productId = ?
              `, [qty, sale.branchId, item.productId]);
            }
            await conn.execute(`
              UPDATE products 
              SET stockQuantity = GREATEST(0, stockQuantity - ?), version = version + 1, updatedAt = NOW()
              WHERE id = ?
            `, [qty, item.productId]);
          }
        }
        await conn.commit();
      } catch (err) {
        if (conn) {
          try { await conn.rollback(); } catch (_) {}
        }
        throw err;
      } finally {
        if (conn) conn.release();
      }
    }
  }
});
