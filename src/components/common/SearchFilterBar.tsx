import React from 'react';
import { Search, X, Filter } from 'lucide-react';

export interface SearchFilterBarProps {
  id?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  categories?: string[];
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
  actions?: React.ReactNode;
  className?: string;
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  id,
  searchValue,
  onSearchChange,
  placeholder = 'Search catalog by name, code, SKU or tile specs...',
  categories = [],
  selectedCategory,
  onCategoryChange,
  actions,
  className = '',
}) => {
  return (
    <div
      id={id}
      className={`flex flex-col gap-3 rounded-xl border border-m3-outline/20 bg-m3-surface-container-high p-3 sm:flex-row sm:items-center ${className}`}
    >
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-m3-on-surface-variant/60" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-m3-outline/30 bg-m3-surface p-2.5 pl-10 pr-9 text-xs font-medium text-m3-on-surface placeholder:text-m3-on-surface-variant/50 focus:border-m3-primary focus:outline-none focus:ring-1 focus:ring-m3-primary"
        />
        {searchValue && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-m3-on-surface-variant hover:text-m3-on-surface"
            title="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {categories.length > 0 && onCategoryChange && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="h-3.5 w-3.5 shrink-0 text-m3-on-surface-variant/60" />
          <button
            onClick={() => onCategoryChange('All')}
            className={`shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all ${
              !selectedCategory || selectedCategory === 'All'
                ? 'border-m3-primary bg-m3-primary/15 text-m3-primary'
                : 'border-m3-outline/30 bg-m3-surface text-m3-on-surface-variant hover:bg-m3-surface-container-highest'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all ${
                selectedCategory === cat
                  ? 'border-m3-primary bg-m3-primary/15 text-m3-primary'
                  : 'border-m3-outline/30 bg-m3-surface text-m3-on-surface-variant hover:bg-m3-surface-container-highest'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
};
