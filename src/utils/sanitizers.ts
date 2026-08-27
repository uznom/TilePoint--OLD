/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { detectSQLi } from '../lib/crypto';

/**
 * Strips dangerous HTML tags and script injections from text inputs.
 */
export function sanitizeText(input: string | null | undefined, maxLength: number = 500): string {
  if (input === null || input === undefined) return '';
  const str = String(input);
  
  // Strip control characters except newline and tab
  const cleaned = str
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();

  return cleaned.slice(0, maxLength);
}

/**
 * Sanitizes search query terms: trims, strips SQLi patterns and special characters.
 */
export function sanitizeSearch(query: string | null | undefined): string {
  if (!query) return '';
  let str = String(query).trim();
  
  // Check for malicious SQLi injection patterns
  const sqli = detectSQLi(str);
  if (!sqli.isSafe) {
    str = str.replace(/['";\-\-#\/\*]/g, ' ');
  }

  // Remove control characters
  return str.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();
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
  // Basic email pattern check
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
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
