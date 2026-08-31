import express from 'express';
import bcrypt from 'bcryptjs';
import {
  KEY_TO_TABLE_MAP,
  DB_COLLECTION_PRIORITY_ORDER
} from '../config/serverConfig.js';
import { pool, isConnectionError } from '../db/mysqlPool.js';
import { alasql, upsertRecordAlasql } from '../db/alasqlEngine.js';
import {
  getIsMysqlActive,
  getMysqlEnforced,
  markServerDegraded,
  queueDegradedWrite
} from '../db/degradedStore.js';
import {
  readFullDatabase,
  readFullDatabaseFromAlasql,
  getCachedDbHash,
  getIsDbCacheDirty,
  saveKeyToStore,
  saveKeyToMysql,
  saveKeyToAlasql,
  isDatabaseConfiguredStore,
  setIsConfiguredCache,
  upsertRecordMysql,
  parseRowFromMysql,
  readDbFile,
  writeDbFile,
  invalidateDbCache,
  scheduleDebouncedDbFileWrite,
  getSalesWithItemsLookups,
  getInventoryAndBranchStockLookups,
  getInventoryMovementsLookups,
  getShiftSalesSummaryLookups,
  getEmptyDatabaseStructure,
  isBcryptHash
} from '../db/dbHelpers.js';
import {
  verifyAndExtractToken
} from '../services/authService.js';
import {
  verifySessionAndCheckConcurrency,
  authenticateUserForSyncBatch
} from '../middleware/authMiddleware.js';
import { emitPulseUpdate } from '../realtime/socketHandler.js';

const router = express.Router();

// Helper: Atomic Transaction Package MySQL Executor
async function executeAtomicPackageMysql(tx) {
  const payload = tx.payload || {};
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

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    for (const [propName, key] of Object.entries(keyMap)) {
      const items = payload[propName];
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

    if (payload.removeParkedSaleId) {
      await conn.execute("DELETE FROM parked_sales WHERE id = ?", [payload.removeParkedSaleId]);
    }

    if (Array.isArray(payload.branchStockUpdates) && payload.branchStockUpdates.length > 0) {
      const bsTable = KEY_TO_TABLE_MAP['tp_branch_stock'] || 'branch_stock';
      for (const bsUpdate of payload.branchStockUpdates) {
        if (!bsUpdate) continue;
        const { id, branchId, productId, quantity, version, updatedAt } = bsUpdate;
        if (!productId || !branchId) continue;
        const bsId = id || `${branchId}_${productId}`;
        await upsertRecordMysql(bsTable, {
          id: bsId,
          branchId,
          productId,
          quantity: quantity !== undefined ? Number(quantity) : 0,
          version: version || 1,
          updatedAt: updatedAt || new Date().toISOString().slice(0, 19).replace('T', ' ')
        }, conn);
      }
    }

    if (Array.isArray(payload.productUpdates) && payload.productUpdates.length > 0) {
      const prodTable = KEY_TO_TABLE_MAP['tp_products'] || 'products';
      for (const pUpdate of payload.productUpdates) {
        if (pUpdate && pUpdate.id) {
          await upsertRecordMysql(prodTable, pUpdate, conn);
        }
      }
    }

    await conn.commit();
    return true;
  } catch (err) {
    if (conn) {
      try { await conn.rollback(); } catch (_) {}
    }
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

// Atomic Transaction Package Processor
async function handleAtomicTransactionPackage(tx, req) {
  if (!tx || !tx.id) return { success: false, error: 'Invalid transaction package' };

  const db = readDbFile();
  let processedDeltaIds = db.tp_processed_delta_ids || [];

  if (processedDeltaIds.includes(tx.id)) {
    return { success: true, alreadyProcessed: true, txId: tx.id };
  }

  const payload = tx.payload || {};
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

  // 1. Process MySQL Transaction if active
  if (getIsMysqlActive()) {
    try {
      await executeAtomicPackageMysql(tx);
    } catch (mysqlErr) {
      if (isConnectionError(mysqlErr)) {
        markServerDegraded(`Atomic transaction MySQL connection failure: ${mysqlErr.message}`);
        queueDegradedWrite({ type: 'atomic_package', tx });
      } else {
        console.error('[MySQL Transaction Query Error]:', mysqlErr.message);
      }
    }
  } else {
    queueDegradedWrite({ type: 'atomic_package', tx });
  }

  // 2. Upsert records for standard array collections in AlaSQL & File Store
  for (const [propName, key] of Object.entries(keyMap)) {
    const items = payload[propName];
    if (Array.isArray(items) && items.length > 0) {
      db[key] = Array.isArray(db[key]) ? db[key] : [];
      const tableName = KEY_TO_TABLE_MAP[key];

      for (const item of items) {
        if (!item || !item.id) continue;
        const idx = db[key].findIndex(r => r && r.id === item.id);
        if (idx >= 0) {
          db[key][idx] = { ...db[key][idx], ...item };
        } else {
          db[key].push(item);
        }
        if (tableName) {
          upsertRecordAlasql(tableName, item);
        }
      }
    }
  }

  // 3. Handle parked sale deletion if removeParkedSaleId is supplied
  if (payload.removeParkedSaleId) {
    const removeId = payload.removeParkedSaleId;
    if (Array.isArray(db.tp_parked_sales)) {
      db.tp_parked_sales = db.tp_parked_sales.filter(p => p && p.id !== removeId);
    }
    try { alasql("DELETE FROM parked_sales WHERE id = ?", [removeId]); } catch (_) {}
  }

  // 4. Process branch stock updates in local state
  if (Array.isArray(payload.branchStockUpdates) && payload.branchStockUpdates.length > 0) {
    db.tp_branch_stock = Array.isArray(db.tp_branch_stock) ? db.tp_branch_stock : [];
    const bsTable = KEY_TO_TABLE_MAP['tp_branch_stock'] || 'branch_stock';

    for (const bsUpdate of payload.branchStockUpdates) {
      if (!bsUpdate) continue;
      const { id, branchId, productId, quantity, version, updatedAt } = bsUpdate;
      if (!productId || !branchId) continue;

      const bsId = id || `${branchId}_${productId}`;
      const idx = db.tp_branch_stock.findIndex(bs => bs && (bs.id === bsId || (bs.productId === productId && bs.branchId === branchId)));

      const updatedRecord = {
        id: bsId,
        branchId,
        productId,
        quantity: quantity !== undefined ? Number(quantity) : 0,
        version: version || 1,
        updatedAt: updatedAt || new Date().toISOString()
      };

      if (idx >= 0) {
        db.tp_branch_stock[idx] = { ...db.tp_branch_stock[idx], ...updatedRecord };
      } else {
        db.tp_branch_stock.push(updatedRecord);
      }
      upsertRecordAlasql(bsTable, updatedRecord);
    }
  }

  // 5. Process product stock updates in local state
  if (Array.isArray(payload.productUpdates) && payload.productUpdates.length > 0) {
    db.tp_products = Array.isArray(db.tp_products) ? db.tp_products : [];
    const prodTable = KEY_TO_TABLE_MAP['tp_products'] || 'products';

    for (const pUpdate of payload.productUpdates) {
      if (!pUpdate || !pUpdate.id) continue;
      const idx = db.tp_products.findIndex(p => p && p.id === pUpdate.id);
      if (idx >= 0) {
        db.tp_products[idx] = { ...db.tp_products[idx], ...pUpdate };
      }
      upsertRecordAlasql(prodTable, db.tp_products[idx] || pUpdate);
    }
  }

  processedDeltaIds.push(tx.id);
  if (processedDeltaIds.length > 5000) processedDeltaIds.shift();
  db.tp_processed_delta_ids = processedDeltaIds;

  writeDbFile(db);

  const { hash } = await readFullDatabase();
  emitPulseUpdate('transaction', hash, req.headers ? req.headers['x-client-id'] : undefined);

  return { success: true, txId: tx.id };
}

// API: Get full database state with ETag & Hash optimization (F-02)
router.get(['/', '/full'], async (req, res) => {
  try {
    const user = verifyAndExtractToken(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
    }

    const rawIfNoneMatch = req.headers['if-none-match'];
    const cleanIfNoneMatch = rawIfNoneMatch ? rawIfNoneMatch.replace(/^W\//, '').replace(/^"|"$/g, '') : null;
    const clientHash = req.query.hash || cleanIfNoneMatch;

    const cachedHash = getCachedDbHash();
    if (clientHash && cachedHash && clientHash === cachedHash && !getIsDbCacheDirty()) {
      res.setHeader('ETag', `"${cachedHash}"`);
      res.setHeader('Cache-Control', 'private, no-cache');
      return res.json({
        success: true,
        unchanged: true,
        hash: cachedHash,
        timestamp: new Date().toISOString()
      });
    }

    const { db, hash } = await readFullDatabase();

    res.setHeader('ETag', `"${hash}"`);
    res.setHeader('Cache-Control', 'private, no-cache');

    if (clientHash && clientHash === hash) {
      return res.json({
        success: true,
        unchanged: true,
        hash: hash,
        timestamp: new Date().toISOString()
      });
    }

    const dbCopy = { ...db };
    delete dbCopy.tp_db_snapshots;
    delete dbCopy.tp_processed_delta_ids;

    res.json({
      success: true,
      unchanged: false,
      hash: hash,
      timestamp: new Date().toISOString(),
      data: dbCopy
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Get all branches list
router.get(['/branches', '/list/branches'], async (req, res) => {
  try {
    if (getIsMysqlActive() || getMysqlEnforced()) {
      const [rows] = await pool.query('SELECT * FROM branches ORDER BY isDeleted ASC, id ASC');
      const branches = rows.map(r => parseRowFromMysql('branches', r));
      return res.json({ success: true, branches });
    }
    const rows = alasql('SELECT * FROM `branches` ORDER BY isDeleted ASC, id ASC') || [];
    const branches = rows.map(r => parseRowFromMysql('branches', r));
    return res.json({ success: true, branches });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Save key-value state
router.post('/', async (req, res) => {
  const { key, value } = req.body;
  if (!key) {
    return res.status(400).json({ success: false, error: 'Key is required' });
  }

  const configured = await isDatabaseConfiguredStore();
  if (configured && key !== 'tp_bootstrap_init') {
    const check = await verifySessionAndCheckConcurrency(req);
    if (!check.valid) {
      return res.status(check.status || 401).json({
        success: false,
        code: check.code,
        error: check.error,
        superseded: Boolean(check.superseded),
        expired: Boolean(check.expired),
        activeSession: check.activeSession
      });
    }
    if (check.remainingSeconds !== undefined) {
      res.setHeader('X-Session-Remaining-Seconds', check.remainingSeconds);
    }

    const user = check.user;
    const userRoleLower = (user.role || '').toLowerCase();
    const isRoleAdminOrManager = userRoleLower === 'admin' || userRoleLower === 'manager';
    const isRoleAdmin = userRoleLower === 'admin';

    if (key === 'tp_db_snapshots' && !isRoleAdmin && !isRoleAdminOrManager) {
      return res.status(403).json({ success: false, error: 'Forbidden: Backups restricted to Admins and Managers.' });
    }
  }

  try {
    await saveKeyToStore(key, value);
    const { hash } = await readFullDatabase();
    emitPulseUpdate(key, hash, req.headers['x-client-id']);

    res.json({ success: true, key });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Save multiple keys at once (bulk sync)
router.post('/bulk', async (req, res) => {
  const { data } = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ success: false, error: 'Payload object data is required' });
  }

  const configured = await isDatabaseConfiguredStore();
  const isBootstrap = Boolean(data.tp_bootstrap_init || (data.tp_is_configured && !configured));
  if (configured && !isBootstrap) {
    const check = await verifySessionAndCheckConcurrency(req);
    if (!check.valid) {
      return res.status(check.status || 401).json({
        success: false,
        code: check.code,
        error: check.error,
        superseded: Boolean(check.superseded),
        expired: Boolean(check.expired),
        activeSession: check.activeSession
      });
    }
    if (check.remainingSeconds !== undefined) {
      res.setHeader('X-Session-Remaining-Seconds', check.remainingSeconds);
    }
  }

  try {
    if (getIsMysqlActive() || getMysqlEnforced()) {
      try { await pool.query('SET FOREIGN_KEY_CHECKS = 0'); } catch (_) {}
    }

    const keys = Object.keys(data);
    const sortedKeys = [
      ...DB_COLLECTION_PRIORITY_ORDER.filter(k => keys.includes(k)),
      ...keys.filter(k => !DB_COLLECTION_PRIORITY_ORDER.includes(k))
    ];

    for (const key of sortedKeys) {
      if (configured && key === 'tp_users' && Array.isArray(data[key]) && data[key].length === 0) {
        continue;
      }
      await saveKeyToStore(key, data[key]);
    }

    const { hash } = await readFullDatabase();
    emitPulseUpdate('bulk', hash, req.headers['x-client-id']);

    res.json({ success: true, count: Object.keys(data).length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (getIsMysqlActive() || getMysqlEnforced()) {
      try { await pool.query('SET FOREIGN_KEY_CHECKS = 1'); } catch (_) {}
    }
  }
});

// API: Direct Full MySQL Sync Endpoint - Forces all collections to persist directly to MySQL tables
router.post(['/sync-all', '/mysql/sync-all'], express.json({ limit: '50mb' }), async (req, res) => {
  const payload = req.body?.data || req.body;
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ success: false, error: 'Valid dataset object is required' });
  }

  try {
    if (getIsMysqlActive() || getMysqlEnforced()) {
      try { await pool.query('SET FOREIGN_KEY_CHECKS = 0'); } catch (_) {}
    }

    let totalSynced = 0;
    const keys = Object.keys(payload);
    const sortedKeys = [
      ...DB_COLLECTION_PRIORITY_ORDER.filter(k => keys.includes(k)),
      ...keys.filter(k => !DB_COLLECTION_PRIORITY_ORDER.includes(k))
    ];

    for (const key of sortedKeys) {
      const val = payload[key];
      if (val === undefined || val === null) continue;
      await saveKeyToStore(key, val);
      totalSynced++;
    }

    const { hash } = await readFullDatabase();
    emitPulseUpdate('all', hash, req.headers['x-client-id']);

    res.json({
      success: true,
      message: 'All local data synchronized to MySQL database successfully.',
      collectionsCount: totalSynced,
      isMysqlActive: getIsMysqlActive(),
      hash,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[MySQL Sync All Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (getIsMysqlActive() || getMysqlEnforced()) {
      try { await pool.query('SET FOREIGN_KEY_CHECKS = 1'); } catch (_) {}
    }
  }
});

// API: Dedicated Queue-Based POS & Inventory Atomic Transaction Processor
router.post('/transaction', async (req, res) => {
  const tx = req.body;
  if (!tx || !tx.id) {
    return res.status(400).json({ success: false, error: 'Invalid transaction package payload' });
  }

  const configured = await isDatabaseConfiguredStore();
  if (configured) {
    const check = await verifySessionAndCheckConcurrency(req);
    if (!check.valid) {
      return res.status(check.status || 401).json({
        success: false,
        code: check.code,
        error: check.error,
        superseded: Boolean(check.superseded),
        expired: Boolean(check.expired),
        activeSession: check.activeSession
      });
    }
    if (check.remainingSeconds !== undefined) {
      res.setHeader('X-Session-Remaining-Seconds', check.remainingSeconds);
    }
  }

  try {
    const result = await handleAtomicTransactionPackage(tx, req);
    return res.json(result);
  } catch (err) {
    console.error('[Database] Transaction processing error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// API: Append-Only Transaction Log Delta Processor
router.post('/delta', async (req, res) => {
  const delta = req.body;
  if (!delta || !delta.type || !delta.id) {
    return res.status(400).json({ success: false, error: 'Invalid transaction delta payload' });
  }

  if (delta.type === 'ATOMIC_TRANSACTION') {
    const configured = await isDatabaseConfiguredStore();
    if (configured) {
      const check = await verifySessionAndCheckConcurrency(req);
      if (!check.valid) {
        return res.status(check.status || 401).json({
          success: false,
          code: check.code,
          error: check.error,
          superseded: Boolean(check.superseded),
          expired: Boolean(check.expired),
          activeSession: check.activeSession
        });
      }
      if (check.remainingSeconds !== undefined) {
        res.setHeader('X-Session-Remaining-Seconds', check.remainingSeconds);
      }
    }
    try {
      const result = await handleAtomicTransactionPackage(delta, req);
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  const configured = await isDatabaseConfiguredStore();
  if (configured) {
    const check = await verifySessionAndCheckConcurrency(req);
    if (!check.valid) {
      return res.status(check.status || 401).json({
        success: false,
        code: check.code,
        error: check.error,
        superseded: Boolean(check.superseded),
        expired: Boolean(check.expired),
        activeSession: check.activeSession
      });
    }
    if (check.remainingSeconds !== undefined) {
      res.setHeader('X-Session-Remaining-Seconds', check.remainingSeconds);
    }

    const user = check.user;
    const payload = delta.payload || {};
    const key = payload.key;
    const userRoleLower = (user.role || '').toLowerCase();
    const isRoleAdminOrManager = userRoleLower === 'admin' || userRoleLower === 'manager';
    const isRoleAdmin = userRoleLower === 'admin';

    if (key === 'tp_db_snapshots' && !isRoleAdmin && !isRoleAdminOrManager) {
      return res.status(403).json({ success: false, error: 'Forbidden: Backups restricted to Admins and Managers.' });
    }
  }

  try {
    const db = readDbFile();
    let processedDeltaIds = db.tp_processed_delta_ids || [];

    if (processedDeltaIds.includes(delta.id)) {
      return res.json({ success: true, alreadyProcessed: true });
    }

    const payload = delta.payload || {};
    const key = payload.key;
    const tableName = KEY_TO_TABLE_MAP[key];

    async function executeDeltaMysql(d) {
      const p = d.payload || {};
      const k = p.key;
      const t = KEY_TO_TABLE_MAP[k];
      if (!t) return;

      switch (d.type) {
        case 'APPEND_SALE':
        case 'APPEND_SALE_ITEM':
        case 'APPEND_MOVEMENT':
        case 'APPEND_AUDIT_LOG':
        case 'APPEND_LEDGER_ENTRY':
        case 'APPEND_EXPENSE':
        case 'APPEND_ROW':
        case 'UPDATE_ROW': {
          const row = p.row;
          if (row && t) {
            if (k === 'tp_users' && row.passwordHash && typeof row.passwordHash === 'string' && !isBcryptHash(row.passwordHash)) {
              row.passwordHash = await bcrypt.hash(row.passwordHash, 10);
            }
            await upsertRecordMysql(t, row);
          }
          break;
        }
        case 'INCREMENT_STOCK': {
          const { id, productId, branchId, change } = p;
          const changeVal = Number(change) || 0;
          if (productId) {
            await pool.execute('UPDATE products SET stockQuantity = stockQuantity + ?, version = version + 1, updatedAt = NOW() WHERE id = ?', [changeVal, productId]);
          }
          if (branchId && productId) {
            await pool.execute(`
              INSERT INTO branch_stock (id, branchId, productId, quantity, version, updatedAt)
              VALUES (?, ?, ?, ?, 1, NOW())
              ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), version = version + 1, updatedAt = NOW()
            `, [id || `${branchId}_${productId}`, branchId, productId, changeVal]);
          }
          break;
        }
        case 'DECREMENT_STOCK': {
          const { id, productId, branchId, change } = p;
          const changeVal = Number(change) || 0;
          if (productId) {
            await pool.execute('UPDATE products SET stockQuantity = GREATEST(0, stockQuantity - ?), version = version + 1, updatedAt = NOW() WHERE id = ?', [changeVal, productId]);
          }
          if (branchId && productId) {
            await pool.execute(`
              INSERT INTO branch_stock (id, branchId, productId, quantity, version, updatedAt)
              VALUES (?, ?, ?, 0, 1, NOW())
              ON DUPLICATE KEY UPDATE quantity = GREATEST(0, quantity - VALUES(quantity)), version = version + 1, updatedAt = NOW()
            `, [id || `${branchId}_${productId}`, branchId, productId]);
          }
          break;
        }
      }
    }

    if (getIsMysqlActive() && tableName) {
      try {
        await executeDeltaMysql(delta);
      } catch (mysqlErr) {
        if (isConnectionError(mysqlErr)) {
          markServerDegraded(`Delta MySQL connection error: ${mysqlErr.message}`);
          queueDegradedWrite({ type: 'delta', delta });
        } else {
          console.error('[Database Delta Query Error]:', mysqlErr.message);
        }
      }
    } else if (tableName) {
      queueDegradedWrite({ type: 'delta', delta });
    }

    if (key) {
      db[key] = Array.isArray(db[key]) ? db[key] : [];
      const row = payload.row;

      switch (delta.type) {
        case 'APPEND_SALE':
        case 'APPEND_SALE_ITEM':
        case 'APPEND_MOVEMENT':
        case 'APPEND_AUDIT_LOG':
        case 'APPEND_LEDGER_ENTRY':
        case 'APPEND_EXPENSE':
        case 'APPEND_ROW':
        case 'UPDATE_ROW': {
          if (row && row.id) {
            if (key === 'tp_users' && row.passwordHash && typeof row.passwordHash === 'string' && !isBcryptHash(row.passwordHash)) {
              row.passwordHash = await bcrypt.hash(row.passwordHash, 10);
            }
            const idx = db[key].findIndex(r => r.id === row.id);
            if (idx >= 0) {
              db[key][idx] = { ...db[key][idx], ...row };
            } else {
              db[key].push(row);
            }
            if (tableName) upsertRecordAlasql(tableName, row);
          }
          break;
        }
        case 'INCREMENT_STOCK': {
          const { id, productId, branchId, change } = payload;
          const changeVal = Number(change) || 0;
          if (productId && Array.isArray(db.tp_products)) {
            const p = db.tp_products.find(item => item.id === productId);
            if (p) p.stockQuantity = (Number(p.stockQuantity) || 0) + changeVal;
          }
          if (branchId && productId) {
            db.tp_branch_stock = Array.isArray(db.tp_branch_stock) ? db.tp_branch_stock : [];
            const bs = db.tp_branch_stock.find(item => item.productId === productId && item.branchId === branchId);
            if (bs) {
              bs.quantity = (Number(bs.quantity) || 0) + changeVal;
            } else {
              db.tp_branch_stock.push({ id: id || `${branchId}_${productId}`, branchId, productId, quantity: changeVal });
            }
          }
          break;
        }
        case 'DECREMENT_STOCK': {
          const { id: _id, productId, branchId, change } = payload;
          const changeVal = Number(change) || 0;
          if (productId && Array.isArray(db.tp_products)) {
            const p = db.tp_products.find(item => item.id === productId);
            if (p) p.stockQuantity = Math.max(0, (Number(p.stockQuantity) || 0) - changeVal);
          }
          if (branchId && productId) {
            db.tp_branch_stock = Array.isArray(db.tp_branch_stock) ? db.tp_branch_stock : [];
            const bs = db.tp_branch_stock.find(item => item.productId === productId && item.branchId === branchId);
            if (bs) {
              bs.quantity = Math.max(0, (Number(bs.quantity) || 0) - changeVal);
            } else {
              db.tp_branch_stock.push({ id: _id || `${branchId}_${productId}`, branchId, productId, quantity: 0 });
            }
          }
          break;
        }
      }
    }

    processedDeltaIds.push(delta.id);
    if (processedDeltaIds.length > 5000) processedDeltaIds.shift();
    db.tp_processed_delta_ids = processedDeltaIds;

    writeDbFile(db);

    const { hash } = await readFullDatabase();
    emitPulseUpdate(key || 'delta', hash, req.headers['x-client-id']);

    res.json({ success: true });
  } catch (error) {
    console.error('[Database] Delta processing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Save POS Sale into MySQL with full ACID transaction, row-locking & Idempotency
router.post(['/sales', '/mysql/sales', '/sqlite/sales'], express.json(), async (req, res) => {
  try {
    const sale = req.body;
    if (!sale || !sale.id) {
      return res.status(400).json({ success: false, error: 'Sale record with id is required' });
    }

    const items = Array.isArray(sale.items) ? sale.items : [];
    delete sale.items;

    if (getIsMysqlActive() && sale.idempotencyKey) {
      try {
        const [existing] = await pool.query('SELECT id, saleNumber FROM sales WHERE idempotencyKey = ? LIMIT 1', [sale.idempotencyKey]);
        if (existing && existing.length > 0) {
          return res.json({ success: true, id: existing[0].id, duplicate: true, message: 'Sale was already processed (idempotent response)' });
        }
      } catch (_) {}
    }

    async function executePosSaleMysql(s, saleItems = []) {
      let conn;
      try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        await upsertRecordMysql('sales', s, conn);

        for (const item of saleItems) {
          if (!item.saleId) item.saleId = s.id;
          await upsertRecordMysql('sale_items', item, conn);

          if (item.productId && item.quantity) {
            const qty = Number(item.quantity) || 0;
            if (s.branchId) {
              await conn.execute(`
                UPDATE branch_stock 
                SET quantity = GREATEST(0, quantity - ?), version = version + 1, updatedAt = NOW()
                WHERE branchId = ? AND productId = ?
              `, [qty, s.branchId, item.productId]);
            }
            await conn.execute(`
              UPDATE products 
              SET stockQuantity = GREATEST(0, stockQuantity - ?), version = version + 1, updatedAt = NOW()
              WHERE id = ?
            `, [qty, item.productId]);
          }
        }

        const auditMovement = {
          id: 'MOV-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          movementType: 'SALE',
          referenceId: s.id,
          branchId: s.branchId || 'B1',
          performedBy: s.cashierName || s.cashierId || 'System',
          createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
          details: `POS Sale ${s.saleNumber || s.id} - ${saleItems.length} item(s)`
        };
        await upsertRecordMysql('inventory_movements', auditMovement, conn);

        await conn.commit();
        return true;
      } catch (err) {
        if (conn) {
          try { await conn.rollback(); } catch (_) {}
        }
        throw err;
      } finally {
        if (conn) conn.release();
      }
    }

    if (getIsMysqlActive()) {
      try {
        await executePosSaleMysql(sale, items);
      } catch (err) {
        if (isConnectionError(err)) {
          markServerDegraded(`POS Sale MySQL connection error: ${err.message}`);
          queueDegradedWrite({ type: 'pos_sale', sale, items });
        } else {
          console.error('[MySQL POS Sale Error]:', err.message);
        }
      }
    } else {
      queueDegradedWrite({ type: 'pos_sale', sale, items });
    }

    upsertRecordAlasql('sales', sale);
    for (const item of items) {
      if (!item.saleId) item.saleId = sale.id;
      upsertRecordAlasql('sale_items', item);
    }

    invalidateDbCache();
    scheduleDebouncedDbFileWrite();

    const { hash } = await readFullDatabase();
    emitPulseUpdate('sales', hash, req.headers['x-client-id']);

    res.json({ success: true, id: sale.id, message: 'Sale log saved atomically to MySQL database' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Indexed Sales Lookup
router.get('/sales/lookup', async (req, res) => {
  try {
    const configured = await isDatabaseConfiguredStore();
    if (configured) {
      const user = verifyAndExtractToken(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
      }
    }

    const sales = await getSalesWithItemsLookups(req.query);
    res.json({ success: true, count: sales.length, data: sales });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Indexed Inventory & Branch Stock Lookup
router.get('/inventory/lookup', async (req, res) => {
  try {
    const configured = await isDatabaseConfiguredStore();
    if (configured) {
      const user = verifyAndExtractToken(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
      }
    }

    const products = await getInventoryAndBranchStockLookups(req.query);
    res.json({ success: true, count: products.length, data: products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Indexed Inventory Movements Lookup
router.get('/inventory-movements/lookup', async (req, res) => {
  try {
    const configured = await isDatabaseConfiguredStore();
    if (configured) {
      const user = verifyAndExtractToken(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
      }
    }

    const movements = await getInventoryMovementsLookups(req.query);
    res.json({ success: true, count: movements.length, data: movements });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Indexed Shift Sales Summary Lookup
router.get('/shifts/:shiftId/summary', async (req, res) => {
  try {
    const configured = await isDatabaseConfiguredStore();
    if (configured) {
      const user = verifyAndExtractToken(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
      }
    }

    const summary = await getShiftSalesSummaryLookups(req.params.shiftId);
    if (!summary) {
      return res.status(404).json({ success: false, error: 'Shift sales summary not found' });
    }
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Fast MySQL Branch Stock Lookup
router.get(['/branch-stock', '/mysql/branch-stock', '/sqlite/branch-stock'], async (req, res) => {
  try {
    const { branchId, productId, sku, product_sku, productSku, barcode, search, category, category_id, categoryId, limit = 200, offset = 0 } = req.query;
    const targetBranch = branchId || 'B1';
    const targetSku = product_sku || productSku || sku;
    const targetCat = category_id || categoryId || category;

    if (getIsMysqlActive() || getMysqlEnforced()) {
      let sql = `
        SELECT p.*, bs.id as branchStockId, bs.quantity as branchQuantity, bs.lowStockThreshold as branchLowStockThreshold, bs.sellingPriceOverride
        FROM products p
        LEFT JOIN branch_stock bs ON (p.id = bs.productId AND bs.branchId = ?)
        WHERE (p.isDeleted = 0 OR p.isDeleted IS NULL)
      `;
      const params = [targetBranch];

      if (productId) {
        sql += ' AND p.id = ?';
        params.push(productId);
      }
      if (targetSku) {
        sql += ' AND (p.product_sku = ? OR p.sku = ?)';
        params.push(targetSku, targetSku);
      }
      if (barcode) {
        sql += ' AND p.barcode = ?';
        params.push(barcode);
      }
      if (targetCat && targetCat !== 'All') {
        sql += ' AND (p.category_id = ? OR p.category = ?)';
        params.push(targetCat, targetCat);
      }
      if (search) {
        sql += ' AND (p.productName LIKE ? OR p.productCode LIKE ? OR p.sku LIKE ? OR p.product_sku LIKE ? OR p.barcode LIKE ?)';
        const term = `%${search}%`;
        params.push(term, term, term, term, term);
      }

      sql += ' ORDER BY p.productName ASC LIMIT ? OFFSET ?';
      params.push(Number(limit) || 200, Number(offset) || 0);

      const [rows] = await pool.query(sql, params);
      const parsed = rows.map(r => parseRowFromMysql('products', r));
      return res.json({ success: true, count: parsed.length, data: parsed });
    }

    // AlaSQL fallback
    const { db } = readFullDatabaseFromAlasql();
    let prods = Array.isArray(db.tp_products) ? db.tp_products.filter(p => p && !p.isDeleted) : [];
    const bStock = Array.isArray(db.tp_branch_stock) ? db.tp_branch_stock : [];

    if (productId) prods = prods.filter(p => p.id === productId);
    if (targetSku) prods = prods.filter(p => p.sku === targetSku || p.product_sku === targetSku);
    if (barcode) prods = prods.filter(p => p.barcode === barcode);
    if (targetCat && targetCat !== 'All') prods = prods.filter(p => p.category === targetCat || p.category_id === targetCat);
    if (search) {
      const q = String(search).toLowerCase();
      prods = prods.filter(p =>
        (p.productName && p.productName.toLowerCase().includes(q)) ||
        (p.productCode && p.productCode.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.product_sku && p.product_sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    }

    const result = prods.slice(Number(offset) || 0, (Number(offset) || 0) + (Number(limit) || 200)).map(p => {
      const bs = bStock.find(s => s && s.productId === p.id && s.branchId === targetBranch);
      return {
        ...p,
        branchStockId: bs ? bs.id : undefined,
        branchQuantity: bs ? Number(bs.quantity) || 0 : 0,
        branchLowStockThreshold: bs ? bs.lowStockThreshold : undefined,
        sellingPriceOverride: bs ? bs.sellingPriceOverride : undefined
      };
    });

    res.json({ success: true, count: result.length, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Direct Inventory Query with Indexed Lookups (product_sku, category_id, branchId)
router.get(['/inventory', '/mysql/inventory'], async (req, res) => {
  try {
    const { product_sku, sku, category_id, category, branchId, search, limit = 100, offset = 0 } = req.query;
    const targetSku = product_sku || sku;
    const targetCategory = category_id || category;

    if (getIsMysqlActive() || getMysqlEnforced()) {
      let sql = 'SELECT * FROM inventory WHERE isDeleted = 0';
      const params = [];

      if (targetSku) {
        sql += ' AND (product_sku = ? OR sku = ?)';
        params.push(targetSku, targetSku);
      }
      if (targetCategory) {
        sql += ' AND (category_id = ? OR category = ?)';
        params.push(targetCategory, targetCategory);
      }
      if (branchId) {
        sql += ' AND branchId = ?';
        params.push(branchId);
      }
      if (search) {
        sql += ' AND (productName LIKE ? OR product_sku LIKE ? OR sku LIKE ? OR barcode LIKE ?)';
        const term = `%${search}%`;
        params.push(term, term, term, term);
      }

      sql += ' ORDER BY productName ASC LIMIT ? OFFSET ?';
      params.push(Number(limit) || 100, Number(offset) || 0);

      const [rows] = await pool.query(sql, params);
      const parsed = rows.map(r => parseRowFromMysql('inventory', r));
      return res.json({ success: true, count: parsed.length, data: parsed });
    }

    const items = await getInventoryAndBranchStockLookups({
      sku: targetSku,
      product_sku: targetSku,
      category: targetCategory,
      category_id: targetCategory,
      branchId,
      search,
      limit,
      offset
    });
    return res.json({ success: true, count: items.length, data: items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Audit Trails in MySQL
router.post(['/audit-trails', '/mysql/audit-trails', '/sqlite/audit-trails'], express.json(), async (req, res) => {
  try {
    const audit = req.body;
    if (!audit) {
      return res.status(400).json({ success: false, error: 'Audit payload required' });
    }

    const auditEntry = {
      id: audit.id || ('AUD-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6)),
      actionCode: audit.action || audit.actionCode || 'GENERAL_AUDIT',
      description: typeof audit.details === 'object' ? JSON.stringify(audit.details) : (audit.details || audit.description || ''),
      module: audit.category || audit.module || 'SYSTEM',
      userId: audit.performerId || audit.userId || 'System',
      userName: audit.performerName || audit.userName || audit.username || 'System User',
      username: audit.username || audit.performerName || 'System User',
      referenceId: audit.entityId || audit.referenceId || '',
      branchId: audit.branchId || '',
      timestamp: audit.timestamp || audit.createdAt || new Date().toISOString(),
      createdAt: audit.createdAt || new Date().toISOString()
    };

    if (getIsMysqlActive() || getMysqlEnforced()) {
      try {
        await upsertRecordMysql('audit_logs', auditEntry);
      } catch (err) {
        console.warn('[MySQL Audit Error]', err.message);
      }
    }
    upsertRecordAlasql('audit_logs', auditEntry);

    res.json({ success: true, id: auditEntry.id, audit: auditEntry });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get(['/audit-trails', '/mysql/audit-trails', '/sqlite/audit-trails'], async (req, res) => {
  try {
    const { branchId, module, performerId, referenceId, startDate, endDate, limit = 100 } = req.query;

    if (getIsMysqlActive() || getMysqlEnforced()) {
      let sql = 'SELECT * FROM audit_logs WHERE 1=1';
      const params = [];

      if (branchId) {
        sql += ' AND branchId = ?';
        params.push(branchId);
      }
      if (module && module !== 'All') {
        sql += ' AND module = ?';
        params.push(module);
      }
      if (performerId) {
        sql += ' AND userId = ?';
        params.push(performerId);
      }
      if (referenceId) {
        sql += ' AND referenceId = ?';
        params.push(referenceId);
      }
      if (startDate) {
        sql += ' AND (createdAt >= ? OR timestamp >= ?)';
        params.push(startDate, startDate);
      }
      if (endDate) {
        sql += ' AND (createdAt <= ? OR timestamp <= ?)';
        params.push(endDate, endDate);
      }

      sql += ' ORDER BY COALESCE(timestamp, createdAt) DESC LIMIT ?';
      params.push(Number(limit) || 100);

      const [rows] = await pool.query(sql, params);
      const parsed = rows.map(r => parseRowFromMysql('audit_logs', r));
      return res.json({ success: true, count: parsed.length, data: parsed });
    }

    const conditions = [];
    const params = [];
    if (branchId) {
      conditions.push('branchId = ?');
      params.push(branchId);
    }
    if (module && module !== 'All') {
      conditions.push('module = ?');
      params.push(module);
    }
    if (performerId) {
      conditions.push('userId = ?');
      params.push(performerId);
    }
    if (referenceId) {
      conditions.push('referenceId = ?');
      params.push(referenceId);
    }

    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    const alasqlQuery = `SELECT * FROM audit_logs${whereClause} ORDER BY timestamp DESC`;
    const rows = alasql(alasqlQuery, params) || [];
    const parsed = rows.slice(0, Number(limit) || 100).map(r => parseRowFromMysql('audit_logs', r));
    res.json({ success: true, count: parsed.length, data: parsed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Stock Transfers in MySQL
router.post(['/stock-transfers', '/mysql/stock-transfers', '/sqlite/stock-transfers'], express.json(), async (req, res) => {
  try {
    const transfer = req.body;
    if (!transfer) {
      return res.status(400).json({ success: false, error: 'Transfer payload required' });
    }

    const transferEntry = {
      id: transfer.id || ('ST-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6)),
      transferNo: transfer.transferNo || ('TR-' + Date.now()),
      fromBranchId: transfer.fromBranchId || '',
      toBranchId: transfer.toBranchId || '',
      branchId: transfer.branchId || transfer.fromBranchId || '',
      transferType: transfer.transferType || 'Standard',
      requestedBy: transfer.requestedBy || 'System',
      status: transfer.status || 'Pending',
      reason: transfer.reason || '',
      approvedBy: transfer.approvedBy || '',
      isDeleted: transfer.isDeleted ? 1 : 0,
      timestamp: transfer.timestamp || transfer.createdAt || new Date().toISOString(),
      createdAt: transfer.createdAt || new Date().toISOString(),
      updatedAt: transfer.updatedAt || new Date().toISOString()
    };

    if (getIsMysqlActive() || getMysqlEnforced()) {
      let conn;
      try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        await upsertRecordMysql('stock_transfers', transferEntry, conn);
        if (Array.isArray(transfer.items)) {
          for (const item of transfer.items) {
            await upsertRecordMysql('stock_transfer_items', {
              id: item.id || ('STI-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6)),
              transferId: transferEntry.id,
              productId: item.productId,
              productName: item.productName || '',
              quantity: item.quantity || 0,
              isDeleted: 0
            }, conn);
          }
        }
        await conn.commit();
      } catch (err) {
        if (conn) {
          try { await conn.rollback(); } catch (_) {}
        }
        console.warn('[MySQL Stock Transfer Transaction Error]', err.message);
      } finally {
        if (conn) conn.release();
      }
    }

    upsertRecordAlasql('stock_transfers', transferEntry);
    if (Array.isArray(transfer.items)) {
      for (const item of transfer.items) {
        upsertRecordAlasql('stock_transfer_items', {
          id: item.id || ('STI-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6)),
          transferId: transferEntry.id,
          productId: item.productId,
          productName: item.productName || '',
          quantity: item.quantity || 0,
          isDeleted: 0
        });
      }
    }

    res.json({ success: true, id: transferEntry.id, transfer: transferEntry });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get(['/stock-transfers', '/mysql/stock-transfers', '/sqlite/stock-transfers'], async (req, res) => {
  try {
    const { branchId, fromBranchId, toBranchId, status, startDate, endDate, limit = 100 } = req.query;

    if (getIsMysqlActive() || getMysqlEnforced()) {
      let sql = 'SELECT * FROM stock_transfers WHERE 1=1 AND (isDeleted IS NULL OR isDeleted = 0)';
      const params = [];

      if (branchId) {
        sql += ' AND (branchId = ? OR fromBranchId = ? OR toBranchId = ?)';
        params.push(branchId, branchId, branchId);
      }
      if (fromBranchId) {
        sql += ' AND fromBranchId = ?';
        params.push(fromBranchId);
      }
      if (toBranchId) {
        sql += ' AND toBranchId = ?';
        params.push(toBranchId);
      }
      if (status) {
        sql += ' AND status = ?';
        params.push(status);
      }
      if (startDate) {
        sql += ' AND (timestamp >= ? OR createdAt >= ?)';
        params.push(startDate, startDate);
      }
      if (endDate) {
        sql += ' AND (timestamp <= ? OR createdAt <= ?)';
        params.push(endDate, endDate);
      }

      sql += ' ORDER BY COALESCE(timestamp, createdAt) DESC LIMIT ?';
      params.push(Number(limit) || 100);

      const [rows] = await pool.query(sql, params);
      const parsed = rows.map(r => parseRowFromMysql('stock_transfers', r));
      return res.json({ success: true, count: parsed.length, data: parsed });
    }

    const conditions = ['(isDeleted IS NULL OR isDeleted = ?)'];
    const params = [0];
    if (branchId) {
      conditions.push('(branchId = ? OR fromBranchId = ? OR toBranchId = ?)');
      params.push(branchId, branchId, branchId);
    }
    if (fromBranchId) {
      conditions.push('fromBranchId = ?');
      params.push(fromBranchId);
    }
    if (toBranchId) {
      conditions.push('toBranchId = ?');
      params.push(toBranchId);
    }
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    const whereClause = conditions.join(' AND ');
    const alasqlQuery = `SELECT * FROM stock_transfers WHERE ${whereClause} ORDER BY timestamp DESC`;
    const rows = alasql(alasqlQuery, params) || [];
    const parsed = rows.slice(0, Number(limit) || 100).map(r => parseRowFromMysql('stock_transfers', r));
    res.json({ success: true, count: parsed.length, data: parsed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: High-Performance Offline Outbox Batch Sync Protocol
router.post(
  ['/sync-batch', '/mysql/sync-batch'],
  authenticateUserForSyncBatch,
  express.json({ limit: '50mb' }),
  async (req, res) => {
    const { mutations, terminalId, branchId } = req.body || {};
    if (!Array.isArray(mutations) || mutations.length === 0) {
      return res.status(400).json({ success: false, error: 'Array of mutations is required' });
    }

    const results = {
      total: mutations.length,
      processed: 0,
      skipped: 0,
      failed: 0,
      terminalId: terminalId || 'UNKNOWN',
      branchId: branchId || 'B1',
      serverTimestamp: new Date().toISOString()
    };

    const db = readDbFile();
    let processedDeltaIds = db.tp_processed_delta_ids || [];

    if (getIsMysqlActive() || getMysqlEnforced()) {
      let conn;
      try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        for (const mutation of mutations) {
          if (!mutation || !mutation.id) {
            results.skipped++;
            continue;
          }

          if (processedDeltaIds.includes(mutation.id)) {
            results.skipped++;
            continue;
          }

          try {
            if (mutation.type === 'ATOMIC_TRANSACTION' || mutation.type === 'TRANSACTION_PACKAGE') {
              const payload = mutation.payload || {};
              const keyMap = {
                sales: 'sales',
                saleItems: 'sale_items',
                movements: 'inventory_movements',
                auditLogs: 'audit_logs',
                ledgerEntries: 'ledger_entries',
                expenses: 'expenses',
                stockTransfers: 'stock_transfers',
                shifts: 'shifts'
              };

              for (const [propName, tbl] of Object.entries(keyMap)) {
                const records = payload[propName];
                if (Array.isArray(records) && records.length > 0) {
                  for (const rec of records) {
                    if (rec && rec.id) {
                      await upsertRecordMysql(tbl, rec, conn);
                    }
                  }
                }
              }

              if (Array.isArray(payload.branchStockUpdates)) {
                for (const bs of payload.branchStockUpdates) {
                  if (bs && bs.branchId && bs.productId) {
                    await upsertRecordMysql('branch_stock', {
                      id: bs.id || `${bs.branchId}_${bs.productId}`,
                      branchId: bs.branchId,
                      productId: bs.productId,
                      quantity: Number(bs.quantity) || 0,
                      version: bs.version || 1,
                      updatedAt: bs.updatedAt || new Date().toISOString().slice(0, 19).replace('T', ' ')
                    }, conn);
                  }
                }
              }

              if (Array.isArray(payload.productUpdates)) {
                for (const p of payload.productUpdates) {
                  if (p && p.id) {
                    await upsertRecordMysql('products', p, conn);
                  }
                }
              }
            } else if (mutation.type === 'SINGLE_UPSERT' && mutation.table && mutation.row) {
              await upsertRecordMysql(mutation.table, mutation.row, conn);
            }

            processedDeltaIds.push(mutation.id);
            results.processed++;
          } catch (itemErr) {
            console.warn('[Sync-Batch Mutation Error]', itemErr.message);
            results.failed++;
          }
        }

        await conn.commit();
      } catch (txErr) {
        if (conn) {
          try { await conn.rollback(); } catch (_) {}
        }
        console.warn('[Sync-Batch Transaction Rollback]', txErr.message);
      } finally {
        if (conn) conn.release();
      }
    }

    for (const mutation of mutations) {
      if (!mutation || !mutation.id) continue;
      const payload = mutation.payload || {};
      
      if (mutation.type === 'ATOMIC_TRANSACTION' || mutation.type === 'TRANSACTION_PACKAGE') {
        const keyMap = {
          sales: 'tp_sales',
          saleItems: 'tp_sale_items',
          movements: 'tp_movements',
          auditLogs: 'tp_audit_logs',
          ledgerEntries: 'tp_ledger_entries',
          expenses: 'atpos_v2_expenses',
          stockTransfers: 'tp_stock_transfers',
          shifts: 'tp_shifts'
        };

        for (const [propName, storeKey] of Object.entries(keyMap)) {
          const records = payload[propName];
          if (Array.isArray(records) && records.length > 0) {
            db[storeKey] = Array.isArray(db[storeKey]) ? db[storeKey] : [];
            const tbl = KEY_TO_TABLE_MAP[storeKey];
            for (const rec of records) {
              if (!rec || !rec.id) continue;
              const idx = db[storeKey].findIndex(r => r && r.id === rec.id);
              if (idx >= 0) db[storeKey][idx] = { ...db[storeKey][idx], ...rec };
              else db[storeKey].push(rec);
              if (tbl) upsertRecordAlasql(tbl, rec);
            }
          }
        }
      }
    }

    if (processedDeltaIds.length > 5000) {
      processedDeltaIds = processedDeltaIds.slice(-5000);
    }
    db.tp_processed_delta_ids = processedDeltaIds;
    writeDbFile(db);
    invalidateDbCache();

    const { hash } = await readFullDatabase();
    emitPulseUpdate('sync-batch', hash, req.headers['x-client-id']);

    res.json({
      success: results.failed === 0,
      ...results,
      hash
    });
  }
);

// API: Reset / Purge database (F-01)
router.post(['/truncate', '/reset'], async (req, res) => {
  const user = verifyAndExtractToken(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
  }
  if (user.role !== 'Admin' && user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Forbidden: Resetting database is restricted to system administrators.' });
  }

  const { mode = 'all', confirmation, confirmationPhrase } = req.body || {};
  const phrase = (confirmation || confirmationPhrase || '').trim().toUpperCase();

  if (phrase !== 'RESET' && phrase !== 'RESET DATABASE CONFIRM') {
    return res.status(400).json({
      success: false,
      error: 'Destructive action confirmation required: Typed confirmation phrase "RESET" must be provided in request body.'
    });
  }

  if (mode !== 'all' && mode !== 'transactions') {
    return res.status(400).json({ success: false, error: 'Invalid mode. Mode must be "all" or "transactions".' });
  }

  const actor = user || {
    id: 'LOCAL_BOOT_BYPASS',
    username: 'LOCAL_RESET_ESCAPE_HATCH',
    role: 'Admin',
    branchId: 'HQ'
  };

  const auditEntry = {
    id: 'AUD-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    actionCode: 'DATABASE_TRUNCATE',
    description: `Database truncate (${mode}) executed by ${actor.username || actor.name || actor.id} [${actor.role}]`,
    module: 'SYSTEM_SETTINGS',
    userId: actor.id || 'Admin',
    userName: actor.username || actor.name || actor.fullName || 'Administrator',
    username: actor.username || actor.name || actor.fullName || 'Administrator',
    referenceId: `TRUNCATE_${mode.toUpperCase()}_${Date.now()}`,
    branchId: actor.branchId || '',
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  try {
    if (getIsMysqlActive() || getMysqlEnforced()) {
      try {
        await upsertRecordMysql('audit_logs', auditEntry);
      } catch (err) {
        console.warn('[MySQL Audit Warning Before Truncate]:', err.message);
      }
    }
    upsertRecordAlasql('audit_logs', auditEntry);

    if (getIsMysqlActive() || getMysqlEnforced()) {
      try {
        await pool.query('SET FOREIGN_KEY_CHECKS = 0');
        if (mode === 'all') {
          const allMysqlTables = [
            'branches', 'users', 'suppliers', 'brands', 'products', 'inventory',
            'branch_stock', 'shifts', 'sales', 'sale_items', 'purchase_orders',
            'purchase_order_items', 'stock_transfers', 'stock_transfer_items',
            'stock_movements', 'inventory_movements', 'deliveries', 'damage_logs',
            'ledger_entries', 'custom_corporate_bills', 'custom_bills',
            'transmittals', 'members', 'expenses', 'product_returns', 'branch_sales_reports',
            'active_sessions', 'db_snapshots', 'parked_sales', 'system_settings',
            'delta_logs', 'receipt_history', 'offline_mutations', 'processed_delta_ids'
          ];
          for (const tableName of allMysqlTables) {
            try { await pool.query(`TRUNCATE TABLE \`${tableName}\``); } catch (e) {
              try { await pool.query(`DELETE FROM \`${tableName}\``); } catch (_) {}
            }
          }
          await saveKeyToMysql('tp_is_configured', 'false');
          await saveKeyToMysql('tilepoint_onboarded_setup', 'false');
        } else if (mode === 'transactions') {
          const transactionTables = [
            'purchase_orders', 'purchase_order_items', 'transmittals', 'shifts',
            'sales', 'sale_items', 'stock_movements', 'inventory_movements',
            'stock_transfers', 'stock_transfer_items', 'ledger_entries',
            'branch_sales_reports', 'deliveries', 'damage_logs', 'expenses',
            'product_returns', 'parked_sales', 'custom_bills', 'custom_corporate_bills'
          ];
          for (const t of transactionTables) {
            try { await pool.query(`TRUNCATE TABLE \`${t}\``); } catch (e) {
              try { await pool.query(`DELETE FROM \`${t}\``); } catch (_) {}
            }
          }
          try { await pool.query('UPDATE products SET stockQuantity = 0'); } catch (e) {}
          try { await pool.query('UPDATE inventory SET stockQuantity = 0'); } catch (e) {}
          try { await pool.query('UPDATE branch_stock SET quantity = 0'); } catch (e) {}
        }
        await pool.query('SET FOREIGN_KEY_CHECKS = 1');
      } catch (err) {
        console.warn('[MySQL Truncate Warning]:', err.message);
      }
    }

    const allAlasqlTables = [
      'branches', 'users', 'suppliers', 'brands', 'products', 'inventory',
      'branch_stock', 'shifts', 'sales', 'sale_items', 'purchase_orders',
      'purchase_order_items', 'stock_transfers', 'stock_transfer_items',
      'stock_movements', 'inventory_movements', 'deliveries', 'damage_logs',
      'ledger_entries', 'custom_corporate_bills', 'custom_bills',
      'transmittals', 'members', 'expenses', 'product_returns', 'branch_sales_reports',
      'active_sessions', 'db_snapshots', 'parked_sales', 'system_settings',
      'delta_logs', 'receipt_history', 'offline_mutations', 'processed_delta_ids'
    ];

    if (mode === 'all') {
      setIsConfiguredCache(false);

      for (const tableName of allAlasqlTables) {
        try { alasql(`DELETE FROM \`${tableName}\``); } catch (e) {}
      }
      try { alasql('DELETE FROM `system_settings`'); } catch (e) {}
      try { saveKeyToAlasql('tp_is_configured', 'false'); } catch (e) {}
      try { saveKeyToAlasql('tilepoint_onboarded_setup', 'false'); } catch (e) {}

      invalidateDbCache();
      const emptyDb = getEmptyDatabaseStructure();
      emptyDb.tp_audit_logs = [auditEntry];
      writeDbFile(emptyDb);
    } else if (mode === 'transactions') {
      const transactionTables = [
        'purchase_orders', 'purchase_order_items', 'transmittals', 'shifts',
        'sales', 'sale_items', 'stock_movements', 'inventory_movements',
        'stock_transfers', 'stock_transfer_items', 'ledger_entries',
        'branch_sales_reports', 'deliveries', 'damage_logs', 'expenses',
        'product_returns', 'parked_sales', 'custom_bills', 'custom_corporate_bills'
      ];
      for (const t of transactionTables) {
        try { alasql(`DELETE FROM \`${t}\``); } catch (e) {}
      }
      try { alasql('UPDATE products SET stockQuantity = 0'); } catch (e) {}
      try { alasql('UPDATE inventory SET stockQuantity = 0'); } catch (e) {}
      try { alasql('UPDATE branch_stock SET quantity = 0'); } catch (e) {}

      invalidateDbCache();
      const { db } = readFullDatabaseFromAlasql();
      writeDbFile(db);
    }

    const { hash } = await readFullDatabase();
    emitPulseUpdate('truncate', hash, req.headers['x-client-id']);

    res.json({ success: true, mode, actor: actor.username || actor.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
