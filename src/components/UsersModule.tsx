/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useDb } from '../context/DbContext';
import { User, UserRole, UserStatus } from '../types/db';
import {
  Users,
  ShieldCheck,
  UserPlus,
  Edit2,
  Lock,
  Power,
  X,
  MapPin,
  Mail,
  ShieldAlert
} from 'lucide-react';

interface UsersModuleProps {
  darkMode: boolean;
}

export const UsersModule: React.FC<UsersModuleProps> = ({ darkMode }) => {
  const {
    users,
    branches,
    createUser,
    updateUser,
    resetPassword,
    currentUser
  } = useDb();

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

  const isUserAdmin = currentUser.role === UserRole.ADMIN;

  const getBranchName = (id: string) => {
    const b = branches.find(br => br.id === id);
    return b ? b.name : 'Unassigned Branch';
  };

  const handleOpenAdd = () => {
    setFullName('');
    setUsername('');
    setEmail('');
    setRole(UserRole.CASHIER);
    setBranchAssignmentId('B1');
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
    setBranchAssignmentId(u.branchAssignmentId);
    setStatus(u.status);
    setManagerPin(u.managerPin || '');

    setIsEditMode(true);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isUserAdmin) {
       showToast('Permission Denied: Corporate structure edits are locked to Admins.');
       return;
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
      createUser(payload);
      showToast(`Registered and enlisted ${fullName} successfully.`);
    }

    setShowModal(false);
  };

  const handleToggleStatus = (u: User) => {
    if (!isUserAdmin) {
      showToast('Action Denied: Requires Administrator credentials.');
      return;
    }
    const targetStatus: UserStatus = u.status === 'Active' ? 'Disabled' : 'Active';
    updateUser(u.id, { status: targetStatus });
    showToast(`Changed Account status for ${u.fullName} to ${targetStatus}.`);
  };

  const handleResetPassword = (id: string, name: string) => {
    if (!isUserAdmin) {
      showToast('Action Denied: Requires Administrator credentials.');
      return;
    }
    resetPassword(id);
    showToast(`Temporary password initialized to default for ${name}.`);
  };

  return (
    <div className="space-y-6 animate-fade-in text-m3-on-surface">
      {/* Search Header */}
      <div className="flex justify-between items-center bg-m3-surface-low/95 backdrop-blur-md p-4 rounded-[20px] border border-m3-outline-variant/20 sticky top-0 z-20 shadow-md">
        <div>
          <h3 className="text-xs font-black tracking-widest text-m3-primary uppercase font-mono">Staff Administration Panel</h3>
          <p className="text-xs text-m3-on-surface-variant/80 mt-0.5">Role-Based Access Control list (RBAC)</p>
        </div>

        {isUserAdmin && (
          <button
            onClick={handleOpenAdd}
            className="m3-btn-primary flex items-center gap-1.5 cursor-pointer shadow-sm text-xs shrink-0"
          >
            <UserPlus className="h-4.5 w-4.5" /> Enlist Employee
          </button>
        )}
      </div>

      {/* Grid of users card logs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {users.map((u) => {
          // Status badge coloring
          const activeClass = u.status === 'Active'
            ? 'bg-m3-tertiary-container text-m3-on-tertiary-container border-m3-tertiary/20'
            : 'bg-m3-primary-container text-m3-on-primary-container border-m3-primary/20';

          // Role Badge visual styles
          let roleClass = 'bg-m3-outline-variant/30 text-m3-on-surface';
          if (u.role === UserRole.ADMIN) roleClass = 'bg-m3-primary-container text-m3-on-primary-container border-m3-primary/30';
          if (u.role === UserRole.MANAGER) roleClass = 'bg-m3-tertiary-container text-m3-on-tertiary-container border-m3-tertiary/30';
          if (u.role === UserRole.CASHIER) roleClass = 'bg-m3-secondary-container text-m3-on-secondary-container';

          return (
            <div
              key={u.id}
              className="m3-card shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200"
            >
              <div className="space-y-4">
                {/* Employee general headers */}
                <div className="flex items-center justify-between border-b border-m3-outline-variant/20 pb-3">
                  <div className="flex items-center gap-3">
                    {/* Visual initials emblem circular badge */}
                    <div className="h-11 w-11 rounded-[16px] bg-m3-primary/10 text-m3-primary text-sm font-black flex items-center justify-center tracking-tight shadow-inner border border-m3-outline-variant/15 overflow-hidden">
                      {u.profilePicture ? (
                        <img src={u.profilePicture} alt={u.fullName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        u.avatarInitials
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold tracking-tight text-m3-on-surface">{u.fullName}</h4>
                      <p className="text-[10px] text-m3-on-surface-variant font-mono">@{u.username}</p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase border ${activeClass}`}>
                    {u.status}
                  </span>
                </div>

                {/* Body Specs */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-m3-on-surface-variant/80 font-medium">Assigned Role:</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide border uppercase ${roleClass}`}>{u.role}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-m3-on-surface-variant/80 font-medium">Department Branch:</span>
                    <span className="flex items-center gap-1 font-semibold text-m3-on-surface">
                      <MapPin className="h-3 w-3 text-m3-primary" />
                      <span>{getBranchName(u.branchAssignmentId)}</span>
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[10.5px]">
                    <span className="text-m3-on-surface-variant/80 font-medium font-mono">Corporate Email:</span>
                    <span className="flex items-center gap-1 font-mono text-m3-on-surface-variant font-medium">
                      <Mail className="h-3 w-3 text-m3-on-surface-variant/60" />
                      {u.email}
                    </span>
                  </div>

                  {(u.role === UserRole.ADMIN || u.role === UserRole.MANAGER) && (
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="text-m3-on-surface-variant/80 font-medium">Security PIN code:</span>
                      <span className="font-mono text-amber-500 font-black bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-md">
                        {u.managerPin || 'Not Set'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Commands for admin operation */}
              {isUserAdmin && (
                <div className="flex gap-2 border-t border-m3-outline-variant/20 pt-3 mt-4 justify-end">
                  <button
                    onClick={() => handleResetPassword(u.id, u.fullName)}
                    className="p-1.5 px-2.5 hover:bg-m3-primary/5 text-[10.5px] font-bold text-m3-primary rounded-full flex items-center gap-1 cursor-pointer transition-colors"
                    title="Initialize configuration reset procedures"
                  >
                    <Lock className="h-3.5 w-3.5" /> Password reset
                  </button>

                  <button
                    onClick={() => handleToggleStatus(u)}
                    className={`p-1.5 px-3 text-[10.5px] font-bold rounded-full flex items-center gap-1 cursor-pointer transition-colors ${
                      u.status === 'Active'
                        ? 'text-m3-primary hover:bg-m3-primary/5'
                        : 'text-m3-tertiary hover:bg-m3-tertiary/5'
                    }`}
                  >
                    <Power className="h-3.5 w-3.5" />
                    {u.status === 'Active' ? 'Deactivate' : 'Enable login'}
                  </button>

                  <button
                    onClick={() => handleOpenEdit(u)}
                    className="p-1.5 px-3 hover:bg-m3-outline-variant/15 text-[10.5px] font-bold text-m3-on-surface-variant rounded-full flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Edit details
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL: Add / Edit User profile form */}
      {showModal && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="absolute inset-0 bg-gray-950/65 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <form
            onSubmit={handleSubmit}
            className="relative w-full max-w-sm rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl space-y-4 bg-m3-surface-low text-m3-on-surface"
          >
            <div className="flex justify-between items-center border-b border-m3-outline-variant/20 pb-2.5">
              <h3 className="text-base font-bold text-m3-primary flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span>{isEditMode ? 'Modify Employee Specs' : 'Enlist New Employee Profile'}</span>
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1 rounded-full hover:bg-m3-outline-variant/10">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* M3 Filled-style Bottom-bordered Input Fields */}
            <div className="space-y-1 relative">
              <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">Primary Display Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Carla Reyes"
                className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md"
              />
            </div>

            <div className="space-y-1 relative">
              <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">Terminal Username ID</label>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="carla_cashier"
                className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md"
              />
            </div>

            <div className="space-y-1 relative">
              <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">Corporate Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="carla@tilepoint.com"
                className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md"
              />
            </div>

            <div className="space-y-1 relative">
              <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">Operational Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as UserRole)}
                className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md cursor-pointer"
              >
                <option value={UserRole.ADMIN}>Admin - Full Corporate Access</option>
                <option value={UserRole.MANAGER}>Manager - Branch Supervisor</option>
                <option value={UserRole.CASHIER}>Cashier - POS Sales Clerk</option>
                <option value={UserRole.STAFF}>Staff - Mobile Stock Logistics Checker</option>
              </select>
            </div>

            {(role === UserRole.ADMIN || role === UserRole.MANAGER) && (
              <div className="space-y-1 relative">
                <label className="text-[10px] font-bold text-amber-500 uppercase tracking-widest pl-1">Override Security PIN Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={managerPin}
                  onChange={e => setManagerPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 9988"
                  className="w-full bg-m3-surface-lowest border-b-2 border-amber-550 focus:border-amber-500 px-3 py-2 text-xs text-m3-on-surface font-semibold focus:outline-none transition-colors rounded-t-md font-mono"
                />
                <span className="text-[9px] text-zinc-400 pl-1 block">A 4-to-6 digit passcode (e.g. 9988 or 4321) distinct from terminal account password.</span>
              </div>
            )}

            <div className="space-y-1 relative">
              <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">Primary Branch Assignment</label>
              <select
                value={branchAssignmentId}
                onChange={e => setBranchAssignmentId(e.target.value)}
                className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md cursor-pointer"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
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
                className="m3-btn-primary px-5 py-2 text-xs shadow-sm cursor-pointer"
              >
                Save Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Corporate non-blocking success toast alert bar */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-m3-on-surface text-m3-surface text-xs font-bold py-3 px-5 rounded-[16px] shadow-xl z-50 border border-m3-outline-variant/30 flex items-center gap-2 animate-bounce max-w-[280px]">
          <ShieldCheck className="h-4.5 w-4.5 text-m3-tertiary shrink-0" />
          <span className="leading-tight">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
