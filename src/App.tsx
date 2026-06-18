/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DbProvider, useDb, DbSnapshot } from './context/DbContext';
import { UserRole, User } from './types/db';
import { motion, AnimatePresence } from 'motion/react';
import { SkeletalLoader } from './components/SkeletalLoader';
import { LoginModule } from './components/LoginModule';
import { SetupModule } from './components/SetupModule';
import { createSaltedHash, formatHashToken, verifyPasswordWithToken } from './lib/crypto';

// Modular components imports
import { Dashboard } from './components/Dashboard';
import { PosModule } from './components/PosModule';
import { InventoryModule } from './components/InventoryModule';
import { ProcurementModule } from './components/ProcurementModule';
import { TransmittalModule } from './components/TransmittalModule';
import { ShiftModule } from './components/ShiftModule';
import { BranchModule } from './components/BranchModule';
import { UsersModule } from './components/UsersModule';
import { CalculatorModule } from './components/CalculatorModule';
import { ArchitectureModule } from './components/ArchitectureModule';
import { StaffPortal } from './components/StaffPortal';
import AtposExtraModules from './components/AtposExtraModules';
import { SalesTransmissionModule } from './components/SalesTransmissionModule';
import { DeliveriesModule } from './components/DeliveriesModule';
import { TutorialOnboarding } from './components/TutorialOnboarding';
import { PrivacyAccessibilityHub } from './components/PrivacyAccessibilityHub';
import { SystemLoadingOverlay } from './components/SystemLoadingOverlay';
import { IdleScreen } from './components/IdleScreen';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { DamageRegisterModule } from './components/DamageRegisterModule';
import { generateThemeFromSeed, applyM3ThemeToDOM, resetM3ThemeOverride } from './lib/themeGenerator';

import {
  LayoutDashboard,
  ShoppingCart,
  Layers,
  FileText,
  Send,
  LockKeyhole,
  Building2,
  Users as UsersIcon,
  Calculator,
  Moon,
  Sun,
  User as LucideUser,
  Power,
  Package,
  Building,
  Menu,
  X,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Database,
  History,
  Eye,
  EyeOff,
  RefreshCw,
  DollarSign,
  Truck,
  BookOpen,
  Accessibility,
  Shield,
  CalendarDays,
  Trash2,
  Download,
  Upload,
  Sliders,
  AlertTriangle,
  Palette
} from 'lucide-react';

function AppContent() {
  const { 
    currentUser, 
    updateCurrentUser, 
    updateUser, 
    users,
    branches, 
    isLoggedIn, 
    logout, 
    isConfigured,
    dbSnapshots,
    createDbSnapshot,
    restoreDbSnapshot,
    deleteDbSnapshot,
    autoBackupEnabled,
    setAutoBackupEnabled,
    backupIntervalHours,
    setBackupIntervalHours,
    lastAutoBackupTime,
    setLastAutoBackupTime,
    triggerSystemProcessing,
    dbSyncStatus,
    writeStatsCount,
    resetWriteStats,
    forceSyncAll,
    debounceDelay,
    setDebounceDelay,
    suppliers,
    products,
    purchaseOrders,
    poItems,
    transmittals,
    shifts,
    sales,
    saleItems,
    movements,
    auditLogs,
    parkedSales,
    stockTransfers,
    branchStock,
    ledgerEntries,
    branchSalesReports,
    deliveries
  } = useDb();
  const [activeTab, setActiveTab] = useState(() => {
    const isFirstTime = typeof window !== 'undefined' && localStorage.getItem('tp_first_login_done') !== 'true';
    if (isFirstTime) return 'tutorials';
    if (currentUser && currentUser.role === UserRole.CASHIER) {
      return 'pos';
    }
    return 'dashboard';
  });

  const [previousTab, setPreviousTab] = useState('dashboard');

  useEffect(() => {
    if (activeTab !== 'pos') {
      setPreviousTab(activeTab);
    }
  }, [activeTab]);

  // Dynamic automatic routing on login/identity-switch to ensure Admin sees dashboard first
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      const isFirstTime = typeof window !== 'undefined' && localStorage.getItem('tp_first_login_done') !== 'true';
      if (isFirstTime) {
        setActiveTab('tutorials');
        localStorage.setItem('tp_first_login_done', 'true');
      } else if (currentUser.role === UserRole.CASHIER) {
        setActiveTab('pos');
      } else if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER) {
        setActiveTab('dashboard');
      } else {
        setActiveTab('inventory-stocks');
      }
    }
  }, [isLoggedIn, currentUser?.id]);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(() => {
    const saved = localStorage.getItem('tilepoint_sidebar_minimized');
    return saved === 'true';
  });
  const [isTabChanging, setIsTabChanging] = useState(false);
  const [percentProgress, setPercentProgress] = useState(0);

  useEffect(() => {
    localStorage.setItem('tilepoint_sidebar_minimized', String(isSidebarMinimized));
  }, [isSidebarMinimized]);

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('tilepoint_dark_theme');
    return saved !== null ? saved === 'true' : true;
  });
  const [isSubMenuCollapsed, setIsSubMenuCollapsed] = useState(false);

  // Auto-minimize the sidebar when tab is POS Mode
  useEffect(() => {
    if (activeTab === 'pos') {
      setIsSidebarMinimized(true);
    }
  }, [activeTab]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // ATPOS v2 Collapsible Folder States
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    inventory: true,
    sale: false,
    adjustments: false,
    members: false,
    expenses: false,
    supplier: false,
    bir: false,
    'admin-bi': false,
    'admin-org': false,
    'admin-data': false
  });

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // Account settings states & Logout confirmatory dialogs
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [colorContrast, setColorContrast] = useState<'default' | 'medium' | 'high'>(() => {
    return (localStorage.getItem('tilepoint-color-contrast') as 'default' | 'medium' | 'high') || 'default';
  });

  const [maximizeTextContrast, setMaximizeTextContrast] = useState<boolean>(() => {
    return localStorage.getItem('tilepoint-maximize-text-contrast') === 'true';
  });

  useEffect(() => {
    const handleSync = () => {
      const contrast = (localStorage.getItem('tilepoint-color-contrast') as 'default' | 'medium' | 'high') || 'default';
      const maxText = localStorage.getItem('tilepoint-maximize-text-contrast') === 'true';
      const savedSeed = localStorage.getItem('tilepoint_custom_theme_primary');

      setColorContrast(contrast);
      setMaximizeTextContrast(maxText);

      // Apply the theme with latest contrast settings
      if (savedSeed) {
        try {
          const scheme = generateThemeFromSeed(savedSeed, darkMode, contrast);
          applyM3ThemeToDOM(scheme);
        } catch (err) {
          console.error('[M3 Dynamic Theme] Failed to auto-apply saved color theme:', err);
        }
      } else {
        resetM3ThemeOverride();
      }

      // Sync CSS accessibility high contrast and maximize text contrast flag classes
      if (contrast === 'high') {
        document.documentElement.classList.add('accessibility-high-contrast');
      } else {
        document.documentElement.classList.remove('accessibility-high-contrast');
      }

      if (maxText) {
        document.documentElement.classList.add('accessibility-maximize-text-contrast');
      } else {
        document.documentElement.classList.remove('accessibility-maximize-text-contrast');
      }
    };
    window.addEventListener('tilepoint-theme-updated', handleSync);
    handleSync();
    return () => {
      window.removeEventListener('tilepoint-theme-updated', handleSync);
    };
  }, [darkMode]);

  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const [showAccountSettingsModal, setShowAccountSettingsModal] = useState(false);
  const isCompactColumns = true;
  const [showDatabaseCoreModal, setShowDatabaseCoreModal] = useState(false);
  const [dbCoreTab, setDbCoreTab] = useState<'scheduler' | 'ledger' | 'import-export'>('scheduler');
  const [manualSnapshotName, setManualSnapshotName] = useState('');
  const [dbBackupFileMessage, setDbBackupFileMessage] = useState<string | null>(null);
  const [dbBackupFileError, setDbBackupFileError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Password reset/update form localized states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Profile customisation edit states
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editProfilePicture, setEditProfilePicture] = useState('');

  useEffect(() => {
    if (showAccountSettingsModal && currentUser) {
      setEditFullName(currentUser.fullName);
      setEditUsername(currentUser.username);
      setEditProfilePicture(currentUser.profilePicture || '');
    }
  }, [showAccountSettingsModal, currentUser]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Immersive POS terminal distraction-free mode state
  const [showImmersiveControls, setShowImmersiveControls] = useState(false);
  const [dragStartX, setDragStartX] = useState<number | null>(null);

  useEffect(() => {
    if (activeTab !== 'pos') {
      setShowImmersiveControls(true);
      return;
    }
    
    // Default distraction free mode on load/pos selection, unless account dropdown is active
    if (isAccountDropdownOpen) {
      setShowImmersiveControls(true);
    } else {
      setShowImmersiveControls(false);
    }

    // 1. Automatic fullscreen trigger on browser when in POS checkout mode.
    // (This runs when tab changes, triggered by a click/keypress gesture in the application)
    const requestFullscreenSafely = async () => {
      if (!document.fullscreenElement) {
        try {
          await document.documentElement.requestFullscreen();
        } catch (err) {
          console.warn('[Fullscreen POS Mode] Programmatic fullscreen request was ignored or blocked by the browser. Interaction captures will handle it.', err);
        }
      }
    };

    requestFullscreenSafely();

    // 2. Gesture fallback so if initial request is blocked, any click/key interaction in POS immediately triggers fullscreen
    const handleGestureFullscreen = async () => {
      if (activeTab === 'pos' && !document.fullscreenElement) {
        try {
          await document.documentElement.requestFullscreen();
        } catch (err) {
          console.error('[Fullscreen POS Mode] Failed to set fullscreen on user interaction:', err);
        }
      }
    };

    window.addEventListener('click', handleGestureFullscreen, { capture: true, once: true });
    window.addEventListener('keydown', handleGestureFullscreen, { capture: true, once: true });

    // 3. Keep mousemove listener for immersive distraction-free navigation menu
    const handleMouseMove = (e: MouseEvent) => {
      // Show modules if mouse approaches the left edge (<= 45px) or top edge (<= 45px)
      if (e.clientX <= 45 || e.clientY <= 45) {
        setShowImmersiveControls(true);
      } else {
        // Only collapse if the cursor is sufficiently far away from both the sidebar (width ~288px) and top header (height ~75px)
        // And NOT if the account dropdown is active
        if (e.clientX > 325 && e.clientY > 100 && !isAccountDropdownOpen) {
          setShowImmersiveControls(false);
        }
      }
    };

    // 4. Alt + Escape Key down listener to exit both browser full screen AND the distraction-free system
    const handleAltEscExit = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'Escape' || e.key === 'Esc')) {
        e.preventDefault();
        e.stopPropagation();
        
        // Exit browser full screen if active
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(err => console.warn('Exit fullscreen rejected:', err));
        }

        // Exit system POS terminal distraction-free mode back to previous tab
        setActiveTab(previousTab !== 'pos' ? previousTab : 'dashboard');
        showToast('Exited POS terminal and Fullscreen mode.');
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleAltEscExit, { capture: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleAltEscExit, { capture: true });
      window.removeEventListener('click', handleGestureFullscreen, { capture: true });
      window.removeEventListener('keydown', handleGestureFullscreen, { capture: true });
    };
  }, [activeTab, previousTab, isAccountDropdownOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setDragStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartX === null) return;
    const currentX = e.touches[0].clientX;
    const diffX = currentX - dragStartX;
    if (diffX > 40) { // Dragged to the right by more than 40px
      setShowImmersiveControls(true);
      setDragStartX(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragStartX(e.clientX);
  };

  const handleMouseMoveDrag = (e: React.MouseEvent) => {
    if (dragStartX === null) return;
    const diffX = e.clientX - dragStartX;
    if (diffX > 40) { // Dragged to the right by more than 40px
      setShowImmersiveControls(true);
      setDragStartX(null);
    }
  };

  const handleMouseUp = () => {
    setDragStartX(null);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError('');
    setIsUpdatingPassword(true);

    try {
      let passwordUpdates: Partial<User> = {};

      // Parse password updates if any of the fields are populated
      if (currentPassword || newPassword || confirmPassword) {
        if (!currentPassword || !newPassword || !confirmPassword) {
          setSettingsError('To change password, please fill out all password fields.');
          setIsUpdatingPassword(false);
          return;
        }

        // Verify current password match using our PBKDF2 hash
        const isMatch = await verifyPasswordWithToken(currentPassword, currentUser.passwordHash || '');
        if (!isMatch) {
          setSettingsError('Verification Failed: Current password is incorrect.');
          setIsUpdatingPassword(false);
          return;
        }

        if (newPassword.length < 6) {
          setSettingsError('Security Policy: New password must be at least 6 characters.');
          setIsUpdatingPassword(false);
          return;
        }

        if (newPassword !== confirmPassword) {
          setSettingsError('Confirmation Error: New passwords do not match.');
          setIsUpdatingPassword(false);
          return;
        }

        // Create new salted PBKDF2 bcrypt hash token
        const salt = (editUsername || currentUser.username) + '_salt_tok';
        const hashedVal = await createSaltedHash(newPassword, salt, 2500);
        const formattedToken = formatHashToken(salt, hashedVal, 2500);
        passwordUpdates.passwordHash = formattedToken;
      }

      // Check name/username validations
      if (!editFullName.trim()) {
        setSettingsError('Validation Error: Full Name is required.');
        setIsUpdatingPassword(false);
        return;
      }

      if (!editUsername.trim()) {
        setSettingsError('Validation Error: Username is required.');
        setIsUpdatingPassword(false);
        return;
      }

      const cleanUsername = editUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

      // Recalculate initials
      const newInitials = editFullName.split(' ').map(n => n ? n[0] : '').join('').toUpperCase().slice(0, 2) || 'AD';

      // Combine general updates
      const generalUpdates: Partial<User> = {
        fullName: editFullName.trim(),
        username: cleanUsername,
        profilePicture: editProfilePicture || undefined,
        avatarInitials: newInitials,
        ...passwordUpdates
      };

      // Mutate database structure states
      updateUser(currentUser.id, generalUpdates);
      updateCurrentUser(generalUpdates);

      // Clean success flow
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowAccountSettingsModal(false);
      showToast('Account details successfully updated!');
    } catch (err) {
      console.error(err);
      setSettingsError('Dynamic crypt engine error: unable to update profile.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('tilepoint_dark_theme', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Auto-apply saved custom dynamic M3 theme color seed if exists
    const savedSeed = localStorage.getItem('tilepoint_custom_theme_primary');
    if (savedSeed) {
      try {
        const contrast = (localStorage.getItem('tilepoint-color-contrast') as 'default' | 'medium' | 'high') || 'default';
        const scheme = generateThemeFromSeed(savedSeed, darkMode, contrast);
        applyM3ThemeToDOM(scheme);
      } catch (err) {
        console.error('[M3 Dynamic Theme] Failed to auto-apply saved color theme:', err);
      }
    } else {
      resetM3ThemeOverride();
    }
  }, [darkMode]);

  // Global High-Performance Cursor Tracker for Glowing Card hover effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Resolve up the DOM tree to locate any active hover target card
      const card = target.closest('.m3-card, .android-glass-card, .glowing-card') as HTMLElement | null;

      if (card) {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Apply updated layout coordinates directly to DOM to bypass costly React re-renders
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
        card.style.setProperty('--glow-opacity', '1');
      }
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const card = target.closest('.m3-card, .android-glass-card, .glowing-card') as HTMLElement | null;
      if (!card) {
        // Safe reset coordinates and remove active glowing spotlight opacity on exit
        const cards = document.querySelectorAll('.m3-card, .android-glass-card, .glowing-card');
        cards.forEach(el => {
          (el as HTMLElement).style.setProperty('--glow-opacity', '0');
        });
      }
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseover', handleMouseOver, { passive: true });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  if (!isConfigured) {
    return (
      <>
        <SetupModule />
        <PrivacyAccessibilityHub darkMode={false} />
      </>
    );
  }

  if (!isLoggedIn || !currentUser) {
    return (
      <>
        <LoginModule />
        <PrivacyAccessibilityHub darkMode={true} />
      </>
    );
  }

  if (currentUser.role === UserRole.STAFF) {
    return (
      <>
        <StaffPortal darkMode={darkMode} setDarkMode={setDarkMode} />
        <PrivacyAccessibilityHub darkMode={darkMode} hideFloatingButton={true} />
      </>
    );
  }

  // Tab change simulator timer with active linear progress
  const changeTab = (tabId: string) => {
    if (tabId === activeTab) return;
    
    // Safety role clearance checker
    const targetItem = menuItems.find(item => item.id === tabId);
    if (targetItem && !targetItem.roles.includes(currentUser.role)) {
      return;
    }

    setIsTabChanging(true);
    setPercentProgress(15);
    
    // Simulate progression loader
    const interval = setInterval(() => {
      setPercentProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 18;
      });
    }, 60);

    setTimeout(() => {
      clearInterval(interval);
      setPercentProgress(100);
      setActiveTab(tabId);
      setTimeout(() => {
        setIsTabChanging(false);
        setPercentProgress(0);
      }, 100);
    }, 400);
  };

  // Flat list of All Submodules for global routing, role-mapping and mobile navigation anchors
  const menuItems = [
    { id: 'tutorials', name: 'Operational Walkthrough', icon: BookOpen, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF] },
    { id: 'dashboard', name: 'Branch Dashboard', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.MANAGER] },
    { id: 'architecture', name: 'Database ERD Studio', icon: Database, roles: [UserRole.ADMIN] },
    { id: 'pos', name: 'POS Checkout Mode', icon: ShoppingCart, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER] },
    { id: 'shift', name: 'Shift drawer', icon: LockKeyhole, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER] },
    { id: 'calculator', name: 'Tile Coverage Calc', icon: Calculator, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF] },
    { id: 'branches', name: 'Branches Profile', icon: Building2, roles: [UserRole.ADMIN] },
    { id: 'users', name: 'Employee Directory', icon: UsersIcon, roles: [UserRole.ADMIN] },
    
    // ATPOS v2 Submodules
    { id: 'inventory-stocks', name: 'Catalog Stock Ledger', icon: Layers, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF] },
    { id: 'inventory-adjustments', name: 'Adjustments Logs', icon: Layers, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF] },
    { id: 'inventory-transfer', name: 'Stock Transfers', icon: Send, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF] },
    { id: 'inventory-logistics', name: 'Logistics Ledger & Heatmap', icon: Layers, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF] },
    { id: 'inventory-import', name: 'Old POS Migration', icon: Layers, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF] },
    { id: 'inventory-damage', name: 'Broken & BOA Register', icon: AlertTriangle, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF] },

    { id: 'adjustments-void', name: 'Search Voided Sales', icon: History, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER] },
    { id: 'adjustments-return', name: 'Search Returned Products', icon: RefreshCw, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER] },

    { id: 'members-manage', name: 'Manage Members', icon: UsersIcon, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER] },
    { id: 'members-receivables', name: 'Account Receivables', icon: UsersIcon, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER] },

    { id: 'expenses-add', name: 'Add Expenses', icon: DollarSign, roles: [UserRole.ADMIN, UserRole.MANAGER] },
    { id: 'expenses-search', name: 'Search Expenses', icon: DollarSign, roles: [UserRole.ADMIN, UserRole.MANAGER] },

    { id: 'suppliers-manage', name: 'Manage Suppliers', icon: Building2, roles: [UserRole.ADMIN] },
    { id: 'suppliers-credits', name: 'Active Credits', icon: Building2, roles: [UserRole.ADMIN] },
    { id: 'suppliers-calendar', name: 'Payment Calendar', icon: CalendarDays, roles: [UserRole.ADMIN] },

    { id: 'bir-xz', name: 'Search X&Z Reading', icon: FileText, roles: [UserRole.ADMIN, UserRole.MANAGER] },
    { id: 'bir-summary', name: 'BIR Summary Report', icon: FileText, roles: [UserRole.ADMIN, UserRole.MANAGER] },
    { id: 'reports-transmission', name: 'Sales reports Transmission', icon: Send, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER] },
    { id: 'deliveries-panel', name: 'Delivery Center', icon: Truck, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF] }
  ];

  // ATPOS v2 Directory Hierarchical Folders
  const sidebarCategoryTree = [
    {
      id: 'sale',
      name: 'Sale',
      icon: ShoppingCart,
      subItems: [
        { id: 'pos', name: 'POS Checkout Mode' },
        { id: 'shift', name: 'Shift drawer' },
        { id: 'calculator', name: 'Tile Coverage Calc' }
      ]
    },
    {
      id: 'inventory',
      name: 'Inventory',
      icon: Layers,
      subItems: [
        { id: 'inventory-stocks', name: 'Catalog Stock Ledger' },
        { id: 'inventory-adjustments', name: 'Adjustments Logs' },
        { id: 'inventory-transfer', name: 'Stock Transfers' },
        { id: 'inventory-logistics', name: 'Logistics Ledger & Heatmap' },
        { id: 'inventory-import', name: 'Old POS Migration' },
        { id: 'inventory-damage', name: 'Broken & BOA Register' }
      ]
    },
    {
      id: 'bir',
      name: 'BIR & Sales Transmission',
      icon: FileText,
      subItems: [
        { id: 'reports-transmission', name: 'Sales reports Transmission' },
        { id: 'bir-xz', name: 'Search X&Z Reading' },
        { id: 'bir-summary', name: 'BIR Summary Report' }
      ]
    },
    {
      id: 'deliveries',
      name: 'Cargo Deliveries',
      icon: Truck,
      subItems: [
        { id: 'deliveries-panel', name: 'Delivery Center' }
      ]
    },
    {
      id: 'members',
      name: 'Members',
      icon: UsersIcon,
      subItems: [
        { id: 'members-manage', name: 'Manage Members' },
        { id: 'members-receivables', name: 'Account Receivables' }
      ]
    },
    {
      id: 'supplier',
      name: 'Supplier',
      icon: Building2,
      subItems: [
        { id: 'suppliers-manage', name: 'Manage Suppliers' },
        { id: 'suppliers-credits', name: 'Active Credits' },
        { id: 'suppliers-calendar', name: 'Payment Calendar' }
      ]
    },
    {
      id: 'expenses',
      name: 'Expenses',
      icon: DollarSign,
      subItems: [
        { id: 'expenses-add', name: 'Add Expenses' },
        { id: 'expenses-search', name: 'Search Expenses' }
      ]
    },
    {
      id: 'adjustments',
      name: 'Sale Adjustments',
      icon: RefreshCw,
      subItems: [
        { id: 'adjustments-void', name: 'Search Voided Sales' },
        { id: 'adjustments-return', name: 'Search Returned Products' }
      ]
    },
    {
      id: 'admin-bi',
      name: 'Business Intelligence',
      icon: LayoutDashboard,
      subItems: [
        { id: 'dashboard', name: 'Branch Dashboard' }
      ]
    },
    {
      id: 'admin-org',
      name: 'Staff & Settings',
      icon: UsersIcon,
      subItems: [
        { id: 'branches', name: 'Branches Profile' },
        { id: 'users', name: 'Employee Directory' }
      ]
    }
  ];

  const getBranchName = (id: string | null) => {
    if (!id) return 'Corporate Office';
    const b = branches.find(br => br.id === id);
    return b ? b.name : 'Unknown Branch';
  };

  return (
    <div className={`h-screen overflow-hidden flex flex-col font-sans transition-all duration-300 relative ${
      darkMode ? 'dark bg-m3-surface text-m3-on-surface' : 'bg-m3-surface text-m3-on-surface'
    }`}>
      {/* Dynamic Ambient Background Color Accent Glow using core M3 primary color token */}
      <div className="absolute top-[-10%] right-[-10%] w-[55vw] h-[55vw] rounded-full bg-m3-primary/[0.04] dark:bg-m3-primary/[0.07] blur-[130px] pointer-events-none z-0 transition-colors duration-500" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[48vw] h-[48vw] rounded-full bg-m3-primary/[0.03] dark:bg-m3-primary/[0.05] blur-[110px] pointer-events-none z-0 transition-colors duration-500" />

      {/* TOP LINEAR HIGH-VIS PROGRESS BAR */}
      {percentProgress > 0 && (
        <div 
          className="fixed top-0 left-0 h-1 bg-gradient-to-r from-m3-primary to-amber-500 z-50 transition-all duration-[80ms]"
          style={{ width: `${percentProgress}%` }}
        />
      )}

      {/* HEADER SECTION with custom horizontal glowing accent bar & ambient overlay tint */}
      <header className={`py-4 px-6 border-b border-m3-outline-variant/15 flex justify-between items-center z-[60] android-glass-header shadow-sm bg-m3-surface/75 dark:bg-m3-surface-low/80 backdrop-blur-md transition-all duration-300 overflow-visible ${
        activeTab === 'pos' 
          ? `fixed top-0 left-0 right-0 transform ${showImmersiveControls ? 'translate-y-0 opacity-100 shadow-xl' : '-translate-y-full opacity-0 pointer-events-none'}` 
          : 'sticky top-0 translate-y-0 opacity-100 relative'
      }`}>
        {/* Subtle header brand overlay reflecting user custom color choice */}
        <div className="absolute inset-0 bg-gradient-to-b from-m3-primary/[0.03] to-transparent pointer-events-none z-[-1]" />
        {/* Horizontal glowing accent line reflecting selected color */}
        <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-m3-primary/35 via-m3-primary/10 to-transparent pointer-events-none" />
        <div className="flex items-center gap-3">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden p-2 rounded-xl hover:bg-m3-primary/10 text-m3-on-surface cursor-pointer"
            title="Toggle navigation sidebar"
          >
            {mobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <img src="/icon.svg" alt="TilePoint Favicon Logo" className="h-9 w-9 rounded-lg" referrerPolicy="no-referrer" />
            <div>
              <h1 className="text-base font-black tracking-tight leading-none uppercase font-sans text-m3-primary">TilePoint</h1>
              <span className="text-[9px] text-m3-on-surface-variant font-bold block uppercase mt-0.5 tracking-widest leading-none">HQ POS System</span>
            </div>
          </div>

          {/* Branch tag indicator */}
          <span className="hidden sm:inline-block px-3 py-1 rounded-xl text-[10px] font-extrabold uppercase bg-m3-secondary-container text-m3-on-secondary-container border border-m3-outline-variant/40">
            {getBranchName(currentUser.branchAssignmentId)}
          </span>
        </div>

        {/* Right side controls with Dropdown Menu following strict user intent */}
        <div className="flex items-center gap-3 relative">
          <div className="relative animate-fade-in">
            <button
              id="account-dropdown-trigger"
              onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
              className="flex items-center gap-2 md:gap-3 p-1.5 pr-3 rounded-xl border border-m3-outline-variant/40 hover:bg-m3-primary/5 transition-all cursor-pointer text-left focus:outline-none bg-m3-surface-low select-none active:scale-[0.98]"
            >
              <div className="h-8 w-8 rounded-xl bg-m3-primary font-black text-xs items-center justify-center flex text-m3-on-primary shadow-sm m3-shape-asymmetric relative overflow-hidden">
                {(() => {
                  const isErica = currentUser.fullName.toLowerCase().includes('erica') || currentUser.username?.toLowerCase().includes('erica');
                  if (isErica) {
                    return "E";
                  }
                  
                  const avatarSrc = currentUser.profilePicture || '';

                  return (
                    <>
                      {avatarSrc ? (
                        <img src={avatarSrc} alt={currentUser.fullName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        currentUser.avatarInitials
                      )}
                      <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 border border-m3-surface animate-pulse" />
                    </>
                  );
                })()}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-extrabold leading-none text-m3-on-surface flex items-center gap-1">
                  <span>{currentUser.fullName}</span>
                </div>
                <span className="text-[9px] text-m3-on-surface-variant font-mono capitalize leading-none font-medium block mt-0.5">{currentUser.role} Account</span>
              </div>
              <svg className={`h-3 w-3 text-m3-on-surface-variant transition-transform duration-200 ${isAccountDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <AnimatePresence>
              {isAccountDropdownOpen && (
                <>
                  {/* Backdrop overlay for dismissing dropdown on click-away */}
                  <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsAccountDropdownOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 mt-2 w-56 rounded-2xl bg-m3-surface-low border border-m3-outline-variant/40 text-m3-on-surface shadow-2xl z-50 p-2 space-y-1.5 font-sans"
                  >
                    <div className="px-3 py-2 border-b border-m3-outline-variant/15 bg-m3-surface-high/10 rounded-xl">
                      <div className="text-xs font-black text-m3-on-surface truncate">{currentUser.fullName}</div>
                      <div className="text-[9.5px] text-zinc-400 font-mono font-bold mt-0.5 uppercase tracking-wider">{currentUser.role} Mode</div>
                    </div>

                    {/* Dark / Light Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        setDarkMode(!darkMode);
                        setIsAccountDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between text-left px-3 py-2 text-xs font-bold rounded-lg hover:bg-m3-primary/10 text-m3-on-surface cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {darkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-m3-primary" />}
                        <span>{darkMode ? 'Light Theme' : 'Dark Theme'}</span>
                      </div>
                      <span className="text-[9px] font-black uppercase text-zinc-400 px-1.5 py-0.5 bg-m3-outline-variant/20 rounded font-mono">
                        {darkMode ? 'LIGHT' : 'DARK'}
                      </span>
                    </button>

                    {/* Account Settings (Guarded password change Only) */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountDropdownOpen(false);
                        setShowAccountSettingsModal(true);
                      }}
                      className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-bold rounded-lg hover:bg-m3-primary/10 text-m3-on-surface cursor-pointer transition-colors"
                    >
                      <LockKeyhole className="h-4 w-4 text-amber-500" />
                      <span>Account Settings</span>
                    </button>

                    {/* Operational Walkthrough */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountDropdownOpen(false);
                        changeTab('tutorials');
                      }}
                      className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-bold rounded-lg hover:bg-m3-primary/10 text-m3-on-surface cursor-pointer transition-colors"
                    >
                      <BookOpen className="h-4 w-4 text-m3-primary" />
                      <span>Operational Walkthrough</span>
                    </button>

                    {/* Database Core & Backups Settings (Other Settings) */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountDropdownOpen(false);
                        setShowDatabaseCoreModal(true);
                      }}
                      className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-bold rounded-lg hover:bg-m3-primary/10 text-m3-on-surface cursor-pointer transition-colors"
                    >
                      <Database className="h-4 w-4 text-emerald-500" />
                      <span>Database Core & Backups</span>
                    </button>

                    <div className="h-px bg-m3-outline-variant/10 !my-1" />

                    {/* Accessibility & Policy trigger */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountDropdownOpen(false);
                        window.dispatchEvent(new Event('open-privacy-hub'));
                      }}
                      className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-bold rounded-lg hover:bg-m3-primary/10 text-m3-on-surface cursor-pointer transition-colors"
                    >
                      <img src="/images/accessibility_icon.svg" alt="Accessibility & Policy" className="h-4.5 w-4.5 object-contain" referrerPolicy="no-referrer" />
                      <span>Accessibility & Policy</span>
                    </button>

                    <div className="h-px bg-m3-outline-variant/10 !my-1" />

                    {/* Logout command trigger */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountDropdownOpen(false);
                        setShowLogoutConfirmModal(true);
                      }}
                      className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-bold rounded-lg hover:bg-rose-500/10 text-rose-500 cursor-pointer transition-colors"
                    >
                      <Power className="h-4 w-4 text-rose-500" />
                      <span>Logout Account</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* BODY CONTENT: Sidebar + Dynamic tab target */}
      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR NAVIGATION: Desktop */}
        <aside className={`border-r border-m3-outline-variant/15 select-none android-glass-sidebar py-6 transition-all duration-300 ease-in-out ${
          activeTab === 'pos'
            ? `fixed left-0 top-0 bottom-0 z-49 transform bg-m3-surface-low border-r border-m3-primary/25 backdrop-blur-xl md:block ${
                isSidebarMinimized ? 'w-20 px-2' : 'w-72 px-4'
              } ${
                showImmersiveControls ? 'translate-x-0 opacity-100 shadow-2xl' : '-translate-x-full opacity-0 pointer-events-none'
              }`
            : `sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto hidden md:block ${
                isSidebarMinimized ? 'w-20 px-2' : 'w-72 px-4'
              }`
        }`}>
          <div className="space-y-5">
            {/* Modular indicator trigger */}
            <div className={`flex items-center ${isSidebarMinimized ? 'justify-center mb-4' : 'justify-between pl-3 mb-2'}`}>
              {!isSidebarMinimized && (
                <span className="text-[10px] font-black tracking-widest text-m3-on-surface-variant uppercase font-mono animate-fade-in truncate">
                  Modules
                </span>
              )}
              <button
                onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
                className={`p-1.5 hover:bg-m3-primary/15 hover:text-m3-primary text-m3-on-surface-variant rounded-xl cursor-pointer transition-all duration-200 ${
                  isSidebarMinimized ? 'hover:scale-110' : ''
                }`}
                title={isSidebarMinimized ? "Maximize Sidebar" : "Minimize Sidebar"}
              >
                <ChevronLeft className={`h-4.5 w-4.5 transition-transform duration-350 ${isSidebarMinimized ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Profile card removed for cleaner non-duplicated design */}

            <nav className="space-y-1">

              {sidebarCategoryTree.map(category => {
                const CategoryIcon = category.icon;
                
                // Strong dynamic RBAC: Filter sub-items to only those this user has permission to see
                const authorizedSubItems = category.subItems.filter(sub => {
                  const masterItem = menuItems.find(m => m.id === sub.id);
                  return masterItem ? masterItem.roles.includes(currentUser.role) : false;
                });

                // Under strong RBAC, if there are no authorized sub-items, do not show the category folder at all
                if (authorizedSubItems.length === 0) return null;

                const hasActiveSubItem = authorizedSubItems.some(sub => activeTab === sub.id) || activeTab === category.id;

                if (isSidebarMinimized) {
                  return (
                    <button
                      key={category.id}
                      onClick={() => {
                        const firstSub = authorizedSubItems[0]?.id || category.id;
                        changeTab(firstSub);
                      }}
                      className={`flex items-center justify-center w-12 h-12 rounded-xl mx-auto relative group transition-all duration-200 cursor-pointer ${
                        hasActiveSubItem 
                          ? 'bg-m3-primary/15 text-m3-primary border border-m3-primary/30 shadow-sm' 
                          : 'hover:bg-m3-primary/10 text-m3-on-surface-variant'
                      }`}
                    >
                      <CategoryIcon className="h-4.5 w-4.5 shrink-0" />
                      <div className="absolute left-16 scale-0 group-hover:scale-100 transition-all duration-200 origin-left bg-m3-on-surface text-m3-surface text-[10px] font-extrabold px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none border border-m3-outline-variant/30">
                        {category.name}
                      </div>
                    </button>
                  );
                }

                return (
                  <button
                    key={category.id}
                    onClick={() => {
                      const firstSub = authorizedSubItems[0]?.id || category.id;
                      changeTab(firstSub);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                      hasActiveSubItem 
                        ? 'bg-m3-primary text-m3-on-primary shadow-md shadow-m3-primary/10 font-black scale-[1.01]' 
                        : 'hover:bg-m3-primary/5 text-m3-on-surface-variant hover:text-m3-primary'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CategoryIcon className={`h-4.5 w-4.5 shrink-0 ${hasActiveSubItem ? 'text-m3-on-primary' : 'text-m3-on-surface-variant'}`} />
                      <span>{category.name}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* SIDEBAR NAVIGATION: Mobile Drawer overlay and sidebar content */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <div className="fixed inset-0 z-45 flex md:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="absolute inset-0 bg-m3-on-surface/40 backdrop-blur-sm"
                onClick={() => setMobileSidebarOpen(false)}
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 24, stiffness: 220 }}
                className="relative w-64 h-full flex flex-col p-5 space-y-5 shadow-2xl z-10 android-glass-modal text-m3-on-surface"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-m3-on-surface-variant font-mono">Menu List</span>
                  <button onClick={() => setMobileSidebarOpen(false)} className="text-m3-on-surface-variant hover:text-m3-primary p-1.5 rounded-xl hover:bg-m3-primary/10">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Mobile Logout option */}
                <div className="bg-m3-surface-container p-3 rounded-2xl border border-m3-outline-variant/30 text-center">
                  <button
                    onClick={() => {
                      setMobileSidebarOpen(false);
                      setShowLogoutConfirmModal(true);
                    }}
                    className="w-full py-2.5 rounded-xl border border-rose-500/30 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 text-xs font-black uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-2"
                  >
                    <Power className="h-4 w-4" />
                    <span>Logout Session</span>
                  </button>
                </div>

                <nav className="space-y-1.5 overflow-y-auto max-h-[calc(100vh-180px)] pr-1 font-sans">

                  {sidebarCategoryTree.map(category => {
                    const CategoryIcon = category.icon;
                    
                    // Strong dynamic RBAC: Filter sub-items to only those this user has permission to see on mobile
                    const authorizedSubItems = category.subItems.filter(sub => {
                      const masterItem = menuItems.find(m => m.id === sub.id);
                      return masterItem ? masterItem.roles.includes(currentUser.role) : false;
                    });

                    if (authorizedSubItems.length === 0) return null;

                    const hasActiveSubItem = authorizedSubItems.some(sub => activeTab === sub.id) || activeTab === category.id;

                    return (
                      <button
                        key={category.id}
                        onClick={() => {
                          const firstSub = authorizedSubItems[0]?.id || category.id;
                          changeTab(firstSub);
                          setMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          hasActiveSubItem 
                            ? 'bg-m3-primary text-m3-on-primary shadow-md font-black scale-[1.01]' 
                            : 'hover:bg-m3-primary/5 text-m3-on-surface-variant hover:text-m3-primary'
                        }`}
                      >
                        <CategoryIcon className={`h-4.5 w-4.5 shrink-0 ${hasActiveSubItem ? 'text-m3-on-primary' : 'text-m3-on-surface-variant'}`} />
                        <span>{category.name}</span>
                      </button>
                    );
                  })}
                </nav>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        {/* DYNAMIC COMPONENT PANEL AREA */}
        <main className={`flex-1 relative flex flex-col ${
          activeTab === 'pos' 
            ? `md:overflow-hidden md:h-screen lg:max-h-screen text-m3-on-surface transition-all duration-300 ${
                showImmersiveControls 
                  ? `p-4 pt-[73px] pb-24 md:p-4 md:pt-[73px] md:pb-4 ${isSidebarMinimized ? 'md:pl-[96px]' : 'md:pl-[304px]'}` 
                  : 'p-0 pt-0 md:p-0'
              }` 
            : 'p-4 md:p-6 pb-26 md:pb-6 overflow-y-auto'
        } ${isCompactColumns ? 'compact-fit' : ''}`}>
          {/* Elegant Collapsible Horizontal Sub-menu Navigation Pill Bar with Dynamic RBAC */}
          {(() => {
            const activeCategory = sidebarCategoryTree.find(cat => 
              cat.subItems.some(sub => sub.id === activeTab) || cat.id === activeTab
            );
            if (!activeCategory) return null;

            // Enforce RBAC filtering for sub-pages so they match exactly what is authorized
            const authorizedSubItems = activeCategory.subItems.filter(sub => {
              const masterItem = menuItems.find(m => m.id === sub.id);
              return masterItem ? masterItem.roles.includes(currentUser.role) : false;
            });

            if (authorizedSubItems.length <= 1 || (activeTab === 'pos' && !showImmersiveControls)) return null;

            return (
              <div className="mb-4 bg-m3-surface-low border border-m3-outline-variant/15 rounded-2xl p-2.5 flex flex-col shrink-0">
                <div className="flex items-center justify-between px-1.5 pb-1 block">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black tracking-widest text-m3-on-surface-variant uppercase font-mono">
                        {activeCategory.name} Sub-navigation
                      </span>
                      <span className="h-1.5 w-1.5 rounded-full bg-m3-primary animate-pulse" />
                    </div>
                    <button
                      onClick={() => setIsSubMenuCollapsed(!isSubMenuCollapsed)}
                      className="p-1 px-2 text-m3-on-surface-variant hover:text-m3-primary hover:bg-m3-primary/10 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider"
                      title={isSubMenuCollapsed ? "Expand Sub-menu" : "Collapse Sub-menu"}
                    >
                      <span>{isSubMenuCollapsed ? "Show Options" : "Hide Options"}</span>
                      {isSubMenuCollapsed ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 rotate-180 transition-transform duration-200" />
                      )}
                    </button>
                  </div>
                </div>

                {!isSubMenuCollapsed && (
                  <div className="flex gap-2.5 overflow-x-auto pt-2 pb-1 whitespace-nowrap scrollbar-none select-none scroll-smooth shrink-0 w-full">
                    {authorizedSubItems.map(sub => {
                      const isSelected = activeTab === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => changeTab(sub.id)}
                          className={`px-4.5 py-2 text-xs font-bold tracking-wide rounded-2xl transition-all cursor-pointer shrink-0 ${
                            isSelected
                              ? 'bg-m3-primary text-m3-on-primary shadow-md shadow-m3-primary/10 font-black scale-[1.01]'
                              : 'bg-m3-surface border border-m3-outline-variant/15 text-m3-on-surface-variant hover:bg-m3-primary/10 hover:text-m3-primary'
                          }`}
                        >
                          {sub.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="flex-1">
            <AnimatePresence mode="wait">
            {isTabChanging ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <SkeletalLoader />
              </motion.div>
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.995 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="h-full"
              >
                {activeTab === 'tutorials' && <TutorialOnboarding />}
                {activeTab === 'dashboard' && <Dashboard darkMode={darkMode} onNavigate={changeTab} />}
                {activeTab === 'architecture' && <ArchitectureModule />}
                {activeTab === 'pos' && <PosModule darkMode={darkMode} onNavigate={changeTab} viewMode="checkout" showImmersiveControls={showImmersiveControls} />}
                {activeTab === 'ledger' && <PosModule darkMode={darkMode} onNavigate={changeTab} viewMode="ledger" showImmersiveControls={showImmersiveControls} />}
                {activeTab === 'inventory' && <InventoryModule darkMode={darkMode} isCompactGlobal={isCompactColumns} />}
                {activeTab === 'procurement' && <ProcurementModule darkMode={darkMode} />}
                {activeTab === 'transmittal' && <TransmittalModule darkMode={darkMode} />}
                {activeTab === 'shift' && <ShiftModule darkMode={darkMode} />}
                {activeTab === 'calculator' && <CalculatorModule darkMode={darkMode} />}
                {activeTab === 'branches' && <BranchModule darkMode={darkMode} />}
                {activeTab === 'users' && <UsersModule darkMode={darkMode} />}
                {activeTab === 'reports-transmission' && <SalesTransmissionModule darkMode={darkMode} />}
                {activeTab === 'deliveries-panel' && <DeliveriesModule darkMode={darkMode} />}
                {activeTab === 'inventory-damage' && <DamageRegisterModule darkMode={darkMode} />}

                {/* ATPOS v2 Sub-items routing to standard Core Modules */}
                {activeTab.startsWith('inventory-') && (() => {
                  const map: Record<string, 'catalog' | 'movements' | 'transfers' | 'ledger' | 'import'> = {
                    'inventory-stocks': 'catalog',
                    'inventory-adjustments': 'movements',
                    'inventory-transfer': 'transfers',
                    'inventory-logistics': 'ledger',
                    'inventory-import': 'import'
                  };
                  const subTab = map[activeTab] || 'catalog';
                  return (
                    <InventoryModule 
                      darkMode={darkMode} 
                      initialSubTab={subTab} 
                      hideTabHeader={true}
                      isCompactGlobal={isCompactColumns}
                      onSubTabChange={(sub) => {
                        const rMap: Record<string, string> = {
                          catalog: 'inventory-stocks',
                          movements: 'inventory-adjustments',
                          transfers: 'inventory-transfer',
                          ledger: 'inventory-logistics',
                          import: 'inventory-import'
                        };
                        if (rMap[sub]) {
                          setActiveTab(rMap[sub]);
                        }
                      }}
                    />
                  );
                })()}

                {activeTab === 'adjustments-void' && <PosModule darkMode={darkMode} onNavigate={changeTab} viewMode="ledger" />}
                {activeTab === 'suppliers-manage' && <ProcurementModule darkMode={darkMode} />}

                {/* Integration of ATPOS v2 Specific Submodules */}
                {[
                  'members-manage', 'members-receivables', 'members-search-sales',
                  'expenses-add', 'expenses-search',
                  'suppliers-credits', 'suppliers-calendar',
                  'bir-xz', 'bir-summary', 'bir-pwd', 'bir-athletes', 'bir-solo', 'bir-senior20', 'bir-senior5', 'bir-regular',
                  'adjustments-return'
                ].includes(activeTab) && (
                  <AtposExtraModules activeSubTab={activeTab} darkMode={darkMode} onNavigate={changeTab} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR FOR COMFORTABLE TACTILE PWA FEEL */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 z-40 android-glass border-t border-m3-outline-variant/20 px-2 py-2 flex justify-around items-center rounded-t-[24px] shadow-lg transition-all duration-300 ease-in-out ${
        activeTab === 'pos'
          ? `transform ${showImmersiveControls ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`
          : 'translate-y-0 opacity-100'
      }`}>
        {menuItems.filter(item => {
          const isRoleOk = item.roles.includes(currentUser.role);
          if (!isRoleOk) return false;
          const currentBranch = branches.find(b => b.id === currentUser.branchAssignmentId);
          const isAuthorizedBranch = currentUser.branchAssignmentId === 'B1' || !!currentBranch?.isDistributionBranch || currentUser.role === 'Admin';
          if (item.id === 'transmittal' && !isAuthorizedBranch) return false;
          return true;
        }).slice(0, 5).map(item => {
          const Icon = item.icon;
          const isSelected = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => changeTab(item.id)}
              className="flex flex-col items-center gap-1 focus:outline-none cursor-pointer relative py-0.5 px-2 min-w-[52px]"
            >
              {/* Active tactile capsule indicator */}
              <div className={`px-4 py-1 rounded-xl transition-all duration-200 ${
                isSelected 
                  ? 'bg-m3-primary/15 text-m3-primary' 
                  : 'text-m3-on-surface-variant hover:text-m3-primary hover:bg-m3-primary/5'
              }`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={`text-[9px] font-black tracking-tight text-center leading-none ${
                isSelected ? 'text-m3-primary' : 'text-m3-on-surface-variant'
              }`}>
                {item.id === 'dashboard' ? 'Dash' : item.id === 'architecture' ? 'ERD' : item.id === 'pos' ? 'Checkout' : item.id === 'ledger' ? 'Ledger' : item.id === 'inventory' ? 'Stock' : item.id === 'procurement' ? 'Purchase' : item.id === 'transmittal' ? 'Send' : item.id === 'shift' ? 'Shift' : item.id === 'calculator' ? 'Calc' : item.name.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Immersive Trigger Handles for POS Terminal Mode */}
      {activeTab === 'pos' && !showImmersiveControls && (
        <>
          {/* Subtle Pull handles for mouse cursor / touch slide */}
          <div 
            className="fixed left-0 top-1/2 -translate-y-1/2 w-2 h-24 bg-m3-primary/30 hover:bg-m3-primary/60 rounded-r-2xl z-[60] cursor-ew-resize flex items-center justify-center transition-all group scale-100 hover:w-3 border border-l-0 border-m3-primary/35 backdrop-blur-md shadow-lg animate-pulse"
            title="Drag or slide from left to show system modules"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMoveDrag}
            onMouseUp={handleMouseUp}
            onClick={() => setShowImmersiveControls(true)}
          >
            <div className="w-1 h-8 bg-m3-primary/80 rounded-full group-hover:bg-m3-primary/100" />
          </div>

          <div 
            className="fixed top-0 left-1/2 -translate-x-1/2 h-2 w-56 bg-m3-primary/25 hover:bg-m3-primary/55 rounded-b-2xl z-[60] cursor-ns-resize flex justify-center items-center transition-all group hover:h-4.5 border border-t-0 border-m3-primary/35 backdrop-blur-md shadow-md"
            title="Hover or slide from top to show header controls"
            onClick={() => setShowImmersiveControls(true)}
          >
            <div className="h-1 w-16 bg-m3-primary/60 rounded-full group-hover:bg-m3-primary/85" />
          </div>
        </>
      )}

      {/* CONFIRMATORY DIALOG: Logout verification check trigger */}
      {showLogoutConfirmModal && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="absolute inset-0 bg-gray-950/75 backdrop-blur-sm" onClick={() => setShowLogoutConfirmModal(false)} />
          <div className="relative w-full max-w-sm rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface space-y-4 text-left font-sans">
            <div className="flex items-center gap-3 border-b border-m3-outline-variant/15 pb-3">
              <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-500">
                <Power className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black text-m3-on-surface uppercase tracking-wider">Confirm Sign Out</h3>
                <p className="text-[10px] text-zinc-400 font-bold font-mono">TILEPOINT SESSION CONTROL</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 font-medium leading-relaxed">
              Are you sure you want to log out of TilePoint terminal? Any unsaved active checkout carts will be lost.
            </p>

            <div className="flex gap-3 pt-2 font-sans">
              <button
                type="button"
                onClick={() => setShowLogoutConfirmModal(false)}
                className="flex-1 py-2.5 rounded-full bg-m3-surface hover:bg-m3-outline-variant/15 text-m3-on-surface font-extrabold text-xs uppercase tracking-wide border border-m3-outline-variant/10 cursor-pointer active:scale-95 transition-all text-center"
              >
                No, Keep Active
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirmModal(false);
                  logout();
                }}
                className="flex-1 py-2.5 rounded-full bg-rose-500 hover:bg-rose-400 text-black font-extrabold text-xs uppercase tracking-wide cursor-pointer active:scale-95 transition-all text-center shadow-lg shadow-rose-500/10"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Database Core & Disaster Recovery Settings */}
      {showDatabaseCoreModal && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in font-sans">
          <div className="absolute inset-0 bg-gray-950/75 backdrop-blur-sm" onClick={() => {
            setShowDatabaseCoreModal(false);
            setDbBackupFileMessage(null);
            setDbBackupFileError(null);
            setManualSnapshotName('');
          }} />
          
          <div className="relative w-full max-w-2xl rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface flex flex-col max-h-[90vh] text-left">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-m3-outline-variant/15 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                  <Database className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-wider text-m3-on-surface flex items-center gap-2">
                    Database Core Management
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                      dbSyncStatus === 'syncing' ? 'bg-amber-500/20 text-amber-500 animate-pulse' : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {dbSyncStatus === 'syncing' ? '● Sync active' : '● Connected'}
                    </span>
                  </h3>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono font-bold">
                    Disaster Recovery & Automated Backup Engine
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDatabaseCoreModal(false);
                  setDbBackupFileMessage(null);
                  setDbBackupFileError(null);
                  setManualSnapshotName('');
                }}
                className="text-m3-on-surface-variant hover:text-rose-500 cursor-pointer p-1.5 rounded-full hover:bg-m3-outline-variant/10 transition-colors"
                title="Close Database Panel"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-m3-outline-variant/10 my-4 p-1 bg-m3-surface-low/50 rounded-xl">
              <button
                onClick={() => setDbCoreTab('scheduler')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                  dbCoreTab === 'scheduler'
                    ? 'bg-m3-primary text-m3-on-primary shadow-sm font-black'
                    : 'text-m3-on-surface-variant hover:bg-m3-primary/10 hover:text-m3-primary'
                }`}
              >
                Auto-Backup Configuration
              </button>
              <button
                onClick={() => setDbCoreTab('ledger')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                  dbCoreTab === 'ledger'
                    ? 'bg-m3-primary text-m3-on-primary shadow-sm font-black'
                    : 'text-m3-on-surface-variant hover:bg-m3-primary/10 hover:text-m3-primary'
                }`}
              >
                Recovery Ledger
                <span className="bg-m3-primary-container text-m3-on-primary-container text-[10px] font-bold px-1.5 py-0.2 rounded-full font-sans">
                  {dbSnapshots.length}
                </span>
              </button>
              <button
                onClick={() => setDbCoreTab('import-export')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                  dbCoreTab === 'import-export'
                    ? 'bg-m3-primary text-m3-on-primary shadow-sm font-black'
                    : 'text-m3-on-surface-variant hover:bg-m3-primary/10 hover:text-m3-primary'
                }`}
              >
                Offline Portability
              </button>
            </div>

            {/* Modal Main Content (Flexible Scroll Area) */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[50vh]">
              
              {/* Tab A: SCHEDULER & AUTO BACKUPS */}
              {dbCoreTab === 'scheduler' && (
                <div className="space-y-4">
                  
                  {/* Performance stats banner */}
                  <div className="p-3.5 rounded-2xl bg-m3-primary/5 border border-m3-primary/10 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-extrabold text-m3-primary uppercase text-[10px] tracking-wide">Optimization Status</div>
                      <div className="text-zinc-400 mt-1 font-sans">
                        Debounce cache buffer operates at <span className="font-mono font-bold text-m3-on-surface">{debounceDelay}ms</span>.
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-emerald-400 font-extrabold">{writeStatsCount.toLocaleString()}</div>
                      <div className="text-[9px] text-zinc-500 uppercase font-mono mt-0.5">Database Writes Saved</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-m3-outline-variant/20 p-4 space-y-4 bg-m3-surface-low">
                    <h4 className="text-xs font-black uppercase tracking-wider text-m3-primary">Automatic Background Scheduler</h4>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold">Hourly Data Preservation</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">Protect inventory journals and sales invoices against localStorage eviction.</div>
                      </div>
                      <button
                        type="button"
                        disabled={currentUser.role !== UserRole.ADMIN}
                        onClick={() => {
                          if (currentUser.role !== UserRole.ADMIN) {
                            showToast("Access Denied: Admin authorization required.");
                            return;
                          }
                          setAutoBackupEnabled(!autoBackupEnabled);
                          showToast(`Automated backup scheduler is now ${!autoBackupEnabled ? 'ENABLED' : 'DISABLED'}`);
                        }}
                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          autoBackupEnabled
                            ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        } ${currentUser.role !== UserRole.ADMIN ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        {autoBackupEnabled ? '✓ Active scheduler' : '✗ Deactivated'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1 block">
                          Reserve Frequency
                        </label>
                        <select
                          disabled={currentUser.role !== UserRole.ADMIN || !autoBackupEnabled}
                          value={backupIntervalHours}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setBackupIntervalHours(val);
                            showToast(`Automated backup frequency is configured to every ${val} hr.`);
                          }}
                          className="w-full bg-m3-surface-lowest border border-m3-outline-variant/30 text-xs px-3 py-2 rounded-xl text-m3-on-surface font-extrabold focus:outline-none focus:ring-1 focus:ring-m3-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value={1}>Every 1 Hour (Standard)</option>
                          <option value={2}>Every 2 Hours (Mid-Day)</option>
                          <option value={6}>Every 6 Hours (Periodic)</option>
                          <option value={12}>Every 12 Hours (Half-Day)</option>
                          <option value={24}>Every 24 Hours (End-of-Day)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1 block">
                          Last Successful Backup Run
                        </label>
                        <div className="w-full bg-m3-surface-lowest border border-m3-outline-variant/15 text-xs px-3 py-2 rounded-xl text-m3-on-surface-variant font-medium flex items-center gap-1.5 min-h-[36px]">
                          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          {lastAutoBackupTime ? (
                            <span className="font-mono text-[11px] font-bold">
                              {new Date(lastAutoBackupTime).toLocaleString()}
                            </span>
                          ) : (
                            <span className="italic text-zinc-500 font-bold">Never executed</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-m3-outline-variant/20 p-4 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-m3-primary">Instantiate Manual Backup Snapshot</h4>
                    <div className="flex gap-2 font-sans">
                      <input
                        type="text"
                        value={manualSnapshotName}
                        onChange={e => setManualSnapshotName(e.target.value)}
                        placeholder="e.g. Pre-Audit Bulk Load Snapshot..."
                        className="flex-1 bg-m3-surface-lowest text-xs text-m3-on-surface border border-m3-outline-variant/30 px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-m3-primary/40 placeholder-zinc-500 font-bold"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const name = manualSnapshotName.trim() || `Manual Snapshot - ${new Date().toLocaleTimeString()}`;
                          await triggerSystemProcessing(
                            `Compiling ${name}...`,
                            1400,
                            'db',
                            undefined,
                            'Compressing tables, locking databases, and serializing snapshot packet...'
                          );
                          createDbSnapshot(name);
                          setManualSnapshotName('');
                          showToast(`Successfully registered database snapshot: "${name}"`);
                        }}
                        className="px-4 py-2.5 bg-m3-primary hover:bg-m3-primary/95 text-m3-on-primary text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-sm transition-all"
                      >
                        Capture Snapshot
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab B: DATABASE SNAPSHOTS LEDGER */}
              {dbCoreTab === 'ledger' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Saved Backup History</span>
                    <button
                      onClick={() => {
                        dbSnapshots.forEach(snap => deleteDbSnapshot(snap.id));
                        showToast("Cleared recovery snapshot catalog.");
                      }}
                      className="text-[10px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Clear database list"
                    >
                      Clear All Catalog
                    </button>
                  </div>

                  {dbSnapshots.length === 0 ? (
                    <div className="text-center py-10 bg-m3-surface-lowest border border-dashed border-m3-outline-variant/30 rounded-2xl text-zinc-500 space-y-2">
                      <p className="text-sm font-bold">Digital Snapshot Archive is Empty</p>
                      <p className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">Automated or manual snapshots will register here.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                      {dbSnapshots.map(snap => (
                        <div
                          key={snap.id}
                          className="p-3 bg-m3-surface-lowest hover:bg-m3-primary/5 rounded-2xl border border-m3-outline-variant/15 flex items-center justify-between transition-all"
                        >
                          <div className="space-y-1">
                            <div className="text-xs font-black text-m3-on-surface">{snap.name}</div>
                            <div className="text-[9.5px] text-zinc-400 font-mono font-bold flex items-center gap-2 flex-wrap">
                              <span className="text-m3-primary text-[10px]">{snap.creator}</span>
                              <span>•</span>
                              <span>{new Date(snap.timestamp).toLocaleString()}</span>
                              <span>•</span>
                              <span className="text-zinc-500 bg-m3-surface-low/55 px-1.5 rounded">{((snap.sizeBytes || 0) / 1024).toFixed(1)} KB</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={async () => {
                                const ok = confirm(`CRITICAL CONTEXT DISPATCH CONFLICT!\n\nAre you sure you want to restore all tables to the state in snap "${snap.name}"?\nThis replaces current data in local browser storage.`);
                                if (ok) {
                                  await triggerSystemProcessing(
                                    `Restoring Database State: ${snap.name}...`,
                                    1800,
                                    'db',
                                    undefined,
                                    'Shutting down write engines, swapping table pointers, and updating local indices...'
                                  );
                                  const success = restoreDbSnapshot(snap.id);
                                  if (success) {
                                    showToast(`Snapshot ${snap.id} restored successfully! Reloading UI...`);
                                    setTimeout(() => window.location.reload(), 250);
                                  } else {
                                    showToast("Corruption Error: Snapshot load failure!");
                                  }
                                }
                              }}
                              className="px-3 py-1.5 bg-m3-primary/10 hover:bg-m3-primary/20 text-m3-primary text-[10px] font-black cursor-pointer uppercase tracking-wider rounded-lg transition-colors"
                              title="Overwrite current state with backup snapshot font"
                            >
                              Restore
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                deleteDbSnapshot(snap.id);
                                showToast(`Removed backup snapshot ${snap.id}`);
                              }}
                              className="p-1 px-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/15 cursor-pointer rounded transition-colors"
                              title="Delete snapshot"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab C: LOCAL JSON PORTABILITY */}
              {dbCoreTab === 'import-export' && (
                <div className="space-y-4">
                  
                  {/* Local JSON Export */}
                  <div className="rounded-2xl border border-m3-outline-variant/15 p-4 space-y-2.5 bg-m3-surface-low">
                    <h4 className="text-xs font-black uppercase text-m3-primary tracking-wider">Export Database Records</h4>
                    <p className="text-[10px] text-zinc-400 font-medium">
                      Physically package your corporate configuration, stock level logs, employee tables and POS sales ledgers inside an offline executable JSON block.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const payload = {
                          isConfigured,
                          users,
                          branches,
                          suppliers,
                          products,
                          purchaseOrders,
                          poItems,
                          transmittals,
                          shifts,
                          sales,
                          saleItems,
                          movements,
                          auditLogs,
                          parkedSales,
                          stockTransfers,
                          branchStock,
                          ledgerEntries,
                          branchSalesReports,
                          deliveries
                        };
                        const dataStr = JSON.stringify(payload, null, 2);
                        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                        
                        const element = document.createElement('a');
                        element.setAttribute('href', dataUri);
                        element.setAttribute('download', `tilepoint_full_backup_${Date.now()}.json`);
                        element.style.display = 'none';
                        document.body.appendChild(element);
                        element.click();
                        document.body.removeChild(element);
                        
                        showToast("Raw physical database JSON file downloaded successfully!");
                      }}
                      className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-xs font-extrabold uppercase tracking-wider rounded-xl border border-emerald-500/30 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Download className="h-4 w-4" /> Export Raw JSON Database File
                    </button>
                  </div>

                  {/* Local JSON Import */}
                  <div className="rounded-2xl border border-m3-outline-variant/15 p-4 space-y-3 bg-m3-surface-low">
                    <h4 className="text-xs font-black uppercase text-amber-500 tracking-wider">State Migration Recovery (Import JSON)</h4>
                    <p className="text-[10px] text-zinc-400 font-medium">
                      Overwrites the client dataset fully with a local JSON block. Approved files are validated on format before matching structure schemas.
                    </p>
                    
                    <label className="flex flex-col items-center justify-center p-6 bg-m3-surface-lowest border-2 border-dashed border-m3-outline-variant/30 rounded-2xl hover:bg-m3-outline-variant/5 cursor-pointer transition-colors group">
                      <Upload className="h-6 w-6 text-zinc-400 group-hover:text-amber-500 transition-colors" />
                      <span className="text-[11px] font-extrabold mt-2">Select or Drop Portable Backup JSON file</span>
                      <span className="text-[9px] text-zinc-500 uppercase font-mono mt-1 font-bold">Standard .json matches only</span>
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            try {
                              const rawText = evt.target?.result as string;
                              const parsed = JSON.parse(rawText);
                              
                              if (!parsed.products || !parsed.users || !parsed.branches) {
                                throw new Error("Schema validator failure: Missing core lists.");
                              }

                              // Create snapshot entry to allow reversibility
                              const newSnap: DbSnapshot = {
                                id: `SNAP-IMPORT-${Date.now()}`,
                                name: `Imported Backup File: ${file.name}`,
                                timestamp: new Date().toISOString(),
                                creator: currentUser.fullName,
                                sizeBytes: new Blob([rawText]).size,
                                data: rawText
                              };

                              const cachedListStr = localStorage.getItem('tp_db_snapshots');
                              const cachedList = cachedListStr ? JSON.parse(cachedListStr) : [];
                              const updatedList = [newSnap, ...cachedList];
                              localStorage.setItem('tp_db_snapshots', JSON.stringify(updatedList));

                              // Apply changes directly using atomic restore
                              restoreDbSnapshot(newSnap.id);
                              
                              setDbBackupFileMessage(`SUCCESSFULLY IMPORTED PORTABLE BACKUP: "${file.name}" APPROVED. Reloading UI...`);
                              setDbBackupFileError(null);
                              showToast(`Successfully restored imported backup!`);
                              
                              setTimeout(() => {
                                window.location.reload();
                              }, 1500);

                            } catch (err: any) {
                              setDbBackupFileError(`ERROR: APPROVED FILE IS CORRUPTED OR INVALID SCHEMA: ${err.message}`);
                              setDbBackupFileMessage(null);
                              showToast(`Import rejected due to structural validation faults.`);
                            }
                          };
                          reader.readAsText(file);
                        }}
                      />
                    </label>

                    {dbBackupFileMessage && (
                      <div className="p-3 text-[10.5px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 rounded-xl text-center">
                        {dbBackupFileMessage}
                      </div>
                    )}
                    {dbBackupFileError && (
                      <div className="p-3 text-[10.5px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/15 rounded-xl text-center">
                        {dbBackupFileError}
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>

            {/* Modal Actions Footer */}
            <div className="pt-4 mt-4 border-t border-m3-outline-variant/15 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDatabaseCoreModal(false);
                  setDbBackupFileMessage(null);
                  setDbBackupFileError(null);
                  setManualSnapshotName('');
                }}
                className="px-5 py-2.5 bg-m3-surface hover:bg-m3-outline-variant/15 text-m3-on-surface font-extrabold text-xs uppercase tracking-wide border border-m3-outline-variant/10 rounded-full cursor-pointer transition-all hover:scale-[1.01]"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: Account Settings Password update form (Cashiers can ONLY change password) */}
      {showAccountSettingsModal && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="absolute inset-0 bg-gray-950/75 backdrop-blur-sm" onClick={() => {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setSettingsError('');
            setShowAccountSettingsModal(false);
          }} />
          <form
            onSubmit={handleUpdatePassword}
            className="relative w-full max-w-md rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface space-y-4 text-left font-sans"
          >
            <div className="flex justify-between items-center border-b border-m3-outline-variant/15 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 mr-0.5 bg-amber-500/10 text-amber-500 rounded-2xl">
                  <LockKeyhole className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-m3-on-surface uppercase tracking-wider">Account Settings</h3>
                  <p className="text-[10px] text-amber-500 font-extrabold font-mono uppercase tracking-widest">
                    {currentUser.role === UserRole.CASHIER ? 'Password Change Only' : 'Corporate Identity Settings'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setSettingsError('');
                  setShowAccountSettingsModal(false);
                }}
                className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1 rounded-full hover:bg-m3-outline-variant/10 transition-colors"
                title="Dismiss Account Settings Window"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Profile Overview Card (Editable details & Avatar selector) */}
            <div className="space-y-4">
              <div className="text-[10.5px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1 pl-1">
                <span>Corporate Identity Details</span>
              </div>

              {/* Full Name & Username inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest pl-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={e => setEditFullName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full bg-m3-surface border-b-2 border-m3-outline-variant px-3 py-2 text-xs text-m3-on-surface focus:outline-none focus:border-amber-500 transition-colors rounded-t-lg font-sans"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest pl-1">Username</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-zinc-500 text-xs font-mono select-none">@</span>
                    <input
                      type="text"
                      required
                      value={editUsername}
                      onChange={e => setEditUsername(e.target.value)}
                      placeholder="Username"
                      className="w-full bg-m3-surface border-b-2 border-m3-outline-variant pl-7 pr-3 py-2 text-xs text-m3-on-surface font-mono focus:outline-none focus:border-amber-500 transition-colors rounded-t-lg"
                    />
                  </div>
                </div>
              </div>


            </div>

            {/* Change Password Form Container */}
            <div className="space-y-3 pt-1 border-t border-m3-outline-variant/15">
              <div className="text-[10.5px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1 pl-1">
                <span>Update Security Password (Optional)</span>
              </div>

              {/* Current Password field */}
              <div className="space-y-1 relative">
                <label className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest pl-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => {
                      setCurrentPassword(e.target.value);
                      setSettingsError('');
                    }}
                    placeholder="Provide current login password to verify"
                    className="w-full bg-m3-surface border-b-2 border-m3-outline-variant px-3 py-2 text-xs text-m3-on-surface focus:outline-none focus:border-amber-500 transition-colors rounded-t-lg font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-m3-on-surface transition-colors cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* New Password field */}
              <div className="space-y-1 relative">
                <label className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest pl-1">New Password (Min 6 Characters)</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => {
                      setNewPassword(e.target.value);
                      setSettingsError('');
                    }}
                    placeholder="Enter brand new terminal password"
                    className="w-full bg-m3-surface border-b-2 border-m3-outline-variant px-3 py-2 text-xs text-m3-on-surface focus:outline-none focus:border-amber-500 transition-colors rounded-t-lg font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-m3-on-surface transition-colors cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password field */}
              <div className="space-y-1 relative">
                <label className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest pl-1">Confirm New Password</label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => {
                    setConfirmPassword(e.target.value);
                    setSettingsError('');
                  }}
                  placeholder="Repeat brand new password to confirm"
                  className="w-full bg-m3-surface border-b-2 border-m3-outline-variant px-3 py-2 text-xs text-m3-on-surface focus:outline-none focus:border-amber-500 transition-colors rounded-t-lg font-sans"
                />
              </div>

              {settingsError ? (
                <p className="text-[9.5px] font-bold text-rose-500 px-1 animate-pulse leading-normal">
                  {settingsError}
                </p>
              ) : (
                <p className="text-[9px] text-zinc-400 px-1 leading-normal font-medium flex items-center gap-1">
                  <span>Salted PBKDF2 cryptography hashes are automatically updated across all local registers.</span>
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-m3-outline-variant/15 font-sans">
              <button
                type="button"
                onClick={() => {
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setSettingsError('');
                  setShowAccountSettingsModal(false);
                }}
                className="px-4 py-2 bg-m3-outline-variant/10 hover:bg-m3-outline-variant/20 rounded-full text-zinc-300 font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="px-5 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-md disabled:brightness-50"
              >
                {isUpdatingPassword ? 'Saving Hashed Token...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FLOAT TOAST ALERT CHIP */}
      {toastMessage && (
        <div className="fixed bottom-24 md:bottom-6 right-6 bg-m3-on-surface text-m3-surface text-xs font-black py-3 px-5 rounded-[16px] shadow-2xl z-50 border border-m3-outline-variant/20 flex items-center gap-2 animate-slide-up max-w-[340px]">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* PRIVACY SHIELD & ACCESSIBILITY HUB FLOATING SUITE */}
      <PrivacyAccessibilityHub darkMode={darkMode} hideFloatingButton={true} />

      {/* GLOBAL SYSTEM PROCESSING OVERLAY */}
      <SystemLoadingOverlay />

      {/* EXPRESSIVE MATERIAL 3 IDLE SCREEN OVERLAY */}
      <IdleScreen />

      {/* DYNAMIC ALWAYS-ON PWA INSTALL CONVERSION PROMPT */}
      <PwaInstallPrompt />
    </div>
  );
}

export default function App() {
  return (
    <DbProvider>
      <AppContent />
    </DbProvider>
  );
}
