export interface SearchIndexOptions<T> {
  extractExactKeys?: (item: T) => (string | undefined | null)[];
  extractSearchText?: (item: T) => string;
}

export interface IndexedItem<T> {
  item: T;
  rawCombined: string;
  tokens: string[];
  exactKeys?: string[];
}

export interface FastSearchIndex<T> {
  items: IndexedItem<T>[];
  exactKeyMap: Map<string, T>;
  cache: Map<string, T[]>;
}

const MAX_CACHE_SIZE = 50;

/**
 * Creates an optimized search index with pre-computed tokens and O(1) exact-key Map lookups.
 */
export function createSearchIndex<T>(
  items: T[],
  extractSearchText: (item: T) => string,
  extractExactKeys?: (item: T) => (string | undefined | null)[]
): IndexedItem<T>[] {
  const exactKeyMap = new Map<string, T>();

  const indexedItems: IndexedItem<T>[] = items.map((item) => {
    const text = extractSearchText(item) || '';
    const rawCombined = text.toLowerCase();
    const tokens = rawCombined.split(/[\s,./\-_+]+/).filter(Boolean);

    const keys: string[] = [];
    if (extractExactKeys) {
      const rawKeys = extractExactKeys(item) || [];
      for (const k of rawKeys) {
        if (k) {
          const cleanK = String(k).trim().toLowerCase();
          if (cleanK) {
            keys.push(cleanK);
            exactKeyMap.set(cleanK, item);
          }
        }
      }
    }

    return {
      item,
      rawCombined,
      tokens,
      exactKeys: keys.length > 0 ? keys : undefined,
    };
  });

  const indexObj: FastSearchIndex<T> = {
    items: indexedItems,
    exactKeyMap,
    cache: new Map<string, T[]>(),
  };

  // Provide array compatibility for legacy index consumers while attaching fast structures
  (indexedItems as any).__fastIndex = indexObj;

  return indexedItems;
}


/**
 * Searches the index using a multi-token ranked relevance scoring algorithm and O(1) exact matches.
 */
export function searchIndex<T>(
  index: FastSearchIndex<T> | IndexedItem<T>[],
  query: string,
  maxResults?: number
): T[] {
  const fastIndex: FastSearchIndex<T> = Array.isArray(index)
    ? (index as any).__fastIndex || {
        items: index,
        exactKeyMap: new Map<string, T>(),
        cache: new Map<string, T[]>(),
      }
    : index;

  const trimmed = (query || '').trim().toLowerCase();
  if (!trimmed) {
    const all = fastIndex.items.map((entry) => entry.item);
    return maxResults && maxResults > 0 ? all.slice(0, maxResults) : all;
  }

  // 1. Check O(1) cache
  if (fastIndex.cache && fastIndex.cache.has(trimmed)) {
    const cached = fastIndex.cache.get(trimmed)!;
    return maxResults && maxResults > 0 ? cached.slice(0, maxResults) : cached;
  }

  // 2. Fast O(1) exact key match (barcode, item code, SKU)
  const exactItem = fastIndex.exactKeyMap.get(trimmed);
  if (exactItem) {
    const matchedList = [exactItem];
    // Also include any other items that match closely
    for (const entry of fastIndex.items) {
      if (entry.item !== exactItem && entry.rawCombined.includes(trimmed)) {
        matchedList.push(entry.item);
      }
    }
    if (fastIndex.cache) {
      if (fastIndex.cache.size >= MAX_CACHE_SIZE) {
        const firstKey = fastIndex.cache.keys().next().value;
        if (firstKey !== undefined) fastIndex.cache.delete(firstKey);
      }
      fastIndex.cache.set(trimmed, matchedList);
    }
    return maxResults && maxResults > 0 ? matchedList.slice(0, maxResults) : matchedList;
  }

  // 3. Multi-token scored search
  const queryTokens = trimmed.split(/[\s,./\-_+]+/).filter(Boolean);
  if (queryTokens.length === 0) {
    return fastIndex.items.map((entry) => entry.item);
  }

  interface ScoredMatch {
    item: T;
    score: number;
  }

  const scoredMatches: ScoredMatch[] = [];

  for (let i = 0; i < fastIndex.items.length; i++) {
    const entry = fastIndex.items[i];
    let totalScore = 0;
    let allTokensMatch = true;

    // Check whole query substring match
    if (entry.rawCombined.includes(trimmed)) {
      totalScore += 50;
      if (entry.rawCombined.startsWith(trimmed)) {
        totalScore += 30;
      }
    }

    for (let t = 0; t < queryTokens.length; t++) {
      const qToken = queryTokens[t];
      let tokenFound = false;

      // Exact token match or prefix match
      for (let k = 0; k < entry.tokens.length; k++) {
        const itemToken = entry.tokens[k];
        if (itemToken === qToken) {
          totalScore += 25;
          tokenFound = true;
          break;
        } else if (itemToken.startsWith(qToken)) {
          totalScore += 15;
          tokenFound = true;
        } else if (itemToken.includes(qToken)) {
          totalScore += 8;
          tokenFound = true;
        }
      }

      if (!tokenFound && !entry.rawCombined.includes(qToken)) {
        allTokensMatch = false;
        break;
      } else if (!tokenFound) {
        totalScore += 5;
      }
    }

    if (allTokensMatch && totalScore > 0) {
      scoredMatches.push({ item: entry.item, score: totalScore });
    }
  }

  // Sort descending by score for optimal ranking
  scoredMatches.sort((a, b) => b.score - a.score);

  const results = scoredMatches.map((m) => m.item);

  // Store in cache
  if (fastIndex.cache) {
    if (fastIndex.cache.size >= MAX_CACHE_SIZE) {
      const firstKey = fastIndex.cache.keys().next().value;
      if (firstKey !== undefined) fastIndex.cache.delete(firstKey);
    }
    fastIndex.cache.set(trimmed, results);
  }

  return maxResults && maxResults > 0 ? results.slice(0, maxResults) : results;
}

