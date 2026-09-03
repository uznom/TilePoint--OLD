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
import { upsertRecordMysql } from '../../db/dbHelpers.js';

const router = express.Router();

// Branches List
router.get(['/branches', '/list/branches'], async (req, res) => {
  try {
    if (!getIsMysqlActive()) {
      const alaDb = getAlasqlDb();
      return res.json({ success: true, data: alaDb.tables.branches?.data || [] });
    }
    const [rows] = await pool.query('SELECT * FROM branches WHERE isDeleted = 0 ORDER BY name ASC');
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
      const logs = (alaDb.tables.audit_logs?.data || []).slice(-Number(limit));
      return res.json({ success: true, data: logs });
    }
    const [rows] = await pool.query('SELECT * FROM audit_logs ORDER BY createdAt DESC LIMIT ?', [Number(limit)]);
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

  const auditEntry = {
    id,
    actionCode: log.actionCode || log.action || 'SYSTEM_ACTION',
    action: log.action || log.actionCode || 'SYSTEM_ACTION',
    description: log.description || (typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '')),
    module: log.module || log.category || 'General',
    recordId: log.recordId || null,
    userId: log.userId || null,
    username: log.username || log.userName || null,
    branchId: log.branchId || null,
    createdAt
  };

  if (!getIsMysqlActive()) {
    const alaDb = getAlasqlDb();
    if (!alaDb.tables.audit_logs) alaDb.tables.audit_logs = { data: [] };
    alaDb.tables.audit_logs.data.push(auditEntry);
    saveAlasqlToDisk();
    queueDegradedWrite({ type: 'audit_log', log: auditEntry });
    return res.json({ success: true, degraded: true });
  }

  try {
    await upsertRecordMysql('audit_logs', auditEntry);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
