/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  Eye,
  FileJson,
  Inbox,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  OutboxRecord,
  OutboxStats,
  transactionOutboxService,
} from '../services/transactionOutboxService';
import { useDb } from '../context/DbContext';
import { formatRelativeTime, formatDateTime as formatExactTime } from '../utils/dateUtils';
import { HeroButton } from './common/ui/HeroButton';
import { HeroChip } from './common/ui/HeroChip';
import { HeroModal } from './common/ui/HeroModal';

export interface TransactionOutboxPanelProps {
  showHeader?: boolean;
  className?: string;
  onClose?: () => void;
}

export const TransactionOutboxPanel: React.FC<TransactionOutboxPanelProps> = ({
  showHeader = true,
  className = '',
}) => {
  const { lastSyncTime, forceSyncAll, serverConnected, dbSyncStatus } = useDb();
  const [stats, setStats] = useState<OutboxStats>(transactionOutboxService.getStats());
  const [items, setItems] = useState<OutboxRecord[]>(transactionOutboxService.getItems());
  const [selectedItem, setSelectedItem] = useState<OutboxRecord | null>(null);
  const [activeFilter, setActiveFilter] = useState<
    'all' | 'pending' | 'failed' | 'dead_letter' | 'completed'
  >('all');
  const [isFlushingManual, setIsFlushingManual] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Live subscription to Transactional Outbox changes
  useEffect(() => {
    const unsubscribe = transactionOutboxService.subscribe((newStats, newItems) => {
      setStats(newStats);
      setItems(newItems);
      if (selectedItem) {
        const updated = newItems.find((i) => i.id === selectedItem.id);
        setSelectedItem(updated || null);
      }
    });
    return () => unsubscribe();
  }, [selectedItem]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'pending')
        return item.status === 'pending' || item.status === 'processing';
      return item.status === activeFilter;
    });
  }, [items, activeFilter]);

  const handleManualFlush = async () => {
    setIsFlushingManual(true);
    try {
      await transactionOutboxService.flush();
    } finally {
      setTimeout(() => setIsFlushingManual(false), 500);
    }
  };

  const handleFullSync = async () => {
    setIsSyncingAll(true);
    try {
      await Promise.all([forceSyncAll(), transactionOutboxService.flush()]);
    } finally {
      setTimeout(() => setIsSyncingAll(false), 600);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status: OutboxRecord['status']) => {
    switch (status) {
      case 'completed':
        return (
          <HeroChip variant="success" size="sm" startContent={<CheckCircle2 className="w-3 h-3" />}>
            Synced
          </HeroChip>
        );
      case 'processing':
        return (
          <HeroChip
            variant="primary"
            size="sm"
            startContent={<RefreshCw className="w-3 h-3 animate-spin" />}
          >
            In Flight
          </HeroChip>
        );
      case 'pending':
        return (
          <HeroChip variant="warning" size="sm" startContent={<Clock className="w-3 h-3" />}>
            Queued
          </HeroChip>
        );
      case 'failed':
        return (
          <HeroChip variant="danger" size="sm" startContent={<AlertTriangle className="w-3 h-3" />}>
            Retrying
          </HeroChip>
        );
      case 'dead_letter':
        return (
          <HeroChip
            variant="secondary"
            size="sm"
            startContent={<AlertTriangle className="w-3 h-3" />}
          >
            Dead-Letter
          </HeroChip>
        );
    }
  };

  return (
    <div className={`space-y-4 text-left font-sans ${className}`}>
      {/* 1. TOP HEADER & DATABASE SYNC STATUS BANNER */}
      {showHeader && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 rounded-2xl p-5 shadow-elevation-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Inbox className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground tracking-tight">
                  Transactional Outbox &amp; Sync Engine
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                  Guaranteed Delivery
                </span>
              </div>
              <p className="text-xs text-default-500 font-medium mt-0.5">
                Inspect staged local writes, monitor offline transaction queuing, and force real-time database synchronizations.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-stretch md:self-auto justify-end">
            <button
              type="button"
              onClick={handleFullSync}
              disabled={isSyncingAll || !stats.isOnline}
              className="px-4 py-2 bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider rounded-xl shadow-elevation-soft hover:opacity-95 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
              <span>{isSyncingAll ? 'Syncing...' : 'Sync All Data Now'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. REAL-TIME DATABASE SYNCHRONIZATION OVERVIEW CARD */}
      <div className="p-4 rounded-2xl border border-primary/30 bg-primary/5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-foreground tracking-wider">
                  Database Sync Status
                </span>
                <span
                  className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    serverConnected
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                  }`}
                >
                  {serverConnected ? 'Connected (MySQL)' : 'Offline / Disconnected'}
                </span>
                {dbSyncStatus === 'syncing' && (
                  <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary flex items-center gap-1">
                    <RefreshCw className="h-2.5 w-2.5 animate-spin" /> In Flight
                  </span>
                )}
              </div>
              <p className="text-[11px] text-default-500 mt-0.5">
                Backend: <span className="font-mono font-bold text-foreground">MySQL</span> | Outbox Engine:{' '}
                <span className="font-bold text-foreground font-mono">Durable FIFO Staging</span>
              </p>
            </div>
          </div>

          {/* LAST TIME SYNC WIDGET */}
          <div className="flex items-center gap-2 bg-content1/80 dark:bg-zinc-800/80 p-2.5 px-3.5 rounded-xl border border-divider/20 self-start sm:self-center">
            <Clock className="h-4 w-4 text-primary shrink-0" />
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-default-500">
                Last Database Sync
              </div>
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span className="text-primary font-black">
                  {formatRelativeTime(lastSyncTime)}
                </span>
                <span className="text-[10px] text-default-400 font-normal">
                  ({formatExactTime(lastSyncTime)})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. STATISTICS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-foreground">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            activeFilter === 'all'
              ? 'bg-content1 border-primary text-primary shadow-xs'
              : 'bg-content1/40 border-divider/20 text-default-600 hover:bg-content1'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-default-500">Total Logged</div>
          <div className="text-xl font-black mt-0.5 text-foreground">{stats.total}</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('pending')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            activeFilter === 'pending'
              ? 'bg-content1 border-warning text-warning shadow-xs'
              : 'bg-content1/40 border-divider/20 text-default-600 hover:bg-content1'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-default-500">Pending / Staged</div>
          <div className="text-xl font-black text-warning mt-0.5">
            {stats.pending + stats.processing}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('failed')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            activeFilter === 'failed'
              ? 'bg-content1 border-danger text-danger shadow-xs'
              : 'bg-content1/40 border-divider/20 text-default-600 hover:bg-content1'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-default-500">Retrying Errors</div>
          <div className="text-xl font-black text-danger mt-0.5">{stats.failed}</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('dead_letter')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            activeFilter === 'dead_letter'
              ? 'bg-content1 border-secondary text-secondary shadow-xs'
              : 'bg-content1/40 border-divider/20 text-default-600 hover:bg-content1'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-default-500">Dead-Letter</div>
          <div className="text-xl font-black text-secondary mt-0.5">{stats.deadLetter}</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('completed')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer col-span-2 sm:col-span-1 ${
            activeFilter === 'completed'
              ? 'bg-content1 border-success text-success shadow-xs'
              : 'bg-content1/40 border-divider/20 text-default-600 hover:bg-content1'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-default-500">Synced / Pruned</div>
          <div className="text-xl font-black text-success mt-0.5">{stats.completed}</div>
        </button>
      </div>

      {/* 4. ACTIONS TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3.5 bg-content1 border border-divider/20 rounded-2xl">
        <div className="flex items-center gap-1.5 overflow-x-auto select-none">
          {(['all', 'pending', 'failed', 'dead_letter', 'completed'] as const).map((filterKey) => (
            <button
              key={filterKey}
              type="button"
              onClick={() => setActiveFilter(filterKey)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeFilter === filterKey
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'text-default-500 hover:bg-default-100'
              }`}
            >
              {filterKey === 'dead_letter' ? 'Dead Letter' : filterKey}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {stats.failed > 0 && (
            <HeroButton
              size="sm"
              variant="flat"
              color="danger"
              onClick={() => transactionOutboxService.retryAll()}
              startIcon={<RotateCcw className="w-3.5 h-3.5" />}
              className="text-xs font-bold"
            >
              Retry All ({stats.failed})
            </HeroButton>
          )}

          {stats.completed > 0 && (
            <HeroButton
              size="sm"
              variant="light"
              color="default"
              onClick={() => transactionOutboxService.clearCompleted()}
              startIcon={<Trash2 className="w-3.5 h-3.5" />}
              className="text-xs font-bold text-default-500"
            >
              Clear Synced
            </HeroButton>
          )}

          {stats.deadLetter > 0 && (
            <HeroButton
              size="sm"
              variant="flat"
              color="secondary"
              onClick={() => transactionOutboxService.clearDeadLetters()}
              startIcon={<Trash2 className="w-3.5 h-3.5" />}
              className="text-xs font-bold"
            >
              Clear Dead Letters
            </HeroButton>
          )}

          <HeroButton
            size="sm"
            variant="solid"
            color="primary"
            onClick={handleManualFlush}
            disabled={isFlushingManual || stats.isProcessing || !stats.isOnline}
            startIcon={
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isFlushingManual || stats.isProcessing ? 'animate-spin' : ''
                }`}
              />
            }
            className="text-xs font-bold uppercase"
          >
            {stats.isProcessing ? 'Flushing...' : 'Flush Outbox'}
          </HeroButton>
        </div>
      </div>

      {/* 5. OUTBOX TRANSACTIONS TABLE / LIST */}
      <div className="space-y-2">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center border border-divider/20 rounded-2xl bg-content1/50 flex flex-col items-center justify-center space-y-3 shadow-2xs">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 shadow-elevation-soft animate-pulse">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Outbox is Clean</h3>
              <p className="text-xs text-default-500 max-w-md mx-auto mt-1 leading-relaxed">
                {activeFilter === 'all'
                  ? 'All local transactions, POS sales, and inventory stock updates have been synchronized to MySQL in real time.'
                  : `No outbox items currently match the "${activeFilter}" filter state.`}
              </p>
            </div>
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleFullSync}
                disabled={isSyncingAll}
                className="px-3.5 py-1.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl border border-primary/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncingAll ? 'animate-spin' : ''}`} />
                Check Server Status
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) => (
              <div
                key={item.queueId || item.id}
                className="p-3.5 sm:p-4 rounded-2xl border border-divider/20 bg-content1 hover:border-primary/40 transition-all space-y-2 shadow-2xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {getStatusBadge(item.status)}
                    <span className="font-mono text-xs font-bold text-foreground bg-content2 px-2 py-0.5 rounded-lg border border-divider/20 flex items-center gap-1.5">
                      {item.id}
                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.id, item.id)}
                        className="hover:text-primary transition-colors cursor-pointer"
                        title="Copy Transaction ID"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3 h-3 text-success" />
                        ) : (
                          <Copy className="w-3 h-3 text-default-400" />
                        )}
                      </button>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {item.txType || 'TRANSACTION'}
                    </span>
                    {item.priority && (
                      <span className="text-[10px] font-mono text-default-400">
                        Priority: P{item.priority}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="text-[11px] text-default-400 font-mono">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                    <HeroButton
                      size="sm"
                      variant="flat"
                      color="default"
                      onClick={() => setSelectedItem(item)}
                      startIcon={<Eye className="w-3 h-3" />}
                      className="text-[11px] font-bold h-7 px-2.5"
                    >
                      Payload
                    </HeroButton>

                    {(item.status === 'failed' || item.status === 'dead_letter') && (
                      <HeroButton
                        size="sm"
                        variant="flat"
                        color="warning"
                        onClick={() => transactionOutboxService.retryItem(item.queueId)}
                        startIcon={<RotateCcw className="w-3 h-3" />}
                        className="text-[11px] font-bold h-7 px-2"
                      >
                        Retry
                      </HeroButton>
                    )}

                    <HeroButton
                      size="sm"
                      variant="light"
                      color="danger"
                      onClick={() => transactionOutboxService.removeItem(item.queueId)}
                      startIcon={<Trash2 className="w-3 h-3" />}
                      className="text-[11px] font-bold h-7 px-2 text-danger hover:bg-danger/10"
                    >
                      Remove
                    </HeroButton>
                  </div>
                </div>

                {item.lastError && (
                  <div className="p-2 rounded-xl bg-danger/10 border border-danger/20 text-danger text-[11px] font-mono flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="break-all">{item.lastError}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-default-400 font-mono pt-1 border-t border-divider/10">
                  <span>Endpoint: <strong className="text-foreground">{item.endpoint}</strong></span>
                  <span>Method: <strong className="text-foreground">{item.method}</strong></span>
                  <span>Retries: <strong className="text-foreground">{item.retryCount || 0} / {item.maxRetries}</strong></span>
                  {item.branchId && <span>Branch: <strong className="text-foreground">{item.branchId}</strong></span>}
                  {item.userId && <span>User: <strong className="text-foreground">{item.userId}</strong></span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. PAYLOAD INSPECTOR MODAL */}
      {selectedItem && (
        <HeroModal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          size="2xl"
          zIndex={110}
        >
          <HeroModal.Header className="flex items-center justify-between p-4 bg-content1 border-b border-divider/20">
            <div className="flex items-center gap-2">
              <FileJson className="w-4 h-4 text-primary" />
              <span className="font-bold text-sm text-foreground">
                Payload Inspector: {selectedItem.id}
              </span>
            </div>
            <span className="text-[11px] font-mono text-default-400">
              {formatExactTime(selectedItem.createdAt)}
            </span>
          </HeroModal.Header>

          <HeroModal.Body className="p-4 space-y-3 bg-content1/50 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between text-xs font-mono text-default-500">
              <span>{selectedItem.method} {selectedItem.endpoint}</span>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    JSON.stringify(selectedItem.payload, null, 2),
                    'payload'
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-content2 hover:bg-content3 border border-divider/20 text-primary font-bold text-[11px] flex items-center gap-1 cursor-pointer"
              >
                {copiedId === 'payload' ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                <span>{copiedId === 'payload' ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>

            <pre className="p-4 rounded-xl bg-zinc-950 text-zinc-200 font-mono text-xs overflow-x-auto border border-white/10 leading-relaxed shadow-inner">
              {JSON.stringify(selectedItem.payload, null, 2)}
            </pre>
          </HeroModal.Body>

          <HeroModal.Footer className="flex items-center justify-end p-3 bg-content1 border-t border-divider/20">
            <HeroButton
              size="sm"
              variant="flat"
              color="default"
              onClick={() => setSelectedItem(null)}
            >
              Close
            </HeroButton>
          </HeroModal.Footer>
        </HeroModal>
      )}
    </div>
  );
};

export default TransactionOutboxPanel;
