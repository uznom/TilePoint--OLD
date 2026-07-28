import express from 'express';
import path from 'path';
import fs from 'fs';
import http from 'http';
import https from 'https';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Simple request debug log to understand failing client fetches
app.use((req, res, next) => {
  const logFile = path.join(__dirname, 'server-debug.log');
  const logEntry = `[${new Date().toISOString()}] ${req.method} ${req.url} - IP: ${req.ip} - UA: ${req.headers['user-agent']}\n`;
  try {
    fs.appendFileSync(logFile, logEntry);
  } catch (err) {}
  next();
});

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

// --- SOLID CORS & PREFLIGHT MIDDLEWARE ---
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Session-Token, X-Client-ID');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Increase body payload size limit to accommodate larger database files (images, logs, catalogs)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// --- SECURITY & ANTI-CRAWLER SHIELD MIDDLEWARE ---
app.use((req, res, next) => {
  // 1. Inject strict robots headers into all responses to prevent indexing of files, assets, and APIs
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  const clientIp = req.ip || req.connection.remoteAddress || '';
  const isLocalhost = clientIp.includes('127.0.0.1') || clientIp.includes('::1') || clientIp.includes('localhost');

  // List of blocked AI/LLM crawlers and search engine indexing bots
  const crawlerBots = [
    'gptbot', 'chatgpt-user', 'chatgpt', 'ccbot', 'anthropic-ai', 'claude-web', 'cohere-ai',
    'google-extended', 'googlebot-image', 'googlebot-news', 'mediapartners-google', 'adsbot-google',
    'bingbot', 'msnbot', 'yandexbot', 'yandex', 'baiduspider', 'sogou', 'exabot', 'facebot',
    'facebookexternalhit', 'twitterbot', 'slackbot', 'telegrambot', 'applebot', 'embedly',
    'quora', 'pinterest', 'linkedinbot', 'perplexibot', 'youbot', 'rogersbot', 'showyoubot'
  ];

  // List of automated headless scraping engines and programming libraries
  const scraperTools = [
    'python-requests', 'beautifulsoup', 'scrapy', 'selenium', 'puppeteer', 'playwright',
    'headlesschrome', 'got-lite', 'got', 'node-fetch', 'okhttp', 'libwww', 'wget', 'httrack',
    'ucl_crawler', 'webcopier', 'webstripper', 'teleport', 'harvest', 'grabber', 'scraper',
    'crawler', 'spider', 'robot'
  ];

  // Allow all internal API endpoints (/api/*) and standard application routes
  if (req.path.startsWith('/api/')) {
    return next();
  }

  // Check if user agent matches any known indexing bots
  const isBot = crawlerBots.some(bot => userAgent.includes(bot));
  
  // Check if user agent is a developer scraper/automation script (only block if not localhost/debugging)
  const isScraper = scraperTools.some(tool => userAgent.includes(tool)) && !isLocalhost;

  if (isBot || isScraper) {
    console.warn(`[Anti-Crawler Shield] Blocked suspicious request from IP: ${clientIp} - UA: "${req.headers['user-agent']}"`);
    return res.status(403).json({
      error: 'Access Denied',
      message: 'This secure system is shielded from automated crawlers, scrapers, search indexing engines, and bot activity to safeguard proprietary transactional records.'
    });
  }

  next();
});
// -------------------------------------------------

// Path to store the offline server database
const DB_FILE_PATH = path.join(__dirname, 'server-db.json');

// Helper to read database safely
let memoryDbCache = null;
let memoryDbHash = '';

const computeDatabaseHash = (dbObj) => {
  try {
    const rawStr = JSON.stringify(dbObj, (key, value) => {
      if (key === 'tp_db_snapshots' || key === 'tp_processed_delta_ids') return undefined;
      return value;
    });
    return crypto.createHash('md5').update(rawStr).digest('hex');
  } catch (err) {
    return String(Date.now());
  }
};

const readDatabase = () => {
  try {
    if (!fs.existsSync(DB_FILE_PATH)) {
      return {};
    }
    const data = fs.readFileSync(DB_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(data || '{}');
    memoryDbCache = parsed;
    memoryDbHash = computeDatabaseHash(parsed);
    return parsed;
  } catch (error) {
    console.error('[Shared DB Server] Error reading server-db.json:', error);
    return {};
  }
};

const getCachedDatabase = () => {
  if (!memoryDbCache) {
    readDatabase();
  }
  return { db: memoryDbCache || {}, hash: memoryDbHash || '' };
};

// Real-time clients array and notifier
let clients = [];
const notifyClients = (type, info, senderClientId) => {
  const payload = JSON.stringify({ type, info });
  clients.forEach(client => {
    if (senderClientId && client.id === senderClientId) {
      console.log(`[Real-Time Sync] Skipping broadcast notification for sender client "${senderClientId}"`);
      return;
    }
    try {
      client.res.write(`data: ${payload}\n\n`);
    } catch (e) {
      // client connection is dead
    }
  });
};

// Global SSE Keep-Alive ping to prevent proxy/browser idle disconnects
setInterval(() => {
  clients.forEach(client => {
    try {
      // Send standard SSE comment ping to keep connection open
      client.res.write(': keep-alive\n\n');
    } catch (e) {
      // client connection is dead
    }
  });
}, 15000);

// Helper to write database safely with atomic updates
const writeDatabase = (data, senderClientId, eventType = 'db_update') => {
  try {
    memoryDbCache = data;
    memoryDbHash = computeDatabaseHash(data);
    const tempPath = `${DB_FILE_PATH}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    try {
      fs.renameSync(tempPath, DB_FILE_PATH);
    } catch (renameError) {
      console.warn('[Shared DB Server] Atomic rename failed, falling back to direct write (typically for Windows file lock/permission conditions):', renameError.message);
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
      try {
        fs.unlinkSync(tempPath);
      } catch (unlinkError) {}
    }
    // Broadcast real-time change to all active cashier/staff devices, skipping the sender
    notifyClients(eventType, { hash: memoryDbHash }, senderClientId);
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

let SECRET = process.env.VITE_SECURITY_SECRET || process.env.SECURITY_SECRET;
if (!SECRET || SECRET.trim() === "" || SECRET.length < 16) {
  SECRET = "tile_point_salt_retneC eliT nammE_secure_fallback";
}

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
    console.warn("[Security Alert] Token is missing from the request headers.");
    return null;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 2) {
      console.warn("[Security Alert] Token structure is invalid (must have 2 parts).");
      return null;
    }

    const [payloadBase64, signature] = parts;
    const expectedSignature = sha256Pure(payloadBase64 + "." + SECRET);

    if (signature !== expectedSignature) {
      console.warn("[Security Alert] Cryptographic signature mismatch on session token.");
      return null;
    }

    const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
    const payload = JSON.parse(payloadJson);

    // Enforce expiry/skew within a more generous window (7 days) to prevent clock drift issues
    const drift = Math.abs(Date.now() - payload.timestamp);
    if (drift > 7 * 24 * 60 * 60 * 1000) {
      console.warn(`[Security Alert] Session token has expired or clock drift is too large. Server: ${Date.now()}, Payload: ${payload.timestamp}, Drift: ${drift}ms`);
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


// SSE real-time event subscription endpoint
app.get('/api/db/events', (req, res) => {
  const clientId = req.query.clientId || 'anonymous';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Send initial connected ping
  res.write(`data: ${JSON.stringify({ type: 'handshake', info: { connected: true } })}\n\n`);

  clients.push({ id: clientId, res });

  req.on('close', () => {
    clients = clients.filter(c => c.res !== res);
  });
});

// API: Get entire shared database (optimally excluding heavy backup snapshots)
app.get('/api/db', (req, res) => {
  const { db, hash } = getCachedDatabase();
  const clientHash = req.query.hash || req.headers['if-none-match'];

  if (clientHash && clientHash === hash) {
    return res.json({
      success: true,
      unchanged: true,
      hash: hash,
      timestamp: new Date().toISOString()
    });
  }

  const dbCopy = { ...db };
  delete dbCopy.tp_db_snapshots; // completely decouple backups to keep general sync lightweight
  delete dbCopy.tp_processed_delta_ids; // exclude server-only delta IDs to keep sync payload compact
  res.json({
    success: true,
    unchanged: false,
    hash: hash,
    timestamp: new Date().toISOString(),
    data: dbCopy
  });
});

// API: Optimized Get backups/snapshots list (with metadataOnly support for lightweight fetching)
app.get('/api/db/backups', (req, res) => {
  const db = readDatabase();
  const snapshots = db.tp_db_snapshots || [];
  
  const metadataOnly = req.query.metadataOnly === 'true';
  if (metadataOnly) {
    const list = snapshots.map(s => ({
      id: s.id,
      name: s.name,
      timestamp: s.timestamp,
      creator: s.creator,
      sizeBytes: s.sizeBytes
    }));
    return res.json({ success: true, data: list });
  }
  
  res.json({ success: true, data: snapshots });
});

// API: Get single full snapshot details (including the heavy data body on-demand)
app.get('/api/db/backups/:id', (req, res) => {
  const db = readDatabase();
  const snapshots = db.tp_db_snapshots || [];
  const snapshot = snapshots.find(s => s.id === req.params.id);
  
  if (!snapshot) {
    return res.status(404).json({ success: false, error: 'Snapshot not found' });
  }
  
  res.json({ success: true, data: snapshot });
});

// API: Save heavy snapshot directly on the server (bypassing Client LocalStorage limit)
app.post('/api/db/backups', express.json({ limit: '100mb' }), async (req, res) => {
  const { snapshot } = req.body;
  if (!snapshot || !snapshot.id) {
    return res.status(400).json({ success: false, error: 'Invalid snapshot payload' });
  }

  try {
    const result = await runInTransaction(async () => {
      const db = readDatabase();
      if (!db.tp_db_snapshots) {
        db.tp_db_snapshots = [];
      }
      
      // Prevent duplicates and append
      db.tp_db_snapshots = db.tp_db_snapshots.filter(s => s.id !== snapshot.id);
      db.tp_db_snapshots.unshift(snapshot);
      
      // Retain a healthy buffer on server (e.g., last 50 historical snapshots instead of just 2!)
      if (db.tp_db_snapshots.length > 50) {
        db.tp_db_snapshots = db.tp_db_snapshots.slice(0, 50);
      }
      
      if (writeDatabase(db, req.headers['x-client-id'], 'db_update')) {
        return { success: true, id: snapshot.id };
      } else {
        throw new Error('Failed to write snapshot to server database');
      }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Delete single snapshot
app.delete('/api/db/backups/:id', async (req, res) => {
  try {
    const result = await runInTransaction(async () => {
      const db = readDatabase();
      if (!db.tp_db_snapshots) {
        db.tp_db_snapshots = [];
      }
      
      db.tp_db_snapshots = db.tp_db_snapshots.filter(s => s.id !== req.params.id);
      
      if (writeDatabase(db, req.headers['x-client-id'], 'db_update')) {
        return { success: true };
      } else {
        throw new Error('Failed to update server database after delete');
      }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
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

      if (writeDatabase(db, req.headers['x-client-id'])) {
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

  if (isDatabaseConfigured() && key !== 'tp_bootstrap_init') {
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
      if (key === 'tp_bootstrap_init') {
        if (value && typeof value === 'object') {
          Object.keys(value).forEach((k) => {
            db[k] = value[k];
          });
        }
        db['tp_is_configured'] = 'true';
        db['tilepoint_onboarded_setup'] = 'false';
      } else {
        db[key] = value;
      }
      // Isolate active sessions heartbeat from triggering full DB updates
      const eventType = key === 'tp_active_sessions' ? 'session_update' : 'db_update';
      if (writeDatabase(db, req.headers['x-client-id'], eventType)) {
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

  const isSetupPayload = data && (
    data.tilepoint_onboarded_setup !== undefined ||
    data.tp_bootstrap_init !== undefined ||
    data.tp_is_configured !== undefined
  );
  if (isDatabaseConfigured() && !isSetupPayload) {
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
      if (writeDatabase(db, req.headers['x-client-id'])) {
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
