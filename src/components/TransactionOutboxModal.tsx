/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Inbox,
  Info,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Wifi,
  WifiOff,
  Zap
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
  OutboxRecord,
  OutboxStats,
  transactionOutboxService
} from '../services/transactionOutboxService';
import { HeroButton } from './common/ui/HeroButton';
import { HeroChip } from './common/ui/HeroChip';
import { HeroModal } from './common/ui/HeroModal';

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
          <HeroChip variant="success" size="sm" startContent={<CheckCircle2 className="w-3 h-3" />}>
            Synced
          </HeroChip>
        );
      case 'processing':
        return (
          <HeroChip variant="primary" size="sm" startContent={<RefreshCw className="w-3 h-3 animate-spin" />}>
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
          <HeroChip variant="secondary" size="sm" startContent={<AlertTriangle className="w-3 h-3" />}>
            Dead-Letter
          </HeroChip>
        );
    }
  };

  return (
    <HeroModal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      zIndex={100}
    >
      {/* Header */}
      <HeroModal.Header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 bg-content1 border-b border-divider/20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">
                Transactional Outbox Engine
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-content2 text-default-600 border border-divider/30">
                <ShieldCheck className="w-3 h-3 text-success" />
                Zero Data Loss
              </span>
            </div>
            <p className="text-xs text-default-500 mt-0.5 font-medium">
              Guaranteed local staging & FIFO auto-retry pipeline for offline POS writes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              stats.isOnline
                ? 'bg-success/10 text-success border-success/20'
                : 'bg-danger/10 text-danger border-danger/20'
            }`}
          >
            {stats.isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{stats.isOnline ? 'Online (Connected)' : 'Offline (Buffering)'}</span>
          </div>

          <HeroButton
            size="sm"
            variant="solid"
            color="primary"
            onClick={handleManualFlush}
            disabled={isFlushingManual || stats.isProcessing || !stats.isOnline}
            startIcon={<RefreshCw className={`w-3.5 h-3.5 ${isFlushingManual || stats.isProcessing ? 'animate-spin' : ''}`} />}
            className="text-xs font-bold"
          >
            {stats.isProcessing ? 'Syncing...' : 'Flush Outbox'}
          </HeroButton>
        </div>
      </HeroModal.Header>

      {/* Filter Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-4 bg-content2/40 border-b border-divider/20 text-foreground">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeFilter === 'all'
              ? 'bg-content1 border-primary text-primary shadow-xs'
              : 'bg-content1/40 border-divider/30 text-default-600 hover:bg-content1'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-default-500">Total Logged</div>
          <div className="text-lg font-black mt-0.5 text-foreground">{stats.total}</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('pending')}
          className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeFilter === 'pending'
              ? 'bg-content1 border-warning text-warning shadow-xs'
              : 'bg-content1/40 border-divider/30 text-default-600 hover:bg-content1'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-default-500">Pending / Queued</div>
          <div className="text-lg font-black text-warning mt-0.5">{stats.pending + stats.processing}</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('failed')}
          className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeFilter === 'failed'
              ? 'bg-content1 border-danger text-danger shadow-xs'
              : 'bg-content1/40 border-divider/30 text-default-600 hover:bg-content1'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-default-500">Retrying Errors</div>
          <div className="text-lg font-black text-danger mt-0.5">{stats.failed}</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('dead_letter')}
          className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeFilter === 'dead_letter'
              ? 'bg-content1 border-secondary text-secondary shadow-xs'
              : 'bg-content1/40 border-divider/30 text-default-600 hover:bg-content1'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-default-500">Dead-Letter</div>
          <div className="text-lg font-black text-secondary mt-0.5">{stats.deadLetter}</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('completed')}
          className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer col-span-2 sm:col-span-1 ${
            activeFilter === 'completed'
              ? 'bg-content1 border-success text-success shadow-xs'
              : 'bg-content1/40 border-divider/30 text-default-600 hover:bg-content1'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-default-500">Synced to Host</div>
          <div className="text-lg font-black text-success mt-0.5">{stats.completed}</div>
        </button>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-6 py-2.5 bg-content1 border-b border-divider/20 text-xs">
        <div className="text-default-500 font-medium">
          Showing {filteredItems.length} transaction item(s)
        </div>
        <div className="flex items-center gap-2">
          {stats.failed > 0 && (
            <HeroButton
              size="sm"
              variant="flat"
              color="danger"
              onClick={() => transactionOutboxService.retryAll()}
              startIcon={<RotateCcw className="w-3 h-3" />}
              className="text-[11px] font-semibold h-7"
            >
              Retry All Failed
            </HeroButton>
          )}
          {stats.completed > 0 && (
            <HeroButton
              size="sm"
              variant="flat"
              color="default"
              onClick={() => transactionOutboxService.clearCompleted()}
              startIcon={<Trash2 className="w-3 h-3" />}
              className="text-[11px] font-semibold h-7"
            >
              Clear Synced Logs
            </HeroButton>
          )}
          {stats.deadLetter > 0 && (
            <HeroButton
              size="sm"
              variant="flat"
              color="secondary"
              onClick={() => transactionOutboxService.clearDeadLetters()}
              startIcon={<Trash2 className="w-3 h-3" />}
              className="text-[11px] font-semibold h-7"
            >
              Purge Dead-Letters
            </HeroButton>
          )}
        </div>
      </div>

      {/* Items Container */}
      <HeroModal.Body className="p-4 space-y-2.5 min-h-[300px] overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-default-500">
            <div className="p-4 rounded-2xl bg-success/10 text-success mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Outbox is Clean</h3>
            <p className="text-xs max-w-sm mt-1 text-default-500">
              All local sales, adjustments, and transactions are synchronized with the central register host.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.queueId}
              className="p-3.5 rounded-2xl border border-divider/30 bg-content2/40 hover:bg-content2/70 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-content1 text-foreground shrink-0 mt-0.5 border border-divider/20">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-foreground">{item.id}</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold">
                      {item.txType}
                    </span>
                    {getStatusBadge(item.status)}
                  </div>
                  <div className="text-[11px] text-default-500 mt-1 flex items-center gap-3 flex-wrap font-medium">
                    <span>Created: {new Date(item.createdAt).toLocaleTimeString()}</span>
                    <span>Endpoint: {item.endpoint}</span>
                    {item.retryCount > 0 && (
                      <span className="text-warning font-semibold">
                        Retries: {item.retryCount}/{item.maxRetries}
                      </span>
                    )}
                  </div>
                  {item.lastError && (
                    <div className="text-[11px] text-danger mt-1 font-medium bg-danger/10 px-2 py-0.5 rounded-md border border-danger/20 inline-block">
                      Error: {item.lastError}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                {(item.status === 'failed' || item.status === 'dead_letter') && (
                  <HeroButton
                    size="sm"
                    variant="flat"
                    color="primary"
                    onClick={() => transactionOutboxService.retryItem(item.queueId)}
                    startIcon={<RotateCcw className="w-3 h-3" />}
                    className="text-[11px] font-semibold h-7"
                    title="Retry immediately"
                  >
                    Retry
                  </HeroButton>
                )}
                <HeroButton
                  size="sm"
                  variant="light"
                  color="danger"
                  onClick={() => transactionOutboxService.removeItem(item.queueId)}
                  className="h-7 w-7 min-w-0 p-0"
                  title="Remove record"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </HeroButton>
              </div>
            </div>
          ))
        )}
      </HeroModal.Body>

      {/* Footer Info */}
      <HeroModal.Footer className="px-6 py-3 border-t border-divider/20 bg-content1 justify-between text-[11px] text-default-500">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-primary" />
          <span>Transactions stay safely staged in browser storage until acknowledged by the host server.</span>
        </div>
        <div className="font-mono text-[10px]">Queue Storage: localStorage (tp_transaction_outbox)</div>
      </HeroModal.Footer>
    </HeroModal>
  );
};

export default TransactionOutboxModal;
