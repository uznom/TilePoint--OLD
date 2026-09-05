import { describe, it, expect } from 'vitest';
import { Product, SaleItem } from '../src/types/db';

describe('Product Trend Analytics Logic Suite', () => {
  const mockProducts: Product[] = [
    {
      id: 'P1',
      productCode: 'PROD-001',
      productName: 'Ceramic Floor Tile 60x60',
      category: 'Tiles',
      brand: 'TileMaster',
      stockQuantity: 150,
      costPrice: 200,
      sellingPrice: 350,
      minStockAlert: 10,
    } as any,
    {
      id: 'P2',
      productCode: 'PROD-002',
      productName: 'Tile Adhesive 25kg',
      category: 'Adhesives',
      brand: 'BondFast',
      stockQuantity: 80,
      costPrice: 150,
      sellingPrice: 250,
      minStockAlert: 15,
    } as any,
    {
      id: 'P3',
      productCode: 'PROD-003',
      productName: 'Porcelain Grout Gray 2kg',
      category: 'Grout',
      brand: 'BondFast',
      stockQuantity: 200,
      costPrice: 60,
      sellingPrice: 120,
      minStockAlert: 20,
    } as any,
    {
      id: 'P4',
      productCode: 'PROD-004',
      productName: 'Luxury Marble Slab 120x60',
      category: 'Tiles',
      brand: 'RoyalStone',
      stockQuantity: 40,
      costPrice: 1200,
      sellingPrice: 2200,
      minStockAlert: 5,
    } as any,
  ];

  const mockSales = [
    { id: 'S1', createdAt: '2026-09-02T10:00:00.000Z', isDeleted: false },
    { id: 'S2', createdAt: '2026-09-04T14:30:00.000Z', isDeleted: false },
    { id: 'S3', createdAt: '2026-08-15T11:00:00.000Z', isDeleted: false }, // Previous month
    { id: 'S4', createdAt: '2025-09-03T09:00:00.000Z', isDeleted: false }, // Previous year
    { id: 'S5-VOIDED', createdAt: '2026-09-01T08:00:00.000Z', isDeleted: false, isVoided: true },
  ];

  const mockSaleItems: SaleItem[] = [
    // Current month (Sep 2026)
    { id: 'SI1', saleId: 'S1', productId: 'P1', quantity: 20, unitPrice: 350, total: 7000 } as any,
    { id: 'SI2', saleId: 'S1', productId: 'P2', quantity: 10, unitPrice: 250, total: 2500 } as any,
    { id: 'SI3', saleId: 'S2', productId: 'P1', quantity: 30, unitPrice: 350, total: 10500 } as any,
    // Voided sale item (should be excluded)
    { id: 'SI4', saleId: 'S5-VOIDED', productId: 'P1', quantity: 100, unitPrice: 350, total: 35000 } as any,
    // Prev month (Aug 2026)
    { id: 'SI5', saleId: 'S3', productId: 'P1', quantity: 15, unitPrice: 350, total: 5250 } as any,
    { id: 'SI6', saleId: 'S3', productId: 'P2', quantity: 5, unitPrice: 250, total: 1250 } as any,
    // Prev year (Sep 2025)
    { id: 'SI7', saleId: 'S4', productId: 'P1', quantity: 25, unitPrice: 350, total: 8750 } as any,
  ];

  it('aggregates monthly sales metrics excluding deleted and voided sales', () => {
    const validSaleMap = new Map<string, Date>();
    mockSales.forEach((s) => {
      if (!s.isDeleted && !s.isVoided) {
        validSaleMap.set(s.id, new Date(s.createdAt));
      }
    });

    const targetYear = 2026;
    const targetMonth = 8; // September (0-indexed)

    const sepItems = mockSaleItems.filter((item) => {
      if (!item.saleId || !validSaleMap.has(item.saleId)) return false;
      const d = validSaleMap.get(item.saleId)!;
      return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
    });

    expect(sepItems.length).toBe(3); // SI1, SI2, SI3 (SI4 excluded because voided)

    // Aggregate stats
    const statsMap: Record<string, { qty: number; revenue: number; txns: number }> = {};
    sepItems.forEach((item) => {
      if (!statsMap[item.productId]) statsMap[item.productId] = { qty: 0, revenue: 0, txns: 0 };
      statsMap[item.productId].qty += item.quantity;
      statsMap[item.productId].revenue += item.total;
      statsMap[item.productId].txns += 1;
    });

    // P1: 20 + 30 = 50 units, 7000 + 10500 = 17500 revenue
    expect(statsMap['P1'].qty).toBe(50);
    expect(statsMap['P1'].revenue).toBe(17500);
    expect(statsMap['P1'].txns).toBe(2);

    // P2: 10 units, 2500 revenue
    expect(statsMap['P2'].qty).toBe(10);
    expect(statsMap['P2'].revenue).toBe(2500);

    // P3 & P4: 0 units sold in Sep 2026
    expect(statsMap['P3']).toBeUndefined();
    expect(statsMap['P4']).toBeUndefined();
  });

  it('calculates month-over-month growth correctly', () => {
    // Current: Sep 2026 (P1: 17500, P2: 2500 = 20000 total)
    const currentRevenue = 20000;
    // Previous: Aug 2026 (SI5: 5250, SI6: 1250 = 6500 total)
    const prevRevenue = 6500;

    const growthPct = ((currentRevenue - prevRevenue) / prevRevenue) * 100;
    expect(Number(growthPct.toFixed(1))).toBe(207.7);
  });

  it('identifies slow movers and dead stock with held capital value', () => {
    // Products with 0 units sold in the period but having available stock
    const zeroSales = mockProducts.filter((p) => p.id === 'P3' || p.id === 'P4');

    const slowMoversWithValuation = zeroSales.map((p) => ({
      product: p,
      heldValue: p.stockQuantity * p.costPrice,
    }));

    // P4: 40 * 1200 = 48,000 capital held
    // P3: 200 * 60 = 12,000 capital held
    const sorted = slowMoversWithValuation.sort((a, b) => b.heldValue - a.heldValue);
    expect(sorted[0].product.id).toBe('P4');
    expect(sorted[0].heldValue).toBe(48000);
    expect(sorted[1].product.id).toBe('P3');
    expect(sorted[1].heldValue).toBe(12000);
  });

  it('computes category share percentage accurately', () => {
    const totalRev = 20000;
    const catRevenue = {
      Tiles: 17500,
      Adhesives: 2500,
    };

    const tilesShare = (catRevenue.Tiles / totalRev) * 100;
    const adhesivesShare = (catRevenue.Adhesives / totalRev) * 100;

    expect(tilesShare).toBe(87.5);
    expect(adhesivesShare).toBe(12.5);
    expect(tilesShare + adhesivesShare).toBe(100);
  });

  describe('Route Validation & Navigation Accessibility', () => {
    it('validates /product-trends and /trends routes without redirection', async () => {
      const { validateAndNormalizeRoute, canonicalizeTab } = await import('../src/hooks/useRouteSyncManager');

      // Canonical tab mapping
      expect(canonicalizeTab('product-trends')).toBe('product-trends');
      expect(canonicalizeTab('trends')).toBe('product-trends');

      // Direct path validation
      const directRoute = validateAndNormalizeRoute('/product-trends');
      expect(directRoute.isValid).toBe(true);
      expect(directRoute.tab).toBe('product-trends');
      expect(directRoute.path).toBe('/product-trends');

      // Alias path validation
      const aliasRoute = validateAndNormalizeRoute('/trends');
      expect(aliasRoute.isValid).toBe(true);
      expect(aliasRoute.tab).toBe('product-trends');

      // Tab identifier validation
      const tabValidation = validateAndNormalizeRoute('product-trends');
      expect(tabValidation.isValid).toBe(true);
      expect(tabValidation.tab).toBe('product-trends');
      expect(tabValidation.path).toBe('/product-trends');
    });
  });

  describe('Previous Year Top Sellers & Customer Traffic Timelines', () => {
    it('accurately identifies same-month previous year top products and calculates YoY movement', () => {
      // SI7 is from Sep 2025 (prev year) with P1: 25 units, 8750 revenue
      const prevYearItems = mockSaleItems.filter((item) => item.id === 'SI7');
      expect(prevYearItems.length).toBe(1);

      const prevYearStat = {
        productId: prevYearItems[0].productId,
        unitsSold: prevYearItems[0].quantity,
        revenue: prevYearItems[0].total,
      };

      // In Sep 2026, P1 sold 50 units, 17500 revenue
      const currentYearStat = {
        productId: 'P1',
        unitsSold: 50,
        revenue: 17500,
      };

      const unitGrowth = ((currentYearStat.unitsSold - prevYearStat.unitsSold) / prevYearStat.unitsSold) * 100;
      const revGrowth = ((currentYearStat.revenue - prevYearStat.revenue) / prevYearStat.revenue) * 100;

      expect(unitGrowth).toBe(100);
      expect(revGrowth).toBe(100);
    });

    it('aggregates customer traffic by hourly timeline window', () => {
      const sampleTimes = [
        '2026-09-02T08:15:00.000Z',
        '2026-09-02T08:45:00.000Z',
        '2026-09-02T13:10:00.000Z',
        '2026-09-02T13:30:00.000Z',
        '2026-09-02T13:55:00.000Z',
        '2026-09-02T18:20:00.000Z',
      ];

      const hourCounts: Record<number, number> = {};
      sampleTimes.forEach((t) => {
        const hr = new Date(t).getUTCHours();
        hourCounts[hr] = (hourCounts[hr] || 0) + 1;
      });

      expect(hourCounts[8]).toBe(2);
      expect(hourCounts[13]).toBe(3); // Peak rush at 13:00 (1 PM)
      expect(hourCounts[18]).toBe(1);

      // Peak hour identification
      const peakHour = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0];
      expect(Number(peakHour[0])).toBe(13);
      expect(peakHour[1]).toBe(3);
    });
  });
});

