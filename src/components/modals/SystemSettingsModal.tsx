import React from "react";
import { HeroModal } from "../common/ui/HeroModal";
import { SystemSettingsModule } from "../SystemSettingsModule";

export interface SystemSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  onToggleDarkMode: (targetVal?: boolean) => void;
  followSystemTheme: boolean;
  setFollowSystemTheme: (follow: boolean) => void;
}

export const SystemSettingsModal: React.FC<SystemSettingsModalProps> = ({
  isOpen,
  onClose,
  darkMode,
  onToggleDarkMode,
  followSystemTheme,
  setFollowSystemTheme,
}) => {
  return (
    <HeroModal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      zIndex={99999}
      className="max-h-[92vh]"
    >
      <div className="p-4 sm:p-6 overflow-y-auto max-h-[85vh] scrollbar modal__body--scroll-inside">
        <SystemSettingsModule
          darkMode={darkMode}
          setDarkMode={onToggleDarkMode}
          followSystemTheme={followSystemTheme}
          setFollowSystemTheme={setFollowSystemTheme}
          isModal={true}
          onClose={onClose}
        />
      </div>
    </HeroModal>
  );
};
