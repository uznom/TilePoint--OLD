/**
 * Centralized, high-precision formatting utilities for currency, operational metrics,
 * unit counts, and localized financial calculations.
 */

export type SignDisplay = 'auto' | 'always' | 'never' | 'accounting' | 'exceptZero';

export interface FormatCurrencyOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  compact?: boolean;
  showSymbol?: boolean;
  symbol?: string;
  symbolPosition?: 'prefix' | 'suffix';
  showSpace?: boolean;
  signDisplay?: SignDisplay;
  fallback?: string;
  locale?: string;
}

export interface FormatNumberOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  compact?: boolean;
  signDisplay?: 'auto' | 'always' | 'never' | 'exceptZero';
  fallback?: string;
  locale?: string;
}

export interface FormatPercentOptions {
  /** If true, input is treated as 0.0 to 1.0 (e.g. 0.12 -> 12%). If false (default), input is already scaled (e.g. 12 -> 12%). */
  isDecimal?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  signDisplay?: 'auto' | 'always' | 'never' | 'exceptZero';
  showSymbol?: boolean;
  fallback?: string;
  locale?: string;
}

export interface FormatCompactOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  fallback?: string;
  locale?: string;
}

export interface FormatUnitsOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  fallback?: string;
}

/**
 * Formats a numeric value or numeric string into Philippine Peso format (e.g., ₱1,250.00, -₱500.00, (₱500.00)).
 * Safely handles negative sign positioning before currency symbol, accounting parentheses,
 * compact notation, and NaN/undefined fallbacks.
 */
export function formatCurrency(
  val: number | string | null | undefined,
  options?: FormatCurrencyOptions
): string {
  const isCompact = Boolean(options?.compact);
  const {
    minimumFractionDigits = isCompact ? 0 : 2,
    maximumFractionDigits = isCompact ? 1 : 2,
    compact = false,
    showSymbol = true,
    symbol = '₱',
    symbolPosition = 'prefix',
    showSpace = false,
    signDisplay = 'auto',
    fallback,
    locale = 'en-PH',
  } = options || {};

  const num = typeof val === 'number' ? val : (val === null || val === undefined || val === '') ? NaN : Number(val);

  if (isNaN(num) || !isFinite(num)) {
    if (fallback !== undefined) return fallback;
    // Default safe fallback is ₱0.00
    const zeroFormatted = (0).toLocaleString(locale, {
      minimumFractionDigits,
      maximumFractionDigits,
    });
    const sp = showSpace && showSymbol && symbol ? ' ' : '';
    return showSymbol
      ? symbolPosition === 'suffix'
        ? `${zeroFormatted}${sp}${symbol}`
        : `${symbol}${sp}${zeroFormatted}`
      : zeroFormatted;
  }

  // Normalize negative zero
  const safeNum = Object.is(num, -0) ? 0 : num;

  const minDigits = Math.max(0, Math.min(20, Math.floor(minimumFractionDigits)));
  const maxDigits = Math.max(minDigits, Math.min(20, Math.floor(maximumFractionDigits)));

  const absNum = Math.abs(safeNum);
  const isEffectivelyZero = Number(absNum.toFixed(maxDigits)) === 0;

  const isNegative = safeNum < 0 && !isEffectivelyZero;
  const isPositive = safeNum > 0 && !isEffectivelyZero;

  const formattedMagnitude = absNum.toLocaleString(locale, {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
    notation: compact ? 'compact' : 'standard',
  });

  const sym = showSymbol ? symbol : '';
  const sp = showSymbol && showSpace && sym.length > 0 ? ' ' : '';
  const coreFormatted = symbolPosition === 'suffix'
    ? `${formattedMagnitude}${sp}${sym}`
    : `${sym}${sp}${formattedMagnitude}`;

  if (signDisplay === 'accounting' && isNegative) {
    return `(${coreFormatted})`;
  }

  let signPrefix = '';
  if (signDisplay === 'always') {
    if (isPositive) signPrefix = '+';
    else if (isNegative) signPrefix = '-';
    else signPrefix = '';
  } else if (signDisplay === 'exceptZero') {
    if (isPositive) signPrefix = '+';
    else if (isNegative) signPrefix = '-';
  } else if (signDisplay === 'never') {
    signPrefix = '';
  } else {
    // 'auto'
    if (isNegative) signPrefix = '-';
  }

  return `${signPrefix}${coreFormatted}`;
}

/**
 * Formats a numeric value with thousands separators and customizable decimal places.
 */
export function formatNumber(
  val: number | string | null | undefined,
  options?: FormatNumberOptions
): string {
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    compact = false,
    signDisplay = 'auto',
    fallback,
    locale = 'en-PH',
  } = options || {};

  const num = typeof val === 'number' ? val : (val === null || val === undefined || val === '') ? NaN : Number(val);

  if (isNaN(num) || !isFinite(num)) {
    if (fallback !== undefined) return fallback;
    return '0';
  }

  const safeNum = Object.is(num, -0) ? 0 : num;
  const minDigits = Math.max(0, Math.min(20, Math.floor(minimumFractionDigits)));
  const maxDigits = Math.max(minDigits, Math.min(20, Math.floor(maximumFractionDigits)));

  const absNum = Math.abs(safeNum);
  const isEffectivelyZero = Number(absNum.toFixed(maxDigits)) === 0;

  const isNegative = safeNum < 0 && !isEffectivelyZero;
  const isPositive = safeNum > 0 && !isEffectivelyZero;

  const formattedMagnitude = absNum.toLocaleString(locale, {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
    notation: compact ? 'compact' : 'standard',
  });

  let signPrefix = '';
  if (signDisplay === 'always') {
    if (isPositive) signPrefix = '+';
    else if (isNegative) signPrefix = '-';
  } else if (signDisplay === 'exceptZero') {
    if (isPositive) signPrefix = '+';
    else if (isNegative) signPrefix = '-';
  } else if (signDisplay === 'never') {
    signPrefix = '';
  } else {
    if (isNegative) signPrefix = '-';
  }

  return `${signPrefix}${formattedMagnitude}`;
}

/**
 * Formats a value into a percentage string (e.g. "12.5%", "+5.0%", "-3.2%").
 */
export function formatPercent(
  val: number | string | null | undefined,
  options?: FormatPercentOptions
): string {
  const {
    isDecimal = false,
    minimumFractionDigits = 0,
    maximumFractionDigits = 1,
    signDisplay = 'auto',
    showSymbol = true,
    fallback,
    locale = 'en-PH',
  } = options || {};

  const num = typeof val === 'number' ? val : (val === null || val === undefined || val === '') ? NaN : Number(val);

  if (isNaN(num) || !isFinite(num)) {
    if (fallback !== undefined) return fallback;
    return showSymbol ? '0%' : '0';
  }

  const scaled = isDecimal ? num * 100 : num;
  const numStr = formatNumber(scaled, {
    minimumFractionDigits,
    maximumFractionDigits,
    signDisplay,
    locale,
  });

  return showSymbol ? `${numStr}%` : numStr;
}

/**
 * Formats large metrics into compact abbreviated format (e.g. 1.2K, 3.5M, 2.0B).
 */
export function formatCompactNumber(
  val: number | string | null | undefined,
  options?: FormatCompactOptions
): string {
  return formatNumber(val, {
    compact: true,
    maximumFractionDigits: options?.maximumFractionDigits ?? 1,
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    fallback: options?.fallback,
    locale: options?.locale,
  });
}

/**
 * Formats unit quantities with thousands separators and singular/plural suffix safely.
 */
export function formatUnits(
  val: number | string | null | undefined,
  unitSingular: string = 'Unit',
  unitPlural: string = 'Units',
  options?: FormatUnitsOptions
): string {
  const num = typeof val === 'number' ? val : (val === null || val === undefined || val === '') ? NaN : Number(val);

  if (isNaN(num) || !isFinite(num)) {
    if (options?.fallback !== undefined) return options.fallback;
    return `0 ${unitPlural}`;
  }

  const safeNum = Object.is(num, -0) ? 0 : num;
  const absNum = Math.abs(safeNum);
  const label = absNum === 1 ? unitSingular : unitPlural;

  const formatted = safeNum.toLocaleString('en-PH', {
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  });

  return `${formatted} ${label}`;
}

/**
 * Safely parses a formatted currency string, accounting amount, or dirty numeric string into a float.
 * Correctly extracts values from formats like "₱1,250.50", "-₱500.00", "(₱1,200.00)", "$ 99.95", etc.
 */
export function parseCurrency(
  val: string | number | null | undefined,
  defaultValue: number = 0
): number {
  if (val === null || val === undefined) return defaultValue;
  if (typeof val === 'number') {
    return isNaN(val) || !isFinite(val) ? defaultValue : val;
  }

  const str = String(val).trim();
  if (!str) return defaultValue;

  // Check for accounting parentheses: (1,234.56) or (₱1,234.56)
  const isAccountingNegative = /^\(.*\)$/.test(str);

  // Strip currency symbols, commas, spaces, letters, and parentheses
  let cleaned = str.replace(/[₱$€¥£A-Za-z,\s()]/g, '');

  if (isAccountingNegative && !cleaned.startsWith('-')) {
    cleaned = `-${cleaned}`;
  }

  const parsed = Number(cleaned);
  return isNaN(parsed) || !isFinite(parsed) ? defaultValue : parsed;
}

/**
 * Alias helper for parseCurrency to parse any human-formatted numeric string into a clean float.
 */
export function parseFormattedNumber(
  val: string | number | null | undefined,
  defaultValue: number = 0
): number {
  return parseCurrency(val, defaultValue);
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

/**
 * Parses user input for tender amount, stripping commas, currency symbols, and whitespace safely.
 */
export function parseTenderAmount(val: string | number | null | undefined): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (val === null || val === undefined) return 0;
  const sanitized = val.toString().replace(/,/g, '').trim();
  const num = parseFloat(sanitized);
  return isNaN(num) ? 0 : num;
}

