import React from 'react';
import { createPortal } from 'react-dom';
import { Check, X, Building2 } from 'lucide-react';
import { Branch } from '../../types/db';
import { getBranchOptionLabel } from '../../lib/branchUtils';
import { HeroButton, HeroCheckbox } from '../common/ui';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface BranchConfigsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingBranches: any[];
  setPendingBranches: React.Dispatch<React.SetStateAction<any[]>>;
  branches: Branch[];
  onFinalizeImport: () => void;
}

export const BranchConfigsModal: React.FC<BranchConfigsModalProps> = ({
  isOpen,
  onClose,
  pendingBranches,
  setPendingBranches,
  branches,
  onFinalizeImport,
}) => {
  useBodyScrollLock(isOpen);
  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in text-foreground font-sans">
      {/* Full-Screen Uniform Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />
      <div className="relative bg-content1 border border-divider rounded-large p-6 shadow-2xl space-y-6 w-full max-w-4xl text-left max-h-[90vh] overflow-y-auto z-10">
        <div className="flex justify-between items-center border-b border-divider pb-4">
          <div>
            <h3 className="text-base font-black text-warning uppercase tracking-wider flex items-center gap-2">
              <span className="p-1.5 rounded-medium bg-warning/10 text-warning"><Building2 className="w-4 h-4" /></span>
              <span>Branch Outposts Detected in CSV</span>
            </h3>
            <p className="text-xs text-default-500 font-medium mt-1 font-sans">
              The imported dataset references location(s) not currently registered in TilePoint. Please map each to an existing branch or create a new branch profile:
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-default-400 hover:text-foreground p-1.5 rounded-medium hover:bg-default-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5">
          {pendingBranches.map((pb, idx) => (
            <div key={idx} className="p-5 rounded-medium bg-content2/40 border border-divider space-y-4 font-sans shadow-sm">
              <div className="pb-3 border-b border-divider flex flex-wrap justify-between items-center gap-2">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-warning block">
                    CSV Detected Location: "{pb.detectedLocation}"
                  </span>
                  <span className="text-[10px] text-default-500 font-medium mt-0.5 block">
                    Specify if this maps to an existing branch or should be created as a new outlet.
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-content1 p-1 rounded-medium border border-divider">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...pendingBranches];
                      updated[idx].mode = 'existing';
                      setPendingBranches(updated);
                    }}
                    className={`px-3 py-1.5 rounded-medium text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      pb.mode === 'existing'
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-default-600 hover:bg-default-100'
                    }`}
                  >
                    Map to Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...pendingBranches];
                      updated[idx].mode = 'new';
                      setPendingBranches(updated);
                    }}
                    className={`px-3 py-1.5 rounded-medium text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      pb.mode === 'new'
                        ? 'bg-warning text-white shadow-sm'
                        : 'text-default-600 hover:bg-default-100'
                    }`}
                  >
                    Create as New
                  </button>
                </div>
              </div>

              {pb.mode === 'existing' ? (
                <div className="p-4 bg-content1 border border-divider rounded-medium space-y-2">
                  <label className="text-[10px] font-black uppercase text-primary tracking-wider block pl-1">
                    Select Existing Destination Branch *
                  </label>
                  <select
                    value={pb.selectedExistingBranchId ?? ''}
                    onChange={(e) => {
                      const updated = [...pendingBranches];
                      updated[idx].selectedExistingBranchId = e.target.value;
                      setPendingBranches(updated);
                    }}
                    className="w-full bg-content2 border border-divider rounded-medium p-2.5 focus:outline-none focus:border-primary text-foreground font-sans text-xs cursor-pointer"
                  >
                    {branches.filter(b => !b.isDeleted).map(b => (
                      <option key={b.id} value={b.id}>
                        {getBranchOptionLabel(b)}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1.5 text-[10px] text-default-500 pl-1">
                    <Check className="h-3.5 w-3.5 text-success shrink-0" />
                    <span>All imported items matching "{pb.detectedLocation}" will automatically be imported into this branch's stock.</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 p-4 bg-content1 border border-divider rounded-medium">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-primary tracking-wider pl-1">
                        Detected Branch ID (from CSV)
                      </label>
                      <input
                        type="text"
                        value={pb.id ?? ''}
                        disabled
                        className="w-full bg-content2 opacity-75 border border-divider p-2.5 focus:outline-none text-default-500 font-bold rounded-medium cursor-not-allowed"
                        title="Detected uniquely from the CSV records"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-primary tracking-wider pl-1">
                        Branch Outpost Name *
                      </label>
                      <input
                        type="text"
                        value={pb.name ?? ''}
                        onChange={(e) => {
                          const updated = [...pendingBranches];
                          updated[idx].name = e.target.value;
                          setPendingBranches(updated);
                        }}
                        className="w-full bg-content2 border border-divider focus:border-primary p-2.5 focus:outline-none text-foreground transition-colors rounded-medium font-sans font-bold"
                        placeholder="Branch / Store Name"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-primary tracking-wider pl-1">
                        Manager Name *
                      </label>
                      <input
                        type="text"
                        value={pb.manager ?? ''}
                        onChange={(e) => {
                          const updated = [...pendingBranches];
                          updated[idx].manager = e.target.value;
                          setPendingBranches(updated);
                        }}
                        className="w-full bg-content2 border border-divider focus:border-primary p-2.5 focus:outline-none text-foreground transition-colors rounded-medium font-sans"
                        placeholder="Manager Name"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-primary tracking-wider pl-1">
                        Contact Phone *
                      </label>
                      <input
                        type="text"
                        value={pb.phone ?? ''}
                        onChange={(e) => {
                          const updated = [...pendingBranches];
                          updated[idx].phone = e.target.value;
                          setPendingBranches(updated);
                        }}
                        className="w-full bg-content2 border border-divider focus:border-primary p-2.5 focus:outline-none text-foreground transition-colors rounded-medium font-sans"
                        placeholder="Phone number"
                        required
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-black uppercase text-primary tracking-wider pl-1">
                        Full Workplace Dispatch Address *
                      </label>
                      <input
                        type="text"
                        value={pb.address ?? ''}
                        onChange={(e) => {
                          const updated = [...pendingBranches];
                          updated[idx].address = e.target.value;
                          setPendingBranches(updated);
                        }}
                        className="w-full bg-content2 border border-divider focus:border-primary p-2.5 focus:outline-none text-foreground transition-colors rounded-medium font-sans"
                        placeholder="Full workplace dispatch address"
                        required
                      />
                    </div>

                    <div className="pt-1 font-sans">
                      <HeroCheckbox
                        id={`modal-dist-hub-${idx}`}
                        checked={pb.isDistributionBranch}
                        onChange={(e) => {
                          const updated = [...pendingBranches];
                          updated[idx].isDistributionBranch = e.target.checked;
                          setPendingBranches(updated);
                        }}
                        label="Is Distribution Hub"
                        size="sm"
                        color="primary"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1 font-sans">
                      <label className="text-[10px] font-black uppercase text-default-600 block select-none">
                        Assigned Force:
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={pb.staffCount ?? ''}
                        onChange={(e) => {
                          const updated = [...pendingBranches];
                          updated[idx].staffCount = parseInt(e.target.value) || 3;
                          setPendingBranches(updated);
                        }}
                        className="w-16 bg-content2 border border-divider focus:border-primary p-1 focus:outline-none text-foreground text-center text-xs rounded-medium"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 border-t border-divider pt-4">
          <HeroButton
            type="button"
            variant="flat"
            size="sm"
            onClick={onClose}
            className="font-bold text-xs uppercase tracking-wider"
          >
            Discard Import
          </HeroButton>
          <HeroButton
            type="button"
            color="primary"
            variant="solid"
            size="sm"
            onClick={onFinalizeImport}
            className="font-bold text-xs uppercase tracking-wider"
            startIcon={<Check className="h-4 w-4" />}
          >
            Instantiate Outlets & Commit Products
          </HeroButton>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};
