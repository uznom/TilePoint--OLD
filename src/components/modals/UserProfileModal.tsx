import React, { useState, useEffect } from "react";
import { Eye, EyeOff, LockKeyhole, Settings } from "lucide-react";
import { User, UserRole } from "../../types/db";
import { HeroModal } from "../common/ui/HeroModal";
import { HeroButton } from "../common/ui/HeroButton";
import { HeroInput } from "../common/ui/HeroInput";

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

      if (currentUser) {
        const profileUpdates: Partial<User> = {
          fullName: editFullName.trim() || currentUser.fullName,
          username: editUsername.trim() || currentUser.username,
          ...(editProfilePicture !== null ? { profilePicture: editProfilePicture } : {}),
          ...passwordUpdates
        };

        updateUser(currentUser.id, profileUpdates);
        updateCurrentUser(profileUpdates);
        showToastMsg("Account profile credentials successfully updated.", "success");
      }

      setIsUpdatingProfile(false);
      handleClose();
    } catch (err: any) {
      console.error("Failed to update profile:", err);
      setProfileModalError(err.message || "Failed to update profile. Please check server logs.");
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
      <form onSubmit={handleSaveProfile} className="flex flex-col h-full overflow-hidden font-sans">
        <HeroModal.Header className="pb-4 border-b border-divider/15">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-2xl border border-primary/20">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-foreground">
                Account Profile & Security
              </h3>
              <p className="text-[11px] text-default-500 font-medium">
                Personal credentials & security settings
              </p>
            </div>
          </div>
        </HeroModal.Header>

        <HeroModal.Body className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="space-y-3">
            <HeroInput
              label="Full Name"
              required
              value={editFullName}
              onValueChange={(val) => setEditFullName(val)}
              placeholder="e.g. John Doe"
              radius="lg"
              variant="flat"
            />

            <HeroInput
              label="Username"
              required
              value={editUsername}
              onValueChange={(val) => setEditUsername(val)}
              placeholder="Username"
              startContent={<span className="text-default-400 text-xs select-none">@</span>}
              radius="lg"
              variant="flat"
            />
          </div>

          <div className="space-y-3 pt-3 border-t border-divider/15">
            <div className="text-xs font-bold text-foreground tracking-tight flex items-center gap-1 pl-1">
              <span>Update Security Password (Optional)</span>
            </div>

            <HeroInput
              label="Current Password"
              type={showCurrentPassword ? "text" : "password"}
              value={currentPasswordInput}
              onValueChange={(val) => setCurrentPasswordInput(val)}
              placeholder="••••••••"
              radius="lg"
              variant="flat"
              endContent={
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="text-default-400 hover:text-foreground cursor-pointer"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />

            <HeroInput
              label="New Password (Min 8 Characters)"
              type={showNewPassword ? "text" : "password"}
              value={newPasswordInput}
              onValueChange={(val) => setNewPasswordInput(val)}
              placeholder="••••••••"
              radius="lg"
              variant="flat"
              endContent={
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="text-default-400 hover:text-foreground cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />

            <HeroInput
              label="Confirm New Password"
              type="password"
              value={confirmPasswordInput}
              onValueChange={(val) => setConfirmPasswordInput(val)}
              placeholder="••••••••"
              radius="lg"
              variant="flat"
            />
          </div>

          <div className="pt-1">
            {profileModalError ? (
              <p className="text-[11px] font-bold text-danger px-1 leading-normal">
                {profileModalError}
              </p>
            ) : (
              <p className="text-[11px] text-default-500 px-1 leading-normal font-medium">
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
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-zinc-100/90 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200/60 dark:border-white/5 rounded-xl text-xs font-semibold text-foreground transition-all cursor-pointer group active:scale-[0.98]"
              >
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" />
                  <span>System Settings & Config</span>
                </div>
                <span className="text-[11px] text-default-400 group-hover:text-foreground">Configure &rarr;</span>
              </button>
            </div>
          )}
        </HeroModal.Body>

        <HeroModal.Footer className="justify-end gap-2.5 pt-3 pb-4 border-t border-divider/15">
          <HeroButton
            type="button"
            variant="flat"
            size="sm"
            radius="full"
            onClick={handleClose}
            className="font-bold text-xs"
          >
            Cancel
          </HeroButton>
          <HeroButton
            type="submit"
            variant="solid"
            color="primary"
            size="sm"
            radius="full"
            isLoading={isUpdatingProfile}
            loadingText="Updating..."
            className="font-bold text-xs shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
          >
            Update Profile & Password
          </HeroButton>
        </HeroModal.Footer>
      </form>
    </HeroModal>
  );
};
