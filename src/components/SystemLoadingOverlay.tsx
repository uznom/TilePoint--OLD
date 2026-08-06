import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDb } from '../context/DbContext';
import { Loader2, ShieldCheck, Database, Sparkles } from 'lucide-react';

export const SystemLoadingOverlay: React.FC = () => {
  const {
    isSystemProcessing,
    systemProcessingMessage,
    systemProcessingSubtext,
    systemProcessingType,
    systemProcessingProgress,
  } = useDb();

  const [simulatedStep, setSimulatedStep] = useState(0);

  // Auto cycle status tasks while waiting if subtext is empty
  useEffect(() => {
    if (!isSystemProcessing) {
      setSimulatedStep(0);
      return;
    }

    const interval = setInterval(() => {
      setSimulatedStep((prev) => (prev + 1) % 4);
    }, 100);

    return () => clearInterval(interval);
  }, [isSystemProcessing]);

  if (!isSystemProcessing) return null;

  const getSystemSteps = () => {
    switch (systemProcessingType) {
      case 'db':
        return [
          'Checking local ledger records...',
          'Updating account files...',
          'Applying configurations...',
          'Saving ledger updates...'
        ];
      case 'verification':
        return [
          'Verifying your login...',
          'Checking account permissions...',
          'Creating secure session...',
          'Loading your profile...'
        ];
      default:
        return [
          'Connecting to central network...',
          'Preparing request...',
          'Checking stock levels...',
          'Updating accounts journal...'
        ];
    }
  };

  const currentSteps = getSystemSteps();

  const getIcon = () => {
    switch (systemProcessingType) {
      case 'db':
        return <Database className="h-6 w-6 text-emerald-500 animate-pulse" />;
      case 'verification':
        return <ShieldCheck className="h-6 w-6 text-amber-500 animate-bounce" />;
      case 'progress':
        return <Sparkles className="h-6 w-6 text-purple-500 animate-pulse" />;
      default:
        return <Loader2 className="h-6 w-6 text-m3-primary animate-spin" />;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-md p-4 print:hidden"
      >
        <motion.div
          initial={{ scale: 0.92, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.92, y: 15, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-m3-outline-variant/30 bg-m3-surface-low p-8 shadow-2xl text-center text-m3-on-surface"
        >
          {/* Subtle background glow */}
          <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-m3-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

          {/* Icon/Logo Frame */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-m3-surface border border-m3-outline-variant/25 shadow-sm">
            <motion.div
              animate={
                systemProcessingType === 'spinner'
                  ? { rotate: [0, 90, 180, 270, 360] }
                  : { scale: [1, 1.08, 1] }
              }
              transition={{
                repeat: Infinity,
                duration: systemProcessingType === 'spinner' ? 2.5 : 1.5,
                ease: 'easeInOut',
              }}
              className="flex items-center justify-center"
            >
              {getIcon()}
            </motion.div>
          </div>

          {/* Title */}
          <h3 className="font-sans font-bold text-base tracking-tight text-m3-on-surface mb-2">
            {systemProcessingMessage || 'Processing System Task'}
          </h3>

          {/* Dynamic Progress Indicator */}
          {systemProcessingType === 'progress' ? (
            <div className="mt-4 mb-5 px-4">
              <div className="flex justify-between items-center text-[11px] text-m3-on-surface-variant font-mono mb-1.5">
                <span>Task Progress</span>
                <span className="font-extrabold text-purple-600 dark:text-purple-400">{systemProcessingProgress}%</span>
              </div>
              <div className="h-2 w-full bg-m3-surface-variant/40 rounded-full overflow-hidden p-[2px]">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-m3-primary to-purple-500"
                  animate={{ width: `${systemProcessingProgress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center py-2 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-m3-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-m3-primary"></span>
              </span>
              <span className="text-[10px] text-m3-primary font-bold uppercase tracking-widest font-mono ml-2">
                System Active
              </span>
            </div>
          )}

          {/* Custom Status Bullet Steps */}
          <div className="mt-4 p-4 rounded-xl bg-m3-surface border border-m3-outline-variant/20 text-left space-y-2">
            <p className="font-mono text-[9px] font-black text-m3-on-surface-variant/80 uppercase tracking-widest mb-1.5 flex justify-between">
              <span>Execution Journal</span>
              <span>v2.4.0</span>
            </p>
            {currentSteps.map((step, idx) => {
              const isDone = idx < simulatedStep;
              const isActive = idx === simulatedStep;
              return (
                <div key={idx} className="flex items-start gap-2 text-[11.5px] transition-all duration-300">
                  <span className={`font-mono text-[10px] mt-0.5 leading-none shrink-0 ${
                    isDone ? 'text-emerald-600 dark:text-emerald-400 font-black' : isActive ? 'text-m3-primary animate-pulse font-mono' : 'text-m3-on-surface-variant/50'
                  }`}>
                    {isDone ? '✓' : isActive ? '→' : '◦'}
                  </span>
                  <p className={`font-sans leading-relaxed ${
                    isDone ? 'text-m3-on-surface-variant/70 line-through/10' : isActive ? 'text-m3-on-surface font-semibold' : 'text-m3-on-surface-variant/60'
                  }`}>
                    {step}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Manual subtext if provided */}
          {systemProcessingSubtext && (
            <p className="mt-4 text-[11px] text-m3-on-surface-variant italic">
              ↳ {systemProcessingSubtext}
            </p>
          )}

          {/* Tilepoint Brander Signature */}
          <div className="mt-6 pt-4 border-t border-m3-outline-variant/20 flex justify-between items-center text-[9px] text-m3-on-surface-variant font-mono">
            <span>STRICT TRANSACT ID</span>
            <span>TP-{Math.floor(100000 + Math.random() * 900000)}</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
