import { useQuery } from '@tanstack/react-query';
import { User, ActiveSession } from '../types/db';
import { fetchAuthenticatedDb, getQueryAuthHeaders, getQueryAuthToken } from './queryClient';

export const AUTH_QUERY_KEYS = {
  session: ['auth', 'session'] as const,
  activeSessions: ['auth', 'activeSessions'] as const,
  users: ['auth', 'users'] as const,
};

export function useCurrentSessionQuery() {
  const token = getQueryAuthToken();
  return useQuery<{
    success: boolean;
    user: User | null;
    sessionId?: string;
    session?: ActiveSession;
    remainingSeconds?: number;
  }>({
    queryKey: AUTH_QUERY_KEYS.session,
    enabled: Boolean(token),
    queryFn: async () => {
      if (!token) {
        return { success: false, user: null };
      }
      try {
        const res = await fetch('/api/auth/session', {
          headers: getQueryAuthHeaders()
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.debug('[AuthQuery] Session fetch error:', err);
      }
      return { success: false, user: null };
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // 1 minute heartbeat
    retry: false,
  });
}

export function useActiveSessionsQuery() {
  const token = getQueryAuthToken();
  return useQuery<ActiveSession[]>({
    queryKey: AUTH_QUERY_KEYS.activeSessions,
    enabled: Boolean(token),
    queryFn: async () => {
      if (!token) return [];
      try {
        const res = await fetch('/api/auth/active-sessions', {
          headers: getQueryAuthHeaders()
        });
        if (res.ok) {
          const json = await res.json();
          return Array.isArray(json.sessions) ? json.sessions : [];
        }
      } catch {
        // Fallback
      }
      const cached = localStorage.getItem('tp_active_sessions');
      return cached ? JSON.parse(cached) : [];
    },
    initialData: () => {
      if (typeof window === 'undefined') return [];
      const cached = localStorage.getItem('tp_active_sessions');
      return cached ? JSON.parse(cached) : [];
    },
    staleTime: 1000 * 15,
  });
}

export function useUsersListQuery() {
  const token = getQueryAuthToken();
  return useQuery<User[]>({
    queryKey: AUTH_QUERY_KEYS.users,
    enabled: Boolean(token),
    queryFn: async () => {
      try {
        const json = await fetchAuthenticatedDb('/api/db');
        if (json) {
          const users = json?.data?.tp_users || json?.tp_users || json?.users;
          if (Array.isArray(users)) {
            return users;
          }
        }
      } catch {
        // Fallback
      }
      const cached = localStorage.getItem('tp_users');
      return cached ? JSON.parse(cached) : [];
    },
    initialData: () => {
      if (typeof window === 'undefined') return [];
      const cached = localStorage.getItem('tp_users');
      return cached ? JSON.parse(cached) : [];
    },
  });
}
