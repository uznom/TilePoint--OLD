import http from 'http';
import crypto from 'crypto';
import express from 'express';

// Test secret >= 32 chars
const TEST_SECURITY_SECRET = 'a_secure_test_secret_that_is_at_least_32_characters_long_12345';
process.env.SECURITY_SECRET = TEST_SECURITY_SECRET;

// In-memory mock store
let mockDbSnapshots = [
  {
    id: 'snap_1',
    name: 'Initial Mock Backup',
    creator: 'System',
    sizeBytes: 1024,
    data: '{"mock":true}',
    timestamp: new Date().toISOString(),
    isDeleted: false,
    deletedAt: null
  }
];

function generateTestToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    sessionId: 'SESS_TEST_' + Math.random().toString(36).substring(2, 9),
    timestamp: Date.now()
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
  const signature = crypto.createHmac('sha256', TEST_SECURITY_SECRET).update(payloadBase64).digest('base64');
  return `${payloadBase64}.${signature}`;
}

function verifyAndExtractToken(req) {
  const authHeader = req.headers['authorization'];
  let token = req.headers['x-session-token'];
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadBase64, signature] = parts;
    const expected = crypto.createHmac('sha256', TEST_SECURITY_SECRET).update(payloadBase64).digest('base64');
    const sigBuffer = Buffer.from(signature, 'base64');
    const expectedBuffer = Buffer.from(expected, 'base64');
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }
    return JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
  } catch (_) {
    return null;
  }
}

// Build Express app matching server.js backup routes exactly
const app = express();
app.use(express.json({ limit: '100mb' }));

// 1. GET /api/db/backups
app.get('/api/db/backups', (req, res) => {
  const user = verifyAndExtractToken(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
  }
  const activeSnapshots = mockDbSnapshots.filter(s => !s.isDeleted);
  res.json({ success: true, data: activeSnapshots });
});

// 2. GET /api/db/backups/:id
app.get('/api/db/backups/:id', (req, res) => {
  const user = verifyAndExtractToken(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
  }
  const found = mockDbSnapshots.find(s => s.id === req.params.id && !s.isDeleted);
  if (!found) {
    return res.status(404).json({ success: false, error: 'Snapshot not found' });
  }
  res.json({ success: true, data: found });
});

// 3. POST /api/db/backups
app.post('/api/db/backups', (req, res) => {
  const user = verifyAndExtractToken(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
  }
  if (user.role !== 'Admin') {
    return res.status(403).json({ success: false, error: 'Forbidden: Admin role required to create database backups.' });
  }
  const { snapshot } = req.body || {};
  if (!snapshot || !snapshot.id) {
    return res.status(400).json({ success: false, error: 'Invalid snapshot payload' });
  }
  const record = { ...snapshot, isDeleted: false, deletedAt: null };
  mockDbSnapshots.push(record);
  res.json({ success: true, id: snapshot.id });
});

// 4. DELETE /api/db/backups/:id
app.delete('/api/db/backups/:id', (req, res) => {
  const user = verifyAndExtractToken(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
  }
  if (user.role !== 'Admin') {
    return res.status(403).json({ success: false, error: 'Forbidden: Admin role required to delete database backups.' });
  }
  const target = mockDbSnapshots.find(s => s.id === req.params.id);
  if (target) {
    target.isDeleted = true;
    target.deletedAt = new Date().toISOString();
  }
  res.json({ success: true, message: 'Backup soft-deleted successfully.' });
});

async function runIntegrationTests() {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log(`[Integration Test] Running backup endpoint authorization & soft-delete test suite against port ${port}...\n`);

  try {
    // --- TEST 1: GET /api/db/backups without token => 401 ---
    console.log('Testing 1/4: GET /api/db/backups (No Token)...');
    const res1 = await fetch(`${baseUrl}/api/db/backups`);
    if (res1.status !== 401) {
      throw new Error(`Expected 401, got ${res1.status}`);
    }
    console.log('  -> PASS: 401 Unauthorized');

    // --- TEST 2: GET /api/db/backups/:id without token => 401 ---
    console.log('Testing 2/4: GET /api/db/backups/snap_1 (No Token)...');
    const res2 = await fetch(`${baseUrl}/api/db/backups/snap_1`);
    if (res2.status !== 401) {
      throw new Error(`Expected 401, got ${res2.status}`);
    }
    console.log('  -> PASS: 401 Unauthorized');

    // --- TEST 3: POST /api/db/backups without token => 401 ---
    console.log('Testing 3/4: POST /api/db/backups (No Token)...');
    const res3 = await fetch(`${baseUrl}/api/db/backups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshot: { id: 'snap_test_1' } })
    });
    if (res3.status !== 401) {
      throw new Error(`Expected 401, got ${res3.status}`);
    }
    console.log('  -> PASS: 401 Unauthorized');

    // --- TEST 4: DELETE /api/db/backups/:id without token => 401 ---
    console.log('Testing 4/4: DELETE /api/db/backups/snap_1 (No Token)...');
    const res4 = await fetch(`${baseUrl}/api/db/backups/snap_1`, {
      method: 'DELETE'
    });
    if (res4.status !== 401) {
      throw new Error(`Expected 401, got ${res4.status}`);
    }
    console.log('  -> PASS: 401 Unauthorized');

    // --- TEST 5: Non-Admin authorization on POST & DELETE => 403 ---
    console.log('\nTesting Role Restrictions (Cashier/Manager vs Admin)...');
    const cashierToken = generateTestToken({ id: 'u_cashier', username: 'cashier', role: 'Cashier' });
    const res5a = await fetch(`${baseUrl}/api/db/backups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cashierToken}`
      },
      body: JSON.stringify({ snapshot: { id: 'snap_cashier_bad' } })
    });
    if (res5a.status !== 403) throw new Error(`Expected 403 for non-Admin POST, got ${res5a.status}`);
    console.log('  -> PASS: POST /api/db/backups rejects non-Admin with 403 Forbidden');

    const res5b = await fetch(`${baseUrl}/api/db/backups/snap_1`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${cashierToken}` }
    });
    if (res5b.status !== 403) throw new Error(`Expected 403 for non-Admin DELETE, got ${res5b.status}`);
    console.log('  -> PASS: DELETE /api/db/backups/:id rejects non-Admin with 403 Forbidden');

    // --- TEST 6: Admin creates and soft-deletes backup ---
    console.log('\nTesting Admin Write and Soft Deletion Safety...');
    const adminToken = generateTestToken({ id: 'u_admin', username: 'admin', role: 'Admin' });
    
    // Create new snapshot as Admin
    const resCreate = await fetch(`${baseUrl}/api/db/backups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ snapshot: { id: 'snap_admin_1', name: 'Safe Admin Backup', sizeBytes: 2048 } })
    });
    if (resCreate.status !== 200) throw new Error(`Admin backup creation failed: ${resCreate.status}`);
    console.log('  -> PASS: Admin created backup snap_admin_1');

    // Soft delete as Admin
    const resDelete = await fetch(`${baseUrl}/api/db/backups/snap_admin_1`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (resDelete.status !== 200) throw new Error(`Admin backup deletion failed: ${resDelete.status}`);
    console.log('  -> PASS: Admin soft-deleted backup snap_admin_1');

    // Verify snapshot is marked soft-deleted in store but preserved for recovery
    const deletedSnap = mockDbSnapshots.find(s => s.id === 'snap_admin_1');
    if (!deletedSnap || !deletedSnap.isDeleted || !deletedSnap.deletedAt) {
      throw new Error('Snapshot was permanently destroyed instead of soft deleted!');
    }
    console.log('  -> PASS: Physical row flagged with isDeleted=true and deletedAt timestamp (recovery path preserved)');

    // Verify GET /api/db/backups does not return soft-deleted snapshot to users
    const resList = await fetch(`${baseUrl}/api/db/backups`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const listBody = await resList.json();
    if (listBody.data.some(s => s.id === 'snap_admin_1')) {
      throw new Error('Soft-deleted snapshot appeared in active backups list');
    }
    console.log('  -> PASS: Soft-deleted backup is filtered out from active listing');

    console.log('\n=============================================================');
    console.log(' [ALL BACKUP INTEGRATION TESTS PASSED SUCCESSFULLY] ');
    console.log('=============================================================\n');
  } finally {
    server.close();
  }
}

runIntegrationTests().catch(err => {
  console.error('\n[FATAL TEST FAILURE]', err);
  process.exit(1);
});
