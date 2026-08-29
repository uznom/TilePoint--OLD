import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Product, BranchStock, Branch } from '../types/db';
import { mysqlDatabaseService } from '../services/mysqlDatabaseService';
import { QUERY_KEYS } from './queryClient';

export function useProductsQuery() {
  return useQuery<Product[]>({
    queryKey: QUERY_KEYS.products,
    queryFn: async () => {
      try {
        const res = await fetch('/api/db');
        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.products)) {
            return json.products;
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
  return useQuery<BranchStock[]>({
    queryKey: QUERY_KEYS.branchStock(branchId),
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
  return useQuery<Branch[]>({
    queryKey: QUERY_KEYS.branches,
    queryFn: async () => {
      try {
        const res = await fetch('/api/db');
        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.branches)) {
            return json.branches;
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
      const res = await fetch('/api/db/delta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CREATE', entity: 'products', record: product }),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Product> }) => {
      const res = await fetch('/api/db/delta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE', entity: 'products', id, record: updates }),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/db/delta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELETE', entity: 'products', id }),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
    },
  });

  return { addProduct, updateProduct, deleteProduct };
}
