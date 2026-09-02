import { HeroModal } from './common/ui/HeroModal';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
AlertTriangle,
Calendar,
CheckCircle,
Clock,
FileSignature,
MapPin,
Navigation,
Package,
Plus,
Printer,
RefreshCw,
Search,
ShieldAlert,
Signature,
Truck,
UserCheck,
X,
XCircle
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useDb } from '../context/DbContext';
import { UserRole } from '../types/db';
import { formatCurrency } from '../utils/formatters';
import { useReceiptFontSize } from './ReceiptFontSizeControl';
import { useResponsivePageSize } from './TablePagination';
import { ToastNotification } from './ToastNotification';
import { HeroTable } from './common/ui/HeroTable';
import { HeroButton } from './common/ui/HeroButton';
import { HeroSelect } from './common/ui/HeroSelect';
import { HeroDropdownSelect } from './common/ui/HeroDropdown';
import { HeaderBar } from './common/HeaderBar';
import { useMultiSort } from '../hooks/useMultiSort';
import { MultiSortBadgeBar } from './common/ui/MultiSortBadgeBar';
import { Delivery } from '../types/db';

interface DeliveriesModuleProps {
  darkMode?: boolean;
}

export const DeliveriesModule: React.FC<DeliveriesModuleProps> = ({ darkMode: _darkMode }) => {
 const {
 deliveries,
 sales,
 saleItems,
 updateDeliveryStatus,
 assignDeliveryPersonnel,
 completeDelivery,
 currentUser,
 branches,
 addAuditLog,
 createDelivery
 } = useDb();

 // Branch isolation state
 const { fontClass: receiptFontClass } = useReceiptFontSize();
 const [selectedBranchId, setSelectedBranchId] = useState<string>(
   currentUser?.branchAssignmentId || 'ALL'
 );

 // Search and status filters
 const [searchTerm, setSearchTerm] = useState('');
 const [selectedStatusTab, setSelectedStatusTab] = useState<string>('All');

 // Pagination State for Deliveries
 const [delivPage, setDelivPage] = useState(1);

 // Reset page when search or filters change
 useEffect(() => {
 setDelivPage(1);
 }, [searchTerm, selectedStatusTab, selectedBranchId]);

 // Detail Drawer state
 const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);

 // Assign Personnel dialogue form state
 const [assignTruck, setAssignTruck] = useState('');
 const [assignDriver, setAssignDriver] = useState('');
 const [assignHelper, setAssignHelper] = useState('');
 const [showAssignForm, setShowAssignForm] = useState(false);

 // Completion Form state
 const [receiverName, setReceiverName] = useState('');
 const [signatureText, setSignatureText] = useState('Signed On Terminal');
 const [proofPhotoUrl, setProofPhotoUrl] = useState('');
 const [showCompleteForm, setShowCompleteForm] = useState(false);

 // Fail Delivery state
 const [failReason, setFailReason] = useState('');
 const [showFailForm, setShowFailForm] = useState(false);

 // Toast notices feedback
 const [toastMessage, setToastMessage] = useState<string | null>(null);
 const triggerToast = (msg: string) => {
 setToastMessage(msg);
 setTimeout(() => setToastMessage(null), 3500);
 };

 // Manual & Auto POS Delivery Scheduling state
 const [showSchedulePosModal, setShowSchedulePosModal] = useState(false);
 const [selectedPosSaleId, setSelectedPosSaleId] = useState<string>('');
 const [posDelivCustomerName, setPosDelivCustomerName] = useState('');
 const [posDelivContact, setPosDelivContact] = useState('');
 const [posDelivHouseNo, setPosDelivHouseNo] = useState('');
 const [posDelivStreet, setPosDelivStreet] = useState('');
 const [posDelivBarangay, setPosDelivBarangay] = useState('');
 const [posDelivCity, setPosDelivCity] = useState('');
 const [posDelivLandmark, setPosDelivLandmark] = useState('');
 const [posDelivDate, setPosDelivDate] = useState(new Date().toISOString().split('T')[0]);
 const [posDelivTime, setPosDelivTime] = useState('10:00 AM - 2:00 PM');
 const [posDelivNotes, setPosDelivNotes] = useState('');
 const [posDelivTruck, setPosDelivTruck] = useState('');
 const [posDelivDriver, setPosDelivDriver] = useState('');
 const [posDelivHelper, setPosDelivHelper] = useState('');

 // Delivery State Reconciliation & Diagnostic Audit Tracking
 const [lastReconciledAt, setLastReconciledAt] = useState<string | null>(null);
 const [reconciliationStats, setReconciliationStats] = useState<{
 reconciledCount: number;
 pending: number;
 scheduled: number;
 transit: number;
 delivered: number;
 failed: number;
 } | null>(null);

 // Auto-reconcile delivery status discrepancies & missing POS store delivery orders across sessions
 const runDeliveriesReconciliationCheck = React.useCallback((silent = false) => {
 let createdCount = 0;
 let reconciledCount = 0;

 // 1. Scan POS sales for store delivery orders missing logistics tracking
 sales.forEach((s) => {
 const notesLower = (s.notes || '').toLowerCase();
 const hasDeliveryNote =
 notesLower.includes('delivery') ||
 notesLower.includes('barangay') ||
 notesLower.includes('ship') ||
 notesLower.includes('address') ||
 notesLower.includes('deliv') ||
 notesLower.includes('truck') ||
 notesLower.includes('cargo') ||
 notesLower.includes('unloading') ||
 notesLower.includes('house') ||
 notesLower.includes('street') ||
 (s.notes && s.notes.includes('SYSTEM ASSIGNED STORE DELIVERY TRACE:'));
 const existing = deliveries.find((d) => d.saleId === s.id || d.saleNumber === s.saleNumber);
 if (hasDeliveryNote && !existing) {
 createDelivery({
 saleId: s.id,
 saleNumber: s.saleNumber,
 customerName: s.customerName || 'Walk-in Customer',
 contactNumber: 'N/A',
 barangay: 'Central',
 cityMunicipality: 'Main City',
 deliveryDate: new Date().toISOString().split('T')[0],
 deliveryTime: '10:00 AM - 2:00 PM',
 notes: s.notes,
 });
 createdCount++;
 }
 });

 // 2. Reconcile existing delivery status discrepancies across active sessions
 deliveries.forEach((d) => {
 // Reconcile pending deliveries that have driver/truck assigned but status wasn't updated to Scheduled
 if (d.status === 'Pending Scheduling' && (d.driver || d.truck)) {
 updateDeliveryStatus(d.id, 'Scheduled', 'Auto-reconciled: Assigned driver/truck detected in logistics state.');
 reconciledCount++;
 }

 // Reconcile scheduled deliveries that have notes indicating dispatched or in-transit
 if (d.status === 'Scheduled' || d.status === 'Packed') {
 const dNotesLower = (d.notes || '').toLowerCase();
 if (
 dNotesLower.includes('dispatched') ||
 dNotesLower.includes('in-transit') ||
 dNotesLower.includes('out for delivery') ||
 dNotesLower.includes('en route')
 ) {
 updateDeliveryStatus(d.id, 'Out For Delivery', 'Auto-reconciled: Transit status synced from session dispatch log.');
 reconciledCount++;
 }
 }

 // Reconcile deliveries linked to completed or voided POS sales
 const matchedSale = sales.find((s) => s.id === d.saleId || s.saleNumber === d.saleNumber);
 if (matchedSale) {
 if (matchedSale.isDeleted && d.status !== 'Cancelled') {
 updateDeliveryStatus(d.id, 'Cancelled', 'Auto-reconciled: Linked POS sale was voided/cancelled.');
 reconciledCount++;
 } else if (!matchedSale.isDeleted && (matchedSale as any).isDelivered && d.status !== 'Delivered' && d.status !== 'Failed Delivery') {
 if (d.status === 'Out For Delivery' || d.status === 'Scheduled' || d.status === 'Packed') {
 updateDeliveryStatus(d.id, 'Delivered', 'Auto-reconciled: Linked POS sale checkout completed.');
 reconciledCount++;
 }
 }
 }
 });

 // 3. Compute diagnostic statistics
 const pendingCount = deliveries.filter((d) => ['Pending Scheduling', 'Packed'].includes(d.status)).length;
 const scheduledCount = deliveries.filter((d) => d.status === 'Scheduled').length;
 const transitCount = deliveries.filter((d) => d.status === 'Out For Delivery').length;
 const deliveredCount = deliveries.filter((d) => d.status === 'Delivered').length;
 const failedCount = deliveries.filter((d) => ['Failed Delivery', 'Cancelled'].includes(d.status)).length;

 const totalReconciled = createdCount + reconciledCount;
 const timestamp = new Date().toLocaleTimeString();
 setLastReconciledAt(timestamp);
 setReconciliationStats({
 reconciledCount: totalReconciled,
 pending: pendingCount,
 scheduled: scheduledCount,
 transit: transitCount,
 delivered: deliveredCount,
 failed: failedCount,
 });

 // 4. Log structured diagnostic report to console on mount/execution
 console.log(
 `[Deliveries Audit & Sync] Component Mount Reconciliation complete at ${timestamp}.\n` +
 `• Created Missing Store Deliveries: ${createdCount}\n` +
 `• Status Inconsistencies Reconciled: ${reconciledCount}\n` +
 `• Total Active Deliveries: ${deliveries.length}\n` +
 `• Diagnostics Breakdown -> Pending: ${pendingCount}, Scheduled: ${scheduledCount}, In-Transit: ${transitCount}, Delivered: ${deliveredCount}, Failed/Cancelled: ${failedCount}`
 );

 // 5. Audit Log Entry if items were created or reconciled
 if (totalReconciled > 0) {
 addAuditLog(
 'DELIVERY_RECONCILE',
 `Deliveries Reconciliation: ${createdCount} missing store delivery order(s) auto-created, ${reconciledCount} status discrepancy item(s) reconciled across sessions.`,
 'Delivery',
 'RECONCILE_ALL'
 );
 }

 // 6. User Feedback Toast
 if (totalReconciled > 0) {
 triggerToast(`Reconciliation complete: ${totalReconciled} delivery item(s) auto-synced across sessions.`);
 } else if (!silent) {
 triggerToast(`All ${deliveries.length} delivery records are fully reconciled and in sync.`);
 }
 }, [sales, deliveries, createDelivery, updateDeliveryStatus, addAuditLog]);

 // Run reconciliation check on component mount and whenever sales/deliveries count updates
 useEffect(() => {
 runDeliveriesReconciliationCheck(true);
 }, [sales.length, deliveries.length, runDeliveriesReconciliationCheck]);

 // When selected POS sale changes in schedule modal
 const handleSelectPosSale = (saleId: string) => {
   setSelectedPosSaleId(saleId);
   const sale = sales.find((s) => s.id === saleId);
   if (sale) {
     setPosDelivCustomerName(sale.customerName || 'Walk-in Customer');
     setPosDelivNotes(sale.notes || '');
   }
 };

 const handleSchedulePosDeliverySubmit = (e: React.FormEvent) => {
   e.preventDefault();
   const sale = sales.find((s) => s.id === selectedPosSaleId);
   if (!sale) {
     triggerToast('Please select a valid POS transaction order!');
     return;
   }
   if (!posDelivBarangay.trim()) {
     triggerToast('Barangay is strictly required for delivery location!');
     return;
   }
   const dRecord = createDelivery({
     saleId: sale.id,
     saleNumber: sale.saleNumber,
     customerName: posDelivCustomerName.trim() || sale.customerName || 'Walk-in Customer',
     contactNumber: posDelivContact.trim() || 'N/A',
     houseNo: posDelivHouseNo || undefined,
     street: posDelivStreet || undefined,
     barangay: posDelivBarangay.trim(),
     cityMunicipality: posDelivCity.trim() || 'Main City',
     landmark: posDelivLandmark || undefined,
     deliveryDate: posDelivDate,
     deliveryTime: posDelivTime || undefined,
     notes: posDelivNotes || undefined,
     truck: posDelivTruck.trim() || undefined,
     driver: posDelivDriver.trim() || undefined,
     helper: posDelivHelper.trim() || undefined,
   });
   setShowSchedulePosModal(false);
   setSelectedPosSaleId('');
   setPosDelivTruck('');
   setPosDelivDriver('');
   setPosDelivHelper('');
   setSelectedDeliveryId(dRecord.id);
   triggerToast("Successfully scheduled Cargo Delivery " + dRecord.id + " for POS Invoice #" + sale.saleNumber);
 };

 // Pre-filter deliveries based on role and branch selection
 const branchFilteredDeliveries = useMemo(() => {
   return deliveries.filter(d => {
     if (currentUser?.role === UserRole.ADMIN) {
       if (selectedBranchId === 'ALL') return true;
       return d.branchId === selectedBranchId;
     }
     // Non-admins only see deliveries from their designated outlet
     return d.branchId === (currentUser?.branchAssignmentId || '');
   });
 }, [deliveries, currentUser, selectedBranchId]);

  // Multi-column sorting for deliveries
  const {
    sortDescriptors: delivSortDescriptors,
    handleSort: handleDelivSort,
    getSortDirection: getDelivSortDir,
    getSortRank: getDelivSortRank,
    removeSort: removeDelivSort,
    clearSort: clearDelivSort,
    sortData: sortDelivData
  } = useMultiSort<Delivery>({
    customGetters: {
      id: (d) => d.id || '',
      saleNumber: (d) => d.saleNumber || '',
      customerName: (d) => d.customerName || '',
      barangay: (d) => `${d.barangay} ${d.cityMunicipality}`,
      deliveryDate: (d) => (d.deliveryDate ? new Date(d.deliveryDate).getTime() : 0),
      driver: (d) => d.driver || '',
      status: (d) => d.status || '',
    }
  });

  // Apply Status Tabs and Text Search
  const displayDeliveries = useMemo(() => {
    const list = branchFilteredDeliveries.filter(d => {
      // Status filtration
      if (selectedStatusTab !== 'All') {
        if (selectedStatusTab === 'Pending' && !['Pending Scheduling', 'Packed'].includes(d.status)) return false;
        if (selectedStatusTab === 'Scheduled' && d.status !== 'Scheduled') return false;
        if (selectedStatusTab === 'Transit' && d.status !== 'Out For Delivery') return false;
        if (selectedStatusTab === 'Delivered' && d.status !== 'Delivered') return false;
        if (selectedStatusTab === 'Failed' && !['Failed Delivery', 'Cancelled'].includes(d.status)) return false;
      }

      // Search filtration
      const query = searchTerm.toLowerCase().trim();
      if (!query) return true;

      return (
        d.id.toLowerCase().includes(query) ||
        d.saleNumber.toLowerCase().includes(query) ||
        d.customerName.toLowerCase().includes(query) ||
        d.contactNumber.toLowerCase().includes(query) ||
        d.barangay.toLowerCase().includes(query) ||
        d.cityMunicipality.toLowerCase().includes(query) ||
        (d.driver && d.driver.toLowerCase().includes(query)) ||
        (d.truck && d.truck.toLowerCase().includes(query))
      );
    });

    if (delivSortDescriptors.length > 0) {
      return sortDelivData(list);
    }
    return list;
  }, [branchFilteredDeliveries, selectedStatusTab, searchTerm, delivSortDescriptors, sortDelivData]);

 const delivPageSize = useResponsivePageSize(48, 480, 10);
 const DELIV_PER_PAGE = delivPageSize;
 const totalDelivPages = Math.ceil(displayDeliveries.length / DELIV_PER_PAGE) || 1;
 const paginatedDeliveries = useMemo(() => {
 return displayDeliveries.slice((delivPage - 1) * DELIV_PER_PAGE, delivPage * DELIV_PER_PAGE);
 }, [displayDeliveries, delivPage, DELIV_PER_PAGE]);

 // Derived Statistics counts
 const stats = useMemo(() => {
 const counts = {
 total: branchFilteredDeliveries.length,
 pending: branchFilteredDeliveries.filter(d => ['Pending Scheduling', 'Packed'].includes(d.status)).length,
 scheduled: branchFilteredDeliveries.filter(d => d.status === 'Scheduled').length,
 transit: branchFilteredDeliveries.filter(d => d.status === 'Out For Delivery').length,
 completed: branchFilteredDeliveries.filter(d => d.status === 'Delivered').length,
 failed: branchFilteredDeliveries.filter(d => ['Failed Delivery', 'Cancelled'].includes(d.status)).length
 };
 return counts;
 }, [branchFilteredDeliveries]);

 // Active Selected Delivery object
 const activeDelivery = useMemo(() => {
 if (!selectedDeliveryId) return null;
 return deliveries.find(d => d.id === selectedDeliveryId) || null;
 }, [deliveries, selectedDeliveryId]);

 const [showDeliveryReceiptModal, setShowDeliveryReceiptModal] = useState(false);

 const activeDeliverySale = useMemo(() => {
 if (!activeDelivery) return null;
 return sales.find((s) => s.id === activeDelivery.saleId || s.saleNumber === activeDelivery.saleNumber) || null;
 }, [sales, activeDelivery]);

 const activeDeliveryItems = useMemo(() => {
 if (!activeDelivery) return [];
 const matchedSaleId = activeDeliverySale?.id || activeDelivery.saleId;
 return saleItems.filter(
 (item) => item.saleId === matchedSaleId && !item.isDeleted
 );
 }, [saleItems, activeDelivery, activeDeliverySale]);

 const deliveryBranch = useMemo(() => {
 if (!activeDelivery) return branches[0] || null;
 return branches.find((b) => b.id === activeDelivery.branchId) || branches[0] || null;
 }, [branches, activeDelivery]);

 // Lifecycle execution triggers
 const handlePackCargo = (id: string) => {
 updateDeliveryStatus(id, 'Packed', 'Items catalog packaged and prepared at logistics dispatch deck.');
 triggerToast('Cargo status updated to Packed.');
 };

 const handleAssignPersonnelSubmit = (e: React.FormEvent, id: string) => {
 e.preventDefault();
 if (!assignTruck.trim() || !assignDriver.trim()) {
 triggerToast('Truck plate number and Driver pilot are required!');
 return;
 }
 assignDeliveryPersonnel(id, assignTruck.trim(), assignDriver.trim(), assignHelper.trim());
 setShowAssignForm(false);
 setAssignTruck('');
 setAssignDriver('');
 setAssignHelper('');
 triggerToast('Delivery personnel assigned and scheduled.');
 };

 const handleDispatchTransit = (id: string) => {
 updateDeliveryStatus(id, 'Out For Delivery', 'Cargo dispatched out of branch warehouse gate.');
 triggerToast('Truck marked in transit (Out for Delivery!).');
 };

 const handleCompleteSubmit = (e: React.FormEvent, id: string) => {
 e.preventDefault();
 completeDelivery(
 id,
 proofPhotoUrl.trim() || undefined,
 signatureText.trim() || undefined,
 receiverName.trim() || undefined
 );
 setShowCompleteForm(false);
 setReceiverName('');
 setProofPhotoUrl('');
 triggerToast('Shipment completed and archived.');
 };

 const handleFailSubmit = (e: React.FormEvent, id: string) => {
 e.preventDefault();
 if (!failReason.trim()) {
 triggerToast('Fail remarks reason is required!');
 return;
 }
 updateDeliveryStatus(id, 'Failed Delivery', `FAILED REASON: ${failReason.trim()}`);
 setShowFailForm(false);
 setFailReason('');
 triggerToast('Delivery flagged as Failed Shipment.');
 };

  const renderDeliveryReceiptCopy = (copyType: "STORE COPY" | "CUSTOMER COPY") => (
    <div key={copyType} className="border border-divider/40 rounded-lg p-4 bg-white text-black text-xs leading-relaxed space-y-3 shadow-xs">
      {/* DR Header */}
      <div className="text-center pb-2 border-b-2 border-black space-y-1">
        {deliveryBranch?.storeLogo ? (
          <div className="mb-1 flex items-center justify-center h-9">
            <img
              src={deliveryBranch.storeLogo}
              alt="Logo"
              className="h-full object-contain filter grayscale"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
 <h2 className="text-sm font-black tracking-wider uppercase text-black">
            {deliveryBranch?.name || branches[0]?.name || "MAIN STORE"}
          </h2>
        )}
        <p className="text-[9.5px] font-semibold text-default-700">
          {deliveryBranch?.address || branches[0]?.address || "Store Address"}
        </p>
 <p className="text-[8.5px] text-default-600">
          Contact: {deliveryBranch?.phone || "0000"} | TIN: {deliveryBranch?.tin || "000-000-000"}
        </p>
        <div className="flex items-center justify-between pt-1">
 <span className="bg-black text-white px-2.5 py-0.5 rounded font-black text-[10px] uppercase tracking-widest">
            DELIVERY RECEIPT
          </span>
 <span className=" font-black text-[9px] uppercase tracking-wider px-2 py-0.5 bg-gray-200 text-default-800 rounded border border-gray-400">
            [{copyType} - {copyType === "STORE COPY" ? "WAREHOUSE AUDIT FILE" : "CUSTOMER RECIPIENT COPY"}]
          </span>
        </div>
      </div>

      {/* Document & Customer Metadata */}
      <div className="grid grid-cols-2 gap-2 text-[10px] border-b border-dashed border-gray-400 pb-2 font-sans">
        <div>
          <span className="text-[8px] font-black uppercase text-default-500 block">DR Reference No.</span>
 <span className=" font-bold text-xs text-black">DR-{activeDelivery?.saleNumber}</span>
 <span className="text-[8.5px] text-default-500 block mt-0.5">Trace ID: {activeDelivery?.id}</span>
        </div>
        <div className="text-right">
          <span className="text-[8px] font-black uppercase text-default-500 block">Scheduled Date</span>
          <span className="font-bold text-black">{activeDelivery?.deliveryDate || new Date().toLocaleDateString()}</span>
          <span className="text-[8.5px] font-medium text-default-600 block">{activeDelivery?.deliveryTime || "Standard Slot"}</span>
        </div>
      </div>

      {/* Customer & Address */}
      <div className="bg-content1 p-2 rounded border border-divider/30 text-[10px] space-y-1">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[8px] font-extrabold uppercase text-default-500 block">Customer Name</span>
            <span className="font-extrabold text-black uppercase">{activeDelivery?.customerName}</span>
          </div>
          <div>
            <span className="text-[8px] font-extrabold uppercase text-default-500 block">Contact Number</span>
 <span className=" font-bold text-black">{activeDelivery?.contactNumber || "N/A"}</span>
          </div>
        </div>
        {activeDeliverySale?.customerAddress && (
          <div className="pt-1 border-t border-divider/30">
            <span className="text-[8px] font-extrabold uppercase text-default-500 block">Billing / Invoice Address</span>
            <span className="font-semibold text-foreground block truncate">{activeDeliverySale.customerAddress}</span>
          </div>
        )}
        {(activeDeliverySale?.customerTin || activeDeliverySale?.businessStyle) && (
          <div className="pt-1 border-t border-divider/30 grid grid-cols-2 gap-2">
            {activeDeliverySale?.customerTin && (
              <div>
                <span className="text-[8px] font-extrabold uppercase text-default-500 block">Buyer TIN</span>
 <span className=" font-bold text-black">{activeDeliverySale.customerTin}</span>
              </div>
            )}
            {activeDeliverySale?.businessStyle && (
              <div>
                <span className="text-[8px] font-extrabold uppercase text-default-500 block">Business Style</span>
                <span className="font-semibold text-foreground">{activeDeliverySale.businessStyle}</span>
              </div>
            )}
          </div>
        )}
        <div className="pt-1 border-t border-divider/30">
          <span className="text-[8px] font-extrabold uppercase text-default-500 block">Unloading Address</span>
          <span className="font-semibold text-foreground block">
            {[activeDelivery?.houseNo, activeDelivery?.street, activeDelivery?.barangay, activeDelivery?.cityMunicipality].filter(Boolean).join(", ")}
          </span>
          {activeDelivery?.landmark && (
            <span className="text-[8.5px] italic text-default-600 block mt-0.5">
              Landmark: {activeDelivery.landmark}
            </span>
          )}
        </div>
      </div>

      {/* Carrier & Payment Summary */}
 <div className="grid grid-cols-2 gap-2 text-[9px] ">
        <div className="bg-content2 p-1.5 rounded border border-divider/40">
          <span className="text-[7.5px] uppercase text-default-500 font-bold block">Logistics Personnel</span>
          <span className="font-extrabold text-black block">Truck: {activeDelivery?.truck || "Unassigned"}</span>
          <span className="text-default-700 block">Driver: {activeDelivery?.driver || "Unassigned"}</span>
          <span className="text-default-600 block">Helpers: {activeDelivery?.helper || "N/A"}</span>
        </div>

        {activeDeliverySale && (() => {
          const grandTotal = Number(activeDeliverySale.grandTotal || 0);
          const amountTendered = Number(activeDeliverySale.amountTendered || grandTotal);
          const changeAmount = Number(activeDeliverySale.changeAmount || (amountTendered > grandTotal ? amountTendered - grandTotal : 0));
          return (
            <div className="bg-emerald-50/90 p-1.5 rounded border border-emerald-300">
              <span className="text-[7.5px] uppercase text-emerald-800 font-extrabold block">Bill & Payment Summary</span>
              <div className="flex justify-between text-default-800">
                <span>Bill Total:</span>
                <span className="font-bold">{formatCurrency(grandTotal)}</span>
              </div>
              <div className="flex justify-between text-default-800">
                <span>Paid ({activeDeliverySale.paymentMethod || "Cash"}):</span>
                <span className="font-bold">{formatCurrency(amountTendered)}</span>
              </div>
              <div className="flex justify-between text-emerald-800 font-extrabold pt-0.5 border-t border-emerald-300">
                <span>Change Due:</span>
                <span>{formatCurrency(changeAmount)}</span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Items Table */}
      <div className="space-y-1">
        <div className="text-[8.5px] font-black uppercase tracking-wider text-default-700 flex justify-between border-b-2 border-black pb-0.5">
          <span>Items to be Delivered</span>
          <span>Verification Checklist</span>
        </div>

        <table className="w-full text-left text-[9.5px] border-collapse">
          <thead>
            <tr className="border-b border-divider/40 text-[8px] uppercase text-default-600 font-extrabold">
              <th className="py-0.5 pr-1">#</th>
              <th className="py-0.5">Description / Product</th>
              <th className="py-0.5 text-right">Qty</th>
              <th className="py-0.5 text-center pr-1 pl-2">Chk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 font-sans">
            {activeDeliveryItems.length > 0 ? (
              activeDeliveryItems.map((item, idx) => (
                <tr key={item.id || idx}>
 <td className="py-1 text-default-500 pr-1">{idx + 1}</td>
                  <td className="py-1 font-bold text-black">{item.productName}</td>
 <td className="py-1 text-right font-extrabold text-black">
                    {item.quantity} pcs
                  </td>
                  <td className="py-1 text-center pl-2">
                    <span className="inline-block h-3 w-3 border border-black rounded-xs"></span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-1.5 text-center text-default-500 italic text-[9px]">
                  Store Order Ref: {activeDelivery?.saleNumber} (Full Order Scheduled)
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cargo Handling Notes */}
      {activeDelivery?.notes && (
        <div className="text-[9px] border-t border-divider/40 pt-1 text-default-700">
          <strong className="uppercase text-[8px] text-default-600 block">Handling Notes:</strong>
          <p className="italic leading-snug">{activeDelivery.notes}</p>
        </div>
      )}

      {/* Branch Policies */}
      {(deliveryBranch?.receiptReturnPolicy || deliveryBranch?.receiptNonReturnablePolicy) && (
        <div className="text-center text-[7.5px] border-t border-dashed border-divider/40 pt-1.5 space-y-0.5 font-sans text-default-600">
          {deliveryBranch.receiptReturnPolicy && (
            <div>
              <span className="font-extrabold uppercase text-black text-[7px] block">Return & Exchange Policy:</span>
              <span>{deliveryBranch.receiptReturnPolicy}</span>
            </div>
          )}
          {deliveryBranch.receiptNonReturnablePolicy && (
            <div className="italic text-default-500">
              <span className="font-extrabold not-italic text-default-700 text-[7px] uppercase block">Notice:</span>
              <span>{deliveryBranch.receiptNonReturnablePolicy}</span>
            </div>
          )}
        </div>
      )}

      {/* Receiver Confirmation & Signature Section */}
      <div className="border-t-2 border-black pt-2 mt-2 space-y-2">
        <div className="bg-content2 p-1.5 rounded border border-divider/40 text-[8px] font-bold text-center text-default-800 leading-tight">
          DELIVERY CONFIRMATION: I hereby acknowledge receipt of the merchandise listed above in complete quantity, correct specifications, and good order & condition. Delivery Confirmed & Successful.
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-[8px] font-sans pt-1">
          <div className="space-y-4">
            <div className="border-b border-black h-5"></div>
            <span className="font-extrabold uppercase text-default-800 block">Released By (Warehouse)</span>
          </div>
          <div className="space-y-4">
            <div className="border-b border-black h-5"></div>
            <span className="font-extrabold uppercase text-default-800 block">Delivered By (Driver)</span>
          </div>
          <div className="space-y-1">
            <div className="border-b border-black h-5"></div>
            <span className="font-extrabold uppercase text-black block">Received By (Signature)</span>
 <span className="text-[7.5px] text-default-600 block ">Printed Name: _________________</span>
 <span className="text-[7.5px] text-default-600 block ">Date & Time: __________________</span>
 <span className="text-[7.5px] text-default-600 block ">ID / Relation: _________________</span>
          </div>
        </div>
      </div>

      <div className="text-center text-[7px] text-default-500 pt-1 border-t border-dashed border-divider">
        Official Delivery Receipt Docket • TilePoint Enterprise ERP System • [{copyType}]
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 text-left h-full overflow-y-auto">
      {/* HEADER SECTION */}
      <HeaderBar
        title="Cargo Deliveries & Freight Scheduling"
        subtitle="Dispatch, route, track, and log customer bulk shipments on tile transport trucks."
        icon={Truck}
        badge={{ text: `${deliveries.length} Shipments`, variant: 'primary' }}
        actions={
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <HeroButton
              onClick={() => runDeliveriesReconciliationCheck(false)}
              color="default"
              variant="bordered"
              size="md"
              startContent={<RefreshCw className="h-3.5 w-3.5 text-primary animate-spin-slow" />}
            >
              Reconcile & Sync
            </HeroButton>

            <HeroButton
              onClick={() => setShowSchedulePosModal(true)}
              color="primary"
              variant="solid"
              size="md"
              startContent={<Plus className="h-4 w-4" />}
            >
              Schedule Delivery
            </HeroButton>

            {currentUser?.role === UserRole.ADMIN && (
              <div className="flex items-center gap-2 shrink-0">
                <HeroDropdownSelect
                  startIcon={<span className="text-[10px] font-black uppercase text-primary tracking-widest">Scope:</span>}
                  items={[
                    { key: 'ALL', label: 'ALL OUTLETS' },
                    ...branches.map((b) => ({
                      key: b.id,
                      label: b.name.toUpperCase(),
                    })),
                  ]}
                  selectedKey={selectedBranchId ?? 'ALL'}
                  onSelectionChange={(val) => setSelectedBranchId(val)}
                  size="sm"
                  variant="pill"
                  className="min-w-[160px]"
                />
              </div>
            )}
          </div>
        }
      />

 {/* TOAST PANEL BAR */}
 <ToastNotification
 message={toastMessage}
 onClose={() => setToastMessage(null)}
 />

 {/* RECONCILIATION AUDIT STATUS CARD */}
 {reconciliationStats && (
 <div className="bg-content1 border border-divider/30 rounded-2xl p-3 px-4 text-xs shadow-xs flex flex-wrap items-center justify-between gap-3 font-sans">
 <div className="flex items-center gap-2.5">
 <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
 <div>
 <span className="font-extrabold text-foreground uppercase tracking-wide">
 Delivery Reconciliation & Multi-Session Sync Active
 </span>
 <span className="text-[11px] text-default-500 font-medium block">
 Mount & session audit checked at <strong className="">{lastReconciledAt || 'Just now'}</strong>. Scheduled & in-transit delivery states fully synced.
 </span>
 </div>
 </div>
 <div className="flex flex-wrap items-center gap-2 text-[10px] font-extrabold uppercase bg-background border border-divider/40 px-3 py-1.5 rounded-xl">
 <span className="text-amber-500">Pending: {reconciliationStats.pending}</span>
 <span className="text-primary">Scheduled: {reconciliationStats.scheduled}</span>
 <span className="text-secondary">In-Transit: {reconciliationStats.transit}</span>
 <span className="text-emerald-500">Delivered: {reconciliationStats.delivered}</span>
 {reconciliationStats.reconciledCount > 0 && (
 <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-md font-sans">
 {reconciliationStats.reconciledCount} Auto-Reconciled
 </span>
 )}
 </div>
 </div>
 )}

 {/* METRIC CARD BENTO STATS */}
 <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
 
 <div className="p-4 rounded-2xl border border-divider/30 bg-content1 flex flex-col justify-between">
 <span className="text-[9px] font-black uppercase tracking-widest text-default-500">Gross Deliveries</span>
 <div className="flex items-baseline gap-2 mt-2">
 <span className="text-2xl font-black">{stats.total}</span>
 <span className="text-[10px] text-default-500 font-bold">Invoices</span>
 </div>
 </div>

 <div className="p-4 rounded-2xl border border-divider/30 bg-amber-500/5 flex flex-col justify-between">
 <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">Pending Dispatch</span>
 <div className="flex items-baseline gap-2 mt-2">
 <span className="text-2xl font-black text-amber-400">{stats.pending}</span>
 <span className="text-[10px] text-amber-600 font-bold uppercase ">Unpacked</span>
 </div>
 </div>

 <div className="p-4 rounded-2xl border border-divider/30 bg-primary/5 flex flex-col justify-between">
 <span className="text-[9px] font-black uppercase tracking-widest text-primary">Scheduled</span>
 <div className="flex items-baseline gap-2 mt-2">
 <span className="text-2xl font-black text-primary">{stats.scheduled}</span>
 <span className="text-[10px] text-primary font-bold uppercase ">Ready</span>
 </div>
 </div>

 <div className="p-4 rounded-2xl border border-divider/30 bg-secondary/5 flex flex-col justify-between">
 <span className="text-[9px] font-black uppercase tracking-widest text-secondary">Active Trucks</span>
 <div className="flex items-baseline gap-2 mt-2">
 <span className="text-2xl font-black text-secondary">{stats.transit}</span>
 <span className="text-[10px] text-secondary font-bold uppercase ">In Transit</span>
 </div>
 </div>

 <div className="col-span-2 md:col-span-1 p-4 rounded-2xl border border-divider/30 bg-emerald-500/5 flex flex-col justify-between">
 <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Completed Gate Pass</span>
 <div className="flex items-baseline gap-2 mt-2">
 <span className="text-2xl font-black text-emerald-400">{stats.completed}</span>
 <span className="text-[10px] text-emerald-600 font-bold uppercase ">Delivered</span>
 </div>
 </div>

 </div>

 {/* FILTER BUTTON TABS & SEARCH CONTAINER */}
 <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-content1 border border-divider/20 p-3.5 rounded-2xl shadow-sm">
 
 {/* Status Tab buttons */}
 <div className="flex flex-wrap gap-1.5 self-start w-full md:w-auto">
 {[
 { tag: 'All', count: stats.total, label: 'All cargo' },
 { tag: 'Pending', count: stats.pending, label: 'Unscheduled' },
 { tag: 'Scheduled', count: stats.scheduled, label: 'Scheduled' },
 { tag: 'Transit', count: stats.transit, label: 'In Transit' },
 { tag: 'Delivered', count: stats.completed, label: 'Delivered' },
 { tag: 'Failed', count: stats.failed, label: 'Failed/Cancel' }
 ].map(tab => (
 <button
 key={tab.tag}
 onClick={() => setSelectedStatusTab(tab.tag)}
 className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wide cursor-pointer transition-all flex items-center gap-1.5 ${
 selectedStatusTab === tab.tag
 ? 'bg-primary text-primary-foreground shadow-sm font-black'
 : 'bg-content1 hover:bg-default-100 text-default-500'
 }`}
 >
 <span>{tab.label}</span>
 <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
 selectedStatusTab === tab.tag ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-default-100 text-foreground'
 }`}>{tab.count}</span>
 </button>
 ))}
 </div>

 {/* Textual Search bar */}
 <div className="relative w-full md:w-80">
 <input
 type="text"
 value={searchTerm ?? ''}
 onChange={e => setSearchTerm(e.target.value)}
 placeholder="Search ref #, client, address, pilot..."
 className="w-full bg-content1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary border border-divider/30 pl-8 pr-4 py-2 rounded-xl placeholder:text-default-500 font-bold"
 />
 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-default-500" />
 {searchTerm && (
 <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2 hover:text-rose-500 p-0.5 text-default-500 font-bold active:scale-[0.98]"></button>
 )}
 </div>
 </div>

 {/* CORE CONTAINER: TABLE WITH DRILL-DOWN PREVIEWS */}
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
 
      {/* LEFT COMPONENT: MASTER TABULAR LIST */}
      <div className={`col-span-1 lg:col-span-8 space-y-4`}>
        {/* Multi-Sort Active Badge Bar */}
        <MultiSortBadgeBar
          sortDescriptors={delivSortDescriptors}
          onRemoveSort={removeDelivSort}
          onClearSort={clearDelivSort}
          columnLabels={{
            id: 'Reference Ref',
            customerName: 'Invoice / Buyer',
            barangay: 'Destination Barangay',
            deliveryDate: 'Cargo Date',
            driver: 'Personnel',
            status: 'Fulfill Status',
          }}
        />

        <div className="border border-divider/30 rounded-2xl bg-content1 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <HeroTable isStriped className="min-w-full text-xs divide-y divide-divider/15">
              <HeroTable.Header>
                <tr className="bg-content1 text-[10px] font-black uppercase text-default-500 tracking-wider select-none">
                  <HeroTable.Column
                    allowsSorting
                    sortDirection={getDelivSortDir('id')}
                    sortRank={getDelivSortRank('id')}
                    onSort={(e) => handleDelivSort('id', e)}
                    className="py-3 px-4"
                  >
                    Reference Ref
                  </HeroTable.Column>
                  <HeroTable.Column
                    allowsSorting
                    sortDirection={getDelivSortDir('customerName')}
                    sortRank={getDelivSortRank('customerName')}
                    onSort={(e) => handleDelivSort('customerName', e)}
                    className="py-3 px-4"
                  >
                    Invoice / Buyer
                  </HeroTable.Column>
                  <HeroTable.Column
                    allowsSorting
                    sortDirection={getDelivSortDir('barangay')}
                    sortRank={getDelivSortRank('barangay')}
                    onSort={(e) => handleDelivSort('barangay', e)}
                    className="py-3 px-4"
                  >
                    Destination Barangay
                  </HeroTable.Column>
                  <HeroTable.Column
                    allowsSorting
                    sortDirection={getDelivSortDir('deliveryDate')}
                    sortRank={getDelivSortRank('deliveryDate')}
                    onSort={(e) => handleDelivSort('deliveryDate', e)}
                    className="py-3 px-4"
                  >
                    Cargo Date
                  </HeroTable.Column>
                  <HeroTable.Column
                    allowsSorting
                    sortDirection={getDelivSortDir('driver')}
                    sortRank={getDelivSortRank('driver')}
                    onSort={(e) => handleDelivSort('driver', e)}
                    className="py-3 px-4"
                  >
                    Personnel
                  </HeroTable.Column>
                  <HeroTable.Column
                    align="center"
                    allowsSorting
                    sortDirection={getDelivSortDir('status')}
                    sortRank={getDelivSortRank('status')}
                    onSort={(e) => handleDelivSort('status', e)}
                    className="py-3 px-4 text-center"
                  >
                    Fulfill Status
                  </HeroTable.Column>
                  <HeroTable.Column align="center" className="py-3 px-4 text-center">Receipt</HeroTable.Column>
                </tr>
              </HeroTable.Header>

              <HeroTable.Body>
 {paginatedDeliveries.map(d => {
 const isSelected = selectedDeliveryId === d.id;
 return (
 <tr
 key={d.id}
 onClick={() => {
 setSelectedDeliveryId(isSelected ? null : d.id);
 setShowAssignForm(false);
 setShowCompleteForm(false);
 setShowFailForm(false);
 }}
 className={`hover:bg-default-100 cursor-pointer transition-colors ${
 isSelected ? 'bg-primary/10 hover:bg-primary/15' : ''
 }`}
 >
 {/* ID */}
 <td className="py-3.5 px-4 font-bold text-primary select-all text-[11px]">
 {d.id.substring(4, 12)}...
 </td>

 {/* Invoice & Buyer */}
 <td className="py-3.5 px-4">
 <div className="font-extrabold text-foreground leading-tight">{d.customerName}</div>
 <div className="text-[10px] text-default-500 mt-0.5">Ref: {d.saleNumber}</div>
 </td>

 {/* Location */}
 <td className="py-3.5 px-4">
 <div className="font-bold">{d.barangay}</div>
 <div className="text-[10px] text-default-500 leading-none">{d.cityMunicipality}</div>
 </td>

 {/* Unloading target Date */}
 <td className="py-3.5 px-4 font-medium text-foreground">
 <div>{d.deliveryDate && !isNaN(new Date(d.deliveryDate).getTime()) ? new Date(d.deliveryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'N/A'}</div>
 {d.deliveryTime && <div className="text-[9px] text-default-500 font-medium mt-0.5">{d.deliveryTime}</div>}
 </td>

 {/* Assign cargo carrier */}
 <td className="py-3.5 px-4 font-semibold text-[11px] ">
 {d.driver ? (
 <div>
 <span className="text-primary font-bold">{d.truck}</span>
 <span className="text-default-500 block text-[9.5px]">Driver: {d.driver}</span>
 </div>
 ) : (
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 setSelectedDeliveryId(d.id);
 setShowAssignForm(true);
 setAssignTruck(d.truck || '');
 setAssignDriver(d.driver || '');
 setAssignHelper(d.helper || '');
 }}
 className="px-2.5 py-1 rounded-xl bg-primary/10 border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground text-[10px] font-black uppercase tracking-wide transition-all cursor-pointer flex items-center gap-1 shadow-xs active:scale-95"
 title="Click to assign Truck Plate & Driver Pilot"
 >
 <Truck className="h-3 w-3" />
 <span>Schedule Truck</span>
 </button>
 )}
 </td>

 {/* Fulfill Badge wrapper */}
 <td className="py-3.5 px-4 text-center">
 <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wide border inline-block ${
 d.status === 'Delivered'
 ? 'bg-emerald-550/10 border-emerald-500/20 text-emerald-400'
 : d.status === 'Out For Delivery'
 ? 'bg-purple-550/10 border-purple-500/20 text-purple-400'
 : d.status === 'Scheduled'
 ? 'bg-primary/10 border-primary/20 text-primary'
 : d.status === 'Packed'
 ? 'text-secondary bg-secondary/10 border-secondary/20'
 : d.status === 'Failed Delivery' || d.status === 'Cancelled'
 ? 'bg-rose-550/10 border-rose-500/20 text-rose-400'
 : 'bg-zinc-550/10 border-divider/20 text-default-500'
 }`}>
 {d.status === 'Out For Delivery' ? 'IN TRANSIT' : d.status}
 </span>
 </td>

 <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
 <button
 type="button"
 onClick={() => {
 setSelectedDeliveryId(d.id);
 setShowDeliveryReceiptModal(true);
 }}
 title="Print Delivery Receipt"
 className="p-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-colors cursor-pointer inline-flex items-center gap-1 text-[10px] font-bold border border-primary/20 active:scale-95"
 >
 <Printer className="h-3.5 w-3.5" />
 <span className="hidden sm:inline uppercase">DR</span>
 </button>
 </td>
 </tr>
                  );
                })}

                {displayDeliveries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-default-500 font-bold ">
                      No scheduled customer deliveries found matching current filter scope.
                    </td>
                  </tr>
                )}
              </HeroTable.Body>
            </HeroTable>
          </div>

 {/* Pagination Controls bar */}
 <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-content1 border-t border-divider/15 text-xs font-sans">
 <span className="font-semibold text-default-500 ">
 Showing {Math.min(displayDeliveries.length, (delivPage - 1) * DELIV_PER_PAGE + 1)}-{Math.min(displayDeliveries.length, delivPage * DELIV_PER_PAGE)} of {displayDeliveries.length} items
 </span>
 <div className="flex items-center gap-1.5 select-none font-sans">
 <button
 type="button"
 disabled={delivPage === 1}
 onClick={() => setDelivPage(prev => Math.max(1, prev - 1))}
 className="px-3 py-1.5 rounded-lg border border-divider/60 hover:border-primary hover:bg-primary/10 text-primary disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer font-bold uppercase text-[9.5px] active:scale-[0.98]"
 >
 Prev
 </button>
 {Array.from({ length: totalDelivPages }).map((_, i) => {
 const pNum = i + 1;
 if (totalDelivPages > 5 && Math.abs(pNum - delivPage) > 2 && pNum !== 1 && pNum !== totalDelivPages) {
 if (pNum === 2 || pNum === totalDelivPages - 1) {
 return <span key={pNum} className="px-1 text-default-500">...</span>;
 }
 return null;
 }
 return (
 <button
 key={pNum}
 type="button"
 onClick={() => setDelivPage(pNum)}
 className={`h-7 w-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
 delivPage === pNum
 ? 'bg-primary text-primary-foreground shadow-md'
 : 'border border-divider/20 hover:bg-primary/10 text-default-700'
 }`}
 >
 {pNum}
 </button>
 );
 })}
 <button
 type="button"
 disabled={delivPage === totalDelivPages}
 onClick={() => setDelivPage(prev => Math.min(totalDelivPages, prev + 1))}
 className="px-3 py-1.5 rounded-lg border border-divider/60 hover:border-primary hover:bg-primary/10 text-primary disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer font-bold uppercase text-[9.5px] active:scale-[0.98]"
 >
 Next
 </button>
 </div>
 </div>

 {/* Footer page notes count */}
 <div className="bg-content1 border-t border-divider/15 px-4 py-2 text-[10px] text-default-500 font-bold select-none ">
 TOTAL RECORD ENTRIES: {displayDeliveries.length} OF {deliveries.length} SYSTEM CARGOES
 </div>
 </div>
 </div>

 {/* RIGHT COMPONENT: DRILL-DOWN DETAIL WORKSPACE */}
 <div className="col-span-1 lg:col-span-4">
 
 {activeDelivery ? (
 <div className="border border-divider/35 rounded-2xl bg-content1 p-5 space-y-4 shadow-sm relative">
 
 {/* Close Detail Button */}
 <button
 onClick={() => setSelectedDeliveryId(null)}
 className="absolute right-3.5 top-3.5 text-default-500 hover:text-foreground p-1 rounded-full bg-content1/70 border border-divider/20 hover:border-divider/50 transition-all cursor-pointer active:scale-95"
 >
 <X className="h-4.5 w-4.5" />
 </button>

 {/* Title Section */}
 <div className="space-y-1 text-left border-b border-divider/15 pb-3">
 <span className="text-[9px] font-black tracking-widest text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-md inline-block">
 Shipment Document Detail
 </span>
 <h3 className="text-sm font-black text-foreground mt-1 uppercase truncate pr-8">
 {activeDelivery.customerName}
 </h3>
 <p className="text-[10px] text-default-500 leading-relaxed font-bold">
 UID Trace: {activeDelivery.id}
 </p>
 </div>

 {/* Print Delivery Receipt Action Button */}
 <button
 type="button"
 onClick={() => setShowDeliveryReceiptModal(true)}
 className="w-full py-2 px-3 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all uppercase tracking-wider active:scale-[0.98]"
 >
 <Printer className="h-4 w-4" />
 <span>Print Delivery Receipt (DR)</span>
 </button>

 {/* Physical Location details card */}
 <div className="space-y-2 text-left bg-content1 p-3 rounded-2xl border border-divider/15 text-[11px] leading-relaxed">
 <div className="flex items-start gap-2 text-foreground">
 <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
 <div>
 <h4 className="font-extrabold uppercase tracking-wide text-[9.5px] text-primary leading-none mb-1">Unloading Destination Address</h4>
 <span className="font-extrabold block">
 {activeDelivery.houseNo ? `${activeDelivery.houseNo}, ` : ''}
 {activeDelivery.street ? `${activeDelivery.street}, ` : ''}
 {activeDelivery.barangay}
 </span>
 <span className="font-bold text-default-500">{activeDelivery.cityMunicipality}</span>
 </div>
 </div>

 {activeDelivery.landmark && (
 <div className="pl-6 border-t border-dashed border-divider/10 pt-1.5 mt-1.5">
 <span className="text-[9px] font-black text-primary uppercase tracking-wider block">Landmark directions</span>
 <span className="text-default-500 font-medium italic">{activeDelivery.landmark}</span>
 </div>
 )}
 </div>

 {/* Logistics Metadata */}
 <div className="grid grid-cols-2 gap-2 text-xs text-left">
 
 <div className="bg-content1 p-2.5 rounded-xl border border-divider/10 space-y-0.5">
 <span className="text-[9px] font-black text-default-500 uppercase tracking-wider block">Receiver Contact</span>
 <span className=" text-xs font-black text-foreground">{activeDelivery.contactNumber}</span>
 </div>

 <div className="bg-content1 p-2.5 rounded-xl border border-divider/10 space-y-0.5">
 <span className="text-[9px] font-black text-default-500 uppercase tracking-wider block">ERP OS Receipt</span>
 <span className=" text-xs font-black text-primary select-all">{activeDelivery.saleNumber}</span>
 </div>

 <div className="bg-content1 p-2.5 rounded-xl border border-divider/10 space-y-0.5">
 <span className="text-[9px] font-black text-default-500 uppercase tracking-wider block">Target Unload Date</span>
 <span className="text-xs font-black text-foreground flex items-center gap-1">
 <Calendar className="h-3 w-3 inline text-primary" />
 {activeDelivery.deliveryDate && !isNaN(new Date(activeDelivery.deliveryDate).getTime()) ? new Date(activeDelivery.deliveryDate).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : 'N/A'}
 </span>
 </div>

 <div className="bg-content1 p-2.5 rounded-xl border border-divider/10 space-y-0.5">
 <span className="text-[9px] font-black text-default-500 uppercase tracking-wider block">Time Slot</span>
 <span className="text-[10px] font-bold text-foreground flex items-center gap-1 select-none pr-1 truncate">
 <Clock className="h-3 w-3 text-primary" />
 {activeDelivery.deliveryTime || 'Unassigned'}
 </span>
 </div>

 </div>

 {/* Order Payment & Customer Change Details */}
 {activeDeliverySale && (() => {
 const grandTotal = Number(activeDeliverySale.grandTotal || 0);
 const amountTendered = Number(activeDeliverySale.amountTendered || grandTotal);
 const changeAmount = Number(activeDeliverySale.changeAmount || (amountTendered > grandTotal ? amountTendered - grandTotal : 0));
 return (
 <div className="bg-content1 p-3 rounded-2xl border border-divider/15 text-[11px] leading-relaxed text-left space-y-1 ">
 <div className="flex justify-between items-center text-default-500 font-medium text-[10px]">
 <span>Bill Total: <strong className="text-foreground">{formatCurrency(grandTotal)}</strong></span>
 <span>Paid ({activeDeliverySale.paymentMethod || "Cash"}): <strong className="text-foreground">{formatCurrency(amountTendered)}</strong></span>
 </div>
 {(changeAmount > 0 || amountTendered > grandTotal) && (
 <div className="flex justify-between items-center pt-1.5 border-t border-dashed border-divider/15 font-black text-emerald-400 text-xs">
 <span className="uppercase text-[9.5px] font-sans tracking-wider">Customer Change:</span>
 <span className="text-sm font-black text-emerald-300">{formatCurrency(changeAmount)}</span>
 </div>
 )}
 </div>
 );
 })()}

 {/* Cargo Assignee Information details */}
 <div className="bg-content1 p-3 rounded-2xl border border-divider/15 text-[11px] leading-relaxed text-left">
 <h4 className="font-extrabold uppercase tracking-wide text-[9.5px] text-primary flex items-center gap-1 mb-1 border-b border-divider/10 pb-1">
 <Truck className="h-3.5 w-3.5" />
 <span>Freight Transport Assignment</span>
 </h4>
 {activeDelivery.driver ? (
 <div className="grid grid-cols-2 gap-y-1.5 pt-1 font-semibold text-foreground">
 <div>
 <span className="text-[9px] text-default-500 uppercase block">Plate Number</span>
 <span className=" font-black text-primary text-xs uppercase">{activeDelivery.truck}</span>
 </div>

 <div>
 <span className="text-[9px] text-default-500 uppercase block">Pilot Driver</span>
 <span className="text-xs font-black">{activeDelivery.driver}</span>
 </div>

 {activeDelivery.helper && (
 <div className="col-span-2">
 <span className="text-[9px] text-default-500 uppercase block">Unloading Helpers</span>
 <span className="text-xs font-bold block">{activeDelivery.helper}</span>
 </div>
 )}
 </div>
 ) : (
 <div className="py-2 text-center text-[10px] text-default-500 font-extrabold italic select-none">
 No driver pilot or freight carrier plate assigned yet.
 </div>
 )}
 </div>

 {/* Special instructions notes */}
 {activeDelivery.notes && (
 <div className="bg-content1 p-3 rounded-xl border border-divider/10 text-left text-[11px] space-y-0.5">
 <span className="text-[9px] font-black text-primary uppercase block">Cargo & Handler Memo</span>
 <p className="text-default-500 font-medium select-all leading-normal">{activeDelivery.notes}</p>
 </div>
 )}

 {/* COMPLETION METADATA STAMP SIGNATURE */}
 {activeDelivery.status === 'Delivered' && (
 <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl text-left text-[11px] space-y-1 leading-normal text-emerald-400">
 <h4 className="font-extrabold uppercase text-[9.5px] flex items-center gap-1 leading-none border-b border-emerald-500/15 pb-1">
 <CheckCircle className="h-3.5 w-3.5" />
 <span>Receipt Confirmation Stamp</span>
 </h4>
 {activeDelivery.receiverName && (
 <div><strong>Received By:</strong> {activeDelivery.receiverName}</div>
 )}
 {activeDelivery.customerSignature && (
 <div className="flex items-center gap-1 font-bold text-[10px] leading-none text-emerald-400/80 italic mt-1.5 border border-dashed border-emerald-500/20 p-1.5 rounded-md">
 <Signature className="h-3.5 w-3.5 shrink-0" />
 <span>Signature hash: "{activeDelivery.customerSignature}"</span>
 </div>
 )}
 {activeDelivery.deliveredAt && (
 <div className="text-[8.5px] text-emerald-400/60 mt-1 font-semibold uppercase">
 Released By: {activeDelivery.deliveredBy} • Date: {new Date(activeDelivery.deliveredAt).toLocaleString()}
 </div>
 )}
 </div>
 )}

 {/* ACTIVE LIFECYCLE ACTION CONTROL PANEL FOR CASHIERS & WAREHOUSE MANAGERS */}
 {activeDelivery.status !== 'Delivered' && activeDelivery.status !== 'Cancelled' && (
 <div className="border-t border-divider/15 pt-4 space-y-2 mt-2">
 <span className="text-[9px] font-black text-primary uppercase tracking-widest block text-left">
 Workflow Actions
 </span>

 {/* Actions buttons */}
 <div className="flex flex-col gap-2">
 
 {/* Step 1: Pack Cargo */}
 {activeDelivery.status === 'Pending Scheduling' && (
 <button
 onClick={() => handlePackCargo(activeDelivery.id)}
 className="w-full py-2 bg-gradient-to-r from-secondary/90 to-secondary hover:from-secondary hover:to-secondary/90 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-sm transition-all flex items-center justify-center gap-1 active:scale-95"
 >
 <Package className="h-4 w-4" />
 <span>Allocate & Mark Packed</span>
 </button>
 )}

 {/* Step 2: Assign Personnel / Schedule */}
 {(activeDelivery.status === 'Pending Scheduling' || activeDelivery.status === 'Packed' || activeDelivery.status === 'Scheduled') && !showAssignForm && (
 <button
 onClick={() => {
 setShowAssignForm(true);
 setShowCompleteForm(false);
 setShowFailForm(false);
 setAssignTruck(activeDelivery.truck || '');
 setAssignDriver(activeDelivery.driver || '');
 setAssignHelper(activeDelivery.helper || '');
 }}
 className="w-full py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
 >
 <Truck className="h-4 w-4" />
 <span>{activeDelivery.driver ? 'Update Carrier Pilot' : 'Schedule Truck & Driver'}</span>
 </button>
 )}

 {/* Quick dispatcher assignment form */}
 {showAssignForm && (
 <form
 onSubmit={(e) => handleAssignPersonnelSubmit(e, activeDelivery.id)}
 className="bg-content1 p-4 rounded-2xl border border-primary/20 space-y-3 shadow-inner text-left text-xs"
 >
 <div className="flex justify-between items-center pb-1 border-b border-divider/10">
 <span className="text-[9.5px] font-black text-primary uppercase tracking-wider flex items-center gap-1 leading-none">
 <Clock className="h-3.5 w-3.5" /> Setup Courier Assignment
 </span>
 <button type="button" onClick={() => setShowAssignForm(false)} className="text-default-500 font-bold select-none p-0.5"></button>
 </div>
 
 <div className="space-y-1.5 pr-0 pl-0">
 <label className="text-[9.5px] font-black text-default-500 uppercase tracking-wider block">Truck Plate Number *</label>
 <input
 type="text"
 required
 placeholder="Truck plate / Model"
 value={assignTruck ?? ''}
 onChange={(e) => setAssignTruck(e.target.value)}
 className="w-full bg-background border border-divider/50 px-2.5 py-1.5 rounded-lg text-xs leading-none text-foreground focus:outline-none focus:border-primary uppercase"
 />
 </div>

 <div className="space-y-1.5 pr-0 pl-0">
 <label className="text-[9.5px] font-black text-default-500 uppercase tracking-wider block">Driver Pilot *</label>
 <input
 type="text"
 required
 placeholder="Driver name"
 value={assignDriver ?? ''}
 onChange={(e) => setAssignDriver(e.target.value)}
 className="w-full bg-background border border-divider/50 px-2.5 py-1.5 rounded-lg text-xs leading-none text-foreground focus:outline-none focus:border-primary font-bold"
 />
 </div>

 <div className="space-y-1.5 pr-0 pl-0">
 <label className="text-[9.5px] font-black text-default-500 uppercase tracking-wider block">Helper Assistant (Optional)</label>
 <input
 type="text"
 placeholder="Helper name"
 value={assignHelper ?? ''}
 onChange={(e) => setAssignHelper(e.target.value)}
 className="w-full bg-background border border-divider/50 px-2.5 py-1.5 rounded-lg text-xs leading-none text-foreground focus:outline-none focus:border-primary"
 />
 </div>

 <div className="flex gap-2 justify-end pt-1">
 <button
 type="button"
 onClick={() => setShowAssignForm(false)}
 className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-default-500 hover:bg-default-500/10 cursor-pointer active:scale-[0.98]"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide cursor-pointer flex items-center gap-1.5"
 >
 <UserCheck className="h-3.5 w-3.5" /> Let's Schedule
 </button>
 </div>
 </form>
 )}

 {/* Step 3: Dispatch out for delivery */}
 {activeDelivery.status === 'Scheduled' && (
 <button
 onClick={() => handleDispatchTransit(activeDelivery.id)}
 className="w-full py-2 bg-gradient-to-r from-purple-650 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-sm transition-all flex items-center justify-center gap-1 active:scale-95"
 >
 <Navigation className="h-4 w-4 animate-bounce" />
 <span>Dispatch (Out for Delivery)</span>
 </button>
 )}

 {/* Step 4: Complete Delivery Form */}
 {activeDelivery.status === 'Out For Delivery' && !showCompleteForm && (
 <button
 onClick={() => {
 setShowCompleteForm(true);
 setShowAssignForm(false);
 setShowFailForm(false);
 setReceiverName(activeDelivery.customerName);
 setSignatureText(`ACK-${Date.now().toString().slice(-6)}`);
 }}
 className="w-full py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
 >
 <CheckCircle className="h-4 w-4" />
 <span>Log Delivered Success</span>
 </button>
 )}

 {showCompleteForm && (
 <form
 onSubmit={(e) => handleCompleteSubmit(e, activeDelivery.id)}
 className="bg-content1 p-4 rounded-2xl border border-primary/20 space-y-3 shadow-inner text-left text-xs"
 >
 <div className="flex justify-between items-center pb-1 border-b border-divider/10">
 <span className="text-[9.5px] font-black text-primary uppercase tracking-wider flex items-center gap-1 leading-none">
 <FileSignature className="h-3.5 w-3.5" /> Sign-off Delivery Docket
 </span>
 <button type="button" onClick={() => setShowCompleteForm(false)} className="text-default-500 font-bold select-none p-0.5"></button>
 </div>

 <div className="space-y-1.5 pr-0 pl-0">
 <label className="text-[9.5px] font-black text-default-500 uppercase tracking-wider block">Receiver Person Name</label>
 <input
 type="text"
 placeholder="Receiver name"
 value={receiverName ?? ''}
 onChange={(e) => setReceiverName(e.target.value)}
 className="w-full bg-background border border-divider/50 px-2.5 py-1.5 rounded-lg text-xs leading-none text-foreground focus:outline-none focus:border-primary font-bold"
 />
 </div>

 <div className="space-y-1.5 pr-0 pl-0">
 <label className="text-[9.5px] font-black text-default-500 uppercase tracking-wider block">Signature Log Hash / Initial</label>
 <input
 type="text"
 placeholder="Signature code"
 value={signatureText ?? ''}
 onChange={(e) => setSignatureText(e.target.value)}
 className="w-full bg-background border border-divider/50 px-2.5 py-1.5 rounded-lg text-xs leading-none text-foreground focus:outline-none focus:border-primary italic"
 />
 </div>

 <div className="flex gap-2 justify-end pt-1">
 <button
 type="button"
 onClick={() => setShowCompleteForm(false)}
 className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-default-500 hover:bg-default-500/10 cursor-pointer active:scale-[0.98]"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide cursor-pointer flex items-center gap-1.5 shadow-sm"
 >
 <CheckCircle className="h-3.5 w-3.5" /> Confirm Unloaded
 </button>
 </div>
 </form>
 )}

 {/* Mark Failed Delivery option */}
 {activeDelivery.status === 'Out For Delivery' && !showFailForm && (
 <button
 onClick={() => {
 setShowFailForm(true);
 setShowAssignForm(false);
 setShowCompleteForm(false);
 setFailReason('');
 }}
 className="w-full py-2 hover:bg-rose-500/10 text-rose-500 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1 active:scale-95"
 >
 <XCircle className="h-4 w-4" />
 <span>Log Shipment Failure</span>
 </button>
 )}

 {showFailForm && (
 <form
 onSubmit={(e) => handleFailSubmit(e, activeDelivery.id)}
 className="bg-content1 p-4 rounded-2xl border border-rose-500/25 space-y-3 shadow-inner text-left text-xs"
 >
 <div className="flex justify-between items-center pb-1 border-b border-rose-500/15">
 <span className="text-[9.5px] font-black text-rose-500 uppercase tracking-wider flex items-center gap-1 leading-none">
 <ShieldAlert className="h-3.5 w-3.5" /> Record Transit Fail Cause
 </span>
 <button type="button" onClick={() => setShowFailForm(false)} className="text-zinc-505 font-bold select-none p-0.5"></button>
 </div>

 <div className="space-y-1.5 pr-0 pl-0">
 <label className="text-[9.5px] font-black text-default-500 uppercase tracking-wider block">Failure Remark Cause *</label>
 <textarea
 rows={3}
 required
 placeholder="Reason for delivery failure..."
 value={failReason ?? ''}
 onChange={(e) => setFailReason(e.target.value)}
 className="w-full bg-background border border-rose-500/20 px-2.5 py-1.5 rounded-lg text-xs text-foreground focus:outline-none focus:border-rose-500 font-semibold"
 />
 </div>

 <div className="flex gap-2 justify-end pt-1">
 <button
 type="button"
 onClick={() => setShowFailForm(false)}
 className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-default-500 hover:bg-default-500/10 cursor-pointer active:scale-[0.98]"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="bg-rose-600 text-white px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide cursor-pointer flex items-center gap-1"
 >
 <AlertTriangle className="h-3.5 w-3.5 text-white" /> Log Fail State
 </button>
 </div>
 </form>
 )}

 </div>
 </div>
 )}

 </div>
 ) : (
 <div className="border border-dashed border-divider/30 rounded-2xl bg-content1/50 py-16 px-4 text-center text-xs text-default-500 font-bold p-5 h-full flex flex-col justify-center items-center gap-3">
 <Truck className="h-8 w-8 text-default-500 animate-bounce" />
 <span className="leading-relaxed">Click any delivery record on the left grid panel to view physical destination, assignment forms, and status logs.</span>
 </div>
 )}

 </div>

 </div>

  {/* DELIVERY RECEIPT PRINT MODAL */}
  {showDeliveryReceiptModal && activeDelivery && (
    <HeroModal
      isOpen={showDeliveryReceiptModal}
      onClose={() => setShowDeliveryReceiptModal(false)}
      size="lg"
      className="p-6 border border-divider/30 max-h-[90vh] overflow-y-auto flex flex-col justify-between"
    >
 <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground flex flex-col justify-between shrink-0 my-auto">
 
 <div className="flex items-center justify-between pb-3 border-b border-divider/20 bir-report-no-print">
 <div className="flex items-center gap-2">
 <div className="p-2 rounded-xl bg-primary/10 text-primary">
 <Printer className="h-5 w-5" />
 </div>
 <div>
 <h3 className="text-sm font-black text-foreground uppercase">Delivery Receipt Document</h3>
 <p className="text-[10px] text-default-500 font-medium">Ready for warehouse dispatch & customer sign-off</p>
 </div>
 </div>
 <button
 onClick={() => setShowDeliveryReceiptModal(false)}
 className="p-1.5 rounded-full hover:bg-default-100 text-default-500 cursor-pointer active:scale-95"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 
 {/* PRINTABLE DOCKET CONTAINER WITH DUAL COPIES & RECEIVER SIGNATURE */}
 <div className={`space-y-4 my-4 select-text text-left bir-receipt-container ${receiptFontClass}`}>
    {renderDeliveryReceiptCopy("STORE COPY")}

    <div className="relative flex py-2 items-center">
      <div className="flex-grow border-t-2 border-dashed border-gray-400"></div>
 <span className="flex-shrink mx-4 text-default-600 text-[9px] font-black uppercase tracking-wider bg-content2 px-3 py-1 rounded-full border border-divider/40 shadow-xs">
        CUT HERE • STORE COPY ABOVE / CUSTOMER COPY BELOW
      </span>
      <div className="flex-grow border-t-2 border-dashed border-gray-400"></div>
    </div>

    {renderDeliveryReceiptCopy("CUSTOMER COPY")}
  </div>

  {/* Modal Action Footer */}
  <div className="flex gap-2 mt-2 flex-shrink-0 bir-report-no-print">
  <button
  onClick={() => {
  window.print();
  addAuditLog("PRINT_DELIVERY_RECEIPT", `Printed Delivery Receipt for ${activeDelivery.saleNumber}`, "Deliveries", activeDelivery.id);
  }}
  className="flex-1 py-2.5 text-xs font-bold rounded-full bg-primary hover:bg-primary/90 text-primary-foreground transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm uppercase tracking-wider active:scale-95"
  >
  <Printer className="h-4 w-4" /> Print Delivery Receipt
  </button>
  <button
  onClick={() => setShowDeliveryReceiptModal(false)}
  className="px-5 py-2.5 text-xs font-bold rounded-full border border-divider hover:bg-default-100 transition-colors cursor-pointer active:scale-95"
  >
  Close
  </button>
  </div>

  </div>
    </HeroModal>
  )}

  {/* SCHEDULE POS DELIVERY MODAL */}
  <HeroModal
    isOpen={showSchedulePosModal}
    onClose={() => setShowSchedulePosModal(false)}
    size="lg"
    className="p-6 border border-divider/30 text-left space-y-4 max-h-[90vh] overflow-y-auto"
  >
        <div className="flex justify-between items-center border-b border-divider/20 pb-3">
          <div>
            <h3 className="text-base font-black text-foreground uppercase flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              <span>Schedule Freight Delivery for POS Order</span>
            </h3>
            <p className="text-[11px] text-default-500 font-medium">
              Select an existing POS transaction invoice to dispatch via Freight Cargo
            </p>
          </div>
          <button
            onClick={() => setShowSchedulePosModal(false)}
            className="p-1 rounded-full hover:bg-default-100 text-default-500 cursor-pointer active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSchedulePosDeliverySubmit} className="space-y-4">
          <div>
            <HeroSelect
              label="Select POS Order Invoice"
              isRequired
              value={selectedPosSaleId ?? ''}
              placeholder="-- Choose POS Transaction Order --"
              onValueChange={(val) => handleSelectPosSale(val)}
              radius="md"
              items={sales.slice(0, 30).map((s) => ({
                key: s.id,
                value: s.id,
                label: `Ref: ${s.saleNumber} | ${s.customerName} | ${formatCurrency(s.grandTotal)} (${s.createdAt && !isNaN(new Date(s.createdAt).getTime()) ? new Date(s.createdAt).toLocaleDateString() : 'N/A'})`,
              }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-default-500 mb-1">
                Recipient Customer Name
              </label>
              <input
                type="text"
                value={posDelivCustomerName ?? ''}
                onChange={(e) => setPosDelivCustomerName(e.target.value)}
                placeholder="Full Name"
                className="w-full bg-content1 text-xs font-bold text-foreground border border-divider/30 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-default-500 mb-1">
                Contact Phone Number
              </label>
              <input
                type="text"
                value={posDelivContact ?? ''}
                onChange={(e) => setPosDelivContact(e.target.value)}
                placeholder="Phone number"
 className="w-full bg-content1 text-xs font-bold text-foreground border border-divider/30 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-default-500 mb-1">
                House / Unit / Bldg No
              </label>
              <input
                type="text"
                value={posDelivHouseNo ?? ''}
                onChange={(e) => setPosDelivHouseNo(e.target.value)}
                placeholder="House / Unit / Bldg No"
                className="w-full bg-content1 text-xs font-bold text-foreground border border-divider/30 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-default-500 mb-1">
                Street / Avenue / Zone
              </label>
              <input
                type="text"
                value={posDelivStreet ?? ''}
                onChange={(e) => setPosDelivStreet(e.target.value)}
                placeholder="Street / Avenue"
                className="w-full bg-content1 text-xs font-bold text-foreground border border-divider/30 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-default-500 mb-1">
                Barangay Destination <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={posDelivBarangay ?? ''}
                onChange={(e) => setPosDelivBarangay(e.target.value)}
                required
                placeholder="Barangay"
                className="w-full bg-content1 text-xs font-bold text-foreground border border-divider/30 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-default-500 mb-1">
                City / Municipality
              </label>
              <input
                type="text"
                value={posDelivCity ?? ''}
                onChange={(e) => setPosDelivCity(e.target.value)}
                placeholder="City / Municipality"
                className="w-full bg-content1 text-xs font-bold text-foreground border border-divider/30 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-default-500 mb-1">
                Target Unloading Date
              </label>
              <input
                type="date"
                value={posDelivDate ?? ''}
                onChange={(e) => setPosDelivDate(e.target.value)}
                className="w-full bg-content1 text-xs font-bold text-foreground border border-divider/30 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <HeroSelect
                label="Preferred Slot"
                value={posDelivTime ?? ''}
                onValueChange={(val) => setPosDelivTime(val)}
                radius="md"
                items={[
                  { key: '08:00 AM - 12:00 PM', value: '08:00 AM - 12:00 PM', label: 'Morning Slot (08:00 AM - 12:00 PM)' },
                  { key: '10:00 AM - 02:00 PM', value: '10:00 AM - 02:00 PM', label: 'Midday Slot (10:00 AM - 02:00 PM)' },
                  { key: '01:00 PM - 05:00 PM', value: '01:00 PM - 05:00 PM', label: 'Afternoon Slot (01:00 PM - 05:00 PM)' },
                ]}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-default-500 mb-1">
              Landmark / Handling Remarks
            </label>
            <input
              type="text"
              value={posDelivLandmark ?? ''}
              onChange={(e) => setPosDelivLandmark(e.target.value)}
              placeholder="Landmark or special instructions"
              className="w-full bg-content1 text-xs font-bold text-foreground border border-divider/30 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="bg-background p-3.5 rounded-2xl border border-primary/20 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-primary block">
              Assign Truck & Driver Logistics Pilot (Optional - Instant Schedule)
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-default-500 mb-1">
                  Truck Plate / Model
                </label>
                <input
                  type="text"
                  placeholder="e.g. ABC-1234"
                  value={posDelivTruck ?? ''}
                  onChange={(e) => setPosDelivTruck(e.target.value)}
 className="w-full bg-content1 text-xs uppercase font-bold text-foreground border border-divider/30 rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-default-500 mb-1">
                  Driver Pilot Name
                </label>
                <input
                  type="text"
                  placeholder="Driver Full Name"
                  value={posDelivDriver ?? ''}
                  onChange={(e) => setPosDelivDriver(e.target.value)}
                  className="w-full bg-content1 text-xs font-bold text-foreground border border-divider/30 rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-default-500 mb-1">
                Helper Companion (Optional)
              </label>
              <input
                type="text"
                placeholder="Helper Name"
                value={posDelivHelper ?? ''}
                onChange={(e) => setPosDelivHelper(e.target.value)}
                className="w-full bg-content1 text-xs font-bold text-foreground border border-divider/30 rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-divider/20">
            <button
              type="button"
              onClick={() => setShowSchedulePosModal(false)}
              className="flex-1 py-2.5 text-xs font-bold rounded-xl border border-divider/40 hover:bg-default-100 transition-colors cursor-pointer active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 text-xs font-black rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-colors cursor-pointer shadow-sm uppercase tracking-wider active:scale-[0.98]"
            >
              Confirm Cargo Schedule
            </button>
          </div>
        </form>
  </HeroModal>


  </div>
  );
};
