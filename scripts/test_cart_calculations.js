import assert from 'assert';
import { calculateCartTotals, calculateMarginPercentage, calculateMarkupPercentage, calculateStockValuation } from '../src/utils/calculations.ts';

console.log('[Unit Test] Running Cart Financial Calculations & VAT Integrity Suite...\n');

// -------------------------------------------------------------
// Test Table: Diverse Cart Scenarios
// -------------------------------------------------------------
const testCartTable = [
  {
    name: 'Standard Vatable Single Item',
    items: [
      { product: { unitPrice: 500.00, vatExempt: false }, quantity: 2 }
    ],
    overallDiscountPercent: 0,
    overallDiscountAmount: 0,
    expectedSubtotal: 1000.00,
    expectedGrandTotal: 1000.00
  },
  {
    name: 'Multiple Items with Fractional Cents and Varying Quantities',
    items: [
      { product: { unitPrice: 199.99, vatExempt: false }, quantity: 3 },
      { product: { unitPrice: 349.50, vatExempt: false }, quantity: 7 },
      { product: { unitPrice: 49.25, vatExempt: false }, quantity: 12 }
    ],
    overallDiscountPercent: 0,
    overallDiscountAmount: 0
  },
  {
    name: 'Line Items with Individual Line Discounts',
    items: [
      { product: { unitPrice: 1200.00, vatExempt: false }, quantity: 2, discountPercent: 10 }, // 2400 - 240 = 2160
      { product: { unitPrice: 450.00, vatExempt: false }, quantity: 4, discountPercent: 20 }   // 1800 - 360 = 1440
    ],
    overallDiscountPercent: 0,
    overallDiscountAmount: 0
  },
  {
    name: 'Mixed Cart with Vatable & VAT-Exempt Items',
    items: [
      { product: { unitPrice: 850.00, vatExempt: false }, quantity: 5 }, // 4250 vatable
      { product: { unitPrice: 200.00, vatExempt: true }, quantity: 10 }   // 2000 exempt
    ],
    overallDiscountPercent: 0,
    overallDiscountAmount: 0
  },
  {
    name: 'Overall Percentage Discount Applied to Post-Line-Discount Subtotal',
    items: [
      { product: { unitPrice: 1000.00, vatExempt: false }, quantity: 2, discountPercent: 10 }, // 2000 - 200 = 1800
      { product: { unitPrice: 500.00, vatExempt: false }, quantity: 2 }                         // 1000 - 0 = 1000
    ],
    overallDiscountPercent: 15, // 15% of 2800 = 420 -> grand total 2380
    overallDiscountAmount: 0
  },
  {
    name: 'Overall Fixed Amount Discount Applied to Post-Line-Discount Subtotal',
    items: [
      { product: { unitPrice: 2500.00, vatExempt: false }, quantity: 2, discountPercent: 20 }, // 5000 - 1000 = 4000
      { product: { unitPrice: 750.00, vatExempt: true }, quantity: 2 }                           // 1500 - 0 = 1500
    ],
    overallDiscountPercent: 0,
    overallDiscountAmount: 500.00 // 5500 - 500 = 5000
  },
  {
    name: 'Combined Line Discounts and Overall Percent & Fixed Discounts',
    items: [
      { product: { unitPrice: 325.75, vatExempt: false }, quantity: 6, discountPercent: 5 },
      { product: { unitPrice: 890.00, vatExempt: false }, quantity: 3, discountPercent: 15 },
      { product: { unitPrice: 150.00, vatExempt: true }, quantity: 8, discountPercent: 10 }
    ],
    overallDiscountPercent: 5,
    overallDiscountAmount: 100.00
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
    name: 'Custom Price Override Overrides Base Unit Price',
    items: [
      { product: { unitPrice: 1000.00, vatExempt: false }, quantity: 2, customPriceOverride: 800.00 }, // 1600
      { product: { unitPrice: 500.00, vatExempt: false }, quantity: 1 }                                  // 500
    ],
    overallDiscountPercent: 0,
    overallDiscountAmount: 0,
    expectedSubtotal: 2100.00,
    expectedGrandTotal: 2100.00
  },
  {
    name: '100% Full Discount Cart',
    items: [
      { product: { unitPrice: 500.00, vatExempt: false }, quantity: 2 }
    ],
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

// -------------------------------------------------------------
// Execution: Table-Driven VAT & Grand Total Balance Assertions
// -------------------------------------------------------------
console.log('1. Validating VAT Balance (vatableSales + vatAmount + vatExemptSales === grandTotal) across cart table...');

testCartTable.forEach((testCase, idx) => {
  const totals = calculateCartTotals(
    testCase.items,
    testCase.overallDiscountPercent,
    testCase.overallDiscountAmount
  );

  // Exact centavos balance check:
  const centavosSum = totals.vatableSalesCentavos + totals.vatAmountCentavos + totals.vatExemptSalesCentavos;
  assert.strictEqual(
    centavosSum,
    totals.grandTotalCentavos,
    `[${testCase.name}] Centavos sum (${centavosSum}) must exactly equal grandTotalCentavos (${totals.grandTotalCentavos})`
  );

  // Pesos balance check (converted to 2 decimal places):
  const pesosSum = Number((totals.vatableSales + totals.vatAmount + totals.vatExemptSales).toFixed(2));
  const grandTotalRounded = Number(totals.grandTotal.toFixed(2));
  assert.strictEqual(
    pesosSum,
    grandTotalRounded,
    `[${testCase.name}] Pesos sum (${pesosSum}) must exactly equal grandTotal (${grandTotalRounded})`
  );

  if (testCase.expectedSubtotal !== undefined) {
    assert.strictEqual(totals.subtotal, testCase.expectedSubtotal, `[${testCase.name}] Unexpected subtotal`);
  }
  if (testCase.expectedGrandTotal !== undefined) {
    assert.strictEqual(totals.grandTotal, testCase.expectedGrandTotal, `[${testCase.name}] Unexpected grandTotal`);
  }

  console.log(`  -> PASS (${idx + 1}/${testCartTable.length}): ${testCase.name} [Grand Total: ₱${totals.grandTotal.toFixed(2)}, VAT: ₱${totals.vatAmount.toFixed(2)}, Exempt: ₱${totals.vatExemptSales.toFixed(2)}]`);
});

// -------------------------------------------------------------
// 2. Over-Discount Thrown Error Assertions
// -------------------------------------------------------------
console.log('\n2. Validating Thrown Errors on Over-Discounts and Negative Values (No Silent Clamping)...');

// Scenario A: Overall fixed discount exceeds post-line-discount subtotal
assert.throws(() => {
  calculateCartTotals(
    [{ product: { unitPrice: 100.00 }, quantity: 1 }],
    0,
    150.00 // 150 > 100
  );
}, /exceeds payable subtotal/i, 'Over-discount amount must throw an Error');
console.log('  -> PASS: Throws error when overall discount amount exceeds payable subtotal.');

// Scenario B: Overall percent discount > 100%
assert.throws(() => {
  calculateCartTotals(
    [{ product: { unitPrice: 100.00 }, quantity: 1 }],
    120, // 120%
    0
  );
}, /must be between 0 and 100/i, 'Discount > 100% must throw RangeError');
console.log('  -> PASS: Throws RangeError when overall discount percent > 100%.');

// Scenario C: Negative discount amount
assert.throws(() => {
  calculateCartTotals(
    [{ product: { unitPrice: 100.00 }, quantity: 1 }],
    0,
    -50.00
  );
}, /cannot be negative/i, 'Negative discount amount must throw RangeError');
console.log('  -> PASS: Throws RangeError when discount amount is negative.');

// Scenario D: Line discount > 100%
assert.throws(() => {
  calculateCartTotals(
    [{ product: { unitPrice: 100.00 }, quantity: 1, discountPercent: 150 }]
  );
}, /must be between 0 and 100/i, 'Line discount > 100% must throw RangeError');
console.log('  -> PASS: Throws RangeError when line discount percent > 100%.');

// -------------------------------------------------------------
// 3. Margin, Markup & Stock Valuation Integer Centavos Tests
// -------------------------------------------------------------
console.log('\n3. Validating Financial & Inventory Valuation Helpers in Integer Centavos...');

// Margin calculation
const margin = calculateMarginPercentage(100.00, 70.00);
assert.strictEqual(margin, 30.0);
console.log('  -> PASS: Margin percentage calculated accurately (30.0%).');

// Markup calculation
const markup = calculateMarkupPercentage(100.00, 80.00);
assert.strictEqual(markup, 25.0);
console.log('  -> PASS: Markup percentage calculated accurately (25.0%).');

// Stock valuation
const valuation = calculateStockValuation(
  [
    { id: 'p1', unitPrice: 250.00, costPrice: 180.00 },
    { id: 'p2', unitPrice: 500.00, costPrice: 350.00 }
  ],
  { p1: 10, p2: 5 }
);
assert.strictEqual(valuation.totalRetailValue, 5000.00); // 2500 + 2500 = 5000
assert.strictEqual(valuation.totalCostValue, 3550.00);   // 1800 + 1750 = 3550
assert.strictEqual(valuation.totalUnrealizedProfit, 1450.00);
console.log('  -> PASS: Stock valuation calculated without float drift.');

console.log('\n=============================================================');
console.log(' [ALL PURE CART CALCULATION & VAT INTEGRITY TESTS PASSED] ');
console.log('=============================================================\n');
