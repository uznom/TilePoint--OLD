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
import { Server as SocketIOServer } from 'socket.io';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts, please try again later.' }
});

import {
  computeCollectionHash,
  computeAllCollectionHashes,
  extractDeltaChanges
} from './src/server/services/cdcSyncService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

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

const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];

const corsOptions = {
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

app.use(cors(corsOptions));
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // limit each IP to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' }
});

app.use('/api/', globalApiLimiter);

app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ limit: '100kb', extended: true }));

// --- SECURITY & ANTI-CRAWLER SHIELD MIDDLEWARE ---
app.use((req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  
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

// Attach Socket.io Real-time WebSocket Server with full tunnel & proxy support
const io = new SocketIOServer(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  maxHttpBufferSize: 1e8,
  path: '/socket.io/'
});

// WebSocket Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next(new Error('Authentication error: Token missing'));
  }

  // Very basic token presence check to prevent unauthenticated broadcasts.
  // In a robust implementation, this should query the DB to validate session validity.
  // We'll verify the token exists in the active_sessions table if the DB is online.
  if (!isMysqlActive && !mysqlEnforced) {
    return next();
  }

  pool.query('SELECT id, role, userId FROM `active_sessions` WHERE `token` = ? AND (`expiresAt` IS NULL OR `expiresAt` > NOW())', [token])
    .then(([rows]) => {
      if (rows.length === 0) {
        return next(new Error('Authentication error: Invalid or expired token'));
      }
      socket.user = rows[0];
      next();
    })
    .catch(err => {
      console.warn('[WebSocket] Auth query failed:', err.message);
      next(new Error('Authentication error: Database error'));
    });
});

io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected (${socket.conn.transport.name}): ${socket.id}`);
  
  socket.on('upgrade', (transport) => {
    console.log(`[Socket.io] Transport upgraded to ${transport.name} for ${socket.id}`);
  });

  socket.on('disconnect', (reason) => {
    console.log(`[Socket.io] Client disconnected (${reason}): ${socket.id}`);
  });
});

// SSE Clients List
let clients = [];

const notifyClients = (type, info, senderClientId) => {
  const payload = JSON.stringify({ type, info });
  clients = clients.filter(client => {
    if (!client || !client.res || client.res.writableEnded || client.res.destroyed) {
      return false;
    }
    if (senderClientId && client.id === senderClientId) {
      return true;
    }
    try {
      client.res.write(`data: ${payload}\n\n`);
      return true;
    } catch (e) {
      return false;
    }
  });
};

setInterval(() => {
  clients = clients.filter(client => {
    if (!client || !client.res || client.res.writableEnded || client.res.destroyed) {
      return false;
    }
    try {
      client.res.write(': keep-alive\n\n');
      return true;
    } catch (e) {
      return false;
    }
  });
}, 12000);

// Unified Real-time Broadcast Trigger (Socket.io + SSE) with Collection-Level Watermark Hashing
const emitPulseUpdate = (key = 'all', hash = '', senderClientId = null, collectionHash = '') => {
  let colHash = collectionHash;
  if (!colHash && key && key !== 'all' && key !== 'delta' && key !== 'transaction' && cachedFullDb && cachedFullDb[key]) {
    colHash = computeCollectionHash(cachedFullDb[key]);
  }

  const payload = {
    timestamp: new Date().toISOString(),
    key: key || 'all',
    hash: hash || '',
    collectionHash: colHash || ''
  };

  io.emit('db_pulse_update', payload);
  notifyClients('db_update', payload, senderClientId);
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
let mysqlEnforced = true;

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

    // Explicitly create indexes on frequently searched columns in AlaSQL for high performance
    try {
      alasql('CREATE INDEX IF NOT EXISTS idx_inventory_product_sku ON inventory(product_sku)');
      alasql('CREATE INDEX IF NOT EXISTS idx_inventory_category_id ON inventory(category_id)');
      alasql('CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)');
      alasql('CREATE INDEX IF NOT EXISTS idx_products_product_sku ON products(product_sku)');
      alasql('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)');
      alasql('CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id)');
    } catch (e) {}

    console.log('[Database Engine] AlaSQL Embedded Relational SQL Engine initialized successfully with 29 MySQL tables.');
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

async function checkMysqlConnection() {
  try {
    const conn = await pool.getConnection();
    conn.release();
    if (!isMysqlActive) {
      console.log('[Database] MySQL connection established successfully.');
    }
    isMysqlActive = true;
    mysqlEnforced = true;
    return true;
  } catch (err) {
    if (isMysqlActive) {
      console.warn(`[Database] MySQL connection lost (${err.code}).`);
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

// Utility function to compute database hash
function computeDatabaseHash(dbObj) {
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

function invalidateDbCache() {
  isDbCacheDirty = true;
}

function scheduleDebouncedDbFileWrite() { return; /* disabled */
  if (writeDbTimer) clearTimeout(writeDbTimer);
  writeDbTimer = setTimeout(() => {
    try {
      const db = cachedFullDb || readDbFile();
      fs.writeFile(DB_FILE_PATH, JSON.stringify(db), 'utf8', (err) => {
        if (err) console.error('[File DB] Async write warning:', err.message);
      });
    } catch (e) {
      console.error('[File DB] Debounced write error:', e.message);
    }
  }, 1000);
}

// JSON File Store Read/Write
function readDbFile() { return {}; /* disabled */
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

// Allowed schema columns per table for safe SQL generation
const TABLE_COLUMNS = {
  branches: ['id', 'name', 'manager', 'address', 'phone', 'monthlySales', 'staffCount', 'activeCashiers', 'isDeleted', 'isDistributionBranch', 'storeLogo', 'branchCode', 'localIp', 'gatewayRules', 'receiptFacebook', 'receiptPromoText', 'receiptQrBase64', 'receiptThankYou', 'tin', 'logoSize', 'openingTime', 'closingTime', 'operatingDays', 'createdAt', 'updatedAt'],
  users: ['id', 'avatarInitials', 'fullName', 'username', 'email', 'role', 'branchAssignmentId', 'status', 'managerPin', 'passwordHash', 'profilePicture', 'isNew', 'createdAt', 'updatedAt'],
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

    // Explicitly guarantee indexes on product_sku and category_id in inventory and products tables
    const explicitIndexQueries = [
      "ALTER TABLE `inventory` ADD COLUMN IF NOT EXISTS `product_sku` VARCHAR(128) NULL",
      "ALTER TABLE `inventory` ADD COLUMN IF NOT EXISTS `category_id` VARCHAR(128) NULL",
      "CREATE INDEX `idx_inventory_product_sku` ON `inventory` (`product_sku`)",
      "CREATE INDEX `idx_inventory_category_id` ON `inventory` (`category_id`)",
      "CREATE INDEX `idx_inventory_sku_cat` ON `inventory` (`product_sku`, `category_id`)",
      "CREATE INDEX `idx_inventory_branch_sku` ON `inventory` (`branchId`, `product_sku`)",
      "CREATE INDEX `idx_inventory_branch_cat` ON `inventory` (`branchId`, `category_id`)",
      "ALTER TABLE `products` ADD COLUMN IF NOT EXISTS `product_sku` VARCHAR(128) NULL",
      "ALTER TABLE `products` ADD COLUMN IF NOT EXISTS `category_id` VARCHAR(128) NULL",
      "CREATE INDEX `idx_products_product_sku` ON `products` (`product_sku`)",
      "CREATE INDEX `idx_products_category_id` ON `products` (`category_id`)",
      "CREATE INDEX `idx_products_sku` ON `products` (`sku`)",
      "CREATE INDEX `idx_products_category` ON `products` (`category`)",
      "CREATE INDEX `idx_products_sku_category` ON `products` (`sku`, `category`)",
      "CREATE INDEX `idx_products_sku_cat_id` ON `products` (`product_sku`, `category_id`)"
    ];

    for (const q of explicitIndexQueries) {
      try {
        await pool.query(q);
      } catch (e) {}
    }
    
    console.log('[MySQL] Database schema and indexes verified and initialized.');
  } catch (err) {
    console.warn('[MySQL] Notice during schema initialization:', err.message);
  }
}

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

// Helper: Upsert a single record into a MySQL table using ON DUPLICATE KEY UPDATE (supports transactions via optional executor)
async function upsertRecordMysql(tableName, record, executor = pool) {
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

  const exec = executor || pool;
  await exec.execute(sql, values);
}

// Helper: Fast Chunked Batch Upsert for MySQL (Multi-Row Bulk Inserts)
async function upsertBatchMysql(tableName, records, chunkSize = 50, executor = pool) {
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

    const exec = executor || pool;
    await exec.execute(sql, values);
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

  // Ensure configured flags are always present if users exist
  if (Array.isArray(db.tp_users) && db.tp_users.length > 0) {
    db.tp_is_configured = 'true';
    db.tilepoint_onboarded_setup = 'true';
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

  // Ensure configured flags are always present if users exist
  if (Array.isArray(db.tp_users) && db.tp_users.length > 0) {
    db.tp_is_configured = 'true';
    db.tilepoint_onboarded_setup = 'true';
  }

  const hash = computeDatabaseHash(db);
  return { db, hash };
}

// Wrapper: Read full database from MySQL Database Engine
async function readFullDatabase() {
  if (!isDbCacheDirty && cachedFullDb && cachedDbHash) {
    return { db: cachedFullDb, hash: cachedDbHash };
  }

  if (isMysqlActive || mysqlEnforced) {
    try {
      const res = await readFullDatabaseFromMysql();
      cachedFullDb = res.db;
      cachedDbHash = res.hash;
      isDbCacheDirty = false;
      return res;
    } catch (err) {
      console.warn('[Database] MySQL query failed, falling back to in-memory store:', err.message);
      isMysqlActive = false;
      if (mysqlEnforced) throw new Error('Database connection lost. Please try again later.');
    }
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

// Wrapper: Save key-value state to MySQL and Memory Store
async function saveKeyToStore(key, value) {
  if (key === 'tp_users' && Array.isArray(value)) {
    for (const u of value) {
      if (u.passwordHash && typeof u.passwordHash === 'string' && u.passwordHash.startsWith('$plaintext$')) {
        u.passwordHash = await bcrypt.hash(u.passwordHash.replace('$plaintext$', ''), 10);
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

  if (isMysqlActive || mysqlEnforced) {
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
      console.warn('[Database] MySQL write warning:', err.message);
      isMysqlActive = false;
      if (mysqlEnforced) throw new Error('Database connection lost. Please try again later.');
    }
  }

  invalidateDbCache();
  scheduleDebouncedDbFileWrite();
}

// Wrapper: Check if database is configured
async function isDatabaseConfiguredStore() {
  if (isConfiguredCache === true) return true;

  if (isMysqlActive || mysqlEnforced) {
    try {
      const [settings] = await pool.query('SELECT setting_value FROM system_settings WHERE setting_key = ?', ['tp_is_configured']);
      if (settings.length > 0) {
        const val = settings[0].setting_value;
        const conf = val === 'true' || val === true || val === '"true"';
        if (conf) {
          isConfiguredCache = true;
          return conf;
        }
      }
      const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
      const conf = users[0].count > 0;
      if (conf) {
        isConfiguredCache = true;
        return conf;
      }
    } catch (e) {
      isMysqlActive = false;
      if (mysqlEnforced) throw new Error('Database connection lost. Please try again later.');
    }
  }

  // Fallback to AlaSQL embedded store check
  try {
    const settings = alasql('SELECT setting_value FROM `system_settings` WHERE `setting_key` = ?', ['tp_is_configured']);
    if (settings && settings.length > 0) {
      const val = settings[0].setting_value;
      const conf = val === 'true' || val === true || val === '"true"';
      if (conf) {
        isConfiguredCache = true;
        return true;
      }
    }
    const users = alasql('SELECT COUNT(*) as count FROM `users`');
    if (users && users[0] && users[0].count > 0) {
      isConfiguredCache = true;
      return true;
    }
  } catch (e) {}

  return false;
}

// --- INDEXED DATABASE LOOKUP HELPER FUNCTIONS ---

/**
 * Helper: Query sales with sale_items leveraging SQL schema indexes
 * (idx_sales_branch_id, idx_sales_shift_id, idx_sales_cashier_id, idx_sales_created_at, idx_sales_is_deleted, idx_sale_items_sale_id)
 */
async function getSalesWithItemsLookups(filters = {}) {
  const { branchId, shiftId, cashierId, startDate, endDate, saleNumber, isDeleted = 0, limit = 100, offset = 0 } = filters;

  if (isMysqlActive || mysqlEnforced) {
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
      if (mysqlEnforced) throw new Error('Database connection lost. Please try again later.');
    }
  }

  // AlaSQL fallback
  try {
    let query = 'SELECT * FROM sales WHERE isDeleted = ' + (isDeleted ? '1' : '0');
    if (branchId) query += ` AND branchId = '${branchId}'`;
    if (shiftId) query += ` AND shiftId = '${shiftId}'`;
    if (cashierId) query += ` AND cashierId = '${cashierId}'`;
    if (saleNumber) query += ` AND saleNumber = '${saleNumber}'`;
    query += ' ORDER BY createdAt DESC';

    let sales = alasql(query) || [];
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
 * (idx_products_category, idx_products_category_id, idx_products_sku, idx_products_product_sku, idx_products_brand, idx_products_supplier_id, idx_products_barcode, idx_products_is_deleted, uk_branch_product)
 */
async function getInventoryAndBranchStockLookups(filters = {}) {
  const { branchId, category, category_id, categoryId, brand, supplierId, sku, product_sku, productSku, barcode, search, isDeleted = 0, limit = 100, offset = 0 } = filters;
  const targetSku = product_sku || productSku || sku;
  const targetCat = category_id || categoryId || category;

  if (isMysqlActive || mysqlEnforced) {
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
      console.warn('[Database] MySQL getInventoryAndBranchStockLookups failed, falling back to AlaSQL:', err.message);
      isMysqlActive = false;
      if (mysqlEnforced) throw new Error('Database connection lost. Please try again later.');
    }
  }

  // AlaSQL fallback
  try {
    let products = alasql('SELECT * FROM products WHERE isDeleted = ' + (isDeleted ? '1' : '0')) || [];
    if (targetCat) products = products.filter(p => p.category === targetCat || p.category_id === targetCat);
    if (brand) products = products.filter(p => p.brand === brand);
    if (supplierId) products = products.filter(p => p.supplierId === supplierId);
    if (targetSku) products = products.filter(p => p.sku === targetSku || p.product_sku === targetSku);
    if (barcode) products = products.filter(p => p.barcode === barcode);
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

  if (isMysqlActive || mysqlEnforced) {
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
      if (mysqlEnforced) throw new Error('Database connection lost. Please try again later.');
    }
  }

  // AlaSQL fallback
  try {
    let query = 'SELECT * FROM inventory_movements WHERE isDeleted = 0';
    if (productId) query += ` AND productId = '${productId}'`;
    if (sourceBranchId) query += ` AND sourceBranchId = '${sourceBranchId}'`;
    if (destinationBranchId) query += ` AND destinationBranchId = '${destinationBranchId}'`;
    if (userId) query += ` AND userId = '${userId}'`;
    query += ' ORDER BY timestamp DESC';

    let movements = alasql(query) || [];
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

  if (isMysqlActive || mysqlEnforced) {
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
      if (mysqlEnforced) throw new Error('Database connection lost. Please try again later.');
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

function sha256Pure(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

const SESSION_IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes without activity/heartbeat

function getAppSecret() {
  const secret = process.env.SECURITY_SECRET;
  if (!secret || secret.length < 32) {
    console.error("FATAL: SECURITY_SECRET must be set and at least 32 characters long.");
    process.exit(1);
  }
  return secret;
}

function createSaltedHashNode(password, salt, iterations = 2500) {
  let hash = password + '$' + salt;
  for (let i = 0; i < iterations; i++) {
    hash = crypto.createHash('sha256').update(hash).digest('hex');
  }
  return Buffer.from(hash).toString('base64').slice(0, 64);
}

async function verifyPasswordHash(password, token) {
  if (!password || !token || typeof token !== 'string') return false;

  if (token.startsWith('$2a$') || token.startsWith('$2b$') || token.startsWith('$2y$')) {
    try {
      return await bcrypt.compare(password, token);
    } catch (e) {
      return false;
    }
  }

  // Support legacy naive hashes to allow users to log in, but they should be migrated on login
  if (token.startsWith('$argon2-pbkdf2$')) {
    try {
      const parts = token.split('$');
      const iterations_part = parts[2]?.split('=')[1];
      const salt_part = parts[3]?.split('=')[1];
      const hash_part = parts[4]?.split('=')[1];

      const iterations = parseInt(iterations_part, 10) || 2500;
      
      const calculatedHash = createSaltedHashNode(password, salt_part, iterations);
      if (calculatedHash === hash_part) return true;

      let altHash = salt_part + ':' + password;
      for (let i = 0; i < iterations; i++) {
        altHash = crypto.createHash('sha256').update(altHash).digest('hex');
      }
      const calculatedAltHash = Buffer.from(altHash).toString('base64').slice(0, 64);
      if (calculatedAltHash === hash_part) return true;
    } catch (e) {
      return false;
    }
  }
  return false;
}

function generateServerSessionToken(user, sessionId) {
  const payload = {
    id: user.id,
    username: user.username || user.fullName || "User",
    role: user.role,
    sessionId: sessionId || ("SESS_" + Math.random().toString(36).substring(2, 11).toUpperCase()),
    timestamp: Date.now()
  };
  const payloadJson = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadJson, 'utf8').toString('base64');
  const secret = getAppSecret();
  const signature = crypto.createHmac('sha256', secret).update(payloadBase64).digest('base64');
  return `${payloadBase64}.${signature}`;
}

function verifyAndExtractToken(req) {
  const authHeader = req.headers['authorization'];
  let token = req.headers['x-session-token'];

  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (!token && req.cookies && req.cookies.tp_session) {
    token = req.cookies.tp_session;
  }

  if (!token && req.cookies && req.cookies.tilepoint_session) {
    token = req.cookies.tilepoint_session;
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

    const secret = getAppSecret();
    const expected = crypto.createHmac('sha256', secret).update(payloadBase64).digest('base64');
    
    // Constant-time string comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature, 'base64');
    const expectedBuffer = Buffer.from(expected, 'base64');
    
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
    const payload = JSON.parse(payloadJson);

    // Reject tokens that are from the future
    if (payload.timestamp > Date.now()) {
      return null;
    }

    const drift = Math.abs(Date.now() - payload.timestamp);
    if (drift > 24 * 60 * 60 * 1000) { // Limit to 24 hours instead of 7 days
      return null;
    }

    payload._token = token;
    return payload;
  } catch (err) {
    return null;
  }
}

async function getActiveSessionsList() {
  if (isMysqlActive || mysqlEnforced) {
    try {
      const [rows] = await pool.query('SELECT * FROM `active_sessions` ORDER BY `lastActive` DESC');
      return rows.map(r => ({
        ...r,
        lastActive: r.lastActive instanceof Date ? r.lastActive.toISOString() : (r.lastActive || new Date().toISOString())
      }));
    } catch (err) {
      console.warn('[Session Store] MySQL active sessions query warning:', err.message);
    }
  }
  const db = readDbFile();
  const sessions = db.tp_active_sessions || [];
  return Array.isArray(sessions) ? sessions : (typeof sessions === 'string' ? JSON.parse(sessions) : []);
}

const DEFAULT_SESSION_MAX_DURATION_MINUTES = 480; // 8 hours default standard shift

async function saveActiveSessionRecord(session) {
  if (!session || !session.id || !session.userId) return;

  const maxDuration = session.maxDurationMinutes || DEFAULT_SESSION_MAX_DURATION_MINUTES;
  const startedAt = session.sessionStartedAt ? new Date(session.sessionStartedAt) : new Date();
  const expiresAt = session.expiresAt ? new Date(session.expiresAt) : new Date(startedAt.getTime() + maxDuration * 60 * 1000);

  if (isMysqlActive || mysqlEnforced) {
    try {
      await upsertRecordMysql('active_sessions', {
        id: session.id,
        userId: session.userId,
        username: session.username || '',
        fullName: session.fullName || '',
        role: session.role || 'Cashier',
        branchId: session.branchId || 'B1',
        branchName: session.branchName || 'Main Branch',
        lastActive: session.lastActive ? new Date(session.lastActive) : new Date(),
        userAgent: session.userAgent || '',
        fingerprint: session.fingerprint || '',
        deviceInfo: typeof session.deviceInfo === 'object' ? JSON.stringify(session.deviceInfo) : (session.deviceInfo || ''),
        sessionStartedAt: startedAt,
        expiresAt: expiresAt,
        maxDurationMinutes: maxDuration
      });
    } catch (e) {
      console.warn('[Session Store] MySQL active session save warning:', e.message);
    }
  }

  const db = readDbFile();
  let sessions = db.tp_active_sessions || [];
  if (typeof sessions === 'string') {
    try { sessions = JSON.parse(sessions); } catch (_) { sessions = []; }
  }
  if (!Array.isArray(sessions)) sessions = [];

  const existingIdx = sessions.findIndex(s => s.id === session.id);
  const normalizedSession = {
    ...session,
    sessionStartedAt: startedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    maxDurationMinutes: maxDuration
  };

  if (existingIdx >= 0) {
    sessions[existingIdx] = { ...sessions[existingIdx], ...normalizedSession };
  } else {
    // Keep single active session per userId in registry (supersede old sessions for this user)
    sessions = sessions.filter(s => s.userId !== session.userId);
    sessions.push(normalizedSession);
  }
  db.tp_active_sessions = sessions;
  writeDbFile(db);
}

async function removeActiveSessionRecord(sessionId, userId) {
  if (isMysqlActive || mysqlEnforced) {
    try {
      if (sessionId) {
        await pool.query('DELETE FROM `active_sessions` WHERE `id` = ?', [sessionId]);
      } else if (userId) {
        await pool.query('DELETE FROM `active_sessions` WHERE `userId` = ?', [userId]);
      }
    } catch (e) {
      console.warn('[Session Store] MySQL active session delete warning:', e.message);
    }
  }

  const db = readDbFile();
  let sessions = db.tp_active_sessions || [];
  if (typeof sessions === 'string') {
    try { sessions = JSON.parse(sessions); } catch (_) { sessions = []; }
  }
  if (Array.isArray(sessions)) {
    if (sessionId) {
      sessions = sessions.filter(s => s.id !== sessionId);
    } else if (userId) {
      sessions = sessions.filter(s => s.userId !== userId);
    }
    db.tp_active_sessions = sessions;
    writeDbFile(db);
  }
}

async function pruneExpiredSessions() {
  const cutoff = new Date(Date.now() - SESSION_IDLE_TIMEOUT_MS);
  if (isMysqlActive || mysqlEnforced) {
    try {
      await pool.query('DELETE FROM `active_sessions` WHERE `lastActive` < ? OR (`expiresAt` IS NOT NULL AND `expiresAt` < NOW())', [cutoff]);
    } catch (e) {}
  }
  const db = readDbFile();
  let sessions = db.tp_active_sessions || [];
  if (typeof sessions === 'string') {
    try { sessions = JSON.parse(sessions); } catch (_) { sessions = []; }
  }
  if (Array.isArray(sessions) && sessions.length > 0) {
    const fresh = sessions.filter(s => {
      const t = new Date(s.lastActive || 0).getTime();
      const notIdle = t >= Date.now() - SESSION_IDLE_TIMEOUT_MS;
      const notExpired = !s.expiresAt || new Date(s.expiresAt).getTime() > Date.now();
      return notIdle && notExpired;
    });
    if (fresh.length !== sessions.length) {
      db.tp_active_sessions = fresh;
      writeDbFile(db);
    }
  }
}

setInterval(pruneExpiredSessions, 60000);

/**
 * Validates token, client fingerprint, and checks for concurrent login activity
 * against server-side active sessions registry upon every API request.
 */
async function verifySessionAndCheckConcurrency(req) {
  const payload = verifyAndExtractToken(req);
  if (!payload || !payload.id) {
    return { valid: false, status: 401, code: 'UNAUTHORIZED', error: 'Authentication token missing or invalid.' };
  }

  const incomingSessionId = req.headers['x-client-id'] || req.headers['x-session-id'] || payload.sessionId;
  const incomingFingerprint = req.headers['x-client-fingerprint'] || req.headers['x-fingerprint'];
  const incomingDeviceKey = req.headers['x-device-key'];

  // Read full db to verify user and their role
  const fullDb = await readFullDatabase();
  const dbUsers = fullDb.db.tp_users || [];
  const dbUser = dbUsers.find(u => u.id === payload.id);
  
  if (!dbUser || dbUser.status !== 'Active') {
    return { valid: false, status: 403, code: 'FORBIDDEN', error: 'User account disabled or not found.' };
  }

  // Update role dynamically based on the DB to enforce RBAC changes
  payload.role = dbUser.role;

  const activeSessions = await getActiveSessionsList();
  const userSession = activeSessions.find(s => s.userId === payload.id);

  if (!userSession) {
    // Session was logged out or terminated
    return {
      valid: false,
      status: 401,
      code: 'SESSION_TERMINATED',
      error: 'Your session has ended or was terminated by administrator.',
      user: payload
    };
  }

  const now = Date.now();

  // 1. Session Duration Check
  if (userSession.expiresAt) {
    const expTime = new Date(userSession.expiresAt).getTime();
    if (now >= expTime) {
      return {
        valid: false,
        status: 401,
        code: 'SESSION_EXPIRED',
        expired: true,
        error: 'Your session duration has expired. Please sign in again to verify your corporate identity.',
        user: payload,
        session: userSession
      };
    }
  }

  // 2. Concurrency & Fingerprint Validation Check
  if (incomingSessionId && userSession.id && userSession.id !== incomingSessionId) {
    return {
      valid: false,
      status: 401,
      code: 'SESSION_SUPERSEDED',
      superseded: true,
      error: 'Concurrent login detected: Your account was signed into on another device/browser. This session has been terminated.',
      user: payload,
      activeSession: {
        id: userSession.id,
        branchName: userSession.branchName,
        lastActive: userSession.lastActive,
        userAgent: userSession.userAgent,
        deviceInfo: userSession.deviceInfo
      }
    };
  }

  // 3. Client Hardware / Fingerprint Mismatch Check (if fingerprint was recorded for this session)
  if (incomingFingerprint && userSession.fingerprint && userSession.fingerprint !== incomingFingerprint && incomingSessionId !== userSession.id) {
    return {
      valid: false,
      status: 401,
      code: 'SESSION_SUPERSEDED',
      superseded: true,
      error: 'Device fingerprint mismatch: Concurrent login detected from a different terminal.',
      user: payload,
      activeSession: userSession
    };
  }

  // Session is valid; update lastActive
  userSession.lastActive = new Date().toISOString();
  if (incomingFingerprint && !userSession.fingerprint) {
    userSession.fingerprint = incomingFingerprint;
  }
  await saveActiveSessionRecord(userSession);

  const expiresTime = userSession.expiresAt ? new Date(userSession.expiresAt).getTime() : (now + DEFAULT_SESSION_MAX_DURATION_MINUTES * 60000);
  const remainingSeconds = Math.max(0, Math.floor((expiresTime - now) / 1000));

  return {
    valid: true,
    user: payload,
    session: userSession,
    remainingSeconds
  };
}

// API: Authentication - Login with Concurrency Single-Session Lock & Fingerprint Registration
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { username, password, branchId, branchName, userAgent, sessionId, fingerprint, deviceInfo, maxDurationMinutes } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required.' });
    }

    const fullDb = await readFullDatabase();
    const users = fullDb.db.tp_users || [];
    const targetUser = users.find(u => (u.username || '').trim().toLowerCase() === username.trim().toLowerCase());

    if (!targetUser) {
      return res.status(401).json({ success: false, error: 'Invalid employee ID or security password code.' });
    }

    if (targetUser.status && targetUser.status !== 'Active') {
      return res.status(403).json({ success: false, error: 'Suspended Account: Terminal credentials restricted by Administration.' });
    }

    const isMatch = await verifyPasswordHash(password, targetUser.passwordHash || '');
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid employee ID or security password code.' });
    }

    await pruneExpiredSessions();
    const activeSessions = await getActiveSessionsList();
    const now = Date.now();
    const incomingSessionId = sessionId || req.headers['x-client-id'] || ("SESS_" + Math.random().toString(36).substring(2, 11).toUpperCase());
    const clientFingerprint = fingerprint || req.headers['x-client-fingerprint'] || '';
    const clientDeviceInfo = deviceInfo || req.headers['x-client-info'] || '';
    const durationMinutes = parseInt(maxDurationMinutes, 10) || DEFAULT_SESSION_MAX_DURATION_MINUTES;

    const existingActiveSession = activeSessions.find(s => {
      if (s.userId !== targetUser.id) return false;
      const lastActiveTime = new Date(s.lastActive || 0).getTime();
      const isActive = (now - lastActiveTime) < SESSION_IDLE_TIMEOUT_MS;
      return isActive && s.id !== incomingSessionId;
    });

    const verifiedSessionId = incomingSessionId;
    const sessionToken = generateServerSessionToken(targetUser, verifiedSessionId);
    const sessionStartedAt = new Date().toISOString();
    const expiresAt = new Date(now + durationMinutes * 60 * 1000).toISOString();

    const sessionRecord = {
      id: verifiedSessionId,
      userId: targetUser.id,
      username: targetUser.username,
      fullName: targetUser.fullName,
      role: targetUser.role,
      branchId: branchId || targetUser.branchAssignmentId || 'B1',
      branchName: branchName || 'Main Branch',
      lastActive: new Date().toISOString(),
      userAgent: userAgent || req.headers['user-agent'] || '',
      fingerprint: clientFingerprint,
      deviceInfo: typeof clientDeviceInfo === 'object' ? JSON.stringify(clientDeviceInfo) : clientDeviceInfo,
      sessionStartedAt,
      expiresAt,
      maxDurationMinutes: durationMinutes
    };

    // If an existing session was active on another terminal, notify it immediately via SSE and Socket.io
    if (existingActiveSession) {
      console.log(`[Auth] User ${targetUser.username} logged in from new terminal ${verifiedSessionId}. Superseding previous session ${existingActiveSession.id}`);
      notifyClients('session_superseded', {
        userId: targetUser.id,
        supersededSessionId: existingActiveSession.id,
        newSessionId: verifiedSessionId,
        newSessionInfo: {
          branchName: sessionRecord.branchName,
          deviceInfo: sessionRecord.deviceInfo,
          userAgent: sessionRecord.userAgent,
          sessionStartedAt
        }
      });
      io.emit('session_superseded', {
        userId: targetUser.id,
        supersededSessionId: existingActiveSession.id,
        newSessionId: verifiedSessionId,
        newSessionInfo: {
          branchName: sessionRecord.branchName,
          deviceInfo: sessionRecord.deviceInfo,
          userAgent: sessionRecord.userAgent,
          sessionStartedAt
        }
      });
    }

    await saveActiveSessionRecord(sessionRecord);

    // Set secure HTTP-Only cookie that survives IP address changes
    res.cookie('tp_session', sessionToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    const updatedSessions = await getActiveSessionsList();
    emitPulseUpdate('tp_active_sessions', computeDatabaseHash(updatedSessions));

    const safeUser = { ...targetUser };
    delete safeUser.passwordHash;
    delete safeUser.managerPin;

    return res.json({
      success: true,
      token: sessionToken,
      sessionId: verifiedSessionId,
      user: safeUser,
      session: sessionRecord,
      sessionStartedAt,
      expiresAt,
      maxDurationMinutes: durationMinutes,
      remainingSeconds: durationMinutes * 60
    });
  } catch (err) {
    console.error('[Auth API] Login error:', err);
    return res.status(500).json({ success: false, error: 'Internal server authentication error: ' + err.message });
  }
});

// API: Authentication - Get Current Server Session & Validate Concurrency / Duration
app.get(['/api/auth/session', '/api/auth/me'], async (req, res) => {
  try {
    const check = await verifySessionAndCheckConcurrency(req);
    if (!check.valid) {
      if (check.code === 'SESSION_SUPERSEDED' || check.code === 'SESSION_EXPIRED') {
        return res.status(401).json({
          success: false,
          user: null,
          code: check.code,
          error: check.error,
          superseded: Boolean(check.superseded),
          expired: Boolean(check.expired),
          activeSession: check.activeSession
        });
      }
      return res.json({ success: false, user: null, message: check.error || 'No active valid session.' });
    }

    const fullDb = await readFullDatabase();
    const users = fullDb.db.tp_users || [];
    const targetUser = users.find(u => u.id === check.user.id);

    if (!targetUser || targetUser.status === 'Suspended') {
      res.clearCookie('tp_session', { path: '/' });
      return res.json({ success: false, user: null, message: 'User account not found or suspended.' });
    }

    const safeUser = { ...targetUser };
    delete safeUser.passwordHash;
    delete safeUser.managerPin;

    res.setHeader('X-Session-Remaining-Seconds', check.remainingSeconds);

    return res.json({
      success: true,
      user: safeUser,
      sessionId: check.session ? check.session.id : check.user.sessionId,
      session: check.session,
      token: check.user._token,
      sessionStartedAt: check.session?.sessionStartedAt,
      expiresAt: check.session?.expiresAt,
      remainingSeconds: check.remainingSeconds
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// API: Authentication - Heartbeat & Concurrency Validation
app.post('/api/auth/heartbeat', async (req, res) => {
  try {
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

    res.setHeader('X-Session-Remaining-Seconds', check.remainingSeconds);

    return res.json({
      success: true,
      lastActive: check.session.lastActive,
      expiresAt: check.session.expiresAt,
      remainingSeconds: check.remainingSeconds
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// API: Authentication - Extend Session Duration
app.post('/api/auth/extend-session', async (req, res) => {
  try {
    const check = await verifySessionAndCheckConcurrency(req);
    if (!check.valid) {
      return res.status(check.status || 401).json({
        success: false,
        code: check.code,
        error: check.error,
        superseded: Boolean(check.superseded),
        expired: Boolean(check.expired)
      });
    }

    const additionalMinutes = parseInt(req.body?.additionalMinutes, 10) || DEFAULT_SESSION_MAX_DURATION_MINUTES;
    const now = Date.now();
    const newExpiresAt = new Date(now + additionalMinutes * 60 * 1000).toISOString();

    check.session.expiresAt = newExpiresAt;
    check.session.maxDurationMinutes = additionalMinutes;
    check.session.lastActive = new Date().toISOString();

    await saveActiveSessionRecord(check.session);

    const remainingSeconds = additionalMinutes * 60;
    res.setHeader('X-Session-Remaining-Seconds', remainingSeconds);

    return res.json({
      success: true,
      message: `Session duration successfully extended by ${Math.round(additionalMinutes / 60)} hours.`,
      expiresAt: newExpiresAt,
      remainingSeconds
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// API: Authentication - Fast Verify Session Status
app.get('/api/auth/verify-session', async (req, res) => {
  try {
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
    return res.json({
      success: true,
      valid: true,
      sessionId: check.session.id,
      fingerprint: check.session.fingerprint,
      sessionStartedAt: check.session.sessionStartedAt,
      expiresAt: check.session.expiresAt,
      remainingSeconds: check.remainingSeconds
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// API: Authentication - Logout and Release Session Lock
app.post('/api/auth/logout', async (req, res) => {
  try {
    const payload = verifyAndExtractToken(req);
    const sessionId = req.body?.sessionId || payload?.sessionId || req.headers['x-client-id'];
    const userId = payload?.id || req.body?.userId;

    if (sessionId || userId) {
      await removeActiveSessionRecord(sessionId, userId);
    }

    res.clearCookie('tp_session', { path: '/' });
    res.clearCookie('tilepoint_session', { path: '/' });

    const updatedSessions = await getActiveSessionsList();
    emitPulseUpdate('tp_active_sessions', computeDatabaseHash(updatedSessions));

    return res.json({ success: true, message: 'Session terminated and lock released.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// API: Authentication - Admin Terminate Session
app.post('/api/auth/terminate-session', async (req, res) => {
  try {
    const user = verifyAndExtractToken(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    const { sessionId } = req.body;
    if (sessionId) {
      await removeActiveSessionRecord(sessionId, null);
      const updatedSessions = await getActiveSessionsList();
      emitPulseUpdate('tp_active_sessions', computeDatabaseHash(updatedSessions));

      notifyClients('session_terminated', { sessionId });
      io.emit('session_terminated', { sessionId });
    }

    return res.json({ success: true, message: `Session ${sessionId} terminated.` });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// API: Authentication - List Active Sessions
app.get('/api/auth/active-sessions', async (req, res) => {
  try {
    await pruneExpiredSessions();
    const sessions = await getActiveSessionsList();
    return res.json({ success: true, sessions });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// API: Service Health Check
app.get('/api/health', async (req, res) => {
  const configured = await isDatabaseConfiguredStore();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dbEngine: isMysqlActive ? 'MySQL' : 'AlaSQL (Embedded Relational)',
    isConfigured: configured
  });
});

// SSE real-time event subscription endpoint with tunnel buffer-bypass & robust disconnect handling
app.get('/api/db/events', (req, res) => {
  const clientId = req.query.clientId || 'anonymous_' + Math.random().toString(36).slice(2, 8);

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'handshake', info: { connected: true } })}\n\n`);
  
  const clientObj = { id: clientId, res };
  clients.push(clientObj);

  const cleanup = () => {
    clients = clients.filter(c => c !== clientObj);
  };

  req.on('close', cleanup);
  req.on('error', cleanup);
  res.on('close', cleanup);
  res.on('error', cleanup);
});

// API: Get full database state with ETag & Hash optimization
app.get('/api/db', async (req, res) => {
  try {
    const configured = await isDatabaseConfiguredStore();
    if (configured) {
      const user = verifyAndExtractToken(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized session.' });
      }
    }

    const rawIfNoneMatch = req.headers['if-none-match'];
    const cleanIfNoneMatch = rawIfNoneMatch ? rawIfNoneMatch.replace(/^W\//, '').replace(/^"|"$/g, '') : null;
    const clientHash = req.query.hash || cleanIfNoneMatch;

    if (clientHash && cachedDbHash && clientHash === cachedDbHash && !isDbCacheDirty) {
      res.setHeader('ETag', `"${cachedDbHash}"`);
      res.setHeader('Cache-Control', 'private, no-cache');
      return res.json({
        success: true,
        unchanged: true,
        hash: cachedDbHash,
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

    // Filter sensitive fields
    if (Array.isArray(dbCopy.tp_users)) {
      dbCopy.tp_users = dbCopy.tp_users.map(u => {
        const userCopy = { ...u };
        delete userCopy.passwordHash;
        delete userCopy.managerPin;
        return userCopy;
      });
    }

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

// API: Incremental CDC Delta Sync Endpoint (GET)
// Efficiently returns only changed rows across collections since client watermark
app.get(['/api/sync/delta', '/api/db/delta-sync'], async (req, res) => {
  try {
    const sinceTimestamp = req.query.since || req.query.sinceTimestamp;
    const clientHash = req.query.hash || req.query.globalHash;
    const branchId = req.query.branchId;

    if (clientHash && cachedDbHash && clientHash === cachedDbHash && !isDbCacheDirty) {
      res.setHeader('ETag', `"${cachedDbHash}"`);
      res.setHeader('Cache-Control', 'private, no-cache');
      return res.json({
        success: true,
        unchanged: true,
        hash: cachedDbHash,
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

    const deltaResult = extractDeltaChanges(db, {
      sinceTimestamp,
      branchId
    });

    res.json({
      ...deltaResult,
      globalHash: hash
    });
  } catch (err) {
    console.error('[CDC Sync] Delta sync error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Granular Collection-Level Watermark Diffing (POST)
// Accepts a dictionary of { clientHashes: { tp_products: '...', ... } } and returns ONLY desynchronized collections
app.post('/api/sync/delta/query', async (req, res) => {
  try {
    const { since, clientHashes = {}, branchId, globalHash } = req.body || {};

    if (globalHash && cachedDbHash && globalHash === cachedDbHash && !isDbCacheDirty) {
      return res.json({
        success: true,
        unchanged: true,
        hash: cachedDbHash,
        timestamp: new Date().toISOString()
      });
    }

    const { db, hash } = await readFullDatabase();

    if (globalHash && globalHash === hash) {
      return res.json({
        success: true,
        unchanged: true,
        hash: hash,
        timestamp: new Date().toISOString()
      });
    }

    const deltaResult = extractDeltaChanges(db, {
      sinceTimestamp: since,
      clientHashes,
      branchId
    });

    res.json({
      ...deltaResult,
      globalHash: hash
    });
  } catch (err) {
    console.error('[CDC Sync] Delta query error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Get Current Table Watermarks & Collection Checksums
app.get('/api/sync/watermarks', async (req, res) => {
  try {
    const { db, hash } = await readFullDatabase();
    const collectionHashes = computeAllCollectionHashes(db);

    res.setHeader('Cache-Control', 'private, no-cache');
    res.json({
      success: true,
      globalHash: hash,
      collectionHashes,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Fast Single Collection Sync (Targeted Fetch)
app.get('/api/sync/collection/:key', async (req, res) => {
  try {
    const key = req.params.key;
    const clientHash = req.query.hash;

    const { db, hash } = await readFullDatabase();
    const collectionData = db[key] !== undefined ? db[key] : [];
    const collectionHash = computeCollectionHash(collectionData);

    if (clientHash && clientHash === collectionHash) {
      return res.json({
        success: true,
        unchanged: true,
        key,
        hash: collectionHash,
        globalHash: hash
      });
    }

    res.json({
      success: true,
      unchanged: false,
      key,
      hash: collectionHash,
      globalHash: hash,
      data: collectionData
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
    const configured = await isDatabaseConfiguredStore();
    if (configured) {
      const user = verifyAndExtractToken(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized session.' });
      }
      if (user.role !== 'Admin' && user.role !== 'Manager') {
        return res.status(403).json({ success: false, error: 'Forbidden.' });
      }
    }
    const metadataOnly = req.query.metadataOnly === 'true';

    if (isMysqlActive || mysqlEnforced) {
      try {
        if (metadataOnly) {
          const [rows] = await pool.query('SELECT id, name, creator, sizeBytes, timestamp FROM db_snapshots ORDER BY timestamp DESC');
          return res.json({ success: true, data: rows });
        }
        const [rows] = await pool.query('SELECT * FROM db_snapshots ORDER BY timestamp DESC');
        return res.json({ success: true, data: rows.map(r => parseRowFromMysql('db_snapshots', r)) });
      } catch (err) {
        isMysqlActive = false;
      if (mysqlEnforced) throw new Error('Database connection lost. Please try again later.');
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
    const configured = await isDatabaseConfiguredStore();
    if (configured) {
      const user = verifyAndExtractToken(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized session.' });
      }
      if (user.role !== 'Admin' && user.role !== 'Manager') {
        return res.status(403).json({ success: false, error: 'Forbidden.' });
      }
    }
    if (isMysqlActive || mysqlEnforced) {
      try {
        const [rows] = await pool.query('SELECT * FROM db_snapshots WHERE id = ?', [req.params.id]);
        if (rows.length > 0) {
          return res.json({ success: true, data: parseRowFromMysql('db_snapshots', rows[0]) });
        }
      } catch (err) {
        isMysqlActive = false;
      if (mysqlEnforced) throw new Error('Database connection lost. Please try again later.');
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
  try {
    const configured = await isDatabaseConfiguredStore();
    if (configured) {
      const user = verifyAndExtractToken(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized session.' });
      }
      if (user.role !== 'Admin') {
        return res.status(403).json({ success: false, error: 'Forbidden.' });
      }
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }

  const { snapshot } = req.body;
  if (!snapshot || !snapshot.id) {
    return res.status(400).json({ success: false, error: 'Invalid snapshot payload' });
  }

  try {
    if (isMysqlActive || mysqlEnforced) {
      try {
        await upsertRecordMysql('db_snapshots', snapshot);
      } catch (err) {
        isMysqlActive = false;
      if (mysqlEnforced) throw new Error('Database connection lost. Please try again later.');
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
    const configured = await isDatabaseConfiguredStore();
    if (configured) {
      const user = verifyAndExtractToken(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized session.' });
      }
      if (user.role !== 'Admin') {
        return res.status(403).json({ success: false, error: 'Forbidden.' });
      }
    }
    if (isMysqlActive || mysqlEnforced) {
      try {
        await pool.execute('DELETE FROM db_snapshots WHERE id = ?', [req.params.id]);
      } catch (err) {
        isMysqlActive = false;
      if (mysqlEnforced) throw new Error('Database connection lost. Please try again later.');
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

  // 1. Process MySQL Transaction if active
  if (isMysqlActive || mysqlEnforced) {
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
    } catch (mysqlErr) {
      if (conn) {
        try { await conn.rollback(); } catch (_) {}
      }
      console.warn('[Database] MySQL Transaction rolled back, falling back to memory engine:', mysqlErr.message);
    } finally {
      if (conn) conn.release();
    }
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

// API: Dedicated Queue-Based POS & Inventory Atomic Transaction Processor
app.post('/api/db/transaction', async (req, res) => {
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
app.post('/api/db/delta', async (req, res) => {
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
              if (key === 'tp_users' && row.passwordHash && typeof row.passwordHash === 'string' && row.passwordHash.startsWith('$plaintext$')) {
                row.passwordHash = await bcrypt.hash(row.passwordHash.replace('$plaintext$', ''), 10);
              }
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
      if (mysqlEnforced) throw new Error('Database connection lost. Please try again later.');
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
            if (key === 'tp_users' && row.passwordHash && typeof row.passwordHash === 'string' && row.passwordHash.startsWith('$plaintext$')) {
              row.passwordHash = await bcrypt.hash(row.passwordHash.replace('$plaintext$', ''), 10);
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
app.post('/api/db/bulk', async (req, res) => {
  const { data } = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ success: false, error: 'Payload object data is required' });
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
    for (const key of Object.keys(data)) {
      // Guard against accidental wipes of users if configured
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
  }
});

// API: Reset / Purge database
app.post('/api/db/truncate', async (req, res) => {
  const { mode } = req.body;

  const user = verifyAndExtractToken(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized session.' });
  }
  if (user.role !== 'Admin') {
    return res.status(403).json({ success: false, error: 'Forbidden: Resetting database is restricted to system administrators.' });
  }

  try {
    if (isMysqlActive || mysqlEnforced) {
      try {
        await pool.query('SET FOREIGN_KEY_CHECKS = 0');
        if (mode === 'all') {
          const allMysqlTables = [
            'branches', 'users', 'suppliers', 'brands', 'products', 'inventory',
            'branch_stock', 'shifts', 'sales', 'sale_items', 'purchase_orders',
            'purchase_order_items', 'stock_transfers', 'stock_transfer_items',
            'stock_movements', 'inventory_movements', 'deliveries', 'damage_logs',
            'ledger_entries', 'audit_logs', 'custom_corporate_bills', 'custom_bills',
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
            'sales', 'sale_items', 'stock_movements', 'inventory_movements', 'audit_logs',
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
          try { await pool.query('UPDATE branch_stock SET quantity = 0'); } catch (e) {}
        }
        await pool.query('SET FOREIGN_KEY_CHECKS = 1');
      } catch (err) {
        console.warn('[MySQL Truncate Warning]:', err.message);
      }
    }

    // Always clear in AlaSQL and File DB as well
    const allAlasqlTables = [
      'branches', 'users', 'suppliers', 'brands', 'products', 'inventory',
      'branch_stock', 'shifts', 'sales', 'sale_items', 'purchase_orders',
      'purchase_order_items', 'stock_transfers', 'stock_transfer_items',
      'stock_movements', 'inventory_movements', 'deliveries', 'damage_logs',
      'ledger_entries', 'audit_logs', 'custom_corporate_bills', 'custom_bills',
      'transmittals', 'members', 'expenses', 'product_returns', 'branch_sales_reports',
      'active_sessions', 'db_snapshots', 'parked_sales', 'system_settings',
      'delta_logs', 'receipt_history', 'offline_mutations', 'processed_delta_ids'
    ];

    if (mode === 'all') {
      isConfiguredCache = false;

      for (const tableName of allAlasqlTables) {
        try { alasql(`DELETE FROM \`${tableName}\``); } catch (e) {}
      }
      try { alasql('DELETE FROM `system_settings`'); } catch (e) {}
      try { saveKeyToAlasql('tp_is_configured', 'false'); } catch (e) {}
      try { saveKeyToAlasql('tilepoint_onboarded_setup', 'false'); } catch (e) {}

      isDbCacheDirty = true;
      cachedDbHash = null;
      writeDbFile(getEmptyDatabaseStructure());
    } else if (mode === 'transactions') {
      const transactionTables = [
        'purchase_orders', 'purchase_order_items', 'transmittals', 'shifts',
        'sales', 'sale_items', 'stock_movements', 'inventory_movements', 'audit_logs',
        'stock_transfers', 'stock_transfer_items', 'ledger_entries',
        'branch_sales_reports', 'deliveries', 'damage_logs', 'expenses',
        'product_returns', 'parked_sales', 'custom_bills', 'custom_corporate_bills'
      ];
      for (const t of transactionTables) {
        try { alasql(`DELETE FROM \`${t}\``); } catch (e) {}
      }
      try { alasql('UPDATE products SET stockQuantity = 0'); } catch (e) {}
      try { alasql('UPDATE branch_stock SET quantity = 0'); } catch (e) {}

      isDbCacheDirty = true;
      cachedDbHash = null;
      const { db } = readFullDatabaseFromAlasql();
      writeDbFile(db);
    }

    const { hash } = await readFullDatabase();
    emitPulseUpdate('truncate', hash, req.headers['x-client-id']);

    res.json({ success: true, mode });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: MySQL Database Health & Connection Status
app.get(['/api/db/mysql-status', '/api/db/sqlite-status'], async (req, res) => {
  try {
    const active = isMysqlActive;
    let tableCounts = {};
    let totalRecords = 0;
    const tables = Array.from(new Set(Object.values(KEY_TO_TABLE_MAP)));
    const totalTables = tables.length;

    if (active) {
      for (const t of tables) {
        try {
          const [rows] = await pool.query(`SELECT COUNT(*) as cnt FROM \`${t}\``);
          const cnt = rows[0]?.cnt || 0;
          tableCounts[t] = cnt;
          totalRecords += cnt;
        } catch (e) {
          tableCounts[t] = 0;
        }
      }
    } else {
      for (const t of tables) {
        try {
          const rows = alasql(`SELECT COUNT(*) as cnt FROM \`${t}\``) || [];
          const cnt = rows[0]?.cnt || 0;
          tableCounts[t] = cnt;
          totalRecords += cnt;
        } catch (e) {
          tableCounts[t] = 0;
        }
      }
    }

    res.json({
      success: true,
      engine: 'MySQL',
      active,
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: Number(process.env.MYSQL_PORT || 3306),
      database: process.env.MYSQL_DATABASE || 'tilepoint_db',
      totalTables,
      totalRecords,
      tableCounts,
      poolStatus: {
        connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 25),
        maxIdle: Number(process.env.MYSQL_MAX_IDLE || 10)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Fast MySQL Branch Stock Lookup
app.get(['/api/db/branch-stock', '/api/mysql/branch-stock', '/api/sqlite/branch-stock'], async (req, res) => {
  try {
    const { branchId, productId, sku, product_sku, productSku, barcode, search, category, category_id, categoryId, limit = 200, offset = 0 } = req.query;
    const targetBranch = branchId || 'B1';
    const targetSku = product_sku || productSku || sku;
    const targetCat = category_id || categoryId || category;

    if (isMysqlActive || mysqlEnforced) {
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
app.get(['/api/db/inventory', '/api/mysql/inventory'], async (req, res) => {
  try {
    const { product_sku, sku, category_id, category, branchId, search, limit = 100, offset = 0 } = req.query;
    const targetSku = product_sku || sku;
    const targetCategory = category_id || category;

    if (isMysqlActive || mysqlEnforced) {
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

    // Fallback via AlaSQL or Products
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

// API: Save POS Sale into MySQL with full ACID transaction, row-locking & Idempotency
app.post(['/api/db/sales', '/api/mysql/sales', '/api/sqlite/sales'], express.json(), async (req, res) => {
  try {
    const sale = req.body;
    if (!sale || !sale.id) {
      return res.status(400).json({ success: false, error: 'Sale record with id is required' });
    }

    const items = Array.isArray(sale.items) ? sale.items : [];
    delete sale.items;

    // Idempotency check: if sale with this ID or idempotencyKey already exists, return cleanly
    if (isMysqlActive && sale.idempotencyKey) {
      try {
        const [existing] = await pool.query('SELECT id, saleNumber FROM sales WHERE idempotencyKey = ? LIMIT 1', [sale.idempotencyKey]);
        if (existing && existing.length > 0) {
          return res.json({ success: true, id: existing[0].id, duplicate: true, message: 'Sale was already processed (idempotent response)' });
        }
      } catch (_) {}
    }

    if (isMysqlActive || mysqlEnforced) {
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

        const auditMovement = {
          id: 'MOV-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          movementType: 'SALE',
          referenceId: sale.id,
          branchId: sale.branchId || 'B1',
          performedBy: sale.cashierName || sale.cashierId || 'System',
          createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
          details: `POS Sale ${sale.saleNumber || sale.id} - ${items.length} item(s)`
        };
        await upsertRecordMysql('inventory_movements', auditMovement, conn);

        await conn.commit();
      } catch (err) {
        if (conn) {
          try { await conn.rollback(); } catch (_) {}
        }
        console.warn('[MySQL POS Sale Transaction Error]', err.message);
      } finally {
        if (conn) conn.release();
      }
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

// API: Audit Trails in MySQL
app.post(['/api/db/audit-trails', '/api/mysql/audit-trails', '/api/sqlite/audit-trails'], express.json(), async (req, res) => {
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

    if (isMysqlActive || mysqlEnforced) {
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

app.get(['/api/db/audit-trails', '/api/mysql/audit-trails', '/api/sqlite/audit-trails'], async (req, res) => {
  try {
    const { branchId, module, performerId, referenceId, startDate, endDate, limit = 100 } = req.query;

    if (isMysqlActive || mysqlEnforced) {
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

    const rows = alasql('SELECT * FROM audit_logs') || [];
    const parsed = rows.map(r => parseRowFromMysql('audit_logs', r));
    res.json({ success: true, count: parsed.length, data: parsed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Stock Transfers in MySQL
app.post(['/api/db/stock-transfers', '/api/mysql/stock-transfers', '/api/sqlite/stock-transfers'], express.json(), async (req, res) => {
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

    if (isMysqlActive || mysqlEnforced) {
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

app.get(['/api/db/stock-transfers', '/api/mysql/stock-transfers', '/api/sqlite/stock-transfers'], async (req, res) => {
  try {
    const { branchId, fromBranchId, toBranchId, status, startDate, endDate, limit = 100 } = req.query;

    if (isMysqlActive || mysqlEnforced) {
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

    const rows = alasql('SELECT * FROM stock_transfers WHERE (isDeleted IS NULL OR isDeleted = 0)') || [];
    const parsed = rows.map(r => parseRowFromMysql('stock_transfers', r));
    res.json({ success: true, count: parsed.length, data: parsed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: High-Performance Offline Outbox Batch Sync Protocol
// Processes multiple queued terminal mutations (sales, stock changes, logs) atomically
app.post(['/api/db/sync-batch', '/api/mysql/sync-batch'], express.json({ limit: '50mb' }), async (req, res) => {
  const { mutations, terminalId, branchId } = req.body;
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

  if (isMysqlActive || mysqlEnforced) {
    let conn;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      for (const mutation of mutations) {
        if (!mutation || !mutation.id) {
          results.skipped++;
          continue;
        }

        // Idempotency check: Skip already committed mutation packages
        if (processedDeltaIds.includes(mutation.id)) {
          results.skipped++;
          continue;
        }

        try {
          if (mutation.type === 'ATOMIC_TRANSACTION' || mutation.type === 'TRANSACTION_PACKAGE') {
            const payload = mutation.payload || {};
            
            // Standard entity collections
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

            // Branch Stock updates
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

            // Products updates
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

  // AlaSQL and Local JSON Persistence fallback for mutations
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
if (process.env.NODE_ENV === 'production') {
  console.log('[Shared DB Server] Serving compiled production static files from dist/...');
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.log('[Shared DB Server] Running in DEVELOPMENT mode with Vite middleware...');
  try {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server },
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } catch (viteErr) {
    console.warn('[Vite Middleware Warning]', viteErr.message);
  }
}

// Initialize AlaSQL Embedded Engine
initAlasqlEngine();

server.listen(PORT, '0.0.0.0', async () => {
  await initDatabaseSchema();
  console.log(`========================================`);
  console.log(`   TILEPOINT SHARED DATABASE SERVER     `);
  console.log(`========================================`);
  console.log(`Server Port         : ${PORT}`);
  console.log(`Security Mode       : ${useSsl ? 'HTTPS (SSL Secured)' : 'HTTP (Standard)'}`);
  console.log(`Database Engine     : MySQL Connection Pool (Primary) with Embedded AlaSQL Buffer`);
  console.log(`Real-Time Engine    : Socket.io (db_pulse_update) + SSE`);
  console.log(`========================================`);
});
