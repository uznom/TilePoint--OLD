/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useDb } from "../context/DbContext";
import { UserRole } from "../types/db";
import { DailyReconciliationModule } from "./DailyReconciliationModule";
import { SalesTransmissionModule } from "./SalesTransmissionModule";
import { RefreshCw, Send, Upload, ShieldCheck } from "lucide-react";

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
  const isAdmin = currentUser?.role === UserRole.ADMIN;

  return (
    <div className="w-full text-foreground space-y-6 animate-fade-in font-sans pb-12 text-left">
      {/* Tab navigation headers */}
      <div className="bg-content1 border border-divider/20 rounded-2xl p-2 flex flex-wrap items-center gap-1.5 shadow-sm">
        <button
          onClick={() => setActiveSubTab("reconciliation")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeSubTab === "reconciliation"
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-default-500 hover:bg-content3/60 hover:text-foreground"
          }`}
        >
          <RefreshCw className={`h-4 w-4 ${activeSubTab === "reconciliation" ? "animate-spin-slow" : ""}`} />
          <span>Daily Reconciliation</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveSubTab("transmission")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              activeSubTab === "transmission"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-default-500 hover:bg-content3/60 hover:text-foreground"
            }`}
          >
            <Send className="h-4 w-4" />
            <span>HQ Transmission Hub</span>
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => setActiveSubTab("import")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              activeSubTab === "import"
                ? "bg-amber-600 dark:bg-amber-500 text-white shadow-md"
                : "text-default-500 hover:bg-content3/60 hover:text-foreground"
            }`}
          >
            <Upload className="h-4 w-4" />
            <span>Admin JSON Ingestion</span>
          </button>
        )}

 <div className="ml-auto hidden md:flex items-center gap-2 px-4 py-1 border border-divider/15 rounded-lg bg-content1/40 text-[9px] uppercase tracking-wider text-default-500 select-none">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>{currentUser?.role || "User"} Workspace</span>
        </div>
      </div>

      {/* Render active module */}
      <div className="transition-all duration-300">
        {activeSubTab === "reconciliation" && (
          <DailyReconciliationModule darkMode={darkMode} />
        )}

        {activeSubTab === "transmission" && isAdmin && (
          <SalesTransmissionModule darkMode={darkMode} hideManualImport={true} />
        )}

        {activeSubTab === "import" && isAdmin && (
          <SalesTransmissionModule darkMode={darkMode} showOnlyImport={true} />
        )}
      </div>
    </div>
  );
};
