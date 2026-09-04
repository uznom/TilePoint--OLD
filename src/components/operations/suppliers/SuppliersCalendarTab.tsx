import React, { useState, useMemo, useCallback } from "react";
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  Info,
  Search,
  Sliders,
} from "lucide-react";
import { CustomCorporateBill, PoItem, PurchaseOrder, Supplier, User, UserRole } from "../../../types/db";
import { HeroSelect } from "../../common/ui/HeroSelect";
import { HeroDropdownSelect } from "../../common/ui/HeroDropdown";
import { HeroDatePicker } from "../../common/ui/HeroDatePicker";

export interface SuppliersCalendarTabProps {
  currentUser: User | null;
  purchaseOrders: PurchaseOrder[];
  poItems: PoItem[];
  suppliers: Supplier[];
  customBills: CustomCorporateBill[];
  saveCustomBills: (bills: CustomCorporateBill[]) => void;
  dayMemos: Record<string, string>;
  setDayMemos: (memos: Record<string, string>) => void;
  calendarNotes: string;
  setCalendarNotes: (notes: string) => void;
  users: User[];
  addAuditLog: (action: string, description: string, tableAffected: string, recordId: string, changePayload?: string) => void;
  updatePOStatus: (poId: string, status: any) => void;
  onAddCustomBill: (bill: {
    title: string;
    totalAmount: number;
    frequency: "WEEKLY" | "MONTHLY" | "SEMI_QUARTERLY" | "QUARTERLY" | "YEARLY";
    nextDueDate: string;
  }) => void;
}

export const SuppliersCalendarTab: React.FC<SuppliersCalendarTabProps> = ({
  currentUser,
  purchaseOrders,
  poItems,
  suppliers,
  customBills,
  saveCustomBills,
  dayMemos,
  setDayMemos,
  calendarNotes,
  setCalendarNotes,
  users,
  addAuditLog,
  updatePOStatus,
  onAddCustomBill,
}) => {
  // Navigation & install state
  const [calendarMonth, setCalendarMonth] = useState<number>(() => new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState<number>(() => new Date().getFullYear());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null);

  const daysInActiveMonth = useMemo(() => new Date(calendarYear, calendarMonth + 1, 0).getDate(), [calendarYear, calendarMonth]);

  const [leftPanelTab, setLeftPanelTab] = useState<"list" | "create" | "notes">("list");
  const [billTitle, setBillTitle] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billFrequency, setBillFrequency] = useState<"WEEKLY" | "MONTHLY" | "SEMI_QUARTERLY" | "QUARTERLY" | "YEARLY">("MONTHLY");
  const [billDueDate, setBillDueDate] = useState(() => new Date().toISOString().split("T")[0]);

  const [payableSearchQuery, setPayableSearchQuery] = useState("");
  const [payableStatusFilter, setPayableStatusFilter] = useState<"all" | "active" | "partial" | "paid">("all");
  const [payableSortField, setPayableSortField] = useState<"due" | "amount" | "supplier">("due");

  const [partialPaymentAmount, setPartialPaymentAmount] = useState<string>("");
  const [partialPaymentNotes, setPartialPaymentNotes] = useState<string>("");
  const [partialPaymentMethod, setPartialPaymentMethod] = useState<"cash" | "cheque">("cash");
  const [partialChequeNumber, setPartialChequeNumber] = useState<string>("");
  const [partialManagerPin, setPartialManagerPin] = useState<string>("");

  const [dayMemoInput, setDayMemoInput] = useState("");

  const [installments, setInstallments] = useState<Record<string, { id: string; amount: number; date: string; notes?: string }[]>>(() => {
    try {
      const saved = localStorage.getItem("atpos_v2_payable_installments");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const saveInstallments = (updated: Record<string, { id: string; amount: number; date: string; notes?: string }[]>) => {
    setInstallments(updated);
    localStorage.setItem("atpos_v2_payable_installments", JSON.stringify(updated));
  };

  const getPoPaymentInfo = useCallback((po: any) => {
    const relatedItems = poItems.filter((item) => item.poId === po.id);
    const poSum = po.totalAmount || relatedItems.reduce(
      (s, it) => s + (it.costPrice || 0) * (it.quantityRequested || 0),
      0
    );

    let dueDay = 15;
    let dueMonth = 5;
    let dueYear = 2026;
    if (po.paymentMode === "terms" && po.termEndDate) {
      try {
        const d = new Date(po.termEndDate);
        if (!isNaN(d.getTime())) {
          dueDay = d.getDate();
          dueMonth = d.getMonth();
          dueYear = d.getFullYear();
        }
      } catch (dateErr) {
        console.debug("[PO Schedule] Failed to parse termEndDate:", po.termEndDate, dateErr);
      }
    } else if (po.date) {
      try {
        const d = new Date(po.date);
        if (!isNaN(d.getTime())) {
          const days = po.termsLength || 30;
          d.setDate(d.getDate() + days);
          dueDay = d.getDate();
          dueMonth = d.getMonth();
          dueYear = d.getFullYear();
        }
      } catch (dateErr) {
        console.debug("[PO Schedule] Failed to parse po.date:", po.date, dateErr);
      }
    }
    return { sum: poSum, day: dueDay, month: dueMonth, year: dueYear };
  }, [poItems]);

  const months = useMemo(() => [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ], []);

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

  const flatPayablesList: FlatPayableItem[] = useMemo(() => {
    const list: FlatPayableItem[] = [];

    purchaseOrders.forEach((po) => {
      if (po.status === "Cancelled" || po.status === "Completed") return;
      const info = getPoPaymentInfo(po);
      const supplier = suppliers.find((s) => s.id === po.supplierId);
      if (supplier && !supplier.isDeleted) {
        if (info.month === calendarMonth && info.year === calendarYear) {
          list.push({
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

          const timeDiff = currentCheckDate.getTime() - baseDate.getTime();
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
                  (currentCheckDate.getMonth() - baseDate.getMonth()) % 3 === 0;
                break;
              case "YEARLY":
                matchesRecurrence =
                  baseDate.getDate() === dayCheck &&
                  baseDate.getMonth() === currentCheckDate.getMonth();
                break;
            }
          }

          if (matchesRecurrence) {
            list.push({
              day: dayCheck,
              month: calendarMonth,
              year: calendarYear,
              supplierName: bill.title,
              amount: bill.remainingBalance !== undefined ? bill.remainingBalance : bill.totalAmount,
              poNumber: `BILL-${bill.id.slice(0, 6).toUpperCase()}`,
              poId: bill.id,
              status: bill.status || "Active",
              type: "Recurring Bill",
              frequency: bill.frequency,
            });
          }
        }
      } catch (err) {
        console.warn("[Recurrence Projection Fault]:", err);
      }
    });

    return list;
  }, [purchaseOrders, suppliers, customBills, calendarMonth, calendarYear, daysInActiveMonth, getPoPaymentInfo]);

  const activePayables: Record<
    number,
    {
      supplierName: string;
      amount: number;
      poNumber: string;
      poId: string;
      status: string;
    }[]
  > = useMemo(() => {
    const map: Record<number, any[]> = {};
    flatPayablesList.forEach((item) => {
      if (!map[item.day]) {
        map[item.day] = [];
      }
      map[item.day].push({
        supplierName: item.supplierName,
        amount: item.amount,
        poNumber: item.poNumber,
        poId: item.poId,
        status: item.status,
      });
    });
    return map;
  }, [flatPayablesList]);

  const processedList = useMemo(() => {
    return flatPayablesList.map((item) => {
      const payHistory = installments[item.poId] || [];
      const totalPaid = payHistory.reduce((sum, inst) => sum + inst.amount, 0);
      const remaining = Math.max(0, item.amount - totalPaid);
      const isFinished = remaining <= 0;
      const statusState = isFinished ? "paid" : totalPaid > 0 ? "partial" : "active";

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
        diffDays,
      };
    });
  }, [flatPayablesList, installments]);

  const filteredPayablesList = useMemo(() => {
    return processedList.filter((item) => {
      const matchesSearch =
        item.supplierName.toLowerCase().includes(payableSearchQuery.toLowerCase()) ||
        item.poNumber.toLowerCase().includes(payableSearchQuery.toLowerCase());

      const matchesStatus =
        payableStatusFilter === "all" || item.statusState === payableStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [processedList, payableSearchQuery, payableStatusFilter]);

  const sortedPayablesList = useMemo(() => {
    return [...filteredPayablesList].sort((a, b) => {
      if (payableSortField === "amount") {
        return b.remaining - a.remaining;
      }
      if (payableSortField === "supplier") {
        return a.supplierName.localeCompare(b.supplierName);
      }
      return a.diffDays - b.diffDays;
    });
  }, [filteredPayablesList, payableSortField]);

  const selectedDayEntries = useMemo(() => {
    return selectedCalendarDay
      ? activePayables[selectedCalendarDay] || []
      : [];
  }, [selectedCalendarDay, activePayables]);

  const handleInstallmentPayment = (payVal: any, payAmountNum: number, notesStr: string) => {
    if (!payAmountNum || payAmountNum <= 0) {
      alert("Please enter a valid installment payment amount.");
      return;
    }

    let isAuthorized = false;
    let authorizerName = "Supervisor";
    const isAdmin = currentUser?.role === UserRole.ADMIN;

    if (isAdmin) {
      isAuthorized = true;
      authorizerName = currentUser?.fullName || "Administrator";
    } else {
      if (!partialManagerPin) {
        alert("Security Error: Manager security authorization PIN is strictly required.");
        return;
      }
      const foundUserByPin = users.find(
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

    const methodDetails = partialPaymentMethod === "cheque"
      ? `Cheque Payment (Cheque No: ${partialChequeNumber || "N/A"})`
      : "Cash Payment";
    const trackingNotes = `${methodDetails} - Authorized by ${authorizerName}. ${notesStr ? `Notes: ${notesStr}` : ""}`;

    const newInstallment = {
      id: `INST-${Date.now()}`,
      amount: payAmountNum,
      date: new Date().toISOString(),
      notes: trackingNotes,
    };

    const updatedHistory = [...currentHistory, newInstallment];
    const newTotalPaid = totalPaidSoFar + payAmountNum;
    const isFullyPaid = newTotalPaid >= payVal.amount;

    const updatedInstallments = {
      ...installments,
      [payVal.poId]: updatedHistory,
    };
    saveInstallments(updatedInstallments);

    addAuditLog(
      "PAYABLE_INSTALLMENT",
      `Paid installment of ₱${payAmountNum.toLocaleString()} via ${partialPaymentMethod.toUpperCase()} for ${payVal.poNumber}. Authorized by ${authorizerName}. Total Paid: ₱${newTotalPaid.toLocaleString()} / ₱${payVal.amount.toLocaleString()}.`,
      "Procurement",
      payVal.poId,
      JSON.stringify({ poId: payVal.poId, poNumber: payVal.poNumber, payment: newInstallment, isFullyPaid, authorizer: authorizerName })
    );

    if (payVal.poNumber.startsWith("BILL-")) {
      const updatedBills = customBills.map((b) => {
        if (b.id === payVal.poId) {
          const currentBal = b.remainingBalance !== undefined ? b.remainingBalance : b.totalAmount;
          const newBal = Math.max(0, currentBal - payAmountNum);
          return {
            ...b,
            remainingBalance: newBal,
            status: newBal <= 0 ? ("Completed" as any) : b.status,
            isDeleted: newBal <= 0 ? true : b.isDeleted,
            deletedAt: newBal <= 0 ? new Date().toISOString() : b.deletedAt,
          };
        }
        return b;
      });
      saveCustomBills(updatedBills);
    } else {
      if (isFullyPaid) {
        updatePOStatus(payVal.poId, "Completed");
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

  const handleAddBillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(billAmount);
    if (!billTitle.trim() || isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid bill title and positive numerical amount.");
      return;
    }
    onAddCustomBill({
      title: billTitle.trim(),
      totalAmount: amountNum,
      frequency: billFrequency,
      nextDueDate: billDueDate || new Date().toISOString().split("T")[0],
    });
    setBillTitle("");
    setBillAmount("");
  };

  if (currentUser?.role !== UserRole.ADMIN) {
    return (
      <div className="p-8 text-center bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20 max-w-md mx-auto font-sans">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-rose-500" />
        <h4 className="font-bold">Unauthorised Access</h4>
        <p className="text-xs mt-1">
          The Supplier Payment Calendar is restricted to Administrator personnel only.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-xs">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Side Panel */}
        <div className="bg-content1 border border-divider/15 p-5 rounded-2xl text-left space-y-4 h-fit flex flex-col">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-primary border-b border-divider/10 pb-2">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4" />
                <h4 className="font-extrabold text-xs uppercase tracking-wider">Payables Hub</h4>
              </div>
              <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {flatPayablesList.length} Accounts
              </span>
            </div>

            <div className="flex bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-full border border-zinc-200/50 dark:border-white/5">
              <button
                type="button"
                onClick={() => setLeftPanelTab("list")}
                className={`flex-1 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer font-sans active:scale-[0.98] ${
                  leftPanelTab === "list"
                    ? "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-bold"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                Accounts List
              </button>
              <button
                type="button"
                onClick={() => setLeftPanelTab("create")}
                className={`flex-1 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer font-sans active:scale-[0.98] ${
                  leftPanelTab === "create"
                    ? "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-bold"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                Setup Bill
              </button>
              <button
                type="button"
                onClick={() => setLeftPanelTab("notes")}
                className={`flex-1 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer font-sans active:scale-[0.98] ${
                  leftPanelTab === "notes"
                    ? "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-bold"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                Memos
              </button>
            </div>
          </div>

          {leftPanelTab === "create" ? (
            <form onSubmit={handleAddBillSubmit} className="space-y-3 font-sans text-xs">
              <div className="space-y-1">
                <label className="font-bold text-default-500">Liability Account Title *</label>
                <input
                  required
                  type="text"
                  value={billTitle}
                  onChange={(e) => setBillTitle(e.target.value)}
                  placeholder="Account Title"
                  className="w-full bg-content1 border border-divider rounded-lg p-2.5 outline-none font-semibold focus:border-primary text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-default-500 text-xs">Payout Amount (PHP) *</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xl font-black text-default-400 font-mono select-none pointer-events-none">
                    ₱
                  </span>
                  <input
                    required
                    type="number"
                    step="any"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-content1 border border-divider rounded-xl pl-9 pr-3.5 py-3 outline-none focus:border-primary text-foreground font-black font-mono text-xl h-14 shadow-inner"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <HeroSelect
                  label="Recurrence Interval"
                  isRequired
                  value={billFrequency}
                  onValueChange={(val) => setBillFrequency(val as any)}
                  radius="md"
                  items={[
                    { key: 'WEEKLY', label: 'Weekly Cycle' },
                    { key: 'MONTHLY', label: 'Monthly Cycle' },
                    { key: 'SEMI_QUARTERLY', label: 'Semi-Quarterly (45d)' },
                    { key: 'QUARTERLY', label: 'Quarterly Installment' },
                    { key: 'YEARLY', label: 'Yearly Corporate Bill' },
                  ]}
                />
              </div>
              <div className="space-y-1">
                <HeroDatePicker
                  label="Target Start Due Date *"
                  isRequired
                  value={billDueDate}
                  onChange={(val) => setBillDueDate(val)}
                  size="sm"
                  radius="md"
                  placeholder="Select start due date"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-primary text-primary-foreground font-black uppercase tracking-wider text-[10px] rounded-xl shadow-xs hover:opacity-90 cursor-pointer border-0"
              >
                Schedule Recurring Bill
              </button>
            </form>
          ) : leftPanelTab === "notes" ? (
            <div className="space-y-3 flex-1 flex flex-col text-xs h-full">
              <div className="flex items-center gap-1.5 text-primary border-b border-divider/10 pb-2">
                <FileText className="h-4 w-4" />
                <h4 className="font-extrabold text-xs uppercase tracking-wider">Calendar Memos</h4>
              </div>
              <p className="text-[10px] text-default-500">
                Draft reminders or admin details here. All changes are saved automatically.
              </p>
              <textarea
                value={calendarNotes}
                onChange={(e) => setCalendarNotes(e.target.value)}
                placeholder="Type notes or specific reminders here..."
                className="w-full flex-1 min-h-[300px] bg-content1 border border-divider rounded-xl p-3 outline-none text-foreground text-xs focus:border-primary resize-none leading-relaxed"
              />
              <div className="flex justify-between items-center text-[9px] text-default-500">
                <span>Auto-Saved</span>
                <span>{calendarNotes.length} chars</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3 flex-1 flex flex-col">
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-default-500" />
                  <input
                    type="text"
                    value={payableSearchQuery}
                    onChange={(e) => setPayableSearchQuery(e.target.value)}
                    placeholder="Search supplier / ID..."
                    className="w-full bg-content1 border border-divider rounded-lg pl-8 pr-3 py-2 text-xs outline-none focus:border-primary text-foreground font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-default-500">
                      Filter Status
                    </label>
                    <HeroDropdownSelect
                      items={[
                        { key: 'all', label: 'All Statuses' },
                        { key: 'active', label: 'Active' },
                        { key: 'partial', label: 'Partial' },
                        { key: 'paid', label: 'Settled' },
                      ]}
                      selectedKey={payableStatusFilter}
                      onSelectionChange={(val) => setPayableStatusFilter(val as any)}
                      size="sm"
                      variant="pill"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-default-500">
                      Sort By
                    </label>
                    <HeroDropdownSelect
                      items={[
                        { key: 'due', label: 'Urgency / Due' },
                        { key: 'amount', label: 'Amount' },
                        { key: 'supplier', label: 'Supplier' },
                      ]}
                      selectedKey={payableSortField}
                      onSelectionChange={(val) => setPayableSortField(val as any)}
                      size="sm"
                      variant="pill"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                {sortedPayablesList.length > 0 ? (
                  sortedPayablesList.map((item, idx) => {
                    const isSelected = selectedCalendarDay === item.day;
                    let urgencyBadge: string;
                    let alertIconColor: string;
                    if (item.isFinished) {
                      urgencyBadge = "text-emerald-500 bg-emerald-500/10 border-emerald-500/25";
                      alertIconColor = "text-emerald-500";
                    } else if (item.diffDays < 0) {
                      urgencyBadge = "text-rose-500 bg-rose-500/15 border-rose-500/30 font-black";
                      alertIconColor = "text-rose-500";
                    } else if (item.diffDays === 0) {
                      urgencyBadge = "text-red-400 bg-red-950/40 border border-red-500/30 font-black";
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

                    return (
                      <div
                        key={`${item.poId}-${idx}`}
                        onClick={() => setSelectedCalendarDay(item.day)}
                        className={`p-3 rounded-xl border transition-all text-left cursor-pointer hover:bg-content3/35 ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary"
                            : "border-divider/15 bg-content3/15"
                        }`}
                      >
                        <div className="flex justify-between items-center gap-1.5 mb-1.5">
                          <span className="text-[9px] font-extrabold text-primary truncate max-w-[120px]" title={item.poNumber}>
                            {item.poNumber}
                          </span>
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-content2/40 text-default-500">
                            {item.type === "Recurring Bill" ? `${item.frequency || "Monthly"} Bill` : "Purchase Order"}
                          </span>
                        </div>

                        <h5 className="text-[11px] font-extrabold text-foreground leading-tight truncate">
                          {item.supplierName}
                        </h5>

                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-default-500">Balance:</span>
                            <span className={`font-black ${item.isFinished ? "text-emerald-500" : "text-amber-500"}`}>
                              ₱{item.remaining.toLocaleString()}
                            </span>
                          </div>
                          {item.amount > 0 && (
                            <div className="w-full bg-default-200/30 h-1 rounded-full overflow-hidden mt-1">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-300 active:scale-95"
                                style={{ width: `${Math.min(100, (item.totalPaid / item.amount) * 100)}%` }}
                              />
                            </div>
                          )}
                        </div>

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
                    <Info className="h-5 w-5 text-default-400 mx-auto" />
                    <p className="text-xs text-default-500 font-bold">No Payables Found</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Primary Interactive Calendar Grid */}
        <div className="lg:col-span-3 bg-content1 border border-divider/15 p-5 rounded-2xl grid grid-cols-1 xl:grid-cols-4 gap-6 text-left">
          <div className="xl:col-span-3 space-y-4">
            <div className="flex justify-between items-center border-b border-divider/10 pb-3 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-primary flex items-center gap-1.5">
                  <CalendarDays className="h-5 w-5" />
                  Supplier Payment Calendar Cycle
                </h3>
              </div>

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
                  className="p-1.5 hover:bg-content3 rounded-lg text-default-500 hover:text-primary transition cursor-pointer border-0 active:scale-95"
                  title="Previous Month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <HeroDropdownSelect
                  items={months.map((m, idx) => ({
                    key: String(idx),
                    label: m,
                  }))}
                  selectedKey={String(calendarMonth)}
                  onSelectionChange={(val) => {
                    setCalendarMonth(Number(val));
                    setSelectedCalendarDay(null);
                  }}
                  size="sm"
                  variant="pill"
                  className="min-w-[120px]"
                />

                <HeroDropdownSelect
                  items={Array.from({ length: 5 }, (_, i) => {
                    const y = new Date().getFullYear() - 2 + i;
                    return { key: String(y), label: String(y) };
                  })}
                  selectedKey={String(calendarYear)}
                  onSelectionChange={(val) => {
                    setCalendarYear(Number(val));
                    setSelectedCalendarDay(null);
                  }}
                  size="sm"
                  variant="pill"
                  className="min-w-[90px]"
                />

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
                  className="p-1.5 hover:bg-content3 rounded-lg text-default-500 hover:text-primary transition cursor-pointer border-0 active:scale-95"
                  title="Next Month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 font-sans">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="p-1.5 text-center text-[10px] font-black text-default-500 uppercase tracking-widest">
                  {d}
                </div>
              ))}

              {Array.from({ length: new Date(calendarYear, calendarMonth, 1).getDay() }).map((_, idx) => (
                <div key={`empty-${idx}`} className="p-2 min-h-[85px] rounded-xl border border-transparent bg-transparent opacity-0" />
              ))}

              {Array.from({ length: daysInActiveMonth }).map((_, i) => {
                const day = i + 1;
                const dayPayables = activePayables[day] || [];
                const hasPayment = dayPayables.length > 0;
                const isSelected = selectedCalendarDay === day;

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
                const isToday =
                  todayObj.getDate() === day &&
                  todayObj.getMonth() === calendarMonth &&
                  todayObj.getFullYear() === calendarYear;

                return (
                  <div
                    key={day}
                    onClick={() => setSelectedCalendarDay(day)}
                    className={`p-2 min-h-[85px] border rounded-xl flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : isToday
                        ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/50"
                        : isFullyPaid
                        ? "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10"
                        : isPartiallyPaid
                        ? "border-primary/30 bg-primary/5 hover:bg-primary/10"
                        : hasPayment
                        ? "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10"
                        : "border-divider/10 bg-content3/20 hover:border-divider/30"
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] font-black leading-none ${isSelected ? "text-primary" : isToday ? "text-amber-500" : "text-default-500"}`}>
                          {day}
                        </span>
                        {isToday && (
                          <span className="text-[7px] bg-amber-500/20 text-amber-500 px-1 py-0.5 rounded font-black uppercase tracking-wide">
                            Today
                          </span>
                        )}
                      </div>
                      {hasMemo && <FileText className="h-3 w-3 text-amber-500" />}
                    </div>

                    {hasPayment && (
                      <div className="text-[9px] font-bold leading-tight mt-1 space-y-1">
                        {isFullyPaid ? (
                          <>
                            <span className="block font-black uppercase text-[7px] bg-emerald-500/15 text-emerald-500 px-1 rounded text-center">
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
                            <span className="block font-black uppercase text-[7px] bg-amber-500/15 text-amber-500 px-1 rounded text-center">
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

          {/* Right Inspector Panel */}
          <div className="bg-background p-4 rounded-2xl border border-divider/35 flex flex-col justify-between min-h-[420px] h-full">
            <div className="space-y-4">
              <div className="border-b border-divider/10 pb-3">
                <h4 className="font-extrabold text-xs text-primary uppercase tracking-widest">
                  Payable Day Inspector
                </h4>
                <p className="text-[10px] text-default-500 mt-1">
                  Review due accounts and process installment disbursements.
                </p>
              </div>

              {selectedCalendarDay ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-primary/10 px-3 py-1.5 rounded-xl">
                    <span className="text-xs font-bold">
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
                        <div key={pIdx} className="bg-content1 p-3 rounded-xl border border-divider/15 space-y-2 text-left">
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-[10px] font-extrabold text-primary truncate max-w-[120px]" title={payVal.poNumber}>
                              {payVal.poNumber}
                            </span>
                            <span className={`text-[8px] font-black px-1.5 py-0.5 uppercase tracking-widest rounded ${
                              isFinished ? "bg-emerald-500/10 text-emerald-500" : totalPaid > 0 ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-500"
                            }`}>
                              {isFinished ? "COMPLETED" : totalPaid > 0 ? "PARTIAL" : payVal.status}
                            </span>
                          </div>

                          <h5 className="text-[11px] font-bold text-foreground leading-tight">
                            {payVal.supplierName}
                          </h5>

                          <div className="bg-content2/15 p-2 rounded-lg border border-divider/10 space-y-1.5 text-[10px]">
                            <div className="flex justify-between text-default-500 text-[9px]">
                              <span>Total Amount:</span>
                              <span className="font-bold text-foreground">₱{payVal.amount.toLocaleString()}</span>
                            </div>
                            {totalPaid > 0 && (
                              <div className="flex justify-between text-emerald-500 text-[9px]">
                                <span>Amount Paid:</span>
                                <span className="font-bold">₱{totalPaid.toLocaleString()}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-[10px] border-t border-dashed border-divider/10 pt-1">
                              <span className="text-default-500 font-bold">Remaining:</span>
                              <span className={`font-black ${isFinished ? "text-emerald-500" : "text-amber-500"}`}>
                                ₱{remaining.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {!isFinished && (
                            <div className="border-t border-divider/10 pt-2 mt-2 space-y-2 text-left text-[11px]">
                              <div className="grid grid-cols-2 gap-1 bg-content2/20 p-0.5 rounded-lg">
                                <button
                                  type="button"
                                  onClick={() => setPartialPaymentMethod("cash")}
                                  className={`py-1 text-[9px] font-black uppercase rounded transition cursor-pointer ${
                                    partialPaymentMethod === "cash" ? "bg-primary/10 text-primary" : "text-default-500"
                                  }`}
                                >
                                  Cash
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPartialPaymentMethod("cheque")}
                                  className={`py-1 text-[9px] font-black uppercase rounded transition cursor-pointer ${
                                    partialPaymentMethod === "cheque" ? "bg-primary/10 text-primary" : "text-default-500"
                                  }`}
                                >
                                  Cheque
                                </button>
                              </div>

                              <div className="space-y-1">
                                <input
                                  type="number"
                                  value={partialPaymentAmount}
                                  onChange={(e) => setPartialPaymentAmount(e.target.value)}
                                  placeholder={`Pay amount (max ${remaining})`}
                                  className="w-full bg-content1 border border-divider rounded p-1.5 text-[10px] outline-none text-foreground focus:border-primary"
                                />
                                {partialPaymentMethod === "cheque" && (
                                  <input
                                    type="text"
                                    value={partialChequeNumber}
                                    onChange={(e) => setPartialChequeNumber(e.target.value)}
                                    placeholder="Cheque Number"
                                    className="w-full bg-content1 border border-divider rounded p-1.5 text-[10px] outline-none text-foreground focus:border-primary"
                                  />
                                )}
                              </div>

                              <div className="flex gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleInstallmentPayment(payVal, Number(partialPaymentAmount), partialPaymentNotes)}
                                  className="flex-1 text-center py-1.5 bg-primary/10 text-primary hover:bg-primary/20 text-[9px] font-black uppercase rounded-lg transition cursor-pointer active:scale-[0.98]"
                                >
                                  Pay Installment
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleInstallmentPayment(payVal, remaining, "Full Settlement")}
                                  className="flex-1 text-center py-1.5 bg-primary text-primary-foreground hover:opacity-90 text-[9px] font-black uppercase rounded-lg transition cursor-pointer active:scale-[0.98]"
                                >
                                  Pay Full
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Daily Memo List */}
                  <div className="border-t border-divider/15 pt-3 mt-4 space-y-2 text-left">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-amber-500" />
                        <span>Daily Memos</span>
                      </span>
                    </div>

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
                      } catch {
                        if (rawMemo.trim() !== "") memoList = [rawMemo];
                      }

                      return (
                        <div className="space-y-2">
                          <div className="max-h-[100px] overflow-y-auto space-y-1 scrollbar-thin">
                            {memoList.map((memo, mIdx) => (
                              <div key={mIdx} className="bg-content1 border border-divider/15 p-2 rounded-xl text-[10.5px] text-foreground flex justify-between items-start gap-1">
                                <span className="break-words flex-1">{memo}</span>
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
                                  className="text-rose-500 text-[10px] cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                            {memoList.length === 0 && (
                              <p className="text-[10px] text-default-500 italic text-center py-2">No memos for this day.</p>
                            )}
                          </div>

                          <div className="flex gap-1.5 pt-1">
                            <input
                              type="text"
                              value={dayMemoInput}
                              onChange={(e) => setDayMemoInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && dayMemoInput.trim()) {
                                  e.preventDefault();
                                  const updatedList = [...memoList, dayMemoInput.trim()];
                                  const updated = { ...dayMemos, [dateKey]: JSON.stringify(updatedList) };
                                  setDayMemos(updated);
                                  setDayMemoInput("");
                                }
                              }}
                              placeholder="New memo..."
                              className="flex-1 bg-content1 border border-divider/25 rounded-xl px-2.5 py-1 text-xs outline-none text-foreground"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (dayMemoInput.trim()) {
                                  const updatedList = [...memoList, dayMemoInput.trim()];
                                  const updated = { ...dayMemos, [dateKey]: JSON.stringify(updatedList) };
                                  setDayMemos(updated);
                                  setDayMemoInput("");
                                }
                              }}
                              className="px-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold cursor-pointer"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 space-y-2">
                  <Info className="h-8 w-8 text-default-400 mx-auto" />
                  <p className="text-xs text-default-500 italic">No Date Selected</p>
                  <p className="text-[9.5px] text-default-500">
                    Click any day in the calendar to inspect due accounts or record memos.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
