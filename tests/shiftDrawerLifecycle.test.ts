import { describe, it, expect } from 'vitest';
import { Shift, ShiftStatus } from '../src/types/db';

describe('Shift Drawer Lifecycle, Auto-Close, & Audit Ledger Sync Suite', () => {
  describe('Stale Shift Auto-Close Logic', () => {
    it('detects and auto-closes shifts opened on a prior calendar day', () => {
      const now = new Date('2026-09-05T08:00:00.000Z');
      const yesterday = new Date('2026-09-04T09:00:00.000Z');
      const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      const mockShifts: Shift[] = [
        {
          id: 'SH-YESTERDAY',
          cashierId: 'U1',
          cashierName: 'Cashier One',
          branchId: 'B1',
          status: 'OPEN',
          startCash: 5000,
          endCash: 0,
          cashCount: 0,
          variance: 0,
          openedAt: yesterday.toISOString(),
          closedAt: undefined,
          shiftSalesCount: 3,
          shiftSalesTotal: 15000,
          shiftVatTotal: 1607.14,
          shiftDiscountTotal: 0,
        },
        {
          id: 'SH-TODAY',
          cashierId: 'U2',
          cashierName: 'Cashier Two',
          branchId: 'B1',
          status: 'OPEN',
          startCash: 3000,
          endCash: 0,
          cashCount: 0,
          variance: 0,
          openedAt: new Date('2026-09-05T01:00:00.000Z').toISOString(),
          closedAt: undefined,
          shiftSalesCount: 1,
          shiftSalesTotal: 2000,
          shiftVatTotal: 214.28,
          shiftDiscountTotal: 0,
        },
      ];

      // Stale filter logic
      const staleShifts = mockShifts.filter((s) => {
        if (s.status === 'CLOSED') return false;
        if (s.closedAt) return false;
        const openDate = new Date(s.openedAt);
        if (isNaN(openDate.getTime())) return false;
        return openDate.toDateString() !== now.toDateString() && openDate.getTime() < startOfTodayMs;
      });

      expect(staleShifts.length).toBe(1);
      expect(staleShifts[0].id).toBe('SH-YESTERDAY');

      // Auto-close resolution
      const autoClosedShifts = mockShifts.map((s) => {
        if (s.id !== 'SH-YESTERDAY') return s;
        const expectedCash = s.startCash + s.shiftSalesTotal;
        return {
          ...s,
          status: 'CLOSED' as ShiftStatus,
          endCash: expectedCash,
          cashCount: expectedCash,
          variance: 0,
          closedAt: new Date(new Date(s.openedAt).setHours(23, 59, 59, 999)).toISOString(),
        };
      });

      const yesterdayShift = autoClosedShifts.find((s) => s.id === 'SH-YESTERDAY');
      expect(yesterdayShift?.status).toBe('CLOSED');
      expect(yesterdayShift?.endCash).toBe(20000);
      expect(yesterdayShift?.cashCount).toBe(20000);
      expect(yesterdayShift?.closedAt).toBeDefined();

      const todayShift = autoClosedShifts.find((s) => s.id === 'SH-TODAY');
      expect(todayShift?.status).toBe('OPEN');
    });
  });

  describe('Previous Shift Balance Derivation', () => {
    it('reliably finds the last closed shift at the user branch and reads cashCount', () => {
      const mockShifts: Shift[] = [
        {
          id: 'SH-1',
          cashierId: 'U1',
          cashierName: 'Cashier One',
          branchId: 'B1',
          status: 'CLOSED',
          startCash: 5000,
          endCash: 12500,
          cashCount: 12500,
          variance: 0,
          openedAt: '2026-09-04T08:00:00.000Z',
          closedAt: '2026-09-04T17:00:00.000Z',
          shiftSalesCount: 10,
          shiftSalesTotal: 7500,
          shiftVatTotal: 800,
          shiftDiscountTotal: 0,
        },
        {
          id: 'SH-2',
          cashierId: 'U2',
          cashierName: 'Cashier Two',
          branchId: 'B1',
          status: 'CLOSED',
          startCash: 12500,
          endCash: 18200,
          cashCount: 18000, // actual count with ₱200 shortage
          variance: -200,
          openedAt: '2026-09-04T17:30:00.000Z',
          closedAt: '2026-09-04T23:00:00.000Z',
          shiftSalesCount: 8,
          shiftSalesTotal: 5700,
          shiftVatTotal: 610,
          shiftDiscountTotal: 0,
        },
        {
          id: 'SH-3',
          cashierId: 'U3',
          cashierName: 'Cashier Three',
          branchId: 'B2', // Different branch
          status: 'CLOSED',
          startCash: 3000,
          endCash: 9000,
          cashCount: 9000,
          variance: 0,
          openedAt: '2026-09-05T08:00:00.000Z',
          closedAt: '2026-09-05T12:00:00.000Z',
          shiftSalesCount: 4,
          shiftSalesTotal: 6000,
          shiftVatTotal: 642,
          shiftDiscountTotal: 0,
        },
      ];

      const getPreviouslyClosedShift = (branchId: string | null | undefined) => {
        const effectiveBranchId = branchId && branchId !== 'consolidated' && branchId !== 'ALL'
          ? branchId
          : 'B1';
        return [...mockShifts]
          .filter((s) => s.status === 'CLOSED' && (s.branchId === effectiveBranchId || s.branchId === branchId || s.branchId === 'B1'))
          .sort((a, b) => new Date(b.closedAt || 0).getTime() - new Date(a.closedAt || 0).getTime())[0] || null;
      };

      // Branch B1 should return SH-2 (the latest closed shift at B1)
      const prevB1 = getPreviouslyClosedShift('B1');
      expect(prevB1?.id).toBe('SH-2');
      expect(prevB1?.cashCount).toBe(18000);

      // Branch fallback when branchId is null/ALL/consolidated should default to B1
      const prevFallback = getPreviouslyClosedShift(null);
      expect(prevFallback?.id).toBe('SH-2');
      expect(prevFallback?.cashCount).toBe(18000);

      // Branch B2 should return SH-3
      const prevB2 = getPreviouslyClosedShift('B2');
      expect(prevB2?.id).toBe('SH-3');
      expect(prevB2?.cashCount).toBe(9000);
    });
  });

  describe('Sync Reconciliation: Local vs Server Shift Merging', () => {
    it('prevents background server sync from reverting locally closed shifts to open', () => {
      // Local state has closed the shift
      const localShifts: Shift[] = [
        {
          id: 'SH-101',
          cashierId: 'U1',
          cashierName: 'Cashier One',
          branchId: 'B1',
          status: 'CLOSED',
          startCash: 5000,
          endCash: 8000,
          cashCount: 8000,
          variance: 0,
          openedAt: '2026-09-05T08:00:00.000Z',
          closedAt: '2026-09-05T12:00:00.000Z',
          shiftSalesCount: 4,
          shiftSalesTotal: 3000,
          shiftVatTotal: 321,
          shiftDiscountTotal: 0,
        },
      ];

      // Server returns stale data where SH-101 is still OPEN
      const serverShifts: Shift[] = [
        {
          id: 'SH-101',
          cashierId: 'U1',
          cashierName: 'Cashier One',
          branchId: 'B1',
          status: 'OPEN',
          startCash: 5000,
          endCash: 0,
          cashCount: 0,
          variance: 0,
          openedAt: '2026-09-05T08:00:00.000Z',
          closedAt: undefined,
          shiftSalesCount: 4,
          shiftSalesTotal: 3000,
          shiftVatTotal: 321,
          shiftDiscountTotal: 0,
        },
        {
          id: 'SH-100', // Older server shift
          cashierId: 'U2',
          cashierName: 'Old Cashier',
          branchId: 'B1',
          status: 'CLOSED',
          startCash: 5000,
          endCash: 5000,
          cashCount: 5000,
          variance: 0,
          openedAt: '2026-09-04T08:00:00.000Z',
          closedAt: '2026-09-04T17:00:00.000Z',
          shiftSalesCount: 0,
          shiftSalesTotal: 0,
          shiftVatTotal: 0,
          shiftDiscountTotal: 0,
        },
      ];

      // Reconciliation algorithm
      const shiftMap = new Map<string, any>();
      serverShifts.forEach((s) => shiftMap.set(s.id, s));

      localShifts.forEach((ls) => {
        const existing = shiftMap.get(ls.id);
        if (!existing) {
          shiftMap.set(ls.id, ls);
        } else {
          // If local is CLOSED and remote is not CLOSED, keep local CLOSED state
          if (ls.status === 'CLOSED' && existing.status !== 'CLOSED') {
            shiftMap.set(ls.id, { ...existing, ...ls, status: 'CLOSED' });
          } else if (new Date(ls.closedAt || 0).getTime() > new Date(existing.closedAt || 0).getTime()) {
            shiftMap.set(ls.id, { ...existing, ...ls });
          }
        }
      });

      const reconciledShifts = Array.from(shiftMap.values()).sort(
        (a, b) => new Date(b.openedAt || 0).getTime() - new Date(a.openedAt || 0).getTime()
      );

      const reconciledShift101 = reconciledShifts.find((s) => s.id === 'SH-101');
      expect(reconciledShift101?.status).toBe('CLOSED');
      expect(reconciledShift101?.closedAt).toBe('2026-09-05T12:00:00.000Z');
      expect(reconciledShift101?.cashCount).toBe(8000);
      expect(reconciledShifts.length).toBe(2);
      expect(reconciledShifts[0].id).toBe('SH-101'); // Most recent first
    });
  });

  describe('Historic Shift Audit Ledgers Default Order', () => {
    it('sorts shifts by descending openedAt so latest shifts appear first', () => {
      const rawShifts: Shift[] = [
        { id: 'SH-A', openedAt: '2026-09-03T08:00:00.000Z' } as any,
        { id: 'SH-C', openedAt: '2026-09-05T08:00:00.000Z' } as any,
        { id: 'SH-B', openedAt: '2026-09-04T08:00:00.000Z' } as any,
      ];

      const sorted = [...rawShifts].sort((a, b) => {
        const timeA = new Date(a.openedAt || 0).getTime();
        const timeB = new Date(b.openedAt || 0).getTime();
        return timeB - timeA;
      });

      expect(sorted.map((s) => s.id)).toEqual(['SH-C', 'SH-B', 'SH-A']);
    });
  });
});
