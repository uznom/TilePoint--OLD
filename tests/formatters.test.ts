import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatCompactNumber,
  formatUnits,
  parseCurrency,
  parseFormattedNumber,
  formatTin,
} from '../src/utils/formatters';

describe('formatters.ts - Standard Currency & Number Formatting Suite', () => {
  describe('formatCurrency - Philippine Peso and Core Currency Formatting', () => {
    it('formats standard positive numbers with Philippine Peso symbol and two decimal places', () => {
      expect(formatCurrency(1000)).toBe('₱1,000.00');
      expect(formatCurrency(1234.5)).toBe('₱1,234.50');
      expect(formatCurrency(0.99)).toBe('₱0.99');
      expect(formatCurrency(5000000)).toBe('₱5,000,000.00');
    });

    it('formats negative currency correctly with minus sign before currency symbol (fixes "₱-100" bug)', () => {
      expect(formatCurrency(-500)).toBe('-₱500.00');
      expect(formatCurrency(-1250.75)).toBe('-₱1,250.75');
      expect(formatCurrency(-0.5)).toBe('-₱0.50');
      expect(formatCurrency('-99.99')).toBe('-₱99.99');
    });

    it('formats accounting style negative currency with parentheses', () => {
      expect(formatCurrency(-1250.75, { signDisplay: 'accounting' })).toBe('(₱1,250.75)');
      expect(formatCurrency(-50, { signDisplay: 'accounting' })).toBe('(₱50.00)');
      expect(formatCurrency(1250.75, { signDisplay: 'accounting' })).toBe('₱1,250.75');
      expect(formatCurrency(0, { signDisplay: 'accounting' })).toBe('₱0.00');
    });

    it('supports explicit sign display options (always, exceptZero, never)', () => {
      expect(formatCurrency(250, { signDisplay: 'always' })).toBe('+₱250.00');
      expect(formatCurrency(-250, { signDisplay: 'always' })).toBe('-₱250.00');
      expect(formatCurrency(250, { signDisplay: 'exceptZero' })).toBe('+₱250.00');
      expect(formatCurrency(0, { signDisplay: 'exceptZero' })).toBe('₱0.00');
      expect(formatCurrency(-250, { signDisplay: 'never' })).toBe('₱250.00');
    });

    it('supports compact notation with currency symbol', () => {
      expect(formatCurrency(1500000, { compact: true })).toBe('₱1.5M');
      expect(formatCurrency(250000, { compact: true })).toBe('₱250K');
      expect(formatCurrency(-1500000, { compact: true })).toBe('-₱1.5M');
    });

    it('supports custom currency symbol, position, and spacing', () => {
      expect(formatCurrency(500, { symbol: '$' })).toBe('$500.00');
      expect(formatCurrency(500, { symbol: 'PHP', symbolPosition: 'suffix', showSpace: true })).toBe('500.00 PHP');
      expect(formatCurrency(500, { symbol: '₱', showSpace: true })).toBe('₱ 500.00');
      expect(formatCurrency(1234.56, { showSymbol: false })).toBe('1,234.56');
    });

    it('normalizes signed zero and near-zero values to avoid "-₱0.00"', () => {
      expect(formatCurrency(-0)).toBe('₱0.00');
      expect(formatCurrency(-0.00001)).toBe('₱0.00');
      expect(formatCurrency(0)).toBe('₱0.00');
    });

    it('safely handles null, undefined, NaN, and custom fallbacks', () => {
      expect(formatCurrency(null)).toBe('₱0.00');
      expect(formatCurrency(undefined)).toBe('₱0.00');
      expect(formatCurrency(NaN)).toBe('₱0.00');
      expect(formatCurrency('invalid-number')).toBe('₱0.00');
      expect(formatCurrency(null, { fallback: 'N/A' })).toBe('N/A');
      expect(formatCurrency(undefined, { fallback: '-' })).toBe('-');
    });

    it('respects minimum and maximum fraction digits', () => {
      expect(formatCurrency(120, { minimumFractionDigits: 0, maximumFractionDigits: 0 })).toBe('₱120');
      expect(formatCurrency(120.555, { minimumFractionDigits: 3, maximumFractionDigits: 3 })).toBe('₱120.555');
    });
  });

  describe('formatNumber - General Number Formatting', () => {
    it('formats numbers with thousands separators and decimal precision', () => {
      expect(formatNumber(1000000)).toBe('1,000,000');
      expect(formatNumber(1234.5678, { maximumFractionDigits: 2 })).toBe('1,234.57');
      expect(formatNumber(42)).toBe('42');
    });

    it('handles negative numbers and explicit signs', () => {
      expect(formatNumber(-500)).toBe('-500');
      expect(formatNumber(500, { signDisplay: 'always' })).toBe('+500');
      expect(formatNumber(-500, { signDisplay: 'always' })).toBe('-500');
      expect(formatNumber(0, { signDisplay: 'exceptZero' })).toBe('0');
    });

    it('supports compact number notation', () => {
      expect(formatNumber(1500000, { compact: true })).toBe('1.5M');
      expect(formatNumber(25000, { compact: true })).toBe('25K');
    });

    it('handles invalid inputs and fallback values', () => {
      expect(formatNumber(null)).toBe('0');
      expect(formatNumber(undefined)).toBe('0');
      expect(formatNumber(NaN, { fallback: '—' })).toBe('—');
    });
  });

  describe('formatPercent - Percentage Formatting', () => {
    it('formats percentages from already scaled values by default (e.g. 15 -> 15%)', () => {
      expect(formatPercent(15)).toBe('15%');
      expect(formatPercent(12.5)).toBe('12.5%');
      expect(formatPercent(100)).toBe('100%');
    });

    it('formats percentages from decimal proportions when isDecimal is true (e.g. 0.12 -> 12%)', () => {
      expect(formatPercent(0.15, { isDecimal: true })).toBe('15%');
      expect(formatPercent(0.125, { isDecimal: true })).toBe('12.5%');
      expect(formatPercent(1.0, { isDecimal: true })).toBe('100%');
    });

    it('supports sign display and decimal controls on percentages', () => {
      expect(formatPercent(5.5, { signDisplay: 'always' })).toBe('+5.5%');
      expect(formatPercent(-3.25, { signDisplay: 'always', maximumFractionDigits: 2 })).toBe('-3.25%');
      expect(formatPercent(15, { showSymbol: false })).toBe('15');
    });

    it('handles null and invalid values safely', () => {
      expect(formatPercent(null)).toBe('0%');
      expect(formatPercent(undefined, { fallback: 'N/A' })).toBe('N/A');
    });
  });

  describe('formatCompactNumber - Large Number Abbreviation', () => {
    it('abbreviates large numbers accurately', () => {
      expect(formatCompactNumber(1200)).toBe('1.2K');
      expect(formatCompactNumber(2500000)).toBe('2.5M');
      expect(formatCompactNumber(3000000000)).toBe('3B');
      expect(formatCompactNumber(450)).toBe('450');
    });
  });

  describe('formatUnits - Unit and Quantity Formatting', () => {
    it('handles singular and plural units with formatted numbers', () => {
      expect(formatUnits(1, 'Box', 'Boxes')).toBe('1 Box');
      expect(formatUnits(5, 'Box', 'Boxes')).toBe('5 Boxes');
      expect(formatUnits(1500, 'Piece', 'Pieces')).toBe('1,500 Pieces');
      expect(formatUnits(0, 'Item', 'Items')).toBe('0 Items');
    });

    it('handles negative units and invalid fallbacks', () => {
      expect(formatUnits(-1, 'Unit', 'Units')).toBe('-1 Unit');
      expect(formatUnits(null, 'Unit', 'Units', { fallback: 'No data' })).toBe('No data');
      expect(formatUnits(undefined)).toBe('0 Units');
    });
  });

  describe('parseCurrency & parseFormattedNumber - Reverse String Parsing', () => {
    it('parses standard Philippine Peso and currency strings to numbers', () => {
      expect(parseCurrency('₱1,250.50')).toBe(1250.50);
      expect(parseCurrency('₱ 5,000,000.00')).toBe(5000000);
      expect(parseCurrency('1,234.56')).toBe(1234.56);
      expect(parseCurrency('$99.95')).toBe(99.95);
      expect(parseCurrency('1,500.25 PHP')).toBe(1500.25);
    });

    it('parses negative and accounting parenthesized strings correctly', () => {
      expect(parseCurrency('-₱500.00')).toBe(-500.00);
      expect(parseCurrency('(₱1,250.50)')).toBe(-1250.50);
      expect(parseCurrency('(500.00)')).toBe(-500.00);
      expect(parseCurrency('-$25.50')).toBe(-25.50);
    });

    it('handles direct numbers and invalid fallback inputs', () => {
      expect(parseCurrency(123.45)).toBe(123.45);
      expect(parseCurrency(null)).toBe(0);
      expect(parseCurrency(undefined)).toBe(0);
      expect(parseCurrency('invalid-text', 100)).toBe(100);
      expect(parseFormattedNumber('₱3,450.75')).toBe(3450.75);
    });
  });

  describe('formatTin - Tax Identification Number Formatting', () => {
    it('formats 9-digit and 12-digit TIN strings with grouped 3-digit spaces', () => {
      expect(formatTin('123456789')).toBe('123 456 789');
      expect(formatTin('123-456-789-000')).toBe('123 456 789 000');
      expect(formatTin('')).toBe('');
      expect(formatTin(null)).toBe('');
    });
  });

  describe('formatTenderInput & parseTenderAmount - POS Amount Tendered Auto-Commas Suite', () => {
    // Dynamic import from PosModule
    it('automatically formats thousands commas as numbers are typed', async () => {
      const { formatTenderInput } = await import('../src/components/PosModule');
      expect(formatTenderInput('1000')).toBe('1,000');
      expect(formatTenderInput('15000')).toBe('15,000');
      expect(formatTenderInput('1234567')).toBe('1,234,567');
      expect(formatTenderInput('10000000')).toBe('10,000,000');
    });

    it('preserves decimals with up to two digits during auto-comma formatting', async () => {
      const { formatTenderInput } = await import('../src/components/PosModule');
      expect(formatTenderInput('1000.')).toBe('1,000.');
      expect(formatTenderInput('1000.5')).toBe('1,000.5');
      expect(formatTenderInput('1000.50')).toBe('1,000.50');
      expect(formatTenderInput('1000.509')).toBe('1,000.50');
      expect(formatTenderInput('1000.50.99')).toBe('1,000.50');
    });

    it('correctly handles backspacing, empty strings, and non-numeric inputs', async () => {
      const { formatTenderInput } = await import('../src/components/PosModule');
      expect(formatTenderInput('')).toBe('');
      expect(formatTenderInput('10,00')).toBe('1,000');
      expect(formatTenderInput('abc')).toBe('');
      expect(formatTenderInput('₱ 5000')).toBe('5,000');
    });

    it('correctly parses comma-formatted tender strings into numbers for calculations', async () => {
      const { parseTenderAmount } = await import('../src/components/PosModule');
      expect(parseTenderAmount('1,500')).toBe(1500);
      expect(parseTenderAmount('1,234,567.50')).toBe(1234567.5);
      expect(parseTenderAmount('500')).toBe(500);
      expect(parseTenderAmount('')).toBe(0);
      expect(parseTenderAmount(null)).toBe(0);
      expect(parseTenderAmount(2500)).toBe(2500);
    });
  });
});
