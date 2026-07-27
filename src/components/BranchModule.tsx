/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDb } from '../context/DbContext';
import { Branch, UserRole } from '../types/db';
import { useResponsivePageSize, TablePagination } from './TablePagination';
import {
 Building2,
 Sparkles,
 Phone,
 MapPin,
 TrendingUp,
 Users,
 Plus,
 Edit2,
 Trash2,
 X,
 CreditCard,
 UserCheck,
 ShieldCheck,
 AlertTriangle,
 ChevronDown,
 ChevronUp,
 Mail,
 User,
 Upload,
 Image,
 Receipt,
 Clock
} from 'lucide-react';

const formatTin = (value: string | undefined | null): string => {
 if (!value) return "";
 const clean = value.replace(/[-\s]/g, "");
 const match = clean.match(/.{1,3}/g);
 if (match) {
 return match.join(" ");
 }
 return value;
};


interface BranchModuleProps {
 darkMode: boolean;
}

export const BranchModule: React.FC<BranchModuleProps> = ({ darkMode }) => {
  const {
    branches,
    createBranch,
    updateBranch,
    deleteBranch,
    currentUser,
    users,
    createUser,
    updateUser,
    sales
  } = useDb();

  const primaryBranchId = localStorage.getItem("tilepoint_primary_branch_id") || "B1";
  const isUserAdmin = currentUser?.role === UserRole.ADMIN;
  const isUserManager = currentUser?.role === UserRole.MANAGER || (currentUser?.role as string) === 'Manager';
  const isUserAdminOrManager = isUserAdmin || isUserManager;

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

  // Create Modal settings
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
  const [showAdvancedNetwork, setShowAdvancedNetwork] = useState(false);
  const [expandedNetwork, setExpandedNetwork] = useState<Record<string, boolean>>({});

  const toggleNetworkSettings = (branchId: string) => {
    setExpandedNetwork(prev => ({ ...prev, [branchId]: !prev[branchId] }));
  };

  // Inline Receipt Editor States
  const [inlineBranchId, setInlineBranchId] = useState('');
  const [inlineFacebook, setInlineFacebook] = useState('');
  const [inlinePromoText, setInlinePromoText] = useState('');
  const [inlineThankYou, setInlineThankYou] = useState('');
 const [inlineQrBase64, setInlineQrBase64] = useState('');
 const [inlineTin, setInlineTin] = useState('');
 const [inlineStoreLogo, setInlineStoreLogo] = useState('');
 const [inlineLogoSize, setInlineLogoSize] = useState(40);

 const activeBranchesForReceipt = branches.filter(b => !b.isDeleted && (isUserAdmin || b.id === currentUser?.branchAssignmentId));
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
 }, [branches, currentUser?.branchAssignmentId]);

 useEffect(() => {
 const selectedBranch = branches.find(b => b.id === inlineBranchId);
 if (selectedBranch) {
 setInlineFacebook(selectedBranch.receiptFacebook || '');
 setInlinePromoText(selectedBranch.receiptPromoText || '');
 setInlineThankYou(selectedBranch.receiptThankYou || '');
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

 const branchPageSize = useResponsivePageSize(240, 420, 4); // each branch card is tall
 const personnelPageSize = useResponsivePageSize(48, 550, 8); // each table row is standard 48px height

 // Reset personnel page when search changes
 useEffect(() => {
 setPersonnelPage(1);
 }, [personnelSearch]);

 const filteredPersonnel = users.filter(u => {
 if (!personnelSearch) return true;
 const term = personnelSearch.toLowerCase();
 return (
 u.fullName.toLowerCase().includes(term) ||
 u.role.toLowerCase().includes(term) ||
 u.email.toLowerCase().includes(term) ||
 u.username.toLowerCase().includes(term)
 );
 });

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
  setShowAdvancedNetwork(false);

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
  setShowAdvancedNetwork(false);

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
        const exists = branches.some(b => b.id.toLowerCase() === trimmedCustomId.toLowerCase());
        if (exists) {
          showToast(`Validation Error: A branch with ID "${trimmedCustomId}" already exists.`);
          return;
        }
      } else if (trimmedCustomId.toLowerCase() !== editingId.toLowerCase()) {
        const exists = branches.some(b => b.id.toLowerCase() === trimmedCustomId.toLowerCase());
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
          updateUser(u.id, { branchAssignmentId: 'B1' });
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
 if (id === primaryBranchId) {
 showToast('Violation Blocked: Deleting the primary Main Branch (HQ) is restricted to maintain transactional ledger continuity.');
 return;
 }
 setConfirmDeleteId(id);
 setConfirmDeleteName(branchName);
 };

 const proceedWithDelete = () => {
 if (confirmDeleteId) {
 deleteBranch(confirmDeleteId);
 showToast(`Archived and soft-deleted branch '${confirmDeleteName}'.`);
 setConfirmDeleteId(null);
 }
 };

 return (
 <div className="space-y-6 animate-fade-in text-m3-on-surface">
 {/* Action Header */}
 <div className="flex justify-between items-center bg-m3-surface-low/95 backdrop-blur-md p-4 rounded-[20px] border border-m3-outline-variant/20 sticky top-0 z-20 shadow-md">
 <div>
 <h3 className="text-xs font-black tracking-widest text-m3-primary uppercase font-mono">Store Chains & Branches</h3>
 <p className="text-xs text-m3-on-surface-variant/80 mt-0.5">Corporate business parameter logs</p>
 </div>

 {isUserAdmin && (
 <button
 onClick={handleOpenAdd}
 className="m3-btn-primary flex items-center gap-1.5 cursor-pointer shadow-sm text-xs shrink-0"
 >
 <Plus className="h-4.5 w-4.5" /> Launch Branch
 </button>
 )}
 </div>

 {/* Grid displays of branches */}
 <div className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {branches
 .filter(b => !b.isDeleted && (isUserAdmin || b.id === currentUser?.branchAssignmentId))
 .slice((branchPage - 1) * branchPageSize, branchPage * branchPageSize)
 .map((b) => {
 const branchEmployees = users.filter(u => u.branchAssignmentId === b.id);
 const isExpanded = !!expandedBranchUsers[b.id];
 return (
 <div
 key={b.id}
 className="m3-card shadow-sm transition-all duration-250 relative overflow-hidden flex flex-col justify-between"
 >
 {/* Top outline band */}
 <div className="flex items-start justify-between border-b border-m3-outline-variant/15 pb-3">
 <div className="space-y-1.5 border-b border-m3-outline-variant/5 pb-1">
 <div className="flex items-center gap-2">
 <div className="h-9 w-9 rounded-xl border border-m3-outline-variant/15 overflow-hidden bg-m3-surface-low flex items-center justify-center flex-shrink-0">
 {b.storeLogo ? (
 <img src={b.storeLogo} alt="Logo" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
 ) : (
 <div className="p-2 bg-m3-primary/10 text-m3-primary h-full w-full flex items-center justify-center">
 <Building2 className="h-4.5 w-4.5" />
 </div>
 )}
 </div>
 <div>
 <h4 className="text-sm font-extrabold tracking-tight text-m3-on-surface leading-tight">{b.name}</h4>
 <p className="text-[9px] font-mono text-m3-on-surface-variant/80 font-bold mt-0.5">ID: {b.id}</p>
 </div>
 </div>
 <div className="flex items-center gap-1.5 text-xs text-m3-on-surface-variant/90 pl-1">
 <UserCheck className="h-3.5 w-3.5 text-m3-tertiary font-bold" />
 <span>Manager: <strong className="font-bold text-m3-on-surface">{getDynamicBranchManager(b.id)}</strong></span>
 </div>
 <div className="flex flex-wrap gap-1.5 pt-1 pl-1">
 {b.id === primaryBranchId && (
 <span className="text-[9px] font-black uppercase font-mono tracking-widest bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded border border-amber-500/20">
 Main HQ
 </span>
 )}
 {(b.id === primaryBranchId || b.isDistributionBranch) && (
 <span className="text-[9px] font-black uppercase font-mono tracking-widest bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20">
 Distribution Hub
 </span>
 )}
 </div>
 </div>

 {/* Operations edit and delete for admins */}
 {isUserAdmin && (
 <div className="flex gap-1">
 <button
 onClick={() => handleOpenEdit(b)}
 className="p-1.5 rounded-full hover:bg-m3-outline-variant/15 text-m3-primary cursor-pointer transition-colors"
 title="Edit Details"
 >
 <Edit2 className="h-4 w-4" />
 </button>
 <button
 onClick={() => triggerDelete(b.id, b.name)}
 className="p-1.5 rounded-full hover:bg-m3-outline-variant/15 text-m3-primary hover:text-m3-outline-variant cursor-pointer transition-colors"
 title="Archive Outlets"
 >
 <Trash2 className="h-4 w-4" />
 </button>
 </div>
 )}
 </div>

 {/* Address and Contacts details layout */}
 <div className="py-4 space-y-2 text-xs">
 <div className="flex items-start gap-2 text-m3-on-surface-variant/90 leading-normal">
 <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-m3-primary" />
 <span>{b.address || 'Declared address pending.'}</span>
 </div>

 <div className="flex items-center gap-2 text-m3-on-surface-variant/90 leading-normal">
 <Phone className="h-4 w-4 shrink-0 text-m3-tertiary" />
 <span>Phone Ref: <strong className="font-mono">{b.phone || 'None declared.'}</strong></span>
 </div>

 <div className="flex items-center gap-2 text-m3-on-surface-variant/90 leading-normal">
 <CreditCard className="h-4 w-4 shrink-0 text-m3-primary" />
 <span>TIN: <strong className="font-mono">{formatTin(b.tin) || 'None declared.'}</strong></span>
 </div>

 {/* Secure network variables & collapsible Advanced settings */}
 <div className="mt-2 text-left">
  <button
    type="button"
    onClick={() => toggleNetworkSettings(b.id)}
    className="flex items-center justify-between w-full px-2.5 py-1.5 bg-m3-surface-low/30 hover:bg-m3-surface-low/60 rounded-xl border border-m3-outline-variant/10 text-[10.5px] font-bold text-m3-on-surface-variant transition-all cursor-pointer"
  >
    <span className="flex items-center gap-1.5">
      <ShieldCheck className="h-3.5 w-3.5 text-m3-primary" />
      <span>Network & Security Settings</span>
    </span>
    <span className="text-[9px] font-mono font-bold text-m3-primary">
      {expandedNetwork[b.id] ? 'COLLAPSE' : 'SHOW DETAILS'}
    </span>
  </button>
  
  {expandedNetwork[b.id] && (
    <div className="bg-m3-surface-low/50 p-2.5 rounded-xl border-x border-b border-m3-outline-variant/10 space-y-1.5 font-mono text-[10.5px] text-left mt-1">
      <div className="flex justify-between">
        <span className="text-zinc-400 font-bold">SECURE CODE:</span>
        <span className="text-m3-primary font-black uppercase">{b.branchCode || 'PENDING'}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-zinc-400 font-bold">IP BINDING:</span>
        <span className="text-m3-on-surface font-extrabold">{b.localIp || '192.168.1.1'}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-zinc-400 font-bold">GATEWAY:</span>
        <span className="text-m3-tertiary font-black uppercase">{b.gatewayRules || 'ALLOW-LOCAL-ONLY'}</span>
      </div>
      <div className="mt-2 text-[9px] text-m3-on-surface-variant/75 font-sans leading-relaxed border-t border-m3-outline-variant/10 pt-1.5">
        <strong>Help Desk:</strong> IP Binding locks cashier terminal syncs to the branch's local subnet IP. Gateway (ALLOW-LOCAL-ONLY) restricts database operations to physical local endpoints for hardware security.
      </div>
    </div>
  )}
 </div>

 {/* Schedule & Timing parameters */}
 <div className="bg-m3-surface-low/50 p-2.5 rounded-xl border border-m3-outline-variant/10 space-y-1.5 text-[11px] mt-2 text-left">
  <div className="flex items-center gap-1.5 border-b border-m3-outline-variant/10 pb-1.5 mb-1 text-m3-primary font-black uppercase tracking-wider">
   <Clock className="h-3.5 w-3.5 text-m3-primary" />
   <span>Operating Hours & Days</span>
  </div>
  <div className="flex justify-between">
   <span className="text-zinc-400 font-bold">BUSINESS HOURS:</span>
   <span className="text-m3-on-surface font-extrabold font-mono">
    {b.openingTime || '08:00'} - {b.closingTime || '18:00'}
   </span>
  </div>
  <div className="flex justify-between flex-col gap-1">
   <span className="text-zinc-400 font-bold">OPERATING DAYS:</span>
   <div className="flex flex-wrap gap-1 mt-0.5">
    {(b.operatingDays || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]).map((day) => (
     <span key={day} className="px-1.5 py-0.5 bg-m3-primary/10 text-m3-primary rounded text-[9px] font-extrabold border border-m3-primary/5">
      {day}
     </span>
    ))}
   </div>
  </div>
 </div>
 </div>

 {/* Collapsible Branch Employee Roster */}
 <div className="mx-0.5 mb-4 border border-m3-outline-variant/15 rounded-2xl bg-m3-surface/20 p-3 space-y-2">
 <button
 type="button"
 onClick={() => toggleBranchUsers(b.id)}
 className="w-full flex items-center justify-between text-xs font-black text-m3-primary hover:text-m3-primary/80 transition-all uppercase tracking-widest select-none font-mono"
 >
 <span className="flex items-center gap-1.5">
 <Users className="h-3.5 w-3.5 text-m3-primary" />
 <span>Branch Employees ({branchEmployees.length})</span>
 </span>
 {isExpanded ? (
 <ChevronUp className="h-4 w-4 text-m3-primary" />
 ) : (
 <ChevronDown className="h-4 w-4 text-m3-primary" />
 )}
 </button>

 <AnimatePresence initial={false}>
 {isExpanded && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: "auto", opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
 className="overflow-hidden space-y-2 pt-2 border-t border-m3-outline-variant/10 max-h-[180px] overflow-y-auto pr-1"
 >
 {branchEmployees.length === 0 ? (
 <div className="text-[10px] text-zinc-400 italic py-1 text-center font-medium">
 No active logins assigned to this branch.
 </div>
 ) : (
 branchEmployees.map((u) => (
 <div
 key={u.id}
 className="flex items-center justify-between p-2 rounded-xl bg-m3-surface-low/95 border border-m3-outline-variant/5 hover:border-m3-outline-variant/20 hover:bg-m3-surface transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
 >
 <div className="flex items-center gap-2.5 min-w-0">
 <div className="h-7 w-7 rounded-full bg-m3-primary/10 text-m3-primary font-mono text-[9px] font-black flex items-center justify-center shrink-0 border border-m3-primary/15 shadow-inner">
 {u.avatarInitials || (u.fullName ? u.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??')}
 </div>
 <div className="min-w-0">
 <span className="block text-xs font-bold text-m3-on-surface truncate leading-tight">
 {u.fullName}
 </span>
 <span className="block text-[9.5px] text-zinc-450 font-mono truncate leading-none mt-0.5">
 {u.email || `@${u.username}`}
 </span>
 </div>
 </div>
 <div className="flex flex-col items-end shrink-0 gap-1 pl-1">
 <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border leading-none ${
 u.role === UserRole.ADMIN 
 ? 'bg-purple-500/10 text-purple-600 border-purple-500/15'
 : u.role === UserRole.MANAGER
 ? 'bg-m3-primary/10 text-m3-primary border-m3-primary/15'
 : u.role === UserRole.CASHIER
 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/15'
 : 'bg-zinc-500/10 text-zinc-650 border-zinc-500/15'
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
 </div>

 {/* Calculations KPI footer metrics layout */}
 <div className="grid grid-cols-3 gap-2.5 bg-m3-surface/30 border-t border-m3-outline-variant/10 p-3 rounded-b-[24px]">
 <div className="space-y-0.5 text-center">
 <span className="text-[9px] uppercase tracking-widest font-bold text-m3-on-surface-variant/70">Staff roster</span>
 <div className="text-xs font-bold font-mono flex items-center justify-center gap-1 text-m3-on-surface">
 <Users className="h-3.5 w-3.5 text-m3-primary/70" /> {branchEmployees.length}
 </div>
 </div>

 <div className="space-y-0.5 text-center">
 <span className="text-[9px] uppercase tracking-widest font-bold text-m3-on-surface-variant/70">Terminal Cashiers</span>
 <div className="text-xs font-bold font-mono flex items-center justify-center gap-1 text-m3-on-surface">
 <CreditCard className="h-3.5 w-3.5 text-m3-tertiary/70" /> {branchEmployees.filter(u => u.role === UserRole.CASHIER).length || b.activeCashiers || 0}
 </div>
 </div>

 <div className="space-y-0.5 text-center">
 <span className="text-[9px] uppercase tracking-widest font-bold text-m3-on-surface-variant/70">Sales (MO)</span>
 <div className="text-xs font-black font-mono text-m3-tertiary flex items-center justify-center gap-0.5">
 <TrendingUp className="h-3.5 w-3.5" /> ₱{((sales ? sales.filter(s => s.branchId === b.id && s.createdAt.startsWith(new Date().toISOString().slice(0, 7)) && !s.isDeleted).reduce((sum, s) => sum + s.grandTotal, 0) : 0) || b.monthlySales || 0).toLocaleString(undefined, { notation: 'compact' })}
 </div>
 </div>
 </div>
 </div>
 );
 })}

 {branches.filter(b => !b.isDeleted && (isUserAdmin || b.id === currentUser?.branchAssignmentId)).length === 0 && (
 <div className="col-span-full py-12 text-center text-m3-on-surface-variant font-medium">No corporate branches logged. Use the launch button above.</div>
 )}
 </div>

 <TablePagination
 currentPage={branchPage}
 totalItems={branches.filter(b => !b.isDeleted && (isUserAdmin || b.id === currentUser?.branchAssignmentId)).length}
 pageSize={branchPageSize}
 onPageChange={setBranchPage}
 itemName="branches"
 />
 </div>

 {/* BRAND-WIDE RECEIPT CUSTOMIZER (INLINE & ACCESSIBLE) */}
 {isUserAdminOrManager && (
  <div className="bg-m3-surface-low border border-m3-outline-variant/20 rounded-[28px] p-6 shadow-sm space-y-6">
 <div>
 <h3 className="text-xs font-black text-m3-primary uppercase tracking-widest flex items-center gap-2 font-mono">
 <Receipt className="h-4.5 w-4.5 text-m3-primary" />
 Receipt & Promotional Customizer
 </h3>
 <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
 Configure social handles, promotional text, tax identifiers, and QR surveys printed at the bottom of customer receipts.
 </p>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
 {/* Left Column: Form */}
 <form onSubmit={handleSaveInlineReceiptSettings} className="lg:col-span-7 space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">
 Select Branch to Configure
 </label>
 <select
 value={inlineBranchId}
 onChange={e => setInlineBranchId(e.target.value)}
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-bold"
 >
 {activeBranchesForReceipt.map(b => (
 <option key={b.id} value={b.id}>
 {b.name} (ID: {b.id})
 </option>
 ))}
 </select>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">
 TIN (Taxpayer Identification Number)
 </label>
 <input
 type="text"
 value={inlineTin}
 onChange={e => setInlineTin(formatTin(e.target.value))}
 placeholder="e.g. 123-456-789-000"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">
 Facebook Page / Handle
 </label>
 <input
 type="text"
 value={inlineFacebook}
 onChange={e => setInlineFacebook(e.target.value)}
 placeholder="e.g. facebook.com/emmantilecenter"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-sans"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">
 Custom Thank You Message
 </label>
 <input
 type="text"
 value={inlineThankYou}
 onChange={e => setInlineThankYou(e.target.value)}
 placeholder="e.g. Thank you, come again!"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-sans"
 />
 </div>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">
 Promotional Message (Appears at Bottom of Receipt)
 </label>
 <textarea
 value={inlinePromoText}
 onChange={e => setInlinePromoText(e.target.value)}
 placeholder="e.g. Bring this receipt on your next visit to get 5% off select porcelain tile orders!"
 rows={2}
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-sans resize-none"
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* BRANCH LOGO UPLOAD */}
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">
 Branch Logo (for Receipts)
 </label>
 <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-m3-surface-lowest p-4 rounded-2xl border border-m3-outline-variant/30">
 <div className="h-16 w-16 rounded-xl border border-m3-outline-variant/50 bg-m3-surface-low flex items-center justify-center overflow-hidden flex-shrink-0 relative shadow-inner">
 {inlineStoreLogo ? (
 <img
 src={inlineStoreLogo}
 alt="Inline Branch Logo"
 className="h-full w-full object-contain"
 referrerPolicy="no-referrer"
 />
 ) : (
 <Image className="h-5 w-5 text-zinc-400" />
 )}
 </div>
 <div className="flex-1 space-y-2">
 <p className="text-[10px] text-zinc-400 font-medium">Upload a custom PNG logo to print at the very top of thermal branch receipts. Format must be PNG.</p>
 <div className="flex gap-2">
 <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-m3-primary/10 hover:bg-m3-primary/20 text-m3-primary rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer transition-colors border border-m3-primary/15 select-none">
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
 <div className="pt-2.5 border-t border-m3-outline-variant/20 mt-1 space-y-1.5">
 <div className="flex justify-between items-center text-[9.5px]">
 <span className="font-bold text-zinc-400 uppercase tracking-wider">Logo Height on Receipt</span>
 <span className="font-mono font-bold text-m3-primary bg-m3-primary/10 px-1.5 py-0.5 rounded">{inlineLogoSize}px</span>
 </div>
 <div className="flex items-center gap-2">
 <span className="text-[8.5px] text-zinc-500">20px</span>
 <input
 type="range"
 min="20"
 max="120"
 value={inlineLogoSize}
 onChange={(e) => setInlineLogoSize(Number(e.target.value))}
 className="flex-1 accent-m3-primary h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer"
 />
 <span className="text-[8.5px] text-zinc-500">120px</span>
 </div>
 <p className="text-[8.5px] text-zinc-500 leading-tight">
 Height in pixels. Width scales proportionally to fit receipt rolls perfectly.
 </p>
 </div>
 )}
 </div>
 </div>
 </div>

 {/* SURVEY / PROMO QR CODE */}
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">
 Survey / Promo QR Code
 </label>
 <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-m3-surface-lowest p-4 rounded-2xl border border-m3-outline-variant/30">
 <div className="h-16 w-16 rounded-xl border border-m3-outline-variant/50 bg-m3-surface-low flex items-center justify-center overflow-hidden flex-shrink-0 relative shadow-inner">
 {inlineQrBase64 ? (
 <img
 src={inlineQrBase64}
 alt="Inline Survey QR"
 className="h-full w-full object-contain"
 referrerPolicy="no-referrer"
 />
 ) : (
 <Image className="h-5 w-5 text-zinc-400" />
 )}
 </div>
 <div className="flex-1 space-y-2">
 <p className="text-[10px] text-zinc-400 font-medium">Upload a QR code linking to your store evaluation page, customer survey, or loyalty discounts.</p>
 <div className="flex gap-2">
 <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-m3-primary/10 hover:bg-m3-primary/20 text-m3-primary rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer transition-colors border border-m3-primary/15 select-none">
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

 <div className="flex justify-end pt-2">
 <button
 type="submit"
 disabled={!inlineBranchId}
 className="m3-btn-primary flex items-center gap-1.5 shadow-sm text-xs px-5 py-2 cursor-pointer disabled:opacity-50"
 >
 Save Receipt Template
 </button>
 </div>
 </form>

 {/* Right Column: Real-Time Receipt Preview */}
 <div className="lg:col-span-5 space-y-3">
 <div className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 font-mono flex items-center gap-1.5">
 <Receipt className="h-3.5 w-3.5" />
 <span>Real-Time Receipt Preview</span>
 <span className="text-[8px] bg-m3-primary/15 text-m3-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Live View</span>
 </div>

 {/* Thermal Receipt Virtual Box */}
 <div className="relative mx-auto max-w-[280px] bg-white text-zinc-900 py-5 px-5 border border-zinc-200 rounded-2xl shadow-lg font-mono select-none overflow-hidden text-[9px] leading-relaxed">
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
 {selectedBranchForPreview?.name || "EMMAN TILE CENTER"}
 </h4>
 )}

 <div className="text-[7.5px] text-zinc-600 font-semibold mt-0.5 leading-tight">
 {selectedBranchForPreview?.address || "Sta. Filomena, Dipolog City"}
 </div>

 <div className="text-[7px] text-zinc-500 mt-0.5">
 Contact: {selectedBranchForPreview?.phone || "0000"} • TIN {formatTin(inlineTin) || "000-111-222"}
 </div>
 </div>

 {/* Symmetrical dotted divider */}
 <div className="border-b border-dashed border-zinc-300 my-2.5"></div>

 {/* Transaction Metadata */}
 <div className="space-y-0.5 text-[7.5px] text-zinc-700">
 <div className="flex justify-between">
 <span>DATE & TIME:</span>
 <span>2026-07-14 05:48 UTC</span>
 </div>
 <div className="flex justify-between font-bold text-black">
 <span>INVOICE REF:</span>
 <span>PREVIEW-9999</span>
 </div>
 <div className="flex justify-between">
 <span>CASHIER:</span>
 <span>Admin (Live Preview)</span>
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
 <span className="col-span-7 text-zinc-500">₱380.00 / pc</span>
 <span className="col-span-2 text-right">1</span>
 <span className="col-span-3 text-right">₱380.00</span>
 </div>
 </div>
 <div>
 <div className="font-bold">Spanish Clay Terracotta (30x30)</div>
 <div className="grid grid-cols-12 gap-1">
 <span className="col-span-7 text-zinc-500">₱120.00 / pc</span>
 <span className="col-span-2 text-right">2</span>
 <span className="col-span-3 text-right">₱240.00</span>
 </div>
 </div>
 </div>

 {/* Symmetrical dotted divider */}
 <div className="border-b border-dashed border-zinc-300 my-2.5"></div>

 {/* Financial Summary */}
 <div className="space-y-1 text-[7.5px] text-zinc-800 font-mono">
 <div className="flex justify-between">
 <span>SUBTOTAL:</span>
 <span>₱620.00</span>
 </div>
 <div className="flex justify-between text-zinc-500 text-[7px]">
 <span>VATABLE SALES:</span>
 <span>₱553.57</span>
 </div>
 <div className="flex justify-between text-zinc-500 text-[7px]">
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
 <span className="font-bold tracking-tight block">
 {inlineThankYou}
 </span>
 ) : (
 <span className="italic">
 Thank you for shopping at {selectedBranchForPreview?.name || "Emman Tile Center"}!
 </span>
 )}
 </div>

 {(inlineFacebook || inlinePromoText || inlineQrBase64) && (
 <div className="space-y-3 border-t border-dashed border-zinc-200 pt-2.5">
 {inlineFacebook && (
 <div className="text-center text-[7.5px] text-zinc-700 flex flex-col items-center justify-center">
 <span className="font-extrabold uppercase text-m3-primary text-[7px] tracking-wider mb-0.5">Follow us on Facebook</span>
 <span className="font-bold text-black">{inlineFacebook}</span>
 </div>
 )}

 {inlinePromoText && (
 <div className="text-center text-[7.5px] text-zinc-700 flex flex-col items-center justify-center px-2 py-1.5 bg-amber-50 rounded border border-dashed border-amber-200">
 <span className="font-extrabold uppercase text-amber-600 text-[7px] tracking-wider mb-0.5">Special Promo</span>
 <p className="leading-snug text-center font-bold text-black">{inlinePromoText}</p>
 </div>
 )}

 {inlineQrBase64 && (
 <div className="flex flex-col items-center justify-center space-y-1">
 <span className="text-[6.5px] uppercase font-extrabold text-zinc-500 tracking-wider">Scan for Evaluation Survey</span>
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

 {/* Official Customer Transaction Acknowledgment statement */}
 <div className="text-center text-[6px] text-zinc-400 font-sans tracking-wide leading-normal">
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
 <div className="bg-m3-surface-low border border-m3-outline-variant/20 rounded-[28px] overflow-hidden shadow-sm mt-8">
 <div 
 onClick={() => setShowAllPersonnel(!showAllPersonnel)}
 className="p-5 border-b border-m3-outline-variant/15 flex justify-between items-center cursor-pointer hover:bg-m3-surface-low/60 transition-colors select-none"
 title="Click to toggle Section Visibility"
 >
 <div>
 <h3 className="text-xs font-black text-m3-primary uppercase tracking-widest flex items-center gap-2 font-mono">
 <Users className="h-4.5 w-4.5 text-m3-primary" />
 <span>Full Network Personnel Directory ({users.length})</span>
 {showAllPersonnel ? (
 <span className="text-[9px] bg-emerald-500/15 text-emerald-600 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">Expanded</span>
 ) : (
 <span className="text-[9px] bg-m3-primary/10 text-m3-primary px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">Collapsed</span>
 )}
 </h3>
 <p className="text-[10px] text-zinc-400 font-medium">Complete system roster of authorized personnel across all retail branches</p>
 </div>
 <button 
 type="button" 
 className="p-1.5 text-zinc-500 hover:text-m3-primary hover:bg-m3-outline-variant/10 rounded-full transition-all"
 >
 {showAllPersonnel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
 </button>
 </div>

 {showAllPersonnel && (
 <div className="p-6 space-y-4 animate-fade-in bg-m3-surface-lowest/40">
 {/* Search Input bar */}
 <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pb-2">
 <div className="relative flex-1 max-w-sm">
 <input
 type="text"
 value={personnelSearch}
 onChange={(e) => setPersonnelSearch(e.target.value)}
 placeholder="Search employees by name, role, email..."
 className="w-full bg-m3-surface border border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-xl"
 />
 </div>
 <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1.5">
 <span>Active Personnel Database Live Logs</span>
 </div>
 </div>

 {/* Directory Table Grid */}
 <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-m3-outline-variant">
 <table className="w-full text-left border-collapse min-w-[600px]">
 <thead>
 <tr className="bg-m3-surface text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-m3-outline-variant/15">
 <th className="py-3 px-4">Authorized Personnel</th>
 <th className="py-3 px-4">Role Classification</th>
 <th className="py-3 px-4">Branch Location Assignment</th>
 <th className="py-3 px-4">Communication Contact</th>
 <th className="py-3 px-4 text-center">Security PIN Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-m3-outline-variant/10 text-xs font-semibold">
 {filteredPersonnel
 .slice((personnelPage - 1) * personnelPageSize, personnelPage * personnelPageSize)
 .map((item) => {
 const assignedB = branches.find(b => b.id === item.branchAssignmentId);
 return (
 <tr key={item.id} className="hover:bg-m3-surface-container-low transition-colors">
 {/* Profile block */}
 <td className="py-3.5 px-4">
 <div className="flex items-center gap-3">
 <div className="h-8 w-8 rounded-full bg-m3-primary-container text-m3-on-primary-container font-mono text-xs font-black flex items-center justify-center border border-m3-primary/10">
 {item.avatarInitials || (item.fullName ? item.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??')}
 </div>
 <div>
 <div className="flex items-center gap-1.5">
 <span className="block font-bold text-m3-on-surface">{item.fullName}</span>
 {item.isNew && (
 <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5" title="Newly Enlisted Employee">
 <Sparkles className="h-2.5 w-2.5" /> NEW
 </span>
 )}
 </div>
 <span className="block text-[10px] text-zinc-400 font-mono font-medium">Employee ID: #{item.id}</span>
 </div>
 </div>
 </td>

 {/* Role Designation */}
 <td className="py-3.5 px-4">
 <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
 item.role === UserRole.ADMIN 
 ? 'bg-purple-500/10 text-purple-600 border-purple-500/15'
 : item.role === UserRole.MANAGER
 ? 'bg-m3-primary/10 text-m3-primary border-m3-primary/15'
 : item.role === UserRole.CASHIER
 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/15'
 : 'bg-zinc-500/10 text-zinc-650 border-zinc-500/15'
 }`}>
 {item.role}
 </span>
 </td>

 {/* Assigned Branch */}
 <td className="py-3.5 px-4">
 <div className="flex items-center gap-1.5 text-zinc-700">
 <Building2 className="h-3.5 w-3.5 text-m3-primary shrink-0" />
 <span className="font-bold text-m3-on-surface">{assignedB ? assignedB.name : 'Central Network / Unassigned'}</span>
 </div>
 </td>

 {/* Email & Communication info */}
 <td className="py-3.5 px-4 font-normal text-zinc-500">
 <div className="space-y-0.5">
 <span className="block text-xs font-bold font-mono text-m3-on-surface">{item.email || 'N/A'}</span>
 <span className="block text-[10.5px] text-zinc-405 font-mono">Handle: @{item.username}</span>
 </div>
 </td>

 {/* Override Credentials indicator */}
 <td className="py-3.5 px-4 text-center font-mono">
 {item.role === UserRole.ADMIN || item.role === UserRole.MANAGER ? (
 <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/15 text-[9px] font-bold">
 <ShieldCheck className="h-3 w-3" /> SECURE PIN CONFIG
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-500/5 text-zinc-400 border border-zinc-500/10 text-[9px]">
 STANDARD AUTH
 </span>
 )}
 </td>
 </tr>
 );
  })}
</tbody>
 </table>
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
 {showModal && (
 <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
 <div className="absolute inset-0 bg-gray-950/65 backdrop-blur-sm" onClick={() => setShowModal(false)} />
 <form
 onSubmit={handleSubmit}
 className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl space-y-4 bg-m3-surface-low text-m3-on-surface"
 >
 <div className="flex justify-between items-center border-b border-m3-outline-variant/20 pb-2.5 flex-shrink-0">
 <h3 className="text-base font-bold text-m3-primary flex items-center gap-2">
 <Building2 className="h-5 w-5" />
 <span>{isEditMode ? 'Modify Branch Records' : 'Launch New Store Location'}</span>
 </h3>
 <button type="button" onClick={() => setShowModal(false)} className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1 rounded-full hover:bg-m3-outline-variant/10">
 <X className="h-5 w-5" />
 </button>
 </div>

 {/* Custom Branch ID and Brand Logo fields */}
 <div className="space-y-1 relative">
 <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">
 Branch ID (System Code)
 </label>
 <input
 type="text"
 required
 value={customBranchId}
 onChange={e => setCustomBranchId(e.target.value)}
 placeholder="e.g. ETC_DIPOLOG MAIN, CHT_SINDANGAN"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono"
 />
 <p className="text-[9px] text-m3-on-surface-variant italic pl-1">
 {isEditMode 
 ? "Changing this ID will cascade update all linked employees, stock levels, shifts, sales, and transaction records."
 : "Leave empty to auto-generate or customize (e.g., ETC_DIPOLOG MAIN)"
 }
 </p>
 </div>

 <div className="space-y-1 relative">
 <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">Branch Name</label>
 <input
 type="text"
 required
 value={name}
 onChange={e => setName(e.target.value)}
 placeholder="TilePoint Silay branch"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md"
 />
 </div>

 <div className="space-y-1 relative">
 <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">Outlet Address</label>
 <input
 type="text"
 required
 value={address}
 onChange={e => setAddress(e.target.value)}
 placeholder="Rizal St, Silay, Negros Occidental"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md"
 />
 </div>

 <div className="space-y-1 relative">
 <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">Contact Line</label>
 <input
 type="text"
 required
 value={phone}
 onChange={e => setPhone(e.target.value)}
 placeholder="0917-123-4567"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md"
 />
 </div>

 <div className="space-y-1 relative">
 <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">TIN (Taxpayer Identification Number)</label>
 <input
 type="text"
 value={tin}
 onChange={e => setTin(formatTin(e.target.value))}
 placeholder="e.g. 123-456-789-000"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md"
 />
 </div>

 <div className="grid grid-cols-2 gap-3 pb-1">
 <div className="space-y-1 relative">
 <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">Staff roster</label>
 <input
 type="number"
 required
 value={staffCount}
 onChange={e => setStaffCount(Number(e.target.value))}
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono font-bold"
 />
 </div>

 <div className="space-y-1 relative">
 <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">Active Cashiers</label>
 <input
 type="number"
 required
 value={activeCashiers}
 onChange={e => setActiveCashiers(Number(e.target.value))}
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono font-bold"
 />
 </div>
 </div>

 <div className="space-y-1 relative">
 <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">Branch Security Code</label>
 <input
 type="text"
 required
 value={branchCode}
 onChange={e => setBranchCode(e.target.value)}
 placeholder="BR-SILAY"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono font-bold"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1 relative">
 <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">Local IP Binding</label>
 <input
 type="text"
 required
 value={localIp}
 onChange={e => setLocalIp(e.target.value)}
 placeholder="192.168.1.50"
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono font-bold"
 />
 </div>

 <div className="space-y-1 relative">
 <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">Gateway Rules</label>
 <select
 value={gatewayRules}
 onChange={e => setGatewayRules(e.target.value)}
 className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono font-bold"
 >
 <option value="ALLOW-LOCAL-ONLY">Local Only</option>
 <option value="RESTRICTED-OUTBOUND">Restricted</option>
 <option value="ALLOW-ALL-TRAFFIC">Allow All</option>
 </select>
 </div>
 </div>

 {/* Store Operating Schedule & Hours */}
 <div className="space-y-3.5 p-3.5 bg-m3-surface-lowest border border-m3-outline-variant/30 rounded-2xl animate-fade-in">
  <div className="flex items-center gap-1.5 border-b border-m3-outline-variant/10 pb-1.5">
   <Clock className="h-4 w-4 text-m3-primary" />
   <span className="text-[11px] font-black tracking-wider text-m3-primary uppercase">Branch Operating Hours & Days</span>
  </div>
  <div className="grid grid-cols-2 gap-3">
   <div className="space-y-1 relative">
    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Opening Time</label>
    <input
     type="time"
     value={openingTime}
     onChange={e => setOpeningTime(e.target.value)}
     className="w-full bg-m3-surface border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-1.5 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono"
    />
   </div>
   <div className="space-y-1 relative">
    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Closing Time</label>
    <input
     type="time"
     value={closingTime}
     onChange={e => setClosingTime(e.target.value)}
     className="w-full bg-m3-surface border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-1.5 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono"
    />
   </div>
  </div>
  <div className="space-y-1.5">
   <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1 block">Operating Weekdays</label>
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
         ? "bg-m3-primary text-m3-on-primary border-m3-primary shadow-sm" 
         : "bg-m3-surface text-m3-on-surface-variant border-m3-outline-variant/30 hover:bg-m3-primary/10"
       }`}
      >
       {day}
      </button>
     );
    })}
   </div>
  </div>
 </div>

 {/* Distribution Branch Switcher */}
 {isUserAdmin && (
 <div className="flex items-center gap-3 p-3 bg-m3-surface-lowest border border-m3-outline-variant/30 rounded-2xl animate-fade-in select-none">
 <input
 type="checkbox"
 id="isDistributionBranchCheckbox"
 checked={isEditMode && editingId === primaryBranchId ? true : isDistributionBranch}
 disabled={isEditMode && editingId === primaryBranchId}
 onChange={e => setIsDistributionBranch(e.target.checked)}
 className="h-4.5 w-4.5 text-m3-primary border-m3-outline focus:ring-m3-primary rounded cursor-pointer accent-m3-primary"
 />
 <label htmlFor="isDistributionBranchCheckbox" className="text-xs font-black text-m3-on-surface cursor-pointer leading-tight">
 {isEditMode && editingId === primaryBranchId ? 'Main Branch / HQ' : 'Distribution Hub Designation'}
 <span className="block text-[9.5px] text-m3-on-surface-variant font-medium mt-1 leading-normal">
 {isEditMode && editingId === primaryBranchId 
 ? 'This main HQ location has implicit global distribution privileges.' 
 : 'Grant this branch authority to compile Inter-Branch Digital Transmittals.'}
 </span>
 </label>
 </div>
  )}

  {/* Present Employee Selector Checklist & Inline Employee Adder */}
  <div className="space-y-3 p-3.5 bg-m3-surface-lowest border border-m3-outline-variant/30 rounded-2xl animate-fade-in text-left">
   <div className="flex items-center gap-1.5 border-b border-m3-outline-variant/10 pb-1.5">
    <Users className="h-4 w-4 text-m3-primary" />
    <span className="text-[11px] font-black tracking-wider text-m3-primary uppercase">Staff & Cashier Roster</span>
   </div>
   
   {/* Select present employees */}
   <div className="space-y-2">
    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1 block">Assign Existing Employees</label>
    <div className="max-h-32 overflow-y-auto border border-m3-outline-variant/15 rounded-lg p-2 space-y-1.5 bg-m3-surface">
     {users.filter(u => u.status === 'Active' && u.role !== UserRole.ADMIN).map(u => {
      const isAssigned = selectedEmployeeIds.includes(u.id);
      return (
       <label key={u.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer text-m3-on-surface hover:text-m3-primary select-none">
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
         className="h-3.5 w-3.5 text-m3-primary border-m3-outline rounded cursor-pointer accent-m3-primary"
        />
        <span>{u.fullName} <span className="text-[9px] text-m3-on-surface-variant font-bold uppercase font-mono">({u.role})</span></span>
       </label>
      );
     })}
     {users.filter(u => u.status === 'Active' && u.role !== UserRole.ADMIN).length === 0 && (
      <div className="text-[10px] text-zinc-400 italic text-center py-2">No active employees available to select.</div>
     )}
    </div>
   </div>

   {/* Inline Employee Adder */}
   <div className="space-y-2 border-t border-m3-outline-variant/10 pt-2.5">
    <div className="flex justify-between items-center">
     <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Register New Employee Inline</label>
     <button
      type="button"
      onClick={() => setShowAddInlineStaff(!showAddInlineStaff)}
      className="text-[9.5px] font-black text-m3-primary hover:text-m3-primary/85 transition-all flex items-center gap-0.5 uppercase tracking-wider"
     >
      <Plus className="h-3 w-3" /> {showAddInlineStaff ? 'Collapse' : 'Add Staff'}
     </button>
    </div>

    {showAddInlineStaff && (
     <div className="p-2.5 bg-m3-surface border border-m3-outline-variant/15 rounded-xl space-y-2.5 animate-fade-in text-left">
      <div className="space-y-1">
       <input
        type="text"
        placeholder="Full Name (e.g. Juan Cruz)"
        value={inlineFullName}
        onChange={e => setInlineFullName(e.target.value)}
        className="w-full bg-m3-surface-lowest border-b border-m3-outline-variant/40 focus:border-m3-primary px-2 py-1 text-xs text-m3-on-surface focus:outline-none rounded-t-sm"
       />
      </div>
      <div className="grid grid-cols-2 gap-2">
       <input
        type="text"
        placeholder="Username"
        value={inlineUsername}
        onChange={e => setInlineUsername(e.target.value)}
        className="w-full bg-m3-surface-lowest border-b border-m3-outline-variant/40 focus:border-m3-primary px-2 py-1 text-xs text-m3-on-surface focus:outline-none rounded-t-sm"
       />
       <input
        type="text"
        placeholder="4-6 Digit Security PIN"
        maxLength={6}
        value={inlinePin}
        onChange={e => setInlinePin(e.target.value.replace(/\D/g, ''))}
        className="w-full bg-m3-surface-lowest border-b border-m3-outline-variant/40 focus:border-m3-primary px-2 py-1 text-xs text-m3-on-surface focus:outline-none rounded-t-sm font-mono"
       />
      </div>
      <div className="grid grid-cols-2 gap-2">
       <input
        type="email"
        placeholder="Email Address"
        value={inlineEmail}
        onChange={e => setInlineEmail(e.target.value)}
        className="w-full bg-m3-surface-lowest border-b border-m3-outline-variant/40 focus:border-m3-primary px-2 py-1 text-xs text-m3-on-surface focus:outline-none rounded-t-sm"
       />
       <select
        value={inlineRole}
        onChange={e => setInlineRole(e.target.value as UserRole)}
        className="w-full bg-m3-surface-lowest border-b border-m3-outline-variant/40 focus:border-m3-primary px-2 py-1 text-xs text-m3-on-surface focus:outline-none rounded-t-sm"
       >
        <option value={UserRole.CASHIER}>Cashier</option>
        {isUserAdmin && <option value={UserRole.MANAGER}>Manager</option>}
        <option value={UserRole.STAFF}>Staff</option>
       </select>
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
       className="w-full py-1.5 bg-m3-primary text-m3-on-primary rounded-lg text-xs font-bold hover:bg-m3-primary/90 transition-all cursor-pointer text-center"
      >
       Stage Staff Enrollment
      </button>
     </div>
    )}

    {/* Render list of staged inline enrollments */}
    {inlineStaffList.length > 0 && (
     <div className="space-y-1 mt-1.5 text-left">
      <div className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-400">Staged Staff Pending Save:</div>
      <div className="space-y-1">
       {inlineStaffList.map((s, idx) => (
        <div key={idx} className="flex justify-between items-center text-xs bg-m3-surface-lowest p-1.5 px-2.5 rounded-lg border border-m3-outline-variant/20">
         <span>{s.fullName} <span className="text-[9px] text-m3-primary uppercase font-bold">({s.role})</span></span>
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

 <div className="flex justify-end gap-2 border-t border-m3-outline-variant/20 pt-4 flex-shrink-0">
 <button
 type="button"
 onClick={() => setShowModal(false)}
 className="px-4 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-m3-outline-variant/15 text-m3-on-surface-variant transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="m3-btn-primary px-5 py-2 text-xs shadow-sm cursor-pointer animate-press"
 >
 Save Outlet Detail
 </button>
 </div>
 </form>
 </div>
 )}

 {/* CUSTOM M3 ALERT DIALOG: Confirmation before delete to avoid blocking browser popups */}
 {confirmDeleteId && (
 <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
 <div className="absolute inset-0 bg-gray-950/65 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)} />
 <div className="relative w-full max-w-xs max-h-[90vh] overflow-y-auto rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface text-center space-y-4">
 <div className="mx-auto h-12 w-12 rounded-full bg-m3-primary-container text-m3-on-primary-container flex items-center justify-center">
 <AlertTriangle className="h-6 w-6" />
 </div>
 <div>
 <h4 className="text-sm font-black text-m3-primary">Archive Store Location?</h4>
 <p className="text-xs text-m3-on-surface-variant/80 mt-2 leading-relaxed">
 Are you sure you want to soft-delete <span className="font-extrabold text-m3-on-surface">{confirmDeleteName}</span>? This item can be restored by DB administrators later.
 </p>
 </div>
 <div className="flex gap-2 justify-center pt-2">
 <button
 onClick={() => setConfirmDeleteId(null)}
 className="px-4 py-2 text-xs font-bold bg-m3-outline-variant/15 text-m3-on-surface-variant rounded-full hover:bg-m3-outline-variant/25 transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={proceedWithDelete}
 className="px-4 py-2 text-xs font-bold bg-m3-primary text-m3-on-primary rounded-full hover:bg-m3-primary/90 transition-colors shadow-sm"
 >
 Confirm Delete
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Success toast alert bar */}
 {toastMessage && (
 <div className="fixed bottom-6 right-6 bg-m3-on-surface text-m3-surface text-xs font-bold py-3 px-5 rounded-[16px] shadow-xl z-50 border border-m3-outline-variant/30 flex items-center gap-2 animate-bounce max-w-[280px]">
 <ShieldCheck className="h-4.5 w-4.5 text-m3-tertiary shrink-0" />
 <span className="leading-tight">{toastMessage}</span>
 </div>
 )}
 </div>
 );
}
