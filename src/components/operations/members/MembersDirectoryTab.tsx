import React, { useState } from "react";
import {
  Building2,
  Phone,
  Search,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { Member } from "../../../types/db";
import { formatCurrency } from "../../../utils/formatters";
import { HeroButton } from "../../common/ui/HeroButton";
import { HeroInput } from "../../common/ui/HeroInput";
import { HeroDropdownSelect } from "../../common/ui/HeroDropdown";

export interface MembersDirectoryTabProps {
  members: Member[];
  onAddMember: (member: Omit<Member, "id">) => void;
  onDeleteMember: (id: string) => void;
  memberBranchFilter: string;
  setMemberBranchFilter: (val: string) => void;
  branchOptions: { key: string; label: string }[];
}

export const MembersDirectoryTab: React.FC<MembersDirectoryTabProps> = ({
  members,
  onAddMember,
  onDeleteMember,
  memberBranchFilter,
  setMemberBranchFilter,
  branchOptions,
}) => {
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberLimit, setNewMemberLimit] = useState(15000);
  const [memberSearch, setMemberSearch] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberPhone.trim()) return;

    const limitNum = Number(newMemberLimit);
    if (isNaN(limitNum) || limitNum < 0) {
      alert("Credit limit must be a positive number.");
      return;
    }

    onAddMember({
      fullName: newMemberName.trim(),
      phone: newMemberPhone.trim(),
      email: newMemberEmail.trim() || "none@specified.com",
      points: 1,
      creditLimit: limitNum,
      outstandingBalance: 0,
      status: "Active",
      createdAt: new Date().toISOString().slice(0, 10),
    });

    setNewMemberName("");
    setNewMemberPhone("");
    setNewMemberEmail("");
    setNewMemberLimit(15000);
  };

  const filteredMembers = members.filter((m) =>
    (m.fullName || "").toLowerCase().includes(memberSearch.toLowerCase()) ||
    (m.phone || "").includes(memberSearch)
  );

  return (
    <div className="grid md:grid-cols-3 gap-6 font-sans text-xs text-left">
      <div className="md:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 p-5 rounded-2xl h-fit space-y-4 shadow-elevation-soft">
        <div className="flex items-center gap-2 text-foreground border-b border-divider/20 pb-3">
          <UserPlus className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-sm tracking-tight">Register Corporate Member</h3>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <HeroInput
            label="Full Client Name *"
            required
            value={newMemberName}
            onValueChange={(val) => setNewMemberName(val)}
            placeholder="Juan Perez Inc."
            radius="lg"
            variant="flat"
          />

          <HeroInput
            label="Active Mobile Phone *"
            type="tel"
            required
            value={newMemberPhone}
            onValueChange={(val) => setNewMemberPhone(val)}
            placeholder="0917-123-4567"
            radius="lg"
            variant="flat"
          />

          <HeroInput
            label="Email Address"
            type="email"
            value={newMemberEmail}
            onValueChange={(val) => setNewMemberEmail(val)}
            placeholder="perez@gmail.com"
            radius="lg"
            variant="flat"
          />

          <HeroInput
            label="Credit Account Limit (PHP)"
            type="number"
            value={newMemberLimit ? String(newMemberLimit) : ''}
            onValueChange={(val) => setNewMemberLimit(Number(val) || 0)}
            placeholder="15000.00"
            radius="lg"
            variant="flat"
          />

          <HeroButton
            type="submit"
            color="primary"
            variant="solid"
            size="md"
            radius="full"
            className="w-full font-bold shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
          >
            Submit Customer Info
          </HeroButton>
        </form>
      </div>

      <div className="md:col-span-2 space-y-4">
        <div className="flex bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 p-2.5 rounded-2xl items-center gap-2 shadow-2xs">
          <Search className="h-4 w-4 text-default-400 pl-1 shrink-0" />
          <input
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            placeholder="Filter customer database..."
            className="w-full bg-transparent border-0 outline-none p-1 text-foreground font-sans text-xs"
          />
          <div className="flex items-center gap-1 shrink-0 border-l border-divider/20 pl-2">
            <HeroDropdownSelect
              startIcon={<Building2 className="h-3.5 w-3.5 text-primary" />}
              items={branchOptions}
              selectedKey={memberBranchFilter}
              onSelectionChange={(val) => setMemberBranchFilter(String(val))}
              size="sm"
              variant="pill"
              className="min-w-[130px]"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 rounded-2xl overflow-hidden shadow-elevation-soft">
          <table className="w-full text-left border-collapse text-xs font-sans">
            <thead className="bg-zinc-100/80 dark:bg-zinc-800/80 text-default-600 dark:text-default-400 font-bold border-b border-divider/20">
              <tr>
                <th className="p-3.5">Customer / ID</th>
                <th className="p-3.5">Contact Line</th>
                <th className="p-3.5 text-right">Credit Balance</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider/10">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-default-500 font-sans">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No registered corporate customers found.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-foreground">{m.fullName}</div>
                      <div className="text-[10px] text-default-400 font-mono">{m.id}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5 text-default-600 font-medium">
                        <Phone className="h-3.5 w-3.5 text-default-400" />
                        <span>{m.phone}</span>
                      </div>
                      <div className="text-[10px] text-default-400">{m.email}</div>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className={`font-bold font-mono ${(m.outstandingBalance || 0) > 0 ? "text-danger" : "text-success"}`}>
                        {formatCurrency(m.outstandingBalance || 0)}
                      </div>
                      <div className="text-[10px] text-default-400 font-mono">
                        Limit: {formatCurrency(m.creditLimit)}
                      </div>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteMember(m.id)}
                        className="p-1.5 hover:bg-rose-500/10 text-default-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                        title="Delete Member"
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
