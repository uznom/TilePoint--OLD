import { Sliders } from 'lucide-react';
import React from 'react';
import { getBranchOptionLabel } from '../../lib/branchUtils';
import { Branch, Product, User } from '../../types/db';
import { HeroButton } from '../common/ui/HeroButton';
import { HeroInput } from '../common/ui/HeroInput';
import { HeroModal } from '../common/ui/HeroModal';
import { HeroSelect } from '../common/ui/HeroSelect';
import { HeroTextarea } from '../common/ui/HeroTextarea';

interface ManualLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  products: Product[];
  branches: Branch[];
  currentUser: User | null;
  manualLedgerProductId: string;
  setManualLedgerProductId: (val: string) => void;
  manualLedgerBranchId: string;
  setManualLedgerBranchId: (val: string) => void;
  manualLedgerType: 'ADJUST' | 'IN' | 'OUT' | 'PURCHASE' | 'SALE' | 'TRANSFER';
  setManualLedgerType: (val: 'ADJUST' | 'IN' | 'OUT' | 'PURCHASE' | 'SALE' | 'TRANSFER') => void;
  manualLedgerQty: number;
  setManualLedgerQty: (val: number) => void;
  manualLedgerRefNo: string;
  setManualLedgerRefNo: (val: string) => void;
  manualLedgerRemarks: string;
  setManualLedgerRemarks: (val: string) => void;
}

export const ManualLedgerModal: React.FC<ManualLedgerModalProps> = React.memo(({
  isOpen,
  onClose,
  onSubmit,
  products,
  branches,
  currentUser,
  manualLedgerProductId,
  setManualLedgerProductId,
  manualLedgerBranchId,
  setManualLedgerBranchId,
  manualLedgerType,
  setManualLedgerType,
  manualLedgerQty,
  setManualLedgerQty,
  manualLedgerRefNo,
  setManualLedgerRefNo,
  manualLedgerRemarks,
  setManualLedgerRemarks,
}) => {
  return (
    <HeroModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={onSubmit} className="flex flex-col h-full overflow-hidden font-sans">
        <HeroModal.Header className="pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                Insert Manual Stock Ledger Entry
              </h3>
              <p className="text-[11px] text-default-500 font-medium">Direct audit ledger movement</p>
            </div>
          </div>
        </HeroModal.Header>

        <HeroModal.Body className="py-4 space-y-4 text-left">
          <p className="text-xs text-default-500 font-medium leading-relaxed bg-zinc-100/90 dark:bg-zinc-800/80 p-3.5 rounded-2xl border border-zinc-200/60 dark:border-white/5 shadow-2xs">
            Create a custom movement to adjust both physical multi-branch inventory tracking registers and cumulative catalog quantities instantly.
          </p>

          {/* Product selection dropdown */}
          <HeroSelect
            label="Select Catalogue Tile"
            isRequired
            placeholder="-- Choose a product --"
            value={manualLedgerProductId}
            onValueChange={(val) => setManualLedgerProductId(val)}
            radius="lg"
            items={products.map(p => ({
              key: p.id,
              value: p.id,
              label: `${p.productName} (${p.sku || p.id.slice(-6)}) - Stock: ${p.stockQuantity}`
            }))}
          />

          {/* Grid for parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              {currentUser?.role === 'Admin' ? (
                <HeroSelect
                  label="Impacted Yard / Branch"
                  isRequired
                  value={manualLedgerBranchId}
                  onValueChange={(val) => setManualLedgerBranchId(val)}
                  radius="lg"
                  items={branches.map(b => ({
                    key: b.id,
                    value: b.id,
                    label: getBranchOptionLabel(b)
                  }))}
                />
              ) : (
                <div>
                  <label className="text-xs font-semibold text-foreground select-none block mb-1">Impacted Yard / Branch</label>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-white/5 px-3.5 py-2 text-xs rounded-xl font-bold text-default-500">
                    {branches.find(b => b.id === (currentUser?.branchAssignmentId || 'B1'))?.name || 'N/A'}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <HeroSelect
                label="Movement Ledger Type"
                isRequired
                value={manualLedgerType}
                onValueChange={(val) => setManualLedgerType(val as any)}
                radius="lg"
                items={[
                  { key: 'ADJUST', label: 'ADJUST (Signed variance +/-)' },
                  { key: 'IN', label: 'IN (Receive to stock +)' },
                  { key: 'OUT', label: 'OUT (Issue out / breakages -)' },
                  { key: 'PURCHASE', label: 'PURCHASE (Direct replenishment +)' },
                  { key: 'SALE', label: 'SALE (Floor sale issue out -)' },
                  { key: 'TRANSFER', label: 'TRANSFER (Signed Inter-branch +/-)' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <HeroInput
              label="Quantity Delta Count"
              type="number"
              required
              min={1}
              value={manualLedgerQty ? String(manualLedgerQty) : ''}
              onValueChange={val => setManualLedgerQty(Math.max(1, Number(val) || 1))}
              helperText="Note: IN/PURCHASE adds. OUT/SALE subtracts automatically."
              radius="lg"
              variant="flat"
            />

            <HeroInput
              label="Reference Code / Ticket ID"
              required
              placeholder="Reference Code / Ticket ID"
              value={manualLedgerRefNo}
              onValueChange={val => setManualLedgerRefNo(val)}
              radius="lg"
              variant="flat"
            />
          </div>

          <HeroTextarea
            label="Audit Sign-off Remarks"
            required
            rows={3}
            placeholder="Describe why this entry is being manually added..."
            value={manualLedgerRemarks}
            onValueChange={val => setManualLedgerRemarks(val)}
            radius="lg"
            variant="flat"
          />
        </HeroModal.Body>

        <HeroModal.Footer className="justify-end gap-2 pt-3 pb-4">
          <HeroButton
            type="button"
            onClick={onClose}
            variant="flat"
            size="sm"
            radius="full"
            className="font-bold text-xs"
          >
            Cancel
          </HeroButton>
          <HeroButton
            type="submit"
            color="primary"
            variant="solid"
            size="sm"
            radius="full"
            className="font-bold text-xs shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
          >
            Apply Ledger Movement
          </HeroButton>
        </HeroModal.Footer>
      </form>
    </HeroModal>
  );
});

ManualLedgerModal.displayName = 'ManualLedgerModal';

export default ManualLedgerModal;
