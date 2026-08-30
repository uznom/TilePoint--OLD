/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Inbox,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Wifi,
  WifiOff,
  X,
  RotateCcw,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import {
  transactionOutboxService,
  OutboxRecord,
  OutboxStats
} from '../services/transactionOutboxService';

interface TransactionOutboxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TransactionOutboxModal: React.FC<TransactionOutboxModalProps> = ({
  isOpen,
  onClose
}) => {
  const [stats, setStats] = useState<OutboxStats>(transactionOutboxService.getStats());
  const [items, setItems] = useState<OutboxRecord[]>(transactionOutboxService.getItems());
  const [selectedItem, setSelectedItem] = useState<OutboxRecord | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'failed' | 'dead_letter' | 'completed'>('all');
  const [isFlushingManual, setIsFlushingManual] = useState(false);

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

  if (!isOpen) return null;

  const filteredItems = items.filter((item) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'pending') return item.status === 'pending' || item.status === 'processing';
    return item.status === activeFilter;
  });

  const handleManualFlush = async () => {
    setIsFlushingManual(true);
    try {
      await transactionOutboxService.flush();
    } finally {
      setTimeout(() => setIsFlushingManual(false), 500);
    }
  };

  const getStatusBadge = (status: OutboxRecord['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Synced
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <RefreshCw className="w-3 h-3 animate-spin" /> In Flight
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Clock className="w-3 h-3" /> Queued
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3 h-3" /> Retrying
          </span>
        );
      case 'dead_letter':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <AlertTriangle className="w-3 h-3" /> Dead-Letter
          </span>
        );
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-4xl bg-card border border-border/40 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-foreground"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/30 bg-card/60">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Inbox className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-foreground tracking-tight">
                    Transactional Outbox Engine
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-default-100 text-default-600 border border-default-200">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    Zero Data Loss
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Guaranteed local staging & FIFO auto-retry pipeline for offline POS writes
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  stats.isOnline
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}
              >
                {stats.isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                <span>{stats.isOnline ? 'Online (Connected)' : 'Offline (Buffering)'}</span>
              </div>

              <button
                type="button"
                onClick={handleManualFlush}
                disabled={isFlushingManual || stats.isProcessing || !stats.isOnline}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-xs hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFlushingManual || stats.isProcessing ? 'animate-spin' : ''}`} />
                <span>{stats.isProcessing ? 'Syncing...' : 'Flush Outbox'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-default-100 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-5 gap-2 p-4 bg-default-50/50 border-b border-border/30">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-card border-primary text-primary shadow-xs'
                  : 'bg-card/40 border-border/30 text-default-600 hover:bg-card'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Logged</div>
              <div className="text-lg font-black mt-0.5">{stats.total}</div>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('pending')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                activeFilter === 'pending'
                  ? 'bg-card border-amber-500 text-amber-500 shadow-xs'
                  : 'bg-card/40 border-border/30 text-default-600 hover:bg-card'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pending / Queued</div>
              <div className="text-lg font-black text-amber-500 mt-0.5">{stats.pending + stats.processing}</div>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('failed')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                activeFilter === 'failed'
                  ? 'bg-card border-rose-500 text-rose-500 shadow-xs'
                  : 'bg-card/40 border-border/30 text-default-600 hover:bg-card'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Retrying Errors</div>
              <div className="text-lg font-black text-rose-500 mt-0.5">{stats.failed}</div>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('dead_letter')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                activeFilter === 'dead_letter'
                  ? 'bg-card border-purple-500 text-purple-500 shadow-xs'
                  : 'bg-card/40 border-border/30 text-default-600 hover:bg-card'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dead-Letter</div>
              <div className="text-lg font-black text-purple-500 mt-0.5">{stats.deadLetter}</div>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('completed')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                activeFilter === 'completed'
                  ? 'bg-card border-emerald-500 text-emerald-500 shadow-xs'
                  : 'bg-card/40 border-border/30 text-default-600 hover:bg-card'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Synced to Host</div>
              <div className="text-lg font-black text-emerald-500 mt-0.5">{stats.completed}</div>
            </button>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center justify-between px-6 py-2.5 bg-card border-b border-border/20 text-xs">
            <div className="text-muted-foreground font-medium">
              Showing {filteredItems.length} transaction item(s)
            </div>
            <div className="flex items-center gap-2">
              {stats.failed > 0 && (
                <button
                  type="button"
                  onClick={() => transactionOutboxService.retryAll()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 font-semibold transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Retry All Failed
                </button>
              )}
              {stats.completed > 0 && (
                <button
                  type="button"
                  onClick={() => transactionOutboxService.clearCompleted()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-default-100 hover:bg-default-200 text-default-600 font-semibold transition-all cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Clear Synced Logs
                </button>
              )}
              {stats.deadLetter > 0 && (
                <button
                  type="button"
                  onClick={() => transactionOutboxService.clearDeadLetters()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 font-semibold transition-all cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Purge Dead-Letters
                </button>
              )}
            </div>
          </div>

          {/* Items Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[300px]">
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-500 mb-3">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Outbox is Clean</h3>
                <p className="text-xs max-w-sm mt-1">
                  All local sales, adjustments, and transactions are synchronized with the central register host.
                </p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.queueId}
                  className="p-3.5 rounded-xl border border-border/40 bg-card hover:bg-default-50/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-default-100 text-foreground shrink-0 mt-0.5">
                      <Zap className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-foreground">{item.id}</span>
                        <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">
                          {item.txType}
                        </span>
                        {getStatusBadge(item.status)}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                        <span>Created: {new Date(item.createdAt).toLocaleTimeString()}</span>
                        <span>Endpoint: {item.endpoint}</span>
                        {item.retryCount > 0 && (
                          <span className="text-amber-500 font-semibold">
                            Retries: {item.retryCount}/{item.maxRetries}
                          </span>
                        )}
                      </div>
                      {item.lastError && (
                        <div className="text-[11px] text-rose-400 mt-1 font-medium bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/15 inline-block">
                          Error: {item.lastError}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                    {(item.status === 'failed' || item.status === 'dead_letter') && (
                      <button
                        type="button"
                        onClick={() => transactionOutboxService.retryItem(item.queueId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 font-semibold cursor-pointer transition-all"
                        title="Retry immediately"
                      >
                        <RotateCcw className="w-3 h-3" /> Retry
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => transactionOutboxService.removeItem(item.queueId)}
                      className="p-1.5 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-all"
                      title="Remove record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Info */}
          <div className="px-6 py-3 border-t border-border/30 bg-default-50/60 flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-primary" />
              <span>Transactions stay safely staged in browser storage until acknowledged by the host server.</span>
            </div>
            <div>Queue Storage: localStorage (tp_transaction_outbox)</div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
