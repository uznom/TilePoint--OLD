import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { transactionOutboxService, OutboxStats } from '../services/transactionOutboxService';

export interface SyncContextType {
  isOnline: boolean;
  isSyncing: boolean;
  outboxStats: OutboxStats;
  triggerManualSync: () => Promise<void>;
}

const DEFAULT_OUTBOX_STATS: OutboxStats = {
  total: 0,
  pending: 0,
  processing: 0,
  completed: 0,
  failed: 0,
  deadLetter: 0,
  isOnline: true,
  isProcessing: false,
};

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined') return navigator.onLine;
    return true;
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [outboxStats, setOutboxStats] = useState<OutboxStats>(() => {
    try {
      return transactionOutboxService.getStats();
    } catch {
      return DEFAULT_OUTBOX_STATS;
    }
  });

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Poll outbox stats periodically
  useEffect(() => {
    let active = true;
    const fetchStats = () => {
      try {
        const stats = transactionOutboxService.getStats();
        if (active) {
          setOutboxStats(stats);
        }
      } catch {
        // Ignore background polling errors
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const triggerManualSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await transactionOutboxService.flush();
      const stats = transactionOutboxService.getStats();
      setOutboxStats(stats);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  const value = useMemo<SyncContextType>(() => ({
    isOnline,
    isSyncing,
    outboxStats,
    triggerManualSync,
  }), [
    isOnline,
    isSyncing,
    outboxStats,
    triggerManualSync,
  ]);

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};

export const useSync = (): SyncContextType => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
