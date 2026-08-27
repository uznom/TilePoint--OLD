import React from 'react';
import { Database, Download, FileSpreadsheet, MapPin, ShieldCheck, Sliders, Upload } from 'lucide-react';
import { Branch, Product, Supplier, User, UserRole } from '../../types/db';
import { HeroButton } from '../common/ui/HeroButton';
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
  saveFileToBackup: (content: string, filename: string, folder: string, mime: string) => Promise<any>;
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
    <div className="space-y-6 text-left animate-fade-in">
      {/* Tool Header & Mode Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-content1 p-5 rounded-large border border-divider shadow-sm">
        <div>
          <h2 className="text-base font-black text-foreground uppercase tracking-wider flex items-center gap-2">
            <Database className="h-5 w-5 text-success" />
            <span>Migration &amp; Import / Export Tool</span>
          </h2>
        </div>

        {/* Tab Switcher: Import vs Export */}
        <div className="flex bg-content2 p-1 rounded-medium border border-divider shrink-0">
          <HeroButton
            size="sm"
            variant={migrationSubTab === 'import' ? 'solid' : 'light'}
            color={migrationSubTab === 'import' ? 'primary' : 'default'}
            onClick={() => setMigrationSubTab('import')}
            startIcon={<Upload className="h-3.5 w-3.5" />}
            className="text-xs font-black uppercase tracking-wider h-8"
          >
            Import &amp; Migration
          </HeroButton>
          <HeroButton
            size="sm"
            variant={migrationSubTab === 'export' ? 'solid' : 'light'}
            color={migrationSubTab === 'export' ? 'primary' : 'default'}
            onClick={() => setMigrationSubTab('export')}
            startIcon={<Download className="h-3.5 w-3.5" />}
            className="text-xs font-black uppercase tracking-wider h-8"
          >
            Export &amp; Backups
          </HeroButton>
        </div>
      </div>

      {/* MODE 1: IMPORT & MIGRATION */}
      {migrationSubTab === 'import' && (
        <div className="space-y-6 animate-fade-in">
          {/* Target Branch Selection */}
          <div className="p-4 rounded-large bg-content1 border border-divider flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-primary tracking-wider">
              <MapPin className="h-4 w-4" />
              <span>Target Destination Branch Allocation</span>
            </div>
            {currentUser?.role === UserRole.ADMIN ? (
              <select
                value={importTargetBranchId ?? ''}
                onChange={e => setImportTargetBranchId(e.target.value)}
                className="bg-content2 border border-divider px-3 py-2 text-xs font-bold text-foreground rounded-medium focus:outline-none focus:border-primary cursor-pointer max-w-md w-full sm:w-auto"
              >
                {branches.filter(b => !b.isDeleted).map(b => (
                  <option key={b.id} value={b.id}>
                    {getBranchOptionLabel(b)}
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-1.5 text-xs font-bold text-foreground bg-content2 rounded-medium border border-divider flex items-center gap-2">
                <span>{branches.find(b => b.id === (currentUser?.branchAssignmentId || 'B1'))?.name}</span>
                <span className="text-[10px] text-default-500">({currentUser?.branchAssignmentId || 'B1'})</span>
              </div>
            )}
          </div>

          {/* Upload Box & Drag Zone */}
          <div className="bg-content1 p-6 rounded-large border border-divider space-y-4 shadow-sm">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
              <Upload className="h-4 w-4 text-success" />
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
              className="border-2 border-dashed border-divider hover:border-primary p-8 rounded-large text-center cursor-pointer transition-all bg-content2 hover:bg-primary/5 space-y-2 group"
            >
              <input
                id="inventory-import-file-input"
                type="file"
                accept=".csv,.json,text/csv,application/json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Database className="h-8 w-8 text-primary mx-auto group-hover:scale-110 transition-transform" />
              <div className="text-xs font-black text-foreground">Click to Browse or Drag &amp; Drop Catalog Files Here</div>
              <div className="text-[10.5px] text-default-500">Supports .CSV spreadsheet tables and .JSON exports</div>
            </div>
          </div>

          {/* Raw Text Input & Inspector */}
          <div className="bg-content1 p-6 rounded-large border border-divider space-y-4 shadow-sm">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-success" />
                  <span>Pre-Flight Schema &amp; Validation Inspector</span>
                </h3>
              </div>
              <HeroButton
                color="primary"
                onClick={handleRunPreflightManual}
                disabled={!rawImportText.trim() || isAnalyzingPreflight}
                startIcon={<ShieldCheck className="h-4 w-4" />}
                className="text-xs font-black uppercase tracking-wider shadow"
              >
                Run Pre-Flight Inspection
              </HeroButton>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-primary tracking-wider block">Raw Data / Payload Preview</label>
              <textarea
                value={rawImportText ?? ''}
                onChange={(e) => setRawImportText(e.target.value)}
                rows={5}
                placeholder="Paste raw JSON array or CSV text content here..."
                className="w-full bg-content2 border border-divider focus:border-primary p-3.5 text-xs text-foreground rounded-large focus:outline-none transition-colors"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          {/* JSON Export Card */}
          <div className="bg-content1 p-6 rounded-large border border-divider space-y-4 flex flex-col justify-between shadow-sm">
            <div className="space-y-2">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                <span>Export Product Catalog (.JSON)</span>
              </h3>
            </div>
            <div className="pt-2">
              <button
                type="button"
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
                className="w-full py-3 px-4 rounded-medium bg-primary hover:bg-primary/95 text-primary-foreground font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-between shadow-md"
              >
                <span className="flex items-center gap-2"><Download className="h-4 w-4" /> Download JSON Backup</span>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">{branchProducts.length} Items</span>
              </button>
            </div>
          </div>

          {/* CSV Export Card */}
          <div className="bg-content1 p-6 rounded-large border border-divider space-y-4 flex flex-col justify-between shadow-sm">
            <div className="space-y-2">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <Sliders className="h-4 w-4 text-success" />
                <span>Export Inventory CSV Spreadsheet</span>
              </h3>
            </div>
            <div className="pt-2">
              <button
                type="button"
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
                className="w-full py-3 px-4 rounded-medium bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-between shadow-md"
              >
                <span className="flex items-center gap-2"><Download className="h-4 w-4" /> Download CSV Spreadsheet</span>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">.CSV Table</span>
              </button>
            </div>
          </div>

          {/* XLSX Admin Multi-Sheet Workbook Export Card */}
          <div className="bg-content1 p-6 rounded-large border border-emerald-500/30 space-y-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="space-y-2">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-success" />
                <span>Export Admin Excel Workbook (.XLSX)</span>
              </h3>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={async () => {
                  await exportInventoryCatalogToXLSX(products, branches, suppliers);
                  showToast(`Master Admin Inventory exported to Excel (.XLSX) workbook!`);
                }}
                className="w-full py-3 px-4 rounded-medium bg-teal-600 hover:bg-teal-500 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-between shadow-md active:scale-98"
              >
                <span className="flex items-center gap-2"><Download className="h-4 w-4" /> Export Multi-Sheet .XLSX</span>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">Excel .XLSX</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
