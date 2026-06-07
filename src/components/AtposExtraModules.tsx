/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Receipt, PlusCircle, Search, Calendar, FileText, 
  Printer, ArrowRight, DollarSign, Archive, RefreshCw, Layers, CheckCircle2,
  CalendarDays, Download, Info, CreditCard, UserPlus, AlertCircle
} from 'lucide-react';
import { useDb } from '../context/DbContext';

interface AtposExtraModulesProps {
  activeSubTab: string;
  darkMode: boolean;
  onNavigate: (tabId: string) => void;
}

// Durable local storage keys for persistence
const LOCAL_STORAGE_MEMBERS = 'atpos_v2_members_list';
const LOCAL_STORAGE_EXPENSES = 'atpos_v2_expenses';
const LOCAL_STORAGE_RETURNS = 'atpos_v2_returns';

interface Member {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  points: number;
  creditLimit: number;
  outstandingBalance: number;
  status: 'Active' | 'Suspended';
}

interface Expense {
  id: string;
  dateTime: string;
  category: string;
  amount: number;
  recordedBy: string;
  notes: string;
  branchId: string;
}

interface ProductReturn {
  id: string;
  saleId: string;
  productName: string;
  quantityReturned: number;
  amountRefunded: number;
  damageRestockFee: number;
  status: 'Restocked' | 'Defective/Damaged';
  dateTime: string;
}

export default function AtposExtraModules({ activeSubTab, darkMode, onNavigate }: AtposExtraModulesProps) {
  const db = useDb();
  
  // States
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [productReturns, setProductReturns] = useState<ProductReturn[]>([]);

  // Form states - Member
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberLimit, setNewMemberLimit] = useState(15000);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Form states - Expense
  const [expCategory, setExpCategory] = useState('Floor Supplies');
  const [expAmount, setExpAmount] = useState('');
  const [expNotes, setExpNotes] = useState('');
  const [expenseSearch, setExpenseSearch] = useState('');

  // Form states - Return product
  const [retSaleId, setRetSaleId] = useState('');
  const [retProduct, setRetProduct] = useState('');
  const [retQty, setRetQty] = useState('');
  const [retRef, setRetRef] = useState('');
  const [retFee, setRetFee] = useState('5'); // percent
  const [retStatus, setRetStatus] = useState<'Restocked' | 'Defective/Damaged'>('Restocked');

  const [printReceiptData, setPrintReceiptData] = useState<any>(null);
  const [dateFilter, setDateFilter] = useState('');

  // Initial Load
  useEffect(() => {
    const cachedMembers = localStorage.getItem(LOCAL_STORAGE_MEMBERS);
    if (cachedMembers) {
      setMembers(JSON.parse(cachedMembers));
    } else {
      const seed: Member[] = [];
      setMembers(seed);
      localStorage.setItem(LOCAL_STORAGE_MEMBERS, JSON.stringify(seed));
    }

    const cachedExpenses = localStorage.getItem(LOCAL_STORAGE_EXPENSES);
    if (cachedExpenses) {
      setExpenses(JSON.parse(cachedExpenses));
    } else {
      const seed: Expense[] = [];
      setExpenses(seed);
      localStorage.setItem(LOCAL_STORAGE_EXPENSES, JSON.stringify(seed));
    }

    const cachedReturns = localStorage.getItem(LOCAL_STORAGE_RETURNS);
    if (cachedReturns) {
      setProductReturns(JSON.parse(cachedReturns));
    } else {
      const seed: ProductReturn[] = [];
      setProductReturns(seed);
      localStorage.setItem(LOCAL_STORAGE_RETURNS, JSON.stringify(seed));
    }
  }, []);

  // Save utility triggers
  const saveMembers = (list: Member[]) => {
    setMembers(list);
    localStorage.setItem(LOCAL_STORAGE_MEMBERS, JSON.stringify(list));
  };
  const saveExpenses = (list: Expense[]) => {
    setExpenses(list);
    localStorage.setItem(LOCAL_STORAGE_EXPENSES, JSON.stringify(list));
  };
  const saveReturns = (list: ProductReturn[]) => {
    setProductReturns(list);
    localStorage.setItem(LOCAL_STORAGE_RETURNS, JSON.stringify(list));
  };

  // Add Member
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberPhone.trim()) return;
    
    const limitNum = Number(newMemberLimit);
    if (isNaN(limitNum) || limitNum < 0) {
      alert('⚠️ Credit limit must be a positive number.');
      return;
    }

    const m: Member = {
      id: 'M' + (members.length + 1) + '-' + Math.floor(Math.random() * 900 + 100),
      fullName: newMemberName.trim(),
      phone: newMemberPhone.trim(),
      email: newMemberEmail.trim() || 'none@specified.com',
      points: 10,
      creditLimit: limitNum,
      outstandingBalance: 0,
      status: 'Active'
    };
    saveMembers([...members, m]);
    
    db.addAuditLog(
      'MEMBER_REGISTER',
      `Registered member ${m.fullName} with credit ceiling of ₱${m.creditLimit.toLocaleString()}`,
      'Members',
      m.id
    );

    setNewMemberName('');
    setNewMemberPhone('');
    setNewMemberEmail('');
    setNewMemberLimit(15000);
    alert('🎉 Client Member registered successfully into main ledger!');
  };

  // Pay Account Receivables
  const handlePayBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !paymentAmount) return;
    const payNum = Number(paymentAmount);
    if (isNaN(payNum) || payNum <= 0) {
      alert('⚠️ Payment amount must be a positive number.');
      return;
    }
    if (payNum > selectedMember.outstandingBalance) {
      alert(`⚠️ Payment amount cannot exceed the outstanding balance of ₱${selectedMember.outstandingBalance.toLocaleString()}`);
      return;
    }

    const updated = members.map(m => {
      if (m.id === selectedMember.id) {
        const bal = Math.max(0, parseFloat((m.outstandingBalance - payNum).toFixed(2)));
        const pts = m.points + Math.floor(payNum / 100);
        return { ...m, outstandingBalance: bal, points: pts };
      }
      return m;
    });
    saveMembers(updated);

    db.addAuditLog(
      'MEMBER_PAYMENT',
      `Processed payment of ₱${payNum.toLocaleString()} for member ${selectedMember.fullName}. New Outstanding: ₱${Math.max(0, selectedMember.outstandingBalance - payNum).toLocaleString()}`,
      'Members',
      selectedMember.id
    );
    
    // Receipt Print Dialog Simulation
    setPrintReceiptData({
      title: 'AR PAYMENT RECEIPT',
      receiptNo: 'RCP-' + Math.floor(Math.random() * 89999 + 10000),
      customer: selectedMember.fullName,
      prevBalance: selectedMember.outstandingBalance,
      paid: payNum,
      newBalance: Math.max(0, selectedMember.outstandingBalance - payNum),
      pointsGained: Math.floor(payNum / 100),
      date: new Date().toLocaleString()
    });

    setPaymentAmount('');
    setSelectedMember(null);
  };

  // Add Expense
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(expAmount);
    if (!expAmount || isNaN(amountNum) || amountNum <= 0) {
      alert('⚠️ Please enter a valid positive petty cash amount.');
      return;
    }
    const entry: Expense = {
      id: 'EXP-' + (expenses.length + 1) + '-' + Math.floor(Math.random() * 900 + 100),
      dateTime: new Date().toISOString(),
      category: expCategory,
      amount: amountNum,
      recordedBy: db.currentUser?.fullName || 'Rejilyn Manaban',
      notes: expNotes || 'Casual office petty cash expense',
      branchId: db.currentUser?.branchAssignmentId || 'B1'
    };
    
    db.addAuditLog(
      'EXPENSE_LOG',
      `Spent ₱${amountNum.toLocaleString()} on ${expCategory}: ${entry.notes}`,
      'Expenses',
      entry.id
    );

    saveExpenses([entry, ...expenses]);
    setExpAmount('');
    setExpNotes('');
    alert('💸 Monthly branch expense securely registered & deducted from general branch ledger!');
  };

  // Add Product Return
  const handleAddReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!retSaleId || !retProduct || !retQty) return;
    
    const qtyReturnedNum = Number(retQty);
    const amountRefundedNum = Number(retRef) || 0;
    
    if (qtyReturnedNum <= 0) {
      alert('⚠️ Quantity returned must be greater than zero.');
      return;
    }
    if (amountRefundedNum < 0) {
      alert('⚠️ Refund amount cannot be negative.');
      return;
    }

    // Attempt to locate matching product in actual products database
    const foundProduct = db.products.find(
      p => p.productName.toLowerCase().includes(retProduct.toLowerCase()) || p.id === retProduct
    );

    const entry: ProductReturn = {
      id: 'RET-' + (productReturns.length + 1) + '-' + Math.floor(Math.random() * 900 + 100),
      saleId: retSaleId,
      productName: foundProduct ? foundProduct.productName : retProduct,
      quantityReturned: qtyReturnedNum,
      amountRefunded: amountRefundedNum,
      damageRestockFee: amountRefundedNum * (Number(retFee) / 100),
      status: retStatus,
      dateTime: new Date().toISOString()
    };

    // Robust database integration: Increase the stock level if product returned as restocked/good stock
    if (foundProduct) {
      if (retStatus === 'Restocked') {
        db.updateProduct(foundProduct.id, {
          stockQuantity: foundProduct.stockQuantity + qtyReturnedNum
        }, `Integrated Sales Return restock check: Ticket ${entry.id}`);
      }
      
      db.addAuditLog(
        'SALES_RETURN',
        `Logged product return of ${qtyReturnedNum}x "${foundProduct.productName}" (Refund: ₱${amountRefundedNum.toLocaleString()}). Restocked: ${retStatus === 'Restocked'}`,
        'Products',
        foundProduct.id
      );
    } else {
      db.addAuditLog(
        'SALES_RETURN',
        `Logged system-wide return of ${qtyReturnedNum}x "${retProduct}" (Refund: ₱${amountRefundedNum.toLocaleString()}). Restocked: ${retStatus === 'Restocked'}`,
        'Products',
        'N/A'
      );
    }

    saveReturns([entry, ...productReturns]);
    setRetSaleId('');
    setRetProduct('');
    setRetQty('');
    setRetRef('');
    alert(`🔄 Return settled! ${retStatus === 'Restocked' ? 'Stock count adjusted in active product ledger.' : 'Returned stock archived as damaged.'}`);
  };

  // BIR tax computation helpers using db.sales
  const totalSalesFromDay = db.sales.reduce((acc, s) => {
    if (s.voided) return acc;
    // enforce dynamic branch scoping if not admin
    if (db.currentUser?.role !== 'Admin' && s.branchId !== db.currentUser?.branchAssignmentId) {
      return acc;
    }
    return acc + s.netTotal;
  }, 0);

  const discountTotal = db.sales.reduce((acc, s) => {
    if (s.voided) return acc;
    if (db.currentUser?.role !== 'Admin' && s.branchId !== db.currentUser?.branchAssignmentId) {
      return acc;
    }
    return acc + s.discountAmount;
  }, 0);

  const vatOutput = totalSalesFromDay * 0.12;
  const netOfVat = totalSalesFromDay - vatOutput;

  return (
    <div className="space-y-6">
      
      {/* Dynamic Module Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 rounded-2xl bg-m3-surface-low border border-m3-outline-variant/20 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-m3-primary animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-m3-primary font-mono">TilePoint Enterprise Core</span>
          </div>
          <h2 className="text-xl font-bold font-sans text-m3-on-surface mt-1 capitalize leading-none">
            {activeSubTab.replace(/-/g, ' ')}
          </h2>
          <p className="text-xs text-m3-on-surface-variant font-medium mt-1.5">
            Operational and financial terminal connected to Emman Tile Point database.
          </p>
        </div>
        
        {/* Active Branch Tag */}
        <span className="self-start md:self-auto px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-m3-primary/10 text-m3-primary border border-m3-primary/25">
          📍 {db.currentUser?.branchAssignmentId === 'B1' ? 'EMMAN MAIN BRANCH' : 'BRANCH REGION B4'}
        </span>
      </div>

      {/* Render Receipt Printing dialogue */}
      {printReceiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-white text-zinc-900 rounded-2xl shadow-2xl p-5 font-mono text-xs border border-zinc-200 relative"
          >
            <div className="text-center pb-3 border-b-2 border-dashed border-zinc-300">
              <h3 className="font-extrabold text-sm tracking-wide">TILEPOINT CLOUD</h3>
              <p className="text-[10px]">EMMAN TILE POINT CENTER</p>
              <p className="text-[9px] text-zinc-500">101 Quezon Ave, Metro Manila</p>
              <p className="text-[10.5px] font-bold mt-2 uppercase">{printReceiptData.title}</p>
            </div>

            <div className="py-4 space-y-1.5 border-b-2 border-dashed border-zinc-300 text-[11px]">
              <div className="flex justify-between">
                <span>Receipt No:</span>
                <span className="font-bold">{printReceiptData.receiptNo}</span>
              </div>
              <div className="flex justify-between">
                <span>Date Tracked:</span>
                <span>{printReceiptData.date}</span>
              </div>
              <div className="flex justify-between">
                <span>Client Name:</span>
                <span className="font-bold">{printReceiptData.customer}</span>
              </div>
              <div className="h-px bg-zinc-200 my-2" />
              {printReceiptData.prevBalance !== undefined && (
                <div className="flex justify-between">
                  <span>Previous A/R Bal:</span>
                  <span>₱{printReceiptData.prevBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-emerald-600 font-extrabold">
                <span>Pymt Tendered:</span>
                <span>₱{printReceiptData.paid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              {printReceiptData.newBalance !== undefined && (
                <div className="flex justify-between font-bold border-t border-zinc-200 pt-1">
                  <span>New Balance Due:</span>
                  <span>₱{printReceiptData.newBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>

            <div className="text-center pt-3 space-y-3">
              <div className="bg-emerald-50 text-emerald-800 p-2 rounded-lg text-[10px] font-bold">
                Loyalty points accredited: +{printReceiptData.pointsGained} pts
              </div>
              <p className="text-[9px] text-zinc-400">BIR Permitted System - Official Receipt copy.</p>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => window.print()}
                  className="flex-1 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Printer className="h-3 w-3" /> Print
                </button>
                <button 
                  onClick={() => setPrintReceiptData(null)}
                  className="flex-1 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-bold transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* RENDER DYNAMIC EXTRA VIEW CHUNKS */}
      <AnimatePresence mode="wait">
        
        {/* Category: 1. Members (Collapsible options) */}
        {activeSubTab === 'members-manage' && (
          <motion.div key="members" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1 bg-m3-surface-low border border-m3-outline-variant/15 p-5 rounded-2xl h-fit space-y-4">
              <div className="flex items-center gap-2 text-m3-primary border-b border-m3-outline-variant/10 pb-3">
                <UserPlus className="h-5 w-5" />
                <h3 className="font-bold text-sm">Register New Corporate Member</h3>
              </div>
              <form onSubmit={handleAddMember} className="space-y-3 font-sans text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-m3-on-surface-variant">Full Client Name *</label>
                  <input required value={newMemberName} onChange={e => setNewMemberName(e.target.value)} type="text" placeholder="Juan Perez Inc." className="w-full bg-m3-surface-high border border-m3-outline-variant rounded-lg p-2.5 outline-none focus:border-m3-primary" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-m3-on-surface-variant">Active Mobile Phone *</label>
                  <input required value={newMemberPhone} onChange={e => setNewMemberPhone(e.target.value)} type="tel" placeholder="0917-000-0000" className="w-full bg-m3-surface-high border border-m3-outline-variant rounded-lg p-2.5 outline-none focus:border-m3-primary" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-m3-on-surface-variant">Email Address</label>
                  <input value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} type="email" placeholder="perez@gmail.com" className="w-full bg-m3-surface-high border border-m3-outline-variant rounded-lg p-2.5 outline-none focus:border-m3-primary" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-m3-on-surface-variant">Credit Account Limit (PHP)</label>
                  <input value={newMemberLimit} onChange={e => setNewMemberLimit(Number(e.target.value))} type="number" className="w-full bg-m3-surface-high border border-m3-outline-variant rounded-lg p-2.5 outline-none focus:border-m3-primary" />
                </div>
                <button type="submit" className="w-full bg-m3-primary text-m3-on-primary py-2.5 rounded-xl font-bold transition hover:opacity-90">
                  Submit Customer Info
                </button>
              </form>
            </div>

            <div className="md:col-span-2 space-y-4">
              <div className="flex bg-m3-surface-low border border-m3-outline-variant/15 p-2 rounded-xl items-center gap-2 font-sans text-xs">
                <Search className="h-4 w-4 text-m3-on-surface-variant pl-1" />
                <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Filter customer database..." className="w-full bg-transparent border-0 outline-none p-1.5" />
              </div>

              <div className="bg-m3-surface-low border border-m3-outline-variant/15 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left font-sans text-xs">
                  <thead className="bg-m3-surface-high/50 font-bold border-b border-m3-outline-variant/15">
                    <tr>
                      <th className="p-3">Client Member</th>
                      <th className="p-3">Contact</th>
                      <th className="p-3 text-right">Points</th>
                      <th className="p-3 text-right">Credit Limit</th>
                      <th className="p-3 text-right">Current Accounts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.filter(m => m.fullName.toLowerCase().includes(memberSearch.toLowerCase())).map(m => (
                      <tr key={m.id} className="border-b border-m3-outline-variant/10 hover:bg-m3-primary/5 transition-all">
                        <td className="p-3 font-semibold text-m3-on-surface flex items-center gap-2">
                          <Users className="h-4 w-4 text-m3-primary" />
                          <div>
                            <div>{m.fullName}</div>
                            <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{m.id}</div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div>{m.phone}</div>
                          <div className="text-[10px] text-zinc-400">{m.email}</div>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-amber-500">{m.points} ★</td>
                        <td className="p-3 text-right font-mono">₱{m.creditLimit.toLocaleString('en-US')}</td>
                        <td className="p-3 text-right font-mono text-rose-500 font-extrabold">₱{m.outstandingBalance.toLocaleString('en-US')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Category: 2. Account Receivables (Collapsible options) */}
        {activeSubTab === 'members-receivables' && (
          <motion.div key="receivables" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-5 rounded-2xl space-y-4">
                <h3 className="font-bold text-sm text-m3-primary">Settle Customer Account Ledger</h3>
                
                <div className="space-y-2 font-sans text-xs">
                  <label className="font-bold text-m3-on-surface-variant">Select Account Client *</label>
                  <div className="space-y-1 max-h-48 overflow-y-auto border border-m3-outline-variant rounded-lg divide-y divide-m3-outline-variant/15">
                    {members.filter(m => m.outstandingBalance > 0).map(m => (
                      <button 
                        key={m.id}
                        onClick={() => setSelectedMember(m)}
                        className={`w-full text-left p-3 flex justify-between cursor-pointer transition ${
                          selectedMember?.id === m.id ? 'bg-m3-primary/10 border-l-4 border-m3-primary font-bold' : 'hover:bg-m3-primary/5'
                        }`}
                      >
                        <div>
                          <span>{m.fullName}</span>
                          <span className="text-[10px] block text-zinc-400">Limit: ₱{m.creditLimit.toLocaleString()}</span>
                        </div>
                        <span className="text-rose-500 font-mono">₱{m.outstandingBalance.toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedMember && (
                  <form onSubmit={handlePayBalance} className="space-y-4 font-sans text-xs pt-3 animate-fade-in border-t border-m3-outline-variant/15">
                    <div className="flex justify-between items-center bg-m3-primary/5 p-3 rounded-xl border border-m3-primary/10">
                      <div>
                        <span className="text-[10px] text-m3-primary font-bold uppercase block">Selected Account Billing</span>
                        <span className="font-extrabold text-sm">{selectedMember.fullName}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-500 block">Balance Due</span>
                        <span className="text-sm font-black text-rose-500">₱{selectedMember.outstandingBalance.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-m3-on-surface-variant">Amount to Tender (PHP) *</label>
                      <input 
                        type="number"
                        required
                        value={paymentAmount}
                        onChange={e => setPaymentAmount(e.target.value)}
                        placeholder="e.g. 5000"
                        className="w-full bg-m3-surface-high border border-m3-outline-variant rounded-lg p-2.5 outline-none font-mono focus:border-m3-primary"
                        max={selectedMember.outstandingBalance}
                      />
                    </div>

                    <button type="submit" className="w-full bg-m3-primary text-m3-on-primary py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer">
                      <CreditCard className="h-4 w-4" />
                      Process Payment & Print Slip
                    </button>
                  </form>
                )}
              </div>

              {/* CRM Statistics */}
              <div className="space-y-4">
                <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-5 rounded-2xl grid grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-100 dark:bg-zinc-800/40 rounded-xl border border-m3-outline-variant/10">
                    <span className="text-[10px] font-bold text-zinc-400 block uppercase font-mono">Total Outstanding A/R</span>
                    <span className="text-lg font-black text-rose-500 font-mono">
                      ₱{members.reduce((acc, m) => acc + m.outstandingBalance, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-4 bg-zinc-100 dark:bg-zinc-800/40 rounded-xl border border-m3-outline-variant/10">
                    <span className="text-[10px] font-bold text-zinc-400 block uppercase font-mono">Overdue Accounts Limit</span>
                    <span className="text-lg font-black text-amber-500 font-mono">
                      {members.filter(m => m.outstandingBalance > m.creditLimit * 0.8).length} clients
                    </span>
                  </div>
                </div>

                <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-5 rounded-2xl text-xs space-y-3 font-sans">
                  <div className="flex items-center gap-1.5 font-bold text-zinc-400 pb-2 border-b border-m3-outline-variant/10">
                    <Info className="h-4 w-4 text-m3-primary" />
                    <span>Credit Allocation Protocols</span>
                  </div>
                  <p className="text-m3-on-surface-variant leading-relaxed">
                    Account Receivables represent outstanding corporate project orders allowed for trusted local tile contractors and builders. Invoices are capped dynamically according to pre-allocated Credit Limit profiles. Overdue accounts trigger warning colors at checkout.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Category: 3. Expenses Hub */}
        {activeSubTab === 'expenses-add' && (
          <motion.div key="expenses" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1 bg-m3-surface-low border border-m3-outline-variant/15 p-5 rounded-2xl h-fit space-y-4">
              <h3 className="font-bold text-sm text-m3-primary border-b border-m3-outline-variant/10 pb-3 flex items-center gap-1.5">
                <PlusCircle className="h-5 w-5" />
                Deduct Branch Cash Expense
              </h3>
              <form onSubmit={handleAddExpense} className="space-y-3 font-sans text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-m3-on-surface-variant">Expense Classification *</label>
                  <select value={expCategory} onChange={e => setExpCategory(e.target.value)} className="w-full bg-m3-surface-high border border-m3-outline-variant rounded-lg p-2.5 outline-none focus:border-m3-primary">
                    <option value="Floor Supplies">Floor Supplies</option>
                    <option value="Delivery Gas">Delivery Gas</option>
                    <option value="Snacks / Snacks Meetings">Snacks / Snacks Meetings</option>
                    <option value="Office Stationery">Office Stationery</option>
                    <option value="Utility Repairs">Utility Repairs</option>
                    <option value="Showroom Lightings">Showroom Lightings</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-m3-on-surface-variant">Amount Disbursed (PHP) *</label>
                  <input required value={expAmount} onChange={e => setExpAmount(e.target.value)} type="number" placeholder="500" className="w-full bg-m3-surface-high border border-m3-outline-variant rounded-lg p-2.5 font-mono outline-none focus:border-m3-primary" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-m3-on-surface-variant">Detailed Notes / Vendor *</label>
                  <textarea rows={3} value={expNotes} onChange={e => setExpNotes(e.target.value)} placeholder="Bought extra heavy mop for the main hall tiles..." className="w-full bg-m3-surface-high border border-m3-outline-variant rounded-lg p-2.5 outline-none focus:border-m3-primary" />
                </div>
                <button type="submit" className="w-full bg-m3-primary text-m3-on-primary py-2.5 rounded-xl font-bold transition hover:opacity-90 flex items-center justify-center gap-1.5 cursor-pointer">
                  <DollarSign className="h-4 w-4" /> 
                  Confirm Petty Cash Payout
                </button>
              </form>
            </div>

            <div className="md:col-span-2 space-y-4">
              <div className="flex bg-m3-surface-low border border-m3-outline-variant/15 p-2 rounded-xl items-center gap-2 font-sans text-xs">
                <Search className="h-4 w-4 text-m3-on-surface-variant pl-1" />
                <input value={expenseSearch} onChange={e => setExpenseSearch(e.target.value)} placeholder="Filter disbursements..." className="w-full bg-transparent border-0 outline-none p-1.5" />
              </div>

              <div className="bg-m3-surface-low border border-m3-outline-variant/15 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left font-sans text-xs">
                  <thead className="bg-m3-surface-high/50 font-bold border-b border-m3-outline-variant/15">
                    <tr>
                      <th className="p-3">Track Info</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Officer</th>
                      <th className="p-3">Branch ID</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.filter(ex => ex.notes.toLowerCase().includes(expenseSearch.toLowerCase()) || ex.category.toLowerCase().includes(expenseSearch.toLowerCase())).map(ex => (
                      <tr key={ex.id} className="border-b border-m3-outline-variant/10 hover:bg-m3-primary/5 transition-all">
                        <td className="p-3 font-semibold text-m3-on-surface">
                          <div>{ex.notes}</div>
                          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{new Date(ex.dateTime).toLocaleString('en-US')}</div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-m3-secondary-container text-m3-on-secondary-container">
                            {ex.category}
                          </span>
                        </td>
                        <td className="p-3 text-zinc-400 font-bold">{ex.recordedBy}</td>
                        <td className="p-3 text-zinc-400 font-mono">{ex.branchId}</td>
                        <td className="p-3 text-right font-mono text-rose-500 font-bold">-₱{ex.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Dummy/Placeholder screen if people click Search Expenses option */}
        {activeSubTab === 'expenses-search' && (
          <motion.div key="expenses-search-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex bg-m3-surface-low border border-m3-outline-variant/15 p-4 rounded-xl items-center justify-between font-sans text-xs gap-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-m3-primary" />
                <span className="font-extrabold">Filter Audit Cycle:</span>
                <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="bg-m3-surface-high border border-m3-outline-variant rounded p-1 outline-none" />
              </div>
              <button 
                onClick={() => {
                  alert('📊 Excel ledger report compiled & downloaded successfully!');
                }}
                className="py-1.5 px-3 rounded bg-m3-primary text-m3-on-primary font-bold transition flex items-center gap-1 border-0 cursor-pointer"
              >
                <Download className="h-3 w-5" /> Export Excel
              </button>
            </div>
            
            <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-5 rounded-2xl text-center space-y-4 py-12">
              <Archive className="h-10 w-10 text-m3-primary/30 mx-auto" />
              <div>
                <h3 className="font-bold text-sm">Disbursement Registry Records</h3>
                <p className="text-xs text-m3-on-surface-variant max-w-sm mx-auto mt-1">
                  Showing historical audits. Filter by category, timeline, or employee above to reconcile outstanding showroom drawers.
                </p>
              </div>

              <div className="max-w-2xl mx-auto border border-m3-outline-variant/15 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left font-sans text-xs">
                  <thead className="bg-m3-surface-high/50">
                    <tr>
                      <th className="p-3">Receipt No</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Detail</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map(ex => (
                      <tr key={ex.id} className="border-b border-m3-outline-variant/10">
                        <td className="p-3 font-mono font-bold text-m3-primary">{ex.id}</td>
                        <td className="p-3">{ex.category}</td>
                        <td className="p-3 text-zinc-400">{ex.notes}</td>
                        <td className="p-3 text-right font-mono text-rose-500 font-bold">-₱{ex.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Category: 4. Product Returns Adjustments */}
        {activeSubTab === 'adjustments-return' && (
          <motion.div key="returns" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1 bg-m3-surface-low border border-m3-outline-variant/15 p-5 rounded-2xl h-fit space-y-4">
              <h3 className="font-bold text-sm text-m3-primary border-b border-m3-outline-variant/10 pb-3 flex items-center gap-1.5 animate-fade-in">
                <RefreshCw className="h-5 w-5" />
                Register Sales Return
              </h3>
              <form onSubmit={handleAddReturn} className="space-y-3 font-sans text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-m3-on-surface-variant">Original System Sale Receipt ID *</label>
                  <input required value={retSaleId} onChange={e => setRetSaleId(e.target.value)} type="text" placeholder="e.g. S-7011" className="w-full bg-m3-surface-high border border-m3-outline-variant rounded-lg p-2.5 font-bold outline-none focus:border-m3-primary" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-m3-on-surface-variant">Select Tile / Product Return *</label>
                  <input required value={retProduct} onChange={e => setRetProduct(e.target.value)} type="text" placeholder="Ceramic Floor Tile Carrara" className="w-full bg-m3-surface-high border border-m3-outline-variant rounded-lg p-2.5 outline-none focus:border-m3-primary" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-m3-on-surface-variant">Qty Returned *</label>
                    <input required value={retQty} onChange={e => setRetQty(e.target.value)} type="number" placeholder="1" className="w-full bg-m3-surface-high border border-m3-outline-variant rounded-lg p-2.5 outline-none focus:border-m3-primary" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-m3-on-surface-variant">Damage Fee %</label>
                    <select value={retFee} onChange={e => setRetFee(e.target.value)} className="w-full bg-m3-surface-high border border-m3-outline-variant rounded-lg p-2.5 outline-none focus:border-m3-primary">
                      <option value="5">5% fee</option>
                      <option value="10">10% fee</option>
                      <option value="15">15% fee</option>
                      <option value="0">0% fee</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-m3-on-surface-variant">Total Amount Refunded (PHP) *</label>
                  <input required value={retRef} onChange={e => setRetRef(e.target.value)} type="number" placeholder="580" className="w-full bg-m3-surface-high border border-m3-outline-variant rounded-lg p-2.5 outline-none font-mono focus:border-m3-primary" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-m3-on-surface-variant">Restocking Stock Status</label>
                  <div className="flex gap-4 p-2 bg-m3-surface-high border border-m3-outline-variant rounded-lg">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" checked={retStatus === 'Restocked'} onChange={() => setRetStatus('Restocked')} />
                      <span>Good Stock</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" checked={retStatus === 'Defective/Damaged'} onChange={() => setRetStatus('Defective/Damaged')} />
                      <span>Damaged/Defect</span>
                    </label>
                  </div>
                </div>
                <button type="submit" className="w-full bg-m3-primary text-m3-on-primary py-2.5 rounded-xl font-bold transition hover:opacity-90 flex items-center justify-center gap-1.5 cursor-pointer">
                  <CheckCircle2 className="h-4 w-4" /> 
                  Submit Sales Return
                </button>
              </form>
            </div>

            <div className="md:col-span-2 space-y-4">
              <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-5 rounded-2xl flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-m3-primary shrink-0 mt-0.5" />
                <div className="text-xs font-sans space-y-1">
                  <div className="font-bold text-m3-on-surface">Returned Stock & Accounting Policy</div>
                  <p className="text-m3-on-surface-variant leading-relaxed">
                    All processed customer returns add the tiles back into Warehouse Inventory immediately if logged as "Good Stock". Restocking charges are deducted dynamically from the net drawer payout. An automated credit voucher will be generated for the customer.
                  </p>
                </div>
              </div>

              <div className="bg-m3-surface-low border border-m3-outline-variant/15 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left font-sans text-xs">
                  <thead className="bg-m3-surface-high/50 font-bold border-b border-m3-outline-variant/15">
                    <tr>
                      <th className="p-3">Track Return</th>
                      <th className="p-3">Receipt Ref</th>
                      <th className="p-3">Inventory Status</th>
                      <th className="p-3 text-right">Fee Deduction</th>
                      <th className="p-3 text-right">Net Refunded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productReturns.map(rt => (
                      <tr key={rt.id} className="border-b border-m3-outline-variant/10 hover:bg-m3-primary/5 transition-all">
                        <td className="p-3">
                          <div className="font-bold text-m3-on-surface">{rt.productName}</div>
                          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{rt.id} · {new Date(rt.dateTime).toLocaleString('en-US')}</div>
                        </td>
                        <td className="p-3 font-mono font-black">{rt.saleId}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            rt.status === 'Restocked' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                          }`}>
                            {rt.status}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-zinc-400">₱{rt.damageRestockFee.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono text-emerald-500 font-extrabold">₱{rt.amountRefunded.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Category: 5. Suppliers Credits and payment schedule */}
        {activeSubTab === 'suppliers-credits' && (
          <motion.div key="credits" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              {db.suppliers.map((sup, index) => {
                // generate neat static credit amounts for suppliers
                const outstanding = (index * 20000 + 45000) % 150000;
                const creditLimit = 500000;
                return (
                  <div key={sup.id} className="bg-m3-surface-low border border-m3-outline-variant/15 p-5 rounded-2xl space-y-4 shadow-sm font-sans flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] text-zinc-400 font-mono block tracking-wider font-bold">Supplier {sup.id}</span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-500">Credited</span>
                      </div>
                      <h4 className="font-black text-sm text-m3-on-surface mt-1">{sup.name}</h4>
                      <p className="text-[11px] text-m3-on-surface-variant mt-1">{sup.contactPerson} · {sup.phone}</p>
                    </div>

                    <div className="pt-3 border-t border-m3-outline-variant/10 space-y-2 mt-4">
                      <div className="flex justify-between text-xs">
                        <span className="text-m3-on-surface-variant">Outstanding Accounts Payable:</span>
                        <span className="font-mono font-extrabold text-rose-500">₱{outstanding.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-800/60 h-2 rounded-full overflow-hidden">
                        <div style={{ width: `${(outstanding / creditLimit) * 100}%` }} className="bg-rose-500 h-full rounded-full" />
                      </div>
                      <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                        <span>Allocated Limit: ₱{creditLimit.toLocaleString()}</span>
                        <span>{Math.round((outstanding / creditLimit) * 100)}% utilized</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => alert(`📦 Sent payment dispatch authorization request to accounting for ${sup.name}!`)}
                      className="w-full py-1.5 bg-m3-primary/10 hover:bg-m3-primary text-m3-primary hover:text-m3-on-primary text-xs rounded-lg font-bold transition mt-3 cursor-pointer"
                    >
                      Authorize Payment
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Supplier Payment Calendar */}
        {activeSubTab === 'suppliers-calendar' && (
          <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-5 rounded-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-m3-outline-variant/10 pb-3">
                <h3 className="font-extrabold text-sm text-m3-primary flex items-center gap-1.5">
                  <Calendar className="h-5 w-5" />
                  Supplier Payment Calendar Cycle
                </h3>
                <span className="text-xs text-zinc-400">June 2026 Payments Term</span>
              </div>

              <div className="grid grid-cols-7 gap-2 max-w-4xl mx-auto font-sans">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="p-2 text-center text-xs font-black text-zinc-400 uppercase tracking-widest">{d}</div>
                ))}
                {/* Pad days for June 1 2026 being a Monday (pad 1 day) */}
                <div className="p-4 bg-zinc-100/10 rounded-xl" />
                {Array.from({ length: 30 }).map((_, i) => {
                  const day = i + 1;
                  const hasPayment = day === 5 || day === 15 || day === 25;
                  const supplierName = day === 5 ? 'Mariwasa Ceramics' : day === 15 ? 'Republic Cement' : 'Neltex Co';
                  return (
                    <div 
                      key={day} 
                      className={`p-3 min-h-24 border rounded-xl flex flex-col justify-between transition-all ${
                        hasPayment 
                          ? 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10' 
                          : 'border-m3-outline-variant/10 bg-m3-surface-high/20 hover:scale-[1.02]'
                      }`}
                    >
                      <span className="text-xs font-bold leading-none">{day}</span>
                      {hasPayment && (
                        <div className="text-[10px] text-amber-600 font-extrabold leading-tight">
                          💰 Payable Due: <span className="block italic text-zinc-400 mt-0.5">{supplierName}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Category: 6. BIR REPORTS TAX COMPLIANCE CENTER */}
        {(activeSubTab === 'bir-xz' || 
          activeSubTab === 'bir-summary' || 
          activeSubTab === 'bir-pwd' || 
          activeSubTab === 'bir-athletes' || 
          activeSubTab === 'bir-solo' || 
          activeSubTab === 'bir-senior20' || 
          activeSubTab === 'bir-senior5' || 
          activeSubTab === 'bir-regular') && (
          <motion.div key="bir-tax" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            
            {/* Tax compliance status badge cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-4 rounded-xl text-xs font-sans space-y-1">
                <span className="text-zinc-400 block font-bold uppercase tracking-wider text-[9px]">Vatable Sales Summary</span>
                <span className="text-sm font-black font-mono">₱{netOfVat.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-4 rounded-xl text-xs font-sans space-y-1">
                <span className="text-zinc-400 block font-bold uppercase tracking-wider text-[9px]">12% Output VAT Amount</span>
                <span className="text-sm font-black text-amber-500 font-mono">₱{vatOutput.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-4 rounded-xl text-xs font-sans space-y-1">
                <span className="text-zinc-400 block font-bold uppercase tracking-wider text-[9px]">Senior & Discount Deductions</span>
                <span className="text-sm font-black text-emerald-500 font-mono">₱{discountTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-4 rounded-xl text-xs font-sans space-y-1">
                <span className="text-zinc-400 block font-bold uppercase tracking-wider text-[9px]">Accredited Grand Net Sales</span>
                <span className="text-sm font-black text-emerald-500 font-mono">₱{totalSalesFromDay.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* BIR Readings Panel */}
            {activeSubTab === 'bir-xz' && (
              <div className="grid md:grid-cols-2 gap-6">
                
                {/* X Reading Card */}
                <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-5 rounded-2xl space-y-4 shadow-sm font-sans">
                  <div>
                    <h3 className="font-extrabold text-sm text-m3-primary uppercase font-mono tracking-wider">Generate Cashier X-Reading</h3>
                    <p className="text-xs text-m3-on-surface-variant mt-1">
                      Runs the system cumulative reading for the active terminal user shift session. Reconciles drawer payments without closing the grand cumulative counters.
                    </p>
                  </div>
                  <div className="p-4 bg-zinc-100 dark:bg-zinc-800/40 border border-m3-outline-variant/10 rounded-xl space-y-2 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span>Assigned Terminal:</span>
                      <span className="font-bold">TERM-01 (Emman Main)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Working Cashier:</span>
                      <span className="font-bold">{db.currentUser?.fullName || 'Rejilyn Manaban'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Subtotal Item Sales:</span>
                      <span>₱{(totalSalesFromDay + discountTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-rose-500">
                      <span>Deducted Vouchers:</span>
                      <span>-₱{discountTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-emerald-500 font-extrabold border-t border-dashed border-zinc-500/30 pt-1.5 text-xs">
                      <span>Cash In Drawer Match:</span>
                      <span>₱{totalSalesFromDay.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setPrintReceiptData({
                        title: 'BIR X-READING SLIP',
                        receiptNo: 'X-' + Math.floor(Math.random() * 89999 + 10000),
                        customer: db.currentUser?.fullName || 'Rejilyn Manaban',
                        date: new Date().toLocaleString(),
                        prevBalance: totalSalesFromDay + discountTotal,
                        paid: discountTotal,
                        newBalance: totalSalesFromDay,
                        pointsGained: 0
                      });
                    }}
                    className="w-full py-2.5 bg-m3-primary hover:bg-m3-primary/95 text-m3-on-primary rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                  >
                    <Printer className="h-4 w-4" /> Print Current X-Reading Slip
                  </button>
                </div>

                {/* Z Reading Card */}
                <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-5 rounded-2xl space-y-4 shadow-sm font-sans">
                  <div>
                    <h3 className="font-extrabold text-sm text-amber-500 uppercase font-mono tracking-wider">Generate Cumulative Z-Reading</h3>
                    <p className="text-xs text-m3-on-surface-variant mt-1">
                      Concludes all working shifts for the calendar day. Commits locked fiscal audit counts, calculates output taxation ledger, and resets cashier drawers. This is required for official BIR tax submissions.
                    </p>
                  </div>
                  <div className="p-4 bg-zinc-100 dark:bg-zinc-800/40 border border-m3-outline-variant/10 rounded-xl space-y-2 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span>Z-Reading Record #:</span>
                      <span className="font-bold text-amber-500">Z-RECOVERY-094</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Beg. Serial Balance:</span>
                      <span>₱5,420,910.00</span>
                    </div>
                    <div className="flex justify-between text-emerald-500">
                      <span>End. Accumulative Balance:</span>
                      <span>₱{(5420910.00 + totalSalesFromDay).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between border-t border-dashed border-zinc-500/30 pt-1.5">
                      <span>Total VAT Declared:</span>
                      <span>₱{vatOutput.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      if (confirm('⚠️ Generating Z-Reading locks cashier drawers for the calendar cycle. Proceed?')) {
                        setPrintReceiptData({
                          title: 'BIR CUMULATIVE Z-READING',
                          receiptNo: 'Z-' + Math.floor(Math.random() * 89999 + 10000),
                          customer: 'EMMAN TILE MAIN HQ',
                          date: new Date().toLocaleString(),
                          prevBalance: 5420910.00,
                          paid: totalSalesFromDay,
                          newBalance: 5420910.00 + totalSalesFromDay,
                          pointsGained: 0
                        });
                      }
                    }}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer text-xs border-0"
                  >
                    <CheckCircle2 className="h-4 w-4" /> 
                    Finalize & Lock Daily Z-Reading
                  </button>
                </div>
              </div>
            )}

            {/* BIR report Tables */}
            {activeSubTab !== 'bir-xz' && (
              <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-5 rounded-2xl overflow-hidden shadow-sm space-y-4">
                <div className="flex justify-between items-center bg-m3-surface-high/30 p-3 rounded-xl border border-m3-outline-variant/10 font-sans text-xs">
                  <span className="font-extrabold text-m3-primary uppercase font-mono tracking-wider">
                    {activeSubTab.replace('bir-', '').replace('-', ' ').toUpperCase()} LEDGER SHEETS
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => window.print()} className="py-1 px-2 text-[11px] bg-zinc-200 dark:bg-zinc-800 text-m3-on-surface rounded font-bold hover:bg-zinc-300 transition flex items-center gap-1 cursor-pointer border-0">
                      <Printer className="h-3.5 w-3.5" /> Print Sheets
                    </button>
                    <button onClick={() => alert('📥 System exported taxation file as CSV!')} className="py-1 px-2 text-[11px] bg-m3-primary text-m3-on-primary rounded font-bold hover:opacity-90 transition flex items-center gap-1 cursor-pointer border-0">
                      <Download className="h-3.5 w-3.5" /> Export CSV
                    </button>
                  </div>
                </div>

                <table className="w-full text-left font-sans text-xs divide-y divide-m3-outline-variant/15">
                  <thead className="bg-m3-surface-high/50 font-black border-b border-m3-outline-variant/15">
                    <tr>
                      <th className="p-3">Reference Date</th>
                      <th className="p-3">Receipt Code</th>
                      <th className="p-3">Purchaser Classification</th>
                      <th className="p-3 text-right">Taxable Sales</th>
                      <th className="p-3 text-right">BIR Deduction Applied</th>
                      <th className="p-3 text-right">Net VAT-Exempt Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-m3-outline-variant/10">
                    {db.sales.filter(s => !s.voided).map((s, idx) => {
                      // distribute some discount profiles across demo transactions
                      const isPwd = activeSubTab === 'bir-pwd' && idx % 2 === 0;
                      const isSenior20 = activeSubTab === 'bir-senior20' && idx % 3 === 0;
                      const isSenior5 = activeSubTab === 'bir-senior5' && idx % 3 === 1;
                      const isSolo = activeSubTab === 'bir-solo' && idx % 4 === 1;
                      const isAthletes = activeSubTab === 'bir-athletes' && idx % 5 === 2;
                      const isRegular = activeSubTab === 'bir-regular' && s.discountAmount > 0;
                      const isSummary = activeSubTab === 'bir-summary';

                      const matchesFilter = isSummary || isRegular || isPwd || isSenior20 || isSenior5 || isSolo || isAthletes;
                      if (!matchesFilter) return null;

                      const taxLabel = isPwd ? 'PWD Dsc. 20%' : isSenior20 ? 'Senior 20% Dsc.' : isSenior5 ? 'Senior 5% Special' : isSolo ? 'Solo Parent Dsc.' : isAthletes ? 'Athletes Dsc.' : 'Regular Promo';
                      const deductVal = s.discountAmount || (s.netTotal * 0.12);

                      return (
                        <tr key={s.id} className="hover:bg-m3-primary/5 transition-all text-m3-on-surface">
                          <td className="p-3 font-mono text-[10.5px] text-zinc-400">{new Date(s.dateTime).toLocaleString()}</td>
                          <td className="p-3 font-mono font-black text-m3-primary">{s.id}</td>
                          <td className="p-3 font-bold uppercase text-[10px]">
                            {s.customerName || 'Walk-In Customer'}
                            <span className="block font-mono text-[9px] text-zinc-400 font-normal lowercase tracking-wide mt-0.5">({taxLabel})</span>
                          </td>
                          <td className="p-3 text-right font-mono">₱{(s.netTotal * 0.88).toFixed(2)}</td>
                          <td className="p-3 text-right font-mono text-amber-500 font-bold">-₱{deductVal.toFixed(2)}</td>
                          <td className="p-3 text-right font-mono text-emerald-500 font-extrabold">₱{(s.netTotal - deductVal).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
}
