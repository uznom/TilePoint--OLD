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
        return <Database className="h-6 w-6 text-primary animate-spin-slow" />;
      case 'verification':
        return <ShieldCheck className="h-6 w-6 text-amber-500 animate-bounce" />;
      case 'progress':
        return <Sparkles className="h-6 w-6 text-primary" />;
      default:
        return <Loader2 className="h-6 w-6 text-primary animate-spin" />;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-md p-4 print:hidden"
      >
        <motion.div
          initial={{ scale: 0.92, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.92, y: 15, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-divider/30 bg-content1 p-8 shadow-2xl text-center text-foreground"
        >
          {/* Subtle background glow */}
          <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />

          {/* Icon/Logo Frame */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-background border border-divider/25 shadow-sm">
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
          <h3 className="font-sans font-bold text-base text-foreground mb-2">
            {systemProcessingMessage || 'Processing System Task'}
          </h3>

          {/* Dynamic Progress Indicator */}
          {systemProcessingType === 'progress' ? (
            <div className="mt-4 mb-5 px-4">
 <div className="flex justify-between items-center text-[11px] text-default-500 mb-1.5">
                <span>Task Progress</span>
                <span className="font-extrabold text-primary">{systemProcessingProgress}%</span>
              </div>
              <div className="h-2 w-full bg-default-100/40 rounded-full overflow-hidden p-[2px]">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  animate={{ width: `${systemProcessingProgress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center py-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-[10px] text-primary font-bold uppercase tracking-widest ml-2">
                System Active
              </span>
            </div>
          )}

          {/* Custom Status Bullet Steps */}
          <div className="mt-4 p-4 rounded-xl bg-background border border-divider/20 text-left space-y-2">
 <p className=" text-[9px] font-black text-default-500/80 uppercase tracking-widest mb-1.5 flex justify-between">
              <span>Execution Journal</span>
              <span>v2.4.0</span>
            </p>
            {currentSteps.map((step, idx) => {
              const isDone = idx < simulatedStep;
              const isActive = idx === simulatedStep;
              return (
                <div key={idx} className="flex items-start gap-2 text-[11.5px] transition-all duration-300">
 <span className={` text-[10px] mt-0.5 leading-none shrink-0 ${
 isDone ? 'text-primary font-black' : isActive ? 'text-primary font-bold' : 'text-default-500/50'
                  }`}>
                    {isDone ? '✓' : isActive ? '→' : '◦'}
                  </span>
                  <p className={`font-sans leading-relaxed ${
                    isDone ? 'text-default-500/70 line-through/10' : isActive ? 'text-foreground font-semibold' : 'text-default-500/60'
                  }`}>
                    {step}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Manual subtext if provided */}
          {systemProcessingSubtext && (
            <p className="mt-4 text-[11px] text-default-500 italic">
              ↳ {systemProcessingSubtext}
            </p>
          )}

          {/* Tilepoint Brander Signature */}
 <div className="mt-6 pt-4 border-t border-divider/20 flex justify-between items-center text-[9px] text-default-500 ">
            <span>TRANSACTION PROCESSOR</span>
            <span className="font-semibold text-primary">ACTIVE SECURE CHANNEL</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
