import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export interface HeroDropdownItem {
  key: string;
  label: React.ReactNode;
  description?: string;
  icon?: React.ReactNode;
  isDisabled?: boolean;
  isDanger?: boolean;
}

export interface HeroDropdownSelectProps {
  label?: string;
  placeholder?: string;
  items: HeroDropdownItem[];
  selectedKey?: string;
  onSelectionChange?: (key: string) => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'pill' | 'bordered' | 'flat' | 'faded';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'default';
  startIcon?: React.ReactNode;
  isDisabled?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  className?: string;
  id?: string;
}

export const HeroDropdownSelect: React.FC<HeroDropdownSelectProps> = ({
  label,
  placeholder = 'Select an option',
  items,
  selectedKey,
  onSelectionChange,
  size = 'md',
  variant = 'pill',
  startIcon,
  isDisabled = false,
  isRequired = false,
  isInvalid = false,
  errorMessage,
  className = '',
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedItem = items.find((i) => i.key === selectedKey);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getLeftPadding = () => {
    switch (size) {
      case 'sm':
        return 'py-1.5 pl-3 pr-2 text-xs';
      case 'lg':
        return 'py-3 pl-4 pr-3 text-base';
      case 'md':
      default:
        return 'py-2 pl-3.5 pr-2.5 text-xs sm:text-sm';
    }
  };

  const getChevronPadding = () => {
    switch (size) {
      case 'sm':
        return 'px-2';
      case 'lg':
        return 'px-3.5';
      case 'md':
      default:
        return 'px-2.5';
    }
  };

  const isPill = variant === 'pill' || variant === 'bordered' || !variant;

  return (
    <div ref={dropdownRef} className={`relative flex flex-col gap-1.5 ${className}`} id={id}>
      {label && (
        <label className="text-xs font-semibold text-foreground dark:text-zinc-200 flex items-center gap-1 font-sans tracking-tight">
          {label}
          {isRequired && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Segmented Capsule Pill Trigger (HeroUI v3) */}
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex items-stretch transition-all font-sans text-left cursor-pointer active:scale-[0.98] overflow-hidden select-none
          ${isPill ? 'rounded-full' : 'rounded-xl'}
          ${
            variant === 'flat'
              ? 'bg-default-100 dark:bg-zinc-800/80 border border-transparent text-foreground'
              : 'bg-default-100/90 hover:bg-default-200/70 dark:bg-zinc-800/90 dark:hover:bg-zinc-700/80 border border-divider/40 dark:border-white/10 text-foreground shadow-xs'
          }
          ${isInvalid ? '!border-rose-500 !bg-rose-500/5' : ''}
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
          focus:outline-none focus:ring-2 focus:ring-primary/20`}
      >
        {/* Left segment with icon + text */}
        <span className={`flex items-center gap-2 grow min-w-0 ${getLeftPadding()}`}>
          {(startIcon || selectedItem?.icon) && (
            <span className="shrink-0 text-foreground/80 group-hover:text-foreground transition-colors">
              {selectedItem?.icon || startIcon}
            </span>
          )}
          <span className={`truncate ${selectedItem ? 'text-foreground font-semibold' : 'text-default-400 font-medium'}`}>
            {selectedItem ? selectedItem.label : placeholder}
          </span>
        </span>

        {/* Right segmented chevron block with divider and tint */}
        <span className={`flex items-center justify-center bg-default-200/50 dark:bg-zinc-700/50 border-l border-divider/40 dark:border-white/10 text-default-500 group-hover:text-foreground transition-colors ${getChevronPadding()}`}>
          <ChevronDown
            className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-foreground' : ''
            }`}
          />
        </span>
      </button>

      {/* Dropdown Menu Popup (Rounded-2xl Floating Card) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 mt-1.5 z-50 min-w-full sm:min-w-[150px] rounded-2xl bg-content1 border border-divider/40 shadow-2xl p-1.5 max-h-64 overflow-y-auto space-y-0.5 text-foreground backdrop-blur-md font-sans"
          >
            {items.map((item) => {
              const isSelected = item.key === selectedKey;
              return (
                <button
                  key={item.key}
                  type="button"
                  disabled={item.isDisabled}
                  onClick={() => {
                    if (item.isDisabled) return;
                    onSelectionChange?.(item.key);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between gap-2 w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer text-left active:scale-[0.98]
                    ${item.isDisabled ? 'opacity-40 cursor-not-allowed' : ''}
                    ${
                      item.isDanger
                        ? 'text-rose-500 hover:bg-rose-500/10'
                        : isSelected
                        ? 'bg-default-100 dark:bg-zinc-800 text-foreground font-semibold shadow-xs'
                        : 'text-foreground hover:bg-default-100/70 dark:hover:bg-zinc-800/70'
                    }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.icon && <span className="shrink-0 text-default-500">{item.icon}</span>}
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{item.label}</span>
                      {item.description && (
                        <span className="text-[10px] text-default-400 font-normal truncate">
                          {item.description}
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-primary stroke-[2.5]" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {isInvalid && errorMessage && (
        <span className="text-[10.5px] font-semibold text-rose-500 mt-0.5">
          {errorMessage}
        </span>
      )}
    </div>
  );
};

/* ==========================================================================
   Compound HeroDropdown Components (HeroUI v3)
   ========================================================================== */

interface DropdownContextType {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  close: () => void;
}

const DropdownContext = createContext<DropdownContextType | null>(null);

export interface HeroDropdownProps {
  children: React.ReactNode;
  className?: string;
}

export const HeroDropdown: React.FC<HeroDropdownProps> = ({ children, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen, close: () => setIsOpen(false) }}>
      <div ref={containerRef} className={`relative inline-block ${className}`}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
};

export interface HeroDropdownTriggerProps {
  children: React.ReactNode;
  className?: string;
}

export const HeroDropdownTrigger: React.FC<HeroDropdownTriggerProps> = ({ children, className = '' }) => {
  const ctx = useContext(DropdownContext);
  return (
    <div
      onClick={() => ctx?.setIsOpen((prev) => !prev)}
      className={`inline-flex items-center cursor-pointer ${className}`}
    >
      {children}
    </div>
  );
};

export interface HeroDropdownMenuProps {
  children: React.ReactNode;
  align?: 'start' | 'end' | 'center';
  className?: string;
}

export const HeroDropdownMenu: React.FC<HeroDropdownMenuProps> = ({
  children,
  align = 'start',
  className = '',
}) => {
  const ctx = useContext(DropdownContext);
  if (!ctx?.isOpen) return null;

  const alignClass =
    align === 'end' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -4 }}
        transition={{ duration: 0.12 }}
        className={`absolute top-full mt-1.5 z-50 min-w-48 rounded-2xl bg-content1 border border-divider/50 shadow-2xl p-1.5 space-y-0.5 text-foreground backdrop-blur-md font-sans ${alignClass} ${className}`}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export interface HeroDropdownItemComponentProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  description?: React.ReactNode;
  isDanger?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export const HeroDropdownItemComponent: React.FC<HeroDropdownItemComponentProps> = ({
  children,
  icon,
  description,
  isDanger = false,
  isDisabled = false,
  onClick,
  className = '',
}) => {
  const ctx = useContext(DropdownContext);

  const handleClick = () => {
    if (isDisabled) return;
    onClick?.();
    ctx?.close();
  };

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={handleClick}
      className={`flex items-center gap-2.5 w-full p-2.5 rounded-xl text-xs transition-colors cursor-pointer text-left active:scale-[0.98] font-sans ${
        isDisabled ? 'opacity-40 cursor-not-allowed' : ''
      } ${
        isDanger
          ? 'text-rose-500 hover:bg-rose-500/10'
          : 'text-foreground hover:bg-default-100 dark:hover:bg-[#27272A]'
      } ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <div className="flex flex-col min-w-0">
        <span className="font-semibold truncate">{children}</span>
        {description && <span className="text-[10px] text-default-400 font-normal truncate">{description}</span>}
      </div>
    </button>
  );
};

export const Dropdown = HeroDropdown;
export const DropdownTrigger = HeroDropdownTrigger;
export const DropdownMenu = HeroDropdownMenu;
export const DropdownItem = HeroDropdownItemComponent;

