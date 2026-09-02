import React, { useState } from "react";
import { CheckCircle2, CreditCard, Info } from "lucide-react";
import { Member } from "../../../types/db";
import { formatCurrency } from "../../../utils/formatters";

export interface AccountReceivablesTabProps {
  members: Member[];
  onProcessPayment: (memberId: string, amount: number) => void;
}

export const AccountReceivablesTab: React.FC<AccountReceivablesTabProps> = ({
  members,
  onProcessPayment,
}) => {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  const getBalance = (m: any) => Number(m.outstandingBalance ?? m.balance ?? 0);
  const getLimit = (m: any) => Number(m.creditLimit ?? 0);

  const receivableMembers = members.filter((m) => getBalance(m) > 0);

  const handlePayBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    const amountNum = Number(paymentAmount);
    const balance = getBalance(selectedMember);
    if (isNaN(amountNum) || amountNum <= 0 || amountNum > balance) {
      alert("Invalid payment amount.");
      return;
    }
    onProcessPayment(selectedMember.id, amountNum);
    setPaymentAmount("");
    setSelectedMember(null);
  };

  const totalAR = members.reduce((acc, m) => acc + getBalance(m), 0);
  const nearLimitCount = members.filter((m) => getBalance(m) > getLimit(m) * 0.8).length;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-content1 border border-divider/15 p-5 rounded-2xl space-y-4">
        <h3 className="font-bold text-sm text-primary">
          Settle Customer Account Ledger
        </h3>

        <div className="space-y-2 font-sans text-xs">
          <label className="font-bold text-default-500">
            Select Account Client *
          </label>
          <div className="space-y-1 max-h-48 overflow-y-auto border border-divider rounded-lg divide-y divide-divider/15">
            {receivableMembers.length === 0 ? (
              <div className="p-6 text-center text-xs space-y-2 bg-content1/50 rounded-lg">
                <CheckCircle2 className="h-7 w-7 text-emerald-500 mx-auto opacity-90" />
                <p className="font-extrabold text-foreground">All Accounts Fully Settled</p>
                <p className="text-[11px] text-default-500 max-w-xs mx-auto leading-relaxed">
                  There are currently no registered client accounts with outstanding credit balances.
                </p>
              </div>
            ) : (
              receivableMembers.map((m) => {
                const bal = getBalance(m);
                const limit = getLimit(m);
                return (
                  <button
                    key={m.id}
                    type="button"
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
                        Limit: {formatCurrency(limit)}
                      </span>
                    </div>
                    <span className="text-rose-500 font-bold">
                      {formatCurrency(bal)}
                    </span>
                  </button>
                );
              })
            )}
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
                  {formatCurrency(getBalance(selectedMember))}
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
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Amount"
                className="w-full bg-content3 border border-divider rounded-lg p-2.5 outline-none focus:border-primary"
                max={getBalance(selectedMember)}
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
          <div className="p-4 bg-content2 dark:bg-content2/40 rounded-xl border border-divider/10">
            <span className="text-[10px] font-bold text-default-500 block uppercase">
              Total Outstanding A/R
            </span>
            <span className="text-lg font-black text-rose-500">
              {formatCurrency(totalAR)}
            </span>
          </div>
          <div className="p-4 bg-content2 dark:bg-content2/40 rounded-xl border border-divider/10">
            <span className="text-[10px] font-bold text-default-500 block uppercase">
              Overdue Accounts Limit
            </span>
            <span className="text-lg font-black text-amber-500">
              {nearLimitCount} clients
            </span>
          </div>
        </div>

        <div className="bg-content1 border border-divider/15 p-5 rounded-2xl text-xs space-y-3 font-sans">
          <div className="flex items-center gap-1.5 font-bold text-default-500 pb-2 border-b border-divider/10">
            <Info className="h-4 w-4 text-primary" />
            <span>Accounts Receivable Policies & Terms</span>
          </div>
          <p className="text-default-400 leading-relaxed">
            All credit sales require customer identification and signature. Unsettled invoices beyond 30 days will restrict new transactions on POS checkout terminals automatically.
          </p>
        </div>
      </div>
    </div>
  );
};
