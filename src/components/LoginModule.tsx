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
 Eye, 
 EyeOff,
 Database,
 Shield,
 FileText,
 X,
 Building2,
 Store,
 UserCheck,
 Receipt,
 HardHat,
 Layers,
 Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const LoginModule: React.FC = () => {
 const { login, isRateLimited, rateLimitTimeLeft, users, resetLockout, serverConnected } = useDb();

 const [username, setUsername] = useState('');
 const [password, setPassword] = useState('');
 const [showPassword, setShowPassword] = useState(false);
 const [errorMsg, setErrorMsg] = useState<string | null>(null);
 const [isSQLiBlocked, setIsSQLiBlocked] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [acceptedTerms, setAcceptedTerms] = useState(false);
 const [showTermsModal, setShowTermsModal] = useState(false);

 const storeLogo = typeof window !== 'undefined' ? (localStorage.getItem("tilepoint_store_logo_v1") || '') : '';

 // Matched user helper
 const matchedUser = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());

 const getRoleBadge = (roleStr?: string) => {
  const r = (roleStr || '').toLowerCase();
  if (r.includes('admin')) return { label: 'Administrator', icon: ShieldCheck, color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' };
  if (r.includes('manager')) return { label: 'Store Manager', icon: UserCheck, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' };
  if (r.includes('cashier')) return { label: 'Cashier Terminal', icon: Receipt, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
  return { label: 'Staff Member', icon: HardHat, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
 };

 const handleManualSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!acceptedTerms) {
   setErrorMsg('Please read and accept the Terms & Conditions before signing in.');
   return;
  }
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
  <div className="min-h-screen bg-m3-surface text-m3-on-surface flex flex-col justify-center items-center p-4 md:p-8 relative overflow-hidden transition-all duration-300">
  
   {/* Background design accents */}
   <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-m3-primary/5 rounded-full blur-[120px] pointer-events-none" />
   <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-m3-primary/5 rounded-full blur-[120px] pointer-events-none" />

   {/* Main card box Container */}
   <div className="w-full max-w-xl flex flex-col gap-6 items-center relative z-10 my-auto text-center">
  
    {/* BRAND PROMOTION: Center aligned with Logo Icon */}
    <div className="flex flex-col items-center">
     {storeLogo ? (
      <img 
       src={storeLogo} 
       alt="Store Logo" 
       className="h-20 w-20 object-contain mb-3 rounded-2xl shadow-lg border border-m3-outline-variant/30 bg-m3-surface-low p-2" 
       referrerPolicy="no-referrer" 
      />
     ) : (
      <div className="h-16 w-16 rounded-2xl bg-m3-primary/10 text-m3-primary border border-m3-primary/20 flex items-center justify-center mb-3 shadow-md shadow-m3-primary/5">
       <Building2 className="h-8 w-8" />
      </div>
     )}
     <h2 className="text-3xl md:text-5xl font-black tracking-tight text-m3-on-surface leading-none uppercase">
      TilePoint
     </h2>
     <p className="text-xs md:text-sm text-m3-on-surface-variant max-w-md mt-2.5 font-semibold tracking-wide">
      Enterprise Resource Planning and Stock Management Terminal
     </p>
    </div>

    {/* SECURE FORM: Max width matching a clean desktop login width */}
    <div className="w-full max-w-md flex flex-col gap-6">
     <div className="m3-card !rounded-3xl border-m3-outline-variant/40 bg-m3-surface-low shadow-xl flex flex-col p-6 md:p-8">
      <div className="flex flex-col mb-6 text-left">
       <h3 className="text-xl font-extrabold text-m3-on-surface flex items-center gap-2">
        <Lock className="h-5 w-5 text-m3-primary" /> Key Verification
       </h3>
       
      </div>

      {errorMsg && (
       <motion.div 
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`mb-5 p-3.5 rounded-xl text-xs flex items-start gap-2.5 font-bold text-left ${
         isSQLiBlocked 
          ? 'bg-rose-500/10 text-rose-500 border border-rose-500/35' 
          : 'bg-amber-500/10 text-amber-500 border border-amber-500/35'
        }`}
       >
        <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
        <span>{errorMsg}</span>
       </motion.div>
      )}

      {isRateLimited && (
       <div className="mb-5 p-4 rounded-xl bg-red-500/15 text-red-500 border border-red-500/30 text-xs font-extrabold text-center flex flex-col justify-center items-center gap-2">
        <ShieldAlert className="h-6 w-6 animate-bounce" />
        <span>SECURITY LOCK ACTIVE: Excessive failed validation tokens.</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-mono block px-2.5 py-1 bg-red-500/10 rounded-full text-red-500 border border-red-500/20">
           Cooldown locks: {rateLimitTimeLeft}s remaining
          </span>
          <button
            type="button"
            onClick={resetLockout}
            className="text-[10px] uppercase font-bold px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors cursor-pointer"
          >
            Reset Lockout
          </button>
        </div>
       </div>
      )}

      <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
       {/* Username Input */}
       <div className="flex flex-col gap-1 text-left">
        <label className="text-xs font-extrabold text-m3-on-surface-variant uppercase tracking-widest pl-1">Employee ID / Username</label>
        <div className="relative">
         <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-m3-on-surface-variant/70 pointer-events-none z-10" />
         <input
          type="text"
          disabled={isRateLimited || isSubmitting}
          placeholder="Enter username"
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
         <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-m3-on-surface-variant/70 pointer-events-none z-10" />
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
          className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-xl text-m3-on-surface-variant/70 hover:text-m3-primary transition-all cursor-pointer z-20"
          title="Toggle password visibility"
         >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
         </button>
        </div>
       </div>

       {/* Terms of Service Consent */}
       <div className="flex items-start gap-2.5 my-2 text-left font-sans">
        <input
         id="login-terms-checkbox"
         type="checkbox"
         disabled={isRateLimited || isSubmitting}
         checked={acceptedTerms}
         onChange={(e) => setAcceptedTerms(e.target.checked)}
         className="mt-0.5 h-4 w-4 rounded border-m3-outline-variant/60 text-m3-primary focus:ring-m3-primary/50 cursor-pointer bg-m3-surface transition-all shrink-0"
        />
        <label htmlFor="login-terms-checkbox" className="text-[11px] font-medium leading-tight text-m3-on-surface-variant select-none">
         I accept the{' '}
         <button
          type="button"
          onClick={() => setShowTermsModal(true)}
          className="text-m3-primary hover:underline font-extrabold cursor-pointer inline bg-transparent p-0 border-0 outline-none"
         >
          Terms &amp; Conditions of Use
         </button>{' '}
         protecting proprietary system code &amp; developer legal safety.
        </label>
       </div>

       {/* Submit Button */}
       <button
        type="submit"
        disabled={isRateLimited || isSubmitting || !username || !password || !acceptedTerms}
        className="w-full py-3.5 mt-1 rounded-xl bg-m3-primary text-m3-on-primary font-extrabold text-xs tracking-wider uppercase cursor-pointer hover:bg-m3-primary/95 shadow-md flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm disabled:opacity-50 disabled:translate-y-0 transition-all font-sans"
       >
        {isSubmitting ? (
         <>
          <Cpu className="h-4 w-4 animate-spin" /> Verifying Credentials...
         </>
        ) : (
         <>
          Sign In <ArrowRight className="h-4 w-4" />
         </>
        )}
       </button>
      </form>
     </div>
    </div>

   </div>

   {/* TERMS & CONDITIONS PROPRIETARY MODAL */}
   <AnimatePresence>
    {showTermsModal && (
     <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
       initial={{ opacity: 0 }}
       animate={{ opacity: 1 }}
       exit={{ opacity: 0 }}
       onClick={() => setShowTermsModal(false)}
       className="absolute inset-0 bg-gray-950/75 backdrop-blur-sm"
      />

      {/* Modal Box */}
      <motion.div
       initial={{ opacity: 0, scale: 0.95, y: 15 }}
       animate={{ opacity: 1, scale: 1, y: 0 }}
       exit={{ opacity: 0, scale: 0.95, y: 15 }}
       className="relative w-full max-w-2xl bg-m3-surface-low border border-m3-outline-variant/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
      >
       {/* Header */}
       <div className="p-5 border-b border-m3-outline-variant/15 flex items-center justify-between bg-m3-surface-lowest/60">
        <div className="flex items-center gap-2.5 text-left">
         <div className="h-9 w-9 rounded-xl bg-m3-primary/10 text-m3-primary flex items-center justify-center">
          <Shield className="h-5 w-5" />
         </div>
         <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-m3-on-surface">Terms &amp; Conditions of Use</h3>
          <span className="text-[10px] text-m3-on-surface-variant font-bold uppercase tracking-widest">Confidential Proprietary Software Agreement</span>
         </div>
        </div>
        <button
         type="button"
         onClick={() => setShowTermsModal(false)}
         className="p-1.5 rounded-full text-m3-on-surface-variant hover:bg-m3-outline-variant/15 hover:text-m3-on-surface transition-all cursor-pointer"
         title="Close terms modal"
        >
         <X className="h-5 w-5" />
        </button>
       </div>

       {/* Scrollable Body */}
       <div className="p-6 overflow-y-auto text-xs text-m3-on-surface-variant text-left font-medium space-y-4 leading-relaxed scrollbar-thin">
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 text-[11px] font-bold flex items-start gap-2.5">
         <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
         <span>
          LEGAL NOTICE: THIS SOFTWARE IS FULLY PROPRIETARY AND PROTECTED BY NATIONAL AND INTERNATIONAL LAWS. UNAUTHORIZED CLONING, COPYING, SHARE, OR RESALE CARRIES SEVERE CRIMINAL AND CIVIL PENALTIES.
         </span>
        </div>

        <div>
         <h4 className="text-[11px] font-black uppercase tracking-wider text-m3-on-surface mb-1 flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-m3-primary" /> 1. Intellectual Property & Statutory Ownership
         </h4>
         <p>
          The <strong>TilePoint HQ ERP OS</strong> (including all TypeScript/React source code, backend assets, specialized schemas, database structures such as <code>server-db.json</code>, custom setup routines, and visual layouts) is the sole and exclusive copyrighted intellectual property of <strong>Erica Manaban and Mark Jefferson Monares / TilePoint Enterprise</strong> (the "Developers").
         </p>
         <p className="mt-2 pl-3 border-l-2 border-m3-primary/30 text-m3-on-surface font-semibold italic">
          Protected under <strong>Republic Act No. 8293</strong> (The Intellectual Property Code of the Philippines, Class A Computer Programs), the <strong>Berne Convention</strong>, and the <strong>WIPO Copyright Treaty (WCT)</strong>. Copying or white-labeling is strictly prohibited.
         </p>
        </div>

        <div>
         <h4 className="text-[11px] font-black uppercase tracking-wider text-m3-on-surface mb-1 flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-m3-primary" /> 2. Cybercrime Safeguards & System Integrity
         </h4>
         <p>
          Unauthorized system access, code tampering, database structure exfiltration, credential manipulation, or active-host replication violates Section 4 of <strong>Republic Act No. 10175</strong> (The Cybercrime Prevention Act of 2012). Violations constitute criminal offenses carrying high-penalty custodial sentences and extensive court fines.
         </p>
        </div>

        <div>
         <h4 className="text-[11px] font-black uppercase tracking-wider text-m3-on-surface mb-1 flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-m3-primary" /> 3. PHP 500,000 Liquidated Damages Clause
         </h4>
         <p>
          Any verified breach of this Agreement—including but not limited to sharing source code, distributing active preview/hosting links to unauthorized third parties, replication of database design, or unauthorized white-labeling—commits the violating party to liquidated damages of no less than <strong>Five Hundred Thousand Philippine Pesos (PHP 500,000.00)</strong> per occurrence, or the total revenue generated from unauthorized utilization, whichever is higher, plus legal and litigation expenses.
         </p>
        </div>

        <div>
         <h4 className="text-[11px] font-black uppercase tracking-wider text-m3-on-surface mb-1 flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-m3-primary" /> 4. "As-Is" Warranty Waiver & Liability Limitation
         </h4>
         <p>
          This Software is supplied <strong>"AS-IS"</strong> and <strong>"AS-AVAILABLE"</strong>. The Developers provide no guarantees regarding local tax audit compliance, Bureau of Internal Revenue (BIR) ledger declarations, ledger math compatibility, or database backup durability. The Operator bears 100% of the risk for transaction accuracy and regulatory compliance.
         </p>
        </div>

        <div>
         <h4 className="text-[11px] font-black uppercase tracking-wider text-m3-on-surface mb-1 flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-m3-primary" /> 5. Full Developer Indemnification
         </h4>
         <p>
          By accepting these terms, you agree to indemnify, defend, and hold harmless the Developers from any third-party claims, operational losses, business downtime, or regulatory tax penalties resulting from your utilization or deployment of this system.
         </p>
        </div>

        <div className="pt-3 border-t border-m3-outline-variant/15 text-[10px] text-m3-on-surface-variant/70 italic text-center">
         Copyright &copy; 2026 Erica Manaban and Mark Jefferson Monares / TilePoint Enterprise. All Rights Reserved.
        </div>
       </div>

       {/* Footer */}
       <div className="p-4 border-t border-m3-outline-variant/15 bg-m3-surface-lowest/60 flex justify-end gap-3">
        <button
         type="button"
         onClick={() => {
          setShowTermsModal(false);
         }}
         className="px-4 py-2 border border-m3-outline-variant/60 rounded-xl text-xs font-bold text-m3-on-surface hover:bg-m3-outline-variant/10 transition-all cursor-pointer"
        >
         Close &amp; Dismiss
        </button>
        <button
         type="button"
         onClick={() => {
          setAcceptedTerms(true);
          setShowTermsModal(false);
         }}
         className="px-5 py-2 rounded-xl bg-m3-primary text-m3-on-primary font-black text-xs uppercase tracking-wider hover:bg-m3-primary/95 shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
        >
         <ShieldCheck className="h-4 w-4" /> Accept Terms &amp; Conditions
        </button>
       </div>
      </motion.div>
     </div>
    )}
   </AnimatePresence>
  </div>
 );
};
