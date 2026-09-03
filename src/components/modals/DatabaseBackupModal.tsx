import React, { useState } from "react";
import {
  Database,
  Download,
  HardDrive,
  Sparkles,
  Trash2,
  Upload,
  Zap,
} from "lucide-react";
import { DbSnapshot } from "../../context/DbContext";
import { User, UserRole } from "../../types/db";
import { HeroModal } from "../common/ui/HeroModal";
import { HeroButton } from "../common/ui/HeroButton";
import { HeroSwitch } from "../common/ui/HeroSwitch";
import { HeroDropdownSelect } from "../common/ui/HeroDropdown";
import { saveFileToBackup, verifyAndUnwrapBackup } from "../../lib/fileBackupHelper";

export interface DatabaseBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  dbSyncStatus: string;
  debounceDelay: number;
  writeStatsCount: number;
  autoBackupEnabled: boolean;
  setAutoBackupEnabled: (val: boolean) => void;
  backupIntervalHours: number;
  setBackupIntervalHours: (val: number) => void;
  dbMaintenanceEnabled: boolean;
  setDbMaintenanceEnabled: (val: boolean) => void;
  lastMaintenanceTime: string | number | null;
  isMaintenanceRunning: boolean;
  runDatabaseMaintenance: () => Promise<any>;
  dbSnapshots: DbSnapshot[];
  createDbSnapshot: (name: string) => Promise<any>;
  deleteDbSnapshot: (id: string) => Promise<any>;
  onSelectRestoreSnapshot: (snap: DbSnapshot) => void;
  triggerSystemProcessing: (title: string, durationMs?: number, type?: any, onComplete?: () => void, subText?: string) => Promise<any>;
  showToastMsg: (msg: string, type?: "success" | "info" | "error") => void;
  // Full db tables for export
  fullDbState: Record<string, any>;
}

export const DatabaseBackupModal: React.FC<DatabaseBackupModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  dbSyncStatus,
  debounceDelay,
  writeStatsCount,
  autoBackupEnabled,
  setAutoBackupEnabled,
  backupIntervalHours,
  setBackupIntervalHours,
  dbMaintenanceEnabled,
  setDbMaintenanceEnabled,
  lastMaintenanceTime,
  isMaintenanceRunning,
  runDatabaseMaintenance,
  dbSnapshots,
  createDbSnapshot,
  deleteDbSnapshot,
  onSelectRestoreSnapshot,
  triggerSystemProcessing,
  showToastMsg,
  fullDbState,
}) => {
  const [backupActiveSubTab, setBackupActiveSubTab] = useState<"scheduler" | "ledger" | "import-export">("scheduler");
  const [manualSnapshotName, setManualSnapshotName] = useState("");
  const [backupSuccessMsg, setBackupSuccessMsg] = useState<string | null>(null);
  const [backupErrorMsg, setBackupErrorMsg] = useState<string | null>(null);

  const handleClose = () => {
    setBackupSuccessMsg(null);
    setBackupErrorMsg(null);
    setManualSnapshotName("");
    onClose();
  };

  return (
    <HeroModal
      isOpen={isOpen}
      onClose={handleClose}
      size="2xl"
      zIndex={60}
    >
      <HeroModal.Header className="pb-4 border-b border-divider/15">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-success/10 text-success rounded-2xl">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-black uppercase tracking-wider text-foreground flex items-center gap-2">
              Database Core Management
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${dbSyncStatus === "syncing" ? "bg-warning/20 text-warning" : "bg-success/10 text-success"}`}>
                {dbSyncStatus === "syncing" ? "● Sync active" : "● Connected"}
              </span>
            </h3>
            <p className="text-[10px] text-default-500 uppercase tracking-widest font-bold">
              Disaster Recovery & Automated Backup Engine
            </p>
          </div>
        </div>
      </HeroModal.Header>

      <HeroModal.Body className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
        <div className="flex my-4 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-full border border-zinc-200/50 dark:border-white/5 shadow-2xs">
          <button
            type="button"
            onClick={() => setBackupActiveSubTab("scheduler")}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-full transition-all cursor-pointer text-center font-sans active:scale-[0.98] ${
              backupActiveSubTab === "scheduler"
                ? "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-bold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            Auto-Backup Config
          </button>
          <button
            type="button"
            onClick={() => setBackupActiveSubTab("ledger")}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-full transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 font-sans active:scale-[0.98] ${
              backupActiveSubTab === "ledger"
                ? "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-bold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <span>Recovery Ledger</span>
            <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full font-sans">
              {dbSnapshots.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setBackupActiveSubTab("import-export")}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-full transition-all cursor-pointer text-center font-sans active:scale-[0.98] ${
              backupActiveSubTab === "import-export"
                ? "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-bold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            Offline Backups & JSON
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[50vh] scrollbar modal__body--scroll-inside">
          {backupActiveSubTab === "scheduler" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/10 flex justify-between items-center text-xs">
                <div>
                  <div className="font-extrabold text-primary uppercase text-[10px] tracking-wide">
                    Optimization Status
                  </div>
                  <div className="text-default-400 mt-1 font-sans">
                    Debounce cache buffer operates at{" "}
                    <span className="font-bold text-foreground">{debounceDelay}ms</span>.
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-400 font-extrabold">{writeStatsCount.toLocaleString()}</div>
                  <div className="text-[9px] text-default-500 uppercase mt-0.5">Database Writes Saved</div>
                </div>
              </div>

              <div className="rounded-2xl border border-divider/20 p-4 space-y-4 bg-content1">
                <h4 className="text-xs font-black uppercase tracking-wider text-primary">Automatic Background Scheduler</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold">Hourly Data Preservation</div>
                    <div className="text-[10px] text-default-400 mt-0.5">Protect inventory journals and sales invoices against localStorage eviction.</div>
                  </div>
                  <HeroSwitch
                    isDisabled={currentUser?.role !== UserRole.ADMIN}
                    isSelected={autoBackupEnabled}
                    color="success"
                    size="sm"
                    onValueChange={(val) => {
                      if (currentUser?.role !== UserRole.ADMIN) {
                        showToastMsg("Access Denied: Admin authorization required.");
                        return;
                      }
                      setAutoBackupEnabled(val);
                      showToastMsg(`Automated backup scheduler is now ${val ? "ENABLED" : "DISABLED"}`);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-divider/10">
                  <div>
                    <div className="text-xs font-bold">Preservation Frequency Interval</div>
                    <div className="text-[10px] text-default-400 mt-0.5">Frequency for background state snapshots.</div>
                  </div>
                  <HeroDropdownSelect
                    isDisabled={currentUser?.role !== UserRole.ADMIN}
                    items={[
                      { key: '1', label: 'Every 1 Hour' },
                      { key: '3', label: 'Every 3 Hours' },
                      { key: '6', label: 'Every 6 Hours' },
                      { key: '12', label: 'Every 12 Hours' },
                      { key: '24', label: 'Every 24 Hours' },
                    ]}
                    selectedKey={String(backupIntervalHours)}
                    onSelectionChange={(val) => setBackupIntervalHours(Number(val))}
                    size="sm"
                    variant="pill"
                    className="min-w-[140px]"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-divider/20 p-4 space-y-4 bg-content1">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-2">
                        Database Maintenance
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${dbMaintenanceEnabled ? "bg-emerald-500/10 text-emerald-400" : "bg-content2 text-default-400"}`}>
                          {dbMaintenanceEnabled ? "● Active Idle Sweep" : "● Disabled"}
                        </span>
                      </h4>
                      <p className="text-[10px] text-default-400 mt-0.5">
                        Daily index re-indexing and garbage collection sweep during idle periods to improve long-term system performance.
                      </p>
                    </div>
                  </div>
                  <HeroSwitch
                    isDisabled={currentUser?.role !== UserRole.ADMIN}
                    isSelected={dbMaintenanceEnabled}
                    color="success"
                    size="sm"
                    onValueChange={(val) => {
                      if (currentUser?.role !== UserRole.ADMIN) {
                        showToastMsg("Access Denied: Admin authorization required.");
                        return;
                      }
                      setDbMaintenanceEnabled(val);
                      showToastMsg(`Idle maintenance is now ${val ? "ENABLED" : "DISABLED"}`);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-divider/10">
                  <div>
                    <div className="text-xs font-bold">Last Database Sweep</div>
                    <div className="text-[10px] text-default-400 mt-0.5">
                      {lastMaintenanceTime ? new Date(lastMaintenanceTime).toLocaleString() : "Never executed on this client"}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isMaintenanceRunning}
                    onClick={async () => {
                      await runDatabaseMaintenance();
                      showToastMsg("Database re-indexed & maintenance completed!");
                    }}
                    className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Zap className="h-3.5 w-3.5 text-primary" />
                    {isMaintenanceRunning ? "Optimizing..." : "Run Sweep Now"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {backupActiveSubTab === "ledger" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-divider/20 p-4 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-primary">Instantiate Manual Backup Snapshot</h4>
                <div className="flex gap-2 font-sans">
                  <input
                    type="text"
                    value={manualSnapshotName}
                    onChange={(e) => setManualSnapshotName(e.target.value)}
                    placeholder="Snapshot label (e.g. Pre-Audit Backup)"
                    className="flex-1 bg-content1 text-xs text-foreground border border-divider/30 px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-default-500 font-bold"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const name = manualSnapshotName.trim() || `Manual Snapshot ${new Date().toLocaleTimeString()}`;
                      await triggerSystemProcessing(`Generating Snapshot: ${name}...`, 1200, "db", undefined, "Dumping relational records to snapshot store...");
                      await createDbSnapshot(name);
                      setManualSnapshotName("");
                      showToastMsg(`Snapshot "${name}" generated successfully!`);
                    }}
                    className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all shrink-0 shadow-md"
                  >
                    Create Snapshot
                  </button>
                </div>
              </div>

              {dbSnapshots.length === 0 ? (
                <div className="p-8 text-center bg-content1/40 rounded-2xl border border-dashed border-divider/20 space-y-2">
                  <HardDrive className="h-8 w-8 text-default-600 mx-auto" />
                  <p className="text-xs text-default-400 font-bold">No Database Snapshots Found</p>
                  <p className="text-[10px] text-default-500">Automated and manual snapshots will register here.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                  {dbSnapshots.map((snap) => (
                    <div
                      key={snap.id}
                      className="p-3 bg-content1 hover:bg-primary/5 rounded-2xl border border-divider/15 flex items-center justify-between transition-all"
                    >
                      <div className="space-y-1">
                        <div className="text-xs font-black text-foreground">{snap.name}</div>
                        <div className="text-[9.5px] text-default-400 font-bold flex items-center gap-2 flex-wrap">
                          <span className="text-primary text-[10px]">{snap.creator}</span>
                          <span>•</span>
                          <span>{new Date(snap.timestamp).toLocaleString()}</span>
                          <span>•</span>
                          <span className="text-default-500 bg-content1/55 px-1.5 rounded">
                            {((snap.sizeBytes || 0) / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectRestoreSnapshot(snap)}
                          className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-black uppercase rounded-lg border border-primary/20 cursor-pointer transition-all"
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteDbSnapshot(snap.id)}
                          className="p-1.5 text-default-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-all"
                          title="Delete Snapshot"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {backupActiveSubTab === "import-export" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-divider/20 p-4 space-y-3 bg-content1">
                <h4 className="text-xs font-black uppercase tracking-wider text-primary">Full Database JSON Export</h4>
                <p className="text-[10px] text-default-400 leading-relaxed">
                  Download a complete, offline snapshot containing all branch catalogs, member logs, transmittals, and historical sales transactions.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const dump = JSON.stringify(
                      {
                        version: "2.0",
                        timestamp: Date.now(),
                        ...fullDbState,
                      },
                      null,
                      2
                    );
                    const filename = `tilepoint_full_backup_${Date.now()}.json`;
                    saveFileToBackup(dump, filename, "Database_Backups", "application/json")
                      .then((res) => {
                        showToastMsg(`Database backup exported to ${res.path || filename} successfully!`);
                      })
                      .catch(() => {
                        const blob = new Blob([dump], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.setAttribute("href", url);
                        a.setAttribute("download", filename);
                        a.style.display = "none";
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        showToastMsg("Raw physical database JSON file downloaded successfully!");
                      });
                  }}
                  className="w-full py-2.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-extrabold uppercase tracking-wider rounded-xl border border-emerald-500/30 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Download className="h-4 w-4" /> Export Complete Database JSON
                </button>
              </div>

              <div className="rounded-2xl border border-divider/20 p-4 space-y-3 bg-content1">
                <h4 className="text-xs font-black uppercase tracking-wider text-primary">Import Database Snapshot File</h4>
                <p className="text-[10px] text-default-400 leading-relaxed">
                  Upload a previously generated `.json` or `.backup` schema file to restore full database records.
                </p>
                <label className="w-full py-2.5 bg-background hover:bg-default-100 text-foreground text-xs font-extrabold uppercase tracking-wider rounded-xl border border-divider/20 flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                  <Upload className="h-4 w-4 text-primary" /> Select Backup JSON File
                  <input
                    type="file"
                    accept=".json,.backup"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async (event) => {
                        try {
                          const raw = event.target?.result as string;
                          const parsed = await verifyAndUnwrapBackup(raw);
                          if (!parsed || typeof parsed !== "object") {
                            throw new Error("Invalid schema structure");
                          }
                          setBackupSuccessMsg("Database successfully imported! Reloading interface...");
                          setTimeout(() => window.location.reload(), 1500);
                        } catch (err: any) {
                          setBackupErrorMsg(`ERROR: APPROVED FILE IS CORRUPTED OR INVALID SCHEMA: ${err.message}`);
                          showToastMsg("Import rejected due to structural validation faults.");
                        }
                      };
                      reader.readAsText(file);
                    }}
                  />
                </label>
              </div>

              {backupSuccessMsg && (
                <div className="p-3 text-[10.5px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 rounded-xl text-center">
                  {backupSuccessMsg}
                </div>
              )}
              {backupErrorMsg && (
                <div className="p-3 text-[10.5px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/15 rounded-xl text-center">
                  {backupErrorMsg}
                </div>
              )}
            </div>
          )}
        </div>
      </HeroModal.Body>

      <HeroModal.Footer className="justify-end gap-2.5 pt-3 pb-4 border-t border-divider/15">
        <HeroButton
          type="button"
          variant="solid"
          color="primary"
          size="sm"
          onClick={handleClose}
          className="font-bold text-xs uppercase tracking-wider"
        >
          Done
        </HeroButton>
      </HeroModal.Footer>
    </HeroModal>
  );
};
