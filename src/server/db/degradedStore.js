import fs from 'fs';
import mysql from 'mysql2/promise';
import { WAL_FILE_PATH, TABLE_COLUMNS } from '../config/serverConfig.js';
import { pool, isConnectionError, initDatabaseSchema } from './mysqlPool.js';

let isMysqlActive = false;
let mysqlEnforced = true;
let _isDegradedMode = false;
let lastDegradedReason = '';
let degradedSince = null;
let degradedWriteQueue = [];
let statusBroadcastCallback = null;

export const MAX_DEGRADED_QUEUE_SIZE = 10000;

export function setStatusBroadcastCallback(fn) {
  statusBroadcastCallback = fn;
}

export function getIsMysqlActive() {
  return isMysqlActive;
}

export function setIsMysqlActive(val) {
  isMysqlActive = Boolean(val);
}

export function getMysqlEnforced() {
  return mysqlEnforced;
}

export function getIsDegradedMode() {
  return !isMysqlActive;
}

export function getLastDegradedReason() {
  return lastDegradedReason;
}

export function getDegradedSince() {
  return degradedSince;
}

export function getDegradedWriteQueue() {
  return degradedWriteQueue;
}

export function getDegradedStatus() {
  return {
    isDegraded: !isMysqlActive,
    dbEngine: isMysqlActive ? 'MySQL' : 'AlaSQL (Degraded In-Memory)',
    degradedSince,
    lastDegradedReason,
    queuedWritesCount: degradedWriteQueue.length,
    timestamp: new Date().toISOString()
  };
}

export function broadcastServerStatus() {
  if (typeof statusBroadcastCallback === 'function') {
    statusBroadcastCallback(getDegradedStatus());
  }
}

// --- DURABLE WRITE-AHEAD LOG (WAL) DISK PERSISTENCE ---

export function loadDegradedWritesFromWal() {
  try {
    if (fs.existsSync(WAL_FILE_PATH)) {
      const content = fs.readFileSync(WAL_FILE_PATH, 'utf8');
      const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
      const loaded = [];
      for (const line of lines) {
        try {
          const op = JSON.parse(line);
          if (op && typeof op === 'object') {
            loaded.push(op);
          }
        } catch (_) {}
      }
      if (loaded.length > 0) {
        degradedWriteQueue = loaded.slice(-MAX_DEGRADED_QUEUE_SIZE);
        console.log(`[Degraded WAL] Loaded ${degradedWriteQueue.length} pending writes from ${WAL_FILE_PATH}`);
      }
    }
  } catch (err) {
    console.warn('[Degraded WAL] Notice loading write-ahead log:', err.message);
  }
}

function appendWriteToWal(op) {
  try {
    const line = JSON.stringify(op) + '\n';
    fs.appendFileSync(WAL_FILE_PATH, line, 'utf8');
  } catch (err) {
    console.warn('[Degraded WAL] Failed to append write to WAL file:', err.message);
  }
}

function syncQueueToWal() {
  try {
    if (degradedWriteQueue.length === 0) {
      if (fs.existsSync(WAL_FILE_PATH)) {
        fs.unlinkSync(WAL_FILE_PATH);
      }
    } else {
      const content = degradedWriteQueue.map(op => JSON.stringify(op)).join('\n') + '\n';
      fs.writeFileSync(WAL_FILE_PATH, content, 'utf8');
    }
  } catch (err) {
    console.warn('[Degraded WAL] Failed to sync queue to WAL file:', err.message);
  }
}

export function markServerDegraded(reason) {
  isMysqlActive = false;
  _isDegradedMode = true;
  lastDegradedReason = String(reason || 'MySQL connection unavailable');
  if (!degradedSince) {
    degradedSince = new Date().toISOString();
  }

  console.error('\n======================================================================');
  console.error(' [CRITICAL ERROR] PRIMARY DATABASE ENGINE IS OFFLINE (DEGRADED MODE)');
  console.error(` Reason: ${lastDegradedReason}`);
  console.error(` Degraded Since: ${degradedSince}`);
  console.error(` Buffered Writes in Queue: ${degradedWriteQueue.length}`);
  console.error(' Cash-handling reconciliation and sync are operating in buffered mode.');
  console.error('======================================================================\n');

  broadcastServerStatus();
}

export function markServerRecovered() {
  if (!isMysqlActive) {
    isMysqlActive = true;
    _isDegradedMode = false;
    lastDegradedReason = '';
    degradedSince = null;

    console.log('\n======================================================================');
    console.log(' [RECOVERY] PRIMARY MYSQL DATABASE CONNECTION RESTORED');
    console.log(` Replaying ${degradedWriteQueue.length} queued degraded writes...`);
    console.log('======================================================================\n');

    initDatabaseSchema().catch(err => {
      console.warn('[MySQL Schema Init] Notice on connection recovery:', err.message);
    });

    broadcastServerStatus();

    replayQueuedDegradedWrites().catch(err => {
      console.error('[Recovery Replay Error] Failed during write replay:', err);
    });
  }
}

export function queueDegradedWrite(op) {
  if (degradedWriteQueue.length >= MAX_DEGRADED_QUEUE_SIZE) {
    degradedWriteQueue.shift(); // Evict oldest to protect server memory
  }
  const writeOp = {
    ...op,
    queuedAt: new Date().toISOString()
  };
  degradedWriteQueue.push(writeOp);
  appendWriteToWal(writeOp);
  console.warn(`[Degraded Write Queued] Operation (${op.type}) on ${op.tableName || op.id || 'target'}. Total queued writes: ${degradedWriteQueue.length}`);
  broadcastServerStatus();
}

// Forward reference for replay operations
let executeReplayOpHandler = null;

export function setExecuteReplayOpHandler(fn) {
  executeReplayOpHandler = fn;
}

export async function replayQueuedDegradedWrites() {
  if (degradedWriteQueue.length === 0) {
    syncQueueToWal();
    return;
  }
  console.log(`[Replay Engine] Processing ${degradedWriteQueue.length} queued writes to MySQL...`);

  const queueCopy = [...degradedWriteQueue];
  const remaining = [];

  const allowedTables = TABLE_COLUMNS ? new Set(Object.keys(TABLE_COLUMNS)) : null;

  for (const op of queueCopy) {
    try {
      if (typeof executeReplayOpHandler === 'function') {
        await executeReplayOpHandler(op);
      } else {
        if (op.tableName && allowedTables && !allowedTables.has(op.tableName)) {
          console.error(`[Security Warning] Fallback replay skipped unwhitelisted table: "${op.tableName}"`);
          continue;
        }
        if (op.type === 'delete') {
          await pool.execute(`DELETE FROM \`${op.tableName}\` WHERE id = ?`, [op.id]);
        } else if (op.type === 'soft_delete_backup') {
          await pool.execute('UPDATE db_snapshots SET isDeleted = 1, deletedAt = NOW() WHERE id = ?', [op.id]);
        } else if (op.type === 'custom_query') {
          await pool.execute(op.sql, op.params);
        }
      }
      console.log(`  -> [Replayed Write] ${op.type} on ${op.tableName || op.id || 'record'}`);
    } catch (err) {
      if (isConnectionError(err)) {
        console.error('[Replay Aborted] Connection lost during write replay:', err.message);
        remaining.push(op);
        markServerDegraded(`Connection dropped during write replay: ${err.message}`);
        break;
      } else {
        console.error(`[Replay Query Error] Corrupted write skipped (${err.code}):`, err.message);
      }
    }
  }

  degradedWriteQueue = remaining;
  syncQueueToWal();
  console.log(`[Replay Engine] Queue replay complete. Remaining items in queue: ${degradedWriteQueue.length}`);
  broadcastServerStatus();
}

export async function checkMysqlConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    if (!isMysqlActive) {
      markServerRecovered();
    }
    return true;
  } catch (err) {
    if (err && err.code === 'ER_BAD_DB_ERROR') {
      try {
        const tempConn = await mysql.createConnection({
          host: process.env.MYSQL_HOST || '127.0.0.1',
          port: Number(process.env.MYSQL_PORT || 3306),
          user: process.env.MYSQL_USER || 'root',
          password: process.env.MYSQL_PASSWORD || ''
        });
        const targetDb = process.env.MYSQL_DATABASE || 'tilepoint_db';
        await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${targetDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await tempConn.end();
        console.log(`[MySQL Bootstrap] Auto-created database \`${targetDb}\` successfully.`);
        const retryConn = await pool.getConnection();
        await retryConn.ping();
        retryConn.release();
        if (!isMysqlActive) {
          markServerRecovered();
        }
        return true;
      } catch (autoCreateErr) {
        console.warn('[MySQL Bootstrap] Auto-create database notice:', autoCreateErr.message);
      }
    }
    if (isConnectionError(err)) {
      if (isMysqlActive) {
        markServerDegraded(`Connection check failed: ${err.message} (${err.code})`);
      }
    }
    return false;
  }
}

// Load WAL on boot
loadDegradedWritesFromWal();
