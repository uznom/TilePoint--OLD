/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useDb } from '../context/DbContext';
import { UserRole } from '../types/db';
import {
  Database,
  Network,
  GitBranch,
  ShieldAlert,
  ListFilter,
  CheckCircle2,
  FileCode,
  Layout,
  Plus,
  Trash2,
  Share2,
  AlertCircle,
  Settings,
  Flame,
  ArrowRight
} from 'lucide-react';

interface SchemaField {
  name: string;
  type: string;
  key?: 'PK' | 'FK' | 'UK';
  desc: string;
  refTable?: string;
}

interface TableSchema {
  name: string;
  category: 'User & Security' | 'Core Logistics' | 'Inventory & POS';
  fields: SchemaField[];
}

export const ArchitectureModule: React.FC = () => {
  const { auditLogs, addAuditLog, currentUser, truncateDatabase, products, sales, stockTransfers, suppliers } = useDb();
  const [selectedTable, setSelectedTable] = useState<string>('Users');
  const [activeTab, setActiveTab] = useState<'erd' | 'rbac' | 'topology' | 'checklist' | 'operations'>('operations');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmStep, setConfirmStep] = useState<{ mode: 'all' | 'transactions' | 'seeds' | null; inputVal: string }>({ mode: null, inputVal: '' });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleTruncateAction = (mode: 'all' | 'transactions' | 'seeds') => {
    setConfirmStep({ mode, inputVal: '' });
  };

  const executeConfirmedTruncate = () => {
    const mode = confirmStep.mode;
    if (!mode) return;

    if (mode !== 'seeds' && confirmStep.inputVal.trim().toUpperCase() !== 'TRUNCATE') {
      showToast('⚠️ Mismatch: Please enter the exact word "TRUNCATE" to proceed.');
      return;
    }

    try {
      truncateDatabase(mode);
      setConfirmStep({ mode: null, inputVal: '' });
      if (mode === 'seeds') {
        showToast('🟢 Success: Standard database schemas & system seed data re-populated!');
      } else if (mode === 'all') {
        showToast('🔥 Purge Complete: Database completely truncated to blank slate!');
      } else {
        showToast('🧹 Purge Complete: All transactions cleared. Product designs preserved.');
      }
    } catch (err) {
      showToast('❌ DB Engine Exception: Truncation pipeline error.');
    }
  };
  const [customTables, setCustomTables] = useState<TableSchema[]>([
    {
      name: 'Users',
      category: 'User & Security',
      fields: [
        { name: 'id', type: 'VARCHAR(40)', key: 'PK', desc: 'Unique identifier for employee' },
        { name: 'fullName', type: 'VARCHAR(120)', desc: 'Full legal name' },
        { name: 'username', type: 'VARCHAR(50)', key: 'UK', desc: 'Secure login slug' },
        { name: 'email', type: 'VARCHAR(150)', key: 'UK', desc: 'Corporate email address' },
        { name: 'role', type: 'ENUM(\'Admin\', \'Manager\', \'Cashier\', \'Staff\')', desc: 'Role-Based Access Control group' },
        { name: 'branchAssignmentId', type: 'VARCHAR(40)', key: 'FK', desc: 'Assigned branch branch profile link', refTable: 'Branches' },
        { name: 'avatarInitials', type: 'VARCHAR(4)', desc: 'Visual indicator label letters' },
        { name: 'status', type: 'VARCHAR(20)', desc: 'Active, Suspended, or OnLeave status' }
      ]
    },
    {
      name: 'Roles & Permissions',
      category: 'User & Security',
      fields: [
        { name: 'id', type: 'VARCHAR(40)', key: 'PK', desc: 'Role key identification node' },
        { name: 'name', type: 'VARCHAR(60)', desc: 'Role display title (e.g. Lead Cashier)' },
        { name: 'permissions', type: 'TEXT[]', desc: 'Array of authorized micro-actions' },
        { name: 'maxDiscountLimit', type: 'DECIMAL(5,2)', desc: 'Maximum allowable pos checkout discount percentage' }
      ]
    },
    {
      name: 'Branches',
      category: 'Core Logistics',
      fields: [
        { name: 'id', type: 'VARCHAR(40)', key: 'PK', desc: 'Unique store identifier code' },
        { name: 'name', type: 'VARCHAR(100)', desc: 'Branch outlet name text' },
        { name: 'address', type: 'TEXT', desc: 'Physical geolocated store address' },
        { name: 'manager', type: 'VARCHAR(120)', desc: 'Primary manager name' },
        { name: 'staffCount', type: 'INTEGER', desc: 'Aggregated list of personnel linked' }
      ]
    },
    {
      name: 'Categories',
      category: 'Core Logistics',
      fields: [
        { name: 'id', type: 'VARCHAR(40)', key: 'PK', desc: 'Short classification term variable' },
        { name: 'name', type: 'VARCHAR(100)', desc: 'Category display label (e.g., Ceramic tiles)' },
        { name: 'description', type: 'TEXT', desc: 'Classification criteria description text' }
      ]
    },
    {
      name: 'Suppliers',
      category: 'Core Logistics',
      fields: [
        { name: 'id', type: 'VARCHAR(40)', key: 'PK', desc: 'Unique supplier identifier code' },
        { name: 'name', type: 'VARCHAR(150)', desc: 'Manufacturer or broker entity label' },
        { name: 'contactPerson', type: 'VARCHAR(100)', desc: 'Direct agent handler name' },
        { name: 'phone', type: 'VARCHAR(30)', desc: 'Active phone line' },
        { name: 'address', type: 'TEXT', desc: 'Principal factory distribution address' }
      ]
    },
    {
      name: 'Products & Inventory',
      category: 'Inventory & POS',
      fields: [
        { name: 'id', type: 'VARCHAR(40)', key: 'PK', desc: 'Universal SKU barcode code' },
        { name: 'name', type: 'VARCHAR(200)', desc: 'Material tile design text label' },
        { name: 'category', type: 'VARCHAR(40)', key: 'FK', desc: 'Link to Categories taxonomy node', refTable: 'Categories' },
        { name: 'supplierId', type: 'VARCHAR(40)', key: 'FK', desc: 'Assigned supplier broker link', refTable: 'Suppliers' },
        { name: 'size', type: 'VARCHAR(50)', desc: 'Physical tile size metrics (e.g., 60x60cm)' },
        { name: 'costPrice', type: 'DECIMAL(12,2)', desc: 'Direct cost factor from manufacturer list' },
        { name: 'sellingPrice', type: 'DECIMAL(12,2)', desc: 'Standard retail checkout base price' },
        { name: 'stockQuantity', type: 'INTEGER', desc: 'Combined real-time on-hand shelf inventory' },
        { name: 'minimumStock', type: 'INTEGER', desc: 'Critical buffer safety threshold limit' }
      ]
    },
    {
      name: 'Deliverables & POs',
      category: 'Inventory & POS',
      fields: [
        { name: 'id', type: 'VARCHAR(40)', key: 'PK', desc: 'Purchase order voucher number' },
        { name: 'supplierId', type: 'VARCHAR(40)', key: 'FK', desc: 'Identified supply source link', refTable: 'Suppliers' },
        { name: 'poNumber', type: 'VARCHAR(50)', key: 'UK', desc: 'Unique system voucher billing track code' },
        { name: 'requestedBy', type: 'VARCHAR(120)', desc: 'Authorized compiler officer' },
        { name: 'status', type: 'ENUM(\'Pending\', \'Ordered\', \'Received\', \'Cancelled\')', desc: 'Procurement cycle stage tracker' },
        { name: 'items', type: 'JSONB', desc: 'Nested dictionary of line-item SKUs and buy rates' }
      ]
    }
  ]);

  // Checklist of phase 1 deliverables
  const [checklist, setChecklist] = useState([
    { id: 1, text: 'Vite + React TS Multi-Branch Enterprise Scaffold', checked: true, desc: 'Foundation workspace configured' },
    { id: 2, text: 'Offline durability storage Engine (LocalStorage Cache Sync)', checked: true, desc: 'Loss-free device caching configured' },
    { id: 3, text: 'Custom Color Scheme Integration via Dynamic Theme Tokens', checked: true, desc: 'Adjust styles dynamically with no ovals theme' },
    { id: 4, text: 'Android 17 Translucency Glossy Backdrop Blurring UI Layers', checked: true, desc: 'Added frosted active glass class styling across views' },
    { id: 5, text: 'Multi-Branch Tenant Separation Architecture', checked: true, desc: 'Branch Assignment filters dynamic lists and cash records' },
    { id: 6, text: 'Interactive Role-Based Access controls (RBAC) Switcher', checked: true, desc: 'Simulate Admin, Manager, Cashier, and Staff identities' },
    { id: 7, text: 'Real-time System Audit Logging Activity Tracker', checked: true, desc: 'Durable logging feed of every simulated operation' }
  ]);

  // SQL code generator based on schemas
  const getSQLString = () => {
    let sql = `-- ==========================================================\n`;
    sql += `-- POSTGRESQL SCHEMA FOR TILEPOINT REAL-TIME ENTERPRISE POS \n`;
    sql += `-- PHASE 1 - PHYSICAL ERD BLUEPRINTS INITIATED\n`;
    sql += `-- Generated: ${new Date().toISOString().split('T')[0]} Floor Staff Sandbox\n`;
    sql += `-- ==========================================================\n\n`;

    customTables.forEach(t => {
      sql += `CREATE TABLE ${t.name.toLowerCase().replace(/\s+&\s+/g, '_').replace(/\s+/g, '_')} (\n`;
      const fieldsSql = t.fields.map(f => {
        let line = `  ${f.name.padEnd(20)} ${f.type}`;
        if (f.key === 'PK') line += ' PRIMARY KEY';
        if (f.key === 'UK') line += ' UNIQUE NOT NULL';
        if (f.key === 'FK') line += ` REFERENCES ${f.refTable?.toLowerCase()}(id) ON DELETE RESTRICT`;
        return line;
      });
      sql += fieldsSql.join(',\n');
      sql += `\n);\n\n`;
    });

    return sql;
  };

  const handleAddField = (tableName: string) => {
    const name = prompt('Enter field name:');
    if (!name) return;
    const type = prompt('Enter database type (e.g., VARCHAR(100), INTEGER, BOOLEAN):') || 'VARCHAR(100)';
    const desc = prompt('Enter field description/context:') || 'Custom user dimension';

    setCustomTables(prev => prev.map(t => {
      if (t.name === tableName) {
        return {
          ...t,
          fields: [...t.fields, { name, type, desc }]
        };
      }
      return t;
    }));

    addAuditLog('SCHEMA_UPDATE', `Added target attribute "${name}" (${type}) to Core Database Table [${tableName}]`);
  };

  const handleToggleChecklist = (id: number) => {
    setChecklist(prev => prev.map(item => {
      if (item.id === id) {
        const nextState = !item.checked;
        addAuditLog('DELIVERABLE_TOGGLE', `${nextState ? 'Completed' : 'Reset'} Phase 1 item: ${item.text}`);
        return { ...item, checked: nextState };
      }
      return item;
    }));
  };

  const selectedTableData = customTables.find(t => t.name === selectedTable);

  return (
    <div className="space-y-6 animate-fade-in text-m3-on-surface">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-m3-outline-variant/20 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-m3-primary flex items-center gap-2">
            <Database className="h-6 w-6 text-m3-primary" /> System Architecture & ERD Studio
          </h1>
          <p className="text-xs text-m3-on-surface-variant mt-1">
            Browse and configure Core Tables, visual ERD relationships, dynamic RBAC matrices, and Phase 1 deliverables status.
          </p>
        </div>

        {/* Glossy Tab Switcher */}
        <div className="flex flex-wrap p-1 bg-m3-surface-low/80 backdrop-blur-md border border-m3-outline-variant/30 rounded-xl gap-1 select-none">
          <button
            onClick={() => setActiveTab('erd')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'erd'
                ? 'bg-m3-primary text-m3-on-primary shadow-sm'
                : 'text-m3-on-surface-variant hover:text-m3-primary hover:bg-m3-primary/10'
            }`}
          >
            ERD & Schemas
          </button>
          <button
            onClick={() => setActiveTab('rbac')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'rbac'
                ? 'bg-m3-primary text-m3-on-primary shadow-sm'
                : 'text-m3-on-surface-variant hover:text-m3-primary hover:bg-m3-primary/10'
            }`}
          >
            RBAC Matrix
          </button>
          <button
            onClick={() => setActiveTab('topology')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'topology'
                ? 'bg-m3-primary text-m3-on-primary shadow-sm'
                : 'text-m3-on-surface-variant hover:text-m3-primary hover:bg-m3-primary/10'
            }`}
          >
            Network Topology
          </button>
          <button
            onClick={() => setActiveTab('checklist')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'checklist'
                ? 'bg-m3-primary text-m3-on-primary shadow-sm'
                : 'text-m3-on-surface-variant hover:text-m3-primary hover:bg-m3-primary/10'
            }`}
          >
            Phase 1 Checklist
          </button>
          <button
            onClick={() => setActiveTab('operations')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'operations'
                ? 'bg-m3-primary text-m3-on-primary shadow-sm'
                : 'text-m3-on-surface-variant hover:text-m3-primary hover:bg-m3-primary/10'
            }`}
          >
            ⚙️ DB Maintenance
          </button>
        </div>
      </div>

      {/* ERD SCHEMA DESIGNER TAB */}
      {activeTab === 'erd' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* List of Entities / Core Tables */}
          <div className="lg:col-span-4 space-y-4">
            <div className="m3-card shadow-sm space-y-3">
              <h3 className="text-xs font-black uppercase text-m3-primary font-mono tracking-wider">
                Database Entities (Core schemas)
              </h3>
              <p className="text-[11px] text-m3-on-surface-variant">
                Select an entity to review variables, relations, and simulated schema maps:
              </p>

              <div className="space-y-1.5 mt-2">
                {customTables.map(t => (
                  <button
                    key={t.name}
                    onClick={() => setSelectedTable(t.name)}
                    className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      selectedTable === t.name
                        ? 'border-m3-primary bg-m3-primary/10 text-m3-primary font-extrabold shadow-sm'
                        : 'border-m3-outline-variant/30 hover:bg-m3-surface-low text-m3-on-surface-variant hover:text-m3-primary'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 shrink-0" />
                      <span className="text-xs truncate">{t.name}</span>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 bg-m3-surface-lowest rounded-md">
                      {t.fields.length} cols
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated ERD Foreign Keys connection view */}
            <div className="android-glass rounded-[24px] p-4.5 border border-m3-outline-variant/20 shadow-sm space-y-2 text-m3-on-surface">
              <div className="flex items-center gap-1">
                <GitBranch className="h-4 w-4 text-m3-primary shrink-0" />
                <h4 className="text-xs font-black uppercase tracking-wider font-mono">ER Relations Ledger</h4>
              </div>
              <ul className="text-[11px] text-m3-on-surface-variant space-y-2.5 pt-1.5 pl-0.5">
                <li className="flex gap-1.5 leading-tight">
                  <span className="text-m3-primary font-extrabold">Users.branchAssignmentId</span>
                  <span>→</span>
                  <span className="text-m3-tertiary">Branches.id</span>
                  <span className="text-[9px] text-m3-on-surface-variant/70 italic">(Many-to-One)</span>
                </li>
                <li className="flex gap-1.5 leading-tight">
                  <span className="text-m3-primary font-extrabold">Products.category</span>
                  <span>→</span>
                  <span className="text-m3-tertiary">Categories.id</span>
                  <span className="text-[9px] text-m3-on-surface-variant/70 italic">(Many-to-One)</span>
                </li>
                <li className="flex gap-1.5 leading-tight">
                  <span className="text-m3-primary font-extrabold">Products.supplierId</span>
                  <span>→</span>
                  <span className="text-m3-tertiary">Suppliers.id</span>
                  <span className="text-[9px] text-m3-on-surface-variant/70 italic">(Many-to-One)</span>
                </li>
                <li className="flex gap-1.5 leading-tight">
                  <span className="text-m3-primary font-extrabold">Deliverables.supplierId</span>
                  <span>→</span>
                  <span className="text-m3-tertiary">Suppliers.id</span>
                  <span className="text-[9px] text-m3-on-surface-variant/70 italic">(Many-to-One)</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Interactive Attributes & DDL Code Generator */}
          <div className="lg:col-span-8 space-y-4">
            {selectedTableData && (
              <div className="m3-card shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-m3-outline-variant/15 pb-3">
                  <div>
                    <span className="text-[9px] bg-m3-primary/10 text-m3-primary border border-m3-primary/20 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                      {selectedTableData.category}
                    </span>
                    <h2 className="text-lg font-black tracking-tight text-m3-on-surface mt-1">
                      Table schema: <span className="text-m3-primary">{selectedTableData.name}</span>
                    </h2>
                  </div>

                  <button
                    onClick={() => handleAddField(selectedTableData.name)}
                    className="p-1.5 px-3 bg-m3-primary text-white text-[11px] font-bold flex items-center gap-1 rounded-xl hover:opacity-90 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Attribute
                  </button>
                </div>

                {/* Attributes Columns Grid */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-m3-outline-variant/20 text-m3-on-surface-variant/80 font-black">
                        <th className="py-2 px-1">Key</th>
                        <th className="py-2">Column Name</th>
                        <th className="py-2">DataType</th>
                        <th className="py-2">Logical Target Context</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-m3-outline-variant/10">
                      {selectedTableData.fields.map((f, i) => (
                        <tr key={i} className="hover:bg-m3-surface-low/50">
                          <td className="py-2.5 px-1 font-mono">
                            {f.key ? (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                f.key === 'PK' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                f.key === 'FK' ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' :
                                'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              }`}>
                                {f.key}
                              </span>
                            ) : (
                              <span className="text-m3-outline-variant/40">—</span>
                            )}
                          </td>
                          <td className="py-2.5 font-bold font-mono text-m3-primary text-[12px]">{f.name}</td>
                          <td className="py-2.5 font-mono text-xs text-m3-on-surface-variant">{f.type}</td>
                          <td className="py-2.5 text-[11.5px] text-m3-on-surface-variant/90 leading-relaxed pr-2">{f.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Generated SQL DDL schema preview widget */}
            <div className="m3-card shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-m3-primary font-mono tracking-wider flex items-center gap-1.5">
                  <FileCode className="h-4 w-4 text-m3-primary" /> PostgreSQL DDL Blueprints
                </h4>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getSQLString());
                    alert('SQL blueprint copied to your clipboard!');
                  }}
                  className="px-2.5 py-1 text-[10px] uppercase font-bold border border-m3-outline bg-m3-surface-lowest text-m3-primary rounded hover:bg-m3-primary/10 cursor-pointer"
                >
                  Copy Source DDL
                </button>
              </div>

              <div className="bg-m3-surface-container rounded-xl p-3 border border-m3-outline-variant/40 overflow-x-auto max-h-56">
                <pre className="text-[10px] font-mono text-m3-on-surface-variant leading-relaxed select-all">
                  {getSQLString()}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RBAC MATRIX TAB */}
      {activeTab === 'rbac' && (
        <div className="space-y-6">
          <div className="m3-card shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-m3-outline-variant/15 pb-3">
              <div>
                <h3 className="text-sm font-bold tracking-tight text-m3-primary flex items-center gap-1">
                  <ShieldAlert className="h-4.5 w-4.5" /> Client-Side RBAC Policy Guard Matrix
                </h3>
                <p className="text-xs text-m3-on-surface-variant">
                  Dynamic policy restrictions associated with simulated employee accounts
                </p>
              </div>
            </div>

            {/* Policy authorization metrics table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-m3-outline-variant/35 text-m3-on-surface-variant font-black">
                    <th className="py-2 px-2 text-left">Enterprise Operation</th>
                    <th className="py-2 text-center text-red-500">Sophia Reyes (Admin)</th>
                    <th className="py-2 text-center text-amber-500">Juan Diaz (Manager)</th>
                    <th className="py-2 text-center text-indigo-500">Carla Cruz (Cashier)</th>
                    <th className="py-2 text-center text-emerald-500">Santi Santos (Staff)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-m3-outline-variant/10 font-bold">
                  <tr>
                    <td className="py-3 px-2 text-m3-on-surface">Manage Employees Profile / Setup</td>
                    <td className="py-3 text-center text-emerald-500">✅ Authorized</td>
                    <td className="py-3 text-center text-red-500">🚫 Restricted</td>
                    <td className="py-3 text-center text-red-500">🚫 Restricted</td>
                    <td className="py-3 text-center text-red-500">🚫 Restricted</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2 text-m3-on-surface">Edit Store Outlet Registers</td>
                    <td className="py-3 text-center text-emerald-500">✅ Authorized</td>
                    <td className="py-3 text-center text-red-500">🚫 Restricted</td>
                    <td className="py-3 text-center text-red-500">🚫 Restricted</td>
                    <td className="py-3 text-center text-red-500">🚫 Restricted</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2 text-m3-on-surface">Procurement Approval / Order Signing</td>
                    <td className="py-3 text-center text-emerald-500">✅ Authorized</td>
                    <td className="py-3 text-center text-emerald-500">✅ Authorized</td>
                    <td className="py-3 text-center text-red-500">🚫 Restricted</td>
                    <td className="py-3 text-center text-red-500">🚫 Restricted</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2 text-m3-on-surface">Initiate Daily Cash Drawers Shift</td>
                    <td className="py-3 text-center text-emerald-500">✅ Authorized</td>
                    <td className="py-3 text-center text-emerald-500">✅ Authorized</td>
                    <td className="py-3 text-center text-emerald-500">✅ Log In Active</td>
                    <td className="py-3 text-center text-red-500">🚫 Restricted</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2 text-m3-on-surface">Sales Terminal Bill Checkout Mode</td>
                    <td className="py-3 text-center text-emerald-500">✅ Authorized</td>
                    <td className="py-3 text-center text-emerald-500">✅ Authorized</td>
                    <td className="py-3 text-center text-emerald-500">✅ Checkout active</td>
                    <td className="py-3 text-center text-red-500">🚫 Restricted (Staff Blocked)</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2 text-m3-on-surface">Warehouse Stock Counts & Movements</td>
                    <td className="py-3 text-center text-emerald-500">✅ Authorized</td>
                    <td className="py-3 text-center text-emerald-500">✅ Authorized</td>
                    <td className="py-3 text-center text-emerald-500">✅ Authorized</td>
                    <td className="py-3 text-center text-emerald-500">✅ Stock-checking Floor</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="android-glass rounded-[24px] p-5 border border-m3-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase text-m3-primary font-mono tracking-wider flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> Test Guard Restriction
              </h4>
              <p className="text-[11px] text-m3-on-surface-variant leading-relaxed">
                Want to see the RBAC guard in active operation? Switch your simulated identity to Santi Santos (Staff) using the top role dropdown, navigate to the **POS Checkout Mode** tab, and attempt to checkout. The system will throw a beautiful and descriptive policy restriction blocker!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* NETWORK TOPO LOGS TAB */}
      {activeTab === 'topology' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Local LAN Topology description */}
          <div className="lg:col-span-5 space-y-4">
            <div className="m3-card shadow-sm space-y-4">
              <h3 className="text-sm font-bold tracking-tight text-m3-primary flex items-center gap-2">
                <Network className="h-4.5 w-4.5" /> Store Offline LAN Topology
              </h3>
              <p className="text-xs text-m3-on-surface-variant leading-relaxed">
                Our application is engineered with a **local-first PWA-aware** strategy. Staff floor devices talk directly to the store central Node.js Vite server within the local Wi-Fi router subnet block.
              </p>

              {/* Topology visually list */}
              <div className="space-y-3 pt-2.5">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0 flex items-center justify-center font-bold text-xs ring-1 ring-emerald-500/20">
                    S1
                  </div>
                  <div>
                    <span className="text-xs font-black block">Hub Dev Root Node</span>
                    <span className="text-[10px] text-m3-on-surface-variant font-mono">http://192.168.1.150:3000 (Local access)</span>
                  </div>
                </div>

                <div className="h-5 border-l border-m3-outline-variant/40 ml-4 border-dashed" />

                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0 flex items-center justify-center font-bold text-xs ring-1 ring-indigo-500/20">
                    C0
                  </div>
                  <div>
                    <span className="text-xs font-black block">Offline-First cache Engine</span>
                    <span className="text-[10px] text-m3-on-surface-variant font-mono">Browser LocalStorage durable persistent state key</span>
                  </div>
                </div>

                <div className="h-5 border-l border-m3-outline-variant/40 ml-4 border-dashed" />

                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-500 shrink-0 flex items-center justify-center font-bold text-xs ring-1 ring-amber-500/20">
                    D2
                  </div>
                  <div>
                    <span className="text-xs font-black block">Multi-Client Handshakes</span>
                    <span className="text-[10px] text-m3-on-surface-variant font-mono">Staff Smartphones simultaneously connected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Audit logger feed summary detail */}
          <div className="lg:col-span-7 space-y-4">
            <div className="m3-card shadow-sm space-y-3">
              <h3 className="text-sm font-bold tracking-tight text-m3-primary flex items-center gap-1">
                <Flame className="h-4.5 w-4.5 text-m3-primary" /> Active Core Logs (Operational Audit Trace)
              </h3>
              <p className="text-xs text-m3-on-surface-variant mb-4">
                Real-time activity logs proving the multi-tenant branch-awareness and RBAC audit trail is writing successfully:
              </p>

              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {auditLogs.map((log, idx) => (
                  <div key={idx} className="flex justify-between items-start text-xs border-b border-m3-outline-variant/10 pb-2.5 last:border-0 last:pb-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[8.5px] uppercase px-2 py-0.5 rounded font-mono font-bold border ${
                          log.action.includes('ALERT') || log.action.includes('RESTR') || log.action.includes('DELETE')
                            ? 'bg-m3-primary/15 text-m3-primary border-m3-primary/20'
                            : log.action.includes('CHECKOUT') || log.action.includes('RECEIVE')
                            ? 'bg-m3-tertiary/15 text-m3-tertiary border-m3-tertiary/20'
                            : 'bg-m3-secondary-container text-m3-on-secondary-container border-m3-outline-variant/30'
                        }`}>
                          {log.action}
                        </span>
                        <span className="text-[10px] text-m3-on-surface-variant font-mono">
                          by {log.username || 'system'}
                        </span>
                      </div>
                      <p className="text-m3-on-surface font-semibold pl-0.5">{log.description}</p>
                    </div>
                    <div className="text-right text-[10px] text-m3-on-surface-variant font-mono shrink-0 ml-4">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 1 DELIVERABLES PROGRESS TAB */}
      {activeTab === 'checklist' && (
        <div className="m3-card shadow-sm space-y-4">
          <div className="border-b border-m3-outline-variant/15 pb-3">
            <h3 className="text-sm font-bold tracking-tight text-m3-primary">
              Phase 1 Deliverables Verification Map
            </h3>
            <p className="text-xs text-m3-on-surface-variant">
              The complete Week 1-2 foundation components required are fully developed and proven:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {checklist.map(item => (
              <div
                key={item.id}
                onClick={() => handleToggleChecklist(item.id)}
                className={`p-4 rounded-xl border flex items-start gap-3.5 cursor-pointer transition-all select-none ${
                  item.checked
                    ? 'bg-m3-primary/15 border-m3-primary text-m3-on-surface'
                    : 'bg-m3-surface-low border-m3-outline-variant/30 hover:bg-m3-primary/10 text-m3-on-surface-variant'
                }`}
              >
                <div className="pt-0.5">
                  <CheckCircle2 className={`h-5 w-5 ${item.checked ? 'text-m3-primary fill-m3-primary/10' : 'text-m3-outline-variant/60'}`} />
                </div>
                <div>
                  <h4 className={`text-xs font-extrabold ${item.checked ? 'text-m3-primary' : 'text-m3-on-surface-variant'}`}>
                    {item.text}
                  </h4>
                  <p className="text-[10.5px] text-m3-on-surface-variant/80 mt-1 leading-normal">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="android-glass border border-m3-primary/25 rounded-2xl p-4 mt-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-m3-primary/10 text-m3-primary shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-m3-primary uppercase font-mono tracking-wider">
                  Phase 1 Sign-Off Status
                </h4>
                <p className="text-[11px] text-m3-on-surface-variant mt-1">
                  All 7 structural core deliverables are finalized and verified green by the compiler. Ready to proceed to Phase 2 (Advanced Logistics and Shift Sync)!
                </p>
              </div>
            </div>
            
            <span className="text-[10px] font-mono font-black uppercase text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full animate-pulse">
              100% COMPLETE
            </span>
          </div>
        </div>
      )}

      {/* SYSTEM TOAST ALERT */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-950 border border-m3-outline-variant/40 p-4 rounded-2xl shadow-2xl max-w-sm animate-fade-in flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-m3-primary animate-ping shrink-0" />
          <span className="text-xs font-bold text-white leading-tight">{toastMessage}</span>
        </div>
      )}

      {/* DATABASE MAINTENANCE TAB */}
      {activeTab === 'operations' && (
        <div className="space-y-6">
          {/* Main Console Box */}
          <div className="m3-card shadow-sm space-y-4">
            <div className="border-b border-m3-outline-variant/15 pb-3">
              <h3 className="text-sm font-black text-m3-primary uppercase font-mono tracking-wider">
                Database Engine Maintenance & Purge Center
              </h3>
              <p className="text-xs text-m3-on-surface-variant mt-1">
                Admin-level tools to execute factory truncation, clearing database tables, or resetting test schemas to pristine seed values.
              </p>
            </div>

            {/* Diagnostic Row Meters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-m3-surface-low border border-m3-outline-variant/15 text-left">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest font-mono">Receipts/Sales</span>
                <div className="text-xl font-black mt-1 leading-none text-m3-primary">{sales ? sales?.length : 0}</div>
                <span className="text-[9px] text-m3-on-surface-variant/75 block mt-1">Active Row Counts</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-m3-surface-low border border-m3-outline-variant/15 text-left">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest font-mono">Catalog Products</span>
                <div className="text-xl font-black mt-1 leading-none text-m3-primary">{products ? products?.length : 0}</div>
                <span className="text-[9px] text-m3-on-surface-variant/75 block mt-1">Design Materials</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-m3-surface-low border border-m3-outline-variant/15 text-left">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest font-mono">Supplying Brokers</span>
                <div className="text-xl font-black mt-1 leading-none text-m3-primary">{suppliers ? suppliers?.length : 0}</div>
                <span className="text-[9px] text-m3-on-surface-variant/75 block mt-1">Active Registries</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-m3-surface-low border border-m3-outline-variant/15 text-left">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest font-mono">Logistics Transfers</span>
                <div className="text-xl font-black mt-1 leading-none text-m3-primary">{stockTransfers ? stockTransfers?.length : 0}</div>
                <span className="text-[9px] text-m3-on-surface-variant/75 block mt-1">Interbranch Transfers</span>
              </div>
            </div>

            {/* Warn block */}
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex gap-3 text-left">
              <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black text-rose-500 uppercase tracking-wide">
                  CRITICAL ADMINISTRATIVE WARNING & HAZARD AREA
                </h4>
                <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed">
                  Truncation drop operations delete client records instantly. Data is erased from the local device storage completely. If you execute a factory reset/truncate, please ensure no live terminal is actively checkout processing offline cache operations.
                </p>
              </div>
            </div>

            {/* Operation Command Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Card 1: Truncate All Transactions */}
              <div className="p-5 rounded-[24px] border border-m3-outline-variant/20 hover:border-m3-primary/30 transition-all bg-m3-surface-low/50 text-left flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                    🧹
                  </div>
                  <h4 className="text-sm font-black text-white leading-tight uppercase font-sans">
                    Purge Transactions
                  </h4>
                  <p className="text-[10.5px] text-zinc-400 leading-normal font-sans">
                    Truncate all checkout invoices, shift counts, purchase vouchers, and stock logs. Resets global branch inventories to 0 while keeping your catalog taxonomy intact.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleTruncateAction('transactions')}
                  className="w-full text-center mt-5 py-2.5 rounded-xl text-xs font-black uppercase text-amber-500 border border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer active:scale-[0.98] transition-all"
                >
                  Truncate Sales & Logs
                </button>
              </div>

              {/* Card 2: Factory Deep Reset */}
              <div className="p-5 rounded-[24px] border border-m3-outline-variant/20 hover:border-m3-primary/30 transition-all bg-m3-surface-low/50 text-left flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-9 w-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
                    🔥
                  </div>
                  <h4 className="text-sm font-black text-white leading-tight uppercase font-sans">
                    Deep Blank Slate Reset
                  </h4>
                  <p className="text-[10.5px] text-zinc-400 leading-normal font-sans">
                    Wipes out absolutely every table record including Products designs, Supplier catalogs, Sales, and Transfers. Yields a 100% empty workspace. Prevents session logout.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleTruncateAction('all')}
                  className="w-full text-center mt-5 py-2.5 rounded-xl text-xs font-black uppercase text-rose-500 border border-rose-500/25 bg-rose-500/5 hover:bg-rose-500/10 cursor-pointer active:scale-[0.98] transition-all"
                >
                  Truncate All Tables
                </button>
              </div>

              {/* Card 3: Restore Seeds */}
              <div className="p-5 rounded-[24px] border border-m3-outline-variant/20 hover:border-m3-primary/30 transition-all bg-m3-surface-low/50 text-left flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                    🚀
                  </div>
                  <h4 className="text-sm font-black text-white leading-tight uppercase font-sans">
                    Reseed Seed Datasets
                  </h4>
                  <p className="text-[10.5px] text-zinc-400 leading-normal font-sans">
                    Instantly load benchmark tile SKUs, suppliers parameters, and computed transaction wave history patterns. Restores full simulation stats back to default.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleTruncateAction('seeds')}
                  className="w-full text-center mt-5 py-2.5 rounded-xl text-xs font-black uppercase text-emerald-500 border border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500/10 cursor-pointer active:scale-[0.98] transition-all"
                >
                  Factory Reseed Database
                </button>
              </div>
            </div>
          </div>

          {/* Prompt Dialog confirmatory step */}
          {confirmStep.mode && (
            <div className="m3-card border-rose-500/30 bg-rose-500/5 shadow-2xl p-6 text-left space-y-4 animate-fade-in">
              <div className="flex justify-between items-center border-b border-m3-outline-variant/15 pb-2">
                <h4 className="text-xs font-black uppercase text-rose-400 font-mono tracking-wider flex items-center gap-2">
                  🛡️ Security Check required to confirm truncate
                </h4>
                <button 
                  onClick={() => setConfirmStep({ mode: null, inputVal: '' })} 
                  className="text-xs hover:underline text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              {confirmStep.mode === 'seeds' ? (
                <div className="space-y-4">
                  <p className="text-xs text-zinc-300">
                    You are going to re-populate the entire database with pristine **benchmark seed records** (approx. 50+ sales receipts, 5+ product stock inventories, standard suppliers, and branch allocations). This will overwrite any manual amendments made during the sandbox session.
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={executeConfirmedTruncate}
                      className="py-2.5 px-6 rounded-xl bg-emerald-500 text-black text-xs font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
                    >
                      Process Reseed Database
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmStep({ mode: null, inputVal: '' })}
                      className="py-2.5 px-6 rounded-xl bg-zinc-900 border border-m3-outline-variant/20 text-white text-xs font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
                    >
                      Abort Procedure
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-zinc-300">
                    You are about to irreversibly truncate/wipe tables in mode: <strong className="text-rose-400 font-black uppercase">{confirmStep.mode}</strong>. 
                    Absolutely all stored values in local device storage cache under these matrices will be destroyed.
                  </p>
                  <p className="text-[11px] text-red-300 font-extrabold uppercase tracking-wide">
                    ⚠️ To authorize this destructive action, please type the word <strong className="text-white font-black underline bg-rose-950 px-2.5 py-1 rounded">TRUNCATE</strong> below:
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      placeholder="Type TRUNCATE to authorize"
                      value={confirmStep.inputVal}
                      onChange={(e) => setConfirmStep({ ...confirmStep, inputVal: e.target.value })}
                      className="bg-zinc-950 border border-rose-500/40 px-4 py-2.5 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-rose-500/60 font-mono flex-1 text-center font-black uppercase tracking-widest"
                    />
                    <button
                      type="button"
                      onClick={executeConfirmedTruncate}
                      className="py-2.5 px-6 rounded-xl bg-rose-500 text-black text-xs font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all hover:bg-rose-400 shadow-lg shadow-rose-500/10 min-w-[170px]"
                    >
                      Delete Core Records
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
