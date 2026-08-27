import React, { useState, createContext, useContext } from 'react';

export type HeroAccordionVariant = 'default' | 'shadow' | 'bordered' | 'splitted';

interface AccordionContextType {
  variant?: HeroAccordionVariant;
  expandedKeys: Set<string | number>;
  toggleKey: (key: string | number) => void;
}

const AccordionContext = createContext<AccordionContextType | null>(null);

export interface HeroAccordionProps {
  variant?: HeroAccordionVariant;
  selectionMode?: 'single' | 'multiple';
  defaultExpandedKeys?: (string | number)[];
  className?: string;
  children?: React.ReactNode;
  id?: string;
}

export const HeroAccordion: React.FC<HeroAccordionProps> = ({
  variant = 'bordered',
  selectionMode = 'single',
  defaultExpandedKeys = [],
  className = '',
  children,
  id,
}) => {
  const [expandedKeys, setExpandedKeys] = useState<Set<string | number>>(
    new Set(defaultExpandedKeys)
  );

  const toggleKey = (key: string | number) => {
    setExpandedKeys((prev) => {
      const next = new Set(selectionMode === 'single' ? [] : prev);
      if (prev.has(key)) {
        if (selectionMode === 'multiple') next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const getContainerStyle = () => {
    switch (variant) {
      case 'bordered':
        return 'border border-divider rounded-large divide-y divide-divider bg-content1 shadow-xs';
      case 'shadow':
        return 'bg-content1 rounded-large divide-y divide-divider shadow-medium';
      case 'splitted':
        return 'flex flex-col gap-2 bg-transparent';
      case 'default':
      default:
        return 'divide-y divide-divider bg-transparent';
    }
  };

  return (
    <AccordionContext.Provider value={{ variant, expandedKeys, toggleKey }}>
      <div id={id} className={`w-full ${getContainerStyle()} ${className}`}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
};

export interface HeroAccordionItemProps {
  itemKey: string | number;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  startContent?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  id?: string;
}

export const HeroAccordionItem: React.FC<HeroAccordionItemProps> = ({
  itemKey,
  title,
  subtitle,
  startContent,
  className = '',
  children,
  id,
}) => {
  const ctx = useContext(AccordionContext);
  if (!ctx) return null;

  const isExpanded = ctx.expandedKeys.has(itemKey);

  const isSplitted = ctx.variant === 'splitted';

  return (
    <div
      id={id}
      className={`overflow-hidden transition-all duration-150 ${
        isSplitted ? 'border border-divider rounded-medium bg-content1 shadow-xs' : ''
      } ${className}`}
    >
      <button
        type="button"
        onClick={() => ctx.toggleKey(itemKey)}
        className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left transition-colors hover:bg-default-100/50 cursor-pointer select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          {startContent && <div className="shrink-0 text-default-400">{startContent}</div>}
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-foreground truncate">{title}</span>
            {subtitle && <span className="text-[11px] text-default-400 truncate">{subtitle}</span>}
          </div>
        </div>
        <div
          className={`shrink-0 text-default-400 transform transition-transform duration-200 ${
            isExpanded ? 'rotate-180 text-primary' : ''
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-1 text-xs text-default-600 dark:text-default-300 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
};

export default HeroAccordion;
