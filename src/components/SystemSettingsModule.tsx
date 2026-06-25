/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Eye,
  Sparkles,
  Type,
  CaseSensitive,
  Layers,
  Keyboard,
  Check,
  RotateCcw,
  Settings,
  HelpCircle,
  ShieldAlert,
  Download,
  Clock,
  Lock,
  Shield
} from 'lucide-react';
import { useDb } from '../context/DbContext';
import { UserRole } from '../types/db';

interface SystemSettingsModuleProps {
  darkMode: boolean;
}

export const SystemSettingsModule: React.FC<SystemSettingsModuleProps> = ({ darkMode }) => {
  const { currentUser, updateCurrentUser } = useDb();
  const isAuthorized = currentUser && (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER);

  // Enterprise details states
  const [companyName, setCompanyName] = useState<string>(() => {
    return localStorage.getItem('tilepoint_company_name_v1') || 'Emman Tile Center';
  });
  const [currency, setCurrency] = useState<string>(() => {
    return localStorage.getItem('tilepoint_currency_v1') || '₱';
  });
  const [taxRate, setTaxRate] = useState<number>(() => {
    return Number(localStorage.getItem('tilepoint_tax_rate_v1') || '12');
  });
  const [managerPin, setManagerPin] = useState<string>('');

  useEffect(() => {
    if (currentUser?.managerPin) {
      setManagerPin(currentUser.managerPin);
    }
  }, [currentUser]);

  // Settings states loaded from localStorage
  const [textSize, setTextSize] = useState<'normal' | 'large' | 'xlarge'>(() => {
    return (localStorage.getItem('tilepoint-text-size') as 'normal' | 'large' | 'xlarge') || 'normal';
  });

  const [colorContrast, setColorContrast] = useState<'default' | 'medium' | 'high'>(() => {
    return (localStorage.getItem('tilepoint-color-contrast') as 'default' | 'medium' | 'high') || 'default';
  });

  const [maximizeTextContrast, setMaximizeTextContrast] = useState<boolean>(() => {
    return localStorage.getItem('tilepoint-maximize-text-contrast') === 'true';
  });

  const [dyslexicFont, setDyslexicFont] = useState<boolean>(() => {
    return localStorage.getItem('tilepoint-dyslexic-font') === 'true';
  });

  const [enhancedOutlines, setEnhancedOutlines] = useState<boolean>(() => {
    return localStorage.getItem('tilepoint-enhanced-outlines') === 'true';
  });

  const [disableAnimations, setDisableAnimations] = useState<boolean>(() => {
    return localStorage.getItem('tilepoint-disable-animations') === 'true';
  });

  const [disableBlurs, setDisableBlurs] = useState<boolean>(() => {
    return localStorage.getItem('tilepoint-disable-blurs') === 'true';
  });

  const [disableInstallPrompt, setDisableInstallPrompt] = useState<boolean>(() => {
    return localStorage.getItem('tilepoint-disable-install-prompt') === 'true';
  });

  const [disableIdleClock, setDisableIdleClock] = useState<boolean>(() => {
    return localStorage.getItem('tilepoint-disable-idle-clock') === 'true';
  });

  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state changes with document element & localStorage, then dispatch global theme update event
  const updateSetting = (key: string, value: string | boolean) => {
    if (!isAuthorized) return;
    const root = document.documentElement;
    const strVal = String(value);

    // Save to localStorage
    localStorage.setItem(key, strVal);

    // Synchronize DOM classes
    if (key === 'tilepoint-text-size') {
      setTextSize(value as any);
      root.classList.remove('accessibility-large-text', 'accessibility-xlarge-text');
      if (value === 'large') root.classList.add('accessibility-large-text');
      if (value === 'xlarge') root.classList.add('accessibility-xlarge-text');
    }

    if (key === 'tilepoint-color-contrast') {
      setColorContrast(value as any);
    }

    if (key === 'tilepoint-maximize-text-contrast') {
      setMaximizeTextContrast(value as boolean);
      if (value) {
        root.classList.add('accessibility-maximize-text-contrast');
      } else {
        root.classList.remove('accessibility-maximize-text-contrast');
      }
    }

    if (key === 'tilepoint-dyslexic-font') {
      setDyslexicFont(value as boolean);
      if (value) {
        root.classList.add('accessibility-dyslexic-font');
      } else {
        root.classList.remove('accessibility-dyslexic-font');
      }
    }

    if (key === 'tilepoint-enhanced-outlines') {
      setEnhancedOutlines(value as boolean);
      if (value) {
        root.classList.add('accessibility-enhanced-outlines');
      } else {
        root.classList.remove('accessibility-enhanced-outlines');
      }
    }

    if (key === 'tilepoint-disable-animations') {
      setDisableAnimations(value as boolean);
      if (value) {
        root.classList.add('accessibility-no-animation');
      } else {
        root.classList.remove('accessibility-no-animation');
      }
    }

    if (key === 'tilepoint-disable-blurs') {
      setDisableBlurs(value as boolean);
      if (value) {
        root.classList.add('accessibility-no-blur');
      } else {
        root.classList.remove('accessibility-no-blur');
      }
    }

    if (key === 'tilepoint-disable-install-prompt') {
      setDisableInstallPrompt(value as boolean);
    }

    if (key === 'tilepoint-disable-idle-clock') {
      setDisableIdleClock(value as boolean);
    }

    // Trigger theme update
    window.dispatchEvent(new Event('tilepoint-theme-updated'));

    // Visual toast feedback
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // Listen to external changes to stay in perfect sync
  useEffect(() => {
    const handleSync = () => {
      setTextSize((localStorage.getItem('tilepoint-text-size') as any) || 'normal');
      setColorContrast((localStorage.getItem('tilepoint-color-contrast') as any) || 'default');
      setMaximizeTextContrast(localStorage.getItem('tilepoint-maximize-text-contrast') === 'true');
      setDyslexicFont(localStorage.getItem('tilepoint-dyslexic-font') === 'true');
      setEnhancedOutlines(localStorage.getItem('tilepoint-enhanced-outlines') === 'true');
      setDisableAnimations(localStorage.getItem('tilepoint-disable-animations') === 'true');
      setDisableBlurs(localStorage.getItem('tilepoint-disable-blurs') === 'true');
      setDisableInstallPrompt(localStorage.getItem('tilepoint-disable-install-prompt') === 'true');
      setDisableIdleClock(localStorage.getItem('tilepoint-disable-idle-clock') === 'true');
    };

    window.addEventListener('tilepoint-theme-updated', handleSync);
    return () => window.removeEventListener('tilepoint-theme-updated', handleSync);
  }, []);

  const handleResetToDefaults = () => {
    if (!isAuthorized) return;
    localStorage.removeItem('tilepoint-text-size');
    localStorage.removeItem('tilepoint-color-contrast');
    localStorage.removeItem('tilepoint-maximize-text-contrast');
    localStorage.removeItem('tilepoint-dyslexic-font');
    localStorage.removeItem('tilepoint-enhanced-outlines');
    localStorage.removeItem('tilepoint-disable-animations');
    localStorage.removeItem('tilepoint-disable-blurs');
    localStorage.removeItem('tilepoint-disable-install-prompt');
    localStorage.removeItem('tilepoint-disable-idle-clock');

    // Clean DOM
    const root = document.documentElement;
    root.classList.remove(
      'accessibility-large-text',
      'accessibility-xlarge-text',
      'accessibility-maximize-text-contrast',
      'accessibility-dyslexic-font',
      'accessibility-enhanced-outlines',
      'accessibility-no-animation',
      'accessibility-no-blur'
    );

    // Reset local states
    setTextSize('normal');
    setColorContrast('default');
    setMaximizeTextContrast(false);
    setDyslexicFont(false);
    setEnhancedOutlines(false);
    setDisableAnimations(false);
    setDisableBlurs(false);
    setDisableInstallPrompt(false);
    setDisableIdleClock(false);

    // Global dispatch
    window.dispatchEvent(new Event('tilepoint-theme-updated'));

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" id="system-settings-module">
      {/* HEADER SECTION */}
      <div className="p-5 border-b border-m3-outline-variant/15 flex justify-between items-center bg-m3-surface-low shrink-0 rounded-t-[20px]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-m3-primary/10 text-m3-primary flex items-center justify-center border border-m3-primary/20 shrink-0">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase font-mono tracking-wider text-m3-primary">
              System Settings & Configuration
            </h3>
            <p className="text-[10px] text-m3-on-surface-variant font-medium mt-0.5 font-mono">
              MANAGE ACCESSIBILITY, GRAPHICS PERFORMANCE, AND VISUAL PREFERENCES
            </p>
          </div>
        </div>

        {isAuthorized ? (
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-m3-outline-variant/30 hover:bg-m3-primary/10 text-m3-on-surface-variant hover:text-m3-primary text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
            title="Reset to Factory Defaults"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Defaults</span>
          </button>
        ) : (
          <div className="flex items-center gap-1 text-[10px] uppercase font-black tracking-wider text-amber-500 bg-amber-550/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
            <Lock className="h-3.5 w-3.5" />
            <span>RBAC Protected</span>
          </div>
        )}
      </div>

      {/* SCROLLABLE SETTINGS CONTAINER */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* UNAUTHORIZED ROLE BLOCK */}
        {!isAuthorized && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/25 text-amber-500 rounded-xl flex items-start gap-3">
            <Shield className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black uppercase tracking-wider">Restricted View-Only Mode</p>
              <p className="text-[11px] text-zinc-300 leading-normal mt-0.5 font-sans">
                You do not possess the required administrator credentials to alter global system parameters. These features are read-only under role-based access control (RBAC).
              </p>
            </div>
          </div>
        )}

        {/* SUCCESS EVENT CHIP */}
        {saveSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 rounded-xl text-center text-xs font-bold font-mono uppercase tracking-wider animate-pulse">
            ✓ Preferences applied & propagated in real-time
          </div>
        )}

        {/* PERFORMANCE & ENGINE CONTROLS SECTION */}
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-black uppercase text-m3-primary tracking-wider font-mono">
              Visual & Performance Optimization
            </h4>
            <p className="text-[11px] text-m3-on-surface-variant mt-1 leading-relaxed">
              Adjust graphic properties and interface rendering speeds to customize system responsivity and improve hardware performance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* TURN OFF BLURS TOGGLE */}
            <button
              type="button"
              onClick={() => updateSetting('tilepoint-disable-blurs', !disableBlurs)}
              className={`p-4 rounded-2xl border flex items-start gap-4 transition-all text-left cursor-pointer group ${
                disableBlurs
                  ? 'bg-m3-primary/15 border-m3-primary text-m3-on-surface shadow-sm'
                  : 'bg-m3-surface-low border-m3-outline-variant/15 hover:bg-m3-primary/5 hover:border-m3-outline-variant/30'
              }`}
            >
              <div className={`p-2.5 rounded-xl shrink-0 transition-transform group-hover:scale-105 ${disableBlurs ? 'bg-m3-primary text-m3-on-primary' : 'bg-m3-surface-container text-m3-on-surface-variant'}`}>
                <Eye className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="text-[12px] font-black flex items-center gap-1.5 font-sans">
                  <span>Turn Off Backdrop & UI Blurs</span>
                  {disableBlurs && <span className="h-1.5 w-1.5 rounded-full bg-m3-primary" />}
                </div>
                <p className="text-[10.5px] text-m3-on-surface-variant leading-relaxed">
                  Removes frosted glass translucent backdrops and heavy gradient blur filters to improve visual clarity and rendering performance.
                </p>
              </div>
            </button>

            {/* REMOVE ANIMATIONS TOGGLE */}
            <button
              type="button"
              onClick={() => updateSetting('tilepoint-disable-animations', !disableAnimations)}
              className={`p-4 rounded-2xl border flex items-start gap-4 transition-all text-left cursor-pointer group ${
                disableAnimations
                  ? 'bg-m3-primary/15 border-m3-primary text-m3-on-surface shadow-sm'
                  : 'bg-m3-surface-low border-m3-outline-variant/15 hover:bg-m3-primary/5 hover:border-m3-outline-variant/30'
              }`}
            >
              <div className={`p-2.5 rounded-xl shrink-0 transition-transform group-hover:scale-105 ${disableAnimations ? 'bg-m3-primary text-m3-on-primary' : 'bg-m3-surface-container text-m3-on-surface-variant'}`}>
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="text-[12px] font-black flex items-center gap-1.5 font-sans">
                  <span>Remove Animations & Effects</span>
                  {disableAnimations && <span className="h-1.5 w-1.5 rounded-full bg-m3-primary" />}
                </div>
                <p className="text-[10.5px] text-m3-on-surface-variant leading-relaxed">
                  Bypasses interface slide-in motion, tab page fade effects, and interactive scaling physics for instant navigation.
                </p>
              </div>
            </button>

            {/* DISABLE PWA INSTALL PROMPT TOGGLE */}
            <button
              type="button"
              onClick={() => updateSetting('tilepoint-disable-install-prompt', !disableInstallPrompt)}
              className={`p-4 rounded-2xl border flex items-start gap-4 transition-all text-left cursor-pointer group ${
                disableInstallPrompt
                  ? 'bg-m3-primary/15 border-m3-primary text-m3-on-surface shadow-sm'
                  : 'bg-m3-surface-low border-m3-outline-variant/15 hover:bg-m3-primary/5 hover:border-m3-outline-variant/30'
              }`}
            >
              <div className={`p-2.5 rounded-xl shrink-0 transition-transform group-hover:scale-105 ${disableInstallPrompt ? 'bg-m3-primary text-m3-on-primary' : 'bg-m3-surface-container text-m3-on-surface-variant'}`}>
                <Download className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="text-[12px] font-black flex items-center gap-1.5 font-sans">
                  <span>Turn Off Install Prompt</span>
                  {disableInstallPrompt && <span className="h-1.5 w-1.5 rounded-full bg-m3-primary" />}
                </div>
                <p className="text-[10.5px] text-m3-on-surface-variant leading-relaxed">
                  Prevents the floating Progress Web App (PWA) installation alert banner from displaying on your screen.
                </p>
              </div>
            </button>

            {/* DISABLE IDLE CLOCK OVERLAY TOGGLE */}
            <button
              type="button"
              onClick={() => updateSetting('tilepoint-disable-idle-clock', !disableIdleClock)}
              className={`p-4 rounded-2xl border flex items-start gap-4 transition-all text-left cursor-pointer group ${
                disableIdleClock
                  ? 'bg-m3-primary/15 border-m3-primary text-m3-on-surface shadow-sm'
                  : 'bg-m3-surface-low border-m3-outline-variant/15 hover:bg-m3-primary/5 hover:border-m3-outline-variant/30'
              }`}
            >
              <div className={`p-2.5 rounded-xl shrink-0 transition-transform group-hover:scale-105 ${disableIdleClock ? 'bg-m3-primary text-m3-on-primary' : 'bg-m3-surface-container text-m3-on-surface-variant'}`}>
                <Clock className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="text-[12px] font-black flex items-center gap-1.5 font-sans">
                  <span>Turn Off Idle Clock Overlay</span>
                  {disableIdleClock && <span className="h-1.5 w-1.5 rounded-full bg-m3-primary" />}
                </div>
                <p className="text-[10.5px] text-m3-on-surface-variant leading-relaxed">
                  Disables the full-screen dynamic screensaver overlay that activates during periods of checkout and interface inactivity.
                </p>
              </div>
            </button>
          </div>
        </div>

        <div className="h-px bg-m3-outline-variant/15" />

        {/* ACCESSIBILITY & TEXT PREFERENCES SECTION */}
        <div className="space-y-5">
          <div>
            <h4 className="text-xs font-black uppercase text-m3-primary tracking-wider font-mono">
              Accessibility & Typography preferences
            </h4>
            <p className="text-[11px] text-m3-on-surface-variant mt-1 leading-relaxed">
              Configure system-wide text sizing, high-visibility contrast layers, and assistive typography layouts.
            </p>
          </div>

          {/* FONT SCALING REGION */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-m3-on-surface-variant font-mono block">
              Font Size Multiplier Scale
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'normal', name: 'Normal (1.0x)', desc: 'Standard readable UI size' },
                { id: 'large', name: 'Large (1.12x)', desc: 'Enlarged body text scale' },
                { id: 'xlarge', name: 'Extra Large (1.24x)', desc: 'Maximum text visibility' }
              ].map((sz) => (
                <button
                  key={sz.id}
                  type="button"
                  onClick={() => updateSetting('tilepoint-text-size', sz.id)}
                  className={`p-3.5 rounded-xl border flex flex-col justify-center items-center gap-1.5 transition-all cursor-pointer text-center ${
                    textSize === sz.id
                      ? 'bg-m3-primary/10 border-m3-primary text-m3-primary shadow-xs'
                      : 'bg-m3-surface border-m3-outline-variant/20 hover:bg-m3-primary/5 text-m3-on-surface-variant'
                  }`}
                >
                  <Type className="h-4.5 w-4.5" />
                  <span className="text-[11px] font-black font-sans">{sz.name}</span>
                  <span className="text-[9.5px] opacity-75 font-mono">{sz.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* COLOR CONTRAST SELECTION */}
          <div className="space-y-2.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-m3-on-surface-variant font-mono block">
              System Color Contrast Config
            </label>
            <div className="w-full p-4 rounded-xl border border-m3-outline-variant/15 bg-m3-surface-low space-y-3">
              <p className="text-[11px] text-m3-on-surface-variant leading-relaxed">
                Choose a dynamic color weighting scheme to improve visual differentiation across system containers, text assets, and borders.
              </p>
              <div className="grid grid-cols-3 gap-2 p-1.5 rounded-xl bg-m3-surface-container">
                {(['default', 'medium', 'high'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => updateSetting('tilepoint-color-contrast', level)}
                    className={`py-2 px-3 rounded-lg text-[11px] font-black capitalize transition-all cursor-pointer text-center ${
                      colorContrast === level
                        ? 'bg-m3-primary text-m3-on-primary shadow-sm scale-[1.01]'
                        : 'text-m3-on-surface-variant hover:bg-m3-on-surface/5'
                    }`}
                  >
                    {level} Contrast
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* DYSLEXIC FRIENDLY toggle */}
            <button
              type="button"
              onClick={() => updateSetting('tilepoint-dyslexic-font', !dyslexicFont)}
              className={`p-4 rounded-xl border flex items-start gap-4 transition-all text-left cursor-pointer group ${
                dyslexicFont
                  ? 'bg-m3-primary/15 border-m3-primary text-m3-on-surface'
                  : 'bg-m3-surface-low border-m3-outline-variant/15 hover:bg-m3-primary/5'
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 ${dyslexicFont ? 'bg-m3-primary text-m3-on-primary' : 'bg-m3-surface-container text-m3-on-surface-variant'}`}>
                <CaseSensitive className="h-4.5 w-4.5" />
              </div>
              <div className="space-y-1">
                <div className="text-[12px] font-black flex items-center gap-1.5 font-sans">
                  <span>Dyslexic-Friendly Typography</span>
                  {dyslexicFont && <span className="h-1.5 w-1.5 rounded-full bg-m3-primary" />}
                </div>
                <p className="text-[10.5px] text-m3-on-surface-variant leading-relaxed">
                  Applies Comic Neue & slab spacing alignments globally, optimizing font tracking, line height, and stroke curves for dyslexic readability.
                </p>
              </div>
            </button>

            {/* MAXIMIZE TEXT CONTRAST Toggle */}
            <button
              type="button"
              onClick={() => updateSetting('tilepoint-maximize-text-contrast', !maximizeTextContrast)}
              className={`p-4 rounded-xl border flex items-start gap-4 transition-all text-left cursor-pointer group ${
                maximizeTextContrast
                  ? 'bg-m3-primary/15 border-m3-primary text-m3-on-surface'
                  : 'bg-m3-surface-low border-m3-outline-variant/15 hover:bg-m3-primary/5'
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 ${maximizeTextContrast ? 'bg-m3-primary text-m3-on-primary' : 'bg-m3-surface-container text-m3-on-surface-variant'}`}>
                <Layers className="h-4.5 w-4.5" />
              </div>
              <div className="space-y-1">
                <div className="text-[12px] font-black flex items-center gap-1.5 font-sans">
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
              onClick={() => updateSetting('tilepoint-enhanced-outlines', !enhancedOutlines)}
              className={`p-4 rounded-xl border flex items-start gap-4 transition-all text-left cursor-pointer group md:col-span-2 ${
                enhancedOutlines
                  ? 'bg-m3-primary/15 border-m3-primary text-m3-on-surface'
                  : 'bg-m3-surface-low border-m3-outline-variant/15 hover:bg-m3-primary/5'
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 ${enhancedOutlines ? 'bg-m3-primary text-m3-on-primary' : 'bg-m3-surface-container text-m3-on-surface-variant'}`}>
                <Keyboard className="h-4.5 w-4.5" />
              </div>
              <div className="space-y-1">
                <div className="text-[12px] font-black flex items-center gap-1.5 font-sans">
                  <span>Highlight Keyboard Focus Outlines</span>
                  {enhancedOutlines && <span className="h-1.5 w-1.5 rounded-full bg-m3-primary" />}
                </div>
                <p className="text-[10.5px] text-m3-on-surface-variant leading-relaxed">
                  Forces thick orange safety outlines around focused checkout inputs and catalog layout buttons when navigating via the TAB key.
                </p>
              </div>
            </button>
          </div>
        </div>

        {currentUser?.role === UserRole.ADMIN && (
          <>
            <div className="h-px bg-m3-outline-variant/15" />

            {/* ENTERPRISE PROFILE & COMPLIANCE RULES */}
            <div className="space-y-5">
              <div>
                <h4 className="text-xs font-black uppercase text-m3-primary tracking-wider font-mono">
                  Enterprise Profile & Business Rules
                </h4>
                <p className="text-[11px] text-m3-on-surface-variant mt-1 leading-relaxed font-sans">
                  Configure showroom brand headers, VAT rates, currency standards, and security manager PINs.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Enterprise Name */}
                <div className="flex flex-col gap-1.5 bg-m3-surface-low border border-m3-outline-variant/15 p-4 rounded-xl text-left">
                  <label className="text-[10px] font-black uppercase tracking-wider text-m3-on-surface-variant font-mono">
                    Enterprise Name Prefix
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    disabled={!isAuthorized}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCompanyName(val);
                      localStorage.setItem('tilepoint_company_name_v1', val);
                      window.dispatchEvent(new Event('tilepoint-theme-updated'));
                    }}
                    className="bg-m3-surface-container border border-m3-outline-variant/35 rounded-xl text-xs font-bold p-2.5 w-full text-m3-on-surface outline-none focus:border-m3-primary disabled:opacity-65 font-sans"
                  />
                </div>

                {/* Tax Rate */}
                <div className="flex flex-col gap-1.5 bg-m3-surface-low border border-m3-outline-variant/15 p-4 rounded-xl text-left">
                  <label className="text-[10px] font-black uppercase tracking-wider text-m3-on-surface-variant font-mono">
                    Standard VAT Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    value={taxRate}
                    disabled={!isAuthorized}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value));
                      setTaxRate(val);
                      localStorage.setItem('tilepoint_tax_rate_v1', String(val));
                      window.dispatchEvent(new Event('tilepoint-theme-updated'));
                    }}
                    className="bg-m3-surface-container border border-m3-outline-variant/35 rounded-xl text-xs font-bold p-2.5 w-full text-m3-on-surface outline-none focus:border-m3-primary disabled:opacity-65 font-sans"
                  />
                </div>

                {/* Currency Symbol */}
                <div className="flex flex-col gap-1.5 bg-m3-surface-low border border-m3-outline-variant/15 p-4 rounded-xl text-left">
                  <label className="text-[10px] font-black uppercase tracking-wider text-m3-on-surface-variant font-mono">
                    Base Currency Symbol
                  </label>
                  <select
                    value={currency}
                    disabled={!isAuthorized}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCurrency(val);
                      localStorage.setItem('tilepoint_currency_v1', val);
                      window.dispatchEvent(new Event('tilepoint-theme-updated'));
                    }}
                    className="bg-m3-surface-container border border-m3-outline-variant/35 rounded-xl text-xs font-bold p-2.5 w-full text-m3-on-surface outline-none focus:border-m3-primary disabled:opacity-65 font-sans"
                  >
                    <option value="₱">₱ PHP Peso Sign</option>
                    <option value="$">$ USD Dollar Symbol</option>
                    <option value="€">€ EUR Euro Standard</option>
                    <option value="¥">¥ JPY Yen Accent</option>
                  </select>
                </div>

                {/* Manager PIN */}
                <div className="flex flex-col gap-1.5 bg-m3-surface-low border border-m3-outline-variant/15 p-4 rounded-xl text-left">
                  <label className="text-[10px] font-black uppercase tracking-wider text-m3-on-surface-variant font-mono">
                    Manager Safety Authorization PIN
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={managerPin}
                    disabled={!isAuthorized}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setManagerPin(val);
                      if (val.length === 4) {
                        updateCurrentUser({ managerPin: val });
                        setSaveSuccess(true);
                        setTimeout(() => setSaveSuccess(false), 2000);
                      }
                    }}
                    className="bg-m3-surface-container border border-m3-outline-variant/35 rounded-xl text-xs font-bold p-2.5 w-full text-center font-mono tracking-widest text-m3-on-surface outline-none focus:border-m3-primary disabled:opacity-65"
                  />
                </div>
              </div>
            </div>
          </>
        )}

      </div>

      {/* FOOTER METRICS AREA */}
      <div className="p-4 bg-m3-surface-low border-t border-m3-outline-variant/15 text-center shrink-0 flex justify-between items-center px-6">
        <div className="flex items-center gap-1 text-[9px] text-m3-on-surface-variant font-mono uppercase font-black">
          <HelpCircle className="h-3 w-3" />
          <span>Real-time layout sync enabled</span>
        </div>
        <div className="flex items-center gap-1 text-[9px] text-m3-on-surface-variant font-mono uppercase font-black">
          <ShieldAlert className="h-3 w-3 text-amber-500" />
          <span>No personal telemetry transmitted</span>
        </div>
      </div>
    </div>
  );
};
