import express from 'express';
import path from 'path';
import fs from 'fs';
import { ROOT_DIR, KEY_TO_TABLE_MAP } from '../config/serverConfig.js';
import { pool } from '../db/mysqlPool.js';
import { alasql } from '../db/alasqlEngine.js';
import {
  getIsMysqlActive,
  getDegradedSince,
  getLastDegradedReason,
  getDegradedWriteQueue
} from '../db/degradedStore.js';
import { isDatabaseConfiguredStore } from '../db/dbHelpers.js';
import { addSseClient, removeSseClient } from '../realtime/socketHandler.js';

const router = express.Router();

// API: Service Health Check & Degraded Engine Status
router.get(['/health', '/server/status', '/status', '/db/status'], async (req, res) => {
  const configured = await isDatabaseConfiguredStore();
  const isMysqlActive = getIsMysqlActive();
  res.json({
    status: isMysqlActive ? 'ok' : 'degraded',
    isDegraded: !isMysqlActive,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dbEngine: isMysqlActive ? 'MySQL' : 'AlaSQL (Degraded In-Memory)',
    degradedSince: getDegradedSince(),
    lastDegradedReason: getLastDegradedReason(),
    queuedWritesCount: getDegradedWriteQueue().length,
    isConfigured: configured
  });
});

// API: MySQL Database Health & Connection Status
router.get(['/db/mysql-status', '/db/sqlite-status'], async (req, res) => {
  try {
    const active = getIsMysqlActive();
    let tableCounts = {};
    let totalRecords = 0;
    const tables = Array.from(new Set(Object.values(KEY_TO_TABLE_MAP)));
    const totalTables = tables.length;

    if (active) {
      for (const t of tables) {
        try {
          const [rows] = await pool.query(`SELECT COUNT(*) as cnt FROM \`${t}\``);
          const cnt = rows[0]?.cnt || 0;
          tableCounts[t] = cnt;
          totalRecords += cnt;
        } catch (e) {
          tableCounts[t] = 0;
        }
      }
    } else {
      for (const t of tables) {
        try {
          const rows = alasql(`SELECT COUNT(*) as cnt FROM \`${t}\``) || [];
          const cnt = rows[0]?.cnt || 0;
          tableCounts[t] = cnt;
          totalRecords += cnt;
        } catch (e) {
          tableCounts[t] = 0;
        }
      }
    }

    res.json({
      success: true,
      engine: 'MySQL',
      active,
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: Number(process.env.MYSQL_PORT || 3306),
      database: process.env.MYSQL_DATABASE || 'tilepoint_db',
      totalTables,
      totalRecords,
      tableCounts,
      poolStatus: {
        connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 25),
        maxIdle: Number(process.env.MYSQL_MAX_IDLE || 10)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// SSE real-time event subscription endpoint with tunnel buffer-bypass & robust disconnect handling
router.get('/db/events', (req, res) => {
  const clientId = req.query.clientId || 'anonymous_' + Math.random().toString(36).slice(2, 8);

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'handshake', info: { connected: true } })}\n\n`);
  
  const clientObj = { id: clientId, res };
  addSseClient(clientObj);

  const cleanup = () => {
    removeSseClient(clientObj);
  };

  req.on('close', cleanup);
  req.on('error', cleanup);
  res.on('close', cleanup);
  res.on('error', cleanup);
});

// Explicit static route for PWA Service Worker
router.get('/sw.js', (req, res) => {
  const publicSw = path.join(ROOT_DIR, 'public', 'sw.js');
  if (fs.existsSync(publicSw)) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Cache-Control', 'no-cache');
    return res.sendFile(publicSw);
  }
  const distSw = path.join(ROOT_DIR, 'dist', 'sw.js');
  if (fs.existsSync(distSw)) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Cache-Control', 'no-cache');
    return res.sendFile(distSw);
  }
  return res.status(404).type('text/plain').send('Service worker file not found');
});

// Manifest route
router.get('/manifest.json', (req, res) => {
  const publicManifest = path.join(ROOT_DIR, 'public', 'manifest.json');
  if (fs.existsSync(publicManifest)) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.sendFile(publicManifest);
  }
  const distManifest = path.join(ROOT_DIR, 'dist', 'manifest.json');
  if (fs.existsSync(distManifest)) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.sendFile(distManifest);
  }
  return res.status(404).json({ error: 'Manifest not found' });
});

export default router;
