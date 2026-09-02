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
import { HeroInput } from "../../common/ui/HeroInput";
import { HeroTable } from "../../common/ui/HeroTable";

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
    <div className="space-y-4 font-sans text-xs text-left">
      {/* Header & Overview Banner */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 p-5 rounded-2xl shadow-elevation-soft space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-divider/20 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500 shrink-0" />
            <h3 className="font-bold text-sm text-foreground tracking-tight">Member Account &amp; Loyalty Desk</h3>
          </div>

          {canEditSettings && (
            <HeroButton
              type="button"
              variant="flat"
              size="sm"
              radius="full"
              startIcon={<Settings className="h-3.5 w-3.5 text-amber-500" />}
              onClick={() => setShowLoyaltySettings(!showLoyaltySettings)}
              className="font-bold text-xs"
            >
              {showLoyaltySettings ? "Close Rules Settings" : "Edit Loyalty Rules"}
            </HeroButton>
          )}
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-zinc-100/90 dark:bg-zinc-800/80 p-3.5 rounded-2xl border border-zinc-200/60 dark:border-white/5 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] text-default-500 uppercase font-bold block tracking-wider">Earning Formula</span>
              <span className="text-xs font-bold text-amber-500 font-mono">₱{config.spendPerPoint.toLocaleString()} = 1 Pt</span>
            </div>
            <Award className="h-4 w-4 text-amber-500/40 shrink-0" />
          </div>

          <div className="bg-zinc-100/90 dark:bg-zinc-800/80 p-3.5 rounded-2xl border border-zinc-200/60 dark:border-white/5 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] text-default-500 uppercase font-bold block tracking-wider">Redemption Value</span>
              <span className="text-xs font-bold text-emerald-500 font-mono">1 Pt = {formatCurrency(config.pointValueInPhp)}</span>
            </div>
            <Sparkles className="h-4 w-4 text-emerald-500/40 shrink-0" />
          </div>

          <div className="bg-zinc-100/90 dark:bg-zinc-800/80 p-3.5 rounded-2xl border border-zinc-200/60 dark:border-white/5 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] text-default-500 uppercase font-bold block tracking-wider">Active Members</span>
              <span className="text-xs font-bold text-foreground">{members.length} Members</span>
            </div>
            <Users className="h-4 w-4 text-primary/40 shrink-0" />
          </div>

          <div className="bg-zinc-100/90 dark:bg-zinc-800/80 p-3.5 rounded-2xl border border-zinc-200/60 dark:border-white/5 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] text-default-500 uppercase font-bold block tracking-wider">Total Points Issued</span>
              <span className="text-xs font-bold text-amber-500 font-mono">
                {totalPointsPool.toLocaleString()} Pts <span className="text-[10px] text-default-500 font-normal">({formatCurrency(totalMonetaryValue)})</span>
              </span>
            </div>
            <Award className="h-4 w-4 text-amber-500/40 shrink-0" />
          </div>
        </div>

        {/* Collapsible Quick Settings Drawer */}
        {showLoyaltySettings && (
          <form
            onSubmit={handleSaveSettings}
            className="p-4 bg-zinc-100/90 dark:bg-zinc-800/80 border border-amber-500/30 rounded-2xl space-y-3.5 text-xs pt-3 shadow-2xs"
          >
            <div className="flex items-center justify-between border-b border-divider/20 pb-2">
              <span className="font-bold text-xs text-amber-500 flex items-center gap-1.5">
                <Settings className="h-3.5 w-3.5" />
                <span>Loyalty Program Parameters</span>
              </span>
              <label className="font-bold text-foreground cursor-pointer flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={loyaltyEnabled}
                  onChange={(e) => setLoyaltyEnabled(e.target.checked)}
                  className="h-4 w-4 accent-amber-500 cursor-pointer rounded"
                />
                <span>Enable Program</span>
              </label>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <HeroInput
                label="Spend Threshold (PHP)"
                type="number"
                required
                min={1}
                value={loyaltySpendInput}
                onValueChange={(val) => setLoyaltySpendInput(val)}
                placeholder="500.00"
                radius="lg"
                variant="flat"
              />

              <HeroInput
                label="Point Value in PHP"
                type="number"
                required
                step="0.01"
                min={0.01}
                value={loyaltyPointValInput}
                onValueChange={(val) => setLoyaltyPointValInput(val)}
                placeholder="1.00"
                radius="lg"
                variant="flat"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              {loyaltySavedSuccess ? (
                <span className="text-emerald-500 text-xs font-bold flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Rules Updated Successfully!
                </span>
              ) : <span />}

              <HeroButton
                type="submit"
                color="warning"
                variant="solid"
                size="sm"
                radius="full"
                startIcon={<Save className="h-3.5 w-3.5" />}
                className="font-bold text-black shadow-2xs"
              >
                Save Loyalty Rules
              </HeroButton>
            </div>
          </form>
        )}
      </div>

      {/* Member Loyalty Roster Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 p-5 rounded-2xl space-y-3.5 shadow-elevation-soft text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-divider/20 pb-3">
          <div>
            <h3 className="font-bold text-sm text-foreground tracking-tight flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" />
              <span>Member Loyalty Points Roster</span>
            </h3>
            <p className="text-[11px] text-default-500 mt-0.5 font-medium">
              View accumulated reward points and manage balances.
            </p>
          </div>

          <div className="flex bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-white/5 px-3 py-1.5 rounded-2xl items-center gap-2 w-full sm:w-64">
            <Search className="h-3.5 w-3.5 text-default-400 shrink-0" />
            <input
              type="text"
              value={loyaltyMemberSearch}
              onChange={(e) => setLoyaltyMemberSearch(e.target.value)}
              placeholder="Search member name or phone..."
              className="w-full bg-transparent border-0 outline-none text-xs text-foreground font-sans"
            />
          </div>
        </div>

        <HeroTable isStriped className="min-w-full">
          <HeroTable.Header>
            <HeroTable.Column>Member Profile</HeroTable.Column>
            <HeroTable.Column>Contact</HeroTable.Column>
            <HeroTable.Column align="end">Points Balance</HeroTable.Column>
            <HeroTable.Column align="end">Discount Value</HeroTable.Column>
            <HeroTable.Column align="center">Status</HeroTable.Column>
            <HeroTable.Column align="center">Action</HeroTable.Column>
          </HeroTable.Header>
          <HeroTable.Body>
            {filteredMembers.length === 0 ? (
              <HeroTable.Row isHoverable={false}>
                <HeroTable.Cell colSpan={6} className="p-8 text-center text-default-500 italic">
                  No matching member profiles found.
                </HeroTable.Cell>
              </HeroTable.Row>
            ) : (
              filteredMembers.map((m) => {
                const ptValue = (m.points || 0) * (config.pointValueInPhp || 1.0);
                return (
                  <HeroTable.Row key={m.id}>
                    <HeroTable.Cell>
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs shrink-0">
                          {m.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-foreground">{m.fullName}</div>
                          <div className="text-[10px] text-default-500 font-mono">{m.id}</div>
                        </div>
                      </div>
                    </HeroTable.Cell>
                    <HeroTable.Cell>
                      <div className="text-foreground font-medium">{m.phone || "N/A"}</div>
                      <div className="text-[10px] text-default-500">{m.email || "—"}</div>
                    </HeroTable.Cell>
                    <HeroTable.Cell align="end" className="font-bold text-amber-500 text-sm font-mono">
                      {(m.points || 0).toLocaleString()} Pts
                    </HeroTable.Cell>
                    <HeroTable.Cell align="end" className="font-bold text-emerald-500 font-mono">
                      {formatCurrency(ptValue)}
                    </HeroTable.Cell>
                    <HeroTable.Cell align="center">
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                        m.status === "Active" || !m.status ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                      }`}>
                        {m.status || "Active"}
                      </span>
                    </HeroTable.Cell>
                    <HeroTable.Cell align="center">
                      <HeroButton
                        type="button"
                        variant="flat"
                        color="warning"
                        size="sm"
                        radius="full"
                        onClick={() => {
                          setSelectedLoyaltyMember(m);
                          setAdjustPointsAmount("");
                          setAdjustPointsReason("");
                          setShowAdjustPointsModal(true);
                        }}
                        className="font-bold text-[11px]"
                      >
                        Manage Points
                      </HeroButton>
                    </HeroTable.Cell>
                  </HeroTable.Row>
                );
              })
            )}
          </HeroTable.Body>
        </HeroTable>
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
            <h3 className="font-bold text-sm text-foreground tracking-tight">Adjust Loyalty Points</h3>
          </div>
        </HeroModal.Header>
        <HeroModal.Body className="py-4 space-y-3 font-sans text-xs text-left">
          {selectedLoyaltyMember && (
            <div className="p-3.5 bg-zinc-100/90 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200/60 dark:border-white/5 text-xs shadow-2xs">
              <span className="text-default-500 block text-[10px] font-bold uppercase tracking-wider">Member</span>
              <span className="font-bold text-foreground text-sm">{selectedLoyaltyMember.fullName}</span>
              <div className="mt-1 flex justify-between text-default-500 font-medium">
                <span>Current Balance:</span>
                <span className="font-bold text-amber-500 font-mono">{(selectedLoyaltyMember.points || 0).toLocaleString()} Pts</span>
              </div>
            </div>
          )}

          <HeroInput
            label="Points Delta (+ or -) *"
            type="number"
            required
            value={adjustPointsAmount}
            onValueChange={(val) => setAdjustPointsAmount(val)}
            placeholder="e.g. 50 or -20"
            radius="lg"
            variant="flat"
          />

          <HeroInput
            label="Adjustment Reason"
            value={adjustPointsReason}
            onValueChange={(val) => setAdjustPointsReason(val)}
            placeholder="e.g. Promo bonus or Correction"
            radius="lg"
            variant="flat"
          />
        </HeroModal.Body>
        <HeroModal.Footer className="justify-end gap-2 pt-3 border-t border-divider/20">
          <HeroButton
            type="button"
            variant="flat"
            size="sm"
            radius="full"
            onClick={() => setShowAdjustPointsModal(false)}
            className="font-bold text-xs"
          >
            Cancel
          </HeroButton>
          <HeroButton
            type="button"
            variant="solid"
            color="warning"
            size="sm"
            radius="full"
            onClick={handleConfirmAdjustPoints}
            className="font-bold text-xs text-black shadow-2xs"
          >
            Save Points Delta
          </HeroButton>
        </HeroModal.Footer>
      </HeroModal>
    </div>
  );
};
