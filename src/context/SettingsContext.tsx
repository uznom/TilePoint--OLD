import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  ProductCategory,
  UnitType,
  DiscountScheme,
  CustomPaymentMethod,
  DamageReasonOption,
  RetentionPolicyMap,
  ArchivableCategory,
} from '../types/db';
import {
  DEFAULT_PRODUCT_CATEGORIES,
  DEFAULT_UNIT_TYPES,
  DEFAULT_DISCOUNT_SCHEMES,
  DEFAULT_PAYMENT_METHODS,
  DEFAULT_DAMAGE_REASONS,
} from '../lib/dynamicConfigDefaults';

export interface SettingsContextType {
  productCategories: ProductCategory[];
  setProductCategories: React.Dispatch<React.SetStateAction<ProductCategory[]>>;
  unitTypes: UnitType[];
  setUnitTypes: React.Dispatch<React.SetStateAction<UnitType[]>>;
  discountSchemes: DiscountScheme[];
  setDiscountSchemes: React.Dispatch<React.SetStateAction<DiscountScheme[]>>;
  paymentMethods: CustomPaymentMethod[];
  setPaymentMethods: React.Dispatch<React.SetStateAction<CustomPaymentMethod[]>>;
  damageReasons: DamageReasonOption[];
  setDamageReasons: React.Dispatch<React.SetStateAction<DamageReasonOption[]>>;
  retentionPolicy: RetentionPolicyMap;
  setRetentionPolicy: React.Dispatch<React.SetStateAction<RetentionPolicyMap>>;
  updateRetentionPolicy: (category: ArchivableCategory, months: number) => void;
  companyName: string;
  setCompanyName: (name: string) => void;
  resetAllSettingsToDefault: () => void;
}

const DEFAULT_RETENTION_POLICY: RetentionPolicyMap = {
  auditLogs: 6,
  movements: 12,
  sales: 24,
  expenses: 12,
  returns: 6,
  damageLogs: 6,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [productCategories, setProductCategories] = useState<ProductCategory[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_PRODUCT_CATEGORIES;
    const saved = localStorage.getItem('tp_product_categories');
    return saved ? JSON.parse(saved) : DEFAULT_PRODUCT_CATEGORIES;
  });

  const [unitTypes, setUnitTypes] = useState<UnitType[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_UNIT_TYPES;
    const saved = localStorage.getItem('tp_unit_types');
    return saved ? JSON.parse(saved) : DEFAULT_UNIT_TYPES;
  });

  const [discountSchemes, setDiscountSchemes] = useState<DiscountScheme[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_DISCOUNT_SCHEMES;
    const saved = localStorage.getItem('tp_discount_schemes');
    return saved ? JSON.parse(saved) : DEFAULT_DISCOUNT_SCHEMES;
  });

  const [paymentMethods, setPaymentMethods] = useState<CustomPaymentMethod[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_PAYMENT_METHODS;
    const saved = localStorage.getItem('tp_payment_methods');
    return saved ? JSON.parse(saved) : DEFAULT_PAYMENT_METHODS;
  });

  const [damageReasons, setDamageReasons] = useState<DamageReasonOption[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_DAMAGE_REASONS;
    const saved = localStorage.getItem('tp_damage_reasons');
    return saved ? JSON.parse(saved) : DEFAULT_DAMAGE_REASONS;
  });

  const [retentionPolicy, setRetentionPolicy] = useState<RetentionPolicyMap>(() => {
    if (typeof window === 'undefined') return DEFAULT_RETENTION_POLICY;
    const saved = localStorage.getItem('tilepoint_retention_policy');
    return saved ? JSON.parse(saved) : DEFAULT_RETENTION_POLICY;
  });

  const [companyName, setCompanyNameState] = useState<string>(() => {
    if (typeof window === 'undefined') return 'TilePoint Inc.';
    return localStorage.getItem('tilepoint_company_name_v1') || 'TilePoint Inc.';
  });

  const setCompanyName = useCallback((name: string) => {
    setCompanyNameState(name);
    localStorage.setItem('tilepoint_company_name_v1', name);
  }, []);

  const updateRetentionPolicy = useCallback((category: ArchivableCategory, months: number) => {
    setRetentionPolicy((prev) => {
      const next = { ...prev, [category]: months };
      localStorage.setItem('tilepoint_retention_policy', JSON.stringify(next));
      return next;
    });
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('tp_product_categories', JSON.stringify(productCategories));
  }, [productCategories]);

  useEffect(() => {
    localStorage.setItem('tp_unit_types', JSON.stringify(unitTypes));
  }, [unitTypes]);

  useEffect(() => {
    localStorage.setItem('tp_discount_schemes', JSON.stringify(discountSchemes));
  }, [discountSchemes]);

  useEffect(() => {
    localStorage.setItem('tp_payment_methods', JSON.stringify(paymentMethods));
  }, [paymentMethods]);

  useEffect(() => {
    localStorage.setItem('tp_damage_reasons', JSON.stringify(damageReasons));
  }, [damageReasons]);

  const resetAllSettingsToDefault = useCallback(() => {
    setProductCategories(DEFAULT_PRODUCT_CATEGORIES);
    setUnitTypes(DEFAULT_UNIT_TYPES);
    setDiscountSchemes(DEFAULT_DISCOUNT_SCHEMES);
    setPaymentMethods(DEFAULT_PAYMENT_METHODS);
    setDamageReasons(DEFAULT_DAMAGE_REASONS);
    setRetentionPolicy(DEFAULT_RETENTION_POLICY);
  }, []);

  const value = useMemo<SettingsContextType>(() => ({
    productCategories,
    setProductCategories,
    unitTypes,
    setUnitTypes,
    discountSchemes,
    setDiscountSchemes,
    paymentMethods,
    setPaymentMethods,
    damageReasons,
    setDamageReasons,
    retentionPolicy,
    setRetentionPolicy,
    updateRetentionPolicy,
    companyName,
    setCompanyName,
    resetAllSettingsToDefault,
  }), [
    productCategories,
    unitTypes,
    discountSchemes,
    paymentMethods,
    damageReasons,
    retentionPolicy,
    updateRetentionPolicy,
    companyName,
    setCompanyName,
    resetAllSettingsToDefault,
  ]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
