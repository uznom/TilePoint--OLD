import React, { useState } from "react";
import { Building2, DollarSign, PlusCircle, Receipt, Search, Trash2 } from "lucide-react";
import { Expense } from "../../../types/db";
import { formatCurrency } from "../../../utils/formatters";
import { HeroSelect } from "../../common/ui/HeroSelect";
import { HeroDropdownSelect } from "../../common/ui/HeroDropdown";

export interface AddExpenseTabProps {
  branches: { id: string; name: string; isDeleted?: boolean }[];
  expenses: Expense[];
  onAddExpense: (expense: {
    branchId: string;
    category: string;
    amount: number;
    notes: string;
  }) => void;
  onDeleteExpense: (id: string) => void;
  expenseBranchFilter: string;
  setExpenseBranchFilter: (val: string) => void;
  userBranchId?: string;
}

export const AddExpenseTab: React.FC<AddExpenseTabProps> = ({
  branches,
  expenses,
  onAddExpense,
  onDeleteExpense,
  expenseBranchFilter,
  setExpenseBranchFilter,
  userBranchId = "B1",
}) => {
  const [expBranchId, setExpBranchId] = useState<string>(userBranchId);
  const [expCategory, setExpCategory] = useState("Floor Supplies");
  const [customCategory, setCustomCategory] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expNotes, setExpNotes] = useState("");
  const [expenseSearch, setExpenseSearch] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(expAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid disbursement amount.");
      return;
    }
    const finalCategory = expCategory === "Other / Custom" ? (customCategory.trim() || "Other") : expCategory;
    onAddExpense({
      branchId: expBranchId || userBranchId,
      category: finalCategory,
      amount: amountNum,
      notes: expNotes.trim() || "No specific details provided",
    });

    setExpAmount("");
    setExpNotes("");
    setCustomCategory("");
  };

  const filteredExpenses = expenses.filter(
    (ex) =>
      !ex.isDeleted &&
      (ex.notes.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        ex.category.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        (ex.recordedBy || "").toLowerCase().includes(expenseSearch.toLowerCase()) ||
        (ex.branchId || "").toLowerCase().includes(expenseSearch.toLowerCase()))
  );

  return (
    <div className="grid md:grid-cols-3 gap-6 font-sans text-xs">
      <div className="md:col-span-1 bg-content1 border border-divider/15 p-5 rounded-2xl h-fit space-y-4">
        <h3 className="font-bold text-sm text-primary border-b border-divider/10 pb-3 flex items-center gap-1.5">
          <PlusCircle className="h-5 w-5" />
          Deduct Branch Cash Expense
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <HeroSelect
              label="Branch Location"
              isRequired
              value={expBranchId}
              onValueChange={(val) => setExpBranchId(val)}
              radius="md"
              items={branches.filter((b) => !b.isDeleted).map((b) => ({
                key: b.id,
                value: b.id,
                label: `${b.name} (${b.id})`,
              }))}
            />
          </div>

          <div className="space-y-1">
            <HeroSelect
              label="Expense Classification"
              isRequired
              value={expCategory}
              onValueChange={(val) => setExpCategory(val)}
              radius="md"
              items={[
                { key: 'Floor Supplies', label: 'Floor Supplies' },
                { key: 'Delivery Gas', label: 'Delivery Gas' },
                { key: 'Snacks / Snacks Meetings', label: 'Snacks / Snacks Meetings' },
                { key: 'Office Stationery', label: 'Office Stationery' },
                { key: 'Utility Repairs', label: 'Utility Repairs' },
                { key: 'Showroom Lightings', label: 'Showroom Lightings' },
                { key: 'Other / Custom', label: 'Other / Custom (Specify Below)' },
              ]}
            />
          </div>

          {expCategory === "Other / Custom" && (
            <div className="space-y-1">
              <label className="font-bold text-default-500">
                Specify Custom Classification *
              </label>
              <input
                required
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                type="text"
                placeholder="Custom classification"
                className="w-full bg-content3 border border-divider rounded-lg p-2.5 outline-none focus:border-primary text-foreground"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="font-bold text-default-500">
              Amount Disbursed (PHP) *
            </label>
            <input
              required
              value={expAmount}
              onChange={(e) => setExpAmount(e.target.value)}
              type="number"
              placeholder="500"
              className="w-full bg-content3 border border-divider rounded-lg p-2.5 outline-none focus:border-primary text-foreground font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-default-500">
              Detailed Notes / Vendor *
            </label>
            <textarea
              rows={3}
              value={expNotes}
              onChange={(e) => setExpNotes(e.target.value)}
              placeholder="Bought extra heavy mop for the main hall tiles..."
              className="w-full bg-content3 border border-divider rounded-lg p-2.5 outline-none focus:border-primary text-foreground"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-bold transition hover:opacity-90 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <DollarSign className="h-4 w-4" />
            Confirm Petty Cash Payout
          </button>
        </form>
      </div>

      <div className="md:col-span-2 space-y-4">
        <div className="flex bg-content1 border border-divider/15 p-2 rounded-xl items-center gap-2">
          <Search className="h-4 w-4 text-default-500 pl-1 shrink-0" />
          <input
            value={expenseSearch}
            onChange={(e) => setExpenseSearch(e.target.value)}
            placeholder="Filter disbursements..."
            className="w-full bg-transparent border-0 outline-none p-1.5 text-foreground"
          />
          <div className="flex items-center gap-1 shrink-0 border-l border-divider/20 pl-2">
            <HeroDropdownSelect
              startIcon={<Building2 className="h-3.5 w-3.5 text-primary" />}
              items={[
                { key: 'All', label: 'All Branches' },
                ...branches.filter((b) => !b.isDeleted).map((b) => ({
                  key: b.id,
                  label: b.name,
                })),
              ]}
              selectedKey={expenseBranchFilter || 'All'}
              onSelectionChange={(val) => setExpenseBranchFilter(String(val))}
              size="sm"
              variant="pill"
              className="min-w-[160px]"
            />
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
              {filteredExpenses.length === 0 ? (
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
                          className="mt-1 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg transition-colors cursor-pointer border-0 active:scale-[0.98]"
                        >
                          Clear Expense Filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((ex) => (
                  <tr
                    key={ex.id}
                    className="border-b border-divider/10 hover:bg-primary/5 transition-all active:scale-[0.98]"
                  >
                    <td className="p-3 font-semibold text-foreground">
                      <div>{ex.notes}</div>
                      <div className="text-[10px] text-default-500 mt-0.5">
                        {ex.dateTime && !isNaN(new Date(ex.dateTime).getTime())
                          ? new Date(ex.dateTime).toLocaleString("en-US")
                          : "N/A"}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-content2 text-foreground">
                        {ex.category}
                      </span>
                    </td>
                    <td className="p-3 text-default-500 font-bold">{ex.recordedBy}</td>
                    <td className="p-3 text-default-500">{ex.branchId}</td>
                    <td className="p-3 text-right text-rose-500 font-bold">
                      -{formatCurrency(ex.amount)}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => onDeleteExpense(ex.id)}
                        className="p-1 hover:bg-red-500/10 text-red-500 rounded transition border-0 cursor-pointer bg-transparent active:scale-95"
                        title="Delete Expense"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
