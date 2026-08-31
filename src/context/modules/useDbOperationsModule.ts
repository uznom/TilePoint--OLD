/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useMemo, useRef } from "react";
import {
  Sale,
  SaleItem,
  Shift,
  ShiftStatus,
  StockTransfer,
  TransferStatus,
  TransferType,
  PurchaseOrder,
  PurchaseOrderItem,
  POStatus,
  Transmittal,
  TransmittalDocType,
  TransmittalStatus,
  Delivery,
  DeliveryStatus,
  DamageLog,
  Expense,
  ProductReturn,
  CustomCorporateBill,
  Member,
  LoyaltyConfig,
  LedgerEntry,
  Product,
  InventoryLocationStock,
  Branch,
  User,
  InventoryMovement,
  PaymentFrequency,
  BillStatus,
} from "../../types/db";
import {
  SEED_SHIFTS,
  SEED_SALES,
  SEED_SALE_ITEMS,
  SEED_POS,
  SEED_PO_ITEMS,
  SEED_TRANSMITTALS,
} from "../seedData";
import { safeParse } from "../dbContextStorage";
import { isSameBranch, getBranchStockRecord } from "../../lib/branchUtils";
import { mysqlDatabaseService } from "../../services/mysqlDatabaseService";
import { sanitizeInputText } from "../reconciliationCrypto";

interface UseDbOperationsOptions {
  currentUser: User | null;
  branches: Branch[];
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  branchStock: InventoryLocationStock[];
  setBranchStock: React.Dispatch<React.SetStateAction<InventoryLocationStock[]>>;
  movements: InventoryMovement[];
  setMovements: React.Dispatch<React.SetStateAction<InventoryMovement[]>>;
  optimisticStockCacheRef: React.MutableRefObject<
    Map<
      string,
      {
        productId: string;
        branchId?: string;
        quantity: number;
        version: number;
        updatedAt: string;
        lastSaleCommitTime: number;
      }
    >
  >;
  getBranchStockQuantityContext: (productId: string, targetBranchId?: string) => number;
  revalidateStockCounts: (
    affectedItems?: { productId: string; branchId?: string; quantityDelta?: number }[]
  ) => Promise<void>;
  addAuditLog: (
    action: string,
    details: string,
    category?: string,
    recordId?: string,
    metadata?: string
  ) => void;
  logBranchAccessScope: (
    operation: string,
    entityName: string,
    targetBranchId?: string | null,
    recordId?: string | null,
    additionalDetails?: any
  ) => any;
  enqueueTransaction: (tx: any) => void;
  generateSystemSnapshot: (name: string) => any;
}

export function useDbOperationsModule({
  currentUser,
  branches,
  products,
  setProducts,
  branchStock,
  setBranchStock,
  movements,
  setMovements,
  optimisticStockCacheRef,
  getBranchStockQuantityContext,
  revalidateStockCounts,
  addAuditLog,
  logBranchAccessScope,
  enqueueTransaction,
  generateSystemSnapshot,
}: UseDbOperationsOptions) {
  const [shifts, setShifts] = useState<Shift[]>(() => {
    return safeParse<Shift[]>("tp_shifts", SEED_SHIFTS);
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    return safeParse<Sale[]>("tp_sales", SEED_SALES);
  });

  const [saleItems, setSaleItems] = useState<SaleItem[]>(() => {
    return safeParse<SaleItem[]>("tp_sale_items", SEED_SALE_ITEMS);
  });

  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>(() => {
    return safeParse<StockTransfer[]>("tp_stock_transfers", []);
  });

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    return safeParse<PurchaseOrder[]>("tp_purchase_orders", SEED_POS);
  });

  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>(() => {
    return safeParse<PurchaseOrderItem[]>("tp_po_items", SEED_PO_ITEMS);
  });

  const [transmittals, setTransmittals] = useState<Transmittal[]>(() => {
    return safeParse<Transmittal[]>("tp_transmittals", SEED_TRANSMITTALS);
  });

  const [deliveries, setDeliveries] = useState<Delivery[]>(() => {
    return safeParse<Delivery[]>("tp_deliveries", []);
  });

  const [damageLogs, setDamageLogs] = useState<DamageLog[]>(() => {
    return safeParse<DamageLog[]>("tp_damage_logs", []);
  });

  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>(() => {
    return safeParse<LedgerEntry[]>("tp_ledger_entries", []);
  });

  const [customBills, setCustomBills] = useState<CustomCorporateBill[]>(() => {
    return safeParse<CustomCorporateBill[]>("atpos_v2_custom_bills", []);
  });

  const [members, setMembers] = useState<Member[]>(() => {
    return safeParse<Member[]>("atpos_v2_members_list", []);
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    return safeParse<Expense[]>("atpos_v2_expenses", []);
  });

  const [productReturns, setProductReturns] = useState<ProductReturn[]>(() => {
    return safeParse<ProductReturn[]>("atpos_v2_returns", []);
  });

  const [calendarNotes, setCalendarNotes] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("atpos_v2_calendar_notes") || "";
  });

  const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
    spendPerPoint: 500,
    pointsPerSpend: 1,
    pointValueInPhp: 1.0,
    enabled: true,
  };

  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig>(() => {
    return safeParse<LoyaltyConfig>("tilepoint_loyalty_config", DEFAULT_LOYALTY_CONFIG);
  });

  const updateLoyaltyConfig = useCallback((updates: Partial<LoyaltyConfig>) => {
    setLoyaltyConfig((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem("tilepoint_loyalty_config", JSON.stringify(next));
      return next;
    });
  }, []);

  const [dayMemos, setDayMemos] = useState<Record<string, string>>(() => {
    return safeParse<Record<string, string>>("atpos_v2_calendar_day_memos", {});
  });

  const [parkedSales, setParkedSales] = useState<
    {
      id: string;
      customerName: string;
      notes: string;
      items: { product: Product; quantity: number }[];
      timestamp: string;
      heldBy?: string;
      heldByBranchId?: string;
      branchId?: string;
      status?: string;
    }[]
  >(() => {
    return safeParse<
      {
        id: string;
        customerName: string;
        notes: string;
        items: { product: Product; quantity: number }[];
        timestamp: string;
        heldBy?: string;
        heldByBranchId?: string;
        branchId?: string;
        status?: string;
      }[]
    >("tp_parked_sales", []);
  });

  const deletedParkedSaleIds = useRef<Set<string>>(new Set());
  const activeResumingIdsRef = useRef<Set<string>>(new Set());

  const recordDeletedParkedSaleId = useCallback((id: string) => {
    deletedParkedSaleIds.current.add(id);
    try {
      sessionStorage.setItem(
        "tp_deleted_parked_ids",
        JSON.stringify(Array.from(deletedParkedSaleIds.current))
      );
    } catch (e) {
      console.debug("[OperationsModule] Storage notice:", e);
    }
  }, []);

  // --- DERIVED ACTIVE SHIFT ---
  const activeShift = useMemo(() => {
    if (!currentUser) return null;
    return (
      shifts.find(
        (s) =>
          s.cashierId === currentUser.id &&
          (s.status === "OPEN" || s.status === "Open" || (!s.closedAt && s.status !== "CLOSED"))
      ) || null
    );
  }, [shifts, currentUser]);

  // --- PESSIMISTIC LOCKS ---
  const [pessimisticLocks, setPessimisticLocks] = useState<
    Record<string, { lockedAt: string; lockedBy: string }>
  >({});

  const acquirePessimisticLock = useCallback(
    (resourceId: string, username?: string): boolean => {
      const actor = username || currentUser?.username || "SYSTEM";
      const now = Date.now();
      const existing = pessimisticLocks[resourceId];

      if (existing) {
        const lockTime = new Date(existing.lockedAt).getTime();
        const isExpired = now - lockTime > 5 * 60 * 1000;
        if (!isExpired && existing.lockedBy !== actor) {
          console.warn(`[Pessimistic Lock] Resource ${resourceId} is locked by ${existing.lockedBy}.`);
          return false;
        }
      }

      setPessimisticLocks((prev) => ({
        ...prev,
        [resourceId]: {
          lockedAt: new Date().toISOString(),
          lockedBy: actor,
        },
      }));
      addAuditLog(
        "LOCK_ACQUIRE",
        `Acquired pessimistic state lock on resource ID: ${resourceId} by ${actor}`,
        "SystemLocks",
        resourceId
      );
      return true;
    },
    [currentUser?.username, pessimisticLocks, addAuditLog]
  );

  const releasePessimisticLock = useCallback(
    (resourceId: string) => {
      setPessimisticLocks((prev) => {
        const next = { ...prev };
        delete next[resourceId];
        return next;
      });
      addAuditLog(
        "LOCK_RELEASE",
        `Released pessimistic state lock on resource ID: ${resourceId}`,
        "SystemLocks",
        resourceId
      );
    },
    [addAuditLog]
  );

  const isResourceLocked = useCallback(
    (resourceId: string): boolean => {
      const existing = pessimisticLocks[resourceId];
      if (!existing) return false;
      const lockTime = new Date(existing.lockedAt).getTime();
      const isExpired = Date.now() - lockTime > 5 * 60 * 1000;
      return !isExpired;
    },
    [pessimisticLocks]
  );

  // --- MANUAL ADJUSTMENTS & LEDGER ---
  const logManualAdjustment = useCallback(
    (productId: string, quantity: number, notes: string) => {
      const newMove: InventoryMovement = {
        id: `M-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        productId,
        type: "ADJUST",
        quantity,
        destinationBranchId: currentUser?.branchAssignmentId || undefined,
        referenceId: "MANUAL",
        notes,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || "SYSTEM",
        username: currentUser?.username || "system",
      };
      setMovements((prev) => [newMove, ...prev]);
    },
    [currentUser, setMovements]
  );

  const createManualLedgerEntry = useCallback(
    (entry: {
      productId: string;
      branchId: string;
      movementType: "IN" | "OUT" | "ADJUST" | "TRANSFER" | "PURCHASE" | "SALE";
      quantity: number;
      referenceNo: string;
      remarks: string;
    }) => {
      const prod = products.find((p) => p.id === entry.productId);
      if (!prod) return;

      let changeValue = entry.quantity;
      if (["OUT", "SALE"].includes(entry.movementType)) {
        changeValue = -Math.abs(entry.quantity);
      } else if (["IN", "PURCHASE"].includes(entry.movementType)) {
        changeValue = Math.abs(entry.quantity);
      } else {
        changeValue = entry.quantity;
      }

      const newLedgerId = `L-MANUAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newEntry: LedgerEntry = {
        id: newLedgerId,
        date: new Date().toISOString(),
        productId: entry.productId,
        productName: prod.productName,
        branchId: entry.branchId,
        movementType: entry.movementType,
        quantity: changeValue,
        referenceNo: entry.referenceNo || `MAN-${Date.now().toString().slice(-4)}`,
        remarks: entry.remarks || "Manual ledger adjustment",
      };

      setLedgerEntries((prev) => [newEntry, ...prev]);

      setBranchStock((stockList) => {
        const idx = stockList.findIndex(
          (bs) => bs.productId === entry.productId && bs.branchId === entry.branchId
        );
        if (idx !== -1) {
          const updated = [...stockList];
          const nextQty = Math.max(0, updated[idx].quantity + changeValue);
          updated[idx] = {
            ...updated[idx],
            quantity: nextQty,
            version: (updated[idx].version || 0) + 1,
            updatedAt: new Date().toISOString(),
          };
          return updated;
        } else {
          const nextQty = Math.max(0, changeValue);
          return [
            ...stockList,
            {
              id: `${entry.branchId}_${entry.productId}`,
              branchId: entry.branchId,
              productId: entry.productId,
              quantity: nextQty,
              version: 1,
              updatedAt: new Date().toISOString(),
            },
          ];
        }
      });

      setProducts((prods) =>
        prods.map((p) => {
          if (p.id === entry.productId) {
            return {
              ...p,
              stockQuantity: Math.max(0, p.stockQuantity + changeValue),
              version: (p.version || 0) + 1,
              updatedAt: new Date().toISOString(),
              updatedBy: currentUser?.fullName || "SYSTEM",
            };
          }
          return p;
        })
      );

      const newMove: InventoryMovement = {
        id: `M-MANUAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        productId: entry.productId,
        type: entry.movementType === "TRANSFER" ? "TRANSFER" : "ADJUST",
        quantity: changeValue,
        destinationBranchId: entry.branchId,
        referenceId: entry.referenceNo,
        notes: entry.remarks,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || "SYSTEM",
        username: currentUser?.username || "system",
      };
      setMovements((prev) => [newMove, ...prev]);

      const targetBs = branchStock.find(
        (bs) => bs.productId === entry.productId && bs.branchId === entry.branchId
      );
      const curBsQty = targetBs ? targetBs.quantity : 0;
      const newBsQty = Math.max(0, curBsQty + changeValue);

      const curProdQty = prod.stockQuantity ?? 0;
      const newProdQty = Math.max(0, curProdQty + changeValue);

      enqueueTransaction({
        id: `tx-ledger-${newLedgerId}`,
        type: "ATOMIC_TRANSACTION",
        txType: "INVENTORY_ADJUSTMENT",
        timestamp: Date.now(),
        payload: {
          ledgerEntries: [newEntry],
          movements: [newMove],
          branchStockUpdates: [
            {
              id: targetBs ? targetBs.id : `${entry.branchId}_${entry.productId}`,
              branchId: entry.branchId,
              productId: entry.productId,
              quantity: newBsQty,
              version: ((targetBs as any)?.version || 0) + 1,
              updatedAt: new Date().toISOString(),
            },
          ],
          productUpdates: [
            {
              id: entry.productId,
              stockQuantity: newProdQty,
              version: ((prod as any)?.version || 0) + 1,
              updatedAt: new Date().toISOString(),
            },
          ],
          auditLogs: [
            {
              id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              actionCode: "LEDGER_INSERT",
              description: `Manual catalog double-entry ledger update: ${entry.movementType} mode, quantity delta: ${changeValue} for tile SKU ${prod.productCode} at Branch ${entry.branchId}`,
              module: "Products",
              userId: currentUser?.id || "SYSTEM",
              userName: currentUser?.username || "system",
              branchId: entry.branchId,
              timestamp: new Date().toISOString(),
            },
          ],
        },
      });

      addAuditLog(
        "LEDGER_INSERT",
        `Manual catalog double-entry ledger update: ${entry.movementType} mode, quantity delta: ${changeValue} for tile SKU ${prod.productCode} at Branch ${entry.branchId}`,
        "Products",
        entry.productId
      );
    },
    [
      products,
      branchStock,
      currentUser,
      enqueueTransaction,
      setProducts,
      setBranchStock,
      setMovements,
      addAuditLog,
    ]
  );

  // --- HOLD / RESUME PARKED SALES ---
  const holdSale = useCallback(
    (
      cartItems: { product: Product; quantity: number }[],
      customerName: string,
      notes: string,
      targetBranchId?: string
    ): string => {
      const holdId = `HLD-${Date.now()}`;
      const userBranchId = targetBranchId || currentUser?.branchAssignmentId || "B1";
      const newHold = {
        id: holdId,
        customerName: customerName || "Walk-in Customer",
        notes,
        items: cartItems,
        timestamp: new Date().toLocaleTimeString(),
        heldBy: currentUser?.fullName || currentUser?.username || "Yard Staff",
        heldByBranchId: userBranchId,
        branchId: userBranchId,
        status: "active",
      };
      setParkedSales((prev) => [...prev, newHold]);

      try {
        const queueChannel = new BroadcastChannel("tilepoint_queue_channel");
        queueChannel.postMessage({ type: "QUEUE_ADD", hold: newHold, timestamp: Date.now() });
        queueChannel.close();
      } catch (e) {
        console.debug("[OperationsModule] Broadcast notice:", e);
      }

      try {
        window.dispatchEvent(
          new CustomEvent("tp_queue_updated", { detail: { action: "add", hold: newHold } })
        );
      } catch (e) {
        console.debug("[OperationsModule] Dispatch notice:", e);
      }

      addAuditLog(
        "POS_PARK_SALE",
        `Held order for customer ${customerName || "Walk-in"} (Hold ID: ${holdId}) by ${
          currentUser?.fullName || "Staff"
        }`,
        "Sales",
        holdId
      );
      return holdId;
    },
    [currentUser, addAuditLog]
  );

  const resumeParkedSale = useCallback(
    (
      parkedId: string,
      cashierName?: string
    ): { success: boolean; record?: any; error?: string } => {
      if (!parkedId) {
        return { success: false, error: "Invalid staged order ID." };
      }

      if (
        activeResumingIdsRef.current.has(parkedId) ||
        deletedParkedSaleIds.current.has(parkedId)
      ) {
        return {
          success: false,
          error: `Staged order (${parkedId}) has already been resumed on another register/session to prevent duplicate records.`,
        };
      }

      activeResumingIdsRef.current.add(parkedId);
      const targetRecord = parkedSales.find((p) => p && p.id === parkedId);

      if (!targetRecord) {
        activeResumingIdsRef.current.delete(parkedId);
        return {
          success: false,
          error: `Staged order (${parkedId}) is no longer in the queue. It may have already been resumed or cleared on another register.`,
        };
      }

      recordDeletedParkedSaleId(parkedId);
      setParkedSales((prev) => prev.filter((p) => p && p.id !== parkedId));

      try {
        const queueChannel = new BroadcastChannel("tilepoint_queue_channel");
        queueChannel.postMessage({ type: "QUEUE_RESUME", parkedId, timestamp: Date.now() });
        queueChannel.close();
      } catch (e) {
        console.debug("[OperationsModule] Broadcast notice:", e);
      }

      try {
        window.dispatchEvent(
          new CustomEvent("tp_queue_updated", { detail: { action: "resume", parkedId } })
        );
      } catch (e) {
        console.debug("[OperationsModule] Dispatch notice:", e);
      }

      try {
        localStorage.setItem("tp_last_resumed_hold_id", `${parkedId}_${Date.now()}`);
        window.dispatchEvent(new Event("storage"));
      } catch (e) {
        console.debug("[OperationsModule] Storage event notice:", e);
      }

      addAuditLog(
        "POS_RESUME_PARK_SALE",
        `Resumed held transaction ${parkedId} for ${targetRecord.customerName || "Walk-in"} by Cashier ${
          cashierName || currentUser?.fullName || "System"
        }`,
        "Sales",
        parkedId
      );

      setTimeout(() => {
        activeResumingIdsRef.current.delete(parkedId);
      }, 10000);

      return {
        success: true,
        record: targetRecord,
      };
    },
    [parkedSales, currentUser?.fullName, recordDeletedParkedSaleId, addAuditLog]
  );

  // --- CHECKOUT & VOID SALE ---
  const checkoutSale = useCallback(
    (
      cartItems: { product: Product; quantity: number }[],
      customerName: string,
      notes: string,
      discountAmount: number,
      paymentMethod: Sale["paymentMethod"],
      amountTendered: number,
      customVat?: number,
      idempotencyKey?: string,
      discountType?: string,
      targetBranchId?: string,
      pointsRedeemed?: number,
      customerAddress?: string,
      customerTin?: string,
      businessStyle?: string
    ): Sale => {
      if (idempotencyKey) {
        const existingSale = sales.find((s) => s.idempotencyKey === idempotencyKey);
        if (existingSale) {
          console.warn(
            `[System Guard] Idempotency Shield: Duplicate transaction detected for key: ${idempotencyKey}. Returning existing sale.`
          );
          return existingSale;
        }
      }

      const saleId = `SL-${Date.now()}`;
      const saleNum = `SL-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
        Math.random() * 10000
      )
        .toString()
        .padStart(4, "0")}`;

      const userBranchId = targetBranchId || currentUser?.branchAssignmentId || "B1";

      for (const item of cartItems) {
        const currentQty = getBranchStockQuantityContext(item.product.id, userBranchId);
        if (currentQty < item.quantity) {
          throw new Error(
            `Insufficient inventory: Product "${item.product.productName}" has only ${currentQty} units available in branch inventory, but ${item.quantity} units were requested.`
          );
        }
      }

      const subtotal = cartItems.reduce((acc, item) => {
        const branchStockRec = getBranchStockRecord(item.product, userBranchId, branchStock, branches);
        const basePrice =
          branchStockRec &&
          branchStockRec.sellingPriceOverride !== undefined &&
          branchStockRec.sellingPriceOverride > 0
            ? branchStockRec.sellingPriceOverride
            : item.product.sellingPrice;
        const unitPrice =
          (item as any).overridePrice !== undefined ? (item as any).overridePrice : basePrice;
        return acc + unitPrice * item.quantity;
      }, 0);

      const vat =
        customVat !== undefined ? customVat : parseFloat((subtotal * 0.12).toFixed(2));
      const grandTotal = parseFloat((subtotal - discountAmount).toFixed(2));
      const changeAmount =
        paymentMethod === "Cash" ? parseFloat((amountTendered - grandTotal).toFixed(2)) : 0.0;

      const isWalkInCustomer =
        !customerName ||
        customerName.trim().toLowerCase() === "walk-in customer" ||
        customerName.trim().toLowerCase() === "walk-in" ||
        customerName.trim().toLowerCase() === "walk-in buyer" ||
        customerName.trim().toLowerCase().startsWith("walk-in");

      const matchingMember = !isWalkInCustomer
        ? members.find(
            (m) => m.fullName.toLowerCase() === (customerName || "").toLowerCase()
          )
        : undefined;

      const pointsEarned =
        !isWalkInCustomer &&
        loyaltyConfig.enabled &&
        loyaltyConfig.spendPerPoint > 0 &&
        grandTotal > 0
          ? Math.floor(grandTotal / loyaltyConfig.spendPerPoint) * loyaltyConfig.pointsPerSpend
          : 0;
      const ptsRedeemed = pointsRedeemed || 0;

      if (paymentMethod === "Member Credit") {
        if (matchingMember) {
          if (matchingMember.status !== "Active") {
            throw new Error(
              `Credit Transaction Blocked: Customer "${matchingMember.fullName}" is currently Suspended.`
            );
          }
          const remainingLimit = matchingMember.creditLimit - matchingMember.outstandingBalance;
          if (grandTotal > remainingLimit) {
            throw new Error(
              `Credit Limit Exceeded: Customer "${matchingMember.fullName}" has a remaining credit limit of ₱${remainingLimit.toLocaleString()}, but this transaction total is ₱${grandTotal.toLocaleString()}.`
            );
          }
          setMembers((prevMembers) =>
            prevMembers.map((m) =>
              m.id === matchingMember.id
                ? {
                    ...m,
                    outstandingBalance: parseFloat((m.outstandingBalance + grandTotal).toFixed(2)),
                    points: Math.max(0, (m.points || 0) + pointsEarned - ptsRedeemed),
                  }
                : m
            )
          );
        } else {
          throw new Error(
            `Invalid Credit Profile: No registered Corporate Member found matching the customer name "${customerName}". Please assign an active member first.`
          );
        }
      } else if (matchingMember) {
        setMembers((prevMembers) =>
          prevMembers.map((m) =>
            m.id === matchingMember.id
              ? {
                  ...m,
                  points: Math.max(0, (m.points || 0) + pointsEarned - ptsRedeemed),
                }
              : m
          )
        );
      }

      logBranchAccessScope("CREATE", "Sale (POS Checkout)", userBranchId, saleId);
      const newSale: Sale = {
        id: saleId,
        saleNumber: saleNum,
        shiftId: activeShift ? activeShift.id : "NO-SHIFT-ACTIVE",
        branchId: userBranchId,
        cashierId: currentUser?.id || "SYSTEM",
        cashierName: currentUser?.fullName || "System Automated",
        customerName: customerName || "Walk-in Customer",
        customerAddress,
        customerTin,
        businessStyle,
        subtotal,
        vat,
        discount: discountAmount,
        grandTotal,
        paymentMethod,
        amountTendered: paymentMethod === "Cash" ? amountTendered : grandTotal,
        changeAmount: changeAmount > 0 ? changeAmount : 0,
        notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDeleted: false,
        idempotencyKey,
        pointsEarned,
        pointsRedeemed: ptsRedeemed,
        discountType,
      };

      const newSaleItems: SaleItem[] = cartItems.map((item: any, idx) => {
        const branchStockRec = getBranchStockRecord(item.product, userBranchId, branchStock, branches);
        const basePrice =
          branchStockRec &&
          branchStockRec.sellingPriceOverride !== undefined &&
          branchStockRec.sellingPriceOverride > 0
            ? branchStockRec.sellingPriceOverride
            : item.product.sellingPrice;
        const unitPrice =
          item.overridePrice !== undefined ? item.overridePrice : basePrice;
        const lineSubtotal = unitPrice * item.quantity;
        let itemDiscount = 0;
        const dType = item.discountType || "NONE";
        const dVal = item.discountValue || 0;

        if (dType === "FLAT") {
          itemDiscount = Math.min(lineSubtotal, dVal);
        } else if (dType === "PERCENT") {
          itemDiscount = parseFloat((lineSubtotal * (dVal / 100)).toFixed(2));
        } else if (dType === "SENIOR" || dType === "PWD") {
          itemDiscount = parseFloat((lineSubtotal * 0.2).toFixed(2));
        } else if (dType === "CONTRACT") {
          itemDiscount = parseFloat((lineSubtotal * 0.1).toFixed(2));
        } else if (item.discountAmount) {
          itemDiscount = item.discountAmount;
        }

        itemDiscount = Math.min(lineSubtotal, Math.max(0, itemDiscount));
        const itemTotal = parseFloat((lineSubtotal - itemDiscount).toFixed(2));

        return {
          id: `SLI-${saleId}-${idx}`,
          saleId,
          productId: item.product.id,
          productName: item.product.productName,
          unitPrice,
          quantity: item.quantity,
          discount: itemDiscount,
          discountType: dType,
          total: itemTotal,
          isDeleted: false,
        };
      });

      setSales((prev) => [newSale, ...prev]);
      setSaleItems((prev) => [...prev, ...newSaleItems]);

      setBranchStock((prevList) => {
        const nextList = [...prevList];
        const nowIso = new Date().toISOString();
        cartItems.forEach((item) => {
          const bsRec = getBranchStockRecord(item.product, userBranchId, nextList, branches);
          const matchIdx = bsRec ? nextList.findIndex((bs) => bs.id === bsRec.id) : -1;
          if (matchIdx !== -1) {
            nextList[matchIdx] = {
              ...nextList[matchIdx],
              id: nextList[matchIdx].id || `${userBranchId}_${item.product.id}`,
              quantity: Math.max(0, nextList[matchIdx].quantity - item.quantity),
              version: (nextList[matchIdx].version || 0) + 1,
              updatedAt: nowIso,
            };
          } else {
            nextList.push({
              id: `${userBranchId}_${item.product.id}`,
              branchId: userBranchId,
              productId: item.product.id,
              quantity: Math.max(
                0,
                getBranchStockQuantityContext(item.product.id, userBranchId) - item.quantity
              ),
              version: 1,
              updatedAt: nowIso,
            });
          }
        });
        return nextList;
      });

      setProducts((prev) => {
        const updated = [...prev];
        cartItems.forEach((item) => {
          const prodIdx = updated.findIndex((p) => p.id === item.product.id);
          if (prodIdx !== -1) {
            updated[prodIdx] = {
              ...updated[prodIdx],
              stockQuantity: Math.max(0, updated[prodIdx].stockQuantity - item.quantity),
              version: (updated[prodIdx].version || 0) + 1,
              updatedAt: new Date().toISOString(),
            };
          }
        });
        return updated;
      });

      const newMovements: InventoryMovement[] = cartItems.map((item, idx) => ({
        id: `M-SALE-${saleId}-${idx}`,
        productId: item.product.id,
        type: "OUT",
        quantity: -item.quantity,
        sourceBranchId: currentUser?.branchAssignmentId || "B1",
        referenceId: saleId,
        notes: `Sold to ${customerName || "Walk-in"} in Invoice ${saleNum}`,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || "SYSTEM",
        username: currentUser?.username || "system",
      }));
      setMovements((prev) => [...newMovements, ...prev]);

      if (activeShift) {
        setShifts((prev) =>
          prev.map((s) => {
            if (s.id === activeShift.id) {
              return {
                ...s,
                shiftSalesCount: s.shiftSalesCount + 1,
                shiftSalesTotal: s.shiftSalesTotal + grandTotal,
                shiftVatTotal: s.shiftVatTotal + vat,
                shiftDiscountTotal: s.shiftDiscountTotal + discountAmount,
              };
            }
            return s;
          })
        );
      }

      addAuditLog(
        "POS_CHECKOUT",
        `Completed sale invoice ${saleNum}. Amount: ₱${grandTotal.toFixed(2)}`,
        "Sales",
        saleId
      );

      const affectedBranchStockUpdates = cartItems.map((item) => {
        const bsRecord = branchStock.find(
          (bs) => bs.productId === item.product.id && bs.branchId === userBranchId
        );
        const currentBsQty = bsRecord ? bsRecord.quantity : item.product.stockQuantity ?? 0;
        const newBsQty = Math.max(0, currentBsQty - item.quantity);
        return {
          id: bsRecord ? bsRecord.id : `${userBranchId}_${item.product.id}`,
          branchId: userBranchId,
          productId: item.product.id,
          quantity: newBsQty,
          version: ((bsRecord as any)?.version || 0) + 1,
          updatedAt: new Date().toISOString(),
        };
      });

      const affectedProductUpdates = cartItems.map((item) => {
        const prodRecord = products.find((p) => p.id === item.product.id);
        const currentProdQty = prodRecord ? prodRecord.stockQuantity : item.product.stockQuantity ?? 0;
        const newProdQty = Math.max(0, currentProdQty - item.quantity);
        return {
          id: item.product.id,
          stockQuantity: newProdQty,
          version: ((prodRecord as any)?.version || 0) + 1,
          updatedAt: new Date().toISOString(),
        };
      });

      enqueueTransaction({
        id: `tx-checkout-${saleId}`,
        type: "ATOMIC_TRANSACTION",
        txType: "POS_CHECKOUT",
        timestamp: Date.now(),
        payload: {
          sales: [newSale],
          saleItems: newSaleItems,
          movements: newMovements,
          auditLogs: [
            {
              id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              actionCode: "POS_CHECKOUT",
              description: `Completed sale invoice ${saleNum}. Amount: ₱${grandTotal.toFixed(2)}`,
              module: "Sales",
              userId: currentUser?.id || "SYSTEM",
              userName: currentUser?.fullName || "System Automated",
              branchId: userBranchId,
              timestamp: new Date().toISOString(),
            },
          ],
          branchStockUpdates: affectedBranchStockUpdates,
          productUpdates: affectedProductUpdates,
          shifts: activeShift
            ? [
                {
                  ...activeShift,
                  shiftSalesCount: activeShift.shiftSalesCount + 1,
                  shiftSalesTotal: activeShift.shiftSalesTotal + grandTotal,
                  shiftVatTotal: activeShift.shiftVatTotal + vat,
                  shiftDiscountTotal: activeShift.shiftDiscountTotal + discountAmount,
                },
              ]
            : [],
          members: matchingMember
            ? [
                {
                  ...matchingMember,
                  outstandingBalance:
                    paymentMethod === "Member Credit"
                      ? parseFloat((matchingMember.outstandingBalance + grandTotal).toFixed(2))
                      : matchingMember.outstandingBalance,
                  points: Math.max(0, (matchingMember.points || 0) + pointsEarned - ptsRedeemed),
                },
              ]
            : [],
          removeParkedSaleId:
            idempotencyKey && idempotencyKey.startsWith("HLD-") ? idempotencyKey : null,
        },
      });

      mysqlDatabaseService
        .saveSaleLog({
          id: newSale.id,
          saleNumber: newSale.saleNumber,
          branchId: newSale.branchId,
          cashierId: newSale.cashierId,
          cashierName: newSale.cashierName,
          shiftId: newSale.shiftId,
          customerName: newSale.customerName,
          subtotal: newSale.subtotal,
          taxAmount: newSale.vat,
          discountTotal: newSale.discount,
          grandTotal: newSale.grandTotal,
          paymentMethod: newSale.paymentMethod,
          paymentStatus: "PAID",
          items: newSaleItems.map((item) => ({
            id: item.id,
            saleId: item.saleId,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.total,
          })),
          createdAt: newSale.createdAt,
          updatedAt: newSale.updatedAt,
        })
        .catch((err) => console.warn("[DbContext] mysqlDatabaseService.saveSaleLog notice:", err));

      mysqlDatabaseService
        .logAuditTrail({
          action: "POS_CHECKOUT",
          category: "Sales",
          details: `Completed sale invoice ${saleNum}. Amount: ₱${grandTotal.toFixed(2)}`,
          performerId: currentUser?.id || "SYSTEM",
          performerName: currentUser?.fullName || "System",
          branchId: userBranchId,
          entityId: saleId,
          entityType: "SALE",
          createdAt: new Date().toISOString(),
        })
        .catch(() => {});

      const now = Date.now();
      const nowIso = new Date().toISOString();
      cartItems.forEach((item) => {
        const bsRecord = branchStock.find(
          (bs) => bs.productId === item.product.id && bs.branchId === userBranchId
        );
        const prodRecord = products.find((p) => p.id === item.product.id);

        const currentBsQty = bsRecord ? bsRecord.quantity : item.product.stockQuantity ?? 0;
        const newBsQty = Math.max(0, currentBsQty - item.quantity);
        const bsVersion = ((bsRecord as any)?.version || 0) + 1;

        const currentProdQty = prodRecord ? prodRecord.stockQuantity : item.product.stockQuantity ?? 0;
        const newProdQty = Math.max(0, currentProdQty - item.quantity);
        const prodVersion = ((prodRecord as any)?.version || 0) + 1;

        optimisticStockCacheRef.current.set(`bs:${userBranchId}:${item.product.id}`, {
          productId: item.product.id,
          branchId: userBranchId,
          quantity: newBsQty,
          version: bsVersion,
          updatedAt: nowIso,
          lastSaleCommitTime: now,
        });

        optimisticStockCacheRef.current.set(`prod:${item.product.id}`, {
          productId: item.product.id,
          quantity: newProdQty,
          version: prodVersion,
          updatedAt: nowIso,
          lastSaleCommitTime: now,
        });
      });

      const affectedItems = cartItems.map((item) => ({
        productId: item.product.id,
        branchId: userBranchId,
        quantityDelta: 0,
      }));
      revalidateStockCounts(affectedItems).catch((err) => {
        console.warn("[POS Checkout] Immediate stock revalidation background failure:", err);
      });

      return newSale;
    },
    [
      sales,
      currentUser,
      getBranchStockQuantityContext,
      branchStock,
      branches,
      members,
      loyaltyConfig,
      logBranchAccessScope,
      activeShift,
      setMovements,
      addAuditLog,
      enqueueTransaction,
      products,
      setProducts,
      setBranchStock,
      optimisticStockCacheRef,
      revalidateStockCounts,
    ]
  );

  const voidSale = useCallback(
    (saleId: string) => {
      const targetSale = sales.find((s) => s.id === saleId);
      if (!targetSale) return;

      setSales((prev) =>
        prev.map((s) =>
          s.id === saleId
            ? { ...s, isDeleted: true, deletedAt: new Date().toISOString() }
            : s
        )
      );

      setSaleItems((prev) =>
        prev.map((item) =>
          item.saleId === saleId
            ? { ...item, isDeleted: true, deletedAt: new Date().toISOString() }
            : item
        )
      );

      const itemsToRestore = saleItems.filter((item) => item.saleId === saleId);

      setProducts((prev) => {
        const updated = [...prev];
        itemsToRestore.forEach((item) => {
          const prodIdx = updated.findIndex((p) => p.id === item.productId);
          if (prodIdx !== -1) {
            updated[prodIdx] = {
              ...updated[prodIdx],
              stockQuantity: updated[prodIdx].stockQuantity + item.quantity,
              version: (updated[prodIdx].version || 0) + 1,
              updatedAt: new Date().toISOString(),
            };
          }
        });
        return updated;
      });

      const newMovements: InventoryMovement[] = itemsToRestore.map((item, idx) => ({
        id: `M-VOID-${saleId}-${idx}`,
        productId: item.productId,
        type: "IN",
        quantity: item.quantity,
        sourceBranchId: targetSale.branchId,
        referenceId: saleId,
        notes: `Restored: Voided invoice ${targetSale.saleNumber} by ${
          currentUser?.fullName || "SYSTEM"
        }`,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || "SYSTEM",
        username: currentUser?.username || "system",
      }));
      setMovements((prev) => [...newMovements, ...prev]);

      setBranchStock((prevList) => {
        const nextList = [...prevList];
        itemsToRestore.forEach((item) => {
          const matchIdx = nextList.findIndex(
            (bs) =>
              bs.productId === item.productId && bs.branchId === targetSale.branchId
          );
          if (matchIdx !== -1) {
            nextList[matchIdx] = {
              ...nextList[matchIdx],
              quantity: nextList[matchIdx].quantity + item.quantity,
              version: (nextList[matchIdx].version || 0) + 1,
              updatedAt: new Date().toISOString(),
            };
          } else {
            nextList.push({
              id: `${targetSale.branchId}_${item.productId}`,
              branchId: targetSale.branchId,
              productId: item.productId,
              quantity: item.quantity,
              version: 1,
              updatedAt: new Date().toISOString(),
            });
          }
        });
        return nextList;
      });

      if (activeShift && targetSale.shiftId === activeShift.id) {
        setShifts((prev) =>
          prev.map((s) => {
            if (s.id === activeShift.id) {
              return {
                ...s,
                shiftSalesCount: Math.max(0, s.shiftSalesCount - 1),
                shiftSalesTotal: Math.max(0, s.shiftSalesTotal - targetSale.grandTotal),
                shiftVatTotal: Math.max(0, s.shiftVatTotal - targetSale.vat),
                shiftDiscountTotal: Math.max(
                  0,
                  s.shiftDiscountTotal - targetSale.discount
                ),
              };
            }
            return s;
          })
        );
      }

      if (targetSale.paymentMethod === "Member Credit") {
        setMembers((prevMembers) =>
          prevMembers.map((m) =>
            m.fullName.toLowerCase() === targetSale.customerName.toLowerCase()
              ? {
                  ...m,
                  outstandingBalance: parseFloat(
                    Math.max(0, m.outstandingBalance - targetSale.grandTotal).toFixed(2)
                  ),
                }
              : m
          )
        );
      }

      enqueueTransaction({
        id: `tx-void-${saleId}`,
        type: "ATOMIC_TRANSACTION",
        txType: "POS_VOID_SALE",
        timestamp: Date.now(),
        payload: {
          sales: [
            {
              ...targetSale,
              isDeleted: true,
              deletedAt: new Date().toISOString(),
            },
          ],
          saleItems: itemsToRestore.map((item) => ({
            ...item,
            isDeleted: true,
            deletedAt: new Date().toISOString(),
          })),
          movements: newMovements,
          auditLogs: [
            {
              id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              actionCode: "POS_VOID_SALE",
              description: `VOIDED transaction invoice ${targetSale.saleNumber}. Restored ${itemsToRestore.length} products to inventory. Refund Amount: ₱${(Number(targetSale.grandTotal) || 0).toFixed(2)}`,
              module: "Sales",
              userId: currentUser?.id || "SYSTEM",
              userName: currentUser?.fullName || "System",
              branchId: targetSale.branchId,
              timestamp: new Date().toISOString(),
            },
          ],
        },
      });

      addAuditLog(
        "POS_VOID_SALE",
        `VOIDED transaction invoice ${targetSale.saleNumber}. Restored ${itemsToRestore.length} products to inventory. Refund Amount: ₱${(Number(targetSale.grandTotal) || 0).toFixed(2)}`,
        "Sales",
        saleId
      );
    },
    [
      sales,
      saleItems,
      setProducts,
      setBranchStock,
      setMovements,
      activeShift,
      currentUser,
      enqueueTransaction,
      addAuditLog,
    ]
  );

  const restoreSale = useCallback(
    (id: string) => {
      setSales((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isDeleted: false, deletedAt: undefined } : s))
      );
      setSaleItems((prev) =>
        prev.map((si) => (si.saleId === id ? { ...si, isDeleted: false, deletedAt: undefined } : si))
      );
      addAuditLog("SALE_RESTORE", `Restored invoice/sale ID ${id} from Archives`, "Sales", id);
    },
    [addAuditLog]
  );

  // --- SHIFTS ---
  const openShift = useCallback(
    (startCash: number) => {
      if (!currentUser) return;
      const existingOpenShift = shifts.find(
        (s) =>
          s.cashierId === currentUser.id &&
          (s.status === "OPEN" || s.status === "Open" || (!s.closedAt && s.status !== "CLOSED"))
      );

      if (existingOpenShift) {
        alert(
          `Shift Drawer Notice: Account "${currentUser.fullName}" already has an active open shift drawer (${existingOpenShift.id}). You must close the current shift drawer before opening a new one.`
        );
        return;
      }

      const shiftId = `SH-${Date.now()}`;
      const newShift: Shift = {
        id: shiftId,
        cashierId: currentUser.id,
        cashierName: currentUser.fullName,
        branchId: currentUser.branchAssignmentId || "B1",
        status: "OPEN",
        startCash,
        endCash: 0,
        cashCount: 0,
        variance: 0,
        openedAt: new Date().toISOString(),
        closedAt: undefined,
        shiftSalesCount: 0,
        shiftSalesTotal: 0,
        shiftVatTotal: 0,
        shiftDiscountTotal: 0,
      };

      setShifts((prev) => [
        newShift,
        ...prev.map((s) => {
          if (
            s.cashierId === currentUser.id &&
            (s.status === "OPEN" || s.status === "Open" || (!s.closedAt && s.status !== "CLOSED"))
          ) {
            return {
              ...s,
              status: "CLOSED" as ShiftStatus,
              closedAt: new Date().toISOString(),
            };
          }
          return s;
        }),
      ]);

      addAuditLog(
        "SHIFT_OPEN",
        `Opened drawer shift (${shiftId}) with starting cash of ₱${startCash.toFixed(2)}`,
        "Shifts",
        shiftId
      );
    },
    [currentUser, shifts, addAuditLog]
  );

  const getShiftReportStats = useCallback(
    (shift: Shift) => {
      const shiftSales = sales.filter((s) => {
        if (!s || s.isDeleted) return false;
        if (s.shiftId === shift.id) return true;
        if (s.branchId === shift.branchId && s.cashierId === shift.cashierId) {
          const sTime = new Date(s.createdAt || 0).getTime();
          const openTime = new Date(shift.openedAt).getTime();
          const closeTime = shift.closedAt ? new Date(shift.closedAt).getTime() : Date.now();
          return sTime >= openTime && sTime <= closeTime;
        }
        return false;
      });

      const salesCount = shiftSales.length;
      const salesTotal = shiftSales.reduce((acc, curr) => acc + (Number(curr.subtotal) || 0), 0);
      const vatTotal = shiftSales.reduce((acc, curr) => acc + (Number(curr.vat) || 0), 0);
      const discountTotal = shiftSales.reduce((acc, curr) => acc + (Number(curr.discount) || 0), 0);
      const netTotal = shiftSales.reduce((acc, curr) => acc + (Number(curr.grandTotal) || 0), 0);

      const cashSalesTotal = shiftSales
        .filter((s) => !s.paymentMethod || s.paymentMethod.toLowerCase() === "cash")
        .reduce((acc, curr) => acc + (Number(curr.grandTotal) || 0), 0);

      const nonCashSalesTotal = Math.max(0, netTotal - cashSalesTotal);

      const shiftExpenses = (expenses || []).filter((e) => {
        if (!e || e.isDeleted) return false;
        if (e.branchId !== shift.branchId) return false;
        const eTime = new Date(e.dateTime || 0).getTime();
        const openTime = new Date(shift.openedAt).getTime();
        const closeTime = shift.closedAt ? new Date(shift.closedAt).getTime() : Date.now();
        return eTime >= openTime && eTime <= closeTime;
      });
      const expensesTotal = shiftExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
      const expectedEndCash = shift.startCash + cashSalesTotal - expensesTotal;

      return {
        salesCount,
        salesTotal,
        vatTotal,
        discountTotal,
        netTotal,
        cashSalesTotal,
        nonCashSalesTotal,
        expensesTotal,
        expectedEndCash,
      };
    },
    [sales, expenses]
  );

  const closeShift = useCallback(
    (cashCount: number) => {
      if (!activeShift) return;

      const snapshotName = `Shift Close Auto-Snapshot - ${activeShift.id} - ${new Date().toLocaleDateString()}`;
      generateSystemSnapshot(snapshotName);

      const statsResult = getShiftReportStats(activeShift);
      const expectedEndCash = statsResult.expectedEndCash;
      const variance = cashCount - expectedEndCash;
      const nowIso = new Date().toISOString();

      setShifts((prev) =>
        prev.map((s) => {
          if (
            s.id === activeShift.id ||
            (currentUser &&
              s.cashierId === currentUser.id &&
              (s.status === "OPEN" || s.status === "Open" || (!s.closedAt && s.status !== "CLOSED")))
          ) {
            return {
              ...s,
              status: "CLOSED" as ShiftStatus,
              endCash: s.id === activeShift.id ? expectedEndCash : s.endCash,
              cashCount: s.id === activeShift.id ? cashCount : s.cashCount,
              variance: s.id === activeShift.id ? variance : s.variance,
              shiftSalesTotal: s.id === activeShift.id ? statsResult.netTotal : s.shiftSalesTotal,
              shiftSalesCount: s.id === activeShift.id ? statsResult.salesCount : s.shiftSalesCount,
              shiftVatTotal: s.id === activeShift.id ? statsResult.vatTotal : s.shiftVatTotal,
              shiftDiscountTotal:
                s.id === activeShift.id ? statsResult.discountTotal : s.shiftDiscountTotal,
              closedAt: s.closedAt || nowIso,
            };
          }
          return s;
        })
      );

      addAuditLog(
        "SHIFT_CLOSE",
        `Closed active shift (${activeShift.id}). Counted ₱${cashCount.toFixed(2)} vs Expected ₱${expectedEndCash.toFixed(2)} (Variance: ₱${variance.toFixed(2)})`,
        "Shifts",
        activeShift.id
      );
    },
    [activeShift, currentUser, generateSystemSnapshot, getShiftReportStats, addAuditLog]
  );

  const forceCloseAllShifts = useCallback(() => {
    const nowIso = new Date().toISOString();
    setShifts((prev) =>
      prev.map((s) => {
        if (s.status === "OPEN" || s.status === "Open" || !s.closedAt || s.status !== "CLOSED") {
          return {
            ...s,
            status: "CLOSED" as ShiftStatus,
            closedAt: s.closedAt || nowIso,
          };
        }
        return s;
      })
    );
    addAuditLog(
      "SHIFT_FORCE_CLOSE_ALL",
      "Forced closure of all open/unclosed drawer shifts via System Operations Center.",
      "Shifts",
      "ALL"
    );
  }, [addAuditLog]);

  // --- PURCHASE ORDERS ---
  const createPurchaseOrder = useCallback(
    (
      supplierId: string,
      branchId: string,
      itemInputs: {
        productId: string;
        costPrice: number;
        quantityRequested: number;
      }[],
      notes?: string,
      status?: POStatus,
      paymentMode?: "fully_paid" | "terms",
      termStartDate?: string,
      termEndDate?: string,
      termsLength?: number,
      idempotencyKey?: string
    ) => {
      if (idempotencyKey) {
        const existingPO = purchaseOrders.find((po) => po.idempotencyKey === idempotencyKey);
        if (existingPO) {
          console.warn(
            `[System Guard] Idempotency Shield: Duplicate Purchase Order detected for key: ${idempotencyKey}. Returning existing PO.`
          );
          return existingPO;
        }
      }

      logBranchAccessScope("CREATE", "PurchaseOrder", branchId, null);
      const poId = `PO-${Date.now()}`;

      let nextNum = purchaseOrders.length + 1;
      purchaseOrders.forEach((p) => {
        const parts = p.poNumber.split("-");
        const lastPart = parts[parts.length - 1];
        const parsedNum = parseInt(lastPart, 10);
        if (!isNaN(parsedNum) && parsedNum >= nextNum) {
          nextNum = parsedNum + 1;
        }
      });

      const poNum = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${nextNum
        .toString()
        .padStart(4, "0")}`;
      const todayStr = new Date().toISOString().slice(0, 10);
      const calculatedTermEndDate = (() => {
        const d = new Date();
        d.setDate(d.getDate() + (termsLength !== undefined ? termsLength : 30));
        return d.toISOString().slice(0, 10);
      })();

      const newPO: PurchaseOrder = {
        id: poId,
        poNumber: poNum,
        supplierId,
        branchId,
        status: (status || "Pending") as POStatus,
        requestedBy: currentUser?.fullName || "SYSTEM",
        date: todayStr,
        notes,
        paymentMode: paymentMode || "terms",
        termStartDate: termStartDate || todayStr,
        termsLength: termsLength !== undefined ? termsLength : 30,
        termEndDate: termEndDate || calculatedTermEndDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        idempotencyKey,
      };

      const newItems: PurchaseOrderItem[] = itemInputs.map((item, idx) => ({
        id: `POI-${poId}-${idx}`,
        poId,
        productId: item.productId,
        costPrice: item.costPrice,
        quantityRequested: item.quantityRequested,
        quantityReceived: 0,
      }));

      setPurchaseOrders((prev) => [newPO, ...prev]);
      setPoItems((prev) => [...prev, ...newItems]);
      addAuditLog(
        "PO_CREATE",
        `Created Purchase Order ${poNum}`,
        "PurchaseOrders",
        poId
      );
    },
    [purchaseOrders, currentUser?.fullName, logBranchAccessScope, addAuditLog]
  );

  const updatePurchaseOrderStatus = useCallback(
    (id: string, status: POStatus) => {
      logBranchAccessScope("UPDATE", "PurchaseOrder", null, id, { status });
      setPurchaseOrders((prev) =>
        prev.map((po) =>
          po.id === id ? { ...po, status, updatedAt: new Date().toISOString() } : po
        )
      );
      addAuditLog(
        "PO_STATUS_CHANGE",
        `Updated PO status of PO ID ${id} to ${status}`,
        "PurchaseOrders",
        id
      );
    },
    [logBranchAccessScope, addAuditLog]
  );

  const receivePurchaseOrderItems = useCallback(
    (
      id: string,
      receivedMap: Record<string, number>,
      paymentMode?: "fully_paid" | "terms",
      termStartDate?: string,
      termEndDate?: string,
      termsLength?: number
    ) => {
      const originalPo = purchaseOrders.find((p) => p.id === id);
      if (!originalPo) return;

      setPoItems((prev) =>
        prev.map((item) => {
          if (item.poId === id && receivedMap[item.productId] !== undefined) {
            const newlyReceived = receivedMap[item.productId];
            return {
              ...item,
              quantityReceived: item.quantityReceived + newlyReceived,
            };
          }
          return item;
        })
      );

      setProducts((prev) => {
        const updated = [...prev];
        Object.entries(receivedMap).forEach(([prodId, qty]) => {
          const prodIdx = updated.findIndex((p) => p.id === prodId);
          if (prodIdx !== -1 && qty > 0) {
            updated[prodIdx] = {
              ...updated[prodIdx],
              stockQuantity: updated[prodIdx].stockQuantity + qty,
              updatedAt: new Date().toISOString(),
            };
          }
        });
        return updated;
      });

      const newItemsMoved: InventoryMovement[] = Object.entries(receivedMap)
        .filter(([_, qty]) => qty > 0)
        .map(([prodId, qty], idx) => ({
          id: `M-PO-${id}-${Date.now()}-${idx}`,
          productId: prodId,
          type: "IN",
          quantity: qty,
          destinationBranchId: originalPo.branchId || "B1",
          referenceId: id,
          notes: `Received cargo on PO ${originalPo.poNumber}`,
          timestamp: new Date().toISOString(),
          userId: currentUser?.id || "SYSTEM",
          username: currentUser?.fullName || "system",
        }));
      setMovements((prev) => [...newItemsMoved, ...prev]);

      if (originalPo.branchId) {
        setBranchStock((prevList) => {
          const nextList = [...prevList];
          Object.entries(receivedMap).forEach(([prodId, qty]) => {
            if (qty > 0) {
              const matchIdx = nextList.findIndex(
                (bs) => bs.productId === prodId && bs.branchId === originalPo.branchId
              );
              if (matchIdx !== -1) {
                nextList[matchIdx] = {
                  ...nextList[matchIdx],
                  quantity: nextList[matchIdx].quantity + qty,
                  updatedAt: new Date().toISOString(),
                };
              } else {
                nextList.push({
                  id: `${originalPo.branchId}_${prodId}`,
                  branchId: originalPo.branchId || "B1",
                  productId: prodId,
                  quantity: qty,
                  updatedAt: new Date().toISOString(),
                });
              }
            }
          });
          return nextList;
        });
      }

      const poItemsForThis = poItems.filter((item) => item.poId === id);
      let allCompleted = true;
      poItemsForThis.forEach((item) => {
        const receivedAfter = item.quantityReceived + (receivedMap[item.productId] || 0);
        if (receivedAfter < (item.quantityRequested ?? 0)) {
          allCompleted = false;
        }
      });

      const finalStatus: POStatus = allCompleted ? "Completed" : "Partially Received";

      setPurchaseOrders((prev) =>
        prev.map((po) => {
          if (po.id === id) {
            return {
              ...po,
              status: finalStatus,
              paymentMode: paymentMode !== undefined ? paymentMode : po.paymentMode,
              termStartDate: termStartDate !== undefined ? termStartDate : po.termStartDate,
              termEndDate: termEndDate !== undefined ? termEndDate : po.termEndDate,
              termsLength: termsLength !== undefined ? termsLength : po.termsLength,
              updatedAt: new Date().toISOString(),
            };
          }
          return po;
        })
      );

      addAuditLog(
        "PO_RECEIVE",
        `Received cargo for PO ${originalPo.poNumber}. Consolidated Status: ${finalStatus}${
          paymentMode ? ` (Payment Mode: ${paymentMode})` : ""
        }`,
        "PurchaseOrders",
        id
      );
    },
    [
      purchaseOrders,
      poItems,
      setProducts,
      setMovements,
      setBranchStock,
      currentUser,
      addAuditLog,
    ]
  );

  const deletePurchaseOrder = useCallback(
    (id: string) => {
      logBranchAccessScope("DELETE", "PurchaseOrder", null, id);
      setPurchaseOrders((prev) =>
        prev.map((po) =>
          po.id === id ? { ...po, isDeleted: true, deletedAt: new Date().toISOString() } : po
        )
      );
      addAuditLog("PO_DELETE", `Soft-deleted purchase order ID: ${id}`, "PurchaseOrders", id);
    },
    [logBranchAccessScope, addAuditLog]
  );

  const restorePurchaseOrder = useCallback(
    (id: string) => {
      setPurchaseOrders((prev) =>
        prev.map((po) => (po.id === id ? { ...po, isDeleted: false, deletedAt: undefined } : po))
      );
      addAuditLog("PO_RESTORE", `Restored purchase order ID ${id} from Archives`, "PurchaseOrders", id);
    },
    [addAuditLog]
  );

  // --- TRANSMITTALS ---
  const createTransmittal = useCallback(
    (
      docType: TransmittalDocType,
      toBranchId: string,
      payloadJson: string,
      notes?: string
    ): string => {
      const transId = `TRAN-${Date.now()}`;
      const newTrans: Transmittal = {
        id: transId,
        documentType: docType,
        fromBranchId: currentUser?.branchAssignmentId || "B1",
        toBranchId,
        submittedBy: currentUser?.fullName || "SYSTEM",
        status: "Submitted" as TransmittalStatus,
        payloadJson,
        notes,
        submittedAt: new Date().toISOString(),
        isDeleted: false,
      };

      setTransmittals((prev) => [newTrans, ...prev]);
      addAuditLog(
        "TRANSMITTAL_SUBMIT",
        `Transmitted form type '${docType}' to target branch ID ${toBranchId}`,
        "Transmittals",
        transId
      );
      return transId;
    },
    [currentUser, addAuditLog]
  );

  const updateTransmittalStatus = useCallback(
    (id: string, status: TransmittalStatus) => {
      logBranchAccessScope("UPDATE", "Transmittal", null, id, { status });
      setTransmittals((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status } : t))
      );
      addAuditLog(
        "TRANSMITTAL_VERDICT",
        `Updated transmittal ID ${id} transmittal ledger to status ${status}`,
        "Transmittals",
        id
      );
    },
    [logBranchAccessScope, addAuditLog]
  );

  const deleteTransmittal = useCallback(
    (id: string) => {
      logBranchAccessScope("DELETE", "Transmittal", null, id);
      setTransmittals((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, isDeleted: true, deletedAt: new Date().toISOString() } : t
        )
      );
      addAuditLog(
        "TRANSMITTAL_DELETE",
        `Soft-deleted transmittal ID: ${id}`,
        "Transmittals",
        id
      );
    },
    [logBranchAccessScope, addAuditLog]
  );

  const restoreTransmittal = useCallback(
    (id: string) => {
      setTransmittals((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isDeleted: false, deletedAt: undefined } : t))
      );
      addAuditLog("TRANSMITTAL_RESTORE", `Restored transmittal ID ${id} from Archives`, "Transmittals", id);
    },
    [addAuditLog]
  );

  // --- STOCK TRANSFERS ---
  const createStockTransfer = useCallback(
    (
      fromBranchId: string,
      toBranchId: string,
      transferType: TransferType,
      itemsInput: { productId: string; quantity: number }[],
      reason: string
    ) => {
      logBranchAccessScope("CREATE", "StockTransfer", fromBranchId, null, { toBranchId });
      const id = `ST-${Date.now()}`;
      const transferNo = `ST-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
        Math.random() * 1000
      )
        .toString()
        .padStart(3, "0")}`;

      const items = itemsInput.map((it, idx) => {
        const p = products.find((prod) => prod.id === it.productId);
        return {
          id: `STI-${id}-${idx}`,
          transferId: id,
          productId: it.productId,
          productName: p ? p.productName : "Unknown Tile",
          quantity: it.quantity,
        };
      });

      const newTransfer: StockTransfer = {
        id,
        transferNo,
        fromBranchId,
        toBranchId,
        transferType,
        requestedBy: currentUser?.fullName || "SYSTEM",
        status: "Pending",
        reason,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items,
      };

      setStockTransfers((prev) => [newTransfer, ...prev]);
      addAuditLog(
        "TRANSFER_CREATE",
        `Created Stock Transfer Request ${transferNo} (${transferType}) from ${fromBranchId} to ${toBranchId}`,
        "StockTransfer",
        id
      );
    },
    [products, currentUser, logBranchAccessScope, addAuditLog]
  );

  const updateStockTransferStatus = useCallback(
    (id: string, status: TransferStatus) => {
      logBranchAccessScope("UPDATE", "StockTransfer", null, id, { status });
      setStockTransfers((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            const prevStatus = t.status;
            if (prevStatus !== status) {
              if (
                (status === "In Transit" || status === "Approved") &&
                prevStatus === "Pending"
              ) {
                setBranchStock((bStock) => {
                  const updatedStock = [...bStock];
                  (t.items || []).forEach((item) => {
                    const idx = updatedStock.findIndex(
                      (bs) =>
                        bs.productId === item.productId && bs.branchId === t.fromBranchId
                    );
                    const deductionQty = -item.quantity;
                    if (idx !== -1) {
                      const bs = updatedStock[idx];
                      const nextQty = Math.max(0, bs.quantity + deductionQty);
                      updatedStock[idx] = {
                        ...bs,
                        quantity: nextQty,
                        version: (bs.version || 0) + 1,
                        updatedAt: new Date().toISOString(),
                      };
                      if (
                        isSameBranch(
                          t.fromBranchId,
                          localStorage.getItem("tilepoint_primary_branch_id") || "B1",
                          branches
                        )
                      ) {
                        setProducts((prods) =>
                          prods.map((prod) =>
                            prod.id === bs.productId
                              ? { ...prod, stockQuantity: nextQty }
                              : prod
                          )
                        );
                      }
                    }
                  });
                  return updatedStock;
                });

                (t.items || []).forEach((item) => {
                  const ledgerId = `L-TR-DISP-${id}-${item.productId}`;
                  const entry: LedgerEntry = {
                    id: ledgerId,
                    date: new Date().toISOString(),
                    productId: item.productId,
                    productName: item.productName,
                    branchId: t.fromBranchId,
                    movementType: "TRANSFER",
                    quantity: -item.quantity,
                    referenceNo: t.transferNo,
                    remarks: `Shipped ${t.transferType} stock to ${t.toBranchId}`,
                  };
                  setLedgerEntries((entries) => [entry, ...entries]);

                  const moveId = `M-TR-DISP-${id}-${item.productId}`;
                  const moveItem: InventoryMovement = {
                    id: moveId,
                    productId: item.productId,
                    type: "TRANSFER",
                    quantity: -item.quantity,
                    sourceBranchId: t.fromBranchId,
                    destinationBranchId: t.toBranchId,
                    referenceId: t.id,
                    notes: `Shipped ${item.quantity} boxes for ${t.transferType} (${t.transferNo})`,
                    timestamp: new Date().toISOString(),
                    userId: currentUser?.id || "SYSTEM",
                    username: currentUser?.username || "system",
                  };
                  setMovements((moves) => [moveItem, ...moves]);
                });
              }

              if (status === "Received") {
                setBranchStock((bStock) => {
                  const updatedStock = [...bStock];
                  (t.items || []).forEach((item) => {
                    const idx = updatedStock.findIndex(
                      (bs) =>
                        bs.productId === item.productId && bs.branchId === t.toBranchId
                    );
                    const additionQty = item.quantity;
                    if (idx !== -1) {
                      const bs = updatedStock[idx];
                      const nextQty = bs.quantity + additionQty;
                      updatedStock[idx] = {
                        ...bs,
                        quantity: nextQty,
                        version: (bs.version || 0) + 1,
                        updatedAt: new Date().toISOString(),
                      };
                      if (
                        isSameBranch(
                          t.toBranchId,
                          localStorage.getItem("tilepoint_primary_branch_id") || "B1",
                          branches
                        )
                      ) {
                        setProducts((prods) =>
                          prods.map((prod) =>
                            prod.id === bs.productId
                              ? { ...prod, stockQuantity: nextQty }
                              : prod
                          )
                        );
                      }
                    } else {
                      const nextQty = additionQty;
                      const newBs: InventoryLocationStock = {
                        id: `${t.toBranchId}_${item.productId}`,
                        branchId: t.toBranchId,
                        productId: item.productId,
                        quantity: nextQty,
                        version: 1,
                        updatedAt: new Date().toISOString(),
                      };
                      updatedStock.push(newBs);
                      if (
                        isSameBranch(
                          t.toBranchId,
                          localStorage.getItem("tilepoint_primary_branch_id") || "B1",
                          branches
                        )
                      ) {
                        setProducts((prods) =>
                          prods.map((prod) =>
                            prod.id === item.productId
                              ? {
                                  ...prod,
                                  stockQuantity: nextQty,
                                  version: (prod.version || 0) + 1,
                                  updatedAt: new Date().toISOString(),
                                }
                              : prod
                          )
                        );
                      }
                    }
                  });
                  return updatedStock;
                });

                (t.items || []).forEach((item) => {
                  const ledgerId = `L-TR-REC-${id}-${item.productId}`;
                  const entry: LedgerEntry = {
                    id: ledgerId,
                    date: new Date().toISOString(),
                    productId: item.productId,
                    productName: item.productName,
                    branchId: t.toBranchId,
                    movementType: "TRANSFER",
                    quantity: item.quantity,
                    referenceNo: t.transferNo,
                    remarks: `Received ${t.transferType} stock from ${t.fromBranchId}`,
                  };
                  setLedgerEntries((entries) => [entry, ...entries]);

                  const moveId = `M-TR-REC-${id}-${item.productId}`;
                  const moveItem: InventoryMovement = {
                    id: moveId,
                    productId: item.productId,
                    type: "TRANSFER",
                    quantity: item.quantity,
                    sourceBranchId: t.fromBranchId,
                    destinationBranchId: t.toBranchId,
                    referenceId: t.id,
                    notes: `Received ${item.quantity} boxes for ${t.transferType} (${t.transferNo})`,
                    timestamp: new Date().toISOString(),
                    userId: currentUser?.id || "SYSTEM",
                    username: currentUser?.username || "system",
                  };
                  setMovements((moves) => [moveItem, ...moves]);
                });
              }
            }

            return {
              ...t,
              status,
              approvedBy:
                status === "Approved" ? currentUser?.fullName || "SYSTEM" : t.approvedBy,
              updatedAt: new Date().toISOString(),
            };
          }
          return t;
        })
      );

      addAuditLog(
        "TRANSFER_UPDATE",
        `Updated Stock Transfer ${id} to status ${status}`,
        "StockTransfer",
        id
      );
    },
    [
      logBranchAccessScope,
      setBranchStock,
      branches,
      setProducts,
      setMovements,
      currentUser,
      addAuditLog,
    ]
  );

  const deleteStockTransfer = useCallback(
    (id: string) => {
      logBranchAccessScope("DELETE", "StockTransfer", null, id);
      setStockTransfers((prev) =>
        prev.map((st) =>
          st.id === id ? { ...st, isDeleted: true, deletedAt: new Date().toISOString() } : st
        )
      );
      addAuditLog(
        "TRANSFER_DELETE",
        `Soft-deleted stock transfer ID: ${id}`,
        "StockTransfers",
        id
      );
    },
    [logBranchAccessScope, addAuditLog]
  );

  // --- DELIVERIES ---
  const createDelivery = useCallback(
    (
      delivery: Omit<
        Delivery,
        "id" | "status" | "createdAt" | "updatedAt" | "branchId" | "branchName"
      >
    ): Delivery => {
      const currentBranch =
        (currentUser?.branchAssignmentId &&
          branches.find((b) => b.id === currentUser.branchAssignmentId)) ||
        branches[0];
      const isScheduled = Boolean(delivery.truck?.trim() && delivery.driver?.trim());
      const newDelivery: Delivery = {
        ...delivery,
        id: `DEL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        status: isScheduled ? "Scheduled" : "Pending Scheduling",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        branchId: currentBranch.id,
        branchName: currentBranch.name,
      };

      setDeliveries((prev) => [newDelivery, ...prev]);
      addAuditLog(
        "DELIVERY_CREATE",
        `Fulfillment Delivery scheduled for invoice ${delivery.saleNumber}. Customer: ${delivery.customerName}`,
        "Delivery",
        newDelivery.id
      );
      return newDelivery;
    },
    [currentUser, branches, addAuditLog]
  );

  const updateDeliveryStatus = useCallback(
    (id: string, status: DeliveryStatus, notes?: string) => {
      setDeliveries((prev) =>
        prev.map((d) => {
          if (d.id === id) {
            return {
              ...d,
              status,
              notes: notes !== undefined ? notes : d.notes,
              updatedAt: new Date().toISOString(),
            };
          }
          return d;
        })
      );
      addAuditLog(
        "DELIVERY_STATUS_UPDATE",
        `Delivery ${id} status altered to [${status}]. Notes: ${notes || "none"}`,
        "Delivery",
        id
      );
    },
    [addAuditLog]
  );

  const assignDeliveryPersonnel = useCallback(
    (id: string, truck: string, driver: string, helper: string) => {
      setDeliveries((prev) =>
        prev.map((d) => {
          if (d.id === id) {
            const isPendingState =
              d.status === "Pending Scheduling" ||
              d.status === "Packed" ||
              (d.status as any) === "Pending";
            return {
              ...d,
              truck,
              driver,
              helper,
              status: isPendingState ? "Scheduled" : d.status,
              updatedAt: new Date().toISOString(),
            };
          }
          return d;
        })
      );
      addAuditLog(
        "DELIVERY_PERSONNEL_ASSIGN",
        `Assigned truck ${truck}, pilot ${driver}, and companion ${helper} to delivery task ${id}`,
        "Delivery",
        id
      );
    },
    [addAuditLog]
  );

  const completeDelivery = useCallback(
    (
      id: string,
      proofPhotoUrl?: string,
      customerSignature?: string,
      receiverName?: string
    ) => {
      setDeliveries((prev) =>
        prev.map((d) => {
          if (d.id === id) {
            return {
              ...d,
              status: "Delivered" as DeliveryStatus,
              proofPhotoUrl,
              customerSignature,
              receiverName: receiverName || d.customerName,
              deliveredBy: currentUser?.fullName || "SYSTEM",
              deliveredAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          }
          return d;
        })
      );
      addAuditLog(
        "DELIVERY_COMPLETE",
        `Delivery task ${id} checked out as Delivered (Receipt confirmed by ${
          receiverName || "customer"
        }).`,
        "Delivery",
        id
      );
    },
    [currentUser?.fullName, addAuditLog]
  );

  // --- DAMAGE LOGS ---
  const createDamageLog = useCallback(
    (log: Omit<DamageLog, "id" | "reportedAt" | "reportedBy">) => {
      const newId = `DMG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newLog: DamageLog = {
        ...log,
        id: newId,
        reportedBy: currentUser?.fullName || "SYSTEM",
        reportedAt: new Date().toISOString(),
      };

      setDamageLogs((prev) => [newLog, ...prev]);

      const changeValue = -Math.abs(log.quantity);

      setProducts((prods) =>
        prods.map((p) => {
          if (p.id === log.productId) {
            return {
              ...p,
              stockQuantity: Math.max(0, p.stockQuantity + changeValue),
              updatedAt: new Date().toISOString(),
              updatedBy: currentUser?.fullName || "SYSTEM",
            };
          }
          return p;
        })
      );

      setBranchStock((stockList) => {
        const idx = stockList.findIndex(
          (bs) => bs.productId === log.productId && bs.branchId === log.branchId
        );
        if (idx !== -1) {
          const updated = [...stockList];
          const nextQty = Math.max(0, updated[idx].quantity + changeValue);
          updated[idx] = { ...updated[idx], quantity: nextQty };
          return updated;
        } else {
          return stockList;
        }
      });

      const newMove: InventoryMovement = {
        id: `IM-DMG-${Date.now()}`,
        productId: log.productId,
        type: "ADJUST",
        quantity: changeValue,
        sourceBranchId: log.branchId,
        referenceId: newId,
        notes: `[Damage: ${log.category}] ${log.actionTaken}. Notes: ${log.notes}`,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || "SYSTEM",
        username: currentUser?.username || "system",
      };
      setMovements((prev) => [newMove, ...prev]);

      const newLedgerId = `L-DMG-${Date.now()}`;
      const newEntry: LedgerEntry = {
        id: newLedgerId,
        date: new Date().toISOString(),
        productId: log.productId,
        productName: log.productName,
        branchId: log.branchId,
        movementType: "ADJUST",
        quantity: changeValue,
        referenceNo: newId,
        remarks: `[${log.category} - ${log.actionTaken}] ${log.notes}`,
      };
      setLedgerEntries((prev) => [newEntry, ...prev]);

      addAuditLog(
        "DAMAGE_REPORT",
        `Logged ${log.quantity} unit(s) of broken/damaged ${log.productName} for ${log.branchName} (${log.category}). Status: ${log.actionTaken}.`,
        "Products",
        log.productId
      );
    },
    [currentUser, setProducts, setBranchStock, setMovements, addAuditLog]
  );

  const updateDamageLog = useCallback(
    (id: string, updates: Partial<DamageLog>) => {
      setDamageLogs((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
      );
      addAuditLog("DAMAGE_LOG_UPDATE", `Updated damage log record ID: ${id}`, "DamageLogs", id);
    },
    [addAuditLog]
  );

  const deleteDamageLog = useCallback(
    (id: string) => {
      logBranchAccessScope("DELETE", "DamageLog", null, id);
      setDamageLogs((prev) =>
        prev.map((log) =>
          log.id === id
            ? { ...log, isDeleted: true, deletedAt: new Date().toISOString() }
            : log
        )
      );
      addAuditLog("DAMAGE_LOG_DELETE", `Soft-deleted damage log ID ${id}`, "DamageLogs", id);
    },
    [logBranchAccessScope, addAuditLog]
  );

  const restoreDamageLog = useCallback(
    (id: string) => {
      setDamageLogs((prev) =>
        prev.map((log) =>
          log.id === id ? { ...log, isDeleted: false, deletedAt: undefined } : log
        )
      );
      addAuditLog("DAMAGE_LOG_RESTORE", `Restored damage log ${id} from Archives`, "DamageLogs", id);
    },
    [addAuditLog]
  );

  // --- EXPENSES ---
  const createExpense = useCallback(
    (exp: Omit<Expense, "id" | "isDeleted"> & Partial<Expense>): Expense => {
      const newExp: Expense = {
        ...exp,
        id: `EXP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        category: sanitizeInputText(exp.category || "Operational"),
        amount: Number(exp.amount) || 0,
        branchId: exp.branchId || currentUser?.branchAssignmentId || "B1",
        dateTime: exp.dateTime || new Date().toISOString(),
        recordedBy: currentUser?.fullName || "Staff",
        notes: sanitizeInputText(exp.notes || ""),
        isDeleted: false,
      };
      setExpenses((prev) => [newExp, ...prev]);
      addAuditLog(
        "EXPENSE_CREATE",
        `Recorded store expense: ${newExp.category} (₱${newExp.amount.toFixed(2)}) for branch ${newExp.branchId}`,
        "Expenses",
        newExp.id
      );
      return newExp;
    },
    [currentUser, addAuditLog]
  );

  const updateExpense = useCallback(
    (id: string, updates: Partial<Expense>) => {
      setExpenses((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
      );
      addAuditLog("EXPENSE_UPDATE", `Updated expense record ID: ${id}`, "Expenses", id);
    },
    [addAuditLog]
  );

  const deleteExpense = useCallback(
    (id: string) => {
      setExpenses((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, isDeleted: true, deletedAt: new Date().toISOString() } : e
        )
      );
      addAuditLog("EXPENSE_DELETE", `Soft-deleted expense ID: ${id}`, "Expenses", id);
    },
    [addAuditLog]
  );

  const restoreExpense = useCallback(
    (id: string) => {
      setExpenses((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, isDeleted: false, deletedAt: undefined } : e
        )
      );
      addAuditLog("EXPENSE_RESTORE", `Restored expense ID ${id} from Archives`, "Expenses", id);
    },
    [addAuditLog]
  );

  // --- PRODUCT RETURNS ---
  const createProductReturn = useCallback(
    (ret: Omit<ProductReturn, "id" | "isDeleted"> & Partial<ProductReturn>): ProductReturn => {
      const newRet: ProductReturn = {
        ...ret,
        id: `RET-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        saleId: sanitizeInputText(ret.saleId || ""),
        productName: sanitizeInputText(ret.productName || ""),
        quantityReturned: Number(ret.quantityReturned) || 1,
        amountRefunded: Number(ret.amountRefunded) || 0,
        damageRestockFee: Number(ret.damageRestockFee) || 0,
        status: ret.status || "Restocked",
        dateTime: ret.dateTime || new Date().toISOString(),
        isDeleted: false,
      };
      setProductReturns((prev) => [newRet, ...prev]);
      addAuditLog(
        "RETURN_CREATE",
        `Logged product return for sale ${newRet.saleId}: ${newRet.productName} x${newRet.quantityReturned}`,
        "Returns",
        newRet.id
      );
      return newRet;
    },
    [addAuditLog]
  );

  const updateProductReturnStatus = useCallback(
    (id: string, status: "Restocked" | "Defective/Damaged") => {
      setProductReturns((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
      addAuditLog(
        "RETURN_STATUS_UPDATE",
        `Updated return ID ${id} status to ${status}`,
        "Returns",
        id
      );
    },
    [addAuditLog]
  );

  const deleteProductReturn = useCallback(
    (id: string) => {
      setProductReturns((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, isDeleted: true, deletedAt: new Date().toISOString() } : r
        )
      );
      addAuditLog("RETURN_DELETE", `Soft-deleted return record ID: ${id}`, "Returns", id);
    },
    [addAuditLog]
  );

  // --- MEMBERS ---
  const createMember = useCallback(
    (mem: Omit<Member, "id" | "createdAt" | "updatedAt"> & Partial<Member>): Member => {
      const newMem: Member = {
        ...mem,
        id: `MEM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        fullName: sanitizeInputText(mem.fullName || ""),
        phone: sanitizeInputText(mem.phone || ""),
        email: sanitizeInputText(mem.email || ""),
        address: mem.address ? sanitizeInputText(mem.address) : undefined,
        tin: mem.tin ? sanitizeInputText(mem.tin) : undefined,
        businessStyle: mem.businessStyle ? sanitizeInputText(mem.businessStyle) : undefined,
        creditLimit: Number(mem.creditLimit) || 50000,
        outstandingBalance: Number(mem.outstandingBalance) || 0,
        points: Number(mem.points) || 0,
        status: mem.status || "Active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setMembers((prev) => [...prev, newMem]);
      addAuditLog("MEMBER_CREATE", `Registered corporate member profile: ${newMem.fullName}`, "Members", newMem.id);
      return newMem;
    },
    [addAuditLog]
  );

  const updateMember = useCallback(
    (id: string, updates: Partial<Member>) => {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m
        )
      );
      addAuditLog("MEMBER_UPDATE", `Updated member profile details ID: ${id}`, "Members", id);
    },
    [addAuditLog]
  );

  const deleteMember = useCallback(
    (id: string) => {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, status: "Suspended", updatedAt: new Date().toISOString() } : m
        )
      );
      addAuditLog("MEMBER_DELETE", `Suspended corporate member ID: ${id}`, "Members", id);
    },
    [addAuditLog]
  );

  // --- CUSTOM BILLS ---
  const createCustomCorporateBill = useCallback(
    (bill: Omit<CustomCorporateBill, "id" | "createdAt" | "updatedAt" | "isDeleted"> & Partial<CustomCorporateBill>): CustomCorporateBill => {
      const newBill: CustomCorporateBill = {
        ...bill,
        id: `BILL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: sanitizeInputText(bill.title || ""),
        totalAmount: Number(bill.totalAmount) || 0,
        remainingBalance: bill.remainingBalance !== undefined ? Number(bill.remainingBalance) : Number(bill.totalAmount) || 0,
        frequency: bill.frequency || ("Monthly" as PaymentFrequency),
        nextDueDate: bill.nextDueDate || new Date().toISOString().slice(0, 10),
        status: (bill.status || "Unpaid") as BillStatus,
        notes: bill.notes ? sanitizeInputText(bill.notes) : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDeleted: false,
      };
      setCustomBills((prev) => [newBill, ...prev]);
      addAuditLog(
        "BILL_CREATE",
        `Created custom corporate liability/bill: ${newBill.title} (₱${newBill.totalAmount.toLocaleString()})`,
        "CustomCorporateBills",
        newBill.id
      );
      return newBill;
    },
    [addAuditLog]
  );

  const updateCustomCorporateBill = useCallback(
    (id: string, updates: Partial<CustomCorporateBill>) => {
      setCustomBills((prev) =>
        prev.map((b) =>
          b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b
        )
      );
      addAuditLog("BILL_UPDATE", `Updated corporate bill ID: ${id}`, "CustomCorporateBills", id);
    },
    [addAuditLog]
  );

  const settleCustomCorporateBill = useCallback(
    (id: string, paymentAmount: number) => {
      setCustomBills((prev) =>
        prev.map((b) => {
          if (b.id === id) {
            const nextBal = Math.max(0, (b.remainingBalance ?? b.totalAmount) - paymentAmount);
            const status: BillStatus = nextBal === 0 ? "Paid" : "Partially Paid";
            return {
              ...b,
              remainingBalance: nextBal,
              status,
              updatedAt: new Date().toISOString(),
            };
          }
          return b;
        })
      );
      addAuditLog(
        "BILL_SETTLE",
        `Applied settlement payment of ₱${paymentAmount.toLocaleString()} to bill ID: ${id}`,
        "CustomCorporateBills",
        id
      );
    },
    [addAuditLog]
  );

  const deleteCustomCorporateBill = useCallback(
    (id: string) => {
      setCustomBills((prev) =>
        prev.map((b) =>
          b.id === id ? { ...b, isDeleted: true, deletedAt: new Date().toISOString() } : b
        )
      );
      addAuditLog(
        "BILL_DELETE",
        `Soft-deleted custom corporate liability/bill ID: ${id}`,
        "CustomCorporateBills",
        id
      );
    },
    [addAuditLog]
  );

  return {
    shifts,
    setShifts,
    activeShift,
    sales,
    setSales,
    saleItems,
    setSaleItems,
    stockTransfers,
    setStockTransfers,
    purchaseOrders,
    setPurchaseOrders,
    poItems,
    setPoItems,
    transmittals,
    setTransmittals,
    deliveries,
    setDeliveries,
    damageLogs,
    setDamageLogs,
    ledgerEntries,
    setLedgerEntries,
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
    loyaltyConfig,
    setLoyaltyConfig,
    updateLoyaltyConfig,
    dayMemos,
    setDayMemos,
    parkedSales,
    setParkedSales,
    pessimisticLocks,
    acquirePessimisticLock,
    releasePessimisticLock,
    isResourceLocked,
    logManualAdjustment,
    createManualLedgerEntry,
    holdSale,
    resumeParkedSale,
    checkoutSale,
    voidSale,
    restoreSale,
    openShift,
    getShiftReportStats,
    closeShift,
    forceCloseAllShifts,
    createPurchaseOrder,
    updatePurchaseOrderStatus,
    receivePurchaseOrderItems,
    deletePurchaseOrder,
    restorePurchaseOrder,
    createTransmittal,
    updateTransmittalStatus,
    deleteTransmittal,
    restoreTransmittal,
    createStockTransfer,
    updateStockTransferStatus,
    deleteStockTransfer,
    createDelivery,
    updateDeliveryStatus,
    assignDeliveryPersonnel,
    completeDelivery,
    createDamageLog,
    updateDamageLog,
    deleteDamageLog,
    restoreDamageLog,
    createExpense,
    updateExpense,
    deleteExpense,
    restoreExpense,
    createProductReturn,
    updateProductReturnStatus,
    deleteProductReturn,
    createMember,
    updateMember,
    deleteMember,
    createCustomCorporateBill,
    updateCustomCorporateBill,
    settleCustomCorporateBill,
    deleteCustomCorporateBill,
  };
}
