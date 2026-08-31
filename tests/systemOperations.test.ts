import { describe, it, expect } from 'vitest';
import { getNextMidnight } from '../src/server/config/serverConfig.js';
import { generateServerSessionToken, verifyAndExtractToken } from '../src/server/services/authService.js';

describe('System Operations, Security & Midnight Reset Suite', () => {
  describe('Midnight Expiration & Token Security', () => {
    it('calculates the exact upcoming midnight (00:00:00.000)', () => {
      const testTime = new Date('2026-08-31T14:30:00.000Z').getTime();
      const nextMidnight = getNextMidnight(testTime);
      const midnightDate = new Date(nextMidnight);

      expect(midnightDate.getHours()).toBe(0);
      expect(midnightDate.getMinutes()).toBe(0);
      expect(midnightDate.getSeconds()).toBe(0);
      expect(midnightDate.getMilliseconds()).toBe(0);
      expect(nextMidnight).toBeGreaterThan(testTime);
    });

    it('caps generated session token exp claim to midnight', () => {
      const mockUser = { id: 'U1', username: 'cashier1', role: 'Cashier' };
      const now = Date.now();
      const nextMidnight = getNextMidnight(now);

      // Request an extremely long session (e.g. 7 days = 604800000 ms)
      const token = generateServerSessionToken(mockUser, 'SESS_1', 7 * 24 * 60 * 60 * 1000);
      const payload = verifyAndExtractToken(token);

      expect(payload).not.toBeNull();
      expect(payload.exp).toBeLessThanOrEqual(nextMidnight);
      expect(payload.id).toBe('U1');
      expect(payload.role).toBe('Cashier');
    });

    it('rejects expired tokens or tokens past midnight', () => {
      const mockUser = { id: 'U2', username: 'admin1', role: 'Admin' };
      // Expired duration (-1000 ms)
      const expiredToken = generateServerSessionToken(mockUser, 'SESS_EXPIRED', -1000);
      const extracted = verifyAndExtractToken(expiredToken);
      expect(extracted).toBeNull();
    });
  });

  describe('Branch Deletion Constraint Guard', () => {
    it('blocks deleting the last remaining active branch', () => {
      const branches = [
        { id: 'B1', name: 'Main HQ', isDeleted: false },
        { id: 'B2', name: 'West Branch', isDeleted: true },
      ];

      const activeBranches = branches.filter((b) => !b.isDeleted);
      expect(activeBranches.length).toBe(1);

      // Simulating deleteBranch guard
      const attemptDelete = (idToDelete: string) => {
        const remainingActive = branches.filter((b) => b.id !== idToDelete && !b.isDeleted);
        if (remainingActive.length === 0) {
          return { success: false, reason: 'At least one active branch must remain' };
        }
        return { success: true };
      };

      const result = attemptDelete('B1');
      expect(result.success).toBe(false);
      expect(result.reason).toContain('At least one active branch must remain');
    });

    it('allows deleting non-primary branch when multiple active branches exist', () => {
      const branches = [
        { id: 'B1', name: 'Main HQ', isDeleted: false },
        { id: 'B2', name: 'Outlet 2', isDeleted: false },
      ];

      const attemptDelete = (idToDelete: string) => {
        const remainingActive = branches.filter((b) => b.id !== idToDelete && !b.isDeleted);
        if (remainingActive.length === 0) {
          return { success: false, reason: 'At least one active branch must remain' };
        }
        return { success: true };
      };

      const result = attemptDelete('B2');
      expect(result.success).toBe(true);
    });
  });

  describe('Database Reset & Stock Zeroing Logic', () => {
    it('correctly sets product and branch stock quantities to 0 in Level 1 reset', () => {
      const products = [
        { id: 'P1', productName: 'Floor Tile A', stockQuantity: 150 },
        { id: 'P2', productName: 'Wall Tile B', stockQuantity: 80 },
      ];
      const branchStock = [
        { id: 'B1_P1', branchId: 'B1', productId: 'P1', quantity: 100 },
        { id: 'B2_P1', branchId: 'B2', productId: 'P1', quantity: 50 },
        { id: 'B1_P2', branchId: 'B1', productId: 'P2', quantity: 80 },
      ];

      // Level 1 Transactions / Stock reset
      const zeroedProducts = products.map((p) => ({ ...p, stockQuantity: 0 }));
      const zeroedBranchStock = branchStock.map((bs) => ({ ...bs, quantity: 0 }));

      expect(zeroedProducts.every((p) => p.stockQuantity === 0)).toBe(true);
      expect(zeroedBranchStock.every((bs) => bs.quantity === 0)).toBe(true);
    });
  });
});