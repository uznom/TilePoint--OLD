import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes default freshness
      gcTime: 1000 * 60 * 15, // 15 minutes garbage collection
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const QUERY_KEYS = {
  products: ['products'] as const,
  branchStock: (branchId?: string) => ['branchStock', branchId || 'all'] as const,
  branches: ['branches'] as const,
  sales: (branchId?: string) => ['sales', branchId || 'all'] as const,
  saleItems: ['saleItems'] as const,
  shifts: (branchId?: string) => ['shifts', branchId || 'all'] as const,
  categories: ['categories'] as const,
  brands: ['brands'] as const,
  suppliers: ['suppliers'] as const,
  deliveries: (branchId?: string) => ['deliveries', branchId || 'all'] as const,
  expenses: (branchId?: string) => ['expenses', branchId || 'all'] as const,
  members: ['members'] as const,
  damageLogs: (branchId?: string) => ['damageLogs', branchId || 'all'] as const,
  movements: (branchId?: string) => ['movements', branchId || 'all'] as const,
  auditLogs: ['auditLogs'] as const,
  purchaseOrders: ['purchaseOrders'] as const,
  transmittals: ['transmittals'] as const,
  branchSalesReports: ['branchSalesReports'] as const,
};

export function getQueryAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tp_session_token') || sessionStorage.getItem('tp_session_token');
}

export function getQueryAuthHeaders(): Record<string, string> {
  const token = getQueryAuthToken();
  const headers: Record<string, string> = {
    'Accept': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-session-token'] = token;
  }
  return headers;
}

export async function fetchAuthenticatedDb(path = '/api/db'): Promise<any> {
  const token = getQueryAuthToken();
  if (!token) {
    return null; // Return null when unauthenticated to fall back to cached initialData cleanly
  }
  try {
    const res = await fetch(path, {
      headers: getQueryAuthHeaders(),
      credentials: 'same-origin'
    });
    if (res.ok) {
      return await res.json();
    }
    if (res.status === 401 || res.status === 403) {
      return null;
    }
  } catch (_) {}
  return null;
}

