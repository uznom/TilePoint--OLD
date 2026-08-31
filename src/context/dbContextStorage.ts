/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HARD_LOCKED_KEYS } from "./seedData";

// Safe Storage Pruning Function (Only cleans up non-essential temporary caches)
export const performSyncPruning = (): number => {
  if (typeof window === "undefined" || !window.localStorage) return 0;
  console.log(
    "[System Guard] Performing safe storage cache maintenance (preserving all inventory & transaction tables)..."
  );
  let bytesFreed = 0;

  const setItemSync = (k: string, val: string) => {
    try {
      window.localStorage.setItem(k, val);
    } catch (swallowedErr) {
      console.debug(
        "[DbContext] Non-fatal swallowed error handled with fallback:",
        swallowedErr
      );
    }
  };

  // 1. Strip heavy 'data' payload from tp_db_snapshots in localStorage (keep metadata only)
  try {
    const snapshotsStr = window.localStorage.getItem("tp_db_snapshots");
    if (snapshotsStr) {
      const snapshots = JSON.parse(snapshotsStr);
      if (Array.isArray(snapshots) && snapshots.length > 0) {
        const metaOnly = snapshots
          .map((s: any) => {
            const { data: _data, ...meta } = s;
            return meta;
          })
          .slice(0, 2);
        const newStr = JSON.stringify(metaOnly);
        setItemSync("tp_db_snapshots", newStr);
        bytesFreed += snapshotsStr.length - newStr.length;
      }
    }
  } catch (_) {
    try {
      window.localStorage.removeItem("tp_db_snapshots");
    } catch (swallowedErr) {
      console.debug(
        "[DbContext] Non-fatal swallowed error handled with fallback:",
        swallowedErr
      );
    }
  }

  // 2. Remove temporary ingestion snapshots
  try {
    const ingestStr = window.localStorage.getItem("tp_ingestion_snapshots");
    if (ingestStr) {
      window.localStorage.removeItem("tp_ingestion_snapshots");
      bytesFreed += ingestStr.length;
    }
  } catch (swallowedErr) {
    console.debug(
      "[DbContext] Non-fatal swallowed error handled with fallback:",
      swallowedErr
    );
  }

  // 3. Clear temporary/transient debugging keys without touching core tables
  [
    "tp_write_stats_prevented",
    "tp_batch_expirations",
    "tp_temp_catalog_cache",
  ].forEach((tk) => {
    try {
      const val = window.localStorage.getItem(tk);
      if (val) {
        bytesFreed += val.length;
        window.localStorage.removeItem(tk);
      }
    } catch (swallowedErr) {
      console.debug(
        "[DbContext] Non-fatal swallowed error handled with fallback:",
        swallowedErr
      );
    }
  });

  console.log(
    `[System Guard] Safe cache maintenance finished. Freed approx ${bytesFreed} bytes.`
  );
  return bytesFreed;
};

export const createLocalDatabaseSnapshot = () => {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const payload: any = {};
    const keysToSave = [
      "tp_is_configured",
      "tp_users",
      "tp_branches",
      "tp_suppliers",
      "tp_products",
      "tp_purchase_orders",
      "tp_po_items",
      "tp_transmittals",
      "tp_shifts",
      "tp_sales",
      "tp_sale_items",
      "tp_movements",
      "tp_audit_logs",
      "tp_parked_sales",
      "tp_stock_transfers",
      "tp_branch_stock",
      "tp_ledger_entries",
      "tp_branch_sales_reports",
      "tp_deliveries",
      "tp_damage_logs",
      "atpos_v2_custom_bills",
      "atpos_v2_members_list",
      "atpos_v2_expenses",
      "atpos_v2_returns",
    ];

    const keyMapping: Record<string, string> = {
      tp_is_configured: "isConfigured",
      tp_users: "users",
      tp_branches: "branches",
      tp_suppliers: "suppliers",
      tp_products: "products",
      tp_purchase_orders: "purchaseOrders",
      tp_po_items: "poItems",
      tp_transmittals: "transmittals",
      tp_shifts: "shifts",
      tp_sales: "sales",
      tp_sale_items: "saleItems",
      tp_movements: "movements",
      tp_audit_logs: "auditLogs",
      tp_parked_sales: "parkedSales",
      tp_stock_transfers: "stockTransfers",
      tp_branch_stock: "branchStock",
      tp_ledger_entries: "ledgerEntries",
      tp_branch_sales_reports: "branchSalesReports",
      tp_deliveries: "deliveries",
      tp_damage_logs: "damageLogs",
      atpos_v2_custom_bills: "atpos_v2_custom_bills",
      atpos_v2_members_list: "atpos_v2_members_list",
      atpos_v2_expenses: "atpos_v2_expenses",
      atpos_v2_returns: "atpos_v2_returns",
    };

    for (const rawKey of keysToSave) {
      const storedVal = window.localStorage.getItem(rawKey);
      if (storedVal !== null) {
        try {
          payload[keyMapping[rawKey]] = JSON.parse(storedVal);
        } catch (_) {
          payload[keyMapping[rawKey]] =
            storedVal === "true"
              ? true
              : storedVal === "false"
              ? false
              : storedVal;
        }
      } else {
        payload[keyMapping[rawKey]] = null;
      }
    }

    const dataStr = JSON.stringify(payload);
    const id = `SNAP-ON-THE-FLY-${Date.now()}`;
    const newSnapshot = {
      id,
      name: `On-the-Fly Safety Snapshot - ${new Date().toLocaleTimeString()}`,
      timestamp: new Date().toISOString(),
      creator: "System Guard Auto-Gen",
      sizeBytes:
        typeof Blob !== "undefined" ? new Blob([dataStr]).size : dataStr.length,
      data: dataStr,
    };

    const existingStr = window.localStorage.getItem("tp_db_snapshots");
    let existingSnapshots: any[] = [];
    if (existingStr) {
      try {
        existingSnapshots = JSON.parse(existingStr);
        if (!Array.isArray(existingSnapshots)) {
          existingSnapshots = [];
        }
      } catch (swallowedErr) {
        console.debug(
          "[DbContext] Non-fatal swallowed error handled with fallback:",
          swallowedErr
        );
      }
    }
    const updatedSnapshots = [newSnapshot, ...existingSnapshots].slice(0, 2);
    window.localStorage.setItem(
      "tp_db_snapshots",
      JSON.stringify(updatedSnapshots)
    );
    console.log(
      "[System Guard] Successfully generated on-the-fly safety snapshot:",
      id
    );
  } catch (err) {
    console.error(
      "[System Guard] Failed to generate on-the-fly safety snapshot:",
      err
    );
  }
};

// Self-healing LocalStorage Interceptor to prevent QuotaExceededError crashes
export const initStorageInterceptor = () => {
  try {
    if (
      typeof window !== "undefined" &&
      window.localStorage &&
      !(window.localStorage.setItem as any).__isInterceptor
    ) {
      const originalSetItem = window.localStorage.setItem;
      const newSetItem = function (this: Storage, key: string, value: string) {
        try {
          originalSetItem.call(window.localStorage, key, value);
        } catch (error: any) {
          if (
            error.name === "QuotaExceededError" ||
            error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
            error.code === 22
          ) {
            console.warn(
              `[System Guard] LocalStorage quota exceeded for key "${key}". Executing synchronous self-heal...`
            );
            performSyncPruning();

            try {
              originalSetItem.call(window.localStorage, key, value);
              console.log(
                `[System Guard] Self-healing SUCCESS: Saved key "${key}" after pruning storage layout.`
              );
              return;
            } catch (retryError) {
              console.warn(
                `[System Guard] LocalStorage full after pruning. Using fallback sessionStorage & volatile memory:`,
                retryError
              );
              try {
                sessionStorage.setItem(key, value);
              } catch (swallowedErr) {
                console.debug(
                  "[DbContext] Non-fatal swallowed error handled with fallback:",
                  swallowedErr
                );
              }
              if (typeof window !== "undefined") {
                (window as any).tpVolatileCache =
                  (window as any).tpVolatileCache || {};
                (window as any).tpVolatileCache[key] = value;
              }
              return;
            }
          }
          throw error;
        }
      };
      (newSetItem as any).__isInterceptor = true;
      window.localStorage.setItem = newSetItem;

      (window as any).createLocalDatabaseSnapshot = createLocalDatabaseSnapshot;

      const originalRemoveItem = window.localStorage.removeItem;
      window.localStorage.removeItem = function (key) {
        if (HARD_LOCKED_KEYS.includes(key)) {
          let isCashier = false;
          try {
            const userStr = window.localStorage.getItem("tp_current_user");
            if (userStr) {
              const user = JSON.parse(userStr);
              if (user && (user.role === "Cashier" || user.role === "Staff")) {
                isCashier = true;
              }
            }
          } catch (swallowedErr) {
            console.debug(
              "[DbContext] Non-fatal swallowed error handled with fallback:",
              swallowedErr
            );
          }

          if (isCashier) {
            console.error(
              `[System Guard] Blocked cashier from removing database storage key "${key}".`
            );
            alert(
              `[System Guard] Action Blocked: Cashiers are not authorized to clear database storage.`
            );
            return;
          }

          const snapshotsStr =
            window.localStorage.getItem("tp_db_snapshots");
          let hasSnapshot = false;
          try {
            if (snapshotsStr) {
              const snapshots = JSON.parse(snapshotsStr);
              hasSnapshot = Array.isArray(snapshots) && snapshots.length > 0;
            }
          } catch (swallowedErr) {
            console.debug(
              "[DbContext] Non-fatal swallowed error handled with fallback:",
              swallowedErr
            );
          }

          if (
            !hasSnapshot &&
            window.localStorage.getItem("tp_is_configured") === "true"
          ) {
            console.log(
              `[System Guard] Satisfying safety requirements: Automatically generating on-the-fly backup snapshot before removing "${key}"`
            );
            createLocalDatabaseSnapshot();
          }
        }
        originalRemoveItem.call(window.localStorage, key);
      };

      const originalClear = window.localStorage.clear;
      window.localStorage.clear = function () {
        let isCashier = false;
        try {
          const userStr = window.localStorage.getItem("tp_current_user");
          if (userStr) {
            const user = JSON.parse(userStr);
            if (user && (user.role === "Cashier" || user.role === "Staff")) {
              isCashier = true;
            }
          }
        } catch (swallowedErr) {
          console.debug(
            "[DbContext] Non-fatal swallowed error handled with fallback:",
            swallowedErr
          );
        }

        if (isCashier) {
          console.error(
            "[System Guard] Blocked cashier from clearing database storage."
          );
          alert(
            "[System Guard] Action Blocked: Cashiers are not authorized to clear database storage."
          );
          return;
        }

        const snapshotsStr =
          window.localStorage.getItem("tp_db_snapshots");
        let hasSnapshot = false;
        try {
          if (snapshotsStr) {
            const snapshots = JSON.parse(snapshotsStr);
            hasSnapshot = Array.isArray(snapshots) && snapshots.length > 0;
          }
        } catch (swallowedErr) {
          console.debug(
            "[DbContext] Non-fatal swallowed error handled with fallback:",
            swallowedErr
          );
        }

        if (
          !hasSnapshot &&
          window.localStorage.getItem("tp_is_configured") === "true"
        ) {
          console.log(
            "[System Guard] Satisfying safety requirements: Automatically generating on-the-fly backup snapshot before clearing database storage."
          );
          createLocalDatabaseSnapshot();
        }
        originalClear.call(window.localStorage);
      };
    }
  } catch (e) {
    console.warn("[System Guard] LocalStorage interceptor error:", e);
  }
};

// Initialize interceptor safely on module load
initStorageInterceptor();

export function safeParse<T>(key: string, defaultValue: T): T {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return defaultValue;
    }
    const cached = localStorage.getItem(key);
    if (!cached) return defaultValue;
    return JSON.parse(cached) as T;
  } catch (error) {
    console.error(`Error parsing localStorage key "${key}":`, error);
    try {
      localStorage.removeItem(key);
    } catch (swallowedErr) {
      console.debug(
        "[DbContext] Non-fatal swallowed error handled with fallback:",
        swallowedErr
      );
    }
    return defaultValue;
  }
}
