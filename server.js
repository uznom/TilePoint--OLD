import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import http from 'http';
import https from 'https';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import {
  PORT,
  useSsl,
  sslOptions,
  corsOptions,
  ROOT_DIR
} from './src/server/config/serverConfig.js';
import {
  globalApiLimiter,
  bodyParserMiddleware,
  antiCrawlerMiddleware
} from './src/server/middleware/authMiddleware.js';
import { initDatabaseSchema, pool } from './src/server/db/mysqlPool.js';
import { initAlasqlEngine } from './src/server/db/alasqlEngine.js';
import { checkMysqlConnection } from './src/server/db/degradedStore.js';
import {
  invalidateAllSessionsOnBoot,
  enforceGlobalCompromisedPasswordReset
} from './src/server/services/authService.js';
import { initSocketServer } from './src/server/realtime/socketHandler.js';

import authRoutes from './src/server/routes/authRoutes.js';
import syncRoutes from './src/server/routes/syncRoutes.js';
import backupRoutes from './src/server/routes/backupRoutes.js';
import dbRoutes from './src/server/routes/dbRoutes.js';
import systemRoutes from './src/server/routes/systemRoutes.js';

const app = express();

app.use(cors(corsOptions));
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  hsts: useSsl ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false
}));

app.use(cookieParser());
app.use('/api/', globalApiLimiter);
app.use(bodyParserMiddleware);
app.use(antiCrawlerMiddleware);

// Mount Modular API Routers
app.use('/api/auth', authRoutes);
app.use('/api', authRoutes); // Handles /api/login, /api/logout, /api/session aliases
app.use('/api/sync', syncRoutes);
app.use(['/api/db/backups', '/api/mysql/snapshots', '/api/sqlite/snapshots'], backupRoutes);
app.use('/api/db', dbRoutes);
app.use('/api', dbRoutes); // Handles /api/mysql/*, /api/sqlite/*, /api/db-* aliases
app.use('/api', systemRoutes);
app.use('/', systemRoutes); // Handles /sw.js, /manifest.json

// Create HTTP/HTTPS Server
let server;
if (useSsl) {
  server = https.createServer(sslOptions, app);
} else {
  server = http.createServer(app);
}

// Attach Real-time WebSocket and SSE Server
initSocketServer(server);

// Boot & Periodic MySQL connection checks
checkMysqlConnection().catch(() => {});
setInterval(checkMysqlConnection, 5000);

// Initialize Embedded Relational SQL Engine
initAlasqlEngine();

// Vite development middleware or compiled production static files
const distPath = path.join(ROOT_DIR, 'dist');
const isProduction = process.env.NODE_ENV === 'production' || (!process.env.FORCE_DEV && fs.existsSync(path.join(distPath, 'index.html')));

if (isProduction) {
  console.log('[Shared DB Server] Serving compiled production static files from dist/...');
  app.use(express.static(distPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.log('[Shared DB Server] Running in DEVELOPMENT mode with Vite middleware...');
  try {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server },
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } catch (viteErr) {
    console.warn('[Vite Middleware Warning]', viteErr.message);
  }
}

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, '0.0.0.0', async () => {
    await initDatabaseSchema();
    await invalidateAllSessionsOnBoot();
    await enforceGlobalCompromisedPasswordReset();
    console.log(`========================================`);
    console.log(`   TILEPOINT SHARED DATABASE SERVER     `);
    console.log(`========================================`);
    console.log(`Server Port         : ${PORT}`);
    console.log(`Security Mode       : ${useSsl ? 'HTTPS (SSL Secured)' : 'HTTP (Standard)'}`);
    console.log(`Database Engine     : MySQL Connection Pool (Primary) with Embedded AlaSQL Buffer`);
    console.log(`Real-Time Engine    : Socket.io (db_pulse_update) + SSE`);
    console.log(`========================================`);
  });

  // Graceful shutdown handling for container and process managers
  const gracefulShutdown = async (signal) => {
    console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
    server.close(() => {
      console.log('[Server] HTTP/HTTPS server closed to new connections.');
    });
    try {
      await pool.end();
      console.log('[Server] MySQL connection pool drained and closed.');
    } catch (e) {
      console.warn('[Server] Error closing MySQL pool:', e.message);
    }
    console.log('[Server] Graceful shutdown complete.');
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

export { app, server };
export default app;

