import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';

export type HeroDrawerPlacement = 'left' | 'right' | 'top' | 'bottom';
export type HeroDrawerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface HeroDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  placement?: HeroDrawerPlacement;
  size?: HeroDrawerSize;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  isDismissable?: boolean;
  className?: string;
  id?: string;
}

export const HeroDrawer: React.FC<HeroDrawerProps> = ({
  isOpen,
  onClose,
  title,
  description,
  placement = 'right',
  size = 'md',
  children,
  footer,
  isDismissable = true,
  className = '',
  id,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDismissable && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, isDismissable, onClose]);

  const getSizeClasses = () => {
    const isHorizontal = placement === 'left' || placement === 'right';
    switch (size) {
      case 'xs':
        return isHorizontal ? 'max-w-xs' : 'max-h-48';
      case 'sm':
        return isHorizontal ? 'max-w-sm' : 'max-h-72';
      case 'lg':
        return isHorizontal ? 'max-w-xl' : 'max-h-[75vh]';
      case 'xl':
        return isHorizontal ? 'max-w-2xl' : 'max-h-[85vh]';
      case 'full':
        return isHorizontal ? 'max-w-full' : 'max-h-full';
      case 'md':
      default:
        return isHorizontal ? 'max-w-md' : 'max-h-[50vh]';
    }
  };

  const getPlacementAnimation = () => {
    switch (placement) {
      case 'left':
        return {
          initial: { x: '-100%', opacity: 0 },
          animate: { x: 0, opacity: 1 },
          exit: { x: '-100%', opacity: 0 },
          position: 'inset-y-0 left-0 h-full',
        };
      case 'top':
        return {
          initial: { y: '-100%', opacity: 0 },
          animate: { y: 0, opacity: 1 },
          exit: { y: '-100%', opacity: 0 },
          position: 'inset-x-0 top-0 w-full',
        };
      case 'bottom':
        return {
          initial: { y: '100%', opacity: 0 },
          animate: { y: 0, opacity: 1 },
          exit: { y: '100%', opacity: 0 },
          position: 'inset-x-0 bottom-0 w-full',
        };
      case 'right':
      default:
        return {
          initial: { x: '100%', opacity: 0 },
          animate: { x: 0, opacity: 1 },
          exit: { x: '100%', opacity: 0 },
          position: 'inset-y-0 right-0 h-full',
        };
    }
  };

  const anim = getPlacementAnimation();

  const drawerContent = (
    <AnimatePresence>
      {isOpen && (
        <div id={id} data-slot="drawer" className="drawer fixed inset-0 z-[10000] flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={isDismissable ? onClose : undefined}
            data-slot="backdrop"
            className="drawer__backdrop fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md"
          />

          {/* Drawer Container */}
          <motion.div
            initial={anim.initial}
            animate={anim.animate}
            exit={anim.exit}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            data-slot="dialog"
            className={`drawer__dialog fixed ${anim.position} w-full ${getSizeClasses()} bg-content1 border-divider shadow-2xl flex flex-col z-10 overflow-hidden ${
              placement === 'left'
                ? 'border-r'
                : placement === 'right'
                ? 'border-l'
                : placement === 'top'
                ? 'border-b'
                : 'border-t'
            } ${className}`}
          >
            {/* Header */}
            {(title || isDismissable) && (
              <div data-slot="header" className="drawer__header p-4 sm:p-5 border-b border-divider flex items-center justify-between gap-3 bg-content1">
                <div className="flex flex-col min-w-0">
                  {title && (
                    <h3 data-slot="title" className="text-sm font-black uppercase tracking-wider text-foreground truncate">
                      {title}
                    </h3>
                  )}
                  {description && (
                    <p data-slot="description" className="text-xs text-default-400 mt-0.5 truncate">{description}</p>
                  )}
                </div>
                {isDismissable && (
                  <button
                    type="button"
                    data-slot="close-button"
                    onClick={onClose}
                    className="p-1 rounded-full text-default-400 hover:text-default-700 dark:hover:text-default-200 hover:bg-default-100 transition-colors cursor-pointer"
                    aria-label="Close drawer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Body */}
            <div data-slot="body" className="drawer__body flex-1 p-4 sm:p-5 overflow-y-auto">{children}</div>

            {/* Footer */}
            {footer && (
              <div data-slot="footer" className="drawer__footer p-4 border-t border-divider bg-content2/40 flex items-center justify-end gap-2">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(drawerContent, document.body);
};

export const Drawer = HeroDrawer;

export default HeroDrawer;
