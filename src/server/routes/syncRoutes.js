import express from 'express';
import {
  isDatabaseConfiguredStore,
  readFullDatabase,
  getCachedDbHash,
  getIsDbCacheDirty
} from '../db/dbHelpers.js';
import {
  verifyAndExtractToken
} from '../services/authService.js';
import {
  computeCollectionHash,
  computeAllCollectionHashes,
  extractDeltaChanges
} from '../services/cdcSyncService.js';

const router = express.Router();

// API: Incremental CDC Delta Sync Endpoint (GET)
router.get(['/delta', '/db/delta-sync'], async (req, res) => {
  try {
    const configured = await isDatabaseConfiguredStore();
    if (configured) {
      const user = verifyAndExtractToken(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
      }
    }

    const sinceTimestamp = req.query.since || req.query.sinceTimestamp;
    const clientHash = req.query.hash || req.query.globalHash;
    const branchId = req.query.branchId;

    const cachedHash = getCachedDbHash();
    if (clientHash && cachedHash && clientHash === cachedHash && !getIsDbCacheDirty()) {
      res.setHeader('ETag', `"${cachedHash}"`);
      res.setHeader('Cache-Control', 'private, no-cache');
      return res.json({
        success: true,
        unchanged: true,
        hash: cachedHash,
        timestamp: new Date().toISOString()
      });
    }

    const { db, hash } = await readFullDatabase();
    res.setHeader('ETag', `"${hash}"`);
    res.setHeader('Cache-Control', 'private, no-cache');

    if (clientHash && clientHash === hash) {
      return res.json({
        success: true,
        unchanged: true,
        hash: hash,
        timestamp: new Date().toISOString()
      });
    }

    const deltaResult = extractDeltaChanges(db, {
      sinceTimestamp,
      branchId
    });

    res.json({
      ...deltaResult,
      globalHash: hash
    });
  } catch (err) {
    console.error('[CDC Sync] Delta sync error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Granular Collection-Level Watermark Diffing (POST)
router.post('/delta/query', async (req, res) => {
  try {
    const configured = await isDatabaseConfiguredStore();
    if (configured) {
      const user = verifyAndExtractToken(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
      }
    }

    const { since, clientHashes = {}, branchId, globalHash } = req.body || {};

    const cachedHash = getCachedDbHash();
    if (globalHash && cachedHash && globalHash === cachedHash && !getIsDbCacheDirty()) {
      return res.json({
        success: true,
        unchanged: true,
        hash: cachedHash,
        timestamp: new Date().toISOString()
      });
    }

    const { db, hash } = await readFullDatabase();

    if (globalHash && globalHash === hash) {
      return res.json({
        success: true,
        unchanged: true,
        hash: hash,
        timestamp: new Date().toISOString()
      });
    }

    const deltaResult = extractDeltaChanges(db, {
      sinceTimestamp: since,
      clientHashes,
      branchId
    });

    res.json({
      ...deltaResult,
      globalHash: hash
    });
  } catch (err) {
    console.error('[CDC Sync] Delta query error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Get Current Table Watermarks & Collection Checksums
router.get('/watermarks', async (req, res) => {
  try {
    const configured = await isDatabaseConfiguredStore();
    if (configured) {
      const user = verifyAndExtractToken(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
      }
    }

    const { db, hash } = await readFullDatabase();
    const collectionHashes = computeAllCollectionHashes(db);

    res.setHeader('Cache-Control', 'private, no-cache');
    res.json({
      success: true,
      globalHash: hash,
      collectionHashes,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Fast Single Collection Sync (Targeted Fetch)
router.get('/collection/:key', async (req, res) => {
  try {
    const configured = await isDatabaseConfiguredStore();
    if (configured) {
      const user = verifyAndExtractToken(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
      }
    }

    const key = req.params.key;
    const clientHash = req.query.hash;

    const { db, hash } = await readFullDatabase();
    const collectionData = db[key] !== undefined ? db[key] : [];
    const collectionHash = computeCollectionHash(collectionData);

    if (clientHash && clientHash === collectionHash) {
      return res.json({
        success: true,
        unchanged: true,
        key,
        hash: collectionHash,
        globalHash: hash
      });
    }

    res.json({
      success: true,
      unchanged: false,
      key,
      hash: collectionHash,
      globalHash: hash,
      data: collectionData
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
