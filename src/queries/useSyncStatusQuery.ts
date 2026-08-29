import { useQuery } from '@tanstack/react-query';

export const SYNC_QUERY_KEYS = {
  health: ['sync', 'health'] as const,
  watermarks: ['sync', 'watermarks'] as const,
};

export interface ServerHealthResponse {
  status: 'ok' | 'degraded';
  isDegraded: boolean;
  timestamp: string;
  uptime: number;
  dbEngine: string;
  degradedSince?: string | null;
  lastDegradedReason?: string | null;
  queuedWritesCount?: number;
  isConfigured?: boolean;
}

export function useServerHealthQuery() {
  return useQuery<ServerHealthResponse>({
    queryKey: SYNC_QUERY_KEYS.health,
    queryFn: async () => {
      const res = await fetch('/api/health');
      if (!res.ok) {
        throw new Error('Server health check failed');
      }
      return await res.json();
    },
    refetchInterval: 1000 * 30, // Poll health every 30s
    staleTime: 1000 * 15,
  });
}

export function useCdcWatermarksQuery() {
  return useQuery<{
    success: boolean;
    globalHash: string;
    collectionHashes: Record<string, string>;
    timestamp: string;
  }>({
    queryKey: SYNC_QUERY_KEYS.watermarks,
    queryFn: async () => {
      const token = localStorage.getItem('tp_session_token') || sessionStorage.getItem('tp_session_token');
      const res = await fetch('/api/sync/watermarks', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        throw new Error('Watermarks fetch failed');
      }
      return await res.json();
    },
    staleTime: 1000 * 10,
  });
}
