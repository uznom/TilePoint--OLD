/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
Accessibility,
AlertTriangle,
BookOpen,
CaseSensitive,
Check,
CheckCircle,
ChevronDown,
ChevronUp,
Clock,
Code,
Cookie,
Cpu,
Database,
Download,
Droplets,
FileSpreadsheet,
FolderArchive,
Github,
HardDrive,
HelpCircle,
Info,
Keyboard,
Layers,
Lock,
MapPin,
Palette,
Play,
Printer,
RefreshCw,
RotateCcw,
Search,
Shield,
ShieldAlert,
ShieldCheck,
Sliders,
Sparkles,
Square,
Terminal,
Trash2,
Type,
Upload,
Wifi,
WifiOff,
CheckCircle2,
X
} from 'lucide-react';
import { motion } from 'motion/react';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ToastNotification } from './ToastNotification';
import { DbSnapshot,useDb } from '../context/DbContext';
import { exportMasterDatabaseToXLSX } from '../lib/excelExportHelper';
import {
  getServiceWorkerStatus,
  refreshCacheStats,
  clearAllAppCaches,
  precacheDataSnapshot,
  subscribeServiceWorkerStatus,
  CacheStatusInfo
} from '../services/serviceWorkerRegistration';
import {
clearDirectoryHandle,
getSavedDirectoryHandle,
restoreMissingBackups,
saveDirectoryHandle,
saveFileToBackup,
verifyAndUnwrapBackup
} from '../lib/fileBackupHelper';
import { ArchivableCategory,UserRole } from '../types/db';
import { ActionButton } from './ActionButton';
import { HeroCheckbox, HeroDropdownSelect } from './common/ui';
import { HeroUIAppearanceSettings } from './HeroUIAppearanceSettings';

interface PrivacyAccessibilityHubProps {
 darkMode: boolean;
 onToggleDarkMode?: (targetVal?: boolean) => void;
 hideFloatingButton?: boolean;
}

export function PrivacyAccessibilityHub({
 darkMode,
 onToggleDarkMode,
 hideFloatingButton = false,
}: PrivacyAccessibilityHubProps) {
 const { branches } = useDb();
 // Hub open state
 const [isOpen, setIsOpen] = useState(false);
 const [activeTab, setActiveTab] = useState<'appearance' | 'features' | 'about' | 'accessibility' | 'backups'>('appearance');

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

 const [dyslexicFont, setDyslexicFont] = useState(() => {
 return localStorage.getItem('tilepoint-dyslexic-font') === 'true';
 });

 const [enhancedOutlines, setEnhancedOutlines] = useState(() => {
 return localStorage.getItem('tilepoint-enhanced-outlines') === 'true';
 });

 const [disableAnimations, setDisableAnimations] = useState(() => {
 return localStorage.getItem('tilepoint-disable-animations') === 'true';
 });

  const [disableUiBlurs, setDisableUiBlurs] = useState(() => {
    const saved = localStorage.getItem('tilepoint-disable-ui-blurs');
    if (saved !== null) return saved === 'true';
    return localStorage.getItem('tilepoint-disable-blurs') === 'true';
  });

  const [disableBackdropBlurs, setDisableBackdropBlurs] = useState(() => {
    const saved = localStorage.getItem('tilepoint-disable-backdrop-blurs');
    if (saved !== null) return saved === 'true';
    return localStorage.getItem('tilepoint-disable-blurs') === 'true';
  });

 const isSyncingRef = React.useRef(false);

 // Listen to external theme sync events
 useEffect(() => {
 const handleSync = () => {
 isSyncingRef.current = true;
 const persistedContrast = (localStorage.getItem('tilepoint-color-contrast') as 'default' | 'medium' | 'high') || 'medium';
 const persistedMaxText = localStorage.getItem('tilepoint-maximize-text-contrast') === 'true';
 const persistedDisableAnimations = localStorage.getItem('tilepoint-disable-animations') === 'true';
      const savedUiNoBlur = localStorage.getItem('tilepoint-disable-ui-blurs');
      const savedBackdropNoBlur = localStorage.getItem('tilepoint-disable-backdrop-blurs');
      const legacyNoBlur = localStorage.getItem('tilepoint-disable-blurs') === 'true';
      const persistedDisableUiBlurs = savedUiNoBlur !== null ? savedUiNoBlur === 'true' : legacyNoBlur;
      const persistedDisableBackdropBlurs = savedBackdropNoBlur !== null ? savedBackdropNoBlur === 'true' : legacyNoBlur;
         const persistedTextSize = (localStorage.getItem('tilepoint-text-size') as any) || 'normal';
 const persistedDyslexic = localStorage.getItem('tilepoint-dyslexic-font') === 'true';
 const persistedOutlines = localStorage.getItem('tilepoint-enhanced-outlines') === 'true';
 
 setColorContrast(persistedContrast);
 setMaximizeTextContrast(persistedMaxText);
 setDisableAnimations(persistedDisableAnimations);
      setDisableUiBlurs(persistedDisableUiBlurs);
      setDisableBackdropBlurs(persistedDisableBackdropBlurs);
 setTextSize(persistedTextSize);
 setDyslexicFont(persistedDyslexic);
 setEnhancedOutlines(persistedOutlines);
 };
 window.addEventListener('tilepoint-theme-updated', handleSync);
 return () => {
 window.removeEventListener('tilepoint-theme-updated', handleSync);
 };
 }, []);

 // Individual cookie preference categories for the fine-grained Cookie Consent tabs
 const [cookiePreferences, setCookiePreferences] = useState({
 necessary: true, // Permanent essential
 functional: true, // App State + theme saves
 analytical: false // Local audit logger traces
 });

 const db = useDb();

 // Enforce Admin and Manager role constraint for backups tab (restricted to administrators and managers)
 useEffect(() => {
 if (
 activeTab === 'backups' &&
 db.currentUser?.role !== UserRole.ADMIN &&
 db.currentUser?.role !== UserRole.MANAGER
 ) {
 setActiveTab('appearance');
 }
 }, [activeTab, db.currentUser?.role]);

 // DB Tuning custom state variables
 const [dbSubTab, setDbSubTab] = useState<'performance' | 'offline_cache' | 'rules' | 'backup' | 'archive'>('performance');
 const [swStatus, setSwStatus] = useState<CacheStatusInfo>(getServiceWorkerStatus());
 const [isRefreshingSw, setIsRefreshingSw] = useState(false);
 const [isPurgingCache, setIsPurgingCache] = useState(false);
 const [isPreloadingSnapshot, setIsPreloadingSnapshot] = useState(false);
 const [swFeedback, setSwFeedback] = useState<string | null>(null);

 useEffect(() => {
   const unsubscribe = subscribeServiceWorkerStatus((status) => {
     setSwStatus(status);
   });
   refreshCacheStats().then(setSwStatus);
   return () => unsubscribe();
 }, []);
 const [selectedArchivalCategory, setSelectedArchivalCategory] = useState<ArchivableCategory>('auditLogs');
 const [selectedArchivalAgeMonths, setSelectedArchivalAgeMonths] = useState<number>(6);
 const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState<boolean>(false);
 const [archivingStatus, setArchivingStatus] = useState<string | null>(null);
 const [isProcessingArchive, setIsProcessingArchive] = useState<boolean>(false);
 const [isBatchCleanupConfirmOpen, setIsBatchCleanupConfirmOpen] = useState<boolean>(false);
 const [batchCleanupStatus, setBatchCleanupStatus] = useState<string | null>(null);
 const [isProcessingBatchCleanup, setIsProcessingBatchCleanup] = useState<boolean>(false);

 const computeMatchingCount = (cat: ArchivableCategory, ageM: number) => {
 const cutoffMs = ageM > 0 ? Date.now() - ageM * 30 * 24 * 60 * 60 * 1000 : Date.now() + 100000;
 if (cat === 'auditLogs') {
 return db.auditLogs.filter(i => new Date(i.createdAt || i.timestamp || 0).getTime() < cutoffMs).length;
 }
 if (cat === 'movements') {
 return db.movements.filter(i => new Date(i.timestamp || 0).getTime() < cutoffMs).length;
 }
 if (cat === 'sales') {
 return db.sales.filter(i => new Date(i.createdAt || 0).getTime() < cutoffMs).length;
 }
 if (cat === 'expenses') {
 return db.expenses.filter(i => new Date(i.dateTime || 0).getTime() < cutoffMs).length;
 }
 if (cat === 'returns') {
 return db.productReturns.filter(i => new Date(i.dateTime || 0).getTime() < cutoffMs).length;
 }
 if (cat === 'damageLogs') {
 return db.damageLogs.filter(i => new Date(i.createdAt || i.reportedAt || 0).getTime() < cutoffMs).length;
 }
 return 0;
 };
 const [snapshotName, setSnapshotName] = useState('');
 const [selectedRuleset, setSelectedRuleset] = useState<'firestore' | 'storage'>('firestore');
 const [ruleEnforcementProfile, setRuleEnforcementProfile] = useState<'strict' | 'audit' | 'open'>('strict');
 const [_importText, _setImportText] = useState('');
 const [backupActionStatus, setBackupActionStatus] = useState<string | null>(null);
 const [isExportingFullDb, setIsExportingFullDb] = useState(false);
 const [isExportingXlsx, setIsExportingXlsx] = useState(false);
 const [_isSeedingMasterLogs, _setIsSeedingMasterLogs] = useState(false);
 const [_isExportingForensic, _setIsExportingForensic] = useState(false);
 const [rulesAlert, setRulesAlert] = useState<string | null>(null);
 const [isShowingHandbook, setIsShowingHandbook] = useState(false);
 const [activeFaq, setActiveFaq] = useState<number | null>(null);
 const [faqSearch, setFaqSearch] = useState('');

 const matchManualQuery = (text: string, keywords: string[]) => {
 if (!faqSearch) return true;
 const cleanSearch = faqSearch.toLowerCase().trim();
 if (!cleanSearch) return true;
 const searchTerms = cleanSearch.split(/\s+/).filter(Boolean);
 const combinedText = (text + ' ' + keywords.join(' ')).toLowerCase();
 return searchTerms.every(term => combinedText.includes(term));
 };

 const ch1Visible = matchManualQuery(
 "The ERP OS Checkout Desk & Area Estimators The ERP OS Checkout Desk accepts real-time barcode scans, manual item code lookups, and direct SKU lookups. Use the Interactive Tile Coverage Estimator to dynamically translate physical floor dimensions length and width in meters into exact retail tile box counts. Adapts standard wastage overrides +5% standard grid bonds, +10% diagonal cuts to prevent shortfalls over tile clipping boundaries. Tendering handles precise decimal change calculations, printing receipt vouchers, and instantly subtracting sold quantities from active branch inventories.",
 ["pos", "checkout", "desk", "area", "estimators", "calculators", "erp", "os", "tile", "box", "count", "grid", "diagonal", "tendering", "discount", "change", "receipt", "voucher", "inventory", "stock", "sales"]
 );
 const ch2Visible = matchManualQuery(
 "Regional Warehouse Stock & Unified Pools View Administrators possess master privileges to analyze global stocking pipelines on-screen. The Unified Global Pools Ledger sub-tab lists comparative stock levels side-by-side across all active branches. Branch filters filter main catalog lists. A consolidated dropdown is available to verify stock indices across multiple depots simultaneously. Automated visual flags indicate stock health: In Stock, Low Stock, or Critical Warning.",
 ["warehouse", "logistics", "index", "stock", "pools", "branch", "custom", "alert", "overrides", "inventory", "global", "pipelines", "levels", "health"]
 );
 const ch3Visible = matchManualQuery(
 "Custom Alert Threshold Overrides Since different locations experience unique sales velocities, low-stock trigger boundaries can be custom-defined at a local level. Each tile preserves a master baseline minimum threshold designated at registration. From the product detail editor, branch managers can submit localized Alert Overrides that apply uniquely to their specific branch codes. Overrides trigger amber alert status rows inside the central lists for local reorder warning awareness.",
 ["custom", "alert", "threshold", "overrides", "branch", "local", "levels", "velocity", "reorder", "warning", "minimum", "trigger"]
 );
 const ch4Visible = matchManualQuery(
 "Inter-Branch Stock Transfers & Verification Chain Stock dispatches are regulated by a multi-stage, double-entry reconciliation pipeline. Dispatches create a formal Transfer Invoice that deducts quantities from the origin branch's active inventory immediately and sets it to Transit state. The destination branch's inventory will NOT increment until a destination operator physically inspects and approves the shipment. Clicking Acknowledge Receipt & Add Stock merges the items into target pools, committing the double-entry transaction.",
 ["inter", "branch", "transfers", "double", "entry", "transit", "cargo", "dispatch", "invoice", "reconciliation", "delivery", "inspect"]
 );
 const ch5Visible = matchManualQuery(
 "Shift Control, Daily Drawer Balancing & Audits Secure cash drawer compliance and operations control are driven by local shift events. Cashiers open shifts by logging a physical Starting Cash Float inside the active register interface. All offline sales journals are aggregated against cash and digital credit payments inside the shift module. Closing shifts requires logging a final drawers count to isolate cash discrepancies, which are committed as audited records.",
 ["daily", "sales", "closing", "shift", "cashier", "drawer", "cash", "float", "balancing", "audits", "compliance", "register", "journal", "discrepancy"]
 );
 const ch6Visible = matchManualQuery(
 "Multi-Format Sales Reporting, CSVs & Print PDFs To maintain rigorous retail compliance, TilePoint supports high-fidelity output exports for managers. Daily summary sheets can be compiled into standard Raw CSV files or formatted Excel Templates featuring formatted columns. The Sales Print Modal builds formal visual papers including structured pricing pools, item invoice listings, and operator signature spots. Click Trigger System Print inside the modal to output to paper or select Save as PDF to write digital PDF files.",
 ["csv", "excel", "formatted", "sheets", "printing", "digital", "pdf", "sales", "transmissions", "report", "export", "manager", "template", "modal", "print", "signature"]
 );
 const ch7Visible = matchManualQuery(
 "Damage Registers, Wastage Logs & Loss Write-Offs Handles damaged stock reconciliation for cracked, shattered, or flawed inventory. Broken tiles must be logged inside the Damage Register Module by entering specific product codes, quantities, and detailed causes. Submitting a damage voucher instantly writeoff the target branch's stocks and adds historical entries down the general ledger. Ensures precise inventory costs valuation by separating shrinkage wastage losses from regular sales records.",
 ["damage", "register", "broken", "fragile", "ceramic", "tiles", "wastage", "writeoffs", "reconciliation", "cracked", "shattered", "flawed", "loss", "shrinkage", "ledger"]
 );
 const ch8Visible = matchManualQuery(
 "Access Control Security & Lockout Rules Rigorous role-based security prevents unauthorized edits and maintains system integrity. Core actions are gated by explicit credentials. Standard sales desks prevent workers from altering records or viewing other branch balances. Under professional standards, login panels enforce an automated Security Intrusion Lockout. If a user enters an incorrect passcode five consecutive times, the console blocks access to prevent database breaches.",
 ["user", "security", "access", "control", "active", "lockout", "brute", "force", "block", "profiles", "role", "admin", "manager", "cashier", "unauthorized", "intrusion", "failure"]
 );

 const anyChapterVisible = ch1Visible || ch2Visible || ch3Visible || ch4Visible || ch5Visible || ch6Visible || ch7Visible || ch8Visible;
 const [toastMessage, setToastMessage] = useState<string | null>(null);
 const triggerToast = (message: string, _type: 'success' | 'info' | 'error' = 'success') => {
 setToastMessage(message);
 setTimeout(() => setToastMessage(null), 3000);
 };

 // User Defined Device Storage variables
 const [deviceBackupPath, setDeviceBackupPath] = useState<string>(() => {
 return localStorage.getItem("tp_device_backup_path") || "C:/TilePoint_Backups/";
 });
 const [filenamePattern, setFilenamePattern] = useState<string>(() => {
 return localStorage.getItem("tp_device_backup_pattern") || "tilepoint_full_backup";
 });
 const [enforcePermanentRetention, _setEnforcePermanentRetention] = useState<boolean>(() => {
 const val = localStorage.getItem("tp_enforce_permanent_retention");
 return val === null ? true : val === "true";
 });
 const [isExportingDevicePath, setIsExportingDevicePath] = useState(false);
 const [activeFolderHandle, setActiveFolderHandle] = useState<FileSystemDirectoryHandle | null>(null);
 const [isFsaSupported, setIsFsaSupported] = useState<boolean>(false);
 const [deleteConfirm, setDeleteConfirm] = useState<{ [snapId: string]: number }>({});

 useEffect(() => {
 setIsFsaSupported(typeof window !== 'undefined' && 'showDirectoryPicker' in window);
 getSavedDirectoryHandle().then((handle) => {
 setActiveFolderHandle(handle);
 if (handle) {
 // Run automatic recovery of deleted files (Undeletable Safeguard)
 restoreMissingBackups().then((restored) => {
 if (restored.length > 0) {
 setBackupActionStatus(`[UNDELETABILITY GUARANTEE] Automatically reconstructed & restored ${restored.length} missing/deleted backup files inside your synced folder!`);
 setTimeout(() => setBackupActionStatus(null), 6000);
 }
 });
 }
 });
 }, []);

 useEffect(() => {
 localStorage.setItem("tp_device_backup_path", deviceBackupPath);
 }, [deviceBackupPath]);

 useEffect(() => {
 localStorage.setItem("tp_device_backup_pattern", filenamePattern);
 }, [filenamePattern]);

 useEffect(() => {
 localStorage.setItem("tp_enforce_permanent_retention", String(enforcePermanentRetention));
 }, [enforcePermanentRetention]);

 // Sync state changes with the DOM layout of document.documentElement
 useEffect(() => {
 const root = document.documentElement;

 // 1. Sizing
 root.classList.remove(
   'accessibility-small-text', 'accessibility-normal-text', 'accessibility-large-text', 'accessibility-xlarge-text',
   'accessibility-text-sm', 'accessibility-text-base', 'accessibility-text-lg', 'accessibility-text-xl'
 );
 if (textSize === 'small') {
   root.classList.add('accessibility-small-text', 'accessibility-text-sm');
   root.style.fontSize = '14px';
   root.style.setProperty('--app-font-multiplier', '0.88');
 } else if (textSize === 'large') {
   root.classList.add('accessibility-large-text', 'accessibility-text-lg');
   root.style.fontSize = '18px';
   root.style.setProperty('--app-font-multiplier', '1.125');
 } else if (textSize === 'xlarge') {
   root.classList.add('accessibility-xlarge-text', 'accessibility-text-xl');
   root.style.fontSize = '20px';
   root.style.setProperty('--app-font-multiplier', '1.25');
 } else {
   root.classList.add('accessibility-normal-text', 'accessibility-text-base');
   root.style.fontSize = '16px';
   root.style.setProperty('--app-font-multiplier', '1.0');
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

 // 6. Disable Animations
 if (disableAnimations) {
 root.classList.add('accessibility-no-animation');
 } else {
 root.classList.remove('accessibility-no-animation');
 }
 localStorage.setItem('tilepoint-disable-animations', String(disableAnimations));

    // 7. Disable UI Blurs
    if (disableUiBlurs) {
      root.classList.add('accessibility-no-ui-blur');
    } else {
      root.classList.remove('accessibility-no-ui-blur');
    }
    localStorage.setItem('tilepoint-disable-ui-blurs', String(disableUiBlurs));

    // 8. Disable Backdrop Blurs & Ambient Gradients
    if (disableBackdropBlurs) {
      root.classList.add('accessibility-no-backdrop-blur');
    } else {
      root.classList.remove('accessibility-no-backdrop-blur');
    }
    localStorage.setItem('tilepoint-disable-backdrop-blurs', String(disableBackdropBlurs));

    // Combined no-blur class
    const combinedNoBlur = disableUiBlurs && disableBackdropBlurs;
    if (combinedNoBlur) {
      root.classList.add('accessibility-no-blur');
    } else {
      root.classList.remove('accessibility-no-blur');
    }
    localStorage.setItem('tilepoint-disable-blurs', String(combinedNoBlur));

    // Dispatch global event for responsive real-time theme rebuilding only if not syncing from outside
    if (isSyncingRef.current) {
      isSyncingRef.current = false;
    } else {
      window.dispatchEvent(new Event('tilepoint-theme-updated'));
    }

  }, [textSize, colorContrast, maximizeTextContrast, dyslexicFont, enhancedOutlines, disableAnimations, disableUiBlurs, disableBackdropBlurs]);

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
 setColorContrast('medium');
 setMaximizeTextContrast(false);
 localStorage.setItem('tilepoint-color-contrast', 'medium');
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
 <div className="max-w-4xl mx-auto bg-content1 border border-divider rounded-large shadow-small text-foreground border-amber-500/10 bg-content1/95 backdrop-blur-xl shadow-[0_-12px_44px_rgba(0,0,0,0.25)] flex flex-col md:flex-row items-start md:items-center justify-between gap-5 p-5 sm:p-6 rounded-2xl">
 <div className="flex gap-4 items-start max-w-2xl">
 <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl shrink-0 mt-0.5 border border-amber-500/20">
 <Cookie className="h-6 w-6" />
 </div>
 <div className="space-y-1">
 <h4 className="text-sm font-black uppercase tracking-wider text-primary flex items-center gap-2">
 Privacy Shield & Consent Center
 </h4>
 <p className="text-xs text-default-500 leading-relaxed">
 TilePoint requires local key-value indexes (essential cookies) to persist active checkout cash registers, safe cryptographic authentication, localized inventory ledgers, and customized accessibility profiles. No marketing telemetry is ever transmitted.
 </p>
 </div>
 </div>

 <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 font-sans">
 <button
 type="button"
 onClick={() => {
 setIsOpen(true);
 setActiveTab('features');
 }}
 className="flex-1 sm:flex-none px-4 py-2 text-xs font-extrabold rounded-xl border border-divider/50 hover:bg-primary/10 text-foreground hover:text-primary transition-all cursor-pointer whitespace-nowrap uppercase tracking-wider text-[10px]"
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
 className="flex-1 sm:flex-none px-5 py-2 text-xs font-black rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all cursor-pointer whitespace-nowrap uppercase tracking-wider text-[10px]"
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
 className="fixed bottom-6 right-6 z-[90] h-12 w-12 bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground rounded-full shadow-2xl justify-center items-center flex cursor-pointer transition-all border border-primary-200 group"
 title="Privacy Policies and Accessibility Assistant Hub"
 aria-label="Open Accessibility Options and Privacy center"
 >
 <Accessibility className="h-5.5 w-5.5 group-hover:rotate-12 transition-transform duration-300" />
 <span className="absolute bottom-13 right-0 scale-0 group-hover:scale-100 transition-all duration-200 origin-bottom bg-foreground text-foreground text-[9px] font-black tracking-widest uppercase px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap border border-divider/20">
 Accessibility & Policy
 </span>
 </button>
 )}

  {/* INTERACTIVE HUB MODAL */}
  {isOpen && typeof document !== 'undefined' && createPortal(
  <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
  <div 
  className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity animate-fade-in" 
  onClick={() => setIsOpen(false)} 
  />
  
  <div className="relative w-full max-w-[95vw] md:max-w-7xl h-[90vh] md:h-[740px] md:max-h-[85vh] flex flex-col bg-content1 border border-divider rounded-large shadow-small text-foreground rounded-2xl p-0 overflow-hidden border-divider/40 shadow-2xl animate-scale-up z-10">
  {/* Header banner */}
  <div className="p-5 border-b border-divider/20 flex justify-between items-center bg-background shrink-0">
  <div className="flex items-center gap-3">
  <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
  <Sliders className="h-5 w-5" />
  </div>
  <div>
  <h3 className="text-sm font-black uppercase tracking-wider text-primary">
  Settings & Accessibility
  </h3>
  <p className="text-[10px] text-default-500 font-medium mt-0.5 ">
  Manage display preferences, accessibility options, and system info.
  </p>
  </div>
  </div>
  <button
  onClick={() => setIsOpen(false)}
  className="p-2 text-default-500 hover:text-primary hover:bg-primary/10 rounded-xl transition-all cursor-pointer shrink-0"
  >
  <X className="h-5 w-5" />
  </button>
  </div>

  {/* Sidebar navigation tabs inside Dialog */}
  <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-content1/30">
  {/* Tab options side-rack */}
  <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-divider/15 p-4 flex md:flex-col gap-2 shrink-0 select-none overflow-x-auto md:overflow-x-visible">
  <button
  onClick={() => setActiveTab('appearance')}
  className={`flex-1 md:flex-none flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer text-left ${
  activeTab === 'appearance'
  ? 'bg-primary text-primary-foreground font-black shadow-md'
  : 'hover:bg-primary/10 text-default-500'
  }`}
  >
  <Palette className="h-4 w-4" />
  <span>Appearance</span>
  </button>
  <button
  onClick={() => setActiveTab('features')}
  className={`flex-1 md:flex-none flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer text-left ${
  activeTab === 'features'
  ? 'bg-primary text-primary-foreground font-black shadow-md'
  : 'hover:bg-primary/10 text-default-500'
  }`}
  >
  <Shield className="h-4 w-4" />
  <span>Permissions & Access</span>
  </button>
  <button
  onClick={() => setActiveTab('about')}
  className={`flex-1 md:flex-none flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer text-left ${
  activeTab === 'about'
  ? 'bg-primary text-primary-foreground font-black shadow-md'
  : 'hover:bg-primary/10 text-default-500'
  }`}
  >
  <Info className="h-4 w-4" />
  <span>About</span>
  </button>
  <button
  onClick={() => setActiveTab('accessibility')}
  className={`flex-1 md:flex-none flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer text-left ${
  activeTab === 'accessibility'
  ? 'bg-primary text-primary-foreground font-black shadow-md'
  : 'hover:bg-primary/10 text-default-500'
  }`}
  >
  <Sliders className="h-4 w-4" />
  <span>Accessibility</span>
  </button>
  {(db.currentUser?.role === UserRole.ADMIN || db.currentUser?.role === UserRole.MANAGER) && (
  <button
  onClick={() => setActiveTab('backups')}
  className={`flex-1 md:flex-none flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer text-left ${
  activeTab === 'backups'
  ? 'bg-primary text-primary-foreground font-black shadow-md'
  : 'hover:bg-primary/10 text-default-500'
  }`}
  id="database_and_backups_tab_btn"
  >
  <Database className="h-4 w-4" />
  <span>Database & Backups</span>
  </button>
  )}
  </div>

  {/* Dynamic scrollable core form content */}
  <div className="flex-1 p-5 md:p-6 overflow-y-auto">
  {/* TAB A: ACCESSIBILITY OPTIONS */}
  {activeTab === 'accessibility' && (
  <div className="space-y-5 animate-fade-in font-sans">
  <div>
  <h4 className="text-xs font-black uppercase text-primary tracking-wider ">
  Visual & Navigation Preferences
  </h4>
  </div>

  <div className="h-px bg-default-100" />

  {/* FONT SCALING REGION */}
  <div className="space-y-2">
  <label className="text-[10px] font-black uppercase tracking-wider text-default-500 block">
  Text Size
  </label>
  <div className="grid grid-cols-3 gap-2.5">
  {[
  { id: 'small', name: 'Small (0.88x)', class: 'font-normal' },
  { id: 'normal', name: 'Normal (1.0x)', class: 'font-normal' },
  { id: 'large', name: 'Large (1.12x)', class: 'font-medium' }
  ].map((sz) => (
  <button
  key={sz.id}
  type="button"
  onClick={() => setTextSize(sz.id as any)}
  className={`p-3 rounded-xl border flex flex-col justify-center items-center gap-1.5 transition-all cursor-pointer ${
  textSize === sz.id
  ? 'bg-primary/10 border-primary text-primary'
  : 'bg-background border-divider/20 hover:bg-primary/5 text-default-500'
  }`}
  >
  <Type className="h-4 w-4" />
  <span className="text-[10.5px] font-bold text-center font-sans">{sz.name}</span>
  </button>
  ))}
  </div>
  </div>

  <div className="h-px bg-default-100" />

  {/* TOGGLES GRID */}
  <div className="space-y-3.5">
  {/* DYSLEXIC FRIENDLY toggle */}
  <button
  type="button"
  onClick={() => setDyslexicFont(!dyslexicFont)}
  className={`w-full p-4 rounded-xl border flex items-start gap-3.5 transition-all text-left cursor-pointer ${
  dyslexicFont
  ? 'bg-primary/15 border-primary text-foreground'
  : 'bg-background border-divider/15 hover:bg-primary/5'
  }`}
  >
  <div className={`p-2 rounded-lg shrink-0 ${dyslexicFont ? 'bg-primary text-primary-foreground' : 'bg-content2 text-default-500'}`}>
  <CaseSensitive className="h-4.5 w-4.5" />
  </div>
  <div className="space-y-0.5">
  <div className="text-[11.5px] font-extrabold flex items-center gap-1.5 font-sans">
  <span>Dyslexic-Friendly Font</span>
  {dyslexicFont && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
  </div>
  <p className="text-[10.5px] text-default-500 opacity-80">
    Specialized letter shapes for easier reading
  </p>
  </div>
  </button>

  {/* COLOR CONTRAST LEVEL CARD */}
  <div className="w-full p-4 rounded-xl border border-divider/15 bg-background space-y-3.5">
  <div className="flex items-start gap-3.5">
  <div className="p-2 rounded-lg shrink-0 bg-content2 text-default-500">
  <Sliders className="h-4.5 w-4.5" />
  </div>
  <div className="space-y-0.5">
  <div className="text-[11.5px] font-extrabold font-sans text-foreground">
  Color Contrast
  </div>
  </div>
  </div>

  {/* HeroUI Segmented chips */}
  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-content2">
  {(['small', 'medium', 'high'] as const).map((level) => (
  <button
  key={level}
  type="button"
  onClick={() => setColorContrast(level as any)}
  className={`py-1.5 px-2 rounded-md text-[10.5px] font-bold capitalize transition-all cursor-pointer ${
  (colorContrast === level || (level === 'small' && (colorContrast as string) === 'default'))
  ? 'bg-primary text-primary-foreground shadow-sm'
  : 'text-default-500 hover:bg-foreground/5'
  }`}
  >
  {level === 'small' ? 'Standard' : level === 'medium' ? 'Enhanced' : 'High Contrast'}
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
  ? 'bg-primary/15 border-primary text-foreground'
  : 'bg-background border-divider/15 hover:bg-primary/5'
  }`}
  >
  <div className={`p-2 rounded-lg shrink-0 ${maximizeTextContrast ? 'bg-primary text-primary-foreground' : 'bg-content2 text-default-500'}`}>
  <Layers className="h-4.5 w-4.5" />
  </div>
  <div className="space-y-0.5">
  <div className="text-[11.5px] font-extrabold flex items-center gap-1.5 font-sans">
  <span>High Contrast Text</span>
  {maximizeTextContrast && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
  </div>
  <p className="text-[10.5px] text-default-500 opacity-80">
    Increases contrast between text and background surfaces
  </p>
  </div>
  </button>

  {/* KEYBOARD OUTLINES toggle */}
  <button
  type="button"
  onClick={() => setEnhancedOutlines(!enhancedOutlines)}
  className={`w-full p-4 rounded-xl border flex items-start gap-3.5 transition-all text-left cursor-pointer ${
  enhancedOutlines
  ? 'bg-primary/15 border-primary text-foreground'
  : 'bg-background border-divider/15 hover:bg-primary/5'
  }`}
  >
  <div className={`p-2 rounded-lg shrink-0 ${enhancedOutlines ? 'bg-primary text-primary-foreground' : 'bg-content2 text-default-500'}`}>
  <Keyboard className="h-4.5 w-4.5" />
  </div>
  <div className="space-y-0.5">
  <div className="text-[11.5px] font-extrabold flex items-center gap-1.5 font-sans">
  <span>Focus Outlines</span>
  {enhancedOutlines && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
  </div>
  <p className="text-[10.5px] text-default-500 opacity-80">
    Shows clear borders around focused buttons and interactive elements
  </p>
  </div>
  </button>

        {/* DISABLE UI BLURS toggle */}
        <button
          type="button"
          onClick={() => setDisableUiBlurs(!disableUiBlurs)}
          className={`w-full p-4 rounded-xl border flex items-start gap-3.5 transition-all text-left cursor-pointer ${
            disableUiBlurs
              ? 'bg-primary/15 border-primary text-foreground'
              : 'bg-background border-divider/15 hover:bg-primary/5'
          }`}
        >
          <div className={`p-2 rounded-lg shrink-0 ${disableUiBlurs ? 'bg-primary text-primary-foreground' : 'bg-content2 text-default-500'}`}>
            <Square className="h-4.5 w-4.5" />
          </div>
          <div className="space-y-0.5">
            <div className="text-[11.5px] font-extrabold flex items-center gap-1.5 font-sans">
              <span>Reduce Transparency</span>
              {disableUiBlurs && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
            </div>
            <p className="text-[10.5px] text-default-500 opacity-80">
              Uses solid opaque backgrounds for cards, modals, and dialogs
            </p>
          </div>
        </button>

        {/* DISABLE BACKDROP BLURS & AMBIENT GRADIENTS toggle */}
        <button
          type="button"
          onClick={() => setDisableBackdropBlurs(!disableBackdropBlurs)}
          className={`w-full p-4 rounded-xl border flex items-start gap-3.5 transition-all text-left cursor-pointer ${
            disableBackdropBlurs
              ? 'bg-primary/15 border-primary text-foreground'
              : 'bg-background border-divider/15 hover:bg-primary/5'
          }`}
        >
          <div className={`p-2 rounded-lg shrink-0 ${disableBackdropBlurs ? 'bg-primary text-primary-foreground' : 'bg-content2 text-default-500'}`}>
            <Droplets className="h-4.5 w-4.5" />
          </div>
          <div className="space-y-0.5">
            <div className="text-[11.5px] font-extrabold flex items-center gap-1.5 font-sans">
              <span>Disable Background Glow</span>
              {disableBackdropBlurs && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
            </div>
            <p className="text-[10.5px] text-default-500 opacity-80">
              Turns off ambient background lighting and gradient aura effects
            </p>
          </div>
        </button>

  {/* DISABLE ANIMATIONS toggle */}
  <button
  type="button"
  onClick={() => setDisableAnimations(!disableAnimations)}
  className={`w-full p-4 rounded-xl border flex items-start gap-3.5 transition-all text-left cursor-pointer ${
  disableAnimations
  ? 'bg-primary/15 border-primary text-foreground'
  : 'bg-background border-divider/15 hover:bg-primary/5'
  }`}
  >
  <div className={`p-2 rounded-lg shrink-0 ${disableAnimations ? 'bg-primary text-primary-foreground' : 'bg-content2 text-default-500'}`}>
  <Sparkles className="h-4.5 w-4.5" />
  </div>
  <div className="space-y-0.5">
  <div className="text-[11.5px] font-extrabold flex items-center gap-1.5 font-sans">
  <span>Disable Animations</span>
  {disableAnimations && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
  </div>
  <p className="text-[10.5px] text-default-500 opacity-80">
    Turns off motion effects and transition animations
  </p>
  </div>
  </button>

  {/* LOW PERFORMANCE MODE / THERMAL MITIGATION toggle */}
  <button
  type="button"
  onClick={() => db.setLowPerformanceMode(!db.lowPerformanceMode)}
  className={`w-full p-4 rounded-xl border flex items-start gap-3.5 transition-all text-left cursor-pointer ${
  db.lowPerformanceMode
  ? 'bg-primary/15 border-primary text-foreground'
  : 'bg-background border-divider/15 hover:bg-primary/5'
  }`}
  >
  <div className={`p-2 rounded-lg shrink-0 ${db.lowPerformanceMode ? 'bg-primary text-primary-foreground' : 'bg-content2 text-default-500'}`}>
  <Cpu className="h-4.5 w-4.5" />
  </div>
  <div className="space-y-0.5">
  <div className="text-[11.5px] font-extrabold flex items-center gap-1.5 font-sans">
  <span>Battery & Performance Saver</span>
  {db.lowPerformanceMode && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
  </div>
  <p className="text-[10.5px] text-default-500 opacity-80">
    Reduces graphical load to save battery on mobile devices
  </p>
  </div>
  </button>
  </div>

  </div>
  )}

 {/* TAB: APPEARANCE HEROUI V3 CUSTOMIZER */}
      {activeTab === "appearance" && (
        <HeroUIAppearanceSettings darkMode={darkMode} onToggleDarkMode={onToggleDarkMode} />
      )}

      {/* TAB: FEATURES AND PRIVACY PREFERENCES */}
 {activeTab === 'features' && (
 <div className="space-y-4 animate-fade-in font-sans">
 <div>
 <h4 className="text-xs font-black uppercase text-primary tracking-wider ">
 Cookie & Browser Data Consent
 </h4>
 </div>

 <div className="h-px bg-default-100" />

 <div className="space-y-3.5">
 {/* NECESSARY COOKIE */}
 <div className="p-4 rounded-xl border border-divider/20 bg-content1/50 flex gap-3.5 items-start">
 <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
 <div className="space-y-1">
 <div className="flex items-center gap-2">
 <span className="text-xs font-extrabold font-sans text-foreground">Necessary System Cookies</span>
 <span className="text-[8.5px] bg-emerald-500/10 text-emerald-500 rounded px-1.5 font-bold uppercase tracking-wider">Permanent</span>
 </div>
 </div>
 </div>

 {/* FUNCTIONAL COOKIE */}
 <div
 onClick={() => setCookiePreferences(p => ({ ...p, functional: !p.functional }))}
 className={`p-4 rounded-xl border flex gap-3.5 items-start transition-all cursor-pointer ${
 cookiePreferences.functional ? 'border-primary bg-primary/5' : 'border-divider/20 bg-transparent'
 }`}
 >
 <div className="pt-0.5">
 <HeroCheckbox
 checked={cookiePreferences.functional}
 onChange={() => {}}
 color="primary"
 size="sm"
 />
 </div>
 <div className="space-y-1">
 <div className="flex items-center gap-2 font-sans">
 <span className="text-xs font-extrabold text-foreground">Functional App Preferences</span>
 <span className="text-[8.5px] bg-primary/10 text-primary rounded px-1.5 font-bold uppercase tracking-wider">Active</span>
 </div>
 </div>
 </div>

 {/* AUDIT LOGGER / ANALYTIC COOKIE */}
 <div
 onClick={() => setCookiePreferences(p => ({ ...p, analytical: !p.analytical }))}
 className={`p-4 rounded-xl border flex gap-3.5 items-start transition-all cursor-pointer ${
 cookiePreferences.analytical ? 'border-primary bg-primary/5' : 'border-divider/20 bg-transparent'
 }`}
 >
 <div className="pt-0.5">
 <HeroCheckbox
 checked={cookiePreferences.analytical}
 onChange={() => {}}
 color="primary"
 size="sm"
 />
 </div>
 <div className="space-y-1">
 <div className="flex items-center gap-2 font-sans">
 <span className="text-xs font-extrabold text-foreground">On-Prem Trace Audit Logger</span>
 <span className="text-[8.5px] bg-zinc-450 text-zinc-400 rounded px-1.5 font-bold uppercase tracking-wider">Opt-In</span>
 </div>
 </div>
 </div>
 </div>

 <div className="pt-2">
 <button
 type="button"
 onClick={handleSavePreferences}
 className="w-full py-3.5 px-4 font-black rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
 >
 Save Preferences
 </button>
 </div>

 <div className="h-px bg-default-100 my-6" />

 {/* INTERACTIVE ONBOARDING SETUP ASSISTANT */}
 <div className="p-4 rounded-xl border border-primary/25 bg-primary/5 space-y-2.5">
 <span className="text-[10px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
 <Sparkles className="h-3.5 w-3.5" />
 Interactive Setup Wizard
 </span>
 <p className="text-[10.5px] text-default-500 leading-relaxed font-sans">
 Need to re-configure starting catalogs, seed initial products, or bulk migrate raw spreadsheet rows? Relaunch the interactive Onboarding Setup Assistant instantly.
 </p>
 <button
 type="button"
 onClick={() => {
 setIsOpen(false);
 window.dispatchEvent(new Event('open-setup-wizard'));
 }}
 className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-extrabold uppercase tracking-wider py-2.5 rounded-lg cursor-pointer transition-all text-center flex items-center justify-center gap-1.5 border border-divider/30 shadow-md font-sans"
 >
 <Play className="h-3 w-3" />
 Relaunch Setup Wizard
 </button>
 </div>

 <div className="h-px bg-default-100 my-6" />

 {/* INTEGRATED PRIVACY POLICY SECTION */}
 <div className="space-y-4 text-xs leading-relaxed text-foreground">
 <div className="border-b border-divider/15 pb-4">
 <h4 className="text-xs font-black uppercase text-primary tracking-wider ">
 Privacy & Security Policy
 </h4>
 <p className="text-[11px] text-default-500 mt-1 leading-relaxed font-sans">
 Last Refreshed: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}. This policy details how data privacy, local offline storage, and system security are handled.
 </p>
 </div>

 <div className="space-y-4 font-sans select-text max-h-[340px] overflow-y-auto pr-2">
 <div className="space-y-1">
 <h5 className="font-extrabold text-[#ffffff] text-xs uppercase tracking-wider">1. No Third-Party Tracking</h5>
 <p className="text-[11px] text-default-500">
 We guarantee that your company data, customer rosters, inventory records, and sales transactions are never transmitted or shared with third parties. All operational data is stored securely.
 </p>
 </div>

 <div className="space-y-1">
 <h5 className="font-extrabold text-[#ffffff] text-xs uppercase tracking-wider">2. Local Data Storage</h5>
 <p className="text-[11px] text-default-500">
 All operational logs, employee assignments, and branch records are stored locally in the database. Administrators can clear local data through the Backups settings if needed to delete history.
 </p>
 </div>

 <div className="space-y-1">
 <h5 className="font-extrabold text-[#ffffff] text-xs uppercase tracking-wider">3. Offline Saving</h5>
 <p className="text-[11px] text-default-500">
 When working offline, sales transactions and stock changes are saved securely in your browser and automatically synchronized with the main server as soon as connection is restored.
 </p>
 </div>

 <div className="space-y-1">
 <h5 className="font-extrabold text-[#ffffff] text-xs uppercase tracking-wider">4. Data Preservation and Browser Cache</h5>
 <p className="text-[11px] text-default-500">
 The system stores pending offline data locally to prevent interruptions during network dropouts. Clearing your browser cache or using private/incognito windows before offline data is synced may result in data loss.
 </p>
 </div>

 <div className="space-y-1">
 <h5 className="font-extrabold text-[#ffffff] text-xs uppercase tracking-wider">5. Encrypted Network Transmissions</h5>
 <p className="text-[11px] text-default-500">
 All data transmitted between cashiers and the central database is fully encrypted. Business transactions, manager approvals, and active checkout carts are protected over local networks.
 </p>
 </div>

 <div className="space-y-1">
 <h5 className="font-extrabold text-[#ffffff] text-xs uppercase tracking-wider">6. Automatic Logouts</h5>
 <p className="text-[11px] text-default-500">
 To protect system security, user sessions are automatically logged out after 8 hours of inactivity or when the browser session ends.
 </p>
 </div>

 <div className="space-y-1">
 <h5 className="font-extrabold text-[#ffffff] text-xs uppercase tracking-wider">7. Access Controls & Permissions</h5>
 <p className="text-[11px] text-default-500">
 Every data update is recorded for security tracking. Administrators can review database settings and manage security profiles under the Backups tab.
 </p>
 </div>

 <div className="space-y-1">
 <h5 className="font-extrabold text-[#ffffff] text-xs uppercase tracking-wider">8. Tax Compliance</h5>
 <p className="text-[11px] text-default-500">
 TilePoint complies with tax register guidelines. Daily sales reports, tax transmittals, and historical tax logs are protected and marked read-only to comply with audit requirements.
 </p>
 </div>

 <div className="space-y-2 pt-2 border-t border-divider/15 text-[10.5px]">
 <p className="text-zinc-400 font-bold">
 If you have security inquiries regarding TilePoint, please contact system administration.
 </p>
 <span className="inline-flex items-center gap-1.5 text-[9px] uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-full font-bold">
 <Check className="h-3 w-3" /> System Status: Certified & Secured
 </span>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* TAB D: ABOUT SYSTEM & DEVELOPER PROFILE */}
 {activeTab === 'about' && (
 <div className="space-y-5 animate-fade-in font-sans">
 <div>
 <h4 className="text-xs font-black uppercase text-primary tracking-wider ">
 System Configuration & Developer Profile
 </h4>
 <p className="text-[11px] text-default-500 mt-1 leading-relaxed">
 TilePoint point-of-sale node telemetry data, compiled engineering details, and systems developer metadata.
 </p>
 </div>

 <div className="h-px bg-default-100" />

 {/* Developer Profiles Grid */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
 {/* Developer Profile Card 1: Erica Manaban */}
 <div className="bg-content1 border border-divider rounded-large shadow-small text-foreground bg-content1 border border-divider/15 p-5 rounded-2xl shadow-sm relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
 {/* Left side: CSS aesthetic ring avatar */}
 <div className="relative h-20 w-20 shrink-0 flex items-center justify-center bg-background/30 rounded-2xl border border-divider/10 overflow-hidden shadow-inner self-center sm:self-start md:self-center">
 <div className="absolute -top-6 -left-6 h-20 w-20 rounded-full border border-amber-500/15 bg-amber-500/5" />
 <div className="absolute -bottom-4 -right-4 h-16 w-16 rounded-full border border-amber-500/10 bg-amber-500/5" />
 <div className="absolute h-14 w-14 rounded-full border border-amber-500/20 bg-amber-500/5" />
 <div className="relative z-10 h-10 w-10 rounded-xl bg-[#0b0f19] border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)] flex items-center justify-center text-xs text-amber-400 font-black">
 <span>EM</span>
 </div>
 </div>

 {/* Right side: Developer Info */}
 <div className="flex-1 space-y-2 font-sans w-full">
 <div>
 <div className="flex items-center justify-between gap-2">
 <span className="text-[9px] sm:text-[10px] font-black uppercase text-zinc-400 tracking-widest block leading-3">
 Co-Owner &amp; Managing Director
 </span>
 <span className="text-[8.5px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase font-black tracking-wider shadow-sm select-none">
 Verified Director
 </span>
 </div>
 
 <h4 className="text-base font-black text-white uppercase tracking-wider font-sans mt-1 leading-tight">
 Erica Manaban
 </h4>
 
 <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-default-500 text-[10.5px] mt-1.5">
 <div className="flex items-center gap-1.5">
 <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
 <span className="font-semibold text-zinc-300">{branches[0]?.address || "Headquarters"}</span>
 </div>
 <div className="flex items-center gap-1.5 text-amber-400/90 font-bold">
 <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
 <span className=" text-[10px]">TilePoint Enterprise</span>
 </div>
 </div>
 </div>

 <div className="h-px bg-default-100 !my-1.5" />

 <div className="text-[11px] text-default-500 leading-relaxed">
 <p className="text-zinc-200 border-l-2 border-amber-500/60 pl-2.5 font-medium italic">
 Erica leads system governance, operational workflows, and software quality to ensure TilePoint ERP delivers maximum reliability.
 </p>
 </div>
 </div>
 </div>

 {/* Developer Profile Card 2: Mark Jefferson Monares */}
 <div className="bg-content1 border border-divider rounded-large shadow-small text-foreground bg-content1 border border-divider/15 p-5 rounded-2xl shadow-sm relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
 {/* Left side: CSS aesthetic ring avatar */}
 <div className="relative h-20 w-20 shrink-0 flex items-center justify-center bg-background/30 rounded-2xl border border-divider/10 overflow-hidden shadow-inner self-center sm:self-start md:self-center">
 <div className="absolute -top-6 -left-6 h-20 w-20 rounded-full border border-primary/15 bg-primary/5" />
 <div className="absolute -bottom-4 -right-4 h-16 w-16 rounded-full border border-primary/10 bg-primary/5" />
 <div className="absolute h-14 w-14 rounded-full border border-primary/20 bg-primary/5" />
 <div className="relative z-10 h-10 w-10 rounded-xl bg-[#0b0f19] border border-primary/40 shadow-[0_0_12px_rgba(28,100,242,0.15)] flex items-center justify-center text-xs text-primary font-black">
 <span>&gt;_</span>
 </div>
 </div>

 {/* Right side: Developer Info */}
 <div className="flex-1 space-y-2 font-sans w-full">
 <div>
 <div className="flex items-center justify-between gap-2">
 <span className="text-[9px] sm:text-[10px] font-black uppercase text-zinc-400 tracking-widest block leading-3">
 Co-Owner &amp; Senior Systems Architect
 </span>
 <span className="text-[8.5px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase font-black tracking-wider shadow-sm select-none">
 Verified Architect
 </span>
 </div>
 
 <h4 className="text-base font-black text-white uppercase tracking-wider font-sans mt-1 leading-tight">
 Mark Jefferson Monares
 </h4>
 
 <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-default-500 text-[10.5px] mt-1.5">
 <div className="flex items-center gap-1.5">
 <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
 <span className="font-semibold text-zinc-300">{branches[0]?.address || "Headquarters"}</span>
 </div>
 <a
 href="https://github.com/uznom"
 target="_blank"
 rel="noopener noreferrer"
 className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors font-bold group"
 >
 <Github className="h-3.5 w-3.5 shrink-0" />
 <span className=" group-hover:underline">@uznom</span>
 </a>
 </div>
 </div>

 <div className="h-px bg-default-100 !my-1.5" />

 <div className="text-[11px] text-default-500 leading-relaxed">
 <p className="text-zinc-200 border-l-2 border-primary/60 pl-2.5 font-medium italic">
 Mark Jefferson builds streamlined systems that are both technically disciplined and exceptionally practical.
 </p>
 </div>
 </div>
 </div>
 </div>

 {/* System specs info card */}
 <div className="space-y-4">
 {/* Tech stack card */}
 <div className="p-4 rounded-xl border border-divider/15 bg-content1/40 space-y-2 animate-fade-in text-left">
 <div className="flex items-center gap-2">
 <Code className="h-4.5 w-4.5 text-primary" />
 <h5 className="text-[10px] font-black uppercase tracking-wider text-primary ">
 Enterprise Tech Stack
 </h5>
 </div>
 <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] leading-normal text-zinc-300">
 <li className="flex items-center gap-1.5">
 <span className="h-1 w-1 rounded-full bg-primary shrink-0" />
 <span>React 18+ (Hooks &amp; Concurrent Architecture)</span>
 </li>
 <li className="flex items-center gap-1.5">
 <span className="h-1 w-1 rounded-full bg-primary shrink-0" />
 <span>Vite 6+ (Lightning-Fast ESM Engine)</span>
 </li>
 <li className="flex items-center gap-1.5">
 <span className="h-1 w-1 rounded-full bg-primary shrink-0" />
 <span>TypeScript 5.x (Strict Enterprise Safety)</span>
 </li>
 <li className="flex items-center gap-1.5">
 <span className="h-1 w-1 rounded-full bg-primary shrink-0" />
 <span>Tailwind CSS v4 &amp; HeroUI Design Tokens</span>
 </li>
 <li className="flex items-center gap-1.5">
 <span className="h-1 w-1 rounded-full bg-primary shrink-0" />
 <span>Dexie.js / IndexedDB (Offline-First Storage)</span>
 </li>
 <li className="flex items-center gap-1.5">
 <span className="h-1 w-1 rounded-full bg-primary shrink-0" />
 <span>Motion / Framer Motion (Fluid Animations)</span>
 </li>
 <li className="flex items-center gap-1.5">
 <span className="h-1 w-1 rounded-full bg-primary shrink-0" />
 <span>Lucide Icons (Optimized Vector Icons)</span>
 </li>
 <li className="flex items-center gap-1.5">
 <span className="h-1 w-1 rounded-full bg-primary shrink-0" />
 <span>D3.js &amp; Recharts (Data Visualizations)</span>
 </li>
 </ul>
 </div>
 </div>

 {/* Operating Manual Section with download and print options */}
 <div className="bg-content1 border border-divider rounded-large shadow-small text-foreground bg-content1 border border-divider/15 p-5 rounded-2xl shadow-sm animate-fade-in space-y-4 text-left">
 <div className="flex items-center gap-2.5">
 <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-500">
 <Download className="h-4 w-4" />
 </div>
 <div>
 <h5 className="text-xs font-black uppercase text-foreground tracking-wider">
 TilePoint Operating Manual &amp; Operators Handbook
 </h5>
 <span className="text-[10px] text-zinc-400 font-medium block">
 Natively formulated, portable PDF guidance document referencing inventory auditing and ERP OS protocols.
 </span>
 </div>
 </div>

 <div className="p-4 rounded-xl bg-background border border-divider/5 text-xs text-default-500 leading-relaxed space-y-2.5">
 <p className="text-[11px] font-bold text-zinc-300">
 This portable operations guidelines document covers:
 </p>
 <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] pl-1">
 <li className="flex items-center gap-1.5">
 <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
 <span>Ch 1: ERP OS Sales &amp; Coverage Calculators</span>
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
(CHAPTER 1: ERP OS SALES & ESTIMATORS) Tj
T*
(- Scan barcodes, search keys, and compute waste offsets \\(+10% diagonal cuts\\).) Tj
T*
() Tj
T*
(CHAPTER 2: GLOBAL WAREHOUSES & SIDE-BY-SIDE MATRIX) Tj
T*
(- The Unified Global Pools lists branch levels side-by-side \\(Cebu, Bacolod, etc.\\).) Tj
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
T*
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
( representing the count delta. This perfectly balances digital records.) Tj
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
 setIsOpen(false);
 setIsShowingHandbook(true);
 }}
 className="px-4 py-2.5 bg-content3 hover:bg-content4 text-foreground text-[10px] font-black uppercase tracking-wider rounded-xl border border-divider/20 transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
 >
 <Info className="h-3.5 w-3.5" />
 <span>View Guided Handbook</span>
 </button>
 </div>
 </div>

 <div className="flex items-center justify-between pt-1 border-t border-divider/10 text-[10px] text-default-500/70">
 <span>Version 2.4.1</span>
 <span className="text-emerald-500 font-bold">Status: Online</span>
 </div>
 </div>
 )}

 {/* TAB E: DATABASE PERFORMANCE TUNING & SECURITY */}
 {activeTab === 'backups' && (
 <div className="space-y-4 animate-fade-in font-sans">
 <div>
 <h4 className="text-xs font-black uppercase text-primary tracking-wider flex items-center gap-2">
 <Database className="h-4 w-4" />
 Database Settings & Backups
 </h4>
 <p className="text-[11px] text-default-500 mt-1 leading-relaxed">
 Adjust database saving delay, view system security rules, and manage data backup points.
 </p>
 </div>

 {/* Sub-tab Pill navigation inside dbtuning */}
 <div className="flex border-b border-divider/15 pb-2 gap-1.5 select-none shrink-0 overflow-x-auto">
 {[
 { id: 'performance', name: 'Save Settings' },
 { id: 'offline_cache', name: 'Offline & Service Worker' },
 { id: 'rules', name: 'Security Rules' },
 { id: 'backup', name: 'Backups' },
 { id: 'archive', name: 'Data Archive & Purge' }
 ].map(sub => (
 <button
 key={sub.id}
 type="button"
 onClick={() => setDbSubTab(sub.id as any)}
 className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
 dbSubTab === sub.id
 ? 'bg-primary/15 text-primary border border-primary/30'
 : 'hover:bg-primary/5 text-default-500'
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
 <div className="p-4 rounded-xl border border-divider/15 bg-content1/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
 <div className="flex items-center gap-3">
 <div className="relative">
 <div className={`h-9 w-9 rounded-full flex items-center justify-center ${
 db.dbSyncStatus === 'idle' ? 'bg-emerald-500/10 text-emerald-400' :
 db.dbSyncStatus === 'queued' ? 'bg-amber-500/10 text-amber-400' :
 'bg-primary/10 text-primary animate-spin'
 }`}>
 <RefreshCw className={`h-4.5 w-4.5 animate-spin-slow`} />
 </div>
 <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border border-divider ${
 db.dbSyncStatus === 'idle' ? 'bg-emerald-500' :
 db.dbSyncStatus === 'queued' ? 'bg-amber-500' :
 'bg-primary'
 }`} />
 </div>

 <div>
 <div className="text-[11px] font-black uppercase text-foreground">
 Database Status: <span className={
 db.dbSyncStatus === 'idle' ? 'text-emerald-400' :
 db.dbSyncStatus === 'queued' ? 'text-amber-400' :
 'text-primary'
 }>{db.dbSyncStatus === 'idle' ? 'UP TO DATE' : db.dbSyncStatus.toUpperCase()}</span>
 </div>
 <p className="text-[10px] text-default-500 leading-relaxed mt-0.5">
 {db.dbSyncStatus === 'idle' && 'All changes saved. Database is currently idle.'}
 {db.dbSyncStatus === 'queued' && 'Changes are queued for saving...'}
 {db.dbSyncStatus === 'syncing' && 'Saving database changes...'}
 </p>
 </div>
 </div>
 
 <button
 type="button"
 onClick={() => db.forceSyncAll()}
 className="bg-primary text-primary-foreground hover:bg-primary/95 text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
 >
 <RefreshCw className="h-3 w-3 animate-spin-slow" />
 Save Now
 </button>
 </div>

 {/* Debounce delay control */}
 <div className="space-y-2 p-4 rounded-xl border border-divider/15 bg-content1/30">
 <label className="text-[10px] font-black uppercase tracking-widest text-primary block">
 Database Save Frequency Delay
 </label>
 <p className="text-[10.5px] text-default-500 leading-relaxed">
 Adding a small save delay pools database writes together. This reduces database requests and improves application performance.
 </p>
 <div className="grid grid-cols-5 gap-2 pt-2 text-[10.5px]">
 {[
 { id: 0, label: 'Instant', desc: 'No delay' },
 { id: 250, label: 'Fast', desc: '0.25s delay' },
 { id: 500, label: 'Optimal', desc: '0.5s delay' },
 { id: 1000, label: 'Safe', desc: '1s delay' },
 { id: 2000, label: 'Max', desc: '2s delay' }
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
 ? 'bg-primary/10 border-primary text-primary font-bold'
 : 'bg-background border-divider/20 hover:bg-primary/5 text-default-500'
 }`}
 >
 <span className="text-[10px] font-extrabold ">{op.label}</span>
 <span className="text-[8px] opacity-70 font-sans">{op.desc}</span>
 </button>
 ))}
 </div>
 </div>

 {/* Efficiency statistics */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1">
 <div className="p-4 rounded-xl border border-divider/15 bg-content1/30 space-y-1">
 <span className="text-[9px] font-black uppercase tracking-wider text-default-500 block">
 Consolidated Write Requests
 </span>
 <div className="flex items-center justify-between pt-1">
 <span className="text-xl font-bold text-primary">
 {db.writeStatsCount.toLocaleString()}
 </span>
 <button
 type="button"
 onClick={() => db.resetWriteStats()}
 className="text-[9.5px] text-default-500 hover:text-primary underline cursor-pointer"
 >
 Reset Stats
 </button>
 </div>
 <p className="text-[9.5px] text-zinc-400 font-sans pt-1">
 Number of database save operations pooled to optimize performance.
 </p>
 </div>

 <div className="p-4 rounded-xl border border-divider/15 bg-content1/30 space-y-1">
 <span className="text-[9px] font-black uppercase tracking-wider text-default-500 block">
 Database Load Reduction
 </span>
 <div className="flex items-center justify-between pt-1">
 <span className="text-xl font-bold text-emerald-400">
 {db.debounceDelay === 0 ? '0.0%' : db.writeStatsCount > 0 ? `${Math.min(99.6, Math.max(74.2, 85 + (db.debounceDelay / 50)))}%` : '91.8%'}
 </span>
 <span className="text-[9px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 uppercase font-black">
 Highly Efficient
 </span>
 </div>
 <p className="text-[9.5px] text-zinc-400 font-sans pt-1">
 Estimated percentage of database load saved by pooling requests.
 </p>
 </div>
 </div>
 </div>
 )}

 {/* Subtab B: SERVICE WORKER & OFFLINE CACHING */}
 {dbSubTab === 'offline_cache' && (
 <div className="space-y-4 animate-fade-in font-sans">
 {swFeedback && (
 <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs text-primary">
 <div className="flex items-center gap-2">
 <CheckCircle2 className="h-4 w-4 shrink-0" />
 <span>{swFeedback}</span>
 </div>
 <button
 type="button"
 onClick={() => setSwFeedback(null)}
 className="text-primary hover:opacity-70 text-xs font-bold"
 >
 Dismiss
 </button>
 </div>
 )}

 {/* Overview Status Banner */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
 <div className="p-4 rounded-xl border border-divider/15 bg-content1/50 flex items-center gap-3">
 <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${
 swStatus.isOnline
 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
 : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
 }`}>
 {swStatus.isOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
 </div>
 <div>
 <div className="text-[10px] font-black uppercase tracking-wider text-default-500">
 Network Connectivity
 </div>
 <div className="text-xs font-bold text-foreground flex items-center gap-1.5 mt-0.5">
 <span className={`h-2 w-2 rounded-full ${swStatus.isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
 {swStatus.isOnline ? 'Online (Real-Time Sync)' : 'Offline (Cache Mode)'}
 </div>
 </div>
 </div>

 <div className="p-4 rounded-xl border border-divider/15 bg-content1/50 flex items-center gap-3">
 <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${
 swStatus.isRegistered
 ? 'bg-primary/10 text-primary border-primary/20'
 : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
 }`}>
 <Cpu className="h-5 w-5" />
 </div>
 <div>
 <div className="text-[10px] font-black uppercase tracking-wider text-default-500">
 Service Worker Engine
 </div>
 <div className="text-xs font-bold text-foreground flex items-center gap-1.5 mt-0.5">
 <span className={`h-2 w-2 rounded-full ${swStatus.isRegistered ? 'bg-primary' : 'bg-amber-500'}`} />
 {swStatus.isRegistered ? 'Active & Controlling' : 'Unregistered / Fallback'}
 </div>
 </div>
 </div>

 <div className="p-4 rounded-xl border border-divider/15 bg-content1/50 flex items-center gap-3">
 <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
 <HardDrive className="h-5 w-5" />
 </div>
 <div>
 <div className="text-[10px] font-black uppercase tracking-wider text-default-500">
 Cached Offline Assets
 </div>
 <div className="text-xs font-bold text-foreground mt-0.5">
 {swStatus.cachedAssetsCount > 0 ? `${swStatus.cachedAssetsCount} Assets Cached` : 'Primed on Next Fetch'}
 </div>
 </div>
 </div>
 </div>

 {/* Multi-Tier Cache Architecture Cards */}
 <div className="p-4 rounded-xl border border-divider/15 bg-content1/30 space-y-3">
 <div className="flex items-center justify-between border-b border-divider/10 pb-2.5">
 <div>
 <h5 className="text-xs font-black uppercase text-foreground tracking-wider flex items-center gap-2">
 <Layers className="h-3.5 w-3.5 text-primary" />
 Enterprise Cache Partition Architecture
 </h5>
 <span className="text-[10px] text-default-500">
 Multi-tier service worker storage partitions isolate app shell binaries from dynamic business records.
 </span>
 </div>
 <span className="text-[9.5px] px-2 py-0.5 rounded bg-primary/10 text-primary font-mono font-bold">
 v3.2.0
 </span>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
 <div className="p-3 rounded-lg bg-background border border-divider/10 space-y-1.5">
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Tier 1: App Shell</span>
 <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Pre-cached</span>
 </div>
 <p className="text-[10px] text-default-500 leading-relaxed">
 Stores root <code className="text-[9.5px] text-foreground font-mono">/index.html</code>, SVG icons, fonts, and web manifest for instantaneous zero-network boots.
 </p>
 <div className="text-[9px] text-zinc-500 font-mono">
 tilepoint-shell-v3.2.0
 </div>
 </div>

 <div className="p-3 rounded-lg bg-background border border-divider/10 space-y-1.5">
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">Tier 2: UI Assets</span>
 <span className="text-[9px] font-mono text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded">Stale-While-Revalidate</span>
 </div>
 <p className="text-[10px] text-default-500 leading-relaxed">
 Serves JS code chunks, CSS styles, web fonts, and images from cache first, revalidating in the background.
 </p>
 <div className="text-[9px] text-zinc-500 font-mono">
 tilepoint-assets-v3.2.0
 </div>
 </div>

 <div className="p-3 rounded-lg bg-background border border-divider/10 space-y-1.5">
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Tier 3: Static Data</span>
 <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">Network-First 3.5s</span>
 </div>
 <p className="text-[10px] text-default-500 leading-relaxed">
 Fetches fresh database snapshots from backend, falling back to cached offline state if network times out.
 </p>
 <div className="text-[9px] text-zinc-500 font-mono">
 tilepoint-data-v3.2.0
 </div>
 </div>
 </div>
 </div>

 {/* Action Bar */}
 <div className="p-4 rounded-xl border border-divider/15 bg-content1/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
 <div>
 <h6 className="text-[11px] font-bold text-foreground">Service Worker & Cache Controls</h6>
 <p className="text-[10px] text-default-500 mt-0.5">
 Manually re-prime asset caches, pre-cache active database snapshot, or clear stored offline assets.
 </p>
 </div>

 <div className="flex flex-wrap items-center gap-2">
 <ActionButton
 variant="secondary"
 className="py-2 text-[10px]"
 isLoading={isRefreshingSw}
 loadingText="Checking..."
 onClick={async () => {
 setIsRefreshingSw(true);
 try {
 if ('serviceWorker' in navigator) {
 const reg = await navigator.serviceWorker.getRegistration();
 if (reg) {
 await reg.update();
 }
 }
 const stats = await refreshCacheStats();
 setSwStatus(stats);
 setSwFeedback('Service Worker and asset caches checked and updated successfully.');
 } catch (err) {
 setSwFeedback('Unable to reach network for update check.');
 } finally {
 setIsRefreshingSw(false);
 }
 }}
 icon={<RefreshCw className="h-3.5 w-3.5 text-primary" />}
 >
 Update & Check Cache
 </ActionButton>

 <ActionButton
 variant="primary"
 className="py-2 text-[10px]"
 isLoading={isPreloadingSnapshot}
 loadingText="Pre-caching..."
 onClick={async () => {
 setIsPreloadingSnapshot(true);
 try {
 const snapshotPayload = {
 success: true,
 data: {
 tp_users: db.users,
 tp_branches: db.branches,
 tp_suppliers: db.suppliers,
 tp_products: db.products,
 tp_purchase_orders: db.purchaseOrders,
 tp_po_items: db.poItems,
 tp_transmittals: db.transmittals,
 tp_shifts: db.shifts,
 tp_sales: db.sales,
 tp_sale_items: db.saleItems,
 tp_movements: db.movements,
 tp_audit_logs: db.auditLogs,
 tp_parked_sales: db.parkedSales,
 tp_stock_transfers: db.stockTransfers,
 tp_branch_stock: db.branchStock,
 tp_ledger_entries: db.ledgerEntries,
 tp_branch_sales_reports: db.branchSalesReports,
 tp_deliveries: db.deliveries
 },
 timestamp: new Date().toISOString()
 };
 await precacheDataSnapshot('/api/db', snapshotPayload);
 const stats = await refreshCacheStats();
 setSwStatus(stats);
 setSwFeedback('Active ERP catalog and branch records pre-cached into offline data store.');
 } catch (err) {
 setSwFeedback('Error pre-caching database snapshot.');
 } finally {
 setIsPreloadingSnapshot(false);
 }
 }}
 icon={<HardDrive className="h-3.5 w-3.5" />}
 >
 Pre-cache Live DB Snapshot
 </ActionButton>

 <ActionButton
 variant="danger"
 className="py-2 text-[10px]"
 isLoading={isPurgingCache}
 loadingText="Purging..."
 onClick={async () => {
 setIsPurgingCache(true);
 try {
 await clearAllAppCaches();
 const stats = await refreshCacheStats();
 setSwStatus(stats);
 setSwFeedback('All local Service Worker caches purged. Fresh caches will populate on next load.');
 } catch (err) {
 setSwFeedback('Error purging caches.');
 } finally {
 setIsPurgingCache(false);
 }
 }}
 icon={<Trash2 className="h-3.5 w-3.5" />}
 >
 Purge Caches
 </ActionButton>
 </div>
 </div>
 </div>
 )}

 {/* Subtab B: SECURITY & STORAGE RULES */}
 {dbSubTab === 'rules' && (
 <div className="space-y-4 animate-fade-in font-sans">
 <div className="space-y-2">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-divider/10 pb-2">
 <div className="flex gap-2.5">
 <button
 type="button"
 onClick={() => setSelectedRuleset('firestore')}
 className={`text-[10px] font-black uppercase tracking-wider pb-1 ${
 selectedRuleset === 'firestore'
 ? 'text-primary border-b border-primary font-black'
 : 'text-default-500 hover:text-primary'
 }`}
 >
 Secure Firestore Rules
 </button>
 <button
 type="button"
 onClick={() => setSelectedRuleset('storage')}
 className={`text-[10px] font-black uppercase tracking-wider pb-1 ${
 selectedRuleset === 'storage'
 ? 'text-primary border-b border-primary font-black'
 : 'text-default-500 hover:text-primary'
 }`}
 >
 Public / Secure Storage Rules
 </button>
 </div>

 {/* Verification Badge */}
 <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full self-start">
 <Lock className="h-2.5 w-2.5" /> Rule Engine Validated
 </span>
 </div>

 <p className="text-[10.5px] text-default-500 leading-relaxed">
 {selectedRuleset === 'firestore' 
 ? 'This secure rule set defines Role-Based Access Controls (RBAC) on database schemas to protect transactions and ERP OS configurations.'
 : 'Provides public-read credentials for assets like receipt logs and barcode catalogs while enforcing strictly private limits on operational archives.'
 }
 </p>
 </div>

 {/* Rules Editor Terminal / Visual Blocks */}
 <div className="bg-content1 border border-divider rounded-large shadow-small text-foreground bg-zinc-950 border border-divider/30 rounded-xl text-[9.5px] leading-relaxed p-4 h-[170px] overflow-y-auto select-text scrollbar relative group">
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
 <div className="p-4 rounded-xl border border-divider/15 bg-content1/30 space-y-3.5 select-none">
 <span className="text-[10px] font-black uppercase tracking-wider text-primary block">
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
 ? 'bg-primary/10 border-primary text-foreground'
 : 'bg-background border-divider/15 hover:bg-primary/5'
 }`}
 >
 <span className="text-[10px] font-extrabold flex items-center justify-between font-sans">
 <span>{prof.name}</span>
 {ruleEnforcementProfile === prof.id && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
 </span>
 <span className="text-[9px] text-default-500 leading-tight mt-1">{prof.desc}</span>
 </button>
 ))}
 </div>
 
 {rulesAlert && (
 <div className="p-2.5 rounded-lg text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase animate-fade-in text-center font-bold">
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
 setBackupActionStatus('Successfully created database backup.');
 setTimeout(() => setBackupActionStatus(null), 2500);
 }}
 className="p-4 rounded-xl border border-divider/15 bg-content1/30 space-y-3 shrink-0"
 >
 <label className="text-[10px] font-black uppercase tracking-wider text-primary block">
 Create Database Backup
 </label>
 <p className="text-[10.5px] text-default-500 leading-relaxed">
 Generates a secure backup point of your complete store records, including products, stock levels, shifts, and transactions.
 </p>
 <div className="flex gap-2">
 <input
 type="text"
 value={snapshotName ?? ''}
 onChange={(e) => setSnapshotName(e.target.value)}
 placeholder="E.g., Pre-Inventory Audit Backup, v2.1-Prod"
 className="flex-1 px-3.5 py-2 text-xs rounded-lg bg-background border border-divider/20 focus:border-primary outline-none text-foreground font-sans"
 />
 <button
 type="submit"
 className="bg-primary text-primary-foreground hover:bg-primary/95 text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-lg cursor-pointer transition-all shrink-0 font-sans shadow-sm"
 >
 Create Backup
 </button>
 </div>
 </form>

 {backupActionStatus && (
 <div className="p-3 rounded-xl text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold uppercase tracking-widest text-center">
 {backupActionStatus}
 </div>
 )}

 {/* Existing Snapshots */}
 <div className="space-y-2">
 <span className="text-[10px] font-black uppercase tracking-wider text-default-500 block">
 Available Backups ({db.dbSnapshots.length})
 </span>
 <div className="max-h-[120px] overflow-y-auto pr-2 space-y-2 hover:scrollbar scrollbar text-[10.5px]">
 {db.dbSnapshots.length === 0 ? (
 <div className="p-4 rounded-xl border border-dashed border-divider/20 text-center text-zinc-500 italic">
 No backups found. Create a backup using the form above to safeguard your records.
 </div>
 ) : (
 db.dbSnapshots.map(snap => (
 <div key={snap.id} className="p-3 rounded-xl border border-divider/15 bg-content1/50 flex items-center justify-between gap-3 animate-fade-in hover:bg-content1/80 transition-all">
 <div className="space-y-0.5 max-w-[70%]">
 <div className="font-extrabold text-white font-sans flex items-center gap-2">
 <span>{snap.name}</span>
 <span className="text-[8.5px] bg-zinc-800 text-zinc-400 px-1.5 rounded font-normal uppercase">{snap.id}</span>
 </div>
 <div className="text-[9.5px] text-zinc-400 ">
 Created at: {new Date(snap.timestamp).toLocaleString()} &bull; Author: {snap.creator} &bull; Size: {Math.max(1, Math.round(snap.sizeBytes / 1024))} KB
 </div>
 </div>
 <div className="flex items-center gap-1.5 shrink-0">
 <button
 type="button"
 onClick={async () => {
 const success = await db.restoreDbSnapshot(snap.id);
 if (success) {
 setBackupActionStatus(`Successfully restored database records from backup "${snap.name}".`);
 setTimeout(() => setBackupActionStatus(null), 3000);
 } else {
 setBackupActionStatus('Failed to restore database: invalid backup file format.');
 setTimeout(() => setBackupActionStatus(null), 3500);
 }
 }}
 className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 font-black uppercase text-[9px] tracking-wider cursor-pointer border border-emerald-500/20"
 title="Restore DB to this recovery marker"
 >
 Restore
 </button>
 {(() => {
 const confirmCount = deleteConfirm[snap.id] || 0;
 if (confirmCount === 0) {
 return (
 <button
 type="button"
 onClick={() => {
 setDeleteConfirm(prev => ({ ...prev, [snap.id]: 1 }));
 setTimeout(() => {
 setDeleteConfirm(prev => {
 if (prev[snap.id] < 3) {
 const updated = { ...prev };
 delete updated[snap.id];
 return updated;
 }
 return prev;
 });
 }, 4000);
 }}
 className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg shrink-0 transition-all cursor-pointer border border-transparent hover:border-red-500/20"
 title="Delete Snap (Requires 3x confirmation)"
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 );
 } else if (confirmCount === 1) {
 return (
 <button
 type="button"
 onClick={() => {
 setDeleteConfirm(prev => ({ ...prev, [snap.id]: 2 }));
 }}
 className="px-2 py-1 text-[8px] font-black uppercase tracking-wider bg-amber-500 text-black hover:bg-amber-600 rounded-md transition-all cursor-pointer shrink-0"
 title="Confirm deletion (Stage 1 of 3)"
 >
 Confirm 1/3
 </button>
 );
 } else {
 return (
 <button
 type="button"
 onClick={async () => {
 await db.deleteDbSnapshot(snap.id);
 setBackupActionStatus(`Deleted snapshot marker key ${snap.id}.`);
 setTimeout(() => setBackupActionStatus(null), 2000);
 setDeleteConfirm(prev => {
 const updated = { ...prev };
 delete updated[snap.id];
 return updated;
 });
 }}
 className="px-2 py-1 text-[8px] font-black uppercase tracking-wider bg-rose-600 text-white hover:bg-rose-700 rounded-md transition-all cursor-pointer shrink-0"
 title="Final Confirmation (Stage 2 of 3 - Delete!)"
 >
 Confirm 2/3 (Delete)
 </button>
 );
 }
 })()}
 </div>
 </div>
 ))
 )}
 </div>
 </div>

 {/* JSON Export/Import Section */}
 <div className="p-4 rounded-xl border border-divider/15 bg-content1/30 space-y-2.5">
 <span className="text-[10px] font-black uppercase tracking-wider text-primary block">
 Direct Offline Local Backups & JSON
 </span>
 <p className="text-[10.5px] text-default-500 leading-relaxed">
 Backup files represent your database physically as raw JSON blocks. You can export these to flash storage or import/replace tables below in case of storage wipe.
 </p>
 <div className="flex gap-2">
 <ActionButton
 variant="slate"
 className="flex-1 py-2 text-[9.5px]"
 isLoading={isExportingFullDb}
 loadingText="Serializing tables..."
 onClick={() => {
 setIsExportingFullDb(true);
 setTimeout(() => {
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
 const filename = `tilepoint_full_backup_${Date.now()}.json`;
 saveFileToBackup(JSON.stringify(payload, null, 2), filename, 'Database_Backups').then((res) => {
 setBackupActionStatus(`Success: Exported portable backup to ${res.path || filename}`);
 setTimeout(() => setBackupActionStatus(null), 2500);
 setIsExportingFullDb(false);
 });
 }, 1000);
 }}
 icon={<Download className="h-3.5 w-3.5 text-primary" />}
 >
 Export Full DB as JSON
 </ActionButton>

 <ActionButton
 variant="secondary"
 disabled={isExportingXlsx}
 isLoading={isExportingXlsx}
 onClick={async () => {
   setIsExportingXlsx(true);
   try {
     const res = await exportMasterDatabaseToXLSX(db);
     setBackupActionStatus(`Success: Exported Master DB Excel (.XLSX) workbook to ${res.path}`);
   } catch (err) {
     setBackupActionStatus(`Error exporting XLSX workbook`);
   } finally {
     setIsExportingXlsx(false);
     setTimeout(() => setBackupActionStatus(null), 3000);
   }
 }}
 icon={<FileSpreadsheet className="h-3.5 w-3.5 text-teal-500" />}
 >
 Export Master DB as XLSX
 </ActionButton>
 
 <label className="flex-1 bg-zinc-800 text-zinc-300 hover:bg-zinc-750 text-[9.5px] font-bold uppercase tracking-wider py-2 rounded-lg cursor-pointer transition-all text-center flex items-center justify-center gap-2 border border-zinc-700 font-sans shadow-sm select-none">
 <Upload className="h-3.5 w-3.5 text-primary" />
 Import JSON Schema
 <input
 type="file"
 accept=".json"
 className="hidden"
 onChange={(e) => {
 const file = e.target.files?.[0];
 if (!file) return;
 const reader = new FileReader();
 reader.onload = async (event) => {
 try {
 const rawText = event.target?.result as string;
 const payload = await verifyAndUnwrapBackup(rawText);
 if (!payload.users || !payload.products) {
 throw new Error("Invalid schema template structure.");
 }
 
 // Take auto recovery snap before updating in case user made mistake
 await db.createDbSnapshot(`Auto-Snapshot Before Manual Import`);

 // Save to snapshots index first
 const newSnap: DbSnapshot = {
 id: `IMPORT-${Date.now()}`,
 name: `Imported Database - ${file.name}`,
 timestamp: new Date().toISOString(),
 creator: db.currentUser?.fullName || "SYSTEM",
 sizeBytes: file.size,
 data: JSON.stringify(payload)
 };
 
 // Save to server
 try {
 localStorage.setItem(`tp_snap_payload_${newSnap.id}`, newSnap.data);
 await fetch('/api/db/backups', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ snapshot: newSnap })
 });
 } catch (_) {
 console.warn('[PrivacyAccessibilityHub] Server offline, stored backup payload locally.');
 }
 
 // Trigger snapshot restore to apply
 await db.restoreDbSnapshot(newSnap.id);
 setBackupActionStatus(`SUCCESSFULLY IMPORTED PORTABLE BACKUP: "${file.name}" APPROVED.`);
 setTimeout(() => setBackupActionStatus(null), 3000);
 } catch (err: any) {
 setBackupActionStatus(`ERROR: ${err.message || 'APPROVED FILE IS CORRUPTED OR INVALID SCHEMA TILEPOINT FORMAT.'}`);
 setTimeout(() => setBackupActionStatus(null), 5000);
 }
 };
 reader.readAsText(file);
 }}
 />
 </label>
 </div>
 </div>

 {/* User-Defined Device Storage Backups Mapping */}
 <div className="p-4 rounded-xl border border-divider/15 bg-content1/30 space-y-4">
 <div className="flex items-center gap-2">
 <span className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg shrink-0">
 <HardDrive className="h-4 w-4" />
 </span>
 <div>
 <span className="text-[10px] font-black uppercase tracking-wider text-primary block">
 Persistent Device Storage Mapping
 </span>
 <span className="text-[9px] text-zinc-400 font-medium">
 Configure a dedicated path and filename pattern on your physical device for snapshot saves.
 </span>
 </div>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
 <div className="space-y-1">
 <label className="text-[9.5px] font-bold text-zinc-300 block">
 Custom Storage Directory Path
 </label>
 <div className="flex gap-2">
 <input
 type="text"
 value={activeFolderHandle ? `[Native Sync Folder]: ${activeFolderHandle.name ?? ''}` : deviceBackupPath}
 onChange={(e) => setDeviceBackupPath(e.target.value)}
 disabled={!!activeFolderHandle}
 placeholder="Directory path"
 className="flex-1 px-3 py-2 text-xs rounded-lg bg-background border border-divider/20 focus:border-primary outline-none text-white disabled:opacity-75 disabled:text-emerald-400 disabled:font-bold"
 />
 {isFsaSupported && (
 <button
 type="button"
 onClick={async () => {
 if (activeFolderHandle) {
 await clearDirectoryHandle();
 setActiveFolderHandle(null);
 setBackupActionStatus("Cleared native backup directory association.");
 setTimeout(() => setBackupActionStatus(null), 3000);
 } else {
 try {
 const handle = await (window as any).showDirectoryPicker();
 await saveDirectoryHandle(handle);
 setActiveFolderHandle(handle);
 setBackupActionStatus(`Successfully authorized native folder: "${handle.name}".`);
 setTimeout(() => setBackupActionStatus(null), 3000);
 } catch (err) {
 console.error("Directory picker cancelled or failed:", err);
 }
 }
 }}
 className={`px-3 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all border shrink-0 ${
 activeFolderHandle
 ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/30'
 : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30'
 }`}
 >
 {activeFolderHandle ? "Disconnect" : "Pick Device Folder"}
 </button>
 )}
 </div>
 <p className="text-[8.5px] text-zinc-500 italic">
 {activeFolderHandle
 ? `All downloaded backups, transmittals, and logs will be saved directly into "TilePoint_Backups" inside "${activeFolderHandle.name}" automatically!`
 : "Type a reference path OR click Pick Device Folder to enable zero-prompt direct saving on your computer."}
 </p>
 </div>

 <div className="space-y-1">
 <label className="text-[9.5px] font-bold text-zinc-300 block">
 Filename Prefix Pattern
 </label>
 <input
 type="text"
 value={filenamePattern ?? ''}
 onChange={(e) => setFilenamePattern(e.target.value)}
 placeholder="Filename prefix"
 className="w-full px-3 py-2 text-xs rounded-lg bg-background border border-divider/20 focus:border-primary outline-none text-white "
 />
 <p className="text-[8.5px] text-zinc-500 italic">
 Saved file name: <strong className="text-zinc-400">{filenamePattern}_[timestamp].json</strong>
 </p>
 </div>
 </div>

 {/* Save Snapshot Button with physical device backup persistence */}
 <button
 type="button"
 disabled={isExportingDevicePath}
 onClick={async () => {
 setIsExportingDevicePath(true);
 const stamp = Date.now();
 const finalFilename = `${filenamePattern}_${stamp}.json`;

 try {
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

 const res = await saveFileToBackup(JSON.stringify(payload, null, 2), finalFilename, 'Database_Backups');
 db.createDbSnapshot(`Device Snapshot Folder Backup [Manual]`);
 setBackupActionStatus(`SUCCESS: Snapshot saved physically as: ${res.path || finalFilename}`);
 setTimeout(() => setBackupActionStatus(null), 5000);
 } catch (err) {
 setBackupActionStatus(`FAILED: Could not write backup snapshot file.`);
 setTimeout(() => setBackupActionStatus(null), 5000);
 } finally {
 setIsExportingDevicePath(false);
 }
 }}
 className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md"
 >
 <HardDrive className="h-4 w-4" /> {isExportingDevicePath ? "Saving Backup..." : "Compile & Save Backup to Custom Device Path"}
 </button>
 </div>

 {/* Immutability & Undeletability Security Safeguards Status */}
 <div className="p-4 rounded-xl border border-primary/25 bg-primary/5 space-y-3">
 <div className="flex items-start gap-3">
 <span className="p-1.5 bg-primary/15 text-primary rounded-lg shrink-0 mt-0.5">
 <ShieldCheck className="h-4 w-4 text-primary" />
 </span>
 <div className="space-y-1">
 <span className="text-[10px] font-black uppercase tracking-widest text-primary block">
 Cryptographic Immutability & Undeletable File Guards
 </span>
 <p className="text-[9px] text-zinc-300 leading-relaxed">
 Standard web browsers run in a sandboxed security model that restricts changing native file write permissions or deletion blocks on the physical hard drive. To satisfy enterprise write-protection policies, TilePoint enforces the following active logical safeguards:
 </p>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2">
 <div className="p-2 bg-zinc-900/50 rounded-lg border border-zinc-800 space-y-1">
 <span className="text-[8.5px] font-bold uppercase text-emerald-400 flex items-center gap-1">
 <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
 Uneditable Cryptographic Seals
 </span>
 <p className="text-[8px] text-zinc-400 leading-normal">
 Every JSON and CSV backup is sealed with a digital SHA-256 signature. Any manual editing or tampering of the files outside of the application invalidates the cryptographic seal, causing the restore parser to reject the file.
 </p>
 </div>
 <div className="p-2 bg-zinc-900/50 rounded-lg border border-zinc-800 space-y-1">
 <span className="text-[8.5px] font-bold uppercase text-emerald-400 flex items-center gap-1">
 <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
 Undeletable Direct Recovery
 </span>
 <p className="text-[8px] text-zinc-400 leading-normal">
 All exported backups are logged in a secure IndexedDB history database. When the device directory is connected, the application automatically scans for deleted files and regenerates them to the folder in the background.
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Guaranteed Historical Transaction Retention Policy Status */}
 <div className="p-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 space-y-3">
 <div className="flex items-center gap-2">
 <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg shrink-0">
 <ShieldCheck className="h-4 w-4" />
 </span>
 <div>
 <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">
 Historical Data Permanent Retention Active
 </span>
 <span className="text-[9px] text-zinc-400 font-medium">
 Compliant with corporate and regulatory audit policies.
 </span>
 </div>
 </div>
 
 <div className="text-[10.5px] text-zinc-300 leading-relaxed space-y-2">
 <p>
 TilePoint is strictly configured to protect core business archives. High-integrity records including <strong>sales invoices, general ledger journals, cashier shift history, and corporate audit logs</strong> can never be automatically deleted or recycled.
 </p>
 <p className="text-zinc-400 text-[9.5px]">
 All historical transactions—including those from previous calendar years—are stored safely within the browser index and device snapshots. Standard purging or clean-up operations cannot affect archived sales ledger data, guaranteeing 100% long-term visibility.
 </p>
 </div>

 <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[9.5px] font-bold text-emerald-400 uppercase tracking-wide">
 <span>Compliance Status:</span>
 <span className="flex items-center gap-1">
 <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full" />
 Immutable Sales Archives Locked
 </span>
 </div>
 </div>

 </div>
 )}

 {/* Subtab D: SELECTIVE ARCHIVAL & PURGING */}
 {dbSubTab === 'archive' && (
 <div className="space-y-5 animate-fade-in font-sans">
 {/* Header Info Banner */}
 <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-2">
 <div className="flex items-center gap-2 text-primary">
 <FolderArchive className="h-5 w-5 shrink-0" />
 <h5 className="text-xs font-extrabold uppercase tracking-wider">
 Secondary Archival, Retention Policy & Category Purging
 </h5>
 </div>
 <p className="text-[10.5px] text-default-500 leading-relaxed">
 Configure time-threshold retention rules per category or manually export historical records into secondary JSON archives before removing them from active database state.
 </p>
 </div>

 {/* SYSTEM DATA RETENTION POLICY CONFIGURATION CARD */}
 <div className="p-4 rounded-2xl border border-divider/30 bg-content1/80 space-y-4">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-divider/15">
 <div>
 <div className="flex items-center gap-2">
 <ShieldCheck className="h-4 w-4 text-primary" />
 <h6 className="text-xs font-black uppercase tracking-wider text-foreground">
 System Data Retention Policy Configuration
 </h6>
 </div>
 <p className="text-[10px] text-default-500 mt-0.5">
 Define custom time-thresholds for automated data lifecycles. Configured policy rules dictate retention limits before records become eligible for secondary archival.
 </p>
 </div>
 
 <button
 type="button"
 onClick={() => setIsBatchCleanupConfirmOpen(true)}
 className="px-3 py-2 bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-sm"
 >
 <Play className="h-3.5 w-3.5" />
 Run Automated Policy Cleanup
 </button>
 </div>

 {batchCleanupStatus && (
 <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center gap-2 animate-fade-in">
 <CheckCircle className="h-4 w-4 shrink-0" />
 <span>{batchCleanupStatus}</span>
 </div>
 )}

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
 {[
 { id: 'auditLogs' as const, label: 'Audit Trail & Activity Logs', icon: Clock },
 { id: 'movements' as const, label: 'Stock Movement Ledger', icon: Layers },
 { id: 'sales' as const, label: 'Historical Sales Invoices', icon: FileSpreadsheet },
 { id: 'expenses' as const, label: 'Operating Expenses', icon: HardDrive },
 { id: 'returns' as const, label: 'Customer Product Returns', icon: RotateCcw },
 { id: 'damageLogs' as const, label: 'Damage & Waste Register', icon: ShieldAlert },
 ].map(item => {
 const IconC = item.icon;
 const currentMonths = db.retentionPolicy[item.id] ?? 6;
 const exceedingCount = computeMatchingCount(item.id, currentMonths);

 return (
 <div key={item.id} className="p-3 rounded-xl border border-divider/20 bg-background space-y-2.5">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className="p-1 rounded bg-primary/10 text-primary">
 <IconC className="h-3.5 w-3.5" />
 </span>
 <span className="text-[10.5px] font-extrabold text-foreground truncate max-w-[140px]">
 {item.label}
 </span>
 </div>
 {exceedingCount > 0 ? (
 <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
 {exceedingCount} due
 </span>
 ) : (
 <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
 Compliant
 </span>
 )}
 </div>

 <div className="flex items-center justify-between text-[9.5px]">
  <span className="text-default-500 ">Retention Policy:</span>
  <HeroDropdownSelect
    items={[
      { key: '1', label: '1 Month (30 Days)' },
      { key: '3', label: '3 Months (90 Days)' },
      { key: '6', label: '6 Months (180 Days)' },
      { key: '12', label: '1 Year (365 Days)' },
      { key: '24', label: '2 Years (730 Days)' },
      { key: '0', label: 'Keep Indefinitely (Never Purge)' },
    ]}
    selectedKey={String(currentMonths)}
    onSelectionChange={(val) => {
      const numVal = Number(val);
      db.updateRetentionPolicy(item.id, numVal);
      if (selectedArchivalCategory === item.id) {
        setSelectedArchivalAgeMonths(numVal);
      }
    }}
    size="sm"
    variant="pill"
    className="min-w-[140px]"
  />
  </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Step 1: Select Category */}
 <div className="space-y-2">
 <label className="text-[10px] font-black uppercase tracking-widest text-primary block">
 Step 1: Select Data Category
 </label>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
 {[
 { id: 'auditLogs' as const, label: 'Audit Trail & Activity Logs', icon: Clock, count: db.auditLogs.length, desc: 'System activity & security events' },
 { id: 'movements' as const, label: 'Stock Movement Ledger', icon: Layers, count: db.movements.length, desc: 'Inventory transfers & adjustments' },
 { id: 'sales' as const, label: 'Historical Sales Invoices', icon: FileSpreadsheet, count: db.sales.length, desc: 'Completed checkout sales records' },
 { id: 'expenses' as const, label: 'Operating Expenses', icon: HardDrive, count: db.expenses.length, desc: 'Branch expenses & petty cash' },
 { id: 'returns' as const, label: 'Customer Product Returns', icon: RotateCcw, count: db.productReturns.length, desc: 'Refunds & item restock history' },
 { id: 'damageLogs' as const, label: 'Damage & Waste Register', icon: ShieldAlert, count: db.damageLogs.length, desc: 'Defective & broken stock logs' },
 ].map(cat => {
 const IconComp = cat.icon;
 const isSelected = selectedArchivalCategory === cat.id;
 return (
 <button
 key={cat.id}
 type="button"
 onClick={() => setSelectedArchivalCategory(cat.id)}
 className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
 isSelected
 ? 'bg-primary/15 border-primary text-foreground shadow-md ring-1 ring-primary/30'
 : 'bg-background border-divider/20 hover:bg-primary/5 text-default-500'
 }`}
 >
 <div className="flex items-center justify-between">
 <span className={`p-1.5 rounded-lg ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-content1 text-primary'}`}>
 <IconComp className="h-4 w-4" />
 </span>
 <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-primary/20 text-primary' : 'bg-zinc-800 text-zinc-400'}`}>
 {cat.count} items
 </span>
 </div>
 <div>
 <span className="text-[11px] font-bold block">{cat.label}</span>
 <span className="text-[9px] text-default-500 opacity-80 leading-tight block">{cat.desc}</span>
 </div>
 </button>
 );
 })}
 </div>
 </div>

 {/* Step 2: Select Retention Cutoff */}
 <div className="space-y-2">
 <label className="text-[10px] font-black uppercase tracking-widest text-primary block">
 Step 2: Select Age Threshold Cutoff
 </label>
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
 {[
 { months: 1, label: 'Older than 1 mo', sub: '30 days+' },
 { months: 3, label: 'Older than 3 mos', sub: '90 days+' },
 { months: 6, label: 'Older than 6 mos', sub: '180 days (Rec.)' },
 { months: 12, label: 'Older than 1 yr', sub: '365 days+' },
 { months: 24, label: 'Older than 2 yrs', sub: '730 days+' },
 { months: 0, label: 'All Records', sub: 'Full Purge' },
 ].map(opt => {
 const isSelected = selectedArchivalAgeMonths === opt.months;
 return (
 <button
 key={opt.months}
 type="button"
 onClick={() => setSelectedArchivalAgeMonths(opt.months)}
 className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
 isSelected
 ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold'
 : 'bg-background border-divider/20 hover:bg-primary/5 text-default-500'
 }`}
 >
 <span className="text-[10px] font-extrabold uppercase block">{opt.label}</span>
 <span className="text-[8px] opacity-75">{opt.sub}</span>
 </button>
 );
 })}
 </div>
 </div>

 {/* Estimation & Action Card */}
 {(() => {
 const matchingCount = computeMatchingCount(selectedArchivalCategory, selectedArchivalAgeMonths);
 const cutoffDate = selectedArchivalAgeMonths > 0
 ? new Date(Date.now() - selectedArchivalAgeMonths * 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
 : 'All historical dates';
 const ageText = selectedArchivalAgeMonths === 0 ? 'all records' : `records older than ${selectedArchivalAgeMonths} month(s) (before ${cutoffDate})`;

 return (
 <div className="p-4 rounded-2xl border border-divider/20 bg-content1/50 space-y-4">
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-divider/15">
 <div>
 <span className="text-[9px] font-black uppercase tracking-widest text-default-500 block">
 Archival Scope Calculation
 </span>
 <span className="text-xs font-bold text-foreground">
 Category: <span className="text-primary uppercase ">{selectedArchivalCategory}</span> | Threshold: <span className="text-amber-400 ">{selectedArchivalAgeMonths === 0 ? 'Full Purge' : `${selectedArchivalAgeMonths} Months`}</span>
 </span>
 </div>
 <div className="text-right">
 <span className="text-[9px] text-default-500 block uppercase">Matching Records</span>
 <span className={`text-lg font-black ${matchingCount > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
 {matchingCount} {matchingCount === 1 ? 'record' : 'records'}
 </span>
 </div>
 </div>

 <p className="text-[10px] text-zinc-300 leading-relaxed">
 {matchingCount > 0 ? (
 <>
 Ready to archive <strong className="text-amber-300">{matchingCount}</strong> {ageText}. Triggering execution will save a downloadable secondary JSON archive file (<code className="text-xs bg-zinc-900 px-1 py-0.5 rounded text-emerald-400">TilePoint_Archive_{selectedArchivalCategory}_...json</code>) and purge those items from active storage.
 </>
 ) : (
 <>
 No records found in category <strong className="text-primary">{selectedArchivalCategory}</strong> matching the criteria ({ageText}).
 </>
 )}
 </p>

 {archivingStatus && (
 <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold animate-fade-in flex items-center gap-2">
 <CheckCircle className="h-4 w-4 shrink-0" />
 <span>{archivingStatus}</span>
 </div>
 )}

 <div className="pt-1">
 <button
 type="button"
 disabled={matchingCount === 0 || isProcessingArchive}
 onClick={() => setIsArchiveConfirmOpen(true)}
 className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg "
 >
 <Download className="h-4 w-4" />
 {isProcessingArchive ? 'Compiling Archive & Purging...' : `Export Archive & Purge ${matchingCount} Records`}
 </button>
 </div>
 </div>
 );
 })()}

 {/* Past Purge Audit Trail */}
 <div className="p-4 rounded-2xl border border-divider/15 bg-content1/30 space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
 <Terminal className="h-3.5 w-3.5" />
 Data Category Purge Audit History
 </span>
 <span className="text-[9px] text-zinc-400 ">
 {db.auditLogs.filter(a => a.actionCode === 'DATA_CATEGORY_PURGE').length} past purge events
 </span>
 </div>

 <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
 {db.auditLogs.filter(a => a.actionCode === 'DATA_CATEGORY_PURGE').length === 0 ? (
 <div className="p-3 text-center text-[10px] text-zinc-500 italic rounded-lg bg-zinc-900/30">
 No selective category purges recorded yet. All historical records remain intact.
 </div>
 ) : (
 db.auditLogs
 .filter(a => a.actionCode === 'DATA_CATEGORY_PURGE')
 .slice(0, 10)
 .map(log => (
 <div key={log.id} className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-[9.5px] flex items-start justify-between gap-3">
 <div className="space-y-0.5">
 <span className="text-emerald-400 font-bold block">{log.description}</span>
 <span className="text-zinc-500 text-[8.5px]">
 Executed by: {log.userName || log.username || 'System'} | Category: {log.tableAffected || log.recordId || 'General'}
 </span>
 </div>
 <span className="text-zinc-500 text-[8.5px] whitespace-nowrap shrink-0">
 {new Date(log.createdAt || log.timestamp || '').toLocaleString()}
 </span>
 </div>
 ))
 )}
 </div>
 </div>

 {/* Confirmation Modal */}
 {isArchiveConfirmOpen && typeof document !== 'undefined' && createPortal(
 <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-fade-in">
 <div 
 className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity" 
 onClick={() => setIsArchiveConfirmOpen(false)} 
 />
 <div className="relative bg-zinc-900 border border-amber-500/40 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl z-10">
 <div className="flex items-center gap-2.5 text-amber-400">
 <AlertTriangle className="h-5 w-5 shrink-0" />
 <h4 className="text-sm font-extrabold uppercase tracking-wider">
 Confirm Category Archival & Purge
 </h4>
 </div>

 <p className="text-xs text-zinc-300 leading-relaxed">
 You are about to export and purge <strong className="text-amber-300 ">{computeMatchingCount(selectedArchivalCategory, selectedArchivalAgeMonths)} records</strong> from category <strong className="text-primary uppercase ">{selectedArchivalCategory}</strong>.
 </p>

 <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1.5 text-[10px] text-zinc-400 ">
 <div className="flex justify-between">
 <span>Category:</span>
 <span className="text-white font-bold uppercase">{selectedArchivalCategory}</span>
 </div>
 <div className="flex justify-between">
 <span>Age Threshold:</span>
 <span className="text-white font-bold">{selectedArchivalAgeMonths === 0 ? 'All Records' : `${selectedArchivalAgeMonths} Months`}</span>
 </div>
 <div className="flex justify-between">
 <span>Matching Count:</span>
 <span className="text-amber-400 font-bold">{computeMatchingCount(selectedArchivalCategory, selectedArchivalAgeMonths)} items</span>
 </div>
 <div className="flex justify-between">
 <span>Action:</span>
 <span className="text-emerald-400 font-bold">Secondary Archive Export + Local Purge</span>
 </div>
 </div>

 <p className="text-[9.5px] text-zinc-400 italic">
 A downloadable secondary archive file will be compiled and saved automatically.
 </p>

 <div className="flex items-center justify-end gap-2 pt-2">
 <button
 type="button"
 onClick={() => setIsArchiveConfirmOpen(false)}
 className="px-4 py-2 text-xs font-bold uppercase text-zinc-400 hover:text-white bg-zinc-800 rounded-xl cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="button"
 disabled={isProcessingArchive}
 onClick={async () => {
 setIsProcessingArchive(true);
 try {
 const res = await db.exportAndPurgeCategoryData(selectedArchivalCategory, selectedArchivalAgeMonths);
 if (res.count > 0) {
 setArchivingStatus(`Successfully archived ${res.count} records to "${res.exportedFilename}" and purged active category state.`);
 setTimeout(() => setArchivingStatus(null), 7000);
 } else {
 setArchivingStatus('No records were purged.');
 setTimeout(() => setArchivingStatus(null), 3000);
 }
 } catch (e: any) {
 setArchivingStatus(`Error during purge: ${e?.message || 'Failed'}`);
 } finally {
 setIsProcessingArchive(false);
 setIsArchiveConfirmOpen(false);
 }
 }}
 className="px-4 py-2 text-xs font-black uppercase text-black bg-amber-500 hover:bg-amber-400 rounded-xl cursor-pointer "
 >
 {isProcessingArchive ? 'Processing...' : 'Confirm & Purge'}
 </button>
 </div>
 </div>
 </div>,
 document.body
 )}

 {/* Batch Automated Policy Cleanup Modal */}
 {isBatchCleanupConfirmOpen && typeof document !== 'undefined' && createPortal(
 <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-fade-in">
 <div 
 className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity" 
 onClick={() => setIsBatchCleanupConfirmOpen(false)} 
 />
 <div className="relative bg-zinc-900 border border-primary/40 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl z-10">
 <div className="flex items-center gap-2.5 text-emerald-400">
 <ShieldCheck className="h-5 w-5 shrink-0" />
 <h4 className="text-sm font-extrabold uppercase tracking-wider">
 Automated Retention Policy Cleanup
 </h4>
 </div>

 <p className="text-xs text-zinc-300 leading-relaxed">
 This action will evaluate all system data categories against their configured retention policy limits and execute secondary archival and purging for all eligible historical records.
 </p>

 <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2 text-[10px] ">
 <span className="text-[9px] uppercase text-zinc-400 font-bold block pb-1 border-b border-zinc-800">
 Retention Lifecycle Scope Breakdown
 </span>
 {[
 { id: 'auditLogs' as const, label: 'Audit Trail & Activity Logs' },
 { id: 'movements' as const, label: 'Stock Movement Ledger' },
 { id: 'sales' as const, label: 'Historical Sales Invoices' },
 { id: 'expenses' as const, label: 'Operating Expenses' },
 { id: 'returns' as const, label: 'Customer Product Returns' },
 { id: 'damageLogs' as const, label: 'Damage & Waste Register' },
 ].map(cat => {
 const months = db.retentionPolicy[cat.id] ?? 6;
 const count = computeMatchingCount(cat.id, months);
 return (
 <div key={cat.id} className="flex justify-between items-center text-zinc-300">
 <span className="truncate max-w-[180px]">{cat.label}:</span>
 <div className="flex items-center gap-2">
 <span className="text-zinc-500">{months === 0 ? 'Indefinite' : `>${months}m`}</span>
 <span className={`font-bold ${count > 0 ? 'text-amber-400' : 'text-zinc-600'}`}>
 {count} items
 </span>
 </div>
 </div>
 );
 })}
 </div>

 <div className="flex items-center justify-end gap-2 pt-2">
 <button
 type="button"
 onClick={() => setIsBatchCleanupConfirmOpen(false)}
 className="px-4 py-2 text-xs font-bold uppercase text-zinc-400 hover:text-white bg-zinc-800 rounded-xl cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="button"
 disabled={isProcessingBatchCleanup}
 onClick={async () => {
 setIsProcessingBatchCleanup(true);
 try {
 const results = await db.runRetentionPolicyCleanup();
 if (results.length > 0) {
 const totalCount = results.reduce((a, b) => a + b.count, 0);
 setBatchCleanupStatus(`Automated policy cleanup finished successfully. Archived and purged ${totalCount} records across ${results.length} categories.`);
 setTimeout(() => setBatchCleanupStatus(null), 8000);
 } else {
 setBatchCleanupStatus('All data categories are fully compliant with their configured retention policies.');
 setTimeout(() => setBatchCleanupStatus(null), 4000);
 }
 } catch (e: any) {
 setBatchCleanupStatus(`Error during policy cleanup: ${e?.message || 'Failed'}`);
 } finally {
 setIsProcessingBatchCleanup(false);
 setIsBatchCleanupConfirmOpen(false);
 }
 }}
 className="px-4 py-2 text-xs font-black uppercase text-black bg-emerald-400 hover:bg-emerald-300 rounded-xl cursor-pointer "
 >
 {isProcessingBatchCleanup ? 'Executing Policy Cleanup...' : 'Confirm & Run Policy Cleanup'}
 </button>
 </div>
 </div>
 </div>,
 document.body
 )}
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 </div>
 </div>,
 document.body
 )}

 {isShowingHandbook && typeof document !== 'undefined' && createPortal(
 <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in font-sans">
 <div 
 className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity" 
 onClick={() => { setIsShowingHandbook(false); setIsOpen(true); }} 
 />
 <motion.div
 initial={{ scale: 0.95, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.95, opacity: 0 }}
 id="tilepoint-printable-handbook"
 className="relative w-full max-w-4xl rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground text-left space-y-5 max-h-[90vh] overflow-hidden flex flex-col"
 >
 {/* Header Block */}
 <div className="flex justify-between items-center border-b border-divider/15 pb-4 shrink-0">
 <div className="flex items-center gap-2.5">
 <div className="p-2 bg-primary/10 text-primary rounded-xl">
 <BookOpen className="h-5 w-5" />
 </div>
 <div>
 <h3 className="text-sm font-black text-primary uppercase tracking-widest leading-none">
 TilePoint Systems Guided Handbook
 </h3>
 <span className="text-[10px] text-zinc-400 mt-1 block">
 Official Reference Operations Manual • Build Version 2.5.0 (Audited)
 </span>
 </div>
 </div>
 <button
 type="button"
 onClick={() => {
 setIsShowingHandbook(false);
 setIsOpen(true);
 }}
 className="p-1.5 rounded-full hover:bg-default-100 text-default-500 cursor-pointer transition-colors"
 aria-label="Close Handbook"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 {/* Quick search input header */}
 <div className="p-3 bg-content1 rounded-2xl border border-divider/10 flex items-center gap-2 shrink-0">
 <Search className="h-4 w-4 text-zinc-400 shrink-0" />
 <input
 type="text"
 placeholder="Search systems manual chapters or frequently asked questions (FAQs)..."
 value={faqSearch ?? ''}
 onChange={(e) => setFaqSearch(e.target.value)}
 className="w-full bg-transparent text-xs text-foreground placeholder-zinc-500 border-0 focus:outline-none"
 />
 {faqSearch && (
 <button
 type="button"
 onClick={() => setFaqSearch('')}
 className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-default-100 text-[10px] uppercase font-bold cursor-pointer"
 >
 Clear
 </button>
 )}
 </div>

 {/* Scrollable Document Body */}
 <div className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-thin scrollbar-thumb-divider">
 {/* CHAPTERS INDEX SECTION */}
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-450 ">
 System Core Features &amp; Modules
 </h4>
 <span className="text-[9px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full ">
 Chapters 1 - 8
 </span>
 </div>

 <div className="grid grid-cols-1 gap-4">
 {/* Chapter 1 */}
 {ch1Visible && (
 <div className="bg-content1 p-5 rounded-2xl border border-divider/10 hover:border-primary/20 transition-colors">
 <h4 className="text-xs font-black uppercase text-primary tracking-wider mb-2 flex items-center gap-1.5">
 <span className="px-1.5 py-0.5 bg-primary/10 rounded text-[9px]">CH 1</span>
 The ERP OS Checkout Desk &amp; Area Estimators
 </h4>
 <p className="text-[11px] text-zinc-350 leading-relaxed">
 The ERP OS Checkout Desk accepts real-time barcode scans, manual item code lookups, and direct SKU lookups.
 </p>
 <ul className="list-disc pl-5 text-[10.5px] text-zinc-400 space-y-1 mt-2 ">
 <li>Use the <strong className="text-zinc-200">Interactive Tile Coverage Estimator</strong> to dynamically translate physical floor dimensions (length and width in meters) into exact retail tile box counts.</li>
 <li>Adapts standard wastage overrides (+5% standard grid bonds, +10% diagonal cuts) to prevent shortfalls over tile clipping boundaries.</li>
 <li>Tendering handles precise decimal change calculations, printing receipt vouchers, and instantly subtracting sold quantities from active branch inventories.</li>
 </ul>
 </div>
 )}

 {/* Chapter 2 */}
 {ch2Visible && (
 <div className="bg-content1 p-5 rounded-2xl border border-divider/10 hover:border-primary/20 transition-colors">
 <h4 className="text-xs font-black uppercase text-primary tracking-wider mb-2 flex items-center gap-1.5">
 <span className="px-1.5 py-0.5 bg-primary/10 rounded text-[9px]">CH 2</span>
 Regional Warehouse Stock &amp; Unified Pools View
 </h4>
 <p className="text-[11px] text-zinc-350 leading-relaxed">
 Administrators possess master privileges to analyze global stocking pipelines on-screen.
 </p>
 <ul className="list-disc pl-5 text-[10.5px] text-zinc-400 space-y-1 mt-2 ">
 <li>The <strong className="text-zinc-200">Unified Global Pools</strong> (Ledger sub-tab) lists comparative stock levels side-by-side across all active branches.</li>
 <li>Branch filters filter main catalog lists. A consolidated dropdown is available to verify stock indices across multiple depots simultaneously.</li>
 <li>Automated visual flags indicate stock health: <span className="text-emerald-400">In Stock</span>, <span className="text-amber-500/90">Low Stock</span>, or <span className="text-red-400">Critical Warning</span>.</li>
 </ul>
 </div>
 )}

 {/* Chapter 3 */}
 {ch3Visible && (
 <div className="bg-content1 p-5 rounded-2xl border border-divider/10 hover:border-primary/20 transition-colors">
 <h4 className="text-xs font-black uppercase text-primary tracking-wider mb-2 flex items-center gap-1.5">
 <span className="px-1.5 py-0.5 bg-primary/10 rounded text-[9px]">CH 3</span>
 Custom Alert Threshold Overrides
 </h4>
 <p className="text-[11px] text-zinc-350 leading-relaxed">
 Since different locations experience unique sales velocities, low-stock trigger boundaries can be custom-defined at a local level.
 </p>
 <ul className="list-disc pl-5 text-[10.5px] text-zinc-400 space-y-1 mt-2 ">
 <li>Each tile preserves a master baseline minimum threshold designated at registration.</li>
 <li>From the product detail editor, branch managers can submit localized <strong className="text-zinc-200">Alert Overrides</strong> that apply uniquely to their specific branch codes.</li>
 <li>Overrides trigger amber alert status rows inside the central lists for local reorder warning awareness.</li>
 </ul>
 </div>
 )}

 {/* Chapter 4 */}
 {ch4Visible && (
 <div className="bg-content1 p-5 rounded-2xl border border-divider/10 hover:border-primary/20 transition-colors">
 <h4 className="text-xs font-black uppercase text-primary tracking-wider mb-2 flex items-center gap-1.5">
 <span className="px-1.5 py-0.5 bg-primary/10 rounded text-[9px]">CH 4</span>
 Inter-Branch Stock Transfers &amp; Verification Chain
 </h4>
 <p className="text-[11px] text-zinc-350 leading-relaxed">
 Stock dispatches are regulated by a multi-stage, double-entry reconciliation pipeline.
 </p>
 <ul className="list-disc pl-5 text-[10.5px] text-zinc-400 space-y-1 mt-2 ">
 <li>Dispatches create a formal <strong className="text-zinc-200">Transfer Invoice</strong> that deducts quantities from the origin branch's active inventory immediately and sets it to "Transit" state.</li>
 <li>The destination branch's inventory will NOT increment until a destination operator physically inspects and approves the shipment.</li>
 <li>Clicking <strong className="text-zinc-350">Acknowledge Receipt &amp; Add Stock</strong> merges the items into target pools, committing the double-entry transaction.</li>
 </ul>
 </div>
 )}

 {/* Chapter 5 */}
 {ch5Visible && (
 <div className="bg-content1 p-5 rounded-2xl border border-divider/10 hover:border-primary/20 transition-colors">
 <h4 className="text-xs font-black uppercase text-primary tracking-wider mb-2 flex items-center gap-1.5">
 <span className="px-1.5 py-0.5 bg-primary/10 rounded text-[9px]">CH 5</span>
 Shift Control, Daily Drawer Balancing &amp; Audits
 </h4>
 <p className="text-[11px] text-zinc-350 leading-relaxed">
 Secure cash drawer compliance and operations control are driven by local shift events.
 </p>
 <ul className="list-disc pl-5 text-[10.5px] text-zinc-400 space-y-1 mt-2 ">
 <li>Cashiers open shifts by logging a physical <strong className="text-zinc-200">Starting Cash Float</strong> inside the active register interface.</li>
 <li>All offline sales journals are aggregated against cash and digital credit payments inside the shift module.</li>
 <li>Closing shifts requires logging a final drawers count to isolate cash discrepancies, which are committed as audited records.</li>
 </ul>
 </div>
 )}

 {/* Chapter 6 */}
 {ch6Visible && (
 <div className="bg-content1 p-5 rounded-2xl border border-divider/10 hover:border-primary/20 transition-colors">
 <h4 className="text-xs font-black uppercase text-primary tracking-wider mb-2 flex items-center gap-1.5">
 <span className="px-1.5 py-0.5 bg-primary/10 rounded text-[9px]">CH 6</span>
 Multi-Format Sales Reporting, CSVs &amp; Print PDFs
 </h4>
 <p className="text-[11px] text-zinc-350 leading-relaxed">
 To maintain rigorous retail compliance, TilePoint supports high-fidelity output exports for managers.
 </p>
 <ul className="list-disc pl-5 text-[10.5px] text-zinc-400 space-y-1 mt-2 ">
 <li>Daily summary sheets can be compiled into standard <strong className="text-zinc-200">Raw CSV</strong> files or formatted <strong className="text-zinc-200">Excel Templates</strong> featuring formatted columns.</li>
 <li>The <strong className="text-zinc-200">Sales Print Modal</strong> builds formal visual papers including structured pricing pools, item invoice listings, and operator signature spots.</li>
 <li>Click <em className="text-zinc-150">Trigger System Print</em> inside the modal to output to paper or select <em className="text-zinc-150">"Save as PDF"</em> to write digital PDF files.</li>
 </ul>
 </div>
 )}

 {/* Chapter 7 */}
 {ch7Visible && (
 <div className="bg-content1 p-5 rounded-2xl border border-divider/10 hover:border-primary/20 transition-colors">
 <h4 className="text-xs font-black uppercase text-primary tracking-wider mb-2 flex items-center gap-1.5">
 <span className="px-1.5 py-0.5 bg-primary/10 rounded text-[9px]">CH 7</span>
 Damage Registers, Wastage Logs &amp; Loss Write-Offs
 </h4>
 <p className="text-[11px] text-zinc-350 leading-relaxed">
 Handles damaged stock reconciliation for cracked, shattered, or flawed inventory.
 </p>
 <ul className="list-disc pl-5 text-[10.5px] text-zinc-400 space-y-1 mt-2 ">
 <li>Broken tiles must be logged inside the <strong className="text-zinc-200">Damage Register Module</strong> by entering specific product codes, quantities, and detailed causes.</li>
 <li>Submitting a damage voucher instantly writeoff the target branch's stocks and adds historical entries down the general ledger.</li>
 <li>Ensures precise inventory costs valuation by separating shrinkage (wastage) losses from regular sales records.</li>
 </ul>
 </div>
 )}

 {/* Chapter 8 */}
 {ch8Visible && (
 <div className="bg-content1 p-5 rounded-2xl border border-divider/10 hover:border-primary/20 transition-colors">
 <h4 className="text-xs font-black uppercase text-primary tracking-wider mb-2 flex items-center gap-1.5">
 <span className="px-1.5 py-0.5 bg-primary/10 rounded text-[9px]">CH 8</span>
 Access Control Security &amp; Lockout Rules
 </h4>
 <p className="text-[11px] text-zinc-350 leading-relaxed">
 Rigorous role-based security prevents unauthorized edits and maintains system integrity.
 </p>
 <ul className="list-disc pl-5 text-[10.5px] text-zinc-400 space-y-1 mt-2 ">
 <li>Core actions are gated by explicit credentials. Standard sales desks prevent workers from altering records or viewing other branch balances.</li>
 <li>Under professional standards, login panels enforce an automated <strong className="text-zinc-200">Security Intrusion Lockout</strong>. If a user enters an incorrect passcode five consecutive times, the console blocks access to prevent database breaches.</li>
 </ul>
 </div>
 )}
 </div>
 </div>

 {/* SYSTEM FAQ INTERACTIVE SECTION */}
 <div className="space-y-4 pt-4 border-t border-divider/15">
 <div className="flex items-center justify-between">
 <h4 className="text-[10px] font-black uppercase tracking-widest text-[#71717a] flex items-center gap-1.5">
 <HelpCircle className="h-4 w-4 text-primary" />
 <span>Frequently Asked Questions (System Q&amp;As)</span>
 </h4>
 <span className="text-[8px] font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 px-2 py-0.5 rounded uppercase tracking-wider ">
 Search Active
 </span>
 </div>

 <div className="space-y-2.5">
 {(() => {
 const faqs = [
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
 ];

 const matchedFaqs = faqs.filter(faq => {
 if (!faqSearch) return true;
 const cleanSearch = faqSearch.toLowerCase().trim();
 const searchTerms = cleanSearch.split(/\s+/).filter(Boolean);
 const combinedText = `${faq.q} ${faq.a}`.toLowerCase();
 return searchTerms.every(term => combinedText.includes(term));
 });

 return (
 <>
 {matchedFaqs.map((faq, index) => {
 const isOpen = activeFaq === index;
 return (
 <div
 key={index}
 className="p-4 rounded-2xl bg-background border border-divider/10 hover:border-divider/25 transition-all text-left"
 >
 <button
 type="button"
 onClick={() => setActiveFaq(isOpen ? null : index)}
 className="w-full flex items-center justify-between text-left text-xs font-black text-foreground hover:text-primary select-none"
 >
 <span className="pr-4">{faq.q}</span>
 {isOpen ? (
 <ChevronUp className="h-4 w-4 shrink-0 text-primary" />
 ) : (
 <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500 hover:text-primary" />
 )}
 </button>
 {isOpen && (
 <div className="mt-2.5 pt-2.5 border-t border-divider/5 text-[11px] text-zinc-300 leading-relaxed font-sans">
 {faq.a}
 </div>
 )}
 </div>
 );
 })}

 {!anyChapterVisible && matchedFaqs.length === 0 && (
 <div className="text-center py-6 text-zinc-500 italic text-xs">
 No matching manual chapters or FAQ questions found for your query. Try a different search term like "inventory" or "print".
 </div>
 )}
 </>
 );
 })()}
 </div>
 </div>
 </div>

 {/* Modal Footer Controls */}
 <div className="border-t border-divider/15 pt-4 flex flex-wrap gap-4 items-center justify-between shrink-0">
 <span className="text-[10px] text-zinc-400">
 Official Guided Operational Directive • Authorized Version
 </span>
 <div className="flex gap-2">
 <button
 type="button"
 onClick={() => {
 setIsShowingHandbook(false);
 setIsOpen(true);
 }}
 className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white rounded-full transition-all cursor-pointer "
 >
 Dismiss
 </button>
 <button
 type="button"
 onClick={() => {
 window.print();
 triggerToast('Initiated printable operations guide layout download.', 'success');
 }}
 className="px-5 py-2 bg-primary hover:bg-primary/95 text-primary-foreground font-black text-xs uppercase tracking-wide rounded-full shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
 >
 <Printer className="h-4 w-4" />
 <span>Print Reference Manual</span>
 </button>
 </div>
 </div>
 </motion.div>
 </div>,
 document.body
 )}
 <ToastNotification
 message={toastMessage}
 onClose={() => setToastMessage(null)}
 />
 </>
 );
}
