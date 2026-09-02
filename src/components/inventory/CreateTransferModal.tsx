import React, { useState } from 'react';
import { 
  ArrowRightLeft, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  Package, 
  Plus, 
  Trash2 
} from 'lucide-react';
import { Branch, BranchStock, Product, TransferType, User } from '../../types/db';
import { getBranchOptionLabel } from '../../lib/branchUtils';
import { HeroButton } from '../common/ui/HeroButton';
import { HeroSelect } from '../common/ui/HeroSelect';
import { HeroModal } from '../common/ui/HeroModal';

interface CreateTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: Branch[];
  products: Product[];
  branchProducts: Product[];
  branchStock: BranchStock[];
  currentUser: User | null;
  transferSource: string;
  setTransferSource: (src: string) => void;
  transferDest: string;
  setTransferDest: (dest: string) => void;
  transferTypeSelect: TransferType;
  setTransferTypeSelect: (type: TransferType) => void;
  tempProductId: string;
  setTempProductId: (id: string) => void;
  tempQty: number;
  setTempQty: (qty: number) => void;
  transferItems: Array<{ productId: string; quantity: number }>;
  setTransferItems: React.Dispatch<React.SetStateAction<Array<{ productId: string; quantity: number }>>>;
  transferReasonInput: string;
  setTransferReasonInput: (reason: string) => void;
  onSubmit: () => void;
  showToast: (msg: string) => void;
}

export const CreateTransferModal: React.FC<CreateTransferModalProps> = ({
  isOpen,
  onClose,
  branches,
  products,
  branchProducts,
  branchStock,
  currentUser,
  transferSource,
  setTransferSource,
  transferDest,
  setTransferDest,
  transferTypeSelect,
  setTransferTypeSelect,
  tempProductId,
  setTempProductId,
  tempQty,
  setTempQty,
  transferItems,
  setTransferItems,
  transferReasonInput,
  setTransferReasonInput,
  onSubmit,
  showToast,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  const totalBoxes = transferItems.reduce((acc, item) => acc + item.quantity, 0);

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!transferSource) {
        showToast('Please select a dispensing source branch');
        return;
      }
      if (!transferDest) {
        showToast('Please select a receiving destination branch');
        return;
      }
      if (transferSource === transferDest) {
        showToast('Source and Destination branches cannot be identical');
        return;
      }
      setCurrentStep(2);
    }
  };

  const steps = [
    { id: 1, label: 'Route & Classification', icon: MapPin, desc: 'Branches & transfer type' },
    { id: 2, label: 'Manifest & Quantities', icon: Package, desc: 'Product items & staging' },
  ];

  return (
    <HeroModal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
    >
      <HeroModal.Header className="pb-3.5 border-b border-divider">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
            <ArrowRightLeft className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-foreground uppercase tracking-wider">
              Formulate Stock Transfer Request
            </h3>
            <p className="text-[10.5px] text-default-500 font-medium mt-0.5">
              Multi-branch dispatch & inventory allocation workflow
            </p>
          </div>
        </div>
      </HeroModal.Header>

      <HeroModal.Body className="p-6 space-y-4">
        {/* Step Indicator Header */}
        <div className="grid grid-cols-2 gap-2 bg-content2/50 p-1.5 rounded-2xl border border-divider">
          {steps.map((s) => {
            const isCurrent = currentStep === s.id;
            const isCompleted = currentStep > s.id;
            return (
              <button
                type="button"
                key={s.id}
                onClick={() => setCurrentStep(s.id)}
                className={`flex items-center gap-2.5 p-2 rounded-xl transition-all text-left cursor-pointer border ${
                  isCurrent
                    ? 'bg-content1 border-primary/40 text-primary shadow-xs ring-1 ring-primary/20'
                    : isCompleted
                    ? 'bg-success/5 border-success/20 text-success hover:bg-success/10'
                    : 'bg-transparent border-transparent text-default-400 hover:text-foreground hover:bg-content2'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                  isCurrent
                    ? 'bg-primary text-primary-foreground'
                    : isCompleted
                    ? 'bg-success text-success-foreground'
                    : 'bg-default-200 text-default-600'
                }`}>
                  {isCompleted ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : s.id}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black uppercase truncate">{s.label}</div>
                  <div className="text-[10px] text-default-400 truncate font-medium">{s.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* STEP 1: ROUTE & CLASSIFICATION */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dispatch branch assignment */}
              <div className="space-y-1">
                <HeroSelect
                  label="Dispensing Branch (Source)"
                  isRequired
                  isDisabled={currentUser?.role !== 'Admin'}
                  value={transferSource ?? ''}
                  onValueChange={val => {
                    setTransferSource(val);
                    if (val === transferDest) {
                      setTransferDest(branches.find(b => b.id !== val)?.id || '');
                    }
                  }}
                  radius="md"
                  items={branches.filter(b => !b.isDeleted).map(b => ({
                    key: b.id,
                    value: b.id,
                    label: getBranchOptionLabel(b),
                  }))}
                />
                {currentUser?.role !== 'Admin' && (
                  <span className="text-[9px] text-default-500 pl-1">{branches.find(b => b.id === (currentUser?.branchAssignmentId || 'B1'))?.name}</span>
                )}
              </div>

              {/* Destination branch assignment */}
              <div className="space-y-1">
                <HeroSelect
                  label="Receiving Branch (Destination)"
                  isRequired
                  placeholder="Select target branch..."
                  value={transferDest ?? ''}
                  onValueChange={val => setTransferDest(val)}
                  radius="md"
                  items={branches.filter(b => !b.isDeleted && b.id !== transferSource).map(b => ({
                    key: b.id,
                    value: b.id,
                    label: getBranchOptionLabel(b),
                  }))}
                />
              </div>

              {/* Transfer Type Selection */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black text-primary uppercase tracking-widest pl-1 block select-none">
                  Transfer Type Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['Replenishment', 'Pull Out', 'Redistribution', 'Return to Warehouse'] as TransferType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setTransferTypeSelect(type)}
                      className={`py-2 px-3 text-[10px] font-extrabold uppercase rounded-xl border text-center transition-all cursor-pointer ${
                        transferTypeSelect === type
                          ? 'bg-primary/10 border-primary text-primary shadow-xs'
                          : 'bg-content2 border-divider text-default-600 hover:bg-default-100'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Purpose input */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black text-primary uppercase tracking-widest pl-1 block select-none">
                  Justification Remarks / Transfer Motivation
                </label>
                <textarea
                  rows={2}
                  value={transferReasonInput ?? ''}
                  onChange={e => setTransferReasonInput(e.target.value)}
                  placeholder="e.g. Urgent stock replenishment for high-demand showroom order"
                  className="w-full bg-content2 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-xl font-sans active:scale-[0.98]"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: MANIFEST & PRODUCT ITEMS */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-fade-in">
            {/* Route Summary Pill */}
            <div className="flex items-center justify-between p-2.5 bg-content2/60 rounded-2xl border border-divider text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-default-500">From:</span>
                <span className="font-black text-foreground">{branches.find(b => b.id === transferSource)?.name || transferSource}</span>
                <span className="text-default-400 font-bold">→</span>
                <span className="font-bold text-default-500">To:</span>
                <span className="font-black text-primary">{branches.find(b => b.id === transferDest)?.name || transferDest}</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full">
                {transferTypeSelect}
              </span>
            </div>

            {/* NESTED BUILDER CAROUSEL */}
            <div className="bg-content2/40 p-4 rounded-2xl border border-divider space-y-3.5">
              <span className="text-[10px] font-extrabold text-primary uppercase tracking-wider block">
                Add Items to Transfer Order
              </span>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 space-y-1">
                  <HeroSelect
                    label="Select Ceramic Product"
                    placeholder="Choose a product..."
                    value={tempProductId ?? ''}
                    onValueChange={val => setTempProductId(val)}
                    radius="md"
                    items={branchProducts.map(p => {
                      const stockInBranch = branchStock.find(bs => bs.productId === p.id && bs.branchId === transferSource)?.quantity || 0;
                      return {
                        key: p.id,
                        value: p.id,
                        label: `${p.productName} (${p.size}) [ Stock: ${stockInBranch} ${p.unit || 'Unit'} ]`,
                      };
                    })}
                  />
                </div>
                <div className="w-full sm:w-28 space-y-1">
                  <span className="text-[9px] text-default-500 font-bold block">Request Qty</span>
                  <input
                    type="number"
                    min={1}
                    value={tempQty ?? ''}
                    onChange={e => setTempQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-content1 border border-divider focus:border-primary px-3 py-1.5 text-xs text-foreground text-center focus:outline-none transition-colors rounded-xl active:scale-[0.98]"
                  />
                </div>
                <div className="flex items-end">
                  <HeroButton
                    type="button"
                    color="secondary"
                    variant="solid"
                    size="sm"
                    onClick={() => {
                      if (!tempProductId) {
                        showToast('Please select a product from the list first.');
                        return;
                      }
                      const matchedProd = products.find(prod => prod.id === tempProductId);
                      if (!matchedProd) return;

                      const stockInBranch = branchStock.find(bs => bs.productId === tempProductId && bs.branchId === transferSource)?.quantity || 0;
                      if (tempQty > stockInBranch) {
                        showToast(`Warning: Dispatch branch only holds ${stockInBranch} boxes. Request exceeds available stock.`);
                      }

                      // Check if product is already in the transfer items cart
                      const existingIdx = transferItems.findIndex(it => it.productId === tempProductId);
                      if (existingIdx !== -1) {
                        setTransferItems(prev => prev.map((it, idx) => {
                          if (idx === existingIdx) {
                            return { ...it, quantity: it.quantity + tempQty };
                          }
                          return it;
                        }));
                      } else {
                        setTransferItems(prev => [...prev, { productId: tempProductId, quantity: tempQty }]);
                      }
                      
                      showToast(`Added ${tempQty} units of "${matchedProd.productName}"`);
                      setTempProductId('');
                    }}
                    className="w-full font-bold text-xs uppercase tracking-wider whitespace-nowrap"
                    startIcon={<Plus className="h-4 w-4" />}
                  >
                    Add Line
                  </HeroButton>
                </div>
              </div>

              {/* Added product items card view */}
              {transferItems.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold px-1 text-default-500">
                    <span>Staged Items Manifest ({transferItems.length} lines)</span>
                    <span className="text-primary font-black">Total: {totalBoxes} units</span>
                  </div>
                  <div className="bg-content1 border border-divider rounded-2xl divide-y divide-divider max-h-48 overflow-y-auto">
                    {transferItems.map((item, idx) => {
                      const prodDetails = products.find(p => p.id === item.productId);
                      return (
                        <div key={idx} className="flex justify-between items-center p-2.5 text-xs text-foreground">
                          <div className="flex flex-col">
                            <span className="font-extrabold">{prodDetails ? prodDetails.productName : 'Unknown Tile'}</span>
                            <span className="text-[10px] text-default-500">Product Code: {prodDetails ? prodDetails.productCode : item.productId}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-black text-danger bg-danger/10 px-2 py-0.5 rounded-xl">{item.quantity} boxes</span>
                            <button
                              type="button"
                              onClick={() => setTransferItems(prev => prev.filter((_, i) => i !== idx))}
                              className="text-default-400 hover:text-danger p-1 cursor-pointer transition-colors hover:bg-danger/10 rounded-full active:scale-95"
                              aria-label="Remove item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-default-400 text-xs italic bg-content1 rounded-2xl border border-dashed border-divider">
                  Item queue empty. Select tile and request quantity to populate list.
                </div>
              )}
            </div>
          </div>
        )}
      </HeroModal.Body>

      <HeroModal.Footer className="justify-between items-center gap-3 p-4 px-6 border-t border-divider bg-content1">
        <HeroButton
          type="button"
          variant="flat"
          size="sm"
          onClick={onClose}
          className="font-bold text-xs"
        >
          Cancel
        </HeroButton>

        <div className="flex items-center gap-2">
          {currentStep > 1 && (
            <HeroButton
              type="button"
              variant="flat"
              size="sm"
              onClick={() => setCurrentStep(1)}
              className="font-bold text-xs"
              startIcon={<ChevronLeft className="h-3.5 w-3.5" />}
            >
              Previous Step
            </HeroButton>
          )}

          {currentStep === 1 ? (
            <HeroButton
              type="button"
              color="primary"
              variant="solid"
              size="sm"
              onClick={handleNextStep}
              className="font-bold text-xs uppercase tracking-wider"
              endIcon={<ChevronRight className="h-3.5 w-3.5" />}
            >
              Next: Select Products
            </HeroButton>
          ) : (
            <HeroButton
              type="button"
              color="primary"
              variant="solid"
              size="sm"
              onClick={() => {
                if (transferItems.length === 0) {
                  showToast('Please add at least one product item to the transfer manifest.');
                  return;
                }
                onSubmit();
              }}
              disabled={transferItems.length === 0}
              className="font-bold text-xs uppercase tracking-wider"
              startIcon={<ArrowRightLeft className="h-4 w-4" />}
            >
              Submit Transfer Request ({totalBoxes} units)
            </HeroButton>
          )}
        </div>
      </HeroModal.Footer>
    </HeroModal>
  );
};

export default CreateTransferModal;
