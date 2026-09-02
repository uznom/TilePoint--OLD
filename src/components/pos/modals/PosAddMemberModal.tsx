import React from "react";
import { ShieldAlert, UserPlus } from "lucide-react";
import { HeroModal } from "../../common/ui/HeroModal";
import { HeroInput } from "../../common/ui/HeroInput";
import { HeroButton } from "../../common/ui/HeroButton";

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
    <HeroModal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
    >
      <div className="p-5 sm:p-6 space-y-4 font-sans text-xs text-foreground text-left">
        <div className="flex justify-between items-center border-b border-divider/20 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">Add Corporate Member Account</h3>
            </div>
          </div>
        </div>

        {addMemberError && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{addMemberError}</span>
          </div>
        )}

        <form onSubmit={onAddCorporateMember} className="space-y-3">
          <HeroInput
            label="Full Name / Company Account Name *"
            required
            value={newMemberName}
            onValueChange={(val) => setNewMemberName(val)}
            placeholder="Full Name / Company"
            radius="lg"
            variant="flat"
          />

          <div className="grid grid-cols-2 gap-3">
            <HeroInput
              label="Contact Phone Number"
              value={newMemberPhone}
              onValueChange={(val) => setNewMemberPhone(val)}
              placeholder="Phone number"
              radius="lg"
              variant="flat"
            />

            <HeroInput
              label="Email Address"
              type="email"
              value={newMemberEmail}
              onValueChange={(val) => setNewMemberEmail(val)}
              placeholder="Email address"
              radius="lg"
              variant="flat"
            />
          </div>

          <HeroInput
            label="Credit Line Ceiling Limit (₱)"
            type="number"
            min="0"
            step="500"
            value={newMemberLimit}
            onValueChange={(val) => setNewMemberLimit(val)}
            placeholder="0"
            radius="lg"
            variant="flat"
          />

          <div className="flex justify-end gap-2 border-t border-divider/20 pt-4 mt-4">
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
              startIcon={<UserPlus className="h-4 w-4" />}
              className="font-bold shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
            >
              Save & Link Account
            </HeroButton>
          </div>
        </form>
      </div>
    </HeroModal>
  );
};
