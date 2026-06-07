/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useDb } from '../context/DbContext';
import { Transmittal, TransmittalDocType, UserRole } from '../types/db';
import {
  Send,
  Download,
  Upload,
  CheckSquare,
  Plus,
  X,
  FileCheck,
  ShieldCheck
} from 'lucide-react';

interface TransmittalModuleProps {
  darkMode: boolean;
}

export const TransmittalModule: React.FC<TransmittalModuleProps> = ({ darkMode }) => {
  const {
    transmittals,
    branches,
    createTransmittal,
    updateTransmittalStatus,
    currentUser,
    addAuditLog,
    branchStock,
    products,
    sales
  } = useDb();

  // Create Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<TransmittalDocType>('Daily Sales Report');
  const [toBranchId, setToBranchId] = useState('B2');
  const [payloadText, setPayloadText] = useState('{\n  "totalSales": 35400,\n  "discrepancies": 0,\n  "countVerified": true\n}');
  const [notes, setNotes] = useState('');

  const compileBranchData = (docType: TransmittalDocType) => {
    const currentBranchId = currentUser.branchAssignmentId || 'B1';
    const bName = getBranchName(currentBranchId);

    if (docType === 'Full Branch State Snapshot') {
      const filteredStocks = branchStock.filter(bs => bs.branchId === currentBranchId).map(bs => {
        const p = products.find(prod => prod.id === bs.productId);
        return {
          productId: bs.productId,
          productName: p ? p.productName : 'Unknown Tile',
          sku: p ? p.sku : '',
          quantity: bs.quantity
        };
      });

      const branchSales = sales.filter(s => s.branchId === currentBranchId && !s.isDeleted);

      const packet = {
        compiledAt: new Date().toISOString(),
        branchId: currentBranchId,
        branchName: bName,
        operatorName: currentUser.fullName,
        recordCounts: {
          inventoryStocksCount: filteredStocks.length,
          salesTrackerCount: branchSales.length,
        },
        inventoryStocks: filteredStocks,
        salesHistory: branchSales,
        authSignature: `TP-SECURE-STAMP-${currentBranchId}-${Math.floor(Math.random() * 90000 + 10000)}`
      };

      setPayloadText(JSON.stringify(packet, null, 2));
      setNotes(`Automated snapshot compilation: ${filteredStocks.length} stocks, ${branchSales.length} sales records.`);
      showToast('🟢 Full core database of branch compiled into snapshot packet!');
    } else if (docType === 'Daily Sales Report') {
      const branchSales = sales.filter(s => s.branchId === currentBranchId && !s.isDeleted);
      const totalAmount = branchSales.reduce((sum, s) => sum + s.grandTotal, 0);
      const packet = {
        compiledAt: new Date().toISOString(),
        branchId: currentBranchId,
        branchName: bName,
        reportDate: new Date().toISOString().slice(0, 10),
        registeredSalesTransactions: branchSales.length,
        totalSalesValue: totalAmount,
        currency: 'PHP',
        verifiedBy: currentUser.fullName
      };
      setPayloadText(JSON.stringify(packet, null, 2));
      setNotes(`Daily sales ledger report: ${branchSales.length} transactions, total: ₱${totalAmount.toLocaleString()}`);
      showToast('🟢 Branch Sales ledger record compiled.');
    } else if (docType === 'Inventory Count Report') {
      const filteredStocks = branchStock.filter(bs => bs.branchId === currentBranchId).map(bs => {
        const p = products.find(prod => prod.id === bs.productId);
        return {
          productId: bs.productId,
          productName: p ? p.productName : 'Unknown Tile',
          sku: p ? p.sku : '',
          quantity: bs.quantity
        };
      });
      const packet = {
        compiledAt: new Date().toISOString(),
        branchId: currentBranchId,
        branchName: bName,
        inventoryVerifiedCount: filteredStocks.length,
        stocks: filteredStocks
      };
      setPayloadText(JSON.stringify(packet, null, 2));
      setNotes(`Stock count Audit: verified ${filteredStocks.length} physical line levels.`);
      showToast('🟢 Core branch stock allocations compiled.');
    } else {
      const packet = {
        compiledAt: new Date().toISOString(),
        branchId: currentBranchId,
        branchName: bName,
        operator: currentUser.fullName,
        docCategory: docType
      };
      setPayloadText(JSON.stringify(packet, null, 2));
      showToast('🟢 Base digital cargo packet compiled.');
    }
  };

  // Selected details modal
  const [activeTrans, setActiveTrans] = useState<Transmittal | null>(null);

  // Custom visual feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [rawImportText, setRawImportText] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const getBranchName = (id: string) => {
    const b = branches.find(br => br.id === id);
    return b ? b.name : 'Unknown Branch';
  };

  const handleCreateTrans = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate payload shape JSON
    try {
      JSON.parse(payloadText);
    } catch (err) {
      showToast('❌ JSON Syntax Error: Payload must be properly structured.');
      return;
    }

    createTransmittal(selectedDocType, toBranchId, payloadText, notes);

    // Reset modals
    setNotes('');
    setPayloadText('{\n  "totalSales": 35400,\n  "discrepancies": 0,\n  "countVerified": true\n}');
    setShowModal(false);
    showToast('🟢 Ledger packet dispatched to matching destination branch.');
  };

  const handleExportTransmittal = (t: Transmittal) => {
    const slip = {
      transmittalId: t.id,
      docType: t.documentType,
      sentFrom: getBranchName(t.fromBranchId),
      sentTo: getBranchName(t.toBranchId),
      submittedBy: t.submittedBy,
      submittedAt: t.submittedAt,
      contents: JSON.parse(t.payloadJson),
      notes: t.notes
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(slip, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `TilePoint_Transmittal_${t.id}.json`);
    dlAnchorElem.click();
    addAuditLog('TRANSMITTAL_EXPORT', `Downloaded transmittal slip JSON for ${t.id}`, 'Transmittals', t.id);
    showToast(`💾 Slip downloaded to TilePoint_Transmittal_${t.id}.json successfully.`);
  };

  const handleOpenImport = () => {
    setRawImportText('');
    setShowImportModal(true);
  };

  const executeLocalImport = () => {
    if (!rawImportText.trim()) {
      showToast('❌ Please paste a valid JSON transmittal packet.');
      return;
    }

    try {
      const parsed = JSON.parse(rawImportText);
      if (parsed.transmittalId && parsed.docType) {
        // Construct transmittal entry
        createTransmittal(
          parsed.docType as TransmittalDocType,
          currentUser.branchAssignmentId, // to current cashier branch
          JSON.stringify(parsed.contents || {}),
          `Imported cargo: ${parsed.notes || 'No description'}. (Origin: ${parsed.sentFrom})`
        );
        setShowImportModal(false);
        showToast('🟢 Transmittal slip parsed, cataloged, and approved.');
      } else {
        showToast('❌ Format Mismatch: Ledger packet lacks transmittal identification schema.');
      }
    } catch (err) {
      showToast('❌ Syntax Error: Failed to parse raw text packet contents.');
    }
  };

  const currentBranch = branches.find(b => b.id === currentUser.branchAssignmentId);
  const isAuthorizedBranch = currentUser.branchAssignmentId === 'B1' || (currentBranch && currentBranch.isDistributionBranch);

  if (!isAuthorizedBranch) {
    return (
      <div className="space-y-6 animate-fade-in text-m3-on-surface">
        <div className="bg-m3-surface-low p-8 rounded-[28px] border border-m3-outline-variant/30 text-center max-w-lg mx-auto my-12 space-y-4 shadow-xl">
          <div className="mx-auto h-16 w-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
            <Send className="h-7 w-7 text-amber-500 animate-pulse" />
          </div>
          <div>
            <h4 className="text-base font-black text-m3-on-surface uppercase tracking-wider">Transmittals Restricted</h4>
            <p className="text-[10px] text-zinc-400 font-bold font-mono uppercase tracking-widest mt-1">LOGISTICS PRIVILEGE LOCK</p>
          </div>
          <p className="text-xs text-m3-on-surface-variant leading-relaxed">
            Inter-Branch Digital Transmittals are restricted for <strong className="font-bold text-m3-on-surface">{currentBranch ? currentBranch.name : 'your branch'}</strong>.
            Under standard distribution parameters, only the <strong className="font-black text-amber-500">Main HQ Branch</strong> or dynamically designated <strong className="text-emerald-500 font-bold">Distribution Hubs</strong> are authorized to dispatch or import digital transmittals.
          </p>
          <div className="pt-2 text-[10px] font-bold text-zinc-500 font-mono">
            💡 Instruct the System Administrator to designate this location as a Distribution Hub in Branch settings.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-m3-on-surface">
      {/* Search Header and actions */}
      <div className="flex justify-between items-center bg-m3-surface-low/95 backdrop-blur-md p-4 rounded-[20px] border border-m3-outline-variant/20 sticky top-0 z-20 shadow-md">
        <div>
          <h3 className="text-xs font-black tracking-widest text-m3-primary uppercase font-mono">Inter-Branch Digital Transmittals</h3>
          <p className="text-xs text-m3-on-surface-variant/80 mt-0.5">Approved ledger transfers</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleOpenImport}
            className="p-1 px-3 bg-m3-outline-variant/15 text-m3-primary hover:bg-m3-outline-variant/25 text-xs font-bold flex items-center gap-1.5 cursor-pointer rounded-full transition-colors border border-m3-outline-variant/10"
          >
            <Upload className="h-4 w-4" /> Import Slip
          </button>

          <button
            onClick={() => {
              setToBranchId(branches.find(b => b.id !== currentUser.branchAssignmentId)?.id || 'B2');
              setShowModal(true);
            }}
            className="m3-btn-primary flex items-center gap-1.5 cursor-pointer shadow-sm text-xs shrink-0"
          >
            <Plus className="h-4 w-4" /> Dispatch Packet
          </button>
        </div>
      </div>

      {/* Main Ledger grid */}
      <div className="m3-card shadow-sm overflow-x-auto p-0">
        <table className="w-full text-xs text-left border-collapse table-auto min-w-[900px]">
          <thead>
            <tr className="border-b border-m3-outline-variant/20 bg-m3-surface/30 text-[10px] uppercase font-bold text-m3-on-surface-variant tracking-wider">
              <th className="py-3 px-4">Tracking Slip Ref</th>
              <th className="py-3 px-4 text-center">Document Category</th>
              <th className="py-3 px-4 text-center">Dispatch Branch</th>
              <th className="py-3 px-4 text-center">Target Destination</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Submitted Date</th>
              <th className="py-3 px-4 text-center">Command Operations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-m3-outline-variant/10 text-m3-on-surface/90">
            {transmittals.map((t, idx) => {
              let badgeStyle = 'bg-m3-outline-variant/20 text-m3-on-surface';
              if (t.status === 'Submitted') badgeStyle = 'bg-m3-primary-container text-m3-on-primary-container border-m3-primary/25';
              if (t.status === 'Approved') badgeStyle = 'bg-m3-tertiary-container text-m3-on-tertiary-container border-m3-tertiary/25';
              if (t.status === 'Archived') badgeStyle = 'bg-m3-outline-variant/10 text-m3-on-surface-variant/70 border-transparent';

              return (
                <tr key={idx} className="hover:bg-m3-surface-low/50 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-extrabold text-m3-primary font-mono text-xs">{t.id}</div>
                    <div className="text-[10px] text-m3-on-surface-variant">Signed: {t.submittedBy}</div>
                  </td>

                  <td className="py-3.5 px-4 text-center font-bold">
                    <span className="bg-m3-outline-variant/25 px-2.5 py-0.5 rounded-full text-m3-on-surface">
                      {t.documentType}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-center font-bold text-m3-on-surface">
                    {getBranchName(t.fromBranchId)}
                  </td>

                  <td className="py-3.5 px-4 text-center font-bold text-m3-on-surface">
                    {getBranchName(t.toBranchId)}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase border ${badgeStyle}`}>
                      {t.status}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right text-m3-on-surface-variant font-mono">
                    {new Date(t.submittedAt).toLocaleDateString()}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <div className="flex gap-1.5 justify-center">
                      <button
                        onClick={() => setActiveTrans(t)}
                        className="py-1 px-3 text-[10px] rounded-full border border-m3-primary/30 text-m3-primary bg-m3-primary/5 hover:bg-m3-primary/10 cursor-pointer font-bold transition-colors"
                      >
                        Inspect Payload
                      </button>

                      <button
                        onClick={() => handleExportTransmittal(t)}
                        className="p-1 px-1.5 text-m3-tertiary hover:scale-105 rounded-full border border-m3-tertiary/20 bg-m3-tertiary/5 cursor-pointer transition-colors"
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
                <td colSpan={7} className="py-8 text-center text-m3-on-surface-variant">No inter-branch transmittal ledgers currently recorded.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: Create dispatch document form */}
      {showModal && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="absolute inset-0 bg-gray-950/65 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <form
            onSubmit={handleCreateTrans}
            className="relative w-full max-w-sm rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface space-y-4 text-left"
          >
            <div className="flex justify-between items-center border-b border-m3-outline-variant/20 pb-2.5 flex-shrink-0">
              <h3 className="text-base font-bold text-m3-primary flex items-center gap-2">
                <Send className="h-4.5 w-4.5" />
                <span>Dispatch Form Package</span>
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1 relative">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">Document Category</label>
                <button
                  type="button"
                  onClick={() => compileBranchData(selectedDocType)}
                  className="bg-m3-primary/10 text-m3-primary hover:bg-m3-primary/25 border border-m3-primary/20 px-2 py-0.5 rounded text-[9px] font-black uppercase transition-colors"
                  title="Automatically snapshot and wrap core matching branch records into standard JSON ledger schema"
                >
                  ⚡ Pull Live Data
                </button>
              </div>
              <select
                value={selectedDocType}
                onChange={e => setSelectedDocType(e.target.value as TransmittalDocType)}
                className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md cursor-pointer"
              >
                <option value="Full Branch State Snapshot">Full Branch State Snapshot (All Sales & Stocks)</option>
                <option value="Daily Sales Report">Daily Sales Report</option>
                <option value="Inventory Count Report">Inventory Count Report</option>
                <option value="Purchase Order">Purchase Order</option>
                <option value="Receiving Report">Receiving Report</option>
                <option value="Branch Request">Branch Request</option>
              </select>
            </div>

            <div className="space-y-1 relative">
              <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">Target branch destination</label>
              <select
                value={toBranchId}
                onChange={e => setToBranchId(e.target.value)}
                className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md cursor-pointer"
              >
                {branches.filter(b => b.id !== currentUser.branchAssignmentId).map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1 relative">
              <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">JSON Content payload</label>
              <textarea
                required
                rows={4}
                value={payloadText}
                onChange={e => setPayloadText(e.target.value)}
                className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface font-mono focus:outline-none transition-colors rounded-t-md"
              />
            </div>

            <div className="space-y-1 relative">
              <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1">Summary memo notes</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Verified by supervisor Diaz"
                className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-m3-outline-variant/20 pt-4 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-m3-outline-variant/15 text-m3-on-surface-variant transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="m3-btn-primary px-5 py-2 text-xs shadow-sm cursor-pointer"
              >
                Dispatch Packet
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: Inspect Payload contents details */}
      {activeTrans && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="absolute inset-0 bg-gray-950/65 backdrop-blur-sm" onClick={() => setActiveTrans(null)} />
          <div className="relative w-full max-w-md rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface space-y-4 text-left">
            <div className="flex justify-between items-center border-b border-m3-outline-variant/20 pb-2.5">
              <h3 className="text-base font-bold text-m3-primary flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                <span>Inspect Packet: {activeTrans.id}</span>
              </h3>
              <button onClick={() => setActiveTrans(null)} className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content summary */}
            <div className="space-y-2 text-xs leading-relaxed text-m3-on-surface-variant/90 font-medium">
              <div className="flex justify-between">
                <strong>Dispatch Branch:</strong>
                <span className="text-m3-on-surface font-bold">{getBranchName(activeTrans.fromBranchId)}</span>
              </div>
              <div className="flex justify-between">
                <strong>Recipient destination:</strong>
                <span className="text-m3-on-surface font-bold">{getBranchName(activeTrans.toBranchId)}</span>
              </div>
              <div className="flex justify-between">
                <strong>Signed Supervisor:</strong>
                <span className="text-m3-on-surface font-bold">{activeTrans.submittedBy}</span>
              </div>
              <div className="flex justify-between">
                <strong>Dispatch Date:</strong>
                <span className="font-mono text-m3-on-surface font-bold">{new Date(activeTrans.submittedAt).toLocaleString()}</span>
              </div>
              {activeTrans.notes && (
                <div className="pt-2 italic text-m3-tertiary">
                  Notes: "{activeTrans.notes}"
                </div>
              )}
            </div>

            {/* RAW JSON container box */}
            <div className="space-y-1 my-2">
              <span className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1 block">Decrypted Payload Contents</span>
              <pre className="p-3 bg-m3-surface-lowest text-m3-primary text-[10.5px] rounded-lg border border-m3-outline-variant/30 font-mono max-h-[160px] overflow-auto select-all leading-relaxed">
                {JSON.stringify(JSON.parse(activeTrans.payloadJson), null, 2)}
              </pre>
            </div>

            {/* Verification action row */}
            {currentUser.role === UserRole.ADMIN && activeTrans.status !== 'Approved' && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    updateTransmittalStatus(activeTrans.id, 'Approved');
                    setActiveTrans(null);
                    showToast('🟢 Inter-branch document verified and authenticated successfully.');
                  }}
                  className="w-full py-2.5 font-bold uppercase tracking-wider bg-m3-tertiary text-m3-surface rounded-full text-xs cursor-pointer flex items-center justify-center gap-1 hover:bg-m3-tertiary/90 transition-colors"
                >
                  <CheckSquare className="h-4.5 w-4.5" /> Authenticate & Approve Document
                </button>
              </div>
            )}

            {/* Back button */}
            <div className="flex justify-end pt-1 border-t border-m3-outline-variant/15">
              <button
                onClick={() => setActiveTrans(null)}
                className="px-4 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-m3-outline-variant/15 text-m3-on-surface-variant transition-colors"
              >
                Close details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Visual JSON import form (replacing prompt window popup) */}
      {showImportModal && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="absolute inset-0 bg-gray-950/65 backdrop-blur-sm" onClick={() => setShowImportModal(false)} />
          <div className="relative w-full max-w-sm rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface text-left space-y-4">
            <div className="flex justify-between items-center border-b border-m3-outline-variant/20 pb-2.5">
              <h3 className="text-base font-bold text-m3-primary flex items-center gap-2">
                <Upload className="h-5 w-5" /> Import JSON Slip
              </h3>
              <button type="button" onClick={() => setShowImportModal(false)} className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-m3-primary uppercase tracking-widest pl-1 block">Paste Code Contents</span>
              <textarea
                rows={6}
                value={rawImportText}
                onChange={e => setRawImportText(e.target.value)}
                placeholder='Paste raw downloaded transmittal JSON slip data here...'
                className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/60 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-m3-outline-variant/20 pt-4">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-m3-outline-variant/15 text-m3-on-surface-variant transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeLocalImport}
                className="m3-btn-primary px-5 py-2 text-xs shadow-sm cursor-pointer"
              >
                Process Slip
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
