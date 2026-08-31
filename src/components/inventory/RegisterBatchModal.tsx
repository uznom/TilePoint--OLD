import { Clock } from 'lucide-react';
import React from 'react';
import { getBranchOptionLabel } from '../../lib/branchUtils';
import { Branch, Product, User } from '../../types/db';
import { HeroButton } from '../common/ui/HeroButton';
import { HeroModal } from '../common/ui/HeroModal';
import { HeroSelect } from '../common/ui/HeroSelect';

interface RegisterBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  branchProducts: Product[];
  products: Product[];
  branches: Branch[];
  currentUser: User | null;
  batchFormProductId: string;
  setBatchFormProductId: (id: string) => void;
  batchFormNo: string;
  setBatchFormNo: (no: string) => void;
  batchFormQty: number;
  setBatchFormQty: (qty: number) => void;
  batchFormMfgDate: string;
  setBatchFormMfgDate: (d: string) => void;
  batchFormExpDate: string;
  setBatchFormExpDate: (d: string) => void;
  batchFormBranchId: string;
  setBatchFormBranchId: (id: string) => void;
  batchFormRemarks: string;
  setBatchFormRemarks: (r: string) => void;
}

export const RegisterBatchModal: React.FC<RegisterBatchModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  branchProducts,
  products,
  branches,
  currentUser,
  batchFormProductId,
  setBatchFormProductId,
  batchFormNo,
  setBatchFormNo,
  batchFormQty,
  setBatchFormQty,
  batchFormMfgDate,
  setBatchFormMfgDate,
  batchFormExpDate,
  setBatchFormExpDate,
  batchFormBranchId,
  setBatchFormBranchId,
  batchFormRemarks,
  setBatchFormRemarks,
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
            <div className="p-2.5 rounded-2xl bg-danger/10 text-danger border border-danger/20 shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-foreground uppercase tracking-wider">
                Register Chemical Stock Batch
              </h3>
              <p className="text-[10.5px] text-default-500 font-medium">Batch lifecycle and shelf-life tracking</p>
            </div>
          </div>
        </HeroModal.Header>

        <HeroModal.Body className="py-4 space-y-4 text-xs text-left">
          {/* Product Selection */}
          <div className="space-y-1">
            <HeroSelect
              label="Select Catalog Product"
              isRequired
              placeholder="Select a product..."
              value={batchFormProductId ?? ''}
              onValueChange={val => {
                setBatchFormProductId(val);
                const prod = products.find(p => p.id === val);
                if (prod) {
                  if (prod.expirationDate) setBatchFormExpDate(prod.expirationDate);
                  if (prod.stockQuantity) setBatchFormQty(prod.stockQuantity);
                  if (!batchFormNo) setBatchFormNo(`B-${prod.productCode.replace(/[^A-Z0-9]/gi, '')}-${Date.now().toString().slice(-4)}`);
                }
              }}
              radius="md"
              items={branchProducts.map(p => ({
                key: p.id,
                value: p.id,
                label: `${p.productName} (${p.productCode})${p.hasExpiration ? ' - [Expiry Tracked]' : ''}`,
              }))}
            />
            {batchFormProductId && (() => {
              const selectedProductObj = products.find(p => p.id === batchFormProductId);
              if (selectedProductObj && !selectedProductObj.hasExpiration) {
                return (
                  <div className="bg-warning/10 border border-warning/20 text-warning p-3 rounded-2xl text-[11px] leading-relaxed mt-1 font-medium">
                    <strong>Note:</strong> This product is configured as <strong>not having an expiration date</strong> in the catalog. If you are tracking a chemical material, consider editing the product details to enable "Expiry Tracked" status.
                  </div>
                );
              }
              return null;
            })()}
          </div>

          {/* Batch Number & Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-extrabold text-default-500 uppercase tracking-wider text-[10px]">
                Batch / Lot #
              </label>
              <input
                type="text"
                required
                placeholder="Batch / Lot number"
                value={batchFormNo ?? ''}
                onChange={e => setBatchFormNo(e.target.value)}
                className="w-full bg-background border border-divider/50 focus:border-primary px-3.5 py-2 text-xs focus:outline-none rounded-xl font-bold text-foreground"
              />
            </div>
            <div className="space-y-1">
              <label className="font-extrabold text-default-500 uppercase tracking-wider text-[10px]">
                Qty (Bags/Units)
              </label>
              <input
                type="number"
                required
                min={1}
                value={batchFormQty ?? ''}
                onChange={e => setBatchFormQty(parseInt(e.target.value) || 0)}
                className="w-full bg-background border border-divider/50 focus:border-primary px-3.5 py-2 text-xs focus:outline-none rounded-xl font-bold text-foreground"
              />
            </div>
          </div>

          {/* Mfg Date & Expiry Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-extrabold text-default-500 uppercase tracking-wider text-[10px]">
                Manufacture Date
              </label>
              <input
                type="date"
                required
                value={batchFormMfgDate ?? ''}
                onChange={e => setBatchFormMfgDate(e.target.value)}
                className="w-full bg-background border border-divider/50 focus:border-primary px-3.5 py-2 text-xs focus:outline-none rounded-xl font-bold text-foreground cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <label className="font-extrabold text-default-500 uppercase tracking-wider text-[10px]">
                Expiry Date
              </label>
              <input
                type="date"
                required
                value={batchFormExpDate ?? ''}
                onChange={e => setBatchFormExpDate(e.target.value)}
                className="w-full bg-background border border-divider/50 focus:border-primary px-3.5 py-2 text-xs focus:outline-none rounded-xl font-bold text-foreground cursor-pointer"
              />
            </div>
          </div>

          {/* Branch Assignment */}
          <div className="space-y-1">
            {currentUser?.role === 'Admin' ? (
              <HeroSelect
                label="Branch Allocation"
                isRequired
                value={batchFormBranchId ?? ''}
                onValueChange={val => setBatchFormBranchId(val)}
                radius="md"
                items={branches.map(b => ({
                  key: b.id,
                  value: b.id,
                  label: getBranchOptionLabel(b),
                }))}
              />
            ) : (
              <div className="space-y-1">
                <label className="font-extrabold text-default-500 uppercase tracking-wider text-[10px]">
                  Branch Allocation
                </label>
                <div className="w-full bg-content2 border border-divider px-3.5 py-2 text-xs rounded-xl font-bold text-default-500">
                  {branches.find(b => b.id === (currentUser?.branchAssignmentId || 'B1'))?.name || 'N/A'}
                </div>
              </div>
            )}
          </div>

          {/* Remarks */}
          <div className="space-y-1">
            <label className="font-extrabold text-default-500 uppercase tracking-wider text-[10px]">
              Storage Notes / Remarks
            </label>
            <textarea
              rows={2}
              placeholder="Storage specifications, quality checks..."
              value={batchFormRemarks ?? ''}
              onChange={e => setBatchFormRemarks(e.target.value)}
              className="w-full bg-background border border-divider/50 focus:border-primary px-3.5 py-2 text-xs focus:outline-none rounded-xl font-medium text-foreground"
            />
          </div>
        </HeroModal.Body>

        <HeroModal.Footer className="justify-end gap-2 pt-3 pb-4">
          <HeroButton
            type="button"
            variant="flat"
            size="sm"
            onClick={onClose}
            className="font-bold text-xs"
          >
            Cancel
          </HeroButton>
          <HeroButton
            type="submit"
            color="danger"
            variant="solid"
            size="sm"
            className="font-bold text-xs uppercase tracking-wider"
          >
            Log Batch Entry
          </HeroButton>
        </HeroModal.Footer>
      </form>
    </HeroModal>
  );
};

export default RegisterBatchModal;
