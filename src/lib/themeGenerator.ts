/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface HeroThemeScheme {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  
  primary50?: string;
  primary100?: string;
  primary200?: string;
  primary300?: string;
  primary400?: string;
  primary500?: string;
  primary600?: string;
  primary700?: string;
  primary800?: string;
  primary900?: string;
  
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  
  secondary50?: string;
  secondary100?: string;
  secondary200?: string;
  secondary300?: string;
  secondary400?: string;
  secondary500?: string;
  secondary600?: string;
  secondary700?: string;
  secondary800?: string;
  secondary900?: string;
  
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  
  surface: string;
  onSurface: string;
  onSurfaceVariant: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  
  outline: string;
  outlineVariant: string;
}

// Backwards-compatibility alias
export type M3ThemeScheme = HeroThemeScheme;

// Helper to convert hex to RGB
export function hexToRgb(hex: string) {
  const rawHex = hex.startsWith('#') ? hex.slice(1) : hex;
  const formattedHex = rawHex.length === 3 
    ? rawHex.split('').map(char => char + char).join('') 
    : rawHex;
  
  const r = parseInt(formattedHex.slice(0, 2), 16) || 0;
  const g = parseInt(formattedHex.slice(2, 4), 16) || 0;
  const b = parseInt(formattedHex.slice(4, 6), 16) || 0;
  return { r, g, b };
}

// Helper to convert RGB to hex
export function rgbToHex(r: number, g: number, b: number) {
  const toHex = (n: number) => {
    const val = Math.max(0, Math.min(255, Math.round(n)));
    const s = val.toString(16);
    return s.length === 1 ? '0' + s : s;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Convert RGB to HSL
export function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h, s, l };
}

// Convert HSL to RGB
export function hslToRgb(h: number, s: number, l: number) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return { r: r * 255, g: g * 255, b: b * 255 };
}

// WCAG relative luminance
export function getLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

// WCAG Contrast ratio calculator
export function getContrastRatio(hex1: string, hex2: string) {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return (brightest + 0.05) / (darkest + 0.05);
}

// Generate the fully compliant HeroUI v3 light or dark scheme
export function generateThemeFromSeed(
  seedColor: string, 
  isDark: boolean,
  contrast: 'small' | 'default' | 'medium' | 'high' = 'medium'
): HeroThemeScheme {
  const rgb = hexToRgb(seedColor);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const h = hsl.h;
  const s = hsl.s;
  const l = hsl.l;

  // Normalize contrast option: 'small' or 'default' maps to 'small'
  const contrastMode = (contrast === 'small' || contrast === 'default') ? 'small' : contrast;

  if (!isDark) {
    // ---- LIGHT MODE ----
    
    // Primary: Preserve brand seed color fidelity!
    let primaryL = l;
    if (l > 0.58) {
      primaryL = 0.46; // Adjust very light seeds for optimal contrast
    } else if (l < 0.20) {
      primaryL = 0.35; // Brighten very dark seeds
    }
    const primaryHex = rgbToHex(...Object.values(hslToRgb(h, s, primaryL)) as [number, number, number]);
    
    // HeroUI v3 50-900 tonal ramp
    const primary50 = rgbToHex(...Object.values(hslToRgb(h, Math.min(0.85, s * 0.75), 0.96)) as [number, number, number]);
    const primary100 = rgbToHex(...Object.values(hslToRgb(h, Math.min(0.85, s * 0.8), 0.91)) as [number, number, number]);
    const primary200 = rgbToHex(...Object.values(hslToRgb(h, Math.min(0.9, s * 0.85), 0.82)) as [number, number, number]);
    const primary300 = rgbToHex(...Object.values(hslToRgb(h, Math.min(0.95, s * 0.9), 0.70)) as [number, number, number]);
    const primary400 = rgbToHex(...Object.values(hslToRgb(h, Math.min(1.0, s * 0.95), 0.58)) as [number, number, number]);
    const primary500 = primaryHex;
    const primary600 = rgbToHex(...Object.values(hslToRgb(h, Math.min(1.0, s * 1.0), 0.40)) as [number, number, number]);
    const primary700 = rgbToHex(...Object.values(hslToRgb(h, Math.min(1.0, s * 1.0), 0.30)) as [number, number, number]);
    const primary800 = rgbToHex(...Object.values(hslToRgb(h, Math.min(1.0, s * 1.0), 0.20)) as [number, number, number]);
    const primary900 = rgbToHex(...Object.values(hslToRgb(h, Math.min(1.0, s * 1.0), 0.11)) as [number, number, number]);

    // On Primary: Determine text color on top of primary button
    const primaryOnWhite = getContrastRatio(primaryHex, '#FFFFFF');
    const onPrimary = primaryOnWhite >= 3.5 ? '#FFFFFF' : '#0B132B';

    // Primary container: soft tinted background for primary badges/cards
    const primaryContainerL = contrastMode === 'high' ? 0.98 : (contrastMode === 'medium' ? 0.95 : 0.93);
    const primaryContainerSat = Math.min(s * 0.5, 0.20);
    const primaryContainerHex = rgbToHex(...Object.values(hslToRgb(h, primaryContainerSat, primaryContainerL)) as [number, number, number]);
    
    // On Primary container
    const onPrimaryContainerL = contrastMode === 'high' ? 0.08 : (contrastMode === 'medium' ? 0.15 : 0.22);
    const onPrimaryContainerHex = rgbToHex(...Object.values(hslToRgb(h, Math.max(0.6, s), onPrimaryContainerL)) as [number, number, number]);

    // Secondary & Tertiary
    const secondaryHex = rgbToHex(...Object.values(hslToRgb(h, 0.12, contrastMode === 'high' ? 0.15 : (contrastMode === 'medium' ? 0.24 : 0.34))) as [number, number, number]);
    const onSecondary = '#FFFFFF';
    const secondaryContainerHex = rgbToHex(...Object.values(hslToRgb(h, 0.08, contrastMode === 'high' ? 0.98 : (contrastMode === 'medium' ? 0.95 : 0.92))) as [number, number, number]);
    const onSecondaryContainerHex = rgbToHex(...Object.values(hslToRgb(h, 0.15, contrastMode === 'high' ? 0.08 : (contrastMode === 'medium' ? 0.15 : 0.22))) as [number, number, number]);

    const tertiaryH = (h + 0.35) % 1;
    const tertiaryHex = rgbToHex(...Object.values(hslToRgb(tertiaryH, Math.min(0.5, s), contrastMode === 'high' ? 0.15 : (contrastMode === 'medium' ? 0.24 : 0.34))) as [number, number, number]);
    const onTertiary = '#FFFFFF';
    const tertiaryContainerHex = rgbToHex(...Object.values(hslToRgb(tertiaryH, 0.12, contrastMode === 'high' ? 0.98 : (contrastMode === 'medium' ? 0.95 : 0.92))) as [number, number, number]);
    const onTertiaryContainerHex = rgbToHex(...Object.values(hslToRgb(tertiaryH, 0.4, contrastMode === 'high' ? 0.08 : (contrastMode === 'medium' ? 0.15 : 0.22))) as [number, number, number]);

    // Surface & Background
    const surfaceSat = Math.min(s * 0.25, 0.08);
    
    let surfaceHex = rgbToHex(...Object.values(hslToRgb(h, surfaceSat, 0.96)) as [number, number, number]);
    let onSurface = rgbToHex(...Object.values(hslToRgb(h, Math.min(s * 0.3, 0.12), 0.12)) as [number, number, number]);
    let onSurfaceVariant = rgbToHex(...Object.values(hslToRgb(h, Math.min(s * 0.25, 0.10), 0.38)) as [number, number, number]);
    let lowest = rgbToHex(...Object.values(hslToRgb(h, Math.min(s * 0.15, 0.04), 0.99)) as [number, number, number]);
    let low = rgbToHex(...Object.values(hslToRgb(h, surfaceSat, 0.98)) as [number, number, number]);
    let container = rgbToHex(...Object.values(hslToRgb(h, Math.min(s * 0.35, 0.10), 0.90)) as [number, number, number]);
    let high = rgbToHex(...Object.values(hslToRgb(h, Math.min(s * 0.35, 0.12), 0.85)) as [number, number, number]);
    let outline = rgbToHex(...Object.values(hslToRgb(h, Math.min(s * 0.2, 0.08), 0.75)) as [number, number, number]);
    let outlineVariant = rgbToHex(...Object.values(hslToRgb(h, Math.min(s * 0.2, 0.08), 0.85)) as [number, number, number]);

    if (contrastMode === 'medium') {
      surfaceHex = rgbToHex(...Object.values(hslToRgb(h, surfaceSat, 0.93)) as [number, number, number]);
      onSurface = rgbToHex(...Object.values(hslToRgb(h, Math.min(s * 0.3, 0.12), 0.08)) as [number, number, number]);
      onSurfaceVariant = rgbToHex(...Object.values(hslToRgb(h, Math.min(s * 0.25, 0.10), 0.22)) as [number, number, number]);
      lowest = '#FFFFFF';
      low = rgbToHex(...Object.values(hslToRgb(h, surfaceSat, 0.96)) as [number, number, number]);
      container = rgbToHex(...Object.values(hslToRgb(h, Math.min(s * 0.35, 0.10), 0.88)) as [number, number, number]);
      high = rgbToHex(...Object.values(hslToRgb(h, Math.min(s * 0.35, 0.12), 0.82)) as [number, number, number]);
      outline = rgbToHex(...Object.values(hslToRgb(h, Math.min(s * 0.2, 0.08), 0.45)) as [number, number, number]);
      outlineVariant = rgbToHex(...Object.values(hslToRgb(h, Math.min(s * 0.2, 0.08), 0.65)) as [number, number, number]);
    } else if (contrastMode === 'high') {
      surfaceHex = rgbToHex(...Object.values(hslToRgb(h, surfaceSat, 0.97)) as [number, number, number]);
      onSurface = '#000000';
      onSurfaceVariant = '#000000';
      lowest = '#FFFFFF';
      low = '#FFFFFF';
      container = rgbToHex(...Object.values(hslToRgb(h, Math.min(s * 0.35, 0.10), 0.88)) as [number, number, number]);
      high = rgbToHex(...Object.values(hslToRgb(h, Math.min(s * 0.35, 0.12), 0.80)) as [number, number, number]);
      outline = '#000000';
      outlineVariant = rgbToHex(...Object.values(hslToRgb(h, Math.min(s * 0.2, 0.08), 0.15)) as [number, number, number]);
    }

    return {
      primary: primaryHex,
      onPrimary,
      primaryContainer: primaryContainerHex,
      onPrimaryContainer: onPrimaryContainerHex,
      
      primary50,
      primary100,
      primary200,
      primary300,
      primary400,
      primary500,
      primary600,
      primary700,
      primary800,
      primary900,
      
      secondary: secondaryHex,
      onSecondary,
      secondaryContainer: secondaryContainerHex,
      onSecondaryContainer: onSecondaryContainerHex,
      
      tertiary: tertiaryHex,
      onTertiary,
      tertiaryContainer: tertiaryContainerHex,
      onTertiaryContainer: onTertiaryContainerHex,
      
      surface: surfaceHex,
      onSurface,
      onSurfaceVariant,
      surfaceContainerLowest: lowest,
      surfaceContainerLow: low,
      surfaceContainer: container,
      surfaceContainerHigh: high,
      
      outline,
      outlineVariant
    };

  } else {
    // ---- DARK MODE ----
    
    // Primary: Preserve brand seed color fidelity on dark mode!
    let primaryL = l;
    let primaryS = s;
    if (s < 0.15) {
      // Near neutral / dark slate / black seed: provide crisp high-contrast silver-slate
      primaryL = 0.70;
      primaryS = 0.20;
    } else if (l < 0.45) {
      primaryL = 0.68; // Brighten for dark background legibility
      primaryS = Math.min(0.95, Math.max(0.75, s * 1.15));
    } else if (l > 0.80) {
      primaryL = 0.72;
    }
    const primaryHex = rgbToHex(...Object.values(hslToRgb(h, primaryS, primaryL)) as [number, number, number]);
    const onPrimary = getContrastRatio(primaryHex, '#FFFFFF') >= 4.0 ? '#FFFFFF' : '#09090B';

    // HeroUI v3 Dark Mode 50-900 ramp
    const prRgb = hexToRgb(primaryHex);
    const primary50 = `rgba(${prRgb.r}, ${prRgb.g}, ${prRgb.b}, 0.14)`;
    const primary100 = `rgba(${prRgb.r}, ${prRgb.g}, ${prRgb.b}, 0.24)`;
    const primary200 = `rgba(${prRgb.r}, ${prRgb.g}, ${prRgb.b}, 0.38)`;
    const primary300 = rgbToHex(...Object.values(hslToRgb(h, Math.min(0.9, primaryS), 0.52)) as [number, number, number]);
    const primary400 = rgbToHex(...Object.values(hslToRgb(h, Math.min(0.95, primaryS), 0.62)) as [number, number, number]);
    const primary500 = primaryHex;
    const primary600 = rgbToHex(...Object.values(hslToRgb(h, Math.min(1.0, primaryS), 0.45)) as [number, number, number]);
    const primary700 = rgbToHex(...Object.values(hslToRgb(h, Math.min(1.0, primaryS), 0.34)) as [number, number, number]);
    const primary800 = rgbToHex(...Object.values(hslToRgb(h, Math.min(1.0, primaryS), 0.22)) as [number, number, number]);
    const primary900 = rgbToHex(...Object.values(hslToRgb(h, Math.min(1.0, primaryS), 0.12)) as [number, number, number]);

    // Primary Container
    const primaryContainerHex = rgbToHex(...Object.values(hslToRgb(h, Math.min(0.8, primaryS * 0.9), contrastMode === 'high' ? 0.10 : (contrastMode === 'medium' ? 0.14 : 0.18))) as [number, number, number]);
    const onPrimaryContainerHex = rgbToHex(...Object.values(hslToRgb(h, 0.35, contrastMode === 'high' ? 0.98 : (contrastMode === 'medium' ? 0.94 : 0.90))) as [number, number, number]);

    // Secondary & Tertiary
    const secondaryHex = rgbToHex(...Object.values(hslToRgb(h, 0.12, contrastMode === 'high' ? 0.92 : (contrastMode === 'medium' ? 0.84 : 0.74))) as [number, number, number]);
    const onSecondary = '#09090B';
    const secondaryContainerHex = rgbToHex(...Object.values(hslToRgb(h, 0.10, contrastMode === 'high' ? 0.10 : (contrastMode === 'medium' ? 0.16 : 0.20))) as [number, number, number]);
    const onSecondaryContainerHex = rgbToHex(...Object.values(hslToRgb(h, 0.15, contrastMode === 'high' ? 0.98 : (contrastMode === 'medium' ? 0.94 : 0.90))) as [number, number, number]);

    const tertiaryH = (h + 0.35) % 1;
    const tertiaryHex = rgbToHex(...Object.values(hslToRgb(tertiaryH, Math.min(0.7, primaryS), contrastMode === 'high' ? 0.92 : (contrastMode === 'medium' ? 0.84 : 0.72))) as [number, number, number]);
    const onTertiary = '#09090B';
    const tertiaryContainerHex = rgbToHex(...Object.values(hslToRgb(tertiaryH, 0.35, contrastMode === 'high' ? 0.10 : (contrastMode === 'medium' ? 0.16 : 0.22))) as [number, number, number]);
    const onTertiaryContainerHex = rgbToHex(...Object.values(hslToRgb(tertiaryH, 0.25, contrastMode === 'high' ? 0.98 : (contrastMode === 'medium' ? 0.94 : 0.90))) as [number, number, number]);

    // Secondary 50-900 ramp
    const secRgb = hexToRgb(secondaryHex);
    const secondary50 = `rgba(${secRgb.r}, ${secRgb.g}, ${secRgb.b}, 0.14)`;
    const secondary100 = `rgba(${secRgb.r}, ${secRgb.g}, ${secRgb.b}, 0.24)`;
    const secondary200 = `rgba(${secRgb.r}, ${secRgb.g}, ${secRgb.b}, 0.38)`;
    const secondary300 = rgbToHex(...Object.values(hslToRgb(h, Math.min(0.25, primaryS), 0.52)) as [number, number, number]);
    const secondary400 = rgbToHex(...Object.values(hslToRgb(h, Math.min(0.25, primaryS), 0.62)) as [number, number, number]);
    const secondary500 = secondaryHex;
    const secondary600 = rgbToHex(...Object.values(hslToRgb(h, Math.min(0.25, primaryS), 0.45)) as [number, number, number]);
    const secondary700 = rgbToHex(...Object.values(hslToRgb(h, Math.min(0.25, primaryS), 0.34)) as [number, number, number]);
    const secondary800 = rgbToHex(...Object.values(hslToRgb(h, Math.min(0.25, primaryS), 0.22)) as [number, number, number]);
    const secondary900 = rgbToHex(...Object.values(hslToRgb(h, Math.min(0.25, primaryS), 0.12)) as [number, number, number]);

    // Surface & Background
    const surfaceSat = Math.min(primaryS * 0.3, 0.10);
    
    let surfaceHex = rgbToHex(...Object.values(hslToRgb(h, surfaceSat, 0.08)) as [number, number, number]);
    let onSurface = '#F8FAFC';
    let onSurfaceVariant = '#CBD5E1';
    let lowest = rgbToHex(...Object.values(hslToRgb(h, surfaceSat, 0.04)) as [number, number, number]);
    let low = rgbToHex(...Object.values(hslToRgb(h, surfaceSat, 0.11)) as [number, number, number]);
    let container = rgbToHex(...Object.values(hslToRgb(h, surfaceSat, 0.17)) as [number, number, number]);
    let high = rgbToHex(...Object.values(hslToRgb(h, surfaceSat, 0.23)) as [number, number, number]);
    let outline = rgbToHex(...Object.values(hslToRgb(h, Math.min(primaryS * 0.15, 0.08), 0.35)) as [number, number, number]);
    let outlineVariant = rgbToHex(...Object.values(hslToRgb(h, Math.min(primaryS * 0.15, 0.08), 0.22)) as [number, number, number]);

    if (contrastMode === 'medium') {
      surfaceHex = rgbToHex(...Object.values(hslToRgb(h, surfaceSat, 0.06)) as [number, number, number]);
      onSurface = '#FFFFFF';
      onSurfaceVariant = rgbToHex(...Object.values(hslToRgb(h, Math.min(s * 0.15, 0.06), 0.82)) as [number, number, number]);
      lowest = rgbToHex(...Object.values(hslToRgb(h, surfaceSat, 0.03)) as [number, number, number]);
      low = rgbToHex(...Object.values(hslToRgb(h, surfaceSat, 0.09)) as [number, number, number]);
      container = rgbToHex(...Object.values(hslToRgb(h, surfaceSat, 0.16)) as [number, number, number]);
      high = rgbToHex(...Object.values(hslToRgb(h, surfaceSat, 0.22)) as [number, number, number]);
      outline = rgbToHex(...Object.values(hslToRgb(h, Math.min(s * 0.15, 0.08), 0.45)) as [number, number, number]);
      outlineVariant = rgbToHex(...Object.values(hslToRgb(h, Math.min(s * 0.15, 0.08), 0.32)) as [number, number, number]);
    } else if (contrastMode === 'high') {
      surfaceHex = '#000000';
      onSurface = '#FFFFFF';
      onSurfaceVariant = '#FFFFFF';
      lowest = '#000000';
      low = '#0A0A0A';
      container = '#141414';
      high = '#262626';
      outline = '#FFFFFF';
      outlineVariant = '#A3A3A3';
    }

    return {
      primary: primaryHex,
      onPrimary,
      primaryContainer: primaryContainerHex,
      onPrimaryContainer: onPrimaryContainerHex,
      
      primary50,
      primary100,
      primary200,
      primary300,
      primary400,
      primary500,
      primary600,
      primary700,
      primary800,
      primary900,
      
      secondary: secondaryHex,
      onSecondary,
      secondaryContainer: secondaryContainerHex,
      onSecondaryContainer: onSecondaryContainerHex,
      
      secondary50,
      secondary100,
      secondary200,
      secondary300,
      secondary400,
      secondary500,
      secondary600,
      secondary700,
      secondary800,
      secondary900,
      
      tertiary: tertiaryHex,
      onTertiary,
      tertiaryContainer: tertiaryContainerHex,
      onTertiaryContainer: onTertiaryContainerHex,
      
      surface: surfaceHex,
      onSurface,
      onSurfaceVariant,
      surfaceContainerLowest: lowest,
      surfaceContainerLow: low,
      surfaceContainer: container,
      surfaceContainerHigh: high,
      
      outline,
      outlineVariant
    };
  }
}

// Function to apply scheme to DOM (HeroUI v3 semantic color and surface tokens)
export function applyHeroThemeToDOM(scheme: HeroThemeScheme, isDarkExplicit?: boolean) {
  const root = document.documentElement;
  const isDark = isDarkExplicit !== undefined ? isDarkExplicit : root.classList.contains('dark');

  // Synchronize class list if explicitly specified
  if (isDarkExplicit !== undefined) {
    if (isDarkExplicit) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  // 1. Primary Colors & HeroUI v3 50-900 ramp
  root.style.setProperty('--heroui-primary', scheme.primary);
  root.style.setProperty('--heroui-focus', scheme.primary);
  root.style.setProperty('--heroui-primary-foreground', scheme.onPrimary);
  
  const rgbPrimary = hexToRgb(scheme.primary);
  root.style.setProperty('--heroui-primary-rgb', `${rgbPrimary.r}, ${rgbPrimary.g}, ${rgbPrimary.b}`);
  
  if (scheme.primary50) root.style.setProperty('--heroui-primary-50', scheme.primary50);
  if (scheme.primary100) root.style.setProperty('--heroui-primary-100', scheme.primary100);
  if (scheme.primary200) root.style.setProperty('--heroui-primary-200', scheme.primary200);
  if (scheme.primary300) root.style.setProperty('--heroui-primary-300', scheme.primary300);
  if (scheme.primary400) root.style.setProperty('--heroui-primary-400', scheme.primary400);
  if (scheme.primary500) root.style.setProperty('--heroui-primary-500', scheme.primary500);
  if (scheme.primary600) root.style.setProperty('--heroui-primary-600', scheme.primary600);
  if (scheme.primary700) root.style.setProperty('--heroui-primary-700', scheme.primary700);
  if (scheme.primary800) root.style.setProperty('--heroui-primary-800', scheme.primary800);
  if (scheme.primary900) root.style.setProperty('--heroui-primary-900', scheme.primary900);

  // 2. Secondary Colors & HeroUI v3 50-900 ramp
  root.style.setProperty('--heroui-secondary', scheme.secondary);
  root.style.setProperty('--heroui-secondary-foreground', scheme.onSecondary);
  const rgbSecondary = hexToRgb(scheme.secondary);
  root.style.setProperty('--heroui-secondary-rgb', `${rgbSecondary.r}, ${rgbSecondary.g}, ${rgbSecondary.b}`);
  
  if (scheme.secondary50) root.style.setProperty('--heroui-secondary-50', scheme.secondary50);
  if (scheme.secondary100) root.style.setProperty('--heroui-secondary-100', scheme.secondary100);
  if (scheme.secondary200) root.style.setProperty('--heroui-secondary-200', scheme.secondary200);
  if (scheme.secondary300) root.style.setProperty('--heroui-secondary-300', scheme.secondary300);
  if (scheme.secondary400) root.style.setProperty('--heroui-secondary-400', scheme.secondary400);
  if (scheme.secondary500) root.style.setProperty('--heroui-secondary-500', scheme.secondary500);
  if (scheme.secondary600) root.style.setProperty('--heroui-secondary-600', scheme.secondary600);
  if (scheme.secondary700) root.style.setProperty('--heroui-secondary-700', scheme.secondary700);
  if (scheme.secondary800) root.style.setProperty('--heroui-secondary-800', scheme.secondary800);
  if (scheme.secondary900) root.style.setProperty('--heroui-secondary-900', scheme.secondary900);

  const rgbTertiary = hexToRgb(scheme.tertiary);

  // 3. Dynamic ambient meshes derived from active color
  if (isDark) {
    root.style.setProperty(
      '--heroui-dynamic-gradient-mesh',
      `radial-gradient(circle 850px at 92% -8%, rgba(${rgbPrimary.r}, ${rgbPrimary.g}, ${rgbPrimary.b}, 0.08) 0%, transparent 70%), radial-gradient(circle 750px at -6% 106%, rgba(${rgbTertiary.r}, ${rgbTertiary.g}, ${rgbTertiary.b}, 0.06) 0%, transparent 65%), radial-gradient(circle 500px at 50% 50%, rgba(${rgbPrimary.r}, ${rgbPrimary.g}, ${rgbPrimary.b}, 0.03) 0%, transparent 80%)`
    );
    root.style.setProperty(
      '--heroui-dynamic-subtle-glow',
      `linear-gradient(135deg, rgba(${rgbPrimary.r}, ${rgbPrimary.g}, ${rgbPrimary.b}, 0.06) 0%, rgba(${rgbTertiary.r}, ${rgbTertiary.g}, ${rgbTertiary.b}, 0.035) 100%)`
    );
  } else {
    root.style.setProperty(
      '--heroui-dynamic-gradient-mesh',
      `radial-gradient(circle 800px at 92% -8%, rgba(${rgbPrimary.r}, ${rgbPrimary.g}, ${rgbPrimary.b}, 0.05) 0%, transparent 70%), radial-gradient(circle 700px at -6% 106%, rgba(${rgbTertiary.r}, ${rgbTertiary.g}, ${rgbTertiary.b}, 0.04) 0%, transparent 65%), radial-gradient(circle 500px at 50% 50%, rgba(${rgbPrimary.r}, ${rgbPrimary.g}, ${rgbPrimary.b}, 0.02) 0%, transparent 80%)`
    );
    root.style.setProperty(
      '--heroui-dynamic-subtle-glow',
      `linear-gradient(135deg, rgba(${rgbPrimary.r}, ${rgbPrimary.g}, ${rgbPrimary.b}, 0.03) 0%, rgba(${rgbTertiary.r}, ${rgbTertiary.g}, ${rgbTertiary.b}, 0.015) 100%)`
    );
  }

  // 4. Glass Borders
  if (isDark) {
    root.style.setProperty('--glass-border-color', `color-mix(in srgb, ${scheme.outlineVariant} 65%, transparent)`);
    root.style.setProperty('--glass-border-color-translucent', `color-mix(in srgb, ${scheme.outlineVariant} 70%, transparent)`);
    root.style.setProperty('--glass-border-color-header', `color-mix(in srgb, ${scheme.outlineVariant} 60%, transparent)`);
    root.style.setProperty('--glass-border-color-modal', `color-mix(in srgb, ${scheme.outlineVariant} 80%, transparent)`);
    root.style.setProperty('--glass-border-color-pill', `color-mix(in srgb, ${scheme.outlineVariant} 60%, transparent)`);
    root.style.setProperty('--glass-border-color-dropdown', `color-mix(in srgb, ${scheme.outlineVariant} 75%, transparent)`);
  } else {
    root.style.setProperty('--glass-border-color', `color-mix(in srgb, ${scheme.outlineVariant} 45%, rgba(255, 255, 255, 0.6))`);
    root.style.setProperty('--glass-border-color-translucent', `color-mix(in srgb, ${scheme.outlineVariant} 30%, rgba(255, 255, 255, 0.75))`);
    root.style.setProperty('--glass-border-color-header', `color-mix(in srgb, ${scheme.outlineVariant} 30%, rgba(255, 255, 255, 0.5))`);
    root.style.setProperty('--glass-border-color-modal', `color-mix(in srgb, ${scheme.outlineVariant} 45%, rgba(255, 255, 255, 0.6))`);
    root.style.setProperty('--glass-border-color-pill', `color-mix(in srgb, ${scheme.outlineVariant} 40%, rgba(255, 255, 255, 0.5))`);
    root.style.setProperty('--glass-border-color-dropdown', `color-mix(in srgb, ${scheme.outlineVariant} 40%, rgba(255, 255, 255, 0.65))`);
  }
}

// Backwards compatibility alias
export const applyM3ThemeToDOM = applyHeroThemeToDOM;

// Function to clear dynamic overrides and reset to index.css stylesheet defaults
export function resetHeroThemeOverride() {
  const root = document.documentElement;
  const herouiVars = [
    'primary', 'primary-rgb', 'primary-foreground', 'focus',
    'primary-50', 'primary-100', 'primary-200', 'primary-300', 'primary-400',
    'primary-500', 'primary-600', 'primary-700', 'primary-800', 'primary-900',
    'secondary', 'secondary-rgb', 'secondary-foreground',
    'secondary-50', 'secondary-100', 'secondary-200', 'secondary-300', 'secondary-400',
    'secondary-500', 'secondary-600', 'secondary-700', 'secondary-800', 'secondary-900',
    'dynamic-gradient-mesh', 'dynamic-subtle-glow'
  ];
  herouiVars.forEach(v => {
    root.style.removeProperty(`--heroui-${v}`);
  });

  const glassBorders = [
    '--glass-border-color',
    '--glass-border-color-translucent',
    '--glass-border-color-header',
    '--glass-border-color-modal',
    '--glass-border-color-pill',
    '--glass-border-color-dropdown'
  ];
  glassBorders.forEach(prop => root.style.removeProperty(prop));
}

// Backwards compatibility alias
export const resetM3ThemeOverride = resetHeroThemeOverride;
