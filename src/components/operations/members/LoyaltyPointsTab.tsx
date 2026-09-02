import React, { useState } from "react";
import {
  Award,
  Check,
  Save,
  Search,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { Member, UserRole } from "../../../types/db";
import { formatCurrency } from "../../../utils/formatters";
import { HeroModal } from "../../common/ui/HeroModal";
import { HeroButton } from "../../common/ui/HeroButton";

export interface LoyaltyPointsTabProps {
  members: Member[];
  loyaltyConfig: any;
  updateLoyaltyConfig: (config: any) => void;
  currentUserRole?: UserRole;
  onAdjustPoints: (memberId: string, deltaPoints: number, reason: string) => void;
}

export const LoyaltyPointsTab: React.FC<LoyaltyPointsTabProps> = ({
  members,
  loyaltyConfig,
  updateLoyaltyConfig,
  currentUserRole,
  onAdjustPoints,
}) => {
  const config = loyaltyConfig || {
    enabled: true,
    spendPerPoint: 500,
    pointsPerSpend: 1,
    pointValueInPhp: 1.0,
  };

  const [showLoyaltySettings, setShowLoyaltySettings] = useState(false);
  const [loyaltySpendInput, setLoyaltySpendInput] = useState(() => (config.spendPerPoint || 500).toString());
  const [loyaltyPointValInput, setLoyaltyPointValInput] = useState(() => (config.pointValueInPhp || 1.0).toString());
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(() => config.enabled ?? true);
  const [loyaltySavedSuccess, setLoyaltySavedSuccess] = useState(false);
  const [loyaltyMemberSearch, setLoyaltyMemberSearch] = useState("");

  // Adjust Points Modal
  const [showAdjustPointsModal, setShowAdjustPointsModal] = useState(false);
  const [selectedLoyaltyMember, setSelectedLoyaltyMember] = useState<Member | null>(null);
  const [adjustPointsAmount, setAdjustPointsAmount] = useState("");
  const [adjustPointsReason, setAdjustPointsReason] = useState("");

  const totalPointsPool = members.reduce((acc, m) => acc + (m.points || 0), 0);
  const totalMonetaryValue = totalPointsPool * (config.pointValueInPhp || 1.0);

  const canEditSettings = currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.MANAGER;

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const spend = parseFloat(loyaltySpendInput) || 500;
    const val = parseFloat(loyaltyPointValInput) || 1.0;
    updateLoyaltyConfig({
      spendPerPoint: Math.max(1, spend),
      pointValueInPhp: Math.max(0.01, val),
      enabled: loyaltyEnabled,
    });
    setLoyaltySavedSuccess(true);
    setTimeout(() => setLoyaltySavedSuccess(false), 3000);
  };

  const handleConfirmAdjustPoints = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoyaltyMember) return;
    const delta = parseInt(adjustPointsAmount, 10);
    if (isNaN(delta) || delta === 0) return;

    onAdjustPoints(selectedLoyaltyMember.id, delta, adjustPointsReason.trim() || "Manual Balance Adjustment");
    setShowAdjustPointsModal(false);
    setSelectedLoyaltyMember(null);
    setAdjustPointsAmount("");
    setAdjustPointsReason("");
  };

  const filteredMembers = members.filter(
    (m) =>
      (m.fullName || "").toLowerCase().includes(loyaltyMemberSearch.toLowerCase()) ||
      (m.phone || "").toLowerCase().includes(loyaltyMemberSearch.toLowerCase()) ||
      (m.id || "").toLowerCase().includes(loyaltyMemberSearch.toLowerCase())
  );

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Header & Overview Banner */}
      <div className="bg-content1 border border-divider/15 p-4 rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-divider/10 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500 shrink-0" />
            <h3 className="font-extrabold text-sm text-primary">Member Account & Loyalty Desk</h3>
          </div>

          {canEditSettings && (
            <button
              type="button"
              onClick={() => setShowLoyaltySettings(!showLoyaltySettings)}
              className="px-3 py-1.5 bg-content3 hover:bg-content4 text-foreground text-xs font-bold rounded-xl border border-divider/30 flex items-center gap-1.5 cursor-pointer transition-colors active:scale-95"
            >
              <Settings className="h-3.5 w-3.5 text-amber-500" />
              <span>{showLoyaltySettings ? "Close Rules Settings" : "Edit Loyalty Rules"}</span>
            </button>
          )}
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
          <div className="bg-content1 p-2.5 rounded-xl border border-divider/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-default-500 uppercase font-bold block">Earning Formula</span>
              <span className="text-xs font-extrabold text-amber-500">₱{config.spendPerPoint.toLocaleString()} = 1 Pt</span>
            </div>
            <Award className="h-4 w-4 text-amber-500/30 shrink-0" />
          </div>

          <div className="bg-content1 p-2.5 rounded-xl border border-divider/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-default-500 uppercase font-bold block">Redemption Value</span>
              <span className="text-xs font-extrabold text-emerald-500">1 Pt = {formatCurrency(config.pointValueInPhp)} Off</span>
            </div>
            <Sparkles className="h-4 w-4 text-emerald-500/30 shrink-0" />
          </div>

          <div className="bg-content1 p-2.5 rounded-xl border border-divider/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-default-500 uppercase font-bold block">Active Members</span>
              <span className="text-xs font-extrabold text-foreground">{members.length} Members</span>
            </div>
            <Users className="h-4 w-4 text-primary/30 shrink-0" />
          </div>

          <div className="bg-content1 p-2.5 rounded-xl border border-divider/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-default-500 uppercase font-bold block">Total Points Issued</span>
              <span className="text-xs font-extrabold text-amber-500">
                {totalPointsPool.toLocaleString()} Pts <span className="text-[10px] text-default-500 font-normal">({formatCurrency(totalMonetaryValue)})</span>
              </span>
            </div>
            <Award className="h-4 w-4 text-amber-500/30 shrink-0" />
          </div>
        </div>

        {/* Collapsible Quick Settings Drawer */}
        {showLoyaltySettings && (
          <form
            onSubmit={handleSaveSettings}
            className="p-3.5 bg-content1 border border-amber-500/20 rounded-xl space-y-3 text-xs pt-3"
          >
            <div className="flex items-center justify-between border-b border-divider/10 pb-2">
              <span className="font-extrabold text-xs text-amber-500 flex items-center gap-1.5">
                <Settings className="h-3.5 w-3.5" />
                <span>Loyalty Program Parameters</span>
              </span>
              <label className="font-bold text-foreground cursor-pointer flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={loyaltyEnabled}
                  onChange={(e) => setLoyaltyEnabled(e.target.checked)}
                  className="h-3.5 w-3.5 accent-amber-500 cursor-pointer"
                />
                <span>Enable Program</span>
              </label>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-default-500 flex justify-between">
                  <span>Spend Threshold (PHP)</span>
                  <span className="text-default-500 text-[10px] font-normal">Spend to earn 1 point</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-default-500 font-bold">₱</span>
                  <input
                    type="number"
                    required
                    min="1"
                    value={loyaltySpendInput}
                    onChange={(e) => setLoyaltySpendInput(e.target.value)}
                    placeholder="500"
                    className="w-full bg-content3 border border-divider rounded-lg py-1.5 pl-7 pr-2 outline-none font-bold focus:border-amber-500 text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-default-500 flex justify-between">
                  <span>Point Value in PHP</span>
                  <span className="text-default-500 text-[10px] font-normal">Discount value per 1 point</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-default-500 font-bold">₱</span>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0.01"
                    value={loyaltyPointValInput}
                    onChange={(e) => setLoyaltyPointValInput(e.target.value)}
                    placeholder="1.00"
                    className="w-full bg-content3 border border-divider rounded-lg py-1.5 pl-7 pr-2 outline-none font-bold focus:border-amber-500 text-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              {loyaltySavedSuccess ? (
                <span className="text-emerald-500 text-xs font-bold flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Rules Updated Successfully!
                </span>
              ) : <span />}

              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs active:scale-95"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save Loyalty Rules</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Member Loyalty Roster Table */}
      <div className="bg-content1 border border-divider/15 p-4 rounded-2xl space-y-3 shadow-xs text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-divider/10 pb-3">
          <div>
            <h3 className="font-bold text-sm text-primary flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>Member Loyalty Points Roster</span>
            </h3>
            <p className="text-[11px] text-default-500 mt-0.5">
              View accumulated reward points and manage balances.
            </p>
          </div>

          <div className="flex bg-content3 border border-divider/30 px-2.5 py-1.5 rounded-xl items-center gap-2 w-full sm:w-64">
            <Search className="h-3.5 w-3.5 text-default-500 shrink-0" />
            <input
              type="text"
              value={loyaltyMemberSearch}
              onChange={(e) => setLoyaltyMemberSearch(e.target.value)}
              placeholder="Search member name or phone..."
              className="w-full bg-transparent border-0 outline-none text-xs text-foreground"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-divider/15">
          <table className="w-full text-left text-xs">
            <thead className="bg-content3/50 font-bold border-b border-divider/15 text-default-500">
              <tr>
                <th className="p-3">Member Profile</th>
                <th className="p-3">Contact</th>
                <th className="p-3 text-right">Points Balance</th>
                <th className="p-3 text-right">Discount Value</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider/10">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-default-500 italic">
                    No matching member profiles found.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => {
                  const ptValue = (m.points || 0) * (config.pointValueInPhp || 1.0);
                  return (
                    <tr key={m.id} className="hover:bg-primary/5 transition-colors active:scale-[0.98]">
                      <td className="p-3 font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs shrink-0">
                            {m.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-foreground">{m.fullName}</div>
                            <div className="text-[10px] text-default-500">{m.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-foreground font-medium">{m.phone || "N/A"}</div>
                        <div className="text-[10px] text-default-500">{m.email || "—"}</div>
                      </td>
                      <td className="p-3 text-right font-extrabold text-amber-500 text-sm">
                        {(m.points || 0).toLocaleString()} Pts
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-500">
                        {formatCurrency(ptValue)}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          m.status === "Active" || !m.status ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                        }`}>
                          {m.status || "Active"}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLoyaltyMember(m);
                            setAdjustPointsAmount("");
                            setAdjustPointsReason("");
                            setShowAdjustPointsModal(true);
                          }}
                          className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-bold text-[10.5px] rounded-lg transition-colors cursor-pointer border border-amber-500/20 active:scale-[0.98]"
                        >
                          Manage Points
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Points Modal */}
      <HeroModal
        isOpen={showAdjustPointsModal}
        onClose={() => setShowAdjustPointsModal(false)}
        size="sm"
        zIndex={60}
      >
        <HeroModal.Header className="pb-3 border-b border-divider/20">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h3 className="font-bold text-sm text-foreground">Adjust Loyalty Points</h3>
          </div>
        </HeroModal.Header>
        <HeroModal.Body className="py-4 space-y-3">
          {selectedLoyaltyMember && (
            <div className="p-3 bg-content2 rounded-xl border border-divider/20 text-xs">
              <span className="text-default-500 block text-[10px]">Member</span>
              <span className="font-bold text-foreground text-sm">{selectedLoyaltyMember.fullName}</span>
              <div className="mt-1 flex justify-between text-default-500">
                <span>Current Balance:</span>
                <span className="font-bold text-amber-500">{(selectedLoyaltyMember.points || 0).toLocaleString()} Pts</span>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-default-500">Points Delta (+ or -) *</label>
            <input
              type="number"
              required
              value={adjustPointsAmount}
              onChange={(e) => setAdjustPointsAmount(e.target.value)}
              placeholder="e.g. 50 or -20"
              className="w-full bg-content3 border border-divider rounded-lg p-2 text-xs outline-none focus:border-amber-500 text-foreground font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-default-500">Adjustment Reason</label>
            <input
              type="text"
              value={adjustPointsReason}
              onChange={(e) => setAdjustPointsReason(e.target.value)}
              placeholder="e.g. Promo bonus or Correction"
              className="w-full bg-content3 border border-divider rounded-lg p-2 text-xs outline-none focus:border-amber-500 text-foreground"
            />
          </div>
        </HeroModal.Body>
        <HeroModal.Footer className="justify-end gap-2 pt-3 border-t border-divider/20">
          <HeroButton
            type="button"
            variant="flat"
            size="sm"
            onClick={() => setShowAdjustPointsModal(false)}
          >
            Cancel
          </HeroButton>
          <HeroButton
            type="button"
            variant="solid"
            color="warning"
            size="sm"
            onClick={handleConfirmAdjustPoints}
            className="font-bold text-black"
          >
            Save Points Delta
          </HeroButton>
        </HeroModal.Footer>
      </HeroModal>
    </div>
  );
};
