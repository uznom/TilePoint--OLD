/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useDb } from '../context/DbContext';
import { PurchaseOrder, UserRole } from '../types/db';
import {
  FileText,
  Truck,
  Plus,
  X,
  MapPin,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

interface ProcurementModuleProps {
  darkMode: boolean;
}

export const ProcurementModule: React.FC<ProcurementModuleProps> = ({ darkMode }) => {
  const {
    purchaseOrders,
    poItems,
    products,
    suppliers,
    branches,
    createPO,
    updatePOStatus,
    receivePOItems,
    currentUser
  } = useDb();

  // Dialog configurations
  const [showPOModal, setShowPOModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  // Draft building state
  const [selectedSupplierId, setSelectedSupplierId] = useState('S1');
  const [selectedBranchId, setSelectedBranchId] = useState('B1');
  const [poNotes, setPoNotes] = useState('');
  const [draftItems, setDraftItems] = useState<{ productId: string; costPrice: number; quantityRequested: number }[]>([]);

  // Item selector helpers
  const [selectedProdId, setSelectedProdId] = useState('');
  const [qtyRequestedInput, setQtyRequestedInput] = useState('100');

  // Receiving state
  const [activePo, setActivePo] = useState<PurchaseOrder | null>(null);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({}); // productId -> newlyReceived

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const allowedToModify = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER;

  // Render lists
  const activeProductsForSupplier = products.filter(p => !p.isDeleted); // allow adding all registered products

  const getSuplierName = (id: string) => {
    const s = suppliers.find(sup => sup.id === id);
    return s ? s.name : 'Unknown Supplier';
  };

  const getBranchName = (id: string) => {
    const b = branches.find(br => br.id === id);
    return b ? b.name : 'Unknown Branch';
  };

  const getProductName = (id: string) => {
    const p = products.find(prod => prod.id === id);
    return p ? p.productName : 'Generic Item';
  };

  // Draft mechanics
  const addDraftItem = () => {
    if (!selectedProdId) {
      showToast('⚠️ Action Missing: Please select a product first.');
      return;
    }
    const targetProd = products.find(p => p.id === selectedProdId);
    if (!targetProd) return;

    const requested = Number(qtyRequestedInput) || 0;
    if (requested <= 0) {
      showToast('⚠️ Quantity Error: Input volume must be greater than zero.');
      return;
    }

    // Check if product already in drafts list
    if (draftItems.some(i => i.productId === selectedProdId)) {
      showToast('⚠️ Redundant SKU: This item has already been added to the requisition sheet.');
      return;
    }

    setDraftItems(prev => [
      ...prev,
      {
        productId: selectedProdId,
        costPrice: targetProd.costPrice,
        quantityRequested: requested,
      }
    ]);

    // Reset item selectors
    setSelectedProdId('');
    setQtyRequestedInput('100');
    showToast(`🟢 Drafted item: ${targetProd.productName}.`);
  };

  const removeDraftItem = (id: string) => {
    const pName = getProductName(id);
    setDraftItems(prev => prev.filter(item => item.productId !== id));
    showToast(`🗑️ Removed ${pName} from draft list.`);
  };

  const handleSavePO = () => {
    if (draftItems.length === 0) {
      showToast('⚠️ Blank Order: Requisition catalog list cannot be empty.');
      return;
    }

    createPO(selectedSupplierId, selectedBranchId, draftItems, poNotes);

    // Reset modals
    setDraftItems([]);
    setPoNotes('');
    setShowPOModal(false);
    showToast('🟢 PO drafted successfully and queued for Verification.');
  };

  // Open cargo receipts
  const handleOpenReceive = (po: PurchaseOrder) => {
    setActivePo(po);
    const relatedItems = poItems.filter(item => item.poId === po.id);

    // Populate receive array with pending quantities
    const quantities: Record<string, number> = {};
    relatedItems.forEach(it => {
      const pendingQty = Math.max(0, it.quantityRequested - it.quantityReceived);
      quantities[it.productId] = pendingQty; // default input is fully received
    });

    setReceiveQuantities(quantities);
    setShowReceiveModal(true);
  };

  const submitCargoReceived = () => {
    if (!activePo) return;

    // Check received values validity
    let totalReceived = 0;
    Object.values(receiveQuantities).forEach(v => {
      totalReceived += Number(v) || 0;
    });

    if (totalReceived <= 0) {
      showToast('⚠️ Quantity Error: Newly received volume must exceed zero.');
      return;
    }

    receivePOItems(activePo.id, receiveQuantities);
    setShowReceiveModal(false);
    showToast('🚚 Logistics Logged: Inventory stocks updated automatically.');
  };

  return (
    <div className="space-y-6 animate-fade-in text-m3-on-surface">
      {/* Top action trigger bar */}
      <div className="flex justify-between items-center bg-m3-surface-low/95 backdrop-blur-md p-4 rounded-[20px] border border-m3-outline-variant/20 sticky top-0 z-20 shadow-md">
        <div>
          <h3 className="text-xs font-black tracking-widest text-m3-primary uppercase font-mono">Supply Logistics Ledger</h3>
          <p className="text-xs text-m3-on-surface-variant/80 mt-0.5">Procurement pipelines & delivery tracking</p>
        </div>

        {allowedToModify && (
          <button
            onClick={() => {
              setSelectedSupplierId(suppliers[0]?.id || 'S1');
              setSelectedBranchId(currentUser.branchAssignmentId || 'B1');
              setDraftItems([]);
              setShowPOModal(true);
            }}
            className="m3-btn-primary flex items-center gap-1.5 cursor-pointer shadow-sm text-xs shrink-0"
          >
            <Plus className="h-4 w-4" /> Requisition PO
          </button>
        )}
      </div>

      {/* PO List Ledgers view */}
      <div className="grid grid-cols-1 gap-6 items-start">
        <div className="m3-card shadow-sm overflow-x-auto p-0">
          <table className="w-full text-xs text-left border-collapse table-auto min-w-[900px]">
            <thead>
              <tr className="border-b border-m3-outline-variant/20 bg-m3-surface/30 text-[10px] uppercase font-bold text-m3-on-surface-variant tracking-wider">
                <th className="py-3 px-4">PO Document Ref</th>
                <th className="py-3 px-4">Origin Supplier</th>
                <th className="py-3 px-4">Destination Branch</th>
                <th className="py-3 px-4 text-center">Date Requested</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Drafted By</th>
                {allowedToModify && <th className="py-3 px-4 text-center">Command Operational Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-m3-outline-variant/10 text-m3-on-surface/90">
              {purchaseOrders.map((po) => {
                const relatedPoItems = poItems.filter(item => item.poId === po.id);
                // Status color triggers
                let statusBadge = 'bg-m3-outline-variant/20 text-m3-on-surface';
                if (po.status === 'Pending') statusBadge = 'bg-m3-primary-container text-m3-on-primary-container border-m3-primary/25';
                if (po.status === 'Approved' || po.status === 'Ordered') statusBadge = 'bg-m3-tertiary-container text-m3-on-tertiary-container border border-m3-tertiary/25';
                if (po.status === 'Completed') statusBadge = 'bg-m3-tertiary-container text-m3-on-tertiary-container border-transparent';
                if (po.status === 'Partially Received') statusBadge = 'bg-m3-secondary-container text-m3-on-secondary-container';

                return (
                  <tr key={po.id} className="hover:bg-m3-surface-low/50">
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-m3-primary font-mono text-xs">{po.poNumber}</div>
                      <div className="text-[10px] text-m3-on-surface-variant font-medium">{relatedPoItems.length} material segments req.</div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-m3-on-surface">{getSuplierName(po.supplierId)}</td>

                    {/* Destination Branch */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-bold">
                        <MapPin className="h-3.5 w-3.5 text-m3-primary" />
                        <span>{getBranchName(po.branchId)}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono font-bold text-m3-on-surface">{po.date}</td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest border uppercase ${statusBadge}`}>
                        {po.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right text-m3-on-surface-variant font-mono">
                      {po.requestedBy}
                    </td>

                    {allowedToModify && (
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex gap-2 justify-center">
                          {po.status === 'Pending' && (
                            <button
                              onClick={() => {
                                updatePOStatus(po.id, 'Approved');
                                showToast(`🟢 Requisition slip ${po.poNumber} approved.`);
                              }}
                              className="px-3 py-1 text-[10.5px] font-bold bg-m3-primary/5 hover:bg-m3-primary/10 text-m3-primary border border-m3-primary/30 rounded-full cursor-pointer transition-colors"
                            >
                              Approve Draft
                            </button>
                          )}

                          {(po.status === 'Approved' || po.status === 'Ordered' || po.status === 'Partially Received') && (
                            <button
                              onClick={() => handleOpenReceive(po)}
                              className="px-3 py-1 text-[10.5px] font-black bg-m3-tertiary/5 hover:bg-m3-tertiary/10 text-m3-tertiary border border-m3-tertiary/30 rounded-full cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Truck className="h-3.5 w-3.5" /> Receive Cargo Delivery
                            </button>
                          )}

                          {po.status === 'Completed' && (
                            <span className="text-[10px] text-m3-on-surface-variant/70 font-semibold italic">Settled & Completed</span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {purchaseOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-m3-on-surface-variant font-medium">No purchase order records registered.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Requisition Builder (Create Draft PO) */}
      {showPOModal && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="absolute inset-0 bg-gray-950/65 backdrop-blur-sm" onClick={() => setShowPOModal(false)} />
          <div className="relative w-full max-w-2xl rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="md:col-span-2 flex justify-between items-center border-b border-m3-outline-variant/20 pb-2.5 flex-shrink-0">
              <h3 className="text-base font-bold text-m3-primary flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <span>Compiler: Bulk Purchase Requisition</span>
              </h3>
              <button onClick={() => setShowPOModal(false)} className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* General Specs */}
            <div className="space-y-1 relative">
              <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">Vendor Supplier</label>
              <select
                value={selectedSupplierId}
                onChange={e => setSelectedSupplierId(e.target.value)}
                className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md cursor-pointer"
              >
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="space-y-1 relative">
              <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">Warehouse / Branch Assignment</label>
              <select
                value={selectedBranchId}
                onChange={e => setSelectedBranchId(e.target.value)}
                className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md cursor-pointer"
              >
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            {/* Item selector widget within drafting panel */}
            <div className="md:col-span-2 bg-m3-surface-lowest p-4 rounded-2xl border border-m3-outline-variant/30 my-1 grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div className="space-y-1 relative text-left">
                <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">Product catalog Lookup</label>
                <select
                  value={selectedProdId}
                  onChange={e => setSelectedProdId(e.target.value)}
                  className="w-full bg-m3-surface border-b-2 border-m3-outline-variant px-3 py-2 text-xs text-m3-on-surface focus:outline-none focus:border-m3-primary transition-colors rounded-t-md cursor-pointer"
                >
                  <option value="">-- Choose active catalog item --</option>
                  {activeProductsForSupplier.map(p => (
                    <option key={p.id} value={p.id}>{p.productName} (Code: {p.productCode})</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <div className="space-y-1 relative text-left flex-1">
                  <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">Volume requested</label>
                  <input
                    type="number"
                    value={qtyRequestedInput}
                    onChange={e => setQtyRequestedInput(e.target.value)}
                    className="w-full bg-m3-surface border-b-2 border-m3-outline-variant px-3 py-2 text-xs text-m3-on-surface focus:outline-none focus:border-m3-primary transition-colors font-mono font-black rounded-t-md"
                  />
                </div>

                <button
                  type="button"
                  onClick={addDraftItem}
                  className="px-5 py-2 text-xs font-black bg-m3-primary text-m3-surface hover:bg-m3-primary/95 shadow-sm rounded-full cursor-pointer h-9 shrink-0 self-end transition-transform active:scale-95"
                >
                  Insert Item
                </button>
              </div>
            </div>

            {/* Added Draft items table */}
            <div className="md:col-span-2 space-y-2 border-t border-m3-outline-variant/15 pt-3 max-h-[160px] overflow-y-auto">
              <h4 className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">Selected Draft Items ({draftItems.length})</h4>

              {draftItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3.5 bg-m3-surface border border-m3-outline-variant/35 rounded-2xl shadow-sm">
                  <div>
                    <h5 className="text-xs font-bold text-m3-on-surface">{getProductName(item.productId)}</h5>
                    <span className="text-[10px] text-m3-on-surface-variant font-mono">Supplier Unit Cost: ₱{item.costPrice.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold font-mono">Volume Requested: {item.quantityRequested}</span>
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
                <div className="text-center py-4 text-xs text-m3-on-surface-variant italic">No products compiled in PO draft yet.</div>
              )}
            </div>

            {/* Note fields */}
            <div className="md:col-span-2 space-y-1 relative">
              <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">Procurement Request Notes (Optional)</label>
              <input
                type="text"
                value={poNotes}
                onChange={e => setPoNotes(e.target.value)}
                placeholder="e.g. Critical stock refilling"
                className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md"
              />
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
          <div className="absolute inset-0 bg-gray-950/65 backdrop-blur-sm" onClick={() => setShowReceiveModal(false)} />
          <div className="relative w-full max-w-lg rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface text-left space-y-4">
            <div className="flex justify-between items-center border-b border-m3-outline-variant/20 pb-2.5">
              <h3 className="text-base font-bold text-m3-primary flex items-center gap-2">
                <Truck className="h-5 w-5" />
                <span>Deliver cargo: {activePo.poNumber}</span>
              </h3>
              <button onClick={() => setShowReceiveModal(false)} className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-m3-on-surface-variant/80 mt-1 leading-relaxed">
              Specify quantities actually received at warehouse loading dock. Partially received POs will stay open.
            </p>

            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
              {poItems.filter(item => item.poId === activePo.id).map((item, idx) => {
                const pendingCount = Math.max(0, item.quantityRequested - item.quantityReceived);
                return (
                  <div key={idx} className="p-3 bg-m3-surface border border-m3-outline-variant/35 rounded-2xl flex justify-between items-center shadow-sm">
                    <div>
                      <h5 className="text-xs font-bold text-m3-on-surface">{getProductName(item.productId)}</h5>
                      <div className="text-[10px] text-m3-on-surface-variant flex items-center gap-1.5 mt-0.5 font-mono">
                        <span>Requested: {item.quantityRequested}</span>
                        <span>•</span>
                        <span>Already Recv: {item.quantityReceived}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-bold text-m3-primary uppercase font-mono pl-1">Newly Recv:</label>
                      <input
                        type="number"
                        max={pendingCount}
                        value={receiveQuantities[item.productId] ?? 0}
                        onChange={e => {
                          const val = Math.min(pendingCount, Math.max(0, Number(e.target.value) || 0));
                          setReceiveQuantities(prev => ({
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
