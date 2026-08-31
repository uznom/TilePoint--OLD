import React, { useState, useEffect } from "react";
import { Eye, EyeOff, LockKeyhole, Settings } from "lucide-react";
import { User, UserRole } from "../../types/db";
import { HeroModal } from "../common/ui/HeroModal";
import { HeroButton } from "../common/ui/HeroButton";

export interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  updateUser: (id: string, data: Partial<User>) => void;
  updateCurrentUser: (data: Partial<User>) => void;
  onOpenSystemSettings?: () => void;
  showToastMsg: (msg: string, type?: "success" | "info" | "error") => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  updateUser,
  updateCurrentUser,
  onOpenSystemSettings,
  showToastMsg,
}) => {
  const [editFullName, setEditFullName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [editProfilePicture, setEditProfilePicture] = useState<string | null>(null);
  const [profileModalError, setProfileModalError] = useState<string | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  useEffect(() => {
    if (currentUser && isOpen) {
      setEditFullName(currentUser.fullName || "");
      setEditUsername(currentUser.username || "");
      setEditProfilePicture(currentUser.profilePicture || null);
      setCurrentPasswordInput("");
      setNewPasswordInput("");
      setConfirmPasswordInput("");
      setProfileModalError(null);
      setShowCurrentPassword(false);
      setShowNewPassword(false);
    }
  }, [currentUser, isOpen]);

  const handleClose = () => {
    setCurrentPasswordInput("");
    setNewPasswordInput("");
    setConfirmPasswordInput("");
    setProfileModalError(null);
    onClose();
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileModalError(null);
    setIsUpdatingProfile(true);

    try {
      const passwordUpdates: Partial<User> = {};
      if (currentPasswordInput || newPasswordInput || confirmPasswordInput) {
        if (!currentPasswordInput || !newPasswordInput || !confirmPasswordInput) {
          setProfileModalError("To change password, please fill out all password fields.");
          setIsUpdatingProfile(false);
          return;
        }
        if (newPasswordInput.length < 8) {
          setProfileModalError("Security Policy: New password must be at least 8 characters.");
          setIsUpdatingProfile(false);
          return;
        }
        if (newPasswordInput !== confirmPasswordInput) {
          setProfileModalError("Confirmation Error: New passwords do not match.");
          setIsUpdatingProfile(false);
          return;
        }

        const sessionTok = sessionStorage.getItem("tp_session_token") || localStorage.getItem("tp_session_token");
        const changeRes = await fetch("/api/auth/change-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(sessionTok ? { "Authorization": `Bearer ${sessionTok}` } : {})
          },
          body: JSON.stringify({
            currentPassword: currentPasswordInput,
            newPassword: newPasswordInput
          })
        });

        const changeData = await changeRes.json();
        if (!changeRes.ok || !changeData.success) {
          setProfileModalError(changeData.error || "Password update failed on server.");
          setIsUpdatingProfile(false);
          return;
        }
      }

      if (!editFullName.trim()) {
        setProfileModalError("Validation Error: Full Name is required.");
        setIsUpdatingProfile(false);
        return;
      }
      if (!editUsername.trim()) {
        setProfileModalError("Validation Error: Username is required.");
        setIsUpdatingProfile(false);
        return;
      }

      const cleanUsername = editUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
      const initials = editFullName
        .split(" ")
        .map((p) => (p ? p[0] : ""))
        .join("")
        .toUpperCase()
        .slice(0, 2) || "AD";

      const updatedData: Partial<User> = {
        fullName: editFullName.trim(),
        username: cleanUsername,
        profilePicture: editProfilePicture || undefined,
        avatarInitials: initials,
        ...passwordUpdates,
      };

      if (currentUser?.id) {
        updateUser(currentUser.id, updatedData);
      }
      updateCurrentUser(updatedData);

      handleClose();
      showToastMsg("Account details successfully updated!");
    } catch (err: any) {
      console.error(err);
      setProfileModalError("Dynamic crypt engine error: unable to update profile.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  return (
    <HeroModal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      zIndex={60}
    >
      <form onSubmit={handleSaveProfile} className="flex flex-col h-full overflow-hidden">
        <HeroModal.Header className="pb-4 border-b border-divider/15">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-warning/10 text-warning rounded-2xl">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-wider text-foreground">
                Account Profile & Security
              </h3>
              <p className="text-[10px] text-default-500 uppercase tracking-widest font-bold">
                Personal Credentials & Security Vault
              </p>
            </div>
          </div>
        </HeroModal.Header>

        <HeroModal.Body className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-default-500 uppercase tracking-widest pl-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full bg-background border border-divider/50 px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors rounded-xl font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-default-500 uppercase tracking-widest pl-1">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2 text-default-400 text-xs select-none">@</span>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="Username"
                  className="w-full bg-background border border-divider/50 pl-7 pr-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors rounded-xl font-medium"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-divider/15">
            <div className="text-[11px] font-black text-warning uppercase tracking-wider flex items-center gap-1 pl-1">
              <span>Update Security Password (Optional)</span>
            </div>

            <div className="space-y-1 relative">
              <label className="text-[10px] font-extrabold text-default-500 uppercase tracking-widest pl-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-background border border-divider/50 px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors rounded-xl pr-9 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-2.5 top-2 text-default-400 hover:text-foreground cursor-pointer"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1 relative">
              <label className="text-[10px] font-extrabold text-default-500 uppercase tracking-widest pl-1">
                New Password (Min 8 Characters)
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-background border border-divider/50 px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors rounded-xl pr-9 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2.5 top-2 text-default-400 hover:text-foreground cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-default-500 uppercase tracking-widest pl-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPasswordInput}
                onChange={(e) => setConfirmPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-background border border-divider/50 px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors rounded-xl font-medium"
              />
            </div>
          </div>

          <div className="pt-1">
            {profileModalError ? (
              <p className="text-[10px] font-bold text-danger px-1 leading-normal">
                {profileModalError}
              </p>
            ) : (
              <p className="text-[10px] text-default-500 px-1 leading-normal font-medium">
                Your account security credentials will be encrypted and updated securely.
              </p>
            )}
          </div>

          {(currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER) && onOpenSystemSettings && (
            <div className="pt-2 border-t border-divider/15">
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onOpenSystemSettings();
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-content2/60 hover:bg-content2 border border-divider/30 rounded-xl text-xs font-bold text-foreground transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" />
                  <span>System Settings & Config</span>
                </div>
                <span className="text-[10px] text-default-400 group-hover:text-foreground">Configure &rarr;</span>
              </button>
            </div>
          )}
        </HeroModal.Body>

        <HeroModal.Footer className="justify-end gap-2.5 pt-3 pb-4 border-t border-divider/15">
          <HeroButton
            type="button"
            variant="flat"
            size="sm"
            onClick={handleClose}
            className="font-bold text-xs"
          >
            Cancel
          </HeroButton>
          <HeroButton
            type="submit"
            variant="solid"
            color="warning"
            size="sm"
            isLoading={isUpdatingProfile}
            loadingText="Updating..."
            className="font-bold text-xs uppercase tracking-wider text-black"
          >
            Update Password
          </HeroButton>
        </HeroModal.Footer>
      </form>
    </HeroModal>
  );
};
