import { Sliders } from 'lucide-react';
import React from 'react';
import { getBranchOptionLabel } from '../../lib/branchUtils';
import { Branch, Product, User } from '../../types/db';
import { HeroButton } from '../common/ui/HeroButton';
import { HeroModal } from '../common/ui/HeroModal';
import { HeroSelect } from '../common/ui/HeroSelect';

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
      <form onSubmit={onSubmit} className="flex flex-col h-full overflow-hidden">
        <HeroModal.Header className="pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-foreground uppercase tracking-wider">
                Insert Manual Stock Ledger Entry
              </h3>
              <p className="text-[10.5px] text-default-500 font-medium">Direct audit ledger movement</p>
            </div>
          </div>
        </HeroModal.Header>

        <HeroModal.Body className="py-4 space-y-4 text-left">
          <p className="text-xs text-default-500 font-medium bg-content2/50 p-3 rounded-2xl border border-divider/30">
            Create a custom movement to adjust both physical multi-branch inventory tracking registers and cumulative catalog quantities instantly.
          </p>

          {/* Product selection dropdown */}
          <HeroSelect
            label="Select Catalogue Tile"
            isRequired
            placeholder="-- Choose a product --"
            value={manualLedgerProductId}
            onValueChange={(val) => setManualLedgerProductId(val)}
            radius="md"
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
                  radius="md"
                  items={branches.map(b => ({
                    key: b.id,
                    value: b.id,
                    label: getBranchOptionLabel(b)
                  }))}
                />
              ) : (
                <div>
                  <label className="text-xs font-semibold text-foreground select-none block mb-1">Impacted Yard / Branch</label>
                  <div className="w-full bg-content2 border border-divider px-3.5 py-2 text-xs rounded-xl font-bold text-default-500">
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
                radius="md"
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
            <div className="space-y-1">
              <label className="text-[10px] font-black text-primary uppercase tracking-widest pl-1 select-none">
                Quantity Delta count
              </label>
              <input
                type="number"
                required
                min={1}
                value={manualLedgerQty || ''}
                onChange={e => setManualLedgerQty(Math.max(1, Number(e.target.value)))}
                className="w-full bg-background border border-divider/50 focus:border-primary px-3.5 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-xl font-bold"
              />
              <span className="text-[9.5px] text-default-400 italic block pt-0.5 pl-1 font-medium">
                Note: IN/PURCHASE adds. OUT/SALE subtracts automatically.
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-primary uppercase tracking-widest pl-1 select-none">
                Reference Code / Ticket ID
              </label>
              <input
                type="text"
                required
                placeholder="Reference Code / Ticket ID"
                value={manualLedgerRefNo}
                onChange={e => setManualLedgerRefNo(e.target.value)}
                className="w-full bg-background border border-divider/50 focus:border-primary px-3.5 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-xl font-bold"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-primary uppercase tracking-widest pl-1 select-none">
              Audit Sign-off Remarks
            </label>
            <textarea
              required
              rows={3}
              placeholder="Describe why this entry is being manually added..."
              value={manualLedgerRemarks}
              onChange={e => setManualLedgerRemarks(e.target.value)}
              className="w-full bg-background border border-divider/50 focus:border-primary px-3.5 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-xl font-sans"
            />
          </div>
        </HeroModal.Body>

        <HeroModal.Footer className="justify-end gap-2 pt-3 pb-4">
          <HeroButton
            type="button"
            onClick={onClose}
            variant="flat"
            size="sm"
            className="font-bold text-xs"
          >
            Cancel
          </HeroButton>
          <HeroButton
            type="submit"
            color="primary"
            variant="solid"
            size="sm"
            className="font-bold uppercase tracking-wider"
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
