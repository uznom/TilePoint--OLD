import { Product, InventoryLocationStock, Branch } from '../types/db';

/**
 * Normalizes string identifiers for strict slug/token comparison.
 * e.g., "CHT_SINDANGAN", "CHT Sindangan", "cht-sindangan" -> "chtsindangan"
 */
export function slugifyBranchStr(str: string | undefined | null): string {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
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
  if (!p || !p.id || !targetBranchId || targetBranchId === 'consolidated' || targetBranchId === 'all') {
    return undefined;
  }

  const safeBranchStock = branchStock || [];
  const safeBranches = branches || [];

  const targetBranch = safeBranches.find(
    b => b && (
      b.id === targetBranchId ||
      slugifyBranchStr(b.name) === slugifyBranchStr(targetBranchId) ||
      slugifyBranchStr(b.branchCode) === slugifyBranchStr(targetBranchId)
    )
  );

  const targetIdSlug = slugifyBranchStr(targetBranchId);
  const targetNameSlug = slugifyBranchStr(targetBranch?.name);
  const targetCodeSlug = slugifyBranchStr(targetBranch?.branchCode);

  const primaryBranchId = (typeof window !== 'undefined' && localStorage.getItem("tilepoint_primary_branch_id")) || "";
  const primaryBranch = safeBranches.find(b => b && !b.isDeleted && (b.id === primaryBranchId || (b as any).isPrimary)) ||
                        safeBranches.find(b => b && !b.isDeleted) ||
                        safeBranches[0];
  const primaryId = primaryBranch?.id;
  const primarySlug = primaryBranch ? slugifyBranchStr(primaryBranch.id) : '';
  const primaryNameSlug = primaryBranch ? slugifyBranchStr(primaryBranch.name) : '';
  const primaryCodeSlug = primaryBranch ? slugifyBranchStr(primaryBranch.branchCode) : '';

  const isTargetPrimary = primaryBranch && (
    targetBranchId === primaryId ||
    (targetBranch && targetBranch.id === primaryId) ||
    (targetIdSlug && (targetIdSlug === primarySlug || targetIdSlug === primaryNameSlug || targetIdSlug === primaryCodeSlug))
  );

  return safeBranchStock.find(bs => {
    if (!bs || bs.productId !== p.id) return false;
    if (bs.branchId === targetBranchId) return true;
    if (targetBranch && bs.branchId === targetBranch.id) return true;
    const bsBranchSlug = slugifyBranchStr(bs.branchId);
    if (targetIdSlug && bsBranchSlug === targetIdSlug) return true;
    if (targetNameSlug && bsBranchSlug === targetNameSlug) return true;
    if (targetCodeSlug && bsBranchSlug === targetCodeSlug) return true;
    if (isTargetPrimary && (bs.branchId === primaryId || bsBranchSlug === primarySlug || bsBranchSlug === primaryNameSlug || bsBranchSlug === primaryCodeSlug)) return true;
    return false;
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
                        safeBranches.find(b => b && !b.isDeleted) ||
                        safeBranches[0];
  const primaryId = primaryBranch?.id;
  const primarySlug = primaryBranch ? slugifyBranchStr(primaryBranch.id) : '';
  const primaryNameSlug = primaryBranch ? slugifyBranchStr(primaryBranch.name) : '';
  const primaryCodeSlug = primaryBranch ? slugifyBranchStr(primaryBranch.branchCode) : '';

  const targetBranch = safeBranches.find(b => b && (
    b.id === targetBranchId ||
    slugifyBranchStr(b.name) === slugifyBranchStr(targetBranchId) ||
    slugifyBranchStr(b.branchCode) === slugifyBranchStr(targetBranchId)
  ));
  const isTargetPrimary = primaryBranch && (
    targetBranchId === primaryId ||
    (targetBranch && targetBranch.id === primaryId) ||
    (slugifyBranchStr(targetBranchId) && (
      slugifyBranchStr(targetBranchId) === primarySlug ||
      slugifyBranchStr(targetBranchId) === primaryNameSlug ||
      slugifyBranchStr(targetBranchId) === primaryCodeSlug
    ))
  );

  const bsRec = getBranchStockRecord(p, targetBranchId, safeBranchStock, safeBranches);
  const explicitQty = bsRec ? (bsRec.quantity ?? 0) : 0;

  // Check explicit product assignment (branchAssignmentId, branchId, or origin)
  const prodBranchId = (p as any).branchAssignmentId || (p as any).branchId || p.origin;
  if (prodBranchId && prodBranchId !== 'all' && prodBranchId !== 'ALL' && prodBranchId !== 'consolidated') {
    const targetIdSlug = slugifyBranchStr(targetBranchId);
    const targetNameSlug = slugifyBranchStr(targetBranch?.name);
    const targetCodeSlug = slugifyBranchStr(targetBranch?.branchCode);
    const prodSlug = slugifyBranchStr(prodBranchId);

    const matchesTarget = (prodBranchId === targetBranchId) ||
                          (targetBranch && prodBranchId === targetBranch.id) ||
                          (targetIdSlug && prodSlug === targetIdSlug) ||
                          (targetNameSlug && prodSlug === targetNameSlug) ||
                          (targetCodeSlug && prodSlug === targetCodeSlug) ||
                          (isTargetPrimary && (prodBranchId === primaryId || prodSlug === primarySlug || prodSlug === primaryNameSlug || prodSlug === primaryCodeSlug));

    if (matchesTarget) {
      // Product belongs to target branch. Return explicitQty if recorded, else fallback to p.stockQuantity
      return bsRec ? (bsRec.quantity ?? 0) : (p.stockQuantity ?? 0);
    } else {
      // Product explicitly belongs to ANOTHER branch.
      // Return explicitQty if transferred/stocked here, else 0
      return explicitQty;
    }
  }

  // Unassigned product fallback for primary branch
  if (isTargetPrimary) {
    const targetIdSlug = slugifyBranchStr(targetBranchId);
    const targetNameSlug = slugifyBranchStr(targetBranch?.name);
    const targetCodeSlug = slugifyBranchStr(targetBranch?.branchCode);

    const otherRecs = safeBranchStock.filter(bs => {
      if (!bs || bs.productId !== p.id) return false;
      if (bs.branchId === targetBranchId) return false;
      if (targetBranch && bs.branchId === targetBranch.id) return false;
      const bsBranchSlug = slugifyBranchStr(bs.branchId);
      if (targetIdSlug && bsBranchSlug === targetIdSlug) return false;
      if (targetNameSlug && bsBranchSlug === targetNameSlug) return false;
      if (targetCodeSlug && bsBranchSlug === targetCodeSlug) return false;
      if (bs.branchId === primaryId || bsBranchSlug === primarySlug || bsBranchSlug === primaryNameSlug || bsBranchSlug === primaryCodeSlug) return false;
      return true;
    });

    const otherBranchSum = otherRecs.reduce((sum, bs) => sum + (bs.quantity ?? 0), 0);
    const unallocated = Math.max(0, (p.stockQuantity ?? 0) - otherBranchSum);
    return Math.max(explicitQty, unallocated);
  }

  return explicitQty;
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

  const targetBranch = safeBranches.find(b => b && (
    b.id === targetBranchId ||
    slugifyBranchStr(b.name) === slugifyBranchStr(targetBranchId) ||
    slugifyBranchStr(b.branchCode) === slugifyBranchStr(targetBranchId)
  ));
  const targetIdSlug = slugifyBranchStr(targetBranchId);
  const targetNameSlug = slugifyBranchStr(targetBranch?.name);
  const targetCodeSlug = slugifyBranchStr(targetBranch?.branchCode);

  const primaryBranchId = (typeof window !== 'undefined' && localStorage.getItem("tilepoint_primary_branch_id")) || "";
  const primaryBranch = safeBranches.find(b => b && !b.isDeleted && (b.id === primaryBranchId || (b as any).isPrimary)) ||
                        safeBranches.find(b => b && !b.isDeleted) ||
                        safeBranches[0];
  const primaryId = primaryBranch?.id;
  const primarySlug = primaryBranch ? slugifyBranchStr(primaryBranch.id) : '';
  const primaryNameSlug = primaryBranch ? slugifyBranchStr(primaryBranch.name) : '';
  const primaryCodeSlug = primaryBranch ? slugifyBranchStr(primaryBranch.branchCode) : '';

  const isTargetPrimary = primaryBranch && (
    targetBranchId === primaryId ||
    (targetBranch && targetBranch.id === primaryId) ||
    (targetIdSlug && (targetIdSlug === primarySlug || targetIdSlug === primaryNameSlug || targetIdSlug === primaryCodeSlug))
  );

  // 1. If product is explicitly assigned to a specific branch (via branchAssignmentId, branchId, or origin)
  const prodBranchId = (p as any).branchAssignmentId || (p as any).branchId || p.origin;
  if (prodBranchId && prodBranchId !== 'all' && prodBranchId !== 'ALL' && prodBranchId !== 'consolidated') {
    const prodBranchSlug = slugifyBranchStr(prodBranchId);
    const matchesTarget = (prodBranchId === targetBranchId) ||
                          (targetBranch && prodBranchId === targetBranch.id) ||
                          (prodBranchSlug && targetIdSlug && prodBranchSlug === targetIdSlug) ||
                          (targetNameSlug && prodBranchSlug === targetNameSlug) ||
                          (targetCodeSlug && prodBranchSlug === targetCodeSlug) ||
                          (isTargetPrimary && (prodBranchId === primaryId || prodBranchSlug === primarySlug || prodBranchSlug === primaryNameSlug || prodBranchSlug === primaryCodeSlug));
    if (matchesTarget) {
      return true;
    }
    // If assigned to a different branch, check if it has been transferred or explicitly stocked at target branch
    const hasTargetStock = safeBranchStock.some(bs => {
      if (!bs || bs.productId !== p.id) return false;
      const bsBranchSlug = slugifyBranchStr(bs.branchId);
      const isBsTarget = bs.branchId === targetBranchId ||
                         (targetBranch && bs.branchId === targetBranch.id) ||
                         (targetIdSlug && bsBranchSlug === targetIdSlug) ||
                         (targetNameSlug && bsBranchSlug === targetNameSlug) ||
                         (targetCodeSlug && bsBranchSlug === targetCodeSlug);
      return isBsTarget && ((bs.quantity ?? 0) > 0 || bs.lowStockThresholdOverride !== undefined);
    });
    return hasTargetStock;
  }

  // 2. Unassigned / global product: check if an explicit branchStock record exists for target branch
  const hasTargetStockRec = safeBranchStock.some(bs => {
    if (!bs || bs.productId !== p.id) return false;
    const bsBranchSlug = slugifyBranchStr(bs.branchId);
    const isBsTarget = bs.branchId === targetBranchId ||
                       (targetBranch && bs.branchId === targetBranch.id) ||
                       (targetIdSlug && bsBranchSlug === targetIdSlug) ||
                       (targetNameSlug && bsBranchSlug === targetNameSlug) ||
                       (targetCodeSlug && bsBranchSlug === targetCodeSlug) ||
                       (isTargetPrimary && (bs.branchId === primaryId || bsBranchSlug === primarySlug || bsBranchSlug === primaryNameSlug || bsBranchSlug === primaryCodeSlug));
    return isBsTarget;
  });

  if (hasTargetStockRec) {
    return true;
  }

  // 3. Check if product has active branchStock records for OTHER branches
  const hasOtherBranchStock = safeBranchStock.some(bs => {
    if (!bs || bs.productId !== p.id) return false;
    const bsBranchSlug = slugifyBranchStr(bs.branchId);
    const isBsTarget = bs.branchId === targetBranchId ||
                       (targetBranch && bs.branchId === targetBranch.id) ||
                       (targetIdSlug && bsBranchSlug === targetIdSlug) ||
                       (targetNameSlug && bsBranchSlug === targetNameSlug) ||
                       (targetCodeSlug && bsBranchSlug === targetCodeSlug);
    return !isBsTarget && (bs.quantity ?? 0) > 0;
  });

  // If product has stock allocated at other branches:
  // Primary HQ branch gets unallocated remainder if any; non-primary branches return false
  if (hasOtherBranchStock) {
    if (isTargetPrimary) {
      const otherBranchSum = safeBranchStock
        .filter(bs => bs && bs.productId === p.id && bs.branchId !== targetBranchId && bs.branchId !== primaryId)
        .reduce((sum, bs) => sum + (bs.quantity ?? 0), 0);
      return (p.stockQuantity ?? 0) - otherBranchSum > 0;
    }
    return false;
  }

  // 4. Unassigned product with no branchStock records anywhere defaults to Primary HQ branch ('B1')
  return isTargetPrimary;
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
    const bObjA = branches.find(b => b.id === branchA || slugifyBranchStr(b.name) === slugA || slugifyBranchStr(b.branchCode) === slugA);
    const bObjB = branches.find(b => b.id === branchB || slugifyBranchStr(b.name) === slugB || slugifyBranchStr(b.branchCode) === slugB);
    if (bObjA && bObjB && bObjA.id === bObjB.id) return true;
  }

  return false;
}

/**
 * Formats branch labels as "Branch Name (Location)" for dropdown selectors and UI badges.
 * e.g., "tilepoint (Main Headquarters, Dipolog City)"
 */
export function getBranchOptionLabel(b: { name?: string; address?: string; branchCode?: string; id?: string } | undefined | null): string {
  if (!b) return 'Unknown Branch';
  const rawName = b.name || `Branch ${b.id || ''}`;
  const cleanName = rawName.startsWith('Emman Tile Center ') ? rawName.replace('Emman Tile Center ', '') : rawName;
  const location = b.address || b.branchCode || 'Main Location';
  return `${cleanName} (${location})`;
}
