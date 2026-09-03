/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Sparkles
} from 'lucide-react';

export type HeroToastColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
export type HeroToastVariant = 'solid' | 'flat' | 'bordered';
export type HeroToastPlacement = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';

export interface HeroToastOptions {
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  color?: HeroToastColor;
  variant?: HeroToastVariant;
  duration?: number; // ms
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
}

export interface HeroToastProps extends HeroToastOptions {
  isOpen: boolean;
  onDismiss: () => void;
  className?: string;
}

const colorStyles: Record<HeroToastColor, {
  solid: string;
  flat: string;
  bordered: string;
  icon: React.ElementType;
  iconColor: string;
}> = {
  default: {
    solid: 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-700/50 shadow-lg',
    flat: 'bg-zinc-100/90 dark:bg-zinc-800/90 text-zinc-900 dark:text-zinc-100 border-zinc-200/60 dark:border-white/10 shadow-md',
    bordered: 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 shadow-md',
    icon: Info,
    iconColor: 'text-zinc-500 dark:text-zinc-400',
  },
  primary: {
    solid: 'bg-primary text-primary-foreground border-primary/40 shadow-lg shadow-primary/20',
    flat: 'bg-primary/10 text-primary dark:text-primary-300 border-primary/25 shadow-md',
    bordered: 'bg-content1 text-primary border-primary/40 shadow-md',
    icon: Sparkles,
    iconColor: 'text-primary',
  },
  secondary: {
    solid: 'bg-secondary text-secondary-foreground border-secondary/40 shadow-lg shadow-secondary/20',
    flat: 'bg-secondary/10 text-secondary border-secondary/25 shadow-md',
    bordered: 'bg-content1 text-secondary border-secondary/40 shadow-md',
    icon: Sparkles,
    iconColor: 'text-secondary',
  },
  success: {
    solid: 'bg-emerald-600 text-white border-emerald-500/40 shadow-lg shadow-emerald-500/20',
    flat: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 shadow-md',
    bordered: 'bg-content1 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 shadow-md',
    icon: CheckCircle2,
    iconColor: 'text-emerald-500',
  },
  warning: {
    solid: 'bg-amber-500 text-white border-amber-400/40 shadow-lg shadow-amber-500/20',
    flat: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25 shadow-md',
    bordered: 'bg-content1 text-amber-600 dark:text-amber-400 border-amber-500/40 shadow-md',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
  },
  danger: {
    solid: 'bg-rose-600 text-white border-rose-500/40 shadow-lg shadow-rose-500/20',
    flat: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25 shadow-md',
    bordered: 'bg-content1 text-rose-600 dark:text-rose-400 border-rose-500/40 shadow-md',
    icon: AlertCircle,
    iconColor: 'text-rose-500',
  },
};

export const HeroToast: React.FC<HeroToastProps> = ({
  isOpen,
  onDismiss,
  title,
  description,
  color = 'default',
  variant = 'flat',
  duration = 4000,
  icon,
  action,
  className = '',
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!isOpen || duration <= 0) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 25);

    return () => clearInterval(interval);
  }, [isOpen, duration, onDismiss]);

  const styleConfig = colorStyles[color] || colorStyles.default;
  const VariantIcon = styleConfig.icon;
  const variantClass = styleConfig[variant] || styleConfig.flat;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={`toast ${className}`}
          role="status"
          aria-live="polite"
        >
          {/* Indicator Icon */}
          <div data-slot="indicator" className={`toast__indicator ${variantClass}`}>
            {icon || <VariantIcon className="h-4 w-4 text-current" />}
          </div>

          {/* Content */}
          <div data-slot="content" className="toast__content font-sans">
            {title && (
              <div data-slot="title" className="toast__title">
                {title}
              </div>
            )}
            {description && (
              <div data-slot="description" className="toast__description mt-0.5">
                {description}
              </div>
            )}

            {action && (
              <button
                type="button"
                onClick={action.onClick}
                className="mt-2 text-[10px] font-black uppercase tracking-wider underline text-primary hover:opacity-80 transition-opacity cursor-pointer block"
              >
                {action.label}
              </button>
            )}
          </div>

          {/* Close button */}
          <button
            type="button"
            data-slot="close-button"
            onClick={onDismiss}
            className="toast__close-button"
            aria-label="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          {/* Progress bar */}
          {duration > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/5 dark:bg-white/5">
              <div
                className="h-full bg-current opacity-40 transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
