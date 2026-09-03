/**
 * MySQL Database Service Module
 *
 * Provides a high-performance, resilient client interface to the MySQL database engine
 * running on the TilePoint server backend.
 * Handles high-frequency real-time stock lookups, atomic POS transactions, audit trails,
 * and stock transfers directly via MySQL endpoints.
 */

import { BranchStockRecordSchema, AuditLogSchema, safeParseApiArray } from '../types/schemas';

export interface BranchStockRecord {
  id: string;
  productName: string;
  productCode: string;
  sku?: string;
  product_sku?: string;
  category_id?: string;
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
  customerAddress?: string;
  customerTin?: string;
  businessStyle?: string;
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

export interface MysqlStatusResponse {
  success: boolean;
  engine: string;
  active: boolean;
  host: string;
  database: string;
  totalTables: number;
  totalRecords: number;
  tableCounts: Record<string, number>;
  poolStatus?: {
    connectionLimit: number;
    activeConnections?: number;
    idleConnections?: number;
  };
  error?: string;
}

class MysqlDatabaseService {
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

  private getHeaders(contentType?: string): Record<string, string> {
    const headers: Record<string, string> = {};
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('tp_session_token') || sessionStorage.getItem('tp_session_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['X-Session-Token'] = token;
      }
      const clientId = localStorage.getItem('tp_active_session_id') || sessionStorage.getItem('tp_active_session_id');
      if (clientId) {
        headers['X-Client-ID'] = clientId;
      }
    }
    return headers;
  }

  /**
   * Fetches real-time branch stock levels with indexed MySQL database lookups.
   * Leverages explicit indexes on (product_sku, category_id, sku, category, branchId).
   */
  public async fetchBranchStocks(
    branchId?: string,
    options: {
      productId?: string;
      sku?: string;
      product_sku?: string;
      barcode?: string;
      search?: string;
      category?: string;
      category_id?: string;
      limit?: number;
      offset?: number;
      bypassCache?: boolean;
    } = {}
  ): Promise<{ success: boolean; count: number; data: BranchStockRecord[]; error?: string }> {
    try {
      const targetBranch = branchId || this.activeBranchId;
      const targetSku = options.product_sku || options.sku || '';
      const targetCat = options.category_id || options.category || '';
      const cacheKey = `${targetBranch}:${options.productId || ''}:${targetSku}:${options.barcode || ''}:${targetCat}:${options.search || ''}:${options.limit !== undefined ? options.limit : 200}:${options.offset !== undefined ? options.offset : 0}`;

      if (!options.bypassCache) {
        const cached = this.stockCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
          return { success: true, count: cached.count, data: cached.data };
        }
      }

      const params = new URLSearchParams();
      params.set('branchId', targetBranch);
      if (options.productId) params.set('productId', options.productId);
      if (options.product_sku) params.set('product_sku', options.product_sku);
      if (options.sku) params.set('sku', options.sku);
      if (options.barcode) params.set('barcode', options.barcode);
      if (options.search) params.set('search', options.search);
      if (options.category_id) params.set('category_id', options.category_id);
      if (options.category) params.set('category', options.category);
      if (options.limit !== undefined) params.set('limit', options.limit.toString());
      if (options.offset !== undefined) params.set('offset', options.offset.toString());

      const res = await fetch(`/api/db/branch-stock?${params.toString()}`, {
        headers: this.getHeaders()
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const validatedData = safeParseApiArray(BranchStockRecordSchema, json.data) as unknown as BranchStockRecord[];
        this.stockCache.set(cacheKey, { data: validatedData, count: json.count || validatedData.length, timestamp: Date.now() });
        return { ...json, data: validatedData, count: validatedData.length };
      }
      return json;
    } catch (err: any) {
      console.warn('[MysqlDatabaseService] fetchBranchStocks failed, falling back to /api/db/inventory/lookup:', err.message);
      try {
        const fallbackParams = new URLSearchParams({ branchId: branchId || this.activeBranchId });
        if (options.search) fallbackParams.set('search', options.search);
        if (options.sku || options.product_sku) fallbackParams.set('sku', (options.product_sku || options.sku)!);
        if (options.category || options.category_id) fallbackParams.set('category', (options.category_id || options.category)!);
        const fbRes = await fetch(`/api/db/inventory/lookup?${fallbackParams.toString()}`, {
          headers: this.getHeaders()
        });
        if (!fbRes.ok) {
          throw new Error(`HTTP ${fbRes.status}`, { cause: err });
        }
        const fbJson = await fbRes.json();
        const validatedFallback = safeParseApiArray(BranchStockRecordSchema, fbJson.data || []) as unknown as BranchStockRecord[];
        return { success: fbJson.success || false, count: validatedFallback.length, data: validatedFallback };
      } catch (fbErr: any) {
        return { success: false, count: 0, data: [], error: fbErr?.message || err?.message || 'Lookup failed' };
      }
    }
  }

  /**
   * Directly queries the inventory table leveraging explicit product_sku and category_id indexes.
   * Ideal for large data operations, bulk imports, and catalog searches.
   */
  public async fetchInventoryBySkuOrCategory(options: {
    product_sku?: string;
    category_id?: string;
    sku?: string;
    category?: string;
    branchId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ success: boolean; count: number; data: BranchStockRecord[]; error?: string }> {
    try {
      const params = new URLSearchParams();
      if (options.product_sku) params.set('product_sku', options.product_sku);
      if (options.sku) params.set('sku', options.sku);
      if (options.category_id) params.set('category_id', options.category_id);
      if (options.category) params.set('category', options.category);
      if (options.branchId) params.set('branchId', options.branchId);
      if (options.search) params.set('search', options.search);
      if (options.limit !== undefined) params.set('limit', options.limit.toString());
      if (options.offset !== undefined) params.set('offset', options.offset.toString());

      const res = await fetch(`/api/db/inventory?${params.toString()}`, {
        headers: this.getHeaders()
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err: any) {
      console.warn('[MysqlDatabaseService] fetchInventoryBySkuOrCategory fallback to branch-stock:', err.message);
      return this.fetchBranchStocks(options.branchId, options);
    }
  }

  /**
   * Fast targeted product stock retrieval by Product ID using MySQL indexes.
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
   * Saves a POS sale transaction atomically into MySQL.
   * Updates inventory levels and logs audit movements in MySQL transactions, then invalidates stock cache.
   */
  public async saveSaleLog(
    salePayload: SaleRecordPayload
  ): Promise<{ success: boolean; id?: string; message?: string; error?: string }> {
    try {
      const res = await fetch('/api/db/sales', {
        method: 'POST',
        headers: this.getHeaders('application/json'),
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
      console.error('[MysqlDatabaseService] saveSaleLog failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Records an audit trail log entry into MySQL.
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

      const res = await fetch('/api/db/audit-trails', {
        method: 'POST',
        headers: this.getHeaders('application/json'),
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err: any) {
      console.error('[MysqlDatabaseService] logAuditTrail failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Retrieves audit trails and inventory movements from MySQL using indexed filtering.
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
      if (filters.limit !== undefined) params.set('limit', filters.limit.toString());

      const res = await fetch(`/api/db/audit-trails?${params.toString()}`, {
        headers: this.getHeaders()
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const validated = safeParseApiArray(AuditLogSchema, json.data);
        return { ...json, data: validated, count: validated.length };
      }
      return json;
    } catch (err: any) {
      return { success: false, count: 0, data: [], error: err.message };
    }
  }

  /**
   * Retrieves stock transfers from MySQL using indexed branchId and timestamp filtering.
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
      if (filters.limit !== undefined) params.set('limit', filters.limit.toString());

      const res = await fetch(`/api/db/stock-transfers?${params.toString()}`, {
        headers: this.getHeaders()
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err: any) {
      return { success: false, count: 0, data: [], error: err.message };
    }
  }

  /**
   * Saves or updates a stock transfer record atomically into MySQL.
   */
  public async saveStockTransfer(
    transferPayload: Record<string, any>
  ): Promise<{ success: boolean; id?: string; message?: string; error?: string }> {
    try {
      const res = await fetch('/api/db/stock-transfers', {
        method: 'POST',
        headers: this.getHeaders('application/json'),
        body: JSON.stringify(transferPayload)
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
      this.clearStockCache();
      return await res.json();
    } catch (err: any) {
      console.error('[MysqlDatabaseService] saveStockTransfer failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Flushes offline outbox mutations to the backend inside a single atomic ACID batch transaction.
   */
  public async syncOfflineBatchMutations(options: {
    mutations: Array<{
      id: string;
      type: string;
      payload: any;
      timestamp?: string;
    }>;
    terminalId?: string;
    branchId?: string;
  }): Promise<{
    success: boolean;
    total: number;
    processed: number;
    skipped: number;
    failed: number;
    hash?: string;
    error?: string;
  }> {
    try {
      const res = await fetch('/api/db/sync-batch', {
        method: 'POST',
        headers: this.getHeaders('application/json'),
        body: JSON.stringify({
          mutations: options.mutations,
          terminalId: options.terminalId,
          branchId: options.branchId || this.activeBranchId
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err: any) {
      console.error('[MysqlDatabaseService] syncOfflineBatchMutations error:', err.message);
      return {
        success: false,
        total: options.mutations.length,
        processed: 0,
        skipped: 0,
        failed: options.mutations.length,
        error: err.message
      };
    }
  }

  /**
   * Pushes full local database collections directly to MySQL backend tables
   */
  public async syncAllToMysql(data: Record<string, any>): Promise<{
    success: boolean;
    message?: string;
    collectionsCount?: number;
    isMysqlActive?: boolean;
    error?: string;
  }> {
    try {
      const res = await fetch('/api/mysql/sync-all', {
        method: 'POST',
        headers: this.getHeaders('application/json'),
        body: JSON.stringify({ data })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err: any) {
      console.error('[MysqlDatabaseService] syncAllToMysql error:', err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Retrieves current MySQL database health metrics, connection pool status, and table counts.
   */
  public async getDatabaseStatus(): Promise<MysqlStatusResponse> {
    try {
      const res = await fetch('/api/db/mysql-status', {
        headers: this.getHeaders()
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err: any) {
      return {
        success: false,
        engine: 'MySQL',
        active: false,
        host: '127.0.0.1',
        database: 'tilepoint_db',
        totalTables: 0,
        totalRecords: 0,
        tableCounts: {},
        error: err.message
      };
    }
  }
}

export const mysqlDatabaseService = new MysqlDatabaseService();
export default mysqlDatabaseService;
