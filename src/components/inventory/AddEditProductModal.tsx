import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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
  X 
} from 'lucide-react';
import { Branch, Supplier, User, UserRole } from '../../types/db';
import { useDb } from '../../context/DbContext';
import { getBranchOptionLabel } from '../../lib/branchUtils';
import { HeroButton, HeroCheckbox } from '../common/ui';

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

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
      {/* Full-Screen Uniform Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />
      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-4xl rounded-large border border-divider p-6 z-20 shadow-2xl bg-content1 text-foreground flex flex-col gap-5 text-left overflow-y-auto max-h-[90vh]"
      >
        {/* Modal Title Header */}
        <div className="flex items-center justify-between border-b border-divider pb-4">
          <div>
            <h3 className="text-base font-black text-primary uppercase tracking-wider flex items-center gap-2">
              <Layers className="h-5 w-5" />
              <span>{isEditMode ? 'Modify Product Specifications' : 'Register New Hardware Inventory Unit'}</span>
            </h3>
            <p className="text-[11px] text-default-500 font-medium mt-0.5">
              {isEditMode ? 'Update catalog attributes, pricing structures, and inventory parameters' : 'Step-by-step product onboarding wizard'}
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-default-400 hover:text-foreground cursor-pointer p-1.5 rounded-medium hover:bg-default-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Multi-Step Wizard Progress Header */}
        <div className="grid grid-cols-3 gap-2 bg-content2/50 p-1.5 rounded-large border border-divider">
          {steps.map((s) => {
            const isCurrent = currentStep === s.id;
            const isCompleted = currentStep > s.id;
            return (
              <button
                type="button"
                key={s.id}
                onClick={() => setCurrentStep(s.id)}
                className={`flex items-center gap-2.5 p-2.5 rounded-medium transition-all text-left cursor-pointer border ${
                  isCurrent
                    ? 'bg-content1 border-primary/40 text-primary shadow-sm ring-1 ring-primary/20'
                    : isCompleted
                    ? 'bg-success/5 border-success/20 text-success hover:bg-success/10'
                    : 'bg-transparent border-transparent text-default-400 hover:text-foreground hover:bg-content2'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                  isCurrent
                    ? 'bg-primary text-primary-foreground'
                    : isCompleted
                    ? 'bg-success text-success-foreground'
                    : 'bg-default-200 text-default-600'
                }`}>
                  {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : s.id}
                </div>
                <div className="min-w-0 flex-1 hidden sm:block">
                  <div className="text-xs font-black uppercase truncate flex items-center gap-1">
                    <span>{s.label}</span>
                  </div>
                  <div className="text-[10px] text-default-400 truncate font-medium">{s.desc}</div>
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
              <div className="p-4 rounded-large bg-content2/40 border border-divider space-y-4">
                <div className="flex items-center gap-2 border-b border-divider pb-2 mb-1">
                  <Package className="h-4 w-4 text-primary" />
                  <span className="text-xs font-black uppercase tracking-wider text-primary">1. General Product Identification</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-black text-default-500 uppercase tracking-widest pl-1 select-none">
                      Product Core Code <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={productCode ?? ''}
                      onChange={e => setProductCode(e.target.value)}
                      placeholder="e.g. TILE-6060-GR"
                      className="w-full bg-content1 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium font-bold"
                    />
                  </div>

                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-black text-default-500 uppercase tracking-widest pl-1 select-none">
                      Warehouse SKU ID <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={sku ?? ''}
                      onChange={e => setSku(e.target.value)}
                      placeholder="e.g. SKU-10492"
                      className="w-full bg-content1 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium font-bold"
                    />
                  </div>

                  <div className="space-y-1 relative">
                    <div className="flex items-center justify-between pl-1">
                      <label className="text-[10px] font-black text-default-500 uppercase tracking-widest select-none">
                        Barcode Sequence ID
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const newBc = generateEan13Barcode();
                          setBarcode(newBc);
                          showToast(`Generated fresh EAN-13 barcode: ${newBc}`);
                        }}
                        className="text-[9px] font-black uppercase text-primary hover:underline flex items-center gap-1 cursor-pointer"
                        title="Generate fresh valid 13-digit EAN-13 barcode"
                      >
                        <RefreshCw className="h-2.5 w-2.5" />
                        <span>Auto-Generate</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={barcode ?? ''}
                      onChange={e => setBarcode(e.target.value)}
                      placeholder="e.g. 4801122334455"
                      className="w-full bg-content1 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium font-bold"
                    />
                  </div>

                  <div className="space-y-1 relative">
                    <div className="flex items-center justify-between pl-1">
                      <label className="text-[10px] font-black text-default-500 uppercase tracking-widest select-none">Category Classification</label>
                      <button
                        type="button"
                        onClick={() => setIsCustomCategoryInput(!isCustomCategoryInput)}
                        className="text-[9px] font-black uppercase text-primary hover:underline cursor-pointer"
                      >
                        {isCustomCategoryInput ? "← Select List" : "+ Custom Category"}
                      </button>
                    </div>
                    {isCustomCategoryInput ? (
                      <input
                        type="text"
                        required
                        value={category ?? ''}
                        onChange={e => setCategory(e.target.value)}
                        placeholder="e.g. Electrical Tools, Solar Modules"
                        className="w-full bg-content1 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium font-bold"
                      />
                    ) : (
                      <select
                        value={category ?? ''}
                        onChange={e => {
                          if (e.target.value === '__CUSTOM__') {
                            setIsCustomCategoryInput(true);
                            setCategory('');
                          } else {
                            setCategory(e.target.value);
                          }
                        }}
                        className="w-full bg-content1 border border-divider focus:border-primary px-3 py-2.5 text-xs text-foreground focus:outline-none transition-colors rounded-medium cursor-pointer font-bold"
                      >
                        {categories.map((cat, i) => (
                          <option key={i} value={cat}>{cat}</option>
                        ))}
                        <option value="__CUSTOM__">+ Add Custom New Category...</option>
                      </select>
                    )}
                  </div>

                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-black text-default-500 uppercase tracking-widest pl-1 select-none">Corporate Brand / Label</label>
                    <input
                      type="text"
                      required={!isRegisteringNewSupplier}
                      value={brand ?? ''}
                      onChange={e => setBrand(e.target.value)}
                      placeholder="Brand name"
                      className="w-full bg-content1 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium font-bold"
                    />
                  </div>

                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-black text-default-500 uppercase tracking-widest pl-1 select-none">Tile Design Name (Optional)</label>
                    <input
                      type="text"
                      value={designName ?? ''}
                      onChange={e => setDesignName(e.target.value)}
                      placeholder="Tile design name"
                      className="w-full bg-content1 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium font-bold"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-3 relative">
                    <label className="text-[10px] font-black text-default-500 uppercase tracking-widest pl-1 select-none">
                      Product Full Descriptive Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={productName ?? ''}
                      onChange={e => setProductName(e.target.value)}
                      placeholder="Full descriptive product title (e.g. 60x60 Glazed Polished Porcelain Floor Tile)"
                      className="w-full bg-content1 border border-divider focus:border-primary px-3 py-2.5 text-xs text-foreground focus:outline-none transition-colors rounded-medium font-sans font-black text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: PHYSICAL SPECS & PACKAGING */}
              <div className="p-4 rounded-large bg-content2/40 border border-divider space-y-4">
                <div className="flex items-center gap-2 border-b border-divider pb-2 mb-1">
                  <Layers className="h-4 w-4 text-primary" />
                  <span className="text-xs font-black uppercase tracking-wider text-primary">2. Physical Attributes & Packaging</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-black text-default-500 uppercase tracking-widest pl-1 select-none">Trading Unit</label>
                    <input
                      type="text"
                      required
                      list="dynamic-unit-options"
                      value={unit ?? ''}
                      onChange={e => setUnit(e.target.value)}
                      placeholder="Box / Piece / Bag"
                      className="w-full bg-content1 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium font-bold"
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

                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-black text-default-500 uppercase tracking-widest pl-1 select-none">Dimensions</label>
                    <input
                      type="text"
                      value={size ?? ''}
                      onChange={e => setSize(e.target.value)}
                      placeholder="Dimensions (e.g. 60x60 cm)"
                      className="w-full bg-content1 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium font-bold"
                    />
                  </div>

                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-black text-default-500 uppercase tracking-widest pl-1 select-none">
                      {category.toLowerCase().includes('tile') ? 'Tiles Per Box' : 'Pack / Box Quantity'}
                    </label>
                    <input
                      type="number"
                      required
                      value={boxQuantity || ''}
                      placeholder="1"
                      onChange={e => setBoxQuantity(e.target.value === '' ? 0 : Number(e.target.value))}
                      className="w-full bg-content1 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium font-bold"
                    />
                  </div>

                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-black text-default-500 uppercase tracking-widest pl-1 select-none flex items-center justify-between gap-1">
                      <span>Coverage (m²)</span>
                      {category.toLowerCase().includes('tile') && (
                        <span className="text-[8px] text-success font-extrabold normal-case bg-success/10 border border-success/20 px-1 rounded">Calculated</span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      value={coveragePerBox === 0 ? '' : coveragePerBox ?? ''}
                      placeholder="0.00"
                      onChange={e => setCoveragePerBox(e.target.value === '' ? 0 : Number(e.target.value))}
                      className="w-full bg-content1 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 2: WHOLESALER SUPPLIER & SOURCING */}
          {/* ============================================================ */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-large bg-content2/40 border border-divider space-y-4">
                <div className="flex items-center gap-2 border-b border-divider pb-2 mb-1">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="text-xs font-black uppercase tracking-wider text-primary">Wholesaler Supplier & Sourcing Profile</span>
                </div>

                <div className="space-y-4 relative">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-default-500 uppercase tracking-widest select-none">
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
                        <select
                          value={supplierId ?? ''}
                          onChange={e => setSupplierId(e.target.value)}
                          className="flex-1 bg-content1 border border-divider focus:border-primary px-3 py-2.5 text-xs text-foreground focus:outline-none transition-colors rounded-medium cursor-pointer font-bold"
                        >
                          {suppliers.filter(s => !s.isDeleted).map((sup) => (
                            <option key={sup.id} value={sup.id}>{sup.name}</option>
                          ))}
                        </select>
                        <HeroButton
                          type="button"
                          variant="flat"
                          color="secondary"
                          size="sm"
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
                          <div className="p-3 bg-content1 rounded-medium border border-divider text-xs space-y-1">
                            <div className="font-black text-primary text-sm">{activeSupplier.name}</div>
                            <div className="text-default-500 text-[11px] flex flex-wrap gap-x-4 gap-y-1">
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
                      <p className="text-[10px] text-default-500 font-medium leading-normal bg-content1 p-2.5 rounded-medium border border-divider">
                        This will register a new vendor profile in the database and automatically link it to this product.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-default-500 uppercase pl-0.5">
                            Supplier Company Name <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            required={isRegisteringNewSupplier}
                            value={newSupplierName ?? ''}
                            onChange={e => setNewSupplierName(e.target.value)}
                            placeholder="Supplier corporate name"
                            className="w-full bg-content1 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-default-500 uppercase pl-0.5">Primary Contact Agent</label>
                          <input
                            type="text"
                            value={newSupplierContact ?? ''}
                            onChange={e => setNewSupplierContact(e.target.value)}
                            placeholder="Contact agent name"
                            className="w-full bg-content1 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-default-500 uppercase pl-0.5">Contact Phone</label>
                          <input
                            type="text"
                            value={newSupplierPhone ?? ''}
                            onChange={e => setNewSupplierPhone(e.target.value)}
                            placeholder="Phone number"
                            className="w-full bg-content1 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-default-500 uppercase pl-0.5">Corporate Email</label>
                          <input
                            type="email"
                            value={newSupplierEmail ?? ''}
                            onChange={e => setNewSupplierEmail(e.target.value)}
                            placeholder="Corporate email address"
                            className="w-full bg-content1 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-default-500 uppercase pl-0.5">Office Address</label>
                        <input
                          type="text"
                          value={newSupplierAddress ?? ''}
                          onChange={e => setNewSupplierAddress(e.target.value)}
                          placeholder="Street, City, Province"
                          className="w-full bg-content1 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium"
                        />
                      </div>
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
              <div className="p-4 rounded-large bg-content2/40 border border-divider space-y-4">
                <div className="flex items-center gap-2 border-b border-divider pb-2 mb-1">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-xs font-black uppercase tracking-wider text-primary">3. Pricing, Markups & Tax</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1 relative pl-0">
                    <label className="text-[10px] font-black text-default-500 uppercase tracking-widest pl-1 select-none">Cost Price (₱)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={costPrice === 0 ? '' : costPrice ?? ''}
                      placeholder="0.00"
                      onChange={e => handleCostPriceChange(e.target.value === '' ? 0 : Number(e.target.value))}
                      className="w-full bg-content1 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium font-bold"
                    />
                  </div>

                  <div className="space-y-1 relative pl-0">
                    <label className="text-[10px] font-black text-default-500 uppercase tracking-widest pl-1 select-none flex items-center justify-between">
                      <span>Markup (%)</span>
                      {costPrice > 0 && sellingPrice > 0 && (
                        <span className="text-[9px] font-bold text-success">
                          +₱{Math.max(0, Math.round((sellingPrice - costPrice) * 100) / 100).toFixed(2)}
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={markupPercent === 0 ? '' : markupPercent ?? ''}
                      placeholder="0"
                      onChange={e => handleMarkupChange(e.target.value === '' ? 0 : Number(e.target.value))}
                      className="w-full bg-content1 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium font-bold"
                    />
                  </div>

                  <div className="space-y-1 relative pl-0">
                    <label className="text-[10px] font-black text-default-500 uppercase tracking-widest pl-1 select-none flex items-center justify-between">
                      <span>Selling Price (Retail ₱)</span>
                      {markupPercent > 0 && (
                        <span className="text-[9px] font-bold text-success">
                          ({markupPercent}% MU)
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={sellingPrice === 0 ? '' : sellingPrice ?? ''}
                      placeholder="0.00"
                      onChange={e => handleSellingPriceChange(e.target.value === '' ? 0 : Number(e.target.value))}
                      className="w-full bg-content1 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium font-black text-primary"
                    />
                  </div>

                  <div className="space-y-1 relative pl-0">
                    <label className="text-[10px] font-black text-default-500 uppercase tracking-widest pl-1 select-none">VAT Taxation Type</label>
                    <select
                      value={taxType ?? ''}
                      onChange={e => setTaxType(e.target.value)}
                      className="w-full bg-content1 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium font-bold cursor-pointer"
                    >
                      <option value="12% VAT">Standard 12% VAT</option>
                      <option value="VAT Exempt">VAT Exempt</option>
                      <option value="Zero Rated">Zero Rated (0% VAT)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 5: STOCK LEVELS & EXPIRATION */}
              <div className="p-4 rounded-large bg-content2/40 border border-divider space-y-4">
                <div className="flex items-center gap-2 border-b border-divider pb-2 mb-1">
                  <Sliders className="h-4 w-4 text-primary" />
                  <span className="text-xs font-black uppercase tracking-wider text-primary">4. Stock Control & Branch Allocation</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1 relative pl-0 md:col-span-3 bg-content1 p-3 rounded-large border border-divider">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-black text-primary uppercase tracking-widest pl-1 select-none flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>Assigned Branch / Stock Location</span>
                      </label>
                      {currentUser?.role !== UserRole.ADMIN && (
                        <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {branches.find(b => b.id === (currentUser?.branchAssignmentId || 'B1'))?.name || `Branch ${currentUser?.branchAssignmentId}`}
                        </span>
                      )}
                    </div>
                    {currentUser?.role === UserRole.ADMIN ? (
                      <select
                        value={targetBranchId ?? ''}
                        onChange={e => {
                          setTargetBranchId(e.target.value);
                          setOrigin(e.target.value);
                        }}
                        className="w-full bg-content2 border border-divider focus:border-primary px-3 py-2 text-xs font-bold text-foreground focus:outline-none transition-colors rounded-medium cursor-pointer"
                      >
                        {branches.filter(b => !b.isDeleted).map(b => (
                          <option key={b.id} value={b.id}>
                            {getBranchOptionLabel(b)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="px-3 py-2 text-xs font-bold text-foreground bg-content2 rounded-medium border border-divider flex items-center justify-between">
                        <span>{branches.find(b => b.id === (currentUser?.branchAssignmentId || 'B1'))?.name || currentUser?.branchAssignmentId}</span>
                        <span className="text-[10px] font-bold text-secondary">ID: {currentUser?.branchAssignmentId || 'B1'}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 relative pl-0">
                    <label className="text-[10px] font-black text-default-500 uppercase tracking-widest pl-1 select-none">Initial Warehouse Stock</label>
                    <input
                      type="number"
                      required
                      value={stockQuantity === 0 ? '' : stockQuantity ?? ''}
                      placeholder="0"
                      onChange={e => setStockQuantity(e.target.value === '' ? 0 : Number(e.target.value))}
                      className="w-full bg-content1 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium font-bold"
                    />
                  </div>

                  <div className="space-y-1 relative pl-0">
                    <label className="text-[10px] font-black text-default-500 uppercase tracking-widest pl-1 select-none">Alert Stock Limit</label>
                    <input
                      type="number"
                      required
                      value={minimumStock === 0 ? '' : minimumStock ?? ''}
                      placeholder="0"
                      onChange={e => setMinimumStock(e.target.value === '' ? 0 : Number(e.target.value))}
                      className="w-full bg-content1 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium font-bold"
                    />
                  </div>

                  <div className="space-y-1 relative pl-0 bg-content1 p-3.5 rounded-large border border-divider flex flex-col justify-between">
                    <div>
                      <label className="text-[10px] font-black text-default-500 uppercase tracking-widest pl-1 select-none block">Shelf-Life Expiration</label>
                      <span className="text-[10px] text-default-500 font-medium pl-1 select-none block mt-0.5 leading-snug">Requires expiration date?</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setHasExpiration(true)}
                        className={`flex-1 py-2 px-3 rounded-medium border text-[11px] font-extrabold transition-all text-center cursor-pointer ${
                          hasExpiration 
                            ? 'bg-warning/10 border-warning text-warning shadow-xs' 
                            : 'bg-content2 border-divider text-default-500 hover:bg-content3'
                        }`}
                      >
                        Yes, Has Expiry
                      </button>
                      <button
                        type="button"
                        onClick={() => setHasExpiration(false)}
                        className={`flex-1 py-2 px-3 rounded-medium border text-[11px] font-extrabold transition-all text-center cursor-pointer ${
                          !hasExpiration 
                            ? 'bg-primary/10 border-primary text-primary shadow-xs' 
                            : 'bg-content2 border-divider text-default-500 hover:bg-content3'
                        }`}
                      >
                        No Expiry Date
                      </button>
                    </div>
                  </div>

                  {hasExpiration && (
                    <div className="space-y-2 relative pl-0 md:col-span-3 bg-warning/5 p-4 rounded-large border border-warning/20 animate-fade-in flex flex-col gap-2.5">
                      <div className="flex items-center gap-2 text-warning">
                        <Clock className="h-4 w-4 text-warning" />
                        <span className="text-xs font-black uppercase tracking-wider">Specify Product Expiration Date</span>
                      </div>
                      <p className="text-[11px] text-default-500 leading-relaxed pl-0.5">
                        Set the standard catalog expiration date for this listing. The system will flag this item in inventory tables and sales invoices when approaching or past expiration.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-default-500 uppercase tracking-widest pl-1 select-none block">Catalog Expiry Date *</label>
                          <input
                            type="date"
                            required={hasExpiration}
                            value={expirationDate ?? ''}
                            onChange={e => setExpirationDate(e.target.value)}
                            className="w-full bg-content1 border border-divider focus:border-warning px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium font-bold cursor-pointer"
                          />
                        </div>
                        <div className="bg-content1 p-3 rounded-medium border border-warning/20 text-[11px] text-default-500 flex flex-col justify-center gap-0.5">
                          <div className="font-bold text-warning flex items-center gap-1">
                            <span></span> Active Expiry Flagging
                          </div>
                          <div className="text-[10px] leading-relaxed text-default-400">
                            Items with active expirations are automatically tracked and marked on sales invoices, stock transfer forms, and listed in the central Expiry Calendar.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1 relative md:col-span-3">
                    <label className="text-[10px] font-black text-default-500 uppercase tracking-widest pl-1 select-none">Acquired From / Stock Source</label>
                    <input
                      type="text"
                      value={origin ?? ''}
                      onChange={e => setOrigin(e.target.value)}
                      placeholder="Acquired from / Stock source (e.g. Local Import, Direct Factory Mill)"
                      className="w-full bg-content1 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium font-sans font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Command Footer */}
        <div className="flex items-center justify-between border-t border-divider pt-4 mt-2">
          <div className="flex items-center gap-2">
            <HeroButton
              type="button"
              variant="flat"
              size="sm"
              onClick={onClose}
              className="font-bold text-xs uppercase tracking-wider"
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
                onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                className="font-bold text-xs uppercase tracking-wider"
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
                onClick={handleNextStep}
                className="font-bold text-xs uppercase tracking-wider"
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
                className="font-bold text-xs uppercase tracking-wider shadow-md shadow-primary/20"
                startIcon={<Sparkles className="h-3.5 w-3.5" />}
              >
                {isEditMode ? 'Save Specifications' : 'Validate & Save Product'}
              </HeroButton>
            )}
          </div>
        </div>
      </form>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};
