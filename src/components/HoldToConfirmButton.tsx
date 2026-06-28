import React, { useState, useRef, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';

interface HoldToConfirmButtonProps {
  onConfirm: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  variant?: 'rose' | 'amber' | 'primary' | 'danger';
  className?: string;
}

export const HoldToConfirmButton: React.FC<HoldToConfirmButtonProps> = ({
  onConfirm,
  children,
  disabled = false,
  variant = 'rose',
  className = '',
}) => {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const duration = 3000; // 3 seconds

  const startHold = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsHolding(true);
    setProgress(0);
    startTimeRef.current = Date.now();

    const updateProgress = () => {
      if (!startTimeRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);

      if (pct < 100) {
        timerRef.current = requestAnimationFrame(updateProgress);
      } else {
        // Confirm reached!
        setIsHolding(false);
        setProgress(0);
        startTimeRef.current = null;
        onConfirm();
      }
    };

    timerRef.current = requestAnimationFrame(updateProgress);
  };

  const cancelHold = () => {
    setIsHolding(false);
    setProgress(0);
    startTimeRef.current = null;
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
      }
    };
  }, []);

  const getVariantStyles = () => {
    switch (variant) {
      case 'rose':
        return {
          bg: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border-rose-500/30',
          progressBg: 'bg-rose-500',
        };
      case 'amber':
        return {
          bg: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border-amber-500/30',
          progressBg: 'bg-amber-500',
        };
      case 'primary':
        return {
          bg: 'bg-m3-primary/10 hover:bg-m3-primary/20 text-m3-primary border-m3-primary/30',
          progressBg: 'bg-m3-primary',
        };
      default:
        return {
          bg: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border-rose-500/30',
          progressBg: 'bg-rose-500',
        };
    }
  };

  const styles = getVariantStyles();
  const secondsLeft = ((duration - (progress / 100) * duration) / 1000).toFixed(1);

  return (
    <button
      type="button"
      disabled={disabled}
      onMouseDown={startHold}
      onMouseUp={cancelHold}
      onMouseLeave={cancelHold}
      onTouchStart={startHold}
      onTouchEnd={cancelHold}
      className={`relative overflow-hidden w-full py-2.5 px-4 text-xs font-black uppercase tracking-wider rounded-lg border transition-all select-none cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${styles.bg} ${className}`}
      id="tilepoint-hold-to-confirm-btn"
    >
      {/* Background progress fill */}
      {progress > 0 && (
        <div
          className={`absolute left-0 top-0 bottom-0 opacity-20 pointer-events-none transition-all ease-linear ${styles.progressBg}`}
          style={{ width: `${progress}%` }}
        />
      )}

      {/* Actual button text/indicator */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {isHolding ? (
          <>
            <ShieldAlert className="h-4 w-4 animate-pulse shrink-0" />
            <span>HOLD TO CONFIRM ({secondsLeft}s)</span>
          </>
        ) : (
          children
        )}
      </span>
    </button>
  );
};
