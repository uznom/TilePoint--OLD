/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useDb, useDbProducts } from "../context/DbContext";
import { generateEan13Barcode } from "../utils/barcodeGenerator";
import { PurchaseOrder, Supplier, Brand, UserRole } from "../types/db";
import { useResponsivePageSize } from "./TablePagination";
import { ToastNotification } from "./ToastNotification";
import { HeaderBar } from "./common/HeaderBar";
import { FileText, Truck, Building2, Tag, ShoppingCart } from "lucide-react";

import {
  PurchaseOrdersTab,
  SuppliersManagementTab,
  BrandsManagementTab,
  PoRequisitionsCartTab,
  CreateEditPoModal,
  ReceivePoModal,
  SupplierModal,
  BrandModal,
  QuickProductModal,
  PoDetailsModal,
  SupplierProfileModal,
  ConsolidationSourcingModal,
  DraftPoItem,
  PoTemplateItem,
  PoCartItem,
} from "./procurement";

interface ProcurementModuleProps {
  darkMode?: boolean;
  defaultTab?: "po" | "suppliers";
}

export const ProcurementModule: React.FC<ProcurementModuleProps> = ({
  defaultTab = "po",
}) => {
  const products = useDbProducts();
  const {
    purchaseOrders,
    poItems,
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

  const [poPage, setPoPage] = useState(1);
  const poPageSize = useResponsivePageSize(64, 460, 10);

  // Reset page when poFilterTab changes
  useEffect(() => {
    setPoPage(1);
  }, [poFilterTab]);

  const [isConfirmingConsolidation, setIsConfirmingConsolidation] = useState(false);
  const [procurementProductSearch, setProcurementProductSearch] = useState("");
  const [showProcurementProductDropdown, setShowProcurementProductDropdown] = useState(false);

  // Core Alignment States for Automated Calendar Scheduling
  const [paymentTerm, setPaymentTerm] = useState<number | "CUSTOM">(30);
  const [payoutDueDate, setPayoutDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [isCustomPayoutDate, setIsCustomPayoutDate] = useState(false);

  // Automatically update payoutDueDate when paymentTerm changes
  useEffect(() => {
    if (paymentTerm !== "CUSTOM") {
      const d = new Date();
      d.setDate(d.getDate() + paymentTerm);
      setPayoutDueDate(d.toISOString().slice(0, 10));
    }
  }, [paymentTerm]);

  useEffect(() => {
    if (currentUser?.role !== UserRole.ADMIN && activeSubTab === "suppliers") {
      setActiveSubTab("po");
    }
  }, [currentUser?.role, activeSubTab]);

  // PO Cart state
  const [poCart, setPoCart] = useState<PoCartItem[]>(() => {
    try {
      const cached = localStorage.getItem("tp_po_cart");
      return cached ? JSON.parse(cached) : [];
    } catch (_) {
      return [];
    }
  });

  const syncPoCart = useCallback((cart: PoCartItem[]) => {
    setPoCart(cart);
    try {
      localStorage.setItem("tp_po_cart", JSON.stringify(cart));
      window.dispatchEvent(new Event("tp_po_cart_updated"));
    } catch (_) {}
  }, []);

  useEffect(() => {
    const handleCartUpdated = () => {
      try {
        const cached = localStorage.getItem("tp_po_cart");
        if (cached) setPoCart(JSON.parse(cached));
      } catch (_) {}
    };
    window.addEventListener("tp_po_cart_updated", handleCartUpdated);
    return () => window.removeEventListener("tp_po_cart_updated", handleCartUpdated);
  }, []);

  // Modal display states
  const [showPOModal, setShowPOModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showQuickProductModal, setShowQuickProductModal] = useState(false);
  const [showPoDetailsModal, setShowPoDetailsModal] = useState(false);
  const [showSupplierProfileModal, setShowSupplierProfileModal] = useState(false);

  // Active Entities for Modals
  const [activePo, setActivePo] = useState<PurchaseOrder | null>(null);
  const [activeSupplierProfile, setActiveSupplierProfile] = useState<Supplier | null>(null);
  const [isEditingSupplier, setIsEditingSupplier] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [isEditingBrand, setIsEditingBrand] = useState(false);
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);

  // Supplier Form State
  const [supplierName, setSupplierName] = useState("");
  const [supplierContact, setSupplierContact] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");
  const [supplierError, setSupplierError] = useState("");

  // Brand Form State
  const [brandName, setBrandName] = useState("");
  const [brandSupplierId, setBrandSupplierId] = useState("");
  const [brandDescription, setBrandDescription] = useState("");
  const [brandError, setBrandError] = useState("");

  // Quick Product Form State
  const [quickProductName, setQuickProductName] = useState("");
  const [quickProductSku, setQuickProductSku] = useState("");
  const [quickProductBarcode, setQuickProductBarcode] = useState("");
  const [quickProductBrand, setQuickProductBrand] = useState("");
  const [quickProductCategory, setQuickProductCategory] = useState("General");
  const [quickProductCost, setQuickProductCost] = useState<number | "">("");
  const [quickProductPrice, setQuickProductPrice] = useState<number | "">("");
  const [quickProductSupplierId, setQuickProductSupplierId] = useState("");

  // Create PO Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.id || "B1");
  const [draftItems, setDraftItems] = useState<DraftPoItem[]>([]);
  const [poNotes, setPoNotes] = useState("");
  const [isSubmittingPo, setIsSubmittingPo] = useState(false);
  const [poTemplates, setPoTemplates] = useState<PoTemplateItem[]>(() => {
    try {
      const cached = localStorage.getItem("tp_po_templates");
      return cached ? JSON.parse(cached) : [];
    } catch (_) {
      return [];
    }
  });

  // Receiving PO Form State
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});
  const [receiveNotes, setReceiveNotes] = useState("");
  const [isReceivingPO, setIsReceivingPO] = useState(false);

  // Toast & Confirmation State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" | "warning" } | null>(null);
  const showToast = useCallback((message: string, type: "success" | "error" | "info" | "warning" = "success") => {
    setToast({ message, type });
  }, []);

  // Handlers
  const handleOpenAddSupplier = () => {
    setIsEditingSupplier(false);
    setEditingSupplierId(null);
    setSupplierName("");
    setSupplierContact("");
    setSupplierEmail("");
    setSupplierPhone("");
    setSupplierAddress("");
    setSupplierError("");
    setShowSupplierModal(true);
  };

  const handleOpenEditSupplier = (sup: Supplier) => {
    setIsEditingSupplier(true);
    setEditingSupplierId(sup.id);
    setSupplierName(sup.name);
    setSupplierContact(sup.contactPerson);
    setSupplierEmail(sup.email || "");
    setSupplierPhone(sup.phone || "");
    setSupplierAddress(sup.address || "");
    setSupplierError("");
    setShowSupplierModal(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim() || !supplierContact.trim()) {
      setSupplierError("Please fill in required fields.");
      return;
    }
    if (isEditingSupplier && editingSupplierId) {
      await updateSupplier(editingSupplierId, {
        name: supplierName.trim(),
        contactPerson: supplierContact.trim(),
        email: supplierEmail.trim(),
        phone: supplierPhone.trim(),
        address: supplierAddress.trim(),
      });
      showToast(`Supplier "${supplierName}" updated successfully.`);
    } else {
      await createSupplier({
        name: supplierName.trim(),
        contactPerson: supplierContact.trim(),
        email: supplierEmail.trim(),
        phone: supplierPhone.trim(),
        address: supplierAddress.trim(),
      });
      showToast(`Supplier "${supplierName}" registered successfully.`);
    }
    setShowSupplierModal(false);
  };

  const handleDeleteSupplier = async (sup: Supplier) => {
    if (window.confirm(`Are you sure you want to deactivate vendor "${sup.name}"?`)) {
      await deleteSupplier(sup.id);
      showToast(`Supplier "${sup.name}" deactivated.`);
    }
  };

  const handleOpenAddBrand = () => {
    setIsEditingBrand(false);
    setEditingBrandId(null);
    setBrandName("");
    setBrandSupplierId(suppliers[0]?.id || "");
    setBrandDescription("");
    setBrandError("");
    setShowBrandModal(true);
  };

  const handleOpenEditBrand = (brand: Brand) => {
    setIsEditingBrand(true);
    setEditingBrandId(brand.id);
    setBrandName(brand.name);
    setBrandSupplierId(brand.supplierId || "");
    setBrandDescription(brand.description || "");
    setBrandError("");
    setShowBrandModal(true);
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim() || !brandSupplierId) {
      setBrandError("Please fill in all required fields.");
      return;
    }
    if (isEditingBrand && editingBrandId) {
      await updateBrand(editingBrandId, {
        name: brandName.trim(),
        supplierId: brandSupplierId,
        description: brandDescription.trim(),
      });
      showToast(`Brand "${brandName}" updated.`);
    } else {
      await createBrand({
        name: brandName.trim(),
        supplierId: brandSupplierId,
        description: brandDescription.trim(),
      });
      showToast(`Brand "${brandName}" cataloged.`);
    }
    setShowBrandModal(false);
  };

  const handleDeleteBrand = async (brand: Brand) => {
    if (window.confirm(`Are you sure you want to delete brand "${brand.name}"?`)) {
      await deleteBrand(brand.id);
      showToast(`Brand "${brand.name}" removed.`);
    }
  };

  const handleOpenCreatePo = () => {
    setSelectedSupplierId(suppliers[0]?.id || "");
    setSelectedBranchId(branches[0]?.id || "B1");
    setDraftItems([]);
    setPoNotes("");
    setShowPOModal(true);
  };

  const handleSavePo = async () => {
    if (!selectedSupplierId || !selectedBranchId || draftItems.length === 0) {
      showToast("Select a supplier, branch, and at least one item.", "error");
      return;
    }
    setIsSubmittingPo(true);
    try {
      await createPO(
        selectedSupplierId,
        selectedBranchId,
        draftItems.map((item) => ({
          productId: item.productId,
          costPrice: item.costPrice,
          quantityRequested: item.quantity,
        })),
        poNotes,
        "Pending",
        "terms",
        new Date().toISOString().slice(0, 10),
        payoutDueDate,
        typeof paymentTerm === "number" ? paymentTerm : 30
      );

      showToast("Purchase order drafted successfully!");
      setShowPOModal(false);
    } catch (err) {
      showToast("Error creating purchase order.", "error");
    } finally {
      setIsSubmittingPo(false);
    }
  };

  const handleOpenReceiveModal = (po: PurchaseOrder) => {
    setActivePo(po);
    const initialQuantities: Record<string, number> = {};
    const items = poItems.filter((i) => i.poId === po.id);
    items.forEach((item) => {
      initialQuantities[item.id] = Math.max(0, (item.quantityRequested || 0) - (item.quantityReceived || 0));
    });
    setReceivedQuantities(initialQuantities);
    setReceiveNotes("");
    setShowReceiveModal(true);
  };

  const handleConfirmReceipt = async () => {
    if (!activePo) return;
    setIsReceivingPO(true);
    try {
      const hasReceived = Object.values(receivedQuantities).some((q) => q > 0);
      if (!hasReceived) {
        showToast("Enter at least one received item count.", "warning");
        setIsReceivingPO(false);
        return;
      }
      await receivePOItems(activePo.id, receivedQuantities, "terms", undefined, payoutDueDate, typeof paymentTerm === "number" ? paymentTerm : 30);
      showToast(`Stock ingested successfully for PO #${activePo.poNumber}!`);
      setShowReceiveModal(false);
    } catch (err) {
      showToast("Failed to process inbound receipt.", "error");
    } finally {
      setIsReceivingPO(false);
    }
  };

  const handleSaveQuickProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickProductName.trim() || !quickProductSku.trim() || quickProductCost === "") {
      showToast("Please fill in all required product fields.", "error");
      return;
    }
    const cost = Number(quickProductCost);
    const price = Number(quickProductPrice) || cost * 1.3;
    const newProduct = await createProduct({
      productName: quickProductName.trim(),
      productCode: quickProductSku.trim(),
      sku: quickProductSku.trim(),
      barcode: quickProductBarcode.trim() || generateEan13Barcode(),
      brand: quickProductBrand.trim() || "Generic",
      category: quickProductCategory.trim() || "Tiles",
      unit: "Box",
      designName: "Standard",
      costPrice: cost,
      sellingPrice: price,
      supplierId: quickProductSupplierId || selectedSupplierId || undefined,
      stockQuantity: 0,
    });

    if (newProduct) {
      setDraftItems((prev) => [
        ...prev,
        {
          productId: newProduct.id,
          productName: newProduct.productName,
          sku: newProduct.sku,
          costPrice: newProduct.costPrice || cost,
          quantity: 20,
        },
      ]);
      showToast(`Product "${newProduct.productName}" added to draft PO!`);
    }
    setShowQuickProductModal(false);
  };

  const handlePrintPo = (po: PurchaseOrder) => {
    showToast(`Printing Official PO Document #${po.poNumber}...`);
    window.print();
  };

  // Grouped cart items for consolidation
  const supplierGroups = useMemo(() => {
    const groups: Record<string, PoCartItem[]> = {};
    poCart.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const supId = prod?.supplierId || "UNASSIGNED";
      if (!groups[supId]) groups[supId] = [];
      groups[supId].push(item);
    });
    return groups;
  }, [poCart, products]);

  const handleConfirmGenerateBatchPOs = async () => {
    const entries = Object.entries(supplierGroups);
    if (entries.length === 0) return;

    for (const [supId, items] of entries) {
      await createPO(
        supId === "UNASSIGNED" ? suppliers[0]?.id || "S1" : supId,
        selectedBranchId,
        items.map((cartItem) => {
          const prod = products.find((p) => p.id === cartItem.productId);
          return {
            productId: cartItem.productId,
            costPrice: prod?.costPrice || 0,
            quantityRequested: cartItem.quantity,
          };
        }),
        "Generated from Floor Restock Requisition Desk",
        "Pending",
        "terms",
        new Date().toISOString().slice(0, 10),
        payoutDueDate,
        typeof paymentTerm === "number" ? paymentTerm : 30
      );
    }

    syncPoCart([]);
    setIsConfirmingConsolidation(false);
    showToast(`Successfully created ${entries.length} purchase orders from requisition cart!`);
    setActiveSubTab("po");
  };

  return (
    <div className="space-y-6">
      <HeaderBar
        title="Procurement & Vendor Supply Chain"
        subtitle="Manage Purchase Orders, Supplier Partnerships, Brand Mapping & Floor Restock Consolidation"
        icon={activeSubTab === "suppliers" ? Building2 : activeSubTab === "brands" ? Tag : Truck}
      />

      {/* Main Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider/20 pb-4">
        <div className="flex items-center gap-2">
          {[
            { id: "po", label: "Purchase Orders", icon: FileText, count: purchaseOrders.length },
            ...(currentUser?.role === UserRole.ADMIN ? [{ id: "suppliers", label: "Suppliers Directory", icon: Building2, count: suppliers.filter((s) => !s.isDeleted).length }] : []),
            { id: "brands", label: "Brands Mapping", icon: Tag, count: brands.filter((b) => !b.isDeleted).length },
            { id: "consolidation", label: "Requisitions Cart", icon: ShoppingCart, count: poCart.length },
          ].map((tab: any) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]"
                    : "bg-content1 hover:bg-content2 text-default-500 hover:text-foreground border border-divider/20"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-black ${
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-content2 text-default-500"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Active Sub Tab */}
      {activeSubTab === "po" && (
        <PurchaseOrdersTab
          purchaseOrders={purchaseOrders}
          suppliers={suppliers}
          branches={branches}
          currentUser={currentUser}
          poFilterTab={poFilterTab}
          setPoFilterTab={setPoFilterTab}
          poPage={poPage}
          setPoPage={setPoPage}
          poPageSize={poPageSize}
          onOpenCreatePo={handleOpenCreatePo}
          onViewPoDetails={(po) => {
            setActivePo(po);
            setShowPoDetailsModal(true);
          }}
          onOpenReceiveModal={handleOpenReceiveModal}
          onPrintPo={handlePrintPo}
          onUpdatePoStatus={updatePOStatus}
        />
      )}

      {activeSubTab === "suppliers" && (
        <SuppliersManagementTab
          suppliers={suppliers}
          currentUser={currentUser}
          onOpenAddSupplier={handleOpenAddSupplier}
          onOpenEditSupplier={handleOpenEditSupplier}
          onDeleteSupplier={handleDeleteSupplier}
          onViewSupplierProfile={(sup) => {
            setActiveSupplierProfile(sup);
            setShowSupplierProfileModal(true);
          }}
        />
      )}

      {activeSubTab === "brands" && (
        <BrandsManagementTab
          brands={brands}
          suppliers={suppliers}
          currentUser={currentUser}
          onOpenAddBrand={handleOpenAddBrand}
          onOpenEditBrand={handleOpenEditBrand}
          onDeleteBrand={handleDeleteBrand}
        />
      )}

      {activeSubTab === "consolidation" && (
        <PoRequisitionsCartTab
          poCart={poCart}
          syncPoCart={syncPoCart}
          products={products}
          suppliers={suppliers}
          branches={branches}
          procurementProductSearch={procurementProductSearch}
          setProcurementProductSearch={setProcurementProductSearch}
          showProcurementProductDropdown={showProcurementProductDropdown}
          setShowProcurementProductDropdown={setShowProcurementProductDropdown}
          onOpenConsolidationModal={() => setIsConfirmingConsolidation(true)}
        />
      )}

      {/* Modals */}
      <CreateEditPoModal
        isOpen={showPOModal}
        onClose={() => setShowPOModal(false)}
        suppliers={suppliers}
        branches={branches}
        products={products}
        selectedSupplierId={selectedSupplierId}
        setSelectedSupplierId={setSelectedSupplierId}
        selectedBranchId={selectedBranchId}
        setSelectedBranchId={setSelectedBranchId}
        draftItems={draftItems}
        setDraftItems={setDraftItems}
        poNotes={poNotes}
        setPoNotes={setPoNotes}
        poTemplates={poTemplates}
        setPoTemplates={setPoTemplates}
        showToast={showToast}
        triggerConfirmation={(title, msg, onConfirm) => {
          if (window.confirm(`${title}: ${msg}`)) onConfirm();
        }}
        isRowClearingBlocked={isRowClearingBlocked}
        getRowClearingBlockedReason={getRowClearingBlockedReason}
        onOpenQuickProductModal={() => setShowQuickProductModal(true)}
        onSavePo={handleSavePo}
        isSubmittingPo={isSubmittingPo}
      />

      <ReceivePoModal
        isOpen={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        activePo={activePo}
        suppliers={suppliers}
        branches={branches}
        poItems={poItems}
        currentUser={currentUser}
        receivedQuantities={receivedQuantities}
        setReceivedQuantities={setReceivedQuantities}
        receiveNotes={receiveNotes}
        setReceiveNotes={setReceiveNotes}
        onConfirmReceipt={handleConfirmReceipt}
        isReceivingPO={isReceivingPO}
      />

      <SupplierModal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        isEditingSupplier={isEditingSupplier}
        supplierName={supplierName}
        setSupplierName={setSupplierName}
        supplierContact={supplierContact}
        setSupplierContact={setSupplierContact}
        supplierEmail={supplierEmail}
        setSupplierEmail={setSupplierEmail}
        supplierPhone={supplierPhone}
        setSupplierPhone={setSupplierPhone}
        supplierAddress={supplierAddress}
        setSupplierAddress={setSupplierAddress}
        supplierError={supplierError}
        onSave={handleSaveSupplier}
      />

      <BrandModal
        isOpen={showBrandModal}
        onClose={() => setShowBrandModal(false)}
        isEditingBrand={isEditingBrand}
        brandName={brandName}
        setBrandName={setBrandName}
        brandSupplierId={brandSupplierId}
        setBrandSupplierId={setBrandSupplierId}
        brandDescription={brandDescription}
        setBrandDescription={setBrandDescription}
        brandError={brandError}
        suppliers={suppliers}
        onSave={handleSaveBrand}
      />

      <QuickProductModal
        isOpen={showQuickProductModal}
        onClose={() => setShowQuickProductModal(false)}
        quickProductName={quickProductName}
        setQuickProductName={setQuickProductName}
        quickProductSku={quickProductSku}
        setQuickProductSku={setQuickProductSku}
        quickProductBarcode={quickProductBarcode}
        setQuickProductBarcode={setQuickProductBarcode}
        quickProductBrand={quickProductBrand}
        setQuickProductBrand={setQuickProductBrand}
        quickProductCategory={quickProductCategory}
        setQuickProductCategory={setQuickProductCategory}
        quickProductCost={quickProductCost}
        setQuickProductCost={setQuickProductCost}
        quickProductPrice={quickProductPrice}
        setQuickProductPrice={setQuickProductPrice}
        quickProductSupplierId={quickProductSupplierId}
        setQuickProductSupplierId={setQuickProductSupplierId}
        brands={brands}
        suppliers={suppliers}
        onSave={handleSaveQuickProduct}
        onGenerateBarcode={() => setQuickProductBarcode(generateEan13Barcode())}
      />

      <PoDetailsModal
        isOpen={showPoDetailsModal}
        onClose={() => setShowPoDetailsModal(false)}
        activePo={activePo}
        suppliers={suppliers}
        branches={branches}
        poItems={poItems}
        onPrintPo={handlePrintPo}
      />

      <SupplierProfileModal
        isOpen={showSupplierProfileModal}
        onClose={() => setShowSupplierProfileModal(false)}
        supplier={activeSupplierProfile}
        products={products}
      />

      <ConsolidationSourcingModal
        isOpen={isConfirmingConsolidation}
        onClose={() => setIsConfirmingConsolidation(false)}
        supplierGroups={supplierGroups}
        suppliers={suppliers}
        branches={branches}
        poDestinationBranch={selectedBranchId}
        setPoDestinationBranch={setSelectedBranchId}
        paymentTerm={paymentTerm}
        setPaymentTerm={setPaymentTerm}
        payoutDueDate={payoutDueDate}
        setPayoutDueDate={setPayoutDueDate}
        isCustomPayoutDate={isCustomPayoutDate}
        setIsCustomPayoutDate={setIsCustomPayoutDate}
        onConfirmGeneratePOs={handleConfirmGenerateBatchPOs}
      />

      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};
