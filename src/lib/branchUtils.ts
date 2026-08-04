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

  const primaryBranchId = (typeof window !== 'undefined' && localStorage.getItem("tilepoint_primary_branch_id")) || "B1";
  const primaryBranch = safeBranches.find(b => b && b.id === primaryBranchId) || safeBranches.find(b => b && b.id === 'B1') || safeBranches[0];
  const isTargetPrimary = primaryBranch && (
    targetBranchId === primaryBranch.id ||
    targetBranchId === 'B1' ||
    (targetBranch && targetBranch.id === primaryBranch.id)
  );

  return safeBranchStock.find(bs => {
    if (!bs || bs.productId !== p.id) return false;
    if (bs.branchId === targetBranchId) return true;
    if (targetBranch && bs.branchId === targetBranch.id) return true;
    const bsBranchSlug = slugifyBranchStr(bs.branchId);
    if (targetIdSlug && bsBranchSlug === targetIdSlug) return true;
    if (targetNameSlug && bsBranchSlug === targetNameSlug) return true;
    if (targetCodeSlug && bsBranchSlug === targetCodeSlug) return true;
    if (isTargetPrimary && (bs.branchId === 'B1' || bsBranchSlug === 'b1')) return true;
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
  if (!targetBranchId || targetBranchId === 'consolidated' || targetBranchId === 'all' || targetBranchId === 'ALL') {
    return p.stockQuantity ?? 0;
  }

  const safeBranchStock = branchStock || [];
  const safeBranches = branches || [];

  const bsRec = getBranchStockRecord(p, targetBranchId, safeBranchStock, safeBranches);
  if (bsRec) {
    return bsRec.quantity ?? 0;
  }

  // Primary HQ branch check
  const primaryBranchId = (typeof window !== 'undefined' && localStorage.getItem("tilepoint_primary_branch_id")) || "B1";
  const primaryBranch = safeBranches.find(b => b && b.id === primaryBranchId) || safeBranches.find(b => b && b.id === 'B1') || safeBranches[0];
  const targetBranch = safeBranches.find(b => b && (
    b.id === targetBranchId ||
    slugifyBranchStr(b.name) === slugifyBranchStr(targetBranchId) ||
    slugifyBranchStr(b.branchCode) === slugifyBranchStr(targetBranchId)
  ));
  const isTargetPrimary = primaryBranch && (
    targetBranchId === primaryBranch.id ||
    targetBranchId === 'B1' ||
    (targetBranch && targetBranch.id === primaryBranch.id)
  );

  if (isTargetPrimary) {
    return p.stockQuantity ?? 0;
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

  // 1. Check if an explicit branchStock record exists for this product and branch
  const targetBranch = safeBranches.find(b => b && (
    b.id === targetBranchId ||
    slugifyBranchStr(b.name) === slugifyBranchStr(targetBranchId) ||
    slugifyBranchStr(b.branchCode) === slugifyBranchStr(targetBranchId)
  ));
  const targetIdSlug = slugifyBranchStr(targetBranchId);
  const targetNameSlug = slugifyBranchStr(targetBranch?.name);
  const targetCodeSlug = slugifyBranchStr(targetBranch?.branchCode);

  const bsRec = safeBranchStock.find(bs => {
    if (!bs || bs.productId !== p.id) return false;
    if (bs.branchId === targetBranchId) return true;
    if (targetBranch && bs.branchId === targetBranch.id) return true;
    const bsBranchSlug = slugifyBranchStr(bs.branchId);
    if (targetIdSlug && bsBranchSlug === targetIdSlug) return true;
    if (targetNameSlug && bsBranchSlug === targetNameSlug) return true;
    if (targetCodeSlug && bsBranchSlug === targetCodeSlug) return true;
    return false;
  });

  if (bsRec) {
    return true;
  }

  // 2. Check if product is explicitly assigned to a DIFFERENT restricted branch
  const prodBranchId = (p as any).branchAssignmentId || (p as any).branchId;
  if (prodBranchId && prodBranchId !== 'all' && prodBranchId !== 'ALL' && prodBranchId !== 'consolidated') {
    const prodBranchSlug = slugifyBranchStr(prodBranchId);
    if (prodBranchSlug && targetIdSlug && prodBranchSlug !== targetIdSlug &&
        (!targetNameSlug || prodBranchSlug !== targetNameSlug) &&
        (!targetCodeSlug || prodBranchSlug !== targetCodeSlug)) {
      return false;
    }
  }

  // 3. Otherwise, product is available across all active branches
  return true;
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
