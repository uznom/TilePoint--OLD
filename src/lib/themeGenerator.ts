/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface M3ThemeScheme {
 primary: string;
 onPrimary: string;
 primaryContainer: string;
 onPrimaryContainer: string;
 
 secondary: string;
 onSecondary: string;
 secondaryContainer: string;
 onSecondaryContainer: string;
 
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
 let h = 0, s = 0, l = (max + min) / 2;

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

// Generate the fully compliant light mode or dark mode schema
export function generateThemeFromSeed(
  seedColor: string, 
  isDark: boolean,
  contrast: 'small' | 'default' | 'medium' | 'high' = 'medium'
): M3ThemeScheme {
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
      primaryL = 0.46; // Gently adjust very light seeds for optimal contrast
    } else if (l < 0.20) {
      primaryL = 0.35; // Brighten very dark seeds
    }
    const primaryHex = rgbToHex(...Object.values(hslToRgb(h, s, primaryL)) as [number, number, number]);
    
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

    // Surface & Background - Clear distinguishability between Small, Medium, and High
    let surfaceHex = '#F4F6FA'; // Small: Soft, relaxed eggshell tint
    let onSurface = '#1E293B'; // Small: Charcoal Slate
    let onSurfaceVariant = '#64748B'; // Small: Slate-500
    let lowest = '#FFFFFF';
    let low = '#FAFBFD';
    let container = '#F0F3F8';
    let high = '#E4E8F0';
    let outline = '#CBD5E1'; // Small: Soft border
    let outlineVariant = '#E2E8F0'; // Small: Subtle divider

    if (contrastMode === 'medium') {
      surfaceHex = '#EAEFF5'; // Medium: Distinct, crisp background
      onSurface = '#0F172A'; // Medium: Deep Slate-900 text
      onSurfaceVariant = '#334155'; // Medium: Slate-700 text
      lowest = '#FFFFFF';
      low = '#F3F6FA';
      container = '#E2E8F0';
      high = '#D0D7E2';
      outline = '#64748B'; // Medium: Defined dark borders
      outlineVariant = '#94A3B8';
    } else if (contrastMode === 'high') {
      surfaceHex = '#F1F5F9'; // High: High-contrast crisp canvas
      onSurface = '#000000'; // High: Maximum black text
      onSurfaceVariant = '#000000'; // High: Maximum black text
      lowest = '#FFFFFF';
      low = '#FFFFFF';
      container = '#E2E8F0';
      high = '#CBD5E1';
      outline = '#000000'; // High: High-contrast solid black outlines
      outlineVariant = '#1E293B';
    }

    return {
      primary: primaryHex,
      onPrimary,
      primaryContainer: primaryContainerHex,
      onPrimaryContainer: onPrimaryContainerHex,
      
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
    if (l < 0.45) {
      primaryL = 0.65; // Brighten for dark background legibility
    } else if (l > 0.80) {
      primaryL = 0.72;
    }
    const primaryHex = rgbToHex(...Object.values(hslToRgb(h, Math.min(0.9, s * 1.1), primaryL)) as [number, number, number]);
    const onPrimary = getContrastRatio(primaryHex, '#FFFFFF') >= 3.0 ? '#FFFFFF' : '#09101F';

    // Primary Container: dark sapphire-style underlay
    const primaryContainerHex = rgbToHex(...Object.values(hslToRgb(h, Math.min(0.8, s * 0.9), contrastMode === 'high' ? 0.10 : (contrastMode === 'medium' ? 0.14 : 0.18))) as [number, number, number]);
    const onPrimaryContainerHex = rgbToHex(...Object.values(hslToRgb(h, 0.35, contrastMode === 'high' ? 0.98 : (contrastMode === 'medium' ? 0.92 : 0.88))) as [number, number, number]);

    // Secondary & Tertiary
    const secondaryHex = rgbToHex(...Object.values(hslToRgb(h, 0.12, contrastMode === 'high' ? 0.90 : (contrastMode === 'medium' ? 0.80 : 0.68))) as [number, number, number]);
    const onSecondary = '#0F172A';
    const secondaryContainerHex = rgbToHex(...Object.values(hslToRgb(h, 0.10, contrastMode === 'high' ? 0.10 : (contrastMode === 'medium' ? 0.16 : 0.20))) as [number, number, number]);
    const onSecondaryContainerHex = rgbToHex(...Object.values(hslToRgb(h, 0.15, contrastMode === 'high' ? 0.98 : (contrastMode === 'medium' ? 0.90 : 0.86))) as [number, number, number]);

    const tertiaryH = (h + 0.35) % 1;
    const tertiaryHex = rgbToHex(...Object.values(hslToRgb(tertiaryH, Math.min(0.7, s), contrastMode === 'high' ? 0.90 : (contrastMode === 'medium' ? 0.78 : 0.65))) as [number, number, number]);
    const onTertiary = '#031E1E';
    const tertiaryContainerHex = rgbToHex(...Object.values(hslToRgb(tertiaryH, 0.35, contrastMode === 'high' ? 0.10 : (contrastMode === 'medium' ? 0.16 : 0.22))) as [number, number, number]);
    const onTertiaryContainerHex = rgbToHex(...Object.values(hslToRgb(tertiaryH, 0.25, contrastMode === 'high' ? 0.98 : (contrastMode === 'medium' ? 0.90 : 0.88))) as [number, number, number]);

    // Surface & Background - Clear distinguishability between Small, Medium, and High
    let surfaceHex = '#0F172A'; // Small: Soft midnight slate canvas
    let onSurface = '#F8FAFC'; // Small: Light slate text
    let onSurfaceVariant = '#94A3B8'; // Small: Slate-400 text
    let lowest = '#070B14';
    let low = '#131C2E';
    let container = '#1E293B';
    let high = '#334155';
    let outline = '#334155'; // Small: Soft dark outlines
    let outlineVariant = '#1E293B';

    if (contrastMode === 'medium') {
      surfaceHex = '#0B0F17'; // Medium: Deeper dark background
      onSurface = '#FFFFFF'; // Medium: Bright white text
      onSurfaceVariant = '#CBD5E1'; // Medium: Slate-300 text
      lowest = '#05080E';
      low = '#0F172A';
      container = '#1E293B';
      high = '#334155';
      outline = '#64748B'; // Medium: Crisp visible borders
      outlineVariant = '#475569';
    } else if (contrastMode === 'high') {
      surfaceHex = '#000000'; // High: Pure pitch black OLED canvas
      onSurface = '#FFFFFF'; // High: Maximum white text
      onSurfaceVariant = '#FFFFFF'; // High: Maximum white text
      lowest = '#000000';
      low = '#0A0A0A';
      container = '#141414';
      high = '#262626';
      outline = '#FFFFFF'; // High: Maximum white border outlines
      outlineVariant = '#A3A3A3';
    }

    return {
      primary: primaryHex,
      onPrimary,
      primaryContainer: primaryContainerHex,
      onPrimaryContainer: onPrimaryContainerHex,
      
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
  }
}

// Function to apply scheme to DOM
export function applyM3ThemeToDOM(scheme: M3ThemeScheme) {
 const root = document.documentElement;
 root.style.setProperty('--m3-primary', scheme.primary);
 root.style.setProperty('--m3-on-primary', scheme.onPrimary);
 root.style.setProperty('--m3-primary-container', scheme.primaryContainer);
 root.style.setProperty('--m3-on-primary-container', scheme.onPrimaryContainer);
 
 // Set RGB helper for dropshadow opacity calculations
 const rgbPrimary = hexToRgb(scheme.primary);
 root.style.setProperty('--m3-primary-rgb', `${rgbPrimary.r}, ${rgbPrimary.g}, ${rgbPrimary.b}`);
 
 // Set surface container RGB helper for dark mode card overrides
 const rgbSurfaceContainer = hexToRgb(scheme.surfaceContainer);
 root.style.setProperty('--m3-surface-container-rgb', `${rgbSurfaceContainer.r}, ${rgbSurfaceContainer.g}, ${rgbSurfaceContainer.b}`);
 
 // Explicitly calculate and apply active hover overlay to avoid CSS re-evaluation latency
 const isDark = root.classList.contains('dark');
 const hoverOpacity = isDark ? 0.16 : 0.08;
 root.style.setProperty('--m3-hover-overlay', `rgba(${rgbPrimary.r}, ${rgbPrimary.g}, ${rgbPrimary.b}, ${hoverOpacity})`);
 
 root.style.setProperty('--m3-secondary', scheme.secondary);
 root.style.setProperty('--m3-on-secondary', scheme.onSecondary);
 root.style.setProperty('--m3-secondary-container', scheme.secondaryContainer);
 root.style.setProperty('--m3-on-secondary-container', scheme.onSecondaryContainer);
 
 root.style.setProperty('--m3-tertiary', scheme.tertiary);
 root.style.setProperty('--m3-on-tertiary', scheme.onTertiary);
 root.style.setProperty('--m3-tertiary-container', scheme.tertiaryContainer);
 root.style.setProperty('--m3-on-tertiary-container', scheme.onTertiaryContainer);
 
 root.style.setProperty('--m3-surface', scheme.surface);
 root.style.setProperty('--m3-on-surface', scheme.onSurface);
 root.style.setProperty('--m3-on-surface-variant', scheme.onSurfaceVariant);
 
 root.style.setProperty('--m3-surface-container-lowest', scheme.surfaceContainerLowest);
 root.style.setProperty('--m3-surface-container-low', scheme.surfaceContainerLow);
 root.style.setProperty('--m3-surface-container', scheme.surfaceContainer);
 root.style.setProperty('--m3-surface-container-high', scheme.surfaceContainerHigh);
 
 root.style.setProperty('--m3-outline', scheme.outline);
 root.style.setProperty('--m3-outline-variant', scheme.outlineVariant);
}

// Function to clear dynamic overrides and reset to index.css stylesheet defaults
export function resetM3ThemeOverride() {
 const root = document.documentElement;
 const vars = [
 'primary', 'on-primary', 'primary-container', 'on-primary-container', 'primary-rgb',
 'secondary', 'on-secondary', 'secondary-container', 'on-secondary-container',
 'tertiary', 'on-tertiary', 'tertiary-container', 'on-tertiary-container',
 'surface', 'on-surface', 'on-surface-variant',
 'surface-container-lowest', 'surface-container-low', 'surface-container', 'surface-container-high',
 'surface-container-rgb', 'hover-overlay',
 'outline', 'outline-variant'
 ];
 vars.forEach(v => {
 root.style.removeProperty(`--m3-${v}`);
 });
}
