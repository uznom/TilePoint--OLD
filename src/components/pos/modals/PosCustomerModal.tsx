import React from "react";
import { UserPlus } from "lucide-react";
import { Member } from "../../../types/db";
import { formatTin } from "../../../utils/formatters";
import { HeroModal } from "../../common/ui/HeroModal";
import { HeroInput } from "../../common/ui/HeroInput";
import { HeroButton } from "../../common/ui/HeroButton";

export interface PosCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerModalInput: string;
  setCustomerModalInput: (val: string) => void;
  customerModalAddressInput: string;
  setCustomerModalAddressInput: (val: string) => void;
  customerModalTinInput: string;
  setCustomerModalTinInput: (val: string) => void;
  customerModalBusinessStyleInput: string;
  setCustomerModalBusinessStyleInput: (val: string) => void;
  customerModalNotesInput: string;
  setCustomerModalNotesInput: (val: string) => void;
  members: Member[];
  onSaveCustomerName: (e: React.FormEvent) => void;
  onOpenAddMember: (name: string) => void;
}

export const PosCustomerModal: React.FC<PosCustomerModalProps> = ({
  isOpen,
  onClose,
  customerModalInput,
  setCustomerModalInput,
  customerModalAddressInput,
  setCustomerModalAddressInput,
  customerModalTinInput,
  setCustomerModalTinInput,
  customerModalBusinessStyleInput,
  setCustomerModalBusinessStyleInput,
  customerModalNotesInput,
  setCustomerModalNotesInput,
  members,
  onSaveCustomerName,
  onOpenAddMember,
}) => {
  return (
    <HeroModal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
    >
      <form onSubmit={onSaveCustomerName} className="p-5 sm:p-6 space-y-4 font-sans text-xs text-foreground text-left">
        <div className="flex justify-between items-center border-b border-divider/20 pb-3">
          <h3 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
            <span>Assign Customer Profile</span>
          </h3>
        </div>

        <div className="space-y-3">
          <HeroInput
            label="Buyer's Name"
            value={customerModalInput}
            onValueChange={(val) => setCustomerModalInput(val)}
            placeholder="Full Name / Company Name"
            radius="lg"
            variant="flat"
          />

          <HeroInput
            label="Buyer's Address (BIR / Invoicing)"
            value={customerModalAddressInput}
            onValueChange={(val) => setCustomerModalAddressInput(val)}
            placeholder="Unit / Street / Barangay / City / Province"
            radius="lg"
            variant="flat"
          />

          <div className="grid grid-cols-2 gap-3">
            <HeroInput
              label="Buyer TIN"
              value={customerModalTinInput}
              onValueChange={(val) => setCustomerModalTinInput(formatTin(val))}
              placeholder="000-000-000-000"
              radius="lg"
              variant="flat"
            />

            <HeroInput
              label="Business Style"
              value={customerModalBusinessStyleInput}
              onValueChange={(val) => setCustomerModalBusinessStyleInput(val)}
              placeholder="e.g. Retail / General"
              radius="lg"
              variant="flat"
            />
          </div>

          <HeroInput
            label="Ticket Note / Project Assign (Optional)"
            value={customerModalNotesInput}
            onValueChange={(val) => setCustomerModalNotesInput(val)}
            placeholder="e.g. Master Bath Renovation / Lot 4"
            radius="lg"
            variant="flat"
          />
        </div>

        <div className="space-y-1.5 pt-1">
          <label className="text-[10px] font-bold text-default-500 uppercase tracking-wider pl-1 block">
            Search Registered Corporate Members
          </label>
          <div className="max-h-36 overflow-y-auto border border-divider/20 rounded-xl p-1 bg-zinc-50 dark:bg-zinc-900/60 divide-y divide-divider/10 scrollbar-thin">
            {(() => {
              const filteredModalMembers = members.filter((m) => {
                if (!customerModalInput.trim()) return true;
                return (
                  m.fullName.toLowerCase().includes(customerModalInput.toLowerCase()) ||
                  m.phone.includes(customerModalInput) ||
                  m.email.toLowerCase().includes(customerModalInput.toLowerCase())
                );
              });

              if (filteredModalMembers.length === 0) {
                return (
                  <div className="p-3 text-center space-y-2">
                    <p className="text-default-500 text-[11px] font-medium italic">
                      {customerModalInput.trim()
                        ? `No corporate members found matching "${customerModalInput}".`
                        : "No registered corporate members found."}
                    </p>
                    {customerModalInput.trim() &&
                      customerModalInput.toLowerCase() !== "walk-in customer" &&
                      customerModalInput.toLowerCase() !== "walk-in" && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenAddMember(customerModalInput.trim());
                          }}
                          className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-colors border-0 active:scale-95"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          <span>Add "{customerModalInput.trim()}" as Member</span>
                        </button>
                      )}
                  </div>
                );
              }

              return filteredModalMembers.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => {
                    setCustomerModalInput(m.fullName);
                    if (m.address) setCustomerModalAddressInput(m.address);
                    if (m.tin) setCustomerModalTinInput(formatTin(m.tin));
                  }}
                  className="w-full text-left p-2 hover:bg-primary/10 rounded-lg text-xs font-semibold text-foreground flex justify-between items-center cursor-pointer border-0 bg-transparent transition-colors active:scale-[0.98]"
                >
                  <div className="flex flex-col text-left">
                    <span className="font-bold">{m.fullName}</span>
                    <span className="text-[10px] text-default-500 font-normal">
                      {m.phone} • {m.email} {m.tin ? `• TIN: ${m.tin}` : ''}
                    </span>
                  </div>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Select
                  </span>
                </button>
              ));
            })()}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-divider/20 pt-4">
          <HeroButton
            type="button"
            variant="flat"
            size="sm"
            radius="full"
            onClick={onClose}
          >
            Cancel
          </HeroButton>
          <HeroButton
            type="submit"
            color="primary"
            variant="solid"
            size="sm"
            radius="full"
            className="font-bold shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
          >
            Assign Customer
          </HeroButton>
        </div>
      </form>
    </HeroModal>
  );
};
