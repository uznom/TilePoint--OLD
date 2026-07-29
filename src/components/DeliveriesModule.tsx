/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useDb } from '../context/DbContext';
import { Delivery, DeliveryStatus, UserRole } from '../types/db';
import { useResponsivePageSize } from './TablePagination';
import {
 Truck,
 User,
 MapPin,
 Calendar,
 Clock,
 ClipboardList,
 CheckCircle,
 XCircle,
 AlertTriangle,
 Search,
 X,
 FileText,
 Check,
 Package,
 Navigation,
 UserCheck,
 Signature,
 FileSignature,
 ShieldAlert,
 Printer
} from 'lucide-react';

interface DeliveriesModuleProps {
 darkMode: boolean;
}

export const DeliveriesModule: React.FC<DeliveriesModuleProps> = ({ darkMode }) => {
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
 const [selectedBranchId, setSelectedBranchId] = useState<string>(
 currentUser.branchAssignmentId || 'ALL'
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
 const [posDelivCity, setPosDelivCity] = useState('Dipolog City');
 const [posDelivLandmark, setPosDelivLandmark] = useState('');
 const [posDelivDate, setPosDelivDate] = useState(new Date().toISOString().split('T')[0]);
 const [posDelivTime, setPosDelivTime] = useState('10:00 AM - 2:00 PM');
 const [posDelivNotes, setPosDelivNotes] = useState('');

 // Auto-sync POS Store Deliveries that were not previously scheduled
 const syncMissingPosDeliveries = React.useCallback(() => {
   let createdCount = 0;
   sales.forEach((s) => {
     const hasDeliveryNote = s.notes && (
       s.notes.toLowerCase().includes('delivery') ||
       s.notes.toLowerCase().includes('barangay') ||
       s.notes.toLowerCase().includes('ship') ||
       s.notes.includes('SYSTEM ASSIGNED STORE DELIVERY TRACE:')
     );
     const existing = deliveries.find((d) => d.saleId === s.id || d.saleNumber === s.saleNumber);
     if (hasDeliveryNote && !existing) {
       createDelivery({
         saleId: s.id,
         saleNumber: s.saleNumber,
         customerName: s.customerName || 'Walk-in Customer',
         contactNumber: 'N/A',
         barangay: 'Central',
         cityMunicipality: 'Dipolog City',
         deliveryDate: new Date().toISOString().split('T')[0],
         deliveryTime: '10:00 AM - 2:00 PM',
         notes: s.notes,
       });
       createdCount++;
     }
   });
   if (createdCount > 0) {
     triggerToast("Auto-synced " + createdCount + " POS store delivery order(s) into Cargo Freight Scheduling.");
   } else {
     triggerToast("All store deliveries are already synced in Cargo Freight Scheduling.");
   }
 }, [sales, deliveries, createDelivery]);

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
     cityMunicipality: posDelivCity.trim() || 'Dipolog City',
     landmark: posDelivLandmark || undefined,
     deliveryDate: posDelivDate,
     deliveryTime: posDelivTime || undefined,
     notes: posDelivNotes || undefined,
   });
   setShowSchedulePosModal(false);
   setSelectedPosSaleId('');
   setSelectedDeliveryId(dRecord.id);
   triggerToast("Successfully scheduled Cargo Delivery " + dRecord.id + " for POS Invoice #" + sale.saleNumber);
 };

 // Pre-filter deliveries based on role and branch selection
 const branchFilteredDeliveries = useMemo(() => {
 return deliveries.filter(d => {
 if (currentUser.role === UserRole.ADMIN) {
 if (selectedBranchId === 'ALL') return true;
 return d.branchId === selectedBranchId;
 }
 // Non-admins only see deliveries from their designated outlet
 return d.branchId === currentUser.branchAssignmentId;
 });
 }, [deliveries, currentUser, selectedBranchId]);

 // Apply Status Tabs and Text Search
 const displayDeliveries = useMemo(() => {
 return branchFilteredDeliveries.filter(d => {
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
 }, [branchFilteredDeliveries, selectedStatusTab, searchTerm]);

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
    <div key={copyType} className="border border-gray-300 rounded-lg p-4 bg-white text-black text-xs leading-relaxed space-y-3 shadow-xs">
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
          <h2 className="text-sm font-black tracking-wider uppercase font-mono text-black">
            {deliveryBranch?.name || "EMMAN TILE CENTER"}
          </h2>
        )}
        <p className="text-[9.5px] font-semibold text-gray-700">
          {deliveryBranch?.address || "Sta. Filomena, Dipolog City"}
        </p>
        <p className="text-[8.5px] font-mono text-gray-600">
          Contact: {deliveryBranch?.phone || "0000"} | TIN: {deliveryBranch?.tin || "000-000-000"}
        </p>
        <div className="flex items-center justify-between pt-1">
          <span className="bg-black text-white px-2.5 py-0.5 rounded font-mono font-black text-[10px] uppercase tracking-widest">
            DELIVERY RECEIPT
          </span>
          <span className="font-mono font-black text-[9px] uppercase tracking-wider px-2 py-0.5 bg-gray-200 text-gray-800 rounded border border-gray-400">
            [{copyType} - {copyType === "STORE COPY" ? "WAREHOUSE AUDIT FILE" : "CUSTOMER RECIPIENT COPY"}]
          </span>
        </div>
      </div>

      {/* Document & Customer Metadata */}
      <div className="grid grid-cols-2 gap-2 text-[10px] border-b border-dashed border-gray-400 pb-2 font-sans">
        <div>
          <span className="text-[8px] font-black uppercase text-gray-500 block">DR Reference No.</span>
          <span className="font-mono font-bold text-xs text-black">DR-{activeDelivery?.saleNumber}</span>
          <span className="text-[8.5px] font-mono text-gray-500 block mt-0.5">Trace ID: {activeDelivery?.id}</span>
        </div>
        <div className="text-right">
          <span className="text-[8px] font-black uppercase text-gray-500 block">Scheduled Date</span>
          <span className="font-bold text-black">{activeDelivery?.deliveryDate || new Date().toLocaleDateString()}</span>
          <span className="text-[8.5px] font-medium text-gray-600 block">{activeDelivery?.deliveryTime || "Standard Slot"}</span>
        </div>
      </div>

      {/* Customer & Address */}
      <div className="bg-gray-50 p-2 rounded border border-gray-200 text-[10px] space-y-1">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[8px] font-extrabold uppercase text-gray-500 block">Customer Name</span>
            <span className="font-extrabold text-black uppercase">{activeDelivery?.customerName}</span>
          </div>
          <div>
            <span className="text-[8px] font-extrabold uppercase text-gray-500 block">Contact Number</span>
            <span className="font-mono font-bold text-black">{activeDelivery?.contactNumber || "N/A"}</span>
          </div>
        </div>
        <div className="pt-1 border-t border-gray-200">
          <span className="text-[8px] font-extrabold uppercase text-gray-500 block">Unloading Address</span>
          <span className="font-semibold text-gray-900 block">
            {[activeDelivery?.houseNo, activeDelivery?.street, activeDelivery?.barangay, activeDelivery?.cityMunicipality].filter(Boolean).join(", ")}
          </span>
          {activeDelivery?.landmark && (
            <span className="text-[8.5px] italic text-gray-600 block mt-0.5">
              Landmark: {activeDelivery.landmark}
            </span>
          )}
        </div>
      </div>

      {/* Carrier & Payment Summary */}
      <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
        <div className="bg-gray-100 p-1.5 rounded border border-gray-300">
          <span className="text-[7.5px] uppercase text-gray-500 font-bold block">Logistics Personnel</span>
          <span className="font-extrabold text-black block">Truck: {activeDelivery?.truck || "Unassigned"}</span>
          <span className="text-gray-700 block">Driver: {activeDelivery?.driver || "Unassigned"}</span>
          <span className="text-gray-600 block">Helpers: {activeDelivery?.helper || "N/A"}</span>
        </div>

        {activeDeliverySale && (
          <div className="bg-emerald-50/90 p-1.5 rounded border border-emerald-300">
            <span className="text-[7.5px] uppercase text-emerald-800 font-extrabold block">Bill & Payment Summary</span>
            <div className="flex justify-between text-gray-800">
              <span>Bill Total:</span>
              <span className="font-bold">₱{(activeDeliverySale.grandTotal || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-800">
              <span>Paid ({activeDeliverySale.paymentMethod || "Cash"}):</span>
              <span className="font-bold">₱{(activeDeliverySale.amountTendered || activeDeliverySale.grandTotal || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-emerald-800 font-extrabold pt-0.5 border-t border-emerald-300">
              <span>Change Due:</span>
              <span>₱{(activeDeliverySale.changeAmount || ((activeDeliverySale.amountTendered || 0) > (activeDeliverySale.grandTotal || 0) ? (activeDeliverySale.amountTendered || 0) - (activeDeliverySale.grandTotal || 0) : 0) || 0).toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="space-y-1">
        <div className="text-[8.5px] font-black uppercase tracking-wider text-gray-700 flex justify-between border-b-2 border-black pb-0.5">
          <span>Items to be Delivered</span>
          <span>Verification Checklist</span>
        </div>

        <table className="w-full text-left text-[9.5px] border-collapse">
          <thead>
            <tr className="border-b border-gray-300 text-[8px] uppercase text-gray-600 font-extrabold">
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
                  <td className="py-1 font-mono text-gray-500 pr-1">{idx + 1}</td>
                  <td className="py-1 font-bold text-black">{item.productName}</td>
                  <td className="py-1 text-right font-mono font-extrabold text-black">
                    {item.quantity} pcs
                  </td>
                  <td className="py-1 text-center pl-2">
                    <span className="inline-block h-3 w-3 border border-black rounded-xs"></span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-1.5 text-center text-gray-500 italic text-[9px]">
                  Store Order Ref: {activeDelivery?.saleNumber} (Full Order Scheduled)
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cargo Handling Notes */}
      {activeDelivery?.notes && (
        <div className="text-[9px] border-t border-gray-300 pt-1 text-gray-700">
          <strong className="uppercase text-[8px] text-gray-600 block">Handling Notes:</strong>
          <p className="italic leading-snug">{activeDelivery.notes}</p>
        </div>
      )}

      {/* Receiver Confirmation & Signature Section */}
      <div className="border-t-2 border-black pt-2 mt-2 space-y-2">
        <div className="bg-gray-100 p-1.5 rounded border border-gray-300 text-[8px] font-bold text-center text-gray-800 leading-tight">
          DELIVERY CONFIRMATION: I hereby acknowledge receipt of the merchandise listed above in complete quantity, correct specifications, and good order & condition. Delivery Confirmed & Successful.
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-[8px] font-sans pt-1">
          <div className="space-y-4">
            <div className="border-b border-black h-5"></div>
            <span className="font-extrabold uppercase text-gray-800 block">Released By (Warehouse)</span>
          </div>
          <div className="space-y-4">
            <div className="border-b border-black h-5"></div>
            <span className="font-extrabold uppercase text-gray-800 block">Delivered By (Driver)</span>
          </div>
          <div className="space-y-1">
            <div className="border-b border-black h-5"></div>
            <span className="font-extrabold uppercase text-black block">Received By (Signature)</span>
            <span className="text-[7.5px] text-gray-600 block font-mono">Printed Name: _________________</span>
            <span className="text-[7.5px] text-gray-600 block font-mono">Date & Time: __________________</span>
            <span className="text-[7.5px] text-gray-600 block font-mono">ID / Relation: _________________</span>
          </div>
        </div>
      </div>

      <div className="text-center text-[7px] text-gray-500 font-mono pt-1 border-t border-dashed border-gray-300">
        Official Delivery Receipt Docket • TilePoint Enterprise ERP System • [{copyType}]
      </div>
    </div>
  );


 return (
 <div className="p-6 space-y-6 text-left h-full overflow-y-auto">
 
 {/* HEADER SECTION */}
 <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-m3-outline-variant/20 gap-4">
 <div>
 <h2 className="text-xl font-black text-m3-primary uppercase tracking-wider flex items-center gap-2">
 <Truck className="h-6 w-6 text-m3-primary animate-pulse" />
 <span>Cargo Deliveries & Freight Scheduling</span>
 </h2>
 <p className="text-xs text-m3-on-surface-variant font-medium mt-1">
 Dispatch, route, track, and log customer bulk shipments on tile transport trucks.
 </p>
 </div>

 {/* Branch scope controller for system admin */}
 {currentUser.role === UserRole.ADMIN && (
 <div className="flex items-center gap-2 bg-m3-surface-low border border-m3-outline-variant/30 p-2 rounded-2xl shadow-sm pl-4 pr-3 shrink-0">
 <span className="text-[10px] font-black uppercase text-m3-primary tracking-widest font-mono">
 Outlet Scope:
 </span>
 <select
 value={selectedBranchId}
 onChange={e => setSelectedBranchId(e.target.value)}
 className="text-xs bg-m3-surface text-m3-on-surface font-black uppercase tracking-wide border-0 border-b border-m3-outline-variant/40 focus:border-m3-primary focus:outline-none py-1 px-2.5 rounded-lg cursor-pointer"
 >
 <option value="ALL">ALL OUTLETS DIRECTORY</option>
 {branches.map(b => (
 <option key={b.id} value={b.id}>
 {b.name.toUpperCase()}
 </option>
 ))}
 </select>
 </div>
 )}
 </div>

 {/* TOAST PANEL BAR */}
 {toastMessage && (
 <div className="bg-m3-tertiary-container border border-m3-tertiary/25 text-m3-on-tertiary-container p-3 px-5 rounded-2xl text-xs font-black shadow-lg animate-fade-in flex items-center justify-between">
 <span>{toastMessage}</span>
 <button onClick={() => setToastMessage(null)} className="text-[10px] uppercase underline opacity-70 cursor-pointer pl-4">Dismiss</button>
 </div>
 )}

 {/* METRIC CARD BENTO STATS */}
 <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
 
 <div className="p-4 rounded-2xl border border-m3-outline-variant/30 bg-m3-surface-lowest flex flex-col justify-between">
 <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Gross Deliveries</span>
 <div className="flex items-baseline gap-2 mt-2">
 <span className="text-2xl font-black tracking-tight">{stats.total}</span>
 <span className="text-[10px] font-mono text-zinc-400 font-bold">Invoices</span>
 </div>
 </div>

 <div className="p-4 rounded-2xl border border-m3-outline-variant/30 bg-amber-500/5 flex flex-col justify-between">
 <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">Pending Dispatch</span>
 <div className="flex items-baseline gap-2 mt-2">
 <span className="text-2xl font-black text-amber-400 tracking-tight">{stats.pending}</span>
 <span className="text-[10px] text-amber-600 font-bold uppercase font-mono">Unpacked</span>
 </div>
 </div>

 <div className="p-4 rounded-2xl border border-m3-outline-variant/30 bg-m3-primary/5 flex flex-col justify-between">
 <span className="text-[9px] font-black uppercase tracking-widest text-m3-primary">Scheduled</span>
 <div className="flex items-baseline gap-2 mt-2">
 <span className="text-2xl font-black text-m3-primary tracking-tight">{stats.scheduled}</span>
 <span className="text-[10px] text-m3-primary font-bold uppercase font-mono">Ready</span>
 </div>
 </div>

 <div className="p-4 rounded-2xl border border-m3-outline-variant/30 bg-m3-tertiary/5 flex flex-col justify-between">
 <span className="text-[9px] font-black uppercase tracking-widest text-m3-tertiary">Active Trucks</span>
 <div className="flex items-baseline gap-2 mt-2">
 <span className="text-2xl font-black text-m3-tertiary tracking-tight">{stats.transit}</span>
 <span className="text-[10px] text-m3-tertiary font-bold uppercase font-mono">In Transit</span>
 </div>
 </div>

 <div className="col-span-2 md:col-span-1 p-4 rounded-2xl border border-m3-outline-variant/30 bg-emerald-500/5 flex flex-col justify-between">
 <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Completed Gate Pass</span>
 <div className="flex items-baseline gap-2 mt-2">
 <span className="text-2xl font-black text-emerald-400 tracking-tight">{stats.completed}</span>
 <span className="text-[10px] text-emerald-600 font-bold uppercase font-mono">Delivered</span>
 </div>
 </div>

 </div>

 {/* FILTER BUTTON TABS & SEARCH CONTAINER */}
 <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-m3-surface-low border border-m3-outline-variant/20 p-3.5 rounded-2xl shadow-sm">
 
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
 ? 'bg-m3-primary text-m3-on-primary shadow-sm font-black'
 : 'bg-m3-surface-lowest hover:bg-m3-outline-variant/15 text-m3-on-surface-variant'
 }`}
 >
 <span>{tab.label}</span>
 <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md ${
 selectedStatusTab === tab.tag ? 'bg-m3-on-primary/20 text-m3-on-primary' : 'bg-m3-outline-variant/20 text-m3-on-surface'
 }`}>{tab.count}</span>
 </button>
 ))}
 </div>

 {/* Textual Search bar */}
 <div className="relative w-full md:w-80">
 <input
 type="text"
 value={searchTerm}
 onChange={e => setSearchTerm(e.target.value)}
 placeholder="Search ref #, client, address, pilot..."
 className="w-full bg-m3-surface-lowest text-xs text-m3-on-surface focus:outline-none focus:ring-1 focus:ring-m3-primary border border-m3-outline-variant/30 pl-8 pr-4 py-2 rounded-xl placeholder-zinc-500 font-bold"
 />
 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
 {searchTerm && (
 <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2 hover:text-rose-500 p-0.5 text-zinc-400 font-bold"></button>
 )}
 </div>
 </div>

 {/* CORE CONTAINER: TABLE WITH DRILL-DOWN PREVIEWS */}
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
 
 {/* LEFT COMPONENT: MASTER TABULAR LIST */}
 <div className={`col-span-1 lg:col-span-8 space-y-4`}>
 <div className="border border-m3-outline-variant/30 rounded-[24px] bg-m3-surface-lowest overflow-hidden shadow-sm">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs divide-y divide-m3-outline-variant/15">
 
 <thead className="bg-m3-surface-low text-[10px] font-black uppercase text-m3-on-surface-variant tracking-wider select-none">
 <tr>
 <th className="py-3 px-4 font-mono">Reference Ref</th>
 <th className="py-3 px-4">Invoice / Buyer</th>
 <th className="py-3 px-4">Destination Barangay</th>
 <th className="py-3 px-4">Cargo Date</th>
 <th className="py-3 px-4 font-mono">Personnel</th>
 <th className="py-3 px-4 text-center">Fulfill Status</th>
 <th className="py-3 px-4 text-center">Receipt</th>
 </tr>
 </thead>

 <tbody className="divide-y divide-m3-outline-variant/10">
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
 className={`hover:bg-m3-outline-variant/10 cursor-pointer transition-colors ${
 isSelected ? 'bg-m3-primary/10 hover:bg-m3-primary/15' : ''
 }`}
 >
 {/* ID */}
 <td className="py-3.5 px-4 font-mono font-bold text-m3-primary select-all text-[11px]">
 {d.id.substring(4, 12)}...
 </td>

 {/* Invoice & Buyer */}
 <td className="py-3.5 px-4">
 <div className="font-extrabold text-m3-on-surface leading-tight">{d.customerName}</div>
 <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Ref: {d.saleNumber}</div>
 </td>

 {/* Location */}
 <td className="py-3.5 px-4">
 <div className="font-bold">{d.barangay}</div>
 <div className="text-[10px] text-zinc-500 leading-none">{d.cityMunicipality}</div>
 </td>

 {/* Unloading target Date */}
 <td className="py-3.5 px-4 font-medium text-m3-on-surface">
 <div>{d.deliveryDate && !isNaN(new Date(d.deliveryDate).getTime()) ? new Date(d.deliveryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'N/A'}</div>
 {d.deliveryTime && <div className="text-[9px] text-m3-on-surface-variant font-medium mt-0.5">{d.deliveryTime}</div>}
 </td>

 {/* Assign cargo carrier */}
 <td className="py-3.5 px-4 font-semibold text-[11px] font-mono">
 {d.driver ? (
 <div>
 <span className="text-m3-primary ">{d.truck}</span>
 <span className="text-zinc-500 block text-[9.5px]">Driver: {d.driver}</span>
 </div>
 ) : (
 <span className="text-zinc-500 block italic leading-none text-[10px]">Unscheduled</span>
 )}
 </td>

 {/* Fulfill Badge wrapper */}
 <td className="py-3.5 px-4 text-center">
 <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wide border inline-block ${
 d.status === 'Delivered'
 ? 'bg-emerald-550/10 border-emerald-500/20 text-emerald-400'
 : d.status === 'Out For Delivery'
 ? 'bg-purple-550/10 border-purple-500/20 text-purple-400 animate-pulse'
 : d.status === 'Scheduled'
 ? 'bg-m3-primary/10 border-m3-primary/20 text-m3-primary'
 : d.status === 'Packed'
 ? 'text-m3-tertiary bg-m3-tertiary/10 border-m3-tertiary/20'
 : d.status === 'Failed Delivery' || d.status === 'Cancelled'
 ? 'bg-rose-550/10 border-rose-500/20 text-rose-400'
 : 'bg-zinc-550/10 border-zinc-500/20 text-zinc-400'
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
 className="p-1.5 rounded-xl bg-m3-primary/10 hover:bg-m3-primary/20 text-m3-primary transition-colors cursor-pointer inline-flex items-center gap-1 text-[10px] font-bold border border-m3-primary/20"
 >
 <Printer className="h-3.5 w-3.5" />
 <span className="hidden sm:inline font-mono uppercase">DR</span>
 </button>
 </td>
 </tr>
 );
 })}

 {displayDeliveries.length === 0 && (
 <tr>
 <td colSpan={6} className="py-12 text-center text-xs text-zinc-500 font-bold font-mono">
 No scheduled customer deliveries found matching current filter scope.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>

 {/* Pagination Controls bar */}
 <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-m3-surface-low border-t border-m3-outline-variant/15 text-xs font-sans">
 <span className="font-semibold text-zinc-400 font-mono">
 Showing {Math.min(displayDeliveries.length, (delivPage - 1) * DELIV_PER_PAGE + 1)}-{Math.min(displayDeliveries.length, delivPage * DELIV_PER_PAGE)} of {displayDeliveries.length} items
 </span>
 <div className="flex items-center gap-1.5 select-none font-sans">
 <button
 type="button"
 disabled={delivPage === 1}
 onClick={() => setDelivPage(prev => Math.max(1, prev - 1))}
 className="px-3 py-1.5 rounded-lg border border-m3-outline-variant/60 hover:border-m3-primary hover:bg-m3-primary/10 text-m3-primary disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer font-bold uppercase text-[9.5px]"
 >
 Prev
 </button>
 {Array.from({ length: totalDelivPages }).map((_, i) => {
 const pNum = i + 1;
 if (totalDelivPages > 5 && Math.abs(pNum - delivPage) > 2 && pNum !== 1 && pNum !== totalDelivPages) {
 if (pNum === 2 || pNum === totalDelivPages - 1) {
 return <span key={pNum} className="px-1 text-zinc-500">...</span>;
 }
 return null;
 }
 return (
 <button
 key={pNum}
 type="button"
 onClick={() => setDelivPage(pNum)}
 className={`h-7 w-7 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
 delivPage === pNum
 ? 'bg-m3-primary text-m3-on-primary shadow-md'
 : 'border border-m3-outline-variant/20 hover:bg-m3-primary/10 text-zinc-300'
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
 className="px-3 py-1.5 rounded-lg border border-m3-outline-variant/60 hover:border-m3-primary hover:bg-m3-primary/10 text-m3-primary disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer font-bold uppercase text-[9.5px]"
 >
 Next
 </button>
 </div>
 </div>

 {/* Footer page notes count */}
 <div className="bg-m3-surface-low border-t border-m3-outline-variant/15 px-4 py-2 text-[10px] text-zinc-400 font-bold select-none font-mono">
 TOTAL RECORD ENTRIES: {displayDeliveries.length} OF {deliveries.length} SYSTEM CARGOES
 </div>
 </div>
 </div>

 {/* RIGHT COMPONENT: DRILL-DOWN DETAIL WORKSPACE */}
 <div className="col-span-1 lg:col-span-4">
 
 {activeDelivery ? (
 <div className="border border-m3-outline-variant/35 rounded-[28px] bg-m3-surface-low p-5 space-y-4 shadow-sm relative">
 
 {/* Close Detail Button */}
 <button
 onClick={() => setSelectedDeliveryId(null)}
 className="absolute right-3.5 top-3.5 text-m3-on-surface-variant hover:text-m3-on-surface p-1 rounded-full bg-m3-surface-lowest/70 border border-m3-outline-variant/20 hover:border-m3-outline-variant/50 transition-all cursor-pointer"
 >
 <X className="h-4.5 w-4.5" />
 </button>

 {/* Title Section */}
 <div className="space-y-1 text-left border-b border-m3-outline-variant/15 pb-3">
 <span className="text-[9px] font-black tracking-widest text-m3-primary uppercase font-mono bg-m3-primary/10 px-2 py-0.5 rounded-md inline-block">
 Shipment Document Detail
 </span>
 <h3 className="text-sm font-black text-m3-on-surface mt-1 uppercase truncate pr-8">
 {activeDelivery.customerName}
 </h3>
 <p className="text-[10px] font-mono text-zinc-500 leading-relaxed font-bold">
 UID Trace: {activeDelivery.id}
 </p>
 </div>

 {/* Print Delivery Receipt Action Button */}
 <button
 type="button"
 onClick={() => setShowDeliveryReceiptModal(true)}
 className="w-full py-2 px-3 bg-m3-primary hover:bg-m3-primary/90 text-m3-on-primary font-black text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all uppercase tracking-wider"
 >
 <Printer className="h-4 w-4" />
 <span>Print Delivery Receipt (DR)</span>
 </button>

 {/* Physical Location details card */}
 <div className="space-y-2 text-left bg-m3-surface-lowest p-3 rounded-2xl border border-m3-outline-variant/15 text-[11px] leading-relaxed">
 <div className="flex items-start gap-2 text-m3-on-surface">
 <MapPin className="h-4 w-4 text-m3-primary shrink-0 mt-0.5" />
 <div>
 <h4 className="font-extrabold uppercase tracking-wide text-[9.5px] text-m3-primary leading-none mb-1">Unloading Destination Address</h4>
 <span className="font-extrabold block">
 {activeDelivery.houseNo ? `${activeDelivery.houseNo}, ` : ''}
 {activeDelivery.street ? `${activeDelivery.street}, ` : ''}
 {activeDelivery.barangay}
 </span>
 <span className="font-bold text-zinc-500">{activeDelivery.cityMunicipality}</span>
 </div>
 </div>

 {activeDelivery.landmark && (
 <div className="pl-6 border-t border-dashed border-m3-outline-variant/10 pt-1.5 mt-1.5">
 <span className="text-[9px] font-black text-m3-primary uppercase tracking-wider block">Landmark directions</span>
 <span className="text-zinc-400 font-medium italic">{activeDelivery.landmark}</span>
 </div>
 )}
 </div>

 {/* Logistics Metadata */}
 <div className="grid grid-cols-2 gap-2 text-xs text-left">
 
 <div className="bg-m3-surface-lowest p-2.5 rounded-xl border border-m3-outline-variant/10 space-y-0.5">
 <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block">Receiver Contact</span>
 <span className="font-mono text-xs font-black text-m3-on-surface">{activeDelivery.contactNumber}</span>
 </div>

 <div className="bg-m3-surface-lowest p-2.5 rounded-xl border border-m3-outline-variant/10 space-y-0.5">
 <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block">ERP OS Receipt</span>
 <span className="font-mono text-xs font-black text-m3-primary select-all">{activeDelivery.saleNumber}</span>
 </div>

 <div className="bg-m3-surface-lowest p-2.5 rounded-xl border border-m3-outline-variant/10 space-y-0.5">
 <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block">Target Unload Date</span>
 <span className="text-xs font-black text-m3-on-surface flex items-center gap-1">
 <Calendar className="h-3 w-3 inline text-m3-primary" />
 {activeDelivery.deliveryDate && !isNaN(new Date(activeDelivery.deliveryDate).getTime()) ? new Date(activeDelivery.deliveryDate).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : 'N/A'}
 </span>
 </div>

 <div className="bg-m3-surface-lowest p-2.5 rounded-xl border border-m3-outline-variant/10 space-y-0.5">
 <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block">Time Slot</span>
 <span className="text-[10px] font-bold text-m3-on-surface flex items-center gap-1 select-none pr-1 truncate">
 <Clock className="h-3 w-3 text-m3-primary" />
 {activeDelivery.deliveryTime || 'Unassigned'}
 </span>
 </div>

 </div>

 {/* Order Payment & Customer Change Details */}
 {activeDeliverySale && (
 <div className="bg-m3-surface-lowest p-3 rounded-2xl border border-m3-outline-variant/15 text-[11px] leading-relaxed text-left space-y-1 font-mono">
 <div className="flex justify-between items-center text-zinc-400 font-medium text-[10px]">
 <span>Bill Total: <strong className="text-m3-on-surface">₱{(activeDeliverySale.grandTotal || 0).toFixed(2)}</strong></span>
 <span>Paid ({activeDeliverySale.paymentMethod || "Cash"}): <strong className="text-m3-on-surface">₱{(activeDeliverySale.amountTendered || activeDeliverySale.grandTotal || 0).toFixed(2)}</strong></span>
 </div>
 {((activeDeliverySale.changeAmount || 0) > 0 || (activeDeliverySale.amountTendered || 0) > (activeDeliverySale.grandTotal || 0)) && (
 <div className="flex justify-between items-center pt-1.5 border-t border-dashed border-m3-outline-variant/15 font-black text-emerald-400 text-xs">
 <span className="uppercase text-[9.5px] font-sans tracking-wider">Customer Change:</span>
 <span className="text-sm font-black text-emerald-300">₱{(activeDeliverySale.changeAmount || ((activeDeliverySale.amountTendered || 0) > (activeDeliverySale.grandTotal || 0) ? (activeDeliverySale.amountTendered || 0) - (activeDeliverySale.grandTotal || 0) : 0) || 0).toFixed(2)}</span>
 </div>
 )}
 </div>
 )}

 {/* Cargo Assignee Information details */}
 <div className="bg-m3-surface-lowest p-3 rounded-2xl border border-m3-outline-variant/15 text-[11px] leading-relaxed text-left">
 <h4 className="font-extrabold uppercase tracking-wide text-[9.5px] text-m3-primary flex items-center gap-1 mb-1 border-b border-m3-outline-variant/10 pb-1">
 <Truck className="h-3.5 w-3.5" />
 <span>Freight Transport Assignment</span>
 </h4>
 {activeDelivery.driver ? (
 <div className="grid grid-cols-2 gap-y-1.5 pt-1 font-semibold text-m3-on-surface">
 <div>
 <span className="text-[9px] text-zinc-500 uppercase font-mono block">Plate Number</span>
 <span className="font-mono font-black text-m3-primary text-xs uppercase">{activeDelivery.truck}</span>
 </div>

 <div>
 <span className="text-[9px] text-zinc-500 uppercase font-mono block">Pilot Driver</span>
 <span className="text-xs font-black">{activeDelivery.driver}</span>
 </div>

 {activeDelivery.helper && (
 <div className="col-span-2">
 <span className="text-[9px] text-zinc-500 uppercase font-mono block">Unloading Helpers</span>
 <span className="text-xs font-bold block">{activeDelivery.helper}</span>
 </div>
 )}
 </div>
 ) : (
 <div className="py-2 text-center text-[10px] text-zinc-500 font-extrabold italic select-none">
 No driver pilot or freight carrier plate assigned yet.
 </div>
 )}
 </div>

 {/* Special instructions notes */}
 {activeDelivery.notes && (
 <div className="bg-m3-surface-lowest p-3 rounded-xl border border-m3-outline-variant/10 text-left text-[11px] space-y-0.5">
 <span className="text-[9px] font-black text-m3-primary uppercase block">Cargo & Handler Memo</span>
 <p className="text-m3-on-surface-variant font-medium select-all leading-normal">{activeDelivery.notes}</p>
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
 <div className="flex items-center gap-1 font-mono font-bold text-[10px] leading-none text-emerald-400/80 italic mt-1.5 border border-dashed border-emerald-500/20 p-1.5 rounded-md">
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
 <div className="border-t border-m3-outline-variant/15 pt-4 space-y-2 mt-2">
 <span className="text-[9px] font-black text-m3-primary uppercase tracking-widest block text-left">
 Workflow Actions
 </span>

 {/* Actions buttons */}
 <div className="flex flex-col gap-2">
 
 {/* Step 1: Pack Cargo */}
 {activeDelivery.status === 'Pending Scheduling' && (
 <button
 onClick={() => handlePackCargo(activeDelivery.id)}
 className="w-full py-2 bg-gradient-to-r from-m3-tertiary/90 to-m3-tertiary hover:from-m3-tertiary hover:to-m3-tertiary/90 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-sm transition-all flex items-center justify-center gap-1"
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
 className="w-full py-2 bg-gradient-to-r from-m3-primary/90 to-m3-primary hover:from-m3-primary hover:to-m3-primary/90 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-sm transition-all flex items-center justify-center gap-1.5"
 >
 <Truck className="h-4 w-4" />
 <span>{activeDelivery.driver ? 'Update Carrier Pilot' : 'Schedule Truck & Driver'}</span>
 </button>
 )}

 {/* Quick dispatcher assignment form */}
 {showAssignForm && (
 <form
 onSubmit={(e) => handleAssignPersonnelSubmit(e, activeDelivery.id)}
 className="bg-m3-surface-lowest p-4 rounded-2xl border border-m3-primary/20 space-y-3 shadow-inner text-left text-xs"
 >
 <div className="flex justify-between items-center pb-1 border-b border-m3-outline-variant/10">
 <span className="text-[9.5px] font-black text-m3-primary uppercase tracking-wider flex items-center gap-1 leading-none">
 <Clock className="h-3.5 w-3.5" /> Setup Courier Assignment
 </span>
 <button type="button" onClick={() => setShowAssignForm(false)} className="text-zinc-500 font-bold select-none p-0.5"></button>
 </div>
 
 <div className="space-y-1.5 pr-0 pl-0">
 <label className="text-[9.5px] font-black text-zinc-500 uppercase tracking-wider block">Truck Plate Number *</label>
 <input
 type="text"
 required
 placeholder="Truck plate / Model"
 value={assignTruck}
 onChange={(e) => setAssignTruck(e.target.value)}
 className="w-full bg-m3-surface border border-m3-outline-variant/50 px-2.5 py-1.5 rounded-lg text-xs leading-none text-m3-on-surface focus:outline-none focus:border-m3-primary font-mono uppercase"
 />
 </div>

 <div className="space-y-1.5 pr-0 pl-0">
 <label className="text-[9.5px] font-black text-zinc-500 uppercase tracking-wider block">Driver Pilot *</label>
 <input
 type="text"
 required
 placeholder="Driver name"
 value={assignDriver}
 onChange={(e) => setAssignDriver(e.target.value)}
 className="w-full bg-m3-surface border border-m3-outline-variant/50 px-2.5 py-1.5 rounded-lg text-xs leading-none text-m3-on-surface focus:outline-none focus:border-m3-primary font-bold"
 />
 </div>

 <div className="space-y-1.5 pr-0 pl-0">
 <label className="text-[9.5px] font-black text-zinc-500 uppercase tracking-wider block">Helper Assistant (Optional)</label>
 <input
 type="text"
 placeholder="Helper name"
 value={assignHelper}
 onChange={(e) => setAssignHelper(e.target.value)}
 className="w-full bg-m3-surface border border-m3-outline-variant/50 px-2.5 py-1.5 rounded-lg text-xs leading-none text-m3-on-surface focus:outline-none focus:border-m3-primary"
 />
 </div>

 <div className="flex gap-2 justify-end pt-1">
 <button
 type="button"
 onClick={() => setShowAssignForm(false)}
 className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-zinc-500 hover:bg-zinc-500/10 cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="bg-m3-primary text-m3-on-primary px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide cursor-pointer flex items-center gap-1.5"
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
 className="w-full py-2 bg-gradient-to-r from-purple-650 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-sm transition-all flex items-center justify-center gap-1"
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
 className="w-full py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-sm transition-all flex items-center justify-center gap-1.5"
 >
 <CheckCircle className="h-4 w-4" />
 <span>Log Delivered Success</span>
 </button>
 )}

 {showCompleteForm && (
 <form
 onSubmit={(e) => handleCompleteSubmit(e, activeDelivery.id)}
 className="bg-m3-surface-lowest p-4 rounded-2xl border border-m3-primary/20 space-y-3 shadow-inner text-left text-xs"
 >
 <div className="flex justify-between items-center pb-1 border-b border-m3-outline-variant/10">
 <span className="text-[9.5px] font-black text-m3-primary uppercase tracking-wider flex items-center gap-1 leading-none">
 <FileSignature className="h-3.5 w-3.5" /> Sign-off Delivery Docket
 </span>
 <button type="button" onClick={() => setShowCompleteForm(false)} className="text-zinc-500 font-bold select-none p-0.5"></button>
 </div>

 <div className="space-y-1.5 pr-0 pl-0">
 <label className="text-[9.5px] font-black text-zinc-500 uppercase tracking-wider block">Receiver Person Name</label>
 <input
 type="text"
 placeholder="Receiver name"
 value={receiverName}
 onChange={(e) => setReceiverName(e.target.value)}
 className="w-full bg-m3-surface border border-m3-outline-variant/50 px-2.5 py-1.5 rounded-lg text-xs leading-none text-m3-on-surface focus:outline-none focus:border-m3-primary font-bold"
 />
 </div>

 <div className="space-y-1.5 pr-0 pl-0">
 <label className="text-[9.5px] font-black text-zinc-500 uppercase tracking-wider block">Signature Log Hash / Initial</label>
 <input
 type="text"
 placeholder="Signature code"
 value={signatureText}
 onChange={(e) => setSignatureText(e.target.value)}
 className="w-full bg-m3-surface border border-m3-outline-variant/50 px-2.5 py-1.5 rounded-lg text-xs leading-none text-m3-on-surface focus:outline-none focus:border-m3-primary font-mono italic"
 />
 </div>

 <div className="flex gap-2 justify-end pt-1">
 <button
 type="button"
 onClick={() => setShowCompleteForm(false)}
 className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-zinc-500 hover:bg-zinc-500/10 cursor-pointer"
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
 className="w-full py-2 hover:bg-rose-500/10 text-rose-500 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1"
 >
 <XCircle className="h-4 w-4" />
 <span>Log Shipment Failure</span>
 </button>
 )}

 {showFailForm && (
 <form
 onSubmit={(e) => handleFailSubmit(e, activeDelivery.id)}
 className="bg-m3-surface-lowest p-4 rounded-2xl border border-rose-500/25 space-y-3 shadow-inner text-left text-xs"
 >
 <div className="flex justify-between items-center pb-1 border-b border-rose-500/15">
 <span className="text-[9.5px] font-black text-rose-500 uppercase tracking-wider flex items-center gap-1 leading-none">
 <ShieldAlert className="h-3.5 w-3.5" /> Record Transit Fail Cause
 </span>
 <button type="button" onClick={() => setShowFailForm(false)} className="text-zinc-505 font-bold select-none p-0.5"></button>
 </div>

 <div className="space-y-1.5 pr-0 pl-0">
 <label className="text-[9.5px] font-black text-zinc-500 uppercase tracking-wider block">Failure Remark Cause *</label>
 <textarea
 rows={3}
 required
 placeholder="Reason for delivery failure..."
 value={failReason}
 onChange={(e) => setFailReason(e.target.value)}
 className="w-full bg-m3-surface border border-rose-500/20 px-2.5 py-1.5 rounded-lg text-xs text-m3-on-surface focus:outline-none focus:border-rose-500 font-semibold"
 />
 </div>

 <div className="flex gap-2 justify-end pt-1">
 <button
 type="button"
 onClick={() => setShowFailForm(false)}
 className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-zinc-500 hover:bg-zinc-500/10 cursor-pointer"
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
 <div className="border border-dashed border-m3-outline-variant/30 rounded-[28px] bg-m3-surface-low/50 py-16 px-4 text-center text-xs text-zinc-500 font-bold font-mono p-5 h-full flex flex-col justify-center items-center gap-3">
 <Truck className="h-8 w-8 text-zinc-400 animate-bounce" />
 <span className="leading-relaxed">Click any delivery record on the left grid panel to view physical destination, assignment forms, and status logs.</span>
 </div>
 )}

 </div>

 </div>

 {/* DELIVERY RECEIPT PRINT MODAL */}
 {showDeliveryReceiptModal && activeDelivery && (
 <div className="fixed inset-0 overflow-y-auto flex items-center justify-center z-50 p-4">
 <div
 className="fixed inset-0 bg-gray-950/75 backdrop-blur-sm bir-report-no-print"
 onClick={() => setShowDeliveryReceiptModal(false)}
 />
 <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface flex flex-col justify-between shrink-0 my-auto">
 
 <div className="flex items-center justify-between pb-3 border-b border-m3-outline-variant/20 bir-report-no-print">
 <div className="flex items-center gap-2">
 <div className="p-2 rounded-xl bg-m3-primary/10 text-m3-primary">
 <Printer className="h-5 w-5" />
 </div>
 <div>
 <h3 className="text-sm font-black text-m3-on-surface uppercase">Delivery Receipt Document</h3>
 <p className="text-[10px] text-zinc-500 font-medium">Ready for warehouse dispatch & customer sign-off</p>
 </div>
 </div>
 <button
 onClick={() => setShowDeliveryReceiptModal(false)}
 className="p-1.5 rounded-full hover:bg-m3-outline-variant/20 text-m3-on-surface-variant cursor-pointer"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 {/* PRINTABLE DOCKET CONTAINER WITH DUAL COPIES & RECEIVER SIGNATURE */}
  <div className="space-y-4 my-4 select-text text-left bir-receipt-container">
    {renderDeliveryReceiptCopy("STORE COPY")}

    <div className="relative flex py-2 items-center">
      <div className="flex-grow border-t-2 border-dashed border-gray-400"></div>
      <span className="flex-shrink mx-4 text-gray-600 font-mono text-[9px] font-black uppercase tracking-wider bg-gray-100 px-3 py-1 rounded-full border border-gray-300 shadow-xs">
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
  className="flex-1 py-2.5 text-xs font-bold rounded-full bg-m3-primary hover:bg-m3-primary/90 text-m3-on-primary transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm uppercase tracking-wider"
  >
  <Printer className="h-4 w-4" /> Print Delivery Receipt
  </button>
  <button
  onClick={() => setShowDeliveryReceiptModal(false)}
  className="px-5 py-2.5 text-xs font-bold rounded-full border border-m3-outline-variant hover:bg-m3-outline-variant/15 transition-colors cursor-pointer"
  >
  Close
  </button>
  </div>

  </div>
  </div>
  )}

  {/* SCHEDULE POS DELIVERY MODAL */}
  {showSchedulePosModal && (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div
        className="absolute inset-0 bg-gray-950/75 backdrop-blur-sm"
        onClick={() => setShowSchedulePosModal(false)}
      />
      <div className="relative w-full max-w-lg rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface text-left space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-m3-outline-variant/20 pb-3">
          <div>
            <h3 className="text-base font-black text-m3-on-surface uppercase flex items-center gap-2">
              <Truck className="h-5 w-5 text-m3-primary" />
              <span>Schedule Freight Delivery for POS Order</span>
            </h3>
            <p className="text-[11px] text-zinc-400 font-medium">
              Select an existing POS transaction invoice to dispatch via Freight Cargo
            </p>
          </div>
          <button
            onClick={() => setShowSchedulePosModal(false)}
            className="p-1 rounded-full hover:bg-m3-outline-variant/20 text-m3-on-surface-variant cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSchedulePosDeliverySubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase text-m3-on-surface-variant mb-1">
              Select POS Order Invoice <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedPosSaleId}
              onChange={(e) => handleSelectPosSale(e.target.value)}
              required
              className="w-full bg-m3-surface-lowest text-xs text-m3-on-surface font-mono font-bold border border-m3-outline-variant/30 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-m3-primary"
            >
              <option value="">-- Choose POS Transaction Order --</option>
              {sales.slice(0, 30).map((s) => (
                <option key={s.id} value={s.id}>
                  Ref: {s.saleNumber} | {s.customerName} | ₱{s.grandTotal.toFixed(2)} ({new Date(s.createdAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-m3-on-surface-variant mb-1">
                Recipient Customer Name
              </label>
              <input
                type="text"
                value={posDelivCustomerName}
                onChange={(e) => setPosDelivCustomerName(e.target.value)}
                placeholder="Full Name"
                className="w-full bg-m3-surface-lowest text-xs font-bold text-m3-on-surface border border-m3-outline-variant/30 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-m3-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-m3-on-surface-variant mb-1">
                Contact Phone Number
              </label>
              <input
                type="text"
                value={posDelivContact}
                onChange={(e) => setPosDelivContact(e.target.value)}
                placeholder="Phone number"
                className="w-full bg-m3-surface-lowest text-xs font-mono font-bold text-m3-on-surface border border-m3-outline-variant/30 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-m3-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-m3-on-surface-variant mb-1">
                House / Unit / Bldg No
              </label>
              <input
                type="text"
                value={posDelivHouseNo}
                onChange={(e) => setPosDelivHouseNo(e.target.value)}
                placeholder="House / Unit / Bldg No"
                className="w-full bg-m3-surface-lowest text-xs font-bold text-m3-on-surface border border-m3-outline-variant/30 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-m3-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-m3-on-surface-variant mb-1">
                Street / Avenue / Zone
              </label>
              <input
                type="text"
                value={posDelivStreet}
                onChange={(e) => setPosDelivStreet(e.target.value)}
                placeholder="Street / Avenue"
                className="w-full bg-m3-surface-lowest text-xs font-bold text-m3-on-surface border border-m3-outline-variant/30 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-m3-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-m3-on-surface-variant mb-1">
                Barangay Destination <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={posDelivBarangay}
                onChange={(e) => setPosDelivBarangay(e.target.value)}
                required
                placeholder="Barangay"
                className="w-full bg-m3-surface-lowest text-xs font-bold text-m3-on-surface border border-m3-outline-variant/30 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-m3-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-m3-on-surface-variant mb-1">
                City / Municipality
              </label>
              <input
                type="text"
                value={posDelivCity}
                onChange={(e) => setPosDelivCity(e.target.value)}
                placeholder="City / Municipality"
                className="w-full bg-m3-surface-lowest text-xs font-bold text-m3-on-surface border border-m3-outline-variant/30 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-m3-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-m3-on-surface-variant mb-1">
                Target Unloading Date
              </label>
              <input
                type="date"
                value={posDelivDate}
                onChange={(e) => setPosDelivDate(e.target.value)}
                className="w-full bg-m3-surface-lowest text-xs font-bold text-m3-on-surface border border-m3-outline-variant/30 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-m3-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-m3-on-surface-variant mb-1">
                Preferred Slot
              </label>
              <select
                value={posDelivTime}
                onChange={(e) => setPosDelivTime(e.target.value)}
                className="w-full bg-m3-surface-lowest text-xs font-bold text-m3-on-surface border border-m3-outline-variant/30 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-m3-primary"
              >
                <option value="08:00 AM - 12:00 PM">Morning Slot (08:00 AM - 12:00 PM)</option>
                <option value="10:00 AM - 02:00 PM">Midday Slot (10:00 AM - 02:00 PM)</option>
                <option value="01:00 PM - 05:00 PM">Afternoon Slot (01:00 PM - 05:00 PM)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-m3-on-surface-variant mb-1">
              Landmark / Handling Remarks
            </label>
            <input
              type="text"
              value={posDelivLandmark}
              onChange={(e) => setPosDelivLandmark(e.target.value)}
              placeholder="Landmark or special instructions"
              className="w-full bg-m3-surface-lowest text-xs font-bold text-m3-on-surface border border-m3-outline-variant/30 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-m3-primary"
            />
          </div>

          <div className="flex gap-2 pt-2 border-t border-m3-outline-variant/20">
            <button
              type="button"
              onClick={() => setShowSchedulePosModal(false)}
              className="flex-1 py-2.5 text-xs font-bold rounded-xl border border-m3-outline-variant/40 hover:bg-m3-outline-variant/15 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 text-xs font-black rounded-xl bg-m3-primary hover:bg-m3-primary/90 text-m3-on-primary transition-colors cursor-pointer shadow-sm uppercase tracking-wider"
            >
              Confirm Cargo Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  )}

  </div>
  );
};
