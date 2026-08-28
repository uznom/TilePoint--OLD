// Client manager for the Database Sync Web Worker.
// Provides promise-based RPC to offload serialization, collection merging, and diff comparisons to the background worker thread.

import type {
  ProcessSyncResponsePayload,
  ProcessDeltaResponsePayload,
  WorkerMessageRequest,
  WorkerMessageResponse
} from '../workers/dbSyncWorker';

class DbSyncWorkerClient {
  private worker: Worker | null = null;
  private pendingRequests = new Map<
    string,
    { resolve: (res: WorkerMessageResponse) => void; reject: (err: any) => void; timer: any }
  >();
  private reqIdCounter = 0;
  private isSupported = false;

  constructor() {
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(
          new URL('../workers/dbSyncWorker.ts', import.meta.url),
          { type: 'module' }
        );
        this.worker.onmessage = this.handleWorkerMessage.bind(this);
        this.worker.onerror = this.handleWorkerError.bind(this);
        this.isSupported = true;
        console.log('[DbSyncWorkerClient] Dedicated Web Worker initialized successfully.');
      } catch (err) {
        console.warn('[DbSyncWorkerClient] Failed to spawn Web Worker, falling back to main thread:', err);
        this.worker = null;
        this.isSupported = false;
      }
    }
  }

  public get isWorkerAvailable(): boolean {
    return this.isSupported && this.worker !== null;
  }

  private handleWorkerMessage(event: MessageEvent<WorkerMessageResponse>) {
    const data = event.data;
    if (!data || !data.id) return;

    const pending = this.pendingRequests.get(data.id);
    if (pending) {
      clearTimeout(pending.timer);
      this.pendingRequests.delete(data.id);
      if (data.type === 'ERROR') {
        pending.reject(new Error(data.error || 'Worker execution error'));
      } else {
        pending.resolve(data);
      }
    }
  }

  private handleWorkerError(error: ErrorEvent) {
    console.error('[DbSyncWorkerClient] Worker error event:', error.message);
  }

  private sendRequest(request: Omit<WorkerMessageRequest, 'id'>, timeoutMs = 8000): Promise<WorkerMessageResponse> {
    if (!this.worker || !this.isSupported) {
      return Promise.reject(new Error('Web Worker not supported or available'));
    }

    const id = `req_${++this.reqIdCounter}_${Date.now()}`;
    const fullRequest: WorkerMessageRequest = { ...request, id };

    return new Promise<WorkerMessageResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Worker request ${id} timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timer });
      this.worker!.postMessage(fullRequest);
    });
  }

  /**
   * Offloads server sync response parsing, array merging, equality checking & JSON stringify to background worker
   */
  public async processSyncResponse(payload: ProcessSyncResponsePayload): Promise<WorkerMessageResponse> {
    return this.sendRequest({
      type: 'PROCESS_SYNC_RESPONSE',
      syncPayload: payload
    });
  }

  /**
   * Offloads incremental delta sync merging and state diffing to background worker
   */
  public async processDeltaResponse(payload: ProcessDeltaResponsePayload): Promise<WorkerMessageResponse> {
    return this.sendRequest({
      type: 'PROCESS_DELTA_RESPONSE',
      deltaPayload: payload
    });
  }

  /**
   * Offloads bulk sync payload serialization to background worker
   */
  public async prepareBulkPayload(bulkPayload: any): Promise<{ serialized: string; volatileUpdates: Record<string, string> }> {
    const res = await this.sendRequest({
      type: 'PREPARE_BULK_PAYLOAD',
      bulkPayload
    });

    return {
      serialized: res.serialized || JSON.stringify({ data: bulkPayload }),
      volatileUpdates: res.volatileUpdates || {}
    };
  }

  /**
   * Offloads arbitrary object JSON serialization to background worker
   */
  public async serializeData(data: any): Promise<string> {
    const res = await this.sendRequest({
      type: 'SERIALIZE_DATA',
      serializeData: data
    });
    return res.serialized || JSON.stringify(data);
  }

  public destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.forEach(({ reject, timer }) => {
      clearTimeout(timer);
      reject(new Error('Worker client destroyed'));
    });
    this.pendingRequests.clear();
  }
}

export const dbSyncWorkerClient = new DbSyncWorkerClient();
