import { ArrowRightLeft } from 'lucide-react';
import React from 'react';
import { Branch, BranchStock, Product, Supplier } from '../../types/db';
import { HeroButton } from '../common/ui/HeroButton';
import { HeroModal } from '../common/ui/HeroModal';
import { BatchExpiration } from '../InventoryModule';

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

  return (
    <HeroModal
      isOpen={!!batch}
      onClose={onClose}
      size="xl"
    >
      {/* Header */}
      <HeroModal.Header className="pb-4 border-b border-divider">
        <div className="flex flex-col gap-1 w-full text-left">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-0.5 rounded-full border border-primary/20">
              Batch #{batch.batchNumber}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9.5px] uppercase tracking-wide border ${
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
      </HeroModal.Header>

      {/* Details Grid */}
      <HeroModal.Body className="p-6 space-y-4 text-xs text-left">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Section 1: Quantity & Location */}
          <div className="bg-content2/50 p-4 rounded-2xl border border-divider/30 space-y-2.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary block">
              Stock &amp; Allocation
            </span>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-1 border-b border-divider/20">
                <span className="text-default-500 font-medium">Batch Quantity Remaining:</span>
                <span className="font-black text-sm text-primary">
                  {batch.quantity} {pUnit}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-divider/20">
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
          <div className="bg-content2/50 p-4 rounded-2xl border border-divider/30 space-y-2.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary block">
              Manufacture &amp; Expiry
            </span>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-1 border-b border-divider/20">
                <span className="text-default-500 font-medium">Manufacture Date:</span>
                <span className="font-semibold text-foreground">
                  {batch.manufactureDate}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-divider/20">
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
          <div className="md:col-span-2 bg-content2/50 p-4 rounded-2xl border border-divider/30 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary block">
                Supplier &amp; Vendor Information
              </span>
              {prod?.brand && (
                <span className="text-[9.5px] bg-content1 px-2 py-0.5 rounded-md border border-divider/30 text-default-600 font-bold">
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
                  <span className="text-foreground font-mono text-xs font-semibold">{supplier.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-default-500 uppercase tracking-wider block font-bold">Email Address</span>
                  <span className="text-foreground font-medium">{supplier.email || 'N/A'}</span>
                </div>
                {supplier.address && (
                  <div className="sm:col-span-2">
                    <span className="text-[9px] text-default-500 uppercase tracking-wider block font-bold">Business Address</span>
                    <span className="text-foreground text-[11px] font-medium">{supplier.address}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-content1 rounded-xl border border-dashed border-divider/40 text-[11px] text-default-500 leading-relaxed">
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
          <div className="md:col-span-2 bg-content2/50 p-4 rounded-2xl border border-divider/30 space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary block">
              Batch Remarks &amp; ERP Notes
            </span>
            <p className="text-xs text-default-600 italic font-medium">
              {batch.remarks || "No custom remarks recorded for this chemical stock batch entry."}
            </p>
          </div>
        </div>
      </HeroModal.Body>

      {/* Footer Actions */}
      <HeroModal.Footer className="justify-between items-center gap-3 p-4 px-6 border-t border-divider">
        <HeroButton
          type="button"
          variant="flat"
          size="sm"
          radius="full"
          onClick={onClose}
          className="font-bold text-xs"
        >
          Close
        </HeroButton>

        <HeroButton
          type="button"
          color="primary"
          variant="solid"
          size="sm"
          radius="full"
          onClick={() => onTriggerTransfer(batch)}
          className="font-bold text-xs shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
          startIcon={<ArrowRightLeft className="h-4 w-4" />}
        >
          Trigger Stock Transfer
        </HeroButton>
      </HeroModal.Footer>
    </HeroModal>
  );
};

export default ChemicalBatchDetailModal;
