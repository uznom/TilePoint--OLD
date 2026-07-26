import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle, Database, MapPin, ArrowRight, RefreshCw, Layers, Check } from 'lucide-react';
import { PreflightReport } from '../lib/preflightValidator';
import { ExpressiveTooltip } from './ExpressiveTooltip';

interface PreflightReportCardProps {
  report: PreflightReport | null;
  isAnalyzing: boolean;
  onRunInspection: () => void;
  onConfirmCommit: () => void;
  onCancel?: () => void;
  allowedToImport?: boolean;
}

export const PreflightReportCard: React.FC<PreflightReportCardProps> = ({
  report,
  isAnalyzing,
  onRunInspection,
  onConfirmCommit,
  onCancel,
  allowedToImport = true,
}) => {
  if (isAnalyzing) {
    return (
      <div className="p-6 bg-m3-surface-low border border-m3-outline-variant/30 rounded-2xl text-center space-y-3 animate-pulse font-sans">
        <RefreshCw className="h-8 w-8 text-m3-primary animate-spin mx-auto" />
        <h4 className="text-xs font-black uppercase text-m3-primary tracking-wider">
          Running Pre-Flight Schema & Branch Compatibility Inspection...
        </h4>
        <p className="text-[11px] text-m3-on-surface-variant max-w-md mx-auto">
          Parsing JSON structure, verifying SHA-256 seal integrity, and cross-checking referenced branches against local database tables.
        </p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-5 bg-m3-surface-lowest border border-dashed border-m3-outline-variant/30 rounded-2xl text-center space-y-3 font-sans">
        <ShieldCheck className="h-8 w-8 text-m3-tertiary mx-auto opacity-70" />
        <div>
          <h4 className="text-xs font-extrabold uppercase text-m3-on-surface tracking-wider">
            Pre-Flight Validation Engine Ready
          </h4>
          <p className="text-[11px] text-m3-on-surface-variant max-w-md mx-auto mt-0.5">
            Check JSON file integrity, payload schema conformity, and branch compatibility before committing data to local DB storage.
          </p>
        </div>
        <button
          type="button"
          onClick={onRunInspection}
          className="px-4 py-2 bg-m3-primary hover:bg-m3-primary/95 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Run Pre-Flight Inspection</span>
        </button>
      </div>
    );
  }

  const getStatusColor = () => {
    if (report.status === 'PASS') return 'emerald';
    if (report.status === 'WARNING') return 'amber';
    return 'rose';
  };

  const color = getStatusColor();

  return (
    <div className="space-y-4 font-sans text-left animate-fade-in">
      {/* 1. Header Shield Status Banner */}
      <div
        className={`p-4 rounded-2xl border ${
          report.status === 'PASS'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
            : report.status === 'WARNING'
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
        } flex items-start gap-3`}
      >
        {report.status === 'PASS' && <ShieldCheck className="h-6 w-6 shrink-0 mt-0.5 text-emerald-500" />}
        {report.status === 'WARNING' && <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5 text-amber-500" />}
        {report.status === 'FAIL' && <ShieldAlert className="h-6 w-6 shrink-0 mt-0.5 text-rose-500" />}

        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-black uppercase tracking-wider font-mono">
              PRE-FLIGHT STATUS: {report.status === 'PASS' ? 'PASSED (READY TO COMMIT)' : report.status === 'WARNING' ? 'COMPATIBILITY ATTENTION REQUIRED' : 'REJECTED (CRITICAL SCHEMA FAULT)'}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-m3-surface border border-m3-outline-variant/20 font-bold">
              {report.formatDetected}
            </span>
          </div>
          <p className="text-[11px] font-medium leading-relaxed opacity-90">
            {report.status === 'PASS'
              ? 'All JSON records and referenced branch IDs are 100% compatible with local system schemas. Safe to commit.'
              : report.status === 'WARNING'
              ? 'JSON schema is valid, but unregistered branch locations or missing fields were detected. Review mapping before commit.'
              : 'The JSON structure contains fatal validation faults or cryptographic signature errors. Local DB commit is blocked.'}
          </p>
        </div>
      </div>

      {/* 2. Key Inspection Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
        <ExpressiveTooltip title="Payload Cryptography" content="Verifies SHA-256 digital signature authenticity and detects payload tampering prior to database restore.">
          <div className="p-3 bg-m3-surface-low border border-m3-outline-variant/20 rounded-xl space-y-1 w-full">
            <span className="text-[9px] uppercase font-bold text-m3-on-surface-variant block">Format & Seal</span>
            <div className="font-extrabold text-m3-on-surface truncate text-[11px]">
              {report.isSealedBackup ? (
                <span className={report.isSignatureValid ? 'text-emerald-500' : 'text-rose-500'}>
                  {report.isSignatureValid ? 'SHA-256 Sealed ✓' : 'Seal Tampered ✗'}
                </span>
              ) : (
                'Standard Data Block'
              )}
            </div>
          </div>
        </ExpressiveTooltip>

        <ExpressiveTooltip title="Schema Conformity" content="Counts valid array items conforming to TilePoint product schema against total input payload records.">
          <div className="p-3 bg-m3-surface-low border border-m3-outline-variant/20 rounded-xl space-y-1 w-full">
            <span className="text-[9px] uppercase font-bold text-m3-on-surface-variant block">Record Integrity</span>
            <div className="font-extrabold text-m3-on-surface text-[11px]">
              <span className="text-emerald-500">{report.validRecordsCount} Valid</span> / {report.totalRecordsCount} Total
            </div>
          </div>
        </ExpressiveTooltip>

        <ExpressiveTooltip title="Location Compatibility" content="Detects branch IDs referenced in JSON data and matches them against active system branch registries.">
          <div className="p-3 bg-m3-surface-low border border-m3-outline-variant/20 rounded-xl space-y-1 w-full">
            <span className="text-[9px] uppercase font-bold text-m3-on-surface-variant block">Detected Branches</span>
            <div className="font-extrabold text-m3-on-surface text-[11px]">
              {report.detectedBranches.length} Referenced
              {report.dataImpact.unmappedBranchCount > 0 && (
                <span className="text-amber-500 font-bold ml-1">({report.dataImpact.unmappedBranchCount} Unmapped)</span>
              )}
            </div>
          </div>
        </ExpressiveTooltip>

        <ExpressiveTooltip title="Database State Impact" content="Calculates how many new products will be created vs how many existing product records will be updated upon commit.">
          <div className="p-3 bg-m3-surface-low border border-m3-outline-variant/20 rounded-xl space-y-1 w-full">
            <span className="text-[9px] uppercase font-bold text-m3-on-surface-variant block">Data Impact</span>
            <div className="font-extrabold text-m3-primary truncate text-[11px]">
              +{report.dataImpact.newProductsCount} New / {report.dataImpact.existingProductsToUpdateCount} Updates
            </div>
          </div>
        </ExpressiveTooltip>
      </div>

      {/* 3. Branch Compatibility Ledger */}
      {report.detectedBranches.length > 0 && (
        <div className="p-3.5 bg-m3-surface border border-m3-outline-variant/20 rounded-2xl space-y-2">
          <label className="text-[10px] font-black uppercase text-m3-primary tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Branch Location Compatibility Ledger</span>
            <span className="text-[9px] font-mono font-bold text-m3-on-surface-variant">
              {report.detectedBranches.filter(b => b.isCompatible).length} / {report.detectedBranches.length} Matched
            </span>
          </label>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 font-mono text-[11px]">
            {report.detectedBranches.map((b, idx) => (
              <div
                key={idx}
                className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${
                  b.isCompatible
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-m3-on-surface'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {b.isCompatible ? (
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  )}
                  <span className="font-bold truncate">{b.branchIdOrName}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  b.isCompatible
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                }`}>
                  {b.statusText}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Diagnostic Issues / Warnings List */}
      {(report.validationIssues.length > 0 || report.validationWarnings.length > 0) && (
        <div className="space-y-2 font-mono text-[11px]">
          {report.validationIssues.length > 0 && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-700 dark:text-rose-300 space-y-1">
              <span className="font-extrabold uppercase text-[9.5px] block">Critical Pre-Flight Diagnostics:</span>
              <ul className="list-disc list-inside space-y-0.5">
                {report.validationIssues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {report.validationWarnings.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-300 space-y-1">
              <span className="font-extrabold uppercase text-[9.5px] block">Compatibility Warnings:</span>
              <ul className="list-disc list-inside space-y-0.5">
                {report.validationWarnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 5. Pre-flight Action Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 border-t border-m3-outline-variant/15">
        <button
          type="button"
          onClick={onRunInspection}
          className="w-full sm:w-auto px-4 py-2 bg-m3-surface-low hover:bg-m3-surface-high border border-m3-outline-variant/30 text-m3-on-surface text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Re-Run Pre-Flight Inspection</span>
        </button>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-black uppercase tracking-wider text-m3-on-surface-variant hover:bg-m3-outline-variant/15 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            disabled={report.status === 'FAIL' || !allowedToImport}
            onClick={onConfirmCommit}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
              report.status === 'FAIL' || !allowedToImport
                ? 'bg-zinc-400 dark:bg-zinc-700 text-zinc-200 cursor-not-allowed opacity-60'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <Check className="h-4 w-4" />
            <span>
              {!allowedToImport
                ? 'Admin Permission Required'
                : report.status === 'FAIL'
                ? 'Commit Disabled (Fix Diagnostics)'
                : 'Commit Payload to Local Database'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
