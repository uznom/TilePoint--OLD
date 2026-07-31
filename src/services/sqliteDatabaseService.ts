/**
 * SQLite Database Service Module
 *
 * Provides a high-performance service interface to the 'better-sqlite3' persistent
 * SQLite database engine running on the TilePoint server backend.
 * Replaces direct reliance on fragile browser-only localStorage for core ERP operations.
 */

export interface BranchStockRecord {
  id: string;
  productName: string;
  productCode: string;
  sku?: string;
  barcode?: string;
  category?: string;
  brand?: string;
  unitOfMeasure?: string;
  stockQuantity: number;
  branchStockId?: string;
  branchQuantity?: number;
  branchLowStockThreshold?: number;
  sellingPriceOverride?: number;
  costPrice?: number;
  sellingPrice?: number;
  [key: string]: any;
}

export interface SaleItemPayload {
  id: string;
  saleId?: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discountAmount?: number;
  discountType?: string;
  tileBoxQuantity?: number;
  sqmArea?: number;
  [key: string]: any;
}

export interface SaleRecordPayload {
  id: string;
  saleNumber: string;
  branchId: string;
  cashierId?: string;
  cashierName?: string;
  shiftId?: string;
  customerId?: string;
  customerName?: string;
  subtotal: number;
  taxAmount?: number;
  discountTotal?: number;
  grandTotal: number;
  paymentMethod: string;
  paymentStatus: string;
  items: SaleItemPayload[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface AuditTrailPayload {
  id?: string;
  action: string;
  category?: string;
  details: string | Record<string, any>;
  performerId?: string;
  performerName?: string;
  branchId?: string;
  entityId?: string;
  entityType?: string;
  createdAt?: string;
}

export interface SqliteStatusResponse {
  success: boolean;
  engine: string;
  dbPath: string;
  sizeBytes: number;
  sizeFormatted: string;
  totalTables: number;
  totalRecords: number;
  tableCounts: Record<string, number>;
  journalMode: string;
  error?: string;
}

class SqliteDatabaseService {
  private activeBranchId: string = 'B1';
  private stockCache: Map<string, { data: BranchStockRecord[]; count: number; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MS = 5000; // 5s short-term cache for rapid UI stock checks

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('tp_active_branch_id');
      if (stored) {
        this.activeBranchId = stored;
      }
    }
  }

  public setActiveBranch(branchId: string): void {
    this.activeBranchId = branchId;
    this.clearStockCache();
    if (typeof window !== 'undefined') {
      localStorage.setItem('tp_active_branch_id', branchId);
    }
  }

  public getActiveBranch(): string {
    return this.activeBranchId;
  }

  public clearStockCache(): void {
    this.stockCache.clear();
  }

  /**
   * Fetches real-time branch stock levels with indexed database lookups and high-frequency caching.
   */
  public async fetchBranchStocks(
    branchId?: string,
    options: {
      productId?: string;
      sku?: string;
      barcode?: string;
      search?: string;
      category?: string;
      limit?: number;
      offset?: number;
      bypassCache?: boolean;
    } = {}
  ): Promise<{ success: boolean; count: number; data: BranchStockRecord[]; error?: string }> {
    try {
      const targetBranch = branchId || this.activeBranchId;
      const cacheKey = `${targetBranch}:${options.productId || ''}:${options.sku || ''}:${options.barcode || ''}:${options.category || ''}:${options.search || ''}:${options.limit || 200}:${options.offset || 0}`;

      if (!options.bypassCache) {
        const cached = this.stockCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
          return { success: true, count: cached.count, data: cached.data };
        }
      }

      const params = new URLSearchParams();
      params.set('branchId', targetBranch);
      if (options.productId) params.set('productId', options.productId);
      if (options.sku) params.set('sku', options.sku);
      if (options.barcode) params.set('barcode', options.barcode);
      if (options.search) params.set('search', options.search);
      if (options.category) params.set('category', options.category);
      if (options.limit) params.set('limit', options.limit.toString());
      if (options.offset) params.set('offset', options.offset.toString());

      const res = await fetch(`/api/sqlite/branch-stock?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        this.stockCache.set(cacheKey, { data: json.data, count: json.count || json.data.length, timestamp: Date.now() });
      }
      return json;
    } catch (err: any) {
      console.warn('[SqliteDatabaseService] fetchBranchStocks failed, falling back to /api/db/inventory/lookup:', err.message);
      try {
        const fallbackParams = new URLSearchParams({ branchId: branchId || this.activeBranchId });
        if (options.search) fallbackParams.set('search', options.search);
        const fbRes = await fetch(`/api/db/inventory/lookup?${fallbackParams.toString()}`);
        const fbJson = await fbRes.json();
        return { success: fbJson.success || false, count: fbJson.data?.length || 0, data: fbJson.data || [] };
      } catch (fbErr: any) {
        return { success: false, count: 0, data: [], error: err.message };
      }
    }
  }

  /**
   * Fast targeted product stock retrieval by Product ID using SQLite indexes.
   */
  public async fetchSingleProductStock(
    productId: string,
    branchId?: string
  ): Promise<BranchStockRecord | null> {
    const res = await this.fetchBranchStocks(branchId, { productId, limit: 1 });
    if (res.success && res.data && res.data.length > 0) {
      return res.data[0];
    }
    return null;
  }

  /**
   * Saves a POS sale transaction atomically into better-sqlite3.
   * Updates inventory levels and logs audit movements in a single transaction, then invalidates stock cache.
   */
  public async saveSaleLog(
    salePayload: SaleRecordPayload
  ): Promise<{ success: boolean; id?: string; message?: string; error?: string }> {
    try {
      const res = await fetch('/api/sqlite/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salePayload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      this.clearStockCache();
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.error('[SqliteDatabaseService] saveSaleLog failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Records an audit trail log entry into the better-sqlite3 engine.
   */
  public async logAuditTrail(
    audit: AuditTrailPayload
  ): Promise<{ success: boolean; id?: string; audit?: any; error?: string }> {
    try {
      const payload = {
        ...audit,
        branchId: audit.branchId || this.activeBranchId,
        createdAt: audit.createdAt || new Date().toISOString()
      };

      const res = await fetch('/api/sqlite/audit-trails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err: any) {
      console.error('[SqliteDatabaseService] logAuditTrail failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Retrieves audit trails and inventory movements from better-sqlite3 using indexed filtering.
   */
  public async getAuditTrails(
    filters: {
      branchId?: string;
      module?: string;
      performerId?: string;
      referenceId?: string;
      startDate?: string;
      endDate?: string;
      entityType?: string;
      limit?: number;
    } = {}
  ): Promise<{ success: boolean; count: number; data: any[]; error?: string }> {
    try {
      const params = new URLSearchParams();
      if (filters.branchId || this.activeBranchId) params.set('branchId', filters.branchId || this.activeBranchId);
      if (filters.module) params.set('module', filters.module);
      if (filters.performerId) params.set('performerId', filters.performerId);
      if (filters.referenceId) params.set('referenceId', filters.referenceId);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (filters.entityType) params.set('entityType', filters.entityType);
      if (filters.limit) params.set('limit', filters.limit.toString());

      const res = await fetch(`/api/sqlite/audit-trails?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      return { success: false, count: 0, data: [], error: err.message };
    }
  }

  /**
   * Retrieves stock transfers from better-sqlite3 using indexed branchId and timestamp filtering.
   */
  public async getStockTransfers(
    filters: {
      branchId?: string;
      fromBranchId?: string;
      toBranchId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    } = {}
  ): Promise<{ success: boolean; count: number; data: any[]; error?: string }> {
    try {
      const params = new URLSearchParams();
      if (filters.branchId || this.activeBranchId) params.set('branchId', filters.branchId || this.activeBranchId);
      if (filters.fromBranchId) params.set('fromBranchId', filters.fromBranchId);
      if (filters.toBranchId) params.set('toBranchId', filters.toBranchId);
      if (filters.status) params.set('status', filters.status);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (filters.limit) params.set('limit', filters.limit.toString());

      const res = await fetch(`/api/sqlite/stock-transfers?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      return { success: false, count: 0, data: [], error: err.message };
    }
  }

  /**
   * Saves or updates a stock transfer record atomically into better-sqlite3.
   */
  public async saveStockTransfer(
    transferPayload: Record<string, any>
  ): Promise<{ success: boolean; id?: string; message?: string; error?: string }> {
    try {
      const res = await fetch('/api/sqlite/stock-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transferPayload)
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err: any) {
      console.error('[SqliteDatabaseService] saveStockTransfer failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Retrieves current better-sqlite3 database health metrics, WAL status, index count, and storage size.
   */
  public async getDatabaseStatus(): Promise<SqliteStatusResponse> {
    try {
      const res = await fetch('/api/db/sqlite-status');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      return {
        success: false,
        engine: 'better-sqlite3',
        dbPath: '',
        sizeBytes: 0,
        sizeFormatted: '0.00 MB',
        totalTables: 0,
        totalRecords: 0,
        tableCounts: {},
        journalMode: 'UNKNOWN',
        error: err.message
      };
    }
  }
}

export const sqliteDatabaseService = new SqliteDatabaseService();
export default sqliteDatabaseService;
