import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

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
  variant?: 'bordered' | 'flat' | 'faded';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'default';
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
  variant = 'bordered',
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

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'py-1.5 px-3 text-xs';
      case 'lg':
        return 'py-3.5 px-4 text-base';
      case 'md':
      default:
        return 'py-2.5 px-3.5 text-xs sm:text-sm';
    }
  };

  return (
    <div ref={dropdownRef} className={`relative flex flex-col gap-1.5 ${className}`} id={id}>
      {label && (
        <label className="text-[11px] font-bold uppercase tracking-wider text-default-500 flex items-center gap-1">
          {label}
          {isRequired && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 w-full rounded-xl transition-all font-medium text-left cursor-pointer
          ${getSizeClasses()}
          ${
            variant === 'flat'
              ? 'bg-content2 dark:bg-content1/80 border-transparent text-foreground'
              : 'bg-content1 dark:bg-[#18181B] border border-divider/40 hover:border-primary/60 text-foreground shadow-xs'
          }
          ${isInvalid ? '!border-rose-500 !bg-rose-500/5' : ''}
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
          focus:outline-none focus:ring-2 focus:ring-primary/30`}
      >
        <span className="truncate flex items-center gap-2">
          {selectedItem?.icon && <span className="shrink-0">{selectedItem.icon}</span>}
          <span className={selectedItem ? 'text-foreground font-semibold' : 'text-default-500/60'}>
            {selectedItem ? selectedItem.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-default-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Popup */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-2xl bg-content1 dark:bg-[#18181B] border border-divider/50 shadow-2xl p-1.5 max-h-60 overflow-y-auto space-y-0.5 animate-scale-in text-foreground backdrop-blur-md">
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
                className={`flex items-center justify-between gap-2 w-full p-2.5 rounded-xl text-xs transition-colors cursor-pointer text-left
                  ${item.isDisabled ? 'opacity-40 cursor-not-allowed' : ''}
                  ${
                    item.isDanger
                      ? 'text-rose-500 hover:bg-rose-500/10'
                      : isSelected
                      ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                      : 'text-foreground hover:bg-content2 dark:hover:bg-[#27272A]'
                  }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{item.label}</span>
                    {item.description && (
                      <span className={`text-[10px] truncate ${isSelected ? 'text-primary-foreground/80' : 'text-default-500'}`}>
                        {item.description}
                      </span>
                    )}
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 shrink-0 text-primary-foreground stroke-[2.5]" />}
              </button>
            );
          })}
        </div>
      )}

      {isInvalid && errorMessage && (
        <span className="text-[10.5px] font-semibold text-rose-500 mt-0.5">
          {errorMessage}
        </span>
      )}
    </div>
  );
};
