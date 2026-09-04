import React, { useState } from "react";
import { CheckCircle2, CreditCard, Info } from "lucide-react";
import { Member } from "../../../types/db";
import { formatCurrency } from "../../../utils/formatters";
import { HeroButton } from "../../common/ui/HeroButton";
import { HeroInput } from "../../common/ui/HeroInput";

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
    <div className="grid md:grid-cols-2 gap-6 font-sans text-xs text-left">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 p-5 rounded-2xl space-y-4 shadow-elevation-soft">
        <h3 className="font-bold text-sm text-foreground tracking-tight">
          Settle Customer Account Ledger
        </h3>

        <div className="space-y-2 font-sans text-xs">
          <label className="font-bold text-default-500 uppercase tracking-wider text-[10px]">
            Select Account Client *
          </label>
          <div className="space-y-1 max-h-48 overflow-y-auto border border-zinc-200/60 dark:border-white/5 rounded-xl divide-y divide-divider/10 shadow-2xs">
            {receivableMembers.length === 0 ? (
              <div className="p-6 text-center text-xs space-y-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                <CheckCircle2 className="h-7 w-7 text-emerald-500 mx-auto opacity-90" />
                <p className="font-bold text-foreground">All Accounts Fully Settled</p>
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
                    className={`w-full text-left p-3.5 flex justify-between cursor-pointer transition-colors ${
                      selectedMember?.id === m.id
                        ? "bg-primary/10 border-l-4 border-primary font-bold"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    <div>
                      <span className="font-bold text-foreground">{m.fullName}</span>
                      <span className="text-[10px] block text-default-500 font-mono">
                        Limit: {formatCurrency(limit)}
                      </span>
                    </div>
                    <span className="text-rose-500 font-bold font-mono">
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
            className="space-y-4 font-sans text-xs pt-3 animate-fade-in border-t border-divider/20"
          >
            <div className="flex justify-between items-center bg-zinc-100/90 dark:bg-zinc-800/80 p-3.5 rounded-2xl border border-zinc-200/60 dark:border-white/5 shadow-2xs">
              <div>
                <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">
                  Selected Account Billing
                </span>
                <span className="font-bold text-sm text-foreground">
                  {selectedMember.fullName}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-default-500 font-bold block uppercase tracking-wider">
                  Balance Due
                </span>
                <span className="text-sm font-bold text-rose-500 font-mono">
                  {formatCurrency(getBalance(selectedMember))}
                </span>
              </div>
            </div>

            <HeroInput
              label="Amount to Tender (PHP) *"
              type="number"
              step="any"
              required
              size="lg"
              value={paymentAmount}
              onValueChange={(val) => setPaymentAmount(val)}
              placeholder="0.00"
              radius="lg"
              variant="flat"
              startContent={<span className="text-xl sm:text-2xl font-black text-default-400 font-mono select-none">₱</span>}
              classNames={{
                input: "text-xl sm:text-2xl font-black font-mono tracking-tight",
                inputWrapper: "h-14 sm:h-16 shadow-inner border border-divider/40",
              }}
            />

            <HeroButton
              type="submit"
              color="primary"
              variant="solid"
              size="md"
              radius="full"
              startIcon={<CreditCard className="h-4 w-4" />}
              className="w-full font-bold shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
            >
              Process Payment &amp; Print Slip
            </HeroButton>
          </form>
        )}
      </div>

      <div className="space-y-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 p-5 rounded-2xl grid grid-cols-2 gap-4 shadow-elevation-soft">
          <div className="p-4 bg-zinc-100/90 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200/60 dark:border-white/5 shadow-2xs">
            <span className="text-[10px] font-bold text-default-500 block uppercase tracking-wider">
              Total Outstanding A/R
            </span>
            <span className="text-lg font-bold text-rose-500 font-mono">
              {formatCurrency(totalAR)}
            </span>
          </div>
          <div className="p-4 bg-zinc-100/90 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200/60 dark:border-white/5 shadow-2xs">
            <span className="text-[10px] font-bold text-default-500 block uppercase tracking-wider">
              Overdue Accounts Limit
            </span>
            <span className="text-lg font-bold text-amber-500 font-mono">
              {nearLimitCount} clients
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 p-5 rounded-2xl text-xs space-y-3 font-sans shadow-elevation-soft">
          <div className="flex items-center gap-2 font-bold text-foreground pb-2 border-b border-divider/20">
            <Info className="h-4 w-4 text-primary" />
            <span>Accounts Receivable Policies &amp; Terms</span>
          </div>
          <p className="text-default-500 leading-relaxed font-medium text-[11px]">
            All credit sales require customer identification and signature. Unsettled invoices beyond 30 days will restrict new transactions on POS checkout terminals automatically.
          </p>
        </div>
      </div>
    </div>
  );
};
