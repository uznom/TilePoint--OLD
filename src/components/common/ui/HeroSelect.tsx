import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useFloatingPlacement } from './useFloatingPlacement';

export type HeroSelectVariant = 'flat' | 'bordered' | 'faded' | 'underlined' | 'pill';
export type HeroSelectColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
export type HeroSelectSize = 'sm' | 'md' | 'lg';
export type HeroSelectRadius = 'none' | 'sm' | 'md' | 'lg' | 'full';

export interface SelectItemProps {
  key?: React.Key;
  value?: string | number;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export const SelectItem: React.FC<SelectItemProps> = ({ value, disabled, children }) => {
  return <div data-value={value} data-disabled={disabled}>{children}</div>;
};
SelectItem.displayName = 'SelectItem';

export interface SelectSectionProps {
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

export const SelectSection: React.FC<SelectSectionProps> = ({ title, children }) => {
  return (
    <div className="py-1">
      {title && <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-default-400">{title}</div>}
      {children}
    </div>
  );
};
SelectSection.displayName = 'SelectSection';

export interface HeroSelectItem {
  key: string | number;
  label: string | React.ReactNode;
  value?: string | number;
  disabled?: boolean;
}

export interface HeroSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  placeholder?: string;
  helperText?: string;
  errorMessage?: string;
  isInvalid?: boolean;
  isRequired?: boolean;
  isDisabled?: boolean;
  variant?: HeroSelectVariant;
  color?: HeroSelectColor;
  size?: HeroSelectSize;
  radius?: HeroSelectRadius;
  startContent?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
  wrapperClassName?: string;
  items?: HeroSelectItem[];
  selectedKeys?: Iterable<React.Key>;
  defaultSelectedKeys?: Iterable<React.Key>;
  onSelectionChange?: (keys: any) => void;
  onValueChange?: (value: string) => void;
  id?: string;
}

export const HeroSelect = React.forwardRef<HTMLSelectElement, HeroSelectProps>(
  (
    {
      label,
      placeholder = 'Select an option',
      helperText,
      errorMessage,
      isInvalid = false,
      isRequired = false,
      isDisabled = false,
      variant = 'bordered',
      size = 'md',
      radius = 'lg',
      startContent,
      fullWidth = true,
      className = '',
      wrapperClassName = '',
      items,
      onValueChange,
      id,
      value,
      defaultValue,
      onChange,
      disabled,
      children,
      name,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const hiddenSelectRef = useRef<HTMLSelectElement | null>(null);

    const { getPositionClasses } = useFloatingPlacement(containerRef, {
      popoverWidth: 180,
      popoverHeight: 260,
      isOpen,
    });

    const inputId = id || (label ? `hero-select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
    const effectiveDisabled = disabled ?? isDisabled;

    // Parse options from items prop or JSX children (<SelectItem> / <option>)
    const parsedItems = useMemo(() => {
      if (items && items.length > 0) {
        return items.map((i) => ({
          key: String(i.key ?? i.value),
          value: String(i.value ?? i.key),
          label: i.label,
          disabled: Boolean(i.disabled),
        }));
      }
      const list: Array<{ key: string; value: string; label: React.ReactNode; disabled: boolean }> = [];
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child)) {
          const childProps = (child as React.ReactElement<any>).props || {};
          const val = childProps.value !== undefined ? String(childProps.value) : String(child.key ?? '');
          list.push({
            key: val,
            value: val,
            label: childProps.children ?? val,
            disabled: Boolean(childProps.disabled),
          });
        }
      });
      return list;
    }, [items, children]);

    // Track internal selected value
    const [internalValue, setInternalValue] = useState<string>(
      value !== undefined ? String(value) : defaultValue !== undefined ? String(defaultValue) : ''
    );

    useEffect(() => {
      if (value !== undefined) {
        setInternalValue(String(value));
      }
    }, [value]);

    const selectedItem = parsedItems.find((it) => it.value === internalValue || it.key === internalValue);

    // Close on click outside
    useEffect(() => {
      const handleOutsideClick = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    const handleSelect = (itemVal: string) => {
      setInternalValue(itemVal);
      setIsOpen(false);
      onValueChange?.(itemVal);

      if (hiddenSelectRef.current) {
        hiddenSelectRef.current.value = itemVal;
        const event = new Event('change', { bubbles: true });
        hiddenSelectRef.current.dispatchEvent(event);
      }
      if (onChange) {
        const syntheticEvent = {
          target: { value: itemVal, name: name || '' },
          currentTarget: { value: itemVal, name: name || '' },
        } as React.ChangeEvent<HTMLSelectElement>;
        onChange(syntheticEvent);
      }
    };

    const isPill = radius === 'full' || variant === 'pill';

    const getRadiusClasses = () => {
      if (isPill) return 'rounded-full';
      if (radius === 'none') return 'rounded-none';
      if (radius === 'sm') return 'rounded-lg';
      if (radius === 'md') return 'rounded-xl';
      return 'rounded-xl';
    };

    const getSizeClasses = () => {
      switch (size) {
        case 'sm':
          return 'h-8 py-1.5 pl-3 pr-2 text-xs';
        case 'lg':
          return 'h-12 py-3 pl-4 pr-3 text-base';
        case 'md':
        default:
          return 'h-10 py-2 pl-3.5 pr-2.5 text-xs sm:text-sm';
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

    const getVariantClasses = () => {
      if (isInvalid) {
        return 'bg-rose-50/20 dark:bg-rose-500/10 border border-rose-500 text-foreground';
      }
      switch (variant) {
        case 'flat':
          return 'bg-default-100 dark:bg-content2/80 border border-transparent text-foreground hover:bg-default-200/70';
        case 'faded':
          return 'bg-default-100 dark:bg-content2/90 border border-divider dark:border-white/10 text-foreground hover:border-default-400';
        case 'underlined':
          return 'bg-transparent border-b-2 border-divider rounded-none px-0 text-foreground hover:border-default-400';
        case 'bordered':
        case 'pill':
        default:
          return 'bg-default-100/90 hover:bg-default-200/70 dark:bg-content2/90 dark:hover:bg-content3/80 border border-divider/40 dark:border-white/10 text-foreground shadow-xs';
      }
    };

    return (
      <div
        ref={containerRef}
        data-slot="select"
        className={`select relative flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''} ${wrapperClassName}`}
      >
        {label && (
          <label
            htmlFor={inputId}
            data-slot="label"
            className="text-xs font-semibold text-foreground dark:text-default-200 select-none flex items-center gap-1 font-sans tracking-tight"
          >
            <span>{label}</span>
            {isRequired && <span className="text-rose-500">*</span>}
          </label>
        )}

        {/* Hidden Native Select for standard form & ref bindings */}
        <select
          ref={(node) => {
            hiddenSelectRef.current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLSelectElement | null>).current = node;
          }}
          id={inputId}
          name={name}
          value={internalValue}
          onChange={(e) => handleSelect(e.target.value)}
          disabled={effectiveDisabled}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {parsedItems.map((it) => (
            <option key={it.key} value={it.value} disabled={it.disabled}>
              {typeof it.label === 'string' ? it.label : it.value}
            </option>
          ))}
        </select>

        {/* HeroUI v3 Segmented Capsule Trigger Button */}
        <button
          type="button"
          data-slot="trigger"
          disabled={effectiveDisabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className={`select__trigger group flex items-stretch transition-all font-sans text-left cursor-pointer active:scale-[0.98] overflow-hidden select-none ${getRadiusClasses()} ${getVariantClasses()} ${
            effectiveDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
          } focus:outline-none focus:ring-2 focus:ring-primary/20 ${className}`}
        >
          {/* Left section: Icon + Label */}
          <span data-slot="value" className={`select__value flex items-center gap-2 grow min-w-0 ${getSizeClasses()}`}>
            {startContent && <span data-slot="start-content" className="shrink-0 text-foreground/80 group-hover:text-foreground">{startContent}</span>}
            <span className={`truncate ${selectedItem ? 'text-foreground font-semibold' : 'text-default-400 font-medium'}`}>
              {selectedItem ? selectedItem.label : placeholder}
            </span>
          </span>

          {/* Right section: Shaded Chevron Segment with Hairline Divider */}
          <span data-slot="selector-icon" className={`flex items-center justify-center bg-default-200/50 dark:bg-content3/50 border-l border-divider/40 dark:border-white/10 text-default-500 group-hover:text-foreground transition-colors ${getChevronPadding()}`}>
            <ChevronDown
              className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-foreground' : ''
              }`}
            />
          </span>
        </button>

        {/* HeroUI v3 Floating Rounded-2xl Options Card */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              data-slot="popover"
              className={`select__popover list-box absolute ${getPositionClasses()} z-[9999] min-w-full sm:min-w-[160px] max-w-[calc(100vw-24px)] rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.14)] p-1.5 max-h-64 overflow-y-auto space-y-0.5 text-foreground backdrop-blur-md font-sans`}
            >
              {parsedItems.length > 0 ? (
                parsedItems.map((item) => {
                  const isSelected = item.value === internalValue || item.key === internalValue;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      data-slot="item"
                      data-selected={isSelected ? 'true' : undefined}
                      disabled={item.disabled}
                      onClick={() => handleSelect(item.value)}
                      className={`list-box__item flex items-center justify-between gap-2.5 w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer text-left active:scale-[0.98] ${
                        item.disabled ? 'opacity-40 cursor-not-allowed' : ''
                      } ${
                        isSelected
                          ? 'bg-default-100 dark:bg-content2 text-foreground font-semibold shadow-xs'
                          : 'text-foreground hover:bg-default-100/70 dark:hover:bg-content2/70'
                      }`}
                    >
                      <span className="truncate">{item.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-primary stroke-[2.5]" />}
                    </button>
                  );
                })
              ) : (
                <div data-slot="empty" className="p-3 text-center text-xs text-default-400 font-medium">No options available</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {errorMessage && isInvalid ? (
          <p data-slot="error-message" className="text-[11px] font-medium text-rose-500 animate-fade-in pl-1">{errorMessage}</p>
        ) : helperText ? (
          <p data-slot="helper-text" className="text-[11px] text-default-400 pl-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

HeroSelect.displayName = 'HeroSelect';

export const Select = HeroSelect;
export default HeroSelect;
