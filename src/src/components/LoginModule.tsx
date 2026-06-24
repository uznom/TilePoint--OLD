/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useDb } from '../context/DbContext';
import { 
  Lock, 
  User, 
  ShieldAlert, 
  CheckCircle2, 
  Terminal, 
  ArrowRight, 
  KeyRound, 
  ShieldCheck, 
  Wifi, 
  Cpu, 
  Eye, 
  EyeOff,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserRole } from '../types/db';

export const LoginModule: React.FC = () => {
  const { login, isRateLimited, rateLimitTimeLeft, users, simulationModeActive } = useDb();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSQLiBlocked, setIsSQLiBlocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // List of seeded accounts for quick simulation select
  const simulatedAccounts: any[] = simulationModeActive ? [
    { name: 'Simulated Admin', username: 'admin', pass: 'admin123', role: 'ADMIN', avatar: 'AD', desc: 'Full authority, bypasses standard restrictions.' },
    { name: 'Simulated Manager', username: 'manager', pass: 'tilepoint', role: 'MANAGER', avatar: 'MN', desc: 'Approves transmittals, manages stock & pricing.' },
    { name: 'Simulated Cashier', username: 'cashier', pass: 'tilepoint', role: 'CASHIER', avatar: 'CS', desc: 'Performs checkout sales in POS module.' },
    { name: 'Simulated Staff', username: 'staff', pass: 'tilepoint', role: 'STAFF', avatar: 'ST', desc: 'Checks prices & scans catalogs in staff portal.' }
  ] : [];

  const handleSelectAccount = (acc: any) => {
    setUsername(acc.username);
    setPassword(acc.pass);
    setErrorMsg(null);
    setIsSQLiBlocked(false);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg('Please enter both employee handle and password.');
      return;
    }

    setErrorMsg(null);
    setIsSQLiBlocked(false);
    setIsSubmitting(true);

    // Check SQL keywords
    const lowerUser = username.toLowerCase();
    const lowerPass = password.toLowerCase();
    const sqlRegex = /' or |" or |union select|drop table|delete from|insert into|--|#|\/\*/i;
    const hasSQLiUser = sqlRegex.test(lowerUser);
    const hasSQLiPass = sqlRegex.test(lowerPass);

    if (hasSQLiUser || hasSQLiPass) {
      setIsSubmitting(false);
      setIsSQLiBlocked(true);
      const res = await login(username, password); // Log inside DbProvider audit
      setErrorMsg(res.error || 'Access Denied. Query blocking protocol active.');
      return;
    }

    // Small delay to feel professional but fast
    await new Promise(resolve => setTimeout(resolve, 400));

    const loginResult = await login(username, password);
    
    if (!loginResult.success) {
      setErrorMsg(loginResult.error || 'Authentication failure.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-m3-surface text-m3-on-surface flex flex-col md:flex-row justify-center items-center p-4 md:p-8 relative overflow-hidden transition-all duration-300">
      
      {/* Background design accents */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-m3-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-m3-primary/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Main card box Container */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10 my-auto">
        
        {/* LEFT COLUMN: BRAND PROMOTION & SIMULATED EMPLOYEE CARDS */}
        <div className="lg:col-span-7 flex flex-col gap-6 text-left">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black bg-m3-primary/10 text-m3-primary border border-m3-primary/25 mb-4">
              <ShieldCheck className="h-4 w-4" /> SECURE TERMINAL GATEWAY
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-m3-on-surface leading-none uppercase">
              TilePoint <span className="text-m3-primary">HQ POS</span>
            </h2>
            <p className="text-sm md:text-base text-m3-on-surface-variant max-w-lg mt-2.5 font-medium">
              Enterprise-grade Point-of-Sale and Stock Management Terminal. Protected with real-time access control policies and secure localized database integrity.
            </p>
          </div>

          {/* Simulate role block inside login card */}
          {simulatedAccounts.length > 0 && (
            <div className="m3-card !rounded-2xl border-m3-outline-variant/30 mt-1">
              <h3 className="text-xs font-black uppercase tracking-widest text-m3-primary flex items-center gap-2 mb-3">
                <Cpu className="h-4 w-4" /> Simulation & Role Pre-selectors
              </h3>
              <p className="text-xs text-m3-on-surface-variant font-medium mb-4">
                Instantly switch accounts to preview the specific role layouts, clearance tiers, and permissions across the POS, Inventory, and Admin panels:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {simulatedAccounts.map((acc) => (
                  <button
                    key={acc.username}
                    onClick={() => handleSelectAccount(acc)}
                    className={`flex items-start text-left gap-3 p-3.5 rounded-xl border border-m3-outline-variant/35 bg-m3-surface hover:bg-m3-primary-container/30 hover:border-m3-primary/40 transition-all cursor-pointer group ${
                      username === acc.username ? 'ring-2 ring-m3-primary/80 bg-m3-primary-container/20 border-m3-primary/50' : ''
                    }`}
                  >
                    <div className="h-9 w-9 rounded-xl bg-m3-primary text-m3-on-primary font-extrabold text-sm justify-center items-center flex m3-shape-asymmetric shadow-sm shrink-0">
                      {acc.avatar}
                    </div>
                    <div>
                      <span className="text-xs font-black text-m3-on-surface block leading-tight">{acc.name}</span>
                      <span className="text-[10px] uppercase font-bold text-m3-primary tracking-wide block mb-0.5">{acc.role}</span>
                      <span className="text-[10px] text-m3-on-surface-variant leading-tight block">{acc.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 text-xs font-medium text-m3-on-surface-variant pl-2">
            <Wifi className="h-4 w-4 text-emerald-500" />
            <span>Active Local Database Connection Verified • Online Sync Ready</span>
          </div>
        </div>

        {/* RIGHT COLUMN: RECTANGULAR SECURE FORM */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="m3-card !rounded-3xl border-m3-outline-variant/40 bg-m3-surface-low shadow-xl flex flex-col p-6 md:p-8">
            <div className="flex flex-col mb-6">
              <h3 className="text-xl font-extrabold text-m3-on-surface flex items-center gap-2">
                <Lock className="h-5 w-5 text-m3-primary" /> Key Verification
              </h3>
              <p className="text-xs text-m3-on-surface-variant mt-1 font-medium">Please enter your company assigned login identity.</p>
            </div>

            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-5 p-3.5 rounded-xl text-xs flex items-start gap-2.5 font-bold ${
                  isSQLiBlocked 
                    ? 'bg-rose-500/10 text-rose-500 border border-rose-500/35' 
                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/35'
                }`}
              >
                <ShieldAlert className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            {isRateLimited && (
              <div className="mb-5 p-4 rounded-xl bg-red-500/15 text-red-500 border border-red-500/30 text-xs font-extrabold text-center flex flex-col justify-center items-center gap-2">
                <ShieldAlert className="h-6 w-6 animate-bounce" />
                <span>SECURITY LOCK ACTIVE: Excessive failed validation tokens.</span>
                <span className="text-[10px] uppercase font-mono block px-2.5 py-1 bg-red-500/10 rounded-full text-red-500 border border-red-500/20">
                  Cooldown locks: {rateLimitTimeLeft}s remaining
                </span>
              </div>
            )}

            <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
              {/* Username Input */}
              <div className="flex flex-col gap-1 text-left">
                <label className="text-xs font-extrabold text-m3-on-surface-variant uppercase tracking-widest pl-1">Employee ID / Username</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-m3-on-surface-variant/70" />
                  <input
                    type="text"
                    disabled={isRateLimited || isSubmitting}
                    placeholder="e.g. erica_admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-m3-outline-variant/65 cursor-text disabled:opacity-50 disabled:bg-m3-surface-container bg-m3-surface text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-primary/50 text-sm font-semibold transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="flex flex-col gap-1 text-left">
                <span className="text-xs font-extrabold text-m3-on-surface-variant uppercase tracking-widest pl-1">Security Code / Password</span>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-m3-on-surface-variant/70" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    disabled={isRateLimited || isSubmitting}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-m3-outline-variant/65 cursor-text disabled:opacity-50 disabled:bg-m3-surface-container bg-m3-surface text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-primary/50 text-sm font-semibold transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-xl text-m3-on-surface-variant/70 hover:text-m3-primary transition-all cursor-pointer"
                    title="Toggle security eye"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isRateLimited || isSubmitting || !username || !password}
                className="w-full py-3.5 mt-2 rounded-xl bg-m3-primary text-m3-on-primary font-extrabold text-xs tracking-wider uppercase cursor-pointer hover:bg-m3-primary/95 shadow-md flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm disabled:opacity-50 disabled:translate-y-0 transition-all font-sans"
              >
                {isSubmitting ? 'Verifying Credentials...' : 'Sign In'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};
