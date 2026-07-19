import os

file_path = 'src/components/SalesTransmissionModule.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

print("Original content length:", len(content))

# Let's target the exact text of showShareModal block
target_block = """  {/* POPUP: SALES REPORT SHARE DIALOGUE */}
  <AnimatePresence>
  {showShareModal && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-45 flex items-center justify-center p-4">
  <motion.div
  initial={{ scale: 0.95, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  exit={{ scale: 0.95, opacity: 0 }}
  className="bg-m3-surface-low border border-m3-outline-variant/30 rounded-[28px] max-w-lg w-full text-left overflow-hidden shadow-2xl relative z-50 font-sans"
  >
  <div className="px-6 py-4.5 bg-gradient-to-r from-emerald-950 to-zinc-900 border-b border-m3-outline-variant/20 flex items-center justify-between">
  <div>
  <h3 className="text-sm font-black text-white uppercase tracking-wider">
  Share Offline Sales package
  </h3>
  <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-widest block mt-0.5">
  Export Ready & Securely Encrypted
  </span>
  </div>
  <button
  onClick={() => setShowShareModal(false)}
  className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 cursor-pointer"
  >
  <XIcon className="h-5 w-5" />
  </button>
  </div>

  <div className="p-6 space-y-5">
  <div className="p-4 rounded-2xl bg-[#16171d] border border-m3-outline-variant/20 space-y-2">
  <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-wider">
  <CheckCircle2 className="h-4.5 w-4.5" />
  <span>Report Generation Successful</span>
  </div>
  <p className="text-xs text-m3-on-surface-variant leading-relaxed">
  The sales report file <strong className="text-white font-mono break-all">{shareFileName}</strong> has been downloaded to your device drive. 
  </p>
  </div>

  <div className="space-y-3">
  <span className="text-[9px] font-black uppercase tracking-widest text-m3-on-surface-variant font-mono block">
  Choose Sharing Method:
  </span>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
  {/* Copy JSON content (highly robust) */}
  <button
  onClick={() => handleCopyText(sharePayloadText, 'Encrypted sales report copied to clipboard!')}
  className="p-4 bg-[#1e293b]/50 hover:bg-[#1e293b]/80 border border-slate-700/50 hover:border-slate-500 text-slate-200 rounded-2xl text-left transition-all group flex flex-col justify-between h-24 cursor-pointer"
  >
  <div className="flex items-center justify-between w-full">
  <span className="text-[10px] font-black uppercase tracking-wider font-mono text-slate-400">Clipboard</span>
  <Copy className="h-4 w-4 text-slate-400 group-hover:scale-110 transition-transform" />
  </div>
  <div>
  <div className="text-xs font-bold text-white mb-0.5">Copy JSON String</div>
  <p className="text-[10px] text-zinc-400">Copies code to paste anywhere</p>
  </div>
  </button>

  {/* Manual re-download */}
  <button
  onClick={handleManualDownload}
  className="p-4 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 rounded-2xl text-left transition-all group flex flex-col justify-between h-24 cursor-pointer"
  >
  <div className="flex items-center justify-between w-full">
  <span className="text-[10px] font-black uppercase tracking-wider font-mono">Local File</span>
  <Download className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
  </div>
  <div>
  <div className="text-xs font-bold text-white mb-0.5">Download JSON File</div>
  <p className="text-[10px] text-zinc-400">Re-saves JSON packet file directly</p>
  </div>
  </button>

  {/* Share on facebook messenger */}
  <button
  onClick={() => {
  handleCopyText(sharePayloadText, 'JSON report copied! Opening Messenger...');
  setTimeout(() => {
  try {
  window.open('https://www.messenger.com', '_blank', 'noopener,noreferrer');
  } catch (err) {
  console.warn('Blocked popup:', err);
  }
  }, 500);
  }}
  className="p-4 bg-m3-primary/10 hover:bg-m3-primary/20 border border-m3-primary/20 hover:border-m3-primary/40 text-m3-primary rounded-2xl text-left transition-all group flex flex-col justify-between h-24 cursor-pointer"
  >
  <div className="flex items-center justify-between w-full">
  <span className="text-[10px] font-black uppercase tracking-wider font-mono">Messenger</span>
  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
  </div>
  <div>
  <div className="text-xs font-bold text-white mb-0.5">Share via Messenger</div>
  <p className="text-[10px] text-zinc-400">Copies code & loads messenger chat</p>
  </div>
  </button>

  {/* Email sales report package */}
  <button
  onClick={() => {
  handleCopyText(sharePayloadText, 'JSON report copied! Launching email...');
  setTimeout(() => {
  try {
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(`TilePoint Sales Report - ${currentBranchMeta.name} (${reportingDate})`)}&body=${encodeURIComponent(`Dear Admin,\n\nAttached is the encrypted JSON sales report for ${currentBranchMeta.name} compiled on ${reportingDate}.\n\nPlease find the encrypted data string below. Copy and paste this directly into the HQ import portal to reconcile:\n\n${sharePayloadText}\n\nKind regards,\nTilePoint Offline ERP OS System`)};`;
  window.location.href = mailtoUrl;
  } catch (err) {
  console.warn('Mailto redirect failed:', err);
  }
  }, 500);
  }}
  className="p-4 bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-400 rounded-2xl text-left transition-all group flex flex-col justify-between h-24 cursor-pointer"
  >
  <div className="flex items-center justify-between w-full">
  <span className="text-[10px] font-black uppercase tracking-wider font-mono">Email client</span>
  <Mail className="h-4 w-4 text-amber-400 group-hover:scale-110 transition-transform" />
  </div>
  <div>
  <div className="text-xs font-bold text-white mb-0.5">Email Sales Packet</div>
  <p className="text-[10px] text-zinc-400">Launches default system mail app</p>
  </div>
  </button>
  </div>
  </div>

  <div className="space-y-1.5 bg-[#0d0e12] border border-m3-outline-variant/30 rounded-xl p-3">
  <div className="flex items-center justify-between">
  <span className="text-[9px] font-black uppercase tracking-widest text-m3-on-surface-variant font-mono">
  Secure Decryption Signature Content:
  </span>
  <button
  onClick={() => handleCopyText(sharePayloadText, 'Full report JSON copied to clipboard!')}
  className="text-[9px] font-bold text-m3-primary hover:underline flex items-center gap-1 cursor-pointer"
  >
  <Copy className="h-3 w-3" />
  Copy Raw JSON
  </button>
  </div>
  <pre className="text-[9px] font-mono text-zinc-500 select-all overflow-x-auto whitespace-pre scrollbar-thin max-h-20 max-w-full opacity-70">
  {sharePayloadText}
  </pre>
  </div>
  </div>

  <div className="px-6 py-4 bg-m3-surface border-t border-m3-outline-variant/15 flex justify-end">
  <button
  onClick={() => setShowShareModal(false)}
  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer active:scale-97"
  >
  Done & Close
  </button>
  </div>
  </motion.div>
  </div>
  )}
  </AnimatePresence>"""

replacement_block = """  {/* POPUP: SALES REPORT SHARE DIALOGUE */}
  <AnimatePresence>
  {showShareModal && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-45 flex items-center justify-center p-4">
  <motion.div
  initial={{ scale: 0.95, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  exit={{ scale: 0.95, opacity: 0 }}
  className="bg-m3-surface-low border border-m3-outline-variant/30 rounded-[28px] max-w-lg w-full text-left overflow-hidden shadow-2xl relative z-50 font-sans"
  >
  <div className="px-6 py-4.5 bg-m3-surface-lowest border-b border-m3-outline-variant/15 flex items-center justify-between">
  <div>
  <h3 className="text-sm font-black text-m3-on-surface uppercase tracking-wider">
  Share Offline Sales package
  </h3>
  <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest block mt-0.5">
  Export Ready & Certified
  </span>
  </div>
  <button
  onClick={() => setShowShareModal(false)}
  className="p-1.5 text-m3-on-surface-variant hover:text-m3-on-surface rounded-xl hover:bg-m3-outline-variant/15 cursor-pointer"
  >
  <XIcon className="h-5 w-5" />
  </button>
  </div>

  <div className="p-6 space-y-5">
  <div className="p-4 rounded-2xl bg-m3-surface-lowest border border-m3-outline-variant/15 space-y-2">
  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-wider">
  <CheckCircle2 className="h-4.5 w-4.5" />
  <span>Report Generation Successful</span>
  </div>
  <p className="text-xs text-m3-on-surface-variant leading-relaxed">
  The sales report file <strong className="text-m3-on-surface font-semibold font-mono break-all">{shareFileName}</strong> has been downloaded to your device drive. 
  </p>
  </div>

  <div className="space-y-3">
  <span className="text-[9px] font-black uppercase tracking-widest text-m3-on-surface-variant font-mono block">
  Choose Sharing Method:
  </span>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
  {/* Copy JSON content (highly robust) */}
  <button
  onClick={() => handleCopyText(sharePayloadText, 'Sales report copied to clipboard!')}
  className="p-4 bg-m3-surface-lowest hover:bg-m3-surface-high border border-m3-outline-variant/20 hover:border-m3-outline-variant/40 text-m3-on-surface rounded-2xl text-left transition-all group flex flex-col justify-between h-24 cursor-pointer"
  >
  <div className="flex items-center justify-between w-full">
  <span className="text-[10px] font-black uppercase tracking-wider font-mono text-m3-on-surface-variant">Clipboard</span>
  <Copy className="h-4 w-4 text-m3-on-surface-variant group-hover:scale-110 transition-transform" />
  </div>
  <div>
  <div className="text-xs font-bold text-m3-on-surface mb-0.5">Copy JSON String</div>
  <p className="text-[10px] text-m3-on-surface-variant">Copies code to paste anywhere</p>
  </div>
  </button>

  {/* Manual re-download */}
  <button
  onClick={handleManualDownload}
  className="p-4 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 rounded-2xl text-left transition-all group flex flex-col justify-between h-24 cursor-pointer"
  >
  <div className="flex items-center justify-between w-full">
  <span className="text-[10px] font-black uppercase tracking-wider font-mono">Local File</span>
  <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
  </div>
  <div>
  <div className="text-xs font-bold text-m3-on-surface mb-0.5">Download JSON File</div>
  <p className="text-[10px] text-m3-on-surface-variant">Re-saves JSON packet file directly</p>
  </div>
  </button>

  {/* Share on facebook messenger */}
  <button
  onClick={() => {
  handleCopyText(sharePayloadText, 'Report copied! Opening Messenger...');
  setTimeout(() => {
  try {
  window.open('https://www.messenger.com', '_blank', 'noopener,noreferrer');
  } catch (err) {
  console.warn('Blocked popup:', err);
  }
  }, 500);
  }}
  className="p-4 bg-m3-primary/10 hover:bg-m3-primary/20 border border-m3-primary/20 hover:border-m3-primary/40 text-m3-primary rounded-2xl text-left transition-all group flex flex-col justify-between h-24 cursor-pointer"
  >
  <div className="flex items-center justify-between w-full">
  <span className="text-[10px] font-black uppercase tracking-wider font-mono">Messenger</span>
  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
  </div>
  <div>
  <div className="text-xs font-bold text-m3-on-surface mb-0.5">Share via Messenger</div>
  <p className="text-[10px] text-m3-on-surface-variant">Copies code & loads messenger chat</p>
  </div>
  </button>

  {/* Email sales report package */}
  <button
  onClick={() => {
  handleCopyText(sharePayloadText, 'Report copied! Launching email...');
  setTimeout(() => {
  try {
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(`TilePoint Sales Report - ${currentBranchMeta.name} (${reportingDate})`)}&body=${encodeURIComponent(`Dear Admin,\\n\\nAttached is the JSON sales report for ${currentBranchMeta.name} compiled on ${reportingDate}.\\n\\nPlease find the report data below. Copy and paste this directly into the HQ import portal to reconcile:\\n\\n${sharePayloadText}\\n\\nKind regards,\\nTilePoint Offline ERP OS System`)};`;
  window.location.href = mailtoUrl;
  } catch (err) {
  console.warn('Mailto redirect failed:', err);
  }
  }, 500);
  }}
  className="p-4 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 hover:border-amber-500/40 text-amber-600 dark:text-amber-400 rounded-2xl text-left transition-all group flex flex-col justify-between h-24 cursor-pointer"
  >
  <div className="flex items-center justify-between w-full">
  <span className="text-[10px] font-black uppercase tracking-wider font-mono">Email client</span>
  <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
  </div>
  <div>
  <div className="text-xs font-bold text-m3-on-surface mb-0.5">Email Sales Packet</div>
  <p className="text-[10px] text-m3-on-surface-variant">Launches default system mail app</p>
  </div>
  </button>
  </div>
  </div>

  <div className="space-y-1.5 bg-m3-surface-lowest border border-m3-outline-variant/15 rounded-xl p-3">
  <div className="flex items-center justify-between">
  <span className="text-[9px] font-black uppercase tracking-widest text-m3-on-surface-variant font-mono">
  Report Payload Content:
  </span>
  <button
  onClick={() => handleCopyText(sharePayloadText, 'Full report JSON copied to clipboard!')}
  className="text-[9px] font-bold text-m3-primary hover:underline flex items-center gap-1 cursor-pointer"
  >
  <Copy className="h-3 w-3" />
  Copy Raw JSON
  </button>
  </div>
  <pre className="text-[9px] font-mono text-m3-on-surface-variant select-all overflow-x-auto whitespace-pre scrollbar-thin max-h-20 max-w-full opacity-80">
  {sharePayloadText}
  </pre>
  </div>
  </div>

  <div className="px-6 py-4 bg-m3-surface border-t border-m3-outline-variant/15 flex justify-end">
  <button
  onClick={() => setShowShareModal(false)}
  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer active:scale-97"
  >
  Done & Close
  </button>
  </div>
  </motion.div>
  </div>
  )}
  </AnimatePresence>"""

# Try both LF and CRLF matching
if target_block in content:
    content = content.replace(target_block, replacement_block)
    print("Replaced with exact LF pattern!")
else:
    target_block_rn = target_block.replace('\\n', '\\r\\n').replace('\\r\\r', '\\r')
    replacement_block_rn = replacement_block.replace('\\n', '\\r\\n').replace('\\r\\r', '\\r')
    if target_block_rn in content:
        content = content.replace(target_block_rn, replacement_block_rn)
        print("Replaced with CRLF pattern!")
    else:
        # Fallback to lines split
        content_lines = content.splitlines()
        target_lines = target_block.splitlines()
        
        # Let's find index
        found = False
        for i in range(len(content_lines) - len(target_lines) + 1):
            match = True
            for j in range(len(target_lines)):
                if content_lines[i+j].strip() != target_lines[j].strip():
                    match = False
                    break
            if match:
                print(f"Matched lines start at index {i}")
                # We can replace them
                # But let's preserve the original indentation of the start
                indent = content_lines[i][:len(content_lines[i]) - len(content_lines[i].lstrip())]
                new_lines = [indent + l.lstrip() for l in replacement_block.splitlines()]
                content_lines[i:i+len(target_lines)] = new_lines
                content = '\\n'.join(content_lines)
                found = True
                print("Replaced successfully via line matching!")
                break
        if not found:
            print("Failed to replace blocks.")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
