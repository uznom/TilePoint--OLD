import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { ROOT_DIR } from '../config/serverConfig.js';

export const CONNECTION_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'PROTOCOL_CONNECTION_LOST',
  'ER_CON_COUNT_ERROR',
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ER_ACCESS_DENIED_ERROR',
  'ER_NOT_SUPPORTED_AUTH_MODE',
  'ER_HOST_NOT_PRIVILEGED',
  'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
  'PROTOCOL_ENQUEUE_HANDSHAKE_TWICE',
  'PROTOCOL_PACKETS_OUT_OF_ORDER',
  'PROTOCOL_SEQUENCE_TIMEOUT',
  'ER_SERVER_SHUTDOWN',
  'ER_NEW_ABORTING_CONNECTION',
  'ER_NET_READ_ERROR',
  'ER_NET_WRITE_ERROR',
  'ER_NET_TIMEOUT',
  'ER_CONNECTION_KILLED',
  'ER_INTERNAL_ERROR'
]);

export function isConnectionError(err) {
  if (!err) return false;
  if (err.fatal === true) return true;
  if (err.code && (CONNECTION_ERROR_CODES.has(err.code) || String(err.code).startsWith('PROTOCOL_'))) {
    return true;
  }
  const msg = String(err.message || '').toLowerCase();
  if (
    msg.includes('connection lost') ||
    msg.includes('connect econnrefused') ||
    msg.includes('closed connection') ||
    msg.includes('socket has been ended') ||
    msg.includes('server shutdown') ||
    msg.includes('pool is closed') ||
    msg.includes('cannot enqueue')
  ) {
    return true;
  }
  return false;
}

export const pool = mysql.createPool({
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
  namedPlaceholders: true,
  timezone: '+00:00',
  dateStrings: true
});

// Initialize database schema tables if MySQL is available
export async function initDatabaseSchema() {
  try {
    const schemaPath = path.join(ROOT_DIR, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sqlContent = fs.readFileSync(schemaPath, 'utf8');
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.toLowerCase().startsWith('create database') && !s.toLowerCase().startsWith('use '));
      
      const benignCodes = new Set(['ER_TABLE_EXISTS_ERROR', 'ER_DUP_FIELDNAME', 'ER_DUP_KEYNAME']);
      for (const stmt of statements) {
        try {
          await pool.query(stmt);
        } catch (e) {
          if (!benignCodes.has(e.code)) {
            console.warn(`[MySQL Schema Warning] Statement failed (${e.code || 'UNKNOWN'}):`, e.message);
          }
        }
      }
    }
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`system_settings\` (
        \`setting_key\` VARCHAR(191) NOT NULL,
        \`setting_value\` LONGTEXT NULL,
        PRIMARY KEY (\`setting_key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`active_sessions\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`userId\` VARCHAR(191) NOT NULL,
        \`username\` VARCHAR(191) NULL,
        \`fullName\` VARCHAR(191) NULL,
        \`role\` VARCHAR(64) NULL,
        \`branchId\` VARCHAR(191) NULL,
        \`branchName\` VARCHAR(191) NULL,
        \`lastActive\` DATETIME NULL,
        \`userAgent\` TEXT NULL,
        \`fingerprint\` VARCHAR(191) NULL,
        \`deviceInfo\` TEXT NULL,
        \`sessionStartedAt\` DATETIME NULL,
        \`expiresAt\` DATETIME NULL,
        \`maxDurationMinutes\` INT NULL DEFAULT 480,
        PRIMARY KEY (\`id\`),
        KEY \`idx_sessions_userId\` (\`userId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Resilient schema migrations and index guarantees
    const ensureColumn = async (table, column, definition) => {
      try {
        await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
      } catch (e) {
        if (e.code !== 'ER_DUP_FIELDNAME' && e.errno !== 1060) {
          console.debug(`[MySQL Schema Notice] Column check on ${table}.${column}:`, e.message);
        }
      }
    };

    const ensureIndex = async (table, indexName, indexCols) => {
      try {
        await pool.query(`CREATE INDEX \`${indexName}\` ON \`${table}\` (${indexCols})`);
      } catch (e) {
        if (e.code !== 'ER_DUP_KEYNAME' && e.errno !== 1061) {
          console.debug(`[MySQL Schema Notice] Index check on ${table}.${indexName}:`, e.message);
        }
      }
    };

    const modifyColumn = async (table, column, definition) => {
      try {
        await pool.query(`ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` ${definition}`);
      } catch (e) {
        console.debug(`[MySQL Schema Notice] Column modify on ${table}.${column}:`, e.message);
      }
    };

    // Columns guarantee across all supported MySQL versions
    await ensureColumn('inventory', 'product_sku', 'VARCHAR(128) NULL');
    await ensureColumn('inventory', 'category_id', 'VARCHAR(128) NULL');
    await ensureColumn('products', 'product_sku', 'VARCHAR(128) NULL');
    await ensureColumn('products', 'category_id', 'VARCHAR(128) NULL');
    await ensureColumn('users', 'mustResetPassword', 'TINYINT(1) NOT NULL DEFAULT 1');
    await ensureColumn('sales', 'customerAddress', 'TEXT NULL');
    await ensureColumn('sales', 'customerTin', 'VARCHAR(100) NULL');
    await ensureColumn('sales', 'businessStyle', 'VARCHAR(255) NULL');
    await ensureColumn('sale_items', 'discount', 'DECIMAL(14, 2) NOT NULL DEFAULT 0.00');
    await ensureColumn('sale_items', 'discountType', 'VARCHAR(64) NULL');

    // Column constraints and type alignments
    await modifyColumn('sales', 'shiftId', 'VARCHAR(64) NULL');
    await modifyColumn('sales', 'cashierId', 'VARCHAR(64) NULL');
    await modifyColumn('sales', 'cashierName', 'VARCHAR(191) NULL');
    await modifyColumn('purchase_orders', 'supplierId', 'VARCHAR(64) NULL');
    await modifyColumn('active_sessions', 'branchId', 'VARCHAR(191) NULL');
    await modifyColumn('active_sessions', 'branchName', 'VARCHAR(191) NULL');
    await modifyColumn('active_sessions', 'username', 'VARCHAR(191) NULL');
    await modifyColumn('active_sessions', 'fullName', 'VARCHAR(191) NULL');
    await modifyColumn('active_sessions', 'role', 'VARCHAR(64) NULL');

    // Index optimizations
    await ensureIndex('inventory', 'idx_inventory_product_sku', '`product_sku`');
    await ensureIndex('inventory', 'idx_inventory_category_id', '`category_id`');
    await ensureIndex('inventory', 'idx_inventory_sku_cat', '`product_sku`, `category_id`');
    await ensureIndex('inventory', 'idx_inventory_branch_sku', '`branchId`, `product_sku`');
    await ensureIndex('inventory', 'idx_inventory_branch_cat', '`branchId`, `category_id`');
    await ensureIndex('products', 'idx_products_product_sku', '`product_sku`');
    await ensureIndex('products', 'idx_products_category_id', '`category_id`');
    await ensureIndex('products', 'idx_products_sku', '`sku`');
    await ensureIndex('products', 'idx_products_category', '`category`');
    await ensureIndex('products', 'idx_products_sku_category', '`sku`, `category`');
    await ensureIndex('products', 'idx_products_sku_cat_id', '`product_sku`, `category_id`');
    
    console.log('[MySQL] Database schema and indexes verified and initialized.');
  } catch (err) {
    console.warn('[MySQL] Notice during schema initialization:', err.message);
  }
}
