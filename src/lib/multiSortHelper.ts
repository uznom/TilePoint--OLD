export type SortDirection = 'ascending' | 'descending' | 'none';

export interface SortDescriptor {
  column: string;
  direction: 'ascending' | 'descending';
}

/**
 * Multi-column sort comparator:
 * Compares item A and item B across an array of column sort descriptors in order of priority.
 */
export function multiColumnComparator<T>(
  a: T,
  b: T,
  descriptors: SortDescriptor[],
  customGetters?: Record<string, (item: T) => any>
): number {
  if (!descriptors || descriptors.length === 0) return 0;

  for (const descriptor of descriptors) {
    const { column, direction } = descriptor;
    const factor = direction === 'descending' ? -1 : 1;

    let valA: any;
    let valB: any;

    if (customGetters && customGetters[column]) {
      valA = customGetters[column](a);
      valB = customGetters[column](b);
    } else {
      valA = (a as any)?.[column];
      valB = (b as any)?.[column];
    }

    if (valA === valB) continue;

    // Handle null / undefined (placed at the end regardless of sort direction)
    if (valA === undefined || valA === null) return 1;
    if (valB === undefined || valB === null) return -1;

    // Numeric comparison
    if (typeof valA === 'number' && typeof valB === 'number') {
      if (valA !== valB) {
        return (valA - valB) * factor;
      }
      continue;
    }

    // Date / Timestamp comparison
    if (valA instanceof Date && valB instanceof Date) {
      const diff = valA.getTime() - valB.getTime();
      if (diff !== 0) return diff * factor;
      continue;
    }

    // Boolean comparison
    if (typeof valA === 'boolean' && typeof valB === 'boolean') {
      const diff = (valA ? 1 : 0) - (valB ? 1 : 0);
      if (diff !== 0) return diff * factor;
      continue;
    }

    // Number strings check (e.g. currency "$12.50" or "₱3,500.00" or raw digits)
    const numA = typeof valA === 'string' ? parseFloat(valA.replace(/[^0-9.-]+/g, '')) : NaN;
    const numB = typeof valB === 'string' ? parseFloat(valB.replace(/[^0-9.-]+/g, '')) : NaN;
    if (!isNaN(numA) && !isNaN(numB) && /^[₱$€¥]?[0-9,]+(\.[0-9]+)?$/.test(String(valA).trim()) && /^[₱$€¥]?[0-9,]+(\.[0-9]+)?$/.test(String(valB).trim())) {
      if (numA !== numB) {
        return (numA - numB) * factor;
      }
      continue;
    }

    // Standard string locale comparison
    const strA = String(valA).trim();
    const strB = String(valB).trim();
    const strCompare = strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
    if (strCompare !== 0) {
      return strCompare * factor;
    }
  }

  return 0;
}

/**
 * Sorts an array using multiple sort descriptors
 */
export function sortWithDescriptors<T>(
  items: T[],
  descriptors: SortDescriptor[],
  customGetters?: Record<string, (item: T) => any>
): T[] {
  if (!descriptors || descriptors.length === 0 || !items || items.length === 0) {
    return items;
  }
  return [...items].sort((a, b) => multiColumnComparator(a, b, descriptors, customGetters));
}
