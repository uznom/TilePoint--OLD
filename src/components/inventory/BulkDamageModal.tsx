import { AlertTriangle, Check } from 'lucide-react';
import React from 'react';
import { getBranchOptionLabel } from '../../lib/branchUtils';
import { Branch, BranchStock, Product } from '../../types/db';
import { HeroButton } from '../common/ui/HeroButton';
import { HeroModal } from '../common/ui/HeroModal';
import { HeroSelect } from '../common/ui/HeroSelect';

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
      <form onSubmit={onSubmit} className="flex flex-col h-full overflow-hidden">
        <HeroModal.Header className="pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-danger/10 text-danger border border-danger/20 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-foreground uppercase tracking-wider">
                Register Bulk Damages & Log Breakages
              </h3>
              <p className="text-[10.5px] text-default-500 font-medium">Batch incident reporting & stock write-off</p>
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
                radius="md"
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
                radius="md"
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
                radius="md"
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
            <label className="text-[10px] font-black text-primary uppercase tracking-widest pl-1 block">
              Damaged Quantities per Product
            </label>
            <div className="bg-content2/50 border border-divider/30 rounded-2xl max-h-[220px] overflow-y-auto divide-y divide-divider/20 scrollbar-thin">
              {selectedProducts.map((pItem) => {
                const branchStockVal = branchStock.find(bs => bs.productId === pItem.id && bs.branchId === bulkDamageBranchId)?.quantity ?? 0;
                return (
                  <div key={pItem.id} className="p-3 flex items-center justify-between gap-4 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold truncate text-foreground">{pItem.productName}</div>
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
                        className="w-20 bg-background border border-divider/50 rounded-xl text-center p-1.5 font-bold text-xs focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Incident description */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-primary uppercase tracking-widest pl-1 block">
              Incident Description & Audit Remarks
            </label>
            <textarea
              required
              rows={2}
              value={bulkDamageNotes}
              onChange={e => setBulkDamageNotes(e.target.value)}
              placeholder="Describe the incident causing the stock breakages or supplier delivery issue..."
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
            color="danger"
            variant="solid"
            size="sm"
            className="font-bold uppercase tracking-wider"
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
