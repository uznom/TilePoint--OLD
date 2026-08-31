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
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-1 bg-content1 border border-divider/15 p-5 rounded-2xl h-fit space-y-4">
        <div className="flex items-center gap-2 text-primary border-b border-divider/10 pb-3">
          <UserPlus className="h-5 w-5" />
          <h3 className="font-bold text-sm">Register New Corporate Member</h3>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 font-sans text-xs">
          <div className="space-y-1">
            <label className="font-bold text-default-500">Full Client Name *</label>
            <input
              required
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              type="text"
              placeholder="Juan Perez Inc."
              className="w-full bg-content3 border border-divider rounded-lg p-2.5 outline-none focus:border-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold text-default-500">Active Mobile Phone *</label>
            <input
              required
              value={newMemberPhone}
              onChange={(e) => setNewMemberPhone(e.target.value)}
              type="tel"
              placeholder="Phone number"
              className="w-full bg-content3 border border-divider rounded-lg p-2.5 outline-none focus:border-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold text-default-500">Email Address</label>
            <input
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              type="email"
              placeholder="perez@gmail.com"
              className="w-full bg-content3 border border-divider rounded-lg p-2.5 outline-none focus:border-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold text-default-500">Credit Account Limit (PHP)</label>
            <input
              value={newMemberLimit}
              onChange={(e) => setNewMemberLimit(Number(e.target.value))}
              type="number"
              className="w-full bg-content3 border border-divider rounded-lg p-2.5 outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-bold transition hover:opacity-90 cursor-pointer"
          >
            Submit Customer Info
          </button>
        </form>
      </div>

      <div className="md:col-span-2 space-y-4">
        <div className="flex bg-content1 border border-divider/15 p-2 rounded-xl items-center gap-2 font-sans text-xs">
          <Search className="h-4 w-4 text-default-500 pl-1 shrink-0" />
          <input
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            placeholder="Filter customer database..."
            className="w-full bg-transparent border-0 outline-none p-1.5"
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

        <div className="bg-content1 border border-divider/15 rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse text-xs font-sans">
            <thead className="bg-content2 text-default-500 font-bold border-b border-divider/10">
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
                  <tr key={m.id} className="hover:bg-content2/40 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-foreground">{m.fullName}</div>
                      <div className="text-[10px] text-default-400 font-sans">{m.id}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1 text-default-600">
                        <Phone className="h-3 w-3 text-default-400" />
                        <span>{m.phone}</span>
                      </div>
                      <div className="text-[10px] text-default-400">{m.email}</div>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className={`font-bold ${(m.outstandingBalance || 0) > 0 ? "text-danger" : "text-success"}`}>
                        {formatCurrency(m.outstandingBalance || 0)}
                      </div>
                      <div className="text-[10px] text-default-400">
                        Limit: {formatCurrency(m.creditLimit)}
                      </div>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteMember(m.id)}
                        className="p-1.5 hover:bg-danger/10 text-default-400 hover:text-danger rounded-lg transition cursor-pointer"
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
