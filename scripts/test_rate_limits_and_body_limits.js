import assert from 'assert';
import http from 'http';
import crypto from 'crypto';
import express from 'express';
import rateLimit from 'express-rate-limit';

console.log('[Integration Test] Running Body Limit & Rate Limit Suite...\n');

const TEST_SECRET = 'a_secure_test_secret_that_is_at_least_32_characters_long_12345';
const app = express();

const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3, // Set to 3 for fast unit test verification
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many authentication attempts. Please try again after 15 minutes.' }
});

app.use('/api/', globalApiLimiter);

const LARGE_BODY_ROUTES = new Set(['/api/db/backups', '/api/db/sync-batch']);

app.use((req, res, next) => {
  if (LARGE_BODY_ROUTES.has(req.path)) {
    return next();
  }
  express.json({ limit: '100kb' })(req, res, (err) => {
    if (err) {
      return res.status(413).json({ success: false, error: 'Payload too large. General API limit is 100kb.' });
    }
    next();
  });
});

function verifyAndExtractToken(req) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  try {
    const [payloadB64, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', TEST_SECRET).update(payloadB64).digest('base64');
    const sigBuf = Buffer.from(sig, 'base64');
    const expBuf = Buffer.from(expected, 'base64');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
    return JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
  } catch (_) {
    return null;
  }
}

// General Route with standard 100kb limit
app.post('/api/test-general', (req, res) => {
  res.json({ success: true, receivedBytes: JSON.stringify(req.body).length });
});

// Auth route with tight rate limiter
app.post('/api/auth/test-login', authLimiter, (req, res) => {
  res.json({ success: true, message: 'Login attempt processed' });
});

// Snapshot upload route: Auth FIRST, then 50MB parser
app.post(
  '/api/db/backups',
  (req, res, next) => {
    const user = verifyAndExtractToken(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (user.role !== 'Admin') return res.status(403).json({ success: false, error: 'Forbidden' });
    next();
  },
  express.json({ limit: '50mb' }),
  (req, res) => {
    res.json({ success: true, size: req.body?.data?.length || 0 });
  }
);

const server = http.createServer(app);
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

function makeRequest(path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function makeToken(role = 'Admin') {
  const payload = { id: 'u1', username: 'admin', role, exp: Date.now() + 3600000 };
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64');
  const sig = crypto.createHmac('sha256', TEST_SECRET).update(b64).digest('base64');
  return `${b64}.${sig}`;
}

// Test 1: General route accepts standard payload <= 100kb
const res1 = await makeRequest('/api/test-general', {}, JSON.stringify({ data: 'hello' }));
assert.strictEqual(res1.status, 200);
console.log('PASS 1/5: General route accepts standard payloads <= 100kb.');

// Test 2: General route rejects payload > 100kb with 413 Payload Too Large
const bigPayload150kb = JSON.stringify({ data: 'A'.repeat(150 * 1024) });
const res2 = await makeRequest('/api/test-general', {}, bigPayload150kb);
assert.strictEqual(res2.status, 413);
console.log('PASS 2/5: General route enforces 100kb limit and returns 413 Payload Too Large.');

// Test 3: Unauthenticated large snapshot upload rejected with 401 BEFORE parsing body
const res3 = await makeRequest('/api/db/backups', {}, bigPayload150kb);
assert.strictEqual(res3.status, 401);
console.log('PASS 3/5: Unauthenticated large backup request rejected with 401 before body parsing.');

// Test 4: Authenticated Admin large snapshot upload successfully parses large payload
const adminToken = makeToken('Admin');
const res4 = await makeRequest('/api/db/backups', { Authorization: `Bearer ${adminToken}` }, bigPayload150kb);
assert.strictEqual(res4.status, 200);
assert.strictEqual(res4.data.size, 150 * 1024);
console.log('PASS 4/5: Authenticated Admin snapshot upload parses large payload up to 50MB.');

// Test 5: Auth rate limiter triggers 429 Too Many Requests after threshold
await makeRequest('/api/auth/test-login', {}, JSON.stringify({ user: '1' }));
await makeRequest('/api/auth/test-login', {}, JSON.stringify({ user: '2' }));
await makeRequest('/api/auth/test-login', {}, JSON.stringify({ user: '3' }));
const res5 = await makeRequest('/api/auth/test-login', {}, JSON.stringify({ user: '4' }));
assert.strictEqual(res5.status, 429);
console.log('PASS 5/5: Auth rate limiter strictly caps authentication attempts and returns 429.');

server.close();
console.log('\n=============================================================');
console.log(' [ALL RATE LIMIT AND BODY SIZE ENFORCEMENT TESTS PASSED] ');
console.log('=============================================================\n');
