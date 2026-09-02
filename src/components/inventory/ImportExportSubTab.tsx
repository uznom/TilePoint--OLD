import React from 'react';
import { Database, Download, FileSpreadsheet, MapPin, ShieldCheck, Sliders, Upload } from 'lucide-react';
import { Branch, Product, Supplier, User, UserRole } from '../../types/db';
import { HeroButton } from '../common/ui/HeroButton';
import { HeroDropdownSelect } from '../common/ui/HeroDropdown';
import { PreflightReportCard } from '../PreflightReportCard';

interface ImportExportSubTabProps {
  migrationSubTab: 'import' | 'export';
  setMigrationSubTab: (tab: 'import' | 'export') => void;
  currentUser: User | null;
  importTargetBranchId: string;
  setImportTargetBranchId: (id: string) => void;
  branches: Branch[];
  getBranchOptionLabel: (b: Branch) => string;
  handleImportDragOver: (e: React.DragEvent) => void;
  handleImportDragLeave: () => void;
  handleImportDrop: (e: React.DragEvent) => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRunPreflightManual: () => void;
  rawImportText: string;
  setRawImportText: (t: string) => void;
  isAnalyzingPreflight: boolean;
  preflightReport: any;
  executeBulkImport: () => void;
  allowedToImport: boolean;
  products: Product[];
  branchProducts: Product[];
  saveFileToBackup: (content: string, filename: string, folder: 'Database_Backups' | 'Transmittals' | 'Sales_Reports' | 'Inventory_Exports' | 'Archives', mime?: string) => Promise<any>;
  showToast: (msg: string) => void;
  getBranchStockQuantity: (p: Product, bId: string, branchStock: any[], branches: Branch[]) => number;
  selectedViewBranchId: string;
  branchStock: any[];
  suppliers: Supplier[];
  exportInventoryCatalogToXLSX: (products: Product[], branches: Branch[], suppliers: Supplier[]) => Promise<any>;
}

export const ImportExportSubTab: React.FC<ImportExportSubTabProps> = ({
  migrationSubTab,
  setMigrationSubTab,
  currentUser,
  importTargetBranchId,
  setImportTargetBranchId,
  branches,
  getBranchOptionLabel,
  handleImportDragOver,
  handleImportDragLeave,
  handleImportDrop,
  handleFileSelect,
  handleRunPreflightManual,
  rawImportText,
  setRawImportText,
  isAnalyzingPreflight,
  preflightReport,
  executeBulkImport,
  allowedToImport,
  products,
  branchProducts,
  saveFileToBackup,
  showToast,
  getBranchStockQuantity,
  selectedViewBranchId,
  branchStock,
  suppliers,
  exportInventoryCatalogToXLSX,
}) => {
  return (
    <div className="space-y-6 text-left animate-fade-in font-sans text-xs">
      {/* Tool Header & Mode Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/70 dark:border-white/10 shadow-elevation-soft">
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-500" />
            <span>Migration &amp; Import / Export Tool</span>
          </h2>
          <p className="text-xs text-default-500 font-medium mt-0.5">
            Bulk catalog onboarding via CSV/JSON schemas and full enterprise data exports.
          </p>
        </div>

        {/* Tab Switcher: Import vs Export */}
        <div className="flex bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-full border border-zinc-200/50 dark:border-white/5 shrink-0">
          <button
            type="button"
            onClick={() => setMigrationSubTab('import')}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
              migrationSubTab === 'import'
                ? 'bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-bold'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import &amp; Migration</span>
          </button>
          <button
            type="button"
            onClick={() => setMigrationSubTab('export')}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
              migrationSubTab === 'export'
                ? 'bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-bold'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export &amp; Backups</span>
          </button>
        </div>
      </div>

      {/* MODE 1: IMPORT & MIGRATION */}
      {migrationSubTab === 'import' && (
        <div className="space-y-6 animate-fade-in font-sans">
          {/* Target Branch Selection */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-elevation-soft">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground tracking-tight">
              <MapPin className="h-4 w-4 text-primary" />
              <span>Target Destination Branch Allocation</span>
            </div>
            {currentUser?.role === UserRole.ADMIN ? (
              <HeroDropdownSelect
                items={branches.filter(b => !b.isDeleted).map(b => ({
                  key: b.id,
                  label: getBranchOptionLabel(b)
                }))}
                selectedKey={importTargetBranchId ?? ''}
                onSelectionChange={(k) => setImportTargetBranchId(k)}
                size="sm"
                variant="pill"
                className="min-w-[220px]"
              />
            ) : (
              <div className="px-3.5 py-1.5 text-xs font-bold text-foreground bg-zinc-100 dark:bg-zinc-800 rounded-full border border-zinc-200/50 dark:border-white/5 flex items-center gap-2">
                <span>{branches.find(b => b.id === (currentUser?.branchAssignmentId || 'B1'))?.name}</span>
                <span className="text-[10px] text-default-500 font-mono">({currentUser?.branchAssignmentId || 'B1'})</span>
              </div>
            )}
          </div>

          {/* Upload Box & Drag Zone */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/70 dark:border-white/10 space-y-4 shadow-elevation-soft">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Upload className="h-4 w-4 text-emerald-500" />
              <span>Upload CSV / JSON Dataset</span>
            </h3>
            
            <div
              onDragOver={handleImportDragOver}
              onDragLeave={handleImportDragLeave}
              onDrop={handleImportDrop}
              onClick={() => {
                const fileInput = document.getElementById('inventory-import-file-input');
                if (fileInput) fileInput.click();
              }}
              className="border-2 border-dashed border-zinc-200 dark:border-white/10 hover:border-primary p-8 rounded-2xl text-center cursor-pointer transition-all bg-zinc-50 dark:bg-zinc-800/40 hover:bg-primary/5 space-y-2 group"
            >
              <input
                id="inventory-import-file-input"
                type="file"
                accept=".csv,.json,text/csv,application/json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Database className="h-8 w-8 text-primary mx-auto group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-foreground">Click to Browse or Drag &amp; Drop Catalog Files Here</div>
              <div className="text-[11px] text-default-500 font-medium">Supports .CSV spreadsheet tables and .JSON exports</div>
            </div>
          </div>

          {/* Raw Text Input & Inspector */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/70 dark:border-white/10 space-y-4 shadow-elevation-soft">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>Pre-Flight Schema &amp; Validation Inspector</span>
                </h3>
              </div>
              <HeroButton
                color="primary"
                onClick={handleRunPreflightManual}
                disabled={!rawImportText.trim() || isAnalyzingPreflight}
                startIcon={<ShieldCheck className="h-4 w-4" />}
                radius="full"
                className="text-xs font-bold shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
              >
                Run Pre-Flight Inspection
              </HeroButton>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-primary tracking-wider block">Raw Data / Payload Preview</label>
              <textarea
                value={rawImportText ?? ''}
                onChange={(e) => setRawImportText(e.target.value)}
                rows={5}
                placeholder="Paste raw JSON array or CSV text content here..."
                className="w-full bg-zinc-100/90 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-white/5 focus:border-primary p-3.5 text-xs text-foreground rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-mono"
              />
            </div>

            <PreflightReportCard
              report={preflightReport}
              isAnalyzing={isAnalyzingPreflight}
              onRunInspection={handleRunPreflightManual}
              onConfirmCommit={executeBulkImport}
              allowedToImport={allowedToImport}
            />
          </div>
        </div>
      )}

      {/* MODE 2: EXPORT & BACKUPS */}
      {migrationSubTab === 'export' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in font-sans">
          {/* JSON Export Card */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/70 dark:border-white/10 space-y-4 flex flex-col justify-between shadow-elevation-soft">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                <span>Export Product Catalog (.JSON)</span>
              </h3>
              <p className="text-xs text-default-500 font-medium">
                Generates a raw JSON payload containing full catalog items, pricing, and branch records.
              </p>
            </div>
            <div className="pt-2">
              <HeroButton
                type="button"
                color="primary"
                variant="solid"
                radius="full"
                onClick={() => {
                  const jsonStr = JSON.stringify(products, null, 2);
                  const filename = `tilepoint_catalog_export_${new Date().toISOString().slice(0, 10)}.json`;
                  saveFileToBackup(jsonStr, filename, "Inventory_Exports", "application/json")
                    .then((res) => {
                      showToast(`Product catalog JSON backup saved to ${res.path || filename}!`);
                    })
                    .catch(() => {
                      const blob = new Blob([jsonStr], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const downloadAnchor = document.createElement("a");
                      downloadAnchor.setAttribute("href", url);
                      downloadAnchor.setAttribute("download", filename);
                      document.body.appendChild(downloadAnchor);
                      downloadAnchor.click();
                      downloadAnchor.remove();
                      URL.revokeObjectURL(url);
                      showToast("Product catalog JSON backup downloaded!");
                    });
                }}
                className="w-full font-bold text-xs flex items-center justify-between shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
              >
                <span className="flex items-center gap-2"><Download className="h-4 w-4" /> Download JSON Backup</span>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">{branchProducts.length} Items</span>
              </HeroButton>
            </div>
          </div>

          {/* CSV Export Card */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/70 dark:border-white/10 space-y-4 flex flex-col justify-between shadow-elevation-soft">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Sliders className="h-4 w-4 text-emerald-500" />
                <span>Export Inventory CSV Spreadsheet</span>
              </h3>
              <p className="text-xs text-default-500 font-medium">
                Generates a standard CSV spreadsheet with product codes, categories, pricing, and stock levels.
              </p>
            </div>
            <div className="pt-2">
              <HeroButton
                type="button"
                color="success"
                variant="solid"
                radius="full"
                onClick={() => {
                  const csvHeader = "ID,Product Code,Product Name,Category,Brand,Selling Price,Stock Quantity\n";
                  const csvRows = branchProducts.map(p => `"${p.id}","${p.productCode}","${p.productName}","${p.category}","${p.brand}",${p.sellingPrice},${getBranchStockQuantity(p, selectedViewBranchId, branchStock, branches)}`).join("\n");
                  const csvContent = "\uFEFF" + csvHeader + csvRows;
                  const filename = `tilepoint_catalog_${new Date().toISOString().slice(0, 10)}.csv`;

                  saveFileToBackup(csvContent, filename, "Inventory_Exports", "text/csv;charset=utf-8;")
                    .then((res) => {
                      showToast(`Product catalog CSV exported to ${res.path || filename}!`);
                    })
                    .catch(() => {
                      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const downloadAnchor = document.createElement("a");
                      downloadAnchor.setAttribute("href", url);
                      downloadAnchor.setAttribute("download", filename);
                      document.body.appendChild(downloadAnchor);
                      downloadAnchor.click();
                      downloadAnchor.remove();
                      URL.revokeObjectURL(url);
                      showToast("Product catalog CSV exported!");
                    });
                }}
                className="w-full font-bold text-xs flex items-center justify-between text-white shadow-2xs"
              >
                <span className="flex items-center gap-2"><Download className="h-4 w-4" /> Download CSV Spreadsheet</span>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">.CSV Table</span>
              </HeroButton>
            </div>
          </div>

          {/* XLSX Admin Multi-Sheet Workbook Export Card */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-emerald-500/30 space-y-4 flex flex-col justify-between shadow-elevation-soft relative overflow-hidden">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                <span>Export Admin Excel Workbook (.XLSX)</span>
              </h3>
              <p className="text-xs text-default-500 font-medium">
                Full multi-sheet workbook covering catalog, branch stock balances, suppliers, and purchase history.
              </p>
            </div>
            <div className="pt-2">
              <HeroButton
                type="button"
                color="success"
                variant="solid"
                radius="full"
                onClick={async () => {
                  await exportInventoryCatalogToXLSX(products, branches, suppliers);
                  showToast(`Master Admin Inventory exported to Excel (.XLSX) workbook!`);
                }}
                className="w-full font-bold text-xs flex items-center justify-between text-white shadow-2xs"
              >
                <span className="flex items-center gap-2"><Download className="h-4 w-4" /> Export Multi-Sheet .XLSX</span>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">Excel .XLSX</span>
              </HeroButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportExportSubTab;
