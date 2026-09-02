import React from 'react';

export type HeroTabsVariant = 'solid' | 'bordered' | 'light' | 'underlined';
export type HeroTabsColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
export type HeroTabsSize = 'sm' | 'md' | 'lg';
export type HeroTabsRadius = 'none' | 'sm' | 'md' | 'lg' | 'full';

export interface HeroTabItem {
  id: string;
  title: string | React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  isDisabled?: boolean;
}

export interface HeroTabProps {
  key?: React.Key;
  id?: string;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  isDisabled?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export const Tab: React.FC<HeroTabProps> = ({ children }) => {
  return <>{children}</>;
};
Tab.displayName = 'Tab';

export interface HeroTabsProps {
  items?: HeroTabItem[];
  children?: React.ReactNode;
  selectedKey?: string | React.Key;
  defaultSelectedKey?: string | React.Key;
  onSelectionChange?: (key: string | any) => void;
  variant?: HeroTabsVariant;
  color?: HeroTabsColor;
  size?: HeroTabsSize;
  radius?: HeroTabsRadius;
  fullWidth?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
}

export const HeroTabs: React.FC<HeroTabsProps> = ({
  items,
  children,
  selectedKey,
  defaultSelectedKey,
  onSelectionChange,
  variant = 'solid',
  color = 'default',
  size = 'md',
  radius = 'full',
  fullWidth = false,
  className = '',
  id,
  'aria-label': ariaLabel,
}) => {
  const [internalKey, setInternalKey] = React.useState<string | React.Key>(
    selectedKey ?? defaultSelectedKey ?? ''
  );

  React.useEffect(() => {
    if (selectedKey !== undefined) {
      setInternalKey(selectedKey);
    }
  }, [selectedKey]);

  const currentKey = selectedKey !== undefined ? selectedKey : internalKey;

  // Extract items from children if provided
  const tabItems: HeroTabItem[] = React.useMemo(() => {
    if (items) return items;
    const extracted: HeroTabItem[] = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child)) {
        const key = child.key ? String(child.key).replace(/^\.\$/, '') : (child.props as any).id || (child.props as any).key;
        extracted.push({
          id: String(key),
          title: (child.props as any).title ?? key,
          icon: (child.props as any).icon,
          badge: (child.props as any).badge,
          isDisabled: (child.props as any).isDisabled,
        });
      }
    });
    return extracted;
  }, [items, children]);

  // If no current key set and we have items, default to first item
  React.useEffect(() => {
    if (!currentKey && tabItems.length > 0) {
      const firstId = tabItems[0].id;
      setInternalKey(firstId);
    }
  }, [currentKey, tabItems]);

  const handleSelect = (tabId: string) => {
    if (selectedKey === undefined) {
      setInternalKey(tabId);
    }
    onSelectionChange?.(tabId);
  };

  const getRadiusClasses = () => {
    switch (radius) {
      case 'none':
        return 'rounded-none';
      case 'sm':
        return 'rounded-small';
      case 'md':
        return 'rounded-medium';
      case 'lg':
        return 'rounded-xl';
      case 'full':
      default:
        return 'rounded-full';
    }
  };

  const getInnerRadiusClasses = () => {
    if (variant === 'underlined') return 'rounded-none';
    switch (radius) {
      case 'none':
        return 'rounded-none';
      case 'sm':
        return 'rounded-xs';
      case 'md':
        return 'rounded-small';
      case 'lg':
        return 'rounded-lg';
      case 'full':
      default:
        return 'rounded-full';
    }
  };

  const getContainerStyles = () => {
    switch (variant) {
      case 'bordered':
        return 'p-1 bg-transparent border border-divider';
      case 'light':
        return 'p-1 bg-transparent';
      case 'underlined':
        return 'p-0 bg-transparent border-b border-divider rounded-none gap-4';
      case 'solid':
      default:
        return 'p-1 bg-default-100 dark:bg-content2/80 border border-divider/40 dark:border-white/5';
    }
  };

  const getItemSize = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1 text-xs gap-1.5 min-h-7 font-semibold';
      case 'lg':
        return 'px-5 py-2 text-sm gap-2 min-h-10 font-semibold';
      case 'md':
      default:
        return 'px-4 py-1.5 text-xs sm:text-sm gap-2 min-h-8 font-semibold';
    }
  };

  const getSelectedStyles = () => {
    if (variant === 'underlined') {
      return 'border-b-2 border-primary text-primary font-semibold shadow-none rounded-none -mb-px';
    }
    switch (color) {
      case 'primary':
        return 'bg-primary text-primary-foreground shadow-sm shadow-primary/20 font-semibold';
      case 'secondary':
        return 'bg-secondary text-secondary-foreground shadow-sm shadow-secondary/20 font-semibold';
      case 'success':
        return 'bg-success text-success-foreground shadow-sm shadow-success/20 font-semibold';
      case 'warning':
        return 'bg-warning text-warning-foreground shadow-sm shadow-warning/20 font-semibold';
      case 'danger':
        return 'bg-danger text-danger-foreground shadow-sm shadow-danger/20 font-semibold';
      case 'default':
      default:
        return 'bg-white text-foreground dark:bg-content3 dark:text-white shadow-xs font-semibold';
    }
  };

  const getUnselectedStyles = () => {
    if (variant === 'underlined') {
      return 'text-default-500 hover:text-foreground font-medium';
    }
    return 'text-default-600 dark:text-default-400 hover:text-foreground hover:bg-default-200/50 dark:hover:bg-content3/50 font-medium';
  };

  return (
    <div className={`flex flex-col gap-3 ${fullWidth ? 'w-full' : ''}`}>
      <div
        id={id}
        role="tablist"
        aria-label={ariaLabel}
        className={`inline-flex items-center ${fullWidth ? 'w-full flex' : ''} ${getRadiusClasses()} ${getContainerStyles()} ${className}`}
      >
        {tabItems.map((tab) => {
          const isSelected = String(tab.id) === String(currentKey);
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isSelected}
              disabled={tab.isDisabled}
              onClick={() => handleSelect(tab.id)}
              className={`relative inline-flex items-center justify-center font-sans tracking-tight transition-all duration-200 cursor-pointer select-none outline-none ${fullWidth ? 'flex-1' : ''} ${getInnerRadiusClasses()} ${getItemSize()} ${
                isSelected ? getSelectedStyles() : getUnselectedStyles()
              } ${tab.isDisabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'active:scale-95'}`}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span className="truncate">{tab.title}</span>
              {tab.badge && <span className="shrink-0 ml-1">{tab.badge}</span>}
            </button>
          );
        })}
      </div>

      {/* If children contains Tab content, display the active tab's children */}
      {children && (
        <div className="w-full">
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              const key = child.key ? String(child.key).replace(/^\.\$/, '') : (child.props as any).id || (child.props as any).key;
              if (String(key) === String(currentKey)) {
                return (child.props as any).children;
              }
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
};

HeroTabs.displayName = 'HeroTabs';

export const Tabs = HeroTabs;

export default HeroTabs;

