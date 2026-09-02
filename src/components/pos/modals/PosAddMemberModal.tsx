import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { ShieldAlert, UserPlus, X } from "lucide-react";

export interface PosAddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  newMemberName: string;
  setNewMemberName: React.Dispatch<React.SetStateAction<string>> | ((val: string) => void);
  newMemberPhone: string;
  setNewMemberPhone: React.Dispatch<React.SetStateAction<string>> | ((val: string) => void);
  newMemberEmail: string;
  setNewMemberEmail: React.Dispatch<React.SetStateAction<string>> | ((val: string) => void);
  newMemberLimit: string;
  setNewMemberLimit: React.Dispatch<React.SetStateAction<string>> | ((val: string) => void);
  addMemberError: string;
  onAddCorporateMember: (e: React.FormEvent) => void;
}

export const PosAddMemberModal: React.FC<PosAddMemberModalProps> = ({
  isOpen,
  onClose,
  newMemberName,
  setNewMemberName,
  newMemberPhone,
  setNewMemberPhone,
  newMemberEmail,
  setNewMemberEmail,
  newMemberLimit,
  setNewMemberLimit,
  addMemberError,
  onAddCorporateMember,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-lg rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-background flex flex-col space-y-4 font-sans text-xs"
          >
            <div className="flex justify-between items-center border-b border-divider/20 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-extrabold text-foreground">Add Corporate Member Account</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-default-500 hover:text-foreground p-1.5 rounded-full hover:bg-primary/10 transition-colors cursor-pointer active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {addMemberError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs font-bold rounded-xl flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{addMemberError}</span>
              </div>
            )}

            <form onSubmit={onAddCorporateMember} className="space-y-3 text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-primary uppercase tracking-wider block">
                  Full Name / Company Account Name *
                </label>
                <input
                  type="text"
                  required
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Full Name / Company"
                  className="w-full bg-content1 border border-divider/40 rounded-xl px-3.5 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-primary transition-all active:scale-[0.98]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-primary uppercase tracking-wider block">
                    Contact Phone Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={newMemberPhone}
                    onChange={(e) => setNewMemberPhone(e.target.value)}
                    placeholder="Phone number"
                    className="w-full bg-content1 border border-divider/40 rounded-xl px-3.5 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-primary transition-all active:scale-[0.98]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-primary uppercase tracking-wider block">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full bg-content1 border border-divider/40 rounded-xl px-3.5 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-primary transition-all active:scale-[0.98]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-primary uppercase tracking-wider block">
                  Credit Line Ceiling Limit (₱) (Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={newMemberLimit}
                  onChange={(e) => setNewMemberLimit(e.target.value)}
                  placeholder="0"
                  className="w-full bg-content1 border border-divider/40 rounded-xl px-3.5 py-2 text-xs font-extrabold text-foreground focus:outline-none focus:border-primary transition-all active:scale-[0.98]"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-divider/20 pt-3 mt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-divider/40 hover:bg-content3 text-foreground text-xs font-bold rounded-xl cursor-pointer transition-colors active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-extrabold rounded-xl shadow-md cursor-pointer transition-colors flex items-center gap-1.5 active:scale-95"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Save & Link Account</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
