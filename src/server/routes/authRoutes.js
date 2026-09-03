import crypto from 'crypto';
import express from 'express';
import bcrypt from 'bcryptjs';
import {
  useSsl,
  DEFAULT_SESSION_MAX_DURATION_MINUTES,
  SHIFT_SESSION_DURATION_MS,
  SESSION_IDLE_TIMEOUT_MS,
  getNextMidnight
} from '../config/serverConfig.js';
import {
  authLimiter,
  verifySessionAndCheckConcurrency
} from '../middleware/authMiddleware.js';
import {
  getInternalUserByUsername,
  readFullDatabase,
  upsertRecordMysql,
  readDbFile,
  writeDbFile,
  invalidateDbCache,
  computeDatabaseHash
} from '../db/dbHelpers.js';
import {
  getIsMysqlActive,
  markServerDegraded,
  queueDegradedWrite
} from '../db/degradedStore.js';
import {
  upsertRecordAlasql
} from '../db/alasqlEngine.js';
import {
  verifyAndMigratePassword,
  verifyPasswordHash,
  generateServerSessionToken,
  verifyAndExtractToken,
  getActiveSessionsList,
  saveActiveSessionRecord,
  removeActiveSessionRecord,
  pruneExpiredSessions
} from '../services/authService.js';
import {
  notifyClients,
  emitPulseUpdate,
  getSocketIO
} from '../realtime/socketHandler.js';

const router = express.Router();

// API: Authentication - Login with Concurrency Single-Session Lock & Fingerprint Registration
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { username, password, branchId, branchName, userAgent, sessionId, fingerprint, deviceInfo, maxDurationMinutes } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required.' });
    }

    const targetUser = await getInternalUserByUsername(username);

    if (!targetUser) {
      return res.status(401).json({ success: false, error: 'Invalid employee ID or security password code.' });
    }

    if (targetUser.status && targetUser.status !== 'Active') {
      return res.status(403).json({ success: false, error: 'Suspended Account: Terminal credentials restricted by Administration.' });
    }

    const authCheck = await verifyAndMigratePassword(password, targetUser);
    if (!authCheck.valid) {
      if (authCheck.cutoffExpired) {
        return res.status(403).json({
          success: false,
          mustResetPassword: true,
          error: 'Legacy credentials expired past the security cutoff date. You must reset your password.'
        });
      }
      return res.status(401).json({ success: false, error: 'Invalid employee ID or security password code.' });
    }

    await pruneExpiredSessions();
    const activeSessions = await getActiveSessionsList();
    const now = Date.now();
    const incomingSessionId = sessionId || req.headers['x-client-id'] || ("SESS_" + crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase());
    const clientFingerprint = fingerprint || req.headers['x-client-fingerprint'] || '';
    const clientDeviceInfo = deviceInfo || req.headers['x-client-info'] || '';
    const durationMinutes = parseInt(maxDurationMinutes, 10) || DEFAULT_SESSION_MAX_DURATION_MINUTES;

    const existingActiveSession = activeSessions.find(s => {
      if (s.userId !== targetUser.id) return false;
      const lastActiveTime = new Date(s.lastActive || 0).getTime();
      const isActive = (now - lastActiveTime) < SESSION_IDLE_TIMEOUT_MS;
      return isActive && s.id !== incomingSessionId;
    });

    const verifiedSessionId = incomingSessionId;
    const sessionToken = generateServerSessionToken(targetUser, verifiedSessionId, durationMinutes * 60 * 1000);
    const sessionStartedAt = new Date().toISOString();
    const nextMidnight = getNextMidnight(now);
    const expiresAt = new Date(Math.min(now + durationMinutes * 60 * 1000, nextMidnight)).toISOString();

    const sessionRecord = {
      id: verifiedSessionId,
      userId: targetUser.id,
      username: targetUser.username,
      fullName: targetUser.fullName,
      role: targetUser.role,
      branchId: branchId || targetUser.branchAssignmentId || 'B1',
      branchName: branchName || 'Main Branch',
      lastActive: new Date().toISOString(),
      userAgent: userAgent || req.headers['user-agent'] || '',
      fingerprint: clientFingerprint,
      deviceInfo: typeof clientDeviceInfo === 'object' ? JSON.stringify(clientDeviceInfo) : clientDeviceInfo,
      sessionStartedAt,
      expiresAt,
      maxDurationMinutes: durationMinutes
    };

    // If an existing session was active on another terminal, notify it immediately via SSE and Socket.io
    if (existingActiveSession) {
      console.log(`[Auth] User ${targetUser.username} logged in from new terminal ${verifiedSessionId}. Superseding previous session ${existingActiveSession.id}`);
      const supersededPayload = {
        userId: targetUser.id,
        supersededSessionId: existingActiveSession.id,
        newSessionId: verifiedSessionId,
        newSessionInfo: {
          branchName: sessionRecord.branchName,
          deviceInfo: sessionRecord.deviceInfo,
          userAgent: sessionRecord.userAgent,
          sessionStartedAt
        }
      };
      notifyClients('session_superseded', supersededPayload);
      const io = getSocketIO();
      if (io) {
        io.emit('session_superseded', supersededPayload);
      }
    }

    await saveActiveSessionRecord(sessionRecord);

    // Set secure HTTP-Only cookie that survives IP address changes
    res.cookie('tp_session', sessionToken, {
      httpOnly: true,
      secure: useSsl || process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    const updatedSessions = await getActiveSessionsList();
    emitPulseUpdate('tp_active_sessions', computeDatabaseHash(updatedSessions));

    const safeUser = { ...targetUser };
    delete safeUser.passwordHash;
    delete safeUser.managerPin;

    return res.json({
      success: true,
      token: sessionToken,
      sessionId: verifiedSessionId,
      user: safeUser,
      mustResetPassword: Boolean(targetUser.mustResetPassword),
      session: sessionRecord,
      sessionStartedAt,
      expiresAt,
      maxDurationMinutes: durationMinutes,
      remainingSeconds: durationMinutes * 60
    });
  } catch (err) {
    console.error('[Auth API] Login error:', err);
    return res.status(500).json({ success: false, error: 'Internal server authentication error: ' + err.message });
  }
});

// API: Force/Change Password Reset Endpoint
router.post('/change-password', async (req, res) => {
  try {
    const userPayload = verifyAndExtractToken(req);
    if (!userPayload || !userPayload.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication token required.' });
    }

    const { currentPassword, newPassword } = req.body || {};
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'New password must be at least 8 characters long.' });
    }

    const fullDb = await readFullDatabase();
    const users = fullDb.db.tp_users || [];
    const targetUser = users.find(u => u.id === userPayload.id);

    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    if (!targetUser.mustResetPassword && currentPassword) {
      const isMatch = await verifyPasswordHash(currentPassword, targetUser.passwordHash || '');
      if (!isMatch) {
        return res.status(401).json({ success: false, error: 'Current password code is incorrect.' });
      }
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    const updatedUser = {
      ...targetUser,
      passwordHash: newHash,
      mustResetPassword: 0,
      updatedAt: new Date().toISOString()
    };

    if (getIsMysqlActive()) {
      try {
        await upsertRecordMysql('users', updatedUser);
      } catch (err) {
        if (isConnectionError(err)) {
          markServerDegraded(`Password change MySQL error: ${err.message}`);
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
    console.log(`[Security] User ${targetUser.username} successfully updated their compromised password.`);
    return res.json({ success: true, message: 'Password successfully updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// API: Server-side Manager Override Verification
router.post('/verify-override', authLimiter, async (req, res) => {
  try {
    const { username, password, pin, requiredRole } = req.body || {};
    if (!username || (!password && !pin)) {
      return res.status(400).json({ success: false, error: 'Username and credentials are required.' });
    }

    const approver = await getInternalUserByUsername(username);
    if (!approver || approver.status !== 'Active') {
      return res.status(403).json({ success: false, error: 'Approver terminal credentials have been restricted.' });
    }

    const roleLower = (approver.role || '').toLowerCase();
    const reqRoleLower = (requiredRole || 'manager').toLowerCase();
    const isAuthorized = roleLower === 'admin' || (reqRoleLower === 'manager' && (roleLower === 'manager' || roleLower === 'admin'));
    if (!isAuthorized) {
      return res.status(403).json({ success: false, error: `Authorization Refused: ${approver.fullName} has role ${approver.role}, but at least role ${requiredRole || 'Manager'} is required.` });
    }

    if (pin && approver.managerPin) {
      if (pin.trim() === approver.managerPin.trim()) {
        return res.json({ success: true, approver: { id: approver.id, fullName: approver.fullName, role: approver.role } });
      }
    }

    if (password) {
      const authCheck = await verifyAndMigratePassword(password, approver);
      if (authCheck.valid) {
        return res.json({ success: true, approver: { id: approver.id, fullName: approver.fullName, role: approver.role } });
      }
    }

    return res.status(401).json({ success: false, error: 'Invalid security credentials password.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// API: Authentication - Refresh Active Session Token & Shift Window
router.post('/refresh', async (req, res) => {
  try {
    const userPayload = verifyAndExtractToken(req);
    if (!userPayload || !userPayload.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Active session required for token refresh.' });
    }

    const fullDb = await readFullDatabase();
    const users = fullDb.db.tp_users || [];
    const targetUser = users.find(u => u.id === userPayload.id || (userPayload.username && u.username === userPayload.username));

    if (!targetUser) {
      return res.status(401).json({ success: false, code: 'USER_NOT_FOUND', error: 'User account not found on server.' });
    }
    if (targetUser.status !== 'Active') {
      return res.status(403).json({ success: false, code: 'FORBIDDEN', error: 'User account has been disabled or suspended.' });
    }

    const activeSessions = await getActiveSessionsList();
    const sessionRecord = activeSessions.find(s => s.id === userPayload.sessionId || s.userId === userPayload.id);

    if (!sessionRecord) {
      return res.status(401).json({ success: false, error: 'Session has been revoked or expired on server.' });
    }

    const now = Date.now();
    const refreshedToken = generateServerSessionToken(targetUser, sessionRecord.id, SHIFT_SESSION_DURATION_MS);
    sessionRecord.lastActive = new Date(now).toISOString();
    sessionRecord.expiresAt = new Date(now + SHIFT_SESSION_DURATION_MS).toISOString();

    await saveActiveSessionRecord(sessionRecord);

    res.cookie('tp_session', refreshedToken, {
      httpOnly: true,
      secure: useSsl || process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SHIFT_SESSION_DURATION_MS
    });

    const safeUser = { ...targetUser };
    delete safeUser.passwordHash;
    delete safeUser.managerPin;

    return res.json({
      success: true,
      token: refreshedToken,
      expiresAt: sessionRecord.expiresAt,
      user: safeUser
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// API: Authentication - Get Current Server Session & Validate Concurrency / Duration
router.get(['/session', '/me'], async (req, res) => {
  try {
    const check = await verifySessionAndCheckConcurrency(req);
    if (!check.valid) {
      if (check.code === 'SESSION_SUPERSEDED' || check.code === 'SESSION_EXPIRED') {
        return res.status(401).json({
          success: false,
          user: null,
          code: check.code,
          error: check.error,
          superseded: Boolean(check.superseded),
          expired: Boolean(check.expired),
          activeSession: check.activeSession
        });
      }
      return res.json({ success: false, user: null, message: check.error || 'No active valid session.' });
    }

    const fullDb = await readFullDatabase();
    const users = fullDb.db.tp_users || [];
    const targetUser = users.find(u => u.id === check.user.id);

    if (!targetUser || targetUser.status === 'Suspended') {
      res.clearCookie('tp_session', { path: '/' });
      return res.json({ success: false, user: null, message: 'User account not found or suspended.' });
    }

    const safeUser = { ...targetUser };
    delete safeUser.passwordHash;
    delete safeUser.managerPin;

    res.setHeader('X-Session-Remaining-Seconds', check.remainingSeconds);

    return res.json({
      success: true,
      user: safeUser,
      sessionId: check.session ? check.session.id : check.user.sessionId,
      session: check.session,
      token: check.user._token,
      sessionStartedAt: check.session?.sessionStartedAt,
      expiresAt: check.session?.expiresAt,
      remainingSeconds: check.remainingSeconds
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// API: Authentication - Heartbeat & Concurrency Validation
router.post('/heartbeat', async (req, res) => {
  try {
    const check = await verifySessionAndCheckConcurrency(req);
    if (!check.valid) {
      return res.status(check.status || 401).json({
        success: false,
        code: check.code,
        error: check.error,
        superseded: Boolean(check.superseded),
        expired: Boolean(check.expired),
        activeSession: check.activeSession
      });
    }

    res.setHeader('X-Session-Remaining-Seconds', check.remainingSeconds);

    return res.json({
      success: true,
      lastActive: check.session.lastActive,
      expiresAt: check.session.expiresAt,
      remainingSeconds: check.remainingSeconds
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// API: Authentication - Extend Session Duration
router.post('/extend-session', async (req, res) => {
  try {
    const check = await verifySessionAndCheckConcurrency(req);
    if (!check.valid) {
      return res.status(check.status || 401).json({
        success: false,
        code: check.code,
        error: check.error,
        superseded: Boolean(check.superseded),
        expired: Boolean(check.expired)
      });
    }

    const additionalMinutes = parseInt(req.body?.additionalMinutes, 10) || DEFAULT_SESSION_MAX_DURATION_MINUTES;
    const now = Date.now();
    const newExpiresAt = new Date(now + additionalMinutes * 60 * 1000).toISOString();

    check.session.expiresAt = newExpiresAt;
    check.session.maxDurationMinutes = additionalMinutes;
    check.session.lastActive = new Date().toISOString();

    await saveActiveSessionRecord(check.session);

    const remainingSeconds = additionalMinutes * 60;
    res.setHeader('X-Session-Remaining-Seconds', remainingSeconds);

    return res.json({
      success: true,
      message: `Session duration successfully extended by ${Math.round(additionalMinutes / 60)} hours.`,
      expiresAt: newExpiresAt,
      remainingSeconds
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// API: Authentication - Fast Verify Session Status
router.get('/verify-session', async (req, res) => {
  try {
    const check = await verifySessionAndCheckConcurrency(req);
    if (!check.valid) {
      return res.status(check.status || 401).json({
        success: false,
        code: check.code,
        error: check.error,
        superseded: Boolean(check.superseded),
        expired: Boolean(check.expired),
        activeSession: check.activeSession
      });
    }
    return res.json({
      success: true,
      valid: true,
      sessionId: check.session.id,
      fingerprint: check.session.fingerprint,
      sessionStartedAt: check.session.sessionStartedAt,
      expiresAt: check.session.expiresAt,
      remainingSeconds: check.remainingSeconds
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// API: Authentication - Logout and Release Session Lock
router.all(['/logout', '/session'], async (req, res, next) => {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return next();
  }
  try {
    const payload = verifyAndExtractToken(req);
    const sessionId = req.body?.sessionId || req.query?.sessionId || payload?.sessionId || req.headers['x-client-id'] || req.headers['x-session-id'];
    const userId = payload?.id || req.body?.userId || req.query?.userId;

    if (sessionId || userId) {
      await removeActiveSessionRecord(sessionId, userId);
    }

    res.clearCookie('tp_session', { path: '/' });
    res.clearCookie('tilepoint_session', { path: '/' });

    const updatedSessions = await getActiveSessionsList();
    emitPulseUpdate('tp_active_sessions', computeDatabaseHash(updatedSessions));

    return res.json({ success: true, message: 'Session terminated and lock released.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// API: Authentication - Admin Terminate Session
router.post('/terminate-session', async (req, res) => {
  try {
    const user = verifyAndExtractToken(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    const { sessionId } = req.body;
    if (sessionId) {
      await removeActiveSessionRecord(sessionId, null);
      const updatedSessions = await getActiveSessionsList();
      emitPulseUpdate('tp_active_sessions', computeDatabaseHash(updatedSessions));

      notifyClients('session_terminated', { sessionId });
      const io = getSocketIO();
      if (io) {
        io.emit('session_terminated', { sessionId });
      }
    }

    return res.json({ success: true, message: `Session ${sessionId} terminated.` });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// API: Authentication - List Active Sessions
router.get('/active-sessions', async (req, res) => {
  try {
    await pruneExpiredSessions();
    const sessions = await getActiveSessionsList();
    return res.json({ success: true, sessions });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
