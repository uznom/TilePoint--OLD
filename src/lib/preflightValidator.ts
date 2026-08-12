import { Branch, Product } from '../types/db';
import { verifyAndUnwrapBackup } from './fileBackupHelper';
import { generateEan13Barcode } from '../utils/barcodeGenerator';
import Papa from 'papaparse';

export interface PreflightBranchMatch {
  branchIdOrName: string;
  systemBranchMatch: { id: string; name: string; isDistributionBranch?: boolean } | null;
  isCompatible: boolean;
  statusText: string;
}

export interface PreflightReport {
  status: 'PASS' | 'WARNING' | 'FAIL';
  formatDetected: string;
  isSealedBackup: boolean;
  isSignatureValid: boolean;
  totalRecordsCount: number;
  validRecordsCount: number;
  invalidRecordsCount: number;
  detectedBranches: PreflightBranchMatch[];
  validationIssues: string[];
  validationWarnings: string[];
  dataImpact: {
    newProductsCount: number;
    existingProductsToUpdateCount: number;
    unmappedBranchCount: number;
    estimatedAssetValuePhp: number;
  };
  parsedProducts?: any[];
  parsedFullSnapshot?: any;
}

/**
 * Parses raw CSV text into array of row objects using PapaParse
 */
function parseCSVRows(text: string): Array<Record<string, any>> {
  const result = Papa.parse<Record<string, any>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.replace(/^["']|["']$/g, '').trim(),
  });

  if ((!result.data || result.data.length === 0) && result.errors && result.errors.length > 0) {
    throw new Error(`CSV Parsing error: ${result.errors[0].message}`);
  }

  return (result.data || []).map(row => {
    const cleanRow: Record<string, any> = {};
    Object.keys(row).forEach(k => {
      const val = row[k];
      cleanRow[k] = typeof val === 'string' ? val.replace(/^["']|["']$/g, '').trim() : val;
    });
    return cleanRow;
  });
}

const HEADER_MAPPINGS: Record<string, string> = {
  'product name': 'productName',
  'product_name': 'productName',
  'name': 'productName',
  'tile name': 'productName',
  'tile': 'productName',
  'item name': 'productName',
  'product': 'productName',
  'product code': 'productCode',
  'product_code': 'productCode',
  'code': 'productCode',
  'item code': 'productCode',
  'sku': 'sku',
  'sku code': 'sku',
  'sku_code': 'sku',
  'skucode': 'sku',
  'barcode': 'barcode',
  'bar code': 'barcode',
  'bar_code': 'barcode',
  'category': 'category',
  'cat': 'category',
  'group': 'category',
  'brand': 'brand',
  'brand_name': 'brand',
  'manufacturer': 'brand',
  'cost': 'costPrice',
  'cost price': 'costPrice',
  'cost_price': 'costPrice',
  'purchase price': 'costPrice',
  'p price': 'costPrice',
  'p_price': 'costPrice',
  'p. price': 'costPrice',
  'p.price': 'costPrice',
  'selling price': 'sellingPrice',
  'selling_price': 'sellingPrice',
  'selling': 'sellingPrice',
  'price': 'sellingPrice',
  'rate': 'sellingPrice',
  'retail': 'sellingPrice',
  's price': 'sellingPrice',
  's_price': 'sellingPrice',
  's. price': 'sellingPrice',
  's.price': 'sellingPrice',
  'size': 'size',
  'dimensions': 'size',
  'stock': 'stockQuantity',
  'quantity': 'stockQuantity',
  'qty': 'stockQuantity',
  'stock quantity': 'stockQuantity',
  'stock_quantity': 'stockQuantity',
  'min stock': 'minimumStock',
  'minimum stock': 'minimumStock',
  'alert level': 'minimumStock',
  'alert_level': 'minimumStock',
  'unit': 'unit',
  'uom': 'unit',
  'unit of measurement': 'unit',
  'unit of measure': 'unit',
  'unit_of_measurement': 'unit',
  'unit_of_measure': 'unit',
  'unit type': 'unit',
  'unit_type': 'unit',
  'uom unit': 'unit',
  'uom_unit': 'unit',
  'unit name': 'unit',
  'unitname': 'unit',
  'box qty': 'boxQuantity',
  'box quantity': 'boxQuantity',
  'mu%': 'markupPercent',
  'mu': 'markupPercent',
  'markup': 'markupPercent',
  'markup %': 'markupPercent',
  'markup_percent': 'markupPercent',
  'tax type': 'taxType',
  'tax_type': 'taxType',
  'origin': 'origin',
  'location': 'origin',
  'branch': 'origin',
  'branch id': 'origin',
  'branch_id': 'origin',
  'originbranchid': 'origin',
};

/**
 * Pre-flight schema validation for JSON/CSV imports and migrations
 */
export async function runPreflightValidation(
  rawText: string,
  targetBranchId: string,
  systemBranches: Branch[],
  existingProducts: Product[],
  currentUserRole?: string
): Promise<PreflightReport> {
  const validationIssues: string[] = [];
  const validationWarnings: string[] = [];
  let formatDetected = 'Unknown Format';
  let isSealedBackup = false;
  let isSignatureValid = false;
  let parsedPayload: any = null;
  let rawProductsList: any[] = [];
  let parsedFullSnapshot: any = null;

  const trimmed = (rawText || '').trim();

  if (!trimmed) {
    return {
      status: 'FAIL',
      formatDetected: 'Empty Input',
      isSealedBackup: false,
      isSignatureValid: false,
      totalRecordsCount: 0,
      validRecordsCount: 0,
      invalidRecordsCount: 0,
      detectedBranches: [],
      validationIssues: ['Pre-flight Error: Please input or upload valid JSON or CSV data.'],
      validationWarnings: [],
      dataImpact: {
        newProductsCount: 0,
        existingProductsToUpdateCount: 0,
        unmappedBranchCount: 0,
        estimatedAssetValuePhp: 0,
      },
    };
  }

  // 1. Try Sealed Backup / JSON Parsing
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      // Test if cryptographically sealed backup
      if (trimmed.includes('_tilepoint_backup') || trimmed.includes('signature')) {
        isSealedBackup = true;
        try {
          const unwrapped = await verifyAndUnwrapBackup(trimmed);
          isSignatureValid = true;
          parsedPayload = unwrapped;
        } catch (sealErr: any) {
          isSignatureValid = false;
          validationIssues.push(`Cryptographic Seal Fault: ${sealErr.message || 'Signature check failed. File may be edited or corrupted.'}`);
        }
      }

      if (!parsedPayload) {
        parsedPayload = JSON.parse(trimmed);
      }

      // Identify structure
      if (parsedPayload && typeof parsedPayload === 'object') {
        if ('products' in parsedPayload && 'branches' in parsedPayload && 'users' in parsedPayload) {
          formatDetected = isSealedBackup
            ? 'Full Database Snapshot (Sealed JSON)'
            : 'Full Database Snapshot (Standard JSON)';
          parsedFullSnapshot = parsedPayload;
          rawProductsList = Array.isArray(parsedPayload.products) ? parsedPayload.products : [];
        } else if ('inventoryCounts' in parsedPayload && Array.isArray(parsedPayload.inventoryCounts)) {
          formatDetected = 'StockTally Catalog (JSON)';
          const origin = parsedPayload.exportMeta?.originBranchId || targetBranchId;
          rawProductsList = parsedPayload.inventoryCounts.map((item: any, i: number) => ({
            id: item.id || `P-IMPORT-${Date.now()}-${i}`,
            productName: item.productName || item.name,
            productCode: item.productCode || item.code || item.barcode,
            barcode: item.barcode || generateEan13Barcode(),
            category: item.category,
            brand: item.brand,
            costPrice: item.pricing?.costPrice ?? item.costPrice ?? 0,
            sellingPrice: item.pricing?.sellingPrice ?? item.sellingPrice ?? 0,
            stockQuantity: item.stock?.stockQuantity ?? item.stockQuantity ?? 0,
            size: item.size,
            unit: item.uom || item.unit || 'Unit',
            origin: origin || item.origin,
          }));
        } else if (Array.isArray(parsedPayload)) {
          formatDetected = 'Product Catalog Array (JSON)';
          rawProductsList = parsedPayload;
        } else {
          formatDetected = 'Single Record Object (JSON)';
          rawProductsList = [parsedPayload];
        }
      }
    } catch (jsonErr: any) {
      if (isSealedBackup) {
        validationIssues.push(`JSON Structural Error: Malformed sealed backup contents (${jsonErr.message}).`);
      } else {
        // Fallback to CSV if start braces are misleading or fail
        validationWarnings.push(`JSON parse attempted but failed (${jsonErr.message}). Checking CSV fallback...`);
      }
    }
  }

  // 2. CSV Fallback if JSON parsing did not produce rawProductsList
  if (rawProductsList.length === 0 && validationIssues.length === 0) {
    try {
      const csvRows = parseCSVRows(trimmed);
      formatDetected = 'CSV Table Roster';

      if (csvRows.length > 0) {
        // Critical Column Header Validation
        const rawHeaders = Object.keys(csvRows[0]);
        const mappedHeaderKeys = new Set<string>();
        rawHeaders.forEach(h => {
          const cleanH = h.toLowerCase().trim();
          const mapped = HEADER_MAPPINGS[cleanH];
          if (mapped) mappedHeaderKeys.add(mapped);
        });

        const hasIdentifierHeader = ['productName', 'productCode', 'sku', 'barcode'].some(k => mappedHeaderKeys.has(k));
        const hasPricingOrStockHeader = ['costPrice', 'sellingPrice', 'stockQuantity', 'category', 'unit'].some(k => mappedHeaderKeys.has(k));

        if (!hasIdentifierHeader) {
          validationIssues.push(
            `CSV Header Error: Missing critical product identifier column (e.g. 'Product Name', 'Product Code', 'SKU', 'Barcode'). Found headers: [${rawHeaders.slice(0, 8).join(', ')}]`
          );
        }

        if (!hasPricingOrStockHeader) {
          validationWarnings.push(
            `CSV Header Warning: Missing standard pricing ('Cost Price', 'Selling Price') or stock ('Stock Quantity') columns. Missing fields will default to 0.`
          );
        }
      }

      rawProductsList = csvRows.map((row) => {
        const mappedRow: Record<string, any> = {};
        Object.keys(row).forEach((key) => {
          const cleanKey = key.toLowerCase().trim();
          const mappedKey = HEADER_MAPPINGS[cleanKey];
          if (mappedKey) {
            const numericFields = ['costPrice', 'sellingPrice', 'stockQuantity', 'minimumStock', 'boxQuantity', 'markupPercent'];
            if (numericFields.includes(mappedKey)) {
              const rawValStr = String(row[key] ?? '').trim();
              const cleanVal = rawValStr.replace(/[$,₱ %]/g, '').replace(/,/g, '');
              const valNum = parseFloat(cleanVal);
              mappedRow[`_raw_${mappedKey}`] = rawValStr;
              mappedRow[mappedKey] = isNaN(valNum) ? 0 : valNum;
              mappedRow[`_isInvalidNum_${mappedKey}`] = rawValStr !== '' && isNaN(valNum);
            } else {
              mappedRow[mappedKey] = row[key];
            }
          } else {
            mappedRow[key] = row[key];
          }
        });
        return mappedRow;
      });
    } catch (csvErr: any) {
      validationIssues.push(`CSV Parsing Failure: ${csvErr.message || 'Layout or header row invalid.'}`);
    }
  }

  // 3. Evaluate Record Integrity and Data Types
  const totalRecordsCount = rawProductsList.length;
  let validRecordsCount = 0;
  let invalidRecordsCount = 0;

  if (totalRecordsCount === 0 && validationIssues.length === 0) {
    validationIssues.push('Schema Error: Zero valid records found in payload.');
  }

  rawProductsList.forEach((item, index) => {
    const pName = item.productName || item.name || item.tileName || item.title || item.productCode || item.sku;
    let recordHasError = false;

    if (!pName || String(pName).trim() === '') {
      recordHasError = true;
      if (validationIssues.length < 8) {
        validationIssues.push(`Record #${index + 1}: Missing mandatory product name / identifier.`);
      }
    }

    // Data type validation for numeric fields
    const numericFields = [
      { key: 'costPrice', label: 'Cost Price' },
      { key: 'sellingPrice', label: 'Selling Price' },
      { key: 'stockQuantity', label: 'Stock Quantity' },
      { key: 'minimumStock', label: 'Minimum Stock' },
      { key: 'boxQuantity', label: 'Box Quantity' },
      { key: 'markupPercent', label: 'Markup %' }
    ];

    numericFields.forEach(({ key, label }) => {
      if (item[`_isInvalidNum_${key}`]) {
        recordHasError = true;
        if (validationIssues.length < 12) {
          validationIssues.push(`Record #${index + 1} (${pName || 'Unnamed'}): Invalid data type for '${label}' - expected numeric value, found '${item[`_raw_${key}`]}'.`);
        }
      } else if (typeof item[key] === 'number' && item[key] < 0 && ['costPrice', 'sellingPrice', 'stockQuantity'].includes(key)) {
        recordHasError = true;
        if (validationIssues.length < 12) {
          validationIssues.push(`Record #${index + 1} (${pName || 'Unnamed'}): Incompatible value for '${label}' - cannot be negative (${item[key]}).`);
        }
      }
    });

    if (recordHasError) {
      invalidRecordsCount++;
    } else {
      validRecordsCount++;
    }
  });

  // 4. Evaluate Branch Compatibility
  const rawBranchRefs = new Set<string>();

  // Extract from full snapshot
  if (parsedFullSnapshot && Array.isArray(parsedFullSnapshot.branches)) {
    parsedFullSnapshot.branches.forEach((b: any) => {
      if (b.id) rawBranchRefs.add(String(b.id));
      if (b.name) rawBranchRefs.add(String(b.name));
    });
  }

  // Extract from product records
  let itemsHaveExplicitOrigin = false;
  rawProductsList.forEach((item) => {
    const loc = item.origin || item.location || item.branchId || item.targetBranchId;
    if (loc && String(loc).trim()) {
      rawBranchRefs.add(String(loc).trim());
      itemsHaveExplicitOrigin = true;
    }
  });

  // Only include targetBranchId if items in rawProductsList don't have explicit origins
  if (targetBranchId && !itemsHaveExplicitOrigin) {
    rawBranchRefs.add(targetBranchId);
  }

  const activeSystemBranches = systemBranches.filter((b) => !b.isDeleted);
  const systemBranchMap = new Map<string, Branch>();

  activeSystemBranches.forEach((b) => {
    systemBranchMap.set(b.id.toLowerCase().trim(), b);
    systemBranchMap.set(b.name.toLowerCase().trim(), b);
    if (b.branchCode) systemBranchMap.set(b.branchCode.toLowerCase().trim(), b);
  });

  const detectedBranches: PreflightBranchMatch[] = [];
  let unmappedBranchCount = 0;

  Array.from(rawBranchRefs).forEach((ref) => {
    const cleanRef = ref.toLowerCase().trim();
    const match = systemBranchMap.get(cleanRef);

    if (match) {
      detectedBranches.push({
        branchIdOrName: ref,
        systemBranchMatch: { id: match.id, name: match.name, isDistributionBranch: match.isDistributionBranch },
        isCompatible: true,
        statusText: `Matched: ${match.name} (${match.id})`,
      });
    } else {
      unmappedBranchCount++;
      detectedBranches.push({
        branchIdOrName: ref,
        systemBranchMatch: null,
        isCompatible: false,
        statusText: `Unregistered branch '${ref}': Requires auto-registration or target branch mapping`,
      });
      validationWarnings.push(`Branch Compatibility Alert: Branch location '${ref}' is not registered in current DB.`);
    }
  });

  // Target branch RBAC check
  if (targetBranchId) {
    const targetMatch = activeSystemBranches.find((b) => b.id === targetBranchId);
    if (!targetMatch) {
      validationWarnings.push(`Target Branch Warning: Specified target branch ID '${targetBranchId}' not found.`);
    } else if (currentUserRole && currentUserRole !== 'Admin') {
      // Non-admin notice
      validationWarnings.push(`Non-Admin Scope: Import target assigned to local branch ${targetMatch.name}.`);
    }
  }

  // 5. Data Impact Calculation
  const existingCodeSet = new Set(existingProducts.map((p) => p.productCode.toLowerCase().trim()));
  const existingNameSet = new Set(existingProducts.map((p) => p.productName.toLowerCase().trim()));

  let newProductsCount = 0;
  let existingProductsToUpdateCount = 0;
  let estimatedAssetValuePhp = 0;

  rawProductsList.forEach((item) => {
    const code = (item.productCode || item.code || item.barcode || '').toLowerCase().trim();
    const name = (item.productName || item.name || '').toLowerCase().trim();

    if ((code && existingCodeSet.has(code)) || (name && existingNameSet.has(name))) {
      existingProductsToUpdateCount++;
    } else {
      newProductsCount++;
    }

    const price = Number(item.sellingPrice || item.costPrice || 0);
    const qty = Number(item.stockQuantity || item.stock || 1);
    estimatedAssetValuePhp += isNaN(price * qty) ? 0 : price * qty;
  });

  // 6. Decide Final Pre-Flight Status
  let status: 'PASS' | 'WARNING' | 'FAIL' = 'PASS';

  if (validationIssues.length > 0 || (isSealedBackup && !isSignatureValid) || validRecordsCount === 0) {
    status = 'FAIL';
  } else if (unmappedBranchCount > 0 || validationWarnings.length > 0 || invalidRecordsCount > 0) {
    status = 'WARNING';
  }

  return {
    status,
    formatDetected,
    isSealedBackup,
    isSignatureValid,
    totalRecordsCount,
    validRecordsCount,
    invalidRecordsCount,
    detectedBranches,
    validationIssues,
    validationWarnings,
    dataImpact: {
      newProductsCount,
      existingProductsToUpdateCount,
      unmappedBranchCount,
      estimatedAssetValuePhp,
    },
    parsedProducts: rawProductsList,
    parsedFullSnapshot,
  };
}
