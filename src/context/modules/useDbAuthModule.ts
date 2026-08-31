/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from "react";
import { User, UserRole, Branch, ActiveSession, AuditLog, Product } from "../../types/db";
import { SEED_AUDIT_LOGS } from "../seedData";
import { safeParse } from "../dbContextStorage";
import {
  getClientFingerprintHash,
  getDeviceHardwareKey,
  getClientDeviceSummary,
} from "../../lib/fingerprint";
import { transactionOutboxService } from "../../services/transactionOutboxService";


interface UseDbAuthOptions {
  activeBranchId?: string;
}

export function useDbAuthModule(options?: UseDbAuthOptions) {
  // Load initial local data or populate with seed data from sessionStorage to isolate sessions
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    let cached = sessionStorage.getItem("tp_current_user");
    if (!cached) {
      cached = localStorage.getItem("tp_current_user");
    }
    if (!cached) return null; // Mandatory null state if session is missing to trigger login redirect
    try {
      return JSON.parse(cached);
    } catch (e) {
      return null;
    }
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    let cached = sessionStorage.getItem("tp_is_logged_in");
    if (!cached) {
      cached = localStorage.getItem("tp_is_logged_in");
    }
    return cached === "true";
  });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return (
      localStorage.getItem("tp_active_session_id") ||
      sessionStorage.getItem("tp_active_session_id") ||
      null
    );
  });

  const [sessionRemainingSeconds, setSessionRemainingSeconds] = useState<number>(() => {
    if (typeof window === "undefined") return 14400;
    const saved = sessionStorage.getItem("tp_session_remaining_seconds");
    return saved ? parseInt(saved, 10) : 14400;
  });

  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return (
      sessionStorage.getItem("tp_session_expires_at") ||
      localStorage.getItem("tp_session_expires_at") ||
      null
    );
  });

  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("tp_active_sessions");
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  const [sessionSupersededNotice, setSessionSupersededNotice] = useState<string | null>(null);

  const [apiErrorState, setApiErrorState] = useState<{
    statusCode: number;
    message: string;
    retryAfter?: number;
  } | null>(null);

  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutUntil, setLockoutUntil] = useState<number>(0);
  const [rateLimitTimeLeft, setRateLimitTimeLeft] = useState<number>(0);
  const [serverConnected, setServerConnected] = useState<boolean>(false);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    return safeParse<AuditLog[]>("tp_audit_logs", SEED_AUDIT_LOGS);
  });

  const addAuditLog = useCallback(
    (
      action: string,
      description: string,
      tableAffected: string = "General",
      recordId: string = "N/A",
      changePayload?: string
    ) => {
      const newLog: AuditLog = {
        id: `AL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        action,
        actionCode: action,
        description,
        tableAffected,
        recordId,
        changePayload,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        userId: currentUser?.id || "SYSTEM",
        username: currentUser?.username || "system",
        userName: currentUser?.fullName || "System User",
      };
      setAuditLogs((prev) => [newLog, ...prev.slice(0, 499)]);
    },
    [currentUser]
  );

  const [serverDegradedState, setServerDegradedState] = useState<{
    isDegraded: boolean;
    dbEngine: string;
    degradedSince?: string | null;
    lastDegradedReason?: string;
    queuedWritesCount?: number;
  }>({
    isDegraded: false,
    dbEngine: "MySQL",
    degradedSince: null,
    lastDegradedReason: "",
    queuedWritesCount: 0,
  });

  const [isConfigured, setIsConfigured] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const cached = localStorage.getItem("tp_is_configured");
    return cached === "true";
  });

  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("tp_session_token") || localStorage.getItem("tp_session_token");
  });

  const isRateLimited = rateLimitTimeLeft > 0 || (lockoutUntil ? Date.now() < lockoutUntil : false);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    let user = currentUser;
    if (!user) {
      const userStr =
        sessionStorage.getItem("tp_current_user") ||
        localStorage.getItem("tp_current_user");
      if (userStr) {
        try {
          user = JSON.parse(userStr);
        } catch (swallowedErr) {
          console.debug("[DbContext] Non-fatal swallowed error handled with fallback:", swallowedErr);
        }
      }
    }
    if (!user || !user.id || !user.role) return {};

    try {
      if (
        !sessionStorage.getItem("tp_current_user") &&
        !localStorage.getItem("tp_current_user")
      ) {
        sessionStorage.setItem("tp_current_user", JSON.stringify(user));
        localStorage.setItem("tp_current_user", JSON.stringify(user));
      }
    } catch (e) {
      console.debug("[DbContext] Cache sync exception ignored:", e);
    }

    const headers: Record<string, string> = {
      "x-user-id": user.id,
      "x-user-role": user.role,
      "x-user-branch": user.branchAssignmentId || "B1",
      "x-client-fp": getClientFingerprintHash(),
      "x-client-device": getClientDeviceSummary(),
      "x-device-key": getDeviceHardwareKey(),
    };

    if (activeSessionId) {
      headers["x-session-id"] = activeSessionId;
    }

    const token = sessionToken || (typeof window !== "undefined" ? (sessionStorage.getItem("tp_session_token") || localStorage.getItem("tp_session_token")) : null);
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      headers["x-session-token"] = token;
    }

    return headers;
  }, [currentUser, activeSessionId, sessionToken]);

  const updateCurrentUser = useCallback((updates: Partial<User>) => {
    setCurrentUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      try {
        sessionStorage.setItem("tp_current_user", JSON.stringify(updated));
        localStorage.setItem("tp_current_user", JSON.stringify(updated));
      } catch (e) {
        console.debug("[DbContext] User storage write notice:", e);
      }
      return updated;
    });
  }, []);

  const refreshServerStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/db/status", {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const body = await res.json().catch(() => ({}));
        setServerConnected(true);
        if (body.engine) {
          setServerDegradedState({
            isDegraded: false,
            dbEngine: body.engine,
            degradedSince: null,
            lastDegradedReason: "",
            queuedWritesCount: transactionOutboxService.getStats().pending,
          });
        }
      } else {
        setServerConnected(false);
      }
    } catch (e) {
      setServerConnected(false);
    }
  }, [getAuthHeaders]);

  const handleFailedLogin = useCallback(() => {
    setFailedAttempts((prev) => {
      const newCount = prev + 1;
      if (newCount >= 5) {
        const lockDuration = 60 * 1000;
        setLockoutUntil(Date.now() + lockDuration);
        setRateLimitTimeLeft(60);
      }
      return newCount;
    });
  }, []);

  const resetLockout = useCallback(() => {
    setFailedAttempts(0);
    setLockoutUntil(0);
    setRateLimitTimeLeft(0);
  }, []);

  const logout = useCallback(() => {
    if (activeSessionId) {
      fetch(`/api/auth/session?sessionId=${encodeURIComponent(activeSessionId)}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      }).catch((e) => console.debug("[DbContext] Session termination notice:", e));
    }
    setCurrentUser(null);
    setIsLoggedIn(false);
    setActiveSessionId(null);
    setSessionExpiresAt(null);
    setSessionToken(null);
    sessionStorage.removeItem("tp_current_user");
    sessionStorage.removeItem("tp_is_logged_in");
    sessionStorage.removeItem("tp_active_session_id");
    sessionStorage.removeItem("tp_session_expires_at");
    sessionStorage.removeItem("tp_session_remaining_seconds");
    sessionStorage.removeItem("tp_session_token");
    localStorage.removeItem("tp_current_user");
    localStorage.removeItem("tp_is_logged_in");
    localStorage.removeItem("tp_active_session_id");
    localStorage.removeItem("tp_session_expires_at");
    localStorage.removeItem("tp_session_remaining_seconds");
    localStorage.removeItem("tp_session_token");
  }, [activeSessionId, getAuthHeaders]);

  // Daily Midnight & Session Expiry Watcher
  useEffect(() => {
    if (!currentUser || !isLoggedIn) return;

    const computeRemaining = () => {
      const now = Date.now();
      const d = new Date(now);
      d.setHours(24, 0, 0, 0); // Next midnight
      const midnightMs = d.getTime();

      let targetExpiryMs = midnightMs;
      if (sessionExpiresAt) {
        const parsed = new Date(sessionExpiresAt).getTime();
        if (!isNaN(parsed) && parsed > now) {
          targetExpiryMs = Math.min(parsed, midnightMs);
        }
      }

      const diffSec = Math.max(0, Math.floor((targetExpiryMs - now) / 1000));
      return diffSec;
    };

    const initialSec = computeRemaining();
    setSessionRemainingSeconds(initialSec);

    if (initialSec <= 0) {
      logout();
      setSessionSupersededNotice("Your session expired at midnight. Please sign in again for the new business day.");
      return;
    }

    const timer = setInterval(() => {
      const remaining = computeRemaining();
      setSessionRemainingSeconds(remaining);
      try {
        sessionStorage.setItem("tp_session_remaining_seconds", String(remaining));
      } catch (_) {}
      if (remaining <= 0) {
        clearInterval(timer);
        logout();
        setSessionSupersededNotice("Your session expired at midnight. Please sign in again for the new business day.");
      }
    }, 1000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const rem = computeRemaining();
        setSessionRemainingSeconds(rem);
        if (rem <= 0) {
          logout();
          setSessionSupersededNotice("Your session expired at midnight. Please sign in again for the new business day.");
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [currentUser, isLoggedIn, sessionExpiresAt, logout]);

  // Initial Server Configuration & Health Check
  useEffect(() => {
    let isMounted = true;
    const checkServerConfiguration = async () => {
      try {
        const res = await fetch("/api/health");
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data && data.isConfigured && isMounted) {
            setIsConfigured(true);
            localStorage.setItem("tp_is_configured", "true");
            setIsConfigured(false);
            localStorage.removeItem("tp_is_configured");
            localStorage.removeItem("tp_users");
            localStorage.removeItem("tp_branches");
            setCurrentUser(null);
            setIsLoggedIn(false);
            setActiveSessionId(null);
            setSessionToken(null);
            sessionStorage.clear();
          }
        }
      } catch (err) {
        console.debug("[DbContext] Initial server configuration check:", err);
      }
    };
    checkServerConfiguration();
    return () => {
      isMounted = false;
    };
  }, []);

  const safeApiFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const authHeaders = getAuthHeaders();
      const customInit: RequestInit = {
        ...init,
        credentials: init?.credentials || "same-origin",
        headers: {
          ...authHeaders,
          ...(init?.headers || {}),
        },
      };

      try {
        const response = await fetch(input, customInit);
        if (response.status === 401 || response.status === 403) {
          const body = await response.clone().json().catch(() => ({}));
          if (body.superseded) {
            setSessionSupersededNotice(body.message || "Your session has been superseded by another login.");
          }
        }
        return response;
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message || "Network request failed" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }
    },
    [getAuthHeaders]
  );

  const terminateSession = useCallback(
    async (sessionId: string) => {
      try {
        await safeApiFetch(`/api/auth/session?sessionId=${encodeURIComponent(sessionId)}`, {
          method: "DELETE",
        });
        setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (sessionId === activeSessionId) {
          logout();
        }
      } catch (e) {
        console.debug("[DbContext] Session drop notice:", e);
      }
    },
    [safeApiFetch, activeSessionId, logout]
  );

  const clearSessionNotice = useCallback(() => {
    setSessionSupersededNotice(null);
  }, []);

  const extendSession = useCallback(
    async (additionalMinutes: number = 30): Promise<boolean> => {
      if (!activeSessionId) return false;
      try {
        const res = await safeApiFetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "extend", sessionId: activeSessionId, additionalMinutes }),
        });
        if (res.ok) {
          await res.json().catch(() => ({}));
          const now = Date.now();
          const d = new Date(now);
          d.setHours(24, 0, 0, 0); // Midnight
          const midnightMs = d.getTime();

          const newExpiryMs = Math.min((sessionExpiresAt ? new Date(sessionExpiresAt).getTime() : now) + additionalMinutes * 60 * 1000, midnightMs);
          const newExpiryIso = new Date(newExpiryMs).toISOString();
          setSessionExpiresAt(newExpiryIso);
          sessionStorage.setItem("tp_session_expires_at", newExpiryIso);
          localStorage.setItem("tp_session_expires_at", newExpiryIso);

          const rem = Math.max(0, Math.floor((newExpiryMs - now) / 1000));
          setSessionRemainingSeconds(rem);
          return true;
        }
      } catch (e) {
        console.debug("[DbContext] Session extension notice:", e);
      }
      return false;
    },
    [activeSessionId, sessionExpiresAt, safeApiFetch]
  );

  const login = useCallback(
    async (
      username: string,
      password: string
    ): Promise<{ success: boolean; error?: string; sqliBlocked?: boolean }> => {
      if (isRateLimited) {
        return {
          success: false,
          error: `Too many login attempts. Please wait ${rateLimitTimeLeft} seconds.`,
        };
      }

      try {
        const fp = getClientFingerprintHash();
        const devInfo = getClientDeviceSummary();
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-client-fp": fp,
            "x-client-device": devInfo,
          },
          body: JSON.stringify({ username, password }),
        });

        const body = await res.json();
        if (body.success && body.user) {
          const now = Date.now();
          const d = new Date(now);
          d.setHours(24, 0, 0, 0); // Next midnight
          const midnightIso = d.toISOString();
          const finalExpiryIso = body.expiresAt || midnightIso;

          setCurrentUser(body.user);
          setIsLoggedIn(true);
          setActiveSessionId(body.sessionId || `SES-${Date.now()}`);
          setSessionExpiresAt(finalExpiryIso);
          if (body.token) {
            setSessionToken(body.token);
            sessionStorage.setItem("tp_session_token", body.token);
            localStorage.setItem("tp_session_token", body.token);
          }
          resetLockout();

          sessionStorage.setItem("tp_current_user", JSON.stringify(body.user));
          sessionStorage.setItem("tp_is_logged_in", "true");
          sessionStorage.setItem("tp_session_expires_at", finalExpiryIso);
          if (body.sessionId) {
            sessionStorage.setItem("tp_active_session_id", body.sessionId);
          }
          return { success: true };
        } else {
          handleFailedLogin();
          return { success: false, error: body.error || "Invalid username or password" };
        }
      } catch (err: any) {
        return { success: false, error: err.message || "Failed to reach authentication server" };
      }
    },
    [isRateLimited, rateLimitTimeLeft, resetLockout, handleFailedLogin]
  );

  const logBranchAccessScope = useCallback(
    (
      operation: string,
      entityName: string,
      targetBranchId?: string | null,
      recordId?: string | null,
      additionalDetails?: any
    ) => {
      const userRole = currentUser?.role || UserRole.STAFF;
      const userBranch = currentUser?.branchAssignmentId || "B1";
      const targetBranch = targetBranchId || options?.activeBranchId || "B1";

      const isUnlimitedScope =
        userRole === UserRole.ADMIN ||
        targetBranch === "ALL" ||
        targetBranch === "consolidated" ||
        targetBranch === userBranch;

      const scopeDescription = isUnlimitedScope
        ? "CONSOLIDATED (ALL BRANCHES)"
        : `BRANCH SPECIFIC (${userBranch})`;

      const isAllowed = isUnlimitedScope;
      const statusLabel = isAllowed ? "ALLOWED" : "DENIED";

      return {
        userRole,
        userBranch,
        targetBranch,
        isAllowed,
        scope: scopeDescription,
        message: `[Branch Scope Diagnostic] [${operation.toUpperCase()}] Entity: ${entityName} | Record: ${recordId || "N/A"} | Target Branch: ${targetBranch} | User: ${currentUser?.username || "Anonymous"} (${userRole}) | User Branch: ${userBranch} | Scope: ${scopeDescription} | Status: ${statusLabel}`,
        additionalDetails,
      };
    },
    [currentUser?.role, currentUser?.branchAssignmentId, currentUser?.username, options?.activeBranchId]
  );

  const validateInventoryAccess = useCallback(
    (item: any): boolean => {
      const targetB = item?.currentBranchId || item?.branchId;
      logBranchAccessScope("READ", "InventoryAccessCheck", targetB, item?.id || item?.productId);
      if (!currentUser) return false;
      if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER) return true;
      if (!targetB) return true;
      return targetB === currentUser.branchAssignmentId;
    },
    [currentUser, logBranchAccessScope]
  );

  const clearServerErrorState = useCallback(() => {
    setApiErrorState(null);
  }, []);

  const setupSystem = useCallback(
    (
      adminData: {
        fullName: string;
        username: string;
        email: string;
        passwordHash: string;
        managerPin: string;
      },
      branchData: {
        id?: string;
        name: string;
        address: string;
        phone: string;
        storeLogo?: string;
      }
    ) => {
      setIsConfigured(true);
      localStorage.setItem("tp_is_configured", "true");
      addAuditLog("SYSTEM_SETUP", `Initial system configured for branch ${branchData.name} by ${adminData.fullName}`, "SYSTEM");
    },
    [addAuditLog]
  );

  const completeOnboarding = useCallback(
    async (newProducts?: Product[], newBranchesList?: Branch[]) => {
      setIsConfigured(true);
      localStorage.setItem("tp_is_configured", "true");
      addAuditLog("SYSTEM_ONBOARDING_COMPLETE", "System onboarding process finalized successfully.", "SYSTEM");
    },
    [addAuditLog]
  );

  const invalidateLocalCache = useCallback(async () => {
    addAuditLog("CACHE_INVALIDATE", "Local cache invalidated.", "SYSTEM");
  }, [addAuditLog]);

  return {
    currentUser,
    setCurrentUser,
    isLoggedIn,
    setIsLoggedIn,
    activeSessionId,
    setActiveSessionId,
    sessionRemainingSeconds,
    setSessionRemainingSeconds,
    sessionExpiresAt,
    setSessionExpiresAt,
    activeSessions,
    setActiveSessions,
    sessionSupersededNotice,
    setSessionSupersededNotice,
    apiErrorState,
    setApiErrorState,
    failedAttempts,
    setFailedAttempts,
    lockoutUntil,
    setLockoutUntil,
    rateLimitTimeLeft,
    setRateLimitTimeLeft,
    isRateLimited,
    serverConnected,
    setServerConnected,
    serverDegradedState,
    setServerDegradedState,
    isConfigured,
    setIsConfigured,
    auditLogs,
    setAuditLogs,
    addAuditLog,
    setupSystem,
    completeOnboarding,
    invalidateLocalCache,
    getAuthHeaders,
    updateCurrentUser,
    refreshServerStatus,
    handleFailedLogin,
    resetLockout,
    logout,
    safeApiFetch,
    terminateSession,
    clearSessionNotice,
    extendSession,
    login,
    logBranchAccessScope,
    validateInventoryAccess,
    clearServerErrorState,
  };
}
