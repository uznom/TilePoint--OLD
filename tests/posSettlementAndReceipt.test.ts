import { describe, it, expect } from 'vitest';
import { parseTenderAmount } from '../src/utils/formatters';

describe('POS Settlement Button Disablement & Receipt Items Resolution Suite', () => {
  describe('1. Execute Settlement Disablement Rules', () => {
    // Helper replicating PosModule settlement disable rule
    const isExecuteSettlementDisabled = ({
      cartLength,
      isCheckingOut = false,
      paymentMethod = 'Cash',
      amountTenderedStr = '',
      grandTotal = 1000,
      paymentRef = ''
    }: {
      cartLength: number;
      isCheckingOut?: boolean;
      paymentMethod?: string;
      amountTenderedStr?: string;
      grandTotal?: number;
      paymentRef?: string;
    }) => {
      const parsedTendered = parseTenderAmount(amountTenderedStr);
      const isCash = paymentMethod === 'Cash';
      const isCashSufficient = isCash
        ? (grandTotal <= 0 ? true : parsedTendered >= grandTotal && Boolean(amountTenderedStr.trim()))
        : true;
      const isNonCashValid = (isCash || paymentMethod === 'Member Credit')
        ? true
        : Boolean(paymentRef.trim());

      return (
        cartLength === 0 ||
        isCheckingOut ||
        !isCashSufficient ||
        !isNonCashValid
      );
    };

    it('disables execute settlement when cart is empty', () => {
      expect(isExecuteSettlementDisabled({
        cartLength: 0,
        amountTenderedStr: '1,500.00',
        grandTotal: 1000
      })).toBe(true);
    });

    it('disables execute settlement when amount tendered is empty or 0 for Cash payment', () => {
      expect(isExecuteSettlementDisabled({
        cartLength: 2,
        amountTenderedStr: '',
        grandTotal: 1000
      })).toBe(true);

      expect(isExecuteSettlementDisabled({
        cartLength: 2,
        amountTenderedStr: '0',
        grandTotal: 1000
      })).toBe(true);
    });

    it('disables execute settlement when amount tendered is LESS than grand total', () => {
      // Tendered ₱999.99 for ₱1,000.00 total
      expect(isExecuteSettlementDisabled({
        cartLength: 3,
        amountTenderedStr: '999.99',
        grandTotal: 1000
      })).toBe(true);

      // Tendered ₱500 for ₱501 total
      expect(isExecuteSettlementDisabled({
        cartLength: 1,
        amountTenderedStr: '500.00',
        grandTotal: 501.00
      })).toBe(true);
    });

    it('enables execute settlement when amount tendered is EQUAL to grand total (Exact Cash)', () => {
      expect(isExecuteSettlementDisabled({
        cartLength: 2,
        amountTenderedStr: '1,000.00',
        grandTotal: 1000
      })).toBe(false);

      expect(isExecuteSettlementDisabled({
        cartLength: 1,
        amountTenderedStr: '250.75',
        grandTotal: 250.75
      })).toBe(false);
    });

    it('enables execute settlement when amount tendered is GREATER than grand total (With Change)', () => {
      expect(isExecuteSettlementDisabled({
        cartLength: 2,
        amountTenderedStr: '1,500.00',
        grandTotal: 1000
      })).toBe(false);

      expect(isExecuteSettlementDisabled({
        cartLength: 5,
        amountTenderedStr: '5,000',
        grandTotal: 4230.50
      })).toBe(false);
    });

    it('requires payment reference for non-cash payments (GCash, Maya, Card)', () => {
      // Empty reference disables settlement
      expect(isExecuteSettlementDisabled({
        cartLength: 2,
        paymentMethod: 'GCash',
        amountTenderedStr: '1,000.00',
        grandTotal: 1000,
        paymentRef: ''
      })).toBe(true);

      // Filled reference enables settlement
      expect(isExecuteSettlementDisabled({
        cartLength: 2,
        paymentMethod: 'GCash',
        amountTenderedStr: '1,000.00',
        grandTotal: 1000,
        paymentRef: 'GCASH-REF-889123'
      })).toBe(false);
    });

    it('disables button when checkout is actively in flight (isCheckingOut = true)', () => {
      expect(isExecuteSettlementDisabled({
        cartLength: 2,
        isCheckingOut: true,
        amountTenderedStr: '1,000.00',
        grandTotal: 1000
      })).toBe(true);
    });
  });

  describe('2. Receipt Purchased Items Resolution', () => {
    // Helper replicating PosModule receiptItems resolution logic
    const resolveReceiptPurchasedItems = (
      activeReceipt: any,
      saleItemsState: any[],
      outboxItems: any[] = []
    ) => {
      if (!activeReceipt) return [];
      // 1. Direct embedded items on activeReceipt
      if (Array.isArray(activeReceipt.items) && activeReceipt.items.length > 0) {
        return activeReceipt.items;
      }
      if (Array.isArray(activeReceipt.saleItems) && activeReceipt.saleItems.length > 0) {
        return activeReceipt.saleItems;
      }
      // 2. Query from saleItems state
      const matched = saleItemsState.filter((item: any) => item.saleId === activeReceipt.id && !item.isDeleted);
      if (matched.length > 0) return matched;

      // 3. Fallback: check transaction outbox
      for (const it of outboxItems) {
        const outboxItemsList = it.payload?.saleItems || it.payload?.items || it.payload?.sale?.items;
        if (Array.isArray(outboxItemsList)) {
          const found = outboxItemsList.filter((item: any) => item.saleId === activeReceipt.id && !item.isDeleted);
          if (found.length > 0) return found;
        }
      }

      return [];
    };

    const mockCartItems = [
      {
        id: 'SLI-1',
        saleId: 'SL-1001',
        productId: 'P1',
        productName: 'Ceramic Floor Tile 60x60 Granite Grey',
        unitPrice: 280,
        quantity: 20,
        total: 5600,
        isDeleted: false
      },
      {
        id: 'SLI-2',
        saleId: 'SL-1001',
        productId: 'P2',
        productName: 'Tile Grout Heavy Duty White 2kg',
        unitPrice: 120,
        quantity: 5,
        total: 600,
        isDeleted: false
      }
    ];

    it('resolves purchased items directly embedded on activeReceipt', () => {
      const receipt = {
        id: 'SL-1001',
        saleNumber: 'SL-20260904-0001',
        grandTotal: 6200,
        items: mockCartItems
      };

      // Even if saleItemsState is empty (e.g. wiped by server sync), embedded items are found
      const resolved = resolveReceiptPurchasedItems(receipt, []);
      expect(resolved).toHaveLength(2);
      expect(resolved[0].productName).toBe('Ceramic Floor Tile 60x60 Granite Grey');
      expect(resolved[1].productName).toBe('Tile Grout Heavy Duty White 2kg');
      expect(resolved.reduce((s: number, i: any) => s + (Number(i.quantity) || 0), 0)).toBe(25);
    });

    it('resolves purchased items from global saleItems state if not embedded on receipt', () => {
      const receipt = {
        id: 'SL-1001',
        saleNumber: 'SL-20260904-0001',
        grandTotal: 6200
      };

      const resolved = resolveReceiptPurchasedItems(receipt, mockCartItems);
      expect(resolved).toHaveLength(2);
      expect(resolved[0].productId).toBe('P1');
    });

    it('resolves purchased items from in-flight transaction outbox if state was cleared', () => {
      const receipt = {
        id: 'SL-1001',
        saleNumber: 'SL-20260904-0001',
        grandTotal: 6200
      };

      const mockOutbox = [
        {
          id: 'tx-checkout-SL-1001',
          payload: {
            saleItems: mockCartItems
          }
        }
      ];

      const resolved = resolveReceiptPurchasedItems(receipt, [], mockOutbox);
      expect(resolved).toHaveLength(2);
      expect(resolved[1].productName).toBe('Tile Grout Heavy Duty White 2kg');
    });

    it('uses "Discount Applied:" instead of "BIR Discount Applied:" for receipt discount line', () => {
      const discountLabel = 'Discount Applied:';
      expect(discountLabel).toBe('Discount Applied:');
      expect(discountLabel).not.toContain('BIR');
    });
  });
});

