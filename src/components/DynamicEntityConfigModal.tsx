/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
AlertTriangle,
CreditCard,
Edit2,
Percent,
Plus,
Ruler,
Sparkles,
Tag,
Trash2
} from 'lucide-react';
import React,{ useState } from 'react';
import { HeroSelect } from './common/ui/HeroSelect';
import { HeroModal } from './common/ui/HeroModal';
import { HeroButton } from './common/ui/HeroButton';
import { useDb } from '../context/DbContext';
import {
CustomPaymentMethod,
DamageActionTaken,
DamageCategory,
DamageReasonOption,
DiscountScheme,
ProductCategory,
UnitType,
UserRole,
} from '../types/db';

export type DynamicConfigTab = 'categories' | 'units' | 'payments' | 'discounts' | 'damages';

interface DynamicEntityConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: DynamicConfigTab;
}

export const DynamicEntityConfigModal: React.FC<DynamicEntityConfigModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'categories',
}) => {
  const {
    currentUser,
    productCategories,
    createProductCategory,
    updateProductCategory,
    deleteProductCategory,
    unitTypes,
    createUnitType,
    updateUnitType,
    deleteUnitType,
    paymentMethodsList,
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    togglePaymentMethod,
    discountSchemes,
    createDiscountScheme,
    updateDiscountScheme,
    deleteDiscountScheme,
    toggleDiscountScheme,
    damageReasonsList,
    createDamageReason,
    updateDamageReason,
    deleteDamageReason,
  } = useDb();

  const isAuthorized = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER;
  const [activeTab, setActiveTab] = useState<DynamicConfigTab>(initialTab);

  // Category Form State
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catCode, setCatCode] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catColor, setCatColor] = useState('#006FEE');
  const [showCatForm, setShowCatForm] = useState(false);

  // Unit Form State
  const [editingUnit, setEditingUnit] = useState<UnitType | null>(null);
  const [unitName, setUnitName] = useState('');
  const [unitAbbr, setUnitAbbr] = useState('');
  const [unitDesc, setUnitDesc] = useState('');
  const [unitDecimals, setUnitDecimals] = useState(false);
  const [showUnitForm, setShowUnitForm] = useState(false);

  // Payment Form State
  const [editingPayment, setEditingPayment] = useState<CustomPaymentMethod | null>(null);
  const [pmName, setPmName] = useState('');
  const [pmCode, setPmCode] = useState('');
  const [pmCategory, setPmCategory] = useState<CustomPaymentMethod['category']>('E-Wallet');
  const [pmRequiresRef, setPmRequiresRef] = useState(true);
  const [pmRefLabel, setPmRefLabel] = useState('Payment Reference / Txn No.');
  const [pmAccountNum, setPmAccountNum] = useState('');
  const [pmAccountName, setPmAccountName] = useState('');
  const [pmInstructions, setPmInstructions] = useState('');
  const [showPmForm, setShowPmForm] = useState(false);

  // Discount Form State
  const [editingDiscount, setEditingDiscount] = useState<DiscountScheme | null>(null);
  const [discName, setDiscName] = useState('');
  const [discCode, setDiscCode] = useState('');
  const [discType, setDiscType] = useState<'PERCENT' | 'FLAT'>('PERCENT');
  const [discValue, setDiscValue] = useState<number>(10);
  const [discVatExempt, setDiscVatExempt] = useState(false);
  const [discRequiresId, setDiscRequiresId] = useState(false);
  const [discRequiresCustName, setDiscRequiresCustName] = useState(false);
  const [discMinSpend, setDiscMinSpend] = useState<number>(0);
  const [discDesc, setDiscDesc] = useState('');
  const [showDiscForm, setShowDiscForm] = useState(false);

  // Damage Form State
  const [editingDamage, setEditingDamage] = useState<DamageReasonOption | null>(null);
  const [dmgName, setDmgName] = useState('');
  const [dmgCode, setDmgCode] = useState('');
  const [dmgCategory, setDmgCategory] = useState<DamageCategory>('Warehouse Breakage');
  const [dmgAction, setDmgAction] = useState<DamageActionTaken>('Disposed / Scrapped');
  const [dmgDesc, setDmgDesc] = useState('');
  const [showDmgForm, setShowDmgForm] = useState(false);

  if (!isOpen) return null;

  // Handlers - Category
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    if (editingCategory) {
      updateProductCategory(editingCategory.id, {
        name: catName.trim(),
        code: catCode.trim() || catName.toUpperCase().replace(/\s+/g, '_').slice(0, 10),
        description: catDesc.trim(),
        color: catColor,
      });
    } else {
      createProductCategory({
        name: catName.trim(),
        code: catCode.trim() || catName.toUpperCase().replace(/\s+/g, '_').slice(0, 10),
        description: catDesc.trim(),
        color: catColor,
      });
    }

    setCatName('');
    setCatCode('');
    setCatDesc('');
    setCatColor('#006FEE');
    setEditingCategory(null);
    setShowCatForm(false);
  };

  const startEditCategory = (c: ProductCategory) => {
    setEditingCategory(c);
    setCatName(c.name);
    setCatCode(c.code || '');
    setCatDesc(c.description || '');
    setCatColor(c.color || '#006FEE');
    setShowCatForm(true);
  };

  // Handlers - Unit
  const handleSaveUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitName.trim() || !unitAbbr.trim()) return;

    if (editingUnit) {
      updateUnitType(editingUnit.id, {
        name: unitName.trim(),
        abbreviation: unitAbbr.trim(),
        description: unitDesc.trim(),
        allowDecimals: unitDecimals,
      });
    } else {
      createUnitType({
        name: unitName.trim(),
        abbreviation: unitAbbr.trim(),
        description: unitDesc.trim(),
        allowDecimals: unitDecimals,
      });
    }

    setUnitName('');
    setUnitAbbr('');
    setUnitDesc('');
    setUnitDecimals(false);
    setEditingUnit(null);
    setShowUnitForm(false);
  };

  const startEditUnit = (u: UnitType) => {
    setEditingUnit(u);
    setUnitName(u.name);
    setUnitAbbr(u.abbreviation);
    setUnitDesc(u.description || '');
    setUnitDecimals(!!u.allowDecimals);
    setShowUnitForm(true);
  };

  // Handlers - Payment
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pmName.trim()) return;

    const colors: Record<CustomPaymentMethod['category'], { color: string; activeColor: string }> = {
      'Cash': { color: 'border-emerald-500/25 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5', activeColor: 'bg-emerald-600 border-emerald-600 text-white' },
      'E-Wallet': { color: 'border-sky-500/25 text-sky-600 dark:text-sky-400 bg-sky-500/5', activeColor: 'bg-sky-600 border-sky-600 text-white' },
      'Card': { color: 'border-violet-500/25 text-violet-600 dark:text-violet-400 bg-violet-500/5', activeColor: 'bg-violet-600 border-violet-600 text-white' },
      'Bank': { color: 'border-amber-500/25 text-amber-600 dark:text-amber-400 bg-amber-500/5', activeColor: 'bg-amber-600 border-amber-600 text-white' },
      'Credit': { color: 'border-primary/25 text-primary bg-primary/5', activeColor: 'bg-primary border-primary text-white' },
      'Other': { color: 'border-indigo-500/25 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5', activeColor: 'bg-indigo-600 border-indigo-600 text-white' },
    };

    const palette = colors[pmCategory] || colors['Other'];

    if (editingPayment) {
      updatePaymentMethod(editingPayment.id, {
        name: pmName.trim(),
        code: pmCode.trim() || pmName.toUpperCase().replace(/\s+/g, '_').slice(0, 10),
        category: pmCategory,
        requiresReference: pmRequiresRef,
        referenceLabel: pmRefLabel.trim() || undefined,
        accountNumber: pmAccountNum.trim() || undefined,
        accountName: pmAccountName.trim() || undefined,
        instructions: pmInstructions.trim() || undefined,
        color: palette.color,
        activeColor: palette.activeColor,
      });
    } else {
      createPaymentMethod({
        name: pmName.trim(),
        code: pmCode.trim() || pmName.toUpperCase().replace(/\s+/g, '_').slice(0, 10),
        category: pmCategory,
        requiresReference: pmRequiresRef,
        referenceLabel: pmRefLabel.trim() || undefined,
        accountNumber: pmAccountNum.trim() || undefined,
        accountName: pmAccountName.trim() || undefined,
        instructions: pmInstructions.trim() || undefined,
        isEnabled: true,
        color: palette.color,
        activeColor: palette.activeColor,
      });
    }

    setPmName('');
    setPmCode('');
    setPmRequiresRef(true);
    setPmRefLabel('Payment Reference / Txn No.');
    setPmAccountNum('');
    setPmAccountName('');
    setPmInstructions('');
    setEditingPayment(null);
    setShowPmForm(false);
  };

  const startEditPayment = (p: CustomPaymentMethod) => {
    setEditingPayment(p);
    setPmName(p.name);
    setPmCode(p.code);
    setPmCategory(p.category);
    setPmRequiresRef(p.requiresReference);
    setPmRefLabel(p.referenceLabel || 'Payment Reference / Txn No.');
    setPmAccountNum(p.accountNumber || '');
    setPmAccountName(p.accountName || '');
    setPmInstructions(p.instructions || '');
    setShowPmForm(true);
  };

  // Handlers - Discount
  const handleSaveDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discName.trim()) return;

    if (editingDiscount) {
      updateDiscountScheme(editingDiscount.id, {
        name: discName.trim(),
        code: discCode.trim() || discName.toUpperCase().replace(/\s+/g, '_').slice(0, 10),
        type: discType,
        value: Number(discValue) || 0,
        vatExempt: discVatExempt,
        requiresIdNumber: discRequiresId,
        requiresCustomerName: discRequiresCustName,
        minimumSpend: Number(discMinSpend) || 0,
        description: discDesc.trim() || undefined,
      });
    } else {
      createDiscountScheme({
        name: discName.trim(),
        code: discCode.trim() || discName.toUpperCase().replace(/\s+/g, '_').slice(0, 10),
        type: discType,
        value: Number(discValue) || 0,
        vatExempt: discVatExempt,
        requiresIdNumber: discRequiresId,
        requiresCustomerName: discRequiresCustName,
        minimumSpend: Number(discMinSpend) || 0,
        description: discDesc.trim() || undefined,
        isEnabled: true,
      });
    }

    setDiscName('');
    setDiscCode('');
    setDiscType('PERCENT');
    setDiscValue(10);
    setDiscVatExempt(false);
    setDiscRequiresId(false);
    setDiscRequiresCustName(false);
    setDiscMinSpend(0);
    setDiscDesc('');
    setEditingDiscount(null);
    setShowDiscForm(false);
  };

  const startEditDiscount = (d: DiscountScheme) => {
    setEditingDiscount(d);
    setDiscName(d.name);
    setDiscCode(d.code);
    setDiscType(d.type);
    setDiscValue(d.value);
    setDiscVatExempt(d.vatExempt);
    setDiscRequiresId(d.requiresIdNumber);
    setDiscRequiresCustName(d.requiresCustomerName);
    setDiscMinSpend(d.minimumSpend || 0);
    setDiscDesc(d.description || '');
    setShowDiscForm(true);
  };

  // Handlers - Damage
  const handleSaveDamage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmgName.trim()) return;

    if (editingDamage) {
      updateDamageReason(editingDamage.id, {
        name: dmgName.trim(),
        code: dmgCode.trim() || dmgName.toUpperCase().replace(/\s+/g, '_').slice(0, 10),
        category: dmgCategory,
        defaultAction: dmgAction,
        description: dmgDesc.trim() || undefined,
      });
    } else {
      createDamageReason({
        name: dmgName.trim(),
        code: dmgCode.trim() || dmgName.toUpperCase().replace(/\s+/g, '_').slice(0, 10),
        category: dmgCategory,
        defaultAction: dmgAction,
        description: dmgDesc.trim() || undefined,
        isEnabled: true,
      });
    }

    setDmgName('');
    setDmgCode('');
    setDmgCategory('Warehouse Breakage');
    setDmgAction('Disposed / Scrapped');
    setDmgDesc('');
    setEditingDamage(null);
    setShowDmgForm(false);
  };

  const startEditDamage = (d: DamageReasonOption) => {
    setEditingDamage(d);
    setDmgName(d.name);
    setDmgCode(d.code);
    setDmgCategory(d.category);
    setDmgAction(d.defaultAction);
    setDmgDesc(d.description || '');
    setShowDmgForm(true);
  };

  return (
    <HeroModal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      zIndex={100050}
      className="max-h-[92vh]"
    >
      {/* Header */}
      <HeroModal.Header className="px-6 py-5 border-b border-divider/20 flex items-center justify-between bg-content1 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black uppercase text-foreground">
                Store Options & Catalogs
              </h2>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Active
              </span>
            </div>
            <p className="text-xs text-default-500 font-medium mt-0.5">
              Manage product categories, measurement units, payment methods, discounts, and damage causes.
            </p>
          </div>
        </div>
      </HeroModal.Header>

        {/* Tab Navigation */}
        <div
          onWheel={(e) => {
            if (e.deltaY !== 0 && e.currentTarget) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
          className="px-6 pt-3 border-b border-divider/15 flex gap-2 overflow-x-auto overflow-y-hidden bg-content1 shrink-0 scroll-smooth touch-pan-x whitespace-nowrap scrollbar-thin"
        >
          <button
            type="button"
            onClick={() => { setActiveTab('categories'); setShowCatForm(false); }}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 whitespace-nowrap ${
              activeTab === 'categories'
                ? 'border-primary text-primary'
                : 'border-transparent text-default-500 hover:text-foreground'
            }`}
          >
            <Tag className="h-4 w-4 shrink-0" />
            <span>Product Categories</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-default-100 text-default-600 shrink-0">
              {productCategories.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('units'); setShowUnitForm(false); }}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 whitespace-nowrap ${
              activeTab === 'units'
                ? 'border-primary text-primary'
                : 'border-transparent text-default-500 hover:text-foreground'
            }`}
          >
            <Ruler className="h-4 w-4 shrink-0" />
            <span>Units of Measure</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-default-100 text-default-600 shrink-0">
              {unitTypes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('payments'); setShowPmForm(false); }}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 whitespace-nowrap ${
              activeTab === 'payments'
                ? 'border-primary text-primary'
                : 'border-transparent text-default-500 hover:text-foreground'
            }`}
          >
            <CreditCard className="h-4 w-4 shrink-0" />
            <span>Payment Methods</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-default-100 text-default-600 shrink-0">
              {paymentMethodsList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('discounts'); setShowDiscForm(false); }}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 whitespace-nowrap ${
              activeTab === 'discounts'
                ? 'border-primary text-primary'
                : 'border-transparent text-default-500 hover:text-foreground'
            }`}
          >
            <Percent className="h-4 w-4 shrink-0" />
            <span>Discount Schemes</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-default-100 text-default-600 shrink-0">
              {discountSchemes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('damages'); setShowDmgForm(false); }}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 whitespace-nowrap ${
              activeTab === 'damages'
                ? 'border-primary text-primary'
                : 'border-transparent text-default-500 hover:text-foreground'
            }`}
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Damage Causes</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-default-100 text-default-600 shrink-0">
              {damageReasonsList.length}
            </span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: PRODUCT CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide text-foreground">
                    Product Categories
                  </h3>
                  <p className="text-xs text-default-500">
                    Group your inventory items and organize POS catalog tabs.
                  </p>
                </div>
                {isAuthorized && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategory(null);
                      setCatName('');
                      setCatCode('');
                      setCatDesc('');
                      setCatColor('#006FEE');
                      setShowCatForm(!showCatForm);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shadow-sm shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{showCatForm ? 'Close Form' : 'Add Category'}</span>
                  </button>
                )}
              </div>

              {/* Category Add/Edit Form */}
              {showCatForm && (
                <form
                  onSubmit={handleSaveCategory}
                  className="p-5 rounded-2xl bg-content2/60 border border-primary/30 space-y-4 animate-fade-in text-left"
                >
                  <h4 className="text-xs font-black uppercase tracking-wider text-primary">
                    {editingCategory ? `Edit Category: ${editingCategory.name}` : 'Create New Category'}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-default-500">
                        Category Display Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={catName}
                        onChange={(e) => setCatName(e.target.value)}
                        placeholder="e.g. Granite Slabs & Quartz"
                        className="w-full bg-content1 border border-divider/30 px-3.5 py-2 rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-default-500">
                        System Code
                      </label>
                      <input
                        type="text"
                        value={catCode}
                        onChange={(e) => setCatCode(e.target.value)}
                        placeholder="GRANITE"
                        className="w-full bg-content1 border border-divider/30 px-3.5 py-2 rounded-xl text-xs font-bold uppercase text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-default-500">
                        Description / Application
                      </label>
                      <input
                        type="text"
                        value={catDesc}
                        onChange={(e) => setCatDesc(e.target.value)}
                        placeholder="Heavy exterior paving and kitchen countertops"
                        className="w-full bg-content1 border border-divider/30 px-3.5 py-2 rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-default-500">
                        Badge Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={catColor}
                          onChange={(e) => setCatColor(e.target.value)}
                          className="h-8 w-8 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                        <span className="text-xs font-mono text-default-500 font-bold">{catColor}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-divider/20">
                    <button
                      type="button"
                      onClick={() => setShowCatForm(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-default-500 hover:bg-content1 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
                    >
                      {editingCategory ? 'Update Category' : 'Save Category'}
                    </button>
                  </div>
                </form>
              )}

              {/* Categories Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {productCategories.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl bg-content2/40 border border-divider/20 flex flex-col justify-between gap-3 hover:border-divider/40 transition-all text-left"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span
                          className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-md border"
                          style={{
                            backgroundColor: `${c.color || '#006FEE'}15`,
                            color: c.color || '#006FEE',
                            borderColor: `${c.color || '#006FEE'}30`,
                          }}
                        >
                          {c.code || c.name.slice(0, 4).toUpperCase()}
                        </span>
                        {c.color && (
                          <span
                            className="h-3 w-3 rounded-full border border-black/10"
                            style={{ backgroundColor: c.color }}
                          />
                        )}
                      </div>
                      <h4 className="text-xs font-black text-foreground">{c.name}</h4>
                      {c.description && (
                        <p className="text-[11px] text-default-500 line-clamp-2">{c.description}</p>
                      )}
                    </div>

                    {isAuthorized && (
                      <div className="flex items-center justify-end gap-1 border-t border-divider/10 pt-2">
                        <button
                          type="button"
                          onClick={() => startEditCategory(c)}
                          className="p-1.5 rounded-lg text-default-400 hover:text-primary hover:bg-content1 transition-colors"
                          title="Edit Category"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        {!c.isDefault && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete category "${c.name}"?`)) {
                                deleteProductCategory(c.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-default-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            title="Delete Category"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: MEASUREMENT UNITS */}
          {activeTab === 'units' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide text-foreground">
                    Units of Measure
                  </h3>
                  <p className="text-xs text-default-500">
                    Define standard measurement units for inventory and sales.
                  </p>
                </div>
                {isAuthorized && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUnit(null);
                      setUnitName('');
                      setUnitAbbr('');
                      setUnitDesc('');
                      setUnitDecimals(false);
                      setShowUnitForm(!showUnitForm);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shadow-sm shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{showUnitForm ? 'Close Form' : 'Add Unit'}</span>
                  </button>
                )}
              </div>

              {/* Unit Form */}
              {showUnitForm && (
                <form
                  onSubmit={handleSaveUnit}
                  className="p-5 rounded-2xl bg-content2/60 border border-primary/30 space-y-4 animate-fade-in text-left"
                >
                  <h4 className="text-xs font-black uppercase tracking-wider text-primary">
                    {editingUnit ? `Edit Unit: ${editingUnit.name}` : 'Create Unit of Measure'}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-default-500">
                        Unit Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={unitName}
                        onChange={(e) => setUnitName(e.target.value)}
                        placeholder="e.g. Kilograms"
                        className="w-full bg-content1 border border-divider/30 px-3.5 py-2 rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-default-500">
                        Abbreviation *
                      </label>
                      <input
                        type="text"
                        required
                        value={unitAbbr}
                        onChange={(e) => setUnitAbbr(e.target.value)}
                        placeholder="kg"
                        className="w-full bg-content1 border border-divider/30 px-3.5 py-2 rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-default-500">
                        Description / Notes
                      </label>
                      <input
                        type="text"
                        value={unitDesc}
                        onChange={(e) => setUnitDesc(e.target.value)}
                        placeholder="Weight measure for dry grout and colored pigments"
                        className="w-full bg-content1 border border-divider/30 px-3.5 py-2 rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        id="allow-decimals-check"
                        checked={unitDecimals}
                        onChange={(e) => setUnitDecimals(e.target.checked)}
                        className="h-4 w-4 rounded accent-primary cursor-pointer"
                      />
                      <label htmlFor="allow-decimals-check" className="text-xs font-bold text-foreground cursor-pointer">
                        Allow Decimal Fractions (e.g. 1.25 sqm)
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-divider/20">
                    <button
                      type="button"
                      onClick={() => setShowUnitForm(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-default-500 hover:bg-content1 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
                    >
                      {editingUnit ? 'Update Unit' : 'Save Unit'}
                    </button>
                  </div>
                </form>
              )}

              {/* Units Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {unitTypes.map((u) => (
                  <div
                    key={u.id}
                    className="p-4 rounded-2xl bg-content2/40 border border-divider/20 flex flex-col justify-between gap-3 hover:border-divider/40 transition-all text-left"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                          {u.abbreviation}
                        </span>
                        <span className="text-[9px] uppercase font-semibold text-default-400">
                          {u.allowDecimals ? 'Decimals allowed' : 'Whole count only'}
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-foreground">{u.name}</h4>
                      {u.description && (
                        <p className="text-[11px] text-default-500">{u.description}</p>
                      )}
                    </div>

                    {isAuthorized && (
                      <div className="flex items-center justify-end gap-1 border-t border-divider/10 pt-2">
                        <button
                          type="button"
                          onClick={() => startEditUnit(u)}
                          className="p-1.5 rounded-lg text-default-400 hover:text-primary hover:bg-content1 transition-colors"
                          title="Edit Unit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete unit "${u.name}"?`)) {
                              deleteUnitType(u.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-default-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Delete Unit"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: PAYMENT METHODS */}
          {activeTab === 'payments' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide text-foreground">
                    Payment Methods
                  </h3>
                  <p className="text-xs text-default-500">
                    Configure cash, e-wallets, cards, and bank payment options shown at checkout.
                  </p>
                </div>
                {isAuthorized && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPayment(null);
                      setPmName('');
                      setPmCode('');
                      setPmCategory('E-Wallet');
                      setPmRequiresRef(true);
                      setPmRefLabel('Payment Reference / Txn No.');
                      setPmAccountNum('');
                      setPmAccountName('');
                      setPmInstructions('');
                      setShowPmForm(!showPmForm);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shadow-sm shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{showPmForm ? 'Close Form' : 'Add Payment Method'}</span>
                  </button>
                )}
              </div>

              {/* Payment Method Form */}
              {showPmForm && (
                <form
                  onSubmit={handleSavePayment}
                  className="p-5 rounded-2xl bg-content2/60 border border-primary/30 space-y-4 animate-fade-in text-left"
                >
                  <h4 className="text-xs font-black uppercase tracking-wider text-primary">
                    {editingPayment ? `Edit Payment Method: ${editingPayment.name}` : 'Configure New Payment Method'}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-default-500">
                        Method Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={pmName}
                        onChange={(e) => setPmName(e.target.value)}
                        placeholder="e.g. Maya Business QR"
                        className="w-full bg-content1 border border-divider/30 px-3.5 py-2 rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <HeroSelect
                        label="Classification"
                        value={pmCategory}
                        onValueChange={(val) => setPmCategory(val as any)}
                        radius="md"
                        items={[
                          { key: 'Cash', value: 'Cash', label: 'Cash Drawer' },
                          { key: 'E-Wallet', value: 'E-Wallet', label: 'E-Wallet (GCash, Maya)' },
                          { key: 'Card', value: 'Card', label: 'Card / POS Terminal' },
                          { key: 'Bank', value: 'Bank', label: 'Bank Transfer / InstaPay' },
                          { key: 'Credit', value: 'Credit', label: 'Customer Credit' },
                          { key: 'Other', value: 'Other', label: 'Check / Other' },
                        ]}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-default-500">
                        System Identifier Code
                      </label>
                      <input
                        type="text"
                        value={pmCode}
                        onChange={(e) => setPmCode(e.target.value)}
                        placeholder="MAYA_QR"
                        className="w-full bg-content1 border border-divider/30 px-3.5 py-2 rounded-xl text-xs font-bold uppercase text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-default-500">
                        Store Account / Wallet No.
                      </label>
                      <input
                        type="text"
                        value={pmAccountNum}
                        onChange={(e) => setPmAccountNum(e.target.value)}
                        placeholder="0917-000-0000 / 1234-5678"
                        className="w-full bg-content1 border border-divider/30 px-3.5 py-2 rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-default-500">
                        Registered Account Name
                      </label>
                      <input
                        type="text"
                        value={pmAccountName}
                        onChange={(e) => setPmAccountName(e.target.value)}
                        placeholder="TilePoint Store"
                        className="w-full bg-content1 border border-divider/30 px-3.5 py-2 rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-default-500">
                        Reference Label on Checkout
                      </label>
                      <input
                        type="text"
                        value={pmRefLabel}
                        onChange={(e) => setPmRefLabel(e.target.value)}
                        placeholder="Reference / Transaction No."
                        className="w-full bg-content1 border border-divider/30 px-3.5 py-2 rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-default-500">
                        Cashier Instructions
                      </label>
                      <input
                        type="text"
                        value={pmInstructions}
                        onChange={(e) => setPmInstructions(e.target.value)}
                        placeholder="Scan counter QR and verify transaction SMS"
                        className="w-full bg-content1 border border-divider/30 px-3.5 py-2 rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        id="require-ref-check"
                        checked={pmRequiresRef}
                        onChange={(e) => setPmRequiresRef(e.target.checked)}
                        className="h-4 w-4 rounded accent-primary cursor-pointer"
                      />
                      <label htmlFor="require-ref-check" className="text-xs font-bold text-foreground cursor-pointer">
                        Require Reference No. on Checkout
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-divider/20">
                    <button
                      type="button"
                      onClick={() => setShowPmForm(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-default-500 hover:bg-content1 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
                    >
                      {editingPayment ? 'Update Payment Method' : 'Save Payment Method'}
                    </button>
                  </div>
                </form>
              )}

              {/* Payment Methods Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {paymentMethodsList.map((pm) => (
                  <div
                    key={pm.id}
                    className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between gap-3 ${
                      pm.isEnabled
                        ? 'bg-content2/40 border-divider/20'
                        : 'bg-content2/10 border-divider/10 opacity-60'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-md bg-default-100 text-default-600">
                          {pm.category}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePaymentMethod(pm.id)}
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                            pm.isEnabled
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                          }`}
                        >
                          {pm.isEnabled ? 'Active in POS' : 'Disabled'}
                        </button>
                      </div>

                      <div>
                        <h4 className="text-xs font-black text-foreground">{pm.name}</h4>
                        {pm.accountNumber && (
                          <div className="text-[10px] text-default-500 font-mono mt-0.5">
                            Account: {pm.accountNumber} ({pm.accountName || 'Store'})
                          </div>
                        )}
                        {pm.instructions && (
                          <p className="text-[10.5px] text-default-500/80 mt-1 line-clamp-2">
                            {pm.instructions}
                          </p>
                        )}
                      </div>
                    </div>

                    {isAuthorized && (
                      <div className="flex items-center justify-end gap-1 border-t border-divider/10 pt-2">
                        <button
                          type="button"
                          onClick={() => startEditPayment(pm)}
                          className="p-1.5 rounded-lg text-default-400 hover:text-primary hover:bg-content1 transition-colors"
                          title="Edit Channel"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        {!pm.isDefault && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Remove payment channel "${pm.name}"?`)) {
                                deletePaymentMethod(pm.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-default-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            title="Delete Channel"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: DISCOUNTS & VAT SCHEMES */}
          {activeTab === 'discounts' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide text-foreground">
                    Discount Schemes
                  </h3>
                  <p className="text-xs text-default-500">
                    Configure Senior Citizen, PWD, Contractor, and wholesale discount rules.
                  </p>
                </div>
                {isAuthorized && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDiscount(null);
                      setDiscName('');
                      setDiscCode('');
                      setDiscType('PERCENT');
                      setDiscValue(10);
                      setDiscVatExempt(false);
                      setDiscRequiresId(false);
                      setDiscRequiresCustName(false);
                      setDiscMinSpend(0);
                      setDiscDesc('');
                      setShowDiscForm(!showDiscForm);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shadow-sm shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{showDiscForm ? 'Close Form' : 'Add Discount Scheme'}</span>
                  </button>
                )}
              </div>

              {/* Discount Form */}
              {showDiscForm && (
                <form
                  onSubmit={handleSaveDiscount}
                  className="p-5 rounded-2xl bg-content2/60 border border-primary/30 space-y-4 animate-fade-in text-left"
                >
                  <h4 className="text-xs font-black uppercase tracking-wider text-primary">
                    {editingDiscount ? `Edit Scheme: ${editingDiscount.name}` : 'Configure New Discount Scheme'}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-default-500">
                        Scheme Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={discName}
                        onChange={(e) => setDiscName(e.target.value)}
                        placeholder="e.g. VIP Contractor Tier"
                        className="w-full bg-content1 border border-divider/30 px-3.5 py-2 rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <HeroSelect
                        label="Discount Type"
                        value={discType}
                        onValueChange={(val) => setDiscType(val as any)}
                        radius="md"
                        items={[
                          { key: 'PERCENT', value: 'PERCENT', label: 'Percentage (%) Off Subtotal' },
                          { key: 'FLAT', value: 'FLAT', label: 'Flat Amount (₱) Off Subtotal' },
                        ]}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-default-500">
                        Discount Value ({discType === 'PERCENT' ? '%' : '₱'}) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={discValue}
                        onChange={(e) => setDiscValue(Number(e.target.value))}
                        placeholder={discType === 'PERCENT' ? '20' : '500'}
                        className="w-full bg-content1 border border-divider/30 px-3.5 py-2 rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-default-500">
                        Minimum Spend (PHP)
                      </label>
                      <input
                        type="number"
                        value={discMinSpend}
                        onChange={(e) => setDiscMinSpend(Number(e.target.value))}
                        placeholder="0"
                        className="w-full bg-content1 border border-divider/30 px-3.5 py-2 rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-default-500">
                        Description / Notes
                      </label>
                      <input
                        type="text"
                        value={discDesc}
                        onChange={(e) => setDiscDesc(e.target.value)}
                        placeholder="Senior Citizen or PWD statutory discount"
                        className="w-full bg-content1 border border-divider/30 px-3.5 py-2 rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="sm:col-span-3 flex flex-wrap gap-5 pt-2 border-t border-divider/15">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="vat-exempt-check"
                          checked={discVatExempt}
                          onChange={(e) => setDiscVatExempt(e.target.checked)}
                          className="h-4 w-4 rounded accent-primary cursor-pointer"
                        />
                        <label htmlFor="vat-exempt-check" className="text-xs font-bold text-foreground cursor-pointer">
                          VAT Exemption
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="require-id-check"
                          checked={discRequiresId}
                          onChange={(e) => setDiscRequiresId(e.target.checked)}
                          className="h-4 w-4 rounded accent-primary cursor-pointer"
                        />
                        <label htmlFor="require-id-check" className="text-xs font-bold text-foreground cursor-pointer">
                          Require Senior/PWD ID Number
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="require-cust-check"
                          checked={discRequiresCustName}
                          onChange={(e) => setDiscRequiresCustName(e.target.checked)}
                          className="h-4 w-4 rounded accent-primary cursor-pointer"
                        />
                        <label htmlFor="require-cust-check" className="text-xs font-bold text-foreground cursor-pointer">
                          Require Customer Full Name
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-divider/20">
                    <button
                      type="button"
                      onClick={() => setShowDiscForm(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-default-500 hover:bg-content1 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
                    >
                      {editingDiscount ? 'Update Scheme' : 'Save Scheme'}
                    </button>
                  </div>
                </form>
              )}

              {/* Discounts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {discountSchemes.map((ds) => (
                  <div
                    key={ds.id}
                    className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between gap-3 ${
                      ds.isEnabled
                        ? 'bg-content2/40 border-divider/20'
                        : 'bg-content2/10 border-divider/10 opacity-60'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">
                          {ds.type === 'PERCENT' ? `${ds.value}% OFF` : `₱${ds.value} FLAT`}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleDiscountScheme(ds.id)}
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                            ds.isEnabled
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                          }`}
                        >
                          {ds.isEnabled ? 'Active in POS' : 'Disabled'}
                        </button>
                      </div>

                      <div>
                        <h4 className="text-xs font-black text-foreground">{ds.name}</h4>
                        {ds.description && (
                          <p className="text-[10.5px] text-default-500 mt-1 line-clamp-2">
                            {ds.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {ds.vatExempt && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                              VAT Exempt
                            </span>
                          )}
                          {ds.requiresIdNumber && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-sky-500/10 text-sky-500 border border-sky-500/20">
                              Requires ID
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isAuthorized && (
                      <div className="flex items-center justify-end gap-1 border-t border-divider/10 pt-2">
                        <button
                          type="button"
                          onClick={() => startEditDiscount(ds)}
                          className="p-1.5 rounded-lg text-default-400 hover:text-primary hover:bg-content1 transition-colors"
                          title="Edit Scheme"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        {!ds.isDefault && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Remove discount scheme "${ds.name}"?`)) {
                                deleteDiscountScheme(ds.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-default-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            title="Delete Scheme"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: DAMAGE & LOSS CLASSIFICATIONS */}
          {activeTab === 'damages' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide text-foreground">
                    Damage Reasons
                  </h3>
                  <p className="text-xs text-default-500">
                    Standardized causes and actions for reporting broken or damaged stock.
                  </p>
                </div>
                {isAuthorized && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDamage(null);
                      setDmgName('');
                      setDmgCode('');
                      setDmgCategory('Warehouse Breakage');
                      setDmgAction('Disposed / Scrapped');
                      setDmgDesc('');
                      setShowDmgForm(!showDmgForm);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shadow-sm shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{showDmgForm ? 'Close Form' : 'Add Damage Reason'}</span>
                  </button>
                )}
              </div>

              {/* Damage Form */}
              {showDmgForm && (
                <form
                  onSubmit={handleSaveDamage}
                  className="p-5 rounded-2xl bg-content2/60 border border-primary/30 space-y-4 animate-fade-in text-left"
                >
                  <h4 className="text-xs font-black uppercase tracking-wider text-primary">
                    {editingDamage ? `Edit Reason: ${editingDamage.name}` : 'Create Damage Reason'}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-default-500">
                        Reason Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={dmgName}
                        onChange={(e) => setDmgName(e.target.value)}
                        placeholder="e.g. Broken in Transit"
                        className="w-full bg-content1 border border-divider/30 px-3.5 py-2 rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-default-500">
                        System Identifier
                      </label>
                      <input
                        type="text"
                        value={dmgCode}
                        onChange={(e) => setDmgCode(e.target.value)}
                        placeholder="TRANSIT_DAMAGE"
                        className="w-full bg-content1 border border-divider/30 px-3.5 py-2 rounded-xl text-xs font-bold uppercase text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <HeroSelect
                        label="Category"
                        value={dmgCategory}
                        onValueChange={(val) => setDmgCategory(val as any)}
                        radius="md"
                        items={[
                          { key: 'Warehouse Breakage', value: 'Warehouse Breakage', label: 'Warehouse Breakage' },
                          { key: 'BOA', value: 'BOA', label: 'BOA (Broken On Arrival)' },
                          { key: 'Showroom Casualty', value: 'Showroom Casualty', label: 'Showroom Casualty' },
                          { key: 'Delivery Transit', value: 'Delivery Transit', label: 'Delivery Transit' },
                        ]}
                      />
                    </div>
                    <div className="space-y-1">
                      <HeroSelect
                        label="Default Action"
                        value={dmgAction}
                        onValueChange={(val) => setDmgAction(val as any)}
                        radius="md"
                        items={[
                          { key: 'Disposed / Scrapped', value: 'Disposed / Scrapped', label: 'Disposed / Scrapped' },
                          { key: 'Returned to Supplier', value: 'Returned to Supplier', label: 'Returned to Supplier' },
                          { key: 'Discounted Clearance', value: 'Discounted Clearance', label: 'Discounted Clearance' },
                          { key: 'Repaired / Restocked', value: 'Repaired / Restocked', label: 'Repaired / Restocked' },
                        ]}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-default-500">
                        Description / Notes
                      </label>
                      <input
                        type="text"
                        value={dmgDesc}
                        onChange={(e) => setDmgDesc(e.target.value)}
                        placeholder="Impact fractures during handling"
                        className="w-full bg-content1 border border-divider/30 px-3.5 py-2 rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-divider/20">
                    <button
                      type="button"
                      onClick={() => setShowDmgForm(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-default-500 hover:bg-content1 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
                    >
                      {editingDamage ? 'Update Reason' : 'Save Reason'}
                    </button>
                  </div>
                </form>
              )}

              {/* Damage Reasons Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {damageReasonsList.map((dr) => (
                  <div
                    key={dr.id}
                    className="p-4 rounded-2xl bg-content2/40 border border-divider/20 flex flex-col justify-between gap-3 hover:border-divider/40 transition-all text-left"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20">
                          {dr.category}
                        </span>
                        <span className="text-[9px] font-bold text-default-400">
                          {dr.defaultAction}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs font-black text-foreground">{dr.name}</h4>
                        {dr.description && (
                          <p className="text-[11px] text-default-500 mt-1 line-clamp-2">
                            {dr.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {isAuthorized && (
                      <div className="flex items-center justify-end gap-1 border-t border-divider/10 pt-2">
                        <button
                          type="button"
                          onClick={() => startEditDamage(dr)}
                          className="p-1.5 rounded-lg text-default-400 hover:text-primary hover:bg-content1 transition-colors"
                          title="Edit Cause"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Remove damage reason "${dr.name}"?`)) {
                              deleteDamageReason(dr.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-default-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Delete Cause"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <HeroModal.Footer className="px-6 py-4 border-t border-divider/20 bg-content1 flex justify-between items-center shrink-0">
          <div className="text-[11px] text-default-500 font-medium">
            Changes synchronize to all connected POS registers, branch devices, and inventory ledgers.
          </div>
          <HeroButton
            type="button"
            color="primary"
            variant="solid"
            size="sm"
            onClick={onClose}
            className="font-bold text-xs uppercase tracking-wider"
          >
            Close Manager
          </HeroButton>
        </HeroModal.Footer>
    </HeroModal>
  );
};
