import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ArrowRight, X } from 'lucide-react';

export interface DateRangeValue {
  start: string;
  end: string;
}

export interface HeroDateRangePickerProps {
  id?: string;
  value?: DateRangeValue;
  defaultValue?: DateRangeValue;
  onChange?: (range: DateRangeValue) => void;
  onValueChange?: (range: DateRangeValue) => void;
  label?: React.ReactNode;
  placeholder?: string;
  description?: React.ReactNode;
  errorMessage?: React.ReactNode;
  isInvalid?: boolean;
  isDisabled?: boolean;
  isRequired?: boolean;
  isReadOnly?: boolean;
  minDate?: string | Date;
  maxDate?: string | Date;
  variant?: 'flat' | 'bordered' | 'faded' | 'underlined';
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  presets?: Array<{ label: string; range: DateRangeValue }>;
  className?: string;
  popoverClassName?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function formatToYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseToDate(val?: string | Date | null): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'string') {
    if (!val.trim()) return null;
    const parts = val.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export const HeroDateRangePicker: React.FC<HeroDateRangePickerProps> = ({
  id,
  value: controlledValue,
  defaultValue = { start: '', end: '' },
  onChange,
  onValueChange,
  label,
  placeholder = 'Select date range',
  description,
  errorMessage,
  isInvalid = false,
  isDisabled = false,
  isRequired = false,
  isReadOnly = false,
  minDate,
  maxDate,
  variant = 'bordered',
  size = 'md',
  radius = 'xl' as any,
  presets,
  className = '',
  popoverClassName = '',
}) => {
  const isControlled = controlledValue !== undefined;
  const initialStart = parseToDate(isControlled ? controlledValue?.start : defaultValue?.start);
  const initialEnd = parseToDate(isControlled ? controlledValue?.end : defaultValue?.end);

  const [startDate, setStartDate] = useState<Date | null>(initialStart);
  const [endDate, setEndDate] = useState<Date | null>(initialEnd);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Month navigation cursor
  const [viewYear, setViewYear] = useState<number>(() => initialStart ? initialStart.getFullYear() : new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => initialStart ? initialStart.getMonth() : new Date().getMonth());

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync controlled value
  useEffect(() => {
    if (isControlled && controlledValue) {
      const pStart = parseToDate(controlledValue.start);
      const pEnd = parseToDate(controlledValue.end);
      setStartDate(pStart);
      setEndDate(pEnd);
      if (pStart) {
        setViewYear(pStart.getFullYear());
        setViewMonth(pStart.getMonth());
      }
    }
  }, [controlledValue, isControlled]);

  // Outside click dismissal
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const minD = useMemo(() => parseToDate(minDate), [minDate]);
  const maxD = useMemo(() => parseToDate(maxDate), [maxDate]);

  const isDateDisabled = useCallback((d: Date): boolean => {
    if (minD) {
      const dMin = new Date(minD.getFullYear(), minD.getMonth(), minD.getDate());
      const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (target < dMin) return true;
    }
    if (maxD) {
      const dMax = new Date(maxD.getFullYear(), maxD.getMonth(), maxD.getDate());
      const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (target > dMax) return true;
    }
    return false;
  }, [minD, maxD]);

  const handleDayClick = (d: Date) => {
    if (isDateDisabled(d) || isDisabled || isReadOnly) return;

    if (!startDate || (startDate && endDate)) {
      // Starting new selection
      setStartDate(d);
      setEndDate(null);
    } else if (startDate && !endDate) {
      // Completing range
      if (d < startDate) {
        const range = { start: formatToYMD(d), end: formatToYMD(startDate) };
        if (!isControlled) {
          setStartDate(d);
          setEndDate(startDate);
        }
        onChange?.(range);
        onValueChange?.(range);
      } else {
        const range = { start: formatToYMD(startDate), end: formatToYMD(d) };
        if (!isControlled) {
          setEndDate(d);
        }
        onChange?.(range);
        onValueChange?.(range);
      }
      setIsOpen(false);
    }
  };

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isDisabled || isReadOnly) return;
    if (!isControlled) {
      setStartDate(null);
      setEndDate(null);
    }
    const empty = { start: '', end: '' };
    onChange?.(empty);
    onValueChange?.(empty);
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  // 42-cell calendar grid
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{ date: Date; isCurrentMonth: boolean; dayNum: number }> = [];

    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth - 1, daysInPrevMonth - i);
      days.push({ date: d, isCurrentMonth: false, dayNum: daysInPrevMonth - i });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(viewYear, viewMonth, i);
      days.push({ date: d, isCurrentMonth: true, dayNum: i });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(viewYear, viewMonth + 1, i);
      days.push({ date: d, isCurrentMonth: false, dayNum: i });
    }

    return days;
  }, [viewYear, viewMonth]);

  const defaultPresets = useMemo(() => {
    if (presets) return presets;
    const now = new Date();
    
    // Today
    const todayStr = formatToYMD(now);

    // Last 7 Days
    const d7 = new Date();
    d7.setDate(d7.getDate() - 6);

    // Last 30 Days
    const d30 = new Date();
    d30.setDate(d30.getDate() - 29);

    // This Month
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return [
      { label: 'Today', range: { start: todayStr, end: todayStr } },
      { label: 'Last 7 Days', range: { start: formatToYMD(d7), end: todayStr } },
      { label: 'Last 30 Days', range: { start: formatToYMD(d30), end: todayStr } },
      { label: 'This Month', range: { start: formatToYMD(thisMonthStart), end: todayStr } },
    ];
  }, [presets]);

  // Size Classes
  const sizeClasses = {
    sm: 'h-8 text-xs px-2.5 gap-1.5',
    md: 'h-10 text-xs px-3.5 gap-2',
    lg: 'h-12 text-sm px-4 gap-2.5'
  }[size];

  // Radius Classes
  const radiusClasses = {
    none: 'rounded-none',
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    xl: 'rounded-2xl',
    full: 'rounded-full'
  }[radius as 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'] || 'rounded-2xl';

  // Variant Classes
  const variantClasses = {
    flat: 'bg-zinc-100 dark:bg-zinc-800/80 border-transparent hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60',
    bordered: 'bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 hover:border-primary/50 shadow-xs',
    faded: 'bg-zinc-100/70 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-white/5',
    underlined: 'bg-transparent border-b-2 border-zinc-200 dark:border-zinc-700 rounded-none px-0'
  }[variant];

  const formatShort = (d: Date) => {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isDayStart = (d: Date) => {
    if (!startDate) return false;
    return d.toDateString() === startDate.toDateString();
  };

  const isDayEnd = (d: Date) => {
    if (!endDate) return false;
    return d.toDateString() === endDate.toDateString();
  };

  const isDayInRange = (d: Date) => {
    const end = endDate || hoverDate;
    if (!startDate || !end) return false;

    const [min, max] = startDate < end ? [startDate, end] : [end, startDate];
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const minClean = new Date(min.getFullYear(), min.getMonth(), min.getDate());
    const maxClean = new Date(max.getFullYear(), max.getMonth(), max.getDate());

    return target > minClean && target < maxClean;
  };

  return (
    <div className={`flex flex-col gap-1 w-full text-left relative select-none ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="text-[11px] font-bold uppercase tracking-wider text-default-600 dark:text-default-400 pl-0.5 flex items-center gap-1 font-mono"
        >
          <span>{label}</span>
          {isRequired && <span className="text-danger font-bold">*</span>}
        </label>
      )}

      {/* Trigger Box */}
      <div
        id={id ? `${id}-trigger` : undefined}
        onClick={() => {
          if (!isDisabled && !isReadOnly) {
            setIsOpen(prev => !prev);
          }
        }}
        className={`relative flex items-center justify-between cursor-pointer transition-all duration-200 font-medium ${sizeClasses} ${radiusClasses} ${variantClasses} ${
          isOpen ? 'ring-2 ring-primary/30 border-primary' : ''
        } ${isInvalid ? 'border-danger ring-danger/20' : ''} ${
          isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <CalendarIcon className="h-4 w-4 text-primary shrink-0" />

          {startDate ? (
            <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-foreground truncate">
              <span>{formatShort(startDate)}</span>
              <ArrowRight className="h-3 w-3 text-default-400 shrink-0" />
              <span>{endDate ? formatShort(endDate) : 'Select end...'}</span>
            </div>
          ) : (
            <span className="text-default-400 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {(startDate || endDate) && !isDisabled && !isReadOnly && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-default-400 hover:text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              title="Clear date range"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {errorMessage && isInvalid ? (
        <p className="text-[10px] text-danger font-medium pl-0.5 mt-0.5">{errorMessage}</p>
      ) : description ? (
        <p className="text-[10px] text-default-400 font-medium pl-0.5 mt-0.5 leading-tight">{description}</p>
      ) : null}

      {/* Range Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute top-full left-0 mt-2 z-50 bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 rounded-2xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.14)] w-[300px] sm:w-[320px] ${popoverClassName}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200/60 dark:border-white/10 font-mono">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-default-500 hover:text-foreground transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-default-500 hover:text-foreground transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Days Grid */}
            <div className="py-2.5">
              <div className="grid grid-cols-7 gap-0 text-center mb-1">
                {DAYS_OF_WEEK.map((dName) => (
                  <span key={dName} className="text-[10px] font-bold text-default-400 uppercase font-mono py-1">
                    {dName}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-y-1">
                {calendarDays.map((item, idx) => {
                  const isStart = isDayStart(item.date);
                  const isEnd = isDayEnd(item.date);
                  const inRange = isDayInRange(item.date);
                  const disabled = isDateDisabled(item.date);

                  return (
                    <div
                      key={idx}
                      className={`relative flex items-center justify-center h-8 ${
                        inRange ? 'bg-primary/10 dark:bg-primary/20' : ''
                      } ${isStart ? 'rounded-l-full bg-primary/10 dark:bg-primary/20' : ''} ${
                        isEnd ? 'rounded-r-full bg-primary/10 dark:bg-primary/20' : ''
                      }`}
                      onMouseEnter={() => {
                        if (startDate && !endDate) {
                          setHoverDate(item.date);
                        }
                      }}
                    >
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => handleDayClick(item.date)}
                        className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-mono font-medium transition-all relative ${
                          isStart || isEnd
                            ? 'bg-primary text-white font-bold shadow-[0_2px_8px_rgba(0,111,238,0.35)] scale-105 z-10'
                            : inRange
                            ? 'text-primary font-bold hover:bg-primary/20'
                            : item.isCurrentMonth
                            ? 'text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800'
                            : 'text-default-300 dark:text-zinc-600 hover:bg-zinc-100/50'
                        } ${disabled ? 'opacity-25 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {item.dayNum}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Range Presets */}
            <div className="pt-2.5 border-t border-zinc-200/60 dark:border-white/10 flex flex-wrap items-center justify-between gap-1.5 font-mono">
              <div className="flex items-center gap-1 flex-wrap">
                {defaultPresets.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      const pStart = parseToDate(p.range.start);
                      const pEnd = parseToDate(p.range.end);
                      if (pStart && pEnd) {
                        if (!isControlled) {
                          setStartDate(pStart);
                          setEndDate(pEnd);
                        }
                        onChange?.(p.range);
                        onValueChange?.(p.range);
                        setIsOpen(false);
                      }
                    }}
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-primary/15 text-default-600 dark:text-default-300 hover:text-primary transition-colors cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => handleClear()}
                  className="px-2 py-1 text-[10px] font-bold text-danger hover:underline cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

HeroDateRangePicker.displayName = 'HeroDateRangePicker';

export default HeroDateRangePicker;
