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
  AlertTriangle,
  Building2,
  Mail,
  Phone,
  Users,
  Edit2,
  Trash2,
  Package,
  Printer,
  Download
} from 'lucide-react';

interface ProcurementModuleProps {
  darkMode: boolean;
  defaultTab?: 'po' | 'suppliers';
}

export const ProcurementModule: React.FC<ProcurementModuleProps> = ({ darkMode, defaultTab = 'po' }) => {
  const {
    purchaseOrders,
    poItems,
    products,
    suppliers,
    branches,
    createPO,
    updatePOStatus,
    receivePOItems,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    currentUser
  } = useDb();

  // Active submodule tab selection
  const [activeSubTab, setActiveSubTab] = useState<'po' | 'suppliers'>(defaultTab);

  React.useEffect(() => {
    if (currentUser.role !== UserRole.ADMIN && activeSubTab === 'suppliers') {
      setActiveSubTab('po');
    }
  }, [currentUser.role, activeSubTab]);

  // Template state
  const [poTemplates, setPoTemplates] = useState<{
    id: string;
    name: string;
    supplierId: string;
    branchId: string;
    items: { productId: string; costPrice: number; quantityRequested: number }[];
    notes?: string;
  }[]>(() => {
    const cached = localStorage.getItem('tp_po_templates');
    return cached ? JSON.parse(cached) : [];
  });
  const [templateNameInput, setTemplateNameInput] = useState('');

  // Dialog configurations
  const [showPOModal, setShowPOModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  // Supplier forms editing/creation state
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [supName, setSupName] = useState('');
  const [supContactPerson, setSupContactPerson] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');

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

  // Exporting / Print state
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedPoForExport, setSelectedPoForExport] = useState<PurchaseOrder | null>(null);

  const companyName = localStorage.getItem('tilepoint_company_name_v1') || 'Emman Tile Center';
  const companyLogo = localStorage.getItem('tilepoint_store_logo_v1') || '';
  const taxRate = Number(localStorage.getItem('tilepoint_tax_rate_v1')) || 12;
  const currencySymbol = localStorage.getItem('tilepoint_currency_v1') || '₱';

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const allowedToModify = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER;

  // Supplier handlers
  const handleOpenAddSupplier = () => {
    setEditingSupplierId(null);
    setSupName('');
    setSupContactPerson('');
    setSupPhone('');
    setSupEmail('');
    setSupAddress('');
    setShowSupplierModal(true);
  };

  const handleOpenEditSupplier = (sup: any) => {
    setEditingSupplierId(sup.id);
    setSupName(sup.name);
    setSupContactPerson(sup.contactPerson || '');
    setSupPhone(sup.phone || '');
    setSupEmail(sup.email || '');
    setSupAddress(sup.address || '');
    setShowSupplierModal(true);
  };

  const handleSaveSupplier = () => {
    if (!supName.trim()) {
      showToast('Validation Error: Supplier Company Name is required.');
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
    if (confirm(`Are you absolutely sure you want to remove supplier "${name}"? Existing purchase orders and catalog records will be kept.`)) {
      deleteSupplier(id);
      showToast(`Supplier "${name}" was soft-deleted.`);
    }
  };

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
      showToast('Action Missing: Please select a product first.');
      return;
    }
    const targetProd = products.find(p => p.id === selectedProdId);
    if (!targetProd) return;

    const requested = Number(qtyRequestedInput) || 0;
    if (requested <= 0) {
      showToast('Quantity Error: Input volume must be greater than zero.');
      return;
    }

    // Check if product already in drafts list
    if (draftItems.some(i => i.productId === selectedProdId)) {
      showToast('Redundant SKU: This item has already been added to the requisition sheet.');
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
    showToast(`Drafted item: ${targetProd.productName}.`);
  };

  const removeDraftItem = (id: string) => {
    const pName = getProductName(id);
    setDraftItems(prev => prev.filter(item => item.productId !== id));
    showToast(`Removed ${pName} from draft list.`);
  };

  const handleSavePO = () => {
    if (draftItems.length === 0) {
      showToast('Blank Order: Requisition catalog list cannot be empty.');
      return;
    }

    createPO(selectedSupplierId, selectedBranchId, draftItems, poNotes);

    // Reset modals
    setDraftItems([]);
    setPoNotes('');
    setShowPOModal(false);
    showToast('PO drafted successfully and queued for Verification.');
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
      showToast('Quantity Error: Newly received volume must exceed zero.');
      return;
    }

    receivePOItems(activePo.id, receiveQuantities);
    setShowReceiveModal(false);
    showToast('Logistics Logged: Inventory stocks updated automatically.');
  };

  return (
    <div className="space-y-6 animate-fade-in text-m3-on-surface">
      {/* Top action trigger bar */}
      <div className="flex justify-between items-center bg-m3-surface-low/95 backdrop-blur-md p-4 rounded-[20px] border border-m3-outline-variant/20 sticky top-0 z-20 shadow-md">
        <div>
          <h3 className="text-xs font-black tracking-widest text-m3-primary uppercase font-mono">
            {activeSubTab === 'po' ? 'Supply Logistics Ledger' : 'Supplier Registry Management'}
          </h3>
          <p className="text-xs text-m3-on-surface-variant/80 mt-0.5">
            {activeSubTab === 'po' ? 'Procurement pipelines & delivery tracking' : 'Corporate manufacturer broker profiles database'}
          </p>
        </div>

        {allowedToModify && (
          <div>
            {activeSubTab === 'po' ? (
              <button
                onClick={() => {
                  setSelectedSupplierId(suppliers.filter(s => !s.isDeleted)[0]?.id || 'S1');
                  setSelectedBranchId(currentUser.branchAssignmentId || 'B1');
                  setDraftItems([]);
                  setShowPOModal(true);
                }}
                className="m3-btn-primary flex items-center gap-1.5 cursor-pointer shadow-sm text-xs shrink-0"
              >
                <Plus className="h-4 w-4" /> Requisition PO
              </button>
            ) : (
              <button
                onClick={handleOpenAddSupplier}
                className="m3-btn-primary flex items-center gap-1.5 cursor-pointer shadow-sm text-xs shrink-0"
              >
                <Plus className="h-4 w-4" /> Register Supplier
              </button>
            )}
          </div>
        )}
      </div>

      {/* Submodule Level Navigation Tabs */}
      <div className="flex border-b border-m3-outline-variant/15 gap-4">
        <button
          onClick={() => setActiveSubTab('po')}
          className={`pb-2 px-3 font-bold text-xs uppercase tracking-wider relative transition-all cursor-pointer ${
            activeSubTab === 'po'
              ? 'text-m3-primary border-b-2 border-m3-primary'
              : 'text-zinc-400 hover:text-m3-primary'
          }`}
        >
          Requisitions (PO)
        </button>
        {currentUser.role === UserRole.ADMIN && (
          <button
            onClick={() => setActiveSubTab('suppliers')}
            className={`pb-2 px-3 font-bold text-xs uppercase tracking-wider relative transition-all cursor-pointer ${
              activeSubTab === 'suppliers'
                ? 'text-m3-primary border-b-2 border-m3-primary'
                : 'text-zinc-400 hover:text-m3-primary'
            }`}
          >
            Enterprise Suppliers ({suppliers.filter(s => !s.isDeleted).length})
          </button>
        )}
      </div>

      {activeSubTab === 'po' ? (
        /* PO List Ledgers view */
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
                  <th className="py-3 px-4 text-center">Export</th>
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

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedPoForExport(po);
                            setShowExportModal(true);
                          }}
                          className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-zinc-950 border border-amber-650/15 rounded-full cursor-pointer flex items-center gap-1 transition-all hover:scale-103 mx-auto"
                        >
                          <FileText className="h-3 w-3" />
                          <span>Export</span>
                        </button>
                      </td>

                      {allowedToModify && (
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex gap-2 justify-center">
                            {po.status === 'Pending' && (
                              <button
                                onClick={() => {
                                  updatePOStatus(po.id, 'Approved');
                                  showToast(`Requisition slip ${po.poNumber} approved.`);
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
      ) : (
        /* Manage Suppliers Directory view */
        <div className="space-y-6">
          {/* Supplier Directory Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-4 rounded-2xl flex items-center gap-4">
              <div className="p-3 rounded-xl bg-m3-primary/10 text-m3-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block font-sans">Active Vendors</span>
                <span className="text-lg font-black font-mono leading-none">{suppliers.filter(s => !s.isDeleted).length} Registered</span>
              </div>
            </div>

            <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-4 rounded-2xl flex items-center gap-4">
              <div className="p-3 rounded-xl bg-m3-tertiary/10 text-m3-tertiary">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block font-sans">Pending Cargo Orders</span>
                <span className="text-lg font-black font-mono leading-none">
                  {purchaseOrders.filter(po => po.status !== 'Completed' && po.status !== 'Cancelled').length} Active POs
                </span>
              </div>
            </div>

            <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-4 rounded-2xl flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block font-sans">Manufacturer Brands</span>
                <span className="text-lg font-black font-mono leading-none">
                  {new Set(products.filter(p => !p.isDeleted).map(p => p.brand).filter(Boolean)).size} Brands cataloged
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
                {suppliers.filter(s => !s.isDeleted).map((sup) => (
                  <tr key={sup.id} className="hover:bg-m3-surface-low/50">
                    <td className="py-3.5 px-4 font-mono font-black text-m3-primary">{sup.id}</td>
                    <td className="py-3.5 px-4 font-bold text-sm text-m3-on-surface">{sup.name}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Users className="h-3.5 w-3.5 text-zinc-400" />
                        <span>{sup.contactPerson || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-zinc-400" />
                        <span>{sup.phone || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-zinc-400" />
                        <span>{sup.email || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-m3-on-surface-variant font-medium">{sup.address}</td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleOpenEditSupplier(sup)}
                          className="p-1 px-1.5 bg-m3-primary/10 hover:bg-m3-primary/20 text-m3-primary rounded"
                          title="Edit corporate profile"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSupplier(sup.id, sup.name)}
                          className="p-1 px-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded"
                          title="De-register supplier"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {suppliers.filter(s => !s.isDeleted).length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-m3-on-surface-variant font-medium">No registered supplier broker partners found. Click Register Supplier to add.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

            {/* FAST PO TEMPLATE LOADER */}
            <div className="md:col-span-2 bg-m3-primary/5 p-3 rounded-2xl border border-m3-outline-variant/30 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-m3-primary tracking-wider font-mono">Load PO Template:</span>
                <select
                  onChange={(e) => {
                    const templateId = e.target.value;
                    if (!templateId) return;
                    const selectedTemplate = poTemplates.find(t => t.id === templateId);
                    if (selectedTemplate) {
                      setSelectedSupplierId(selectedTemplate.supplierId);
                      setSelectedBranchId(selectedTemplate.branchId);
                      setDraftItems(selectedTemplate.items);
                      setPoNotes(selectedTemplate.notes || '');
                      showToast(`Template "${selectedTemplate.name}" loaded successfully.`);
                    }
                    e.target.value = '';
                  }}
                  className="bg-m3-surface-lowest border border-m3-outline-variant px-2.5 py-1 text-xs text-m3-on-surface focus:outline-none focus:border-m3-primary transition-colors rounded-lg cursor-pointer max-w-[200px]"
                >
                  <option value="">-- Select Template --</option>
                  {poTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              {poTemplates.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Are you sure you want to clear the templates database? This is permanent.")) {
                      localStorage.removeItem('tp_po_templates');
                      setPoTemplates([]);
                      showToast("All templates deleted.");
                    }
                  }}
                  className="text-[9px] text-red-500 hover:underline font-bold font-mono tracking-wide uppercase"
                >
                  Clear Saved
                </button>
              )}
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

            {/* DYNAMIC VENDOR DETAILS PANEL */}
            {(() => {
              const selectedSup = suppliers.find(s => s.id === selectedSupplierId);
              if (selectedSup) {
                return (
                  <div className="md:col-span-2 bg-m3-surface-lowest p-3 rounded-2xl border border-m3-outline-variant/30 text-xs text-m3-on-surface space-y-1 my-0.5 animate-fade-in">
                    <div className="flex justify-between items-center border-b border-m3-outline-variant/15 pb-1">
                      <span className="text-[9px] font-bold text-m3-primary uppercase tracking-widest">Active Vendor Contact Data</span>
                      <span className="text-[9px] font-mono font-bold bg-m3-primary/10 text-m3-primary px-2 py-0.5 rounded-full">{selectedSup.id}</span>
                    </div>
                    <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-m3-on-surface-variant text-[11px]">
                      <div><span className="font-bold text-m3-on-surface">Company:</span> {selectedSup.name}</div>
                      <div><span className="font-bold text-m3-on-surface">Contact Person:</span> {selectedSup.contactPerson || 'None listed'}</div>
                      <div><span className="font-bold text-m3-on-surface">Phone:</span> {selectedSup.phone || 'None listed'}</div>
                      <div><span className="font-bold text-m3-on-surface">Email:</span> {selectedSup.email || 'None listed'}</div>
                      <div className="sm:col-span-2"><span className="font-bold text-m3-on-surface">Address:</span> {selectedSup.address || 'None listed'}</div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

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

            {/* SAVE AS TEMPLATE AREA */}
            <div className="md:col-span-2 bg-m3-surface-lowest p-3.5 rounded-2xl border border-m3-outline-variant/30 flex flex-col sm:flex-row sm:items-end justify-between gap-3 my-0.5">
              <div className="space-y-1.5 flex-1 text-left">
                <label className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest pl-1">Save current draft specs as PO template</label>
                <input
                  type="text"
                  value={templateNameInput}
                  onChange={e => setTemplateNameInput(e.target.value)}
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
                    notes: poNotes
                  };
                  const updatedTemplates = [...poTemplates, newTemplate];
                  setPoTemplates(updatedTemplates);
                  localStorage.setItem('tp_po_templates', JSON.stringify(updatedTemplates));
                  setTemplateNameInput('');
                  showToast(`Saved template "${newTemplate.name}" successfully.`);
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

      {/* MODAL 3: Supplier Profile Manager (Create / Edit Supplier) */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="absolute inset-0 bg-gray-950/65 backdrop-blur-sm" onClick={() => setShowSupplierModal(false)} />
          <div className="relative w-full max-w-md rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface text-left space-y-4">
            <div className="flex justify-between items-center border-b border-m3-outline-variant/20 pb-2.5">
              <h3 className="text-base font-bold text-m3-primary flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                <span>{editingSupplierId ? 'Modify Company Profile' : 'Register New Vendor Supplier'}</span>
              </h3>
              <button onClick={() => setShowSupplierModal(false)} className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-m3-on-surface-variant/85 mt-1">
              Add corporate contact records. Suppliers can then be selected to provide products and fulfill purchase order requests.
            </p>

            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">Supplier Company Name</label>
                <input
                  type="text"
                  value={supName}
                  onChange={e => setSupName(e.target.value)}
                  placeholder="e.g. Republic Cement Corp."
                  className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-lg font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">Primary Contact Agent</label>
                <input
                  type="text"
                  value={supContactPerson}
                  onChange={e => setSupContactPerson(e.target.value)}
                  placeholder="e.g. Engr. Juan Dela Cruz"
                  className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">Phone Target</label>
                  <input
                    type="text"
                    value={supPhone}
                    onChange={e => setSupPhone(e.target.value)}
                    placeholder="e.g. +63 917 888 1234"
                    className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-lg font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">Corporate Email</label>
                  <input
                    type="email"
                    value={supEmail}
                    onChange={e => setSupEmail(e.target.value)}
                    placeholder="e.g. sales@republiccement.com"
                    className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-lg"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">Physical HQ Address</label>
                <textarea
                  value={supAddress}
                  onChange={e => setSupAddress(e.target.value)}
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

      {showExportModal && selectedPoForExport && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-zinc-950/75 backdrop-blur-sm [color-scheme:light] print:p-0 print:bg-white overflow-y-auto">
          {/* Overlay dismissal */}
          <div className="absolute inset-0 bg-transparent print:hidden" onClick={() => setShowExportModal(false)} />

          <div className="bg-[#1c1e26] dark:bg-[#1c1e26] border border-zinc-850 rounded-3xl max-w-3xl w-full p-6 shadow-2xl relative flex flex-col max-h-[92vh] z-10 print:bg-white print:border-0 print:shadow-none print:p-0 print:max-h-none print:w-full">
            {/* Modal actions panel - Hidden on prints */}
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-4 mb-4 shrink-0 print:hidden text-white">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-extrabold uppercase tracking-wider font-mono">Purchase Order Transmittal Sheet</h3>
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

            {/* Scrollable document viewport */}
            <div className="overflow-y-auto flex-1 pr-1 print:overflow-visible print:p-0">
              {/* Paper Layout */}
              <div 
                id="printable-po" 
                className="bg-white text-zinc-900 p-8 rounded-2xl shadow-inner border border-zinc-200/80 font-sans text-xs flex flex-col space-y-6 print:border-0 print:shadow-none print:p-0 print:bg-white print:text-black"
              >
                
                {/* 1. Header & Logo Row */}
                <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-center p-0.5 overflow-hidden shrink-0">
                      {companyLogo ? (
                        <img src={companyLogo} alt="Corporate Logo" className="w-full h-full object-contain" />
                      ) : (
                        <div className="font-black text-xs text-zinc-800 tracking-wider">
                          {companyName.toUpperCase().slice(0, 2)}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-zinc-900 uppercase tracking-tight">{companyName}</h4>
                      <p className="text-[10px] text-zinc-500">Retail & Supply Logistics Terminal</p>
                      {(() => {
                        const exportingBranch = branches.find(b => b.id === selectedPoForExport.branchId);
                        return exportingBranch && (
                          <p className="text-[9px] text-zinc-400 font-mono mt-0.5">
                            Hometown Branch: {exportingBranch.name} • {exportingBranch.phone}
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-lg font-black text-zinc-900 tracking-wide uppercase">PURCHASE ORDER</h2>
                    <div className="font-mono mt-1 space-y-0.5 text-[10px]">
                      <div className="text-zinc-650">Ref ID: <span className="font-extrabold text-zinc-900">{selectedPoForExport.poNumber}</span></div>
                      <div className="text-zinc-500">Date Requested: <span className="font-extrabold text-zinc-800">{selectedPoForExport.date}</span></div>
                      <div className="text-zinc-550">Status Code: <span className="px-1.5 py-0.5 bg-zinc-100 uppercase rounded text-[9px] font-black border border-zinc-300 text-zinc-800">{selectedPoForExport.status}</span></div>
                    </div>
                  </div>
                </div>

                {/* 2. Addresses Row */}
                <div className="grid grid-cols-2 gap-6 leading-relaxed">
                  {/* Supplier Card */}
                  <div className="p-3.5 border border-zinc-200 rounded-xl bg-zinc-50/50">
                    <h5 className="font-extrabold text-zinc-500 text-[9px] uppercase tracking-wider mb-1.5 border-b border-zinc-250 pb-0.5">Origin Vendor (Supplier)</h5>
                    <div className="space-y-0.5 text-[10.5px]">
                      {(() => {
                        const exportingSupplier = suppliers.find(s => s.id === selectedPoForExport.supplierId);
                        return exportingSupplier ? (
                          <>
                            <div className="font-black text-zinc-900">{exportingSupplier.name}</div>
                            <div className="text-zinc-700 font-sans">Contact Agent: <span className="font-bold">{exportingSupplier.contactPerson || 'N/A'}</span></div>
                            <div className="text-zinc-650 font-sans">Direct Phone: {exportingSupplier.phone || 'N/A'}</div>
                            <div className="text-zinc-650 font-sans">Direct Email: {exportingSupplier.email || 'N/A'}</div>
                            <div className="text-zinc-500 font-sans mt-1 max-w-[300px]">Address: {exportingSupplier.address || 'N/A'}</div>
                          </>
                        ) : (
                          <div className="text-zinc-400 italic text-[10px]">Supplier record missing from repository bounds</div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Destination Card */}
                  <div className="p-3.5 border border-zinc-200 rounded-xl bg-zinc-50/50">
                    <h5 className="font-extrabold text-zinc-500 text-[9px] uppercase tracking-wider mb-1.5 border-b border-zinc-250 pb-0.5">Ship Delivery Destination</h5>
                    <div className="space-y-0.5 text-[10.5px]">
                      <div className="font-black text-zinc-900">{companyName}</div>
                      {(() => {
                        const exportingBranch = branches.find(b => b.id === selectedPoForExport.branchId);
                        return exportingBranch ? (
                          <>
                            <div className="text-zinc-750 font-sans">Branch: <span className="font-extrabold">{exportingBranch.name}</span></div>
                            <div className="text-zinc-650 font-sans">Telephone: {exportingBranch.phone || 'N/A'}</div>
                            <div className="text-zinc-600 font-sans mt-0.5 max-w-[300px]">Delivery HQ Address: {exportingBranch.address || 'N/A'}</div>
                            <div className="text-zinc-500 font-sans mt-0.5">Ordered By Agent: <span className="font-mono">{selectedPoForExport.requestedBy}</span></div>
                          </>
                        ) : (
                          <>
                            <div className="text-zinc-640">Registered Corporate Hub</div>
                            <div className="text-zinc-500 mt-0.5">Ordered By Agent: <span className="font-mono">{selectedPoForExport.requestedBy}</span></div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* 3. Items Materials Table */}
                <div className="border border-zinc-200 rounded-xl overflow-hidden mt-2">
                  <table className="w-full text-left font-sans text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-100 text-zinc-700 font-extrabold text-[9px] uppercase tracking-wider border-b border-zinc-200">
                        <th className="py-2.5 px-3">Catalog Item Code</th>
                        <th className="py-2.5 px-3">Material Segment Description</th>
                        <th className="py-2.5 px-3 text-center">Qty Required</th>
                        <th className="py-2.5 px-3 text-right">Raw Cost Unit</th>
                        <th className="py-2.5 px-3 text-right">Sum Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-150">
                      {(() => {
                        const exportingPoItems = poItems.filter(item => item.poId === selectedPoForExport.id);
                        return exportingPoItems.map((item) => {
                          const product = products.find(p => p.id === item.productId);
                          const lineTotal = item.costPrice * item.quantityRequested;
                          return (
                            <tr key={item.id} className="hover:bg-zinc-50/50 text-zinc-800">
                              <td className="py-2.5 px-3 font-mono font-bold text-zinc-900 text-[10px]">{product?.sku || item.productId}</td>
                              <td className="py-2.5 px-3">
                                <span className="font-bold text-zinc-900">{product?.name || 'Unknown Tile Material'}</span>
                                {product?.category && <span className="text-[9px] text-zinc-400 block font-mono">{product.category}</span>}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold">{item.quantityRequested} pcs</td>
                              <td className="py-2.5 px-3 text-right font-mono">{currencySymbol}{item.costPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-900">{currencySymbol}{lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                          );
                        });
                      })()}
                      {poItems.filter(item => item.poId === selectedPoForExport.id).length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-zinc-400 italic">No products compiled inside this purchase order.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 4. Notes & Summary Totals Block */}
                <div className="grid grid-cols-2 gap-6 pt-2 leading-relaxed">
                  <div className="space-y-2">
                    <div className="p-3 border border-zinc-150 rounded-xl bg-zinc-50/20 text-[9.5px]">
                      <h6 className="font-black text-zinc-800 tracking-wider uppercase text-[8.5px] mb-1">Logistics Notes / Directives</h6>
                      <p className="text-zinc-600 italic whitespace-pre-wrap">{selectedPoForExport.notes || 'No custom transmittal notes declared.'}</p>
                    </div>
                    <div className="space-y-1 text-[9.5px] text-zinc-500 font-mono">
                      <div>Transmittal Security Hash: sealed</div>
                      <div>System ID Seal: {selectedPoForExport.id}</div>
                    </div>
                  </div>

                  {(() => {
                    const exportingPoItems = poItems.filter(item => item.poId === selectedPoForExport.id);
                    const exportingSubtotal = exportingPoItems.reduce((acc, curr) => acc + (curr.costPrice * curr.quantityRequested), 0);
                    const exportingTaxAmount = (exportingSubtotal * taxRate) / 100;
                    const exportingGrandTotal = exportingSubtotal + exportingTaxAmount;
                    return (
                      <div className="flex flex-col justify-end space-y-1.5 border border-zinc-200 p-4 rounded-xl bg-zinc-100/30">
                        <div className="flex justify-between items-center text-zinc-600 text-[10px]">
                          <span>Subtotal Weight Amount:</span>
                          <span className="font-mono font-bold">{currencySymbol}{exportingSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center text-zinc-650 text-[10px]">
                          <span>Tax Assessment (VAT {taxRate}%):</span>
                          <span className="font-mono font-bold">{currencySymbol}{exportingTaxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-black text-zinc-900 border-t border-zinc-300 pt-1.5">
                          <span className="uppercase tracking-wide font-sans text-[10px]">Grand Payable Total:</span>
                          <span className="font-mono text-zinc-900 text-sm">{currencySymbol}{exportingGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 5. Printable Footer Signatures */}
                <div className="pt-10 flex justify-between items-end border-t border-dashed border-zinc-250 text-zinc-700">
                  <div className="text-left w-1/3">
                    <div className="border-b border-zinc-800 text-center pb-1 font-mono font-bold text-[10px] text-zinc-900 min-h-[22px]">{selectedPoForExport.requestedBy}</div>
                    <div className="text-[9px] uppercase tracking-wider text-zinc-500 text-center font-extrabold mt-1 font-sans">Requisitioned By</div>
                  </div>
                  <div className="text-right w-1/3">
                    <div className="border-b border-zinc-800 text-center pb-1 min-h-[22px]" />
                    <div className="text-[9px] uppercase tracking-wider text-zinc-500 text-center font-extrabold mt-1 font-sans">Authorized Audit Stamp</div>
                  </div>
                </div>

              </div>
            </div>

            {/* Dynamic CSS wrapper for seamless, borderless print mapping */}
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
                }
              }
            `}</style>
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
