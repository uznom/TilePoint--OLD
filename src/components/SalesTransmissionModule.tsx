/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useDb, encryptString, decryptString, getSecuritySecretKey, preprocessAndVerifyClipboardText, isStrictInboundReportSchema, unwrapInboundPayload } from '../context/DbContext';
import { saveFileToBackup } from '../lib/fileBackupHelper';
import { exportSalesTransmittalToXLSX } from '../lib/excelExportHelper';
import { UserRole, BranchSalesReport, Sale, SaleItem } from '../types/db';
import { ActionButton } from './ActionButton';
import { ConfirmationModal } from './ConfirmationModal';
import {
  Send,
  Download,
  Upload,
  CheckCircle2,
  FileText,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Building2,
  TrendingUp,
  Search,
  Calendar,
  Layers,
  Sparkles,
  Check,
  FileJson,
  Plus,
  RefreshCw,
  FolderOpen,
  Share2,
  Copy,
  Printer,
  Mail,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function validateAndMapInboundReport(rawParsed: any): { errors: string[]; mapped?: any } {
  const errors: string[] = [];

  if (!rawParsed || typeof rawParsed !== 'object') {
    return { errors: ['Root payload must be a valid JSON object.'] };
  }
  const parsed = unwrapInboundPayload(rawParsed);

 // Root fields validation
 if (typeof parsed.branchId !== 'string' || !parsed.branchId.trim()) {
 errors.push('branchId is missing or must be a non-empty string.');
 }
 if (typeof parsed.branchName !== 'string' || !parsed.branchName.trim()) {
 errors.push('branchName is missing or must be a non-empty string.');
 }
 if (typeof parsed.reportingDate !== 'string' || !parsed.reportingDate.trim()) {
 errors.push('reportingDate is missing or must be a non-empty string.');
 } else {
 const d = new Date(parsed.reportingDate);
 if (isNaN(d.getTime())) {
 errors.push('reportingDate must be a valid ISO or YYYY-MM-DD date format.');
 }
 }

 if (!Array.isArray(parsed.sales)) {
 errors.push('sales must be a valid array.');
 }

 // Validate sales and their nested properties
 const validatedSales: any[] = [];
 if (Array.isArray(parsed.sales)) {
 parsed.sales.forEach((s: any, idx: number) => {
 const salePrefix = `sales[${idx}]`;
 if (!s || typeof s !== 'object') {
 errors.push(`${salePrefix} must be a valid object.`);
 return;
 }

 const id = String(s.id || s.saleNumber || `S-${Date.now()}-${idx}`).trim();
 const saleNumber = String(s.saleNumber || s.id || `INV-${Date.now()}-${idx}`).trim();
 const shiftId = String(s.shiftId || 'SHIFT-1').trim();
 const branchId = String(s.branchId || parsed.branchId || 'B1').trim();
 const cashierId = String(s.cashierId || 'U1').trim();
 const cashierName = String(s.cashierName || 'Cashier').trim();

 const subtotal = isNaN(Number(s.subtotal)) ? Number(s.grandTotal || 0) : Number(s.subtotal);
 const vat = isNaN(Number(s.vat)) ? 0 : Number(s.vat);
 const discount = isNaN(Number(s.discount)) ? 0 : Number(s.discount);
 const grandTotal = isNaN(Number(s.grandTotal)) ? subtotal : Number(s.grandTotal);
 const amountTendered = isNaN(Number(s.amountTendered)) ? grandTotal : Number(s.amountTendered);
 const changeAmount = isNaN(Number(s.changeAmount)) ? 0 : Number(s.changeAmount);

 validatedSales.push({
 id,
 saleNumber,
 shiftId,
 branchId,
 cashierId,
 cashierName,
 customerName: String(s.customerName || 'Walk-in Customer').trim(),
 subtotal,
 vat,
 discount,
 grandTotal,
 paymentMethod: String(s.paymentMethod || 'Cash').trim(),
 amountTendered,
 changeAmount,
 notes: s.notes ? String(s.notes).trim() : undefined,
 isDeleted: !!s.isDeleted,
 createdAt: String(s.createdAt || new Date().toISOString()).trim(),
 });
 });
 }

 // Validate saleItems and their nested properties
 const validatedSaleItems: any[] = [];
 if (parsed.saleItems !== undefined && Array.isArray(parsed.saleItems)) {
 parsed.saleItems.forEach((item: any, idx: number) => {
 if (!item || typeof item !== 'object') return;

 const itemId = String(item.id || `SI-${Date.now()}-${idx}`).trim();
 const saleId = String(item.saleId || (validatedSales[0]?.id || 'SALE-1')).trim();
 const productId = String(item.productId || `P-${idx}`).trim();
 const productName = String(item.productName || item.name || 'Tile Product').trim();

 const quantity = Number(item.quantity ?? 1);
 const unitPrice = Number(item.unitPrice ?? 0);
 const total = Number(item.total ?? (quantity * unitPrice));

 validatedSaleItems.push({
 id: itemId,
 saleId,
 productId,
 productName,
 quantity: isNaN(quantity) ? 1 : quantity,
 unitPrice: isNaN(unitPrice) ? 0 : unitPrice,
 total: isNaN(total) ? 0 : total,
 isDeleted: item.isDeleted !== undefined ? !!item.isDeleted : undefined,
 });
 });
 }

 if (errors.length > 0) {
 return { errors };
 }

 const mapped = {
 id: parsed.id ? String(parsed.id).trim() : undefined,
 branchId: String(parsed.branchId).trim(),
 branchName: String(parsed.branchName).trim(),
 reportingDate: String(parsed.reportingDate).trim(),
 totalSalesCount: typeof parsed.totalSalesCount === 'number' ? parsed.totalSalesCount : validatedSales.length,
 totalSalesAmount: typeof parsed.totalSalesAmount === 'number' ? parsed.totalSalesAmount : validatedSales.reduce((acc, s) => acc + s.grandTotal, 0),
 totalVatAmount: typeof parsed.totalVatAmount === 'number' ? parsed.totalVatAmount : validatedSales.reduce((acc, s) => acc + s.vat, 0),
 totalDiscountAmount: typeof parsed.totalDiscountAmount === 'number' ? parsed.totalDiscountAmount : validatedSales.reduce((acc, s) => acc + s.discount, 0),
 sales: validatedSales,
 saleItems: validatedSaleItems,
 notes: parsed.notes ? String(parsed.notes).trim() : undefined,
 importVerificationId: parsed.importVerificationId ? String(parsed.importVerificationId).trim() : undefined,
 securitySignature: parsed.securitySignature ? String(parsed.securitySignature).trim() : undefined,
 approvedBy: parsed.approvedBy ? String(parsed.approvedBy).trim() : undefined,
 auditedBy: parsed.auditedBy ? String(parsed.auditedBy).trim() : undefined,
 auditedAt: parsed.auditedAt ? String(parsed.auditedAt).trim() : undefined,
 };

 return { errors, mapped };
}

interface SalesTransmissionModuleProps {
 darkMode: boolean;
 hideManualImport?: boolean;
 showOnlyImport?: boolean;
}

export const SalesTransmissionModule: React.FC<SalesTransmissionModuleProps> = ({ darkMode, hideManualImport = false, showOnlyImport = false }) => {
 const { currentUser, branches, users, sales, saleItems, branchSalesReports, rollbackSnapshots, performRollbackToSnapshot, transmitSalesReport, importManualSalesReport, auditSalesReport, addAuditLog, shifts, expenses, deliveries, purchaseOrders, products, auditLogs, members, productReturns, branchStock } = useDb();

 // Selected date for compiling current branch report
 const [reportingDate, setReportingDate] = useState(() => {
 // Default to the current system date or today
 return new Date().toISOString().split('T')[0];
 });

 // Local active branch when compiling (only admins/HQ can toggle this; branch personnel are locked)
 const [selectedBranchId, setSelectedBranchId] = useState(() => {
 return currentUser.branchAssignmentId || 'B1';
 });

 const [rollbackTargetSnap, setRollbackTargetSnap] = useState<{ id: string; num: number } | null>(null);

 // State for manual JSON copy/paste or file selection
 const [showJsonImport, setShowJsonImport] = useState(false);
 const [pastedJson, setPastedJson] = useState('');
 const [importError, setImportError] = useState<string | null>(null);
 const [importSuccess, setImportSuccess] = useState(false);

 // Real-time JSON validation script engine
 const liveValidation = useMemo(() => {
 if (!pastedJson.trim()) {
 return null;
 }

 const checks = {
 isParsed: false,
 hasRequiredFields: false,
 isSignatureValid: false,
 isTotalsCorrect: false,
 isDuplicate: false,
 isReplay: false,
 branchId: '',
 branchName: '',
 reportingDate: '',
 totalSalesCount: 0,
 totalSalesAmount: 0,
 recalculatedCount: 0,
 recalculatedAmount: 0,
 signatureMeta: null as any,
 errors: [] as string[],
 warnings: [] as string[]
 };

 const prep = preprocessAndVerifyClipboardText(pastedJson);
 if (!prep.success) {
 checks.errors.push(prep.error || "Pre-parsing verification failed.");
 return checks;
 }

 let parsed: any = null;
 // 1. JSON parse
 try {
 parsed = JSON.parse(prep.cleanedJson!);
 parsed = unwrapInboundPayload(parsed);
 checks.isParsed = true;
 } catch (e: any) {
 checks.errors.push(`JSON Syntax Error: ${e.message}`);
 return checks;
 }

 // 1.5 Strict structural schema check
 if (!isStrictInboundReportSchema(parsed)) {
 checks.errors.push("Strict Schema Error: Inbound payload elements do not conform to the strict corporate sales report schema layout.");
 }

 // 2. Schema check
 const validationResult = validateAndMapInboundReport(parsed);
 if (validationResult.errors.length === 0 && validationResult.mapped) {
 checks.hasRequiredFields = true;
 checks.branchId = validationResult.mapped.branchId;
 checks.branchName = validationResult.mapped.branchName;
 checks.reportingDate = validationResult.mapped.reportingDate;
 checks.totalSalesCount = validationResult.mapped.totalSalesCount || 0;
 checks.totalSalesAmount = validationResult.mapped.totalSalesAmount || 0;
 } else {
 checks.errors.push(...validationResult.errors);
 }

 // 3. Security signature verification
 if (parsed.securitySignature) {
 try {
 let decrypted = decryptString(parsed.securitySignature, getSecuritySecretKey());
 let sig = null;
 
 try {
 sig = JSON.parse(decrypted);
 } catch (e) {
 // Fallback to legacy key for backwards compatibility
 const legacyDecrypted = decryptString(parsed.securitySignature, "EmmanTileCenterSecretKey");
 sig = JSON.parse(legacyDecrypted);
 if (sig) {
 console.warn("[Security Alert] Ledger packet verified using legacy insecure key.");
 }
 }

 if (sig && sig.branchId === parsed.branchId) {
 checks.isSignatureValid = true;
 checks.signatureMeta = sig;

 // Cryptographic Replay Protection checks
 const signedNonce = sig.nonce;
 const signedImportId = sig.importVerificationId;
 const signedTransmissionId = sig.transmissionId;
 const transmissionId = parsed.transmissionId || signedTransmissionId;

 const usedNoncesRaw = localStorage.getItem("tp_used_nonces");
 const usedNonces: string[] = usedNoncesRaw ? JSON.parse(usedNoncesRaw) : [];

 if (transmissionId && usedNonces.includes(transmissionId)) {
 checks.isReplay = true;
 checks.errors.push("Error: Payload already indexed.");
 }
 if (signedNonce && usedNonces.includes(signedNonce)) {
 checks.isReplay = true;
 checks.errors.push("Replay Attack Detected: The signature's unique cryptographic nonce has already been processed in another transaction.");
 }
 if (signedImportId && usedNonces.includes(signedImportId)) {
 checks.isReplay = true;
 checks.errors.push("Replay Attack Detected: The transaction identifier has already been processed.");
 }
 if (signedImportId && parsed.importVerificationId && signedImportId !== parsed.importVerificationId) {
 checks.isReplay = true;
 checks.errors.push("Signature Forgery Blocked: Signed transaction identifier does not match the payload header.");
 }
 } else {
 checks.errors.push("Security Signature verification mismatch: Branch ID in signature does not match header.");
 }
 } catch (err) {
 checks.errors.push("Security Signature corrupted or forged: Could not decrypt package signature.");
 }
 } else {
 checks.warnings.push("Unsigned ledger packet: No securitySignature found. Manual import permitted as unsigned report.");
 }

 // 4. Totals recalculation check
 if (Array.isArray(parsed.sales)) {
 checks.recalculatedCount = parsed.sales.length;
 checks.recalculatedAmount = parsed.sales.reduce((acc: number, s: any) => acc + (s.grandTotal || 0), 0);
 
 const countMatch = checks.totalSalesCount === 0 || checks.totalSalesCount === checks.recalculatedCount;
 const amountMatch = checks.totalSalesAmount === 0 || Math.abs(checks.totalSalesAmount - checks.recalculatedAmount) < 0.1;

 if (countMatch && amountMatch) {
 checks.isTotalsCorrect = true;
 } else {
 checks.errors.push(`Header claim and actual data mismatch: Declared ${checks.totalSalesCount} txs (₱${checks.totalSalesAmount}) but contains ${checks.recalculatedCount} txs (₱${checks.recalculatedAmount.toFixed(2)})`);
 }
 } else if (checks.hasRequiredFields) {
 checks.errors.push("'sales' property must be a valid array of transactions.");
 }

 // 5. Duplication Check
 if (checks.hasRequiredFields) {
 const dup = branchSalesReports.find(r => r.branchId === parsed.branchId && r.reportingDate === parsed.reportingDate);
 if (dup) {
 checks.isDuplicate = true;
 checks.errors.push(`Report already exists: A sales report for ${parsed.branchName} on ${parsed.reportingDate} is already logged in HQ database.`);
 }
 }

 return checks;
 }, [pastedJson, branchSalesReports]);

 // Search filter for Admin report list
 const [adminSearchQuery, setAdminSearchQuery] = useState('');
 const [adminBranchFilter, setAdminBranchFilter] = useState(
   currentUser.role === UserRole.ADMIN ? 'ALL' : (currentUser.branchAssignmentId || 'B1')
 );
 const [adminStatusFilter, setAdminStatusFilter] = useState('ALL');

 // Selected report for viewing details
 const [selectedReport, setSelectedReport] = useState<BranchSalesReport | null>(null);
 const [auditNotes, setAuditNotes] = useState('');
 const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
 const [auditActiveSubTab, setAuditActiveSubTab] = useState<'sales' | 'pandl' | 'heatmap' | 'deliveries' | 'boa' | 'pos'>('sales');

 // Toast notification
 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

 // Sharing states
 const [showShareModal, setShowShareModal] = useState(false);
 const [sharePayloadText, setSharePayloadText] = useState('');
 const [shareFileName, setShareFileName] = useState('');
 const [isDragging, setIsDragging] = useState(false);

 // Button interactive states
 const [isTransmittingOnline, setIsTransmittingOnline] = useState(false);
 const [isDownloadingManual, setIsDownloadingManual] = useState(false);
 const [isImportingManual, setIsImportingManual] = useState(false);

 const triggerToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
 setToast({ message: msg, type });
 setTimeout(() => setToast(null), 4000);
 };

 // Robust clipboard copy helper that works in sandboxed iframes / HTTP environments
 const handleCopyText = (text: string, successMessage: string) => {
 let success = false;
 try {
 if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
 navigator.clipboard.writeText(text);
 success = true;
 }
 } catch (err) {
 console.warn('Modern clipboard API failed, using fallback:', err);
 }

 if (!success) {
 try {
 const textArea = document.createElement('textarea');
 textArea.value = text;
 textArea.style.position = 'fixed';
 textArea.style.top = '0';
 textArea.style.left = '0';
 textArea.style.opacity = '0';
 textArea.style.pointerEvents = 'none';
 document.body.appendChild(textArea);
 textArea.focus();
 textArea.select();
 success = document.execCommand('copy');
 document.body.removeChild(textArea);
 } catch (err) {
 console.error('Fallback clipboard copy failed:', err);
 }
 }

 if (success) {
 triggerToast(successMessage, 'success');
 } else {
 triggerToast('Unable to copy automatically. Please copy the signature text at the bottom.', 'error');
 }
 };

 // Manual fallback download helper
 const handleManualDownload = () => {
 saveFileToBackup(sharePayloadText, shareFileName, 'Sales_Reports').then((res) => {
 triggerToast(`Saved offline JSON sales packet successfully to: ${res.path || shareFileName}!`, 'success');
 }).catch((err) => {
 console.error('Manual download failed:', err);
 triggerToast('Failed to download file. Try copying the raw JSON below instead.', 'error');
 });
 };

 // Printing & Exporting states
 const [showPrintModal, setShowPrintModal] = useState(false);
 const [printData, setPrintData] = useState<any | null>(null);

 // Elevated Authorization Check - Admins & Managers can trigger exports
 const isAuthorizedToExport = useMemo(() => {
 return currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER;
 }, [currentUser]);

 // Utility to map draft compilation data to standard report structure for exports
 const getCommonReportData = (mode: 'compiled' | 'selected') => {
 if (mode === 'selected' && selectedReport) {
 return selectedReport;
 }
 
 return {
 id: `REP-DRAFT-${currentBranchMeta.id}-${reportingDate}`,
 branchId: currentBranchMeta.id,
 branchName: currentBranchMeta.name,
 reportingDate,
 totalSalesCount: compiledLocalSalesData.count,
 totalSalesAmount: compiledLocalSalesData.grandTotal,
 totalVatAmount: compiledLocalSalesData.vat,
 totalDiscountAmount: compiledLocalSalesData.discount,
 transmissionType: 'Offline (Draft)',
 status: 'Draft (Unsubmitted)',
 sales: compiledLocalSalesData.sales,
 saleItems: compiledLocalSalesData.saleItems,
 notes: 'Generated offline draft from cashier local journal sessions.'
 };
 };

 const handleExportCSV = (mode: 'compiled' | 'selected', isExcel: boolean = false) => {
 if (!isAuthorizedToExport) {
 triggerToast('Security Error: Only Admins or Branch Managers are authorized to export raw sales reports.', 'error');
 return;
 }

 const report = getCommonReportData(mode);
 if (!report || report.totalSalesCount === 0) {
 triggerToast('Compilation Error: Cannot export an empty report with 0 sales.', 'error');
 return;
 }

 const establishmentName = localStorage.getItem('tilepoint_company_name_v1') || 'Emman Tile Center';
 let csv = '';
 
 // Header
 csv += `"${establishmentName.replace(/"/g, '""')}"\n`;
 csv += `"OFFICIAL DAILY SALES TRANSMISSION REPORT (${isExcel ? 'EXCEL CSV MATRIX' : 'STANDARD CSV'})"\n\n`;
 
 // Metadata
 csv += `"Report Matrix ID:","${report.id}"\n`;
 csv += `"Branch Origin:","${report.branchName} (${report.branchId})"\n`;
 csv += `"Reporting Accounting Date:","${report.reportingDate}"\n`;
 csv += `"Link Transmission Channel:","${report.transmissionType || 'N/A'}"\n`;
 csv += `"Authority Audit Status:","${report.status || 'Pending'}"\n`;
 csv += `"Report Export Timestamp:","${new Date().toISOString()}"\n`;
 csv += `"Operator Sign-Off:","${currentUser.fullName} (${currentUser.role})"\n\n`;
 
 // Summary Aggregates
 csv += `"AGGREGATE REVENUE STATISTICS"\n`;
 csv += `"Receipts Issued Count","${report.totalSalesCount}"\n`;
 csv += `"Total Applied Discounts","PHP ${report.totalDiscountAmount.toLocaleString()}"\n`;
 csv += `"Calculated 12% VAT Covered","PHP ${report.totalVatAmount.toLocaleString()}"\n`;
 csv += `"GRAND SETTLED TOTAL REVENUE","PHP ${report.totalSalesAmount.toLocaleString()}"\n\n`;
 
 // Enclosed Receipts List
 csv += `"ENCLOSED CUSTOMER TRANSACTIONS INVOICE LIST"\n`;
 csv += `"Invoice Number","Customer Name","Cashier Name","Payment Mode","Subtotal","Applied Discount","Calculated VAT","Grand Total","Created Timestamp"\n`;
 
 if (report.sales && report.sales.length > 0) {
 report.sales.forEach((s: any) => {
 csv += `"${s.saleNumber}","${(s.customerName || 'Walk-in Buyer').replace(/"/g, '""')}","${s.cashierName.replace(/"/g, '""')}","${s.paymentMethod}","${s.subtotal}","${s.discount}","${s.vat}","${s.grandTotal}","${(s.createdAt && !isNaN(new Date(s.createdAt).getTime()) ? new Date(s.createdAt).toISOString() : new Date().toISOString())}"\n`;
 });
 } else {
 csv += `"No transaction invoices attached to report vector."\n`;
 }

 const formatSuffix = isExcel ? 'Excel_Format' : 'CSV_Format';
 const filename = `TilePoint_${formatSuffix}_Report_${report.branchName.replace(/\s+/g, '_')}_${report.reportingDate}.csv`;
 // Prepend UTF-8 BOM to CSV content so Excel handles characters correctly
 const csvWithBOM = "\uFEFF" + csv;
 saveFileToBackup(csvWithBOM, filename, 'Sales_Reports', 'text/csv;charset=utf-8;').then((res) => {
 triggerToast(`Successfully exported ${isExcel ? 'Excel' : 'CSV'} sales report to: ${res.path || filename}.`, 'success');
 });
 };

 const handleOpenPrintPreview = (mode: 'compiled' | 'selected') => {
 if (!isAuthorizedToExport) {
 triggerToast('Security Error: Only Admins or Branch Managers are authorized to view print templates.', 'error');
 return;
 }

 const report = getCommonReportData(mode);
 if (!report || report.totalSalesCount === 0) {
 triggerToast('Compilation Error: Cannot print an empty report with 0 sales.', 'error');
 return;
 }

 setPrintData(report);
 setShowPrintModal(true);
 };

 // Get current active branch metadata
 const currentBranchMeta = useMemo(() => {
 const id = currentUser?.role === UserRole.ADMIN ? selectedBranchId : (currentUser?.branchAssignmentId || 'B1');
 const found = (branches || []).find(b => b.id === id) || (branches || [])[0];
 return found || { id: id || 'B1', name: 'Main Branch', manager: '', address: '', phone: '' };
 }, [branches, currentUser, selectedBranchId]);

 // Aggregate stats of untransmitted local sales for the selected date on active branch
 const compiledLocalSalesData = useMemo(() => {
  const targetBranchId = currentBranchMeta?.id || 'B1';
  const localSales = sales.filter(s => {
  if (s.isDeleted) return false;
  if (s.branchId !== targetBranchId) return false;
  const saleDate = s.createdAt.split("T")[0];
  return saleDate === reportingDate;
  });

  const localSaleItems = saleItems.filter(item => {
  const parentSale = sales.find(s => s.id === item.saleId);
  return parentSale && parentSale.branchId === targetBranchId && !parentSale.isDeleted && parentSale.createdAt.split("T")[0] === reportingDate;
  });

  const sumGrandTotal = localSales.reduce((acc, s) => acc + s.grandTotal, 0);
  const sumVat = localSales.reduce((acc, s) => acc + s.vat, 0);
  const sumDiscount = localSales.reduce((acc, s) => acc + s.discount, 0);

  // 1. FILTER EXPENSES
  const localExpenses = expenses.filter(exp => {
   if (exp.isDeleted) return false;
   if (exp.branchId !== targetBranchId) return false;
   const expDate = exp.dateTime ? exp.dateTime.split("T")[0] : "";
   return expDate === reportingDate;
  });
  const totalExpensesAmount = localExpenses.reduce((acc, exp) => acc + (exp.amount || 0), 0);

  // 2. FILTER CARGO DELIVERIES
  const localDeliveries = deliveries.filter(del => {
   if (del.branchId !== targetBranchId) return false;
   const delDate = del.deliveryDate || (del.createdAt ? del.createdAt.split("T")[0] : "");
   return delDate === reportingDate;
  });

  // 3. FILTER PURCHASE ORDERS (PO)
  const localPOs = purchaseOrders.filter(po => {
   if (po.branchId !== targetBranchId) return false;
   const poDate = po.createdAt ? po.createdAt.split("T")[0] : "";
   return poDate === reportingDate;
  });

  // 4. CALCULATE COGS FOR P&L
  let totalCogs = 0;
  localSaleItems.forEach(item => {
   const prod = products.find(p => p.id === item.productId);
   const cost = prod ? prod.costPrice : 0;
   totalCogs += item.quantity * cost;
  });

  const pandlData = {
   revenue: sumGrandTotal,
   cogs: totalCogs,
   expenses: totalExpensesAmount,
   netProfit: sumGrandTotal - totalCogs - totalExpensesAmount
  };

  // 5. CALCULATE HOURLY HEATMAP (24 hours)
  const heatmapData = Array.from({ length: 24 }, (_, hour) => {
   const hourlySales = localSales.filter(s => {
    const saleHour = (s.createdAt && !isNaN(new Date(s.createdAt).getTime()) ? new Date(s.createdAt).getHours() : 0);
    return saleHour === hour;
   });
   const hourlyCount = hourlySales.length;
   const hourlyAmount = hourlySales.reduce((acc, s) => acc + s.grandTotal, 0);
   return { hour, count: hourlyCount, amount: hourlyAmount };
  });

  // 6. FILTER BOA (Audit Logs as Book of Accounts)
  const localBOALogs = auditLogs.filter(log => {
   const logDate = (log.createdAt || log.timestamp || "").split("T")[0];
   return logDate === reportingDate;
  }).map(log => ({
   id: log.id,
   type: log.actionCode || "SYSTEM_LOG",
   module: log.module || "System",
   description: log.description || "",
   userName: log.userName || log.username || "System",
   timestamp: log.createdAt || log.timestamp || new Date().toISOString()
  }));

  return {
  sales: localSales,
  saleItems: localSaleItems,
  count: localSales.length,
  grandTotal: sumGrandTotal,
  vat: sumVat,
  discount: sumDiscount,
  expenses: localExpenses,
  deliveries: localDeliveries,
  purchaseOrders: localPOs,
  pandl: pandlData,
  heatmap: heatmapData,
  boa: localBOALogs
  };
  }, [sales, saleItems, currentBranchMeta, reportingDate, expenses, deliveries, purchaseOrders, products, auditLogs]);

 // See if there's already a transmitted report for selected branch and date
 const existingReport = useMemo(() => {
 return branchSalesReports.find(
 r => r.branchId === currentBranchMeta.id && r.reportingDate === reportingDate
 );
 }, [branchSalesReports, currentBranchMeta, reportingDate]);

 const handleTransmitOnline = () => {
 if (compiledLocalSalesData.count === 0) {
 triggerToast('No sales records found on this branch for selected date.', 'error');
 return;
 }

 if (existingReport) {
 triggerToast('A sales report for this branch and date has already been transmitted.', 'error');
 return;
 }

 setIsTransmittingOnline(true);

 setTimeout(() => {
 const branchEmployees = (users || []).filter(u => u.branchAssignmentId === currentBranchMeta.id);
 transmitSalesReport({
 branchId: currentBranchMeta.id,
 branchName: currentBranchMeta.name,
 reportingDate,
 totalSalesCount: compiledLocalSalesData.count,
 totalSalesAmount: compiledLocalSalesData.grandTotal,
 totalVatAmount: compiledLocalSalesData.vat,
 totalDiscountAmount: compiledLocalSalesData.discount,
 transmissionType: 'Online',
 sales: compiledLocalSalesData.sales,
 saleItems: compiledLocalSalesData.saleItems,
 users: branchEmployees,
 notes: `Online real-time sync completed by employee ${currentUser.fullName}.`
 });

 triggerToast(`Sales report for ${currentBranchMeta.name} uploaded and transmitted.`, 'success');
 setIsTransmittingOnline(false);
 }, 1200);
 };

 const handleDownloadOfflineJSON = () => {
 if (compiledLocalSalesData.count === 0) {
 triggerToast('No sales items to include in export file.', 'error');
 return;
 }

 setIsDownloadingManual(true);

 setTimeout(() => {
 const establishmentName = localStorage.getItem('tilepoint_company_name_v1') || 'Emman Tile Center';
 const importVerificationId = `IMPID-EXP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
 
 // Auto-incrementing sequence index tracked per branch
 const seqKey = `tp_export_sequence_${currentBranchMeta.id}`;
 const currentSeq = parseInt(localStorage.getItem(seqKey) || '0', 10) + 1;
 localStorage.setItem(seqKey, currentSeq.toString());

 // Unique cryptographically signed nonce combining sequence, timestamp, and randomness
 const nonce = `NONCE-${currentBranchMeta.id}-${currentSeq}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

 // Deterministically calculate shift number(s) included in this transmission
 const saleShiftIds = Array.from(new Set(compiledLocalSalesData.sales.map(s => s.shiftId).filter(Boolean)));
 const shiftNumbers = saleShiftIds.map(sid => {
 const allBranchShifts = (shifts || [])
 .filter(sh => sh.branchId === currentBranchMeta.id)
 .sort((a, b) => a.openedAt.localeCompare(b.openedAt));
 const idx = allBranchShifts.findIndex(sh => sh.id === sid);
 return idx !== -1 ? (idx + 1).toString() : '1';
 });
 const primaryShiftNo = shiftNumbers.length > 0 ? shiftNumbers.sort().join('_') : '1';
 const branchCode = currentBranchMeta.id;
 const shiftDate = reportingDate;
 const transmissionId = `TRANS-${branchCode}-${shiftDate}-S${primaryShiftNo}`.toUpperCase();

 const sigPayload = {
 importVerificationId,
 branchId: currentBranchMeta.id,
 exportedByRole: currentUser.role,
 exportedBy: currentUser.fullName,
 establishmentName,
 timestamp: new Date().toISOString(),
 nonce,
 sequenceIndex: currentSeq,
 transmissionId
 };
 const signature = encryptString(JSON.stringify(sigPayload), getSecuritySecretKey());

 const payload = {
 id: `REP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
 importVerificationId,
 branchId: currentBranchMeta.id,
 branchName: currentBranchMeta.name,
 reportingDate,
 totalSalesCount: compiledLocalSalesData.count,
 totalSalesAmount: compiledLocalSalesData.grandTotal,
 totalVatAmount: compiledLocalSalesData.vat,
 totalDiscountAmount: compiledLocalSalesData.discount,
 transmissionType: 'Manual',
 exportedByRole: currentUser.role,
 securitySignature: signature,
 transmissionId,
 sales: compiledLocalSalesData.sales,
 saleItems: compiledLocalSalesData.saleItems,
 users: (users || []).filter(u => u.branchAssignmentId === currentBranchMeta.id),
 notes: `Offline encrypted sales package generated securely with validation signatures.`
 };

 const payloadString = JSON.stringify(payload, null, 2);
 const fileName = `TilePoint_Sales_Report_${currentBranchMeta.id}_${reportingDate}.json`;
 
 saveFileToBackup(payloadString, fileName, 'Sales_Reports').then((res) => {
 addAuditLog(
 'SALES_OFFLINE_EXPORT',
 `Downloaded offline JSON sales packet for ${currentBranchMeta.name} on ${reportingDate}. Transactions: ${compiledLocalSalesData.count}`,
 'BranchSalesReport',
 payload.id
 );

 // Save to state to show custom Share dialog
 setSharePayloadText(payloadString);
 setShareFileName(fileName);
 setShowShareModal(true);

 triggerToast(`Secure JSON sales report package saved to: ${res.path || fileName}`, 'success');
 setIsDownloadingManual(false);
 });
 }, 1000);
 };

 // Upload or handle file inclusion
 const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 const reader = new FileReader();
 reader.onload = (event) => {
 const text = event.target?.result as string;
 setPastedJson(text);
 triggerToast('File uploaded successfully. Click Import to finalize.', 'info');
 };
 reader.onerror = () => triggerToast('Failed to read files.', 'error');
 reader.readAsText(file);
 };

 const handleManualImportSubmit = () => {
 setImportError(null);
 setImportSuccess(false);

 const prep = preprocessAndVerifyClipboardText(pastedJson);
 if (!prep.success) {
 setImportError(prep.error || "Pre-parsing verification failed.");
 return;
 }

 try {
 let parsed = JSON.parse(prep.cleanedJson!);
 parsed = unwrapInboundPayload(parsed);
 if (!isStrictInboundReportSchema(parsed)) {
 setImportError("Strict Schema Error: Inbound payload elements do not conform to the strict corporate sales report schema layout.");
 return;
 }
 const validation = validateAndMapInboundReport(parsed);
 if (validation.errors.length > 0) {
 setImportError(`Data structure verification failed:\n${validation.errors.slice(0, 5).join('\n')}${validation.errors.length > 5 ? `\n...and ${validation.errors.length - 5} more errors` : ''}`);
 return;
 }
 } catch (e: any) {
 setImportError(`Invalid JSON Syntax: ${e.message}`);
 return;
 }

 if (liveValidation && liveValidation.errors.length > 0) {
 // Do not block completely if it's just duplicate, but block for structure or signature errors
 const criticalErrors = liveValidation.errors.filter(e => !e.includes('already exists') && !e.includes('already been registered'));
 if (criticalErrors.length > 0) {
 setImportError(`Critical live validation failed: ${criticalErrors[0]}`);
 return;
 }
 }

 setIsImportingManual(true);

 setTimeout(() => {
 const result = importManualSalesReport(pastedJson);
 if (result.success) {
 setImportSuccess(true);
 setPastedJson('');
 triggerToast('Manual JSON sales report imported. Assigned for audit processing.', 'success');
 setTimeout(() => {
 setShowJsonImport(false);
 setImportSuccess(false);
 }, 1500);
 } else {
 setImportError(result.error || 'Import validation failure.');
 }
 setIsImportingManual(false);
 }, 1200);
 };

 const handleSetAuditStatus = (status: 'Verified' | 'Pending Audit') => {
 if (!selectedReport) return;
 auditSalesReport(selectedReport.id, status, auditNotes);
 triggerToast(`Audit verified status set to ${status}.`, 'success');
 
 // Refresh selected report viewing
 setSelectedReport(prev => prev ? {
 ...prev,
 status,
 notes: auditNotes || prev.notes,
 auditedBy: currentUser.fullName,
 auditedAt: new Date().toISOString()
 } : null);
 
 setAuditNotes('');
 };

 // Filter transmitted reports listed in Admin panel
 const filteredReports = useMemo(() => {
 return branchSalesReports.filter(report => {
 // Branch assignment or filter
 if (currentUser.role !== UserRole.ADMIN) {
 if (report.branchId !== (currentUser.branchAssignmentId || 'B1')) return false;
 } else {
 if (adminBranchFilter !== 'ALL' && report.branchId !== adminBranchFilter) return false;
 }
 // Status filter
 if (adminStatusFilter !== 'ALL' && report.status !== adminStatusFilter) return false;
 // Search text query matching date, ID or branch name
 if (adminSearchQuery.trim()) {
 const query = adminSearchQuery.toLowerCase();
 return (
 report.branchName.toLowerCase().includes(query) ||
 report.reportingDate.includes(query) ||
 report.id.toLowerCase().includes(query)
 );
 }
 return true;
 });
 }, [branchSalesReports, adminBranchFilter, adminStatusFilter, adminSearchQuery]);

 // Immutable registry list of previously processed payload IDs from localStorage
 const usedNoncesList = useMemo(() => {
 try {
 const raw = localStorage.getItem("tp_used_nonces");
 return raw ? (JSON.parse(raw) as string[]) : [];
 } catch (_) {
 return [];
 }
 }, [branchSalesReports, pastedJson, importSuccess]);

 if (currentUser.role !== UserRole.ADMIN) {
    return (
      <div className="w-full text-m3-on-surface space-y-6 animate-fade-in font-sans pb-12">
        <div className="bg-m3-surface-low border border-m3-outline-variant/30 rounded-[28px] p-8 text-center max-w-xl mx-auto space-y-4 shadow-md mt-12">
          <ShieldAlert className="h-12 w-12 text-amber-500 mx-auto animate-pulse" />
          <h2 className="text-base font-black uppercase tracking-wider text-white">HQ Sales Audit Restricted</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Access to the Headquarters Sales Transmission Registry is restricted to Central HQ Administrators. Branch Managers can view and execute daily transmissions directly from the <strong className="text-amber-500">Daily Sales Reconciliation</strong> workspace.
          </p>
        </div>
      </div>
    );
  }

  if (showOnlyImport) {
    return (
      <div className="w-full text-m3-on-surface space-y-6 animate-fade-in font-sans pb-12 text-left">
        {/* Dynamic Toast feedback */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4.5 py-3 rounded-2xl shadow-xl border text-xs font-bold ${
                toast.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : toast.type === 'error'
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
            >
              <Check className="h-4 w-4" />
              <span>{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header Panel */}
        <div className="bg-m3-surface-low border border-m3-outline-variant/30 rounded-[28px] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 card-glow shadow-md">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-m3-primary/10 rounded-xl text-m3-primary border border-m3-primary/20">
                <Upload className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-base font-black uppercase tracking-wider text-m3-primary font-sans leading-none">
                  HQ Manual JSON Import Center
                </h2>
                <p className="text-[10px] text-zinc-400 font-bold font-mono uppercase tracking-widest mt-1">
                  Offline Ledger Processing & Integrity Audits
                </p>
              </div>
            </div>
            <p className="text-xs text-m3-on-surface-variant max-w-xl leading-relaxed pl-1 pt-1">
              Upload branch-compiled signed JSON files or copy-paste transmission envelopes manually. Reconcile transaction lines, verify digital signatures, and write authenticated sales packets to the Central HQ database securely.
            </p>
          </div>
        </div>

        {/* Form and Database Buffers side-by-side */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Main Drag-and-Drop and Input Area */}
          <div className="xl:col-span-7 bg-m3-surface-low border border-m3-outline-variant/30 rounded-[28px] p-6 space-y-5">
            <h3 className="text-xs font-black uppercase tracking-widest text-m3-primary font-mono flex items-center gap-1.5 border-b border-m3-outline-variant/20 pb-3">
              <FileJson className="h-4.5 w-4.5 text-amber-500" />
              <span>Import Ledger Package</span>
            </h3>

            <div className="space-y-4">
              <p className="text-xs text-m3-on-surface-variant leading-relaxed">
                Import a manually saved branch sales report JSON file. Drag-and-drop the exported file below, select it directly from storage, or paste the raw structured JSON data inside the text area.
              </p>

              {/* Drag and Drop Zone and File Picker combined */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-m3-on-surface-variant font-mono">
                  Select or Drag & Drop JSON Report file:
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const text = event.target?.result as string;
                        setPastedJson(text);
                        triggerToast('File dropped and loaded successfully.', 'info');
                      };
                      reader.onerror = () => triggerToast('Failed to read dropped file.', 'error');
                      reader.readAsText(file);
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                    isDragging
                      ? 'border-m3-primary bg-m3-primary/10'
                      : 'border-m3-outline-variant/40 hover:border-m3-primary/50 bg-m3-surface-lowest'
                  }`}
                  onClick={() => document.getElementById('report-file-picker-dedicated')?.click()}
                >
                  <Upload className={`h-8 w-8 transition-transform ${isDragging ? 'scale-110 text-m3-primary' : 'text-zinc-500'}`} />
                  <div className="text-xs font-bold text-m3-on-surface">
                    {isDragging ? 'Drop the file here' : 'Drag & Drop .json file here, or click to browse'}
                  </div>
                  <span className="text-[10px] text-m3-on-surface-variant font-mono">
                    Accepts only signed offline report JSONs
                  </span>
                  <input
                    type="file"
                    id="report-file-picker-dedicated"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* PASTE DIALOG */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-black uppercase tracking-widest text-m3-on-surface-variant pl-0.5 font-mono">JSON Payload Text / File Contents:</label>
                  {pastedJson && (
                    <button
                      onClick={() => setPastedJson('')}
                      className="text-[10px] text-rose-500 hover:underline font-bold cursor-pointer"
                      type="button"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <textarea
                  value={pastedJson}
                  onChange={(e) => setPastedJson(e.target.value)}
                  placeholder='Paste raw downloaded corporate JSON file contents here, e.g. { "branchId": "B2", "branchName": "Branch Name", ... }'
                  rows={6}
                  className="w-full bg-m3-surface-lowest border border-m3-outline-variant/40 rounded-xl p-3 text-[10.5px] font-mono text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-m3-primary whitespace-pre scrollbar-thin"
                />
              </div>

              {/* LIVE VERIFICATION SUMMARY */}
              {liveValidation && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-m3-on-surface-variant font-medium px-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${liveValidation.isParsed && liveValidation.hasRequiredFields && !liveValidation.isDuplicate ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <span>
                        {liveValidation.isParsed && liveValidation.hasRequiredFields && !liveValidation.isDuplicate ? (
                          <>
                            <span className="font-bold text-m3-on-surface">{liveValidation.branchName || 'Valid Report'}</span>
                            <span className="opacity-70"> ({liveValidation.reportingDate}) • Total: ₱{liveValidation.recalculatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            {liveValidation.isSignatureValid ? (
                              <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[9.5px]">
                                ✓ Cryptographically Signed
                              </span>
                            ) : (
                              <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-[9.5px]">
                                ⚠ Unsigned Ledger Packet
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-rose-500 font-bold">{!liveValidation.isParsed ? "Invalid JSON syntax (check formatting)" : (liveValidation.errors[0] || "Malformed JSON report schema")}</span>
                        )}
                      </span>
                    </div>
                    {liveValidation.isDuplicate && (
                      <span className="text-[10px] text-rose-500 font-mono font-bold">Already Transmitted</span>
                    )}
                  </div>
                </div>
              )}

              {/* ERROR PANEL */}
              {importError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-[10px] font-bold leading-normal flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span>Schema Verification Error:</span>
                    <p className="font-medium text-m3-on-surface mt-1 whitespace-pre-line">{importError}</p>
                  </div>
                </div>
              )}

              {/* SUCCESS PANEL */}
              {importSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10.5px] font-bold flex items-center gap-2.5">
                  <CheckCircle2 className="h-4.5 w-4.5 animate-bounce text-emerald-400" />
                  <span>Report verified, parsed, and logged inside the audit lists successfully.</span>
                </div>
              )}

              <div className="pt-2 border-t border-m3-outline-variant/15 flex justify-end gap-3.5">
                <button
                  disabled={!pastedJson.trim()}
                  onClick={() => {
                    const res = importManualSalesReport(pastedJson);
                    if (res.success) {
                      setPastedJson('');
                      setImportError(null);
                      setImportSuccess(true);
                      triggerToast('Manual JSON sales report imported. Assigned for audit processing.', 'success');
                      setTimeout(() => setImportSuccess(false), 5000);
                    } else {
                      setImportError(res.error || 'Import failed');
                      setImportSuccess(false);
                      triggerToast('Import failed. Check validation errors.', 'error');
                    }
                  }}
                  className="px-6 py-2.5 bg-m3-primary hover:bg-opacity-90 disabled:opacity-40 text-m3-on-primary rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition shadow-md cursor-pointer disabled:cursor-not-allowed"
                >
                  <Check className="h-4 w-4" />
                  <span>Import & Reconcile Ledger</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Side: Active Rolling State Buffers for Safety rollback */}
          <div className="xl:col-span-5 space-y-6">
            <div className="bg-m3-surface-low border border-m3-outline-variant/30 rounded-[28px] p-6 space-y-5">
              <div className="space-y-0.5 border-b border-m3-outline-variant/20 pb-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-m3-primary font-mono flex items-center gap-1.5">
                  <RefreshCw className="h-4 w-4 text-emerald-500" />
                  <span>Security Rollback Logs</span>
                </h3>
                <p className="text-[10px] text-zinc-400">
                  Active rolling buffers of the 5 most recent ledger states. Restore database instantly to revert accidental manual imports.
                </p>
              </div>

              <div className="space-y-3">
                {rollbackSnapshots.length === 0 ? (
                  <div className="p-8 text-center text-[11px] text-zinc-500 italic border border-dashed border-m3-outline-variant/15 rounded-2xl bg-m3-surface-lowest">
                    No active rollback points available. Submit or modify data to spawn local recovery snapshots.
                  </div>
                ) : (
                  rollbackSnapshots.map((snap, i) => (
                    <div
                      key={snap.id}
                      className="p-3.5 rounded-xl border border-m3-outline-variant/15 bg-m3-surface-lowest flex items-center justify-between gap-3 text-left hover:border-m3-primary/30 transition"
                    >
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-m3-on-surface flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Snapshot #{rollbackSnapshots.length - i}</span>
                          <span className="text-[9px] font-mono text-zinc-400 font-normal">({snap.id.substring(0, 8)})</span>
                        </div>
                        <div className="text-[10px] text-m3-on-surface-variant font-mono">
                          {snap.timestamp && !isNaN(new Date(snap.timestamp).getTime()) ? new Date(snap.timestamp).toLocaleTimeString() : "N/A"} • {snap.branchName || "Manual Save"}
                        </div>
                        <div className="text-[9px] text-zinc-500 leading-tight">
                          Includes {snap.branchSalesReports?.length || 0} reports, {snap.products?.length || 0} products, {snap.movements?.length || 0} movements.
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setRollbackTargetSnap({ id: snap.id, num: rollbackSnapshots.length - i });
                        }}
                        className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-[10px] font-bold uppercase tracking-wider transition border border-rose-500/20 active:scale-95 cursor-pointer"
                      >
                        Restore
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full text-m3-on-surface space-y-6 animate-fade-in font-sans pb-12">
 {/* Dynamic Toast feedback */}
 <AnimatePresence>
 {toast && (
 <motion.div
 initial={{ opacity: 0, y: -20 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -20 }}
 className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4.5 py-3 rounded-2xl shadow-xl border text-xs font-bold ${
 toast.type === 'success'
 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
 : toast.type === 'error'
 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
 : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
 }`}
 >
 <Check className="h-4 w-4" />
 <span>{toast.message}</span>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Header Panel */}
 <div className="bg-m3-surface-low border border-m3-outline-variant/30 rounded-[28px] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 card-glow shadow-md">
 <div className="space-y-1 text-left">
 <div className="flex items-center gap-2">
 <span className="p-2 bg-m3-primary/10 rounded-xl text-m3-primary border border-m3-primary/20">
 <Send className="h-5 w-5" />
 </span>
 <div>
 <h2 className="text-base font-black uppercase tracking-wider text-m3-primary font-sans leading-none">
 Sales Reports Transmission Portal
 </h2>
 <p className="text-[10px] text-zinc-400 font-bold font-mono uppercase tracking-widest mt-1">
 Inter-Branch Accounting & Validation Vault
 </p>
 </div>
 </div>
 <p className="text-xs text-m3-on-surface-variant max-w-xl leading-relaxed pl-1 pt-1">
 Centralized HQ ledger for auditing, cryptographically verifying, and tracking daily sales transmissions across all branch locations. Store personnel perform daily cash drawer balancing directly in the Daily Reconciliation workspace.
 </p>
 </div>

 {/* Action center keys */}
 {currentUser.role === UserRole.ADMIN && !hideManualImport && (
 <div className="flex items-center gap-2 sm:self-center shrink-0">
 <button
 onClick={() => {
 setPastedJson('');
 setImportError(null);
 setImportSuccess(false);
 setShowJsonImport(true);
 }}
 className="px-4 py-2 border border-m3-primary/30 bg-m3-primary/10 hover:bg-m3-primary/15 text-m3-primary rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
 >
 <Upload className="h-4 w-4" />
 <span>Import manual sales JSON</span>
 </button>
 </div>
 )}
 </div>

 {/* HQ Central Network Sync & Audited Transmission Overview */}
      <div className="space-y-6">
        {/* KPI Metrics Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-m3-surface-low border border-m3-outline-variant/30 rounded-2xl p-4.5 space-y-2 shadow-xs text-left">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[10px] font-black uppercase tracking-wider font-mono">Reports Filed</span>
              <FileText className="h-4 w-4 text-m3-primary" />
            </div>
            <div className="text-2xl font-black text-m3-on-surface font-mono">
              {branchSalesReports.length} <span className="text-xs font-normal text-zinc-400">total</span>
            </div>
            
          </div>

          <div className="bg-m3-surface-low border border-m3-outline-variant/30 rounded-2xl p-4.5 space-y-2 shadow-xs text-left">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[10px] font-black uppercase tracking-wider font-mono">Cryptographic Vault</span>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {branchSalesReports.filter(r => !!r.securitySignature).length} <span className="text-xs font-normal text-zinc-400">signed</span>
            </div>
            
          </div>

          <div className="bg-m3-surface-low border border-m3-outline-variant/30 rounded-2xl p-4.5 space-y-2 shadow-xs text-left">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[10px] font-black uppercase tracking-wider font-mono">Sync Network</span>
              <Building2 className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-m3-on-surface font-mono">
              {branches.length} <span className="text-xs font-normal text-zinc-400">stores</span>
            </div>
            
          </div>

          <div className="bg-m3-surface-low border border-m3-outline-variant/30 rounded-2xl p-4.5 space-y-2 shadow-xs text-left">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[10px] font-black uppercase tracking-wider font-mono">Net Transmitted Revenue</span>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-m3-primary font-mono truncate">
              ₱{branchSalesReports.reduce((acc, r) => acc + (r.totalSalesAmount || 0), 0).toLocaleString()}
            </div>
            
          </div>
        </div>

        {/* Live Branch Transmission Status Matrix */}
        <div className="bg-m3-surface-low border border-m3-outline-variant/30 rounded-[28px] p-6 space-y-4 text-left shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-m3-outline-variant/20 pb-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-m3-primary font-mono flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Inter-Branch Live Transmission Status
              </h3>
              <p className="text-[10.5px] text-zinc-400 mt-0.5">
                Daily store closure & report submission matrix for accounting date <strong className="text-amber-500 font-mono">{reportingDate}</strong>.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={reportingDate}
                onChange={(e) => setReportingDate(e.target.value)}
                className="bg-m3-surface-container border border-m3-outline-variant/40 rounded-xl px-3 py-1.5 text-xs text-m3-on-surface focus:outline-none focus:border-m3-primary font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {branches.map((b) => {
              const matchedReport = branchSalesReports.find(
                (r) => r.branchId === b.id && r.reportingDate === reportingDate
              );
              return (
                <div
                  key={b.id}
                  className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between h-[128px] ${
                    matchedReport
                      ? "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40"
                      : "bg-m3-surface border-m3-outline-variant/20 hover:border-m3-outline-variant/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-black text-m3-on-surface flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-m3-primary shrink-0" />
                        <span className="truncate">{b.name}</span>
                      </div>
                      <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider block mt-0.5">
                        ID: {b.id}
                      </span>
                    </div>
                    {matchedReport ? (
                      <span className="px-2 py-0.5 rounded-full text-[8.5px] font-extrabold font-mono uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                        Transmitted
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[8.5px] font-extrabold font-mono uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                        Pending
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 font-mono text-xs pt-2 border-t border-m3-outline-variant/10">
                    {matchedReport ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-[9.5px] text-zinc-400">Report Sales:</span>
                          <span className="font-extrabold text-emerald-400">₱{matchedReport.totalSalesAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-zinc-500">
                          <span>Tx Count: {matchedReport.totalSalesCount}</span>
                          <span>{matchedReport.transmissionType || "Online Web"}</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-[10px] text-zinc-500 font-sans flex items-center justify-between">
                        <span>Awaiting daily closure</span>
                        <button
                          onClick={() => {
                            setPastedJson("");
                            setImportError(null);
                            setImportSuccess(false);
                            setShowJsonImport(true);
                          }}
                          className="text-[9px] font-bold text-amber-500 hover:underline cursor-pointer"
                        >
                          + Manual Import
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Central HQ Audited Sales Registry */}
        <div className="space-y-6">
 {currentUser.role === UserRole.ADMIN && rollbackSnapshots.length > 0 && (
 <div className="bg-[#1c1316] border border-rose-500/20 rounded-[28px] p-6 space-y-4 text-left shadow-sm">
 <div className="space-y-0.5 border-b border-rose-500/20 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
 <div>
 <h3 className="text-xs font-black uppercase tracking-widest text-rose-400 font-mono flex items-center gap-1.5">
 <span className="shrink-0 w-2 h-2 rounded-full bg-rose-500" />
 State Recovery & Rollback Center
 </h3>
 <p className="text-[10.5px] text-zinc-400">
 Active rolling buffers of the 5 most recent ledger states. Restore database instantly to revert accidental manual imports.
 </p>
 </div>
 <div className="px-3 py-1 rounded-full text-[9px] font-mono tracking-wider bg-rose-950/30 text-rose-300 font-bold uppercase border border-rose-500/30">
 {rollbackSnapshots.length} Active Buffers
 </div>
 </div>

 <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-thin pr-1">
 {rollbackSnapshots.map((snap) => (
 <div
 key={snap.id}
 className="p-3 bg-zinc-900/50 border border-m3-outline-variant/15 rounded-xl hover:border-rose-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
 >
 <div className="space-y-1">
 <div className="flex items-center gap-2">
 <span className="text-[10px] font-bold text-zinc-200 bg-zinc-800 px-1.5 py-0.5 rounded font-mono">
 {snap.id}
 </span>
 <span className="text-rose-400 font-black font-mono text-[10px]">
 {snap.branchName}
 </span>
 <span className="text-zinc-500">•</span>
 <span className="text-zinc-400 font-semibold">{snap.reportingDate}</span>
 </div>
 <div className="text-[10px] text-zinc-500 font-mono">
 Snapshot captured on {snap.timestamp && !isNaN(new Date(snap.timestamp).getTime()) ? new Date(snap.timestamp).toLocaleString() : "N/A"}
 </div>
 </div>
 <button
 onClick={() => {
 const res = performRollbackToSnapshot(snap.id);
 if (res.success) {
 triggerToast("Ledger rolled back successfully. Database states restored.", "success");
 } else {
 triggerToast(res.error || "Rollback failed.", "error");
 }
 }}
 className="px-3.5 py-1.5 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/30 hover:border-rose-500 text-rose-300 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 shrink-0 self-end sm:self-center"
 >
 One-Click Rollback State
 </button>
 </div>
 ))}
 </div>
 </div>
 )}

 <div className="bg-m3-surface-low border border-m3-outline-variant/30 rounded-[28px] p-6 space-y-5 text-left shadow-sm">
 <div className="space-y-0.5 border-b border-m3-outline-variant/20 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
 <div>
 <h3 className="text-xs font-black uppercase tracking-widest text-m3-primary font-mono flex items-center gap-1.5">
 <FileText className="h-4 w-4 text-emerald-400" />
 Headquarters Sales Audit registry
 </h3>
 
 </div>

 {/* Status tally badge */}
 <div className="px-3 py-1 rounded-full text-[10px] font-mono tracking-widest bg-zinc-800 text-amber-500 font-extrabold uppercase shrink-0 self-start sm:self-center border border-zinc-700">
 TOTAL: {branchSalesReports.length} Reports
 </div>
 </div>

 {/* SEARCH AND FILTERS */}
 <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 bg-m3-surface-container/60 p-4 rounded-2xl border border-m3-outline-variant/15">
 <div className="sm:col-span-6 space-y-1">
 <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 pl-0.5 font-mono">Filter text query:</label>
 <div className="relative">
 <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-500">
 <Search className="h-3.5 w-3.5" />
 </span>
 <input
 type="text"
 value={adminSearchQuery}
 onChange={(e) => setAdminSearchQuery(e.target.value)}
 placeholder="Search query (Branch, Date, Report ID)..."
 className="w-full bg-m3-surface-low border border-m3-outline-variant/40 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-m3-primary text-m3-on-surface"
 />
 </div>
 </div>

 <div className="sm:col-span-3 space-y-1">
 <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 pl-0.5 font-mono">Branch origin:</label>
 {currentUser.role === UserRole.ADMIN ? (
 <select
 value={adminBranchFilter}
 onChange={(e) => setAdminBranchFilter(e.target.value)}
 className="w-full bg-m3-surface-low border border-m3-outline-variant/40 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-m3-primary text-m3-on-surface"
 >
 <option value="ALL">All Branches</option>
 {branches.map(b => (
 <option key={b.id} value={b.id}>{b.name}</option>
 ))}
 </select>
 ) : (
 <div className="w-full bg-m3-surface-container/60 border border-m3-outline-variant/20 rounded-xl px-3 py-2 text-xs font-mono font-bold text-m3-on-surface">
 {branches.find(b => b.id === (currentUser.branchAssignmentId || 'B1'))?.name || 'N/A'}
 </div>
 )}
 </div>

 <div className="sm:col-span-3 space-y-1">
 <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 pl-0.5 font-mono">Audit state:</label>
 <select
 value={adminStatusFilter}
 onChange={(e) => setAdminStatusFilter(e.target.value)}
 className="w-full bg-m3-surface-low border border-m3-outline-variant/40 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-m3-primary text-m3-on-surface"
 >
 <option value="ALL">All States</option>
 <option value="Pending Audit">Pending Audit</option>
 <option value="Verified">Verified</option>
 </select>
 </div>
 </div>

 {/* CENTRAL REGISTRY TABLE */}
 <div className="border border-m3-outline-variant/20 rounded-2xl overflow-hidden bg-m3-surface">
 <table className="w-full border-collapse text-left text-xs">
 <thead className="bg-m3-surface-low font-mono text-[9px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400 border-b border-m3-outline-variant/15">
 <tr>
 <th className="py-3 px-4">REPORT MATRIX ID</th>
 <th className="py-3 px-3">BRANCH ORIGIN</th>
 <th className="py-3 px-3">DATE</th>
 <th className="py-3 px-3 text-center">RECEIPTS</th>
 <th className="py-3 px-3 text-right">TOTAL grand</th>
 <th className="py-3 px-3 text-center">LINK CHANNEL</th>
 <th className="py-3 px-4 text-center">STATUS</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-m3-outline-variant/10 font-sans">
 {filteredReports.map((report) => {
 const isSelected = selectedReport?.id === report.id;
 return (
 <tr
 key={report.id}
 onClick={() => {
 setSelectedReport(report);
 setAuditNotes(report.notes || '');
 }}
 className={`hover:bg-m3-primary/5 transition-all cursor-pointer ${
 isSelected ? 'bg-m3-primary/10 font-medium' : ''
 }`}
 >
 <td className="py-3.5 px-4 font-mono text-[10.5px] text-m3-on-surface font-bold">
 {report.id}
 </td>
 <td className="py-3.5 px-3 font-semibold text-m3-on-surface">
 {report.branchName}
 </td>
 <td className="py-3.5 px-3 font-mono text-[11px] text-zinc-600 dark:text-m3-on-surface">
 {report.reportingDate}
 </td>
 <td className="py-3.5 px-3 text-center font-bold text-m3-on-surface">
 {report.totalSalesCount}
 </td>
 <td className="py-3.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
 ₱{report.totalSalesAmount.toLocaleString()}
 </td>
 <td className="py-3.5 px-3 text-center">
 <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
 report.transmissionType === 'Online'
 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
 : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
 }`}>
 {report.transmissionType}
 </span>
 </td>
 <td className="py-3.5 px-4 text-center">
 <span className={`inline-block px-2.5 py-1 rounded-[10px] text-[10px] font-black uppercase tracking-wider ${
 report.status === 'Verified'
 ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
 : 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20'
 }`}>
 {report.status}
 </span>
 </td>
 </tr>
 );
 })}

 {filteredReports.length === 0 && (
 <tr>
 <td colSpan={7} className="py-12 text-center text-zinc-500 font-medium leading-relaxed font-sans">
 <div className="flex flex-col items-center justify-center space-y-2">
 <FolderOpen className="h-8 w-8 text-zinc-600" />
 <span>No secure branch sales reports matching current criteria found.</span>
 </div>
 </td>
 </tr>
 )}
</tbody>
 </table>
 </div>
 </div>

 {currentUser.role === UserRole.ADMIN && (
 <div className="bg-m3-surface-low border border-m3-outline-variant/30 rounded-[28px] p-6 space-y-4 text-left shadow-sm">
 <div className="space-y-0.5 border-b border-m3-outline-variant/20 pb-3 flex justify-between items-center">
 <div>
 <h3 className="text-xs font-black uppercase tracking-widest text-rose-450 font-mono flex items-center gap-1.5">
 <ShieldAlert className="h-4 w-4 text-rose-500" />
 Anti-Replay Signature Registry (Immutable)
 </h3>
 
 </div>
 <span className="px-3 py-1 rounded-full text-[9px] font-mono tracking-widest bg-rose-500/10 text-rose-400 font-extrabold uppercase border border-rose-500/20">
 {usedNoncesList.length} INDEXED
 </span>
 </div>

 <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
 {usedNoncesList.map((id, index) => {
 let typeLabel = "Signature Identifier";
 let badgeColor = "bg-zinc-850 text-zinc-400 border-zinc-750";
 if (id.startsWith("TRANS-")) {
 typeLabel = "Deterministic Transmission";
 badgeColor = "bg-purple-500/10 text-purple-400 border-purple-500/20";
 } else if (id.startsWith("NONCE-")) {
 typeLabel = "Cryptographic Nonce";
 badgeColor = "bg-m3-primary/10 text-m3-primary border-m3-primary/20";
 } else if (id.startsWith("IMPID-")) {
 typeLabel = "Ingestion Reference";
 badgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
 }

 return (
 <div key={index} className="p-3 bg-m3-surface border border-m3-outline-variant/10 rounded-xl flex items-center justify-between gap-4 font-mono text-[10.5px]">
 <div className="truncate pr-2">
 <span className="text-zinc-500 mr-2 text-[9px] select-none">[{index + 1}]</span>
 <span className="text-zinc-200 font-extrabold">{id}</span>
 </div>
 <div className="flex items-center gap-2 shrink-0">
 <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${badgeColor}`}>
 {typeLabel}
 </span>
 <span className="text-[9px] text-emerald-400 bg-emerald-500/5 border border-emerald-500/15 px-1.5 py-0.5 rounded font-bold uppercase select-none tracking-widest">
 INDEXED
 </span>
 </div>
 </div>
 );
 })}

 {usedNoncesList.length === 0 && (
 <div className="py-8 text-center text-zinc-500 text-xs font-semibold">
 No security signatures have been registered in this terminal session yet.
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 </div>

 {/* EXPANDED INTERACTIVE AUDITOR AND TRANSACTION ITEMS DRAWER (MODAL OVERLAY) */}
 <AnimatePresence>
 {selectedReport && (
 <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in text-left font-sans">
 <div className="absolute inset-0 bg-gray-950/75 backdrop-blur-sm shadow-xl" onClick={() => setSelectedReport(null)} />
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 30 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 30 }}
 className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-[32px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface space-y-6 flex flex-col"
 >
 <div className="flex justify-between items-start border-b border-m3-outline-variant/20 pb-4">
 <div className="space-y-1">
 <span className="text-[10px] font-black uppercase tracking-widest font-mono text-zinc-400">Enclosed Sales Report Package Details</span>
 <h3 className="text-sm font-black uppercase text-m3-primary flex items-center gap-1.5">
 <FileJson className="h-4.5 w-4.5 text-amber-500" />
 Audit Inspection Matrix for {selectedReport.branchName} ({selectedReport.reportingDate})
 </h3>
 </div>
 <button
 onClick={() => setSelectedReport(null)}
 className="p-1.5 hover:bg-m3-primary/10 hover:text-rose-500 rounded-xl cursor-pointer"
 title="Dismiss details drawer"
 >
 <XIcon className="h-5 w-5" />
 </button>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
 {/* Report summary grid metrics */}
 <div className="lg:col-span-4 space-y-5">
 <div className="bg-m3-surface border border-m3-outline-variant/15 rounded-2xl p-4.5 space-y-4 font-mono text-xs">
 <div className="text-[10.5px] text-zinc-400 font-extrabold pb-2 border-b border-m3-outline-variant/15 uppercase tracking-wider">
 General Properties
 </div>

 <div className="space-y-2 leading-relaxed">
 <div className="flex justify-between">
 <span className="text-zinc-500">Report ID:</span>
 <span className="text-white font-bold">{selectedReport.id}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-zinc-500">Transferred At:</span>
 <span className="text-m3-on-surface">{selectedReport.transferredAt && !isNaN(new Date(selectedReport.transferredAt).getTime()) ? new Date(selectedReport.transferredAt).toLocaleString() : "N/A"}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-zinc-500">Sales Transactions:</span>
 <span className="text-white font-bold">{selectedReport.totalSalesCount} entries</span>
 </div>
 <div className="flex justify-between">
 <span className="text-zinc-500">Sum Flat Discounts:</span>
 <span className="text-m3-on-surface">₱{selectedReport.totalDiscountAmount.toLocaleString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-zinc-500">Calculated VAT:</span>
 <span className="text-m3-on-surface">₱{selectedReport.totalVatAmount.toLocaleString()}</span>
 </div>
 <div className="flex justify-between border-t border-m3-outline-variant/10 pt-2 text-[12.5px]">
 <span className="text-m3-primary font-bold">Grand Settled total:</span>
 <span className="text-emerald-400 font-black">₱{selectedReport.totalSalesAmount.toLocaleString()}</span>
 </div>
 </div>
 </div>

 {/* Audit Actions Panel (Only visible/interactable by Managers or Admins) */}
 <div className="bg-m3-surface border border-m3-outline-variant/20 rounded-2xl p-4.5 space-y-4">
 <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider border-b border-m3-outline-variant/15 pb-2 flex items-center gap-1">
 <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
 <span>Auditor Command Module</span>
 </div>

 <div className="space-y-3 font-sans">
 {selectedReport.auditedBy && (
 <div className="p-3 bg-emerald-500/5 text-emerald-400 border border-emerald-500/15 rounded-xl text-[10.5px] leading-relaxed">
 <span className="font-extrabold uppercase block text-[9.5px] tracking-wider mb-0.5">Audited & approved</span>
 Verified by <strong className="text-white font-bold">{selectedReport.auditedBy}</strong> on <span className="font-mono text-zinc-200">{selectedReport.auditedAt && !isNaN(new Date(selectedReport.auditedAt).getTime()) ? new Date(selectedReport.auditedAt).toLocaleString() : "N/A"}</span>.
 </div>
 )}

 <div className="space-y-1.5">
 <label className="text-[9.5px] font-black uppercase tracking-widest text-zinc-400 pl-0.5">Auditor Verification notes:</label>
 <textarea
 value={auditNotes}
 onChange={(e) => setAuditNotes(e.target.value)}
 placeholder="Log notes about physical cash counting, discrepancies or VAT ledger checks..."
 rows={3}
 className="w-full bg-m3-surface-low border border-m3-outline-variant/40 rounded-xl p-2.5 text-xs text-m3-on-surface focus:outline-none focus:border-m3-primary text-sans"
 />
 </div>

 <div className="grid grid-cols-2 gap-2.5 pt-2">
 <button
 onClick={() => handleSetAuditStatus('Verified')}
 disabled={selectedReport.status === 'Verified'}
 className="py-2.5 px-3 bg-emerald-500 text-black hover:bg-emerald-400 transition-all text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-center shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5"
 >
 <CheckCircle2 className="h-3.5 w-3.5" />
 Verify OK
 </button>

 <button
 onClick={() => handleSetAuditStatus('Pending Audit')}
 className="py-2.5 px-3 bg-m3-surface border border-m3-outline-variant/40 hover:bg-rose-500/10 hover:text-rose-400 text-m3-on-surface transition-all text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer text-center"
 >
 Set Pending
 </button>
 </div>

 {/* Enclosed Report Multi-Format Document Export */}
 <div className="pt-4 border-t border-m3-outline-variant/15 space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-[9px] font-black uppercase tracking-widest text-m3-on-surface-variant font-mono">
 Multi-Format Audit Export (Admin/Manager):
 </span>
 {!isAuthorizedToExport ? (
 <span className="text-[8px] font-bold text-rose-450 font-mono bg-rose-950/20 px-1.5 py-0.5 rounded border border-rose-500/20 uppercase tracking-wide">
 Locked (Staff Role)
 </span>
 ) : (
 <span className="text-[8px] font-bold text-emerald-400 font-mono bg-emerald-950/20 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wide">
 Allowed
 </span>
 )}
 </div>

 <div className="grid grid-cols-3 gap-1.5 pt-1">
 <button
 type="button"
 disabled={!isAuthorizedToExport}
 onClick={() => handleExportCSV('selected', false)}
 className="py-2.5 bg-m3-surface-lowest hover:bg-m3-surface border border-m3-outline-variant/20 hover:border-emerald-500/30 text-m3-on-surface hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl text-[10px] font-bold transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-1 disabled:opacity-35 disabled:hover:text-zinc-500 disabled:border-transparent font-sans"
 title="Export Selected Transmitted Report in CSV Format"
 >
 <span className="text-[8px] uppercase font-bold text-zinc-500 font-mono block">CSV</span>
 <span>Export</span>
 </button>

 <button
 type="button"
 disabled={!isAuthorizedToExport}
 onClick={async () => {
   if (!selectedReport) return;
   const res = await exportSalesTransmittalToXLSX(selectedReport, currentUser);
   if (res.success) {
     triggerToast(`Successfully exported Excel workbook (.XLSX) sales report!`, 'success');
   } else {
     triggerToast('Failed to export Excel workbook.', 'error');
   }
 }}
 className="py-2.5 bg-m3-surface-lowest hover:bg-m3-surface border border-teal-500/30 hover:border-teal-500/60 text-teal-600 dark:text-teal-400 rounded-xl text-[10px] font-bold transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-1 disabled:opacity-35 disabled:hover:text-zinc-500 disabled:border-transparent font-sans shadow-sm"
 title="Export Selected Transmitted Report as Microsoft Excel (.XLSX) Workbook"
 >
 <FileSpreadsheet className="h-3.5 w-3.5 text-teal-500" />
 <span>Excel (.XLSX)</span>
 </button>

 <button
 type="button"
 disabled={!isAuthorizedToExport}
 onClick={() => handleOpenPrintPreview('selected')}
 className="py-2.5 bg-m3-surface-lowest hover:bg-m3-surface border border-m3-outline-variant/20 hover:border-amber-500/30 text-m3-on-surface hover:text-amber-600 dark:hover:text-amber-500 rounded-xl text-[10px] font-bold transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-1 disabled:opacity-35 disabled:hover:text-zinc-500 disabled:border-transparent font-sans"
 title="Open layout template and prompt printer utility"
 >
 <Printer className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
 <span>Print PDF</span>
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* itemized transaction details included in report */}
  <div className="lg:col-span-8 space-y-4">
  {/* Tabs for Admin Audit Panels */}
  <div className="flex flex-wrap gap-1 bg-m3-surface-low p-1 rounded-xl border border-m3-outline-variant/15">
   <button
    onClick={() => setAuditActiveSubTab("sales")}
    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
     auditActiveSubTab === "sales"
      ? "bg-m3-primary text-m3-on-primary shadow-sm"
      : "text-zinc-400 hover:text-white hover:bg-white/5"
    }`}
   >
    Transactions ({selectedReport.sales.length})
   </button>
   <button
    onClick={() => setAuditActiveSubTab("pandl")}
    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
     auditActiveSubTab === "pandl"
      ? "bg-m3-primary text-m3-on-primary shadow-sm"
      : "text-zinc-400 hover:text-white hover:bg-white/5"
    }`}
   >
    Profit & Loss ({selectedReport.expenses ? `₱${(selectedReport.pandl?.netProfit ?? 0).toLocaleString()}` : "Calculated"})
   </button>
   <button
    onClick={() => setAuditActiveSubTab("heatmap")}
    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
     auditActiveSubTab === "heatmap"
      ? "bg-m3-primary text-m3-on-primary shadow-sm"
      : "text-zinc-400 hover:text-white hover:bg-white/5"
    }`}
   >
    Hourly Heatmap
   </button>
   <button
    onClick={() => setAuditActiveSubTab("deliveries")}
    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
     auditActiveSubTab === "deliveries"
      ? "bg-m3-primary text-m3-on-primary shadow-sm"
      : "text-zinc-400 hover:text-white hover:bg-white/5"
    }`}
   >
    Cargo Deliveries ({selectedReport.deliveries?.length ?? 0})
   </button>
   <button
    onClick={() => setAuditActiveSubTab("boa")}
    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
     auditActiveSubTab === "boa"
      ? "bg-m3-primary text-m3-on-primary shadow-sm"
      : "text-zinc-400 hover:text-white hover:bg-white/5"
    }`}
   >
    BOA Ledger ({selectedReport.boa?.length ?? 0})
   </button>
   <button
    onClick={() => setAuditActiveSubTab("pos")}
    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
     auditActiveSubTab === "pos"
      ? "bg-m3-primary text-m3-on-primary shadow-sm"
      : "text-zinc-400 hover:text-white hover:bg-white/5"
    }`}
   >
    PO Orders ({selectedReport.purchaseOrders?.length ?? 0})
   </button>
  </div>

  {auditActiveSubTab === "sales" && (
  <div className="bg-m3-surface border border-m3-outline-variant/15 rounded-2xl overflow-hidden">
  <div className="bg-m3-surface-low px-4 py-3 border-b border-m3-outline-variant/15 text-[10.5px] font-mono text-zinc-500 dark:text-zinc-400 font-extrabold uppercase tracking-widest flex justify-between">
  <span>Enclosed Sale Records list</span>
  <span className="text-amber-500">{selectedReport.sales.length} Sales</span>
  </div>

  <div className="p-1 max-h-[360px] overflow-y-auto divide-y divide-m3-outline-variant/10">
  {selectedReport.sales.map((sale) => (
  <div
  key={sale.id}
  onClick={() => setSelectedSale(sale)}
  className="p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-m3-surface-low rounded-xl cursor-pointer transition-all border border-transparent hover:border-m3-outline-variant/30 hover:scale-[1.005] select-none"
  title="Click to view detailed itemized sale receipt and tile metrics"
  >
  <div className="space-y-1 text-left">
  <div className="flex items-center gap-2">
  <span className="font-mono text-m3-primary font-bold">{sale.saleNumber}</span>
  <span className="px-2 py-0.5 rounded-[5px] bg-m3-secondary-container text-m3-on-secondary-container text-[9px] font-mono font-bold uppercase">
  {sale.paymentMethod}
  </span>
  </div>
  <p className="text-[11px] text-zinc-400">
  Cashier: <strong className="text-m3-on-surface font-bold">{sale.cashierName}</strong> • Date: <span className="font-mono">{sale.createdAt && !isNaN(new Date(sale.createdAt).getTime()) ? new Date(sale.createdAt).toLocaleTimeString() : "N/A"}</span>
  </p>
  <p className="text-[11px] text-zinc-400">
  Customer: <strong className="text-m3-on-surface font-semibold">{sale.customerName || "Walk-in"}</strong>
  </p>
  </div>

  <div className="text-right font-mono self-start sm:self-center">
  <div className="text-[11px] font-bold text-zinc-400 flex flex-col sm:items-end">
  {sale.discount > 0 && (
  <span className="text-[10px] text-zinc-500">Disc: -₱{sale.discount.toLocaleString()}</span>
  )}
  <span className="text-emerald-400 font-black text-sm">₱{sale.grandTotal.toLocaleString()}</span>
  </div>
  </div>
  </div>
  ))}

  {selectedReport.sales.length === 0 && (
  <p className="py-8 text-center text-zinc-500 font-medium font-sans">No enclosed transaction receipts registered inside this report vector.</p>
  )}
  </div>
  </div>
  )}

  {auditActiveSubTab === "pandl" && (
  <div className="space-y-4">
   <div className="bg-m3-surface border border-m3-outline-variant/15 rounded-2xl p-5 text-left">
    <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 font-mono mb-4 border-b border-m3-outline-variant/15 pb-2">
     Profit & Loss (P&L) Statement
    </h4>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
     <div className="space-y-2 font-mono text-xs">
      <div className="flex justify-between pb-1.5 border-b border-m3-outline-variant/10">
       <span className="text-zinc-500">Gross Revenue (Sales):</span>
       <span className="text-emerald-400 font-bold">₱{(selectedReport.pandl?.revenue ?? selectedReport.totalSalesAmount).toLocaleString()}</span>
      </div>
      <div className="flex justify-between pb-1.5 border-b border-m3-outline-variant/10">
       <span className="text-zinc-500">Cost of Goods Sold (COGS):</span>
       <span className="text-amber-500 font-bold">₱{(selectedReport.pandl?.cogs ?? 0).toLocaleString()}</span>
      </div>
      <div className="flex justify-between pt-1 pb-1.5 border-b-2 border-m3-outline-variant/15 font-bold text-sm">
       <span className="text-m3-on-surface">Gross Profit Margin:</span>
       <span className="text-white">
        ₱{((selectedReport.pandl?.revenue ?? selectedReport.totalSalesAmount) - (selectedReport.pandl?.cogs ?? 0)).toLocaleString()}
       </span>
      </div>
     </div>

     <div className="space-y-2 font-mono text-xs">
      <div className="flex justify-between pb-1.5 border-b border-m3-outline-variant/10">
       <span className="text-zinc-500">Operating Expenses:</span>
       <span className="text-rose-400 font-bold">₱{(selectedReport.pandl?.expenses ?? 0).toLocaleString()}</span>
      </div>
      <div className="flex justify-between pt-3 pb-1.5 font-black text-sm">
       <span className="text-m3-primary uppercase tracking-wider">Net Operating Profit:</span>
       <span className={`text-sm ${(selectedReport.pandl?.netProfit ?? 0) >= 0 ? "text-emerald-400" : "text-rose-500"}`}>
        ₱{(selectedReport.pandl?.netProfit ?? ((selectedReport.pandl?.revenue ?? selectedReport.totalSalesAmount) - (selectedReport.pandl?.cogs ?? 0) - (selectedReport.pandl?.expenses ?? 0))).toLocaleString()}
       </span>
      </div>
     </div>
    </div>
   </div>

   <div className="bg-m3-surface border border-m3-outline-variant/15 rounded-2xl overflow-hidden text-left">
    <div className="bg-m3-surface-low px-4 py-3 border-b border-m3-outline-variant/15 text-[10.5px] font-mono text-zinc-500 dark:text-zinc-400 font-extrabold uppercase tracking-widest flex justify-between">
     <span>Itemized Operational Expenses</span>
     <span className="text-rose-400">{selectedReport.expenses?.length ?? 0} Expenses</span>
    </div>
    <div className="p-1 max-h-[250px] overflow-y-auto">
     <table className="w-full text-xs font-sans text-left">
      <thead>
       <tr className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 border-b border-m3-outline-variant/10">
        <th className="p-2.5">Category</th>
        <th className="p-2.5">Recorded By</th>
        <th className="p-2.5">Notes</th>
        <th className="p-2.5 text-right">Amount</th>
       </tr>
      </thead>
      <tbody className="divide-y divide-m3-outline-variant/10">
       {(selectedReport.expenses ?? []).map((exp, idx) => (
        <tr key={idx} className="hover:bg-m3-surface-low">
         <td className="p-2.5 font-bold text-white">{exp.category}</td>
         <td className="p-2.5 text-zinc-400">{exp.recordedBy}</td>
         <td className="p-2.5 text-zinc-500 truncate max-w-[150px]">{exp.notes || "No description"}</td>
         <td className="p-2.5 font-mono font-bold text-right text-rose-450">₱{exp.amount.toLocaleString()}</td>
        </tr>
       ))}
       {(selectedReport.expenses ?? []).length === 0 && (
        <tr>
         <td colSpan={4} className="p-8 text-center text-zinc-500">No branch expenses logged on this reporting date.</td>
        </tr>
       )}
</tbody>
     </table>
    </div>
   </div>
  </div>
  )}

  {auditActiveSubTab === "heatmap" && (
  <div className="bg-m3-surface border border-m3-outline-variant/15 rounded-2xl p-5 text-left space-y-4">
   <div className="border-b border-m3-outline-variant/15 pb-2">
    <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 font-mono">
     Hourly Sales Heatmap Analysis
    </h4>
    
   </div>

   <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
    {(selectedReport.heatmap ?? Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0, amount: 0 }))).map((slot, idx) => {
     const hasSales = slot.count > 0;
     const hourLabel = `${slot.hour.toString().padStart(2, "0")}:00`;
     return (
      <div
       key={idx}
       className={`p-2 rounded-xl border flex flex-col items-center justify-between transition-all ${
        hasSales
         ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
         : "bg-zinc-900/40 border-zinc-800/50 text-zinc-600"
       }`}
      >
       <span className="text-[9px] font-mono font-extrabold">{hourLabel}</span>
       <div className="h-6 w-1 rounded bg-current opacity-60 my-1.5" style={{ height: `${Math.min(24, 6 + slot.count * 3)}px` }} />
       <span className="text-[10px] font-black font-mono">{slot.count} tx</span>
       {hasSales && (
        <span className="text-[8px] font-mono font-semibold block truncate max-w-full">₱{Math.round(slot.amount).toLocaleString()}</span>
       )}
      </div>
     );
    })}
   </div>
  </div>
  )}

  {auditActiveSubTab === "deliveries" && (
  <div className="bg-m3-surface border border-m3-outline-variant/15 rounded-2xl overflow-hidden text-left">
   <div className="bg-m3-surface-low px-4 py-3 border-b border-m3-outline-variant/15 text-[10.5px] font-mono text-zinc-500 dark:text-zinc-400 font-extrabold uppercase tracking-widest flex justify-between">
    <span>E-Commerce & Cargo Deliveries</span>
    <span className="text-blue-400">{selectedReport.deliveries?.length ?? 0} Scheduled</span>
   </div>
   <div className="p-1 max-h-[360px] overflow-y-auto">
    <table className="w-full text-xs font-sans text-left">
     <thead>
      <tr className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 border-b border-m3-outline-variant/10">
       <th className="p-2.5">Tracking ID</th>
       <th className="p-2.5">Recipient</th>
       <th className="p-2.5">Status</th>
       <th className="p-2.5">Destination Address</th>
       <th className="p-2.5 text-right">Fee</th>
      </tr>
     </thead>
     <tbody className="divide-y divide-m3-outline-variant/10">
      {(selectedReport.deliveries ?? []).map((del, idx) => (
       <tr key={idx} className="hover:bg-m3-surface-low">
        <td className="p-2.5 font-mono font-bold text-white">{del.id || del.trackingNumber}</td>
        <td className="p-2.5 font-semibold text-zinc-300">{del.recipientName || del.customerName || "Standard Delivery"}</td>
        <td className="p-2.5">
         <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
          del.status === "Completed" || del.status === "Delivered"
           ? "bg-emerald-500/10 text-emerald-400"
           : "bg-amber-500/10 text-amber-500"
         }`}>
          {del.status}
         </span>
        </td>
        <td className="p-2.5 text-zinc-500 truncate max-w-[200px]">{del.address || del.deliveryAddress || "Branch Collect"}</td>
        <td className="p-2.5 font-mono font-bold text-right text-zinc-400">₱{(del.deliveryFee ?? del.fee ?? 0).toLocaleString()}</td>
       </tr>
      ))}
      {(selectedReport.deliveries ?? []).length === 0 && (
       <tr>
        <td colSpan={5} className="p-8 text-center text-zinc-500">No cargo deliveries scheduled on this reporting date.</td>
       </tr>
      )}
</tbody>
    </table>
   </div>
  </div>
  )}

  {auditActiveSubTab === "boa" && (
  <div className="bg-m3-surface border border-m3-outline-variant/15 rounded-2xl overflow-hidden text-left">
   <div className="bg-m3-surface-low px-4 py-3 border-b border-m3-outline-variant/15 text-[10.5px] font-mono text-zinc-500 dark:text-zinc-400 font-extrabold uppercase tracking-widest flex justify-between">
    <span>Book of Accounts (BOA) Audit Trail</span>
    <span className="text-purple-400">{selectedReport.boa?.length ?? 0} Chronological Logs</span>
   </div>
   <div className="p-1 max-h-[360px] overflow-y-auto">
    <div className="divide-y divide-m3-outline-variant/10 font-mono text-[10.5px]">
     {(selectedReport.boa ?? []).map((log, idx) => (
      <div key={idx} className="p-2.5 hover:bg-m3-surface-low space-y-1">
       <div className="flex justify-between items-center text-[10px]">
        <span className="text-zinc-400 font-bold uppercase text-[9px] tracking-wider px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">
         {log.type}
        </span>
        <span className="text-zinc-500">{log.timestamp && !isNaN(new Date(log.timestamp).getTime()) ? new Date(log.timestamp).toLocaleTimeString() : "N/A"}</span>
       </div>
       <p className="text-zinc-300 font-sans text-xs">{log.description}</p>
       <div className="text-[9px] text-zinc-500 flex justify-between">
        <span>Operator: {log.userName}</span>
        <span>ID: {log.id}</span>
       </div>
      </div>
     ))}
     {(selectedReport.boa ?? []).length === 0 && (
      <p className="p-8 text-center text-zinc-500 font-sans">No Book of Accounts system audits recorded for this date.</p>
     )}
    </div>
   </div>
  </div>
  )}

  {auditActiveSubTab === "pos" && (
  <div className="bg-m3-surface border border-m3-outline-variant/15 rounded-2xl overflow-hidden text-left">
   <div className="bg-m3-surface-low px-4 py-3 border-b border-m3-outline-variant/15 text-[10.5px] font-mono text-zinc-500 dark:text-zinc-400 font-extrabold uppercase tracking-widest flex justify-between">
    <span>Branch Purchase Orders (PO)</span>
    <span className="text-amber-500">{selectedReport.purchaseOrders?.length ?? 0} Orders</span>
   </div>
   <div className="p-1 max-h-[360px] overflow-y-auto">
    <table className="w-full text-xs font-sans text-left">
     <thead>
      <tr className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 border-b border-m3-outline-variant/10">
       <th className="p-2.5">PO Number</th>
       <th className="p-2.5">Supplier</th>
       <th className="p-2.5">Status</th>
       <th className="p-2.5 text-right">Total Amount</th>
      </tr>
     </thead>
     <tbody className="divide-y divide-m3-outline-variant/10">
      {(selectedReport.purchaseOrders ?? []).map((po, idx) => (
       <tr key={idx} className="hover:bg-m3-surface-low">
        <td className="p-2.5 font-mono font-bold text-white">{po.poNumber || po.id}</td>
        <td className="p-2.5 text-zinc-300">{po.supplierName || "Standard Supplier"}</td>
        <td className="p-2.5">
         <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
          po.status === "Completed" || po.status === "Approved"
           ? "bg-emerald-500/10 text-emerald-400"
           : "bg-amber-500/10 text-amber-500"
         }`}>
          {po.status}
         </span>
        </td>
        <td className="p-2.5 font-mono font-bold text-right text-amber-500">₱{(po.totalAmount ?? po.grandTotal ?? 0).toLocaleString()}</td>
       </tr>
      ))}
      {(selectedReport.purchaseOrders ?? []).length === 0 && (
       <tr>
        <td colSpan={4} className="p-8 text-center text-zinc-500">No branch purchase orders created or received on this date.</td>
       </tr>
      )}
</tbody>
    </table>
   </div>
  </div>
  )}
  </div>
  </div>
  </motion.div>
  </div>
  )}
</AnimatePresence>

 {/* POPUP: ITEMISED SALE RECORD DETAILS */}
 <AnimatePresence>
 {selectedSale && selectedReport && (
 <div className="fixed inset-0 bg-transparent flex items-center justify-center z-55 p-4 animate-fade-in text-left">
 <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setSelectedSale(null)} />
 <motion.div
 initial={{ scale: 0.95, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.95, opacity: 0 }}
 className="bg-m3-surface-low border border-m3-outline-variant/30 rounded-[28px] max-w-lg w-full text-left overflow-hidden shadow-2xl relative z-60 font-sans"
 >
 <div className="px-6 py-4.5 bg-gradient-to-r from-zinc-900 to-zinc-800 border-b border-m3-outline-variant/20 flex items-center justify-between">
 <div>
 <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
 <FileText className="h-4.5 w-4.5 text-m3-primary" />
 <span>Transaction Invoice: {selectedSale.saleNumber}</span>
 </h3>
 <span className="text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-widest block mt-0.5">
 Branch Sale Auditor Checkpoint
 </span>
 </div>
 <button
 onClick={() => setSelectedSale(null)}
 className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 cursor-pointer"
 >
 <XIcon className="h-5 w-5" />
 </button>
 </div>

 <div className="p-6 space-y-4">
 <div className="grid grid-cols-2 gap-3 bg-m3-surface p-3.5 rounded-2xl border border-m3-outline-variant/10 text-xs font-sans">
 <div>
 <span className="block text-[10px] uppercase font-bold text-zinc-400 tracking-wider font-mono">Customer / Buyer</span>
 <span className="font-extrabold text-sm text-m3-primary mt-0.5 block">{selectedSale.customerName || 'Walk-in'}</span>
 </div>
 <div>
 <span className="block text-[10px] uppercase font-bold text-zinc-400 tracking-wider font-mono">Date Settled</span>
 <span className="font-mono mt-0.5 block text-zinc-600 dark:text-m3-on-surface">{selectedSale.createdAt && !isNaN(new Date(selectedSale.createdAt).getTime()) ? new Date(selectedSale.createdAt).toLocaleString() : "N/A"}</span>
 </div>
 <div>
 <span className="block text-[10px] uppercase font-bold text-zinc-400 tracking-wider font-mono">Cashier on Duty</span>
 <span className="font-bold mt-0.5 block text-zinc-600 dark:text-m3-on-surface">{selectedSale.cashierName}</span>
 </div>
 <div>
 <span className="block text-[10px] uppercase font-bold text-zinc-400 tracking-wider font-mono">Payment Mode</span>
 <span className="font-extrabold mt-0.5 block text-emerald-600 dark:text-emerald-400 font-mono tracking-wide">{selectedSale.paymentMethod}</span>
 </div>
 </div>

 <div className="border border-m3-outline-variant/15 rounded-2xl overflow-hidden bg-m3-surface">
 <table className="w-full text-left text-[11px] border-collapse">
 <thead className="bg-m3-surface-low font-mono text-[9px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-m3-outline-variant/15">
 <tr>
 <th className="py-2.5 px-3">TILE SPECIFICATION</th>
 <th className="py-2.5 px-3 text-right">UNIT PRICE</th>
 <th className="py-2.5 px-3 text-center font-bold">QTY</th>
 <th className="py-2.5 px-3 text-right">TOTAL</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-m3-outline-variant/10 font-sans text-m3-on-surface">
 {selectedReport.saleItems
 .filter(item => item.saleId === selectedSale.id)
 .map((item, idx) => (
 <tr key={idx} className="hover:bg-m3-surface-low/35 transition-colors">
 <td className="py-2.5 px-3 font-semibold text-m3-on-surface">{item.productName}</td>
 <td className="py-2.5 px-3 text-right font-mono">₱{item.unitPrice.toLocaleString()}</td>
 <td className="py-2.5 px-3 text-center font-bold text-m3-on-surface">{item.quantity}</td>
 <td className="py-2.5 px-3 text-right font-mono text-m3-on-surface font-extrabold">₱{item.total.toLocaleString()}</td>
 </tr>
 ))}
 {selectedReport.saleItems.filter(item => item.saleId === selectedSale.id).length === 0 && (
 <tr>
 <td colSpan={4} className="py-6 text-center text-zinc-500 italic">No itemized products found in this transaction record.</td>
 </tr>
 )}
</tbody>
 </table>
 </div>

 <div className="p-3.5 bg-m3-surface border border-m3-outline-variant/10 rounded-2xl space-y-1.5 text-[11px] font-mono">
 <div className="flex justify-between">
 <span className="text-zinc-500">Retail Subtotal:</span>
 <span className="font-bold text-zinc-200">₱{selectedSale.subtotal.toLocaleString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-zinc-500">VAT (12% Included):</span>
 <span className="font-bold text-zinc-400">₱{selectedSale.vat.toLocaleString()}</span>
 </div>
 {selectedSale.discount > 0 && (
 <div className="flex justify-between text-rose-450">
 <span>Applied Flat Discount:</span>
 <span className="font-bold">-₱{selectedSale.discount.toLocaleString()}</span>
 </div>
 )}
 <div className="flex justify-between border-t border-m3-outline-variant/10 pt-2 text-xs font-sans text-emerald-400 font-bold">
 <span>Grand Total:</span>
 <span className="font-black font-mono">₱{selectedSale.grandTotal.toLocaleString()}</span>
 </div>
 </div>

 {selectedSale.notes && (
 <div className="p-2.5 bg-amber-500/5 text-amber-500 border border-amber-500/10 rounded-xl text-[10.5px]">
 <strong>Auditor Reference Notes:</strong> {selectedSale.notes}
 </div>
 )}

 <div className="flex justify-end pt-2">
 <button
 onClick={() => setSelectedSale(null)}
 className="px-5 py-2.5 bg-m3-surface hover:bg-m3-primary/10 border border-m3-outline-variant/30 text-m3-on-surface hover:text-m3-primary text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
 >
 Close Invoice
 </button>
 </div>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 {/* POPUP: MANUAL JSON IMPORT DIALOG */}
 <AnimatePresence>
 {showJsonImport && (
 <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-45 flex items-center justify-center p-4">
 <motion.div
 initial={{ scale: 0.95, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.95, opacity: 0 }}
 className="bg-m3-surface-low border border-m3-outline-variant/30 rounded-[28px] max-w-xl w-full text-left overflow-hidden shadow-2xl relative z-50 font-sans"
 >
  <div className="px-6 py-4.5 bg-m3-surface-high border-b border-m3-outline-variant/20 flex items-center justify-between">
  <div>
  <h3 className="text-sm font-black text-m3-on-surface uppercase tracking-wider">
  Import Offline Sales Report File
  </h3>
  </div>
  <button
  onClick={() => setShowJsonImport(false)}
  className="p-1.5 text-m3-on-surface-variant hover:text-m3-on-surface rounded-xl hover:bg-m3-on-surface/10 cursor-pointer"
  >
  <XIcon className="h-5 w-5" />
  </button>
  </div>

 <div className="p-6 space-y-4">
 <p className="text-xs text-m3-on-surface-variant leading-relaxed">
 Import a manually saved branch sales report JSON file. Drag-and-drop the exported file below, select it directly from storage, or paste the raw structured JSON data inside the text area.
 </p>

 {/* Drag and Drop Zone and File Picker combined */}
 <div className="space-y-1.5">
 <label className="text-[9px] font-black uppercase tracking-widest text-m3-on-surface-variant font-mono">
 Select or Drag & Drop JSON Report file:
 </label>
 <div
 onDragOver={(e) => {
 e.preventDefault();
 setIsDragging(true);
 }}
 onDragLeave={() => setIsDragging(false)}
 onDrop={(e) => {
 e.preventDefault();
 setIsDragging(false);
 const file = e.dataTransfer.files?.[0];
 if (file) {
 const reader = new FileReader();
 reader.onload = (event) => {
 const text = event.target?.result as string;
 setPastedJson(text);
 triggerToast('File dropped and loaded successfully.', 'info');
 };
 reader.onerror = () => triggerToast('Failed to read dropped file.', 'error');
 reader.readAsText(file);
 }
 }}
 className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
 isDragging
 ? 'border-m3-primary bg-m3-primary/10'
 : 'border-m3-outline-variant/40 hover:border-m3-primary/50 bg-m3-surface-lowest'
 }`}
 onClick={() => document.getElementById('report-file-picker')?.click()}
 >
 <Upload className={`h-8 w-8 transition-transform ${isDragging ? 'scale-110 text-m3-primary' : 'text-zinc-500'}`} />
 <div className="text-xs font-bold text-m3-on-surface">
 {isDragging ? 'Drop the file here' : 'Drag & Drop .json file here, or click to browse'}
 </div>
 <span className="text-[10px] text-m3-on-surface-variant font-mono">
 Accepts only signed offline report JSONs
 </span>
 <input
 type="file"
 id="report-file-picker"
 accept=".json"
 onChange={handleFileUpload}
 className="hidden"
 />
 </div>
    </div>

    {/* PASTE DIALOG */}
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[9px] font-black uppercase tracking-widest text-m3-on-surface-variant pl-0.5 font-mono">Raw JSON content string:</label>
        {pastedJson && (
          <button
            onClick={() => setPastedJson('')}
            className="text-[10px] text-rose-500 hover:underline font-bold cursor-pointer"
            type="button"
          >
            Clear
          </button>
        )}
      </div>
      <textarea
        value={pastedJson}
        onChange={(e) => setPastedJson(e.target.value)}
        placeholder='Paste raw downloaded corporate JSON file contents here, e.g. { "branchId": "B2", "branchName": "Branch Name", ... }'
        rows={6}
        className="w-full bg-m3-surface-lowest border border-m3-outline-variant/40 rounded-xl p-3 text-[10.5px] font-mono text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-m3-primary whitespace-pre scrollbar-thin"
      />
    </div>

    {/* LIVE VERIFICATION SUMMARY */}
    {liveValidation && (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-m3-on-surface-variant font-medium px-1">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${liveValidation.isParsed && liveValidation.hasRequiredFields && !liveValidation.isDuplicate ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span>
              {liveValidation.isParsed && liveValidation.hasRequiredFields && !liveValidation.isDuplicate ? (
                <>
                  <span className="font-bold text-m3-on-surface">{liveValidation.branchName || 'Valid Report'}</span>
                  <span className="opacity-70"> ({liveValidation.reportingDate}) • Total: ₱{liveValidation.recalculatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </>
              ) : (
                <span className="text-rose-500 font-bold">{!liveValidation.isParsed ? "Invalid JSON syntax (check formatting)" : (liveValidation.errors[0] || "Malformed JSON report schema")}</span>
              )}
            </span>
          </div>
          {liveValidation.isDuplicate && (
            <span className="text-[10px] text-rose-500 font-mono font-bold">Already Transmitted</span>
          )}
        </div>
      </div>
    )}

 {/* ERROR PANEL */}
 {importError && (
 <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-[10px] font-bold leading-normal flex items-start gap-2">
 <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
 <div>
 <span>Schema Verification Error:</span>
 <p className="font-medium text-m3-on-surface mt-1 whitespace-pre-line">{importError}</p>
 </div>
 </div>
 )}

 {/* SUCCESS PANEL */}
 {importSuccess && (
 <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10.5px] font-bold flex items-center gap-2.5">
 <CheckCircle2 className="h-4.5 w-4.5 animate-bounce text-emerald-400" />
 <span>Report verified, parsed, and logged inside the audit lists successfully.</span>
 </div>
 )}
 </div>

 <div className="px-6 py-4 bg-m3-surface border-t border-m3-outline-variant/15 flex justify-end gap-3.5">
 <ActionButton
 variant="outline"
 onClick={() => setShowJsonImport(false)}
 className="hover:bg-m3-primary/10"
 >
 Cancel
 </ActionButton>

 <ActionButton
 variant="primary"
 onClick={handleManualImportSubmit}
 disabled={!pastedJson.trim() || (liveValidation !== null && liveValidation.errors.filter(e => !e.includes('already exists') && !e.includes('already been registered')).length > 0)}
 isLoading={isImportingManual}
 loadingText="Executing Ledger Insertion Rules..."
 >
 Confirm & Finalize Import
 </ActionButton>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>

  {/* POPUP: SALES REPORT SHARE DIALOGUE */}
  <AnimatePresence>
  {showShareModal && (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-45 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-m3-surface-low border border-m3-outline-variant/30 rounded-[28px] max-w-lg w-full text-left overflow-hidden shadow-2xl relative z-50 font-sans"
      >
        <div className="px-6 py-4.5 bg-m3-surface-lowest border-b border-m3-outline-variant/15 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-m3-on-surface uppercase tracking-wider">
              Share Offline Sales package
            </h3>
            <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest block mt-0.5">
              Export Ready & Certified
            </span>
          </div>
          <button
            onClick={() => setShowShareModal(false)}
            className="p-1.5 text-m3-on-surface-variant hover:text-m3-on-surface rounded-xl hover:bg-m3-outline-variant/15 cursor-pointer"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="p-4 rounded-2xl bg-m3-surface-lowest border border-m3-outline-variant/15 space-y-2">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-wider">
              <CheckCircle2 className="h-4.5 w-4.5" />
              <span>Report Generation Successful</span>
            </div>
            <p className="text-xs text-m3-on-surface-variant leading-relaxed">
              The sales report file <strong className="text-m3-on-surface font-semibold font-mono break-all">{shareFileName}</strong> has been downloaded to your device drive. 
            </p>
          </div>

          <div className="space-y-3">
            <span className="text-[9px] font-black uppercase tracking-widest text-m3-on-surface-variant font-mono block">
              Choose Sharing Method:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Copy JSON content (highly robust) */}
              <button
                onClick={() => handleCopyText(sharePayloadText, 'Sales report copied to clipboard!')}
                className="p-4 bg-m3-surface-lowest hover:bg-m3-surface-high border border-m3-outline-variant/20 hover:border-m3-outline-variant/40 text-m3-on-surface rounded-2xl text-left transition-all group flex flex-col justify-between h-24 cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-black uppercase tracking-wider font-mono text-m3-on-surface-variant">Clipboard</span>
                  <Copy className="h-4 w-4 text-m3-on-surface-variant group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <div className="text-xs font-bold text-m3-on-surface mb-0.5">Copy JSON String</div>
                  
                </div>
              </button>

              {/* Manual re-download */}
              <button
                onClick={handleManualDownload}
                className="p-4 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 rounded-2xl text-left transition-all group flex flex-col justify-between h-24 cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-black uppercase tracking-wider font-mono">Local File</span>
                  <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <div className="text-xs font-bold text-m3-on-surface mb-0.5">Download JSON File</div>
                  
                </div>
              </button>

              {/* Share on facebook messenger */}
              <button
                onClick={() => {
                  handleCopyText(sharePayloadText, 'Report copied! Opening Messenger...');
                  setTimeout(() => {
                    try {
                      window.open('https://www.messenger.com', '_blank', 'noopener,noreferrer');
                    } catch (err) {
                      console.warn('Blocked popup:', err);
                    }
                  }, 500);
                }}
                className="p-4 bg-m3-primary/10 hover:bg-m3-primary/20 border border-m3-primary/20 hover:border-m3-primary/40 text-m3-primary rounded-2xl text-left transition-all group flex flex-col justify-between h-24 cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-black uppercase tracking-wider font-mono">Messenger</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
                <div>
                  <div className="text-xs font-bold text-m3-on-surface mb-0.5">Share via Messenger</div>
                  
                </div>
              </button>

              {/* Email sales report package */}
              <button
                onClick={() => {
                  handleCopyText(sharePayloadText, 'Report copied! Launching email...');
                  setTimeout(() => {
                    try {
                      const mailtoUrl = `mailto:?subject=${encodeURIComponent(`TilePoint Sales Report - ${currentBranchMeta.name} (${reportingDate})`)}&body=${encodeURIComponent(`Dear Admin,\n\nAttached is the JSON sales report for ${currentBranchMeta.name} compiled on ${reportingDate}.\n\nPlease find the report data below. Copy and paste this directly into the HQ import portal to reconcile:\n\n${sharePayloadText}\n\nKind regards,\nTilePoint Offline ERP OS System`)};`;
                      window.location.href = mailtoUrl;
                    } catch (err) {
                      console.warn('Mailto redirect failed:', err);
                    }
                  }, 500);
                }}
                className="p-4 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 hover:border-amber-500/40 text-amber-600 dark:text-amber-400 rounded-2xl text-left transition-all group flex flex-col justify-between h-24 cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-black uppercase tracking-wider font-mono">Email client</span>
                  <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <div className="text-xs font-bold text-m3-on-surface mb-0.5">Email Sales Packet</div>
                  
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-1.5 bg-m3-surface-lowest border border-m3-outline-variant/15 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-m3-on-surface-variant font-mono">
                Report Payload Content:
              </span>
              <button
                onClick={() => handleCopyText(sharePayloadText, 'Full report JSON copied to clipboard!')}
                className="text-[9px] font-bold text-m3-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Copy className="h-3 w-3" />
                Copy Raw JSON
              </button>
            </div>
            <pre className="text-[9px] font-mono text-m3-on-surface-variant select-all overflow-x-auto whitespace-pre scrollbar-thin max-h-20 max-w-full opacity-80">
              {sharePayloadText}
            </pre>
          </div>
        </div>

        <div className="px-6 py-4 bg-m3-surface border-t border-m3-outline-variant/15 flex justify-end">
          <button
            onClick={() => setShowShareModal(false)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer active:scale-97"
          >
            Done & Close
          </button>
        </div>
      </motion.div>
    </div>
  )}
  </AnimatePresence>

 {/* POPUP: SALES REPORT CUSTOM PRINT RECONCILIATION STATION */}
 <AnimatePresence>
 {showPrintModal && printData && (
 <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in text-left">
 <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={() => setShowPrintModal(false)} />
 <motion.div
 initial={{ scale: 0.95, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.95, opacity: 0 }}
 className="bg-m3-surface-low border border-m3-outline-variant/30 rounded-[28px] max-w-4xl w-full text-left overflow-hidden shadow-2xl relative z-60 font-sans flex flex-col max-h-[90vh]"
 >
 {/* Style block to control printing visibility and layout */}
 <style>{`
 @media print {
 body * {
 visibility: hidden !important;
 background: transparent !important;
 }
 #tilepoint-printable-area, #tilepoint-printable-area * {
 visibility: visible !important;
 color: #000000 !important;
 background: #ffffff !important;
 }
 #tilepoint-printable-area {
 position: absolute !important;
 left: 0 !important;
 top: 0 !important;
 width: 100% !important;
 margin: 0 !important;
 padding: 0 !important;
 box-shadow: none !important;
 }
 .no-print {
 display: none !important;
 }
 }
 `}</style>

 <div className="px-6 py-4.5 bg-gradient-to-r from-zinc-900 to-zinc-800 border-b border-m3-outline-variant/20 flex items-center justify-between no-print">
 <div className="flex items-center gap-2">
 <span className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg">
 <Printer className="h-4.5 w-4.5" />
 </span>
 <div>
 <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
 Report Print Station & PDF Station
 </h3>
 <span className="text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-widest block mt-0.5">
 Verify & trigger your local system print pipeline
 </span>
 </div>
 </div>
 <button
 onClick={() => setShowPrintModal(false)}
 className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 cursor-pointer"
 >
 <XIcon className="h-5 w-5" />
 </button>
 </div>

 {/* Printable Area Wrapper */}
 <div className="p-6 overflow-y-auto flex-1 bg-zinc-900/40">
 <div className="max-w-3xl mx-auto space-y-4">
 {/* Informational Hint */}
 <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-[11px] leading-relaxed flex items-start gap-2.5 no-print">
 <Printer className="h-4.5 w-4.5 shrink-0 mt-0.5" />
 <div>
 <strong className="block font-black uppercase text-[10px] tracking-widest text-amber-300">SYSTEM PRINTING AND PDF INSTRUCTIONS:</strong>
 <p className="mt-0.5 opacity-90 text-m3-on-surface">Clicking <strong>Trigger System Print</strong> below will open the native printer setup. To save a copy as a digital document, select <strong>"Save as PDF"</strong> or <strong>"Microsoft Print to PDF"</strong> as the destination.</p>
 </div>
 </div>

 {/* actual printable white sheet of paper */}
 <div 
 id="tilepoint-printable-area" 
 className="p-8 sm:p-12 bg-white text-zinc-900 rounded-2xl shadow-lg border border-zinc-200 font-sans relative overflow-hidden"
 >
 {/* Watermark/Accent */}
 <div className="absolute top-0 left-0 right-0 h-2 bg-zinc-955 bg-m3-primary" />
 
 <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b-2 border-zinc-900">
 <div className="space-y-1">
 <span className="text-[9.5px] font-bold uppercase tracking-widest text-zinc-500 font-mono">
 Official Corporate Audit Record
 </span>
 <h1 className="text-2xl font-black uppercase tracking-tight text-zinc-950 font-sans">
 {localStorage.getItem('tilepoint_company_name_v1') || 'Emman Tile Center'}
 </h1>
 <p className="text-xs text-zinc-500 font-medium max-w-sm">
 Flagship Depot, Warehouse & Inter-Branch Audited Ledger Transmission Module
 </p>
 </div>

 <div className="sm:text-right font-mono text-xs space-y-1">
 <div className="px-2.5 py-1 bg-zinc-900 text-white rounded font-bold inline-block text-[10px] uppercase tracking-wider">
 DAILY REVENUE STATEMENT
 </div>
 <p className="text-zinc-600 pt-1 font-sans">Report Date: <strong className="text-zinc-900 font-black">{printData.reportingDate}</strong></p>
 <p className="text-[10px] text-zinc-500 font-mono">REPORT ID: {printData.id}</p>
 </div>
 </div>

 {/* Metadata grids */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-zinc-200 text-xs">
 <div className="space-y-1.5 text-left">
 <h4 className="text-[10px] font-black uppercase tracking-widest text-m3-on-surface-variant font-mono">
 Branch Origin & Metadata
 </h4>
 <div className="space-y-1">
 <p className="text-zinc-500">Branch Name: <strong className="text-zinc-900 font-bold">{printData.branchName}</strong></p>
 <p className="text-zinc-500">Security Signature: <span className="font-mono text-[10.5px] text-zinc-700 bg-zinc-100 rounded px-1.5 py-0.5">{printData.id}</span></p>
 <p className="text-zinc-500">Transmission Channel: <strong className="text-zinc-800">{printData.transmissionType || 'Manual Data Packet'}</strong></p>
 </div>
 </div>

 <div className="space-y-1.5 sm:text-right text-left sm:text-right">
 <h4 className="text-[10px] font-black uppercase tracking-widest text-m3-on-surface-variant font-mono">
 Generation Profile
 </h4>
 <div className="space-y-1">
 <p className="text-zinc-500">Prepared By: <strong className="text-zinc-950">{currentUser.fullName} ({currentUser.role})</strong></p>
 <p className="text-zinc-500">Status: <span className="px-2 py-0.5 bg-semibold text-[10px] rounded uppercase font-black bg-zinc-100 text-zinc-800">{printData.status}</span></p>
 <p className="text-zinc-500 font-mono text-[10px]">TIMESTAMP: {new Date().toLocaleString()}</p>
 </div>
 </div>
 </div>

 {/* Summary statistics matrix grids */}
 <div className="py-6 border-b border-zinc-200 text-left">
 <h4 className="text-[10px] font-black uppercase tracking-widest text-m3-on-surface-variant font-mono mb-3">
 AGGREGATED FINANCIAL MATRIX
 </h4>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
 <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-0.5 text-left">
 <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider font-mono">Sales Issued</span>
 <p className="text-lg font-black text-zinc-950">{printData.totalSalesCount} receipts</p>
 </div>

 <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-0.5 text-left">
 <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider font-mono">Total Discounts</span>
 <p className="text-lg font-bold text-zinc-800">₱{printData.totalDiscountAmount.toLocaleString()}</p>
 </div>

 <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-0.5 text-left">
 <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider font-mono">12% VAT Collected</span>
 <p className="text-lg font-bold text-zinc-800">₱{printData.totalVatAmount.toLocaleString()}</p>
 </div>

 <div className="p-3 bg-zinc-950 text-white rounded-xl space-y-0.5 text-left">
 <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider font-mono text-m3-on-surface">Grand Total</span>
 <p className="text-lg font-black text-emerald-400 font-mono">₱{printData.totalSalesAmount.toLocaleString()}</p>
 </div>
 </div>
 </div>

 {/* Enclosed sales transactions receipts table list */}
 <div className="py-6 space-y-3 text-left">
 <h4 className="text-[10px] font-black uppercase tracking-widest text-m3-on-surface-variant font-mono">
 ENCLOSED DETAILED TRANSACTION INVOICES
 </h4>
 <div className="border border-zinc-300 rounded-xl overflow-hidden">
 <table className="w-full text-left text-[11px] border-collapse">
 <thead className="bg-zinc-100 text-zinc-700 font-mono text-[9px] uppercase tracking-wider border-b border-zinc-300">
 <tr>
 <th className="py-2.5 px-3">INVOICE NUMBER</th>
 <th className="py-2.5 px-3">CUSTOMER NAME</th>
 <th className="py-2.5 px-3">CASHIER</th>
 <th className="py-2.5 px-3">PAYMENT MODE</th>
 <th className="py-2.5 px-3 text-right">DISCOUNT</th>
 <th className="py-2.5 px-3 text-right font-bold">GRAND TOTAL</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-zinc-200 font-sans text-zinc-800 bg-white">
 {printData.sales && printData.sales.map((sale: any, idx: number) => (
 <tr key={idx} className="hover:bg-zinc-50/50">
 <td className="py-2.5 px-3 font-mono font-bold text-zinc-950">{sale.saleNumber}</td>
 <td className="py-2.5 px-3 text-zinc-900">{sale.customerName || 'Walk-in'}</td>
 <td className="py-2.5 px-3 text-zinc-700">{sale.cashierName}</td>
 <td className="py-2.5 px-3">
 <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-800 rounded text-[9px] font-bold uppercase font-mono">
 {sale.paymentMethod}
 </span>
 </td>
 <td className="py-2.5 px-3 text-right text-zinc-500 font-mono">₱{sale.discount.toLocaleString()}</td>
 <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-950">₱{sale.grandTotal.toLocaleString()}</td>
 </tr>
 ))}
 {(!printData.sales || printData.sales.length === 0) && (
 <tr>
 <td colSpan={6} className="py-6 text-center text-zinc-500 italic">No historical transaction list enclosed in this printed representation.</td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>

 {/* Official Sign-Off Signatures and Stamp Placement */}
 <div className="pt-10 grid grid-cols-2 gap-8 text-xs text-zinc-650">
 <div className="space-y-12 text-left">
 <p className="font-mono text-[9px] uppercase text-zinc-400 font-bold tracking-widest">
 PREPARED BY OPERATOR
 </p>
 <div className="border-t border-zinc-400 pt-1.5 w-48 text-left">
 <p className="font-bold text-zinc-900">{currentUser.fullName}</p>
 <p className="text-[10px] text-zinc-500">{currentUser.role} Signatures</p>
 </div>
 </div>

 <div className="space-y-12 flex flex-col items-end text-right">
 <p className="font-mono text-[9px] uppercase text-zinc-400 font-bold tracking-widest self-end">
 HEAD AUDITOR / BRANCH MANAGER OK
 </p>
 <div className="border-t border-zinc-400 pt-1.5 w-48 text-right">
 <p className="font-bold text-zinc-900">{printData.status === 'Verified' ? (printData.auditedBy || 'Verified Auditor') : '_______________________'}</p>
 <p className="text-[10px] text-zinc-500">Authorized Signature & Verification Stamp</p>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>

 <div className="px-6 py-4 bg-m3-surface border-t border-m3-outline-variant/15 flex justify-end gap-3.5 no-print">
 <button
 type="button"
 onClick={() => setShowPrintModal(false)}
 className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white rounded-xl transition-all cursor-pointer"
 >
 Dismiss
 </button>

 <button
 type="button"
 onClick={() => {
 window.print();
 triggerToast('Sent print job to local browser printer successfully.', 'success');
 }}
 className="px-6 py-2.5 bg-m3-primary hover:bg-m3-primary/95 text-m3-on-primary font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
 >
 <Printer className="h-4 w-4" />
 <span>Trigger System Print / Save PDF</span>
 </button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 {/* Database Snapshot Rollback Confirmation Modal */}
 <ConfirmationModal
 isOpen={!!rollbackTargetSnap}
 title="Confirm Snapshot Rollback"
 alertType="danger"
 confirmText="Rollback Database"
 cancelText="Cancel"
 message={`Are you sure you want to revert the system database to state #${rollbackTargetSnap?.num}? All recent uncommitted records and pending imports will be rolled back.`}
 onConfirm={() => {
 if (rollbackTargetSnap) {
 performRollbackToSnapshot(rollbackTargetSnap.id);
 triggerToast("Database successfully rolled back to selected snapshot state.", "success");
 setRollbackTargetSnap(null);
 }
 }}
 onCancel={() => setRollbackTargetSnap(null)}
 />
 </div>
 );

 // Helper helper labels
 function getBranchNameLabel(id: string | null) {
 if (!id || id === "B1" || id === "main" || id === "Corporate Office") {
 const stored = localStorage.getItem("tilepoint_company_name_v1");
 if (stored) return stored;
 }
 const b = branches.find((br) => br.id === id);
 if (!b) {
 const stored = localStorage.getItem("tilepoint_company_name_v1");
 if (stored) return stored;
 return "ETC_DIPOLOG MAIN";
 }
 return b.name;
 }
};

// Internal minimal fallback components to bypass missing import icons
const XIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
 <svg
 {...props}
 xmlns="http://www.w3.org/2000/svg"
 width="24"
 height="24"
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth="2.5"
 strokeLinecap="round"
 strokeLinejoin="round"
 >
 <line x1="18" y1="6" x2="6" y2="18" />
 <line x1="6" y1="6" x2="18" y2="18" />
 </svg>
);