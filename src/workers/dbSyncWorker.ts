// Background Web Worker for Database Sync & Serialization
// Offloads heavy JSON serialization, array merging, deep equality diffing, and hash generation from main UI thread.

export interface OptimisticStockItem {
  key: string;
  quantity: number;
  lastSaleCommitTime: number;
  version?: number;
}

export interface ProcessSyncResponsePayload {
  db: Record<string, any>;
  collectionStates: Record<string, any>;
  localStoredCollections: Record<string, any>;
  volatileCache: Record<string, string>;
  deletedParkedSaleIds: string[];
  optimisticStockEntries: OptimisticStockItem[];
  currentActiveSessions?: any[];
  isLoggedIn?: boolean;
  currentUser?: any;
  activeSessionId?: string | null;
}

export interface WorkerMessageRequest {
  id: string;
  type: 'PROCESS_SYNC_RESPONSE' | 'PREPARE_BULK_PAYLOAD' | 'SERIALIZE_DATA';
  syncPayload?: ProcessSyncResponsePayload;
  bulkPayload?: any;
  serializeData?: any;
}

export interface CollectionResult {
  merged: any[];
  mergedStr: string;
  hasChanged: boolean;
  serverWasEmpty: boolean;
}

export interface WorkerMessageResponse {
  id: string;
  type: 'SYNC_RESPONSE_PROCESSED' | 'BULK_PAYLOAD_READY' | 'SERIALIZE_DATA_READY' | 'ERROR';
  error?: string;
  nonCollectionWrites?: Record<string, string>;
  collections?: Record<string, CollectionResult>;
  calendarNotes?: any;
  calendarNotesChanged?: boolean;
  dayMemos?: any;
  dayMemosChanged?: boolean;
  updatedSessions?: any[];
  activeSessionsChanged?: boolean;
  isConfiguredValue?: boolean;
  isConfiguredChanged?: boolean;
  serialized?: string;
  volatileUpdates?: Record<string, string>;
}

const collectionKeys = [
  "tp_users",
  "tp_branches",
  "tp_suppliers",
  "tp_brands",
  "tp_products",
  "tp_purchase_orders",
  "tp_po_items",
  "tp_transmittals",
  "tp_shifts",
  "tp_sales",
  "tp_sale_items",
  "tp_movements",
  "tp_audit_logs",
  "tp_parked_sales",
  "tp_stock_transfers",
  "tp_branch_stock",
  "tp_ledger_entries",
  "tp_branch_sales_reports",
  "tp_deliveries",
  "tp_damage_logs",
  "atpos_v2_custom_bills",
  "atpos_v2_members_list",
  "atpos_v2_expenses",
  "atpos_v2_returns",
  "atpos_v2_calendar_notes",
  "atpos_v2_calendar_day_memos"
];

const safeParse = <T = any>(str: any, fallback: T): T => {
  if (typeof str !== "string") return (str as T) || fallback;
  try {
    return JSON.parse(str) as T;
  } catch (_) {
    return fallback;
  }
};

const areEntitiesEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    if (a.length > 50) {
      if (!areEntitiesEqual(a[0], b[0])) return false;
      if (!areEntitiesEqual(a[a.length - 1], b[b.length - 1])) return false;
      if (!areEntitiesEqual(a[Math.floor(a.length / 2)], b[Math.floor(a.length / 2)])) return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!areEntitiesEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === "object") {
    const keysA = Object.keys(a).filter((k) => a[k] !== undefined);
    const keysB = Object.keys(b).filter((k) => b[k] !== undefined);
    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!areEntitiesEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return a === b;
};

const getItemKey = (item: any): string | null => {
  if (!item || typeof item !== "object") return null;
  if (item.id) return String(item.id).toLowerCase();
  if (item.branchId && item.productId)
    return `${String(item.branchId).toLowerCase()}_${String(item.productId).toLowerCase()}`;
  if (item.username) return String(item.username).toLowerCase();
  if (item.code) return String(item.code).toLowerCase();
  return null;
};

const mergeCollections = (
  a: any[],
  b: any[],
  optimisticStockMap: Map<string, OptimisticStockItem>
): any[] => {
  if (!Array.isArray(a) || a.length === 0) return Array.isArray(b) ? b : [];
  if (!Array.isArray(b) || b.length === 0) return a;

  const map = new Map<string, any>();
  a.forEach((item) => {
    const key = getItemKey(item);
    if (key) {
      map.set(key, item);
      if (item.username) {
        map.set(`user:${String(item.username).toLowerCase()}`, item);
      }
    }
  });

  b.forEach((item) => {
    const key = getItemKey(item);
    if (key) {
      const unameKey = item.username ? `user:${String(item.username).toLowerCase()}` : null;
      const existing = map.get(key) || (unameKey ? map.get(unameKey) : null);
      let merged = item;
      if (existing) {
        const exVer = Number(existing.version) || 0;
        const inVer = Number(item.version) || 0;
        const exTime = existing.updatedAt || existing.timestamp || existing.createdAt;
        const inTime = item.updatedAt || item.timestamp || item.createdAt;
        const exMs = exTime ? new Date(exTime).getTime() : 0;
        const inMs = inTime ? new Date(inTime).getTime() : 0;

        let keepExisting = false;
        if (exVer > inVer) {
          keepExisting = true;
        } else if (inVer > exVer) {
          keepExisting = false;
        } else if (exMs > inMs) {
          keepExisting = true;
        } else if (inMs > exMs) {
          keepExisting = false;
        } else {
          // When version and timestamps are equal, preserve local state so unsynced updates aren't lost
          keepExisting = true;
        }

        const optBsKey = item.branchId && item.productId ? `bs:${item.branchId}:${item.productId}` : null;
        const optProdKey = !item.branchId && item.id ? `prod:${item.id}` : null;
        const optBs = optBsKey ? optimisticStockMap.get(optBsKey) : null;
        const optProd = optProdKey ? optimisticStockMap.get(optProdKey) : null;
        const activeOpt = optBs || optProd;

        if (activeOpt && Date.now() - activeOpt.lastSaleCommitTime < 60000) {
          keepExisting = true;
        }

        if (keepExisting) {
          merged = { ...item, ...existing };
          if (activeOpt && optBs) {
            merged.quantity = activeOpt.quantity;
            if (activeOpt.version) merged.version = Math.max(merged.version || 0, activeOpt.version);
          } else if (activeOpt && optProd) {
            merged.stockQuantity = activeOpt.quantity;
            if (activeOpt.version) merged.version = Math.max(merged.version || 0, activeOpt.version);
          }
        } else {
          merged = { ...existing, ...item };
        }
      }
      map.set(key, merged);
      if (unameKey) map.set(unameKey, merged);
    }
  });

  const result: any[] = [];
  const seen = new Set<string>();
  map.forEach((item, key) => {
    if (!key.startsWith("user:") && item) {
      const itemKey = getItemKey(item);
      if (itemKey && !seen.has(itemKey)) {
        seen.add(itemKey);
        result.push(item);
      }
    }
  });
  return result;
};

const getCreatedAt = (item: any): number => {
  if (item && item.createdAt) return Number(item.createdAt);
  if (item && item.id && item.id.startsWith("HLD-")) {
    const parts = item.id.split("-");
    if (parts.length > 1) {
      const ts = Number(parts[1]);
      if (!isNaN(ts)) return ts;
    }
  }
  return 0;
};

const mergeParkedSales = (local: any[], remote: any[], deletedSet?: Set<string>): any[] => {
  if (!Array.isArray(local)) local = [];
  if (!Array.isArray(remote)) remote = [];
  
  const map = new Map<string, any>();
  remote.forEach((item) => {
    if (item && item.id && (!deletedSet || !deletedSet.has(item.id))) {
      map.set(item.id, { ...item, synced: true });
    }
  });
  local.forEach((localItem) => {
    if (localItem && localItem.id && (!deletedSet || !deletedSet.has(localItem.id))) {
      if (!map.has(localItem.id)) {
        const isRecentlyCreatedUnsynced = !localItem.synced && (Date.now() - (localItem.createdAt || 0) < 60000);
        if (isRecentlyCreatedUnsynced) {
          map.set(localItem.id, localItem);
        }
      } else {
        const remoteItem = map.get(localItem.id);
        const localTs = localItem.createdAt || getCreatedAt(localItem) || 0;
        const remoteTs = remoteItem?.createdAt || getCreatedAt(remoteItem) || 0;
        if (localTs > remoteTs) {
          map.set(localItem.id, { ...localItem, synced: true });
        }
      }
    }
  });
  return Array.from(map.values());
};

const isBlockedKey = (k: string, valStr: string): boolean => {
  const lowerKey = k.toLowerCase();
  return (
    k === "tp_current_user" ||
    k === "tp_is_logged_in" ||
    k === "tp_session_token" ||
    k === "tp_active_session_id" ||
    k === "tp_active_tab" ||
    (k === "tp_is_configured" && valStr !== '"false"' && valStr !== 'false') ||
    lowerKey.includes("active_tab") ||
    lowerKey.includes("active_filter") ||
    lowerKey.includes("navigation") ||
    lowerKey.includes("filter_") ||
    lowerKey.includes("theme") ||
    lowerKey.includes("contrast") ||
    lowerKey.includes("sidebar") ||
    lowerKey.includes("animation") ||
    lowerKey.includes("blur") ||
    (lowerKey.startsWith("tilepoint_") &&
      k !== "tilepoint_onboarded_setup" &&
      k !== "tilepoint_company_name_v1" &&
      k !== "tilepoint_primary_branch_id" &&
      k !== "tilepoint_store_logo_v1") ||
    lowerKey.includes("tp_active_cart")
  );
};

// Handle Worker Input Messages
self.onmessage = (event: MessageEvent<WorkerMessageRequest>) => {
  const { id, type } = event.data;

  try {
    if (type === 'PROCESS_SYNC_RESPONSE') {
      const payload = event.data.syncPayload;
      if (!payload) {
        self.postMessage({ id, type: 'ERROR', error: 'Missing sync payload' });
        return;
      }

      const {
        db,
        collectionStates,
        localStoredCollections,
        volatileCache,
        deletedParkedSaleIds,
        optimisticStockEntries,
        currentActiveSessions,
        isLoggedIn,
        currentUser,
        activeSessionId
      } = payload;

      const optimisticMap = new Map<string, OptimisticStockItem>();
      if (Array.isArray(optimisticStockEntries)) {
        optimisticStockEntries.forEach(entry => {
          if (entry && entry.key) optimisticMap.set(entry.key, entry);
        });
      }

      const deletedParkedSet = new Set<string>(deletedParkedSaleIds || []);
      const nonCollectionWrites: Record<string, string> = {};
      const collections: Record<string, CollectionResult> = {};

      // 1. Process Non-Collection Keys
      Object.keys(db).forEach((k) => {
        if (collectionKeys.includes(k)) return;

        const valStr = typeof db[k] === "string" ? db[k] : JSON.stringify(db[k]);
        if (isBlockedKey(k, valStr)) return;

        if (volatileCache[k] !== valStr) {
          nonCollectionWrites[k] = valStr;
        }
      });

      // 2. Process Collections
      const activeCollectionNames = [
        "tp_users", "tp_branches", "tp_suppliers", "tp_brands", "tp_products",
        "tp_purchase_orders", "tp_po_items", "tp_transmittals", "tp_shifts",
        "tp_sales", "tp_sale_items", "tp_movements", "tp_audit_logs",
        "tp_parked_sales", "tp_stock_transfers", "tp_branch_stock",
        "tp_ledger_entries", "tp_branch_sales_reports", "tp_deliveries",
        "tp_damage_logs", "atpos_v2_custom_bills", "atpos_v2_members_list",
        "atpos_v2_expenses", "atpos_v2_returns"
      ];

      const rawIsConfigured = db["tp_is_configured"];
      const isUnconfiguredOrReset = rawIsConfigured === false || rawIsConfigured === "false" || rawIsConfigured === 0 || rawIsConfigured === "0";

      activeCollectionNames.forEach((key) => {
        if (db[key] !== undefined) {
          const rawServer = typeof db[key] === "string" ? safeParse(db[key], []) : db[key];
          const serverArr = Array.isArray(rawServer) ? rawServer : [];

          const currentState = collectionStates[key] || [];
          const localStored = localStoredCollections[key] || [];
          const localArr = (Array.isArray(currentState) && currentState.length > 0)
            ? currentState
            : (Array.isArray(localStored) ? localStored : []);

          let merged: any[] = [];
          if (isUnconfiguredOrReset) {
            merged = serverArr;
          } else if (key === "tp_parked_sales") {
            merged = mergeParkedSales(localArr, serverArr, deletedParkedSet);
          } else {
            merged = mergeCollections(localArr, serverArr, optimisticMap);
          }

          const mergedStr = JSON.stringify(merged);
          const hasChanged = !areEntitiesEqual(currentState, merged);
          const serverWasEmpty = !isUnconfiguredOrReset && (merged.length > serverArr.length || (localArr.length > 0 && serverArr.length === 0 && merged.length > 0));

          collections[key] = {
            merged,
            mergedStr,
            hasChanged,
            serverWasEmpty
          };
        }
      });

      // 3. Calendar Notes & Memos
      let calendarNotes: any;
      let calendarNotesChanged = false;
      if (db["atpos_v2_calendar_notes"] !== undefined) {
        calendarNotes = db["atpos_v2_calendar_notes"];
        calendarNotesChanged = !areEntitiesEqual(collectionStates["atpos_v2_calendar_notes"], calendarNotes);
      }

      let dayMemos: any;
      let dayMemosChanged = false;
      if (db["atpos_v2_calendar_day_memos"] !== undefined) {
        dayMemos = db["atpos_v2_calendar_day_memos"];
        dayMemosChanged = !areEntitiesEqual(collectionStates["atpos_v2_calendar_day_memos"], dayMemos);
      }

      // 4. Active Sessions
      let updatedSessions: any[] | undefined;
      let activeSessionsChanged = false;
      if (db["tp_active_sessions"]) {
        const parsedSessions = typeof db["tp_active_sessions"] === "string"
          ? safeParse(db["tp_active_sessions"], [])
          : db["tp_active_sessions"];

        let tempSessions = Array.isArray(parsedSessions) ? [...parsedSessions] : [];
        if (isLoggedIn && currentUser && activeSessionId && Array.isArray(currentActiveSessions)) {
          const myLocalSession = currentActiveSessions.find(s => s.id === activeSessionId);
          const existsInServer = tempSessions.some(s => s.id === activeSessionId);

          if (myLocalSession) {
            if (!existsInServer) {
              tempSessions.push(myLocalSession);
            } else {
              tempSessions = tempSessions.map(s => {
                if (s.id === activeSessionId) {
                  const serverTime = new Date(s.lastActive).getTime();
                  const localTime = new Date(myLocalSession.lastActive).getTime();
                  if (localTime > serverTime) {
                    return { ...s, lastActive: myLocalSession.lastActive };
                  }
                }
                return s;
              });
            }
          }
        }
        updatedSessions = tempSessions;
        activeSessionsChanged = !areEntitiesEqual(currentActiveSessions, updatedSessions);
      }

      // 5. Configured Flag
      let isConfiguredValue: boolean | undefined;
      let isConfiguredChanged = false;
      if (db["tp_is_configured"] !== undefined) {
        isConfiguredValue = db["tp_is_configured"] === "true" || db["tp_is_configured"] === true;
      }

      const response: WorkerMessageResponse = {
        id,
        type: 'SYNC_RESPONSE_PROCESSED',
        nonCollectionWrites,
        collections,
        calendarNotes,
        calendarNotesChanged,
        dayMemos,
        dayMemosChanged,
        updatedSessions,
        activeSessionsChanged,
        isConfiguredValue,
        isConfiguredChanged
      };

      self.postMessage(response);
    } else if (type === 'PREPARE_BULK_PAYLOAD') {
      const payload = event.data.bulkPayload;
      const serialized = JSON.stringify({ data: payload });
      const volatileUpdates: Record<string, string> = {};

      if (payload && typeof payload === 'object') {
        Object.keys(payload).forEach((k) => {
          const val = payload[k];
          volatileUpdates[k] = typeof val === "string" ? val : JSON.stringify(val);
        });
      }

      self.postMessage({
        id,
        type: 'BULK_PAYLOAD_READY',
        serialized,
        volatileUpdates
      });
    } else if (type === 'SERIALIZE_DATA') {
      const serialized = JSON.stringify(event.data.serializeData);
      self.postMessage({
        id,
        type: 'SERIALIZE_DATA_READY',
        serialized
      });
    }
  } catch (err: any) {
    self.postMessage({
      id,
      type: 'ERROR',
      error: err?.message || String(err)
    });
  }
};
