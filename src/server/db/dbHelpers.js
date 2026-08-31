import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { KEY_TO_TABLE_MAP, TABLE_COLUMNS, SENSITIVE_FIELD_DENYLIST } from '../config/serverConfig.js';
import { pool, isConnectionError } from './mysqlPool.js';
import { alasql, upsertRecordAlasql } from './alasqlEngine.js';
import {
  getIsMysqlActive,
  getMysqlEnforced,
  markServerDegraded,
  setExecuteReplayOpHandler
} from './degradedStore.js';

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

  return res;
}

export async function upsertRecordMysql(tableName, record, executor = pool) {
  if (!record || typeof record !== 'object') return;
  const allowed = TABLE_COLUMNS[tableName];
  
  let keys = Object.keys(record).filter(k => record[k] !== undefined);
  if (allowed) {
    keys = keys.filter(k => allowed.includes(k));
  }
  if (keys.length === 0) return;

  const columns = keys.map(k => `\`${k}\``).join(', ');
  const placeholders = keys.map(() => '?').join(', ');
  const updateClause = keys.filter(k => k !== 'id').map(k => `\`${k}\` = VALUES(\`${k}\`)`).join(', ');

  const values = keys.map(k => {
    const val = record[k];
    if (val === null || val === undefined) return null;
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
  });

  const sql = `
    INSERT INTO \`${tableName}\` (${columns})
    VALUES (${placeholders})
    ${updateClause ? `ON DUPLICATE KEY UPDATE ${updateClause}` : ''}
  `;

  const exec = executor || pool;
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
      const [rows] = await pool.query('SELECT * FROM users WHERE LOWER(username) = ?', [cleanUsername]);
      if (rows.length > 0) {
        return parseRowFromMysql('users', rows[0]);
      }
    } catch (err) {
      console.warn('[User Store] MySQL query user error:', err.message);
    }
  }

  try {
    const rows = alasql('SELECT * FROM `users` WHERE LOWER(username) = ?', [cleanUsername]) || [];
    if (rows.length > 0) {
      return parseRowFromMysql('users', rows[0]);
    }
  } catch (e) {}

  const db = readDbFile();
  const users = Array.isArray(db.tp_users) ? db.tp_users : [];
  return users.find(u => (u.username || '').trim().toLowerCase() === cleanUsername) || null;
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
      await upsertBatchMysql(tableName, value);
    } else if (typeof value === 'object' && value !== null) {
      await upsertRecordMysql(tableName, value);
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

  if (key === 'tp_is_configured') {
    isConfiguredCache = (value === 'true' || value === true);
  }
  if (key === 'tp_bootstrap_init') {
    isConfiguredCache = true;
    if (value && typeof value === 'object') {
      for (const k of Object.keys(value)) {
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
        if (value && typeof value === 'object') {
          for (const k of Object.keys(value)) {
            await saveKeyToMysql(k, value[k]);
          }
        }
        await saveKeyToMysql('tp_is_configured', 'true');
        await saveKeyToMysql('tilepoint_onboarded_setup', 'true');
      } else {
        await saveKeyToMysql(key, value);
      }
    } catch (err) {
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
  if (getIsMysqlActive() || getMysqlEnforced()) {
    try {
      const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
      const hasUsers = users && users[0] && users[0].count > 0;
      if (!hasUsers) {
        isConfiguredCache = false;
        return false;
      }

      if (isConfiguredCache === true) return true;

      const [settings] = await pool.query('SELECT setting_value FROM system_settings WHERE setting_key = ?', ['tp_is_configured']);
      if (settings.length > 0) {
        const val = settings[0].setting_value;
        const conf = val === 'true' || val === true || val === '"true"';
        if (conf) {
          isConfiguredCache = true;
          return true;
        }
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
    const hasUsers = users && users[0] && users[0].count > 0;
    if (!hasUsers) {
      isConfiguredCache = false;
      return false;
    }
    isConfiguredCache = true;
    return true;
  } catch (e) {}

  return false;
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
        const keyMap = {
          sales: 'tp_sales',
          saleItems: 'tp_sale_items',
          movements: 'tp_movements',
          auditLogs: 'tp_audit_logs',
          ledgerEntries: 'tp_ledger_entries',
          expenses: 'atpos_v2_expenses',
          stockTransfers: 'tp_stock_transfers',
          shifts: 'tp_shifts',
          branches: 'tp_branches',
          members: 'tp_members',
          customBills: 'atpos_v2_custom_bills',
          parkedSales: 'tp_parked_sales'
        };
        for (const [propName, key] of Object.entries(keyMap)) {
          const items = tx.payload[propName];
          if (Array.isArray(items) && items.length > 0) {
            const tableName = KEY_TO_TABLE_MAP[key];
            if (tableName) {
              for (const item of items) {
                if (item && item.id) {
                  await upsertRecordMysql(tableName, item, conn);
                }
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
            await upsertRecordMysql('branch_stock', {
              id: bsUpdate.id || `${bsUpdate.branchId}_${bsUpdate.productId}`,
              branchId: bsUpdate.branchId,
              productId: bsUpdate.productId,
              quantity: bsUpdate.quantity !== undefined ? Number(bsUpdate.quantity) : 0,
              version: bsUpdate.version || 1,
              updatedAt: bsUpdate.updatedAt || new Date().toISOString().slice(0, 19).replace('T', ' ')
            }, conn);
          }
        }
        if (Array.isArray(tx.payload.productUpdates)) {
          for (const pUpdate of tx.payload.productUpdates) {
            if (pUpdate && pUpdate.id) {
              await upsertRecordMysql('products', pUpdate, conn);
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
        if (conn) conn.release();
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
