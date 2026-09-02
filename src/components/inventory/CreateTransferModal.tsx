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
import { HeroInput } from '../common/ui/HeroInput';
import { HeroSelect } from '../common/ui/HeroSelect';
import { HeroTextarea } from '../common/ui/HeroTextarea';
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
            <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
              Formulate Stock Transfer Request
            </h3>
            <p className="text-[11px] text-default-500 font-medium mt-0.5">
              Multi-branch dispatch &amp; inventory allocation workflow
            </p>
          </div>
        </div>
      </HeroModal.Header>

      <HeroModal.Body className="p-6 space-y-4 font-sans text-xs">
        {/* Step Indicator Header */}
        <div className="grid grid-cols-2 gap-2 bg-zinc-100/90 dark:bg-zinc-800/80 p-1.5 rounded-2xl border border-zinc-200/50 dark:border-white/5 shadow-2xs">
          {steps.map((s) => {
            const isCurrent = currentStep === s.id;
            const isCompleted = currentStep > s.id;
            return (
              <button
                type="button"
                key={s.id}
                onClick={() => setCurrentStep(s.id)}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-all text-left cursor-pointer border ${
                  isCurrent
                    ? 'bg-white text-primary dark:bg-zinc-900 shadow-[0_2px_8px_rgba(0,0,0,0.08)] border-primary/40 ring-1 ring-primary/20 font-bold'
                    : isCompleted
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'bg-transparent border-transparent text-default-400 hover:text-foreground'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                  isCurrent
                    ? 'bg-primary text-white shadow-2xs'
                    : isCompleted
                    ? 'bg-emerald-500 text-white shadow-2xs'
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                }`}>
                  {isCompleted ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : s.id}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate">{s.label}</div>
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
                  radius="lg"
                  items={branches.filter(b => !b.isDeleted).map(b => ({
                    key: b.id,
                    value: b.id,
                    label: getBranchOptionLabel(b),
                  }))}
                />
                {currentUser?.role !== 'Admin' && (
                  <span className="text-[10px] text-default-500 pl-1">{branches.find(b => b.id === (currentUser?.branchAssignmentId || 'B1'))?.name}</span>
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
                  radius="lg"
                  items={branches.filter(b => !b.isDeleted && b.id !== transferSource).map(b => ({
                    key: b.id,
                    value: b.id,
                    label: getBranchOptionLabel(b),
                  }))}
                />
              </div>

              {/* Transfer Type Selection */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-default-500 uppercase tracking-wider pl-1 block select-none">
                  Transfer Type Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['Replenishment', 'Pull Out', 'Redistribution', 'Return to Warehouse'] as TransferType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setTransferTypeSelect(type)}
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer font-sans active:scale-95 ${
                        transferTypeSelect === type
                          ? 'bg-primary text-white border-primary shadow-[0_2px_8px_rgba(0,111,238,0.25)] font-bold'
                          : 'bg-zinc-100/90 dark:bg-zinc-800/80 border-zinc-200/50 dark:border-white/5 text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Purpose input */}
              <div className="space-y-1 md:col-span-2">
                <HeroTextarea
                  label="Justification Remarks / Transfer Motivation"
                  rows={2}
                  value={transferReasonInput ?? ''}
                  onValueChange={val => setTransferReasonInput(val)}
                  placeholder="e.g. Urgent stock replenishment for high-demand showroom order"
                  radius="lg"
                  variant="flat"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: MANIFEST & PRODUCT ITEMS */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-fade-in">
            {/* Route Summary Pill */}
            <div className="flex items-center justify-between p-3 bg-zinc-100/90 dark:bg-zinc-900/80 rounded-2xl border border-zinc-200/60 dark:border-white/5 text-xs shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-default-500">From:</span>
                <span className="font-bold text-foreground">{branches.find(b => b.id === transferSource)?.name || transferSource}</span>
                <span className="text-default-400 font-bold">→</span>
                <span className="font-bold text-default-500">To:</span>
                <span className="font-bold text-primary">{branches.find(b => b.id === transferDest)?.name || transferDest}</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full">
                {transferTypeSelect}
              </span>
            </div>

            {/* NESTED BUILDER CAROUSEL */}
            <div className="bg-zinc-100/90 dark:bg-zinc-900/80 p-4 rounded-2xl border border-zinc-200/60 dark:border-white/5 space-y-3.5 shadow-2xs">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
                Add Items to Transfer Order
              </span>
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 space-y-1 w-full">
                  <HeroSelect
                    label="Select Ceramic Product"
                    placeholder="Choose a product..."
                    value={tempProductId ?? ''}
                    onValueChange={val => setTempProductId(val)}
                    radius="lg"
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
                  <HeroInput
                    label="Request Qty"
                    type="number"
                    min={1}
                    value={tempQty ? String(tempQty) : '1'}
                    onValueChange={val => setTempQty(Math.max(1, parseInt(val) || 1))}
                    radius="lg"
                    variant="flat"
                  />
                </div>
                <div className="flex items-end shrink-0">
                  <HeroButton
                    type="button"
                    color="primary"
                    variant="solid"
                    size="md"
                    radius="lg"
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
                    className="font-bold text-xs uppercase tracking-wider whitespace-nowrap shadow-2xs"
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
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-white/5 rounded-2xl divide-y divide-divider/20 max-h-48 overflow-y-auto shadow-2xs">
                    {transferItems.map((item, idx) => {
                      const prodDetails = products.find(p => p.id === item.productId);
                      return (
                        <div key={idx} className="flex justify-between items-center p-3 text-xs text-foreground">
                          <div className="flex flex-col">
                            <span className="font-bold">{prodDetails ? prodDetails.productName : 'Unknown Tile'}</span>
                            <span className="text-[10px] text-default-500 font-mono">Product Code: {prodDetails ? prodDetails.productCode : item.productId}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-bold text-danger bg-danger/10 px-2 py-0.5 rounded-xl">{item.quantity} boxes</span>
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
                <div className="text-center py-6 text-default-400 text-xs italic bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200/60 dark:border-white/5">
                  Item queue empty. Select tile and request quantity to populate list.
                </div>
              )}
            </div>
          </div>
        )}
      </HeroModal.Body>

      <HeroModal.Footer className="justify-between items-center gap-3 p-4 px-6 border-t border-divider">
        <HeroButton
          type="button"
          variant="flat"
          size="sm"
          radius="full"
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
              radius="full"
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
              radius="full"
              onClick={handleNextStep}
              className="font-bold text-xs shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
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
              radius="full"
              onClick={() => {
                if (transferItems.length === 0) {
                  showToast('Please add at least one product item to the transfer manifest.');
                  return;
                }
                onSubmit();
              }}
              disabled={transferItems.length === 0}
              className="font-bold text-xs shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
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
