/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDb } from '../context/DbContext';

export const IdleScreen: React.FC = () => {
 const { isLoggedIn, currentUser } = useDb();
 
 // State to track if idle screen is globally disabled by settings
 const [isDisabled, setIsDisabled] = useState(() => {
 return localStorage.getItem('tilepoint-disable-idle-clock') === 'true';
 });

 const [, setThemeTick] = useState(0);

 // Listen to external theme sync events to instantly hide, show, or re-render
 useEffect(() => {
 const handleSync = () => {
 setIsDisabled(localStorage.getItem('tilepoint-disable-idle-clock') === 'true');
 setThemeTick(t => t + 1);
 };
 window.addEventListener('tilepoint-theme-updated', handleSync);
 return () => window.removeEventListener('tilepoint-theme-updated', handleSync);
 }, []);
 
 // State to track idle status
 const [isIdle, setIsIdle] = useState(false);
 const [isDismissing, setIsDismissing] = useState(false);
 const [isDismissingWhole, setIsDismissingWhole] = useState(false);
 
 // Real-time Date and Time
 const [time, setTime] = useState(new Date());
 
 // Track if we are on desktop
 const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
 
 const lastActiveRef = useRef<number>(Date.now());
 const dismissalInProgressRef = useRef<boolean>(false);

 // Update time every second
 useEffect(() => {
 const timer = setInterval(() => {
 setTime(new Date());
 }, 1000);
 return () => clearInterval(timer);
 }, []);

 // Handle window resizing to toggle desktop restriction
 useEffect(() => {
 const handleResize = () => {
 setIsDesktop(window.innerWidth >= 1024);
 };
 window.addEventListener('resize', handleResize);
 return () => window.removeEventListener('resize', handleResize);
 }, []);

 // Monitor activity & trigger idle screen
 useEffect(() => {
 // Only monitor if logged in, on desktop, and NOT disabled
 if (isDisabled || !isLoggedIn || !isDesktop) {
 setIsIdle(false);
 return;
 }

 const resetTimer = () => {
   lastActiveRef.current = Date.now();
   if (isIdle) {
     setIsIdle(false);
     setIsDismissing(false);
     setIsDismissingWhole(false);
     dismissalInProgressRef.current = false;
   }
 };

 // Register active user interactions
 const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
 events.forEach(event => window.addEventListener(event, resetTimer, { passive: true }));

 // Checker interval running every 1000ms (300 seconds = 5 minutes idle threshold)
 const interval = setInterval(() => {
   const secondsInactive = (Date.now() - lastActiveRef.current) / 1000;
   if (secondsInactive >= 300) {
     setIsIdle(true);
   }
 }, 1000);

 return () => {
 events.forEach(event => window.removeEventListener(event, resetTimer));
 clearInterval(interval);
 };
 }, [isLoggedIn, isIdle, isDesktop, isDisabled]);

 // If disabled, not logged-in, or not desktop, render nothing to keep execution low
 if (isDisabled || !isLoggedIn || !isDesktop) return null;

 // Format date and time
 const formatTimeParts = (date: Date) => {
 let hours = date.getHours();
 const minutes = String(date.getMinutes()).padStart(2, '0');
 const seconds = String(date.getSeconds()).padStart(2, '0');
 const ampm = hours >= 12 ? 'PM' : 'AM';
 hours = hours % 12;
 hours = hours ? hours : 12; // the hour '0' should be '12'
 const formattedHours = String(hours).padStart(2, '0');
 return {
 timeStr: `${formattedHours}:${minutes}:${seconds}`,
 ampm
 };
 };

 const formatDate = (date: Date) => {
 return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
 };

 return (
 <AnimatePresence>
 {isIdle && (
 <motion.div
 id="desktop-expressive-idle-screen"
 initial={{ opacity: 0 }}
 animate={{ opacity: isDismissingWhole ? 0 : 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
 className="fixed inset-0 z-[9999] overflow-hidden select-none"
 style={{
 backgroundColor: 'var(--heroui-background)',
 }}
 >
 {/* ANDROID 17 FLUID GLOWING GRAPHIC BLURS */}
 <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
 {/* Dynamic Blob 1 */}
 <div 
 className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] rounded-full filter blur-[120px] animate-blob-1"
 style={{
 background: 'radial-gradient(circle, var(--heroui-primary) 0%, rgba(0,0,0,0) 70%)',
 }}
 />
 {/* Dynamic Blob 2 */}
 <div 
 className="absolute -bottom-[20%] -right-[10%] w-[70vw] h-[70vw] rounded-full filter blur-[140px] animate-blob-2"
 style={{
 background: 'radial-gradient(circle, var(--heroui-secondary, var(--heroui-primary)) 0%, rgba(0,0,0,0) 70%)',
 }}
 />
 {/* Dynamic Blob 3 */}
 <div 
 className="absolute top-[30%] left-[40%] w-[50vw] h-[50vw] rounded-full filter blur-[130px] animate-blob-3"
 style={{
 background: 'radial-gradient(circle, var(--heroui-primary) 0%, rgba(0,0,0,0) 70%)',
 }}
 />
 </div>

 {/* HEROUI FROSTED GLASS GRADIENT MASK */}
 <div className="absolute inset-x-0 inset-y-0 backdrop-blur-[60px] bg-gradient-to-tr from-content1/70 via-content1/30 to-content3/65" />

 {/* EXPRESSIVE SHAPE ARTWORKS (HEROUI V3) */}
 <div className="absolute inset-0 pointer-events-none overflow-hidden">
 {/* Morphing Organic SVG Star / Blob 1 */}
 <motion.div
 animate={{
 borderRadius: [
 "42% 58% 70% 30% / 45% 45% 55% 55%",
 "70% 30% 52% 48% / 60% 40% 70% 30%",
 "30% 70% 40% 60% / 50% 60% 40% 50%",
 "42% 58% 70% 30% / 45% 45% 55% 55%"
 ],
 rotate: [0, 120, 240, 360],
 scale: [1, 1.08, 0.95, 1],
 }}
 transition={{
 duration: 22,
 repeat: Infinity,
 ease: "easeInOut"
 }}
 className="absolute left-[15%] top-[20%] w-[240px] h-[240px] border border-primary/25 bg-primary/5 shadow-inner"
 />

 {/* Morphing Dynamic Outline Shape 2 */}
 <motion.div
 animate={{
 borderRadius: [
 "35% 65% 50% 50% / 50% 35% 65% 50%",
 "50% 50% 70% 30% / 35% 65% 50% 50%",
 "65% 35% 30% 70% / 50% 50% 35% 65%",
 "35% 65% 50% 50% / 50% 35% 65% 50%"
 ],
 rotate: [360, 240, 120, 0],
 scale: [0.95, 1.05, 0.9, 0.95],
 }}
 transition={{
 duration: 26,
 repeat: Infinity,
 ease: "easeInOut"
 }}
 className="absolute right-[20%] bottom-[15%] w-[320px] h-[320px] border-2 border-secondary/25 bg-secondary-50/10"
 />
 </div>

 {/* CLOCK & DATE CONTENT PANEL */}
 <div className="relative h-full w-full flex flex-col justify-between p-12 md:p-20 z-10 font-sans">
 {/* Top Info Bar */}
 <motion.div
 initial={{ opacity: 0, y: -25 }}
 animate={{ opacity: isDismissing ? 0 : 1, y: isDismissing ? -20 : 0 }}
 transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
 className="flex items-center justify-between w-full"
 >
 <div className="flex items-center gap-3">
 </div>
 </motion.div>

 {/* Core Center Display Time (Controlled with Roboto Flex Variable Font) */}
 <div className="flex-1 flex flex-col justify-center items-center text-center">
 {/* Expressive Growing & Shrinking Time */}
 <motion.div
 initial={{ opacity: 0, scale: 0.88, y: 35 }}
 animate={{
 opacity: isDismissing ? 0 : 1,
 scale: isDismissing ? 0.94 : 1,
 y: isDismissing ? -30 : 0
 }}
 transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
 className="space-y-4"
 >
 {/* Giant Clock Face */}
 <h1 
 id="idle-screen-adaptive-clock"
 className="animate-roboto-flex text-[11vw] font-black leading-none text-[var(--heroui-foreground)] select-none whitespace-nowrap flex items-baseline justify-center gap-4"
 style={{
 fontFamily: "'Roboto Flex Variable', 'Roboto Flex', var(--font-sans)",
 }}
 >
 <span>{formatTimeParts(time).timeStr}</span>
 <span className="text-[3.5vw] font-extrabold text-[var(--heroui-primary)] tracking-wider uppercase ">
 {formatTimeParts(time).ampm}
 </span>
 </h1>

 {/* Date & Session Summary Card */}
 <div className="mt-6 space-y-1">
 <p className="text-sm md:text-md font-extrabold uppercase tracking-widest text-[var(--heroui-primary)]">
 {formatDate(time)}
 </p>
 <p className="text-[11px] text-[var(--heroui-default-500)] lowercase tracking-wider mt-1">
 {currentUser?.username || 'user'} @ terminal session
 </p>
 </div>
 </motion.div>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 );
};

