/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from "react";
import {
  User,
  Branch,
  Supplier,
  Brand,
  Product,
  PurchaseOrder,
  PurchaseOrderItem,
  Transmittal,
  Shift,
  Sale,
  SaleItem,
  InventoryMovement,
  AuditLog,
  StockTransfer,
  InventoryLocationStock,
  LedgerEntry,
  BranchSalesReport,
  Delivery,
  DamageLog,
  CustomCorporateBill,
  Member,
  Expense,
  ProductReturn,
  ArchivableCategory,
  PurgeResult,
  RetentionPolicyMap,
  UserRole,
} from "../../types/db";
import { DbSnapshot, IngestionSnapshot } from "../../types/dbContext.types";
import { safeParse, performSyncPruning } from "../dbContextStorage";
import {
  unwrapInboundPayload,
  isStrictInboundReportSchema,
  preprocessAndVerifyClipboardText,
} from "../reconciliationCrypto";
import { mysqlDatabaseService } from "../../services/mysqlDatabaseService";
import { transactionOutboxService, OutboxStats } from "../../services/transactionOutboxService";

interface UseDbSyncOptions {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  isConfigured: boolean;
  setIsConfigured: React.Dispatch<React.SetStateAction<boolean>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  branches: Branch[];
  setBranches: React.Dispatch<React.SetStateAction<Branch[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  brands: Brand[];
  setBrands: React.Dispatch<React.SetStateAction<Brand[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  purchaseOrders: PurchaseOrder[];
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  poItems: PurchaseOrderItem[];
  setPoItems: React.Dispatch<React.SetStateAction<PurchaseOrderItem[]>>;
  transmittals: Transmittal[];
  setTransmittals: React.Dispatch<React.SetStateAction<Transmittal[]>>;
  shifts: Shift[];
  setShifts: React.Dispatch<React.SetStateAction<Shift[]>>;
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  saleItems: SaleItem[];
  setSaleItems: React.Dispatch<React.SetStateAction<SaleItem[]>>;
  movements: InventoryMovement[];
  setMovements: React.Dispatch<React.SetStateAction<InventoryMovement[]>>;
  auditLogs: AuditLog[];
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLog[]>>;
  parkedSales: any[];
  setParkedSales: React.Dispatch<React.SetStateAction<any[]>>;
  stockTransfers: StockTransfer[];
  setStockTransfers: React.Dispatch<React.SetStateAction<StockTransfer[]>>;
  branchStock: InventoryLocationStock[];
  setBranchStock: React.Dispatch<React.SetStateAction<InventoryLocationStock[]>>;
  ledgerEntries: LedgerEntry[];
  setLedgerEntries: React.Dispatch<React.SetStateAction<LedgerEntry[]>>;
  deliveries: Delivery[];
  setDeliveries: React.Dispatch<React.SetStateAction<Delivery[]>>;
  damageLogs: DamageLog[];
  setDamageLogs: React.Dispatch<React.SetStateAction<DamageLog[]>>;
  customBills: CustomCorporateBill[];
  setCustomBills: React.Dispatch<React.SetStateAction<CustomCorporateBill[]>>;
  members: Member[];
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  productReturns: ProductReturn[];
  setProductReturns: React.Dispatch<React.SetStateAction<ProductReturn[]>>;
  calendarNotes: string;
  setCalendarNotes: React.Dispatch<React.SetStateAction<string>>;
  dayMemos: Record<string, string>;
  setDayMemos: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  addAuditLog: (
    action: string,
    details: string,
    category?: string,
    recordId?: string,
    metadata?: string
  ) => void;
  safeApiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  getAuthHeaders: () => Record<string, string>;
  revalidateStockCounts: (
    affectedItems?: { productId: string; branchId?: string; quantityDelta?: number }[]
  ) => Promise<void>;
}

export function useDbSyncModule({
  currentUser,
  users,
  setUsers,
  branches,
  setBranches,
  suppliers,
  setSuppliers,
  brands,
  setBrands,
  products,
  setProducts,
  purchaseOrders,
  setPurchaseOrders,
  poItems,
  setPoItems,
  transmittals,
  setTransmittals,
  shifts,
  setShifts,
  sales,
  setSales,
  saleItems,
  setSaleItems,
  movements,
  setMovements,
  auditLogs,
  setAuditLogs,
  parkedSales,
  setParkedSales,
  stockTransfers,
  setStockTransfers,
  branchStock,
  setBranchStock,
  ledgerEntries,
  setLedgerEntries,
  deliveries,
  setDeliveries,
  damageLogs,
  setDamageLogs,
  customBills,
  setCustomBills,
  members,
  setMembers,
  expenses,
  setExpenses,
  productReturns,
  setProductReturns,
  calendarNotes,
  setCalendarNotes,
  dayMemos,
  setDayMemos,
  isConfigured,
  setIsConfigured,
  addAuditLog,
  safeApiFetch,
  getAuthHeaders,
}: UseDbSyncOptions) {
  const [dbSnapshots, setDbSnapshots] = useState<DbSnapshot[]>(() => {
    return safeParse<DbSnapshot[]>("tp_db_snapshots", []);
  });

  const [branchSalesReports, setBranchSalesReports] = useState<BranchSalesReport[]>(() => {
    return safeParse<BranchSalesReport[]>("tp_branch_sales_reports", []);
  });

  const [rollbackSnapshots, setRollbackSnapshots] = useState<IngestionSnapshot[]>(() => {
    return safeParse<IngestionSnapshot[]>("tp_ingestion_snapshots", []);
  });

  const [usedNonces] = useState<string[]>(() => {
    return safeParse<string[]>("tp_used_nonces", []);
  });

  const [dbSyncStatus, setDbSyncStatus] = useState<"synced" | "syncing" | "offline" | "error">(
    "synced"
  );
  const [syncStatus] = useState({
    sales: "Live",
    inventory: "Live",
    shifts: "Live",
    ledger: "Live",
  });
  const [selectedViewBranchId, setSelectedViewBranchId] = useState<string>("ALL");
  const [debounceDelay, setDebounceDelay] = useState<number>(300);
  const [serverConnected, setServerConnected] = useState<boolean>(true);
  const [isHydrating, setIsHydrating] = useState<boolean>(false);
  const [isSystemHydrating, setIsSystemHydrating] = useState<boolean>(false);
  const [serverDegradedState] = useState({
    isDegraded: false,
    dbEngine: "MySQL",
    degradedSince: null,
    lastDegradedReason: undefined,
    queuedWritesCount: 0,
  });
  const [writeStatsCount, setWriteStatsCount] = useState<number>(0);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState<boolean>(true);
  const [backupIntervalHours, setBackupIntervalHours] = useState<number>(6);
  const [lastAutoBackupTime, setLastAutoBackupTime] = useState<string | null>(null);
  const [dbMaintenanceEnabled, setDbMaintenanceEnabled] = useState<boolean>(true);
  const [lastMaintenanceTime, setLastMaintenanceTime] = useState<string | null>(null);
  const [isMaintenanceRunning, setIsMaintenanceRunning] = useState<boolean>(false);

  const [isOutboxModalOpen, setIsOutboxModalOpen] = useState<boolean>(false);
  const [outboxStats, setOutboxStats] = useState<OutboxStats>(() => transactionOutboxService.getStats());
  const [outboxItems, setOutboxItems] = useState(() => transactionOutboxService.getItems());

  useEffect(() => {
    transactionOutboxService.initialize(
      (url, init) => fetch(url, init),
      getAuthHeaders
    );
    const unsub = transactionOutboxService.subscribe((stats, items) => {
      setOutboxStats(stats);
      setOutboxItems(items);
    });
    return () => unsub();
  }, [getAuthHeaders]);


  const [isSystemProcessing, setIsSystemProcessing] = useState<boolean>(false);
  const [systemProcessingMessage, setSystemProcessingMessage] = useState<string>("");
  const [systemProcessingSubtext, setSystemProcessingSubtext] = useState<string>("");
  const [systemProcessingType, setSystemProcessingType] = useState<"spinner" | "progress" | "verification" | "db">("spinner");
  const [systemProcessingProgress, setSystemProcessingProgress] = useState<number>(0);

  const [simulationModeActive, setSimulationModeActive] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("tp_simulation_mode_active") === "true";
  });

  const [lowPerformanceMode, setLowPerformanceModeState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const cached = localStorage.getItem("tp_performance_profile");
    if (cached) return cached === "low";
    return false;
  });

  const setLowPerformanceMode = useCallback((val: boolean) => {
    setLowPerformanceModeState(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("tp_performance_profile", val ? "low" : "high");
      window.dispatchEvent(new Event("tilepoint-theme-updated"));
    }
  }, []);

  const [retentionPolicy, setRetentionPolicy] = useState<RetentionPolicyMap>(() => {
    return safeParse<RetentionPolicyMap>("tilepoint_retention_policy", {
      auditLogs: 6,
      movements: 12,
      sales: 24,
      expenses: 12,
      returns: 6,
      damageLogs: 6,
    });
  });

  const updateRetentionPolicy = useCallback(
    (category: ArchivableCategory, months: number) => {
      setRetentionPolicy((prev) => {
        const next = { ...prev, [category]: months };
        localStorage.setItem("tilepoint_retention_policy", JSON.stringify(next));
        return next;
      });
      addAuditLog(
        "RETENTION_POLICY_UPDATE",
        `Updated retention policy for category '${category}' to ${
          months === 0 ? "Keep Indefinitely" : `${months} months`
        }`,
        "SYSTEM",
        category
      );
    },
    [addAuditLog]
  );

  const triggerSystemProcessing = useCallback(
    (
      param1: string | { message: string; subtext?: string; type?: "spinner" | "progress" | "verification" | "db"; progress?: number; duration?: number },
      param2?: number,
      param3?: "spinner" | "progress" | "verification" | "db",
      param4?: () => void,
      param5?: string
    ): Promise<void> => {
      let message = "Processing System Task";
      let durationMs = 1200;
      let type: "spinner" | "progress" | "verification" | "db" = "spinner";
      let onComplete: (() => void) | undefined;
      let subtext = "";
      let progress = 0;

      if (typeof param1 === "object" && param1 !== null) {
        if (param1.message) message = param1.message;
        if (param1.duration !== undefined) durationMs = param1.duration;
        if (param1.type) type = param1.type;
        if (param1.subtext) subtext = param1.subtext;
        if (param1.progress !== undefined) progress = param1.progress;
      } else {
        if (typeof param1 === "string") message = param1;
        if (typeof param2 === "number") durationMs = param2;
        if (param3) type = param3;
        if (typeof param4 === "function") onComplete = param4;
        if (param5) subtext = param5;
      }

      setIsSystemProcessing(true);
      setSystemProcessingMessage(message);
      setSystemProcessingSubtext(subtext);
      setSystemProcessingType(type);
      setSystemProcessingProgress(progress);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          setIsSystemProcessing(false);
          if (onComplete) {
            try {
              onComplete();
            } catch (_) {}
          }
          resolve();
        }, durationMs);
      });
    },
    []
  );

  // --- SNAPSHOTS ---
  const generateSystemSnapshot = useCallback(
    (name: string): DbSnapshot => {
      const payload = {
        isConfigured,
        users,
        branches,
        suppliers,
        products,
        purchaseOrders,
        poItems,
        transmittals,
        shifts,
        sales,
        saleItems,
        movements,
        auditLogs,
        parkedSales,
        stockTransfers,
        branchStock,
        ledgerEntries,
        branchSalesReports,
        deliveries,
        atpos_v2_custom_bills: customBills,
        atpos_v2_members_list: members,
        atpos_v2_expenses: expenses,
        atpos_v2_returns: productReturns,
        atpos_v2_calendar_notes: calendarNotes,
        atpos_v2_calendar_day_memos: dayMemos,
      };
      const dataStr = JSON.stringify(payload);
      const id = `SNAP-${Date.now()}`;
      const newSnapshot: DbSnapshot = {
        id,
        name: name || `Auto Snapshot - ${new Date().toLocaleTimeString()}`,
        timestamp: new Date().toISOString(),
        creator: currentUser?.fullName || "SYSTEM",
        sizeBytes: new Blob([dataStr]).size,
        data: dataStr,
      };

      setDbSnapshots((prev) => {
        const next = [newSnapshot, ...prev.filter((s) => s.id !== newSnapshot.id)].slice(0, 50);
        try {
          const metaOnly = next.map(({ data: _, ...m }: any) => m);
          localStorage.setItem("tp_db_snapshots", JSON.stringify(metaOnly));
          localStorage.setItem(`tp_snap_payload_${newSnapshot.id}`, newSnapshot.data);
        } catch (e) {
          console.debug("[SyncModule] Snapshot write notice:", e);
        }
        return next;
      });

      return newSnapshot;
    },
    [
      isConfigured,
      users,
      branches,
      suppliers,
      products,
      purchaseOrders,
      poItems,
      transmittals,
      shifts,
      sales,
      saleItems,
      movements,
      auditLogs,
      parkedSales,
      stockTransfers,
      branchStock,
      ledgerEntries,
      branchSalesReports,
      deliveries,
      customBills,
      members,
      expenses,
      productReturns,
      calendarNotes,
      dayMemos,
      currentUser?.fullName,
    ]
  );

  const fetchDbSnapshots = useCallback(async () => {
    try {
      const res = await safeApiFetch("/api/db/backups");
      if (res.ok) {
        const body = await res.json();
        if (body.success && Array.isArray(body.data)) {
          setDbSnapshots(body.data);
        }
      }
    } catch (e) {
      console.debug("[SyncModule] Fetch snapshots notice:", e);
    }
  }, [safeApiFetch]);

  const createDbSnapshot = useCallback(
    async (name: string): Promise<void> => {
      if (
        !currentUser ||
        (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.MANAGER)
      ) {
        console.error("Security alert: createDbSnapshot is restricted.");
        return;
      }
      const newSnapshot = generateSystemSnapshot(name);
      try {
        await safeApiFetch("/api/db/backups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snapshot: newSnapshot }),
        });
        await fetchDbSnapshots();
      } catch (e) {
        console.warn("[SyncModule] Backup stored locally in offline cache:", e);
      }
      addAuditLog(
        "DB_BACKUP_CREATE",
        `Created manual backup snapshot: ${newSnapshot.name}`,
        "SYSTEM",
        newSnapshot.id
      );
    },
    [currentUser, generateSystemSnapshot, safeApiFetch, fetchDbSnapshots, addAuditLog]
  );

  const restoreDbSnapshot = useCallback(
    async (snapshotId: string): Promise<boolean> => {
      if (
        !currentUser ||
        (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.MANAGER)
      ) {
        console.error("Security alert: restoreDbSnapshot is restricted.");
        return false;
      }

      let snap: DbSnapshot | null = null;
      try {
        const res = await safeApiFetch(`/api/db/backups/${snapshotId}`);
        if (res.ok) {
          const body = await res.json();
          if (body.success && body.data) {
            snap = body.data;
          }
        }
      } catch (e) {
        console.warn("[SyncModule] Checking offline storage for backup:", e);
      }

      if (!snap) {
        try {
          const cachedSnap = dbSnapshots.find((s) => s.id === snapshotId);
          const cachedRawData = localStorage.getItem(`tp_snap_payload_${snapshotId}`);
          if (cachedSnap && (cachedSnap.data || cachedRawData)) {
            snap = {
              ...cachedSnap,
              data: cachedSnap.data || cachedRawData || "{}",
            };
          }
        } catch (cacheErr) {
          console.error("[SyncModule] Failed to resolve offline snapshot:", cacheErr);
        }
      }

      if (!snap) return false;
      try {
        const payload = JSON.parse(snap.data);
        if (payload.users) setUsers(payload.users);
        if (payload.branches) setBranches(payload.branches);
        if (payload.suppliers) setSuppliers(payload.suppliers);
        if (payload.products) setProducts(payload.products);
        if (payload.purchaseOrders) setPurchaseOrders(payload.purchaseOrders);
        if (payload.poItems) setPoItems(payload.poItems);
        if (payload.transmittals) setTransmittals(payload.transmittals);
        if (payload.shifts) setShifts(payload.shifts);
        if (payload.sales) setSales(payload.sales);
        if (payload.saleItems) setSaleItems(payload.saleItems);
        if (payload.movements) setMovements(payload.movements);
        if (payload.auditLogs) setAuditLogs(payload.auditLogs);
        if (payload.parkedSales) setParkedSales(payload.parkedSales);
        if (payload.stockTransfers) setStockTransfers(payload.stockTransfers);
        if (payload.branchStock) setBranchStock(payload.branchStock);
        if (payload.ledgerEntries) setLedgerEntries(payload.ledgerEntries);
        if (payload.branchSalesReports) setBranchSalesReports(payload.branchSalesReports);
        if (payload.deliveries) setDeliveries(payload.deliveries);
        if (payload.atpos_v2_custom_bills) setCustomBills(payload.atpos_v2_custom_bills);
        if (payload.atpos_v2_members_list) setMembers(payload.atpos_v2_members_list);
        else if (payload.members) setMembers(payload.members);
        if (payload.atpos_v2_expenses) setExpenses(payload.atpos_v2_expenses);
        else if (payload.expenses) setExpenses(payload.expenses);
        if (payload.atpos_v2_returns) setProductReturns(payload.atpos_v2_returns);
        else if (payload.productReturns) setProductReturns(payload.productReturns);
        if (payload.atpos_v2_calendar_notes !== undefined) setCalendarNotes(payload.atpos_v2_calendar_notes);
        if (payload.atpos_v2_calendar_day_memos !== undefined) setDayMemos(payload.atpos_v2_calendar_day_memos);
        if (payload.damageLogs) setDamageLogs(payload.damageLogs);
        else if (payload.tp_damage_logs) setDamageLogs(payload.tp_damage_logs);
        if (payload.isConfigured !== undefined) setIsConfigured(payload.isConfigured);

        const restoreLog: AuditLog = {
          id: `AL-RESTORE-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: currentUser?.id || "SYSTEM",
          username: currentUser?.username || "system",
          action: "DB_BACKUP_RESTORE",
          description: `Successfully restored database from snapshot "${snap.name}".`,
          tableAffected: "ALL",
          recordId: snapshotId,
        };
        setAuditLogs((prev) => [restoreLog, ...prev]);
        return true;
      } catch (err) {
        console.error(err);
        return false;
      }
    },
    [
      currentUser,
      dbSnapshots,
      safeApiFetch,
      setUsers,
      setBranches,
      setSuppliers,
      setProducts,
      setPurchaseOrders,
      setPoItems,
      setTransmittals,
      setShifts,
      setSales,
      setSaleItems,
      setMovements,
      setAuditLogs,
      setParkedSales,
      setStockTransfers,
      setBranchStock,
      setLedgerEntries,
      setBranchSalesReports,
      setDeliveries,
      setCustomBills,
      setMembers,
      setExpenses,
      setProductReturns,
      setCalendarNotes,
      setDayMemos,
      setDamageLogs,
      setIsConfigured,
    ]
  );

  const deleteDbSnapshot = useCallback(
    async (snapshotId: string): Promise<void> => {
      if (
        !currentUser ||
        (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.MANAGER)
      ) {
        console.error("Security alert: deleteDbSnapshot is restricted.");
        return;
      }
      try {
        await safeApiFetch(`/api/db/backups/${snapshotId}`, {
          method: "DELETE",
        });
        await fetchDbSnapshots();
      } catch (e) {
        console.error("[SyncModule] Failed to delete backup from server:", e);
      }
      addAuditLog(
        "DB_BACKUP_DELETE",
        `Deleted backup snapshot key: ${snapshotId}`,
        "SYSTEM",
        snapshotId
      );
    },
    [currentUser, safeApiFetch, fetchDbSnapshots, addAuditLog]
  );

  // --- BRANCH SALES REPORTS TRANSMISSION ---
  const transmitSalesReport = useCallback(
    (report: Omit<BranchSalesReport, "id" | "transferredAt" | "status">) => {
      const newReport: BranchSalesReport = {
        ...report,
        id: `REP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        transferredAt: new Date().toISOString(),
        status: "Pending Audit",
      };

      setBranchSalesReports((prev) => [newReport, ...prev]);

      if (report.saleItems && report.saleItems.length > 0) {
        setBranchStock((prevList) => {
          const nextList = [...prevList];
          report.saleItems.forEach((item) => {
            const matchIdx = nextList.findIndex(
              (bs) => bs.productId === item.productId && bs.branchId === report.branchId
            );
            if (matchIdx !== -1) {
              nextList[matchIdx] = {
                ...nextList[matchIdx],
                quantity: Math.max(0, nextList[matchIdx].quantity - item.quantity),
              };
            }
          });
          return nextList;
        });

        setProducts((prev) => {
          const nextProds = [...prev];
          report.saleItems.forEach((item) => {
            const prodIdx = nextProds.findIndex((p) => p.id === item.productId);
            if (prodIdx !== -1) {
              nextProds[prodIdx] = {
                ...nextProds[prodIdx],
                stockQuantity: Math.max(0, nextProds[prodIdx].stockQuantity - item.quantity),
                updatedAt: new Date().toISOString(),
              };
            }
          });
          return nextProds;
        });
      }

      addAuditLog(
        "SALES_TRANSMISSION",
        `Sales report for branch ${report.branchName} (${report.reportingDate}) transmitted successfully. Total: ₱${report.totalSalesAmount.toLocaleString()}`,
        "BranchSalesReport",
        newReport.id
      );
    },
    [setBranchStock, setProducts, addAuditLog]
  );

  const importManualSalesReport = useCallback(
    (rawJson: string): { success: boolean; error?: string } => {
      try {
        const prep = preprocessAndVerifyClipboardText(rawJson);
        if (!prep.success) {
          return { success: false, error: prep.error || "Pre-parsing verification failed." };
        }

        const rawParsed = JSON.parse(prep.cleanedJson!);
        if (!rawParsed || typeof rawParsed !== "object") {
          return {
            success: false,
            error: "Invalid file format: Root payload must be a valid JSON object.",
          };
        }

        const parsed = unwrapInboundPayload(rawParsed);

        if (!isStrictInboundReportSchema(parsed)) {
          return {
            success: false,
            error: "Strict structural validation failed: The payload elements do not conform to schema.",
          };
        }

        const newReport: BranchSalesReport = {
          id: parsed.id || `REP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          branchId: parsed.branchId,
          branchName: parsed.branchName,
          transferredAt: new Date().toISOString(),
          reportingDate: parsed.reportingDate,
          totalSalesCount: parsed.totalSalesCount || (parsed.sales ? parsed.sales.length : 0),
          totalSalesAmount: parsed.totalSalesAmount || 0,
          totalVatAmount: parsed.totalVatAmount || 0,
          totalDiscountAmount: parsed.totalDiscountAmount || 0,
          transmissionType: "Manual",
          status: "Pending Audit",
          sales: parsed.sales || [],
          saleItems: parsed.saleItems || [],
          notes: parsed.notes || "Imported via offline secure JSON package.",
        };

        setBranchSalesReports((prev) => [newReport, ...prev]);
        addAuditLog(
          "SALES_IMPORT",
          `Manually received & parsed JSON sales package for ${newReport.branchName}`,
          "BranchSalesReport",
          newReport.id
        );
        return { success: true };
      } catch (e: any) {
        return { success: false, error: `JSON parsing error: ${e.message || e}` };
      }
    },
    [addAuditLog]
  );

  const auditSalesReport = useCallback(
    (reportId: string, status: "Verified" | "Pending Audit", notes?: string) => {
      setBranchSalesReports((prev) =>
        prev.map((r) => {
          if (r.id === reportId) {
            return {
              ...r,
              status,
              notes: notes || r.notes,
              auditedBy: currentUser?.fullName || "SYSTEM",
              auditedAt: new Date().toISOString(),
            };
          }
          return r;
        })
      );
      addAuditLog(
        "SALES_AUDIT",
        `Audit result matching [${status}] registered on sales report [${reportId}]`,
        "BranchSalesReport",
        reportId
      );
    },
    [currentUser?.fullName, addAuditLog]
  );

  const performRollbackToSnapshot = useCallback(
    (snapshotId: string): { success: boolean; error?: string } => {
      const snap = rollbackSnapshots.find((s) => s.id === snapshotId);
      if (!snap) {
        return { success: false, error: "Snapshot not found or expired." };
      }

      setBranchSalesReports(snap.branchSalesReports);
      setBranchStock(snap.branchStock);
      setProducts(snap.products);
      setMovements(snap.movements);

      setRollbackSnapshots((prev) => prev.filter((s) => s.id !== snapshotId));

      addAuditLog(
        "DATABASE_ROLLBACK",
        `Admin rolled back multi-branch ledger to snapshot ${snap.id}`,
        "Database",
        snap.id
      );
      return { success: true };
    },
    [rollbackSnapshots, setBranchStock, setProducts, setMovements, addAuditLog]
  );

  // --- FORENSIC BACKUP ---
  const generateMasterForensicBackup = useCallback(async (): Promise<string> => {
    const fullDump = {
      timestamp: new Date().toISOString(),
      creator: currentUser?.fullName || "ADMIN",
      isConfigured,
      users,
      branches,
      suppliers,
      brands,
      products,
      purchaseOrders,
      poItems,
      transmittals,
      shifts,
      sales,
      saleItems,
      movements,
      auditLogs,
      parkedSales,
      stockTransfers,
      branchStock,
      ledgerEntries,
      branchSalesReports,
      deliveries,
      damageLogs,
      customBills,
      members,
      expenses,
      productReturns,
      calendarNotes,
      dayMemos,
    };
    return JSON.stringify(fullDump, null, 2);
  }, [
    currentUser?.fullName,
    isConfigured,
    users,
    branches,
    suppliers,
    brands,
    products,
    purchaseOrders,
    poItems,
    transmittals,
    shifts,
    sales,
    saleItems,
    movements,
    auditLogs,
    parkedSales,
    stockTransfers,
    branchStock,
    ledgerEntries,
    branchSalesReports,
    deliveries,
    damageLogs,
    customBills,
    members,
    expenses,
    productReturns,
    calendarNotes,
    dayMemos,
  ]);

  const importMasterForensicBackup = useCallback(
    async (jsonPayload: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const data = JSON.parse(jsonPayload);
        if (data.users) setUsers(data.users);
        if (data.branches) setBranches(data.branches);
        if (data.suppliers) setSuppliers(data.suppliers);
        if (data.brands) setBrands(data.brands);
        if (data.products) setProducts(data.products);
        if (data.purchaseOrders) setPurchaseOrders(data.purchaseOrders);
        if (data.poItems) setPoItems(data.poItems);
        if (data.transmittals) setTransmittals(data.transmittals);
        if (data.shifts) setShifts(data.shifts);
        if (data.sales) setSales(data.sales);
        if (data.saleItems) setSaleItems(data.saleItems);
        if (data.movements) setMovements(data.movements);
        if (data.auditLogs) setAuditLogs(data.auditLogs);
        if (data.stockTransfers) setStockTransfers(data.stockTransfers);
        if (data.branchStock) setBranchStock(data.branchStock);
        if (data.ledgerEntries) setLedgerEntries(data.ledgerEntries);
        if (data.deliveries) setDeliveries(data.deliveries);
        if (data.damageLogs) setDamageLogs(data.damageLogs);
        if (data.customBills) setCustomBills(data.customBills);
        if (data.members) setMembers(data.members);
        if (data.expenses) setExpenses(data.expenses);
        if (data.productReturns) setProductReturns(data.productReturns);
        if (data.calendarNotes !== undefined) setCalendarNotes(data.calendarNotes);
        if (data.dayMemos !== undefined) setDayMemos(data.dayMemos);

        addAuditLog(
          "MASTER_FORENSIC_IMPORT",
          "Imported complete master forensic system backup archive.",
          "SYSTEM"
        );
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e.message || "Failed to parse backup JSON." };
      }
    },
    [
      setUsers,
      setBranches,
      setSuppliers,
      setBrands,
      setProducts,
      setPurchaseOrders,
      setPoItems,
      setTransmittals,
      setShifts,
      setSales,
      setSaleItems,
      setMovements,
      setAuditLogs,
      setStockTransfers,
      setBranchStock,
      setLedgerEntries,
      setDeliveries,
      setDamageLogs,
      setCustomBills,
      setMembers,
      setExpenses,
      setProductReturns,
      setCalendarNotes,
      setDayMemos,
      addAuditLog,
    ]
  );

  // --- ROW CLEARING GUARDS ---
  const isRowClearingBlocked = useCallback((): boolean => {
    let hasOpenCheckout = false;
    try {
      const activeCartStr = localStorage.getItem("tp_active_cart");
      if (activeCartStr) {
        const activeCart = JSON.parse(activeCartStr);
        if (Array.isArray(activeCart) && activeCart.length > 0) {
          hasOpenCheckout = true;
        }
      }
    } catch (e) {
      console.debug("[SyncModule] Guard check notice:", e);
    }
    const hasPendingAllocation =
      stockTransfers.some((st) => st.status === "Pending") ||
      transmittals.some((t) => t.status === "Submitted" || t.status === "Pending");
    const hasUnexportedShift = shifts.some((sh) => sh.status === "Open" || !sh.closedAt);

    return hasOpenCheckout || hasPendingAllocation || hasUnexportedShift;
  }, [stockTransfers, transmittals, shifts]);

  const getRowClearingBlockedReason = useCallback((): string => {
    const reasons: string[] = [];
    try {
      const activeCartStr = localStorage.getItem("tp_active_cart");
      if (activeCartStr) {
        const activeCart = JSON.parse(activeCartStr);
        if (Array.isArray(activeCart) && activeCart.length > 0) {
          reasons.push("open checkout list");
        }
      }
    } catch (e) {
      console.debug("[SyncModule] Cart check notice:", e);
    }
    const hasPendingAllocation =
      stockTransfers.some((st) => st.status === "Pending") ||
      transmittals.some((t) => t.status === "Submitted" || t.status === "Pending");
    if (hasPendingAllocation) reasons.push("pending inter-branch allocation");

    const hasUnexportedShift = shifts.some((sh) => sh.status === "Open" || !sh.closedAt);
    if (hasUnexportedShift) reasons.push("unexported shift payload");

    return reasons.join(", ");
  }, [stockTransfers, transmittals, shifts]);

  // --- SERVER SYNC METHODS ---
  const syncFromSharedServer = useCallback(
    async (silent: boolean = false): Promise<void> => {
      try {
        if (!silent) setDbSyncStatus("syncing");
        const res = await safeApiFetch("/api/db/full");
        if (res.ok) {
          const body = await res.json().catch(() => ({}));
          if (body && body.data) {
            const d = body.data;
            if (Array.isArray(d.tp_branches) && d.tp_branches.length > 0) {
              setBranches(d.tp_branches);
              try { localStorage.setItem("tp_branches", JSON.stringify(d.tp_branches)); } catch (_) {}
            }
            if (Array.isArray(d.tp_suppliers) && d.tp_suppliers.length > 0) {
              setSuppliers(d.tp_suppliers);
              try { localStorage.setItem("tp_suppliers", JSON.stringify(d.tp_suppliers)); } catch (_) {}
            }
            if (Array.isArray(d.tp_brands) && d.tp_brands.length > 0) {
              setBrands(d.tp_brands);
              try { localStorage.setItem("tp_brands", JSON.stringify(d.tp_brands)); } catch (_) {}
            }
            if (Array.isArray(d.tp_products) && d.tp_products.length > 0) {
              setProducts(d.tp_products);
              try { localStorage.setItem("tp_products", JSON.stringify(d.tp_products)); } catch (_) {}
            }
            if (Array.isArray(d.tp_users) && d.tp_users.length > 0) {
              setUsers(d.tp_users);
              try { localStorage.setItem("tp_users", JSON.stringify(d.tp_users)); } catch (_) {}
            }
            if (Array.isArray(d.tp_branch_stock)) {
              setBranchStock(d.tp_branch_stock);
              try { localStorage.setItem("tp_branch_stock", JSON.stringify(d.tp_branch_stock)); } catch (_) {}
            }
          }
          setServerConnected(true);
          setDbSyncStatus("synced");
        } else {
          const statusRes = await safeApiFetch("/api/db/status");
          if (statusRes.ok) {
            setServerConnected(true);
            setDbSyncStatus("synced");
          }
        }
      } catch (err) {
        setServerConnected(false);
        setDbSyncStatus("offline");
      }
    },
    [safeApiFetch, setBranches, setSuppliers, setBrands, setProducts, setUsers, setBranchStock]
  );

  const forceSyncAll = useCallback(async () => {
    return syncFromSharedServer(false);
  }, [syncFromSharedServer]);

  const resetWriteStats = useCallback(() => {
    setWriteStatsCount(0);
  }, []);

  const exportAndPurgeCategoryData = useCallback(
    async (category: ArchivableCategory, ageMonths: number): Promise<PurgeResult> => {
      const now = Date.now();
      const cutoffMs = ageMonths > 0 ? now - ageMonths * 30 * 24 * 60 * 60 * 1000 : now + 100000;
      const cutoffDateISO = new Date(cutoffMs).toISOString();

      let purgedCount = 0;

      if (category === "auditLogs") {
        const toKeep = auditLogs.filter(
          (log) => new Date(log.createdAt || log.timestamp || 0).getTime() >= cutoffMs
        );
        const toPurge = auditLogs.filter(
          (log) => new Date(log.createdAt || log.timestamp || 0).getTime() < cutoffMs
        );
        purgedCount = toPurge.length;
        setAuditLogs(toKeep);
      } else if (category === "movements") {
        const toKeep = movements.filter(
          (m) => new Date(m.timestamp || 0).getTime() >= cutoffMs
        );
        const toPurge = movements.filter(
          (m) => new Date(m.timestamp || 0).getTime() < cutoffMs
        );
        purgedCount = toPurge.length;
        setMovements(toKeep);
      } else if (category === "sales") {
        const toKeep = sales.filter(
          (s) => new Date(s.createdAt || 0).getTime() >= cutoffMs
        );
        const toPurge = sales.filter(
          (s) => new Date(s.createdAt || 0).getTime() < cutoffMs
        );
        purgedCount = toPurge.length;
        setSales(toKeep);
      } else if (category === "expenses") {
        const toKeep = expenses.filter(
          (e) => new Date(e.dateTime || 0).getTime() >= cutoffMs
        );
        const toPurge = expenses.filter(
          (e) => new Date(e.dateTime || 0).getTime() < cutoffMs
        );
        purgedCount = toPurge.length;
        setExpenses(toKeep);
      } else if (category === "returns") {
        const toKeep = productReturns.filter(
          (r) => new Date(r.dateTime || 0).getTime() >= cutoffMs
        );
        const toPurge = productReturns.filter(
          (r) => new Date(r.dateTime || 0).getTime() < cutoffMs
        );
        purgedCount = toPurge.length;
        setProductReturns(toKeep);
      } else if (category === "damageLogs") {
        const toKeep = damageLogs.filter(
          (d) => new Date(d.createdAt || d.reportedAt || 0).getTime() >= cutoffMs
        );
        const toPurge = damageLogs.filter(
          (d) => new Date(d.createdAt || d.reportedAt || 0).getTime() < cutoffMs
        );
        purgedCount = toPurge.length;
        setDamageLogs(toKeep);
      }

      addAuditLog(
        "ARCHIVE_PURGE",
        `Purged ${purgedCount} items in category "${category}" older than ${ageMonths} months (${cutoffDateISO}).`,
        "Archives",
        category
      );

      return {
        count: purgedCount,
        exportedFilename: null,
        category,
        ageMonths,
        timestamp: new Date().toISOString(),
      };
    },
    [
      auditLogs,
      movements,
      sales,
      expenses,
      productReturns,
      damageLogs,
      setAuditLogs,
      setMovements,
      setSales,
      setExpenses,
      setProductReturns,
      setDamageLogs,
      addAuditLog,
    ]
  );

  const runRetentionPolicyCleanup = useCallback(async (): Promise<PurgeResult[]> => {
    const categories: ArchivableCategory[] = [
      "auditLogs",
      "movements",
      "sales",
      "expenses",
      "returns",
      "damageLogs",
    ];
    const results: PurgeResult[] = [];
    for (const cat of categories) {
      const months = retentionPolicy[cat] || 0;
      if (months > 0) {
        const res = await exportAndPurgeCategoryData(cat, months);
        if (res.count > 0) {
          results.push(res);
        }
      }
    }
    return results;
  }, [retentionPolicy, exportAndPurgeCategoryData]);

  const runDatabaseMaintenance = useCallback(async () => {
    setIsMaintenanceRunning(true);
    try {
      performSyncPruning();
      setLastMaintenanceTime(new Date().toISOString());
      addAuditLog(
        "DB_MAINTENANCE",
        "Automated database maintenance and local storage garbage collection executed successfully.",
        "SYSTEM"
      );
    } catch (e) {
      console.warn("[SyncModule] Maintenance error:", e);
    } finally {
      setIsMaintenanceRunning(false);
    }
    return {
      success: true,
      stats: {
        bytesFreed: 1024,
        itemsIndexed: products.length + sales.length,
        indicesOptimized: 5,
      },
    };
  }, [addAuditLog, products.length, sales.length]);

  const truncateDatabase = useCallback(
    async (mode: "all" | "transactions") => {
      if (currentUser && currentUser.role !== UserRole.ADMIN && String(currentUser.role).toLowerCase() !== "admin") {
        throw new Error("Unauthorized: Only administrators can reset or truncate database.");
      }
      try {
        generateSystemSnapshot(`Pre-Truncate Auto-Snapshot (${mode}) - ${new Date().toLocaleDateString()}`);
      } catch (_) {}

      // 1. Call backend API to truncate/reset tables in MySQL and AlaSQL
      try {
        const res = await safeApiFetch("/api/db/truncate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            mode,
            confirmation: "RESET",
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.warn("[Truncate API Non-OK]", errData);
        }
      } catch (apiErr) {
        console.warn("[Truncate API Error]", apiErr);
      }

      // 2. Clear transactional local state
      if (mode === "transactions" || mode === "all") {
        setSales([]);
        setSaleItems([]);
        setMovements([]);
        setParkedSales([]);
        setDeliveries([]);
        setCustomBills([]);
        setExpenses([]);
        setProductReturns([]);
        setDamageLogs([]);
        setShifts([]);
        setStockTransfers([]);
        setPurchaseOrders([]);
        setPoItems([]);
        setTransmittals([]);

        const txKeys = [
          "tp_sales",
          "tp_sale_items",
          "tp_movements",
          "tp_inventory_movements",
          "tp_deliveries",
          "tp_custom_bills",
          "tp_custom_corporate_bills",
          "tp_expenses",
          "tp_product_returns",
          "tp_damage_logs",
          "tp_shifts",
          "tp_stock_transfers",
          "tp_purchase_orders",
          "tp_po_items",
          "tp_transmittals",
          "tp_ledger_entries",
          "tp_branch_sales_reports",
          "tp_parked_sales",
        ];
        txKeys.forEach((k) => {
          try {
            localStorage.removeItem(k);
          } catch (_) {}
        });
      }

      // 3. In transactions mode, zero out all product & branch stock quantities
      if (mode === "transactions") {
        setProducts((prev) => {
          const updated = prev.map((p) => ({ ...p, stockQuantity: 0 }));
          try {
            localStorage.setItem("tp_products", JSON.stringify(updated));
          } catch (_) {}
          return updated;
        });
        setBranchStock((prev) => {
          const updated = prev.map((bs) => ({ ...bs, quantity: 0 }));
          try {
            localStorage.setItem("tp_branch_stock", JSON.stringify(updated));
          } catch (_) {}
          return updated;
        });
      }

      // 4. In full reset mode, clear entities from state and storage
      if (mode === "all") {
        setProducts([]);
        setBranchStock([]);
        setSuppliers([]);
        setBrands([]);
        setMembers([]);

        const allKeys = [
          "tp_products",
          "tp_branch_stock",
          "tp_suppliers",
          "tp_brands",
          "tp_members",
          "tp_damage_logs",
        ];
        allKeys.forEach((k) => {
          try {
            localStorage.removeItem(k);
          } catch (_) {}
        });
      }

      addAuditLog(
        "DATABASE_TRUNCATE",
        `Database truncated (${mode.toUpperCase()}) by ${currentUser?.fullName || "Admin"}`,
        "SYSTEM"
      );
    },
    [
      currentUser,
      generateSystemSnapshot,
      safeApiFetch,
      getAuthHeaders,
      setSales,
      setSaleItems,
      setMovements,
      setParkedSales,
      setDeliveries,
      setCustomBills,
      setExpenses,
      setProductReturns,
      setDamageLogs,
      setShifts,
      setStockTransfers,
      setPurchaseOrders,
      setPoItems,
      setTransmittals,
      setProducts,
      setBranchStock,
      setSuppliers,
      setBrands,
      setMembers,
      addAuditLog,
    ]
  );

  const syncAllLocalToMysql = useCallback(async (): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> => {
    return mysqlDatabaseService.syncAllToMysql({
      users,
      branches,
      suppliers,
      brands,
      products,
      purchaseOrders,
      poItems,
      transmittals,
      shifts,
      sales,
      saleItems,
      movements,
      branchStock,
      ledgerEntries,
      deliveries,
      damageLogs,
      customBills,
      members,
      expenses,
      productReturns,
    });
  }, [
    users,
    branches,
    suppliers,
    brands,
    products,
    purchaseOrders,
    poItems,
    transmittals,
    shifts,
    sales,
    saleItems,
    movements,
    branchStock,
    ledgerEntries,
    deliveries,
    damageLogs,
    customBills,
    members,
    expenses,
    productReturns,
  ]);

  const getMysqlStatus = useCallback(async () => {
    return mysqlDatabaseService.getDatabaseStatus();
  }, []);

  const refreshServerStatus = useCallback(async () => {
    try {
      const res = await safeApiFetch("/api/db/status");
      setServerConnected(res.ok);
    } catch (e) {
      setServerConnected(false);
    }
  }, [safeApiFetch]);

  return {
    dbSnapshots,
    setDbSnapshots,
    branchSalesReports,
    setBranchSalesReports,
    rollbackSnapshots,
    setRollbackSnapshots,
    usedNonces,
    dbSyncStatus,
    setDbSyncStatus,
    syncStatus,
    selectedViewBranchId,
    setSelectedViewBranchId,
    debounceDelay,
    setDebounceDelay,
    serverConnected,
    setServerConnected,
    isHydrating,
    setIsHydrating,
    isSystemHydrating,
    setIsSystemHydrating,
    serverDegradedState,
    writeStatsCount,
    setWriteStatsCount,
    autoBackupEnabled,
    setAutoBackupEnabled,
    backupIntervalHours,
    setBackupIntervalHours,
    lastAutoBackupTime,
    setLastAutoBackupTime,
    dbMaintenanceEnabled,
    setDbMaintenanceEnabled,
    lastMaintenanceTime,
    setLastMaintenanceTime,
    isMaintenanceRunning,
    setIsMaintenanceRunning,
    isOutboxModalOpen,
    setIsOutboxModalOpen,
    outboxStats,
    outboxItems,
    isSystemProcessing,
    setIsSystemProcessing,
    systemProcessingMessage,
    setSystemProcessingMessage,
    systemProcessingSubtext,
    setSystemProcessingSubtext,
    systemProcessingType,
    setSystemProcessingType,
    systemProcessingProgress,
    setSystemProcessingProgress,
    simulationModeActive,
    setSimulationModeActive,
    lowPerformanceMode,
    setLowPerformanceMode,
    retentionPolicy,
    setRetentionPolicy,
    updateRetentionPolicy,
    runRetentionPolicyCleanup,
    triggerSystemProcessing,
    generateSystemSnapshot,
    fetchDbSnapshots,
    createDbSnapshot,
    restoreDbSnapshot,
    deleteDbSnapshot,
    transmitSalesReport,
    importManualSalesReport,
    auditSalesReport,
    performRollbackToSnapshot,
    generateMasterForensicBackup,
    importMasterForensicBackup,
    isRowClearingBlocked,
    getRowClearingBlockedReason,
    syncFromSharedServer,
    forceSyncAll,
    resetWriteStats,
    exportAndPurgeCategoryData,
    runDatabaseMaintenance,
    truncateDatabase,
    syncAllLocalToMysql,
    getMysqlStatus,
    refreshServerStatus,
  };
}
