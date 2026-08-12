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
 RotateCcw,
 Settings,
 ShieldAlert,
 Download,
 Clock,
 Lock,
 Shield,
 Moon,
 Sun,
} from 'lucide-react';
import { useDb } from '../context/DbContext';
import { UserRole } from '../types/db';
import { HoldToConfirmButton } from './HoldToConfirmButton';

interface SystemSettingsModuleProps {
 darkMode: boolean;
 setDarkMode?: (dark: boolean) => void;
 followSystemTheme?: boolean;
 setFollowSystemTheme?: (follow: boolean) => void;
}

interface SettingToggleCardProps {
 icon: React.ElementType;
 title: string;
 subtitle?: string;
 active: boolean;
 onClick: () => void;
 activeLabel?: string;
 inactiveLabel?: string;
 disabled?: boolean;
}

const SettingToggleCard: React.FC<SettingToggleCardProps> = ({
 icon: Icon,
 title,
 subtitle,
 active,
 onClick,
 activeLabel = 'ACTIVE',
 inactiveLabel = 'DISABLED',
 disabled = false,
}) => (
 <button
  type="button"
  disabled={disabled}
  onClick={onClick}
  className={`p-4 rounded-2xl border flex items-center justify-between gap-3 transition-all text-left cursor-pointer group ${
   disabled ? 'opacity-50 cursor-not-allowed ' : ''
  }${
   active
    ? 'bg-m3-primary/10 border-m3-primary/50 text-m3-on-surface shadow-xs'
    : 'bg-m3-surface-low border-m3-outline-variant/15 hover:bg-m3-primary/5 hover:border-m3-outline-variant/30'
  }`}
 >
  <div className="flex items-center gap-3.5 min-w-0">
   <div
    className={`p-2.5 rounded-xl shrink-0 transition-transform group-hover:scale-105 ${
     active
      ? 'bg-m3-primary text-m3-on-primary shadow-sm'
      : 'bg-m3-surface-container text-m3-on-surface-variant'
    }`}
   >
    <Icon className="h-5 w-5" />
   </div>
   <div className="flex flex-col min-w-0">
    <span className="text-xs font-black text-m3-on-surface font-sans truncate">
     {title}
    </span>
    {subtitle && (
     <span className="text-[10px] text-m3-on-surface-variant/70 font-mono font-medium truncate mt-0.5">
      {subtitle}
     </span>
    )}
   </div>
  </div>

  <div className="flex items-center gap-2 shrink-0">
   <span
    className={`text-[9px] font-black uppercase font-mono px-2 py-0.5 rounded-md tracking-wider ${
     active
      ? 'bg-m3-primary/20 text-m3-primary border border-m3-primary/30'
      : 'bg-m3-surface-container text-m3-on-surface-variant/60 border border-transparent'
    }`}
   >
    {active ? activeLabel : inactiveLabel}
   </span>
   <div
    className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
     active ? 'bg-m3-primary' : 'bg-m3-outline-variant/40'
    }`}
   >
    <div
     className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
      active ? 'translate-x-4.5' : 'translate-x-0'
     }`}
    />
   </div>
  </div>
 </button>
);

export const SystemSettingsModule: React.FC<SystemSettingsModuleProps> = ({
 darkMode,
 setDarkMode,
 followSystemTheme = false,
 setFollowSystemTheme
}) => {
 const { currentUser, updateCurrentUser, truncateDatabase, isRowClearingBlocked, getRowClearingBlockedReason, forceCloseAllShifts } = useDb();
 const isAuthorized = currentUser && (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER);
 const [forceUnlockReset, setForceUnlockReset] = useState(false);

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
 const [logoSize, setLogoSize] = useState<number>(() => {
 return Number(localStorage.getItem('tilepoint_receipt_logo_size_v1') || '40');
 });
 const [managerPin, setManagerPin] = useState<string>('');
 const [resetConfirmation, setResetConfirmation] = useState<string>('');

 useEffect(() => {
 if (currentUser?.managerPin) {
 setManagerPin(currentUser.managerPin);
 }
 }, [currentUser]);

 // Settings states loaded from localStorage
 const [textSize, setTextSize] = useState<'small' | 'normal' | 'large' | 'xlarge'>(() => {
 return (localStorage.getItem('tilepoint-text-size') as any) || 'normal';
 });

 const [colorContrast, setColorContrast] = useState<'small' | 'default' | 'medium' | 'high'>(() => {
 const val = localStorage.getItem('tilepoint-color-contrast');
 if (val === 'small' || val === 'default') return 'small';
 return (val as any) || 'medium';
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
 // Client-side visual, performance, and accessibility settings are customizable by any logged-in user
 const clientSettings = [
 'tilepoint-text-size',
 'tilepoint-color-contrast',
 'tilepoint-maximize-text-contrast',
 'tilepoint-dyslexic-font',
 'tilepoint-enhanced-outlines',
 'tilepoint-disable-animations',
 'tilepoint-disable-blurs',
 'tilepoint-disable-install-prompt',
 'tilepoint-disable-idle-clock'
 ];
 if (!isAuthorized && !clientSettings.includes(key)) return;
 const root = document.documentElement;
 const strVal = String(value);

 // Save to localStorage
 localStorage.setItem(key, strVal);

 // Synchronize DOM classes
 if (key === 'tilepoint-text-size') {
 setTextSize(value as any);
 root.classList.remove('accessibility-small-text', 'accessibility-large-text', 'accessibility-xlarge-text');
 if (value === 'small') root.classList.add('accessibility-small-text');
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
 setColorContrast((localStorage.getItem('tilepoint-color-contrast') as any) || 'medium');
 setMaximizeTextContrast(localStorage.getItem('tilepoint-maximize-text-contrast') === 'true');
 setDyslexicFont(localStorage.getItem('tilepoint-dyslexic-font') === 'true');
 setEnhancedOutlines(localStorage.getItem('tilepoint-enhanced-outlines') === 'true');
 setDisableAnimations(localStorage.getItem('tilepoint-disable-animations') === 'true');
 setDisableBlurs(localStorage.getItem('tilepoint-disable-blurs') === 'true');
 setDisableInstallPrompt(localStorage.getItem('tilepoint-disable-install-prompt') === 'true');
 setDisableIdleClock(localStorage.getItem('tilepoint-disable-idle-clock') === 'true');
 setLogoSize(Number(localStorage.getItem('tilepoint_receipt_logo_size_v1') || '40'));
 };

 window.addEventListener('tilepoint-theme-updated', handleSync);
 return () => window.removeEventListener('tilepoint-theme-updated', handleSync);
 }, []);

 const handleResetToDefaults = () => {
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
 'accessibility-small-text',
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
 setColorContrast('medium');
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
 <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-m3-surface-low/80 border-x border-b border-m3-outline-variant/15 rounded-b-[20px] shadow-sm">
 
 {/* UNAUTHORIZED ROLE BLOCK */}
 {!isAuthorized && (
 <div className="p-4 bg-amber-500/10 border border-amber-500/25 text-amber-500 rounded-xl flex items-start gap-3">
 <Shield className="h-5 w-5 shrink-0 mt-0.5" />
 <div>
 <p className="text-xs font-black uppercase tracking-wider">Restricted View-Only Mode</p>
 <p className="text-xs text-m3-on-surface leading-normal mt-0.5 font-sans font-medium">
 You do not possess the required administrator credentials to alter global system parameters. These features are read-only under role-based access control (RBAC).
 </p>
 </div>
 </div>
 )}

 {/* SUCCESS EVENT CHIP */}
 {saveSuccess && (
 <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 rounded-xl text-center text-xs font-bold font-mono uppercase tracking-wider animate-pulse">
 Preferences applied & propagated in real-time
 </div>
 )}

 {/* PERFORMANCE & ENGINE CONTROLS SECTION */}
 <div className="space-y-4">
 <div>
 <h4 className="text-xs font-black uppercase text-m3-primary tracking-wider font-mono">
 Visual & Performance Optimization
 </h4>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* FOLLOW SYSTEM THEME TOGGLE */}
  {setFollowSystemTheme && (
   <SettingToggleCard
    icon={Sliders}
    title="Follow System Theme State"
    subtitle="Auto sync theme with host device preferences"
    active={followSystemTheme}
    onClick={() => {
     const newVal = !followSystemTheme;
     setFollowSystemTheme(newVal);
     if (newVal) {
      const isDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (setDarkMode) setDarkMode(isDark);
     }
     window.dispatchEvent(new Event('tilepoint-theme-updated'));
    }}
    activeLabel="SYNCED"
    inactiveLabel="OFF"
   />
  )}

  {/* MANUAL DARK MODE SELECTION */}
  {setDarkMode && (
   <SettingToggleCard
    icon={darkMode ? Moon : Sun}
    title="Workspace Dark Theme"
    subtitle="Dark high-contrast color scheme"
    active={darkMode && !followSystemTheme}
    onClick={() => {
     if (setFollowSystemTheme) setFollowSystemTheme(false);
     setDarkMode(!darkMode);
     window.dispatchEvent(new Event('tilepoint-theme-updated'));
    }}
    activeLabel="DARK"
    inactiveLabel="LIGHT"
   />
  )}

  {/* TURN OFF BLURS TOGGLE */}
  <SettingToggleCard
   icon={Eye}
   title="Turn Off UI Blurs & Glass"
   subtitle="Removes backdrop filters for maximum rendering speed"
   active={disableBlurs}
   onClick={() => updateSetting('tilepoint-disable-blurs', !disableBlurs)}
   activeLabel="OFF"
   inactiveLabel="ON"
  />

  {/* REMOVE ANIMATIONS TOGGLE */}
  <SettingToggleCard
   icon={Sparkles}
   title="Remove Animations & UI Motion"
   subtitle="Instant zero-delay state transitions"
   active={disableAnimations}
   onClick={() => updateSetting('tilepoint-disable-animations', !disableAnimations)}
   activeLabel="OFF"
   inactiveLabel="ON"
  />

  {/* DISABLE PWA INSTALL PROMPT TOGGLE */}
  <SettingToggleCard
   icon={Download}
   title="Turn Off PWA Install Banner"
   subtitle="Hides home screen app installation prompt"
   active={disableInstallPrompt}
   onClick={() => updateSetting('tilepoint-disable-install-prompt', !disableInstallPrompt)}
   activeLabel="HIDDEN"
   inactiveLabel="VISIBLE"
  />

  {/* DISABLE IDLE CLOCK OVERLAY TOGGLE */}
  <SettingToggleCard
   icon={Clock}
   title="Turn Off Idle Clock Screensaver"
   subtitle="Prevents idle timer screen lock overlay"
   active={disableIdleClock}
   onClick={() => updateSetting('tilepoint-disable-idle-clock', !disableIdleClock)}
   activeLabel="OFF"
   inactiveLabel="ON"
  />
 </div>
 </div>

 <div className="h-px bg-m3-outline-variant/15" />

 {/* ACCESSIBILITY & TEXT PREFERENCES SECTION */}
 <div className="space-y-5">
 <div>
 <h4 className="text-xs font-black uppercase text-m3-primary tracking-wider font-mono">
 Accessibility & Typography preferences
 </h4>
 </div>

 {/* FONT SCALING REGION */}
 <div className="space-y-2">
 <div className="flex justify-between items-center">
 <label className="text-[10px] font-black uppercase tracking-wider text-m3-on-surface-variant font-mono block">
 System UI Font Size Multiplier
 </label>
 <span className="text-[9px] font-mono text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
 System UI Only (Receipts Excluded)
 </span>
 </div>
 <div className="grid grid-cols-3 gap-3">
 {[
 { id: 'small', name: 'Small (0.88x)', desc: 'Compact dense text scale' },
 { id: 'normal', name: 'Normal (1.0x)', desc: 'Standard readable UI size' },
 { id: 'large', name: 'Large (1.12x)', desc: 'Enlarged body text scale' }
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

 {/* RECEIPT FONT SIZE ADJUSTER */}
 
 {/* COLOR CONTRAST SELECTION */}
 <div className="space-y-2.5">
 <label className="text-[10px] font-black uppercase tracking-wider text-m3-on-surface-variant font-mono block">
 System Color Contrast Config
 </label>
 <div className="w-full p-4 rounded-xl border border-m3-outline-variant/15 bg-m3-surface-low space-y-3">
 <div className="grid grid-cols-3 gap-2 p-1.5 rounded-xl bg-m3-surface-container">
 {(['small', 'medium', 'high'] as const).map((level) => (
 <button
 key={level}
 type="button"
 onClick={() => updateSetting('tilepoint-color-contrast', level)}
 className={`py-2 px-3 rounded-lg text-[11px] font-black capitalize transition-all cursor-pointer text-center ${
 (colorContrast === level || (level === 'small' && colorContrast === 'default'))
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
  <SettingToggleCard
   icon={CaseSensitive}
   title="Dyslexic-Friendly Typography"
   subtitle="Enhanced letter shapes for increased readability"
   active={dyslexicFont}
   onClick={() => updateSetting('tilepoint-dyslexic-font', !dyslexicFont)}
  />

  {/* MAXIMIZE CONTRAST toggle */}
  <SettingToggleCard
   icon={Layers}
   title="Maximize Text Contrast"
   subtitle="WCAG AAA compliance for extreme clarity"
   active={maximizeTextContrast}
   onClick={() => updateSetting('tilepoint-text-contrast', !maximizeTextContrast)}
  />

  {/* KEYBOARD OUTLINES toggle */}
  <SettingToggleCard
   icon={Keyboard}
   title="Highlight Focus Outlines"
   subtitle="High-visibility keyboard navigation focus rings"
   active={enhancedOutlines}
   onClick={() => updateSetting('tilepoint-enhanced-outlines', !enhancedOutlines)}
  />
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
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* Enterprise Name */}
 <div className="flex flex-col gap-1.5 bg-m3-surface-low border border-m3-outline-variant/15 p-4 rounded-xl text-left">
 <label className="text-[10px] font-black uppercase tracking-wider text-m3-on-surface-variant font-mono">
 Enterprise Name Prefix
 </label>
 <input
 type="text"
 value={companyName ?? ''}
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
 value={taxRate ?? ''}
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
 value={currency ?? ''}
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
 value={managerPin ?? ''}
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

 {/* Receipt Logo Height */}
 <div className="flex flex-col gap-1.5 bg-m3-surface-low border border-m3-outline-variant/15 p-4 rounded-xl text-left">
 <div className="flex justify-between items-center">
 <label className="text-[10px] font-black uppercase tracking-wider text-m3-on-surface-variant font-mono">
 Global Receipt Logo Height
 </label>
 <span className="text-[11px] font-mono font-black text-m3-primary bg-m3-primary/10 px-1.5 py-0.5 rounded">{logoSize}px</span>
 </div>
 <div className="flex items-center gap-2 mt-2">
 <span className="text-[9px] text-zinc-500 font-mono">20px</span>
 <input
 type="range"
 min="20"
 max="120"
 value={logoSize ?? ''}
 disabled={!isAuthorized}
 onChange={(e) => {
 const val = Number(e.target.value);
 setLogoSize(val);
 localStorage.setItem('tilepoint_receipt_logo_size_v1', String(val));
 window.dispatchEvent(new Event('tilepoint-theme-updated'));
 setSaveSuccess(true);
 setTimeout(() => setSaveSuccess(false), 2000);
 }}
 className="flex-1 accent-m3-primary h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
 />
 <span className="text-[9px] text-zinc-500 font-mono">120px</span>
 </div>
 <p className="text-[8.5px] text-m3-on-surface-variant/70 leading-normal font-sans">
 System-wide default height in pixels for logos displayed on printed receipt acknowledgement slips.
 </p>
 </div>
 </div>

 {/* SYSTEM RESET & PURGE SECTION */}
 <div className="h-px bg-m3-outline-variant/15 my-6" />
 <div className="space-y-5">
 <div>
 <h4 className="text-xs font-black uppercase text-rose-500 tracking-wider font-mono flex items-center gap-2">
 <ShieldAlert className="h-4 w-4" /> System Reset & Factory operations Center
 </h4>
 <p className="text-[11px] text-m3-on-surface-variant mt-1 leading-relaxed">
 Permanently clear transactions, wipe inventory counts, or perform full database schema truncation. 
 <span className="text-rose-400 font-extrabold ml-1">Warning: These operations are destructive and cannot be undone.</span>
 </p>
 
 {/* Historical retention warning banner */}
 <div className="mt-3 mb-4 p-3 rounded-xl border border-amber-500/15 bg-amber-500/5 text-[10px] text-zinc-300 leading-normal font-sans">
 <strong className="text-amber-400 uppercase tracking-wider block mb-0.5">️ Historical Audit Notice (Retention Safeguard)</strong>
 To preserve last year's records and historical tax logs for compliance, managers and administrators are required to save a device snapshot in their user-defined directory folder (configured in the <span className="font-extrabold text-amber-500">Database & Backups</span> settings panel) before launching any system reset operations.
 </div>
 <div className="bg-rose-500/5 border border-rose-500/20 p-5 rounded-2xl space-y-4">
 {isRowClearingBlocked() && !forceUnlockReset ? (
 <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-left space-y-2">
 <span className="text-[10px] font-black uppercase text-amber-500 font-mono tracking-wider block">️ System Clearing Operations Locked</span>
 <p className="text-[10.5px] text-zinc-300 leading-relaxed font-sans">
 Row-clearing and database truncations are deactivated because the register is currently holding: <strong className="text-amber-400 font-extrabold">{getRowClearingBlockedReason()}</strong>.
 </p>
 <div className="flex flex-wrap gap-2 pt-1">
 {getRowClearingBlockedReason().includes("unexported shift payload") && (
  <button
   type="button"
   onClick={() => {
    forceCloseAllShifts();
    alert("All open or unclosed shifts have been forced to CLOSED status. The system clearing safety guard has been updated.");
   }}
   className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-mono text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors border border-amber-500/30 cursor-pointer"
  >
   Force-Close All Unclosed Shifts
  </button>
 )}
 {getRowClearingBlockedReason().includes("open checkout list") && (
  <button
   type="button"
   onClick={() => {
    localStorage.removeItem("tp_active_cart");
    window.location.reload();
   }}
   className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-mono text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors border border-amber-500/30 cursor-pointer"
  >
   Clear Active Cart
  </button>
 )}
 <button
  type="button"
  onClick={() => {
   setForceUnlockReset(true);
  }}
  className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-mono text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors border border-rose-500/30 cursor-pointer"
 >
  Bypass Lock & Enable Reset
 </button>
 </div>
 </div>
 ) : (
 <div className="flex flex-col gap-1">
 <label className="text-[10px] font-black uppercase tracking-wider text-rose-400 font-mono">
 Reset Safety Guard {forceUnlockReset && <span className="text-amber-400">(Lock Bypassed)</span>}
 </label>
 <p className="text-[10.5px] text-zinc-300">
 To unlock the reset triggers, type <span className="font-extrabold text-rose-400 select-all font-mono">RESET</span> below:
 </p>
 <input
 type="text"
 value={resetConfirmation ?? ''}
 onChange={(e) => setResetConfirmation(e.target.value)}
 placeholder="Type RESET to authorize"
 className="bg-m3-surface border border-rose-500/30 rounded-xl text-xs font-mono font-bold p-2.5 w-full max-w-xs mt-1.5 text-rose-400 outline-none focus:border-rose-500 text-center tracking-widest uppercase"
 />
 </div>
 )}

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-rose-500/10">
 {/* Clear Transactions */}
 <div className="flex flex-col justify-between bg-m3-surface-low border border-m3-outline-variant/15 p-4 rounded-xl text-left space-y-3">
 <div>
 <span className="text-[10px] font-extrabold text-amber-500 font-mono uppercase block">Option A</span>
 <h5 className="font-black text-xs text-m3-on-surface mt-1">Reset All Stock Counts</h5>
 </div>
 <HoldToConfirmButton
 disabled={resetConfirmation !== 'RESET' || (isRowClearingBlocked() && !forceUnlockReset)}
 onConfirm={() => {
 truncateDatabase('transactions');
 setResetConfirmation('');
 alert('All transactions cleared and product inventory levels reset to 0 successfully!');
 }}
 variant="amber"
 >
 Hold to Reset Stocks
 </HoldToConfirmButton>
 </div>

 {/* Complete Wipe */}
 <div className="flex flex-col justify-between bg-m3-surface-low border border-m3-outline-variant/15 p-4 rounded-xl text-left space-y-3">
 <div>
 <span className="text-[10px] font-extrabold text-rose-500 font-mono uppercase block">Option B</span>
 <h5 className="font-black text-xs text-m3-on-surface mt-1">Full Database Wipe</h5>
 </div>
 <HoldToConfirmButton
 disabled={resetConfirmation !== 'RESET' || (isRowClearingBlocked() && !forceUnlockReset)}
 onConfirm={() => {
 truncateDatabase('all');
 setResetConfirmation('');
 alert('Full database truncation completed. All custom catalog items and transactions have been purged.');
 }}
 variant="rose"
 >
 Hold to Truncate All
 </HoldToConfirmButton>
 </div>

 {/* Setup from 0 Wipe */}
 <div className="flex flex-col justify-between bg-m3-surface-low border border-m3-outline-variant/15 p-4 rounded-xl text-left space-y-3">
 <div>
 <span className="text-[10px] font-extrabold text-purple-500 font-mono uppercase block">Option C</span>
 <h5 className="font-black text-xs text-m3-on-surface mt-1">Factory Reset (Setup 0)</h5>
 </div>
 <HoldToConfirmButton
 disabled={resetConfirmation !== 'RESET'}
 onConfirm={async () => {
 try {
 await truncateDatabase('all');
 } catch (err) {
 console.warn("[Factory Reset] Server truncate call error:", err);
 }
 localStorage.clear();
 sessionStorage.clear();
 setResetConfirmation('');
 alert('System data and server database cleared completely. Rebooting to setup wizard from 0...');
 window.location.href = '/';
 }}
 variant="rose"
 >
 Hold to Setup From 0
 </HoldToConfirmButton>
 </div>
 </div>
 </div> </div>
 </div>
 </div>
 </>
 )}

 </div>
 </div>
 );
};
