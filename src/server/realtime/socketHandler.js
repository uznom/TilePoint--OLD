import { Server as SocketIOServer } from 'socket.io';
import { corsOptions } from '../config/serverConfig.js';
import { pool } from '../db/mysqlPool.js';
import { getIsMysqlActive, getMysqlEnforced, setStatusBroadcastCallback } from '../db/degradedStore.js';
import { computeCollectionHash } from '../services/cdcSyncService.js';
import { getCachedFullDb } from '../db/dbHelpers.js';

let io = null;
let sseClients = [];

export function getSocketIO() {
  return io;
}

export function getSseClients() {
  return sseClients;
}

export function addSseClient(client) {
  sseClients.push(client);
}

export function removeSseClient(client) {
  sseClients = sseClients.filter(c => c !== client);
}

export function notifyClients(type, info, senderClientId) {
  const payload = JSON.stringify({ type, info });
  sseClients = sseClients.filter(client => {
    if (!client || !client.res || client.res.writableEnded || client.res.destroyed) {
      return false;
    }
    if (senderClientId && client.id === senderClientId) {
      return true;
    }
    try {
      client.res.write(`data: ${payload}\n\n`);
      return true;
    } catch (e) {
      return false;
    }
  });
}

export function emitPulseUpdate(key = 'all', hash = '', senderClientId = null, collectionHash = '') {
  let colHash = collectionHash;
  const cachedDb = getCachedFullDb();
  if (!colHash && key && key !== 'all' && key !== 'delta' && key !== 'transaction' && cachedDb && cachedDb[key]) {
    colHash = computeCollectionHash(cachedDb[key]);
  }

  const payload = {
    timestamp: new Date().toISOString(),
    key: key || 'all',
    hash: hash || '',
    collectionHash: colHash || ''
  };

  if (io) {
    io.emit('db_pulse_update', payload);
  }
  notifyClients('db_update', payload, senderClientId);
}

export function initSocketServer(httpServer) {
  io = new SocketIOServer(httpServer, {
    cors: corsOptions,
    transports: ['websocket', 'polling'],
    allowUpgrades: true,
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000,
    maxHttpBufferSize: 1e8,
    path: '/socket.io/'
  });

  // WebSocket Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    if (!getIsMysqlActive() && !getMysqlEnforced()) {
      return next();
    }

    pool.query('SELECT id, role, userId FROM `active_sessions` WHERE `token` = ? AND (`expiresAt` IS NULL OR `expiresAt` > NOW())', [token])
      .then(([rows]) => {
        if (rows.length === 0) {
          return next(new Error('Authentication error: Invalid or expired token'));
        }
        socket.user = rows[0];
        next();
      })
      .catch(err => {
        console.warn('[WebSocket] Auth query failed:', err.message);
        next(new Error('Authentication error: Database error'));
      });
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected (${socket.conn.transport.name}): ${socket.id}`);
    
    socket.on('upgrade', (transport) => {
      console.log(`[Socket.io] Transport upgraded to ${transport.name} for ${socket.id}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.io] Client disconnected (${reason}): ${socket.id}`);
    });
  });

  // SSE Keep-Alive Ping (every 12 seconds)
  setInterval(() => {
    sseClients = sseClients.filter(client => {
      if (!client || !client.res || client.res.writableEnded || client.res.destroyed) {
        return false;
      }
      try {
        client.res.write(': keep-alive\n\n');
        return true;
      } catch (e) {
        return false;
      }
    });
  }, 12000);

  // Hook server status broadcast to notify both Socket.io and SSE
  setStatusBroadcastCallback((statusPayload) => {
    if (io) {
      io.emit('server_status_update', statusPayload);
    }
    notifyClients('server_status_update', statusPayload);
  });

  return io;
}
