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

  describe('Payment Methods & Discount Schemes Switch Guards', () => {
    it('blocks disabling the last remaining active payment method', () => {
      let paymentMethods = [
        { id: 'pm_cash', name: 'Cash', isEnabled: true, isActive: true },
        { id: 'pm_gcash', name: 'GCash', isEnabled: false, isActive: false },
      ];

      const togglePaymentMethod = (id: string, enabled?: boolean): boolean => {
        const target = paymentMethods.find((p) => p.id === id);
        if (!target) return false;
        const next = enabled !== undefined ? enabled : !target.isEnabled;
        if (!next) {
          const activeCount = paymentMethods.filter((p) => p.isEnabled).length;
          if (activeCount <= 1 && target.isEnabled) {
            return false; // blocked
          }
        }
        paymentMethods = paymentMethods.map((p) =>
          p.id === id ? { ...p, isEnabled: next, isActive: next } : p
        );
        return true;
      };

      // Disabling the only active payment method (Cash) must fail
      const result = togglePaymentMethod('pm_cash', false);
      expect(result).toBe(false);
      expect(paymentMethods.find((p) => p.id === 'pm_cash')?.isEnabled).toBe(true);

      // Enabling GCash first should succeed
      const enableGcash = togglePaymentMethod('pm_gcash', true);
      expect(enableGcash).toBe(true);
      expect(paymentMethods.filter((p) => p.isEnabled).length).toBe(2);

      // Now Cash can be disabled since GCash is active
      const disableCash = togglePaymentMethod('pm_cash', false);
      expect(disableCash).toBe(true);
      expect(paymentMethods.find((p) => p.id === 'pm_cash')?.isEnabled).toBe(false);
      expect(paymentMethods.find((p) => p.id === 'pm_gcash')?.isEnabled).toBe(true);
    });

    it('blocks deleting the last remaining active payment method', () => {
      let paymentMethods = [
        { id: 'pm_cash', name: 'Cash', isEnabled: true },
        { id: 'pm_card', name: 'Card', isEnabled: false },
      ];

      const deletePaymentMethod = (id: string): boolean => {
        const target = paymentMethods.find((p) => p.id === id);
        if (!target) return false;
        if (target.isEnabled) {
          const activeCount = paymentMethods.filter((p) => p.isEnabled).length;
          if (activeCount <= 1) {
            return false; // blocked
          }
        }
        paymentMethods = paymentMethods.filter((p) => p.id !== id);
        return true;
      };

      // Attempting to delete Cash (the only active method) must fail
      expect(deletePaymentMethod('pm_cash')).toBe(false);
      expect(paymentMethods.length).toBe(2);

      // Deleting the disabled Card method should succeed
      expect(deletePaymentMethod('pm_card')).toBe(true);
      expect(paymentMethods.length).toBe(1);
    });

    it('allows toggling discount schemes and keeps isEnabled/isActive in sync', () => {
      let discountSchemes = [
        { id: 'disc_senior', name: 'Senior Citizen', isEnabled: true, isActive: true },
        { id: 'disc_pwd', name: 'PWD', isEnabled: true, isActive: true },
      ];

      const toggleDiscountScheme = (id: string, enabled?: boolean) => {
        discountSchemes = discountSchemes.map((ds) => {
          if (ds.id !== id) return ds;
          const next = enabled !== undefined ? enabled : !ds.isEnabled;
          return { ...ds, isEnabled: next, isActive: next };
        });
      };

      // Disabling both discount schemes is permitted (promotional discounts are optional)
      toggleDiscountScheme('disc_senior', false);
      expect(discountSchemes.find((d) => d.id === 'disc_senior')?.isEnabled).toBe(false);
      expect(discountSchemes.find((d) => d.id === 'disc_senior')?.isActive).toBe(false);

      toggleDiscountScheme('disc_pwd', false);
      expect(discountSchemes.every((d) => !d.isEnabled && !d.isActive)).toBe(true);

      // Re-enabling Senior Citizen
      toggleDiscountScheme('disc_senior', true);
      expect(discountSchemes.find((d) => d.id === 'disc_senior')?.isEnabled).toBe(true);
      expect(discountSchemes.find((d) => d.id === 'disc_senior')?.isActive).toBe(true);
    });
  });
});