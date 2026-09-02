import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const posPath = path.join(__dirname, '..', 'src', 'components', 'PosModule.tsx');
let posContent = fs.readFileSync(posPath, 'utf8').replace(/\r\n/g, '\n');

// 1. Add debouncedSetItem import if missing
if (!posContent.includes('import { debouncedSetItem }')) {
  posContent = posContent.replace(
    "import { formatTin } from '../utils/formatters';",
    "import { formatTin } from '../utils/formatters';\nimport { debouncedSetItem } from '../utils/debouncedStorage';"
  );
}

// 2. Restore pool states at line 353
const poolTarget = '  const [_barcodeAddFeedback, setBarcodeAddFeedback] = useState<string | null>(null);';
const poolReplacement = `  const [selectedPoolBranchId, setSelectedPoolBranchId] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [_barcodeAddFeedback, setBarcodeAddFeedback] = useState<string | null>(null);`;

posContent = posContent.replace(poolTarget, poolReplacement);

// 3. Add matchedBarcodeProducts after barcodeSearchTerm
const barcodeTarget = '  // Barcode quick search/scanner states\n  const [barcodeSearchTerm, setBarcodeSearchTerm] = useState("");';
const barcodeReplacement = `  // Barcode quick search/scanner states
  const [barcodeSearchTerm, setBarcodeSearchTerm] = useState("");

  const matchedBarcodeProducts = React.useMemo(() => {
    const q = barcodeSearchTerm.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(
        (p: Product) =>
          !p.isDeleted &&
          (p.productName.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            (p.barcode && p.barcode.toLowerCase().includes(q)))
      )
      .slice(0, 6);
  }, [products, barcodeSearchTerm]);`;

posContent = posContent.replace(barcodeTarget, barcodeReplacement);

// 4. Optimize cart write-through effects with debouncedSetItem
posContent = posContent.replace(
  '  useEffect(() => {\n  localStorage.setItem("tp_active_cart", JSON.stringify(cart));\n  }, [cart]);',
  '  useEffect(() => {\n    debouncedSetItem("tp_active_cart", cart, 150);\n  }, [cart]);'
);

posContent = posContent.replace(
  '  useEffect(() => {\n  localStorage.setItem("tp_active_customer_name", customerName);\n  }, [customerName]);',
  '  useEffect(() => {\n    debouncedSetItem("tp_active_customer_name", customerName, 200);\n  }, [customerName]);'
);

fs.writeFileSync(posPath, posContent, 'utf8');
console.log('PosModule state and memoization updated successfully!');
