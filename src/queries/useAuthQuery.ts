import { useQuery } from '@tanstack/react-query';
import { User, ActiveSession } from '../types/db';

export const AUTH_QUERY_KEYS = {
  session: ['auth', 'session'] as const,
  activeSessions: ['auth', 'activeSessions'] as const,
  users: ['auth', 'users'] as const,
};

export function useCurrentSessionQuery() {
  return useQuery<{
    success: boolean;
    user: User | null;
    sessionId?: string;
    session?: ActiveSession;
    remainingSeconds?: number;
  }>({
    queryKey: AUTH_QUERY_KEYS.session,
    queryFn: async () => {
      try {
        const token = localStorage.getItem('tp_session_token') || sessionStorage.getItem('tp_session_token');
        const res = await fetch('/api/auth/session', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
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
  return useQuery<ActiveSession[]>({
    queryKey: AUTH_QUERY_KEYS.activeSessions,
    queryFn: async () => {
      try {
        const res = await fetch('/api/auth/active-sessions');
        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.sessions)) {
            return json.sessions;
          }
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
  return useQuery<User[]>({
    queryKey: AUTH_QUERY_KEYS.users,
    queryFn: async () => {
      try {
        const res = await fetch('/api/db');
        if (res.ok) {
          const json = await res.json();
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
