import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User, ActiveSession, UserRole } from '../types/db';

export interface AuthContextType {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  isLoggedIn: boolean;
  activeSession: ActiveSession | null;
  setActiveSession: React.Dispatch<React.SetStateAction<ActiveSession | null>>;
  sessions: ActiveSession[];
  setSessions: React.Dispatch<React.SetStateAction<ActiveSession[]>>;
  isLocked: boolean;
  setIsLocked: React.Dispatch<React.SetStateAction<boolean>>;
  lockScreen: () => void;
  unlockScreen: (pinOrPass: string) => boolean;
  login: (username: string, passwordHash: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isRateLimited: boolean;
  rateLimitTimeLeft: number;
  clearServerErrorState: () => void;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem('tp_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [activeSession, setActiveSession] = useState<ActiveSession | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem('tp_active_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('tp_screen_locked') === 'true';
  });

  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitTimeLeft, setRateLimitTimeLeft] = useState(0);

  // Sync session state to storage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('tp_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('tp_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeSession) {
      localStorage.setItem('tp_active_session', JSON.stringify(activeSession));
    } else {
      localStorage.removeItem('tp_active_session');
    }
  }, [activeSession]);

  useEffect(() => {
    localStorage.setItem('tp_screen_locked', String(isLocked));
  }, [isLocked]);

  const lockScreen = useCallback(() => {
    setIsLocked(true);
  }, []);

  const unlockScreen = useCallback((pinOrPass: string) => {
    if (!currentUser) return false;
    if (currentUser.managerPin && currentUser.managerPin === pinOrPass) {
      setIsLocked(false);
      return true;
    }
    if (currentUser.passwordHash && currentUser.passwordHash === pinOrPass) {
      setIsLocked(false);
      return true;
    }
    return false;
  }, [currentUser]);

  const login = useCallback(async (username: string, passwordHash: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: passwordHash }),
      });
      const json = await res.json();
      if (res.ok && json.success && json.user) {
        setCurrentUser(json.user);
        setIsLocked(false);
        setIsRateLimited(false);
        if (json.token) {
          localStorage.setItem('tp_session_token', json.token);
          sessionStorage.setItem('tp_session_token', json.token);
        }
        const newSession: ActiveSession = {
          id: `sess-${Date.now()}`,
          userId: json.user.id,
          username: json.user.username,
          fullName: json.user.fullName,
          role: json.user.role,
          branchId: json.user.branchAssignmentId || 'B1',
          branchName: 'Main Branch',
          lastActive: new Date().toISOString(),
          userAgent: navigator.userAgent,
          sessionStartedAt: new Date().toISOString(),
        };
        setActiveSession(newSession);
        return { success: true };
      }
      return { success: false, error: json.error || 'Invalid credentials' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login request failed' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch {
      // Ignore network errors during logout
    }
    setCurrentUser(null);
    setActiveSession(null);
    setIsLocked(false);
    localStorage.removeItem('tp_session_token');
    sessionStorage.removeItem('tp_session_token');
  }, []);

  const clearServerErrorState = useCallback(() => {
    setIsRateLimited(false);
    setRateLimitTimeLeft(0);
  }, []);

  const hasRole = useCallback((roles: UserRole | UserRole[]) => {
    if (!currentUser) return false;
    if (Array.isArray(roles)) {
      return roles.includes(currentUser.role);
    }
    return currentUser.role === roles;
  }, [currentUser]);

  const value = useMemo<AuthContextType>(() => ({
    currentUser,
    setCurrentUser,
    isLoggedIn: !!currentUser,
    activeSession,
    setActiveSession,
    sessions,
    setSessions,
    isLocked,
    setIsLocked,
    lockScreen,
    unlockScreen,
    login,
    logout,
    isRateLimited,
    rateLimitTimeLeft,
    clearServerErrorState,
    hasRole,
  }), [
    currentUser,
    activeSession,
    sessions,
    isLocked,
    lockScreen,
    unlockScreen,
    login,
    logout,
    isRateLimited,
    rateLimitTimeLeft,
    clearServerErrorState,
    hasRole,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
