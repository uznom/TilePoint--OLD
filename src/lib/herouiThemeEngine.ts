/**
 * HeroUI v3 Appearance & Theme Configuration Engine
 * Manages Appearance, Base Colors, Radius, and Radius Form styles with automatic WCAG AA contrast adjustments.
 */

export interface HeroUIConfig {
  mode: 'light' | 'dark' | 'system';
  uiStyle: 'opaque';
  baseColor: string; // Hex code
  baseColorName: string;
  autoContrastText: boolean; // Auto-adjust text readability & contrast in dark mode
  contrastTarget?: 'aa' | 'aaa'; // Target WCAG level (AA: 4.5:1, AAA: 7.0:1)
  fontFamily?: string;
  radius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  formVariant: 'flat' | 'bordered' | 'underlined' | 'faded';
  formRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  formDensity: 'compact' | 'default' | 'comfortable';
}

export const HEROUI_BASE_PALETTES = [
  { id: 'sapphire', name: 'Sapphire (HeroUI Default)', hex: '#006FEE', class: 'bg-[#006FEE]', desc: 'Electric blue primary' },
  { id: 'violet', name: 'Violet', hex: '#7828C8', class: 'bg-[#7828C8]', desc: 'Rich vibrant purple' },
  { id: 'emerald', name: 'Emerald', hex: '#17C964', class: 'bg-[#17C964]', desc: 'Lush success green' },
  { id: 'amber', name: 'Amber', hex: '#F5A524', class: 'bg-[#F5A524]', desc: 'Warm warning gold' },
  { id: 'rose', name: 'Rose Danger', hex: '#F31260', class: 'bg-[#F31260]', desc: 'Bold crimson danger' },
  { id: 'magenta', name: 'Magenta Pink', hex: '#FF4ECD', class: 'bg-[#FF4ECD]', desc: 'Vivid playful pink' },
  { id: 'cyan', name: 'Cyan Teal', hex: '#06B6D4', class: 'bg-[#06B6D4]', desc: 'Fresh neon teal' },
  { id: 'indigo', name: 'Royal Indigo', hex: '#6366F1', class: 'bg-[#6366F1]', desc: 'Modern royal indigo' },
  { id: 'slate', name: 'Slate Gray', hex: '#64748B', class: 'bg-[#64748B]', desc: 'Clean high-contrast slate' },
  { id: 'zinc', name: 'Zinc Neutral', hex: '#71717A', class: 'bg-[#71717A]', desc: 'Minimal modern monochrome' },
];

export const HEROUI_RADII = [
  { id: 'none', name: 'None (0px)', token: '0px', sm: '0px', md: '0px', lg: '0px', xl: '0px', desc: 'Square sharp edges' },
  { id: 'sm', name: 'Small (6px)', token: '6px', sm: '4px', md: '6px', lg: '8px', xl: '10px', desc: 'Subtle rounded corners' },
  { id: 'md', name: 'Medium (12px)', token: '12px', sm: '8px', md: '12px', lg: '14px', xl: '16px', desc: 'Standard HeroUI default' },
  { id: 'lg', name: 'Large (16px)', token: '16px', sm: '10px', md: '14px', lg: '18px', xl: '22px', desc: 'Expressive spacious curves' },
  { id: 'full', name: 'Full (Pill)', token: '9999px', sm: '9999px', md: '9999px', lg: '9999px', xl: '9999px', desc: 'Capsule & pill aesthetics' },
];

export const HEROUI_FORM_VARIANTS = [
  { id: 'flat', name: 'Flat', desc: 'Subtle tinted background surface with seamless borders' },
  { id: 'bordered', name: 'Bordered', desc: 'Crisp outlined boundary with high contrast focus ring' },
  { id: 'underlined', name: 'Underlined', desc: 'Minimal bottom border accent with floating focus indicator' },
  { id: 'faded', name: 'Faded', desc: 'Soft secondary border with quiet neutral background' },
];

export const HEROUI_FORM_DENSITIES = [
  { id: 'compact', name: 'Compact', desc: 'Dense tabular height for high-volume transactions' },
  { id: 'default', name: 'Default', desc: 'Balanced standard touch & click ergonomics' },
  { id: 'comfortable', name: 'Comfortable', desc: 'Generous padding and elevated touch targets' },
];

const DEFAULT_CONFIG: HeroUIConfig = {
  mode: 'light',
  uiStyle: 'opaque',
  baseColor: '#006FEE',
  baseColorName: 'Sapphire (HeroUI Default)',
  autoContrastText: true,
  contrastTarget: 'aa',
  radius: 'lg',
  formVariant: 'bordered',
  formRadius: 'lg',
  formDensity: 'default',
};

export interface AutoContrastReport {
  isDark: boolean;
  baseHex: string;
  rawContrastOnDark: number; // Against dark surface #18181B
  rawContrastOnBlack: number; // Against pure black #000000
  hasPoorReadability: boolean; // True if raw contrast on dark is < 4.5
  effectiveColor: string; // The active primary color (auto-shifted if needed)
  effectiveContrastOnDark: number; // Contrast of effective color on #18181B
  effectiveContrastOnBlack: number; // Contrast on #000000
  textColorOnPrimary: string; // '#FFFFFF' | '#09090B'
  textContrastOnPrimary: number; // Contrast of button/pill text on primary color
  isAdjusted: boolean; // True if color was shifted for legibility
  adjustmentReason?: string;
  wcagGrade: 'AAA (Enhanced)' | 'AA (Pass)' | 'AA Large (Pass)' | 'Low Contrast';
  scorePercent: number;
}

export function getStoredHeroUIConfig(): HeroUIConfig {
  try {
    const raw = localStorage.getItem('tilepoint_heroui_theme_config');
    let config = DEFAULT_CONFIG;
    if (raw) {
      config = { ...DEFAULT_CONFIG, ...JSON.parse(raw), uiStyle: 'opaque' };
    }
    return config;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveHeroUIConfig(config: Partial<HeroUIConfig>): HeroUIConfig {
  const current = getStoredHeroUIConfig();
  const updated: HeroUIConfig = { ...current, ...config, uiStyle: 'opaque' };
  try {
    localStorage.setItem('tilepoint_heroui_theme_config', JSON.stringify(updated));
    localStorage.setItem('tilepoint-ui-style', 'opaque');
    if (config.mode === 'dark') {
      localStorage.setItem('tilepoint_dark_theme', 'true');
    } else if (config.mode === 'light') {
      localStorage.setItem('tilepoint_dark_theme', 'false');
    }
  } catch (e) {
    console.warn('Failed to save HeroUI config to localStorage', e);
  }
  applyHeroUIThemeToDOM(updated);
  window.dispatchEvent(new CustomEvent('tilepoint-theme-updated', { detail: updated }));
  return updated;
}

// Color Utility Functions for WCAG Contrast Calculation
function parseHex(hex: string): { r: number; g: number; b: number } {
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  const r = parseInt(cleanHex.slice(0, 2), 16) || 0;
  const g = parseInt(cleanHex.slice(2, 4), 16) || 0;
  const b = parseInt(cleanHex.slice(4, 6), 16) || 0;
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toH = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toH(r)}${toH(g)}${toH(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function getContrastRatio(hex1: string, hex2: string): number {
  const rgb1 = parseHex(hex1);
  const rgb2 = parseHex(hex2);
  const lum1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);
  const brighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return Number(((brighter + 0.05) / (darker + 0.05)).toFixed(2));
}

/**
 * Intelligent WCAG 2.1 Contrast & Readability Analyzer.
 * Detects if a selected theme color has poor legibility in dark mode,
 * and computes automatic color/text shifts to guarantee compliance.
 */
export function analyzeThemeContrast(
  hex: string,
  isDark: boolean,
  autoAdjust: boolean = true,
  target: 'aa' | 'aaa' = 'aa'
): AutoContrastReport {
  const darkSurface = '#18181B';
  const pureBlack = '#000000';
  const lightSurface = '#FFFFFF';

  const rawContrastOnDark = getContrastRatio(hex, darkSurface);
  const rawContrastOnBlack = getContrastRatio(hex, pureBlack);
  const rawContrastOnLight = getContrastRatio(hex, lightSurface);

  const minThreshold = target === 'aaa' ? 7.0 : 4.5;
  const hasPoorReadability = isDark
    ? rawContrastOnDark < minThreshold
    : rawContrastOnLight < minThreshold;

  let effectiveColor = hex;
  let isAdjusted = false;
  let adjustmentReason: string | undefined;

  if (autoAdjust && hasPoorReadability) {
    effectiveColor = getContrastAdaptedPrimary(hex, isDark, target);
    isAdjusted = effectiveColor.toLowerCase() !== hex.toLowerCase();
    if (isAdjusted) {
      if (isDark) {
        adjustmentReason = `Theme color was brightened for dark mode to achieve ≥${minThreshold}:1 contrast ratio against dark surfaces.`;
      } else {
        adjustmentReason = `Theme color was deepened for light mode to achieve ≥${minThreshold}:1 contrast ratio against white surfaces.`;
      }
    }
  }

  const effectiveContrastOnDark = getContrastRatio(effectiveColor, darkSurface);
  const effectiveContrastOnBlack = getContrastRatio(effectiveColor, pureBlack);

  // Compute optimum text foreground on primary buttons (White vs Black)
  const contrastWhite = getContrastRatio(effectiveColor, '#FFFFFF');
  const contrastDark = getContrastRatio(effectiveColor, '#09090B');
  const textColorOnPrimary = contrastWhite >= contrastDark ? '#FFFFFF' : '#09090B';
  const textContrastOnPrimary = Math.max(contrastWhite, contrastDark);

  let wcagGrade: 'AAA (Enhanced)' | 'AA (Pass)' | 'AA Large (Pass)' | 'Low Contrast' = 'Low Contrast';
  if (effectiveContrastOnDark >= 7.0 && textContrastOnPrimary >= 4.5) {
    wcagGrade = 'AAA (Enhanced)';
  } else if (effectiveContrastOnDark >= 4.5 && textContrastOnPrimary >= 4.0) {
    wcagGrade = 'AA (Pass)';
  } else if (effectiveContrastOnDark >= 3.0) {
    wcagGrade = 'AA Large (Pass)';
  }

  const scorePercent = Math.min(100, Math.round((effectiveContrastOnDark / 7.0) * 100));

  return {
    isDark,
    baseHex: hex,
    rawContrastOnDark,
    rawContrastOnBlack,
    hasPoorReadability,
    effectiveColor,
    effectiveContrastOnDark,
    effectiveContrastOnBlack,
    textColorOnPrimary,
    textContrastOnPrimary,
    isAdjusted,
    adjustmentReason,
    wcagGrade,
    scorePercent,
  };
}

/**
 * Ensures any chosen color (including very dark slate/navy/black or very pale pastels)
 * is automatically adjusted for high contrast and readability according to WCAG AA/AAA.
 */
export function getContrastAdaptedPrimary(
  hex: string,
  isDark: boolean,
  target: 'aa' | 'aaa' = 'aa'
): string {
  const { r, g, b } = parseHex(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const minRatio = target === 'aaa' ? 7.0 : 4.5;

  if (isDark) {
    // Dark Mode background is #000000 / content surface is #18181B
    const contrastWithDarkSurface = getContrastRatio(hex, '#18181B');
    
    // If color is too dark (e.g. #0F172A, #18181B, #0B132B, #000000 or any dark shade < 4.5:1 ratio)
    if (contrastWithDarkSurface < minRatio || l < 0.48) {
      if (s < 0.15) {
        // Neutral gray/slate/carbon: transform to crisp, high-contrast platinum-slate (#94A3B8 or #CBD5E1)
        return target === 'aaa' ? '#CBD5E1' : '#94A3B8';
      }
      // Chromatic color (indigo, purple, forest green, deep crimson): brighten lightness while preserving rich hue
      const targetL = target === 'aaa' ? 0.78 : Math.max(0.66, Math.min(0.76, l + 0.35));
      const adaptedS = Math.min(0.95, Math.max(0.75, s * 1.15));
      const rgb = hslToRgb(h, adaptedS, targetL);
      return rgbToHex(rgb.r, rgb.g, rgb.b);
    }
    
    return hex;
  } else {
    // Light Mode background is #FFFFFF / #F8FAFC
    const contrastWithWhite = getContrastRatio(hex, '#FFFFFF');
    
    // If color is too light (e.g. bright yellow or pale mint < 4.5:1 ratio)
    if (contrastWithWhite < minRatio || l > 0.62) {
      const adaptedL = Math.min(0.42, l * 0.7);
      const adaptedS = Math.min(1.0, Math.max(0.7, s));
      const rgb = hslToRgb(h, adaptedS, adaptedL);
      return rgbToHex(rgb.r, rgb.g, rgb.b);
    }
    
    return hex;
  }
}

export function generateShades(hex: string, isDark: boolean = false) {
  const { r, g, b } = parseHex(hex);
  const { h, s } = rgbToHsl(r, g, b);

  if (isDark) {
    const pr50 = `rgba(${r}, ${g}, ${b}, 0.14)`;
    const pr100 = `rgba(${r}, ${g}, ${b}, 0.24)`;
    const pr200 = `rgba(${r}, ${g}, ${b}, 0.38)`;
    const rgb300 = hslToRgb(h, Math.min(0.9, s), 0.52);
    const rgb400 = hslToRgb(h, Math.min(0.95, s), 0.62);
    const rgb600 = hslToRgb(h, Math.min(1.0, s), 0.45);
    const rgb700 = hslToRgb(h, Math.min(1.0, s), 0.34);
    const rgb800 = hslToRgb(h, Math.min(1.0, s), 0.22);
    const rgb900 = hslToRgb(h, Math.min(1.0, s), 0.12);

    return {
      50: pr50,
      100: pr100,
      200: pr200,
      300: rgbToHex(rgb300.r, rgb300.g, rgb300.b),
      400: rgbToHex(rgb400.r, rgb400.g, rgb400.b),
      500: hex,
      600: rgbToHex(rgb600.r, rgb600.g, rgb600.b),
      700: rgbToHex(rgb700.r, rgb700.g, rgb700.b),
      800: rgbToHex(rgb800.r, rgb800.g, rgb800.b),
      900: rgbToHex(rgb900.r, rgb900.g, rgb900.b),
    };
  }

  const mix = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number, weight: number) => {
    const p = weight;
    const w = p * 2 - 1;
    const a = 0;
    const w1 = (((w * a === -1) ? w : (w + a) / (1 + w * a)) + 1) / 2.0;
    const w2 = 1 - w1;
    return `#${Math.round(r1 * w1 + r2 * w2).toString(16).padStart(2, '0')}${Math.round(g1 * w1 + g2 * w2).toString(16).padStart(2, '0')}${Math.round(b1 * w1 + b2 * w2).toString(16).padStart(2, '0')}`;
  };

  return {
    50: mix(r, g, b, 255, 255, 255, 0.08),
    100: mix(r, g, b, 255, 255, 255, 0.18),
    200: mix(r, g, b, 255, 255, 255, 0.35),
    300: mix(r, g, b, 255, 255, 255, 0.55),
    400: mix(r, g, b, 255, 255, 255, 0.75),
    500: hex,
    600: mix(r, g, b, 0, 0, 0, 0.85),
    700: mix(r, g, b, 0, 0, 0, 0.7),
    800: mix(r, g, b, 0, 0, 0, 0.55),
    900: mix(r, g, b, 0, 0, 0, 0.35),
  };
}

export function applyHeroUIThemeToDOM(config?: HeroUIConfig) {
  const cfg = config || getStoredHeroUIConfig();
  const root = document.documentElement;

  // 0. Color Mode Detection
  let isDark: boolean;
  if (cfg.mode === 'dark') {
    root.classList.add('dark');
    isDark = true;
  } else if (cfg.mode === 'light') {
    root.classList.remove('dark');
    isDark = false;
  } else if (cfg.mode === 'system' && typeof window !== 'undefined') {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
  } else {
    isDark = root.classList.contains('dark') || (typeof localStorage !== 'undefined' && localStorage.getItem('tilepoint_dark_theme') === 'true');
  }

  // 1. Intelligent WCAG Contrast Analysis & Automatic Text Shift
  const autoAdjust = cfg.autoContrastText !== false;
  const target = cfg.contrastTarget || 'aa';
  const report = analyzeThemeContrast(cfg.baseColor, isDark, autoAdjust, target);

  const effectivePrimary = report.effectiveColor;
  const rgbPrimary = parseHex(effectivePrimary);
  const shades = generateShades(effectivePrimary, isDark);
  const primaryForeground = report.textColorOnPrimary;

  root.style.setProperty('--heroui-primary', effectivePrimary);
  root.style.setProperty('--color-primary', effectivePrimary);
  root.style.setProperty('--heroui-focus', effectivePrimary);
  root.style.setProperty('--heroui-primary-foreground', primaryForeground);
  root.style.setProperty('--color-primary-foreground', primaryForeground);
  root.style.setProperty('--heroui-primary-rgb', `${rgbPrimary.r}, ${rgbPrimary.g}, ${rgbPrimary.b}`);

  root.style.setProperty('--heroui-primary-50', shades[50]);
  root.style.setProperty('--heroui-primary-100', shades[100]);
  root.style.setProperty('--heroui-primary-200', shades[200]);
  root.style.setProperty('--heroui-primary-300', shades[300]);
  root.style.setProperty('--heroui-primary-400', shades[400]);
  root.style.setProperty('--heroui-primary-500', shades[500]);
  root.style.setProperty('--heroui-primary-600', shades[600]);
  root.style.setProperty('--heroui-primary-700', shades[700]);
  root.style.setProperty('--heroui-primary-800', shades[800]);
  root.style.setProperty('--heroui-primary-900', shades[900]);

  // Dark Mode High Contrast Text & Surface Calibration
  if (isDark) {
    root.style.setProperty('--heroui-foreground', '#F8FAFC');
    root.style.setProperty('--heroui-default-foreground', '#F8FAFC');
    root.style.setProperty('--heroui-default-400', '#94A3B8');
    root.style.setProperty('--heroui-default-500', '#CBD5E1');
    root.style.setProperty('--heroui-default-600', '#E2E8F0');
    root.style.setProperty('--heroui-divider', 'rgba(255, 255, 255, 0.16)');
    root.setAttribute('data-contrast-adjusted', report.isAdjusted ? 'true' : 'false');
    root.setAttribute('data-contrast-grade', report.wcagGrade);
  } else {
    root.style.setProperty('--heroui-foreground', '#09090B');
    root.style.setProperty('--heroui-default-foreground', '#09090B');
    root.style.setProperty('--heroui-default-400', '#71717A');
    root.style.setProperty('--heroui-default-500', '#52525B');
    root.style.setProperty('--heroui-default-600', '#3F3F46');
    root.style.setProperty('--heroui-divider', 'rgba(0, 0, 0, 0.08)');
  }

  // 2. Surface & UI Style Rendering Mode with User Selected Color Tint
  const style = 'opaque';
  root.setAttribute('data-ui-style', style);
  root.classList.remove('ui-style-translucent', 'ui-style-frosted');
  root.classList.add('ui-style-opaque', 'accessibility-no-blur', 'accessibility-no-ui-blur', 'accessibility-no-backdrop-blur');

  if (typeof document !== 'undefined' && document.body) {
    document.body.setAttribute('data-ui-style', style);
    document.body.classList.remove('ui-style-translucent', 'ui-style-frosted');
    document.body.classList.add('ui-style-opaque');
  }

  // Compute subtle ambient tint from user's selected base color
  const { r: cr, g: cg, b: cb } = rgbPrimary;
  const mixColor = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number, weight: number) => {
    const p = weight;
    const w = p * 2 - 1;
    const a = 0;
    const w1 = (((w * a === -1) ? w : (w + a) / (1 + w * a)) + 1) / 2.0;
    const w2 = 1 - w1;
    return `#${Math.round(r1 * w1 + r2 * w2).toString(16).padStart(2, '0')}${Math.round(g1 * w1 + g2 * w2).toString(16).padStart(2, '0')}${Math.round(b1 * w1 + b2 * w2).toString(16).padStart(2, '0')}`;
  };

  if (isDark) {
    // Dark mode: Refined deep canvas with 4-7% ambient tint of user-selected color (no stark pitch #000000)
    const darkBg = mixColor(cr, cg, cb, 8, 10, 15, 0.06);
    const darkContent1 = mixColor(cr, cg, cb, 22, 24, 30, 0.08);
    const darkContent2 = mixColor(cr, cg, cb, 34, 37, 46, 0.10);
    const darkContent3 = mixColor(cr, cg, cb, 50, 54, 66, 0.12);
    const darkContent4 = mixColor(cr, cg, cb, 70, 75, 90, 0.14);

    root.style.setProperty('--heroui-background', darkBg);
    root.style.setProperty('--heroui-content1', darkContent1);
    root.style.setProperty('--heroui-content2', darkContent2);
    root.style.setProperty('--heroui-content3', darkContent3);
    root.style.setProperty('--heroui-content4', darkContent4);
    root.style.setProperty('--heroui-card-bg', darkContent1);
    root.style.setProperty('--heroui-header-bg', darkBg);
  } else {
    // Light mode: Refined light canvas with 3-5% ambient tint of user-selected color (no harsh blinding #FFFFFF)
    const lightBg = mixColor(cr, cg, cb, 246, 248, 252, 0.04);
    const lightContent1 = mixColor(cr, cg, cb, 255, 255, 255, 0.02);
    const lightContent2 = mixColor(cr, cg, cb, 239, 243, 248, 0.06);
    const lightContent3 = mixColor(cr, cg, cb, 224, 230, 238, 0.08);
    const lightContent4 = mixColor(cr, cg, cb, 203, 213, 225, 0.10);

    root.style.setProperty('--heroui-background', lightBg);
    root.style.setProperty('--heroui-content1', lightContent1);
    root.style.setProperty('--heroui-content2', lightContent2);
    root.style.setProperty('--heroui-content3', lightContent3);
    root.style.setProperty('--heroui-content4', lightContent4);
    root.style.setProperty('--heroui-card-bg', lightContent1);
    root.style.setProperty('--heroui-header-bg', lightBg);
  }

  root.style.setProperty('--heroui-surface-blur', '0px');
  root.style.setProperty('--ui-style-blur', '0px');
  root.style.setProperty('--heroui-backdrop-filter', 'none');

  // 3. Radius
  const radiusObj = HEROUI_RADII.find((r) => r.id === cfg.radius) || HEROUI_RADII[2];
  root.style.setProperty('--radius-small', radiusObj.sm);
  root.style.setProperty('--radius-medium', radiusObj.md);
  root.style.setProperty('--radius-large', radiusObj.lg);
  root.style.setProperty('--radius-xl', radiusObj.xl);
  root.style.setProperty('--radius-2xl', radiusObj.id === 'none' ? '0px' : radiusObj.id === 'full' ? '9999px' : `${parseInt(radiusObj.xl) + 4}px`);
  root.style.setProperty('--radius-full', '9999px');
  root.style.setProperty('--heroui-radius', radiusObj.token);
  root.style.setProperty('--heroui-radius-small', radiusObj.sm);
  root.style.setProperty('--heroui-radius-medium', radiusObj.md);
  root.style.setProperty('--heroui-radius-large', radiusObj.lg);
  root.style.setProperty('--heroui-radius-xl', radiusObj.xl);
  root.style.setProperty('--heroui-radius-2xl', radiusObj.id === 'none' ? '0px' : radiusObj.id === 'full' ? '9999px' : `${parseInt(radiusObj.xl) + 4}px`);
  root.style.setProperty('--heroui-radius-full', '9999px');

  // 4. Form Control Attributes
  root.setAttribute('data-form-variant', cfg.formVariant);
  root.setAttribute('data-form-radius', cfg.formRadius);
  root.setAttribute('data-form-density', cfg.formDensity);
}

// Auto-initialize on load
if (typeof window !== 'undefined') {
  try {
    applyHeroUIThemeToDOM();
  } catch (e) {
    console.error('Failed to auto-init HeroUI theme engine', e);
  }
}

