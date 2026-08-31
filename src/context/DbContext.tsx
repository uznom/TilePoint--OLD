/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useMemo, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  DbContextType,
  SummaryStats,
  BranchStockStats,
} from "../types/dbContext.types";
import {
  UserRole,
} from "../types/db";
import { AuthProvider } from "./AuthContext";
import { SettingsProvider } from "./SettingsContext";
import { SyncProvider } from "./SyncContext";
import { CartProvider } from "./CartContext";
import { useDbAuthModule } from "./modules/useDbAuthModule";
import { useDbEntitiesModule } from "./modules/useDbEntitiesModule";
import { useDbProductsModule } from "./modules/useDbProductsModule";
import { useDbOperationsModule } from "./modules/useDbOperationsModule";
import { useDbSyncModule } from "./modules/useDbSyncModule";
import {
  transactionOutboxService,
  EnqueueOutboxOptions,
} from "../services/transactionOutboxService";
import {
  slugifyBranchStr,
  isProductInBranch,
  getBranchStockQuantity,
  getBranchStockRecord,
} from "../lib/branchUtils";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

export const DbContext = createContext<DbContextType | undefined>(undefined);

export const DbProviderInternal: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const volatileCache = useRef<Record<string, string>>({});

  // 1. Auth Module
  const authModule = useDbAuthModule();

  // Forward declarations for circular references
  const setBranchStockRef = useRef<any>(() => {});
  const setShiftsRef = useRef<any>(() => {});
  const setSalesRef = useRef<any>(() => {});
  const setDeliveriesRef = useRef<any>(() => {});
  const setStockTransfersRef = useRef<any>(() => {});
  const setDamageLogsRef = useRef<any>(() => {});
  const setExpensesRef = useRef<any>(() => {});
  const setPurchaseOrdersRef = useRef<any>(() => {});
  const setTransmittalsRef = useRef<any>(() => {});
  const setMovementsRef = useRef<any>(() => {});
  const setBranchSalesReportsRef = useRef<any>(() => {});
  const setProductsRef = useRef<any>(() => {});
  const restoreProductRef = useRef<any>(() => {});
  const logManualAdjustmentRef = useRef<any>(() => {});
  const generateSystemSnapshotRef = useRef<any>(() => {});

  // 2. Entities Module
  const entitiesModule = useDbEntitiesModule({
    currentUser: authModule.currentUser,
    setCurrentUser: authModule.setCurrentUser,
    logBranchAccessScope: authModule.logBranchAccessScope,
    getAuthHeaders: authModule.getAuthHeaders,
    safeApiFetch: authModule.safeApiFetch,
    addAuditLog: authModule.addAuditLog,
    setBranchStock: (action) => setBranchStockRef.current(action),
    setShifts: (action) => setShiftsRef.current(action),
    setSales: (action) => setSalesRef.current(action),
    setDeliveries: (action) => setDeliveriesRef.current(action),
    setStockTransfers: (action) => setStockTransfersRef.current(action),
    setDamageLogs: (action) => setDamageLogsRef.current(action),
    setExpenses: (action) => setExpensesRef.current(action),
    setPurchaseOrders: (action) => setPurchaseOrdersRef.current(action),
    setTransmittals: (action) => setTransmittalsRef.current(action),
    setMovements: (action) => setMovementsRef.current(action),
    setActiveSessions: authModule.setActiveSessions,
    setBranchSalesReports: (action) => setBranchSalesReportsRef.current(action),
    setProducts: (action) => setProductsRef.current(action),
    restoreProduct: (id) => restoreProductRef.current(id),
  });

  // 3. Products Module
  const productsModule = useDbProductsModule({
    currentUser: authModule.currentUser,
    branches: entitiesModule.branches,
    suppliers: entitiesModule.suppliers,
    validateInventoryAccess: authModule.validateInventoryAccess,
    logBranchAccessScope: authModule.logBranchAccessScope,
    getAuthHeaders: authModule.getAuthHeaders,
    safeApiFetch: authModule.safeApiFetch,
    addAuditLog: authModule.addAuditLog,
    setMovements: (action) => setMovementsRef.current(action),
    setDamageLogs: (action) => setDamageLogsRef.current(action),
    volatileCache,
    logManualAdjustment: (prodId, delta, notes) =>
      logManualAdjustmentRef.current(prodId, delta, notes),
  });

  // 4. Operations Module
  const operationsModule = useDbOperationsModule({
    currentUser: authModule.currentUser,
    branches: entitiesModule.branches,
    products: productsModule.products,
    setProducts: productsModule.setProducts,
    branchStock: productsModule.branchStock,
    setBranchStock: productsModule.setBranchStock,
    movements: [],
    setMovements: setMovementsRef.current,
    optimisticStockCacheRef: productsModule.optimisticStockCacheRef,
    getBranchStockQuantityContext: productsModule.getBranchStockQuantityContext,
    revalidateStockCounts: productsModule.revalidateStockCounts,
    addAuditLog: authModule.addAuditLog,
    logBranchAccessScope: authModule.logBranchAccessScope,
    enqueueTransaction: (tx) => transactionOutboxService.enqueue(tx),
    generateSystemSnapshot: (name) => generateSystemSnapshotRef.current(name),
  });

  // 5. Sync Module
  const syncModule = useDbSyncModule({
    currentUser: authModule.currentUser,
    setCurrentUser: authModule.setCurrentUser,
    setIsLoggedIn: authModule.setIsLoggedIn,
    setActiveSessionId: authModule.setActiveSessionId,
    isConfigured: authModule.isConfigured,
    setIsConfigured: authModule.setIsConfigured,
    users: entitiesModule.users,
    setUsers: entitiesModule.setUsers,
    branches: entitiesModule.branches,
    setBranches: entitiesModule.setBranches,
    suppliers: entitiesModule.suppliers,
    setSuppliers: entitiesModule.setSuppliers,
    brands: entitiesModule.brands,
    setBrands: entitiesModule.setBrands,
    products: productsModule.products,
    setProducts: productsModule.setProducts,
    purchaseOrders: operationsModule.purchaseOrders,
    setPurchaseOrders: operationsModule.setPurchaseOrders,
    poItems: operationsModule.poItems,
    setPoItems: operationsModule.setPoItems,
    transmittals: operationsModule.transmittals,
    setTransmittals: operationsModule.setTransmittals,
    shifts: operationsModule.shifts,
    setShifts: operationsModule.setShifts,
    sales: operationsModule.sales,
    setSales: operationsModule.setSales,
    saleItems: operationsModule.saleItems,
    setSaleItems: operationsModule.setSaleItems,
    movements: [],
    setMovements: setMovementsRef.current,
    auditLogs: authModule.auditLogs,
    setAuditLogs: authModule.setAuditLogs,
    parkedSales: operationsModule.parkedSales,
    setParkedSales: operationsModule.setParkedSales,
    stockTransfers: operationsModule.stockTransfers,
    setStockTransfers: operationsModule.setStockTransfers,
    branchStock: productsModule.branchStock,
    setBranchStock: productsModule.setBranchStock,
    ledgerEntries: operationsModule.ledgerEntries,
    setLedgerEntries: operationsModule.setLedgerEntries,
    deliveries: operationsModule.deliveries,
    setDeliveries: operationsModule.setDeliveries,
    damageLogs: operationsModule.damageLogs,
    setDamageLogs: operationsModule.setDamageLogs,
    customBills: operationsModule.customBills,
    setCustomBills: operationsModule.setCustomBills,
    members: operationsModule.members,
    setMembers: operationsModule.setMembers,
    expenses: operationsModule.expenses,
    setExpenses: operationsModule.setExpenses,
    productReturns: operationsModule.productReturns,
    setProductReturns: operationsModule.setProductReturns,
    calendarNotes: operationsModule.calendarNotes,
    setCalendarNotes: operationsModule.setCalendarNotes,
    dayMemos: operationsModule.dayMemos,
    setDayMemos: operationsModule.setDayMemos,
    addAuditLog: authModule.addAuditLog,
    safeApiFetch: authModule.safeApiFetch,
    getAuthHeaders: authModule.getAuthHeaders,
    revalidateStockCounts: productsModule.revalidateStockCounts,
  });

  // Assign refs for circular links
  setBranchStockRef.current = productsModule.setBranchStock;
  setShiftsRef.current = operationsModule.setShifts;
  setSalesRef.current = operationsModule.setSales;
  setDeliveriesRef.current = operationsModule.setDeliveries;
  setStockTransfersRef.current = operationsModule.setStockTransfers;
  setDamageLogsRef.current = operationsModule.setDamageLogs;
  setExpensesRef.current = operationsModule.setExpenses;
  setPurchaseOrdersRef.current = operationsModule.setPurchaseOrders;
  setTransmittalsRef.current = operationsModule.setTransmittals;
  setBranchSalesReportsRef.current = syncModule.setBranchSalesReports;
  setProductsRef.current = productsModule.setProducts;
  restoreProductRef.current = productsModule.restoreProduct;
  logManualAdjustmentRef.current = operationsModule.logManualAdjustment;
  generateSystemSnapshotRef.current = syncModule.generateSystemSnapshot;

  // Branch filter views
  const filteredBranchStock = useMemo(() => {
    if (!authModule.currentUser) return productsModule.branchStock;
    if (
      authModule.currentUser.role === UserRole.ADMIN ||
      !authModule.currentUser.branchAssignmentId ||
      authModule.currentUser.branchAssignmentId === "consolidated" ||
      authModule.currentUser.branchAssignmentId === "ALL"
    ) {
      return productsModule.branchStock;
    }
    const uBranchId = authModule.currentUser.branchAssignmentId;
    const targetBranch = entitiesModule.branches.find((b) => b.id === uBranchId);
    const uSlug = slugifyBranchStr(uBranchId);
    const uNameSlug = slugifyBranchStr(targetBranch?.name);
    const uCodeSlug = slugifyBranchStr(targetBranch?.branchCode);

    return productsModule.branchStock.filter((bs) => {
      if (bs.branchId === uBranchId) return true;
      const bsSlug = slugifyBranchStr(bs.branchId);
      if (bsSlug === uSlug) return true;
      if (uNameSlug && bsSlug === uNameSlug) return true;
      if (uCodeSlug && bsSlug === uCodeSlug) return true;
      return false;
    });
  }, [productsModule.branchStock, authModule.currentUser, entitiesModule.branches]);

  const filteredProducts = useMemo(() => {
    if (!authModule.currentUser) return productsModule.products;
    if (
      authModule.currentUser.role === UserRole.ADMIN ||
      !authModule.currentUser.branchAssignmentId ||
      authModule.currentUser.branchAssignmentId === "consolidated" ||
      authModule.currentUser.branchAssignmentId === "ALL"
    ) {
      return productsModule.products;
    }
    const uBranchId = authModule.currentUser.branchAssignmentId;
    return productsModule.products.filter(
      (p) => !p.isDeleted && isProductInBranch(p, uBranchId, productsModule.branchStock, entitiesModule.branches)
    );
  }, [productsModule.products, authModule.currentUser, productsModule.branchStock, entitiesModule.branches]);

  // LIVE SYSTEM KPIs
  const stats = useMemo((): SummaryStats => {
    const effectiveBranch =
      authModule.currentUser &&
      ((authModule.currentUser.role as any) === "Admin" ||
        authModule.currentUser.role === UserRole.ADMIN)
        ? authModule.currentUser.branchAssignmentId &&
          authModule.currentUser.branchAssignmentId !== "ALL" &&
          authModule.currentUser.branchAssignmentId !== "consolidated"
          ? authModule.currentUser.branchAssignmentId
          : "consolidated"
        : authModule.currentUser?.branchAssignmentId || "B1";

    const isConsolidated = effectiveBranch === "consolidated";

    const branchProducts = productsModule.products.filter((p) => {
      if (p.isDeleted) return false;
      if (isConsolidated) return true;
      return isProductInBranch(
        p,
        effectiveBranch,
        productsModule.branchStock,
        entitiesModule.branches
      );
    });

    const totalProducts = branchProducts.length;
    let lowStockCount = 0;
    let criticalCount = 0;
    let outOfStockCount = 0;
    let totalItems = 0;
    let totalValue = 0;

    branchProducts.forEach((p) => {
      const qty = isConsolidated
        ? p.stockQuantity
        : getBranchStockQuantity(
            p,
            effectiveBranch,
            productsModule.branchStock,
            entitiesModule.branches
          );

      const bsRec = isConsolidated
        ? null
        : getBranchStockRecord(
            p,
            effectiveBranch,
            productsModule.branchStock,
            entitiesModule.branches
          );

      const threshold =
        !isConsolidated && bsRec?.lowStockThresholdOverride !== undefined
          ? bsRec.lowStockThresholdOverride
          : p.minimumStock ?? p.lowStockThreshold ?? 10;

      totalItems += qty;
      const unitValuation =
        bsRec?.costPriceOverride && bsRec.costPriceOverride > 0
          ? bsRec.costPriceOverride
          : p.costPrice > 0
          ? p.costPrice
          : bsRec?.sellingPriceOverride && bsRec.sellingPriceOverride > 0
          ? bsRec.sellingPriceOverride
          : p.sellingPrice || 0;

      totalValue += qty * unitValuation;

      if (qty === 0) {
        outOfStockCount++;
      } else {
        if (qty <= threshold) {
          lowStockCount++;
        }
        if (qty <= threshold * 0.5) {
          criticalCount++;
        }
      }
    });

    const activeCategories = new Set(
      productsModule.products.filter((p) => !p.isDeleted).map((p) => p.category)
    );
    const activeSuppliers = new Set(
      productsModule.products.filter((p) => !p.isDeleted).map((p) => p.supplierId)
    );

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const branchSales = operationsModule.sales.filter((s) => {
      if (s.isDeleted) return false;
      if (isConsolidated) return true;
      return s.branchId === effectiveBranch;
    });

    const todaySales = branchSales
      .filter((s) => s.createdAt.slice(0, 10) === todayStr)
      .reduce((acc, s) => acc + (Number(s.grandTotal) || 0), 0);

    const weeklySales = branchSales
      .filter((s) => new Date(s.createdAt) >= sevenDaysAgo)
      .reduce((acc, s) => acc + (Number(s.grandTotal) || 0), 0);

    const monthlyRevenue = branchSales
      .filter((s) => new Date(s.createdAt) >= thirtyDaysAgo)
      .reduce((acc, s) => acc + (Number(s.grandTotal) || 0), 0);

    const activeCashiers = entitiesModule.users.filter(
      (u) =>
        u.role === UserRole.STAFF &&
        u.status === "Active" &&
        (isConsolidated || u.branchAssignmentId === effectiveBranch)
    ).length;

    return {
      totalProducts,
      totalCategories: activeCategories.size,
      totalSuppliers: activeSuppliers.size,
      lowStockCount,
      criticalCount,
      outOfStockCount,
      totalItems,
      totalValue,
      todaySales,
      weeklySales,
      monthlyRevenue,
      activeCashiers,
    };
  }, [
    authModule.currentUser,
    productsModule.products,
    productsModule.branchStock,
    entitiesModule.branches,
    entitiesModule.users,
    operationsModule.sales,
  ]);

  const activeBranch = useMemo(() => {
    if (!authModule.currentUser || !authModule.currentUser.branchAssignmentId) {
      return entitiesModule.branches[0] || null;
    }
    return (
      entitiesModule.branches.find(
        (b) => b.id === authModule.currentUser?.branchAssignmentId
      ) ||
      entitiesModule.branches[0] ||
      null
    );
  }, [authModule.currentUser, entitiesModule.branches]);

  const contextValue: DbContextType = useMemo(
    () => ({
      // Auth & Sessions
      currentUser: authModule.currentUser,
      setCurrentUser: authModule.setCurrentUser,
      updateCurrentUser: authModule.updateCurrentUser,
      validateInventoryAccess: authModule.validateInventoryAccess,
      logBranchAccessScope: authModule.logBranchAccessScope,
      isLoggedIn: authModule.isLoggedIn,
      login: authModule.login,
      logout: authModule.logout,
      isConfigured: authModule.isConfigured,
      setIsConfigured: authModule.setIsConfigured,
      setupSystem: authModule.setupSystem,
      isRateLimited: authModule.isRateLimited,
      rateLimitTimeLeft: authModule.rateLimitTimeLeft,
      activeBranch,
      users: entitiesModule.users,
      branches: entitiesModule.branches,
      suppliers: entitiesModule.suppliers,
      brands: entitiesModule.brands,
      products: filteredProducts,
      purchaseOrders: operationsModule.purchaseOrders,
      poItems: operationsModule.poItems,
      transmittals: operationsModule.transmittals,
      shifts: operationsModule.shifts,
      sales: operationsModule.sales,
      saleItems: operationsModule.saleItems,
      movements: authModule.auditLogs as any,
      auditLogs: authModule.auditLogs,
      activeShift: operationsModule.activeShift,
      stockTransfers: operationsModule.stockTransfers,
      branchStock: filteredBranchStock,
      ledgerEntries: operationsModule.ledgerEntries,
      customBills: operationsModule.customBills,
      setCustomBills: operationsModule.setCustomBills,
      members: operationsModule.members,
      setMembers: operationsModule.setMembers,
      expenses: operationsModule.expenses,
      setExpenses: operationsModule.setExpenses,
      productReturns: operationsModule.productReturns,
      setProductReturns: operationsModule.setProductReturns,
      calendarNotes: operationsModule.calendarNotes,
      setCalendarNotes: operationsModule.setCalendarNotes,
      dayMemos: operationsModule.dayMemos,
      setDayMemos: operationsModule.setDayMemos,
      syncStatus: syncModule.syncStatus,
      selectedViewBranchId: syncModule.selectedViewBranchId,
      setSelectedViewBranchId: syncModule.setSelectedViewBranchId,
      createUser: entitiesModule.createUser,
      updateUser: entitiesModule.updateUser,
      resetPassword: entitiesModule.resetPassword,
      createBranch: entitiesModule.createBranch,
      updateBranch: entitiesModule.updateBranch,
      deleteBranch: entitiesModule.deleteBranch,
      createSupplier: entitiesModule.createSupplier,
      updateSupplier: entitiesModule.updateSupplier,
      deleteSupplier: entitiesModule.deleteSupplier,
      createBrand: entitiesModule.createBrand,
      updateBrand: entitiesModule.updateBrand,
      deleteBrand: entitiesModule.deleteBrand,
      createProduct: productsModule.createProduct,
      updateProduct: productsModule.updateProduct,
      deleteProduct: productsModule.deleteProduct,
      deleteDamageLog: operationsModule.deleteDamageLog,
      bulkDeleteProducts: productsModule.bulkDeleteProducts,
      restoreProduct: productsModule.restoreProduct,
      deleteUser: entitiesModule.deleteUser,
      restoreUser: entitiesModule.restoreUser,
      restoreBranch: entitiesModule.restoreBranch,
      restoreSupplier: entitiesModule.restoreSupplier,
      restoreBrand: entitiesModule.restoreBrand,
      restoreSale: operationsModule.restoreSale,
      restorePurchaseOrder: operationsModule.restorePurchaseOrder,
      restoreTransmittal: operationsModule.restoreTransmittal,
      restoreExpense: operationsModule.restoreExpense,
      restoreDamageLog: operationsModule.restoreDamageLog,
      purgeArchivedItem: entitiesModule.purgeArchivedItem,
      bulkRestoreItems: entitiesModule.bulkRestoreItems,
      importProducts: productsModule.importProducts,
      holdSale: operationsModule.holdSale,
      resumeParkedSale: operationsModule.resumeParkedSale,
      parkedSales: operationsModule.parkedSales,
      setParkedSales: operationsModule.setParkedSales,
      loyaltyConfig: operationsModule.loyaltyConfig,
      updateLoyaltyConfig: operationsModule.updateLoyaltyConfig,
      checkoutSale: operationsModule.checkoutSale,
      voidSale: operationsModule.voidSale,
      openShift: operationsModule.openShift,
      closeShift: operationsModule.closeShift,
      forceCloseAllShifts: operationsModule.forceCloseAllShifts,
      getShiftReportStats: operationsModule.getShiftReportStats,
      createPO: operationsModule.createPurchaseOrder,
      updatePOStatus: operationsModule.updatePurchaseOrderStatus,
      receivePOItems: operationsModule.receivePurchaseOrderItems,
      createTransmittal: operationsModule.createTransmittal,
      updateTransmittalStatus: operationsModule.updateTransmittalStatus,
      createStockTransfer: operationsModule.createStockTransfer,
      updateStockTransferStatus: operationsModule.updateStockTransferStatus,
      stats,
      addAuditLog: authModule.addAuditLog,
      logManualAdjustment: operationsModule.logManualAdjustment,
      createManualLedgerEntry: operationsModule.createManualLedgerEntry,
      truncateDatabase: syncModule.truncateDatabase,
      branchSalesReports: syncModule.branchSalesReports,
      rollbackSnapshots: syncModule.rollbackSnapshots,
      performRollbackToSnapshot: syncModule.performRollbackToSnapshot,
      transmitSalesReport: syncModule.transmitSalesReport,
      importManualSalesReport: syncModule.importManualSalesReport,
      auditSalesReport: syncModule.auditSalesReport,
      deliveries: operationsModule.deliveries,
      createDelivery: operationsModule.createDelivery,
      updateDeliveryStatus: operationsModule.updateDeliveryStatus,
      assignDeliveryPersonnel: operationsModule.assignDeliveryPersonnel,
      completeDelivery: operationsModule.completeDelivery,
      damageLogs: operationsModule.damageLogs,
      createDamageLog: operationsModule.createDamageLog,
      productCategories: entitiesModule.productCategories,
      setProductCategories: entitiesModule.setProductCategories,
      createProductCategory: entitiesModule.createProductCategory,
      updateProductCategory: entitiesModule.updateProductCategory,
      deleteProductCategory: entitiesModule.deleteProductCategory,
      unitTypes: entitiesModule.unitTypes,
      setUnitTypes: entitiesModule.setUnitTypes,
      createUnitType: entitiesModule.createUnitType,
      updateUnitType: entitiesModule.updateUnitType,
      deleteUnitType: entitiesModule.deleteUnitType,
      paymentMethodsList: entitiesModule.paymentMethodsList,
      setPaymentMethodsList: entitiesModule.setPaymentMethodsList,
      createPaymentMethod: entitiesModule.createPaymentMethod,
      updatePaymentMethod: entitiesModule.updatePaymentMethod,
      deletePaymentMethod: entitiesModule.deletePaymentMethod,
      togglePaymentMethod: entitiesModule.togglePaymentMethod,
      discountSchemes: entitiesModule.discountSchemes,
      setDiscountSchemes: entitiesModule.setDiscountSchemes,
      createDiscountScheme: entitiesModule.createDiscountScheme,
      updateDiscountScheme: entitiesModule.updateDiscountScheme,
      deleteDiscountScheme: entitiesModule.deleteDiscountScheme,
      toggleDiscountScheme: entitiesModule.toggleDiscountScheme,
      damageReasonsList: entitiesModule.damageReasonsList,
      setDamageReasonsList: entitiesModule.setDamageReasonsList,
      createDamageReason: entitiesModule.createDamageReason,
      updateDamageReason: entitiesModule.updateDamageReason,
      deleteDamageReason: entitiesModule.deleteDamageReason,
      toggleDamageReason: entitiesModule.toggleDamageReason,
      updateBranchPriceOverride: productsModule.updateBranchProductPrice,
      updateBranchLowStockThreshold: productsModule.updateBranchLowStockThreshold,
      debounceDelay: syncModule.debounceDelay,
      setDebounceDelay: syncModule.setDebounceDelay,
      dbSyncStatus: syncModule.dbSyncStatus as any,
      writeStatsCount: syncModule.writeStatsCount,
      resetWriteStats: syncModule.resetWriteStats,
      forceSyncAll: syncModule.forceSyncAll,
      dbSnapshots: syncModule.dbSnapshots,
      createDbSnapshot: syncModule.createDbSnapshot,
      restoreDbSnapshot: syncModule.restoreDbSnapshot,
      deleteDbSnapshot: syncModule.deleteDbSnapshot,
      autoBackupEnabled: syncModule.autoBackupEnabled,
      setAutoBackupEnabled: syncModule.setAutoBackupEnabled,
      backupIntervalHours: syncModule.backupIntervalHours,
      setBackupIntervalHours: syncModule.setBackupIntervalHours,
      lastAutoBackupTime: syncModule.lastAutoBackupTime,
      setLastAutoBackupTime: syncModule.setLastAutoBackupTime,
      dbMaintenanceEnabled: syncModule.dbMaintenanceEnabled,
      setDbMaintenanceEnabled: syncModule.setDbMaintenanceEnabled,
      lastMaintenanceTime: syncModule.lastMaintenanceTime,
      setLastMaintenanceTime: syncModule.setLastMaintenanceTime,
      isMaintenanceRunning: syncModule.isMaintenanceRunning,
      runDatabaseMaintenance: syncModule.runDatabaseMaintenance as any,
      isSystemProcessing: syncModule.isSystemProcessing,
      systemProcessingMessage: syncModule.systemProcessingMessage,
      systemProcessingSubtext: syncModule.systemProcessingSubtext,
      systemProcessingType: syncModule.systemProcessingType as any,
      systemProcessingProgress: syncModule.systemProcessingProgress,
      triggerSystemProcessing: syncModule.triggerSystemProcessing as any,
      setSystemProcessingProgress: syncModule.setSystemProcessingProgress,
      setIsSystemProcessing: syncModule.setIsSystemProcessing,
      setSystemProcessingMessage: syncModule.setSystemProcessingMessage,
      setSystemProcessingSubtext: syncModule.setSystemProcessingSubtext,
      simulationModeActive: syncModule.simulationModeActive,
      setSimulationModeActive: syncModule.setSimulationModeActive,
      generateMasterForensicBackup: syncModule.generateMasterForensicBackup,
      importMasterForensicBackup: syncModule.importMasterForensicBackup as any,
      resetLockout: authModule.resetLockout,
      isHydrating: syncModule.isHydrating,
      isSystemHydrating: syncModule.isSystemHydrating,
      serverConnected: syncModule.serverConnected,
      syncFromSharedServer: syncModule.syncFromSharedServer,
      lowPerformanceMode: syncModule.lowPerformanceMode,
      setLowPerformanceMode: syncModule.setLowPerformanceMode,
      activeSessions: authModule.activeSessions,
      activeSessionId: authModule.activeSessionId,
      terminateSession: authModule.terminateSession,
      sessionRemainingSeconds: authModule.sessionRemainingSeconds,
      sessionExpiresAt: authModule.sessionExpiresAt,
      extendSession: authModule.extendSession,
      sessionSupersededNotice: authModule.sessionSupersededNotice,
      clearSessionNotice: authModule.clearSessionNotice,
      completeOnboarding: authModule.completeOnboarding,
      isRowClearingBlocked: syncModule.isRowClearingBlocked,
      getRowClearingBlockedReason: syncModule.getRowClearingBlockedReason,
      pessimisticLocks: operationsModule.pessimisticLocks,
      acquirePessimisticLock: operationsModule.acquirePessimisticLock,
      releasePessimisticLock: operationsModule.releasePessimisticLock,
      isResourceLocked: operationsModule.isResourceLocked,
      deletePurchaseOrder: operationsModule.deletePurchaseOrder,
      deleteStockTransfer: operationsModule.deleteStockTransfer,
      deleteTransmittal: operationsModule.deleteTransmittal,
      deleteCustomCorporateBill: operationsModule.deleteCustomCorporateBill,
      apiErrorState: authModule.apiErrorState,
      clearServerErrorState: authModule.clearServerErrorState,
      invalidateLocalCache: authModule.invalidateLocalCache,
      safeApiFetch: authModule.safeApiFetch,
      exportAndPurgeCategoryData: syncModule.exportAndPurgeCategoryData,
      retentionPolicy: syncModule.retentionPolicy,
      updateRetentionPolicy: syncModule.updateRetentionPolicy,
      runRetentionPolicyCleanup: syncModule.runRetentionPolicyCleanup as any,
      getInventory: productsModule.getInventoryContext,
      getBranchStockQuantity: productsModule.getBranchStockQuantityContext,
      getProductStockCount: productsModule.getProductStockCountContext,
      getBranchStockStats: productsModule.getBranchStockStats,
      filterBranchStockByBranch: productsModule.filterBranchStockByBranch,
      revalidateStockCounts: productsModule.revalidateStockCounts,
      outboxStats: syncModule.outboxStats,
      outboxItems: syncModule.outboxItems,
      isOutboxModalOpen: syncModule.isOutboxModalOpen,
      setIsOutboxModalOpen: syncModule.setIsOutboxModalOpen,
      flushOutbox: () => transactionOutboxService.flush(),
      retryOutboxItem: (queueId: string) => transactionOutboxService.retryItem(queueId),
      retryAllOutboxItems: () => transactionOutboxService.retryAll(),
      clearCompletedOutbox: () => transactionOutboxService.clearCompleted(),
      clearDeadLetterOutbox: () => transactionOutboxService.clearDeadLetters(),
      enqueueOutboxTransaction: (options: EnqueueOutboxOptions) =>
        transactionOutboxService.enqueue(options),
      syncAllLocalToMysql: syncModule.syncAllLocalToMysql,
      getMysqlStatus: syncModule.getMysqlStatus,
      serverDegradedState: syncModule.serverDegradedState as any,
      refreshServerStatus: syncModule.refreshServerStatus,
    }),
    [
      authModule,
      entitiesModule,
      productsModule,
      operationsModule,
      syncModule,
      activeBranch,
      filteredProducts,
      filteredBranchStock,
      stats,
    ]
  );

  return (
    <DbContext.Provider value={contextValue}>{children}</DbContext.Provider>
  );
};

export const DbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SettingsProvider>
          <SyncProvider>
            <CartProvider>
              <DbProviderInternal>{children}</DbProviderInternal>
            </CartProvider>
          </SyncProvider>
        </SettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export const useDb = () => {
  const context = useContext(DbContext);
  if (!context) {
    throw new Error("useDb must be used within a DbProvider");
  }
  return context;
};

export function useDbSelector<T>(selector: (db: DbContextType) => T): T {
  const db = useDb();
  return useMemo(() => selector(db), [db, selector]);
}

export function useDbProducts() {
  const db = useDb();
  return useMemo(() => db.products, [db.products]);
}

export function useDbBranchStock() {
  const db = useDb();
  return useMemo(() => db.branchStock, [db.branchStock]);
}

export function useDbInventory() {
  const db = useDb();
  return useMemo(
    () => ({
      products: db.products,
      branchStock: db.branchStock,
      getInventory: db.getInventory,
      getBranchStockQuantity: db.getBranchStockQuantity,
      getProductStockCount: db.getProductStockCount,
      getBranchStockStats: db.getBranchStockStats,
      filterBranchStockByBranch: db.filterBranchStockByBranch,
      revalidateStockCounts: db.revalidateStockCounts,
    }),
    [
      db.products,
      db.branchStock,
      db.getInventory,
      db.getBranchStockQuantity,
      db.getProductStockCount,
      db.getBranchStockStats,
      db.filterBranchStockByBranch,
      db.revalidateStockCounts,
    ]
  );
}

export function useBranchStockStats(selectedBranchId?: string): BranchStockStats {
  const { getBranchStockStats } = useDb();
  return useMemo(() => {
    return getBranchStockStats(selectedBranchId);
  }, [getBranchStockStats, selectedBranchId]);
}

export type { DbSnapshot } from "../types/dbContext.types";
export {
  preprocessAndVerifyClipboardText,
  xorObfuscateString,
  xorDeobfuscateString,
  encryptString,
  decryptString,
  getSecuritySecretKey,
  isStrictInboundReportSchema,
  unwrapInboundPayload,
} from "./reconciliationCrypto";
