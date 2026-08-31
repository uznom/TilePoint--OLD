/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
} from 'lucide-react';
import React, { useState } from 'react';
import { useDb } from '../context/DbContext';
import {
  HeroAlert,
  HeroButton,
  HeroCard,
  HeroCheckbox,
  HeroInput,
  HeroModal,
  HeroProgress,
} from './common/ui';

export const LoginModule: React.FC = () => {
  const { login, isRateLimited, rateLimitTimeLeft, clearServerErrorState, setIsConfigured } = useDb();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSQLiBlocked, setIsSQLiBlocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const storeLogo = typeof window !== 'undefined' ? (localStorage.getItem('tilepoint_store_logo_v1') || '') : '';

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
    clearServerErrorState();

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

    const loginResult = await login(username, password);

    if (!loginResult.success) {
      setErrorMsg(loginResult.error || 'Authentication failure.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center p-4 md:p-8 relative overflow-hidden transition-all duration-300">
      {/* Background design accents */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Main card box Container */}
      <div className="w-full max-w-xl flex flex-col gap-6 items-center relative z-10 my-auto text-center">
        {/* BRAND PROMOTION: Center aligned with Logo Icon */}
        <div className="flex flex-col items-center">
          {storeLogo ? (
            <img
              src={storeLogo}
              alt="Store Logo"
              className="h-20 w-20 object-contain mb-3 rounded-2xl shadow-lg border border-divider/30 bg-content1 p-2"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-3 shadow-md shadow-primary/25/5">
              <Building2 className="h-8 w-8" />
            </div>
          )}
          <h2 className="text-3xl md:text-5xl font-black text-foreground leading-none uppercase">
            TilePoint
          </h2>
          <p className="text-xs md:text-sm text-default-500 max-w-md mt-2.5 font-semibold tracking-wide">
            Enterprise Resource Planning and Stock Management Terminal
          </p>
        </div>

        {/* SECURE FORM: Max width matching a clean desktop login width */}
        <div className="w-full max-w-md flex flex-col gap-6">
          <HeroCard variant="bordered" radius="lg" className="shadow-xl text-left relative overflow-hidden">
            {isSubmitting && (
              <div className="absolute top-0 left-0 right-0 z-20">
                <HeroProgress isIndeterminate size="sm" color="primary" />
              </div>
            )}

            <HeroCard.Header className="pb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Key Verification</h3>
                  <p className="text-[11px] text-default-400">Authenticate with assigned system credentials</p>
                </div>
              </div>
            </HeroCard.Header>

            <HeroCard.Body className="pt-2">
              {errorMsg && (
                <HeroAlert
                  variant="flat"
                  color={isSQLiBlocked ? 'danger' : 'warning'}
                  title="Validation Warning"
                  description={errorMsg}
                  className="mb-4"
                />
              )}

              {isRateLimited && (
                <HeroAlert
                  variant="solid"
                  color="danger"
                  title="Security Lock Active"
                  description={`Excessive failed validation tokens. Cooldown locks: ${rateLimitTimeLeft}s remaining`}
                  className="mb-4"
                />
              )}

              <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
                {/* Username Input */}
                <HeroInput
                  label="Employee ID / Username"
                  placeholder="Enter username"
                  value={username}
                  onValueChange={setUsername}
                  isDisabled={isRateLimited || isSubmitting}
                  startContent={<User className="h-4 w-4 text-default-400" />}
                  isRequired
                />

                {/* Password Input */}
                <HeroInput
                  type={showPassword ? 'text' : 'password'}
                  label="Security Code / Password"
                  placeholder="••••••••••••"
                  value={password}
                  onValueChange={setPassword}
                  isDisabled={isRateLimited || isSubmitting}
                  startContent={<KeyRound className="h-4 w-4 text-default-400" />}
                  isRequired
                  endContent={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-default-400 hover:text-default-700 dark:hover:text-default-200 transition-colors p-1 cursor-pointer"
                      title="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />

                {/* Terms of Service Consent */}
                <div className="my-1">
                  <HeroCheckbox
                    id="login-terms-checkbox"
                    disabled={isRateLimited || isSubmitting}
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    color="primary"
                    size="sm"
                    label={
                      <span className="text-[11px] font-medium leading-tight text-default-500 select-none">
                        I accept the{' '}
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.preventDefault();
                            setShowTermsModal(true);
                          }}
                          className="text-primary hover:underline font-extrabold cursor-pointer inline bg-transparent p-0 border-0 outline-none"
                        >
                          Terms &amp; Conditions of Use
                        </button>{' '}
                        protecting proprietary system code &amp; developer legal safety.
                      </span>
                    }
                  />
                </div>

                {/* Submit Button */}
                <HeroButton
                  type="submit"
                  isDisabled={isRateLimited || isSubmitting || !username || !password || !acceptedTerms}
                  isLoading={isSubmitting}
                  loadingText="Verifying Credentials..."
                  color="primary"
                  variant="solid"
                  size="lg"
                  fullWidth
                  endIcon={!isSubmitting ? <ArrowRight className="h-4 w-4" /> : undefined}
                  className="mt-1 font-extrabold text-xs tracking-wider uppercase shadow-md"
                >
                  Sign In
                </HeroButton>

                {/* Initial Setup Switcher */}
                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        localStorage.setItem('tp_is_configured', 'false');
                        localStorage.setItem('tilepoint_onboarded_setup', 'false');
                      } catch (storageErr) {
                        console.warn('[Login Reconfigure] Failed to update configuration flags in localStorage:', storageErr);
                      }
                      setIsConfigured(false);
                    }}
                    className="text-xs font-semibold text-default-400 hover:text-primary transition-colors cursor-pointer"
                  >
                    First time setup or need to reconfigure? Launch Setup Wizard
                  </button>
                </div>
              </form>
            </HeroCard.Body>
          </HeroCard>
        </div>
      </div>

      {/* TERMS & CONDITIONS PROPRIETARY MODAL */}
      <HeroModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        size="2xl"
      >
        <HeroModal.Header>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Terms &amp; Conditions of Use</h3>
              <p className="text-[10px] text-default-400 font-bold uppercase tracking-widest">Confidential Proprietary Software Agreement</p>
            </div>
          </div>
        </HeroModal.Header>

        <HeroModal.Body>
          <div className="text-xs text-default-600 dark:text-default-300 text-left font-medium space-y-4 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400 text-[11px] font-bold flex items-start gap-2.5">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <span>
                LEGAL NOTICE: THIS SOFTWARE IS FULLY PROPRIETARY AND PROTECTED BY NATIONAL AND INTERNATIONAL LAWS.
                UNAUTHORIZED CLONING, COPYING, SHARE, OR RESALE CARRIES SEVERE CRIMINAL AND CIVIL PENALTIES.
              </span>
            </div>

            <div>
              <h4 className="text-[11px] font-black uppercase tracking-wider text-foreground mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" /> 1. Intellectual Property & Statutory Ownership
              </h4>
              <p>
                The <strong>TilePoint HQ ERP OS</strong> (including all TypeScript/React source code, backend assets,
                specialized schemas, database structures such as <code>server-db.json</code>, custom setup routines,
                and visual layouts) is the sole and exclusive copyrighted intellectual property of{' '}
                <strong>Erica Manaban and Mark Jefferson Monares / TilePoint Enterprise</strong> (the &quot;Developers&quot;).
              </p>
              <p className="mt-2 pl-3 border-l-2 border-primary/30 text-foreground font-semibold italic">
                Protected under <strong>Republic Act No. 8293</strong> (The Intellectual Property Code of the
                Philippines, Class A Computer Programs), the <strong>Berne Convention</strong>, and the{' '}
                <strong>WIPO Copyright Treaty (WCT)</strong>. Copying or white-labeling is strictly prohibited.
              </p>
            </div>

            <div>
              <h4 className="text-[11px] font-black uppercase tracking-wider text-foreground mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" /> 2. Cybercrime Safeguards & System Integrity
              </h4>
              <p>
                Unauthorized system access, code tampering, database structure exfiltration, credential
                manipulation, or active-host replication violates Section 4 of{' '}
                <strong>Republic Act No. 10175</strong> (The Cybercrime Prevention Act of 2012). Violations
                constitute criminal offenses carrying high-penalty custodial sentences and extensive court fines.
              </p>
            </div>

            <div>
              <h4 className="text-[11px] font-black uppercase tracking-wider text-foreground mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" /> 3. PHP 500,000 Liquidated Damages Clause
              </h4>
              <p>
                Any verified breach of this Agreement—including but not limited to sharing source code, distributing
                active preview/hosting links to unauthorized third parties, replication of database design, or
                unauthorized white-labeling—commits the violating party to liquidated damages of no less than{' '}
                <strong>Five Hundred Thousand Philippine Pesos (PHP 500,000.00)</strong> per occurrence, or the total
                revenue generated from unauthorized utilization, whichever is higher, plus legal and litigation
                expenses.
              </p>
            </div>

            <div>
              <h4 className="text-[11px] font-black uppercase tracking-wider text-foreground mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" /> 4. &quot;As-Is&quot; Warranty Waiver & Liability Limitation
              </h4>
              <p>
                This Software is supplied <strong>&quot;AS-IS&quot;</strong> and <strong>&quot;AS-AVAILABLE&quot;</strong>. The
                Developers provide no guarantees regarding local tax audit compliance, Bureau of Internal Revenue
                (BIR) ledger declarations, ledger math compatibility, or database backup durability. The Operator
                bears 100% of the risk for transaction accuracy and regulatory compliance.
              </p>
            </div>

            <div>
              <h4 className="text-[11px] font-black uppercase tracking-wider text-foreground mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" /> 5. Full Developer Indemnification
              </h4>
              <p>
                By accepting these terms, you agree to indemnify, defend, and hold harmless the Developers from any
                third-party claims, operational losses, business downtime, or regulatory tax penalties resulting from
                your utilization or deployment of this system.
              </p>
            </div>

            <div className="pt-3 border-t border-divider text-[10px] text-default-400 italic text-center">
              Copyright &copy; {new Date().getFullYear()} Erica Manaban and Mark Jefferson Monares / TilePoint
              Enterprise. All Rights Reserved.
            </div>
          </div>
        </HeroModal.Body>

        <HeroModal.Footer>
          <div className="flex items-center justify-end gap-2 w-full">
            <HeroButton
              type="button"
              variant="flat"
              color="default"
              size="sm"
              onClick={() => setShowTermsModal(false)}
            >
              Close &amp; Dismiss
            </HeroButton>
            <HeroButton
              type="button"
              color="primary"
              variant="solid"
              size="sm"
              onClick={() => {
                setAcceptedTerms(true);
                setShowTermsModal(false);
              }}
              startIcon={<ShieldCheck className="h-4 w-4" />}
              className="font-black text-xs uppercase tracking-wider shadow-md"
            >
              Accept Terms &amp; Conditions
            </HeroButton>
          </div>
        </HeroModal.Footer>
      </HeroModal>
    </div>
  );
};
