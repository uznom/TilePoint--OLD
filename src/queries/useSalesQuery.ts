import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sale, SaleItem, Shift, BranchSalesReport } from '../types/db';
import { mysqlDatabaseService } from '../services/mysqlDatabaseService';
import { QUERY_KEYS } from './queryClient';

export function useSalesQuery(branchId?: string) {
  return useQuery<Sale[]>({
    queryKey: QUERY_KEYS.sales(branchId),
    queryFn: async () => {
      try {
        const res = await fetch('/api/db');
        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.sales)) {
            if (branchId && branchId !== 'all') {
              return json.sales.filter((s: Sale) => s.branchId === branchId);
            }
            return json.sales;
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
  return useQuery<SaleItem[]>({
    queryKey: QUERY_KEYS.saleItems,
    queryFn: async () => {
      try {
        const res = await fetch('/api/db');
        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.sale_items)) {
            return json.sale_items;
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
  return useQuery<Shift[]>({
    queryKey: QUERY_KEYS.shifts(branchId),
    queryFn: async () => {
      try {
        const res = await fetch('/api/db');
        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.shifts)) {
            if (branchId && branchId !== 'all') {
              return json.shifts.filter((sh: Shift) => sh.branchId === branchId);
            }
            return json.shifts;
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
  return useQuery<BranchSalesReport[]>({
    queryKey: QUERY_KEYS.branchSalesReports,
    queryFn: async () => {
      try {
        const res = await fetch('/api/db');
        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.branch_sales_reports)) {
            return json.branch_sales_reports;
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
