import { getBranchOptionLabel } from '../lib/branchUtils';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { useDb } from '../context/DbContext';
import { User, UserRole, UserStatus } from '../types/db';
import { useResponsivePageSize, TablePagination } from './TablePagination';
import { HeroChip, HeroButton, HeroSelect, HeroModal } from './common/ui';
import { HeroDropdownSelect } from './common/ui/HeroDropdown';
import { HeroTable } from './common/ui/HeroTable';
import { ToastNotification } from './ToastNotification';
import { useMultiSort } from '../hooks/useMultiSort';
import { MultiSortBadgeBar } from './common/ui/MultiSortBadgeBar';

import {
  Users,
  ShieldCheck,
  UserPlus,
  Sparkles,
  Edit2,
  Lock,
  Power,
  X,
  MapPin,
  Mail,
  Activity,
  Laptop,
  PowerOff,
  Clock,
  AlertTriangle,
  LayoutGrid,
  List,
  Search,
  KeyRound,
  Eye,
  EyeOff,
  Briefcase,
  ShoppingBag,
  UserCheck,
  Copy,
  Check,
  Smartphone,
  Fingerprint,
  Monitor
} from 'lucide-react';

interface UsersModuleProps {
  darkMode?: boolean;
}

export const UsersModule: React.FC<UsersModuleProps> = ({ darkMode: _darkMode }) => {
  const {
    users,
    branches,
    createUser,
    updateUser,
    resetPassword,
    currentUser,
    activeSessions,
    activeSessionId,
    terminateSession,
    sessionRemainingSeconds,
    sessionExpiresAt,
    extendSession
  } = useDb();
  const [extendingSession, setExtendingSession] = useState(false);

  const handleExtendCurrentSession = async () => {
    setExtendingSession(true);
    try {
      const ok = await extendSession(60);
      if (ok) {
        // toast or notice handled via state
      }
    } finally {
      setExtendingSession(false);
    }
  };

  const [subTab, setSubTab] = useState<'employees' | 'active_sessions'>('employees');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [, setThemeTick] = useState(0);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});
  const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);

  // Sync with theme updates
  useEffect(() => {
    const handleSync = () => setThemeTick((t) => t + 1);
    window.addEventListener("tilepoint-theme-updated", handleSync);
    return () => window.removeEventListener("tilepoint-theme-updated", handleSync);
  }, []);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const cardPageSize = useResponsivePageSize(260, 420, 6);
  const pageSize = viewMode === 'table' ? 10 : cardPageSize;

  // Reset page when sub-tab or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [subTab, searchQuery, roleFilter, branchFilter, statusFilter]);

  // Create Modal state
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState('');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.CASHIER);
  const [branchAssignmentId, setBranchAssignmentId] = useState('B1');
  const [status, setStatus] = useState<UserStatus>('Active');
  const [managerPin, setManagerPin] = useState('');

  // Custom inline toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const isUserAdmin = currentUser?.role === UserRole.ADMIN;
  const isUserAdminOrManager = isUserAdmin || currentUser?.role === UserRole.MANAGER;

  const userBranchId = currentUser?.branchAssignmentId || "B1";

  // Multi-column sorting for employee directory
  const {
    sortDescriptors: usersSortDescriptors,
    handleSort: handleUsersSort,
    getSortDirection: getUsersSortDir,
    getSortRank: getUsersSortRank,
    removeSort: removeUsersSort,
    clearSort: clearUsersSort,
    sortData: sortUsersData
  } = useMultiSort<User>({
    customGetters: {
      fullName: (u) => u.fullName || '',
      role: (u) => u.role || '',
      branchAssignmentId: (u) => getBranchName(u.branchAssignmentId),
      email: (u) => u.email || '',
      status: (u) => u.status || 'Active',
      createdAt: (u) => (u.createdAt ? new Date(u.createdAt).getTime() : 0),
    }
  });

  // Filter users list based on role, branch and search query
  const filteredUsers = useMemo(() => {
    const list = [...users].filter((u) => {
      // Access permissions
      if (!isUserAdminOrManager) {
        const userB = u.branchAssignmentId || "B1";
        const myB = userBranchId || "B1";
        const isOwnBranch = userB === myB || (userB === "main" && myB === "B1") || (userB === "B1" && myB === "main");
        if (!isOwnBranch) return false;
      }

      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (u.fullName || '').toLowerCase().includes(q);
        const matchesUsername = (u.username || '').toLowerCase().includes(q);
        const matchesEmail = (u.email || '').toLowerCase().includes(q);
        const matchesRole = (u.role || '').toLowerCase().includes(q);
        const matchesId = (u.id || '').toLowerCase().includes(q);
        if (!matchesName && !matchesUsername && !matchesEmail && !matchesRole && !matchesId) {
          return false;
        }
      }

      // Role Filter
      if (roleFilter !== 'ALL' && u.role !== roleFilter) {
        return false;
      }

      // Branch Filter
      if (branchFilter !== 'ALL' && (u.branchAssignmentId || 'B1') !== branchFilter) {
        return false;
      }

      // Status Filter
      if (statusFilter !== 'ALL' && u.status !== statusFilter) {
        return false;
      }

      return true;
    });

    if (usersSortDescriptors.length > 0) {
      return sortUsersData(list);
    }

    return list.sort((a, b) => {
      if (a.isNew && !b.isNew) return -1;
      if (!a.isNew && b.isNew) return 1;
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [users, isUserAdminOrManager, userBranchId, searchQuery, roleFilter, branchFilter, statusFilter, usersSortDescriptors, sortUsersData]);

  // Multi-column sorting for active sessions
  const {
    sortDescriptors: sessionsSortDescriptors,
    handleSort: handleSessionsSort,
    getSortDirection: getSessionsSortDir,
    getSortRank: getSessionsSortRank,
    removeSort: removeSessionsSort,
    clearSort: clearSessionsSort,
    sortData: sortSessionsData
  } = useMultiSort<any>({
    customGetters: {
      fullName: (s) => s.fullName || '',
      username: (s) => s.username || '',
      branchId: (s) => getBranchName(s.branchId),
      deviceName: (s) => getDeviceDescription(s.userAgent),
      lastActive: (s) => (s.lastActive ? new Date(s.lastActive).getTime() : 0),
    }
  });

  // Filter activeSessions based on role
  const allowedActiveSessions = useMemo(() => {
    const list = activeSessions.filter((session) => {
      if (isUserAdminOrManager) return true;
      const sessionUser = users.find((u) => u.username === session.username);
      return sessionUser && (sessionUser.branchAssignmentId === userBranchId || !sessionUser.branchAssignmentId);
    });

    if (sessionsSortDescriptors.length > 0) {
      return sortSessionsData(list);
    }

    return list;
  }, [activeSessions, isUserAdminOrManager, users, userBranchId, sessionsSortDescriptors, sortSessionsData]);

  const getBranchName = (id: string | null) => {
    if (!id || id === "B1" || id === "main") {
      const stored = localStorage.getItem("tilepoint_company_name_v1");
      if (stored) return stored;
    }
    const b = branches.find(br => br.id === id);
    if (!b) {
      const stored = localStorage.getItem("tilepoint_company_name_v1");
      if (stored) return stored;
      return branches[0]?.name || "Main Branch";
    }
    return b.name;
  };

  const handleOpenAdd = () => {
    setFullName('');
    setUsername('');
    setEmail('');
    setRole(UserRole.CASHIER);
    setBranchAssignmentId(userBranchId || branches[0]?.id || 'B1');
    setStatus('Active');
    setManagerPin('');

    setIsEditMode(false);
    setShowModal(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingId(u.id);
    setFullName(u.fullName);
    setUsername(u.username);
    setEmail(u.email);
    setRole(u.role);
    setBranchAssignmentId(u.branchAssignmentId || 'B1');
    setStatus(u.status);
    setManagerPin(u.managerPin || '');

    setIsEditMode(true);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isUserManager = currentUser?.role === UserRole.MANAGER;
    if (!isUserAdmin && !isUserManager) {
      showToast('Permission Denied: Corporate structure edits are restricted.');
      return;
    }

    if (!isUserAdmin) {
      if (branchAssignmentId !== userBranchId) {
        showToast('Permission Denied: You can only assign personnel to your own branch.');
        return;
      }
      if (role !== UserRole.CASHIER && role !== UserRole.STAFF) {
        showToast('Permission Denied: Managers can only enlist Cashier and Staff employees.');
        return;
      }
      if (isEditMode) {
        const targetUser = users.find(u => u.id === editingId);
        if (!targetUser || targetUser.branchAssignmentId !== userBranchId) {
          showToast('Permission Denied: You can only edit personnel assigned to your own branch.');
          return;
        }
      }
    }

    const initials = fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const payload = {
      avatarInitials: initials || 'TP',
      fullName,
      username,
      email,
      role,
      branchAssignmentId,
      status,
      managerPin: (role === UserRole.ADMIN || role === UserRole.MANAGER) ? managerPin || undefined : undefined,
    };

    if (isEditMode) {
      updateUser(editingId, payload);
      showToast(`Updated profile details for ${fullName}.`);
    } else {
      await createUser({ ...payload, isNew: true });
      showToast(`Registered and enlisted ${fullName} successfully.`);
      setCurrentPage(1);
    }

    setShowModal(false);
  };

  const handleToggleStatus = (u: User) => {
    const isUserManager = currentUser?.role === UserRole.MANAGER;
    if (!isUserAdmin && !(isUserManager && u.branchAssignmentId === userBranchId)) {
      showToast('Action Denied: Requires Administrator or Branch Manager credentials.');
      return;
    }
    const targetStatus: UserStatus = u.status === 'Active' ? 'Disabled' : 'Active';
    updateUser(u.id, { status: targetStatus });
    showToast(`Account status for ${u.fullName} is now ${targetStatus}.`);
  };

  const handleResetPassword = (id: string, name: string) => {
    const targetUser = users.find(u => u.id === id);
    const isUserManager = currentUser?.role === UserRole.MANAGER;
    if (!isUserAdmin && !(isUserManager && targetUser?.branchAssignmentId === userBranchId)) {
      showToast('Action Denied: Requires Administrator or Branch Manager credentials.');
      return;
    }
    resetPassword(id);
    showToast(`Temporary default password reset for ${name}.`);
  };

  const togglePinReveal = (userId: string) => {
    setRevealedPins(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const copyEmailToClipboard = (emailText: string, id: string) => {
    if (!emailText) return;
    navigator.clipboard.writeText(emailText);
    setCopiedEmailId(id);
    setTimeout(() => setCopiedEmailId(null), 2000);
    showToast(`Copied ${emailText} to clipboard`);
  };

  const getDeviceIcon = (ua?: string) => {
    if (!ua) return <Monitor className="h-4 w-4 text-default-500" />;
    if (ua.includes('Android') || ua.includes('iPhone')) {
      return <Smartphone className="h-4 w-4 text-primary" />;
    }
    if (ua.includes('iPad') || ua.includes('Tablet')) {
      return <Laptop className="h-4 w-4 text-purple-500" />;
    }
    return <Monitor className="h-4 w-4 text-sky-500" />;
  };

  const getDeviceDescription = (ua?: string) => {
    if (!ua) return 'Unknown Device';
    let browser = 'Web Browser';
    let os = 'OS';

    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';

    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Macintosh')) os = 'macOS';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone')) os = 'iOS';
    else if (ua.includes('Linux')) os = 'Linux';

    return `${browser} (${os})`;
  };

  const getRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 15) return 'Just now';
      if (diffSec < 60) return `${diffSec}s ago`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (_) {
      return 'Active';
    }
  };

  const handleTerminateRemote = (sessionId: string, userName: string) => {
    if (!isUserAdmin) {
      showToast('Action Denied: Only Administrators can terminate active remote terminal sessions.');
      return;
    }
    terminateSession(sessionId);
    showToast(`Signed out active session for ${userName}.`);
  };

  const getRoleBadge = (userRole: UserRole) => {
    switch (userRole) {
      case UserRole.ADMIN:
        return {
          icon: <ShieldCheck className="h-3 w-3" />,
          label: 'Admin',
          badgeClass: 'bg-primary/10 text-primary border-primary/25',
          dotColor: 'bg-primary'
        };
      case UserRole.MANAGER:
        return {
          icon: <Briefcase className="h-3 w-3" />,
          label: 'Manager',
          badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
          dotColor: 'bg-amber-500'
        };
      case UserRole.CASHIER:
        return {
          icon: <ShoppingBag className="h-3 w-3" />,
          label: 'Cashier',
          badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25',
          dotColor: 'bg-sky-500'
        };
      case UserRole.STAFF:
      default:
        return {
          icon: <UserCheck className="h-3 w-3" />,
          label: 'Staff',
          badgeClass: 'bg-default-100 text-default-600 border-divider/30',
          dotColor: 'bg-default-400'
        };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-foreground pb-16">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-content1/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-divider/25 sticky top-0 z-20 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-wide text-foreground uppercase">Staff & Employee Management</h3>
              <p className="text-[11px] text-default-500">Manage personnel directory, role permissions, PINs, and active terminal sessions</p>
            </div>
          </div>
        </div>

        {(isUserAdmin || currentUser?.role === UserRole.MANAGER) && subTab === 'employees' && (
          <HeroButton
            onClick={handleOpenAdd}
            variant="solid"
            color="primary"
            startContent={<UserPlus className="h-4 w-4" />}
            className="w-full sm:w-auto font-bold text-xs shrink-0 rounded-xl"
          >
            Enlist Employee
          </HeroButton>
        )}
      </div>

      {/* Navigation Sub-Tabs & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-divider/15 pb-2 text-left">
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-full border border-zinc-200/50 dark:border-white/5">
          <button
            type="button"
            onClick={() => setSubTab('employees')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              subTab === 'employees'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Employees Directory</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
              subTab === 'employees' ? 'bg-primary/10 text-primary' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
            }`}>
              {filteredUsers.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('active_sessions')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              subTab === 'active_sessions'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Active Terminals</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
              subTab === 'active_sessions' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
            }`}>
              {allowedActiveSessions.length}
            </span>
          </button>
        </div>

        {/* View Mode Toggle (Cards / Table) */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-full border border-zinc-200/50 dark:border-white/5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'cards'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
            title="Card Grid View"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Cards</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'table'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
            title="Table List View"
          >
            <List className="h-3.5 w-3.5" />
            <span>Table</span>
          </button>
        </div>
      </div>

      {subTab === 'employees' ? (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 shadow-elevation-soft space-y-3 text-left">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Search Box */}
              <div className="sm:col-span-6 lg:col-span-5 relative">
                <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-default-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, @username, email, or ID..."
                  className="w-full pl-9 pr-8 py-2 text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-white/5 rounded-full text-foreground placeholder:text-default-400 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-default-400 hover:text-foreground text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Role Filter */}
              <div className="sm:col-span-3 lg:col-span-3">
                <HeroDropdownSelect
                  items={[
                    { key: 'ALL', label: 'All Roles' },
                    { key: UserRole.ADMIN, label: 'Admin' },
                    { key: UserRole.MANAGER, label: 'Manager' },
                    { key: UserRole.CASHIER, label: 'Cashier' },
                    { key: UserRole.STAFF, label: 'Staff' },
                  ]}
                  selectedKey={roleFilter}
                  onSelectionChange={(val) => setRoleFilter(val)}
                  size="sm"
                  variant="pill"
                  className="w-full"
                />
              </div>

              {/* Branch Filter */}
              <div className="sm:col-span-3 lg:col-span-2">
                <HeroDropdownSelect
                  items={[
                    { key: 'ALL', label: 'All Branches' },
                    ...branches.map((b) => ({
                      key: b.id,
                      label: b.name,
                    })),
                  ]}
                  selectedKey={branchFilter}
                  onSelectionChange={(val) => setBranchFilter(val)}
                  size="sm"
                  variant="pill"
                  className="w-full"
                />
              </div>

              {/* Status Filter */}
              <div className="sm:col-span-12 lg:col-span-2">
                <HeroDropdownSelect
                  items={[
                    { key: 'ALL', label: 'All Status' },
                    { key: 'Active', label: 'Active Only' },
                    { key: 'Disabled', label: 'Disabled Only' },
                  ]}
                  selectedKey={statusFilter}
                  onSelectionChange={(val) => setStatusFilter(val)}
                  size="sm"
                  variant="pill"
                  className="w-full"
                />
              </div>
            </div>

            {/* Filter Summary Tags if filters are active */}
            {(searchQuery || roleFilter !== 'ALL' || branchFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-divider/15 text-[11px]">
                <span className="text-default-400 font-medium">Active Filters:</span>
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 font-semibold">
                    Query: "{searchQuery}"
                    <button type="button" onClick={() => setSearchQuery('')} className="hover:text-primary/70 active:scale-[0.98]"><X className="h-3 w-3" /></button>
                  </span>
                )}
                {roleFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 font-semibold">
                    Role: {roleFilter}
                    <button type="button" onClick={() => setRoleFilter('ALL')} className="hover:text-primary/70 active:scale-[0.98]"><X className="h-3 w-3" /></button>
                  </span>
                )}
                {branchFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 font-semibold">
                    Branch: {getBranchName(branchFilter)}
                    <button type="button" onClick={() => setBranchFilter('ALL')} className="hover:text-primary/70 active:scale-[0.98]"><X className="h-3 w-3" /></button>
                  </span>
                )}
                {statusFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 font-semibold">
                    Status: {statusFilter}
                    <button type="button" onClick={() => setStatusFilter('ALL')} className="hover:text-primary/70 active:scale-[0.98]"><X className="h-3 w-3" /></button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setRoleFilter('ALL');
                    setBranchFilter('ALL');
                    setStatusFilter('ALL');
                  }}
                  className="text-primary hover:underline font-bold ml-auto cursor-pointer"
                >
                  Reset all filters
                </button>
              </div>
            )}
          </div>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-14 bg-content1 rounded-2xl border border-divider/20 p-6 space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-default-100 text-default-400 mx-auto flex items-center justify-center">
                <Users className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-foreground">No Registered Employees Found</h4>
              <p className="text-xs text-default-500 max-w-sm mx-auto">
                {searchQuery || roleFilter !== 'ALL' || branchFilter !== 'ALL' || statusFilter !== 'ALL'
                  ? 'No employees match your current filter criteria. Try clearing search filters.'
                  : 'Enlist a new employee record to populate the corporate directory.'}
              </p>
              {(searchQuery || roleFilter !== 'ALL' || branchFilter !== 'ALL' || statusFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setRoleFilter('ALL');
                    setBranchFilter('ALL');
                    setStatusFilter('ALL');
                  }}
                  className="px-3.5 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 font-bold rounded-xl text-xs transition-colors cursor-pointer active:scale-[0.98]"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : viewMode === 'cards' ? (
            /* Enhanced Employee Cards Grid View with HeroUI v3 Tokens */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in">
              {filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((u, idx) => {
                const isUserActive = u.status === 'Active';
                const roleInfo = getRoleBadge(u.role);
                const isPinRevealed = !!revealedPins[u.id];

                return (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.24,
                      delay: Math.min(idx * 0.04, 0.28),
                      ease: [0.16, 1, 0.3, 1]
                    }}
                    className="p-5 bg-content1 border border-divider/40 hover:border-primary/50 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group text-foreground active:scale-[0.98]"
                  >
                    {/* Top Row: Avatar, Identity, Status */}
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary text-sm font-black flex items-center justify-center border border-primary/20 shadow-sm overflow-hidden">
                              {u.profilePicture ? (
                                <img
                                  src={u.profilePicture}
                                  alt={u.fullName}
                                  className="h-full w-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <span>{u.avatarInitials || (u.fullName ? u.fullName.slice(0, 2).toUpperCase() : '??')}</span>
                              )}
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-content1 ${
                                isUserActive ? 'bg-success' : 'bg-danger'
                              }`}
                              title={isUserActive ? 'Active Account' : 'Disabled Account'}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-sm font-black text-foreground truncate group-hover:text-primary transition-colors active:scale-[0.98]">
                                {u.fullName}
                              </h4>
                              {u.isNew && (
                                <HeroChip
                                  variant="flat"
                                  color="warning"
                                  size="sm"
                                  startContent={<Sparkles className="h-2.5 w-2.5" />}
                                  className="text-[8.5px] font-black uppercase tracking-wider h-5 px-1.5"
                                >
                                  NEW
                                </HeroChip>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-default-500 font-semibold truncate">
                                @{u.username}
                              </span>
                              <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-default-100 text-default-500 font-mono">
                                #{u.id}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <HeroChip
                          variant="flat"
                          color={isUserActive ? "success" : "danger"}
                          size="sm"
                          startContent={
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isUserActive ? 'bg-success' : 'bg-danger'
                              }`}
                            />
                          }
                          className="text-[9px] font-black tracking-wider uppercase shrink-0"
                        >
                          {u.status}
                        </HeroChip>
                      </div>

                      {/* Middle Specifications & Metadata Grid */}
                      <div className="space-y-2.5 pt-2 border-t border-divider/20 text-xs">
                        {/* Assigned Role */}
                        <div className="flex justify-between items-center">
                          <span className="text-default-500 font-medium text-[11px]">Assigned Role:</span>
                          <span
                            className={`px-2.5 py-0.5 rounded-lg text-[10.5px] font-black tracking-wide border uppercase flex items-center gap-1.5 ${roleInfo.badgeClass}`}
                          >
                            {roleInfo.icon}
                            {roleInfo.label}
                          </span>
                        </div>

                        {/* Assigned Branch */}
                        <div className="flex justify-between items-center">
                          <span className="text-default-500 font-medium text-[11px]">Branch Station:</span>
                          <div className="flex items-center gap-1.5 font-bold text-foreground text-[11px]">
                            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="truncate max-w-[160px]">{getBranchName(u.branchAssignmentId)}</span>
                          </div>
                        </div>

                        {/* Corporate Email */}
                        <div className="flex justify-between items-center">
                          <span className="text-default-500 font-medium text-[11px]">Email Address:</span>
                          <div className="flex items-center gap-1.5 text-default-600 font-medium text-[11px]">
                            <Mail className="h-3.5 w-3.5 text-default-400 shrink-0" />
                            <span className="truncate max-w-[140px]" title={u.email}>{u.email}</span>
                            <button
                              type="button"
                              onClick={() => copyEmailToClipboard(u.email, u.id)}
                              className="p-1 hover:bg-default-100 text-default-400 hover:text-foreground rounded cursor-pointer transition-colors active:scale-95"
                              title="Copy email to clipboard"
                            >
                              {copiedEmailId === u.id ? (
                                <Check className="h-3 w-3 text-success" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Security PIN code (for Admins / Managers) */}
                        {(u.role === UserRole.ADMIN || u.role === UserRole.MANAGER) && (
                          <div className="flex justify-between items-center pt-0.5">
                            <span className="text-default-500 font-medium text-[11px] flex items-center gap-1">
                              <KeyRound className="h-3 w-3 text-warning" /> Security PIN:
                            </span>
                            <div className="flex items-center gap-1.5">
                              {isPinRevealed ? (
                                <span className="text-warning-600 dark:text-warning-400 font-black font-mono bg-warning-50/20 border border-warning-200/50 px-2 py-0.5 rounded text-[11px]">
                                  {u.managerPin || 'Not Set'}
                                </span>
                              ) : (
                                <span className="text-default-500 font-mono bg-default-100 border border-divider/20 px-2 py-0.5 rounded text-[11px]">
                                  ••••••
                                </span>
                              )}
                              {(isUserAdmin || currentUser?.role === UserRole.MANAGER) && (
                                <button
                                  type="button"
                                  onClick={() => togglePinReveal(u.id)}
                                  className="p-1 text-default-400 hover:text-warning rounded hover:bg-warning-50/20 cursor-pointer transition-colors active:scale-95"
                                  title={isPinRevealed ? 'Hide PIN' : 'Reveal PIN'}
                                >
                                  {isPinRevealed ? (
                                    <EyeOff className="h-3 w-3" />
                                  ) : (
                                    <Eye className="h-3 w-3" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Controls */}
                    {(isUserAdmin || (currentUser?.role === UserRole.MANAGER && u.branchAssignmentId === userBranchId)) && (
                      <div className="flex items-center justify-between gap-1.5 border-t border-divider/20 pt-3 mt-4">
                        <HeroButton
                          variant="light"
                          color="primary"
                          size="sm"
                          startIcon={<Lock className="h-3.5 w-3.5" />}
                          onClick={() => handleResetPassword(u.id, u.fullName)}
                          className="text-[11px] font-bold"
                          title="Reset employee login password to default"
                        >
                          Reset PWD
                        </HeroButton>

                        <div className="flex items-center gap-1.5">
                          <HeroButton
                            variant="light"
                            color={isUserActive ? "danger" : "success"}
                            size="sm"
                            startIcon={<Power className="h-3.5 w-3.5" />}
                            onClick={() => handleToggleStatus(u)}
                            className="text-[11px] font-bold"
                            title={isUserActive ? 'Deactivate employee account' : 'Enable employee login'}
                          >
                            {isUserActive ? 'Deactivate' : 'Activate'}
                          </HeroButton>

                          <HeroButton
                            variant="flat"
                            color="default"
                            size="sm"
                            startIcon={<Edit2 className="h-3.5 w-3.5 text-default-500" />}
                            onClick={() => handleOpenEdit(u)}
                            className="text-[11px] font-bold"
                            title="Edit employee details and assignments"
                          >
                            Edit
                          </HeroButton>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* Table View with high-contrast formatting */
            <div className="space-y-3 mb-6">
              <MultiSortBadgeBar
                sortDescriptors={usersSortDescriptors}
                onRemoveSort={removeUsersSort}
                onClearSort={clearUsersSort}
                columnLabels={{
                  fullName: 'Employee Profile',
                  role: 'Role Classification',
                  branchAssignmentId: 'Branch Station',
                  email: 'Corporate Email',
                  status: 'Account Status',
                }}
              />

              <HeroTable isStriped className="min-w-[860px]">
                <HeroTable.Header>
                  <tr className="border-b border-divider/20 bg-content2/50 text-default-500 font-black uppercase tracking-wider text-[10px]">
                    <HeroTable.Column
                      allowsSorting
                      sortDirection={getUsersSortDir('fullName')}
                      sortRank={getUsersSortRank('fullName')}
                      onSort={(e) => handleUsersSort('fullName', e)}
                      className="py-3.5 px-4"
                    >
                      Employee Profile
                    </HeroTable.Column>
                    <HeroTable.Column
                      allowsSorting
                      sortDirection={getUsersSortDir('role')}
                      sortRank={getUsersSortRank('role')}
                      onSort={(e) => handleUsersSort('role', e)}
                      className="py-3.5 px-4"
                    >
                      Role Classification
                    </HeroTable.Column>
                    <HeroTable.Column
                      allowsSorting
                      sortDirection={getUsersSortDir('branchAssignmentId')}
                      sortRank={getUsersSortRank('branchAssignmentId')}
                      onSort={(e) => handleUsersSort('branchAssignmentId', e)}
                      className="py-3.5 px-4"
                    >
                      Branch Station
                    </HeroTable.Column>
                    <HeroTable.Column
                      allowsSorting
                      sortDirection={getUsersSortDir('email')}
                      sortRank={getUsersSortRank('email')}
                      onSort={(e) => handleUsersSort('email', e)}
                      className="py-3.5 px-4"
                    >
                      Corporate Email
                    </HeroTable.Column>
                    {(isUserAdmin || currentUser?.role === UserRole.MANAGER) && (
                      <HeroTable.Column align="center" className="py-3.5 px-4 text-center">
                        Security PIN
                      </HeroTable.Column>
                    )}
                    <HeroTable.Column
                      align="center"
                      allowsSorting
                      sortDirection={getUsersSortDir('status')}
                      sortRank={getUsersSortRank('status')}
                      onSort={(e) => handleUsersSort('status', e)}
                      className="py-3.5 px-4 text-center"
                    >
                      Account Status
                    </HeroTable.Column>
                    {(isUserAdmin || currentUser?.role === UserRole.MANAGER) && (
                      <HeroTable.Column align="end" className="py-3.5 px-4 text-right">
                        Operations
                      </HeroTable.Column>
                    )}
                  </tr>
                </HeroTable.Header>
                <HeroTable.Body>
                  {filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((u, idx) => {
                    const isUserActive = u.status === 'Active';
                    const roleInfo = getRoleBadge(u.role);
                    const isPinRevealed = !!revealedPins[u.id];

                    return (
                      <motion.tr
                        key={u.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.22,
                          delay: Math.min(idx * 0.03, 0.25),
                          ease: [0.16, 1, 0.3, 1]
                        }}
                        className="hover:bg-content2/40 transition-colors active:scale-[0.98]"
                      >
                        {/* Employee Profile Cell */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary text-xs font-black flex items-center justify-center shadow-inner border border-divider/15 overflow-hidden shrink-0">
                              {u.profilePicture ? (
                                <img src={u.profilePicture} alt={u.fullName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                u.avatarInitials || (u.fullName ? u.fullName.slice(0, 2).toUpperCase() : '??')
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-foreground">{u.fullName}</span>
                                {u.isNew && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5 shadow-sm">
                                    <Sparkles className="h-2.5 w-2.5" /> NEW
                                  </span>
                                )}
                              </div>
                              <span className="text-[10.5px] text-default-500 font-medium">@{u.username}</span>
                            </div>
                          </div>
                        </td>

                        {/* Assigned Role */}
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black tracking-wide border uppercase inline-flex items-center gap-1 ${roleInfo.badgeClass}`}>
                            {roleInfo.icon}
                            {roleInfo.label}
                          </span>
                        </td>

                        {/* Branch Assignment */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 font-bold text-foreground">
                            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>{getBranchName(u.branchAssignmentId)}</span>
                          </div>
                        </td>

                        {/* Corporate Email */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-default-600 font-medium">
                            <Mail className="h-3.5 w-3.5 text-default-400 shrink-0" />
                            <span className="truncate max-w-[200px]">{u.email}</span>
                          </div>
                        </td>

                        {/* Security PIN Code */}
                        {(isUserAdmin || currentUser?.role === UserRole.MANAGER) && (
                          <td className="py-3 px-4 text-center">
                            {(u.role === UserRole.ADMIN || u.role === UserRole.MANAGER) ? (
                              <div className="inline-flex items-center gap-1">
                                {isPinRevealed ? (
                                  <span className="text-amber-600 dark:text-amber-400 font-black font-mono bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded text-[11px]">
                                    {u.managerPin || 'Not Set'}
                                  </span>
                                ) : (
                                  <span className="text-default-500 font-mono bg-default-100 border border-divider/20 px-2 py-0.5 rounded text-[11px]">
                                    ••••••
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => togglePinReveal(u.id)}
                                  className="p-1 text-default-400 hover:text-amber-500 rounded hover:bg-amber-500/10 cursor-pointer transition-colors active:scale-95"
                                  title={isPinRevealed ? 'Hide PIN' : 'Reveal PIN'}
                                >
                                  {isPinRevealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                </button>
                              </div>
                            ) : (
                              <span className="text-default-400 text-[10px]">—</span>
                            )}
                          </td>
                        )}

                        {/* Status Badge */}
                        <td className="py-3 px-4 text-center select-none">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase border inline-flex items-center gap-1 ${
                              isUserActive
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25'
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${isUserActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {u.status}
                          </span>
                        </td>

                        {/* Operations Controls */}
                        {(isUserAdmin || (currentUser?.role === UserRole.MANAGER && u.branchAssignmentId === userBranchId)) && (
                          <td className="py-3 px-4 text-right select-none">
                            <div className="flex gap-1 justify-end items-center">
                              <button
                                type="button"
                                onClick={() => handleResetPassword(u.id, u.fullName)}
                                className="p-1.5 hover:bg-primary/10 text-primary rounded-lg flex items-center gap-1 cursor-pointer transition-colors text-[10.5px] font-bold active:scale-95"
                                title="Reset password"
                              >
                                <Lock className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(u)}
                                className={`p-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors text-[10.5px] font-bold ${
                                  isUserActive
                                    ? 'text-rose-600 hover:bg-rose-500/10'
                                    : 'text-emerald-600 hover:bg-emerald-500/10'
                                }`}
                                title={isUserActive ? 'Deactivate account' : 'Enable login'}
                              >
                                <Power className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(u)}
                                className="p-1.5 hover:bg-default-100 text-default-500 rounded-lg flex items-center gap-1 cursor-pointer transition-colors text-[10.5px] font-bold active:scale-95"
                                title="Edit details"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </motion.tr>
                    );
                  })}
                </HeroTable.Body>
              </HeroTable>
            </div>
          )}

          <TablePagination
            currentPage={currentPage}
            totalItems={filteredUsers.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            itemName="employees"
          />
        </div>
      ) : (
        /* Active sessions panel view */
        <div className="space-y-6 animate-fade-in">
          {/* Security Banner alert box */}
          <div className="flex gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-xs">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1 text-foreground">
              <span className="font-bold text-amber-600 dark:text-amber-400 block">Single-Device Active Terminal Policy</span>
              <p className="text-default-500 leading-relaxed">
                Staff accounts operate under strict single-session concurrency to prevent audit log collisions.
                Logging in on a new device will supersede previous active sessions.
              </p>
            </div>
          </div>

          {/* Active Sessions Data */}
          {allowedActiveSessions.length === 0 ? (
            <div className="text-center py-12 bg-content1 rounded-2xl border border-divider/10">
              <Laptop className="h-10 w-10 text-default-400 mx-auto mb-2.5" />
              <p className="text-sm font-semibold text-default-500">No Active Remote Sessions Registered</p>
              <p className="text-xs text-default-400 mt-0.5">Terminal heartbeats will appear here in real-time as users operate the system.</p>
            </div>
          ) : viewMode === 'table' ? (
            /* Table View for active sessions */
            <div className="space-y-3 mb-6">
              <MultiSortBadgeBar
                sortDescriptors={sessionsSortDescriptors}
                onRemoveSort={removeSessionsSort}
                onClearSort={clearSessionsSort}
                columnLabels={{
                  fullName: 'Staff Member',
                  username: 'User ID',
                  branchId: 'Active Branch',
                  deviceName: 'Terminal Device',
                  lastActive: 'Last Contact',
                }}
              />

              <div className="overflow-x-auto">
                <HeroTable isStriped className="min-w-[800px]">
                <HeroTable.Header>
                  <tr className="border-b border-divider/20 bg-content2/50 text-default-500 font-black uppercase tracking-wider text-[10px]">
                    <HeroTable.Column className="py-3 px-4">Connection</HeroTable.Column>
                    <HeroTable.Column
                      allowsSorting
                      sortDirection={getSessionsSortDir('fullName')}
                      sortRank={getSessionsSortRank('fullName')}
                      onSort={(e) => handleSessionsSort('fullName', e)}
                      className="py-3 px-4"
                    >
                      Staff Member
                    </HeroTable.Column>
                    <HeroTable.Column
                      allowsSorting
                      sortDirection={getSessionsSortDir('username')}
                      sortRank={getSessionsSortRank('username')}
                      onSort={(e) => handleSessionsSort('username', e)}
                      className="py-3 px-4"
                    >
                      User ID
                    </HeroTable.Column>
                    <HeroTable.Column
                      allowsSorting
                      sortDirection={getSessionsSortDir('branchId')}
                      sortRank={getSessionsSortRank('branchId')}
                      onSort={(e) => handleSessionsSort('branchId', e)}
                      className="py-3 px-4"
                    >
                      Active Branch
                    </HeroTable.Column>
                    <HeroTable.Column
                      allowsSorting
                      sortDirection={getSessionsSortDir('deviceName')}
                      sortRank={getSessionsSortRank('deviceName')}
                      onSort={(e) => handleSessionsSort('deviceName', e)}
                      className="py-3 px-4"
                    >
                      Terminal Device
                    </HeroTable.Column>
                    <HeroTable.Column
                      allowsSorting
                      sortDirection={getSessionsSortDir('lastActive')}
                      sortRank={getSessionsSortRank('lastActive')}
                      onSort={(e) => handleSessionsSort('lastActive', e)}
                      className="py-3 px-4"
                    >
                      Last Contact
                    </HeroTable.Column>
                    <HeroTable.Column align="end" className="py-3 px-4 text-right">Actions</HeroTable.Column>
                  </tr>
                </HeroTable.Header>
                <HeroTable.Body>
                  {allowedActiveSessions.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((session, idx) => {
                    const isCurrent = session.id === activeSessionId;
                    return (
                      <motion.tr
                        key={session.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.22,
                          delay: Math.min(idx * 0.03, 0.25),
                          ease: [0.16, 1, 0.3, 1]
                        }}
                        className="hover:bg-content2/40 transition-colors active:scale-[0.98]"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                            {isCurrent ? (
                              <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                                This Terminal
                              </span>
                            ) : (
                              <span className="bg-default-100 text-default-500 border border-divider/20 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                                Remote Link
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary text-xs font-black flex items-center justify-center shrink-0">
                              {(session.fullName || '').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
                            </div>
                            <div>
                              <span className="font-bold text-foreground block">{session.fullName}</span>
                              <span className="text-[10px] text-default-500 uppercase font-bold tracking-wider">{session.role}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground">
                          @{session.username}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold flex items-center gap-1 text-foreground">
                            <MapPin className="h-3 w-3 text-primary shrink-0" />
                            <span>{getBranchName(session.branchId)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-default-600 font-medium truncate max-w-[180px]" title={session.userAgent}>
                          <div className="flex items-center gap-1.5">
                            {getDeviceIcon(session.userAgent)}
                            <span className="truncate">{getDeviceDescription(session.userAgent)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>{getRelativeTime(session.lastActive)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!isCurrent && (isUserAdmin || (currentUser?.role === UserRole.MANAGER && users.find(u => u.username === session.username)?.branchAssignmentId === userBranchId)) && (
                            <button
                              type="button"
                              onClick={() => handleTerminateRemote(session.id, session.fullName)}
                              className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white border border-rose-500/25 text-[10.5px] font-bold rounded-xl inline-flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
                              title="Terminate remote session and force sign-out"
                            >
                              <PowerOff className="h-3 w-3" /> Terminate
                            </button>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </HeroTable.Body>
              </HeroTable>
            </div>
              <TablePagination
                currentPage={currentPage}
                totalItems={allowedActiveSessions.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                itemName="terminals"
              />
            </div>
          ) : (
            /* Active Sessions Cards View */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {allowedActiveSessions.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((session, idx) => {
                  const isCurrent = session.id === activeSessionId;
                  return (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.24,
                        delay: Math.min(idx * 0.04, 0.28),
                        ease: [0.16, 1, 0.3, 1]
                      }}
                      className="p-5 bg-content1 border border-divider/30 hover:border-primary/40 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group text-foreground active:scale-[0.98]"
                    >
                      <div className="space-y-4">
                        {/* Live Header Status */}
                        <div className="flex items-center justify-between border-b border-divider/20 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                            <span className="text-[10px] font-black tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">Live Session</span>
                          </div>
                          {isCurrent ? (
                            <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                              This Terminal
                            </span>
                          ) : (
                            <span className="bg-default-100 text-default-600 border border-divider/20 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                              Remote Link
                            </span>
                          )}
                        </div>

                        {/* Profile details */}
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary text-xs font-black flex items-center justify-center border border-primary/20 shrink-0">
                            {(session.fullName || '').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-black text-foreground truncate">{session.fullName}</h4>
                            <span className="text-[10px] text-default-500 uppercase font-black tracking-wider">{session.role}</span>
                          </div>
                        </div>

                        {/* Detailed specifications */}
                        <div className="space-y-2 text-xs border-t border-divider/15 pt-3">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-default-500 font-medium">Username:</span>
                            <span className="text-foreground font-bold">@{session.username}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-default-500 font-medium">Session ID:</span>
                            <span className="text-primary font-mono font-bold bg-primary/5 px-2 py-0.5 rounded border border-primary/10 text-[10px]">
                              {session.id.slice(0, 14)}...
                            </span>
                          </div>
                          {session.fingerprint && (
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-default-500 font-medium flex items-center gap-1">
                                <Fingerprint className="h-3 w-3 text-indigo-500" />
                                <span>Fingerprint:</span>
                              </span>
                              <span className="font-mono font-semibold text-foreground text-[10px] bg-content2 px-1.5 py-0.5 rounded" title={session.fingerprint}>
                                {session.fingerprint.slice(0, 12)}...
                              </span>
                            </div>
                          )}
                          {session.hardwareKey && (
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-default-500 font-medium flex items-center gap-1">
                                <KeyRound className="h-3 w-3 text-amber-500" />
                                <span>Hardware Key:</span>
                              </span>
                              <span className="font-mono font-semibold text-foreground text-[10px] bg-content2 px-1.5 py-0.5 rounded" title={session.hardwareKey}>
                                {session.hardwareKey.slice(0, 12)}...
                              </span>
                            </div>
                          )}
                          {session.ip && (
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-default-500 font-medium">IP Address:</span>
                              <span className="font-mono font-semibold text-foreground text-[10px]">
                                {session.ip}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-default-500 font-medium">Branch:</span>
                            <span className="font-bold flex items-center gap-1 text-foreground">
                              <MapPin className="h-3 w-3 text-primary" />
                              {getBranchName(session.branchId)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-default-500 font-medium">Device:</span>
                            <span className="font-medium text-default-600 max-w-[150px] truncate flex items-center gap-1" title={session.userAgent}>
                              {getDeviceIcon(session.userAgent)}
                              {getDeviceDescription(session.userAgent)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-default-500 font-medium">Last Contact:</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {getRelativeTime(session.lastActive)}
                            </span>
                          </div>
                          {isCurrent && sessionExpiresAt && (
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-default-500 font-medium">Session Expires:</span>
                              <span className="font-mono font-medium text-foreground text-[10.5px]">
                                {new Date(sessionExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions panel */}
                      <div className="border-t border-divider/20 pt-3 mt-4 flex flex-col gap-2">
                        {isCurrent ? (
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[11px] text-default-500 font-medium flex items-center gap-1">
                              <Clock className="h-3 w-3 text-primary" />
                              <span>{Math.floor(sessionRemainingSeconds / 60)}m left</span>
                            </div>
                            <button
                              type="button"
                              onClick={handleExtendCurrentSession}
                              disabled={extendingSession}
                              className="px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
                              title="Extend corporate session duration by 60 minutes"
                            >
                              {extendingSession ? "Extending..." : "+60m Extend"}
                            </button>
                          </div>
                        ) : (isUserAdmin || (currentUser?.role === UserRole.MANAGER && users.find(u => u.username === session.username)?.branchAssignmentId === userBranchId)) ? (
                          <button
                            type="button"
                            onClick={() => handleTerminateRemote(session.id, session.fullName)}
                            className="w-full py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white border border-rose-500/25 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors active:scale-95"
                            title="Terminate remote session and force sign-out"
                          >
                            <PowerOff className="h-3.5 w-3.5" /> Terminate Remote Session
                          </button>
                        ) : null}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <TablePagination
                currentPage={currentPage}
                totalItems={allowedActiveSessions.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                itemName="terminals"
              />
            </div>
          )}
        </div>
      )}

      {/* MODAL: Add / Edit User profile form */}
      <HeroModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        size="md"
        zIndex={50}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
          <HeroModal.Header className="pb-3.5 border-b border-divider/20">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-foreground">
                  {isEditMode ? 'Modify Employee Profile' : 'Enlist New Corporate Employee'}
                </h3>
                <p className="text-[10.5px] text-default-500 font-medium">Configure credentials, station branch, and security parameters</p>
              </div>
            </div>
          </HeroModal.Header>

          <HeroModal.Body className="py-4 space-y-3.5 text-left">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-primary uppercase tracking-wider">Full Display Name</label>
              <input
                type="text"
                required
                value={fullName ?? ''}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Maria Santos"
                className="w-full bg-background border border-divider/40 focus:border-primary px-3.5 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-xl font-semibold active:scale-[0.98]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-primary uppercase tracking-wider">Terminal Username Handle</label>
              <input
                type="text"
                required
                value={username ?? ''}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. msantos"
                className="w-full bg-background border border-divider/40 focus:border-primary px-3.5 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-xl font-semibold active:scale-[0.98]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-primary uppercase tracking-wider">Corporate Email Address</label>
              <input
                type="email"
                required
                value={email ?? ''}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. msantos@tilepoint.corp"
                className="w-full bg-background border border-divider/40 focus:border-primary px-3.5 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-xl font-semibold active:scale-[0.98]"
              />
            </div>

            <div className="space-y-1">
              <HeroSelect
                label="Operational Role Designation"
                value={role ?? ''}
                onValueChange={val => setRole(val as UserRole)}
                radius="md"
                items={[
                  ...(isUserAdmin ? [
                    { key: UserRole.ADMIN, value: UserRole.ADMIN, label: 'Admin - Full Corporate Enterprise Access' },
                    { key: UserRole.MANAGER, value: UserRole.MANAGER, label: 'Manager - Branch Station Supervisor' },
                  ] : []),
                  { key: UserRole.CASHIER, value: UserRole.CASHIER, label: 'Cashier - POS Sales & Till Cash Register' },
                  { key: UserRole.STAFF, value: UserRole.STAFF, label: 'Staff - Logistics & Warehouse Checker' },
                ]}
              />
            </div>

            {(role === UserRole.ADMIN || role === UserRole.MANAGER) && (
              <div className="space-y-1 bg-amber-500/5 p-3 rounded-xl border border-amber-500/20">
                <label className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <KeyRound className="h-3 w-3" /> Security Authorization PIN Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={managerPin ?? ''}
                  onChange={e => setManagerPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 4 to 6 digit PIN (e.g. 4321)"
                  className="w-full bg-background border border-amber-500/40 focus:border-amber-500 px-3.5 py-2 text-xs text-foreground font-mono font-bold focus:outline-none transition-colors rounded-xl active:scale-[0.98]"
                />
                <span className="text-[9.5px] text-default-400 block pt-0.5">
                  Used to authorize cashier voids, high-value discounts, and stock reconciliations.
                </span>
              </div>
            )}

            <div className="space-y-1">
              <HeroSelect
                label="Branch Station Assignment"
                value={branchAssignmentId ?? ''}
                onValueChange={val => setBranchAssignmentId(val)}
                radius="md"
                items={branches.filter(b => isUserAdmin || b.id === userBranchId).map(b => ({
                  key: b.id,
                  value: b.id,
                  label: getBranchOptionLabel(b),
                }))}
              />
            </div>
          </HeroModal.Body>

          <HeroModal.Footer className="justify-end gap-2 pt-3 pb-4 border-t border-divider/20">
            <HeroButton
              type="button"
              variant="flat"
              size="sm"
              onClick={() => setShowModal(false)}
              className="font-bold text-xs"
            >
              Cancel
            </HeroButton>
            <HeroButton
              type="submit"
              color="primary"
              variant="solid"
              size="sm"
              className="font-bold text-xs uppercase tracking-wider"
            >
              {isEditMode ? 'Save Changes' : 'Register Employee'}
            </HeroButton>
          </HeroModal.Footer>
        </form>
      </HeroModal>

      {/* Inline non-blocking success toast alert bar */}
      <ToastNotification
        message={toastMessage}
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
};
