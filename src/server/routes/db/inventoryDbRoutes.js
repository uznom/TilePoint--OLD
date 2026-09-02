import express from 'express';
import { pool } from '../../db/mysqlPool.js';
import { getIsMysqlActive } from '../../db/degradedStore.js';
import { getAlasqlDb } from '../../db/alasqlEngine.js';

const router = express.Router();

// Branch Stock Read
router.get(['/branch-stock', '/mysql/branch-stock', '/sqlite/branch-stock'], async (req, res) => {
  const { branchId } = req.query;
  try {
    if (!getIsMysqlActive()) {
      const alaDb = getAlasqlDb();
      let data = alaDb.tables.tp_branch_stock?.data || [];
      if (branchId && branchId !== 'All') data = data.filter(s => s.branchId === branchId);
      return res.json({ success: true, data });
    }

    let sql = 'SELECT * FROM tp_branch_stock';
    const params = [];
    if (branchId && branchId !== 'All') {
      sql += ' WHERE branchId = ?';
      params.push(branchId);
    }
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Inventory Lookup
router.get(['/inventory', '/mysql/inventory'], async (req, res) => {
  const { search, limit = 100 } = req.query;
  try {
    if (!getIsMysqlActive()) {
      const alaDb = getAlasqlDb();
      let data = alaDb.tables.tp_products?.data || [];
      if (search) {
        const q = String(search).toLowerCase();
        data = data.filter(p => (p.productName || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q));
      }
      return res.json({ success: true, data: data.slice(0, Number(limit)) });
    }

    let sql = 'SELECT * FROM tp_products WHERE isDeleted = 0';
    const params = [];
    if (search) {
      sql += ' AND (productName LIKE ? OR sku LIKE ? OR barcode LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY productName ASC LIMIT ?';
    params.push(Number(limit));

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Stock Transfers
router.get(['/stock-transfers', '/mysql/stock-transfers', '/sqlite/stock-transfers'], async (req, res) => {
  try {
    if (!getIsMysqlActive()) {
      const alaDb = getAlasqlDb();
      return res.json({ success: true, data: alaDb.tables.tp_stock_transfers?.data || [] });
    }
    const [rows] = await pool.query('SELECT * FROM tp_stock_transfers ORDER BY createdAt DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
