import React from 'react';
import { createPortal } from 'react-dom';
import { Clock, X } from 'lucide-react';
import { Branch, Product, User } from '../../types/db';
import { getBranchOptionLabel } from '../../lib/branchUtils';
import { HeroButton } from '../common/ui/HeroButton';
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
  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
      {/* Full-Screen Uniform Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />
      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-large border border-divider p-6 z-30 shadow-2xl bg-content1 text-foreground text-left space-y-4"
      >
        <div className="flex justify-between items-center border-b border-divider pb-3">
          <h3 className="text-sm font-black text-primary uppercase tracking-wider flex items-center gap-2">
            <Clock className="h-5 w-5 text-danger" />
            <span>Register Chemical Stock Batch</span>
          </h3>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-default-400 hover:text-foreground cursor-pointer p-1.5 rounded-medium hover:bg-default-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
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
                  <div className="bg-warning/10 border border-warning/20 text-warning p-2.5 rounded-medium text-[10.5px] leading-relaxed mt-1">
                    <strong>Note:</strong> This product is configured as <strong>not having an expiration date</strong> in the catalog. If you are tracking a chemical material, consider editing the product details to enable "Expiry Tracked" status.
                  </div>
                );
              }
              return null;
            })()}
          </div>

          {/* Batch Number & Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-extrabold text-default-500 uppercase tracking-wider text-[10px]">Batch / Lot #</label>
              <input
                type="text"
                required
                placeholder="Batch / Lot number"
                value={batchFormNo ?? ''}
                onChange={e => setBatchFormNo(e.target.value)}
                className="w-full bg-content2 border border-divider focus:border-primary px-3 py-2 text-xs focus:outline-none rounded-medium font-bold text-foreground"
              />
            </div>
            <div className="space-y-1">
              <label className="font-extrabold text-default-500 uppercase tracking-wider text-[10px]">Qty (Bags/Units)</label>
              <input
                type="number"
                required
                min={1}
                value={batchFormQty ?? ''}
                onChange={e => setBatchFormQty(parseInt(e.target.value) || 0)}
                className="w-full bg-content2 border border-divider focus:border-primary px-3 py-2 text-xs focus:outline-none rounded-medium font-bold text-foreground"
              />
            </div>
          </div>

          {/* Mfg Date & Expiry Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-extrabold text-default-500 uppercase tracking-wider text-[10px]">Manufacture Date</label>
              <input
                type="date"
                required
                value={batchFormMfgDate ?? ''}
                onChange={e => setBatchFormMfgDate(e.target.value)}
                className="w-full bg-content2 border border-divider focus:border-primary px-3 py-2 text-xs focus:outline-none rounded-medium font-bold text-foreground cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <label className="font-extrabold text-default-500 uppercase tracking-wider text-[10px]">Expiry Date</label>
              <input
                type="date"
                required
                value={batchFormExpDate ?? ''}
                onChange={e => setBatchFormExpDate(e.target.value)}
                className="w-full bg-content2 border border-divider focus:border-primary px-3 py-2 text-xs focus:outline-none rounded-medium font-bold text-foreground cursor-pointer"
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
                <label className="font-extrabold text-default-500 uppercase tracking-wider text-[10px]">Branch Allocation</label>
                <div className="w-full bg-content2 border border-divider px-3 py-2 text-xs rounded-medium font-bold text-default-500">
                  {branches.find(b => b.id === (currentUser?.branchAssignmentId || 'B1'))?.name || 'N/A'}
                </div>
              </div>
            )}
          </div>

          {/* Remarks */}
          <div className="space-y-1">
            <label className="font-extrabold text-default-500 uppercase tracking-wider text-[10px]">Storage Notes / Remarks</label>
            <textarea
              rows={2}
              placeholder="Storage specifications, quality checks..."
              value={batchFormRemarks ?? ''}
              onChange={e => setBatchFormRemarks(e.target.value)}
              className="w-full bg-content2 border border-divider focus:border-primary px-3 py-2 text-xs focus:outline-none rounded-medium font-medium text-foreground"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-2 border-t border-divider">
          <HeroButton
            type="button"
            variant="flat"
            size="sm"
            onClick={onClose}
            className="font-bold text-xs uppercase tracking-wider"
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
        </div>
      </form>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};
