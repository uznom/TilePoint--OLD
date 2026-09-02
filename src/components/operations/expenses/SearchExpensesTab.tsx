import React, { useState } from "react";
import { Download, Receipt, Trash2 } from "lucide-react";
import { Expense } from "../../../types/db";
import { formatCurrency } from "../../../utils/formatters";
import { HeroButton, HeroDropdownSelect, HeroDatePicker, HeroTable } from "../../common/ui";
import { saveFileToBackup } from "../../../lib/fileBackupHelper";

export interface SearchExpensesTabProps {
  expenses: Expense[];
  onDeleteExpense: (id: string) => void;
}

export const SearchExpensesTab: React.FC<SearchExpensesTabProps> = ({
  expenses,
  onDeleteExpense,
}) => {
  const [dateFilter, setDateFilter] = useState("");
  const [expenseSearchQuery, setExpenseSearchQuery] = useState("");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("");

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
      const matchNotes = (ex.notes || "").toLowerCase().includes(q);
      const matchCategory = (ex.category || "").toLowerCase().includes(q);
      const matchUser = ex.recordedBy ? ex.recordedBy.toLowerCase().includes(q) : false;
      if (!matchId && !matchNotes && !matchCategory && !matchUser) return false;
    }
    return true;
  });

  const totalOutflow = filteredExpenses.reduce((sum, ex) => sum + ex.amount, 0);

  const handleExportCSV = () => {
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
        a.setAttribute("href", url);
        a.setAttribute("download", filename);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
  };

  const categories = Array.from(new Set(expenses.filter(ex => !ex.isDeleted).map(ex => ex.category)));

  return (
    <div className="space-y-4 font-sans text-xs text-left">
      <div className="flex flex-col md:flex-row bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 p-4 rounded-2xl items-stretch md:items-center justify-between gap-4 shadow-elevation-soft">
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-48">
            <HeroDatePicker
              value={dateFilter}
              onChange={(dateStr) => setDateFilter(dateStr)}
              size="sm"
              radius="full"
              placeholder="Filter Date"
            />
          </div>

          <div className="flex items-center gap-2">
            <HeroDropdownSelect
              items={[
                { key: '', label: 'All Categories' },
                ...categories.map(cat => ({
                  key: cat,
                  label: cat,
                })),
              ]}
              selectedKey={expenseCategoryFilter}
              onSelectionChange={(val) => setExpenseCategoryFilter(String(val))}
              size="sm"
              variant="pill"
              className="min-w-[160px]"
            />
            {expenseCategoryFilter && (
              <button
                type="button"
                onClick={() => setExpenseCategoryFilter("")}
                className="text-[11px] text-rose-500 hover:underline font-bold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-default-500">Search:</span>
            <input
              type="text"
              placeholder="Search detail, user, ID..."
              value={expenseSearchQuery}
              onChange={(e) => setExpenseSearchQuery(e.target.value)}
              className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-white/5 rounded-xl px-2.5 py-1 outline-none text-foreground w-44 font-sans text-xs"
            />
            {expenseSearchQuery && (
              <button
                type="button"
                onClick={() => setExpenseSearchQuery("")}
                className="text-[11px] text-rose-500 hover:underline font-bold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <HeroButton
          type="button"
          variant="flat"
          color="primary"
          size="sm"
          radius="full"
          startIcon={<Download className="h-4 w-4" />}
          onClick={handleExportCSV}
          className="font-bold"
        >
          Export Filtered CSV
        </HeroButton>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 rounded-2xl overflow-hidden shadow-elevation-soft">
        <div className="p-4 bg-zinc-100/80 dark:bg-zinc-800/80 border-b border-divider/20 flex justify-between items-center">
          <div>
            <h4 className="font-bold text-sm text-foreground tracking-tight">Disbursement Records</h4>
            <span className="text-[11px] text-default-500 font-medium">{filteredExpenses.length} transaction entries found</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-default-500 uppercase font-bold block tracking-wider">Total Outflow</span>
            <span className="text-sm font-bold text-rose-500 font-mono">-{formatCurrency(totalOutflow)}</span>
          </div>
        </div>

        <HeroTable isStriped className="min-w-full">
          <HeroTable.Header>
            <HeroTable.Column>Track Info / Date</HeroTable.Column>
            <HeroTable.Column>Category</HeroTable.Column>
            <HeroTable.Column>Disbursed By</HeroTable.Column>
            <HeroTable.Column>Branch</HeroTable.Column>
            <HeroTable.Column align="end">Amount</HeroTable.Column>
            <HeroTable.Column align="center">Action</HeroTable.Column>
          </HeroTable.Header>
          <HeroTable.Body>
            {filteredExpenses.length === 0 ? (
              <HeroTable.Row isHoverable={false}>
                <HeroTable.Cell colSpan={6} className="p-8 text-center text-default-500">
                  <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No matching disbursements found for current search filters.
                </HeroTable.Cell>
              </HeroTable.Row>
            ) : (
              filteredExpenses.map((ex) => (
                <HeroTable.Row key={ex.id}>
                  <HeroTable.Cell>
                    <div className="font-semibold text-foreground">{ex.notes}</div>
                    <div className="text-[10px] text-default-400 mt-0.5">
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
                  <HeroTable.Cell className="text-default-500 font-bold">{ex.recordedBy || "System"}</HeroTable.Cell>
                  <HeroTable.Cell className="text-default-500">{ex.branchId}</HeroTable.Cell>
                  <HeroTable.Cell align="end" className="text-rose-500 font-bold font-mono">
                    -{formatCurrency(ex.amount)}
                  </HeroTable.Cell>
                  <HeroTable.Cell align="center">
                    <button
                      type="button"
                      onClick={() => onDeleteExpense(ex.id)}
                      className="p-1.5 hover:bg-rose-500/10 text-default-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
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
