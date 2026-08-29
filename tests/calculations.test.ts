import { describe, it, expect } from 'vitest';
import {
  calculateCartTotals,
  toCentavos,
  toPesos,
  calculateMarginPercentage,
  calculateMarkupPercentage,
  calculateStockValuation
} from '../src/utils/calculations';

describe('calculations.ts Unit Tests (F-14)', () => {
  describe('toCentavos and toPesos Conversions', () => {
    it('converts pesos to exact integer centavos without float drift', () => {
      expect(toCentavos(10.55)).toBe(1055);
      expect(toCentavos(0.1 + 0.2)).toBe(30);
      expect(toCentavos(199.99)).toBe(19999);
    });

    it('converts centavos back to exact float pesos', () => {
      expect(toPesos(1055)).toBe(10.55);
      expect(toPesos(30)).toBe(0.3);
      expect(toPesos(19999)).toBe(199.99);
    });
  });

  describe('calculateCartTotals - VAT & Grand Total Balance', () => {
    const testCartTable = [
      {
        name: 'Standard Vatable Single Item',
        items: [{ product: { unitPrice: 500.00, vatExempt: false }, quantity: 2 }],
        overallDiscountPercent: 0,
        overallDiscountAmount: 0,
        expectedSubtotal: 1000.00,
        expectedGrandTotal: 1000.00
      },
      {
        name: 'Multiple Items with Fractional Cents and Line Discounts',
        items: [
          { product: { unitPrice: 199.99, vatExempt: false }, quantity: 3, discountPercent: 10 },
          { product: { unitPrice: 349.50, vatExempt: false }, quantity: 7, discountPercent: 5 },
          { product: { unitPrice: 49.25, vatExempt: false }, quantity: 12 }
        ],
        overallDiscountPercent: 0,
        overallDiscountAmount: 0
      },
      {
        name: 'Mixed Cart with Vatable & VAT-Exempt Items',
        items: [
          { product: { unitPrice: 850.00, vatExempt: false }, quantity: 5 },
          { product: { unitPrice: 200.00, vatExempt: true }, quantity: 10 }
        ],
        overallDiscountPercent: 0,
        overallDiscountAmount: 0
      },
      {
        name: 'Overall Percentage Discount Applied to Post-Line-Discount Subtotal',
        items: [
          { product: { unitPrice: 1000.00, vatExempt: false }, quantity: 2, discountPercent: 10 },
          { product: { unitPrice: 500.00, vatExempt: false }, quantity: 2 }
        ],
        overallDiscountPercent: 15,
        overallDiscountAmount: 0
      },
      {
        name: 'Overall Fixed Amount Discount Applied to Post-Line-Discount Subtotal',
        items: [
          { product: { unitPrice: 2500.00, vatExempt: false }, quantity: 2, discountPercent: 20 },
          { product: { unitPrice: 750.00, vatExempt: true }, quantity: 2 }
        ],
        overallDiscountPercent: 0,
        overallDiscountAmount: 500.00
      },
      {
        name: 'Micro-Penny Fractional Rounding Stress Test',
        items: [
          { product: { unitPrice: 33.33, vatExempt: false }, quantity: 7 },
          { product: { unitPrice: 77.77, vatExempt: false }, quantity: 11 },
          { product: { unitPrice: 13.13, vatExempt: true }, quantity: 19 }
        ],
        overallDiscountPercent: 7,
        overallDiscountAmount: 25.50
      },
      {
        name: 'Price Override Overrides Base Unit Price',
        items: [
          { product: { unitPrice: 1000.00, vatExempt: false }, quantity: 2, customPriceOverride: 800.00 },
          { product: { unitPrice: 500.00, vatExempt: false }, quantity: 1 }
        ],
        overallDiscountPercent: 0,
        overallDiscountAmount: 0,
        expectedSubtotal: 2100.00,
        expectedGrandTotal: 2100.00
      },
      {
        name: '100% Full Discount Cart',
        items: [{ product: { unitPrice: 500.00, vatExempt: false }, quantity: 2 }],
        overallDiscountPercent: 100,
        overallDiscountAmount: 0,
        expectedGrandTotal: 0.00
      },
      {
        name: 'Empty Cart',
        items: [],
        overallDiscountPercent: 0,
        overallDiscountAmount: 0,
        expectedSubtotal: 0.00,
        expectedGrandTotal: 0.00
      }
    ];

    testCartTable.forEach((testCase) => {
      it(`guarantees vatableSales + vatAmount + vatExemptSales === grandTotal for "${testCase.name}"`, () => {
        const totals = calculateCartTotals(
          testCase.items,
          testCase.overallDiscountPercent,
          testCase.overallDiscountAmount
        );

        // Integer centavos exact balance
        const centavosSum = totals.vatableSalesCentavos + totals.vatAmountCentavos + totals.vatExemptSalesCentavos;
        expect(centavosSum).toBe(totals.grandTotalCentavos);

        // Pesos balance
        const pesosSum = Number((totals.vatableSales + totals.vatAmount + totals.vatExemptSales).toFixed(2));
        const grandTotalRounded = Number(totals.grandTotal.toFixed(2));
        expect(pesosSum).toBe(grandTotalRounded);

        if (testCase.expectedSubtotal !== undefined) {
          expect(totals.subtotal).toBe(testCase.expectedSubtotal);
        }
        if (testCase.expectedGrandTotal !== undefined) {
          expect(totals.grandTotal).toBe(testCase.expectedGrandTotal);
        }
      });
    });
  });

  describe('Over-Discount Error Throws (No Silent Clamping)', () => {
    it('throws when overall discount amount exceeds payable subtotal', () => {
      expect(() => {
        calculateCartTotals([{ product: { unitPrice: 100.00 }, quantity: 1 }], 0, 150.00);
      }).toThrow(/exceeds payable subtotal/i);
    });

    it('throws RangeError when overall discount percent > 100', () => {
      expect(() => {
        calculateCartTotals([{ product: { unitPrice: 100.00 }, quantity: 1 }], 125, 0);
      }).toThrow(RangeError);
    });

    it('throws RangeError on negative discount amount', () => {
      expect(() => {
        calculateCartTotals([{ product: { unitPrice: 100.00 }, quantity: 1 }], 0, -25);
      }).toThrow(RangeError);
    });

    it('throws RangeError on line discount > 100', () => {
      expect(() => {
        calculateCartTotals([{ product: { unitPrice: 100.00 }, quantity: 1, discountPercent: 120 }]);
      }).toThrow(RangeError);
    });
  });

  describe('Financial Metric Helpers', () => {
    it('calculates margin percentage correctly', () => {
      expect(calculateMarginPercentage(100.00, 70.00)).toBe(30.0);
      expect(calculateMarginPercentage(0, 50)).toBe(0);
    });

    it('calculates markup percentage correctly', () => {
      expect(calculateMarkupPercentage(100.00, 80.00)).toBe(25.0);
      expect(calculateMarkupPercentage(100, 0)).toBe(0);
    });

    it('calculates stock valuation accurately without float drift', () => {
      const result = calculateStockValuation(
        [
          { id: 'p1', unitPrice: 250.00, costPrice: 180.00 },
          { id: 'p2', unitPrice: 500.00, costPrice: 350.00 }
        ],
        { p1: 10, p2: 5 }
      );
      expect(result.totalRetailValue).toBe(5000.00);
      expect(result.totalCostValue).toBe(3550.00);
      expect(result.totalUnrealizedProfit).toBe(1450.00);
    });
  });
});
