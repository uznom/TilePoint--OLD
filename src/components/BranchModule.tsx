/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useDb } from '../context/DbContext';
import { Branch, UserRole } from '../types/db';
import {
  Building2,
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
  User
} from 'lucide-react';

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
    users
  } = useDb();

  // Create Modal settings
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState('');

  // Form Fields State
  const [name, setName] = useState('');
  const [manager, setManager] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [monthlySales, setMonthlySales] = useState(500000);
  const [staffCount, setStaffCount] = useState(5);
  const [activeCashiers, setActiveCashiers] = useState(1);
  const [isDistributionBranch, setIsDistributionBranch] = useState(false);

  // Custom states for employees visibility
  const [expandedBranchUsers, setExpandedBranchUsers] = useState<Record<string, boolean>>({});
  const [showAllPersonnel, setShowAllPersonnel] = useState(false);
  const [personnelSearch, setPersonnelSearch] = useState('');

  // Custom visual popups and toasts (Strictly avoiding iframe-blocking alert/confirm)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string>('');

  const isUserAdmin = currentUser.role === UserRole.ADMIN;

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
    setName('');
    setManager('');
    setAddress('');
    setPhone('');
    setMonthlySales(450000);
    setStaffCount(5);
    setActiveCashiers(1);
    setIsDistributionBranch(false);

    setIsEditMode(false);
    setShowModal(true);
  };

  const handleOpenEdit = (b: Branch) => {
    setEditingId(b.id);
    setName(b.name);
    setManager(b.manager);
    setAddress(b.address);
    setPhone(b.phone);
    setMonthlySales(b.monthlySales);
    setStaffCount(b.staffCount);
    setActiveCashiers(b.activeCashiers);
    setIsDistributionBranch(b.isDistributionBranch || false);

    setIsEditMode(true);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isUserAdmin) {
      showToast('Permission Denied: Branch modifications are restricted to Admins.');
      return;
    }

    const payload = {
      name,
      manager,
      address,
      phone,
      monthlySales: Number(monthlySales),
      staffCount: Number(staffCount),
      activeCashiers: Number(activeCashiers),
      isDistributionBranch,
    };

    if (isEditMode) {
      updateBranch(editingId, payload);
      showToast(`Updated records for branch '${name}'.`);
    } else {
      createBranch(payload);
      showToast(`Launched new branch location '${name}'.`);
    }
    setShowModal(false);
  };

  const triggerDelete = (id: string, branchName: string) => {
    if (!isUserAdmin) {
      showToast('Permission Denied: Branch deletion is restricted to Admins.');
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {branches.filter(b => !b.isDeleted).map((b) => {
          const branchEmployees = users.filter(u => u.branchAssignmentId === b.id);
          const isExpanded = !!expandedBranchUsers[b.id];
          return (
            <div
              key={b.id}
              className="m3-card shadow-sm transition-transform duration-250 hover:scale-[1.01] relative overflow-hidden flex flex-col justify-between"
            >
              {/* Top outline band */}
              <div className="flex items-start justify-between border-b border-m3-outline-variant/15 pb-3">
                <div className="space-y-1.5 border-b border-m3-outline-variant/5 pb-1">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-m3-primary/10 text-m3-primary border border-m3-outline-variant/15">
                      <Building2 className="h-4.5 w-4.5" />
                    </div>
                    <h4 className="text-sm font-extrabold tracking-tight text-m3-on-surface">{b.name}</h4>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-m3-on-surface-variant/90 pl-1">
                    <UserCheck className="h-3.5 w-3.5 text-m3-tertiary font-bold" />
                    <span>Manager: <strong className="font-bold text-m3-on-surface">{b.manager}</strong></span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1 pl-1">
                    {b.id === 'B1' && (
                      <span className="text-[9px] font-black uppercase font-mono tracking-widest bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded border border-amber-500/20">
                        Main HQ
                      </span>
                    )}
                    {(b.id === 'B1' || b.isDistributionBranch) && (
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

                {isExpanded && (
                  <div className="space-y-2 pt-2 border-t border-m3-outline-variant/10 animate-fade-in max-h-[180px] overflow-y-auto pr-1">
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
                                ? 'bg-blue-500/10 text-blue-600 border-blue-500/15'
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
                  </div>
                )}
              </div>

              {/* Calculations KPI footer metrics layout */}
              <div className="grid grid-cols-3 gap-2.5 bg-m3-surface/30 border-t border-m3-outline-variant/10 p-3 rounded-b-[24px]">
                <div className="space-y-0.5 text-center">
                  <span className="text-[9px] uppercase tracking-widest font-bold text-m3-on-surface-variant/70">Staff roster</span>
                  <div className="text-xs font-bold font-mono flex items-center justify-center gap-1 text-m3-on-surface">
                    <Users className="h-3.5 w-3.5 text-m3-primary/70" /> {b.staffCount}
                  </div>
                </div>

                <div className="space-y-0.5 text-center">
                  <span className="text-[9px] uppercase tracking-widest font-bold text-m3-on-surface-variant/70">Terminal Cashiers</span>
                  <div className="text-xs font-bold font-mono flex items-center justify-center gap-1 text-m3-on-surface">
                    <CreditCard className="h-3.5 w-3.5 text-m3-tertiary/70" /> {b.activeCashiers}
                  </div>
                </div>

                <div className="space-y-0.5 text-center">
                  <span className="text-[9px] uppercase tracking-widest font-bold text-m3-on-surface-variant/70">Sales (MO)</span>
                  <div className="text-xs font-black font-mono text-m3-tertiary flex items-center justify-center gap-0.5">
                    <TrendingUp className="h-3.5 w-3.5" /> ₱{b.monthlySales.toLocaleString(undefined, { notation: 'compact' })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {branches.filter(b => !b.isDeleted).length === 0 && (
          <div className="col-span-full py-12 text-center text-m3-on-surface-variant font-medium">No corporate branches logged. Use the launch button above.</div>
        )}
      </div>

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
                  {users
                    .filter(u => {
                      if (!personnelSearch) return true;
                      const term = personnelSearch.toLowerCase();
                      return (
                        u.fullName.toLowerCase().includes(term) ||
                        u.role.toLowerCase().includes(term) ||
                        u.email.toLowerCase().includes(term) ||
                        u.username.toLowerCase().includes(term)
                      );
                    })
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
                                <span className="block font-bold text-m3-on-surface">{item.fullName}</span>
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
                                ? 'bg-blue-500/10 text-blue-600 border-blue-500/15'
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
              <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">Manager Name</label>
              <input
                type="text"
                required
                value={manager}
                onChange={e => setManager(e.target.value)}
                placeholder="Carlos Diaz"
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

            {/* Distribution Branch Switcher */}
            {isUserAdmin && (
              <div className="flex items-center gap-3 p-3 bg-m3-surface-lowest border border-m3-outline-variant/30 rounded-2xl animate-fade-in select-none">
                <input
                  type="checkbox"
                  id="isDistributionBranchCheckbox"
                  checked={isEditMode && editingId === 'B1' ? true : isDistributionBranch}
                  disabled={isEditMode && editingId === 'B1'}
                  onChange={e => setIsDistributionBranch(e.target.checked)}
                  className="h-4.5 w-4.5 text-m3-primary border-m3-outline focus:ring-m3-primary rounded cursor-pointer accent-m3-primary"
                />
                <label htmlFor="isDistributionBranchCheckbox" className="text-xs font-black text-m3-on-surface cursor-pointer leading-tight">
                  {isEditMode && editingId === 'B1' ? 'Main Branch / HQ' : 'Distribution Hub Designation'}
                  <span className="block text-[9.5px] text-m3-on-surface-variant font-medium mt-1 leading-normal">
                    {isEditMode && editingId === 'B1' 
                      ? 'This main HQ location has implicit global distribution privileges.' 
                      : 'Grant this branch authority to compile Inter-Branch Digital Transmittals.'}
                  </span>
                </label>
              </div>
            )}

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
};
