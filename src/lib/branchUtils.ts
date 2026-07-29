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
  if (!targetBranchId || targetBranchId === 'consolidated' || targetBranchId === 'all') {
    return p.stockQuantity ?? 0;
  }

  const safeBranchStock = branchStock || [];
  const safeBranches = branches || [];

  const bsRec = getBranchStockRecord(p, targetBranchId, safeBranchStock, safeBranches);
  if (bsRec) {
    return bsRec.quantity ?? 0;
  }

  // If no record exists, verify if target is Primary HQ branch and product belongs to it
  const primaryBranchId = (typeof window !== 'undefined' && localStorage.getItem("tilepoint_primary_branch_id")) || "B1";
  const primaryBranch = safeBranches.find(b => b && b.id === primaryBranchId) || safeBranches.find(b => b && b.id === 'B1') || safeBranches[0];
  const targetBranch = safeBranches.find(b => b && b.id === targetBranchId);
  const isTargetPrimary = primaryBranch && (
    targetBranchId === primaryBranch.id ||
    targetBranchId === 'B1' ||
    (targetBranch && targetBranch.id === primaryBranch.id)
  );

  if (isTargetPrimary && isProductInBranch(p, targetBranchId, safeBranchStock, safeBranches)) {
    return p.stockQuantity ?? 0;
  }

  return 0;
}

/**
 * Utility function to verify if a product belongs to or is actively stocked in a specific branch.
 * Prevents cross-branch inventory leakage (e.g. ETC_DIPOLOG MAIN items appearing in CHT_SINDANGAN).
 */
export function isProductInBranch(
  p: Product | undefined | null,
  targetBranchId: string | undefined | null,
  branchStock: InventoryLocationStock[] | undefined | null,
  branches: Branch[] | undefined | null
): boolean {
  if (!p) return false;
  // If no branch filter or consolidated view selected, show all products
  if (!targetBranchId || targetBranchId === 'consolidated' || targetBranchId === 'all') {
    return true;
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

  // 1. Check physical stock allocated to this branch
  const bsRec = getBranchStockRecord(p, targetBranchId, safeBranchStock, safeBranches);
  const bQty = bsRec ? bsRec.quantity : 0;

  // If target branch has positive physical stock (> 0), the product belongs here
  if (bQty > 0) {
    return true;
  }

  // 2. Check explicit origin / home branch assignment on the product
  const originSlug = slugifyBranchStr(p.origin);

  if (originSlug) {
    const matchesTarget =
      originSlug === targetIdSlug ||
      (targetNameSlug && (originSlug === targetNameSlug || originSlug.includes(targetNameSlug) || targetNameSlug.includes(originSlug))) ||
      (targetCodeSlug && originSlug === targetCodeSlug);

    if (matchesTarget) {
      return true; // Explicitly belongs to this target branch
    }

    // Check if origin matches any OTHER active branch
    const matchesOtherBranch = safeBranches.some(b => {
      if (!b || b.isDeleted || b.id === targetBranchId || (targetBranch && b.id === targetBranch.id)) return false;
      const bIdSlug = slugifyBranchStr(b.id);
      const bNameSlug = slugifyBranchStr(b.name);
      const bCodeSlug = slugifyBranchStr(b.branchCode);

      return (
        originSlug === bIdSlug ||
        (bNameSlug && (originSlug === bNameSlug || originSlug.includes(bNameSlug) || bNameSlug.includes(originSlug))) ||
        (bCodeSlug && originSlug === bCodeSlug)
      );
    });

    if (matchesOtherBranch) {
      // Belongs explicitly to another branch and target branch has no stock -> EXCLUDE
      return false;
    }
  }

  // 3. Check stock distribution across other branches
  const activeStockInOtherBranches = safeBranchStock.filter(bs => {
    if (!bs || bs.productId !== p.id || bs.quantity <= 0) return false;
    const isTarget =
      bs.branchId === targetBranchId ||
      (targetBranch && bs.branchId === targetBranch.id) ||
      (targetIdSlug && slugifyBranchStr(bs.branchId) === targetIdSlug) ||
      (targetNameSlug && slugifyBranchStr(bs.branchId) === targetNameSlug) ||
      (targetCodeSlug && slugifyBranchStr(bs.branchId) === targetCodeSlug);
    return !isTarget;
  });

  if (activeStockInOtherBranches.length > 0 && bQty <= 0) {
    // Product has positive stock in another branch and 0 in target branch -> EXCLUDE
    return false;
  }

  // 4. Identify Primary / HQ Main Branch
  const primaryBranchId = (typeof window !== 'undefined' && localStorage.getItem("tilepoint_primary_branch_id")) || "B1";
  const primaryBranch = safeBranches.find(b => b && b.id === primaryBranchId) || safeBranches.find(b => b && b.id === 'B1') || safeBranches[0];

  const isTargetPrimary = primaryBranch && (
    targetBranchId === primaryBranch.id ||
    targetBranchId === 'B1' ||
    (targetBranch && targetBranch.id === primaryBranch.id)
  );

  // If target is NOT the Primary / HQ branch (e.g. CHT_SINDANGAN is a secondary branch)
  // and CHT_SINDANGAN has no stock (>0) and product has no origin matching CHT_SINDANGAN:
  // EXCLUDE it so secondary branch starts clean and empty.
  if (!isTargetPrimary) {
    return false;
  }

  // If target IS the Primary HQ branch (e.g. ETC_DIPOLOG MAIN) and no origin or stock specifies another branch:
  // Default to true (products belong to Primary HQ branch by default)
  return true;
}
