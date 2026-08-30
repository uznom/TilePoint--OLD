import React from 'react';
import { ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';

export interface HeroTableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  isStriped?: boolean;
  isCompact?: boolean;
  className?: string;
  containerClassName?: string;
  containerRef?: React.Ref<HTMLDivElement>;
  onScroll?: React.UIEventHandler<HTMLDivElement>;
  children?: React.ReactNode;
  id?: string;
}

export interface HeroTableColumnProps extends Omit<React.ThHTMLAttributes<HTMLTableCellElement>, 'align'> {
  allowsSorting?: boolean;
  sortDirection?: 'ascending' | 'descending' | 'none';
  sortRank?: number | null;
  sortPriority?: number | null;
  onSort?: (e: React.MouseEvent<HTMLTableCellElement>) => void;
  align?: 'start' | 'center' | 'end';
}

export interface HeroTableCellProps extends Omit<React.TdHTMLAttributes<HTMLTableCellElement>, 'align'> {
  align?: 'start' | 'center' | 'end';
}

export const HeroTable: React.FC<HeroTableProps> & {
  Header: React.FC<React.HTMLAttributes<HTMLTableSectionElement>>;
  Body: React.FC<React.HTMLAttributes<HTMLTableSectionElement>>;
  Row: React.FC<React.HTMLAttributes<HTMLTableRowElement> & { isSelected?: boolean; isHoverable?: boolean }>;
  Cell: React.FC<HeroTableCellProps>;
  Column: React.FC<HeroTableColumnProps>;
} = ({
  isStriped = false,
  isCompact = false,
  className = '',
  containerClassName = '',
  containerRef,
  onScroll,
  children,
  id,
  ...props
}) => {
  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className={`w-full overflow-x-auto rounded-large border border-divider bg-content1 shadow-small ${containerClassName}`}
    >
      <table
        id={id}
        className={`w-full text-left border-collapse text-xs font-sans ${
          isStriped ? '[&_tbody_tr:nth-child(even)]:bg-default-50/50 dark:[&_tbody_tr:nth-child(even)]:bg-default-50/10' : ''
        } ${isCompact ? '[&_th]:py-2 [&_th]:px-2.5 [&_td]:py-2 [&_td]:px-2.5' : ''} ${className}`}
        {...props}
      >
        {children}
      </table>
    </div>
  );
};

HeroTable.Header = ({ children, className = '', ...props }) => (
  <thead
    className={`bg-default-100/70 border-b border-divider uppercase tracking-wider text-[10px] font-bold text-default-600 dark:text-default-400 select-none ${className}`}
    {...props}
  >
    {children}
  </thead>
);

HeroTable.Body = ({ children, className = '', ...props }) => (
  <tbody className={`divide-y divide-divider/50 text-foreground ${className}`} {...props}>
    {children}
  </tbody>
);

HeroTable.Row = ({ children, isSelected = false, isHoverable = true, className = '', ...props }) => (
  <tr
    className={`transition-colors duration-100 ${
      isSelected
        ? 'bg-primary-50/70 dark:bg-primary/20 text-primary font-medium'
        : isHoverable
        ? 'hover:bg-default-100/60 dark:hover:bg-default-100/20'
        : ''
    } ${className}`}
    {...props}
  >
    {children}
  </tr>
);

HeroTable.Column = ({
  children,
  allowsSorting = false,
  sortDirection = 'none',
  sortRank,
  sortPriority,
  onSort,
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

  const rank = sortRank ?? sortPriority;

  if (allowsSorting) {
    return (
      <th
        className={`px-4 py-3 font-extrabold ${alignClass} ${
          allowsSorting ? 'cursor-pointer hover:text-primary transition-colors group select-none' : ''
        } ${className}`}
        onClick={onSort}
        role="columnheader"
        aria-sort={
          sortDirection === 'ascending'
            ? 'ascending'
            : sortDirection === 'descending'
            ? 'descending'
            : undefined
        }
        title={allowsSorting ? "Click to sort. Hold Shift + Click for multi-column sort." : undefined}
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
          <span>{children}</span>
          <span className="shrink-0 inline-flex items-center gap-1 transition-colors">
            {sortDirection === 'ascending' ? (
              <>
                <ChevronUp className="h-3.5 w-3.5 text-primary" />
                {rank !== null && rank !== undefined && (
                  <span className="h-4 min-w-4 px-1 rounded-full bg-primary/20 text-primary border border-primary/30 text-[8.5px] font-black flex items-center justify-center">
                    {rank}
                  </span>
                )}
              </>
            ) : sortDirection === 'descending' ? (
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
    <th className={`px-4 py-3 font-extrabold ${alignClass} ${className}`} {...props}>
      {children}
    </th>
  );
};

HeroTable.Cell = ({ children, align = 'start', className = '', ...props }) => {
  const alignClass =
    align === 'center'
      ? 'text-center'
      : align === 'end'
      ? 'text-right'
      : 'text-left';

  return (
    <td className={`px-4 py-3.5 align-middle ${alignClass} ${className}`} {...props}>
      {children}
    </td>
  );
};

export const Table = HeroTable;
export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = (props) => <HeroTable.Header {...props} />;
export const TableColumn: React.FC<HeroTableColumnProps> = (props) => <HeroTable.Column {...props} />;
export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = (props) => <HeroTable.Body {...props} />;
export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement> & { isSelected?: boolean; isHoverable?: boolean }> = (props) => <HeroTable.Row {...props} />;
export const TableCell: React.FC<HeroTableCellProps> = (props) => <HeroTable.Cell {...props} />;

export default HeroTable;
