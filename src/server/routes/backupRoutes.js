import express from 'express';
import zlib from 'zlib';
import { BACKUP_SOFT_DELETE_RETENTION_MS } from '../config/serverConfig.js';
import { pool, isConnectionError } from '../db/mysqlPool.js';
import {
  getIsMysqlActive,
  getMysqlEnforced,
  markServerDegraded,
  queueDegradedWrite
} from '../db/degradedStore.js';
import {
  upsertRecordMysql,
  parseRowFromMysql,
  readDbFile,
  writeDbFile,
  readFullDatabase
} from '../db/dbHelpers.js';
import {
  verifyAndExtractToken
} from '../services/authService.js';
import {
  authenticateAdminForSnapshotUpload
} from '../middleware/authMiddleware.js';
import { emitPulseUpdate } from '../realtime/socketHandler.js';

const router = express.Router();

// API: Get backups/snapshots list (Unconditional Token Required)
router.get('/', async (req, res) => {
  try {
    const user = verifyAndExtractToken(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
    }

    const metadataOnly = req.query.metadataOnly === 'true';

    if (getIsMysqlActive() || getMysqlEnforced()) {
      try {
        if (metadataOnly) {
          const [rows] = await pool.query('SELECT id, name, creator, sizeBytes, timestamp FROM db_snapshots WHERE (isDeleted = 0 OR isDeleted IS NULL) ORDER BY timestamp DESC');
          return res.json({ success: true, data: rows });
        }
        const [rows] = await pool.query('SELECT * FROM db_snapshots WHERE (isDeleted = 0 OR isDeleted IS NULL) ORDER BY timestamp DESC');
        return res.json({ success: true, data: rows.map(r => parseRowFromMysql('db_snapshots', r)) });
      } catch (err) {
        if (isConnectionError(err)) {
          markServerDegraded(`Backup list MySQL connection error: ${err.message} (${err.code})`);
        } else {
          console.error('[Database Query Error] Backup list query error:', err.message);
        }
      }
    }

    const db = readDbFile();
    const snapshots = (db.tp_db_snapshots || []).filter(s => !s.isDeleted);
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

// API: Get single full snapshot details (Unconditional Token Required)
router.get('/:id', async (req, res) => {
  try {
    const user = verifyAndExtractToken(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
    }

    if (getIsMysqlActive() || getMysqlEnforced()) {
      try {
        const [rows] = await pool.query('SELECT * FROM db_snapshots WHERE id = ? AND (isDeleted = 0 OR isDeleted IS NULL)', [req.params.id]);
        if (rows.length > 0) {
          return res.json({ success: true, data: parseRowFromMysql('db_snapshots', rows[0]) });
        }
      } catch (err) {
        if (isConnectionError(err)) {
          markServerDegraded(`Backup detail MySQL connection error: ${err.message} (${err.code})`);
        } else {
          console.error('[Database Query Error] Backup detail query error:', err.message);
        }
      }
    }

    const db = readDbFile();
    const snapshots = (db.tp_db_snapshots || []).filter(s => !s.isDeleted);
    const found = snapshots.find(s => s.id === req.params.id);
    if (!found) {
      return res.status(404).json({ success: false, error: 'Snapshot not found' });
    }
    res.json({ success: true, data: found });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Save heavy snapshot (Authenticated Admin First, then 50mb Body Parser)
router.post(
  ['/', '/mysql/snapshots', '/sqlite/snapshots'],
  authenticateAdminForSnapshotUpload,
  express.json({ limit: '50mb' }),
  async (req, res) => {
    let { snapshot } = req.body || {};
    
    // Support compressed gzip backup payloads if uploaded as base64 string
    if (snapshot && snapshot.compressedData && typeof snapshot.compressedData === 'string') {
      try {
        const buffer = Buffer.from(snapshot.compressedData, 'base64');
        const decompressed = zlib.gunzipSync(buffer).toString('utf8');
        snapshot.data = JSON.parse(decompressed);
        delete snapshot.compressedData;
      } catch (e) {
        console.warn('[Backup Upload] Notice decompressing gzip payload:', e.message);
      }
    }

    if (!snapshot || !snapshot.id) {
      return res.status(400).json({ success: false, error: 'Invalid snapshot payload' });
    }

    try {
      const snapshotRecord = {
        ...snapshot,
        isDeleted: 0,
        deletedAt: null
      };

      if (getIsMysqlActive() || getMysqlEnforced()) {
        try {
          await upsertRecordMysql('db_snapshots', snapshotRecord);
        } catch (err) {
          if (isConnectionError(err)) {
            markServerDegraded(`Backup write MySQL connection error: ${err.message} (${err.code})`);
            queueDegradedWrite({ type: 'upsert', tableName: 'db_snapshots', record: snapshotRecord });
          } else {
            console.error('[Database Query Error] Backup write query error:', err.message);
          }
        }
      }

      const db = readDbFile();
      const snapshots = db.tp_db_snapshots || [];
      const idx = snapshots.findIndex(s => s.id === snapshot.id);
      if (idx >= 0) {
        snapshots[idx] = { ...snapshotRecord, isDeleted: false, deletedAt: null };
      } else {
        snapshots.push({ ...snapshotRecord, isDeleted: false, deletedAt: null });
      }
      db.tp_db_snapshots = snapshots;
      writeDbFile(db);

      const { hash } = await readFullDatabase();
      emitPulseUpdate('tp_db_snapshots', hash, req.headers['x-client-id']);
      res.json({ success: true, id: snapshot.id });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// API: Delete snapshot (Soft Deletion - Unconditional Token Required, Admin Restricted)
router.delete('/:id', async (req, res) => {
  try {
    const user = verifyAndExtractToken(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
    }
    if (user.role !== 'Admin' && user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden: Admin role required to delete database backups.' });
    }

    const nowIso = new Date().toISOString();

    if (getIsMysqlActive() || getMysqlEnforced()) {
      try {
        await pool.execute('UPDATE db_snapshots SET isDeleted = 1, deletedAt = NOW() WHERE id = ?', [req.params.id]);
      } catch (err) {
        if (isConnectionError(err)) {
          markServerDegraded(`Backup delete MySQL connection error: ${err.message} (${err.code})`);
          queueDegradedWrite({ type: 'soft_delete_backup', id: req.params.id });
        } else {
          console.error('[Database Query Error] Backup delete query error:', err.message);
        }
      }
    }

    const db = readDbFile();
    if (Array.isArray(db.tp_db_snapshots)) {
      db.tp_db_snapshots = db.tp_db_snapshots.map(s => {
        if (s.id === req.params.id) {
          return { ...s, isDeleted: true, deletedAt: nowIso };
        }
        return s;
      });
      writeDbFile(db);
    }

    const { hash } = await readFullDatabase();
    emitPulseUpdate('tp_db_snapshots', hash, req.headers['x-client-id']);
    res.json({ success: true, message: 'Backup soft-deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Scheduled Sweeper: Purge expired soft-deleted backups after retention window (7 days)
async function sweepSoftDeletedBackups() {
  try {
    const cutoffDate = new Date(Date.now() - BACKUP_SOFT_DELETE_RETENTION_MS);
    if (getIsMysqlActive() || getMysqlEnforced()) {
      try {
        await pool.execute('DELETE FROM db_snapshots WHERE isDeleted = 1 AND deletedAt IS NOT NULL AND deletedAt < ?', [cutoffDate]);
      } catch (err) {
        console.warn('[Backup Sweeper] MySQL sweep warning:', err.message);
      }
    }
    const db = readDbFile();
    if (Array.isArray(db.tp_db_snapshots)) {
      const beforeCount = db.tp_db_snapshots.length;
      db.tp_db_snapshots = db.tp_db_snapshots.filter(s => {
        if (!s.isDeleted) return true;
        if (!s.deletedAt) return true;
        return new Date(s.deletedAt).getTime() >= cutoffDate.getTime();
      });
      if (db.tp_db_snapshots.length !== beforeCount) {
        writeDbFile(db);
      }
    }
  } catch (sweepErr) {
    console.warn('[Backup Sweeper] Scheduled sweep failed:', sweepErr.message);
  }
}

setInterval(sweepSoftDeletedBackups, 24 * 60 * 60 * 1000);

export default router;
