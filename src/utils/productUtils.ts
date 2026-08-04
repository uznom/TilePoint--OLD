/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product } from '../types/db';

/**
 * Determines whether a product is strictly a tile product (porcelain, ceramic, granite, marble, slate, etc.)
 * versus a non-tile accessory/tool/chemical (tile adhesive, tile grout, tile spacer, tile trim, tile cutter, etc.).
 */
export function isTileProduct(product: Partial<Product> | null | undefined): boolean {
  if (!product || product.isDeleted) return false;

  const cat = (product.category || '').toLowerCase().trim();
  const name = (product.productName || '').toLowerCase().trim();

  // 1. Explicit exclusions of non-tile categories and accessories/supplies
  const nonTileKeywords = [
    'trim', 'tool', 'grout', 'adhesive', 'spacer', 'sink', 'electrical',
    'gloves', 'watercloset', 'closet', 'nosing', 'stairnosing', 'accessories',
    'chemical', 'paint', 'cement', 'cutter', 'cleaner', 'plumbing', 'faucet',
    'leveler', 'trowel', 'bucket', 'sponge', 'sealant'
  ];

  for (const kw of nonTileKeywords) {
    if (cat.includes(kw) || name.includes(kw)) {
      return false;
    }
  }

  // 2. Positive tile category or name match or dimension string pattern
  const tileCategories = [
    'tiles', 'tile', 'granite', 'ceramic', 'terra cotta', 'porcelain tiles',
    'porcelain', 'stone', 'marble', 'slate', 'mosaic'
  ];

  const isTileCategory = tileCategories.some(tCat => cat === tCat || cat.includes(tCat));
  const hasTileName = name.includes('tile') || name.includes('granite') || name.includes('ceramic') || name.includes('porcelain') || name.includes('marble') || name.includes('slate') || name.includes('mosaic');
  const hasTileSize = !!product.size && /^\d+\s*x\s*\d+/i.test(product.size);

  return isTileCategory || hasTileName || hasTileSize;
}

/**
 * Shared mathematical calculation for room area and tile box requirement.
 */
export function calculateTileCoverage(
  roomLengthM: number,
  roomWidthM: number,
  tileLengthCm: number,
  tileWidthCm: number,
  pcsPerBox: number = 4,
  wastagePercent: number = 10
) {
  const length = Math.max(0, roomLengthM || 0);
  const width = Math.max(0, roomWidthM || 0);
  const tLengthM = Math.max(0, (tileLengthCm || 0) / 100);
  const tWidthM = Math.max(0, (tileWidthCm || 0) / 100);
  const boxQty = Math.max(1, pcsPerBox || 1);
  const wasteMultiplier = 1 + Math.max(0, wastagePercent || 0) / 100;

  const areaSqm = Number((length * width).toFixed(2));
  const singleTileArea = tLengthM * tWidthM;

  if (singleTileArea <= 0 || areaSqm <= 0) {
    return {
      areaSqm: 0,
      tilesPlain: 0,
      tilesWithWastage: 0,
      boxesNeeded: 0,
      sqmPerBox: 0
    };
  }

  const tilesPlain = Math.ceil(areaSqm / singleTileArea);
  const tilesWithWastage = Math.ceil(tilesPlain * wasteMultiplier);
  const boxesNeeded = Math.ceil(tilesWithWastage / boxQty);
  const sqmPerBox = Number((singleTileArea * boxQty).toFixed(2));

  return {
    areaSqm,
    tilesPlain,
    tilesWithWastage,
    boxesNeeded,
    sqmPerBox
  };
}
