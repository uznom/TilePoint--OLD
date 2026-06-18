import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, Trash2, ShieldAlert } from 'lucide-react';

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
    console.error('⚠️ [TilePoint ErrorBoundary] Caught a runtime rendering exception:', error, errorInfo);
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
          <div className="w-full max-w-xl rounded-[28px] bg-[#131A22] border border-red-500/25 p-8 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-red-500 animate-pulse" />
            
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20 shrink-0">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <div>
                <span className="text-[10px] font-mono tracking-widest text-red-400 font-bold uppercase block">
                  System Guard Recovery Console
                </span>
                <h1 className="text-lg font-black tracking-tight text-[#F8FAFC]">
                  Rendering Interface Exception
                </h1>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              TilePoint's system kernel caught an active view crash or rendering conflict. This could be due to browser incompatibilities, restricted storage permissions, or corrupt session state caches.
            </p>

            <div className="p-4 rounded-xl bg-black/40 border border-zinc-800 space-y-2.5">
              <span className="text-[10px] font-mono text-zinc-500 block uppercase font-bold">
                Diagnostic Trace Log (System &amp; Browser info)
              </span>
              <div className="max-h-[140px] overflow-y-auto text-[10.5px] font-mono text-red-300 leading-relaxed pr-1 space-y-1.5 scrollbar-thin">
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
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 px-4 py-2.5 bg-m3-primary hover:bg-m3-primary/95 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 cursor-pointer"
              >
                <RefreshCw className="h-4 w-4 animate-spin-slow" />
                <span>Reload Application</span>
              </button>
              
              <button
                type="button"
                onClick={this.handleWipeClean}
                className="px-4 py-2.5 bg-zinc-900 hover:bg-red-950/40 text-zinc-450 hover:text-red-400 border border-zinc-800 hover:border-red-900/45 font-mono text-xs uppercase font-bold tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                title="Wipe state clean and start fresh if database config corruption exists"
              >
                <Trash2 className="h-4 w-4" />
                <span>Reset Safe-Storage Code</span>
              </button>
            </div>

            <div className="text-center">
              <span className="text-[9px] font-mono text-zinc-650">
                TilePoint Core Engine Recovery Sub-Service • Terminal Locked
              </span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
