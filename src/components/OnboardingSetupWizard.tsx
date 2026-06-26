import React, { useState, useRef } from 'react';
import { useDb } from '../context/DbContext';
import { Sparkles, Database, Upload, Play, CheckCircle, HelpCircle, ArrowRight, Save, Plus, X } from 'lucide-react';
import { Product } from '../types/db';

export const OnboardingSetupWizard: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const db = useDb();
  
  // Local wizard navigation
  // 'welcome' -> 'question' -> 'yes_migrate' | 'no_enter' | 'blank_confirm' | 'configure_branches'
  const [step, setStep] = useState<'welcome' | 'question' | 'yes_migrate' | 'no_enter' | 'blank_confirm' | 'configure_branches'>('welcome');
  const [rawImportText, setRawImportText] = useState('');
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [isDragging, setIsDragging] = useState(false);
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
  
  interface PendingBranch {
    name: string;
    manager: string;
    address: string;
    phone: string;
    isDistributionBranch: boolean;
    staffCount: number;
  }
  const [pendingBranches, setPendingBranches] = useState<PendingBranch[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setRawImportText(text);
        setImportStatus({
          type: 'success',
          message: `Successfully loaded "${file.name}" (${(file.size / 1024).toFixed(1)} KB) - Review items and Migrate!`
        });
      }
    };
    reader.readAsText(file);
  };

  const handleCompleteWithBranches = () => {
    const invalid = pendingBranches.some(b => !b.manager.trim() || !b.address.trim() || !b.phone.trim());
    if (invalid) {
      setImportStatus({
        type: 'error',
        message: 'Please complete all details (Manager, Address, Phone) for each newly detected branch location.'
      });
      return;
    }

    const newBranchesList = pendingBranches.map((b, idx) => ({
      id: `B-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
      name: b.name,
      manager: b.manager,
      address: b.address,
      phone: b.phone,
      monthlySales: 0,
      staffCount: b.staffCount,
      activeCashiers: 1,
      isDistributionBranch: b.isDistributionBranch,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false
    }));

    db.completeOnboarding(pendingProducts, newBranchesList);

    setImportStatus({
      type: 'success',
      message: `Successfully registered ${pendingBranches.length} branches and migrated ${pendingProducts.length} listings!`
    });

    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };
  
  // Single product registration form states
  const [newProdName, setNewProdName] = useState('');
  const [newProdCode, setNewProdCode] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('150');
  const [newProdCost, setNewProdCost] = useState('100');
  const [newProdQty, setNewProdQty] = useState('50');
  const [newProdCategory, setNewProdCategory] = useState('Ceramic Tiles');
  const [newProdBrand, setNewProdBrand] = useState('Generic');

  const handleApplySample = (type: 'json' | 'csv') => {
    if (type === 'json') {
      const sample = [
        {
          "productName": "Heritage White Glazed Porcelain",
          "productCode": "HW-GL-80",
          "skuCode": "SKU-HW-80",
          "barcode": "4801122334455",
          "category": "Porcelain Tiles",
          "brand": "Heritage Slabs",
          "costPrice": 420,
          "sellingPrice": 650,
          "size": "80x80 cm",
          "stockQuantity": 150
        },
        {
          "productName": "EcoSlate Anti-Slip Terracotta",
          "productCode": "ES-AS-30",
          "skuCode": "SKU-ES-30",
          "barcode": "4805566778899",
          "category": "Ceramic Tiles",
          "brand": "EcoStone",
          "costPrice": 180,
          "sellingPrice": 280,
          "size": "30x30 cm",
          "stockQuantity": 320
        }
      ];
      setRawImportText(JSON.stringify(sample, null, 2));
      setImportStatus({ type: 'success', message: 'Sample JSON loaded successfully' });
    } else {
      const sampleCsv = `Product Name,Product Code,SKU,Barcode,Category,Brand,Cost Price,Selling Price,Size,Quantity\n"Heritage White Glazed Porcelain",HW-GL-80,SKU-HW-80,4801122334455,Porcelain Tiles,Heritage Slabs,420,650,80x80 cm,150\n"EcoSlate Anti-Slip Terracotta",ES-AS-30,SKU-ES-30,4805566778899,Ceramic Tiles,EcoStone,180,280,30x30 cm,320`;
      setRawImportText(sampleCsv);
      setImportStatus({ type: 'success', message: 'Sample CSV loaded successfully' });
    }
  };

  const handleImportMigrate = () => {
    const trimmedInput = rawImportText.trim();
    if (!trimmedInput) {
      setImportStatus({ type: 'error', message: 'Please paste CSV rows or JSON data.' });
      return;
    }

    // Reuse the exact same robust CSV parsing engine
    const parseCSV = (text: string): Array<Record<string, any>> => {
      const lines: string[] = [];
      let currentLine = '';
      let insideQuotes = false;
      
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"' || char === "'") {
          insideQuotes = !insideQuotes;
        }
        if ((char === '\r' || char === '\n') && !insideQuotes) {
          if (currentLine.trim()) {
            lines.push(currentLine);
          }
          currentLine = '';
          if (char === '\r' && text[i + 1] === '\n') {
            i++;
          }
        } else {
          currentLine += char;
        }
      }
      if (currentLine.trim()) {
        lines.push(currentLine);
      }

      if (lines.length < 2) {
        throw new Error('CSV must contain a header row and at least one data row.');
      }

      const headerLine = lines[0];
      let delimiter = ',';
      const commaCount = (headerLine.match(/,/g) || []).length;
      const semiCount = (headerLine.match(/;/g) || []).length;
      const tabCount = (headerLine.match(/\t/g) || []).length;
      
      if (semiCount > commaCount && semiCount > tabCount) {
        delimiter = ';';
      } else if (tabCount > commaCount && tabCount > semiCount) {
        delimiter = '\t';
      }

      const splitLine = (line: string): string[] => {
        const result: string[] = [];
        let cell = '';
        let inQuotes = false;
        for (let j = 0; j < line.length; j++) {
          const c = line[j];
          if (c === '"' || c === "'") {
            inQuotes = !inQuotes;
          } else if (c === delimiter && !inQuotes) {
            result.push(cell.trim());
            cell = '';
          } else {
            cell += c;
          }
        }
        result.push(cell.trim());
        return result;
      };

      const headers = splitLine(headerLine).map(h => h.replace(/^["']|["']$/g, '').trim());
      const rows: Array<Record<string, any>> = [];

      for (let k = 1; k < lines.length; k++) {
        const cells = splitLine(lines[k]);
        if (cells.length > 0 && cells.some(c => c)) {
          const rowObj: Record<string, any> = {};
          headers.forEach((header, index) => {
            const val = (cells[index] || '').replace(/^["']|["']$/g, '').trim();
            rowObj[header] = val;
          });
          rows.push(rowObj);
        }
      }

      return rows;
    };

    let parsed: any[] = [];
    try {
      if (trimmedInput.startsWith('[') || trimmedInput.startsWith('{')) {
        const jsonParsed = JSON.parse(trimmedInput);
        parsed = Array.isArray(jsonParsed) ? jsonParsed : [jsonParsed];
      } else {
        const csvRows = parseCSV(trimmedInput);
        const headerMapping: Record<string, string> = {
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
          'p price': 'costPrice',
          'p_price': 'costPrice',
          'purchase price': 'costPrice',
          'selling price': 'sellingPrice',
          'selling_price': 'sellingPrice',
          'selling': 'sellingPrice',
          'price': 'sellingPrice',
          'rate': 'sellingPrice',
          'retail': 'sellingPrice',
          's price': 'sellingPrice',
          's_price': 'sellingPrice',
          'size': 'size',
          'dimensions': 'size',
          'dimension': 'size',
          'stock': 'stockQuantity',
          'quantity': 'stockQuantity',
          'qty': 'stockQuantity',
          'stock quantity': 'stockQuantity',
          'stock_quantity': 'stockQuantity',
          'min stock': 'minimumStock',
          'minimum stock': 'minimumStock',
          'min_stock': 'minimumStock',
          'minimum_stock': 'minimumStock',
          'alert level': 'minimumStock',
          'alert_level': 'minimumStock',
          'design': 'designName',
          'design name': 'designName',
          'design_name': 'designName',
          'supplier': 'supplierId',
          'supplier id': 'supplierId',
          'supplier_id': 'supplierId',
          'unit': 'unit',
          'uom': 'unit',
          'box qty': 'boxQuantity',
          'box quantity': 'boxQuantity',
          'box_quantity': 'boxQuantity',
          'location': 'origin',
          'origin': 'origin'
        };

        parsed = csvRows.map(row => {
          const mappedRow: Record<string, any> = {};
          Object.keys(row).forEach(key => {
            const cleanKey = key.toLowerCase().trim();
            const mappedKey = headerMapping[cleanKey];
            if (mappedKey) {
              const numericFields = ['costPrice', 'sellingPrice', 'stockQuantity', 'minimumStock', 'boxQuantity', 'coveragePerBox'];
              if (numericFields.includes(mappedKey)) {
                const cleanVal = String(row[key]).replace(/[$,₱ ]/g, '').replace(/,/g, '');
                const valNum = parseFloat(cleanVal);
                mappedRow[mappedKey] = isNaN(valNum) ? 0 : valNum;
              } else {
                mappedRow[mappedKey] = row[key];
              }
            } else {
              mappedRow[key] = row[key];
            }
          });
          return mappedRow;
        });
      }

      if (parsed.length > 0) {
        // Build clean Product array with necessary UUID handles & fallback defaults
        const cleanProducts: Product[] = parsed.map((item, idx) => {
          const barcode = item.barcode || `480MIG000${idx + 1}`;
          const brand = item.brand || 'Generic';
          const pName = item.productName || 'Imported Legacy Tile';
          
          // Extrapolate size if not set e.g. from productName "20X30 # SENEPA BEIGE"
          let size = item.size;
          if (!size && pName) {
            const sizeMatch = pName.match(/(\d+(?:\.\d+)?)\s*[xX]\s*(\d+(?:\.\d+)?)/);
            if (sizeMatch) {
              size = `${sizeMatch[1]}x${sizeMatch[2]} cm`;
            }
          }
          if (!size) {
            const catLower = (item.category || '').toLowerCase();
            const isTile = catLower.includes('tile') || catLower.includes('slab') || catLower.includes('stone');
            size = isTile ? '60x60 cm' : 'N/A';
          }

          const productCode = item.productCode || barcode || `PC-MIG-${idx + 1}`;
          const sku = item.sku || (barcode ? `SKU-${barcode}` : `SKU-MIG-${idx + 1}`);

          return {
            id: item.id || `P-IMPORT-${Math.random().toString(36).substring(2, 9)}`,
            productCode,
            sku,
            barcode,
            qrCode: item.qrCode || `URL:MIG-${idx + 1}`,
            designName: item.designName || pName,
            productName: pName,
            category: item.category || 'Porcelain Tiles',
            brand,
            supplierId: item.supplierId || 'S1',
            unit: item.unit || 'PCS',
            size,
            boxQuantity: item.boxQuantity || (size !== 'N/A' ? 4 : 1),
            coveragePerBox: item.coveragePerBox || (size !== 'N/A' ? 1.44 : undefined),
            costPrice: Number(item.costPrice) || 0,
            sellingPrice: Number(item.sellingPrice) || 0,
            stockQuantity: Number(item.stockQuantity) || 0,
            minimumStock: Number(item.minimumStock) || 0,
            origin: item.origin || undefined,
            isDeleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'system-initial',
            updatedBy: 'system-initial'
          };
        });

        // Auto-detect new locations/branches from imported product origin data
        const uniqueLocations = Array.from(new Set(
          cleanProducts.map(p => p.origin?.trim()).filter(Boolean)
        )) as string[];

        const existingBranchNames = (db.branches || []).filter(b => !b.isDeleted).map(b => b.name.toLowerCase().trim());
        const newLocations = uniqueLocations.filter(loc => !existingBranchNames.includes(loc.toLowerCase().trim()));

        if (newLocations.length > 0) {
          setPendingProducts(cleanProducts);
          setPendingBranches(newLocations.map(name => ({
            name,
            manager: 'Operational Branch Manager',
            address: 'Region Branch Site, Dipolog City',
            phone: '+63 920 123 4567',
            isDistributionBranch: false,
            staffCount: 3
          })));
          setStep('configure_branches');
        } else {
          db.completeOnboarding(cleanProducts);
          
          setImportStatus({
            type: 'success',
            message: `Successfully parsed and loaded ${cleanProducts.length} Tile Products. Priming system...`
          });

          setTimeout(() => {
            window.location.reload();
          }, 1200);
        }

      } else {
        setImportStatus({ type: 'error', message: 'No valid records parsed from data payload.' });
      }
    } catch (e: any) {
      setImportStatus({ type: 'error', message: `Migration error: ${e.message || 'Malformed schema'}` });
    }
  };

  const handleRegisterFirstProduct = () => {
    if (!newProdName.trim() || !newProdCode.trim()) {
      setImportStatus({ type: 'error', message: 'Product Name and Code are required to proceed.' });
      return;
    }

    const singleProduct: Product = {
      id: `P-${Math.random().toString(36).substring(2, 9)}`,
      productCode: newProdCode,
      sku: `SKU-${newProdCode}`,
      barcode: `480000${Math.floor(100000 + Math.random() * 900000)}`,
      qrCode: `URL:${newProdCode}`,
      designName: newProdName,
      productName: newProdName,
      category: newProdCategory,
      brand: newProdBrand,
      supplierId: 'S1',
      unit: 'Boxes',
      size: '60x60 cm',
      boxQuantity: 4,
      coveragePerBox: 1.44,
      costPrice: Number(newProdCost) || 100,
      sellingPrice: Number(newProdPrice) || 150,
      stockQuantity: Number(newProdQty) || 50,
      minimumStock: 10,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system-initial',
      updatedBy: 'system-initial'
    };

    db.completeOnboarding([singleProduct]);

    setImportStatus({
      type: 'success',
      message: 'Product registered! Initializing empty transactional logs...'
    });

    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  const handleInitializeFreshBlank = () => {
    db.completeOnboarding([]);
    setImportStatus({
      type: 'success',
      message: 'System cleared and primed with a fresh database context. Launching...'
    });
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md flex items-center justify-center z-[9999] p-4 font-sans select-none text-left">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-[32px] p-6 sm:p-8 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
        
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer z-50 border border-transparent hover:border-slate-700"
            title="Close Setup Wizard"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        
        {/* Wizard Header decor */}
        <div className="absolute top-0 right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* STEP Rendering */}
        {step === 'welcome' && (
          <div className="space-y-6 text-center py-6 animate-fade-in">
            <div className="h-16 w-16 bg-gradient-to-tr from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/15">
              <Sparkles className="h-8 w-8 text-white animate-pulse" />
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 font-mono bg-indigo-500/10 px-3 py-1.5 rounded-full">
                Setup Assistant
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                Welcome to TilePoint POS!
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                Let's configure your workspace database. Get ready to experience tile retail automation, coverage intelligence, and compliant tax registers.
              </p>
            </div>

            <div className="h-px bg-slate-800 max-w-xs mx-auto" />

            <button
              onClick={() => setStep('question')}
              className="py-3 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs tracking-wider uppercase rounded-full shadow-lg shadow-indigo-600/20 active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === 'question' && (
          <div className="space-y-6 animate-fade-in text-slate-100">
            <div className="space-y-2 text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#E2E8F0] font-mono bg-slate-800 px-3 py-1 rounded-full">
                Database Step 1 of 2
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">Do you have an older POS system?</h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                We support automated bulk migration from older cash register exports (pasted CSV or JSON arrays).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <button
                onClick={() => setStep('yes_migrate')}
                className="p-5 bg-gradient-to-br from-indigo-950/40 to-indigo-900/40 border border-indigo-500/20 hover:border-indigo-500/50 rounded-2xl text-left transition-all space-y-3 shadow-md group active:scale-98 cursor-pointer"
              >
                <div className="h-10 w-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">Yes, I want to migrate</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Instantly parse raw spreadsheets or backup files into your TilePoint product catalog catalog.
                  </p>
                </div>
              </button>

              <button
                onClick={() => setStep('no_enter')}
                className="p-5 bg-gradient-to-br from-emerald-950/40 to-emerald-900/40 border border-emerald-500/20 hover:border-emerald-500/50 rounded-2xl text-left transition-all space-y-3 shadow-md group active:scale-98 cursor-pointer"
              >
                <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">No, start brand new</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Start fresh without bulk records. You can enter catalogs one-by-one or launch blank.
                  </p>
                </div>
              </button>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button
                onClick={() => setStep('welcome')}
                className="text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
              >
                Back To Welcome
              </button>
            </div>
          </div>
        )}

        {step === 'yes_migrate' && (
          <div className="space-y-5 animate-fade-in text-left">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-lg font-black uppercase tracking-wider text-indigo-400 flex items-center justify-center sm:justify-start gap-2">
                <Upload className="h-5 w-5" />
                Legacy Product Importer Hub
              </h3>
              <p className="text-xs text-slate-400">
                Paste raw values or click buttons below to load samples and test out the layout!
              </p>
            </div>

            {/* Quick Sample Selectors */}
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              <button
                onClick={() => handleApplySample('json')}
                className="py-1 px-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-md text-[10px] font-mono font-bold uppercase cursor-pointer"
              >
                ⚡ Load JSON Sample
              </button>
              <button
                onClick={() => handleApplySample('csv')}
                className="py-1 px-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-md text-[10px] font-mono font-bold uppercase cursor-pointer"
              >
                📊 Load CSV Sample
              </button>
            </div>

            <div className="space-y-3">
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-2xl text-center space-y-2 transition-all cursor-pointer ${
                  isDragging 
                    ? 'border-indigo-400 bg-indigo-500/10' 
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900/50'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  className="hidden" 
                  accept=".csv,.json,.txt"
                />
                <Upload className="h-6 w-6 text-indigo-400 mx-auto animate-bounce" />
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-200">Drag &amp; Drop Old POS File Here</p>
                  <p className="text-[10px] text-slate-400 mt-1 select-none">
                    Drop your spreadsheet .csv or database backup .json file, or click inside to browse computer
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 pl-1 block">Or Paste Raw Clipboard text below:</span>
                <textarea
                  value={rawImportText}
                  onChange={(e) => setRawImportText(e.target.value)}
                  rows={6}
                  placeholder={`Product Name,Product Code,Cost Price,Selling Price,Quantity,Category\n"Legacy Premium Marble",L-PM-01,150,220,100,"Marble"\n"Eco Slate Tile",E-SL-02,80,130,150,"Porcelain"`}
                  className="w-full bg-slate-950 border border-slate-800 p-3 text-xs font-mono text-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-600 leading-normal"
                />
              </div>
            </div>

            {importStatus.type && (
              <div className={`p-3 rounded-xl border text-xs font-medium ${
                importStatus.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}>
                {importStatus.message}
              </div>
            )}

            <div className="flex flex-wrap gap-3 justify-between items-center pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  setStep('question');
                  setImportStatus({ type: null, message: '' });
                }}
                className="text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleImportMigrate}
                className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[11px] tracking-wider uppercase rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Verify & Migrate Data</span>
              </button>
            </div>
          </div>
        )}

        {step === 'no_enter' && (
          <div className="space-y-5 animate-fade-in text-slate-100">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-lg font-black uppercase tracking-wider text-emerald-400 flex items-center justify-center sm:justify-start gap-2">
                <Plus className="h-5 w-5" />
                Register First Tile Catalog
              </h3>
              <p className="text-xs text-slate-400">
                Register sample tile inventory rows or launch system immediately as a fresh empty terminal.
              </p>
            </div>

            {/* Prompt form for first catalog entry */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono block">Product Name / Design</label>
                <input
                  type="text"
                  placeholder="e.g. Carrara White Porcelain"
                  value={newProdName}
                  onChange={e => setNewProdName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-1.5 text-xs focus:outline-none text-slate-200 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono block">Product System Code</label>
                <input
                  type="text"
                  placeholder="e.g. C-MAR-60"
                  value={newProdCode}
                  onChange={e => setNewProdCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-1.5 text-xs focus:outline-none text-slate-200 transition-colors bg-transparent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono block">Selling Price (PHP)</label>
                <input
                  type="number"
                  placeholder="150"
                  value={newProdPrice}
                  onChange={e => setNewProdPrice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-1.5 text-xs focus:outline-none text-slate-200 transition-colors bg-transparent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono block">Stock Quantity (Boxes)</label>
                <input
                  type="number"
                  placeholder="50"
                  value={newProdQty}
                  onChange={e => setNewProdQty(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-1.5 text-xs focus:outline-none text-slate-200 transition-colors bg-transparent"
                />
              </div>
            </div>

            {importStatus.type && (
              <div className={`p-3 rounded-xl border text-xs font-medium ${
                importStatus.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}>
                {importStatus.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center pt-2">
              <button
                onClick={() => setStep('blank_confirm')}
                className="text-[10px] font-mono text-emerald-400/80 hover:text-emerald-400 underline uppercase tracking-wider block text-left pt-1 font-bold"
              >
                No, Skip this & Start 100% Blank System &rarr;
              </button>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  setStep('question');
                  setImportStatus({ type: null, message: '' });
                }}
                className="text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleRegisterFirstProduct}
                className="py-2 px-4.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] tracking-wider uppercase rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>Initialize Catalog</span>
              </button>
            </div>
          </div>
        )}

        {step === 'blank_confirm' && (
          <div className="space-y-6 animate-fade-in text-center py-4 text-slate-100">
            <div className="h-12 w-12 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto shadow-md">
              <Database className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black uppercase text-white tracking-wide">Confirm Blank Initial System</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                This primes a completely empty database. You won't find any pre-loaded tile products or transaction details. 100% compliant fresh start!
              </p>
            </div>

            <div className="flex justify-center gap-3.5 pt-4">
              <button
                type="button"
                onClick={() => setStep('no_enter')}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] tracking-wider uppercase rounded-xl transition-all cursor-pointer"
              >
                Back
              </button>

              <button
                type="button"
                onClick={handleInitializeFreshBlank}
                className="py-2.5 px-5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-[11px] tracking-wider uppercase rounded-xl shadow-lg shadow-indigo-500/15 transition-all cursor-pointer"
              >
                Launch Empty POS
              </button>
            </div>
          </div>
        )}

        {step === 'configure_branches' && (
          <div className="space-y-5 animate-fade-in text-slate-100 text-left max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-lg font-black uppercase tracking-wider text-amber-400 flex items-center justify-center sm:justify-start gap-2">
                📍 New Branch Outlets Detected!
              </h3>
              <p className="text-xs text-slate-400">
                We found locations in your imported database that are not yet created in TilePoint. Please fill in their operational details to complete the migration:
              </p>
            </div>

            <div className="space-y-4 pt-2">
              {pendingBranches.map((pb, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-900/85 border border-slate-800 space-y-3">
                  <div className="pb-2 border-b border-slate-800 flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                      🏢 Detected Branch {idx + 1}: {pb.name}
                    </span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono font-bold">Import Location</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400 block pl-1">Manager In Charge *</label>
                      <input
                        type="text"
                        value={pb.manager}
                        onChange={(e) => {
                          const updated = [...pendingBranches];
                          updated[idx].manager = e.target.value;
                          setPendingBranches(updated);
                        }}
                        required
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 focus:outline-none text-slate-200 transition-colors"
                        placeholder="e.g. Maria Clara"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400 block pl-1">Branch Contact Number *</label>
                      <input
                        type="text"
                        value={pb.phone}
                        onChange={(e) => {
                          const updated = [...pendingBranches];
                          updated[idx].phone = e.target.value;
                          setPendingBranches(updated);
                        }}
                        required
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 focus:outline-none text-slate-200 transition-colors"
                        placeholder="e.g. +63 920 123 4567"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-bold uppercase text-slate-400 block pl-1">Full Dispatch Address *</label>
                      <input
                        type="text"
                        value={pb.address}
                        onChange={(e) => {
                          const updated = [...pendingBranches];
                          updated[idx].address = e.target.value;
                          setPendingBranches(updated);
                        }}
                        required
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 focus:outline-none text-slate-200 transition-colors"
                        placeholder="e.g. Rizal Ave, Central District, Dipolog Main Branch"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id={`wizard-dist-hub-${idx}`}
                        checked={pb.isDistributionBranch}
                        onChange={(e) => {
                          const updated = [...pendingBranches];
                          updated[idx].isDistributionBranch = e.target.checked;
                          setPendingBranches(updated);
                        }}
                        className="rounded border-slate-800 focus:ring-opacity-50 text-indigo-500"
                      />
                      <label htmlFor={`wizard-dist-hub-${idx}`} className="text-[10px] text-slate-300 font-bold uppercase cursor-pointer select-none">
                        Is Distribution Hub?
                      </label>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <label className="text-[10px] text-slate-300 font-bold uppercase block select-none">
                        Allocated Staff:
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={pb.staffCount}
                        onChange={(e) => {
                          const updated = [...pendingBranches];
                          updated[idx].staffCount = parseInt(e.target.value) || 3;
                          setPendingBranches(updated);
                        }}
                        className="w-16 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-2 py-1 focus:outline-none text-slate-200 transition-colors text-center text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {importStatus.type && (
              <div className={`p-3 rounded-xl border text-xs font-medium ${
                importStatus.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}>
                {importStatus.message}
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  setStep('yes_migrate');
                  setImportStatus({ type: null, message: '' });
                }}
                className="text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
              >
                Back To Upload
              </button>
              <button
                onClick={handleCompleteWithBranches}
                className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[11px] tracking-wider uppercase rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Initialize Branches & Catalog</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
