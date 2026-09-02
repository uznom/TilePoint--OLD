/**
 * Utility for debounced, batched writing to localStorage to prevent
 * main-thread blocking during rapid user actions or barcode scanning.
 */

const pendingWrites: Map<string, { value: string; timeoutId: ReturnType<typeof setTimeout> }> = new Map();

export function debouncedSetItem(key: string, value: any, delayMs: number = 300): void {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);

  const existing = pendingWrites.get(key);
  if (existing) {
    clearTimeout(existing.timeoutId);
  }

  const timeoutId = setTimeout(() => {
    try {
      localStorage.setItem(key, serialized);
    } catch (e) {
      console.warn(`[debouncedStorage] Failed to save key "${key}":`, e);
    } finally {
      pendingWrites.delete(key);
    }
  }, delayMs);

  pendingWrites.set(key, { value: serialized, timeoutId });
}

export function flushDebouncedStorage(key?: string): void {
  if (key) {
    const entry = pendingWrites.get(key);
    if (entry) {
      clearTimeout(entry.timeoutId);
      try {
        localStorage.setItem(key, entry.value);
      } catch (e) {
        console.warn(`[debouncedStorage] Flush failed for key "${key}":`, e);
      }
      pendingWrites.delete(key);
    }
  } else {
    pendingWrites.forEach((entry, k) => {
      clearTimeout(entry.timeoutId);
      try {
        localStorage.setItem(k, entry.value);
      } catch (e) {
        console.warn(`[debouncedStorage] Flush failed for key "${k}":`, e);
      }
    });
    pendingWrites.clear();
  }
}
