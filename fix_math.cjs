const fs = require('fs');
let code = fs.readFileSync('src/utils/calculations.ts', 'utf8');

const newCalc = `export function calculateCartTotals(
  items: CartItemLike[],
  overallDiscountPercent: number = 0,
  overallDiscountAmount: number = 0,
  vatRate: number = 0.12
): CartTotals {
  const toCents = (val: number) => Math.round(val * 100);
  const fromCents = (val: number) => val / 100;

  let subtotalCents = 0;
  let lineDiscountCents = 0;
  let totalUnits = 0;

  items.forEach((item) => {
    const qty = Math.max(0, item.quantity || 0);
    totalUnits += qty;

    const unitPrice = item.customPriceOverride !== undefined && item.customPriceOverride >= 0
      ? item.customPriceOverride
      : (item.product.unitPrice || 0);
      
    const lineRawCents = toCents(unitPrice * qty);
    const itemDiscountCents = item.discountPercent ? toCents(fromCents(lineRawCents) * (item.discountPercent / 100)) : 0;
    
    subtotalCents += lineRawCents;
    lineDiscountCents += itemDiscountCents;
  });

  const netAfterItemDiscountsCents = subtotalCents - lineDiscountCents;
  
  let overallDiscountCents = 0;
  if (overallDiscountPercent > 0) {
    overallDiscountCents += toCents(fromCents(netAfterItemDiscountsCents) * (overallDiscountPercent / 100));
  }
  if (overallDiscountAmount > 0) {
    overallDiscountCents += toCents(overallDiscountAmount);
  }

  const totalDiscountCents = lineDiscountCents + overallDiscountCents;
  const grandTotalCents = Math.max(0, subtotalCents - totalDiscountCents);

  let allocatedVatableCents = 0;
  let allocatedVatAmountCents = 0;
  let allocatedVatExemptCents = 0;

  items.forEach((item) => {
    const qty = Math.max(0, item.quantity || 0);
    const unitPrice = item.customPriceOverride !== undefined && item.customPriceOverride >= 0
      ? item.customPriceOverride
      : (item.product.unitPrice || 0);
      
    const lineRawCents = toCents(unitPrice * qty);
    const itemDiscountCents = item.discountPercent ? toCents(fromCents(lineRawCents) * (item.discountPercent / 100)) : 0;
    const lineNetAfterItemDiscountCents = lineRawCents - itemDiscountCents;
    
    let lineFinalNetCents = lineNetAfterItemDiscountCents;
    if (netAfterItemDiscountsCents > 0 && overallDiscountCents > 0) {
      const ratio = lineNetAfterItemDiscountCents / netAfterItemDiscountsCents;
      const allocatedOverallDiscountCents = Math.round(overallDiscountCents * ratio);
      lineFinalNetCents = Math.max(0, lineNetAfterItemDiscountCents - allocatedOverallDiscountCents);
    }

    if (item.product.vatExempt) {
      allocatedVatExemptCents += lineFinalNetCents;
    } else {
      const netSalesCents = Math.round(lineFinalNetCents / (1 + vatRate));
      const taxCents = lineFinalNetCents - netSalesCents;
      allocatedVatableCents += netSalesCents;
      allocatedVatAmountCents += taxCents;
    }
  });

  return {
    subtotal: fromCents(subtotalCents),
    discountTotal: fromCents(totalDiscountCents),
    vatableSales: fromCents(allocatedVatableCents),
    vatAmount: fromCents(allocatedVatAmountCents),
    vatExemptSales: fromCents(allocatedVatExemptCents),
    grandTotal: fromCents(grandTotalCents),
    itemCount: items.length,
    totalUnits,
  };
}`;

code = code.replace(/export function calculateCartTotals\([\s\S]*?return \{\s*subtotal,[\s\S]*?totalUnits,\s*\};\s*\}/m, newCalc);

fs.writeFileSync('src/utils/calculations.ts', code);
