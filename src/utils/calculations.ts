/**
 * Centralized pure calculation functions for cart totals, financial metrics,
 * tax computations, and inventory valuations.
 *
 * All financial math is conducted internally in integer centavos (1 PHP = 100 centavos)
 * to completely eliminate floating-point drift. Conversion to Pesos occurs strictly
 * for return/display values.
 */

export interface CartItemLike {
  product: {
    unitPrice?: number;
    vatExempt?: boolean;
    vatInclusive?: boolean;
    costPrice?: number;
  };
  quantity: number;
  discountPercent?: number;
  customPriceOverride?: number;
}

export interface CartTotals {
  subtotal: number;
  lineDiscountTotal: number;
  overallDiscountTotal: number;
  discountTotal: number;
  vatableSales: number;
  vatAmount: number;
  vatExemptSales: number;
  grandTotal: number;
  itemCount: number;
  totalUnits: number;
  // Exact integer centavos representations for high-precision validation
  subtotalCentavos: number;
  discountTotalCentavos: number;
  vatableSalesCentavos: number;
  vatAmountCentavos: number;
  vatExemptSalesCentavos: number;
  grandTotalCentavos: number;
}

/**
 * Converts a peso amount (float or integer) to exact integer centavos.
 */
export function toCentavos(pesos: number): number {
  return Math.round((Number(pesos) || 0) * 100);
}

/**
 * Converts an integer centavos amount back to float pesos (2 decimal precision).
 */
export function toPesos(centavos: number): number {
  return (Number(centavos) || 0) / 100;
}

/**
 * Calculates itemized cart subtotal, discount, VAT breakdown, and grand total.
 * 
 * Rules:
 * 1. Operates strictly in integer centavos throughout to prevent floating point drift.
 * 2. Takes overall discounts strictly from the post-line-discount subtotal.
 * 3. Replaces silent clamps with thrown Error if discounts exceed subtotal (over-discount error).
 * 4. Strictly guarantees that: vatableSales + vatAmount + vatExemptSales === grandTotal.
 */
export function calculateCartTotals(
  items: CartItemLike[],
  overallDiscountPercent: number = 0,
  overallDiscountAmount: number = 0,
  vatRate: number = 0.12
): CartTotals {
  if (overallDiscountPercent < 0 || overallDiscountPercent > 100) {
    throw new RangeError(`Overall discount percent must be between 0 and 100. Received: ${overallDiscountPercent}%`);
  }
  if (overallDiscountAmount < 0) {
    throw new RangeError(`Overall discount amount cannot be negative. Received: ${overallDiscountAmount}`);
  }

  let subtotalCentavos = 0;
  let lineDiscountCentavos = 0;
  let totalUnits = 0;

  // Step 1: Compute line item gross, quantities, and line discounts in centavos
  const itemCalculations = items.map((item) => {
    const qty = Math.max(0, Number(item.quantity) || 0);
    totalUnits += qty;

    const unitPricePesos = item.customPriceOverride !== undefined && item.customPriceOverride >= 0
      ? item.customPriceOverride
      : (item.product.unitPrice || 0);

    const unitPriceCentavos = toCentavos(unitPricePesos);
    const lineGrossCentavos = unitPriceCentavos * qty;

    const lineDiscountPct = Number(item.discountPercent) || 0;
    if (lineDiscountPct < 0 || lineDiscountPct > 100) {
      throw new RangeError(`Line discount percent must be between 0 and 100. Received: ${lineDiscountPct}%`);
    }

    const itemDiscountCentavos = lineDiscountPct > 0
      ? Math.round(lineGrossCentavos * (lineDiscountPct / 100))
      : 0;

    if (itemDiscountCentavos > lineGrossCentavos) {
      throw new Error(`Line discount exceeds line total for item.`);
    }

    const lineNetCentavos = lineGrossCentavos - itemDiscountCentavos;

    subtotalCentavos += lineGrossCentavos;
    lineDiscountCentavos += itemDiscountCentavos;

    return {
      item,
      qty,
      unitPriceCentavos,
      lineGrossCentavos,
      itemDiscountCentavos,
      lineNetCentavos,
      vatExempt: Boolean(item.product.vatExempt)
    };
  });

  // Step 2: Calculate post-line-discount subtotal
  const postLineDiscountSubtotalCentavos = subtotalCentavos - lineDiscountCentavos;

  // Step 3: Take overall discount from the post-line-discount subtotal
  let overallDiscountCentavos = 0;
  if (overallDiscountPercent > 0) {
    overallDiscountCentavos += Math.round(postLineDiscountSubtotalCentavos * (overallDiscountPercent / 100));
  }
  if (overallDiscountAmount > 0) {
    overallDiscountCentavos += toCentavos(overallDiscountAmount);
  }

  // Step 4: Validate against over-discount (throw error rather than silent clamping)
  if (overallDiscountCentavos > postLineDiscountSubtotalCentavos) {
    throw new Error(
      `Overall discount (₱${toPesos(overallDiscountCentavos).toFixed(2)}) exceeds payable subtotal after line discounts (₱${toPesos(postLineDiscountSubtotalCentavos).toFixed(2)}).`
    );
  }

  const totalDiscountCentavos = lineDiscountCentavos + overallDiscountCentavos;
  const grandTotalCentavos = postLineDiscountSubtotalCentavos - overallDiscountCentavos;

  // Step 5: Allocate net payable across line items and compute exact tax breakdowns in integer centavos
  let allocatedVatableCentavos = 0;
  let allocatedVatAmountCentavos = 0;
  let allocatedVatExemptCentavos = 0;

  // Proportional allocation of overall discount with residual centavo balancing
  let allocatedFinalTotalCentavos = 0;

  itemCalculations.forEach((itemCalc, idx) => {
    let lineFinalCentavos = 0;
    if (postLineDiscountSubtotalCentavos > 0) {
      if (idx === itemCalculations.length - 1) {
        // Last line absorbs residual rounding to guarantee exact grandTotalCentavos sum
        lineFinalCentavos = grandTotalCentavos - allocatedFinalTotalCentavos;
      } else {
        lineFinalCentavos = Math.round(itemCalc.lineNetCentavos * (grandTotalCentavos / postLineDiscountSubtotalCentavos));
        allocatedFinalTotalCentavos += lineFinalCentavos;
      }
    }

    if (itemCalc.vatExempt) {
      allocatedVatExemptCentavos += lineFinalCentavos;
    } else {
      // Philippines 12% standard VAT: Net Sales = Gross / (1 + vatRate), VAT Amount = Gross - Net Sales
      const netSalesCentavos = Math.round(lineFinalCentavos / (1 + vatRate));
      const vatCentavos = lineFinalCentavos - netSalesCentavos;
      allocatedVatableCentavos += netSalesCentavos;
      allocatedVatAmountCentavos += vatCentavos;
    }
  });

  return {
    subtotal: toPesos(subtotalCentavos),
    lineDiscountTotal: toPesos(lineDiscountCentavos),
    overallDiscountTotal: toPesos(overallDiscountCentavos),
    discountTotal: toPesos(totalDiscountCentavos),
    vatableSales: toPesos(allocatedVatableCentavos),
    vatAmount: toPesos(allocatedVatAmountCentavos),
    vatExemptSales: toPesos(allocatedVatExemptCentavos),
    grandTotal: toPesos(grandTotalCentavos),
    itemCount: items.length,
    totalUnits,
    subtotalCentavos,
    discountTotalCentavos: totalDiscountCentavos,
    vatableSalesCentavos: allocatedVatableCentavos,
    vatAmountCentavos: allocatedVatAmountCentavos,
    vatExemptSalesCentavos: allocatedVatExemptCentavos,
    grandTotalCentavos,
  };
}

/**
 * Calculates profit margin percentage from selling price and cost price.
 */
export function calculateMarginPercentage(unitPrice: number, costPrice: number): number {
  if (unitPrice <= 0) return 0;
  const unitPriceCents = toCentavos(unitPrice);
  const costPriceCents = toCentavos(costPrice);
  const profitCents = unitPriceCents - costPriceCents;
  return Number(((profitCents / unitPriceCents) * 100).toFixed(1));
}

/**
 * Calculates markup percentage over cost price.
 */
export function calculateMarkupPercentage(unitPrice: number, costPrice: number): number {
  if (costPrice <= 0) return 0;
  const unitPriceCents = toCentavos(unitPrice);
  const costPriceCents = toCentavos(costPrice);
  const profitCents = unitPriceCents - costPriceCents;
  return Number(((profitCents / costPriceCents) * 100).toFixed(1));
}

/**
 * Calculates inventory stock valuation for a given product list and stock records in integer centavos.
 */
export function calculateStockValuation(
  products: Array<{ id: string; unitPrice: number; costPrice?: number }>,
  stockQuantitiesMap: Record<string, number>
): { totalRetailValue: number; totalCostValue: number; totalUnrealizedProfit: number } {
  let totalRetailCentavos = 0;
  let totalCostCentavos = 0;

  products.forEach((p) => {
    const qty = Math.max(0, stockQuantitiesMap[p.id] || 0);
    const unitPriceCents = toCentavos(p.unitPrice);
    const costPriceCents = toCentavos(p.costPrice !== undefined ? p.costPrice : p.unitPrice);
    totalRetailCentavos += unitPriceCents * qty;
    totalCostCentavos += costPriceCents * qty;
  });

  return {
    totalRetailValue: toPesos(totalRetailCentavos),
    totalCostValue: toPesos(totalCostCentavos),
    totalUnrealizedProfit: toPesos(totalRetailCentavos - totalCostCentavos),
  };
}
