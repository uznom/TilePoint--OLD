import React, { useState } from 'react';
import { 
  Building2, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  DollarSign, 
  Layers, 
  MapPin, 
  Package, 
  Plus, 
  RefreshCw, 
  Sliders, 
  Sparkles, 
} from 'lucide-react';
import { Branch, Supplier, User, UserRole } from '../../types/db';
import { useDb } from '../../context/DbContext';
import { getBranchOptionLabel } from '../../lib/branchUtils';
import { HeroButton, HeroCheckbox, HeroSelect } from '../common/ui';
import { HeroInput } from '../common/ui/HeroInput';
import { HeroModal } from '../common/ui/HeroModal';

interface AddEditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isEditMode: boolean;
  productCode: string;
  setProductCode: (v: string) => void;
  sku: string;
  setSku: (v: string) => void;
  barcode: string;
  setBarcode: (v: string) => void;
  generateEan13Barcode: () => string;
  showToast: (msg: string) => void;
  category: string;
  setCategory: (v: string) => void;
  categories: string[];
  isCustomCategoryInput: boolean;
  setIsCustomCategoryInput: (v: boolean) => void;
  brand: string;
  setBrand: (v: string) => void;
  designName: string;
  setDesignName: (v: string) => void;
  productName: string;
  setProductName: (v: string) => void;
  unit: string;
  setUnit: (v: string) => void;
  size: string;
  setSize: (v: string) => void;
  boxQuantity: number;
  setBoxQuantity: (v: number) => void;
  coveragePerBox: number;
  setCoveragePerBox: (v: number) => void;
  isRegisteringNewSupplier: boolean;
  setIsRegisteringNewSupplier: (v: boolean) => void;
  supplierId: string;
  setSupplierId: (v: string) => void;
  suppliers: Supplier[];
  setShowQuickSupplierModal: (v: boolean) => void;
  newSupplierName: string;
  setNewSupplierName: (v: string) => void;
  newSupplierContact: string;
  setNewSupplierContact: (v: string) => void;
  newSupplierPhone: string;
  setNewSupplierPhone: (v: string) => void;
  newSupplierEmail: string;
  setNewSupplierEmail: (v: string) => void;
  newSupplierAddress: string;
  setNewSupplierAddress: (v: string) => void;
  costPrice: number;
  handleCostPriceChange: (v: number) => void;
  markupPercent: number;
  handleMarkupChange: (v: number) => void;
  sellingPrice: number;
  handleSellingPriceChange: (v: number) => void;
  taxType: string;
  setTaxType: (v: string) => void;
  targetBranchId: string;
  setTargetBranchId: (v: string) => void;
  origin: string;
  setOrigin: (v: string) => void;
  currentUser: User | null;
  branches: Branch[];
  stockQuantity: number;
  setStockQuantity: (v: number) => void;
  minimumStock: number;
  setMinimumStock: (v: number) => void;
  hasExpiration: boolean;
  setHasExpiration: (v: boolean) => void;
  expirationDate: string;
  setExpirationDate: (v: string) => void;
}

export const AddEditProductModal: React.FC<AddEditProductModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isEditMode,
  productCode,
  setProductCode,
  sku,
  setSku,
  barcode,
  setBarcode,
  generateEan13Barcode,
  showToast,
  category,
  setCategory,
  categories,
  isCustomCategoryInput,
  setIsCustomCategoryInput,
  brand,
  setBrand,
  designName,
  setDesignName,
  productName,
  setProductName,
  unit,
  setUnit,
  size,
  setSize,
  boxQuantity,
  setBoxQuantity,
  coveragePerBox,
  setCoveragePerBox,
  isRegisteringNewSupplier,
  setIsRegisteringNewSupplier,
  supplierId,
  setSupplierId,
  suppliers,
  setShowQuickSupplierModal,
  newSupplierName,
  setNewSupplierName,
  newSupplierContact,
  setNewSupplierContact,
  newSupplierPhone,
  setNewSupplierPhone,
  newSupplierEmail,
  setNewSupplierEmail,
  newSupplierAddress,
  setNewSupplierAddress,
  costPrice,
  handleCostPriceChange,
  markupPercent,
  handleMarkupChange,
  sellingPrice,
  handleSellingPriceChange,
  taxType,
  setTaxType,
  targetBranchId,
  setTargetBranchId,
  origin,
  setOrigin,
  currentUser,
  branches,
  stockQuantity,
  setStockQuantity,
  minimumStock,
  setMinimumStock,
  hasExpiration,
  setHasExpiration,
  expirationDate,
  setExpirationDate,
}) => {
  const { unitTypes } = useDb();
  const [currentStep, setCurrentStep] = useState<number>(1);

  if (!isOpen) return null;

  // Validation before advancing steps
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!productCode?.trim()) {
        showToast('Please enter a Product Core Code');
        return;
      }
      if (!productName?.trim()) {
        showToast('Please enter a Product Full Descriptive Name');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (isRegisteringNewSupplier && !newSupplierName?.trim()) {
        showToast('Please enter the Supplier Company Name');
        return;
      }
      setCurrentStep(3);
    }
  };

  const steps = [
    { id: 1, label: 'Identification & Specs', icon: Package, desc: 'Product codes & dimensions' },
    { id: 2, label: 'Supplier Sourcing', icon: Building2, desc: 'Wholesaler & vendor details' },
    { id: 3, label: 'Pricing & Logistics', icon: DollarSign, desc: 'Cost, retail markup & stock' },
  ];

  return (
    <HeroModal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
    >
      <form onSubmit={onSubmit} className="flex flex-col h-full overflow-hidden font-sans">
        {/* Modal Title Header */}
        <HeroModal.Header className="pb-4 border-b border-divider/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                {isEditMode ? 'Modify Product Specifications' : 'Register New Hardware Inventory Unit'}
              </h3>
              <p className="text-[11px] text-default-500 font-medium mt-0.5">
                {isEditMode ? 'Update catalog attributes, pricing structures, and inventory parameters' : 'Step-by-step product onboarding wizard'}
              </p>
            </div>
          </div>
        </HeroModal.Header>

        <HeroModal.Body className="p-6 space-y-5 overflow-y-auto">

        {/* Multi-Step Wizard Progress Header */}
        <div className="grid grid-cols-3 gap-2 bg-zinc-100 dark:bg-zinc-800/80 p-1.5 rounded-2xl border border-zinc-200/50 dark:border-white/5">
          {steps.map((s) => {
            const isCurrent = currentStep === s.id;
            const isCompleted = currentStep > s.id;
            return (
              <button
                type="button"
                key={s.id}
                onClick={() => setCurrentStep(s.id)}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-all text-left cursor-pointer border font-sans ${
                  isCurrent
                    ? 'bg-white dark:bg-zinc-900 border-zinc-200/70 dark:border-white/10 text-primary shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                    : isCompleted
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-transparent border-transparent text-default-400 hover:text-foreground'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                  isCurrent
                    ? 'bg-primary text-primary-foreground'
                    : isCompleted
                    ? 'bg-emerald-500 text-white'
                    : 'bg-zinc-200 dark:bg-zinc-700 text-default-600'
                }`}>
                  {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : s.id}
                </div>
                <div className="min-w-0 flex-1 hidden sm:block">
                  <div className="text-xs font-bold uppercase tracking-wider truncate flex items-center gap-1">
                    <span>{s.label}</span>
                  </div>
                  <div className="text-[10px] text-default-500 truncate font-medium">{s.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* STEP CONTENT CONTAINER */}
        <div className="space-y-6 min-h-[360px]">
          {/* ============================================================ */}
          {/* STEP 1: GENERAL IDENTIFICATION & PHYSICAL ATTRIBUTES */}
          {/* ============================================================ */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-fade-in">
              {/* SECTION 1: GENERAL SPECIFICATIONS */}
              <div className="p-5 rounded-2xl bg-zinc-100/90 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-white/5 space-y-4 shadow-2xs">
                <div className="flex items-center gap-2 border-b border-divider/20 pb-2 mb-1">
                  <Package className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">1. General Product Identification</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <HeroInput
                    label="Product Code / SKU *"
                    required
                    value={productCode ?? ''}
                    onValueChange={val => {
                      setProductCode(val);
                      setSku(val);
                    }}
                    placeholder="e.g. TILE-6060-GR"
                    radius="lg"
                    variant="flat"
                  />

                  <div className="space-y-1">
                    <HeroInput
                      label="Barcode (Scannable / EAN-13)"
                      value={barcode ?? ''}
                      onValueChange={val => setBarcode(val)}
                      placeholder="e.g. 4801122334455"
                      radius="lg"
                      variant="flat"
                      endContent={
                        <button
                          type="button"
                          onClick={() => {
                            const newBc = generateEan13Barcode();
                            setBarcode(newBc);
                            showToast(`Generated fresh EAN-13 barcode: ${newBc}`);
                          }}
                          className="text-[10px] font-bold uppercase text-primary hover:underline flex items-center gap-1 cursor-pointer pr-1"
                          title="Generate fresh valid 13-digit EAN-13 barcode"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>Gen</span>
                        </button>
                      }
                    />
                  </div>

                  <div className="space-y-1 relative">
                    <div className="flex items-center justify-between pl-1">
                      <label className="text-[10px] font-bold text-default-500 uppercase tracking-wider select-none">Category Classification</label>
                      <button
                        type="button"
                        onClick={() => setIsCustomCategoryInput(!isCustomCategoryInput)}
                        className="text-[10px] font-bold uppercase text-primary hover:underline cursor-pointer"
                      >
                        {isCustomCategoryInput ? "← Select List" : "+ Custom Category"}
                      </button>
                    </div>
                    {isCustomCategoryInput ? (
                      <HeroInput
                        required
                        value={category ?? ''}
                        onValueChange={val => setCategory(val)}
                        placeholder="e.g. Electrical Tools, Solar Modules"
                        radius="lg"
                        variant="flat"
                      />
                    ) : (
                      <HeroSelect
                        value={category ?? ''}
                        onValueChange={(val) => {
                          if (val === '__CUSTOM__') {
                            setIsCustomCategoryInput(true);
                            setCategory('');
                          } else {
                            setCategory(val);
                          }
                        }}
                        radius="lg"
                        items={[
                          ...categories.map((cat) => ({ key: cat, value: cat, label: cat })),
                          { key: '__CUSTOM__', value: '__CUSTOM__', label: '+ Add Custom New Category...' }
                        ]}
                      />
                    )}
                  </div>

                  <HeroInput
                    label="Corporate Brand / Label"
                    required={!isRegisteringNewSupplier}
                    value={brand ?? ''}
                    onValueChange={val => setBrand(val)}
                    placeholder="Brand name"
                    radius="lg"
                    variant="flat"
                  />

                  <HeroInput
                    label="Tile Design Name (Optional)"
                    value={designName ?? ''}
                    onValueChange={val => setDesignName(val)}
                    placeholder="Tile design name"
                    radius="lg"
                    variant="flat"
                  />

                  <div className="md:col-span-2 lg:col-span-3">
                    <HeroInput
                      label="Product Full Descriptive Name *"
                      required
                      value={productName ?? ''}
                      onValueChange={val => setProductName(val)}
                      placeholder="Full descriptive product title (e.g. 60x60 Glazed Polished Porcelain Floor Tile)"
                      radius="lg"
                      variant="flat"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: PHYSICAL SPECS & PACKAGING */}
              <div className="p-5 rounded-2xl bg-zinc-100/90 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-white/5 space-y-4 shadow-2xs">
                <div className="flex items-center gap-2 border-b border-divider/20 pb-2 mb-1">
                  <Layers className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">2. Physical Attributes &amp; Packaging</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1 relative">
                    <HeroInput
                      label="Trading Unit"
                      required
                      value={unit ?? ''}
                      onValueChange={val => setUnit(val)}
                      placeholder="Box / Piece / Bag"
                      radius="lg"
                      variant="flat"
                    />
                    <datalist id="dynamic-unit-options">
                      {(unitTypes || []).filter(u => u.isActive !== false).map(u => (
                        <option key={u.id} value={u.name}>{u.abbreviation ? `${u.name} (${u.abbreviation})` : u.name}</option>
                      ))}
                      <option value="Box" />
                      <option value="Piece" />
                      <option value="Square Meter" />
                      <option value="Roll" />
                      <option value="Bag" />
                      <option value="Set" />
                    </datalist>
                  </div>

                  <HeroInput
                    label="Dimensions"
                    value={size ?? ''}
                    onValueChange={val => setSize(val)}
                    placeholder="Dimensions (e.g. 60x60 cm)"
                    radius="lg"
                    variant="flat"
                  />

                  <HeroInput
                    label={category.toLowerCase().includes('tile') ? 'Tiles Per Box' : 'Pack / Box Quantity'}
                    type="number"
                    required
                    value={boxQuantity ? String(boxQuantity) : ''}
                    placeholder="1"
                    onValueChange={val => setBoxQuantity(val === '' ? 0 : Number(val))}
                    radius="lg"
                    variant="flat"
                  />

                  <HeroInput
                    label="Coverage (m²)"
                    type="number"
                    step="0.001"
                    required
                    value={coveragePerBox === 0 ? '' : coveragePerBox ? String(coveragePerBox) : ''}
                    placeholder="0.00"
                    onValueChange={val => setCoveragePerBox(val === '' ? 0 : Number(val))}
                    radius="lg"
                    variant="flat"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 2: WHOLESALER SUPPLIER & SOURCING */}
          {/* ============================================================ */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-5 rounded-2xl bg-zinc-100/90 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-white/5 space-y-4 shadow-2xs">
                <div className="flex items-center gap-2 border-b border-divider/20 pb-2 mb-1">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">Wholesaler Supplier &amp; Sourcing Profile</span>
                </div>

                <div className="space-y-4 relative">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-default-500 uppercase tracking-wider select-none">
                      Vendor / Wholesaler Assignment
                    </label>
                    {!isEditMode && (
                      <HeroCheckbox
                        checked={isRegisteringNewSupplier}
                        onChange={e => setIsRegisteringNewSupplier(e.target.checked)}
                        label="Register Brand New Supplier"
                        color="secondary"
                        size="sm"
                      />
                    )}
                  </div>

                  {!isRegisteringNewSupplier ? (
                    <div className="space-y-3">
                      <div className="flex gap-2 items-center">
                        <div className="flex-1">
                          <HeroSelect
                            value={supplierId ?? ''}
                            onValueChange={(val) => setSupplierId(val)}
                            radius="lg"
                            placeholder="Select Supplier"
                            items={suppliers.filter(s => !s.isDeleted).map((sup) => ({
                              key: sup.id,
                              value: sup.id,
                              label: sup.name
                            }))}
                          />
                        </div>
                        <HeroButton
                          type="button"
                          variant="flat"
                          color="secondary"
                          size="sm"
                          radius="full"
                          onClick={() => setShowQuickSupplierModal(true)}
                          className="font-bold text-xs uppercase tracking-wider whitespace-nowrap"
                          startIcon={<Plus className="h-3.5 w-3.5" />}
                        >
                          Quick Add
                        </HeroButton>
                      </div>

                      {/* Supplier Preview Card */}
                      {(() => {
                        const activeSupplier = suppliers.find(s => s.id === supplierId);
                        if (!activeSupplier) return null;
                        return (
                          <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/70 dark:border-white/10 text-xs space-y-1 shadow-elevation-soft">
                            <div className="font-bold text-primary text-sm">{activeSupplier.name}</div>
                            <div className="text-default-500 text-[11px] flex flex-wrap gap-x-4 gap-y-1 font-medium">
                              {activeSupplier.contactPerson && <span>Agent: <strong className="text-foreground">{activeSupplier.contactPerson}</strong></span>}
                              {activeSupplier.phone && <span>Phone: <strong className="text-foreground">{activeSupplier.phone}</strong></span>}
                              {activeSupplier.email && <span>Email: <strong className="text-foreground">{activeSupplier.email}</strong></span>}
                            </div>
                            {activeSupplier.address && <div className="text-default-400 text-[10px]">{activeSupplier.address}</div>}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="space-y-3 pt-1">
                      <p className="text-[11px] text-default-500 font-medium leading-relaxed bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-zinc-200/70 dark:border-white/10 shadow-elevation-soft">
                        This will register a new vendor profile in the database and automatically link it to this product.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <HeroInput
                          label="Supplier Company Name *"
                          required={isRegisteringNewSupplier}
                          value={newSupplierName ?? ''}
                          onValueChange={val => setNewSupplierName(val)}
                          placeholder="Supplier corporate name"
                          radius="lg"
                          variant="flat"
                        />

                        <HeroInput
                          label="Primary Contact Agent"
                          value={newSupplierContact ?? ''}
                          onValueChange={val => setNewSupplierContact(val)}
                          placeholder="Contact agent name"
                          radius="lg"
                          variant="flat"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <HeroInput
                          label="Contact Phone"
                          value={newSupplierPhone ?? ''}
                          onValueChange={val => setNewSupplierPhone(val)}
                          placeholder="Phone number"
                          radius="lg"
                          variant="flat"
                        />

                        <HeroInput
                          label="Corporate Email"
                          type="email"
                          value={newSupplierEmail ?? ''}
                          onValueChange={val => setNewSupplierEmail(val)}
                          placeholder="Corporate email address"
                          radius="lg"
                          variant="flat"
                        />
                      </div>

                      <HeroInput
                        label="Office Address"
                        value={newSupplierAddress ?? ''}
                        onValueChange={val => setNewSupplierAddress(val)}
                        placeholder="Street, City, Province"
                        radius="lg"
                        variant="flat"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 3: PRICING, STOCK LEVELS & EXPIRATION */}
          {/* ============================================================ */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-fade-in">
              {/* SECTION 4: FINANCIAL DETAILS */}
              <div className="p-5 rounded-2xl bg-zinc-100/90 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-white/5 space-y-4 shadow-2xs">
                <div className="flex items-center gap-2 border-b border-divider/20 pb-2 mb-1">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">3. Pricing, Markups &amp; Tax</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <HeroInput
                    label="Cost Price (₱)"
                    type="number"
                    step="any"
                    required
                    value={costPrice === 0 ? '' : costPrice ? String(costPrice) : ''}
                    placeholder="0.00"
                    onValueChange={val => handleCostPriceChange(val === '' ? 0 : Number(val))}
                    radius="lg"
                    variant="flat"
                  />

                  <HeroInput
                    label="Markup (%)"
                    type="number"
                    step="any"
                    required
                    value={markupPercent === 0 ? '' : markupPercent ? String(markupPercent) : ''}
                    placeholder="0"
                    onValueChange={val => handleMarkupChange(val === '' ? 0 : Number(val))}
                    helperText={costPrice > 0 && sellingPrice > 0 ? `+₱${Math.max(0, Math.round((sellingPrice - costPrice) * 100) / 100).toFixed(2)}` : undefined}
                    radius="lg"
                    variant="flat"
                  />

                  <HeroInput
                    label="Selling Price (Retail ₱)"
                    type="number"
                    step="any"
                    required
                    value={sellingPrice === 0 ? '' : sellingPrice ? String(sellingPrice) : ''}
                    placeholder="0.00"
                    onValueChange={val => handleSellingPriceChange(val === '' ? 0 : Number(val))}
                    helperText={markupPercent > 0 ? `(${markupPercent}% MU)` : undefined}
                    radius="lg"
                    variant="flat"
                  />

                  <HeroSelect
                    label="VAT Taxation Type"
                    value={taxType ?? ''}
                    onValueChange={(val) => setTaxType(val)}
                    radius="lg"
                    items={[
                      { key: '12% VAT', value: '12% VAT', label: 'Standard 12% VAT' },
                      { key: 'VAT Exempt', value: 'VAT Exempt', label: 'VAT Exempt' },
                      { key: 'Zero Rated', value: 'Zero Rated', label: 'Zero Rated (0% VAT)' },
                    ]}
                  />
                </div>
              </div>

              {/* SECTION 5: STOCK LEVELS & EXPIRATION */}
              <div className="p-5 rounded-2xl bg-zinc-100/90 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-white/5 space-y-4 shadow-2xs">
                <div className="flex items-center gap-2 border-b border-divider/20 pb-2 mb-1">
                  <Sliders className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">4. Stock Control &amp; Branch Allocation</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1 relative pl-0 md:col-span-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200/70 dark:border-white/10 shadow-elevation-soft">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-bold text-primary uppercase tracking-wider pl-1 select-none flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>Assigned Branch / Stock Location</span>
                      </label>
                      {currentUser?.role !== UserRole.ADMIN && (
                        <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-mono">
                          {branches.find(b => b.id === (currentUser?.branchAssignmentId || 'B1'))?.name || `Branch ${currentUser?.branchAssignmentId}`}
                        </span>
                      )}
                    </div>
                    {currentUser?.role === UserRole.ADMIN ? (
                      <HeroSelect
                        value={targetBranchId ?? ''}
                        onValueChange={(val) => {
                          setTargetBranchId(val);
                          setOrigin(val);
                        }}
                        radius="lg"
                        items={branches.filter(b => !b.isDeleted).map(b => ({
                          key: b.id,
                          value: b.id,
                          label: getBranchOptionLabel(b)
                        }))}
                      />
                    ) : (
                      <div className="px-3.5 py-2 text-xs font-bold text-foreground bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200/50 dark:border-white/5 flex items-center justify-between">
                        <span>{branches.find(b => b.id === (currentUser?.branchAssignmentId || 'B1'))?.name || currentUser?.branchAssignmentId}</span>
                        <span className="text-[10px] font-bold text-secondary font-mono">ID: {currentUser?.branchAssignmentId || 'B1'}</span>
                      </div>
                    )}
                  </div>

                  <HeroInput
                    label="Initial Warehouse Stock"
                    type="number"
                    required
                    value={stockQuantity === 0 ? '' : stockQuantity ? String(stockQuantity) : ''}
                    placeholder="0"
                    onValueChange={val => setStockQuantity(val === '' ? 0 : Number(val))}
                    radius="lg"
                    variant="flat"
                  />

                  <HeroInput
                    label="Alert Stock Limit"
                    type="number"
                    required
                    value={minimumStock === 0 ? '' : minimumStock ? String(minimumStock) : ''}
                    placeholder="0"
                    onValueChange={val => setMinimumStock(val === '' ? 0 : Number(val))}
                    radius="lg"
                    variant="flat"
                  />

                  <div className="space-y-1 relative pl-0 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200/70 dark:border-white/10 flex flex-col justify-between shadow-elevation-soft">
                    <div>
                      <label className="text-[10px] font-bold text-default-500 uppercase tracking-wider pl-1 select-none block">Shelf-Life Expiration</label>
                      <span className="text-[10px] text-default-500 font-medium pl-1 select-none block mt-0.5 leading-snug">Requires expiration date?</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setHasExpiration(true)}
                        className={`flex-1 py-1.5 px-3 rounded-full border text-[11px] font-bold transition-all text-center cursor-pointer ${
                          hasExpiration 
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-2xs' 
                            : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200/50 dark:border-white/5 text-default-500'
                        }`}
                      >
                        Yes, Has Expiry
                      </button>
                      <button
                        type="button"
                        onClick={() => setHasExpiration(false)}
                        className={`flex-1 py-1.5 px-3 rounded-full border text-[11px] font-bold transition-all text-center cursor-pointer ${
                          !hasExpiration 
                            ? 'bg-primary/15 border-primary/30 text-primary shadow-2xs' 
                            : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200/50 dark:border-white/5 text-default-500'
                        }`}
                      >
                        No Expiry Date
                      </button>
                    </div>
                  </div>

                  {hasExpiration && (
                    <div className="space-y-2 relative pl-0 md:col-span-3 bg-amber-500/5 p-4 rounded-2xl border border-amber-500/20 animate-fade-in flex flex-col gap-2.5">
                      <div className="flex items-center gap-2 text-amber-500 font-bold">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs uppercase tracking-wider">Specify Product Expiration Date</span>
                      </div>
                      <p className="text-[11px] text-default-500 leading-relaxed pl-0.5 font-medium">
                        Set the standard catalog expiration date for this listing. The system will flag this item in inventory tables and sales invoices when approaching or past expiration.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                        <HeroInput
                          label="Catalog Expiry Date *"
                          type="date"
                          required={hasExpiration}
                          value={expirationDate ?? ''}
                          onValueChange={val => setExpirationDate(val)}
                          radius="lg"
                          variant="flat"
                        />
                        <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-amber-500/20 text-[11px] text-default-500 flex flex-col justify-center gap-0.5 shadow-2xs">
                          <div className="font-bold text-amber-500 flex items-center gap-1">
                            <span>●</span> Active Expiry Flagging
                          </div>
                          <div className="text-[10px] leading-relaxed text-default-400 font-medium">
                            Items with active expirations are automatically tracked and marked on sales invoices, stock transfer forms, and listed in the central Expiry Calendar.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="md:col-span-3">
                    <HeroInput
                      label="Acquired From / Stock Source"
                      value={origin ?? ''}
                      onValueChange={val => setOrigin(val)}
                      placeholder="Acquired from / Stock source (e.g. Local Import, Direct Factory Mill)"
                      radius="lg"
                      variant="flat"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </HeroModal.Body>

      <HeroModal.Footer className="justify-between items-center gap-3 p-4 px-6 border-t border-divider/20 bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-3">
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
          <span className="text-[10px] text-default-400 font-bold hidden sm:inline">
            Step {currentStep} of 3
          </span>
        </div>

        <div className="flex items-center gap-2">
          {currentStep > 1 && (
            <HeroButton
              type="button"
              variant="flat"
              size="sm"
              radius="full"
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              className="font-bold text-xs"
              startIcon={<ChevronLeft className="h-3.5 w-3.5" />}
            >
              Previous Step
            </HeroButton>
          )}

          {currentStep < 3 ? (
            <HeroButton
              type="button"
              color="primary"
              variant="solid"
              size="sm"
              radius="full"
              onClick={handleNextStep}
              className="font-bold text-xs uppercase tracking-wider shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
              endIcon={<ChevronRight className="h-3.5 w-3.5" />}
            >
              Next Step
            </HeroButton>
          ) : (
            <HeroButton
              type="submit"
              color="primary"
              variant="solid"
              size="sm"
              radius="full"
              className="font-bold text-xs uppercase tracking-wider shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
              startIcon={<Sparkles className="h-3.5 w-3.5" />}
            >
              {isEditMode ? 'Save Specifications' : 'Validate & Save Product'}
            </HeroButton>
          )}
        </div>
      </HeroModal.Footer>
    </form>
  </HeroModal>
);
};

export default AddEditProductModal;
