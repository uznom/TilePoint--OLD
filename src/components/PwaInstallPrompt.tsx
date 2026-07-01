/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Monitor, Sparkles, Smartphone, CheckCircle, X, ShieldCheck } from 'lucide-react';
import { useDb } from '../context/DbContext';

export const PwaInstallPrompt: React.FC = () => {
  const { isLoggedIn } = useDb();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isDisabled, setIsDisabled] = useState(() => {
    return localStorage.getItem('tilepoint-disable-install-prompt') === 'true';
  });

  // Listen to external theme sync events to instantly hide or show
  useEffect(() => {
    const handleSync = () => {
      setIsDisabled(localStorage.getItem('tilepoint-disable-install-prompt') === 'true');
    };
    window.addEventListener('tilepoint-theme-updated', handleSync);
    return () => window.removeEventListener('tilepoint-theme-updated', handleSync);
  }, []);

  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const isStandaloneInit = window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      if (isStandaloneInit) {
        localStorage.setItem('tp_pwa_installed', 'true');
        return true;
      }
      return localStorage.getItem('tp_pwa_installed') === 'true';
    }
    return false;
  });
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
    }
    return false;
  });

  useEffect(() => {
    if (!isLoggedIn) {
      setShowPrompt(false);
      return;
    }

    // 1. Detect if already running in standalone mode (installed PWA)
    const checkStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    
    setIsStandalone(checkStandalone);
    if (checkStandalone) {
      setIsInstalled(true);
      localStorage.setItem('tp_pwa_installed', 'true');
      return;
    }

    // Check if previously marked as installed in persistent storage
    if (localStorage.getItem('tp_pwa_installed') === 'true') {
      setIsInstalled(true);
      return;
    }

    // 2. Detect iOS / Safari
    const detectIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isApple = /iphone|ipad|ipod/.test(userAgent);
      const isSafari = /safari/.test(userAgent) && !/crios/.test(userAgent) && !/fxios/.test(userAgent);
      return isApple && isSafari;
    };
    
    const iosDetected = detectIOS();
    setIsIOS(iosDetected);

    // 3. Listen to beforeinstallprompt on other browsers
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent chrome/android default prompt
      e.preventDefault();
      // Store event for triggering later
      setDeferredPrompt(e);
      // Automatically prompt or show the banner when open
      setTimeout(() => {
        if (localStorage.getItem('tp_pwa_installed') !== 'true' && !localStorage.getItem('tilepoint-disable-install-prompt')) {
          setShowPrompt(true);
        }
      }, 1500); // 1.5 seconds delay after loading for perfect entrance timing
    };

    // 4. Listen to appinstalled event (fires when user successfully installs app)
    const handleAppInstalled = () => {
      console.log('[PWA] TilePoint App successfully installed!');
      localStorage.setItem('tp_pwa_installed', 'true');
      setIsInstalled(true);
      setShowPrompt(false);
      try {
        window.location.reload();
      } catch (e) {
        // Safe fallback
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // If iOS Safari, we can display instructions after a delayed trigger because the event won't fire
    if (iosDetected && localStorage.getItem('tp_pwa_installed') !== 'true' && !localStorage.getItem('tilepoint-disable-install-prompt')) {
      setTimeout(() => {
        setShowPrompt(true);
      }, 2500);
    }

    // Alternative trigger check if never prompt event fires but not installed
    const fallbackTimer = setTimeout(() => {
      if (!deferredPrompt && !iosDetected && !checkStandalone && localStorage.getItem('tp_pwa_installed') !== 'true' && !localStorage.getItem('tilepoint-disable-install-prompt')) {
        // Show install button as simulated setup anyway to give guide
        setShowPrompt(true);
      }
    }, 4000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(fallbackTimer);
    };
  }, [deferredPrompt, isLoggedIn]);

  const handleDismiss = () => {
    localStorage.setItem('tilepoint-disable-install-prompt', 'true');
    setIsDisabled(true);
    setShowPrompt(false);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Fallback instruction for manual installation guide
      alert("To install: Tap the menu button in your browser address bar and select 'Install App' or 'Add to Home Screen'.");
      return;
    }

    // Show native browser install prompt
    deferredPrompt.prompt();

    // Await user option outcome
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA Install] User conversion preference outcome: ${outcome}`);

    if (outcome === 'accepted') {
      localStorage.setItem('tp_pwa_installed', 'true');
      setIsInstalled(true);
      setShowPrompt(false);
      try {
        window.location.reload();
      } catch (e) {
        // Safe fallback
      }
    }
    
    // Clear deferred prompt reference
    setDeferredPrompt(null);
  };

  if (isDisabled || isInstalled || isStandalone) {
    return null; // Don't show anything once PWA is operating or disabled
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <div id="pwa-root-overlay-wrapper" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999] w-full max-w-[460px] px-4 pointer-events-none font-sans">
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            style={{
              boxShadow: '0 20px 40px rgba(var(--m3-primary-rgb, 21, 94, 239), 0.16), 0 4px 16px rgba(0, 0, 0, 0.15)',
              backgroundColor: 'rgb(var(--m3-surface-container-high, 30, 32, 37))',
              borderColor: 'var(--m3-outline-variant, rgba(255, 255, 255, 0.12))'
            }}
            className="w-full rounded-3xl border p-5 flex flex-col gap-4 backdrop-blur-2xl bg-opacity-95 pointer-events-auto"
          >
            {/* Header Banner */}
            <div className="flex justify-between items-start gap-3">
              <div className="flex gap-3">
                <div 
                  style={{
                    backgroundColor: 'rgba(var(--m3-primary-rgb, 21, 94, 239), 0.12)'
                  }}
                  className="p-3 rounded-2xl flex items-center justify-center text-[var(--m3-primary)] animate-pulse"
                >
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[var(--m3-on-surface)] leading-snug flex items-center gap-1.5">
                    Install TilePoint App
                    <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
                  </h3>
                  <p className="text-[11px] text-[var(--m3-on-surface-variant)] leading-snug mt-0.5">
                    Run TilePoint ATP-OS directly from your device dock with instant launch, robust offline capabilities & full showroom speeds.
                  </p>
                </div>
              </div>
              
              <button 
                onClick={handleDismiss}
                className="p-1 rounded-full text-[var(--m3-on-surface-variant)] hover:bg-m3-outline-variant/10 hover:text-[var(--m3-on-surface)] transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Custom Instructions for iOS users */}
            {isIOS ? (
              <div 
                style={{
                  backgroundColor: 'rgba(var(--m3-primary-rgb, 21, 94, 239), 0.05)',
                  borderColor: 'rgba(var(--m3-primary-rgb, 21, 94, 239), 0.15)'
                }}
                className="p-3.5 rounded-2xl border text-[11px] text-[var(--m3-on-surface-variant)] space-y-2 leading-relaxed"
              >
                <p className="font-extrabold text-[var(--m3-primary)] uppercase tracking-wider text-[9px]">
                  iOS Safari Installation Guide:
                </p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Tap the <span className="font-black text-[var(--m3-primary)]">"Share"</span> button at the bottom navigation screen.</li>
                  <li>Scroll and select <span className="font-black text-[var(--m3-on-surface)]">"Add to Home Screen"</span>.</li>
                  <li>Tap <span className="font-black text-[var(--m3-primary)]">"Add"</span> in the top-right corner to activate.</li>
                </ol>
              </div>
            ) : (
              /* Features List */
              <div className="grid grid-cols-2 gap-2 text-[10px] text-[var(--m3-on-surface-variant)] font-sans">
                <div className="flex items-center gap-1.5 bg-m3-surface/10 p-2 rounded-xl border border-m3-outline-variant/5">
                  <Monitor className="h-3.5 w-3.5 text-[var(--m3-primary)]" />
                  <span>Desktop App</span>
                </div>
                <div className="flex items-center gap-1.5 bg-m3-surface/10 p-2 rounded-xl border border-m3-outline-variant/5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[var(--m3-primary)]" />
                  <span>Offline Ready</span>
                </div>
              </div>
            )}

            {/* Actions Footer */}
            {!isIOS && (
              <div className="flex gap-2 font-sans mt-1">
                <button
                  onClick={handleDismiss}
                  className="flex-1 py-2.5 rounded-xl border border-m3-outline-variant text-xs text-[var(--m3-on-surface-variant)] font-bold hover:bg-m3-outline-variant/10 hover:text-[var(--m3-on-surface)] transition-colors cursor-pointer"
                >
                  Later
                </button>
                <button
                  onClick={handleInstallClick}
                  style={{
                    backgroundColor: 'var(--m3-primary, #0d9384)',
                    boxShadow: '0 4px 12px rgba(var(--m3-primary-rgb, 21, 94, 239), 0.25)'
                  }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-black text-white hover:brightness-110 active:scale-95 transition-all outline-none border border-m3-primary flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  Install App
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
