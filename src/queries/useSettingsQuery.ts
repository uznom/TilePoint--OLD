import { useQuery } from '@tanstack/react-query';

export const SETTINGS_QUERY_KEYS = {
  systemSettings: ['settings', 'system'] as const,
  dynamicConfigs: ['settings', 'dynamicConfigs'] as const,
  isConfigured: ['settings', 'isConfigured'] as const,
};

export function useSystemSettingsQuery() {
  return useQuery<Record<string, any>>({
    queryKey: SETTINGS_QUERY_KEYS.systemSettings,
    queryFn: async () => {
      try {
        const res = await fetch('/api/db');
        if (res.ok) {
          const json = await res.json();
          return json?.data?.system_settings || json?.system_settings || {};
        }
      } catch {
        // Fallback
      }
      const cached = localStorage.getItem('tp_system_settings');
      return cached ? JSON.parse(cached) : {};
    },
    initialData: () => {
      if (typeof window === 'undefined') return {};
      const cached = localStorage.getItem('tp_system_settings');
      return cached ? JSON.parse(cached) : {};
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useDynamicConfigsQuery() {
  return useQuery<any[]>({
    queryKey: SETTINGS_QUERY_KEYS.dynamicConfigs,
    queryFn: async () => {
      try {
        const res = await fetch('/api/db');
        if (res.ok) {
          const json = await res.json();
          const configs = json?.data?.tp_dynamic_entity_configs || json?.tp_dynamic_entity_configs;
          if (Array.isArray(configs)) return configs;
        }
      } catch {
        // Fallback
      }
      const cached = localStorage.getItem('tp_dynamic_entity_configs');
      return cached ? JSON.parse(cached) : [];
    },
    initialData: () => {
      if (typeof window === 'undefined') return [];
      const cached = localStorage.getItem('tp_dynamic_entity_configs');
      return cached ? JSON.parse(cached) : [];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useIsConfiguredQuery() {
  return useQuery<boolean>({
    queryKey: SETTINGS_QUERY_KEYS.isConfigured,
    queryFn: async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const json = await res.json();
          return Boolean(json.isConfigured);
        }
      } catch {
        // Fallback
      }
      return localStorage.getItem('tp_is_configured') === 'true';
    },
    initialData: () => {
      if (typeof window === 'undefined') return false;
      return localStorage.getItem('tp_is_configured') === 'true';
    },
    staleTime: 1000 * 60 * 10,
  });
}
