import assert from 'assert';
import crypto from 'crypto';

console.log('[Integration Test] Running Timing-Safe HMAC, Exp Claim & Active Session Revocation Suite...\n');

const TEST_SECRET = 'a_secure_test_secret_that_is_at_least_32_characters_long_12345';
const SHIFT_SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

// Mock active sessions registry
let activeSessions = new Map();

function generateTestToken(user, sessionId, durationMs = SHIFT_SESSION_DURATION_MS, timestampOffset = 0) {
  const now = Date.now() + timestampOffset;
  const exp = now + durationMs;
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    sessionId: sessionId || 'SESS_' + Math.random().toString(36).substring(2, 9),
    iat: now,
    exp: exp,
    timestamp: now
  };
  const payloadJson = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadJson, 'utf8').toString('base64');
  const signature = crypto.createHmac('sha256', TEST_SECRET).update(payloadBase64).digest('base64');
  return `${payloadBase64}.${signature}`;
}

function verifyAndExtractToken(token) {
  if (!token || typeof token !== 'string') return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadBase64, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', TEST_SECRET).update(payloadBase64).digest('base64');

    const sigBuf = Buffer.from(signature, 'base64');
    const expBuf = Buffer.from(expectedSig, 'base64');

    if (sigBuf.length === 0 || sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
    const now = Date.now();

    // Reject future timestamps
    if (typeof payload.timestamp === 'number' && payload.timestamp > now) {
      return null;
    }
    if (typeof payload.iat === 'number' && payload.iat > now) {
      return null;
    }

    // Enforce exp claim
    if (typeof payload.exp === 'number') {
      if (now >= payload.exp) return null;
    } else if (typeof payload.timestamp === 'number') {
      if (now - payload.timestamp > SHIFT_SESSION_DURATION_MS) return null;
    } else {
      return null;
    }

    // Check active sessions table for server-side revocation
    if (payload.sessionId && !activeSessions.has(payload.sessionId)) {
      return null;
    }

    return payload;
  } catch (_) {
    return null;
  }
}

const mockUser = { id: 'u_sess_1', username: 'alice_cashier', role: 'Cashier' };
const sessId = 'SESS_ALICE_SHIFT_1';

// Register active session
activeSessions.set(sessId, {
  id: sessId,
  userId: mockUser.id,
  username: mockUser.username,
  role: mockUser.role,
  expiresAt: new Date(Date.now() + SHIFT_SESSION_DURATION_MS).toISOString()
});

// Test 1: Valid shift token passes timing-safe HMAC & exp validation
const validToken = generateTestToken(mockUser, sessId);
const payloadValid = verifyAndExtractToken(validToken);
assert(payloadValid !== null, 'Valid shift token must verify successfully');
assert.strictEqual(payloadValid.sessionId, sessId);
assert.strictEqual(payloadValid.exp > Date.now(), true);
console.log('PASS 1/5: Timing-safe HMAC verification and exp claim valid for standard shift.');

// Test 2: Tampered HMAC signature rejected on timingSafeEqual
const tamperedToken = validToken.slice(0, -4) + 'AAAA';
assert.strictEqual(verifyAndExtractToken(tamperedToken), null, 'Tampered token must be rejected');
console.log('PASS 2/5: Tampered signature rejected cleanly via crypto.timingSafeEqual.');

// Test 3: Future timestamp rejected (payload.timestamp > Date.now())
const futureToken = generateTestToken(mockUser, sessId, SHIFT_SESSION_DURATION_MS, 60000); // 1 minute in future
assert.strictEqual(verifyAndExtractToken(futureToken), null, 'Token from the future must be rejected');
console.log('PASS 3/5: Future timestamp token (timestamp > Date.now()) rejected.');

// Test 4: Expired token rejected (Date.now() >= payload.exp)
const expiredToken = generateTestToken(mockUser, sessId, -1000); // Expired 1 second ago
assert.strictEqual(verifyAndExtractToken(expiredToken), null, 'Expired exp claim must be rejected');
console.log('PASS 4/5: Expired token rejected via real exp claim.');

// Test 5: Server-side revocation - removing from active_sessions invalidates token immediately
activeSessions.delete(sessId); // Server-side logout
assert.strictEqual(verifyAndExtractToken(validToken), null, 'Revoked session in active_sessions must be rejected immediately');
console.log('PASS 5/5: Server-side revocation against active_sessions immediately blocks revoked token.');

console.log('\n=============================================================');
console.log(' [ALL SESSION SECURITY, TIMING & REVOCATION TESTS PASSED] ');
console.log('=============================================================\n');
