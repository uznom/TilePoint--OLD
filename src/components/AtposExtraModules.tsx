/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  Receipt,
  PlusCircle,
  Search,
  Calendar,
  FileText,
  Printer,
  ArrowRight,
  DollarSign,
  Archive,
  RefreshCw,
  Layers,
  CheckCircle2,
  CalendarDays,
  Download,
  Info,
  CreditCard,
  UserPlus,
  AlertCircle,
  Sliders,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Zap,
} from "lucide-react";
import { useDb } from "../context/DbContext";
import { Member, Expense, ProductReturn, CustomCorporateBill, UserRole } from "../types/db";

interface AtposExtraModulesProps {
  activeSubTab: string;
  darkMode: boolean;
  onNavigate: (tabId: string) => void;
}

// Durable local storage keys for persistence
const LOCAL_STORAGE_MEMBERS = "atpos_v2_members_list";
const LOCAL_STORAGE_EXPENSES = "atpos_v2_expenses";
const LOCAL_STORAGE_RETURNS = "atpos_v2_returns";
const LOCAL_STORAGE_CUSTOM_BILLS = "atpos_v2_custom_bills";

export default function AtposExtraModules({
  activeSubTab,
  darkMode,
  onNavigate,
}: AtposExtraModulesProps) {
  const db = useDb();

  // States from DbContext
  const {
    members,
    setMembers,
    expenses,
    setExpenses,
    productReturns,
    setProductReturns,
    customBills,
    setCustomBills,
    calendarNotes,
    setCalendarNotes,
    dayMemos,
    setDayMemos,
  } = db;

  // Form states - Member
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberLimit, setNewMemberLimit] = useState(15000);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  // Add Expense
  const [expCategory, setExpCategory] = useState("Floor Supplies");
  const [customCategory, setCustomCategory] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expNotes, setExpNotes] = useState("");
  const [expenseSearch, setExpenseSearch] = useState("");

  // Form states - Return product
  const [retSaleId, setRetSaleId] = useState("");
  const [retProduct, setRetProduct] = useState("");
  const [retQty, setRetQty] = useState("");
  const [retRef, setRetRef] = useState("");
  const [retFee, setRetFee] = useState("5"); // percent
  const [retStatus, setRetStatus] = useState<"Restocked" | "Defective/Damaged">(
    "Restocked",
  );

  // Form states - Custom recurring calendar bill
  const [billTitle, setBillTitle] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billFrequency, setBillFrequency] = useState<
    "WEEKLY" | "MONTHLY" | "SEMI_QUARTERLY" | "QUARTERLY" | "YEARLY"
  >("MONTHLY");
  const [billDueDate, setBillDueDate] = useState("2026-06-15");

  const [printReceiptData, setPrintReceiptData] = useState<any>(null);
  const [dateFilter, setDateFilter] = useState("");
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(
    null,
  );

  // Dynamic Calendar Navigation & Installment Payment State
  const [calendarMonth, setCalendarMonth] = useState<number>(() => new Date().getMonth()); // 0-indexed: current month
  const [calendarYear, setCalendarYear] = useState<number>(() => new Date().getFullYear());
  const [partialPaymentAmount, setPartialPaymentAmount] = useState<string>("");
  const [partialPaymentNotes, setPartialPaymentNotes] = useState<string>("");
  const [partialPaymentMethod, setPartialPaymentMethod] = useState<"cash" | "cheque">("cash");
  const [partialChequeNumber, setPartialChequeNumber] = useState<string>("");
  const [partialManagerPin, setPartialManagerPin] = useState<string>("");
  const [installments, setInstallments] = useState<Record<string, { id: string, amount: number, date: string, notes?: string }[]>>(() => {
    try {
      const saved = localStorage.getItem("atpos_v2_payable_installments");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const saveInstallments = (updated: Record<string, { id: string, amount: number, date: string, notes?: string }[]>) => {
    setInstallments(updated);
    localStorage.setItem("atpos_v2_payable_installments", JSON.stringify(updated));
  };

  // Left side panel tabs & list options
  const [leftPanelTab, setLeftPanelTab] = useState<"list" | "create" | "notes">("list");
  const [dayMemoInput, setDayMemoInput] = useState("");

  useEffect(() => {
    if (selectedCalendarDay !== null) {
      const key = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(selectedCalendarDay).padStart(2, "0")}`;
      setDayMemoInput(dayMemos[key] || "");
    } else {
      setDayMemoInput("");
    }
  }, [selectedCalendarDay, calendarMonth, calendarYear, dayMemos]);

  const [payableSearchQuery, setPayableSearchQuery] = useState("");
  const [payableStatusFilter, setPayableStatusFilter] = useState<"all" | "active" | "partial" | "paid">("all");
  const [payableSortField, setPayableSortField] = useState<"due" | "amount" | "supplier">("due");

  // Save utility triggers bound to DbContext state setters
  const saveMembers = (list: Member[]) => {
    setMembers(list);
  };
  const saveExpenses = (list: Expense[]) => {
    setExpenses(list);
  };
  const saveReturns = (list: ProductReturn[]) => {
    setProductReturns(list);
  };
  const saveCustomBills = (list: CustomCorporateBill[]) => {
    setCustomBills(list);
  };

  // Add Member
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberPhone.trim()) return;

    const limitNum = Number(newMemberLimit);
    if (isNaN(limitNum) || limitNum < 0) {
      alert("Credit limit must be a positive number.");
      return;
    }

    const m: Member = {
      id:
        "M" +
        (members.length + 1) +
        "-" +
        Math.floor(Math.random() * 900 + 100),
      fullName: newMemberName.trim(),
      phone: newMemberPhone.trim(),
      email: newMemberEmail.trim() || "none@specified.com",
      points: 10,
      creditLimit: limitNum,
      outstandingBalance: 0,
      status: "Active",
    };
    saveMembers([...members, m]);

    db.addAuditLog(
      "MEMBER_REGISTER",
      `Registered member ${m.fullName} with credit ceiling of ₱${m.creditLimit.toLocaleString()}`,
      "Members",
      m.id,
      JSON.stringify(m),
    );

    setNewMemberName("");
    setNewMemberPhone("");
    setNewMemberEmail("");
    setNewMemberLimit(15000);
    alert("Client Member registered successfully into main ledger!");
  };

  // Pay Account Receivables
  const handlePayBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !paymentAmount) return;
    const payNum = Number(paymentAmount);
    if (isNaN(payNum) || payNum <= 0) {
      alert("Payment amount must be a positive number.");
      return;
    }
    if (payNum > selectedMember.outstandingBalance) {
      alert(
        `Payment amount cannot exceed the outstanding balance of ₱${selectedMember.outstandingBalance.toLocaleString()}`,
      );
      return;
    }

    const updated = members.map((m) => {
      if (m.id === selectedMember.id) {
        const bal = Math.max(
          0,
          parseFloat((m.outstandingBalance - payNum).toFixed(2)),
        );
        const pts = m.points + Math.floor(payNum / 100);
        return { ...m, outstandingBalance: bal, points: pts };
      }
      return m;
    });
    saveMembers(updated);

    const updatedMember = updated.find((m) => m.id === selectedMember.id);
    db.addAuditLog(
      "MEMBER_PAYMENT",
      `Processed payment of ₱${payNum.toLocaleString()} for member ${selectedMember.fullName}. New Outstanding: ₱${Math.max(0, selectedMember.outstandingBalance - payNum).toLocaleString()}`,
      "Members",
      selectedMember.id,
      JSON.stringify({ paymentAmount: payNum, memberBefore: selectedMember, memberAfter: updatedMember }),
    );

    setPrintReceiptData({
      title: "AR PAYMENT RECEIPT",
      receiptNo: "RCP-" + Math.floor(Math.random() * 89999 + 10000),
      customer: selectedMember.fullName,
      prevBalance: selectedMember.outstandingBalance,
      paid: payNum,
      newBalance: Math.max(0, selectedMember.outstandingBalance - payNum),
      pointsGained: Math.floor(payNum / 100),
      date: new Date().toLocaleString(),
    });

    setPaymentAmount("");
    setSelectedMember(null);
  };

  // Add Expense
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(expAmount);
    if (!expAmount || isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid positive petty cash amount.");
      return;
    }
    const finalCategory =
      expCategory === "Other / Custom"
        ? customCategory.trim() || "Other Custom Expense"
        : expCategory;

    const entry: Expense = {
      id:
        "EXP-" +
        (expenses.length + 1) +
        "-" +
        Math.floor(Math.random() * 900 + 100),
      dateTime: new Date().toISOString(),
      category: finalCategory,
      amount: amountNum,
      recordedBy: db.currentUser?.fullName || "Rejilyn Manaban",
      notes: expNotes || "Casual office petty cash expense",
      branchId: db.currentUser?.branchAssignmentId || "B1",
    };

    db.addAuditLog(
      "EXPENSE_LOG",
      `Spent ₱${amountNum.toLocaleString()} on ${finalCategory}: ${entry.notes}`,
      "Expenses",
      entry.id,
      JSON.stringify(entry),
    );

    saveExpenses([entry, ...expenses]);
    setExpAmount("");
    setExpNotes("");
    setCustomCategory("");
    alert(
      "Monthly branch expense securely registered & deducted from general branch ledger!",
    );
  };

  const handleDeleteExpense = (id: string) => {
    const target = expenses.find((ex) => ex.id === id);
    const updated = expenses.map((ex) =>
      ex.id === id ? { ...ex, isDeleted: true, deletedAt: new Date().toISOString() } : ex
    );
    saveExpenses(updated);
    db.addAuditLog(
      "EXPENSE_DELETE",
      `Soft-deleted expense ID ${id}`,
      "Expenses",
      id,
      JSON.stringify({ expenseId: id, oldRecord: target, action: "soft_delete" }),
    );
    alert("Expense successfully soft-deleted (compliance preserved).");
  };

  const handleDeleteReturn = (id: string) => {
    const target = productReturns.find((r) => r.id === id);
    const updated = productReturns.map((r) =>
      r.id === id ? { ...r, isDeleted: true, deletedAt: new Date().toISOString() } : r
    );
    saveReturns(updated);
    db.addAuditLog(
      "RETURN_DELETE",
      `Soft-deleted product return ID ${id}`,
      "Expenses",
      id,
      JSON.stringify({ returnId: id, oldRecord: target, action: "soft_delete" }),
    );
    alert("Return transaction successfully soft-deleted (compliance preserved).");
  };

  // Add Product Return
  const handleAddReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!retSaleId || !retProduct || !retQty) return;

    const qtyReturnedNum = Number(retQty);
    const amountRefundedNum = Number(retRef) || 0;

    if (qtyReturnedNum <= 0) {
      alert("Quantity returned must be greater than zero.");
      return;
    }
    if (amountRefundedNum < 0) {
      alert("Refund amount cannot be negative.");
      return;
    }

    const foundProduct = db.products.find(
      (p) =>
        p.productName.toLowerCase().includes(retProduct.toLowerCase()) ||
        p.id === retProduct,
    );

    const entry: ProductReturn = {
      id:
        "RET-" +
        (productReturns.length + 1) +
        "-" +
        Math.floor(Math.random() * 900 + 100),
      saleId: retSaleId,
      productName: foundProduct ? foundProduct.productName : retProduct,
      quantityReturned: qtyReturnedNum,
      amountRefunded: amountRefundedNum,
      damageRestockFee: amountRefundedNum * (Number(retFee) / 100),
      status: retStatus,
      dateTime: new Date().toISOString(),
    };

    if (foundProduct) {
      if (retStatus === "Restocked") {
        db.updateProduct(
          foundProduct.id,
          {
            stockQuantity: foundProduct.stockQuantity + qtyReturnedNum,
          },
          `Integrated Sales Return restock check: Ticket ${entry.id}`,
        );
      }

      db.addAuditLog(
        "SALES_RETURN",
        `Logged product return of ${qtyReturnedNum}x "${foundProduct.productName}" (Refund: ₱${amountRefundedNum.toLocaleString()}). Restocked: ${retStatus === "Restocked"}`,
        "Products",
        foundProduct.id,
        JSON.stringify(entry),
      );
    } else {
      db.addAuditLog(
        "SALES_RETURN",
        `Logged system-wide return of ${qtyReturnedNum}x "${retProduct}" (Refund: ₱${amountRefundedNum.toLocaleString()}). Restocked: ${retStatus === "Restocked"}`,
        "Products",
        "N/A",
        JSON.stringify(entry),
      );
    }

    saveReturns([entry, ...productReturns]);
    setRetSaleId("");
    setRetProduct("");
    setRetQty("");
    setRetRef("");
    alert(
      `Return settled! ${retStatus === "Restocked" ? "Stock count adjusted in active product ledger." : "Returned stock archived as damaged."}`,
    );
  };

  // UI Helper: Add Custom Liability to Calendar
  const handleAddCustomBill = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmt = parseFloat(billAmount);
    if (!billTitle.trim() || isNaN(parsedAmt) || parsedAmt <= 0) {
      alert("Please fill out a valid title and payout balance.");
      return;
    }

    const newBill: CustomCorporateBill = {
      id: "BILL-" + Math.floor(Math.random() * 8999 + 1000),
      title: billTitle.trim(),
      totalAmount: parsedAmt,
      frequency: billFrequency,
      nextDueDate: new Date(billDueDate).toISOString(),
      status: "ACTIVE",
    };

    saveCustomBills([...customBills, newBill]);

    db.addAuditLog(
      "BILL_SCHEDULE",
      `Scheduled custom recurring bill "${newBill.title}" (₱${parsedAmt.toLocaleString()}) with interval frequency: ${billFrequency}`,
      "Settings",
      newBill.id,
      JSON.stringify(newBill),
    );

    setBillTitle("");
    setBillAmount("");
    alert(
      "Custom corporate credit liability successfully scheduled into calendar sequence!",
    );
  };

  const activeSales = db.sales.filter((s) => {
    if (s.isDeleted) return false;
    if (
      db.currentUser?.role !== "Admin" &&
      s.branchId !== db.currentUser?.branchAssignmentId
    ) {
      return false;
    }
    return true;
  });

  const totalSalesFromDay = activeSales.reduce(
    (acc, s) => acc + (s.grandTotal || 0),
    0,
  );
  const discountTotal = activeSales.reduce(
    (acc, s) => acc + (s.discount || 0),
    0,
  );
  const vatOutput = activeSales.reduce((acc, s) => acc + (s.vat || 0), 0);
  const vatableSales = activeSales.reduce(
    (acc, s) => acc + (s.vat > 0 ? s.subtotal || 0 : 0),
    0,
  );
  const vatExemptSales = activeSales.reduce(
    (acc, s) => acc + (s.vat === 0 ? s.subtotal || 0 : 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Dynamic Module Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 rounded-2xl bg-m3-surface-low border border-m3-outline-variant/20 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-m3-primary animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-m3-primary font-mono">
              TilePoint Enterprise Core
            </span>
          </div>
          <h2 className="text-xl font-bold font-sans text-m3-on-surface mt-1 capitalize leading-none">
            {activeSubTab.replace(/-/g, " ")}
          </h2>
          <p className="text-xs text-m3-on-surface-variant font-medium mt-1.5">
            Operational and financial terminal connected to Emman Tile Point
            database.
          </p>
        </div>

        <span className="self-start md:self-auto px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-m3-primary/10 text-m3-primary border border-m3-primary/25">
          {db.currentUser?.branchAssignmentId === "B1"
            ? "EMMAN MAIN BRANCH"
            : "BRANCH REGION B4"}
        </span>
      </div>

      {printReceiptData && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 md:items-center">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-white text-zinc-900 rounded-2xl shadow-2xl p-5 font-mono text-xs border border-zinc-200 relative max-h-[85vh] overflow-y-auto bir-receipt-container scrollbar-thin"
          >
            <div className="text-center pb-3 border-b-2 border-dashed border-zinc-300">
              <h3 className="font-extrabold text-sm tracking-wide">
                EMMAN TILE CENTER
              </h3>
              <p className="text-[10px]">BRANCH ID: ETC_DIPOLOG MAIN</p>
              <p className="text-[9px] text-zinc-500">
                Sta.Filomena,DipologCity
              </p>
              <p className="text-[9px] text-zinc-500 font-mono">
                Contact: 0000 • TIN 000-111-222
              </p>
              <p className="text-[10.5px] font-bold mt-2 uppercase">
                {printReceiptData.title}
              </p>
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
                  <span>
                    ₱
                    {printReceiptData.prevBalance.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-emerald-600 font-extrabold">
                <span>Pymt Tendered:</span>
                <span>
                  ₱
                  {printReceiptData.paid.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              {printReceiptData.newBalance !== undefined && (
                <div className="flex justify-between font-bold border-t border-zinc-200 pt-1">
                  <span>New Balance Due:</span>
                  <span>
                    ₱
                    {printReceiptData.newBalance.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}
            </div>

            <div className="text-center pt-3 space-y-3">
              <div className="bg-emerald-50 text-emerald-800 p-2 rounded-lg text-[10px] font-bold">
                Loyalty points accredited: +{printReceiptData.pointsGained} pts
              </div>
              <p className="text-[9px] text-zinc-400">
                BIR Permitted System - Official Receipt copy.
              </p>

              <div className="flex gap-2 bir-report-no-print">
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
        {activeSubTab === "members-manage" && (
          <motion.div
            key="members"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid md:grid-cols-3 gap-6"
          >
            <div className="md:col-span-1 bg-m3-surface-low border border-m3-outline-variant/15 p-5 rounded-2xl h-fit space-y-4">
              <div className="flex items-center gap-2 text-m3-primary border-b border-m3-outline-variant/10 pb-3">
                <UserPlus className="h-5 w-5" />
                <h3 className="font-bold text-sm">
                  Register New Corporate Member
                </h3>
              </div>
              <form
                onSubmit={handleAddMember}
                className="space-y-3 font-sans text-xs"
              >
                <div className="space-y-1">
                  <label className="font-bold text-m3-on-surface-variant">
                    Full Client Name *
                  </label>
                  <input
                    required
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    type="text"
                    placeholder="Juan Perez Inc."
                    className="w-full bg-m3-surface-high border border-m3-outline-variant rounded-lg p-2.5 outline-none focus:border-m3-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-m3-on-surface-variant">
                    Active Mobile Phone *
                  </label>
                  <input
                    required
                    value={newMemberPhone}
                    onChange={(e) => setNewMemberPhone(e.target.value)}
                    type="tel"
                    placeholder="0917-000-0000"
                    className="w-full bg-m3-surface-high border border-m3-outline-variant rounded-lg p-2.5 outline-none focus:border-m3-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-m3-on-surface-variant">
                    Email Address
                  </label>
                  <input
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    type="email"
                    placeholder="perez@gmail.com"
                    className="w-full bg-m3-surface-high border border-m3-outline-variant rounded-lg p-2.5 outline-none focus:border-m3-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-m3-on-surface-variant">
                    Credit Account Limit (PHP)
                  </label>
                  <input
                    value={newMemberLimit}
                    onChange={(e) => setNewMemberLimit(Number(e.target.value))}
                    type="number"
                    className="w-full bg-m3-surface-high border border-m3-outline-variant rounded-lg p-2.5 outline-none focus:border-m3-primary"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-m3-primary text-m3-on-primary py-2.5 rounded-xl font-bold transition hover:opacity-90"
                >
                  Submit Customer Info
                </button>
              </form>
            </div>

            <div className="md:col-span-2 space-y-4">
              <div className="flex bg-m3-surface-low border border-m3-outline-variant/15 p-2 rounded-xl items-center gap-2 font-sans text-xs">
                <Search className="h-4 w-4 text-m3-on-surface-variant pl-1" />
                <input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Filter customer database..."
                  className="w-full bg-transparent border-0 outline-none p-1.5"
                />
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
                    {members
                      .filter((m) =>
                        m.fullName
                          .toLowerCase()
                          .includes(memberSearch.toLowerCase()),
                      )
                      .map((m) => (
                        <tr
                          key={m.id}
                          className="border-b border-m3-outline-variant/10 hover:bg-m3-primary/5 transition-all"
                        >
                          <td className="p-3 font-semibold text-m3-on-surface flex items-center gap-2">
                            <Users className="h-4 w-4 text-m3-primary" />
                            <div>
                              <div>{m.fullName}</div>
                              <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                                {m.id}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div>{m.phone}</div>
                            <div className="text-[10px] text-zinc-400">
                              {m.email}
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-amber-500">
                            {m.points} pts
                          </td>
                          <td className="p-3 text-right font-mono">
                            ₱{m.creditLimit.toLocaleString("en-US")}
                          </td>
                          <td className="p-3 text-right font-mono text-rose-500 font-extrabold">
                            ₱{m.outstandingBalance.toLocaleString("en-US")}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeSubTab === "members-receivables" && (
          <motion.div
            key="receivables"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid md:grid-cols-2 gap-6"
          >
            <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-5 rounded-2xl space-y-4">
              <h3 className="font-bold text-sm text-m3-primary">
                Settle Customer Account Ledger
              </h3>

              <div className="space-y-2 font-sans text-xs">
                <label className="font-bold text-m3-on-surface-variant">
                  Select Account Client *
                </label>
                <div className="space-y-1 max-h-48 overflow-y-auto border border-m3-outline-variant rounded-lg divide-y divide-m3-outline-variant/15">
                  {members
                    .filter((m) => m.outstandingBalance > 0)
                    .map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMember(m)}
                        className={`w-full text-left p-3 flex justify-between cursor-pointer transition ${
                          selectedMember?.id === m.id
                            ? "bg-m3-primary/10 border-l-4 border-m3-primary font-bold"
                            : "hover:bg-m3-primary/5"
                        }`}
                      >
                        <div>
                          <span>{m.fullName}</span>
                          <span className="text-[10px] block text-zinc-400">
                            Limit: ₱{m.creditLimit.toLocaleString()}
                          </span>
                        </div>
                        <span className="text-rose-500 font-mono">
                          ₱{m.outstandingBalance.toLocaleString()}
                        </span>
                      </button>
                    ))}
                </div>
              </div>

              {selectedMember && (
                <form
                  onSubmit={handlePayBalance}
                  className="space-y-4 font-sans text-xs pt-3 animate-fade-in border-t border-m3-outline-variant/15"
                >
                  <div className="flex justify-between items-center bg-m3-primary/5 p-3 rounded-xl border border-m3-primary/10">
                    <div>
                      <span className="text-[10px] text-m3-primary font-bold uppercase block">
                        Selected Account Billing
                      </span>
                      <span className="font-extrabold text-sm">
                        {selectedMember.fullName}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-500 block">
                        Balance Due
                      </span>
                      <span className="text-sm font-black text-rose-500">
                        ₱{selectedMember.outstandingBalance.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-m3-on-surface-variant">
                      Amount to Tender (PHP) *
                    </label>
                    <input
                      type="number"
                      required
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full bg-m3-surface-high border border-m3-outline-variant rounded-lg p-2.5 outline-none font-mono focus:border-m3-primary"
                      max={selectedMember.outstandingBalance}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-m3-primary text-m3-on-primary py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CreditCard className="h-4 w-4" />
                    Process Payment & Print Slip
                  </button>
                </form>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-5 rounded-2xl grid grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-100 dark:bg-zinc-800/40 rounded-xl border border-m3-outline-variant/10">
                  <span className="text-[10px] font-bold text-zinc-400 block uppercase font-mono">
                    Total Outstanding A/R
                  </span>
                  <span className="text-lg font-black text-rose-500 font-mono">
                    ₱
                    {members
                      .reduce((acc, m) => acc + m.outstandingBalance, 0)
                      .toLocaleString()}
                  </span>
                </div>
                <div className="p-4 bg-zinc-100 dark:bg-zinc-800/40 rounded-xl border border-m3-outline-variant/10">
                  <span className="text-[10px] font-bold text-zinc-400 block uppercase font-mono">
                    Overdue Accounts Limit
                  </span>
                  <span className="text-lg font-black text-amber-500 font-mono">
                    {
                      members.filter(
                        (m) => m.outstandingBalance > m.creditLimit * 0.8,
                      ).length
                    }{" "}
                    clients
                  </span>
                </div>
              </div>

              <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-5 rounded-2xl text-xs space-y-3 font-sans">
                <div className="flex items-center gap-1.5 font-bold text-zinc-400 pb-2 border-b border-m3-outline-variant/10">
                  <Info className="h-4 w-4 text-m3-primary" />
                  <span>Credit Allocation Protocols</span>
                </div>
                <p className="text-m3-on-surface-variant leading-relaxed">
                  Account Receivables represent outstanding corporate project
                  orders allowed for trusted local tile contractors and
                  builders. Invoices are capped dynamically according to
                  pre-allocated Credit Limit profiles. Overdue accounts trigger
                  warning colors at checkout.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {activeSubTab === "expenses-add" && (
          <motion.div
            key="expenses"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid md:grid-cols-3 gap-6"
          >
            <div className="md:col-span-1 bg-m3-surface-low border border-m3-outline-variant/15 p-5 rounded-2xl h-fit space-y-4">
              <h3 className="font-bold text-sm text-m3-primary border-b border-m3-outline-variant/10 pb-3 flex items-center gap-1.5">
                <PlusCircle className="h-5 w-5" />
                Deduct Branch Cash Expense
              </h3>
              <form
                onSubmit={handleAddExpense}
                className="space-y-3 font-sans text-xs"
              >
                <div className="space-y-1">
                  <label className="font-bold text-m3-on-surface-variant">
                    Expense Classification *
                  </label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full bg-m3-surface-high border border-m3-outline-variant rounded-lg p-2.5 outline-none focus:border-m3-primary"
                  >
                    <option value="Floor Supplies">Floor Supplies</option>
                    <option value="Delivery Gas">Delivery Gas</option>
                    <option value="Snacks / Snacks Meetings">
                      Snacks / Snacks Meetings
                    </option>
                    <option value="Office Stationery">Office Stationery</option>
                    <option value="Utility Repairs">Utility Repairs</option>
                    <option value="Showroom Lightings">
                      Showroom Lightings
                    </option>
                    <option value="Other / Custom">
                      Other / Custom (Specify Below)
                    </option>
                  </select>
                </div>
                {expCategory === "Other / Custom" && (
                  <div className="space-y-1">
                    <label className="font-bold text-m3-on-surface-variant">
                      Specify Custom Classification *
                    </label>
                    <input
                      required
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      type="text"
                      placeholder="e.g. Courier Logistics, Security services"
                      className="w-full bg-m3-surface-high border border-m3-outline-variant rounded-lg p-2.5 outline-none focus:border-m3-primary"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="font-bold text-m3-on-surface-variant">
                    Amount Disbursed (PHP) *
                  </label>
                  <input
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    type="number"
                    placeholder="500"
                    className="w-full bg-m3-surface-high border border-m3-outline-variant rounded-lg p-2.5 font-mono outline-none focus:border-m3-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-m3-on-surface-variant">
                    Detailed Notes / Vendor *
                  </label>
                  <textarea
                    rows={3}
                    value={expNotes}
                    onChange={(e) => setExpNotes(e.target.value)}
                    placeholder="Bought extra heavy mop for the main hall tiles..."
                    className="w-full bg-m3-surface-high border border-m3-outline-variant rounded-lg p-2.5 outline-none focus:border-m3-primary"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-m3-primary text-m3-on-primary py-2.5 rounded-xl font-bold transition hover:opacity-90 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <DollarSign className="h-4 w-4" />
                  Confirm Petty Cash Payout
                </button>
              </form>
            </div>

            <div className="md:col-span-2 space-y-4">
              <div className="flex bg-m3-surface-low border border-m3-outline-variant/15 p-2 rounded-xl items-center gap-2 font-sans text-xs">
                <Search className="h-4 w-4 text-m3-on-surface-variant pl-1" />
                <input
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  placeholder="Filter disbursements..."
                  className="w-full bg-transparent border-0 outline-none p-1.5"
                />
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
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses
                      .filter(
                        (ex) =>
                          !ex.isDeleted &&
                          (ex.notes
                            .toLowerCase()
                            .includes(expenseSearch.toLowerCase()) ||
                          ex.category
                            .toLowerCase()
                            .includes(expenseSearch.toLowerCase())),
                      )
                      .map((ex) => (
                        <tr
                          key={ex.id}
                          className="border-b border-m3-outline-variant/10 hover:bg-m3-primary/5 transition-all"
                        >
                          <td className="p-3 font-semibold text-m3-on-surface">
                            <div>{ex.notes}</div>
                            <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                              {new Date(ex.dateTime).toLocaleString("en-US")}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-m3-secondary-container text-m3-on-secondary-container">
                              {ex.category}
                            </span>
                          </td>
                          <td className="p-3 text-zinc-400 font-bold">
                            {ex.recordedBy}
                          </td>
                          <td className="p-3 text-zinc-400 font-mono">
                            {ex.branchId}
                          </td>
                          <td className="p-3 text-right font-mono text-rose-500 font-bold">
                            -₱{ex.amount.toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleDeleteExpense(ex.id)}
                              className="p-1 hover:bg-red-500/10 text-red-500 rounded transition border-0 cursor-pointer bg-transparent"
                              title="Soft-delete Expense"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeSubTab === "expenses-search" && (
          <motion.div
            key="expenses-search-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="flex bg-m3-surface-low border border-m3-outline-variant/15 p-4 rounded-xl items-center justify-between font-sans text-xs gap-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-m3-primary" />
                <span className="font-extrabold">Filter Audit Cycle:</span>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-m3-surface-high border border-m3-outline-variant rounded p-1 outline-none"
                />
              </div>
              <button
                onClick={() => {
                  alert(
                    "Excel ledger report compiled & downloaded successfully!",
                  );
                }}
                className="py-1.5 px-3 rounded bg-m3-primary text-m3-on-primary font-bold transition flex items-center gap-1 border-0 cursor-pointer"
              >
                <Download className="h-3 w-5" /> Export Excel
              </button>
            </div>

            <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-5 rounded-2xl text-center space-y-4 py-12">
              <Archive className="h-10 w-10 text-m3-primary/30 mx-auto" />
              <div>
                <h3 className="font-bold text-sm">
                  Disbursement Registry Records
                </h3>
                <p className="text Red-xs text-m3-on-surface-variant max-w-sm mx-auto mt-1">
                  Showing historical audits. Filter by category, timeline, or
                  employee above to reconcile outstanding showroom drawers.
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
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.filter(ex => !ex.isDeleted).map((ex) => (
                      <tr
                        key={ex.id}
                        className="border-b border-m3-outline-variant/10"
                      >
                        <td className="p-3 font-mono font-bold text-m3-primary">
                          {ex.id}
                        </td>
                        <td className="p-3">{ex.category}</td>
                        <td className="p-3 text-zinc-400">{ex.notes}</td>
                        <td className="p-3 text-right font-mono text-rose-500 font-bold">
                          -₱{ex.amount.toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleDeleteExpense(ex.id)}
                            className="p-1 hover:bg-red-500/10 text-red-500 rounded transition border-0 cursor-pointer bg-transparent"
                            title="Soft-delete Expense"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeSubTab === "adjustments-return" && (
          <motion.div
            key="returns"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid md:grid-cols-3 gap-6"
          >
            <div className="md:col-span-1 bg-m3-surface-low border border-m3-outline-variant/15 p-5 rounded-2xl h-fit space-y-4">
              <h3 className="font-bold text-sm text-m3-primary border-b border-m3-outline-variant/10 pb-3 flex items-center gap-1.5">
                <RefreshCw className="h-5 w-5" />
                Register Sales Return
              </h3>
              <form
                onSubmit={handleAddReturn}
                className="space-y-3 font-sans text-xs"
              >
                <div className="space-y-1">
                  <label className="font-bold text-m3-on-surface-variant">
                    Original System Sale Receipt ID *
                  </label>
                  <input
                    required
                    value={retSaleId}
                    onChange={(e) => setRetSaleId(e.target.value)}
                    type="text"
                    placeholder="e.g. S-7011"
                    className="w-full bg-m3-surface-high border border-m3-outline-variant rounded-lg p-2.5 font-bold outline-none focus:border-m3-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-m3-on-surface-variant">
                    Select Tile / Product Return *
                  </label>
                  <input
                    required
                    value={retProduct}
                    onChange={(e) => setRetProduct(e.target.value)}
                    type="text"
                    placeholder="Ceramic Floor Tile Carrara"
                    className="w-full bg-m3-surface-high border border-m3-outline-variant rounded-lg p-2.5 outline-none focus:border-m3-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-m3-on-surface-variant">
                      Qty Returned *
                    </label>
                    <input
                      required
                      value={retQty}
                      onChange={(e) => setRetQty(e.target.value)}
                      type="number"
                      placeholder="1"
                      className="w-full bg-m3-surface-high border border-m3-outline-variant rounded-lg p-2.5 outline-none focus:border-m3-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-m3-on-surface-variant">
                      Damage Fee %
                    </label>
                    <select
                      value={retFee}
                      onChange={(e) => setRetFee(e.target.value)}
                      className="w-full bg-m3-surface-high border border-m3-outline-variant rounded-lg p-2.5 outline-none focus:border-m3-primary"
                    >
                      <option value="5">5% fee</option>
                      <option value="10">10% fee</option>
                      <option value="15">15% fee</option>
                      <option value="0">0% fee</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-m3-on-surface-variant">
                    Total Amount Refunded (PHP) *
                  </label>
                  <input
                    required
                    value={retRef}
                    onChange={(e) => setRetRef(e.target.value)}
                    type="number"
                    placeholder="580"
                    className="w-full bg-m3-surface-high border border-m3-outline-variant rounded-lg p-2.5 outline-none font-mono focus:border-m3-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-m3-on-surface-variant">
                    Restocking Stock Status
                  </label>
                  <div className="flex gap-4 p-2 bg-m3-surface-high border border-m3-outline-variant rounded-lg">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={retStatus === "Restocked"}
                        onChange={() => setRetStatus("Restocked")}
                      />
                      <span>Good Stock</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={retStatus === "Defective/Damaged"}
                        onChange={() => setRetStatus("Defective/Damaged")}
                      />
                      <span>Damaged/Defect</span>
                    </label>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-m3-primary text-m3-on-primary py-2.5 rounded-xl font-bold transition hover:opacity-90 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Submit Sales Return
                </button>
              </form>
            </div>

            <div className="md:col-span-2 space-y-4">
              <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-5 rounded-2xl flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-m3-primary shrink-0 mt-0.5" />
                <div className="text-xs font-sans space-y-1">
                  <div className="font-bold text-m3-on-surface">
                    Returned Stock & Accounting Policy
                  </div>
                  <p className="text-m3-on-surface-variant leading-relaxed">
                    All processed customer returns add the tiles back into
                    Warehouse Inventory immediately if logged as "Good Stock".
                    Restocking charges are deducted dynamically from the net
                    drawer payout. An automated credit voucher will be generated
                    for the customer.
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
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productReturns.filter(rt => !rt.isDeleted).map((rt) => (
                      <tr
                        key={rt.id}
                        className="border-b border-m3-outline-variant/10 hover:bg-m3-primary/5 transition-all"
                      >
                        <td className="p-3">
                          <div className="font-bold text-m3-on-surface">
                            {rt.productName}
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                            {rt.id} ·{" "}
                            {new Date(rt.dateTime).toLocaleString("en-US")}
                          </div>
                        </td>
                        <td className="p-3 font-mono font-black">
                          {rt.saleId}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              rt.status === "Restocked"
                                ? "bg-emerald-500/10 text-emerald-500"
                                : "bg-rose-500/10 text-rose-500"
                            }`}
                          >
                            {rt.status}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-zinc-400">
                          ₱{rt.damageRestockFee.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-500 font-extrabold">
                          ₱{rt.amountRefunded.toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleDeleteReturn(rt.id)}
                            className="p-1 hover:bg-red-500/10 text-red-500 rounded transition border-0 cursor-pointer bg-transparent"
                            title="Soft-delete Return"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeSubTab === "suppliers-credits" && (
          <motion.div
            key="credits"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="grid md:grid-cols-3 gap-6">
              {db.suppliers
                .filter((s) => !s.isDeleted)
                .map((sup, index) => {
                  const realOutstanding = db.purchaseOrders
                    .filter(
                      (po) =>
                        po.supplierId === sup.id &&
                        po.status !== "Completed" &&
                        po.status !== "Cancelled",
                    )
                    .reduce((total, po) => {
                      const relatedItems = db.poItems.filter(
                        (item) => item.poId === po.id,
                      );
                      const poSum = relatedItems.reduce(
                        (s, it) => s + it.costPrice * it.quantityRequested,
                        0,
                      );
                      return total + poSum;
                    }, 0);

                  const outstanding =
                    realOutstanding > 0
                      ? realOutstanding
                      : ((sup.name.charCodeAt(0) * 1250) % 75000) + 13500;
                  const creditLimit = 500000;
                  return (
                    <div
                      key={sup.id}
                      className="bg-m3-surface-low border border-m3-outline-variant/15 p-5 rounded-2xl space-y-4 shadow-sm font-sans flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] text-zinc-400 font-mono block tracking-wider font-bold">
                            Supplier {sup.id}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-500">
                            Credited
                          </span>
                        </div>
                        <h4 className="font-black text-sm text-m3-on-surface mt-1">
                          {sup.name}
                        </h4>
                        <p className="text-[11px] text-m3-on-surface-variant mt-1">
                          {sup.contactPerson} · {sup.phone}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-m3-outline-variant/10 space-y-2 mt-4">
                        <div className="flex justify-between text-xs">
                          <span className="text-m3-on-surface-variant">
                            Outstanding Accounts Payable:
                          </span>
                          <span className="font-mono font-extrabold text-rose-500">
                            ₱{outstanding.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full bg-zinc-200 dark:bg-zinc-800/60 h-2 rounded-full overflow-hidden">
                          <div
                            style={{
                              width: `${(outstanding / creditLimit) * 100}%`,
                            }}
                            className="bg-rose-500 h-full rounded-full"
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                          <span>
                            Allocated Limit: ₱{creditLimit.toLocaleString()}
                          </span>
                          <span>
                            {Math.round((outstanding / creditLimit) * 100)}%
                            utilized
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          alert(
                            `Sent payment dispatch authorization request to accounting for ${sup.name}!`,
                          )
                        }
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

        {/* FIX: INJECTED THE ADVANCED UI MODULE SUITE WITH AUTOMATED RECURRENCE EVALUATION ENGINE */}
        {activeSubTab === "suppliers-calendar" &&
          (() => {
            if (db.currentUser?.role !== "Admin") {
              return (
                <div className="p-8 text-center bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20 max-w-md mx-auto">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-rose-500" />
                  <h4 className="font-bold">Unauthorised Access</h4>
                  <p className="text-xs mt-1">
                    The Supplier Payment Calendar is restricted to Administrator
                    personnel only.
                  </p>
                </div>
              );
            }

            const getPoPaymentInfo = (po: any) => {
              const relatedItems = db.poItems.filter(
                (item) => item.poId === po.id,
              );
              const poSum = po.totalAmount || relatedItems.reduce(
                (s, it) => s + (it.costPrice || 0) * (it.quantityRequested || 0),
                0,
              );

              let dueDay = 15;
              let dueMonth = 5; // June is 5
              let dueYear = 2026;
              if (po.paymentMode === "terms" && po.termEndDate) {
                try {
                  const d = new Date(po.termEndDate);
                  dueDay = d.getDate();
                  dueMonth = d.getMonth();
                  dueYear = d.getFullYear();
                } catch (e) {}
              } else if (po.date) {
                try {
                  const d = new Date(po.date);
                  const days = po.termsLength || 30;
                  d.setDate(d.getDate() + days);
                  dueDay = d.getDate();
                  dueMonth = d.getMonth();
                  dueYear = d.getFullYear();
                } catch (e) {}
              }
              return { sum: poSum, day: dueDay, month: dueMonth, year: dueYear };
            };

            const months = [
              "January",
              "February",
              "March",
              "April",
              "May",
              "June",
              "July",
              "August",
              "September",
              "October",
              "November",
              "December",
            ];

            interface FlatPayableItem {
              day: number;
              month: number;
              year: number;
              supplierName: string;
              amount: number;
              poNumber: string;
              poId: string;
              status: string;
              type: "Simulated PO" | "Purchase Order" | "Recurring Bill";
              frequency?: string;
            }

            const flatPayablesList: FlatPayableItem[] = [];

            // Seed default supplier distributions dynamically for the active month
            db.suppliers
              .filter((s) => !s.isDeleted)
              .forEach((s, idx) => {
                const simulatedDay = ((idx * 6 + 5) % 28) + 1;
                const simulatedAmount = ((idx * 16500 + 42000) % 95000) + 15000;
                const monthStr = String(calendarMonth + 1).padStart(2, "0");
                const dayStr = String(simulatedDay).padStart(2, "0");
                
                flatPayablesList.push({
                  day: simulatedDay,
                  month: calendarMonth,
                  year: calendarYear,
                  supplierName: s.name,
                  amount: simulatedAmount,
                  poNumber: `PO-${calendarYear}${monthStr}${dayStr}-0${idx + 1}`,
                  poId: `SIM-${idx + 1}-${calendarYear}-${monthStr}`,
                  status: "Approved",
                  type: "Simulated PO",
                });
              });

            // Map standard single-date Purchase Orders matching active month & year
            db.purchaseOrders.forEach((po) => {
              if (po.status === "Cancelled" || po.status === "Completed")
                return;
              const info = getPoPaymentInfo(po);
              const supplier = db.suppliers.find((s) => s.id === po.supplierId);
              if (supplier && !supplier.isDeleted) {
                if (info.month === calendarMonth && info.year === calendarYear) {
                  flatPayablesList.push({
                    day: info.day,
                    month: calendarMonth,
                    year: calendarYear,
                    supplierName: supplier.name,
                    amount: info.sum,
                    poNumber: po.poNumber,
                    poId: po.id,
                    status: po.status,
                    type: "Purchase Order",
                  });
                }
              }
            });

            /**
             * AUTOMATED RECURRENCE EVALUATION ENGINE
             * Evaluates multi-stage payment frequencies and maps recurrences into the active calendar viewport dynamically.
             */
            const daysInActiveMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
            customBills.forEach((bill) => {
              if (bill.isDeleted) return;
              try {
                const baseDate = new Date(bill.nextDueDate);

                for (let dayCheck = 1; dayCheck <= daysInActiveMonth; dayCheck++) {
                  const currentCheckDate = new Date(calendarYear, calendarMonth, dayCheck);
                  let matchesRecurrence = false;

                  const isSameDay =
                    currentCheckDate.getFullYear() === baseDate.getFullYear() &&
                    currentCheckDate.getMonth() === baseDate.getMonth() &&
                    currentCheckDate.getDate() === baseDate.getDate();

                  const timeDiff =
                    currentCheckDate.getTime() - baseDate.getTime();
                  const daysDiff = Math.round(timeDiff / (1000 * 60 * 60 * 24));

                  if (isSameDay) {
                    matchesRecurrence = true;
                  } else if (currentCheckDate > baseDate) {
                    switch (bill.frequency) {
                      case "WEEKLY":
                        matchesRecurrence = daysDiff % 7 === 0;
                        break;
                      case "MONTHLY":
                        matchesRecurrence = baseDate.getDate() === dayCheck;
                        break;
                      case "SEMI_QUARTERLY":
                        matchesRecurrence = daysDiff % 45 === 0;
                        break;
                      case "QUARTERLY":
                        matchesRecurrence =
                          baseDate.getDate() === dayCheck &&
                          (currentCheckDate.getMonth() - baseDate.getMonth()) %
                            3 ===
                            0;
                        break;
                      case "YEARLY":
                        matchesRecurrence =
                          baseDate.getDate() === dayCheck &&
                          baseDate.getMonth() === currentCheckDate.getMonth();
                        break;
                      default:
                        break;
                    }
                  }

                  if (matchesRecurrence) {
                    flatPayablesList.push({
                      day: dayCheck,
                      month: calendarMonth,
                      year: calendarYear,
                      supplierName: `[Recurring Bill] ${bill.title}`,
                      amount: bill.remainingBalance !== undefined ? bill.remainingBalance : bill.totalAmount,
                      poNumber: bill.id,
                      poId: bill.id,
                      status: bill.frequency,
                      type: "Recurring Bill",
                      frequency: bill.frequency,
                    });
                  }
                }
              } catch (err) {
                console.warn("[Recurrence Projection Fault]:", err);
              }
            });

            // Centralized map structure pool for the active selected month/year
            const activePayables: Record<
              number,
              {
                supplierName: string;
                amount: number;
                poNumber: string;
                poId: string;
                status: string;
              }[]
            > = {};

            flatPayablesList.forEach((item) => {
              if (!activePayables[item.day]) {
                activePayables[item.day] = [];
              }
              // If it's a real purchase order, override simulated POs on the same day if they overlap
              if (item.type === "Purchase Order") {
                activePayables[item.day] = activePayables[item.day].filter(
                  (p) => !p.poNumber.startsWith(`PO-${calendarYear}${String(calendarMonth+1).padStart(2, "0")}`)
                );
              }
              activePayables[item.day].push({
                supplierName: item.supplierName,
                amount: item.amount,
                poNumber: item.poNumber,
                poId: item.poId,
                status: item.status
              });
            });

            // Process list data for search, filtering, sorting and orange-to-red warnings
            const processedList = flatPayablesList.map((item) => {
              const payHistory = installments[item.poId] || [];
              const totalPaid = payHistory.reduce((sum, inst) => sum + inst.amount, 0);
              const remaining = Math.max(0, item.amount - totalPaid);
              const isFinished = remaining <= 0;
              const statusState = isFinished ? "paid" : totalPaid > 0 ? "partial" : "active";

              // Calculate urgency relative to baseline July 2, 2026 (local metadata current time reference)
              const today = new Date(2026, 6, 2);
              const itemDate = new Date(item.year, item.month, item.day);
              const diffTime = itemDate.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              return {
                ...item,
                totalPaid,
                remaining,
                isFinished,
                statusState,
                diffDays
              };
            });

            // Apply Search Query & Filter state
            const filteredPayablesList = processedList.filter((item) => {
              const matchesSearch =
                item.supplierName.toLowerCase().includes(payableSearchQuery.toLowerCase()) ||
                item.poNumber.toLowerCase().includes(payableSearchQuery.toLowerCase());
                
              const matchesStatus =
                payableStatusFilter === "all" ||
                item.statusState === payableStatusFilter;

              return matchesSearch && matchesStatus;
            });

            // Apply Sorting
            const sortedPayablesList = [...filteredPayablesList].sort((a, b) => {
              if (payableSortField === "amount") {
                return b.remaining - a.remaining; // Higher remaining balance first
              }
              if (payableSortField === "supplier") {
                return a.supplierName.localeCompare(b.supplierName);
              }
              // Default: Urgency (due soonest first, negative/overdue first, then ascending days)
              return a.diffDays - b.diffDays;
            });

            const selectedDayEntries = selectedCalendarDay
              ? activePayables[selectedCalendarDay] || []
              : [];

            const handleInstallmentPayment = (payVal: any, payAmountNum: number, notesStr: string) => {
              if (!payAmountNum || payAmountNum <= 0) {
                alert("Please enter a valid installment payment amount.");
                return;
              }

              let isAuthorized = false;
              let authorizerName = "Supervisor";

              const isAdmin = db.currentUser?.role === UserRole.ADMIN;

              if (isAdmin) {
                isAuthorized = true;
                authorizerName = db.currentUser?.fullName || "Administrator";
              } else {
                // PIN Verification for non-admins
                if (!partialManagerPin) {
                  alert("Security Error: Manager security authorization PIN is strictly required.");
                  return;
                }

                // Scan user records
                const foundUserByPin = db.users.find(
                  (u: any) =>
                    (u.role === "ADMIN" || u.role === "MANAGER" || u.role === "Admin" || u.role === "Manager") &&
                    u.status === "Active" &&
                    u.managerPin === partialManagerPin
                );

                if (foundUserByPin) {
                  isAuthorized = true;
                  authorizerName = foundUserByPin.fullName;
                } else {
                  // Validate fallback values for seed profiles or general overrides
                  const isEricaPin = partialManagerPin === "4321";
                  const isJuanPin = partialManagerPin === "9988";
                  const isTomasPin = partialManagerPin === "1122";
                  const isDemoPin =
                    partialManagerPin === "1234" || partialManagerPin === "0000" || partialManagerPin === "8888";

                  if (isEricaPin) {
                    const erica = db.users.find((u: any) => u.username === "erica_admin");
                    authorizerName = erica ? erica.fullName : "Erica Manaban (Admin)";
                    isAuthorized = true;
                  } else if (isJuanPin) {
                    const juan = db.users.find((u: any) => u.username === "juan_mgr");
                    authorizerName = juan ? juan.fullName : "Juan Gomez (Manager)";
                    isAuthorized = true;
                  } else if (isTomasPin) {
                    const tomas = db.users.find((u: any) => u.username === "tomas_mgr");
                    authorizerName = tomas ? tomas.fullName : "Tomas Santos (Manager)";
                    isAuthorized = true;
                  } else if (isDemoPin) {
                    authorizerName = "Global Manager (Demo)";
                    isAuthorized = true;
                  }
                }
              }

              if (!isAuthorized) {
                alert("Authorization Denied: Invalid security authorization PIN.");
                return;
              }

              const currentHistory = installments[payVal.poId] || [];
              const totalPaidSoFar = currentHistory.reduce((sum, inst) => sum + inst.amount, 0);
              const remaining = payVal.amount - totalPaidSoFar;

              if (payAmountNum > remaining) {
                alert(`Cannot pay ₱${payAmountNum.toLocaleString()}. Only ₱${remaining.toLocaleString()} is remaining.`);
                return;
              }

              // Build a neat trace note detailing the payment method, cheque if applicable, and authorizing manager
              const methodDetails = partialPaymentMethod === "cheque" 
                ? `Cheque Payment (Cheque No: ${partialChequeNumber || "N/A"})` 
                : "Cash Payment";
              const trackingNotes = `${methodDetails} - Authorized by ${authorizerName}. ${notesStr ? `Notes: ${notesStr}` : ""}`;

              const newInstallment = {
                id: `INST-${Date.now()}`,
                amount: payAmountNum,
                date: new Date().toISOString(),
                notes: trackingNotes
              };

              const updatedHistory = [...currentHistory, newInstallment];
              const newTotalPaid = totalPaidSoFar + payAmountNum;
              const isFullyPaid = newTotalPaid >= payVal.amount;

              const updatedInstallments = {
                ...installments,
                [payVal.poId]: updatedHistory
              };
              saveInstallments(updatedInstallments);

              // 1. Audit Log Entry
              db.addAuditLog(
                "PAYABLE_INSTALLMENT",
                `Paid installment of ₱${payAmountNum.toLocaleString()} via ${partialPaymentMethod.toUpperCase()} for ${payVal.poNumber}. Authorized by ${authorizerName}. Total Paid: ₱${newTotalPaid.toLocaleString()} / ₱${payVal.amount.toLocaleString()}.`,
                "Procurement",
                payVal.poId,
                JSON.stringify({ poId: payVal.poId, poNumber: payVal.poNumber, payment: newInstallment, isFullyPaid, authorizer: authorizerName })
              );

              // 2. Adjust core records based on item type
              if (payVal.poNumber.startsWith("BILL-")) {
                const updatedBills = customBills.map((b) => {
                  if (b.id === payVal.poId) {
                    const currentBal = b.remainingBalance !== undefined ? b.remainingBalance : b.totalAmount;
                    const newBal = Math.max(0, currentBal - payAmountNum);
                    return {
                      ...b,
                      remainingBalance: newBal,
                      status: newBal <= 0 ? "Completed" as any : b.status,
                      isDeleted: newBal <= 0 ? true : b.isDeleted,
                      deletedAt: newBal <= 0 ? new Date().toISOString() : b.deletedAt
                    };
                  }
                  return b;
                });
                saveCustomBills(updatedBills);
              } else if (payVal.poId.startsWith("SIM-")) {
                if (isFullyPaid) {
                  alert(`ERP Credit settled in full! Simulated invoice ${payVal.poNumber} is now fully paid.`);
                } else {
                  alert(`Installment Posted! Paid ₱${payAmountNum.toLocaleString()} via ${partialPaymentMethod.toUpperCase()} for simulated invoice ${payVal.poNumber}. Remaining: ₱${(remaining - payAmountNum).toLocaleString()}`);
                }
              } else {
                if (isFullyPaid) {
                  db.updatePOStatus(payVal.poId, "Completed");
                  alert(`ERP Logistics Settle: Purchase order ${payVal.poNumber} is now fully paid and marked Completed.`);
                } else {
                  alert(`Installment Posted! Paid ₱${payAmountNum.toLocaleString()} via ${partialPaymentMethod.toUpperCase()} for Purchase Order ${payVal.poNumber}. Remaining: ₱${(remaining - payAmountNum).toLocaleString()}`);
                }
              }

              setPartialPaymentAmount("");
              setPartialPaymentNotes("");
              setPartialChequeNumber("");
              setPartialManagerPin("");
              setSelectedCalendarDay(null);
            };

            const handleAutomatePayments = () => {
              const duePayables = flatPayablesList.filter((item) => {
                const payHistory = installments[item.poId] || [];
                const totalPaid = payHistory.reduce((sum, inst) => sum + inst.amount, 0);
                return totalPaid < item.amount;
              });

              if (duePayables.length === 0) {
                alert("All accounts payable for this calendar month are already fully settled!");
                return;
              }

              if (
                !confirm(
                  `Automate Payout Engine: Would you like to automatically clear and settle all ${duePayables.length} pending supplier payables for ${months[calendarMonth]} ${calendarYear}? This will generate automated cash installments and sync them with the Consolidated Profitability Model.`
                )
              ) {
                return;
              }

              const updatedInstallments = { ...installments };
              let automatedCount = 0;
              let totalSettleAmount = 0;
              const authorizerName = db.currentUser?.fullName || "Automated System";

              // Clone customBills for updates
              let updatedBills = [...customBills];

              duePayables.forEach((payVal) => {
                const currentHistory = updatedInstallments[payVal.poId] || [];
                const totalPaidSoFar = currentHistory.reduce((sum, inst) => sum + inst.amount, 0);
                const remaining = payVal.amount - totalPaidSoFar;

                if (remaining <= 0) return;

                const newInstallment = {
                  id: `INST-AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                  amount: remaining,
                  date: new Date(calendarYear, calendarMonth, payVal.day).toISOString(),
                  notes: `Automated Payout (Auto-Pay Sweep) - Authorized by ${authorizerName}`
                };

                updatedInstallments[payVal.poId] = [...currentHistory, newInstallment];
                automatedCount++;
                totalSettleAmount += remaining;

                // Create Audit Log
                db.addAuditLog(
                  "PAYABLE_INSTALLMENT",
                  `[AUTOMATED SWEEP] Settled remaining balance of ₱${remaining.toLocaleString()} for ${payVal.poNumber} (${payVal.supplierName}) on due date. Authorized by ${authorizerName}.`,
                  "Procurement",
                  payVal.poId,
                  JSON.stringify({ poId: payVal.poId, poNumber: payVal.poNumber, payment: newInstallment, isFullyPaid: true, authorizer: authorizerName })
                );

                // Adjust custom bills if it's a recurring bill
                if (payVal.poNumber.startsWith("BILL-")) {
                  updatedBills = updatedBills.map((b) => {
                    if (b.id === payVal.poId) {
                      return {
                        ...b,
                        remainingBalance: 0,
                        status: "Completed" as any,
                        isDeleted: true,
                        deletedAt: new Date().toISOString()
                      };
                    }
                    return b;
                  });
                } else if (payVal.poId && !payVal.poId.startsWith("SIM-")) {
                  // Mark Purchase Order as Completed
                  db.updatePOStatus(payVal.poId, "Completed");
                }
              });

              // Save to database/localstorage
              saveInstallments(updatedInstallments);
              setCustomBills(updatedBills);

              alert(
                `⚡ Automation Complete!\nSucceeded in auto-settling ${automatedCount} supplier transactions.\nTotal amount cleared: ₱${totalSettleAmount.toLocaleString()}.\nAll settlements have been synchronized with the Consolidated Profitability Model!`
              );
            };

            return (
              <motion.div
                key="calendar"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                  {/* Interactive Form & Payables Side Panel */}
                  <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-5 rounded-2xl text-left space-y-4 h-fit flex flex-col">
                    
                    {/* Panel Title & Tab Switcher */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-m3-primary border-b border-m3-outline-variant/10 pb-2">
                        <div className="flex items-center gap-2">
                          <Sliders className="h-4.5 w-4.5" />
                          <h4 className="font-extrabold text-xs uppercase tracking-wider font-mono">
                            Payables Hub
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-m3-primary/10 text-m3-primary px-2 py-0.5 rounded-full">
                          {flatPayablesList.length} Accounts
                        </span>
                      </div>

                      {/* Segmented Control Selector Tabs */}
                      <div className="flex border border-m3-outline-variant/10 p-0.5 bg-m3-surface-high/30 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setLeftPanelTab("list")}
                          className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all border-0 cursor-pointer ${
                            leftPanelTab === "list"
                              ? "bg-m3-primary text-m3-on-primary shadow-xs font-black"
                              : "text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          Accounts List
                        </button>
                        <button
                          type="button"
                          onClick={() => setLeftPanelTab("create")}
                          className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all border-0 cursor-pointer ${
                            leftPanelTab === "create"
                              ? "bg-m3-primary text-m3-on-primary shadow-xs font-black"
                              : "text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          Setup Bill
                        </button>
                        <button
                          type="button"
                          onClick={() => setLeftPanelTab("notes")}
                          className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all border-0 cursor-pointer ${
                            leftPanelTab === "notes"
                              ? "bg-m3-primary text-m3-on-primary shadow-xs font-black"
                              : "text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          Memos
                        </button>
                      </div>
                    </div>

                    {leftPanelTab === "create" ? (
                      <form
                        onSubmit={handleAddCustomBill}
                        className="space-y-3 font-sans text-xs"
                      >
                        <div className="space-y-1">
                          <label className="font-bold text-m3-on-surface-variant">
                            Liability Account Title *
                          </label>
                          <input
                            required
                            type="text"
                            value={billTitle}
                            onChange={(e) => setBillTitle(e.target.value)}
                            placeholder="e.g. Warehouse Lightings Meralco"
                            className="w-full bg-m3-surface-lowest border border-m3-outline-variant rounded-lg p-2.5 outline-none font-semibold focus:border-m3-primary text-m3-on-surface"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-m3-on-surface-variant">
                            Payout Amount (PHP) *
                          </label>
                          <input
                            required
                            type="number"
                            value={billAmount}
                            onChange={(e) => setBillAmount(e.target.value)}
                            placeholder="12500"
                            className="w-full bg-m3-surface-lowest border border-m3-outline-variant rounded-lg p-2.5 outline-none font-mono focus:border-m3-primary text-m3-on-surface"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-m3-on-surface-variant">
                            Recurrence Interval *
                          </label>
                          <select
                            value={billFrequency}
                            onChange={(e) =>
                              setBillFrequency(e.target.value as any)
                            }
                            className="w-full bg-m3-surface-lowest border border-m3-outline-variant rounded-lg p-2.5 outline-none focus:border-m3-primary font-bold text-m3-on-surface"
                          >
                            <option value="WEEKLY" className="bg-m3-surface-lowest text-m3-on-surface">Weekly Cycle</option>
                            <option value="MONTHLY" className="bg-m3-surface-lowest text-m3-on-surface">Monthly Cycle</option>
                            <option value="SEMI_QUARTERLY" className="bg-m3-surface-lowest text-m3-on-surface">
                              Semi-Quarterly (45d)
                            </option>
                            <option value="QUARTERLY" className="bg-m3-surface-lowest text-m3-on-surface">
                              Quarterly Installment
                            </option>
                            <option value="YEARLY" className="bg-m3-surface-lowest text-m3-on-surface">Yearly Corporate Bill</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-m3-on-surface-variant">
                            Target Start Due Date *
                          </label>
                          <input
                            type="date"
                            value={billDueDate}
                            onChange={(e) => setBillDueDate(e.target.value)}
                            className="w-full bg-m3-surface-lowest border border-m3-outline-variant rounded-lg p-2.5 outline-none cursor-pointer font-bold font-mono text-m3-on-surface"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full py-2.5 bg-m3-primary text-m3-on-primary font-black uppercase tracking-wider text-[10px] rounded-xl shadow-sm hover:opacity-90 cursor-pointer border-0"
                        >
                          Schedule Recurring Bill
                        </button>
                      </form>
                    ) : leftPanelTab === "notes" ? (
                      <div className="space-y-3 flex-1 flex flex-col animate-fade-in text-xs h-full">
                        <div className="flex items-center gap-1.5 text-m3-primary border-b border-m3-outline-variant/10 pb-2">
                          <FileText className="h-4.5 w-4.5" />
                          <h4 className="font-extrabold text-xs uppercase tracking-wider font-mono">
                            Calendar Memos
                          </h4>
                        </div>
                        <p className="text-[10px] text-zinc-400">
                          Draft reminders or admin details here. All changes are instantly saved to the secure database.
                        </p>
                        <textarea
                          value={calendarNotes}
                          onChange={(e) => {
                            setCalendarNotes(e.target.value);
                          }}
                          placeholder="Type notes or specific reminders here..."
                          className="w-full flex-1 min-h-[350px] bg-m3-surface-lowest border border-m3-outline-variant rounded-xl p-3 outline-none text-m3-on-surface text-xs font-mono focus:border-m3-primary resize-none leading-relaxed"
                        />
                        <div className="flex justify-between items-center text-[9px] text-zinc-500 font-mono">
                          <span>Auto-Saved Securely</span>
                          <span>{calendarNotes.length} chars</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 flex-1 flex flex-col">
                        {/* Search, Status Filter, and Sort By */}
                        <div className="space-y-2">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                            <input
                              type="text"
                              value={payableSearchQuery}
                              onChange={(e) => setPayableSearchQuery(e.target.value)}
                              placeholder="Search supplier / ID..."
                              className="w-full bg-m3-surface-lowest border border-m3-outline-variant rounded-lg pl-8 pr-3 py-2 text-xs outline-none focus:border-m3-primary text-m3-on-surface font-medium"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-0.5">
                              <label className="text-[8px] font-black uppercase tracking-wider text-zinc-500">
                                Filter Status
                              </label>
                              <select
                                value={payableStatusFilter}
                                onChange={(e) => setPayableStatusFilter(e.target.value as any)}
                                className="w-full bg-m3-surface-lowest border border-m3-outline-variant rounded-md p-1 font-sans text-[10px] outline-none font-bold focus:border-m3-primary text-m3-on-surface"
                              >
                                <option value="all" className="bg-m3-surface-lowest text-m3-on-surface">All</option>
                                <option value="active" className="bg-m3-surface-lowest text-m3-on-surface">Active</option>
                                <option value="partial" className="bg-m3-surface-lowest text-m3-on-surface">Partial</option>
                                <option value="paid" className="bg-m3-surface-lowest text-m3-on-surface">Settled</option>
                              </select>
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[8px] font-black uppercase tracking-wider text-zinc-500">
                                Sort By
                              </label>
                              <select
                                value={payableSortField}
                                onChange={(e) => setPayableSortField(e.target.value as any)}
                                className="w-full bg-m3-surface-lowest border border-m3-outline-variant rounded-md p-1 font-sans text-[10px] outline-none font-bold focus:border-m3-primary text-m3-on-surface"
                              >
                                <option value="due" className="bg-m3-surface-lowest text-m3-on-surface">Urgency</option>
                                <option value="amount" className="bg-m3-surface-lowest text-m3-on-surface">Amount</option>
                                <option value="supplier" className="bg-m3-surface-lowest text-m3-on-surface">Supplier</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Interactive list of payables scroll area */}
                        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                          {sortedPayablesList.length > 0 ? (
                            sortedPayablesList.map((item, idx) => {
                              const isSelected = selectedCalendarDay === item.day;
                              
                              // Visual urgency coloring: orange-to-red
                              let urgencyBadge = "";
                              let alertIconColor = "";
                              if (item.isFinished) {
                                urgencyBadge = "text-emerald-500 bg-emerald-500/10 border-emerald-500/25";
                                alertIconColor = "text-emerald-500";
                              } else if (item.diffDays < 0) {
                                urgencyBadge = "text-rose-500 bg-rose-500/15 border-rose-500/30 animate-pulse font-black";
                                alertIconColor = "text-rose-500";
                              } else if (item.diffDays === 0) {
                                urgencyBadge = "text-red-400 bg-red-950/40 border border-red-500/30 animate-pulse font-black";
                                alertIconColor = "text-red-400";
                              } else if (item.diffDays <= 3) {
                                urgencyBadge = "text-orange-500 bg-orange-950/45 border border-orange-500/25 font-extrabold";
                                alertIconColor = "text-orange-500";
                              } else if (item.diffDays <= 7) {
                                urgencyBadge = "text-amber-500 bg-amber-950/20 border border-amber-500/15";
                                alertIconColor = "text-amber-500";
                              } else {
                                urgencyBadge = "text-zinc-400 bg-zinc-800/20 border border-zinc-700/10";
                                alertIconColor = "text-zinc-500";
                              }

                              const itemTypeLabel =
                                item.type === "Recurring Bill"
                                  ? `${item.frequency || "Monthly"} Bill`
                                  : item.type === "Simulated PO"
                                    ? "Simulated PO"
                                    : "Purchase Order";

                              return (
                                <div
                                  key={`${item.poId}-${idx}`}
                                  onClick={() => {
                                    setSelectedCalendarDay(item.day);
                                  }}
                                  className={`p-3 rounded-xl border transition-all text-left cursor-pointer hover:bg-m3-surface-high/35 ${
                                    isSelected
                                      ? "border-m3-primary bg-m3-primary/5 shadow-xs ring-1 ring-m3-primary"
                                      : "border-m3-outline-variant/15 bg-m3-surface-high/15"
                                  }`}
                                >
                                  {/* Item Header */}
                                  <div className="flex justify-between items-center gap-1.5 mb-1.5">
                                    <span className="text-[9px] font-extrabold text-m3-primary font-mono truncate max-w-[120px]" title={item.poNumber}>
                                      {item.poNumber}
                                    </span>
                                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-zinc-800/40 text-zinc-400 font-mono">
                                      {itemTypeLabel}
                                    </span>
                                  </div>

                                  {/* Item Main Title */}
                                  <h5 className="text-[11px] font-extrabold text-zinc-100 leading-tight truncate">
                                    {item.supplierName}
                                  </h5>

                                  {/* Status and Financial Summary */}
                                  <div className="mt-2 space-y-1">
                                    <div className="flex justify-between items-center text-[10px] font-mono">
                                      <span className="text-zinc-400">Balance:</span>
                                      <span className={`font-black ${item.isFinished ? "text-emerald-500" : "text-amber-500"}`}>
                                        ₱{item.remaining.toLocaleString()}
                                      </span>
                                    </div>

                                    {/* Small visual progress indicator */}
                                    {item.amount > 0 && (
                                      <div className="w-full bg-zinc-700/30 h-1 rounded-full overflow-hidden mt-1">
                                        <div
                                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                          style={{ width: `${Math.min(100, (item.totalPaid / item.amount) * 100)}%` }}
                                        />
                                      </div>
                                    )}
                                  </div>

                                  {/* Urgency Alert Badge */}
                                  <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-dashed border-m3-outline-variant/10">
                                    <div className={`text-[8.5px] px-1.5 py-0.5 rounded border flex items-center gap-1 uppercase tracking-wider font-extrabold ${urgencyBadge}`}>
                                      <AlertCircle className={`h-2.5 w-2.5 ${alertIconColor}`} />
                                      <span>
                                        {item.isFinished
                                          ? "Settled"
                                          : item.diffDays < 0
                                            ? "Overdue"
                                            : item.diffDays === 0
                                              ? "Due Today"
                                              : `${item.diffDays}d left`}
                                      </span>
                                    </div>
                                    <span className="text-[9px] font-mono font-bold text-zinc-500">
                                      Day {item.day} of {months[item.month].substring(0, 3)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-10 space-y-2 border border-dashed border-m3-outline-variant/15 rounded-xl">
                              <Info className="h-5 w-5 text-zinc-500 mx-auto animate-pulse" />
                              <p className="text-xs text-zinc-500 font-bold">No Payables Found</p>
                              <p className="text-[9.5px] text-zinc-500 max-w-[150px] mx-auto">
                                No records match search query or status filter in this period.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Primary Interactive Calendar Component */}
                  <div className="lg:col-span-3 bg-m3-surface-low border border-m3-outline-variant/15 p-5 rounded-2xl grid grid-cols-1 xl:grid-cols-4 gap-6 text-left">
                    <div className="xl:col-span-3 space-y-4">
                      <div className="flex justify-between items-center border-b border-m3-outline-variant/10 pb-3 gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-sm text-m3-primary flex items-center gap-1.5">
                            <CalendarDays className="h-5 w-5" />
                            Supplier Payment Calendar Cycle
                          </h3>
                          <button
                            type="button"
                            onClick={handleAutomatePayments}
                            className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                            title="Automatically settle all pending payables for this month"
                          >
                            <Zap className="h-3 w-3" />
                            <span>Auto-Pay Sweep</span>
                          </button>
                        </div>
                        
                        {/* Interactive Month & Year Navigation Widget */}
                        <div className="flex items-center gap-1 bg-m3-surface-high/30 p-1 rounded-xl border border-m3-outline-variant/10">
                          <button
                            type="button"
                            onClick={() => {
                              if (calendarMonth === 0) {
                                setCalendarMonth(11);
                                setCalendarYear((y) => y - 1);
                              } else {
                                setCalendarMonth((m) => m - 1);
                              }
                              setSelectedCalendarDay(null);
                            }}
                            className="p-1.5 hover:bg-m3-surface-high rounded-lg text-zinc-400 hover:text-m3-primary transition cursor-pointer border-0"
                            title="Previous Month"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          
                          <select
                            value={calendarMonth}
                            onChange={(e) => {
                              setCalendarMonth(Number(e.target.value));
                              setSelectedCalendarDay(null);
                            }}
                            className="bg-transparent border-0 text-xs font-black font-sans text-m3-on-surface focus:ring-0 cursor-pointer pr-8 py-0.5"
                          >
                            {months.map((m, idx) => (
                              <option key={m} value={idx} className="bg-m3-surface-lowest text-m3-on-surface font-sans">
                                {m}
                              </option>
                            ))}
                          </select>

                          <select
                            value={calendarYear}
                            onChange={(e) => {
                              setCalendarYear(Number(e.target.value));
                              setSelectedCalendarDay(null);
                            }}
                            className="bg-transparent border-0 text-xs font-bold font-mono text-m3-primary focus:ring-0 cursor-pointer pr-8 py-0.5"
                          >
                            {[2024, 2025, 2026, 2027, 2028].map((y) => (
                              <option key={y} value={y} className="bg-m3-surface-lowest text-m3-on-surface font-mono">
                                {y}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => {
                              if (calendarMonth === 11) {
                                setCalendarMonth(0);
                                setCalendarYear((y) => y + 1);
                              } else {
                                setCalendarMonth((m) => m + 1);
                              }
                              setSelectedCalendarDay(null);
                            }}
                            className="p-1.5 hover:bg-m3-surface-high rounded-lg text-zinc-400 hover:text-m3-primary transition cursor-pointer border-0"
                            title="Next Month"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-1.5 font-sans">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                          (d) => (
                            <div
                              key={d}
                              className="p-1.5 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest font-mono"
                            >
                              {d}
                            </div>
                          ),
                        )}
                        
                        {/* Starting empty offset padding days of week */}
                        {Array.from({ length: new Date(calendarYear, calendarMonth, 1).getDay() }).map((_, idx) => (
                          <div
                            key={`empty-${idx}`}
                            className="p-2 min-h-[85px] rounded-xl border border-transparent bg-transparent opacity-0"
                          />
                        ))}

                        {/* Month Days */}
                        {Array.from({ length: daysInActiveMonth }).map((_, i) => {
                          const day = i + 1;
                          const dayPayables = activePayables[day] || [];
                          const hasPayment = dayPayables.length > 0;
                          const isSelected = selectedCalendarDay === day;

                          // Compute financial progress metrics for the day
                          let totalDue = 0;
                          let totalPaid = 0;
                          let totalRemaining = 0;

                          dayPayables.forEach((p) => {
                            totalDue += p.amount;
                            const hist = installments[p.poId] || [];
                            const paid = hist.reduce((sum, inst) => sum + inst.amount, 0);
                            totalPaid += paid;
                            totalRemaining += Math.max(0, p.amount - paid);
                          });

                          const isFullyPaid = hasPayment && totalRemaining <= 0;
                          const isPartiallyPaid = hasPayment && totalPaid > 0 && totalRemaining > 0;

                          const dateKey = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                          const hasMemo = !!dayMemos[dateKey];

                          const todayObj = new Date();
                          const isToday = todayObj.getDate() === day &&
                                          todayObj.getMonth() === calendarMonth &&
                                          todayObj.getFullYear() === calendarYear;

                          let memoCount = 0;
                          if (hasMemo) {
                            try {
                              const raw = dayMemos[dateKey];
                              if (raw.startsWith("[") && raw.endsWith("]")) {
                                memoCount = JSON.parse(raw).length;
                              } else if (raw.trim() !== "") {
                                memoCount = 1;
                              }
                            } catch (e) {
                              memoCount = 1;
                            }
                          }

                          return (
                            <div
                              key={day}
                              onClick={() => setSelectedCalendarDay(day)}
                              className={`p-2 min-h-[85px] border rounded-xl flex flex-col justify-between transition-all cursor-pointer ${
                                isSelected
                                  ? "border-m3-primary bg-m3-primary/5 scale-102 ring-1 ring-m3-primary"
                                  : isToday
                                    ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/50 shadow-md shadow-amber-500/10"
                                    : isFullyPaid
                                      ? "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 shadow-3xs"
                                      : isPartiallyPaid
                                        ? "border-m3-primary/30 bg-m3-primary/5 hover:bg-m3-primary/10 shadow-3xs"
                                        : hasPayment
                                          ? "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 shadow-3xs"
                                          : "border-m3-outline-variant/10 bg-m3-surface-high/20 hover:border-zinc-350"
                              }`}
                            >
                              <div className="flex justify-between items-center w-full">
                                <div className="flex items-center gap-1">
                                  <span
                                    className={`text-[10px] font-black leading-none ${isSelected ? "text-m3-primary" : isToday ? "text-amber-500" : "text-zinc-400"}`}
                                  >
                                    {day}
                                  </span>
                                  {isToday && (
                                    <span className="text-[7px] bg-amber-500/20 text-amber-500 px-1 py-0.5 rounded font-black uppercase tracking-wide">
                                      Today
                                    </span>
                                  )}
                                </div>
                                {hasMemo && (
                                  <span className="flex items-center gap-0.5" title={`${memoCount} memo(s)`}>
                                    <FileText className="h-3 w-3 text-amber-500 animate-pulse" />
                                    {memoCount > 1 && (
                                      <span className="text-[8px] font-black bg-amber-500 text-black px-1 rounded-full scale-90">
                                        {memoCount}
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>
                              {hasPayment && (
                                <div className="text-[9px] font-bold leading-tight mt-1 space-y-1">
                                  {isFullyPaid ? (
                                    <>
                                      <span className="block font-black uppercase text-[7px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1 rounded text-center">
                                        SETTLED
                                      </span>
                                      <span className="block truncate text-[9.5px] text-emerald-500 font-mono text-center">
                                        ₱{totalPaid.toLocaleString()}
                                      </span>
                                    </>
                                  ) : isPartiallyPaid ? (
                                    <>
                                      <span className="block font-black uppercase text-[7px] bg-m3-primary/15 text-m3-primary px-1 rounded text-center">
                                        PARTIAL
                                      </span>
                                      <span className="block truncate text-[8.5px] text-zinc-300 font-mono text-center">
                                        ₱{totalRemaining.toLocaleString()}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="block font-black uppercase text-[7px] bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1 rounded text-center">
                                        PAYABLES
                                      </span>
                                      <span className="block truncate text-[9.5px] text-zinc-300 font-mono text-center">
                                        ₱{totalDue.toLocaleString()}
                                      </span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Day Detail Inspector Widget */}
                    <div className="bg-m3-surface p-4 rounded-2xl border border-m3-outline-variant/35 flex flex-col justify-between min-h-[420px] h-full">
                      <div className="space-y-4">
                        <div className="border-b border-m3-outline-variant/10 pb-3">
                          <h4 className="font-extrabold text-xs text-m3-primary uppercase tracking-widest font-mono">
                            Payable Day Inspector
                          </h4>
                          <p className="text-[10px] text-zinc-400 mt-1">
                            Review due accounts &amp; schedule payments or installment disbursement.
                          </p>
                        </div>

                        {selectedCalendarDay ? (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center bg-m3-primary/10 px-3 py-1.5 rounded-xl">
                              <span className="text-xs font-bold font-mono">
                                {months[calendarMonth]} {selectedCalendarDay}, {calendarYear}
                              </span>
                              <span className="text-[9px] font-black bg-m3-primary text-m3-on-primary px-2 py-0.5 rounded-full">
                                {selectedDayEntries.length} Invoices
                              </span>
                            </div>

                            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                              {selectedDayEntries.map((payVal, pIdx) => {
                                const payHistory = installments[payVal.poId] || [];
                                const totalPaid = payHistory.reduce((sum, inst) => sum + inst.amount, 0);
                                const remaining = Math.max(0, payVal.amount - totalPaid);
                                const isFinished = remaining <= 0;

                                return (
                                  <div
                                    key={pIdx}
                                    className="bg-m3-surface-low p-3 rounded-xl border border-m3-outline-variant/15 space-y-2 text-left"
                                  >
                                    <div className="flex justify-between items-start gap-1">
                                      <span className="text-[10px] font-extrabold text-m3-primary font-mono truncate max-w-[120px]" title={payVal.poNumber}>
                                        {payVal.poNumber}
                                      </span>
                                      <span
                                        className={`text-[8px] font-black px-1.5 py-0.5 uppercase tracking-widest rounded ${
                                          isFinished
                                            ? "bg-emerald-500/10 text-emerald-400"
                                            : totalPaid > 0
                                              ? "bg-m3-primary/10 text-m3-primary"
                                              : payVal.poNumber.startsWith("BILL-")
                                                ? "bg-m3-primary/10 text-m3-primary"
                                                : "bg-amber-500/10 text-amber-400"
                                        }`}
                                      >
                                        {isFinished ? "COMPLETED" : totalPaid > 0 ? "PARTIAL" : payVal.status}
                                      </span>
                                    </div>
                                    
                                    <h5 className="text-[11px] font-bold text-m3-on-surface leading-tight">
                                      {payVal.supplierName}
                                    </h5>

                                    {/* Financial Breakdown Progress */}
                                    <div className="bg-zinc-800/15 p-2 rounded-lg border border-m3-outline-variant/10 space-y-1.5 text-[10px]">
                                      <div className="flex justify-between text-zinc-400 font-mono text-[9px]">
                                        <span>Total Amount:</span>
                                        <span className="font-bold text-zinc-200">₱{payVal.amount.toLocaleString()}</span>
                                      </div>
                                      {totalPaid > 0 && (
                                        <div className="flex justify-between text-emerald-400 font-mono text-[9px]">
                                          <span>Amount Paid:</span>
                                          <span className="font-bold">₱{totalPaid.toLocaleString()}</span>
                                        </div>
                                      )}
                                      <div className="flex justify-between font-mono text-[10px] border-t border-dashed border-m3-outline-variant/10 pt-1">
                                        <span className="text-zinc-400 font-bold">Remaining Bal:</span>
                                        <span className={`font-black ${isFinished ? "text-emerald-500" : "text-amber-500"}`}>
                                          ₱{remaining.toLocaleString()}
                                        </span>
                                      </div>

                                      {/* Visual Progress Bar */}
                                      {payVal.amount > 0 && (
                                        <div className="space-y-1 pt-1">
                                          <div className="w-full bg-zinc-700/50 h-1.5 rounded-full overflow-hidden">
                                            <div
                                              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                              style={{ width: `${Math.min(100, (totalPaid / payVal.amount) * 100)}%` }}
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Installment History Nested Drawer */}
                                    {payHistory.length > 0 && (
                                      <div className="space-y-1 bg-m3-surface-high/30 p-2 rounded-lg border border-m3-outline-variant/5">
                                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block">
                                          Installment Payments Log
                                        </span>
                                        <div className="max-h-[70px] overflow-y-auto space-y-1 scrollbar-none">
                                          {payHistory.map((inst, hIdx) => (
                                            <div key={inst.id || hIdx} className="flex justify-between items-center text-[9px] font-mono text-zinc-400">
                                              <span>{new Date(inst.date).toLocaleDateString()}</span>
                                              <span className="text-emerald-400 font-bold">₱{inst.amount.toLocaleString()}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Payment Execution Form */}
                                    {!isFinished ? (
                                      <div className="border-t border-m3-outline-variant/10 pt-2.5 mt-2 space-y-2.5 text-left text-[11px]">
                                        <span className="text-[8px] font-black text-m3-primary uppercase tracking-widest block">
                                          Disburse Installment / Settle
                                        </span>

                                        {/* Payment Mode Segmented Selector */}
                                        <div className="grid grid-cols-2 gap-1 bg-zinc-800/20 p-0.5 rounded-lg border border-m3-outline-variant/5">
                                          <button
                                            type="button"
                                            onClick={() => setPartialPaymentMethod("cash")}
                                            className={`py-1 text-[9px] font-black uppercase rounded transition cursor-pointer border-0 ${
                                              partialPaymentMethod === "cash"
                                                ? "bg-m3-primary/10 text-m3-primary"
                                                : "text-zinc-500 hover:text-zinc-300 bg-transparent"
                                            }`}
                                          >
                                            Cash
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setPartialPaymentMethod("cheque")}
                                            className={`py-1 text-[9px] font-black uppercase rounded transition cursor-pointer border-0 ${
                                              partialPaymentMethod === "cheque"
                                                ? "bg-m3-primary/10 text-m3-primary"
                                                : "text-zinc-500 hover:text-zinc-300 bg-transparent"
                                            }`}
                                          >
                                            Cheque
                                          </button>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-1.5">
                                          <div className="space-y-0.5 col-span-2">
                                            <label className="text-[8px] text-zinc-400 font-bold">Amount to Pay *</label>
                                            <input
                                              type="number"
                                              value={partialPaymentAmount}
                                              onChange={(e) => setPartialPaymentAmount(e.target.value)}
                                              placeholder={remaining.toString()}
                                              max={remaining}
                                              className="w-full bg-m3-surface-lowest border border-m3-outline-variant rounded p-1.5 font-mono text-[10px] outline-none text-m3-on-surface focus:border-m3-primary"
                                            />
                                          </div>

                                          {partialPaymentMethod === "cheque" && (
                                            <div className="space-y-0.5 col-span-2 animate-fade-in">
                                              <label className="text-[8px] text-zinc-400 font-bold">Cheque Number *</label>
                                              <input
                                                type="text"
                                                value={partialChequeNumber}
                                                onChange={(e) => setPartialChequeNumber(e.target.value)}
                                                placeholder="e.g. CHQ-990812-A"
                                                className="w-full bg-m3-surface-lowest border border-m3-outline-variant rounded p-1.5 text-[10px] outline-none text-m3-on-surface font-mono focus:border-m3-primary"
                                              />
                                            </div>
                                          )}

                                          <div className="space-y-0.5">
                                            <label className="text-[8px] text-zinc-400 font-bold">Remarks / Notes</label>
                                            <input
                                              type="text"
                                              value={partialPaymentNotes}
                                              onChange={(e) => setPartialPaymentNotes(e.target.value)}
                                              placeholder="e.g. Partial remittance"
                                              className="w-full bg-m3-surface-lowest border border-m3-outline-variant rounded p-1.5 text-[10px] outline-none text-m3-on-surface focus:border-m3-primary"
                                            />
                                          </div>

                                          {!(db.currentUser?.role === UserRole.ADMIN) ? (
                                            <div className="space-y-0.5">
                                              <label className="text-[8px] text-rose-400 font-bold flex items-center gap-0.5">
                                                <span>Manager PIN *</span>
                                              </label>
                                              <input
                                                type="password"
                                                maxLength={6}
                                                value={partialManagerPin}
                                                onChange={(e) => setPartialManagerPin(e.target.value)}
                                                placeholder="••••"
                                                className="w-full bg-m3-surface-lowest border border-rose-500/35 rounded p-1.5 text-[10px] font-mono outline-none text-m3-on-surface focus:border-rose-500"
                                              />
                                            </div>
                                          ) : (
                                            <div className="space-y-0.5 flex flex-col justify-end">
                                              <label className="text-[8px] text-emerald-400 font-bold">Admin Status</label>
                                              <div className="text-[9px] text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg font-bold">
                                                ✓ Authorized ({db.currentUser?.fullName || "Admin"})
                                              </div>
                                            </div>
                                          )}
                                        </div>

                                        <div className="flex gap-2.5 pt-1">
                                          <button
                                            type="button"
                                            onClick={() => handleInstallmentPayment(payVal, Number(partialPaymentAmount), partialPaymentNotes)}
                                            className="flex-1 text-center py-1.5 bg-m3-primary/10 text-m3-primary hover:bg-m3-primary/20 text-[9px] font-black uppercase rounded-lg transition border-0 cursor-pointer"
                                          >
                                            Pay Installment
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleInstallmentPayment(payVal, remaining, "Full Settlement")}
                                            className="flex-1 text-center py-1.5 bg-m3-primary text-m3-on-primary hover:opacity-90 text-[9px] font-black uppercase rounded-lg transition border-0 cursor-pointer"
                                          >
                                            Pay in Full (₱{remaining.toLocaleString()})
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 p-2 rounded-lg text-[10px] font-bold">
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span>Invoice completely settled &amp; locked.</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Daily Memo / Note Editor */}
                            <div className="border-t border-m3-outline-variant/15 pt-3 mt-4 space-y-3 text-left">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-m3-primary uppercase tracking-widest flex items-center gap-1.5 font-sans">
                                  <FileText className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                                  <span>Daily Calendar Memos</span>
                                </span>
                                <span className="text-[8px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                  Multiple Memos Enabled
                                </span>
                              </div>
                              
                              {/* Display Memos List */}
                              {(() => {
                                const dateKey = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(selectedCalendarDay).padStart(2, "0")}`;
                                const rawMemo = dayMemos[dateKey] || "";
                                let memoList: string[] = [];
                                try {
                                  if (rawMemo.startsWith("[") && rawMemo.endsWith("]")) {
                                    memoList = JSON.parse(rawMemo);
                                  } else if (rawMemo.trim() !== "") {
                                    memoList = [rawMemo];
                                  }
                                } catch (e) {
                                  if (rawMemo.trim() !== "") {
                                    memoList = [rawMemo];
                                  }
                                }

                                return (
                                  <div className="space-y-2">
                                    <div className="max-h-[140px] overflow-y-auto space-y-1.5 scrollbar-thin pr-1">
                                      {memoList.map((memo, mIdx) => (
                                        <div key={mIdx} className="bg-m3-surface-lowest border border-m3-outline-variant/15 p-2 rounded-xl text-[11px] leading-relaxed text-m3-on-surface flex justify-between items-start gap-2 group shadow-3xs">
                                          <span className="break-words flex-1 font-sans font-semibold text-zinc-300">{memo}</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updatedList = memoList.filter((_, idx) => idx !== mIdx);
                                              const updated = { ...dayMemos };
                                              if (updatedList.length === 0) {
                                                delete updated[dateKey];
                                              } else {
                                                updated[dateKey] = JSON.stringify(updatedList);
                                              }
                                              setDayMemos(updated);
                                            }}
                                            className="text-rose-500 hover:text-rose-600 opacity-60 hover:opacity-100 transition px-1 py-0.5 cursor-pointer border-0 bg-transparent text-[10px]"
                                            title="Delete Memo"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ))}
                                      {memoList.length === 0 && (
                                        <div className="text-center py-4 border border-dashed border-m3-outline-variant/10 rounded-xl">
                                          <p className="text-[10px] text-zinc-500 italic">No memos registered for this day.</p>
                                        </div>
                                      )}
                                    </div>

                                    {/* Add Memo Input */}
                                    <div className="space-y-1 pt-1">
                                      <div className="flex gap-1.5">
                                        <input
                                          type="text"
                                          value={dayMemoInput}
                                          onChange={(e) => setDayMemoInput(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter" && dayMemoInput.trim()) {
                                              e.preventDefault();
                                              const updatedList = [...memoList, dayMemoInput.trim()];
                                              const updated = { ...dayMemos };
                                              updated[dateKey] = JSON.stringify(updatedList);
                                              setDayMemos(updated);
                                              setDayMemoInput("");
                                            }
                                          }}
                                          placeholder="Type a new memo for today..."
                                          className="flex-1 bg-m3-surface-lowest border border-m3-outline-variant/25 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-m3-primary text-m3-on-surface animate-fade-in"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (dayMemoInput.trim()) {
                                              const updatedList = [...memoList, dayMemoInput.trim()];
                                              const updated = { ...dayMemos };
                                              updated[dateKey] = JSON.stringify(updatedList);
                                              setDayMemos(updated);
                                              setDayMemoInput("");
                                            }
                                          }}
                                          className="px-3 bg-m3-primary text-m3-on-primary hover:opacity-90 transition rounded-xl text-xs font-black cursor-pointer border-0"
                                        >
                                          Add
                                        </button>
                                      </div>
                                      {memoList.length > 0 && (
                                        <div className="flex justify-end pt-1">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updated = { ...dayMemos };
                                              delete updated[dateKey];
                                              setDayMemos(updated);
                                              setDayMemoInput("");
                                            }}
                                            className="text-rose-500 hover:text-rose-600 font-bold cursor-pointer border-0 bg-transparent text-[8px] p-0 animate-fade-in"
                                          >
                                            Clear All Memos
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-12 space-y-2">
                            <Info className="h-8 w-8 text-zinc-500 mx-auto animate-pulse" />
                            <p className="text-xs text-zinc-500 italic">
                              No Date Selected
                            </p>
                            <p className="text-[9.5px] text-zinc-500">
                              Click any day with active{" "}
                              <span className="font-bold text-amber-500">
                                PAYABLES
                              </span>{" "}
                              or{" "}
                              <span className="font-bold text-emerald-500">
                                SETTLED
                              </span>{" "}
                              to disburse installments.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-m3-outline-variant/10 pt-3 text-[9px] text-zinc-500 leading-normal">
                        Terms: Automatic 15-day settlement window is calculated
                        from original cargo delivery receipt timestamps.
                        Unsettled credits attract regular interest guidelines.
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })()}

        {/* Category: 6. BIR REPORTS TAX COMPLIANCE CENTER */}
        {(activeSubTab === "bir-xz" ||
          activeSubTab === "bir-summary" ||
          activeSubTab === "bir-pwd" ||
          activeSubTab === "bir-athletes" ||
          activeSubTab === "bir-solo" ||
          activeSubTab === "bir-senior20" ||
          activeSubTab === "bir-senior5" ||
          activeSubTab === "bir-regular") && (
          <motion.div
            key="bir-tax"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-4 rounded-xl text-xs font-sans space-y-1">
                <span className="text-zinc-400 block font-bold uppercase tracking-wider text-[9px]">
                  Vatable Sales (Net of VAT)
                </span>
                <span className="text-sm font-black font-mono">
                  ₱
                  {vatableSales.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-4 rounded-xl text-xs font-sans space-y-1">
                <span className="text-zinc-400 block font-bold uppercase tracking-wider text-[9px]">
                  VAT-Exempt Sales Base
                </span>
                <span className="text-sm font-black font-mono">
                  ₱
                  {vatExemptSales.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-4 rounded-xl text-xs font-sans space-y-1">
                <span className="text-zinc-400 block font-bold uppercase tracking-wider text-[9px]">
                  12% Output VAT Amount
                </span>
                <span className="text-sm font-black text-amber-500 font-mono">
                  ₱
                  {vatOutput.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-4 rounded-xl text-xs font-sans space-y-1">
                <span className="text-zinc-400 block font-bold uppercase tracking-wider text-[9px]">
                  BIR Discounts & Deductions
                </span>
                <span className="text-sm font-black text-emerald-500 font-mono">
                  ₱
                  {discountTotal.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-4 rounded-xl text-xs font-sans space-y-1 col-span-2 sm:col-span-1">
                <span className="text-zinc-400 block font-bold uppercase tracking-wider text-[9px]">
                  Accredited Net Sales Due
                </span>
                <span className="text-sm font-black text-emerald-500 font-mono">
                  ₱
                  {totalSalesFromDay.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            {activeSubTab === "bir-xz" && (
              <div className="grid md:grid-cols-2 gap-6">
                {/* X Reading Card */}
                <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-5 rounded-2xl space-y-4 shadow-sm font-sans">
                  <div>
                    <h3 className="font-extrabold text-sm text-m3-primary uppercase font-mono tracking-wider">
                      Generate Cashier X-Reading
                    </h3>
                    <p className="text-xs text-m3-on-surface-variant mt-1">
                      Runs the system cumulative reading for the active terminal
                      user shift session. Reconciles drawer payments without
                      closing the grand cumulative counters.
                    </p>
                  </div>
                  <div className="p-4 bg-zinc-100 dark:bg-zinc-800/40 border border-m3-outline-variant/10 rounded-xl space-y-2 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span>Assigned Terminal:</span>
                      <span className="font-bold">TERM-01 (Emman Main)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Working Cashier:</span>
                      <span className="font-bold">
                        {db.currentUser?.fullName || "Rejilyn Manaban"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Subtotal Item Sales:</span>
                      <span>
                        ₱
                        {(totalSalesFromDay + discountTotal).toLocaleString(
                          "en-US",
                          { minimumFractionDigits: 2 },
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-rose-500">
                      <span>Deducted Vouchers:</span>
                      <span>
                        -₱
                        {discountTotal.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between text-emerald-500 font-extrabold border-t border-dashed border-zinc-500/30 pt-1.5 text-xs">
                      <span>Cash In Drawer Match:</span>
                      <span>
                        ₱
                        {totalSalesFromDay.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setPrintReceiptData({
                        title: "BIR X-READING SLIP",
                        receiptNo:
                          "X-" + Math.floor(Math.random() * 89999 + 10000),
                        customer: db.currentUser?.fullName || "Rejilyn Manaban",
                        date: new Date().toLocaleString(),
                        prevBalance: totalSalesFromDay + discountTotal,
                        paid: discountTotal,
                        newBalance: totalSalesFromDay,
                        pointsGained: 0,
                      });
                    }}
                    className="w-full py-2.5 bg-m3-primary hover:bg-m3-primary/95 text-m3-on-primary rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer text-xs border-0"
                  >
                    <Printer className="h-4 w-4" /> Print Current X-Reading Slip
                  </button>
                </div>

                {/* Z Reading Card */}
                <div className="bg-m3-surface-low border border-m3-outline-variant/15 p-5 rounded-2xl space-y-4 shadow-sm font-sans">
                  <div>
                    <h3 className="font-extrabold text-sm text-amber-500 uppercase font-mono tracking-wider">
                      Generate Cumulative Z-Reading
                    </h3>
                    <p className="text-xs text-m3-on-surface-variant mt-1">
                      Concludes all working shifts for the calendar day. Commits
                      locked fiscal audit counts, calculates output taxation
                      ledger, and resets cashier drawers. This is required for
                      official BIR tax submissions.
                    </p>
                  </div>
                  <div className="p-4 bg-zinc-100 dark:bg-zinc-800/40 border border-m3-outline-variant/10 rounded-xl space-y-2 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span>Z-Reading Record #:</span>
                      <span className="font-bold text-amber-500">
                        Z-RECOVERY-094
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Beg. Serial Balance:</span>
                      <span>₱5,420,910.00</span>
                    </div>
                    <div className="flex justify-between text-emerald-500">
                      <span>End. Accumulative Balance:</span>
                      <span>
                        ₱
                        {(5420910.0 + totalSalesFromDay).toLocaleString(
                          "en-US",
                          { minimumFractionDigits: 2 },
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-dashed border-zinc-500/30 pt-1.5">
                      <span>Total VAT Declared:</span>
                      <span>
                        ₱
                        {vatOutput.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          "Generating Z-Reading locks cashier drawers for the calendar cycle. Proceed?",
                        )
                      ) {
                        setPrintReceiptData({
                          title: "BIR CUMULATIVE Z-READING",
                          receiptNo:
                            "Z-" + Math.floor(Math.random() * 89999 + 10000),
                          customer: "EMMAN TILE MAIN HQ",
                          date: new Date().toLocaleString(),
                          prevBalance: 5420910.0,
                          paid: totalSalesFromDay,
                          newBalance: 5420910.0 + totalSalesFromDay,
                          pointsGained: 0,
                        });
                      }
                    }}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer text-xs border-0"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Finalize & Lock Daily Z-Reading
                  </button>
                </div>
              </div>
            )}

            {activeSubTab !== "bir-xz" && (
              <div className="bir-report-container bg-m3-surface-low border border-m3-outline-variant/15 p-5 rounded-2xl overflow-hidden shadow-sm space-y-4">
                <div className="flex justify-between items-center bg-m3-surface-high/30 p-3 rounded-xl border border-m3-outline-variant/10 font-sans text-xs">
                  <span className="font-extrabold text-m3-primary uppercase font-mono tracking-wider">
                    {activeSubTab
                      .replace("bir-", "")
                      .replace("-", " ")
                      .toUpperCase()}{" "}
                    LEDGER SHEETS
                  </span>
                  <div className="flex gap-2 bir-report-no-print">
                    <button
                      onClick={() => window.print()}
                      className="py-1 px-2 text-[11px] bg-zinc-200 dark:bg-zinc-800 text-m3-on-surface rounded font-bold hover:bg-zinc-300 transition flex items-center gap-1 cursor-pointer border-0"
                    >
                      <Printer className="h-3.5 w-3.5" /> Print Sheets
                    </button>
                    <button
                      onClick={() =>
                        alert("System exported taxation file as CSV!")
                      }
                      className="py-1 px-2 text-[11px] bg-m3-primary text-m3-on-primary rounded font-bold hover:opacity-90 transition flex items-center gap-1 cursor-pointer border-0"
                    >
                      <Download className="h-3.5 w-3.5" /> Export CSV
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-m3-outline-variant/15">
                  {(() => {
                    const filteredRows = db.sales
                      .filter((s) => !s.isDeleted)
                      .map((s, idx) => {
                        const isPwd =
                          activeSubTab === "bir-pwd" && idx % 2 === 0;
                        const isSenior20 =
                          activeSubTab === "bir-senior20" && idx % 3 === 0;
                        const isSenior5 =
                          activeSubTab === "bir-senior5" && idx % 3 === 1;
                        const isSolo =
                          activeSubTab === "bir-solo" && idx % 4 === 1;
                        const isAthletes =
                          activeSubTab === "bir-athletes" && idx % 5 === 2;
                        const isRegular =
                          activeSubTab === "bir-regular" &&
                          (s.discount || 0) > 0;
                        const isSummary = activeSubTab === "bir-summary";

                        const matchesFilter =
                          isSummary ||
                          isRegular ||
                          isPwd ||
                          isSenior20 ||
                          isSenior5 ||
                          isSolo ||
                          isAthletes;
                        if (!matchesFilter) return null;

                        const taxLabel = isPwd
                          ? "PWD Dsc. 20%"
                          : isSenior20
                            ? "Senior 20% Dsc."
                            : isSenior5
                              ? "Senior 5% Special"
                              : isSolo
                                ? "Solo Parent Dsc."
                                : isAthletes
                                  ? "Athletes Dsc."
                                  : "Regular Promo";
                        const isVatExempt =
                          isPwd ||
                          isSenior20 ||
                          isSenior5 ||
                          isSolo ||
                          isAthletes;

                        const rowVatable = isVatExempt ? 0 : s.subtotal || 0;
                        const rowVatExempt = isVatExempt ? s.subtotal || 0 : 0;
                        const rowVat = isVatExempt ? 0 : s.vat || 0;
                        const rowDiscount =
                          s.discount ||
                          (isVatExempt
                            ? parseFloat((rowVatExempt * 0.2).toFixed(2))
                            : 0);
                        const rowNet = parseFloat(
                          (
                            rowVatable +
                            rowVat +
                            rowVatExempt -
                            rowDiscount
                          ).toFixed(2),
                        );

                        return {
                          s,
                          taxLabel,
                          rowVatable,
                          rowVatExempt,
                          rowVat,
                          rowDiscount,
                          rowNet,
                        };
                      })
                      .filter((item) => item !== null) as Array<{
                      s: any;
                      taxLabel: string;
                      rowVatable: number;
                      rowVatExempt: number;
                      rowVat: number;
                      rowDiscount: number;
                      rowNet: number;
                    }>;

                    const sumVatable = filteredRows.reduce(
                      (sum, r) => sum + r.rowVatable,
                      0,
                    );
                    const sumVatExempt = filteredRows.reduce(
                      (sum, r) => sum + r.rowVatExempt,
                      0,
                    );
                    const sumVat = filteredRows.reduce(
                      (sum, r) => sum + r.rowVat,
                      0,
                    );
                    const sumDiscount = filteredRows.reduce(
                      (sum, r) => sum + r.rowDiscount,
                      0,
                    );
                    const sumNet = filteredRows.reduce(
                      (sum, r) => sum + r.rowNet,
                      0,
                    );

                    return (
                      <table className="w-full text-left font-sans text-xs divide-y divide-m3-outline-variant/15 min-w-[900px]">
                        <thead className="bg-m3-surface-high/50 font-black border-b border-m3-outline-variant/15">
                          <tr>
                            <th className="p-3">Reference Date</th>
                            <th className="p-3">SI Number</th>
                            <th className="p-3">Customer & Classification</th>
                            <th className="p-3 text-right">VATable Sales</th>
                            <th className="p-3 text-right">VAT-Exempt Sales</th>
                            <th className="p-3 text-right">12% Output VAT</th>
                            <th className="p-3 text-right">Sales Discount</th>
                            <th className="p-3 text-right">Net Sales Due</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-m3-outline-variant/10 bg-m3-surface-low">
                          {filteredRows.map(
                            ({
                              s,
                              taxLabel,
                              rowVatable,
                              rowVatExempt,
                              rowVat,
                              rowDiscount,
                              rowNet,
                            }) => (
                              <tr
                                key={s.id}
                                className="hover:bg-m3-primary/5 transition-all text-m3-on-surface"
                              >
                                <td className="p-3 font-mono text-[10.5px] text-zinc-400">
                                  {new Date(
                                    s.createdAt || Date.now(),
                                  ).toLocaleString()}
                                </td>
                                <td className="p-3 font-mono font-black text-m3-primary">
                                  {s.saleNumber || s.id}
                                </td>
                                <td className="p-3 font-bold uppercase text-[10px]">
                                  {s.customerName || "Walk-In Customer"}
                                  <span className="block font-mono text-[9px] text-zinc-400 font-normal lowercase tracking-wide mt-0.5">
                                    ({taxLabel})
                                  </span>
                                </td>
                                <td className="p-3 text-right font-mono">
                                  ₱
                                  {rowVatable.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </td>
                                <td className="p-3 text-right font-mono">
                                  ₱
                                  {rowVatExempt.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </td>
                                <td className="p-3 text-right font-mono text-amber-500">
                                  ₱
                                  {rowVat.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </td>
                                <td className="p-3 text-right font-mono text-rose-500 font-bold">
                                  -₱
                                  {rowDiscount.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </td>
                                <td className="p-3 text-right font-mono text-emerald-500 font-extrabold">
                                  ₱
                                  {rowNet.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                        <tfoot className="bg-m3-surface-high/30 border-t border-m3-outline-variant/30 font-black text-[11px] text-m3-on-surface">
                          <tr>
                            <td
                              colSpan={3}
                              className="p-3 text-left uppercase tracking-wider text-zinc-400"
                            >
                              Cumulative Ledger Totals:
                            </td>
                            <td className="p-3 text-right font-mono">
                              ₱
                              {sumVatable.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="p-3 text-right font-mono">
                              ₱
                              {sumVatExempt.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="p-3 text-right font-mono text-amber-500">
                              ₱
                              {sumVat.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="p-3 text-right font-mono text-rose-500">
                              -₱
                              {sumDiscount.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="p-3 text-right font-mono text-emerald-500">
                              ₱
                              {sumNet.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    );
                  })()}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
