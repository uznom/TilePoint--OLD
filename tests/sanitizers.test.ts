import { describe, it, expect } from 'vitest';
import {
  isValidSku,
  isValidPositiveInt,
  isValidPositiveNumber,
  isValidBarcode,
  isValidEmail,
  sanitizeText,
  sanitizeSearch,
  sanitizeNumber,
  sanitizeInt,
  sanitizeCurrency,
  sanitizeSkuOrCode,
  sanitizePhone,
  sanitizeEmail,
  sanitizeObject,
} from '../src/utils/sanitizers';
import { xorObfuscateString, xorDeobfuscateString, encryptString, decryptString } from '../src/context/DbContext';
import { getClientFingerprintHash } from '../src/lib/fingerprint';

describe('Positive Input Validation & Sanitization Suite', () => {
  describe('isValidSku', () => {
    it('accepts standard alphanumeric SKUs with hyphens, underscores, slashes', () => {
      expect(isValidSku('TILE-60X60-GREY')).toBe(true);
      expect(isValidSku('SKU_12345')).toBe(true);
      expect(isValidSku('CER/2026/001')).toBe(true);
      expect(isValidSku('A#1')).toBe(true);
    });

    it('rejects empty, null, or non-string SKUs', () => {
      expect(isValidSku('')).toBe(false);
      expect(isValidSku('   ')).toBe(false);
      expect(isValidSku(null)).toBe(false);
      expect(isValidSku(undefined)).toBe(false);
      expect(isValidSku(12345)).toBe(false);
    });

    it('rejects SKUs with invalid characters or excessive length', () => {
      expect(isValidSku('SKU<script>')).toBe(false);
      expect(isValidSku('A'.repeat(65))).toBe(false);
    });
  });

  describe('isValidPositiveInt', () => {
    it('validates positive integers correctly', () => {
      expect(isValidPositiveInt(1)).toBe(true);
      expect(isValidPositiveInt(100)).toBe(true);
      expect(isValidPositiveInt('25')).toBe(true);
    });

    it('handles zero according to allowZero flag', () => {
      expect(isValidPositiveInt(0, false)).toBe(false);
      expect(isValidPositiveInt(0, true)).toBe(true);
      expect(isValidPositiveInt('0', true)).toBe(true);
      expect(isValidPositiveInt('0', false)).toBe(false);
    });

    it('rejects negative numbers, floats, and non-numeric inputs', () => {
      expect(isValidPositiveInt(-5)).toBe(false);
      expect(isValidPositiveInt(12.5)).toBe(false);
      expect(isValidPositiveInt('abc')).toBe(false);
      expect(isValidPositiveInt(NaN)).toBe(false);
      expect(isValidPositiveInt(Infinity)).toBe(false);
    });
  });

  describe('isValidPositiveNumber', () => {
    it('validates positive floating point numbers', () => {
      expect(isValidPositiveNumber(199.99)).toBe(true);
      expect(isValidPositiveNumber('45.50')).toBe(true);
      expect(isValidPositiveNumber(0, true)).toBe(true);
      expect(isValidPositiveNumber(0, false)).toBe(false);
      expect(isValidPositiveNumber(-10)).toBe(false);
    });
  });

  describe('isValidBarcode', () => {
    it('validates standard barcodes', () => {
      expect(isValidBarcode('4800016644015')).toBe(true);
      expect(isValidBarcode('BC-12345')).toBe(true);
      expect(isValidBarcode('123')).toBe(false); // Too short
      expect(isValidBarcode(null)).toBe(false);
    });
  });

  describe('isValidEmail & sanitizeEmail', () => {
    it('validates email addresses properly', () => {
      expect(isValidEmail('admin@tilepoint.com')).toBe(true);
      expect(isValidEmail('cashier.b1@store.ph')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('@nodomain.com')).toBe(false);
    });

    it('sanitizes emails by trimming and lowercasing', () => {
      expect(sanitizeEmail('  ADMIN@TilePoint.com  ')).toBe('admin@tilepoint.com');
    });
  });

  describe('sanitizeSearch & sanitizeText', () => {
    it('cleans search terms and trims control characters without guessing at malice', () => {
      expect(sanitizeSearch('  Granite Tiles  ')).toBe('Granite Tiles');
      expect(sanitizeSearch('OR 1=1 search term')).toBe('OR 1=1 search term');
    });

    it('strips script tags and dangerous HTML in sanitizeText', () => {
      expect(sanitizeText('<script>alert(1)</script>Hello')).toBe('Hello');
      expect(sanitizeText('<b>Bold</b> Title')).toBe('Bold Title');
    });
  });

  describe('Numerical and field sanitizers', () => {
    it('sanitizes numbers, ints, and currencies', () => {
      expect(sanitizeNumber('150.75')).toBe(150.75);
      expect(sanitizeInt('150.75')).toBe(150);
      expect(sanitizeCurrency(150.756)).toBe(150.76);
      expect(sanitizeSkuOrCode(' sku-001 <bad> ')).toBe('SKU-001 BAD');
      expect(sanitizePhone('+63 (917) 123-4567')).toBe('+63 (917) 123-4567');
    });

    it('sanitizes nested objects safely against proto pollution', () => {
      const input = {
        name: '<b>Item</b>',
        sku: 'SKU-001',
        __proto__: { polluted: true },
      };
      const cleaned = sanitizeObject(input);
      expect(cleaned.name).toBe('Item');
      expect(cleaned.sku).toBe('SKU-001');
      expect((Object.prototype as any).polluted).toBeUndefined();
    });
  });

  describe('UTF-8 Multi-Byte Serialization & Hashing Integrity', () => {
    it('obfuscates and deobfuscates multi-byte non-ASCII strings without corruption', () => {
      const secret = 'super_secret_corporate_key_32_chars_123';
      const nonAsciiInputs = [
        'Total: ₱1,500.75 (Paid in full)',
        'Cashier: Juan Dela Cruz Niño ño',
        'Products: タイル, Ceramic Slab, 🚀 Express Cart',
        'Special characters: €100, ¥5000, £250, ©2026',
      ];

      for (const text of nonAsciiInputs) {
        const obfuscated = xorObfuscateString(text, secret);
        expect(typeof obfuscated).toBe('string');
        expect(obfuscated.length).toBeGreaterThan(0);
        const deobfuscated = xorDeobfuscateString(obfuscated, secret);
        expect(deobfuscated).toBe(text);

        // Verify backwards compatible aliases
        expect(encryptString(text, secret)).toBe(obfuscated);
        expect(decryptString(obfuscated, secret)).toBe(text);
      }
    });

    it('generates deterministic device fingerprint hash over UTF-8 input', () => {
      const fpHash = getClientFingerprintHash();
      expect(typeof fpHash).toBe('string');
      expect(fpHash.startsWith('FP_')).toBe(true);
    });
  });
});
