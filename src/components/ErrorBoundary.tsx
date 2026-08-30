import React, { ErrorInfo, ReactNode } from 'react';
import { RefreshCw, Trash2, ShieldAlert } from 'lucide-react';
import { HeroButton } from './common/ui/HeroButton';

interface Props {
 children: ReactNode;
}

interface State {
 hasError: boolean;
 error: Error | null;
 errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
 public state: State = {
 hasError: false,
 error: null,
 errorInfo: null,
 };

 public static getDerivedStateFromError(error: Error): State {
 return { hasError: true, error, errorInfo: null };
 }

 public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
 console.error(' [TilePoint ErrorBoundary] Caught a runtime rendering exception:', error, errorInfo);
 
 // If it's a dynamic chunk loading error or Vite 504 Outdated Optimize Dep, auto-reload once to fetch fresh bundle
 const errorMsg = error?.message || '';
 const isChunkLoadFailed =
   errorMsg.includes('Failed to fetch dynamically imported module') ||
   errorMsg.includes('Importing a module script failed') ||
   errorMsg.includes('Outdated Optimize Dep') ||
   errorMsg.includes('504');

 if (isChunkLoadFailed) {
   const retryKey = 'tp_chunk_auto_reload_last';
   const lastRetry = sessionStorage.getItem(retryKey);
   const now = Date.now();
   if (!lastRetry || now - parseInt(lastRetry, 10) > 10000) {
     sessionStorage.setItem(retryKey, String(now));
     window.location.reload();
     return;
   }
 }

 this.setState({ error, errorInfo });
 }

 private handleReset = () => {
 // Attempt standard page refresh first
 window.location.reload();
 };

 private handleWipeClean = () => {
 // Clear potentially corrupted local states
 try {
 localStorage.clear();
 window.location.reload();
 } catch (e) {
 console.error('Failed to clear storage:', e);
 }
 };

 public render() {
 if (this.state.hasError) {
 return (
 <div className="min-h-screen bg-[#0B0F13] text-[#F8FAFC] flex items-center justify-center p-6 font-sans">
 <div className="w-full max-w-xl rounded-2xl bg-[#131A22] border border-red-500/25 p-8 shadow-2xl space-y-6 relative overflow-hidden">
 <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-red-500 animate-pulse" />
 
 <div className="flex items-center gap-4">
 <div className="p-3 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20 shrink-0">
 <ShieldAlert className="h-8 w-8" />
 </div>
 <div>
 <span className="text-[10px] tracking-widest text-red-400 font-bold uppercase block">
 System Recovery
 </span>
 <h1 className="text-lg font-black tracking-tight text-[#F8FAFC]">
 Application Error
 </h1>
 </div>
 </div>

 <p className="text-xs text-zinc-400 leading-relaxed">
 An unexpected error occurred while loading this page. This could be caused by browser storage limitations or a temporary connection problem.
 </p>

 <div className="p-4 rounded-xl bg-black/40 border border-zinc-800 space-y-2.5">
 <span className="text-[10px] text-zinc-500 block uppercase font-bold">
 Error Details
 </span>
 <div className="max-h-[140px] overflow-y-auto text-[10.5px] text-red-300 leading-relaxed pr-1 space-y-1.5 scrollbar-thin">
 <div className="font-bold text-red-400">
 Error: {this.state.error?.message || 'Unknown Exception'}
 </div>
 {this.state.error?.stack && (
 <pre className="whitespace-pre-wrap text-zinc-500 text-[10px] select-all leading-normal">
 {this.state.error.stack}
 </pre>
 )}
 <div className="text-zinc-600 block text-[9.5px] mt-2 border-t border-zinc-800/60 pt-1.5">
 UserAgent: {navigator.userAgent}
 </div>
 </div>
 </div>

 <div className="flex flex-col sm:flex-row gap-3 pt-2">
 <HeroButton
 type="button"
 onClick={this.handleReset}
 variant="primary"
 size="md"
 startIcon={<RefreshCw className="h-4 w-4 animate-spin-slow" />}
 className="flex-1 font-bold text-xs uppercase tracking-wider rounded-xl shadow-md"
 >
 Reload Application
 </HeroButton>
 
 <HeroButton
 type="button"
 onClick={this.handleWipeClean}
 variant="flat"
 size="md"
 startIcon={<Trash2 className="h-4 w-4" />}
 className="font-bold text-xs uppercase tracking-wider rounded-xl border border-zinc-800 text-zinc-400 hover:text-red-400 hover:border-red-900/45"
 title="Clear app cache and start fresh if the page does not reload"
 >
 Clear App Cache
 </HeroButton>
 </div>

 <div className="text-center">
 <span className="text-[9px] text-zinc-600">
 TilePoint Recovery Service
 </span>
 </div>
 </div>
 </div>
 );
 }

 return this.props.children;
 }
}
