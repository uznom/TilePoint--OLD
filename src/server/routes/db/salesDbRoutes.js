import express from 'express';
import { pool, isConnectionError } from '../../db/mysqlPool.js';
import {
  getIsMysqlActive,
  queueDegradedWrite,
  markServerDegraded
} from '../../db/degradedStore.js';
import {
  getAlasqlDb,
  saveAlasqlToDisk
} from '../../db/alasqlEngine.js';
import { emitPulseUpdate } from '../../realtime/socketHandler.js';

const router = express.Router();

// Direct High-Performance POS Sale Submission
router.post(['/sales', '/mysql/sales', '/sqlite/sales'], express.json(), async (req, res) => {
  const sale = req.body;
  const clientId = req.headers['x-client-id'] || null;

  if (!sale || !sale.id) {
    return res.status(400).json({ success: false, error: 'Invalid sale payload. ID is required.' });
  }

  // Degraded In-Memory Mode
  if (!getIsMysqlActive()) {
    try {
      const alaDb = getAlasqlDb();
      if (!alaDb.tables.sales) alaDb.tables.sales = { data: [] };
      if (!alaDb.tables.sale_items) alaDb.tables.sale_items = { data: [] };

      const grandTotal = Number(sale.grandTotal ?? sale.totalAmount ?? 0);
      const subtotal = Number(sale.subtotal ?? (grandTotal - (Number(sale.taxAmount || 0))));
      const isVoid = sale.isVoided ? 1 : 0;
      const saleDate = sale.createdAt || new Date().toISOString();

      const existingIdx = alaDb.tables.sales.data.findIndex(s => s.id === sale.id);
      const saleRow = {
        id: sale.id,
        saleNumber: sale.saleNumber || sale.id,
        branchId: sale.branchId || 'B1',
        cashierId: sale.cashierId || 'central',
        cashierName: sale.cashierName || 'Cashier',
        shiftId: sale.shiftId || '',
        customerName: sale.customerName || 'Walk-in Customer',
        customerAddress: sale.customerAddress || '',
        customerTin: sale.customerTin || '',
        businessStyle: sale.businessStyle || '',
        subtotal,
        vat: Number(sale.taxAmount || sale.vat || 0),
        discount: Number(sale.discountTotal || sale.discountAmount || 0),
        grandTotal,
        paymentMethod: sale.paymentMethod || 'Cash',
        amountTendered: Number(sale.amountTendered || grandTotal),
        changeAmount: Number(sale.changeAmount || 0),
        notes: sale.notes || '',
        isDeleted: isVoid,
        createdAt: saleDate,
        updatedAt: saleDate
      };

      if (existingIdx >= 0) {
        alaDb.tables.sales.data[existingIdx] = saleRow;
      } else {
        alaDb.tables.sales.data.push(saleRow);
      }

      if (Array.isArray(sale.items)) {
        for (const item of sale.items) {
          const itemIdx = alaDb.tables.sale_items.data.findIndex(i => i.id === item.id);
          const itemRow = {
            id: item.id || `${sale.id}_${Math.random().toString(36).substr(2, 9)}`,
            saleId: sale.id,
            productId: item.productId,
            productName: item.productName || 'Product',
            quantity: Number(item.quantity || 1),
            unitPrice: Number(item.unitPrice || 0),
            discount: Number(item.discountAmount || 0),
            discountType: item.discountType || 'NONE',
            total: Number(item.subtotal || 0)
          };
          if (itemIdx >= 0) {
            alaDb.tables.sale_items.data[itemIdx] = itemRow;
          } else {
            alaDb.tables.sale_items.data.push(itemRow);
          }
        }
      }

      saveAlasqlToDisk();
      queueDegradedWrite({ type: 'sales_upsert', sale, id: sale.id });
      emitPulseUpdate('tp_sales', '', clientId);

      return res.json({
        success: true,
        degraded: true,
        message: 'Sale ingested into in-memory buffer (degraded mode).'
      });
    } catch (e) {
      return res.status(500).json({ success: false, error: 'Degraded sale write failed: ' + e.message });
    }
  }

  // Active MySQL Transaction Mode
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    const grandTotal = Number(sale.grandTotal ?? sale.totalAmount ?? 0);
    const subtotal = Number(sale.subtotal ?? (grandTotal - (Number(sale.taxAmount || 0))));
    const isVoid = sale.isVoided ? 1 : 0;
    const saleDate = sale.createdAt || new Date().toISOString().slice(0, 19).replace('T', ' ');
    const normalizedShiftId = (sale.shiftId && sale.shiftId !== 'NO-SHIFT-ACTIVE' && String(sale.shiftId).trim() !== '') ? String(sale.shiftId).trim() : null;

    try {
      await conn.execute(`
        INSERT INTO sales (
          id, saleNumber, branchId, cashierId, cashierName, shiftId,
          customerName, customerAddress, customerTin, businessStyle,
          subtotal, vat, discount, grandTotal, paymentMethod,
          amountTendered, changeAmount, notes, isDeleted, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          subtotal = VALUES(subtotal),
          vat = VALUES(vat),
          discount = VALUES(discount),
          grandTotal = VALUES(grandTotal),
          paymentMethod = VALUES(paymentMethod),
          amountTendered = VALUES(amountTendered),
          changeAmount = VALUES(changeAmount),
          notes = VALUES(notes),
          isDeleted = VALUES(isDeleted),
          updatedAt = VALUES(updatedAt)
      `, [
        sale.id,
        sale.saleNumber || sale.id,
        sale.branchId || 'B1',
        sale.cashierId || 'central',
        sale.cashierName || 'Cashier',
        normalizedShiftId,
        sale.customerName || 'Walk-in Customer',
        sale.customerAddress || '',
        sale.customerTin || '',
        sale.businessStyle || '',
        subtotal,
        Number(sale.taxAmount || sale.vat || 0),
        Number(sale.discountTotal || sale.discountAmount || 0),
        grandTotal,
        sale.paymentMethod || 'Cash',
        Number(sale.amountTendered || grandTotal),
        Number(sale.changeAmount || 0),
        sale.notes || '',
        isVoid,
        saleDate,
        saleDate
      ]);
    } catch (insertErr) {
      if (
        insertErr.code === 'ER_BAD_FIELD_ERROR' ||
        insertErr.errno === 1054 ||
        (insertErr.message && insertErr.message.toLowerCase().includes('unknown column'))
      ) {
        // Resilient fallback: insert without newly added optional columns
        await conn.execute(`
          INSERT INTO sales (
            id, saleNumber, branchId, cashierId, cashierName, shiftId,
            customerName, subtotal, vat, discount, grandTotal, paymentMethod,
            amountTendered, changeAmount, notes, isDeleted, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            subtotal = VALUES(subtotal),
            vat = VALUES(vat),
            discount = VALUES(discount),
            grandTotal = VALUES(grandTotal),
            paymentMethod = VALUES(paymentMethod),
            amountTendered = VALUES(amountTendered),
            changeAmount = VALUES(changeAmount),
            notes = VALUES(notes),
            isDeleted = VALUES(isDeleted),
            updatedAt = VALUES(updatedAt)
        `, [
          sale.id,
          sale.saleNumber || sale.id,
          sale.branchId || 'B1',
          sale.cashierId || 'central',
          sale.cashierName || 'Cashier',
          normalizedShiftId,
          sale.customerName || 'Walk-in Customer',
          subtotal,
          Number(sale.taxAmount || sale.vat || 0),
          Number(sale.discountTotal || sale.discountAmount || 0),
          grandTotal,
          sale.paymentMethod || 'Cash',
          Number(sale.amountTendered || grandTotal),
          Number(sale.changeAmount || 0),
          sale.notes || '',
          isVoid,
          saleDate,
          saleDate
        ]);
      } else {
        throw insertErr;
      }
    }

    if (Array.isArray(sale.items) && sale.items.length > 0) {
      for (const item of sale.items) {
        await conn.execute(`
          INSERT INTO sale_items (
            id, saleId, productId, productName, quantity, unitPrice, discount, discountType, total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            quantity = VALUES(quantity),
            unitPrice = VALUES(unitPrice),
            discount = VALUES(discount),
            total = VALUES(total)
        `, [
          item.id || `${sale.id}_${Math.random().toString(36).substr(2, 9)}`,
          sale.id,
          item.productId,
          item.productName || 'Product',
          Number(item.quantity || 1),
          Number(item.unitPrice || 0),
          Number(item.discountAmount || 0),
          item.discountType || 'NONE',
          Number(item.subtotal || 0)
        ]);
      }
    }

    await conn.commit();
    conn.release();

    emitPulseUpdate('tp_sales', '', clientId);
    res.json({ success: true, message: 'Sale recorded to MySQL successfully.' });
  } catch (err) {
    if (conn) {
      try { await conn.rollback(); } catch (_) {}
      conn.release();
    }
    if (isConnectionError(err)) {
      markServerDegraded('MySQL connection failed during sale commit: ' + err.message);
      queueDegradedWrite({ type: 'sales_upsert', sale, id: sale.id });
      return res.json({ success: true, degraded: true, message: 'Sale buffered during database disconnect.' });
    }
    res.status(500).json({ success: false, error: 'Sale record error: ' + err.message });
  }
});

// Sales Lookup
router.get('/sales/lookup', async (req, res) => {
  const { query, branchId, limit = 50 } = req.query;
  try {
    if (!getIsMysqlActive()) {
      const alaDb = getAlasqlDb();
      let data = alaDb.tables.sales?.data || [];
      if (branchId && branchId !== 'All') data = data.filter(s => s.branchId === branchId);
      if (query) {
        const q = String(query).toLowerCase();
        data = data.filter(s => (s.saleNumber || '').toLowerCase().includes(q) || (s.customerName || '').toLowerCase().includes(q));
      }
      return res.json({ success: true, data: data.slice(0, Number(limit)) });
    }

    let sql = 'SELECT * FROM sales WHERE 1=1';
    const params = [];
    if (branchId && branchId !== 'All') {
      sql += ' AND branchId = ?';
      params.push(branchId);
    }
    if (query) {
      sql += ' AND (saleNumber LIKE ? OR customerName LIKE ?)';
      params.push(`%${query}%`, `%${query}%`);
    }
    sql += ' ORDER BY createdAt DESC LIMIT ?';
    params.push(Number(limit));

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Shift Summary
router.get('/shifts/:shiftId/summary', async (req, res) => {
  const { shiftId } = req.params;
  try {
    if (!getIsMysqlActive()) {
      const alaDb = getAlasqlDb();
      const sales = (alaDb.tables.sales?.data || []).filter(s => s.shiftId === shiftId && !s.isDeleted);
      const totalSales = sales.reduce((sum, s) => sum + Number(s.grandTotal || 0), 0);
      const vatTotal = sales.reduce((sum, s) => sum + Number(s.vat || 0), 0);
      return res.json({ success: true, data: { shiftId, totalSales, vatTotal, salesCount: sales.length } });
    }

    const [rows] = await pool.query(`
      SELECT 
        COUNT(*) as salesCount,
        COALESCE(SUM(grandTotal), 0) as totalSales,
        COALESCE(SUM(vat), 0) as vatTotal
      FROM sales
      WHERE shiftId = ? AND isDeleted = 0
    `, [shiftId]);

    res.json({ success: true, data: { shiftId, ...rows[0] } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
