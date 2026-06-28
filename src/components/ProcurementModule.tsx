/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useDb } from "../context/DbContext";
import { PurchaseOrder, UserRole } from "../types/db";
import {
  FileText,
  Truck,
  Plus,
  X,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Building2,
  Mail,
  Phone,
  Users,
  Edit2,
  Trash2,
  Package,
  Tag,
  Printer,
  Download,
  Settings2,
  ChevronRight,
} from "lucide-react";

interface ProcurementModuleProps {
  darkMode: boolean;
  defaultTab?: "po" | "suppliers";
}

export const ProcurementModule: React.FC<ProcurementModuleProps> = ({
  darkMode,
  defaultTab = "po",
}) => {
  const {
    purchaseOrders,
    poItems,
    products,
    suppliers,
    brands,
    branches,
    createPO,
    updatePOStatus,
    receivePOItems,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    createBrand,
    updateBrand,
    deleteBrand,
    createProduct,
    currentUser,
    customBills,
    setCustomBills,
    addAuditLog,
    isRowClearingBlocked,
    getRowClearingBlockedReason,
  } = useDb();

  // Active submodule tab selection
  const [activeSubTab, setActiveSubTab] = useState<
    "po" | "suppliers" | "brands" | "consolidation"
  >(defaultTab as any);
  const [poFilterTab, setPoFilterTab] = useState<
    "all" | "pending" | "outsourcing"
  >("all");

  const [isConfirmingConsolidation, setIsConfirmingConsolidation] =
    useState(false);
  const [procurementProductSearch, setProcurementProductSearch] = useState("");
  const [showProcurementProductDropdown, setShowProcurementProductDropdown] =
    useState(false);

  // Core Alignment States for Automated Calendar Scheduling
  const [paymentFrequency, setPaymentFrequency] = useState<
    "WEEKLY" | "MONTHLY" | "SEMI_QUARTERLY" | "QUARTERLY" | "YEARLY"
  >("MONTHLY");
  const [payoutDueDate, setPayoutDueDate] = useState("2026-07-15");

  React.useEffect(() => {
    if (currentUser.role !== UserRole.ADMIN && activeSubTab === "suppliers") {
      setActiveSubTab("po");
    }
  }, [currentUser.role, activeSubTab]);

  React.useEffect(() => {
    try {
      const cached = localStorage.getItem("tp_po_cart");
      if (cached) {
        setPoCart(JSON.parse(cached));
      } else {
        setPoCart([]);
      }
    } catch (e) {
      console.error(e);
    }
  }, [activeSubTab]);

  // Template state
  const [poTemplates, setPoTemplates] = useState<
    {
      id: string;
      name: string;
      supplierId: string;
      branchId: string;
      items: {
        productId: string;
        costPrice: number;
        quantityRequested: number;
      }[];
      notes?: string;
    }[]
  >(() => {
    try {
      const cached = localStorage.getItem("tp_po_templates");
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [templateNameInput, setTemplateNameInput] = useState("");

  // Dialog configurations
  const [showPOModal, setShowPOModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);

  // Brand form states
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState("");
  const [brandSupplierId, setBrandSupplierId] = useState("S1");
  const [brandDescription, setBrandDescription] = useState("");

  // Requisitions Cart State
  const [poCart, setPoCart] = useState<
    {
      productId: string;
      quantity: number;
      notes?: string;
      requestedByBranchId?: string;
    }[]
  >(() => {
    try {
      const cached = localStorage.getItem("tp_po_cart");
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });

  const syncPoCart = (newCart: any[]) => {
    setPoCart(newCart);
    localStorage.setItem("tp_po_cart", JSON.stringify(newCart));
    window.dispatchEvent(new Event("tp_po_cart_updated"));
  };

  useEffect(() => {
    const handleCartSync = () => {
      try {
        const cached = localStorage.getItem("tp_po_cart");
        setPoCart(cached ? JSON.parse(cached) : []);
      } catch (e) {
        // Safe fallback
      }
    };
    window.addEventListener("tp_po_cart_updated", handleCartSync);
    return () => {
      window.removeEventListener("tp_po_cart_updated", handleCartSync);
    };
  }, []);

  const [selectedConsolidationBranchId, setSelectedConsolidationBranchId] =
    useState(() => {
      if (typeof window !== "undefined") {
        const activeBranchId = localStorage.getItem("tp_active_branch_id");
        if (activeBranchId && activeBranchId !== "all") return activeBranchId;
      }
      return currentUser.branchAssignmentId || branches[0]?.id || "B1";
    });

  const handleConsolidateOrders = (
    forcedStatus?: "Pending" | "Approved" | "Draft",
  ) => {
    if (poCart.length === 0) {
      showToast("Compilation Error: The restock queue is currently empty.");
      return;
    }

    const supplierGroups: Record<string, typeof poCart> = {};

    poCart.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) return;

      const brandMatch = brands.find(
        (b) =>
          b.name.toLowerCase().trim() === prod.brand?.toLowerCase().trim() &&
          !b.isDeleted,
      );

      const supplierId = brandMatch ? brandMatch.supplierId : "S1";

      if (!supplierGroups[supplierId]) {
        supplierGroups[supplierId] = [];
      }
      supplierGroups[supplierId].push(item);
    });

    let poCreatedCount = 0;
    const targetStatus = forcedStatus || "Pending";

    let updatedBillsList = [...customBills];

    Object.entries(supplierGroups).forEach(([supId, itemsInGroup]) => {
      const draftItemsInput = itemsInGroup.map((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const costPrice = prod ? prod.costPrice : 300;
        return {
          productId: item.productId,
          costPrice,
          quantityRequested: item.quantity,
        };
      });

      const totalOrderAmount = draftItemsInput.reduce(
        (sum, item) => sum + item.costPrice * item.quantityRequested,
        0,
      );
      const brandsInGroup = Array.from(
        new Set(
          itemsInGroup
            .map((item) => {
              const prod = products.find((p) => p.id === item.productId);
              return prod ? prod.brand : "";
            })
            .filter(Boolean),
        ),
      ).join(", ");

      const notes = `Auto-Consolidated Purchase Order. Grouped brands: ${brandsInGroup || "N/A"}. Compiled via Automated Sourcing Deck.`;

      createPO(
        supId,
        selectedConsolidationBranchId,
        draftItemsInput,
        notes,
        targetStatus as any,
      );

      if (targetStatus === "Approved") {
        const supRecord = suppliers.find((s) => s.id === supId);
        const linkedBillId =
          "BILL-PO-AUTO-" + Date.now() + "-" + Math.floor(Math.random() * 100);

        const newCreditEntry = {
          id: linkedBillId,
          title: `[Auto PO Liability] ${supRecord ? supRecord.name : "Supplier"} Bulk restock`,
          totalAmount: totalOrderAmount,
          frequency: paymentFrequency,
          nextDueDate: new Date(payoutDueDate).toISOString(),
          status: "ACTIVE" as const,
        };

        updatedBillsList.push(newCreditEntry);

        addAuditLog(
          "PO_CREDIT_SYNC_AUTO",
          `Auto-dispatched accounts payable credit voucher for ${supRecord ? supRecord.name : supId} via Consolidation Desk. Amount: ₱${totalOrderAmount.toLocaleString()}`,
          "PurchaseOrders",
          linkedBillId,
        );
      }

      poCreatedCount++;
    });

    if (poCreatedCount > 0) {
      if (targetStatus === "Approved") {
        setCustomBills(updatedBillsList);
        localStorage.setItem(
          "atpos_v2_custom_bills",
          JSON.stringify(updatedBillsList),
        );
      }

      syncPoCart([]);
      setIsConfirmingConsolidation(false);
      setActiveSubTab("po");
      if (targetStatus === "Approved") {
        setPoFilterTab("outsourcing");
        showToast(
          `Success: Synthesized ${poCreatedCount} auto-consolidated Purchase Orders dispatched direct to supplier Outsourcing Deck!`,
        );
      } else {
        setPoFilterTab("pending");
        showToast(
          `Success: Synthesized ${poCreatedCount} auto-consolidated Purchase Order Drafts queued in Pending deck!`,
        );
      }
    } else {
      showToast(
        "Sourcing Error: Could not compile any valid purchase order drafts.",
      );
    }
  };

  // Supplier forms editing/creation state
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(
    null,
  );
  const [supName, setSupName] = useState("");
  const [supContactPerson, setSupContactPerson] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supEmail, setSupEmail] = useState("");
  const [supAddress, setSupAddress] = useState("");

  // Draft building state
  const [selectedSupplierId, setSelectedSupplierId] = useState("S1");
  const [selectedBranchId, setSelectedBranchId] = useState("B1");
  const [poNotes, setPoNotes] = useState("");
  const [draftItems, setDraftItems] = useState<
    { productId: string; costPrice: number; quantityRequested: number }[]
  >([]);

  // Item selector helpers
  const [selectedProdId, setSelectedProdId] = useState("");
  const [qtyRequestedInput, setQtyRequestedInput] = useState("100");

  // Inline Manual Add Item for PO
  const [showManualItemForm, setShowManualItemForm] = useState(false);
  const [manualProdName, setManualProdName] = useState("");
  const [manualCategory, setManualCategory] = useState("Ceramic Tiles");
  const [manualBrand, setManualBrand] = useState("");
  const [manualSize, setManualSize] = useState("60x60 cm");
  const [manualCostPrice, setManualCostPrice] = useState("300");
  const [manualSellingPrice, setManualSellingPrice] = useState("450");
  const [manualQtyRequested, setManualQtyRequested] = useState("100");
  const [manualOrigin, setManualOrigin] = useState("");

  // Receiving state
  const [activePo, setActivePo] = useState<PurchaseOrder | null>(null);
  const [receiveQuantities, setReceiveQuantities] = useState<
    Record<string, number>
  >({}); // productId -> newlyReceived

  // Alignment Tracking state
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedPoForExport, setSelectedPoForExport] =
    useState<PurchaseOrder | null>(null);

  // Drilldown / detail views requested by the user
  const [selectedPoDetails, setSelectedPoDetails] =
    useState<PurchaseOrder | null>(null);
  const [selectedSupplierCatalog, setSelectedSupplierCatalog] = useState<
    any | null
  >(null);

  const companyName =
    localStorage.getItem("tilepoint_company_name_v1") || "Emman Tile Center";
  const companyLogo = localStorage.getItem("tilepoint_store_logo_v1") || "";
  const taxRate = Number(localStorage.getItem("tilepoint_tax_rate_v1")) || 12;
  const currencySymbol = localStorage.getItem("tilepoint_currency_v1") || "₱";

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const allowedToModify =
    currentUser.role === UserRole.ADMIN ||
    currentUser.role === UserRole.MANAGER;

  // Supplier handlers
  const handleOpenAddSupplier = () => {
    setEditingSupplierId(null);
    setSupName("");
    setSupContactPerson("");
    setSupPhone("");
    setSupEmail("");
    setSupAddress("");
    setShowSupplierModal(true);
  };

  const handleOpenEditSupplier = (sup: any) => {
    setEditingSupplierId(sup.id);
    setSupName(sup.name);
    setSupContactPerson(sup.contactPerson || "");
    setSupPhone(sup.phone || "");
    setSupEmail(sup.email || "");
    setSupAddress(sup.address || "");
    setShowSupplierModal(true);
  };

  const handleSaveSupplier = () => {
    if (!supName.trim()) {
      showToast("Validation Error: Supplier Company Name is required.");
      return;
    }
    const supData = {
      name: supName.trim(),
      contactPerson: supContactPerson.trim(),
      phone: supPhone.trim(),
      email: supEmail.trim(),
      address: supAddress.trim(),
    };

    if (editingSupplierId) {
      updateSupplier(editingSupplierId, supData);
      showToast(`Supplier "${supName.trim()}" updated successfully.`);
    } else {
      createSupplier(supData);
      showToast(`Supplier "${supName.trim()}" registered to the database.`);
    }
    setShowSupplierModal(false);
  };

  const handleDeleteSupplier = (id: string, name: string) => {
    if (isRowClearingBlocked()) {
      alert(`[System Guard] Action Blocked: Cannot clear or remove supplier records because the register is currently holding: ${getRowClearingBlockedReason()}`);
      return;
    }
    if (
      confirm(
        `Are you absolutely sure you want to remove supplier "${name}"? Existing purchase orders and catalog records will be kept.`,
      )
    ) {
      deleteSupplier(id);
      showToast(`Supplier "${name}" was soft-deleted.`);
    }
  };

  // Brand handlers
  const handleOpenAddBrand = () => {
    setEditingBrandId(null);
    setBrandName("");
    const firstSupplier = suppliers.filter((s) => !s.isDeleted)[0]?.id || "S1";
    setBrandSupplierId(firstSupplier);
    setBrandDescription("");
    setShowBrandModal(true);
  };

  const handleOpenEditBrand = (b: any) => {
    setEditingBrandId(b.id);
    setBrandName(b.name);
    setBrandSupplierId(b.supplierId);
    setBrandDescription(b.description || "");
    setShowBrandModal(true);
  };

  const handleSaveBrand = () => {
    if (!brandName.trim()) {
      showToast("Validation Error: Brand Name is required.");
      return;
    }
    const brandData = {
      name: brandName.trim(),
      supplierId: brandSupplierId,
      description: brandDescription.trim(),
    };

    if (editingBrandId) {
      updateBrand(editingBrandId, brandData);
      showToast(`Brand "${brandName.trim()}" updated successfully.`);
    } else {
      createBrand(brandData);
      showToast(
        `Brand "${brandName.trim()}" registered under associated supplier.`,
      );
    }
    setShowBrandModal(false);
  };

  const handleDeleteBrand = (id: string, name: string) => {
    if (isRowClearingBlocked()) {
      alert(`[System Guard] Action Blocked: Cannot clear or remove brand records because the register is currently holding: ${getRowClearingBlockedReason()}`);
      return;
    }
    if (
      confirm(`Are you sure you want to remove brand partnership "${name}"?`)
    ) {
      deleteBrand(id);
      showToast(`Brand "${name}" was soft-deleted.`);
    }
  };

  // Render lists
  const activeProductsForSupplier = products.filter((p) => !p.isDeleted);

  const getSuplierName = (id: string) => {
    const s = suppliers.find((sup) => sup.id === id);
    return s ? s.name : "Unknown Supplier";
  };

  const getBranchName = (id: string) => {
    const b = branches.find((br) => br.id === id);
    return b ? b.name : "Unknown Branch";
  };

  const getProductName = (id: string) => {
    const p = products.find((prod) => prod.id === id);
    return p ? p.productName : "Generic Item";
  };

  // Draft mechanics
  const addDraftItem = () => {
    if (!selectedProdId) {
      showToast("Action Missing: Please select a product first.");
      return;
    }
    const targetProd = products.find((p) => p.id === selectedProdId);
    if (!targetProd) return;

    const requested = Number(qtyRequestedInput) || 0;
    if (requested <= 0) {
      showToast("Quantity Error: Input volume must be greater than zero.");
      return;
    }

    if (draftItems.some((i) => i.productId === selectedProdId)) {
      showToast(
        "Redundant SKU: This item has already been added to the requisition sheet.",
      );
      return;
    }

    setDraftItems((prev) => [
      ...prev,
      {
        productId: selectedProdId,
        costPrice: targetProd.costPrice,
        quantityRequested: requested,
      },
    ]);

    setSelectedProdId("");
    setQtyRequestedInput("100");
    showToast(`Drafted item: ${targetProd.productName}.`);
  };

  const removeDraftItem = (id: string) => {
    const pName = getProductName(id);
    setDraftItems((prev) => prev.filter((item) => item.productId !== id));
    showToast(`Removed ${pName} from draft list.`);
  };

  const handleRegisterAndAddManualItem = () => {
    if (!manualProdName.trim()) {
      showToast(
        "Validation Error: Product Name is required for manual addition.",
      );
      return;
    }

    const cost = Number(manualCostPrice) || 0;
    const sell = 0;
    const qty = Number(manualQtyRequested) || 0;

    if (qty <= 0) {
      showToast("Quantity Error: Ordered quantity must be greater than zero.");
      return;
    }

    const generatedCode = `TL-PR-M${Date.now().toString().slice(-4)}`;
    const generatedSku = `SKU-TPL-M${Math.floor(Math.random() * 10000)}`;
    const generatedBarcode = `480${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    const newProdPayload = {
      productCode: generatedCode,
      sku: generatedSku,
      barcode: generatedBarcode,
      designName: "Manual Entry Lot",
      productName: manualProdName.trim(),
      category: manualCategory,
      brand: manualBrand.trim() || "Generic/Manual Importer",
      supplierId: selectedSupplierId,
      unit: "Box",
      size: manualSize,
      boxQuantity: 4,
      coveragePerBox: 1.44,
      image: "",
      costPrice: cost,
      sellingPrice: sell,
      stockQuantity: 0,
      minimumStock: 20,
      origin: manualOrigin.trim(),
    };

    try {
      const created = createProduct(newProdPayload);

      setDraftItems((prev) => [
        ...prev,
        {
          productId: created.id,
          costPrice: cost,
          quantityRequested: qty,
        },
      ]);

      setManualProdName("");
      setManualBrand("");
      setManualCostPrice("300");
      setManualSellingPrice("450");
      setManualQtyRequested("100");
      setManualOrigin("");
      setShowManualItemForm(false);
      showToast(
        `Registered "${newProdPayload.productName}" and added to draft Requisition list.`,
      );
    } catch (err) {
      console.error(err);
      showToast("Process Error: Failsafe product instantiation crashed.");
    }
  };

  const handleSavePO = () => {
    if (draftItems.length === 0) {
      showToast("Blank Order: Requisition catalog list cannot be empty.");
      return;
    }

    const supRecord = suppliers.find((s) => s.id === selectedSupplierId);
    if (!supRecord) return;

    const totalOrderAmount = draftItems.reduce(
      (sum, item) => sum + item.costPrice * item.quantityRequested,
      0,
    );

    createPO(selectedSupplierId, selectedBranchId, draftItems, poNotes);

    const linkedBillId = "BILL-PO-DIRECT-" + Date.now();
    const newCreditEntry = {
      id: linkedBillId,
      title: `[PO Liability] ${supRecord.name} Manual Request`,
      totalAmount: totalOrderAmount,
      frequency: paymentFrequency,
      nextDueDate: new Date(payoutDueDate).toISOString(),
      status: "ACTIVE" as const,
    };

    const nextBills = [...customBills, newCreditEntry];
    setCustomBills(nextBills);
    localStorage.setItem("atpos_v2_custom_bills", JSON.stringify(nextBills));

    addAuditLog(
      "PO_CREDIT_SYNC",
      `Auto-dispatched accounts payable credit voucher for ${supRecord.name}. Amount: ₱${totalOrderAmount.toLocaleString()} aligned to schedule: ${paymentFrequency}`,
      "PurchaseOrders",
      linkedBillId,
    );

    setDraftItems([]);
    setPoNotes("");
    setShowPOModal(false);
    showToast(
      `PO compiled successfully! ₱${totalOrderAmount.toLocaleString()} liability auto-projected onto the Payment Calendar.`,
    );
  };

  // Open cargo receipts
  const handleOpenReceive = (po: PurchaseOrder) => {
    setActivePo(po);
    const relatedItems = poItems.filter((item) => item.poId === po.id);

    const quantities: Record<string, number> = {};
    relatedItems.forEach((it) => {
      const pendingQty = Math.max(
        0,
        it.quantityRequested - it.quantityReceived,
      );
      quantities[it.productId] = pendingQty;
    });

    setReceiveQuantities(quantities);
    setShowReceiveModal(true);
  };

  const submitCargoReceived = () => {
    if (!activePo) return;

    let totalReceived = 0;
    Object.values(receiveQuantities).forEach((v) => {
      totalReceived += Number(v) || 0;
    });

    if (totalReceived <= 0) {
      showToast("Quantity Error: Newly received volume must exceed zero.");
      return;
    }

    receivePOItems(activePo.id, receiveQuantities);
    setShowReceiveModal(false);
    showToast("Logistics Logged: Inventory stocks updated automatically.");
  };

  return (
    <div className="space-y-6 animate-fade-in text-m3-on-surface">
      {/* Top action trigger bar */}
      <div className="flex justify-between items-center bg-m3-surface-low/95 backdrop-blur-md p-4 rounded-[20px] border border-m3-outline-variant/20 sticky top-0 z-20 shadow-md">
        <div>
          <h3 className="text-xs font-black tracking-widest text-m3-primary uppercase font-mono">
            {activeSubTab === "po"
              ? "Supply Logistics Ledger"
              : activeSubTab === "suppliers"
                ? "Supplier Registry Management"
                : activeSubTab === "brands"
                  ? "Manufacturer Brands Directory"
                  : "Automated PO Consolidation Desk"}
          </h3>
          <p className="text-xs text-m3-on-surface-variant/80 mt-0.5">
            {activeSubTab === "po"
              ? "Procurement pipelines & delivery tracking"
              : activeSubTab === "suppliers"
                ? "Corporate manufacturer broker profiles database"
                : activeSubTab === "brands"
                  ? "Configure manufacturer-to-supplier mappings"
                  : "Pre-restock compilation worksheets & bulk compiler"}
          </p>
        </div>

        {allowedToModify && (
          <div>
            {activeSubTab === "po" || activeSubTab === "consolidation" ? (
              <button
                onClick={() => {
                  setSelectedSupplierId(
                    suppliers.filter((s) => !s.isDeleted)[0]?.id || "S1",
                  );
                  setSelectedBranchId(currentUser.branchAssignmentId || "B1");
                  setDraftItems([]);
                  setShowPOModal(true);
                }}
                className="m3-btn-primary flex items-center gap-1.5 cursor-pointer shadow-sm text-xs shrink-0"
              >
                <Plus className="h-4 w-4" /> Requisition PO
              </button>
            ) : activeSubTab === "suppliers" ? (
              <button
                onClick={handleOpenAddSupplier}
                className="m3-btn-primary flex items-center gap-1.5 cursor-pointer shadow-sm text-xs shrink-0"
              >
                <Plus className="h-4 w-4" /> Register Supplier
              </button>
            ) : (
              <button
                onClick={handleOpenAddBrand}
                className="m3-btn-primary flex items-center gap-1.5 cursor-pointer shadow-sm text-xs shrink-0"
              >
                <Plus className="h-4 w-4" /> Register Sourced Brand
              </button>
            )}
          </div>
        )}
      </div>

      {/* Submodule Level Navigation Tabs */}
      <div className="flex flex-wrap gap-1 md:gap-2 border-b border-m3-outline-variant/20 pb-px items-center sticky top-0 bg-m3-surface/90 backdrop-blur-md z-30 pt-2 pb-2 rounded-b-xl px-2 shadow-sm mb-4">
        <button
          onClick={() => {
            setActiveSubTab("po");
            setIsConfirmingConsolidation(false);
          }}
          className={`flex items-center gap-2 py-3 px-4 md:px-5 text-xs font-black uppercase tracking-wider transition-all duration-200 border-b-2 hover:bg-m3-surface-low rounded-t-xl ${
            activeSubTab === "po"
              ? "border-m3-primary text-m3-primary scale-102 font-bold"
              : "border-transparent text-m3-on-surface-variant"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Requisitions (PO)</span>
        </button>
        {currentUser.role === UserRole.ADMIN && (
          <button
            onClick={() => {
              setActiveSubTab("suppliers");
              setIsConfirmingConsolidation(false);
            }}
            className={`flex items-center gap-2 py-3 px-4 md:px-5 text-xs font-black uppercase tracking-wider transition-all duration-200 border-b-2 hover:bg-m3-surface-low rounded-t-xl ${
              activeSubTab === "suppliers"
                ? "border-m3-primary text-m3-primary scale-102 font-bold"
                : "border-transparent text-m3-on-surface-variant"
            }`}
          >
            <Truck className="h-4 w-4" />
            <span>
              Enterprise Suppliers (
              {suppliers.filter((s) => !s.isDeleted).length})
            </span>
          </button>
        )}
        <button
          onClick={() => {
            setActiveSubTab("brands");
            setIsConfirmingConsolidation(false);
          }}
          className={`flex items-center gap-2 py-3 px-4 md:px-5 text-xs font-black uppercase tracking-wider transition-all duration-200 border-b-2 hover:bg-m3-surface-low rounded-t-xl ${
            activeSubTab === "brands"
              ? "border-m3-primary text-m3-primary scale-102 font-bold"
              : "border-transparent text-m3-on-surface-variant"
          }`}
        >
          <Tag className="h-4 w-4" />
          <span>
            Manufacturer Brands ({brands.filter((b) => !b.isDeleted).length})
          </span>
        </button>
        <button
          onClick={() => {
            setActiveSubTab("consolidation");
            setIsConfirmingConsolidation(false);
          }}
          className={`flex items-center gap-2 py-3 px-4 md:px-5 text-xs font-black uppercase tracking-wider transition-all duration-200 border-b-2 hover:bg-m3-surface-low rounded-t-xl ${
            activeSubTab === "consolidation"
              ? "border-m3-primary text-m3-primary scale-102 font-bold"
              : "border-transparent text-m3-on-surface-variant"
          }`}
        >
          <Settings2
            className={`h-4 w-4 ${poCart.length > 0 ? "text-emerald-500 animate-pulse" : "text-m3-on-surface-variant"}`}
          />
          <span>
            Consolidation Desk &amp; Queue{" "}
            {poCart.length > 0 ? `(${poCart.length})` : ""}
          </span>
        </button>
      </div>

      {activeSubTab === "po" ? (
        /* PO List Ledgers view */
        <div className="grid grid-cols-1 gap-6 items-start">
          {(() => {
            const pendingCount = purchaseOrders.filter(
              (po) => po.status === "Pending" || po.status === "Draft",
            ).length;
            const outsourcingCount = purchaseOrders.filter(
              (po) =>
                po.status === "Approved" ||
                po.status === "Ordered" ||
                po.status === "Partially Received",
            ).length;
            const totalCount = purchaseOrders.length;

            const filteredPurchaseOrders = purchaseOrders.filter((po) => {
              if (poFilterTab === "pending") {
                return po.status === "Pending" || po.status === "Draft";
              }
              if (poFilterTab === "outsourcing") {
                return (
                  po.status === "Approved" ||
                  po.status === "Ordered" ||
                  po.status === "Partially Received"
                );
              }
              return true;
            });

            return (
              <>
                {/* PO Sub-Ledger Filters */}
                <div className="flex flex-wrap gap-2 items-center bg-m3-surface-low/50 p-2 rounded-xl border border-m3-outline-variant/15">
                  <button
                    onClick={() => setPoFilterTab("all")}
                    className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-2 ${
                      poFilterTab === "all"
                        ? "bg-m3-primary text-m3-on-primary shadow-sm"
                        : "hover:bg-m3-surface text-m3-on-surface-variant"
                    }`}
                  >
                    <span>All Requisitions Ledger</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        poFilterTab === "all"
                          ? "bg-m3-on-primary/20 text-m3-on-primary font-black"
                          : "bg-m3-outline-variant/30 text-m3-on-surface"
                      }`}
                    >
                      {totalCount}
                    </span>
                  </button>
                  <button
                    id="po-filter-pending-btn"
                    onClick={() => setPoFilterTab("pending")}
                    className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-2 ${
                      poFilterTab === "pending"
                        ? "bg-amber-600 text-white shadow-sm"
                        : "hover:bg-m3-surface text-m3-on-surface-variant"
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Pending &amp; Drafts</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        poFilterTab === "pending"
                          ? "bg-white/20 text-white font-black"
                          : "bg-m3-outline-variant/30 text-m3-on-surface"
                      }`}
                    >
                      {pendingCount}
                    </span>
                  </button>
                  <button
                    id="po-filter-outsourcing-btn"
                    onClick={() => setPoFilterTab("outsourcing")}
                    className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-2 ${
                      poFilterTab === "outsourcing"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "hover:bg-m3-surface text-m3-on-surface-variant"
                    }`}
                  >
                    <Truck className="h-3.5 w-3.5" />
                    <span>Direct Outsourcing Deck</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        poFilterTab === "outsourcing"
                          ? "bg-white/20 text-white font-black"
                          : "bg-m3-outline-variant/30 text-m3-on-surface"
                      }`}
                    >
                      {outsourcingCount}
                    </span>
                  </button>
                </div>

                {/* Context Explanatory Banners */}
                {poFilterTab === "pending" && (
                  <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3 text-xs animate-fade-in">
                    <FileText className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-600 dark:text-amber-500 font-mono text-xs uppercase tracking-wider">
                        Pending &amp; Draft Requisitions pipeline
                      </h4>
                      <p className="text-m3-on-surface-variant/95 mt-0.5">
                        Review procurement layouts and draft purchase order
                        specifications assembled by store operators. Approving a
                        pending draft dispatches the order to the active
                        outsourcing deck, permitting receipt of carrier
                        shipments.
                      </p>
                    </div>
                  </div>
                )}

                {poFilterTab === "outsourcing" && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-start gap-3 text-xs animate-fade-in">
                    <Truck className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-emerald-600 dark:text-emerald-500 font-mono text-xs uppercase tracking-wider">
                        Enterprise Supplier Outsourcing Deck
                      </h4>
                      <p className="text-m3-on-surface-variant/95 mt-0.5">
                        This cockpit displays purchase orders actively sourced
                        and outsourced to third-party manufacturers. Track
                        logistics carrier transit statuses, print invoice
                        records, or log arriving carrier cargo to automatically
                        reconcile inventory volume.
                      </p>
                    </div>
                  </div>
                )}

                <div className="m3-card shadow-sm overflow-x-auto p-0">
                  <table className="w-full text-left border-collapse table-auto text-xs min-w-[1000px] font-sans">
                    <thead>
                      <tr className="border-b border-m3-outline-variant/20 bg-m3-surface/30 text-[9px] uppercase font-black text-zinc-400 tracking-wider">
                        <th className="py-3 px-4 w-28">Ref Invoice</th>
                        <th className="py-3 px-4">timestamp settled</th>
                        <th className="py-3 px-4">Client Profile</th>
                        <th className="py-3 px-4 text-right">Subtotal</th>
                        <th className="py-3 px-4 text-right">VAT (12%)</th>
                        <th className="py-3 px-4 text-right">Discount Given</th>
                        <th className="py-3 px-4 text-right">
                          Grand Total Paid
                        </th>
                        <th className="py-3 px-4 text-center">
                          Settlement Status
                        </th>
                        <th className="py-3 px-4 text-center w-48">
                          Audit Controls
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-m3-outline-variant/10 font-mono text-[11px] text-zinc-300">
                      {filteredPurchaseOrders.map((po) => {
                        const relatedPoItems = poItems.filter(
                          (item) => item.poId === po.id,
                        );
                        let statusBadge =
                          "bg-m3-outline-variant/20 text-m3-on-surface";
                        if (po.status === "Pending")
                          statusBadge =
                            "bg-m3-primary-container text-m3-on-primary-container border-m3-primary/25";
                        if (po.status === "Approved" || po.status === "Ordered")
                          statusBadge =
                            "bg-m3-tertiary-container text-m3-on-tertiary-container border border-m3-tertiary/25";
                        if (po.status === "Completed")
                          statusBadge =
                            "bg-m3-tertiary-container text-m3-on-tertiary-container border-transparent";
                        if (po.status === "Partially Received")
                          statusBadge =
                            "bg-m3-secondary-container text-m3-on-secondary-container";

                        return (
                          <tr
                            key={po.id}
                            onClick={() => setSelectedPoDetails(po)}
                            className="hover:bg-m3-surface-low/90 cursor-pointer transition-colors font-bold"
                            title="Click to view full purchase order (PO) requisition details"
                          >
                            <td className="py-3.5 px-4 text-m3-primary font-black uppercase hover:underline">
                              {po.poNumber}
                            </td>

                            <td className="py-3.5 px-4 text-zinc-550 font-sans font-medium">
                              {po.date}
                            </td>

                            <td className="py-3.5 px-4 text-m3-on-surface font-sans font-extrabold">
                              {getSuplierName(po.supplierId)}
                            </td>

                            <td className="py-3.5 px-4 text-right text-zinc-400">
                              ₱
                              {relatedPoItems
                                .reduce(
                                  (s, it) =>
                                    s + it.costPrice * it.quantityRequested,
                                  0,
                                )
                                .toFixed(2)}
                            </td>

                            <td className="py-3.5 px-4 text-right text-zinc-400">
                              ₱
                              {(
                                relatedPoItems.reduce(
                                  (s, it) =>
                                    s + it.costPrice * it.quantityRequested,
                                  0,
                                ) * 0.12
                              ).toFixed(2)}
                            </td>

                            <td className="py-3.5 px-4 text-right text-rose-500">
                              -₱0.00
                            </td>

                            <td className="py-3.5 px-4 text-right text-m3-primary font-extrabold">
                              ₱
                              {(
                                relatedPoItems.reduce(
                                  (s, it) =>
                                    s + it.costPrice * it.quantityRequested,
                                  0,
                                ) * 1.12
                              ).toFixed(2)}
                            </td>

                            <td className="py-3.5 px-4 text-center uppercase text-[9.5px]">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest border uppercase ${statusBadge}`}
                              >
                                {po.status}
                              </span>
                            </td>

                            {allowedToModify && (
                              <td
                                className="py-3.5 px-4 text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex gap-2 justify-center">
                                  {po.status === "Pending" && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updatePOStatus(po.id, "Approved");
                                        showToast(
                                          `Requisition slip ${po.poNumber} approved.`,
                                        );
                                      }}
                                      className="py-1 px-3 rounded-lg border border-m3-outline-variant/60 hover:border-m3-primary hover:bg-m3-primary/10 transition-all font-sans text-[10px] font-black uppercase text-m3-primary cursor-pointer"
                                    >
                                      Approve Draft
                                    </button>
                                  )}

                                  {(po.status === "Approved" ||
                                    po.status === "Ordered" ||
                                    po.status === "Partially Received") && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenReceive(po);
                                      }}
                                      className="py-1 px-3 rounded-lg border border-m3-outline-variant/60 hover:border-m3-primary hover:bg-m3-primary/10 transition-all font-sans text-[10px] font-black uppercase text-m3-primary cursor-pointer"
                                    >
                                      Receive Cargo
                                    </button>
                                  )}

                                  {po.status === "Completed" && (
                                    <span className="text-[10px] text-m3-on-surface-variant/70 font-semibold italic font-sans">
                                      Completed
                                    </span>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}

                      {filteredPurchaseOrders.length === 0 && (
                        <tr>
                          <td
                            colSpan={9}
                            className="py-12 text-center text-m3-on-surface-variant font-medium text-xs italic font-sans"
                          >
                            No purchase order requisitions in this select
                            category filters list.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      ) : activeSubTab === "suppliers" ? (
        /* Manage Suppliers Directory view */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-4 rounded-2xl flex items-center gap-4">
              <div className="p-3 rounded-xl bg-m3-primary/10 text-m3-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block font-sans">
                  Active Vendors
                </span>
                <span className="text-lg font-black font-mono leading-none">
                  {suppliers.filter((s) => !s.isDeleted).length} Registered
                </span>
              </div>
            </div>

            <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-4 rounded-2xl flex items-center gap-4">
              <div className="p-3 rounded-xl bg-m3-tertiary/10 text-m3-tertiary">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block font-sans">
                  Pending Cargo Orders
                </span>
                <span className="text-lg font-black font-mono leading-none">
                  {
                    purchaseOrders.filter(
                      (po) =>
                        po.status !== "Completed" && po.status !== "Cancelled",
                    ).length
                  }{" "}
                  Active POs
                </span>
              </div>
            </div>

            <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-4 rounded-2xl flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block font-sans">
                  Manufacturer Brands
                </span>
                <span className="text-lg font-black font-mono leading-none">
                  {
                    new Set(
                      products
                        .filter((p) => !p.isDeleted)
                        .map((p) => p.brand)
                        .filter(Boolean),
                    ).size
                  }{" "}
                  Brands cataloged
                </span>
              </div>
            </div>
          </div>

          <div className="m3-card shadow-sm overflow-x-auto p-0">
            <table className="w-full text-xs text-left border-collapse table-auto min-w-[900px]">
              <thead>
                <tr className="border-b border-m3-outline-variant/20 bg-m3-surface/30 text-[10px] uppercase font-bold text-m3-on-surface-variant tracking-wider">
                  <th className="py-3 px-4">Supplier Code</th>
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Phone Contacts</th>
                  <th className="py-3 px-4">Corporate Email</th>
                  <th className="py-3 px-4">Physical Head Office</th>
                  <th className="py-3 px-4 text-center">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-m3-outline-variant/10 text-m3-on-surface/90">
                {suppliers
                  .filter((s) => !s.isDeleted)
                  .map((sup) => (
                    <tr
                      key={sup.id}
                      onClick={() => setSelectedSupplierCatalog(sup)}
                      className="hover:bg-m3-surface-low/90 cursor-pointer transition-colors"
                      title="Click to view company profile and product catalog"
                    >
                      <td className="py-3.5 px-4 font-mono font-black text-m3-primary hover:underline">
                        {sup.id}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-sm text-m3-on-surface hover:underline">
                        {sup.name}
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Users className="h-3.5 w-3.5 text-zinc-400" />
                          <span>{sup.contactPerson || "N/A"}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-zinc-400" />
                          <span>{sup.phone || "N/A"}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-zinc-400" />
                          <span>{sup.email || "N/A"}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-m3-on-surface-variant font-medium">
                        {sup.address}
                      </td>
                      <td
                        className="py-3.5 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditSupplier(sup);
                            }}
                            className="p-1 px-1.5 bg-m3-primary/10 hover:bg-m3-primary/20 text-m3-primary rounded transition-all active:scale-95"
                            title="Edit corporate profile"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSupplier(sup.id, sup.name);
                            }}
                            className="p-1 px-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded transition-all active:scale-95"
                            title="De-register supplier"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                {suppliers.filter((s) => !s.isDeleted).length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-m3-on-surface-variant font-medium"
                    >
                      No registered supplier broker partners found. Click
                      Register Supplier to add.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeSubTab === "brands" ? (
        /* Manage Brands Directory view */
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-4 rounded-2xl flex items-center gap-4">
              <div className="p-3 rounded-xl bg-m3-primary/10 text-m3-primary">
                <Tag className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block font-sans">
                  Active Brands
                </span>
                <span className="text-lg font-black font-mono leading-none">
                  {brands.filter((b) => !b.isDeleted).length} Cataloged
                </span>
              </div>
            </div>

            <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-4 rounded-2xl flex items-center gap-4">
              <div className="p-3 rounded-xl bg-m3-tertiary/10 text-m3-tertiary">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block font-sans">
                  Sourced Vendors
                </span>
                <span className="text-lg font-black font-mono leading-none">
                  {
                    new Set(
                      brands
                        .filter((b) => !b.isDeleted)
                        .map((b) => b.supplierId),
                    ).size
                  }{" "}
                  Active Suppliers
                </span>
              </div>
            </div>

            <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-4 rounded-2xl flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block font-sans">
                  Restock Queue Load
                </span>
                <span className="text-lg font-black font-mono leading-none">
                  {poCart.length} Items pending
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-base font-black text-m3-on-surface tracking-tight font-sans">
                Brand Sourcing &amp; Directory Deck
              </h2>
              <p className="text-xs text-m3-on-surface-variant">
                Configure manufacturer-to-supplier mappings to power automated
                PO consolidation.
              </p>
            </div>
            {allowedToModify && (
              <button
                onClick={handleOpenAddBrand}
                className="px-4 py-2 bg-m3-primary hover:bg-m3-primary/95 text-m3-on-primary text-xs font-bold rounded-full shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Register Sourced Brand
              </button>
            )}
          </div>

          <div className="m3-card shadow-sm overflow-x-auto p-0">
            <table className="w-full text-xs text-left border-collapse table-auto min-w-[800px]">
              <thead>
                <tr className="border-b border-m3-outline-variant/20 bg-m3-surface/30 text-[10px] uppercase font-bold text-m3-on-surface-variant tracking-wider">
                  <th className="py-3 px-4">Brand Identifier</th>
                  <th className="py-3 px-4">Brand Logo / Name</th>
                  <th className="py-3 px-4">
                    Authorized Distributor / Supplier
                  </th>
                  <th className="py-3 px-4">Unique Catalog SKUs</th>
                  <th className="py-3 px-4">Description Info</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-m3-outline-variant/10 text-m3-on-surface/90">
                {brands
                  .filter((b) => !b.isDeleted)
                  .map((b) => {
                    const linkedSupplierName = getSuplierName(b.supplierId);
                    const brandNameTrim = b.name.toLowerCase().trim();
                    const skuCount = products.filter(
                      (p) =>
                        !p.isDeleted &&
                        p.brand?.toLowerCase().trim() === brandNameTrim,
                    ).length;

                    return (
                      <tr
                        key={b.id}
                        className="hover:bg-m3-surface-lowest/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-m3-on-surface-variant">
                          {b.id}
                        </td>
                        <td className="py-3 px-4 font-black text-m3-on-surface text-sm">
                          {b.name}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-m3-primary bg-m3-primary/5 px-2.5 py-1 rounded-full text-[11px] border border-m3-primary/20">
                            {linkedSupplierName}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-teal-600">
                          {skuCount} Items linked
                        </td>
                        <td className="py-3 px-4 text-m3-on-surface-variant/80 italic">
                          {b.description || "No custom description."}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            {allowedToModify && (
                              <>
                                <button
                                  onClick={() => handleOpenEditBrand(b)}
                                  className="p-1 px-1.5 bg-m3-surface-low hover:bg-m3-surface border border-m3-outline-variant/20 text-m3-on-surface-variant rounded transition-all active:scale-95"
                                  title="Edit Brand Mapping"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteBrand(b.id, b.name)
                                  }
                                  className="p-1 px-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded transition-all active:scale-95"
                                  title="De-register Brand"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                {brands.filter((b) => !b.isDeleted).length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-m3-on-surface-variant font-medium"
                    >
                      No manufacturer brands registered. Click 'Register Sourced
                      Brand' above to catalog.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Automated PO Consolidation Desk & Restock Queue */
        <div className="space-y-6">
          <div className="m3-card border border-m3-outline/20 bg-m3-surface-low/80 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-m3-outline-variant/25 pb-4">
              <div>
                <h3 className="text-base font-black text-m3-on-surface flex items-center gap-1.5">
                  <Settings2 className="h-5 w-5 text-m3-primary" />
                  <span>
                    Automated PO Consolidation Desk &amp; Restock Queue
                  </span>
                </h3>
                <p className="text-xs text-m3-on-surface-variant">
                  Products requiring restocking are consolidated here. Items
                  under different brands but supplied by the same company will
                  be merged in a single PO!
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-[11px] font-bold text-m3-on-surface-variant uppercase">
                  Receiving Branch:
                </label>
                <select
                  value={selectedConsolidationBranchId}
                  onChange={(e) =>
                    setSelectedConsolidationBranchId(e.target.value)
                  }
                  className="bg-m3-surface border border-m3-outline-variant/50 rounded-lg px-3 py-1.5 text-xs font-bold text-m3-on-surface"
                >
                  {branches
                    .filter((b) => !b.isDeleted)
                    .map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name} ({branch.address})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Quick manual item adder to Restock Queue */}
            <div className="bg-m3-surface/30 p-3.5 rounded-xl border border-m3-outline-variant/10 flex flex-wrap gap-3 items-end text-left">
              <div className="space-y-1 relative w-80">
                <label className="text-[10px] font-bold text-m3-primary uppercase pl-0.5">
                  Quick-Add catalog item to consolidation:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="quick-add-product-select-search"
                    placeholder="🔍 Search product or brand name..."
                    value={procurementProductSearch}
                    onFocus={() => setShowProcurementProductDropdown(true)}
                    onChange={(e) => {
                      setProcurementProductSearch(e.target.value);
                      setShowProcurementProductDropdown(true);
                    }}
                    className="w-full bg-m3-surface border border-m3-outline-variant/60 rounded-xl px-3.5 py-2 text-xs font-bold text-m3-on-surface focus:outline-none focus:ring-1 focus:ring-m3-primary transition-all placeholder-zinc-500"
                  />
                  {procurementProductSearch && (
                    <button
                      type="button"
                      onClick={() => setProcurementProductSearch("")}
                      className="absolute right-3 top-2 text-zinc-400 hover:text-rose-500 text-xs font-black cursor-pointer"
                    >
                      ✗
                    </button>
                  )}
                </div>

                {showProcurementProductDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowProcurementProductDropdown(false)}
                    />
                    <div className="absolute left-0 right-0 mt-1.5 bg-m3-surface-low border border-m3-outline-variant/50 rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto divide-y divide-m3-outline-variant/15 text-xs text-left">
                      {(() => {
                        let firstSupplierId: string | null = null;
                        if (poCart.length > 0) {
                          const firstItem = poCart[0];
                          const firstProd = products.find(
                            (p) => p.id === firstItem.productId,
                          );
                          if (firstProd) {
                            const brandMatch = brands.find(
                              (b) =>
                                b.name.toLowerCase().trim() ===
                                  firstProd.brand?.toLowerCase().trim() &&
                                !b.isDeleted,
                            );
                            firstSupplierId = brandMatch
                              ? brandMatch.supplierId
                              : "S1";
                          }
                        }

                        const pool = products
                          .filter((p) => !p.isDeleted)
                          .filter((p) => {
                            if (!firstSupplierId) return true;
                            const brandMatch = brands.find(
                              (b) =>
                                b.name.toLowerCase().trim() ===
                                  p.brand?.toLowerCase().trim() && !b.isDeleted,
                            );
                            const prodSupplierId = brandMatch
                              ? brandMatch.supplierId
                              : "S1";
                            return prodSupplierId === firstSupplierId;
                          })
                          .filter((p) => {
                            if (!procurementProductSearch.trim()) return true;
                            const term = procurementProductSearch.toLowerCase();
                            return (
                              p.productName.toLowerCase().includes(term) ||
                              (p.brand &&
                                p.brand.toLowerCase().includes(term)) ||
                              (p.sku && p.sku.toLowerCase().includes(term))
                            );
                          });

                        if (pool.length === 0) {
                          return (
                            <div className="p-3 text-zinc-500 italic text-center">
                              No compatible products found
                            </div>
                          );
                        }

                        return pool.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => {
                              const exists = poCart.some(
                                (item) => item.productId === p.id,
                              );
                              if (exists) {
                                showToast("Item already queued.");
                              } else {
                                const updated = [
                                  ...poCart,
                                  { productId: p.id, quantity: 50 },
                                ];
                                syncPoCart(updated);
                                showToast(
                                  `Added ${p.productName} to restock queue.`,
                                );
                              }
                              setProcurementProductSearch("");
                              setShowProcurementProductDropdown(false);
                            }}
                            className="p-2.5 hover:bg-m3-primary/10 cursor-pointer flex justify-between items-center transition-colors text-left font-bold"
                          >
                            <div className="space-y-0.5">
                              <div className="text-m3-on-surface text-xs font-extrabold">
                                {p.productName}
                              </div>
                              <div className="text-[10px] text-zinc-400 font-mono font-medium">
                                Brand: {p.brand || "No Brand"} • Stock:{" "}
                                {p.stockQuantity}
                              </div>
                            </div>
                            <span className="text-[10px] bg-m3-primary/15 text-m3-primary px-2 py-0.5 rounded-full font-mono">
                              ₱{p.costPrice.toFixed(2)}
                            </span>
                          </div>
                        ));
                      })()}
                    </div>
                  </>
                )}
              </div>

              {/* ALIGNMENT ELEMENT DROP BOX INPUT SETTINGS FOR AUTO CONSOLIDATIONS */}
              <div className="space-y-1 text-left w-48">
                <label className="text-[10px] font-bold text-m3-primary uppercase pl-0.5">
                  Installment Cycle:
                </label>
                <select
                  value={paymentFrequency}
                  onChange={(e) => setPaymentFrequency(e.target.value as any)}
                  className="w-full bg-m3-surface border border-m3-outline-variant/60 rounded-xl px-2.5 py-1.5 text-xs font-bold text-m3-primary focus:outline-none focus:border-m3-primary transition-colors cursor-pointer"
                >
                  <option value="WEEKLY">Weekly Plan</option>
                  <option value="MONTHLY">Monthly Plan</option>
                  <option value="SEMI_QUARTERLY">Semi-Quarterly (45d)</option>
                  <option value="QUARTERLY">Quarterly Installment</option>
                  <option value="YEARLY">Yearly Retainer</option>
                </select>
              </div>

              <div className="space-y-1 text-left w-48">
                <label className="text-[10px] font-bold text-m3-primary uppercase pl-0.5">
                  Payout Deadline:
                </label>
                <input
                  type="date"
                  value={payoutDueDate}
                  onChange={(e) => setPayoutDueDate(e.target.value)}
                  className="w-full bg-m3-surface border border-m3-outline-variant/60 rounded-xl px-2.5 py-1 text-xs font-bold font-mono text-m3-on-surface focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            {poCart.length > 0 ? (
              <div className="space-y-5 animate-fade-in">
                {/* Cart compiling list */}
                <div className="overflow-x-auto border border-m3-outline-variant/15 rounded-xl">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-m3-surface-lowest text-[10px] text-zinc-400 font-bold uppercase border-b border-m3-outline-variant/20">
                        <th className="py-2.5 px-3">Product Name</th>
                        <th className="py-2.5 px-3">Brand</th>
                        <th className="py-2.5 px-3">Brand Supplier Partner</th>
                        <th className="py-2.5 px-3 text-center">
                          Remaining Stock
                        </th>
                        <th
                          className="py-2.5 px-3 text-center"
                          style={{ width: "130px" }}
                        >
                          Desired Units
                        </th>
                        <th className="py-2.5 px-3 text-center">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-m3-outline-variant/10">
                      {poCart.map((cartItem, cIdx) => {
                        const prod = products.find(
                          (p) => p.id === cartItem.productId,
                        );
                        if (!prod) return null;

                        const brandMatch = brands.find(
                          (b) =>
                            b.name.toLowerCase().trim() ===
                              prod.brand?.toLowerCase().trim() && !b.isDeleted,
                        );
                        const supplierName = brandMatch
                          ? getSuplierName(brandMatch.supplierId)
                          : "No Mapped Brand (S1 fallback)";

                        return (
                          <tr
                            key={cartItem.productId || cIdx}
                            className="hover:bg-m3-surface/20"
                          >
                            <td className="py-2 px-3 font-bold text-m3-on-surface">
                              {prod.productName}
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] font-bold text-amber-600">
                              {prod.brand || "Generic"}
                            </td>
                            <td className="py-2 px-3 font-bold text-teal-600">
                              {supplierName}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-center">
                              {prod.stockQuantity} boxes
                            </td>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="number"
                                min={1}
                                value={cartItem.quantity}
                                onChange={(e) => {
                                  const val = Math.max(
                                    1,
                                    Number(e.target.value) || 1,
                                  );
                                  const updated = poCart.map((item, idx) =>
                                    idx === cIdx
                                      ? { ...item, quantity: val }
                                      : item,
                                  );
                                  syncPoCart(updated);
                                }}
                                className="w-20 bg-m3-surface border border-m3-outline-variant/60 rounded px-2 py-1 text-center font-bold text-xs"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                onClick={() => {
                                  const updated = poCart.filter(
                                    (_, idx) => idx !== cIdx,
                                  );
                                  syncPoCart(updated);
                                  showToast("Removed item from restock list.");
                                }}
                                className="p-1 text-red-500 hover:bg-red-500/15 rounded-full"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pre-consolidation visual groupings layout */}
                <div className="bg-m3-surface-lowest/50 p-4 rounded-xl border border-m3-outline-variant/10 space-y-3">
                  <span className="text-[10px] uppercase font-black text-m3-primary tracking-widest block">
                    PO Consolidation Sourcing Preview:
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {(() => {
                      const groups: Record<string, any[]> = {};
                      poCart.forEach((item) => {
                        const prod = products.find(
                          (p) => p.id === item.productId,
                        );
                        if (!prod) return;
                        const brandMatch = brands.find(
                          (b) =>
                            b.name.toLowerCase().trim() ===
                              prod.brand?.toLowerCase().trim() && !b.isDeleted,
                        );
                        const supplierId = brandMatch
                          ? brandMatch.supplierId
                          : "S1";
                        if (!groups[supplierId]) groups[supplierId] = [];
                        groups[supplierId].push({ item, prod });
                      });

                      return Object.entries(groups).map(([supId, entries]) => {
                        const supNameVal = getSuplierName(supId);
                        return (
                          <div
                            key={supId}
                            className="bg-m3-surface border border-m3-outline-variant/15 p-3 rounded-xl flex flex-col justify-between gap-2 text-xs"
                          >
                            <div>
                              <div className="flex items-center justify-between border-b border-m3-outline-variant/10 pb-1.5 mb-2">
                                <span className="font-extrabold text-m3-primary">
                                  {supNameVal}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 bg-teal-500/10 text-teal-500 font-bold rounded-lg uppercase">
                                  {entries.length} items grouped
                                </span>
                              </div>
                              <ul className="space-y-1 text-[11px] text-m3-on-surface-variant/90 pl-1 list-disc list-inside">
                                {entries.map((entry, idx) => (
                                  <li key={idx}>
                                    <span className="font-semibold text-m3-on-surface">
                                      {entry.prod.productName}
                                    </span>{" "}
                                    ({entry.item.quantity} boxes) -{" "}
                                    <span className="italic text-zinc-400">
                                      [{entry.prod.brand}]
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <span className="text-[10px] text-zinc-400 block pt-1.5 mt-2 border-t border-m3-outline-variant/5 text-[10.5px]">
                              Auto-consolidating all products into one bulk
                              Supplier PO.
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        confirm(
                          "Are you absolutely sure you want to discard the current draft compilation worksheet?",
                        )
                      ) {
                        syncPoCart([]);
                        showToast("Worksheet discarded.");
                      }
                    }}
                    className="px-4 py-2 bg-m3-surface border border-m3-outline-variant hover:bg-m3-surface-low text-m3-on-surface text-xs font-bold rounded-full cursor-pointer uppercase tracking-wide"
                  >
                    Clear Restock Cart
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingConsolidation(true)}
                    className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-black rounded-full cursor-pointer uppercase shadow-sm tracking-wide flex items-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" /> Group &amp; Compile
                    Consolidated POs
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <p className="text-sm font-semibold text-m3-on-surface-variant">
                  The restock worksheet is currently empty.
                </p>
                <p className="text-[11px] text-m3-on-surface-variant/75 max-w-lg mx-auto">
                  Queued items scheduled by Branch Managers or Admins inside the
                  Dashboard - Active Inventory Health list will automatically
                  populate this compiler workspace. You can also manually add
                  items using the "Quick-Add" dropdown selector above!
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Sourcing Strategy Selection & Confirmation */}
      {isConfirmingConsolidation && (
        <div
          id="consolidation-sourcing-strategy-modal"
          className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in"
        >
          <div
            className="absolute inset-0 bg-gray-950/65 backdrop-blur-sm"
            onClick={() => setIsConfirmingConsolidation(false)}
          />
          <div className="relative w-full max-w-2xl bg-m3-surface-low rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface space-y-6 text-left">
            <div className="flex justify-between items-center border-b border-m3-outline-variant/20 pb-3">
              <h3 className="text-sm font-black font-mono uppercase tracking-wider text-m3-primary flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                <span>Select Requisitions Routing Strategy</span>
              </h3>
              <button
                onClick={() => setIsConfirmingConsolidation(false)}
                className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-m3-on-surface-variant leading-relaxed">
                You have queued{" "}
                <span className="font-extrabold text-m3-primary">
                  {poCart.length} restock segments
                </span>{" "}
                for consolidation. Based on supply parameters, please choose the
                optimal automated routing sequence for the compiled purchase
                orders:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strategy A (Recommended for standard) */}
                <div
                  onClick={() => handleConsolidateOrders("Pending")}
                  className="bg-m3-surface hover:bg-m3-surface-lowest border-2 border-amber-500/20 hover:border-amber-500/50 p-4 rounded-2xl cursor-pointer transition-all hover:scale-101 space-y-3 relative group"
                >
                  <div className="absolute top-3 right-3 bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-mono">
                    Highly Recommended
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 w-10 h-10 flex items-center justify-center">
                    <FileText className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-m3-on-surface">
                      Route to Requisitions Drafts (Pending)
                    </h4>
                    <p className="text-[11px] text-m3-on-surface-variant/90 mt-1 leading-normal">
                      Saves the compiled POs in <strong>Pending</strong> status,
                      permitting pricing edits, segment verification, and direct
                      manual approval inside the ledger before active
                      communication with the manufacturer.
                    </p>
                  </div>
                  <div className="text-[10px] text-amber-600 font-extrabold flex items-center gap-1 group-hover:underline pt-1">
                    <span>Draft &amp; Save Requisitions</span>
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </div>

                {/* Strategy B (Direct to Sourcing Deck) */}
                <div
                  onClick={() => handleConsolidateOrders("Approved")}
                  className="bg-m3-surface hover:bg-m3-surface-lowest border-2 border-emerald-500/20 hover:border-emerald-500/50 p-4 rounded-2xl cursor-pointer transition-all hover:scale-101 space-y-3 relative group"
                >
                  <div className="absolute top-3 right-3 bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-mono">
                    Direct Sourcing
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 w-10 h-10 flex items-center justify-center">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-m3-on-surface">
                      Route Direct to Outsourcing (Approved)
                    </h4>
                    <p className="text-[11px] text-m3-on-surface-variant/90 mt-1 leading-normal">
                      Optimal for fast-tracked pipelines. Dispatches compiled
                      POs instantly with <strong>Approved</strong> status,
                      skipping draft phases. Orders are immediately ready for
                      carrier transit logs and arrival reconciliation inside the
                      Sourcing Deck.
                    </p>
                  </div>
                  <div className="text-[10px] text-emerald-600 font-extrabold flex items-center gap-1 group-hover:underline pt-1">
                    <span>Dispatch Direct to Suppliers</span>
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-m3-outline-variant/10 pt-4">
              <button
                onClick={() => setIsConfirmingConsolidation(false)}
                className="px-4 py-2 bg-m3-surface hover:bg-m3-surface-low border border-m3-outline-variant text-[11px] font-bold text-m3-on-surface rounded-full uppercase tracking-wider cursor-pointer"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Requisition Builder (Create Draft PO) */}
      {showPOModal && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
          <div
            className="absolute inset-0 bg-gray-950/65 backdrop-blur-sm"
            onClick={() => setShowPOModal(false)}
          />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="md:col-span-2 flex justify-between items-center border-b border-m3-outline-variant/20 pb-2.5 flex-shrink-0">
              <h3 className="text-base font-bold text-m3-primary flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <span>Compiler: Bulk Purchase Requisition</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPOModal(false)}
                className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* FAST PO TEMPLATE LOADER */}
            <div className="md:col-span-2 bg-m3-primary/5 p-3 rounded-2xl border border-m3-outline-variant/30 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-m3-primary tracking-wider font-mono">
                  Load PO Template:
                </span>
                <select
                  onChange={(e) => {
                    const templateId = e.target.value;
                    if (!templateId) return;
                    const selectedTemplate = poTemplates.find(
                      (t) => t.id === templateId,
                    );
                    if (selectedTemplate) {
                      setSelectedSupplierId(selectedTemplate.supplierId);
                      setSelectedBranchId(selectedTemplate.branchId);
                      setDraftItems(selectedTemplate.items);
                      setPoNotes(selectedTemplate.notes || "");
                      showToast(
                        `Template "${selectedTemplate.name}" loaded successfully.`,
                      );
                    }
                    e.target.value = "";
                  }}
                  className="bg-m3-surface-lowest border border-m3-outline-variant px-2.5 py-1 text-xs text-m3-on-surface focus:outline-none focus:border-m3-primary transition-colors rounded-lg cursor-pointer max-w-[200px]"
                >
                  <option value="">-- Select Template --</option>
                  {poTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              {poTemplates.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (isRowClearingBlocked()) {
                      alert(`[System Guard] Action Blocked: Cannot clear templates because the register is currently holding: ${getRowClearingBlockedReason()}`);
                      return;
                    }
                    if (
                      confirm(
                        "Are you sure you want to clear the templates database? This is permanent.",
                      )
                    ) {
                      localStorage.removeItem("tp_po_templates");
                      setPoTemplates([]);
                      showToast("All templates deleted.");
                    }
                  }}
                  className="text-[9px] text-red-500 hover:underline font-bold font-mono tracking-wide uppercase disabled:opacity-40"
                  disabled={isRowClearingBlocked()}
                >
                  Clear Saved
                </button>
              )}
            </div>

            {/* General Specs */}
            <div className="space-y-1 relative">
              <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">
                Vendor Supplier
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md cursor-pointer"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 relative">
              <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">
                Warehouse / Branch Assignment
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* DYNAMIC VENDOR DETAILS PANEL */}
            {(() => {
              const selectedSup = suppliers.find(
                (s) => s.id === selectedSupplierId,
              );
              if (selectedSup) {
                return (
                  <div className="md:col-span-2 bg-m3-surface-lowest p-3 rounded-2xl border border-m3-outline-variant/30 text-xs text-m3-on-surface space-y-1 my-0.5 animate-fade-in">
                    <div className="flex justify-between items-center border-b border-m3-outline-variant/15 pb-1">
                      <span className="text-[9px] font-bold text-m3-primary uppercase tracking-widest">
                        Active Vendor Contact Data
                      </span>
                      <span className="text-[9px] font-mono font-bold bg-m3-primary/10 text-m3-primary px-2 py-0.5 rounded-full">
                        {selectedSup.id}
                      </span>
                    </div>
                    <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-m3-on-surface-variant text-[11px]">
                      <div>
                        <span className="font-bold text-m3-on-surface">
                          Company:
                        </span>{" "}
                        {selectedSup.name}
                      </div>
                      <div>
                        <span className="font-bold text-m3-on-surface">
                          Contact Person:
                        </span>{" "}
                        {selectedSup.contactPerson || "None listed"}
                      </div>
                      <div>
                        <span className="font-bold text-m3-on-surface">
                          Phone:
                        </span>{" "}
                        {selectedSup.phone || "None listed"}
                      </div>
                      <div>
                        <span className="font-bold text-m3-on-surface">
                          Email:
                        </span>{" "}
                        {selectedSup.email || "None listed"}
                      </div>
                      <div className="sm:col-span-2">
                        <span className="font-bold text-m3-on-surface">
                          Address:
                        </span>{" "}
                        {selectedSup.address || "None listed"}
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Toggle header for adding items */}
            <div className="md:col-span-2 flex items-center justify-between px-1 border-t border-m3-outline-variant/15 pt-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-m3-primary font-mono">
                Order compilation workspace
              </span>
              <button
                type="button"
                onClick={() => setShowManualItemForm(!showManualItemForm)}
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-500 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/15 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs"
              >
                {showManualItemForm
                  ? "← Use Standard lookup"
                  : "+ Add New Manual Item"}
              </button>
            </div>

            {showManualItemForm ? (
              /* Inline Manual Add Item form */
              <div className="md:col-span-2 bg-amber-500/5 p-4 rounded-3xl border border-amber-500/15 my-1 space-y-4 animate-scale-up text-left">
                <div className="flex justify-between items-center border-b border-amber-500/10 pb-2">
                  <h4 className="text-[11px] font-black tracking-wider uppercase text-amber-600 dark:text-amber-400">
                    Register &amp; Add uncataloged Item Details
                  </h4>
                  <span className="text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
                    New Product
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="space-y-1 bg-transparent">
                    <label className="text-[9px] font-bold uppercase text-amber-600 dark:text-amber-400 block pl-1">
                      Product Name
                    </label>
                    <input
                      type="text"
                      required
                      value={manualProdName}
                      onChange={(e) => setManualProdName(e.target.value)}
                      placeholder="e.g. Premium Fujian Polished Tile"
                      className="w-full bg-m3-surface border-b border-amber-500/30 px-3 py-2 text-xs text-m3-on-surface focus:outline-none focus:border-amber-500 rounded-t-lg font-sans font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-amber-600 dark:text-amber-400 block pl-1">
                      Category
                    </label>
                    <select
                      value={manualCategory}
                      onChange={(e) => setManualCategory(e.target.value)}
                      className="w-full bg-m3-surface border-b-2 border-amber-500/30 px-3 py-2 text-xs text-m3-on-surface focus:outline-none focus:border-amber-500 rounded-t-lg font-sans font-bold cursor-pointer"
                    >
                      <option value="Ceramic Tiles">Ceramic Tiles</option>
                      <option value="Porcelain Tiles">Porcelain Tiles</option>
                      <option value="Wall Tiles">Wall Tiles</option>
                      <option value="Premium Accents">Premium Accents</option>
                      <option value="Grout &amp; Adhesives">
                        Grout &amp; Adhesives
                      </option>
                      <option value="Tools">Tools</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-amber-600 dark:text-amber-400 block pl-1">
                      Brand Name / Manufacturer
                    </label>
                    <input
                      type="text"
                      value={manualBrand}
                      onChange={(e) => setManualBrand(e.target.value)}
                      className="w-full bg-m3-surface border-b-2 border-m3-outline-variant px-3 py-2 text-xs text-m3-on-surface font-mono focus:outline-none focus:border-amber-500 transition-colors rounded-t-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-amber-600 dark:text-amber-400 block pl-1">
                      Item Dimensions (Size)
                    </label>
                    <input
                      type="text"
                      value={manualSize}
                      onChange={(e) => setManualSize(e.target.value)}
                      placeholder="e.g. 60x60 cm"
                      className="w-full bg-m3-surface border-b-2 border-m3-outline-variant px-3 py-2 text-xs text-m3-on-surface focus:outline-none focus:border-amber-500 transition-colors rounded-t-lg font-bold font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-amber-600 dark:text-amber-400 block pl-1">
                      Wholesale Cost Price (PHP)
                    </label>
                    <input
                      type="number"
                      value={manualCostPrice}
                      onChange={(e) => setManualCostPrice(e.target.value)}
                      className="w-full bg-m3-surface border-b-2 border-m3-outline-variant px-3 py-2 text-xs text-m3-on-surface focus:outline-none focus:border-amber-500 transition-colors rounded-t-lg font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-amber-600 dark:text-amber-400 block pl-1">
                      Suggested Store Price (PHP)
                    </label>
                    <input
                      type="number"
                      value={manualSellingPrice}
                      onChange={(e) => setManualSellingPrice(e.target.value)}
                      className="w-full bg-m3-surface border-b-2 border-m3-outline-variant px-3 py-2 text-xs text-m3-on-surface focus:outline-none focus:border-amber-500 transition-colors rounded-t-lg font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-amber-600 dark:text-amber-400 block pl-1">
                      Initial Order Qty (Boxes)
                    </label>
                    <input
                      type="number"
                      value={manualQtyRequested}
                      onChange={(e) => setManualQtyRequested(e.target.value)}
                      className="w-full bg-m3-surface border-b-2 border-m3-outline-variant px-3 py-2 text-xs text-m3-on-surface focus:outline-none focus:border-amber-500 transition-colors rounded-t-lg font-mono font-black"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-amber-600 dark:text-amber-400 block pl-1">
                      Batch Manufacturing Origin Source
                    </label>
                    <input
                      type="text"
                      value={manualOrigin}
                      onChange={(e) => setManualOrigin(e.target.value)}
                      placeholder="e.g. Imported Batch lot / Local plant"
                      className="w-full bg-m3-surface border-b-2 border-m3-outline-variant px-3 py-2 text-xs text-m3-on-surface focus:outline-none focus:border-amber-500 transition-colors rounded-t-lg font-sans font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-amber-500/10">
                  <button
                    type="button"
                    onClick={handleRegisterAndAddManualItem}
                    className="px-6 py-2.5 text-xs font-black bg-amber-500 hover:bg-amber-600 text-gray-950 shadow-md rounded-full transition-transform active:scale-95 cursor-pointer flex items-center gap-1"
                  >
                    Register Product &amp; Append to PO Draft
                  </button>
                </div>
              </div>
            ) : (
              /* Item selector widget within drafting panel */
              <div className="md:col-span-2 bg-m3-surface-lowest p-4 rounded-2xl border border-m3-outline-variant/30 my-1 grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div className="space-y-1 relative text-left">
                  <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">
                    Product catalog Lookup
                  </label>
                  <select
                    value={selectedProdId}
                    onChange={(e) => setSelectedProdId(e.target.value)}
                    className="w-full bg-m3-surface border-b-2 border-m3-outline-variant px-3 py-2 text-xs text-m3-on-surface focus:outline-none focus:border-m3-primary transition-colors rounded-t-md cursor-pointer"
                  >
                    <option value="">-- Choose active catalog item --</option>
                    {activeProductsForSupplier.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.productName} (Code: {p.productCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <div className="space-y-1 relative text-left flex-1">
                    <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">
                      Volume requested
                    </label>
                    <input
                      type="number"
                      value={qtyRequestedInput}
                      onChange={(e) => setQtyRequestedInput(e.target.value)}
                      className="w-full bg-m3-surface border-b-2 border-m3-outline-variant px-3 py-2 text-xs text-m3-on-surface focus:outline-none focus:border-m3-primary transition-colors font-mono font-black rounded-t-md"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={addDraftItem}
                    className="px-5 py-2 text-xs font-black bg-m3-primary text-m3-on-primary hover:bg-m3-primary/95 shadow-sm rounded-full cursor-pointer h-9 shrink-0 self-end transition-transform active:scale-95"
                  >
                    Insert Item
                  </button>
                </div>
              </div>
            )}

            {/* Added Draft items table */}
            <div className="md:col-span-2 space-y-2 border-t border-m3-outline-variant/15 pt-3 max-h-[160px] overflow-y-auto">
              <h4 className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">
                Selected Draft Items ({draftItems.length})
              </h4>

              {draftItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-3.5 bg-m3-surface border border-m3-outline-variant/35 rounded-2xl shadow-sm"
                >
                  <div>
                    <h5 className="text-xs font-bold text-m3-on-surface">
                      {getProductName(item.productId)}
                    </h5>
                    <span className="text-[10px] text-m3-on-surface-variant font-mono">
                      Supplier Unit Cost: ₱{item.costPrice.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold font-mono">
                      Volume Requested: {item.quantityRequested}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeDraftItem(item.productId)}
                      className="text-m3-primary hover:text-red-500 cursor-pointer p-1 rounded-full hover:bg-m3-outline-variant/15 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              {draftItems.length === 0 && (
                <div className="text-center py-4 text-xs text-m3-on-surface-variant italic">
                  No products compiled in PO draft yet.
                </div>
              )}
            </div>

            {/* Note fields */}
            <div className="md:col-span-2 space-y-1 relative">
              <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">
                Procurement Request Notes (Optional)
              </label>
              <input
                type="text"
                value={poNotes}
                onChange={(e) => setPoNotes(e.target.value)}
                placeholder="e.g. Critical stock refilling"
                className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md"
              />
            </div>

            {/* SAVE AS TEMPLATE AREA */}
            <div className="md:col-span-2 bg-m3-surface-lowest p-3.5 rounded-2xl border border-m3-outline-variant/30 flex flex-col sm:flex-row sm:items-end justify-between gap-3 my-0.5">
              <div className="space-y-1.5 flex-1 text-left">
                <label className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest pl-1">
                  Save current draft specs as PO template
                </label>
                <input
                  type="text"
                  value={templateNameInput}
                  onChange={(e) => setTemplateNameInput(e.target.value)}
                  placeholder="e.g. Weekly Restock - Supplier A"
                  className="w-full bg-m3-surface border border-m3-outline-variant px-3 py-1.5 text-xs text-m3-on-surface focus:outline-none focus:border-m3-primary transition-colors rounded-lg font-medium"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!templateNameInput.trim()) {
                    showToast("Validation check: Template name is required.");
                    return;
                  }
                  if (draftItems.length === 0) {
                    showToast("Validation check: Draft item list is empty.");
                    return;
                  }
                  const newTemplate = {
                    id: `TMP-${Date.now()}`,
                    name: templateNameInput.trim(),
                    supplierId: selectedSupplierId,
                    branchId: selectedBranchId,
                    items: [...draftItems],
                    notes: poNotes,
                  };
                  const updatedTemplates = [...poTemplates, newTemplate];
                  setPoTemplates(updatedTemplates);
                  localStorage.setItem(
                    "tp_po_templates",
                    JSON.stringify(updatedTemplates),
                  );
                  setTemplateNameInput("");
                  showToast(
                    `Saved template "${newTemplate.name}" successfully.`,
                  );
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-950 text-xs font-black rounded-full h-8 shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                Save as PO Template
              </button>
            </div>

            {/* Action buttons */}
            <div className="md:col-span-2 flex justify-end gap-2 border-t border-m3-outline-variant/20 pt-4 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowPOModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-m3-outline-variant/15 text-m3-on-surface-variant transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePO}
                className="m3-btn-primary px-5 py-2 text-xs shadow-sm cursor-pointer"
              >
                Save and Draft PO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Receive PO Cargo Delivery */}
      {showReceiveModal && activePo && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
          <div
            className="absolute inset-0 bg-gray-950/65 backdrop-blur-sm"
            onClick={() => setShowReceiveModal(false)}
          />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface text-left space-y-4">
            <div className="flex justify-between items-center border-b border-m3-outline-variant/20 pb-2.5">
              <h3 className="text-base font-bold text-m3-primary flex items-center gap-2">
                <Truck className="h-5 w-5" />
                <span>Deliver cargo: {activePo.poNumber}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowReceiveModal(false)}
                className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-m3-on-surface-variant/80 mt-1 leading-relaxed">
              Specify quantities actually received at warehouse loading dock.
              Partially received POs will stay open.
            </p>

            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
              {poItems
                .filter((item) => item.poId === activePo.id)
                .map((item, idx) => {
                  const pendingCount = Math.max(
                    0,
                    item.quantityRequested - item.quantityReceived,
                  );
                  return (
                    <div
                      key={idx}
                      className="p-3 bg-m3-surface border border-m3-outline-variant/35 rounded-2xl flex justify-between items-center shadow-sm"
                    >
                      <div>
                        <h5 className="text-xs font-bold text-m3-on-surface">
                          {getProductName(item.productId)}
                        </h5>
                        <div className="text-[10px] text-m3-on-surface-variant flex items-center gap-1.5 mt-0.5 font-mono">
                          <span>Requested: {item.quantityRequested}</span>
                          <span>•</span>
                          <span>Already Recv: {item.quantityReceived}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-m3-primary uppercase font-mono pl-1">
                          Newly Recv:
                        </label>
                        <input
                          type="number"
                          max={pendingCount}
                          value={receiveQuantities[item.productId] ?? 0}
                          onChange={(e) => {
                            const val = Math.min(
                              pendingCount,
                              Math.max(0, Number(e.target.value) || 0),
                            );
                            setReceiveQuantities((prev) => ({
                              ...prev,
                              [item.productId]: val,
                            }));
                          }}
                          className="w-16 bg-m3-surface-lowest border-b-2 border-m3-outline-variant font-mono font-bold text-center text-xs text-m3-on-surface focus:outline-none focus:border-m3-primary transition-colors py-1"
                        />
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="flex justify-end gap-2 border-t border-m3-outline-variant/20 pt-4 flex-shrink-0">
              <button
                onClick={() => setShowReceiveModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-m3-outline-variant/15 text-m3-on-surface-variant transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={submitCargoReceived}
                className="m3-btn-primary px-5 py-2 text-xs shadow-sm cursor-pointer"
              >
                Log Cargo Inflow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Supplier Profile Manager (Create / Edit Supplier) */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
          <div
            className="absolute inset-0 bg-gray-950/65 backdrop-blur-sm"
            onClick={() => setShowSupplierModal(false)}
          />
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface text-left space-y-4">
            <div className="flex justify-between items-center border-b border-m3-outline-variant/20 pb-2.5">
              <h3 className="text-base font-bold text-m3-primary flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                <span>
                  {editingSupplierId
                    ? "Modify Company Profile"
                    : "Register New Vendor Supplier"}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSupplierModal(false)}
                className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-m3-on-surface-variant/85 mt-1">
              Add corporate contact records. Suppliers can then be selected to
              provide products and fulfill purchase order requests.
            </p>

            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">
                  Supplier Company Name
                </label>
                <input
                  type="text"
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="e.g. Republic Cement Corp."
                  className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-lg font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">
                  Primary Contact Agent
                </label>
                <input
                  type="text"
                  value={supContactPerson}
                  onChange={(e) => setSupContactPerson(e.target.value)}
                  placeholder="e.g. Engr. Juan Dela Cruz"
                  className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">
                    Phone Target
                  </label>
                  <input
                    type="text"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    placeholder="e.g. +63 917 888 1234"
                    className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-lg font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">
                    Corporate Email
                  </label>
                  <input
                    type="email"
                    value={supEmail}
                    onChange={(e) => setSupEmail(e.target.value)}
                    placeholder="e.g. sales@republiccement.com"
                    className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-lg"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">
                  Physical HQ Address
                </label>
                <textarea
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  placeholder="e.g. Sector 4, Boulevard Parkway, Dipolog City"
                  rows={2}
                  className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-lg resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-m3-outline-variant/20 pt-4 flex-shrink-0">
              <button
                onClick={() => setShowSupplierModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-m3-outline-variant/15 text-m3-on-surface-variant transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSupplier}
                className="m3-btn-primary px-5 py-2 text-xs shadow-sm cursor-pointer"
              >
                Commit Supplier Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Brand Profile Manager (Create / Edit Brand) */}
      {showBrandModal && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
          <div
            className="absolute inset-0 bg-gray-950/65 backdrop-blur-sm"
            onClick={() => setShowBrandModal(false)}
          />
          <div className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface text-left space-y-4">
            <div className="flex justify-between items-center border-b border-m3-outline-variant/20 pb-2.5">
              <h3 className="text-base font-bold text-m3-primary flex items-center gap-2">
                <Tag className="h-5 w-5" />
                <span>
                  {editingBrandId
                    ? "Modify Brand Partnership"
                    : "Register New Manufacturer Brand"}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowBrandModal(false)}
                className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-[11px] text-m3-on-surface-variant/85 leading-relaxed mt-1">
              Associate a brand name with a specific vendor supplier. This
              automates PO consolidation when order requests are compiled for
              low-stock items.
            </p>

            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. Mariwasa, ROYU, Matimco"
                  className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-lg font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">
                  Authorized Supplier Partner
                </label>
                <select
                  value={brandSupplierId}
                  onChange={(e) => setBrandSupplierId(e.target.value)}
                  className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-lg font-bold"
                >
                  {suppliers
                    .filter((s) => !s.isDeleted)
                    .map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">
                  Description / Notes
                </label>
                <textarea
                  value={brandDescription}
                  onChange={(e) => setBrandDescription(e.target.value)}
                  placeholder="e.g. Premium decorative tiles..."
                  rows={2}
                  className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-lg resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-m3-outline-variant/15">
              <button
                type="button"
                onClick={() => setShowBrandModal(false)}
                className="flex-1 py-2 bg-m3-surface hover:bg-m3-surface-low text-m3-on-surface-variant hover:text-m3-on-surface border border-m3-outline-variant/45 font-bold rounded-full text-xs uppercase cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBrand}
                className="flex-1 py-2 bg-m3-primary hover:bg-m3-primary/95 text-m3-on-primary font-bold rounded-full text-xs uppercase cursor-pointer shadow-sm text-center"
              >
                Save Mapping
              </button>
            </div>
          </div>
        </div>
      )}

      {showExportModal && selectedPoForExport && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-zinc-950/75 backdrop-blur-sm [color-scheme:light] print:p-0 print:bg-white overflow-y-auto">
          <div
            className="absolute inset-0 bg-transparent print:hidden"
            onClick={() => setShowExportModal(false)}
          />

          <div className="bg-[#1c1e26] dark:bg-[#1c1e26] border border-zinc-850 rounded-3xl max-w-3xl w-full p-6 shadow-2xl relative flex flex-col max-h-[92vh] z-10 print:bg-white print:border-0 print:shadow-none print:p-0 print:max-h-none print:w-full">
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-4 mb-4 shrink-0 print:hidden text-white">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-extrabold uppercase tracking-wider font-mono">
                  Purchase Order Transmittal Sheet
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-[10.5px] font-black uppercase tracking-wider rounded-xl cursor-pointer flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Printer className="h-3.5 w-3.5" /> Print / Export PDF
                </button>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 print:overflow-visible print:p-0">
              <div
                id="printable-po"
                className="bg-white text-zinc-900 p-8 rounded-2xl shadow-inner border border-zinc-200/80 font-sans text-xs flex flex-col space-y-6 print:border-0 print:shadow-none print:p-0 print:bg-white print:text-black"
              >
                <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-center p-0.5 overflow-hidden shrink-0">
                      {companyLogo ? (
                        <img
                          src={companyLogo}
                          alt="Corporate Logo"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="font-black text-xs text-zinc-800 tracking-wider">
                          {companyName.toUpperCase().slice(0, 2)}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-zinc-900 uppercase tracking-tight">
                        {companyName}
                      </h4>
                      <p className="text-[10px] text-zinc-500">
                        Retail &amp; Supply Logistics Terminal
                      </p>
                      {(() => {
                        const exportingBranch = branches.find(
                          (b) => b.id === selectedPoForExport.branchId,
                        );
                        return (
                          exportingBranch && (
                            <p className="text-[9px] text-zinc-400 font-mono mt-0.5">
                              Hometown Branch: {exportingBranch.name} •{" "}
                              {exportingBranch.phone}
                            </p>
                          )
                        );
                      })()}
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-lg font-black text-zinc-900 tracking-wide uppercase">
                      PURCHASE ORDER
                    </h2>
                    <div className="font-mono mt-1 space-y-0.5 text-[10px]">
                      <div className="text-zinc-650">
                        Ref ID:{" "}
                        <span className="font-extrabold text-zinc-900">
                          {selectedPoForExport.poNumber}
                        </span>
                      </div>
                      <div className="text-zinc-500">
                        Date Requested:{" "}
                        <span className="font-extrabold text-zinc-800">
                          {selectedPoForExport.date}
                        </span>
                      </div>
                      <div className="text-zinc-500">
                        Status Code:{" "}
                        <span className="px-1.5 py-0.5 bg-zinc-100 uppercase rounded text-[9px] font-black border border-zinc-300 text-zinc-800">
                          {selectedPoForExport.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 leading-relaxed">
                  <div className="p-3.5 border border-zinc-200 rounded-xl bg-zinc-50/50">
                    <h5 className="font-extrabold text-zinc-500 text-[9px] uppercase tracking-wider mb-1.5 border-b border-zinc-250 pb-0.5">
                      Origin Vendor (Supplier)
                    </h5>
                    <div className="space-y-0.5 text-[10.5px]">
                      {(() => {
                        const exportingSupplier = suppliers.find(
                          (s) => s.id === selectedPoForExport.supplierId,
                        );
                        return exportingSupplier ? (
                          <>
                            <div className="font-black text-zinc-900">
                              {exportingSupplier.name}
                            </div>
                            <div className="text-zinc-700 font-sans">
                              Contact Agent:{" "}
                              <span className="font-bold">
                                {exportingSupplier.contactPerson || "N/A"}
                              </span>
                            </div>
                            <div className="text-zinc-650 font-sans">
                              Direct Phone: {exportingSupplier.phone || "N/A"}
                            </div>
                            <div className="text-zinc-650 font-sans">
                              Direct Email: {exportingSupplier.email || "N/A"}
                            </div>
                            <div className="text-zinc-500 font-sans mt-1 max-w-[300px]">
                              Address: {exportingSupplier.address || "N/A"}
                            </div>
                          </>
                        ) : (
                          <div className="text-zinc-400 italic text-[10px]">
                            Supplier record missing from repository bounds
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="p-3.5 border border-zinc-200 rounded-xl bg-zinc-50/50">
                    <h5 className="font-extrabold text-zinc-500 text-[9px] uppercase tracking-wider mb-1.5 border-b border-zinc-250 pb-0.5">
                      Ship Delivery Destination
                    </h5>
                    <div className="space-y-0.5 text-[10.5px]">
                      <div className="font-black text-zinc-900">
                        {companyName}
                      </div>
                      {(() => {
                        const exportingBranch = branches.find(
                          (b) => b.id === selectedPoForExport.branchId,
                        );
                        return exportingBranch ? (
                          <>
                            <div className="text-zinc-750 font-sans">
                              Branch:{" "}
                              <span className="font-extrabold">
                                {exportingBranch.name}
                              </span>
                            </div>
                            <div className="text-zinc-650 font-sans">
                              Telephone: {exportingBranch.phone || "N/A"}
                            </div>
                            <div className="text-zinc-600 font-sans mt-0.5 max-w-[300px]">
                              Delivery HQ Address:{" "}
                              {exportingBranch.address || "N/A"}
                            </div>
                            <div className="text-zinc-500 font-sans mt-0.5">
                              Ordered By Agent:{" "}
                              <span className="font-mono">
                                {selectedPoForExport.requestedBy}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-zinc-640">
                              Registered Corporate Hub
                            </div>
                            <div className="text-zinc-500 mt-0.5">
                              Ordered By Agent:{" "}
                              <span className="font-mono">
                                {selectedPoForExport.requestedBy}
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="border border-zinc-200 rounded-xl overflow-hidden mt-2">
                  <table className="w-full text-left font-sans text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-100 text-zinc-700 font-extrabold text-[9px] uppercase tracking-wider border-b border-zinc-200">
                        <th className="py-2.5 px-3">Catalog Item Code</th>
                        <th className="py-2.5 px-3">
                          Material Segment Description
                        </th>
                        <th className="py-2.5 px-3 text-center">
                          Qty Required
                        </th>
                        <th className="py-2.5 px-3 text-right">
                          Raw Cost Unit
                        </th>
                        <th className="py-2.5 px-3 text-right">Sum Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-150">
                      {(() => {
                        const exportingPoItems = poItems.filter(
                          (item) => item.poId === selectedPoForExport.id,
                        );
                        return exportingPoItems.map((item) => {
                          const product = products.find(
                            (p) => p.id === item.productId,
                          );
                          const lineTotal =
                            item.costPrice * item.quantityRequested;
                          return (
                            <tr
                              key={item.id}
                              className="hover:bg-zinc-50/50 text-zinc-800"
                            >
                              <td className="py-2.5 px-3 font-mono font-bold text-zinc-900 text-[10px]">
                                {product?.sku || item.productId}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="font-bold text-zinc-900">
                                  {product?.productName ||
                                    "Unknown Tile Material"}
                                </span>
                                {product?.category && (
                                  <span className="text-[9px] text-zinc-400 block font-mono">
                                    {product.category}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold">
                                {item.quantityRequested} pcs
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono">
                                {currencySymbol}
                                {item.costPrice.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-900">
                                {currencySymbol}
                                {lineTotal.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                      {poItems.filter(
                        (item) => item.poId === selectedPoForExport.id,
                      ).length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-6 text-center text-zinc-400 italic"
                          >
                            No products compiled inside this purchase order.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-2 leading-relaxed">
                  <div className="space-y-2">
                    <div className="p-3 border border-zinc-150 rounded-xl bg-zinc-50/20 text-[9.5px]">
                      <h6 className="font-black text-zinc-800 tracking-wider uppercase text-[8.5px] mb-1">
                        Logistics Notes / Directives
                      </h6>
                      <p className="text-zinc-600 italic whitespace-pre-wrap">
                        {selectedPoForExport.notes ||
                          "No custom transmittal notes declared."}
                      </p>
                    </div>
                    <div className="space-y-1 text-[9.5px] text-zinc-500 font-mono">
                      <div>Transmittal Security Hash: sealed</div>
                      <div>System ID Seal: {selectedPoForExport.id}</div>
                    </div>
                  </div>

                  {(() => {
                    const exportingPoItems = poItems.filter(
                      (item) => item.poId === selectedPoForExport.id,
                    );
                    const exportingSubtotal = exportingPoItems.reduce(
                      (acc, curr) =>
                        acc + curr.costPrice * curr.quantityRequested,
                      0,
                    );
                    const exportingTaxAmount =
                      (exportingSubtotal * taxRate) / 100;
                    const exportingGrandTotal =
                      exportingSubtotal + exportingTaxAmount;
                    return (
                      <div className="flex flex-col justify-end space-y-1.5 border border-zinc-200 p-4 rounded-xl bg-zinc-100/30">
                        <div className="flex justify-between items-center text-zinc-600 text-[10px]">
                          <span>Subtotal Weight Amount:</span>
                          <span className="font-mono font-bold">
                            {currencySymbol}
                            {exportingSubtotal.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-zinc-650 text-[10px]">
                          <span>Tax Assessment (VAT {taxRate}%):</span>
                          <span className="font-mono font-bold">
                            {currencySymbol}
                            {exportingTaxAmount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-black text-zinc-900 border-t border-zinc-300 pt-1.5">
                          <span className="uppercase tracking-wide font-sans text-[10px]">
                            Grand Payable Total:
                          </span>
                          <span className="font-mono text-zinc-900 text-sm">
                            {currencySymbol}
                            {exportingGrandTotal.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="pt-10 flex justify-between items-end border-t border-dashed border-zinc-250 text-zinc-700">
                  <div className="text-left w-1/3">
                    <div className="border-b border-zinc-800 text-center pb-1 font-mono font-bold text-[10px] text-zinc-900 min-h-[22px]">
                      {selectedPoForExport.requestedBy}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-zinc-500 text-center font-extrabold mt-1 font-sans">
                      Requisitioned By
                    </div>
                  </div>
                  <div className="text-right w-1/3">
                    <div className="border-b border-zinc-800 text-center pb-1 min-h-[22px]" />
                    <div className="text-[9px] uppercase tracking-wider text-zinc-500 text-center font-extrabold mt-1 font-sans">
                      Authorized Audit Stamp
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <style>{`
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #printable-po, #printable-po * {
                  visibility: visible !important;
                }
                #printable-po {
                  position: fixed !important;
                  left: 0 !important;
                  top: 0 !important;
                  right: 0 !important;
                  bottom: 0 !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  height: 100% !important;
                  margin: 0 !important;
                  padding: 40px !important;
                  border: 0 !important;
                  box-shadow: none !important;
                  background: white !important;
                  color: black !important;
                  padding: 0px !important;
                }
              }
            `}</style>
          </div>
        </div>
      )}

      {/* MODAL 4: Drilldown Purchase Order Requisition Details */}
      {selectedPoDetails && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in text-left">
          <div
            className="absolute inset-0 bg-gray-950/65 backdrop-blur-sm"
            onClick={() => setSelectedPoDetails(null)}
          />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface space-y-4">
            <div className="flex justify-between items-center border-b border-m3-outline-variant/20 pb-3">
              <h3 className="text-base font-black text-m3-primary flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <span>PO Requisition: {selectedPoDetails.poNumber}</span>
              </h3>
              <button
                onClick={() => setSelectedPoDetails(null)}
                className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-m3-surface/30 p-4 rounded-2xl border border-m3-outline-variant/10 text-xs text-m3-on-surface/90">
              <div>
                <span className="block text-[10px] uppercase font-bold text-m3-on-surface-variant">
                  Vendor Partner
                </span>
                <span className="font-bold text-sm text-m3-primary mt-0.5 block">
                  {getSuplierName(selectedPoDetails.supplierId)}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-m3-on-surface-variant">
                  Target Branch
                </span>
                <span className="font-bold text-sm mt-0.5 block">
                  {getBranchName(selectedPoDetails.branchId)}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-m3-on-surface-variant">
                  Status Code
                </span>
                <span className="mt-0.5 block">
                  <span className="px-2 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wider bg-m3-primary-container text-m3-on-primary-container">
                    {selectedPoDetails.status}
                  </span>
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-m3-on-surface-variant">
                  Drafted Date
                </span>
                <span className="font-mono font-bold mt-0.5 block">
                  {selectedPoDetails.date}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase text-m3-primary tracking-wider pl-1">
                Requested Product Items
              </h4>
              <div className="border border-m3-outline-variant/15 rounded-xl overflow-hidden bg-m3-surface-lowest">
                <table className="w-full text-left text-xs">
                  <thead className="bg-m3-surface-low/50 text-[10px] uppercase font-bold text-m3-on-surface-variant border-b border-m3-outline-variant/15">
                    <tr>
                      <th className="py-2.5 px-3">Item Name</th>
                      <th className="py-2.5 px-3">Specs / Code</th>
                      <th className="py-2.5 px-3 text-right">Cost (₱)</th>
                      <th className="py-2.5 px-3 text-center">Req. Qty</th>
                      <th className="py-2.5 px-3 text-center">Recv. Qty</th>
                      <th className="py-2.5 px-3 text-right">Total Est</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-m3-outline-variant/10">
                    {poItems
                      .filter((item) => item.poId === selectedPoDetails.id)
                      .map((item, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-m3-surface-low/30 font-medium"
                        >
                          <td className="py-2 px-3 font-bold text-m3-on-surface">
                            {getProductName(item.productId)}
                          </td>
                          <td className="py-2 px-3 text-[10px] text-m3-on-surface-variant font-mono">
                            {(() => {
                              const prod = products.find(
                                (p) => p.id === item.productId,
                              );
                              return prod
                                ? `${prod.size} (${prod.productCode})`
                                : "Custom Item";
                            })()}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">
                            ₱{item.costPrice.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold">
                            {item.quantityRequested}
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-m3-tertiary font-bold">
                            {item.quantityReceived}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-m3-primary">
                            ₱
                            {(
                              item.costPrice * item.quantityRequested
                            ).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    {poItems.filter(
                      (item) => item.poId === selectedPoDetails.id,
                    ).length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-4 text-center text-m3-on-surface-variant italic"
                        >
                          No segments inside this purchase requisition.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-m3-outline-variant/20 pt-4">
              <div className="text-xs">
                <span className="text-m3-on-surface-variant">
                  Requisition Total Cost:{" "}
                </span>
                <span className="font-extrabold text-sm font-mono text-m3-primary pl-1">
                  ₱
                  {poItems
                    .filter((item) => item.poId === selectedPoDetails.id)
                    .reduce(
                      (sum, item) =>
                        sum + item.costPrice * item.quantityRequested,
                      0,
                    )
                    .toLocaleString()}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedPoForExport(selectedPoDetails);
                    setShowExportModal(true);
                  }}
                  className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-zinc-950 border border-amber-650/15 rounded-full cursor-pointer flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print PO Receipt</span>
                </button>
                <button
                  onClick={() => setSelectedPoDetails(null)}
                  className="px-4 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-m3-outline-variant/15 text-m3-on-surface-variant transition-colors"
                >
                  Close View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Supplier Corporate Profile & Product Catalog */}
      {selectedSupplierCatalog && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in text-left">
          <div
            className="absolute inset-0 bg-gray-950/65 backdrop-blur-sm"
            onClick={() => setSelectedSupplierCatalog(null)}
          />
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface space-y-4">
            <div className="flex justify-between items-center border-b border-m3-outline-variant/20 pb-3">
              <h3 className="text-base font-black text-m3-primary flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                <span>Vendor: {selectedSupplierCatalog.name}</span>
              </h3>
              <button
                onClick={() => setSelectedSupplierCatalog(null)}
                className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-m3-surface/30 p-4 rounded-2xl border border-m3-outline-variant/10 text-xs">
              <div className="space-y-2">
                <h4 className="text-[10px] uppercase font-bold text-m3-primary tracking-widest pl-0.5">
                  Corporate Contacts
                </h4>
                <div className="space-y-1.5 font-medium">
                  <div className="flex items-center gap-2 text-m3-on-surface-variant">
                    <Users className="h-4 w-4 text-zinc-400 shrink-0" />
                    <span>
                      Representative:{" "}
                      <strong className="text-m3-on-surface pl-1">
                        {selectedSupplierCatalog.contactPerson || "N/A"}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-m3-on-surface-variant">
                    <Phone className="h-4 w-4 text-zinc-400 shrink-0" />
                    <span>
                      Phone line:{" "}
                      <strong className="text-m3-on-surface pl-1">
                        {selectedSupplierCatalog.phone || "N/A"}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-m3-on-surface-variant">
                    <Mail className="h-4 w-4 text-zinc-400 shrink-0" />
                    <span>
                      Corporate Email:{" "}
                      <strong className="text-m3-on-surface pl-1">
                        {selectedSupplierCatalog.email || "N/A"}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-[10px] uppercase font-bold text-m3-primary tracking-widest pl-0.5">
                  Registered Location
                </h4>
                <div className="text-m3-on-surface-variant leading-relaxed">
                  <p className="bg-m3-surface-lowest p-2 border border-m3-outline-variant/10 rounded-xl min-h-[50px] font-medium">
                    {selectedSupplierCatalog.address ||
                      "Address information was not registered."}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center pl-1">
                <h4 className="text-xs font-black uppercase text-m3-primary tracking-wider">
                  Product Catalog List (
                  {
                    products.filter(
                      (p) =>
                        !p.isDeleted &&
                        p.supplierId === selectedSupplierCatalog.id,
                    ).length
                  }
                  )
                </h4>
              </div>

              <div className="border border-m3-outline-variant/15 rounded-xl overflow-hidden bg-m3-surface-lowest max-h-[250px] overflow-y-auto">
                <table className="w-full text-left text-xs min-w-[500px]">
                  <thead className="bg-m3-surface-low/50 text-[10px] uppercase font-bold text-m3-on-surface-variant border-b border-m3-outline-variant/15 sticky top-0 bg-m3-surface-low/95 backdrop-blur-sm">
                    <tr>
                      <th className="py-2.5 px-3">Item Name</th>
                      <th className="py-2.5 px-3">Code / SKU</th>
                      <th className="py-2.5 px-3">Specs / Brand</th>
                      <th className="py-2.5 px-3 text-right">Cost Price (₱)</th>
                      <th className="py-2.5 px-3 text-right">Sell Price (₱)</th>
                      <th className="py-2.5 px-3 text-center">In Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-m3-outline-variant/10">
                    {products
                      .filter(
                        (p) =>
                          !p.isDeleted &&
                          p.supplierId === selectedSupplierCatalog.id,
                      )
                      .map((p, idx) => (
                        <tr
                          key={p.id}
                          className="hover:bg-m3-surface-low/30 font-medium"
                        >
                          <td className="py-2 px-3 font-bold text-m3-on-surface">
                            {p.productName}
                          </td>
                          <td className="py-2 px-3 text-[10px] text-m3-on-surface-variant font-mono">
                            <span>{p.productCode}</span>
                            <span className="block opacity-70 text-[9px]">
                              {p.sku}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-[10px] text-m3-on-surface-variant">
                            <span>
                              {p.size} {p.designName && `(${p.designName})`}
                            </span>
                            <span className="block opacity-75 font-semibold text-m3-secondary">
                              {p.brand}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-amber-600 dark:text-amber-400 font-bold">
                            ₱{p.costPrice.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            ₱{p.sellingPrice.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] ${p.stockQuantity <= p.minimumStock ? "bg-amber-500/10 text-amber-500" : "bg-green-500/10 text-green-500"}`}
                            >
                              {p.stockQuantity} {p.unit || "Box"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    {products.filter(
                      (p) =>
                        !p.isDeleted &&
                        p.supplierId === selectedSupplierCatalog.id,
                    ).length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-8 text-center text-m3-on-surface-variant font-medium"
                        >
                          No products linked under this vendor broker catalog.
                          Link products inside Catalog Ledger.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-m3-outline-variant/20 pt-4">
              <button
                onClick={() => setSelectedSupplierCatalog(null)}
                className="px-4 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-m3-outline-variant/15 text-m3-on-surface-variant transition-colors"
              >
                Close Catalog View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success toast alert bar */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-m3-on-surface text-m3-surface text-xs font-bold py-3 px-5 rounded-[16px] shadow-xl z-50 border border-m3-outline-variant/30 flex items-center gap-2 animate-bounce max-w-[280px]">
          <ShieldCheck className="h-4.5 w-4.5 text-m3-tertiary shrink-0" />
          <span className="leading-tight">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
