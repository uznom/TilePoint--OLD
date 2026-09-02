import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useFloatingPlacement } from './useFloatingPlacement';

export interface HeroDatePickerProps {
  id?: string;
  name?: string;
  value?: string | Date;
  defaultValue?: string | Date;
  onChange?: (dateString: string, date: Date | null) => void;
  onValueChange?: (dateString: string) => void;
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
  showMonthAndYearPickers?: boolean;
  showPresets?: boolean;
  presets?: Array<{ label: string; value: () => Date | string }>;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  formatDisplay?: (date: Date) => string;
  className?: string;
  popoverClassName?: string;
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Helper to format a Date into YYYY-MM-DD
function formatToYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to parse string or Date into Date object
function parseToDate(val?: string | Date | null): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'string') {
    if (!val.trim()) return null;
    // Format YYYY-MM-DD
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

export const HeroDatePicker = React.forwardRef<HTMLInputElement, HeroDatePickerProps>(
  (
    {
      id,
      name,
      value: controlledValue,
      defaultValue,
      onChange,
      onValueChange,
      label,
      placeholder = 'Select date',
      description,
      errorMessage,
      isInvalid = false,
      isDisabled = false,
      isRequired = false,
      isReadOnly = false,
      minDate,
      maxDate,
      variant = 'bordered',
      color = 'primary',
      size = 'md',
      radius = 'xl' as any,
      showMonthAndYearPickers = true,
      showPresets = true,
      presets,
      startContent,
      endContent,
      formatDisplay,
      className = '',
      popoverClassName = '',
      placement = 'bottom-start',
    },
    ref
  ) => {
    const isControlled = controlledValue !== undefined;
    const initialDate = parseToDate(isControlled ? controlledValue : defaultValue);

    const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate);
    const [isOpen, setIsOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');

    // Calendar view month & year cursor
    const [viewYear, setViewYear] = useState<number>(() => initialDate ? initialDate.getFullYear() : new Date().getFullYear());
    const [viewMonth, setViewMonth] = useState<number>(() => initialDate ? initialDate.getMonth() : new Date().getMonth());

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const { getPositionClasses } = useFloatingPlacement(containerRef, {
      popoverWidth: 320,
      popoverHeight: 360,
      isOpen,
    });

    // Sync controlled value
    useEffect(() => {
      if (isControlled) {
        const parsed = parseToDate(controlledValue);
        setSelectedDate(parsed);
        if (parsed) {
          setViewYear(parsed.getFullYear());
          setViewMonth(parsed.getMonth());
        }
      }
    }, [controlledValue, isControlled]);

    // Handle outside click dismissal
    useEffect(() => {
      const handleOutsideClick = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
          setViewMode('days');
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

    const handleSelectDate = (d: Date) => {
      if (isDateDisabled(d) || isDisabled || isReadOnly) return;

      const formatted = formatToYMD(d);
      if (!isControlled) {
        setSelectedDate(d);
      }
      onChange?.(formatted, d);
      onValueChange?.(formatted);
      setIsOpen(false);
      setViewMode('days');
    };

    const handleClear = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (isDisabled || isReadOnly) return;
      if (!isControlled) {
        setSelectedDate(null);
      }
      onChange?.('', null);
      onValueChange?.('');
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

    // Calculate calendar grid days
    const calendarDays = useMemo(() => {
      const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

      const days: Array<{ date: Date; isCurrentMonth: boolean; dayNum: number }> = [];

      // Prev month trailing days
      for (let i = firstDayOfMonth - 1; i >= 0; i--) {
        const d = new Date(viewYear, viewMonth - 1, daysInPrevMonth - i);
        days.push({ date: d, isCurrentMonth: false, dayNum: daysInPrevMonth - i });
      }

      // Current month days
      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(viewYear, viewMonth, i);
        days.push({ date: d, isCurrentMonth: true, dayNum: i });
      }

      // Next month leading days (fill 42 cells for clean 6-row grid)
      const remaining = 42 - days.length;
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(viewYear, viewMonth + 1, i);
        days.push({ date: d, isCurrentMonth: false, dayNum: i });
      }

      return days;
    }, [viewYear, viewMonth]);

    const formattedDisplayValue = useMemo(() => {
      if (!selectedDate) return '';
      if (formatDisplay) return formatDisplay(selectedDate);
      return selectedDate.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }, [selectedDate, formatDisplay]);

    // Default presets
    const defaultPresets = useMemo(() => {
      if (presets) return presets;
      return [
        { label: 'Today', value: () => new Date() },
        { label: 'Yesterday', value: () => { const d = new Date(); d.setDate(d.getDate() - 1); return d; } },
        { label: 'Tomorrow', value: () => { const d = new Date(); d.setDate(d.getDate() + 1); return d; } },
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

    const isToday = (d: Date) => {
      const today = new Date();
      return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    };

    const isSelected = (d: Date) => {
      if (!selectedDate) return false;
      return (
        d.getDate() === selectedDate.getDate() &&
        d.getMonth() === selectedDate.getMonth() &&
        d.getFullYear() === selectedDate.getFullYear()
      );
    };

    return (
      <div className={`flex flex-col gap-1 w-full text-left relative select-none ${className}`} ref={containerRef}>
        {/* Label */}
        {label && (
          <label
            htmlFor={id}
            className="text-[11px] font-bold uppercase tracking-wider text-default-600 dark:text-default-400 pl-0.5 flex items-center gap-1 font-mono"
          >
            <span>{label}</span>
            {isRequired && <span className="text-danger font-bold">*</span>}
          </label>
        )}

        {/* Input Trigger Box */}
        <div
          id={id ? `${id}-trigger` : undefined}
          onClick={() => {
            if (!isDisabled && !isReadOnly) {
              setIsOpen(prev => !prev);
              setViewMode('days');
            }
          }}
          className={`relative flex items-center justify-between cursor-pointer transition-all duration-200 font-medium ${sizeClasses} ${radiusClasses} ${variantClasses} ${
            isOpen ? 'ring-2 ring-primary/30 border-primary' : ''
          } ${isInvalid ? 'border-danger ring-danger/20' : ''} ${
            isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
          }`}
        >
          {/* Leading Icon & Display */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {startContent ? (
              startContent
            ) : (
              <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
            )}

            <span className={`truncate ${selectedDate ? 'text-foreground font-semibold font-mono' : 'text-default-400'}`}>
              {formattedDisplayValue || placeholder}
            </span>
          </div>

          {/* Trailing Clear Button & Icon */}
          <div className="flex items-center gap-1 shrink-0">
            {selectedDate && !isDisabled && !isReadOnly && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded-full text-default-400 hover:text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                title="Clear date"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {endContent}
          </div>

          {/* Hidden HTML Input for standard Form submissions */}
          <input
            ref={(node) => {
              inputRef.current = node;
              if (typeof ref === 'function') ref(node);
              else if (ref) (ref as any).current = node;
            }}
            id={id}
            name={name}
            type="hidden"
            value={selectedDate ? formatToYMD(selectedDate) : ''}
            readOnly
          />
        </div>

        {/* Description or Error Message */}
        {errorMessage && isInvalid ? (
          <p className="text-[10px] text-danger font-medium pl-0.5 mt-0.5">{errorMessage}</p>
        ) : description ? (
          <p className="text-[10px] text-default-400 font-medium pl-0.5 mt-0.5 leading-tight">{description}</p>
        ) : null}

        {/* HeroUI Floating Calendar Popover */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className={`absolute ${getPositionClasses()} z-[9999] bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 rounded-2xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.14)] w-[300px] sm:w-[320px] max-w-[calc(100vw-24px)] ${popoverClassName}`}
            >
              {/* Popover Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200/60 dark:border-white/10">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (showMonthAndYearPickers) {
                        setViewMode(curr => curr === 'months' ? 'days' : 'months');
                      }
                    }}
                    className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors font-mono"
                  >
                    {MONTH_NAMES[viewMonth]}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (showMonthAndYearPickers) {
                        setViewMode(curr => curr === 'years' ? 'days' : 'years');
                      }
                    }}
                    className="px-2.5 py-1 rounded-full text-xs font-bold text-primary hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors font-mono"
                  >
                    {viewYear}
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-default-500 hover:text-foreground transition-colors cursor-pointer"
                    title="Previous Month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-default-500 hover:text-foreground transition-colors cursor-pointer"
                    title="Next Month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* MONTH SELECTION GRID VIEW */}
              {viewMode === 'months' && (
                <div className="grid grid-cols-3 gap-2 py-3 animate-fade-in font-mono">
                  {SHORT_MONTHS.map((mName, idx) => (
                    <button
                      key={mName}
                      type="button"
                      onClick={() => {
                        setViewMonth(idx);
                        setViewMode('days');
                      }}
                      className={`py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                        viewMonth === idx
                          ? 'bg-primary text-white shadow-xs'
                          : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-foreground'
                      }`}
                    >
                      {mName}
                    </button>
                  ))}
                </div>
              )}

              {/* YEAR SELECTION GRID VIEW */}
              {viewMode === 'years' && (
                <div className="grid grid-cols-3 gap-2 py-3 max-h-52 overflow-y-auto scrollbar-thin animate-fade-in font-mono">
                  {Array.from({ length: 24 }, (_, i) => viewYear - 10 + i).map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => {
                        setViewYear(yr);
                        setViewMode('days');
                      }}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        viewYear === yr
                          ? 'bg-primary text-white shadow-xs'
                          : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-foreground'
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              )}

              {/* DAYS VIEW */}
              {viewMode === 'days' && (
                <div className="py-2.5">
                  {/* Days of Week Header */}
                  <div className="grid grid-cols-7 gap-1 text-center mb-1">
                    {DAYS_OF_WEEK.map((dName) => (
                      <span key={dName} className="text-[10px] font-bold text-default-400 uppercase font-mono py-1">
                        {dName}
                      </span>
                    ))}
                  </div>

                  {/* Date Cells */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((item, idx) => {
                      const selected = isSelected(item.date);
                      const today = isToday(item.date);
                      const disabled = isDateDisabled(item.date);

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={disabled}
                          onClick={() => handleSelectDate(item.date)}
                          className={`h-8 w-8 mx-auto rounded-full flex items-center justify-center text-xs font-medium font-mono transition-all relative ${
                            selected
                              ? 'bg-primary text-white font-bold shadow-[0_2px_8px_rgba(0,111,238,0.35)] scale-105'
                              : today
                              ? 'text-primary font-bold bg-primary/10 hover:bg-primary/20'
                              : item.isCurrentMonth
                              ? 'text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800'
                              : 'text-default-300 dark:text-zinc-600 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40'
                          } ${disabled ? 'opacity-25 cursor-not-allowed hover:bg-transparent' : 'cursor-pointer'}`}
                        >
                          <span>{item.dayNum}</span>
                          {today && !selected && (
                            <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Presets & Bottom Controls */}
              {showPresets && (
                <div className="pt-2.5 border-t border-zinc-200/60 dark:border-white/10 flex flex-wrap items-center justify-between gap-1.5 font-mono">
                  <div className="flex items-center gap-1 flex-wrap">
                    {defaultPresets.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          const val = p.value();
                          const d = val instanceof Date ? val : parseToDate(val);
                          if (d) handleSelectDate(d);
                        }}
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-primary/15 text-default-600 dark:text-default-300 hover:text-primary transition-colors cursor-pointer"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {selectedDate && (
                    <button
                      type="button"
                      onClick={() => handleClear()}
                      className="px-2 py-1 text-[10px] font-bold text-danger hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

HeroDatePicker.displayName = 'HeroDatePicker';

export default HeroDatePicker;
