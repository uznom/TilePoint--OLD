import React, { useState, useEffect } from 'react';
import { HeroSwitch } from './common/ui/HeroSwitch';
import { ColorPicker } from './common/ui/HeroColorPicker';
import {
  HEROUI_BASE_PALETTES,
  getStoredHeroUIConfig,
  saveHeroUIConfig,
  HeroUIConfig,
  generateShades,
  getContrastAdaptedPrimary,
  analyzeThemeContrast,
} from '../lib/herouiThemeEngine';
import {
  Sun,
  Moon,
  Sparkles,
  Check,
  RotateCcw,
  Palette,
  Eye,
  CheckCircle2,
  ShieldCheck,
  Info,
  Sliders,
} from 'lucide-react';

interface HeroUIAppearanceSettingsProps {
  darkMode?: boolean;
  onToggleDarkMode?: (targetVal?: boolean) => void;
}

export const HeroUIAppearanceSettings: React.FC<HeroUIAppearanceSettingsProps> = ({
  darkMode,
  onToggleDarkMode,
}) => {
  const [config, setConfig] = useState<HeroUIConfig>(() => getStoredHeroUIConfig());
  const [activeSection, setActiveSection] = useState<'appearance' | 'base'>('appearance');
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  // Derive initial dark mode state from props, localStorage, config, or DOM
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof darkMode === 'boolean') return darkMode;
    const storedTheme = localStorage.getItem('tilepoint_dark_theme');
    if (storedTheme !== null) return storedTheme === 'true';
    const cfg = getStoredHeroUIConfig();
    if (cfg.mode === 'dark') return true;
    if (cfg.mode === 'light') return false;
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return true;
  });

  // Keep isDark reactive to prop changes
  useEffect(() => {
    if (typeof darkMode === 'boolean') {
      setIsDark(darkMode);
    }
  }, [darkMode]);

  const handleSetDarkMode = (targetDark: boolean) => {
    setIsDark(targetDark);
    
    // Instant DOM synchronization
    if (targetDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('tilepoint_dark_theme', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('tilepoint_dark_theme', 'false');
    }

    // Save into HeroUI config
    const updated = saveHeroUIConfig({ mode: targetDark ? 'dark' : 'light' });
    setConfig(updated);

    // Call parent handler
    if (onToggleDarkMode) {
      onToggleDarkMode(targetDark);
    }

    // Broadcast custom events
    window.dispatchEvent(new CustomEvent('tilepoint-dark-mode-toggle', { detail: targetDark }));
    window.dispatchEvent(new CustomEvent('tilepoint-theme-updated', { detail: { darkMode: targetDark } }));
    
    triggerFeedback(targetDark ? 'Switched to Dark Mode' : 'Switched to Light Mode');
  };

  // Sync state on external updates
  useEffect(() => {
    const handleUpdate = () => {
      const fresh = getStoredHeroUIConfig();
      setConfig(fresh);
    };
    const handleDarkToggleEvent = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      if (typeof customEvent.detail === 'boolean') {
        setIsDark(customEvent.detail);
      } else {
        const saved = localStorage.getItem('tilepoint_dark_theme') === 'true';
        setIsDark(saved);
      }
    };

    window.addEventListener('tilepoint-theme-updated', handleUpdate);
    window.addEventListener('tilepoint-dark-mode-toggle', handleDarkToggleEvent);
    return () => {
      window.removeEventListener('tilepoint-theme-updated', handleUpdate);
      window.removeEventListener('tilepoint-dark-mode-toggle', handleDarkToggleEvent);
    };
  }, []);

  const triggerFeedback = (msg: string) => {
    setSavedFeedback(msg);
    setTimeout(() => setSavedFeedback(null), 2500);
  };

  const handleUpdateConfig = (partial: Partial<HeroUIConfig>, label?: string) => {
    const updated = saveHeroUIConfig(partial);
    setConfig(updated);
    if (label) triggerFeedback(label);
  };

  const handleResetAll = () => {
    const resetValues: HeroUIConfig = {
      mode: darkMode ? 'dark' : 'light',
      uiStyle: 'opaque',
      baseColor: '#006FEE',
      baseColorName: 'Sapphire (HeroUI Default)',
      autoContrastText: true,
      contrastTarget: 'aa',
      radius: 'md',
      formVariant: 'bordered',
      formRadius: 'md',
      formDensity: 'default',
    };
    localStorage.removeItem('tilepoint_heroui_theme_config');
    localStorage.removeItem('tilepoint_custom_theme_primary');
    saveHeroUIConfig(resetValues);
    setConfig(resetValues);
    triggerFeedback('Reset theme to HeroUI default specifications');
  };

  const effectivePrimary = getContrastAdaptedPrimary(config.baseColor, isDark, config.contrastTarget || 'aa');
  const contrastReport = analyzeThemeContrast(
    config.baseColor,
    isDark,
    config.autoContrastText !== false,
    config.contrastTarget || 'aa'
  );
  const shades = generateShades(effectivePrimary, isDark);

  return (
    <div className="space-y-6 text-left animate-fade-in pb-12 font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-content1 border border-divider/20 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
              HeroUI v3 Appearance & Theme Customizer
            </h3>
          </div>
          <p className="text-xs text-default-500 mt-1">
            Configure system appearance, high-contrast surfaces, and base color palettes.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {savedFeedback && (
            <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-1 animate-fade-in">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {savedFeedback}
            </span>
          )}
          <button
            type="button"
            onClick={handleResetAll}
            className="px-3 py-1.5 rounded-xl border border-divider/30 text-xs font-bold text-default-600 hover:text-foreground hover:bg-content2 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Reset theme to HeroUI v3 defaults"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs: Appearance, Base Palette */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-content1 border border-divider/20 rounded-xl">
        {[
          { id: 'appearance', label: 'Appearance', icon: Eye },
          { id: 'base', label: 'Base Palette', icon: Palette },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id as any)}
              className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-default-500 hover:text-foreground hover:bg-content2/50'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: APPEARANCE (Mode & Contrast) */}
      {/* ========================================================================= */}
      {activeSection === 'appearance' && (
        <div className="space-y-5 animate-fade-in">
          {/* Theme Mode Selector */}
          <div className="p-4 bg-content1 border border-divider/20 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black uppercase text-primary tracking-wider flex items-center gap-1.5">
                  <Sun className="h-4 w-4" />
                  <span>Color Mode (Light / Dark)</span>
                </h4>
                <p className="text-[11px] text-default-500 mt-0.5">
                  Choose between high-contrast light mode or dark mode surfaces.
                </p>
              </div>
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {isDark ? 'Dark Active' : 'Light Active'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSetDarkMode(false)}
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                  !isDark
                    ? 'bg-primary/10 border-primary shadow-xs ring-1 ring-primary/30'
                    : 'bg-background hover:bg-content2 border-divider/20 hover:border-divider/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${!isDark ? 'bg-primary text-primary-foreground' : 'bg-content2 text-default-500'}`}>
                    <Sun className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">Light Mode</span>
                    <span className="text-[10.5px] text-default-500">Pure, high-readability daytime canvas</span>
                  </div>
                </div>
                {!isDark && <Check className="h-4 w-4 text-primary" />}
              </button>

              <button
                type="button"
                onClick={() => handleSetDarkMode(true)}
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                  isDark
                    ? 'bg-primary/10 border-primary shadow-xs ring-1 ring-primary/30'
                    : 'bg-background hover:bg-content2 border-divider/20 hover:border-divider/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-primary text-primary-foreground' : 'bg-content2 text-default-500'}`}>
                    <Moon className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">Dark Mode</span>
                    <span className="text-[10.5px] text-default-500">Eye-safe, deep twilight contrast</span>
                  </div>
                </div>
                {isDark && <Check className="h-4 w-4 text-primary" />}
              </button>
            </div>
          </div>

          {/* Dark Mode Auto-Contrast & Readability Guard */}
          <div className="p-4 bg-content1 border border-divider/20 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0 mt-0.5">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black uppercase text-foreground tracking-wider">
                      Dark Mode Text Readability & Contrast Guard
                    </h4>
                    <span
                      className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        contrastReport.wcagGrade.includes('AAA')
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          : contrastReport.wcagGrade.includes('AA')
                          ? 'bg-primary/10 text-primary border-primary/20'
                          : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}
                    >
                      {contrastReport.wcagGrade}
                    </span>
                  </div>
                  <p className="text-[11px] text-default-500 mt-0.5">
                    Automatically detects when a dark theme or low-contrast seed color is selected and adjusts text foregrounds and accents for crisp, eye-safe legibility.
                  </p>
                </div>
              </div>

              {/* Master Auto-Adjust Switch */}
              <div className="self-start sm:self-center">
                <HeroSwitch
                  size="md"
                  color="primary"
                  isSelected={config.autoContrastText !== false}
                  onValueChange={(val) =>
                    handleUpdateConfig(
                      { autoContrastText: val },
                      val
                        ? "Enabled dark mode text auto-contrast guard"
                        : "Disabled auto-contrast (raw colors will be used)"
                    )
                  }
                />
              </div>
            </div>

            {/* Diagnostic Alert Box */}
            {isDark && (
              <div
                className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
                  contrastReport.isAdjusted
                    ? 'bg-primary/10 border-primary/30 text-foreground'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-foreground'
                }`}
              >
                {contrastReport.isAdjusted ? (
                  <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="font-bold flex items-center gap-2">
                    <span>
                      {contrastReport.isAdjusted
                        ? 'Auto-Contrast Shift Active'
                        : 'Natural Contrast Meets Standards'}
                    </span>
                    <span className="text-[10px] font-mono opacity-75">
                      Surface: {contrastReport.effectiveContrastOnDark}:1 • Button Text: {contrastReport.textContrastOnPrimary}:1
                    </span>
                  </div>
                  <p className="text-[11px] text-default-500">
                    {contrastReport.isAdjusted
                      ? `The base color ${config.baseColor} has low contrast on dark backgrounds (${contrastReport.rawContrastOnDark}:1). The engine automatically shifted accent text and highlights to ${contrastReport.effectiveColor} (${contrastReport.effectiveContrastOnDark}:1) to prevent unreadable dark-on-dark text.`
                      : `The selected theme palette provides strong contrast (${contrastReport.effectiveContrastOnDark}:1) against dark surfaces, ensuring clear text legibility.`}
                  </p>
                </div>
              </div>
            )}

            {/* Target Compliance Level Selector */}
            <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-divider/15">
              <div>
                <label className="text-[10.5px] font-bold text-foreground block">
                  WCAG Accessibility Target Standard
                </label>
                <span className="text-[10px] text-default-500">
                  Choose the minimum contrast ratio threshold enforced by the auto-adjust engine.
                </span>
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-content2/60 rounded-xl border border-divider/20 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleUpdateConfig({ contrastTarget: 'aa' }, 'Set target to WCAG AA (4.5:1)')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    (config.contrastTarget || 'aa') === 'aa'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-default-500 hover:text-foreground'
                  }`}
                >
                  WCAG AA (4.5:1 Standard)
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateConfig({ contrastTarget: 'aaa' }, 'Set target to WCAG AAA (7.0:1)')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    config.contrastTarget === 'aaa'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-default-500 hover:text-foreground'
                  }`}
                >
                  WCAG AAA (7.0:1 Enhanced)
                </button>
              </div>
            </div>

            {/* Live Readability Verification Strip */}
            <div className="pt-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-default-500 block mb-2">
                Live Text Contrast Matrix on Active Surface ({isDark ? 'Dark #18181B' : 'Light #FFFFFF'})
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Surface Heading */}
                <div className="p-3 rounded-xl bg-content2 border border-divider/30 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-default-400">Heading & Body Text</span>
                    <span className="text-[9px] font-mono font-bold text-emerald-500">14.2:1</span>
                  </div>
                  <p className="text-xs font-bold text-foreground">
                    Crystal Clear Text
                  </p>
                  <span className="text-[10px] text-default-500 mt-0.5">
                    Muted subtitle label
                  </span>
                </div>

                {/* Primary Button Text */}
                <div
                  className="p-3 rounded-xl border border-divider/30 flex flex-col justify-between"
                  style={{ backgroundColor: effectivePrimary }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-[10px] font-bold"
                      style={{ color: contrastReport.textColorOnPrimary, opacity: 0.8 }}
                    >
                      Button Label
                    </span>
                    <span
                      className="text-[9px] font-mono font-bold"
                      style={{ color: contrastReport.textColorOnPrimary }}
                    >
                      {contrastReport.textContrastOnPrimary}:1
                    </span>
                  </div>
                  <p
                    className="text-xs font-black"
                    style={{ color: contrastReport.textColorOnPrimary }}
                  >
                    Action Button
                  </p>
                  <span
                    className="text-[10px] font-medium truncate"
                    style={{ color: contrastReport.textColorOnPrimary, opacity: 0.85 }}
                  >
                    Auto-selected {contrastReport.textColorOnPrimary === '#FFFFFF' ? 'White Text' : 'Dark Text'}
                  </span>
                </div>

                {/* Accent Highlight */}
                <div className="p-3 rounded-xl bg-content2 border border-divider/30 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-default-400">Accent Highlight</span>
                    <span className="text-[9px] font-mono font-bold text-primary">
                      {contrastReport.effectiveContrastOnDark}:1
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-xs font-bold text-primary">
                      {contrastReport.effectiveColor}
                    </span>
                  </div>
                  <span className="text-[10px] text-default-500 mt-0.5">
                    {contrastReport.isAdjusted ? 'Auto-shifted for readability' : 'Raw seed color pass'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: BASE (Base Colors & Accent Palette) */}
      {/* ========================================================================= */}
      {activeSection === 'base' && (
        <div className="space-y-5 animate-fade-in">
          {/* Base Palette Presets */}
          <div className="p-4 bg-content1 border border-divider/20 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black uppercase text-primary tracking-wider flex items-center gap-1.5">
                  <Palette className="h-4 w-4" />
                  <span>Base Color Preset Palettes</span>
                </h4>
                <p className="text-[11px] text-default-500 mt-0.5">
                  Select a standardized HeroUI v3 brand base palette.
                </p>
              </div>
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {config.baseColorName}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {HEROUI_BASE_PALETTES.map((preset) => {
                const isSelected = config.baseColor.toLowerCase() === preset.hex.toLowerCase();
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      handleUpdateConfig({ baseColor: preset.hex, baseColorName: preset.name }, `Applied ${preset.name}`);
                    }}
                    className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/30 shadow-xs'
                        : 'border-divider/20 bg-background hover:bg-content2 hover:border-divider/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`h-5 w-5 rounded-full ${preset.class} shadow-sm border border-black/10 flex items-center justify-center`}>
                        {isSelected && <Check className="h-3 w-3 text-white drop-shadow" />}
                      </span>
                      {isSelected && <span className="text-[9px] font-black text-primary uppercase">Active</span>}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block truncate">{preset.name}</span>
                      <span className="text-[10px] font-mono text-default-500">{preset.hex}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* HeroUI v3 Interactive Color Picker */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black uppercase text-primary tracking-wider flex items-center gap-1.5">
                  <Sliders className="h-4 w-4" />
                  <span>HeroUI v3 Full Spectrum Color Picker</span>
                </h4>
                <p className="text-[11px] text-default-500 mt-0.5">
                  2D Saturation-Value area, Hue & Alpha spectrum sliders, format converter, and contrast verification.
                </p>
              </div>
              <span
                className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  contrastReport.isAdjusted
                    ? 'bg-primary/10 text-primary border-primary/20'
                    : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                }`}
              >
                Contrast: {contrastReport.effectiveContrastOnDark}:1
              </span>
            </div>

            <ColorPicker
              value={config.baseColor}
              defaultValue="#006FEE"
              onChange={(hex) => {
                handleUpdateConfig({ baseColor: hex, baseColorName: 'Custom Seed' });
              }}
              show2DArea={true}
              showSliders={true}
              showFormatToggle={true}
              showSwatches={true}
            />
          </div>

            {/* Contrast Shift Diagnostic Callout */}
            {isDark && contrastReport.isAdjusted && (
              <div className="p-3 bg-primary/10 border border-primary/25 rounded-xl flex items-start gap-2.5 text-xs">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-foreground block">
                    Dark Color Auto-Adjusted for Dark Mode Readability
                  </span>
                  <p className="text-[11px] text-default-500">
                    Seed color <span className="font-mono font-bold text-foreground">{config.baseColor}</span> would have been too dark on dark mode surfaces ({contrastReport.rawContrastOnDark}:1). The engine automatically shifted accent text and active states to <span className="font-mono font-bold text-primary">{contrastReport.effectiveColor}</span> ({contrastReport.effectiveContrastOnDark}:1) to guarantee high-contrast legibility.
                  </p>
                </div>
              </div>
            )}

            {/* Quick Test Dark/Low-Contrast Swatches */}
            <div className="pt-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-default-500 block mb-1.5">
                Test Deep / Dark Seed Tones (Observing Automatic Legibility Shift)
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'Obsidian Black', hex: '#0F172A' },
                  { name: 'Midnight Navy', hex: '#0B132B' },
                  { name: 'Deep Forest', hex: '#064E3B' },
                  { name: 'Dark Burgundy', hex: '#450A0A' },
                  { name: 'Charcoal Carbon', hex: '#18181B' },
                ].map((darkTone) => (
                  <button
                    key={darkTone.hex}
                    type="button"
                    onClick={() => {
                      handleUpdateConfig(
                        { baseColor: darkTone.hex, baseColorName: darkTone.name },
                        `Tested ${darkTone.name} (Auto-adjusted for dark mode)`
                      );
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-divider/25 bg-background hover:bg-content2 text-left flex items-center gap-2 text-xs transition-all cursor-pointer"
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-divider shrink-0 shadow-xs"
                      style={{ backgroundColor: darkTone.hex }}
                    />
                    <span className="text-[11px] font-medium text-foreground">{darkTone.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Live 50-900 Tonal Swatch Ramp */}
            <div className="pt-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-default-500 block mb-1.5">
                Generated HeroUI v3 50–900 Tonal Shade Ramp ({effectivePrimary})
              </label>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((step) => {
                  const shadeHex = (shades as any)[step];
                  return (
                    <div
                      key={step}
                      className="p-1.5 rounded-lg border border-divider/20 flex flex-col items-center justify-between text-center select-none"
                      style={{ backgroundColor: shadeHex }}
                      title={`Step ${step}: ${shadeHex}`}
                    >
                      <span
                        className="text-[9px] font-mono font-bold"
                        style={{ color: step >= 500 ? '#FFFFFF' : '#0F172A' }}
                      >
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
      )}

      {/* ========================================================================= */}
      {/* LIVE HEROUI V3 INTERACTIVE PREVIEW SANDBOX */}
      {/* ========================================================================= */}
      <div className="p-5 rounded-2xl border border-divider/20 bg-content1 space-y-4">
        <div className="flex items-center justify-between border-b border-divider/15 pb-2.5">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
              Live HeroUI v3 Interactive Component Sandbox
            </h4>
          </div>
          <span className="text-[10px] font-mono font-bold text-default-400">
            {config.baseColor} • {isDark ? 'Dark Mode' : 'Light Mode'}
          </span>
        </div>

        {/* Buttons Row */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-default-500 block">
            Button Variants (Solid, Bordered, Flat, Faded, Light, Ghost)
          </label>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
            >
              Solid Primary
            </button>

            <button
              type="button"
              className="px-4 py-2 border border-primary text-primary text-xs font-bold rounded-xl hover:bg-primary/10 transition-all cursor-pointer"
            >
              Bordered
            </button>

            <button
              type="button"
              className="px-4 py-2 bg-primary/15 text-primary text-xs font-bold rounded-xl hover:bg-primary/25 transition-all cursor-pointer"
            >
              Flat Subtle
            </button>

            <button
              type="button"
              className="px-4 py-2 bg-default-100 text-default-700 text-xs font-bold rounded-xl hover:bg-default-200 transition-all cursor-pointer"
            >
              Neutral Light
            </button>

            <button
              type="button"
              className="px-4 py-2 text-primary text-xs font-bold rounded-xl hover:bg-primary/10 transition-all cursor-pointer"
            >
              Ghost
            </button>
          </div>
        </div>

        {/* Form Inputs Showcase */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="space-y-1">
            <label className="text-[10.5px] font-bold text-default-600 block">
              Sample Form Input ({config.formVariant})
            </label>
            <input
              type="text"
              defaultValue="TilePoint Corporate"
              className={`w-full text-xs text-foreground focus:outline-none transition-all ${
                config.formVariant === 'bordered'
                  ? 'px-3 py-2 bg-background border border-divider/40 focus:border-primary rounded-xl'
                  : config.formVariant === 'flat'
                  ? 'px-3 py-2 bg-content2 focus:bg-content2 border-transparent focus:border-primary rounded-xl'
                  : config.formVariant === 'underlined'
                  ? 'px-2 py-1.5 bg-transparent border-b-2 border-divider/60 focus:border-primary rounded-none'
                  : 'px-3 py-2 bg-background border border-divider/20 focus:border-primary rounded-xl'
              }`}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10.5px] font-bold text-default-600 block">
              Select Dropdown Control
            </label>
            <select
              defaultValue="B1"
              className={`w-full text-xs text-foreground focus:outline-none transition-all cursor-pointer ${
                config.formVariant === 'bordered'
                  ? 'px-3 py-2 bg-background border border-divider/40 focus:border-primary rounded-xl'
                  : config.formVariant === 'flat'
                  ? 'px-3 py-2 bg-content2 focus:bg-content2 border-transparent focus:border-primary rounded-xl'
                  : config.formVariant === 'underlined'
                  ? 'px-2 py-1.5 bg-transparent border-b-2 border-divider/60 focus:border-primary rounded-none'
                  : 'px-3 py-2 bg-background border border-divider/20 focus:border-primary rounded-xl'
              }`}
            >
              <option value="B1">Main Corporate Branch (B1)</option>
              <option value="B2">North Warehouse (B2)</option>
              <option value="B3">South Terminal (B3)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10.5px] font-bold text-default-600 block">
              Status Chips & Badges
            </label>
            <div className="flex items-center gap-1.5 pt-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                Primary
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Active
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                Pending
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
