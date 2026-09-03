import { useQuery } from '@tanstack/react-query';
import { InventoryMovement, DamageLog, Delivery, Transmittal, Expense, PurchaseOrder, Member, AuditLog } from '../types/db';
import { mysqlDatabaseService } from '../services/mysqlDatabaseService';
import { QUERY_KEYS, fetchAuthenticatedDb, getQueryAuthToken } from './queryClient';

export function useMovementsQuery(branchId?: string) {
  const hasToken = Boolean(getQueryAuthToken());
  return useQuery<InventoryMovement[]>({
    queryKey: QUERY_KEYS.movements(branchId),
    enabled: hasToken,
    queryFn: async () => {
      try {
        const json = await fetchAuthenticatedDb('/api/db');
        if (json) {
          const list = json?.data?.tp_movements || json?.movements;
          if (Array.isArray(list)) {
            if (branchId && branchId !== 'all') {
              return list.filter((m: InventoryMovement) => m.sourceBranchId === branchId || m.destinationBranchId === branchId);
            }
            return list;
          }
        }
      } catch {
        // Fallback to localStorage
      }
      const cached = localStorage.getItem('tp_movements');
      const parsed: InventoryMovement[] = cached ? JSON.parse(cached) : [];
      if (branchId && branchId !== 'all') {
        return parsed.filter((m: InventoryMovement) => m.sourceBranchId === branchId || m.destinationBranchId === branchId);
      }
      return parsed;
    },
    initialData: () => {
      if (typeof window === 'undefined') return [];
      const cached = localStorage.getItem('tp_movements');
      return cached ? JSON.parse(cached) : [];
    },
  });
}

export function useDamageLogsQuery(branchId?: string) {
  const hasToken = Boolean(getQueryAuthToken());
  return useQuery<DamageLog[]>({
    queryKey: QUERY_KEYS.damageLogs(branchId),
    enabled: hasToken,
    queryFn: async () => {
      try {
        const json = await fetchAuthenticatedDb('/api/db');
        if (json) {
          const list = json?.data?.tp_damage_logs || json?.damage_logs;
          if (Array.isArray(list)) {
            if (branchId && branchId !== 'all') {
              return list.filter((d: DamageLog) => d.branchId === branchId);
            }
            return list;
          }
        }
      } catch {
        // Fallback to localStorage
      }
      const cached = localStorage.getItem('tp_damage_logs');
      const parsed: DamageLog[] = cached ? JSON.parse(cached) : [];
      if (branchId && branchId !== 'all') {
        return parsed.filter((d: DamageLog) => d.branchId === branchId);
      }
      return parsed;
    },
    initialData: () => {
      if (typeof window === 'undefined') return [];
      const cached = localStorage.getItem('tp_damage_logs');
      return cached ? JSON.parse(cached) : [];
    },
  });
}

export function useDeliveriesQuery(branchId?: string) {
  const hasToken = Boolean(getQueryAuthToken());
  return useQuery<Delivery[]>({
    queryKey: QUERY_KEYS.deliveries(branchId),
    enabled: hasToken,
    queryFn: async () => {
      try {
        const json = await fetchAuthenticatedDb('/api/db');
        if (json) {
          const list = json?.data?.tp_deliveries || json?.deliveries;
          if (Array.isArray(list)) {
            if (branchId && branchId !== 'all') {
              return list.filter((d: Delivery) => d.branchId === branchId);
            }
            return list;
          }
        }
      } catch {
        // Fallback to localStorage
      }
      const cached = localStorage.getItem('tp_deliveries');
      const parsed: Delivery[] = cached ? JSON.parse(cached) : [];
      if (branchId && branchId !== 'all') {
        return parsed.filter((d: Delivery) => d.branchId === branchId);
      }
      return parsed;
    },
    initialData: () => {
      if (typeof window === 'undefined') return [];
      const cached = localStorage.getItem('tp_deliveries');
      return cached ? JSON.parse(cached) : [];
    },
  });
}

export function useTransmittalsQuery() {
  const hasToken = Boolean(getQueryAuthToken());
  return useQuery<Transmittal[]>({
    queryKey: QUERY_KEYS.transmittals,
    enabled: hasToken,
    queryFn: async () => {
      try {
        const json = await fetchAuthenticatedDb('/api/db');
        if (json) {
          const list = json?.data?.tp_transmittals || json?.transmittals;
          if (Array.isArray(list)) {
            return list;
          }
        }
      } catch {
        // Fallback to localStorage
      }
      const cached = localStorage.getItem('tp_transmittals');
      return cached ? JSON.parse(cached) : [];
    },
    initialData: () => {
      if (typeof window === 'undefined') return [];
      const cached = localStorage.getItem('tp_transmittals');
      return cached ? JSON.parse(cached) : [];
    },
  });
}

export function useExpensesQuery(branchId?: string) {
  const hasToken = Boolean(getQueryAuthToken());
  return useQuery<Expense[]>({
    queryKey: QUERY_KEYS.expenses(branchId),
    enabled: hasToken,
    queryFn: async () => {
      try {
        const json = await fetchAuthenticatedDb('/api/db');
        if (json) {
          const list = json?.data?.tp_expenses || json?.expenses;
          if (Array.isArray(list)) {
            if (branchId && branchId !== 'all') {
              return list.filter((e: Expense) => e.branchId === branchId);
            }
            return list;
          }
        }
      } catch {
        // Fallback to localStorage
      }
      const cached = localStorage.getItem('tp_expenses');
      const parsed: Expense[] = cached ? JSON.parse(cached) : [];
      if (branchId && branchId !== 'all') {
        return parsed.filter((e: Expense) => e.branchId === branchId);
      }
      return parsed;
    },
    initialData: () => {
      if (typeof window === 'undefined') return [];
      const cached = localStorage.getItem('tp_expenses');
      return cached ? JSON.parse(cached) : [];
    },
  });
}

export function usePurchaseOrdersQuery() {
  const hasToken = Boolean(getQueryAuthToken());
  return useQuery<PurchaseOrder[]>({
    queryKey: QUERY_KEYS.purchaseOrders,
    enabled: hasToken,
    queryFn: async () => {
      try {
        const json = await fetchAuthenticatedDb('/api/db');
        if (json) {
          const list = json?.data?.tp_purchase_orders || json?.purchase_orders;
          if (Array.isArray(list)) {
            return list;
          }
        }
      } catch {
        // Fallback to localStorage
      }
      const cached = localStorage.getItem('tp_purchase_orders');
      return cached ? JSON.parse(cached) : [];
    },
    initialData: () => {
      if (typeof window === 'undefined') return [];
      const cached = localStorage.getItem('tp_purchase_orders');
      return cached ? JSON.parse(cached) : [];
    },
  });
}

export function useMembersQuery() {
  const hasToken = Boolean(getQueryAuthToken());
  return useQuery<Member[]>({
    queryKey: QUERY_KEYS.members,
    enabled: hasToken,
    queryFn: async () => {
      try {
        const json = await fetchAuthenticatedDb('/api/db');
        if (json) {
          const list = json?.data?.tp_members || json?.members;
          if (Array.isArray(list)) {
            return list;
          }
        }
      } catch {
        // Fallback to localStorage
      }
      const cached = localStorage.getItem('tp_members');
      return cached ? JSON.parse(cached) : [];
    },
    initialData: () => {
      if (typeof window === 'undefined') return [];
      const cached = localStorage.getItem('tp_members');
      return cached ? JSON.parse(cached) : [];
    },
  });
}

export function useAuditLogsQuery() {
  const hasToken = Boolean(getQueryAuthToken());
  return useQuery<AuditLog[]>({
    queryKey: QUERY_KEYS.auditLogs,
    enabled: hasToken,
    queryFn: async () => {
      try {
        const res = await mysqlDatabaseService.getAuditTrails();
        if (res.success && Array.isArray(res.data)) {
          return res.data as AuditLog[];
        }
      } catch {
        // Fallback to localStorage
      }
      const cached = localStorage.getItem('tp_audit_logs');
      return cached ? JSON.parse(cached) : [];
    },
    initialData: () => {
      if (typeof window === 'undefined') return [];
      const cached = localStorage.getItem('tp_audit_logs');
      return cached ? JSON.parse(cached) : [];
    },
  });
}

