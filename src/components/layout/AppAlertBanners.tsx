import React from "react";
import { AlertTriangle, Clock, RefreshCw } from "lucide-react";

export interface AppAlertBannersProps {
  serverDegradedState?: {
    isDegraded: boolean;
    queuedWritesCount?: number;
    lastDegradedReason?: string;
  } | null;
  refreshServerStatus: () => void;
  apiErrorState?: {
    statusCode: number;
    message: string;
    retryAfter?: number;
  } | null;
  clearServerErrorState: () => void;
  syncFromSharedServer: (force?: boolean) => Promise<any>;
  percentProgress: number;
}

export const AppAlertBanners: React.FC<AppAlertBannersProps> = ({
  serverDegradedState,
  refreshServerStatus,
  apiErrorState,
  clearServerErrorState,
  syncFromSharedServer,
  percentProgress,
}) => {
  return (
    <>
      {/* CRITICAL LOUD PERSISTENT BANNER: DEGRADED ENGINE ALERT */}
      {serverDegradedState?.isDegraded && (
        <div className="fixed inset-x-0 top-0 z-[70] bg-gradient-to-r from-red-700 via-amber-700 to-red-800 text-white shadow-2xl border-b-2 border-amber-400/60 p-3 px-5 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-black/30 rounded-xl border border-white/20 text-amber-300">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-xs sm:text-sm tracking-wide uppercase text-white flex items-center gap-2">
                  CRITICAL SYSTEM ALERT: DEGRADED DATABASE MODE ACTIVE
                </h4>
                <span className="bg-red-950/80 text-amber-300 border border-amber-400/40 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                  MYSQL OFFLINE
                </span>
                {(serverDegradedState.queuedWritesCount ?? 0) > 0 && (
                  <span className="bg-black/40 text-white text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                    {serverDegradedState.queuedWritesCount} Write(s) Queued
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-amber-100/90 mt-0.5 font-medium leading-tight max-w-3xl">
                Primary MySQL database engine is disconnected. Transactions are buffered locally in temporary store and will auto-replay on reconnect.
                {serverDegradedState.lastDegradedReason ? ` [${serverDegradedState.lastDegradedReason}]` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => refreshServerStatus()}
              className="flex items-center gap-1.5 bg-white text-red-900 hover:bg-amber-100 active:scale-95 transition-all text-xs font-black px-3.5 py-1.5 rounded-xl shadow-md cursor-pointer uppercase tracking-wider"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {apiErrorState && (
        <div className="fixed inset-x-0 top-0 z-[60] bg-content2/95 backdrop-blur-md border-b border-divider/35 shadow-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                apiErrorState.statusCode === 429
                  ? "bg-amber-500/10 text-amber-500"
                  : "bg-red-500/10 text-red-500"
              }`}
            >
              {apiErrorState.statusCode === 429 ? (
                <Clock className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div className="text-left">
              <h4 className="font-bold text-sm flex items-center gap-2 text-foreground">
                <span>System Response Indicator: HTTP {apiErrorState.statusCode}</span>
                {apiErrorState.statusCode === 429 && (
                  <span className="bg-amber-500/20 text-amber-500 text-[10px] px-1.5 py-0.5 rounded font-medium">
                    COOL-DOWN ACTIVE
                  </span>
                )}
              </h4>
              <p className="text-xs text-default-500 mt-0.5 max-w-2xl leading-relaxed">
                {apiErrorState.message}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {apiErrorState.statusCode === 429 ? (
              <div className="bg-amber-500/15 border border-amber-500/35 text-amber-500 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Retry in {apiErrorState.retryAfter || 0}s
              </div>
            ) : apiErrorState.statusCode === 500 ? (
              <>
                <button
                  onClick={() => {
                    clearServerErrorState();
                    syncFromSharedServer();
                  }}
                  className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary-hover active:scale-95 transition-all text-xs font-semibold px-4 py-2 rounded-xl shadow-md cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Connection
                </button>
                <button
                  onClick={clearServerErrorState}
                  className="border border-default-200 hover:bg-default-100 text-foreground text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer"
                >
                  Use Offline Fallback
                </button>
              </>
            ) : (
              <button
                onClick={clearServerErrorState}
                className="bg-primary text-primary-foreground hover:bg-primary-hover active:scale-95 transition-all text-xs font-semibold px-4 py-2 rounded-xl shadow-md cursor-pointer"
              >
                Dismiss Warning
              </button>
            )}
          </div>
        </div>
      )}

      {percentProgress > 0 && (
        <div
          className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-amber-500 lod-progress z-50 origin-left will-change-transform pointer-events-none transition-transform duration-75 ease-out"
          style={{
            transform: `scaleX(${Math.min(Math.max(percentProgress, 0), 100) / 100}) translateZ(0)`
          }}
        />
      )}
    </>
  );
};
