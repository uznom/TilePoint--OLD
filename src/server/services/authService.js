import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  getAppSecret,
  SHIFT_SESSION_DURATION_MS,
  DEFAULT_SESSION_MAX_DURATION_MINUTES,
  SESSION_IDLE_TIMEOUT_MS,
  LEGACY_MIGRATION_CUTOFF_DATE,
  getNextMidnight
} from '../config/serverConfig.js';
import { pool, isConnectionError } from '../db/mysqlPool.js';
import { alasql, upsertRecordAlasql } from '../db/alasqlEngine.js';
import {
  getIsMysqlActive,
  getMysqlEnforced,
  markServerDegraded,
  queueDegradedWrite
} from '../db/degradedStore.js';
import {
  isBcryptHash,
  upsertRecordMysql,
  readDbFile,
  writeDbFile,
  invalidateDbCache
} from '../db/dbHelpers.js';

export async function verifyPasswordHash(password, hash) {
  if (!password || !hash) return false;
  if (isBcryptHash(hash)) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (_) {
      return false;
    }
  }
  return false;
}

export async function verifyAndMigratePassword(password, targetUser) {
  if (!password || !targetUser || !targetUser.passwordHash) {
    return { valid: false, migrated: false };
  }

  const token = targetUser.passwordHash;

  // 1. Direct Bcrypt verification for modern hashes
  if (isBcryptHash(token)) {
    try {
      const match = await bcrypt.compare(password, token);
      return { valid: match, migrated: false };
    } catch (_) {
      return { valid: false, migrated: false };
    }
  }

  // 2. Cutoff enforcement: Unmigrated accounts past cutoff date must reset password
  if (Date.now() > LEGACY_MIGRATION_CUTOFF_DATE.getTime()) {
    console.warn(`[Security Policy] User ${targetUser.username} attempted login with unmigrated legacy hash past cutoff date (${LEGACY_MIGRATION_CUTOFF_DATE.toISOString()}). Forcing password reset.`);
    return { valid: false, migrated: false, cutoffExpired: true };
  }

  // 3. Legacy scheme verification (Single-use migration path)
  let legacyMatch = false;
  try {
    const parts = token.split('$').filter(Boolean);
    let salt = '';
    let iterations = 2500;
    let expectedHash = '';

    for (const part of parts) {
      if (part.startsWith('i=')) iterations = parseInt(part.slice(2), 10) || 2500;
      else if (part.startsWith('s=')) salt = part.slice(2);
      else if (part.startsWith('h=')) expectedHash = part.slice(2);
    }

    if (salt && expectedHash) {
      let hash = password + '$' + salt;
      for (let i = 0; i < iterations; i++) {
        hash = crypto.createHash('sha256').update(hash).digest('hex');
      }
      const calculatedHash = Buffer.from(hash).toString('base64').slice(0, 64);
      if (calculatedHash === expectedHash) {
        legacyMatch = true;
      }
    }
  } catch (_) {}

  // Plain-text bootstrap or legacy match fallback
  if (!legacyMatch && token === password) {
    legacyMatch = true;
  }

  if (!legacyMatch) {
    return { valid: false, migrated: false };
  }

  // 4. Migrate on next successful login: immediately rehash with bcrypt and store
  const newBcryptHash = await bcrypt.hash(password, 10);
  const updatedUser = {
    ...targetUser,
    passwordHash: newBcryptHash,
    mustResetPassword: 0,
    updatedAt: new Date().toISOString()
  };

  if (getIsMysqlActive()) {
    try {
      await upsertRecordMysql('users', updatedUser);
    } catch (err) {
      if (isConnectionError(err)) {
        markServerDegraded(`Password migration MySQL error: ${err.message}`);
        queueDegradedWrite({ type: 'upsert', tableName: 'users', record: updatedUser });
      }
    }
  } else {
    queueDegradedWrite({ type: 'upsert', tableName: 'users', record: updatedUser });
  }

  upsertRecordAlasql('users', updatedUser);
  const db = readDbFile();
  if (Array.isArray(db.tp_users)) {
    db.tp_users = db.tp_users.map(u => u.id === updatedUser.id ? updatedUser : u);
    writeDbFile(db);
  }
  invalidateDbCache();

  console.log(`[Auth Migration] User ${targetUser.username}'s legacy credentials successfully migrated to bcrypt.`);
  return { valid: true, migrated: true, newHash: newBcryptHash };
}

export function generateServerSessionToken(user, sessionId, durationMs = SHIFT_SESSION_DURATION_MS) {
  const now = Date.now();
  const nextMidnight = getNextMidnight(now);
  const exp = Math.min(now + durationMs, nextMidnight);
  const sessId = sessionId || ("SESS_" + Math.random().toString(36).substring(2, 11).toUpperCase());
  const payload = {
    id: user.id,
    username: user.username || user.fullName || "User",
    role: user.role,
    sessionId: sessId,
    iat: now,
    exp: exp,
    timestamp: now
  };
  const payloadJson = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadJson, 'utf8').toString('base64');
  const secret = getAppSecret();
  const signature = crypto.createHmac('sha256', secret).update(payloadBase64).digest('base64');
  return `${payloadBase64}.${signature}`;
}

export function verifyAndExtractToken(req) {
  let token = null;

  if (typeof req === 'string') {
    token = req;
  } else if (req && typeof req === 'object') {
    const authHeader = req.headers && req.headers['authorization'];
    token = req.headers && req.headers['x-session-token'];

    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token && req.cookies && req.cookies.tp_session) {
      token = req.cookies.tp_session;
    }

    if (!token && req.cookies && req.cookies.tilepoint_session) {
      token = req.cookies.tilepoint_session;
    }
  }

  if (!token || typeof token !== 'string') {
    return null;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 2) {
      return null;
    }

    const [payloadBase64, signature] = parts;
    const secret = getAppSecret();
    const expectedSig = crypto.createHmac('sha256', secret).update(payloadBase64).digest('base64');
    
    // Constant-time comparison on equal-length buffers to prevent timing attacks
    const sigBuffer = Buffer.from(signature, 'base64');
    const expectedBuffer = Buffer.from(expectedSig, 'base64');
    
    if (sigBuffer.length === 0 || sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
    const payload = JSON.parse(payloadJson);
    const now = Date.now();

    // Reject tokens that claim future issuance / timestamps
    if (typeof payload.timestamp === 'number' && payload.timestamp > now) {
      return null;
    }
    if (typeof payload.iat === 'number' && payload.iat > now) {
      return null;
    }

    // Enforce real exp claim (or shift window for legacy tokens capped at midnight)
    if (typeof payload.exp === 'number') {
      if (now >= payload.exp) {
        return null;
      }
    } else if (typeof payload.timestamp === 'number') {
      if (now - payload.timestamp > SHIFT_SESSION_DURATION_MS || now >= getNextMidnight(payload.timestamp)) {
        return null;
      }
    } else {
      return null;
    }

    payload._token = token;
    return payload;
  } catch (err) {
    return null;
  }
}

export async function getActiveSessionsList() {
  if (getIsMysqlActive() || getMysqlEnforced()) {
    try {
      const [rows] = await pool.query('SELECT * FROM `active_sessions` ORDER BY `lastActive` DESC');
      return rows.map(r => ({
        ...r,
        lastActive: r.lastActive instanceof Date 
          ? r.lastActive.toISOString() 
          : (typeof r.lastActive === 'string' ? (r.lastActive.includes('T') ? r.lastActive : r.lastActive.replace(' ', 'T') + 'Z') : new Date().toISOString()),
        sessionStartedAt: r.sessionStartedAt instanceof Date 
          ? r.sessionStartedAt.toISOString() 
          : (typeof r.sessionStartedAt === 'string' ? (r.sessionStartedAt.includes('T') ? r.sessionStartedAt : r.sessionStartedAt.replace(' ', 'T') + 'Z') : undefined),
        expiresAt: r.expiresAt instanceof Date 
          ? r.expiresAt.toISOString() 
          : (typeof r.expiresAt === 'string' ? (r.expiresAt.includes('T') ? r.expiresAt : r.expiresAt.replace(' ', 'T') + 'Z') : undefined)
      }));
    } catch (err) {
      console.warn('[Session Store] MySQL active sessions query warning:', err.message);
    }
  }
  const db = readDbFile();
  const sessions = db.tp_active_sessions || [];
  return Array.isArray(sessions) ? sessions : (typeof sessions === 'string' ? JSON.parse(sessions) : []);
}

export async function saveActiveSessionRecord(session) {
  if (!session || !session.id || !session.userId) return;

  const maxDuration = session.maxDurationMinutes || DEFAULT_SESSION_MAX_DURATION_MINUTES;
  const startedAt = session.sessionStartedAt ? new Date(session.sessionStartedAt) : new Date();
  const nextMidnight = getNextMidnight(startedAt.getTime());
  const calculatedExpMs = Math.min(startedAt.getTime() + maxDuration * 60 * 1000, nextMidnight);
  const expiresAt = session.expiresAt ? new Date(Math.min(new Date(session.expiresAt).getTime(), nextMidnight)) : new Date(calculatedExpMs);

  const sessionRow = {
    id: session.id,
    userId: session.userId,
    username: session.username || '',
    fullName: session.fullName || '',
    role: session.role || 'Cashier',
    branchId: session.branchId || 'B1',
    branchName: session.branchName || 'Main Branch',
    lastActive: session.lastActive ? new Date(session.lastActive).toISOString() : new Date().toISOString(),
    userAgent: session.userAgent || '',
    fingerprint: session.fingerprint || '',
    deviceInfo: typeof session.deviceInfo === 'object' ? JSON.stringify(session.deviceInfo) : (session.deviceInfo || ''),
    sessionStartedAt: startedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    maxDurationMinutes: maxDuration
  };

  if (getIsMysqlActive() || getMysqlEnforced()) {
    try {
      await upsertRecordMysql('active_sessions', {
        ...sessionRow,
        lastActive: new Date(sessionRow.lastActive),
        sessionStartedAt: startedAt,
        expiresAt: expiresAt
      });
    } catch (e) {
      console.warn('[Session Store] MySQL active session save warning:', e.message);
    }
  }

  try {
    alasql('DELETE FROM active_sessions WHERE id = ? OR userId = ?', [session.id, session.userId]);
    upsertRecordAlasql('active_sessions', sessionRow);
  } catch (_) {}

  const db = readDbFile();
  let sessions = db.tp_active_sessions || [];
  if (typeof sessions === 'string') {
    try { sessions = JSON.parse(sessions); } catch (_) { sessions = []; }
  }
  if (!Array.isArray(sessions)) sessions = [];

  const existingIdx = sessions.findIndex(s => s.id === session.id);
  if (existingIdx >= 0) {
    sessions[existingIdx] = { ...sessions[existingIdx], ...sessionRow };
  } else {
    sessions = sessions.filter(s => s.userId !== session.userId);
    sessions.push(sessionRow);
  }
  db.tp_active_sessions = sessions;
  writeDbFile(db);
}

export async function removeActiveSessionRecord(sessionId, userId) {
  if (getIsMysqlActive() || getMysqlEnforced()) {
    try {
      if (sessionId) {
        await pool.query('DELETE FROM `active_sessions` WHERE `id` = ?', [sessionId]);
      } else if (userId) {
        await pool.query('DELETE FROM `active_sessions` WHERE `userId` = ?', [userId]);
      }
    } catch (e) {
      console.warn('[Session Store] MySQL active session delete warning:', e.message);
    }
  }

  try {
    if (sessionId) {
      alasql('DELETE FROM active_sessions WHERE id = ?', [sessionId]);
    } else if (userId) {
      alasql('DELETE FROM active_sessions WHERE userId = ?', [userId]);
    }
  } catch (_) {}

  const db = readDbFile();
  let sessions = db.tp_active_sessions || [];
  if (typeof sessions === 'string') {
    try { sessions = JSON.parse(sessions); } catch (_) { sessions = []; }
  }
  if (Array.isArray(sessions)) {
    if (sessionId) {
      sessions = sessions.filter(s => s.id !== sessionId);
    } else if (userId) {
      sessions = sessions.filter(s => s.userId !== userId);
    }
    db.tp_active_sessions = sessions;
    writeDbFile(db);
  }
}

export async function pruneExpiredSessions() {
  try {
    const now = new Date();
    const idleCutoff = new Date(Date.now() - SESSION_IDLE_TIMEOUT_MS);
    if (getIsMysqlActive() || getMysqlEnforced()) {
      try {
        await pool.query(
          'DELETE FROM `active_sessions` WHERE `lastActive` < ? OR (`expiresAt` IS NOT NULL AND `expiresAt` <= ?) OR DATE(`sessionStartedAt`) < CURDATE()',
          [idleCutoff, now]
        );
      } catch (e) {
        console.warn('[Session Store] pruneExpiredSessions MySQL warning:', e.message);
      }
    }
    const db = readDbFile();
    let sessions = db.tp_active_sessions || [];
    if (typeof sessions === 'string') {
      try { sessions = JSON.parse(sessions); } catch (_) { sessions = []; }
    }
    if (Array.isArray(sessions) && sessions.length > 0) {
      const todayDateStr = new Date().toISOString().slice(0, 10);
      const fresh = sessions.filter(s => {
        const t = new Date(s.lastActive || 0).getTime();
        const notIdle = !isNaN(t) && t >= (Date.now() - SESSION_IDLE_TIMEOUT_MS);
        const notExpired = !s.expiresAt || new Date(s.expiresAt).getTime() > Date.now();
        const startedDateStr = s.sessionStartedAt ? new Date(s.sessionStartedAt).toISOString().slice(0, 10) : todayDateStr;
        const isToday = startedDateStr === todayDateStr;
        return notIdle && notExpired && isToday;
      });
      if (fresh.length !== sessions.length) {
        db.tp_active_sessions = fresh;
        writeDbFile(db);
      }
    }
  } catch (err) {
    console.warn('[Session Store] pruneExpiredSessions error:', err.message);
  }
}

setInterval(pruneExpiredSessions, 60000).unref();

function scheduleMidnightSessionPurge() {
  const msToMidnight = Math.max(1000, getNextMidnight() - Date.now());
  setTimeout(async () => {
    console.log('[Security] Midnight reached: Resetting all cashier, staff, manager, and admin sessions for the new business day.');
    await pruneExpiredSessions();
    scheduleMidnightSessionPurge();
  }, msToMidnight).unref();
}

scheduleMidnightSessionPurge();

export async function invalidateAllSessionsOnBoot() {
  try {
    if (getIsMysqlActive() || getMysqlEnforced()) {
      try {
        await pool.query('TRUNCATE TABLE `active_sessions`');
      } catch (e) {}
    }
    try {
      alasql('DELETE FROM `active_sessions`');
    } catch (e) {}
    const db = readDbFile();
    db.tp_active_sessions = [];
    writeDbFile(db);
    invalidateDbCache();
  } catch (err) {
    console.warn('[Session Store] Session purge notice on boot:', err.message);
  }
}

export async function enforceGlobalCompromisedPasswordReset() {
  try {
    if (getIsMysqlActive() || getMysqlEnforced()) {
      try {
        await pool.query('UPDATE users SET mustResetPassword = 1');
      } catch (e) {}
    }
    try {
      alasql('UPDATE users SET mustResetPassword = true');
    } catch (e) {}
    const db = readDbFile();
    if (Array.isArray(db.tp_users)) {
      db.tp_users = db.tp_users.map(u => ({ ...u, mustResetPassword: true }));
      writeDbFile(db);
    }
    invalidateDbCache();
    console.log('[Security] Forced password reset flag marked active across all user accounts.');
  } catch (err) {
    console.warn('[Security] Password reset notice:', err.message);
  }
}
