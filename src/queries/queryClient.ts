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
