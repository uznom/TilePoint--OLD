import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

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

// API: Get entire shared database
app.get('/api/db', (req, res) => {
  const db = readDatabase();
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    data: db
  });
});

// API: Save single key-value state to shared database
app.post('/api/db', (req, res) => {
  const { key, value } = req.body;
  if (!key) {
    return res.status(400).json({ success: false, error: 'Key is required' });
  }

  const db = readDatabase();
  db[key] = value;
  
  if (writeDatabase(db)) {
    res.json({ success: true, key });
  } else {
    res.status(500).json({ success: false, error: 'Failed to write data' });
  }
});

// API: Save multiple keys at once (bulk sync)
app.post('/api/db/bulk', (req, res) => {
  const { data } = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ success: false, error: 'Payload object data is required' });
  }

  const db = readDatabase();
  Object.keys(data).forEach((key) => {
    db[key] = data[key];
  });

  if (writeDatabase(db)) {
    res.json({ success: true, count: Object.keys(data).length });
  } else {
    res.status(500).json({ success: false, error: 'Failed to write bulk data' });
  }
});

// API: Reset / Purge shared database
app.post('/api/db/truncate', (req, res) => {
  const { mode } = req.body; // 'seeds' | 'transactions' | 'all'
  
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

// Serve static files from the Vite production build directory
app.use(express.static(path.join(__dirname, 'dist')));

// SPA route fallback (redirects all other requests to index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`========================================`);
  console.log(`   TILEPOINT SHARED DATABASE SERVER     `);
  console.log(`========================================`);
  console.log(`Server Port         : ${PORT}`);
  console.log(`Admin PC Access     : http://localhost:${PORT}`);
  console.log(`Staff Mobile Access : http://192.168.1.38:${PORT}`);
  console.log(`========================================`);
});
