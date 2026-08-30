import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BranchStockRecordSchema, AuditLogSchema, safeParseApiArray } from '../src/types/schemas';
import { mysqlDatabaseService } from '../src/services/mysqlDatabaseService';

describe('MysqlDatabaseService & Schema Boundary Validation Suite', () => {
  describe('BranchStockRecordSchema Validation', () => {
    it('successfully parses merged product/branch_stock rows returned from /api/db/branch-stock', () => {
      const mockApiRows = [
        {
          id: 'PROD-001',
          productName: 'Ceramic Tile 60x60',
          productCode: 'CT-6060',
          sku: 'TILE-CT-6060',
          product_sku: 'TILE-CT-6060',
          category: 'Ceramic',
          category_id: 'CAT-1',
          brand: 'TileMaster',
          unitOfMeasure: 'Box',
          stockQuantity: 150,
          branchStockId: 'BS-001',
          branchQuantity: 45,
          branchLowStockThreshold: 10,
          sellingPriceOverride: 499.50,
          costPrice: 300.00,
          sellingPrice: 480.00
        },
        {
          id: 'PROD-002',
          productName: 'Granite Slab Black Galaxy',
          productCode: 'GS-BG',
          sku: 'GRANITE-BG',
          product_sku: null,
          category: null,
          category_id: null,
          stockQuantity: 20,
          branchStockId: null,
          branchQuantity: 0
        }
      ];

      const parsed = safeParseApiArray(BranchStockRecordSchema, mockApiRows);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].id).toBe('PROD-001');
      expect(parsed[0].branchQuantity).toBe(45);
      expect(parsed[0].sellingPriceOverride).toBe(499.50);
      expect(parsed[1].id).toBe('PROD-002');
      expect(parsed[1].branchQuantity).toBe(0);
      expect(parsed[1].product_sku).toBeNull();
    });

    it('does not drop items with optional/nullable fields', () => {
      const row = {
        id: 'P-100',
        productName: 'Adhesive Cement',
        productCode: 'ADH-01',
        stockQuantity: 500
      };
      const parsed = safeParseApiArray(BranchStockRecordSchema, [row]);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].productName).toBe('Adhesive Cement');
      expect(parsed[0].stockQuantity).toBe(500);
      expect(parsed[0].branchQuantity).toBe(0);
    });
  });

  describe('AuditLogSchema Validation & Null Handling', () => {
    it('successfully handles MySQL rows with NULL action and details/description variations', () => {
      const mockAuditRows = [
        {
          id: 'AUD-001',
          action: null,
          actionCode: 'POS_OVERRIDE_APPROVED',
          description: 'Cashier override for discount',
          details: null,
          module: 'Sales',
          userId: 'U-1',
          username: 'manager_jane',
          userName: null,
          referenceId: 'SALE-101',
          branchId: 'B1',
          timestamp: '2026-08-30T10:00:00.000Z'
        },
        {
          id: 'AUD-002',
          action: 'STOCK_TRANSFER_IN',
          actionCode: null,
          details: { transferId: 'TR-500', itemsCount: 3 },
          description: null,
          module: 'Inventory',
          userId: 'U-2',
          userName: 'warehouse_bob',
          createdAt: '2026-08-30T11:00:00.000Z'
        }
      ];

      const parsed = safeParseApiArray(AuditLogSchema, mockAuditRows);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].id).toBe('AUD-001');
      expect(parsed[0].action).toBe('POS_OVERRIDE_APPROVED');
      expect(parsed[0].actionCode).toBe('POS_OVERRIDE_APPROVED');
      expect(parsed[0].description).toBe('Cashier override for discount');
      expect(parsed[0].details).toBe('Cashier override for discount');
      expect(parsed[0].userName).toBe('manager_jane');

      expect(parsed[1].id).toBe('AUD-002');
      expect(parsed[1].action).toBe('STOCK_TRANSFER_IN');
      expect(parsed[1].details).toBe(JSON.stringify({ transferId: 'TR-500', itemsCount: 3 }));
      expect(parsed[1].userName).toBe('warehouse_bob');
    });
  });

  describe('mysqlDatabaseService Client Methods', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      mysqlDatabaseService.clearStockCache();
    });

    afterEach(() => {
      global.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    it('fetchBranchStocks populates cache and returns parsed records', async () => {
      const mockData = [
        { id: 'P-1', productName: 'Tile A', productCode: 'TA', stockQuantity: 10, branchQuantity: 5 }
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, count: 1, data: mockData })
      } as Response);

      const res = await mysqlDatabaseService.fetchBranchStocks('B1');
      expect(res.success).toBe(true);
      expect(res.count).toBe(1);
      expect(res.data).toHaveLength(1);
      expect(res.data[0].id).toBe('P-1');

      // Second call should hit the cache without calling fetch again
      const cachedRes = await mysqlDatabaseService.fetchBranchStocks('B1');
      expect(cachedRes.success).toBe(true);
      expect(cachedRes.data).toHaveLength(1);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('saveStockTransfer invalidates stock cache upon success', async () => {
      const mockData = [
        { id: 'P-1', productName: 'Tile A', productCode: 'TA', stockQuantity: 10, branchQuantity: 5 }
      ];

      global.fetch = vi.fn().mockImplementation((url) => {
        if (String(url).includes('/api/db/branch-stock')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, count: 1, data: mockData })
          });
        }
        if (String(url).includes('/api/db/stock-transfers')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, id: 'ST-001', message: 'Saved' })
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      // 1. Fetch to populate cache
      await mysqlDatabaseService.fetchBranchStocks('B1');
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // 2. Perform stock transfer
      const saveRes = await mysqlDatabaseService.saveStockTransfer({ fromBranchId: 'B1', toBranchId: 'B2', items: [] });
      expect(saveRes.success).toBe(true);

      // 3. Fetch again: cache should have been invalidated, triggering a fresh fetch
      await mysqlDatabaseService.fetchBranchStocks('B1');
      expect(global.fetch).toHaveBeenCalledTimes(3); // 1 (fetch) + 1 (transfer) + 1 (new fetch)
    });

    it('handles query limit and offset parameters including 0', async () => {
      let requestedUrl = '';
      global.fetch = vi.fn().mockImplementation((url) => {
        requestedUrl = String(url);
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, count: 0, data: [] })
        });
      });

      await mysqlDatabaseService.fetchBranchStocks('B1', { limit: 50, offset: 0 });
      expect(requestedUrl).toContain('limit=50');
      expect(requestedUrl).toContain('offset=0');
    });
  });
});
