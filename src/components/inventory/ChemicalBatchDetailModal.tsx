import React from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRightLeft } from 'lucide-react';
import { Branch, BranchStock, Product, Supplier } from '../../types/db';
import { BatchExpiration } from '../InventoryModule';
import { HeroButton } from '../common/ui/HeroButton';

interface ChemicalBatchDetailModalProps {
  batch: BatchExpiration | null;
  onClose: () => void;
  products: Product[];
  branches: Branch[];
  suppliers: Supplier[];
  branchStock: BranchStock[];
  onTriggerTransfer: (batch: BatchExpiration) => void;
  computeLiveBatchStatus: (expiryDate: string) => string;
}

export const ChemicalBatchDetailModal: React.FC<ChemicalBatchDetailModalProps> = ({
  batch,
  onClose,
  products,
  branches,
  suppliers,
  branchStock,
  onTriggerTransfer,
  computeLiveBatchStatus,
}) => {
  if (!batch) return null;

  const prod = products.find(p => p.id === batch.productId);
  const pName = prod ? prod.productName : batch.productName;
  const pCode = prod ? prod.productCode : batch.productCode;
  const pUnit = prod?.unit || 'bags';
  const liveStatus = computeLiveBatchStatus(batch.expiryDate);
  const branchName = branches.find(br => br.id === batch.branchId)?.name || batch.branchId;

  // Find supplier info from product
  const supplier = suppliers.find(s => s.id === prod?.supplierId);

  // Calculate days remaining or days past expiry
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDateObj = new Date(batch.expiryDate);
  expDateObj.setHours(0, 0, 0, 0);
  const diffTime = expDateObj.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Branch stock for this product
  const currentBranchStock = branchStock.find(bs => bs.productId === batch.productId && bs.branchId === batch.branchId)?.quantity ?? prod?.stockQuantity ?? 0;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
      {/* Full-Screen Uniform Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-large border border-divider p-6 z-30 shadow-2xl bg-content1 text-foreground text-left space-y-5">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-divider pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-0.5 rounded-full border border-primary/20">
                Batch #{batch.batchNumber}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wide border ${
                liveStatus === "Expired"
                  ? "bg-danger/10 text-danger border-danger/20 font-black"
                  : liveStatus === "Expiring Soon"
                  ? "bg-warning/10 text-warning border-warning/20"
                  : "bg-success/10 text-success border-success/20"
              }`}>
                {liveStatus}
              </span>
            </div>
            <h3 className="text-base font-black text-foreground leading-tight">
              {pName}
            </h3>
            <span className="text-xs font-bold text-primary">
              Product Code: {pCode}
            </span>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-default-400 hover:text-foreground cursor-pointer p-1.5 rounded-medium hover:bg-default-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          
          {/* Section 1: Quantity & Location */}
          <div className="bg-content2/50 p-4 rounded-medium border border-divider space-y-2.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary block">
              Stock &amp; Allocation
            </span>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-1 border-b border-divider/60">
                <span className="text-default-500 font-medium">Batch Quantity Remaining:</span>
                <span className="font-black text-sm text-primary">
                  {batch.quantity} {pUnit}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-divider/60">
                <span className="text-default-500 font-medium">Branch Location:</span>
                <span className="font-extrabold text-foreground">
                  {branchName}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-default-500 font-medium">Total Branch Stock:</span>
                <span className="font-bold text-foreground">
                  {currentBranchStock} {pUnit}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Shelf-Life & Dates */}
          <div className="bg-content2/50 p-4 rounded-medium border border-divider space-y-2.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary block">
              Manufacture &amp; Expiry
            </span>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-1 border-b border-divider/60">
                <span className="text-default-500 font-medium">Manufacture Date:</span>
                <span className="font-semibold text-foreground">
                  {batch.manufactureDate}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-divider/60">
                <span className="text-default-500 font-medium">Expiration Date:</span>
                <span className="font-bold text-foreground">
                  {batch.expiryDate}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-default-500 font-medium">Timeline Status:</span>
                <span className={`font-bold ${
                  isNaN(diffDays) ? 'text-default-500' : diffDays < 0 ? 'text-danger' : diffDays <= 30 ? 'text-warning' : 'text-success'
                }`}>
                  {isNaN(diffDays)
                    ? "Unspecified / Lifetime"
                    : diffDays < 0 
                    ? `Expired ${Math.abs(diffDays)} days ago` 
                    : diffDays === 0 
                    ? `Expires today!` 
                    : `${diffDays} days remaining`}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Supplier Information */}
          <div className="md:col-span-2 bg-content2/50 p-4 rounded-medium border border-divider space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary block">
                Supplier &amp; Vendor Information
              </span>
              {prod?.brand && (
                <span className="text-[9.5px] bg-content1 px-2 py-0.5 rounded border border-divider text-default-600 font-bold">
                  Brand: {prod.brand}
                </span>
              )}
            </div>
            
            {supplier ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[9px] text-default-500 uppercase tracking-wider block font-bold">Company Name</span>
                  <span className="font-bold text-foreground">{supplier.name}</span>
                </div>
                <div>
                  <span className="text-[9px] text-default-500 uppercase tracking-wider block font-bold">Contact Person</span>
                  <span className="font-semibold text-foreground">{supplier.contactPerson || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-default-500 uppercase tracking-wider block font-bold">Phone / Mobile</span>
                  <span className="text-foreground font-mono text-xs">{supplier.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-default-500 uppercase tracking-wider block font-bold">Email Address</span>
                  <span className="text-foreground">{supplier.email || 'N/A'}</span>
                </div>
                {supplier.address && (
                  <div className="sm:col-span-2">
                    <span className="text-[9px] text-default-500 uppercase tracking-wider block font-bold">Business Address</span>
                    <span className="text-foreground text-[11px]">{supplier.address}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-content1 rounded-medium border border-dashed border-divider text-[11px] text-default-500 leading-relaxed">
                <p>
                  <strong>Supplier Note:</strong> No specific supplier record is linked to this product (Brand: <strong>{prod?.brand || 'Default Chemical Supplier'}</strong>).
                </p>
                <p className="text-[10px] text-default-400 mt-1">
                  You can assign a registered supplier to this product from the Catalog module edit page.
                </p>
              </div>
            )}
          </div>

          {/* Section 4: Remarks / Log Notes */}
          <div className="md:col-span-2 bg-content2/50 p-4 rounded-medium border border-divider space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary block">
              Batch Remarks &amp; ERP Notes
            </span>
            <p className="text-xs text-default-600 italic font-medium">
              {batch.remarks || "No custom remarks recorded for this chemical stock batch entry."}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-divider">
          <HeroButton
            type="button"
            variant="flat"
            size="sm"
            onClick={onClose}
            className="w-full sm:w-auto font-bold text-xs uppercase tracking-wider"
          >
            Close
          </HeroButton>

          <HeroButton
            type="button"
            color="primary"
            variant="solid"
            size="sm"
            onClick={() => onTriggerTransfer(batch)}
            className="w-full sm:w-auto font-bold text-xs uppercase tracking-wider"
            startIcon={<ArrowRightLeft className="h-4 w-4" />}
          >
            Trigger Stock Transfer
          </HeroButton>
        </div>

      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};
