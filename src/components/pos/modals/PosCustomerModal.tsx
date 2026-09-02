import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { UserPlus, X } from "lucide-react";
import { Member } from "../../../types/db";
import { formatTin } from "../../../utils/formatters";

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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 text-left">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.form
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.4 }}
            onSubmit={onSaveCustomerName}
            className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground space-y-4 font-sans text-xs"
          >
            <div className="flex justify-between items-center border-b border-divider/20 pb-2.5">
              <h3 className="text-base font-bold text-primary flex items-center gap-2">
                <span>Assign Customer Profile</span>
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-default-500 hover:text-foreground cursor-pointer p-1 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1 block">
                Buyer's Name
              </label>
              <input
                type="text"
                value={customerModalInput}
                onChange={(e) => setCustomerModalInput(e.target.value)}
                placeholder="Full Name / Company Name"
                className="w-full bg-background border-b-2 border-divider px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors rounded-lg font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1 block">
                Buyer's Address (BIR / Invoicing)
              </label>
              <input
                type="text"
                value={customerModalAddressInput}
                onChange={(e) => setCustomerModalAddressInput(e.target.value)}
                placeholder="Unit / Street / Barangay / City / Province"
                className="w-full bg-background border-b-2 border-divider px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors rounded-lg font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1 block">
                  Buyer TIN
                </label>
                <input
                  type="text"
                  value={customerModalTinInput}
                  onChange={(e) => setCustomerModalTinInput(formatTin(e.target.value))}
                  placeholder="000-000-000-000"
                  className="w-full bg-background border-b-2 border-divider px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors rounded-lg font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1 block">
                  Business Style
                </label>
                <input
                  type="text"
                  value={customerModalBusinessStyleInput}
                  onChange={(e) => setCustomerModalBusinessStyleInput(e.target.value)}
                  placeholder="e.g. Retail / General Contractor"
                  className="w-full bg-background border-b-2 border-divider px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors rounded-lg font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1 block">
                Ticket Note / Project Assign (Optional)
              </label>
              <input
                type="text"
                value={customerModalNotesInput}
                onChange={(e) => setCustomerModalNotesInput(e.target.value)}
                placeholder="e.g. Master Bath Renovation / Lot 4 Villa"
                className="w-full bg-background border-b-2 border-divider px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors rounded-lg font-bold"
              />
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="text-[9px] font-black text-default-500 uppercase tracking-widest pl-1 block">
                Search Registered Corporate Members
              </label>
              <div className="max-h-36 overflow-y-auto border border-divider/20 rounded-xl p-1 bg-content1 divide-y divide-divider/10 scrollbar-thin">
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
                              className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 text-xs font-extrabold rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-colors border-0"
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
                      className="w-full text-left p-2 hover:bg-primary/10 rounded-lg text-xs font-bold text-foreground flex justify-between items-center cursor-pointer border-0 bg-transparent transition-colors"
                    >
                      <div className="flex flex-col text-left">
                        <span>{m.fullName}</span>
                        <span className="text-[8.5px] text-default-500 font-normal">
                          {m.phone} • {m.email} {m.tin ? `• TIN: ${m.tin}` : ''}
                        </span>
                      </div>
                      <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                        Select
                      </span>
                    </button>
                  ));
                })()}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-divider/20 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-default-100 text-default-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 rounded-xl px-5 py-2 text-xs cursor-pointer"
              >
                Assign Customer
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  );
};
