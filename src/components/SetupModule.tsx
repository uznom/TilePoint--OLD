/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Database,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Moon,
  RefreshCw,
  Sun,
  Upload,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useState } from 'react';
import { useDb } from '../context/DbContext';
import { applyHeroUIThemeToDOM, getStoredHeroUIConfig, saveHeroUIConfig } from '../lib/herouiThemeEngine';
import {
  HeroAlert,
  HeroButton,
  HeroInput,
  HeroProgress,
} from './common/ui';

export const SetupModule: React.FC = () => {
  const { setupSystem, triggerSystemProcessing } = useDb();

  // Dark mode & UI Style state for live switching during Setup
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof document !== "undefined" && document.documentElement.classList.contains("dark")) {
      return true;
    }
    const saved = localStorage.getItem("tilepoint_dark_theme");
    if (saved !== null) {
      return saved === "true";
    }
    return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // Keep DOM, theme engine, and localStorage in sync with theme
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("tilepoint_dark_theme", "true");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("tilepoint_dark_theme", "false");
    }
    localStorage.setItem("tilepoint_follow_system_theme", "false");
    try {
      saveHeroUIConfig({ mode: isDarkMode ? "dark" : "light" });
      applyHeroUIThemeToDOM({ ...getStoredHeroUIConfig(), mode: isDarkMode ? "dark" : "light" });
    } catch (e) {
      console.warn("Theme sync in setup:", e);
    }
  }, [isDarkMode]);

  const getSetupDraft = (key: string, defaultValue = ""): string => {
    if (typeof window === "undefined") return defaultValue;
    return sessionStorage.getItem(key) || localStorage.getItem(key) || defaultValue;
  };

  const [step, setStep] = useState<number>(() => {
    const cached = getSetupDraft("tp_setup_step");
    return cached ? Number(cached) : 1;
  });

  // Step 1: Admin Data
  const [fullName, setFullName] = useState(() => getSetupDraft("tp_setup_fullName"));
  const [username, setUsername] = useState(() => getSetupDraft("tp_setup_username"));
  const [email, setEmail] = useState(() => getSetupDraft("tp_setup_email"));
  const [password, setPassword] = useState(() => getSetupDraft("tp_setup_password"));
  const [showPassword, setShowPassword] = useState(false);
  const [managerPin, setManagerPin] = useState(() => getSetupDraft("tp_setup_managerPin"));

  // Step 2: Branch Data - Clean empty initial state without forced B1
  const [branchId, setBranchId] = useState(() => getSetupDraft("tp_setup_branchId"));
  const [branchName, setBranchName] = useState(() => getSetupDraft("tp_setup_branchName"));
  const [branchAddress, setBranchAddress] = useState(() => getSetupDraft("tp_setup_branchAddress"));
  const [branchPhone, setBranchPhone] = useState(() => getSetupDraft("tp_setup_branchPhone"));
  const [storeLogo, setStoreLogo] = useState(() => getSetupDraft("tp_setup_storeLogo"));

  // Convert selected files to base64
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "image/png" && !file.name.toLowerCase().endsWith(".png")) {
        setErrorMsg("Strict Requirement: Please upload a PNG image only (.png).");
        return;
      }
      if (file.size > 1.5 * 1024 * 1024) {
        setErrorMsg("Store Logo size must be less than 1.5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setStoreLogo(reader.result as string);
        setErrorMsg(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Deployment States
  const [isDeploying, setIsDeploying] = useState(() => getSetupDraft("tp_setup_isDeploying") === "true");
  const [deployStep, setDeployStep] = useState(() => {
    const cached = getSetupDraft("tp_setup_deployStep");
    return cached ? Number(cached) : 0;
  });
  const [installSuccess, setInstallSuccess] = useState(() => getSetupDraft("tp_setup_installSuccess") === "true");
  const [installProgress, setInstallProgress] = useState(() => {
    const cached = getSetupDraft("tp_setup_installProgress");
    return cached ? Number(cached) : 0;
  });

  // Track state changes to sessionStorage and localStorage for draft resilience
  useEffect(() => {
    const draftEntries: Record<string, string> = {
      tp_setup_step: String(step),
      tp_setup_fullName: fullName,
      tp_setup_username: username,
      tp_setup_email: email,
      tp_setup_password: password,
      tp_setup_managerPin: managerPin,
      tp_setup_branchId: branchId,
      tp_setup_branchName: branchName,
      tp_setup_branchAddress: branchAddress,
      tp_setup_branchPhone: branchPhone,
      tp_setup_storeLogo: storeLogo,
      tp_setup_isDeploying: String(isDeploying),
      tp_setup_deployStep: String(deployStep),
      tp_setup_installSuccess: String(installSuccess),
      tp_setup_installProgress: String(installProgress),
    };

    Object.entries(draftEntries).forEach(([k, v]) => {
      try {
        sessionStorage.setItem(k, v);
        localStorage.setItem(k, v);
      } catch (storageErr) {
        console.warn('[Setup Wizard] Failed to persist setup draft key:', k, storageErr);
      }
    });
  }, [
    step,
    fullName,
    username,
    email,
    password,
    managerPin,
    branchId,
    branchName,
    branchAddress,
    branchPhone,
    storeLogo,
    isDeploying,
    deployStep,
    installSuccess,
    installProgress,
  ]);

  // Clean setup credentials from storage upon final portal initialization
  const clearSetupSession = () => {
    const keys = [
      "tp_setup_step",
      "tp_setup_fullName",
      "tp_setup_username",
      "tp_setup_email",
      "tp_setup_password",
      "tp_setup_managerPin",
      "tp_setup_branchId",
      "tp_setup_branchName",
      "tp_setup_branchAddress",
      "tp_setup_branchPhone",
      "tp_setup_storeLogo",
      "tp_setup_isDeploying",
      "tp_setup_deployStep",
      "tp_setup_installSuccess",
      "tp_setup_installProgress",
      "tp_setup_terminalLogs",
    ];
    keys.forEach((k) => {
      try {
        sessionStorage.removeItem(k);
        localStorage.removeItem(k);
      } catch (storageErr) {
        console.warn('[Setup Wizard] Failed to remove setup draft key:', k, storageErr);
      }
    });
  };

  // Validation
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const validateStep1 = () => {
    if (!fullName.trim()) return "Display Full Name is required.";
    if (!username.trim() || username.includes(" "))
      return "Username is required and cannot contain spaces.";
    if (!email.trim() || !email.includes("@"))
      return "Enter a valid email address.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (managerPin.length !== 4 || isNaN(Number(managerPin)))
      return "Manager safety authorization PIN must be exactly 4 digits.";
    return null;
  };

  const validateStep2 = () => {
    const trimmedId = branchId.trim();
    if (!trimmedId) return "Established Branch ID is required (e.g. HQ-01, BR-MAIN, BR-01).";
    if (!/^[A-Za-z0-9_-]{2,20}$/.test(trimmedId))
      return "Branch ID must be 2-20 characters (letters, numbers, hyphens, or underscores).";
    if (!branchName.trim()) return "Established Branch Name is required.";
    if (!branchAddress.trim())
      return "Establishment physical address is required.";
    if (!branchPhone.trim())
      return "Establishment contact phone line is required.";
    return null;
  };

  const handleNext = () => {
    setErrorMsg(null);
    if (step === 1) {
      const err = validateStep1();
      if (err) {
        setErrorMsg(err);
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const err = validateStep2();
      if (err) {
        setErrorMsg(err);
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    setStep((prev) => Math.max(1, prev - 1));
  };

  const startInstallation = async () => {
    setIsDeploying(true);
    setDeployStep(1);
    setInstallProgress(25);

    try {
      const finalBranchId = branchId.trim() || "BR-MAIN";
      setInstallProgress(85);

      // Create initial configuration records payload
      const initialDbState = {
        tp_is_configured: "true",
        tp_users: [
          {
            id: "U1",
            avatarInitials:
              fullName
                .split(" ")
                .map((n) => (n ? n[0] : ""))
                .join("")
                .toUpperCase()
                .slice(0, 2) || "AD",
            fullName: fullName.trim(),
            username: username.trim().toLowerCase(),
            email: email.trim(),
            role: "Admin",
            branchAssignmentId: finalBranchId,
            status: "Active",
            managerPin: managerPin.trim(),
            passwordHash: password,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        tp_branches: [
          {
            id: finalBranchId,
            name: branchName.trim(),
            manager: fullName.trim(),
            address: branchAddress.trim(),
            phone: branchPhone.trim(),
            storeLogo: storeLogo || undefined,
            monthlySales: 0,
            staffCount: 1,
            activeCashiers: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isDeleted: false,
            isDistributionBranch: true,
            branchCode: finalBranchId,
          },
        ],
      };

      try {
        const saveResponse = await fetch("/api/db", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: "tp_bootstrap_init",
            value: initialDbState,
          }),
        });

        const contentType = saveResponse.headers.get("content-type") || "";
        if (saveResponse.ok && !contentType.includes("text/html")) {
          console.log("[Onboarding] Successfully saved initial bootstrap config to server");
        }
      } catch (networkError: any) {
        console.warn("[Onboarding] Server write fallback:", networkError.message);
      }

      // Cache branch and configuration data in draft storage without locking system as configured yet
      localStorage.setItem("tilepoint_primary_branch_id", finalBranchId);

      setInstallProgress(100);
      setInstallSuccess(true);
    } catch (err: any) {
      const errorDetail = err.message || "Network connection failed";
      setErrorMsg(
        `The system was unable to commit configuration records (Error: "${errorDetail}").`
      );
      setIsDeploying(false);
    }
  };

  const handleLaunchApp = async () => {
    await triggerSystemProcessing(
      "Provisioning Branch & Superadmin Account...",
      1000,
      "db",
      undefined,
      "Finalizing database indexing...",
    );

    const finalBranchId = branchId.trim() || "BR-MAIN";
    localStorage.setItem("tp_is_configured", "true");
    localStorage.setItem("tilepoint_onboarded_setup", "true");
    localStorage.setItem("tilepoint_primary_branch_id", finalBranchId);

    clearSetupSession();

    setupSystem(
      {
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim(),
        passwordHash: password,
        managerPin: managerPin.trim(),
      },
      {
        id: finalBranchId,
        name: branchName.trim(),
        address: branchAddress.trim(),
        phone: branchPhone.trim(),
        storeLogo: storeLogo || undefined,
      },
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center py-10 px-4 font-sans select-none relative overflow-hidden transition-colors duration-300">
      {/* Luminous Ambient Background Glows */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[360px] bg-primary/10 dark:bg-primary/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[550px] h-[300px] bg-secondary/10 dark:bg-secondary/15 rounded-full blur-[90px] pointer-events-none" />

      {/* Main Setup Card */}
      <div className="w-full max-w-2xl bg-content1 rounded-2xl border border-divider/30 shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.6)] overflow-hidden relative z-10">
        
        {/* Card Header with System Title & Dark Mode Toggle */}
        <div className="bg-content2/80 dark:bg-content2/50 border-b border-divider/20 px-6 py-4.5 flex flex-wrap items-center justify-between gap-3 backdrop-blur-sm">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-primary/10 dark:bg-primary/20 rounded-2xl border border-primary/20 text-primary shadow-sm">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-wider text-foreground">
                TilePoint Setup
              </h1>
              <p className="text-[10px] text-default-500 tracking-wide mt-0.5">
                SYSTEM INITIALIZATION WIZARD
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Dark / Light Mode Toggle */}
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="p-2 rounded-xl bg-content2/60 dark:bg-content3/40 hover:bg-primary/10 border border-divider/30 text-default-500 hover:text-primary transition-all cursor-pointer shadow-xs"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>

            {/* Step Counter Badge */}
            <div className="px-2.5 py-1 bg-content2 rounded-full border border-divider/30 flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] text-primary font-bold uppercase tracking-wider">
                Step {step} of 3
              </span>
            </div>
          </div>
        </div>

        {/* Step Indicator Tabs */}
        {!isDeploying && (
          <div className="grid grid-cols-3 text-center border-b border-divider/20 bg-content1/50">
            <div
              className={`py-3 text-[10px] uppercase font-bold tracking-wider transition-all duration-200 border-b-2 flex items-center justify-center ${
                step === 1
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-default-500/70 hover:text-foreground"
              }`}
            >
              <span>1. Admin Account</span>
            </div>
            <div
              className={`py-3 text-[10px] uppercase font-bold tracking-wider transition-all duration-200 border-b-2 flex items-center justify-center ${
                step === 2
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-default-500/70 hover:text-foreground"
              }`}
            >
              <span>2. Establish Branch</span>
            </div>
            <div
              className={`py-3 text-[10px] uppercase font-bold tracking-wider transition-all duration-200 border-b-2 flex items-center justify-center ${
                step === 3
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-default-500/70 hover:text-foreground"
              }`}
            >
              <span>3. Verification</span>
            </div>
          </div>
        )}

        {/* Wizard Step Body */}
        <div className="p-6 md:p-8">
          <AnimatePresence mode="wait">
            {!isDeploying ? (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="space-y-6"
              >
                {/* STEP 1: Admin Account */}
                {step === 1 && (
                  <div className="space-y-5">
                    <div className="space-y-1">
                      <h2 className="text-sm font-bold text-foreground">
                        Create Primary System Administrator
                      </h2>
                      <p className="text-[11.5px] text-default-500 leading-relaxed">
                        Establish the root administrator profile with complete operational authority over system nodes, personnel, and security.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-1">
                      {/* Full Name */}
                      <div className="col-span-2">
                        <HeroInput
                          label="Admin Full Name"
                          isRequired
                          value={fullName ?? ''}
                          onValueChange={setFullName}
                          placeholder="e.g. John Doe"
                        />
                      </div>

                      {/* System Handle */}
                      <div className="col-span-1">
                        <HeroInput
                          label="Username Handle"
                          isRequired
                          value={username ?? ''}
                          onValueChange={setUsername}
                          placeholder="e.g. admin"
                        />
                      </div>

                      {/* Primary Email */}
                      <div className="col-span-1">
                        <HeroInput
                          type="email"
                          label="Work Email"
                          isRequired
                          value={email ?? ''}
                          onValueChange={setEmail}
                          placeholder="admin@example.com"
                        />
                      </div>

                      {/* Password */}
                      <div className="col-span-1">
                        <HeroInput
                          type={showPassword ? 'text' : 'password'}
                          label="Access Password"
                          isRequired
                          value={password ?? ''}
                          onValueChange={setPassword}
                          placeholder="••••••••••••"
                          endContent={
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="text-default-400 hover:text-default-700 dark:hover:text-default-200 transition-colors p-1 cursor-pointer"
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          }
                        />
                      </div>

                      {/* Manager PIN */}
                      <div className="col-span-1">
                        <HeroInput
                          label="Manager Safety PIN"
                          isRequired
                          maxLength={4}
                          value={managerPin ?? ''}
                          onValueChange={(val) => setManagerPin(val.replace(/\D/g, ''))}
                          placeholder="••••"
                          className="text-center"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: Establish HQ Branch */}
                {step === 2 && (
                  <div className="space-y-5">
                    <div className="space-y-1">
                      <h2 className="text-sm font-bold text-foreground">
                        Configure Enterprise Headquarters / Central Branch
                      </h2>
                      <p className="text-[11.5px] text-default-500 leading-relaxed">
                        Designate your initial corporate headquarters or central distribution hub. All stock, transmittals, and catalogs branch from this central node.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-1">
                      {/* Established Branch ID */}
                      <div className="col-span-1">
                        <HeroInput
                          label="Establish Branch ID"
                          isRequired
                          value={branchId ?? ''}
                          onValueChange={(val) => setBranchId(val.toUpperCase())}
                          placeholder="e.g. BR-MAIN"
                          helperText="Unique system key identifier."
                        />
                      </div>

                      {/* Established Branch Name */}
                      <div className="col-span-1">
                        <HeroInput
                          label="Establishment Name"
                          isRequired
                          value={branchName ?? ''}
                          onValueChange={setBranchName}
                          placeholder="e.g. TilePoint Main Flagship"
                          helperText="Customer-facing display name on receipts."
                        />
                      </div>

                      {/* Central Directory Hotline */}
                      <div className="col-span-2">
                        <HeroInput
                          label="Contact Hotline"
                          isRequired
                          value={branchPhone ?? ''}
                          onValueChange={setBranchPhone}
                          placeholder="e.g. +63 (02) 8123-4567"
                        />
                      </div>

                      {/* Location Structural Address */}
                      <div className="col-span-2">
                        <HeroInput
                          label="Location Structural Address"
                          isRequired
                          value={branchAddress ?? ''}
                          onValueChange={setBranchAddress}
                          placeholder="e.g. 123 Enterprise Blvd, Metro Manila"
                        />
                      </div>

                      {/* Store Brand Logo Container */}
                      <div className="col-span-2 space-y-2 pt-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-default-500 pl-0.5">
                          Store Brand Logo <span className="text-default-500/60 font-normal lowercase">(optional)</span>
                        </label>
                        <div className="flex items-center gap-4 bg-content1 border border-divider/30 rounded-2xl p-4">
                          <div className="relative w-16 h-16 rounded-xl border border-dashed border-divider/60 bg-content2 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                            {storeLogo ? (
                              <img
                                src={storeLogo}
                                alt="Store Logo Preview"
                                className="w-full h-full object-contain p-1"
                              />
                            ) : (
                              <ImageIcon className="h-6 w-6 text-default-500/40" />
                            )}
                          </div>
                          <div className="flex-1 text-left space-y-1.5">
                            <input
                              type="file"
                              accept="image/png"
                              onChange={handleLogoChange}
                              className="hidden"
                              id="logo-upload"
                            />
                            <label
                              htmlFor="logo-upload"
                              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-content2 hover:bg-content2/80 text-[10px] font-bold uppercase tracking-wider text-foreground border border-divider/40 rounded-xl cursor-pointer transition-all shadow-sm hover:scale-[1.01]"
                            >
                              <Upload className="h-3.5 w-3.5 text-primary" /> Select PNG Image
                            </label>
                            <p className="text-[9.5px] text-default-500 leading-relaxed">
                              PNG format only (.png). Maximum file size: 1.5MB. Rendered on POS thermal receipts.
                            </p>
                            {storeLogo && (
                              <button
                                type="button"
                                onClick={() => setStoreLogo("")}
                                className="text-[10px] text-red-500 hover:text-red-600 font-bold underline cursor-pointer"
                              >
                                Remove Uploaded Logo
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: Verification & Security Review */}
                {step === 3 && (
                  <div className="space-y-5">
                    <div className="space-y-1">
                      <h2 className="text-sm font-bold text-foreground">
                        Verify Initial Configuration Parameters
                      </h2>
                      <p className="text-[11.5px] text-default-500 leading-relaxed">
                        Review your administrator credentials and establishment configuration before creating the database schema.
                      </p>
                    </div>

                    <div className="bg-content1 rounded-2xl border border-divider/30 overflow-hidden text-xs">
                      <div className="bg-content2 px-4 py-2.5 border-b border-divider/25 text-[10px] text-default-500 font-bold uppercase tracking-wider flex justify-between items-center">
                        <span>Setup Summary</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-primary font-semibold border border-emerald-500/20">
                          Ready to Deploy
                        </span>
                      </div>

                      <div className="p-4 space-y-3 font-sans">
                        <div className="flex justify-between items-center text-xs pb-2 border-b border-divider/15">
                          <span className="text-default-500 font-medium">Administrator Account:</span>
                          <span className="font-semibold text-foreground">{fullName} (<span className="text-primary">@{username}</span>)</span>
                        </div>

                        <div className="flex justify-between items-center text-xs pb-2 border-b border-divider/15">
                          <span className="text-default-500 font-medium">Primary Contact Email:</span>
                          <span className="text-foreground">{email}</span>
                        </div>

                        <div className="flex justify-between items-center text-xs pb-2 border-b border-divider/15">
                          <span className="text-default-500 font-medium">Established Branch ID:</span>
                          <span className="font-bold text-primary">{branchId.trim()}</span>
                        </div>

                        <div className="flex justify-between items-center text-xs pb-2 border-b border-divider/15">
                          <span className="text-default-500 font-medium">Branch Display Name:</span>
                          <span className="font-semibold text-foreground">{branchName}</span>
                        </div>

                        <div className="flex justify-between items-center text-xs pb-2 border-b border-divider/15">
                          <span className="text-default-500 font-medium">Outlet Physical Address:</span>
                          <span className="text-foreground max-w-[280px] text-right truncate">{branchAddress}</span>
                        </div>

                        <div className="flex justify-between items-center text-xs pb-2 border-b border-divider/15">
                          <span className="text-default-500 font-medium">Hotline Contact:</span>
                          <span className="text-foreground">{branchPhone}</span>
                        </div>

                        {storeLogo && (
                          <div className="flex justify-between items-center text-xs pb-2 border-b border-divider/15">
                            <span className="text-default-500 font-medium">Branch Brand Logo:</span>
                            <div className="w-8 h-8 rounded-lg border border-divider/30 overflow-hidden bg-content2 flex items-center justify-center p-0.5">
                              <img src={storeLogo} alt="Logo" className="w-full h-full object-contain" />
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-center text-xs">
                          <span className="text-default-500 font-medium">Manager PIN:</span>
                          <span className="font-bold text-primary tracking-widest">•••• ({managerPin.slice(0, 1)}***)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Inline Error Message */}
                {errorMsg && (
                  <HeroAlert
                    variant="flat"
                    color="danger"
                    title="Validation Check Notice"
                    description={errorMsg}
                    className="animate-shake"
                  />
                )}

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-5 border-t border-divider/20">
                  {step > 1 ? (
                    <HeroButton
                      type="button"
                      onClick={handleBack}
                      variant="flat"
                      color="default"
                      size="md"
                      startIcon={<ArrowLeft className="h-4 w-4" />}
                      className="font-bold uppercase tracking-wider text-xs"
                    >
                      Back
                    </HeroButton>
                  ) : (
                    <div />
                  )}

                  {step < 3 ? (
                    <HeroButton
                      type="button"
                      onClick={handleNext}
                      color="primary"
                      variant="solid"
                      size="md"
                      endIcon={<ArrowRight className="h-4 w-4" />}
                      className="font-bold uppercase tracking-wider text-xs shadow-md shadow-primary/25/20"
                    >
                      Continue
                    </HeroButton>
                  ) : (
                    <HeroButton
                      type="button"
                      onClick={startInstallation}
                      color="primary"
                      variant="solid"
                      size="md"
                      startIcon={<Database className="h-4 w-4" />}
                      className="font-bold uppercase tracking-wider text-xs shadow-lg shadow-primary/25/25"
                    >
                      Deploy System Setup
                    </HeroButton>
                  )}
                </div>
              </motion.div>
            ) : (
              /* DEPLOYING / INITIALIZATION PROGRESS SCREEN */
              <motion.div
                key="deploying"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-5"
              >
                <div className="space-y-3 font-sans">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                      <RefreshCw
                        className={`h-4 w-4 ${!installSuccess ? "animate-spin" : ""}`}
                      />
                      {installSuccess
                        ? "Installation Completed"
                        : "Initializing System Workspace"}
                    </span>
                    <span className="font-bold text-foreground">
                      {installProgress}%
                    </span>
                  </div>

                  <HeroProgress
                    value={installProgress}
                    color="primary"
                    size="md"
                    radius="full"
                  />
                </div>

                {installSuccess && (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-4 bg-primary/10 border border-primary/25 rounded-2xl flex items-center gap-3.5 font-sans"
                  >
                    <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-primary uppercase tracking-wider">
                        Workspace Initialized Successfully
                      </p>
                      <p className="text-[11px] text-default-500 leading-normal mt-0.5">
                        Your enterprise branch node ({branchId || "HQ"}) and admin account are active and ready.
                      </p>
                    </div>
                  </motion.div>
                )}

                {installSuccess && (
                  <HeroButton
                    type="button"
                    onClick={handleLaunchApp}
                    color="primary"
                    variant="solid"
                    size="lg"
                    fullWidth
                    endIcon={<ArrowRight className="h-4 w-4" />}
                    className="font-bold text-xs uppercase tracking-wider shadow-lg shadow-primary/25/20 font-sans"
                  >
                    Launch HQ Console Portal
                  </HeroButton>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
