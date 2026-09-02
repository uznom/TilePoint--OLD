import express from 'express';
import { pool } from '../../db/mysqlPool.js';
import {
  getIsMysqlActive,
  queueDegradedWrite
} from '../../db/degradedStore.js';
import {
  getAlasqlDb,
  saveAlasqlToDisk
} from '../../db/alasqlEngine.js';

const router = express.Router();

// Branches List
router.get(['/branches', '/list/branches'], async (req, res) => {
  try {
    if (!getIsMysqlActive()) {
      const alaDb = getAlasqlDb();
      return res.json({ success: true, data: alaDb.tables.tp_branches?.data || [] });
    }
    const [rows] = await pool.query('SELECT * FROM tp_branches WHERE isDeleted = 0 ORDER BY name ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Audit Trails
router.get(['/audit-trails', '/mysql/audit-trails', '/sqlite/audit-trails'], async (req, res) => {
  const { limit = 100 } = req.query;
  try {
    if (!getIsMysqlActive()) {
      const alaDb = getAlasqlDb();
      const logs = (alaDb.tables.tp_audit_logs?.data || []).slice(-Number(limit));
      return res.json({ success: true, data: logs });
    }
    const [rows] = await pool.query('SELECT * FROM tp_audit_logs ORDER BY createdAt DESC LIMIT ?', [Number(limit)]);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post(['/audit-trails', '/mysql/audit-trails', '/sqlite/audit-trails'], express.json(), async (req, res) => {
  const log = req.body;
  if (!log) return res.status(400).json({ success: false, error: 'Audit log body is required' });

  const id = log.id || `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const createdAt = log.createdAt || new Date().toISOString();

  if (!getIsMysqlActive()) {
    const alaDb = getAlasqlDb();
    if (!alaDb.tables.tp_audit_logs) alaDb.tables.tp_audit_logs = { data: [] };
    alaDb.tables.tp_audit_logs.data.push({ ...log, id, createdAt });
    saveAlasqlToDisk();
    queueDegradedWrite({ type: 'audit_log', log: { ...log, id, createdAt } });
    return res.json({ success: true, degraded: true });
  }

  try {
    await pool.execute(`
      INSERT INTO tp_audit_logs (id, action, details, category, recordId, userId, branchId, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      log.action || 'SYSTEM_ACTION',
      typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || ''),
      log.category || 'General',
      log.recordId || null,
      log.userId || null,
      log.branchId || null,
      createdAt
    ]);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
