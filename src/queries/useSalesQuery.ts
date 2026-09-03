import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sale, SaleItem, Shift, BranchSalesReport } from '../types/db';
import { mysqlDatabaseService } from '../services/mysqlDatabaseService';
import { QUERY_KEYS, fetchAuthenticatedDb, getQueryAuthToken } from './queryClient';

export function useSalesQuery(branchId?: string) {
  const hasToken = Boolean(getQueryAuthToken());
  return useQuery<Sale[]>({
    queryKey: QUERY_KEYS.sales(branchId),
    enabled: hasToken,
    queryFn: async () => {
      try {
        const json = await fetchAuthenticatedDb('/api/db');
        if (json) {
          const list = json?.data?.tp_sales || json?.sales;
          if (Array.isArray(list)) {
            if (branchId && branchId !== 'all') {
              return list.filter((s: Sale) => s.branchId === branchId);
            }
            return list;
          }
        }
      } catch {
        // Fallback to localStorage
      }
      const cached = localStorage.getItem('tp_sales');
      const parsed: Sale[] = cached ? JSON.parse(cached) : [];
      if (branchId && branchId !== 'all') {
        return parsed.filter((s: Sale) => s.branchId === branchId);
      }
      return parsed;
    },
    initialData: () => {
      if (typeof window === 'undefined') return [];
      const cached = localStorage.getItem('tp_sales');
      return cached ? JSON.parse(cached) : [];
    },
  });
}

export function useSaleItemsQuery() {
  const hasToken = Boolean(getQueryAuthToken());
  return useQuery<SaleItem[]>({
    queryKey: QUERY_KEYS.saleItems,
    enabled: hasToken,
    queryFn: async () => {
      try {
        const json = await fetchAuthenticatedDb('/api/db');
        if (json) {
          const list = json?.data?.tp_sale_items || json?.sale_items;
          if (Array.isArray(list)) {
            return list;
          }
        }
      } catch {
        // Fallback to localStorage
      }
      const cached = localStorage.getItem('tp_sale_items');
      return cached ? JSON.parse(cached) : [];
    },
    initialData: () => {
      if (typeof window === 'undefined') return [];
      const cached = localStorage.getItem('tp_sale_items');
      return cached ? JSON.parse(cached) : [];
    },
  });
}

export function useShiftsQuery(branchId?: string) {
  const hasToken = Boolean(getQueryAuthToken());
  return useQuery<Shift[]>({
    queryKey: QUERY_KEYS.shifts(branchId),
    enabled: hasToken,
    queryFn: async () => {
      try {
        const json = await fetchAuthenticatedDb('/api/db');
        if (json) {
          const list = json?.data?.tp_shifts || json?.shifts;
          if (Array.isArray(list)) {
            if (branchId && branchId !== 'all') {
              return list.filter((sh: Shift) => sh.branchId === branchId);
            }
            return list;
          }
        }
      } catch {
        // Fallback to localStorage
      }
      const cached = localStorage.getItem('tp_shifts');
      const parsed: Shift[] = cached ? JSON.parse(cached) : [];
      if (branchId && branchId !== 'all') {
        return parsed.filter((sh: Shift) => sh.branchId === branchId);
      }
      return parsed;
    },
    initialData: () => {
      if (typeof window === 'undefined') return [];
      const cached = localStorage.getItem('tp_shifts');
      return cached ? JSON.parse(cached) : [];
    },
  });
}

export function useBranchSalesReportsQuery() {
  const hasToken = Boolean(getQueryAuthToken());
  return useQuery<BranchSalesReport[]>({
    queryKey: QUERY_KEYS.branchSalesReports,
    enabled: hasToken,
    queryFn: async () => {
      try {
        const json = await fetchAuthenticatedDb('/api/db');
        if (json) {
          const list = json?.data?.tp_branch_sales_reports || json?.branch_sales_reports;
          if (Array.isArray(list)) {
            return list;
          }
        }
      } catch {
        // Fallback to localStorage
      }
      const cached = localStorage.getItem('tp_branch_sales_reports');
      return cached ? JSON.parse(cached) : [];
    },
    initialData: () => {
      if (typeof window === 'undefined') return [];
      const cached = localStorage.getItem('tp_branch_sales_reports');
      return cached ? JSON.parse(cached) : [];
    },
  });
}

export function useSaleMutations() {
  const queryClient = useQueryClient();

  const createSale = useMutation({
    mutationFn: async (salePayload: any) => {
      return await mysqlDatabaseService.saveSaleLog(salePayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.saleItems });
      queryClient.invalidateQueries({ queryKey: ['branchStock'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
    },
  });

  return { createSale };
}

