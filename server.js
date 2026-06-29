import express from 'express';
import path from 'path';
import fs from 'fs';
import http from 'http';
import https from 'https';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// SSL Certificate configurations for local secure deployments (such as PM2 HTTPS)
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || path.join(__dirname, 'key.pem');
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || path.join(__dirname, 'cert.pem');

let useSsl = false;
let sslOptions = {};

try {
  if (fs.existsSync(SSL_KEY_PATH) && fs.existsSync(SSL_CERT_PATH)) {
    sslOptions = {
      key: fs.readFileSync(SSL_KEY_PATH),
      cert: fs.readFileSync(SSL_CERT_PATH),
    };
    useSsl = true;
  }
} catch (error) {
  console.warn('[Shared DB Server] SSL config detected but could not load files:', error.message);
}

// Increase body payload size limit to accommodate larger database files (images, logs, catalogs)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Path to store the offline server database
const DB_FILE_PATH = path.join(__dirname, 'server-db.json');

// Helper to read database safely
const readDatabase = () => {
  try {
    if (!fs.existsSync(DB_FILE_PATH)) {
      return {};
    }
    const data = fs.readFileSync(DB_FILE_PATH, 'utf-8');
    return JSON.parse(data || '{}');
  } catch (error) {
    console.error('[Shared DB Server] Error reading server-db.json:', error);
    return {};
  }
};

// Helper to write database safely with atomic updates
const writeDatabase = (data) => {
  try {
    const tempPath = `${DB_FILE_PATH}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, DB_FILE_PATH);
    return true;
  } catch (error) {
    console.error('[Shared DB Server] Error writing server-db.json:', error);
    return false;
  }
};

// Global Promise lock to execute all read-modify-write database operations atomically
let dbLockPromise = Promise.resolve();

const runInTransaction = async (operationFn) => {
  const nextLock = dbLockPromise.then(async () => {
    try {
      return await operationFn();
    } catch (err) {
      console.error('[Transaction Lock] Operation error:', err);
      throw err;
    }
  });
  dbLockPromise = nextLock.catch(() => {});
  return nextLock;
};

const SECRET = "TILEPOINT_SECURE_PERIMETER_HMAC_SECRET_2026";

function sha256Pure(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function verifyAndExtractToken(req) {
  const authHeader = req.headers['authorization'];
  let token = req.headers['x-session-token'];

  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (!token) {
    return null;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadBase64, signature] = parts;
    const expectedSignature = sha256Pure(payloadBase64 + "." + SECRET);

    if (signature !== expectedSignature) {
      console.warn("[Security Alert] Cryptographic signature mismatch on session token.");
      return null;
    }

    const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
    const payload = JSON.parse(payloadJson);

    // Enforce expiry within 24 hours
    if (Date.now() - payload.timestamp > 24 * 60 * 60 * 1000) {
      console.warn("[Security Alert] Session token has expired.");
      return null;
    }

    return payload; // { id, username, role, timestamp }
  } catch (err) {
    console.error("[Security error] Token extraction failed:", err);
    return null;
  }
}

const isDatabaseConfigured = () => {
  const db = readDatabase();
  return db['tp_is_configured'] === 'true' || db['tp_is_configured'] === true;
};


// API: Get entire shared database
app.get('/api/db', (req, res) => {
  const db = readDatabase();
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    data: db
  });
});

// API: Append-Only Transaction Log Delta Processor
app.post('/api/db/delta', async (req, res) => {
  const delta = req.body;
  if (!delta || !delta.type || !delta.id) {
    return res.status(400).json({ success: false, error: 'Invalid transaction delta payload' });
  }

  if (isDatabaseConfigured()) {
    const user = verifyAndExtractToken(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Valid session token or identity header required.' });
    }

    const payload = delta.payload || {};
    const key = payload.key;

    // Check specific table RBAC
    if (key === 'tp_users') {
      if (user.role !== 'Admin') {
        return res.status(403).json({ success: false, error: 'Forbidden: Role-Management updates are strictly restricted to system administrators.' });
      }
    } else if (key === 'atpos_v2_expenses') {
      if (user.role !== 'Admin' && user.role !== 'Manager') {
        return res.status(403).json({ success: false, error: 'Forbidden: Expenses management is restricted to Administrators and Managers.' });
      }
    } else if (['tp_branches', 'tp_products', 'tp_suppliers', 'tp_brands', 'tp_purchase_orders', 'tp_po_items'].includes(key)) {
      if (user.role !== 'Admin' && user.role !== 'Manager') {
        return res.status(403).json({ success: false, error: 'Forbidden: Central resource configuration is restricted to Admin/Manager accounts.' });
      }
    } else if (key === 'tp_db_snapshots') {
      if (user.role !== 'Admin') {
        return res.status(403).json({ success: false, error: 'Forbidden: Database backups/restore is restricted to Admins.' });
      }
    }
  }

  try {
    const result = await runInTransaction(async () => {
      const db = readDatabase();
      
      // Initialize processed delta tracker
      if (!db.tp_processed_delta_ids) {
        db.tp_processed_delta_ids = [];
      }
      
      // Idempotency guard: If delta was already executed, return success immediately
      if (db.tp_processed_delta_ids.includes(delta.id)) {
        console.log(`[Shared DB Server] Delta ${delta.id} already processed. Skipping...`);
        return { success: true, alreadyProcessed: true };
      }

      console.log(`[Shared DB Server] Processing Delta [${delta.type}] ID: ${delta.id}`);

      const getCollection = (colKey) => {
        if (!db[colKey] || !Array.isArray(db[colKey])) {
          db[colKey] = [];
        }
        return db[colKey];
      };

      const payload = delta.payload || {};
      const key = payload.key;

      switch (delta.type) {
        case 'APPEND_SALE':
        case 'APPEND_SALE_ITEM':
        case 'APPEND_MOVEMENT':
        case 'APPEND_AUDIT_LOG':
        case 'APPEND_LEDGER_ENTRY':
        case 'APPEND_EXPENSE':
        case 'APPEND_ROW': {
          const row = payload.row;
          if (row && row.id && key) {
            const list = getCollection(key);
            const existingIdx = list.findIndex(item => item.id === row.id);
            if (existingIdx === -1) {
              list.unshift(row); // Prepend new records
            } else {
              list[existingIdx] = row; // Update in place if duplicate
            }
          }
          break;
        }

        case 'UPDATE_ROW': {
          const row = payload.row;
          if (row && row.id && key) {
            const list = getCollection(key);
            const existingIdx = list.findIndex(item => item.id === row.id);
            if (existingIdx !== -1) {
              list[existingIdx] = row;
            } else {
              list.push(row);
            }
          }
          break;
        }

        case 'INCREMENT_STOCK': {
          const { id, productId, branchId, change } = payload;
          const changeVal = Number(change) || 0;
          
          if (productId) {
            const products = getCollection('tp_products');
            const pIdx = products.findIndex(p => p.id === productId);
            if (pIdx !== -1) {
              products[pIdx].stockQuantity = (products[pIdx].stockQuantity || 0) + changeVal;
              products[pIdx].updatedAt = new Date().toISOString();
            }
          }
          
          if (id && key === 'tp_branch_stock') {
            const branchStock = getCollection('tp_branch_stock');
            const bsIdx = branchStock.findIndex(bs => bs.id === id);
            if (bsIdx !== -1) {
              branchStock[bsIdx].quantity = (branchStock[bsIdx].quantity || 0) + changeVal;
            } else if (branchId && productId) {
              branchStock.push({
                id,
                branchId,
                productId,
                quantity: changeVal
              });
            }
          }
          break;
        }

        case 'DECREMENT_STOCK': {
          const { id, productId, branchId, change } = payload;
          const changeVal = Number(change) || 0;
          
          if (productId) {
            const products = getCollection('tp_products');
            const pIdx = products.findIndex(p => p.id === productId);
            if (pIdx !== -1) {
              products[pIdx].stockQuantity = Math.max(0, (products[pIdx].stockQuantity || 0) - changeVal);
              products[pIdx].updatedAt = new Date().toISOString();
            }
          }
          
          if (id && key === 'tp_branch_stock') {
            const branchStock = getCollection('tp_branch_stock');
            const bsIdx = branchStock.findIndex(bs => bs.id === id);
            if (bsIdx !== -1) {
              branchStock[bsIdx].quantity = Math.max(0, (branchStock[bsIdx].quantity || 0) - changeVal);
            } else if (branchId && productId) {
              branchStock.push({
                id,
                branchId,
                productId,
                quantity: 0
              });
            }
          }
          break;
        }

        default:
          console.warn(`[Shared DB Server] Unknown delta type: ${delta.type}`);
          break;
      }

      // Record this delta ID to ensure idempotency
      db.tp_processed_delta_ids.push(delta.id);
      if (db.tp_processed_delta_ids.length > 5000) {
        db.tp_processed_delta_ids.shift();
      }

      if (writeDatabase(db)) {
        return { success: true };
      } else {
        throw new Error('Failed to commit database write');
      }
    });

    res.json(result);
  } catch (error) {
    console.error('[Shared DB Server] Delta processing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Save single key-value state to shared database (Legacy Fallback)
app.post('/api/db', async (req, res) => {
  const { key, value } = req.body;
  if (!key) {
    return res.status(400).json({ success: false, error: 'Key is required' });
  }

  if (isDatabaseConfigured()) {
    const user = verifyAndExtractToken(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Valid session token or identity header required.' });
    }

    // Check specific table RBAC
    if (key === 'tp_users') {
      if (user.role !== 'Admin') {
        return res.status(403).json({ success: false, error: 'Forbidden: Role-Management updates are strictly restricted to system administrators.' });
      }
    } else if (key === 'atpos_v2_expenses') {
      if (user.role !== 'Admin' && user.role !== 'Manager') {
        return res.status(403).json({ success: false, error: 'Forbidden: Expenses management is restricted to Administrators and Managers.' });
      }
    } else if (['tp_branches', 'tp_products', 'tp_suppliers', 'tp_brands', 'tp_purchase_orders', 'tp_po_items'].includes(key)) {
      if (user.role !== 'Admin' && user.role !== 'Manager') {
        return res.status(403).json({ success: false, error: 'Forbidden: Central resource configuration is restricted to Admin/Manager accounts.' });
      }
    } else if (key === 'tp_db_snapshots') {
      if (user.role !== 'Admin') {
        return res.status(403).json({ success: false, error: 'Forbidden: Database backups/restore is restricted to Admins.' });
      }
    }
  }

  try {
    const result = await runInTransaction(async () => {
      const db = readDatabase();
      db[key] = value;
      if (writeDatabase(db)) {
        return { success: true, key };
      } else {
        throw new Error('Failed to write key to database');
      }
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Save multiple keys at once (bulk sync)
app.post('/api/db/bulk', async (req, res) => {
  const { data } = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ success: false, error: 'Payload object data is required' });
  }

  if (isDatabaseConfigured()) {
    const user = verifyAndExtractToken(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Valid session token or identity header required.' });
    }

    // Since bulk writes multiple keys, check each key being modified
    const keys = Object.keys(data);
    for (const key of keys) {
      if (key === 'tp_users') {
        if (user.role !== 'Admin') {
          return res.status(403).json({ success: false, error: 'Forbidden: Role-Management updates via bulk sync are restricted to system administrators.' });
        }
      } else if (key === 'atpos_v2_expenses') {
        if (user.role !== 'Admin' && user.role !== 'Manager') {
          return res.status(403).json({ success: false, error: 'Forbidden: Expenses updates via bulk sync are restricted to Administrators and Managers.' });
        }
      } else if (['tp_branches', 'tp_products', 'tp_suppliers', 'tp_brands', 'tp_purchase_orders', 'tp_po_items'].includes(key)) {
        if (user.role !== 'Admin' && user.role !== 'Manager') {
          return res.status(403).json({ success: false, error: 'Forbidden: Resource updates via bulk sync are restricted to Admin/Manager accounts.' });
        }
      } else if (key === 'tp_db_snapshots') {
        if (user.role !== 'Admin') {
          return res.status(403).json({ success: false, error: 'Forbidden: Database backups/restore via bulk sync are restricted to Admins.' });
        }
      }
    }
  }

  try {
    const result = await runInTransaction(async () => {
      const db = readDatabase();
      Object.keys(data).forEach((key) => {
        db[key] = data[key];
      });
      if (writeDatabase(db)) {
        return { success: true, count: Object.keys(data).length };
      } else {
        throw new Error('Failed to write bulk data to database');
      }
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Reset / Purge shared database
app.post('/api/db/truncate', (req, res) => {
  const { mode } = req.body; // 'seeds' | 'transactions' | 'all'

  if (isDatabaseConfigured()) {
    const user = verifyAndExtractToken(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Valid session token or identity header required.' });
    }
    if (user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Forbidden: Resetting or truncating the database is strictly restricted to system administrators.' });
    }
  }
  
  if (!fs.existsSync(DB_FILE_PATH)) {
    return res.json({ success: true, message: 'Database was already clean' });
  }

  const db = readDatabase();
  
  if (mode === 'all') {
    // Delete the file to start fresh
    try {
      fs.unlinkSync(DB_FILE_PATH);
      return res.json({ success: true, message: 'Truncated entire database file.' });
    } catch (e) {
      return res.status(500).json({ success: false, error: 'Truncation error' });
    }
  }

  const keysToPurge = [
    'tp_purchase_orders', 'tp_po_items', 'tp_transmittals', 'tp_shifts',
    'tp_sales', 'tp_sale_items', 'tp_movements', 'tp_audit_logs',
    'tp_parked_sales', 'tp_stock_transfers', 'tp_ledger_entries',
    'tp_branch_sales_reports', 'tp_deliveries', 'tp_damage_logs'
  ];

  if (mode === 'transactions') {
    keysToPurge.forEach(k => delete db[k]);
    // Reset product stock counts back to 0
    if (db['tp_products'] && Array.isArray(db['tp_products'])) {
      db['tp_products'] = db['tp_products'].map(p => ({ ...p, stockQuantity: 0 }));
    }
    if (db['tp_branch_stock'] && Array.isArray(db['tp_branch_stock'])) {
      db['tp_branch_stock'] = db['tp_branch_stock'].map(s => ({ ...s, quantity: 0 }));
    }
  } else if (mode === 'seeds') {
    // Wipe configuration entirely to trigger re-seeding
    delete db['tp_is_configured'];
    delete db['tilepoint_onboarded_setup'];
    keysToPurge.forEach(k => delete db[k]);
    delete db['tp_products'];
    delete db['tp_branch_stock'];
    delete db['tp_suppliers'];
    delete db['tp_branches'];
  }

  if (writeDatabase(db)) {
    res.json({ success: true, mode });
  } else {
    res.status(500).json({ success: false, error: 'Failed to rewrite database' });
  }
});

// Vite middleware setup or production static files
if (process.env.NODE_ENV !== 'production') {
  console.log('[Shared DB Server] Running in DEVELOPMENT mode with Vite middleware...');
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });
  app.use(vite.middlewares);
} else {
  console.log('[Shared DB Server] Running in PRODUCTION mode serving static files...');
  // Serve static files from the Vite production build directory
  app.use(express.static(path.join(__dirname, 'dist')));
  
  // SPA route fallback (redirects all other requests to index.html)
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

let server;
if (useSsl) {
  server = https.createServer(sslOptions, app);
} else {
  server = http.createServer(app);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`========================================`);
  console.log(`   TILEPOINT SHARED DATABASE SERVER     `);
  console.log(`========================================`);
  console.log(`Server Port         : ${PORT}`);
  console.log(`Security Mode       : ${useSsl ? 'HTTPS (SSL Secured)' : 'HTTP (Standard)'}`);
  if (useSsl) {
    console.log(`Admin PC Access     : https://localhost:${PORT}`);
    console.log(`Staff Mobile Access : https://192.168.1.38:${PORT}`);
  } else {
    console.log(`Admin PC Access     : http://localhost:${PORT}`);
    console.log(`Staff Mobile Access : http://192.168.1.38:${PORT}`);
  }
  console.log(`========================================`);
});
