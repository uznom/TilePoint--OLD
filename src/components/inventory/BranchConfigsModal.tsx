import React from 'react';
import { Check, Building2 } from 'lucide-react';
import { Branch } from '../../types/db';
import { getBranchOptionLabel } from '../../lib/branchUtils';
import { HeroButton, HeroCheckbox, HeroSelect } from '../common/ui';
import { HeroInput } from '../common/ui/HeroInput';
import { HeroModal } from '../common/ui/HeroModal';

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
  return (
    <HeroModal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
    >
      <HeroModal.Header className="pb-4 border-b border-divider">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-warning/10 text-warning shrink-0 border border-warning/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground tracking-tight">
              Branch Outposts Detected in CSV
            </h3>
            <p className="text-xs text-default-500 font-medium mt-0.5">
              The imported dataset references location(s) not currently registered in TilePoint. Please map each to an existing branch or create a new branch profile:
            </p>
          </div>
        </div>
      </HeroModal.Header>

      <HeroModal.Body className="p-6 space-y-5">
        {pendingBranches.map((pb, idx) => (
          <div key={idx} className="p-5 rounded-2xl bg-zinc-100/90 dark:bg-zinc-900/80 border border-zinc-200/60 dark:border-white/5 space-y-4 font-sans shadow-2xs">
            <div className="pb-3 border-b border-divider/20 flex flex-wrap justify-between items-center gap-2">
              <div>
                <span className="text-xs font-bold text-warning block">
                  CSV Detected Location: "{pb.detectedLocation}"
                </span>
                <span className="text-[11px] text-default-500 font-medium mt-0.5 block">
                  Specify if this maps to an existing branch or should be created as a new outlet.
                </span>
              </div>
              <div className="flex items-center gap-1 bg-zinc-200/60 dark:bg-zinc-800 p-1 rounded-full border border-zinc-200/50 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    const updated = [...pendingBranches];
                    updated[idx].mode = 'existing';
                    setPendingBranches(updated);
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer font-sans active:scale-[0.98] ${
                    pb.mode === 'existing'
                      ? 'bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-bold'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
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
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer font-sans active:scale-[0.98] ${
                    pb.mode === 'new'
                      ? 'bg-warning text-white shadow-[0_2px_8px_rgba(245,165,36,0.25)] font-bold'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  Create as New
                </button>
              </div>
            </div>

            {pb.mode === 'existing' ? (
              <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-white/5 rounded-2xl space-y-2 shadow-2xs">
                <HeroSelect
                  label="Select Existing Destination Branch *"
                  value={pb.selectedExistingBranchId ?? ''}
                  onValueChange={(val) => {
                    const updated = [...pendingBranches];
                    updated[idx].selectedExistingBranchId = val;
                    setPendingBranches(updated);
                  }}
                  radius="lg"
                  items={branches.filter(b => !b.isDeleted).map(b => ({
                    key: b.id,
                    value: b.id,
                    label: getBranchOptionLabel(b),
                  }))}
                />
                <div className="flex items-center gap-1.5 text-[11px] text-default-500 pl-1">
                  <Check className="h-3.5 w-3.5 text-success shrink-0" />
                  <span>All imported items matching "{pb.detectedLocation}" will automatically be imported into this branch's stock.</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4 p-4 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-white/5 rounded-2xl shadow-2xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <HeroInput
                    label="Detected Branch ID (from CSV)"
                    value={pb.id ?? ''}
                    disabled
                    radius="lg"
                    variant="flat"
                  />

                  <HeroInput
                    label="Branch Outpost Name *"
                    value={pb.name ?? ''}
                    onValueChange={(val) => {
                      const updated = [...pendingBranches];
                      updated[idx].name = val;
                      setPendingBranches(updated);
                    }}
                    placeholder="Branch / Store Name"
                    required
                    radius="lg"
                    variant="flat"
                  />

                  <HeroInput
                    label="Manager Name *"
                    value={pb.manager ?? ''}
                    onValueChange={(val) => {
                      const updated = [...pendingBranches];
                      updated[idx].manager = val;
                      setPendingBranches(updated);
                    }}
                    placeholder="Manager Name"
                    required
                    radius="lg"
                    variant="flat"
                  />

                  <HeroInput
                    label="Contact Phone *"
                    value={pb.phone ?? ''}
                    onValueChange={(val) => {
                      const updated = [...pendingBranches];
                      updated[idx].phone = val;
                      setPendingBranches(updated);
                    }}
                    placeholder="Phone number"
                    required
                    radius="lg"
                    variant="flat"
                  />

                  <div className="sm:col-span-2">
                    <HeroInput
                      label="Full Workplace Dispatch Address *"
                      value={pb.address ?? ''}
                      onValueChange={(val) => {
                        const updated = [...pendingBranches];
                        updated[idx].address = val;
                        setPendingBranches(updated);
                      }}
                      placeholder="Full workplace dispatch address"
                      required
                      radius="lg"
                      variant="flat"
                    />
                  </div>

                  <div className="pt-1 font-sans flex items-center">
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
                    <HeroInput
                      label="Assigned Force Count"
                      type="number"
                      min={1}
                      max={50}
                      value={pb.staffCount ? String(pb.staffCount) : '3'}
                      onValueChange={(val) => {
                        const updated = [...pendingBranches];
                        updated[idx].staffCount = parseInt(val) || 3;
                        setPendingBranches(updated);
                      }}
                      radius="lg"
                      variant="flat"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </HeroModal.Body>

      <HeroModal.Footer className="justify-end gap-2 p-4 px-6 border-t border-divider">
        <HeroButton
          type="button"
          variant="flat"
          size="sm"
          radius="full"
          onClick={onClose}
          className="font-bold text-xs"
        >
          Discard Import
        </HeroButton>
        <HeroButton
          type="button"
          color="primary"
          variant="solid"
          size="sm"
          radius="full"
          onClick={onFinalizeImport}
          className="font-bold text-xs shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
          startIcon={<Check className="h-4 w-4" />}
        >
          Instantiate Outlets &amp; Commit Products
        </HeroButton>
      </HeroModal.Footer>
    </HeroModal>
  );
};
