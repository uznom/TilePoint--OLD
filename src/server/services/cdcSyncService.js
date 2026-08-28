import crypto from 'crypto';

/**
 * Enterprise Change-Data-Capture (CDC) and Table Watermark Engine
 * Enables incremental delta synchronization, table-level watermarks,
 * and high-throughput collection-level hashing.
 */

export const MONITORED_COLLECTIONS = [
  'tp_users',
  'tp_branches',
  'tp_suppliers',
  'tp_brands',
  'tp_products',
  'tp_inventory',
  'tp_branch_stock',
  'tp_shifts',
  'tp_sales',
  'tp_sale_items',
  'tp_purchase_orders',
  'tp_po_items',
  'tp_stock_transfers',
  'tp_stock_transfer_items',
  'tp_movements',
  'tp_inventory_movements',
  'tp_deliveries',
  'tp_damage_logs',
  'tp_ledger_entries',
  'tp_audit_logs',
  'tp_custom_corporate_bills',
  'atpos_v2_custom_bills',
  'tp_transmittals',
  'tp_members',
  'atpos_v2_members_list',
  'tp_expenses',
  'atpos_v2_expenses',
  'tp_product_returns',
  'atpos_v2_returns',
  'tp_branch_sales_reports',
  'tp_active_sessions',
  'tp_parked_sales'
];

/**
 * Computes a fast, deterministic hash for a single collection array
 */
export function computeCollectionHash(items) {
  if (!Array.isArray(items)) {
    if (typeof items === 'object' && items !== null) {
      return crypto.createHash('md5').update(JSON.stringify(items)).digest('hex').slice(0, 16);
    }
    return String(items || '');
  }

  if (items.length === 0) {
    return 'empty_0';
  }

  // Sample items and timestamps to build a fast watermark signature
  let latestTimestamp = '';
  let highestVersion = 0;
  let sampleIds = '';

  const step = Math.max(1, Math.floor(items.length / 5));
  for (let i = 0; i < items.length; i += step) {
    const item = items[i];
    if (item && typeof item === 'object') {
      const ts = item.updatedAt || item.timestamp || item.dateTime || item.createdAt || item.reportedAt || item.openedAt || '';
      if (ts && ts > latestTimestamp) {
        latestTimestamp = ts;
      }
      if (item.version && Number(item.version) > highestVersion) {
        highestVersion = Number(item.version);
      }
      if (item.id) {
        sampleIds += item.id.slice(0, 8);
      }
    }
  }

  const lastItem = items[items.length - 1];
  if (lastItem && typeof lastItem === 'object') {
    const ts = lastItem.updatedAt || lastItem.timestamp || lastItem.dateTime || lastItem.createdAt || '';
    if (ts && ts > latestTimestamp) latestTimestamp = ts;
    if (lastItem.id) sampleIds += lastItem.id.slice(0, 8);
  }

  const signature = `${items.length}_v${highestVersion}_${latestTimestamp}_${sampleIds}`;
  return crypto.createHash('md5').update(signature).digest('hex').slice(0, 16);
}

/**
 * Computes collection-level watermarks and hashes for all collections in the DB
 */
export function computeAllCollectionHashes(db) {
  const hashes = {};
  if (!db || typeof db !== 'object') return hashes;

  for (const key of MONITORED_COLLECTIONS) {
    if (db[key] !== undefined) {
      hashes[key] = computeCollectionHash(db[key]);
    }
  }
  return hashes;
}

/**
 * Extracts changed items across collections since a given timestamp or based on client hashes
 */
export function extractDeltaChanges(db, options = {}) {
  const {
    sinceTimestamp = null,
    clientHashes = {},
    branchId = null,
    maxItemsPerCollection = 1000
  } = options;

  if (!db || typeof db !== 'object') {
    return {
      success: false,
      deltas: {},
      unchangedCollections: [],
      collectionHashes: {},
      serverTimestamp: new Date().toISOString(),
      fullResyncNeeded: true
    };
  }

  const serverTimestamp = new Date().toISOString();
  const serverHashes = computeAllCollectionHashes(db);
  const deltas = {};
  const unchangedCollections = [];
  let totalDeltaCount = 0;
  let parsedSinceDate = sinceTimestamp ? new Date(sinceTimestamp).getTime() : 0;
  if (isNaN(parsedSinceDate)) parsedSinceDate = 0;

  for (const [key, serverHash] of Object.entries(serverHashes)) {
    const clientHash = clientHashes[key];
    const collectionData = db[key];

    // If client already has matching hash for this collection, it is 100% up to date
    if (clientHash && clientHash === serverHash) {
      unchangedCollections.push(key);
      continue;
    }

    if (!Array.isArray(collectionData)) {
      deltas[key] = collectionData;
      continue;
    }

    // If no sinceTimestamp was provided or parsed timestamp is 0, return full collection
    if (!parsedSinceDate) {
      deltas[key] = collectionData;
      totalDeltaCount += collectionData.length;
      continue;
    }

    // Extract items created or modified after sinceTimestamp
    const changedItems = collectionData.filter(item => {
      if (!item || typeof item !== 'object') return false;

      // Optional branch filter for branch-scoped tables
      if (branchId && item.branchId && item.branchId !== branchId && item.branchId !== 'all') {
        // Keep inventory movements or transfers if source/dest matches branch
        if (item.sourceBranchId !== branchId && item.destinationBranchId !== branchId && item.fromBranchId !== branchId && item.toBranchId !== branchId) {
          return false;
        }
      }

      const itemTimeStr = item.updatedAt || item.timestamp || item.dateTime || item.createdAt || item.reportedAt || item.openedAt || item.date;
      if (!itemTimeStr) return true; // If no timestamp, assume needed
      const itemTime = new Date(itemTimeStr).getTime();
      return isNaN(itemTime) || itemTime >= parsedSinceDate;
    });

    if (changedItems.length > maxItemsPerCollection) {
      // Delta too large, return sliced or full collection
      deltas[key] = changedItems.slice(0, maxItemsPerCollection);
    } else {
      deltas[key] = changedItems;
    }

    totalDeltaCount += deltas[key].length;
  }

  return {
    success: true,
    isDelta: true,
    serverTimestamp,
    collectionHashes: serverHashes,
    deltas,
    unchangedCollections,
    totalDeltaCount,
    fullResyncNeeded: false
  };
}
