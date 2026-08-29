/**
 * Input sanitization and positive schema/domain validation utilities.
 * 
 * Parameterized queries provide comprehensive SQL injection immunity at the database layer.
 * These utilities provide positive input validation (e.g., verifying a SKU matches expected
 * patterns, quantities are positive integers) and structural text sanitization.
 */

/**
 * Positive Validation: Verifies that a SKU or Product Code matches valid alphanumeric formats.
 */
export function isValidSku(sku: unknown): boolean {
  if (typeof sku !== 'string') return false;
  const trimmed = sku.trim();
  if (trimmed.length < 1 || trimmed.length > 64) return false;
  return /^[A-Za-z0-9\-_./# ]+$/.test(trimmed);
}

/**
 * Positive Validation: Verifies that a value is a valid positive integer (e.g. inventory quantities).
 */
export function isValidPositiveInt(val: unknown, allowZero: boolean = false): boolean {
  if (typeof val === 'number') {
    if (!Number.isFinite(val) || !Number.isInteger(val)) return false;
    return allowZero ? val >= 0 : val > 0;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!/^\d+$/.test(trimmed)) return false;
    const num = Number(trimmed);
    return allowZero ? num >= 0 : num > 0;
  }
  return false;
}

/**
 * Positive Validation: Verifies that a value is a valid finite monetary amount or decimal number.
 */
export function isValidPositiveNumber(val: unknown, allowZero: boolean = false): boolean {
  const num = typeof val === 'number' ? val : typeof val === 'string' ? Number(val.trim()) : NaN;
  if (isNaN(num) || !Number.isFinite(num)) return false;
  return allowZero ? num >= 0 : num > 0;
}

/**
 * Positive Validation: Verifies that a barcode is a valid numeric/alphanumeric code.
 */
export function isValidBarcode(barcode: unknown): boolean {
  if (typeof barcode !== 'string') return false;
  const trimmed = barcode.trim();
  if (trimmed.length < 4 || trimmed.length > 32) return false;
  return /^[A-Za-z0-9-]+$/.test(trimmed);
}

/**
 * Positive Validation: Verifies email format.
 */
export function isValidEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/**
 * Strips dangerous HTML tags and script injections from text inputs.
 */
export function sanitizeText(input: string | null | undefined, maxLength: number = 500): string {
  if (input === null || input === undefined) return '';
  const str = String(input);
  
  // Strip control characters except newline and tab
  const cleaned = str
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();

  return cleaned.slice(0, maxLength);
}

/**
 * Alias helper for sanitizeText
 */
export function sanitizeInputText(input: string | null | undefined, maxLength: number = 500): string {
  return sanitizeText(input, maxLength);
}

/**
 * Sanitizes search query terms: trims whitespace and strips non-printable control characters.
 */
export function sanitizeSearch(query: string | null | undefined): string {
  if (!query) return '';
  const str = String(query).trim();
  // eslint-disable-next-line no-control-regex
  return str.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
}

/**
 * Parses and sanitizes numerical inputs, guaranteeing a finite, valid number bounded by min/max.
 */
export function sanitizeNumber(
  val: number | string | null | undefined,
  defaultValue: number = 0,
  min: number = 0,
  max: number = Number.MAX_SAFE_INTEGER
): number {
  if (val === null || val === undefined || val === '') return defaultValue;
  const num = typeof val === 'number' ? val : Number(String(val).replace(/[^0-9.-]/g, ''));
  if (isNaN(num) || !isFinite(num)) return defaultValue;
  return Math.min(max, Math.max(min, num));
}

/**
 * Parses and sanitizes integer inputs (e.g. quantities, item counts).
 */
export function sanitizeInt(
  val: number | string | null | undefined,
  defaultValue: number = 0,
  min: number = 0,
  max: number = Number.MAX_SAFE_INTEGER
): number {
  const num = sanitizeNumber(val, defaultValue, min, max);
  return Math.floor(num);
}

/**
 * Parses and sanitizes monetary/price inputs, rounded to 2 decimal places.
 */
export function sanitizeCurrency(
  val: number | string | null | undefined,
  defaultValue: number = 0,
  min: number = 0,
  max: number = Number.MAX_SAFE_INTEGER
): number {
  const num = sanitizeNumber(val, defaultValue, min, max);
  return Number(num.toFixed(2));
}

/**
 * Sanitizes Product SKU or alphanumeric codes.
 */
export function sanitizeSkuOrCode(input: string | null | undefined, maxLength: number = 64): string {
  if (!input) return '';
  return String(input)
    .toUpperCase()
    .replace(/[^A-Z0-9\-_./# ]/g, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitizes Phone numbers.
 */
export function sanitizePhone(input: string | null | undefined): string {
  if (!input) return '';
  return String(input)
    .replace(/[^0-9+\-() ]/g, '')
    .trim()
    .slice(0, 30);
}

/**
 * Sanitizes and normalizes email addresses.
 */
export function sanitizeEmail(input: string | null | undefined): string {
  if (!input) return '';
  const cleaned = String(input).trim().toLowerCase();
  if (isValidEmail(cleaned)) {
    return cleaned.slice(0, 100);
  }
  return cleaned.slice(0, 100);
}

/**
 * Recursively sanitizes plain objects, trimming strings and stripping proto injection keys.
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const result: any = {};

  for (const [key, value] of Object.entries(obj)) {
    // Prevent prototype pollution
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    if (typeof value === 'string') {
      result[key] = sanitizeText(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeObject(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'string'
          ? sanitizeText(item)
          : item && typeof item === 'object'
          ? sanitizeObject(item)
          : item
      );
    } else {
      result[key] = value;
    }
  }

  return result as T;
}
