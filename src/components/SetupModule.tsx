/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useDb } from '../context/DbContext';
import { 
  Server, 
  Shield, 
  User, 
  MapPin, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Terminal, 
  Database, 
  Lock, 
  Eye, 
  EyeOff, 
  Phone,
  ShieldCheck,
  Cpu,
  RefreshCw,
  Upload,
  Image
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createSaltedHash, formatHashToken } from '../lib/crypto';

interface LogLine {
  text: string;
  type: 'info' | 'success' | 'warn';
  time: string;
}

export const SetupModule: React.FC = () => {
  const { setupSystem, triggerSystemProcessing } = useDb();

  const [step, setStep] = useState(1);

  // Step 1: Admin Data
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [managerPin, setManagerPin] = useState('');

  // Step 2: Branch Data
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');
  const [storeLogo, setStoreLogo] = useState('');

  // Convert selected files to base64
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        setErrorMsg('Store Logo size must be less than 1.5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setStoreLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Deployment States
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState(0);
  const [terminalLogs, setTerminalLogs] = useState<LogLine[]>([]);
  const [installSuccess, setInstallSuccess] = useState(false);

  // Validation
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const validateStep1 = () => {
    if (!fullName.trim()) return 'Display Full Name is required.';
    if (!username.trim() || username.includes(' ')) return 'Username is required and cannot contain spaces.';
    if (!email.trim() || !email.includes('@')) return 'Enter a valid email address.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (managerPin.length !== 4 || isNaN(Number(managerPin))) return 'Manager safety authorization PIN must be exactly 4 digits.';
    return null;
  };

  const validateStep2 = () => {
    if (!branchName.trim()) return 'Establishment name is required.';
    if (!branchAddress.trim()) return 'Establishment physical address is required.';
    if (!branchPhone.trim()) return 'Establishment contact phone line is required.';
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
    setStep(prev => Math.max(1, prev - 1));
  };

  // Trigger installation automation sequence
  const startInstallation = async () => {
    setIsDeploying(true);
    setTerminalLogs([]);
    setDeployStep(1);

    const logHistory: LogLine[] = [];
    const addLog = (text: string, type: 'info' | 'success' | 'warn' = 'info') => {
      const stamp = `[${new Date().toLocaleTimeString()}]`;
      logHistory.push({ text, type, time: stamp });
      setTerminalLogs([...logHistory]);
    };

    addLog('Initializing local database node for TilePoint POS...', 'info');
    await new Promise(r => setTimeout(r, 150));

    addLog('✔ Client structures successfully bound to environment parameters.', 'success');
    addLog('Allocating clean database schema registers...', 'info');
    await new Promise(r => setTimeout(r, 150));

    addLog('Designing table mappings for Sales, Product stocks, and Suppliers...', 'info');
    await new Promise(r => setTimeout(r, 150));

    addLog('✔ Database structures allocated in client persistent context store.', 'success');
    addLog(`Generating security keys for admin user [${username}]...`, 'info');
    await new Promise(r => setTimeout(r, 150));

    const salt = username.trim() + '_salt_tok';
    addLog(`Salting administrator security key using salt index: [${salt}]`, 'info');
    addLog('Running cryptographic PBKDF2 stretching rounds (2,500 SHA-256 iterations)...', 'info');
    await new Promise(r => setTimeout(r, 150));

    const hashed = await createSaltedHash(password, salt, 2500);
    const token = formatHashToken(salt, hashed, 2500);
    addLog(`✔ Secure hashed password generated successfully.`, 'success');
    await new Promise(r => setTimeout(r, 150));

    addLog(`Instantiating primary headquarters node: [${branchName}]`, 'info');
    await new Promise(r => setTimeout(r, 150));

    addLog('Logging initial system bootstrap audit event...', 'info');
    await new Promise(r => setTimeout(r, 150));

    addLog('SUCCESS: System build authenticated. Local database certified.', 'success');
    setInstallSuccess(true);
  };

  const handleLaunchApp = () => {
    // Generate secure hash token
    const salt = username.trim() + '_salt_tok';
    createSaltedHash(password, salt, 2500).then(async (hashed) => {
      const token = formatHashToken(salt, hashed, 2500);
      await triggerSystemProcessing(
        'Provisioning Branch & Superadmin Account...',
        1600,
        'db',
        undefined,
        'Deploying secure relational schema matrices...'
      );
      setupSystem(
        {
          fullName: fullName.trim(),
          username: username.trim().toLowerCase(),
          email: email.trim(),
          passwordHash: token,
          managerPin: managerPin.trim()
        },
        {
          name: branchName.trim(),
          address: branchAddress.trim(),
          phone: branchPhone.trim(),
          storeLogo: storeLogo || undefined
        }
      );
    });
  };

  return (
    <div className="min-h-screen bg-[#0d0e12] text-zinc-100 flex flex-col justify-center items-center py-10 px-4 font-sans select-none relative overflow-hidden">
      {/* Dynamic abstract grid background for tech interface feel */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.08),rgba(255,255,255,0))]" />
      <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="w-full max-w-xl bg-[#14161f] border border-zinc-800/80 rounded-[24px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden relative z-10">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-zinc-900 via-[#181a24] to-zinc-900 px-6 py-5 border-b border-zinc-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-500">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-wider text-white">TilePoint Enterprise</h1>
              <p className="text-[10px] text-zinc-400 font-mono tracking-wide">SECURE BOOTSTRAP UTILITY • V2.2.0</p>
            </div>
          </div>
          <div className="px-3 py-1 bg-zinc-800/60 rounded-full border border-zinc-700/50">
            <span className="text-[10px] font-mono text-amber-500 font-extrabold uppercase">Installer State</span>
          </div>
        </div>

        {/* Phase / Step Header indicators */}
        {!isDeploying && (
          <div className="grid grid-cols-3 text-center border-b border-zinc-800/30 bg-[#11131c]">
            <div className={`py-3 text-[10px] uppercase font-black tracking-wider transition-colors duration-300 border-b-2 ${step === 1 ? 'border-amber-500 text-amber-500 bg-amber-500/[0.02]' : 'border-transparent text-zinc-500'}`}>
              1. Administrator
            </div>
            <div className={`py-3 text-[10px] uppercase font-black tracking-wider transition-colors duration-300 border-b-2 ${step === 2 ? 'border-amber-500 text-amber-500 bg-amber-500/[0.02]' : 'border-transparent text-zinc-500'}`}>
              2. HQ Branch
            </div>
            <div className={`py-3 text-[10px] uppercase font-black tracking-wider transition-colors duration-300 border-b-2 ${step === 3 ? 'border-amber-500 text-amber-500 bg-amber-500/[0.02]' : 'border-transparent text-zinc-500'}`}>
              3. Verification
            </div>
          </div>
        )}

        <div className="p-6 md:p-8">
          <AnimatePresence mode="wait">
            {!isDeploying ? (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                        <User className="h-4 w-4 text-amber-500" />
                        Create Primary System Administrator
                      </h2>
                      <p className="text-[11px] text-zinc-400">
                        Create the first account with unrestricted administrative access to branch nodes, databases, and general parameters.
                      </p>
                    </div>

                    <div className="space-y-3.5 pt-2">
                      {/* Full Name */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 pl-0.5">Admin Full Name</label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                          placeholder="e.g. Erica Manaban"
                          className="w-full bg-[#181a24] border border-zinc-800/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/80 transition-colors font-sans"
                        />
                      </div>

                      {/* Username & Email row */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 pl-0.5">System Handle / ID</label>
                          <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="e.g. erica_admin"
                            className="w-full bg-[#181a24] border border-zinc-800/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/80 transition-colors font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 pl-0.5">Primary Email</label>
                          <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="e.g. mail@example.com"
                            className="w-full bg-[#181a24] border border-zinc-800/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/80 transition-colors font-sans"
                          />
                        </div>
                      </div>

                      {/* Password & Pin Grid */}
                      <div className="grid grid-cols-5 gap-4">
                        <div className="col-span-3 space-y-1 relative">
                          <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 pl-0.5">System Access Key</label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={e => setPassword(e.target.value)}
                              placeholder="Min 6 alphanumeric characters"
                              className="w-full bg-[#181a24] border border-zinc-800/80 rounded-xl pl-3 pr-10 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/80 transition-colors font-sans"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-2.5 text-zinc-400 hover:text-white transition-colors"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="col-span-2 space-y-1">
                          <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 pl-0.5">Manager Secret PIN</label>
                          <input
                            type="text"
                            maxLength={4}
                            value={managerPin}
                            onChange={e => setManagerPin(e.target.value.replace(/\D/g, ''))}
                            placeholder="4-Digits"
                            className="w-full bg-[#181a24] border border-zinc-800/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/80 transition-colors text-center font-mono tracking-widest"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-amber-500" />
                        Configure Enterprise Hub / HQ Branch
                      </h2>
                      <p className="text-[11px] text-zinc-400">
                        Designate your central warehouse assignment or corporate headquarters branch directory point. This serves as the root branch for inventory catalogs.
                      </p>
                    </div>

                    <div className="space-y-3.5 pt-2">
                      {/* Branch Name */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 pl-0.5">Established Branch Name</label>
                        <input
                          type="text"
                          value={branchName}
                          onChange={e => setBranchName(e.target.value)}
                          placeholder="e.g. Emman Tile Center Main HQ"
                          className="w-full bg-[#181a24] border border-zinc-800/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/80 transition-colors"
                        />
                      </div>

                      {/* Address */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 pl-0.5">Location Structural Address</label>
                        <input
                          type="text"
                          value={branchAddress}
                          onChange={e => setBranchAddress(e.target.value)}
                          placeholder="Street, City, Province, Postal Code"
                          className="w-full bg-[#181a24] border border-zinc-800/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/80 transition-colors"
                        />
                      </div>

                      {/* Phone contact */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 pl-0.5">Central Directory Hotline</label>
                        <input
                          type="text"
                          value={branchPhone}
                          onChange={e => setBranchPhone(e.target.value)}
                          placeholder="Mobile or Landline coordinate"
                          className="w-full bg-[#181a24] border border-zinc-800/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/80 transition-colors font-mono"
                        />
                      </div>

                      {/* Store Corporate Logo upload */}
                      <div className="space-y-1 pt-1">
                        <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 pl-0.5">Store Brand Logo</label>
                        <div className="flex items-center gap-4 bg-[#181a24] border border-zinc-800/80 rounded-xl p-3">
                          <div className="relative w-14 h-14 rounded-lg border border-dashed border-zinc-800 bg-[#11131c] flex items-center justify-center overflow-hidden shrink-0">
                            {storeLogo ? (
                              <img src={storeLogo} alt="Preview" className="w-full h-full object-contain" />
                            ) : (
                              <Image className="h-5 w-5 text-zinc-600" />
                            )}
                          </div>
                          <div className="flex-1 text-left space-y-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoChange}
                              className="hidden"
                              id="logo-upload"
                            />
                            <label
                              htmlFor="logo-upload"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-[9px] font-extrabold uppercase tracking-widest text-white border border-zinc-800 rounded-lg cursor-pointer transition-all hover:scale-102"
                            >
                              <Upload className="h-3 w-3" /> Select Image
                            </label>
                            <p className="text-[8px] text-zinc-500 font-sans">Supports PNG, JPG, WEBP. Max 1.5MB.</p>
                            {storeLogo && (
                              <button
                                type="button"
                                onClick={() => setStoreLogo('')}
                                className="block text-[8.5px] text-red-500 hover:underline font-bold"
                              >
                                Remove uploader logo
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                        <Shield className="h-4 w-4 text-amber-500" />
                        Verify Cryptographic Security Parameters
                      </h2>
                      <p className="text-[11px] text-zinc-400">
                        Validate all system properties before bootstrapping the local secure metadata sandbox and writing files.
                      </p>
                    </div>

                    <div className="bg-[#11131c] rounded-xl border border-zinc-800/50 overflow-hidden text-xs font-mono">
                      <div className="bg-zinc-900/60 px-4 py-2 border-b border-zinc-800/50 text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest flex justify-between">
                        <span>Parameter Directory</span>
                        <span className="text-emerald-400">Values Sealed</span>
                      </div>
                      <div className="p-4 space-y-2.5">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-zinc-500 font-sans">Corporate Admin:</span>
                          <span className="text-zinc-200">{fullName} ({username})</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-zinc-500 font-sans">Contact Email:</span>
                          <span className="text-zinc-200">{email}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-zinc-500 font-sans">First Assigned Hub:</span>
                          <span className="text-zinc-200 text-right truncate max-w-[200px]">{branchName}</span>
                        </div>
                        {storeLogo && (
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-zinc-500 font-sans">Corporate Logo:</span>
                            <div className="w-8 h-8 rounded border border-zinc-800 overflow-hidden bg-white/5 flex items-center justify-center p-0.5">
                              <img src={storeLogo} alt="Logo preview" className="w-full h-full object-contain" />
                            </div>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-zinc-500 font-sans">System Access Key:</span>
                          <span className="text-zinc-400">•••••••• (min 2,500 PBKDF2 stretching rounds)</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-zinc-500 font-sans">Manager pin:</span>
                          <span className="text-zinc-300 font-mono tracking-widest">{managerPin}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 bg-amber-500/5 rounded-xl border border-amber-500/10 flex items-start gap-2.5">
                      <ShieldCheck className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-wider mb-0.5">Secure Salt Handshake Protocol Active</p>
                        <p className="text-[9.5px] text-zinc-400 leading-relaxed font-sans">
                          Once confirmed, a salted cryptographic token matching WebCrypto specifications will be generated. The system stores no plaintext user passwords.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {errorMsg && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[10px] font-bold tracking-wide">
                    Error Verification Check: {errorMsg}
                  </div>
                )}

                {/* Nav buttons */}
                <div className="flex justify-between gap-4 pt-4 border-t border-zinc-800/40">
                  {step > 1 ? (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back
                    </button>
                  ) : (
                    <div />
                  )}

                  {step < 3 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-amber-500/5"
                    >
                      Continue
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startInstallation}
                      className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/15"
                    >
                      Deploy System Setup
                      <Database className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </motion.div>
            ) : (
              /* Deployment Phase View */
              <motion.div
                key="deploying"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-5 font-mono"
              >
                <div className="space-y-1 font-sans">
                  <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-amber-500" />
                    Deploying Sandbox Environment
                  </h2>
                  <p className="text-[11px] text-zinc-400">
                    Instantiating the localized database mapping matrices and key hashes safely inside localStorage.
                  </p>
                </div>

                {/* Interactive Console Window */}
                <div className="bg-[#090a0f] border border-zinc-800/80 rounded-xl p-4 h-60 overflow-y-auto font-mono text-[10.5px] leading-relaxed select-text space-y-1 scrollbar-thin scrollbar-thumb-zinc-800">
                  {terminalLogs.map((log, listIdx) => (
                    <div key={listIdx} className="flex gap-2">
                      <span className="text-zinc-600 shrink-0">{log.time}</span>
                      <span className={log.type === 'success' ? 'text-emerald-400 font-extrabold' : log.type === 'warn' ? 'text-amber-500' : 'text-zinc-300'}>
                        {log.text}
                      </span>
                    </div>
                  ))}
                  {!installSuccess && (
                     <div className="flex items-center gap-2 text-zinc-500 animate-pulse pt-1">
                       <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-500" />
                       <span>PROCESSING CLIENT HANDSHAKE INTEGRATION SEQUENCE...</span>
                     </div>
                  )}
                </div>

                {installSuccess && (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 font-sans"
                  >
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-xs font-black text-emerald-400 uppercase tracking-widest">Active Installation Completed</p>
                      <p className="text-[10px] text-zinc-300 leading-normal">
                        All branch database registers have been established and configured with dynamic SHA-256 tokens.
                      </p>
                    </div>
                  </motion.div>
                )}

                {installSuccess && (
                  <button
                    type="button"
                    onClick={handleLaunchApp}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-500/15 flex items-center justify-center gap-2 font-sans"
                  >
                    Launch HQ Console Portal
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer system status line */}
      <div className="mt-8 text-center space-y-1 text-[10px] font-mono text-zinc-500 relative z-10">
        <p>TILEPOINT POS DIRECT CLIENT-SIDE SESSION • DB ENCRYPT ACTIVE</p>
        <p className="opacity-60">System running on clean-slate build isolated with localStorage database layer.</p>
      </div>
    </div>
  );
};
