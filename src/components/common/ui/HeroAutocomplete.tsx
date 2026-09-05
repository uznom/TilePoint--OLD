import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { HeroInput, HeroInputProps } from './HeroInput';
import { useFloatingPlacement } from './useFloatingPlacement';

export interface HeroAutocompleteItem {
  key: string | number;
  label: string;
  description?: string;
  value?: string | number;
  textValue?: string;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
}

export interface HeroAutocompleteProps extends Omit<HeroInputProps, 'value' | 'defaultValue' | 'onChange'> {
  items: HeroAutocompleteItem[];
  selectedKey?: string | number | null;
  defaultSelectedKey?: string | number | null;
  onSelectionChange?: (key: string | number | null, item?: HeroAutocompleteItem) => void;
  onSearchChange?: (text: string) => void;
  emptyContent?: React.ReactNode;
  popoverWidth?: number;
  maxPopoverHeight?: number;
  allowCustomValue?: boolean;
  hideDropdownIcon?: boolean;
}

export const HeroAutocomplete: React.FC<HeroAutocompleteProps> = ({
  items,
  selectedKey,
  defaultSelectedKey,
  onSelectionChange,
  onSearchChange,
  emptyContent = 'No results found',
  placeholder = 'Search...',
  popoverWidth = 320,
  maxPopoverHeight = 240,
  allowCustomValue = false,
  hideDropdownIcon = false,
  endContent,
  onFocus,
  onBlur,
  onKeyDown,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [currentKey, setCurrentKey] = useState<string | number | null>(defaultSelectedKey ?? null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const activeKey = selectedKey !== undefined ? selectedKey : currentKey;
  const activeItem = useMemo(() => items.find((it) => it.key === activeKey), [items, activeKey]);

  const [searchQuery, setSearchQuery] = useState(() => activeItem?.label || '');
  const prevActiveKeyRef = useRef(activeKey);

  // Synchronize input display query when activeItem changes externally
  useEffect(() => {
    if (prevActiveKeyRef.current !== activeKey) {
      prevActiveKeyRef.current = activeKey;
      setSearchQuery(activeItem ? activeItem.label : '');
    } else if (!isFocused) {
      setSearchQuery(activeItem ? activeItem.label : '');
    }
  }, [activeKey, activeItem, isFocused]);

  const { getPositionClasses } = useFloatingPlacement(containerRef, {
    popoverWidth,
    popoverHeight: maxPopoverHeight,
    isOpen,
  });

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter((item) => {
      const labelMatch = item.label.toLowerCase().includes(q);
      const descMatch = item.description?.toLowerCase().includes(q);
      const textMatch = item.textValue?.toLowerCase().includes(q);
      return labelMatch || descMatch || textMatch;
    });
  }, [items, searchQuery]);

  const handleSelect = useCallback(
    (item: HeroAutocompleteItem) => {
      setCurrentKey(item.key);
      setSearchQuery(item.label);
      setIsOpen(false);
      setHighlightedIndex(-1);
      onSelectionChange?.(item.key, item);
    },
    [onSelectionChange]
  );

  const handleClear = useCallback(() => {
    setSearchQuery('');
    setCurrentKey(null);
    setHighlightedIndex(-1);
    onSelectionChange?.(null);
    onSearchChange?.('');
    inputRef.current?.focus();
  }, [onSelectionChange, onSearchChange]);

  // Handle outside clicks to close dropdown and revert search query if unselected
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
        setHighlightedIndex(-1);
        if (!allowCustomValue) {
          setSearchQuery(activeItem ? activeItem.label : '');
        }
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [activeItem, allowCustomValue]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const children = listRef.current.children;
      if (children[highlightedIndex]) {
        (children[highlightedIndex] as HTMLElement).scrollIntoView({
          block: 'nearest',
        });
      }
    }
  }, [highlightedIndex]);

  const handleInputChange = (val: string) => {
    setSearchQuery(val);
    setIsOpen(true);
    setHighlightedIndex(0);
    onSearchChange?.(val);

    if (!val) {
      setCurrentKey(null);
      onSelectionChange?.(null);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex((prev) => (filteredItems.length === 0 ? -1 : (prev + 1) % filteredItems.length));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(filteredItems.length - 1);
      } else {
        setHighlightedIndex((prev) =>
          filteredItems.length === 0 ? -1 : prev <= 0 ? filteredItems.length - 1 : prev - 1
        );
      }
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredItems.length) {
        e.preventDefault();
        handleSelect(filteredItems[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setHighlightedIndex(-1);
      if (!allowCustomValue) {
        setSearchQuery(activeItem ? activeItem.label : '');
      }
    } else if (e.key === 'Tab') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
      inputRef.current?.focus();
    }
  };

  const combinedEndContent = (
    <div className="flex items-center gap-1.5 shrink-0">
      {endContent}
      {!hideDropdownIcon && (
        <button
          type="button"
          tabIndex={-1}
          onClick={toggleDropdown}
          className="p-1 rounded-md text-default-400 hover:text-foreground transition-colors cursor-pointer"
          title="Toggle options"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary' : ''}`}
          />
        </button>
      )}
    </div>
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <HeroInput
        ref={inputRef}
        placeholder={placeholder}
        value={searchQuery}
        onValueChange={handleInputChange}
        onFocus={(e) => {
          setIsFocused(true);
          setIsOpen(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          onBlur?.(e);
        }}
        onKeyDown={handleInputKeyDown}
        isClearable
        onClear={handleClear}
        endContent={combinedEndContent}
        {...props}
      />

      {isOpen && (
        <div
          ref={listRef}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          style={{
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
          }}
          className={`absolute ${getPositionClasses()} z-[9999] min-w-full max-w-[calc(100vw-24px)] max-h-60 overflow-y-auto overscroll-contain touch-pan-y rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.18)] p-1.5 animate-scale-in text-foreground backdrop-blur-md font-sans scrollbar-thin`}
        >
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => {
              const isSelected = item.key === activeKey;
              const isHighlighted = index === highlightedIndex;

              return (
                <button
                  key={item.key}
                  type="button"
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => handleSelect(item)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : isHighlighted
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-foreground'
                      : 'hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {item.startContent && <span className="shrink-0">{item.startContent}</span>}
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span className="font-semibold truncate">{item.label}</span>
                      {item.description && (
                        <span
                          className={`text-[10px] truncate font-normal ${
                            isSelected ? 'text-primary-foreground/80' : 'text-default-400'
                          }`}
                        >
                          {item.description}
                        </span>
                      )}
                    </div>
                  </div>
                  {item.endContent && <div className="shrink-0">{item.endContent}</div>}
                </button>
              );
            })
          ) : (
            <div className="p-4 text-center text-xs text-default-400 font-medium">{emptyContent}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default HeroAutocomplete;
