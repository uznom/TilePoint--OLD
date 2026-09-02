/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';

export interface BusinessFeatureFlags {
  tileCalculator: boolean;
  yardHoldQueue: boolean;
  cargoDeliveries: boolean;
  tileUnitConverters: boolean;
  damageRegister: boolean;
  birCompliance: boolean;
}

export const DEFAULT_FEATURE_FLAGS: BusinessFeatureFlags = {
  tileCalculator: true,
  yardHoldQueue: true,
  cargoDeliveries: true,
  tileUnitConverters: true,
  damageRegister: true,
  birCompliance: true,
};

const STORAGE_KEY = 'tilepoint_business_features_v1';

export function getStoredFeatureFlags(): BusinessFeatureFlags {
  if (typeof window === 'undefined') return DEFAULT_FEATURE_FLAGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_FEATURE_FLAGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('[FeatureFlags] Read error:', e);
  }
  return DEFAULT_FEATURE_FLAGS;
}

export function saveStoredFeatureFlags(flags: Partial<BusinessFeatureFlags>): BusinessFeatureFlags {
  const current = getStoredFeatureFlags();
  const updated = { ...current, ...flags };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('tilepoint_feature_flags_changed', { detail: updated }));
    } catch (e) {
      console.warn('[FeatureFlags] Save error:', e);
    }
  }
  return updated;
}

export function useFeatureFlags() {
  const [flags, setFlags] = useState<BusinessFeatureFlags>(getStoredFeatureFlags());

  useEffect(() => {
    const handleUpdate = (e: CustomEvent<BusinessFeatureFlags>) => {
      if (e.detail) {
        setFlags(e.detail);
      }
    };
    window.addEventListener('tilepoint_feature_flags_changed', handleUpdate as EventListener);
    return () => {
      window.removeEventListener('tilepoint_feature_flags_changed', handleUpdate as EventListener);
    };
  }, []);

  const updateFlag = (key: keyof BusinessFeatureFlags, value: boolean) => {
    const next = saveStoredFeatureFlags({ [key]: value });
    setFlags(next);
  };

  return { flags, updateFlag };
}
