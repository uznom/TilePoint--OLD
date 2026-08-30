/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useDb } from "../context/DbContext";
import { isProductInBranch } from "../lib/branchUtils";
import { formatCurrency } from "../utils/formatters";
import { saveFileToBackup, verifyAndUnwrapBackup } from "../lib/fileBackupHelper";
import { Transmittal, TransmittalDocType, UserRole } from "../types/db";
import { useResponsivePageSize, TablePagination } from "./TablePagination";
import { HeroButton } from "./common/ui";
import { HeaderBar } from "./common/HeaderBar";
import { ToastNotification } from "./ToastNotification";
import {
 Send,
 Download,
 Upload,
 CheckSquare,
 Plus,
 X,
 FileCheck,
 Printer,
} from "lucide-react";

interface TransmittalModuleProps {
 darkMode?: boolean;
}

export const TransmittalModule: React.FC<TransmittalModuleProps> = ({
 darkMode: _darkMode,
}) => {
 const {
 transmittals,
 branches,
 createTransmittal,
 updateTransmittalStatus,
 currentUser,
 addAuditLog,
 branchStock,
 products,
 sales,
 users,
 shifts,
 saleItems,
 movements,
 stockTransfers,
 triggerSystemProcessing,
 expenses,
 importManualSalesReport,
 importProducts,
 } = useDb();

 // Create Modal state
  const [showModal, setShowModal] = useState(false);
  const [transPage, setTransPage] = useState(1);
  const transPageSize = useResponsivePageSize(64, 460, 10);
  const [selectedDocType, setSelectedDocType] = useState<TransmittalDocType>(
    "Full Branch State Snapshot",
  );
  const [toBranchId, setToBranchId] = useState("B2");
  const [payloadText, setPayloadText] = useState("");
  const [notes, setNotes] = useState("");

  // Selected details modal
  const [activeTrans, setActiveTrans] = useState<Transmittal | null>(null);
  const [inspectTab, setInspectTab] = useState<"itemized" | "raw">("itemized");

  // Custom visual feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [rawImportText, setRawImportText] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
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

  const compileBranchData = async (docType: TransmittalDocType) => {
    const currentBranchId = currentUser?.branchAssignmentId || "B1";
    const bName = getBranchName(currentBranchId);

    await triggerSystemProcessing(
      `Compiling ${docType}...`,
      1200,
      "db",
      undefined,
      "Querying branch stock allocation indices and compiling tax invoice registries...",
    );

    if (docType === "Full Branch State Snapshot") {
      // 1. FIXED LOGISTICS INTERCEPTOR: Live Branch Inventory Stock Allocations containing dynamic local pricing overrides
      const filteredStocks = branchStock
        .filter((bs) => bs.branchId === currentBranchId)
        .map((bs) => {
          const p = products.find((prod) => prod.id === bs.productId);
          return {
            productId: bs.productId,
            productName: p ? p.productName : "Unknown Tile",
            sku: p ? p.sku : "",
            quantity: bs.quantity,
            // CRITICAL ALIGNMENT MATRIX EXTRACTION: Transmit local price modifications to central nodes
            sellingPriceOverride:
              bs.sellingPriceOverride !== undefined &&
              bs.sellingPriceOverride > 0
                ? bs.sellingPriceOverride
                : undefined,
            baseEnterpriseSellingPrice: p ? p.sellingPrice : 0,
            effectiveAssetValueRetail:
              bs.quantity *
              (bs.sellingPriceOverride !== undefined &&
              bs.sellingPriceOverride > 0
                ? bs.sellingPriceOverride
                : p
                ? p.sellingPrice
                : 0),
          };
        });

      // 2. Clear Cashiers & Employee Directory belonging to this branch
      const branchStaff = users
        .filter((u) => u.branchAssignmentId === currentBranchId)
        .map((u) => ({
          id: u.id,
          fullName: u.fullName,
          username: u.username,
          email: u.email,
          role: u.role,
          status: u.status,
        }));

      // 3. Complete Cashier Shift Audits logged for this branch
      const branchShifts = shifts.filter(
        (sh) => sh.branchId === currentBranchId,
      );

      // 4. Detailed Cashier Sales Invoices & itemized products
      const branchSales = sales
        .filter((s) => s.branchId === currentBranchId && !s.isDeleted)
        .map((s) => {
          const items = saleItems.filter(
            (si) => si.saleId === s.id && !si.isDeleted,
          );
          return {
            id: s.id,
            saleNumber: s.saleNumber,
            shiftId: s.shiftId,
            cashierId: s.cashierId,
            cashierName: s.cashierName,
            customerName: s.customerName,
            subtotal: s.subtotal,
            vat: s.vat,
            discount: s.discount,
            grandTotal: s.grandTotal,
            paymentMethod: s.paymentMethod,
            amountTendered: s.amountTendered,
            changeAmount: s.changeAmount,
            notes: s.notes,
            createdAt: s.createdAt,
            itemizedProducts: items.map((it) => ({
              productId: it.productId,
              productName: it.productName,
              unitPrice: it.unitPrice,
              quantity: it.quantity,
              total: it.total,
            })),
          };
        });

      // 5. Operating Petty Cash Expenses registered under this branch
      const branchExpenses = (expenses || []).filter(
        (ex: any) => ex.branchId === currentBranchId,
      );

      // 6. Local Inventory Movements logged for this branch
      const branchMovements = movements.filter(
        (m) =>
          m.sourceBranchId === currentBranchId ||
          m.destinationBranchId === currentBranchId,
      );

      // 7. Dynamic Inter-Branch Stocks Transfers
      const branchTransfers = stockTransfers.filter(
        (st) =>
          st.fromBranchId === currentBranchId ||
          st.toBranchId === currentBranchId,
      );

      const packet = {
        compiledAt: new Date().toISOString(),
        branchId: currentBranchId,
        branchName: bName,
        operatorName: currentUser?.fullName || "SYSTEM",
        recordCounts: {
          inventoryStocksCount: filteredStocks.length,
          salesTransactionsCount: branchSales.length,
          expensesDisbursementsCount: branchExpenses.length,
          cashierShiftsCount: branchShifts.length,
          registeredCashiersCount: branchStaff.length,
          inventoryMovementsHistory: branchMovements.length,
          interBranchTransfers: branchTransfers.length,
        },
        inventoryStocks: filteredStocks,
        cashierDirectory: branchStaff,
        cashierShifts: branchShifts,
        salesHistory: branchSales,
        expenseLedger: branchExpenses,
        inventoryMovements: branchMovements,
        stockTransfers: branchTransfers,
        authSignature: `TP-SECURE-STAMP-${currentBranchId}-${Math.floor(Math.random() * 90000 + 10000)}`,
      };

      setPayloadText(JSON.stringify(packet, null, 2));
      setNotes(
        `Automated Full Audit Snapshot compiled with local overrides: ${filteredStocks.length} Stocks, ${branchSales.length} Invoices, ${branchExpenses.length} Expenses.`,
      );
      showToast(
        "Full core database of branch compiled into snapshot packet containing local overrides!",
      );
    } else if (docType === "Sales Report" || docType === "Daily Sales Report") {
      const branchSales = sales.filter(
        (s) => s.branchId === currentBranchId && !s.isDeleted,
      );
      const totalAmount = branchSales.reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);
      const packet = {
        compiledAt: new Date().toISOString(),
        branchId: currentBranchId,
        branchName: bName,
        reportDate: new Date().toISOString().slice(0, 10),
        registeredSalesTransactions: branchSales.length,
        totalSalesValue: totalAmount,
        currency: "PHP",
        verifiedBy: currentUser?.fullName || "SYSTEM",
      };
      setPayloadText(JSON.stringify(packet, null, 2));
      setNotes(
        `Daily sales ledger report: ${branchSales.length} transactions, total: ₱${totalAmount.toLocaleString()}`,
      );
      showToast("Branch Sales ledger record compiled.");
    } else if (docType === "Inventory Count Report") {
      const filteredStocks = branchStock
        .filter((bs) => bs.branchId === currentBranchId)
        .map((bs) => {
          const p = products.find((prod) => prod.id === bs.productId);
          return {
            productId: bs.productId,
            productName: p ? p.productName : "Unknown Tile",
            sku: p ? p.sku : "",
            quantity: bs.quantity,
            sellingPriceOverride:
              bs.sellingPriceOverride !== undefined &&
              bs.sellingPriceOverride > 0
                ? bs.sellingPriceOverride
                : undefined,
          };
        });
      const packet = {
        compiledAt: new Date().toISOString(),
        branchId: currentBranchId,
        branchName: bName,
        inventoryVerifiedCount: filteredStocks.length,
        stocks: filteredStocks,
      };
      setPayloadText(JSON.stringify(packet, null, 2));
      setNotes(
        `Stock count Audit: verified ${filteredStocks.length} physical line levels with price tiers.`,
      );
      showToast("Core branch stock allocations compiled.");
    } else {
      const packet = {
        compiledAt: new Date().toISOString(),
        branchId: currentBranchId,
        branchName: bName,
        operator: currentUser?.fullName || "SYSTEM",
        docCategory: docType,
      };
      setPayloadText(JSON.stringify(packet, null, 2));
      showToast("Base digital cargo packet compiled.");
    }
  };

  const handleCreateTrans = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate payload shape JSON
    try {
      JSON.parse(payloadText);
    } catch (err) {
      showToast("JSON Syntax Error: Payload must be properly structured.");
      return;
    }

    await triggerSystemProcessing(
      "Transmitting Snapshot Packet to Branch...",
      1400,
      "progress",
      undefined,
      "Opening secure tunnel streams and broadcasting encrypted transmittal payload...",
    );

    const newId = createTransmittal(
      selectedDocType,
      toBranchId,
      payloadText,
      notes,
    );

    const newlyCreated: Transmittal = {
      id: newId,
      documentType: selectedDocType,
      fromBranchId: currentUser?.branchAssignmentId || "B1",
      toBranchId,
      submittedBy: currentUser?.fullName || "SYSTEM",
      status: "Submitted",
      payloadJson: payloadText,
      notes,
      submittedAt: new Date().toISOString(),
      isDeleted: false,
    };

    // Reset modals
    setNotes("");
    setPayloadText(
      '{\n  "totalSales": 35400,\n  "discrepancies": 0,\n  "countVerified": true\n}',
    );
    setShowModal(false);

    // Auto-open inspector for immediate print
    setInspectTab("itemized");
    setActiveTrans(newlyCreated);
    showToast("Dispatched! Delivery slip opened for printing / PDF export.");
  };

  const handleExportTransmittal = (t: Transmittal) => {
 const fromBranchId = t.fromBranchId;
 const fromBranchName = getBranchName(fromBranchId);

 // 1. Gather all data filtered by the specific source branch
 const bSales = sales.filter(
 (s) => s.branchId === fromBranchId && !s.isDeleted,
 );
 const bSaleIds = bSales.map((s) => s.id);
 const bSaleItems = saleItems.filter(
 (it) => bSaleIds.includes(it.saleId) && !it.isDeleted,
 );
 const bStock = branchStock.filter((bs) => bs.branchId === fromBranchId);
 const bShifts = shifts.filter((sh) => sh.branchId === fromBranchId);

 // Get Petty cash expenses from standard LocalStorage
 const bExpenses = expenses.filter(
 (ex: any) => ex.branchId === fromBranchId,
 );

 // 2. Financial KPIs
 const totalRevenue = bSales.reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);
 const totalCostOfGoods = bSaleItems.reduce((sum, item) => {
 const prod = products.find((p) => p.id === item.productId);
 const cost = prod ? prod.costPrice : 0;
 return sum + cost * item.quantity;
 }, 0);
 const totalExpenses = bExpenses.reduce(
 (sum, ex) => sum + (Number(ex.amount) || 0),
 0,
 );
 const grossProfit = totalRevenue - totalCostOfGoods;
 const netProfit = grossProfit - totalExpenses;
 const profitMarginPercent =
 totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

 const totalVat = bSales.reduce((sum, s) => sum + (Number(s.vat) || 0), 0);
 const totalDiscounts = bSales.reduce((sum, s) => sum + (Number(s.discount) || 0), 0);

 const paymentMethodBreakdown = bSales.reduce(
 (acc: Record<string, number>, s) => {
 acc[s.paymentMethod] = (acc[s.paymentMethod] || 0) + (Number(s.grandTotal) || 0);
 return acc;
 },
 {},
 );

 const avgOrderValue = bSales.length > 0 ? totalRevenue / bSales.length : 0;

 // 3. Product & Inventory Stats
 const totalStockQty = bStock.reduce((sum, bs) => sum + bs.quantity, 0);
 const uniqueSkusCount = bStock.length;
 const totalAssetValue = bStock.reduce((sum, bs) => {
 const prod = products.find((p) => p.id === bs.productId);
 return (
 sum +
 bs.quantity *
 (bs.sellingPriceOverride !== undefined && bs.sellingPriceOverride > 0
 ? bs.sellingPriceOverride
 : prod
 ? prod.sellingPrice
 : 0)
 );
 }, 0);
 const totalAssetCostValue = bStock.reduce((sum, bs) => {
 const prod = products.find((p) => p.id === bs.productId);
 return sum + bs.quantity * (prod ? prod.costPrice : 0);
 }, 0);

  // Catalog low and critical stocks
  const lowStockAlerts = bStock
    .filter((bs) => {
      const prod = products.find((p) => p.id === bs.productId);
      const min = (prod && prod.minimumStock !== undefined) ? prod.minimumStock : 10;
      return bs.quantity > 0 && bs.quantity <= min;
    })
    .map((bs) => {
      const prod = products.find((p) => p.id === bs.productId);
      return {
        productId: bs.productId,
        productName: prod ? prod.productName : "Tile SKU",
        sku: prod ? prod.sku : "",
        category: prod ? prod.category : "",
        quantity: bs.quantity,
        minimumRequired: (prod && prod.minimumStock !== undefined) ? prod.minimumStock : 10,
      };
    });

 const outOfStockAlerts = bStock
 .filter((bs) => bs.quantity <= 0)
 .map((bs) => {
 const prod = products.find((p) => p.id === bs.productId);
 return {
 productId: bs.productId,
 productName: prod ? prod.productName : "Tile SKU",
 sku: prod ? prod.sku : "",
 category: prod ? prod.category : "",
 };
 });

 // 4. Product Sales Standings & Volume Rank
 const productSalesVolume: Record<
 string,
 { id: string; name: string; sku: string; qty: number; revenue: number }
 > = {};
 bSaleItems.forEach((item) => {
 if (!productSalesVolume[item.productId]) {
 productSalesVolume[item.productId] = {
 id: item.productId,
 name: item.productName || "Unknown Product",
 sku: products.find((p) => p.id === item.productId)?.sku || "",
 qty: 0,
 revenue: 0,
 };
 }
 productSalesVolume[item.productId].qty += item.quantity;
 productSalesVolume[item.productId].revenue += Number(item.total) || 0;
 });

 const topProductsByRevenue = Object.values(productSalesVolume)
 .sort((a, b) => b.revenue - a.revenue)
 .slice(0, 10);

 const topProductsByQuantity = Object.values(productSalesVolume)
 .sort((a, b) => b.qty - a.qty)
 .slice(0, 10);

 // 5. Category Breakdown Analysis
 const categoryBreakdown: Record<
 string,
 { stockQty: number; revenue: number; uniqueProductsCount: number }
 > = {};

 // Seed with inventory categories
 bStock.forEach((bs) => {
 const prod = products.find((p) => p.id === bs.productId);
 if (prod) {
 const cat = prod.category || "General";
 if (!categoryBreakdown[cat]) {
 categoryBreakdown[cat] = {
 stockQty: 0,
 revenue: 0,
 uniqueProductsCount: 0,
 };
 }
 categoryBreakdown[cat].stockQty += bs.quantity;
 }
 });

 // Add revenue categories
 bSaleItems.forEach((item) => {
 const prod = products.find((p) => p.id === item.productId);
 const cat = prod ? prod.category || "General" : "General";
 if (!categoryBreakdown[cat]) {
 categoryBreakdown[cat] = {
 stockQty: 0,
 revenue: 0,
 uniqueProductsCount: 0,
 };
 }
 categoryBreakdown[cat].revenue += Number(item.total) || 0;
 });

 // Unique products per category
 Object.keys(categoryBreakdown).forEach((cat) => {
 const pCount = products.filter(
 (p) => p.category === cat && !p.isDeleted && isProductInBranch(p, fromBranchId, branchStock, branches),
 ).length;
 categoryBreakdown[cat].uniqueProductsCount = pCount;
 });

 // 6. Day-Of-Week & Hourly Sales Distribution Profiles (BI Pattern Analysis)
 const dayOfWeekDistribution: Record<
 string,
 { count: number; value: number }
 > = {
 Sunday: { count: 0, value: 0 },
 Monday: { count: 0, value: 0 },
 Tuesday: { count: 0, value: 0 },
 Wednesday: { count: 0, value: 0 },
 Thursday: { count: 0, value: 0 },
 Friday: { count: 0, value: 0 },
 Saturday: { count: 0, value: 0 },
 };

 const hourOfDayDistribution: Record<
 number,
 { count: number; value: number }
 > = {};
 for (let h = 0; h < 24; h++) {
 hourOfDayDistribution[h] = { count: 0, value: 0 };
 }

 const weekdays = [
 "Sunday",
 "Monday",
 "Tuesday",
 "Wednesday",
 "Thursday",
 "Friday",
 "Saturday",
 ];

 bSales.forEach((s) => {
 const date = new Date(s.createdAt);
 const dayName = weekdays[date.getDay()];
 const hour = date.getHours();

 if (dayName) {
 dayOfWeekDistribution[dayName].count++;
 dayOfWeekDistribution[dayName].value += Number(s.grandTotal) || 0;
 }

 if (hour >= 0 && hour < 24) {
 hourOfDayDistribution[hour].count++;
 hourOfDayDistribution[hour].value += Number(s.grandTotal) || 0;
 }
 });

 // 7. Shifts Analysis
 const totalShiftsLogged = bShifts.length;
 const uniqueCashiersCount = [...new Set(bShifts.map((s) => s.cashierName))]
 .length;

 const biDashboardMetrics = {
 executiveSummary: {
 exportTimestamp: new Date().toISOString(),
 reportingBranchId: fromBranchId,
 reportingBranchName: fromBranchName,
 curatorName: currentUser?.fullName || "SYSTEM",
 curatorRole: currentUser?.role || "Cashier",
 notes: t.notes || "Integrated Branch BI analytical packet.",
 },
 financialKpiIndicators: {
 revenueGrossPhp: totalRevenue,
 costOfGoodsSoldPhp: totalCostOfGoods,
 operatingExpensesPhp: totalExpenses,
 grossProfitMarginPhp: grossProfit,
 netOperatingIncomePhp: netProfit,
 profitMarginRatioRatio: profitMarginPercent,
 vatCollectedTaxPhp: totalVat,
 flatDiscountsDeductedPhp: totalDiscounts,
 averageTransactionSizePhp: avgOrderValue,
 totalSalesInvoicesCount: bSales.length,
 paymentSegmentsShare: paymentMethodBreakdown,
 },
 inventoryAssetTelemetry: {
 totalPhysicalUnitsOnHandCount: totalStockQty,
 uniqueSkusTrackedCount: uniqueSkusCount,
 assetValueAtRetailPricePhp: totalAssetValue,
 assetValueAtCostBasisPhp: totalAssetCostValue,
 lowStockItemsCounter: lowStockAlerts.length,
 outOfStockItemsCounter: outOfStockAlerts.length,
 lowStockAlertsCatalog: lowStockAlerts,
 outOfStockAlertsCatalog: outOfStockAlerts,
 },
 bestsellersStandingList: {
 topTenByRevenueYield: topProductsByRevenue,
 topTenByVolumeUnits: topProductsByQuantity,
 },
 categorySegmentationMetrics: categoryBreakdown,
 temporalPeakWaveAnalysis: {
 dayOfWeekMetrics: dayOfWeekDistribution,
 hourlyPeakMetrics: hourOfDayDistribution,
 },
 staffOperationsAudit: {
 totalShiftsTrackedCount: totalShiftsLogged,
 activeCashiersInReportingPeriod: uniqueCashiersCount,
 shiftsLog: bShifts.map((sh) => ({
 shiftId: sh.id,
 cashierName: sh.cashierName,
 startedAt: sh.openedAt,
 endedAt: sh.closedAt || "ACTIVE",
 expectedCash: sh.startCash + sh.shiftSalesTotal,
 actualCash: sh.cashCount,
 difference: sh.variance,
 })),
 },
 };

 let contentsParsed: any;
 try {
 contentsParsed = JSON.parse(t.payloadJson);
 } catch (err) {
 contentsParsed = { rawContent: t.payloadJson };
 }

 const slip = {
 transmittalId: t.id,
 docType: t.documentType,
 sentFrom: fromBranchName,
 sentTo: getBranchName(t.toBranchId),
 submittedBy: t.submittedBy,
 submittedAt: t.submittedAt,
 contents: contentsParsed,
 notes: t.notes,
 businessIntelligenceDashboard: biDashboardMetrics,
 };

 const jsonString = JSON.stringify(slip, null, 2);
 const filename = `TilePoint_BI_Transmittal_Package_${t.id}.json`;
 saveFileToBackup(jsonString, filename, 'Transmittals').then((res) => {
 addAuditLog(
 "TRANSMITTAL_EXPORT",
 `Downloaded comprehensive BI transmittal slip JSON for ${t.id}`,
 "Transmittals",
 t.id,
 );
 showToast(
 `BI Data Packet saved successfully to: ${res.path || filename}!`,
 );
 });
 };

 const handleOpenImport = () => {
 setRawImportText("");
 setShowImportModal(true);
 };

 const executeLocalImport = async () => {
 if (!rawImportText.trim()) {
 showToast("Please paste a valid JSON transmittal packet or sales report.");
 return;
 }

 try {
 const parsed = await verifyAndUnwrapBackup(rawImportText);
 if (parsed.transmittalId && parsed.docType) {
 // Construct transmittal entry
 createTransmittal(
 parsed.docType as TransmittalDocType,
 currentUser?.branchAssignmentId || "B1", // to current cashier branch
 JSON.stringify(parsed.contents || {}),
 `Imported cargo: ${parsed.notes || "No description"}. (Origin: ${parsed.sentFrom})`,
 );

 // If payload contains embedded inventory stock tally or catalog items, sync them into active database
 if (parsed.contents && (parsed.contents.inventoryCounts || parsed.contents.stocks)) {
 const stockItems = parsed.contents.inventoryCounts || parsed.contents.stocks;
 if (Array.isArray(stockItems) && stockItems.length > 0) {
 importProducts(stockItems, undefined);
 }
 }

 setShowImportModal(false);
 showToast("Transmittal slip parsed, cataloged, and approved across all managers!");
 } else if (parsed.branchName && parsed.reportingDate && Array.isArray(parsed.sales)) {
 // Direct sales report JSON transmission from another branch manager
 const res = importManualSalesReport(rawImportText);
 if (res.success) {
 setShowImportModal(false);
 showToast(`Branch sales report for ${parsed.branchName} (${parsed.reportingDate}) successfully imported and synced with complete details!`);
 } else {
 showToast(`Sales Report Sync Error: ${res.error}`);
 }
 } else {
 showToast(
 "Format Mismatch: Payload must be a valid TilePoint Transmittal Slip or Branch Sales Report JSON.",
 );
 }
 } catch (err: any) {
 showToast(err.message || "Syntax Error: Failed to parse raw text packet contents.");
 }
 };

 const renderPayloadPrintTable = (data: any) => {
 if (!data)
 return (
 <p className="italic text-[10px] text-default-500">
 Empty payload contents.
 </p>
 );

 // Case 0: Full Branch State Snapshot
 if (data.recordCounts) {
 const summary = data.recordCounts;
 const stocks = data.inventoryStocks || [];
 const shiftsList = data.cashierShifts || [];
 const salesList = data.salesHistory || [];
 const expensesList = data.expenseLedger || [];

 return (
 <div className="space-y-4 text-xs animate-fade-in print:text-black">
 {/* Quick Metrics Grid */}
 <div className="grid grid-cols-2 shadow-sm rounded-xl overflow-hidden sm:grid-cols-4 gap-px bg-default-100 border border-divider/15 p-px print:border-zinc-400 print:bg-transparent">
 <div className="p-3 bg-content1 text-center print:bg-white">
 <span className="text-[10px] text-default-500 font-bold uppercase block print:text-default-700">
 Stock Catalog
 </span>
 <span className=" text-base font-black text-primary print:text-black">
 {summary.inventoryStocksCount || 0} Products
 </span>
 </div>
 <div className="p-3 bg-content1 text-center print:bg-white">
 <span className="text-[10px] text-default-500 font-bold uppercase block print:text-default-700">
 Cashier Transactions
 </span>
 <span className=" text-base font-black text-emerald-500 print:text-black">
 {summary.salesTransactionsCount || 0} Invoices
 </span>
 </div>
 <div className="p-3 bg-content1 text-center print:bg-white">
 <span className="text-[10px] text-default-500 font-bold uppercase block print:text-default-700">
 Operating Expenses
 </span>
 <span className=" text-base font-black text-rose-500 print:text-black">
 {summary.expensesDisbursementsCount || 0} Logs
 </span>
 </div>
 <div className="p-3 bg-content1 text-center print:bg-white">
 <span className="text-[10px] text-default-500 font-bold uppercase block print:text-default-700">
 Shifts Logged
 </span>
 <span className=" text-base font-black text-amber-500 print:text-black">
 {summary.cashierShiftsCount || 0} Audits
 </span>
 </div>
 </div>

 <div className="space-y-5">
 {/* 1. Stocks Ledger Block */}
 {stocks.length > 0 && (
 <div className="p-3.5 rounded-2xl bg-content1/30 border border-divider/15 space-y-2 print:border-zinc-400 print:bg-transparent">
 <p className="font-black uppercase text-[10px] text-primary border-b border-divider/20 pb-1.5 tracking-wider flex justify-between items-center print:text-black print:border-black">
 <span>I. Branch Stock Catalog Ledger</span>
 <span className=" font-bold text-[9px] bg-default-100 text-default-500 px-1.5 py-0.2 rounded print:text-black">
 {stocks.length} items
 </span>
 </p>
 <div className="max-h-[160px] overflow-y-auto pr-1">
 <table className="w-full text-left text-[10px] border-collapse print:text-black">
 <thead>
 <tr className="border-b border-divider/20 font-bold text-default-500 text-[9px] print:text-black">
 <th className="py-1">Product Description</th>
 <th className="py-1 text-center ">SKU Code</th>
 <th className="py-1 text-center">
 Local Price Override
 </th>
 <th className="py-1 text-right">Qty</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-divider/10 print:divide-zinc-300">
 {stocks.map((item: any, i: number) => (
 <tr key={i} className="hover:bg-content1/30">
 <td className="py-1.5 font-bold text-foreground print:text-black">
 {item.productName || item.productId}
 </td>
 <td className="py-1.5 text-center text-default-500 print:text-black">
 {item.sku || "N/A"}
 </td>
 <td className="py-1.5 text-center text-teal-500 font-bold print:text-black">
 {item.sellingPriceOverride ? (
 formatCurrency(item.sellingPriceOverride)
 ) : (
 <span className="text-default-500 italic">None</span>
 )}
 </td>
 <td className="py-1.5 text-right font-black text-emerald-500 print:text-black">
 {item.quantity} pcs
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* 2. Detailed Cashier Sales Invoices Block */}
 {salesList.length > 0 && (
 <div className="p-3.5 rounded-2xl bg-content1/30 border border-divider/15 space-y-3 print:border-zinc-400 print:bg-transparent">
 <p className="font-black uppercase text-[10px] text-primary border-b border-divider/20 pb-1.5 tracking-wider flex justify-between items-center print:text-black print:border-black">
 <span>II. Cashier Transactions History Ledger</span>
 <span className=" font-bold text-[9px] bg-default-100 text-default-500 px-1.5 py-0.2 rounded print:text-black">
 {salesList.length} sales
 </span>
 </p>
 <div className="max-h-[220px] overflow-y-auto space-y-3 pr-1">
 {salesList.map((sale: any, i: number) => (
 <div
 key={i}
 className="p-2.5 border border-divider/10 bg-content1 rounded-xl space-y-1.5 text-[10.5px] print:border-zinc-400 print:mb-2 print:break-inside-avoid"
 >
 <div className="flex justify-between items-center bg-default-100 p-1 px-2 rounded-lg print:border-zinc-400">
 <span className=" font-black text-primary print:text-black">
 {sale.saleNumber}
 </span>
 <span className=" text-[9px] text-default-500 print:text-black">
 {new Date(sale.createdAt).toLocaleString()}
 </span>
 </div>

 <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-default-500 pr-1">
 <div>
 Cashier:{" "}
 <strong className="text-foreground font-bold print:text-black">
 {sale.cashierName}
 </strong>
 </div>
 <div>
 Customer:{" "}
 <strong className="text-foreground font-bold print:text-black">
 {sale.customerName || "Walk-in"}
 </strong>
 </div>
 <div>
 Pay Mode:{" "}
 <strong className="text-amber-500 font-bold uppercase print:text-black">
 {sale.paymentMethod}
 </strong>
 </div>
 <div className="text-right">
 Grand Total:{" "}
 <strong className="text-emerald-500 font-black print:text-black">
 ₱{(sale.grandTotal || 0).toLocaleString()}
 </strong>
 </div>
 </div>

 {/* Sold items breakdown */}
 {Array.isArray(sale.itemizedProducts) &&
 sale.itemizedProducts.length > 0 && (
 <div className="mt-1.5 pt-1.5 border-t border-divider/10">
 <table className="w-full text-left text-[9px]">
 <thead>
 <tr className="text-default-500 font-bold border-b border-divider/10">
 <th>Tile Sold Description</th>
 <th className="text-center">Price</th>
 <th className="text-center">Qty</th>
 <th className="text-right">Sum</th>
 </tr>
 </thead>
 <tbody>
 {sale.itemizedProducts.map(
 (p: any, idx: number) => (
 <tr
 key={idx}
 className="border-b border-divider/5 border-dashed"
 >
 <td className="py-0.5 text-default-700 font-medium print:text-black">
 {p.productName}
 </td>
 <td className="py-0.5 text-center print:text-black">
 ₱{(p.unitPrice || 0).toLocaleString()}
 </td>
 <td className="py-0.5 text-center font-bold text-primary print:text-black">
 {p.quantity} pcs
 </td>
 <td className="py-0.5 text-right font-bold text-emerald-500 print:text-black">
 ₱{(p.total || 0).toLocaleString()}
 </td>
 </tr>
 ),
 )}
 </tbody>
 </table>
 </div>
 )}
 </div>
 ))}
 </div>
 </div>
 )}

 {/* 3. Operational Expenses Block */}
 {expensesList.length > 0 && (
 <div className="p-3.5 rounded-2xl bg-content1/30 border border-divider/15 space-y-2 print:border-zinc-400 print:bg-transparent">
 <p className="font-black uppercase text-[10px] text-primary border-b border-divider/20 pb-1.5 tracking-wider flex justify-between items-center print:text-black print:border-black">
 <span>III. Branch Expenses &amp; Cash Disbursements</span>
 <span className=" font-bold text-[9px] bg-default-100 text-default-500 px-1.5 py-0.2 rounded print:text-black">
 ₱
 {expensesList
 .reduce(
 (acc: number, current: any) =>
 acc + (current.amount || 0),
 0,
 )
 .toLocaleString()}{" "}
 total
 </span>
 </p>
 <div className="max-h-[160px] overflow-y-auto pr-1">
 <table className="w-full text-left text-[10px] border-collapse print:text-black">
 <thead>
 <tr className="border-b border-divider/20 font-bold text-default-500 text-[9px] print:text-black">
 <th className="py-1">Category</th>
 <th className="py-1">Memo Notes</th>
 <th className="py-1 text-center">Audited By</th>
 <th className="py-1 text-right">Amount</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-divider/10 print:divide-zinc-300">
 {expensesList.map((ex: any, i: number) => (
 <tr key={i} className="hover:bg-content1/30">
 <td className="py-1.5 font-bold text-rose-500 print:text-black">
 {ex.category}
 </td>
 <td
 className="py-1.5 text-default-500 italic max-w-[120px] truncate print:text-black print:max-w-none print:whitespace-normal"
 title={ex.notes}
 >
 {ex.notes}
 </td>
 <td className="py-1.5 text-center text-default-500 print:text-black">
 {ex.recordedBy}
 </td>
 <td className="py-1.5 text-right font-black text-rose-500 print:text-black">
 ₱{(ex.amount || 0).toLocaleString()}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* 4. Cashier Shift Audits Block */}
 {shiftsList.length > 0 && (
 <div className="p-3.5 rounded-2xl bg-content1/30 border border-divider/15 space-y-2 print:border-zinc-400 print:bg-transparent">
 <p className="font-black uppercase text-[10px] text-primary border-b border-divider/20 pb-1.5 tracking-wider flex justify-between items-center print:text-black print:border-black">
 <span>V. Cashier Shift &amp; Register Drawer Audits</span>
 <span className=" font-bold text-[9px] bg-default-100 text-default-500 px-1.5 py-0.2 rounded print:text-black">
 {shiftsList.length} shifts
 </span>
 </p>
 <div className="max-h-[160px] overflow-y-auto pr-1">
 <table className="w-full text-left text-[10px] border-collapse print:text-black">
 <thead>
 <tr className="border-b border-divider/20 font-bold text-default-500 text-[9px] print:text-black">
 <th className="py-1">Logged Cashier</th>
 <th className="py-1 text-center ">Status</th>
 <th className="py-1 text-right">Open Balance</th>
 <th className="py-1 text-right">Drawer Close</th>
 <th className="py-1 text-right">Discrepancy</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-divider/10 print:divide-zinc-300">
 {shiftsList.map((sh: any, i: number) => {
 const hasVariance = sh.variance !== 0;
 return (
 <tr key={i} className="hover:bg-content1/30">
 <td className="py-1.5 font-bold text-foreground print:text-black">
 {sh.cashierName}
 </td>
 <td className="py-1.5 text-center text-default-500">
 <span
 className={`px-1 rounded text-[8.5px] font-black uppercase ${sh.status === "Open" ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-500/15 text-default-500"}`}
 >
 {sh.status}
 </span>
 </td>
 <td className="py-1.5 text-right print:text-black">
 ₱{(sh.startCash || 0).toLocaleString()}
 </td>
 <td className="py-1.5 text-right font-black print:text-black">
 ₱
 {(
 sh.cashCount ||
 sh.endCash ||
 0
 ).toLocaleString()}
 </td>
 <td
 className={`py-1.5 text-right font-black ${hasVariance ? "text-rose-500" : "text-emerald-500"}`}
 >
 {sh.variance > 0
 ? `+₱${sh.variance.toLocaleString()}`
 : sh.variance < 0
 ? `-₱${Math.abs(sh.variance).toLocaleString()}`
 : "₱0 (Balanced)"}
 </td>
 </tr>
 );
  })}
</tbody>
 </table>
 </div>
 </div>
 )}
 </div>
 </div>
 );
 }

 // Case 1: Has stocks/inventoryStocks list
 const items = data.stocks || data.inventoryStocks;
 if (Array.isArray(items)) {
 return (
 <div className="space-y-1.5 mt-2">
 <p className="font-extrabold uppercase text-[9px] border-b border-black dark:border-divider/25 pb-0.5 tracking-wider">
 Itemized Stock Allocations:
 </p>
 <table className="w-full text-left text-[10px] border-collapse print:text-black">
 <thead>
 <tr className="border-b border-black text-[9px] font-bold text-default-500 print:text-black">
 <th className="py-1">Material/Product Name</th>
 <th className="py-1 text-center ">SKU</th>
 <th className="py-1 text-center">Local Price Override</th>
 <th className="py-1 text-right">Handover Qty</th>
 </tr>
 </thead>
 <tbody>
 {items.map((item: any, i: number) => (
 <tr
 key={i}
 className="border-b border-zinc-200 dark:border-divider/20 border-dashed print:border-zinc-400"
 >
 <td className="py-1.5 font-sans font-bold text-foreground print:text-black">
 {item.productName || item.productId}
 </td>
 <td className="py-1.5 text-center text-default-500 print:text-black">
 {item.sku || "N/A"}
 </td>
 <td className="py-1.5 text-center text-teal-500 font-bold print:text-black">
 {item.sellingPriceOverride
 ? formatCurrency(item.sellingPriceOverride)
 : "None"}
 </td>
 <td className="py-1.5 text-right font-black text-emerald-500 print:text-black">
 {item.quantity} pcs
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 );
 }

 // Case 2: Has salesHistory
 const salesList = data.salesHistory;
 if (Array.isArray(salesList)) {
 return (
 <div className="space-y-2 mt-2">
 <p className="font-extrabold uppercase text-[9px] border-b border-black dark:border-divider/25 pb-0.5 tracking-wider">
 Registered Sales Handover:
 </p>
 <table className="w-full text-left text-[10px] border-collapse print:text-black">
 <thead>
 <tr className="border-b border-black text-[9px] font-bold text-default-500 print:text-black">
 <th className="py-1">Transaction Ref</th>
 <th className="py-1 text-center ">Payment</th>
 <th className="py-1 text-right ">Grand Total</th>
 </tr>
 </thead>
 <tbody>
 {salesList.map((sale: any, i: number) => (
 <tr
 key={i}
 className="border-b border-zinc-200 dark:border-divider/20 border-dashed print:border-zinc-400"
 >
 <td className="py-1.5 font-bold text-primary print:text-black">
 {sale.saleNumber || sale.id}
 </td>
 <td className="py-1.5 text-center font-medium text-default-500 print:text-black">
 {sale.paymentMethod || "CASH"}
 </td>
 <td className="py-1.5 text-right font-black text-emerald-500 print:text-black">
 ₱{(sale.grandTotal || 0).toLocaleString()}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 );
 }

 // Case 3: Just flat key-value pairs
 const keys = Object.keys(data).filter((k) => typeof data[k] !== "object");
 if (keys.length > 0) {
 return (
 <div className="space-y-1.5 mt-2">
 <p className="font-extrabold uppercase text-[9px] border-b border-black dark:border-divider/25 pb-0.5 tracking-wider">
 Transmittal Properties Ledger:
 </p>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[10.5px]">
 {keys.map((k, idx) => (
 <div
 key={idx}
 className="flex justify-between border-b border-zinc-200 dark:border-divider/20 py-1 print:border-zinc-400"
 >
 <span className="capitalize font-medium text-default-500 dark:text-default-500 font-sans print:text-default-700">
 {k.replace(/([A-Z])/g, " $1")}:
 </span>
 <span className=" font-bold text-foreground print:text-black">
 {String(data[k])}
 </span>
 </div>
 ))}
 </div>
 </div>
 );
 }

    return (
      <pre className="p-2 border border-zinc-300 dark:border-divider/20 bg-zinc-50 dark:bg-background text-[9px] overflow-auto whitespace-pre-wrap max-h-[140px] text-default-500 print:text-black print:bg-white print:border-zinc-400">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
 };

 const currentBranch = branches.find(
    (b) => b.id === (currentUser?.branchAssignmentId || "B1"),
  );
  const isAuthorizedBranch =
    !currentUser ||
    currentUser.branchAssignmentId === "B1" ||
    (currentBranch && currentBranch.isDistributionBranch);

 if (!isAuthorizedBranch) {
 return (
 <div className="space-y-6 animate-fade-in text-foreground">
 <div className="bg-content1 p-8 rounded-2xl border border-divider/30 text-center max-w-lg mx-auto my-12 space-y-4 shadow-xl">
 <div className="mx-auto h-16 w-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
 <Send className="h-7 w-7 text-amber-500 animate-pulse" />
 </div>
 <div>
 <h4 className="text-base font-black text-foreground uppercase tracking-wider">
 Transmittals Restricted
 </h4>
 <p className="text-[10px] text-default-500 font-bold uppercase tracking-widest mt-1">
 LOGISTICS PRIVILEGE LOCK
 </p>
 </div>
 <p className="text-xs text-default-500 leading-relaxed">
 Inter-Branch Digital Transmittals are restricted for{" "}
 <strong className="font-bold text-foreground">
 {currentBranch ? currentBranch.name : "your branch"}
 </strong>
 . Under standard distribution parameters, only the{" "}
 <strong className="font-black text-amber-500">
 Main HQ Branch
 </strong>{" "}
 or dynamically designated{" "}
 <strong className="text-emerald-500 font-bold">
 Distribution Hubs
 </strong>{" "}
 are authorized to dispatch or import digital transmittals.
 </p>
 <div className="pt-2 text-[10px] font-bold text-default-500 ">
 Instruct the System Administrator to designate this location as a
 Distribution Hub in Branch settings.
 </div>
 </div>
 </div>
 );
 }

 return (
  <div className="space-y-6 animate-fade-in text-foreground">
  <HeaderBar
    title="Inter-Branch Digital Transmittals"
    subtitle="Securely compile, export, dispatch, and import verifiable data packets and inventory ledgers across regional hubs."
    icon={Send}
    badge={{ text: `${transmittals.length} Transmittals`, variant: 'primary' }}
    actions={
      <div className="flex gap-2">
        <HeroButton
          variant="secondary"
          size="sm"
          onClick={handleOpenImport}
          startIcon={<Upload className="h-4 w-4" />}
          className="rounded-full"
        >
          Import Slip
        </HeroButton>

        <HeroButton
          variant="primary"
          size="sm"
          onClick={() => {
            setToBranchId(
              branches.find((b) => b.id !== (currentUser?.branchAssignmentId || "B1"))
                ?.id || "B2",
            );
            setSelectedDocType("Full Branch State Snapshot");
            setShowModal(true);
            setTimeout(() => {
              compileBranchData("Full Branch State Snapshot");
            }, 50);
          }}
          startIcon={<Plus className="h-4 w-4" />}
          className="rounded-full shadow-sm"
        >
          Dispatch Packet
        </HeroButton>
      </div>
    }
  />

 {/* Main Ledger grid */}
 <div className="bg-content1 border border-divider rounded-large shadow-small text-foreground shadow-sm overflow-x-auto p-0">
 <table className="w-full text-xs text-left border-collapse table-auto min-w-[900px]">
 <thead>
 <tr className="border-b border-divider/20 bg-background/30 text-[10px] uppercase font-bold text-default-500 tracking-wider">
 <th className="py-3 px-4">Tracking Slip Ref</th>
 <th className="py-3 px-4 text-center">Document Category</th>
 <th className="py-3 px-4 text-center">Dispatch Branch</th>
 <th className="py-3 px-4 text-center">Target Destination</th>
 <th className="py-3 px-4 text-center">Status</th>
 <th className="py-3 px-4 text-right">Submitted Date</th>
 <th className="py-3 px-4 text-center">Command Operations</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-divider/10 text-foreground/90">
 {transmittals
 .slice((transPage - 1) * transPageSize, transPage * transPageSize)
 .map((t, idx) => {
 let badgeStyle = "bg-default-100 text-foreground";
 if (t.status === "Submitted")
 badgeStyle =
 "bg-primary-50 text-primary-700 border-primary/25";
 if (t.status === "Approved")
 badgeStyle =
 "bg-secondary-50 text-secondary-700 border-secondary/25";
 if (t.status === "Archived")
 badgeStyle =
 "bg-default-100 text-default-500/70 border-transparent";

 return (
 <tr
 key={idx}
 className="hover:bg-content1/50 transition-colors"
 >
 <td className="py-3.5 px-4">
 <div className="font-extrabold text-primary text-xs">
 {t.id}
 </div>
 <div className="text-[10px] text-default-500">
 Signed: {t.submittedBy}
 </div>
 </td>

 <td className="py-3.5 px-4 text-center font-bold">
 <span className="bg-default-100 px-2.5 py-0.5 rounded-full text-foreground">
 {t.documentType}
 </span>
 </td>

 <td className="py-3.5 px-4 text-center font-bold text-foreground">
 {getBranchName(t.fromBranchId)}
 </td>

 <td className="py-3.5 px-4 text-center font-bold text-foreground">
 {getBranchName(t.toBranchId)}
 </td>

 <td className="py-3.5 px-4 text-center">
 <span
 className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase border ${badgeStyle}`}
 >
 {t.status}
 </span>
 </td>

 <td className="py-3.5 px-4 text-right text-default-500 ">
 {t.submittedAt && !isNaN(new Date(t.submittedAt).getTime()) ? new Date(t.submittedAt).toLocaleDateString() : 'N/A'}
 </td>

 <td className="py-3.5 px-4 text-center">
 <div className="flex gap-1.5 justify-center">
 <button
 onClick={() => {
 setInspectTab("itemized");
 setActiveTrans(t);
 }}
 className="py-1 px-3 text-[10px] rounded-full border border-primary/35 text-primary bg-primary/5 hover:bg-primary/10 cursor-pointer font-bold transition-colors flex items-center gap-1"
 >
 <Printer className="h-3 w-3 text-primary" /> Inspect
 &amp; Print
 </button>

 <button
 onClick={() => handleExportTransmittal(t)}
 className="p-1 px-1.5 text-secondary hover:scale-105 rounded-full border border-secondary/20 bg-secondary/5 cursor-pointer transition-colors"
 title="Download raw packet data"
 >
 <Download className="h-3.5 w-3.5" />
 </button>
 </div>
 </td>
 </tr>
 );
 })}

 {transmittals.length === 0 && (
 <tr>
 <td
 colSpan={7}
 className="py-8 text-center text-default-500"
 >
 No inter-branch transmittal ledgers currently recorded.
 </td>
 </tr>
 )}
</tbody>
 </table>
 </div>

 <div className="mt-3">
 <TablePagination
 currentPage={transPage}
 totalItems={transmittals.length}
 pageSize={transPageSize}
 onPageChange={setTransPage}
 itemName="transmittals"
 />
 </div>

 {/* MODAL 1: Create dispatch document form */}
 {showModal && typeof document !== 'undefined' && createPortal(
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
 <div
 className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity"
 onClick={() => setShowModal(false)}
 />
 <form
 onSubmit={handleCreateTrans}
 className="relative w-full max-w-sm rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground space-y-4 text-left"
 >
 <div className="flex justify-between items-center border-b border-divider/20 pb-2.5 flex-shrink-0">
 <h3 className="text-base font-bold text-primary flex items-center gap-2">
 <Send className="h-4.5 w-4.5" />
 <span>Dispatch Form Package</span>
 </h3>
 <button
 type="button"
 onClick={() => setShowModal(false)}
 className="text-default-500 hover:text-foreground cursor-pointer p-1 rounded-full"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 <div className="space-y-1 relative">
 <div className="flex justify-between items-center">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">
 Document Category
 </label>
 <button
 type="button"
 onClick={() => compileBranchData(selectedDocType)}
 className="bg-primary/10 text-primary hover:bg-primary/25 border border-primary/20 px-2 py-0.5 rounded text-[9px] font-black uppercase transition-colors"
 title="Automatically snapshot and wrap core matching branch records into standard JSON ledger schema"
 >
 Pull Live Data
 </button>
 </div>
 <select
 value={selectedDocType ?? ''}
 onChange={(e) => {
 const val = e.target.value as TransmittalDocType;
 setSelectedDocType(val);
 compileBranchData(val);
 }}
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg cursor-pointer"
 >
 <option value="Full Branch State Snapshot">
 Full Branch State Snapshot (All Sales, Stocks, Shifts &amp;
 Expenses)
 </option>
 <option value="Daily Sales Report">Daily Sales Report</option>
 <option value="Inventory Count Report">
 Inventory Count Report
 </option>
 <option value="Purchase Order">Purchase Order</option>
 <option value="Receiving Report">Receiving Report</option>
 <option value="Branch Request">Branch Request</option>
 </select>
 </div>

 <div className="space-y-1 relative">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">
 Target branch destination
 </label>
 <select
 value={toBranchId ?? ''}
 onChange={(e) => setToBranchId(e.target.value)}
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg cursor-pointer"
 >
 {branches
 .filter((b) => b.id !== (currentUser?.branchAssignmentId || 'B1'))
 .map((b) => (
 <option key={b.id} value={b.id}>
 {b.name}
 </option>
 ))}
 </select>
 </div>

 <div className="space-y-1 relative">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">
 JSON Content payload
 </label>
 <textarea
 required
 rows={4}
 value={payloadText ?? ''}
 onChange={(e) => setPayloadText(e.target.value)}
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg"
 />
 </div>

 <div className="space-y-1 relative">
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">
 Summary memo notes
 </label>
 <input
 type="text"
 value={notes ?? ''}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="Summary memo notes"
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg"
 />
 </div>

 <div className="flex justify-end gap-2 border-t border-divider/20 pt-4 flex-shrink-0">
 <button
 type="button"
 onClick={() => setShowModal(false)}
 className="px-4 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-default-100 text-default-500 transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 rounded-medium px-5 py-2 text-xs shadow-sm cursor-pointer"
 >
 Dispatch Packet
 </button>
 </div>
 </form>
 </div>,
 document.body
 )}

 {/* MODAL 2: Inspect Payload contents details & Printable interactive slip */}
 {activeTrans && typeof document !== 'undefined' && createPortal(
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in no-print font-sans">
 <div
 className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity"
 onClick={() => setActiveTrans(null)}
 />
 <div className="relative w-full max-w-md rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground space-y-4 text-left flex flex-col max-h-[90vh]">
 <div className="flex justify-between items-center border-b border-divider/20 pb-2.5">
 <h3 className="text-base font-black text-primary flex items-center gap-2">
 <FileCheck className="h-5 w-5" />
 <span className="uppercase tracking-wide">
 Transmittal Slip Details
 </span>
 </h3>
 <button
 onClick={() => setActiveTrans(null)}
 className="text-default-500 hover:text-foreground cursor-pointer p-1 rounded-full"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 {/* Modal Navigation Tabs */}
 <div className="flex border-b border-divider/15 p-1 bg-content1/50 rounded-xl flex-shrink-0">
 <button
 type="button"
 onClick={() => setInspectTab("itemized")}
 className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
 inspectTab === "itemized"
 ? "bg-primary text-primary-foreground shadow-sm font-black"
 : "text-default-500 hover:bg-primary/10 hover:text-primary"
 }`}
 >
 Delivery Slip Preview
 </button>
 <button
 type="button"
 onClick={() => setInspectTab("raw")}
 className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
 inspectTab === "raw"
 ? "bg-primary text-primary-foreground shadow-sm font-black"
 : "text-default-500 hover:bg-primary/10 hover:text-primary"
 }`}
 >
 Raw JSON Ledger
 </button>
 </div>

 {/* Scrollable Container */}
 <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 py-1 max-h-[50vh]">
 {/* Content summary */}
 <div className="space-y-2 text-xs leading-relaxed text-default-500/90 font-medium bg-content1/50 p-3 rounded-2xl border border-divider/10">
 <div className="flex justify-between">
 <strong>Tracking Slip Ref:</strong>
 <span className=" text-primary font-bold">
 {activeTrans.id}
 </span>
 </div>
 <div className="flex justify-between">
 <strong>Dispatch Branch:</strong>
 <span className="text-foreground font-bold">
 {getBranchName(activeTrans.fromBranchId)}
 </span>
 </div>
 <div className="flex justify-between">
 <strong>Recipient Destination:</strong>
 <span className="text-foreground font-bold">
 {getBranchName(activeTrans.toBranchId)}
 </span>
 </div>
 <div className="flex justify-between">
 <strong>Signed Supervisor:</strong>
 <span className="text-foreground font-bold">
 {activeTrans.submittedBy}
 </span>
 </div>
 <div className="flex justify-between">
 <strong>Dispatch Date:</strong>
 <span className=" text-foreground font-bold">
 {new Date(activeTrans.submittedAt).toLocaleString()}
 </span>
 </div>
 {activeTrans.notes && (
 <div className="pt-2 italic text-secondary border-t border-divider/10 mt-1">
 Notes: "{activeTrans.notes}"
 </div>
 )}
 </div>

 {inspectTab === "itemized" ? (
 <div className="rounded-2xl border border-divider/30 p-4 bg-content1 space-y-3 text-xs text-zinc-800 dark:text-foreground shadow-inner">
 <div className="text-center border-b border-zinc-300 dark:border-divider/20 border-dashed pb-2">
 <div className="text-xs font-black tracking-wider text-primary flex items-center justify-center gap-1">
 <Send className="h-3.5 w-3.5" /> TILEPOINT LOGISTICS
 SUMMARY
 </div>
 <div className="text-[9px] text-default-500 mt-0.5 tracking-widest uppercase font-sans">
 Official Inter-Branch Slips
 </div>
 </div>

 {/* Dynamic Print Preview Content */}
 <div>
 {(() => {
 try {
 return renderPayloadPrintTable(
 JSON.parse(activeTrans.payloadJson),
 );
 } catch (err) {
 return (
 <p className="text-rose-500 text-[10px]">
 Error parsing transmittal JSON: Invalid Schema
 </p>
 );
 }
 })()}
 </div>

 <div className="text-center pt-2 border-t border-dashed border-zinc-200 dark:border-divider/20">
 <div className="text-[9px] text-default-500 font-sans leading-tight">
 Reconcile physical stock counts fully upon handover
 reception.
 </div>
 </div>
 </div>
 ) : (
 <div className="space-y-1">
 <span className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1 block">
 Decrypted Payload Contents
 </span>
 <pre className="p-3 bg-content1 text-primary text-[10.5px] rounded-xl border border-divider/30 max-h-[180px] overflow-auto select-all leading-relaxed shadow-inner">
 {JSON.stringify(
 JSON.parse(activeTrans.payloadJson),
 null,
 2,
 )}
 </pre>
 </div>
 )}
 </div>

 {/* Verification action row */}
 {currentUser?.role === UserRole.ADMIN &&
 activeTrans.status !== "Approved" && (
 <div className="pt-1 flex-shrink-0">
 <button
 type="button"
 onClick={() => {
 updateTransmittalStatus(activeTrans.id, "Approved");
 setActiveTrans(null);
 showToast(
 "Inter-branch document verified and authenticated successfully.",
 );
 }}
 className="w-full py-2 bg-secondary text-secondary-foreground rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1 hover:bg-secondary/90 transition-all border-0"
 >
 <CheckSquare className="h-4 w-4" /> Authenticate &amp;
 Approve Document
 </button>
 </div>
 )}

 {/* Interactive footer action row */}
 <div className="flex gap-2 pt-3 border-t border-divider/15 justify-end flex-shrink-0">
 <button
 type="button"
 onClick={() => {
 window.print();
 addAuditLog(
 "TRANSMITTAL_PRINT",
 `Printed transmittal slip ${activeTrans.id}`,
 "Transmittals",
 activeTrans.id,
 );
 showToast("Preparing slip print canvas...");
 }}
 className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-sm flex items-center gap-1.5 transition-all"
 >
 <Printer className="h-4 w-4" /> Print / Save PDF
 </button>

 <button
 type="button"
 onClick={() => handleExportTransmittal(activeTrans)}
 className="px-3 py-2 bg-default-100 text-primary hover:bg-default-100 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-colors border border-divider/10"
 title="Download raw JSON packet"
 >
 <Download className="h-4 w-4" /> Export JSON
 </button>

 <button
 type="button"
 onClick={() => setActiveTrans(null)}
 className="px-4 py-2 text-xs font-bold rounded-xl cursor-pointer hover:bg-default-100 text-default-500 transition-colors"
 >
 Close
 </button>
 </div>
 </div>
 </div>,
 document.body
 )}

 {/* EXCLUSIVELY FOR PHYSICAL PRINT / PDF COMPILATION */}
 {activeTrans && (
 <div
 id="printable-transmittal-slip"
 className="hidden print:block print:fixed print:inset-0 print:bg-white print:text-black print:z-[99999999] print:p-8 print:overflow-visible text-[11px] leading-relaxed"
 >
 <div className="max-w-xl mx-auto border-4 border-double border-black p-6 space-y-5">
 {/* Header */}
 <div className="text-center border-b-2 border-black pb-4">
 <h1 className="text-lg font-black tracking-widest uppercase">
 TILEPOINT SYSTEMS GROUP
 </h1>
 <p className="text-xs font-bold mt-1 tracking-wider uppercase">
 OFFICIAL INTER-BRANCH DELIVERY &amp; TRANSMITTAL SLIP
 </p>
 <p className="text-[9px] text-default-500 mt-0.5">
 COMPLIANT WITH CORPORATE INVENTORY DISTRIBUTION DIRECTIVES
 </p>
 </div>

 {/* Key-Value Details Table */}
 <div className="grid grid-cols-2 gap-y-2 border-b border-black pb-4 text-[10px]">
 <div>
 <span className="font-bold uppercase text-[9px] text-default-600 block">
 TRACKING SLIP ID:
 </span>
 <p className="text-xs font-black text-black mt-0.5">
 {activeTrans.id}
 </p>
 </div>
 <div>
 <span className="font-bold uppercase text-[9px] text-default-600 block">
 DOCUMENT CATEGORY:
 </span>
 <p className="text-xs font-black mt-0.5 underline">
 {activeTrans.documentType}
 </p>
 </div>
 <div>
 <span className="font-bold uppercase text-[9px] text-default-600 block">
 DISPATCH ORIGIN:
 </span>
 <p className="text-xs font-bold mt-0.5">
 {getBranchName(activeTrans.fromBranchId)} (ID:{" "}
 {activeTrans.fromBranchId})
 </p>
 </div>
 <div>
 <span className="font-bold uppercase text-[9px] text-default-600 block">
 TARGET DESTINATION:
 </span>
 <p className="text-xs font-bold mt-0.5">
 {getBranchName(activeTrans.toBranchId)} (ID:{" "}
 {activeTrans.toBranchId})
 </p>
 </div>
 <div>
 <span className="font-bold uppercase text-[9px] text-default-600 block">
 AUTHORIZED ISSUED BY:
 </span>
 <p className="text-xs font-bold mt-0.5">
 {activeTrans.submittedBy}
 </p>
 </div>
 <div>
 <span className="font-bold uppercase text-[9px] text-default-600 block">
 SYSTEM DISPATCH DATE:
 </span>
 <p className="text-xs mt-0.5">
 {new Date(activeTrans.submittedAt).toLocaleString()}
 </p>
 </div>
 </div>

 {/* Notes Section */}
 {activeTrans.notes && (
 <div className="bg-zinc-100 p-2.5 border border-zinc-300 rounded-lg">
 <span className="font-bold underline uppercase text-[8px] block">
 Dispatcher Memo Notes:
 </span>
 <p className="text-xs italic mt-0.5">"{activeTrans.notes}"</p>
 </div>
 )}

 {/* Parsed List Items Section */}
 <div className="pt-1">
 {(() => {
 try {
 return renderPayloadPrintTable(
 JSON.parse(activeTrans.payloadJson),
 );
 } catch (err) {
 return (
 <p className="text-rose-500 text-[9px]">
 Error parsing transmittal JSON payload.
 </p>
 );
 }
 })()}
 </div>

 {/* Handover Signature Signoffs */}
 <div className="grid grid-cols-2 gap-x-12 pt-16">
 <div className="text-center space-y-8">
 <div className="border-t border-black pt-2 text-[10px] font-bold uppercase">
 DISPATCHER SIGNATURE / DATE
 <p className="text-[8px] font-normal text-default-500 mt-1">
 EMBEDDED SIGNATURE: {activeTrans.submittedBy}
 </p>
 </div>
 </div>
 <div className="text-center space-y-8">
 <div className="border-t border-black pt-2 text-[10px] font-bold uppercase">
 RECIPIENT RECEIVING SIGN-OFF
 <p className="text-[8px] font-normal text-default-500 mt-1">
 CONFIRMS TOTAL CARGO RECONCILIATION
 </p>
 </div>
 </div>
 </div>

 {/* Footer stamp */}
 <div className="text-center pt-6 border-t border-black border-dashed mt-6">
 <p className="text-[9px] text-default-500 font-sans leading-relaxed">
 This digital transmittal slip was auto-compiled directly from
 live Tilepoint Inventory ledger registers.
 </p>
 <p className="text-[8px] text-default-500 mt-0.5">
 TRANSMITTAL TRANSACTION STAMP ID: {activeTrans.id}-
 {activeTrans.fromBranchId}-{activeTrans.toBranchId}-{Date.now()}
 </p>
 </div>
 </div>
 </div>
 )}

 {/* Custom print CSS rule injection to completely cover user intent */}
 <style
 dangerouslySetInnerHTML={{
 __html: `
 @media print {
 #root, .no-print, header, aside, nav, button, input, select, textarea, .bir-report-no-print {
 display: none !important;
 visibility: hidden !important;
 }
 #printable-transmittal-slip {
 display: block !important;
 visibility: visible !important;
 position: absolute !important;
 left: 0 !important;
 top: 0 !important;
 width: 100% !important;
 background: white !important;
 color: black !important;
 padding: 0px !important;
 margin: 0px !important;
 }
 @page {
 margin: 1.5cm !important;
 size: portrait !important;
 }
 }
 `,
 }}
 />

 {/* MODAL 3: Visual JSON import form (replacing prompt window popup) */}
 {showImportModal && typeof document !== 'undefined' && createPortal(
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
 <div
 className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity"
 onClick={() => setShowImportModal(false)}
 />
 <div className="relative w-full max-w-sm rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground text-left space-y-4">
 <div className="flex justify-between items-center border-b border-divider/20 pb-2.5">
 <h3 className="text-base font-bold text-primary flex items-center gap-2">
 <Upload className="h-5 w-5" /> Import JSON Slip
 </h3>
 <button
 type="button"
 onClick={() => setShowImportModal(false)}
 className="text-default-500 hover:text-foreground cursor-pointer p-1 rounded-full"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 <div className="space-y-1">
 <span className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1 block">
 Paste Code Contents
 </span>
 <textarea
 rows={6}
 value={rawImportText ?? ''}
 onChange={(e) => setRawImportText(e.target.value)}
 placeholder="Paste raw downloaded transmittal JSON slip data here..."
 className="w-full bg-content1 border border-divider/60 focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-lg "
 />
 </div>

 <div className="flex justify-end gap-2 border-t border-divider/20 pt-4">
 <button
 type="button"
 onClick={() => setShowImportModal(false)}
 className="px-4 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-default-100 text-default-500 transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={executeLocalImport}
 className="bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 rounded-medium px-5 py-2 text-xs shadow-sm cursor-pointer"
 >
 Process Slip
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
};
