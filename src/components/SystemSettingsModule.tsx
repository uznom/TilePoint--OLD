/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CaseSensitive,
  Check,
  Clock,
  Download,
  Droplets,
  Keyboard,
  Layers,
  Lock,
  Moon,
  RotateCcw,
  Settings,
  Shield,
  ShieldAlert,
  Sliders,
  Sparkles,
  Square,
  Sun,
  Type,
  X,
  Info,
  Building2,
  Cpu,
  Database,
  Save,
  CheckCircle2,
  Tag,
  Ruler,
  CreditCard,
  Percent,
  AlertTriangle,
  HardDrive,
  RefreshCw,
  FolderArchive,
  ExternalLink
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useDb } from '../context/DbContext';
import { saveHeroUIConfig } from '../lib/herouiThemeEngine';
import { UserRole } from '../types/db';
import { HeroSwitch } from './common/ui/HeroSwitch';
import { HeroSelect } from './common/ui/HeroSelect';
import { HoldToConfirmButton } from './HoldToConfirmButton';
import { DynamicEntityConfigModal, DynamicConfigTab } from './DynamicEntityConfigModal';
import { HeroUIAppearanceSettings } from './HeroUIAppearanceSettings';

interface SystemSettingsModuleProps {
  darkMode: boolean;
  setDarkMode?: (dark: boolean) => void;
  followSystemTheme?: boolean;
  setFollowSystemTheme?: (follow: boolean) => void;
  isModal?: boolean;
  onClose?: () => void;
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
  <div
    role="button"
    tabIndex={disabled ? -1 : 0}
    onClick={!disabled ? onClick : undefined}
    onKeyDown={(e) => {
      if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick();
      }
    }}
    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all text-left select-none cursor-pointer group ${
      disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
    } ${
      active
        ? 'bg-primary/10 border-primary/40 text-foreground shadow-2xs'
        : 'border-divider/20 hover:bg-content2 hover:border-divider/40 bg-content1'
    }`}
  >
    <div className="flex items-center gap-3 min-w-0">
      <div
        className={`p-2.5 rounded-xl shrink-0 transition-transform group-hover:scale-105 ${
          active
            ? 'bg-primary text-primary-foreground shadow-2xs'
            : 'bg-content2 text-default-500'
        }`}
      >
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-bold text-foreground font-sans truncate">
          {title}
        </span>
        {subtitle && (
          <span className="text-[10px] text-default-500 font-medium truncate mt-0.5">
            {subtitle}
          </span>
        )}
      </div>
    </div>

    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
      <span
        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider ${
          active
            ? 'bg-primary/20 text-primary border border-primary/30'
            : 'bg-content2 text-default-500 border border-transparent'
        }`}
      >
        {active ? activeLabel : inactiveLabel}
      </span>
      <HeroSwitch
        size="sm"
        color="primary"
        isSelected={active}
        onValueChange={() => onClick()}
        isDisabled={disabled}
      />
    </div>
  </div>
);

export const SystemSettingsModule: React.FC<SystemSettingsModuleProps> = ({
  darkMode,
  setDarkMode,
  followSystemTheme = false,
  setFollowSystemTheme,
  isModal = false,
  onClose,
}) => {
  const {
    currentUser,
    updateCurrentUser,
    truncateDatabase,
    isRowClearingBlocked,
    getRowClearingBlockedReason,
    forceCloseAllShifts,
    branches,
    productCategories,
    unitTypes,
    paymentMethodsList,
    discountSchemes,
    damageReasonsList,
    createDbSnapshot,
    autoBackupEnabled,
    setAutoBackupEnabled,
    backupIntervalHours,
    setBackupIntervalHours,
    generateMasterForensicBackup,
    syncAllLocalToMysql,
    getMysqlStatus,
    serverDegradedState,
  } = useDb();

  const isAuthorized =
    currentUser &&
    (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER);
  const [forceUnlockReset, setForceUnlockReset] = useState(false);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [snapshotSuccessToast, setSnapshotSuccessToast] = useState<string | null>(null);

  // MySQL persistence and sync states
  const [mysqlStatus, setMysqlStatus] = useState<any>(null);
  const [isSyncingMysql, setIsSyncingMysql] = useState(false);
  const [mysqlSyncToast, setMysqlSyncToast] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchStatus = async () => {
      try {
        const stat = await getMysqlStatus();
        if (isMounted) setMysqlStatus(stat);
      } catch (_) {}
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [getMysqlStatus]);

  const handleSyncToMysql = async () => {
    setIsSyncingMysql(true);
    setMysqlSyncToast(null);
    try {
      const res = await syncAllLocalToMysql();
      if (res.success) {
        setMysqlSyncToast(res.message || 'All local data synchronized to MySQL successfully!');
        const updatedStat = await getMysqlStatus();
        setMysqlStatus(updatedStat);
      } else {
        setMysqlSyncToast(`Sync warning: ${res.error || 'Failed to sync to MySQL'}`);
      }
    } catch (err: any) {
      setMysqlSyncToast(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncingMysql(false);
      setTimeout(() => setMysqlSyncToast(null), 5000);
    }
  };

  const handleExportDatabaseJson = () => {
    try {
      const backupData = generateMasterForensicBackup();
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tilepoint-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error('Failed to export database backup JSON', e);
    }
  };

  // Enterprise details states
  const [companyName, setCompanyName] = useState<string>(() => {
    return (
      localStorage.getItem('tilepoint_company_name_v1') ||
      branches[0]?.name ||
      'Main Enterprise'
    );
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
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    if (currentUser?.managerPin) {
      setManagerPin(currentUser.managerPin);
    }
  }, [currentUser]);

  // Settings states loaded from localStorage
  const [textSize, setTextSize] = useState<'small' | 'normal' | 'large' | 'xlarge'>(() => {
    const val = localStorage.getItem('tilepoint-text-size');
    if (val === 'small' || val === 'large' || val === 'xlarge') return val;
    return 'normal';
  });

  const [colorContrast, setColorContrast] = useState<'small' | 'medium' | 'high'>(() => {
    const val = localStorage.getItem('tilepoint-color-contrast');
    if (val === 'small' || val === 'default') return 'small';
    if (val === 'high') return 'high';
    return 'medium';
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

  const [disableUiBlurs, setDisableUiBlurs] = useState<boolean>(() => {
    const saved = localStorage.getItem('tilepoint-disable-ui-blurs');
    if (saved !== null) return saved === 'true';
    return localStorage.getItem('tilepoint-disable-blurs') === 'true';
  });

  const [disableBackdropBlurs, setDisableBackdropBlurs] = useState<boolean>(() => {
    const saved = localStorage.getItem('tilepoint-disable-backdrop-blurs');
    if (saved !== null) return saved === 'true';
    return localStorage.getItem('tilepoint-disable-blurs') === 'true';
  });

  const [disableInstallPrompt, setDisableInstallPrompt] = useState<boolean>(() => {
    return localStorage.getItem('tilepoint-disable-install-prompt') === 'true';
  });

  const [disableIdleClock, setDisableIdleClock] = useState<boolean>(() => {
    return localStorage.getItem('tilepoint-disable-idle-clock') === 'true';
  });

  const [showDynamicConfig, setShowDynamicConfig] = useState(false);
  const [dynamicConfigTab, setDynamicConfigTab] = useState<DynamicConfigTab>('categories');

  // Sync setting updates
  const updateSetting = (key: string, value: string | boolean) => {
    const clientSettings = [
      'tilepoint-text-size',
      'tilepoint-color-contrast',
      'tilepoint-maximize-text-contrast',
      'tilepoint-dyslexic-font',
      'tilepoint-enhanced-outlines',
      'tilepoint-disable-animations',
      'tilepoint-disable-blurs',
      'tilepoint-disable-ui-blurs',
      'tilepoint-disable-backdrop-blurs',
      'tilepoint-disable-install-prompt',
      'tilepoint-disable-idle-clock',
    ];
    if (!isAuthorized && !clientSettings.includes(key)) return;
    const root = document.documentElement;
    const strVal = String(value);

    localStorage.setItem(key, strVal);

    if (key === 'tilepoint-text-size') {
      const sz = value as 'small' | 'normal' | 'large' | 'xlarge';
      setTextSize(sz);
      root.classList.remove(
        'accessibility-small-text', 'accessibility-normal-text', 'accessibility-large-text', 'accessibility-xlarge-text',
        'accessibility-text-sm', 'accessibility-text-base', 'accessibility-text-lg', 'accessibility-text-xl'
      );
      if (sz === 'small') {
        root.classList.add('accessibility-small-text', 'accessibility-text-sm');
        root.style.fontSize = '14px';
        root.style.setProperty('--app-font-multiplier', '0.88');
      } else if (sz === 'large') {
        root.classList.add('accessibility-large-text', 'accessibility-text-lg');
        root.style.fontSize = '18px';
        root.style.setProperty('--app-font-multiplier', '1.125');
      } else if (sz === 'xlarge') {
        root.classList.add('accessibility-xlarge-text', 'accessibility-text-xl');
        root.style.fontSize = '20px';
        root.style.setProperty('--app-font-multiplier', '1.25');
      } else {
        root.classList.add('accessibility-normal-text', 'accessibility-text-base');
        root.style.fontSize = '16px';
        root.style.setProperty('--app-font-multiplier', '1.0');
      }
      try {
        window.dispatchEvent(new Event('tilepoint:theme-sync'));
      } catch (eventErr) {
        console.debug('[Theme Sync] Failed to dispatch tilepoint:theme-sync event:', eventErr);
      }
    }

    if (key === 'tilepoint-color-contrast') {
      setColorContrast(value as any);
    }

    if (key === 'tilepoint-maximize-text-contrast') {
      setMaximizeTextContrast(value as boolean);
      if (value) root.classList.add('accessibility-maximize-text-contrast');
      else root.classList.remove('accessibility-maximize-text-contrast');
    }

    if (key === 'tilepoint-dyslexic-font') {
      setDyslexicFont(value as boolean);
      if (value) root.classList.add('accessibility-dyslexic-font');
      else root.classList.remove('accessibility-dyslexic-font');
    }

    if (key === 'tilepoint-enhanced-outlines') {
      setEnhancedOutlines(value as boolean);
      if (value) root.classList.add('accessibility-enhanced-outlines');
      else root.classList.remove('accessibility-enhanced-outlines');
    }

    if (key === 'tilepoint-disable-animations') {
      setDisableAnimations(value as boolean);
      if (value) root.classList.add('accessibility-no-animation');
      else root.classList.remove('accessibility-no-animation');
    }

    if (key === 'tilepoint-disable-ui-blurs') {
      const bVal = value as boolean;
      setDisableUiBlurs(bVal);
      if (bVal) root.classList.add('accessibility-no-ui-blur');
      else root.classList.remove('accessibility-no-ui-blur');
      const combined = bVal && disableBackdropBlurs;
      localStorage.setItem('tilepoint-disable-blurs', String(combined));
      if (combined) root.classList.add('accessibility-no-blur');
      else root.classList.remove('accessibility-no-blur');
    }

    if (key === 'tilepoint-disable-backdrop-blurs') {
      const bVal = value as boolean;
      setDisableBackdropBlurs(bVal);
      if (bVal) root.classList.add('accessibility-no-backdrop-blur');
      else root.classList.remove('accessibility-no-backdrop-blur');
      const combined = disableUiBlurs && bVal;
      localStorage.setItem('tilepoint-disable-blurs', String(combined));
      if (combined) root.classList.add('accessibility-no-blur');
      else root.classList.remove('accessibility-no-blur');
    }

    if (key === 'tilepoint-disable-install-prompt') {
      setDisableInstallPrompt(value as boolean);
    }

    if (key === 'tilepoint-disable-idle-clock') {
      setDisableIdleClock(value as boolean);
    }

    window.dispatchEvent(new Event('tilepoint-theme-updated'));
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const handleSaveEnterpriseSettings = () => {
    localStorage.setItem('tilepoint_company_name_v1', companyName);
    localStorage.setItem('tilepoint_tax_rate_v1', String(taxRate));
    localStorage.setItem('tilepoint_currency_v1', currency);
    localStorage.setItem('tilepoint_receipt_logo_size_v1', String(logoSize));

    if (managerPin && managerPin.length === 4) {
      updateCurrentUser({ managerPin });
    }

    window.dispatchEvent(new Event('tilepoint-theme-updated'));
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const handleResetToDefaults = () => {
    localStorage.removeItem('tilepoint-text-size');
    localStorage.removeItem('tilepoint-color-contrast');
    localStorage.removeItem('tilepoint-maximize-text-contrast');
    localStorage.removeItem('tilepoint-dyslexic-font');
    localStorage.removeItem('tilepoint-enhanced-outlines');
    localStorage.removeItem('tilepoint-disable-animations');
    localStorage.removeItem('tilepoint-disable-blurs');
    localStorage.removeItem('tilepoint-disable-ui-blurs');
    localStorage.removeItem('tilepoint-disable-backdrop-blurs');
    localStorage.removeItem('tilepoint-disable-install-prompt');
    localStorage.removeItem('tilepoint-disable-idle-clock');

    const root = document.documentElement;
    root.classList.remove(
      'accessibility-small-text',
      'accessibility-large-text',
      'accessibility-xlarge-text',
      'accessibility-maximize-text-contrast',
      'accessibility-dyslexic-font',
      'accessibility-enhanced-outlines',
      'accessibility-no-animation',
      'accessibility-no-blur',
      'accessibility-no-ui-blur',
      'accessibility-no-backdrop-blur'
    );

    setTextSize('normal');
    setColorContrast('medium');
    setMaximizeTextContrast(false);
    setDyslexicFont(false);
    setEnhancedOutlines(false);
    setDisableAnimations(false);
    setDisableUiBlurs(false);
    setDisableBackdropBlurs(false);
    setDisableInstallPrompt(false);
    setDisableIdleClock(false);

    window.dispatchEvent(new Event('tilepoint-theme-updated'));
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in text-foreground pb-12" id="system-settings-module">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center bg-content1/95 backdrop-blur-md p-4 rounded-2xl border border-divider/30 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-black tracking-widest text-primary uppercase">
              System Settings &amp; Configuration
            </h3>
            <p className="text-[11px] text-default-500 font-medium">
              Manage appearance, accessibility, store preferences, and data options.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {savedToast && (
            <span className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20 animate-fade-in">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Saved</span>
            </span>
          )}

          {isAuthorized ? (
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-divider/30 hover:bg-primary/10 text-default-600 hover:text-primary text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95"
              title="Reset display and accessibility preferences to defaults"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reset Defaults</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 text-[10px] uppercase font-black tracking-wider text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
              <Lock className="h-3.5 w-3.5" />
              <span>View Only</span>
            </div>
          )}

          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-default-400 hover:text-foreground hover:bg-default-100 transition-colors cursor-pointer active:scale-95"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* STORE OPTIONS & CATALOGS */}
      <div className="p-5 rounded-2xl border border-primary/30 bg-primary/5 space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-primary text-primary-foreground shadow-2xs shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-black uppercase text-foreground tracking-wider">
                  Store Options &amp; Catalogs
                </h4>
                <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Active
                </span>
              </div>
              <p className="text-[11px] text-default-500 font-medium mt-0.5">
                Manage product categories, measurement units, payment methods, discounts, and damage causes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setDynamicConfigTab('categories');
              setShowDynamicConfig(true);
            }}
            className="px-4 py-2.5 bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider rounded-xl shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer shrink-0 flex items-center gap-2"
          >
            <Sliders className="h-4 w-4" />
            <span>Manage Options</span>
          </button>
        </div>

        {/* Quick entity overview chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 pt-2 border-t border-primary/10">
          <button
            type="button"
            onClick={() => {
              setDynamicConfigTab('categories');
              setShowDynamicConfig(true);
            }}
            className="p-2.5 rounded-xl border border-divider/20 bg-content1 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group cursor-pointer active:scale-[0.98]"
          >
            <div className="flex items-center justify-between text-default-500 group-hover:text-primary mb-1 active:scale-[0.98]">
              <Tag className="h-3.5 w-3.5" />
              <span className="text-[10px] font-black">{productCategories.length}</span>
            </div>
            <div className="text-[11px] font-bold text-foreground">Categories</div>
            <div className="text-[9px] text-default-400">Product groups</div>
          </button>

          <button
            type="button"
            onClick={() => {
              setDynamicConfigTab('units');
              setShowDynamicConfig(true);
            }}
            className="p-2.5 rounded-xl border border-divider/20 bg-content1 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group cursor-pointer active:scale-[0.98]"
          >
            <div className="flex items-center justify-between text-default-500 group-hover:text-primary mb-1 active:scale-[0.98]">
              <Ruler className="h-3.5 w-3.5" />
              <span className="text-[10px] font-black">{unitTypes.length}</span>
            </div>
            <div className="text-[11px] font-bold text-foreground">Units of Measure</div>
            <div className="text-[9px] text-default-400">Pcs, Boxes, Sqm...</div>
          </button>

          <button
            type="button"
            onClick={() => {
              setDynamicConfigTab('payments');
              setShowDynamicConfig(true);
            }}
            className="p-2.5 rounded-xl border border-divider/20 bg-content1 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group cursor-pointer active:scale-[0.98]"
          >
            <div className="flex items-center justify-between text-default-500 group-hover:text-primary mb-1 active:scale-[0.98]">
              <CreditCard className="h-3.5 w-3.5" />
              <span className="text-[10px] font-black">{paymentMethodsList.length}</span>
            </div>
            <div className="text-[11px] font-bold text-foreground">Payment Methods</div>
            <div className="text-[9px] text-default-400">Cash, Cards, GCash...</div>
          </button>

          <button
            type="button"
            onClick={() => {
              setDynamicConfigTab('discounts');
              setShowDynamicConfig(true);
            }}
            className="p-2.5 rounded-xl border border-divider/20 bg-content1 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group cursor-pointer active:scale-[0.98]"
          >
            <div className="flex items-center justify-between text-default-500 group-hover:text-primary mb-1 active:scale-[0.98]">
              <Percent className="h-3.5 w-3.5" />
              <span className="text-[10px] font-black">{discountSchemes.length}</span>
            </div>
            <div className="text-[11px] font-bold text-foreground">Discounts</div>
            <div className="text-[9px] text-default-400">Senior, PWD, Promo...</div>
          </button>

          <button
            type="button"
            onClick={() => {
              setDynamicConfigTab('damages');
              setShowDynamicConfig(true);
            }}
            className="p-2.5 rounded-xl border border-divider/20 bg-content1 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group cursor-pointer col-span-2 sm:col-span-1 active:scale-[0.98]"
          >
            <div className="flex items-center justify-between text-default-500 group-hover:text-primary mb-1 active:scale-[0.98]">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="text-[10px] font-black">{damageReasonsList.length}</span>
            </div>
            <div className="text-[11px] font-bold text-foreground">Damage Causes</div>
            <div className="text-[9px] text-default-400">Breakage, Defects...</div>
          </button>
        </div>
      </div>

      {/* Dynamic Entity Modal */}
      {showDynamicConfig && (
        <DynamicEntityConfigModal
          isOpen={showDynamicConfig}
          onClose={() => setShowDynamicConfig(false)}
          initialTab={dynamicConfigTab}
        />
      )}

      {/* RESTRICTED RBAC BANNER */}
      {!isAuthorized && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/25 text-amber-500 rounded-2xl flex items-start gap-3">
          <Shield className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black uppercase tracking-wider">View Only Mode</p>
            <p className="text-xs text-foreground font-medium leading-relaxed mt-0.5">
              Administrator privileges are required to change company settings or perform data resets.
            </p>
          </div>
        </div>
      )}

      {/* SECTION 1: APPEARANCE & THEMES */}
      <div className="space-y-4">
        <div>
          <h4 className="text-xs font-black uppercase text-primary tracking-wider">
            Appearance &amp; Theme
          </h4>
          <p className="text-[11px] text-default-500">
            Choose theme colors, dark mode, and visual effects
          </p>
        </div>

        {/* HEROUI THEMES ENGINE */}
        <HeroUIAppearanceSettings
          darkMode={darkMode}
          onToggleDarkMode={setDarkMode ? (targetVal?: boolean) => setDarkMode(targetVal ?? !darkMode) : undefined}
        />

        {/* COLOR MODE SELECTOR */}
        <div className="p-4 border border-divider/20 rounded-2xl space-y-3 bg-content1 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-default-500">
              Color Mode
            </span>
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 tracking-wider">
              {darkMode ? 'DARK ACTIVE' : 'LIGHT ACTIVE'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Light Mode */}
            <button
              type="button"
              onClick={() => {
                if (setFollowSystemTheme) setFollowSystemTheme(false);
                document.documentElement.classList.remove('dark');
                localStorage.setItem('tilepoint_dark_theme', 'false');
                saveHeroUIConfig({ mode: 'light' });
                if (setDarkMode) setDarkMode(false);
                window.dispatchEvent(new CustomEvent('tilepoint-dark-mode-toggle', { detail: false }));
                window.dispatchEvent(new CustomEvent('tilepoint-theme-updated', { detail: { darkMode: false } }));
              }}
              className={`p-3 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                !darkMode && !followSystemTheme
                  ? 'bg-primary/10 border-primary text-foreground shadow-2xs'
                  : 'border-divider/20 hover:bg-content2'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sun className={`h-4 w-4 ${!darkMode && !followSystemTheme ? 'text-primary' : 'text-default-500'}`} />
                <span className="text-xs font-bold font-sans">Light Mode</span>
              </div>
              {!darkMode && !followSystemTheme && <Check className="h-4 w-4 text-primary" />}
            </button>

            {/* Dark Mode */}
            <button
              type="button"
              onClick={() => {
                if (setFollowSystemTheme) setFollowSystemTheme(false);
                document.documentElement.classList.add('dark');
                localStorage.setItem('tilepoint_dark_theme', 'true');
                saveHeroUIConfig({ mode: 'dark' });
                if (setDarkMode) setDarkMode(true);
                window.dispatchEvent(new CustomEvent('tilepoint-dark-mode-toggle', { detail: true }));
                window.dispatchEvent(new CustomEvent('tilepoint-theme-updated', { detail: { darkMode: true } }));
              }}
              className={`p-3 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                darkMode && !followSystemTheme
                  ? 'bg-primary/10 border-primary text-foreground shadow-2xs'
                  : 'border-divider/20 hover:bg-content2'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Moon className={`h-4 w-4 ${darkMode && !followSystemTheme ? 'text-primary' : 'text-default-500'}`} />
                <span className="text-xs font-bold font-sans">Dark Mode</span>
              </div>
              {darkMode && !followSystemTheme && <Check className="h-4 w-4 text-primary" />}
            </button>

            {/* Follow System */}
            {setFollowSystemTheme && (
              <button
                type="button"
                onClick={() => {
                  const newVal = !followSystemTheme;
                  setFollowSystemTheme(newVal);
                  if (newVal) {
                    const isDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
                    if (setDarkMode) setDarkMode(isDark);
                  }
                  window.dispatchEvent(new Event('tilepoint-theme-updated'));
                }}
                className={`p-3 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                  followSystemTheme
                    ? 'bg-primary/10 border-primary text-foreground shadow-2xs'
                    : 'border-divider/20 hover:bg-content2'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sliders className={`h-4 w-4 ${followSystemTheme ? 'text-primary' : 'text-default-500'}`} />
                  <span className="text-xs font-bold font-sans">Follow System</span>
                </div>
                {followSystemTheme && <Check className="h-4 w-4 text-primary" />}
              </button>
            )}
          </div>
        </div>

        {/* PERFORMANCE & DISPLAY TOGGLES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SettingToggleCard
            icon={Square}
            title="Reduce Transparency"
            subtitle="Use solid backgrounds instead of blur effects"
            active={disableUiBlurs}
            onClick={() => updateSetting('tilepoint-disable-ui-blurs', !disableUiBlurs)}
            activeLabel="ENABLED"
            inactiveLabel="DISABLED"
          />

          <SettingToggleCard
            icon={Droplets}
            title="Disable Background Glow"
            subtitle="Turn off ambient background lighting effects"
            active={disableBackdropBlurs}
            onClick={() => updateSetting('tilepoint-disable-backdrop-blurs', !disableBackdropBlurs)}
            activeLabel="ENABLED"
            inactiveLabel="DISABLED"
          />

          <SettingToggleCard
            icon={Sparkles}
            title="Disable Animations"
            subtitle="Turn off transition and motion effects"
            active={disableAnimations}
            onClick={() => updateSetting('tilepoint-disable-animations', !disableAnimations)}
            activeLabel="ENABLED"
            inactiveLabel="DISABLED"
          />

          <SettingToggleCard
            icon={Download}
            title="Hide Install Prompt"
            subtitle="Don't show the app install banner"
            active={disableInstallPrompt}
            onClick={() => updateSetting('tilepoint-disable-install-prompt', !disableInstallPrompt)}
            activeLabel="HIDDEN"
            inactiveLabel="VISIBLE"
          />

          <SettingToggleCard
            icon={Clock}
            title="Disable Idle Screensaver"
            subtitle="Keep screen active without showing the idle clock"
            active={disableIdleClock}
            onClick={() => updateSetting('tilepoint-disable-idle-clock', !disableIdleClock)}
            activeLabel="ENABLED"
            inactiveLabel="DISABLED"
          />
        </div>
      </div>

      <div className="h-px bg-divider/20" />

      {/* SECTION 2: ACCESSIBILITY & TYPOGRAPHY */}
      <div className="space-y-4">
        <div>
          <h4 className="text-xs font-black uppercase text-primary tracking-wider">
            Accessibility &amp; Text
          </h4>
          <p className="text-[11px] text-default-500">
            Adjust text size, contrast, and font readability
          </p>
        </div>

        {/* FONT SCALE MULTIPLIER */}
        <div className="p-4 border border-divider/20 rounded-2xl space-y-3 bg-content1 shadow-2xs">
          <div className="flex justify-between items-center">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-default-500 block">
                Text Size
              </label>
              <span className="text-[10px] text-default-400">Scale all text, forms, tables, and buttons across TilePoint</span>
            </div>
            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              Active: {textSize === 'small' ? 'Small (14px)' : textSize === 'large' ? 'Large (18px)' : textSize === 'xlarge' ? 'X-Large (20px)' : 'Normal (16px)'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { id: 'small', name: 'Small', ratio: '0.88x (14px)', desc: 'Compact layout' },
              { id: 'normal', name: 'Normal', ratio: '1.0x (16px)', desc: 'Standard size' },
              { id: 'large', name: 'Large', ratio: '1.125x (18px)', desc: 'Larger text' },
              { id: 'xlarge', name: 'X-Large', ratio: '1.25x (20px)', desc: 'Maximum size' },
            ].map((sz) => (
              <button
                key={sz.id}
                type="button"
                onClick={() => updateSetting('tilepoint-text-size', sz.id)}
                className={`p-3 rounded-xl border flex flex-col justify-center items-center gap-1 transition-all cursor-pointer text-center ${
                  textSize === sz.id
                    ? 'bg-primary/10 border-primary text-primary shadow-2xs'
                    : 'bg-content2/50 border-divider/20 hover:bg-content2 text-default-600'
                }`}
              >
                <Type className="h-4 w-4" />
                <span className="text-xs font-black font-sans">{sz.name}</span>
                <span className="text-[9.5px] font-bold text-primary/80">{sz.ratio}</span>
                <span className="text-[9px] text-default-400">{sz.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* COLOR CONTRAST SELECTION */}
        <div className="p-4 border border-divider/20 rounded-2xl space-y-3 bg-content1 shadow-2xs">
          <label className="text-[10px] font-black uppercase tracking-wider text-default-500 block">
            Color Contrast
          </label>
          <div className="grid grid-cols-3 gap-2 p-1.5 rounded-xl bg-content2">
            {(['small', 'medium', 'high'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => updateSetting('tilepoint-color-contrast', level)}
                className={`py-2 px-3 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer text-center ${
                  colorContrast === level || (level === 'small' && colorContrast === 'small')
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'text-default-500 hover:text-foreground'
                }`}
              >
                {level === 'small' ? 'Standard' : level === 'medium' ? 'Enhanced' : 'High Contrast'}
              </button>
            ))}
          </div>
        </div>

        {/* ACCESSIBILITY TOGGLES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <SettingToggleCard
            icon={CaseSensitive}
            title="Dyslexic Font"
            subtitle="Specialized letter shapes for easier reading"
            active={dyslexicFont}
            onClick={() => updateSetting('tilepoint-dyslexic-font', !dyslexicFont)}
          />

          <SettingToggleCard
            icon={Layers}
            title="High Contrast Text"
            subtitle="Increases contrast between text and backgrounds"
            active={maximizeTextContrast}
            onClick={() => updateSetting('tilepoint-maximize-text-contrast', !maximizeTextContrast)}
          />

          <SettingToggleCard
            icon={Keyboard}
            title="Focus Outlines"
            subtitle="Shows clear borders around focused buttons and fields"
            active={enhancedOutlines}
            onClick={() => updateSetting('tilepoint-enhanced-outlines', !enhancedOutlines)}
          />
        </div>
      </div>

      {/* SECTION 3: ENTERPRISE BUSINESS RULES (ADMIN ONLY) */}
      {currentUser?.role === UserRole.ADMIN && (
        <>
          <div className="h-px bg-divider/20" />

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black uppercase text-primary tracking-wider">
                  Company Profile &amp; POS Settings
                </h4>
                <p className="text-[11px] text-default-500">
                  Set store name, tax rate, currency, and receipt preferences
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveEnterpriseSettings}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider rounded-xl shadow-2xs hover:opacity-90 active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save Changes</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Enterprise Name */}
              <div className="flex flex-col gap-1.5 border border-divider/20 bg-content1 p-4 rounded-2xl">
                <label className="text-[10px] font-black uppercase tracking-wider text-default-500">
                  Store / Business Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="bg-content2 border border-divider/40 rounded-xl text-xs font-bold p-2.5 w-full text-foreground outline-none focus:border-primary font-sans"
                  placeholder="e.g. TilePoint Store"
                />
              </div>

              {/* Tax Rate */}
              <div className="flex flex-col gap-1.5 border border-divider/20 bg-content1 p-4 rounded-2xl">
                <label className="text-[10px] font-black uppercase tracking-wider text-default-500">
                  VAT Tax Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Math.max(0, Number(e.target.value)))}
                  className="bg-content2 border border-divider/40 rounded-xl text-xs font-bold p-2.5 w-full text-foreground outline-none focus:border-primary font-sans"
                />
              </div>

              {/* Currency Symbol */}
              <div className="flex flex-col gap-1.5 border border-divider/20 bg-content1 p-4 rounded-2xl">
                <HeroSelect
                  label="Base Currency"
                  value={currency}
                  onValueChange={(val) => setCurrency(val)}
                  radius="md"
                  items={[
                    { key: '₱', value: '₱', label: '₱ Philippine Peso (PHP)' },
                    { key: '$', value: '$', label: '$ US Dollar (USD)' },
                    { key: '€', value: '€', label: '€ Euro (EUR)' },
                    { key: '¥', value: '¥', label: '¥ Japanese Yen (JPY)' },
                    { key: '£', value: '£', label: '£ British Pound (GBP)' },
                  ]}
                />
              </div>

              {/* Manager Safety PIN */}
              <div className="flex flex-col gap-1.5 border border-divider/20 bg-content1 p-4 rounded-2xl">
                <label className="text-[10px] font-black uppercase tracking-wider text-default-500">
                  Manager Approval PIN (4 Digits)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={managerPin}
                  onChange={(e) => setManagerPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="bg-content2 border border-divider/40 rounded-xl text-xs font-bold p-2.5 w-full text-center tracking-widest text-foreground outline-none focus:border-primary"
                />
              </div>

              {/* Receipt Logo Height */}
              <div className="flex flex-col gap-1.5 border border-divider/20 bg-content1 p-4 rounded-2xl sm:col-span-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black uppercase tracking-wider text-default-500">
                    Receipt Logo Size
                  </label>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    {logoSize}px
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px] text-default-400 font-bold">20px</span>
                  <input
                    type="range"
                    min="20"
                    max="120"
                    value={logoSize}
                    onChange={(e) => setLogoSize(Number(e.target.value))}
                    className="flex-1 accent-primary h-1.5 bg-content2 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-[10px] text-default-400 font-bold">120px</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="h-px bg-divider/20" />

      {/* SECTION 4: ABOUT & SYSTEM INFORMATION */}
      <div className="space-y-4 text-left">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-black uppercase text-primary tracking-wider flex items-center gap-2">
              <Info className="h-4 w-4" /> System Information
            </h4>
            <p className="text-[11px] text-default-500">
              Software version, active branch, and database status
            </p>
          </div>
          <span className="text-[9.5px] font-black uppercase px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            v2.4.0
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Build Info */}
          <div className="p-4 rounded-2xl border border-divider/20 bg-content1 space-y-1">
            <div className="flex items-center gap-2 text-default-500">
              <Cpu className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-wider">Application</span>
            </div>
            <div className="text-xs font-bold text-foreground">TilePoint POS v2.4.0</div>
            <div className="text-[10px] text-default-400">POS &amp; Inventory System</div>
          </div>

          {/* Branch & Company */}
          <div className="p-4 rounded-2xl border border-divider/20 bg-content1 space-y-1">
            <div className="flex items-center gap-2 text-default-500">
              <Building2 className="h-4 w-4 text-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-wider">Current Store</span>
            </div>
            <div className="text-xs font-bold text-foreground">{companyName || 'Main Store'}</div>
            <div className="text-[10px] text-default-400">
              Active Branch: {branches.find((b) => b.id === currentUser?.branchAssignmentId)?.name || branches[0]?.name || 'Central'}
            </div>
          </div>

          {/* Database Engine */}
          <div className="p-4 rounded-2xl border border-divider/20 bg-content1 space-y-1">
            <div className="flex items-center gap-2 text-default-500">
              <Database className="h-4 w-4 text-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-wider">Database Storage</span>
            </div>
            <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span>{mysqlStatus?.active || !serverDegradedState?.isDegraded ? 'Online Database' : 'Offline Local Cache'}</span>
              <span className={`h-2 w-2 rounded-full ${mysqlStatus?.active || !serverDegradedState?.isDegraded ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </div>
            <div className={`text-[10px] font-bold ${mysqlStatus?.active || !serverDegradedState?.isDegraded ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              ● {mysqlStatus?.active || !serverDegradedState?.isDegraded ? `Connected (${mysqlStatus?.totalRecords || 'Synced'} records)` : 'Buffered mode (Local writes)'}
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-divider/20" />

      {/* SECTION 5: DATABASE ENGINE & BACKUP MANAGEMENT */}
      <div className="space-y-4 text-left">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-black uppercase text-primary tracking-wider flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-primary" /> Database &amp; Backups
            </h4>
            <p className="text-[11px] text-default-500">
              Synchronize data with the database and manage backup files
            </p>
          </div>
          <span className="text-[9.5px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            {mysqlStatus?.active ? 'Connected' : 'Connecting'} ({mysqlStatus?.totalTables || 29} Tables)
          </span>
        </div>

        {mysqlSyncToast && (
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-bold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{mysqlSyncToast}</span>
          </div>
        )}

        {snapshotSuccessToast && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{snapshotSuccessToast}</span>
          </div>
        )}

        {/* MySQL Priority & Synchronization Action Card */}
        <div className="p-4 rounded-2xl border border-primary/30 bg-primary/5 space-y-3 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                <span className="text-xs font-black uppercase text-foreground tracking-wider">
                  Database Connection
                </span>
                <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Connected &amp; Active
                </span>
              </div>
              <p className="text-[11px] text-default-500 mt-1">
                Database: <span className="font-mono font-bold text-foreground">{mysqlStatus?.database || 'tilepoint_db'}</span> | Host: <span className="font-mono text-foreground">{mysqlStatus?.host || '127.0.0.1'}</span> | Records: <span className="font-bold text-foreground">{mysqlStatus?.totalRecords || 'Live'}</span>
              </p>
            </div>

            <button
              type="button"
              disabled={isSyncingMysql}
              onClick={handleSyncToMysql}
              className="px-4 py-2.5 bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider rounded-xl shadow-2xs hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncingMysql ? 'animate-spin' : ''}`} />
              <span>{isSyncingMysql ? 'Syncing Data...' : 'Sync All Data Now'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Quick Actions Card */}
          <div className="p-4 rounded-2xl border border-divider/20 bg-content1 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-default-500">
                Backup &amp; Export
              </span>
              <span className="text-[9px] text-default-400 font-medium">JSON File</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                disabled={isCreatingSnapshot}
                onClick={async () => {
                  setIsCreatingSnapshot(true);
                  try {
                    await createDbSnapshot(
                      `Manual Backup - ${new Date().toLocaleTimeString()}`
                    );
                    handleExportDatabaseJson();
                    setSnapshotSuccessToast('Backup snapshot created and downloaded successfully.');
                    setTimeout(() => setSnapshotSuccessToast(null), 4500);
                  } catch (e: any) {
                    alert('Failed to create backup: ' + (e?.message || 'Unknown error'));
                  } finally {
                    setIsCreatingSnapshot(false);
                  }
                }}
                className="flex-1 px-3.5 py-2.5 bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider rounded-xl shadow-2xs hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isCreatingSnapshot ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span>{isCreatingSnapshot ? 'Creating...' : 'Create Snapshot'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleExportDatabaseJson();
                  setSnapshotSuccessToast('Database backup downloaded.');
                  setTimeout(() => setSnapshotSuccessToast(null), 3000);
                }}
                className="px-3.5 py-2.5 bg-content2 hover:bg-content3 text-foreground font-black text-xs uppercase tracking-wider rounded-xl border border-divider/30 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
              >
                <FolderArchive className="h-4 w-4" />
                <span>Download JSON</span>
              </button>
            </div>
          </div>

          {/* Auto Backup Config Card */}
          <div className="p-4 rounded-2xl border border-divider/20 bg-content1 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-default-500">
                Automatic Backups
              </span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${autoBackupEnabled ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-default-100 text-default-500'}`}>
                {autoBackupEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <HeroSelect
                label="Interval"
                value={autoBackupEnabled ? String(backupIntervalHours) : '0'}
                onValueChange={(valStr) => {
                  const val = Number(valStr);
                  if (val === 0) {
                    setAutoBackupEnabled(false);
                  } else {
                    setAutoBackupEnabled(true);
                    setBackupIntervalHours(val);
                  }
                }}
                radius="md"
                items={[
                  { key: '0', value: '0', label: 'Disabled (Manual Only)' },
                  { key: '1', value: '1', label: 'Every 1 Hour' },
                  { key: '6', value: '6', label: 'Every 6 Hours' },
                  { key: '12', value: '12', label: 'Every 12 Hours' },
                  { key: '24', value: '24', label: 'Every 24 Hours (Daily)' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Direct Link / Navigation to Database & Backups Hub */}
        <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-foreground">
                Backup &amp; History Center
              </div>
              <p className="text-[11px] text-default-500 font-medium">
                View snapshot history, restore previous checkpoints, or inspect table records.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onClose) onClose();
              window.location.hash = '/archives';
              window.dispatchEvent(new HashChangeEvent('hashchange'));
            }}
            className="px-4 py-2 bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider rounded-xl shadow-2xs hover:opacity-90 active:scale-95 transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
          >
            <span>Open Database Hub</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* SECTION 5: FACTORY OPERATIONS & DATA RESET (ADMIN ONLY) */}
      {currentUser?.role === UserRole.ADMIN && (
        <>
          <div className="h-px bg-divider/20" />

          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-black uppercase text-rose-500 tracking-wider flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" /> Data Reset &amp; System Restore
              </h4>
              <p className="text-[11px] text-default-500 mt-0.5">
                Reset inventory quantities, clear transaction data, or restore factory defaults.
              </p>
            </div>

            {/* Retention Notice */}
            <div className="p-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-xs text-default-600 flex items-start gap-2.5">
              <Shield className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-500 uppercase tracking-wider block text-[10px]">
                  Important Safeguard
                </strong>
                <p className="text-[11px] mt-0.5">
                  Always download a database backup before performing any reset. Reset actions cannot be undone.
                </p>
              </div>
            </div>

            <div className="bg-rose-500/5 border border-rose-500/20 p-5 rounded-2xl space-y-4">
              {isRowClearingBlocked() && !forceUnlockReset ? (
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-left space-y-2">
                  <span className="text-[10px] font-black uppercase text-amber-500 tracking-wider block">
                    Safety Lock Active
                  </span>
                  <p className="text-xs text-foreground font-medium">
                    Reset operations are currently locked because: <strong className="text-amber-500">{getRowClearingBlockedReason()}</strong>.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {getRowClearingBlockedReason().includes('unexported shift payload') && (
                      <button
                        type="button"
                        onClick={() => {
                          forceCloseAllShifts();
                          alert('All unclosed shifts have been closed.');
                        }}
                        className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors border border-amber-500/30 cursor-pointer active:scale-[0.98]"
                      >
                        Force-Close Shifts
                      </button>
                    )}
                    {getRowClearingBlockedReason().includes('open checkout list') && (
                      <button
                        type="button"
                        onClick={() => {
                          localStorage.removeItem('tp_active_cart');
                          window.location.reload();
                        }}
                        className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors border border-amber-500/30 cursor-pointer active:scale-[0.98]"
                      >
                        Clear Cart
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setForceUnlockReset(true)}
                      className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors border border-rose-500/30 cursor-pointer active:scale-[0.98]"
                    >
                      Bypass Safety Guard
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-rose-500">
                      Authorization Confirmation {forceUnlockReset && <span className="text-amber-500">(Bypassed)</span>}
                    </label>
                    <p className="text-xs text-default-500 mt-0.5">
                      Type <span className="font-black text-rose-500 select-all">RESET</span> to unlock reset buttons:
                    </p>
                  </div>
                  <input
                    type="text"
                    value={resetConfirmation}
                    onChange={(e) => setResetConfirmation(e.target.value.toUpperCase())}
                    placeholder="Type RESET"
                    className="bg-content1 border border-rose-500/40 rounded-xl text-xs font-bold p-2.5 w-full sm:w-48 text-rose-500 outline-none focus:border-rose-500 text-center tracking-widest uppercase"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-rose-500/10">
                {/* Reset Stocks */}
                <div className="border border-divider/20 bg-content1 p-4 rounded-2xl flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[10px] font-black text-amber-500 uppercase block">Level 1</span>
                    <h5 className="font-bold text-xs text-foreground mt-0.5">Reset Stock Levels</h5>
                    <p className="text-[10px] text-default-400 mt-1">Clears transactions &amp; sets inventory counts to 0</p>
                  </div>
                  <HoldToConfirmButton
                    disabled={resetConfirmation !== 'RESET' || (isRowClearingBlocked() && !forceUnlockReset)}
                    onConfirm={async () => {
                      try {
                        await truncateDatabase('transactions');
                      } catch (err) {
                        console.warn('[Reset Stocks] Truncate error:', err);
                      }
                      setResetConfirmation('');
                      alert('Inventory levels reset to 0 in database and local cache.');
                    }}
                    variant="amber"
                  >
                    Hold to Reset Stocks
                  </HoldToConfirmButton>
                </div>

                {/* Full DB Wipe */}
                <div className="border border-divider/20 bg-content1 p-4 rounded-2xl flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[10px] font-black text-rose-500 uppercase block">Level 2</span>
                    <h5 className="font-bold text-xs text-foreground mt-0.5">Clear All Records</h5>
                    <p className="text-[10px] text-default-400 mt-1">Deletes all catalog products and sales records</p>
                  </div>
                  <HoldToConfirmButton
                    disabled={resetConfirmation !== 'RESET' || (isRowClearingBlocked() && !forceUnlockReset)}
                    onConfirm={async () => {
                      try {
                        await truncateDatabase('all');
                      } catch (err) {
                        console.warn('[Full Wipe] Truncate error:', err);
                      }
                      setResetConfirmation('');
                      alert('Full database purge completed.');
                    }}
                    variant="rose"
                  >
                    Hold to Clear All
                  </HoldToConfirmButton>
                </div>

                {/* Factory Reset */}
                <div className="border border-divider/20 bg-content1 p-4 rounded-2xl flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[10px] font-black text-purple-500 uppercase block">Level 3</span>
                    <h5 className="font-bold text-xs text-foreground mt-0.5">Factory Reset</h5>
                    <p className="text-[10px] text-default-400 mt-1">Clears all data and restarts the setup wizard</p>
                  </div>
                  <HoldToConfirmButton
                    disabled={resetConfirmation !== 'RESET'}
                    onConfirm={async () => {
                      try {
                        await truncateDatabase('all');
                      } catch (err) {
                        console.warn('[Factory Reset] Truncate error:', err);
                      }
                      localStorage.clear();
                      sessionStorage.clear();
                      localStorage.setItem('tp_is_configured', 'false');
                      localStorage.setItem('tilepoint_onboarded_setup', 'false');
                      setResetConfirmation('');
                      alert('System reset to factory state. Rebooting...');
                      window.location.href = '/';
                    }}
                    variant="rose"
                  >
                    Hold to Factory Reset
                  </HoldToConfirmButton>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SystemSettingsModule;
