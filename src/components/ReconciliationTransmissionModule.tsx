/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useDb } from "../context/DbContext";
import { UserRole } from "../types/db";
import { DailyReconciliationModule } from "./DailyReconciliationModule";
import { SalesTransmissionModule } from "./SalesTransmissionModule";
import { RefreshCw, Send, Upload, ShieldCheck, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ReconciliationTransmissionModuleProps {
  darkMode: boolean;
}

export const ReconciliationTransmissionModule: React.FC<ReconciliationTransmissionModuleProps> = ({
  darkMode,
}) => {
  const { currentUser } = useDb();

  // Manage internal tab switching
  const [activeSubTab, setActiveSubTab] = useState<"reconciliation" | "transmission" | "import">("reconciliation");

  // Determine available tabs based on user role
  const isAdmin = currentUser.role === UserRole.ADMIN;

  return (
    <div className="w-full text-m3-on-surface space-y-6 animate-fade-in font-sans pb-12 text-left">
      {/* Tab navigation headers */}
      <div className="bg-m3-surface-low border border-m3-outline-variant/20 rounded-[24px] p-2 flex flex-wrap items-center gap-1.5 shadow-sm">
        <button
          onClick={() => setActiveSubTab("reconciliation")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeSubTab === "reconciliation"
              ? "bg-m3-primary text-m3-on-primary shadow-md scale-[1.02]"
              : "text-m3-on-surface-variant hover:bg-m3-surface-high/60 hover:text-m3-on-surface"
          }`}
        >
          <RefreshCw className={`h-4 w-4 ${activeSubTab === "reconciliation" ? "animate-spin-slow" : ""}`} />
          <span>Daily Reconciliation</span>
        </button>

        <button
          onClick={() => setActiveSubTab("transmission")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeSubTab === "transmission"
              ? "bg-m3-primary text-m3-on-primary shadow-md scale-[1.02]"
              : "text-m3-on-surface-variant hover:bg-m3-surface-high/60 hover:text-m3-on-surface"
          }`}
        >
          <Send className="h-4 w-4" />
          <span>Reports Transmission</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveSubTab("import")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              activeSubTab === "import"
                ? "bg-amber-600 dark:bg-amber-500 text-white shadow-md scale-[1.02]"
                : "text-m3-on-surface-variant hover:bg-m3-surface-high/60 hover:text-m3-on-surface"
            }`}
          >
            <Upload className="h-4 w-4" />
            <span>Admin JSON Import</span>
          </button>
        )}

        <div className="ml-auto hidden md:flex items-center gap-2 px-4 py-1 border border-m3-outline-variant/15 rounded-lg bg-m3-surface-lowest/40 font-mono text-[9px] uppercase tracking-wider text-m3-on-surface-variant select-none">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>{currentUser.role} Workspace</span>
        </div>
      </div>

      {/* Render active module */}
      <div className="transition-all duration-300">
        {activeSubTab === "reconciliation" && (
          <DailyReconciliationModule darkMode={darkMode} />
        )}

        {activeSubTab === "transmission" && (
          <SalesTransmissionModule darkMode={darkMode} hideManualImport={true} />
        )}

        {activeSubTab === "import" && isAdmin && (
          <SalesTransmissionModule darkMode={darkMode} showOnlyImport={true} />
        )}
      </div>
    </div>
  );
};
