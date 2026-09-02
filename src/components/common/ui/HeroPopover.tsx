import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';

export type HeroPopoverPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface HeroPopoverProps {
  trigger: React.ReactNode;
  content: React.ReactNode;
  placement?: HeroPopoverPlacement;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  id?: string;
}

export const HeroPopover: React.FC<HeroPopoverProps> = ({
  trigger,
  content,
  placement = 'bottom',
  isOpen,
  onOpenChange,
  className = '',
  id,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isControlled = isOpen !== undefined;
  const show = isControlled ? isOpen : internalOpen;

  const setOpen = React.useCallback((val: boolean) => {
    if (!isControlled) setInternalOpen(val);
    onOpenChange?.(val);
  }, [isControlled, onOpenChange]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (show) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [show, setOpen]);

  const getPositionClasses = () => {
    switch (placement) {
      case 'top':
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
      case 'bottom':
      default:
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
    }
  };

  return (
    <div ref={containerRef} id={id} className="relative inline-block">
      <div onClick={() => setOpen(!show)} className="inline-block cursor-pointer">
        {trigger}
      </div>

      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-[9999] max-w-[calc(100vw-24px)] p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.14)] min-w-48 text-foreground backdrop-blur-md ${getPositionClasses()} ${className}`}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HeroPopover;
