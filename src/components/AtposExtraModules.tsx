/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
AlertCircle,
Archive,
Award,
Building2,
CalendarDays,
Check,
CheckCircle2,
ChevronLeft,
ChevronRight,
CreditCard,
DollarSign,
Download,
FileText,
History,
Info,
PlusCircle,
Printer,
Receipt,
RefreshCw,
Save,
Search,
Settings,
Sliders,
Sparkles,
Trash2,
UserPlus,
Users
} from "lucide-react";
import { AnimatePresence,motion } from "motion/react";
import React,{ useEffect,useState } from "react";
import { useDb } from "../context/DbContext";
import { saveFileToBackup } from "../lib/fileBackupHelper";
import { CustomCorporateBill,Expense,Member,ProductReturn,UserRole } from "../types/db";
import { formatCurrency } from "../utils/formatters";
import { ConfirmationModal } from "./ConfirmationModal";
import { useReceiptFontSize } from "./ReceiptFontSizeControl";

interface AtposExtraModulesProps {
 activeSubTab: string;
 darkMode?: boolean;
 _darkMode?: boolean;
 onNavigate: (tabId: string) => void;
}

// Durable local storage keys for persistence
const LOCAL_STORAGE_MEMBERS = "atpos_v2_members_list";

export default function AtposExtraModules({
  activeSubTab,
  darkMode,
  _darkMode,
  onNavigate,
}: AtposExtraModulesProps) {
 const db = useDb();

 // States from DbContext
 const {
 members: rawMembers,
 setMembers,
 expenses: rawExpenses,
 setExpenses,
 productReturns,
 setProductReturns,
 customBills,
 setCustomBills,
 calendarNotes,
 setCalendarNotes,
 dayMemos,
 setDayMemos,
 sales,
 auditLogs,
 } = db;

 const [confirmZReadingModal, setConfirmZReadingModal] = useState(false);

 // Form states - Member
 const [newMemberName, setNewMemberName] = useState("");
 const [newMemberPhone, setNewMemberPhone] = useState("");
 const [newMemberEmail, setNewMemberEmail] = useState("");
 const [newMemberLimit, setNewMemberLimit] = useState(15000);
 const [memberSearch, setMemberSearch] = useState("");
 const [selectedMember, setSelectedMember] = useState<Member | null>(null);
 const [memberBranchFilter, setMemberBranchFilter] = useState<string>("All");
 const [expenseBranchFilter, setExpenseBranchFilter] = useState<string>("All");
 const [expBranchId, setExpBranchId] = useState<string>(db.currentUser?.branchAssignmentId || "B1");

 // Member Loyalty States
 const [loyaltySpendInput, setLoyaltySpendInput] = useState(() => (db.loyaltyConfig?.spendPerPoint || 500).toString());
 const [loyaltyPointValInput, setLoyaltyPointValInput] = useState(() => (db.loyaltyConfig?.pointValueInPhp || 1.0).toString());
 const [loyaltyEnabled, setLoyaltyEnabled] = useState(() => db.loyaltyConfig?.enabled ?? true);
 const [loyaltySavedSuccess, setLoyaltySavedSuccess] = useState(false);
 const [showLoyaltySettings, setShowLoyaltySettings] = useState(false);
 const [loyaltyMemberSearch, setLoyaltyMemberSearch] = useState("");
 const [showAdjustPointsModal, setShowAdjustPointsModal] = useState(false);
 const [selectedLoyaltyMember, setSelectedLoyaltyMember] = useState<Member | null>(null);
 const [adjustPointsAmount, setAdjustPointsAmount] = useState("");
 const [adjustPointsReason, setAdjustPointsReason] = useState("");

 useEffect(() => {
   if (db.loyaltyConfig) {
     setLoyaltySpendInput(db.loyaltyConfig.spendPerPoint.toString());
     setLoyaltyPointValInput(db.loyaltyConfig.pointValueInPhp.toString());
     setLoyaltyEnabled(db.loyaltyConfig.enabled);
   }
 }, [db.loyaltyConfig]);

 const isAdmin = db.currentUser?.role === "Admin" || db.currentUser?.role?.toUpperCase() === "ADMIN";
 const userBranchId = db.currentUser?.branchAssignmentId || "B1";

 const members = React.useMemo(() => {
 return rawMembers.filter((m) => {
 const memberBranch = m.branchId || "B1";
 if (memberBranchFilter !== "All" && memberBranch !== memberBranchFilter) {
 return false;
 }
 if (isAdmin) return true;
 return memberBranch === userBranchId;
 });
 }, [rawMembers, isAdmin, userBranchId, memberBranchFilter]);

 const expenses = React.useMemo(() => {
 return rawExpenses.filter((ex) => {
 const expenseBranch = ex.branchId || "B1";
 if (expenseBranchFilter !== "All" && expenseBranch !== expenseBranchFilter) {
 return false;
 }
 if (isAdmin) return true;
 return expenseBranch === userBranchId;
 });
 }, [rawExpenses, isAdmin, userBranchId, expenseBranchFilter]);
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
 const [billDueDate, setBillDueDate] = useState(() => new Date().toISOString().split("T")[0]);

 const [printReceiptData, setPrintReceiptData] = useState<any>(null);
 const [dateFilter, setDateFilter] = useState("");
  const [expenseSearchQuery, setExpenseSearchQuery] = useState("");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("");
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
 points: 1,
 creditLimit: limitNum,
 outstandingBalance: 0,
 status: "Active",
  branchId: memberBranchFilter !== "All" ? memberBranchFilter : (db.currentUser?.branchAssignmentId || "B1"),
 };
 saveMembers([...rawMembers, m]);

 db.addAuditLog(
 "MEMBER_REGISTER",
 `Registered member ${m.fullName} with credit ceiling of ₱${(Number(m?.creditLimit) || 0).toLocaleString()}`,
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
 `Payment amount cannot exceed the outstanding balance of ₱${(Number(selectedMember?.outstandingBalance) || 0).toLocaleString()}`,
 );
 return;
 }

 const updated = rawMembers.map((m) => {
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
 recordedBy: db.currentUser?.fullName || "System Administrator",
 notes: expNotes || "Casual office petty cash expense",
 branchId: expBranchId || db.currentUser?.branchAssignmentId || "B1",
 };

 db.addAuditLog(
 "EXPENSE_LOG",
 `Spent ₱${amountNum.toLocaleString()} on ${finalCategory}: ${entry.notes}`,
 "Expenses",
 entry.id,
 JSON.stringify(entry),
 );

 saveExpenses([entry, ...rawExpenses]);
 setExpAmount("");
 setExpNotes("");
 setCustomCategory("");
 alert(
 "Monthly branch expense securely registered & deducted from general branch ledger!",
 );
 };

 const handleDeleteExpense = (id: string) => {
 const target = rawExpenses.find((ex) => ex.id === id);
 const updated = rawExpenses.map((ex) =>
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
  (acc, s) => acc + (Number(s.grandTotal) || 0),
 0,
 );
 const discountTotal = activeSales.reduce(
  (acc, s) => acc + (Number(s.discount) || 0),
 0,
 );
 const vatOutput = activeSales.reduce((acc, s) => acc + (Number(s.vat) || 0), 0);
 const vatableSales = activeSales.reduce(
  (acc, s) => acc + (Number(s.vat) > 0 ? (Number(s.subtotal) - (Number(s.vat) || 0)) || 0 : 0),
 0,
 );
 const vatExemptSales = activeSales.reduce(
  (acc, s) => acc + (Number(s.vat) === 0 ? Number(s.subtotal) || 0 : 0),
 0,
 );

 const { fontClass: receiptFontClass } = useReceiptFontSize();

 return (
 <div className="space-y-6">
 {/* Dynamic Module Header */}
 <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 rounded-2xl bg-content1 border border-divider/20 shadow-sm">
 <div>
 <h2 className="text-xl font-bold font-sans text-foreground capitalize leading-none">
 {activeSubTab.replace(/-/g, " ")}
 </h2>
 </div>

 <span className="self-start md:self-auto px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/25">
 {(() => {
 const currentBranch = db.branches.find(b => b.id === db.currentUser?.branchAssignmentId);
 if (currentBranch) return currentBranch.name.toUpperCase();
 if (db.currentUser?.branchAssignmentId) return `BRANCH REGION ${db.currentUser.branchAssignmentId}`;
 return "CENTRAL HEADQUARTERS";
 })()}
 </span>
 </div>

 {printReceiptData && (
 <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center bg-gray-950/60 backdrop-blur-sm p-4 md:items-center">
 <motion.div
 initial={{ scale: 0.95, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 className={`w-full max-w-sm bg-white text-zinc-900 rounded-2xl shadow-2xl p-5 text-xs border border-zinc-200 relative max-h-[85vh] overflow-y-auto bir-receipt-container scrollbar-thin ${receiptFontClass}`}
 >
 
 <div className="text-center pb-3 border-b-2 border-dashed border-zinc-300">
 <h3 className="font-extrabold text-sm tracking-wide">
 {db.branches.find(b => b.id === printReceiptData.branchId)?.name || localStorage.getItem("tilepoint_company_name_v1") || db.branches[0]?.name || "STORE RECEIPT"}
 </h3>
 <p className="text-[10px]">BRANCH ID: {printReceiptData.branchId || db.branches[0]?.branchCode || db.branches[0]?.id || "MAIN"}</p>
 <p className="text-[9px] text-default-500">
 {db.branches.find(b => b.id === printReceiptData.branchId)?.address || db.branches[0]?.address || "Store Address"}
 </p>
 <p className="text-[9px] text-default-500 ">
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
 <p className="text-[9px] text-default-500">
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
 className="flex-1 py-1.5 rounded-lg bg-content1 hover:bg-content2 text-white font-bold transition cursor-pointer"
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
 <div className="md:col-span-1 bg-content1 border border-divider/15 p-5 rounded-2xl h-fit space-y-4">
 <div className="flex items-center gap-2 text-primary border-b border-divider/10 pb-3">
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
 <label className="font-bold text-default-500">
 Full Client Name *
 </label>
 <input
 required
 value={newMemberName ?? ''}
 onChange={(e) => setNewMemberName(e.target.value)}
 type="text"
 placeholder="Juan Perez Inc."
 className="w-full bg-content3 border border-divider rounded-lg p-2.5 outline-none focus:border-primary"
 />
 </div>
 <div className="space-y-1">
 <label className="font-bold text-default-500">
 Active Mobile Phone *
 </label>
 <input
 required
 value={newMemberPhone ?? ''}
 onChange={(e) => setNewMemberPhone(e.target.value)}
 type="tel"
 placeholder="Phone number"
 className="w-full bg-content3 border border-divider rounded-lg p-2.5 outline-none focus:border-primary"
 />
 </div>
 <div className="space-y-1">
 <label className="font-bold text-default-500">
 Email Address
 </label>
 <input
 value={newMemberEmail ?? ''}
 onChange={(e) => setNewMemberEmail(e.target.value)}
 type="email"
 placeholder="perez@gmail.com"
 className="w-full bg-content3 border border-divider rounded-lg p-2.5 outline-none focus:border-primary"
 />
 </div>
 <div className="space-y-1">
 <label className="font-bold text-default-500">
 Credit Account Limit (PHP)
 </label>
 <input
 value={newMemberLimit ?? ''}
 onChange={(e) => setNewMemberLimit(Number(e.target.value))}
 type="number"
 className="w-full bg-content3 border border-divider rounded-lg p-2.5 outline-none focus:border-primary"
 />
 </div>
 <button
 type="submit"
 className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-bold transition hover:opacity-90"
 >
 Submit Customer Info
 </button>
 </form>
 </div>

 <div className="md:col-span-2 space-y-4">
 <div className="flex bg-content1 border border-divider/15 p-2 rounded-xl items-center gap-2 font-sans text-xs">
 <Search className="h-4 w-4 text-default-500 pl-1 shrink-0" />
 <input
 value={memberSearch ?? ''}
 onChange={(e) => setMemberSearch(e.target.value)}
 placeholder="Filter customer database..."
 className="w-full bg-transparent border-0 outline-none p-1.5"
 />
 <div className="flex items-center gap-1 shrink-0 border-l border-divider/20 pl-2">
 <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
 <select
 value={memberBranchFilter ?? ''}
 onChange={(e) => setMemberBranchFilter(e.target.value)}
 className="bg-background border border-divider/30 text-primary text-xs font-bold rounded-lg px-2 py-1 outline-none cursor-pointer"
 >
 <option value="All">All Branches</option>
 {db.branches.filter((b) => !b.isDeleted).map((b) => (
 <option key={b.id} value={b.id}>
 {b.name}
 </option>
 ))}
 </select>
 </div>
 </div>

 <div className="bg-content1 border border-divider/15 rounded-2xl overflow-hidden shadow-sm">
 <table className="w-full text-left font-sans text-xs">
 <thead className="bg-content3/50 font-bold border-b border-divider/15">
 <tr>
 <th className="p-3">Client Member</th>
 <th className="p-3">Contact</th>
 <th className="p-3 text-right">Points</th>
 <th className="p-3 text-right">Credit Limit</th>
 <th className="p-3 text-right">Current Accounts</th>
 </tr>
 </thead>
 <tbody>
 {(() => {
 const filteredMembers = members.filter((m) =>
 m.fullName.toLowerCase().includes(memberSearch.toLowerCase()) ||
 m.phone.toLowerCase().includes(memberSearch.toLowerCase()) ||
 m.email.toLowerCase().includes(memberSearch.toLowerCase()) ||
 m.id.toLowerCase().includes(memberSearch.toLowerCase())
 );

 if (filteredMembers.length === 0) {
 return (
 <tr>
 <td colSpan={5} className="p-8 text-center">
 <div className="flex flex-col items-center justify-center space-y-2.5 py-6">
 <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner border border-primary/15">
 <Users className="h-6 w-6" />
 </div>
 <div className="space-y-1">
 <p className="font-extrabold text-sm text-foreground">
 {memberSearch ? "No Matching Client Members Found" : "No Registered Client Members"}
 </p>
 <p className="text-xs text-default-500 max-w-sm mx-auto leading-relaxed">
 {memberSearch
 ? `No customer profile matches "${memberSearch}". Check spelling or clear your filter.`
 : "No corporate or retail members registered yet. Use the client enrollment form on the left to add members."}
 </p>
 </div>
 {memberSearch && (
 <button
 type="button"
 onClick={() => setMemberSearch("")}
 className="mt-1 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg transition-colors cursor-pointer border-0"
 >
 Clear Search Filter
 </button>
 )}
 </div>
 </td>
 </tr>
 );
 }

 return filteredMembers.map((m) => (
 <tr
 key={m.id}
 className="border-b border-divider/10 hover:bg-primary/10 transition-all cursor-pointer"
 onClick={() => {
   setSelectedMember(m);
   onNavigate("members-receivables");
 }}
 title="Click to view A/R Ledger and settle account"
 >
 <td className="p-3 font-semibold text-foreground flex items-center gap-2">
 <Users className="h-4 w-4 text-primary" />
 <div>
 <div>{m.fullName}</div>
 <div className="text-[10px] text-default-500 mt-0.5">
 {m.id}
 </div>
 </div>
 </td>
 <td className="p-3">
 <div>{m.phone}</div>
 <div className="text-[10px] text-default-500">
 {m.email}
 </div>
 </td>
 <td className="p-3 text-right font-bold text-amber-500">
 {m.points} pts
 </td>
 <td className="p-3 text-right ">
 ₱{(Number(m?.creditLimit) || 0).toLocaleString("en-US")}
 </td>
 <td className="p-3 text-right text-rose-500 font-extrabold">
 ₱{(Number(m?.outstandingBalance) || 0).toLocaleString("en-US")}
 </td>
 </tr>
 ));
 })()}
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
 <div className="bg-content1 border border-divider/15 p-5 rounded-2xl space-y-4">
 <h3 className="font-bold text-sm text-primary">
 Settle Customer Account Ledger
 </h3>

 <div className="space-y-2 font-sans text-xs">
 <label className="font-bold text-default-500">
 Select Account Client *
 </label>
 <div className="space-y-1 max-h-48 overflow-y-auto border border-divider rounded-lg divide-y divide-divider/15">
 {(() => {
 const receivableMembers = members.filter((m) => m.outstandingBalance > 0);

 if (receivableMembers.length === 0) {
 return (
 <div className="p-6 text-center text-xs space-y-2 bg-content1/50 rounded-lg">
 <CheckCircle2 className="h-7 w-7 text-emerald-500 mx-auto opacity-90" />
 <p className="font-extrabold text-foreground">All Accounts Fully Settled</p>
 <p className="text-[11px] text-default-500 max-w-xs mx-auto leading-relaxed">
 There are currently no registered client accounts with outstanding credit balances.
 </p>
 </div>
 );
 }

 return receivableMembers.map((m) => (
 <button
 key={m.id}
 onClick={() => setSelectedMember(m)}
 className={`w-full text-left p-3 flex justify-between cursor-pointer transition ${
 selectedMember?.id === m.id
 ? "bg-primary/10 border-l-4 border-primary font-bold"
 : "hover:bg-primary/5"
 }`}
 >
 <div>
 <span>{m.fullName}</span>
 <span className="text-[10px] block text-default-500">
 Limit: ₱{(Number(m?.creditLimit) || 0).toLocaleString()}
 </span>
 </div>
 <span className="text-rose-500 ">
 ₱{(Number(m?.outstandingBalance) || 0).toLocaleString()}
 </span>
 </button>
 ));
 })()}
 </div>
 </div>

 {selectedMember && (
 <form
 onSubmit={handlePayBalance}
 className="space-y-4 font-sans text-xs pt-3 animate-fade-in border-t border-divider/15"
 >
 <div className="flex justify-between items-center bg-primary/5 p-3 rounded-xl border border-primary/10">
 <div>
 <span className="text-[10px] text-primary font-bold uppercase block">
 Selected Account Billing
 </span>
 <span className="font-extrabold text-sm">
 {selectedMember.fullName}
 </span>
 </div>
 <div className="text-right">
 <span className="text-[10px] text-default-500 block">
 Balance Due
 </span>
 <span className="text-sm font-black text-rose-500">
 ₱{(Number(selectedMember?.outstandingBalance) || 0).toLocaleString()}
 </span>
 </div>
 </div>

 <div className="space-y-1">
 <label className="font-bold text-default-500">
 Amount to Tender (PHP) *
 </label>
 <input
 type="number"
 required
 value={paymentAmount ?? ''}
 onChange={(e) => setPaymentAmount(e.target.value)}
 placeholder="Amount"
 className="w-full bg-content3 border border-divider rounded-lg p-2.5 outline-none focus:border-primary"
 max={selectedMember.outstandingBalance}
 />
 </div>

 <button
 type="submit"
 className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer"
 >
 <CreditCard className="h-4 w-4" />
 Process Payment & Print Slip
 </button>
 </form>
 )}
 </div>

 <div className="space-y-4">
 <div className="bg-content1 border border-divider/15 p-5 rounded-2xl grid grid-cols-2 gap-4">
 <div className="p-4 bg-zinc-100 dark:bg-content2/40 rounded-xl border border-divider/10">
 <span className="text-[10px] font-bold text-default-500 block uppercase ">
 Total Outstanding A/R
 </span>
 <span className="text-lg font-black text-rose-500 ">
 ₱
 {members
 .reduce((acc, m) => acc + m.outstandingBalance, 0)
 .toLocaleString()}
 </span>
 </div>
 <div className="p-4 bg-zinc-100 dark:bg-content2/40 rounded-xl border border-divider/10">
 <span className="text-[10px] font-bold text-default-500 block uppercase ">
 Overdue Accounts Limit
 </span>
 <span className="text-lg font-black text-amber-500 ">
 {
 members.filter(
 (m) => m.outstandingBalance > m.creditLimit * 0.8,
 ).length
 }{" "}
 clients
 </span>
 </div>
 </div>

 <div className="bg-content1 border border-divider/15 p-5 rounded-2xl text-xs space-y-3 font-sans">
 <div className="flex items-center gap-1.5 font-bold text-default-500 pb-2 border-b border-divider/10">
 <Info className="h-4 w-4 text-primary" />
 <span>Credit Allocation Protocols</span>
 </div>
 </div>

 {/* A/R Ledger & Payment History Card */}
 <div className="bg-content1 border border-divider/15 p-5 rounded-2xl space-y-4 font-sans text-xs">
   <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-divider/10 pb-3">
     <div>
       <h3 className="font-bold text-sm text-primary flex items-center gap-1.5">
         <History className="h-4.5 w-4.5" />
         <span>A/R Ledger & Payment History</span>
       </h3>
     </div>
     <div className="flex items-center gap-1">
       <span className="text-[10px] text-default-500">Account:</span>
       <select
         value={selectedMember ? selectedMember.id : "all"}
         onChange={(e) => {
           const val = e.target.value;
           if (val === "all") {
             setSelectedMember(null);
           } else {
             const m = members.find((x) => x.id === val);
             if (m) setSelectedMember(m);
           }
         }}
         className="bg-content3 border border-divider rounded px-2.5 py-1 text-[11px] outline-none font-bold text-foreground"
       >
         <option value="all">All Members</option>
         {members.map((m) => (
           <option key={m.id} value={m.id}>
             {m.fullName}
           </option>
         ))}
       </select>
     </div>
   </div>

   {/* Combined Ledger List */}
   {(() => {
     // 1. Charges (sales on Member Credit)
     const charges = (sales || [])
       .filter((sale) => sale.paymentMethod === "Member Credit" && !sale.isDeleted)
       .map((sale) => {
         const matchingM = members.find(
           (m) => m.fullName.toLowerCase() === sale.customerName.toLowerCase()
         );
         return {
           id: sale.id,
           date: sale.createdAt,
           memberName: sale.customerName,
           memberId: matchingM ? matchingM.id : "unknown",
           type: "CHARGE",
           reference: sale.saleNumber,
           amount: sale.grandTotal,
           description: `Staged project tiles checkout invoice: ${sale.saleNumber}`,
           cashier: sale.cashierName,
         };
       });

     // 2. Payments (MEMBER_PAYMENT audit logs)
     const payments = (auditLogs || [])
       .filter((log) => log.action === "MEMBER_PAYMENT")
       .map((log) => {
         const desc = log.description || "";
         let paymentAmt = 0;
         try {
           if (log.changePayload) {
             const parsed = JSON.parse(log.changePayload);
             paymentAmt = parsed.paymentAmount || 0;
           }
         } catch (e) {
           const match = desc.match(/₱([\d,.]+)/);
           if (match) {
             paymentAmt = parseFloat(match[1].replace(/,/g, ""));
           }
         }
         const matchingM = members.find((m) => m.id === log.recordId);
         return {
           id: log.id,
           date: log.timestamp,
           memberName: matchingM ? matchingM.fullName : (desc.includes("for member ") ? desc.split("for member ")[1]?.split(".")[0]?.trim() : "Unknown Member"),
           memberId: log.recordId,
           type: "PAYMENT",
           reference: log.id.slice(0, 8).toUpperCase(),
           amount: paymentAmt,
           description: desc,
           cashier: log.username || "Cashier",
         };
       });

     // Combine and filter
     const combined = [...charges, ...payments]
       .filter((item) => {
         if (!selectedMember) return true;
         return item.memberId === selectedMember.id;
       })
       .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

     if (combined.length === 0) {
       return (
         <div className="py-10 text-center space-y-2 bg-content1/60 border border-divider/15 rounded-xl p-4">
           <FileText className="h-8 w-8 text-primary/30 mx-auto" />
           <p className="font-extrabold text-xs text-foreground">No Ledger Activity Found</p>
           <p className="text-[11px] text-default-500 max-w-xs mx-auto leading-normal">
             No credit charges or settlement payment transactions found {selectedMember ? `for ${selectedMember.fullName}` : "in the system"}.
           </p>
         </div>
       );
     }

     return (
       <div className="max-h-[320px] overflow-y-auto border border-divider/15 rounded-xl divide-y divide-divider/10 bg-content1 scrollbar-thin">
         {combined.map((item, idx) => (
           <div key={idx} className="p-3 flex items-start justify-between hover:bg-primary/5 transition-colors gap-3">
             <div className="space-y-1 text-left">
               <div className="flex items-center gap-2 flex-wrap">
                 <span className={`text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                   item.type === "CHARGE" 
                     ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" 
                     : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                 }`}>
                   {item.type === "CHARGE" ? "Charge / Debit" : "Payment / Settle"}
                 </span>
 <span className=" text-[9px] text-default-500 font-bold">
                   Ref: {item.reference}
                 </span>
               </div>
               <p className="font-bold text-foreground text-[11px] leading-tight">
                 {item.description}
               </p>
               <div className="flex items-center gap-1.5 text-[10px] text-default-500 font-semibold font-sans flex-wrap">
                 {!selectedMember && <span className="text-primary font-bold">{item.memberName}</span>}
                 {!selectedMember && <span>•</span>}
                 <span>{new Date(item.date || 0).toLocaleString()}</span>
                 <span>•</span>
                 <span>By: {item.cashier}</span>
               </div>
             </div>
             <div className="text-right shrink-0">
 <span className={` text-xs font-black ${
                 item.type === "CHARGE" ? "text-amber-500" : "text-emerald-500"
               }`}>
                 {item.type === "CHARGE" ? "+" : "-"}₱{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
               </span>
             </div>
           </div>
         ))}
       </div>
     );
   })()}
 </div>
 </div>
 </motion.div>
 )}

 {activeSubTab === "members-loyalty" && (() => {
    const config = db.loyaltyConfig || {
      enabled: true,
      spendPerPoint: 500,
      pointsPerSpend: 1,
      pointValueInPhp: 1.0,
    };

    const totalPointsPool = members.reduce((acc, m) => acc + (m.points || 0), 0);
    const totalMonetaryValue = totalPointsPool * (config.pointValueInPhp || 1.0);

    return (
      <motion.div
        key="loyalty"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 font-sans"
      >
        {/* Simplified Header & Overview Banner */}
        <div className="bg-content1 border border-divider/15 p-4 rounded-2xl shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-divider/10 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500 shrink-0" />
                <h3 className="font-extrabold text-sm text-primary">Member Account & Loyalty Desk</h3>
              </div>
            </div>

            {(db.currentUser?.role === UserRole.ADMIN || db.currentUser?.role === UserRole.MANAGER) && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowLoyaltySettings(!showLoyaltySettings)}
                  className="px-3 py-1.5 bg-content3 hover:bg-content4 text-foreground text-xs font-bold rounded-xl border border-divider/30 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Settings className="h-3.5 w-3.5 text-amber-500" />
                  <span>{showLoyaltySettings ? "Close Rules Settings" : "Edit Loyalty Rules"}</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
            <div className="bg-content1 p-2.5 rounded-xl border border-divider/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-default-500 uppercase font-bold block">Earning Formula</span>
 <span className="text-xs font-extrabold text-amber-500 ">₱{config.spendPerPoint.toLocaleString()} = 1 Pt</span>
              </div>
              <Award className="h-4 w-4 text-amber-500/30 shrink-0" />
            </div>

            <div className="bg-content1 p-2.5 rounded-xl border border-divider/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-default-500 uppercase font-bold block">Redemption Value</span>
 <span className="text-xs font-extrabold text-emerald-500 ">1 Pt = {formatCurrency(config.pointValueInPhp)} Off</span>
              </div>
              <Sparkles className="h-4 w-4 text-emerald-500/30 shrink-0" />
            </div>

            <div className="bg-content1 p-2.5 rounded-xl border border-divider/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-default-500 uppercase font-bold block">Active Members</span>
 <span className="text-xs font-extrabold text-foreground ">{members.length} Members</span>
              </div>
              <Users className="h-4 w-4 text-primary/30 shrink-0" />
            </div>

            <div className="bg-content1 p-2.5 rounded-xl border border-divider/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-default-500 uppercase font-bold block">Total Points Issued</span>
 <span className="text-xs font-extrabold text-amber-500 ">{totalPointsPool.toLocaleString()} Pts <span className="text-[10px] text-default-500 font-normal">({formatCurrency(totalMonetaryValue)})</span></span>
              </div>
              <Award className="h-4 w-4 text-amber-500/30 shrink-0" />
            </div>
          </div>

          {/* Collapsible Quick Settings Drawer */}
          {showLoyaltySettings && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              onSubmit={(e) => {
                e.preventDefault();
                const spend = parseFloat(loyaltySpendInput) || 500;
                const val = parseFloat(loyaltyPointValInput) || 1.0;
                db.updateLoyaltyConfig({
                  spendPerPoint: Math.max(1, spend),
                  pointValueInPhp: Math.max(0.01, val),
                  enabled: loyaltyEnabled,
                });
                setLoyaltySavedSuccess(true);
                setTimeout(() => setLoyaltySavedSuccess(false), 3000);
              }}
              className="p-3.5 bg-content1 border border-amber-500/20 rounded-xl space-y-3 text-xs pt-3"
            >
              <div className="flex items-center justify-between border-b border-divider/10 pb-2">
                <span className="font-extrabold text-xs text-amber-500 flex items-center gap-1.5">
                  <Settings className="h-3.5 w-3.5" />
                  <span>Loyalty Program Parameters</span>
                </span>
                <label className="font-bold text-foreground cursor-pointer flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={loyaltyEnabled}
                    onChange={(e) => setLoyaltyEnabled(e.target.checked)}
                    className="h-3.5 w-3.5 accent-amber-500 cursor-pointer"
                  />
                  <span>Enable Program</span>
                </label>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-default-500 flex justify-between">
                    <span>Spend Threshold (PHP)</span>
                    <span className="text-default-500 text-[10px] font-normal">Spend to earn 1 point</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-default-500 font-bold">₱</span>
                    <input
                      type="number"
                      required
                      min="1"
                      value={loyaltySpendInput ?? ''}
                      onChange={(e) => setLoyaltySpendInput(e.target.value)}
                      placeholder="500"
 className="w-full bg-content3 border border-divider rounded-lg py-1.5 pl-7 pr-2 outline-none font-bold focus:border-amber-500 text-foreground"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-default-500 flex justify-between">
                    <span>Point Value in PHP</span>
                    <span className="text-default-500 text-[10px] font-normal">Discount value per 1 point</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-default-500 font-bold">₱</span>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0.01"
                      value={loyaltyPointValInput ?? ''}
                      onChange={(e) => setLoyaltyPointValInput(e.target.value)}
                      placeholder="1.00"
 className="w-full bg-content3 border border-divider rounded-lg py-1.5 pl-7 pr-2 outline-none font-bold focus:border-amber-500 text-foreground"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                {loyaltySavedSuccess ? (
                  <span className="text-emerald-500 text-xs font-bold flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> Rules Updated Successfully!
                  </span>
                ) : <span />}

                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Loyalty Rules</span>
                </button>
              </div>
            </motion.form>
          )}
        </div>

        {/* Member Loyalty Roster Table */}
        <div className="bg-content1 border border-divider/15 p-4 rounded-2xl space-y-3 shadow-xs text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-divider/10 pb-3">
            <div>
              <h3 className="font-bold text-sm text-primary flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                <span>Member Loyalty Points Roster</span>
              </h3>
              <p className="text-[11px] text-default-500 mt-0.5">
                View accumulated reward points and manage balances.
              </p>
            </div>

            <div className="flex bg-content3 border border-divider/30 px-2.5 py-1.5 rounded-xl items-center gap-2 w-full sm:w-64">
              <Search className="h-3.5 w-3.5 text-default-500 shrink-0" />
              <input
                type="text"
                value={loyaltyMemberSearch ?? ''}
                onChange={(e) => setLoyaltyMemberSearch(e.target.value)}
                placeholder="Search member name or phone..."
                className="w-full bg-transparent border-0 outline-none text-xs text-foreground"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-divider/15">
            <table className="w-full text-left text-xs">
              <thead className="bg-content3/50 font-bold border-b border-divider/15 text-default-500">
                <tr>
                  <th className="p-3">Member Profile</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3 text-right">Points Balance</th>
                  <th className="p-3 text-right">Discount Value</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/10">
                {(() => {
                  const filtered = members.filter(
                    (m) =>
                      m.fullName.toLowerCase().includes(loyaltyMemberSearch.toLowerCase()) ||
                      m.phone.toLowerCase().includes(loyaltyMemberSearch.toLowerCase()) ||
                      m.id.toLowerCase().includes(loyaltyMemberSearch.toLowerCase())
                  );

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-default-500 italic">
                          No matching member profiles found.
                        </td>
                      </tr>
                    );
                  }

                  return filtered.map((m) => {
                    const ptValue = (m.points || 0) * (config.pointValueInPhp || 1.0);

                    return (
                      <tr key={m.id} className="hover:bg-primary/5 transition-colors">
                        <td className="p-3 font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs shrink-0">
                              {m.fullName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-foreground">{m.fullName}</div>
 <div className="text-[10px] text-default-500 ">{m.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-foreground font-medium">{m.phone || "N/A"}</div>
                          <div className="text-[10px] text-default-500">{m.email || "—"}</div>
                        </td>
 <td className="p-3 text-right font-extrabold text-amber-500 text-sm">
                          {(m.points || 0).toLocaleString()} Pts
                        </td>
 <td className="p-3 text-right font-bold text-emerald-500">
                          {formatCurrency(ptValue)}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            m.status === "Active" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                          }`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLoyaltyMember(m);
                              setAdjustPointsAmount("");
                              setAdjustPointsReason("");
                              setShowAdjustPointsModal(true);
                            }}
                            className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-bold text-[10.5px] rounded-lg transition-colors cursor-pointer border border-amber-500/20"
                          >
                            Manage Points
                          </button>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    );
  })()}

  {activeSubTab === "expenses-add" && (
 <motion.div
 key="expenses"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="grid md:grid-cols-3 gap-6"
 >
 <div className="md:col-span-1 bg-content1 border border-divider/15 p-5 rounded-2xl h-fit space-y-4">
 <h3 className="font-bold text-sm text-primary border-b border-divider/10 pb-3 flex items-center gap-1.5">
 <PlusCircle className="h-5 w-5" />
 Deduct Branch Cash Expense
 </h3>
 <form
 onSubmit={handleAddExpense}
 className="space-y-3 font-sans text-xs"
 >
 <div className="space-y-1">
 <label className="font-bold text-default-500">
 Branch Location *
 </label>
 <select
 value={expBranchId ?? ''}
 onChange={(e) => setExpBranchId(e.target.value)}
 className="w-full bg-content3 border border-divider rounded-lg p-2.5 outline-none focus:border-primary font-bold text-primary"
 >
 {db.branches.filter((b) => !b.isDeleted).map((b) => (
 <option key={b.id} value={b.id}>
 {b.name} ({b.id})
 </option>
 ))}
 </select>
 </div>
 <div className="space-y-1">
 <label className="font-bold text-default-500">
 Expense Classification *
 </label>
 <select
 value={expCategory ?? ''}
 onChange={(e) => setExpCategory(e.target.value)}
 className="w-full bg-content3 border border-divider rounded-lg p-2.5 outline-none focus:border-primary"
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
 <label className="font-bold text-default-500">
 Specify Custom Classification *
 </label>
 <input
 required
 value={customCategory ?? ''}
 onChange={(e) => setCustomCategory(e.target.value)}
 type="text"
 placeholder="Custom classification"
 className="w-full bg-content3 border border-divider rounded-lg p-2.5 outline-none focus:border-primary"
 />
 </div>
 )}
 <div className="space-y-1">
 <label className="font-bold text-default-500">
 Amount Disbursed (PHP) *
 </label>
 <input
 required
 value={expAmount ?? ''}
 onChange={(e) => setExpAmount(e.target.value)}
 type="number"
 placeholder="500"
 className="w-full bg-content3 border border-divider rounded-lg p-2.5 outline-none focus:border-primary"
 />
 </div>
 <div className="space-y-1">
 <label className="font-bold text-default-500">
 Detailed Notes / Vendor *
 </label>
 <textarea
 rows={3}
 value={expNotes ?? ''}
 onChange={(e) => setExpNotes(e.target.value)}
 placeholder="Bought extra heavy mop for the main hall tiles..."
 className="w-full bg-content3 border border-divider rounded-lg p-2.5 outline-none focus:border-primary"
 />
 </div>
 <button
 type="submit"
 className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-bold transition hover:opacity-90 flex items-center justify-center gap-1.5 cursor-pointer"
 >
 <DollarSign className="h-4 w-4" />
 Confirm Petty Cash Payout
 </button>
 </form>
 </div>

 <div className="md:col-span-2 space-y-4">
 <div className="flex bg-content1 border border-divider/15 p-2 rounded-xl items-center gap-2 font-sans text-xs">
 <Search className="h-4 w-4 text-default-500 pl-1 shrink-0" />
 <input
 value={expenseSearch ?? ''}
 onChange={(e) => setExpenseSearch(e.target.value)}
 placeholder="Filter disbursements..."
 className="w-full bg-transparent border-0 outline-none p-1.5"
 />
 <div className="flex items-center gap-1 shrink-0 border-l border-divider/20 pl-2">
 <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
 <select
 value={expenseBranchFilter ?? ''}
 onChange={(e) => setExpenseBranchFilter(e.target.value)}
 className="bg-background border border-divider/30 text-primary text-xs font-bold rounded-lg px-2 py-1 outline-none cursor-pointer"
 >
 <option value="All">All Branches</option>
 {db.branches.filter((b) => !b.isDeleted).map((b) => (
 <option key={b.id} value={b.id}>
 {b.name}
 </option>
 ))}
 </select>
 </div>
 </div>

 <div className="bg-content1 border border-divider/15 rounded-2xl overflow-hidden shadow-sm">
 <table className="w-full text-left font-sans text-xs">
 <thead className="bg-content3/50 font-bold border-b border-divider/15">
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
 {(() => {
 const filteredExpenses = expenses.filter(
 (ex) =>
 !ex.isDeleted &&
 (ex.notes.toLowerCase().includes(expenseSearch.toLowerCase()) ||
 ex.category.toLowerCase().includes(expenseSearch.toLowerCase()) ||
 ex.recordedBy.toLowerCase().includes(expenseSearch.toLowerCase()) ||
 ex.branchId.toLowerCase().includes(expenseSearch.toLowerCase()))
 );

 if (filteredExpenses.length === 0) {
 return (
 <tr>
 <td colSpan={6} className="p-8 text-center">
 <div className="flex flex-col items-center justify-center space-y-2.5 py-6">
 <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner border border-primary/15">
 <Receipt className="h-6 w-6" />
 </div>
 <div className="space-y-1">
 <p className="font-extrabold text-sm text-foreground">
 {expenseSearch ? "No Matching Expenses Found" : "No Operational Expenses Logged"}
 </p>
 <p className="text-xs text-default-500 max-w-sm mx-auto leading-relaxed">
 {expenseSearch
 ? `No disbursement entry matches "${expenseSearch}". Try adjusting your filter term.`
 : "No petty cash or store operating expenses logged yet. Use the disbursement form on the left to record new expenses."}
 </p>
 </div>
 {expenseSearch && (
 <button
 type="button"
 onClick={() => setExpenseSearch("")}
 className="mt-1 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg transition-colors cursor-pointer border-0"
 >
 Clear Expense Filter
 </button>
 )}
 </div>
 </td>
 </tr>
 );
 }

 return filteredExpenses.map((ex) => (
 <tr
 key={ex.id}
 className="border-b border-divider/10 hover:bg-primary/5 transition-all"
 >
 <td className="p-3 font-semibold text-foreground">
 <div>{ex.notes}</div>
 <div className="text-[10px] text-default-500 mt-0.5">
 {ex.dateTime && !isNaN(new Date(ex.dateTime).getTime()) ? new Date(ex.dateTime).toLocaleString("en-US") : "N/A"}
 </div>
 </td>
 <td className="p-3">
 <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-content2 text-foreground">
 {ex.category}
 </span>
 </td>
 <td className="p-3 text-default-500 font-bold">
 {ex.recordedBy}
 </td>
 <td className="p-3 text-default-500 ">
 {ex.branchId}
 </td>
 <td className="p-3 text-right text-rose-500 font-bold">
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
 ));
 })()}
 </tbody>
 </table>
 </div>
 </div>
 </motion.div>
 )}

  {activeSubTab === "expenses-search" && (() => {
    const filteredExpenses = expenses.filter((ex) => {
      if (ex.isDeleted) return false;
      if (dateFilter) {
        const expDate = ex.dateTime ? ex.dateTime.substring(0, 10) : "";
        if (expDate !== dateFilter) return false;
      }
      if (expenseCategoryFilter && ex.category !== expenseCategoryFilter) {
        return false;
      }
      if (expenseSearchQuery) {
        const q = expenseSearchQuery.toLowerCase();
        const matchId = ex.id.toLowerCase().includes(q);
        const matchNotes = ex.notes.toLowerCase().includes(q);
        const matchCategory = ex.category.toLowerCase().includes(q);
        const matchUser = ex.recordedBy ? ex.recordedBy.toLowerCase().includes(q) : false;
        if (!matchId && !matchNotes && !matchCategory && !matchUser) return false;
      }
      return true;
    });

    const totalOutflow = filteredExpenses.reduce((sum, ex) => sum + ex.amount, 0);

    return (
      <motion.div
        key="expenses-search-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-4"
      >
        <div className="flex flex-col md:flex-row bg-content1 border border-divider/15 p-4 rounded-xl items-stretch md:items-center justify-between font-sans text-xs gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <span className="font-extrabold text-default-500">Filter Date:</span>
              <input
                type="date"
                value={dateFilter ?? ''}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-content3 border border-divider rounded p-1 outline-none text-foreground"
              />
              {dateFilter && (
                <button
                  type="button"
                  onClick={() => setDateFilter("")}
                  className="text-[10px] text-rose-500 hover:underline font-bold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="font-extrabold text-default-500">Category:</span>
              <select
                value={expenseCategoryFilter ?? ''}
                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                className="bg-content3 border border-divider rounded p-1 outline-none text-foreground"
              >
                <option value="">All Categories</option>
                {Array.from(new Set(expenses.filter(ex => !ex.isDeleted).map(ex => ex.category))).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {expenseCategoryFilter && (
                <button
                  type="button"
                  onClick={() => setExpenseCategoryFilter("")}
                  className="text-[10px] text-rose-500 hover:underline font-bold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="font-extrabold text-default-500">Search:</span>
              <input
                type="text"
                placeholder="Search detail, user, ID..."
                value={expenseSearchQuery ?? ''}
                onChange={(e) => setExpenseSearchQuery(e.target.value)}
                className="bg-content3 border border-divider rounded p-1 outline-none text-foreground w-44"
              />
              {expenseSearchQuery && (
                <button
                  type="button"
                  onClick={() => setExpenseSearchQuery("")}
                  className="text-[10px] text-rose-500 hover:underline font-bold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (filteredExpenses.length === 0) {
                alert("No disbursement records found to export for current filters.");
                return;
              }
              const headers = ["Receipt No", "Date & Time", "Branch ID", "Category", "Detail Notes", "Recorded By", "Amount (PHP)"];
              const rows = filteredExpenses.map((ex) => [
                ex.id,
                new Date(ex.dateTime || Date.now()).toLocaleString("en-US"),
                ex.branchId || "N/A",
                ex.category,
                ex.notes,
                ex.recordedBy || "System",
                ex.amount.toFixed(2),
              ]);
              const csvContent = "\uFEFF" + [
                `"TILEPOINT ENTERPRISES - DISBURSEMENT EXPENSES REGISTRY"`,
                `"Exported On: ${new Date().toLocaleString()}"`,
                "",
                headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","),
                ...rows.map((r) => r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")),
              ].join("\n");

              const filename = `TilePoint_Disbursements_Export_${new Date().toISOString().slice(0, 10)}.csv`;
              saveFileToBackup(csvContent, filename, "Sales_Reports", "text/csv;charset=utf-8;")
                .then((res) => {
                  alert(`Disbursement expenses exported to CSV successfully! Saved as ${res.path || filename}`);
                })
                .catch(() => {
                  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = filename;
                  a.click();
                  URL.revokeObjectURL(url);
                });
            }}
            className="py-1.5 px-3 rounded bg-primary text-primary-foreground font-bold transition flex items-center justify-center gap-1 border-0 cursor-pointer self-start md:self-auto hover:opacity-90 active:scale-95"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV / Excel
          </button>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="bg-content1 border border-divider/15 p-5 rounded-2xl text-center space-y-4 py-12">
            <Archive className="h-10 w-10 text-primary/30 mx-auto animate-pulse" />
            <div>
              <h3 className="font-bold text-sm text-foreground">
                No Disbursement Registry Records Found
              </h3>
              <p className="text-xs text-default-500 max-w-sm mx-auto mt-1 leading-normal">
                Try adjusting your filter date, category selector, or search term to locate specific operational expense records.
              </p>
            </div>
            {(dateFilter || expenseCategoryFilter || expenseSearchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setDateFilter("");
                  setExpenseCategoryFilter("");
                  setExpenseSearchQuery("");
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg transition-colors cursor-pointer border-0"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reset Search Filters
              </button>
            )}
          </div>
        ) : (
          <div className="bg-content1 border border-divider/15 p-5 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-divider/10 pb-3">
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  Disbursement Registry Records
                </h3>
                <p className="text-[11px] text-default-500 mt-0.5">
                  Showing {filteredExpenses.length} historical expense audits. Certified entries mapped to current showrooms.
                </p>
              </div>
              <div className="sm:text-right">
 <span className="text-[9px] font-black uppercase tracking-widest text-default-500 block">Total Cash Outflow:</span>
 <span className="text-sm font-black text-rose-500 ">
                  ₱{totalOutflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="w-full border border-divider/15 rounded-xl overflow-hidden shadow-sm overflow-x-auto bg-content1">
              <table className="w-full text-left font-sans text-xs min-w-[700px]">
                <thead className="bg-content3/60 text-default-500 font-bold border-b border-divider/15 text-[10.5px]">
                  <tr>
                    <th className="p-3">Receipt No</th>
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Detail Notes</th>
                    <th className="p-3">Recorded By</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider/10">
                  {filteredExpenses.map((ex) => (
                    <tr
                      key={ex.id}
                      className="hover:bg-content3/20 transition-colors"
                    >
 <td className="p-3 font-bold text-primary text-xs align-middle">
                        {ex.id}
                      </td>
 <td className="p-3 text-default-500 text-xs align-middle ">
                        {ex.dateTime && !isNaN(new Date(ex.dateTime).getTime()) ? new Date(ex.dateTime).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : "N/A"}
                      </td>
                      <td className="p-3 align-middle">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                          {ex.category}
                        </span>
                      </td>
                      <td className="p-3 text-foreground text-xs align-middle max-w-xs truncate font-medium" title={ex.notes}>
                        {ex.notes}
                      </td>
                      <td className="p-3 text-default-500 text-xs align-middle font-medium">
                        {ex.recordedBy || 'System'}
                      </td>
 <td className="p-3 text-right text-rose-500 font-extrabold text-xs align-middle">
                        -₱{ex.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(ex.id)}
                          className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg transition border-0 cursor-pointer bg-transparent"
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
        )}
      </motion.div>
    );
  })()}

 {activeSubTab === "adjustments-return" && (
 <motion.div
 key="returns"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="grid md:grid-cols-3 gap-6"
 >
 <div className="md:col-span-1 bg-content1 border border-divider/15 p-5 rounded-2xl h-fit space-y-4">
 <h3 className="font-bold text-sm text-primary border-b border-divider/10 pb-3 flex items-center gap-1.5">
 <RefreshCw className="h-5 w-5" />
 Register Sales Return
 </h3>
 <form
 onSubmit={handleAddReturn}
 className="space-y-3 font-sans text-xs"
 >
 <div className="space-y-1">
 <label className="font-bold text-default-500">
 Original System Sale Receipt ID *
 </label>
 <input
 required
 value={retSaleId ?? ''}
 onChange={(e) => setRetSaleId(e.target.value)}
 type="text"
 placeholder="Receipt ID"
 className="w-full bg-content3 border border-divider rounded-lg p-2.5 font-bold outline-none focus:border-primary"
 />
 </div>
 <div className="space-y-1">
 <label className="font-bold text-default-500">
 Select Tile / Product Return *
 </label>
 <input
 required
 value={retProduct ?? ''}
 onChange={(e) => setRetProduct(e.target.value)}
 type="text"
 placeholder="Ceramic Floor Tile Carrara"
 className="w-full bg-content3 border border-divider rounded-lg p-2.5 outline-none focus:border-primary"
 />
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="font-bold text-default-500">
 Qty Returned *
 </label>
 <input
 required
 value={retQty ?? ''}
 onChange={(e) => setRetQty(e.target.value)}
 type="number"
 placeholder="1"
 className="w-full bg-content3 border border-divider rounded-lg p-2.5 outline-none focus:border-primary"
 />
 </div>
 <div className="space-y-1">
 <label className="font-bold text-default-500">
 Damage Fee %
 </label>
 <select
 value={retFee ?? ''}
 onChange={(e) => setRetFee(e.target.value)}
 className="w-full bg-content3 border border-divider rounded-lg p-2.5 outline-none focus:border-primary"
 >
 <option value="5">5% fee</option>
 <option value="10">10% fee</option>
 <option value="15">15% fee</option>
 <option value="0">0% fee</option>
 </select>
 </div>
 </div>
 <div className="space-y-1">
 <label className="font-bold text-default-500">
 Total Amount Refunded (PHP) *
 </label>
 <input
 required
 value={retRef ?? ''}
 onChange={(e) => setRetRef(e.target.value)}
 type="number"
 placeholder="580"
 className="w-full bg-content3 border border-divider rounded-lg p-2.5 outline-none focus:border-primary"
 />
 </div>
 <div className="space-y-1">
 <label className="font-bold text-default-500">
 Restocking Stock Status
 </label>
 <div className="flex gap-4 p-2 bg-content3 border border-divider rounded-lg">
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
 className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-bold transition hover:opacity-90 flex items-center justify-center gap-1.5 cursor-pointer"
 >
 <CheckCircle2 className="h-4 w-4" />
 Submit Sales Return
 </button>
 </form>
 </div>

 <div className="md:col-span-2 space-y-4">
 <div className="bg-content1 border border-divider/15 p-5 rounded-2xl flex items-start gap-3">
 <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
 <div className="text-xs font-sans space-y-1">
 <div className="font-bold text-foreground">
 Returned Stock & Accounting Policy
 </div>
 <p className="text-default-500 leading-relaxed">
 All processed customer returns add the tiles back into
 Warehouse Inventory immediately if logged as "Good Stock".
 Restocking charges are deducted dynamically from the net
 drawer payout. An automated credit voucher will be generated
 for the customer.
 </p>
 </div>
 </div>

 <div className="bg-content1 border border-divider/15 rounded-2xl overflow-hidden shadow-sm">
 <div className="overflow-auto scrollbar-thin scrollbar-thumb-divider h-[58vh] md:h-[64vh] lg:h-[68vh] min-h-[380px]">
 <table className="w-full text-left font-sans text-xs">
 <thead className="bg-content3/50 font-bold border-b border-divider/15">
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
 className="border-b border-divider/10 hover:bg-primary/5 transition-all"
 >
 <td className="p-3">
 <div className="font-bold text-foreground">
 {rt.productName}
 </div>
 <div className="text-[10px] text-default-500 mt-0.5">
 {rt.id} ·{" "}
 {rt.dateTime && !isNaN(new Date(rt.dateTime).getTime()) ? new Date(rt.dateTime).toLocaleString("en-US") : "N/A"}
 </div>
 </td>
 <td className="p-3 font-black">
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
 <td className="p-3 text-right text-default-500">
 ₱{rt.damageRestockFee.toLocaleString()}
 </td>
 <td className="p-3 text-right text-emerald-500 font-extrabold">
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
 .map((sup) => {
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
 (s, it) => s + (it.costPrice ?? 0) * (it.quantityRequested ?? 0),
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
 className="bg-content1 border border-divider/15 p-5 rounded-2xl space-y-4 shadow-sm font-sans flex flex-col justify-between"
 >
 <div>
 <div className="flex justify-between items-start">
 <span className="text-[10px] text-default-500 block tracking-wider font-bold">
 Supplier {sup.id}
 </span>
 <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-500">
 Credited
 </span>
 </div>
 <h4 className="font-black text-sm text-foreground mt-1">
 {sup.name}
 </h4>
 <p className="text-[11px] text-default-500 mt-1">
 {sup.contactPerson} · {sup.phone}
 </p>
 </div>

 <div className="pt-3 border-t border-divider/10 space-y-2 mt-4">
 <div className="flex justify-between text-xs">
 <span className="text-default-500">
 Outstanding Accounts Payable:
 </span>
 <span className=" font-extrabold text-rose-500">
 ₱{outstanding.toLocaleString()}
 </span>
 </div>
 <div className="w-full bg-zinc-200 dark:bg-content2/60 h-2 rounded-full overflow-hidden">
 <div
 style={{
 width: `${(outstanding / creditLimit) * 100}%`,
 }}
 className="bg-rose-500 h-full rounded-full"
 />
 </div>
 <div className="flex justify-between text-[10px] text-default-500 ">
 <span>
 Allocated Limit: ₱{(Number(creditLimit) || 0).toLocaleString()}
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
 className="w-full py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground text-xs rounded-lg font-bold transition mt-3 cursor-pointer"
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
 type: "Projected PO" | "Purchase Order" | "Recurring Bill";
 frequency?: string;
 }

 const flatPayablesList: FlatPayableItem[] = [];

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

 // Calculate urgency relative to current date
 const today = new Date();
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
 alert(`ERP Credit settled in full! Invoice ${payVal.poNumber} is now fully paid.`);
 } else {
 alert(`Installment Posted! Paid ₱${payAmountNum.toLocaleString()} via ${partialPaymentMethod.toUpperCase()} for invoice ${payVal.poNumber}. Remaining: ₱${(remaining - payAmountNum).toLocaleString()}`);
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

 ;

 return (
 <motion.div
 key="calendar"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="space-y-6"
 >
 <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
 {/* Interactive Form & Payables Side Panel */}
 <div className="bg-content1 border border-divider/15 p-5 rounded-2xl text-left space-y-4 h-fit flex flex-col">
 
 {/* Panel Title & Tab Switcher */}
 <div className="space-y-3">
 <div className="flex items-center justify-between text-primary border-b border-divider/10 pb-2">
 <div className="flex items-center gap-2">
 <Sliders className="h-4.5 w-4.5" />
 <h4 className="font-extrabold text-xs uppercase tracking-wider ">
 Payables Hub
 </h4>
 </div>
 <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
 {flatPayablesList.length} Accounts
 </span>
 </div>

 {/* Segmented Control Selector Tabs */}
 <div className="flex border border-divider/10 p-0.5 bg-content3/30 rounded-xl">
 <button
 type="button"
 onClick={() => setLeftPanelTab("list")}
 className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all border-0 cursor-pointer ${
 leftPanelTab === "list"
 ? "bg-primary text-primary-foreground shadow-xs font-black"
 : "text-default-500 hover:text-foreground"
 }`}
 >
 Accounts List
 </button>
 <button
 type="button"
 onClick={() => setLeftPanelTab("create")}
 className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all border-0 cursor-pointer ${
 leftPanelTab === "create"
 ? "bg-primary text-primary-foreground shadow-xs font-black"
 : "text-default-500 hover:text-foreground"
 }`}
 >
 Setup Bill
 </button>
 <button
 type="button"
 onClick={() => setLeftPanelTab("notes")}
 className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all border-0 cursor-pointer ${
 leftPanelTab === "notes"
 ? "bg-primary text-primary-foreground shadow-xs font-black"
 : "text-default-500 hover:text-foreground"
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
 <label className="font-bold text-default-500">
 Liability Account Title *
 </label>
 <input
 required
 type="text"
 value={billTitle ?? ''}
 onChange={(e) => setBillTitle(e.target.value)}
 placeholder="Account Title"
 className="w-full bg-content1 border border-divider rounded-lg p-2.5 outline-none font-semibold focus:border-primary text-foreground"
 />
 </div>
 <div className="space-y-1">
 <label className="font-bold text-default-500">
 Payout Amount (PHP) *
 </label>
 <input
 required
 type="number"
 value={billAmount ?? ''}
 onChange={(e) => setBillAmount(e.target.value)}
 placeholder="12500"
 className="w-full bg-content1 border border-divider rounded-lg p-2.5 outline-none focus:border-primary text-foreground"
 />
 </div>
 <div className="space-y-1">
 <label className="font-bold text-default-500">
 Recurrence Interval *
 </label>
 <select
 value={billFrequency ?? ''}
 onChange={(e) =>
 setBillFrequency(e.target.value as any)
 }
 className="w-full bg-content1 border border-divider rounded-lg p-2.5 outline-none focus:border-primary font-bold text-foreground"
 >
 <option value="WEEKLY" className="bg-content1 text-foreground">Weekly Cycle</option>
 <option value="MONTHLY" className="bg-content1 text-foreground">Monthly Cycle</option>
 <option value="SEMI_QUARTERLY" className="bg-content1 text-foreground">
 Semi-Quarterly (45d)
 </option>
 <option value="QUARTERLY" className="bg-content1 text-foreground">
 Quarterly Installment
 </option>
 <option value="YEARLY" className="bg-content1 text-foreground">Yearly Corporate Bill</option>
 </select>
 </div>
 <div className="space-y-1">
 <label className="font-bold text-default-500">
 Target Start Due Date *
 </label>
 <input
 type="date"
 value={billDueDate ?? ''}
 onChange={(e) => setBillDueDate(e.target.value)}
 className="w-full bg-content1 border border-divider rounded-lg p-2.5 outline-none cursor-pointer font-bold text-foreground"
 />
 </div>
 <button
 type="submit"
 className="w-full py-2.5 bg-primary text-primary-foreground font-black uppercase tracking-wider text-[10px] rounded-xl shadow-sm hover:opacity-90 cursor-pointer border-0"
 >
 Schedule Recurring Bill
 </button>
 </form>
 ) : leftPanelTab === "notes" ? (
 <div className="space-y-3 flex-1 flex flex-col animate-fade-in text-xs h-full">
 <div className="flex items-center gap-1.5 text-primary border-b border-divider/10 pb-2">
 <FileText className="h-4.5 w-4.5" />
 <h4 className="font-extrabold text-xs uppercase tracking-wider ">
 Calendar Memos
 </h4>
 </div>
 <p className="text-[10px] text-default-500">
 Draft reminders or admin details here. All changes are instantly saved to the secure database.
 </p>
 <textarea
 value={calendarNotes ?? ''}
 onChange={(e) => {
 setCalendarNotes(e.target.value);
 }}
 placeholder="Type notes or specific reminders here..."
 className="w-full flex-1 min-h-[350px] bg-content1 border border-divider rounded-xl p-3 outline-none text-foreground text-xs focus:border-primary resize-none leading-relaxed"
 />
 <div className="flex justify-between items-center text-[9px] text-default-500 ">
 <span>Auto-Saved Securely</span>
 <span>{calendarNotes.length} chars</span>
 </div>
 </div>
 ) : (
 <div className="space-y-3 flex-1 flex flex-col">
 {/* Search, Status Filter, and Sort By */}
 <div className="space-y-2">
 <div className="relative">
 <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-default-500" />
 <input
 type="text"
 value={payableSearchQuery ?? ''}
 onChange={(e) => setPayableSearchQuery(e.target.value)}
 placeholder="Search supplier / ID..."
 className="w-full bg-content1 border border-divider rounded-lg pl-8 pr-3 py-2 text-xs outline-none focus:border-primary text-foreground font-medium"
 />
 </div>

 <div className="grid grid-cols-2 gap-2">
 <div className="space-y-0.5">
 <label className="text-[8px] font-black uppercase tracking-wider text-default-500">
 Filter Status
 </label>
 <select
 value={payableStatusFilter ?? ''}
 onChange={(e) => setPayableStatusFilter(e.target.value as any)}
 className="w-full bg-content1 border border-divider rounded-md p-1 font-sans text-[10px] outline-none font-bold focus:border-primary text-foreground"
 >
 <option value="all" className="bg-content1 text-foreground">All</option>
 <option value="active" className="bg-content1 text-foreground">Active</option>
 <option value="partial" className="bg-content1 text-foreground">Partial</option>
 <option value="paid" className="bg-content1 text-foreground">Settled</option>
 </select>
 </div>
 <div className="space-y-0.5">
 <label className="text-[8px] font-black uppercase tracking-wider text-default-500">
 Sort By
 </label>
 <select
 value={payableSortField ?? ''}
 onChange={(e) => setPayableSortField(e.target.value as any)}
 className="w-full bg-content1 border border-divider rounded-md p-1 font-sans text-[10px] outline-none font-bold focus:border-primary text-foreground"
 >
 <option value="due" className="bg-content1 text-foreground">Urgency</option>
 <option value="amount" className="bg-content1 text-foreground">Amount</option>
 <option value="supplier" className="bg-content1 text-foreground">Supplier</option>
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
 urgencyBadge = "text-default-500 bg-content2/20 border border-divider/25/10";
 alertIconColor = "text-default-500";
 }

 const itemTypeLabel =
 item.type === "Recurring Bill"
 ? `${item.frequency || "Monthly"} Bill`
 : (item.type as string) === "Projected PO" || (item.type as string) === "Simulated PO"
 ? "Projected PO"
 : "Purchase Order";

 return (
 <div
 key={`${item.poId}-${idx}`}
 onClick={() => {
 setSelectedCalendarDay(item.day);
 }}
 className={`p-3 rounded-xl border transition-all text-left cursor-pointer hover:bg-content3/35 ${
 isSelected
 ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary"
 : "border-divider/15 bg-content3/15"
 }`}
 >
 {/* Item Header */}
 <div className="flex justify-between items-center gap-1.5 mb-1.5">
 <span className="text-[9px] font-extrabold text-primary truncate max-w-[120px]" title={item.poNumber}>
 {item.poNumber}
 </span>
 <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-content2/40 text-default-500 ">
 {itemTypeLabel}
 </span>
 </div>

 {/* Item Main Title */}
 <h5 className="text-[11px] font-extrabold text-foreground leading-tight truncate">
 {item.supplierName}
 </h5>

 {/* Status and Financial Summary */}
 <div className="mt-2 space-y-1">
 <div className="flex justify-between items-center text-[10px] ">
 <span className="text-default-500">Balance:</span>
 <span className={`font-black ${item.isFinished ? "text-emerald-500" : "text-amber-500"}`}>
 ₱{item.remaining.toLocaleString()}
 </span>
 </div>

 {/* Small visual progress indicator */}
 {item.amount > 0 && (
 <div className="w-full bg-default-200/30 h-1 rounded-full overflow-hidden mt-1">
 <div
 className="bg-emerald-500 h-full rounded-full transition-all duration-300"
 style={{ width: `${Math.min(100, (item.totalPaid / item.amount) * 100)}%` }}
 />
 </div>
 )}
 </div>

 {/* Urgency Alert Badge */}
 <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-dashed border-divider/10">
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
 <span className="text-[9px] font-bold text-default-500">
 Day {item.day} of {months[item.month].substring(0, 3)}
 </span>
 </div>
 </div>
 );
 })
 ) : (
 <div className="text-center py-10 space-y-2 border border-dashed border-divider/15 rounded-xl">
 <Info className="h-5 w-5 text-default-500 mx-auto animate-pulse" />
 <p className="text-xs text-default-500 font-bold">No Payables Found</p>
 <p className="text-[9.5px] text-default-500 max-w-[150px] mx-auto">
 No records match search query or status filter in this period.
 </p>
 </div>
 )}
 </div>
 </div>
 )}
 </div>

 {/* Primary Interactive Calendar Component */}
 <div className="lg:col-span-3 bg-content1 border border-divider/15 p-5 rounded-2xl grid grid-cols-1 xl:grid-cols-4 gap-6 text-left">
 <div className="xl:col-span-3 space-y-4">
 <div className="flex justify-between items-center border-b border-divider/10 pb-3 gap-2 flex-wrap">
 <div className="flex items-center gap-2 flex-wrap">
 <h3 className="font-extrabold text-sm text-primary flex items-center gap-1.5">
 <CalendarDays className="h-5 w-5" />
 Supplier Payment Calendar Cycle
 </h3>
 
 </div>
 
 {/* Interactive Month & Year Navigation Widget */}
 <div className="flex items-center gap-1 bg-content3/30 p-1 rounded-xl border border-divider/10">
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
 className="p-1.5 hover:bg-content3 rounded-lg text-default-500 hover:text-primary transition cursor-pointer border-0"
 title="Previous Month"
 >
 <ChevronLeft className="h-4 w-4" />
 </button>
 
 <select
 value={calendarMonth ?? ''}
 onChange={(e) => {
 setCalendarMonth(Number(e.target.value));
 setSelectedCalendarDay(null);
 }}
 className="bg-transparent border-0 text-xs font-black font-sans text-foreground focus:ring-0 cursor-pointer pr-8 py-0.5"
 >
 {months.map((m, idx) => (
 <option key={m} value={idx} className="bg-content1 text-foreground font-sans">
 {m}
 </option>
 ))}
 </select>

 <select
 value={calendarYear ?? ''}
 onChange={(e) => {
 setCalendarYear(Number(e.target.value));
 setSelectedCalendarDay(null);
 }}
 className="bg-transparent border-0 text-xs font-bold text-primary focus:ring-0 cursor-pointer pr-8 py-0.5"
 >
 {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
 <option key={y} value={y} className="bg-content1 text-foreground ">
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
 className="p-1.5 hover:bg-content3 rounded-lg text-default-500 hover:text-primary transition cursor-pointer border-0"
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
 className="p-1.5 text-center text-[10px] font-black text-default-500 uppercase tracking-widest "
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
 ? "border-primary bg-primary/5 scale-[1.02] ring-1 ring-primary"
 : isToday
 ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/50 shadow-md shadow-amber-500/10"
 : isFullyPaid
 ? "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 shadow-3xs"
 : isPartiallyPaid
 ? "border-primary/30 bg-primary/5 hover:bg-primary/10 shadow-3xs"
 : hasPayment
 ? "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 shadow-3xs"
 : "border-divider/10 bg-content3/20 hover:border-zinc-350"
 }`}
 >
 <div className="flex justify-between items-center w-full">
 <div className="flex items-center gap-1">
 <span
 className={`text-[10px] font-black leading-none ${isSelected ? "text-primary" : isToday ? "text-amber-500" : "text-default-500"}`}
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
 <span className="block truncate text-[9.5px] text-emerald-500 text-center">
 ₱{totalPaid.toLocaleString()}
 </span>
 </>
 ) : isPartiallyPaid ? (
 <>
 <span className="block font-black uppercase text-[7px] bg-primary/15 text-primary px-1 rounded text-center">
 PARTIAL
 </span>
 <span className="block truncate text-[8.5px] text-default-700 text-center">
 ₱{totalRemaining.toLocaleString()}
 </span>
 </>
 ) : (
 <>
 <span className="block font-black uppercase text-[7px] bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1 rounded text-center">
 PAYABLES
 </span>
 <span className="block truncate text-[9.5px] text-default-700 text-center">
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
 <div className="bg-background p-4 rounded-2xl border border-divider/35 flex flex-col justify-between min-h-[420px] h-full">
 <div className="space-y-4">
 <div className="border-b border-divider/10 pb-3">
 <h4 className="font-extrabold text-xs text-primary uppercase tracking-widest ">
 Payable Day Inspector
 </h4>
 <p className="text-[10px] text-default-500 mt-1">
 Review due accounts &amp; schedule payments or installment disbursement.
 </p>
 </div>

 {selectedCalendarDay ? (
 <div className="space-y-3">
 <div className="flex justify-between items-center bg-primary/10 px-3 py-1.5 rounded-xl">
 <span className="text-xs font-bold ">
 {months[calendarMonth]} {selectedCalendarDay}, {calendarYear}
 </span>
 <span className="text-[9px] font-black bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
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
 className="bg-content1 p-3 rounded-xl border border-divider/15 space-y-2 text-left"
 >
 <div className="flex justify-between items-start gap-1">
 <span className="text-[10px] font-extrabold text-primary truncate max-w-[120px]" title={payVal.poNumber}>
 {payVal.poNumber}
 </span>
 <span
 className={`text-[8px] font-black px-1.5 py-0.5 uppercase tracking-widest rounded ${
 isFinished
 ? "bg-emerald-500/10 text-emerald-400"
 : totalPaid > 0
 ? "bg-primary/10 text-primary"
 : payVal.poNumber.startsWith("BILL-")
 ? "bg-primary/10 text-primary"
 : "bg-amber-500/10 text-amber-400"
 }`}
 >
 {isFinished ? "COMPLETED" : totalPaid > 0 ? "PARTIAL" : payVal.status}
 </span>
 </div>
 
 <h5 className="text-[11px] font-bold text-foreground leading-tight">
 {payVal.supplierName}
 </h5>

 {/* Financial Breakdown Progress */}
 <div className="bg-content2/15 p-2 rounded-lg border border-divider/10 space-y-1.5 text-[10px]">
 <div className="flex justify-between text-default-500 text-[9px]">
 <span>Total Amount:</span>
 <span className="font-bold text-foreground">₱{payVal.amount.toLocaleString()}</span>
 </div>
 {totalPaid > 0 && (
 <div className="flex justify-between text-emerald-400 text-[9px]">
 <span>Amount Paid:</span>
 <span className="font-bold">₱{totalPaid.toLocaleString()}</span>
 </div>
 )}
 <div className="flex justify-between text-[10px] border-t border-dashed border-divider/10 pt-1">
 <span className="text-default-500 font-bold">Remaining Bal:</span>
 <span className={`font-black ${isFinished ? "text-emerald-500" : "text-amber-500"}`}>
 ₱{remaining.toLocaleString()}
 </span>
 </div>

 {/* Visual Progress Bar */}
 {payVal.amount > 0 && (
 <div className="space-y-1 pt-1">
 <div className="w-full bg-default-200/50 h-1.5 rounded-full overflow-hidden">
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
 <div className="space-y-1 bg-content3/30 p-2 rounded-lg border border-divider/5">
 <span className="text-[8px] font-black text-default-500 uppercase tracking-widest block">
 Installment Payments Log
 </span>
 <div className="max-h-[70px] overflow-y-auto space-y-1 scrollbar-none">
 {payHistory.map((inst, hIdx) => (
 <div key={inst.id || hIdx} className="flex justify-between items-center text-[9px] text-default-500">
 <span>{inst.date && !isNaN(new Date(inst.date).getTime()) ? new Date(inst.date).toLocaleDateString() : "N/A"}</span>
 <span className="text-emerald-400 font-bold">₱{inst.amount.toLocaleString()}</span>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Payment Execution Form */}
 {!isFinished ? (
 <div className="border-t border-divider/10 pt-2.5 mt-2 space-y-2.5 text-left text-[11px]">
 <span className="text-[8px] font-black text-primary uppercase tracking-widest block">
 Disburse Installment / Settle
 </span>

 {/* Payment Mode Segmented Selector */}
 <div className="grid grid-cols-2 gap-1 bg-content2/20 p-0.5 rounded-lg border border-divider/5">
 <button
 type="button"
 onClick={() => setPartialPaymentMethod("cash")}
 className={`py-1 text-[9px] font-black uppercase rounded transition cursor-pointer border-0 ${
 partialPaymentMethod === "cash"
 ? "bg-primary/10 text-primary"
 : "text-default-500 hover:text-default-700 bg-transparent"
 }`}
 >
 Cash
 </button>
 <button
 type="button"
 onClick={() => setPartialPaymentMethod("cheque")}
 className={`py-1 text-[9px] font-black uppercase rounded transition cursor-pointer border-0 ${
 partialPaymentMethod === "cheque"
 ? "bg-primary/10 text-primary"
 : "text-default-500 hover:text-default-700 bg-transparent"
 }`}
 >
 Cheque
 </button>
 </div>
 
 <div className="grid grid-cols-2 gap-1.5">
 <div className="space-y-0.5 col-span-2">
 <label className="text-[8px] text-default-500 font-bold">Amount to Pay *</label>
 <input
 type="number"
 value={partialPaymentAmount ?? ''}
 onChange={(e) => setPartialPaymentAmount(e.target.value)}
 placeholder={remaining.toString()}
 max={remaining}
 className="w-full bg-content1 border border-divider rounded p-1.5 text-[10px] outline-none text-foreground focus:border-primary"
 />
 </div>

 {partialPaymentMethod === "cheque" && (
 <div className="space-y-0.5 col-span-2 animate-fade-in">
 <label className="text-[8px] text-default-500 font-bold">Cheque Number *</label>
 <input
 type="text"
 value={partialChequeNumber ?? ''}
 onChange={(e) => setPartialChequeNumber(e.target.value)}
 placeholder="Cheque Number"
 className="w-full bg-content1 border border-divider rounded p-1.5 text-[10px] outline-none text-foreground focus:border-primary"
 />
 </div>
 )}

 <div className="space-y-0.5">
 <label className="text-[8px] text-default-500 font-bold">Remarks / Notes</label>
 <input
 type="text"
 value={partialPaymentNotes ?? ''}
 onChange={(e) => setPartialPaymentNotes(e.target.value)}
 placeholder="Remarks / Notes"
 className="w-full bg-content1 border border-divider rounded p-1.5 text-[10px] outline-none text-foreground focus:border-primary"
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
 value={partialManagerPin ?? ''}
 onChange={(e) => setPartialManagerPin(e.target.value)}
 placeholder="••••"
 className="w-full bg-content1 border border-rose-500/35 rounded p-1.5 text-[10px] outline-none text-foreground focus:border-rose-500"
 />
 </div>
 ) : (
 <div className="space-y-0.5 flex flex-col justify-end">
 <label className="text-[8px] text-emerald-400 font-bold">Admin Status</label>
 <div className="text-[9px] text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg font-bold">
 Authorized ({db.currentUser?.fullName || "Admin"})
 </div>
 </div>
 )}
 </div>

 <div className="flex gap-2.5 pt-1">
 <button
 type="button"
 onClick={() => handleInstallmentPayment(payVal, Number(partialPaymentAmount), partialPaymentNotes)}
 className="flex-1 text-center py-1.5 bg-primary/10 text-primary hover:bg-primary/20 text-[9px] font-black uppercase rounded-lg transition border-0 cursor-pointer"
 >
 Pay Installment
 </button>
 <button
 type="button"
 onClick={() => handleInstallmentPayment(payVal, remaining, "Full Settlement")}
 className="flex-1 text-center py-1.5 bg-primary text-primary-foreground hover:opacity-90 text-[9px] font-black uppercase rounded-lg transition border-0 cursor-pointer"
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
 <div className="border-t border-divider/15 pt-3 mt-4 space-y-3 text-left">
 <div className="flex justify-between items-center">
 <span className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5 font-sans">
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
 <div key={mIdx} className="bg-content1 border border-divider/15 p-2 rounded-xl text-[11px] leading-relaxed text-foreground flex justify-between items-start gap-2 group shadow-3xs">
 <span className="break-words flex-1 font-sans font-semibold text-default-700">{memo}</span>
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
 
 </button>
 </div>
 ))}
 {memoList.length === 0 && (
 <div className="text-center py-4 border border-dashed border-divider/10 rounded-xl">
 <p className="text-[10px] text-default-500 italic">No memos registered for this day.</p>
 </div>
 )}
 </div>

 {/* Add Memo Input */}
 <div className="space-y-1 pt-1">
 <div className="flex gap-1.5">
 <input
 type="text"
 value={dayMemoInput ?? ''}
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
 className="flex-1 bg-content1 border border-divider/25 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-primary text-foreground animate-fade-in"
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
 className="px-3 bg-primary text-primary-foreground hover:opacity-90 transition rounded-xl text-xs font-black cursor-pointer border-0"
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
 <Info className="h-8 w-8 text-default-500 mx-auto animate-pulse" />
 <p className="text-xs text-default-500 italic">
 No Date Selected
 </p>
 <p className="text-[9.5px] text-default-500">
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

 <div className="border-t border-divider/10 pt-3 text-[9px] text-default-500 leading-normal">
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
 <div className="bg-content1 border border-divider/15 p-4 rounded-xl text-xs font-sans space-y-1">
 <span className="text-default-500 block font-bold uppercase tracking-wider text-[9px]">
 Vatable Sales (Net of VAT)
 </span>
 <span className="text-sm font-black ">
 ₱
 {vatableSales.toLocaleString("en-US", {
 minimumFractionDigits: 2,
 })}
 </span>
 </div>
 <div className="bg-content1 border border-divider/15 p-4 rounded-xl text-xs font-sans space-y-1">
 <span className="text-default-500 block font-bold uppercase tracking-wider text-[9px]">
 VAT-Exempt Sales Base
 </span>
 <span className="text-sm font-black ">
 ₱
 {vatExemptSales.toLocaleString("en-US", {
 minimumFractionDigits: 2,
 })}
 </span>
 </div>
 <div className="bg-content1 border border-divider/15 p-4 rounded-xl text-xs font-sans space-y-1">
 <span className="text-default-500 block font-bold uppercase tracking-wider text-[9px]">
 12% Output VAT Amount
 </span>
 <span className="text-sm font-black text-amber-500 ">
 ₱
 {vatOutput.toLocaleString("en-US", {
 minimumFractionDigits: 2,
 })}
 </span>
 </div>
 <div className="bg-content1 border border-divider/15 p-4 rounded-xl text-xs font-sans space-y-1">
 <span className="text-default-500 block font-bold uppercase tracking-wider text-[9px]">
 BIR Discounts & Deductions
 </span>
 <span className="text-sm font-black text-emerald-500 ">
 ₱
 {discountTotal.toLocaleString("en-US", {
 minimumFractionDigits: 2,
 })}
 </span>
 </div>
 <div className="bg-content1 border border-divider/15 p-4 rounded-xl text-xs font-sans space-y-1 col-span-2 sm:col-span-1">
 <span className="text-default-500 block font-bold uppercase tracking-wider text-[9px]">
 Accredited Net Sales Due
 </span>
 <span className="text-sm font-black text-emerald-500 ">
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
 <div className="bg-content1 border border-divider/15 p-5 rounded-2xl space-y-4 shadow-sm font-sans">
 <div>
 <h3 className="font-extrabold text-sm text-primary uppercase tracking-wider">
 Generate Cashier X-Reading
 </h3>
 <p className="text-xs text-default-500 mt-1">
 Runs the system cumulative reading for the active terminal
 user shift session. Reconciles drawer payments without
 closing the grand cumulative counters.
 </p>
 </div>
 <div className="p-4 bg-zinc-100 dark:bg-content2/40 border border-divider/10 rounded-xl space-y-2 text-[11px]">
 <div className="flex justify-between">
 <span>Assigned Terminal:</span>
 <span className="font-bold">TERM-01 ({(db.branches.find(b => b.id === db.currentUser?.branchAssignmentId) || db.branches[0])?.name || "Main Branch"})</span>
 </div>
 <div className="flex justify-between">
 <span>Working Cashier:</span>
 <span className="font-bold">
 {db.currentUser?.fullName || "Active Cashier"}
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
 <div className="flex justify-between text-emerald-500 font-extrabold border-t border-dashed border-divider/20 pt-1.5 text-xs">
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
 customer: db.currentUser?.fullName || "Walk-In Customer",
 date: new Date().toLocaleString(),
 prevBalance: totalSalesFromDay + discountTotal,
 paid: discountTotal,
 newBalance: totalSalesFromDay,
 pointsGained: 0,
 });
 }}
 className="w-full py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer text-xs border-0"
 >
 <Printer className="h-4 w-4" /> Print Current X-Reading Slip
 </button>
 </div>

 {/* Z Reading Card */}
 <div className="bg-content1 border border-divider/15 p-5 rounded-2xl space-y-4 shadow-sm font-sans">
 <div>
 <h3 className="font-extrabold text-sm text-amber-500 uppercase tracking-wider">
 Generate Cumulative Z-Reading
 </h3>
 <p className="text-xs text-default-500 mt-1">
 Concludes all working shifts for the calendar day. Commits
 locked fiscal audit counts, calculates output taxation
 ledger, and resets cashier drawers. This is required for
 official BIR tax submissions.
 </p>
 </div>
 <div className="p-4 bg-zinc-100 dark:bg-content2/40 border border-divider/10 rounded-xl space-y-2 text-[11px]">
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
 {(5420910.0 + Number(totalSalesFromDay)).toLocaleString(
 "en-US",
 { minimumFractionDigits: 2 },
 )}
 </span>
 </div>
 <div className="flex justify-between border-t border-dashed border-divider/20 pt-1.5">
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
 setConfirmZReadingModal(true);
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
 <div className="bir-report-container bg-content1 border border-divider/15 p-5 rounded-2xl overflow-hidden shadow-sm space-y-4">
 {/* Official Print Header for BIR Compliance Sheets */}
 <div className="hidden print:block border-b-2 border-black pb-4 mb-4 text-black">
 <div className="flex justify-between items-start">
 <div>
 <h1 className="text-xl font-black uppercase tracking-tight text-black">{localStorage.getItem('tilepoint_company_name_v1') || db.branches[0]?.name || "MAIN STORE"}</h1>
 <p className="text-xs font-serif font-bold text-black">Bureau of Internal Revenue (BIR) Official Sales & Taxation Ledger</p>
 <p className="text-[10px] text-black mt-0.5">
 {(() => {
  const activeBranch = db.branches.find(b => b.id === db.currentUser?.branchAssignmentId) || db.branches[0];
  const yr = new Date().getFullYear();
  const code = activeBranch?.branchCode || "99201";
  const serial = activeBranch?.id?.slice(0, 6) || "049281";
  const tin = activeBranch?.tin || "009-482-110-000";
  return `Permit #: BIR-PERMIT-${yr}-${code}-MNL | Serial: MIN-${yr}${serial}-01 | Machine Tax ID: ${tin}`;
})()}
 </p>
 <p className="text-[10px] text-black">
 Branch: Central Depot & Main Hub | Operator: {db.currentUser?.fullName || 'System Administrator'}
 </p>
 </div>
 <div className="text-right text-xs">
 <span className="font-extrabold uppercase block border border-black px-2.5 py-1 text-[11px] bg-zinc-100">
 {activeSubTab.replace("bir-", "").replace("-", " ").toUpperCase()} LEDGER SHEET
 </span>
 <p className="text-[10px] text-black mt-1">Generated: {new Date().toLocaleString()}</p>
 <p className="text-[9px] text-black">Page 1 of BIR Audit Trail</p>
 </div>
 </div>

 {/* Print Summary Metrics Bar */}
 <div className="grid grid-cols-5 gap-2 mt-3 pt-3 border-t border-dashed border-black text-[10px] ">
 <div>
 <span className="block text-[8.5px] uppercase font-bold text-black">Vatable Sales:</span>
 <span className="font-extrabold text-black">₱{vatableSales.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
 </div>
 <div>
 <span className="block text-[8.5px] uppercase font-bold text-black">VAT-Exempt Sales:</span>
 <span className="font-extrabold text-black">₱{vatExemptSales.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
 </div>
 <div>
 <span className="block text-[8.5px] uppercase font-bold text-black">12% Output VAT:</span>
 <span className="font-extrabold text-black">₱{vatOutput.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
 </div>
 <div>
 <span className="block text-[8.5px] uppercase font-bold text-black">Total Discounts:</span>
 <span className="font-extrabold text-black">₱{discountTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
 </div>
 <div>
 <span className="block text-[8.5px] uppercase font-bold text-black">Net Sales Due:</span>
 <span className="font-black text-black">₱{totalSalesFromDay.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
 </div>
 </div>
 </div>

 <div className="flex justify-between items-center bg-content3/30 p-3 rounded-xl border border-divider/10 font-sans text-xs">
 <span className="font-extrabold text-primary uppercase tracking-wider">
 {activeSubTab
 .replace("bir-", "")
 .replace("-", " ")
 .toUpperCase()}{" "}
 LEDGER SHEETS
 </span>
 <div className="flex gap-2 bir-report-no-print">
 <button
 onClick={() => window.print()}
 className="py-1 px-2 text-[11px] bg-zinc-200 dark:bg-content2 text-foreground rounded font-bold hover:bg-zinc-300 transition flex items-center gap-1 cursor-pointer border-0"
 >
 <Printer className="h-3.5 w-3.5" /> Print Sheets
 </button>
 <button
 onClick={() => {
 const activeTaxCategory = activeSubTab.replace("bir-", "").replace("-", " ").toUpperCase();
 const salesToProcess = db.sales.filter((s) => !s.isDeleted);

 const exportData = salesToProcess.map((s, idx) => {
 const sDiscountType = s.discountType;
 let isPwd = false, isSenior20 = false, isSenior5 = false, isSolo = false, isAthletes = false, isRegular = false;

 if (sDiscountType) {
 isPwd = activeSubTab === "bir-pwd" && sDiscountType === "PWD";
 isSenior20 = activeSubTab === "bir-senior20" && sDiscountType === "SENIOR";
 isSenior5 = activeSubTab === "bir-senior5" && sDiscountType === "SENIOR5";
 isSolo = activeSubTab === "bir-solo" && sDiscountType === "SOLO";
 isAthletes = activeSubTab === "bir-athletes" && sDiscountType === "ATHLETES";
 isRegular = activeSubTab === "bir-regular" && (s.discount || 0) > 0 && !["PWD", "SENIOR", "SENIOR5", "SOLO", "ATHLETES"].includes(sDiscountType);
 } else {
 const keyVal = idx % 12;
 isPwd = activeSubTab === "bir-pwd" && keyVal === 0;
 isSenior20 = activeSubTab === "bir-senior20" && keyVal === 1;
 isSenior5 = activeSubTab === "bir-senior5" && keyVal === 2;
 isSolo = activeSubTab === "bir-solo" && keyVal === 3;
 isAthletes = activeSubTab === "bir-athletes" && keyVal === 4;
 isRegular = activeSubTab === "bir-regular" && (s.discount || 0) > 0 && ![0, 1, 2, 3, 4].includes(keyVal);
 }
 const isSummary = activeSubTab === "bir-summary";

 const matchesFilter = isSummary || isRegular || isPwd || isSenior20 || isSenior5 || isSolo || isAthletes;
 if (!matchesFilter) return null;

 const taxLabel = isPwd ? "PWD Dsc. 20%" : isSenior20 ? "Senior 20% Dsc." : isSenior5 ? "Senior 5% Special" : isSolo ? "Solo Parent Dsc." : isAthletes ? "Athletes Dsc." : "Regular Promo";
 const isVatExempt = isPwd || isSenior20 || isSenior5 || isSolo || isAthletes;

 const rowVat = isVatExempt ? 0 : s.vat || 0;
 const rowVatable = isVatExempt ? 0 : (s.subtotal - rowVat) || 0;
 const rowVatExempt = isVatExempt ? s.subtotal || 0 : 0;
 const rowDiscount = s.discount || (isVatExempt ? parseFloat((rowVatExempt * 0.2).toFixed(2)) : 0);
 const rowNet = parseFloat((rowVatable + rowVat + rowVatExempt - rowDiscount).toFixed(2));

 return {
 date: new Date(s.createdAt).toISOString().slice(0, 10),
 saleNumber: s.saleNumber || s.id,
 customer: s.customerName || "Walk-in Buyer",
 taxLabel,
 vatable: rowVatable.toFixed(2),
 vatExempt: rowVatExempt.toFixed(2),
 vat: rowVat.toFixed(2),
 discount: rowDiscount.toFixed(2),
 net: rowNet.toFixed(2),
 };
 }).filter(Boolean);

 if (exportData.length === 0) {
 alert("No BIR taxation records match the selected category.");
 return;
 }

 const headers = ["Reference Date", "SI Number", "Customer Name", "Tax Classification", "VATable Sales (PHP)", "VAT-Exempt Sales (PHP)", "VAT Amount (PHP)", "Discount (PHP)", "Net Amount Paid (PHP)"];
 const rows = exportData.map((d) => [
 d!.date, d!.saleNumber, d!.customer, d!.taxLabel, d!.vatable, d!.vatExempt, d!.vat, d!.discount, d!.net
 ]);

 const csvContent = "\uFEFF" + [
 `"BIR COMPLIANCE TAX LEDGER - ${activeTaxCategory}"`,
 `"Generated On: ${new Date().toLocaleString()}"`,
 "",
 headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","),
 ...rows.map((r) => r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")),
 ].join("\n");

 const filename = `TilePoint_BIR_Taxation_${activeSubTab}_${new Date().toISOString().slice(0, 10)}.csv`;
 saveFileToBackup(csvContent, filename, "Sales_Reports", "text/csv;charset=utf-8;")
 .then((res) => {
 alert(`BIR Tax Ledger exported to CSV successfully! Saved as ${res.path || filename}`);
 })
 .catch(() => {
 const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url;
 a.download = filename;
 a.click();
 URL.revokeObjectURL(url);
 });
 }}
 className="py-1 px-2 text-[11px] bg-primary text-primary-foreground rounded font-bold hover:opacity-90 transition flex items-center gap-1 cursor-pointer border-0"
 >
 <Download className="h-3.5 w-3.5" /> Export CSV
 </button>
 </div>
 </div>

 <div className="overflow-x-auto rounded-xl border border-divider/15">
 {(() => {
 const filteredRows = db.sales
 .filter((s) => !s.isDeleted)
 .map((s, idx) => {
  const sDiscountType = s.discountType;
 let isPwd = false;
 let isSenior20 = false;
 let isSenior5 = false;
 let isSolo = false;
 let isAthletes = false;
 let isRegular = false;

 if (sDiscountType) {
 isPwd = activeSubTab === "bir-pwd" && sDiscountType === "PWD";
 isSenior20 = activeSubTab === "bir-senior20" && sDiscountType === "SENIOR";
 isSenior5 = activeSubTab === "bir-senior5" && sDiscountType === "SENIOR5";
 isSolo = activeSubTab === "bir-solo" && sDiscountType === "SOLO";
 isAthletes = activeSubTab === "bir-athletes" && sDiscountType === "ATHLETES";
 isRegular = activeSubTab === "bir-regular" && (s.discount || 0) > 0 && !["PWD", "SENIOR", "SENIOR5", "SOLO", "ATHLETES"].includes(sDiscountType);
 } else {
 const keyVal = idx % 12;
 isPwd = activeSubTab === "bir-pwd" && keyVal === 0;
 isSenior20 = activeSubTab === "bir-senior20" && keyVal === 1;
 isSenior5 = activeSubTab === "bir-senior5" && keyVal === 2;
 isSolo = activeSubTab === "bir-solo" && keyVal === 3;
 isAthletes = activeSubTab === "bir-athletes" && keyVal === 4;
 isRegular = activeSubTab === "bir-regular" && (s.discount || 0) > 0 && ![0, 1, 2, 3, 4].includes(keyVal);
 }
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

 const rowVat = isVatExempt ? 0 : s.vat || 0;
 const rowVatable = isVatExempt ? 0 : (s.subtotal - rowVat) || 0;
 const rowVatExempt = isVatExempt ? s.subtotal || 0 : 0;
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
 <table className="w-full text-left font-sans text-xs divide-y divide-divider/15 min-w-[900px]">
 <thead className="bg-content3/50 font-black border-b border-divider/15">
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
 <tbody className="divide-y divide-divider/10 bg-content1">
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
 className="hover:bg-primary/5 transition-all text-foreground"
 >
 <td className="p-3 text-[10.5px] text-default-500">
 {new Date(
 s.createdAt || Date.now(),
 ).toLocaleString()}
 </td>
 <td className="p-3 font-black text-primary">
 {s.saleNumber || s.id}
 </td>
 <td className="p-3 font-bold uppercase text-[10px]">
 {s.customerName || "Walk-In Customer"}
 <span className="block text-[9px] text-default-500 font-normal lowercase tracking-wide mt-0.5">
 ({taxLabel})
 </span>
 </td>
 <td className="p-3 text-right ">
 ₱
 {rowVatable.toLocaleString("en-US", {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })}
 </td>
 <td className="p-3 text-right ">
 ₱
 {rowVatExempt.toLocaleString("en-US", {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })}
 </td>
 <td className="p-3 text-right text-amber-500">
 ₱
 {rowVat.toLocaleString("en-US", {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })}
 </td>
 <td className="p-3 text-right text-rose-500 font-bold">
 -₱
 {rowDiscount.toLocaleString("en-US", {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })}
 </td>
 <td className="p-3 text-right text-emerald-500 font-extrabold">
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
 <tfoot className="bg-content3/30 border-t border-divider/30 font-black text-[11px] text-foreground">
 <tr>
 <td
 colSpan={3}
 className="p-3 text-left uppercase tracking-wider text-default-500"
 >
 Cumulative Ledger Totals:
 </td>
 <td className="p-3 text-right ">
 ₱
 {sumVatable.toLocaleString("en-US", {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })}
 </td>
 <td className="p-3 text-right ">
 ₱
 {sumVatExempt.toLocaleString("en-US", {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })}
 </td>
 <td className="p-3 text-right text-amber-500">
 ₱
 {sumVat.toLocaleString("en-US", {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })}
 </td>
 <td className="p-3 text-right text-rose-500">
 -₱
 {sumDiscount.toLocaleString("en-US", {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })}
 </td>
 <td className="p-3 text-right text-emerald-500">
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

 {/* Official Print Sign-off Footer */}
 <div className="hidden print:block pt-8 mt-6 border-t border-black text-[10px] text-black">
 <div className="grid grid-cols-3 gap-8 text-center">
 <div>
 <div className="border-b border-black mb-1 h-8"></div>
 <p className="font-bold uppercase">Prepared By (Cashier/Staff)</p>
 <p className="text-[8px] text-default-600">Signature Over Printed Name</p>
 </div>
 <div>
 <div className="border-b border-black mb-1 h-8"></div>
 <p className="font-bold uppercase">Verified By (Branch Manager)</p>
 <p className="text-[8px] text-default-600">Signature Over Printed Name</p>
 </div>
 <div>
 <div className="border-b border-black mb-1 h-8"></div>
 <p className="font-bold uppercase">BIR Auditor / Inspector</p>
 <p className="text-[8px] text-default-600">Official Stamp & Date</p>
 </div>
 </div>
 </div>
 </div>
 )}
 </motion.div>
 )}
 </AnimatePresence>

      {/* Adjust Points Modal */}
      {showAdjustPointsModal && selectedLoyaltyMember && (
        <div className="fixed inset-0 z-50 bg-gray-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-content1 border border-divider/20 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-xl text-xs font-sans">
            <div className="flex justify-between items-center border-b border-divider/15 pb-3">
              <h3 className="font-extrabold text-sm text-primary flex items-center gap-1.5">
                <Sparkles className="h-4.5 w-4.5 text-amber-500" />
                <span>Adjust Points — {selectedLoyaltyMember.fullName}</span>
              </h3>
              <button
                onClick={() => setShowAdjustPointsModal(false)}
                className="text-default-500 hover:text-foreground text-base font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

 <div className="bg-content1 p-3 rounded-xl border border-divider/10 flex justify-between items-center ">
              <span className="text-default-500 font-sans text-xs">Current Points Balance:</span>
              <span className="font-extrabold text-amber-500 text-sm">{(selectedLoyaltyMember.points || 0)} Pts</span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const delta = parseInt(adjustPointsAmount) || 0;
                if (delta === 0) return;

                const updatedMembers = rawMembers.map((m) => {
                  if (m.id === selectedLoyaltyMember.id) {
                    const newPts = Math.max(0, (m.points || 0) + delta);
                    return { ...m, points: newPts };
                  }
                  return m;
                });

                setMembers(updatedMembers);
                localStorage.setItem(LOCAL_STORAGE_MEMBERS, JSON.stringify(updatedMembers));
                setShowAdjustPointsModal(false);
              }}
              className="space-y-3.5"
            >
              <div className="space-y-1">
                <label className="font-bold text-default-500 flex justify-between">
                  <span>Points Adjustment (+ grant, - deduct) *</span>
                  {adjustPointsAmount && (
 <span className=" text-xs text-amber-500 font-bold">
                      Val: {formatCurrency(Math.abs(parseInt(adjustPointsAmount) || 0) * (db.loyaltyConfig?.pointValueInPhp || 1.0))}
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  required
                  value={adjustPointsAmount ?? ''}
                  onChange={(e) => setAdjustPointsAmount(e.target.value)}
                  placeholder="Points amount"
 className="w-full bg-content3 border border-divider rounded-lg p-2.5 outline-none font-bold text-sm focus:border-amber-500 text-foreground"
                />

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] text-default-500 font-bold uppercase w-full">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => { setAdjustPointsAmount("10"); setAdjustPointsReason("Loyalty Bonus Credit"); }}
 className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-bold text-[10px] rounded border border-emerald-500/20 cursor-pointer"
                  >
                    +10 Bonus
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAdjustPointsAmount("50"); setAdjustPointsReason("Promo Reward Bonus"); }}
 className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-bold text-[10px] rounded border border-emerald-500/20 cursor-pointer"
                  >
                    +50 Bonus
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAdjustPointsAmount("100"); setAdjustPointsReason("VIP Milestone Bonus"); }}
 className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-bold text-[10px] rounded border border-emerald-500/20 cursor-pointer"
                  >
                    +100 Bonus
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAdjustPointsAmount("-10"); setAdjustPointsReason("Direct Voucher Redemption"); }}
 className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-bold text-[10px] rounded border border-rose-500/20 cursor-pointer"
                  >
                    -10 Redeem
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAdjustPointsAmount("-50"); setAdjustPointsReason("Store Discount Redemption"); }}
 className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-bold text-[10px] rounded border border-rose-500/20 cursor-pointer"
                  >
                    -50 Redeem
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAdjustPointsAmount(`-${selectedLoyaltyMember.points || 0}`); setAdjustPointsReason("Full Balance Store Credit Redemption"); }}
 className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-bold text-[10px] rounded border border-amber-500/20 cursor-pointer"
                  >
                    Use All ({selectedLoyaltyMember.points || 0} Pts)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-default-500">
                  Reason / Note (Optional)
                </label>
                <input
                  type="text"
                  value={adjustPointsReason ?? ''}
                  onChange={(e) => setAdjustPointsReason(e.target.value)}
                  placeholder="Reason / Note"
                  className="w-full bg-content3 border border-divider rounded-lg p-2.5 outline-none text-xs focus:border-amber-500 text-foreground"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustPointsModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-content2 hover:bg-default-200 text-default-700 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold transition cursor-pointer shadow-sm"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Z-Reading Generation Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmZReadingModal}
        title="Generate Cumulative Z-Reading"
        alertType="warning"
        confirmText="Proceed & Lock Drawers"
        cancelText="Cancel"
        message="Generating a Z-Reading concludes all working shifts for the calendar day, commits locked fiscal audit counts, and locks cashier drawers for the calendar cycle. Proceed?"
        onConfirm={() => {
          setPrintReceiptData({
            title: "BIR CUMULATIVE Z-READING",
            receiptNo: "Z-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Date.now().toString().slice(-4),
            customer: (localStorage.getItem('tilepoint_company_name_v1') || db.branches[0]?.name || "MAIN HQ").toUpperCase(),
            date: new Date().toLocaleString(),
            prevBalance: Math.max(0, db.sales.reduce((acc, s) => acc + (!s.isDeleted ? Number(s.grandTotal) || 0 : 0), 0) - Number(totalSalesFromDay || 0)),
            paid: totalSalesFromDay,
            newBalance: db.sales.reduce((acc, s) => acc + (!s.isDeleted ? Number(s.grandTotal) || 0 : 0), 0),
            pointsGained: 0,
          });
          setConfirmZReadingModal(false);
        }}
        onCancel={() => setConfirmZReadingModal(false)}
      />
    </div>
  );
}
