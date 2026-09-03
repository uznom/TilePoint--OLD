import crypto from 'crypto';
import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  DEFAULT_SESSION_MAX_DURATION_MINUTES
} from '../config/serverConfig.js';
import {
  verifyAndExtractToken,
  getActiveSessionsList,
  saveActiveSessionRecord
} from '../services/authService.js';
import { readFullDatabase } from '../db/dbHelpers.js';

// Rate Limiting: General per-IP cap across all API endpoints (with high ceiling for real-time POS operations)
export const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Generous limit for high-frequency POS polling and multi-terminal operations
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests from this IP, please try again later.' },
  skip: (req) => {
    const p = req.path || req.url || '';
    return (
      p.includes('/api/auth/heartbeat') ||
      p.includes('/api/health') ||
      p.includes('/api/server/status')
    );
  }
});

// Rate Limiting: Tight per-IP cap on Login, PIN, and credential verification
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 attempts per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many authentication attempts. Please try again after 15 minutes.' }
});

export const LARGE_BODY_ROUTES = new Set([
  '/api/db/backups',
  '/api/mysql/snapshots',
  '/api/sqlite/snapshots',
  '/api/db/sync-batch',
  '/api/mysql/sync-batch',
  '/api/mysql/sync-all',
  '/api/db/sync-all',
  '/api/db/bulk',
  '/api/mysql/bulk',
  '/api/db/batch',
  '/api/mysql/batch',
  '/api/db',
  '/api/mysql'
]);

export const isDbOrSyncRoute = (path = '') => {
  return (
    path === '/api/db' ||
    path.startsWith('/api/db/') ||
    path.startsWith('/api/sync') ||
    path.startsWith('/api/mysql') ||
    path.startsWith('/api/sqlite')
  );
};

export const bodyParserMiddleware = (req, res, next) => {
  // Routes with custom auth-first middleware (e.g. Backups/Snapshots)
  if (req.path === '/api/db/backups' || req.path === '/api/mysql/snapshots' || req.path === '/api/sqlite/snapshots') {
    return next();
  }

  // Database, bulk import, and sync routes support payloads up to 50MB
  if (isDbOrSyncRoute(req.path)) {
    return express.json({ limit: '50mb' })(req, res, (err) => {
      if (err) {
        return res.status(413).json({ success: false, error: 'Payload too large. Database bulk import limit is 50MB.' });
      }
      express.urlencoded({ limit: '50mb', extended: true })(req, res, next);
    });
  }

  // General API routes enforce compact 100kb limit
  express.json({ limit: '100kb' })(req, res, (err) => {
    if (err) {
      return res.status(413).json({ success: false, error: 'Payload too large. General API limit is 100kb.' });
    }
    express.urlencoded({ limit: '100kb', extended: true })(req, res, next);
  });
};

export const antiCrawlerMiddleware = (req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  next();
};

/**
 * Validates token, client fingerprint, and checks for concurrent login activity
 * against server-side active sessions registry upon every API request.
 */
export async function verifySessionAndCheckConcurrency(req) {
  const payload = verifyAndExtractToken(req);
  if (!payload || !payload.id) {
    return { valid: false, status: 401, code: 'UNAUTHORIZED', error: 'Authentication token missing or invalid.' };
  }

  const rawIncomingSessionId = req.headers['x-client-id'] || req.headers['x-session-id'] || payload.sessionId;
  const incomingSessionId = (rawIncomingSessionId && rawIncomingSessionId !== 'unknown') ? rawIncomingSessionId : null;

  // Read full db to verify user and their role
  const fullDb = await readFullDatabase();
  const dbUsers = fullDb.db.tp_users || [];
  const dbUser = dbUsers.find(u => u.id === payload.id || (payload.username && (u.username || '').toLowerCase() === (payload.username || '').toLowerCase()));
  
  if (!dbUser) {
    return { valid: false, status: 401, code: 'USER_NOT_FOUND', error: 'User account not found or session invalid. Please log in again.' };
  }
  if (dbUser.status !== 'Active') {
    return { valid: false, status: 403, code: 'FORBIDDEN', error: 'User account has been disabled or suspended.' };
  }

  // Update role dynamically based on the DB to enforce RBAC changes
  payload.role = dbUser.role;

  const activeSessions = await getActiveSessionsList();
  const currentSessionId = incomingSessionId || payload.sessionId;

  // Enforce single-device session concurrency by checking against the active session for this user
  const userSession = activeSessions.find(s => s.userId === payload.id);

  if (!userSession) {
    return {
      valid: false,
      status: 401,
      code: 'SESSION_REVOKED',
      superseded: true,
      error: 'Session has ended or has been terminated. Please log in again.',
      user: payload
    };
  }

  // Concurrency Validation Check: If the active session in DB belongs to a newer login, supersede this session
  if (currentSessionId && userSession.id !== currentSessionId) {
    return {
      valid: false,
      status: 401,
      code: 'SESSION_SUPERSEDED',
      superseded: true,
      error: 'Concurrent login detected: Your account was signed into on another device/browser. This session has been terminated.',
      user: payload,
      activeSession: {
        id: userSession.id,
        branchName: userSession.branchName,
        lastActive: userSession.lastActive,
        userAgent: userSession.userAgent,
        deviceInfo: userSession.deviceInfo
      }
    };
  }

  const now = Date.now();

  // Session Duration Check
  if (userSession.expiresAt) {
    const expTime = new Date(userSession.expiresAt).getTime();
    if (!isNaN(expTime) && now >= expTime) {
      return {
        valid: false,
        status: 401,
        code: 'SESSION_EXPIRED',
        expired: true,
        error: 'Your session duration has expired. Please sign in again to verify your corporate identity.',
        user: payload,
        session: userSession
      };
    }
  }

  // Session is valid; update lastActive in memory & MySQL
  userSession.lastActive = new Date().toISOString();
  await saveActiveSessionRecord(userSession);

  const expiresTime = userSession.expiresAt ? new Date(userSession.expiresAt).getTime() : (now + DEFAULT_SESSION_MAX_DURATION_MINUTES * 60000);
  const remainingSeconds = Math.max(0, Math.floor((expiresTime - now) / 1000));

  return {
    valid: true,
    user: payload,
    session: userSession,
    remainingSeconds
  };
}

export const authenticateAdminForSnapshotUpload = (req, res, next) => {
  try {
    const user = verifyAndExtractToken(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
    }
    if (user.role !== 'Admin' && user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden: Admin role required to create database backups.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const authenticateUserForSyncBatch = (req, res, next) => {
  try {
    const user = verifyAndExtractToken(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required for batch sync.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
