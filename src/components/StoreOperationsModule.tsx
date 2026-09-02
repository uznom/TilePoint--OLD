/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Printer } from "lucide-react";
import { useDb } from "../context/DbContext";
import { Member, Expense, ProductReturn, CustomCorporateBill, UserRole } from "../types/db";
import { ConfirmationModal } from "./ConfirmationModal";
import { useReceiptFontSize } from "./ReceiptFontSizeControl";
import { debouncedSetItem } from "../utils/debouncedStorage";
import { formatCurrency } from "../utils/formatters";
import { HeroModal } from "./common/ui/HeroModal";
import { HeroButton } from "./common/ui/HeroButton";

// Extracted Sub-Components
import { MembersDirectoryTab } from "./operations/members/MembersDirectoryTab";
import { AccountReceivablesTab } from "./operations/members/AccountReceivablesTab";
import { LoyaltyPointsTab } from "./operations/members/LoyaltyPointsTab";
import { AddExpenseTab } from "./operations/expenses/AddExpenseTab";
import { SearchExpensesTab } from "./operations/expenses/SearchExpensesTab";
import { ReturnedProductsTab } from "./operations/adjustments/ReturnedProductsTab";
import { SuppliersCreditsTab } from "./operations/suppliers/SuppliersCreditsTab";
import { SuppliersCalendarTab } from "./operations/suppliers/SuppliersCalendarTab";
import { BirReportsDesk } from "./operations/bir/BirReportsDesk";

export interface StoreOperationsModuleProps {
  activeSubTab: string;
  darkMode?: boolean;
  _darkMode?: boolean;
  onNavigate: (tabId: string) => void;
}

export type AtposExtraModulesProps = StoreOperationsModuleProps;

const LOCAL_STORAGE_MEMBERS = "atpos_v2_members_list";

export default function StoreOperationsModule({
  activeSubTab,
  _darkMode,
  onNavigate: _onNavigate,
}: StoreOperationsModuleProps) {
  const db = useDb();

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
    currentUser,
    branches,
    suppliers,
    purchaseOrders,
    poItems,
    users,
    addAuditLog,
    updatePOStatus,
    updateLoyaltyConfig,
    loyaltyConfig,
  } = db;

  const [confirmZReadingModal, setConfirmZReadingModal] = useState(false);
  const [printReceiptData, setPrintReceiptData] = useState<any>(null);
  const [memberBranchFilter, setMemberBranchFilter] = useState("All");
  const [expenseBranchFilter, setExpenseBranchFilter] = useState("All");

  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const userBranchId = currentUser?.branchAssignmentId || "B1";

  // Filtered lists based on user role and branch filter
  const members = useMemo(() => {
    return rawMembers.filter((m) => {
      const memberBranch = m.branchId || "B1";
      if (memberBranchFilter !== "All" && memberBranch !== memberBranchFilter) {
        return false;
      }
      if (isAdmin) return true;
      return memberBranch === userBranchId;
    });
  }, [rawMembers, isAdmin, userBranchId, memberBranchFilter]);

  const expenses = useMemo(() => {
    return rawExpenses.filter((ex) => {
      const expenseBranch = ex.branchId || "B1";
      if (expenseBranchFilter !== "All" && expenseBranch !== expenseBranchFilter) {
        return false;
      }
      if (isAdmin) return true;
      return expenseBranch === userBranchId;
    });
  }, [rawExpenses, isAdmin, userBranchId, expenseBranchFilter]);

  const branchOptions = useMemo(() => [
    { key: "All", label: "All Branches" },
    ...branches.filter((b) => !b.isDeleted).map((b) => ({
      key: b.id,
      label: b.name,
    })),
  ], [branches]);

  // Operations handlers
  const handleAddMember = (newMemData: Omit<Member, "id">) => {
    const newMember: Member = {
      id: "M" + (rawMembers.length + 1) + "-" + Math.floor(Math.random() * 900 + 100),
      ...newMemData,
      branchId: userBranchId,
    };
    const updated = [...rawMembers, newMember];
    setMembers(updated);
    debouncedSetItem(LOCAL_STORAGE_MEMBERS, updated);
    addAuditLog(
      "MEMBER_CREATE",
      `Registered new member "${newMember.fullName}" with credit limit ₱${newMember.creditLimit.toLocaleString()}`,
      "Operations",
      newMember.id,
      JSON.stringify(newMember)
    );
  };

  const handleDeleteMember = (id: string) => {
    if (!confirm("Are you sure you want to remove this member profile?")) return;
    const updated = rawMembers.filter((m) => m.id !== id);
    setMembers(updated);
    debouncedSetItem(LOCAL_STORAGE_MEMBERS, updated);
    addAuditLog("MEMBER_DELETE", `Deleted member ID ${id}`, "Operations", id);
  };

  const handleProcessPayment = (memberId: string, amount: number) => {
    const target = rawMembers.find((m) => m.id === memberId);
    if (!target) return;
    const prevBalance = Number(target.outstandingBalance ?? 0);
    const newBalance = Math.max(0, prevBalance - amount);

    const updated = rawMembers.map((m) => {
      if (m.id === memberId) {
        return {
          ...m,
          outstandingBalance: newBalance,
        };
      }
      return m;
    });

    setMembers(updated);
    debouncedSetItem(LOCAL_STORAGE_MEMBERS, updated);

    setPrintReceiptData({
      title: "OFFICIAL ACCOUNT RECEIVABLE PAYMENT SLIP",
      receiptNo: "AR-" + Math.floor(Math.random() * 89999 + 10000),
      customer: target.fullName,
      branchId: userBranchId,
      date: new Date().toLocaleString(),
      prevBalance,
      paid: amount,
      newBalance,
      pointsGained: Math.floor(amount / (loyaltyConfig?.spendPerPoint || 500)),
    });

    addAuditLog(
      "MEMBER_PAYMENT",
      `Settled ₱${amount.toLocaleString()} on credit for ${target.fullName}. Remaining balance: ₱${newBalance.toLocaleString()}`,
      "Operations",
      memberId
    );
  };

  const handleAdjustPoints = (memberId: string, deltaPoints: number, reason: string) => {
    const updated = rawMembers.map((m) => {
      if (m.id === memberId) {
        const newPts = Math.max(0, (m.points || 0) + deltaPoints);
        return { ...m, points: newPts };
      }
      return m;
    });
    setMembers(updated);
    debouncedSetItem(LOCAL_STORAGE_MEMBERS, updated);
    addAuditLog(
      "LOYALTY_ADJUST",
      `Adjusted points by ${deltaPoints > 0 ? "+" : ""}${deltaPoints} for member ID ${memberId}. Reason: ${reason}`,
      "Operations",
      memberId
    );
  };

  const handleAddExpense = (expenseData: {
    branchId: string;
    category: string;
    amount: number;
    notes: string;
  }) => {
    const newExpense: Expense = {
      id: "EXP-" + Date.now().toString().slice(-6),
      ...expenseData,
      recordedBy: currentUser?.fullName || "System Officer",
      dateTime: new Date().toISOString(),
    };
    const updated = [newExpense, ...rawExpenses];
    setExpenses(updated);
    addAuditLog(
      "EXPENSE_ADD",
      `Deducted expense ₱${newExpense.amount.toLocaleString()} for "${newExpense.category}" at branch ${newExpense.branchId}. Notes: ${newExpense.notes}`,
      "Operations",
      newExpense.id,
      JSON.stringify(newExpense)
    );
  };

  const handleDeleteExpense = (id: string) => {
    if (!confirm("Are you sure you want to delete this expense record?")) return;
    const updated = rawExpenses.map((ex) => (ex.id === id ? { ...ex, isDeleted: true } : ex));
    setExpenses(updated);
    addAuditLog("EXPENSE_DELETE", `Deleted expense entry ID ${id}`, "Operations", id);
  };

  const handleAddReturn = (returnData: {
    saleId: string;
    productName: string;
    quantity: number;
    amountRefunded: number;
    damageRestockFee: number;
    status: "Restocked" | "Defective/Damaged";
  }) => {
    const newReturn: ProductReturn = {
      id: "RET-" + Date.now().toString().slice(-6),
      saleId: returnData.saleId,
      productName: returnData.productName,
      quantityReturned: returnData.quantity,
      amountRefunded: returnData.amountRefunded,
      damageRestockFee: returnData.damageRestockFee,
      status: returnData.status,
      dateTime: new Date().toISOString(),
    };
    const updated = [newReturn, ...productReturns];
    setProductReturns(updated);
    addAuditLog(
      "RETURN_ADD",
      `Processed product return for ${newReturn.productName} (${newReturn.quantityReturned} qty). Refunded: ₱${newReturn.amountRefunded.toLocaleString()}`,
      "Operations",
      newReturn.id,
      JSON.stringify(newReturn)
    );
  };

  const handleDeleteReturn = (id: string) => {
    if (!confirm("Are you sure you want to delete this return entry?")) return;
    const updated = productReturns.map((rt) => (rt.id === id ? { ...rt, isDeleted: true } : rt));
    setProductReturns(updated);
    addAuditLog("RETURN_DELETE", `Deleted product return ID ${id}`, "Operations", id);
  };

  const handleAddCustomBill = (billData: {
    title: string;
    totalAmount: number;
    frequency: "WEEKLY" | "MONTHLY" | "SEMI_QUARTERLY" | "QUARTERLY" | "YEARLY";
    nextDueDate: string;
  }) => {
    const newBill: CustomCorporateBill = {
      id: "BILL-" + Date.now().toString().slice(-6),
      ...billData,
      remainingBalance: billData.totalAmount,
      status: "Active",
      createdAt: new Date().toISOString(),
    };
    const updated = [newBill, ...customBills];
    setCustomBills(updated);
    addAuditLog(
      "CUSTOM_BILL_ADD",
      `Scheduled corporate bill "${newBill.title}" (₱${newBill.totalAmount.toLocaleString()}, ${newBill.frequency})`,
      "Operations",
      newBill.id,
      JSON.stringify(newBill)
    );
  };

  const { fontClass: receiptFontClass } = useReceiptFontSize();

  const activeSales = sales.filter((s) => {
    if (s.isDeleted) return false;
    if (!isAdmin && s.branchId !== userBranchId) return false;
    return true;
  });

  const totalSalesFromDay = activeSales.reduce(
    (acc, s) => acc + (Number(s.grandTotal) || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Dynamic Module Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 rounded-2xl bg-content1 border border-divider/20 shadow-xs">
        <div>
          <h2 className="text-xl font-bold font-sans text-foreground capitalize leading-none">
            {activeSubTab.replace(/-/g, " ")}
          </h2>
          <p className="text-xs text-default-500 mt-1 font-sans">
            Store enterprise operations, client accounts, disbursements & BIR tax compliance.
          </p>
        </div>

        <span className="self-start md:self-auto px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/25">
          {(() => {
            const currentBranch = branches.find((b) => b.id === userBranchId);
            if (currentBranch) return currentBranch.name.toUpperCase();
            return `BRANCH ${userBranchId}`;
          })()}
        </span>
      </div>

      {/* Render Subtab View */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          {activeSubTab === "members-manage" && (
            <MembersDirectoryTab
              members={members}
              onAddMember={handleAddMember}
              onDeleteMember={handleDeleteMember}
              memberBranchFilter={memberBranchFilter}
              setMemberBranchFilter={setMemberBranchFilter}
              branchOptions={branchOptions}
            />
          )}

          {activeSubTab === "members-receivables" && (
            <AccountReceivablesTab
              members={members}
              onProcessPayment={handleProcessPayment}
            />
          )}

          {activeSubTab === "members-loyalty" && (
            <LoyaltyPointsTab
              members={members}
              loyaltyConfig={loyaltyConfig}
              updateLoyaltyConfig={updateLoyaltyConfig}
              currentUserRole={currentUser?.role}
              onAdjustPoints={handleAdjustPoints}
            />
          )}

          {activeSubTab === "expenses-add" && (
            <AddExpenseTab
              branches={branches}
              expenses={expenses}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
              expenseBranchFilter={expenseBranchFilter}
              setExpenseBranchFilter={setExpenseBranchFilter}
              userBranchId={userBranchId}
            />
          )}

          {activeSubTab === "expenses-search" && (
            <SearchExpensesTab
              expenses={expenses}
              onDeleteExpense={handleDeleteExpense}
            />
          )}

          {activeSubTab === "adjustments-return" && (
            <ReturnedProductsTab
              productReturns={productReturns}
              onAddReturn={handleAddReturn}
              onDeleteReturn={handleDeleteReturn}
            />
          )}

          {activeSubTab === "suppliers-credits" && (
            <SuppliersCreditsTab
              suppliers={suppliers}
              purchaseOrders={purchaseOrders}
              poItems={poItems}
            />
          )}

          {activeSubTab === "suppliers-calendar" && (
            <SuppliersCalendarTab
              currentUser={currentUser}
              purchaseOrders={purchaseOrders}
              poItems={poItems}
              suppliers={suppliers}
              customBills={customBills}
              saveCustomBills={(bills) => setCustomBills(bills)}
              dayMemos={dayMemos}
              setDayMemos={setDayMemos}
              calendarNotes={calendarNotes}
              setCalendarNotes={setCalendarNotes}
              users={users}
              addAuditLog={(action, desc, table, id, payload) => addAuditLog(action, desc, table, id, payload)}
              updatePOStatus={updatePOStatus}
              onAddCustomBill={handleAddCustomBill}
            />
          )}

          {activeSubTab.startsWith("bir-") && (
            <BirReportsDesk
              activeSubTab={activeSubTab}
              sales={sales}
              currentUser={currentUser}
              branches={branches}
              onPrintSlip={(slip) => setPrintReceiptData(slip)}
              onRequestZReading={() => setConfirmZReadingModal(true)}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Slip / Receipt Print Modal */}
      {printReceiptData && (
        <HeroModal
          isOpen={Boolean(printReceiptData)}
          onClose={() => setPrintReceiptData(null)}
          size="sm"
        >
          <div className={`p-5 sm:p-6 space-y-4 font-sans text-xs text-foreground text-left bir-receipt-container ${receiptFontClass}`}>
            <div className="text-center pb-3 border-b-2 border-dashed border-divider/40">
              <h3 className="font-extrabold text-sm tracking-wide">
                {branches.find((b) => b.id === printReceiptData.branchId)?.name || localStorage.getItem("tilepoint_company_name_v1") || branches[0]?.name || "STORE RECEIPT"}
              </h3>
              <p className="text-[10px]">BRANCH ID: {printReceiptData.branchId || branches[0]?.branchCode || branches[0]?.id || "MAIN"}</p>
              <p className="text-[9px] text-default-500">
                {branches.find((b) => b.id === printReceiptData.branchId)?.address || branches[0]?.address || "Store Address"}
              </p>
              <p className="text-[9px] text-default-500">
                Contact: 0000 • TIN 000-111-222
              </p>
              <p className="text-[11px] font-bold mt-2 uppercase text-primary">
                {printReceiptData.title}
              </p>
            </div>

            <div className="py-3 space-y-1.5 border-b-2 border-dashed border-divider/40 text-[11px]">
              <div className="flex justify-between">
                <span className="text-default-500">Receipt No:</span>
                <span className="font-bold text-foreground">{printReceiptData.receiptNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500">Date Tracked:</span>
                <span>{printReceiptData.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500">Client Name:</span>
                <span className="font-bold text-foreground">{printReceiptData.customer}</span>
              </div>
              <div className="h-px bg-divider/30 my-2" />
              {printReceiptData.prevBalance !== undefined && (
                <div className="flex justify-between">
                  <span className="text-default-500">Previous A/R Bal:</span>
                  <span>{formatCurrency(printReceiptData.prevBalance)}</span>
                </div>
              )}
              <div className="flex justify-between text-emerald-600 font-extrabold">
                <span>Pymt Tendered:</span>
                <span>{formatCurrency(printReceiptData.paid)}</span>
              </div>
              {printReceiptData.newBalance !== undefined && (
                <div className="flex justify-between font-bold border-t border-divider/30 pt-1">
                  <span>New Balance Due:</span>
                  <span>{formatCurrency(printReceiptData.newBalance)}</span>
                </div>
              )}
            </div>

            <div className="text-center pt-2 space-y-3">
              {printReceiptData.pointsGained > 0 && (
                <div className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 p-2 rounded-xl text-[10px] font-bold border border-emerald-500/20">
                  Loyalty points accredited: +{printReceiptData.pointsGained} pts
                </div>
              )}
              <p className="text-[9px] text-default-500">
                BIR Permitted System - Official Receipt copy.
              </p>

              <div className="flex gap-2 bir-report-no-print pt-1">
                <HeroButton
                  type="button"
                  variant="flat"
                  size="sm"
                  radius="full"
                  startIcon={<Printer className="h-3.5 w-3.5" />}
                  onClick={() => window.print()}
                  className="flex-1 font-bold"
                >
                  Print
                </HeroButton>
                <HeroButton
                  type="button"
                  color="primary"
                  variant="solid"
                  size="sm"
                  radius="full"
                  onClick={() => setPrintReceiptData(null)}
                  className="flex-1 font-bold shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
                >
                  Close
                </HeroButton>
              </div>
            </div>
          </div>
        </HeroModal>
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
            customer: (localStorage.getItem('tilepoint_company_name_v1') || branches[0]?.name || "MAIN HQ").toUpperCase(),
            date: new Date().toLocaleString(),
            prevBalance: Math.max(0, sales.reduce((acc, s) => acc + (!s.isDeleted ? Number(s.grandTotal) || 0 : 0), 0) - Number(totalSalesFromDay || 0)),
            paid: totalSalesFromDay,
            newBalance: sales.reduce((acc, s) => acc + (!s.isDeleted ? Number(s.grandTotal) || 0 : 0), 0),
            pointsGained: 0,
          });
          setConfirmZReadingModal(false);
        }}
        onCancel={() => setConfirmZReadingModal(false)}
      />
    </div>
  );
}
