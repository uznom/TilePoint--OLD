import React from 'react';
import { Search, X, Filter } from 'lucide-react';
import { sanitizeSearch } from '../../utils/sanitizers';
import { HeroChip } from './ui/HeroChip';
import { HeroTooltip } from './ui/HeroTooltip';

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
      className={`flex flex-col gap-3 rounded-xl border border-default-200/20 bg-content3 p-3 sm:flex-row sm:items-center ${className}`}
    >
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-default-500/60" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(sanitizeSearch(e.target.value))}
          placeholder={placeholder}
          className="w-full rounded-lg border border-default-200/30 bg-background p-2.5 pl-10 pr-9 text-xs font-medium text-foreground placeholder:text-default-500/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {searchValue && (
          <HeroTooltip content="Clear search" placement="left">
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-default-400 hover:text-foreground cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </HeroTooltip>
        )}
      </div>

      {categories.length > 0 && onCategoryChange && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="h-3.5 w-3.5 shrink-0 text-default-500/60" />
          <HeroChip
            variant={!selectedCategory || selectedCategory === 'All' ? 'primary' : 'neutral'}
            size="sm"
            onClick={() => onCategoryChange('All')}
          >
            All Categories
          </HeroChip>
          {categories.map((cat) => (
            <HeroChip
              key={cat}
              variant={selectedCategory === cat ? 'primary' : 'neutral'}
              size="sm"
              onClick={() => onCategoryChange(cat)}
            >
              {cat}
            </HeroChip>
          ))}
        </div>
      )}

      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
};

export default SearchFilterBar;
