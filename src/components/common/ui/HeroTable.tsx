import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { HeroCheckbox } from './HeroCheckbox';

export type TableVariant = 'primary' | 'secondary';
export type TableSelectionMode = 'none' | 'single' | 'multiple';
export type TableSortDirection = 'ascending' | 'descending' | 'none';

export interface TableSortDescriptor {
  column?: string | number;
  direction?: 'ascending' | 'descending';
}

/* -------------------------------------------------------------------------- */
/*                               CONTEXT SETUP                                */
/* -------------------------------------------------------------------------- */

interface TableContextType {
  variant?: TableVariant;
  isStriped?: boolean;
  isCompact?: boolean;
  sortDescriptor?: TableSortDescriptor;
  onSortChange?: (descriptor: TableSortDescriptor) => void;
  selectionMode?: TableSelectionMode;
  selectedKeys?: Set<string | number> | 'all';
  onSelectionChange?: (keys: Set<string | number> | 'all') => void;
  allRowKeys?: (string | number)[];
  registerRowKey?: (key: string | number) => void;
  unregisterRowKey?: (key: string | number) => void;
  expandedKeys?: Set<string | number>;
  onExpandedChange?: (keys: Set<string | number>) => void;
  columnWidths?: Record<string, number>;
  setColumnWidth?: (columnId: string, width: number) => void;
}

const TableContext = createContext<TableContextType>({
  variant: 'primary',
  isStriped: false,
  isCompact: false,
  selectionMode: 'none',
});

export const useTableContext = () => useContext(TableContext);

/* -------------------------------------------------------------------------- */
/*                                ROOT TABLE                                  */
/* -------------------------------------------------------------------------- */

export interface HeroTableProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: TableVariant;
  isStriped?: boolean;
  isCompact?: boolean;
  sortDescriptor?: TableSortDescriptor;
  onSortChange?: (descriptor: TableSortDescriptor) => void;
  selectionMode?: TableSelectionMode;
  selectedKeys?: Set<string | number> | 'all';
  onSelectionChange?: (keys: Set<string | number> | 'all') => void;
  expandedKeys?: Set<string | number>;
  onExpandedChange?: (keys: Set<string | number>) => void;
  className?: string;
  containerClassName?: string;
  containerRef?: React.Ref<HTMLDivElement>;
  onScroll?: React.UIEventHandler<HTMLDivElement>;
  children?: React.ReactNode;
  id?: string;
}

export const HeroTable = ({
  variant = 'secondary',
  isStriped = false,
  isCompact = false,
  sortDescriptor,
  onSortChange,
  selectionMode = 'none',
  selectedKeys,
  onSelectionChange,
  expandedKeys,
  onExpandedChange,
  className = '',
  containerClassName = '',
  containerRef,
  onScroll,
  children,
  id,
  ...props
}: HeroTableProps) => {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [rowKeys, setRowKeys] = useState<(string | number)[]>([]);

  const handleSetColumnWidth = useCallback((columnId: string, width: number) => {
    setColumnWidths((prev) => ({ ...prev, [columnId]: width }));
  }, []);

  const registerRowKey = useCallback((key: string | number) => {
    setRowKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
  }, []);

  const unregisterRowKey = useCallback((key: string | number) => {
    setRowKeys((prev) => prev.filter((k) => k !== key));
  }, []);

  const contextValue: TableContextType = {
    variant,
    isStriped,
    isCompact,
    sortDescriptor,
    onSortChange,
    selectionMode,
    selectedKeys,
    onSelectionChange,
    allRowKeys: rowKeys,
    registerRowKey,
    unregisterRowKey,
    expandedKeys,
    onExpandedChange,
    columnWidths,
    setColumnWidth: handleSetColumnWidth,
  };

  // Determine if children already contain a Table.ScrollContainer, Table.Content, or Table.ResizableContainer
  const hasSubContainers = React.Children.toArray(children).some(
    (child) =>
      React.isValidElement(child) &&
      (child.type === TableScrollContainer ||
        child.type === TableContent ||
        (child.type as any)?.displayName === 'TableScrollContainer' ||
        (child.type as any)?.displayName === 'TableContent' ||
        (child.type as any)?.displayName === 'TableResizableContainer')
  );

  const rootVariantClass =
    variant === 'primary'
      ? 'table-root--primary'
      : 'table-root--secondary';

  if (hasSubContainers) {
    return (
      <TableContext.Provider value={contextValue}>
        <div
          id={id}
          className={`table-root ${rootVariantClass} ${className}`}
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
        className={`table-root ${rootVariantClass} ${containerClassName}`}
        {...props}
      >
        <div className="table__scroll-container">
          <table
            className={`table__content ${
              isStriped
                ? '[&_tbody_tr:nth-child(even)]:bg-default-50/50 dark:[&_tbody_tr:nth-child(even)]:bg-white/[0.02]'
                : ''
            } ${
              isCompact
                ? '[&_th]:py-2 [&_th]:px-3 [&_td]:py-2 [&_td]:px-3'
                : ''
            } ${className}`}
          >
            {children}
          </table>
        </div>
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
      className={`table__scroll-container ${className}`}
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
      className={`table__resizable-container ${className}`}
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
  expandedKeys?: Set<string | number>;
  onExpandedChange?: (keys: Set<string | number>) => void;
  isStriped?: boolean;
  isCompact?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const TableContent: React.FC<TableContentProps> = ({
  'aria-label': ariaLabel,
  sortDescriptor,
  onSortChange,
  selectionMode,
  selectedKeys,
  onSelectionChange,
  expandedKeys,
  onExpandedChange,
  isStriped,
  isCompact,
  className = '',
  children,
  ...props
}) => {
  const parentContext = useContext(TableContext);

  const effectiveStriped = isStriped !== undefined ? isStriped : parentContext.isStriped;
  const effectiveCompact = isCompact !== undefined ? isCompact : parentContext.isCompact;
  const effectiveSortDesc = sortDescriptor !== undefined ? sortDescriptor : parentContext.sortDescriptor;
  const effectiveOnSortChange = onSortChange !== undefined ? onSortChange : parentContext.onSortChange;
  const effectiveSelectionMode = selectionMode !== undefined ? selectionMode : parentContext.selectionMode;
  const effectiveSelectedKeys = selectedKeys !== undefined ? selectedKeys : parentContext.selectedKeys;
  const effectiveOnSelectionChange = onSelectionChange !== undefined ? onSelectionChange : parentContext.onSelectionChange;
  const effectiveExpandedKeys = expandedKeys !== undefined ? expandedKeys : parentContext.expandedKeys;
  const effectiveOnExpandedChange = onExpandedChange !== undefined ? onExpandedChange : parentContext.onExpandedChange;

  const contentContextValue: TableContextType = {
    ...parentContext,
    isStriped: effectiveStriped,
    isCompact: effectiveCompact,
    sortDescriptor: effectiveSortDesc,
    onSortChange: effectiveOnSortChange,
    selectionMode: effectiveSelectionMode,
    selectedKeys: effectiveSelectedKeys,
    onSelectionChange: effectiveOnSelectionChange,
    expandedKeys: effectiveExpandedKeys,
    onExpandedChange: effectiveOnExpandedChange,
  };

  return (
    <TableContext.Provider value={contentContextValue}>
      <table
        aria-label={ariaLabel}
        className={`table__content ${
          effectiveStriped
            ? '[&_tbody_tr:nth-child(even)]:bg-default-50/50 dark:[&_tbody_tr:nth-child(even)]:bg-white/[0.02]'
            : ''
        } ${
          effectiveCompact
            ? '[&_th]:py-2 [&_th]:px-3 [&_td]:py-2 [&_td]:px-3'
            : ''
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
  let renderedContent: React.ReactNode;

  if (columns && typeof children === 'function') {
    renderedContent = (
      <tr className="table__header-row">
        {columns.map((col, idx) => (
          <React.Fragment key={(col as any)?.id || idx}>
            {(children as (column: T) => React.ReactNode)(col)}
          </React.Fragment>
        ))}
      </tr>
    );
  } else {
    // In HTML, <th> elements MUST be enclosed inside a <tr> under <thead>
    const isSingleTr =
      React.isValidElement(children) &&
      (children.type === 'tr' || (children.type as any)?.displayName === 'TableRow');

    if (isSingleTr) {
      renderedContent = children as React.ReactNode;
    } else {
      renderedContent = <tr className="table__header-row">{children as React.ReactNode}</tr>;
    }
  }

  return (
    <thead
      className={`table__header select-none font-sans ${className}`}
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
  allowsResizing?: boolean;
  sortDirection?: TableSortDirection;
  sortRank?: number | null;
  sortPriority?: number | null;
  onSort?: (e: React.MouseEvent<HTMLTableCellElement>) => void;
  align?: 'start' | 'center' | 'end';
  defaultWidth?: string | number;
  minWidth?: number;
  treeColumn?: boolean;
  children?: React.ReactNode | ((props: ColumnRenderProps) => React.ReactNode);
  className?: string;
}

export const TableColumn: React.FC<HeroTableColumnProps> = ({
  id: colId,
  isRowHeader = false,
  allowsSorting = false,
  allowsResizing = false,
  sortDirection: explicitSortDirection,
  sortRank,
  sortPriority,
  onSort,
  align = 'start',
  defaultWidth,
  minWidth = 50,
  treeColumn = false,
  children,
  className = '',
  style,
  ...props
}) => {
  const { sortDescriptor, onSortChange, columnWidths, setColumnWidth } = useContext(TableContext);

  // Dynamic width tracking from column resizing
  const currentWidth = colId && columnWidths && columnWidths[colId] !== undefined
    ? columnWidths[colId]
    : undefined;

  // Compute effective sort direction from context descriptor or explicit prop
  let effectiveSortDir: TableSortDirection = 'none';
  if (explicitSortDirection) {
    effectiveSortDir = explicitSortDirection;
  } else if (sortDescriptor && colId && sortDescriptor.column === colId) {
    effectiveSortDir = sortDescriptor.direction || 'ascending';
  }

  const handleColumnClick = (e: React.MouseEvent<HTMLTableCellElement>) => {
    // Avoid sort trigger if clicking the resizer handle
    if ((e.target as HTMLElement)?.closest('.table__column-resizer')) {
      return;
    }

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
    ...(currentWidth
      ? { width: `${currentWidth}px`, maxWidth: `${currentWidth}px` }
      : defaultWidth
      ? { width: typeof defaultWidth === 'number' ? `${defaultWidth}px` : defaultWidth }
      : {}),
  };

  return (
    <th
      scope={isRowHeader ? 'row' : 'col'}
      style={widthStyle}
      data-allows-sorting={allowsSorting || onSort ? 'true' : undefined}
      data-tree-column={treeColumn ? 'true' : undefined}
      className={`table__column font-medium group select-none ${alignClass} ${className}`}
      onClick={allowsSorting || onSort ? handleColumnClick : undefined}
      role="columnheader"
      aria-sort={
        effectiveSortDir === 'ascending'
          ? 'ascending'
          : effectiveSortDir === 'descending'
          ? 'descending'
          : undefined
      }
      {...props}
    >
      <div
        className={`inline-flex items-center gap-1.5 w-full ${
          align === 'center'
            ? 'justify-center'
            : align === 'end'
            ? 'justify-end'
            : 'justify-between'
        }`}
      >
        <span className="truncate">{content}</span>

        {(allowsSorting || onSort) && (
          <span className="shrink-0 inline-flex items-center gap-1 text-default-400 group-hover:text-foreground transition-colors">
            {effectiveSortDir === 'ascending' ? (
              <>
                <ChevronUp className="h-3.5 w-3.5 text-primary" />
                {rank !== null && rank !== undefined && (
                  <span className="h-3.5 min-w-3.5 px-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 text-[8px] font-black flex items-center justify-center">
                    {rank}
                  </span>
                )}
              </>
            ) : effectiveSortDir === 'descending' ? (
              <>
                <ChevronDown className="h-3.5 w-3.5 text-primary" />
                {rank !== null && rank !== undefined && (
                  <span className="h-3.5 min-w-3.5 px-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 text-[8px] font-black flex items-center justify-center">
                    {rank}
                  </span>
                )}
              </>
            ) : (
              <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
            )}
          </span>
        )}
      </div>

      {allowsResizing && colId && setColumnWidth && (
        <TableColumnResizer
          columnId={colId}
          minWidth={minWidth}
        />
      )}
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
    <span className={`table__sortable-column-header w-full ${className}`}>
      <span>{children}</span>
      {showIndicator && (
        <span
          className="table__sortable-column-indicator"
          data-direction={sortDirection === 'descending' ? 'descending' : 'ascending'}
        >
          {indicator || (
            <ChevronUp className="h-3 w-3 text-muted group-hover:text-foreground" />
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
  isLoading?: boolean;
  loadingContent?: React.ReactNode;
  children?: React.ReactNode | ((item: T) => React.ReactNode);
  className?: string;
}

export const TableBody = <T = any>({
  items,
  renderEmptyState,
  isLoading = false,
  loadingContent,
  children,
  className = '',
  ...props
}: TableBodyProps<T>) => {
  if (isLoading) {
    return (
      <tbody className={`table__body ${className}`} {...props}>
        <tr>
          <td colSpan={100} className="p-8 text-center">
            {loadingContent || (
              <div className="flex flex-col items-center justify-center gap-2 text-default-500 py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs font-medium">Loading records...</span>
              </div>
            )}
          </td>
        </tr>
      </tbody>
    );
  }

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
      <React.Fragment key={(item as any)?.id || (item as any)?.key || idx}>
        {(children as (item: T) => React.ReactNode)(item)}
      </React.Fragment>
    ));
  }

  return (
    <tbody
      className={`table__body ${className}`}
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
  isExpanded?: boolean;
  expandedContent?: React.ReactNode;
  level?: number;
  className?: string;
  children?: React.ReactNode;
}

export const TableRow: React.FC<HeroTableRowProps> = ({
  id: rowId,
  isSelected: explicitSelected,
  isHoverable = true,
  isExpanded: explicitExpanded,
  expandedContent,
  level = 1,
  className = '',
  children,
  ...props
}) => {
  const {
    selectedKeys,
    registerRowKey,
    unregisterRowKey,
    expandedKeys,
  } = useContext(TableContext);

  useEffect(() => {
    if (rowId !== undefined && registerRowKey) {
      registerRowKey(rowId);
      return () => {
        if (unregisterRowKey) unregisterRowKey(rowId);
      };
    }
  }, [rowId, registerRowKey, unregisterRowKey]);

  const isSelected =
    explicitSelected !== undefined
      ? explicitSelected
      : rowId !== undefined && selectedKeys
      ? selectedKeys === 'all' || selectedKeys.has(rowId)
      : false;

  const isExpanded =
    explicitExpanded !== undefined
      ? explicitExpanded
      : rowId !== undefined && expandedKeys
      ? expandedKeys.has(rowId)
      : false;

  return (
    <>
      <tr
        data-selected={isSelected ? 'true' : undefined}
        data-hovered={isHoverable ? 'true' : undefined}
        style={{ '--table-row-level': level } as React.CSSProperties}
        className={`table__row ${className}`}
        {...props}
      >
        {children}
      </tr>

      {isExpanded && expandedContent && (
        <tr className="table__row bg-default-50/40 dark:bg-zinc-900/40">
          <td colSpan={100} className="p-4 border-b border-separator/50">
            {expandedContent}
          </td>
        </tr>
      )}
    </>
  );
};
TableRow.displayName = 'TableRow';

/* -------------------------------------------------------------------------- */
/*                                TABLE CELL                                  */
/* -------------------------------------------------------------------------- */

export interface HeroTableCellProps extends Omit<React.TdHTMLAttributes<HTMLTableCellElement>, 'align'> {
  align?: 'start' | 'center' | 'end';
  treeColumn?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const TableCell: React.FC<HeroTableCellProps> = ({
  children,
  align = 'start',
  treeColumn = false,
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
    <td
      data-tree-column={treeColumn ? 'true' : undefined}
      className={`table__cell ${alignClass} ${className}`}
      {...props}
    >
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
      className={`table__footer ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
TableFooter.displayName = 'TableFooter';

/* -------------------------------------------------------------------------- */
/*                            COLUMN RESIZER                                  */
/* -------------------------------------------------------------------------- */

export interface TableColumnResizerProps {
  columnId?: string;
  minWidth?: number;
  onResize?: (width: number) => void;
  className?: string;
}

export const TableColumnResizer: React.FC<TableColumnResizerProps> = ({
  columnId,
  minWidth = 50,
  onResize,
  className = '',
}) => {
  const { setColumnWidth } = useContext(TableContext);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const thElement = (e.currentTarget as HTMLElement).closest('th');
    if (!thElement) return;

    const startX = e.clientX;
    const startWidth = thElement.getBoundingClientRect().width;

    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(minWidth, Math.round(startWidth + deltaX));

      if (onResize) {
        onResize(newWidth);
      }
      if (columnId && setColumnWidth) {
        setColumnWidth(columnId, newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      data-resizing={isResizing ? 'true' : undefined}
      onMouseDown={handleMouseDown}
      className={`table__column-resizer ${className}`}
      title="Drag to resize column"
    />
  );
};
TableColumnResizer.displayName = 'TableColumnResizer';

/* -------------------------------------------------------------------------- */
/*                        HEROUI CHECKBOX (SELECTION)                         */
/* -------------------------------------------------------------------------- */

export interface TableCheckboxProps {
  isSelected?: boolean;
  isIndeterminate?: boolean;
  onChange?: (checked: boolean) => void;
  'aria-label'?: string;
  className?: string;
}

export const TableCheckbox: React.FC<TableCheckboxProps> = ({
  isSelected = false,
  isIndeterminate = false,
  onChange,
  'aria-label': ariaLabel = 'Select row',
  className = '',
}) => {
  return (
    <div
      className={`inline-flex items-center justify-center p-0.5 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <HeroCheckbox
        isSelected={isSelected}
        isIndeterminate={isIndeterminate}
        onValueChange={onChange}
        aria-label={ariaLabel}
        size="sm"
      />
    </div>
  );
};
TableCheckbox.displayName = 'TableCheckbox';

/* -------------------------------------------------------------------------- */
/*                       HEADER SELECT-ALL CHECKBOX                           */
/* -------------------------------------------------------------------------- */

export const TableSelectAllCheckbox: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { selectionMode, selectedKeys, onSelectionChange, allRowKeys = [] } = useContext(TableContext);

  if (selectionMode !== 'multiple') return null;

  const isAllSelected =
    selectedKeys === 'all' ||
    (allRowKeys.length > 0 &&
      selectedKeys instanceof Set &&
      allRowKeys.every((key) => selectedKeys.has(key)));

  const isSomeSelected =
    !isAllSelected &&
    selectedKeys instanceof Set &&
    selectedKeys.size > 0;

  const handleToggleAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange('all');
    } else {
      onSelectionChange(new Set());
    }
  };

  return (
    <TableCheckbox
      isSelected={isAllSelected}
      isIndeterminate={isSomeSelected}
      onChange={handleToggleAll}
      aria-label="Select all rows"
      className={className}
    />
  );
};
TableSelectAllCheckbox.displayName = 'TableSelectAllCheckbox';

/* -------------------------------------------------------------------------- */
/*                        ROW SELECTION CHECKBOX CELL                         */
/* -------------------------------------------------------------------------- */

export const TableSelectRowCell: React.FC<{ rowId: string | number; className?: string }> = ({
  rowId,
  className = '',
}) => {
  const { selectionMode, selectedKeys, onSelectionChange, allRowKeys = [] } = useContext(TableContext);

  if (selectionMode === 'none') return null;

  const isSelected =
    selectedKeys === 'all' ||
    (selectedKeys instanceof Set && selectedKeys.has(rowId));

  const handleToggleRow = (checked: boolean) => {
    if (!onSelectionChange) return;

    if (selectionMode === 'single') {
      onSelectionChange(checked ? new Set([rowId]) : new Set());
      return;
    }

    const next = new Set<string | number>(
      selectedKeys === 'all' ? allRowKeys : selectedKeys ? Array.from(selectedKeys) : []
    );

    if (checked) {
      next.add(rowId);
    } else {
      next.delete(rowId);
    }
    onSelectionChange(next);
  };

  return (
    <TableCell className={`w-10 px-3 py-3 text-center ${className}`}>
      <TableCheckbox
        isSelected={isSelected}
        onChange={handleToggleRow}
        aria-label={`Select row ${rowId}`}
      />
    </TableCell>
  );
};
TableSelectRowCell.displayName = 'TableSelectRowCell';

/* -------------------------------------------------------------------------- */
/*                       EXPAND / COLLAPSE BUTTON                             */
/* -------------------------------------------------------------------------- */

export interface TableExpandButtonProps {
  rowId?: string | number;
  isExpanded?: boolean;
  onToggle?: () => void;
  className?: string;
}

export const TableExpandButton: React.FC<TableExpandButtonProps> = ({
  rowId,
  isExpanded: explicitExpanded,
  onToggle,
  className = '',
}) => {
  const { expandedKeys, onExpandedChange } = useContext(TableContext);

  const isExpanded =
    explicitExpanded !== undefined
      ? explicitExpanded
      : rowId !== undefined && expandedKeys
      ? expandedKeys.has(rowId)
      : false;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggle) {
      onToggle();
    } else if (rowId !== undefined && onExpandedChange) {
      const next = new Set<string | number>(expandedKeys ? Array.from(expandedKeys) : []);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      onExpandedChange(next);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-expanded={isExpanded}
      className={`p-1 rounded-md text-default-400 hover:text-foreground hover:bg-default-100 transition-all cursor-pointer inline-flex items-center justify-center ${className}`}
      title={isExpanded ? 'Collapse row' : 'Expand row'}
    >
      <ChevronRight
        className={`h-3.5 w-3.5 transition-transform duration-150 ${
          isExpanded ? 'rotate-90 text-primary' : ''
        }`}
      />
    </button>
  );
};
TableExpandButton.displayName = 'TableExpandButton';

/* -------------------------------------------------------------------------- */
/*                              TABLE PAGINATION                              */
/* -------------------------------------------------------------------------- */

export interface TablePaginationProps {
  page: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  page,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
  className = '',
}) => {
  const startItem = totalItems && pageSize ? (page - 1) * pageSize + 1 : undefined;
  const endItem = totalItems && pageSize ? Math.min(page * pageSize, totalItems) : undefined;

  // Build pagination range with ellipses
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    if (page > 3) pages.push('ellipsis');

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    for (let i = start; i <= end; i++) pages.push(i);

    if (page < totalPages - 2) pages.push('ellipsis');
    pages.push(totalPages);

    return pages;
  };

  return (
    <div className={`table__footer flex flex-wrap items-center justify-between gap-3 text-xs text-default-500 font-sans ${className}`}>
      {/* Left count indicator */}
      <div className="flex items-center gap-2">
        {totalItems !== undefined && startItem !== undefined && endItem !== undefined ? (
          <span>
            Showing <strong className="text-foreground">{startItem}</strong>–
            <strong className="text-foreground">{endItem}</strong> of{' '}
            <strong className="text-foreground">{totalItems}</strong> items
          </span>
        ) : (
          <span>
            Page <strong className="text-foreground">{page}</strong> of{' '}
            <strong className="text-foreground">{totalPages}</strong>
          </span>
        )}

        {pageSize && onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-[11px]">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-default-100 dark:bg-zinc-800 border border-divider/40 rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right navigation buttons */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="p-1.5 rounded-lg border border-divider/40 bg-surface text-default-600 hover:text-foreground hover:bg-default-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
          title="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-center gap-1 px-1">
          {getPageNumbers().map((p, idx) =>
            p === 'ellipsis' ? (
              <span key={`ellipsis-${idx}`} className="px-1 text-default-400 select-none">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`min-w-7 h-7 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  p === page
                    ? 'bg-primary text-primary-foreground font-bold shadow-2xs'
                    : 'text-default-600 hover:text-foreground hover:bg-default-100'
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="p-1.5 rounded-lg border border-divider/40 bg-surface text-default-600 hover:text-foreground hover:bg-default-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
          title="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
TablePagination.displayName = 'TablePagination';

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
  return (
    <>
      {items.map((item, idx) => (
        <React.Fragment key={(item as any)?.id || (item as any)?.key || idx}>
          {children(item)}
        </React.Fragment>
      ))}
    </>
  );
}
TableCollection.displayName = 'TableCollection';

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
HeroTable.Checkbox = TableCheckbox;
HeroTable.SelectAllCheckbox = TableSelectAllCheckbox;
HeroTable.SelectRowCell = TableSelectRowCell;
HeroTable.ExpandButton = TableExpandButton;
HeroTable.Pagination = TablePagination;

export const Table = HeroTable;
export default HeroTable;
