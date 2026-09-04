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
  ProductCategory,
  UnitType,
  CustomPaymentMethod,
  DiscountScheme,
  DamageReasonOption,
  Product,
  Sale,
  PurchaseOrder,
  Transmittal,
  Expense,
  DamageLog,
  InventoryLocationStock,
  Shift,
  Delivery,
  StockTransfer,
  InventoryMovement,
  ActiveSession,
  BranchSalesReport,
} from "../../types/db";
import {
  SEED_BRANCHES,
  SEED_SUPPLIERS,
  SEED_BRANDS,
} from "../seedData";
import {
  DEFAULT_PRODUCT_CATEGORIES,
  DEFAULT_UNIT_TYPES,
  DEFAULT_PAYMENT_METHODS,
  DEFAULT_DISCOUNT_SCHEMES,
  DEFAULT_DAMAGE_REASONS,
} from "../../lib/dynamicConfigDefaults";
import { safeParse } from "../dbContextStorage";
import { sanitizeInputText } from "../reconciliationCrypto";

interface UseDbEntitiesOptions {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  logBranchAccessScope: (
    operation: string,
    entityName: string,
    targetBranchId?: string | null,
    recordId?: string | null,
    additionalDetails?: any
  ) => any;
  getAuthHeaders: () => Record<string, string>;
  safeApiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  addAuditLog: (
    action: string,
    details: string,
    category?: string,
    recordId?: string,
    metadata?: string
  ) => void;
  // Cascading setters
  setBranchStock: React.Dispatch<React.SetStateAction<InventoryLocationStock[]>>;
  setShifts: React.Dispatch<React.SetStateAction<Shift[]>>;
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  setDeliveries: React.Dispatch<React.SetStateAction<Delivery[]>>;
  setStockTransfers: React.Dispatch<React.SetStateAction<StockTransfer[]>>;
  setDamageLogs: React.Dispatch<React.SetStateAction<DamageLog[]>>;
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  setTransmittals: React.Dispatch<React.SetStateAction<Transmittal[]>>;
  setMovements: React.Dispatch<React.SetStateAction<InventoryMovement[]>>;
  setActiveSessions: React.Dispatch<React.SetStateAction<ActiveSession[]>>;
  setBranchSalesReports: React.Dispatch<React.SetStateAction<BranchSalesReport[]>>;
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  restoreProduct: (id: string) => void;
}

export function useDbEntitiesModule({
  currentUser,
  setCurrentUser,
  logBranchAccessScope,
  getAuthHeaders,
  safeApiFetch,
  addAuditLog,
  setBranchStock,
  setShifts,
  setSales,
  setDeliveries,
  setStockTransfers,
  setDamageLogs,
  setExpenses,
  setPurchaseOrders,
  setTransmittals,
  setMovements,
  setActiveSessions,
  setBranchSalesReports,
  setProducts,
  restoreProduct,
}: UseDbEntitiesOptions) {
  const [users, setUsers] = useState<User[]>(() => {
    if (typeof window !== "undefined" && localStorage.getItem("tp_hash_version_v3") !== "true") {
      localStorage.removeItem("tp_users");
      localStorage.setItem("tp_hash_version_v3", "true");
    }
    return safeParse<User[]>("tp_users", []);
  });

  const [branches, setBranches] = useState<Branch[]>(() => {
    const parsed = safeParse<Branch[]>("tp_branches", SEED_BRANCHES);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_BRANCHES;
  });

  // Automatically synchronize branches from backend database on mount
  useEffect(() => {
    let isMounted = true;
    const fetchServerBranches = async () => {
      try {
        const res = await fetch("/api/db/branches");
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data && data.success && Array.isArray(data.branches) && data.branches.length > 0 && isMounted) {
            setBranches(data.branches);
            try {
              localStorage.setItem("tp_branches", JSON.stringify(data.branches));
            } catch (_) {}
          }
        }
      } catch (err) {
        console.debug("[DbContext] Branches background sync notice:", err);
      }
    };
    fetchServerBranches();
    return () => {
      isMounted = false;
    };
  }, []);

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    return safeParse<Supplier[]>("tp_suppliers", SEED_SUPPLIERS);
  });

  const [brands, setBrands] = useState<Brand[]>(() => {
    return safeParse<Brand[]>("tp_brands", SEED_BRANDS);
  });

  const [productCategories, setProductCategories] = useState<ProductCategory[]>(() => {
    return safeParse<ProductCategory[]>("tp_product_categories", DEFAULT_PRODUCT_CATEGORIES);
  });

  const [unitTypes, setUnitTypes] = useState<UnitType[]>(() => {
    return safeParse<UnitType[]>("tp_unit_types", DEFAULT_UNIT_TYPES);
  });

  const [paymentMethodsList, setPaymentMethodsList] = useState<CustomPaymentMethod[]>(() => {
    return safeParse<CustomPaymentMethod[]>("tp_payment_methods", DEFAULT_PAYMENT_METHODS);
  });

  const [discountSchemes, setDiscountSchemes] = useState<DiscountScheme[]>(() => {
    return safeParse<DiscountScheme[]>("tp_discount_schemes", DEFAULT_DISCOUNT_SCHEMES);
  });

  const [damageReasonsList, setDamageReasonsList] = useState<DamageReasonOption[]>(() => {
    return safeParse<DamageReasonOption[]>("tp_damage_reasons", DEFAULT_DAMAGE_REASONS);
  });

  // --- USERS CRUD ---
  const createUser = useCallback(
    async (userFields: Omit<User, "id" | "createdAt" | "updatedAt"> & Partial<User>) => {
      logBranchAccessScope("CREATE", "User", userFields.branchAssignmentId, userFields.username);
      const passwordHash = userFields.passwordHash || "tilepoint";

      const newUser: User = {
        ...userFields,
        username: sanitizeInputText(userFields.username || ""),
        fullName: sanitizeInputText(userFields.fullName || ""),
        role: sanitizeInputText((userFields.role as string) || "") as any,
        branchAssignmentId: userFields.branchAssignmentId
          ? sanitizeInputText(userFields.branchAssignmentId)
          : null,
        passwordHash,
        id: `U-${Date.now()}`,
        isNew: userFields.isNew !== undefined ? userFields.isNew : true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setUsers((prev) => [...prev, newUser]);

      safeApiFetch("/api/db/delta", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          id: `delta-add-tp_users-${newUser.id}-${Date.now()}`,
          type: "APPEND_ROW",
          payload: { key: "tp_users", row: newUser },
        }),
      }).catch((err) => {
        console.warn("[User Sync] Direct delta push failed:", err);
      });
      addAuditLog(
        "USER_CREATE",
        `Created user account for ${newUser.fullName} (${newUser.role})`,
        "Users",
        newUser.id
      );
    },
    [logBranchAccessScope, getAuthHeaders, safeApiFetch, addAuditLog]
  );

  const updateUser = useCallback(
    (id: string, updates: Partial<User>) => {
      logBranchAccessScope("UPDATE", "User", updates.branchAssignmentId, id);
      let updatedUser: User | null = null;
      setUsers((prev) => {
        return prev.map((u) => {
          if (u.id === id) {
            updatedUser = { ...u, ...updates, updatedAt: new Date().toISOString() };
            return updatedUser;
          }
          return u;
        });
      });
      if (updatedUser) {
        safeApiFetch("/api/db/delta", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({
            id: `delta-update-tp_users-${id}-${Date.now()}`,
            type: "UPDATE_ROW",
            payload: { key: "tp_users", row: updatedUser },
          }),
        }).catch((e) => console.warn("[User Sync] Direct update failed:", e));
      }
      addAuditLog(
        "USER_UPDATE",
        `Updated user account details for user ID ${id}`,
        "Users",
        id
      );
    },
    [logBranchAccessScope, getAuthHeaders, safeApiFetch, addAuditLog]
  );

  const resetPassword = useCallback(
    (id: string, newPasswordHash?: string) => {
      const target = users.find((u) => u.id === id);
      if (target) {
        let updatedUser: User | null = null;
        setUsers((prev) => {
          return prev.map((u) => {
            if (u.id === id) {
              updatedUser = {
                ...u,
                passwordHash: newPasswordHash || "tilepoint",
                mustResetPassword: true,
                updatedAt: new Date().toISOString(),
              };
              return updatedUser;
            }
            return u;
          });
        });
        if (updatedUser) {
          safeApiFetch("/api/db/delta", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            body: JSON.stringify({
              id: `delta-reset-tp_users-${id}-${Date.now()}`,
              type: "UPDATE_ROW",
              payload: { key: "tp_users", row: updatedUser },
            }),
          }).catch((e) => console.warn("[Password Reset Sync] Direct push failed:", e));
        }
        addAuditLog(
          "USER_RESET_PASSWORD",
          `Reset password for user ${target.fullName} to default (tilepoint)`,
          "Users",
          id
        );
      }
    },
    [users, getAuthHeaders, safeApiFetch, addAuditLog]
  );

  const deleteUser = useCallback(
    (id: string) => {
      logBranchAccessScope("DELETE", "User", null, id);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === id
            ? {
                ...u,
                isDeleted: true,
                status: "Inactive",
                updatedAt: new Date().toISOString(),
              }
            : u
        )
      );
      const target = users.find((u) => u.id === id);
      addAuditLog(
        "USER_DELETE",
        `Soft-deleted staff member ${target?.fullName || id}`,
        "Users",
        id
      );
    },
    [users, logBranchAccessScope, addAuditLog]
  );

  const restoreUser = useCallback(
    (id: string) => {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === id
            ? {
                ...u,
                isDeleted: false,
                status: "Active",
                updatedAt: new Date().toISOString(),
              }
            : u
        )
      );
      const target = users.find((u) => u.id === id);
      addAuditLog(
        "USER_RESTORE",
        `Restored staff member ${target?.fullName || id} from Archives`,
        "Users",
        id
      );
    },
    [users, addAuditLog]
  );

  // --- BRANCHES CRUD ---
  const createBranch = useCallback(
    (
      branchFields: Omit<Branch, "id" | "createdAt" | "updatedAt" | "isDeleted"> & Partial<Branch>
    ) => {
      const customId = branchFields.id?.trim();
      const newBranch: Branch = {
        ...branchFields,
        name: sanitizeInputText(branchFields.name || ""),
        address: sanitizeInputText(branchFields.address || ""),
        manager: sanitizeInputText(branchFields.manager || ""),
        phone: sanitizeInputText(branchFields.phone || ""),
        id: customId || `B-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDeleted: false,
      };
      setBranches((prev) => [...prev, newBranch]);
      addAuditLog(
        "BRANCH_CREATE",
        `Created branch ${newBranch.name}`,
        "Branches",
        newBranch.id
      );
    },
    [addAuditLog]
  );

  const updateBranch = useCallback(
    (id: string, updates: Partial<Branch>) => {
      logBranchAccessScope("UPDATE", "Branch", id, updates.name);
      const newId = updates.id;
      const hasIdChanged = newId !== undefined && newId !== id;

      setBranches((prev) =>
        prev.map((b) =>
          b.id === id
            ? { ...b, ...updates, updatedAt: new Date().toISOString() }
            : b
        )
      );

      if (hasIdChanged && newId) {
        const primaryBranchId =
          localStorage.getItem("tilepoint_primary_branch_id") || "B1";
        if (primaryBranchId === id) {
          localStorage.setItem("tilepoint_primary_branch_id", newId);
        }

        setUsers((prev) =>
          prev.map((u) =>
            u.branchAssignmentId === id
              ? { ...u, branchAssignmentId: newId, updatedAt: new Date().toISOString() }
              : u
          )
        );

        setCurrentUser((prev) => {
          if (prev && prev.branchAssignmentId === id) {
            return {
              ...prev,
              branchAssignmentId: newId,
              updatedAt: new Date().toISOString(),
            };
          }
          return prev;
        });

        setBranchStock((prev) =>
          prev.map((bs) =>
            bs.branchId === id ? { ...bs, branchId: newId } : bs
          )
        );

        setShifts((prev) =>
          prev.map((s) => (s.branchId === id ? { ...s, branchId: newId } : s))
        );

        setSales((prev) =>
          prev.map((s) => (s.branchId === id ? { ...s, branchId: newId } : s))
        );

        setDeliveries((prev) =>
          prev.map((d) => (d.branchId === id ? { ...d, branchId: newId } : d))
        );

        setStockTransfers((prev) =>
          prev.map((st) => {
            const updated = { ...st };
            if (st.fromBranchId === id) updated.fromBranchId = newId;
            if (st.toBranchId === id) updated.toBranchId = newId;
            return updated;
          })
        );

        setDamageLogs((prev) =>
          prev.map((dl) => (dl.branchId === id ? { ...dl, branchId: newId } : dl))
        );

        setExpenses((prev) =>
          prev.map((e) => (e.branchId === id ? { ...e, branchId: newId } : e))
        );

        setPurchaseOrders((prev) =>
          prev.map((po) => (po.branchId === id ? { ...po, branchId: newId } : po))
        );

        setTransmittals((prev) =>
          prev.map((t) => {
            const updated = { ...t };
            if (t.fromBranchId === id) updated.fromBranchId = newId;
            if (t.toBranchId === id) updated.toBranchId = newId;
            return updated;
          })
        );

        setMovements((prev) =>
          prev.map((m) => {
            const updated = { ...m };
            if (m.sourceBranchId === id) updated.sourceBranchId = newId;
            if (m.destinationBranchId === id) updated.destinationBranchId = newId;
            return updated;
          })
        );

        setActiveSessions((prev) =>
          prev.map((as) => (as.branchId === id ? { ...as, branchId: newId } : as))
        );

        setBranchSalesReports((prev) =>
          prev.map((bsr) =>
            bsr.branchId === id ? { ...bsr, branchId: newId } : bsr
          )
        );
      }

      addAuditLog(
        "BRANCH_UPDATE",
        `Updated branch ID ${id}` + (hasIdChanged ? ` to ${newId}` : ""),
        "Branches",
        hasIdChanged && newId ? newId : id
      );
    },
    [
      logBranchAccessScope,
      addAuditLog,
      setCurrentUser,
      setBranchStock,
      setShifts,
      setSales,
      setDeliveries,
      setStockTransfers,
      setDamageLogs,
      setExpenses,
      setPurchaseOrders,
      setTransmittals,
      setMovements,
      setActiveSessions,
      setBranchSalesReports,
    ]
  );

  const deleteBranch = useCallback(
    (id: string) => {
      logBranchAccessScope("DELETE", "Branch", id);
      setBranches((prev) => {
        const remainingActive = prev.filter((b) => b.id !== id && !b.isDeleted);
        if (remainingActive.length === 0) {
          console.warn("[Branch Delete] Blocked: At least one active branch must remain.");
          return prev;
        }
        return prev.map((b) =>
          b.id === id
            ? { ...b, isDeleted: true, updatedAt: new Date().toISOString() }
            : b
        );
      });
      addAuditLog(
        "BRANCH_DELETE",
        `Soft-deleted branch ID ${id}`,
        "Branches",
        id
      );
    },
    [logBranchAccessScope, addAuditLog]
  );

  const restoreBranch = useCallback(
    (id: string) => {
      setBranches((prev) =>
        prev.map((b) =>
          b.id === id
            ? { ...b, isDeleted: false, updatedAt: new Date().toISOString() }
            : b
        )
      );
      const target = branches.find((b) => b.id === id);
      addAuditLog(
        "BRANCH_RESTORE",
        `Restored branch ${target?.name || id} from Archives`,
        "Branches",
        id
      );
    },
    [branches, addAuditLog]
  );

  // --- SUPPLIERS CRUD ---
  const createSupplier = useCallback(
    (supFields: Omit<Supplier, "id" | "createdAt" | "isDeleted"> & Partial<Supplier>): Supplier => {
      const newSup: Supplier = {
        ...supFields,
        name: sanitizeInputText(supFields.name || ""),
        contactPerson: sanitizeInputText(supFields.contactPerson || ""),
        phone: sanitizeInputText(supFields.phone || ""),
        email: sanitizeInputText(supFields.email || ""),
        address: sanitizeInputText(supFields.address || ""),
        id: `S-${Date.now()}`,
        createdAt: new Date().toISOString(),
        isDeleted: false,
      };
      setSuppliers((prev) => [...prev, newSup]);
      addAuditLog(
        "SUPPLIER_CREATE",
        `Created supplier ${newSup.name}`,
        "Suppliers",
        newSup.id
      );
      return newSup;
    },
    [addAuditLog]
  );

  const updateSupplier = useCallback(
    (id: string, updates: Partial<Supplier>) => {
      logBranchAccessScope("UPDATE", "Supplier", "GLOBAL", id);
      setSuppliers((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
      );
      addAuditLog(
        "SUPPLIER_UPDATE",
        `Updated supplier ID ${id}`,
        "Suppliers",
        id
      );
    },
    [logBranchAccessScope, addAuditLog]
  );

  const deleteSupplier = useCallback(
    (id: string) => {
      logBranchAccessScope("DELETE", "Supplier", "GLOBAL", id);
      setSuppliers((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isDeleted: true } : s))
      );
      addAuditLog(
        "SUPPLIER_DELETE",
        `Soft-deleted supplier ID ${id}`,
        "Suppliers",
        id
      );
    },
    [logBranchAccessScope, addAuditLog]
  );

  const restoreSupplier = useCallback(
    (id: string) => {
      setSuppliers((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isDeleted: false } : s))
      );
      const target = suppliers.find((s) => s.id === id);
      addAuditLog(
        "SUPPLIER_RESTORE",
        `Restored supplier ${target?.name || id} from Archives`,
        "Suppliers",
        id
      );
    },
    [suppliers, addAuditLog]
  );

  // --- BRANDS CRUD ---
  const createBrand = useCallback(
    (brandFields: Omit<Brand, "id" | "createdAt" | "isDeleted"> & Partial<Brand>): Brand => {
      const newBrand: Brand = {
        ...brandFields,
        name: sanitizeInputText(brandFields.name || ""),
        description: brandFields.description
          ? sanitizeInputText(brandFields.description)
          : "",
        id: `BND-${Date.now()}`,
        createdAt: new Date().toISOString(),
        isDeleted: false,
      };
      setBrands((prev) => [...prev, newBrand]);
      addAuditLog(
        "BRAND_CREATE",
        `Created brand ${newBrand.name}`,
        "Brands",
        newBrand.id
      );
      return newBrand;
    },
    [addAuditLog]
  );

  const updateBrand = useCallback(
    (id: string, updates: Partial<Brand>) => {
      logBranchAccessScope("UPDATE", "Brand", "GLOBAL", id);
      setBrands((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
      );
      addAuditLog(
        "BRAND_UPDATE",
        `Updated brand properties for ID: ${id}`,
        "Brands",
        id
      );
    },
    [logBranchAccessScope, addAuditLog]
  );

  const deleteBrand = useCallback(
    (id: string) => {
      logBranchAccessScope("DELETE", "Brand", "GLOBAL", id);
      setBrands((prev) =>
        prev.map((b) => (b.id === id ? { ...b, isDeleted: true } : b))
      );
      addAuditLog(
        "BRAND_DELETE",
        `Soft-deleted brand ID ${id}`,
        "Brands",
        id
      );
    },
    [logBranchAccessScope, addAuditLog]
  );

  const restoreBrand = useCallback(
    (id: string) => {
      setBrands((prev) =>
        prev.map((b) => (b.id === id ? { ...b, isDeleted: false } : b))
      );
      const target = brands.find((b) => b.id === id);
      addAuditLog(
        "BRAND_RESTORE",
        `Restored brand ${target?.name || id} from Archives`,
        "Brands",
        id
      );
    },
    [brands, addAuditLog]
  );

  // --- DYNAMIC BUSINESS MATRICES ---
  const createProductCategory = useCallback(
    (category: Omit<ProductCategory, "id" | "createdAt" | "updatedAt"> & Partial<ProductCategory>): ProductCategory => {
      const newCategory: ProductCategory = {
        ...category,
        id: `CAT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: sanitizeInputText(category.name || ""),
        description: category.description ? sanitizeInputText(category.description) : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setProductCategories((prev) => [...prev, newCategory]);
      addAuditLog("CATEGORY_CREATE", `Created product category: ${newCategory.name}`, "ProductCategories", newCategory.id);
      return newCategory;
    },
    [addAuditLog]
  );

  const updateProductCategory = useCallback(
    (id: string, updates: Partial<ProductCategory>) => {
      setProductCategories((prev) =>
        prev.map((cat) => (cat.id === id ? { ...cat, ...updates, updatedAt: new Date().toISOString() } : cat))
      );
      addAuditLog("CATEGORY_UPDATE", `Updated product category ID: ${id}`, "ProductCategories", id);
    },
    [addAuditLog]
  );

  const deleteProductCategory = useCallback(
    (id: string) => {
      setProductCategories((prev) => prev.filter((cat) => cat.id !== id));
      addAuditLog("CATEGORY_DELETE", `Deleted product category ID: ${id}`, "ProductCategories", id);
    },
    [addAuditLog]
  );

  const createUnitType = useCallback(
    (unit: Omit<UnitType, "id" | "createdAt" | "updatedAt"> & Partial<UnitType>): UnitType => {
      const newUnit: UnitType = {
        ...unit,
        id: `UNIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: sanitizeInputText(unit.name || ""),
        abbreviation: sanitizeInputText(unit.abbreviation || ""),
        description: unit.description ? sanitizeInputText(unit.description) : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setUnitTypes((prev) => [...prev, newUnit]);
      addAuditLog("UNIT_CREATE", `Created unit type: ${newUnit.name} (${newUnit.abbreviation})`, "UnitTypes", newUnit.id);
      return newUnit;
    },
    [addAuditLog]
  );

  const updateUnitType = useCallback(
    (id: string, updates: Partial<UnitType>) => {
      setUnitTypes((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...updates, updatedAt: new Date().toISOString() } : u))
      );
      addAuditLog("UNIT_UPDATE", `Updated unit type ID: ${id}`, "UnitTypes", id);
    },
    [addAuditLog]
  );

  const deleteUnitType = useCallback(
    (id: string) => {
      setUnitTypes((prev) => prev.filter((u) => u.id !== id));
      addAuditLog("UNIT_DELETE", `Deleted unit type ID: ${id}`, "UnitTypes", id);
    },
    [addAuditLog]
  );

  const createPaymentMethod = useCallback(
    (pm: Omit<CustomPaymentMethod, "id" | "createdAt" | "updatedAt"> & Partial<CustomPaymentMethod>): CustomPaymentMethod => {
      const newPm: CustomPaymentMethod = {
        ...pm,
        id: `PM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: sanitizeInputText(pm.name || ""),
        code: sanitizeInputText(pm.code || ""),
        description: pm.description ? sanitizeInputText(pm.description) : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setPaymentMethodsList((prev) => [...prev, newPm]);
      addAuditLog("PAYMENT_METHOD_CREATE", `Created payment method: ${newPm.name}`, "PaymentMethods", newPm.id);
      return newPm;
    },
    [addAuditLog]
  );

  const updatePaymentMethod = useCallback(
    (id: string, updates: Partial<CustomPaymentMethod>) => {
      let allowed = true;
      setPaymentMethodsList((prev) => {
        const target = prev.find((pm) => pm.id === id);
        if (target && updates.isEnabled === false && target.isEnabled) {
          const activeCount = prev.filter((pm) => pm.isEnabled).length;
          if (activeCount <= 1) {
            allowed = false;
            console.warn(
              `[Payment Methods] Cannot disable payment method "${target.name}". At least one payment method must remain active.`
            );
            return prev;
          }
        }
        return prev.map((pm) => {
          if (pm.id !== id) return pm;
          const isEnabled = updates.isEnabled !== undefined ? updates.isEnabled : pm.isEnabled;
          return {
            ...pm,
            ...updates,
            isEnabled,
            isActive: isEnabled,
            updatedAt: new Date().toISOString(),
          };
        });
      });
      if (allowed) {
        addAuditLog("PAYMENT_METHOD_UPDATE", `Updated payment method ID: ${id}`, "PaymentMethods", id);
      }
    },
    [addAuditLog]
  );

  const deletePaymentMethod = useCallback(
    (id: string) => {
      let canDelete = true;
      setPaymentMethodsList((prev) => {
        const target = prev.find((pm) => pm.id === id);
        if (target && target.isEnabled) {
          const activeCount = prev.filter((pm) => pm.isEnabled).length;
          if (activeCount <= 1) {
            canDelete = false;
            console.warn(`[Payment Methods] Cannot delete the only active payment method "${target.name}".`);
            return prev;
          }
        }
        return prev.filter((pm) => pm.id !== id);
      });
      if (canDelete) {
        addAuditLog("PAYMENT_METHOD_DELETE", `Deleted payment method ID: ${id}`, "PaymentMethods", id);
      }
    },
    [addAuditLog]
  );

  const togglePaymentMethod = useCallback(
    (id: string, enabled?: boolean) => {
      let toggled = false;
      setPaymentMethodsList((prev) => {
        const target = prev.find((pm) => pm.id === id);
        if (!target) return prev;
        const willBeEnabled = enabled !== undefined ? enabled : !target.isEnabled;

        // RULE: There should always be at least one payment method that is active
        if (!willBeEnabled) {
          const activeCount = prev.filter((pm) => pm.isEnabled).length;
          if (activeCount <= 1 && target.isEnabled) {
            console.warn(
              `[Payment Methods] Cannot disable payment method "${target.name}". At least one payment method must remain active.`
            );
            return prev;
          }
        }

        toggled = true;
        return prev.map((pm) =>
          pm.id === id
            ? {
                ...pm,
                isEnabled: willBeEnabled,
                isActive: willBeEnabled,
                updatedAt: new Date().toISOString(),
              }
            : pm
        );
      });
      if (toggled) {
        addAuditLog("PAYMENT_METHOD_TOGGLE", `Toggled payment method status for ID: ${id}`, "PaymentMethods", id);
      }
    },
    [addAuditLog]
  );

  const createDiscountScheme = useCallback(
    (ds: Omit<DiscountScheme, "id" | "createdAt" | "updatedAt"> & Partial<DiscountScheme>): DiscountScheme => {
      const newDs: DiscountScheme = {
        ...ds,
        id: `DISC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: sanitizeInputText(ds.name || ""),
        code: sanitizeInputText(ds.code || ""),
        description: ds.description ? sanitizeInputText(ds.description) : undefined,
        isEnabled: ds.isEnabled !== undefined ? ds.isEnabled : true,
        isActive: ds.isEnabled !== undefined ? ds.isEnabled : true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setDiscountSchemes((prev) => [...prev, newDs]);
      addAuditLog("DISCOUNT_SCHEME_CREATE", `Created discount scheme: ${newDs.name}`, "DiscountSchemes", newDs.id);
      return newDs;
    },
    [addAuditLog]
  );

  const updateDiscountScheme = useCallback(
    (id: string, updates: Partial<DiscountScheme>) => {
      setDiscountSchemes((prev) =>
        prev.map((ds) => {
          if (ds.id !== id) return ds;
          const isEnabled = updates.isEnabled !== undefined ? updates.isEnabled : ds.isEnabled;
          return {
            ...ds,
            ...updates,
            isEnabled,
            isActive: isEnabled,
            updatedAt: new Date().toISOString(),
          };
        })
      );
      addAuditLog("DISCOUNT_SCHEME_UPDATE", `Updated discount scheme ID: ${id}`, "DiscountSchemes", id);
    },
    [addAuditLog]
  );

  const deleteDiscountScheme = useCallback(
    (id: string) => {
      setDiscountSchemes((prev) => prev.filter((ds) => ds.id !== id));
      addAuditLog("DISCOUNT_SCHEME_DELETE", `Deleted discount scheme ID: ${id}`, "DiscountSchemes", id);
    },
    [addAuditLog]
  );

  const toggleDiscountScheme = useCallback(
    (id: string, enabled?: boolean) => {
      setDiscountSchemes((prev) =>
        prev.map((ds) => {
          if (ds.id !== id) return ds;
          const willBeEnabled = enabled !== undefined ? enabled : !ds.isEnabled;
          return {
            ...ds,
            isEnabled: willBeEnabled,
            isActive: willBeEnabled,
            updatedAt: new Date().toISOString(),
          };
        })
      );
      addAuditLog("DISCOUNT_SCHEME_TOGGLE", `Toggled discount scheme status for ID: ${id}`, "DiscountSchemes", id);
    },
    [addAuditLog]
  );

  const createDamageReason = useCallback(
    (dr: Omit<DamageReasonOption, "id" | "createdAt" | "updatedAt"> & Partial<DamageReasonOption>): DamageReasonOption => {
      const newDr: DamageReasonOption = {
        ...dr,
        id: `DMR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: sanitizeInputText(dr.name || ""),
        code: sanitizeInputText(dr.code || ""),
        description: dr.description ? sanitizeInputText(dr.description) : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setDamageReasonsList((prev) => [...prev, newDr]);
      addAuditLog("DAMAGE_REASON_CREATE", `Created damage reason: ${newDr.name}`, "DamageReasons", newDr.id);
      return newDr;
    },
    [addAuditLog]
  );

  const updateDamageReason = useCallback(
    (id: string, updates: Partial<DamageReasonOption>) => {
      setDamageReasonsList((prev) =>
        prev.map((dr) => (dr.id === id ? { ...dr, ...updates, updatedAt: new Date().toISOString() } : dr))
      );
      addAuditLog("DAMAGE_REASON_UPDATE", `Updated damage reason ID: ${id}`, "DamageReasons", id);
    },
    [addAuditLog]
  );

  const deleteDamageReason = useCallback(
    (id: string) => {
      setDamageReasonsList((prev) => prev.filter((dr) => dr.id !== id));
      addAuditLog("DAMAGE_REASON_DELETE", `Deleted damage reason ID: ${id}`, "DamageReasons", id);
    },
    [addAuditLog]
  );

  const toggleDamageReason = useCallback(
    (id: string, enabled?: boolean) => {
      setDamageReasonsList((prev) =>
        prev.map((dr) =>
          dr.id === id
            ? { ...dr, isEnabled: enabled !== undefined ? enabled : !dr.isEnabled, updatedAt: new Date().toISOString() }
            : dr
        )
      );
      addAuditLog("DAMAGE_REASON_TOGGLE", `Toggled damage reason status for ID: ${id}`, "DamageReasons", id);
    },
    [addAuditLog]
  );

  // --- ARCHIVES PURGE & BULK RESTORE ---
  const purgeArchivedItem = useCallback(
    (type: string, id: string) => {
      switch (type) {
        case "product":
          setProducts((prev) => prev.filter((p) => p.id !== id));
          break;
        case "user":
          setUsers((prev) => prev.filter((u) => u.id !== id));
          break;
        case "branch":
          setBranches((prev) => prev.filter((b) => b.id !== id));
          break;
        case "supplier":
          setSuppliers((prev) => prev.filter((s) => s.id !== id));
          break;
        case "brand":
          setBrands((prev) => prev.filter((b) => b.id !== id));
          break;
        case "sale":
          setSales((prev) => prev.filter((s) => s.id !== id));
          break;
        case "purchaseOrder":
          setPurchaseOrders((prev) => prev.filter((po) => po.id !== id));
          break;
        case "transmittal":
          setTransmittals((prev) => prev.filter((t) => t.id !== id));
          break;
        case "expense":
          setExpenses((prev) => prev.filter((ex) => ex.id !== id));
          break;
        case "damageLog":
          setDamageLogs((prev) => prev.filter((d) => d.id !== id));
          break;
      }
      addAuditLog(
        "ARCHIVE_PERMANENT_PURGE",
        `Permanently purged archived ${type} record ${id}`,
        "Archives",
        id
      );
    },
    [
      setProducts,
      setSales,
      setPurchaseOrders,
      setTransmittals,
      setExpenses,
      setDamageLogs,
      addAuditLog,
    ]
  );

  const bulkRestoreItems = useCallback(
    (items: { type: string; id: string }[]) => {
      items.forEach((item) => {
        switch (item.type) {
          case "product":
            restoreProduct(item.id);
            break;
          case "user":
            restoreUser(item.id);
            break;
          case "branch":
            restoreBranch(item.id);
            break;
          case "supplier":
            restoreSupplier(item.id);
            break;
          case "brand":
            restoreBrand(item.id);
            break;
          case "sale":
            setSales((prev) =>
              prev.map((s) => (s.id === item.id ? { ...s, isDeleted: false, deletedAt: undefined } : s))
            );
            addAuditLog("SALE_RESTORE", `Restored sale/invoice ${item.id} from Archives`, "Sales", item.id);
            break;
          case "purchaseOrder":
            setPurchaseOrders((prev) =>
              prev.map((po) => (po.id === item.id ? { ...po, isDeleted: false, deletedAt: undefined } : po))
            );
            addAuditLog("PO_RESTORE", `Restored purchase order ${item.id} from Archives`, "PurchaseOrders", item.id);
            break;
          case "transmittal":
            setTransmittals((prev) =>
              prev.map((t) => (t.id === item.id ? { ...t, isDeleted: false, deletedAt: undefined } : t))
            );
            addAuditLog("TRANSMITTAL_RESTORE", `Restored transmittal ${item.id} from Archives`, "Transmittals", item.id);
            break;
          case "expense":
            setExpenses((prev) =>
              prev.map((ex) => (ex.id === item.id ? { ...ex, isDeleted: false, deletedAt: undefined } : ex))
            );
            addAuditLog("EXPENSE_RESTORE", `Restored expense ${item.id} from Archives`, "Expenses", item.id);
            break;
          case "damageLog":
            setDamageLogs((prev) =>
              prev.map((log) => (log.id === item.id ? { ...log, isDeleted: false, deletedAt: undefined } : log))
            );
            addAuditLog("DAMAGE_LOG_RESTORE", `Restored damage log ${item.id} from Archives`, "DamageLogs", item.id);
            break;
        }
      });
      addAuditLog(
        "ARCHIVE_BULK_RESTORE",
        `Bulk restored ${items.length} items from Archives`,
        "Archives",
        "BULK"
      );
    },
    [
      restoreProduct,
      restoreUser,
      restoreBranch,
      restoreSupplier,
      restoreBrand,
      setSales,
      setPurchaseOrders,
      setTransmittals,
      setExpenses,
      setDamageLogs,
      addAuditLog,
    ]
  );

  return {
    users,
    setUsers,
    branches,
    setBranches,
    suppliers,
    setSuppliers,
    brands,
    setBrands,
    productCategories,
    setProductCategories,
    unitTypes,
    setUnitTypes,
    paymentMethodsList,
    setPaymentMethodsList,
    discountSchemes,
    setDiscountSchemes,
    damageReasonsList,
    setDamageReasonsList,
    createUser,
    updateUser,
    resetPassword,
    deleteUser,
    restoreUser,
    createBranch,
    updateBranch,
    deleteBranch,
    restoreBranch,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    restoreSupplier,
    createBrand,
    updateBrand,
    deleteBrand,
    restoreBrand,
    createProductCategory,
    updateProductCategory,
    deleteProductCategory,
    createUnitType,
    updateUnitType,
    deleteUnitType,
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    togglePaymentMethod,
    createDiscountScheme,
    updateDiscountScheme,
    deleteDiscountScheme,
    toggleDiscountScheme,
    createDamageReason,
    updateDamageReason,
    deleteDamageReason,
    toggleDamageReason,
    purgeArchivedItem,
    bulkRestoreItems,
  };
}
