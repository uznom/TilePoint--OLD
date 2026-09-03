import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Product, BranchStock, Branch } from '../types/db';
import { mysqlDatabaseService } from '../services/mysqlDatabaseService';
import { QUERY_KEYS, fetchAuthenticatedDb, getQueryAuthToken } from './queryClient';

export function useProductsQuery() {
  const hasToken = Boolean(getQueryAuthToken());
  return useQuery<Product[]>({
    queryKey: QUERY_KEYS.products,
    enabled: hasToken,
    queryFn: async () => {
      try {
        const json = await fetchAuthenticatedDb('/api/db');
        if (json) {
          const list = json?.data?.tp_products || json?.products;
          if (Array.isArray(list)) {
            return list;
          }
        }
      } catch {
        // Network fallback to localStorage
      }
      const cached = localStorage.getItem('tp_products');
      return cached ? JSON.parse(cached) : [];
    },
    initialData: () => {
      if (typeof window === 'undefined') return [];
      const cached = localStorage.getItem('tp_products');
      return cached ? JSON.parse(cached) : [];
    },
  });
}

export function useBranchStockQuery(branchId?: string) {
  const hasToken = Boolean(getQueryAuthToken());
  return useQuery<BranchStock[]>({
    queryKey: QUERY_KEYS.branchStock(branchId),
    enabled: hasToken,
    queryFn: async () => {
      try {
        const res = await mysqlDatabaseService.fetchBranchStocks(branchId);
        if (res.success && Array.isArray(res.data)) {
          return res.data as unknown as BranchStock[];
        }
      } catch {
        // Fallback to localStorage
      }
      const cached = localStorage.getItem('tp_branch_stock');
      return cached ? JSON.parse(cached) : [];
    },
    initialData: () => {
      if (typeof window === 'undefined') return [];
      const cached = localStorage.getItem('tp_branch_stock');
      return cached ? JSON.parse(cached) : [];
    },
  });
}

export function useBranchesQuery() {
  const hasToken = Boolean(getQueryAuthToken());
  return useQuery<Branch[]>({
    queryKey: QUERY_KEYS.branches,
    enabled: hasToken,
    queryFn: async () => {
      try {
        const json = await fetchAuthenticatedDb('/api/db');
        if (json) {
          const list = json?.data?.tp_branches || json?.branches;
          if (Array.isArray(list)) {
            return list;
          }
        }
      } catch {
        // Fallback to localStorage
      }
      const cached = localStorage.getItem('tp_branches');
      return cached ? JSON.parse(cached) : [];
    },
    initialData: () => {
      if (typeof window === 'undefined') return [];
      const cached = localStorage.getItem('tp_branches');
      return cached ? JSON.parse(cached) : [];
    },
  });
}

export function useProductMutations() {
  const queryClient = useQueryClient();

  const addProduct = useMutation({
    mutationFn: async (product: Partial<Product>) => {
      const now = Date.now();
      const id = product.id || `P-${now}`;
      const fullRecord = { ...product, id };
      const res = await fetch('/api/db/delta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `delta-add-products-${id}-${now}`,
          timestamp: new Date().toISOString(),
          type: 'APPEND_ROW',
          payload: { key: 'tp_products', row: fullRecord }
        }),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Product> }) => {
      const now = Date.now();
      const fullRecord = { ...updates, id };
      const res = await fetch('/api/db/delta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `delta-upd-products-${id}-${now}`,
          timestamp: new Date().toISOString(),
          type: 'UPDATE_ROW',
          payload: { key: 'tp_products', row: fullRecord }
        }),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const now = Date.now();
      const res = await fetch('/api/db/delta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `delta-del-products-${id}-${now}`,
          timestamp: new Date().toISOString(),
          type: 'UPDATE_ROW',
          payload: { key: 'tp_products', row: { id, isDeleted: true } }
        }),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
    },
  });

  return { addProduct, updateProduct, deleteProduct };
}

