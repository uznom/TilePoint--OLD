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
  contrast: 'default' | 'medium' | 'high' = 'default'
): M3ThemeScheme {
  const rgb = hexToRgb(seedColor);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const h = hsl.h;
  const s = hsl.s;
  const l = hsl.l;

  // Stable theme accents independently of contrast setting following user intent
  const accentContrast: any = 'default';

  if (!isDark) {
    // ---- LIGHT MODE ----
    
    // Primary: Use the seed color adjusted for contrast
    let primaryL = l;
    if (accentContrast === 'medium') {
      primaryL = Math.max(0.12, l - 0.15); // Darker primary
    } else if (accentContrast === 'high') {
      primaryL = Math.max(0.08, l - 0.28); // Extremely dark primary for bold visibility
    } else {
      if (l > 0.6) {
        primaryL = 0.45; // Darken to assure safe contrast on lights
      } else if (l < 0.15) {
        primaryL = 0.35; // Brighten if too muddy
      }
    }
    const primaryHex = rgbToHex(...Object.values(hslToRgb(h, s, primaryL)) as [number, number, number]);
    
    // On Primary: Determine based on luminance contrast ratio
    const primaryOnWhite = getContrastRatio(primaryHex, '#FFFFFF');
    const onPrimary = accentContrast === 'high' ? '#FFFFFF' : (primaryOnWhite >= 4.5 ? '#FFFFFF' : '#0B132B');

    // Primary container: very soft copy
    const primaryContainerL = accentContrast === 'high' ? 0.98 : (accentContrast === 'medium' ? 0.97 : 0.96);
    const primaryContainerSat = accentContrast === 'high' ? 0.05 : (accentContrast === 'medium' ? 0.15 : 0.24);
    const primaryContainerHex = rgbToHex(...Object.values(hslToRgb(h, Math.min(primaryContainerSat, s * 0.6), primaryContainerL)) as [number, number, number]);
    
    // On Primary container: deep marine-like shade of the primary color
    const onPrimaryContainerL = accentContrast === 'high' ? 0.10 : (accentContrast === 'medium' ? 0.18 : 0.24);
    const onPrimaryContainerHex = rgbToHex(...Object.values(hslToRgb(h, Math.max(0.6, s), onPrimaryContainerL)) as [number, number, number]);

    // Secondary: Slate desaturated color supporting primary
    let secondaryL = 0.34;
    if (accentContrast === 'medium') secondaryL = 0.22;
    if (accentContrast === 'high') secondaryL = 0.12;
    const secondaryHex = rgbToHex(...Object.values(hslToRgb(h, 0.12, secondaryL)) as [number, number, number]);
    const secondaryOnWhite = getContrastRatio(secondaryHex, '#FFFFFF');
    const onSecondary = secondaryOnWhite >= 4.5 ? '#FFFFFF' : '#111827';
    
    const secondaryContainerHex = rgbToHex(...Object.values(hslToRgb(h, 0.08, accentContrast === 'high' ? 0.98 : 0.94)) as [number, number, number]);
    const onSecondaryContainerHex = rgbToHex(...Object.values(hslToRgb(h, 0.15, accentContrast === 'high' ? 0.10 : 0.20)) as [number, number, number]);

    // Tertiary: Compliment color (rotate hue 120-150 deg)
    const tertiaryH = (h + 0.35) % 1;
    let tertiaryL = 0.34;
    if (accentContrast === 'medium') tertiaryL = 0.22;
    if (accentContrast === 'high') tertiaryL = 0.12;
    const tertiaryHex = rgbToHex(...Object.values(hslToRgb(tertiaryH, Math.min(0.5, s), tertiaryL)) as [number, number, number]);
    const onTertiary = getContrastRatio(tertiaryHex, '#FFFFFF') >= 4.5 ? '#FFFFFF' : '#0F2C2C';
    
    const tertiaryContainerHex = rgbToHex(...Object.values(hslToRgb(tertiaryH, 0.12, accentContrast === 'high' ? 0.98 : 0.96)) as [number, number, number]);
    const onTertiaryContainerHex = rgbToHex(...Object.values(hslToRgb(tertiaryH, 0.4, accentContrast === 'high' ? 0.10 : 0.2)) as [number, number, number]);

    // Surface & Background (harmonized tinted background)
    let surfaceL = 0.95;
    if (contrast === 'high') {
      surfaceL = 0.99; // Crisp clear white background
    } else if (contrast === 'medium') {
      surfaceL = 0.97;
    }
    const surfaceHex = rgbToHex(...Object.values(hslToRgb(h, 0.06, surfaceL)) as [number, number, number]);
    
    let onSurface = rgbToHex(...Object.values(hslToRgb(h, 0.16, 0.08)) as [number, number, number]); // Charcoal tinted hue
    let onSurfaceVariant = rgbToHex(...Object.values(hslToRgb(h, 0.12, 0.28)) as [number, number, number]);
    if (contrast === 'medium') {
      onSurface = '#05070B';
      onSurfaceVariant = '#151C26';
    } else if (contrast === 'high') {
      onSurface = '#000000';
      onSurfaceVariant = '#000000';
    }

    // Surface Containers
    const lowest = contrast === 'high' ? '#FFFFFF' : rgbToHex(...Object.values(hslToRgb(h, 0.04, 0.98)) as [number, number, number]);
    const low = contrast === 'high' ? '#FFFFFF' : (contrast === 'medium' ? rgbToHex(...Object.values(hslToRgb(h, 0.04, 0.97)) as [number, number, number]) : rgbToHex(...Object.values(hslToRgb(h, 0.05, 0.96)) as [number, number, number]));
    const container = contrast === 'high' ? '#F2F2F2' : rgbToHex(...Object.values(hslToRgb(h, 0.08, 0.92)) as [number, number, number]);
    const high = contrast === 'high' ? '#E5E5E5' : rgbToHex(...Object.values(hslToRgb(h, 0.12, 0.86)) as [number, number, number]);

    // Outlines
    let outline = rgbToHex(...Object.values(hslToRgb(h, 0.14, 0.44)) as [number, number, number]);
    let outlineVariant = rgbToHex(...Object.values(hslToRgb(h, 0.09, 0.82)) as [number, number, number]);
    if (contrast === 'medium') {
      outline = '#2D3748';
      outlineVariant = '#A0AEC0';
    } else if (contrast === 'high') {
      outline = '#000000';
      outlineVariant = '#000000';
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
    
    // Primary: make it a pastelized bright glowing tone
    let primaryL = l;
    if (accentContrast === 'medium') {
      primaryL = 0.78; // Extra glowing visibility
    } else if (accentContrast === 'high') {
      primaryL = 0.88; // Extreme high-visibility bright neon
    } else {
      if (l < 0.55) {
        primaryL = 0.65; 
      } else if (l > 0.85) {
        primaryL = 0.72; 
      }
    }
    const primaryHex = rgbToHex(...Object.values(hslToRgb(h, Math.min(0.9, s * 1.1), primaryL)) as [number, number, number]);
    const onPrimary = accentContrast === 'high' ? '#000000' : (getContrastRatio(primaryHex, '#FAFBFD') >= 3.0 ? '#FAFBFD' : '#09101F');

    // Primary Container: dark sapphire-style underlay
    const primaryContainerHex = rgbToHex(...Object.values(hslToRgb(h, Math.min(0.8, s * 0.9), accentContrast === 'high' ? 0.08 : (accentContrast === 'medium' ? 0.12 : 0.18))) as [number, number, number]);
    const onPrimaryContainerHex = rgbToHex(...Object.values(hslToRgb(h, 0.35, accentContrast === 'high' ? 0.95 : (accentContrast === 'medium' ? 0.92 : 0.88))) as [number, number, number]);

    // Secondary
    let secondaryL = 0.68;
    if (accentContrast === 'medium') secondaryL = 0.80;
    if (accentContrast === 'high') secondaryL = 0.90;
    const secondaryHex = rgbToHex(...Object.values(hslToRgb(h, 0.12, secondaryL)) as [number, number, number]);
    const onSecondary = getContrastRatio(secondaryHex, '#FAFBFD') >= 3.0 ? '#FAFBFD' : '#0F172A';
    const secondaryContainerHex = rgbToHex(...Object.values(hslToRgb(h, 0.10, accentContrast === 'high' ? 0.08 : 0.20)) as [number, number, number]);
    const onSecondaryContainerHex = rgbToHex(...Object.values(hslToRgb(h, 0.15, accentContrast === 'high' ? 0.95 : 0.86)) as [number, number, number]);

    // Tertiary Complementary dark Mode highlight
    const tertiaryH = (h + 0.35) % 1;
    let tertiaryL = 0.65;
    if (accentContrast === 'medium') tertiaryL = 0.78;
    if (accentContrast === 'high') tertiaryL = 0.88;
    const tertiaryHex = rgbToHex(...Object.values(hslToRgb(tertiaryH, Math.min(0.7, s), tertiaryL)) as [number, number, number]);
    const onTertiary = getContrastRatio(tertiaryHex, '#FAFBFD') >= 3.0 ? '#FAFBFD' : '#031E1E';
    
    const tertiaryContainerHex = rgbToHex(...Object.values(hslToRgb(tertiaryH, 0.35, accentContrast === 'high' ? 0.08 : 0.22)) as [number, number, number]);
    const onTertiaryContainerHex = rgbToHex(...Object.values(hslToRgb(tertiaryH, 0.25, accentContrast === 'high' ? 0.95 : 0.88)) as [number, number, number]);

    // Surface & Background (gorgeous deep charcoal-tinted dark environment)
    let surfaceL = 0.06;
    if (contrast === 'high') {
      surfaceL = 0.01; // Solid pitch black
    } else if (contrast === 'medium') {
      surfaceL = 0.04;
    }
    const surfaceHex = rgbToHex(...Object.values(hslToRgb(h, 0.08, surfaceL)) as [number, number, number]);
    let onSurface = '#F3F4F6';
    let onSurfaceVariant = rgbToHex(...Object.values(hslToRgb(h, 0.10, 0.72)) as [number, number, number]);
    if (contrast === 'medium') {
      onSurface = '#FFFFFF';
      onSurfaceVariant = '#E2E8F0';
    } else if (contrast === 'high') {
      onSurface = '#FFFFFF';
      onSurfaceVariant = '#FFFFFF';
    }

    // Surface containers
    const lowest = contrast === 'high' ? '#000000' : rgbToHex(...Object.values(hslToRgb(h, 0.08, 0.04)) as [number, number, number]);
    const low = contrast === 'high' ? '#000000' : (contrast === 'medium' ? rgbToHex(...Object.values(hslToRgb(h, 0.08, 0.06)) as [number, number, number]) : rgbToHex(...Object.values(hslToRgb(h, 0.09, 0.10)) as [number, number, number]));
    const container = contrast === 'high' ? '#111111' : rgbToHex(...Object.values(hslToRgb(h, 0.11, 0.14)) as [number, number, number]);
    const high = contrast === 'high' ? '#222222' : rgbToHex(...Object.values(hslToRgb(h, 0.13, 0.20)) as [number, number, number]);

    // Outlines
    let outline = rgbToHex(...Object.values(hslToRgb(h, 0.10, 0.36)) as [number, number, number]);
    let outlineVariant = rgbToHex(...Object.values(hslToRgb(h, 0.12, 0.22)) as [number, number, number]);
    if (contrast === 'medium') {
      outline = '#CBD5E1';
      outlineVariant = '#475569';
    } else if (contrast === 'high') {
      outline = '#FFFFFF';
      outlineVariant = '#FFFFFF';
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
    'outline', 'outline-variant'
  ];
  vars.forEach(v => {
    root.style.removeProperty(`--m3-${v}`);
  });
}
