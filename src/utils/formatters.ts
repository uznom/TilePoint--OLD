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

  const minDigits = Math.max(0, Math.min(20, Math.floor(minimumFractionDigits)));
  const maxDigits = Math.max(minDigits, Math.min(20, Math.floor(maximumFractionDigits)));

  const formatted = safeNum.toLocaleString('en-PH', {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
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

/**
 * Formats Tax Identification Number (TIN) into 3-digit grouped format (e.g. 123 456 789).
 */
export function formatTin(value: string | undefined | null): string {
  if (!value) return "";
  const clean = value.replace(/[-\s]/g, "");
  const match = clean.match(/.{1,3}/g);
  if (match) {
    return match.join(" ");
  }
  return value;
}
