import React, { useState } from "react";
import { Building2, DollarSign, PlusCircle, Receipt, Search, Trash2 } from "lucide-react";
import { Expense } from "../../../types/db";
import { formatCurrency } from "../../../utils/formatters";
import { HeroSelect } from "../../common/ui/HeroSelect";
import { HeroInput } from "../../common/ui/HeroInput";
import { HeroTextarea } from "../../common/ui/HeroTextarea";
import { HeroButton } from "../../common/ui/HeroButton";
import { HeroDropdownSelect } from "../../common/ui/HeroDropdown";
import { HeroTable } from "../../common/ui/HeroTable";

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
      <div className="md:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 p-5 rounded-2xl h-fit space-y-4 shadow-elevation-soft text-left">
        <h3 className="font-bold text-sm text-foreground border-b border-divider/20 pb-3 flex items-center gap-2 tracking-tight">
          <PlusCircle className="h-5 w-5 text-primary" />
          <span>Deduct Branch Cash Expense</span>
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <HeroSelect
            label="Branch Location"
            isRequired
            value={expBranchId}
            onValueChange={(val) => setExpBranchId(val)}
            radius="lg"
            items={branches.filter((b) => !b.isDeleted).map((b) => ({
              key: b.id,
              value: b.id,
              label: `${b.name} (${b.id})`,
            }))}
          />

          <HeroSelect
            label="Expense Classification"
            isRequired
            value={expCategory}
            onValueChange={(val) => setExpCategory(val)}
            radius="lg"
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

          {expCategory === "Other / Custom" && (
            <HeroInput
              label="Specify Custom Classification"
              required
              value={customCategory}
              onValueChange={(val) => setCustomCategory(val)}
              placeholder="Custom classification"
              radius="lg"
              variant="flat"
            />
          )}

          <HeroInput
            label="Amount Disbursed (PHP)"
            type="number"
            required
            value={expAmount}
            onValueChange={(val) => setExpAmount(val)}
            placeholder="500.00"
            radius="lg"
            variant="flat"
          />

          <HeroTextarea
            label="Detailed Notes / Vendor"
            required
            rows={3}
            value={expNotes}
            onValueChange={(val) => setExpNotes(val)}
            placeholder="Bought extra heavy mop for the main hall tiles..."
            radius="lg"
            variant="flat"
          />

          <HeroButton
            type="submit"
            color="primary"
            variant="solid"
            size="md"
            radius="full"
            startIcon={<DollarSign className="h-4 w-4" />}
            className="w-full font-bold shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
          >
            Confirm Petty Cash Payout
          </HeroButton>
        </form>
      </div>

      <div className="md:col-span-2 space-y-4 text-left">
        <div className="flex bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 p-2.5 rounded-2xl items-center gap-2 shadow-2xs">
          <Search className="h-4 w-4 text-default-400 pl-1 shrink-0" />
          <input
            value={expenseSearch}
            onChange={(e) => setExpenseSearch(e.target.value)}
            placeholder="Filter disbursements..."
            className="w-full bg-transparent border-0 outline-none p-1 text-foreground font-sans text-xs"
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

        <HeroTable isStriped className="min-w-full">
          <HeroTable.Header>
            <HeroTable.Column>Track Info</HeroTable.Column>
            <HeroTable.Column>Category</HeroTable.Column>
            <HeroTable.Column>Officer</HeroTable.Column>
            <HeroTable.Column>Branch ID</HeroTable.Column>
            <HeroTable.Column align="end">Amount</HeroTable.Column>
            <HeroTable.Column align="center">Actions</HeroTable.Column>
          </HeroTable.Header>
          <HeroTable.Body>
            {filteredExpenses.length === 0 ? (
              <HeroTable.Row isHoverable={false}>
                <HeroTable.Cell colSpan={6} className="p-8 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2.5 py-6">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-2xs border border-primary/15">
                      <Receipt className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-sm text-foreground">
                        {expenseSearch ? "No Matching Expenses Found" : "No Operational Expenses Logged"}
                      </p>
                      <p className="text-xs text-default-500 max-w-sm mx-auto leading-relaxed">
                        {expenseSearch
                          ? `No disbursement entry matches "${expenseSearch}". Try adjusting your filter term.`
                          : "No petty cash or store operating expenses logged yet. Use the disbursement form on the left to record new expenses."}
                      </p>
                    </div>
                    {expenseSearch && (
                      <HeroButton
                        type="button"
                        variant="flat"
                        size="sm"
                        radius="full"
                        onClick={() => setExpenseSearch("")}
                      >
                        Clear Expense Filter
                      </HeroButton>
                    )}
                  </div>
                </HeroTable.Cell>
              </HeroTable.Row>
            ) : (
              filteredExpenses.map((ex) => (
                <HeroTable.Row key={ex.id}>
                  <HeroTable.Cell>
                    <div className="font-semibold text-foreground">{ex.notes}</div>
                    <div className="text-[10px] text-default-500 mt-0.5">
                      {ex.dateTime && !isNaN(new Date(ex.dateTime).getTime())
                        ? new Date(ex.dateTime).toLocaleString("en-US")
                        : "N/A"}
                    </div>
                  </HeroTable.Cell>
                  <HeroTable.Cell>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-foreground border border-zinc-200/50 dark:border-white/5">
                      {ex.category}
                    </span>
                  </HeroTable.Cell>
                  <HeroTable.Cell className="text-default-500 font-bold">{ex.recordedBy}</HeroTable.Cell>
                  <HeroTable.Cell className="text-default-500">{ex.branchId}</HeroTable.Cell>
                  <HeroTable.Cell align="end" className="text-rose-500 font-bold font-mono">
                    -{formatCurrency(ex.amount)}
                  </HeroTable.Cell>
                  <HeroTable.Cell align="center">
                    <button
                      type="button"
                      onClick={() => onDeleteExpense(ex.id)}
                      className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-colors cursor-pointer"
                      title="Delete Expense"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </HeroTable.Cell>
                </HeroTable.Row>
              ))
            )}
          </HeroTable.Body>
        </HeroTable>
      </div>
    </div>
  );
};
