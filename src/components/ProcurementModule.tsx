/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useDb, useDbProducts } from "../context/DbContext";
import { formatCurrency } from "../utils/formatters";
import { generateEan13Barcode } from "../utils/barcodeGenerator";
import { PurchaseOrder, UserRole } from "../types/db";
import { TablePagination, useResponsivePageSize } from "./TablePagination";
import { ToastNotification } from "./ToastNotification";
import { HeaderBar } from "./common/HeaderBar";
import { HeroButton } from "./common/ui/HeroButton";
import {
 FileText,
 Truck,
 Plus,
 X,
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
 Settings2,
 ChevronRight,
 Calendar,
 CreditCard,
} from "lucide-react";

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

 const [poPage, setPoPage] = useState(1);
 const poPageSize = useResponsivePageSize(64, 460, 10);

 // Reset page when poFilterTab changes
 useEffect(() => {
 setPoPage(1);
 }, [poFilterTab]);

 const [isConfirmingConsolidation, setIsConfirmingConsolidation] =
 useState(false);
 const [procurementProductSearch, setProcurementProductSearch] = useState("");
 const [showProcurementProductDropdown, setShowProcurementProductDropdown] =
 useState(false);

 // Core Alignment States for Automated Calendar Scheduling
 const [paymentTerm, setPaymentTerm] = useState<number | "CUSTOM">(30);
 const [payoutDueDate, setPayoutDueDate] = useState(() => {
 const d = new Date();
 d.setDate(d.getDate() + 30);
 return d.toISOString().slice(0, 10);
 });

 // Automatically update payoutDueDate when paymentTerm changes
 React.useEffect(() => {
 if (paymentTerm !== "CUSTOM") {
 const d = new Date();
 d.setDate(d.getDate() + paymentTerm);
 setPayoutDueDate(d.toISOString().slice(0, 10));
 }
 }, [paymentTerm]);

 React.useEffect(() => {
 if (currentUser?.role !== UserRole.ADMIN && activeSubTab === "suppliers") {
 setActiveSubTab("po");
 }
 }, [currentUser?.role, activeSubTab]);

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

 // Cargo Receiving states
 const [receivePaymentMode, setReceivePaymentMode] = useState<"fully_paid" | "terms">("fully_paid");
 const [receiveTermsLength, setReceiveTermsLength] = useState<number>(30); // 30, 60, 90, 120 or 0 (custom)
 const [receiveTermStartDate, setReceiveTermStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
 const [receiveTermEndDate, setReceiveTermEndDate] = useState<string>(() => {
 const d = new Date();
 d.setDate(d.getDate() + 30);
 return d.toISOString().split('T')[0];
 });
 const [showTermsOverride, setShowTermsOverride] = useState(false);

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

 // Find all unique non-empty brand names in active products
 const uniqueInventoryBrands = React.useMemo(() => {
 return Array.from(
 new Set(
 products
 .filter((p) => !p.isDeleted && p.brand && p.brand.trim() !== "")
 .map((p) => p.brand.trim())
 )
 ).sort((a, b) => a.localeCompare(b));
 }, [products]);

 const dynamicCategories = React.useMemo(() => {
 const defaultCats = [
 'Ceramic Tiles',
 'Porcelain Tiles',
 'Vitrified Tiles',
 'Floor Tiles',
 'Wall Tiles',
 'Mosaic Tiles',
 'Decorative Tiles',
 'Bathroom Tiles',
 'Kitchen Tiles',
 'Cement',
 'Sand & Gravel',
 'Steel Bars',
 'Pipes',
 'Fittings',
 'Faucets',
 'Valves',
 'Wires',
 'Switches',
 'Outlets',
 'Breakers',
 'Paints',
 'Primers',
 'Sealants',
 'Hand Tools',
 'Power Tools',
 'Fasteners',
 'Tile Adhesives',
 'Grouts',
 'Doors & Windows'
 ];
 const set = new Set<string>(defaultCats);
 products.forEach(p => {
 if (p.category && p.category.trim() !== '') {
 set.add(p.category.trim());
 }
 });
 return Array.from(set).sort((a, b) => a.localeCompare(b));
 }, [products]);

 // Find unique brands that have NO active brand mapping in brands
 const unmappedBrands = React.useMemo(() => {
 const activeMappedNames = new Set(
 brands
 .filter((b) => !b.isDeleted)
 .map((b) => b.name.trim().toLowerCase())
 );
 return uniqueInventoryBrands.filter(
 (bName) => !activeMappedNames.has(bName.trim().toLowerCase())
 );
 }, [uniqueInventoryBrands, brands]);

 const handleOpenAddBrandForName = (name: string) => {
 setEditingBrandId(null);
 setBrandName(name);
 const firstSupplier = suppliers.filter((s) => !s.isDeleted)[0]?.id || "S1";
 setBrandSupplierId(firstSupplier);
 setBrandDescription(`Auto-detected brand from migrated inventory products.`);
 setShowBrandModal(true);
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
 return currentUser?.branchAssignmentId || branches[0]?.id || "B1";
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

 const updatedBillsList = [...customBills];

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

 const poPaymentMode = paymentTerm === 0 ? "fully_paid" : "terms";
 let poTermsLength: number;
 if (paymentTerm === "CUSTOM") {
 const start = new Date();
 const end = new Date(payoutDueDate);
 const diffTime = end.getTime() - start.getTime();
 poTermsLength = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
 } else {
 poTermsLength = paymentTerm;
 }

  const consolidatedItemsHash = draftItemsInput.map((item) => `${item.productId}:${item.quantityRequested}`).join(",");
  const consolidatedIdempKey = `IDEMP-PO-CONSOL-${supId}-${selectedConsolidationBranchId}-${consolidatedItemsHash}`;

 createPO(
 supId,
 selectedConsolidationBranchId,
 draftItemsInput,
 notes,
 targetStatus as any,
 poPaymentMode,
 new Date().toISOString().slice(0, 10),
 payoutDueDate,
 poTermsLength,
 consolidatedIdempKey,
 );

 if (targetStatus === "Approved") {
 const supRecord = suppliers.find((s) => s.id === supId);
 const linkedBillId =
 "BILL-PO-AUTO-" + Date.now() + "-" + Math.floor(Math.random() * 100);

 const newCreditEntry = {
 id: linkedBillId,
 title: `[Auto PO Liability] ${supRecord ? supRecord.name : "Supplier"} Bulk restock`,
 totalAmount: totalOrderAmount,
 frequency: "ONE_TIME" as const,
 nextDueDate: new Date(payoutDueDate).toISOString(),
 status: "ACTIVE" as const,
 };

 updatedBillsList.push(newCreditEntry);

 addAuditLog(
 "PO_CREDIT_SYNC_AUTO",
 `Auto-dispatched accounts payable credit voucher for ${supRecord ? supRecord.name : supId} via Consolidation Desk. Amount: ₱${totalOrderAmount.toLocaleString()}`,
 "PurchaseOrders",
 linkedBillId,
 JSON.stringify(newCreditEntry),
 );
 }

 poCreatedCount++;
 });

 if (poCreatedCount > 0) {
 if (targetStatus === "Approved") {
 setCustomBills(updatedBillsList);
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
 const [manualSize, setManualSize] = useState("");
 const [manualCostPrice, setManualCostPrice] = useState("");
 const [manualSellingPrice, setManualSellingPrice] = useState("");
 const [manualQtyRequested, setManualQtyRequested] = useState("1");
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

 // Reusable custom styled confirmation dialog
 const [confirmModal, setConfirmModal] = useState<{
 isOpen: boolean;
 title: string;
 message: string;
 onConfirm: () => void;
 confirmText?: string;
 cancelText?: string;
 isDanger?: boolean;
 }>({
 isOpen: false,
 title: "",
 message: "",
 onConfirm: () => {},
 });

 const triggerConfirmation = (
 title: string,
 message: string,
 onConfirm: () => void,
 isDanger: boolean = false,
 confirmText: string = "Confirm",
 cancelText: string = "Cancel"
 ) => {
 setConfirmModal({
 isOpen: true,
 title,
 message,
 onConfirm: () => {
 onConfirm();
 setConfirmModal((prev) => ({ ...prev, isOpen: false }));
 },
 confirmText,
 cancelText,
 isDanger,
 });
 };

 const companyName =
 localStorage.getItem("tilepoint_company_name_v1") || branches[0]?.name || "Main Store";
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
    currentUser?.role === UserRole.ADMIN ||
    currentUser?.role === UserRole.MANAGER;

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
 showToast(`Action Restricted: Cannot remove supplier records because the register is currently holding: ${getRowClearingBlockedReason()}`);
 return;
 }
 triggerConfirmation(
 "Confirm Supplier Deletion",
 `Are you absolutely sure you want to remove supplier "${name}"? Existing purchase orders and catalog records will be kept.`,
 () => {
 deleteSupplier(id);
 showToast(`Supplier "${name}" was soft-deleted.`);
 },
 true,
 "Soft-Delete Supplier",
 "Keep Supplier"
 );
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
 showToast(`Action Restricted: Cannot remove brand records because the register is currently holding: ${getRowClearingBlockedReason()}`);
 return;
 }
 triggerConfirmation(
 "Confirm Brand Deletion",
 `Are you sure you want to remove brand partnership "${name}"? Existing product references will remain intact.`,
 () => {
 deleteBrand(id);
 showToast(`Brand "${name}" was soft-deleted.`);
 },
 true,
 "Soft-Delete Brand",
 "Keep Brand"
 );
 };

 // Reset product selection when switching suppliers to prevent crossed-SKU errors
 React.useEffect(() => {
 setSelectedProdId("");
 }, [selectedSupplierId]);

 // Render lists filtered by chosen supplier in the PO Creator panel
 const activeProductsForSupplier = React.useMemo(() => {
 return products.filter((p) => {
 if (p.isDeleted) return false;

 // If product has an explicit supplierId matching selectedSupplierId
 if (p.supplierId && p.supplierId === selectedSupplierId) {
 return true;
 }

 // If product has a brand, check if that brand belongs to selectedSupplierId
 if (p.brand) {
 const brandMatch = brands.find(
 (b) =>
 b.name.toLowerCase().trim() === p.brand?.toLowerCase().trim() &&
 !b.isDeleted
 );
 if (brandMatch && brandMatch.supplierId === selectedSupplierId) {
 return true;
 }
 }

 // Fallback: if product does not have any brand match or supplierId, let's treat S1 (central) as its owner
 const brandMatch = p.brand ? brands.find(
 (b) =>
 b.name.toLowerCase().trim() === p.brand?.toLowerCase().trim() &&
 !b.isDeleted
 ) : null;

 const productHasSupplier = !!p.supplierId || !!brandMatch;
 if (!productHasSupplier && selectedSupplierId === "S1") {
 return true;
 }

 return false;
 });
 }, [products, selectedSupplierId, brands]);

 const getSuplierName = (id: string) => {
 const s = suppliers.find((sup) => sup.id === id);
 return s ? s.name : "Unknown Supplier";
 };

 const getBranchName = (id: string | null) => {
 if (!id || id === "B1" || id === "main") {
 const stored = localStorage.getItem("tilepoint_company_name_v1");
 if (stored) return stored;
 }
 const b = branches.find((br) => br.id === id);
 if (!b) {
 const stored = localStorage.getItem("tilepoint_company_name_v1");
 if (stored) return stored;
  return branches[0]?.name || "Main Branch";
 }
 return b.name;
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
 const generatedBarcode = generateEan13Barcode();

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
 setManualCostPrice("");
 setManualSellingPrice("");
 setManualQtyRequested("1");
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

 const poPaymentMode = paymentTerm === 0 ? "fully_paid" : "terms";
 let poTermsLength: number;
 if (paymentTerm === "CUSTOM") {
 const start = new Date();
 const end = new Date(payoutDueDate);
 const diffTime = end.getTime() - start.getTime();
 poTermsLength = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
 } else {
 poTermsLength = paymentTerm;
 }

  const directItemsHash = draftItems.map((item) => `${item.productId}:${item.quantityRequested}`).join(",");
  const directIdempKey = `IDEMP-PO-DIRECT-${selectedSupplierId}-${selectedBranchId}-${directItemsHash}-${Date.now().toString().slice(0, 10)}`;

 createPO(
 selectedSupplierId,
 selectedBranchId,
 draftItems,
 poNotes,
 undefined,
 poPaymentMode,
 new Date().toISOString().slice(0, 10),
 payoutDueDate,
 poTermsLength,
 directIdempKey,
 );

 const linkedBillId = "BILL-PO-DIRECT-" + Date.now();
 const newCreditEntry = {
 id: linkedBillId,
 title: `[PO Liability] ${supRecord.name} Manual Request`,
 totalAmount: totalOrderAmount,
 frequency: "ONE_TIME" as const,
 nextDueDate: new Date(payoutDueDate).toISOString(),
 status: "ACTIVE" as const,
 };

 const nextBills = [...customBills, newCreditEntry];
 setCustomBills(nextBills);

 addAuditLog(
 "PO_CREDIT_SYNC",
 `Auto-dispatched accounts payable credit voucher for ${supRecord.name}. Amount: ₱${totalOrderAmount.toLocaleString()} aligned to schedule: ONE_TIME (Paid Once-off)`,
 "PurchaseOrders",
 linkedBillId,
 JSON.stringify(newCreditEntry),
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
 (it.quantityRequested ?? 0) - (it.quantityReceived ?? 0),
 );
 quantities[it.productId] = pendingQty;
 });

 setReceiveQuantities(quantities);
 setShowTermsOverride(false);
 
 // Set initial payment states from PO if already set, or sensible defaults
 setReceivePaymentMode(po.paymentMode || "fully_paid");
 setReceiveTermsLength(po.termsLength || 30);
 setReceiveTermStartDate(po.termStartDate || new Date().toISOString().split('T')[0]);
 if (po.termEndDate) {
 setReceiveTermEndDate(po.termEndDate);
 } else {
 const d = new Date();
 d.setDate(d.getDate() + (po.termsLength || 30));
 setReceiveTermEndDate(d.toISOString().split('T')[0]);
 }
 
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

 receivePOItems(
 activePo.id,
 receiveQuantities,
 receivePaymentMode,
 receivePaymentMode === "terms" ? receiveTermStartDate : undefined,
 receivePaymentMode === "terms" ? receiveTermEndDate : undefined,
 receivePaymentMode === "terms" ? receiveTermsLength : undefined
 );
 setShowReceiveModal(false);
 showToast("Logistics Logged: Inventory stocks and payment terms updated automatically.");
 };

 return (
  <div className="space-y-6 animate-fade-in text-foreground">
  <HeaderBar
    title={
      activeSubTab === "po"
        ? "Supply Logistics & Requisitions"
        : activeSubTab === "suppliers"
        ? "Supplier Registry Management"
        : activeSubTab === "brands"
        ? "Manufacturer Brands Directory"
        : "Automated PO Consolidation Desk"
    }
    subtitle="Manage purchase order requisitions, enterprise suppliers, manufacturer brands, and incoming cargo logistics."
    icon={activeSubTab === "suppliers" ? Building2 : activeSubTab === "brands" ? Tag : Truck}
    badge={{
      text: `${purchaseOrders.length} Orders • ${suppliers.filter((s) => !s.isDeleted).length} Suppliers`,
      variant: 'primary'
    }}
    actions={
      allowedToModify ? (
        activeSubTab === "po" || activeSubTab === "consolidation" ? (
          <HeroButton
            onClick={() => {
              setSelectedSupplierId(
                suppliers.filter((s) => !s.isDeleted)[0]?.id || "S1",
              );
              setSelectedBranchId(currentUser?.branchAssignmentId || "B1");
              setDraftItems([]);
              setShowPOModal(true);
            }}
            color="primary"
            variant="solid"
            size="md"
            startContent={<Plus className="h-4 w-4" />}
          >
            Requisition PO
          </HeroButton>
        ) : activeSubTab === "suppliers" ? (
          <HeroButton
            onClick={handleOpenAddSupplier}
            color="primary"
            variant="solid"
            size="md"
            startContent={<Plus className="h-4 w-4" />}
          >
            Register Supplier
          </HeroButton>
        ) : (
          <HeroButton
            onClick={handleOpenAddBrand}
            color="primary"
            variant="solid"
            size="md"
            startContent={<Plus className="h-4 w-4" />}
          >
            Register Sourced Brand
          </HeroButton>
        )
      ) : undefined
    }
  />

 {/* Submodule Level Navigation Tabs */}
 <div className="flex flex-wrap gap-1.5 md:gap-2 border border-divider/20 items-center sticky top-0 bg-background/95 backdrop-blur-md z-30 p-2 rounded-xl shadow-sm mb-4">
 <button
 onClick={() => {
 setActiveSubTab("po");
 setIsConfirmingConsolidation(false);
 }}
 className={`flex items-center gap-2 py-2 px-3.5 md:px-4 text-xs font-black uppercase tracking-wider transition-all duration-200 rounded-lg ${
 activeSubTab === "po"
 ? "bg-primary text-primary-foreground shadow-sm font-black"
 : "text-default-500 hover:text-foreground hover:bg-content1"
 }`}
 >
 <FileText className="h-4 w-4" />
 <span>Requisitions (PO)</span>
 </button>
 {currentUser?.role === UserRole.ADMIN && (
 <button
 onClick={() => {
 setActiveSubTab("suppliers");
 setIsConfirmingConsolidation(false);
 }}
 className={`flex items-center gap-2 py-2 px-3.5 md:px-4 text-xs font-black uppercase tracking-wider transition-all duration-200 rounded-lg ${
 activeSubTab === "suppliers"
 ? "bg-primary text-primary-foreground shadow-sm font-black"
 : "text-default-500 hover:text-foreground hover:bg-content1"
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
 className={`flex items-center gap-2 py-2 px-3.5 md:px-4 text-xs font-black uppercase tracking-wider transition-all duration-200 rounded-lg ${
 activeSubTab === "brands"
 ? "bg-primary text-primary-foreground shadow-sm font-black"
 : "text-default-500 hover:text-foreground hover:bg-content1"
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
 className={`flex items-center gap-2 py-2 px-3.5 md:px-4 text-xs font-black uppercase tracking-wider transition-all duration-200 rounded-lg ${
 activeSubTab === "consolidation"
 ? "bg-primary text-primary-foreground shadow-sm font-black"
 : "text-default-500 hover:text-foreground hover:bg-content1"
 }`}
 >
 <Settings2
 className={`h-4 w-4 ${poCart.length > 0 ? "text-emerald-500" : "text-default-500"}`}
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
 <div className="flex flex-wrap gap-2 items-center bg-content1/50 p-2 rounded-xl border border-divider/15">
 <button
 onClick={() => setPoFilterTab("all")}
 className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-2 ${
 poFilterTab === "all"
 ? "bg-primary text-primary-foreground shadow-sm"
 : "hover:bg-background text-default-500"
 }`}
 >
 <span>All Requisitions Ledger</span>
 <span
 className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
 poFilterTab === "all"
 ? "bg-primary-foreground/20 text-primary-foreground font-black"
 : "bg-default-100 text-foreground"
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
 : "hover:bg-background text-default-500"
 }`}
 >
 <FileText className="h-3.5 w-3.5" />
 <span>Pending &amp; Drafts</span>
 <span
 className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
 poFilterTab === "pending"
 ? "bg-white/20 text-white font-black"
 : "bg-default-100 text-foreground"
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
 : "hover:bg-background text-default-500"
 }`}
 >
 <Truck className="h-3.5 w-3.5" />
 <span>Direct Outsourcing Deck</span>
 <span
 className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
 poFilterTab === "outsourcing"
 ? "bg-white/20 text-white font-black"
 : "bg-default-100 text-foreground"
 }`}
 >
 {outsourcingCount}
 </span>
 </button>
 </div>

 <div className="bg-content1 border border-divider rounded-large shadow-small text-foreground shadow-sm p-0 overflow-hidden">
 <div className="overflow-auto scrollbar-thin scrollbar-thumb-divider h-[58vh] md:h-[64vh] lg:h-[68vh] min-h-[380px]">
 <table className="w-full text-left border-collapse table-auto text-xs min-w-[1000px] font-sans">
 <thead>
 <tr className="border-b border-divider/20 bg-background/30 text-[10px] uppercase font-bold text-default-500 tracking-wider">
 <th className="py-3 px-4 w-28">PO Number</th>
 <th className="py-3 px-4">Date</th>
 <th className="py-3 px-4">Supplier</th>
 <th className="py-3 px-4 text-right">Subtotal</th>
 <th className="py-3 px-4 text-right">VAT (12%)</th>
 <th className="py-3 px-4 text-right">Discount</th>
 <th className="py-3 px-4 text-right">Total Paid</th>
 <th className="py-3 px-4 text-center">Status</th>
 <th className="py-3 px-4 text-center w-48">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-divider/10 text-[11px] text-default-700">
 {filteredPurchaseOrders
 .slice((poPage - 1) * poPageSize, poPage * poPageSize)
 .map((po) => {
 const relatedPoItems = poItems.filter(
 (item) => item.poId === po.id,
 );
 let statusBadge =
 "bg-default-100 text-foreground";
 if (po.status === "Pending")
 statusBadge =
 "bg-primary-50 text-primary-700 border-primary/25";
 if (po.status === "Approved" || po.status === "Ordered")
 statusBadge =
 "bg-secondary-50 text-secondary-700 border border-secondary/25";
 if (po.status === "Completed")
 statusBadge =
 "bg-secondary-50 text-secondary-700 border-transparent";
 if (po.status === "Partially Received")
 statusBadge =
 "bg-content2 text-foreground";

 return (
 <tr
 key={po.id}
 onClick={() => setSelectedPoDetails(po)}
 className="hover:bg-content1/90 cursor-pointer transition-colors font-bold"
 title="Click to view full purchase order (PO) requisition details"
 >
 <td className="py-3.5 px-4 text-primary font-black uppercase hover:underline">
 {po.poNumber}
 </td>

 <td className="py-3.5 px-4 text-default-500 font-sans font-medium">
 {po.date}
 </td>

 <td className="py-3.5 px-4 text-foreground font-sans font-extrabold">
 {getSuplierName(po.supplierId)}
 </td>

 <td className="py-3.5 px-4 text-right text-default-500">
 {formatCurrency(
 relatedPoItems.reduce(
 (s, it) =>
 s + (it.costPrice ?? 0) * (it.quantityRequested ?? 0),
 0,
 )
 )}
 </td>

 <td className="py-3.5 px-4 text-right text-default-500">
 {formatCurrency(
 relatedPoItems.reduce(
 (s, it) =>
 s + (it.costPrice ?? 0) * (it.quantityRequested ?? 0),
 0,
 ) * 0.12
 )}
 </td>

 <td className="py-3.5 px-4 text-right text-rose-500">
 -₱0.00
 </td>

 <td className="py-3.5 px-4 text-right text-primary font-extrabold">
 {formatCurrency(
 relatedPoItems.reduce(
 (s, it) =>
 s + (it.costPrice ?? 0) * (it.quantityRequested ?? 0),
 0,
 ) * 1.12
 )}
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
 className="py-1 px-3 rounded-lg border border-divider/60 hover:border-primary hover:bg-primary/10 transition-all font-sans text-[10px] font-black uppercase text-primary cursor-pointer"
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
 className="py-1 px-3 rounded-lg border border-divider/60 hover:border-primary hover:bg-primary/10 transition-all font-sans text-[10px] font-black uppercase text-primary cursor-pointer"
 >
 Receive Cargo
 </button>
 )}

 {po.status === "Completed" && (
 <span className="text-[10px] text-default-500/70 font-semibold italic font-sans">
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
 className="py-12 text-center text-default-500 font-medium text-xs italic font-sans"
 >
 No purchase order requisitions in this select
 category filters list.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>

 <TablePagination
 currentPage={poPage}
 totalItems={filteredPurchaseOrders.length}
 pageSize={poPageSize}
 onPageChange={setPoPage}
 itemName="purchase orders"
 />
 </>
 );
 })()}
 </div>
 ) : activeSubTab === "suppliers" ? (
 /* Manage Suppliers Directory view */
 <div className="space-y-6">
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
 <div className="bg-content1 p-4 rounded-2xl border border-divider/10 shadow-sm flex items-center gap-4">
 <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
 <Building2 className="h-5 w-5" />
 </div>
 <div>
 <span className="block text-[8px] font-extrabold text-default-500/80 uppercase tracking-widest">Active Vendors</span>
 <div className="text-xl font-black mt-1 text-primary tracking-tight">
 {suppliers.filter((s) => !s.isDeleted).length} Registered
 </div>
 </div>
 </div>

 <div className="bg-content1 p-4 rounded-2xl border border-divider/10 shadow-sm flex items-center gap-4">
 <div className="p-3 rounded-xl bg-secondary/10 text-secondary shrink-0">
 <FileText className="h-5 w-5" />
 </div>
 <div>
 <span className="block text-[8px] font-extrabold text-default-500/80 uppercase tracking-widest">Pending Cargo Orders</span>
 <div className="text-xl font-black mt-1 text-secondary tracking-tight">
 {
 purchaseOrders.filter(
 (po) =>
 po.status !== "Completed" && po.status !== "Cancelled",
 ).length
 }{" "}
 Active POs
 </div>
 </div>
 </div>

 <div className="bg-content1 p-4 rounded-2xl border border-divider/10 shadow-sm flex items-center gap-4">
 <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
 <Package className="h-5 w-5" />
 </div>
 <div>
 <span className="block text-[8px] font-extrabold text-default-500/80 uppercase tracking-widest">Manufacturer Brands</span>
 <div className="text-xl font-black mt-1 text-emerald-600 dark:text-emerald-400 tracking-tight">
 {
 new Set(
 products
 .filter((p) => !p.isDeleted)
 .map((p) => p.brand)
 .filter(Boolean),
 ).size
 }{" "}
 Brands
 </div>
 </div>
 </div>
 </div>

 <div className="bg-content1 border border-divider rounded-large shadow-small text-foreground shadow-sm overflow-x-auto p-0">
 <table className="w-full text-xs text-left border-collapse table-auto min-w-[900px] font-sans">
 <thead>
 <tr className="border-b border-divider/20 bg-background/30 text-[9px] uppercase font-black text-default-500 tracking-wider">
 <th className="py-3 px-4">Supplier Code</th>
 <th className="py-3 px-4">Company Name</th>
 <th className="py-3 px-4">Contact Person</th>
 <th className="py-3 px-4">Phone Contacts</th>
 <th className="py-3 px-4">Corporate Email</th>
 <th className="py-3 px-4">Physical Head Office</th>
 <th className="py-3 px-4 text-center">Operations</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-divider/10 text-default-500/90">
 {suppliers
 .filter((s) => !s.isDeleted)
 .map((sup) => (
 <tr
 key={sup.id}
 onClick={() => setSelectedSupplierCatalog(sup)}
 className="hover:bg-content1/90 cursor-pointer transition-colors"
 title="Click to view company profile and product catalog"
 >
 <td className="py-3.5 px-4 font-black text-primary hover:underline">
 {sup.id}
 </td>
 <td className="py-3.5 px-4 font-bold text-sm text-foreground hover:underline">
 {sup.name}
 </td>
 <td className="py-3.5 px-4 font-sans">
 <div className="flex items-center gap-1.5 font-bold">
 <Users className="h-3.5 w-3.5 text-default-500" />
 <span>{sup.contactPerson || "N/A"}</span>
 </div>
 </td>
 <td className="py-3.5 px-4 ">
 <div className="flex items-center gap-1.5">
 <Phone className="h-3.5 w-3.5 text-default-500" />
 <span>{sup.phone || "N/A"}</span>
 </div>
 </td>
 <td className="py-3.5 px-4 ">
 <div className="flex items-center gap-1.5">
 <Mail className="h-3.5 w-3.5 text-default-500" />
 <span>{sup.email || "N/A"}</span>
 </div>
 </td>
 <td className="py-3.5 px-4 max-w-xs truncate text-default-500 font-medium">
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
 className="p-1 px-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded transition-all active:scale-95"
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
 className="py-8 text-center text-default-500 font-medium"
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
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
 <div className="bg-content1 p-4 rounded-2xl border border-divider/10 shadow-sm flex items-center gap-4">
 <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
 <Tag className="h-5 w-5" />
 </div>
 <div>
 <span className="block text-[8px] font-extrabold text-default-500/80 uppercase tracking-widest">Active Brands</span>
 <div className="text-xl font-black mt-1 text-primary tracking-tight">
 {brands.filter((b) => !b.isDeleted).length} Cataloged
 </div>
 </div>
 </div>

 <div className="bg-content1 p-4 rounded-2xl border border-divider/10 shadow-sm flex items-center gap-4">
 <div className="p-3 rounded-xl bg-secondary/10 text-secondary shrink-0">
 <Building2 className="h-5 w-5" />
 </div>
 <div>
 <span className="block text-[8px] font-extrabold text-default-500/80 uppercase tracking-widest">Sourced Vendors</span>
 <div className="text-xl font-black mt-1 text-secondary tracking-tight">
 {
 new Set(
 brands
 .filter((b) => !b.isDeleted)
 .map((b) => b.supplierId),
 ).size
 }{" "}
 Suppliers
 </div>
 </div>
 </div>

 <div className="bg-content1 p-4 rounded-2xl border border-divider/10 shadow-sm flex items-center gap-4">
 <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
 <FileText className="h-5 w-5" />
 </div>
 <div>
 <span className="block text-[8px] font-extrabold text-default-500/80 uppercase tracking-widest">Restock Queue Load</span>
 <div className="text-xl font-black mt-1 text-amber-600 dark:text-amber-400 tracking-tight">
 {poCart.length} Pending SKUs
 </div>
 </div>
 </div>
 </div>

 {unmappedBrands.length > 0 && (
 <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 space-y-3.5 animate-fade-in">
 <div className="flex items-center gap-2 text-amber-500 font-bold text-xs">
 <AlertTriangle className="h-4 w-4 shrink-0 animate-bounce" />
 <span>Detected Unmapped Brands in Inventory ({unmappedBrands.length})</span>
 </div>
 <p className="text-[11px] text-default-500 leading-relaxed">
 These brands exist on your imported/migrated inventory products, but have not been assigned to any authorized supplier. Click on any brand below to quickly map it to its distributor:
 </p>
 <div className="flex flex-wrap gap-2">
 {unmappedBrands.map((bName) => {
 const itemsCount = products.filter(
 (p) => !p.isDeleted && p.brand?.trim().toLowerCase() === bName.toLowerCase()
 ).length;
 return (
 <button
 key={bName}
 type="button"
 onClick={() => handleOpenAddBrandForName(bName)}
 className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 border border-amber-500/30 rounded-xl text-[10px] font-extrabold flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-2xs"
 title="Click to map this brand to a supplier"
 >
 <Plus className="h-3 w-3" />
 <span>{bName}</span>
 <span className="bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full text-[9px]">
 {itemsCount} {itemsCount === 1 ? "item" : "items"}
 </span>
 </button>
 );
 })}
 </div>
 </div>
 )}

 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
 <div>
 <h2 className="text-base font-black text-foreground tracking-tight font-sans">
 Brand Sourcing &amp; Directory Deck
 </h2>
 </div>
 {allowedToModify && (
 <button
 onClick={handleOpenAddBrand}
 className="px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold rounded-full shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
 >
 <Plus className="h-4 w-4" /> Register Sourced Brand
 </button>
 )}
 </div>

 <div className="bg-content1 border border-divider rounded-large shadow-small text-foreground shadow-sm overflow-x-auto p-0">
 <table className="w-full text-xs text-left border-collapse table-auto min-w-[800px] font-sans">
 <thead>
 <tr className="border-b border-divider/20 bg-background/30 text-[9px] uppercase font-black text-default-500 tracking-wider">
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
 <tbody className="divide-y divide-divider/10 text-default-500/90">
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
 className="hover:bg-content1/40 transition-colors"
 >
 <td className="py-3 px-4 font-bold text-default-500">
 {b.id}
 </td>
 <td className="py-3 px-4 font-black text-foreground text-sm">
 {b.name}
 </td>
 <td className="py-3 px-4">
 <span className="font-bold text-primary bg-primary/5 px-2.5 py-1 rounded-full text-[11px] border border-primary/20">
 {linkedSupplierName}
 </span>
 </td>
 <td className="py-3 px-4 font-bold text-teal-600">
 {skuCount} Items linked
 </td>
 <td className="py-3 px-4 text-default-500/80 italic">
 {b.description || "No custom description."}
 </td>
 <td className="py-3 px-4">
 <div className="flex items-center justify-center gap-2">
 {allowedToModify && (
 <>
 <button
 onClick={() => handleOpenEditBrand(b)}
 className="p-1 px-1.5 bg-content1 hover:bg-background border border-divider/20 text-default-500 rounded transition-all active:scale-95"
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
 className="py-8 text-center text-default-500 font-medium"
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
 {/* Top Info Header & Quick Controls Header */}
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-content1/50 p-4.5 rounded-xl border border-divider/15 text-left">
 <div>
 <h3 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
 <Settings2 className="h-4.5 w-4.5 text-primary" />
 <span>Automated PO Consolidation Desk</span>
 </h3>
 </div>

 <div className="flex items-center gap-2 shrink-0">
 <label className="text-[10px] font-black text-default-500 uppercase tracking-wider">
 Receiving Branch:
 </label>
 <select
 value={selectedConsolidationBranchId ?? ''}
 onChange={(e) =>
 setSelectedConsolidationBranchId(e.target.value)
 }
 className="bg-content1 border border-divider/35 rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none [color-scheme:dark]"
 >
 {branches
 .filter((b) => !b.isDeleted)
 .map((branch) => (
 <option key={branch.id} value={branch.id}>
 {branch.name}
 </option>
 ))}
 </select>
 </div>
 </div>

 {/* Quick manual item adder to Restock Queue Controls Panel */}
 <div className="bg-content1/50 p-4 rounded-xl border border-divider/15 flex flex-wrap gap-4 items-end text-left">
 <div className="space-y-1 relative w-80">
 <label className="text-[9px] font-black text-primary uppercase pl-0.5 tracking-wider">
 Quick-Add Catalog Item:
 </label>
 <div className="relative">
 <input
 type="text"
 id="quick-add-product-select-search"
 placeholder=" Search product or brand name..."
 value={procurementProductSearch ?? ''}
 onFocus={() => setShowProcurementProductDropdown(true)}
 onChange={(e) => {
 setProcurementProductSearch(e.target.value);
 setShowProcurementProductDropdown(true);
 }}
 className="w-full bg-content1 border border-divider/35 rounded-xl px-3.5 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder-zinc-500"
 />
 {procurementProductSearch && (
 <button
 type="button"
 onClick={() => setProcurementProductSearch("")}
 className="absolute right-3 top-2.5 text-default-500 hover:text-rose-500 text-xs font-black cursor-pointer"
 >
 
 </button>
 )}
 </div>

 {showProcurementProductDropdown && (
 <>
 <div
 className="fixed inset-0 z-40"
 onClick={() => setShowProcurementProductDropdown(false)}
 />
 <div className="absolute left-0 right-0 mt-1.5 bg-content1 border border-divider/50 rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto divide-y divide-divider/15 text-xs text-left">
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
 (p.productName || '').toLowerCase().includes(term) ||
 (p.brand || '').toLowerCase().includes(term) ||
 (p.sku || '').toLowerCase().includes(term)
 );
 });

 if (pool.length === 0) {
 return (
 <div className="p-3 text-default-500 italic text-center">
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
 className="p-2.5 hover:bg-primary/10 cursor-pointer flex justify-between items-center transition-colors text-left font-bold"
 >
 <div className="space-y-0.5">
 <div className="text-foreground text-xs font-extrabold">
 {p.productName}
 </div>
 <div className="text-[10px] text-default-500 font-medium">
 Brand: {p.brand || "No Brand"} • Stock:{" "}
 {p.stockQuantity}
 </div>
 </div>
 <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full ">
 {formatCurrency(p.costPrice)}
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
 <label className="text-[9px] font-black text-primary uppercase pl-0.5 tracking-wider">
 Supplier Payment Terms:
 </label>
 <select
 value={paymentTerm ?? ''}
 onChange={(e) => {
 const val = e.target.value;
 setPaymentTerm(val === "CUSTOM" ? "CUSTOM" : Number(val));
 }}
 className="w-full bg-content1 border border-divider/35 rounded-xl px-2.5 py-2 text-xs font-bold text-foreground focus:outline-none cursor-pointer [color-scheme:dark]"
 >
 <option value={0}>Cash On Delivery (COD)</option>
 <option value={15}>15 Days (Net 15)</option>
 <option value={30}>30 Days (Net 30)</option>
 <option value={45}>45 Days (Net 45)</option>
 <option value={60}>60 Days (Net 60)</option>
 <option value={90}>90 Days (Net 90)</option>
 <option value="CUSTOM">Custom Date</option>
 </select>
 </div>

 <div className="space-y-1 text-left w-48">
 <label className="text-[9px] font-black text-primary uppercase pl-0.5 tracking-wider">
 Payout Deadline:
 </label>
 <input
 type="date"
 value={payoutDueDate ?? ''}
 disabled={paymentTerm !== "CUSTOM"}
 onChange={(e) => setPayoutDueDate(e.target.value)}
 className="w-full bg-content1 border border-divider/35 rounded-xl px-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer [color-scheme:dark]"
 />
 </div>
 </div>

 {poCart.length > 0 ? (
 <div className="space-y-5 animate-fade-in text-left">
 {/* Cart compiling list */}
 <div className="bg-content1 border border-divider rounded-large shadow-small text-foreground shadow-sm overflow-x-auto p-0">
 <table className="w-full text-xs text-left border-collapse table-auto font-sans">
 <thead>
 <tr className="border-b border-divider/20 bg-background/30 text-[9px] uppercase font-black text-default-500 tracking-wider">
 <th className="py-3 px-4">Product Name</th>
 <th className="py-3 px-4">Brand</th>
 <th className="py-3 px-4">Brand Supplier Partner</th>
 <th className="py-3 px-4 text-center">Remaining Stock</th>
 <th className="py-3 px-4 text-center w-36">Desired Units</th>
 <th className="py-3 px-4 text-center w-20">Remove</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-divider/10 text-default-500/90">
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
 className="hover:bg-content1/90 transition-colors"
 >
 <td className="py-3.5 px-4 font-bold text-foreground">
 {prod.productName}
 </td>
 <td className="py-3.5 px-4 text-[11px] font-bold text-amber-600">
 {prod.brand || "Generic"}
 </td>
 <td className="py-3.5 px-4 font-bold text-teal-600">
 {supplierName}
 </td>
 <td className="py-3.5 px-4 font-bold text-center">
 {prod.stockQuantity} boxes
 </td>
 <td className="py-3.5 px-4 text-center">
 <input
 type="number"
 min={1}
 value={cartItem.quantity ?? ''}
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
 className="w-20 bg-background border border-divider/60 rounded px-2 py-1 text-center font-bold text-xs"
 />
 </td>
 <td className="py-3.5 px-4 text-center">
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
 <div className="bg-content1/50 p-4 rounded-xl border border-divider/15 space-y-3">
 <span className="text-[10px] uppercase font-black text-primary tracking-widest block">
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
 className="bg-background border border-divider/15 p-3 rounded-xl flex flex-col justify-between gap-2 text-xs shadow-sm"
 >
 <div>
 <div className="flex items-center justify-between border-b border-divider/10 pb-1.5 mb-2">
 <span className="font-extrabold text-primary">
 {supNameVal}
 </span>
 <span className="text-[10px] px-2 py-0.5 bg-teal-500/10 text-teal-500 font-bold rounded-lg uppercase">
 {entries.length} items grouped
 </span>
 </div>
 <ul className="space-y-1 text-[11px] text-default-500/90 pl-1 list-disc list-inside">
 {entries.map((entry, idx) => (
 <li key={idx}>
 <span className="font-semibold text-foreground">
 {entry.prod.productName}
 </span>{" "}
 ({entry.item.quantity} boxes) -{" "}
 <span className="italic text-default-500">
 [{entry.prod.brand}]
 </span>
 </li>
 ))}
 </ul>
 </div>
 <span className="text-[10px] text-default-500 block pt-1.5 mt-2 border-t border-divider/5 text-[10.5px]">
 Auto-consolidating all products into one bulk Supplier PO.
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
 triggerConfirmation(
 "Discard Worksheet Draft",
 "Are you absolutely sure you want to discard the current draft compilation worksheet and clear the restock cart?",
 () => {
 syncPoCart([]);
 showToast("Worksheet discarded successfully.");
 },
 true,
 "Discard Worksheet",
 "Keep Draft"
 );
 }}
 className="px-4 py-2 bg-background border border-divider hover:bg-content1 text-foreground text-xs font-bold rounded-full cursor-pointer uppercase tracking-wide"
 >
 Clear Restock Cart
 </button>
 <button
 type="button"
 onClick={() => setIsConfirmingConsolidation(true)}
 className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-black rounded-full cursor-pointer uppercase shadow-sm tracking-wide flex items-center gap-1.5"
 >
 <Plus className="h-4 w-4" /> Group &amp; Compile Consolidated POs
 </button>
 </div>
 </div>
 ) : (
 <div className="py-8 text-center space-y-2 text-left bg-content1/35 rounded-xl border border-divider/10 p-6">
 <p className="text-sm font-semibold text-default-500">
 The restock worksheet is currently empty.
 </p>
 <p className="text-[11.5px] text-default-500/75 max-w-lg mx-auto leading-relaxed">
 Queued items scheduled by Branch Managers or Admins inside the Dashboard - Active Inventory Health list will automatically populate this compiler workspace. You can also manually add items using the "Quick-Add" dropdown selector above!
 </p>
 </div>
 )}
 </div>
 )}

 {/* MODAL: Sourcing Strategy Selection & Confirmation */}
 {isConfirmingConsolidation && typeof document !== 'undefined' && createPortal(
 <div
 id="consolidation-sourcing-strategy-modal"
 className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans"
 >
 <div
 className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity"
 onClick={() => setIsConfirmingConsolidation(false)}
 />
 <div className="relative w-full max-w-2xl bg-content1 rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl text-foreground space-y-6 text-left">
 <div className="flex justify-between items-center border-b border-divider/20 pb-3">
 <h3 className="text-sm font-black uppercase tracking-wider text-primary flex items-center gap-2">
 <Settings2 className="h-4 w-4" />
 <span>Select Requisitions Routing Strategy</span>
 </h3>
 <button
 onClick={() => setIsConfirmingConsolidation(false)}
 className="text-default-500 hover:text-foreground cursor-pointer p-1 rounded-full"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 <div className="space-y-4">
 <p className="text-xs text-default-500 leading-relaxed">
 You have queued{" "}
 <span className="font-extrabold text-primary">
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
 className="bg-background hover:bg-content1 border-2 border-amber-500/20 hover:border-amber-500/50 p-4 rounded-2xl cursor-pointer transition-all space-y-3 relative group"
 >
 <div className="absolute top-3 right-3 bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ">
 Highly Recommended
 </div>
 <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 w-10 h-10 flex items-center justify-center">
 <FileText className="h-5 w-5" />
 </div>
 <div>
 <h4 className="font-bold text-xs text-foreground">
 Route to Requisitions Drafts (Pending)
 </h4>
 <p className="text-[11px] text-default-500/90 mt-1 leading-normal">
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
 className="bg-background hover:bg-content1 border-2 border-emerald-500/20 hover:border-emerald-500/50 p-4 rounded-2xl cursor-pointer transition-all space-y-3 relative group"
 >
 <div className="absolute top-3 right-3 bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ">
 Direct Sourcing
 </div>
 <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 w-10 h-10 flex items-center justify-center">
 <Truck className="h-5 w-5" />
 </div>
 <div>
 <h4 className="font-bold text-xs text-foreground">
 Route Direct to Outsourcing (Approved)
 </h4>
 <p className="text-[11px] text-default-500/90 mt-1 leading-normal">
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

 <div className="flex justify-end gap-2 border-t border-divider/10 pt-4">
 <button
 onClick={() => setIsConfirmingConsolidation(false)}
 className="px-4 py-2 bg-background hover:bg-content1 border border-divider text-[11px] font-bold text-foreground rounded-full uppercase tracking-wider cursor-pointer"
 >
 Go Back
 </button>
 </div>
 </div>
 </div>,
 document.body
 )}

 {/* MODAL 1: Requisition Builder (Create Draft PO) */}
 {showPOModal && typeof document !== 'undefined' && createPortal(
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
 <div
 className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity"
 onClick={() => setShowPOModal(false)}
 />
 <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
 <div className="md:col-span-2 flex justify-between items-center border-b border-divider/20 pb-2.5 flex-shrink-0">
 <h3 className="text-base font-bold text-primary flex items-center gap-2">
 <FileText className="h-5 w-5" />
 <span>Compiler: Bulk Purchase Requisition</span>
 </h3>
 <button
 type="button"
 onClick={() => setShowPOModal(false)}
 className="text-default-500 hover:text-foreground cursor-pointer p-1 rounded-full"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 {/* FAST PO TEMPLATE LOADER */}
 <div className="md:col-span-2 bg-primary/5 p-3 rounded-2xl border border-divider/30 flex items-center justify-between gap-3 flex-wrap">
 <div className="flex items-center gap-2">
 <span className="text-[10px] font-bold uppercase text-primary tracking-wider ">
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
 className="bg-content1 border border-divider px-2.5 py-1 text-xs text-foreground focus:outline-none focus:border-primary transition-colors rounded-lg cursor-pointer max-w-[200px]"
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
 showToast(`Action Restricted: Cannot clear templates because the register is currently holding: ${getRowClearingBlockedReason()}`);
 return;
 }
 triggerConfirmation(
 "Clear Saved Templates",
 "Are you sure you want to permanently clear all saved purchase order templates? This action cannot be undone.",
 () => {
 localStorage.removeItem("tp_po_templates");
 setPoTemplates([]);
 showToast("All templates deleted successfully.");
 },
 true,
 "Clear Permanently",
 "Keep Templates"
 );
 }}
 className="text-[9px] text-red-500 hover:underline font-bold tracking-wide uppercase disabled:opacity-40"
 disabled={isRowClearingBlocked()}
 >
 Clear Saved
 </button>
 )}
 </div>

 {/* General Specs */}
 <div className="space-y-1 relative">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">
 Vendor Supplier
 </label>
 <select
 value={selectedSupplierId ?? ''}
 onChange={(e) => setSelectedSupplierId(e.target.value)}
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg cursor-pointer"
 >
 {suppliers.map((s) => (
 <option key={s.id} value={s.id}>
 {s.name}
 </option>
 ))}
 </select>
 </div>

 <div className="space-y-1 relative">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">
 Warehouse / Branch Assignment
 </label>
 {currentUser?.role === UserRole.ADMIN ? (
 <select
 value={selectedBranchId ?? ''}
 onChange={(e) => setSelectedBranchId(e.target.value)}
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg cursor-pointer"
 >
 {branches.map((b) => (
 <option key={b.id} value={b.id}>
 {b.name}
 </option>
 ))}
 </select>
 ) : (
 <div className="w-full bg-content1 border-b-2 border-divider/30 px-3 py-2 text-xs text-foreground font-bold rounded-lg">
 {branches.find(b => b.id === (currentUser?.branchAssignmentId || "B1"))?.name || 'N/A'}
 </div>
 )}
 </div>

 {/* Supplier Payment Terms & Payout Deadline Selection */}
 <div className="space-y-1 relative">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">
 Supplier Payment Terms
 </label>
 <select
 value={paymentTerm ?? ''}
 onChange={(e) => {
 const val = e.target.value;
 setPaymentTerm(val === "CUSTOM" ? "CUSTOM" : Number(val));
 }}
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg cursor-pointer"
 >
 <option value={0}>Cash On Delivery (COD)</option>
 <option value={15}>15 Days (Net 15)</option>
 <option value={30}>30 Days (Net 30)</option>
 <option value={45}>45 Days (Net 45)</option>
 <option value={60}>60 Days (Net 60)</option>
 <option value={90}>90 Days (Net 90)</option>
 <option value="CUSTOM">Custom Date</option>
 </select>
 </div>

 <div className="space-y-1 relative">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">
 Payout Deadline
 </label>
 <input
 type="date"
 value={payoutDueDate ?? ''}
 disabled={paymentTerm !== "CUSTOM"}
 onChange={(e) => setPayoutDueDate(e.target.value)}
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-1.5 text-xs text-foreground focus:outline-none transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
 />
 </div>

 {/* DYNAMIC VENDOR DETAILS PANEL */}
 {(() => {
 const selectedSup = suppliers.find(
 (s) => s.id === selectedSupplierId,
 );
 if (selectedSup) {
 return (
 <div className="md:col-span-2 bg-content1 p-3 rounded-2xl border border-divider/30 text-xs text-foreground space-y-1 my-0.5 animate-fade-in">
 <div className="flex justify-between items-center border-b border-divider/15 pb-1">
 <span className="text-[9px] font-bold text-primary uppercase tracking-widest">
 Active Vendor Contact Data
 </span>
 <span className="text-[9px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
 {selectedSup.id}
 </span>
 </div>
 <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-default-500 text-[11px]">
 <div>
 <span className="font-bold text-foreground">
 Company:
 </span>{" "}
 {selectedSup.name}
 </div>
 <div>
 <span className="font-bold text-foreground">
 Contact Person:
 </span>{" "}
 {selectedSup.contactPerson || "None listed"}
 </div>
 <div>
 <span className="font-bold text-foreground">
 Phone:
 </span>{" "}
 {selectedSup.phone || "None listed"}
 </div>
 <div>
 <span className="font-bold text-foreground">
 Email:
 </span>{" "}
 {selectedSup.email || "None listed"}
 </div>
 <div className="sm:col-span-2">
 <span className="font-bold text-foreground">
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
 <div className="md:col-span-2 flex items-center justify-between px-1 border-t border-divider/15 pt-3">
 <span className="text-[10px] font-bold uppercase tracking-wider text-primary ">
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
 <div className="md:col-span-2 bg-amber-500/5 p-4 rounded-2xl border border-amber-500/15 my-1 space-y-4 animate-scale-up text-left">
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
 value={manualProdName ?? ''}
 onChange={(e) => setManualProdName(e.target.value)}
 placeholder="Product name"
 className="w-full bg-background border-b border-amber-500/30 px-3 py-2 text-xs text-foreground focus:outline-none focus:border-amber-500 rounded-lg font-sans font-bold"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-bold uppercase text-amber-600 dark:text-amber-400 block pl-1">
 Category
 </label>
 <select
 value={manualCategory ?? ''}
 onChange={(e) => setManualCategory(e.target.value)}
 className="w-full bg-background border border-amber-500/30 px-3 py-2 text-xs text-foreground focus:outline-none focus:border-amber-500 rounded-lg font-sans font-bold cursor-pointer"
 >
 {dynamicCategories.map((cat) => (
 <option key={cat} value={cat}>{cat}</option>
 ))}
 </select>
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-bold uppercase text-amber-600 dark:text-amber-400 block pl-1">
 Brand Name / Manufacturer
 </label>
 <input
 type="text"
 value={manualBrand ?? ''}
 onChange={(e) => setManualBrand(e.target.value)}
 className="w-full bg-background border border-divider px-3 py-2 text-xs text-foreground focus:outline-none focus:border-amber-500 transition-colors rounded-lg"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-bold uppercase text-amber-600 dark:text-amber-400 block pl-1">
 Item Dimensions (Size)
 </label>
 <input
 type="text"
 value={manualSize ?? ''}
 onChange={(e) => setManualSize(e.target.value)}
 placeholder="Dimensions (e.g. 60x60 cm)"
 className="w-full bg-background border border-divider px-3 py-2 text-xs text-foreground focus:outline-none focus:border-amber-500 transition-colors rounded-lg font-bold "
 />
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-bold uppercase text-amber-600 dark:text-amber-400 block pl-1">
 Wholesale Cost Price (PHP)
 </label>
 <input
 type="number"
 value={manualCostPrice ?? ''}
 onChange={(e) => setManualCostPrice(e.target.value)}
 className="w-full bg-background border border-divider px-3 py-2 text-xs text-foreground focus:outline-none focus:border-amber-500 transition-colors rounded-lg font-bold"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-bold uppercase text-amber-600 dark:text-amber-400 block pl-1">
 Suggested Store Price (PHP)
 </label>
 <input
 type="number"
 value={manualSellingPrice ?? ''}
 onChange={(e) => setManualSellingPrice(e.target.value)}
 className="w-full bg-background border border-divider px-3 py-2 text-xs text-foreground focus:outline-none focus:border-amber-500 transition-colors rounded-lg font-bold"
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
 value={manualQtyRequested ?? ''}
 onChange={(e) => setManualQtyRequested(e.target.value)}
 className="w-full bg-background border border-divider px-3 py-2 text-xs text-foreground focus:outline-none focus:border-amber-500 transition-colors rounded-lg font-black"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-bold uppercase text-amber-600 dark:text-amber-400 block pl-1">
 Batch Manufacturing Origin Source
 </label>
 <input
 type="text"
 value={manualOrigin ?? ''}
 onChange={(e) => setManualOrigin(e.target.value)}
 placeholder="Manufacturing origin"
 className="w-full bg-background border border-divider px-3 py-2 text-xs text-foreground focus:outline-none focus:border-amber-500 transition-colors rounded-lg font-sans font-bold"
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
 <div className="md:col-span-2 bg-content1 p-4 rounded-2xl border border-divider/30 my-1 grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
 <div className="space-y-1 relative text-left">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">
 Product catalog Lookup
 </label>
 <select
 value={selectedProdId ?? ''}
 onChange={(e) => setSelectedProdId(e.target.value)}
 className="w-full bg-background border-b-2 border-divider px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors rounded-lg cursor-pointer"
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
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">
 Volume requested
 </label>
 <input
 type="number"
 value={qtyRequestedInput ?? ''}
 onChange={(e) => setQtyRequestedInput(e.target.value)}
 className="w-full bg-background border-b-2 border-divider px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors font-black rounded-lg"
 />
 </div>

 <button
 type="button"
 onClick={addDraftItem}
 className="px-5 py-2 text-xs font-black bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm rounded-full cursor-pointer h-9 shrink-0 self-end transition-transform active:scale-95"
 >
 Insert Item
 </button>
 </div>
 </div>
 )}

 {/* Added Draft items table */}
 <div className="md:col-span-2 space-y-2 border-t border-divider/15 pt-3 max-h-[160px] overflow-y-auto">
 <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">
 Selected Draft Items ({draftItems.length})
 </h4>

 {draftItems.map((item, i) => (
 <div
 key={i}
 className="flex items-center justify-between py-2 px-3.5 bg-background border border-divider/35 rounded-2xl shadow-sm"
 >
 <div>
 <h5 className="text-xs font-bold text-foreground">
 {getProductName(item.productId)}
 </h5>
 <span className="text-[10px] text-default-500 ">
 Supplier Unit Cost: {formatCurrency(item.costPrice)}
 </span>
 </div>

 <div className="flex items-center gap-3">
 <span className="text-xs font-bold ">
 Volume Requested: {item.quantityRequested}
 </span>
 <button
 type="button"
 onClick={() => removeDraftItem(item.productId)}
 className="text-primary hover:text-red-500 cursor-pointer p-1 rounded-full hover:bg-default-100 transition-colors"
 >
 <X className="h-4 w-4" />
 </button>
 </div>
 </div>
 ))}

 {draftItems.length === 0 && (
 <div className="text-center py-4 text-xs text-default-500 italic">
 No products compiled in PO draft yet.
 </div>
 )}
 </div>

 {/* Note fields */}
 <div className="md:col-span-2 space-y-1 relative">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">
 Procurement Request Notes (Optional)
 </label>
 <input
 type="text"
 value={poNotes ?? ''}
 onChange={(e) => setPoNotes(e.target.value)}
 placeholder="Procurement notes"
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg"
 />
 </div>

 {/* SAVE AS TEMPLATE AREA */}
 <div className="md:col-span-2 bg-content1 p-3.5 rounded-2xl border border-divider/30 flex flex-col sm:flex-row sm:items-end justify-between gap-3 my-0.5">
 <div className="space-y-1.5 flex-1 text-left">
 <label className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest pl-1">
 Save current draft specs as PO template
 </label>
 <input
 type="text"
 value={templateNameInput ?? ''}
 onChange={(e) => setTemplateNameInput(e.target.value)}
 placeholder="Template name"
 className="w-full bg-background border border-divider px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-colors rounded-lg font-medium"
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
 <div className="md:col-span-2 flex justify-end gap-2 border-t border-divider/20 pt-4 flex-shrink-0">
 <button
 type="button"
 onClick={() => setShowPOModal(false)}
 className="px-4 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-default-100 text-default-500 transition-colors"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={handleSavePO}
 className="bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 rounded-medium px-5 py-2 text-xs shadow-sm cursor-pointer"
 >
 Save and Draft PO
 </button>
 </div>
 </div>
 </div>,
 document.body
 )}

 {/* MODAL 2: Receive PO Cargo Delivery */}
 {showReceiveModal && activePo && typeof document !== 'undefined' && createPortal(
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
 <div
 className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity"
 onClick={() => setShowReceiveModal(false)}
 />
 <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground text-left space-y-4">
 <div className="flex justify-between items-center border-b border-divider/20 pb-2.5">
 <h3 className="text-base font-bold text-primary flex items-center gap-2">
 <Truck className="h-5 w-5" />
 <span>Deliver cargo: {activePo.poNumber}</span>
 </h3>
 <button
 type="button"
 onClick={() => setShowReceiveModal(false)}
 className="text-default-500 hover:text-foreground cursor-pointer p-1 rounded-full"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 <p className="text-xs text-default-500/80 mt-1 leading-relaxed">
 Specify quantities actually received at warehouse loading dock.
 Partially received POs will stay open.
 </p>

 <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
 {poItems
 .filter((item) => item.poId === activePo.id)
 .map((item, idx) => {
 const pendingCount = Math.max(
 0,
 (item.quantityRequested ?? 0) - (item.quantityReceived ?? 0),
 );
 return (
 <div
 key={idx}
 className="p-3 bg-background border border-divider/35 rounded-2xl flex justify-between items-center shadow-sm"
 >
 <div>
 <h5 className="text-xs font-bold text-foreground">
 {getProductName(item.productId)}
 </h5>
 <div className="text-[10px] text-default-500 flex items-center gap-1.5 mt-0.5 ">
 <span>Requested: {item.quantityRequested}</span>
 <span>•</span>
 <span>Already Recv: {item.quantityReceived}</span>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <label className="text-[10px] font-bold text-primary uppercase pl-1">
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
 className="w-16 bg-content1 border-b-2 border-divider font-bold text-center text-xs text-foreground focus:outline-none focus:border-primary transition-colors py-1"
 />
 </div>
 </div>
 );
 })}
 </div>

 {/* Payment Mode & Terms Customization */}
 <div className="border-t border-divider/20 pt-3.5 space-y-3.5">
 <h4 className="text-xs font-bold text-primary uppercase flex items-center gap-1.5">
 <CreditCard className="h-4 w-4" />
 <span>Payment Terms & Schedule</span>
 </h4>

 {activePo?.paymentMode && (
 <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 text-xs text-default-700 space-y-2">
 <div className="flex justify-between items-center">
 <span className="font-extrabold text-emerald-400 flex items-center gap-1.5">
 <span className="text-sm"></span> Inherited PO Payment Terms
 </span>
 <button
 type="button"
 onClick={() => {
 setShowTermsOverride(!showTermsOverride);
 if (!showTermsOverride) {
 setReceivePaymentMode(activePo.paymentMode || "fully_paid");
 setReceiveTermsLength(activePo.termsLength || 30);
 setReceiveTermStartDate(activePo.termStartDate || new Date().toISOString().split('T')[0]);
 setReceiveTermEndDate(activePo.termEndDate || new Date().toISOString().split('T')[0]);
 }
 }}
 className="text-[10px] bg-content3 hover:bg-content4 text-primary font-bold px-2 py-1 rounded-lg transition cursor-pointer"
 >
 {showTermsOverride ? "Use Inherited" : "Change / Customize"}
 </button>
 </div>
 {!showTermsOverride && (
 <div className="text-[11px] text-default-500 space-y-1">
 <div>
 <span className="font-bold text-default-700">Method:</span>{" "}
 {activePo.paymentMode === "fully_paid" ? "Cash On Delivery (COD) / Fully Paid" : `Pay in Terms (${activePo.termsLength} Days)`}
 </div>
 {activePo.paymentMode === "terms" && (
 <>
 <div>
 <span className="font-bold text-default-700">Start Date:</span> {activePo.termStartDate}
 </div>
 <div>
 <span className="font-bold text-default-700">Due Date:</span> {activePo.termEndDate}
 </div>
 </>
 )}
 </div>
 )}
 </div>
 )}

 {(!activePo?.paymentMode || showTermsOverride) && (
 <>
 <div className="grid grid-cols-2 gap-2">
 <button
 type="button"
 onClick={() => setReceivePaymentMode("fully_paid")}
 className={`py-2 px-3 text-xs font-bold rounded-xl transition cursor-pointer border flex flex-col items-center justify-center gap-1 ${
 receivePaymentMode === "fully_paid"
 ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
 : "bg-background border-divider/35 text-default-500 hover:text-foreground"
 }`}
 >
 <span className="font-extrabold text-[11px]">Fully Paid</span>
 <span className="text-[9px] font-normal opacity-70">Instant Settlement</span>
 </button>
 <button
 type="button"
 onClick={() => setReceivePaymentMode("terms")}
 className={`py-2 px-3 text-xs font-bold rounded-xl transition cursor-pointer border flex flex-col items-center justify-center gap-1 ${
 receivePaymentMode === "terms"
 ? "bg-primary/10 border-primary text-primary"
 : "bg-background border-divider/35 text-default-500 hover:text-foreground"
 }`}
 >
 <span className="font-extrabold text-[11px]">Pay In Terms</span>
 <span className="text-[9px] font-normal opacity-70">Project to Calendar</span>
 </button>
 </div>

 {receivePaymentMode === "terms" && (
 <div className="bg-background p-3.5 rounded-2xl border border-divider/30 space-y-3 animate-fade-in text-[11px]">
 {/* Preset Terms Selection */}
 <div className="space-y-1">
 <span className="text-[10px] text-default-500 font-bold block">Terms Length</span>
 <div className="grid grid-cols-5 gap-1">
 {[30, 60, 90, 120].map((days) => (
 <button
 key={days}
 type="button"
 onClick={() => {
 setReceiveTermsLength(days);
 try {
 const sDate = new Date(receiveTermStartDate);
 if (!isNaN(sDate.getTime())) {
 sDate.setDate(sDate.getDate() + days);
 setReceiveTermEndDate(sDate.toISOString().split('T')[0]);
 }
 } catch (dateErr) {
 console.debug("[Procurement] Term end date calculation error:", dateErr);
 }
 }}
 className={`py-1.5 text-[10px] font-black rounded-lg transition border cursor-pointer text-center ${
 receiveTermsLength === days
 ? "bg-primary text-primary-foreground border-transparent"
 : "bg-content1 border-divider/40 text-default-700 hover:bg-content3"
 }`}
 >
 {days}D
 </button>
 ))}
 <button
 type="button"
 onClick={() => setReceiveTermsLength(0)}
 className={`py-1.5 text-[10px] font-black rounded-lg transition border cursor-pointer text-center ${
 receiveTermsLength === 0
 ? "bg-amber-500 text-black border-transparent"
 : "bg-content1 border-divider/40 text-default-700 hover:bg-content3"
 }`}
 >
 Custom
 </button>
 </div>
 </div>

 {/* Start Date & End Date Pickers */}
 <div className="grid grid-cols-2 gap-2.5">
 <div className="space-y-1">
 <label className="text-[10px] text-default-500 font-bold flex items-center gap-1">
 <Calendar className="h-3.5 w-3.5 text-primary" /> Start Date
 </label>
 <input
 type="date"
 value={receiveTermStartDate ?? ''}
 onChange={(e) => {
 const newStart = e.target.value;
 setReceiveTermStartDate(newStart);
 if (receiveTermsLength > 0) {
 try {
 const sDate = new Date(newStart);
 if (!isNaN(sDate.getTime())) {
 sDate.setDate(sDate.getDate() + receiveTermsLength);
 setReceiveTermEndDate(sDate.toISOString().split('T')[0]);
 }
 } catch (dateErr) {
 console.debug("[Procurement] End date calculation error on start date change:", dateErr);
 }
 }
 }}
 className="w-full bg-content1 border border-divider/35 rounded-xl p-2 text-[11px] outline-none text-foreground focus:border-primary"
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-default-500 font-bold flex items-center gap-1">
 <Calendar className="h-3.5 w-3.5 text-amber-500" /> End (Due) Date
 </label>
 <input
 type="date"
 value={receiveTermEndDate ?? ''}
 onChange={(e) => {
 setReceiveTermEndDate(e.target.value);
 setReceiveTermsLength(0); // set to custom
 }}
 className="w-full bg-content1 border border-divider/35 rounded-xl p-2 text-[11px] outline-none text-foreground focus:border-primary"
 />
 </div>
 </div>

 <p className="text-[9.5px] text-default-500 italic">
 Note: Marking as "In Terms" automatically creates a corresponding liability traceable record in the Supplier Payment Calendar due on {receiveTermEndDate}.
 </p>
 </div>
 )}
 </>
 )}
 </div>

 <div className="flex justify-end gap-2 border-t border-divider/20 pt-4 flex-shrink-0">
 <button
 onClick={() => setShowReceiveModal(false)}
 className="px-4 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-default-100 text-default-500 transition-colors"
 >
 Dismiss
 </button>
 <button
 onClick={submitCargoReceived}
 className="bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 rounded-medium px-5 py-2 text-xs shadow-sm cursor-pointer"
 >
 Log Cargo Inflow
 </button>
 </div>
 </div>
 </div>,
 document.body
 )}

 {/* MODAL 3: Supplier Profile Manager (Create / Edit Supplier) */}
 {showSupplierModal && typeof document !== 'undefined' && createPortal(
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
 <div
 className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity"
 onClick={() => setShowSupplierModal(false)}
 />
 <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground text-left space-y-4">
 <div className="flex justify-between items-center border-b border-divider/20 pb-2.5">
 <h3 className="text-base font-bold text-primary flex items-center gap-2">
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
 className="text-default-500 hover:text-foreground cursor-pointer p-1 rounded-full"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 <p className="text-xs text-default-500/85 mt-1">
 Add corporate contact records. Suppliers can then be selected to
 provide products and fulfill purchase order requests.
 </p>

 <div className="space-y-3.5">
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">
 Supplier Company Name
 </label>
 <input
 type="text"
 value={supName ?? ''}
 onChange={(e) => setSupName(e.target.value)}
 placeholder="Supplier company name"
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg font-bold"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">
 Primary Contact Agent
 </label>
 <input
 type="text"
 value={supContactPerson ?? ''}
 onChange={(e) => setSupContactPerson(e.target.value)}
 placeholder="Contact agent name"
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">
 Phone Target
 </label>
 <input
 type="text"
 value={supPhone ?? ''}
 onChange={(e) => setSupPhone(e.target.value)}
 placeholder="Phone number"
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg "
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">
 Corporate Email
 </label>
 <input
 type="email"
 value={supEmail ?? ''}
 onChange={(e) => setSupEmail(e.target.value)}
 placeholder="Corporate email address"
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg"
 />
 </div>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">
 Physical HQ Address
 </label>
 <textarea
 value={supAddress ?? ''}
 onChange={(e) => setSupAddress(e.target.value)}
 placeholder="Street, City, Province"
 rows={2}
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg resize-none"
 />
 </div>
 </div>

 <div className="flex justify-end gap-2 border-t border-divider/20 pt-4 flex-shrink-0">
 <button
 onClick={() => setShowSupplierModal(false)}
 className="px-4 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-default-100 text-default-500 transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={handleSaveSupplier}
 className="bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 rounded-medium px-5 py-2 text-xs shadow-sm cursor-pointer"
 >
 Commit Supplier Profile
 </button>
 </div>
 </div>
 </div>,
 document.body
 )}

 {/* CUSTOM CONFIRMATION DIALOG */}
 {confirmModal.isOpen && typeof document !== 'undefined' && createPortal(
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in font-sans">
 <div
 className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity"
 onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
 />
 <div className="relative w-full max-w-sm rounded-2xl border border-divider/30 p-6 z-[110] shadow-2xl bg-content1 text-foreground text-center space-y-4">
 <div className="text-left space-y-2">
 <h3 className="text-base font-black text-primary uppercase tracking-wide flex items-center gap-2">
 <AlertTriangle className={`${confirmModal.isDanger ? 'text-rose-500' : 'text-amber-500'} h-5 w-5`} />
 <span>{confirmModal.title}</span>
 </h3>
 <p className="text-xs text-default-500/85 leading-relaxed">
 {confirmModal.message}
 </p>
 </div>
 <div className="flex justify-end gap-2 border-t border-divider/15 pt-4">
 <button
 type="button"
 onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
 className="px-4 py-2 text-xs font-black uppercase tracking-wider rounded-full hover:bg-default-100 text-default-500 transition-colors animate-scale-up"
 >
 {confirmModal.cancelText || "Cancel"}
 </button>
 <button
 type="button"
 onClick={confirmModal.onConfirm}
 className={`px-5 py-2 text-xs font-black uppercase tracking-wider rounded-full text-white shadow-sm transition-all border animate-scale-up ${
 confirmModal.isDanger
 ? "bg-rose-600 hover:bg-rose-500 border-rose-700/30"
 : "bg-primary hover:bg-primary/30"
 }`}
 >
 {confirmModal.confirmText || "Confirm"}
 </button>
 </div>
 </div>
 </div>,
 document.body
 )}

 {/* MODAL 4: Brand Profile Manager (Create / Edit Brand) */}
 {showBrandModal && typeof document !== 'undefined' && createPortal(
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
 <div
 className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity"
 onClick={() => setShowBrandModal(false)}
 />
 <div className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground text-left space-y-4">
 <div className="flex justify-between items-center border-b border-divider/20 pb-2.5">
 <h3 className="text-base font-bold text-primary flex items-center gap-2">
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
 className="text-default-500 hover:text-foreground cursor-pointer p-1 rounded-full"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 <p className="text-[11px] text-default-500/85 leading-relaxed mt-1">
 Associate a brand name with a specific vendor supplier. This
 automates PO consolidation when order requests are compiled for
 low-stock items.
 </p>

 <div className="space-y-3.5">
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">
 Brand Name
 </label>
 <input
 type="text"
 value={brandName ?? ''}
 onChange={(e) => setBrandName(e.target.value)}
 placeholder="Brand name"
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg font-bold"
 />
 {!editingBrandId && unmappedBrands.length > 0 && (
 <div className="pt-2">
 <span className="text-[9px] text-default-500 block mb-1 font-bold">
 Or select an unmapped inventory brand:
 </span>
 <div className="flex flex-wrap gap-1 max-h-[90px] overflow-y-auto pr-1">
 {unmappedBrands.map((ub) => (
 <button
 key={ub}
 type="button"
 onClick={() => setBrandName(ub)}
 className={`px-2 py-1 rounded-lg text-[9px] font-bold border transition-all cursor-pointer ${
 brandName.toLowerCase().trim() === ub.toLowerCase().trim()
 ? "bg-primary text-primary-foreground border-primary"
 : "bg-content1 hover:bg-default-100/20 text-default-500 border-divider/25"
 }`}
 >
 {ub}
 </button>
 ))}
 </div>
 </div>
 )}
 </div>

 <div className="space-y-1">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">
 Authorized Supplier Partner
 </label>
 <select
 value={brandSupplierId ?? ''}
 onChange={(e) => setBrandSupplierId(e.target.value)}
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg font-bold"
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
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">
 Description / Notes
 </label>
 <textarea
 value={brandDescription ?? ''}
 onChange={(e) => setBrandDescription(e.target.value)}
 placeholder="Description / Notes"
 rows={2}
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg resize-none"
 />
 </div>
 </div>

 <div className="flex gap-2 pt-2 border-t border-divider/15">
 <button
 type="button"
 onClick={() => setShowBrandModal(false)}
 className="flex-1 py-2 bg-background hover:bg-content1 text-default-500 hover:text-foreground border border-divider/45 font-bold rounded-full text-xs uppercase cursor-pointer text-center"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={handleSaveBrand}
 className="flex-1 py-2 bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-full text-xs uppercase cursor-pointer shadow-sm text-center"
 >
 Save Mapping
 </button>
 </div>
 </div>
 </div>,
 document.body
 )}

 {showExportModal && selectedPoForExport && typeof document !== 'undefined' && createPortal(
 <div className="fixed inset-0 z-55 flex items-center justify-center p-4 [color-scheme:light] print:p-0 print:bg-white overflow-y-auto font-sans">
 <div
 className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity print:hidden"
 onClick={() => setShowExportModal(false)}
 />

 <div id="tilepoint-printable-po" className="bg-[#1c1e26] dark:bg-[#1c1e26] border border-zinc-850 rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative flex flex-col max-h-[92vh] z-10 print:bg-white print:border-0 print:shadow-none print:p-0 print:max-h-none print:w-full">
 <div className="flex items-center justify-between border-b border-divider/20 pb-4 mb-4 shrink-0 print:hidden text-white">
 <div className="flex items-center gap-2">
 <FileText className="h-4 w-4 text-amber-500" />
 <h3 className="text-sm font-extrabold uppercase tracking-wider ">
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
 className="p-1.5 hover:bg-content2 text-default-500 hover:text-white rounded-full transition-colors cursor-pointer"
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
 <p className="text-[10px] text-default-500">
 Retail &amp; Supply Logistics Terminal
 </p>
 {(() => {
 const exportingBranch = branches.find(
 (b) => b.id === selectedPoForExport.branchId,
 );
 return (
 exportingBranch && (
 <p className="text-[9px] text-default-500 mt-0.5">
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
 <div className=" mt-1 space-y-0.5 text-[10px]">
 <div className="text-default-600">
 Ref ID:{" "}
 <span className="font-extrabold text-zinc-900">
 {selectedPoForExport.poNumber}
 </span>
 </div>
 <div className="text-default-500">
 Date Requested:{" "}
 <span className="font-extrabold text-zinc-800">
 {selectedPoForExport.date}
 </span>
 </div>
 <div className="text-default-500">
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
 <h5 className="font-extrabold text-default-500 text-[9px] uppercase tracking-wider mb-1.5 border-b border-zinc-250 pb-0.5">
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
 <div className="text-default-700 font-sans">
 Contact Agent:{" "}
 <span className="font-bold">
 {exportingSupplier.contactPerson || "N/A"}
 </span>
 </div>
 <div className="text-default-600 font-sans">
 Direct Phone: {exportingSupplier.phone || "N/A"}
 </div>
 <div className="text-default-600 font-sans">
 Direct Email: {exportingSupplier.email || "N/A"}
 </div>
 <div className="text-default-500 font-sans mt-1 max-w-[300px]">
 Address: {exportingSupplier.address || "N/A"}
 </div>
 </>
 ) : (
 <div className="text-default-500 italic text-[10px]">
 Supplier record missing from repository bounds
 </div>
 );
 })()}
 </div>
 </div>

 <div className="p-3.5 border border-zinc-200 rounded-xl bg-zinc-50/50">
 <h5 className="font-extrabold text-default-500 text-[9px] uppercase tracking-wider mb-1.5 border-b border-zinc-250 pb-0.5">
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
 <div className="text-default-700 font-sans">
 Branch:{" "}
 <span className="font-extrabold">
 {exportingBranch.name}
 </span>
 </div>
 <div className="text-default-600 font-sans">
 Telephone: {exportingBranch.phone || "N/A"}
 </div>
 <div className="text-default-600 font-sans mt-0.5 max-w-[300px]">
 Delivery HQ Address:{" "}
 {exportingBranch.address || "N/A"}
 </div>
 <div className="text-default-500 font-sans mt-0.5">
 Ordered By Agent:{" "}
 <span className="">
 {selectedPoForExport.requestedBy}
 </span>
 </div>
 </>
 ) : (
 <>
 <div className="text-zinc-640">
 Registered Corporate Hub
 </div>
 <div className="text-default-500 mt-0.5">
 Ordered By Agent:{" "}
 <span className="">
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
 <tr className="bg-zinc-100 text-default-700 font-extrabold text-[9px] uppercase tracking-wider border-b border-zinc-200">
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
 (item.costPrice ?? 0) * (item.quantityRequested ?? 0);
 return (
 <tr
 key={item.id}
 className="hover:bg-zinc-50/50 text-zinc-800"
 >
 <td className="py-2.5 px-3 font-bold text-zinc-900 text-[10px]">
 {product?.sku || item.productId}
 </td>
 <td className="py-2.5 px-3">
 <span className="font-bold text-zinc-900">
 {product?.productName ||
 "Unknown Tile Material"}
 </span>
 {product?.category && (
 <span className="text-[9px] text-default-500 block ">
 {product.category}
 </span>
 )}
 </td>
 <td className="py-2.5 px-3 text-center font-bold">
 {item.quantityRequested} pcs
 </td>
 <td className="py-2.5 px-3 text-right ">
 {currencySymbol}
 {(Number(item.costPrice) || 0).toLocaleString(undefined, {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })}
 </td>
 <td className="py-2.5 px-3 text-right font-bold text-zinc-900">
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
 className="py-6 text-center text-default-500 italic"
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
 <p className="text-default-600 italic whitespace-pre-wrap">
 {selectedPoForExport.notes ||
 "No custom transmittal notes declared."}
 </p>
 </div>
 <div className="space-y-1 text-[9.5px] text-default-500 ">
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
 acc + (curr.costPrice ?? 0) * (curr.quantityRequested ?? 0),
 0,
 );
 const exportingTaxAmount =
 (exportingSubtotal * taxRate) / 100;
 const exportingGrandTotal =
 exportingSubtotal + exportingTaxAmount;
 return (
 <div className="flex flex-col justify-end space-y-1.5 border border-zinc-200 p-4 rounded-xl bg-zinc-100/30">
 <div className="flex justify-between items-center text-default-600 text-[10px]">
 <span>Subtotal Weight Amount:</span>
 <span className=" font-bold">
 {currencySymbol}
 {exportingSubtotal.toLocaleString(undefined, {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })}
 </span>
 </div>
 <div className="flex justify-between items-center text-default-600 text-[10px]">
 <span>Tax Assessment (VAT {taxRate}%):</span>
 <span className=" font-bold">
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
 <span className=" text-zinc-900 text-sm">
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

 <div className="pt-10 flex justify-between items-end border-t border-dashed border-zinc-250 text-default-700">
 <div className="text-left w-1/3">
 <div className="border-b border-divider/20 text-center pb-1 font-bold text-[10px] text-zinc-900 min-h-[22px]">
 {selectedPoForExport.requestedBy}
 </div>
 <div className="text-[9px] uppercase tracking-wider text-default-500 text-center font-extrabold mt-1 font-sans">
 Requisitioned By
 </div>
 </div>
 <div className="text-right w-1/3">
 <div className="border-b border-divider/20 text-center pb-1 min-h-[22px]" />
 <div className="text-[9px] uppercase tracking-wider text-default-500 text-center font-extrabold mt-1 font-sans">
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
 </div>,
 document.body
 )}

 {/* MODAL 4: Drilldown Purchase Order Requisition Details */}
 {selectedPoDetails && typeof document !== 'undefined' && createPortal(
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in text-left font-sans">
 <div
 className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity"
 onClick={() => setSelectedPoDetails(null)}
 />
 <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground space-y-4">
 <div className="flex justify-between items-center border-b border-divider/20 pb-3">
 <h3 className="text-base font-black text-primary flex items-center gap-2">
 <FileText className="h-5 w-5" />
 <span>PO Requisition: {selectedPoDetails.poNumber}</span>
 </h3>
 <button
 onClick={() => setSelectedPoDetails(null)}
 className="text-default-500 hover:text-foreground cursor-pointer p-1 rounded-full"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-background/30 p-4 rounded-2xl border border-divider/10 text-xs text-foreground/90">
 <div>
 <span className="block text-[10px] uppercase font-bold text-default-500">
 Vendor Partner
 </span>
 <span className="font-bold text-sm text-primary mt-0.5 block">
 {getSuplierName(selectedPoDetails.supplierId)}
 </span>
 </div>
 <div>
 <span className="block text-[10px] uppercase font-bold text-default-500">
 Target Branch
 </span>
 <span className="font-bold text-sm mt-0.5 block">
 {getBranchName(selectedPoDetails.branchId || null)}
 </span>
 </div>
 <div>
 <span className="block text-[10px] uppercase font-bold text-default-500">
 Status Code
 </span>
 <span className="mt-0.5 block">
 <span className="px-2 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wider bg-primary-50 text-primary-700">
 {selectedPoDetails.status}
 </span>
 </span>
 </div>
 <div>
 <span className="block text-[10px] uppercase font-bold text-default-500">
 Drafted Date
 </span>
 <span className=" font-bold mt-0.5 block">
 {selectedPoDetails.date}
 </span>
 </div>
 </div>

 <div className="space-y-2">
 <h4 className="text-xs font-black uppercase text-primary tracking-wider pl-1">
 Requested Product Items
 </h4>
 <div className="border border-divider/15 rounded-xl overflow-hidden bg-content1">
 <table className="w-full text-left text-xs">
 <thead className="bg-content1/50 text-[10px] uppercase font-bold text-default-500 border-b border-divider/15">
 <tr>
 <th className="py-2.5 px-3">Item Name</th>
 <th className="py-2.5 px-3">Specs / Code</th>
 <th className="py-2.5 px-3 text-right">Cost (₱)</th>
 <th className="py-2.5 px-3 text-center">Req. Qty</th>
 <th className="py-2.5 px-3 text-center">Recv. Qty</th>
 <th className="py-2.5 px-3 text-right">Total Est</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-divider/10">
 {poItems
 .filter((item) => item.poId === selectedPoDetails.id)
 .map((item, idx) => (
 <tr
 key={idx}
 className="hover:bg-content1/30 font-medium"
 >
 <td className="py-2 px-3 font-bold text-foreground">
 {getProductName(item.productId)}
 </td>
 <td className="py-2 px-3 text-[10px] text-default-500 ">
 {(() => {
 const prod = products.find(
 (p) => p.id === item.productId,
 );
 return prod
 ? `${prod.size} (${prod.productCode})`
 : "Custom Item";
 })()}
 </td>
 <td className="py-2 px-3 text-right ">
 ₱{(Number(item.costPrice) || 0).toLocaleString()}
 </td>
 <td className="py-2 px-3 text-center font-bold">
 {item.quantityRequested}
 </td>
 <td className="py-2 px-3 text-center text-secondary font-bold">
 {item.quantityReceived}
 </td>
 <td className="py-2 px-3 text-right font-bold text-primary">
 ₱
 {(
 (item.costPrice ?? 0) * (item.quantityRequested ?? 0)
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
 className="py-4 text-center text-default-500 italic"
 >
 No segments inside this purchase requisition.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>

 <div className="flex justify-between items-center border-t border-divider/20 pt-4">
 <div className="text-xs">
 <span className="text-default-500">
 Requisition Total Cost:{" "}
 </span>
 <span className="font-extrabold text-sm text-primary pl-1">
 ₱
 {poItems
 .filter((item) => item.poId === selectedPoDetails.id)
 .reduce(
 (sum, item) =>
 sum + (item.costPrice ?? 0) * (item.quantityRequested ?? 0),
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
 className="px-4 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-default-100 text-default-500 transition-colors"
 >
 Close View
 </button>
 </div>
 </div>
 </div>
 </div>,
 document.body
 )}

 {/* MODAL 5: Supplier Corporate Profile & Product Catalog */}
 {selectedSupplierCatalog && typeof document !== 'undefined' && createPortal(
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in text-left font-sans">
 <div
 className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity"
 onClick={() => setSelectedSupplierCatalog(null)}
 />
 <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground space-y-4">
 <div className="flex justify-between items-center border-b border-divider/20 pb-3">
 <h3 className="text-base font-black text-primary flex items-center gap-2">
 <Building2 className="h-5 w-5" />
 <span>Vendor: {selectedSupplierCatalog.name}</span>
 </h3>
 <button
 onClick={() => setSelectedSupplierCatalog(null)}
 className="text-default-500 hover:text-foreground cursor-pointer p-1 rounded-full"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-background/30 p-4 rounded-2xl border border-divider/10 text-xs">
 <div className="space-y-2">
 <h4 className="text-[10px] uppercase font-bold text-primary tracking-widest pl-0.5">
 Corporate Contacts
 </h4>
 <div className="space-y-1.5 font-medium">
 <div className="flex items-center gap-2 text-default-500">
 <Users className="h-4 w-4 text-default-500 shrink-0" />
 <span>
 Representative:{" "}
 <strong className="text-foreground pl-1">
 {selectedSupplierCatalog.contactPerson || "N/A"}
 </strong>
 </span>
 </div>
 <div className="flex items-center gap-2 text-default-500">
 <Phone className="h-4 w-4 text-default-500 shrink-0" />
 <span>
 Phone line:{" "}
 <strong className="text-foreground pl-1">
 {selectedSupplierCatalog.phone || "N/A"}
 </strong>
 </span>
 </div>
 <div className="flex items-center gap-2 text-default-500">
 <Mail className="h-4 w-4 text-default-500 shrink-0" />
 <span>
 Corporate Email:{" "}
 <strong className="text-foreground pl-1">
 {selectedSupplierCatalog.email || "N/A"}
 </strong>
 </span>
 </div>
 </div>
 </div>

 <div className="space-y-2">
 <h4 className="text-[10px] uppercase font-bold text-primary tracking-widest pl-0.5">
 Registered Location
 </h4>
 <div className="text-default-500 leading-relaxed">
 <p className="bg-content1 p-2 border border-divider/10 rounded-xl min-h-[50px] font-medium">
 {selectedSupplierCatalog.address ||
 "Address information was not registered."}
 </p>
 </div>
 </div>
 </div>

 <div className="space-y-2">
 <div className="flex justify-between items-center pl-1">
 <h4 className="text-xs font-black uppercase text-primary tracking-wider">
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

 <div className="border border-divider/15 rounded-xl overflow-hidden bg-content1 max-h-[250px] overflow-y-auto">
 <table className="w-full text-left text-xs min-w-[500px]">
 <thead className="bg-content1/50 text-[10px] uppercase font-bold text-default-500 border-b border-divider/15 sticky top-0 bg-content1/95 backdrop-blur-sm">
 <tr>
 <th className="py-2.5 px-3">Item Name</th>
 <th className="py-2.5 px-3">Code / SKU</th>
 <th className="py-2.5 px-3">Specs / Brand</th>
 <th className="py-2.5 px-3 text-right">Cost Price (₱)</th>
 <th className="py-2.5 px-3 text-right">Sell Price (₱)</th>
 <th className="py-2.5 px-3 text-center">In Stock</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-divider/10">
 {products
 .filter(
 (p) =>
 !p.isDeleted &&
 p.supplierId === selectedSupplierCatalog.id,
 )
 .map((p) => (
 <tr
 key={p.id}
 className="hover:bg-content1/30 font-medium"
 >
 <td className="py-2 px-3 font-bold text-foreground">
 {p.productName}
 </td>
 <td className="py-2 px-3 text-[10px] text-default-500 ">
 <span>{p.productCode}</span>
 <span className="block opacity-70 text-[9px]">
 {p.sku}
 </span>
 </td>
 <td className="py-2 px-3 text-[10px] text-default-500">
 <span>
 {p.size} {p.designName && `(${p.designName})`}
 </span>
 <span className="block opacity-75 font-semibold text-secondary">
 {p.brand}
 </span>
 </td>
 <td className="py-2 px-3 text-right text-amber-600 dark:text-amber-400 font-bold">
 ₱{(Number(p.costPrice) || 0).toLocaleString()}
 </td>
 <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">
 ₱{(Number(p.sellingPrice) || 0).toLocaleString()}
 </td>
 <td className="py-2 px-3 text-center font-bold">
 <span
 className={`px-2 py-0.5 rounded-full text-[10px] ${p.stockQuantity <= (p.minimumStock ?? 0) ? "bg-amber-500/10 text-amber-500" : "bg-green-500/10 text-green-500"}`}
 >
 {p.stockQuantity} {p.unit || "Unit"}
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
 className="py-8 text-center text-default-500 font-medium"
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

 <div className="flex justify-end gap-2 border-t border-divider/20 pt-4">
 <button
 onClick={() => setSelectedSupplierCatalog(null)}
 className="px-4 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-default-100 text-default-500 transition-colors"
 >
 Close Catalog View
 </button>
 </div>
 </div>
 </div>,
 document.body
 )}

 {/* Success toast alert bar */}
 <ToastNotification
 message={toastMessage}
 onClose={() => setToastMessage(null)}
 />
 </div>
 );
}
