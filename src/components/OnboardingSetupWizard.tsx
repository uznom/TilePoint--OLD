import React, { useState, useRef } from 'react';
import { useDb } from '../context/DbContext';
import { Sparkles, Upload, CheckCircle, ArrowRight } from 'lucide-react';
import { Product } from '../types/db';
import Papa from 'papaparse';
import { HeroButton, HeroModal } from './common/ui';

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

  return (
    <HeroModal
      isOpen={true}
      onClose={onClose || (() => {})}
      size="2xl"
      zIndex={9999}
      className="p-6 sm:p-8 border border-divider/30 max-h-[90vh] overflow-y-auto text-left select-none"
    >
        {/* Wizard Header decor */}
        <div className="absolute top-0 right-12 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-12 w-40 h-40 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

        {/* STEP Rendering */}
        {step === 'welcome' && (
          <div className="space-y-6 animate-fade-in text-foreground py-2 text-center">
            <div className="space-y-3 text-center">
              <div className="h-14 w-14 bg-primary rounded-2xl flex items-center justify-center mx-auto shadow-[0_2px_12px_rgba(0,111,238,0.3)]">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full font-mono">
                  Setup Assistant
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">
                  Welcome to TilePoint ERP OS!
                </h1>
                <p className="text-xs text-default-500 max-w-md mx-auto leading-relaxed pt-1 font-medium">
                  Your enterprise tile sales, stock inventory, and multi-branch operations platform is ready.
                </p>
              </div>
            </div>

            <div className="pt-4 flex flex-col items-center justify-center gap-3">
              <HeroButton
                type="button"
                disabled={isSubmitting}
                onClick={handleLetsGo}
                color="primary"
                variant="solid"
                size="lg"
                radius="full"
                endIcon={<ArrowRight className="h-4 w-4" />}
                className="py-3 px-10 font-bold text-xs uppercase tracking-wider shadow-[0_2px_8px_rgba(0,111,238,0.25)] font-mono"
              >
                {isSubmitting ? 'Starting...' : "Let's Go"}
              </HeroButton>
              
              <button
                type="button"
                onClick={() => setStep('yes_migrate')}
                className="text-[11px] font-bold text-default-500 hover:text-primary uppercase tracking-wider transition-colors cursor-pointer pt-2 font-mono"
              >
                Import Legacy CSV / JSON Records &rarr;
              </button>
            </div>
          </div>
        )}

        {step === 'yes_migrate' && (
          <div className="space-y-5 animate-fade-in text-left">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-lg font-bold uppercase tracking-wider text-primary flex items-center justify-center sm:justify-start gap-2 font-mono">
                <Upload className="h-5 w-5" />
                Legacy Product Importer Hub
              </h3>
              <p className="text-xs text-default-500 font-medium">
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
                    : 'border-zinc-200/70 dark:border-white/10 hover:border-primary/50 bg-zinc-50 dark:bg-zinc-800/50'
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
                  <p className="text-xs font-bold uppercase tracking-wider text-foreground font-mono">Drag &amp; Drop Old ERP OS File Here</p>
                  <p className="text-[10px] text-default-500 mt-1 select-none font-medium">
                    Drop your spreadsheet .csv or ledger backup .json file, or click inside to browse local files
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-default-500 pl-1 block font-mono">Or Paste Raw Clipboard text below:</span>
                <textarea
                  value={rawImportText ?? ''}
                  onChange={(e) => setRawImportText(e.target.value)}
                  rows={6}
                  placeholder={`Product Name,Product Code,Cost Price,Selling Price,Quantity,Category\n"Legacy Premium Marble",L-PM-01,150,220,100,"Marble"\n"Eco Slate Tile",E-SL-02,80,130,150,"Porcelain"`}
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-white/5 p-3 text-xs text-foreground rounded-2xl focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all placeholder:text-default-400 leading-normal font-mono"
                />
              </div>
            </div>

            {importStatus.type && (
              <div className={`p-3 rounded-2xl border text-xs font-medium ${
                importStatus.type === 'success' 
                  ? 'bg-primary/10 border-primary/20 text-primary' 
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
              }`}>
                {importStatus.message}
              </div>
            )}

            <div className="flex flex-wrap gap-3 justify-between items-center pt-4 border-t border-divider/15">
              <HeroButton
                variant="flat"
                size="sm"
                radius="full"
                onClick={() => {
                  setStep('welcome');
                  setImportStatus({ type: null, message: '' });
                }}
                className="text-[10px] font-bold uppercase tracking-wider font-mono"
              >
                Back
              </HeroButton>
              <HeroButton
                color="primary"
                variant="solid"
                size="md"
                radius="full"
                onClick={handleImportMigrate}
                startIcon={<CheckCircle className="h-4 w-4" />}
                className="font-bold text-[11px] tracking-wider uppercase shadow-[0_2px_8px_rgba(0,111,238,0.25)] font-mono"
              >
                Verify &amp; Migrate Data
              </HeroButton>
            </div>
          </div>
        )}

        {step === 'configure_branches' && (
          <div className="space-y-5 animate-fade-in text-foreground text-left max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-lg font-bold uppercase tracking-wider text-amber-500 flex items-center justify-center sm:justify-start gap-2 font-mono">
                New Branch Outlets Detected!
              </h3>
              <p className="text-xs text-default-500 font-medium">
                We found locations in your imported records that are not yet created in TilePoint. Please fill in their operational details to complete the migration:
              </p>
            </div>

            <div className="space-y-4 pt-2">
              {pendingBranches.map((pb, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-white/5 space-y-3">
                  <div className="pb-2 border-b border-divider/10 flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-500 font-mono">
                      Detected Branch {idx + 1}: {pb.name}
                    </span>
                    <span className="text-[10px] bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded-full font-bold font-mono">Import Location</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-default-500 block pl-1 font-mono">Manager In Charge *</label>
                      <input
                        type="text"
                        value={pb.manager ?? ''}
                        onChange={(e) => {
                          const updated = [...pendingBranches];
                          updated[idx].manager = e.target.value;
                          setPendingBranches(updated);
                        }}
                        required
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-white/5 focus:ring-2 focus:ring-primary/30 rounded-full px-3.5 py-1.5 focus:outline-none text-foreground transition-all"
                        placeholder="Manager name"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-default-500 block pl-1 font-mono">Branch Contact Number *</label>
                      <input
                        type="text"
                        value={pb.phone ?? ''}
                        onChange={(e) => {
                          const updated = [...pendingBranches];
                          updated[idx].phone = e.target.value;
                          setPendingBranches(updated);
                        }}
                        required
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-white/5 focus:ring-2 focus:ring-primary/30 rounded-full px-3.5 py-1.5 focus:outline-none text-foreground transition-all"
                        placeholder="Phone number"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-bold uppercase text-default-500 block pl-1 font-mono">Full Dispatch Address *</label>
                      <input
                        type="text"
                        value={pb.address ?? ''}
                        onChange={(e) => {
                          const updated = [...pendingBranches];
                          updated[idx].address = e.target.value;
                          setPendingBranches(updated);
                        }}
                        required
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-white/5 focus:ring-2 focus:ring-primary/30 rounded-full px-3.5 py-1.5 focus:outline-none text-foreground transition-all"
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
                        className="rounded border-divider text-primary focus:ring-primary cursor-pointer"
                      />
                      <label htmlFor={`wizard-dist-hub-${idx}`} className="text-[10px] text-default-500 font-bold uppercase cursor-pointer select-none font-mono">
                        Is Distribution Hub?
                      </label>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <label className="text-[10px] text-default-500 font-bold uppercase block select-none font-mono">
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
                        className="w-16 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-white/5 focus:ring-2 focus:ring-primary/30 rounded-full px-2 py-1 focus:outline-none text-foreground transition-all text-center text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {importStatus.type && (
              <div className={`p-3 rounded-2xl border text-xs font-medium ${
                importStatus.type === 'success' 
                  ? 'bg-primary/10 border-primary/20 text-primary' 
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
              }`}>
                {importStatus.message}
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-divider/15">
              <HeroButton
                variant="flat"
                size="sm"
                radius="full"
                onClick={() => {
                  setStep('yes_migrate');
                  setImportStatus({ type: null, message: '' });
                }}
                className="text-[10px] font-bold uppercase tracking-wider font-mono"
              >
                Back To Upload
              </HeroButton>
              <HeroButton
                color="primary"
                variant="solid"
                size="md"
                radius="full"
                onClick={handleCompleteWithBranches}
                startIcon={<CheckCircle className="h-4 w-4" />}
                className="font-bold text-[11px] tracking-wider uppercase shadow-[0_2px_8px_rgba(0,111,238,0.25)] font-mono"
              >
                Initialize Branches &amp; Catalog
              </HeroButton>
            </div>
          </div>
        )}

    </HeroModal>
  );
};
