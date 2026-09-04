import { pool } from '../src/server/db/mysqlPool.js';

async function audit() {
  try {
    // 1. Check system_settings for stale data keys
    const [settings] = await pool.query('SELECT setting_key, LENGTH(setting_value) as val_len FROM system_settings');
    console.log('=== system_settings keys ===');
    for (const r of settings) {
      console.log('  ' + r.setting_key + ': ' + r.val_len + ' bytes');
    }

    // 2. Check row counts for all important tables
    const tables = [
      'sales', 'sale_items', 'shifts', 'stock_movements', 'inventory_movements',
      'audit_logs', 'ledger_entries', 'purchase_orders', 'purchase_order_items',
      'stock_transfers', 'stock_transfer_items', 'deliveries', 'damage_logs',
      'transmittals', 'custom_corporate_bills', 'members', 'expenses',
      'product_returns', 'branch_sales_reports', 'branches', 'users',
      'suppliers', 'brands', 'products', 'inventory', 'branch_stock', 'active_sessions'
    ];

    console.log('\n=== MySQL table row counts ===');
    for (const t of tables) {
      try {
        const [[row]] = await pool.query('SELECT COUNT(*) as cnt FROM `' + t + '`');
        console.log('  ' + t + ': ' + row.cnt + ' rows');
      } catch (e) {
        console.log('  ' + t + ': ERROR - ' + e.message);
      }
    }

    // 3. Test readFullDatabase output
    const { readFullDatabase } = await import('../src/server/db/dbHelpers.js');
    const { db, hash } = await readFullDatabase();
    
    console.log('\n=== readFullDatabase() output keys ===');
    console.log('Hash: ' + hash);
    const allKeys = Object.keys(db).sort();
    for (const k of allKeys) {
      const val = db[k];
      if (Array.isArray(val)) {
        console.log('  ' + k + ': Array[' + val.length + ']');
      } else if (typeof val === 'string') {
        console.log('  ' + k + ': "' + (val.length > 50 ? val.substring(0, 50) + '...' : val) + '"');
      } else {
        console.log('  ' + k + ': ' + typeof val);
      }
    }

    // 4. Check for key collisions: system_settings keys that shadow table data
    console.log('\n=== Potential system_settings collisions ===');
    const settingKeys = settings.map(r => r.setting_key);
    const tableKeys = Object.keys(db).filter(k => Array.isArray(db[k]));
    for (const sk of settingKeys) {
      if (tableKeys.includes(sk)) {
        console.log('  COLLISION: system_settings key "' + sk + '" shadows table data');
      }
    }

    // 5. Verify critical collections are not empty
    console.log('\n=== Critical data presence check ===');
    const criticalKeys = {
      'tp_sales': 'Sales',
      'tp_sale_items': 'Sale Items',
      'tp_shifts': 'Shifts',
      'tp_inventory_movements': 'Inventory Movements',
      'tp_movements': 'Stock Movements',
      'tp_audit_logs': 'Audit Logs',
      'tp_ledger_entries': 'Ledger Entries',
      'tp_purchase_orders': 'Purchase Orders',
      'tp_po_items': 'PO Items',
      'tp_stock_transfers': 'Stock Transfers',
      'tp_deliveries': 'Deliveries',
      'tp_damage_logs': 'Damage Logs',
      'tp_transmittals': 'Transmittals',
      'tp_custom_corporate_bills': 'Custom Bills',
      'tp_members': 'Members',
      'tp_expenses': 'Expenses',
      'tp_product_returns': 'Product Returns',
      'tp_branch_sales_reports': 'Branch Sales Reports',
    };

    for (const [key, label] of Object.entries(criticalKeys)) {
      const arr = db[key];
      if (!Array.isArray(arr)) {
        console.log('  MISSING: ' + label + ' (' + key + ') - not an array');
      } else if (arr.length === 0) {
        console.log('  EMPTY: ' + label + ' (' + key + ') - 0 items');
      } else {
        console.log('  OK: ' + label + ' (' + key + ') - ' + arr.length + ' items');
      }
    }

    // 6. Check mirror keys
    console.log('\n=== Mirror key verification ===');
    const mirrors = [
      ['tp_sales', 'sales'],
      ['tp_sale_items', 'sale_items'],
      ['tp_sale_items', 'saleItems'],
      ['tp_shifts', 'shifts'],
      ['tp_audit_logs', 'audit_logs'],
      ['tp_audit_logs', 'auditLogs'],
      ['tp_ledger_entries', 'ledger_entries'],
      ['tp_purchase_orders', 'purchase_orders'],
      ['tp_po_items', 'po_items'],
      ['tp_stock_transfers', 'stock_transfers'],
      ['tp_deliveries', 'deliveries'],
      ['tp_damage_logs', 'damage_logs'],
      ['tp_transmittals', 'transmittals'],
      ['tp_members', 'members'],
      ['tp_expenses', 'expenses'],
      ['tp_product_returns', 'product_returns'],
      ['tp_branch_sales_reports', 'branch_sales_reports'],
    ];

    for (const [src, mirror] of mirrors) {
      const srcArr = db[src];
      const mirArr = db[mirror];
      if (srcArr === mirArr) {
        console.log('  OK: ' + src + ' === ' + mirror + ' (same reference)');
      } else if (Array.isArray(srcArr) && Array.isArray(mirArr) && srcArr.length === mirArr.length) {
        console.log('  WARN: ' + src + ' ~= ' + mirror + ' (same length but different reference)');
      } else {
        const srcLen = Array.isArray(srcArr) ? srcArr.length : 'N/A';
        const mirLen = Array.isArray(mirArr) ? mirArr.length : 'N/A';
        console.log('  MISMATCH: ' + src + '[' + srcLen + '] vs ' + mirror + '[' + mirLen + ']');
      }
    }

  } catch (err) {
    console.error('Audit error:', err);
  } finally {
    process.exit(0);
  }
}

audit();
