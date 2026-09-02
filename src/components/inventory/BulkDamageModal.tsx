import { AlertTriangle, Check } from 'lucide-react';
import React from 'react';
import { getBranchOptionLabel } from '../../lib/branchUtils';
import { Branch, BranchStock, Product } from '../../types/db';
import { HeroButton } from '../common/ui/HeroButton';
import { HeroModal } from '../common/ui/HeroModal';
import { HeroSelect } from '../common/ui/HeroSelect';
import { HeroTextarea } from '../common/ui/HeroTextarea';

interface BulkDamageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  branches: Branch[];
  branchStock: BranchStock[];
  selectedProducts: Product[];
  bulkDamageBranchId: string;
  setBulkDamageBranchId: (val: string) => void;
  bulkDamageCategory: string;
  setBulkDamageCategory: (val: string) => void;
  bulkDamageAction: string;
  setBulkDamageAction: (val: string) => void;
  bulkDamageNotes: string;
  setBulkDamageNotes: (val: string) => void;
  bulkDamageQuantities: Record<string, number>;
  setBulkDamageQuantities: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

export const BulkDamageModal: React.FC<BulkDamageModalProps> = React.memo(({
  isOpen,
  onClose,
  onSubmit,
  branches,
  branchStock,
  selectedProducts,
  bulkDamageBranchId,
  setBulkDamageBranchId,
  bulkDamageCategory,
  setBulkDamageCategory,
  bulkDamageAction,
  setBulkDamageAction,
  bulkDamageNotes,
  setBulkDamageNotes,
  bulkDamageQuantities,
  setBulkDamageQuantities,
}) => {
  return (
    <HeroModal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
    >
      <form onSubmit={onSubmit} className="flex flex-col h-full overflow-hidden font-sans">
        <HeroModal.Header className="pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-danger/10 text-danger border border-danger/20 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                Register Bulk Damages &amp; Log Breakages
              </h3>
              <p className="text-[11px] text-default-500 font-medium">Batch incident reporting &amp; stock write-off</p>
            </div>
          </div>
        </HeroModal.Header>

        <HeroModal.Body className="py-4 space-y-4 text-left">
          {/* Config Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <HeroSelect
                label="Reporting Branch"
                isRequired
                value={bulkDamageBranchId}
                onValueChange={val => setBulkDamageBranchId(val)}
                radius="lg"
                items={branches.filter(b => !b.isDeleted).map(b => ({
                  key: b.id,
                  value: b.id,
                  label: getBranchOptionLabel(b),
                }))}
              />
            </div>

            <div className="space-y-1">
              <HeroSelect
                label="Damage Category"
                value={bulkDamageCategory}
                onValueChange={val => setBulkDamageCategory(val)}
                radius="lg"
                items={[
                  { key: 'Warehouse Breakage', value: 'Warehouse Breakage', label: 'Warehouse Drop / Forklift Clash' },
                  { key: 'BOA', value: 'BOA', label: 'BOA (Broken On Arrival)' },
                  { key: 'Showroom Casualty', value: 'Showroom Casualty', label: 'Showroom Display Chipped' },
                  { key: 'Delivery Transit', value: 'Delivery Transit', label: 'Transport Transit Fractures' },
                ]}
              />
            </div>

            <div className="space-y-1">
              <HeroSelect
                label="Action / Treatment Taken"
                value={bulkDamageAction}
                onValueChange={val => setBulkDamageAction(val)}
                radius="lg"
                items={[
                  { key: 'Disposed / Scrapped', value: 'Disposed / Scrapped', label: 'Shattered - Disposed & Scrapped' },
                  { key: 'Saved for Mosaic', value: 'Saved for Mosaic', label: 'Saved for Mosaic Sales' },
                  { key: 'Claimed from Supplier / Insurance Code', value: 'Claimed from Supplier / Insurance Code', label: 'Supplier BOA Reimbursement' },
                  { key: 'Returned for Credit', value: 'Returned for Credit', label: 'Returned for Credit Note' },
                ]}
              />
            </div>
          </div>

          {/* Selected Products Quantities list */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-default-500 uppercase tracking-wider pl-1 block">
              Damaged Quantities per Product
            </label>
            <div className="bg-zinc-100/90 dark:bg-zinc-900/80 border border-zinc-200/60 dark:border-white/5 rounded-2xl max-h-[220px] overflow-y-auto divide-y divide-divider/20 scrollbar-thin shadow-2xs">
              {selectedProducts.map((pItem) => {
                const branchStockVal = branchStock.find(bs => bs.productId === pItem.id && bs.branchId === bulkDamageBranchId)?.quantity ?? 0;
                return (
                  <div key={pItem.id} className="p-3.5 flex items-center justify-between gap-4 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate text-foreground">{pItem.productName}</div>
                      <div className="text-[10px] text-default-500 mt-0.5 font-medium">
                        SKU: {pItem.sku} • Stock in Branch: <span className="font-bold text-primary">{branchStockVal}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-bold text-default-500 uppercase">Damaged Count:</span>
                      <input
                        type="number"
                        min={1}
                        max={9999}
                        required
                        value={bulkDamageQuantities[pItem.id] ?? 1}
                        onChange={e => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          setBulkDamageQuantities(prev => ({
                            ...prev,
                            [pItem.id]: val
                          }));
                        }}
                        className="w-20 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-white/5 rounded-xl text-center p-1.5 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Incident description */}
          <HeroTextarea
            label="Incident Description & Audit Remarks"
            required
            rows={2}
            value={bulkDamageNotes}
            onValueChange={val => setBulkDamageNotes(val)}
            placeholder="Describe the incident causing the stock breakages or supplier delivery issue..."
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
            color="danger"
            variant="solid"
            size="sm"
            radius="full"
            className="font-bold shadow-[0_2px_8px_rgba(243,18,96,0.25)]"
            startIcon={<Check className="h-4 w-4" />}
          >
            Register Bulk Damages
          </HeroButton>
        </HeroModal.Footer>
      </form>
    </HeroModal>
  );
});

BulkDamageModal.displayName = 'BulkDamageModal';

export default BulkDamageModal;
