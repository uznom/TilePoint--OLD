import React, { createContext, useContext, useEffect, useRef } from 'react';
import { ArrowUpDown, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';

export type TableVariant = 'primary' | 'secondary';
export type TableSelectionMode = 'none' | 'single' | 'multiple';
export type TableSortDirection = 'ascending' | 'descending' | 'none';

export interface TableSortDescriptor {
  column?: string | number;
  direction?: 'ascending' | 'descending';
}

interface TableContextType {
  variant?: TableVariant;
  isStriped?: boolean;
  isCompact?: boolean;
  sortDescriptor?: TableSortDescriptor;
  onSortChange?: (descriptor: TableSortDescriptor) => void;
  selectionMode?: TableSelectionMode;
  selectedKeys?: Set<string | number> | 'all';
  onSelectionChange?: (keys: Set<string | number> | 'all') => void;
}

const TableContext = createContext<TableContextType>({
  variant: 'primary',
  isStriped: false,
  isCompact: false,
  selectionMode: 'none',
});

/* -------------------------------------------------------------------------- */
/*                                ROOT TABLE                                  */
/* -------------------------------------------------------------------------- */

export interface HeroTableProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: TableVariant;
  isStriped?: boolean;
  isCompact?: boolean;
  className?: string;
  containerClassName?: string;
  containerRef?: React.Ref<HTMLDivElement>;
  onScroll?: React.UIEventHandler<HTMLDivElement>;
  children?: React.ReactNode;
  id?: string;
}

export const HeroTable = ({
  variant = 'primary',
  isStriped = false,
  isCompact = false,
  className = '',
  containerClassName = '',
  containerRef,
  onScroll,
  children,
  id,
  ...props
}: HeroTableProps) => {
  // Determine if children already contain a Table.ScrollContainer or Table.Content
  const hasSubContainers = React.Children.toArray(children).some(
    (child) =>
      React.isValidElement(child) &&
      (child.type === TableScrollContainer ||
        child.type === TableContent ||
        (child.type as any)?.displayName === 'TableScrollContainer' ||
        (child.type as any)?.displayName === 'TableContent' ||
        (child.type as any)?.displayName === 'TableResizableContainer')
  );

  const contextValue: TableContextType = {
    variant,
    isStriped,
    isCompact,
  };

  const rootVariantClass =
    variant === 'primary'
      ? 'bg-content1 border border-divider/60 rounded-2xl shadow-elevation-card'
      : 'bg-transparent border-0 shadow-none';

  if (hasSubContainers) {
    return (
      <TableContext.Provider value={contextValue}>
        <div
          id={id}
          className={`table-root relative w-full overflow-hidden ${rootVariantClass} ${className}`}
          {...props}
        >
          {children}
        </div>
      </TableContext.Provider>
    );
  }

  // Legacy direct syntax: <HeroTable><HeroTable.Header>...
  return (
    <TableContext.Provider value={contextValue}>
      <div
        id={id}
        ref={containerRef}
        onScroll={onScroll}
        className={`table-root w-full overflow-x-auto rounded-2xl border border-divider/60 bg-content1 shadow-elevation-card ${containerClassName}`}
        {...props}
      >
        <table
          className={`table__content w-full text-left border-collapse text-xs sm:text-sm font-sans tabular-nums ${
            isStriped
              ? '[&_tbody_tr:nth-child(even)]:bg-default-50/50 dark:[&_tbody_tr:nth-child(even)]:bg-white/[0.02]'
              : ''
          } ${
            isCompact
              ? '[&_th]:py-2 [&_th]:px-3 [&_td]:py-2 [&_td]:px-3'
              : '[&_th]:py-3.5 [&_th]:px-4 [&_td]:py-3.5 [&_td]:px-4'
          } ${className}`}
        >
          {children}
        </table>
      </div>
    </TableContext.Provider>
  );
};

/* -------------------------------------------------------------------------- */
/*                            SCROLL CONTAINER                                */
/* -------------------------------------------------------------------------- */

export interface TableScrollContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
}

export const TableScrollContainer: React.FC<TableScrollContainerProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`table__scroll-container w-full overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-divider/40 scrollbar-track-transparent ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
TableScrollContainer.displayName = 'TableScrollContainer';

/* -------------------------------------------------------------------------- */
/*                            RESIZABLE CONTAINER                             */
/* -------------------------------------------------------------------------- */

export const TableResizableContainer: React.FC<TableScrollContainerProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`table__resizable-container w-full overflow-x-auto ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
TableResizableContainer.displayName = 'TableResizableContainer';

/* -------------------------------------------------------------------------- */
/*                              TABLE CONTENT                                 */
/* -------------------------------------------------------------------------- */

export interface TableContentProps extends React.TableHTMLAttributes<HTMLTableElement> {
  'aria-label'?: string;
  sortDescriptor?: TableSortDescriptor;
  onSortChange?: (descriptor: TableSortDescriptor) => void;
  selectionMode?: TableSelectionMode;
  selectedKeys?: Set<string | number> | 'all';
  onSelectionChange?: (keys: Set<string | number> | 'all') => void;
  isStriped?: boolean;
  isCompact?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const TableContent: React.FC<TableContentProps> = ({
  'aria-label': ariaLabel,
  sortDescriptor,
  onSortChange,
  selectionMode = 'none',
  selectedKeys,
  onSelectionChange,
  isStriped,
  isCompact,
  className = '',
  children,
  ...props
}) => {
  const parentContext = useContext(TableContext);

  const effectiveStriped = isStriped !== undefined ? isStriped : parentContext.isStriped;
  const effectiveCompact = isCompact !== undefined ? isCompact : parentContext.isCompact;

  const contentContextValue: TableContextType = {
    ...parentContext,
    isStriped: effectiveStriped,
    isCompact: effectiveCompact,
    sortDescriptor,
    onSortChange,
    selectionMode,
    selectedKeys,
    onSelectionChange,
  };

  return (
    <TableContext.Provider value={contentContextValue}>
      <table
        aria-label={ariaLabel}
        className={`table__content w-full text-left border-collapse text-xs sm:text-sm font-sans tabular-nums ${
          effectiveStriped
            ? '[&_tbody_tr:nth-child(even)]:bg-default-50/50 dark:[&_tbody_tr:nth-child(even)]:bg-white/[0.02]'
            : ''
        } ${
          effectiveCompact
            ? '[&_th]:py-2 [&_th]:px-3 [&_td]:py-2 [&_td]:px-3'
            : '[&_th]:py-3.5 [&_th]:px-4 [&_td]:py-3.5 [&_td]:px-4'
        } ${className}`}
        {...props}
      >
        {children}
      </table>
    </TableContext.Provider>
  );
};
TableContent.displayName = 'TableContent';

/* -------------------------------------------------------------------------- */
/*                               TABLE HEADER                                 */
/* -------------------------------------------------------------------------- */

export interface TableHeaderProps<T = any> extends Omit<React.HTMLAttributes<HTMLTableSectionElement>, 'children'> {
  columns?: T[];
  children?: React.ReactNode | ((column: T) => React.ReactNode);
  className?: string;
}

export const TableHeader = <T = any>({
  columns,
  children,
  className = '',
  ...props
}: TableHeaderProps<T>) => {
  const { variant } = useContext(TableContext);

  const headerClass =
    variant === 'secondary'
      ? 'bg-transparent text-default-500 font-semibold border-b border-divider/40'
      : 'bg-default-100/60 dark:bg-content2/40 border-b border-divider/60 font-semibold text-xs text-default-500';

  let renderedContent: React.ReactNode = children as React.ReactNode;

  if (columns && typeof children === 'function') {
    renderedContent = (
      <tr>
        {columns.map((col, idx) => (
          <React.Fragment key={(col as any)?.id || idx}>
            {(children as (column: T) => React.ReactNode)(col)}
          </React.Fragment>
        ))}
      </tr>
    );
  }

  return (
    <thead
      className={`table__header select-none font-sans tracking-tight ${headerClass} ${className}`}
      {...props}
    >
      {renderedContent}
    </thead>
  );
};
TableHeader.displayName = 'TableHeader';

/* -------------------------------------------------------------------------- */
/*                               TABLE COLUMN                                 */
/* -------------------------------------------------------------------------- */

export interface ColumnRenderProps {
  sortDirection?: 'ascending' | 'descending' | 'none';
}

export interface HeroTableColumnProps extends Omit<React.ThHTMLAttributes<HTMLTableCellElement>, 'align' | 'children'> {
  id?: string;
  isRowHeader?: boolean;
  allowsSorting?: boolean;
  sortDirection?: TableSortDirection;
  sortRank?: number | null;
  sortPriority?: number | null;
  onSort?: (e: React.MouseEvent<HTMLTableCellElement>) => void;
  align?: 'start' | 'center' | 'end';
  defaultWidth?: string | number;
  minWidth?: number;
  children?: React.ReactNode | ((props: ColumnRenderProps) => React.ReactNode);
  className?: string;
}

export const TableColumn: React.FC<HeroTableColumnProps> = ({
  id: colId,
  isRowHeader = false,
  allowsSorting = false,
  sortDirection: explicitSortDirection,
  sortRank,
  sortPriority,
  onSort,
  align = 'start',
  defaultWidth,
  minWidth,
  children,
  className = '',
  style,
  ...props
}) => {
  const { sortDescriptor, onSortChange } = useContext(TableContext);

  // Compute effective sort direction from context descriptor or explicit prop
  let effectiveSortDir: TableSortDirection = 'none';
  if (explicitSortDirection) {
    effectiveSortDir = explicitSortDirection;
  } else if (sortDescriptor && colId && sortDescriptor.column === colId) {
    effectiveSortDir = sortDescriptor.direction || 'ascending';
  }

  const handleColumnClick = (e: React.MouseEvent<HTMLTableCellElement>) => {
    if (onSort) {
      onSort(e);
    } else if (allowsSorting && colId && onSortChange) {
      const nextDir: 'ascending' | 'descending' =
        effectiveSortDir === 'ascending' ? 'descending' : 'ascending';
      onSortChange({ column: colId, direction: nextDir });
    }
  };

  const alignClass =
    align === 'center'
      ? 'text-center'
      : align === 'end'
      ? 'text-right'
      : 'text-left';

  const rank = sortRank ?? sortPriority;

  const content =
    typeof children === 'function'
      ? children({ sortDirection: effectiveSortDir })
      : children;

  const widthStyle: React.CSSProperties = {
    ...style,
    ...(minWidth ? { minWidth: `${minWidth}px` } : {}),
    ...(defaultWidth ? { width: typeof defaultWidth === 'number' ? `${defaultWidth}px` : defaultWidth } : {}),
  };

  if (allowsSorting || onSort) {
    return (
      <th
        scope={isRowHeader ? 'row' : 'col'}
        style={widthStyle}
        className={`table__column px-4 py-3 font-extrabold cursor-pointer hover:text-primary transition-colors group select-none ${alignClass} ${className}`}
        onClick={handleColumnClick}
        role="columnheader"
        aria-sort={
          effectiveSortDir === 'ascending'
            ? 'ascending'
            : effectiveSortDir === 'descending'
            ? 'descending'
            : undefined
        }
        title="Click to sort column"
        {...props}
      >
        <div
          className={`inline-flex items-center gap-1.5 ${
            align === 'center'
              ? 'justify-center'
              : align === 'end'
              ? 'justify-end'
              : 'justify-start'
          }`}
        >
          <span>{content}</span>
          <span className="shrink-0 inline-flex items-center gap-1 transition-colors">
            {effectiveSortDir === 'ascending' ? (
              <>
                <ChevronUp className="h-3.5 w-3.5 text-primary" />
                {rank !== null && rank !== undefined && (
                  <span className="h-4 min-w-4 px-1 rounded-full bg-primary/20 text-primary border border-primary/30 text-[8.5px] font-black flex items-center justify-center">
                    {rank}
                  </span>
                )}
              </>
            ) : effectiveSortDir === 'descending' ? (
              <>
                <ChevronDown className="h-3.5 w-3.5 text-primary" />
                {rank !== null && rank !== undefined && (
                  <span className="h-4 min-w-4 px-1 rounded-full bg-primary/20 text-primary border border-primary/30 text-[8.5px] font-black flex items-center justify-center">
                    {rank}
                  </span>
                )}
              </>
            ) : (
              <ArrowUpDown className="h-3 w-3 text-default-400 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </span>
        </div>
      </th>
    );
  }

  return (
    <th
      scope={isRowHeader ? 'row' : 'col'}
      style={widthStyle}
      className={`table__column px-4 py-3 font-extrabold ${alignClass} ${className}`}
      {...props}
    >
      {content}
    </th>
  );
};
TableColumn.displayName = 'TableColumn';

/* -------------------------------------------------------------------------- */
/*                         SORTABLE COLUMN HEADER                             */
/* -------------------------------------------------------------------------- */

export interface SortableColumnHeaderProps {
  sortDirection?: 'ascending' | 'descending' | 'none';
  showIndicator?: boolean;
  indicator?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const TableSortableColumnHeader: React.FC<SortableColumnHeaderProps> = ({
  sortDirection = 'none',
  showIndicator = true,
  indicator,
  children,
  className = '',
}) => {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span>{children}</span>
      {showIndicator && (
        <span className="shrink-0 inline-flex items-center">
          {indicator ? (
            <span data-direction={sortDirection}>{indicator}</span>
          ) : sortDirection === 'ascending' ? (
            <ChevronUp className="h-3.5 w-3.5 text-primary" />
          ) : sortDirection === 'descending' ? (
            <ChevronDown className="h-3.5 w-3.5 text-primary" />
          ) : (
            <ArrowUpDown className="h-3 w-3 text-default-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </span>
      )}
    </span>
  );
};
TableSortableColumnHeader.displayName = 'TableSortableColumnHeader';

/* -------------------------------------------------------------------------- */
/*                                TABLE BODY                                  */
/* -------------------------------------------------------------------------- */

export interface TableBodyProps<T = any> extends Omit<React.HTMLAttributes<HTMLTableSectionElement>, 'children'> {
  items?: T[];
  renderEmptyState?: () => React.ReactNode;
  children?: React.ReactNode | ((item: T) => React.ReactNode);
  className?: string;
}

export const TableBody = <T = any>({
  items,
  renderEmptyState,
  children,
  className = '',
  ...props
}: TableBodyProps<T>) => {
  const isEmpty = items ? items.length === 0 : false;

  if (isEmpty && renderEmptyState) {
    return (
      <tbody className={`table__body ${className}`} {...props}>
        <tr>
          <td colSpan={100} className="p-8 text-center">
            {renderEmptyState()}
          </td>
        </tr>
      </tbody>
    );
  }

  let renderedContent: React.ReactNode = children as React.ReactNode;

  if (items && typeof children === 'function') {
    renderedContent = items.map((item, idx) => (
      <React.Fragment key={(item as any)?.id || idx}>
        {(children as (item: T) => React.ReactNode)(item)}
      </React.Fragment>
    ));
  }

  return (
    <tbody
      className={`table__body divide-y divide-divider/40 dark:divide-white/5 text-foreground font-sans ${className}`}
      {...props}
    >
      {renderedContent}
    </tbody>
  );
};
TableBody.displayName = 'TableBody';

/* -------------------------------------------------------------------------- */
/*                                TABLE ROW                                   */
/* -------------------------------------------------------------------------- */

export interface HeroTableRowProps extends Omit<React.HTMLAttributes<HTMLTableRowElement>, 'id'> {
  id?: string | number;
  isSelected?: boolean;
  isHoverable?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const TableRow: React.FC<HeroTableRowProps> = ({
  id: rowId,
  isSelected: explicitSelected,
  isHoverable = true,
  className = '',
  children,
  ...props
}) => {
  const { selectedKeys } = useContext(TableContext);

  const isSelected =
    explicitSelected !== undefined
      ? explicitSelected
      : rowId && selectedKeys
      ? selectedKeys === 'all' || selectedKeys.has(rowId)
      : false;

  return (
    <tr
      data-selected={isSelected ? 'true' : undefined}
      data-hovered={isHoverable ? 'true' : undefined}
      className={`table__row transition-colors duration-150 ${
        isSelected
          ? 'bg-primary-50/60 dark:bg-primary/20 text-primary font-medium'
          : isHoverable
          ? 'hover:bg-default-100/50 dark:hover:bg-content2/40'
          : ''
      } ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
};
TableRow.displayName = 'TableRow';

/* -------------------------------------------------------------------------- */
/*                                TABLE CELL                                  */
/* -------------------------------------------------------------------------- */

export interface HeroTableCellProps extends Omit<React.TdHTMLAttributes<HTMLTableCellElement>, 'align'> {
  align?: 'start' | 'center' | 'end';
  className?: string;
  children?: React.ReactNode;
}

export const TableCell: React.FC<HeroTableCellProps> = ({
  children,
  align = 'start',
  className = '',
  ...props
}) => {
  const alignClass =
    align === 'center'
      ? 'text-center'
      : align === 'end'
      ? 'text-right'
      : 'text-left';

  return (
    <td className={`table__cell px-4 py-3.5 align-middle ${alignClass} ${className}`} {...props}>
      {children}
    </td>
  );
};
TableCell.displayName = 'TableCell';

/* -------------------------------------------------------------------------- */
/*                               TABLE FOOTER                                 */
/* -------------------------------------------------------------------------- */

export interface TableFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
}

export const TableFooter: React.FC<TableFooterProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`table__footer flex items-center justify-between px-4 py-3 border-t border-divider/40 bg-default-50/50 dark:bg-content2/20 text-xs text-default-500 font-sans ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
TableFooter.displayName = 'TableFooter';

/* -------------------------------------------------------------------------- */
/*                      ASYNC LOADING & LOAD MORE ITEM                        */
/* -------------------------------------------------------------------------- */

export interface TableLoadMoreProps {
  isLoading?: boolean;
  onLoadMore?: () => void;
  scrollOffset?: number;
  children?: React.ReactNode;
}

export const TableLoadMore: React.FC<TableLoadMoreProps> = ({
  isLoading = false,
  onLoadMore,
  children,
}) => {
  const sentinelRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (!onLoadMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [onLoadMore, isLoading]);

  return (
    <tr ref={sentinelRef} className="table__load-more">
      <td colSpan={100} className="py-4 text-center">
        {children || (
          <div className="inline-flex items-center justify-center gap-2 text-primary font-medium text-xs">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading more...</span>
          </div>
        )}
      </td>
    </tr>
  );
};
TableLoadMore.displayName = 'TableLoadMore';

export const TableLoadMoreContent: React.FC<{ children?: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`table__load-more-content flex items-center justify-center py-2 ${className}`}>
    {children}
  </div>
);
TableLoadMoreContent.displayName = 'TableLoadMoreContent';

/* -------------------------------------------------------------------------- */
/*                             TABLE COLLECTION                               */
/* -------------------------------------------------------------------------- */

export interface TableCollectionProps<T = any> {
  items: T[];
  children: (item: T) => React.ReactNode;
}

export function TableCollection<T>({ items, children }: TableCollectionProps<T>) {
  return <>{items.map((item, idx) => (
    <React.Fragment key={(item as any)?.id || idx}>
      {children(item)}
    </React.Fragment>
  ))}</>;
}
TableCollection.displayName = 'TableCollection';

/* -------------------------------------------------------------------------- */
/*                            COLUMN RESIZER                                  */
/* -------------------------------------------------------------------------- */

export const TableColumnResizer: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`table__column-resizer absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary transition-colors ${className}`}
  />
);
TableColumnResizer.displayName = 'TableColumnResizer';

/* -------------------------------------------------------------------------- */
/*                        COMPOUND EXPORT MAPPING                             */
/* -------------------------------------------------------------------------- */

HeroTable.ScrollContainer = TableScrollContainer;
HeroTable.ResizableContainer = TableResizableContainer;
HeroTable.Content = TableContent;
HeroTable.Header = TableHeader;
HeroTable.Column = TableColumn;
HeroTable.SortableColumnHeader = TableSortableColumnHeader;
HeroTable.Body = TableBody;
HeroTable.Row = TableRow;
HeroTable.Cell = TableCell;
HeroTable.Footer = TableFooter;
HeroTable.LoadMore = TableLoadMore;
HeroTable.LoadMoreContent = TableLoadMoreContent;
HeroTable.Collection = TableCollection;
HeroTable.ColumnResizer = TableColumnResizer;

export const Table = HeroTable;
export default HeroTable;
