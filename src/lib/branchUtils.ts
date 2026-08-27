import { Product, InventoryLocationStock, Branch } from '../types/db';

/**
 * Normalizes string identifiers for strict slug/token comparison.
 * e.g., "MAIN_BRANCH", "Main Branch", "main-branch" -> "mainbranch"
 */
export function slugifyBranchStr(str: string | undefined | null): string {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Utility function to compare two branch identifiers (IDs, names, or codes)
 * to determine if they refer to the same branch location.
 */
export function isSameBranch(
  branchA: string | undefined | null,
  branchB: string | undefined | null,
  branches?: Branch[] | null
): boolean {
  if (!branchA || !branchB) return false;
  if (branchA === branchB) return true;

  const slugA = slugifyBranchStr(branchA);
  const slugB = slugifyBranchStr(branchB);
  if (slugA && slugB && slugA === slugB) return true;

  if (branches && branches.length > 0) {
    const bObjA = branches.find(b => b && (b.id === branchA || b.branchCode === branchA || b.name === branchA || slugifyBranchStr(b.name) === slugA || slugifyBranchStr(b.branchCode) === slugA || slugifyBranchStr(b.id) === slugA));
    const bObjB = branches.find(b => b && (b.id === branchB || b.branchCode === branchB || b.name === branchB || slugifyBranchStr(b.name) === slugB || slugifyBranchStr(b.branchCode) === slugB || slugifyBranchStr(b.id) === slugB));
    if (bObjA && bObjB && bObjA.id === bObjB.id) return true;
  }

  return false;
}

/**
 * Retrieves the specific InventoryLocationStock record for a product and branch.
 */
export function getBranchStockRecord(
  p: Product | undefined | null,
  targetBranchId: string | undefined | null,
  branchStock: InventoryLocationStock[] | undefined | null,
  branches: Branch[] | undefined | null
): InventoryLocationStock | undefined {
  if (!p || !p.id || !targetBranchId || targetBranchId === 'consolidated' || targetBranchId === 'all' || targetBranchId === 'ALL') {
    return undefined;
  }

  const safeBranchStock = branchStock || [];
  const safeBranches = branches || [];

  return safeBranchStock.find(bs => {
    if (!bs || bs.productId !== p.id) return false;
    return isSameBranch(bs.branchId, targetBranchId, safeBranches);
  });
}

/**
 * Retrieves the available stock quantity of a product for a specific branch.
 * Handles consolidated mode as well as primary HQ branch fallbacks.
 */
export function getBranchStockQuantity(
  p: Product | undefined | null,
  targetBranchId: string | undefined | null,
  branchStock: InventoryLocationStock[] | undefined | null,
  branches: Branch[] | undefined | null
): number {
  if (!p) return 0;
  const safeBranchStock = branchStock || [];
  const safeBranches = branches || [];

  if (!targetBranchId || targetBranchId === 'consolidated' || targetBranchId === 'all' || targetBranchId === 'ALL') {
    const pStockRecs = safeBranchStock.filter(bs => bs && bs.productId === p.id);
    const sumBS = pStockRecs.reduce((sum, bs) => sum + (bs.quantity ?? 0), 0);
    return Math.max(p.stockQuantity ?? 0, sumBS);
  }

  const primaryBranchId = (typeof window !== 'undefined' && localStorage.getItem("tilepoint_primary_branch_id")) || "";
  const primaryBranch = safeBranches.find(b => b && !b.isDeleted && (b.id === primaryBranchId || (b as any).isPrimary)) ||
                        safeBranches.find(b => b && !b.isDeleted && (b.id === 'B1' || b.branchCode === 'B1' || b.name?.toLowerCase().includes('main'))) ||
                        safeBranches.find(b => b && !b.isDeleted) ||
                        safeBranches[0];
  const primaryId = primaryBranch?.id;

  const isTargetPrimary = isSameBranch(targetBranchId, primaryId, safeBranches);

  const bsRec = getBranchStockRecord(p, targetBranchId, safeBranchStock, safeBranches);
  if (bsRec) {
    return bsRec.quantity ?? 0;
  }

  // Check explicit product assignment (branchAssignmentId, branchId, or branchCode)
  const prodBranchId = (p as any).branchAssignmentId ||
                        (p as any).branchId ||
                        ((p.origin && safeBranches.some(b => b && (b.id === p.origin || b.branchCode === p.origin || slugifyBranchStr(b.name) === slugifyBranchStr(p.origin)))) ? p.origin : undefined) ||
                        (p as any).branchCode ||
                        (p as any).branch;

  if (prodBranchId && prodBranchId !== 'all' && prodBranchId !== 'ALL' && prodBranchId !== 'consolidated') {
    const matchesTarget = isSameBranch(prodBranchId, targetBranchId, safeBranches);
    if (matchesTarget) {
      return p.stockQuantity ?? 0;
    }
    // Explicitly belongs to another branch and has no stock record here
    return 0;
  }

  // Unassigned product fallback for primary branch only
  if (isTargetPrimary) {
    const otherRecs = safeBranchStock.filter(bs => {
      if (!bs || bs.productId !== p.id) return false;
      if (isSameBranch(bs.branchId, targetBranchId, safeBranches)) return false;
      if (isSameBranch(bs.branchId, primaryId, safeBranches)) return false;
      return true;
    });

    const otherBranchSum = otherRecs.reduce((sum, bs) => sum + (bs.quantity ?? 0), 0);
    const unallocated = Math.max(0, (p.stockQuantity ?? 0) - otherBranchSum);
    return unallocated;
  }

  return 0;
}

/**
 * Utility function to verify if a product belongs to or is actively stocked in a specific branch.
 * Prevents cross-branch inventory leakage while ensuring multi-branch visibility on all devices.
 */
export function isProductInBranch(
  p: Product | undefined | null,
  targetBranchId: string | undefined | null,
  branchStock: InventoryLocationStock[] | undefined | null,
  branches: Branch[] | undefined | null
): boolean {
  if (!p || p.isDeleted) return false;
  if (!targetBranchId || targetBranchId === 'consolidated' || targetBranchId === 'all' || targetBranchId === 'ALL') {
    return true;
  }

  const safeBranchStock = branchStock || [];
  const safeBranches = branches || [];

  const primaryBranchId = (typeof window !== 'undefined' && localStorage.getItem("tilepoint_primary_branch_id")) || "";
  const primaryBranch = safeBranches.find(b => b && !b.isDeleted && (b.id === primaryBranchId || (b as any).isPrimary)) ||
                        safeBranches.find(b => b && !b.isDeleted && (b.id === 'B1' || b.branchCode === 'B1' || b.name?.toLowerCase().includes('main'))) ||
                        safeBranches.find(b => b && !b.isDeleted) ||
                        safeBranches[0];
  const primaryId = primaryBranch?.id;

  const isTargetPrimary = isSameBranch(targetBranchId, primaryId, safeBranches);

  // 1. Check explicit branch stock records with positive stock
  const targetStockRec = safeBranchStock.find(bs => {
    if (!bs || bs.productId !== p.id) return false;
    return isSameBranch(bs.branchId, targetBranchId, safeBranches);
  });

  if (targetStockRec && (targetStockRec.quantity ?? 0) > 0) {
    return true;
  }

  // 2. Check explicit product assignment (branchAssignmentId, branchId, origin, or branchCode)
  const prodBranchId = (p as any).branchAssignmentId ||
                        (p as any).branchId ||
                        ((p.origin && safeBranches.some(b => b && (b.id === p.origin || b.branchCode === p.origin || slugifyBranchStr(b.name) === slugifyBranchStr(p.origin)))) ? p.origin : undefined) ||
                        (p as any).branchCode ||
                        (p as any).branch;

  if (prodBranchId && prodBranchId !== 'all' && prodBranchId !== 'ALL' && prodBranchId !== 'consolidated') {
    const matchesTarget = isSameBranch(prodBranchId, targetBranchId, safeBranches);
    if (matchesTarget) {
      return true;
    }
    // Explicitly belongs to another branch and has no stock in target branch
    return false;
  }

  // 3. Unassigned product fallback for primary branch
  if (isTargetPrimary) {
    // If explicitly assigned or stocked exclusively in another branch, do not fallback to primary
    const hasOtherBranchStock = safeBranchStock.some(bs => {
      if (!bs || bs.productId !== p.id) return false;
      return !isSameBranch(bs.branchId, primaryId, safeBranches) && (bs.quantity ?? 0) > 0;
    });
    if (hasOtherBranchStock) return false;

    const qty = getBranchStockQuantity(p, targetBranchId, safeBranchStock, safeBranches);
    return qty > 0;
  }

  return false;
}

/**
 * Formats branch labels as "Branch Name (Location)" for dropdown selectors and UI badges.
 * e.g., "tilepoint (Main Headquarters, Main Location)"
 */
export function getBranchOptionLabel(b: { name?: string; address?: string; branchCode?: string; id?: string } | undefined | null): string {
  if (!b) return 'Unknown Branch';
  const rawName = b.name || `Branch ${b.id || ''}`;
  const cleanName = rawName;
  const location = b.address || b.branchCode || 'Main Location';
  return `${cleanName} (${location})`;
}

/**
 * Builds an O(1) fast lookup Map for product stock quantities in a specific branch.
 * Transforms an O(N * M) repeated lookup into a single-pass O(N + M) operation.
 */
export function buildBranchStockMap(
  products: Product[] | undefined | null,
  targetBranchId: string | undefined | null,
  branchStock: InventoryLocationStock[] | undefined | null,
  branches: Branch[] | undefined | null
): Map<string, number> {
  const map = new Map<string, number>();
  if (!products || products.length === 0) return map;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    if (p && p.id) {
      map.set(p.id, getBranchStockQuantity(p, targetBranchId, branchStock, branches));
    }
  }

  return map;
}

