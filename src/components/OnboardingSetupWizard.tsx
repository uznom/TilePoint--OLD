import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDb } from '../context/DbContext';
import { Sparkles, Upload, CheckCircle, ArrowRight, X } from 'lucide-react';
import { Product } from '../types/db';
import Papa from 'papaparse';
import { HeroButton } from './common/ui';

interface OnboardingSetupWizardProps {
  onClose?: () => void;
  onComplete?: () => void;
}

export const OnboardingSetupWizard: React.FC<OnboardingSetupWizardProps> = ({ onClose, onComplete }) => {
  const db = useDb();
  
  // Wizard navigation steps: 'welcome' | 'yes_migrate' | 'configure_branches'
  const [step, setStep] = useState<'welcome' | 'yes_migrate' | 'configure_branches'>('welcome');
  const [rawImportText, setRawImportText] = useState('');
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [isDragging, setIsDragging] = useState(false);
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
    if (file.name.endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/vnd.ms-excel') {
      const rows: Array<Record<string, any>> = [];
      Papa.parse<Record<string, any>>(file, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (h) => h.replace(/^["']|["']$/g, '').trim(),
        chunk: (results) => {
          if (results.data && results.data.length > 0) {
            rows.push(...results.data);
          }
        },
        complete: () => {
          const unparsed = Papa.unparse(rows);
          setRawImportText(unparsed);
          setImportStatus({
            type: 'success',
            message: `Streamed & parsed "${file.name}" (${(file.size / 1024).toFixed(1)} KB) - ${rows.length.toLocaleString()} items ready for review and migration!`
          });
        },
        error: (err) => {
          setImportStatus({
            type: 'error',
            message: `Failed to stream parse CSV file: ${err.message}`
          });
        }
      });
    } else {
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
    }
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
      if (onComplete) {
        onComplete();
      } else if (onClose) {
        onClose();
      } else {
        window.location.reload();
      }
    }, 1200);
  };

  const handleImportMigrate = () => {
    const trimmedInput = rawImportText.trim();
    if (!trimmedInput) {
      setImportStatus({ type: 'error', message: 'Please paste CSV rows or JSON data.' });
      return;
    }

    try {
      let parsed: any[] = [];
      if (trimmedInput.startsWith('[') && trimmedInput.endsWith(']')) {
        parsed = JSON.parse(trimmedInput);
      } else {
        const results = Papa.parse<Record<string, any>>(trimmedInput, {
          header: true,
          skipEmptyLines: 'greedy',
          transformHeader: (h) => h.replace(/^["']|["']$/g, '').trim()
        });
        const csvRows = results.data;
        if (!csvRows || csvRows.length === 0) {
          setImportStatus({ type: 'error', message: 'No valid data rows found in CSV.' });
          return;
        }

        const headerMapping: Record<string, string> = {
          'product name': 'productName',
          'product_name': 'productName',
          'name': 'productName',
          'item name': 'productName',
          'title': 'productName',
          'description': 'productName',
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
        const cleanProducts: Product[] = parsed.map((item, idx) => {
          const barcode = item.barcode || `480MIG000${idx + 1}`;
          const brand = item.brand || 'Generic';
          const pName = item.productName || 'Imported Legacy Tile';
          
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
            unit: item.unit || 'Unit',
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
            address: 'Regional Branch Site, Main City',
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
            if (onComplete) {
              onComplete();
            } else if (onClose) {
              onClose();
            } else {
              window.location.reload();
            }
          }, 1200);
        }

      } else {
        setImportStatus({ type: 'error', message: 'No valid records parsed from data payload.' });
      }
    } catch (e: any) {
      setImportStatus({ type: 'error', message: `Migration error: ${e.message || 'Malformed schema'}` });
    }
  };

  const handleLetsGo = async () => {
    setIsSubmitting(true);
    try {
      localStorage.setItem('tilepoint_onboarded_setup', 'true');
      localStorage.setItem('tp_is_configured', 'true');
      localStorage.setItem('tp_first_login_done', 'true');
      await db.completeOnboarding();
      if (onComplete) {
        onComplete();
      } else if (onClose) {
        onClose();
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.warn('[Onboarding] Error completing onboarding:', err);
      if (onComplete) {
        onComplete();
      } else if (onClose) {
        onClose();
      } else {
        window.location.reload();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 font-sans select-none text-left animate-fade-in">
      {/* Full-Screen Uniform Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />
      <div className="relative w-full max-w-2xl bg-content1 border border-divider/30 rounded-2xl p-6 sm:p-8 shadow-2xl text-foreground max-h-[90vh] overflow-y-auto z-10">
        
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-content2 text-default-500 hover:text-white transition-all cursor-pointer z-50 border border-transparent hover:border-slate-700"
            title="Close Setup Wizard"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        
        {/* Wizard Header decor */}
        <div className="absolute top-0 right-12 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-12 w-40 h-40 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

        {/* STEP Rendering */}
        {step === 'welcome' && (
          <div className="space-y-6 animate-fade-in text-foreground py-2">
            <div className="space-y-3 text-center">
              <div className="h-14 w-14 bg-primary rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-primary/25/15">
                <Sparkles className="h-7 w-7 text-white animate-pulse" />
              </div>
              <div className="space-y-1.5">
 <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                  Setup Assistant
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  Welcome to TilePoint ERP OS!
                </h1>
                <p className="text-xs text-default-500 max-w-md mx-auto leading-relaxed pt-1">
                  Your enterprise tile sales, stock inventory, and multi-branch operations platform is ready.
                </p>
              </div>
            </div>

            <div className="pt-4 flex flex-col items-center justify-center gap-3">
              <HeroButton
                type="button"
                disabled={isSubmitting}
                onClick={handleLetsGo}
                variant="primary"
                size="lg"
                endIcon={<ArrowRight className="h-4 w-4" />}
                className="py-3.5 px-10 font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/25/25"
              >
                {isSubmitting ? 'Starting...' : "Let's Go"}
              </HeroButton>
              
              <button
                type="button"
                onClick={() => setStep('yes_migrate')}
                className="text-[11px] font-bold text-default-500 hover:text-primary uppercase tracking-wider transition-colors cursor-pointer pt-2"
              >
                Import Legacy CSV / JSON Records &rarr;
              </button>
            </div>
          </div>
        )}

        {step === 'yes_migrate' && (
          <div className="space-y-5 animate-fade-in text-left">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-lg font-black uppercase tracking-wider text-primary flex items-center justify-center sm:justify-start gap-2">
                <Upload className="h-5 w-5" />
                Legacy Product Importer Hub
              </h3>
              <p className="text-xs text-default-500">
                Paste raw values or drag &amp; drop files to import into the catalog!
              </p>
            </div>

            <div className="space-y-3">
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-2xl text-center space-y-2 transition-all cursor-pointer ${
                  isDragging 
                    ? 'border-primary bg-primary/10' 
                    : 'border-divider hover:border-slate-700 bg-content1/50'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  className="hidden" 
                  accept=".csv,.json,.txt"
                />
                <Upload className="h-6 w-6 text-primary mx-auto animate-bounce" />
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-foreground">Drag &amp; Drop Old ERP OS File Here</p>
                  <p className="text-[10px] text-default-500 mt-1 select-none">
                    Drop your spreadsheet .csv or ledger backup .json file, or click inside to browse local files
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 pl-1 block">Or Paste Raw Clipboard text below:</span>
                <textarea
                  value={rawImportText ?? ''}
                  onChange={(e) => setRawImportText(e.target.value)}
                  rows={6}
                  placeholder={`Product Name,Product Code,Cost Price,Selling Price,Quantity,Category\n"Legacy Premium Marble",L-PM-01,150,220,100,"Marble"\n"Eco Slate Tile",E-SL-02,80,130,150,"Porcelain"`}
 className="w-full bg-background border border-divider p-3 text-xs text-foreground rounded-xl focus:border-primary focus:outline-none transition-all placeholder:text-slate-600 leading-normal"
                />
              </div>
            </div>

            {importStatus.type && (
              <div className={`p-3 rounded-xl border text-xs font-medium ${
                importStatus.type === 'success' 
                  ? 'bg-primary/10 border-primary/20 text-primary' 
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}>
                {importStatus.message}
              </div>
            )}

            <div className="flex flex-wrap gap-3 justify-between items-center pt-4 border-t border-divider">
              <HeroButton
                variant="flat"
                size="sm"
                onClick={() => {
                  setStep('welcome');
                  setImportStatus({ type: null, message: '' });
                }}
                className="text-[10px] font-bold uppercase tracking-wider"
              >
                Back
              </HeroButton>
              <HeroButton
                variant="primary"
                size="md"
                onClick={handleImportMigrate}
                startIcon={<CheckCircle className="h-4 w-4" />}
                className="font-extrabold text-[11px] tracking-wider uppercase rounded-xl shadow-md"
              >
                Verify &amp; Migrate Data
              </HeroButton>
            </div>
          </div>
        )}

        {step === 'configure_branches' && (
          <div className="space-y-5 animate-fade-in text-foreground text-left max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-lg font-black uppercase tracking-wider text-amber-400 flex items-center justify-center sm:justify-start gap-2">
                New Branch Outlets Detected!
              </h3>
              <p className="text-xs text-default-500">
                We found locations in your imported records that are not yet created in TilePoint. Please fill in their operational details to complete the migration:
              </p>
            </div>

            <div className="space-y-4 pt-2">
              {pendingBranches.map((pb, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-content1/85 border border-divider space-y-3">
                  <div className="pb-2 border-b border-divider flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                      Detected Branch {idx + 1}: {pb.name}
                    </span>
 <span className="text-[10px] bg-content2 text-default-500 px-2 py-0.5 rounded font-bold">Import Location</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-default-500 block pl-1">Manager In Charge *</label>
                      <input
                        type="text"
                        value={pb.manager ?? ''}
                        onChange={(e) => {
                          const updated = [...pendingBranches];
                          updated[idx].manager = e.target.value;
                          setPendingBranches(updated);
                        }}
                        required
                        className="w-full bg-background border border-divider focus:border-primary rounded-xl px-3 py-2 focus:outline-none text-foreground transition-colors"
                        placeholder="Manager name"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-default-500 block pl-1">Branch Contact Number *</label>
                      <input
                        type="text"
                        value={pb.phone ?? ''}
                        onChange={(e) => {
                          const updated = [...pendingBranches];
                          updated[idx].phone = e.target.value;
                          setPendingBranches(updated);
                        }}
                        required
                        className="w-full bg-background border border-divider focus:border-primary rounded-xl px-3 py-2 focus:outline-none text-foreground transition-colors"
                        placeholder="Phone number"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-bold uppercase text-default-500 block pl-1">Full Dispatch Address *</label>
                      <input
                        type="text"
                        value={pb.address ?? ''}
                        onChange={(e) => {
                          const updated = [...pendingBranches];
                          updated[idx].address = e.target.value;
                          setPendingBranches(updated);
                        }}
                        required
                        className="w-full bg-background border border-divider focus:border-primary rounded-xl px-3 py-2 focus:outline-none text-foreground transition-colors"
                        placeholder="Street, District, City"
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
                        className="rounded border-divider focus:ring-opacity-50 text-primary"
                      />
                      <label htmlFor={`wizard-dist-hub-${idx}`} className="text-[10px] text-default-500 font-bold uppercase cursor-pointer select-none">
                        Is Distribution Hub?
                      </label>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <label className="text-[10px] text-default-500 font-bold uppercase block select-none">
                        Allocated Staff:
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={pb.staffCount ?? ''}
                        onChange={(e) => {
                          const updated = [...pendingBranches];
                          updated[idx].staffCount = parseInt(e.target.value) || 3;
                          setPendingBranches(updated);
                        }}
 className="w-16 bg-background border border-divider focus:border-primary rounded-xl px-2 py-1 focus:outline-none text-foreground transition-colors text-center text-xs "
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {importStatus.type && (
              <div className={`p-3 rounded-xl border text-xs font-medium ${
                importStatus.type === 'success' 
                  ? 'bg-primary/10 border-primary/20 text-primary' 
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}>
                {importStatus.message}
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-divider">
              <HeroButton
                variant="flat"
                size="sm"
                onClick={() => {
                  setStep('yes_migrate');
                  setImportStatus({ type: null, message: '' });
                }}
                className="text-[10px] font-bold uppercase tracking-wider"
              >
                Back To Upload
              </HeroButton>
              <HeroButton
                variant="primary"
                size="md"
                onClick={handleCompleteWithBranches}
                startIcon={<CheckCircle className="h-4 w-4" />}
                className="font-extrabold text-[11px] tracking-wider uppercase rounded-xl shadow-md"
              >
                Initialize Branches &amp; Catalog
              </HeroButton>
            </div>
          </div>
        )}

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};
