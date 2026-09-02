import alasql from 'alasql';
import fs from 'fs';
import { KEY_TO_TABLE_MAP, TABLE_COLUMNS, DB_FILE_PATH } from '../config/serverConfig.js';

// Initialize AlaSQL MySQL-compatible embedded SQL Engine
export function initAlasqlEngine() {
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

export function upsertRecordAlasql(tableName, record) {
  if (!record || typeof record !== 'object') return;
  const allowed = TABLE_COLUMNS[tableName];
  if (!allowed) return;

  try {
    if (!alasql.tables || !alasql.tables[tableName]) {
      initAlasqlEngine();
    }
  } catch (_) {}

  try {
    if (record.id) {
      alasql(`DELETE FROM \`${tableName}\` WHERE id = ?`, [record.id]);
    }
  } catch (_) {}

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

export function getAlasqlDb() {
  return alasql;
}

export function alasqlExecute(sql, params = []) {
  return alasql(sql, params);
}

export function saveAlasqlToDisk() {
  try {
    const data = {};
    for (const [key, tableName] of Object.entries(KEY_TO_TABLE_MAP)) {
      if (alasql.tables && alasql.tables[tableName]) {
        data[key] = alasql(`SELECT * FROM \`${tableName}\``) || [];
      }
    }
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('[AlaSQL] Error saving to disk:', err.message);
  }
}

export { alasql };
