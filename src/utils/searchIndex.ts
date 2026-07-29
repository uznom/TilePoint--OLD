export interface IndexedItem<T> {
  item: T;
  rawCombined: string;
  tokens: string[];
}

export function createSearchIndex<T>(
  items: T[],
  extractSearchText: (item: T) => string
): IndexedItem<T>[] {
  return items.map((item) => {
    const text = extractSearchText(item) || '';
    const rawCombined = text.toLowerCase();
    const tokens = rawCombined.split(/\s+/).filter(Boolean);
    return {
      item,
      rawCombined,
      tokens,
    };
  });
}

export function searchIndex<T>(
  index: IndexedItem<T>[],
  query: string
): T[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return index.map((entry) => entry.item);
  }

  const queryTokens = trimmed.split(/\s+/).filter(Boolean);

  return index
    .filter((entry) =>
      queryTokens.every((qToken) => entry.rawCombined.includes(qToken))
    )
    .map((entry) => entry.item);
}
