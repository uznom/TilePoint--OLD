/**
 * Centralized pure calculation functions for cart totals, financial metrics,
 * tax computations, and inventory valuations.
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
  discountTotal: number;
  vatableSales: number;
  vatAmount: number;
  vatExemptSales: number;
  grandTotal: number;
  itemCount: number;
  totalUnits: number;
}

/**
 * Calculates itemized cart subtotal, discount, VAT breakdown, and grand total.
 */
export function calculateCartTotals(
  items: CartItemLike[],
  overallDiscountPercent: number = 0,
  overallDiscountAmount: number = 0,
  vatRate: number = 0.12
): CartTotals {
  let subtotal = 0;
  let discountTotal = 0;
  let vatableSales = 0;
  let vatAmount = 0;
  let vatExemptSales = 0;
  let totalUnits = 0;

  items.forEach((item) => {
    const qty = Math.max(0, item.quantity || 0);
    totalUnits += qty;

    const unitPrice = item.customPriceOverride !== undefined && item.customPriceOverride >= 0
      ? item.customPriceOverride
      : (item.product.unitPrice || 0);

    const lineRaw = unitPrice * qty;
    const lineDiscount = item.discountPercent ? lineRaw * (item.discountPercent / 100) : 0;
    const lineSubtotal = lineRaw - lineDiscount;

    subtotal += lineRaw;
    discountTotal += lineDiscount;

    if (item.product.vatExempt) {
      vatExemptSales += lineSubtotal;
    } else {
      // VAT inclusive pricing assumed by default
      const netSales = lineSubtotal / (1 + vatRate);
      const tax = lineSubtotal - netSales;
      vatableSales += netSales;
      vatAmount += tax;
    }
  });

  // Apply overall discounts proportionally if any
  if (overallDiscountPercent > 0) {
    const addlDiscount = subtotal * (overallDiscountPercent / 100);
    discountTotal += addlDiscount;
  }
  if (overallDiscountAmount > 0) {
    discountTotal += overallDiscountAmount;
  }

  const grandTotal = Math.max(0, subtotal - discountTotal);

  return {
    subtotal,
    discountTotal,
    vatableSales,
    vatAmount,
    vatExemptSales,
    grandTotal,
    itemCount: items.length,
    totalUnits,
  };
}

/**
 * Calculates profit margin percentage from selling price and cost price.
 */
export function calculateMarginPercentage(unitPrice: number, costPrice: number): number {
  if (unitPrice <= 0) return 0;
  const profit = unitPrice - costPrice;
  return Number(((profit / unitPrice) * 100).toFixed(1));
}

/**
 * Calculates markup percentage over cost price.
 */
export function calculateMarkupPercentage(unitPrice: number, costPrice: number): number {
  if (costPrice <= 0) return 0;
  const profit = unitPrice - costPrice;
  return Number(((profit / costPrice) * 100).toFixed(1));
}

/**
 * Calculates inventory stock valuation for a given product list and stock records.
 */
export function calculateStockValuation(
  products: Array<{ id: string; unitPrice: number; costPrice?: number }>,
  stockQuantitiesMap: Record<string, number>
): { totalRetailValue: number; totalCostValue: number; totalUnrealizedProfit: number } {
  let totalRetailValue = 0;
  let totalCostValue = 0;

  products.forEach((p) => {
    const qty = Math.max(0, stockQuantitiesMap[p.id] || 0);
    totalRetailValue += (p.unitPrice || 0) * qty;
    totalCostValue += (p.costPrice || p.unitPrice || 0) * qty;
  });

  return {
    totalRetailValue,
    totalCostValue,
    totalUnrealizedProfit: totalRetailValue - totalCostValue,
  };
}
