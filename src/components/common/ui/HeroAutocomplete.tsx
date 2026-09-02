import React, { useState, useRef, useEffect } from 'react';
import { HeroInput, HeroInputProps } from './HeroInput';
import { useFloatingPlacement } from './useFloatingPlacement';

export interface HeroAutocompleteItem {
  key: string | number;
  label: string;
  description?: string;
  value?: string | number;
}

export interface HeroAutocompleteProps extends Omit<HeroInputProps, 'value' | 'defaultValue' | 'onChange'> {
  items: HeroAutocompleteItem[];
  selectedKey?: string | number;
  defaultSelectedKey?: string | number;
  onSelectionChange?: (key: string | number | null, item?: HeroAutocompleteItem) => void;
  onSearchChange?: (text: string) => void;
  emptyContent?: React.ReactNode;
}

export const HeroAutocomplete: React.FC<HeroAutocompleteProps> = ({
  items,
  selectedKey,
  defaultSelectedKey,
  onSelectionChange,
  onSearchChange,
  emptyContent = 'No results found',
  placeholder = 'Search...',
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentKey, setCurrentKey] = useState<string | number | null>(defaultSelectedKey ?? null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { getPositionClasses } = useFloatingPlacement(containerRef, {
    popoverWidth: 240,
    popoverHeight: 240,
    isOpen,
  });

  const activeKey = selectedKey !== undefined ? selectedKey : currentKey;
  const activeItem = items.find((it) => it.key === activeKey);

  useEffect(() => {
    if (activeItem) {
      setSearchQuery(activeItem.label);
    }
  }, [activeItem]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredItems = items.filter(
    (item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelect = (item: HeroAutocompleteItem) => {
    setCurrentKey(item.key);
    setSearchQuery(item.label);
    setIsOpen(false);
    onSelectionChange?.(item.key, item);
  };

  const handleInputChange = (val: string) => {
    setSearchQuery(val);
    setIsOpen(true);
    onSearchChange?.(val);
    if (!val) {
      setCurrentKey(null);
      onSelectionChange?.(null);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <HeroInput
        placeholder={placeholder}
        value={searchQuery}
        onValueChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        isClearable
        onClear={() => {
          setSearchQuery('');
          setCurrentKey(null);
          onSelectionChange?.(null);
        }}
        {...props}
      />

      {isOpen && (
        <div className={`absolute ${getPositionClasses()} z-[9999] min-w-full max-w-[calc(100vw-24px)] max-h-60 overflow-y-auto rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.14)] p-1.5 animate-scale-in text-foreground backdrop-blur-md font-sans`}>
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => handleSelect(item)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex flex-col gap-0.5 transition-colors cursor-pointer active:scale-[0.98] ${
                  item.key === activeKey
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'hover:bg-content2 text-foreground'
                }`}
              >
                <span className="font-semibold">{item.label}</span>
                {item.description && (
                  <span className={`text-[10px] ${item.key === activeKey ? 'text-primary-foreground/80' : 'text-default-400'} font-normal`}>{item.description}</span>
                )}
              </button>
            ))
          ) : (
            <div className="p-3.5 text-center text-xs text-default-400 font-medium">{emptyContent}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default HeroAutocomplete;
