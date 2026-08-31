/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useMemo, useRef } from "react";
import {
  Product,
  InventoryLocationStock,
  Branch,
  Supplier,
  User,
  InventoryMovement,
  DamageLog,
} from "../../types/db";
import { BranchStockStats } from "../../types/dbContext.types";
import { SEED_PRODUCTS } from "../seedData";
import { safeParse } from "../dbContextStorage";
import { sanitizeInputText, sanitizeAndValidateNumber } from "../reconciliationCrypto";
import {
  getBranchStockQuantity,
  getBranchStockRecord,
  isProductInBranch,
  slugifyBranchStr,
} from "../../lib/branchUtils";
import { generateEan13Barcode } from "../../utils/barcodeGenerator";

interface UseDbProductsOptions {
  currentUser: User | null;
  branches: Branch[];
  suppliers?: Supplier[];
  validateInventoryAccess: (item: any) => boolean;
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
  setMovements: React.Dispatch<React.SetStateAction<InventoryMovement[]>>;
  setDamageLogs: React.Dispatch<React.SetStateAction<DamageLog[]>>;
  volatileCache: React.MutableRefObject<Record<string, string>>;
  logManualAdjustment: (productId: string, delta: number, notes: string) => void;
}

export function useDbProductsModule({
  currentUser,
  branches,
  suppliers = [],
  validateInventoryAccess,
  logBranchAccessScope,
  getAuthHeaders,
  safeApiFetch,
  addAuditLog,
  setMovements,
  setDamageLogs,
  volatileCache,
  logManualAdjustment,
}: UseDbProductsOptions) {
  const [products, setProducts] = useState<Product[]>(() => {
    return safeParse<Product[]>("tp_products", SEED_PRODUCTS);
  });

  const [branchStock, setBranchStock] = useState<InventoryLocationStock[]>(() => {
    return safeParse<InventoryLocationStock[]>("tp_branch_stock", []);
  });

  const optimisticStockCacheRef = useRef<
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
  >(new Map());

  // Helper for safe local storage writes
  const safeLocalStorageSetItem = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`[Storage Warning] Failed to write ${key} to localStorage:`, e);
    }
  };

  // --- PRODUCTS CRUD ---
  const createProduct = useCallback(
    (
      prodFields: Omit<
        Product,
        | "id"
        | "createdAt"
        | "updatedAt"
        | "isDeleted"
        | "qrCode"
        | "createdBy"
        | "updatedBy"
      > &
        Partial<Product>
    ): Product => {
      const newId = `P-${Date.now()}`;
      const sanitizedFields = {
        ...prodFields,
        productName: sanitizeInputText(prodFields.productName || ""),
        productCode: sanitizeInputText(prodFields.productCode || ""),
        sku: sanitizeInputText(prodFields.sku || ""),
        barcode: sanitizeInputText(prodFields.barcode || ""),
        category: sanitizeInputText(prodFields.category || "") || "Porcelain Tiles",
        brand: sanitizeInputText(prodFields.brand || "") || "Generic",
        size: prodFields.size ? sanitizeInputText(prodFields.size) : undefined,
        designName: sanitizeInputText(prodFields.designName || "Standard"),
        supplierId: sanitizeInputText(prodFields.supplierId || "central"),
        unit: sanitizeInputText(prodFields.unit || "") || "Unit",
        origin: prodFields.origin ? sanitizeInputText(prodFields.origin) : undefined,
        boxQuantity: sanitizeAndValidateNumber(prodFields.boxQuantity, 1),
        coveragePerBox:
          prodFields.coveragePerBox !== undefined
            ? sanitizeAndValidateNumber(prodFields.coveragePerBox, 1)
            : undefined,
        costPrice: sanitizeAndValidateNumber(prodFields.costPrice),
        sellingPrice: sanitizeAndValidateNumber(prodFields.sellingPrice),
        stockQuantity: Math.round(sanitizeAndValidateNumber(prodFields.stockQuantity)),
        minimumStock: Math.round(sanitizeAndValidateNumber(prodFields.minimumStock, 10)),
      };

      const newProd: Product = {
        ...sanitizedFields,
        id: newId,
        qrCode: `TP-${sanitizedFields.productCode}`,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: currentUser?.fullName || "SYSTEM",
        updatedBy: currentUser?.fullName || "SYSTEM",
        version: 1,
      };
      setProducts((prev) => [...prev, newProd]);

      const targetBranch =
        sanitizedFields.origin && branches.some((b) => b.id === sanitizedFields.origin)
          ? sanitizedFields.origin
          : currentUser?.branchAssignmentId || "B1";

      setBranchStock((prev) => [
        ...prev,
        {
          id: `${targetBranch}_${newId}`,
          branchId: targetBranch,
          productId: newId,
          quantity: sanitizedFields.stockQuantity,
          version: 1,
        },
      ]);

      const initMove: InventoryMovement = {
        id: `M-${Date.now()}`,
        productId: newId,
        type: "IN",
        quantity: sanitizedFields.stockQuantity,
        destinationBranchId: targetBranch,
        referenceId: "INITIAL_STOCK",
        notes: sanitizedFields.origin
          ? `Initial stock intake. Origin/Source: ${sanitizedFields.origin}`
          : "Initial stock intake upon product registration",
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || "SYSTEM",
        username: currentUser?.username || "system",
      };
      setMovements((prev) => [initMove, ...prev]);

      addAuditLog(
        "PRODUCT_CREATE",
        `Created product ${newProd.productName}`,
        "Products",
        newProd.id
      );
      return newProd;
    },
    [currentUser, branches, setMovements, addAuditLog]
  );

  const updateProduct = useCallback(
    (id: string, updates: Partial<Product>, customLogReason?: string) => {
      const original = products.find((p) => p.id === id);
      if (!original) return;

      if (updates.version !== undefined && original.version !== undefined) {
        if (updates.version !== original.version) {
          throw new Error(
            `CONCURRENCY_CONFLICT: Product "${original.productName}" was modified by another operator. Please refresh the inventory page to receive the newest state. (Current version: ${original.version}, Submitted version: ${updates.version})`
          );
        }
      }

      if (updates.stockQuantity !== undefined) {
        const nextStock = Math.round(sanitizeAndValidateNumber(updates.stockQuantity));
        if (nextStock !== original.stockQuantity) {
          const diff = nextStock - original.stockQuantity;
          logManualAdjustment(
            id,
            diff,
            customLogReason || "Stock level manual correction from product edit panel"
          );

          setBranchStock((stockList) => {
            const targetBranchId = currentUser?.branchAssignmentId || "B1";
            const idx = stockList.findIndex(
              (bs) => bs.productId === id && bs.branchId === targetBranchId
            );
            if (idx !== -1) {
              const updated = [...stockList];
              const nextQty = Math.max(0, updated[idx].quantity + diff);
              updated[idx] = { ...updated[idx], quantity: nextQty };
              return updated;
            } else {
              const nextQty = Math.max(0, diff);
              return [
                ...stockList,
                {
                  id: `${targetBranchId}_${id}`,
                  branchId: targetBranchId,
                  productId: id,
                  quantity: nextQty,
                },
              ];
            }
          });
        }
      }

      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === id) {
            const sanitizedUpdates: Partial<Product> = {};
            if (updates.productName !== undefined)
              sanitizedUpdates.productName = sanitizeInputText(updates.productName);
            if (updates.productCode !== undefined)
              sanitizedUpdates.productCode = sanitizeInputText(updates.productCode);
            if (updates.sku !== undefined)
              sanitizedUpdates.sku = sanitizeInputText(updates.sku);
            if (updates.barcode !== undefined)
              sanitizedUpdates.barcode = sanitizeInputText(updates.barcode);
            if (updates.category !== undefined)
              sanitizedUpdates.category = sanitizeInputText(updates.category);
            if (updates.brand !== undefined)
              sanitizedUpdates.brand = sanitizeInputText(updates.brand);
            if (updates.size !== undefined)
              sanitizedUpdates.size = sanitizeInputText(updates.size);
            if (updates.designName !== undefined)
              sanitizedUpdates.designName = sanitizeInputText(updates.designName);
            if (updates.supplierId !== undefined)
              sanitizedUpdates.supplierId = sanitizeInputText(updates.supplierId);
            if (updates.unit !== undefined)
              sanitizedUpdates.unit = sanitizeInputText(updates.unit);
            if (updates.origin !== undefined)
              sanitizedUpdates.origin = updates.origin
                ? sanitizeInputText(updates.origin)
                : undefined;
            if (updates.image !== undefined) sanitizedUpdates.image = updates.image;

            if (updates.boxQuantity !== undefined)
              sanitizedUpdates.boxQuantity = sanitizeAndValidateNumber(updates.boxQuantity);
            if (updates.coveragePerBox !== undefined)
              sanitizedUpdates.coveragePerBox = sanitizeAndValidateNumber(updates.coveragePerBox);
            if (updates.costPrice !== undefined)
              sanitizedUpdates.costPrice = sanitizeAndValidateNumber(updates.costPrice);
            if (updates.sellingPrice !== undefined)
              sanitizedUpdates.sellingPrice = sanitizeAndValidateNumber(updates.sellingPrice);
            if (updates.stockQuantity !== undefined)
              sanitizedUpdates.stockQuantity = Math.round(
                sanitizeAndValidateNumber(updates.stockQuantity)
              );
            if (updates.minimumStock !== undefined)
              sanitizedUpdates.minimumStock = Math.round(
                sanitizeAndValidateNumber(updates.minimumStock)
              );

            return {
              ...p,
              ...updates,
              ...sanitizedUpdates,
              version: (p.version || 1) + 1,
              updatedAt: new Date().toISOString(),
              updatedBy: currentUser?.fullName || "SYSTEM",
            };
          }
          return p;
        })
      );

      addAuditLog(
        "PRODUCT_UPDATE",
        `Updated product ${original?.productName || id}`,
        "Products",
        id
      );
    },
    [products, currentUser, logManualAdjustment, addAuditLog]
  );

  const deleteProduct = useCallback(
    (id: string) => {
      logBranchAccessScope("DELETE", "Product", null, id);
      const original = products.find((p) => p.id === id);
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                isDeleted: true,
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser?.fullName || "SYSTEM",
              }
            : p
        )
      );
      addAuditLog(
        "PRODUCT_DELETE",
        `Soft-deleted product ${original?.productName || id}`,
        "Products",
        id
      );
    },
    [products, currentUser, logBranchAccessScope, addAuditLog]
  );

  const bulkDeleteProducts = useCallback(
    (ids: string[]) => {
      logBranchAccessScope("DELETE", "Product (Bulk)", null, ids.join(","));
      const idSet = new Set(ids);
      setProducts((prev) =>
        prev.map((p) =>
          idSet.has(p.id)
            ? {
                ...p,
                isDeleted: true,
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser?.fullName || "System",
              }
            : p
        )
      );
      addAuditLog(
        "PRODUCT_BULK_DELETE",
        `Bulk soft-deleted ${ids.length} products to Archives`,
        "Products",
        "BULK"
      );
    },
    [currentUser, logBranchAccessScope, addAuditLog]
  );

  const restoreProduct = useCallback(
    (id: string) => {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                isDeleted: false,
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser?.fullName || "System",
              }
            : p
        )
      );
      const target = products.find((p) => p.id === id);
      addAuditLog(
        "PRODUCT_RESTORE",
        `Restored product ${target?.productName || id} from Archives`,
        "Products",
        id
      );
    },
    [products, currentUser, addAuditLog]
  );

  // --- BRANCH PRICING & THRESHOLDS ---
  const updateBranchProductPrice = useCallback(
    (productId: string, branchId: string, price: number) => {
      if (!validateInventoryAccess({ currentBranchId: branchId })) {
        console.warn("Unauthorized cross-branch pricing adjustment blocked.");
        return;
      }
      setBranchStock((prevList) => {
        const matchIndex = prevList.findIndex(
          (bs) => bs.productId === productId && bs.branchId === branchId
        );
        if (matchIndex !== -1) {
          const nextList = [...prevList];
          nextList[matchIndex] = {
            ...nextList[matchIndex],
            sellingPriceOverride: price > 0 ? price : undefined,
          };
          return nextList;
        } else {
          const newRecord: InventoryLocationStock = {
            id: `${branchId}_${productId}`,
            branchId,
            productId,
            quantity: 0,
            sellingPriceOverride: price > 0 ? price : undefined,
          };
          return [...prevList, newRecord];
        }
      });

      const prod = products.find((p) => p.id === productId);
      const branchMeta = branches.find((b) => b.id === branchId);
      if (prod && branchMeta) {
        addAuditLog(
          "PRICE_ADJUSTMENT",
          `Adjusted retail selling price for "${prod.productName}" at branch "${branchMeta.name}" to ₱${price.toFixed(2)}.`,
          "BranchStock",
          productId
        );
      }
    },
    [validateInventoryAccess, products, branches, addAuditLog]
  );

  const updateBranchLowStockThreshold = useCallback(
    (productId: string, branchId: string, threshold: number) => {
      if (!validateInventoryAccess({ currentBranchId: branchId })) {
        console.warn("Unauthorized cross-branch threshold adjustment blocked.");
        return;
      }
      setBranchStock((prevList) => {
        const matchIndex = prevList.findIndex(
          (bs) => bs.productId === productId && bs.branchId === branchId
        );
        if (matchIndex !== -1) {
          const nextList = [...prevList];
          nextList[matchIndex] = {
            ...nextList[matchIndex],
            lowStockThresholdOverride: threshold >= 0 ? threshold : undefined,
          };
          return nextList;
        } else {
          const newRecord: InventoryLocationStock = {
            id: `${branchId}_${productId}`,
            branchId,
            productId,
            quantity: 0,
            lowStockThresholdOverride: threshold >= 0 ? threshold : undefined,
          };
          return [...prevList, newRecord];
        }
      });

      const prod = products.find((p) => p.id === productId);
      const branchMeta = branches.find((b) => b.id === branchId);
      if (prod && branchMeta) {
        addAuditLog(
          "THRESHOLD_ADJUSTMENT",
          `Adjusted localized branch safety alarm threshold for "${prod.productName}" at branch "${branchMeta.name}" to ${threshold} units.`,
          "BranchStock",
          productId
        );
      }
    },
    [validateInventoryAccess, products, branches, addAuditLog]
  );

  // --- CATALOG INGESTION ---
  const correctCategoryName = (rawCat: string): string => {
    if (!rawCat) return "Porcelain Tiles";
    const clean = rawCat.toUpperCase().trim();
    const catMapping: Record<string, string> = {
      WATERCLOSET: "Water Closet",
      DOORKNOBS: "Doorknobs",
      STAIRNOSING: "Stair Nosing",
      "PLUMBING ACC.": "Plumbing Accessories",
      "PLUMBING ACC": "Plumbing Accessories",
      PLUMBING: "Plumbing Accessories",
      "CEILING PANEL": "Ceiling Panels",
      "KITCHEN SINK": "Kitchen Sinks",
      "BATHROOM ACCESSORIES": "Bathroom Accessories",
      "BATHROOM ACCESORIES": "Bathroom Accessories",
      "BATHROOM ACCS": "Bathroom Accessories",
      "TILE TRIM": "Tile Trims",
      "WPC PANEL": "WPC Panels",
      GROUTS: "Grout & Adhesives",
      ADHESIVES: "Grout & Adhesives",
      LOCKSET: "Locksets",
      SHOWER: "Showers",
      TANK: "Tanks",
      SLABSTONE: "Slabstone",
      HINGES: "Hinges",
      DAMAGES: "Damaged Products",
      PAVERS: "Pavers",
      ASSORTED: "Assorted Products",
      BIDET: "Bidets",
      GLOVES: "Gloves",
      MOULDING: "Mouldings",
      HARDWARE: "Hardware",
      TILES: "Tiles",
      ELECTRICAL: "Electrical",
      ACCESSORIES: "Accessories",
      FITTINGS: "Fittings",
      DOOR: "Doors",
      FAUCET: "Faucets",
      OTHERS: "Others",
    };
    if (catMapping[clean]) {
      return catMapping[clean];
    }
    return clean
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const correctUnitName = (rawUnit: string): string => {
    if (!rawUnit) return "Unit";
    const clean = rawUnit.toUpperCase().trim();
    if (
      clean === "TILES" ||
      clean === "TILE" ||
      clean === "TILES/BOX" ||
      clean === "TILE/BOX"
    ) {
      return "Unit";
    }
    const unitMapping: Record<string, string> = {
      PCS: "PCS",
      PC: "PCS",
      PIECE: "PCS",
      PIECES: "PCS",
      PACK: "Pack",
      SET: "Set",
      UNIT: "Unit",
      METERS: "Meters",
      METER: "Meters",
      KILO: "Kilo",
      KILOGRAM: "Kilo",
      BAG: "Bag",
      BAGS: "Bag",
      PAIR: "Pair",
      PALLET: "Pallet",
      PALLETS: "Pallet",
      BOX: "Box",
      BOXES: "Box",
      SACK: "Sack",
      SACKS: "Sack",
      ROLL: "Roll",
      ROLLS: "Roll",
      GALLON: "Gallon",
      CAN: "Can",
    };
    if (unitMapping[clean]) {
      return unitMapping[clean];
    }
    return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  };

  const correctProductName = (rawName: string): string => {
    if (!rawName) return "";
    let cleaned = rawName;
    const replacements: Array<[RegExp, string]> = [
      [/stairnossing/gi, "Stair Nosing"],
      [/stairnosing/gi, "Stair Nosing"],
      [/accesories/gi, "Accessories"],
      [/accesory/gi, "Accessory"],
      [/watercloset/gi, "Water Closet"],
      [/doorknobs/gi, "Doorknobs"],
      [/doorknob\b/gi, "Doorknob"],
      [/slightly damage/gi, "Slightly Damaged"],
      [/slight damage/gi, "Slightly Damaged"],
      [/slight damaged/gi, "Slightly Damaged"],
      [/damage\b/gi, "Damaged"],
      [/damages\b/gi, "Damaged"],
      [/1pallet/gi, "1 Pallet"],
    ];

    replacements.forEach(([regex, rep]) => {
      cleaned = cleaned.replace(regex, rep);
    });

    cleaned = cleaned
      .toLowerCase()
      .split(/\s+/)
      .map((word) => {
        const upperWords = [
          "pvc",
          "wpc",
          "s/s",
          "h",
          "wc",
          "led",
          "mu",
          "usd",
          "php",
          "coa",
          "boa",
        ];
        if (upperWords.includes(word)) {
          return word.toUpperCase();
        }
        if (/^\d+(\.\d+)?[xx]\d+(\.\d+)?$/.test(word)) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");

    cleaned = cleaned.replace(/(\d+)\s*[xX]\s*(\d+)/g, "$1x$2");
    return cleaned.trim();
  };

  const importProducts = useCallback(
    (imported: Product[], branchMapping?: Record<string, string>) => {
      try {
        const fallbackBranchId = branches.find((b) => !b.isDeleted)?.id || branches[0]?.id || currentUser?.branchAssignmentId || "B1";

        const existingById = new Map<string, Product>();
        const existingByCode = new Map<string, Product>();
        const existingByBarcode = new Map<string, Product>();
        const existingBySku = new Map<string, Product>();

        products.forEach((prod) => {
          if (prod.id) existingById.set(prod.id, prod);
          if (prod.productCode) existingByCode.set(prod.productCode.toLowerCase().trim(), prod);
          if (prod.barcode) existingByBarcode.set(prod.barcode.toLowerCase().trim(), prod);
          if (prod.sku) existingBySku.set(prod.sku.toLowerCase().trim(), prod);
        });

        const seenCodes = new Set<string>();
        const seenBarcodes = new Set<string>();
        const seenSkus = new Set<string>();

        const sanitized: Product[] = [];

        imported.forEach((p, i) => {
          const rawCode = sanitizeInputText(p.productCode);
          const rawBarcode = sanitizeInputText(p.barcode);
          const rawSku = sanitizeInputText(p.sku);
          const rawName = sanitizeInputText(p.productName) || "Unnamed Imported Product";

          // Match existing product if available
          const existing =
            (p.id && existingById.get(p.id)) ||
            (rawCode && existingByCode.get(rawCode.toLowerCase().trim())) ||
            (rawBarcode && existingByBarcode.get(rawBarcode.toLowerCase().trim())) ||
            (rawSku && existingBySku.get(rawSku.toLowerCase().trim()));

          const finalId = existing ? existing.id : (p.id || `P-IMP-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`);

          let barcode = rawBarcode || (existing && existing.barcode) || "";
          if (!barcode || (seenBarcodes.has(barcode.toLowerCase().trim()) && (!existing || existing.barcode !== barcode))) {
            barcode = generateEan13Barcode();
          }
          seenBarcodes.add(barcode.toLowerCase().trim());

          let productCode = rawCode || (existing && existing.productCode) || barcode || `TL-IMP-${Date.now()}-${i}`;
          if (seenCodes.has(productCode.toLowerCase().trim()) && (!existing || existing.productCode !== productCode)) {
            productCode = `${productCode}-${i + 1}`;
          }
          seenCodes.add(productCode.toLowerCase().trim());

          let sku = rawSku || (existing && existing.sku) || (barcode ? `SKU-${barcode}` : `SKU-IMP-${Date.now()}-${i}`);
          if (seenSkus.has(sku.toLowerCase().trim()) && (!existing || existing.sku !== sku)) {
            sku = `${sku}-${i + 1}`;
          }
          seenSkus.add(sku.toLowerCase().trim());

          const pName = correctProductName(rawName);

          let size = sanitizeInputText(p.size || "");
          if (!size && pName) {
            const sizeMatch = pName.match(/(\d+(?:\.\d+)?)\s*[xX]\s*(\d+(?:\.\d+)?)/);
            if (sizeMatch) {
              size = `${sizeMatch[1]}x${sizeMatch[2]} cm`;
            }
          }
          if (!size) {
            const catLower = (p.category || "").toLowerCase();
            const isTile =
              catLower.includes("tile") ||
              catLower.includes("slab") ||
              catLower.includes("stone");
            size = isTile ? "60x60 cm" : "N/A";
          }

          // Verify supplier exists in suppliers table or nullify to prevent foreign key errors
          const rawSupId = sanitizeInputText(p.supplierId || "");
          const validSup = suppliers.find((s) => s.id === rawSupId && !s.isDeleted);
          const finalSupplierId = validSup ? validSup.id : undefined;

          const prodItem: Product = {
            id: finalId,
            productCode,
            productName: pName,
            sku,
            barcode,
            qrCode: p.qrCode || `TP-${productCode}`,
            category: correctCategoryName(sanitizeInputText(p.category || "")) || (existing ? existing.category : "Tiles"),
            brand: sanitizeInputText(p.brand || "") || (existing ? existing.brand : "Generic"),
            size,
            designName: correctProductName(
              sanitizeInputText(p.designName || "") || p.productName || pName
            ),
            supplierId: finalSupplierId,
            unit: correctUnitName(sanitizeInputText(p.unit || "") || "Pcs"),
            origin: p.origin ? sanitizeInputText(p.origin) : (existing ? existing.origin : undefined),
            boxQuantity: sanitizeAndValidateNumber(p.boxQuantity || (size !== "N/A" ? 4 : 1), 1),
            coveragePerBox:
              p.coveragePerBox !== undefined
                ? sanitizeAndValidateNumber(p.coveragePerBox, 1)
                : (existing ? existing.coveragePerBox : undefined),
            costPrice: sanitizeAndValidateNumber(p.costPrice ?? (existing ? existing.costPrice : 0)),
            sellingPrice: sanitizeAndValidateNumber(p.sellingPrice ?? (existing ? existing.sellingPrice : 0)),
            stockQuantity: Math.round(sanitizeAndValidateNumber(p.stockQuantity ?? (existing ? existing.stockQuantity : 0))),
            minimumStock: Math.round(sanitizeAndValidateNumber(p.minimumStock ?? (existing ? existing.minimumStock : 0), 0)),
            createdAt: existing ? existing.createdAt : (p.createdAt || new Date().toISOString()),
            updatedAt: new Date().toISOString(),
            isDeleted: Boolean(p.isDeleted),
            hasExpiration:
              p.hasExpiration !== undefined
                ? !!p.hasExpiration
                : p.expirationDate
                ? true
                : existing
                ? Boolean(existing.hasExpiration)
                : false,
            expirationDate: p.expirationDate ? p.expirationDate : (existing ? existing.expirationDate : undefined),
            version: ((existing && Number(existing.version)) || 0) + 1,
          };

          sanitized.push(prodItem);
        });

        if (sanitized.length === 0) {
          return { success: false, count: 0, error: `No valid product entries found to import.` };
        }

        const productMap = new Map<string, Product>();
        products.forEach((prod) => {
          productMap.set(prod.id, prod);
        });
        sanitized.forEach((item) => {
          productMap.set(item.id, item);
        });

        const nextProducts = Array.from(productMap.values());
        setProducts(nextProducts);

        const nextBranchStock = [...branchStock];
        const nowIso = new Date().toISOString();
        sanitized.forEach((item) => {
          if (item.stockQuantity > 0) {
            let targetBranchId =
              (branchMapping && branchMapping["default"]) ||
              currentUser?.branchAssignmentId ||
              fallbackBranchId;
            if (item.origin) {
              const cleanedOrigin = item.origin.toLowerCase().trim();
              if (branchMapping && branchMapping[cleanedOrigin]) {
                targetBranchId = branchMapping[cleanedOrigin];
              } else {
                const matchedB = branches.find(
                  (b) =>
                    !b.isDeleted &&
                    (b.id.toLowerCase().trim() === cleanedOrigin ||
                      (b.branchCode && b.branchCode.toLowerCase().trim() === cleanedOrigin) ||
                      b.name.toLowerCase().trim() === cleanedOrigin)
                );
                if (matchedB) {
                  targetBranchId = matchedB.id;
                }
              }
            }
            const existingIdx = nextBranchStock.findIndex(
              (bs) => bs.productId === item.id && bs.branchId === targetBranchId
            );
            if (existingIdx !== -1) {
              nextBranchStock[existingIdx] = {
                ...nextBranchStock[existingIdx],
                quantity: item.stockQuantity,
                updatedAt: nowIso,
                version: (Number(nextBranchStock[existingIdx].version) || 0) + 1,
              };
            } else {
              nextBranchStock.push({
                id: `${targetBranchId}_${item.id}`,
                branchId: targetBranchId,
                productId: item.id,
                quantity: item.stockQuantity,
                updatedAt: nowIso,
                version: 1,
              });
            }
          }
        });
        setBranchStock(nextBranchStock);

        const importedDamageLogs: DamageLog[] = [];
        sanitized.forEach((item) => {
          const isDamage =
            (item.category || "").toUpperCase() === "DAMAGES" ||
            (item.productName || "").toUpperCase().includes("DAMAGE") ||
            (item.category || "").toUpperCase().includes("DAMAGE");
          if (isDamage && item.stockQuantity > 0) {
            let targetBranchId =
              (branchMapping && branchMapping["default"]) ||
              currentUser?.branchAssignmentId ||
              fallbackBranchId;
            let targetBranchName =
              branches.find((b) => b.id === targetBranchId)?.name ||
              branches[0]?.name ||
              "Main Branch";
            if (item.origin) {
              const cleanedOrigin = item.origin.toLowerCase().trim();
              if (branchMapping && branchMapping[cleanedOrigin]) {
                targetBranchId = branchMapping[cleanedOrigin];
              } else {
                const matchedB = branches.find(
                  (b) =>
                    !b.isDeleted &&
                    (b.id.toLowerCase().trim() === cleanedOrigin ||
                      (b.branchCode && b.branchCode.toLowerCase().trim() === cleanedOrigin) ||
                      b.name.toLowerCase().trim() === cleanedOrigin)
                );
                if (matchedB) {
                  targetBranchId = matchedB.id;
                  targetBranchName = matchedB.name;
                }
              }
            } else {
              const matchedB = branches.find((b) => b.id === targetBranchId);
              if (matchedB) {
                targetBranchName = matchedB.name;
              }
            }

            const uom = (item.unit || "").toUpperCase();
            const unitType =
              uom === "BOX" || uom === "BOXES" || uom === "PALLET" || uom === "CARTON"
                ? "Box"
                : "Piece";

            let cat = "Warehouse Breakage";
            if ((item.productName || "").toUpperCase().includes("BOA")) {
              cat = "BOA";
            } else if (
              (item.productName || "").toUpperCase().includes("TRANSIT") ||
              (item.productName || "").toUpperCase().includes("DELIVERY")
            ) {
              cat = "Breakage in Transit";
            } else if (
              (item.productName || "").toUpperCase().includes("FACTORY") ||
              (item.productName || "").toUpperCase().includes("DEFECT")
            ) {
              cat = "Factory Defect";
            } else if ((item.productName || "").toUpperCase().includes("DISPLAY")) {
              cat = "Display Sample Wear";
            }

            let action = "Written Off (Scrapped)";
            if (cat === "Factory Defect") {
              action = "Supplier Return / Claim";
            } else if (cat === "Display Sample Wear") {
              action = "Discounted Clearance Sale";
            }

            importedDamageLogs.push({
              id: `DMG-IMP-${Date.now()}-${item.id}`,
              productId: item.id,
              productName: item.productName,
              productSku: item.sku,
              branchId: targetBranchId,
              branchName: targetBranchName,
              quantity: item.stockQuantity,
              unitType,
              category: cat,
              actionTaken: action,
              notes: `Legacy stock damage imported from ERP file.`,
              reportedBy: currentUser?.fullName || "Admin",
              reportedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              isDeleted: false,
            });
          }
        });

        if (importedDamageLogs.length > 0) {
          setDamageLogs((prev) => {
            const existingIds = new Set(prev.map((l) => l.id));
            const filteredNew = importedDamageLogs.filter((l) => !existingIds.has(l.id));
            return [...filteredNew, ...prev];
          });
        }

        addAuditLog(
          "PRODUCT_BULK_IMPORT",
          `Bulk-imported ${sanitized.length} products successfully`,
          "Products",
          "BULK"
        );

        safeLocalStorageSetItem("tp_products", JSON.stringify(nextProducts));
        volatileCache.current["tp_products"] = JSON.stringify(nextProducts);

        safeLocalStorageSetItem("tp_branch_stock", JSON.stringify(nextBranchStock));
        volatileCache.current["tp_branch_stock"] = JSON.stringify(nextBranchStock);

        const currentDamage = JSON.parse(localStorage.getItem("tp_damage_logs") || "[]");

        // Prepare materialized inventory records matching products table
        const inventoryRecords = nextProducts.map((prod) => ({
          id: prod.id,
          productId: prod.id,
          product_sku: prod.sku || prod.productCode,
          category_id: prod.category || "General",
          productCode: prod.productCode,
          productName: prod.productName,
          category: prod.category,
          brand: prod.brand,
          sku: prod.sku,
          barcode: prod.barcode,
          unit: prod.unit,
          stockQuantity: prod.stockQuantity,
          costPrice: prod.costPrice,
          sellingPrice: prod.sellingPrice,
          lowStockThreshold: prod.minimumStock || 10,
          supplierId: prod.supplierId || null,
          origin: prod.origin || null,
          version: prod.version || 1,
          isDeleted: prod.isDeleted ? 1 : 0,
        }));

        (async () => {
          try {
            const res = await safeApiFetch("/api/db/bulk", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders(),
              },
              body: JSON.stringify({
                data: {
                  tp_products: nextProducts,
                  tp_inventory: inventoryRecords,
                  tp_branch_stock: nextBranchStock,
                  tp_damage_logs: currentDamage,
                },
              }),
            });
            if (res.ok) {
              console.log("[Bulk Import Sync] Successfully flushed imported products and inventory to central server.");
            } else {
              const body = await res.json().catch(() => ({}));
              console.warn("[Bulk Import Sync] Server returned status", res.status, body);
            }
          } catch (err) {
            console.warn("[Bulk Import Sync] Failed to post bulk sync to server:", err);
          }
        })();
        return { success: true, count: sanitized.length };
      } catch (e: any) {
        return {
          success: false,
          count: 0,
          error: e?.message || "Error occurred during parsing.",
        };
      }
    },
    [
      products,
      branchStock,
      branches,
      currentUser,
      setDamageLogs,
      addAuditLog,
      volatileCache,
      safeApiFetch,
      getAuthHeaders,
    ]
  );

  // --- STOCK SELECTORS & CALCULATIONS ---
  const getBranchStockQuantityContext = useCallback(
    (productId: string, targetBranchId?: string): number => {
      const bId = targetBranchId || currentUser?.branchAssignmentId || "B1";
      const cacheKey = `bs:${bId}:${productId}`;
      const cached = optimisticStockCacheRef.current.get(cacheKey);
      const now = Date.now();
      if (cached && now - cached.lastSaleCommitTime < 60000) {
        return cached.quantity;
      }
      const prod = products.find((p) => p.id === productId);
      return getBranchStockQuantity(prod, bId, branchStock, branches);
    },
    [branchStock, products, branches, currentUser?.branchAssignmentId]
  );

  const getProductStockCountContext = useCallback(
    (productId: string): number => {
      const cacheKey = `prod:${productId}`;
      const cached = optimisticStockCacheRef.current.get(cacheKey);
      const now = Date.now();
      if (cached && now - cached.lastSaleCommitTime < 60000) {
        return cached.quantity;
      }
      const prod = products.find((p) => p.id === productId);
      return prod ? prod.stockQuantity : 0;
    },
    [products]
  );

  const branchStockStatsSelector = useMemo(() => {
    const statsCache = new Map<string, BranchStockStats>();

    return (selectedBranchId?: string): BranchStockStats => {
      const targetBranchId =
        selectedBranchId || currentUser?.branchAssignmentId || "consolidated";
      const key = (targetBranchId || "consolidated").trim().toLowerCase();

      const existing = statsCache.get(key);
      if (existing) {
        return existing;
      }

      const isConsolidated =
        !targetBranchId ||
        targetBranchId === "consolidated" ||
        targetBranchId === "all" ||
        targetBranchId === "ALL";

      const activeBranchProducts = products.filter(
        (p) => !p.isDeleted && isProductInBranch(p, targetBranchId, branchStock, branches)
      );

      let totalItems = 0;
      let totalValue = 0;
      let lowStockCount = 0;
      let criticalCount = 0;
      let outOfStockCount = 0;

      const lowStockProducts: Product[] = [];
      const criticalProducts: Product[] = [];
      const outOfStockProducts: Product[] = [];

      activeBranchProducts.forEach((p) => {
        const qty = getBranchStockQuantity(p, targetBranchId, branchStock, branches);
        const bsRec = getBranchStockRecord(p, targetBranchId, branchStock, branches);
        const threshold =
          !isConsolidated && bsRec?.lowStockThresholdOverride !== undefined
            ? bsRec.lowStockThresholdOverride
            : (p.minimumStock ?? p.lowStockThreshold ?? 10);

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
          outOfStockProducts.push(p);
        } else {
          if (qty <= threshold) {
            lowStockCount++;
            lowStockProducts.push(p);
          }
          if (qty <= threshold * 0.5) {
            criticalCount++;
            criticalProducts.push(p);
          }
        }
      });

      const calculatedStats: BranchStockStats = {
        totalItems,
        totalProducts: activeBranchProducts.length,
        totalValue,
        lowStockCount,
        criticalCount,
        outOfStockCount,
        lowStockProducts,
        criticalProducts,
        outOfStockProducts,
      };

      statsCache.set(key, calculatedStats);
      return calculatedStats;
    };
  }, [products, branchStock, branches, currentUser?.branchAssignmentId]);

  const getBranchStockStats = useCallback(
    (selectedBranchId?: string): BranchStockStats => {
      return branchStockStatsSelector(selectedBranchId);
    },
    [branchStockStatsSelector]
  );

  const filterBranchStockByBranch = useCallback(
    (selectedBranchId?: string): InventoryLocationStock[] => {
      const isConsolidated =
        !selectedBranchId ||
        selectedBranchId === "consolidated" ||
        selectedBranchId === "all" ||
        selectedBranchId === "ALL";
      if (isConsolidated) {
        return branchStock;
      }
      const targetBranch = branches.find((b) => b.id === selectedBranchId);
      const uSlug = slugifyBranchStr(selectedBranchId);
      const uNameSlug = slugifyBranchStr(targetBranch?.name);
      const uCodeSlug = slugifyBranchStr(targetBranch?.branchCode);

      return branchStock.filter((bs) => {
        if (bs.branchId === selectedBranchId) return true;
        const bsSlug = slugifyBranchStr(bs.branchId);
        if (bsSlug === uSlug) return true;
        if (uNameSlug && bsSlug === uNameSlug) return true;
        if (uCodeSlug && bsSlug === uCodeSlug) return true;
        return false;
      });
    },
    [branchStock, branches]
  );

  const getInventoryContext = useCallback(
    (productId: string, targetBranchId?: string) => {
      const bId = targetBranchId || currentUser?.branchAssignmentId || "B1";
      const bsKey = `bs:${bId}:${productId}`;
      const prodKey = `prod:${productId}`;
      const bsCached = optimisticStockCacheRef.current.get(bsKey);
      const prodCached = optimisticStockCacheRef.current.get(prodKey);
      const now = Date.now();

      const isBsOptimistic = !!(bsCached && now - bsCached.lastSaleCommitTime < 60000);
      const isProdOptimistic = !!(prodCached && now - prodCached.lastSaleCommitTime < 60000);

      const branchQty = isBsOptimistic
        ? bsCached!.quantity
        : getBranchStockQuantityContext(productId, bId);
      const stockQuantity = isProdOptimistic
        ? prodCached!.quantity
        : getProductStockCountContext(productId);

      return {
        stockQuantity,
        branchQuantity: branchQty,
        isOptimistic: isBsOptimistic || isProdOptimistic,
      };
    },
    [currentUser?.branchAssignmentId, getBranchStockQuantityContext, getProductStockCountContext]
  );

  const revalidateStockCounts = useCallback(
    async (
      affectedItems?: { productId: string; branchId?: string; quantityDelta?: number }[]
    ) => {
      console.log("[Inventory Cache] Force-revalidating stock counts post-sale commit...", affectedItems);
      const now = Date.now();
      const nowIso = new Date().toISOString();
      const userBranchId = currentUser?.branchAssignmentId || "B1";

      if (affectedItems && affectedItems.length > 0) {
        affectedItems.forEach(({ productId, branchId: bId, quantityDelta }) => {
          const targetBranchId = bId || userBranchId;

          setBranchStock((prevList) => {
            const nextList = [...prevList];
            const matchIdx = nextList.findIndex(
              (bs) => bs.productId === productId && bs.branchId === targetBranchId
            );
            if (matchIdx !== -1) {
              const currentQty = nextList[matchIdx].quantity;
              const newQty =
                quantityDelta !== undefined ? Math.max(0, currentQty + quantityDelta) : currentQty;
              const newVer = (nextList[matchIdx].version || 0) + 1;
              nextList[matchIdx] = {
                ...nextList[matchIdx],
                quantity: newQty,
                version: newVer,
                updatedAt: nowIso,
              };
              optimisticStockCacheRef.current.set(`bs:${targetBranchId}:${productId}`, {
                productId,
                branchId: targetBranchId,
                quantity: newQty,
                version: newVer,
                updatedAt: nowIso,
                lastSaleCommitTime: now,
              });
            }
            return nextList;
          });

          setProducts((prev) => {
            const updated = [...prev];
            const prodIdx = updated.findIndex((p) => p.id === productId);
            if (prodIdx !== -1) {
              const currentQty = updated[prodIdx].stockQuantity;
              const newQty =
                quantityDelta !== undefined ? Math.max(0, currentQty + quantityDelta) : currentQty;
              const newVer = (updated[prodIdx].version || 0) + 1;
              updated[prodIdx] = {
                ...updated[prodIdx],
                stockQuantity: newQty,
                version: newVer,
                updatedAt: nowIso,
              };
              optimisticStockCacheRef.current.set(`prod:${productId}`, {
                productId,
                quantity: newQty,
                version: newVer,
                updatedAt: nowIso,
                lastSaleCommitTime: now,
              });
            }
            return updated;
          });
        });
      }
    },
    [currentUser?.branchAssignmentId]
  );

  return {
    products,
    setProducts,
    branchStock,
    setBranchStock,
    optimisticStockCacheRef,
    createProduct,
    updateProduct,
    deleteProduct,
    bulkDeleteProducts,
    restoreProduct,
    updateBranchProductPrice,
    updateBranchLowStockThreshold,
    importProducts,
    getBranchStockQuantityContext,
    getProductStockCountContext,
    getBranchStockStats,
    filterBranchStockByBranch,
    getInventoryContext,
    revalidateStockCounts,
  };
}
