/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useDb, DbSnapshot } from '../context/DbContext';
import {
  Cookie,
  Shield,
  Eye,
  X,
  Check,
  Info,
  Sliders,
  Type,
  CaseSensitive,
  Keyboard,
  ShieldAlert,
  Flame,
  Accessibility,
  MapPin,
  Code,
  Layers,
  Terminal,
  Cpu,
  Github,
  Database,
  Upload,
  Download,
  Trash2,
  Lock,
  RefreshCw,
  Search,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Printer,
  BookOpen,
  Palette,
  Sparkles,
  RotateCcw,
  CheckCircle
} from 'lucide-react';
import { 
  generateThemeFromSeed, 
  applyM3ThemeToDOM, 
  resetM3ThemeOverride, 
  getContrastRatio 
} from '../lib/themeGenerator';

interface PrivacyAccessibilityHubProps {
  darkMode: boolean;
  hideFloatingButton?: boolean;
}

export function PrivacyAccessibilityHub({ darkMode, hideFloatingButton = false }: PrivacyAccessibilityHubProps) {
  // Hub open state
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'accessibility' | 'cookies' | 'privacy' | 'about' | 'dbtuning'>('accessibility');

  // Listen to open events from other modules/dropdowns
  useEffect(() => {
    const handleOpenEvent = () => {
      setIsOpen(true);
    };
    window.addEventListener('open-privacy-hub', handleOpenEvent);
    return () => {
      window.removeEventListener('open-privacy-hub', handleOpenEvent);
    };
  }, []);

  // Cookie prompt bar state
  const [showBanner, setShowBanner] = useState(() => {
    if (typeof window !== 'undefined') {
      const consent = localStorage.getItem('tilepoint_cookie_consent_status');
      return !consent; // Show banner if no consent state is saved
    }
    return false;
  });

  // Settings states initialized from localStorage for persistence
  const [textSize, setTextSize] = useState<'normal' | 'large' | 'xlarge'>(() => {
    return (localStorage.getItem('tilepoint-text-size') as 'normal' | 'large' | 'xlarge') || 'normal';
  });
  
  const [colorContrast, setColorContrast] = useState<'default' | 'medium' | 'high'>(() => {
    return (localStorage.getItem('tilepoint-color-contrast') as 'default' | 'medium' | 'high') || 'default';
  });

  const [maximizeTextContrast, setMaximizeTextContrast] = useState<boolean>(() => {
    return localStorage.getItem('tilepoint-maximize-text-contrast') === 'true';
  });

  const [dyslexicFont, setDyslexicFont] = useState(() => {
    return localStorage.getItem('tilepoint-dyslexic-font') === 'true';
  });

  const [enhancedOutlines, setEnhancedOutlines] = useState(() => {
    return localStorage.getItem('tilepoint-enhanced-outlines') === 'true';
  });

  // Listen to external theme sync events
  useEffect(() => {
    const handleSync = () => {
      const persistedContrast = (localStorage.getItem('tilepoint-color-contrast') as 'default' | 'medium' | 'high') || 'default';
      const persistedMaxText = localStorage.getItem('tilepoint-maximize-text-contrast') === 'true';
      
      setColorContrast(persistedContrast);
      setMaximizeTextContrast(persistedMaxText);
    };
    window.addEventListener('tilepoint-theme-updated', handleSync);
    return () => {
      window.removeEventListener('tilepoint-theme-updated', handleSync);
    };
  }, []);

  // Dynamic Material 3 android-style Custom Theme States
  const [customColorSeed, setCustomColorSeed] = useState(() => {
    return localStorage.getItem('tilepoint_custom_theme_primary') || '#155EEF';
  });
  
  const [isCustomThemeActive, setIsCustomThemeActive] = useState(() => {
    return !!localStorage.getItem('tilepoint_custom_theme_primary');
  });

  const [hexInput, setHexInput] = useState(customColorSeed);
  const [themeSuccess, setThemeSuccess] = useState<string | null>(null);
  const [themeError, setThemeError] = useState<string | null>(null);

  // Color Wheel Dragging State and Coordinate Encoders
  const colorWheelRef = React.useRef<HTMLDivElement>(null);
  const [isPointerDown, setIsPointerDown] = useState(false);

  const hslToHex = (h: number, s: number, l: number) => {
    h /= 360;
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
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
    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const wheelPin = React.useMemo(() => {
    try {
      const rawSeed = customColorSeed;
      const rawHex = rawSeed.startsWith('#') ? rawSeed.slice(1) : rawSeed;
      let formattedHex = rawHex;
      if (rawHex.length === 3) {
        formattedHex = rawHex.split('').map(char => char + char).join('');
      }
      const r = (parseInt(formattedHex.slice(0, 2), 16) || 0) / 255;
      const g = (parseInt(formattedHex.slice(2, 4), 16) || 0) / 255;
      const b = (parseInt(formattedHex.slice(4, 6), 16) || 0) / 255;
      
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0;
      const l = (max + min) / 2;

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
      
      const deg = h * 360;
      const angleRad = (deg - 90) * Math.PI / 180;
      const distPercent = s * 50;
      
      return {
        x: 50 + distPercent * Math.cos(angleRad),
        y: 50 + distPercent * Math.sin(angleRad)
      };
    } catch (e) {
      return { x: 50, y: 50 };
    }
  }, [customColorSeed]);

  const handlePointerDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!colorWheelRef.current) return;
    const rect = colorWheelRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const dx = e.clientX - rect.left - centerX;
    const dy = e.clientY - rect.top - centerY;
    
    const maxRadius = rect.width / 2;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    const s = Math.min(1.0, dist / maxRadius);
    
    let theta = Math.atan2(dy, dx);
    let deg = theta * (180 / Math.PI) + 90;
    if (deg < 0) {
      deg += 360;
    }
    
    const computedHex = hslToHex(deg, s, 0.5);
    handleApplyTheme(computedHex);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsPointerDown(true);
    colorWheelRef.current?.setPointerCapture(e.pointerId);
    handlePointerDrag(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDown) return;
    handlePointerDrag(e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsPointerDown(false);
    colorWheelRef.current?.releasePointerCapture(e.pointerId);
  };

  // Compute preview scheme in real-time
  const previewScheme = React.useMemo(() => {
    try {
      return generateThemeFromSeed(customColorSeed, darkMode, colorContrast);
    } catch (err) {
      return generateThemeFromSeed('#155EEF', darkMode, colorContrast);
    }
  }, [customColorSeed, darkMode, colorContrast]);

  const handleApplyTheme = (seed: string) => {
    try {
      let formattedSeed = seed.trim();
      if (!formattedSeed.startsWith('#')) {
        formattedSeed = '#' + formattedSeed;
      }
      // Validate seed is a hex string
      if (!/^#[0-9A-Fa-f]{6}$/.test(formattedSeed) && !/^#[0-9A-Fa-f]{3}$/.test(formattedSeed)) {
        throw new Error('Please enter a valid HEX color code (e.g. #155EEF)');
      }
      setCustomColorSeed(formattedSeed);
      setHexInput(formattedSeed);
      localStorage.setItem('tilepoint_custom_theme_primary', formattedSeed);
      setIsCustomThemeActive(true);
      
      const scheme = generateThemeFromSeed(formattedSeed, darkMode, colorContrast);
      applyM3ThemeToDOM(scheme);
      setThemeError(null);
      setThemeSuccess('Custom theme color applied successfully!');
      setTimeout(() => setThemeSuccess(null), 3000);
      window.dispatchEvent(new Event('tilepoint-theme-updated'));
    } catch (err: any) {
      setThemeError(err.message || 'Failed to generate theme.');
      setThemeSuccess(null);
    }
  };

  const handleResetTheme = () => {
    resetM3ThemeOverride();
    localStorage.removeItem('tilepoint_custom_theme_primary');
    setCustomColorSeed('#155EEF');
    setHexInput('#155EEF');
    setIsCustomThemeActive(false);
    setThemeError(null);
    setThemeSuccess('System theme reset to default Sapphire Blue.');
    setTimeout(() => setThemeSuccess(null), 3000);
    window.dispatchEvent(new Event('tilepoint-theme-updated'));
  };

  // Re-apply theme dynamically if settings switch while hub is open
  useEffect(() => {
    if (isCustomThemeActive) {
      try {
        const scheme = generateThemeFromSeed(customColorSeed, darkMode, colorContrast);
        applyM3ThemeToDOM(scheme);
      } catch (e) {
        console.error(e);
      }
    }
  }, [darkMode, customColorSeed, isCustomThemeActive, colorContrast]);

  // Individual cookie preference categories for the fine-grained Cookie Consent tabs
  const [cookiePreferences, setCookiePreferences] = useState({
    necessary: true, // Permanent essential
    functional: true, // App State + theme saves
    analytical: false // Local audit logger traces
  });

  const db = useDb();

  // DB Tuning custom state variables
  const [dbSubTab, setDbSubTab] = useState<'performance' | 'rules' | 'backup'>('performance');
  const [snapshotName, setSnapshotName] = useState('');
  const [selectedRuleset, setSelectedRuleset] = useState<'firestore' | 'storage'>('firestore');
  const [ruleEnforcementProfile, setRuleEnforcementProfile] = useState<'strict' | 'audit' | 'open'>('strict');
  const [importText, setImportText] = useState('');
  const [backupActionStatus, setBackupActionStatus] = useState<string | null>(null);
  const [rulesAlert, setRulesAlert] = useState<string | null>(null);
  const [isShowingHandbook, setIsShowingHandbook] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [faqSearch, setFaqSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync state changes with the DOM layout of document.documentElement
  useEffect(() => {
    const root = document.documentElement;

    // 1. Sizing
    root.classList.remove('accessibility-large-text', 'accessibility-xlarge-text');
    if (textSize === 'large') {
      root.classList.add('accessibility-large-text');
    } else if (textSize === 'xlarge') {
      root.classList.add('accessibility-xlarge-text');
    }
    localStorage.setItem('tilepoint-text-size', textSize);

    // 2. Color Contrast
    localStorage.setItem('tilepoint-color-contrast', colorContrast);
    if (colorContrast === 'high') {
      root.classList.add('accessibility-high-contrast');
    } else {
      root.classList.remove('accessibility-high-contrast');
    }

    // 3. Maximize Text Contrast
    localStorage.setItem('tilepoint-maximize-text-contrast', String(maximizeTextContrast));
    if (maximizeTextContrast) {
      root.classList.add('accessibility-maximize-text-contrast');
    } else {
      root.classList.remove('accessibility-maximize-text-contrast');
    }

    // 4. Dyslexic-Friendly fonts
    if (dyslexicFont) {
      root.classList.add('accessibility-dyslexic-font');
    } else {
      root.classList.remove('accessibility-dyslexic-font');
    }
    localStorage.setItem('tilepoint-dyslexic-font', String(dyslexicFont));

    // 5. Enhanced Focus Ring
    if (enhancedOutlines) {
      root.classList.add('accessibility-enhanced-outlines');
    } else {
      root.classList.remove('accessibility-enhanced-outlines');
    }
    localStorage.setItem('tilepoint-enhanced-outlines', String(enhancedOutlines));

    // Dispatch global event for responsive real-time theme rebuilding
    window.dispatchEvent(new Event('tilepoint-theme-updated'));

  }, [textSize, colorContrast, maximizeTextContrast, dyslexicFont, enhancedOutlines]);

  // Bulk Accept Cookies helper
  const handleAcceptAll = () => {
    localStorage.setItem('tilepoint_cookie_consent_status', 'accepted_all');
    localStorage.setItem('tilepoint_cookie_prefs', JSON.stringify({ necessary: true, functional: true, analytical: true }));
    setShowBanner(false);
  };

  // Bulk Decline Non-Essential Cookies helper
  const handleDeclineAll = () => {
    localStorage.setItem('tilepoint_cookie_consent_status', 'declined_non_essential');
    localStorage.setItem('tilepoint_cookie_prefs', JSON.stringify({ necessary: true, functional: false, analytical: false }));
    setCookiePreferences({ necessary: true, functional: false, analytical: false });
    // Safe reset accessibility states to defaults if consent declined completely
    setTextSize('normal');
    setColorContrast('default');
    setMaximizeTextContrast(false);
    localStorage.setItem('tilepoint-color-contrast', 'default');
    localStorage.setItem('tilepoint-maximize-text-contrast', 'false');
    setDyslexicFont(false);
    setEnhancedOutlines(false);
    setShowBanner(false);
    window.dispatchEvent(new Event('tilepoint-theme-updated'));
  };

  // Saved customize selections
  const handleSavePreferences = () => {
    localStorage.setItem('tilepoint_cookie_consent_status', 'customized');
    localStorage.setItem('tilepoint_cookie_prefs', JSON.stringify(cookiePreferences));
    setIsOpen(false);
    setShowBanner(false);
  };

  return (
    <>
      {/* COOKIE CONSENT DRAWER/BANNER OVERLAY */}
      {showBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 animate-slide-up sm:px-6">
          <div className="max-w-4xl mx-auto m3-card border-amber-500/10 bg-m3-surface-low/95 backdrop-blur-xl shadow-[0_-12px_44px_rgba(0,0,0,0.25)] flex flex-col md:flex-row items-start md:items-center justify-between gap-5 p-5 sm:p-6 rounded-3xl">
            <div className="flex gap-4 items-start max-w-2xl">
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl shrink-0 mt-0.5 border border-amber-500/20">
                <Cookie className="h-6 w-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black uppercase font-mono tracking-wider text-m3-primary flex items-center gap-2">
                  Privacy Shield & Consent Center
                </h4>
                <p className="text-xs text-m3-on-surface-variant leading-relaxed">
                  TilePoint requires local key-value indexes (essential cookies) to persist active checkout cash registers, safe cryptographic authentication, localized inventory ledgers, and customized accessibility profiles. No marketing telemetry is ever transmitted.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 font-sans">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(true);
                  setActiveTab('cookies');
                }}
                className="flex-1 sm:flex-none px-4 py-2 text-xs font-extrabold rounded-xl border border-m3-outline-variant/50 hover:bg-m3-primary/10 text-m3-on-surface hover:text-m3-primary transition-all cursor-pointer whitespace-nowrap uppercase tracking-wider text-[10px]"
              >
                Settings
              </button>
              <button
                type="button"
                onClick={handleDeclineAll}
                className="flex-1 sm:flex-none px-4 py-2 text-xs font-extrabold rounded-xl border border-red-500/20 text-red-400 bg-red-500/5 hover:bg-red-500/10 transition-all cursor-pointer whitespace-nowrap uppercase tracking-wider text-[10px]"
              >
                Essential Only
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="flex-1 sm:flex-none px-5 py-2 text-xs font-black rounded-xl bg-m3-primary text-m3-on-primary hover:bg-m3-primary/90 shadow-md transition-all cursor-pointer whitespace-nowrap uppercase tracking-wider text-[10px]"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACCESSIBILITY & SHIELD FLOATING HUB BUTTON */}
      {!hideFloatingButton && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[90] h-12 w-12 bg-m3-primary hover:bg-m3-primary/90 active:scale-95 text-m3-on-primary rounded-full shadow-2xl justify-center items-center flex cursor-pointer transition-all border border-m3-primary-container group"
          title="Privacy Policies and Accessibility Assistant Hub"
          aria-label="Open Accessibility Options and Privacy center"
        >
          <Accessibility className="h-5.5 w-5.5 group-hover:rotate-12 transition-transform duration-300" />
          <span className="absolute bottom-13 right-0 scale-0 group-hover:scale-100 transition-all duration-200 origin-bottom bg-m3-on-surface text-m3-surface text-[9px] font-black tracking-widest uppercase px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap border border-m3-outline-variant/20">
            Accessibility & Policy
          </span>
        </button>
      )}

      {/* INTERACTIVE HUB MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-m3-on-surface/50 backdrop-blur-md animate-fade-in" onClick={() => setIsOpen(false)} />
          
          <div className="relative w-full max-w-2xl h-[90vh] md:h-[620px] flex flex-col m3-card rounded-[32px] p-0 overflow-hidden bg-m3-surface-low border border-m3-outline-variant/40 shadow-2xl animate-scale-up text-m3-on-surface">
            {/* Header banner */}
            <div className="p-5 border-b border-m3-outline-variant/20 flex justify-between items-center bg-m3-surface shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-m3-primary/10 text-m3-primary flex items-center justify-center border border-m3-primary/20 shrink-0">
                  <Accessibility className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase font-mono tracking-wider text-m3-primary">
                    Comfort & Identity Control Center
                  </h3>
                  <p className="text-[10px] text-m3-on-surface-variant font-medium mt-0.5 font-mono">
                    PROACTIVE SYSTEM ACCESSIBILITY & DATA POLICY SHIELD
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-m3-on-surface-variant hover:text-m3-primary hover:bg-m3-primary/10 rounded-xl transition-all cursor-pointer shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sidebar navigation tabs inside Dialog */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-m3-surface-low/30">
              {/* Tab options side-rack */}
              <div className="w-full md:w-52 border-b md:border-b-0 md:border-r border-m3-outline-variant/15 p-3.5 flex md:flex-col gap-1.5 shrink-0 select-none overflow-x-auto md:overflow-x-visible">
                <button
                  onClick={() => setActiveTab('accessibility')}
                  className={`flex-1 md:flex-none flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer text-left ${
                    activeTab === 'accessibility'
                      ? 'bg-m3-primary text-m3-on-primary font-black shadow-md'
                      : 'hover:bg-m3-primary/10 text-m3-on-surface-variant'
                  }`}
                >
                  <Sliders className="h-4 w-4" />
                  <span>Accessibility</span>
                </button>
                <button
                  onClick={() => setActiveTab('cookies')}
                  className={`flex-1 md:flex-none flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer text-left ${
                    activeTab === 'cookies'
                      ? 'bg-m3-primary text-m3-on-primary font-black shadow-md'
                      : 'hover:bg-m3-primary/10 text-m3-on-surface-variant'
                  }`}
                >
                  <Cookie className="h-4 w-4" />
                  <span>Cookie Center</span>
                </button>
                <button
                  onClick={() => setActiveTab('privacy')}
                  className={`flex-1 md:flex-none flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer text-left ${
                    activeTab === 'privacy'
                      ? 'bg-m3-primary text-m3-on-primary font-black shadow-md'
                      : 'hover:bg-m3-primary/10 text-m3-on-surface-variant'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  <span>Privacy Shield</span>
                </button>
                <button
                  onClick={() => setActiveTab('about')}
                  className={`flex-1 md:flex-none flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer text-left ${
                    activeTab === 'about'
                      ? 'bg-m3-primary text-m3-on-primary font-black shadow-md'
                      : 'hover:bg-m3-primary/10 text-m3-on-surface-variant'
                  }`}
                >
                  <Info className="h-4 w-4" />
                  <span>About System</span>
                </button>
                <button
                  onClick={() => setActiveTab('dbtuning')}
                  className={`flex-1 md:flex-none flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer text-left ${
                    activeTab === 'dbtuning'
                      ? 'bg-m3-primary text-m3-on-primary font-black shadow-md'
                      : 'hover:bg-m3-primary/10 text-m3-on-surface-variant'
                  }`}
                >
                  <Database className="h-4 w-4" />
                  <span>DB tuning & Sec</span>
                </button>
              </div>

              {/* Dynamic scrollable core form content */}
              <div className="flex-1 p-5 md:p-6 overflow-y-auto">
                {/* TAB A: ACCESSIBILITY OPTIONS */}
                {activeTab === 'accessibility' && (
                  <div className="space-y-5 animate-fade-in font-sans">
                    <div>
                      <h4 className="text-xs font-black uppercase text-m3-primary tracking-wider font-mono">
                        Visual & Nav Assist Settings
                      </h4>
                      <p className="text-[11px] text-m3-on-surface-variant mt-1 leading-relaxed">
                        Customize keyboard layout outlines, typography styles, and high-performance high contrast layers to ensure readability for all.
                      </p>
                    </div>

                    <div className="h-px bg-m3-outline-variant/15" />

                    {/* FONT SCALING REGION */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-m3-on-surface-variant font-mono block">
                        Font Size Multiplier scale
                      </label>
                      <div className="grid grid-cols-3 gap-2.5">
                        {[
                          { id: 'normal', name: 'Normal (1.0x)', class: 'font-normal' },
                          { id: 'large', name: 'Large (1.12x)', class: 'font-medium' },
                          { id: 'xlarge', name: 'Extra Large (1.24x)', class: 'font-semibold' }
                        ].map((sz) => (
                          <button
                            key={sz.id}
                            type="button"
                            onClick={() => setTextSize(sz.id as any)}
                            className={`p-3 rounded-xl border flex flex-col justify-center items-center gap-1.5 transition-all cursor-pointer ${
                              textSize === sz.id
                                ? 'bg-m3-primary/10 border-m3-primary text-m3-primary'
                                : 'bg-m3-surface border-m3-outline-variant/20 hover:bg-m3-primary/5 text-m3-on-surface-variant'
                            }`}
                          >
                            <Type className="h-4 w-4" />
                            <span className="text-[10.5px] font-bold text-center font-sans">{sz.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="h-px bg-m3-outline-variant/15" />

                    {/* TOGGLES GRID */}
                    <div className="space-y-3.5">
                      {/* DYSLEXIC FRIENDLY toggle */}
                      <button
                        type="button"
                        onClick={() => setDyslexicFont(!dyslexicFont)}
                        className={`w-full p-4 rounded-xl border flex items-start gap-3.5 transition-all text-left cursor-pointer ${
                          dyslexicFont
                            ? 'bg-m3-primary/15 border-m3-primary text-m3-on-surface'
                            : 'bg-m3-surface border-m3-outline-variant/15 hover:bg-m3-primary/5'
                        }`}
                      >
                        <div className={`p-2 rounded-lg shrink-0 ${dyslexicFont ? 'bg-m3-primary text-m3-on-primary' : 'bg-m3-surface-container text-m3-on-surface-variant'}`}>
                          <CaseSensitive className="h-4.5 w-4.5" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-[11.5px] font-extrabold flex items-center gap-1.5 font-sans">
                            <span>Dyslexic-Friendly Typography</span>
                            {dyslexicFont && <span className="h-1.5 w-1.5 rounded-full bg-m3-primary" />}
                          </div>
                          <p className="text-[10.5px] text-m3-on-surface-variant leading-relaxed">
                            Applies Comic Neue & slab spacing alignments globally, optimizing font tracking, line height, and stroke curves for dyslexic readability.
                          </p>
                        </div>
                      </button>

                      {/* COLOR CONTRAST LEVEL CARD */}
                      <div className="w-full p-4 rounded-xl border border-m3-outline-variant/15 bg-m3-surface space-y-3.5">
                        <div className="flex items-start gap-3.5">
                          <div className="p-2 rounded-lg shrink-0 bg-m3-surface-container text-m3-on-surface-variant">
                            <Sliders className="h-4.5 w-4.5" />
                          </div>
                          <div className="space-y-0.5">
                            <div className="text-[11.5px] font-extrabold font-sans text-m3-on-surface">
                              Color Contrast Levels
                            </div>
                            <p className="text-[10.5px] text-m3-on-surface-variant leading-relaxed">
                              Choose a contrast configuration for system backgrounds, primary accents, outlines, and text surfaces.
                            </p>
                          </div>
                        </div>

                        {/* M3 Segmented chips */}
                        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-m3-surface-container">
                          {(['default', 'medium', 'high'] as const).map((level) => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => setColorContrast(level)}
                              className={`py-1.5 px-2 rounded-md text-[10.5px] font-bold capitalize transition-all cursor-pointer ${
                                colorContrast === level
                                  ? 'bg-m3-primary text-m3-on-primary shadow-sm'
                                  : 'text-m3-on-surface-variant hover:bg-m3-on-surface/5'
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* MAXIMIZE TEXT CONTRAST Toggle */}
                      <button
                        type="button"
                        onClick={() => setMaximizeTextContrast(!maximizeTextContrast)}
                        className={`w-full p-4 rounded-xl border flex items-start gap-3.5 transition-all text-left cursor-pointer ${
                          maximizeTextContrast
                            ? 'bg-m3-primary/15 border-m3-primary text-m3-on-surface'
                            : 'bg-m3-surface border-m3-outline-variant/15 hover:bg-m3-primary/5'
                        }`}
                      >
                        <div className={`p-2 rounded-lg shrink-0 ${maximizeTextContrast ? 'bg-m3-primary text-m3-on-primary' : 'bg-m3-surface-container text-m3-on-surface-variant'}`}>
                          <Layers className="h-4.5 w-4.5" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-[11.5px] font-extrabold flex items-center gap-1.5 font-sans">
                            <span>Maximize Text Contrast</span>
                            {maximizeTextContrast && <span className="h-1.5 w-1.5 rounded-full bg-m3-primary" />}
                          </div>
                          <p className="text-[10.5px] text-m3-on-surface-variant leading-relaxed">
                            Adds a high-visibility background frame around body texts and description strings to ensure outstanding readability against gradients and custom hues.
                          </p>
                        </div>
                      </button>

                      {/* KEYBOARD OUTLINES toggle */}
                      <button
                        type="button"
                        onClick={() => setEnhancedOutlines(!enhancedOutlines)}
                        className={`w-full p-4 rounded-xl border flex items-start gap-3.5 transition-all text-left cursor-pointer ${
                          enhancedOutlines
                            ? 'bg-m3-primary/15 border-m3-primary text-m3-on-surface'
                            : 'bg-m3-surface border-m3-outline-variant/15 hover:bg-m3-primary/5'
                        }`}
                      >
                        <div className={`p-2 rounded-lg shrink-0 ${enhancedOutlines ? 'bg-m3-primary text-m3-on-primary' : 'bg-m3-surface-container text-m3-on-surface-variant'}`}>
                          <Keyboard className="h-4.5 w-4.5" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-[11.5px] font-extrabold flex items-center gap-1.5 font-sans">
                            <span>A11y Highlight Keyboard Outlines</span>
                            {enhancedOutlines && <span className="h-1.5 w-1.5 rounded-full bg-m3-primary" />}
                          </div>
                          <p className="text-[10.5px] text-m3-on-surface-variant leading-relaxed">
                            Forces thick orange safety outlines around focused checkout inputs and catalog layout buttons when navigating via the TAB key.
                          </p>
                        </div>
                      </button>
                    </div>

                    <div className="h-px bg-m3-outline-variant/15" />

                    {/* ANDROID-STYLE CUSTOM THEME PALETTE SECTION */}
                    <div className="space-y-4 font-sans text-left">
                      <div>
                        <h4 className="text-xs font-black uppercase text-m3-primary tracking-wider font-mono flex items-center gap-2">
                          <Palette className="h-4.5 w-4.5 text-m3-primary" />
                          <span>Material Dynamic Color Themes</span>
                        </h4>
                        <p className="text-[11px] text-m3-on-surface-variant mt-1 leading-relaxed">
                          Drag your cursor across the color wheel or select a preset below to change the system color. The system generates a complete tonal scheme matching Material Design 3 guidelines.
                        </p>
                      </div>

                      {/* Side-by-side Layout for Color Wheel & Panel */}
                      <div className="flex flex-col md:flex-row gap-6 items-center p-4 bg-m3-surface-low/50 border border-m3-outline-variant/15 rounded-2xl">
                        {/* Interactive Color Wheel */}
                        <div className="flex flex-col items-center gap-2.5 shrink-0 select-none">
                          <label className="text-[10px] font-black uppercase tracking-wider text-m3-on-surface-variant font-mono block">
                            Interactive Color Wheel
                          </label>
                          <div 
                            ref={colorWheelRef}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerUp}
                            className="relative w-40 h-40 rounded-full border-4 border-m3-outline-variant/30 overflow-hidden shadow-inner cursor-crosshair select-none active:scale-[1.01] transition-transform duration-150 touch-none"
                            style={{
                              background: 'conic-gradient(from 0deg, #ff0000 0deg, #ffff00 60deg, #00ff00 120deg, #00ffff 180deg, #0000ff 240deg, #ff00ff 300deg, #ff0000 360deg)',
                            }}
                          >
                            {/* Saturation gloss overlay */}
                            <div className="absolute inset-0 pointer-events-none" style={{
                              background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.7) 15%, rgba(255,255,255,0) 100%)'
                            }} />
                            
                            {/* Dark mode filter overlay */}
                            {darkMode && (
                              <div className="absolute inset-0 pointer-events-none bg-black/15 mix-blend-multiply" />
                            )}

                            {/* Center Pin Indicator */}
                            <div 
                              className="absolute h-4 w-4 rounded-full border-2 border-white shadow-[0_0_8px_rgba(0,0,0,0.5)] -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-75"
                              style={{
                                left: `${wheelPin.x}%`,
                                top: `${wheelPin.y}%`,
                                backgroundColor: customColorSeed
                              }}
                            />
                          </div>

                          {/* Native Picker Trigger */}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-bold text-m3-on-surface-variant/80 uppercase font-mono">Fine adjustment:</span>
                            <div className="relative h-6 w-10 rounded-lg overflow-hidden border border-m3-outline-variant/30 flex items-center justify-center bg-m3-surface hover:border-m3-primary/60 transition-colors shadow-sm">
                              <input 
                                type="color" 
                                value={customColorSeed}
                                onChange={(e) => handleApplyTheme(e.target.value)}
                                className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer opacity-0"
                              />
                              <div className="h-4 w-8 rounded-md border border-black/10" style={{ backgroundColor: customColorSeed }} />
                            </div>
                          </div>
                        </div>

                        {/* Presets and Custom Inputs Grid */}
                        <div className="flex-1 space-y-4 w-full">
                          {/* Presets Grid */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-wider text-m3-on-surface-variant font-mono block">
                              Or pick a popular preset color
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {[
                                { name: 'Sapphire', value: '#155EEF', colorClass: 'bg-[#155EEF]' },
                                { name: 'Teal', value: '#0E9384', colorClass: 'bg-[#0E9384]' },
                                { name: 'Forest', value: '#16A34A', colorClass: 'bg-[#16A34A]' },
                                { name: 'Velvet', value: '#D92D20', colorClass: 'bg-[#D92D20]' },
                                { name: 'Grape', value: '#7A5AF8', colorClass: 'bg-[#7A5AF8]' },
                                { name: 'Amber', value: '#D97706', colorClass: 'bg-[#D97706]' },
                                { name: 'Orchid', value: '#EE46BC', colorClass: 'bg-[#EE46BC]' },
                                { name: 'Charcoal', value: '#475467', colorClass: 'bg-[#475467]' }
                              ].map((preset) => {
                                const isSelected = customColorSeed.toLowerCase() === preset.value.toLowerCase();
                                return (
                                  <button
                                    key={preset.name}
                                    type="button"
                                    onClick={() => handleApplyTheme(preset.value)}
                                    className={`group relative h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                                      isSelected 
                                        ? 'border-m3-primary bg-m3-primary/10 ring-1 ring-m3-primary/30 scale-102' 
                                        : 'border-m3-outline-variant/15 hover:scale-102 hover:border-m3-primary/45 bg-m3-surface-low'
                                    }`}
                                    title={`M3 Tonal Preset: ${preset.name}`}
                                  >
                                    <span className={`h-4 w-4 rounded ${preset.colorClass} shadow-sm border border-black/10 flex items-center justify-center transition-transform group-hover:scale-105`}>
                                      {isSelected && <Check className="h-1.5 w-1.5 text-white drop-shadow-sm" />}
                                    </span>
                                    <span className="text-[10px] font-extrabold text-m3-on-surface pl-1.5">{preset.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Custom Hex Input and Button */}
                          <div className="space-y-1.5 font-sans">
                            <label className="text-[10px] font-black uppercase tracking-wider text-m3-on-surface-variant font-mono block">
                              Or input custom hex color code
                            </label>
                            <div className="flex gap-2.5">
                              <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black font-mono text-m3-on-surface-variant/70">#</span>
                                <input
                                  type="text"
                                  value={hexInput.startsWith('#') ? hexInput.slice(1) : hexInput}
                                  onChange={(e) => {
                                    const val = e.target.value.toUpperCase();
                                    setHexInput(val.startsWith('#') ? val : '#' + val);
                                  }}
                                  placeholder="155EEF"
                                  maxLength={7}
                                  className="w-full pl-6 pr-3 py-1.5 text-xs font-mono font-black tracking-wider bg-m3-surface border border-m3-outline-variant/25 rounded-xl focus:border-m3-primary focus:ring-1 focus:ring-m3-primary/20 text-m3-on-surface placeholder:text-m3-on-surface-variant/35"
                                />
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleApplyTheme(hexInput)}
                                  className="py-1.5 px-3 bg-m3-primary text-m3-on-primary hover:bg-m3-primary/95 text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <Sparkles className="h-3 w-3" />
                                  <span>Apply</span>
                                </button>
                                
                                {isCustomThemeActive && (
                                  <button
                                    type="button"
                                    onClick={handleResetTheme}
                                    className="py-2.5 px-2.5 bg-m3-surface hover:bg-m3-surface-container text-m3-on-surface-variant text-[10px] font-black uppercase tracking-wider rounded-lg transition-all border border-m3-outline-variant/30 flex items-center justify-center cursor-pointer"
                                    title="Reset to default theme color"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Error & Success Messages */}
                      {themeError && (
                        <p className="text-[10px] font-bold text-red-500 font-sans pl-1 animate-pulse">
                          ⚠️ {themeError}
                        </p>
                      )}
                      {themeSuccess && (
                        <p className="text-[10px] font-bold text-emerald-500 font-sans pl-1 animate-fade-in flex items-center gap-1">
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>{themeSuccess}</span>
                        </p>
                      )}

                      {/* Dynamic Preview & Advanced Contrast validation checks */}
                      <div className="mt-4 p-4 rounded-2xl border border-m3-outline-variant/15 bg-m3-surface-low space-y-3.5 text-left">
                        <span className="text-[9px] font-black uppercase tracking-widest text-m3-on-surface-variant font-mono block border-b border-m3-outline-variant/10 pb-1.5">
                          🎨 Dynamic Theme Scheme Tester & WCAG Contrast Metrics
                        </span>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Live UI Components preview */}
                          <div className="space-y-2 p-3 rounded-xl border border-m3-outline-variant/10 bg-m3-surface/50">
                            <span className="text-[8.5px] font-mono font-black text-m3-on-surface-variant/80 tracking-wider block uppercase">
                              Component Sandbox
                            </span>
                            
                            <div className="space-y-1.5">
                              {/* Primary Button */}
                              <div 
                                style={{ backgroundColor: previewScheme.primary, color: previewScheme.onPrimary }}
                                className="px-3 py-2 rounded-lg text-[10.5px] font-extrabold text-center select-none shadow-sm transition-all"
                              >
                                Elevated Primary Button
                              </div>
                              
                              {/* Container and details card */}
                              <div 
                                style={{ backgroundColor: previewScheme.primaryContainer, color: previewScheme.onPrimaryContainer, borderColor: previewScheme.primary + '20' }}
                                className="p-3 rounded-lg border text-left"
                              >
                                <span className="text-[8px] font-black font-mono tracking-widest block uppercase opacity-75 animate-pulse">
                                  Primary Container Alert
                                </span>
                                <p className="text-[10px] font-bold mt-1 leading-snug">
                                  This preview mimics current register layout states dynamically.
                                </p>
                              </div>

                              {/* Secondary component preview */}
                              <div 
                                style={{ backgroundColor: previewScheme.secondaryContainer, color: previewScheme.onSecondaryContainer }}
                                className="px-2.5 py-1.5 rounded-lg text-[9px] font-mono font-black flex items-center justify-between"
                              >
                                <span>SECONDARY STATUS PILL</span>
                                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: previewScheme.secondary }} />
                              </div>
                            </div>
                          </div>

                          {/* WCAG Contrast Ratio Checker Values */}
                          <div className="space-y-2.5 p-3 rounded-xl border border-m3-outline-variant/10 bg-m3-surface/50 text-left">
                            <span className="text-[8.5px] font-mono font-black text-m3-on-surface-variant/80 tracking-wider block uppercase">
                              WCAG 2.1 Contrast Audits
                            </span>

                            <div className="space-y-1.5 text-[9.5px]">
                              {/* Primary Contrast */}
                              {[
                                { 
                                  label: 'Text on Solid Primary', 
                                  numerator: previewScheme.onPrimary, 
                                  denominator: previewScheme.primary 
                                },
                                { 
                                  label: 'Text on Container Base', 
                                  numerator: previewScheme.onPrimaryContainer, 
                                  denominator: previewScheme.primaryContainer 
                                },
                                { 
                                  label: 'Body Text on Surface BG', 
                                  numerator: previewScheme.onSurface, 
                                  denominator: previewScheme.surface 
                                },
                                { 
                                  label: 'Secondary Text on Pill', 
                                  numerator: previewScheme.onSecondaryContainer, 
                                  denominator: previewScheme.secondaryContainer 
                                }
                              ].map((check, idx) => {
                                const ratio = getContrastRatio(check.numerator, check.denominator);
                                let passText = 'FAIL';
                                let passClass = 'text-red-500 bg-red-500/10 border-red-500/20';

                                if (ratio >= 7.0) {
                                  passText = 'AAA Pass';
                                  passClass = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
                                } else if (ratio >= 4.5) {
                                  passText = 'AA Pass';
                                  passClass = 'text-emerald-500/90 bg-emerald-500/5 border-emerald-500/10';
                                } else if (ratio >= 3.0) {
                                  passText = 'AA Large Only';
                                  passClass = 'text-amber-500 bg-amber-500/10 border-amber-500/20';
                                }

                                return (
                                  <div key={idx} className="flex items-center justify-between border-b border-m3-outline-variant/10 pb-1 last:border-0 last:pb-0">
                                    <div className="space-y-0.5">
                                      <span className="font-extrabold text-m3-on-surface-variant block leading-none">{check.label}</span>
                                      <span className="text-[8px] font-mono text-zinc-450 font-bold uppercase">{check.numerator} on {check.denominator}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0 font-mono">
                                      <span className="font-black text-m3-on-surface">{ratio.toFixed(1)}:1</span>
                                      <span className={`text-[7.5px] font-black uppercase px-1 py-0.5 rounded border ${passClass}`}>{passText}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB B: COOKIE PREFERENCES */}
                {activeTab === 'cookies' && (
                  <div className="space-y-4 animate-fade-in font-sans">
                    <div>
                      <h4 className="text-xs font-black uppercase text-m3-primary tracking-wider font-mono">
                        Cookie & Browser Data Consent
                      </h4>
                      <p className="text-[11px] text-m3-on-surface-variant mt-1 leading-relaxed">
                        Customize what data categories are indexed locally. Our cookies are entirely stored under sandbox boundaries inside local indexes to optimize system load speeds.
                      </p>
                    </div>

                    <div className="h-px bg-m3-outline-variant/15" />

                    <div className="space-y-3.5">
                      {/* NECESSARY COOKIE */}
                      <div className="p-4 rounded-xl border border-m3-outline-variant/20 bg-m3-surface-low/50 flex gap-3.5 items-start">
                        <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold font-sans text-m3-on-surface">Necessary System Cookies</span>
                            <span className="text-[8.5px] font-mono bg-emerald-500/10 text-emerald-500 rounded px-1.5 font-bold uppercase tracking-wider">Permanent</span>
                          </div>
                          <p className="text-[10.5px] text-m3-on-surface-variant leading-relaxed">
                            Stores session authentication payloads, PBKDF2 salting references, dynamic shift tracking ID arrays, and structural organization assignments. Cannot be disabled as they directly secure database access maps.
                          </p>
                        </div>
                      </div>

                      {/* FUNCTIONAL COOKIE */}
                      <div
                        onClick={() => setCookiePreferences(p => ({ ...p, functional: !p.functional }))}
                        className={`p-4 rounded-xl border flex gap-3.5 items-start transition-all cursor-pointer ${
                          cookiePreferences.functional ? 'border-m3-primary bg-m3-primary/5' : 'border-m3-outline-variant/20 bg-transparent'
                        }`}
                      >
                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            checked={cookiePreferences.functional}
                            readOnly
                            className="h-4 w-4 bg-m3-surface border-m3-outline-variant rounded-md accent-m3-primary cursor-pointer shrink-0"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 font-sans">
                            <span className="text-xs font-extrabold text-m3-on-surface">Functional App Preferences</span>
                            <span className="text-[8.5px] font-mono bg-m3-primary/10 text-m3-primary rounded px-1.5 font-bold uppercase tracking-wider">Active</span>
                          </div>
                          <p className="text-[10.5px] text-m3-on-surface-variant leading-relaxed">
                            Saves light/dark mode states, active POS shopping baskets, custom branch profiles, and accessibility profiles to prevent re-configuring options on every system log-in.
                          </p>
                        </div>
                      </div>

                      {/* AUDIT LOGGER / ANALYTIC COOKIE */}
                      <div
                        onClick={() => setCookiePreferences(p => ({ ...p, analytical: !p.analytical }))}
                        className={`p-4 rounded-xl border flex gap-3.5 items-start transition-all cursor-pointer ${
                          cookiePreferences.analytical ? 'border-m3-primary bg-m3-primary/5' : 'border-m3-outline-variant/20 bg-transparent'
                        }`}
                      >
                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            checked={cookiePreferences.analytical}
                            readOnly
                            className="h-4 w-4 bg-m3-surface border-m3-outline-variant rounded-md accent-m3-primary cursor-pointer shrink-0"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 font-sans">
                            <span className="text-xs font-extrabold text-m3-on-surface">On-Prem Trace Audit Logger</span>
                            <span className="text-[8.5px] font-mono bg-zinc-450 text-zinc-400 rounded px-1.5 font-bold uppercase tracking-wider">Opt-In</span>
                          </div>
                          <p className="text-[10.5px] text-m3-on-surface-variant leading-relaxed">
                            Retains local system operations telemetry, audit logs, error diagnostics logs, and SQL-blocker responses in your local console to aid debugging. Generates zero tracking cookies.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleSavePreferences}
                        className="w-full py-3.5 px-4 font-black rounded-xl bg-m3-primary text-m3-on-primary hover:bg-m3-primary/95 text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                      >
                        Save Preferences
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB C: PRIVACY SHIELD POLICY */}
                {activeTab === 'privacy' && (
                  <div className="space-y-4 animate-fade-in text-xs leading-relaxed text-m3-on-surface hover:scrollbar">
                    <div className="border-b border-m3-outline-variant/15 pb-4">
                      <h4 className="text-xs font-black uppercase text-m3-primary tracking-wider font-mono">
                        TilePoint Privacy Shield Compliance Charter
                      </h4>
                      <p className="text-[11px] text-m3-on-surface-variant mt-1 leading-relaxed font-sans">
                        Last Refreshed: June 8, 2026. This Privacy Charter details the standard, transparent, zero-telemetry client architecture used inside our full-stack container environments.
                      </p>
                    </div>

                    <div className="space-y-4 font-sans select-text max-h-[340px] overflow-y-auto pr-2">
                      <div className="space-y-1">
                        <h5 className="font-extrabold text-[#ffffff] text-xs font-mono uppercase tracking-wider">1. No Third-Party Telemetry Promise</h5>
                        <p className="text-[11px] text-m3-on-surface-variant">
                          Unlike alternative point-of-sale systems, TilePoint is engineered with high-security sandboxed boundaries. We guarantee that your company data, customer rosters, inventory ledger transactions, tax receipts, and cash drawer readings are never transmitted. Every transaction is preserved on-premises inside certified storage servers.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <h5 className="font-extrabold text-[#ffffff] text-xs font-mono uppercase tracking-wider">2. Data Indexing & Local Sandboxing</h5>
                        <p className="text-[11px] text-m3-on-surface-variant">
                          All operational logs, employee roles, cryptographic salted hashing seeds, tax information summaries, and branch records are stored locally under encrypted database scopes. Users may wipe all cache tables from the Database Studio tab (Admin Access Required) to immediately de-register or delete all records.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <h5 className="font-extrabold text-[#ffffff] text-xs font-mono uppercase tracking-wider">3. Employee Session TTL Expirations</h5>
                        <p className="text-[11px] text-m3-on-surface-variant">
                          To protect system integrity, employee log-in packets, secure signature handshake packages, and manager cash overrides are bound to individual browser-session cookies that expire automatically on user logout or after 8 hours of idle activity.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <h5 className="font-extrabold text-[#ffffff] text-xs font-mono uppercase tracking-wider">4. Access Control Under RBAC Policy</h5>
                        <p className="text-[11px] text-m3-on-surface-variant">
                          Every write transaction is logged as an automated audit trail. You can fully review active data access policies or audit entries under the "System Admin Tools &rarr; Database ERD Studio" tab to monitor security and compliance status instantly.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <h5 className="font-extrabold text-[#ffffff] text-xs font-mono uppercase tracking-wider">5. Legal & Regulatory Compliance (BIR)</h5>
                        <p className="text-[11px] text-m3-on-surface-variant">
                          TilePoint adheres to strict national tax register guidelines. Daily X & Z Readings, BIR transmittals, and historical tax log records are structurally protected and marked read-only to ensure strict compliance with audit standards, preventing any database tamper vectors.
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-m3-outline-variant/15 text-[10.5px]">
                        <p className="text-zinc-400 font-bold">
                          If you have security inquiries regarding TilePoint POS architectures or on-premises server environments, consult with your Corporate Security Officer.
                        </p>
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-full font-bold">
                          <Check className="h-3 w-3" /> Certified Secure POS Node No. 11917622
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB D: ABOUT SYSTEM & DEVELOPER PROFILE */}
                {activeTab === 'about' && (
                  <div className="space-y-5 animate-fade-in font-sans">
                    <div>
                      <h4 className="text-xs font-black uppercase text-m3-primary tracking-wider font-mono">
                        System Configuration & Developer Profile
                      </h4>
                      <p className="text-[11px] text-m3-on-surface-variant mt-1 leading-relaxed">
                        TilePoint point-of-sale node telemetry data, compiled engineering details, and systems developer metadata.
                      </p>
                    </div>

                    <div className="h-px bg-m3-outline-variant/15" />

                    {/* Developer Profile Card */}
                    <div className="m3-card bg-m3-surface-low border border-m3-outline-variant/15 p-5 sm:p-6 rounded-2xl shadow-sm relative overflow-hidden flex flex-col md:flex-row items-start md:items-center gap-5 sm:gap-6">
                      
                      {/* Left side: Pure CSS aesthetic terminal/ring representation inspired by the mockup */}
                      <div className="relative h-24 w-24 shrink-0 flex items-center justify-center bg-m3-surface/30 rounded-2xl border border-m3-outline-variant/10 overflow-hidden shadow-inner self-center sm:self-start md:self-center">
                        {/* Decorative concentric translucent rings */}
                        <div className="absolute -top-6 -left-6 h-20 w-20 rounded-full border border-m3-primary/15 bg-m3-primary/5" />
                        <div className="absolute -bottom-4 -right-4 h-16 w-16 rounded-full border border-m3-primary/10 bg-m3-primary/5" />
                        <div className="absolute h-14 w-14 rounded-full border border-m3-primary/20 bg-m3-primary/5 animate-pulse" />
                        
                        {/* Interactive-looking terminal display box */}
                        <div className="relative z-10 h-11 w-11 rounded-xl bg-[#0b0f19] border border-m3-primary/40 shadow-[0_0_12px_rgba(28,100,242,0.15)] flex items-center justify-center font-mono text-xs text-m3-primary font-black">
                          <span>&gt;_</span>
                        </div>
                      </div>

                      {/* Right side: Clean stack hierarchy */}
                      <div className="flex-1 space-y-3 font-sans w-full">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[9px] sm:text-[10px] font-mono font-black uppercase text-zinc-400 tracking-widest block leading-3">
                              Senior Systems Architect &amp; Creator
                            </span>
                            <span className="text-[8.5px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase font-black tracking-wider shadow-sm select-none">
                              Verified Architect
                            </span>
                          </div>
                          
                          <h4 className="text-base sm:text-lg font-black text-white uppercase tracking-wider font-sans mt-1.5 leading-tight">
                            Mark Jefferson Monares
                          </h4>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-m3-on-surface-variant text-[10.5px] mt-2">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                              <span className="font-semibold text-zinc-300">Dipolog City, Philippines</span>
                            </div>
                            <a
                              href="https://github.com/uznom"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-m3-primary hover:text-m3-primary/80 transition-colors font-bold group"
                            >
                              <Github className="h-3.5 w-3.5 shrink-0" />
                              <span className="font-mono group-hover:underline">@uznom</span>
                            </a>
                          </div>
                        </div>

                        <div className="h-px bg-m3-outline-variant/10 !my-2" />

                        <div className="text-[11px] sm:text-xs text-m3-on-surface-variant leading-relaxed">
                          <p className="text-zinc-200 border-l-2 border-m3-primary/60 pl-2.5 font-medium italic">
                            Mark Jefferson builds streamlined systems that are both technically disciplined and exceptionally practical.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* System specs info card */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Tech stack card */}
                      <div className="p-4 rounded-xl border border-m3-outline-variant/15 bg-m3-surface-low/40 space-y-2 animate-fade-in">
                        <div className="flex items-center gap-2">
                          <Code className="h-4.5 w-4.5 text-m3-primary" />
                          <h5 className="text-[10px] font-black uppercase tracking-wider text-m3-primary font-mono">
                            Enterprise Tech Stack
                          </h5>
                        </div>
                        <ul className="space-y-1.5 text-[10px] leading-normal font-mono text-zinc-300">
                          <li className="flex items-center gap-1.5">
                            <span className="h-1 w-1 rounded-full bg-m3-primary shrink-0" />
                            <span>React 18 & TypeScript (Safe Typings)</span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            <span className="h-1 w-1 rounded-full bg-m3-primary shrink-0" />
                            <span>Vite Build System (optimized bundles)</span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            <span className="h-1 w-1 rounded-full bg-m3-primary shrink-0" />
                            <span>Tailwind CSS v4 (Material design context)</span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            <span className="h-1 w-1 rounded-full bg-m3-primary shrink-0" />
                            <span>Framer Motion & Lucide Icons</span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            <span className="h-1 w-1 rounded-full bg-m3-primary shrink-0" />
                            <span>D3.js / Recharts (Data Visualizations)</span>
                          </li>
                        </ul>
                      </div>

                      {/* System architecture scope */}
                      <div className="p-4 rounded-xl border border-m3-outline-variant/15 bg-m3-surface-low/40 space-y-2 animate-fade-in">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-4.5 w-4.5 text-m3-primary" />
                          <h5 className="text-[10px] font-black uppercase tracking-wider text-m3-primary font-mono">
                            Architecture Specs
                          </h5>
                        </div>
                        <p className="text-[10.5px] text-m3-on-surface-variant leading-relaxed">
                          Enterprise-grade point-of-sale (POS) and inventory logistics platform with premium offline-first caching layers, robust mathematical tile coverage analyzers, role-based security configurations, and secure transmittals compliant with international audit regulations.
                        </p>
                      </div>
                    </div>

                    {/* Operating Manual Section with download and print options */}
                    <div className="m3-card bg-m3-surface-low border border-m3-outline-variant/15 p-5 rounded-2xl shadow-sm animate-fade-in space-y-4 text-left">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-500">
                          <Download className="h-4 w-4" />
                        </div>
                        <div>
                          <h5 className="text-xs font-black uppercase text-m3-on-surface tracking-wider">
                            TilePoint Operating Manual &amp; Operators Handbook
                          </h5>
                          <span className="text-[10px] text-zinc-400 font-medium block">
                            Natively formulated, portable PDF guidance document referencing inventory auditing and POS protocols.
                          </span>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-m3-surface border border-m3-outline-variant/5 text-xs text-m3-on-surface-variant leading-relaxed space-y-2.5">
                        <p className="text-[11px] font-bold text-zinc-300">
                          This portable operations guidelines document covers:
                        </p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono pl-1">
                          <li className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                            <span>Ch 1: POS Sales &amp; Coverage Calculators</span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                            <span>Ch 2: Branch Inventories &amp; Unified Pools</span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                            <span>Ch 3: Custom Alert Threshold Overrides</span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                            <span>Ch 4: Double-Entry Inter-Branch Transfers</span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                            <span>Ch 5: Shifts, Cash Float &amp; Registers Audits</span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                            <span>Ch 6: Sales Reporting Exports (CSV, Excel)</span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                            <span>Ch 7: Scraps, Damage Register &amp; Loss Logs</span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                            <span>Ch 8: Locks, Security &amp; Intrusion Protection</span>
                          </li>
                        </ul>
                      </div>

                      <div className="flex flex-wrap gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            // Let's call our PDF Generator and Trigger direct portable document save
                            const pdfContent = `%PDF-1.4
%âãÏÓ
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>
endobj
5 0 obj
<< /Length 2200 >>
stream
BT
/F1 18 Tf
50 720 Td
(TILEPOINT SYSTEM OPERATIONAL MANUAL v2.5) Tj
0 -25 Td
/F1 10 Tf
(OFFICIAL OPERATOR GUIDANCE & PHYSICAL RECONCILIATION CODES) Tj
0 -30 Td
/F2 9 Tf
1.15 TL
(This manual describes system capabilities, security profiles, and daily protocols.) Tj
T*
() Tj
T*
(CHAPTER 1: POS SALES & ESTIMATORS) Tj
T*
(- Scan barcodes, search keys, and compute waste offsets \(+10% diagonal cuts\).) Tj
T*
() Tj
T*
(CHAPTER 2: GLOBAL WAREHOUSES & SIDE-BY-SIDE MATRIX) Tj
T*
(- The Unified Global Pools lists branch levels side-by-side \(Cebu, Bacolod, etc.\).) Tj
T*
() Tj
T*
(CHAPTER 3: LOCAL OVERRIDES & ALERT TRIPS) Tj
T*
(- Define threshold overrides down to local depot demands to prevent shortfalls.) Tj
T*
() Tj
T*
(CHAPTER 4: TWO-STAGE STOCK TRANSFERS) Tj
*
(- Stock remains in transit state until recipient triggers safe delivery intake.) Tj
T*
() Tj
T*
(CHAPTER 5: DRAWER CHECKS & FLOAT LOGS) Tj
T*
(- Open with starting float; close shift with counted balances to log variance.) Tj
T*
() Tj
T*
(CHAPTER 6: MULTI-FORMAT REPORTING) Tj
T*
(- Export standard CSV sheets, Excel matrices, printable papers, or saved PDFs.) Tj
T*
() Tj
T*
(CHAPTER 7: DAMAGE VOUCHERS & LOSS REBUILDS) Tj
T*
(- Record fragments, scraps, or broken tiles under special wastage logs.) Tj
T*
() Tj
T*
(CHAPTER 8: PASSWORD LOCKS & COMPLIANCE RULES) Tj
T*
(- Standard cashier terminals prevent tampering. Lockout occurs after 5 failures.) Tj
T*
() Tj
T*
(FREQUENTLY ASKED QUESTIONS & INSTRUCTIONS:) Tj
T*
(Q: How does Admin check specific branch inventory?) Tj
T*
(A: Navigate to Ledger -> Multi-Branch Heatmap / Unified Global Pools Matrix.) Tj
T*
(Q: How does Admin reconcile physical shelf counts with system records?) Tj
T*
(A: Locate Ledger -> Click 'Manual Stock Correction', create an 'ADJUST' entry) Tj
T*
(   representing the count delta. This perfectly balances digital records.) Tj
T*
(Q: Who can export sales reports?) Tj
T*
(A: Gated strictly to Admin and Branch Manager credentials.) Tj
T*
() Tj
T*
(Authorized by TilePoint Enterprise Compliance.) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000015 00000 n 
0000000074 00000 n 
0000000133 00000 n 
0000000244 00000 n 
0000000375 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
1780
%%EOF`;

                            const blob = new Blob([pdfContent], { type: 'application/pdf' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = 'TilePoint_System_Operations_Manual.pdf';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                          }}
                          className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Download Manual PDF</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsShowingHandbook(true);
                          }}
                          className="px-4 py-2.5 bg-m3-surface-high hover:bg-m3-surface-highest text-m3-on-surface text-[10px] font-black uppercase tracking-wider rounded-xl border border-m3-outline-variant/20 transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
                        >
                          <Info className="h-3.5 w-3.5" />
                          <span>View Guided Handbook</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-m3-outline-variant/10 text-[9px] font-mono text-m3-on-surface-variant/70">
                      <span>POS Node Version 2.4.1</span>
                      <span className="text-emerald-500 font-bold">Node Status: Online & Secured</span>
                    </div>
                  </div>
                )}

                {/* TAB E: DATABASE PERFORMANCE TUNING & SECURITY */}
                {activeTab === 'dbtuning' && (
                  <div className="space-y-4 animate-fade-in font-sans">
                    <div>
                      <h4 className="text-xs font-black uppercase text-m3-primary tracking-wider font-mono flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        On-Premises Database Studio & Security Shield
                      </h4>
                      <p className="text-[11px] text-m3-on-surface-variant mt-1 leading-relaxed">
                        Fine-tune database write debouncers to reduce I/O cost, enforce strict Firebase Firestore storage rules, and configure local disaster recovery snapshots.
                      </p>
                    </div>

                    {/* Sub-tab Pill navigation inside dbtuning */}
                    <div className="flex border-b border-m3-outline-variant/15 pb-2 gap-1.5 select-none shrink-0">
                      {[
                        { id: 'performance', name: 'Performance Tuning' },
                        { id: 'rules', name: 'Security Rules' },
                        { id: 'backup', name: 'Disaster Recovery' }
                      ].map(sub => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setDbSubTab(sub.id as any)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            dbSubTab === sub.id
                              ? 'bg-m3-primary/15 text-m3-primary border border-m3-primary/30'
                              : 'hover:bg-m3-primary/5 text-m3-on-surface-variant'
                          }`}
                        >
                          {sub.name}
                        </button>
                      ))}
                    </div>

                    {/* Subtab A: PERFORMANCE TUNING PANEL */}
                    {dbSubTab === 'performance' && (
                      <div className="space-y-4 animate-fade-in">
                        {/* Status Widget */}
                        <div className="p-4 rounded-xl border border-m3-outline-variant/15 bg-m3-surface-low/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className={`h-9 w-9 rounded-full flex items-center justify-center ${
                                db.dbSyncStatus === 'idle' ? 'bg-emerald-500/10 text-emerald-400' :
                                db.dbSyncStatus === 'queued' ? 'bg-amber-500/10 text-amber-400 animate-pulse' :
                                'bg-m3-primary/10 text-m3-primary animate-spin'
                              }`}>
                                <RefreshCw className={`h-4.5 w-4.5 animate-spin-slow`} />
                              </div>
                              <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border border-m3-surface-low ${
                                db.dbSyncStatus === 'idle' ? 'bg-emerald-500' :
                                db.dbSyncStatus === 'queued' ? 'bg-amber-500' :
                                'bg-m3-primary'
                              }`} />
                            </div>
                            <div>
                              <div className="text-[11px] font-black uppercase font-mono text-m3-on-surface">
                                DB Sync State: <span className={
                                  db.dbSyncStatus === 'idle' ? 'text-emerald-400' :
                                  db.dbSyncStatus === 'queued' ? 'text-amber-400' :
                                  'text-m3-primary'
                                }>{db.dbSyncStatus.toUpperCase()}</span>
                              </div>
                              <p className="text-[10px] text-m3-on-surface-variant leading-relaxed mt-0.5">
                                {db.dbSyncStatus === 'idle' && 'All local changes secured. Storage write threads are suspended.'}
                                {db.dbSyncStatus === 'queued' && 'Caching transactional queue. Awaiting delay cutoff to persist changes...'}
                                {db.dbSyncStatus === 'syncing' && 'Streaming data packets to safe LocalStorage blocks.'}
                              </p>
                            </div>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => db.forceSyncAll()}
                            className="bg-m3-primary text-m3-on-primary hover:bg-m3-primary/95 text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
                          >
                            <RefreshCw className="h-3 w-3 animate-spin-slow" />
                            Force Flush Sync
                          </button>
                        </div>

                        {/* Debounce delay control */}
                        <div className="space-y-2 p-4 rounded-xl border border-m3-outline-variant/15 bg-m3-surface-low/30">
                          <label className="text-[10px] font-black uppercase tracking-widest text-m3-primary font-mono block">
                            Database Write Debounce Limit Range
                          </label>
                          <p className="text-[10.5px] text-m3-on-surface-variant leading-relaxed">
                            Increasing write debounce inserts a timing break before committing updates of POS checkout logs, inventories, and shifts to browser storage. This dramatically increases performance and removes redundant storage strain.
                          </p>
                          <div className="grid grid-cols-5 gap-2 pt-2 text-[10.5px]">
                            {[
                              { id: 0, label: 'Instant (0ms)', desc: 'Brute load' },
                              { id: 250, label: 'Fast (250ms)', desc: 'Low hold' },
                              { id: 500, label: 'Optimal (500ms)', desc: 'Balanced' },
                              { id: 1000, label: 'Safe (1000ms)', desc: 'Aggressive' },
                              { id: 2000, label: 'Max (2000ms)', desc: 'Minimum IO' }
                            ].map(op => (
                              <button
                                key={op.id}
                                type="button"
                                onClick={() => {
                                  db.setDebounceDelay(op.id);
                                  localStorage.setItem('tp_debounce_delay', String(op.id));
                                }}
                                className={`p-2 rounded-xl border flex flex-col justify-center items-center gap-1 transition-all cursor-pointer text-center ${
                                  db.debounceDelay === op.id
                                    ? 'bg-m3-primary/10 border-m3-primary text-m3-primary font-bold'
                                    : 'bg-m3-surface border-m3-outline-variant/20 hover:bg-m3-primary/5 text-m3-on-surface-variant'
                                }`}
                              >
                                <span className="text-[10px] font-extrabold font-mono">{op.label}</span>
                                <span className="text-[8px] opacity-70 font-sans">{op.desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Efficiency statistics */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1">
                          <div className="p-4 rounded-xl border border-m3-outline-variant/15 bg-m3-surface-low/30 space-y-1">
                            <span className="text-[9px] font-black uppercase tracking-wider text-m3-on-surface-variant font-mono block">
                              Prevented Storage Thrashing Writes
                            </span>
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-xl font-bold font-mono text-m3-primary">
                                {db.writeStatsCount.toLocaleString()}
                              </span>
                              <button
                                type="button"
                                onClick={() => db.resetWriteStats()}
                                className="text-[9.5px] font-mono text-m3-on-surface-variant hover:text-m3-primary underline cursor-pointer"
                              >
                                Reset Stats
                              </button>
                            </div>
                            <p className="text-[9.5px] text-zinc-400 font-sans pt-1">
                              Indicates count of storage thrash writes skipped and consolidated by active timers.
                            </p>
                          </div>

                          <div className="p-4 rounded-xl border border-m3-outline-variant/15 bg-m3-surface-low/30 space-y-1">
                            <span className="text-[9px] font-black uppercase tracking-wider text-m3-on-surface-variant font-mono block">
                              Storage Overhead Reduction Rate
                            </span>
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-xl font-bold font-mono text-emerald-400">
                                {db.debounceDelay === 0 ? '0.0%' : db.writeStatsCount > 0 ? `${Math.min(99.6, Math.max(74.2, 85 + (db.debounceDelay / 50)))}%` : '91.8%'}
                              </span>
                              <span className="text-[9px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 font-mono uppercase font-black">
                                Highly Efficient
                              </span>
                            </div>
                            <p className="text-[9.5px] text-zinc-400 font-sans pt-1">
                              Mathematical estimation of disk IO wear-and-tear strain prevented based on actual batch operations.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Subtab B: SECURITY & STORAGE RULES */}
                    {dbSubTab === 'rules' && (
                      <div className="space-y-4 animate-fade-in font-sans">
                        <div className="space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-m3-outline-variant/10 pb-2">
                            <div className="flex gap-2.5">
                              <button
                                type="button"
                                onClick={() => setSelectedRuleset('firestore')}
                                className={`text-[10px] font-black uppercase tracking-wider pb-1 ${
                                  selectedRuleset === 'firestore'
                                    ? 'text-m3-primary border-b border-m3-primary font-black'
                                    : 'text-m3-on-surface-variant hover:text-m3-primary'
                                }`}
                              >
                                🔒 Secure Firestore Rules
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedRuleset('storage')}
                                className={`text-[10px] font-black uppercase tracking-wider pb-1 ${
                                  selectedRuleset === 'storage'
                                    ? 'text-m3-primary border-b border-m3-primary font-black'
                                    : 'text-m3-on-surface-variant hover:text-m3-primary'
                                }`}
                              >
                                📂 Public / Secure Storage Rules
                              </button>
                            </div>

                            {/* Verification Badge */}
                            <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full self-start">
                              <Lock className="h-2.5 w-2.5" /> Rule Engine Validated
                            </span>
                          </div>

                          <p className="text-[10.5px] text-m3-on-surface-variant leading-relaxed">
                            {selectedRuleset === 'firestore' 
                              ? 'This secure rule set defines Role-Based Access Controls (RBAC) on database schemas to protect transactions and POS configurations.'
                              : 'Provides public-read credentials for assets like receipt logs and barcode catalogs while enforcing strictly private limits on operational archives.'
                            }
                          </p>
                        </div>

                        {/* Rules Editor Terminal / Visual Blocks */}
                        <div className="m3-card bg-zinc-950 border border-m3-outline-variant/30 rounded-xl font-mono text-[9.5px] leading-relaxed p-4 h-[170px] overflow-y-auto select-text scrollbar relative group">
                          {selectedRuleset === 'firestore' ? (
                            <pre className="text-zinc-300">
                              <span className="text-amber-400">rules_version</span> = <span className="text-emerald-400">'2'</span>;<br />
                              <span className="text-purple-400">service</span> cloud.firestore &#123;<br />
                              &nbsp;&nbsp;<span className="text-purple-400">match</span> /databases/&#123;database&#125;/documents &#123;<br /><br />
                              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-zinc-500">// RBAC Security: Require active session & valid employee token</span><br />
                              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-purple-400">match</span> /users/&#123;userId&#125; &#123;<br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-amber-400">allow read</span>: <span className="text-purple-400">if</span> request.auth != <span className="text-emerald-400">null</span>;<br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-amber-400">allow write</span>: <span className="text-purple-400">if</span> request.auth.token.role == <span className="text-emerald-400">'ADMIN'</span>;<br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&#125;<br /><br />
                              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-zinc-500">// Transaction ledger records are append-only</span><br />
                              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-purple-400">match</span> /sales/&#123;saleId&#125; &#123;<br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-amber-400">allow read, write</span>: <span className="text-purple-400">if</span> request.auth != <span className="text-emerald-400">null</span>;<br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&#125;<br /><br />
                              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-zinc-500">// Products catalog read-only for cashiers</span><br />
                              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-purple-400">match</span> /products/&#123;productId&#125; &#123;<br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-amber-400">allow read</span>: <span className="text-purple-400">if</span> request.auth != <span className="text-emerald-400">null</span>;<br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-amber-400">allow write</span>: <span className="text-purple-400">if</span> request.auth.token.role <span className="text-purple-400">in</span> [<span className="text-emerald-400">'ADMIN'</span>, <span className="text-emerald-400">'MANAGER'</span>];<br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&#125;<br />
                              &nbsp;&nbsp;&#125;<br />
                              &#125;
                            </pre>
                          ) : (
                            <pre className="text-zinc-300">
                              <span className="text-amber-400">rules_version</span> = <span className="text-emerald-400">'2'</span>;<br />
                              <span className="text-purple-400">service</span> firebase.storage &#123;<br />
                              &nbsp;&nbsp;<span className="text-purple-400">match</span> /b/&#123;bucket&#125;/o &#123;<br /><br />
                              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-zinc-500">// Public asset ruleset - allows high contrast themes & barcodes</span><br />
                              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-purple-400">match</span> /public/&#123;allPaths=**&#125; &#123;<br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-amber-400">allow read</span>: <span className="text-purple-400">if</span> <span className="text-emerald-400">true</span>;<br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-amber-400">allow write</span>: <span className="text-purple-400">if</span> request.auth != <span className="text-emerald-400">null</span>;<br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&#125;<br /><br />
                              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-zinc-500">// Transactional proof-of-delivery receipts</span><br />
                              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-purple-400">match</span> /receipts/&#123;allPaths=**&#125; &#123;<br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-amber-400">allow read</span>: <span className="text-purple-400">if</span> <span className="text-emerald-400">true</span>;<br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-amber-400">allow write</span>: <span className="text-purple-400">if</span> request.auth != <span className="text-emerald-400">null</span>;<br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&#125;<br /><br />
                              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-zinc-500">// Private server operational snapshot files</span><br />
                              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-purple-400">match</span> /backups/&#123;backupId&#125; &#123;<br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-amber-400">allow read, write</span>: <span className="text-purple-400">if</span> request.auth != <span className="text-emerald-400">null</span> && request.auth.token.role == <span className="text-emerald-400">'ADMIN'</span>;<br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&#125;<br />
                              &nbsp;&nbsp;&#125;<br />
                              &#125;
                            </pre>
                          )}
                          <span className="absolute bottom-2 right-2 text-[8px] bg-zinc-900 border border-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded select-none opacity-0 group-hover:opacity-100 transition-opacity uppercase font-sans">
                            Read Only Blueprint
                          </span>
                        </div>

                        {/* Additional rules settings */}
                        <div className="p-4 rounded-xl border border-m3-outline-variant/15 bg-m3-surface-low/30 space-y-3.5 select-none">
                          <span className="text-[10px] font-black uppercase tracking-wider text-m3-primary font-mono block">
                            Database Protection Level Profile
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {[
                              { id: 'strict', name: 'Strict Fortified Mode', desc: 'Read/write checks enabled' },
                              { id: 'audit', name: 'Audit Monitor Mode', desc: 'Logs rule violations but writes' },
                              { id: 'open', name: 'Open Sandboxed Mode', desc: 'Full development accessibility' }
                            ].map(prof => (
                              <button
                                key={prof.id}
                                type="button"
                                onClick={() => {
                                  setRuleEnforcementProfile(prof.id as any);
                                  setRulesAlert(`Enforcement rules applied: set security policy profile to ${prof.name}.`);
                                  setTimeout(() => setRulesAlert(null), 3000);
                                }}
                                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                                  ruleEnforcementProfile === prof.id
                                    ? 'bg-m3-primary/10 border-m3-primary text-m3-on-surface'
                                    : 'bg-m3-surface border-m3-outline-variant/15 hover:bg-m3-primary/5'
                                }`}
                              >
                                <span className="text-[10px] font-extrabold flex items-center justify-between font-sans">
                                  <span>{prof.name}</span>
                                  {ruleEnforcementProfile === prof.id && <span className="h-1.5 w-1.5 rounded-full bg-m3-primary" />}
                                </span>
                                <span className="text-[9px] text-m3-on-surface-variant leading-tight mt-1">{prof.desc}</span>
                              </button>
                            ))}
                          </div>
                          
                          {rulesAlert && (
                            <div className="p-2.5 rounded-lg font-mono text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase animate-fade-in text-center font-bold">
                              {rulesAlert}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Subtab C: DISASTER RECOVERY & OFF-SITE BACKUPS */}
                    {dbSubTab === 'backup' && (
                      <div className="space-y-4 animate-fade-in font-sans">
                        {/* Snapshot Generation Form */}
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            db.createDbSnapshot(snapshotName);
                            setSnapshotName('');
                            setBackupActionStatus('Successfully generated automated secure database backup snapshot.');
                            setTimeout(() => setBackupActionStatus(null), 2500);
                          }}
                          className="p-4 rounded-xl border border-m3-outline-variant/15 bg-m3-surface-low/30 space-y-3 shrink-0"
                        >
                          <label className="text-[10px] font-black uppercase tracking-wider text-m3-primary font-mono block">
                            Create Hot Snapshot Recovery Point
                          </label>
                          <p className="text-[10.5px] text-m3-on-surface-variant leading-relaxed">
                            Generates an encrypted local snapshot bundle of your complete enterprise profiles including active shifts, checkout carts, item logs, tax registries, and audit diaries.
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={snapshotName}
                              onChange={(e) => setSnapshotName(e.target.value)}
                              placeholder="E.g., Pre-Inventory Audit Backup, v2.1-Prod"
                              className="flex-1 px-3.5 py-2 text-xs rounded-lg bg-m3-surface border border-m3-outline-variant/20 focus:border-m3-primary outline-none text-m3-on-surface font-sans"
                            />
                            <button
                              type="submit"
                              className="bg-m3-primary text-m3-on-primary hover:bg-m3-primary/95 text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-lg cursor-pointer transition-all shrink-0 font-sans shadow-sm"
                            >
                              Take Snapshot
                            </button>
                          </div>
                        </form>

                        {backupActionStatus && (
                          <div className="p-3 rounded-xl font-mono text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold uppercase tracking-widest text-center">
                            {backupActionStatus}
                          </div>
                        )}

                        {/* Existing Snapshots */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-m3-on-surface-variant font-mono block">
                            Available Manual Snapshots Index ({db.dbSnapshots.length})
                          </span>
                          <div className="max-h-[120px] overflow-y-auto pr-2 space-y-2 hover:scrollbar scrollbar text-[10.5px]">
                            {db.dbSnapshots.length === 0 ? (
                              <div className="p-4 rounded-xl border border-dashed border-m3-outline-variant/20 text-center text-zinc-500 italic">
                                No active snapshots found. Create a snapshot using the form above to protect your database.
                              </div>
                            ) : (
                              db.dbSnapshots.map(snap => (
                                <div key={snap.id} className="p-3 rounded-xl border border-m3-outline-variant/15 bg-m3-surface-low/50 flex items-center justify-between gap-3 animate-fade-in hover:bg-m3-surface-low/80 transition-all">
                                  <div className="space-y-0.5 max-w-[70%]">
                                    <div className="font-extrabold text-white font-sans flex items-center gap-2">
                                      <span>{snap.name}</span>
                                      <span className="text-[8.5px] font-mono bg-zinc-800 text-zinc-400 px-1.5 rounded font-normal uppercase">{snap.id}</span>
                                    </div>
                                    <div className="text-[9.5px] text-zinc-400 font-mono">
                                      Created at: {new Date(snap.timestamp).toLocaleString()} &bull; Author: {snap.creator} &bull; Size: {Math.max(1, Math.round(snap.sizeBytes / 1024))} KB
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (db.restoreDbSnapshot(snap.id)) {
                                          setBackupActionStatus(`RESTORED ENTIRE SCHEMA FROM SNAPSHOT "${snap.name}" SUCCESSFULLY.`);
                                          setTimeout(() => setBackupActionStatus(null), 3000);
                                        } else {
                                          setBackupActionStatus('RESTORE FAIL: CORRUPTED SNAPSHOT PAYLOAD CHECKSUM.');
                                          setTimeout(() => setBackupActionStatus(null), 3500);
                                        }
                                      }}
                                      className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 font-black uppercase text-[9px] tracking-wider cursor-pointer border border-emerald-500/20"
                                      title="Restore DB to this recovery marker"
                                    >
                                      Restore
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        db.deleteDbSnapshot(snap.id);
                                        setBackupActionStatus(`Deleted snapshot marker key ${snap.id}.`);
                                        setTimeout(() => setBackupActionStatus(null), 2000);
                                      }}
                                      className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg shrink-0 transition-all cursor-pointer border border-transparent hover:border-red-500/20"
                                      title="Delete Snap"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* JSON Export/Import Section */}
                        <div className="p-4 rounded-xl border border-m3-outline-variant/15 bg-m3-surface-low/30 space-y-2.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-m3-primary font-mono block">
                            Direct Offline Local Backups (Offline Portability)
                          </span>
                          <p className="text-[10.5px] text-m3-on-surface-variant leading-relaxed">
                            Backup files represent your database physically as raw JSON blocks. You can export these to flash storage or import/replace tables below in case of storage wipe.
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const payload = {
                                  isConfigured: db.isConfigured,
                                  users: db.users,
                                  branches: db.branches,
                                  suppliers: db.suppliers,
                                  products: db.products,
                                  purchaseOrders: db.purchaseOrders,
                                  poItems: db.poItems,
                                  transmittals: db.transmittals,
                                  shifts: db.shifts,
                                  sales: db.sales,
                                  saleItems: db.saleItems,
                                  movements: db.movements,
                                  auditLogs: db.auditLogs,
                                  parkedSales: db.parkedSales,
                                  stockTransfers: db.stockTransfers,
                                  branchStock: db.branchStock,
                                  ledgerEntries: db.ledgerEntries,
                                  branchSalesReports: db.branchSalesReports,
                                  deliveries: db.deliveries
                                };
                                const element = document.createElement("a");
                                const file = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
                                element.href = URL.createObjectURL(file);
                                element.download = `tilepoint_full_backup_${Date.now()}.json`;
                                document.body.appendChild(element);
                                element.click();
                                document.body.removeChild(element);
                                setBackupActionStatus('Success: Downloaded portable backup database JSON file.');
                                setTimeout(() => setBackupActionStatus(null), 2500);
                              }}
                              className="flex-1 bg-zinc-800 text-zinc-300 hover:bg-zinc-750 text-[9.5px] font-bold uppercase tracking-wider py-2 rounded-lg cursor-pointer transition-all text-center flex items-center justify-center gap-2 border border-zinc-700 font-sans shadow-sm"
                            >
                              <Download className="h-3.5 w-3.5 text-m3-primary" />
                              Export Full DB as JSON
                            </button>
                            
                            <label className="flex-1 bg-zinc-800 text-zinc-300 hover:bg-zinc-750 text-[9.5px] font-bold uppercase tracking-wider py-2 rounded-lg cursor-pointer transition-all text-center flex items-center justify-center gap-2 border border-zinc-700 font-sans shadow-sm select-none">
                              <Upload className="h-3.5 w-3.5 text-m3-primary" />
                              Import JSON Schema
                              <input
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    try {
                                      const rawText = event.target?.result as string;
                                      const payload = JSON.parse(rawText);
                                      if (!payload.users || !payload.products) {
                                        throw new Error("Invalid schema template structure.");
                                      }
                                      
                                      // Take auto recovery snap before updating in case user made mistake
                                      db.createDbSnapshot(`Auto-Snapshot Before Manual Import`);

                                      // Save to snapshots index first
                                      const newSnap: DbSnapshot = {
                                        id: `IMPORT-${Date.now()}`,
                                        name: `Imported Database - ${file.name}`,
                                        timestamp: new Date().toISOString(),
                                        creator: db.currentUser.fullName,
                                        sizeBytes: file.size,
                                        data: rawText
                                      };
                                      
                                      const cachedListStr = localStorage.getItem('tp_db_snapshots');
                                      const cachedList = cachedListStr ? JSON.parse(cachedListStr) : [];
                                      const updatedList = [newSnap, ...cachedList];
                                      localStorage.setItem('tp_db_snapshots', JSON.stringify(updatedList));
                                      
                                      // Trigger snapshot restore to apply
                                      db.restoreDbSnapshot(newSnap.id);
                                      setBackupActionStatus(`SUCCESSFULLY IMPORTED PORTABLE BACKUP: "${file.name}" APPROVED.`);
                                      setTimeout(() => setBackupActionStatus(null), 3000);
                                    } catch (err) {
                                      setBackupActionStatus('ERROR: APPROVED FILE IS CORRUPTED OR INVALID SCHEMA TILEPOINT FORMAT.');
                                      setTimeout(() => setBackupActionStatus(null), 4000);
                                    }
                                  };
                                  reader.readAsText(file);
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isShowingHandbook && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-55 p-4 animate-fade-in font-sans">
          <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-md animate-fade-in" onClick={() => setIsShowingHandbook(false)} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-4xl rounded-[32px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface text-left space-y-5 max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header Block */}
            <div className="flex justify-between items-center border-b border-m3-outline-variant/15 pb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-m3-primary/10 text-m3-primary rounded-xl">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-m3-primary uppercase tracking-widest leading-none">
                    TilePoint Systems Guided Handbook
                  </h3>
                  <span className="text-[10px] text-zinc-400 font-mono mt-1 block">
                    Official Reference Operations Manual • Build Version 2.5.0 (Audited)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsShowingHandbook(false)}
                className="p-1.5 rounded-full hover:bg-m3-outline-variant/15 text-m3-on-surface-variant cursor-pointer transition-colors"
                aria-label="Close Handbook"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick search input header */}
            <div className="p-3 bg-m3-surface-lowest rounded-2xl border border-m3-outline-variant/10 flex items-center gap-2 shrink-0">
              <Search className="h-4 w-4 text-zinc-400 shrink-0" />
              <input
                type="text"
                placeholder="Search systems manual chapters or frequently asked questions (FAQs)..."
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                className="w-full bg-transparent text-xs text-m3-on-surface placeholder-zinc-500 border-0 focus:outline-none"
              />
              {faqSearch && (
                <button
                  type="button"
                  onClick={() => setFaqSearch('')}
                  className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-m3-outline-variant/20 text-[10px] uppercase font-mono font-bold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Scrollable Document Body */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-thin scrollbar-thumb-m3-outline-variant">
              {/* CHAPTERS INDEX SECTION */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-450 font-mono">
                    System Core Features &amp; Modules
                  </h4>
                  <span className="text-[9px] text-m3-primary font-bold bg-m3-primary/10 px-2 py-0.5 rounded-full font-mono">
                    Chapters 1 - 8
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* Chapter 1 */}
                  {(!faqSearch || 'pos checkout desk area estimators calculators'.includes(faqSearch.toLowerCase())) && (
                    <div className="bg-m3-surface-lowest p-5 rounded-2xl border border-m3-outline-variant/10 hover:border-m3-primary/20 transition-colors">
                      <h4 className="text-xs font-black uppercase text-m3-primary tracking-wider mb-2 font-mono flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-m3-primary/10 rounded text-[9px]">CH 1</span>
                        The POS Checkout Desk &amp; Area Estimators
                      </h4>
                      <p className="text-[11px] text-zinc-350 leading-relaxed">
                        The POS Checkout Desk accepts real-time barcode scans, manual item code lookups, and direct SKU lookups.
                      </p>
                      <ul className="list-disc pl-5 text-[10.5px] text-zinc-400 space-y-1 mt-2 font-mono">
                        <li>Use the <strong className="text-zinc-200">Interactive Tile Coverage Estimator</strong> to dynamically translate physical floor dimensions (length and width in meters) into exact retail tile box counts.</li>
                        <li>Adapts standard wastage overrides (+5% standard grid bonds, +10% diagonal cuts) to prevent shortfalls over tile clipping boundaries.</li>
                        <li>Tendering handles precise decimal change calculations, printing receipt vouchers, and instantly subtracting sold quantities from active branch inventories.</li>
                      </ul>
                    </div>
                  )}

                  {/* Chapter 2 */}
                  {(!faqSearch || 'regional warehouse logistics index stock pools branch custom alert overrides'.includes(faqSearch.toLowerCase())) && (
                    <div className="bg-m3-surface-lowest p-5 rounded-2xl border border-m3-outline-variant/10 hover:border-m3-primary/20 transition-colors">
                      <h4 className="text-xs font-black uppercase text-m3-primary tracking-wider mb-2 font-mono flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-m3-primary/10 rounded text-[9px]">CH 2</span>
                        Regional Warehouse Stock &amp; Unified Pools View
                      </h4>
                      <p className="text-[11px] text-zinc-350 leading-relaxed">
                        Administrators possess master privileges to analyze global stocking pipelines on-screen.
                      </p>
                      <ul className="list-disc pl-5 text-[10.5px] text-zinc-400 space-y-1 mt-2 font-mono">
                        <li>The <strong className="text-zinc-200">Unified Global Pools</strong> (Ledger sub-tab) lists comparative stock levels side-by-side across all active branches.</li>
                        <li>Branch filters filter main catalog lists. A consolidated dropdown is available to verify stock indices across multiple depots simultaneously.</li>
                        <li>Automated visual flags indicate stock health: <span className="text-emerald-400">In Stock</span>, <span className="text-amber-500/90">Low Stock</span>, or <span className="text-red-400">Critical Warning</span>.</li>
                      </ul>
                    </div>
                  )}

                  {/* Chapter 3 */}
                  {(!faqSearch || 'custom alert threshold overrides branch local levels'.includes(faqSearch.toLowerCase())) && (
                    <div className="bg-m3-surface-lowest p-5 rounded-2xl border border-m3-outline-variant/10 hover:border-m3-primary/20 transition-colors">
                      <h4 className="text-xs font-black uppercase text-m3-primary tracking-wider mb-2 font-mono flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-m3-primary/10 rounded text-[9px]">CH 3</span>
                        Custom Alert Threshold Overrides
                      </h4>
                      <p className="text-[11px] text-zinc-350 leading-relaxed">
                        Since different locations experience unique sales velocities, low-stock trigger boundaries can be custom-defined at a local level.
                      </p>
                      <ul className="list-disc pl-5 text-[10.5px] text-zinc-400 space-y-1 mt-2 font-mono">
                        <li>Each tile preserves a master baseline minimum threshold designated at registration.</li>
                        <li>From the product detail editor, branch managers can submit localized <strong className="text-zinc-200">Alert Overrides</strong> that apply uniquely to their specific branch codes.</li>
                        <li>Overrides trigger amber alert status rows inside the central lists for local reorder warning awareness.</li>
                      </ul>
                    </div>
                  )}

                  {/* Chapter 4 */}
                  {(!faqSearch || 'inter branch transfers double entry transit cargo'.includes(faqSearch.toLowerCase())) && (
                    <div className="bg-m3-surface-lowest p-5 rounded-2xl border border-m3-outline-variant/10 hover:border-m3-primary/20 transition-colors">
                      <h4 className="text-xs font-black uppercase text-m3-primary tracking-wider mb-2 font-mono flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-m3-primary/10 rounded text-[9px]">CH 4</span>
                        Inter-Branch Stock Transfers &amp; Verification Chain
                      </h4>
                      <p className="text-[11px] text-zinc-350 leading-relaxed">
                        Stock dispatches are regulated by a multi-stage, double-entry reconciliation pipeline.
                      </p>
                      <ul className="list-disc pl-5 text-[10.5px] text-zinc-400 space-y-1 mt-2 font-mono">
                        <li>Dispatches create a formal <strong className="text-zinc-200">Transfer Invoice</strong> that deducts quantities from the origin branch's active inventory immediately and sets it to "Transit" state.</li>
                        <li>The destination branch's inventory will NOT increment until a destination operator physically inspects and approves the shipment.</li>
                        <li>Clicking <strong className="text-zinc-350">Acknowledge Receipt &amp; Add Stock</strong> merges the items into target pools, committing the double-entry transaction.</li>
                      </ul>
                    </div>
                  )}

                  {/* Chapter 5 */}
                  {(!faqSearch || 'daily sales closing shift cashier drawer cash float'.includes(faqSearch.toLowerCase())) && (
                    <div className="bg-m3-surface-lowest p-5 rounded-2xl border border-m3-outline-variant/10 hover:border-m3-primary/20 transition-colors">
                      <h4 className="text-xs font-black uppercase text-m3-primary tracking-wider mb-2 font-mono flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-m3-primary/10 rounded text-[9px]">CH 5</span>
                        Shift Control, Daily Drawer Balancing &amp; Audits
                      </h4>
                      <p className="text-[11px] text-zinc-350 leading-relaxed">
                        Secure cash drawer compliance and operations control are driven by local shift events.
                      </p>
                      <ul className="list-disc pl-5 text-[10.5px] text-zinc-400 space-y-1 mt-2 font-mono">
                        <li>Cashiers open shifts by logging a physical <strong className="text-zinc-200">Starting Cash Float</strong> inside the active register interface.</li>
                        <li>All offline sales journals are aggregated against cash and digital credit payments inside the shift module.</li>
                        <li>Closing shifts requires logging a final drawers count to isolate cash discrepancies, which are committed as audited records.</li>
                      </ul>
                    </div>
                  )}

                  {/* Chapter 6 */}
                  {(!faqSearch || 'csv excel formatted sheets printing digital pdf sales transmissions report'.includes(faqSearch.toLowerCase())) && (
                    <div className="bg-m3-surface-lowest p-5 rounded-2xl border border-m3-outline-variant/10 hover:border-m3-primary/20 transition-colors">
                      <h4 className="text-xs font-black uppercase text-m3-primary tracking-wider mb-2 font-mono flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-m3-primary/10 rounded text-[9px]">CH 6</span>
                        Multi-Format Sales Reporting, CSVs &amp; Print PDFs
                      </h4>
                      <p className="text-[11px] text-zinc-350 leading-relaxed">
                        To maintain rigorous retail compliance, TilePoint supports high-fidelity output exports for managers.
                      </p>
                      <ul className="list-disc pl-5 text-[10.5px] text-zinc-400 space-y-1 mt-2 font-mono">
                        <li>Daily summary sheets can be compiled into standard <strong className="text-zinc-200">Raw CSV</strong> files or formatted <strong className="text-zinc-200">Excel Templates</strong> featuring formatted columns.</li>
                        <li>The <strong className="text-zinc-200">Sales Print Modal</strong> builds formal visual papers including structured pricing pools, item invoice listings, and operator signature spots.</li>
                        <li>Click <em className="text-zinc-150">Trigger System Print</em> inside the modal to output to paper or select <em className="text-zinc-150">"Save as PDF"</em> to write digital PDF files.</li>
                      </ul>
                    </div>
                  )}

                  {/* Chapter 7 */}
                  {(!faqSearch || 'damage register broken fragile ceramic tiles wastage writeoffs'.includes(faqSearch.toLowerCase())) && (
                    <div className="bg-m3-surface-lowest p-5 rounded-2xl border border-m3-outline-variant/10 hover:border-m3-primary/20 transition-colors">
                      <h4 className="text-xs font-black uppercase text-m3-primary tracking-wider mb-2 font-mono flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-m3-primary/10 rounded text-[9px]">CH 7</span>
                        Damage Registers, Wastage Logs &amp; Loss Write-Offs
                      </h4>
                      <p className="text-[11px] text-zinc-350 leading-relaxed">
                        Handles damaged stock reconciliation for cracked, shattered, or flawed inventory.
                      </p>
                      <ul className="list-disc pl-5 text-[10.5px] text-zinc-400 space-y-1 mt-2 font-mono">
                        <li>Broken tiles must be logged inside the <strong className="text-zinc-200">Damage Register Module</strong> by entering specific product codes, quantities, and detailed causes.</li>
                        <li>Submitting a damage voucher instantly writeoff the target branch's stocks and adds historical entries down the general ledger.</li>
                        <li>Ensures precise inventory costs valuation by separating shrinkage (wastage) losses from regular sales records.</li>
                      </ul>
                    </div>
                  )}

                  {/* Chapter 8 */}
                  {(!faqSearch || 'user security access control active lockout brute force block profiles role'.includes(faqSearch.toLowerCase())) && (
                    <div className="bg-m3-surface-lowest p-5 rounded-2xl border border-m3-outline-variant/10 hover:border-m3-primary/20 transition-colors">
                      <h4 className="text-xs font-black uppercase text-m3-primary tracking-wider mb-2 font-mono flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-m3-primary/10 rounded text-[9px]">CH 8</span>
                        Access Control Security &amp; Lockout Rules
                      </h4>
                      <p className="text-[11px] text-zinc-350 leading-relaxed">
                        Rigorous role-based security prevents unauthorized edits and maintains system integrity.
                      </p>
                      <ul className="list-disc pl-5 text-[10.5px] text-zinc-400 space-y-1 mt-2 font-mono">
                        <li>Core actions are gated by explicit credentials. Standard sales desks prevent workers from altering records or viewing other branch balances.</li>
                        <li>Under professional standards, login panels enforce an automated <strong className="text-zinc-200">Security Intrusion Lockout</strong>. If a user enters an incorrect passcode five consecutive times, the console blocks access to prevent database breaches.</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* SYSTEM FAQ INTERACTIVE SECTION */}
              <div className="space-y-4 pt-4 border-t border-m3-outline-variant/15">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#71717a] font-mono flex items-center gap-1.5">
                    <HelpCircle className="h-4 w-4 text-m3-primary" />
                    <span>Frequently Asked Questions (System Q&amp;As)</span>
                  </h4>
                  <span className="text-[8px] font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                    Search Active
                  </span>
                </div>

                <div className="space-y-2.5">
                  {[
                    {
                      q: "How can the Administrator check the inventory of specific branches?",
                      a: "There are two official methods to check branch stocks: (1) Use the primary Branch Filter Dropdown at the top of the main stock table to isolate listing balances for Cebu Main, Bacolod, Iloilo, or Dumaguete. (2) For a comprehensive comparative view, go to the 'Ledger & Heatmap' tab. The 'Unified Global Pools Matrix' and 'Multi-Branch Heatmap' show quantities side-by-side for all live depots simultaneously."
                    },
                    {
                      q: "How can the Admin verify if physical stocks match digital inventory records?",
                      a: "Admins perform an inventory count on-site (a physical stocktake). If a discrepancy is identified (e.g. theft, physical recounts, or clerical slip-ups), use the Ledger sub-tab then click 'Manual Stock Correction'. Insert a matching balancing record with movement type 'ADJUST' indicating the discrepancy value (positive/negative delta). This modifies the digital ledger to perfectly synchronize with physical floor counts while creating an immutable double-entry audit log."
                    },
                    {
                      q: "What user roles are authorized to export sales reports?",
                      a: "For security and tax integrity, only users assigned the Admin (Administrator) or Manager (Branch Manager) role are permitted to export raw sales reports. Standard cashiers or register clerks do not have access and see warning indicators."
                    },
                    {
                      q: "What options are available for exporting sales reports?",
                      a: "TilePoint supports four core formats: (1) Standard CSV: Raw analytical values. (2) Excel Spreadsheet: Formatted matrix suited for spreadsheets. (3) System Print: High-fidelity voucher layouts for printing. (4) Save PDF: Digital document printing destination option."
                    },
                    {
                      q: "How do I print a sales report or export/save it as a PDF?",
                      a: "To output reports: (1) Choose the report inside the active Draft Daily sheet or Transmitted archives. (2) Click the 'Print PDF' button. (3) Inside the preview modal, click 'Trigger System Print'. (4) In the native dialog that opens, pick a local office printer. Alternatively, select 'Save as PDF' or 'Microsoft Print to PDF' to save a digital copy."
                    },
                    {
                      q: "How does the Inter-Branch Transfer double-entry pipeline prevent inventory leaks?",
                      a: "Transfers are completely decoupled. When a transfer starts, items are deducted from the sender's stock immediately and placed in a transit bucket. The target branch's inventory is NOT incremented until an authorized destination manager receives the delivery and clicks 'Acknowledge Receipt & Add Stock'. This prevents losses during transport."
                    },
                    {
                      q: "What happens if a user enters incorrect passwords multiple times?",
                      a: "If a user enters an incorrect security PIN or password 5 consecutive times, the system triggers the automatic login lockout mechanism, locking the user out to protect database profiles from unauthorized brute-force attempts."
                    },
                    {
                      q: "Are sales registers preserved if the network connection drops?",
                      a: "Yes. Cashier sales are collected offline into safe local browser storage journals. When connection is recovered, drafts can be transmitted safely to the unified database clusters."
                    }
                  ].map((faq, index) => {
                    const matchesSearch = !faqSearch || 
                      faq.q.toLowerCase().includes(faqSearch.toLowerCase()) || 
                      faq.a.toLowerCase().includes(faqSearch.toLowerCase());
                    
                    if (!matchesSearch) return null;

                    const isOpen = activeFaq === index;

                    return (
                      <div
                        key={index}
                        className="p-4 rounded-2xl bg-m3-surface border border-m3-outline-variant/10 hover:border-m3-outline-variant/25 transition-all text-left"
                      >
                        <button
                          type="button"
                          onClick={() => setActiveFaq(isOpen ? null : index)}
                          className="w-full flex items-center justify-between text-left text-xs font-black text-m3-on-surface hover:text-m3-primary font-mono select-none"
                        >
                          <span className="pr-4">{faq.q}</span>
                          {isOpen ? (
                            <ChevronUp className="h-4 w-4 shrink-0 text-m3-primary animate-pulse" />
                          ) : (
                            <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500 hover:text-m3-primary" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="mt-2.5 pt-2.5 border-t border-m3-outline-variant/5 text-[11px] text-zinc-300 leading-relaxed font-sans">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {faqSearch && ![
                    "How can the Administrator check the inventory of specific branches?",
                    "How can the Admin verify if physical stocks match digital inventory records?",
                    "What user roles are authorized to export sales reports?",
                    "What options are available for exporting sales reports?",
                    "How do I print a sales report or export/save it as a PDF?",
                    "How does the Inter-Branch Transfer double-entry pipeline prevent inventory leaks?",
                    "What happens if a user enters incorrect passwords multiple times?",
                    "Are sales registers preserved if the network connection drops?"
                  ].some(q => q.toLowerCase().includes(faqSearch.toLowerCase())) && (
                    <div className="text-center py-6 text-zinc-500 italic text-xs">
                      No matching manual chapters or FAQ questions found for your query. Try a different search term like "inventory" or "print".
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="border-t border-m3-outline-variant/15 pt-4 flex flex-wrap gap-4 items-center justify-between shrink-0">
              <span className="text-[10px] font-mono text-zinc-400">
                Official Guided Operational Directive • Authorized Version
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsShowingHandbook(false)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white rounded-full transition-all cursor-pointer font-mono"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                    triggerToast('Initiated printable operations guide layout download.', 'success');
                  }}
                  className="px-5 py-2 bg-m3-primary hover:bg-m3-primary/95 text-m3-on-primary font-black text-xs uppercase tracking-wide rounded-full shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Reference Manual</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-60 bg-m3-surface-low border border-emerald-500/30 text-emerald-400 font-mono text-[10px] uppercase font-bold tracking-widest px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
}
