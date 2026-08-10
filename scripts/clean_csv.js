import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Universal CSV Sanitizer & Cleaner Engine
 * Handles quotes, commas inside text, corrupt markup percentages (-2147483648%),
 * float precision stock issues, extra web action columns, and normalized pricing.
 */
export function cleanCsvString(rawCsvText) {
  if (!rawCsvText || typeof rawCsvText !== 'string') {
    return { cleanedCsv: '', recordCount: 0 };
  }

  const rawLines = rawCsvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (rawLines.length === 0) return { cleanedCsv: '', recordCount: 0 };

  const parseCsvLine = (line) => {
    const result = [];
    let currentCell = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          currentCell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(currentCell.trim().replace(/^"|"$/g, ''));
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    result.push(currentCell.trim().replace(/^"|"$/g, ''));
    return result;
  };

  const targetHeader = [
    "Location",
    "Barcode",
    "Category",
    "Product",
    "Brand",
    "P Price",
    "MU%",
    "S Price",
    "Stock",
    "UOM",
    "Alert Level",
    "Tax Type"
  ];

  const cleanedRows = [];
  cleanedRows.push(targetHeader.map(h => `"${h}"`).join(','));

  let validRowCount = 0;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const cols = parseCsvLine(line);

    if (i === 0 && cols.length >= 2) {
      const col0 = cols[0].toLowerCase().trim();
      const col1 = cols[1].toLowerCase().trim();
      if (col0 === 'location' || col1 === 'barcode' || col0 === 'tile name') {
        continue;
      }
    }

    if (cols.length < 4) continue;

    const location = (cols[0] || "store").trim();
    const barcode = (cols[1] || "").trim();
    const category = (cols[2] || "UNCATEGORIZED").trim().toUpperCase();
    const product = (cols[3] || "").replace(/\s+/g, ' ').trim();
    const brand = (cols[4] || "").trim();

    const pPriceNum = Math.max(0, parseFloat(cols[5]) || 0);
    const sPriceNum = Math.max(0, parseFloat(cols[7]) || 0);

    let muVal = 0;
    const rawMu = cols[6] || "";
    if (pPriceNum > 0 && sPriceNum >= pPriceNum) {
      muVal = Math.round(((sPriceNum - pPriceNum) / pPriceNum) * 100);
    } else if (rawMu && !rawMu.includes('-214748')) {
      const parsedMu = parseInt(rawMu.replace('%', ''), 10);
      muVal = isNaN(parsedMu) ? 0 : parsedMu;
    }

    const rawStock = parseFloat(cols[8]) || 0;
    const stockStr = Number.isInteger(rawStock) 
      ? rawStock.toString() 
      : parseFloat(rawStock.toFixed(3)).toString();

    const uom = (cols[9] || "PCS").trim().toUpperCase();
    const alertLevel = Math.max(0, parseInt(cols[10], 10) || 0);
    const taxType = (cols[11] || "VAT").trim().toUpperCase();

    const cleanRow = [
      `"${location.replace(/"/g, '""')}"`,
      `"${barcode.replace(/"/g, '""')}"`,
      `"${category.replace(/"/g, '""')}"`,
      `"${product.replace(/"/g, '""')}"`,
      `"${brand.replace(/"/g, '""')}"`,
      `"${pPriceNum.toFixed(2)}"`,
      `"${muVal}%"`,
      `"${sPriceNum.toFixed(2)}"`,
      `"${stockStr}"`,
      `"${uom.replace(/"/g, '""')}"`,
      `"${alertLevel}"`,
      `"${taxType.replace(/"/g, '""')}"`
    ];

    cleanedRows.push(cleanRow.join(','));
    validRowCount++;
  }

  return {
    cleanedCsv: cleanedRows.join('\n'),
    recordCount: validRowCount
  };
}

export function cleanAndSaveCsvFile(inputFilePath, outputFilePath = './cleaned_data.csv') {
  if (!fs.existsSync(inputFilePath)) {
    console.error(`File not found: ${inputFilePath}`);
    return null;
  }
  const rawText = fs.readFileSync(inputFilePath, 'utf-8');
  const result = cleanCsvString(rawText);
  fs.writeFileSync(outputFilePath, result.cleanedCsv, 'utf-8');
  const publicPath = path.join(process.cwd(), 'public', path.basename(outputFilePath));
  fs.writeFileSync(publicPath, result.cleanedCsv, 'utf-8');
  console.log(`Cleaned ${result.recordCount} rows to ${outputFilePath} and ${publicPath}`);
  return result;
}
