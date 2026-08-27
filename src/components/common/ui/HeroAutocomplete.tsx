import React, { useState, useRef, useEffect } from 'react';
import { HeroInput, HeroInputProps } from './HeroInput';

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
        <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-60 overflow-y-auto rounded-medium bg-content1 dark:bg-[#18181B] border border-divider shadow-large p-1 animate-fade-in text-foreground">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => handleSelect(item)}
                className={`w-full text-left px-3 py-2 rounded-small text-xs flex flex-col gap-0.5 transition-colors cursor-pointer ${
                  item.key === activeKey
                    ? 'bg-primary-50 dark:bg-primary/20 text-primary font-bold'
                    : 'hover:bg-default-100 dark:hover:bg-[#27272A] text-foreground'
                }`}
              >
                <span>{item.label}</span>
                {item.description && (
                  <span className="text-[10px] text-default-400 font-normal">{item.description}</span>
                )}
              </button>
            ))
          ) : (
            <div className="p-3 text-center text-xs text-default-400">{emptyContent}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default HeroAutocomplete;
