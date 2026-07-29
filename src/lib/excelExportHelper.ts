import * as XLSX from 'xlsx';
import { saveFileToBackup } from './fileBackupHelper';

export interface SheetData {
  sheetName: string;
  data: any[];
  headers?: string[];
}

/**
 * TilePoint Excel (.xlsx) Export Utility
 * Generates formatted multi-sheet Microsoft Excel (.xlsx) workbooks for Admin reporting.
 */
export async function exportToXLSX(
  sheets: SheetData[],
  filename: string,
  category: 'Inventory_Exports' | 'Sales_Reports' | 'Transmittals' | 'Database_Backups' = 'Inventory_Exports'
): Promise<{ success: boolean; path: string }> {
  try {
    const wb = XLSX.utils.book_new();

    sheets.forEach(({ sheetName, data, headers }) => {
      let ws: any;
      if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
        // Array of Arrays
        ws = XLSX.utils.aoa_to_sheet(data);
      } else if (Array.isArray(data) && data.length > 0) {
        // Array of Objects
        ws = XLSX.utils.json_to_sheet(data, headers ? { header: headers } : undefined);
      } else {
        ws = XLSX.utils.aoa_to_sheet([["No Records Found"]]);
      }
      
      // Clean sheet name (max 31 characters, remove invalid chars)
      const cleanSheetName = sheetName.replace(/[\\/?*:[\]]/g, "").substring(0, 31) || "Sheet1";
      XLSX.utils.book_append_sheet(wb, ws, cleanSheetName);
    });

    const safeFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safeFilename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Register in local backup registry
    saveFileToBackup(
      `[XLSX EXPORT RECORD: ${safeFilename} - ${new Date().toISOString()}]`,
      safeFilename,
      category,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ).catch(() => {});

    return {
      success: true,
      path: `TilePoint_Backups/${category}/${safeFilename}`
    };
  } catch (err) {
    console.error('[Excel Helper] Failed to generate XLSX export workbook:', err);
    return { success: false, path: '' };
  }
}

/**
 * Admin Helper: Export Full Product Inventory Catalog to XLSX
 */
export async function exportInventoryCatalogToXLSX(
  products: any[],
  branches: any[] = [],
  suppliers: any[] = []
): Promise<{ success: boolean; path: string }> {
  const formattedProducts = products.map(p => ({
    "ID": p.id,
    "Product Code": p.productCode || p.sku || "",
    "Product Name": p.productName || "",
    "Category": p.category || "",
    "Brand": p.brand || "",
    "Cost Price (PHP)": p.costPrice || 0,
    "Selling Price (PHP)": p.sellingPrice || 0,
    "Global Stock Qty": p.stockQuantity || 0,
    "Unit": p.unit || "pcs",
    "Size": p.size || "",
    "Reorder Point": p.reorderPoint || 10,
    "Warehouse Location": p.warehouseLocation || "",
    "Origin": p.origin || "Local",
    "Is Active": p.isDeleted ? "Inactive" : "Active"
  }));

  const formattedSuppliers = suppliers.map(s => ({
    "Supplier ID": s.id,
    "Company Name": s.name || "",
    "Contact Person": s.contactPerson || "",
    "Email Address": s.email || "",
    "Phone Number": s.phone || "",
    "Office Address": s.address || "",
    "Status": s.isDeleted ? "Disabled" : "Active"
  }));

  const formattedBranches = branches.map(b => ({
    "Branch ID": b.id,
    "Branch Name": b.name || "",
    "Manager": b.manager || "",
    "Location Address": b.address || "",
    "Phone": b.phone || "",
    "Monthly Sales Target (PHP)": b.monthlySales || 0,
    "Assigned Staff Count": b.staffCount || 0
  }));

  const filename = `tilepoint_inventory_catalog_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return exportToXLSX([
    { sheetName: "Product Catalog", data: formattedProducts },
    { sheetName: "Suppliers Roster", data: formattedSuppliers },
    { sheetName: "Store Branches", data: formattedBranches }
  ], filename, 'Inventory_Exports');
}

/**
 * Admin Helper: Export Stock Alert Deficits to XLSX
 */
export async function exportStockAlertsToXLSX(
  alertItems: any[],
  branchName: string = "All Branches"
): Promise<{ success: boolean; path: string }> {
  const rows = alertItems.map(item => {
    const status = item.alertType || item.status || 'LOW';
    const stockQty = item.qty !== undefined ? item.qty : (item.currentStock !== undefined ? item.currentStock : 0);
    const reorderPoint = item.threshold || item.product?.reorderPoint || 10;
    const deficit = item.deficit !== undefined ? item.deficit : Math.max(0, reorderPoint - stockQty);

    return {
      "Alert Severity": status === 'OUT_OF_STOCK' ? 'OUT OF STOCK (URGENT)' : status === 'CRITICAL' ? 'CRITICAL DEFICIT' : 'LOW STOCK WARNING',
      "Product Code": item.product?.productCode || item.product?.sku || "",
      "Product Name": item.product?.productName || "",
      "Category": item.product?.category || "",
      "Brand": item.product?.brand || "",
      "Current Stock Qty": stockQty,
      "Reorder Point Threshold": reorderPoint,
      "Deficit Units Needed": deficit,
      "Cost Price (PHP)": item.product?.costPrice || 0,
      "Selling Price (PHP)": item.product?.sellingPrice || 0,
      "Supplier ID": item.product?.supplierId || "N/A",
      "Branch Location": branchName
    };
  });

  const filename = `tilepoint_stock_alerts_${branchName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return exportToXLSX([
    { sheetName: "Stock Alerts Diagnostics", data: rows }
  ], filename, 'Inventory_Exports');
}

/**
 * Admin Helper: Export Sales Transmittal Report to XLSX
 */
export async function exportSalesTransmittalToXLSX(
  report: any,
  currentUser: any
): Promise<{ success: boolean; path: string }> {
  const establishmentName = typeof window !== 'undefined' ? (localStorage.getItem('tilepoint_company_name_v1') || 'Emman Tile Center') : 'Emman Tile Center';

  // Summary Sheet
  const summaryAoA = [
    ["STATEMENT OF SALES TRANSMISSION REPORT"],
    ["Establishment", establishmentName],
    ["Report ID", report.id || "N/A"],
    ["Branch Origin", `${report.branchName} (${report.branchId})`],
    ["Reporting Date", report.reportingDate || new Date().toISOString().slice(0, 10)],
    ["Transmission Channel", report.transmissionType || "POS Terminal Sync"],
    ["Audit Status", report.status || "Approved"],
    ["Exported By", `${currentUser?.fullName || 'Admin'} (${currentUser?.role || 'Admin'})`],
    ["Export Timestamp", new Date().toISOString()],
    [""],
    ["FINANCIAL AGGREGATES SUMMARY"],
    ["Total Receipts Issued", report.totalSalesCount || 0],
    ["Total Applied Discounts (PHP)", report.totalDiscountAmount || 0],
    ["12% VAT Collected (PHP)", report.totalVatAmount || 0],
    ["GRAND TOTAL REVENUE (PHP)", report.totalSalesAmount || 0]
  ];

  // Invoices Sheet
  const invoicesData = (report.sales || []).map((s: any) => ({
    "Invoice Number": s.saleNumber || s.id,
    "Customer Name": s.customerName || "Walk-in Buyer",
    "Cashier": s.cashierName || "System",
    "Payment Mode": s.paymentMethod || "Cash",
    "Subtotal (PHP)": s.subtotal || 0,
    "Discount (PHP)": s.discount || 0,
    "12% VAT (PHP)": s.vat || 0,
    "Grand Total (PHP)": s.grandTotal || 0,
    "Transaction Date": s.createdAt ? new Date(s.createdAt).toLocaleString() : new Date().toLocaleString()
  }));

  // Line Items Sheet if available
  const lineItemsData: any[] = [];
  if (report.saleItems && Array.isArray(report.saleItems)) {
    report.saleItems.forEach((item: any) => {
      lineItemsData.push({
        "Sale Ref": item.saleId || "N/A",
        "Product Name": item.productName || item.productId || "Tile Item",
        "Quantity": item.quantity || 1,
        "Unit Price (PHP)": item.unitPrice || 0,
        "Discount (PHP)": item.discount || 0,
        "Line Total (PHP)": item.total || 0
      });
    });
  }

  const filename = `TilePoint_Sales_Report_${(report.branchName || 'Branch').replace(/\s+/g, '_')}_${report.reportingDate || Date.now()}.xlsx`;

  const sheets: SheetData[] = [
    { sheetName: "Report Summary", data: summaryAoA },
    { sheetName: "Invoices & Receipts", data: invoicesData }
  ];

  if (lineItemsData.length > 0) {
    sheets.push({ sheetName: "Itemized Line Breakdown", data: lineItemsData });
  }

  return exportToXLSX(sheets, filename, 'Sales_Reports');
}

/**
 * Admin Helper: Export Entire Master Database to XLSX
 */
export async function exportMasterDatabaseToXLSX(
  db: any
): Promise<{ success: boolean; path: string }> {
  const sheets: SheetData[] = [];

  // Products
  if (Array.isArray(db.products)) {
    sheets.push({
      sheetName: "Products Catalog",
      data: db.products.map((p: any) => ({
        ID: p.id,
        Code: p.productCode || p.sku || "",
        Name: p.productName || "",
        Category: p.category || "",
        Brand: p.brand || "",
        CostPrice: p.costPrice || 0,
        SellingPrice: p.sellingPrice || 0,
        StockQuantity: p.stockQuantity || 0,
        Unit: p.unit || "pcs",
        Size: p.size || "",
        ReorderPoint: p.reorderPoint || 10,
        Location: p.warehouseLocation || "",
        Status: p.isDeleted ? "Deleted" : "Active"
      }))
    });
  }

  // Sales
  if (Array.isArray(db.sales)) {
    sheets.push({
      sheetName: "Sales Transactions",
      data: db.sales.map((s: any) => ({
        InvoiceNumber: s.saleNumber || s.id,
        BranchID: s.branchId || "",
        Customer: s.customerName || "Walk-in Buyer",
        Cashier: s.cashierName || "",
        PaymentMethod: s.paymentMethod || "",
        Subtotal: s.subtotal || 0,
        Discount: s.discount || 0,
        VAT: s.vat || 0,
        GrandTotal: s.grandTotal || 0,
        Status: s.status || "Completed",
        Date: s.createdAt ? new Date(s.createdAt).toLocaleString() : ""
      }))
    });
  }

  // Users & Staff Roster
  if (Array.isArray(db.users)) {
    sheets.push({
      sheetName: "User Accounts",
      data: db.users.map((u: any) => ({
        ID: u.id,
        Username: u.username || "",
        FullName: u.fullName || "",
        Role: u.role || "",
        BranchID: u.branchAssignmentId || "Global",
        Email: u.email || "",
        Phone: u.phone || "",
        Status: u.status || "Active"
      }))
    });
  }

  // Suppliers
  if (Array.isArray(db.suppliers)) {
    sheets.push({
      sheetName: "Suppliers Directory",
      data: db.suppliers.map((sup: any) => ({
        ID: sup.id,
        Name: sup.name || "",
        ContactPerson: sup.contactPerson || "",
        Email: sup.email || "",
        Phone: sup.phone || "",
        Address: sup.address || "",
        Status: sup.isDeleted ? "Inactive" : "Active"
      }))
    });
  }

  // Branches
  if (Array.isArray(db.branches)) {
    sheets.push({
      sheetName: "Store Branches",
      data: db.branches.map((b: any) => ({
        ID: b.id,
        Name: b.name || "",
        Manager: b.manager || "",
        Address: b.address || "",
        Phone: b.phone || "",
        MonthlyTarget: b.monthlySales || 0,
        StaffCount: b.staffCount || 0
      }))
    });
  }

  // Audit Logs
  if (Array.isArray(db.auditLogs)) {
    sheets.push({
      sheetName: "System Audit Logs",
      data: db.auditLogs.map((log: any) => ({
        ID: log.id,
        Action: log.action || "",
        Module: log.module || "",
        User: log.userName || log.userId || "",
        Role: log.userRole || "",
        Branch: log.branchId || "",
        Timestamp: log.timestamp ? new Date(log.timestamp).toLocaleString() : ""
      }))
    });
  }

  const filename = `tilepoint_master_database_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return exportToXLSX(sheets, filename, 'Database_Backups');
}
