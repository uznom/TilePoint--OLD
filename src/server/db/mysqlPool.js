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
      "CREATE INDEX `idx_products_sku_cat_id` ON `products` (`product_sku`, `category_id`)",
      "ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `mustResetPassword` TINYINT(1) NOT NULL DEFAULT 1",
      "ALTER TABLE `sales` MODIFY COLUMN `shiftId` VARCHAR(64) NULL",
      "ALTER TABLE `sales` MODIFY COLUMN `cashierId` VARCHAR(64) NULL",
      "ALTER TABLE `sales` MODIFY COLUMN `cashierName` VARCHAR(191) NULL",
      "ALTER TABLE `purchase_orders` MODIFY COLUMN `supplierId` VARCHAR(64) NULL",
      "ALTER TABLE `active_sessions` MODIFY COLUMN `branchId` VARCHAR(191) NULL",
      "ALTER TABLE `active_sessions` MODIFY COLUMN `branchName` VARCHAR(191) NULL",
      "ALTER TABLE `active_sessions` MODIFY COLUMN `username` VARCHAR(191) NULL",
      "ALTER TABLE `active_sessions` MODIFY COLUMN `fullName` VARCHAR(191) NULL",
      "ALTER TABLE `active_sessions` MODIFY COLUMN `role` VARCHAR(64) NULL"
    ];

    const indexBenignCodes = new Set(['ER_DUP_KEYNAME', 'ER_DUP_FIELDNAME', 'ER_CANT_DROP_FIELD_OR_KEY', 'ER_PARSE_ERROR']);
    for (const q of explicitIndexQueries) {
      try {
        await pool.query(q);
      } catch (e) {
        if (!indexBenignCodes.has(e.code)) {
          console.debug(`[MySQL Schema Notice] Index query skipped (${e.code || 'UNKNOWN'}):`, e.message);
        }
      }
    }
    
    console.log('[MySQL] Database schema and indexes verified and initialized.');
  } catch (err) {
    console.warn('[MySQL] Notice during schema initialization:', err.message);
  }
}
