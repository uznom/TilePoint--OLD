/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
AlertTriangle,
Building2,
ChevronDown,
ChevronUp,
Clock,
CreditCard,
Edit2,
FileText,
Image,
MapPin,
Phone,
Plus,
Receipt,
ShieldCheck,
Sparkles,
Trash2,
TrendingUp,
Upload,
UserCheck,
UserPlus,
Users,
X
} from 'lucide-react';
import { AnimatePresence,motion } from 'motion/react';
import React,{ useEffect,useState } from 'react';
import { useDb } from '../context/DbContext';
import { Branch,UserRole } from '../types/db';
import { useReceiptFontSize } from './ReceiptFontSizeControl';
import { TablePagination,useResponsivePageSize } from './TablePagination';
import { ToastNotification } from './ToastNotification';

import { formatTin } from '../utils/formatters';
import { HeroModal } from './common/ui/HeroModal';
import { HeroTable } from './common/ui/HeroTable';
import { HeroButton } from './common/ui/HeroButton';
import { HeroChip } from './common/ui/HeroChip';
import { HeroSelect } from './common/ui/HeroSelect';
import { HeaderBar } from './common/HeaderBar';
import { useMultiSort } from '../hooks/useMultiSort';
import { MultiSortBadgeBar } from './common/ui/MultiSortBadgeBar';
import { User } from '../types/db';


interface BranchModuleProps {
  darkMode?: boolean;
}

export const BranchModule: React.FC<BranchModuleProps> = ({ darkMode: _darkMode }) => {
  const {
    branches,
    createBranch,
    updateBranch,
    deleteBranch,
    currentUser,
    users,
    createUser,
    updateUser,
    sales,
    productReturns
  } = useDb();

  const primaryBranchId = localStorage.getItem("tilepoint_primary_branch_id") || "B1";
  const isBranchDeleted = (b: Branch) => {
    if (!b) return true;
    const val = (b as any).isDeleted;
    return val === true || val === 1 || val === "true" || val === "1";
  };

  const isUserAdmin = currentUser?.role === UserRole.ADMIN || String(currentUser?.role).toLowerCase() === 'admin';
  const isUserManager = currentUser?.role === UserRole.MANAGER || String(currentUser?.role).toLowerCase() === 'manager';
  const isUserAdminOrManager = isUserAdmin || isUserManager;

  // Only Admin accounts get corporate-wide access across all branches
  
  const userBranchId = currentUser?.branchAssignmentId || primaryBranchId;

  const activeBranches = branches.filter((b) => !isBranchDeleted(b));

  // Managers and Employees cannot see or access any other branch except their assigned branch
  const visibleBranches = activeBranches.filter((b) => {
    if (isUserAdmin) return true;
    return b.id === userBranchId || b.id === currentUser?.branchAssignmentId;
  });

  const getDynamicBranchManager = (branchId: string) => {
    const assigned = users.filter(u => u.branchAssignmentId === branchId && u.status === 'Active');
    const managers = assigned.filter(u => u.role === UserRole.MANAGER || (u.role as string) === 'Manager');
    if (managers.length > 0) {
      return managers.map(m => m.fullName).join(', ');
    }
    const admins = assigned.filter(u => u.role === UserRole.ADMIN || (u.role as string) === 'Admin');
    if (admins.length > 0) {
      return `${admins.map(a => a.fullName).join(', ')} (Admin)`;
    }
    return 'Unassigned';
  };

  const getBranchMonthlySales = (branchId: string) => {
    if (!sales || sales.length === 0) return 0;
    const now = new Date();
    const currYear = now.getFullYear();
    const currMonth = now.getMonth();

    const grossSales = sales
      .filter(s => {
        if (s.branchId !== branchId || s.isDeleted) return false;
        if (!s.createdAt) return false;
        const d = new Date(s.createdAt);
        if (isNaN(d.getTime())) return false;
        return d.getFullYear() === currYear && d.getMonth() === currMonth;
      })
      .reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);

    const branchSaleIds = new Set(sales.filter(s => s.branchId === branchId && !s.isDeleted).map(s => s.id));

    const totalReturns = (productReturns || [])
      .filter(r => {
        if (r.isDeleted) return false;
        if (!branchSaleIds.has(r.saleId)) return false;
        const rDate = r.dateTime ? new Date(r.dateTime) : null;
        if (!rDate || isNaN(rDate.getTime())) return false;
        return rDate.getFullYear() === currYear && rDate.getMonth() === currMonth;
      })
      .reduce((sum, r) => sum + (Number(r.amountRefunded) || 0), 0);

    return Math.max(0, grossSales - totalReturns);
  };

  // Create Modal settings
  const { fontClass: receiptFontClass } = useReceiptFontSize();
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState('');

  // Form Fields State
  const [customBranchId, setCustomBranchId] = useState('');
  const [storeLogo, setStoreLogo] = useState('');
  const [receiptFacebook, setReceiptFacebook] = useState('');
  const [receiptPromoText, setReceiptPromoText] = useState('');
  const [receiptQrBase64, setReceiptQrBase64] = useState('');
  const [receiptThankYou, setReceiptThankYou] = useState('');
  const [receiptReturnPolicy, setReceiptReturnPolicy] = useState('');
  const [receiptNonReturnablePolicy, setReceiptNonReturnablePolicy] = useState('');
  const [tin, setTin] = useState('');
  const [name, setName] = useState('');
  const [manager, setManager] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [monthlySales, setMonthlySales] = useState(500000);
  const [staffCount, setStaffCount] = useState(5);
  const [activeCashiers, setActiveCashiers] = useState(1);
  const [isDistributionBranch, setIsDistributionBranch] = useState(false);
  const [branchCode, setBranchCode] = useState('');
  const [localIp, setLocalIp] = useState('192.168.1.1');
  const [gatewayRules, setGatewayRules] = useState('ALLOW-LOCAL-ONLY');
  const [openingTime, setOpeningTime] = useState('08:00');
  const [closingTime, setClosingTime] = useState('18:00');
  const [operatingDays, setOperatingDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);

  // Employee Selection and Registration States
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [inlineStaffList, setInlineStaffList] = useState<any[]>([]);
  const [showAddInlineStaff, setShowAddInlineStaff] = useState(false);
  const [inlineFullName, setInlineFullName] = useState('');
  const [inlineUsername, setInlineUsername] = useState('');
  const [inlineEmail, setInlineEmail] = useState('');
  const [inlineRole, setInlineRole] = useState<UserRole>(UserRole.CASHIER);
  const [inlinePin, setInlinePin] = useState('');

  // Advanced collapsible network options
    const [expandedNetwork, setExpandedNetwork] = useState<Record<string, boolean>>({});

  const toggleNetworkSettings = (branchId: string) => {
    setExpandedNetwork(prev => ({ ...prev, [branchId]: !prev[branchId] }));
  };

  // Inline Receipt Editor States
  const [inlineBranchId, setInlineBranchId] = useState('');
  const [inlineFacebook, setInlineFacebook] = useState('');
  const [inlinePromoText, setInlinePromoText] = useState('');
  const [inlineThankYou, setInlineThankYou] = useState('');
  const [inlineReturnPolicy, setInlineReturnPolicy] = useState('');
  const [inlineNonReturnablePolicy, setInlineNonReturnablePolicy] = useState('');
  const [inlineQrBase64, setInlineQrBase64] = useState('');
  const [inlineTin, setInlineTin] = useState('');
  const [inlineStoreLogo, setInlineStoreLogo] = useState('');
  
  // Direct Enlist Employee Modal State
  const [showEnlistModal, setShowEnlistModal] = useState(false);
  const [enlistFullName, setEnlistFullName] = useState('');
  const [enlistUsername, setEnlistUsername] = useState('');
  const [enlistEmail, setEnlistEmail] = useState('');
  const [enlistRole, setEnlistRole] = useState<UserRole>(UserRole.CASHIER);
  const [enlistPin, setEnlistPin] = useState('');
  const [enlistBranchId, setEnlistBranchId] = useState<string>('B1');

  const handleOpenEnlistEmployee = (targetBranchId?: string) => {
    setEnlistFullName('');
    setEnlistUsername('');
    setEnlistEmail('');
    setEnlistRole(UserRole.CASHIER);
    setEnlistPin('');
    setEnlistBranchId(targetBranchId || (isUserAdmin ? branches[0]?.id || 'B1' : userBranchId));
    setShowEnlistModal(true);
  };

  const handleEnlistEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enlistFullName.trim() || !enlistUsername.trim()) {
      showToast('Please provide employee full name and username.');
      return;
    }
    if (!isUserAdmin && currentUser?.role !== UserRole.MANAGER) {
      showToast('Permission Denied: Corporate staff administration is restricted.');
      return;
    }
    if (!isUserAdmin && enlistBranchId !== userBranchId) {
      showToast('Permission Denied: You can only enlist staff to your own branch.');
      return;
    }
    if (!isUserAdmin && enlistRole !== UserRole.CASHIER && enlistRole !== UserRole.STAFF) {
      showToast('Permission Denied: Managers can only enlist Cashier and Staff employees.');
      return;
    }
    if ((enlistRole === UserRole.ADMIN || enlistRole === UserRole.MANAGER) && (!enlistPin || enlistPin.length < 4)) {
      showToast('A 4-6 digit numeric security PIN is required for Manager/Admin roles.');
      return;
    }

    const initials = enlistFullName.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    await createUser({
      fullName: enlistFullName.trim(),
      username: enlistUsername.trim().toLowerCase(),
      email: enlistEmail.trim() || (enlistUsername.trim().toLowerCase() + '@tilepoint.com'),
      role: enlistRole,
      branchAssignmentId: enlistBranchId,
      status: 'Active',
      managerPin: (enlistRole === UserRole.ADMIN || enlistRole === UserRole.MANAGER) ? enlistPin : undefined,
      avatarInitials: initials || 'TP',
      isNew: true,
    });

    const targetBranchObj = branches.find(b => b.id === enlistBranchId);
    showToast('Successfully enlisted ' + enlistFullName.trim() + ' to ' + (targetBranchObj ? targetBranchObj.name : enlistBranchId) + '.');
    setShowEnlistModal(false);
  };
  const [inlineLogoSize, setInlineLogoSize] = useState(40);

  const activeBranchesForReceipt = visibleBranches;
  const selectedBranchForPreview = branches.find(b => b.id === inlineBranchId);
  useEffect(() => {
    if (activeBranchesForReceipt.length > 0) {
      if (!inlineBranchId || !activeBranchesForReceipt.some(b => b.id === inlineBranchId)) {
        const initialBranch = activeBranchesForReceipt.find(b => b.id === currentUser?.branchAssignmentId) || activeBranchesForReceipt.find(b => b.id === primaryBranchId) || activeBranchesForReceipt[0];
        if (initialBranch) {
          setInlineBranchId(initialBranch.id);
        }
      }
    }
  }, [activeBranchesForReceipt, inlineBranchId, currentUser?.branchAssignmentId, primaryBranchId]);

  useEffect(() => {
    const selectedBranch = branches.find(b => b.id === inlineBranchId);
    if (selectedBranch) {
      setInlineFacebook(selectedBranch.receiptFacebook || '');
      setInlinePromoText(selectedBranch.receiptPromoText || '');
      setInlineThankYou(selectedBranch.receiptThankYou || '');
      setInlineReturnPolicy(selectedBranch.receiptReturnPolicy || '');
      setInlineNonReturnablePolicy(selectedBranch.receiptNonReturnablePolicy || '');
      setInlineQrBase64(selectedBranch.receiptQrBase64 || '');
      setInlineTin(formatTin(selectedBranch.tin || ''));
      setInlineStoreLogo(selectedBranch.storeLogo || '');
      setInlineLogoSize(selectedBranch.logoSize || Number(localStorage.getItem('tilepoint_receipt_logo_size_v1') || '40'));
    }
  }, [inlineBranchId, branches]);

  const handleSaveInlineReceiptSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineBranchId) return;
    updateBranch(inlineBranchId, {
      receiptFacebook: inlineFacebook,
      receiptPromoText: inlinePromoText,
      receiptThankYou: inlineThankYou,
      receiptReturnPolicy: inlineReturnPolicy,
      receiptNonReturnablePolicy: inlineNonReturnablePolicy,
      receiptQrBase64: inlineQrBase64,
      tin: inlineTin,
      storeLogo: inlineStoreLogo,
      logoSize: inlineLogoSize
    });
    showToast("Receipt settings saved successfully for this branch!");
  };

 // Custom states for employees visibility
 const [expandedBranchUsers, setExpandedBranchUsers] = useState<Record<string, boolean>>({});
 const [showAllPersonnel, setShowAllPersonnel] = useState(false);
 const [personnelSearch, setPersonnelSearch] = useState('');

 // Custom visual popups and toasts (Strictly avoiding iframe-blocking alert/confirm)
 const [toastMessage, setToastMessage] = useState<string | null>(null);
 const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
 const [confirmDeleteName, setConfirmDeleteName] = useState<string>('');



 // Pagination states
 const [branchPage, setBranchPage] = useState(1);
 const [personnelPage, setPersonnelPage] = useState(1);
 const [, setThemeTick] = useState(0);

 // Sync state and re-render on user theme change
 useEffect(() => {
 const handleSync = () => setThemeTick((t) => t + 1);
 window.addEventListener("tilepoint-theme-updated", handleSync);
 return () => window.removeEventListener("tilepoint-theme-updated", handleSync);
 }, []);

 const branchPageSize = useResponsivePageSize(240, 420, 4); // each branch card is tall
 const personnelPageSize = useResponsivePageSize(48, 550, 8); // each table row is standard 48px height

 // Reset personnel page when search changes
 useEffect(() => {
 setPersonnelPage(1);
 }, [personnelSearch]);

  // Multi-column sorting for corporate directory
  const {
    sortDescriptors: personnelSortDescriptors,
    handleSort: handlePersonnelSort,
    getSortDirection: getPersonnelSortDir,
    getSortRank: getPersonnelSortRank,
    removeSort: removePersonnelSort,
    clearSort: clearPersonnelSort,
    sortData: sortPersonnelData
  } = useMultiSort<User>({
    customGetters: {
      fullName: (u) => u.fullName || '',
      role: (u) => u.role || '',
      branchAssignmentId: (u) => {
        const b = branches.find(br => br.id === u.branchAssignmentId);
        return b ? b.name : 'Central Network';
      },
      email: (u) => u.email || '',
    }
  });

  const filteredPersonnel = React.useMemo(() => {
    const list = users.filter(u => {
      if (!personnelSearch) return true;
      const term = personnelSearch.toLowerCase();
      return (
        (u.fullName || '').toLowerCase().includes(term) ||
        (u.role || '').toLowerCase().includes(term) ||
        (u.email || '').toLowerCase().includes(term) ||
        (u.username || '').toLowerCase().includes(term)
      );
    });

    if (personnelSortDescriptors.length > 0) {
      return sortPersonnelData(list);
    }
    return list;
  }, [users, personnelSearch, personnelSortDescriptors, sortPersonnelData]);

 const toggleBranchUsers = (branchId: string) => {
 setExpandedBranchUsers(prev => ({
 ...prev,
 [branchId]: !prev[branchId]
 }));
 };

 const showToast = (message: string) => {
 setToastMessage(message);
 setTimeout(() => {
 setToastMessage(null);
 }, 4000);
 };

 const handleOpenAdd = () => {
  setCustomBranchId('');
  setStoreLogo('');
  setReceiptFacebook('');
  setReceiptPromoText('');
  setReceiptQrBase64('');
  setReceiptThankYou('');
  setReceiptReturnPolicy('');
  setReceiptNonReturnablePolicy('');
  setTin('');
  setName('');
  setManager('');
  setAddress('');
  setPhone('');
  setMonthlySales(450000);
  setStaffCount(5);
  setActiveCashiers(1);
  setIsDistributionBranch(false);
  setBranchCode('');
  setLocalIp('192.168.1.1');
  setGatewayRules('ALLOW-LOCAL-ONLY');
  setOpeningTime('08:00');
  setClosingTime('18:00');
  setOperatingDays(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);

  setSelectedEmployeeIds([]);
  setInlineStaffList([]);
  setShowAddInlineStaff(false);
  setInlineFullName('');
  setInlineUsername('');
  setInlineEmail('');
  setInlineRole(UserRole.CASHIER);
  setInlinePin('');

  setIsEditMode(false);
  setShowModal(true);
 };

 const handleOpenEdit = (b: Branch) => {
  setEditingId(b.id);
  setCustomBranchId(b.id);
  setStoreLogo(b.storeLogo || '');
  setReceiptFacebook(b.receiptFacebook || '');
  setReceiptPromoText(b.receiptPromoText || '');
  setReceiptQrBase64(b.receiptQrBase64 || '');
  setReceiptThankYou(b.receiptThankYou || '');
  setReceiptReturnPolicy(b.receiptReturnPolicy || '');
  setReceiptNonReturnablePolicy(b.receiptNonReturnablePolicy || '');
  setTin(formatTin(b.tin || ''));
  setName(b.name);
  setManager(b.manager);
  setAddress(b.address);
  setPhone(b.phone);
  setMonthlySales(b.monthlySales);
  setStaffCount(b.staffCount);
  setActiveCashiers(b.activeCashiers);
  setIsDistributionBranch(b.isDistributionBranch || false);
  setBranchCode(b.branchCode || '');
  setLocalIp(b.localIp || '192.168.1.1');
  setGatewayRules(b.gatewayRules || 'ALLOW-LOCAL-ONLY');
  setOpeningTime(b.openingTime || '08:00');
  setClosingTime(b.closingTime || '18:00');
  setOperatingDays(b.operatingDays || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);

  setSelectedEmployeeIds(users.filter(u => u.branchAssignmentId === b.id).map(u => u.id));
  setInlineStaffList([]);
  setShowAddInlineStaff(false);
  setInlineFullName('');
  setInlineUsername('');
  setInlineEmail('');
  setInlineRole(UserRole.CASHIER);
  setInlinePin('');

  setIsEditMode(true);
  setShowModal(true);
 };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isUserAdmin) {
      showToast('Permission Denied: Branch modifications are restricted to Admins.');
      return;
    }

    // Validate Branch Code
    const trimmedCode = branchCode.trim().toUpperCase();
    if (trimmedCode && !/^[A-Z0-9_-]{3,15}$/.test(trimmedCode)) {
      showToast('Validation Error: Branch Code must be 3-15 characters (A-Z, 0-9, _, -).');
      return;
    }

    // Validate Local IP
    const trimmedIp = localIp.trim();
    const ipRegex = /^(127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/;
    if (trimmedIp && !ipRegex.test(trimmedIp)) {
      showToast('Validation Error: Must be a valid local private IPv4 address (e.g., 192.168.1.50).');
      return;
    }

    const trimmedCustomId = customBranchId.trim();
    if (trimmedCustomId) {
      if (!isEditMode) {
        const exists = branches.some(b => (b?.id || '').toLowerCase() === trimmedCustomId.toLowerCase());
        if (exists) {
          showToast(`Validation Error: A branch with ID "${trimmedCustomId}" already exists.`);
          return;
        }
      } else if (trimmedCustomId.toLowerCase() !== (editingId || '').toLowerCase()) {
        const exists = branches.some(b => (b?.id || '').toLowerCase() === trimmedCustomId.toLowerCase());
        if (exists) {
          showToast(`Validation Error: A branch with ID "${trimmedCustomId}" already exists.`);
          return;
        }
      }
    }

    const finalBranchId = isEditMode ? editingId : (trimmedCustomId || 'B-' + Date.now());

    const payload = {
      name,
      manager,
      address,
      phone,
      monthlySales: Number(monthlySales),
      staffCount: Number(staffCount),
      activeCashiers: Number(activeCashiers),
      isDistributionBranch,
      branchCode: trimmedCode,
      localIp: trimmedIp,
      gatewayRules: gatewayRules.trim(),
      storeLogo,
      receiptFacebook,
      receiptPromoText,
      receiptQrBase64,
      receiptThankYou,
      receiptReturnPolicy,
      receiptNonReturnablePolicy,
      tin,
      openingTime,
      closingTime,
      operatingDays,
      id: finalBranchId
    };

    if (isEditMode) {
      updateBranch(editingId, payload);

      // 1. Unassign anyone who was previously assigned to this branch but is no longer selected
      const previouslyAssigned = users.filter(u => u.branchAssignmentId === finalBranchId);
      previouslyAssigned.forEach(u => {
        if (!selectedEmployeeIds.includes(u.id)) {
          updateUser(u.id, { branchAssignmentId: primaryBranchId || branches.find(b => !b.isDeleted && b.id !== finalBranchId)?.id || '' });
        }
      });

      // 2. Assign anyone who is currently selected
      selectedEmployeeIds.forEach(uId => {
        const u = users.find(x => x.id === uId);
        if (u && u.branchAssignmentId !== finalBranchId) {
          updateUser(uId, { branchAssignmentId: finalBranchId });
        }
      });

      // 3. Register newly added inline staff
      inlineStaffList.forEach(s => {
        createUser({
          fullName: s.fullName,
          username: s.username,
          email: s.email,
          role: s.role,
          managerPin: s.managerPin,
          avatarInitials: s.avatarInitials,
          branchAssignmentId: finalBranchId,
          status: 'Active',
          isNew: true
        });
      });

      showToast(`Updated records for branch '${name}'.`);
    } else {
      createBranch(payload);

      // Assign checked employees
      selectedEmployeeIds.forEach(uId => {
        updateUser(uId, { branchAssignmentId: finalBranchId });
      });

      // Register newly added inline staff
      inlineStaffList.forEach(s => {
        createUser({
          fullName: s.fullName,
          username: s.username,
          email: s.email,
          role: s.role,
          managerPin: s.managerPin,
          avatarInitials: s.avatarInitials,
          branchAssignmentId: finalBranchId,
          status: 'Active',
          isNew: true
        });
      });

      showToast(`Launched new branch location '${name}'.`);
    }
    setShowModal(false);
  };

  const triggerDelete = (id: string, branchName: string) => {
    if (!isUserAdmin) {
      showToast('Permission Denied: Branch deletion is restricted to Admins.');
      return;
    }
    if (activeBranches.length <= 1) {
      showToast('Violation Blocked: At least one active branch must remain in the system to maintain inventory and transactional ledger continuity.');
      return;
    }
    if (id === primaryBranchId) {
      showToast('Violation Blocked: Deleting the primary Main Branch (HQ) is restricted to maintain transactional ledger continuity.');
      return;
    }
    setConfirmDeleteId(id);
    setConfirmDeleteName(branchName);
  };

  const proceedWithDelete = () => {
    if (confirmDeleteId) {
      if (activeBranches.length <= 1) {
        showToast('Violation Blocked: Cannot delete the only remaining active branch.');
        setConfirmDeleteId(null);
        return;
      }
      deleteBranch(confirmDeleteId);
      showToast(`Archived and soft-deleted branch '${confirmDeleteName}'.`);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-foreground pb-20 md:pb-16">
      {/* Action Header */}
      <HeaderBar
        title="Store Chains & Branches"
        subtitle="Manage physical locations, regional hubs, employee rosters, and hardware gateway bindings."
        icon={Building2}
        badge={{ text: `${branches.length} Outlets`, variant: 'primary' }}
        actions={
          isUserAdmin ? (
            <HeroButton
              onClick={handleOpenAdd}
              color="primary"
              variant="solid"
              size="md"
              startContent={<Plus className="h-4 w-4" />}
            >
              Launch Branch
            </HeroButton>
          ) : undefined
        }
      />

      {/* Grid display of branches */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {visibleBranches
            .slice((branchPage - 1) * branchPageSize, branchPage * branchPageSize)
            .map((b) => {
              const branchEmployees = users.filter((u) => u.branchAssignmentId === b.id);
              const isExpanded = !!expandedBranchUsers[b.id];
              const isLastActiveBranch = activeBranches.length <= 1;
              const isPrimaryBranch = b.id === primaryBranchId;
              const isDeleteForbidden = isLastActiveBranch || isPrimaryBranch;
              return (
                <div
                  key={b.id}
                  className="bg-content1 border border-divider/30 rounded-2xl shadow-sm hover:shadow-md hover:border-primary/40 text-foreground transition-all duration-200 relative overflow-hidden flex flex-col justify-between p-5 space-y-4"
                >
                  {/* Top outline band */}
                  <div className="flex items-start justify-between border-b border-divider/15 pb-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-xl border border-divider/20 overflow-hidden bg-content2 flex items-center justify-center shrink-0">
                        {b.storeLogo ? (
                          <img src={b.storeLogo} alt="Logo" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          <Building2 className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-extrabold text-foreground leading-tight truncate">
                            {b.name}
                          </h4>
                          {b.id === primaryBranchId && (
                            <HeroChip variant="warning" size="sm">
                              Main HQ
                            </HeroChip>
                          )}
                          {(b.id === primaryBranchId || b.isDistributionBranch) && (
                            <HeroChip variant="success" size="sm">
                              Hub
                            </HeroChip>
                          )}
                        </div>
                        <p className="text-[10px] text-default-500 font-mono font-bold mt-0.5">ID: {b.id}</p>
                      </div>
                    </div>

                    {isUserAdmin && (
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          onClick={() => handleOpenEdit(b)}
                          className="p-1.5 rounded-lg hover:bg-content2 text-primary cursor-pointer transition-colors"
                          title="Edit Details"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {!isDeleteForbidden && (
                          <button
                            onClick={() => triggerDelete(b.id, b.name)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-default-400 hover:text-rose-500 cursor-pointer transition-colors"
                            title="Archive Outlet"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

      {/* Address and Contacts details layout */}
      <div className="space-y-2.5 text-xs">
        <div className="flex items-center gap-2 text-default-500 leading-normal">
          <UserCheck className="h-4 w-4 shrink-0 text-secondary" />
          <span>Manager: <strong className="font-bold text-foreground">{getDynamicBranchManager(b.id)}</strong></span>
        </div>

        <div className="flex items-start gap-2 text-default-500 leading-normal">
          <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
          <span className="truncate">{b.address || 'Address pending'}</span>
        </div>

        <div className="flex items-center gap-2 text-default-500 leading-normal">
          <Phone className="h-4 w-4 shrink-0 text-secondary" />
          <span>Phone: <strong className="text-foreground">{b.phone || '—'}</strong></span>
        </div>

        <div className="flex items-center gap-2 text-default-500 leading-normal">
          <CreditCard className="h-4 w-4 shrink-0 text-primary" />
          <span>TIN: <strong className="text-foreground">{formatTin(b.tin) || '—'}</strong></span>
        </div>
      </div>

      {/* Secure network variables & collapsible Advanced settings */}
      <div className="text-left">
        <button
          type="button"
          onClick={() => toggleNetworkSettings(b.id)}
          className="flex items-center justify-between w-full px-3 py-2 bg-content2/50 hover:bg-content2 rounded-xl border border-divider/10 text-[11px] font-bold text-default-600 transition-all cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span>Network & Security Settings</span>
          </span>
          <span className="text-[9px] font-bold text-primary">
            {expandedNetwork[b.id] ? 'COLLAPSE' : 'SHOW DETAILS'}
          </span>
        </button>
        
        {expandedNetwork[b.id] && (
          <div className="bg-content2/30 p-3 rounded-xl border border-divider/10 space-y-1.5 text-[11px] text-left mt-1.5 animate-fade-in">
            <div className="flex justify-between">
              <span className="text-default-400 font-bold">SECURE CODE:</span>
              <span className="text-primary font-black uppercase">{b.branchCode || 'PENDING'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-default-400 font-bold">IP BINDING:</span>
              <span className="text-foreground font-extrabold">{b.localIp || '192.168.1.1'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-default-400 font-bold">GATEWAY:</span>
              <span className="text-secondary font-black uppercase">{b.gatewayRules || 'ALLOW-LOCAL-ONLY'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Schedule & Timing parameters */}
      <div className="bg-content2/30 p-3 rounded-xl border border-divider/10 space-y-1.5 text-[11px] text-left">
        <div className="flex items-center gap-1.5 border-b border-divider/10 pb-1.5 mb-1 text-primary font-black uppercase tracking-wider">
          <Clock className="h-3.5 w-3.5 text-primary" />
          <span>Operating Hours & Days</span>
        </div>
        <div className="flex justify-between">
          <span className="text-default-400 font-bold">BUSINESS HOURS:</span>
          <span className="text-foreground font-extrabold">
            {b.openingTime || '08:00'} - {b.closingTime || '18:00'}
          </span>
        </div>
        <div className="flex justify-between flex-col gap-1">
          <span className="text-default-400 font-bold">OPERATING DAYS:</span>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {(b.operatingDays || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]).map((day) => (
              <span key={day} className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[9px] font-extrabold border border-primary/10">
                {day}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Collapsible Branch Employee Roster */}
      <div className="border border-divider/15 rounded-xl bg-content2/20 p-3 space-y-2">
        <button
          type="button"
          onClick={() => toggleBranchUsers(b.id)}
          className="w-full flex items-center justify-between text-xs font-black text-primary hover:text-primary/80 transition-all uppercase tracking-widest select-none cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span>Branch Employees ({branchEmployees.length})</span>
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-primary" />
          ) : (
            <ChevronDown className="h-4 w-4 text-primary" />
          )}
        </button>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden space-y-2 pt-2 border-t border-divider/10 max-h-[180px] overflow-y-auto pr-1"
            >
              {branchEmployees.length === 0 ? (
                <div className="text-[10px] text-default-400 italic py-1 text-center font-medium">
                  No active logins assigned to this branch.
                </div>
              ) : (
                branchEmployees.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-content1 border border-divider/10 hover:border-divider/20 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-[9px] font-black flex items-center justify-center shrink-0 border border-primary/15 shadow-inner">
                        {u.avatarInitials || (u.fullName ? u.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??')}
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-foreground truncate leading-tight">
                          {u.fullName}
                        </span>
                        <span className="block text-[9.5px] text-default-400 truncate leading-none mt-0.5">
                          {u.email || `@${u.username}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-1 pl-1">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border leading-none ${
                        u.role === UserRole.ADMIN 
                          ? 'bg-primary/10 text-primary border-primary/20'
                          : u.role === UserRole.MANAGER
                          ? 'bg-primary/10 text-primary border-primary/15'
                          : u.role === UserRole.CASHIER
                          ? 'bg-secondary/10 text-secondary border-secondary/20'
                          : 'bg-default-100 text-default-600 border-divider/20'
                      }`}>
                        {u.role}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {(isUserAdmin || (currentUser?.role === UserRole.MANAGER && b.id === userBranchId)) && (
          <button
            type="button"
            onClick={() => handleOpenEnlistEmployee(b.id)}
            className="w-full mt-1 py-1.5 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Enlist Staff to {b.name}</span>
          </button>
        )}
      </div>

      {/* Calculations KPI footer metrics layout */}
      <div className="grid grid-cols-3 gap-2 bg-content2/40 border-t border-divider/15 p-3 rounded-xl">
        <div className="space-y-0.5 text-center">
          <span className="text-[9px] uppercase tracking-widest font-bold text-default-500">Staff roster</span>
          <div className="text-xs font-bold flex items-center justify-center gap-1 text-foreground">
            <Users className="h-3.5 w-3.5 text-primary/70" /> {branchEmployees.length}
          </div>
        </div>

        <div className="space-y-0.5 text-center">
          <span className="text-[9px] uppercase tracking-widest font-bold text-default-500">Cashiers</span>
          <div className="text-xs font-bold flex items-center justify-center gap-1 text-foreground">
            <CreditCard className="h-3.5 w-3.5 text-secondary/70" /> {branchEmployees.filter(u => u.role === UserRole.CASHIER).length || b.activeCashiers || 0}
          </div>
        </div>

        <div className="space-y-0.5 text-center">
          <span className="text-[9px] uppercase tracking-widest font-bold text-default-500">Sales (MO)</span>
          <div className="text-xs font-black text-secondary flex items-center justify-center gap-0.5">
            <TrendingUp className="h-3.5 w-3.5" /> ₱{getBranchMonthlySales(b.id).toLocaleString(undefined, { notation: 'compact' })}
          </div>
        </div>
      </div>
    </div>
  );
})}

 {visibleBranches.length === 0 && (
 <div className="col-span-full py-12 text-center text-default-500 font-medium">No corporate branches logged. Use the launch button above.</div>
 )}
 </div>

 <TablePagination
 currentPage={branchPage}
 totalItems={visibleBranches.length}
 pageSize={branchPageSize}
 onPageChange={setBranchPage}
 itemName="branches"
 />
 </div>

 {/* BRAND-WIDE RECEIPT CUSTOMIZER (INLINE & ACCESSIBLE) */}
 {isUserAdminOrManager && (
  <div className="bg-content1 border border-divider/20 rounded-2xl p-6 shadow-sm space-y-6">
 <div>
 <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 ">
 <Receipt className="h-4.5 w-4.5 text-primary" />
 Receipt & Promotional Customizer
 </h3>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
 {/* Left Column: Form */}
 <form onSubmit={handleSaveInlineReceiptSettings} className="lg:col-span-7 space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-1">
    <HeroSelect
      label="Select Branch to Configure"
      value={inlineBranchId ?? ''}
      onValueChange={(val) => setInlineBranchId(val)}
      radius="md"
      items={activeBranchesForReceipt.map((b) => ({
        key: b.id,
        value: b.id,
        label: `${b.name} (ID: ${b.id})`,
      }))}
    />
  </div>

 <div className="space-y-1">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">
 TIN (Taxpayer Identification Number)
 </label>
 <input
 type="text"
 value={inlineTin ?? ''}
 onChange={e => setInlineTin(formatTin(e.target.value))}
 placeholder="000-000-000-000"
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg "
 />
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">
 Facebook Page / Handle
 </label>
 <input
 type="text"
 value={inlineFacebook ?? ''}
 onChange={e => setInlineFacebook(e.target.value)}
 placeholder="Facebook handle"
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg font-sans"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">
 Custom Thank You Message
 </label>
 <input
 type="text"
 value={inlineThankYou ?? ''}
 onChange={e => setInlineThankYou(e.target.value)}
 placeholder="Thank you message"
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg font-sans"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">
 Return & Exchange Policy
 </label>
 <input
 type="text"
 value={inlineReturnPolicy ?? ''}
 onChange={e => setInlineReturnPolicy(e.target.value)}
 placeholder="e.g. 7 days return/exchange with receipt in original box"
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg font-sans"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">
 Non-Returnable Items Notice
 </label>
 <input
 type="text"
 value={inlineNonReturnablePolicy ?? ''}
 onChange={e => setInlineNonReturnablePolicy(e.target.value)}
 placeholder="e.g. Installed/cut tiles and altered items are non-returnable"
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg font-sans"
 />
 </div>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">
 Promotional Message (Appears at Bottom of Receipt)
 </label>
 <textarea
 value={inlinePromoText ?? ''}
 onChange={e => setInlinePromoText(e.target.value)}
 placeholder="Promotional message"
 rows={2}
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg font-sans resize-none"
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* BRANCH LOGO UPLOAD */}
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">
 Branch Logo (for Receipts)
 </label>
 <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-content1 p-4 rounded-2xl border border-divider/30">
 <div className="h-16 w-16 rounded-xl border border-divider/50 bg-content1 flex items-center justify-center overflow-hidden flex-shrink-0 relative shadow-inner">
 {inlineStoreLogo ? (
 <img
 src={inlineStoreLogo}
 alt="Inline Branch Logo"
 className="h-full w-full object-contain"
 referrerPolicy="no-referrer"
 />
 ) : (
 <Image className="h-5 w-5 text-default-500" />
 )}
 </div>
 <div className="flex-1 space-y-2">
 <p className="text-[10px] text-default-500 font-medium">Upload a custom PNG logo to print at the very top of thermal branch receipts. Format must be PNG.</p>
 <div className="flex gap-2">
 <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer transition-colors border border-primary/15 select-none">
 <Upload className="h-3.5 w-3.5" />
 <span>Upload PNG</span>
 <input
 type="file"
 accept="image/png"
 className="hidden"
 onChange={(e) => {
 const file = e.target.files?.[0];
 if (file) {
 if (file.type !== "image/png" && !file.name.toLowerCase().endsWith(".png")) {
 showToast("Error: Only PNG images (.png) are supported for receipt printing.");
 return;
 }
 if (file.size > 250 * 1024) {
 showToast("Size Warning: Please upload an image smaller than 250KB.");
 }
 const reader = new FileReader();
 reader.onload = (event) => {
 if (event.target?.result) {
 setInlineStoreLogo(event.target.result as string);
 showToast("Branch PNG logo loaded successfully!");
 }
 };
 reader.readAsDataURL(file);
 }
 }}
 />
 </label>
 {inlineStoreLogo && (
 <button
 type="button"
 onClick={() => {
 setInlineStoreLogo("");
 showToast("Branch logo removed from template.");
 }}
 className="px-3 py-1.5 border border-red-200/40 text-red-500 hover:bg-red-500/10 rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer transition-colors select-none"
 >
 Clear Logo
 </button>
 )}
 </div>

 {inlineStoreLogo && (
 <div className="pt-2.5 border-t border-divider/20 mt-1 space-y-1.5">
 <div className="flex justify-between items-center text-[9.5px]">
 <span className="font-bold text-default-500 uppercase tracking-wider">Logo Height on Receipt</span>
 <span className=" font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{inlineLogoSize}px</span>
 </div>
 <div className="flex items-center gap-2">
 <span className="text-[8.5px] text-default-500">20px</span>
 <input
 type="range"
 min="20"
 max="120"
 value={inlineLogoSize ?? ''}
 onChange={(e) => setInlineLogoSize(Number(e.target.value))}
 className="flex-1 accent-primary h-1 bg-zinc-200 dark:bg-content2 rounded-lg appearance-none cursor-pointer"
 />
 <span className="text-[8.5px] text-default-500">120px</span>
 </div>
 <p className="text-[8.5px] text-default-500 leading-tight">
 Height in pixels. Width scales proportionally to fit receipt rolls perfectly.
 </p>
 </div>
 )}
 </div>
 </div>
 </div>

 {/* SURVEY / PROMO QR CODE */}
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">
 Survey / Promo QR Code
 </label>
 <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-content1 p-4 rounded-2xl border border-divider/30">
 <div className="h-16 w-16 rounded-xl border border-divider/50 bg-content1 flex items-center justify-center overflow-hidden flex-shrink-0 relative shadow-inner">
 {inlineQrBase64 ? (
 <img
 src={inlineQrBase64}
 alt="Inline Survey QR"
 className="h-full w-full object-contain"
 referrerPolicy="no-referrer"
 />
 ) : (
 <Image className="h-5 w-5 text-default-500" />
 )}
 </div>
 <div className="flex-1 space-y-2">
 <p className="text-[10px] text-default-500 font-medium">Upload a QR code linking to your store evaluation page, customer survey, or loyalty discounts.</p>
 <div className="flex gap-2">
 <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer transition-colors border border-primary/15 select-none">
 <Upload className="h-3.5 w-3.5" />
 <span>Upload QR Image</span>
 <input
 type="file"
 accept="image/*"
 className="hidden"
 onChange={(e) => {
 const file = e.target.files?.[0];
 if (file) {
 if (file.size > 250 * 1024) {
 showToast("Size Warning: Please upload a QR code image smaller than 250KB.");
 }
 const reader = new FileReader();
 reader.onload = (event) => {
 if (event.target?.result) {
 setInlineQrBase64(event.target.result as string);
 showToast("QR Code loaded successfully!");
 }
 };
 reader.readAsDataURL(file);
 }
 }}
 />
 </label>
 {inlineQrBase64 && (
 <button
 type="button"
 onClick={() => {
 setInlineQrBase64("");
 showToast("QR Code template removed.");
 }}
 className="px-3 py-1.5 border border-red-200/40 text-red-500 hover:bg-red-500/10 rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer transition-colors select-none"
 >
 Clear QR
 </button>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* RECEIPT FONT SIZE CONTROL */}
 
 <div className="flex justify-end pt-2">
 <button
 type="submit"
 disabled={!inlineBranchId}
 className="bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 rounded-medium flex items-center gap-1.5 shadow-sm text-xs px-5 py-2 cursor-pointer disabled:opacity-50"
 >
 Save Receipt Template
 </button>
 </div>
 </form>

 {/* Right Column: Real-Time Receipt Preview */}
 <div className="lg:col-span-5 space-y-3">
 <div className="text-[10px] font-black text-primary uppercase tracking-widest pl-1 flex items-center gap-1.5">
 <Receipt className="h-3.5 w-3.5" />
 <span>Real-Time Receipt Preview</span>
 <span className="text-[8px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Live View</span>
 </div>

 {/* Thermal Receipt Virtual Box */}
 <div className={`relative mx-auto max-w-[280px] bg-white text-zinc-900 py-5 px-5 border border-zinc-200 rounded-2xl shadow-lg select-none overflow-hidden text-[9px] leading-relaxed bir-receipt-container ${receiptFontClass}`}>
 {/* Symmetrical paper top tears decoration */}
 <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-200 flex overflow-hidden opacity-40" style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 2px, #d4d4d8 2px, #d4d4d8 4px)" }}></div>

 <div className="pt-2 text-center flex flex-col items-center justify-center space-y-1">
 {inlineStoreLogo ? (
 <div 
 className="mb-1 w-auto flex items-center justify-center"
 style={{ height: `${inlineLogoSize}px` }}
 >
 <img
 src={inlineStoreLogo}
 alt="Branch Logo"
 className="h-full object-contain filter grayscale brightness-90 max-w-[120px]"
 referrerPolicy="no-referrer"
 />
 </div>
 ) : (
 <h4 className="text-[10.5px] font-black text-black tracking-widest uppercase mb-0.5">
 {selectedBranchForPreview?.name || branches[0]?.name || "MAIN STORE"}
 </h4>
 )}

 <div className="text-[7.5px] text-default-600 font-semibold mt-0.5 leading-tight">
 {selectedBranchForPreview?.address || branches[0]?.address || "Store Address"}
 </div>

 <div className="text-[7px] text-default-500 mt-0.5">
 Contact: {selectedBranchForPreview?.phone || "0000"} • TIN {formatTin(selectedBranchForPreview?.tin || inlineTin) || "N/A"}
 </div>
 </div>

 {/* Symmetrical dotted divider */}
 <div className="border-b border-dashed border-zinc-300 my-2.5"></div>

 {/* Transaction Metadata */}
 <div className="space-y-0.5 text-[7.5px] text-default-700">
 <div className="flex justify-between">
 <span>DATE & TIME:</span>
 <span>{new Date().toISOString().replace("T", " ").slice(0, 16)}</span>
 </div>
 <div className="flex justify-between font-bold text-black">
 <span>INVOICE REF:</span>
 <span>PREVIEW-9999</span>
 </div>
 <div className="flex justify-between">
 <span>CASHIER:</span>
 <span>Admin (Live Preview)</span>
 </div>
 <div className="flex justify-between">
 <span>BUYER:</span>
 <span className="font-bold text-black">Sample Builder / Client</span>
 </div>
 <div className="flex justify-between">
 <span>BUYER TIN:</span>
 <span className=" font-bold text-black">000-123-456-000</span>
 </div>
 </div>

 {/* Symmetrical dotted divider */}
 <div className="border-b border-dashed border-zinc-300 my-2.5"></div>

 {/* Items Table Header */}
 <div className="grid grid-cols-12 gap-1 text-[7px] font-bold text-zinc-800 uppercase pb-1 border-b border-dotted border-zinc-200">
 <span className="col-span-7">Item Description</span>
 <span className="col-span-2 text-right">Qty</span>
 <span className="col-span-3 text-right">Amount</span>
 </div>

 {/* Items List */}
 <div className="space-y-2 pt-1.5 text-[7.5px] text-zinc-800">
 <div>
 <div className="font-bold">Carrara White Polished (60x60)</div>
 <div className="grid grid-cols-12 gap-1">
 <span className="col-span-7 text-default-500">₱380.00 / pc</span>
 <span className="col-span-2 text-right">1</span>
 <span className="col-span-3 text-right">₱380.00</span>
 </div>
 </div>
 <div>
 <div className="font-bold">Spanish Clay Terracotta (30x30)</div>
 <div className="grid grid-cols-12 gap-1">
 <span className="col-span-7 text-default-500">₱120.00 / pc</span>
 <span className="col-span-2 text-right">2</span>
 <span className="col-span-3 text-right">₱240.00</span>
 </div>
 </div>
 </div>

 {/* Symmetrical dotted divider */}
 <div className="border-b border-dashed border-zinc-300 my-2.5"></div>

 {/* Financial Summary */}
 <div className="space-y-1 text-[7.5px] text-zinc-800 ">
 <div className="flex justify-between">
 <span>SUBTOTAL:</span>
 <span>₱620.00</span>
 </div>
 <div className="flex justify-between text-default-500 text-[7px]">
 <span>VATABLE SALES:</span>
 <span>₱553.57</span>
 </div>
 <div className="flex justify-between text-default-500 text-[7px]">
 <span>12% VAT:</span>
 <span>₱66.43</span>
 </div>
 <div className="flex justify-between font-bold text-[8.5px] border-t border-dotted border-zinc-200 pt-1 mt-0.5 text-black">
 <span>TOTAL AMOUNT DUE:</span>
 <span>₱620.00</span>
 </div>
 </div>

 {/* Symmetrical dotted divider */}
 <div className="border-b border-dashed border-zinc-300 my-2.5"></div>

 {/* Promotional QR, Promo, and Facebook */}
 <div className="space-y-3">
 {/* Custom Thank You Message */}
 <div className="text-center text-[8px] text-zinc-800 leading-normal">
 {inlineThankYou ? (
 <span className="font-bold block">
 {inlineThankYou}
 </span>
 ) : (
 <span className="italic">
 Thank you for shopping at {selectedBranchForPreview?.name || branches[0]?.name || "our store"}!
 </span>
 )}
 </div>

 {(inlineFacebook || inlinePromoText || inlineQrBase64) && (
 <div className="space-y-3 border-t border-dashed border-zinc-200 pt-2.5">
 {inlineFacebook && (
 <div className="text-center text-[7.5px] text-default-700 flex flex-col items-center justify-center">
 <span className="font-extrabold uppercase text-primary text-[7px] tracking-wider mb-0.5">Follow us on Facebook</span>
 <span className="font-bold text-black">{inlineFacebook}</span>
 </div>
 )}

 {inlinePromoText && (
 <div className="text-center text-[7.5px] text-default-700 flex flex-col items-center justify-center px-2 py-1.5 bg-amber-50 rounded border border-dashed border-amber-200">
 <span className="font-extrabold uppercase text-amber-600 text-[7px] tracking-wider mb-0.5">Special Promo</span>
 <p className="leading-snug text-center font-bold text-black">{inlinePromoText}</p>
 </div>
 )}

 {inlineQrBase64 && (
 <div className="flex flex-col items-center justify-center space-y-1">
 <span className="text-[6.5px] uppercase font-extrabold text-default-500 tracking-wider">Scan for Evaluation Survey</span>
 <div className="h-16 w-16 border border-zinc-300 p-1 bg-white rounded flex items-center justify-center shadow-sm">
 <img
 src={inlineQrBase64}
 alt="Live Survey QR"
 className="h-full w-full object-contain filter grayscale"
 referrerPolicy="no-referrer"
 />
 </div>
 </div>
 )}
 </div>
 )}
 </div>

 {/* Symmetrical dotted divider */}
 <div className="border-b border-dashed border-zinc-300 my-2.5"></div>

 {(inlineReturnPolicy || inlineNonReturnablePolicy) && (
 <div className="space-y-1 text-center text-[7px] text-default-600 font-sans border-b border-dashed border-zinc-300 pb-2">
 {inlineReturnPolicy && (
 <div>
 <span className="font-extrabold uppercase text-zinc-800 text-[6.5px] tracking-wider block">Return & Exchange Policy:</span>
 <span>{inlineReturnPolicy}</span>
 </div>
 )}
 {inlineNonReturnablePolicy && (
 <div className="mt-0.5 text-default-500 italic">
 <span className="font-extrabold not-italic text-default-700 text-[6.5px] uppercase block">Notice:</span>
 <span>{inlineNonReturnablePolicy}</span>
 </div>
 )}
 </div>
 )}

 {/* Official Customer Transaction Acknowledgment statement */}
 <div className="text-center text-[6px] text-default-500 font-sans tracking-wide leading-normal">
 This serves as an official customer transaction acknowledgment.
 </div>

 {/* Symmetrical paper bottom tears decoration */}
 <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-200 flex overflow-hidden opacity-40" style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 2px, #d4d4d8 2px, #d4d4d8 4px)" }}></div>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* SECTION E: GLOBAL CORPORATE DIRECTORY & STAFF ROSTER */}
 <div className="bg-content1 border border-divider/20 rounded-2xl overflow-hidden shadow-sm mt-8">
 <div 
 onClick={() => setShowAllPersonnel(!showAllPersonnel)}
 className="p-5 border-b border-divider/15 flex justify-between items-center cursor-pointer hover:bg-content1/60 transition-colors select-none"
 title="Click to toggle Section Visibility"
 >
 <div>
 <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 ">
 <Users className="h-4.5 w-4.5 text-primary" />
 <span>Full Network Personnel Directory ({users.length})</span>
 {showAllPersonnel ? (
 <span className="text-[9px] bg-primary/15 text-primary px-2 py-0.5 rounded font-bold uppercase tracking-wider">Expanded</span>
 ) : (
 <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold uppercase tracking-wider">Collapsed</span>
 )}
 </h3>
 </div>
 <button 
 type="button" 
 className="p-1.5 text-default-500 hover:text-primary hover:bg-default-100 rounded-full transition-all"
 >
 {showAllPersonnel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
 </button>
 </div>

 {showAllPersonnel && (
 <div className="p-6 space-y-4 animate-fade-in bg-content1/40">
 {/* Search Input bar */}
 <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pb-2">
 <div className="relative flex-1 max-w-sm">
 <input
 type="text"
 value={personnelSearch ?? ''}
 onChange={(e) => setPersonnelSearch(e.target.value)}
 placeholder="Search employees by name, role, email..."
 className="w-full bg-background border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-xl"
 />
 </div>
 <div className="text-[10px] text-default-500 flex items-center gap-1.5">
 <span>Active Personnel Database Live Logs</span>
 </div>
 </div>

            {/* Multi-Sort Badge Bar */}
            <MultiSortBadgeBar
              sortDescriptors={personnelSortDescriptors}
              onRemoveSort={removePersonnelSort}
              onClearSort={clearPersonnelSort}
              columnLabels={{
                fullName: 'Authorized Personnel',
                role: 'Role Classification',
                branchAssignmentId: 'Branch Location',
                email: 'Communication Contact',
              }}
              className="mb-3"
            />

            {/* Directory Table Grid */}
            <div className="space-y-3 mb-4">
              <HeroTable isStriped className="min-w-[600px]">
                <HeroTable.Header>
                  <tr className="bg-content1/60 text-[10px] font-black uppercase tracking-wider text-default-500 border-b border-divider/20">
                    <HeroTable.Column
                      allowsSorting
                      sortDirection={getPersonnelSortDir('fullName')}
                      sortRank={getPersonnelSortRank('fullName')}
                      onSort={(e) => handlePersonnelSort('fullName', e)}
                      className="py-3 px-4"
                    >
                      Authorized Personnel
                    </HeroTable.Column>
                    <HeroTable.Column
                      allowsSorting
                      sortDirection={getPersonnelSortDir('role')}
                      sortRank={getPersonnelSortRank('role')}
                      onSort={(e) => handlePersonnelSort('role', e)}
                      className="py-3 px-4"
                    >
                      Role Classification
                    </HeroTable.Column>
                    <HeroTable.Column
                      allowsSorting
                      sortDirection={getPersonnelSortDir('branchAssignmentId')}
                      sortRank={getPersonnelSortRank('branchAssignmentId')}
                      onSort={(e) => handlePersonnelSort('branchAssignmentId', e)}
                      className="py-3 px-4"
                    >
                      Branch Location Assignment
                    </HeroTable.Column>
                    <HeroTable.Column
                      allowsSorting
                      sortDirection={getPersonnelSortDir('email')}
                      sortRank={getPersonnelSortRank('email')}
                      onSort={(e) => handlePersonnelSort('email', e)}
                      className="py-3 px-4"
                    >
                      Communication Contact
                    </HeroTable.Column>
                    <HeroTable.Column align="center" className="py-3 px-4 text-center">
                      Security PIN Status
                    </HeroTable.Column>
                  </tr>
                </HeroTable.Header>
                <HeroTable.Body>
 {filteredPersonnel
 .slice((personnelPage - 1) * personnelPageSize, personnelPage * personnelPageSize)
 .map((item) => {
 const assignedB = branches.find(b => b.id === item.branchAssignmentId);
 return (
 <tr key={item.id} className="hover:bg-primary/5 transition-colors">
 {/* Profile block */}
 <td className="py-3.5 px-4">
 <div className="flex items-center gap-3">
 <div className="h-8 w-8 rounded-full bg-primary-50 text-primary-700 text-xs font-black flex items-center justify-center border border-primary/10">
 {item.avatarInitials || (item.fullName ? item.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??')}
 </div>
 <div>
 <div className="flex items-center gap-1.5">
 <span className="block font-bold text-foreground">{item.fullName}</span>
 {item.isNew && (
 <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5" title="Newly Enlisted Employee">
 <Sparkles className="h-2.5 w-2.5" /> NEW
 </span>
 )}
 </div>
 <span className="block text-[10px] text-default-500 font-medium">Employee ID: #{item.id}</span>
 </div>
 </div>
 </td>

 {/* Role Designation */}
 <td className="py-3.5 px-4">
 <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
 item.role === UserRole.ADMIN 
 ? 'bg-primary/10 text-primary border-primary/20'
 : item.role === UserRole.MANAGER
 ? 'bg-primary/10 text-primary border-primary/15'
 : item.role === UserRole.CASHIER
 ? 'bg-secondary/10 text-secondary border-secondary/20'
 : 'bg-zinc-500/10 text-default-600 border-divider/20'
 }`}>
 {item.role}
 </span>
 </td>

 {/* Assigned Branch */}
 <td className="py-3.5 px-4">
 <div className="flex items-center gap-1.5 text-default-700">
 <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
 <span className="font-bold text-foreground">{assignedB ? assignedB.name : 'Central Network / Unassigned'}</span>
 </div>
 </td>

 {/* Email & Communication info */}
 <td className="py-3.5 px-4 font-normal text-default-500">
 <div className="space-y-0.5">
 <span className="block text-xs font-bold text-foreground">{item.email || 'N/A'}</span>
 <span className="block text-[10.5px] text-default-500 ">Handle: @{item.username}</span>
 </div>
 </td>

 {/* Override Credentials indicator */}
 <td className="py-3.5 px-4 text-center ">
 {item.role === UserRole.ADMIN || item.role === UserRole.MANAGER ? (
 <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/10 text-primary border border-emerald-500/15 text-[9px] font-bold">
 <ShieldCheck className="h-3 w-3" /> SECURE PIN CONFIG
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-500/5 text-default-500 border border-divider/20 text-[9px]">
 STANDARD AUTH
 </span>
 )}
 </td>
 </tr>
                    );
                  })}
                </HeroTable.Body>
              </HeroTable>
            </div>

 <TablePagination
 currentPage={personnelPage}
 totalItems={filteredPersonnel.length}
 pageSize={personnelPageSize}
 onPageChange={setPersonnelPage}
 itemName="employees"
 />
 </div>
 )}
 </div>

 {/* MODAL: Edit / Add Corporate Branch dialog */}
  <HeroModal isOpen={showModal} onClose={() => setShowModal(false)} size="xl" className="p-6 border border-divider/30 max-h-[90vh] overflow-y-auto">
    <form onSubmit={handleSubmit} className="space-y-4 bg-content1 text-foreground text-left">
      <div className="flex justify-between items-center border-b border-divider/20 pb-2.5 flex-shrink-0">
        <h3 className="text-base font-bold text-primary flex items-center gap-2">
 <Building2 className="h-5 w-5" />
 <span>{isEditMode ? 'Modify Branch Records' : 'Launch New Store Location'}</span>
 </h3>
 <button type="button" onClick={() => setShowModal(false)} className="text-default-500 hover:text-foreground cursor-pointer p-1 rounded-full hover:bg-default-100">
 <X className="h-5 w-5" />
 </button>
 </div>

 {/* Custom Branch ID and Brand Logo fields */}
 <div className="space-y-1 relative">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">
 Branch ID (System Code)
 </label>
 <input
 type="text"
 required
 value={customBranchId ?? ''}
 onChange={e => setCustomBranchId(e.target.value)}
 placeholder="Branch ID (e.g. HQ-MAIN, BR-01)"
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg "
 />
 <p className="text-[9px] text-default-500 italic pl-1">
 {isEditMode 
 ? "Changing this ID will cascade update all linked employees, stock levels, shifts, sales, and transaction records."
 : "Enter a unique branch identifier or leave empty to auto-generate."
 }
 </p>
 </div>

 <div className="space-y-1 relative">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">Branch Name</label>
 <input
 type="text"
 required
 value={name ?? ''}
 onChange={e => setName(e.target.value)}
 placeholder="Branch Name"
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg"
 />
 </div>

 <div className="space-y-1 relative">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">Outlet Address</label>
 <input
 type="text"
 required
 value={address ?? ''}
 onChange={e => setAddress(e.target.value)}
 placeholder="Street, City, Province"
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg"
 />
 </div>

 <div className="space-y-1 relative">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">Contact Line</label>
 <input
 type="text"
 required
 value={phone ?? ''}
 onChange={e => setPhone(e.target.value)}
 placeholder="Phone number"
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg"
 />
 </div>

 <div className="space-y-1 relative">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">TIN (Taxpayer Identification Number)</label>
 <input
 type="text"
 value={tin ?? ''}
 onChange={e => setTin(formatTin(e.target.value))}
 placeholder="000-000-000-000"
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg"
 />
 </div>

 <div className="grid grid-cols-2 gap-3 pb-1">
 <div className="space-y-1 relative">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">Staff roster</label>
 <input
 type="number"
 required
 value={staffCount ?? ''}
 onChange={e => setStaffCount(Number(e.target.value))}
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg font-bold"
 />
 </div>

 <div className="space-y-1 relative">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">Active Cashiers</label>
 <input
 type="number"
 required
 value={activeCashiers ?? ''}
 onChange={e => setActiveCashiers(Number(e.target.value))}
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg font-bold"
 />
 </div>
 </div>

 <div className="space-y-1 relative">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">Branch Security Code</label>
 <input
 type="text"
 required
 value={branchCode ?? ''}
 onChange={e => setBranchCode(e.target.value)}
 placeholder="BR-SILAY"
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg font-bold"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1 relative">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">Local IP Binding</label>
 <input
 type="text"
 required
 value={localIp ?? ''}
 onChange={e => setLocalIp(e.target.value)}
 placeholder="192.168.1.50"
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg font-bold"
 />
 </div>

 <div className="space-y-1 relative">
   <HeroSelect
     label="Gateway Rules"
     value={gatewayRules ?? ''}
     onValueChange={val => setGatewayRules(val)}
     radius="md"
     items={[
       { key: 'ALLOW-LOCAL-ONLY', value: 'ALLOW-LOCAL-ONLY', label: 'Local Only' },
       { key: 'RESTRICTED-OUTBOUND', value: 'RESTRICTED-OUTBOUND', label: 'Restricted' },
       { key: 'ALLOW-ALL-TRAFFIC', value: 'ALLOW-ALL-TRAFFIC', label: 'Allow All' },
     ]}
   />
 </div>
 </div>

 {/* Store Operating Schedule & Hours */}
 <div className="space-y-3.5 p-3.5 bg-content1 border border-divider/30 rounded-2xl animate-fade-in">
  <div className="flex items-center gap-1.5 border-b border-divider/10 pb-1.5">
   <Clock className="h-4 w-4 text-primary" />
   <span className="text-[11px] font-black tracking-wider text-primary uppercase">Branch Operating Hours & Days</span>
  </div>
  <div className="grid grid-cols-2 gap-3">
   <div className="space-y-1 relative">
    <label className="text-[10px] font-bold text-default-500 uppercase tracking-widest pl-1">Opening Time</label>
    <input
     type="time"
     value={openingTime ?? ''}
     onChange={e => setOpeningTime(e.target.value)}
 className="w-full bg-background border border-divider/60 focus:border-primary px-3 py-1.5 text-xs text-foreground focus:outline-none transition-colors rounded-lg "
    />
   </div>
   <div className="space-y-1 relative">
    <label className="text-[10px] font-bold text-default-500 uppercase tracking-widest pl-1">Closing Time</label>
    <input
     type="time"
     value={closingTime ?? ''}
     onChange={e => setClosingTime(e.target.value)}
 className="w-full bg-background border border-divider/60 focus:border-primary px-3 py-1.5 text-xs text-foreground focus:outline-none transition-colors rounded-lg "
    />
   </div>
  </div>
  <div className="space-y-1.5">
   <label className="text-[10px] font-bold text-default-500 uppercase tracking-widest pl-1 block">Operating Weekdays</label>
   <div className="flex flex-wrap gap-1.5">
    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
     const isSelected = operatingDays.includes(day);
     return (
      <button
       type="button"
       key={day}
       onClick={() => {
        if (isSelected) {
         setOperatingDays(operatingDays.filter(d => d !== day));
        } else {
         setOperatingDays([...operatingDays, day]);
        }
       }}
       className={`px-2.5 py-1 text-[10px] font-black rounded-lg border transition-all cursor-pointer ${
        isSelected 
         ? "bg-primary text-primary-foreground border-primary shadow-sm" 
         : "bg-background text-default-500 border-divider/30 hover:bg-primary/10"
       }`}
      >
       {day}
      </button>
     );
    })}
   </div>
  </div>
 </div>

 {/* Receipt & Policy Configuration */}
 <div className="space-y-3.5 p-3.5 bg-content1 border border-divider/30 rounded-2xl animate-fade-in text-left">
  <div className="flex items-center gap-1.5 border-b border-divider/10 pb-1.5">
   <FileText className="h-4 w-4 text-primary" />
   <span className="text-[11px] font-black tracking-wider text-primary uppercase">Receipt Customization & Policies</span>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
   <div className="space-y-1 relative">
    <label className="text-[10px] font-bold text-default-500 uppercase tracking-widest pl-1">Return & Exchange Policy</label>
    <input
     type="text"
     value={receiptReturnPolicy ?? ''}
     onChange={e => setReceiptReturnPolicy(e.target.value)}
     placeholder="e.g. 7 days return/exchange with receipt in original box"
     className="w-full bg-background border border-divider/60 focus:border-primary px-3 py-1.5 text-xs text-foreground focus:outline-none transition-colors rounded-lg font-sans"
    />
   </div>

   <div className="space-y-1 relative">
    <label className="text-[10px] font-bold text-default-500 uppercase tracking-widest pl-1">Non-Returnable Items Notice</label>
    <input
     type="text"
     value={receiptNonReturnablePolicy ?? ''}
     onChange={e => setReceiptNonReturnablePolicy(e.target.value)}
     placeholder="e.g. Installed/cut tiles and altered items are non-returnable"
     className="w-full bg-background border border-divider/60 focus:border-primary px-3 py-1.5 text-xs text-foreground focus:outline-none transition-colors rounded-lg font-sans"
    />
   </div>
  </div>

  <div className="space-y-1 relative">
   <label className="text-[10px] font-bold text-default-500 uppercase tracking-widest pl-1">Receipt Promotional Message</label>
   <input
    type="text"
    value={receiptPromoText ?? ''}
    onChange={e => setReceiptPromoText(e.target.value)}
    placeholder="e.g. Follow us on social media for seasonal discount announcements!"
    className="w-full bg-background border border-divider/60 focus:border-primary px-3 py-1.5 text-xs text-foreground focus:outline-none transition-colors rounded-lg font-sans"
   />
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
   <div className="space-y-1 relative">
    <label className="text-[10px] font-bold text-default-500 uppercase tracking-widest pl-1">Custom Thank You Text</label>
    <input
     type="text"
     value={receiptThankYou ?? ''}
     onChange={e => setReceiptThankYou(e.target.value)}
     placeholder="e.g. Thank you for choosing TilePoint Building Supplies!"
     className="w-full bg-background border border-divider/60 focus:border-primary px-3 py-1.5 text-xs text-foreground focus:outline-none transition-colors rounded-lg font-sans"
    />
   </div>

   <div className="space-y-1 relative">
    <label className="text-[10px] font-bold text-default-500 uppercase tracking-widest pl-1">Facebook Handle / Page</label>
    <input
     type="text"
     value={receiptFacebook ?? ''}
     onChange={e => setReceiptFacebook(e.target.value)}
     placeholder="e.g. facebook.com/tilepoint"
     className="w-full bg-background border border-divider/60 focus:border-primary px-3 py-1.5 text-xs text-foreground focus:outline-none transition-colors rounded-lg font-sans"
    />
   </div>
  </div>
 </div>

 {/* Distribution Branch Switcher */}
 {isUserAdmin && (
 <div className="flex items-center gap-3 p-3 bg-content1 border border-divider/30 rounded-2xl animate-fade-in select-none">
 <input
 type="checkbox"
 id="isDistributionBranchCheckbox"
 checked={isEditMode && editingId === primaryBranchId ? true : isDistributionBranch}
 disabled={isEditMode && editingId === primaryBranchId}
 onChange={e => setIsDistributionBranch(e.target.checked)}
 className="h-4.5 w-4.5 text-primary border-default-200 focus:ring-primary rounded cursor-pointer accent-primary"
 />
 <label htmlFor="isDistributionBranchCheckbox" className="text-xs font-black text-foreground cursor-pointer leading-tight">
 {isEditMode && editingId === primaryBranchId ? 'Main Branch / HQ' : 'Distribution Hub Designation'}
 <span className="block text-[9.5px] text-default-500 font-medium mt-1 leading-normal">
 {isEditMode && editingId === primaryBranchId 
 ? 'This main HQ location has implicit global distribution privileges.' 
 : 'Grant this branch authority to compile Inter-Branch Digital Transmittals.'}
 </span>
 </label>
 </div>
  )}

  {/* Present Employee Selector Checklist & Inline Employee Adder */}
  <div className="space-y-3 p-3.5 bg-content1 border border-divider/30 rounded-2xl animate-fade-in text-left">
   <div className="flex items-center gap-1.5 border-b border-divider/10 pb-1.5">
    <Users className="h-4 w-4 text-primary" />
    <span className="text-[11px] font-black tracking-wider text-primary uppercase">Staff & Cashier Roster</span>
   </div>
   
   {/* Select present employees */}
   <div className="space-y-2">
    <label className="text-[10px] font-bold text-default-500 uppercase tracking-widest pl-1 block">Assign Existing Employees</label>
    <div className="max-h-32 overflow-y-auto border border-divider/15 rounded-lg p-2 space-y-1.5 bg-background">
     {users.filter(u => u.status === 'Active' && u.role !== UserRole.ADMIN).map(u => {
      const isAssigned = selectedEmployeeIds.includes(u.id);
      return (
       <label key={u.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer text-foreground hover:text-primary select-none">
        <input
         type="checkbox"
         checked={isAssigned}
         onChange={() => {
          if (isAssigned) {
           setSelectedEmployeeIds(selectedEmployeeIds.filter(id => id !== u.id));
          } else {
           setSelectedEmployeeIds([...selectedEmployeeIds, u.id]);
          }
         }}
         className="h-3.5 w-3.5 text-primary border-default-200 rounded cursor-pointer accent-primary"
        />
 <span>{u.fullName} <span className="text-[9px] text-default-500 font-bold uppercase ">({u.role})</span></span>
       </label>
      );
     })}
     {users.filter(u => u.status === 'Active' && u.role !== UserRole.ADMIN).length === 0 && (
      <div className="text-[10px] text-default-500 italic text-center py-2">No active employees available to select.</div>
     )}
    </div>
   </div>

   {/* Inline Employee Adder */}
   <div className="space-y-2 border-t border-divider/10 pt-2.5">
    <div className="flex justify-between items-center">
     <label className="text-[10px] font-bold text-default-500 uppercase tracking-widest pl-1">Register New Employee Inline</label>
     <button
      type="button"
      onClick={() => setShowAddInlineStaff(!showAddInlineStaff)}
      className="text-[9.5px] font-black text-primary hover:text-primary/85 transition-all flex items-center gap-0.5 uppercase tracking-wider"
     >
      <Plus className="h-3 w-3" /> {showAddInlineStaff ? 'Collapse' : 'Add Staff'}
     </button>
    </div>

    {showAddInlineStaff && (
     <div className="p-2.5 bg-background border border-divider/15 rounded-xl space-y-2.5 animate-fade-in text-left">
      <div className="space-y-1">
       <input
        type="text"
        placeholder="Full Name (e.g. Juan Cruz)"
        value={inlineFullName ?? ''}
        onChange={e => setInlineFullName(e.target.value)}
        className="w-full bg-content1 border-b border-divider/40 focus:border-primary px-2 py-1 text-xs text-foreground focus:outline-none rounded-t-sm"
       />
      </div>
      <div className="grid grid-cols-2 gap-2">
       <input
        type="text"
        placeholder="Username"
        value={inlineUsername ?? ''}
        onChange={e => setInlineUsername(e.target.value)}
        className="w-full bg-content1 border-b border-divider/40 focus:border-primary px-2 py-1 text-xs text-foreground focus:outline-none rounded-t-sm"
       />
       <input
        type="text"
        placeholder="4-6 Digit Security PIN"
        maxLength={6}
        value={inlinePin ?? ''}
        onChange={e => setInlinePin(e.target.value.replace(/\D/g, ''))}
 className="w-full bg-content1 border-b border-divider/40 focus:border-primary px-2 py-1 text-xs text-foreground focus:outline-none rounded-t-sm "
       />
      </div>
      <div className="grid grid-cols-2 gap-2">
       <input
        type="email"
        placeholder="Email Address"
        value={inlineEmail ?? ''}
        onChange={e => setInlineEmail(e.target.value)}
        className="w-full bg-content1 border-b border-divider/40 focus:border-primary px-2 py-1 text-xs text-foreground focus:outline-none rounded-t-sm"
       />
       <HeroSelect
        value={inlineRole ?? ''}
        onValueChange={val => setInlineRole(val as UserRole)}
        radius="sm"
        items={[
          { key: UserRole.CASHIER, value: UserRole.CASHIER, label: 'Cashier' },
          ...(isUserAdmin ? [{ key: UserRole.MANAGER, value: UserRole.MANAGER, label: 'Manager' }] : []),
          { key: UserRole.STAFF, value: UserRole.STAFF, label: 'Staff' },
        ]}
       />
      </div>
      <button
       type="button"
       onClick={() => {
        if (!inlineFullName.trim() || !inlineUsername.trim() || !inlinePin.trim()) {
         showToast('Please provide a full name, username, and numeric security PIN.');
         return;
        }
        if (!isUserAdmin && inlineRole !== UserRole.CASHIER && inlineRole !== UserRole.STAFF) {
         showToast('Permission Denied: Managers can only enlist Cashier and Staff employees.');
         return;
        }
        if (inlinePin.length < 4) {
         showToast('Pin must be at least 4 digits long.');
         return;
        }
        const avatar = inlineFullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        const newStaff = {
         fullName: inlineFullName.trim(),
         username: inlineUsername.trim().toLowerCase(),
         email: inlineEmail.trim() || `${inlineUsername.trim().toLowerCase()}@tilepoint.com`,
         role: inlineRole,
         managerPin: inlinePin,
         avatarInitials: avatar || 'US'
        };
        setInlineStaffList([...inlineStaffList, newStaff]);
        setInlineFullName('');
        setInlineUsername('');
        setInlinePin('');
        setInlineEmail('');
        setInlineRole(UserRole.CASHIER);
        setShowAddInlineStaff(false);
        showToast(`Staged staff "${newStaff.fullName}" for enrollment.`);
       }}
       className="w-full py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer text-center"
      >
       Stage Staff Enrollment
      </button>
     </div>
    )}

    {/* Render list of staged inline enrollments */}
    {inlineStaffList.length > 0 && (
     <div className="space-y-1 mt-1.5 text-left">
      <div className="text-[9px] uppercase tracking-wider font-extrabold text-default-500">Staged Staff Pending Save:</div>
      <div className="space-y-1">
       {inlineStaffList.map((s, idx) => (
        <div key={idx} className="flex justify-between items-center text-xs bg-content1 p-1.5 px-2.5 rounded-lg border border-divider/20">
         <span>{s.fullName} <span className="text-[9px] text-primary uppercase font-bold">({s.role})</span></span>
         <button
          type="button"
          onClick={() => setInlineStaffList(inlineStaffList.filter((_, i) => i !== idx))}
          className="text-red-500 hover:text-red-650 cursor-pointer text-[10px] font-bold"
         >
          Remove
         </button>
        </div>
       ))}
      </div>
     </div>
    )}
   </div>
  </div>

  <div className="flex justify-end gap-2.5 border-t border-divider/20 pt-4 flex-shrink-0">
    <button
      type="button"
      onClick={() => setShowModal(false)}
      className="px-4 py-2.5 text-xs font-bold rounded-xl cursor-pointer hover:bg-default-100 text-default-500 transition-colors"
    >
      Cancel
    </button>
    <button
      type="submit"
      className="bg-primary text-primary-foreground font-extrabold shadow-md shadow-primary/20 rounded-xl px-5 py-2.5 text-xs cursor-pointer hover:bg-primary/90 active:scale-95 transition-all"
    >
      {isEditMode ? 'Save Changes' : 'Launch Branch'}
    </button>
  </div>
 </form>
 </HeroModal>

  {/* CUSTOM HEROUI ALERT DIALOG: Confirmation before delete to avoid blocking browser popups */}
  <HeroModal
    isOpen={Boolean(confirmDeleteId)}
    onClose={() => setConfirmDeleteId(null)}
    size="xs"
    className="p-6 text-center space-y-4 border border-divider/30"
  >
    <div className="mx-auto h-12 w-12 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center">
      <AlertTriangle className="h-6 w-6" />
    </div>
    <div>
      <h4 className="text-sm font-black text-primary">Archive Store Location?</h4>
      <p className="text-xs text-default-500/80 mt-2 leading-relaxed">
        Are you sure you want to soft-delete <span className="font-extrabold text-foreground">{confirmDeleteName}</span>? This item can be restored by DB administrators later.
      </p>
    </div>
    <div className="flex gap-2 justify-center pt-2">
      <button
        type="button"
        onClick={() => setConfirmDeleteId(null)}
        className="px-4 py-2 text-xs font-bold bg-default-100 text-default-500 rounded-full hover:bg-default-200 transition-colors"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={proceedWithDelete}
        className="px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors shadow-sm"
      >
        Confirm Delete
      </button>
    </div>
  </HeroModal>

  {/* MODAL: DIRECT ENLIST EMPLOYEE */}
  <HeroModal
    isOpen={showEnlistModal}
    onClose={() => setShowEnlistModal(false)}
    size="sm"
    className="p-6 border border-divider/30 space-y-4"
  >
    <form
      onSubmit={handleEnlistEmployeeSubmit}
      className="space-y-4 bg-content1 text-foreground text-left"
    >
        <div className="flex justify-between items-center border-b border-divider/20 pb-2.5">
          <h3 className="text-base font-bold text-primary flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            <span>Enlist New Employee</span>
          </h3>
          <button
            type="button"
            onClick={() => setShowEnlistModal(false)}
            className="text-default-500 hover:text-foreground cursor-pointer p-1 rounded-full hover:bg-default-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-1 relative">
          <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">Employee Full Name</label>
          <input
            type="text"
            required
            value={enlistFullName}
            onChange={e => setEnlistFullName(e.target.value)}
            placeholder="e.g. Maria Santos"
            className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg font-semibold"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1 relative">
            <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">Username ID</label>
            <input
              type="text"
              required
              value={enlistUsername}
              onChange={e => setEnlistUsername(e.target.value)}
              placeholder="e.g. msantos"
              className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg font-semibold"
            />
          </div>
          <div className="space-y-1 relative">
            <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">Corporate Email</label>
            <input
              type="email"
              value={enlistEmail}
              onChange={e => setEnlistEmail(e.target.value)}
              placeholder="Optional email"
              className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg"
            />
          </div>
        </div>

        <div className="space-y-1 relative">
          <HeroSelect
            label="Operational Role"
            value={enlistRole}
            onValueChange={val => setEnlistRole(val as UserRole)}
            radius="md"
            items={[
              ...(isUserAdmin ? [
                { key: UserRole.ADMIN, value: UserRole.ADMIN, label: 'Admin - Full Corporate Access' },
                { key: UserRole.MANAGER, value: UserRole.MANAGER, label: 'Manager - Branch Supervisor' },
              ] : []),
              { key: UserRole.CASHIER, value: UserRole.CASHIER, label: 'Cashier - POS Sales Clerk' },
              { key: UserRole.STAFF, value: UserRole.STAFF, label: 'Staff - Stock Logistics Checker' },
            ]}
          />
        </div>

        {(enlistRole === UserRole.ADMIN || enlistRole === UserRole.MANAGER) && (
          <div className="space-y-1 relative">
            <label className="text-[10px] font-bold text-amber-500 uppercase tracking-widest pl-1">Override Security PIN Code</label>
            <input
              type="text"
              maxLength={6}
              value={enlistPin}
              onChange={e => setEnlistPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 4-6 digit PIN"
              className="w-full bg-content1 border-b-2 border-amber-500 focus:border-amber-500 px-3 py-2 text-xs text-foreground font-semibold focus:outline-none transition-colors rounded-lg"
            />
            <span className="text-[9px] text-default-400 pl-1 block">Passcode used for supervisor authorizations and discount overrides.</span>
          </div>
        )}

        <div className="space-y-1 relative">
          <HeroSelect
            label="Assigned Branch Location"
            value={enlistBranchId}
            onValueChange={val => setEnlistBranchId(val)}
            radius="md"
            items={branches.filter(b => isUserAdmin || b.id === userBranchId).map(b => ({
              key: b.id,
              value: b.id,
              label: `${b.name} (ID: ${b.id})`,
            }))}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-divider/20 pt-4 flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowEnlistModal(false)}
            className="px-4 py-2 text-xs font-bold rounded-xl cursor-pointer hover:bg-default-100 text-default-500 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 rounded-xl px-5 py-2 text-xs cursor-pointer hover:bg-primary/90 transition-all active:scale-95"
          >
            Enlist Employee
          </button>
        </div>
    </form>
  </HeroModal>


  {/* Success toast alert bar */}
 <ToastNotification
 message={toastMessage}
 onClose={() => setToastMessage(null)}
 />
 </div>
 );
}
