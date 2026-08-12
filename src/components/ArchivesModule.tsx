import React, { useState, useMemo } from 'react';
import {
  Archive,
  RotateCcw,
  Trash2,
  Search,
  Filter,
  CheckSquare,
  Square,
  AlertTriangle,
  RefreshCw,
  Package,
  Users,
  Building2,
  Truck,
  Receipt,
  FileText,
  AlertOctagon,
  DollarSign,
  ShieldAlert,
  Sparkles,
  Info,
} from 'lucide-react';
import { useDb } from '../context/DbContext';

interface ArchivesModuleProps {
  darkMode?: boolean;
}

export type ArchiveType =
  | 'product'
  | 'user'
  | 'branch'
  | 'supplier'
  | 'brand'
  | 'sale'
  | 'purchaseOrder'
  | 'transmittal'
  | 'expense'
  | 'damageLog';

export interface UnifiedArchivedItem {
  id: string;
  type: ArchiveType;
  typeLabel: string;
  title: string;
  subtitle: string;
  details?: string;
  deletedAt?: string;
  deletedBy?: string;
  badgeColor: string;
}

export const ArchivesModule: React.FC<ArchivesModuleProps> = () => {
  const {
    products,
    users,
    branches,
    suppliers,
    brands,
    sales,
    purchaseOrders,
    transmittals,
    expenses,
    damageLogs,
    restoreProduct,
    restoreUser,
    restoreBranch,
    restoreSupplier,
    restoreBrand,
    restoreSale,
    restorePurchaseOrder,
    restoreTransmittal,
    restoreExpense,
    restoreDamageLog,
    purgeArchivedItem,
    bulkRestoreItems,
  } = useDb();

  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Modals
  const [itemToPurge, setItemToPurge] = useState<UnifiedArchivedItem | null>(null);
  const [showBulkPurgeModal, setShowBulkPurgeModal] = useState(false);
  const [showBulkRestoreModal, setShowBulkRestoreModal] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Compile all soft-deleted records into unified collection
  const archivedItems = useMemo<UnifiedArchivedItem[]>(() => {
    const list: UnifiedArchivedItem[] = [];

    // 1. Products
    products
      .filter((p) => p.isDeleted)
      .forEach((p) => {
        list.push({
          id: p.id,
          type: 'product',
          typeLabel: 'Product',
          title: p.productName || 'Unnamed Product',
          subtitle: `SKU: ${p.sku || p.productCode || 'N/A'} • Category: ${p.category || 'General'}`,
          details: `Unit Price: $${(p.sellingPrice || 0).toLocaleString()} • Box Qty: ${p.boxQuantity || 1}`,
          deletedAt: p.updatedAt || p.createdAt,
          deletedBy: p.updatedBy,
          badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        });
      });

    // 2. Staff / Users
    users
      .filter((u: any) => u.isDeleted)
      .forEach((u) => {
        list.push({
          id: u.id,
          type: 'user',
          typeLabel: 'Staff Member',
          title: u.fullName || u.username,
          subtitle: `Role: ${u.role} • Username: @${u.username}`,
          details: `Email: ${u.email || 'N/A'} • Branch: ${u.branchAssignmentId || 'Central'}`,
          deletedAt: u.updatedAt,
          badgeColor: 'bg-m3-primary/10 text-m3-primary border-m3-primary/20',
        });
      });

    // 3. Branches
    branches
      .filter((b) => b.isDeleted)
      .forEach((b) => {
        list.push({
          id: b.id,
          type: 'branch',
          typeLabel: 'Branch',
          title: b.name || 'Unnamed Branch',
          subtitle: `Code: ${b.id} • Phone: ${b.phone || 'N/A'}`,
          details: `Address: ${b.address || 'N/A'} • Manager: ${b.manager || 'N/A'}`,
          deletedAt: b.updatedAt || b.createdAt,
          badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
        });
      });

    // 4. Suppliers
    suppliers
      .filter((s) => s.isDeleted)
      .forEach((s) => {
        list.push({
          id: s.id,
          type: 'supplier',
          typeLabel: 'Supplier',
          title: s.name || 'Unnamed Supplier',
          subtitle: `Contact: ${s.contactPerson || 'N/A'} • Phone: ${s.phone || 'N/A'}`,
          details: `Email: ${s.email || 'N/A'}`,
          deletedAt: s.createdAt,
          badgeColor: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
        });
      });

    // 5. Brands
    brands
      .filter((b) => b.isDeleted)
      .forEach((b) => {
        list.push({
          id: b.id,
          type: 'brand',
          typeLabel: 'Brand',
          title: b.name || 'Unnamed Brand',
          subtitle: `ID: ${b.id}`,
          deletedAt: b.createdAt,
          badgeColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
        });
      });

    // 6. Sales
    sales
      .filter((s: any) => s.isDeleted)
      .forEach((s: any) => {
        list.push({
          id: s.id,
          type: 'sale',
          typeLabel: 'Sale / Invoice',
          title: `Invoice #${s.receiptNumber || s.id}`,
          subtitle: `Customer: ${s.customerName || 'Walk-in'} • Method: ${s.paymentMethod || 'Cash'}`,
          details: `Total: $${(s.totalAmount || 0).toLocaleString()} • Branch: ${s.branchId || 'N/A'}`,
          deletedAt: s.deletedAt || s.createdAt,
          badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        });
      });

    // 7. Purchase Orders
    purchaseOrders
      .filter((po: any) => po.isDeleted)
      .forEach((po: any) => {
        list.push({
          id: po.id,
          type: 'purchaseOrder',
          typeLabel: 'Purchase Order',
          title: `PO #${po.id}`,
          subtitle: `Supplier: ${po.supplierName || po.supplierId} • Status: ${po.status}`,
          details: `Total Cost: $${(po.totalAmount || 0).toLocaleString()} • Items: ${po.items?.length || 0}`,
          deletedAt: po.deletedAt || po.createdAt,
          badgeColor: 'bg-m3-primary/10 text-m3-primary border-m3-primary/20',
        });
      });

    // 8. Transmittals
    transmittals
      .filter((t: any) => t.isDeleted)
      .forEach((t: any) => {
        list.push({
          id: t.id,
          type: 'transmittal',
          typeLabel: 'Transmittal',
          title: `Transmittal #${t.id}`,
          subtitle: `From: ${t.sourceBranchId} ➔ To: ${t.targetBranchId}`,
          details: `Status: ${t.status} • Total Items: ${t.items?.length || 0}`,
          deletedAt: t.deletedAt || t.createdAt,
          badgeColor: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
        });
      });

    // 9. Expenses
    expenses
      .filter((ex: any) => ex.isDeleted)
      .forEach((ex: any) => {
        list.push({
          id: ex.id,
          type: 'expense',
          typeLabel: 'Expense Record',
          title: ex.description || `Expense #${ex.id}`,
          subtitle: `Category: ${ex.category} • Branch: ${ex.branchId}`,
          details: `Amount: $${(ex.amount || 0).toLocaleString()}`,
          deletedAt: ex.deletedAt || ex.date,
          badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        });
      });

    // 10. Damage Logs
    damageLogs
      .filter((d: any) => d.isDeleted)
      .forEach((d: any) => {
        list.push({
          id: d.id,
          type: 'damageLog',
          typeLabel: 'Damage Register Log',
          title: `Damage Entry #${d.id}`,
          subtitle: `Product ID: ${d.productId} • Reason: ${d.reason || 'N/A'}`,
          details: `Quantity Damaged: ${d.quantityDamaged} • Branch: ${d.branchId}`,
          deletedAt: d.deletedAt || d.dateReported,
          badgeColor: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
        });
      });

    return list.sort((a, b) => {
      const timeA = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
      const timeB = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [
    products,
    users,
    branches,
    suppliers,
    brands,
    sales,
    purchaseOrders,
    transmittals,
    expenses,
    damageLogs,
  ]);

  // Counts by tab category
  const counts = useMemo(() => {
    return {
      all: archivedItems.length,
      product: archivedItems.filter((i) => i.type === 'product').length,
      user: archivedItems.filter((i) => i.type === 'user').length,
      branch: archivedItems.filter((i) => i.type === 'branch').length,
      supplier: archivedItems.filter((i) => i.type === 'supplier' || i.type === 'brand').length,
      transaction: archivedItems.filter((i) => i.type === 'sale').length,
      procurement: archivedItems.filter((i) => i.type === 'purchaseOrder' || i.type === 'transmittal').length,
      log: archivedItems.filter((i) => i.type === 'expense' || i.type === 'damageLog').length,
    };
  }, [archivedItems]);

  // Filtered by active tab & search query
  const filteredItems = useMemo(() => {
    return archivedItems.filter((item) => {
      // Tab matching
      if (activeTab === 'product' && item.type !== 'product') return false;
      if (activeTab === 'user' && item.type !== 'user') return false;
      if (activeTab === 'branch' && item.type !== 'branch') return false;
      if (activeTab === 'supplier' && item.type !== 'supplier' && item.type !== 'brand') return false;
      if (activeTab === 'transaction' && item.type !== 'sale') return false;
      if (activeTab === 'procurement' && item.type !== 'purchaseOrder' && item.type !== 'transmittal') return false;
      if (activeTab === 'log' && item.type !== 'expense' && item.type !== 'damageLog') return false;

      // Search matching
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchSub = item.subtitle.toLowerCase().includes(q);
        const matchDetails = item.details?.toLowerCase().includes(q);
        const matchType = item.typeLabel.toLowerCase().includes(q);
        const matchId = item.id.toLowerCase().includes(q);
        return matchTitle || matchSub || matchDetails || matchType || matchId;
      }

      return true;
    });
  }, [archivedItems, activeTab, searchQuery]);

  // Handle single item restore
  const handleRestoreSingle = (item: UnifiedArchivedItem) => {
    switch (item.type) {
      case 'product':
        restoreProduct(item.id);
        break;
      case 'user':
        restoreUser(item.id);
        break;
      case 'branch':
        restoreBranch(item.id);
        break;
      case 'supplier':
        restoreSupplier(item.id);
        break;
      case 'brand':
        restoreBrand(item.id);
        break;
      case 'sale':
        restoreSale(item.id);
        break;
      case 'purchaseOrder':
        restorePurchaseOrder(item.id);
        break;
      case 'transmittal':
        restoreTransmittal(item.id);
        break;
      case 'expense':
        restoreExpense(item.id);
        break;
      case 'damageLog':
        restoreDamageLog(item.id);
        break;
    }
    showToast(`Successfully restored "${item.title}" back to active system records!`);
  };

  // Selection handlers
  const getSelectedItems = () => {
    return filteredItems.filter((item) => !!selectedKeys[`${item.type}_${item.id}`]);
  };

  const handleToggleSelectAll = () => {
    const selectedList = getSelectedItems();
    if (selectedList.length === filteredItems.length && filteredItems.length > 0) {
      setSelectedKeys({});
    } else {
      const next: Record<string, boolean> = {};
      filteredItems.forEach((item) => {
        next[`${item.type}_${item.id}`] = true;
      });
      setSelectedKeys(next);
    }
  };

  const handleToggleSelectOne = (key: string) => {
    setSelectedKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Bulk restore
  const handleConfirmBulkRestore = () => {
    const itemsToRestore = getSelectedItems().map((i) => ({ type: i.type, id: i.id }));
    if (itemsToRestore.length === 0) return;

    bulkRestoreItems(itemsToRestore);
    setSelectedKeys({});
    setShowBulkRestoreModal(false);
    showToast(`Bulk restored ${itemsToRestore.length} items back to active status!`);
  };

  // Bulk purge
  const handleConfirmBulkPurge = () => {
    const itemsToPurge = getSelectedItems();
    itemsToPurge.forEach((i) => purgeArchivedItem(i.type, i.id));
    setSelectedKeys({});
    setShowBulkPurgeModal(false);
    showToast(`Permanently purged ${itemsToPurge.length} archived entries.`);
  };

  const handleConfirmSinglePurge = () => {
    if (!itemToPurge) return;
    purgeArchivedItem(itemToPurge.type, itemToPurge.id);
    setItemToPurge(null);
    showToast(`Permanently purged "${itemToPurge.title}".`);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-4 md:p-6 space-y-5 bg-m3-surface/30">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-m3-on-surface text-m3-surface text-xs font-bold py-3 px-5 rounded-2xl shadow-2xl z-50 border border-m3-outline-variant/30 flex items-center gap-2.5 animate-bounce max-w-[320px]">
          <RotateCcw className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
          <span className="leading-tight">{toastMessage}</span>
        </div>
      )}

      {/* HEADER BANNER */}
      <div className="m3-card p-5 border border-m3-outline-variant/20 bg-gradient-to-r from-m3-surface-low via-m3-surface-lowest to-m3-surface-low shadow-sm rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-m3-primary/10 text-m3-primary border border-m3-primary/20 shrink-0">
            <Archive className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-m3-on-surface tracking-tight">
                System Archives & Restore Center
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Recovery Vault
              </span>
            </div>
            <p className="text-xs text-m3-on-surface-variant font-medium mt-0.5">
              Safely inspect and restore soft-deleted items across inventory, employees, branches, suppliers, and sales.
            </p>
          </div>
        </div>

        {/* STATS OVERVIEW BADGES */}
        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end">
          <div className="p-2.5 px-4 rounded-2xl bg-m3-surface-lowest border border-m3-outline-variant/20 text-center min-w-[100px]">
            <div className="text-[10px] uppercase font-bold text-m3-on-surface-variant tracking-wider">
              Total Vault
            </div>
            <div className="text-lg font-black text-m3-primary">{counts.all}</div>
          </div>
          <div className="p-2.5 px-4 rounded-2xl bg-m3-surface-lowest border border-m3-outline-variant/20 text-center min-w-[100px]">
            <div className="text-[10px] uppercase font-bold text-m3-on-surface-variant tracking-wider">
              Products
            </div>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{counts.product}</div>
          </div>
          <div className="p-2.5 px-4 rounded-2xl bg-m3-surface-lowest border border-m3-outline-variant/20 text-center min-w-[100px]">
            <div className="text-[10px] uppercase font-bold text-m3-on-surface-variant tracking-wider">
              Staff / Other
            </div>
            <div className="text-lg font-black text-m3-primary">{counts.user + counts.branch}</div>
          </div>
        </div>
      </div>

      {/* FILTER TABS & SEARCH BAR */}
      <div className="m3-card p-4 border border-m3-outline-variant/20 rounded-3xl space-y-3 bg-m3-surface-lowest shadow-xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* SEARCH INPUT */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-m3-on-surface-variant" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search archives by name, code, SKU, email, role..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-2xl bg-m3-surface-low border border-m3-outline-variant/30 text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-primary/30 transition-all placeholder:text-m3-on-surface-variant/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-m3-on-surface-variant hover:text-m3-on-surface"
              >
                Clear
              </button>
            )}
          </div>

          {/* QUICK BULK ACTIONS IF ANY SELECTED */}
          {getSelectedItems().length > 0 && (
            <div className="flex items-center gap-2 bg-m3-surface-low p-1.5 px-3 rounded-2xl border border-m3-primary/20 animate-fade-in">
              <span className="text-xs font-black text-m3-primary">
                {getSelectedItems().length} selected
              </span>
              <button
                onClick={() => setShowBulkRestoreModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-bold uppercase tracking-wider cursor-pointer shadow-sm transition-all"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restore Selected</span>
              </button>
              <button
                onClick={() => setShowBulkPurgeModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Purge Selected</span>
              </button>
              <button
                onClick={() => setSelectedKeys({})}
                className="text-[11px] font-bold text-m3-on-surface-variant hover:text-m3-on-surface px-2 py-1"
              >
                Deselect
              </button>
            </div>
          )}
        </div>

        {/* CATEGORY TABS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
          {[
            { id: 'all', label: 'All Items', count: counts.all, icon: Archive },
            { id: 'product', label: 'Products', count: counts.product, icon: Package },
            { id: 'user', label: 'Staff / Employees', count: counts.user, icon: Users },
            { id: 'branch', label: 'Branches', count: counts.branch, icon: Building2 },
            { id: 'supplier', label: 'Suppliers & Brands', count: counts.supplier, icon: Truck },
            { id: 'transaction', label: 'Sales & Invoices', count: counts.transaction, icon: Receipt },
            { id: 'procurement', label: 'POs & Transfers', count: counts.procurement, icon: FileText },
            { id: 'log', label: 'Damage & Expenses', count: counts.log, icon: AlertOctagon },
          ].map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedKeys({});
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                  isActive
                    ? 'bg-m3-primary text-m3-on-primary shadow-xs'
                    : 'bg-m3-surface-low text-m3-on-surface-variant hover:bg-m3-surface-variant/20'
                }`}
              >
                <IconComp className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isActive
                      ? 'bg-m3-on-primary/20 text-m3-on-primary'
                      : 'bg-m3-outline-variant/30 text-m3-on-surface-variant'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TABLE / LIST CONTAINER */}
      <div className="m3-card p-0 border border-m3-outline-variant/20 rounded-3xl overflow-hidden bg-m3-surface-lowest shadow-sm">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="p-4 rounded-full bg-m3-surface-low text-m3-on-surface-variant/40 border border-m3-outline-variant/20">
              <Archive className="h-10 w-10 stroke-[1.5]" />
            </div>
            <div className="max-w-sm space-y-1">
              <h3 className="text-sm font-black text-m3-on-surface">No Archived Items Found</h3>
              <p className="text-xs text-m3-on-surface-variant">
                {searchQuery
                  ? `No records matching "${searchQuery}" in this category.`
                  : 'There are currently no soft-deleted records in this vault category. Active records are operational!'}
              </p>
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs font-bold text-m3-primary hover:underline"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-m3-outline-variant/20 bg-m3-surface-low/50 text-[10px] uppercase font-bold text-m3-on-surface-variant tracking-wider">
                  <th className="py-3 px-3.5 w-10 text-center select-none">
                    <input
                      type="checkbox"
                      checked={
                        filteredItems.length > 0 &&
                        getSelectedItems().length === filteredItems.length
                      }
                      onChange={handleToggleSelectAll}
                      className="rounded border-zinc-300 dark:border-zinc-700 text-m3-primary focus:ring-m3-primary cursor-pointer h-3.5 w-3.5"
                    />
                  </th>
                  <th className="py-3 px-3 w-28">Category</th>
                  <th className="py-3 px-4">Record Identifier & Name</th>
                  <th className="py-3 px-4">Metadata / Details</th>
                  <th className="py-3 px-4 w-40">Deleted Timestamp</th>
                  <th className="py-3 px-4 text-right w-48">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-m3-outline-variant/10">
                {filteredItems.map((item) => {
                  const key = `${item.type}_${item.id}`;
                  const isSelected = !!selectedKeys[key];

                  return (
                    <tr
                      key={key}
                      className={`hover:bg-m3-surface-low/60 transition-colors ${
                        isSelected ? 'bg-m3-primary/5' : ''
                      }`}
                    >
                      {/* SELECT CHECKBOX */}
                      <td className="py-3.5 px-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(key)}
                          className="rounded border-zinc-300 dark:border-zinc-700 text-m3-primary focus:ring-m3-primary cursor-pointer h-3.5 w-3.5"
                        />
                      </td>

                      {/* CATEGORY BADGE */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide border ${item.badgeColor}`}
                        >
                          {item.typeLabel}
                        </span>
                      </td>

                      {/* TITLE & SUBTITLE */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-m3-on-surface">{item.title}</div>
                        <div className="text-[11px] text-m3-on-surface-variant font-mono mt-0.5">
                          {item.subtitle}
                        </div>
                      </td>

                      {/* DETAILS */}
                      <td className="py-3.5 px-4 text-m3-on-surface-variant text-[11px]">
                        {item.details || '—'}
                      </td>

                      {/* TIMESTAMP */}
                      <td className="py-3.5 px-4 text-m3-on-surface-variant text-[11px] font-mono">
                        {item.deletedAt
                          ? new Date(item.deletedAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Archived'}
                        {item.deletedBy && (
                          <div className="text-[10px] text-m3-on-surface-variant/70">
                            By: {item.deletedBy}
                          </div>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleRestoreSingle(item)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-bold cursor-pointer transition-all shadow-xs active:scale-95"
                            title="Restore this record back to active database"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Restore</span>
                          </button>
                          <button
                            onClick={() => setItemToPurge(item)}
                            className="p-1.5 rounded-xl text-m3-on-surface-variant/60 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-all"
                            title="Permanently purge from system"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: SINGLE PURGE CONFIRMATION */}
      {itemToPurge && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-m3-surface-lowest rounded-3xl p-6 max-w-md w-full border border-m3-outline-variant/30 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-m3-on-surface">Permanent Purge</h3>
                <p className="text-xs text-m3-on-surface-variant">Action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-m3-on-surface-variant leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="text-m3-on-surface">{itemToPurge.title}</strong> ({itemToPurge.typeLabel})? This will eradicate the record permanently from system backups.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-m3-outline-variant/15">
              <button
                onClick={() => setItemToPurge(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl text-m3-on-surface-variant hover:bg-m3-surface-low"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSinglePurge}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 cursor-pointer shadow-sm"
              >
                Purge Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BULK RESTORE CONFIRMATION */}
      {showBulkRestoreModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-m3-surface-lowest rounded-3xl p-6 max-w-md w-full border border-m3-outline-variant/30 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-emerald-500">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <RotateCcw className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-m3-on-surface">Bulk Restore Confirmation</h3>
                <p className="text-xs text-m3-on-surface-variant">Restore records to active system</p>
              </div>
            </div>

            <p className="text-xs text-m3-on-surface-variant leading-relaxed">
              You are about to restore <strong className="text-m3-on-surface">{getSelectedItems().length} selected records</strong> back to active modules and catalogs.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-m3-outline-variant/15">
              <button
                onClick={() => setShowBulkRestoreModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl text-m3-on-surface-variant hover:bg-m3-surface-low"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBulkRestore}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer shadow-sm"
              >
                Confirm Bulk Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BULK PURGE CONFIRMATION */}
      {showBulkPurgeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-m3-surface-lowest rounded-3xl p-6 max-w-md w-full border border-m3-outline-variant/30 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <AlertOctagon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-m3-on-surface">Bulk Permanent Purge</h3>
                <p className="text-xs text-m3-on-surface-variant">Irreversible Operation</p>
              </div>
            </div>

            <p className="text-xs text-m3-on-surface-variant leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-rose-500">{getSelectedItems().length} selected archived records</strong>?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-m3-outline-variant/15">
              <button
                onClick={() => setShowBulkPurgeModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl text-m3-on-surface-variant hover:bg-m3-surface-low"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBulkPurge}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 cursor-pointer shadow-sm"
              >
                Confirm Permanent Purge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
