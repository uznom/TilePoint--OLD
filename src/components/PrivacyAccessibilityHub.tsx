/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  Terminal,
  Cpu,
  Github
} from 'lucide-react';

interface PrivacyAccessibilityHubProps {
  darkMode: boolean;
  hideFloatingButton?: boolean;
}

export function PrivacyAccessibilityHub({ darkMode, hideFloatingButton = false }: PrivacyAccessibilityHubProps) {
  // Hub open state
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'accessibility' | 'cookies' | 'privacy' | 'about'>('accessibility');

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
  
  const [highContrast, setHighContrast] = useState(() => {
    return localStorage.getItem('tilepoint-high-contrast') === 'true';
  });

  const [dyslexicFont, setDyslexicFont] = useState(() => {
    return localStorage.getItem('tilepoint-dyslexic-font') === 'true';
  });

  const [enhancedOutlines, setEnhancedOutlines] = useState(() => {
    return localStorage.getItem('tilepoint-enhanced-outlines') === 'true';
  });

  // Individual cookie preference categories for the fine-grained Cookie Consent tabs
  const [cookiePreferences, setCookiePreferences] = useState({
    necessary: true, // Permanent essential
    functional: true, // App State + theme saves
    analytical: false // Local audit logger traces
  });

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

    // 2. High Contrast
    if (highContrast) {
      root.classList.add('accessibility-high-contrast');
    } else {
      root.classList.remove('accessibility-high-contrast');
    }
    localStorage.setItem('tilepoint-high-contrast', String(highContrast));

    // 3. Dyslexic-Friendly fonts
    if (dyslexicFont) {
      root.classList.add('accessibility-dyslexic-font');
    } else {
      root.classList.remove('accessibility-dyslexic-font');
    }
    localStorage.setItem('tilepoint-dyslexic-font', String(dyslexicFont));

    // 4. Enhanced Focus Ring
    if (enhancedOutlines) {
      root.classList.add('accessibility-enhanced-outlines');
    } else {
      root.classList.remove('accessibility-enhanced-outlines');
    }
    localStorage.setItem('tilepoint-enhanced-outlines', String(enhancedOutlines));

  }, [textSize, highContrast, dyslexicFont, enhancedOutlines]);

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
    setHighContrast(false);
    setDyslexicFont(false);
    setEnhancedOutlines(false);
    setShowBanner(false);
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

                      {/* HIGH CONTRAST toggle */}
                      <button
                        type="button"
                        onClick={() => setHighContrast(!highContrast)}
                        className={`w-full p-4 rounded-xl border flex items-start gap-3.5 transition-all text-left cursor-pointer ${
                          highContrast
                            ? 'bg-m3-primary/15 border-m3-primary text-m3-on-surface'
                            : 'bg-m3-surface border-m3-outline-variant/15 hover:bg-m3-primary/5'
                        }`}
                      >
                        <div className={`p-2 rounded-lg shrink-0 ${highContrast ? 'bg-m3-primary text-m3-on-primary' : 'bg-m3-surface-container text-m3-on-surface-variant'}`}>
                          <Sliders className="h-4.5 w-4.5" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-[11.5px] font-extrabold flex items-center gap-1.5 font-sans">
                            <span>Extreme High Contrast colors</span>
                            {highContrast && <span className="h-1.5 w-1.5 rounded-full bg-m3-primary" />}
                          </div>
                          <p className="text-[10.5px] text-m3-on-surface-variant leading-relaxed">
                            Bypasses soft design hues for pure black contexts (or pure white), forcing maximum contrast markers on borders, headers, and fields.
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
                            className="h-4 w-4 bg-m3-surface border-m3-outline-variant rounded-mdaccent-m3-primary cursor-pointer shrink-0"
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

                    <div className="flex items-center justify-between pt-1 border-t border-m3-outline-variant/10 text-[9px] font-mono text-m3-on-surface-variant/70">
                      <span>POS Node Version 2.4.1</span>
                      <span className="text-emerald-500 font-bold">Node Status: Online & Secured</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
