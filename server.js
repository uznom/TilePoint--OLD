import express from 'express';
import path from 'path';
import fs from 'fs';
import http from 'http';
import https from 'https';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import alasql from 'alasql';
import Database from 'better-sqlite3';
import { Server as SocketIOServer } from 'socket.io';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Simple request debug log
app.use((req, res, next) => {
  const logFile = path.join(__dirname, 'server-debug.log');
  const logEntry = `[${new Date().toISOString()}] ${req.method} ${req.url} - IP: ${req.ip} - UA: ${req.headers['user-agent']}\n`;
  try {
    fs.appendFileSync(logFile, logEntry);
  } catch (err) {}
  next();
});

// SSL Certificate configurations
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || path.join(__dirname, 'key.pem');
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || path.join(__dirname, 'cert.pem');

let useSsl = false;
let sslOptions = {};

try {
  if (fs.existsSync(SSL_KEY_PATH) && fs.existsSync(SSL_CERT_PATH)) {
    sslOptions = {
      key: fs.readFileSync(SSL_KEY_PATH),
      cert: fs.readFileSync(SSL_CERT_PATH),
    };
    useSsl = true;
  }
} catch (error) {
  console.warn('[Shared DB Server] SSL config detected but could not load files:', error.message);
}

// --- CORS & PREFLIGHT MIDDLEWARE ---
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Session-Token, X-Client-ID');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// --- SECURITY & ANTI-CRAWLER SHIELD MIDDLEWARE ---
app.use((req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  if (req.path.startsWith('/api/')) {
    return next();
  }

  // Pass through all requests in local, preview, and development runtimes
  next();
});

// Create HTTP/HTTPS Server
let server;
if (useSsl) {
  server = https.createServer(sslOptions, app);
} else {
  server = http.createServer(app);
}

// Attach Socket.io Real-time WebSocket Server
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// SSE Clients List
let clients = [];

const notifyClients = (type, info, senderClientId) => {
  const payload = JSON.stringify({ type, info });
  clients.forEach(client => {
    if (senderClientId && client.id === senderClientId) {
      return;
    }
    try {
      client.res.write(`data: ${payload}\n\n`);
    } catch (e) {}
  });
};

setInterval(() => {
  clients.forEach(client => {
    try {
      client.res.write(': keep-alive\n\n');
    } catch (e) {}
  });
}, 15000);

// Unified Real-time Broadcast Trigger (Socket.io + SSE)
const emitPulseUpdate = (key = 'all', hash = '', senderClientId = null) => {
  io.emit('db_pulse_update', {
    timestamp: new Date().toISOString(),
    key: key || 'all',
    hash: hash || ''
  });
  notifyClients('db_update', { hash, key }, senderClientId);
};

// --- DATABASE HYBRID ENGINE: MYSQL + EMBEDDED ALASQL ENGINE ---
const DB_FILE_PATH = path.join(__dirname, 'db.json');

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'tilepoint_db',
  waitForConnections: true,
  connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 25),
  maxIdle: Number(process.env.MYSQL_MAX_IDLE || 10),
  idleTimeout: 60000,
  queueLimit: 0,
  connectTimeout: 5000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  namedPlaceholders: true
});

let isMysqlActive = false;

// Initialize AlaSQL MySQL-compatible embedded SQL Engine
function initAlasqlEngine() {
  try {
    const ALL_TABLES = Object.values(KEY_TO_TABLE_MAP);
    const UNIQUE_TABLES = Array.from(new Set(ALL_TABLES));

    for (const tableName of UNIQUE_TABLES) {
      const columns = TABLE_COLUMNS[tableName] || ['id'];
      const colDefs = columns.map(c => `\`${c}\` STRING`).join(', ');
      alasql(`CREATE TABLE IF NOT EXISTS \`${tableName}\` (${colDefs})`);
    }
    alasql('CREATE TABLE IF NOT EXISTS `system_settings` (`setting_key` STRING, `setting_value` STRING)');

    // Seed AlaSQL tables from db.json if available
    if (fs.existsSync(DB_FILE_PATH)) {
      try {
        const fileContent = fs.readFileSync(DB_FILE_PATH, 'utf8');
        const dbObj = JSON.parse(fileContent);
        
        for (const [key, val] of Object.entries(dbObj)) {
          const tableName = KEY_TO_TABLE_MAP[key];
          if (tableName && Array.isArray(val)) {
            for (const row of val) {
              upsertRecordAlasql(tableName, row);
            }
          } else if (!tableName && typeof val !== 'undefined') {
            const valStr = typeof val === 'string' ? val : JSON.stringify(val);
            alasql('DELETE FROM `system_settings` WHERE `setting_key` = ?', [key]);
            alasql('INSERT INTO `system_settings` VALUES (?, ?)', [key, valStr]);
          }
        }
      } catch (err) {
        console.warn('[AlaSQL] Seed warning:', err.message);
      }
    }

    console.log('[Database Engine] AlaSQL Embedded Relational SQL Engine initialized successfully with 28 MySQL tables.');
  } catch (err) {
    console.error('[AlaSQL Engine] Init error:', err.message);
  }
}

function upsertRecordAlasql(tableName, record) {
  if (!record || typeof record !== 'object') return;
  const allowed = TABLE_COLUMNS[tableName];
  if (!allowed) return;

  if (record.id) {
    alasql(`DELETE FROM \`${tableName}\` WHERE id = ?`, [record.id]);
  }

  const validCols = allowed.filter(col => record[col] !== undefined);
  if (validCols.length === 0) return;

  const colList = validCols.map(c => `\`${c}\``).join(', ');
  const placeholders = validCols.map(() => '?').join(', ');
  const vals = validCols.map(col => {
    const val = record[col];
    if (val === null || val === undefined) return null;
    if (typeof val === 'object') return JSON.stringify(val);
    return val;
  });

  try {
    alasql(`INSERT INTO \`${tableName}\` (${colList}) VALUES (${placeholders})`, vals);
  } catch (e) {}
}

// --- LOCAL PERSISTENT SQLITE DATABASE ENGINE (better-sqlite3) ---
const SQLITE_DB_PATH = path.join(__dirname, 'tilepoint_sqlite.db');
let sqliteDb = null;

function createSqliteIndexesForTable(tableName) {
  if (!sqliteDb || !tableName) return;
  try {
    if (tableName === 'branch_stock') {
      sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_branch_stock_branch_product ON branch_stock (branchId, productId)`);
      sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_branch_stock_product ON branch_stock (productId)`);
    } else if (tableName === 'products') {
      sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_products_deleted_cat ON products (isDeleted, category)`);
      sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_products_deleted_name ON products (isDeleted, productName)`);
      sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_products_code ON products (productCode)`);
      sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_products_sku ON products (sku)`);
      sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_products_barcode ON products (barcode)`);
    } else if (tableName === 'audit_logs') {
      sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_audit_logs_branch ON audit_logs (branchId)`);
      sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp DESC)`);
      sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_audit_logs_branch_timestamp ON audit_logs (branchId, timestamp DESC)`);
      sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_audit_logs_branch_created ON audit_logs (branchId, createdAt DESC)`);
      sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_audit_logs_module_created ON audit_logs (module, createdAt DESC)`);
      sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (createdAt DESC)`);
      sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_audit_logs_ref ON audit_logs (referenceId)`);
      sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs (userId)`);
    } else if (tableName === 'stock_transfers') {
      sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_stock_transfers_branch ON stock_transfers (branchId)`);
      sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_stock_transfers_from_branch ON stock_transfers (fromBranchId)`);
      sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_stock_transfers_to_branch ON stock_transfers (toBranchId)`);
      sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_stock_transfers_timestamp ON stock_transfers (timestamp DESC)`);
      sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_stock_transfers_branch_timestamp ON stock_transfers (branchId, timestamp DESC)`);
      sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_stock_transfers_created ON stock_transfers (createdAt DESC)`);
      sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_stock_transfers_status ON stock_transfers (status)`);
    } else if (tableName === 'sales') {
      sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_sales_branch_created ON sales (branchId, createdAt DESC)`);
      sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_sales_number ON sales (saleNumber)`);
    } else if (tableName === 'sale_items') {
      sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items (saleId)`);
      sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items (productId)`);
    } else if (tableName === 'inventory_movements') {
      sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_inventory_movements_branch_created ON inventory_movements (branchId, createdAt DESC)`);
      sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements (movementType)`);
    }
  } catch (idxErr) {
    // Non-fatal indexing notice
  }
}

function ensureSqliteTable(tableName) {
  if (!sqliteDb || !tableName) return;
  try {
    const rawCols = (typeof TABLE_COLUMNS === 'object' && TABLE_COLUMNS[tableName]) ? TABLE_COLUMNS[tableName] : ['id'];
    const uniqueCols = [];
    const seenColNames = new Set();
    for (const c of rawCols) {
      const lower = c.toLowerCase();
      if (!seenColNames.has(lower)) {
        seenColNames.add(lower);
        uniqueCols.push(c);
      }
    }

    const colDefs = uniqueCols.map(c => c === 'id' ? '`id` TEXT PRIMARY KEY' : `\`${c}\` TEXT`).join(', ');
    sqliteDb.exec(`CREATE TABLE IF NOT EXISTS \`${tableName}\` (${colDefs})`);

    const tableInfo = sqliteDb.prepare(`PRAGMA table_info(\`${tableName}\`)`).all();
    const existingCols = new Set(tableInfo.map(col => col.name.toLowerCase()));

    for (const col of uniqueCols) {
      if (!existingCols.has(col.toLowerCase())) {
        try {
          sqliteDb.exec(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${col}\` TEXT`);
          existingCols.add(col.toLowerCase());
        } catch (alterErr) {}
      }
    }

    createSqliteIndexesForTable(tableName);
  } catch (e) {
    console.warn(`[SQLite Engine] ensureSqliteTable failed for table "${tableName}":`, e.message);
  }
}

function initSqliteEngine() {
  try {
    sqliteDb = new Database(SQLITE_DB_PATH);
    sqliteDb.pragma('journal_mode = WAL');
    sqliteDb.pragma('synchronous = NORMAL');
    sqliteDb.pragma('foreign_keys = OFF');

    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS \`system_settings\` (
        \`setting_key\` TEXT PRIMARY KEY,
        \`setting_value\` TEXT
      )
    `);

    if (typeof KEY_TO_TABLE_MAP === 'object') {
      const ALL_TABLES = Object.values(KEY_TO_TABLE_MAP);
      const UNIQUE_TABLES = Array.from(new Set(ALL_TABLES));

      for (const tableName of UNIQUE_TABLES) {
        ensureSqliteTable(tableName);
      }
    }

    // Seed SQLite tables from db.json if database is newly initialized
    try {
      const checkSettings = sqliteDb.prepare('SELECT COUNT(*) as count FROM system_settings').get();
      if (checkSettings && checkSettings.count === 0 && fs.existsSync(DB_FILE_PATH)) {
        const fileContent = fs.readFileSync(DB_FILE_PATH, 'utf8');
        const dbObj = JSON.parse(fileContent);

        const insertTx = sqliteDb.transaction(() => {
          for (const [key, val] of Object.entries(dbObj)) {
            const tableName = KEY_TO_TABLE_MAP[key];
            if (tableName && Array.isArray(val)) {
              ensureSqliteTable(tableName);
              for (const row of val) {
                upsertRecordSqlite(tableName, row);
              }
            } else if (!tableName && typeof val !== 'undefined') {
              const valStr = typeof val === 'string' ? val : JSON.stringify(val);
              sqliteDb.prepare(`
                INSERT INTO system_settings (setting_key, setting_value)
                VALUES (?, ?)
                ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value
              `).run(key, valStr);
            }
          }
        });
        insertTx();
        console.log('[SQLite Engine] Successfully seeded SQLite database from db.json');
      }
    } catch (seedErr) {
      console.warn('[SQLite Engine] Seed warning:', seedErr.message);
    }

    console.log('[Database Engine] better-sqlite3 Local Persistent SQLite Engine initialized successfully at:', SQLITE_DB_PATH);
  } catch (err) {
    console.error('[SQLite Engine] Initialization error:', err.message);
  }
}

function upsertRecordSqlite(tableName, record) {
  if (!record || typeof record !== 'object' || !sqliteDb) return;
  ensureSqliteTable(tableName);
  const allowed = TABLE_COLUMNS[tableName];
  if (!allowed) return;

  const validKeys = Object.keys(record).filter(k => allowed.includes(k) && record[k] !== undefined);
  if (validKeys.length === 0) return;

  const colList = validKeys.map(c => `\`${c}\``).join(', ');
  const placeholders = validKeys.map(() => '?').join(', ');
  const hasId = validKeys.includes('id');

  let sql = '';
  if (hasId) {
    const updateCols = validKeys.filter(k => k !== 'id').map(k => `\`${k}\` = excluded.\`${k}\``).join(', ');
    if (updateCols.length > 0) {
      sql = `INSERT INTO \`${tableName}\` (${colList}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updateCols}`;
    } else {
      sql = `INSERT INTO \`${tableName}\` (${colList}) VALUES (${placeholders}) ON CONFLICT(id) DO NOTHING`;
    }
  } else {
    sql = `INSERT INTO \`${tableName}\` (${colList}) VALUES (${placeholders})`;
  }

  const values = validKeys.map(k => {
    const val = record[k];
    if (val === null || val === undefined) return null;
    if (typeof val === 'boolean') return val ? 1 : 0;
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  });

  try {
    sqliteDb.prepare(sql).run(...values);
  } catch (e) {}
}

function getOrReadFullDatabaseSync() {
  if (!isDbCacheDirty && cachedFullDb && cachedDbHash) {
    return { db: cachedFullDb, hash: cachedDbHash };
  }

  const db = {};
  if (!sqliteDb) return { db, hash: '' };

  try {
    const settings = sqliteDb.prepare('SELECT setting_key, setting_value FROM system_settings').all() || [];
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
      const tableRows = sqliteDb.prepare(`SELECT * FROM \`${tableName}\``).all() || [];
      db[tpKey] = tableRows.map(r => parseRowFromMysql(tableName, r));
    } catch (err) {
      db[tpKey] = [];
    }
  }

  const hash = computeDatabaseHash(db);
  cachedFullDb = db;
  cachedDbHash = hash;
  isDbCacheDirty = false;
  return { db, hash };
}

function readFullDatabaseFromSqlite() {
  return getOrReadFullDatabaseSync();
}

function saveKeyToSqlite(key, value) {
  if (!sqliteDb) return;
  const tableName = KEY_TO_TABLE_MAP[key];

  if (tableName) {
    if (Array.isArray(value)) {
      const tx = sqliteDb.transaction(() => {
        for (const item of value) {
          upsertRecordSqlite(tableName, item);
        }
      });
      tx();
    } else if (typeof value === 'object' && value !== null) {
      upsertRecordSqlite(tableName, value);
    }
  } else {
    const valStr = typeof value === 'string' ? value : JSON.stringify(value);
    try {
      sqliteDb.prepare(`
        INSERT INTO system_settings (setting_key, setting_value)
        VALUES (?, ?)
        ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value
      `).run(key, valStr);
    } catch (e) {}
  }
}

async function checkMysqlConnection() {
  try {
    const conn = await pool.getConnection();
    conn.release();
    if (!isMysqlActive) {
      console.log('[Database] MySQL connection established successfully.');
    }
    isMysqlActive = true;
    return true;
  } catch (err) {
    if (isMysqlActive) {
      console.warn(`[Database] MySQL connection lost (${err.code}). Running on AlaSQL embedded MySQL Engine.`);
    }
    isMysqlActive = false;
    return false;
  }
}

// Check MySQL connection on boot & periodically
checkMysqlConnection().catch(() => {});
setInterval(checkMysqlConnection, 30000);

// --- IN-MEMORY CACHE & DEBOUNCED DISK PERSISTENCE ---
let cachedFullDb = null;
let cachedDbHash = null;
let isDbCacheDirty = true;
let writeDbTimer = null;
let isConfiguredCache = null;

function invalidateDbCache() {
  isDbCacheDirty = true;
}

function scheduleDebouncedDbFileWrite() {
  if (writeDbTimer) clearTimeout(writeDbTimer);
  writeDbTimer = setTimeout(() => {
    try {
      const { db } = getOrReadFullDatabaseSync();
      fs.writeFile(DB_FILE_PATH, JSON.stringify(db), 'utf8', (err) => {
        if (err) console.error('[File DB] Async write warning:', err.message);
      });
    } catch (e) {
      console.error('[File DB] Debounced write error:', e.message);
    }
  }, 1000);
}

// JSON File Store Read/Write
function readDbFile() {
  if (cachedFullDb && !isDbCacheDirty) {
    return cachedFullDb;
  }
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const data = fs.readFileSync(DB_FILE_PATH, 'utf8');
      const parsed = JSON.parse(data);
      cachedFullDb = parsed;
      cachedDbHash = computeDatabaseHash(parsed);
      isDbCacheDirty = false;
      return parsed;
    }
  } catch (e) {
    console.error('[File DB] Read error:', e.message);
  }
  return {};
}

function writeDbFile(data) {
  if (data && typeof data === 'object') {
    cachedFullDb = data;
    cachedDbHash = computeDatabaseHash(data);
    isDbCacheDirty = false;
  }
  scheduleDebouncedDbFileWrite();
}

// Map JSON collection keys to MySQL tables
const KEY_TO_TABLE_MAP = {
  'tp_branches': 'branches',
  'tp_users': 'users',
  'tp_suppliers': 'suppliers',
  'tp_brands': 'brands',
  'tp_products': 'products',
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

// Allowed schema columns per table for safe SQL generation
const TABLE_COLUMNS = {
  branches: ['id', 'name', 'manager', 'address', 'phone', 'monthlySales', 'staffCount', 'activeCashiers', 'isDeleted', 'isDistributionBranch', 'storeLogo', 'branchCode', 'localIp', 'gatewayRules', 'receiptFacebook', 'receiptPromoText', 'receiptQrBase64', 'receiptThankYou', 'tin', 'logoSize', 'openingTime', 'closingTime', 'operatingDays', 'createdAt', 'updatedAt'],
  users: ['id', 'avatarInitials', 'fullName', 'username', 'email', 'role', 'branchAssignmentId', 'status', 'managerPin', 'passwordHash', 'profilePicture', 'isNew', 'createdAt', 'updatedAt'],
  suppliers: ['id', 'name', 'contactPerson', 'email', 'phone', 'address', 'isDeleted', 'createdAt', 'updatedAt'],
  brands: ['id', 'name', 'supplierId', 'description', 'isDeleted', 'createdAt'],
  products: ['id', 'productCode', 'productName', 'category', 'brand', 'sku', 'barcode', 'unit', 'costPrice', 'sellingPrice', 'stockQuantity', 'lowStockThreshold', 'designName', 'size', 'supplierId', 'origin', 'image', 'boxQuantity', 'coveragePerBox', 'minimumStock', 'qrCode', 'createdBy', 'updatedBy', 'version', 'markupPercent', 'taxType', 'hasExpiration', 'expirationDate', 'isDeleted', 'createdAt', 'updatedAt'],
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
  audit_logs: ['id', 'actionCode', 'description', 'module', 'userId', 'userName', 'username', 'referenceId', 'action', 'tableAffected', 'recordId', 'changePayload', 'timestamp', 'createdAt', 'branchId'],
  custom_corporate_bills: ['id', 'title', 'supplierId', 'purchaseOrderId', 'totalAmount', 'remainingBalance', 'frequency', 'nextDueDate', 'installmentsCount', 'status', 'notes', 'isDeleted', 'deletedAt', 'createdAt', 'updatedAt'],
  transmittals: ['id', 'documentType', 'fromBranchId', 'toBranchId', 'submittedBy', 'status', 'payloadJson', 'notes', 'submittedAt', 'isDeleted'],
  members: ['id', 'fullName', 'phone', 'email', 'points', 'creditLimit', 'outstandingBalance', 'status', 'branchId', 'createdAt', 'updatedAt'],
  expenses: ['id', 'branchId', 'dateTime', 'category', 'amount', 'recordedBy', 'notes', 'isDeleted', 'deletedAt'],
  product_returns: ['id', 'saleId', 'productName', 'quantityReturned', 'amountRefunded', 'damageRestockFee', 'status', 'dateTime', 'isDeleted', 'deletedAt'],
  branch_sales_reports: ['id', 'branchId', 'branchName', 'reportingDate', 'totalSalesCount', 'totalSalesAmount', 'totalVatAmount', 'totalDiscountAmount', 'transmissionType', 'sales', 'saleItems', 'users', 'expenses', 'deliveries', 'purchaseOrders', 'pandl', 'heatmap', 'boa', 'notes', 'status', 'importVerificationId', 'securitySignature', 'approvedBy', 'auditedBy', 'auditedAt', 'transferredAt'],
  active_sessions: ['id', 'userId', 'username', 'fullName', 'role', 'branchId', 'branchName', 'lastActive', 'userAgent'],
  db_snapshots: ['id', 'name', 'creator', 'sizeBytes', 'data', 'timestamp']
};

// Initialize database schema tables if MySQL is available
async function initDatabaseSchema() {
  if (!isMysqlActive) return;
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sqlContent = fs.readFileSync(schemaPath, 'utf8');
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.toLowerCase().startsWith('create database') && !s.toLowerCase().startsWith('use '));
      
      for (const stmt of statements) {
        try {
          await pool.query(stmt);
        } catch (e) {}
      }
    }
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`system_settings\` (
        \`setting_key\` VARCHAR(191) NOT NULL,
        \`setting_value\` LONGTEXT NULL,
        PRIMARY KEY (\`setting_key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    console.log('[MySQL] Database schema verified and initialized.');
  } catch (err) {
    console.warn('[MySQL] Notice during schema initialization:', err.message);
  }
}

// Utility function to compute database hash
const computeDatabaseHash = (dbObj) => {
  try {
    const rawStr = JSON.stringify(dbObj, (key, value) => {
      if (key === 'tp_db_snapshots' || key === 'tp_processed_delta_ids') return undefined;
      return value;
    });
    return crypto.createHash('md5').update(rawStr).digest('hex');
  } catch (err) {
    return String(Date.now());
  }
};

// Helper: Parse row from MySQL into JavaScript types
function parseRowFromMysql(tableName, row) {
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

// Helper: Upsert a single record into a MySQL table using ON DUPLICATE KEY UPDATE
async function upsertRecordMysql(tableName, record) {
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
    if (typeof val === 'object') return JSON.stringify(val);
    if (typeof val === 'string' && (k.endsWith('At') || k.endsWith('Date') || k === 'timestamp' || k === 'dateTime')) {
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

  await pool.execute(sql, values);
}

// Helper: Fast Chunked Batch Upsert for MySQL (Multi-Row Bulk Inserts)
async function upsertBatchMysql(tableName, records, chunkSize = 50) {
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
        } else if (typeof val === 'object') {
          values.push(JSON.stringify(val));
        } else if (typeof val === 'string' && (k.endsWith('At') || k.endsWith('Date') || k === 'timestamp' || k === 'dateTime')) {
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

    await pool.execute(sql, values);
  }
}

// Helper: Read full database state from AlaSQL
function readFullDatabaseFromAlasql() {
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

  const hash = computeDatabaseHash(db);
  return { db, hash };
}

// Helper: Read full database state from MySQL (Optimized Concurrent Parallel Queries)
async function readFullDatabaseFromMysql() {
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

  const hash = computeDatabaseHash(db);
  return { db, hash };
}

// Wrapper: Read full database from MySQL or SQLite Engine
async function readFullDatabase() {
  if (!isDbCacheDirty && cachedFullDb && cachedDbHash) {
    return { db: cachedFullDb, hash: cachedDbHash };
  }

  if (isMysqlActive) {
    try {
      const res = await readFullDatabaseFromMysql();
      cachedFullDb = res.db;
      cachedDbHash = res.hash;
      isDbCacheDirty = false;
      return res;
    } catch (err) {
      console.warn('[Database] MySQL query failed, falling back to SQLite Engine:', err.message);
      isMysqlActive = false;
    }
  }

  const sqliteRes = getOrReadFullDatabaseSync();
  if (sqliteRes && sqliteRes.hash) {
    return sqliteRes;
  }

  return readFullDatabaseFromAlasql();
}

// Helper: Save single key to AlaSQL
function saveKeyToAlasql(key, value) {
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

// Helper: Save single key to MySQL (Batch Optimized)
async function saveKeyToMysql(key, value) {
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

// Wrapper: Save key-value state to MySQL, SQLite and AlaSQL Store
async function saveKeyToStore(key, value) {
  if (key === 'tp_is_configured' && (value === 'true' || value === true)) {
    isConfiguredCache = true;
  }
  if (key === 'tp_bootstrap_init') {
    isConfiguredCache = true;
    if (value && typeof value === 'object') {
      for (const k of Object.keys(value)) {
        saveKeyToAlasql(k, value[k]);
        saveKeyToSqlite(k, value[k]);
      }
    }
    saveKeyToAlasql('tp_is_configured', 'true');
    saveKeyToAlasql('tilepoint_onboarded_setup', 'false');
    saveKeyToSqlite('tp_is_configured', 'true');
    saveKeyToSqlite('tilepoint_onboarded_setup', 'false');
  } else {
    saveKeyToAlasql(key, value);
    saveKeyToSqlite(key, value);
  }

  if (isMysqlActive) {
    try {
      if (key === 'tp_bootstrap_init') {
        if (value && typeof value === 'object') {
          for (const k of Object.keys(value)) {
            await saveKeyToMysql(k, value[k]);
          }
        }
        await saveKeyToMysql('tp_is_configured', 'true');
        await saveKeyToMysql('tilepoint_onboarded_setup', 'false');
      } else {
        await saveKeyToMysql(key, value);
      }
    } catch (err) {
      console.warn('[Database] MySQL write warning:', err.message);
      isMysqlActive = false;
    }
  }

  invalidateDbCache();
  scheduleDebouncedDbFileWrite();
}

// Wrapper: Check if database is configured
async function isDatabaseConfiguredStore() {
  if (isConfiguredCache === true) return true;

  if (isMysqlActive) {
    try {
      const [settings] = await pool.query('SELECT setting_value FROM system_settings WHERE setting_key = ?', ['tp_is_configured']);
      if (settings.length > 0) {
        const val = settings[0].setting_value;
        const conf = val === 'true' || val === true || val === '"true"';
        if (conf) isConfiguredCache = true;
        return conf;
      }
      const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
      const conf = users[0].count > 0;
      if (conf) isConfiguredCache = true;
      return conf;
    } catch (e) {
      isMysqlActive = false;
    }
  }

  if (sqliteDb) {
    try {
      const row = sqliteDb.prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'tp_is_configured'").get();
      if (row && row.setting_value) {
        const val = row.setting_value;
        const conf = val === 'true' || val === true || val === '"true"';
        if (conf) isConfiguredCache = true;
        return conf;
      }
      const userCount = sqliteDb.prepare("SELECT COUNT(*) as count FROM users").get();
      const conf = userCount && userCount.count > 0;
      if (conf) isConfiguredCache = true;
      return conf;
    } catch (e) {}
  }

  return false;
}

// --- INDEXED DATABASE LOOKUP HELPER FUNCTIONS ---

/**
 * Helper: Query sales with sale_items leveraging SQL schema indexes
 * (idx_sales_branch_id, idx_sales_shift_id, idx_sales_cashier_id, idx_sales_created_at, idx_sales_is_deleted, idx_sale_items_sale_id)
 */
async function getSalesWithItemsLookups(filters = {}) {
  const { branchId, shiftId, cashierId, startDate, endDate, saleNumber, isDeleted = 0, limit = 100, offset = 0 } = filters;

  if (isMysqlActive) {
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

      // Fetch matching sale_items in batch using indexed saleId (idx_sale_items_sale_id)
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
      console.warn('[Database] MySQL getSalesWithItemsLookups failed, falling back to AlaSQL:', err.message);
      isMysqlActive = false;
    }
  }

  // AlaSQL fallback
  try {
    let query = 'SELECT * FROM sales WHERE isDeleted = ' + (isDeleted ? '1' : '0');
    const params = [];
    if (branchId) { query += ' AND branchId = ?'; params.push(branchId); }
    if (shiftId) { query += ' AND shiftId = ?'; params.push(shiftId); }
    if (cashierId) { query += ' AND cashierId = ?'; params.push(cashierId); }
    if (saleNumber) { query += ' AND saleNumber = ?'; params.push(saleNumber); }
    query += ' ORDER BY createdAt DESC';

    let sales = alasql(query, params) || [];
    if (startDate) sales = sales.filter(s => new Date(s.createdAt) >= new Date(startDate));
    if (endDate) sales = sales.filter(s => new Date(s.createdAt) <= new Date(endDate));

    const allItems = alasql('SELECT * FROM sale_items WHERE isDeleted = 0') || [];
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

/**
 * Helper: Query inventory products and branch stock leveraging SQL schema indexes
 * (idx_products_category, idx_products_brand, idx_products_supplier_id, idx_products_sku, idx_products_barcode, idx_products_is_deleted, uk_branch_product)
 */
async function getInventoryAndBranchStockLookups(filters = {}) {
  const { branchId, category, brand, supplierId, sku, barcode, search, isDeleted = 0, limit = 100, offset = 0 } = filters;

  if (isMysqlActive) {
    try {
      const conditions = ['p.isDeleted = ?'];
      const params = [isDeleted ? 1 : 0];

      if (category) {
        conditions.push('p.category = ?');
        params.push(category);
      }
      if (brand) {
        conditions.push('p.brand = ?');
        params.push(brand);
      }
      if (supplierId) {
        conditions.push('p.supplierId = ?');
        params.push(supplierId);
      }
      if (sku) {
        conditions.push('p.sku = ?');
        params.push(sku);
      }
      if (barcode) {
        conditions.push('p.barcode = ?');
        params.push(barcode);
      }
      if (search) {
        conditions.push('(p.productName LIKE ? OR p.productCode LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)');
        const term = `%${search}%`;
        params.push(term, term, term, term);
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
      console.warn('[Database] MySQL getInventoryAndBranchStockLookups failed, falling back to AlaSQL:', err.message);
      isMysqlActive = false;
    }
  }

  // AlaSQL fallback
  try {
    let products = alasql('SELECT * FROM products WHERE isDeleted = ' + (isDeleted ? '1' : '0')) || [];
    if (category) products = products.filter(p => p.category === category);
    if (brand) products = products.filter(p => p.brand === brand);
    if (supplierId) products = products.filter(p => p.supplierId === supplierId);
    if (sku) products = products.filter(p => p.sku === sku);
    if (barcode) products = products.filter(p => p.barcode === barcode);
    if (search) {
      const term = search.toLowerCase();
      products = products.filter(p => 
        (p.productName || '').toLowerCase().includes(term) ||
        (p.productCode || '').toLowerCase().includes(term) ||
        (p.sku || '').toLowerCase().includes(term) ||
        (p.barcode || '').toLowerCase().includes(term)
      );
    }

    let branchStocks = [];
    if (branchId) {
      branchStocks = alasql(`SELECT * FROM branch_stock WHERE branchId = ?`, [branchId]) || [];
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

/**
 * Helper: Query inventory movements leveraging SQL schema indexes
 * (idx_inv_mov_product_id, idx_inv_mov_source_branch, idx_inv_mov_dest_branch, idx_inv_mov_user_id)
 */
async function getInventoryMovementsLookups(filters = {}) {
  const { productId, sourceBranchId, destinationBranchId, userId, startDate, endDate, limit = 100, offset = 0 } = filters;

  if (isMysqlActive) {
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
      console.warn('[Database] MySQL getInventoryMovementsLookups failed, falling back to AlaSQL:', err.message);
      isMysqlActive = false;
    }
  }

  // AlaSQL fallback
  try {
    let query = 'SELECT * FROM inventory_movements WHERE isDeleted = 0';
    const params = [];
    if (productId) { query += ' AND productId = ?'; params.push(productId); }
    if (sourceBranchId) { query += ' AND sourceBranchId = ?'; params.push(sourceBranchId); }
    if (destinationBranchId) { query += ' AND destinationBranchId = ?'; params.push(destinationBranchId); }
    if (userId) { query += ' AND userId = ?'; params.push(userId); }
    query += ' ORDER BY timestamp DESC';

    let movements = alasql(query, params) || [];
    if (startDate) movements = movements.filter(m => new Date(m.timestamp) >= new Date(startDate));
    if (endDate) movements = movements.filter(m => new Date(m.timestamp) <= new Date(endDate));

    return movements.slice(Number(offset) || 0, (Number(offset) || 0) + (Number(limit) || 100)).map(m => parseRowFromMysql('inventory_movements', m));
  } catch (e) {
    return [];
  }
}

/**
 * Helper: Aggregate sales summary for a shift leveraging index idx_sales_shift_id
 */
async function getShiftSalesSummaryLookups(shiftId) {
  if (!shiftId) return null;

  if (isMysqlActive) {
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
      console.warn('[Database] MySQL getShiftSalesSummaryLookups failed, falling back to AlaSQL:', err.message);
      isMysqlActive = false;
    }
  }

  // AlaSQL fallback
  try {
    const sales = alasql('SELECT * FROM sales WHERE shiftId = ? AND isDeleted = 0', [shiftId]) || [];
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

function sha256Pure(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function verifyAndExtractToken(req) {
  const authHeader = req.headers['authorization'];
  let token = req.headers['x-session-token'];

  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (!token) {
    return null;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 2) {
      return null;
    }

    const [payloadBase64, signature] = parts;

    const possibleSecrets = Array.from(new Set([
      process.env.VITE_SECURITY_SECRET,
      process.env.SECURITY_SECRET,
      "tile_point_salt_retneC eliT nammE_secure_fallback"
    ].filter(s => Boolean(s && s.trim().length >= 16))));

    const signatureMatches = possibleSecrets.some(sec => {
      const expected = sha256Pure(payloadBase64 + "." + sec);
      return signature === expected;
    });

    if (!signatureMatches) {
      return null;
    }

    const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
    const payload = JSON.parse(payloadJson);

    const drift = Math.abs(Date.now() - payload.timestamp);
    if (drift > 7 * 24 * 60 * 60 * 1000) {
      return null;
    }

    return payload;
  } catch (err) {
    return null;
  }
}

// SSE real-time event subscription endpoint
app.get('/api/db/events', (req, res) => {
  const clientId = req.query.clientId || 'anonymous';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'handshake', info: { connected: true } })}\n\n`);
  clients.push({ id: clientId, res });

  req.on('close', () => {
    clients = clients.filter(c => c.res !== res);
  });
});

// API: Get full database state
app.get('/api/db', async (req, res) => {
  try {
    const clientHash = req.query.hash || req.headers['if-none-match'];

    if (clientHash && cachedDbHash && clientHash === cachedDbHash && !isDbCacheDirty) {
      return res.json({
        success: true,
        unchanged: true,
        hash: cachedDbHash,
        timestamp: new Date().toISOString()
      });
    }

    const { db, hash } = await readFullDatabase();

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

// API: Indexed Sales Lookup
app.get('/api/db/sales/lookup', async (req, res) => {
  try {
    const sales = await getSalesWithItemsLookups(req.query);
    res.json({ success: true, count: sales.length, data: sales });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Indexed Inventory & Branch Stock Lookup
app.get('/api/db/inventory/lookup', async (req, res) => {
  try {
    const products = await getInventoryAndBranchStockLookups(req.query);
    res.json({ success: true, count: products.length, data: products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Indexed Inventory Movements Lookup
app.get('/api/db/inventory-movements/lookup', async (req, res) => {
  try {
    const movements = await getInventoryMovementsLookups(req.query);
    res.json({ success: true, count: movements.length, data: movements });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Indexed Shift Sales Summary Lookup
app.get('/api/db/shifts/:shiftId/summary', async (req, res) => {
  try {
    const summary = await getShiftSalesSummaryLookups(req.params.shiftId);
    if (!summary) {
      return res.status(404).json({ success: false, error: 'Shift sales summary not found' });
    }
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Get backups/snapshots list
app.get('/api/db/backups', async (req, res) => {
  try {
    const metadataOnly = req.query.metadataOnly === 'true';

    if (isMysqlActive) {
      try {
        if (metadataOnly) {
          const [rows] = await pool.query('SELECT id, name, creator, sizeBytes, timestamp FROM db_snapshots ORDER BY timestamp DESC');
          return res.json({ success: true, data: rows });
        }
        const [rows] = await pool.query('SELECT * FROM db_snapshots ORDER BY timestamp DESC');
        return res.json({ success: true, data: rows.map(r => parseRowFromMysql('db_snapshots', r)) });
      } catch (err) {
        isMysqlActive = false;
      }
    }

    const db = readDbFile();
    const snapshots = db.tp_db_snapshots || [];
    if (metadataOnly) {
      const meta = snapshots.map(s => ({
        id: s.id,
        name: s.name,
        creator: s.creator,
        sizeBytes: s.sizeBytes,
        timestamp: s.timestamp
      }));
      return res.json({ success: true, data: meta });
    }
    res.json({ success: true, data: snapshots });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Get single full snapshot details
app.get('/api/db/backups/:id', async (req, res) => {
  try {
    if (isMysqlActive) {
      try {
        const [rows] = await pool.query('SELECT * FROM db_snapshots WHERE id = ?', [req.params.id]);
        if (rows.length > 0) {
          return res.json({ success: true, data: parseRowFromMysql('db_snapshots', rows[0]) });
        }
      } catch (err) {
        isMysqlActive = false;
      }
    }

    const db = readDbFile();
    const snapshots = db.tp_db_snapshots || [];
    const found = snapshots.find(s => s.id === req.params.id);
    if (!found) {
      return res.status(404).json({ success: false, error: 'Snapshot not found' });
    }
    res.json({ success: true, data: found });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Save heavy snapshot
app.post('/api/db/backups', express.json({ limit: '100mb' }), async (req, res) => {
  const { snapshot } = req.body;
  if (!snapshot || !snapshot.id) {
    return res.status(400).json({ success: false, error: 'Invalid snapshot payload' });
  }

  try {
    if (isMysqlActive) {
      try {
        await upsertRecordMysql('db_snapshots', snapshot);
      } catch (err) {
        isMysqlActive = false;
      }
    }

    const db = readDbFile();
    const snapshots = db.tp_db_snapshots || [];
    const idx = snapshots.findIndex(s => s.id === snapshot.id);
    if (idx >= 0) {
      snapshots[idx] = snapshot;
    } else {
      snapshots.push(snapshot);
    }
    db.tp_db_snapshots = snapshots;
    writeDbFile(db);

    const { hash } = await readFullDatabase();
    emitPulseUpdate('tp_db_snapshots', hash, req.headers['x-client-id']);
    res.json({ success: true, id: snapshot.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Delete snapshot
app.delete('/api/db/backups/:id', async (req, res) => {
  try {
    if (isMysqlActive) {
      try {
        await pool.execute('DELETE FROM db_snapshots WHERE id = ?', [req.params.id]);
      } catch (err) {
        isMysqlActive = false;
      }
    }

    const db = readDbFile();
    if (Array.isArray(db.tp_db_snapshots)) {
      db.tp_db_snapshots = db.tp_db_snapshots.filter(s => s.id !== req.params.id);
      writeDbFile(db);
    }

    const { hash } = await readFullDatabase();
    emitPulseUpdate('tp_db_snapshots', hash, req.headers['x-client-id']);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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

  // 1. Upsert records for standard array collections in payload
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

        if (isMysqlActive && tableName) {
          try {
            await upsertRecordMysql(tableName, item);
          } catch (_) {}
        }

        if (sqliteDb && tableName) {
          try {
            upsertRecordSqlite(tableName, item);
          } catch (_) {}
        }
      }
    }
  }

  // 2. Handle parked sale deletion if removeParkedSaleId is supplied
  if (payload.removeParkedSaleId) {
    const removeId = payload.removeParkedSaleId;
    if (Array.isArray(db.tp_parked_sales)) {
      db.tp_parked_sales = db.tp_parked_sales.filter(p => p && p.id !== removeId);
    }
    if (sqliteDb) {
      try {
        sqliteDb.prepare("DELETE FROM parked_sales WHERE id = ?").run(removeId);
      } catch (_) {}
    }
    if (isMysqlActive) {
      try {
        await pool.execute("DELETE FROM parked_sales WHERE id = ?", [removeId]);
      } catch (_) {}
    }
  }

  // 3. Process branch stock updates
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

      if (isMysqlActive) {
        try {
          await upsertRecordMysql(bsTable, updatedRecord);
        } catch (_) {}
      }

      if (sqliteDb) {
        try {
          upsertRecordSqlite(bsTable, updatedRecord);
        } catch (_) {}
      }
    }
  }

  // 4. Process product stock updates
  if (Array.isArray(payload.productUpdates) && payload.productUpdates.length > 0) {
    db.tp_products = Array.isArray(db.tp_products) ? db.tp_products : [];
    const prodTable = KEY_TO_TABLE_MAP['tp_products'] || 'products';

    for (const pUpdate of payload.productUpdates) {
      if (!pUpdate || !pUpdate.id) continue;
      const idx = db.tp_products.findIndex(p => p && p.id === pUpdate.id);
      if (idx >= 0) {
        db.tp_products[idx] = { ...db.tp_products[idx], ...pUpdate };
        if (isMysqlActive) {
          try {
            await upsertRecordMysql(prodTable, db.tp_products[idx]);
          } catch (_) {}
        }
        if (sqliteDb) {
          try {
            upsertRecordSqlite(prodTable, db.tp_products[idx]);
          } catch (_) {}
        }
      }
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

// API: Dedicated Queue-Based POS & Inventory Atomic Transaction Processor
app.post('/api/db/transaction', async (req, res) => {
  const tx = req.body;
  if (!tx || !tx.id) {
    return res.status(400).json({ success: false, error: 'Invalid transaction package payload' });
  }

  const configured = await isDatabaseConfiguredStore();
  if (configured) {
    const user = verifyAndExtractToken(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized session or token.' });
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
app.post('/api/db/delta', async (req, res) => {
  const delta = req.body;
  if (!delta || !delta.type || !delta.id) {
    return res.status(400).json({ success: false, error: 'Invalid transaction delta payload' });
  }

  if (delta.type === 'ATOMIC_TRANSACTION') {
    const configured = await isDatabaseConfiguredStore();
    if (configured) {
      const user = verifyAndExtractToken(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized session or token.' });
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
    const user = verifyAndExtractToken(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized session or token.' });
    }

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

    // Attempt MySQL execution if MySQL active
    if (isMysqlActive && tableName) {
      try {
        switch (delta.type) {
          case 'APPEND_SALE':
          case 'APPEND_SALE_ITEM':
          case 'APPEND_MOVEMENT':
          case 'APPEND_AUDIT_LOG':
          case 'APPEND_LEDGER_ENTRY':
          case 'APPEND_EXPENSE':
          case 'APPEND_ROW':
          case 'UPDATE_ROW': {
            const row = payload.row;
            if (row && tableName) {
              await upsertRecordMysql(tableName, row);
            }
            break;
          }
          case 'INCREMENT_STOCK': {
            const { id, productId, branchId, change } = payload;
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
            const { id, productId, branchId, change } = payload;
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
      } catch (mysqlErr) {
        console.warn('[Database] Delta MySQL processing error, relying on JSON fallback:', mysqlErr.message);
        isMysqlActive = false;
      }
    }

    // Process delta in JSON File DB
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
            const idx = db[key].findIndex(r => r.id === row.id);
            if (idx >= 0) {
              db[key][idx] = { ...db[key][idx], ...row };
            } else {
              db[key].push(row);
            }
            if (tableName && sqliteDb) {
              try {
                upsertRecordSqlite(tableName, row);
              } catch (_) {}
            }
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
          const { id, productId, branchId, change } = payload;
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

// API: Save key-value state
app.post('/api/db', async (req, res) => {
  const { key, value } = req.body;
  if (!key) {
    return res.status(400).json({ success: false, error: 'Key is required' });
  }

  const configured = await isDatabaseConfiguredStore();
  if (configured && key !== 'tp_bootstrap_init') {
    const user = verifyAndExtractToken(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Session token required.' });
    }

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
app.post('/api/db/bulk', async (req, res) => {
  const { data } = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ success: false, error: 'Payload object data is required' });
  }

  const isSetupPayload = Boolean(
    data.tilepoint_onboarded_setup !== undefined ||
    data.tp_bootstrap_init !== undefined ||
    data.tp_is_configured !== undefined
  );
  
  const configured = await isDatabaseConfiguredStore();
  if (configured && !isSetupPayload) {
    const user = verifyAndExtractToken(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Session token required.' });
    }
  }

  try {
    for (const key of Object.keys(data)) {
      await saveKeyToStore(key, data[key]);
    }

    const { hash } = await readFullDatabase();
    emitPulseUpdate('bulk', hash, req.headers['x-client-id']);

    res.json({ success: true, count: Object.keys(data).length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Reset / Purge database
app.post('/api/db/truncate', async (req, res) => {
  const { mode } = req.body;

  const configured = await isDatabaseConfiguredStore();
  if (configured) {
    const user = verifyAndExtractToken(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized session.' });
    }
    if (user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Forbidden: Resetting database is restricted to system administrators.' });
    }
  }

  try {
    if (isMysqlActive) {
      try {
        if (mode === 'all') {
          for (const tableName of Object.values(KEY_TO_TABLE_MAP)) {
            try { await pool.query(`TRUNCATE TABLE \`${tableName}\``); } catch (e) {}
          }
          try { await pool.query('TRUNCATE TABLE system_settings'); } catch (e) {}
          await saveKeyToMysql('tp_is_configured', 'false');
          await saveKeyToMysql('tilepoint_onboarded_setup', 'false');
        } else if (mode === 'transactions') {
          const transactionTables = [
            'purchase_orders', 'purchase_order_items', 'transmittals', 'shifts',
            'sales', 'sale_items', 'stock_movements', 'audit_logs',
            'stock_transfers', 'stock_transfer_items', 'ledger_entries',
            'branch_sales_reports', 'deliveries', 'damage_logs'
          ];
          for (const t of transactionTables) {
            try { await pool.query(`TRUNCATE TABLE \`${t}\``); } catch (e) {}
          }
          try { await pool.query('UPDATE products SET stockQuantity = 0'); } catch (e) {}
          try { await pool.query('UPDATE branch_stock SET quantity = 0'); } catch (e) {}
        }
      } catch (err) {
        isMysqlActive = false;
      }
    }

    // Always clear / adjust in SQLite, AlaSQL and File DB as well
    if (mode === 'all') {
      for (const tableName of Object.values(KEY_TO_TABLE_MAP)) {
        try { alasql(`DELETE FROM \`${tableName}\``); } catch (e) {}
        if (sqliteDb) {
          try { sqliteDb.prepare(`DELETE FROM \`${tableName}\``).run(); } catch (e) {}
        }
      }
      try { alasql('DELETE FROM `system_settings`'); } catch (e) {}
      if (sqliteDb) {
        try { sqliteDb.prepare('DELETE FROM system_settings').run(); } catch (e) {}
      }
      saveKeyToAlasql('tp_is_configured', 'false');
      saveKeyToAlasql('tilepoint_onboarded_setup', 'false');
      saveKeyToSqlite('tp_is_configured', 'false');
      saveKeyToSqlite('tilepoint_onboarded_setup', 'false');
      writeDbFile({ tp_is_configured: 'false', tilepoint_onboarded_setup: 'false' });
    } else if (mode === 'transactions') {
      const transactionTables = [
        'purchase_orders', 'purchase_order_items', 'transmittals', 'shifts',
        'sales', 'sale_items', 'stock_movements', 'audit_logs',
        'stock_transfers', 'stock_transfer_items', 'ledger_entries',
        'branch_sales_reports', 'deliveries', 'damage_logs'
      ];
      for (const t of transactionTables) {
        try { alasql(`DELETE FROM \`${t}\``); } catch (e) {}
        if (sqliteDb) {
          try { sqliteDb.prepare(`DELETE FROM \`${t}\``).run(); } catch (e) {}
        }
      }
      try { alasql('UPDATE products SET stockQuantity = 0'); } catch (e) {}
      try { alasql('UPDATE branch_stock SET quantity = 0'); } catch (e) {}
      if (sqliteDb) {
        try { sqliteDb.prepare('UPDATE products SET stockQuantity = 0').run(); } catch (e) {}
        try { sqliteDb.prepare('UPDATE branch_stock SET quantity = 0').run(); } catch (e) {}
      }

      const { db } = readFullDatabaseFromSqlite();
      writeDbFile(db);
    }

    const { hash } = await readFullDatabase();
    emitPulseUpdate('truncate', hash, req.headers['x-client-id']);

    res.json({ success: true, mode });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: SQLite Persistent Database Health & Storage Stats
app.get('/api/db/sqlite-status', (req, res) => {
  try {
    if (!sqliteDb) {
      return res.status(500).json({ success: false, error: 'SQLite database engine is not initialized' });
    }
    const stats = fs.statSync(SQLITE_DB_PATH);
    const tables = sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() || [];
    
    let totalRecords = 0;
    const tableCounts = {};
    for (const t of tables) {
      try {
        const row = sqliteDb.prepare(`SELECT COUNT(*) as cnt FROM \`${t.name}\``).get();
        tableCounts[t.name] = row ? row.cnt : 0;
        totalRecords += row ? row.cnt : 0;
      } catch (e) {
        tableCounts[t.name] = 0;
      }
    }

    res.json({
      success: true,
      engine: 'better-sqlite3',
      dbPath: SQLITE_DB_PATH,
      sizeBytes: stats.size,
      sizeFormatted: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
      totalTables: tables.length,
      totalRecords,
      tableCounts,
      journalMode: 'WAL'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Dedicated SQLite Service Endpoints for ERP Operations (better-sqlite3)
app.get('/api/sqlite/branch-stock', (req, res) => {
  try {
    if (!sqliteDb) {
      return res.status(500).json({ success: false, error: 'SQLite database not active' });
    }
    ensureSqliteTable('products');
    ensureSqliteTable('branch_stock');
    const { branchId, productId, sku, barcode, search, category, limit = 200, offset = 0 } = req.query;
    
    let sql = `
      SELECT p.*, bs.id as branchStockId, bs.quantity as branchQuantity, bs.lowStockThreshold as branchLowStockThreshold, bs.sellingPriceOverride
      FROM products p
      LEFT JOIN branch_stock bs ON (p.id = bs.productId AND bs.branchId = ?)
      WHERE p.isDeleted = 0
    `;
    const params = [branchId || 'B1'];

    if (productId) {
      sql += ' AND p.id = ?';
      params.push(productId);
    }

    if (sku) {
      sql += ' AND p.sku = ?';
      params.push(sku);
    }

    if (barcode) {
      sql += ' AND p.barcode = ?';
      params.push(barcode);
    }

    if (category && category !== 'All') {
      sql += ' AND p.category = ?';
      params.push(category);
    }

    if (search) {
      sql += ' AND (p.productName LIKE ? OR p.productCode LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY p.productName ASC LIMIT ? OFFSET ?';
    params.push(Number(limit) || 200, Number(offset) || 0);

    const rows = sqliteDb.prepare(sql).all(...params) || [];
    const parsed = rows.map(r => parseRowFromMysql('products', r));
    res.json({ success: true, count: parsed.length, data: parsed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/sqlite/sales', express.json(), (req, res) => {
  try {
    if (!sqliteDb) {
      return res.status(500).json({ success: false, error: 'SQLite database not active' });
    }
    const sale = req.body;
    if (!sale || !sale.id) {
      return res.status(400).json({ success: false, error: 'Sale record with id is required' });
    }

    const items = Array.isArray(sale.items) ? sale.items : [];
    delete sale.items;

    const saveSaleTx = sqliteDb.transaction(() => {
      upsertRecordSqlite('sales', sale);
      for (const item of items) {
        if (!item.saleId) item.saleId = sale.id;
        upsertRecordSqlite('sale_items', item);

        // Deduct inventory stock in SQLite if productId and quantity provided
        if (item.productId && item.quantity) {
          const qty = Number(item.quantity) || 0;
          if (sale.branchId) {
            const existingBs = sqliteDb.prepare('SELECT * FROM branch_stock WHERE branchId = ? AND productId = ?').get(sale.branchId, item.productId);
            if (existingBs) {
              const newQty = Math.max(0, (Number(existingBs.quantity) || 0) - qty);
              sqliteDb.prepare('UPDATE branch_stock SET quantity = ? WHERE id = ?').run(newQty, existingBs.id);
            }
          }
          const existingP = sqliteDb.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);
          if (existingP) {
            const newPQty = Math.max(0, (Number(existingP.stockQuantity) || 0) - qty);
            sqliteDb.prepare('UPDATE products SET stockQuantity = ? WHERE id = ?').run(newPQty, item.productId);
          }
        }
      }

      // Log movement to inventory_movements table
      const auditMovement = {
        id: 'MOV-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        movementType: 'SALE',
        referenceId: sale.id,
        branchId: sale.branchId || 'B1',
        performedBy: sale.cashierName || sale.cashierId || 'System',
        createdAt: new Date().toISOString(),
        details: `POS Sale ${sale.saleNumber || sale.id} - ${items.length} item(s)`
      };
      upsertRecordSqlite('inventory_movements', auditMovement);
    });

    saveSaleTx();

    const { hash } = readFullDatabaseFromSqlite();
    emitPulseUpdate('sales', hash, req.headers['x-client-id']);

    res.json({ success: true, id: sale.id, message: 'Sale log saved atomically to better-sqlite3 database' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/sqlite/audit-trails', express.json(), (req, res) => {
  try {
    if (!sqliteDb) {
      return res.status(500).json({ success: false, error: 'SQLite database not active' });
    }
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

    upsertRecordSqlite('audit_logs', auditEntry);

    res.json({ success: true, id: auditEntry.id, audit: auditEntry });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/sqlite/audit-trails', (req, res) => {
  try {
    if (!sqliteDb) {
      return res.status(500).json({ success: false, error: 'SQLite database not active' });
    }
    ensureSqliteTable('audit_logs');
    const { branchId, module, performerId, referenceId, startDate, endDate, limit = 100 } = req.query;
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

    const rows = sqliteDb.prepare(sql).all(...params) || [];
    const parsed = rows.map(r => parseRowFromMysql('audit_logs', r));
    res.json({ success: true, count: parsed.length, data: parsed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/sqlite/stock-transfers', express.json(), (req, res) => {
  try {
    if (!sqliteDb) {
      return res.status(500).json({ success: false, error: 'SQLite database not active' });
    }
    const transfer = req.body;
    if (!transfer) {
      return res.status(400).json({ success: false, error: 'Transfer payload required' });
    }

    ensureSqliteTable('stock_transfers');
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

    upsertRecordSqlite('stock_transfers', transferEntry);

    if (Array.isArray(transfer.items)) {
      ensureSqliteTable('stock_transfer_items');
      for (const item of transfer.items) {
        upsertRecordSqlite('stock_transfer_items', {
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

app.get('/api/sqlite/stock-transfers', (req, res) => {
  try {
    if (!sqliteDb) {
      return res.status(500).json({ success: false, error: 'SQLite database not active' });
    }
    ensureSqliteTable('stock_transfers');
    const { branchId, fromBranchId, toBranchId, status, startDate, endDate, limit = 100 } = req.query;
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

    const rows = sqliteDb.prepare(sql).all(...params) || [];
    const parsed = rows.map(r => parseRowFromMysql('stock_transfers', r));
    res.json({ success: true, count: parsed.length, data: parsed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Explicit static route for PWA Service Worker & Manifest
app.get('/sw.js', (req, res) => {
  const publicSw = path.join(__dirname, 'public', 'sw.js');
  if (fs.existsSync(publicSw)) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Cache-Control', 'no-cache');
    return res.sendFile(publicSw);
  }
  const distSw = path.join(__dirname, 'dist', 'sw.js');
  if (fs.existsSync(distSw)) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Cache-Control', 'no-cache');
    return res.sendFile(distSw);
  }
  return res.status(404).type('text/plain').send('Service worker file not found');
});

app.get('/manifest.json', (req, res) => {
  const publicManifest = path.join(__dirname, 'public', 'manifest.json');
  if (fs.existsSync(publicManifest)) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.sendFile(publicManifest);
  }
  const distManifest = path.join(__dirname, 'dist', 'manifest.json');
  if (fs.existsSync(distManifest)) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.sendFile(distManifest);
  }
  return res.status(404).json({ error: 'Manifest not found' });
});

// Vite middleware setup or production static files
if (process.env.NODE_ENV !== 'production') {
  console.log('[Shared DB Server] Running in DEVELOPMENT mode with Vite middleware...');
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: process.env.DISABLE_HMR !== 'true'
    },
    appType: 'spa'
  });
  app.use(vite.middlewares);
} else {
  console.log('[Shared DB Server] Running in PRODUCTION mode serving static files...');
  app.use(express.static(path.join(__dirname, 'dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Initialize AlaSQL & SQLite Persistent Database Engines
initAlasqlEngine();
initSqliteEngine();

server.listen(PORT, '0.0.0.0', async () => {
  await initDatabaseSchema();
  console.log(`========================================`);
  console.log(`   TILEPOINT SHARED DATABASE SERVER     `);
  console.log(`========================================`);
  console.log(`Server Port         : ${PORT}`);
  console.log(`Security Mode       : ${useSsl ? 'HTTPS (SSL Secured)' : 'HTTP (Standard)'}`);
  console.log(`Database Engine     : better-sqlite3 Persistent Local SQLite Engine (Primary) / MySQL Pool`);
  console.log(`Real-Time Engine    : Socket.io (db_pulse_update) + SSE`);
  console.log(`========================================`);
});
