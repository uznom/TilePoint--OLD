import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
 Monitor, 
 Smartphone, 
 Sparkles, 
 Lock, 
 Unlock, 
 AlertTriangle, 
 Info, 
 ChevronRight,
 Database,
 DollarSign,
 LayoutDashboard,
 Building2,
 RefreshCw
} from "lucide-react";

interface MobilePcOnlyBlockerProps {
 tabId: string;
 onForceEnable: () => void;
}

export function MobilePcOnlyBlocker({ tabId, onForceEnable }: MobilePcOnlyBlockerProps) {
 const [showConfirmation, setShowConfirmation] = useState(false);
 const [isSimulatingHaptic, setIsSimulatingHaptic] = useState(false);

 // Feature metadata for expressive presentation
 const getFeatureDetails = (id: string) => {
 switch (id) {
 case "dashboard":
 return {
 title: "Branch Analytics & BI Dashboard",
 subtitle: "Enterprise-wide telemetry suite",
 icon: LayoutDashboard,
 reasons: [
 "Dense multi-branch sales distribution matrices requiring min. 1024px horizontal space.",
 "Live real-time Server-Sent Events (SSE) telemetry visualization feeds with high graphics footprint.",
 "Detailed system-wide security audit trails and logs with high table column density."
 ],
 color: "from-blue-500/20 to-indigo-500/10",
 accentColor: "text-blue-500 border-blue-500/20 bg-blue-500/10",
 metricText: ""
 };
 case "profit-analytics":
 return {
 title: "P&L Accounting Desk & Audit",
 subtitle: "Advanced profit tracking & margins",
 icon: DollarSign,
 reasons: [
 "Heavy financial calculation tables, including itemized markup vs discount breakdown filters.",
 "Multi-axis SVG cost-benefit ratio charts requiring cursor hover precision.",
 "Direct ledger overrides and bulk price adjustments that require physical mouse confirmation for financial compliance."
 ],
 color: "from-emerald-500/20 to-teal-500/10",
 accentColor: "text-emerald-500 border-emerald-500/20 bg-emerald-500/10",
 metricText: ""
 };
 case "procurement":
 return {
 title: "Procurement Desk",
 subtitle: "Supplier logistics & order dispatch",
 icon: Database,
 reasons: [
 "Dense multi-item batch invoice form creator designed specifically for mechanical keyboards & tab navigation.",
 "Supplier catalog search filters with side-by-side spec sheet comparison drawers.",
 "Critical automated purchase order dispatch mechanics to prevent double-ordering errors."
 ],
 color: "from-purple-500/20 to-pink-500/10",
 accentColor: "text-purple-500 border-purple-500/20 bg-purple-500/10",
 metricText: "Enterprise Supply Line"
 };
 case "branches":
 return {
 title: "Branches Profile Admin",
 subtitle: "Multi-branch structural configuration",
 icon: Building2,
 reasons: [
 "Sensitive security-level profile metadata settings for individual storage vaults.",
 "Coordinates & physical address geometry mappings utilizing complex responsive coordinates.",
 "Sub-network client-ID pairing controls designed for large-screen administrative validation."
 ],
 color: "from-amber-500/20 to-orange-500/10",
 accentColor: "text-amber-500 border-amber-500/20 bg-amber-500/10",
 metricText: ""
 };
 default:
 return {
 title: "Professional Administration Tool",
 subtitle: "Advanced administrative capability",
 icon: Monitor,
 reasons: [
 "High density dataset representation unsuited for vertical touch view-ports.",
 "Strict structural input requirements designed for desktop mouse and keyboard controls.",
 "Advanced telemetry components optimized for high memory, multi-core desktop environments."
 ],
 color: "from-m3-primary/20 to-m3-secondary/10",
 accentColor: "text-m3-primary border-m3-primary/20 bg-m3-primary/10",
 metricText: "PC Only Environment"
 };
 }
 };

 const info = getFeatureDetails(tabId);
 const IconComponent = info.icon;

 const triggerForceBypass = () => {
 setIsSimulatingHaptic(true);
 setTimeout(() => {
 setIsSimulatingHaptic(false);
 onForceEnable();
 }, 400);
 };

 return (
 <div className="w-full min-h-[80vh] flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 select-none">
 {/* Playful Device Simulation Stage */}
 <div className="relative w-full max-w-lg mb-8 flex items-center justify-center">
 <div className="absolute inset-0 bg-m3-primary/[0.02] dark:bg-m3-primary/[0.04] rounded-[40px] blur-3xl pointer-events-none" />
 
 {/* SVG Device Animation */}
 <div className="relative z-10 flex items-center gap-6 md:gap-10">
 {/* PC Monitor Screen */}
 <motion.div 
 initial={{ scale: 0.9, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 transition={{ type: "spring", stiffness: 100, damping: 15 }}
 className="flex flex-col items-center"
 >
 <div className="relative w-36 h-24 bg-m3-surface-container border-2 border-m3-outline-variant rounded-xl shadow-lg overflow-hidden flex flex-col p-1.5">
 {/* PC Header Bar */}
 <div className="flex items-center justify-between border-b border-m3-outline-variant/50 pb-1 mb-1">
 <div className="flex gap-0.5">
 <div className="w-1 h-1 rounded-full bg-red-400" />
 <div className="w-1 h-1 rounded-full bg-amber-400" />
 <div className="w-1 h-1 rounded-full bg-green-400" />
 </div>
 <div className="w-12 h-1 bg-m3-outline-variant/60 rounded" />
 </div>
 {/* Simulated Complex Layout */}
 <div className="flex-1 grid grid-cols-3 gap-1">
 <div className="bg-emerald-500/20 border border-emerald-500/30 rounded p-0.5 flex flex-col justify-between">
 <div className="w-full h-1 bg-emerald-500/40 rounded" />
 <div className="w-1/2 h-1 bg-emerald-500/40 rounded mt-0.5" />
 </div>
 <div className="bg-m3-primary/10 border border-m3-primary/20 rounded p-0.5 flex flex-col justify-between">
 <div className="w-full h-1 bg-m3-primary/30 rounded" />
 <div className="w-3/4 h-1 bg-m3-primary/30 rounded mt-0.5" />
 </div>
 <div className="bg-m3-outline-variant/25 rounded p-0.5 flex flex-col gap-0.5">
 <div className="w-full h-0.5 bg-m3-outline/20 rounded" />
 <div className="w-full h-0.5 bg-m3-outline/20 rounded" />
 <div className="w-full h-0.5 bg-m3-outline/20 rounded" />
 </div>
 </div>
 </div>
 {/* Monitor Stand */}
 <div className="w-6 h-4 bg-m3-outline-variant/60 rounded-b" />
 <div className="w-14 h-1 bg-m3-outline" />
 <span className="text-[9px] text-m3-on-surface-variant font-mono font-medium mt-1.5 uppercase tracking-wider">
 PC Optimization Active
 </span>
 </motion.div>

 {/* Connection Link */}
 <div className="flex flex-col items-center justify-center text-m3-outline-variant/75">
 <span className="text-[10px] font-bold font-mono tracking-widest text-amber-500 uppercase">
 DESKTOP
 </span>
 <div className="h-0.5 w-8 bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 my-1 animate-pulse" />
 <span className="text-[9px] font-mono">REQUIRED</span>
 </div>

 {/* Mobile Screen Restricted */}
 <motion.div 
 initial={{ scale: 0.85, opacity: 0, y: 10 }}
 animate={{ scale: 1, opacity: 1, y: 0 }}
 transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.1 }}
 className="flex flex-col items-center"
 >
 <div className="relative w-14 h-24 bg-m3-surface-container border-2 border-amber-500/60 rounded-2xl shadow-md overflow-hidden flex flex-col p-1">
 {/* Speaker / Notch */}
 <div className="w-4 h-1 bg-m3-outline-variant rounded-full mx-auto mb-1" />
 {/* Blocked screen content */}
 <div className="flex-1 flex flex-col items-center justify-center bg-red-500/5 rounded-lg border border-red-500/10 p-1 text-center">
 <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
 <div className="w-8 h-1 bg-m3-outline-variant/50 rounded mt-1.5" />
 </div>
 </div>
 <span className="text-[9px] text-amber-500 font-mono font-bold mt-5 uppercase tracking-wider">
 Mobile Shielded
 </span>
 </motion.div>
 </div>
 </div>

 {/* Main Material 3 Expressive Container card */}
 <motion.div 
 initial={{ y: 20, opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 transition={{ type: "spring", stiffness: 80, damping: 14, delay: 0.2 }}
 className="w-full max-w-lg bg-m3-surface-container border border-m3-outline-variant/35 shadow-[0px_16px_40px_rgba(0,0,0,0.06)] dark:shadow-[0px_24px_64px_rgba(0,0,0,0.18)] rounded-[32px] p-6 sm:p-8 relative overflow-hidden transition-all duration-300 hover:border-m3-outline-variant/65"
 >
 {/* Dynamic Gradient Flow Banner */}
 <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${info.color} opacity-60`} />

 {/* Header Metadata */}
 {info.metricText && (
 <div className="flex items-center justify-between mb-5">
 <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider ${info.accentColor}`}>
 <Sparkles className="w-3 h-3 animate-pulse" />
 <span>{info.metricText}</span>
 </div>
 </div>
 )}

 {/* Feature Title and Subtitle */}
 <div className="flex items-start gap-4 mb-6">
 <div className="p-3.5 rounded-[22px] bg-m3-primary/10 text-m3-primary shadow-inner border border-m3-primary/5 flex items-center justify-center">
 <IconComponent className="w-6 h-6" />
 </div>
 <div>
 <h3 className="text-xl font-black tracking-tight text-m3-on-surface">
 {info.title}
 </h3>
 <p className="text-xs text-m3-on-surface-variant font-medium mt-0.5 font-mono">
 {info.subtitle}
 </p>
 </div>
 </div>

 {/* Educational/Explanatory breakdown of PC design */}
 <div className="bg-m3-surface-variant/40 rounded-[24px] p-5 mb-6 border border-m3-outline-variant/20">
 <h4 className="text-xs font-bold uppercase tracking-wider text-m3-on-surface-variant flex items-center gap-1.5 mb-3 font-mono">
 <Info className="w-3.5 h-3.5 text-m3-primary" />
 <span>Why is this restricted to PC/Desktop?</span>
 </h4>
 <ul className="space-y-3.5">
 {info.reasons.map((reason, index) => (
 <li key={index} className="flex items-start gap-2.5 text-xs text-m3-on-surface-variant leading-relaxed">
 <div className="mt-1 h-1.5 w-1.5 rounded-full bg-m3-primary shrink-0" />
 <span>{reason}</span>
 </li>
 ))}
 </ul>
 </div>

 {/* Interactive Controls Stage */}
 <AnimatePresence mode="wait">
 {!showConfirmation ? (
 <motion.div 
 key="primary_controls"
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -10 }}
 className="flex flex-col gap-3"
 >
 <div className="text-center p-2.5">
 <p className="text-[11px] text-m3-on-surface-variant leading-relaxed">
 We highly recommend accessing this administrative panel from a laptop or desktop monitor to ensure secure, compliant, and accurate data handling.
 </p>
 </div>

 {/* Action Buttons with spring motion */}
 <div className="flex flex-col sm:flex-row gap-3">
 <motion.button
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 onClick={() => setShowConfirmation(true)}
 className="flex-1 flex items-center justify-center gap-2 border border-m3-outline-variant hover:bg-m3-surface-variant text-m3-on-surface font-semibold text-xs py-3.5 px-4 rounded-[20px] transition-all cursor-pointer"
 >
 <Unlock className="w-4 h-4 text-amber-500" />
 Override Restriction
 </motion.button>

 <motion.button
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 onClick={() => window.location.reload()}
 className="flex-1 flex items-center justify-center gap-2 bg-m3-primary text-m3-on-primary hover:opacity-90 font-bold text-xs py-3.5 px-4 rounded-[20px] shadow-md cursor-pointer"
 >
 <RefreshCw className="w-4 h-4 animate-spin-slow" />
 Reload Core System
 </motion.button>
 </div>
 </motion.div>
 ) : (
 <motion.div 
 key="confirmation_controls"
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className={`bg-amber-500/[0.04] dark:bg-amber-500/[0.06] border-2 border-dashed border-amber-500/30 rounded-[24px] p-5 flex flex-col gap-4 text-center ${isSimulatingHaptic ? "animate-shake" : ""}`}
 >
 <div className="flex items-center justify-center gap-2 text-amber-500">
 <AlertTriangle className="w-5 h-5 animate-bounce" />
 <h4 className="font-bold text-xs uppercase tracking-wider font-mono">
 Administrative Bypass Warning
 </h4>
 </div>
 <p className="text-[11px] text-m3-on-surface-variant leading-relaxed">
 Force-enabling this layout on a smaller viewport can break form layouts, warp critical financial visualizers, and lead to accidental record deletions. By proceeding, you accept responsibility for data input safety.
 </p>
 
 <div className="flex gap-2.5">
 <motion.button
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 onClick={() => setShowConfirmation(false)}
 className="flex-1 bg-m3-surface hover:bg-m3-surface-variant border border-m3-outline-variant text-m3-on-surface font-bold text-xs py-3 rounded-xl cursor-pointer"
 >
 Cancel
 </motion.button>

 <motion.button
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 onClick={triggerForceBypass}
 className="flex-1 bg-amber-500 text-black hover:bg-amber-600 font-black text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
 >
 {isSimulatingHaptic ? (
 <RefreshCw className="w-3.5 h-3.5 animate-spin" />
 ) : (
 <>
 <Lock className="w-3.5 h-3.5" />
 Force Launch
 </>
 )}
 </motion.button>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </motion.div>
 </div>
 );
}
