/**
 * Centralized formatting utilities for currency and operational metrics.
 */

export interface FormatCurrencyOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  compact?: boolean;
  showSymbol?: boolean;
}

/**
 * Formats a numeric value or numeric string into Philippine Peso format (₱#,##0.00).
 * Safely parses input, strips leading zero artifacts, and handles NaN/undefined.
 */
export function formatCurrency(
  val: number | string | null | undefined,
  options?: FormatCurrencyOptions
): string {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    compact = false,
    showSymbol = true,
  } = options || {};

  const num = typeof val === 'number' ? val : Number(val);
  const safeNum = isNaN(num) || !isFinite(num) ? 0 : num;

  const formatted = safeNum.toLocaleString('en-PH', {
    minimumFractionDigits,
    maximumFractionDigits,
    notation: compact ? 'compact' : 'standard',
  });

  return showSymbol ? `₱${formatted}` : formatted;
}

/**
 * Formats unit quantities with singular/plural suffix safely.
 */
export function formatUnits(
  val: number | string | null | undefined,
  unitSingular: string = 'Unit',
  unitPlural: string = 'Units'
): string {
  const num = typeof val === 'number' ? val : Number(val);
  const safeNum = isNaN(num) || !isFinite(num) ? 0 : num;
  const label = Math.abs(safeNum) === 1 ? unitSingular : unitPlural;
  return `${safeNum.toLocaleString()} ${label}`;
}
