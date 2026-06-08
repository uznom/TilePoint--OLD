/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DbProvider, useDb } from './context/DbContext';
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
  Shield
} from 'lucide-react';

function AppContent() {
  const { currentUser, updateCurrentUser, updateUser, branches, isLoggedIn, logout, isConfigured } = useDb();
  const [activeTab, setActiveTab] = useState(() => {
    const isFirstTime = typeof window !== 'undefined' && localStorage.getItem('tp_first_login_done') !== 'true';
    if (isFirstTime) return 'tutorials';
    if (currentUser && currentUser.role === UserRole.CASHIER) {
      return 'pos';
    }
    return 'dashboard';
  });

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
    admin: false
  });

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // Account settings states & Logout confirmatory dialogs
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const [showAccountSettingsModal, setShowAccountSettingsModal] = useState(false);
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
    { id: 'inventory-stocks', name: 'Stocks', icon: Layers, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF] },
    { id: 'inventory-transfer', name: 'Stocks Transfer', icon: Send, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF] },
    { id: 'inventory-pulled-out', name: 'Pulled-Out Stocks', icon: Layers, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF] },

    { id: 'adjustments-void', name: 'Search Voided Sales', icon: History, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER] },
    { id: 'adjustments-return', name: 'Search Returned Products', icon: RefreshCw, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER] },

    { id: 'members-manage', name: 'Manage Members', icon: UsersIcon, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER] },
    { id: 'members-receivables', name: 'Account Receivables', icon: UsersIcon, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER] },

    { id: 'expenses-add', name: 'Add Expenses', icon: DollarSign, roles: [UserRole.ADMIN, UserRole.MANAGER] },
    { id: 'expenses-search', name: 'Search Expenses', icon: DollarSign, roles: [UserRole.ADMIN, UserRole.MANAGER] },

    { id: 'suppliers-manage', name: 'Manage Suppliers', icon: Building2, roles: [UserRole.ADMIN, UserRole.MANAGER] },
    { id: 'suppliers-credits', name: 'Active Credits', icon: Building2, roles: [UserRole.ADMIN, UserRole.MANAGER] },

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
        { id: 'inventory-stocks', name: 'Stocks' },
        { id: 'inventory-transfer', name: 'Stocks Transfer' },
        { id: 'inventory-pulled-out', name: 'Pulled-Out Stocks' }
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
        { id: 'suppliers-credits', name: 'Active Credits' }
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
      id: 'admin',
      name: 'System Admin Tools',
      icon: Database,
      subItems: [
        { id: 'dashboard', name: 'Branch Dashboard' },
        { id: 'architecture', name: 'Database ERD Studio' },
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
    <div className={`h-screen overflow-hidden flex flex-col font-sans transition-all duration-300 ${
      darkMode ? 'dark bg-m3-surface text-m3-on-surface' : 'bg-m3-surface text-m3-on-surface'
    }`}>
      {/* TOP LINEAR HIGH-VIS PROGRESS BAR */}
      {percentProgress > 0 && (
        <div 
          className="fixed top-0 left-0 h-1 bg-gradient-to-r from-m3-primary to-amber-500 z-50 transition-all duration-[80ms]"
          style={{ width: `${percentProgress}%` }}
        />
      )}

      {/* HEADER SECTION */}
      <header className="py-4 px-6 border-b border-m3-outline-variant/20 flex justify-between items-center sticky top-0 z-40 android-glass-header shadow-sm bg-m3-surface/80 backdrop-blur-md">
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

            {isAccountDropdownOpen && (
              <>
                {/* Backdrop overlay for dismissing dropdown on click-away */}
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsAccountDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-m3-surface-low border border-m3-outline-variant/40 text-m3-on-surface shadow-2xl z-50 p-2 space-y-1.5 animate-fade-in font-sans">
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
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* BODY CONTENT: Sidebar + Dynamic tab target */}
      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR NAVIGATION: Desktop */}
        <aside className={`border-r border-m3-outline-variant/15 sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto hidden md:block select-none android-glass-sidebar py-6 transition-all duration-300 ease-in-out ${
          isSidebarMinimized ? 'w-20 px-2' : 'w-72 px-4'
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
              {/* Operational Walkthrough Guide Option */}
              <button
                id="sidebar-tutorials-btn"
                onClick={() => changeTab('tutorials')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'tutorials'
                    ? 'bg-m3-primary text-m3-on-primary shadow-md font-black scale-[1.01]'
                    : 'hover:bg-m3-primary/5 text-m3-on-surface-variant hover:text-m3-primary'
                } ${isSidebarMinimized ? 'justify-center px-1' : ''}`}
                title="Operational Walkthrough Guide"
              >
                <BookOpen className={`h-4.5 w-4.5 shrink-0 ${activeTab === 'tutorials' ? 'text-m3-on-primary' : 'text-m3-on-surface-variant'}`} />
                {!isSidebarMinimized && <span>Operation Walkthrough</span>}
              </button>

              <div className="h-px bg-m3-outline-variant/15 my-2" />

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
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-45 flex md:hidden">
            <div className="absolute inset-0 bg-m3-on-surface/40 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
            <aside className="relative w-64 h-full flex flex-col p-5 space-y-5 shadow-2xl z-10 animate-slide-right android-glass-modal text-m3-on-surface">
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
                {/* Mobile walkthrough link */}
                <button
                  id="mobile-sidebar-tutorials-btn"
                  onClick={() => {
                    changeTab('tutorials');
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'tutorials'
                      ? 'bg-m3-primary text-m3-on-primary shadow-md font-black scale-[1.01]'
                      : 'hover:bg-m3-primary/5 text-m3-on-surface-variant hover:text-m3-primary'
                  }`}
                >
                  <BookOpen className={`h-4.5 w-4.5 shrink-0 ${activeTab === 'tutorials' ? 'text-m3-on-primary' : 'text-m3-on-surface-variant'}`} />
                  <span>Operation Walkthrough</span>
                </button>

                <div className="h-px bg-m3-outline-variant/15 my-1.5" />

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
            </aside>
          </div>
        )}

        {/* DYNAMIC COMPONENT PANEL AREA */}
        <main className="flex-1 p-4 md:p-6 pb-26 md:pb-6 overflow-y-auto relative z-10 flex flex-col">
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

            if (authorizedSubItems.length <= 1) return null;

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
                {activeTab === 'pos' && <PosModule darkMode={darkMode} onNavigate={changeTab} viewMode="checkout" />}
                {activeTab === 'ledger' && <PosModule darkMode={darkMode} onNavigate={changeTab} viewMode="ledger" />}
                {activeTab === 'inventory' && <InventoryModule darkMode={darkMode} />}
                {activeTab === 'procurement' && <ProcurementModule darkMode={darkMode} />}
                {activeTab === 'transmittal' && <TransmittalModule darkMode={darkMode} />}
                {activeTab === 'shift' && <ShiftModule darkMode={darkMode} onNavigate={changeTab} />}
                {activeTab === 'calculator' && <CalculatorModule darkMode={darkMode} />}
                {activeTab === 'branches' && <BranchModule darkMode={darkMode} />}
                {activeTab === 'users' && <UsersModule darkMode={darkMode} />}
                {activeTab === 'reports-transmission' && <SalesTransmissionModule darkMode={darkMode} />}
                {activeTab === 'deliveries-panel' && <DeliveriesModule darkMode={darkMode} />}

                {/* ATPOS v2 Sub-items routing to standard Core Modules */}
                {activeTab.startsWith('inventory-') && (
                  ['inventory-stocks', 'inventory-warehouse', 'inventory-low-qty', 'inventory-convert', 'inventory-pulled-out', 'inventory-add', 'inventory-print-label', 'inventory-transaction-history', 'inventory-product-history', 'inventory-expiration', 'inventory-new-pullout', 'inventory-pending-pullout', 'inventory-search-pullout'].includes(activeTab) ? (
                    <InventoryModule darkMode={darkMode} />
                  ) : ['inventory-transfer', 'inventory-search-transfer'].includes(activeTab) ? (
                    <TransmittalModule darkMode={darkMode} />
                  ) : (
                    <ProcurementModule darkMode={darkMode} />
                  )
                )}

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
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 android-glass border-t border-m3-outline-variant/20 px-2 py-2 flex justify-around items-center rounded-t-[24px] shadow-lg">
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
